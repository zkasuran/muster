/**
 * What lib/pancake.ts exposes without a chain read: the pool table plus the tick checks
 * `lpDrift` runs before it calls `readPool`. Those three refusals mirror
 * `PancakeV3Pool.checkTicks`, so a range that fails them describes no position that could
 * exist on chain and no RPC round trip is spent finding that out.
 *
 * The tick-to-price arithmetic itself is module-private (`rawPrice`, `orient`, `sig`), so it
 * is not reachable from here without a live pool read.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getAddress } from 'viem'
import { PCS_POOLS, lpDrift } from './pancake.ts'

/** `TickMath.MIN_TICK` and `MAX_TICK`. */
const MIN_TICK = -887272
const MAX_TICK = 887272

test('every pool address is checksummed, unique and 20 bytes', () => {
  assert.equal(PCS_POOLS.length, 5)
  const seen = new Set<string>()
  for (const p of PCS_POOLS) {
    assert.match(p.pool, /^0x[0-9a-fA-F]{40}$/, `${p.label} is not an address`)
    // Stored checksummed, so `getAddress` in readPool is a no-op rather than a repair.
    assert.equal(p.pool, getAddress(p.pool), `${p.label} is not checksummed`)
    assert.equal(seen.has(p.pool.toLowerCase()), false, `${p.pool} appears twice`)
    seen.add(p.pool.toLowerCase())
  }
  assert.equal(seen.size, 5)
})

test('every label names a pair and a fee tier PancakeSwap v3 enables on BSC', () => {
  // 100, 500, 2500 and 10000 pips. There is no 0.3% tier on this chain.
  const tiers = new Set(['0.01%', '0.05%', '0.25%', '1%'])
  const labels = new Set<string>()
  for (const p of PCS_POOLS) {
    const m = /^([A-Za-z0-9]+)\/([A-Za-z0-9]+) (\d+(?:\.\d+)?%)$/.exec(p.label)
    assert.ok(m, `${p.label} is not "BASE/QUOTE tier"`)
    assert.ok(tiers.has(m[3] ?? ''), `${p.label} names a tier BSC does not enable`)
    assert.equal(labels.has(p.label), false, `${p.label} appears twice`)
    labels.add(p.label)
  }
  assert.equal(labels.size, 5)
})

test('lpDrift refuses a non-integer tick before it reads a pool', async () => {
  await assert.rejects(
    () => lpDrift(PCS_POOLS[0]?.pool ?? '', -100.5, 100),
    /ticks must be integers, got -100\.5 to 100/,
  )
  await assert.rejects(() => lpDrift(PCS_POOLS[0]?.pool ?? '', -100, Number.NaN), /ticks must be integers/)
})

test('lpDrift refuses a range whose lower bound is not below its upper', async () => {
  await assert.rejects(
    () => lpDrift(PCS_POOLS[0]?.pool ?? '', 200, 200),
    /lowerTick 200 must sit below upperTick 200/,
  )
  await assert.rejects(
    () => lpDrift(PCS_POOLS[0]?.pool ?? '', 300, 200),
    /lowerTick 300 must sit below upperTick 200/,
  )
})

test('lpDrift refuses a range outside the tick bounds', async () => {
  await assert.rejects(
    () => lpDrift(PCS_POOLS[0]?.pool ?? '', MIN_TICK - 1, 0),
    /range \[-887273, 0\] leaves the tick bounds \[-887272, 887272\]/,
  )
  await assert.rejects(
    () => lpDrift(PCS_POOLS[0]?.pool ?? '', 0, MAX_TICK + 1),
    /range \[0, 887273\] leaves the tick bounds \[-887272, 887272\]/,
  )
})
