/**
 * [doc 10] lib/preview.ts is pure, so it is pinned here. It reshapes a first-party agent into the
 * contract a ?preview=1 GET returns. No network, no db.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { previewContract } from './preview.ts'
import { FIRST_PARTY } from './agents.ts'
import { TOKENS } from './constants.ts'

test('previewContract returns the contract for every shelf', () => {
  for (const agent of FIRST_PARTY) {
    const c = previewContract(agent.slug)
    assert.ok(c, `no contract for ${agent.slug}`)
    assert.equal(c.agent, agent.name)
    assert.equal(c.shelf, agent.slug)
    assert.equal(c.summary, agent.summary)
    assert.equal(c.endpoint, `/api/agent/${agent.slug}`)
    assert.equal(c.price.base, agent.priceBase)
    assert.equal(c.price.token, TOKENS.USD1.symbol)
    assert.equal(c.price.decimals, TOKENS.USD1.decimals)
    assert.equal(c.price.asset, TOKENS.USD1.address)
    assert.equal(c.price.scheme, 'eip3009')
    assert.equal(c.price.network, 'eip155:56')
    assert.deepEqual(c.inputs, agent.inputs)
    assert.deepEqual(c.outputs, agent.outputs)
    assert.deepEqual(c.reads, agent.reads)
  }
})

test('previewContract is null for an unknown shelf', () => {
  assert.equal(previewContract('not-a-shelf'), null)
})
