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
import type { EvidenceRung, Shelf, Visibility } from './types.ts'

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

/** Ordered by how much we know, then by id, so the ordering is explainable in one sentence. */
export function shelfListings(shelf: Shelf, limit = 60): ListingCard[] {
  return many<ListingCard>(
    `${CARD_SELECT}
     WHERE l.chainId = ? AND l.category = ? AND l.visibility IN ('listed','indexed')
     ORDER BY CASE l.evidenceTier
       WHEN 'settled' THEN 6 WHEN 'payable' THEN 5 WHEN 'probed' THEN 4
       WHEN 'reachable' THEN 3 WHEN 'declared' THEN 2 ELSE 1 END DESC,
       l.firstParty ASC, CAST(l.agentId AS INTEGER) ASC
     LIMIT ?`,
    CHAIN_ID,
    shelf,
    limit,
  )
}

export interface AgentDetail extends ListingCard {
  payTo: string | null
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
  }>(
    'SELECT probeId, assertion, verdict, failureClass, httpStatus, sawPaymentRequired, latencyMs, observedAt FROM probeResult WHERE listingId = ? ORDER BY observedAt DESC LIMIT ?',
    listingId,
    limit,
  )
}
