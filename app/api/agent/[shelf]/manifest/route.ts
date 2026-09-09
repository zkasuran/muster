/**
 * The manifest for one reference agent, docs/04-AGENT-PROTOCOL.md section 2. The capability
 * declaration, agreeing with the card on ids, prices, rails, schemas and delivery target, plus the
 * live block it was read at. The block read is cached for 30 s and falls back to unknown rather than
 * failing the whole document.
 */
import { NextRequest, NextResponse } from 'next/server'
import { findAgent, FIRST_PARTY } from '@/lib/agents'
import { manifest } from '@/lib/protocol'
import { publicOrigin } from '@/lib/origin'
import { withRpc } from '@/lib/rpc'
import { cached } from '@/lib/cache'
import type { Shelf } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ shelf: string }> }) {
  const { shelf } = await ctx.params
  const agent = findAgent(shelf)
  if (!agent) {
    return NextResponse.json({ error: 'no such agent', available: FIRST_PARTY.map((a) => a.slug) }, { status: 404 })
  }
  const origin = publicOrigin(req.headers, new URL(req.url).origin)
  let block: number | null = null
  try {
    block = await cached('protocol.block', 30, async () => Number(await withRpc((c) => c.getBlockNumber())))
  } catch {
    block = null
  }
  const man = manifest(agent.slug as Shelf, {
    origin,
    freshness: { block, observedAt: new Date().toISOString(), source: 'bsc-rpc' },
  })
  return NextResponse.json(man, { status: 200, headers: { 'cache-control': 'public, max-age=60' } })
}
