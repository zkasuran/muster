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
  const agents = one<{ c: number }>('SELECT COUNT(*) c FROM agent WHERE chainId = ?', CHAIN_ID)
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
