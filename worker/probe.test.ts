/**
 * The SSRF guard and the evidence rung, both of which are pure.
 *
 * `isSafeUrl` is synchronous by contract and reads a resolver answer that `checkUrl` primes,
 * so a name is never resolved here. That is deliberate: these tests make no network call, so
 * a hostname arrives with no answer in hand and the guard fails closed, which is itself the
 * behaviour worth pinning. The address classes are reached through literal-address URLs.
 *
 * MUSTER_DB is pointed at a temp path before the import because worker/probe.ts pulls in
 * lib/db.ts. Nothing here calls db(), so no file is created. The temp path also means a stray
 * open could not touch the real store either.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

const TEMP_DB = join(tmpdir(), `muster-probe-test-${process.pid}.db`)
process.env['MUSTER_DB'] = TEMP_DB

const { isSafeUrl, observedRung, PROBE_ASSERTION, parsePaymentRequirements } = await import('./probe.ts')

function reason(url: string): string {
  const v = isSafeUrl(url)
  assert.equal(v.ok, false, `${url} was allowed`)
  assert.ok(v.reason)
  return v.reason
}

test('a literal address is refused whatever range it is in', () => {
  // The guard refuses bare addresses outright, before the range checks, because a literal
  // address skips DNS and so skips every name-based control an operator has.
  const bare = 'bare IP address with no hostname'
  assert.equal(reason('http://127.0.0.1/'), bare)
  assert.equal(reason('http://10.0.0.1/'), bare)
  assert.equal(reason('http://169.254.169.254/'), bare)
  assert.equal(reason('http://192.168.1.1/'), bare)
  assert.equal(reason('http://172.16.0.1/'), bare)
  assert.equal(reason('http://[::1]/'), bare)
  assert.equal(reason('http://224.0.0.1/'), bare)
  assert.equal(reason('http://[ff02::1]/'), bare)
  // NAT64, which routes to an internal IPv4 address wherever a translator answers.
  assert.equal(reason('http://[64:ff9b::7f00:1]/'), bare)
  assert.equal(reason('http://[fe80::1]/'), bare)
  assert.equal(reason('https://[2001:4860:4860::8888]/'), bare)
})

test('a hostname with no resolver answer in hand is refused, not assumed public', () => {
  const closed = 'hostname not resolved in this process, so the address check could not run'
  assert.equal(reason('http://localhost/'), closed)
  // example.com clears every shape check, so the only thing left to refuse it is the missing
  // DNS answer. That is what makes this the fail-closed case rather than a malformed URL.
  assert.equal(reason('https://example.com/'), closed)
  assert.equal(reason('https://example.com:443/a2a'), closed)
  assert.equal(reason('http://example.com:80/'), closed)
})

test('a non-http scheme is refused by name', () => {
  assert.equal(reason('ftp://example.com/'), 'scheme "ftp:" is not http or https')
  assert.equal(reason('file:///etc/passwd'), 'scheme "file:" is not http or https')
  assert.equal(reason('gopher://example.com/'), 'scheme "gopher:" is not http or https')
})

test('credentials in the URL are refused', () => {
  assert.equal(reason('https://user:pass@example.com/'), 'credentials in the URL')
  assert.equal(reason('https://user@example.com/'), 'credentials in the URL')
})

test('only ports 80 and 443 are allowed', () => {
  assert.equal(reason('https://example.com:8080/'), 'port 8080 is not 80 or 443')
  assert.equal(reason('http://example.com:22/'), 'port 22 is not 80 or 443')
  assert.equal(reason('http://example.com:6379/'), 'port 6379 is not 80 or 443')
})

test('an unsubstituted template placeholder is refused', () => {
  assert.equal(
    reason('https://example.com/agents/{agentId}/card'),
    'unsubstituted template placeholder in the URL',
  )
})

test('an empty or unparseable URL is refused', () => {
  assert.equal(reason(''), 'empty URL')
  assert.equal(reason('   '), 'empty URL')
  assert.equal(reason('not a url'), 'not a URL')
  assert.equal(reason('https://'), 'not a URL')
})

test('a URL over the 512 character ceiling is refused', () => {
  const long = `https://example.com/${'a'.repeat(500)}`
  assert.equal(long.length, 520)
  assert.equal(reason(long), 'URL is longer than 512 characters')
})

test('observedRung awards no rung without a verified certificate', () => {
  const base = {
    url: 'https://example.com/',
    assertion: PROBE_ASSERTION,
    verdict: 'pass' as const,
    failureClass: null,
    httpStatus: 200,
    sawPaymentRequired: true,
    tlsOk: false,
    latencyMs: 12,
    note: null,
    body: '',
  }
  // Plain http reaching a 402 still earns nothing: `reachable` is defined as TLS completing.
  assert.equal(observedRung(base), null)
  assert.equal(observedRung({ ...base, tlsOk: true }), 'payable')
  assert.equal(observedRung({ ...base, tlsOk: true, sawPaymentRequired: false }), 'probed')
  assert.equal(
    observedRung({ ...base, tlsOk: true, sawPaymentRequired: false, verdict: 'fail' }),
    'reachable',
  )
  assert.equal(
    observedRung({ ...base, tlsOk: true, sawPaymentRequired: false, verdict: 'fail', httpStatus: null }),
    null,
  )
})

test('the assertion id is the G3 gate and no store file was opened', () => {
  assert.equal(PROBE_ASSERTION, 'G3-endpoint-hygiene')
  assert.equal(existsSync(TEMP_DB), false)
})

// [doc 04] The 402 challenge is read from both channels, and which a third party served is recorded.
function challenge(amount: string, network = 'eip155:56'): string {
  return JSON.stringify({
    x402Version: 2,
    accepts: [{ scheme: 'eip3009', network, amount, payTo: '0xabc0000000000000000000000000000000000000', extra: { decimals: 18 } }],
  })
}
const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64')

test('a 402 in the header alone is read, source header, body not served', () => {
  const info = parsePaymentRequirements({ 'payment-required': b64(challenge('100')) }, '')
  assert.ok(info)
  assert.equal(info!.source, 'header')
  assert.equal(info!.servedHeader, true)
  assert.equal(info!.servedBody, false)
  assert.equal(info!.channelsAgree, null)
  assert.equal(info!.bsc, true)
})

test('a 402 in the body alone is read, source body', () => {
  const info = parsePaymentRequirements({}, challenge('100'))
  assert.ok(info)
  assert.equal(info!.source, 'body')
  assert.equal(info!.servedBody, true)
  assert.equal(info!.servedHeader, false)
  assert.equal(info!.channelsAgree, null)
})

test('both channels present and equal are recorded as agreeing, header authoritative', () => {
  const info = parsePaymentRequirements({ 'payment-required': b64(challenge('100')) }, challenge('100'))
  assert.ok(info)
  assert.equal(info!.source, 'header')
  assert.equal(info!.servedHeader, true)
  assert.equal(info!.servedBody, true)
  assert.equal(info!.channelsAgree, true)
})

test('both channels present but different are recorded as disagreeing', () => {
  const info = parsePaymentRequirements({ 'payment-required': b64(challenge('100')) }, challenge('200'))
  assert.ok(info)
  assert.equal(info!.channelsAgree, false)
})

test('a network that is not BSC is read and marked not BSC', () => {
  const info = parsePaymentRequirements({}, challenge('100', 'base'))
  assert.ok(info)
  assert.equal(info!.bsc, false)
})

test('no challenge in either channel returns null', () => {
  assert.equal(parsePaymentRequirements({}, ''), null)
  assert.equal(parsePaymentRequirements({ 'payment-required': 'not base64 json!!' }, 'plain text'), null)
})
