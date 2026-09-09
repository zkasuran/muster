/**
 * docs/06-QUALITY.md, the score math, as pure functions with no IO. The store reads real rows and
 * calls in here; the page publishes the constants from here; the test pins the worked examples from
 * here. One definition, three readers.
 *
 * Two scores live here and they are never blended (section 0, "two numbers"):
 *
 *   1. computeScore  is the Muster DELIVERY score of section 2. It answers "of the paid jobs a buyer
 *      settled through Muster, what share were delivered", weighted by size, decayed by age, capped
 *      per buyer, shrunk toward the category baseline, with a Wilson interval on the shrunk counts.
 *      Only a settled paid job with origin = order moves it. On 2026-09-09 the counted set is empty
 *      for every listing, so the real delivery score is the cold-start case for all of them:
 *      M = mu_c = 50, provisional (n=0), the number suppressed on the card.
 *
 *   2. computeEvidenceScore is the EVIDENCE-READINESS score. It is not the delivery score and is
 *      never presented as one. Because no listing has a settled order-job yet, the delivery score
 *      carries no information between listings, so it cannot fill the scoreValue/scoreConfidence
 *      columns with anything a buyer can use. What we CAN measure today is how far up the six-rung
 *      evidence ladder a listing has climbed, how fresh that check is, whether the registration is a
 *      duplicate and how many independent parties left on-chain feedback. This score reuses the same
 *      published machinery the delivery score uses: shrinkage toward mu_0 = 0.50, decay by half-life
 *      H and a Wilson interval, so a stranger recomputes it the same way. It is what worker/score.ts
 *      writes to listing.scoreValue (point estimate) and listing.scoreConfidence (Wilson lower bound).
 *
 * Foreign ERC-8004 feedback (section 4 "F5") is displayed always and trusted nowhere: feedbackInterval
 * puts a Wilson interval on the aggregate feedback value with the distinct-author count as the sample
 * size, never a star and never a hidden average. Its weight in either score is capped and gated on the
 * distinct-author count, because a whole-chain sweep found 111 addresses wrote all 29,712 feedbacks.
 */

import { EVIDENCE_ORDER, type EvidenceRung } from './types.ts'

/** One counted job: settled payment, origin = order, on this listing. Section 2 symbols. */
export interface CountedJob {
  jobId: string
  /** The buyer cluster id from section 6.2. A lone address is a cluster of one. */
  buyerCluster: string
  /** a_j, the job price in base units of the payment token. */
  priceBase: number
  /** terminalAt in ms, so age t_j = asOf - terminalAt. */
  terminalAt: number
  /** v_j: 1 delivered to contract, 0 not. Section 2 "what makes v_j a 1". */
  delivered: 0 | 1
  /**
   * The buyer's tier for beta_b: 'attested' holds an attestation or a settled job at least 7
   * days older than this one, 'fresh' otherwise. A cluster's beta_b is the minimum of its
   * members'.
   */
  buyerTier: 'attested' | 'fresh'
}

export interface ScoreInput {
  jobs: CountedJob[]
  /** mu_c, the shrunk category baseline in 0..1. Use categoryBaseline() to derive it. */
  muC: number
  /** a_c, the median counted price over the trailing 30 days (null before the launch count k). */
  aC: number | null
  /** now in ms, passed in so a recompute at a pinned time reproduces exactly. */
  asOf: number
}

export interface PerJob {
  jobId: string
  buyerCluster: string
  aJ: number
  /** w_j, plus which rule produced it. */
  wJ: number
  wJRule: 'priceRatio' | 'launchFallback'
  tDays: number
  dJ: number
  vJ: 0 | 1
  phiB: number
}

export interface ScoreResult {
  /** M, the point estimate in 0..100. Suppressed on the card when sampleSize is 0. */
  mScore: number
  /** M_lo, the Wilson lower bound in 0..100. This is the sort key, never M. */
  mLo: number
  /** M_hi, the Wilson upper bound in 0..100. */
  mHi: number
  /** Beta pseudo-counts, published so anyone can compute the exact quantile and disagree. */
  alpha: number
  beta: number
  /** N, effective sample size after capping. */
  nEff: number
  /** S, effective successes after capping. */
  sEff: number
  /** N + m. */
  posteriorN: number
  pHat: number
  /** Raw counted-job count, undecayed. The "n" a buyer reads. */
  sampleSize: number
  /** Distinct buyer clusters. The number a single-buyer record cannot inflate. */
  distinctBuyers: number
  /** Undecayed lifetime successes and total, kept beside the decayed figure per section 2. */
  lifetimeDelivered: number
  lifetimeTotal: number
  muC: number
  /** 'launchFallback' when any w_j fell back to 1 because a_c was undefined. */
  wJRule: 'priceRatio' | 'launchFallback' | 'mixed'
  /**
   * The knowledge state for the card. 'no-record' suppresses the number and shows
   * provisional (n=0). 'stale-record' stamps a record whose newest job is over two half-lives
   * old. 'scored' is the ordinary case.
   */
  state: 'no-record' | 'scored' | 'stale-record'
  perJob: PerJob[]
}

/**
 * The eight published constants, each with the reason it is that number. docs/06-QUALITY.md
 * section 2 "Constants" is the source and changing one is a human decision in the changelog.
 * The methodology page renders this object, so the page cannot drift from the math.
 */
export const SCORE_CONSTANTS = {
  mu0: {
    value: 0.5,
    symbol: 'mu_0',
    label: 'launch baseline',
    why: "The neighbouring venue on the same chain baselines a historyless agent at 50: TermiX's reputation contract returns getScore(1) = 50 for an agent with no settled history. 0.50 is anchored to a number anyone can read on chain rather than tuned.",
  },
  m: {
    value: 10,
    symbol: 'm',
    label: 'prior strength, effective jobs',
    why: 'The prior stops being the majority of the answer at 10 counted jobs. 10 is the smallest value that still kills the single-perfect-job attack: one perfect job scores 54.5, not 100.',
  },
  H: {
    value: 30,
    symbol: 'H',
    label: 'decay half-life, days',
    why: 'A policy constant, labelled as one. No measurement fixes it, so the undecayed lifetime figure is shown beside the decayed one and we never claim it was derived. The operator practice we can point at is Steam splitting a 30-day window from lifetime.',
  },
  C: {
    value: 3,
    symbol: 'C',
    label: 'per-buyer contribution cap, effective jobs',
    why: 'One buyer cannot make a listing look proven. This is the wash-trade defence as arithmetic rather than as detection. It needs no funding provenance to work.',
  },
  betaAttested: {
    value: 1.0,
    symbol: 'beta_b attested',
    label: 'buyer-tier multiplier, attested or returning',
    why: 'A cluster holding an attestation or with a settled job at least 7 days older than this one carries full weight.',
  },
  betaFresh: {
    value: 0.35,
    symbol: 'beta_b fresh',
    label: 'buyer-tier multiplier, fresh anonymous',
    why: 'Chosen so three fresh anonymous buyers weigh about one established buyer. 6 of 585 agent owners hold a BABT, so a gate on attestation removes the market; a weight keeps it and still rewards verification.',
  },
  k: {
    value: 20,
    symbol: 'k',
    label: 'category prior strength, effective jobs',
    why: 'The category baseline needs more evidence to move than a single listing does, so k is twice m. It is also the count at which a_c becomes a trustworthy denominator, so w_j falls back to 1 below it.',
  },
  z: {
    value: 1.96,
    symbol: 'z',
    label: 'interval constant, 95%',
    why: 'The published Wilson constant for a 95% interval, with z^2 = 3.8416.',
  },
} as const

/** The mu_c clamp band, section 2. One thin week cannot push a category to self-congratulation. */
export const MU_C_CLAMP = { lo: 0.4, hi: 0.9 } as const

/** lambda = ln(2) / H, per day. */
export const LAMBDA_PER_DAY = Math.LN2 / SCORE_CONSTANTS.H.value

const MS_PER_DAY = 86_400_000

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

/** Round to one decimal, so a stored score is stable across recomputes and reads the same on screen. */
export function round1(x: number): number {
  return Math.round(x * 10) / 10
}

/** d_j = exp(-lambda * t_j). */
export function decayFactor(tDays: number, halfLifeDays = SCORE_CONSTANTS.H.value): number {
  return Math.exp(-(Math.LN2 / halfLifeDays) * tDays)
}

/**
 * w_j = clamp(sqrt(a_j / a_c), 0.5, 2.0) when a_c is defined, else 1, the launch fallback.
 * Returns the value and which rule produced it, because score.json publishes that flag.
 */
export function sizeWeight(aJ: number, aC: number | null): { wJ: number; rule: 'priceRatio' | 'launchFallback' } {
  if (aC === null || !(aC > 0)) return { wJ: 1, rule: 'launchFallback' }
  return { wJ: clamp(Math.sqrt(aJ / aC), 0.5, 2.0), rule: 'priceRatio' }
}

/**
 * The Wilson interval on a proportion at effective sample size n, in its canonical published
 * form, evaluated on the shrunk pseudo-counts. Returns both ends in 0..1. One square root, so
 * it reproduces identically in any language a judge might use.
 */
export function wilsonInterval(pHat: number, n: number, z = SCORE_CONSTANTS.z.value): { lo: number; hi: number } {
  if (n <= 0) return { lo: 0, hi: 1 }
  const z2 = z * z
  const denom = 1 + z2 / n
  const centre = pHat + z2 / (2 * n)
  const half = z * Math.sqrt((pHat * (1 - pHat) + z2 / (4 * n)) / n)
  return { lo: (centre - half) / denom, hi: (centre + half) / denom }
}

/**
 * The category baseline, shrunk one level up so a category with no history cannot invent one:
 * mu_c = clamp((S_c + k * mu_0) / (N_c + k), 0.40, 0.90). At launch N_c = 0, so mu_c = mu_0 = 0.5.
 */
export function categoryBaseline(sumSuccess: number, sumTotal: number): number {
  const k = SCORE_CONSTANTS.k.value
  const mu0 = SCORE_CONSTANTS.mu0.value
  return clamp((sumSuccess + k * mu0) / (sumTotal + k), MU_C_CLAMP.lo, MU_C_CLAMP.hi)
}

/**
 * The whole DELIVERY score for one listing, from its counted jobs. Groups by buyer cluster, applies
 * the per-buyer cap and the buyer-tier multiplier, shrinks toward mu_c and puts a Wilson interval on
 * the shrunk counts. Every intermediate is returned per job, so score.json is this object.
 *
 * An empty job set is the launch case: N = 0, M = mu_c, state no-record, the number suppressed.
 */
export function computeScore(input: ScoreInput): ScoreResult {
  const { jobs, muC, aC, asOf } = input
  const m = SCORE_CONSTANTS.m.value
  const cap = SCORE_CONSTANTS.C.value
  const z = SCORE_CONSTANTS.z.value

  // Per job: size weight, decay and the raw contribution before capping.
  const perJob: PerJob[] = []
  const clusters = new Map<string, { rawN: number; rawS: number; tier: 'attested' | 'fresh' }>()
  let sawRatio = false
  let sawFallback = false
  let newestTerminal = 0
  for (const j of jobs) {
    const tDays = Math.max(0, (asOf - j.terminalAt) / MS_PER_DAY)
    const dJ = decayFactor(tDays)
    const { wJ, rule } = sizeWeight(j.priceBase, aC)
    if (rule === 'priceRatio') sawRatio = true
    else sawFallback = true
    const contribN = wJ * dJ
    const contribS = wJ * dJ * j.delivered
    const c = clusters.get(j.buyerCluster) ?? { rawN: 0, rawS: 0, tier: 'attested' as const }
    c.rawN += contribN
    c.rawS += contribS
    // A cluster's beta_b is the minimum of its members', so any fresh member makes it fresh.
    if (j.buyerTier === 'fresh') c.tier = 'fresh'
    clusters.set(j.buyerCluster, c)
    newestTerminal = Math.max(newestTerminal, j.terminalAt)
    perJob.push({ jobId: j.jobId, buyerCluster: j.buyerCluster, aJ: j.priceBase, wJ, wJRule: rule, tDays, dJ, vJ: j.delivered, phiB: 0 })
  }

  // Per cluster: phi_b = beta_b * min(1, C / rawN_b). Then sum to N and S.
  let nEff = 0
  let sEff = 0
  const phiByCluster = new Map<string, number>()
  for (const [id, c] of clusters) {
    const betaB = c.tier === 'attested' ? SCORE_CONSTANTS.betaAttested.value : SCORE_CONSTANTS.betaFresh.value
    const phiB = c.rawN > 0 ? betaB * Math.min(1, cap / c.rawN) : betaB
    phiByCluster.set(id, phiB)
    nEff += phiB * c.rawN
    sEff += phiB * c.rawS
  }
  for (const p of perJob) p.phiB = phiByCluster.get(p.buyerCluster) ?? 0

  const posteriorN = nEff + m
  const pHat = (sEff + m * muC) / posteriorN
  const alpha = m * muC + sEff
  const beta = m * (1 - muC) + (nEff - sEff)
  const w = wilsonInterval(pHat, posteriorN, z)

  const lifetimeDelivered = jobs.reduce((a, j) => a + j.delivered, 0)
  const lifetimeTotal = jobs.length
  const sampleSize = jobs.length
  const distinctBuyers = clusters.size

  const twoHalfLivesMs = 2 * SCORE_CONSTANTS.H.value * MS_PER_DAY
  let state: ScoreResult['state'] = 'scored'
  if (sampleSize === 0) state = 'no-record'
  else if (asOf - newestTerminal > twoHalfLivesMs) state = 'stale-record'

  const wJRule: ScoreResult['wJRule'] = sawRatio && sawFallback ? 'mixed' : sawRatio ? 'priceRatio' : 'launchFallback'

  return {
    mScore: 100 * pHat,
    mLo: 100 * w.lo,
    mHi: 100 * w.hi,
    alpha,
    beta,
    nEff,
    sEff,
    posteriorN,
    pHat,
    sampleSize,
    distinctBuyers,
    lifetimeDelivered,
    lifetimeTotal,
    muC,
    wJRule,
    state,
    perJob,
  }
}

// ---------------------------------------------------------------------------
// The evidence-readiness score. See the file header for why it exists and what it is not.
// ---------------------------------------------------------------------------

/** The number of rungs above `registered`, which is the ladder's denominator. */
export const MAX_RUNG_STEPS = EVIDENCE_ORDER.length - 1

/** Real rows for one listing, exactly what worker/score.ts reads from the store. */
export interface EvidenceInput {
  rung: EvidenceRung
  /** When the endpoint was last probed, ms. Drives the decay for third-party rows. */
  lastProbeAt: number | null
  /** When the listing row was last written, ms. The freshness anchor when there is no probe. */
  updatedAt: number | null
  /** Distinct addresses that ever left on-chain feedback (getClients length). Not the raw count. */
  distinctAuthors: number
  /** How many agents share this registration record. 1 means unique. */
  clusterSize: number
  /** Ours. Scored by the identical formula with no bonus term (section 6.4). Carried for the label only. */
  firstParty: boolean
  /** now in ms, passed in so a recompute at a pinned time reproduces exactly. */
  asOf: number
}

export interface EvidenceScore {
  /** listing.scoreValue: the point estimate in 0..100, rounded to one decimal. Never null: every listing has a rung. */
  scoreValue: number
  /** listing.scoreConfidence: the Wilson lower bound in 0..100, the honest floor a stranger can trust. */
  scoreConfidence: number
  /** The Wilson upper bound in 0..100. */
  scoreUpper: number
  pHat: number
  /** N + m, the effective sample the interval was computed at. */
  posteriorN: number
  /** Beta pseudo-counts, published so anyone can compute the exact quantile. */
  alpha: number
  beta: number
  /** 0..5, how many rungs above registered this listing has demonstrated. The human sample descriptor. */
  rungsCleared: number
  maxRungSteps: number
  /** exp(-lambda * ageDays), the freshness multiplier applied to the ladder evidence. */
  decay: number
  /** age of the freshness anchor in days (null when neither a probe nor an update time exists). */
  evidenceAgeDays: number | null
  /** 1 / max(1, clusterSize). Below 1 when the registration is a duplicate. */
  dupFactor: number
  /** min(distinctAuthors, C), the count of independent authors that actually counted. */
  authorsCounted: number
  /** 'no-anchor' when there was no probe or update time to age. 'scored' otherwise. */
  state: 'scored' | 'no-anchor'
}

/**
 * The evidence-readiness score for one listing, from real rows. Pure and deterministic in `asOf`.
 *
 * The ladder is a Bernoulli quantity: of the MAX_RUNG_STEPS rungs above `registered`, how many has
 * this listing demonstrated, decayed by how fresh the check is and collapsed when the registration
 * is a duplicate. Independent on-chain feedback adds a capped, distinct-author-gated corroboration to
 * the evidence base. The whole thing is shrunk toward mu_0 = 0.50 with prior strength m and given a
 * Wilson interval, the same machinery the delivery score uses. As the evidence goes stale the sample
 * shrinks and the score converges to the baseline, never to zero, which is the honesty rule the decay
 * must obey (section 2).
 */
export function computeEvidenceScore(input: EvidenceInput): EvidenceScore {
  const { rung, lastProbeAt, updatedAt, distinctAuthors, clusterSize, asOf } = input
  const mu0 = SCORE_CONSTANTS.mu0.value
  const m = SCORE_CONSTANTS.m.value
  const cap = SCORE_CONSTANTS.C.value
  const betaFresh = SCORE_CONSTANTS.betaFresh.value

  const rungIdx = Math.max(0, EVIDENCE_ORDER.indexOf(rung))
  const dupFactor = 1 / Math.max(1, clusterSize || 1)

  // Freshness anchor: the probe time for a third-party row, else the row's own write time. A
  // registry fact with no timestamp is treated as fresh rather than penalised for missing data.
  const anchor = lastProbeAt ?? updatedAt ?? null
  const evidenceAgeDays = anchor !== null ? Math.max(0, (asOf - anchor) / MS_PER_DAY) : null
  const d = evidenceAgeDays !== null ? decayFactor(evidenceAgeDays) : 1

  const sLadder = rungIdx * dupFactor
  const sDec = sLadder * d
  const nDec = MAX_RUNG_STEPS * d
  const rate = nDec > 0 ? sDec / nDec : mu0

  // Independent-author corroboration: capped at C, weighted at the fresh-buyer rate, added to the
  // evidence base at the ladder's own rate so it tightens the interval without inventing success.
  const authorsCounted = Math.min(Math.max(0, Math.floor(distinctAuthors || 0)), cap)
  const authorsEff = authorsCounted * betaFresh
  const nEff = nDec + authorsEff
  const sEff = sDec + authorsEff * rate

  const posteriorN = nEff + m
  const pHat = (sEff + m * mu0) / posteriorN
  const alpha = m * mu0 + sEff
  const beta = m * (1 - mu0) + (nEff - sEff)
  const w = wilsonInterval(pHat, posteriorN)

  return {
    scoreValue: round1(100 * pHat),
    scoreConfidence: round1(100 * w.lo),
    scoreUpper: round1(100 * w.hi),
    pHat,
    posteriorN,
    alpha,
    beta,
    rungsCleared: rungIdx,
    maxRungSteps: MAX_RUNG_STEPS,
    decay: d,
    evidenceAgeDays,
    dupFactor,
    authorsCounted,
    state: anchor === null ? 'no-anchor' : 'scored',
  }
}

// ---------------------------------------------------------------------------
// Foreign feedback: displayed in full, trusted nowhere (section 4).
// ---------------------------------------------------------------------------

export interface FeedbackInterval {
  /** getSummary summaryValue rescaled by its decimals. */
  humanValue: number
  /** The raw int128 and its decimals, kept so the read is checkable. */
  raw: number
  decimals: number
  /** getClients length: the distinct authors, which is the honest sample size, not the feedback count. */
  distinctAuthors: number
  /** getSummary count: total feedbacks, inflated by repeat authors. Shown for context, never as the sample. */
  totalFeedbacks: number
  /** humanValue / 100, clamped, the proportion the interval is computed on. */
  pHat: number
  /** 95% Wilson lower and upper on pHat at n = distinctAuthors, in 0..100. */
  lo: number
  hi: number
  /**
   * True when humanValue lands in 0..100 so it reads as a rating. getSummary averages in 18-decimal
   * fixed point then truncates to the modal decimals of its inputs, so a mixed-decimals agent can
   * return a value outside the range. When false the value is shown raw and not as a percentage.
   */
  scaleResolved: boolean
}

/**
 * A Wilson interval on the aggregate feedback value, with the distinct-author count as the sample
 * size. Never a star, never a bare average: an interval with n makes a two-author "rating" read as
 * the noise it is. Zero weight in either score by design (section 4, F5 is displayed, never trusted).
 */
export function feedbackInterval(summaryValueRaw: string | number, decimals: number, distinctAuthors: number, totalFeedbacks: number): FeedbackInterval {
  const raw = Number(summaryValueRaw)
  const dec = Math.max(0, Math.floor(decimals || 0))
  const humanValue = raw / 10 ** dec
  const scaleResolved = Number.isFinite(humanValue) && humanValue >= 0 && humanValue <= 100
  const pHat = clamp(scaleResolved ? humanValue / 100 : 0, 0, 1)
  const n = Math.max(0, Math.floor(distinctAuthors || 0))
  const w = wilsonInterval(pHat, n)
  return {
    humanValue,
    raw,
    decimals: dec,
    distinctAuthors: n,
    totalFeedbacks: Math.max(0, Math.floor(totalFeedbacks || 0)),
    pHat,
    lo: round1(100 * w.lo),
    hi: round1(100 * w.hi),
    scaleResolved,
  }
}
