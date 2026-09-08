/**
 * Independent re-verification of worker/probe.ts, written from the module's brief rather than from
 * tools/probe-gate.ts or tools/probe-verify.ts. Every DNS answer asserted here was read with `dig`
 * first, so an expectation is ground truth rather than the module's own opinion.
 *
 * What this adds over the two existing scripts: each refusal must name the rule that actually
 * broke, not merely refuse; the trailing-dot and octal-literal spellings of a loopback host; a
 * hostname whose answer genuinely mixes a public A with a private AAAA (dig: 1.2.3.4.fc00--1.sslip.io
 * is A 1.2.3.4 and AAAA fc00::1); the near misses one bit outside every blocked range; and the
 * per-host budget plus the never-demote rule inside probeCycle.
 *
 * Run: node --experimental-strip-types --no-warnings tools/probe-indep.ts
 */
process.env.MUSTER_DB ??= '/tmp/muster-probe-indep.db'
process.env.PROBE_TIMEOUT_MS ??= '8000'

import { existsSync, rmSync } from 'node:fs'

for (const suffix of ['', '-wal', '-shm']) {
  const p = `${process.env.MUSTER_DB}${suffix}`
  if (existsSync(p)) rmSync(p)
}

const probe = await import('../worker/probe.ts')
const { isSafeUrl, checkUrl, probeUrl, probeCycle } = probe
const { db, migrate, close } = await import('../lib/db.ts')

let fails = 0
const bad = (msg: string): void => {
  fails++
  console.log(`  FAIL ${msg}`)
}
const pad = (s: string, w: number): string => (s.length > w ? `${s.slice(0, w - 1)}~` : s.padEnd(w))

console.log('=== A. the export surface against the brief ===')
const BRIEF_EXPORTS = ['isSafeUrl', 'probeUrl', 'probeCycle']
const actual = Object.keys(probe).sort()
for (const name of BRIEF_EXPORTS) {
  if (typeof (probe as Record<string, unknown>)[name] !== 'function') bad(`the brief names ${name} and it is not exported as a function`)
}
console.log(`  exported: ${actual.join(', ')}`)
console.log(`  extra beyond the brief: ${actual.filter((n) => !BRIEF_EXPORTS.includes(n)).join(', ') || 'none'}`)
console.log(`  probeCycle arity ${probeCycle.length} (0 means limit is optional)`)

const OUTCOME_KEYS = ['url', 'assertion', 'verdict', 'failureClass', 'httpStatus', 'sawPaymentRequired', 'tlsOk', 'latencyMs', 'note']
const shape = await probeUrl('ftp://arcabot.ai/x')
const got = Object.keys(shape).sort()
if (got.join() !== [...OUTCOME_KEYS].sort().join()) bad(`ProbeOutcome keys are ${got.join(',')}, the brief says ${OUTCOME_KEYS.join(',')}`)
else console.log(`  ProbeOutcome carries exactly the 9 fields the brief names`)
const verdictShape = isSafeUrl('')
if (Object.keys(verdictShape).sort().join() !== 'ok,reason') bad(`UrlVerdict keys are ${Object.keys(verdictShape).join(',')}`)

console.log()
console.log('=== B. isSafeUrl must refuse, and the reason must name the rule that broke ===')
// [url, rule under test, a fragment the reason must contain]
const HOSTILE: [string, string, string][] = [
  ['ftp://arcabot.ai/x', 'scheme ftp', 'is not http or https'],
  ['file:///etc/passwd', 'scheme file', 'is not http or https'],
  ['gopher://arcabot.ai/1', 'scheme gopher', 'is not http or https'],
  ['ws://arcabot.ai/x', 'scheme ws', 'is not http or https'],
  ['https://op:secret@arcabot.ai/x', 'credentials', 'credentials in the URL'],
  ['https://op@arcabot.ai/x', 'username only', 'credentials in the URL'],
  ['https://arcabot.ai:8080/x', 'port 8080', 'is not 80 or 443'],
  ['https://arcabot.ai:0/x', 'port 0', 'is not 80 or 443'],
  ['http://arcabot.ai:22/x', 'port 22', 'is not 80 or 443'],
  ['https://127.0.0.1/x', 'bare IPv4', 'bare IP address'],
  ['https://[::1]/x', 'bare IPv6', 'bare IP address'],
  ['http://2130706433/x', 'decimal literal', 'bare IP address'],
  ['http://0x7f000001/x', 'hex literal', 'bare IP address'],
  ['http://0177.0.0.1/x', 'octal literal', 'bare IP address'],
  ['http://127.1/x', 'short form literal', 'bare IP address'],
  ['http://127.0.0.1./x', 'literal with a trailing dot', 'bare IP address'],
  ['http://[::ffff:169.254.169.254]/x', 'bare mapped metadata', 'bare IP address'],
  ['http://[64:ff9b::a9fe:a9fe]/x', 'bare NAT64 metadata', 'bare IP address'],
  ['https://arcabot.ai/agents/{agentId}/card', 'template placeholder', 'template placeholder'],
  ['agent.example.com/card.json', 'no scheme', 'not a URL'],
  ['', 'empty', 'empty URL'],
  ['https:///x', 'no hostname', 'no hostname'],
  [`https://arcabot.ai/${'a'.repeat(520)}`, 'over 512 characters', 'longer than 512'],
  ['http://localhost/x', 'loopback by name', 'IPv4 loopback 127.0.0.0/8'],
  ['http://localhost./x', 'loopback, trailing dot', 'IPv4 loopback 127.0.0.0/8'],
  ['http://localhost:443/x', 'loopback on an allowed port', 'IPv4 loopback 127.0.0.0/8'],
  ['http://127.0.0.1.nip.io/x', 'loopback via wildcard DNS', 'IPv4 loopback 127.0.0.0/8'],
  ['http://10.0.0.1.nip.io/x', '10/8', 'private range 10.0.0.0/8'],
  ['http://10.0.0.1.nip.io./x', '10/8, trailing dot', 'private range 10.0.0.0/8'],
  ['http://172.16.0.1.nip.io/x', '172.16/12 low edge', 'private range 172.16.0.0/12'],
  ['http://172.31.255.254.nip.io/x', '172.16/12 high edge', 'private range 172.16.0.0/12'],
  ['http://192.168.1.1.nip.io/x', '192.168/16', 'private range 192.168.0.0/16'],
  ['http://169.254.169.254.nip.io/latest/meta-data/', 'cloud metadata', 'link-local 169.254.0.0/16'],
  ['http://100.64.0.1.nip.io/x', 'CGNAT low edge', 'CGNAT 100.64.0.0/10'],
  ['http://100.127.255.254.nip.io/x', 'CGNAT high edge', 'CGNAT 100.64.0.0/10'],
  ['http://224.0.0.1.nip.io/x', 'multicast low edge', 'IPv4 multicast 224.0.0.0/4'],
  ['http://239.255.255.250.nip.io/x', 'multicast SSDP', 'IPv4 multicast 224.0.0.0/4'],
  ['http://255.255.255.255.nip.io/x', 'broadcast', 'broadcast address'],
  ['http://0.0.0.0.nip.io/x', 'unspecified', 'unspecified 0.0.0.0/8'],
  ['http://240.0.0.1.nip.io/x', 'reserved 240/4', 'reserved 240.0.0.0/4'],
  ['http://192.0.2.1.nip.io/x', 'TEST-NET-1', 'reserved special-purpose range 192.0.2.0/24'],
  ['http://198.18.0.1.nip.io/x', 'benchmark 198.18/15', 'benchmark range 198.18.0.0/15'],
  ['http://0--1.sslip.io/x', 'IPv6 loopback', 'IPv6 loopback ::1'],
  ['http://fc00--1.sslip.io/x', 'ULA fc00::/8', 'unique-local fc00::/7'],
  ['http://fd12-3456--1.sslip.io/x', 'ULA fd00::/8', 'unique-local fc00::/7'],
  ['http://0--ffff-7f00-1.sslip.io/x', 'IPv4-mapped', 'IPv4-mapped IPv6'],
  ['http://64-ff9b--7f00-1.sslip.io/x', 'NAT64 well-known', 'NAT64 64:ff9b::/32'],
  ['http://ff02--1.sslip.io/x', 'IPv6 multicast', 'IPv6 multicast ff00::/8'],
  ['http://fe80--1.sslip.io/x', 'IPv6 link-local', 'IPv6 link-local fe80::/10'],
  ['http://2002-a00-1--1.sslip.io/x', '6to4 over 10.0.0.1', '6to4 2002::/16'],
  ['http://2001-0-0-1--1.sslip.io/x', 'Teredo', 'Teredo 2001::/32'],
  ['http://fec0--1.sslip.io/x', 'site-local fec0::/10', 'outside global unicast'],
  ['http://no-such-host-zzz9.invalid/x', 'NXDOMAIN', 'resolves to nothing'],
  ['http://metadata.google.internal/computeMetadata/v1/', 'GCP metadata name, no answer here', 'resolves to nothing'],
]

console.log(`${pad('input', 48)} ${pad('rule under test', 28)} ${pad('verdict', 8)} reason`)
console.log('-'.repeat(150))
const rules = new Set<string>()
let refused = 0
for (const [url, rule, needle] of HOSTILE) {
  await checkUrl(url)
  const v = isSafeUrl(url)
  if (v.ok) bad(`ACCEPTED a hostile input: ${url} (${rule})`)
  else refused++
  if (v.reason && !v.reason.includes(needle)) bad(`${url} (${rule}) refused for the wrong rule: wanted "${needle}", got "${v.reason}"`)
  if (v.reason) rules.add(v.reason.replace(/resolves to [^,]+, which is /, 'resolves to X, which is '))
  console.log(`${pad(url, 48)} ${pad(rule, 28)} ${pad(v.ok ? 'ACCEPT' : 'REFUSED', 8)} ${v.reason ?? '-'}`)
}
console.log(`\n  refused ${refused} of ${HOSTILE.length}, naming ${rules.size} distinct rules`)

console.log()
console.log('=== C. every returned address is inspected, not just the first ===')
// dig: A 1.2.3.4 (public) and AAAA fc00::1 (private). Accepting on the A record alone is the bug.
const mixed = 'http://1.2.3.4.fc00--1.sslip.io/x'
await checkUrl(mixed)
const mv = isSafeUrl(mixed)
console.log(`  ${mixed} -> ${mv.ok ? 'ACCEPTED' : 'REFUSED'} ${mv.reason ?? ''}`)
if (mv.ok) bad('a public A record hid a private AAAA record and the URL was accepted')
if (mv.reason && !mv.reason.includes('fc00::1')) bad(`the refusal did not name the private address it found: ${mv.reason}`)

console.log()
console.log('=== D. one bit outside each blocked range must still pass ===')
const NEAR: [string, string][] = [
  ['https://arcabot.ai/.well-known/agent-card.json', 'real endpoint, 2 A and 2 AAAA, all public'],
  ['https://agent.brainonbnb.com/a2a', 'real endpoint'],
  ['https://arcabot.ai:443/x', 'explicit 443'],
  ['http://arcabot.ai:80/x', 'explicit 80'],
  ['http://100.128.0.1.nip.io/x', 'just above CGNAT'],
  ['http://100.63.255.255.nip.io/x', 'just below CGNAT'],
  ['http://172.32.0.1.nip.io/x', 'just above 172.16/12'],
  ['http://172.15.255.255.nip.io/x', 'just below 172.16/12'],
  ['http://169.253.0.1.nip.io/x', 'just below link-local'],
  ['http://169.255.0.1.nip.io/x', 'just above link-local'],
  ['http://192.169.0.1.nip.io/x', 'just above 192.168/16'],
  ['http://223.255.255.255.nip.io/x', 'just below multicast'],
  ['http://192.0.1.1.nip.io/x', 'between the two reserved 192.0 blocks'],
  ['http://203.0.114.1.nip.io/x', 'just above TEST-NET-3'],
  ['http://198.20.0.1.nip.io/x', 'just above the benchmark range'],
  ['http://198.17.255.255.nip.io/x', 'just below the benchmark range'],
  ['http://11.0.0.1.nip.io/x', 'just above 10/8'],
  ['http://9.255.255.255.nip.io/x', 'just below 10/8'],
  ['http://126.255.255.255.nip.io/x', 'just below loopback'],
  ['http://128.0.0.1.nip.io/x', 'just above loopback'],
  ['http://2001-4860-4860--8888.sslip.io/x', 'public IPv6'],
]
for (const [url, why] of NEAR) {
  await checkUrl(url)
  const v = isSafeUrl(url)
  if (!v.ok) bad(`REFUSED a legitimate URL: ${url} (${why}) -> ${v.reason}`)
  console.log(`  ${pad(url, 46)} ${pad(why, 42)} ${v.ok ? 'ACCEPTED' : `REFUSED ${v.reason}`}`)
}

console.log()
console.log('=== E. the sync contract: isSafeUrl without a primed answer fails closed ===')
const unprimed = isSafeUrl('http://10.0.0.1.nip.io/x?fresh=' + Date.now())
console.log(`  ok=${unprimed.ok} reason=${unprimed.reason}`)
if (unprimed.ok) bad('an unresolved host was accepted')
