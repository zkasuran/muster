/**
 * lib/onboard.ts. The generator is pure, so it is pinned against the same classifier the shelves run
 * and the real register() signature the tool sends. Checks: a health-factor agent classifies and gets
 * a registration document, a valid price becomes an x402 entry in atomic USD1, bad input is rejected
 * with named errors, and an agent whose text matches no contract is honest about landing on no shelf.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { onboard } from './onboard.ts'
import { TOKENS } from './constants.ts'

test('a health-factor agent classifies and gets its artifacts', () => {
  const r = onboard({
    name: 'Venus Liquidation Guard',
    description: 'Watches a Venus borrow position and warns before liquidation, returning the health factor.',
    endpoint: 'https://agent.example.com/a2a',
    skills: ['risk_management/liquidation'],
    priceUsd1: 0.05,
  })
  assert.equal(r.ok, true)
  assert.ok(r.shelves.some((s) => s.shelf === 'health-factor'), 'lands on health-factor')
  assert.ok(r.registration, 'has a registration document')
  assert.equal((r.registration as Record<string, unknown>)['type'], 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1')
  // The price becomes atomic USD1 at 18 decimals: 0.05 -> 5e16.
  assert.equal((r.x402 as Record<string, unknown>)['amount'], (5n * 10n ** BigInt(TOKENS.USD1.decimals - 2)).toString())
  assert.match(String((r.registerCall as Record<string, unknown>)['function']), /^register\(string agentURI\)/)
})

test('a non-round price converts to the exact atomic amount, not a float-rounded one', () => {
  // 0.07 * 10**18 as a float is 70000000000000008, eight wei over. parseUnits on the string is exact.
  const r = onboard({
    name: 'Yield Router',
    description: 'Finds the best yield across BSC lending markets after cost and routes into it.',
    priceUsd1: 0.07,
  })
  const x402 = r.x402 as Record<string, unknown>
  assert.equal(x402['amount'], '70000000000000000')
  // amount and maxAmountRequired read from the same value, so they never disagree.
  assert.equal(x402['maxAmountRequired'], '70000000000000000')
})

test('a free agent gets no x402 entry and x402Support is false', () => {
  const r = onboard({
    name: 'Grid Ladder Planner',
    description: 'Plans a grid trading ladder around a live pool price with levels and order sizes.',
    priceUsd1: null,
  })
  assert.equal(r.ok, true)
  assert.equal(r.x402, null)
  assert.equal((r.registration as Record<string, unknown>)['x402Support'], false)
})

test('missing name and a too-short description are named errors, not a throw', () => {
  const r = onboard({ name: '', description: 'too short' })
  assert.equal(r.ok, false)
  assert.ok(r.errors.some((e) => /name/.test(e)))
  assert.ok(r.errors.some((e) => /description/.test(e)))
  assert.equal(r.registration, null)
})

test('a bad endpoint URL is rejected', () => {
  const r = onboard({
    name: 'Some Agent',
    description: 'A perfectly fine description that is long enough to classify.',
    endpoint: 'not a url',
  })
  assert.equal(r.ok, false)
  assert.ok(r.errors.some((e) => /endpoint/.test(e)))
})

test('an agent matching no contract lands on no shelf, honestly', () => {
  const r = onboard({
    name: 'Cat Picture Generator',
    description: 'Generates pictures of cats in various painterly styles on request.',
    priceUsd1: 0.1,
  })
  assert.equal(r.ok, true)
  assert.deepEqual(r.shelves, [])
  // It still gets artifacts, because it can register; it just will not be shelved until it matches.
  assert.ok(r.registration)
})
