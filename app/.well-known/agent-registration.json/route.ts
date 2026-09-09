/**
 * The ERC-8004 domain proof for the whole Muster origin, docs/04-AGENT-PROTOCOL.md section 1 and
 * probe C10. It lists every reserved agent's registration triple and its card endpoint. C10 reads the
 * content type rather than the status, because a 200 with text/html is a defect the doc quotes live,
 * so this is served as application/json.
 */
import { NextRequest, NextResponse } from 'next/server'
import { wellKnownRegistration } from '@/lib/protocol'
import { publicOrigin } from '@/lib/origin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const origin = publicOrigin(req.headers, new URL(req.url).origin)
  const doc = wellKnownRegistration({ origin })
  return NextResponse.json(doc, { status: 200, headers: { 'cache-control': 'public, max-age=300' } })
}
