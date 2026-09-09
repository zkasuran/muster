/**
 * [doc 10] The capability contract a GET with ?preview=1 returns, docs/10-DOCS-AND-POLICY.md
 * section 3. It lived inline in app/api/agent/[shelf]/route.ts. It is lifted here unchanged so the
 * route and the /docs/schemas page render one definition rather than two that can drift, which is
 * the rule for every published shape: sample the real one, never retype it. Pure, no I/O.
 */
import { findAgent } from './agents.ts'
import { TOKENS } from './constants.ts'

/** The free contract a buyer reads before paying. Returns null for an unknown shelf. */
export function previewContract(slug: string) {
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
