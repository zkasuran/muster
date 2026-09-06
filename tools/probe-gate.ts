/**
 * Gate for worker/probe.ts. Two halves. First the SSRF guard against hostile input, one row per
 * rule, because that is the code a mistake in costs the most. Then real probes against real
 * declared endpoints plus one probeCycle over a scratch store.
 *
 * Run: node --experimental-strip-types --no-warnings tools/probe-gate.ts
 */
process.env.MUSTER_DB ??= '/tmp/muster-probe-gate.db'

import { existsSync, rmSync } from 'node:fs'
import { lookup } from 'node:dns/promises'

for (const suffix of ['', '-wal', '-shm']) {
  const p = `${process.env.MUSTER_DB}${suffix}`
  if (existsSync(p)) rmSync(p)
}

// Dynamic so the scratch path above is set before lib/db.ts reads it at module load.
const { isSafeUrl, checkUrl, probeUrl, probeCycle, PROBE_ASSERTION } = await import('../worker/probe.ts')
const { db, migrate, close } = await import('../lib/db.ts')
const { resolveAgents, hashTokenUri, CHAIN_ID } = await import('../lib/registry.ts')

const HOSTILE: [string, string][] = [
  ['ftp://example.com/agent.json', 'non-http scheme'],
  ['file:///etc/passwd', 'non-http scheme'],
  ['https://operator:secret@example.com/agent', 'credentials in the URL'],
  ['https://example.com:8080/agent', 'port not 80 or 443'],
  ['https://127.0.0.1/agent', 'bare IPv4 literal'],
  ['https://[::1]/agent', 'bare IPv6 literal'],
  ['https://platform-backend.prod.termix.live/api/v1/a2a/agents/{agentId}/card', 'unsubstituted template'],
  ['agent.example.com/card.json', 'not a URL'],
  [`https://example.com/${'a'.repeat(520)}`, 'over 512 characters'],
  ['http://localhost/agent', 'resolves to IPv4 loopback'],
  ['http://2130706433/agent', 'decimal IPv4 normalises'],
  ['http://0x7f000001/agent', 'hex IPv4 normalises'],
  ['http://10.0.0.1.nip.io/agent', 'resolves into 10/8'],
  ['http://172.16.0.1.nip.io/agent', 'resolves into 172.16/12'],
  ['http://192.168.1.1.nip.io/agent', 'resolves into 192.168/16'],
  ['http://169.254.169.254.nip.io/agent', 'cloud metadata, link-local'],
  ['http://100.64.0.1.nip.io/agent', 'resolves into CGNAT 100.64/10'],
  ['http://224.0.0.1.nip.io/agent', 'IPv4 multicast'],
  ['http://255.255.255.255.nip.io/agent', 'broadcast'],
  ['http://192.0.2.1.nip.io/agent', 'reserved TEST-NET-1'],
  ['http://0--1.sslip.io/agent', 'IPv6 loopback ::1'],
  ['http://fc00--1.sslip.io/agent', 'unique-local fc00::/7'],
  ['http://0--ffff-7f00-1.sslip.io/agent', 'IPv4-mapped IPv6'],
  ['http://64-ff9b--7f00-1.sslip.io/agent', 'NAT64 64:ff9b::/96'],
  ['http://ff02--1.sslip.io/agent', 'IPv6 multicast'],
  ['http://fe80--1.sslip.io/agent', 'IPv6 link-local'],
  ['http://2002-a00-1--1.sslip.io/agent', '6to4 wrapping 10.0.0.1'],
  ['https://no-such-host-zzz9.invalid/agent', 'resolves to nothing'],
]

const SAFE = [
  'https://arcabot.ai/.well-known/agent-card.json',
  'https://agent.brainonbnb.com/a2a',
]

function cell(s: string, w: number): string {
  return s.length > w ? `${s.slice(0, w - 1)}~` : s.padEnd(w)
}

/** The address the guard saw is quoted inside its own reason string, so no second column is needed. */
console.log('=== 1. isSafeUrl against hostile input ===')
console.log(`${cell('input', 52)} ${cell('rule under test', 26)} ${cell('verdict', 8)} reason`)
console.log('-'.repeat(148))

let refused = 0
let wrong = 0
for (const [url, rule] of HOSTILE) {
  await checkUrl(url) // primes the resolver answer isSafeUrl reads
  const v = isSafeUrl(url)
  if (v.ok) wrong++
  else refused++
  console.log(`${cell(url, 52)} ${cell(rule, 26)} ${cell(v.ok ? 'ACCEPT' : 'REFUSED', 8)} ${v.reason ?? '-'}`)
}

console.log()
console.log('=== 2. isSafeUrl on two real declared endpoints ===')
for (const url of SAFE) {
  const viaCheck = await checkUrl(url)
  const direct = isSafeUrl(url)
  if (!direct.ok) wrong++
  const answers = await lookup(new URL(url).hostname, { all: true, verbatim: true })
  console.log(
    `${cell(url, 52)} ${cell(direct.ok ? 'ACCEPTED' : 'REFUSED', 9)} ${direct.reason ?? 'no rule broke'} (checkUrl agrees: ${viaCheck.ok === direct.ok})`,
  )
  // Acceptance means every address in the answer passed, not the first one.
  console.log(`  ${answers.length} addresses inspected: ${answers.map((a) => a.address).join(' ')}`)
}
console.log(
  `\nrefused ${refused} of ${HOSTILE.length} hostile inputs, accepted ${SAFE.length} of ${SAFE.length} real endpoints, ${wrong} wrong verdicts`,
)

console.log()
console.log('=== 3. probeUrl against live endpoints ===')
const LIVE = [
  'https://agent.brainonbnb.com/.well-known/agent-card.json',
  'https://agent.brainonbnb.com/a2a',
  'https://signalpulse.theaslangroupllc.com/api/scan/crypto-lite',
  'https://evoevo.ai/.well-known/agent-card.json',
  'https://clawnews.io',
]
for (const url of LIVE) {
  const o = await probeUrl(url)
  console.log(
    `${cell(url, 58)} ${cell(o.verdict, 5)} class=${cell(o.failureClass ?? '-', 9)} http=${cell(String(o.httpStatus ?? '-'), 4)} 402=${o.sawPaymentRequired ? 'yes' : 'no '} tls=${o.tlsOk ? 'ok ' : 'no '} ${cell(`${o.latencyMs ?? '-'}ms`, 7)} ${o.note ?? ''}`,
  )
}

console.log()
console.log('=== 3b. probeUrl on refused URLs, so the guard verdict reaches the row ===')
for (const url of [
  'http://10.0.0.1.nip.io/agent',
  'https://platform-backend.prod.termix.live/api/v1/a2a/agents/{agentId}/card',
  'https://example.com:8080/agent',
  'ftp://example.com/agent.json',
]) {
  const o = await probeUrl(url)
  console.log(
    `${cell(url, 58)} ${cell(o.verdict, 5)} class=${cell(o.failureClass ?? '-', 9)} http=${cell(String(o.httpStatus ?? '-'), 4)} tls=${o.tlsOk ? 'ok' : 'no'} latency=${o.latencyMs ?? 'null'} ${o.note ?? ''}`,
  )
}

console.log()
console.log('=== 4. probeCycle over a scratch store ===')
console.log(`store: ${process.env.MUSTER_DB}`)
const schema = migrate()
console.log(`schema: journal=${schema.journalMode} tables=${schema.tables.join(',')}`)

// Real agents, read off chain now, so the endpoints probed below are the ones operators declared.
const agents = await resolveAgents([1n, 304493n])
const now = Date.now()
const insertAgent = db().prepare(
  `INSERT INTO agent (chainId, agentId, owner, agentWallet, tokenUri, tokenUriHash, name, description,
     endpoints, skills, serviceKinds, declaresX402, declaresActive, trustModels, registrationParsed,
     firstSeenBlock, lastSeenBlock, updatedAt)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
)
const insertListing = db().prepare(
  `INSERT INTO listing (listingId, chainId, agentId, category, visibility, lifecycleState, evidenceTier,
     firstParty, updatedAt) VALUES (?,?,?,?,?,?,?,0,?)`,
)
let seeded = 0
for (const a of agents) {
  const r = a.registration
  if (!a.owner || !r || r.endpoints.length === 0) {
    console.log(`  agent ${a.agentId}: no parsed registration with endpoints, skipped`)
    continue
  }
  insertAgent.run(
    CHAIN_ID, a.agentId, a.owner.toLowerCase(), a.agentWallet?.toLowerCase() ?? null, a.tokenUri,
    hashTokenUri(a.tokenUri), r.name, r.description, JSON.stringify(r.endpoints), JSON.stringify(r.skills),
    JSON.stringify(r.serviceKinds), r.declaresX402 ? 1 : 0, r.declaresActive ? 1 : 0,
    JSON.stringify(r.trustModels), 1, 0, 0, now,
  )
  insertListing.run(`${CHAIN_ID}:${a.agentId}:yield`, CHAIN_ID, a.agentId, 'yield', 'listed', 'candidate', 'declared', now)
  seeded++
  console.log(`  agent ${a.agentId} "${r.name}" endpoints: ${r.endpoints.join(' ')}`)
}
console.log(`seeded ${seeded} agents and ${seeded} listings at rung declared`)

const cycle = await probeCycle(10)
console.log(
  `\nprobeCycle: probed=${cycle.probed} passed=${cycle.passed} failed=${cycle.failed} skipped=${cycle.skipped} promoted=${cycle.promoted}`,
)

const rows = db()
  .prepare(
    `SELECT listingId, agentId, url, assertion, verdict, failureClass, httpStatus, sawPaymentRequired,
            tlsOk, latencyMs, prober, note FROM probeResult ORDER BY observedAt, agentId`,
  )
  .all() as Record<string, unknown>[]
console.log(`\nprobeResult rows written: ${rows.length}`)
for (const r of rows) {
  console.log(
    `  agent ${String(r['agentId']).padEnd(7)} ${cell(String(r['url']), 52)} ${cell(String(r['verdict']), 5)} class=${cell(String(r['failureClass'] ?? '-'), 7)} http=${String(r['httpStatus'] ?? '-').padEnd(4)} 402=${r['sawPaymentRequired']} tls=${r['tlsOk']} ${String(r['latencyMs'] ?? '-')}ms`,
  )
  console.log(`    assertion=${String(r['assertion'])} prober=${String(r['prober'])} note=${String(r['note'])}`)
}

const listings = db()
  .prepare('SELECT agentId, evidenceTier, lifecycleState, lastProbeVerdict, lastProbeAt FROM listing ORDER BY agentId')
  .all() as Record<string, unknown>[]
console.log('\nlisting rungs after the cycle (all started at declared):')
for (const l of listings) {
  console.log(
    `  agent ${String(l['agentId']).padEnd(7)} rung=${String(l['evidenceTier']).padEnd(10)} state=${String(l['lifecycleState']).padEnd(10)} lastVerdict=${String(l['lastProbeVerdict'])} at=${new Date(Number(l['lastProbeAt'])).toISOString()}`,
  )
}

const run = db().prepare("SELECT runId, kind, itemsRead, itemsWritten, ok, note FROM run WHERE kind = 'probeCycle'").get() as
  | Record<string, unknown>
  | undefined
console.log(`\nrun row: kind=${String(run?.['kind'])} read=${String(run?.['itemsRead'])} written=${String(run?.['itemsWritten'])} ok=${String(run?.['ok'])} note=${String(run?.['note'])}`)

// The constraint the store enforces: a class on every fail and only on a fail.
const bad = db()
  .prepare("SELECT COUNT(*) c FROM probeResult WHERE (verdict = 'fail') != (failureClass IS NOT NULL)")
  .get() as { c: number }
console.log(`failureClass invariant violations: ${bad.c}`)

const verdict = wrong === 0 && refused === HOSTILE.length && rows.length > 0 && bad.c === 0
console.log(`\nGATE: ${verdict ? 'PASS' : 'FAIL'}  (guard ${refused}/${HOSTILE.length}, wrong verdicts ${wrong}, probe rows ${rows.length}, invariant breaks ${bad.c})`)
close()
if (!verdict) process.exitCode = 1

