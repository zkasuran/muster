/**
 * The schema route for one reference agent, docs/04-AGENT-PROTOCOL.md section 2. Free description off
 * the paid path: the input and output schemas plus one worked example per skill, returning no computed
 * result. A buyer reads what they are buying here before anything is paid for.
 */
import { NextRequest, NextResponse } from 'next/server'
import { findAgent, FIRST_PARTY } from '@/lib/agents'
import { schemaDoc } from '@/lib/protocol'
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
  const doc = schemaDoc(agent.slug as Shelf, { origin })
  return NextResponse.json(doc, { status: 200, headers: { 'cache-control': 'public, max-age=60' } })
}
