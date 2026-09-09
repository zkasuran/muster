/**
 * The read path. Every query the rendered pages need, in one place, so a page component never
 * writes SQL and the render path never opens a network connection.
 *
 * Two rules hold throughout. A count nobody measured comes back `null` rather than 0, because
 * a zero that means "not measured" is the exact failure the Data Quality criterion punishes.
 * And every figure carries the timestamp it was read at, so the page can say how old it is.
 */
import { db } from './db.ts'
import { CHAIN } from './constants.ts'
import { EVIDENCE_ORDER, type EvidenceRung, type Shelf, type Visibility } from './types.ts'
// [doc 03] Search grammar. The parser is pure and lives in search.ts; this file turns it into SQL.
import { tokenAddress, type ParsedQuery, type Clause } from './search.ts'

const CHAIN_ID = CHAIN.id

function one<T>(sql: string, ...args: unknown[]): T | null {
  const r = db()
    .prepare(sql)
    .get(...(args as never[])) as T | undefined
  return r ?? null
}
function many<T>(sql: string, ...args: unknown[]): T[] {
  return db()
    .prepare(sql)
    .all(...(args as never[])) as T[]
}

export interface IndexHealth {
  /** Rows we actually hold. */
  agentsIndexed: number
  /** What the chain's own counter said at the last sweep. */
  agentsOnChain: number | null
  atBlock: number | null
  sweepFinishedAt: number | null
  sweepOk: boolean | null
  sweepSeconds: number | null
  /** What 8004scan claimed, so a shortfall against the chain can be shown rather than told. */
  foreignReported: number | null
  foreignObservedAt: number | null
}

export function indexHealth(): IndexHealth {
  // Our four reference agents sit on reserved ids that are not on the registry, so they are
  // kept out of the indexed count. Indexed must never read higher than registered.
  const agents = one<{ c: number }>(
    `SELECT COUNT(*) c FROM agent WHERE chainId = ?
     AND agentId NOT IN (SELECT agentId FROM listing WHERE firstParty = 1)`,
    CHAIN_ID,
  )
  const run = one<{
    finishedAt: number | null
    startedAt: number
    ok: number
    note: string | null
  }>("SELECT finishedAt, startedAt, ok, note FROM run WHERE kind = 'sweep' ORDER BY startedAt DESC LIMIT 1")
  const foreign = one<{ reportedCount: number | null; observedAt: number | null }>(
    "SELECT reportedCount, observedAt FROM sourceState WHERE source = '8004scan'",
  )
  // The live values, written by the sweep as it starts rather than when it finishes. A sweep
  // takes about an hour and the chain count must not read unknown for that hour.
  const meta = (k: string): number | null => {
    const r = one<{ v: string }>('SELECT v FROM meta WHERE k = ?', k)
    return r ? Number(r.v) : null
  }
  let onChain = meta('chain.agentCount')
  let atBlock = meta('chain.atBlock')
  if (onChain === null && run?.note) {
    const c = /counter=(\d+)/.exec(run.note)
    const b = /block=(\d+)/.exec(run.note)
    if (c?.[1]) onChain = Number(c[1])
    if (b?.[1]) atBlock = Number(b[1])
  }
  return {
    agentsIndexed: agents?.c ?? 0,
    agentsOnChain: onChain,
    atBlock,
    sweepFinishedAt: run?.finishedAt ?? null,
    sweepOk: run ? run.ok === 1 : null,
    sweepSeconds: run?.finishedAt ? Math.round((run.finishedAt - run.startedAt) / 1000) : null,
    foreignReported: foreign?.reportedCount ?? null,
    foreignObservedAt: foreign?.observedAt ?? null,
  }
}

/** The one honest headline: how many rows a stranger could actually pay. */
export interface HireableCounts {
  registered: number
  declared: number
  reachable: number
  probed: number
  payable: number
  settled: number
}

export function rungCounts(shelf?: Shelf): HireableCounts {
  const rows = many<{ evidenceTier: EvidenceRung; c: number }>(
    `SELECT evidenceTier, COUNT(*) c FROM listing
     WHERE chainId = ?${shelf ? ' AND category = ?' : ''} AND visibility IN ('listed','indexed')
     GROUP BY evidenceTier`,
    ...(shelf ? [CHAIN_ID, shelf] : [CHAIN_ID]),
  )
  const out: HireableCounts = {
    registered: 0,
    declared: 0,
    reachable: 0,
    probed: 0,
    payable: 0,
    settled: 0,
  }
  for (const r of rows) out[r.evidenceTier] = r.c
  return out
}

export interface ShelfSummary {
  shelf: Shelf
  listed: number
  indexed: number
  /** Rows at `payable` or better, which is the only count that means hireable. */
  hireable: number
  /** How many of those are our own reference agents, so the count never mixes our supply in silently. */
  hireableOurs: number
  bestRung: EvidenceRung | null
}

export function shelfSummaries(): ShelfSummary[] {
  const shelves: Shelf[] = ['rebalancing', 'grid-trading', 'yield', 'health-factor']
  return shelves.map((shelf) => {
    const listed = one<{ c: number }>(
      "SELECT COUNT(*) c FROM listing WHERE chainId = ? AND category = ? AND visibility = 'listed'",
      CHAIN_ID,
      shelf,
    )
    const indexed = one<{ c: number }>(
      "SELECT COUNT(*) c FROM listing WHERE chainId = ? AND category = ? AND visibility = 'indexed'",
      CHAIN_ID,
      shelf,
    )
    const hireable = one<{ c: number }>(
      `SELECT COUNT(*) c FROM listing WHERE chainId = ? AND category = ?
       AND evidenceTier IN ('payable','settled')`,
      CHAIN_ID,
      shelf,
    )
    const hireableOurs = one<{ c: number }>(
      `SELECT COUNT(*) c FROM listing WHERE chainId = ? AND category = ?
       AND evidenceTier IN ('payable','settled') AND firstParty = 1`,
      CHAIN_ID,
      shelf,
    )
    const best = one<{ evidenceTier: EvidenceRung }>(
      `SELECT evidenceTier FROM listing WHERE chainId = ? AND category = ?
       ORDER BY CASE evidenceTier
         WHEN 'settled' THEN 6 WHEN 'payable' THEN 5 WHEN 'probed' THEN 4
         WHEN 'reachable' THEN 3 WHEN 'declared' THEN 2 ELSE 1 END DESC LIMIT 1`,
      CHAIN_ID,
      shelf,
    )
    return {
      shelf,
      listed: listed?.c ?? 0,
      indexed: indexed?.c ?? 0,
      hireable: hireable?.c ?? 0,
      hireableOurs: hireableOurs?.c ?? 0,
      bestRung: best?.evidenceTier ?? null,
    }
  })
}

/**
 * The population facts, measured over the whole registry rather than a sample. These are the
 * numbers the thesis rests on, so they are read from the index at render time instead of being
 * written into copy where they could go stale.
 */
export interface PopulationFacts {
  agentsIndexed: number
  parsedRecords: number
  withHttpEndpoint: number
  declaresX402: number
  walletDistinctFromOwner: number
  inDuplicateCluster: number
  distinctOwners: number
  largestCluster: { name: string | null; size: number } | null
  bazaarResources: number | null
  bazaarPayoutAddresses: number | null
  bazaarLargestShare: number | null
  /** Agents holding both an ERC-8004 identity and a Bazaar payout address. */
  intersection: number
}

export function populationFacts(): PopulationFacts {
  const c = (sql: string, ...a: unknown[]) => one<{ c: number }>(sql, ...a)?.c ?? 0
  const meta = (k: string): number | null => {
    const r = one<{ v: string }>('SELECT v FROM meta WHERE k = ?', k)
    return r ? Number(r.v) : null
  }
  const largest = one<{ n: string | null; c: number }>(
    `SELECT coalesce(name, '(unnamed)') n, COUNT(*) c FROM agent
     WHERE chainId = ? AND duplicateClusterId IS NOT NULL
     GROUP BY duplicateClusterId ORDER BY c DESC LIMIT 1`,
    CHAIN_ID,
  )
  return {
    agentsIndexed: c('SELECT COUNT(*) c FROM agent WHERE chainId = ?', CHAIN_ID),
    parsedRecords: c('SELECT COUNT(*) c FROM agent WHERE chainId = ? AND registrationParsed = 1', CHAIN_ID),
    withHttpEndpoint: c("SELECT COUNT(*) c FROM agent WHERE chainId = ? AND endpoints != '[]'", CHAIN_ID),
    declaresX402: c('SELECT COUNT(*) c FROM agent WHERE chainId = ? AND declaresX402 = 1', CHAIN_ID),
    walletDistinctFromOwner: c(
      'SELECT COUNT(*) c FROM agent WHERE chainId = ? AND agentWallet IS NOT NULL AND agentWallet != owner',
      CHAIN_ID,
    ),
    inDuplicateCluster: c('SELECT COUNT(*) c FROM agent WHERE chainId = ? AND duplicateClusterId IS NOT NULL', CHAIN_ID),
    distinctOwners: c('SELECT COUNT(DISTINCT owner) c FROM agent WHERE chainId = ?', CHAIN_ID),
    largestCluster: largest ? { name: largest.n, size: largest.c } : null,
    bazaarResources: meta('bazaar.resources'),
    bazaarPayoutAddresses: meta('bazaar.distinctPayTo'),
    bazaarLargestShare: meta('bazaar.largestPublisherShare'),
    // A join against the payout set Bazaar actually publishes, not against listings we
    // happened to promote. The two differ: the one agent in the intersection has an empty
    // registration record, so it matches no shelf contract and holds no listing.
    intersection: c(
      `SELECT COUNT(*) c FROM agent a
       WHERE a.chainId = ?
         AND (lower(a.owner) IN (SELECT payTo FROM bazaarPayout)
              OR lower(a.agentWallet) IN (SELECT payTo FROM bazaarPayout))`,
      CHAIN_ID,
    ),
  }
}

export interface ListingCard {
  listingId: string
  agentId: string
  category: Shelf
  name: string | null
  description: string | null
  owner: string
  evidenceTier: EvidenceRung
  visibility: Visibility
  endpointCount: number
  declaresX402: number
  declaresActive: number
  inBazaar: number
  priceBase: string | null
  priceToken: string | null
  priceDecimals: number | null
  priceScheme: string | null
  lastProbeAt: number | null
  lastProbeVerdict: string | null
  firstParty: number
  clusterSize: number
}

const CARD_SELECT = `
SELECT l.listingId, l.agentId, l.category, l.evidenceTier, l.visibility,
       a.name, a.description, a.owner, a.declaresX402, a.declaresActive,
       l.inBazaar, l.priceBase, l.priceToken, l.priceDecimals, l.priceScheme,
       l.lastProbeAt, l.lastProbeVerdict, l.firstParty,
       json_array_length(a.endpoints) AS endpointCount,
       (SELECT COUNT(*) FROM agent s WHERE s.duplicateClusterId IS NOT NULL
          AND s.duplicateClusterId = a.duplicateClusterId) AS clusterSize
FROM listing l JOIN agent a ON a.chainId = l.chainId AND a.agentId = l.agentId`

export interface ShelfQuery {
  /** Minimum rung to show. Default shows everything indexed. */
  minRung?: EvidenceRung
  /** Only rows a buyer could pay right now. */
  payable?: boolean
  /** 'ours', 'third' or undefined for both. */
  who?: 'ours' | 'third'
  /** Hide rows that share a registration record with another row. */
  unique?: boolean
  /** A substring over name and description. */
  q?: string
  sort?: 'rung' | 'probe' | 'name' | 'id' | 'price'
  limit?: number
  offset?: number
}

const RUNG_RANK = `CASE l.evidenceTier WHEN 'settled' THEN 6 WHEN 'payable' THEN 5 WHEN 'probed' THEN 4
       WHEN 'reachable' THEN 3 WHEN 'declared' THEN 2 ELSE 1 END`

function shelfWhere(shelf: Shelf, f: ShelfQuery): { sql: string; args: unknown[] } {
  const w: string[] = ["l.chainId = ?", "l.category = ?", "l.visibility IN ('listed','indexed')"]
  const a: unknown[] = [CHAIN_ID, shelf]
  if (f.minRung) { w.push(`${RUNG_RANK} >= ?`); a.push(EVIDENCE_ORDER.indexOf(f.minRung) + 1) }
  if (f.payable) w.push("l.evidenceTier IN ('payable','settled')")
  if (f.who === 'ours') w.push('l.firstParty = 1')
  if (f.who === 'third') w.push('l.firstParty = 0')
  if (f.unique) w.push('(a.duplicateClusterId IS NULL)')
  if (f.q && f.q.trim()) { w.push("(lower(coalesce(a.name,'')) LIKE ? OR lower(coalesce(a.description,'')) LIKE ?)"); const n = `%${f.q.trim().toLowerCase().slice(0, 80)}%`; a.push(n, n) }
  return { sql: w.join(' AND '), args: a }
}

function shelfOrder(sort: ShelfQuery['sort']): string {
  switch (sort) {
    case 'probe': return 'l.lastProbeAt IS NULL, l.lastProbeAt DESC, CAST(l.agentId AS INTEGER) ASC'
    case 'name': return "lower(coalesce(a.name,'zzzz')) ASC, CAST(l.agentId AS INTEGER) ASC"
    case 'id': return 'CAST(l.agentId AS INTEGER) ASC'
    case 'price': return 'l.priceBase IS NULL, CAST(l.priceBase AS REAL) ASC, CAST(l.agentId AS INTEGER) ASC'
    default: return `${RUNG_RANK} DESC, l.firstParty ASC, CAST(l.agentId AS INTEGER) ASC`
  }
}

/**
 * The shelf, filtered and ordered. Default order is by how much is known, then registration
 * order, so the ordering is explainable in one sentence. Every filter is a plain query
 * parameter, so the whole facet rail works with scripting off.
 */
export function shelfListings(shelf: Shelf, f: ShelfQuery | number = {}): ListingCard[] {
  const q: ShelfQuery = typeof f === 'number' ? { limit: f } : f
  const { sql, args } = shelfWhere(shelf, q)
  return many<ListingCard>(
    `${CARD_SELECT}
     WHERE ${sql}
     ORDER BY ${shelfOrder(q.sort)}
     LIMIT ? OFFSET ?`,
    ...args,
    Math.min(q.limit ?? 60, 200),
    q.offset ?? 0,
  )
}

export function shelfCount(shelf: Shelf, f: ShelfQuery = {}): number {
  const { sql, args } = shelfWhere(shelf, f)
  return one<{ c: number }>(`SELECT COUNT(*) c FROM listing l JOIN agent a ON a.chainId = l.chainId AND a.agentId = l.agentId WHERE ${sql}`, ...args)?.c ?? 0
}

/**
 * The row a buyer could pay here, on each shelf. "Payable" is a rung, "hireable here" is
 * stricter: it also needs a price in a token this marketplace quotes on BSC. A 402 whose options
 * are all on other networks is payable somewhere and not here, and the landing must not call it
 * hireable. Ours if that is all there is, and the panel says so.
 */
export function topHireablePerShelf(): { shelf: Shelf; card: ListingCard | null }[] {
  const shelves: Shelf[] = ['rebalancing', 'grid-trading', 'yield', 'health-factor']
  return shelves.map((shelf) => ({
    shelf,
    card: shelfListings(shelf, { payable: true, limit: 8 }).find((c) => c.priceBase !== null && c.priceToken !== null) ?? null,
  }))
}

/** The last probes, for a live strip on the landing page. Real rows, never a fixture. */
export function recentProbes(limit = 8): { agentId: string; name: string | null; category: Shelf; verdict: string; httpStatus: number | null; sawPaymentRequired: number; observedAt: number; host: string }[] {
  return many<{ agentId: string; name: string | null; category: Shelf; verdict: string; httpStatus: number | null; sawPaymentRequired: number; observedAt: number; url: string }>(
    `SELECT p.agentId, a.name, l.category, p.verdict, p.httpStatus, p.sawPaymentRequired, p.observedAt, p.url
     FROM probeResult p JOIN listing l ON l.listingId = p.listingId JOIN agent a ON a.chainId = l.chainId AND a.agentId = l.agentId
     ORDER BY p.observedAt DESC LIMIT ?`,
    limit,
  ).map((r) => ({ ...r, host: (() => { try { return new URL(r.url).hostname } catch { return r.url } })() }))
}

export interface AgentDetail extends ListingCard {
  payTo: string | null
  feedbackCount: number
  tokenUri: string
  endpoints: string[]
  skills: string[]
  serviceKinds: string[]
  trustModels: string[]
  agentWallet: string | null
  firstSeenBlock: number
  updatedAt: number
  categories: Shelf[]
}

export function agentDetail(agentId: string): AgentDetail | null {
  const a = one<Record<string, unknown>>(
    `SELECT a.*, json_array_length(a.endpoints) AS endpointCount
     FROM agent a WHERE a.chainId = ? AND a.agentId = ?`,
    CHAIN_ID,
    agentId,
  )
  if (!a) return null
  const listings = many<{
    listingId: string
    category: Shelf
    evidenceTier: EvidenceRung
    visibility: Visibility
    inBazaar: number
    priceBase: string | null
    priceToken: string | null
    priceDecimals: number | null
    priceScheme: string | null
    payTo: string | null
    lastProbeAt: number | null
    lastProbeVerdict: string | null
    firstParty: number
  }>(
    'SELECT * FROM listing WHERE chainId = ? AND agentId = ?',
    CHAIN_ID,
    agentId,
  )
  const primary = listings[0]
  const cluster = one<{ c: number }>(
    'SELECT COUNT(*) c FROM agent WHERE duplicateClusterId IS NOT NULL AND duplicateClusterId = ?',
    a['duplicateClusterId'],
  )
  const arr = (k: string): string[] => {
    try {
      const v = JSON.parse(String(a[k] ?? '[]'))
      return Array.isArray(v) ? v.map(String) : []
    } catch {
      return []
    }
  }
  return {
    listingId: primary?.listingId ?? `${CHAIN_ID}:${agentId}:none`,
    agentId,
    category: primary?.category ?? 'yield',
    name: (a['name'] as string) ?? null,
    description: (a['description'] as string) ?? null,
    owner: String(a['owner']),
    agentWallet: (a['agentWallet'] as string) ?? null,
    evidenceTier: primary?.evidenceTier ?? 'registered',
    visibility: primary?.visibility ?? 'indexed',
    endpointCount: Number(a['endpointCount'] ?? 0),
    declaresX402: Number(a['declaresX402'] ?? 0),
    declaresActive: Number(a['declaresActive'] ?? 0),
    inBazaar: primary?.inBazaar ?? 0,
    priceBase: primary?.priceBase ?? null,
    priceToken: primary?.priceToken ?? null,
    priceDecimals: primary?.priceDecimals ?? null,
    priceScheme: primary?.priceScheme ?? null,
    lastProbeAt: primary?.lastProbeAt ?? null,
    lastProbeVerdict: primary?.lastProbeVerdict ?? null,
    payTo: primary?.payTo ?? null,
    feedbackCount: Number(a['feedbackCount'] ?? 0),
    firstParty: primary?.firstParty ?? 0,
    clusterSize: cluster?.c ?? 0,
    tokenUri: String(a['tokenUri'] ?? ''),
    endpoints: arr('endpoints'),
    skills: arr('skills'),
    serviceKinds: arr('serviceKinds'),
    trustModels: arr('trustModels'),
    firstSeenBlock: Number(a['firstSeenBlock'] ?? 0),
    updatedAt: Number(a['updatedAt'] ?? 0),
    categories: listings.map((l) => l.category),
  }
}

export function searchListings(q: string, limit = 40): ListingCard[] {
  const needle = `%${q.toLowerCase().slice(0, 80)}%`
  return many<ListingCard>(
    `${CARD_SELECT}
     WHERE l.chainId = ?
       AND (lower(coalesce(a.name,'')) LIKE ? OR lower(coalesce(a.description,'')) LIKE ?
            OR lower(a.skills) LIKE ? OR a.agentId = ?)
     ORDER BY CASE l.evidenceTier
       WHEN 'settled' THEN 6 WHEN 'payable' THEN 5 WHEN 'probed' THEN 4
       WHEN 'reachable' THEN 3 WHEN 'declared' THEN 2 ELSE 1 END DESC,
       CAST(l.agentId AS INTEGER) ASC
     LIMIT ?`,
    CHAIN_ID,
    needle,
    needle,
    needle,
    q.trim(),
    limit,
  )
}

export function probeHistory(listingId: string, limit = 10) {
  return many<{
    probeId: string
    assertion: string
    verdict: string
    failureClass: string | null
    httpStatus: number | null
    sawPaymentRequired: number
    latencyMs: number | null
    observedAt: number
    url: string
    note: string | null
    bodyExcerpt: string | null
  }>(
    'SELECT probeId, assertion, verdict, failureClass, httpStatus, sawPaymentRequired, latencyMs, observedAt, url, note, bodyExcerpt FROM probeResult WHERE listingId = ? ORDER BY observedAt DESC LIMIT ?',
    listingId,
    limit,
  )
}

/**
 * Compare: two to four listings side by side. The ids come from the query string, so they are
 * validated as decimal strings here and never interpolated. Order is preserved, because a buyer
 * who put an agent first wants it in the first column.
 */
export function listingsForCompare(ids: string[]): ListingCard[] {
  const clean = [...new Set(ids.filter((s) => /^(0|[1-9][0-9]*)$/.test(s)))].slice(0, 4)
  if (clean.length === 0) return []
  const placeholders = clean.map(() => '?').join(',')
  const rows = many<ListingCard>(
    `${CARD_SELECT}
     WHERE l.chainId = ? AND l.agentId IN (${placeholders})
     GROUP BY l.agentId`,
    CHAIN_ID,
    ...clean,
  )
  const byId = new Map(rows.map((r) => [r.agentId, r]))
  return clean.map((id) => byId.get(id)).filter((r): r is ListingCard => r !== undefined)
}

/** Latest probe per listing, for the compare grid. */
export function latestProbes(listingIds: string[]): Map<string, { verdict: string; httpStatus: number | null; sawPaymentRequired: number; latencyMs: number | null; observedAt: number; failureClass: string | null }> {
  const out = new Map<string, { verdict: string; httpStatus: number | null; sawPaymentRequired: number; latencyMs: number | null; observedAt: number; failureClass: string | null }>()
  for (const id of listingIds) {
    const r = one<{ verdict: string; httpStatus: number | null; sawPaymentRequired: number; latencyMs: number | null; observedAt: number; failureClass: string | null }>(
      'SELECT verdict, httpStatus, sawPaymentRequired, latencyMs, observedAt, failureClass FROM probeResult WHERE listingId = ? ORDER BY observedAt DESC LIMIT 1',
      id,
    )
    if (r) out.set(id, r)
  }
  return out
}

/** Probe summary for the status page: what the last cycle actually did. */
export function probeSummary(): {
  total: number
  listingsProbed: number
  verdicts: Record<string, number>
  failureClasses: { failureClass: string; c: number }[]
  lastObservedAt: number | null
  sawPaymentRequired: number
} {
  const total = one<{ c: number }>('SELECT COUNT(*) c FROM probeResult')?.c ?? 0
  const listingsProbed = one<{ c: number }>('SELECT COUNT(DISTINCT listingId) c FROM probeResult')?.c ?? 0
  const verdicts: Record<string, number> = {}
  for (const r of many<{ verdict: string; c: number }>('SELECT verdict, COUNT(*) c FROM probeResult GROUP BY verdict')) verdicts[r.verdict] = r.c
  const failureClasses = many<{ failureClass: string; c: number }>(
    "SELECT failureClass, COUNT(*) c FROM probeResult WHERE verdict = 'fail' AND failureClass IS NOT NULL GROUP BY failureClass ORDER BY c DESC LIMIT 10",
  )
  const last = one<{ m: number | null }>('SELECT MAX(observedAt) m FROM probeResult')
  const paid = one<{ c: number }>('SELECT COUNT(DISTINCT listingId) c FROM probeResult WHERE sawPaymentRequired = 1')?.c ?? 0
  return { total, listingsProbed, verdicts, failureClasses, lastObservedAt: last?.m ?? null, sawPaymentRequired: paid }
}

/** Our reference agent on a shelf, if any, so a third-party page can offer a comparison. */
export function firstPartyOnShelf(shelf: Shelf): { agentId: string; name: string | null } | null {
  return one<{ agentId: string; name: string | null }>(
    `SELECT l.agentId, a.name FROM listing l JOIN agent a ON a.chainId = l.chainId AND a.agentId = l.agentId
     WHERE l.chainId = ? AND l.category = ? AND l.firstParty = 1 LIMIT 1`,
    CHAIN_ID,
    shelf,
  )
}

/** On-chain feedback for one agent, as the sweep read it. */
export function feedbackFor(agentId: string): { clients: number; count: number; value: string; decimals: number; readAt: number } | null {
  const r = one<{ v: string }>('SELECT v FROM meta WHERE k = ?', `feedback.${agentId}`)
  if (!r) return null
  try { return JSON.parse(r.v) } catch { return null }
}

// [doc 03] Coverage proof, docs/03-TAXONOMY.md section 5.1 and docs/02-THESIS.md section 7.
// Every count on this page carries its first-party split, because the Agent Diversity criterion
// is lost the moment a shelf looks full of our own supply and the count does not say so. A count
// here is a measurement over the index, so a zero is a real zero and never an unknown.

/** A count and how much of it is our own reference supply, so the split is beside every number. */
export interface CountSplit {
  total: number
  ours: number
  third: number
}

export interface ShelfCoverage {
  shelf: Shelf
  /** Rows the classifier placed on this shelf, listed plus indexed. The candidate count. */
  candidates: CountSplit
  /** Rows with a callable endpoint, shown on the shelf itself. */
  listed: CountSplit
  /** Rows we can read but that have no endpoint to call, kept off the shelf. */
  indexed: CountSplit
  /** Rows whose most recent probe passed. The answering count. */
  answering: CountSplit
  /** Rows payable here: at the payable or settled rung with a price in a token we quote on BSC. */
  hireable: CountSplit
  /** Settled jobs through Muster in this category. A ledger count, so zero is measured. */
  settledJobs: number
  /** The block the index was read at, so the whole page carries one freshness stamp. */
  atBlock: number | null
}

function splitOn(shelf: Shelf, extra: string): CountSplit {
  const rows = many<{ firstParty: number; c: number }>(
    `SELECT l.firstParty, COUNT(*) c FROM listing l
     WHERE l.chainId = ? AND l.category = ?${extra ? ` AND ${extra}` : ''}
     GROUP BY l.firstParty`,
    CHAIN_ID,
    shelf,
  )
  let ours = 0
  let third = 0
  for (const r of rows) { if (r.firstParty === 1) ours += r.c; else third += r.c }
  return { total: ours + third, ours, third }
}

export function coverageByShelf(): ShelfCoverage[] {
  const shelves: Shelf[] = ['rebalancing', 'grid-trading', 'yield', 'health-factor']
  const atBlock = (() => {
    const r = one<{ v: string }>('SELECT v FROM meta WHERE k = ?', 'chain.atBlock')
    return r ? Number(r.v) : null
  })()
  return shelves.map((shelf) => ({
    shelf,
    candidates: splitOn(shelf, "l.visibility IN ('listed','indexed')"),
    listed: splitOn(shelf, "l.visibility = 'listed'"),
    indexed: splitOn(shelf, "l.visibility = 'indexed'"),
    answering: splitOn(shelf, "l.lastProbeVerdict = 'pass'"),
    // Hireable HERE is stricter than the payable rung: it needs a price in a token this
    // marketplace quotes, so a 402 whose options are all on another network is not counted.
    hireable: splitOn(shelf, "l.evidenceTier IN ('payable','settled') AND l.priceToken IS NOT NULL"),
    settledJobs: one<{ c: number }>('SELECT COUNT(*) c FROM hireAttempt WHERE shelf = ? AND settled = 1', shelf)?.c ?? 0,
    atBlock,
  }))
}

/**
 * The off-shelf rows for a shelf: everything at visibility `indexed`, which is a row we can read
 * that has no endpoint to call, plus the reason it is off the shelf, derived from stored fields
 * rather than a new column. docs/03-TAXONOMY.md section 5.3 (off-shelf drawer) and 3.1.
 */
export interface OffShelfRow {
  agentId: string
  name: string | null
  reason: string
  clusterSize: number
}

export function offShelf(shelf: Shelf, limit = 40): { rows: OffShelfRow[]; total: number; byReason: { reason: string; c: number }[] } {
  const rows = many<{ agentId: string; name: string | null; endpointCount: number; parsed: number; clusterSize: number }>(
    `SELECT l.agentId, a.name, a.registrationParsed AS parsed,
            json_array_length(a.endpoints) AS endpointCount,
            (SELECT COUNT(*) FROM agent s WHERE s.duplicateClusterId IS NOT NULL
               AND s.duplicateClusterId = a.duplicateClusterId) AS clusterSize
     FROM listing l JOIN agent a ON a.chainId = l.chainId AND a.agentId = l.agentId
     WHERE l.chainId = ? AND l.category = ? AND l.visibility = 'indexed'
     ORDER BY CAST(l.agentId AS INTEGER) ASC
     LIMIT ?`,
    CHAIN_ID,
    shelf,
    Math.min(limit, 200),
  )
  const withReason = rows.map((r) => ({
    agentId: r.agentId,
    name: r.name,
    clusterSize: r.clusterSize,
    reason:
      r.parsed === 0
        ? 'registration could not be parsed'
        : r.endpointCount === 0
          ? 'no endpoint to call in its registration record'
          : 'matched the contract text but has nothing callable',
  }))
  const total = one<{ c: number }>(
    "SELECT COUNT(*) c FROM listing WHERE chainId = ? AND category = ? AND visibility = 'indexed'",
    CHAIN_ID,
    shelf,
  )?.c ?? 0
  const counts = new Map<string, number>()
  for (const r of withReason) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1)
  const byReason = [...counts.entries()].map(([reason, c]) => ({ reason, c })).sort((a, b) => b.c - a.c)
  return { rows: withReason, total, byReason }
}

// [doc 03] Search grammar query, docs/03-TAXONOMY.md section 5.6. Turns a ParsedQuery into SQL over
// listing joined to agent. Every clause maps to a stored column, so nothing here is a free-text
// filter in disguise. Default scope is is:live (visibility listed). An is:indexed clause widens to
// the whole index. The order is deterministic, so a shared query link renders the same rows for
// every reader.

function answeredSql(v: string, args: unknown[]): string {
  if (v === 'ever') return 'l.lastProbeAt IS NOT NULL'
  if (v === 'never') return 'l.lastProbeAt IS NULL'
  const win = v === '5m' ? 5 * 60_000 : v === '1h' ? 3_600_000 : 86_400_000
  args.push(Date.now() - win)
  return 'l.lastProbeAt >= ?'
}

function clauseSql(c: Clause, args: unknown[]): string {
  switch (c.op) {
    case 'is':
      switch (c.value) {
        // live and indexed set the visibility scope, so they add no per-row condition here.
        case 'live':
        case 'indexed':
          return ''
        case 'hireable':
          return "(l.evidenceTier IN ('payable','settled') AND l.priceToken IS NOT NULL)"
        case 'first-party':
          return 'l.firstParty = 1'
        case 'duplicate':
          return 'a.duplicateClusterId IS NOT NULL'
        case 'x402':
          return 'a.declaresX402 = 1'
        default:
          return ''
      }
    case 'tag':
      args.push(c.value)
      return 'l.category = ?'
    case 'tier': {
      args.push(EVIDENCE_ORDER.indexOf(c.value as EvidenceRung) + 1)
      return c.gte ? `${RUNG_RANK} >= ?` : `${RUNG_RANK} = ?`
    }
    case 'rail':
      args.push(c.value)
      return 'l.priceScheme = ?'
    case 'token':
      args.push(tokenAddress(c.value).toLowerCase())
      return 'lower(l.priceToken) = ?'
    case 'answered':
      return answeredSql(c.value, args)
    case 'owner':
      args.push(c.value.toLowerCase())
      return 'lower(a.owner) = ?'
    case 'agent':
      args.push(c.value)
      return 'l.agentId = ?'
    case 'cluster':
      args.push(c.value)
      return 'a.duplicateClusterId = ?'
    default:
      return ''
  }
}

export function searchGrammar(parsed: ParsedQuery, limit = 40): ListingCard[] {
  const where: string[] = ['l.chainId = ?']
  const args: unknown[] = [CHAIN_ID]

  const wantsIndexed = parsed.clauses.some((c) => c.op === 'is' && c.value === 'indexed' && !c.negate)
  where.push(wantsIndexed ? "l.visibility IN ('listed','indexed')" : "l.visibility = 'listed'")

  for (const c of parsed.clauses) {
    const cond = clauseSql(c, args)
    if (cond) where.push(c.negate ? `NOT (${cond})` : cond)
  }
  for (const t of parsed.terms) {
    const like = `%${t.toLowerCase().slice(0, 80)}%`
    where.push("(lower(coalesce(a.name,'')) LIKE ? OR lower(coalesce(a.description,'')) LIKE ? OR lower(a.skills) LIKE ? OR l.agentId = ?)")
    args.push(like, like, like, t)
  }

  return many<ListingCard>(
    `${CARD_SELECT}
     WHERE ${where.join(' AND ')}
     ORDER BY ${RUNG_RANK} DESC, l.firstParty ASC, CAST(l.agentId AS INTEGER) ASC
     LIMIT ?`,
    ...args,
    Math.min(limit, 200),
  )
}

// [doc 06] The quality score read path. worker/score.ts writes listing.scoreValue and
// listing.scoreConfidence; these functions read them back plus the raw fields a page needs to
// recompute the evidence score live (lib/score.ts computeEvidenceScore) so the number on screen
// carries the freshness it is stated at. distinctAuthors and the feedback value come from the
// meta row worker/feedback.ts wrote, read here as json rather than a second table.

/** Everything a page needs to render one listing's score honestly and to recompute it. */
export interface ScoreRead {
  listingId: string
  agentId: string
  evidenceTier: EvidenceRung
  lastProbeAt: number | null
  updatedAt: number
  clusterSize: number
  firstParty: number
  /** Stored by worker/score.ts. The sort key and the index value. */
  scoreValue: number | null
  scoreConfidence: number | null
  /** getClients length: the distinct feedback authors, the honest sample size. */
  distinctAuthors: number
  /** getSummary count: total feedbacks, inflated by repeat authors. */
  totalFeedbacks: number
  /** getSummary aggregate value and its decimals, or null when no feedback was read. */
  feedbackValue: string | null
  feedbackDecimals: number | null
}

const SCORE_READ_SELECT = `
SELECT l.listingId, l.agentId, l.evidenceTier, l.lastProbeAt, l.updatedAt, l.firstParty,
       l.scoreValue, l.scoreConfidence,
       (SELECT COUNT(*) FROM agent s WHERE s.duplicateClusterId IS NOT NULL
          AND s.duplicateClusterId = a.duplicateClusterId) AS clusterSize,
       coalesce(CAST(json_extract(m.v, '$.clients') AS INTEGER), 0) AS distinctAuthors,
       coalesce(CAST(json_extract(m.v, '$.count')   AS INTEGER), 0) AS totalFeedbacks,
       json_extract(m.v, '$.value')    AS feedbackValue,
       json_extract(m.v, '$.decimals') AS feedbackDecimals
FROM listing l
JOIN agent a ON a.chainId = l.chainId AND a.agentId = l.agentId
LEFT JOIN meta m ON m.k = 'feedback.' || l.agentId`

export function scoreReadFor(listingId: string): ScoreRead | null {
  return one<ScoreRead>(`${SCORE_READ_SELECT} WHERE l.listingId = ?`, listingId)
}

export function scoreReadsFor(listingIds: string[]): Map<string, ScoreRead> {
  const clean = [...new Set(listingIds)].slice(0, 8)
  const out = new Map<string, ScoreRead>()
  if (clean.length === 0) return out
  const placeholders = clean.map(() => '?').join(',')
  for (const r of many<ScoreRead>(`${SCORE_READ_SELECT} WHERE l.listingId IN (${placeholders})`, ...clean)) {
    out.set(r.listingId, r)
  }
  return out
}

/**
 * The shelf ordered by the evidence score's confidence floor, docs/06-QUALITY.md section 2's
 * "default sort uses M_lo, never M". A row cannot outrank a better-evidenced one on a thin sample.
 * First-party rows tie-break last, so being ours is never a ranking advantage. Nulls sort last, so a
 * listing whose score has not been computed yet does not jump the queue.
 */
export interface ScoredCard extends ListingCard {
  scoreValue: number | null
  scoreConfidence: number | null
  distinctAuthors: number
}

export function shelfByScore(shelf: Shelf, limit = 12): ScoredCard[] {
  return many<ScoredCard>(
    `SELECT l.listingId, l.agentId, l.category, l.evidenceTier, l.visibility,
            a.name, a.description, a.owner, a.declaresX402, a.declaresActive,
            l.inBazaar, l.priceBase, l.priceToken, l.priceDecimals, l.priceScheme,
            l.lastProbeAt, l.lastProbeVerdict, l.firstParty,
            l.scoreValue, l.scoreConfidence,
            json_array_length(a.endpoints) AS endpointCount,
            (SELECT COUNT(*) FROM agent s WHERE s.duplicateClusterId IS NOT NULL
               AND s.duplicateClusterId = a.duplicateClusterId) AS clusterSize,
            coalesce(CAST(json_extract(m.v, '$.clients') AS INTEGER), 0) AS distinctAuthors
     FROM listing l
     JOIN agent a ON a.chainId = l.chainId AND a.agentId = l.agentId
     LEFT JOIN meta m ON m.k = 'feedback.' || l.agentId
     WHERE l.chainId = ? AND l.category = ? AND l.visibility IN ('listed','indexed')
     ORDER BY l.scoreConfidence IS NULL, l.scoreConfidence DESC, l.firstParty ASC, CAST(l.agentId AS INTEGER) ASC
     LIMIT ?`,
    CHAIN_ID,
    shelf,
    Math.min(limit, 60),
  )
}
