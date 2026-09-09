/**
 * robots.txt. Muster wants to be read by programs, so nothing here is a wall: every page is public
 * and server rendered, and the point of the site is discovery. What this file does is state the two
 * boundaries the code already enforces, so a well-behaved crawler or agent honours them without
 * having to be refused:
 *   - the paid agent endpoints under /api/agent/ answer HTTP 402, not content, so crawling them
 *     gathers nothing and only spends the crawler's budget. Disallowed as a courtesy, not a secret.
 *   - Next's build assets under /_next/ are machine noise, not content.
 * The Sitemap and the llms.txt line point a reader at the curated index instead. Origin-aware,
 * like /.well-known/agent-registration.json, because the app sits behind a proxy and req.url reads
 * as localhost.
 */
import { NextRequest } from 'next/server'
import { publicOrigin } from '@/lib/origin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const origin = publicOrigin(req.headers, new URL(req.url).origin)
  const body = [
    '# Muster — a marketplace for ERC-8004 agents on BNB Smart Chain.',
    '# Programs are welcome. See llms.txt for a curated, machine-readable index.',
    '',
    'User-agent: *',
    'Allow: /',
    '# Paid endpoints answer 402, not content, so crawling them gathers nothing.',
    'Disallow: /api/agent/',
    'Disallow: /_next/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    `# Index for language models: ${origin}/llms.txt`,
    '',
  ].join('\n')
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
}
