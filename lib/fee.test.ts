/**
 * [doc 08] Pure-logic tests for the fee schedule. No db, no network. The rows mirror the table in
 * 08-MONEY section 9, so a change to the schedule that disagrees with the document fails here.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { documentedFee, chargedFeeBase, DEPLOYMENT_TAKES_FEE, FEE_SCHEDULE } from './fee.ts'

test('this deployment charges no fee', () => {
  assert.equal(DEPLOYMENT_TAKES_FEE, false)
  assert.equal(chargedFeeBase(), '0')
})

test('a price below the minimum brokered price is not brokered and pays nothing', () => {
  // 0.02 and 0.05, the two shipped prices, both sit below the 0.10 minimum.
  assert.deepEqual(documentedFee('20000000000000000'), { brokered: false, feeBase: '0', bindingLeg: 'not brokered' })
  assert.deepEqual(documentedFee('50000000000000000'), { brokered: false, feeBase: '0', bindingLeg: 'not brokered' })
})

test('the documented schedule matches the section 9 table', () => {
  // 0.10, the minimum brokered price: the floor binds at 0.01.
  assert.deepEqual(documentedFee('100000000000000000'), { brokered: true, feeBase: '10000000000000000', bindingLeg: 'floor' })
  // 0.50, the crossover: floor and percentage are equal at 0.01.
  assert.deepEqual(documentedFee('500000000000000000'), { brokered: true, feeBase: '10000000000000000', bindingLeg: 'both' })
  // 1.00: 200 bps takes over at 0.02.
  assert.deepEqual(documentedFee('1000000000000000000'), { brokered: true, feeBase: '20000000000000000', bindingLeg: 'percentage' })
  // 5.00: 200 bps at 0.10.
  assert.deepEqual(documentedFee('5000000000000000000'), { brokered: true, feeBase: '100000000000000000', bindingLeg: 'percentage' })
})

test('the percentage leg truncates toward zero rather than rounding up against the buyer', () => {
  // 0.11: 200 bps is 0.0022, below the 0.01 floor, so the floor binds.
  const f = documentedFee('110000000000000000')
  assert.equal(f.feeBase, '10000000000000000')
  assert.equal(f.bindingLeg, 'floor')
})

test('a non-integer price string is refused rather than guessed', () => {
  assert.deepEqual(documentedFee('0.10'), { brokered: false, feeBase: '0', bindingLeg: 'not brokered' })
})

test('the schedule constants are the section 9 values', () => {
  assert.equal(FEE_SCHEDULE.basisPoints, 200)
  assert.equal(FEE_SCHEDULE.floorBase, '10000000000000000')
  assert.equal(FEE_SCHEDULE.minBrokeredBase, '100000000000000000')
})
