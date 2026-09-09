/**
 * Shelf classification. Each case here is built from the capability contract it should hit,
 * so a regex edit that widens or narrows a shelf shows up as a named failure rather than as
 * a shelf quietly filling with the wrong agents.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classify, contractFor, CONTRACTS, SHELF_TITLES } from './classify.ts'
import type { Shelf } from './types.ts'

function shelves(input: Parameters<typeof classify>[0]): Shelf[] {
  return classify(input).map((c) => c.shelf)
}

test('a rebalancer lands on rebalancing with a strong basis', () => {
  const out = classify({
    name: 'Portfolio Rebalancer',
    description: 'Moves a wallet back onto its target weights.',
  })
  assert.deepEqual(out.map((c) => c.shelf), ['rebalancing'])
  assert.equal(out[0]?.basis, 'strong')
  // Both strong patterns fire on "Portfolio Rebalancer". Every one that fired is reported.
  const strong = contractFor('rebalancing').strong
  assert.deepEqual(out[0]?.matched, [String(strong[0]), String(strong[1])])
})

test('a grid planner lands on grid-trading', () => {
  const out = classify({ name: 'Grid trading planner', description: 'Builds a ladder for BNB pairs.' })
  assert.deepEqual(out.map((c) => c.shelf), ['grid-trading'])
  assert.equal(out[0]?.basis, 'strong')
})

test('an APY router lands on yield', () => {
  const out = classify({ name: 'Route Finder', description: 'Ranks APY across vaults after cost.' })
  assert.deepEqual(out.map((c) => c.shelf), ['yield'])
  assert.equal(out[0]?.basis, 'strong')
})

test('a liquidation guard lands on health-factor', () => {
  const out = classify({ name: 'Health factor guard', description: 'Warns before a Venus position is liquidated.' })
  assert.deepEqual(out.map((c) => c.shelf), ['health-factor'])
  assert.equal(out[0]?.basis, 'strong')
})

test('an unrelated agent lands on nothing', () => {
  assert.deepEqual(classify({ name: 'Weather Almanac', description: 'Daily rainfall and wind for coastal towns.' }), [])
})

test('an empty record lands on nothing', () => {
  assert.deepEqual(classify({}), [])
  assert.deepEqual(classify({ name: '', description: '   ', skills: [], serviceKinds: [] }), [])
})

test('two supporting signals make a weak candidate, one does not', () => {
  const two = classify({ name: 'Allocation Desk', description: 'Reviews target weights each quarter.' })
  assert.deepEqual(two.map((c) => c.shelf), ['rebalancing'])
  assert.equal(two[0]?.basis, 'weak')
  assert.equal(two[0]?.matched.length, 2)

  const one = classify({ name: 'Allocation Desk', description: 'Reviews holdings each quarter.' })
  assert.deepEqual(one, [])
})

test('an exclude beats a strong signal on the same shelf', () => {
  // Without the exclude this is a strong grid hit: `grid` followed by `level` and `order`.
  const power = classify({ name: 'Power Grid Monitor', description: 'Tracks grid levels and order books for utilities.' })
  assert.deepEqual(power, [])
  const research = classify({ name: 'Rates Desk', description: 'A yield curve analysis only service, no execution.' })
  assert.deepEqual(research.map((c) => c.shelf), [])
})

test('an agent that genuinely does two things appears on both shelves, in contract order', () => {
  const out = shelves({
    name: 'DeFi Copilot',
    description: 'Rebalances a portfolio and watches the health factor on a Venus loan.',
  })
  assert.deepEqual(out, ['rebalancing', 'health-factor'])
})

test('the signal can come from skills or from service kinds alone', () => {
  assert.deepEqual(shelves({ skills: ['grid trading strategy'] }), ['grid-trading'])
  assert.deepEqual(shelves({ serviceKinds: ['health factor api'] }), ['health-factor'])
  // An OASF path is the usual content of `skills` and describes no DeFi capability.
  assert.deepEqual(shelves({ skills: ['analytical_skills/mathematical_reasoning/geometry'] }), [])
})

test('the haystack is capped at 4000 characters', () => {
  const inside = classify({ description: `${'x '.repeat(1_000)}health factor` })
  assert.deepEqual(inside.map((c) => c.shelf), ['health-factor'])
  const outside = classify({ description: `${'x '.repeat(2_100)}health factor` })
  assert.deepEqual(outside, [])
})

test('contractFor returns the contract and refuses an unknown shelf', () => {
  const c = contractFor('yield')
  assert.equal(c.shelf, 'yield')
  assert.equal(c.title, 'Yield')
  assert.equal(c.units, 'APY as a percentage, TVL in USD')
  assert.equal(c.inputs.length, 4)
  assert.throws(() => contractFor('lending' as Shelf), /no contract for shelf lending/)
})

test('there are four contracts and every one has a title', () => {
  assert.equal(CONTRACTS.length, 4)
  assert.deepEqual(
    CONTRACTS.map((c) => c.shelf),
    ['rebalancing', 'grid-trading', 'yield', 'health-factor'],
  )
  for (const c of CONTRACTS) {
    assert.equal(SHELF_TITLES[c.shelf], c.title)
    assert.ok(c.strong.length > 0 && c.weak.length > 0)
    assert.ok(c.question.endsWith('?'))
  }
  assert.equal(Object.keys(SHELF_TITLES).length, 4)
})
