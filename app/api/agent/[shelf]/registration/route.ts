/**
 * The ERC-8004 registration document for one reference agent, the target a `tokenURI` would resolve
 * to. It carries the registration-v1 shape live BSC agents use, a `muster` service pointing at the
 * card, and services[].skills as OASF-style strings the classifier reads.
 */
import { NextRequest, NextResponse } from 'next/server'
import { findAgent, FIRST_PARTY } from '@/lib/agents'
import { registrationDocument } from '@/lib/protocol'
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
  const doc = registrationDocument(agent.slug as Shelf, { origin })
  return NextResponse.json(doc, { status: 200, headers: { 'cache-control': 'public, max-age=60' } })
}
