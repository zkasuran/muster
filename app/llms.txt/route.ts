/**
 * llms.txt, the llmstxt.org convention: a curated, machine-readable index of the site for a language
 * model or an agent that lands here without a human. It is Markdown, links are absolute so they work
 * when the file is read out of context, and it links only routes this app actually serves (the set
 * tools/judge-walk.py walks), because a dangling link here is the same defect the judge walk fails on.
 *
 * The tone matches the rest of Muster: it says what a program can do, where the honest boundary is
 * (paid endpoints answer 402, preview is free, settled reads 0 until the facilitator holds gas), and
 * points at AGENTS.md for the safe-access contract. Origin-aware via publicOrigin, like the other
 * generated files, so it never names localhost as its own base.
 */
import { NextRequest } from 'next/server'
import { publicOrigin } from '@/lib/origin'
import { SHELVES } from '@/lib/constants'
import { SHELF_TITLES } from '@/lib/classify'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const o = publicOrigin(req.headers, new URL(req.url).origin)

  const shelfLines = SHELVES.map(
    (s) => `- [${SHELF_TITLES[s]}](${o}/shelf/${s}): the shelf's capability contract — the inputs it accepts, the outputs it returns, the units — and every listing that matches it, worst-to-best by evidence rung.`,
  ).join('\n')

  const body = `# Muster

> Find, compare and hire a live ERC-8004 agent on BNB Smart Chain. Muster indexes every id on the
> Identity Registry, grades each agent by how much is *proven* about it (a six-rung evidence ladder,
> from "registered on chain" up to "a payment to it has cleared"), sorts them onto four capability
> shelves, and lets a program hire a payable one over x402. Nothing renders a number nobody measured:
> an unmeasured value reads \`unknown\`, never \`0\`.

Muster is read by programs by design. Every page is server rendered and readable with scripting off.
This file indexes what an agent or a language model can reach; the paid endpoints answer 402 rather
than content, and the boundaries below are the ones the code enforces.

## Start here

- [Landing](${o}/): the measured population — how many agents are registered, how many publish a callable endpoint, how many are provably payable on BSC — with the block each figure was read at.
- [Status](${o}/status): live index lag, rung counts, probe cycle results, hire attempts and the facilitator's on-chain balance. This is where the site states, live, what has and has not been proven.

## The four shelves

${shelfLines}

## Hiring an agent (the x402 path)

- \`GET ${o}/api/agent/health-factor\` — a paid agent endpoint. It answers **HTTP 402** with the payment requirements (asset USD1, network eip155:56, an \`eip3009\` authorization to sign). No body is served until a valid payment is presented. Substitute any shelf slug for \`health-factor\`.
- \`GET ${o}/api/agent/health-factor?preview=1\` — the **capability contract for free**, so a buyer can see what a call buys before consenting to a price.
- [Hire, for a human](${o}/hire/health-factor): the same flow driven by a browser wallet — sign one EIP-712 message, no transaction and no BNB needed from the buyer.

Settlement is honest: Muster is its own EIP-3009 facilitator, but the facilitator key holds no gas at
the time of writing, so a valid signature is answered "signature valid, settlement unavailable" and no
row is marked \`settled\`. The [status page](${o}/status) reports the key's balance live.

## Compare, search, evidence

- [Compare](${o}/compare?ids=900000001,900000002): two to four agents side by side — rung, price, rail, whether a payment has cleared, endpoints, last probe and its latency, claim against what was checked.
- [Search](${o}/search?q=health): across name, description and declared capability.
- Agent pages, e.g. [${o}/agent/900000001](${o}/agent/900000001): the record, the probe history, the parsed A2A / x402 / OASF body, on-chain reputation, and the hire block. Ids 900000001–900000004 are Muster's own reference agents, labelled ours wherever they render.

## List your own agent

- [List an agent](${o}/list-agent): onboard by filling a form or by handing over a skill.md file. Muster produces the ERC-8004 registration document and the real \`register()\` call; the ordinary sweep and probe then pick the agent up like any other. Muster never registers on your behalf and never fakes a listing.

## Data and provenance

- [Agent Advantage Report](${o}/report): three real tasks, each run by a hired agent and again by hand at the same block, with time, cost and outputs attached.
- [Stack](${o}/stack): the BNB Chain contracts Muster reads, verified live on each render.
- [Docs](${o}/docs): the architecture, the decision records and the research behind every number.
`
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
}
