/**
 * Independent verification of worker/probe.ts. Written against the module's contract rather than
 * against tools/probe-gate.ts, so it re-runs every claim from scratch with a wider hostile table.
 *
 * Three things this checks that the gate does not. A hostname whose answer mixes one public and one
 * private address, which is the case the whole every-address rule exists for. The near-miss ranges
 * next to each blocked block, so an over-broad mask shows up as a refused public address. And a
 * live redirect into cloud-metadata space, so the second guard pass is proven rather than assumed.
 *
 * Run: node --experimental-strip-types --no-warnings tools/probe-verify.ts
 */
process.env.MUSTER_DB ??= '/tmp/muster-probe-verify.db'

import { existsSync, rmSync } from 'node:fs'

for (const suffix of ['', '-wal', '-shm']) {
  const p = `${process.env.MUSTER_DB}${suffix}`
  if (existsSync(p)) rmSync(p)
}

const { isSafeUrl, checkUrl, probeUrl, probeCycle } = await import('../worker/probe.ts')
const { db, migrate, close } = await import('../lib/db.ts')

let fails = 0
const bad = (msg: string): void => {
  fails++
  console.log(`  FAIL ${msg}`)
}

const pad = (s: string, w: number): string => (s.length > w ? `${s.slice(0, w - 1)}~` : s.padEnd(w))

console.log('=== A. fail closed before DNS ran ===')
// A host this process has never resolved must be refused, never assumed public.
const unprimed = isSafeUrl('https://verify-unprimed.example.net/card.json')
console.log(`  unprimed verdict ok=${unprimed.ok} reason=${unprimed.reason}`)
if (unprimed.ok) bad('an unresolved host was accepted')
if (!unprimed.reason?.includes('not resolved in this process')) bad('unprimed refusal named the wrong rule')

const HOSTILE: [string, string][] = [
  ['ftp://arcabot.ai/agent.json', 'scheme ftp'],
  ['file:///etc/passwd', 'scheme file'],
  ['gopher://arcabot.ai/1', 'scheme gopher'],
  ['data:application/json,{}', 'scheme data'],
  ['javascript:fetch(1)', 'scheme javascript'],
  ['https://operator:secret@arcabot.ai/c', 'user and password'],
  ['https://operator@arcabot.ai/c', 'user only'],
  ['https://:secret@arcabot.ai/c', 'password only'],
  ['https://arcabot.ai:8080/c', 'port 8080'],
  ['https://arcabot.ai:0/c', 'port 0'],
  ['http://arcabot.ai:8443/c', 'port 8443'],
  ['https://127.0.0.1/c', 'bare IPv4'],
  ['https://[::1]/c', 'bare IPv6'],
  ['http://127.1/c', 'short-form IPv4 literal'],
  ['http://0/c', 'zero IPv4 literal'],
  ['http://2130706433/c', 'decimal IPv4 literal'],
  ['http://0x7f000001/c', 'hex IPv4 literal'],
  ['http://[::ffff:169.254.169.254]/c', 'bare mapped metadata'],
  ['http://[64:ff9b::a00:1]/c', 'bare NAT64'],
  ['https://arcabot.ai/agents/{agentId}/card', 'template placeholder'],
  ['agent.example.com/card.json', 'no scheme'],
  ['', 'empty string'],
  ['     ', 'whitespace only'],
  [`https://arcabot.ai/${'a'.repeat(520)}`, 'over 512 characters'],
  ['https:///c', 'no hostname'],
  ['http://localhost/c', 'loopback by name'],
  ['http://10.0.0.1.nip.io/c', '10/8'],
  ['http://172.16.0.1.nip.io/c', '172.16/12 low edge'],
  ['http://172.31.255.254.nip.io/c', '172.16/12 high edge'],
  ['http://192.168.1.1.nip.io/c', '192.168/16'],
  ['http://169.254.169.254.nip.io/c', 'cloud metadata'],
  ['http://100.64.0.1.nip.io/c', 'CGNAT low edge'],
  ['http://100.127.255.254.nip.io/c', 'CGNAT high edge'],
  ['http://224.0.0.1.nip.io/c', 'multicast low edge'],
  ['http://239.255.255.250.nip.io/c', 'multicast SSDP'],
  ['http://255.255.255.255.nip.io/c', 'broadcast'],
  ['http://0.0.0.0.nip.io/c', 'unspecified'],
  ['http://240.0.0.1.nip.io/c', 'reserved 240/4'],
  ['http://192.0.2.1.nip.io/c', 'TEST-NET-1'],
  ['http://198.18.0.1.nip.io/c', 'benchmark 198.18/15'],
  ['http://0--1.sslip.io/c', 'IPv6 loopback'],
  ['http://fc00--1.sslip.io/c', 'ULA fc00::/8'],
  ['http://fd12-3456--1.sslip.io/c', 'ULA fd00::/8'],
  ['http://0--ffff-7f00-1.sslip.io/c', 'IPv4-mapped'],
  ['http://64-ff9b--7f00-1.sslip.io/c', 'NAT64 well-known'],
  ['http://ff02--1.sslip.io/c', 'IPv6 multicast'],
  ['http://fe80--1.sslip.io/c', 'IPv6 link-local'],
  ['http://2002-a00-1--1.sslip.io/c', '6to4 over 10.0.0.1'],
  ['http://2001-0-0-1--1.sslip.io/c', 'Teredo'],
  ['http://2001-db8--1.sslip.io/c', 'documentation 2001:db8::/32'],
  ['http://fec0--1.sslip.io/c', 'site-local fec0::/10'],
  ['http://no-such-host-zzz9.invalid/c', 'NXDOMAIN'],
  // The answer leads with a public address and hides a private one behind it.
  ['http://1.2.3.4.fc00--1.sslip.io/c', 'mixed answer, public first'],
  ['http://1.2.3.4.0--1.sslip.io/c', 'mixed answer, loopback first'],
]

console.log()
console.log('=== B. isSafeUrl against 54 hostile inputs ===')
console.log(`${pad('input', 46)} ${pad('rule under test', 28)} ${pad('verdict', 8)} reason`)
console.log('-'.repeat(150))
const reasons = new Set<string>()
let refused = 0
for (const [url, rule] of HOSTILE) {
  await checkUrl(url)
  const v = isSafeUrl(url)
  if (v.ok) bad(`accepted a hostile input: ${url} (${rule})`)
  else refused++
  if (v.reason) reasons.add(v.reason.replace(/resolves to [^,]+, which is /, 'resolves to X, which is '))
  console.log(`${pad(url, 46)} ${pad(rule, 28)} ${pad(v.ok ? 'ACCEPT' : 'REFUSED', 8)} ${v.reason ?? '-'}`)
}
console.log(`\n  refused ${refused} of ${HOSTILE.length}, ${reasons.size} distinct rules named`)

const SAFE: [string, string][] = [
  ['https://arcabot.ai/.well-known/agent-card.json', 'four addresses, all public'],
  ['https://agent.brainonbnb.com/a2a', 'four addresses, all public'],
  ['https://arcabot.ai:443/c', 'explicit 443'],
  ['http://arcabot.ai:80/c', 'explicit 80'],
  ['http://100.128.0.1.nip.io/c', 'just above CGNAT, public'],
  ['http://172.32.0.1.nip.io/c', 'just above 172.16/12, public'],
  ['http://169.253.0.1.nip.io/c', 'just below link-local, public'],
  ['http://2001-4860-4860--8888.sslip.io/c', 'public IPv6'],
]

console.log()
console.log('=== C. the near misses next to each blocked range must still pass ===')
for (const [url, why] of SAFE) {
  await checkUrl(url)
  const v = isSafeUrl(url)
  if (!v.ok) bad(`refused a legitimate URL: ${url} (${why}) -> ${v.reason}`)
  console.log(`${pad(url, 46)} ${pad(why, 30)} ${v.ok ? 'ACCEPTED' : `REFUSED ${v.reason}`}`)
}

console.log()
console.log('=== D. probeUrl against live endpoints, checked against the raw reads ===')
const LIVE: [string, string][] = [
  ['https://signalpulse.theaslangroupllc.com/api/scan/crypto-lite', 'curl: 402, PAYMENT-REQUIRED v2, 3 accepts, one eip155:56'],
  ['https://agent.brainonbnb.com/.well-known/agent-card.json', 'curl: 200 application/json 8526 bytes'],
  ['https://evoevo.ai/.well-known/agent-card.json', 'curl: 200 text/html 74551 bytes, SPA shell'],
  ['https://clawnews.io', 'curl: cert CN=*.up.railway.app, altname mismatch'],
  ['https://api.github.com/user', 'curl: 401 application/json'],
  ['https://httpbin.org/redirect-to?url=http%3A%2F%2F169.254.169.254.nip.io%2F', 'curl: 302 to the metadata address'],
]
for (const [url, expect] of LIVE) {
  const o = await probeUrl(url)
  console.log(
    `${pad(url, 62)} ${pad(o.verdict, 5)} class=${pad(o.failureClass ?? '-', 9)} http=${pad(String(o.httpStatus ?? '-'), 4)} 402=${o.sawPaymentRequired ? 'yes' : 'no '} tls=${o.tlsOk ? 'ok' : 'no'} ${pad(`${o.latencyMs ?? 'null'}ms`, 8)}`,
  )
  console.log(`    expected from curl: ${expect}`)
  console.log(`    note: ${o.note ?? '-'}`)
}

console.log()
console.log('=== E. a guard refusal measures nothing, so its numbers are null not zero ===')
for (const url of ['http://10.0.0.1.nip.io/c', 'ftp://arcabot.ai/c', 'https://arcabot.ai/{agentId}']) {
  const o = await probeUrl(url)
  if (o.latencyMs !== null) bad(`${url} reported latencyMs=${o.latencyMs} for a request never sent`)
  if (o.httpStatus !== null) bad(`${url} reported httpStatus=${o.httpStatus} for a request never sent`)
  if (o.verdict === 'fail' && o.failureClass === null) bad(`${url} failed with no class`)
  console.log(`  ${pad(url, 34)} verdict=${o.verdict} class=${o.failureClass} http=${o.httpStatus} latency=${o.latencyMs}`)
}

console.log()
console.log('=== F. probeCycle over a scratch store, rung by rung ===')
migrate()
const now = Date.now()
const seed = (agentId: string, endpoints: string[], tier: string): void => {
  db()
    .prepare(
      `INSERT INTO agent (chainId, agentId, owner, tokenUri, endpoints, skills, serviceKinds,
         registrationParsed, firstSeenBlock, lastSeenBlock, updatedAt)
       VALUES (56, ?, '0x0000000000000000000000000000000000000001', '', ?, '[]', '[]', 1, 0, 0, ?)`,
    )
    .run(agentId, JSON.stringify(endpoints), now)
  db()
    .prepare(
      `INSERT INTO listing (listingId, chainId, agentId, category, visibility, lifecycleState,
         evidenceTier, firstParty, updatedAt) VALUES (?, 56, ?, 'yield', 'listed', 'candidate', ?, 0, ?)`,
    )
    .run(`56:${agentId}:yield`, agentId, tier, now)
}
// One row per rung the prober can award, plus the two it must refuse to award.
seed('9000001', ['https://signalpulse.theaslangroupllc.com/api/scan/crypto-lite'], 'declared')
seed('9000002', ['https://agent.brainonbnb.com/.well-known/agent-card.json'], 'declared')
seed('9000003', ['https://api.github.com/user'], 'declared')
seed('9000004', ['https://evoevo.ai/.well-known/agent-card.json'], 'declared')
seed('9000005', ['https://clawnews.io'], 'declared')
seed('9000006', ['http://neverssl.com/'], 'declared')
seed('9000007', ['https://api.github.com/rate_limit'], 'payable')

const cycle = await probeCycle(20)
console.log(`  probeCycle: ${JSON.stringify(cycle)}`)
if (cycle.probed !== cycle.passed + cycle.failed + cycle.skipped) bad('the counts do not add up')

const rows = db()
  .prepare(
    `SELECT l.agentId, l.evidenceTier, l.lifecycleState, l.lastProbeVerdict, p.url, p.verdict,
            p.failureClass, p.httpStatus, p.sawPaymentRequired, p.tlsOk, p.latencyMs, p.note
     FROM listing l LEFT JOIN probeResult p ON p.listingId = l.listingId ORDER BY l.agentId`,
  )
  .all() as Record<string, unknown>[]
console.log()
console.log(`  ${pad('agent', 9)} ${pad('rung', 10)} ${pad('state', 10)} ${pad('verdict', 8)} ${pad('class', 9)} http 402 tls`)
for (const r of rows) {
  console.log(
    `  ${pad(String(r['agentId']), 9)} ${pad(String(r['evidenceTier']), 10)} ${pad(String(r['lifecycleState']), 10)} ${pad(String(r['verdict'] ?? '-'), 8)} ${pad(String(r['failureClass'] ?? '-'), 9)} ${pad(String(r['httpStatus'] ?? '-'), 4)} ${r['sawPaymentRequired']}   ${r['tlsOk']}`,
  )
  console.log(`    ${String(r['url'] ?? '-')}  ${String(r['note'] ?? '-')}`)
}

// A rung is a claim about evidence, so each one is checked against what the row actually saw.
const rung = (agentId: string): Record<string, unknown> | undefined =>
  rows.find((r) => String(r['agentId']) === agentId)
const expect = (agentId: string, tier: string, why: string): void => {
  const r = rung(agentId)
  const got = String(r?.['evidenceTier'])
  if (got !== tier) bad(`agent ${agentId} sits at ${got}, expected ${tier}: ${why}`)
  else console.log(`  ok agent ${agentId} at ${tier}: ${why}`)
}
console.log()
expect('9000001', 'payable', 'a 402 carrying payment requirements is the payable rung')
expect('9000002', 'probed', 'a 200 serving the declared JSON document')
expect('9000003', 'reachable', 'a 401 proves the host answers, not that it serves what it declared')
expect('9000004', 'declared', 'a 200 serving the SPA shell earns nothing above declared')
expect('9000005', 'declared', 'a certificate bound to another name earns nothing')
expect('9000006', 'declared', 'plain http never completes TLS, so no rung above declared')
expect('9000007', 'payable', 'a rung already earned is never lowered by a later probe')

const invariant = db()
  .prepare("SELECT COUNT(*) c FROM probeResult WHERE (verdict = 'fail') != (failureClass IS NOT NULL)")
  .get() as { c: number }
if (invariant.c !== 0) bad(`${invariant.c} rows break the failureClass invariant`)
const zeroLatency = db()
  .prepare('SELECT COUNT(*) c FROM probeResult WHERE latencyMs = 0')
  .get() as { c: number }
console.log(`\n  failureClass invariant breaks: ${invariant.c}, rows claiming 0ms: ${zeroLatency.c}`)

console.log(`\nVERIFY: ${fails === 0 ? 'PASS' : `FAIL, ${fails} problems`}`)
close()
if (fails > 0) process.exitCode = 1
