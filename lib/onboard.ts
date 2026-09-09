/**
 * Turn what an operator gave us, a filled form or a parsed skill.md, into the real artifacts that get
 * their agent listed on Muster. Nothing here writes a row or claims a listing: it produces the bytes
 * an operator publishes and the on-chain call they send, then the ordinary sweep and probe pick the
 * agent up like any other. That keeps the marketplace's one claim true, that it shows agents that are
 * really on chain, while still giving a real on-ramp rather than a form that pretends.
 *
 * Three things come out, each reused from the code the running site already serves:
 *   the shelf the agent classifies to, from lib/classify.ts, the same classifier every listing runs;
 *   the ERC-8004 registration document to host at the tokenURI, in the registration-v1 shape from
 *     lib/protocol.ts, carrying services[].skills so the classifier reads it the same way on the sweep;
 *   the exact register() call, the signature tools/register-agents.ts actually sends on chain.
 *
 * Pure and network-free, so lib/onboard.test.ts pins it and the API route adds only the live probe.
 */
import { classify, contractFor, SHELF_TITLES } from './classify.ts'
import { CHAIN, REGISTRY, TOKENS } from './constants.ts'
import type { Shelf } from './types.ts'

export const AGENT_REGISTRY_CAIP = `${CHAIN.caip2}:${REGISTRY.identity}`

export interface OnboardInput {
  name: string
  description: string
  /** The service endpoint the agent answers on. Optional: an agent can be registered before it is live. */
  endpoint?: string | null
  /** OASF paths or skill names. They feed the classifier alongside the name and description. */
  skills?: string[]
  /** Price in whole USD1 for the paid call, e.g. 0.02. Optional, since not every agent charges. */
  priceUsd1?: number | null
}

export interface OnboardResult {
  ok: boolean
  /** Every field problem, so the form can show them all at once rather than one at a time. */
  errors: string[]
  /** The shelves the classifier placed it on, best first. Empty when nothing matched. */
  shelves: { shelf: Shelf; title: string; basis: 'strong' | 'weak' }[]
  /** The registration document to host at the agent's tokenURI. Present once name and description parse. */
  registration: Record<string, unknown> | null
  /** The x402 accepts[] entry a paid agent returns on its 402, in the wire shape the live population uses. */
  x402: Record<string, unknown> | null
  /** The on-chain step: the registry, the function, the argument. The real register() call. */
  registerCall: { chainId: number; registry: string; caip2: string; function: string; arg: string; note: string } | null
}

/** Build the registration-v1 document for a third-party agent, the tokenURI target. */
function registrationFor(input: OnboardInput, shelves: Shelf[]): Record<string, unknown> {
  const services: Record<string, unknown>[] = []
  if (input.endpoint) {
    services.push({
      name: 'API',
      endpoint: input.endpoint,
      version: '1',
      // The classifier reads services[].skills, so the paths the operator declares here are what
      // place the agent on a shelf on the next sweep, exactly as they do for our own agents.
      skills: (input.skills ?? []).slice(0, 32),
    })
  }
  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: input.name,
    description: input.description,
    image: '',
    active: true,
    x402Support: input.priceUsd1 != null,
    supportedTrust: ['reputation'],
    // agentId is assigned by the registry at register() time, so it is left out of the document the
    // operator hosts; the registrations[] entry names the registry the id will live in.
    registrations: [{ agentRegistry: AGENT_REGISTRY_CAIP }],
    services,
    // A hint, not a binding: the shelves the text classifies to right now, so an operator can see
    // where they will land before the sweep and adjust the wording if it is wrong.
    musterShelves: shelves,
  }
}

function x402For(input: OnboardInput): Record<string, unknown> | null {
  if (input.priceUsd1 == null) return null
  const atomic = BigInt(Math.round(input.priceUsd1 * 10 ** TOKENS.USD1.decimals)).toString()
  // The accepts[] shape the live BSC population uses: eip3009 in USD1 on BNB Smart Chain. amount is
  // the v2 field name and maxAmountRequired the one every current Bazaar entry still carries, so both
  // are written, which is what the marketplace's own 402 does.
  return {
    scheme: 'eip3009',
    network: CHAIN.caip2,
    asset: TOKENS.USD1.address,
    amount: atomic,
    maxAmountRequired: atomic,
    extra: { name: 'World Liberty Financial USD', version: '1', decimals: TOKENS.USD1.decimals },
    payTo: '0xYOUR_PAYOUT_ADDRESS',
  }
}

export function onboard(input: OnboardInput): OnboardResult {
  const errors: string[] = []
  const name = (input.name ?? '').trim()
  const description = (input.description ?? '').trim()
  if (name.length < 2) errors.push('name is required')
  if (description.length < 12) errors.push('description is required, at least a sentence, so the classifier can read it')
  if (input.endpoint != null && input.endpoint.trim() !== '') {
    let u: URL | null = null
    try { u = new URL(input.endpoint) } catch { u = null }
    if (!u || (u.protocol !== 'https:' && u.protocol !== 'http:')) errors.push('endpoint must be an http(s) URL')
  }
  if (input.priceUsd1 != null && (!Number.isFinite(input.priceUsd1) || input.priceUsd1 < 0)) {
    errors.push('price must be a positive number of USD1')
  }

  const matched = errors.length === 0
    ? classify({ name, description, skills: input.skills ?? [] })
    : []
  const shelves = matched.map((c) => ({ shelf: c.shelf, title: SHELF_TITLES[c.shelf], basis: c.basis }))

  if (errors.length > 0) {
    return { ok: false, errors, shelves: [], registration: null, x402: null, registerCall: null }
  }

  const clean: OnboardInput = {
    name,
    description,
    endpoint: input.endpoint?.trim() || null,
    skills: input.skills ?? [],
    priceUsd1: input.priceUsd1 ?? null,
  }
  const registration = registrationFor(clean, shelves.map((s) => s.shelf))
  const registerCall = {
    chainId: CHAIN.id,
    registry: REGISTRY.identity,
    caip2: CHAIN.caip2,
    function: 'register(string agentURI) returns (uint256 agentId)',
    arg: 'a data: URI or an https URL that resolves to the registration document below',
    note: 'Send from the wallet that will own the agent. Measured at about 180,382 gas.',
  }
  return { ok: true, errors: [], shelves, registration, x402: x402For(clean), registerCall }
}

/** A one-line read of where an agent will land, for the result header. */
export function shelfVerdict(shelves: OnboardResult['shelves']): string {
  if (shelves.length === 0) return 'No shelf yet: the text does not match any of the four category contracts. Adjust the description or skills.'
  const named = shelves.map((s) => `${s.title} (${s.basis})`).join(', ')
  return shelves.length === 1 ? `Classifies to ${named}.` : `Classifies to ${named}.`
}

export { contractFor }
