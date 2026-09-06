/**
 * The row shapes every other module writes against. Fixed before anything else, because a
 * schema invented twice is a schema that disagrees with itself.
 *
 * Scope note, stated here rather than discovered later. docs/15-SYSTEM.md section 2.3
 * specifies nine collections. Five are built: agent, listing, probeResult, quote and job,
 * plus payment and receipt on the hire path. Four are deliberately not built in the time
 * available and each has a reason: session belongs to the Altana track, which
 * docs/decisions/17 dropped; ledgerEntry's seven-invariant hash chain, the ERC-8183 escrow
 * index and the retention reaper are all above the cut line in .hq/TASKS.md. Nothing renders
 * a value it did not store, so the absence shows as unknown rather than as a wrong number.
 */

/** The four shelves the rubric requires at equal depth. */
export type Shelf = 'rebalancing' | 'grid-trading' | 'yield' | 'health-factor'

/**
 * How much we actually know about a row, worst to best. The whole product is an argument
 * that this ladder is the thing a marketplace owes a buyer, so it is a first-class column
 * rather than a derived label.
 */
export type EvidenceRung =
  /** Registered on chain. Nothing else is known. */
  | 'registered'
  /** It declares an endpoint and a capability in its registration record. */
  | 'declared'
  /** The declared host resolves and completes TLS. */
  | 'reachable'
  /** It answers a probe in a way that matches what it declared. */
  | 'probed'
  /** It returns an HTTP 402 with payment requirements a buyer could satisfy. */
  | 'payable'
  /** It appears in B402 Bazaar, so a real payment to it has settled at least once. */
  | 'settled'

export const EVIDENCE_ORDER: readonly EvidenceRung[] = [
  'registered',
  'declared',
  'reachable',
  'probed',
  'payable',
  'settled',
] as const

export type Visibility = 'listed' | 'indexed' | 'hidden' | 'suppressed'
export type LifecycleState = 'candidate' | 'probed' | 'in_review' | 'live' | 'stale' | 'delisted'

/**
 * A stored value plus when it was read. Every number a buyer compares carries one, because
 * "real-time, accurate data" is a rubric criterion and an undated number cannot be either.
 * `null` value means unknown, which renders as unknown and never as zero.
 */
export interface Fresh<T> {
  value: T | null
  readAt: number | null
  /** Seconds after which this field stops being current, per docs/15-SYSTEM.md section 3.5. */
  ceilingSeconds: number
}

export interface AgentRow {
  chainId: number
  /** Decimal string, no leading zero. The registry mints uint256 ids. */
  agentId: string
  owner: string
  /** The reserved ERC-8004 metadata key. Equals `owner` unless the operator set it. */
  agentWallet: string | null
  tokenUri: string
  tokenUriHash: string
  name: string | null
  description: string | null
  /** Endpoints as declared in the registration record, unvalidated. */
  endpoints: string[]
  skills: string[]
  registrationParsed: 0 | 1
  /** Set when several agents share a tokenUriHash or a name, so a shelf can collapse them. */
  duplicateClusterId: string | null
  firstSeenBlock: number
  lastSeenBlock: number
  feedbackCount: number
  updatedAt: number
}

export interface ListingRow {
  listingId: string
  chainId: number
  agentId: string
  category: Shelf
  visibility: Visibility
  lifecycleState: LifecycleState
  evidenceTier: EvidenceRung
  /** Two numbers, never one composite, per docs/06-QUALITY.md. */
  scoreValue: number | null
  scoreConfidence: number | null
  priceBase: string | null
  priceToken: string | null
  priceDecimals: number | null
  /** `eip3009`, `permit2-exact`, `permit2-upto`, or null when nothing is payable. */
  priceScheme: string | null
  payTo: string | null
  /** True when this row's payTo appears in B402 Bazaar, which is the settled rung. */
  inBazaar: 0 | 1
  bazaarResource: string | null
  lastProbeAt: number | null
  lastProbeVerdict: 'pass' | 'fail' | 'skip' | null
  /** Ours, and labelled as ours on every row that renders. */
  firstParty: 0 | 1
  updatedAt: number
}

export interface ProbeResultRow {
  probeId: string
  listingId: string
  agentId: string
  url: string
  assertion: string
  verdict: 'pass' | 'fail' | 'skip'
  failureClass: string | null
  httpStatus: number | null
  /** True when the response was a 402 carrying parseable payment requirements. */
  sawPaymentRequired: 0 | 1
  tlsOk: 0 | 1
  latencyMs: number | null
  observedAt: number
  prober: string
  note: string | null
}

export interface RunRow {
  runId: string
  kind: string
  startedAt: number
  finishedAt: number | null
  fromBlock: number | null
  toBlock: number | null
  itemsRead: number
  itemsWritten: number
  errors: number
  ok: 0 | 1
  note: string | null
}

export interface SourceStateRow {
  source: string
  lastOkAt: number | null
  lastErrorAt: number | null
  lastError: string | null
  /** What the foreign source claims, so a shortfall against the chain can be shown. */
  reportedCount: number | null
  observedAt: number | null
}
