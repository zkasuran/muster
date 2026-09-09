/**
 * The wire documents a Muster listing serves, generated for our four reference agents.
 *
 * docs/04-AGENT-PROTOCOL.md defines four documents a listed agent publishes and a Muster card
 * pinned by a content hash. This file produces the real bytes for our own four agents from
 * lib/agents.ts (what each does, its price, its inputs and outputs) and lib/altana.ts (the pinned
 * reserved id and the agent's own wallet). Nothing here reads the network, so every function is
 * a pure map from those two tables plus a request origin, which is what lets the test recompute
 * the card hash and the classifier read the skills without a chain call.
 *
 * The card, the request body and the deliverable share one canonicalisation, `canonicalJson`,
 * exactly as docs/04-AGENT-PROTOCOL.md section 1 requires: sort object keys at every depth, compact
 * separators, then escape every non-ASCII code unit as \uXXXX. It is byte-identical to Python
 * json.dumps(x, sort_keys=True, separators=(",",":")) with ensure_ascii left on, which is the recipe
 * the BNB Chain and Altana SDKs both ship for the ERC-8183 negotiation hash. Plain JSON.stringify
 * would break cross-implementation verification on any accented character, so it is not used for a
 * hash.
 */
import { keccak256, toHex } from 'viem'
import { CHAIN, REGISTRY, TOKENS } from './constants.ts'
import { FIRST_PARTY, type FirstPartyAgent } from './agents.ts'
import { ALTANA_AGENTS } from './altana.ts'
import { contractFor } from './classify.ts'
import type { Shelf } from './types.ts'

export const PROTOCOL = 'muster/1'
export const CARD_VERSION = '1'
export const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema'

/** The four output shapes that stay outside a personalised recommendation. Section 7, rule B6. */
export const ADVICE_POSTURES = ['measurement', 'comparison', 'simulation', 'mechanical'] as const

// ---- One canonicalisation, three hashes ----

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === 'object') {
    const src = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(src).sort()) out[k] = sortKeys(src[k])
    return out
  }
  return value
}

function escapeNonAscii(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    out += c < 0x80 ? s[i] : '\\u' + c.toString(16).padStart(4, '0')
  }
  return out
}

/**
 * Sort keys at every depth, compact separators, non-ASCII escaped as \uXXXX. Byte-identical to
 * Python json.dumps(x, sort_keys=True, separators=(",",":")).
 */
export function canonicalJson(value: unknown): string {
  return escapeNonAscii(JSON.stringify(sortKeys(value)))
}

/** keccak256(utf8(canonicalJson(x))). The one hash used for the card, the request and the result. */
export function keccakCanonical(value: unknown): `0x${string}` {
  return keccak256(toHex(canonicalJson(value)))
}

/** The card hash covers the card minus its own `cardHash` member. */
export function cardHash(card: Record<string, unknown>): `0x${string}` {
  const rest: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(card)) if (k !== 'cardHash') rest[k] = v
  return keccakCanonical(rest)
}

/** The deliverable hash under `keccakCanonical`: over the `result` member of the terminal job. */
export function responseHash(result: unknown): `0x${string}` {
  return keccakCanonical(result)
}

// ---- Per-skill metadata, one skill per shelf, keyed to what the handler actually does ----

interface SchemaProp {
  type: string | string[]
  description: string
}
interface SkillMeta {
  skillId: string
  /** Honest to measured latency: yield walks every Venus market and can exceed 10 s, so it polls. */
  deliveryTarget: 'sync' | 'poll'
  expectedDurationSeconds: number
  maxDurationSeconds: number
  advicePosture: (typeof ADVICE_POSTURES)[number][]
  refusalConditions: { code: string; when: string }[]
  /** OASF-style skill strings placed in the registration's services[].skills. They classify to the
   *  shelf on their own, which the test asserts, so "the paths the classifier reads" are real. */
  oasfSkills: string[]
  /** The top-level members the paid result carries, so outputSchema names what actually comes back. */
  outputProps: Record<string, SchemaProp>
  outputRequired: string[]
}

const FRESH: { code: string; when: string } = {
  code: 'dataStale',
  when: 'the newest chain read is older than freshness.maxAgeSeconds',
}
const BAD_INPUT: { code: string; when: string } = {
  code: 'inputUnsupported',
  when: 'a required parameter is missing or is not the shape the input schema declares',
}

const SKILL_META: Record<Shelf, SkillMeta> = {
  'health-factor': {
    skillId: 'health-factor.read',
    deliveryTarget: 'sync',
    expectedDurationSeconds: 4,
    maxDurationSeconds: 60,
    advicePosture: ['measurement'],
    refusalConditions: [BAD_INPUT, FRESH],
    oasfSkills: ['risk_management/liquidation', 'defi/health factor monitoring'],
    outputProps: {
      healthFactor: { type: ['number', 'null'], description: 'the position health factor, null when there is no borrow' },
      totalCollateralUsd: { type: 'number', description: 'collateral weighted by each market liquidation threshold' },
      priceDropToLiquidationPct: { type: ['number', 'null'], description: 'the uniform price fall that liquidates the position' },
      atBlock: { type: 'number', description: 'the block every number was read at' },
    },
    outputRequired: ['healthFactor', 'atBlock'],
  },
  yield: {
    skillId: 'yield.rank',
    deliveryTarget: 'poll',
    expectedDurationSeconds: 25,
    maxDurationSeconds: 900,
    advicePosture: ['measurement', 'comparison'],
    refusalConditions: [BAD_INPUT, FRESH],
    oasfSkills: ['analytical_skills/market_insights', 'defi/yield routing and apy ranking'],
    outputProps: {
      rows: { type: 'array', description: 'supply yields ranked by APY, each naming the source call' },
      count: { type: 'number', description: 'how many ranked rows are returned' },
      readAt: { type: 'number', description: 'the epoch time the ranking was read at' },
    },
    outputRequired: ['rows', 'count'],
  },
  rebalancing: {
    skillId: 'rebalancing.range',
    deliveryTarget: 'sync',
    expectedDurationSeconds: 6,
    maxDurationSeconds: 60,
    advicePosture: ['measurement'],
    refusalConditions: [BAD_INPUT, FRESH],
    oasfSkills: ['portfolio/rebalancing', 'defi/lp range management'],
    outputProps: {
      pool: { type: 'object', description: 'live pool state: tick, fee, liquidity and the human price' },
      position: { type: 'object', description: 'the lower and upper tick of the range checked' },
      drift: { type: 'object', description: 'in range, distance to each bound and hold, widen or recentre' },
      readAt: { type: 'number', description: 'the epoch time the pool was read at' },
    },
    outputRequired: ['pool', 'drift'],
  },
  'grid-trading': {
    skillId: 'grid-trading.plan',
    deliveryTarget: 'sync',
    expectedDurationSeconds: 6,
    maxDurationSeconds: 60,
    advicePosture: ['measurement', 'simulation'],
    refusalConditions: [BAD_INPUT, FRESH],
    oasfSkills: ['trading/grid trading strategy', 'defi/grid levels and order ladder'],
    outputProps: {
      plan: { type: 'object', description: 'the level ladder, spacing, capital per side and the breakout rule' },
      readAt: { type: 'number', description: 'the epoch time the mark price was read at' },
    },
    outputRequired: ['plan'],
  },
}

/** The one skill id a shelf's reference agent declares. */
export function skillIdFor(shelf: Shelf): string {
  return SKILL_META[shelf].skillId
}

// ---- The Muster card ----

function inputSchema(agent: FirstPartyAgent): Record<string, unknown> {
  const properties: Record<string, SchemaProp> = {}
  const required: string[] = []
  for (const i of agent.inputs) {
    properties[i.name] = { type: 'string', description: i.description }
    if (i.required) required.push(i.name)
  }
  // additionalProperties stays open, because rule B9 says a paid handler reads any shape and
  // answers with the offer list rather than a 422.
  return { $schema: JSON_SCHEMA_2020_12, type: 'object', properties, required }
}

function outputSchema(shelf: Shelf): Record<string, unknown> {
  const m = SKILL_META[shelf]
  return { $schema: JSON_SCHEMA_2020_12, type: 'object', properties: m.outputProps, required: m.outputRequired }
}

function skill(shelf: Shelf, agent: FirstPartyAgent): Record<string, unknown> {
  const m = SKILL_META[shelf]
  return {
    skillId: m.skillId,
    // The shipped shelf slug is `grid-trading`. docs/04 uses `grid` in its examples, but every live
    // URL, the DB CHECK and the classifier use `grid-trading`, so the card matches the running app.
    category: shelf,
    contractVersion: `${shelf}/1`,
    title: agent.name,
    summary: agent.summary,
    priceBase: agent.priceBase,
    priceToken: TOKENS.USD1.address,
    priceDecimals: TOKENS.USD1.decimals,
    priceRail: 'eip3009',
    inputSchema: inputSchema(agent),
    outputSchema: outputSchema(shelf),
    deliveryTarget: m.deliveryTarget,
    expectedDurationSeconds: m.expectedDurationSeconds,
    maxDurationSeconds: m.maxDurationSeconds,
    deliverableRule: 'keccakCanonical',
    refusalConditions: m.refusalConditions,
    advicePosture: m.advicePosture,
    // Every reference agent is read-only, so its write scope is empty and rule B2 to B4 (session,
    // spend cap, call allowlist) do not apply. That is the honest shape: it advises, it never signs.
    writes: [],
    freshness: { sourceKind: 'chain', maxAgeSeconds: 60 },
  }
}

export interface CardOptions {
  origin: string
  /** Where the running deployment settles, so the card's payTo matches its own 402. */
  payTo: string
}

/** The base URL every wire route hangs off, for one reference agent. */
export function baseUrl(origin: string, shelf: Shelf): string {
  return `${origin.replace(/\/+$/, '')}/api/agent/${shelf}`
}

/** The musterCard/1 document for one reference agent, with cardHash computed over the rest of it. */
export function musterCard(shelf: Shelf, opts: CardOptions): Record<string, unknown> {
  const agent = FIRST_PARTY.find((a) => a.slug === shelf)
  const altana = ALTANA_AGENTS.find((a) => a.shelf === shelf)
  if (!agent || !altana) throw new Error(`no reference agent for shelf ${shelf}`)
  const card: Record<string, unknown> = {
    musterCard: CARD_VERSION,
    agent: {
      chainId: CHAIN.id,
      registry: REGISTRY.identity,
      agentId: altana.agentId,
      payTo: opts.payTo,
    },
    wire: {
      baseUrl: baseUrl(opts.origin, shelf),
      protocols: [PROTOCOL],
      maxRequestBytes: 65536,
      timeouts: { healthMs: 2000, manifestMs: 3000, createMs: 10000 },
    },
    payment: {
      rails: [
        {
          priceRail: 'eip3009',
          priceToken: TOKENS.USD1.address,
          priceDecimals: TOKENS.USD1.decimals,
          domainName: 'World Liberty Financial USD',
          domainVersion: '1',
          paymentFlow: 'upfront',
        },
      ],
    },
    skills: [skill(shelf, agent)],
    policy: { custody: 'none', trustModels: ['reputation'], dataRetentionDays: 30, subcontracts: false },
  }
  card.cardHash = cardHash(card)
  return card
}

// ---- The OASF / ERC-8004 registration document, the tokenURI target ----

/** eip155:56:0x8004... , the CAIP-2 registry reference a registrations[] entry carries. */
export const AGENT_REGISTRY_CAIP = `${CHAIN.caip2}:${REGISTRY.identity}`

/**
 * The registration document a `tokenURI` would resolve to. It carries the ERC-8004 registration-v1
 * shape live BSC agents use, a `muster` service pointing at the card so the resolver finds it, and
 * services[].skills as OASF-style strings the classifier reads.
 */
export function registrationDocument(shelf: Shelf, opts: { origin: string }): Record<string, unknown> {
  const agent = FIRST_PARTY.find((a) => a.slug === shelf)
  const altana = ALTANA_AGENTS.find((a) => a.shelf === shelf)
  if (!agent || !altana) throw new Error(`no reference agent for shelf ${shelf}`)
  const origin = opts.origin.replace(/\/+$/, '')
  const base = baseUrl(origin, shelf)
  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: agent.name,
    description: agent.summary,
    image: '',
    active: true,
    x402Support: true,
    supportedTrust: ['reputation'],
    registrations: [{ agentId: altana.agentId, agentRegistry: AGENT_REGISTRY_CAIP }],
    services: [
      { name: 'muster', endpoint: `${base}/card`, version: '1' },
      { name: 'API', endpoint: base, version: '1', skills: SKILL_META[shelf].oasfSkills },
      { name: 'web', endpoint: `${origin}/agent/${altana.agentId}` },
    ],
  }
}

/**
 * The domain proof at /.well-known/agent-registration.json for the whole muster origin, listing
 * every reserved agent's registration triple. C10 reads the content type rather than the status,
 * so this is served as application/json.
 */
export function wellKnownRegistration(opts: { origin: string }): Record<string, unknown> {
  const origin = opts.origin.replace(/\/+$/, '')
  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'Muster',
    description: 'The Muster marketplace and its four first-party reference agents on BNB Smart Chain.',
    registrations: ALTANA_AGENTS.map((a) => ({
      agentId: a.agentId,
      agentRegistry: AGENT_REGISTRY_CAIP,
      services: [{ name: 'muster', endpoint: `${baseUrl(origin, a.shelf)}/card`, version: '1' }],
    })),
  }
}

// ---- The manifest, the health check and the schema route ----

export interface ManifestFreshness {
  block: number | null
  observedAt: string
  source: string
}

/** The capability declaration. It agrees with the card on ids, prices, rails, schemas and target. */
export function manifest(shelf: Shelf, opts: { origin: string; freshness: ManifestFreshness }): Record<string, unknown> {
  const card = musterCard(shelf, { origin: opts.origin, payTo: '0x0000000000000000000000000000000000000000' })
  const cardSkill = (card.skills as Record<string, unknown>[])[0]!
  const altana = ALTANA_AGENTS.find((a) => a.shelf === shelf)!
  return {
    protocol: PROTOCOL,
    agent: { chainId: CHAIN.id, agentId: altana.agentId },
    cardHash: card.cardHash,
    skills: [
      {
        skillId: cardSkill.skillId,
        category: cardSkill.category,
        contractVersion: cardSkill.contractVersion,
        priceBase: cardSkill.priceBase,
        priceToken: cardSkill.priceToken,
        priceDecimals: cardSkill.priceDecimals,
        priceRail: cardSkill.priceRail,
        deliveryTarget: cardSkill.deliveryTarget,
        expectedDurationSeconds: cardSkill.expectedDurationSeconds,
        maxDurationSeconds: cardSkill.maxDurationSeconds,
        inputSchema: cardSkill.inputSchema,
        outputSchema: cardSkill.outputSchema,
        refusalConditions: cardSkill.refusalConditions,
        writes: cardSkill.writes,
        available: true,
        queueDepth: 0,
      },
    ],
    freshness: opts.freshness,
  }
}

/**
 * The health check. `checkedAt` is the moment the dependencies were re-read, so two probes 60 s
 * apart return different values, which is the whole point: a frozen checkedAt is what a laptop that
 * was powered off during the test window looks like from outside.
 */
export function healthDoc(
  shelf: Shelf,
  opts: { checkedAt: string; rpcOk: boolean; rpcLatencyMs: number | null },
): Record<string, unknown> {
  const m = SKILL_META[shelf]
  return {
    ok: opts.rpcOk,
    checkedAt: opts.checkedAt,
    skills: { [m.skillId]: opts.rpcOk ? 'ready' : 'degraded' },
    dependencies: [{ name: 'bsc-rpc', ok: opts.rpcOk, latencyMs: opts.rpcLatencyMs }],
  }
}

/** The free schema route: the input and output schemas plus one worked example per skill. */
export function schemaDoc(shelf: Shelf, opts: { origin: string }): Record<string, unknown> {
  const agent = FIRST_PARTY.find((a) => a.slug === shelf)!
  const m = SKILL_META[shelf]
  const contract = contractFor(shelf)
  void opts
  const example: Record<string, string> = {}
  for (const i of agent.inputs) if (i.example) example[i.name] = i.example
  return {
    protocol: PROTOCOL,
    skills: [
      {
        skillId: m.skillId,
        contractVersion: `${shelf}/1`,
        question: contract.question,
        inputSchema: inputSchema(agent),
        outputSchema: outputSchema(shelf),
        deliverableRule: 'keccakCanonical',
        example: { input: example },
      },
    ],
  }
}

// ---- The routes a conforming Muster agent serves, relative to the base URL ----

export interface RequiredRoute {
  method: string
  /** Relative to the card's wire.baseUrl. */
  path: string
  priced: boolean
  purpose: string
}

export const REQUIRED_ROUTES: readonly RequiredRoute[] = [
  { method: 'GET', path: '/card', priced: false, purpose: 'the Muster card, hash pinned' },
  { method: 'GET', path: '/registration', priced: false, purpose: 'the ERC-8004 registration document, the tokenURI target' },
  { method: 'GET', path: '/manifest', priced: false, purpose: 'the machine-readable capability declaration' },
  { method: 'GET', path: '/health', priced: false, purpose: 'liveness with a moving checkedAt' },
  { method: 'GET', path: '/schema', priced: false, purpose: 'the input and output schemas with a worked example' },
  { method: 'POST', path: '/jobs', priced: true, purpose: 'create a job, the only paid path into new work' },
  { method: 'GET', path: '/jobs/{jobId}', priced: false, purpose: 'poll state, progress and the deliverable' },
] as const
