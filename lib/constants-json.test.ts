/**
 * [doc 10] Pure-logic tests for the published constants document. No db, no network. The document
 * is generated from lib/constants.ts and lib/fee.ts, so this pins that the two agree and that the
 * shape matches what docs/10 section 4 condition 6 promises a builder.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { constantsDocument, constantsJson, CONSTANTS_LICENSE } from './constants-json.ts'
import { CHAIN, REGISTRY, TOKENS, SHELVES } from './constants.ts'
import { FEE_SCHEDULE } from './fee.ts'

test('the document carries the SPDX licence field section 6 requires', () => {
  const doc = constantsDocument()
  assert.equal(doc.license, CONSTANTS_LICENSE)
  assert.equal(CONSTANTS_LICENSE, 'LicenseRef-zkasuran-SAND-1.0')
})

test('chain id is 56 and matches the code', () => {
  const chain = constantsDocument().chain as Record<string, unknown>
  assert.equal(chain.id, 56)
  assert.equal(chain.id, CHAIN.id)
  assert.equal(chain.caip2, 'eip155:56')
})

test('the registry addresses and the counter slot come from the code', () => {
  const reg = constantsDocument().registry as Record<string, unknown>
  assert.equal(reg.identity, REGISTRY.identity)
  assert.equal(reg.reputation, REGISTRY.reputation)
  assert.equal(reg.identityCounterSlot, REGISTRY.identityCounterSlot)
})

test('every settlement token carries its decimals, and USD1 is the default quote', () => {
  const tokens = constantsDocument().tokens as Record<string, Record<string, unknown>>
  for (const key of Object.keys(TOKENS)) {
    assert.ok(tokens[key], `constants.json is missing token ${key}`)
    assert.equal(tokens[key]!.decimals, 18, `${key} should be 18 decimals on BSC`)
  }
  assert.equal(tokens.USD1!.isDefaultQuote, true)
  assert.equal(tokens.U!.isDefaultQuote, undefined)
})

test('the shelves are exactly the four the rubric requires, in nav order', () => {
  assert.deepEqual(constantsDocument().shelves, [...SHELVES])
  assert.deepEqual(constantsDocument().shelves, ['rebalancing', 'grid-trading', 'yield', 'health-factor'])
})

test('the fee block publishes the bps and the floor from the schedule', () => {
  const fee = constantsDocument().fee as Record<string, unknown>
  assert.equal(fee.basisPoints, FEE_SCHEDULE.basisPoints)
  assert.equal(fee.basisPoints, 200)
  assert.equal(fee.floorBase, FEE_SCHEDULE.floorBase)
  assert.equal(fee.deploymentTakesFee, false)
})

test('the eip-712 token domains are published for signing', () => {
  const eip712 = constantsDocument().eip712 as Record<string, Record<string, unknown>>
  assert.equal((eip712.domains!.USD1 as Record<string, unknown>).name, 'World Liberty Financial USD')
  assert.equal((eip712.domains!.USD1 as Record<string, unknown>).version, '1')
})

test('the served bytes are deterministic and valid JSON', () => {
  const a = constantsJson()
  const b = constantsJson()
  assert.equal(a, b, 'two renders must be byte-identical so provenance is stable')
  const parsed = JSON.parse(a)
  assert.equal(parsed.chain.id, 56)
})
