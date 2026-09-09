/**
 * The coverage proof queries, docs/03-TAXONOMY.md section 5.1. These read the store, so the test
 * seeds a temp SQLite file and asserts the counts and their first-party split against known rows.
 * No network is touched. MUSTER_DB is pointed at a temp path before the import, the same idiom
 * worker/probe.test.ts uses, so lib/db.ts opens the temp store rather than the real one.
 *
 * The load-bearing assertion is the hireable split: a payable row whose price is in no token we
 * quote is not hireable, and the third-party hireable count is a real zero. That is the finding
 * the whole build is shaped around, so it is pinned by a test rather than trusted.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync, rmSync } from 'node:fs'

const TEMP_DB = join(tmpdir(), `muster-coverage-test-${process.pid}.db`)
process.env['MUSTER_DB'] = TEMP_DB

const { db } = await import('./db.ts')
const { CHAIN } = await import('./constants.ts')
const { coverageByShelf, offShelf } = await import('./queries.ts')

const CID = CHAIN.id
const now = Date.now()

function agent(id: string, opts: { name?: string | null; endpoints?: string; parsed?: 0 | 1; cluster?: string | null } = {}): void {
  db()
    .prepare(
      `INSERT INTO agent (chainId, agentId, owner, name, endpoints, registrationParsed, duplicateClusterId, firstSeenBlock, lastSeenBlock, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(CID, id, '0xowner', opts.name ?? null, opts.endpoints ?? '[]', opts.parsed ?? 1, opts.cluster ?? null, 1, 1, now)
}

function listing(
  agentId: string,
  o: {
    category: string
    visibility: string
    tier: string
    firstParty?: 0 | 1
    verdict?: 'pass' | 'fail' | 'skip' | null
    priceToken?: string | null
    priceBase?: string | null
    priceDecimals?: number | null
  },
): void {
  db()
    .prepare(
      `INSERT INTO listing (listingId, chainId, agentId, category, visibility, lifecycleState, evidenceTier,
        priceBase, priceToken, priceDecimals, firstParty, lastProbeVerdict, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'probed', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      `${CID}:${agentId}:${o.category}`,
      CID,
      agentId,
      o.category,
      o.visibility,
      o.tier,
      o.priceBase ?? null,
      o.priceToken ?? null,
      o.priceDecimals ?? null,
      o.firstParty ?? 0,
      o.verdict ?? null,
      now,
    )
}

// Seed once. The schema is created on first db() call.
db().exec("INSERT INTO meta (k, v, updatedAt) VALUES ('chain.atBlock', '120000000', 0)")

// yield: one first-party hireable row, plus third-party rows that stop short of hireable.
agent('900000003', { name: 'ours' })
listing('900000003', { category: 'yield', visibility: 'listed', tier: 'payable', firstParty: 1, verdict: 'pass', priceToken: '0xUSD1', priceBase: '20000', priceDecimals: 18 })
agent('1001', { name: 'third payable no price token' })
// Payable rung but the 402's options are on no token we quote, so priceToken is null. Not hireable.
listing('1001', { category: 'yield', visibility: 'listed', tier: 'payable', verdict: 'pass', priceToken: null })
agent('1002', { name: 'third probed fail' })
listing('1002', { category: 'yield', visibility: 'listed', tier: 'probed', verdict: 'fail' })
agent('1003', { name: 'third indexed no endpoint', endpoints: '[]', parsed: 1 })
listing('1003', { category: 'yield', visibility: 'indexed', tier: 'declared', verdict: null })
agent('1004', { name: null, endpoints: '[]', parsed: 0 })
listing('1004', { category: 'yield', visibility: 'indexed', tier: 'registered', verdict: null })

// rebalancing: one indexed row that is parsed and has an endpoint, to exercise the third reason.
agent('2001', { name: 'callable but off shelf', endpoints: '["https://api.example/x"]', parsed: 1 })
listing('2001', { category: 'rebalancing', visibility: 'indexed', tier: 'declared', verdict: null })

// A settled and an unsettled hire on yield, so the settled count is 1 not 2.
db().prepare(
  `INSERT INTO hireAttempt (attemptId, shelf, signer, payTo, token, amountBase, nonce, validBefore, signatureHash, settled, createdAt)
   VALUES ('a1','yield','0xs','0xp','0xt','1','n1',9999999999,'0xh',1,?)`,
).run(now)
db().prepare(
  `INSERT INTO hireAttempt (attemptId, shelf, signer, payTo, token, amountBase, nonce, validBefore, signatureHash, settled, createdAt)
   VALUES ('a2','yield','0xs','0xp','0xt','1','n2',9999999999,'0xh',0,?)`,
).run(now)

const cov = coverageByShelf()
const y = cov.find((c) => c.shelf === 'yield')!
const grid = cov.find((c) => c.shelf === 'grid-trading')!

test('coverageByShelf returns all four shelves in the mandated order', () => {
  assert.deepEqual(cov.map((c) => c.shelf), ['rebalancing', 'grid-trading', 'yield', 'health-factor'])
})

test('candidates count listed plus indexed, split into ours and third party', () => {
  assert.deepEqual(y.candidates, { total: 5, ours: 1, third: 4 })
})

test('listed and indexed partition the candidates by whether there is an endpoint to call', () => {
  assert.deepEqual(y.listed, { total: 3, ours: 1, third: 2 })
  assert.deepEqual(y.indexed, { total: 2, ours: 0, third: 2 })
})

test('answering counts only rows whose most recent probe passed', () => {
  assert.deepEqual(y.answering, { total: 2, ours: 1, third: 1 })
})

test('hireable excludes a payable row priced in a token we do not quote, so third party is a real zero', () => {
  // 1001 is at the payable rung with a passing probe, but its priceToken is null, so it is not
  // hireable here. The only hireable row is ours. This is the finding the build is shaped around.
  assert.deepEqual(y.hireable, { total: 1, ours: 1, third: 0 })
})

test('settled jobs counts only settled hire attempts, and carries the read block', () => {
  assert.equal(y.settledJobs, 1)
  assert.equal(y.atBlock, 120000000)
})

test('an empty shelf reads zero for every split rather than unknown', () => {
  assert.deepEqual(grid.candidates, { total: 0, ours: 0, third: 0 })
  assert.deepEqual(grid.hireable, { total: 0, ours: 0, third: 0 })
  assert.equal(grid.settledJobs, 0)
})

test('offShelf lists indexed rows with a stored-field reason, broken out by reason', () => {
  const off = offShelf('yield')
  assert.equal(off.total, 2)
  assert.equal(off.rows.length, 2)
  const reasons = off.byReason.map((r) => r.reason).sort()
  assert.deepEqual(reasons, ['no endpoint to call in its registration record', 'registration could not be parsed'])
  // 1004 is unparsed, 1003 is parsed with no endpoint.
  assert.equal(off.rows.find((r) => r.agentId === '1004')?.reason, 'registration could not be parsed')
  assert.equal(off.rows.find((r) => r.agentId === '1003')?.reason, 'no endpoint to call in its registration record')
})

test('a parsed indexed row that has an endpoint reads the text-only reason', () => {
  const off = offShelf('rebalancing')
  assert.equal(off.total, 1)
  assert.equal(off.rows[0]?.reason, 'matched the contract text but has nothing callable')
})

test.after(() => {
  if (existsSync(TEMP_DB)) rmSync(TEMP_DB, { force: true })
  for (const s of ['-wal', '-shm']) if (existsSync(TEMP_DB + s)) rmSync(TEMP_DB + s, { force: true })
})
