/**
 * The free poll for a job, docs/04-AGENT-PROTOCOL.md section 4 shape B. It returns the job's state
 * and, once terminal, the deliverable with the hash that recomputes under the declared rule, in one
 * body. It is never priced: charging per poll would meter the buyer's client rather than the work.
 * An unknown id is an RFC 9457 problem document, which is the error shape the whole wire uses.
 */
import { NextRequest, NextResponse } from 'next/server'
import { findAgent, FIRST_PARTY } from '@/lib/agents'
import { readJob, jobResource } from '@/lib/jobs'
import { publicOrigin } from '@/lib/origin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ shelf: string; jobId: string }> }) {
  const { shelf, jobId } = await ctx.params
  const agent = findAgent(shelf)
  if (!agent) {
    return NextResponse.json({ error: 'no such agent', available: FIRST_PARTY.map((a) => a.slug) }, { status: 404 })
  }
  const rec = readJob(jobId)
  if (!rec || rec.shelf !== agent.slug) {
    const origin = publicOrigin(req.headers, new URL(req.url).origin)
    return NextResponse.json(
      {
        type: `${origin}/docs/problems/unknown-job`,
        status: 404,
        title: 'unknown job',
        detail: `no job ${jobId} on ${shelf}. An expired job 404s after its retention window, which the card declares.`,
        instance: new URL(req.url).pathname,
      },
      { status: 404, headers: { 'content-type': 'application/problem+json', 'cache-control': 'no-store' } },
    )
  }
  const terminal = rec.terminalState !== null
  const headers: Record<string, string> = { 'cache-control': 'no-store' }
  if (!terminal) headers['Retry-After'] = '5'
  return NextResponse.json(jobResource(rec, { retryAfterSeconds: 5 }), { status: 200, headers })
}
