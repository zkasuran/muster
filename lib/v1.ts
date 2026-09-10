/**
 * The read-only REST surface, docs/15-SYSTEM.md section 1.3. No auth, because no read here
 * exposes anything not already public on chain or published by us (section 7.1). Every list is
 * returned in the one paging envelope the document fixes:
 *
 *   { items, page, pageSize, total, totalPages }
 *
 * and `pageSize` is capped at 100, the same ceiling the foreign index enforces (section 7.4).
 *
 * The route table below is the single source of truth. `/v1/openapi.json` is generated straight
 * from it, so the published contract cannot drift from the routes that exist. A route the app
 * does not serve (a ledger, a receipt, a job) is listed here with the reason it is not built, so
 * a machine reader gets an honest "not in this build" 404 rather than a hang.
 *
 * The first-party label travels with the data, not only with the page (section 1.3 clause 2):
 * every listing payload carries `firstParty` as a derived boolean.
 */
import { db } from './db.ts'
import { CHAIN } from './constants.ts'
import { jsonStringArray } from './json.ts'
import { CONTRACTS, type CategoryContract } from './classify.ts'
import { EVIDENCE_ORDER, type EvidenceRung, type Shelf } from './types.ts'
import { populationFacts, rungCounts, indexHealth, type PopulationFacts } from './queries.ts'

const CHAIN_ID = CHAIN.id
const SHELVES: readonly Shelf[] = ['rebalancing', 'grid-trading', 'yield', 'health-factor']
const VISIBILITIES = new Set(['listed', 'indexed', 'hidden', 'suppressed'])

export const MAX_PAGE_SIZE = 100
export const DEFAULT_PAGE_SIZE = 50

export interface Envelope<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Read `page` and `pageSize` from the query string, both clamped, never trusted as given. */
export function paging(sp: URLSearchParams): { page: number; pageSize: number; offset: number } {
  const rawSize = Number(sp.get('pageSize'))
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0 ? Math.min(Math.floor(rawSize), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
  const rawPage = Number(sp.get('page'))
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1
  return { page, pageSize, offset: (page - 1) * pageSize }
}

export function envelope<T>(items: T[], total: number, page: number, pageSize: number): Envelope<T> {
  return { items, page, pageSize, total, totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0 }
}

function one<T>(sql: string, ...args: unknown[]): T | null {
  return (db().prepare(sql).get(...(args as never[])) as T | undefined) ?? null
}
function many<T>(sql: string, ...args: unknown[]): T[] {
  return db().prepare(sql).all(...(args as never[])) as T[]
}

const RUNG_RANK = `CASE l.evidenceTier WHEN 'settled' THEN 6 WHEN 'payable' THEN 5 WHEN 'probed' THEN 4
  WHEN 'reachable' THEN 3 WHEN 'declared' THEN 2 ELSE 1 END`

/** A category as the API returns it: the buyer question, the io contract and the live counts. */
export function categoryView(c: CategoryContract) {
  const counts = rungCounts(c.shelf)
  return {
    slug: c.shelf,
    title: c.title,
    question: c.question,
    inputs: c.inputs,
    outputs: c.outputs,
    units: c.units,
    listed:
      one<{ c: number }>(
        "SELECT COUNT(*) c FROM listing WHERE chainId = ? AND category = ? AND visibility = 'listed'",
        CHAIN_ID,
        c.shelf,
      )?.c ?? 0,
    indexed:
      one<{ c: number }>(
        "SELECT COUNT(*) c FROM listing WHERE chainId = ? AND category = ? AND visibility = 'indexed'",
        CHAIN_ID,
        c.shelf,
      )?.c ?? 0,
    hireable: counts.payable + counts.settled,
    rungCounts: counts,
  }
}

export function categoriesPage(sp: URLSearchParams): Envelope<ReturnType<typeof categoryView>> {
  const { page, pageSize, offset } = paging(sp)
  const all = CONTRACTS.map(categoryView)
  return envelope(all.slice(offset, offset + pageSize), all.length, page, pageSize)
}

export function categoryContract(slug: string) {
  const c = CONTRACTS.find((x) => x.shelf === slug)
  if (!c) return null
  return {
    slug: c.shelf,
    title: c.title,
    question: c.question,
    inputs: c.inputs,
    outputs: c.outputs,
    units: c.units,
    // The signals a candidate is matched on, published so classification is auditable rather
    // than a black box. Regex sources, exactly what the classifier runs.
    signals: { strong: c.strong.map(String), weak: c.weak.map(String), exclude: c.exclude.map(String) },
  }
}

interface AgentApiRow {
  chainId: number
  agentId: string
  owner: string
  agentWallet: string | null
  name: string | null
  description: string | null
  endpointCount: number
  declaresX402: number
  registrationParsed: number
  feedbackCount: number
  duplicateClusterId: string | null
  firstSeenBlock: number
  lastSeenBlock: number
}

function agentView(r: AgentApiRow) {
  return {
    chainId: r.chainId,
    agentId: r.agentId,
    owner: r.owner,
    agentWallet: r.agentWallet,
    name: r.name,
    description: r.description,
    endpointCount: r.endpointCount,
    declaresX402: r.declaresX402 === 1,
    registrationParsed: r.registrationParsed === 1,
    feedbackCount: r.feedbackCount,
    inDuplicateCluster: r.duplicateClusterId !== null,
    firstSeenBlock: r.firstSeenBlock,
    lastSeenBlock: r.lastSeenBlock,
  }
}

/**
 * The agents list. Filters are `category`, `tier` and `page`. A category or tier filter joins to
 * listing, because those are listing facts and never agent facts. An unknown filter value narrows
 * to nothing rather than being ignored, so a typo returns an empty page instead of the whole set.
 */
export function agentsPage(sp: URLSearchParams): Envelope<ReturnType<typeof agentView>> {
  const { page, pageSize, offset } = paging(sp)
  const category = sp.get('category')
  const tier = sp.get('tier')
  const where: string[] = ['a.chainId = ?']
  const args: unknown[] = [CHAIN_ID]
  let join = ''
  if (category !== null || tier !== null) {
    join = 'JOIN listing l ON l.chainId = a.chainId AND l.agentId = a.agentId'
    if (category !== null) {
      where.push('l.category = ?')
      args.push(category)
    }
    if (tier !== null) {
      where.push('l.evidenceTier = ?')
      args.push(tier)
    }
  }
  const w = where.join(' AND ')
  const total = one<{ c: number }>(`SELECT COUNT(DISTINCT a.agentId) c FROM agent a ${join} WHERE ${w}`, ...args)?.c ?? 0
  const rows = many<AgentApiRow>(
    `SELECT DISTINCT a.chainId, a.agentId, a.owner, a.agentWallet, a.name, a.description,
            json_array_length(a.endpoints) AS endpointCount, a.declaresX402, a.registrationParsed,
            a.feedbackCount, a.duplicateClusterId, a.firstSeenBlock, a.lastSeenBlock
     FROM agent a ${join} WHERE ${w}
     ORDER BY CAST(a.agentId AS INTEGER) ASC
     LIMIT ? OFFSET ?`,
    ...args,
    pageSize,
    offset,
  )
  return envelope(rows.map(agentView), total, page, pageSize)
}

/** One agent, with its listings. Null when the id is unknown so the route can 404. */
export function agentOne(agentId: string) {
  if (!/^(0|[1-9][0-9]*)$/.test(agentId)) return null
  const a = one<AgentApiRow & { skills: string; endpoints: string; serviceKinds: string; trustModels: string }>(
    `SELECT a.chainId, a.agentId, a.owner, a.agentWallet, a.name, a.description,
            json_array_length(a.endpoints) AS endpointCount, a.declaresX402, a.registrationParsed,
            a.feedbackCount, a.duplicateClusterId, a.firstSeenBlock, a.lastSeenBlock,
            a.skills, a.endpoints, a.serviceKinds, a.trustModels
     FROM agent a WHERE a.chainId = ? AND a.agentId = ?`,
    CHAIN_ID,
    agentId,
  )
  if (!a) return null
  const listings = many<{
    listingId: string
    category: Shelf
    visibility: string
    evidenceTier: EvidenceRung
    priceBase: string | null
    priceToken: string | null
    priceDecimals: number | null
    priceScheme: string | null
    payTo: string | null
    inBazaar: number
    lastProbeAt: number | null
    lastProbeVerdict: string | null
    firstParty: number
  }>(
    `SELECT listingId, category, visibility, evidenceTier, priceBase, priceToken, priceDecimals,
            priceScheme, payTo, inBazaar, lastProbeAt, lastProbeVerdict, firstParty
     FROM listing WHERE chainId = ? AND agentId = ?`,
    CHAIN_ID,
    agentId,
  )
  return {
    ...agentView(a),
    endpoints: jsonStringArray(a.endpoints),
    skills: jsonStringArray(a.skills),
    serviceKinds: jsonStringArray(a.serviceKinds),
    trustModels: jsonStringArray(a.trustModels),
    listings: listings.map((l) => ({
      listingId: l.listingId,
      category: l.category,
      visibility: l.visibility,
      evidenceTier: l.evidenceTier,
      price:
        l.priceBase === null
          ? null
          : { base: l.priceBase, token: l.priceToken, decimals: l.priceDecimals, scheme: l.priceScheme },
      payTo: l.payTo,
      inBazaar: l.inBazaar === 1,
      lastProbeAt: l.lastProbeAt,
      lastProbeVerdict: l.lastProbeVerdict,
      firstParty: l.firstParty === 1,
    })),
  }
}

interface ListingApiRow {
  listingId: string
  agentId: string
  category: Shelf
  name: string | null
  visibility: string
  evidenceTier: EvidenceRung
  priceBase: string | null
  priceToken: string | null
  priceDecimals: number | null
  priceScheme: string | null
  payTo: string | null
  inBazaar: number
  lastProbeAt: number | null
  lastProbeVerdict: string | null
  firstParty: number
}

function listingView(l: ListingApiRow) {
  return {
    listingId: l.listingId,
    agentId: l.agentId,
    category: l.category,
    name: l.name,
    visibility: l.visibility,
    evidenceTier: l.evidenceTier,
    price:
      l.priceBase === null
        ? null
        : { base: l.priceBase, token: l.priceToken, decimals: l.priceDecimals, scheme: l.priceScheme },
    payTo: l.payTo,
    inBazaar: l.inBazaar === 1,
    lastProbeAt: l.lastProbeAt,
    lastProbeVerdict: l.lastProbeVerdict,
    firstParty: l.firstParty === 1,
  }
}

const LISTING_SELECT = `SELECT l.listingId, l.agentId, l.category, a.name, l.visibility, l.evidenceTier,
       l.priceBase, l.priceToken, l.priceDecimals, l.priceScheme, l.payTo, l.inBazaar,
       l.lastProbeAt, l.lastProbeVerdict, l.firstParty
FROM listing l JOIN agent a ON a.chainId = l.chainId AND a.agentId = l.agentId`

/** The listings list. Filters: `category`, `visibility`, `hireable` (payable or better). */
export function listingsPage(sp: URLSearchParams): Envelope<ReturnType<typeof listingView>> {
  const { page, pageSize, offset } = paging(sp)
  const where: string[] = ['l.chainId = ?']
  const args: unknown[] = [CHAIN_ID]
  const category = sp.get('category')
  if (category !== null) {
    where.push('l.category = ?')
    args.push(category)
  }
  const visibility = sp.get('visibility')
  if (visibility !== null) {
    // An unknown visibility narrows to nothing rather than being silently dropped.
    where.push('l.visibility = ?')
    args.push(VISIBILITIES.has(visibility) ? visibility : '__none__')
  }
  const hireable = sp.get('hireable')
  if (hireable === '1' || hireable === 'true') where.push("l.evidenceTier IN ('payable','settled')")
  const w = where.join(' AND ')
  const total =
    one<{ c: number }>(`SELECT COUNT(*) c FROM listing l WHERE ${w}`, ...args)?.c ?? 0
  const rows = many<ListingApiRow>(
    `${LISTING_SELECT}
     WHERE ${w}
     ORDER BY ${RUNG_RANK} DESC, l.firstParty ASC, CAST(l.agentId AS INTEGER) ASC
     LIMIT ? OFFSET ?`,
    ...args,
    pageSize,
    offset,
  )
  return envelope(rows.map(listingView), total, page, pageSize)
}

export function listingOne(listingId: string) {
  const l = one<ListingApiRow>(`${LISTING_SELECT} WHERE l.listingId = ?`, listingId)
  return l ? listingView(l) : null
}

interface ProbeApiRow {
  probeId: string
  listingId: string | null
  agentId: string
  url: string
  assertion: string
  verdict: string
  failureClass: string | null
  httpStatus: number | null
  sawPaymentRequired: number
  tlsOk: number
  latencyMs: number | null
  observedAt: number
  prober: string
  note: string | null
}

function probeView(p: ProbeApiRow) {
  return {
    probeId: p.probeId,
    listingId: p.listingId,
    agentId: p.agentId,
    url: p.url,
    assertion: p.assertion,
    verdict: p.verdict,
    failureClass: p.failureClass,
    httpStatus: p.httpStatus,
    sawPaymentRequired: p.sawPaymentRequired === 1,
    tlsOk: p.tlsOk === 1,
    latencyMs: p.latencyMs,
    observedAt: p.observedAt,
    prober: p.prober,
    note: p.note,
  }
}

/** The probes list. Filters: `listingId` and `since` (epoch ms, rows observed at or after it). */
export function probesPage(sp: URLSearchParams): Envelope<ReturnType<typeof probeView>> {
  const { page, pageSize, offset } = paging(sp)
  const where: string[] = ['1 = 1']
  const args: unknown[] = []
  const listingId = sp.get('listingId')
  if (listingId !== null) {
    where.push('listingId = ?')
    args.push(listingId)
  }
  const since = Number(sp.get('since'))
  if (Number.isFinite(since) && since > 0) {
    where.push('observedAt >= ?')
    args.push(since)
  }
  const w = where.join(' AND ')
  const total = one<{ c: number }>(`SELECT COUNT(*) c FROM probeResult WHERE ${w}`, ...args)?.c ?? 0
  const rows = many<ProbeApiRow>(
    `SELECT probeId, listingId, agentId, url, assertion, verdict, failureClass, httpStatus,
            sawPaymentRequired, tlsOk, latencyMs, observedAt, prober, note
     FROM probeResult WHERE ${w}
     ORDER BY observedAt DESC LIMIT ? OFFSET ?`,
    ...args,
    pageSize,
    offset,
  )
  return envelope(rows.map(probeView), total, page, pageSize)
}

/** The population facts and the rung counts, the numbers the thesis rests on. */
export function populationView(): PopulationFacts & { rungCounts: ReturnType<typeof rungCounts> } {
  return { ...populationFacts(), rungCounts: rungCounts() }
}

export function rungsView() {
  const overall = rungCounts()
  const byShelf = SHELVES.map((shelf) => ({ shelf, rungCounts: rungCounts(shelf) }))
  return { order: EVIDENCE_ORDER, overall, byShelf }
}

/** The index-health block, the same numbers `/status` renders, as JSON. */
export function statusView() {
  const h = indexHealth()
  return {
    chainId: CHAIN_ID,
    index: h,
    rungs: rungCounts(),
    population: populationFacts(),
    generatedAt: Date.now(),
  }
}

/**
 * The route table. Every `/v1` route is here once. Handlers are wired in their own files, and
 * `/v1/openapi.json` is generated from this array so the two cannot disagree. A `notBuilt` route
 * is a route the app deliberately answers 404 on, with the reason, so a machine reader is told
 * plainly rather than left hanging.
 */
export interface RouteParam {
  name: string
  in: 'query' | 'path'
  required?: boolean
  description: string
}

export interface RouteSpec {
  method: 'GET'
  path: string
  summary: string
  params?: RouteParam[]
  /** True when this route returns the paging envelope. */
  paged?: boolean
  /** Present when the route is not built in this entry. The value is the reason. */
  notBuilt?: string
}

export const ROUTES: readonly RouteSpec[] = [
  { method: 'GET', path: '/v1/categories', summary: 'The four capability categories with their live counts.', paged: true },
  {
    method: 'GET',
    path: '/v1/categories/{slug}/contract',
    summary: 'One category contract: the buyer question, the io shape and the classifier signals.',
    params: [{ name: 'slug', in: 'path', required: true, description: 'rebalancing, grid-trading, yield or health-factor' }],
  },
  {
    method: 'GET',
    path: '/v1/agents',
    summary: 'Indexed ERC-8004 agents, paged.',
    paged: true,
    params: [
      { name: 'category', in: 'query', description: 'narrow to agents holding a listing on this shelf' },
      { name: 'tier', in: 'query', description: 'narrow to listings at this evidence rung' },
      { name: 'page', in: 'query', description: '1-based page number' },
      { name: 'pageSize', in: 'query', description: 'rows per page, 1 to 100, default 50' },
    ],
  },
  {
    method: 'GET',
    path: '/v1/agents/{agentId}',
    summary: 'One agent with its registration record and its listings.',
    params: [{ name: 'agentId', in: 'path', required: true, description: 'decimal agent id' }],
  },
  {
    method: 'GET',
    path: '/v1/listings',
    summary: 'Marketplace listings, paged.',
    paged: true,
    params: [
      { name: 'category', in: 'query', description: 'one of the four shelf slugs' },
      { name: 'visibility', in: 'query', description: 'listed, indexed, hidden or suppressed' },
      { name: 'hireable', in: 'query', description: '1 to return only rows at payable or better' },
      { name: 'page', in: 'query', description: '1-based page number' },
      { name: 'pageSize', in: 'query', description: 'rows per page, 1 to 100, default 50' },
    ],
  },
  {
    method: 'GET',
    path: '/v1/listings/{listingId}',
    summary: 'One listing.',
    params: [{ name: 'listingId', in: 'path', required: true, description: 'the listing id, chainId:agentId:category' }],
  },
  {
    method: 'GET',
    path: '/v1/probes',
    summary: 'Probe results, newest first, paged.',
    paged: true,
    params: [
      { name: 'listingId', in: 'query', description: 'narrow to one listing' },
      { name: 'since', in: 'query', description: 'epoch milliseconds, rows observed at or after' },
      { name: 'page', in: 'query', description: '1-based page number' },
      { name: 'pageSize', in: 'query', description: 'rows per page, 1 to 100, default 50' },
    ],
  },
  { method: 'GET', path: '/v1/population', summary: 'The population facts and rung counts the thesis rests on.' },
  { method: 'GET', path: '/v1/rungs', summary: 'Rung counts overall and per shelf.' },
  { method: 'GET', path: '/v1/status', summary: 'The index health, rungs and population, the same numbers /status renders.' },
  { method: 'GET', path: '/v1/openapi.json', summary: 'This document, OpenAPI 3.1, generated from the route table.' },
  {
    method: 'GET',
    path: '/v1/jobs/{jobId}',
    summary: 'An ERC-8183 job.',
    notBuilt: 'The escrow index is out of scope for this entry, so no job resource is served. See docs/decisions.',
    params: [{ name: 'jobId', in: 'path', required: true, description: 'job id' }],
  },
  {
    method: 'GET',
    path: '/v1/receipts/{receiptId}',
    summary: 'A settled-job receipt.',
    notBuilt: 'Receipts with a recompute command are not built in this entry. A settled hire records its transaction hash instead.',
    params: [{ name: 'receiptId', in: 'path', required: true, description: 'receipt id' }],
  },
  {
    method: 'GET',
    path: '/v1/ledger',
    summary: 'The signed append-only ledger.',
    notBuilt: 'The ledger hash chain is not built in this entry. See the status page.',
  },
] as const

/** A JSON 404 body for a route named in the table but not built, carrying the reason. */
export function notBuiltBody(path: string): { error: string; route: string; detail: string } | null {
  const spec = ROUTES.find((r) => r.path === path)
  if (!spec?.notBuilt) return null
  return { error: 'not_built', route: path, detail: spec.notBuilt }
}

/**
 * Build the OpenAPI 3.1 document from the route table. One pass, no second hand-typed copy, so a
 * route added above appears here for free. `info.license` is populated, which the document (l.165)
 * asks for explicitly.
 */
export function openApiDocument(origin: string): Record<string, unknown> {
  const pagedSchema = {
    type: 'object',
    required: ['items', 'page', 'pageSize', 'total', 'totalPages'],
    properties: {
      items: { type: 'array', items: {} },
      page: { type: 'integer' },
      pageSize: { type: 'integer', maximum: MAX_PAGE_SIZE },
      total: { type: 'integer' },
      totalPages: { type: 'integer' },
    },
  }
  const paths: Record<string, Record<string, unknown>> = {}
  for (const r of ROUTES) {
    const params = (r.params ?? []).map((p) => ({
      name: p.name,
      in: p.in,
      required: p.in === 'path' ? true : Boolean(p.required),
      schema: { type: 'string' },
      description: p.description,
    }))
    const hasPathParam = (r.params ?? []).some((p) => p.in === 'path')
    const responses: Record<string, unknown> = r.notBuilt
      ? { '404': { description: `Not built in this entry. ${r.notBuilt}` } }
      : {
          '200': {
            description: r.paged ? 'A paged envelope.' : 'The resource.',
            content: {
              'application/json': { schema: r.paged ? pagedSchema : { type: 'object' } },
            },
          },
          ...(hasPathParam ? { '404': { description: 'No such resource.' } } : {}),
        }
    paths[r.path] = {
      get: {
        summary: r.summary,
        ...(params.length > 0 ? { parameters: params } : {}),
        responses,
      },
    }
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Muster read API',
      version: '1',
      summary: 'Read-only access to the Muster index of ERC-8004 agents on BNB Smart Chain.',
      description:
        'No authentication. Every list is returned as { items, page, pageSize, total, totalPages } and pageSize is capped at 100.',
      license: { name: 'LicenseRef-zkasuran-SAND-1.0', url: `${origin}/docs/licence` },
    },
    servers: [{ url: origin }],
    paths,
  }
}
