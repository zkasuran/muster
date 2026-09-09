/**
 * The job resource logic, docs/04-AGENT-PROTOCOL.md sections 3 and 4, tested with no network. A temp
 * SQLite file is pointed at through MUSTER_DB before the import, the idiom lib/coverage.test.ts uses,
 * so lib/db.ts opens the temp store. The load-bearing assertions: the deliverable hash recomputes off
 * the stored result, a missing required input is caught before any settlement, and the terminal poll
 * carries the result, the rule and the hash in one body.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync, rmSync } from 'node:fs'

const TEMP_DB = join(tmpdir(), `muster-jobs-test-${process.pid}.db`)
process.env['MUSTER_DB'] = TEMP_DB

const {
  missingRequired,
  requestHashOf,
  completedJob,
  refusedJob,
  storeJob,
  readJob,
  jobResource,
  blockOf,
} = await import('./jobs.ts')
const { responseHash } = await import('./protocol.ts')
const { FIRST_PARTY } = await import('./agents.ts')

const healthAgent = FIRST_PARTY.find((a) => a.slug === 'health-factor')!

function cleanup(): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = TEMP_DB + ext
    if (existsSync(p)) rmSync(p)
  }
}

test('missingRequired names the required inputs a request left out', () => {
  assert.deepEqual(missingRequired(healthAgent.inputs, new URLSearchParams('')), ['account'])
  assert.deepEqual(missingRequired(healthAgent.inputs, new URLSearchParams('account=0xabc')), [])
})

test('requestHashOf is deterministic and independent of param order', () => {
  const a = requestHashOf(new URLSearchParams('limit=5&account=0xabc'))
  const b = requestHashOf(new URLSearchParams('account=0xabc&limit=5'))
  assert.equal(a, b)
  assert.match(a, /^0x[0-9a-f]{64}$/)
})

test('a completed job carries the result and a responseHash that recomputes', () => {
  const result = { healthFactor: 1.42, atBlock: 120000000 }
  const rec = completedJob({
    shelf: 'health-factor',
    skillId: 'health-factor.read',
    params: new URLSearchParams('account=0xabc'),
    result,
    inputsAsOfBlock: 120000000,
    paymentTx: '0xtx',
  })
  assert.equal(rec.state, 'completed')
  assert.equal(rec.terminalState, 'completed')
  assert.equal(rec.deliverableRule, 'keccakCanonical')
  assert.equal(rec.responseHash, responseHash(result))
  assert.equal(rec.paymentState, 'settled')
})

test('store then read round-trips the result and the hash', () => {
  cleanup()
  const result = { rows: [{ apy: 3.1 }], count: 1, readAt: 1 }
  const rec = completedJob({
    shelf: 'yield',
    skillId: 'yield.rank',
    params: new URLSearchParams('limit=1'),
    result,
    inputsAsOfBlock: null,
    paymentTx: '0xdead',
  })
  storeJob(rec)
  const back = readJob(rec.jobId)
  assert.ok(back)
  assert.deepEqual(back!.result, result)
  assert.equal(back!.responseHash, rec.responseHash)
  assert.equal(back!.responseHash, responseHash(back!.result))
  assert.equal(readJob('job_does_not_exist'), null)
  cleanup()
})

test('a refusal is terminal, coded and carries no result', () => {
  const rec = refusedJob({
    shelf: 'health-factor',
    skillId: 'health-factor.read',
    params: new URLSearchParams(''),
    code: 'inputUnsupported',
    chargedBase: '0',
    paymentTx: null,
  })
  assert.equal(rec.state, 'refused')
  assert.equal(rec.result, null)
  assert.equal(rec.responseHash, null)
  const body = jobResource(rec)
  assert.equal((body.refusal as Record<string, unknown>).code, 'inputUnsupported')
  assert.equal((body.refusal as Record<string, unknown>).chargedBase, '0')
})

test('the terminal poll body carries the deliverable, the rule and the hash together', () => {
  const result = { plan: { levels: 8 }, readAt: 2 }
  const rec = completedJob({
    shelf: 'grid-trading',
    skillId: 'grid-trading.plan',
    params: new URLSearchParams('levels=8'),
    result,
    inputsAsOfBlock: null,
    paymentTx: '0xabc',
  })
  const body = jobResource(rec)
  assert.equal(body.state, 'completed')
  assert.deepEqual(body.result, result)
  assert.equal(body.deliverableRule, 'keccakCanonical')
  assert.equal(body.responseHash, rec.responseHash)
  assert.ok(typeof body.computedAt === 'string')
})

test('blockOf reads atBlock from a chain-derived result, null otherwise', () => {
  assert.equal(blockOf({ atBlock: 42 }), 42)
  assert.equal(blockOf({ readAt: 1 }), null)
  assert.equal(blockOf(null), null)
})
