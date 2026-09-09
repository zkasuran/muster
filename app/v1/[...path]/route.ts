/**
 * The `/v1` read API, docs/15-SYSTEM.md section 1.3. One catch-all dispatcher, because the route
 * table in lib/v1.ts is the single source of truth and the OpenAPI document is generated from the
 * same array. No auth. Every list is the paging envelope { items, page, pageSize, total,
 * totalPages }, pageSize capped at 100.
 *
 * A route named in the table but not built in this entry (a ledger, a receipt, a job) answers a
 * JSON 404 carrying the reason, so a machine reader is told plainly rather than left to hang or
 * guess. An unknown path answers a 404 that lists the routes that do exist.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  ROUTES,
  notBuiltBody,
  categoriesPage,
  categoryContract,
  agentsPage,
  agentOne,
  listingsPage,
  listingOne,
  probesPage,
  populationView,
  rungsView,
  statusView,
  openApiDocument,
} from '@/lib/v1'

export const dynamic = 'force-dynamic'

/** The public origin, not `req.url`, which reads as localhost behind the reverse proxy. */
function publicOrigin(req: NextRequest, fallback: URL): string {
  const configured = process.env.MUSTER_ORIGIN_URL
  if (configured) return configured.replace(/\/+$/, '')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (host) return `${req.headers.get('x-forwarded-proto') ?? 'https'}://${host}`
  return fallback.origin
}

const JSON_HEADERS = { 'cache-control': 'no-store' }

function ok(body: unknown): NextResponse {
  return NextResponse.json(body, { status: 200, headers: JSON_HEADERS })
}
function notFound(body: unknown): NextResponse {
  return NextResponse.json(body, { status: 404, headers: JSON_HEADERS })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const seg = path ?? []
  const sp = req.nextUrl.searchParams

  // Static-shaped routes first.
  if (seg.length === 1) {
    switch (seg[0]) {
      case 'categories':
        return ok(categoriesPage(sp))
      case 'agents':
        return ok(agentsPage(sp))
      case 'listings':
        return ok(listingsPage(sp))
      case 'probes':
        return ok(probesPage(sp))
      case 'population':
        return ok(populationView())
      case 'rungs':
        return ok(rungsView())
      case 'status':
        return ok(statusView())
      case 'openapi.json':
        return ok(openApiDocument(publicOrigin(req, req.nextUrl)))
      case 'ledger':
        return notFound(notBuiltBody('/v1/ledger'))
    }
  }

  if (seg.length === 2) {
    // /v1/agents/{agentId}
    if (seg[0] === 'agents') {
      const a = agentOne(seg[1] ?? '')
      return a ? ok(a) : notFound({ error: 'not_found', detail: `no agent ${seg[1]}` })
    }
    // /v1/listings/{listingId}
    if (seg[0] === 'listings') {
      const l = listingOne(seg[1] ?? '')
      return l ? ok(l) : notFound({ error: 'not_found', detail: `no listing ${seg[1]}` })
    }
    // /v1/jobs/{jobId}, /v1/receipts/{receiptId}: documented 404, not built in this entry.
    if (seg[0] === 'jobs') return notFound(notBuiltBody('/v1/jobs/{jobId}'))
    if (seg[0] === 'receipts') return notFound(notBuiltBody('/v1/receipts/{receiptId}'))
  }

  // /v1/categories/{slug}/contract
  if (seg.length === 3 && seg[0] === 'categories' && seg[2] === 'contract') {
    const c = categoryContract(seg[1] ?? '')
    return c ? ok(c) : notFound({ error: 'not_found', detail: `no category ${seg[1]}` })
  }

  return notFound({
    error: 'not_found',
    detail: `no route /v1/${seg.join('/')}`,
    routes: ROUTES.map((r) => r.path),
  })
}
