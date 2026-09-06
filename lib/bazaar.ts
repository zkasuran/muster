/**
 * B402 Bazaar, Binance's index of paid endpoints on BSC. Read-only, unauthenticated, and the
 * only source available that proves a payment to an address has actually cleared.
 *
 * Measured on 2026-09-05 and recorded in docs/research/R17-binance-agent-os.md: 979
 * resources, all `eip155:56`, behind **8** distinct payout addresses, one publisher holding
 * 941 of them. So this is evidence of payability, not a supply of independent sellers, and
 * the join it feeds is the top rung of a ladder rather than a catalogue.
 *
 * The documented `quality` block carrying 30-day call counts and unique payers is `null` on
 * every live entry across all three endpoints, so nothing here reports usage. What it does
 * report is the fact of listing, which requires a confirmed settle, plus `lastUpdated`, which
 * their docs say only advances on a settle.
 */
import { B402 } from './constants.ts'

export interface BazaarAccept {
  scheme: string
  network: string
  asset: string
  maxAmountRequired: string
  payTo: string
}

export interface BazaarResource {
  resource: string
  type: string
  x402Version: number
  description: string | null
  accepts: BazaarAccept[]
  lastUpdated: number | null
  /** Documented by Binance, null on every live entry as of 2026-09-05. Never rendered. */
  quality: { l30DaysTotalCalls?: number; l30DaysUniquePayers?: number; lastCalledAt?: number } | null
}

interface Envelope<T> {
  code: string
  success: boolean
  data: T | null
  message: string | null
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${B402.bazaarBase}${path}`, {
    headers: { accept: 'application/json', 'user-agent': 'muster/0.1 (+https://muster.zkasuran.dev)' },
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error(`bazaar ${path} -> HTTP ${res.status}`)
  const body = (await res.json()) as Envelope<T>
  if (!body.success || body.data === null) {
    throw new Error(`bazaar ${path} -> ${body.code} ${body.message ?? 'no data'}`)
  }
  return body.data
}

/** Every resource, paged. `limit` is capped at 100 by the API and `offset` works here. */
export async function fetchAllResources(): Promise<BazaarResource[]> {
  const out: BazaarResource[] = []
  for (let offset = 0; offset < 5_000; offset += 100) {
    const page = await get<{ items: BazaarResource[]; pagination: { total: number } }>(
      `/bazaar/resources?limit=100&offset=${offset}`,
    )
    if (!page.items || page.items.length === 0) break
    out.push(...page.items)
    if (out.length >= page.pagination.total) break
  }
  return out
}

/** Resources for one payout address. This is the join lookup. */
export async function fetchByPayTo(payTo: string): Promise<BazaarResource[]> {
  const page = await get<{ resources: BazaarResource[] }>(
    `/bazaar/merchant?payTo=${encodeURIComponent(payTo)}&limit=100&offset=0`,
  )
  return page.resources ?? []
}

export interface BazaarIndex {
  /** payout address, lowercased, to the resources it publishes. */
  byPayTo: Map<string, BazaarResource[]>
  resources: BazaarResource[]
  observedAt: number
  /** Stated plainly because it is the honest ceiling on the join. */
  distinctPayTo: number
  largestPublisherShare: number
}

export function indexResources(resources: BazaarResource[], observedAt: number): BazaarIndex {
  const byPayTo = new Map<string, BazaarResource[]>()
  const acceptsPerPayTo = new Map<string, number>()
  let totalAccepts = 0
  for (const r of resources) {
    for (const a of r.accepts ?? []) {
      if (!a.payTo) continue
      const key = a.payTo.toLowerCase()
      const list = byPayTo.get(key) ?? []
      if (!list.includes(r)) list.push(r)
      byPayTo.set(key, list)
      acceptsPerPayTo.set(key, (acceptsPerPayTo.get(key) ?? 0) + 1)
      totalAccepts++
    }
  }
  const largest = [...acceptsPerPayTo.values()].reduce((m, n) => Math.max(m, n), 0)
  return {
    byPayTo,
    resources,
    observedAt,
    distinctPayTo: byPayTo.size,
    largestPublisherShare: totalAccepts > 0 ? largest / totalAccepts : 0,
  }
}

/**
 * Pick the accept entry a buyer should be quoted. USD1 over `eip3009` first, because that is
 * what the live ecosystem actually uses (958 of 989 options price in USD1, 979 use eip3009)
 * and because it is the only scheme that needs no prior approval from the buyer.
 */
export function preferredAccept(accepts: BazaarAccept[]): BazaarAccept | null {
  if (!accepts || accepts.length === 0) return null
  const rank = (a: BazaarAccept): number => {
    let score = 0
    if (a.scheme === 'eip3009') score += 4
    else if (a.scheme === 'permit2-exact') score += 2
    if (a.asset.toLowerCase() === '0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d') score += 2
    if (a.network === 'eip155:56') score += 1
    return score
  }
  return [...accepts].sort((x, y) => rank(y) - rank(x))[0] ?? null
}
