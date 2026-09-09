/**
 * Pins docs/06-QUALITY.md section 2. No network, no store: every fixture is built in the test.
 *
 * Three things are pinned. The DELIVERY score reproduces the document's own worked-example table
 * (the number, the interval and the per-buyer cap), so a change to the arithmetic fails here against
 * the published numbers a judge can read. The EVIDENCE-readiness score is pinned on a fixture and a
 * recompute at the same pinned time reproduces it byte for byte, which is the "a stranger can
 * recompute it" property stated as a test. The foreign-feedback interval is pinned including the
 * out-of-range case the document warns about.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SCORE_CONSTANTS,
  MU_C_CLAMP,
  computeScore,
  computeEvidenceScore,
  feedbackInterval,
  categoryBaseline,
  wilsonInterval,
  decayFactor,
  MAX_RUNG_STEPS,
  type CountedJob,
} from './score.ts'

const ASOF = 1_760_000_000_000
const near = (a: number, b: number, tol = 0.15) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`)

/** Clean delivered jobs, all fresh (terminalAt = ASOF so d = 1) and attested, spread over buyers. */
function cleanJobs(perBuyer: number[]): CountedJob[] {
  const jobs: CountedJob[] = []
  perBuyer.forEach((n, b) => {
    for (let i = 0; i < n; i++) {
      jobs.push({ jobId: `b${b}-j${i}`, buyerCluster: `b${b}`, priceBase: 1, terminalAt: ASOF, delivered: 1, buyerTier: 'attested' })
    }
  })
  return jobs
}

test('the eight constants are the published values', () => {
  assert.equal(SCORE_CONSTANTS.mu0.value, 0.5)
  assert.equal(SCORE_CONSTANTS.m.value, 10)
  assert.equal(SCORE_CONSTANTS.H.value, 30)
  assert.equal(SCORE_CONSTANTS.C.value, 3)
  assert.equal(SCORE_CONSTANTS.betaAttested.value, 1.0)
  assert.equal(SCORE_CONSTANTS.betaFresh.value, 0.35)
  assert.equal(SCORE_CONSTANTS.k.value, 20)
  assert.equal(SCORE_CONSTANTS.z.value, 1.96)
  assert.deepEqual(MU_C_CLAMP, { lo: 0.4, hi: 0.9 })
})

test('the category baseline is mu_0 with no history and clamps to its band', () => {
  assert.equal(categoryBaseline(0, 0), 0.5)
  // A run of clean jobs cannot push the baseline past the upper clamp.
  assert.equal(categoryBaseline(1000, 1000), MU_C_CLAMP.hi)
  assert.equal(categoryBaseline(0, 1000), MU_C_CLAMP.lo)
})

test('delivery score: the document worked-example table, w_j = 1 launch rule', () => {
  const mu = 0.5
  // no settled job -> 50.0, interval 23.7 to 76.3, the cold-start card.
  const zero = computeScore({ jobs: [], muC: mu, aC: null, asOf: ASOF })
  near(zero.mScore, 50.0)
  near(zero.mLo, 23.7)
  near(zero.mHi, 76.3)
  assert.equal(zero.state, 'no-record')
  assert.equal(zero.sampleSize, 0)

  // 12 clean jobs, one buyer -> N = 3.000, M = 61.5, interval floor 35.5, the cap binds.
  const one = computeScore({ jobs: cleanJobs([12]), muC: mu, aC: null, asOf: ASOF })
  near(one.nEff, 3.0)
  near(one.mScore, 61.5)
  near(one.mLo, 35.5)
  assert.equal(one.distinctBuyers, 1)

  // 20 clean jobs, 7 buyers, none over the cap -> N = 20, M = 83.3, floor 66.4.
  const seven = computeScore({ jobs: cleanJobs([3, 3, 3, 3, 3, 3, 2]), muC: mu, aC: null, asOf: ASOF })
  near(seven.nEff, 20.0)
  near(seven.mScore, 83.3)
  near(seven.mLo, 66.4)

  // 200 clean, many buyers under the cap -> M = 97.6, floor 94.5.
  const many = computeScore({ jobs: cleanJobs([...Array(66).fill(3), 2]), muC: mu, aC: null, asOf: ASOF })
  near(many.nEff, 200.0)
  near(many.mScore, 97.6)
  near(many.mLo, 94.5)
})

test('delivery score: fresh anonymous buyers weigh less than attested ones, same jobs', () => {
  const attested = computeScore({ jobs: cleanJobs([3, 3, 3, 3, 3, 3, 2]), muC: 0.5, aC: null, asOf: ASOF })
  const fresh: CountedJob[] = cleanJobs([3, 3, 3, 3, 3, 3, 2]).map((j) => ({ ...j, buyerTier: 'fresh' }))
  const freshScore = computeScore({ jobs: fresh, muC: 0.5, aC: null, asOf: ASOF })
  assert.ok(freshScore.mScore < attested.mScore, `${freshScore.mScore} should be below ${attested.mScore}`)
})

test('delivery score: one buyer cannot pass the single-cluster ceiling', () => {
  // Section 6.2: a single attested cluster tops out near 61.5 no matter how many jobs it buys.
  const huge = computeScore({ jobs: cleanJobs([500]), muC: 0.5, aC: null, asOf: ASOF })
  near(huge.nEff, 3.0)
  near(huge.mScore, 61.5)
})

test('delivery score: decay converges to the baseline, never to zero', () => {
  const old: CountedJob[] = cleanJobs([3, 3, 3, 3, 3, 3, 2]).map((j) => ({ ...j, terminalAt: ASOF - 3650 * 86_400_000 }))
  const s = computeScore({ jobs: old, muC: 0.5, aC: null, asOf: ASOF })
  near(s.mScore, 50.0, 0.5)
  assert.equal(s.state, 'stale-record')
})

test('evidence score: monotone up the ladder for a fresh unique row with no feedback', () => {
  const base = { lastProbeAt: ASOF, updatedAt: ASOF, distinctAuthors: 0, clusterSize: 1, firstParty: false, asOf: ASOF } as const
  const reg = computeEvidenceScore({ ...base, rung: 'registered' })
  const dec = computeEvidenceScore({ ...base, rung: 'declared' })
  const rea = computeEvidenceScore({ ...base, rung: 'reachable' })
  const pro = computeEvidenceScore({ ...base, rung: 'probed' })
  const pay = computeEvidenceScore({ ...base, rung: 'payable' })
  const set = computeEvidenceScore({ ...base, rung: 'settled' })
  const vals = [reg, dec, rea, pro, pay, set].map((r) => r.scoreValue)
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i]! > vals[i - 1]!, `rung ${i} ${vals[i]} not above ${vals[i - 1]}`)
  // Pinned points: fresh, unique, no feedback.
  near(reg.scoreValue, 33.3)
  near(pay.scoreValue, 60.0)
  near(set.scoreValue, 66.7)
  assert.equal(pay.rungsCleared, 4)
  assert.equal(pay.maxRungSteps, MAX_RUNG_STEPS)
  assert.equal(pay.decay, 1)
  // Every listing gets a real number, so scoreValue is never a zero standing in for unknown.
  assert.ok(reg.scoreValue > 0)
})

test('evidence score: a duplicate registration scores below the same rung when unique', () => {
  const common = { rung: 'payable', lastProbeAt: ASOF, updatedAt: ASOF, distinctAuthors: 0, firstParty: false, asOf: ASOF } as const
  const unique = computeEvidenceScore({ ...common, clusterSize: 1 })
  const dup = computeEvidenceScore({ ...common, clusterSize: 10 })
  assert.ok(dup.scoreValue < unique.scoreValue, `${dup.scoreValue} not below ${unique.scoreValue}`)
  assert.ok(dup.dupFactor < 1)
})

test('evidence score: independent authors tighten the interval and are capped at C', () => {
  const common = { rung: 'payable', lastProbeAt: ASOF, updatedAt: ASOF, clusterSize: 1, firstParty: false, asOf: ASOF } as const
  const none = computeEvidenceScore({ ...common, distinctAuthors: 0 })
  const three = computeEvidenceScore({ ...common, distinctAuthors: 3 })
  const fifty = computeEvidenceScore({ ...common, distinctAuthors: 50 })
  // More independent authors -> a higher confidence floor (tighter interval, less shrinkage).
  assert.ok(three.scoreConfidence > none.scoreConfidence)
  // Raw feedback count is ignored: the cap at C = 3 means 3 and 50 authors count the same.
  assert.equal(three.authorsCounted, 3)
  assert.equal(fifty.authorsCounted, 3)
  assert.equal(three.scoreValue, fifty.scoreValue)
})

test('evidence score: stale evidence drifts to the baseline, never to zero', () => {
  const s = computeEvidenceScore({ rung: 'settled', lastProbeAt: ASOF - 3650 * 86_400_000, updatedAt: ASOF - 3650 * 86_400_000, distinctAuthors: 0, clusterSize: 1, firstParty: false, asOf: ASOF })
  near(s.scoreValue, 50.0, 0.5)
})

test('evidence score: a recompute at the same pinned time reproduces it exactly', () => {
  const input = { rung: 'probed', lastProbeAt: ASOF - 3 * 86_400_000, updatedAt: ASOF - 3 * 86_400_000, distinctAuthors: 4, clusterSize: 1, firstParty: false, asOf: ASOF } as const
  const a = computeEvidenceScore({ ...input })
  const b = computeEvidenceScore({ ...input })
  assert.deepEqual(a, b)
  // And the pieces re-derive the point estimate: pHat maps to scoreValue.
  near(a.scoreValue, Math.round(100 * a.pHat * 10) / 10, 1e-9)
})

test('feedback interval: a Wilson band on the value with distinct authors as n', () => {
  // 13 distinct authors, aggregate value 75 of 100.
  const f = feedbackInterval(75, 0, 13, 193)
  assert.equal(f.humanValue, 75)
  assert.equal(f.scaleResolved, true)
  assert.equal(f.distinctAuthors, 13)
  assert.equal(f.totalFeedbacks, 193)
  near(f.lo, 47.8)
  near(f.hi, 90.7)
  // A single author gives an interval so wide it says nothing, which is the point.
  const one = feedbackInterval(88, 0, 1, 1)
  assert.ok(one.hi - one.lo > 80)
  // getSummary can return a value outside 0..100 (modal-decimals truncation). It is not a percentage then.
  const bad = feedbackInterval(971, 0, 3, 7)
  assert.equal(bad.scaleResolved, false)
  assert.equal(bad.humanValue, 971)
})

test('shared Wilson helper matches its published reference points', () => {
  // Section 2 table: n = 0 -> 23.7 lower on a 0.5 shrunk proportion at posteriorN 10.
  const at10 = wilsonInterval(0.5, 10)
  near(100 * at10.lo, 23.7)
  near(100 * at10.hi, 76.3)
  assert.equal(decayFactor(30), 0.5) // one half-life halves the weight
})
