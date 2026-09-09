/**
 * The onboarding endpoint. It takes what an operator filled in or dropped as a skill.md and returns
 * the real artifacts to get their agent listed: the shelf it classifies to, the ERC-8004 registration
 * document to host, the x402 accepts[] entry, and the register() call. If they gave a live endpoint and
 * ask for it, the same SSRF-guarded probe the sweep runs is run once here, so they see the rung their
 * endpoint earns before they register. Nothing is written to the index: this generates, it does not list.
 */
import { NextRequest, NextResponse } from 'next/server'
import { onboard, type OnboardInput } from '@/lib/onboard'
import { probeUrl, observedRung } from '@/worker/probe'

export const dynamic = 'force-dynamic'

interface Body {
  name?: unknown
  description?: unknown
  endpoint?: unknown
  skills?: unknown
  priceUsd1?: unknown
  probe?: unknown
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, errors: ['request body was not valid JSON'] }, { status: 400 })
  }

  const skills = Array.isArray(body.skills)
    ? (body.skills as unknown[]).map((s) => str(s).trim()).filter(Boolean).slice(0, 32)
    : typeof body.skills === 'string'
      ? body.skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 32)
      : []
  const priceRaw = body.priceUsd1
  const priceUsd1 =
    priceRaw === '' || priceRaw == null ? null : Number(priceRaw)

  const input: OnboardInput = {
    name: str(body.name).slice(0, 200),
    description: str(body.description).slice(0, 4000),
    endpoint: str(body.endpoint).trim().slice(0, 400) || null,
    skills,
    priceUsd1: priceUsd1 != null && Number.isFinite(priceUsd1) ? priceUsd1 : null,
  }

  const result = onboard(input)

  // The live probe is opt-in and only runs when the agent parsed and named an endpoint. The guard
  // inside probeUrl refuses private, loopback and link-local targets, so this cannot be turned into a
  // request against the origin's own network. One request, then a rung mapped exactly as the sweep does.
  let probe: {
    ran: boolean
    verdict?: string
    httpStatus?: number | null
    sawPaymentRequired?: boolean
    tlsOk?: boolean
    rung?: string | null
    note?: string | null
  } = { ran: false }

  if (body.probe === true && result.ok && input.endpoint) {
    try {
      const out = await probeUrl(input.endpoint)
      probe = {
        ran: true,
        verdict: out.verdict,
        httpStatus: out.httpStatus,
        sawPaymentRequired: out.sawPaymentRequired,
        tlsOk: out.tlsOk,
        rung: observedRung(out),
        note: out.note,
      }
    } catch (e) {
      probe = { ran: true, verdict: 'fail', note: `probe error: ${e instanceof Error ? e.message : 'unknown'}` }
    }
  }

  return NextResponse.json({ ...result, probe }, { status: result.ok ? 200 : 422 })
}
