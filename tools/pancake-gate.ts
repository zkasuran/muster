/**
 * Gate for lib/pancake.ts. Reads every pool in PCS_POOLS live, recomputes the price from the tick
 * independently of the module, then runs lpDrift on a band around spot, a band far from spot and a
 * band too thin to hold. Non-zero exit on any failed check.
 *
 * node --experimental-strip-types --no-warnings tools/pancake-gate.ts
 */
import { PCS_POOLS, readPool, lpDrift, type PoolState } from '../lib/pancake.ts'

let failures = 0

function check(label: string, ok: boolean, detail: string): void {
  if (!ok) failures++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`)
}

/** Independent of the module: price straight from the tick, with the decimals shift applied. */
function priceFromTick(tick: number, decimals0: number, decimals1: number): number {
  return 1.0001 ** tick * 10 ** (decimals0 - decimals1)
}

const snapDown = (t: number, spacing: number) => Math.floor(t / spacing) * spacing
const snapUp = (t: number, spacing: number) => Math.ceil(t / spacing) * spacing

async function expectThrow(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
    check(label, false, 'no error raised')
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).replace(/\s+/g, ' ')
    check(label, true, `refused with "${msg.slice(0, 200)}"`)
  }
}

console.log('=== 1. every pool in PCS_POOLS, read live ===')
const states = new Map<string, PoolState>()
for (const { label, pool } of PCS_POOLS) {
  const s = await readPool(pool)
  states.set(label, s)
  const fromTick = priceFromTick(s.tick, s.decimals0, s.decimals1)
  const gapBps = Math.abs(s.price1Per0 / fromTick - 1) * 10_000
  console.log(`\n${label}  ${s.pool}`)
  console.log(`  block ${s.atBlock}  readAt ${new Date(s.readAt).toISOString()}`)
  console.log(`  ${s.symbol0} ${s.decimals0}dp / ${s.symbol1} ${s.decimals1}dp   fee ${s.fee} ppm   tickSpacing ${s.tickSpacing}`)
  console.log(`  tick ${s.tick}   sqrtPriceX96 ${s.sqrtPriceX96}`)
  console.log(`  liquidity ${s.liquidity}`)
  console.log(`  price1Per0 ${s.price1Per0}  (${s.price1Per0.toPrecision(8)} ${s.symbol1} per ${s.symbol0})`)
  console.log(`  inverse    ${(1 / s.price1Per0).toPrecision(8)} ${s.symbol0} per ${s.symbol1}`)
  console.log(`  1.0001^${s.tick} = ${fromTick}  ->  gap ${gapBps.toFixed(3)} bps`)
  check(`${label} tick agrees with sqrtPriceX96`, gapBps < 25, `${gapBps.toFixed(3)} bps apart`)
  check(`${label} liquidity is non-zero`, BigInt(s.liquidity) > 0n, `${s.liquidity}`)
}

console.log('\n=== 2. is the BNB price plausible ===')
const bnbLow = states.get('USDT/WBNB 0.01%')
const bnbHigh = states.get('USDT/WBNB 0.05%')
if (!bnbLow || !bnbHigh) throw new Error('the two USDT/WBNB pools did not read')
const usdtPerBnbLow = 1 / bnbLow.price1Per0
const usdtPerBnbHigh = 1 / bnbHigh.price1Per0
console.log(`  0.01% tier ${usdtPerBnbLow.toFixed(4)} USDT per WBNB`)
console.log(`  0.05% tier ${usdtPerBnbHigh.toFixed(4)} USDT per WBNB`)
check(
  'BNB price inside a plausible band',
  usdtPerBnbLow > 100 && usdtPerBnbLow < 5000,
  `${usdtPerBnbLow.toFixed(4)} USDT per WBNB against a 100 to 5000 band`,
)
const tierGapBps = Math.abs(usdtPerBnbLow / usdtPerBnbHigh - 1) * 10_000
check(
  'the two low fee tiers agree',
  tierGapBps < 100,
  `${tierGapBps.toFixed(2)} bps between the 0.01% and 0.05% tiers`,
)

console.log('\n=== 3. lpDrift, band around spot against band far away ===')
for (const label of ['USDT/WBNB 0.01%', 'Cake/WBNB 0.25%']) {
  const s = states.get(label)
  if (!s) throw new Error(`${label} did not read`)
  const sp = s.tickSpacing
  // About 3% either side of spot, snapped onto the tier's grid so the range could be minted.
  const near = { lower: snapDown(s.tick - 300, sp), upper: snapUp(s.tick + 300, sp) }
  // Well below spot, so the position would hold one token and earn nothing.
  const far = { lower: snapDown(s.tick - 5000, sp), upper: snapUp(s.tick - 4000, sp) }
  // The tightest band this tier can mint, one tickSpacing wide, which is under 1% on both tiers.
  const thin = { lower: snapDown(s.tick, sp), upper: snapDown(s.tick, sp) + sp }

  for (const [kind, r] of [['near', near], ['far', far], ['thin', thin]] as const) {
    const d = await lpDrift(s.pool, r.lower, r.upper)
    console.log(`\n${label} ${kind} range [${d.lowerTick}, ${d.upperTick})  currentTick ${d.currentTick}  block ${d.atBlock}`)
    console.log(`  inRange ${d.inRange}   toLower ${fmtNullable(d.distanceToLowerPct)}   toUpper ${fmtNullable(d.distanceToUpperPct)}`)
    console.log(`  ${d.recommendation}: ${d.why}`)
    if (kind === 'near') {
      check(`${label} near range is in range`, d.inRange, `currentTick ${d.currentTick} inside [${d.lowerTick}, ${d.upperTick})`)
      check(`${label} near range holds`, d.recommendation === 'hold', d.recommendation)
    }
    if (kind === 'far') {
      check(`${label} far range is out of range`, !d.inRange, `currentTick ${d.currentTick} outside [${d.lowerTick}, ${d.upperTick})`)
      check(`${label} far range recentres`, d.recommendation === 'recentre', d.recommendation)
      check(
        `${label} far range distances carry the sign`,
        (d.distanceToUpperPct ?? 0) < 0,
        `toUpper ${fmtNullable(d.distanceToUpperPct)} once spot has crossed it`,
      )
    }
    if (kind === 'thin') {
      check(`${label} thin range widens`, d.recommendation === 'widen', d.recommendation)
    }
  }
}

console.log('\n=== 4. what the module refuses ===')
/**
 * The Uniswap v3 USDT/WBNB 0.05% pool on BSC. It answers token0, token1, fee, tickSpacing,
 * liquidity and slot0 with the same shapes as a PancakeSwap pool, on the same pair at the same fee
 * tier, so only the factory check tells the two apart.
 */
await expectThrow('a Uniswap v3 pool on BSC is not a PancakeSwap pool', () =>
  readPool('0x6fe9E9de56356F7eDBfcBB29FAB7cd69471a4869'),
)
// A real ERC-20, so the address has code, but none of the pool calls exist on it.
await expectThrow('a token address is not a pool', () =>
  readPool('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
)
await expectThrow('an address with no code', () =>
  readPool('0x0000000000000000000000000000000000000001'),
)
await expectThrow('not an address at all', () => readPool('not-an-address'))
const first = PCS_POOLS[0]
if (!first) throw new Error('PCS_POOLS is empty')
await expectThrow('lowerTick above upperTick', () => lpDrift(first.pool, -66000, -66500))
await expectThrow('a tick past MIN_TICK', () => lpDrift(first.pool, -887273, 0))

console.log('\n=== 5. an off grid range says so ===')
const coarse = states.get('Cake/WBNB 0.25%')
if (!coarse) throw new Error('Cake/WBNB 0.25% did not read')
const offGrid = await lpDrift(
  coarse.pool,
  snapDown(coarse.tick - 300, coarse.tickSpacing) + 1,
  snapUp(coarse.tick + 300, coarse.tickSpacing) + 1,
)
console.log(`  [${offGrid.lowerTick}, ${offGrid.upperTick}) on a ${coarse.tickSpacing} tick grid`)
console.log(`  ${offGrid.recommendation}: ${offGrid.why}`)
check(
  'off grid bounds are called out',
  offGrid.why.includes('off the 50 tick grid'),
  'the why names the grid',
)

console.log(`\n=== summary: ${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`} ===`)
process.exit(failures === 0 ? 0 : 1)

function fmtNullable(v: number | null): string {
  return v === null ? 'unknown' : `${v.toFixed(3)}%`
}
