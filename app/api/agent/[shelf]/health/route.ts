/**
 * The health check for one reference agent, docs/04-AGENT-PROTOCOL.md section 2. It answers inside
 * two seconds and is never cached. Its `checkedAt` is the moment it actually re-read its dependency,
 * so two probes a minute apart return different values. A frozen checkedAt is exactly what a service
 * that has quietly stopped looks like from outside, which is the failure this check is built to catch.
 */
import { NextRequest, NextResponse } from 'next/server'
import { findAgent, FIRST_PARTY } from '@/lib/agents'
import { healthDoc } from '@/lib/protocol'
import { withRpc } from '@/lib/rpc'
import type { Shelf } from '@/lib/types'

export const dynamic = 'force-dynamic'

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('rpc timeout')), ms)),
  ])
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ shelf: string }> }) {
  const { shelf } = await ctx.params
  const agent = findAgent(shelf)
  if (!agent) {
    return NextResponse.json({ error: 'no such agent', available: FIRST_PARTY.map((a) => a.slug) }, { status: 404 })
  }
  const started = Date.now()
  let rpcOk = false
  let latency: number | null = null
  try {
    await withTimeout(withRpc((c) => c.getBlockNumber()), 1800)
    rpcOk = true
    latency = Date.now() - started
  } catch {
    latency = Date.now() - started
  }
  const doc = healthDoc(agent.slug as Shelf, { checkedAt: new Date().toISOString(), rpcOk, rpcLatencyMs: latency })
  return NextResponse.json(doc, { status: 200, headers: { 'cache-control': 'no-store' } })
}
