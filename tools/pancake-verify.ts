/**
 * Independent verification of lib/pancake.ts. Nothing here calls the module's own helpers for a
 * number it is checking: the price is recomputed from sqrtPriceX96 with exact BigInt arithmetic at
 * 40 decimal places, the tick is recomputed from the price, the pool's identity is re-read straight
 * off the factory and the BNB price is compared against Binance's own public ticker.
 *
 * node --experimental-strip-types --no-warnings tools/pancake-verify.ts
 */
import { getAddress, parseAbi } from 'viem'
import { withRpc } from '../lib/rpc.ts'
import { PCS_POOLS, readPool, lpDrift } from '../lib/pancake.ts'

let bad = 0
function check(label: string, ok: boolean, detail: string): void {
  if (!ok) bad++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`)
}

const POOL = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function tickSpacing() view returns (int24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)',
])
const FACTORY = getAddress('0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865')
const FACTORY_ABI = parseAbi([
  'function getPool(address,address,uint24) view returns (address)',
  'function feeAmountTickSpacing(uint24) view returns (int24)',
])

const SCALE = 10n ** 40n
const Q192 = 1n << 192n

/** Exact token1 per token0 as a 40 decimal fixed point integer. No doubles anywhere. */
function exactRaw(sqrtPriceX96: bigint): bigint {
  return (sqrtPriceX96 * sqrtPriceX96 * SCALE) / Q192
}

/**
 * The double, widened to the same 40 decimal fixed point as `exactRaw`. A double is uniquely
 * described by 17 significant digits, so 19 loses nothing. Scaling with `Math.round(x * 1e18)`
 * would quantise a 1.3e-3 price at 7.7e-16 relative and swamp the error being measured.
 */
function scaled40(x: number): bigint {
  const [mant = '0', exp = '0'] = x.toExponential(18).split('e')
  const digits = BigInt(mant.replace('-', '').replace('.', ''))
  const shift = 40 + Number(exp) - 18
  const v = shift >= 0 ? digits * 10n ** BigInt(shift) : digits / 10n ** BigInt(-shift)
  return mant.startsWith('-') ? -v : v
}

/** Relative gap between a double and the exact value, computed in the exact domain. */
function relGap(approx: number, exact: bigint): number {
  if (exact === 0n) return Number.NaN
  const d = scaled40(approx) - exact
  return Math.abs(Number(d < 0n ? -d : d) / Number(exact))
}

console.log('=== 1. fee tiers the factory actually enables ===')
const tiers = await withRpc((c) =>
  c.multicall({
    contracts: [100, 200, 500, 1000, 2500, 3000, 10000, 20000].map((fee) => ({
      address: FACTORY,
      abi: FACTORY_ABI,
      functionName: 'feeAmountTickSpacing' as const,
      args: [fee],
    })),
    allowFailure: false,
  }),
)
console.log(`  100:${tiers[0]} 200:${tiers[1]} 500:${tiers[2]} 1000:${tiers[3]} 2500:${tiers[4]} 3000:${tiers[5]} 10000:${tiers[6]} 20000:${tiers[7]}`)
check('the four tiers the file names are the enabled set', tiers[0] === 1 && tiers[2] === 10 && tiers[4] === 50 && tiers[6] === 200, `spacings 1/10/50/200`)
check('there is no 3000 tier', tiers[5] === 0 && tiers[1] === 0 && tiers[3] === 0 && tiers[7] === 0, `feeAmountTickSpacing(3000) = ${tiers[5]}`)

console.log('\n=== 2. every pool, module against a raw read at the same block ===')
const prices = new Map<string, number>()
for (const { label, pool } of PCS_POOLS) {
  const s = await readPool(pool)
  const raw = await withRpc((c) =>
    c.multicall({
      contracts: [
        { address: getAddress(pool), abi: POOL, functionName: 'token0' },
        { address: getAddress(pool), abi: POOL, functionName: 'token1' },
        { address: getAddress(pool), abi: POOL, functionName: 'fee' },
        { address: getAddress(pool), abi: POOL, functionName: 'tickSpacing' },
        { address: getAddress(pool), abi: POOL, functionName: 'slot0' },
      ],
      allowFailure: false,
      blockNumber: BigInt(s.atBlock),
    }),
  )
  const [t0, t1, fee, spacing, slot0] = raw
  const owned = await withRpc((c) =>
    c.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'getPool', args: [t0, t1, fee] }),
  )
  const exact = exactRaw(slot0[0])
  const human = Number(exact) / 1e40 * 10 ** (s.decimals0 - s.decimals1)
  prices.set(label, human)

  console.log(`\n${label}  ${s.pool}  block ${s.atBlock}`)
  console.log(`  ${s.symbol0} ${s.decimals0}dp / ${s.symbol1} ${s.decimals1}dp  fee ${s.fee}  tickSpacing ${s.tickSpacing}  liquidity ${s.liquidity}`)
  console.log(`  module price1Per0 ${s.price1Per0}`)
  console.log(`  exact  price1Per0 ${(Number(exact) / 1e40).toPrecision(20)}  (BigInt, 40dp)`)
  console.log(`  1 ${s.symbol0} = ${s.price1Per0.toPrecision(10)} ${s.symbol1}   1 ${s.symbol1} = ${(1 / s.price1Per0).toPrecision(10)} ${s.symbol0}`)

  check(`${label} token0/token1 match the raw read`, getAddress(s.token0) === getAddress(t0) && getAddress(s.token1) === getAddress(t1), `${t0} / ${t1}`)
  check(`${label} fee and tickSpacing match`, s.fee === fee && s.tickSpacing === spacing, `${fee} ppm / ${spacing}`)
  check(`${label} tickSpacing is the tier's own`, spacing === tiers[[100, 200, 500, 1000, 2500, 3000, 10000, 20000].indexOf(fee)], `${spacing} for fee ${fee}`)
  check(`${label} factory owns this address`, getAddress(owned) === getAddress(pool), `getPool -> ${owned}`)
  check(`${label} module price matches exact BigInt math`, relGap(s.price1Per0, exact) < 1e-14, `${(relGap(s.price1Per0, exact) * 1e16).toFixed(2)}e-16 relative`)

  // 1.0001^tick, and the tick recovered back out of the price. The floor is what slot0 stores.
  const fromTick = 1.0001 ** s.tick
  const gapBps = Math.abs(s.price1Per0 / (fromTick * 10 ** (s.decimals0 - s.decimals1)) - 1) * 10_000
  const roundTrip = Math.floor(Math.log(Number(exact) / 1e40) / Math.log(1.0001))
  console.log(`  1.0001^${s.tick} = ${fromTick.toPrecision(12)}  gap ${gapBps.toFixed(4)} bps   floor(log_1.0001(price)) = ${roundTrip}`)
  check(`${label} tick round trips through 1.0001^tick`, roundTrip === s.tick, `${roundTrip} vs slot0 ${s.tick}`)
  check(`${label} price sits inside one tick of 1.0001^tick`, gapBps >= 0 && gapBps < 1.01, `${gapBps.toFixed(4)} bps, one tick is 1 bp`)
  check(`${label} liquidity is non-zero`, BigInt(s.liquidity) > 0n, s.liquidity)
  check(`${label} block is recent`, s.atBlock > 120_000_000, `${s.atBlock}`)
}

console.log('\n=== 3. is the BNB price real, against Binance own ticker ===')
const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT')
const ticker = (await res.json()) as { price?: string }
const cex = Number(ticker.price)
const p1 = prices.get('USDT/WBNB 0.01%')
const p2 = prices.get('USDT/WBNB 0.05%')
if (!p1 || !p2) throw new Error('the USDT/WBNB pools did not read')
const pool1 = 1 / p1
const pool2 = 1 / p2
console.log(`  binance BNBUSDT ${cex}`)
console.log(`  v3 0.01% tier   ${pool1.toFixed(4)} USDT per WBNB`)
console.log(`  v3 0.05% tier   ${pool2.toFixed(4)} USDT per WBNB`)
check('pool BNB price is inside 100..5000', pool1 > 100 && pool1 < 5000, `${pool1.toFixed(4)}`)
check('pool BNB price is within 1% of the CEX mid', Math.abs(pool1 / cex - 1) < 0.01, `${(Math.abs(pool1 / cex - 1) * 10_000).toFixed(1)} bps from ${cex}`)
check('the two tiers agree inside 100 bps', Math.abs(pool1 / pool2 - 1) < 0.01, `${(Math.abs(pool1 / pool2 - 1) * 10_000).toFixed(2)} bps apart`)
const btc = prices.get('BTCB/WBNB 0.05%')
const cake = prices.get('Cake/WBNB 0.25%')
const usdc = prices.get('USDT/USDC 0.01%')
if (btc) console.log(`  implied BTCB ${(btc * pool1).toFixed(2)} USD, from ${btc.toFixed(6)} WBNB per BTCB`)
if (cake) console.log(`  implied Cake ${(pool1 / (1 / cake)).toFixed(4)} USD, from ${(1 / cake).toFixed(4)} Cake per WBNB`)
if (usdc) check('USDT/USDC sits within 1% of parity', Math.abs(usdc - 1) < 0.01, `${usdc.toFixed(6)}`)
if (btc) check('implied BTC price is inside 10k..500k', btc * pool1 > 10_000 && btc * pool1 < 500_000, `${(btc * pool1).toFixed(2)} USD`)

console.log('\n=== 4. drift, in range against out of range ===')
for (const label of ['USDT/WBNB 0.01%', 'Cake/WBNB 0.25%']) {
  const entry = PCS_POOLS.find((p) => p.label === label)
  if (!entry) throw new Error(`${label} is not in PCS_POOLS`)
  const s = await readPool(entry.pool)
  const sp = s.tickSpacing
  const down = (t: number) => Math.floor(t / sp) * sp
  const up = (t: number) => Math.ceil(t / sp) * sp
  const cases = [
    ['centred', down(s.tick - 300), up(s.tick + 300)],
    ['far below spot', down(s.tick - 6000), up(s.tick - 5000)],
    ['far above spot', down(s.tick + 5000), up(s.tick + 6000)],
    ['one spacing wide', down(s.tick), down(s.tick) + sp],
    // Wide enough to clear the thin band gate, with spot 9% of the way in from the lower bound.
    ['off centre', down(s.tick - 1200), up(s.tick + 120)],
  ] as const
  for (const [kind, lower, upper] of cases) {
    const d = await lpDrift(entry.pool, lower, upper)
    console.log(`\n  ${label} ${kind} [${d.lowerTick}, ${d.upperTick})  tick ${d.currentTick}  block ${d.atBlock}`)
    console.log(`    inRange ${d.inRange}  toLower ${d.distanceToLowerPct === null ? 'unknown' : d.distanceToLowerPct.toFixed(4) + '%'}  toUpper ${d.distanceToUpperPct === null ? 'unknown' : d.distanceToUpperPct.toFixed(4) + '%'}`)
    console.log(`    ${d.recommendation}: ${d.why}`)
    const expected = d.currentTick >= d.lowerTick && d.currentTick < d.upperTick
    check(`${label} ${kind} inRange agrees with the tick`, d.inRange === expected, `inRange ${d.inRange}, tick ${d.currentTick} in [${d.lowerTick}, ${d.upperTick})`)
    if (kind === 'centred') check(`${label} centred holds`, d.inRange && d.recommendation === 'hold', d.recommendation)
    if (kind === 'far below spot') {
      check(`${label} far below is out of range`, !d.inRange && d.recommendation === 'recentre', d.recommendation)
      check(`${label} far below signs the upper distance negative`, (d.distanceToUpperPct ?? 0) < 0, `${d.distanceToUpperPct}`)
    }
    if (kind === 'far above spot') {
      check(`${label} far above is out of range`, !d.inRange && d.recommendation === 'recentre', d.recommendation)
      check(`${label} far above signs the lower distance negative`, (d.distanceToLowerPct ?? 0) < 0, `${d.distanceToLowerPct}`)
    }
    if (kind === 'one spacing wide') check(`${label} one spacing wide widens`, d.recommendation === 'widen', d.recommendation)
    if (kind === 'off centre') check(`${label} an off centre band recentres`, d.inRange && d.recommendation === 'recentre', `${d.inRange} ${d.recommendation}`)
    // The distances are a price ratio, so they must reproduce from the bound ticks alone.
    const spot = 1.0001 ** d.currentTick
    if (d.distanceToLowerPct !== null) {
      const want = ((spot - 1.0001 ** d.lowerTick) / spot) * 100
      check(`${label} ${kind} toLower reproduces from the ticks`, Math.abs(d.distanceToLowerPct - want) < 0.05, `${d.distanceToLowerPct.toFixed(4)}% against ${want.toFixed(4)}% from 1.0001^tick`)
    }
  }
}

console.log('\n=== 5. what it refuses ===')
async function refuses(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
    check(label, false, 'returned instead of throwing')
  } catch (e) {
    check(label, true, `"${(e instanceof Error ? e.message : String(e)).replace(/\s+/g, ' ').slice(0, 150)}"`)
  }
}
// Uniswap v3 on BSC, same pair and same fee tier, so only the factory check separates them.
await refuses('a Uniswap v3 pool', () => readPool('0x6fe9E9de56356F7eDBfcBB29FAB7cd69471a4869'))
await refuses('a v2 pair', () => readPool('0x16b9a82891338f9bA80E2D6970FDda79D1eB0daE'))
await refuses('an EOA', () => readPool('0x000000000000000000000000000000000000dEaD'))
const one = PCS_POOLS[0]
if (!one) throw new Error('PCS_POOLS is empty')
await refuses('inverted ticks', () => lpDrift(one.pool, 100, 100))
await refuses('a tick past MAX_TICK', () => lpDrift(one.pool, 0, 887273))
await refuses('a fractional tick', () => lpDrift(one.pool, -66400.5, -66000))

console.log(`\n=== ${bad === 0 ? 'ALL INDEPENDENT CHECKS PASSED' : `${bad} INDEPENDENT CHECK(S) FAILED`} ===`)
process.exit(bad === 0 ? 0 : 1)
