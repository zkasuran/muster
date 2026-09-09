/**
 * The search grammar parser, docs/03-TAXONOMY.md section 5.6. Pure: it never touches the store or
 * the network, so these assertions pin the grammar itself. The one that matters most is that an
 * unknown operator or value becomes a named error rather than a silently ignored clause, because a
 * quietly dropped filter is how a buyer gets a confidently wrong result.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseQuery, tokenAddress } from './search.ts'

test('bare words become ANDed terms and no clauses', () => {
  const p = parseQuery('venus health factor')
  assert.deepEqual(p.terms, ['venus', 'health', 'factor'])
  assert.equal(p.clauses.length, 0)
  assert.equal(p.errors.length, 0)
})

test('an operator clause parses into op, value and no negation', () => {
  const p = parseQuery('tag:yield')
  assert.equal(p.terms.length, 0)
  assert.deepEqual(p.clauses, [{ op: 'tag', value: 'yield', negate: false, gte: false }])
})

test('a leading dash inverts the operator', () => {
  const p = parseQuery('-is:first-party')
  assert.deepEqual(p.clauses, [{ op: 'is', value: 'first-party', negate: true, gte: false }])
})

test('tier accepts an exact rung and a >= comparison', () => {
  assert.deepEqual(parseQuery('tier:probed').clauses, [{ op: 'tier', value: 'probed', negate: false, gte: false }])
  assert.deepEqual(parseQuery('tier:>=payable').clauses, [{ op: 'tier', value: 'payable', negate: false, gte: true }])
})

test('an unknown operator is an error naming it, not a dropped clause', () => {
  const p = parseQuery('venue:pancakeswap-v2')
  assert.equal(p.clauses.length, 0)
  assert.deepEqual(p.errors, [{ op: 'venue', value: 'pancakeswap-v2', kind: 'operator' }])
})

test('a known operator with an unknown value is a value error', () => {
  const p = parseQuery('tag:monitoring')
  assert.equal(p.clauses.length, 0)
  assert.deepEqual(p.errors, [{ op: 'tag', value: 'monitoring', kind: 'value' }])
})

test('token accepts a published symbol or a 20-byte address and rejects nonsense', () => {
  assert.equal(parseQuery('token:USD1').clauses[0]?.value, 'USD1')
  const addr = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d'
  assert.equal(parseQuery(`token:${addr}`).clauses[0]?.value, addr)
  assert.equal(parseQuery('token:notatoken').errors[0]?.kind, 'value')
})

test('owner must be an address and agent must be an id', () => {
  assert.equal(parseQuery('owner:0x1111111111111111111111111111111111111111').clauses.length, 1)
  assert.equal(parseQuery('owner:alice').errors[0]?.kind, 'value')
  assert.equal(parseQuery('agent:324818').clauses.length, 1)
  assert.equal(parseQuery('agent:0x1').errors[0]?.kind, 'value')
})

test('a mixed query keeps the terms, the good clauses and the errors apart', () => {
  const p = parseQuery('venus tag:yield is:hireable bogus:x')
  assert.deepEqual(p.terms, ['venus'])
  assert.deepEqual(p.clauses.map((c) => `${c.op}:${c.value}`), ['tag:yield', 'is:hireable'])
  assert.deepEqual(p.errors, [{ op: 'bogus', value: 'x', kind: 'operator' }])
})

test('tokenAddress maps a symbol and passes an address through', () => {
  assert.equal(tokenAddress('USD1'), '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d')
  assert.equal(tokenAddress('0xabc'), '0xabc')
})

test('empty and whitespace queries parse to nothing', () => {
  const p = parseQuery('   ')
  assert.deepEqual(p, { terms: [], clauses: [], errors: [] })
})
