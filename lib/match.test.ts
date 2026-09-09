/**
 * Pins the published ranking function. No network. The fixture rows carry the shapes real
 * listing rows carry in the store (a decimal agentId, a base-unit price string, a probe pass
 * count, an evidence rung), so a change that breaks the order or the arithmetic fails here.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  WEIGHTS,
  RANKING_VERSION,
  Q_PRIOR,
  wilsonLower,
  rankTerms,
  rankListings,
  type RankCandidate,
} from './match.ts'

test('the weight vector sums to 1 and is rank-1.0.0', () => {
  const sum = WEIGHTS.Q + WEIGHTS.R + WEIGHTS.C + WEIGHTS.P + WEIGHTS.F + WEIGHTS.E
  assert.equal(Math.abs(sum - 1) < 1e-12, true)
  assert.equal(RANKING_VERSION, 'rank-1.0.0')
})

test('wilsonLower reproduces the reference values in section 3', () => {
  assert.equal(wilsonLower(0, 0), 0)
  assert.ok(Math.abs(wilsonLower(2, 2) - 0.3424) < 5e-4)
  assert.ok(Math.abs(wilsonLower(45, 50) - 0.7864) < 5e-4)
  assert.ok(Math.abs(wilsonLower(900, 1000) - 0.8798) < 5e-4)
  // p = 1 collapses to 1/(1 + z^2/n), so a clean record still pays for its sample size.
  assert.ok(wilsonLower(40, 40) > wilsonLower(2, 2))
})

const NOW = 1_788_880_000_000

/** A real-shaped candidate. Overrides let each test set only what it exercises. */
function candidate(over: Partial<RankCandidate & { firstParty: boolean }> = {}): RankCandidate & { firstParty: boolean } {
  return {
    listingId: '56:265375:health-factor',
    agentId: '265375',
    category: 'health-factor',
    evidenceTier: 'payable',
    scoreLowerBound: null,
    scoreSampleSize: 0,
    probePass24h: 4,
    probeTotal24h: 4,
    conformanceFraction: 1,
    priceBase: '20000000000000000',
    priceToken: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
    priceDecimals: 18,
    lastProbeAt: NOW - 40_000,
    demoted: false,
    firstParty: false,
    ...over,
  }
}

test('rankTerms is the weighted sum of its six terms, nothing else', () => {
  const c = candidate()
  const t = rankTerms(c, c.priceBase, NOW)
  const recomputed =
    WEIGHTS.Q * t.Q + WEIGHTS.R * t.R + WEIGHTS.C * t.C + WEIGHTS.P * t.P + WEIGHTS.F * t.F + WEIGHTS.E * t.E
  assert.ok(Math.abs(t.rank - recomputed) < 1e-12)
})

test('Q enters at the published prior when no settled job exists', () => {
  const t = rankTerms(candidate({ scoreLowerBound: null }), '20000000000000000', NOW)
  assert.equal(t.Q, Q_PRIOR)
})

test('Q is the lower bound over 100 when a settled score exists', () => {
  const t = rankTerms(candidate({ scoreLowerBound: 62 }), '20000000000000000', NOW)
  assert.ok(Math.abs(t.Q - 0.62) < 1e-12)
})

test('P is 0.5 at the median and 1.0 for a free listing, scale free', () => {
  const atMedian = rankTerms(candidate({ priceBase: '20000000000000000' }), '20000000000000000', NOW)
  assert.ok(Math.abs(atMedian.P - 0.5) < 1e-12)
  const free = rankTerms(candidate({ priceBase: '0' }), '20000000000000000', NOW)
  assert.ok(Math.abs(free.P - 1) < 1e-12)
  const dear = rankTerms(candidate({ priceBase: '60000000000000000' }), '20000000000000000', NOW)
  assert.ok(Math.abs(dear.P - 0.25) < 1e-12) // three times the median scores 0.25
})

test('F is exp(-age/900): 1 at age 0, 0.9565 at 40 s', () => {
  const fresh = rankTerms(candidate({ lastProbeAt: NOW }), '20000000000000000', NOW)
  assert.ok(Math.abs(fresh.F - 1) < 1e-12)
  const aged = rankTerms(candidate({ lastProbeAt: NOW - 40_000 }), '20000000000000000', NOW)
  assert.ok(Math.abs(aged.F - 0.9565) < 5e-4)
})

test('the ranker carries no first-party term: flipping firstParty leaves rank identical', () => {
  const base = candidate({ firstParty: false })
  const ours = candidate({ firstParty: true })
  const a = rankTerms(base, base.priceBase, NOW)
  const b = rankTerms(ours, ours.priceBase, NOW)
  assert.equal(a.rank, b.rank)
})

test('rankListings orders a three-row fixture and returns the version', () => {
  const rows = [
    candidate({ listingId: '56:1:x', agentId: '1', evidenceTier: 'reachable', scoreLowerBound: 32, probePass24h: 40, probeTotal24h: 40, priceBase: '40000000000000000', lastProbeAt: NOW - 20_000 }),
    candidate({ listingId: '56:2:x', agentId: '2', evidenceTier: 'settled', scoreLowerBound: 62, probePass24h: 96, probeTotal24h: 98, priceBase: '25000000000000000', lastProbeAt: NOW - 40_000 }),
    candidate({ listingId: '56:3:x', agentId: '3', evidenceTier: 'probed', scoreLowerBound: 58, probePass24h: 71, probeTotal24h: 74, priceBase: '18000000000000000', lastProbeAt: NOW - 190_000 }),
  ]
  const out = rankListings(rows, { nowMs: NOW, intentHash: 'abc' })
  assert.equal(out.version, 'rank-1.0.0')
  // The settled, high-quality, well-probed row wins. The two-job reachable row is last.
  assert.deepEqual(out.ranked.map((r) => r.agentId), ['2', '3', '1'])
  assert.ok(out.ranked[0]!.rank > out.ranked[1]!.rank)
})

test('a tie breaks against us: the third-party row sorts ahead of ours', () => {
  const ours = candidate({ listingId: '56:900000001:x', agentId: '900000001', firstParty: true })
  const theirs = candidate({ listingId: '56:5:x', agentId: '5', firstParty: false })
  const out = rankListings([ours, theirs], { nowMs: NOW, intentHash: 'seed' })
  // Same term inputs, so ranks are equal within 1e-6 and the tie-break decides.
  assert.ok(Math.abs(out.ranked[0]!.rank - out.ranked[1]!.rank) < 1e-6)
  assert.equal(out.ranked[0]!.firstParty, false)
  assert.equal(out.ranked[0]!.agentId, '5')
})

test('a demoted row sorts after every non-demoted row whatever its rank', () => {
  const strongDemoted = candidate({ listingId: '56:9:x', agentId: '9', evidenceTier: 'settled', scoreLowerBound: 99, probePass24h: 100, probeTotal24h: 100, demoted: true })
  const weakLive = candidate({ listingId: '56:8:x', agentId: '8', evidenceTier: 'declared', scoreLowerBound: null, probePass24h: 1, probeTotal24h: 4, demoted: false })
  const out = rankListings([strongDemoted, weakLive], { nowMs: NOW, intentHash: 'seed' })
  assert.equal(out.ranked[0]!.agentId, '8')
  assert.equal(out.ranked[1]!.agentId, '9')
  assert.ok(out.ranked[1]!.rank > out.ranked[0]!.rank) // higher rank, still last, because demoted
})
