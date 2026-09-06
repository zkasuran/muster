/**
 * The paid endpoint for a first-party agent. This is the hire path, and it is the same path a
 * third-party listing would take: an unpaid request gets HTTP 402 with payment requirements a
 * buyer can satisfy, and a request carrying a valid payment gets the work.
 *
 * A GET with `?preview=1` returns the capability contract without charging, because a buyer has
 * to be able to read what they are buying before they buy it. That is not a free tier, it
 * returns no computed result.
 */
import { NextRequest, NextResponse } from 'next/server'
import { findAgent, BadRequest, FIRST_PARTY } from '@/lib/agents'
import { build402, verifyPayment, settlePayment } from '@/lib/b402'
import { TOKENS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/** Where settlement pays. Set per deployment, and the 402 refuses rather than inventing one. */
const PAY_TO = process.env.MUSTER_PAYTO ?? null

/**
 * The public origin, which is NOT what `req.url` reports. The app listens on 127.0.0.1:3000
 * behind a reverse proxy, so `new URL(req.url).origin` is `https://localhost:3000`. A 402 that
 * names that as its `resource` is unusable: the buyer signs a payment bound to a resource the
 * facilitator cannot reach and nobody outside this machine can call. Prefer the configured
 * origin, fall back to the forwarded headers, and only then to the request.
 */
function publicOrigin(req: NextRequest, fallback: URL): string {
  const configured = process.env.MUSTER_ORIGIN_URL
  if (configured) return configured.replace(/\/+$/, '')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (host) {
    const proto = req.headers.get('x-forwarded-proto') ?? 'https'
    return `${proto}://${host}`
  }
  return fallback.origin
}

function contractOf(slug: string) {
  const a = findAgent(slug)
  if (!a) return null
  return {
    agent: a.name,
    shelf: a.slug,
    summary: a.summary,
    price: {
      base: a.priceBase,
      decimals: TOKENS.USD1.decimals,
      token: TOKENS.USD1.symbol,
      asset: TOKENS.USD1.address,
      human: `${Number(BigInt(a.priceBase)) / 10 ** TOKENS.USD1.decimals} ${TOKENS.USD1.symbol}`,
      scheme: 'eip3009',
      network: 'eip155:56',
    },
    inputs: a.inputs,
    outputs: a.outputs,
    reads: a.reads,
    operator: 'Muster, first party. Disclosed on every row that renders.',
    endpoint: `/api/agent/${a.slug}`,
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ shelf: string }> }) {
  const { shelf } = await ctx.params
  const agent = findAgent(shelf)
  if (!agent) {
    return NextResponse.json(
      { error: 'no such agent', available: FIRST_PARTY.map((a) => a.slug) },
      { status: 404 },
    )
  }

  const url = new URL(req.url)

  // The contract, free, because a buyer cannot consent to a price without seeing what it buys.
  if (url.searchParams.get('preview') === '1') {
    return NextResponse.json(contractOf(shelf), { status: 200 })
  }

  const header = req.headers.get('x-payment')

  if (!header) {
    if (!PAY_TO) {
      // Honest refusal rather than a 402 nobody can satisfy. A buyer told to pay an address
      // that does not exist is worse than a buyer told the seller is not ready.
      return NextResponse.json(
        {
          error: 'payment_not_configured',
          detail:
            'This deployment has no payout address set, so it cannot issue payment requirements ' +
            'a buyer could satisfy. The capability contract is available at ?preview=1.',
          contract: contractOf(shelf),
        },
        { status: 503 },
      )
    }
    const challenge = build402({
      resource: publicOrigin(req, url) + url.pathname,
      description: agent.summary,
      priceBase: agent.priceBase,
      token: 'USD1',
      payTo: PAY_TO,
    })
    return NextResponse.json(challenge.body, {
      status: 402,
      headers: { 'cache-control': 'no-store' },
    })
  }

  // A payment was presented. Verify off-chain, then settle, then deliver. Never the other way
  // round: work handed over before settlement is work given away.
  let envelope: unknown
  try {
    envelope = JSON.parse(Buffer.from(header, 'base64').toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'x-payment header is not base64 JSON' }, { status: 400 })
  }

  const verified = await verifyPayment(envelope)
  if (!verified.isValid) {
    return NextResponse.json(
      { error: 'payment_invalid', reason: verified.reason },
      { status: 402 },
    )
  }

  const settled = await settlePayment(envelope)
  if (!settled.success) {
    return NextResponse.json(
      { error: 'payment_not_settled', reason: settled.errorReason, transaction: settled.transaction },
      { status: 402 },
    )
  }

  try {
    const result = await agent.run(url.searchParams)
    return NextResponse.json(
      {
        agent: agent.name,
        shelf: agent.slug,
        payment: { transaction: settled.transaction, scheme: 'eip3009', token: 'USD1' },
        result,
      },
      { status: 200, headers: { 'x-payment-response': Buffer.from(JSON.stringify({ transaction: settled.transaction })).toString('base64') } },
    )
  } catch (e) {
    if (e instanceof BadRequest) {
      // The payment settled and the input was bad. Say so plainly, because the buyer paid.
      return NextResponse.json(
        { error: 'bad_request_after_settlement', detail: e.message, payment: { transaction: settled.transaction } },
        { status: 400 },
      )
    }
    throw e
  }
}
