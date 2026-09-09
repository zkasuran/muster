/**
 * The conformance report, docs/04-AGENT-PROTOCOL.md section 10, tested with no network and no store.
 * The load-bearing assertion is that all four reference agents pass every required-route check, which
 * is the claim their pages make. Each checker is also driven with a broken document so its refusal
 * names the right thing, because a report that only ever passes proves nothing.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  conformanceReport,
  checkCard,
  checkManifest,
  checkRegistration,
  checkSchema,
  checkHealth,
} from './conformance.ts'
import { musterCard, manifest, registrationDocument, schemaDoc, healthDoc } from './protocol.ts'
import { SHELVES } from './constants.ts'

const ORIGIN = 'https://muster.zkasuran.dev'
const PAY_TO = '0x1111111111111111111111111111111111111111'

for (const shelf of SHELVES) {
  test(`${shelf}: passes every required-route conformance check`, () => {
    const report = conformanceReport(shelf, { origin: ORIGIN, payTo: PAY_TO })
    const failed = report.results.filter((r) => !r.present)
    assert.equal(failed.length, 0, `failed: ${failed.map((f) => `${f.route.path} (${f.reason})`).join('; ')}`)
    assert.equal(report.passed, report.total)
    assert.equal(report.total, 7)
    for (const r of report.results) assert.ok(r.reason.length > 0, `${r.route.path} has no reason`)
  })
}

test('a card whose hash was tampered fails the card check by name', () => {
  const card = musterCard('yield', { origin: ORIGIN, payTo: PAY_TO })
  assert.equal(checkCard(card).ok, true)
  const tampered = { ...card, cardHash: '0x' + '0'.repeat(64) }
  const check = checkCard(tampered)
  assert.equal(check.ok, false)
  assert.match(check.reason, /cardHash/)
})

test('a card missing a skill field fails the card check', () => {
  const card = musterCard('yield', { origin: ORIGIN, payTo: PAY_TO })
  const skills = (card.skills as Record<string, unknown>[]).map((s) => {
    const copy = { ...s }
    delete copy.freshness
    return copy
  })
  // Rebuild without recomputing the hash, which is fine: the missing-field check fires first.
  const broken = { ...card, skills }
  assert.equal(checkCard(broken).ok, false)
})

test('a manifest that disagrees with the card on price fails', () => {
  const card = musterCard('grid-trading', { origin: ORIGIN, payTo: PAY_TO })
  const man = manifest('grid-trading', {
    origin: ORIGIN,
    freshness: { block: 1, observedAt: 'now', source: 'x' },
  })
  assert.equal(checkManifest(card, man).ok, true)
  const skills = (man.skills as Record<string, unknown>[]).map((s) => ({ ...s, priceBase: '999' }))
  assert.equal(checkManifest(card, { ...man, skills }).ok, false)
})

test('a registration with no services fails, and one that classifies elsewhere fails', () => {
  const reg = registrationDocument('health-factor', { origin: ORIGIN })
  assert.equal(checkRegistration('health-factor', reg).ok, true)
  assert.equal(checkRegistration('health-factor', { ...reg, services: [] }).ok, false)
  // The right skills on the wrong shelf: health-factor skills do not classify as yield.
  assert.equal(checkRegistration('yield', reg).ok, false)
})

test('the schema and health checks fail when their document is stripped', () => {
  const schema = schemaDoc('rebalancing', { origin: ORIGIN })
  assert.equal(checkSchema(schema).ok, true)
  assert.equal(checkSchema({ skills: [{}] }).ok, false)
  const health = healthDoc('rebalancing', { checkedAt: 'now', rpcOk: true, rpcLatencyMs: 1 })
  assert.equal(checkHealth(health).ok, true)
  assert.equal(checkHealth({ dependencies: [] }).ok, false)
})
