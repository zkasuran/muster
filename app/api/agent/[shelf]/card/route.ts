/**
 * The Muster card for one reference agent, docs/04-AGENT-PROTOCOL.md section 1. A plain HTTPS
 * document, hash pinned, declared as the `muster` service in the registration record. The card's
 * payTo is the address this deployment settles to, so it matches the 402 the paid path issues.
 */
import { NextRequest, NextResponse } from 'next/server'
import { findAgent, FIRST_PARTY } from '@/lib/agents'
import { agentByShelf } from '@/lib/altana'
import { musterCard } from '@/lib/protocol'
import { publicOrigin } from '@/lib/origin'
import type { Shelf } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ shelf: string }> }) {
  const { shelf } = await ctx.params
  const agent = findAgent(shelf)
  if (!agent) {
    return NextResponse.json({ error: 'no such agent', available: FIRST_PARTY.map((a) => a.slug) }, { status: 404 })
  }
  const origin = publicOrigin(req.headers, new URL(req.url).origin)
  // The running deployment settles to MUSTER_PAYTO. Absent one, name the agent's own pinned Altana
  // wallet so the card still carries a real address rather than a zero placeholder.
  const payTo =
    process.env.MUSTER_PAYTO ?? agentByShelf(agent.slug as Shelf)?.wallet ?? '0x0000000000000000000000000000000000000000'
  const card = musterCard(agent.slug as Shelf, { origin, payTo })
  return NextResponse.json(card, { status: 200, headers: { 'cache-control': 'public, max-age=60' } })
}
