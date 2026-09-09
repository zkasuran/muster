/**
 * [doc 08] Pure-logic tests for the money helpers. No db, no network.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tokenLabel, formatTokenAmount, amountWithSymbol } from './money.ts'

test('tokenLabel resolves USD1 case-insensitively', () => {
  const t = tokenLabel('0x8D0D000EE44948FC98C9B98A4FA4921476F08B0D')
  assert.equal(t.symbol, 'USD1')
  assert.equal(t.decimals, 18)
  assert.equal(t.known, true)
})

test('tokenLabel returns an honest unknown for an address not in the table', () => {
  const t = tokenLabel('0x000000000000000000000000000000000000dead')
  assert.equal(t.known, false)
  assert.equal(t.symbol, 'unknown token')
  assert.equal(t.decimals, null)
})

test('formatTokenAmount is exact to the wei with no float', () => {
  assert.equal(formatTokenAmount('20000000000000000', 18), '0.02')
  assert.equal(formatTokenAmount('50000000000000000', 18), '0.05')
  assert.equal(formatTokenAmount('1000000000000000000', 18), '1')
  assert.equal(formatTokenAmount('1', 18), '0.000000000000000001')
  assert.equal(formatTokenAmount('0', 18), '0')
})

test('formatTokenAmount refuses a non-integer string and unknown decimals', () => {
  assert.equal(formatTokenAmount('0.02', 18), 'unknown')
  assert.equal(formatTokenAmount('abc', 18), 'unknown')
  assert.equal(formatTokenAmount('20000000000000000', null), '20000000000000000 base units')
})

test('amountWithSymbol joins the exact amount to the resolved symbol', () => {
  assert.equal(amountWithSymbol('20000000000000000', '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d'), '0.02 USD1')
})
