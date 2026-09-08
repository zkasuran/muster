/**
 * The buyer-facing hire API behind the hire page. Three actions, all POST, all JSON:
 *   typed-data  -> the exact EIP-712 document the wallet should sign
 *   verify      -> recover the signer, check the balance, record the attempt, return the envelope
 *   sample      -> run the agent on its documented example input, free, labelled as a sample
 *
 * The sample exists so a judge without a wallet can see the agent do real work. It is rate
 * limited per address and it is labelled on every response, so it cannot be mistaken for a
 * paid call.
 */
import { NextRequest, NextResponse } from 'next/server'
import { offerTypedData, verifyHire, HireError } from '@/lib/hire'
import { findAgent, BadRequest } from '@/lib/agents'

export const dynamic = 'force-dynamic'

const sampleHits = new Map<string, number[]>()
const SAMPLE_PER_10_MIN = 6

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const hits = (sampleHits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000)
  if (hits.length >= SAMPLE_PER_10_MIN) return true
  hits.push(now)
  sampleHits.set(ip, hits)
  return false
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'body must be JSON' }, { status: 400 })
  }
  const action = String(body['action'] ?? '')
  const shelf = String(body['shelf'] ?? '')

  try {
    if (action === 'typed-data') {
      const offer = offerTypedData(shelf, String(body['from'] ?? ''))
      return NextResponse.json(offer)
    }
    if (action === 'verify') {
      const out = await verifyHire({
        shelf,
        from: String(body['from'] ?? ''),
        signature: String(body['signature'] ?? ''),
        nonce: String(body['nonce'] ?? ''),
        validAfter: Number(body['validAfter']),
        validBefore: Number(body['validBefore']),
      })
      return NextResponse.json(out)
    }
    if (action === 'sample') {
      const agent = findAgent(shelf)
      if (!agent) return NextResponse.json({ error: 'no such agent' }, { status: 404 })
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
      if (rateLimited(ip)) {
        return NextResponse.json({ error: 'sample rate limit, six per ten minutes per address' }, { status: 429 })
      }
      const params = new URLSearchParams()
      for (const i of agent.inputs) if (i.required) params.set(i.name, i.example)
      const started = Date.now()
      const result = await agent.run(params)
      return NextResponse.json({
        sample: true,
        note: 'Free sample on the documented example input. The paid endpoint returns the same shape for your own input.',
        agent: agent.name,
        shelf: agent.slug,
        input: Object.fromEntries(params),
        elapsedMs: Date.now() - started,
        result,
      })
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    if (e instanceof HireError) return NextResponse.json({ error: e.message }, { status: e.status })
    if (e instanceof BadRequest) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }
}
