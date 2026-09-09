import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  canonicalJson,
  keccakCanonical,
  cardHash,
  responseHash,
  musterCard,
  registrationDocument,
  wellKnownRegistration,
  manifest,
  healthDoc,
  schemaDoc,
  baseUrl,
  REQUIRED_ROUTES,
  ADVICE_POSTURES,
  AGENT_REGISTRY_CAIP,
} from './protocol.ts'
import { SHELVES } from './constants.ts'
import { classify } from './classify.ts'
import type { Shelf } from './types.ts'

const ORIGIN = 'https://muster.zkasuran.dev'
const PAY_TO = '0x1111111111111111111111111111111111111111'

test('canonicalJson is byte-identical to Python json.dumps(sort_keys, separators)', () => {
  // The key is c,a,f,e + combining acute (U+0301) and the value carries U+00EF, built from explicit
  // code points so the assertion does not depend on how this file is saved. The expected string is
  // the exact output of `json.dumps(x, sort_keys=True, separators=(",",":"))`.
  const sample = { z: 1, a: { ['café']: 'naïve', b: [3, 2, { y: true, x: null }] }, m: 'plain' }
  const expected = '{"a":{"b":[3,2,{"x":null,"y":true}],"cafe\\u0301":"na\\u00efve"},"m":"plain","z":1}'
  assert.equal(canonicalJson(sample), expected)
})

test('canonicalJson sorts at every depth and reorders identical content the same way', () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }))
  assert.equal(canonicalJson({ a: 2, b: 1 }), '{"a":2,"b":1}')
})

test('keccakCanonical and responseHash are deterministic and order-independent', () => {
  const a = keccakCanonical({ x: 1, y: 2 })
  const b = keccakCanonical({ y: 2, x: 1 })
  assert.equal(a, b)
  assert.match(a, /^0x[0-9a-f]{64}$/)
  assert.equal(responseHash({ r: 1 }), keccakCanonical({ r: 1 }))
})

const REQUIRED_SKILL_FIELDS = [
  'skillId', 'category', 'contractVersion', 'title', 'summary', 'priceBase', 'priceToken',
  'priceDecimals', 'priceRail', 'inputSchema', 'outputSchema', 'deliveryTarget',
  'expectedDurationSeconds', 'maxDurationSeconds', 'deliverableRule', 'refusalConditions',
  'advicePosture', 'writes', 'freshness',
]

for (const shelf of SHELVES) {
  test(`${shelf}: the card carries every required field and its cardHash recomputes`, () => {
    const card = musterCard(shelf, { origin: ORIGIN, payTo: PAY_TO })
    // Top-level required members, docs/04 section 1.
    for (const k of ['musterCard', 'agent', 'wire', 'payment', 'skills', 'policy', 'cardHash']) {
      assert.ok(k in card, `card missing ${k}`)
    }
    const agent = card.agent as Record<string, unknown>
    for (const k of ['chainId', 'registry', 'agentId', 'payTo']) assert.ok(k in agent, `agent missing ${k}`)
    assert.equal(agent.chainId, 56)
    assert.equal(agent.payTo, PAY_TO)
    // agentId is a decimal string, never a number, and it is a reserved id.
    assert.equal(typeof agent.agentId, 'string')
    assert.match(agent.agentId as string, /^90000000[1-4]$/)

    const rails = (card.payment as Record<string, unknown>).rails as unknown[]
    assert.ok(rails.length >= 1)
    const wire = card.wire as Record<string, unknown>
    assert.equal(wire.baseUrl, baseUrl(ORIGIN, shelf))

    const skills = card.skills as Record<string, unknown>[]
    assert.equal(skills.length, 1)
    const s = skills[0]!
    for (const f of REQUIRED_SKILL_FIELDS) assert.ok(f in s, `skill missing ${f}`)
    assert.equal(s.category, shelf)
    assert.notEqual(s.deliverableRule, 'none')
    for (const p of s.advicePosture as string[]) {
      assert.ok((ADVICE_POSTURES as readonly string[]).includes(p), `posture ${p} out of range`)
    }
    const inSchema = s.inputSchema as Record<string, unknown>
    assert.equal(inSchema.$schema, 'https://json-schema.org/draft/2020-12/schema')
    assert.equal(inSchema.type, 'object')

    // The hash pins the card minus its own hash, so recomputing off the served bytes matches.
    assert.equal(cardHash(card), card.cardHash)
  })

  test(`${shelf}: changing any card field changes the hash`, () => {
    const card = musterCard(shelf, { origin: ORIGIN, payTo: PAY_TO })
    const moved = musterCard(shelf, { origin: ORIGIN, payTo: '0x2222222222222222222222222222222222222222' })
    assert.notEqual(card.cardHash, moved.cardHash)
  })

  test(`${shelf}: the registration document carries services and classifies from its own skills`, () => {
    const doc = registrationDocument(shelf, { origin: ORIGIN })
    for (const k of ['type', 'name', 'description', 'services', 'registrations']) {
      assert.ok(k in doc, `registration missing ${k}`)
    }
    const services = doc.services as Record<string, unknown>[]
    const muster = services.find((x) => String(x.name).toLowerCase() === 'muster')
    assert.ok(muster, 'no muster service pointing at the card')
    assert.match(String(muster!.endpoint), /\/card$/)

    const api = services.find((x) => x.name === 'API')
    const skills = (api!.skills as string[]) ?? []
    assert.ok(skills.length > 0, 'API service declares no skills')
    // The paths the classifier reads must land the agent on its own shelf.
    const hits = classify({ skills })
    assert.ok(hits.some((h) => h.shelf === shelf), `skills ${JSON.stringify(skills)} did not classify to ${shelf}`)

    const regs = doc.registrations as Record<string, unknown>[]
    assert.equal(regs[0]!.agentRegistry, AGENT_REGISTRY_CAIP)
  })

  test(`${shelf}: the manifest agrees with the card on the pair a buyer signs against`, () => {
    const card = musterCard(shelf, { origin: ORIGIN, payTo: PAY_TO })
    const cardSkill = (card.skills as Record<string, unknown>[])[0]!
    const man = manifest(shelf, { origin: ORIGIN, freshness: { block: 120000000, observedAt: '2026-09-09T00:00:00Z', source: 'bsc-rpc' } })
    assert.equal(man.protocol, 'muster/1')
    const manSkill = (man.skills as Record<string, unknown>[])[0]!
    for (const f of ['skillId', 'priceBase', 'priceToken', 'priceDecimals', 'priceRail', 'deliveryTarget']) {
      assert.equal(manSkill[f], cardSkill[f], `manifest disagrees with the card on ${f}`)
    }
    assert.equal(manSkill.available, true)
  })

  test(`${shelf}: health carries a checkedAt that the caller sets, so it can move`, () => {
    const one = healthDoc(shelf, { checkedAt: '2026-09-09T00:00:00Z', rpcOk: true, rpcLatencyMs: 40 })
    const two = healthDoc(shelf, { checkedAt: '2026-09-09T00:01:00Z', rpcOk: true, rpcLatencyMs: 41 })
    assert.notEqual(one.checkedAt, two.checkedAt)
    assert.equal(one.ok, true)
  })

  test(`${shelf}: the schema route carries a worked example built from the declared inputs`, () => {
    const doc = schemaDoc(shelf, { origin: ORIGIN })
    const s = (doc.skills as Record<string, unknown>[])[0]!
    assert.ok('inputSchema' in s && 'outputSchema' in s)
    assert.ok('example' in s)
  })
}

test('the well-known domain proof lists all four reserved agents', () => {
  const doc = wellKnownRegistration({ origin: ORIGIN })
  const regs = doc.registrations as Record<string, unknown>[]
  assert.equal(regs.length, 4)
  const ids = regs.map((r) => r.agentId).sort()
  assert.deepEqual(ids, ['900000001', '900000002', '900000003', '900000004'])
  for (const r of regs) assert.equal(r.agentRegistry, AGENT_REGISTRY_CAIP)
})

test('the required-route table names the card, the manifest, the health check and the two job routes', () => {
  const paths = REQUIRED_ROUTES.map((r) => r.path)
  for (const p of ['/card', '/registration', '/manifest', '/health', '/schema', '/jobs', '/jobs/{jobId}']) {
    assert.ok(paths.includes(p), `required routes missing ${p}`)
  }
  const create = REQUIRED_ROUTES.find((r) => r.path === '/jobs' && r.method === 'POST')
  assert.equal(create!.priced, true)
  const poll = REQUIRED_ROUTES.find((r) => r.path === '/jobs/{jobId}')
  assert.equal(poll!.priced, false)
})

// A guard that the shelf list the doc argues for is exactly the four the card generates for.
test('every shelf produces a card', () => {
  const built: Shelf[] = SHELVES.map((s) => {
    musterCard(s, { origin: ORIGIN, payTo: PAY_TO })
    return s
  })
  assert.equal(built.length, 4)
})
