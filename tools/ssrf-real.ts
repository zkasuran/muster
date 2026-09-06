import { checkUrl } from '../worker/probe.ts'
// checkUrl is the async form the prober actually calls, and it primes DNS before the address
// checks. isSafeUrl alone is the sync read of that primed answer, so testing it without
// priming fails closed on every hostname, which is correct but proves nothing.
const cases: [string, string][] = [
  ['file:///etc/passwd', 'scheme'],
  ['ftp://example.com/x', 'scheme'],
  ['http://localhost/x', 'hostname resolving to loopback'],
  ['http://localtest.me/x', 'hostname resolving to loopback, the real attack shape'],
  ['http://127.0.0.1.nip.io/x', 'hostname resolving to loopback via a wildcard DNS service'],
  ['http://10.0.0.1.nip.io/x', 'hostname resolving to a private range'],
  ['http://169.254.169.254.nip.io/latest/meta-data/', 'hostname resolving to cloud metadata'],
  ['http://127.0.0.1/x', 'bare ip'],
  ['http://[::1]/x', 'bare ipv6 loopback'],
  ['http://192.168.1.1/x', 'bare private ip'],
  ['http://169.254.169.254/latest/meta-data/', 'bare metadata ip'],
  ['http://100.64.0.1/x', 'cgnat'],
  ['http://224.0.0.1/x', 'multicast'],
  ['http://[fc00::1]/x', 'unique local'],
  ['http://[::ffff:127.0.0.1]/x', 'ipv4 mapped ipv6'],
  ['http://[64:ff9b::7f00:1]/x', 'nat64'],
  ['http://user:pass@example.com/x', 'credentials in url'],
  ['http://example.com:22/x', 'non web port'],
  ['http://this-does-not-exist-muster.invalid/x', 'dns failure'],
]
let refused = 0
for (const [url, why] of cases) {
  const v = await checkUrl(url)
  if (!v.ok) refused++
  console.log(`  ${v.ok ? '!! ALLOWED' : 'refused   '} ${url.padEnd(48).slice(0, 48)} ${(v.reason ?? '').slice(0, 52).padEnd(52)} (${why})`)
}
console.log(`\n  refused ${refused} of ${cases.length}`)
console.log('  and the real endpoints must still be allowed:')
let allowed = 0
for (const good of ['https://api.xona-agent.com/binance/token/signal', 'https://muster.zkasuran.dev/', 'https://pro-api.coinmarketcap.com/x402/v1/dex/search']) {
  const v = await checkUrl(good)
  if (v.ok) allowed++
  console.log(`  ${v.ok ? 'allowed   ' : '!! REFUSED'} ${good.padEnd(52)} ${v.reason ?? ''}`)
}
console.log(`\n  ${refused === cases.length && allowed === 3 ? 'GUARD PASSES' : 'GUARD FAILED'}`)
