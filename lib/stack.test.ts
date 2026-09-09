/**
 * [doc 11] The BSC chain facts docs/11-BNB-STACK states, pinned against lib/constants.ts rather
 * than left in prose. No network and no db: every assertion is internal consistency between the
 * constants and the identities the document rests on. The live reads that confirm these on chain
 * are on /stack. This file proves the pinned side is self-consistent before any read happens, so a
 * typo in a slot or a decimals value fails here instead of on the site.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { keccak256, toBytes, getAddress } from 'viem'
import {
  TOKENS,
  REGISTRY,
  EIP1967_IMPL_SLOT,
  PINNED_IMPL,
  PINNED_DOMAIN_SEPARATOR,
  PANCAKE_V3_FEE_TIERS,
} from './constants.ts'

test('every configured BSC stablecoin is 18 decimals', () => {
  // Mainnet BSC has no 6-decimal stablecoin, so code carried from a 6-decimal USDC chain is wrong
  // here by a factor of a trillion. The decimals rule is the whole rule.
  for (const [key, t] of Object.entries(TOKENS)) {
    assert.equal(t.decimals, 18, `${key} is not 18 decimals`)
  }
})

test('the EIP-1967 implementation slot is keccak256("eip1967.proxy.implementation") - 1', () => {
  const derived = `0x${(BigInt(keccak256(toBytes('eip1967.proxy.implementation'))) - 1n).toString(16)}`
  assert.equal(EIP1967_IMPL_SLOT, derived)
  assert.match(EIP1967_IMPL_SLOT, /^0x[0-9a-f]{64}$/)
})

test('the identity counter slot exists because totalSupply reverts and is ERC-7201 shaped', () => {
  // The registry is not ERC721Enumerable, so totalSupply() reverts and the population is read from
  // this storage slot instead. Its presence is the workaround. Its low byte is zero, which is the
  // ERC-7201 namespaced-slot structure the registry uses.
  assert.match(REGISTRY.identityCounterSlot, /^0x[0-9a-f]{64}$/)
  assert.equal(BigInt(REGISTRY.identityCounterSlot) & 0xffn, 0n)
})

test('a proxy has a pinned implementation and it is a checksummed address', () => {
  for (const key of ['identity', 'reputation', 'U', 'USD1', 'USDC']) {
    const v = PINNED_IMPL[key]
    assert.ok(v, `${key} has no pinned implementation`)
    assert.equal(getAddress(v as string), v, `${key} pinned implementation is not checksummed`)
  }
  // USDT is a plain token, not an EIP-1967 proxy, so its slot reads empty and there is nothing to pin.
  assert.equal(PINNED_IMPL['USDT'], null)
})

test('a token pins a DOMAIN_SEPARATOR exactly when its config signs EIP-712', () => {
  for (const [key, t] of Object.entries(TOKENS)) {
    const signs = t.eip3009 || t.permit
    const pinned = PINNED_DOMAIN_SEPARATOR[key as keyof typeof TOKENS]
    if (signs) {
      assert.match(pinned ?? '', /^0x[0-9a-f]{64}$/, `${key} signs EIP-712 but pins no DOMAIN_SEPARATOR`)
    } else {
      assert.equal(pinned, null, `${key} settles over Permit2 and must pin no DOMAIN_SEPARATOR`)
    }
  }
})

test('PancakeSwap v3 on BSC enables 100/500/2500/10000 and not 3000', () => {
  assert.deepEqual([...PANCAKE_V3_FEE_TIERS], [100, 500, 2500, 10000])
  const tiers = PANCAKE_V3_FEE_TIERS as readonly number[]
  assert.ok(!tiers.includes(3000), 'there is no 0.3% tier on BSC')
  // Pips to percent, so the numeric tiers match the labels lib/pancake.ts carries.
  const percents = tiers.map((pips) => pips / 10000)
  assert.deepEqual(percents, [0.01, 0.05, 0.25, 1])
})
