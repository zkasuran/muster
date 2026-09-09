/**
 * parseRegistration against the record shapes the live BSC registry actually serves: a
 * base64 data URI, a plain-text data URI, a bare JSON string plus the malformed cases that
 * have to come back null rather than half-parsed.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRegistration, hashTokenUri, CHAIN_ID } from './registry.ts'

/** The shape a real `tokenURI` returns: `data:application/json;base64,<base64 of the JSON>`. */
function dataUri(obj: unknown): string {
  return `data:application/json;base64,${Buffer.from(JSON.stringify(obj), 'utf8').toString('base64')}`
}

const OASF_SKILLS = [
  'analytical_skills/mathematical_reasoning/geometry',
  'Analytical_Skills/Data_Analysis',
]

test('parseRegistration reads a base64 data URI including services[].skills', () => {
  const uri = dataUri({
    name: '  Rebalance Bot  ',
    description: 'Keeps a portfolio on its target weights.',
    endpoint: 'https://agent.example.com/a2a',
    services: [
      { name: 'A2A', skills: OASF_SKILLS, url: 'https://agent.example.com/a2a' },
      { name: 'MCP', mcpTools: ['swap_quote'] },
    ],
    x402support: true,
    active: true,
    supportedTrust: ['reputation'],
  })
  const r = parseRegistration(uri)
  assert.ok(r)
  assert.equal(r.name, 'Rebalance Bot')
  assert.equal(r.description, 'Keeps a portfolio on its target weights.')
  // Skills are lowercased on the way in. They come off `services[].skills`, not the top level.
  assert.deepEqual(r.skills, [
    'analytical_skills/mathematical_reasoning/geometry',
    'analytical_skills/data_analysis',
    'swap_quote',
  ])
  assert.deepEqual(r.serviceKinds, ['A2A', 'MCP'])
  assert.deepEqual(r.endpoints, ['https://agent.example.com/a2a'])
  assert.equal(r.declaresX402, true)
  assert.equal(r.declaresActive, true)
  assert.deepEqual(r.trustModels, ['reputation'])
})

test('parseRegistration accepts the x402support spelling', () => {
  const r = parseRegistration(dataUri({ name: 'A', x402support: true }))
  assert.ok(r)
  assert.equal(r.declaresX402, true)
})

test('parseRegistration accepts the x402Support spelling', () => {
  const r = parseRegistration(dataUri({ name: 'A', x402Support: true }))
  assert.ok(r)
  assert.equal(r.declaresX402, true)
})

test('parseRegistration treats a truthy non-true x402 flag as no claim', () => {
  const r = parseRegistration(dataUri({ name: 'A', x402support: 'yes' }))
  assert.ok(r)
  assert.equal(r.declaresX402, false)
  assert.equal(r.declaresActive, false)
})

test('parseRegistration keeps absolute endpoints and drops relative ones', () => {
  const r = parseRegistration(
    dataUri({
      endpoint: '/relative/path',
      url: 'https://one.example.com/',
      serviceUrl: 'HTTP://two.example.com/x',
      apiUrl: 'agent.example.com/no-scheme',
      homepage: 'ipfs://bafy',
      endpoints: ['https://three.example.com/', './also-relative'],
      services: [{ name: 'web', url: 'https://one.example.com/' }],
    }),
  )
  assert.ok(r)
  // Deduped by exact string, insertion ordered. Every survivor is absolute http(s).
  assert.deepEqual(r.endpoints, [
    'https://one.example.com/',
    'HTTP://two.example.com/x',
    'https://three.example.com/',
  ])
})

test('parseRegistration collects both supportedTrust spellings', () => {
  const r = parseRegistration(
    dataUri({ supportedTrust: ['reputation'], supportedTrusts: ['crypto-economic', 'tee-attestation'] }),
  )
  assert.ok(r)
  assert.deepEqual(r.trustModels, ['reputation', 'crypto-economic', 'tee-attestation'])
})

test('parseRegistration blanks a whitespace-only name and description', () => {
  const r = parseRegistration(dataUri({ name: '   ', description: '' }))
  assert.ok(r)
  assert.equal(r.name, null)
  assert.equal(r.description, null)
})

test('parseRegistration reads a plain-text data URI', () => {
  const json = JSON.stringify({ name: 'Plain', x402Support: true })
  const r = parseRegistration(`data:application/json,${encodeURIComponent(json)}`)
  assert.ok(r)
  assert.equal(r.name, 'Plain')
  assert.equal(r.declaresX402, true)
})

test('parseRegistration reads a bare JSON string', () => {
  const r = parseRegistration('  {"name":"Bare","active":true}')
  assert.ok(r)
  assert.equal(r.name, 'Bare')
  assert.equal(r.declaresActive, true)
})

test('parseRegistration returns null on an empty tokenURI', () => {
  assert.equal(parseRegistration(''), null)
})

test('parseRegistration returns null on malformed base64', () => {
  assert.equal(parseRegistration('data:application/json;base64,!!!!not-base64!!!!'), null)
})

test('parseRegistration returns null on a data URI with no comma', () => {
  assert.equal(parseRegistration('data:application/json;base64'), null)
})

test('parseRegistration returns null on non-JSON', () => {
  assert.equal(parseRegistration(dataUri('not an object at all').replace(/=*$/, '') + 'zzzz'), null)
  assert.equal(parseRegistration('data:text/plain,hello%20world'), null)
})

test('parseRegistration returns null on an http tokenURI, which it must not fetch', () => {
  assert.equal(parseRegistration('https://operator.example.com/agent.json'), null)
})

test('parseRegistration tolerates a record with no services array', () => {
  const r = parseRegistration(dataUri({ name: 'Nothing', services: 'not-an-array' }))
  assert.ok(r)
  assert.deepEqual(r.serviceKinds, [])
  assert.deepEqual(r.skills, [])
  assert.deepEqual(r.endpoints, [])
})

test('parseRegistration reads top-level skills, capabilities, tags and categories', () => {
  const r = parseRegistration(
    dataUri({ skills: ['Alpha'], capabilities: [{ name: 'Beta' }], tags: ['alpha'], categories: ['Gamma'] }),
  )
  assert.ok(r)
  // Lowercased, so 'Alpha' and 'alpha' collapse to one entry.
  assert.deepEqual(r.skills, ['alpha', 'beta', 'gamma'])
})

test('hashTokenUri is keccak256 over the URI bytes', () => {
  // keccak256 of the empty byte string, the constant every EVM tool prints for `keccak256("")`.
  assert.equal(hashTokenUri(''), '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
  assert.equal(hashTokenUri('abc'), '0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45')
  assert.notEqual(hashTokenUri('a'), hashTokenUri('b'))
})

test('CHAIN_ID is BNB Smart Chain mainnet', () => {
  assert.equal(CHAIN_ID, 56)
})
