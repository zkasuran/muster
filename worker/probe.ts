/**
 * The liveness prober. It is the only thing that moves a listing off the rung its operator
 * declared. It is also the one component that fetches a URL somebody else chose, so the guard in
 * front of the request is the most important code in this file.
 *
 * Why the guard is written out rather than delegated to one library predicate. Our earlier guard
 * accepted any address Python's `ipaddress.is_global` liked. Re-measured on this machine's
 * python 3.11.5 before writing this: `224.0.0.1`, `239.255.255.250`, `ff02::1`, `ff00::1` and
 * `64:ff9b::7f00:1` all report `is_global=True`. So that predicate passes multicast and passes
 * NAT64, which is a route to an internal IPv4 address wherever a NAT64 translator answers. Every
 * class below is therefore checked by name.
 *
 * Two rules the guard follows because one check is never enough. A hostname is resolved here and
 * EVERY answer is inspected, because `arcabot.ai` answers with four addresses and one of them
 * being public says nothing about the other three. And the address that passed the check is the
 * address the socket connects to, pinned through the connection's own `lookup`, so a second
 * resolution cannot swap a public answer for a private one in between.
 *
 * The rung a probe can award is bounded by what it saw. Any answer over TLS is `reachable` and an
 * answer that matches the declaration is `probed`. Only a 402 carrying payment requirements a buyer
 * could satisfy is `payable`. Nothing here writes `settled`, which needs a cleared payment.
 */
import { randomUUID } from 'node:crypto'
import { isIP, type LookupFunction } from 'node:net'
import { lookup as dnsLookup } from 'node:dns/promises'
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http'
import { request as httpsRequest } from 'node:https'
import type { TLSSocket } from 'node:tls'
import { db, tx } from '../lib/db.ts'
import { CHAIN_ID } from '../lib/registry.ts'
import { EVIDENCE_ORDER, type EvidenceRung, type LifecycleState } from '../lib/types.ts'

/** The gate this probe implements, `05-ONBOARDING.md` G3. One row carries one assertion. */
export const PROBE_ASSERTION = 'G3-endpoint-hygiene'
const PROBER = 'muster-prober/0.1'
const USER_AGENT = 'muster-probe/0.1 (+https://muster.zkasuran.dev)'

/** Short on purpose. A slow host must not hold a cycle open behind it. */
const TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT_MS ?? 8_000)
/** A few kilobytes. Enough to read a 402 challenge whole and to see what a 200 really serves. */
const MAX_BODY_BYTES = 8_192
const MAX_REDIRECTS = 2
/** Long enough for the pin to match the check, short enough that a moved host is re-read. */
const DNS_TTL_MS = 30_000
const ALLOWED_PORTS = new Set([80, 443])

export interface UrlVerdict {
  ok: boolean
  reason: string | null
}

const no = (reason: string): UrlVerdict => ({ ok: false, reason })

function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
}

/**
 * The reason an address is off limits. Null when it is public unicast. Ordered so a refusal names
 * the rule it broke: the specific classes come first and the catch-all last.
 */
function addressClass(addr: string): string | null {
  const version = isIP(addr)
  if (version === 4) return ipv4Class(addr)
  if (version === 6) return ipv6Class(ipv6Bytes(addr))
  return 'not an IP address'
}

function ipv4Class(addr: string): string | null {
  const parts = addr.split('.').map(Number)
  const b0 = parts[0] ?? 0
  const b1 = parts[1] ?? 0
  if (addr === '255.255.255.255') return 'the broadcast address 255.255.255.255'
  if (b0 === 0) return 'unspecified 0.0.0.0/8'
  if (b0 === 10) return 'private range 10.0.0.0/8'
  if (b0 === 127) return 'IPv4 loopback 127.0.0.0/8'
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return 'CGNAT 100.64.0.0/10'
  // 169.254.169.254 is the cloud metadata address, which is the whole reason this block exists.
  if (b0 === 169 && b1 === 254) return 'link-local 169.254.0.0/16'
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return 'private range 172.16.0.0/12'
  if (b0 === 192 && b1 === 168) return 'private range 192.168.0.0/16'
  if (b0 >= 224 && b0 <= 239) return 'IPv4 multicast 224.0.0.0/4'
  if (b0 >= 240) return 'reserved 240.0.0.0/4'
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return 'reserved benchmark range 198.18.0.0/15'
  const slash24 = `${b0}.${b1}.${parts[2] ?? 0}.`
  const reserved24 = ['192.0.0.', '192.0.2.', '192.88.99.', '198.51.100.', '203.0.113.']
  if (reserved24.includes(slash24)) return `reserved special-purpose range ${slash24}0/24`
  return null
}

/** Sixteen bytes with `::` expanded and a trailing dotted-quad accepted. Null when it will not parse. */
function ipv6Bytes(addr: string): number[] | null {
  const bare = stripBrackets(addr.split('%')[0] ?? '').toLowerCase()
  const halves = bare.split('::')
  if (halves.length > 2) return null
  const expand = (part: string): number[] | null => {
    if (part === '') return []
    const out: number[] = []
    for (const group of part.split(':')) {
      if (group.includes('.')) {
        const quad = group.split('.').map(Number)
        if (quad.length !== 4 || quad.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
        out.push(quad[0] ?? 0, quad[1] ?? 0, quad[2] ?? 0, quad[3] ?? 0)
        continue
      }
      const n = Number.parseInt(group, 16)
      if (!Number.isInteger(n) || n < 0 || n > 0xffff) return null
      out.push(n >> 8, n & 0xff)
    }
    return out
  }
  const head = expand(halves[0] ?? '')
  const tail = halves.length === 2 ? expand(halves[1] ?? '') : []
  if (head === null || tail === null) return null
  const gap = 16 - head.length - tail.length
  if (gap < 0 || (halves.length === 1 && gap !== 0)) return null
  return [...head, ...new Array<number>(gap).fill(0), ...tail]
}

function ipv6Class(bytes: number[] | null): string | null {
  if (bytes === null) return 'an unparseable IPv6 address'
  const at = (i: number): number => bytes[i] ?? 0
  const zeros = (from: number, to: number): boolean => {
    for (let i = from; i < to; i++) if (at(i) !== 0) return false
    return true
  }
  if (zeros(0, 16)) return 'the unspecified address ::'
  if (zeros(0, 15) && at(15) === 1) return 'IPv6 loopback ::1'
  if (zeros(0, 10) && at(10) === 0xff && at(11) === 0xff) return 'IPv4-mapped IPv6 ::ffff:0:0/96'
  if (zeros(0, 12)) return 'IPv4-compatible IPv6 ::/96'
  // The /32 rather than the /96, so RFC 8215's local-use 64:ff9b:1::/48 is covered too.
  if (at(0) === 0x00 && at(1) === 0x64 && at(2) === 0xff && at(3) === 0x9b) return 'NAT64 64:ff9b::/32'
  if (at(0) === 0xff) return 'IPv6 multicast ff00::/8'
  if (at(0) === 0xfe && (at(1) & 0xc0) === 0x80) return 'IPv6 link-local fe80::/10'
  if ((at(0) & 0xfe) === 0xfc) return 'unique-local fc00::/7'
  // 6to4 and Teredo both carry an IPv4 address inside, so a private one can ride in on them.
  if (at(0) === 0x20 && at(1) === 0x02) return '6to4 2002::/16 wrapping an IPv4 address'
  if (at(0) === 0x20 && at(1) === 0x01 && zeros(2, 4)) return 'Teredo 2001::/32 wrapping an IPv4 address'
  if (at(0) === 0x20 && at(1) === 0x01 && at(2) === 0x0d && at(3) === 0xb8) return 'reserved 2001:db8::/32'
  // Default deny. 2000::/3 is the only range delegated for global unicast, so anything outside it
  // is reserved whether or not this file names it.
  if ((at(0) & 0xe0) !== 0x20) return 'outside global unicast 2000::/3'
  return null
}

interface HostAnswer {
  addresses: { address: string; family: number }[]
  error: string | null
  at: number
}

const hostAnswers = new Map<string, HostAnswer>()

/** Resolve once, keep the answer for the pin, record the failure code rather than throwing. */
async function resolveHost(hostname: string): Promise<HostAnswer> {
  const cached = hostAnswers.get(hostname)
  if (cached && Date.now() - cached.at < DNS_TTL_MS) return cached
  let answer: HostAnswer
  try {
    // `dns.lookup` rather than `dns.resolve` on purpose: it goes through the same resolver the
    // socket would use, so the check cannot disagree with the connect over hosts files or NSS.
    const addresses = await dnsLookup(hostname, { all: true, verbatim: true })
    answer = { addresses, error: null, at: Date.now() }
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    answer = { addresses: [], error: err.code ?? err.message, at: Date.now() }
  }
  hostAnswers.set(hostname, answer)
  return answer
}

/**
 * Refuse anything we are not willing to fetch, with the rule that refused it.
 *
 * This is synchronous by contract because callers on the render path need a verdict without
 * awaiting, so the DNS half reads the answer `checkUrl` and `probeUrl` prime. A host with no
 * answer in hand is refused rather than assumed public: failing closed costs a probe, failing
 * open costs a request into our own network.
 */
export function isSafeUrl(raw: string): UrlVerdict {
  const trimmed = raw.trim()
  if (trimmed === '') return no('empty URL')
  // 512 is the endpoint ceiling in `05-ONBOARDING.md` G3.
  if (trimmed.length > 512) return no('URL is longer than 512 characters')
  // Checked on the raw string because `new URL` percent-encodes braces out of sight. 51 of 600
  // sampled agents declare an endpoint that still contains a literal `{agentId}`.
  if (/[{}]/.test(trimmed)) return no('unsubstituted template placeholder in the URL')
  let u: URL
  try {
    u = new URL(trimmed)
  } catch {
    return no('not a URL')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return no(`scheme "${u.protocol}" is not http or https`)
  }
  if (u.username !== '' || u.password !== '') return no('credentials in the URL')
  const host = u.hostname
  if (host === '') return no('no hostname')
  // A literal address skips DNS, so it also skips every name-based control an operator has. It is
  // refused outright rather than range-checked, which is what makes the range checks below apply
  // only to answers we asked for.
  if (isIP(stripBrackets(host)) !== 0) return no('bare IP address with no hostname')
  const port = u.port === '' ? (u.protocol === 'https:' ? 443 : 80) : Number(u.port)
  if (!ALLOWED_PORTS.has(port)) return no(`port ${port} is not 80 or 443`)
  const answer = hostAnswers.get(host)
  if (!answer || Date.now() - answer.at >= DNS_TTL_MS) {
    return no('hostname not resolved in this process, so the address check could not run')
  }
  if (answer.addresses.length === 0) {
    return no(`hostname resolves to nothing (${answer.error ?? 'empty answer'})`)
  }
  for (const a of answer.addresses) {
    const bad = addressClass(a.address)
    if (bad !== null) return no(`hostname resolves to ${a.address}, which is ${bad}`)
  }
  return { ok: true, reason: null }
}

/** The one-call form. Primes the resolver answer that `isSafeUrl` reads, then returns its verdict. */
export async function checkUrl(raw: string): Promise<UrlVerdict> {
  try {
    const host = new URL(raw.trim()).hostname
    if (host !== '' && isIP(stripBrackets(host)) === 0) await resolveHost(host)
  } catch {
    // A string that will not parse is reported by `isSafeUrl` with its own reason.
  }
  return isSafeUrl(raw)
}

export interface ProbeOutcome {
  url: string
  assertion: string
  verdict: 'pass' | 'fail' | 'skip'
  failureClass: string | null
  httpStatus: number | null
  sawPaymentRequired: boolean
  /** True only when the peer certificate verified. False covers plain http and a TLS refusal alike. */
  tlsOk: boolean
  latencyMs: number | null
  note: string | null
}

interface RawResponse {
  status: number
  headers: IncomingHttpHeaders
  body: string
  /** Bytes seen on the wire, which is not `body.length` once multi-byte characters are decoded. */
  bytes: number
  truncated: boolean
  tlsOk: boolean
  latencyMs: number
  error: { code: string; message: string } | null
}

/**
 * Hand the socket the address we already vetted instead of letting it resolve the name again.
 * Both callback shapes are answered because the connect path asks for one address or for all of
 * them depending on how it was configured. Either way it gets the single pinned answer.
 */
function pinnedLookup(address: string, family: number): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all === true) callback(null, [{ address, family }])
    else callback(null, address, family)
  }
}

/** One GET, one socket, no redirect handling and a hard cap on what is read off the wire. */
function fetchPinned(u: URL, address: string, family: number): Promise<RawResponse> {
  const tls = u.protocol === 'https:'
  const host = stripBrackets(u.hostname)
  const started = Date.now()
  return new Promise<RawResponse>((resolve) => {
    let timedOut = false
    // Declared before `finish` so an early failure cannot hit it in its temporal dead zone.
    let hard: NodeJS.Timeout | undefined
    const finish = (part: Partial<RawResponse>): void => {
      if (hard) clearTimeout(hard)
      resolve({
        status: 0,
        headers: {},
        body: '',
        bytes: 0,
        truncated: false,
        tlsOk: false,
        latencyMs: Date.now() - started,
        error: null,
        ...part,
      })
    }
    let req
    try {
      req = (tls ? httpsRequest : httpRequest)(
        {
          host,
          port: u.port === '' ? (tls ? 443 : 80) : Number(u.port),
          path: `${u.pathname}${u.search}`,
          method: 'GET',
          // `identity` because the byte cap has to bound bytes we can still read as text.
          headers: { accept: 'application/json, text/plain, */*', 'accept-encoding': 'identity', 'user-agent': USER_AGENT },
          lookup: pinnedLookup(address, family),
          family,
          timeout: TIMEOUT_MS,
          agent: false,
          ...(tls ? { servername: host, rejectUnauthorized: true } : {}),
        },
        (res) => {
          const socketTls = tls ? Boolean((res.socket as TLSSocket).authorized) : false
          const chunks: Buffer[] = []
          let read = 0
          let capped = false
          res.on('data', (chunk: Buffer) => {
            const room = MAX_BODY_BYTES - read
            if (room > 0) chunks.push(chunk.subarray(0, Math.min(room, chunk.length)))
            read += chunk.length
            if (read >= MAX_BODY_BYTES) {
              // Cut the read here and say so. Whether the last byte was the document's last byte is
              // not knowable from inside the cap, so this reports truncation rather than guessing.
              capped = true
              res.destroy()
            }
          })
          const done = (): void =>
            finish({
              status: res.statusCode ?? 0,
              headers: res.headers,
              body: Buffer.concat(chunks).toString('utf8'),
              bytes: read,
              truncated: capped,
              tlsOk: socketTls,
            })
          res.on('close', done)
          res.on('error', done)
        },
      )
    } catch (e) {
      finish({ error: { code: 'EREQUEST', message: e instanceof Error ? e.message : String(e) } })
      return
    }
    // The socket timeout covers inactivity. This one bounds the whole request.
    hard = setTimeout(() => {
      timedOut = true
      req.destroy()
    }, TIMEOUT_MS * 2)
    req.on('timeout', () => {
      timedOut = true
      req.destroy()
    })
    req.on('error', (e: NodeJS.ErrnoException) => {
      finish({ error: { code: timedOut ? 'ETIMEDOUT' : (e.code ?? 'EUNKNOWN'), message: e.message } })
    })
    req.end()
  })
}

interface PaymentInfo {
  version: number | null
  accepts: number
  /** Whether one of the offers settles on BSC, which is the only leg this marketplace can quote. */
  bsc: boolean
  source: 'header' | 'body'
}

/**
 * Read an x402 challenge. The `PAYMENT-REQUIRED` header is authoritative and the body is a v1
 * courtesy: the live BSC-accepting resource we measured returns v2 in the header and v1 in the
 * body at the same time, so the header is tried first. `amount` is the v2 key and
 * `maxAmountRequired` the v1 key. An offer needs a payee plus one of the two to be satisfiable.
 */
function parsePaymentRequirements(headers: IncomingHttpHeaders, body: string): PaymentInfo | null {
  const raw = headers['payment-required']
  const candidates: { text: string; source: 'header' | 'body' }[] = []
  if (typeof raw === 'string' && raw !== '') {
    try {
      candidates.push({ text: Buffer.from(raw, 'base64').toString('utf8'), source: 'header' })
    } catch {
      // A header that is not base64 falls through to the body.
    }
  }
  if (body !== '') candidates.push({ text: body, source: 'body' })
  for (const c of candidates) {
    let obj: Record<string, unknown>
    try {
      obj = JSON.parse(c.text) as Record<string, unknown>
    } catch {
      continue
    }
    const accepts = Array.isArray(obj['accepts']) ? (obj['accepts'] as Record<string, unknown>[]) : []
    const usable = accepts.filter(
      (a) =>
        a !== null &&
        typeof a === 'object' &&
        typeof a['payTo'] === 'string' &&
        (typeof a['amount'] === 'string' || typeof a['maxAmountRequired'] === 'string'),
    )
    if (usable.length === 0) continue
    const version = typeof obj['x402Version'] === 'number' ? obj['x402Version'] : null
    return {
      version,
      accepts: usable.length,
      // v1 names the network (`base`, `bsc`) and v2 uses CAIP-2, so both spellings are read.
      bsc: usable.some((a) => {
        const network = typeof a['network'] === 'string' ? a['network'].toLowerCase() : ''
        return network === 'eip155:56' || network === 'bsc' || network === 'bnb'
      }),
      source: c.source,
    }
  }
  return null
}

const TLS_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'EPROTO',
])

/**
 * A transport error to one of the six failure classes. They are never merged into "offline",
 * because each one needs a different fix from a different person: a certificate bound to the wrong
 * name is the operator's DNS or CDN, a refused connection is their server, a timeout is either.
 */
function errorClass(code: string): string {
  if (TLS_CODES.has(code) || code.startsWith('ERR_TLS_') || code.startsWith('ERR_SSL_')) return 'tls'
  if (code === 'ENOTFOUND') return 'dns'
  if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') return 'timeout'
  return 'http'
}

/** A path that names a JSON document. A page served here is a defect rather than a service. */
function expectsDocument(u: URL): boolean {
  return u.pathname.toLowerCase().endsWith('.json')
}

/**
 * Whether the response really carries a JSON document. The content type is the primary signal. A
 * body that opens with `{` or `[` counts too, because a document served as `text/plain` is still a
 * document and a capped read of a long one cannot be parsed to prove it. The parse is the last
 * resort, only trusted on a body that arrived whole.
 */
function servesJson(res: RawResponse): boolean {
  const ct = String(res.headers['content-type'] ?? '').toLowerCase()
  if (ct.includes('json')) return true
  const head = res.body.trimStart()
  if (head.startsWith('{') || head.startsWith('[')) return true
  if (res.truncated) return false
  try {
    JSON.parse(res.body)
    return true
  } catch {
    return false
  }
}

/**
 * A guard refusal into a verdict. A resolver that could not answer is our failure, so nothing was
 * measured and the row claims nothing. NXDOMAIN is different. DNS answered, so G3 calls an endpoint
 * that does not resolve a `dns` failure.
 */
function guardVerdict(reason: string): { verdict: ProbeOutcome['verdict']; failureClass: string | null } {
  if (reason.includes('not resolved in this process')) return { verdict: 'skip', failureClass: null }
  if (/EAI_AGAIN|ESERVFAIL|ETIMEOUT/.test(reason)) return { verdict: 'skip', failureClass: null }
  if (reason.startsWith('hostname resolves to')) return { verdict: 'fail', failureClass: 'dns' }
  if (reason.includes('template placeholder')) return { verdict: 'fail', failureClass: 'template' }
  return { verdict: 'fail', failureClass: 'http' }
}

/**
 * One URL, one request, one row's worth of evidence. `url` stays the URL the listing declared even
 * when a redirect moved the request, because that is the string a buyer would use. The chain it took
 * goes in the note.
 */
export async function probeUrl(url: string): Promise<ProbeOutcome> {
  const base: ProbeOutcome = {
    url,
    assertion: PROBE_ASSERTION,
    verdict: 'fail',
    failureClass: 'http',
    httpStatus: null,
    sawPaymentRequired: false,
    tlsOk: false,
    latencyMs: null,
    note: null,
  }
  const guard = await checkUrl(url)
  if (!guard.ok) {
    const reason = guard.reason ?? 'refused'
    return { ...base, ...guardVerdict(reason), note: `refused before the request: ${reason}` }
  }

  let target = new URL(url.trim())
  const chain: string[] = []
  for (let hop = 0; ; hop++) {
    const answer = hostAnswers.get(target.hostname)
    // Prefer the A record. A published AAAA on a network with no IPv6 egress reads as a timeout the
    // operator cannot reproduce. Every address in the answer already passed the guard anyway.
    const pick = answer?.addresses.find((a) => a.family === 4) ?? answer?.addresses[0]
    if (!pick) return { ...base, verdict: 'skip', failureClass: null, note: 'no vetted address to pin' }

    const res = await fetchPinned(target, pick.address, pick.family)
    // A plain http answer is recorded and says so. `reachable` is defined as TLS completing, so a
    // pass here still promotes nothing, which would look like a bug without the note.
    const trail = `${chain.length > 0 ? ` after ${chain.join(' -> ')}` : ''}${
      target.protocol === 'http:' ? ' [plain http, no TLS, so no rung above declared]' : ''
    }`
    if (res.error) {
      const failureClass = errorClass(res.error.code)
      return {
        ...base,
        failureClass,
        latencyMs: res.latencyMs,
        note: `${res.error.code}: ${res.error.message.slice(0, 160)}${trail}`,
      }
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers['location']
      if (typeof location !== 'string' || location === '' || hop >= MAX_REDIRECTS) {
        return { ...base, httpStatus: res.status, tlsOk: res.tlsOk, latencyMs: res.latencyMs, note: `HTTP ${res.status} with no followable location${trail}` }
      }
      let next: URL
      try {
        next = new URL(location, target)
      } catch {
        return { ...base, httpStatus: res.status, tlsOk: res.tlsOk, latencyMs: res.latencyMs, note: `HTTP ${res.status} to an unparseable location${trail}` }
      }
      // The new host gets the same guard as the first one. Following a redirect on trust is how an
      // allowed URL turns into a request at 169.254.169.254.
      const onward = await checkUrl(next.href)
      if (!onward.ok) {
        return {
          ...base,
          ...guardVerdict(onward.reason ?? 'refused'),
          httpStatus: res.status,
          tlsOk: res.tlsOk,
          latencyMs: res.latencyMs,
          note: `redirect to ${next.href} refused: ${onward.reason ?? 'refused'}`,
        }
      }
      chain.push(next.href)
      target = next
      continue
    }

    return { ...base, ...classifyStatus(res, target, trail), httpStatus: res.status, tlsOk: res.tlsOk, latencyMs: res.latencyMs }
  }
}

/** A status into a verdict, a class where it failed and the payment fact if the challenge parsed. */
function classifyStatus(
  res: RawResponse,
  target: URL,
  trail: string,
): { verdict: ProbeOutcome['verdict']; failureClass: string | null; sawPaymentRequired: boolean; note: string } {
  const status = res.status
  const ct = String(res.headers['content-type'] ?? 'none').split(';')[0]
  const size = `${res.bytes} bytes${res.truncated ? ` read to the ${MAX_BODY_BYTES} byte cap` : ' read'}`
  if (status === 402) {
    const pay = parsePaymentRequirements(res.headers, res.body)
    if (pay) {
      return {
        verdict: 'pass',
        failureClass: null,
        sawPaymentRequired: true,
        note: `402 x402Version=${pay.version ?? 'unstated'} accepts=${pay.accepts} bsc=${pay.bsc ? 'yes' : 'no'} read from the ${pay.source}${trail}`,
      }
    }
    // The service answered the way a paid resource should. It is still not payable, so the rung
    // stops at `probed` rather than `payable`.
    return { verdict: 'pass', failureClass: null, sawPaymentRequired: false, note: `402 carrying no parseable payment requirements${trail}` }
  }
  // A shared host rate limiting us says nothing about the agent, so nothing is recorded about it.
  if (status === 429) {
    return { verdict: 'skip', failureClass: null, sawPaymentRequired: false, note: `429 from the host, no measurement of the agent${trail}` }
  }
  if (status === 304) {
    return { verdict: 'pass', failureClass: null, sawPaymentRequired: false, note: `304 not modified, the host answered${trail}` }
  }
  if (status >= 200 && status < 300) {
    if (!expectsDocument(target) || servesJson(res)) {
      return { verdict: 'pass', failureClass: null, sawPaymentRequired: false, note: `${status} ${ct}, ${size}${trail}` }
    }
    // 200 is not existence. One live agent's declared card path answers 200 with the SPA shell in
    // `text/html`. A checker that tests the status alone marks that verified.
    return {
      verdict: 'fail',
      failureClass: 'shape',
      sawPaymentRequired: false,
      note: `${status} on a .json path serving ${ct}, so the path returns a page rather than the document (${size})${trail}`,
    }
  }
  // The service is up and refused this request shape. That is reachability, not a defect: an agent
  // may only accept POST or may want a key.
  if ([401, 403, 405, 406, 415].includes(status)) {
    return { verdict: 'pass', failureClass: null, sawPaymentRequired: false, note: `${status}, the service answered and declined this request shape${trail}` }
  }
  return { verdict: 'fail', failureClass: 'http', sawPaymentRequired: false, note: `HTTP ${status} ${ct}${trail}` }
}

interface Candidate {
  listingId: string
  agentId: string
  evidenceTier: EvidenceRung
  lifecycleState: LifecycleState
  endpoints: string
}

/**
 * Hosts whose declared endpoint is documentation rather than a service. Every OASF entry in the
 * population points at the same GitHub repository, so probing it would award a rung for a 200 from
 * a README.
 */
const DOC_ONLY_HOSTS = new Set(['github.com', 'www.github.com', 'gitlab.com'])

/** The machine surface beats a homepage. A 200 from a marketing page proves nothing a buyer can use. */
function endpointRank(u: URL): number {
  const path = u.pathname.toLowerCase()
  if (path.endsWith('/.well-known/agent-card.json')) return 5
  if (path.endsWith('/.well-known/agent-registration.json')) return 4
  if (path.endsWith('.json')) return 3
  if (/\/(a2a|mcp|rpc|api)(\/|$)/.test(path)) return 2
  if (path !== '/') return 1
  return 0
}

/**
 * One URL per listing and one URL per host per cycle. The budget is per host because a handful of
 * hosts carry most of the declared URLs in this population, so a per-listing budget would put
 * dozens of requests on one server inside a few seconds.
 */
function pickEndpoint(endpoints: string[], taken: Set<string>): { url: string; host: string } | null {
  const parsed = endpoints
    .map((raw) => {
      try {
        return { raw, u: new URL(raw) }
      } catch {
        return null
      }
    })
    .filter((e): e is { raw: string; u: URL } => e !== null && !DOC_ONLY_HOSTS.has(e.u.hostname))
    .sort((a, b) => endpointRank(b.u) - endpointRank(a.u))
  for (const e of parsed) {
    if (!taken.has(e.u.hostname)) return { url: e.raw, host: e.u.hostname }
  }
  return null
}

/** The highest rung this outcome supports. Null when it supports none. */
export function observedRung(out: ProbeOutcome): EvidenceRung | null {
  // `reachable` is defined as the host resolving and TLS completing, so nothing above `declared` is
  // available without a verified certificate.
  if (!out.tlsOk) return null
  if (out.sawPaymentRequired) return 'payable'
  if (out.verdict === 'pass') return 'probed'
  if (out.httpStatus !== null) return 'reachable'
  return null
}

const INSERT_PROBE = `
INSERT INTO probeResult (
  probeId, listingId, agentId, url, assertion, verdict, failureClass, httpStatus,
  sawPaymentRequired, tlsOk, latencyMs, observedAt, prober, note
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`

const BUMP_LISTING = `
UPDATE listing SET lastProbeAt = ?, lastProbeVerdict = ?, evidenceTier = ?, lifecycleState = ?,
       updatedAt = ? WHERE listingId = ?`

/**
 * Probe the listings we know least about first, write one row per attempt and move the rung only as
 * far as the attempt earned. The tier never moves down here: a listing that stops answering loses
 * its `lifecycleState` to `stale` and keeps the evidence it did produce, because the record of a
 * host that once answered is a fact and today's failure is a separate one.
 */
export async function probeCycle(limit = 40): Promise<{
  probed: number
  passed: number
  failed: number
  skipped: number
  promoted: number
}> {
  const runId = randomUUID()
  const startedAt = Date.now()
  db()
    .prepare('INSERT INTO run (runId, kind, startedAt, itemsRead, itemsWritten, errors, ok) VALUES (?,?,?,0,0,0,0)')
    .run(runId, 'probeCycle', startedAt)

  const candidates = db()
    .prepare(
      `SELECT l.listingId, l.agentId, l.evidenceTier, l.lifecycleState, a.endpoints
       FROM listing l JOIN agent a ON a.chainId = l.chainId AND a.agentId = l.agentId
       WHERE l.chainId = ? AND l.visibility IN ('listed','indexed')
         AND json_array_length(a.endpoints) > 0
       ORDER BY l.lastProbeAt IS NOT NULL, l.lastProbeAt ASC, CAST(l.agentId AS INTEGER) ASC
       LIMIT ?`,
    )
    .all(CHAIN_ID, limit) as unknown as Candidate[]

  const hostsUsed = new Set<string>()
  let passed = 0
  let failed = 0
  let skipped = 0
  let promoted = 0
  let deferred = 0

  // One request per URL per cycle, with the answer applied to every candidate that declared
  // that exact URL. Measured need: 56 agents on one host share one endpoint string, and a
  // one-request-per-host rule would take 56 cycles to reach them while the same response
  // arrived every time. Same URL, same answer, honestly. A different URL on the same host is
  // still deferred, because a different path can answer differently.
  const answered = new Map<string, ProbeOutcome>()

  for (const row of candidates) {
    const urls = safeArr(row.endpoints)
    const reused = urls.map((u) => answered.get(u)).find((o): o is ProbeOutcome => o !== undefined)
    let out: ProbeOutcome
    if (reused) {
      out = reused
    } else {
      const chosen = pickEndpoint(urls, hostsUsed)
      // Nothing written for a host already used this cycle. A row nobody attempted is not a result.
      if (!chosen) {
        deferred++
        continue
      }
      hostsUsed.add(chosen.host)
      out = await probeUrl(chosen.url)
      answered.set(chosen.url, out)
    }
    if (out.verdict === 'pass') passed++
    else if (out.verdict === 'fail') failed++
    else skipped++

    const rung = observedRung(out)
    const nextTier =
      rung !== null && EVIDENCE_ORDER.indexOf(rung) > EVIDENCE_ORDER.indexOf(row.evidenceTier)
        ? rung
        : row.evidenceTier
    let state = row.lifecycleState
    if (out.verdict === 'pass' && (state === 'candidate' || state === 'stale')) state = 'probed'
    else if (out.verdict === 'fail' && (state === 'probed' || state === 'live')) state = 'stale'

    const now = Date.now()
    tx(() => {
      db()
        .prepare(INSERT_PROBE)
        .run(
          randomUUID(),
          row.listingId,
          row.agentId,
          out.url,
          out.assertion,
          out.verdict,
          out.failureClass,
          out.httpStatus,
          out.sawPaymentRequired ? 1 : 0,
          out.tlsOk ? 1 : 0,
          out.latencyMs,
          now,
          PROBER,
          out.note,
        )
      db().prepare(BUMP_LISTING).run(now, out.verdict, nextTier, state, now, row.listingId)
    })
    if (nextTier !== row.evidenceTier) promoted++
  }

  const probed = passed + failed + skipped
  db()
    .prepare('UPDATE run SET finishedAt = ?, itemsRead = ?, itemsWritten = ?, ok = 1, note = ? WHERE runId = ?')
    .run(
      Date.now(),
      candidates.length,
      probed,
      `hosts=${hostsUsed.size} deferred=${deferred} pass=${passed} fail=${failed} skip=${skipped} promoted=${promoted}`,
      runId,
    )
  return { probed, passed, failed, skipped, promoted }
}

function safeArr(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

if (import.meta.filename === process.argv[1]) {
  const arg = process.argv[2]
  if (arg !== undefined && /^https?:\/\//i.test(arg)) {
    console.log(JSON.stringify(await probeUrl(arg), null, 2))
  } else {
    const r = await probeCycle(arg === undefined ? undefined : Number(arg))
    console.log(
      `probe: ${r.probed} attempts, ${r.passed} pass, ${r.failed} fail, ${r.skipped} skip, ${r.promoted} listings promoted`,
    )
  }
}

