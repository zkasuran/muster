/**
 * sitemap.xml, referenced by robots.txt. Lists the stable public routes a crawler should know about:
 * the landing, the four shelves, the four reference agents, and the read surfaces (status, compare,
 * search, report, stack, docs, list-agent). It deliberately omits the paid /api/agent/ endpoints,
 * which answer 402 rather than content, and the throwaway query-string surfaces. Origin-aware via
 * publicOrigin, like the other generated files, so the entries are absolute and correct behind the
 * proxy. Every path here is one tools/judge-walk.py already walks green.
 */
import { NextRequest } from 'next/server'
import { publicOrigin } from '@/lib/origin'
import { SHELVES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const RESERVED_AGENTS = ['900000001', '900000002', '900000003', '900000004'] as const

export async function GET(req: NextRequest) {
  const o = publicOrigin(req.headers, new URL(req.url).origin)

  const paths = [
    '/',
    ...SHELVES.map((s) => `/shelf/${s}`),
    ...RESERVED_AGENTS.map((id) => `/agent/${id}`),
    ...SHELVES.map((s) => `/hire/${s}`),
    '/status',
    '/compare',
    '/search',
    '/report',
    '/stack',
    '/docs',
    '/list-agent',
    '/llms.txt',
  ]

  const urls = paths
    .map((p) => `  <url><loc>${o}${p === '/' ? '' : p}</loc></url>`)
    .join('\n')
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`

  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
}
