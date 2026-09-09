/**
 * The matcher, the part of docs/07-MATCHING.md that ranks feasible listings and picks one.
 *
 * This file owns two functions over the same six terms, kept separate on purpose. `rankTerms`
 * scores one candidate and takes an ownerless projection: it has no `owner` and no `firstParty`
 * field, so a first-party bonus is not policed here, it is unrepresentable (section 10.1 rule 1).
 * `rankListings` sorts a set, applying the two published partitions and the tie-break ladder,
 * and only the tie-break reads first-party, where it can only ever cost us a dispatch (rule 2).
 *
 * The weight vector is published in full as `rank-1.0.0`, coefficients included, because a
 * published vector is what makes the anti-favouritism audit something a stranger runs rather
 * than something we assert. Nothing here reads a buyer's holdings, positions or risk profile:
 * the ranking criteria are published for everyone rather than tuned per person, which is the
 * compliance boundary section 2 draws.
 */
import type { EvidenceRung, Shelf } from './types.ts'

export const RANKING_VERSION = 'rank-1.0.0'

/** The published weight vector. Sums to 1. Section 3. */
export const WEIGHTS = {
  /** delivered quality, settled jobs only, 06-QUALITY.md owns the number */
  Q: 0.3,
  /** measured reliability, our own probe passes, Wilson lower bound */
  R: 0.25,
  /** category contract fit */
  C: 0.15,
  /** price value against the category median */
  P: 0.15,
  /** evidence freshness, probe age */
  F: 0.1,
  /** evidence tier */
  E: 0.05,
} as const

/** F's time constant, seconds. The staleness gate sits at the same value. Section 3. */
export const FRESHNESS_TAU_SECONDS = 900
/** Q with no settled job. 06-QUALITY.md returns 23.7 of 100 at N = 0. Section 9.2. */
export const Q_PRIOR = 0.237

/**
 * The evidence tier term. SPINE's E0 to E4 ladder mapped onto the six shipped rungs. `reachable`
 * and `probed` both sit at E2 (0.50) because neither exposes a readable spend session, which is
 * what E4 rewards. Documented rather than derived so the panel can name the mapping.
 */
const E_BY_RUNG: Record<EvidenceRung, number> = {
  registered: 0.0,
  declared: 0.25,
  reachable: 0.5,
  probed: 0.5,
  payable: 0.75,
  settled: 1.0,
}

/**
 * The lower bound of the Wilson score interval, z = 1.96 for 95 percent, 0 when n == 0.
 * Section 3 pins the reference values: 45 of 50 scores 0.7864, 900 of 1000 scores 0.8798.
 */
export function wilsonLower(pos: number, n: number, z = 1.96): number {
  if (n <= 0) return 0
  const p = pos / n
  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n)
}

/**
 * One candidate, projected for ranking. No `owner` and no `firstParty`: the ranker cannot read
 * them, which is section 10.1 rule 1 enforced by the type rather than by discipline.
 */
export interface RankCandidate {
  listingId: string
  agentId: string
  category: Shelf
  evidenceTier: EvidenceRung
  /** 06-QUALITY.md's scoreLowerBound on a 0 to 100 scale, or null when no settled job exists. */
  scoreLowerBound: number | null
  /** settled-job count the score was computed at, for the tie-break. */
  scoreSampleSize: number
  /** probe passes and total over the last 24 hours, from our own prober. */
  probePass24h: number
  probeTotal24h: number
  /** fraction of conformance assertions passing at the current contractVersion. 1 outside a bump. */
  conformanceFraction: number
  priceBase: string | null
  priceToken: string | null
  priceDecimals: number | null
  lastProbeAt: number | null
  /** true when a probe failed inside the last 30 seconds. Sorts after every non-demoted row. */
  demoted: boolean
}

export interface RankTerms {
  Q: number
  R: number
  C: number
  P: number
  F: number
  E: number
  rank: number
}

/**
 * The C signal, from what the data can answer rather than from a claim. A row that answered a
 * probe matching its declared contract produces the contract's outputs, so coverage rises with
 * the rung. Documented and deterministic. A conformance suite (03-TAXONOMY.md) would replace this
 * with the exact optional-output fraction, which is why the multiplier is carried through R.
 */
function coverageFromRung(rung: EvidenceRung): number {
  switch (rung) {
    case 'settled':
    case 'payable':
      return 1.0
    case 'probed':
      return 0.75
    case 'reachable':
      return 0.5
    case 'declared':
      return 0.25
    default:
      return 0.0
  }
}

/**
 * Score one candidate against the category's median eligible price. Pure. No owner, no
 * first-party, no buyer. `nowMs` is passed rather than read so the function is deterministic and
 * testable.
 */
export function rankTerms(c: RankCandidate, medianPriceBase: string | null, nowMs: number): RankTerms {
  const Q = c.scoreLowerBound === null ? Q_PRIOR : Math.max(0, Math.min(1, c.scoreLowerBound / 100))
  const R = wilsonLower(c.probePass24h, c.probeTotal24h) * Math.max(0, Math.min(1, c.conformanceFraction))
  const C = coverageFromRung(c.evidenceTier)
  // P is scale free: 1 / (1 + p / median). A free listing scores 1, the median scores 0.5.
  let P = 0.5
  if (c.priceBase !== null && medianPriceBase !== null) {
    const median = Number(medianPriceBase)
    const price = Number(c.priceBase)
    P = median > 0 ? 1 / (1 + price / median) : 1
  }
  // F = exp(-age / tau). Bounded to (0.368, 1] for any row inside the 900 s staleness gate.
  let F = 0
  if (c.lastProbeAt !== null) {
    const ageSeconds = Math.max(0, (nowMs - c.lastProbeAt) / 1000)
    F = Math.exp(-ageSeconds / FRESHNESS_TAU_SECONDS)
  }
  const E = E_BY_RUNG[c.evidenceTier]
  const rank = WEIGHTS.Q * Q + WEIGHTS.R * R + WEIGHTS.C * C + WEIGHTS.P * P + WEIGHTS.F * F + WEIGHTS.E * E
  return { Q, R, C, P, F, E, rank }
}

/** The median of a numeric list, or null on an empty list. Even count takes the lower middle. */
function medianBase(values: string[]): string | null {
  if (values.length === 0) return null
  const sorted = [...values].map((v) => BigInt(v)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const mid = Math.floor((sorted.length - 1) / 2)
  return sorted[mid]!.toString()
}

/**
 * The FNV-1a 64-bit hash of a string, used for the last tie-break key. keccak256 is not in the
 * dependency set (no new packages), and the tie-break only needs a deterministic per-intent
 * ordering that no listing can inherit across intents, which a salted FNV over `agentId|intentHash`
 * gives. Section 3's guarantee that it is stable inside one intent and unstable across intents holds.
 */
function fnv1a64(s: string): bigint {
  let h = 0xcbf29ce484222325n
  const mask = 0xffffffffffffffffn
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i))
    h = (h * 0x100000001b3n) & mask
  }
  return h
}

export interface RankedCandidate extends RankTerms {
  listingId: string
  agentId: string
  firstParty: boolean
  demoted: boolean
}

export interface RankResult {
  version: string
  medianPriceBase: string | null
  /** In rank order, non-demoted first, then demoted, with the published tie-break applied. */
  ranked: RankedCandidate[]
}

/**
 * Rank a feasible set. Two partitions before sorting: every non-demoted candidate, then every
 * demoted one, so a demoted row sorts after every non-demoted row whatever its rank (section 3).
 * Ties within 1e-6 break on: the third-party candidate ahead of ours (rule 2, the tie-break runs
 * against us), then lower price, then larger sample size, then the salted per-intent hash.
 */
export function rankListings(
  candidates: (RankCandidate & { firstParty: boolean })[],
  opts: { nowMs: number; intentHash: string },
): RankResult {
  const priced = candidates.filter((c) => c.priceBase !== null).map((c) => c.priceBase!)
  const median = medianBase(priced)
  const scored: RankedCandidate[] = candidates.map((c) => ({
    ...rankTerms(c, median, opts.nowMs),
    listingId: c.listingId,
    agentId: c.agentId,
    firstParty: c.firstParty,
    demoted: c.demoted,
  }))
  const priceOf = new Map(candidates.map((c) => [c.listingId, c.priceBase]))
  const sampleOf = new Map(candidates.map((c) => [c.listingId, c.scoreSampleSize]))
  scored.sort((a, b) => {
    if (a.demoted !== b.demoted) return a.demoted ? 1 : -1
    if (Math.abs(a.rank - b.rank) > 1e-6) return b.rank - a.rank
    // Tie-break 1: a third-party candidate wins a tie against a first-party one.
    if (a.firstParty !== b.firstParty) return a.firstParty ? 1 : -1
    // Tie-break 2: lower price wins.
    const pa = priceOf.get(a.listingId)
    const pb = priceOf.get(b.listingId)
    if (pa !== null && pa !== undefined && pb !== null && pb !== undefined && pa !== pb) {
      return BigInt(pa) < BigInt(pb) ? -1 : 1
    }
    // Tie-break 3: larger sample size wins.
    const sa = sampleOf.get(a.listingId) ?? 0
    const sb = sampleOf.get(b.listingId) ?? 0
    if (sa !== sb) return sb - sa
    // Tie-break 4: the salted per-intent hash, lower wins.
    const ha = fnv1a64(`${a.agentId}|${opts.intentHash}`)
    const hb = fnv1a64(`${b.agentId}|${opts.intentHash}`)
    return ha < hb ? -1 : ha > hb ? 1 : 0
  })
  return { version: RANKING_VERSION, medianPriceBase: median, ranked: scored }
}
