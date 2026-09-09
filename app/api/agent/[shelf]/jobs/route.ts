/**
 * The invoke and poll shape for a first-party agent, docs/04-AGENT-PROTOCOL.md sections 3 to 5.
 * Additive: the synchronous paid path at ../route.ts is unchanged and stays the default. This POST
 * is the priced create for shape B (poll with a job id). It settles through the same facilitator and
 * the same lib/settle path as the synchronous route, then stores a job the free poll route reads.
 *
 * Two rules this route follows that the synchronous route predates. Rule B9: a paid caller never gets
 * a 400 or a 422 about its own body. A create with a required input missing refuses before it settles,
 * so nothing is charged, while a create whose input turns out unusable after settlement is a coded
 * refusal, not a 400. Rule B5: a refusal is a success, answered 200 with a code from the closed set.
 */
import { NextRequest, NextResponse } from 'next/server'
import { findAgent, BadRequest, FIRST_PARTY } from '@/lib/agents'
import { build402, verifyPayment, settlePayment, paymentRequiredHeaders } from '@/lib/b402'
import { verifyEip3009Envelope } from '@/lib/x402-local'
import { settleEip3009, facilitatorState, markSettled } from '@/lib/settle'
import { publicOrigin } from '@/lib/origin'
import { skillIdFor } from '@/lib/protocol'
import { missingRequired, completedJob, refusedJob, storeJob, jobResource, blockOf } from '@/lib/jobs'
import type { Shelf } from '@/lib/types'

export const dynamic = 'force-dynamic'

const PAY_TO = process.env.MUSTER_PAYTO ?? null

function paymentResponseHeaders(tx: string | null, via: string): Record<string, string> {
  const body = Buffer.from(JSON.stringify({ success: true, transaction: tx, network: 'eip155:56', via })).toString('base64')
  return { 'PAYMENT-RESPONSE': body, 'x-payment-response': body }
}

/** Params from the URL query, then the JSON body layered on top, so both the GET and POST forms work. */
async function readParams(req: NextRequest, url: URL): Promise<URLSearchParams> {
  const params = new URLSearchParams(url.search)
  try {
    const body: unknown = await req.json()
    if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
      for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
        if (typeof v === 'string') params.set(k, v)
        else if (typeof v === 'number' || typeof v === 'boolean') params.set(k, String(v))
      }
    }
  } catch {
    // The body may be absent or not JSON. The query alone is a valid request.
  }
  return params
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ shelf: string }> }) {
  const { shelf } = await ctx.params
  const agent = findAgent(shelf)
  if (!agent) {
    return NextResponse.json({ error: 'no such agent', available: FIRST_PARTY.map((a) => a.slug) }, { status: 404 })
  }
  const slug = agent.slug as Shelf
  const skillId = skillIdFor(slug)
  const url = new URL(req.url)
  const origin = publicOrigin(req.headers, url.origin)
  const params = await readParams(req, url)

  const header = req.headers.get('payment-signature') ?? req.headers.get('x-payment')
  if (!header) {
    if (!PAY_TO) {
      return NextResponse.json(
        {
          error: 'payment_not_configured',
          detail:
            'This deployment has no payout address set, so it cannot issue a job-create challenge a ' +
            'buyer could satisfy. The capability contract is free at GET /api/agent/' + slug + '?preview=1.',
        },
        { status: 503 },
      )
    }
    const challenge = build402({
      resource: origin + url.pathname,
      description: agent.summary,
      priceBase: agent.priceBase,
      token: 'USD1',
      payTo: PAY_TO,
    })
    return NextResponse.json(challenge.body, { status: 402, headers: paymentRequiredHeaders(challenge.body) })
  }

  // A required input is missing. Refuse before settling, so a paid attempt is never charged for a
  // request that could not run. The answer is a 200 refusal rather than a 400. Rule B9.
  const missing = missingRequired(agent.inputs, params)
  if (missing.length > 0) {
    const rec = refusedJob({ shelf: slug, skillId, params, code: 'inputUnsupported', chargedBase: '0', paymentTx: null })
    storeJob(rec)
    return NextResponse.json(
      { ...jobResource(rec), refusal: { code: 'inputUnsupported', detail: `missing required input(s): ${missing.join(', ')}`, chargedBase: '0' } },
      { status: 200 },
    )
  }

  let envelope: unknown
  try {
    envelope = JSON.parse(Buffer.from(header, 'base64').toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'payment header is not base64 JSON' }, { status: 400 })
  }

  // Verify then settle then work, the same order and the same functions as the synchronous route.
  let settledTx: string | null = null
  let via: 'b402' | 'self' = 'b402'
  if (process.env.B402_BASE_URL) {
    const verified = await verifyPayment(envelope)
    if (!verified.isValid) return NextResponse.json({ error: 'payment_invalid', reason: verified.reason }, { status: 402 })
    const settled = await settlePayment(envelope)
    if (!settled.success) {
      return NextResponse.json({ error: 'payment_not_settled', reason: settled.errorReason, transaction: settled.transaction }, { status: 402 })
    }
    settledTx = settled.transaction
  } else {
    via = 'self'
    if (!PAY_TO) return NextResponse.json({ error: 'payment_not_configured' }, { status: 503 })
    const local = await verifyEip3009Envelope(envelope, { payTo: PAY_TO, value: agent.priceBase })
    if (!local.ok || !local.authorization || !local.signature) {
      return NextResponse.json({ error: 'payment_invalid', reason: local.reason }, { status: 402 })
    }
    const fac = await facilitatorState()
    if (!fac.canSettle) {
      return NextResponse.json(
        { error: 'payment_not_settled', reason: `signature valid, settlement unavailable: ${fac.reason}`, facilitator: fac.address },
        { status: 402 },
      )
    }
    const settled = await settleEip3009(local.authorization, local.signature)
    if (!settled.ok) return NextResponse.json({ error: 'payment_not_settled', reason: settled.reason, transaction: settled.transaction }, { status: 402 })
    settledTx = settled.transaction
    if (settledTx) markSettled(agent.slug, settledTx)
  }

  const asyncPreferred = /respond-async/i.test(req.headers.get('prefer') ?? '')
  const respondHeaders = paymentResponseHeaders(settledTx, via)

  try {
    const result = await agent.run(params)
    const rec = completedJob({ shelf: slug, skillId, params, result, inputsAsOfBlock: blockOf(result), paymentTx: settledTx })
    storeJob(rec)
    const location = `${origin}/api/agent/${slug}/jobs/${rec.jobId}`
    if (asyncPreferred) {
      return NextResponse.json(jobResource(rec, { retryAfterSeconds: 2 }), {
        status: 202,
        headers: { ...respondHeaders, Location: location, 'Retry-After': '2', 'Preference-Applied': 'respond-async' },
      })
    }
    return NextResponse.json({ ...jobResource(rec), jobUrl: location }, { status: 200, headers: respondHeaders })
  } catch (e) {
    if (e instanceof BadRequest) {
      // Paid, then the input turned out unusable. A coded refusal, never a 400 after settlement. The
      // charge is stated honestly because the payment did move.
      const rec = refusedJob({ shelf: slug, skillId, params, code: 'inputUnsupported', chargedBase: agent.priceBase, paymentTx: settledTx })
      storeJob(rec)
      return NextResponse.json(
        { ...jobResource(rec), refusal: { code: 'inputUnsupported', detail: e.message, chargedBase: agent.priceBase } },
        { status: 200, headers: respondHeaders },
      )
    }
    throw e
  }
}
