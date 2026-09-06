/**
 * Independent verification of lib/grid.ts. Nothing here imports lib/pancake.ts: the pool is read
 * with viem straight off a pinned block, the price is recomputed in exact BigInt rationals, and the
 * ladder is rebuilt from scratch and compared field by field against what planGrid returned.
 *
 * Run: node --experimental-strip-types --no-warnings tools/grid-verify.ts
 */
import { createPublicClient, http, parseAbi, getAddress } from 'viem'
import { bsc } from 'viem/chains'
import { planGrid } from '../lib/grid.ts'

const RPC = 'https://bsc-rpc.publicnode.com'
const c = createPublicClient({ chain: bsc, transport: http(RPC, { timeout: 20_000 }) })

const POOL_ABI = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function tickSpacing() view returns (int24)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)',
])
const ERC20_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
])

const USDT_WBNB_100 = '0x172fcD41E0913e95784454622d1c3724f546f849'
const USDT_WBNB_10000 = '0x6805E0E5333c5c3acCF2930Be4734E2b98f4Ce06'
const CAKE_WBNB_100 = '0x1E213600FA9317FEAC4Ef4087acDF5D0e25D7187'
const USDT_USDC_100 = '0x92b7807bF19b7DDdf89b706143896d05228f3121'
const SWAP_GAS_UNITS = 738_000n

let fails = 0
function check(label: string, ok: boolean, detail: string): void {
  if (!ok) fails += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`)
}
function n(v: number, d = 10): string {
  return Number(v.toPrecision(d)).toString()
}

/** Exact rational price, so the double implementation in lib/pancake.ts has something to fail against. */
function exactPrice(sqrtPriceX96: bigint, dec0: number, dec1: number): number {
  const num = sqrtPriceX96 * sqrtPriceX96 * 10n ** BigInt(dec0)
  const den = 2n ** 192n * 10n ** BigInt(dec1)
  // 40 digits of the quotient, then one parse, so no intermediate rounds inside a double.
  const scaled = (num * 10n ** 40n) / den
  return Number(`${scaled / 10n ** 40n}.${(scaled % 10n ** 40n).toString().padStart(40, '0')}`)
}

async function readRaw(pool: string) {
  const address = getAddress(pool)
  const atBlock = await c.getBlockNumber({ cacheTime: 0 })
  const [token0, token1, fee, tickSpacing, slot0] = await Promise.all([
    c.readContract({ address, abi: POOL_ABI, functionName: 'token0', blockNumber: atBlock }),
    c.readContract({ address, abi: POOL_ABI, functionName: 'token1', blockNumber: atBlock }),
    c.readContract({ address, abi: POOL_ABI, functionName: 'fee', blockNumber: atBlock }),
    c.readContract({ address, abi: POOL_ABI, functionName: 'tickSpacing', blockNumber: atBlock }),
    c.readContract({ address, abi: POOL_ABI, functionName: 'slot0', blockNumber: atBlock }),
  ])
  const [symbol0, decimals0, symbol1, decimals1] = await Promise.all([
    c.readContract({ address: token0, abi: ERC20_ABI, functionName: 'symbol', blockNumber: atBlock }),
    c.readContract({ address: token0, abi: ERC20_ABI, functionName: 'decimals', blockNumber: atBlock }),
    c.readContract({ address: token1, abi: ERC20_ABI, functionName: 'symbol', blockNumber: atBlock }),
    c.readContract({ address: token1, abi: ERC20_ABI, functionName: 'decimals', blockNumber: atBlock }),
  ])
  const price1Per0 = exactPrice(slot0[0], decimals0, decimals1)
  return {
    address,
    atBlock: Number(atBlock),
    token0,
    token1,
    symbol0,
    symbol1,
    decimals0,
    decimals1,
    fee: Number(fee),
    tickSpacing: Number(tickSpacing),
    sqrtPriceX96: slot0[0],
    tick: Number(slot0[1]),
    price1Per0,
  }
}

console.log(`=== independent check of lib/grid.ts ===\nnode ${process.version}  ${new Date().toISOString()}`)

console.log('\n--- 1. the pool the file names in its header, read fresh ---')
const raw = await readRaw(USDT_WBNB_100)
const fromTick = 1.0001 ** raw.tick
const bps = (raw.price1Per0 / fromTick - 1) * 1e4
const markIndependent = 1 / raw.price1Per0
console.log(
  `block ${raw.atBlock}  ${raw.symbol0}/${raw.symbol1}  fee ${raw.fee}  tickSpacing ${raw.tickSpacing}\n` +
    `sqrtPriceX96 ${raw.sqrtPriceX96}  tick ${raw.tick}\n` +
    `exact price1Per0 ${n(raw.price1Per0, 17)}   1.0001^tick ${n(fromTick, 17)}\n` +
    `USDT per WBNB ${n(markIndependent)}   tick gap ${bps.toFixed(4)} bps`,
)
check('fee is the 0.01% tier in pips', raw.fee === 100, String(raw.fee))
check('tickSpacing 1', raw.tickSpacing === 1, String(raw.tickSpacing))
check('token0 is USDT and token1 is WBNB', raw.symbol0 === 'USDT' && raw.symbol1 === 'WBNB', `${raw.symbol0}/${raw.symbol1}`)
check('sqrtPriceX96 and 1.0001^tick agree inside one tick', Math.abs(bps) < 1, `${bps.toFixed(4)} bps`)
check('tick round trips through log base 1.0001', Math.floor(Math.log(raw.price1Per0) / Math.log(1.0001)) === raw.tick, `floor(log) ${Math.floor(Math.log(raw.price1Per0) / Math.log(1.0001))} vs slot0 ${raw.tick}`)
check('BNB mark is inside a plausible range', markIndependent > 100 && markIndependent < 5000, `${n(markIndependent)} USDT per WBNB`)

console.log('\n--- 2. the ladder, rebuilt from scratch off the plan own mark ---')
const CAP = 5000
const LEVELS = 11
const plan = await planGrid({ pool: USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: LEVELS, capitalQuote: CAP })
console.log(`pair ${plan.pair}  mark ${n(plan.markPrice)}  block ${plan.atBlock}  spacing ${n(plan.spacingPct)}%`)
check('mark agrees with the independent exact read inside 50 bps', Math.abs(plan.markPrice / markIndependent - 1) < 5e-3, `${n(plan.markPrice)} vs ${n(markIndependent)}`)

const m = plan.markPrice
const expLower = m * 0.9
const expUpper = m * 1.1
const expStep = (expUpper / expLower) ** (1 / (LEVELS - 1))
const per = CAP / LEVELS
check('lower is the mark less 10%', Math.abs(plan.lower - expLower) / expLower < 1e-15, `${n(plan.lower)} vs ${n(expLower)}`)
check('upper is the mark plus 10%', Math.abs(plan.upper - expUpper) / expUpper < 1e-15, `${n(plan.upper)} vs ${n(expUpper)}`)
check('spacingPct is the geometric step', Math.abs(plan.spacingPct - (expStep - 1) * 100) < 1e-12, `${n(plan.spacingPct)} vs ${n((expStep - 1) * 100)}`)

let worstPrice = 0
let worstSize = 0
let sides = ''
let sumQuote = 0
let buyQuote = 0
let sellBase = 0
for (const lv of plan.levels) {
  const want = expLower * expStep ** lv.index
  worstPrice = Math.max(worstPrice, Math.abs(lv.price / want - 1))
  worstSize = Math.max(worstSize, Math.abs((lv.sizeBase * lv.price) / lv.notionalQuote - 1))
  sides += lv.side === 'buy' ? 'b' : 's'
  sumQuote += lv.notionalQuote
  if (lv.side === 'buy') buyQuote += lv.notionalQuote
  else sellBase += lv.sizeBase
}
console.log(`sides ${sides}   per level ${n(per)} USDT`)
check('every price matches lower * step^i', worstPrice < 1e-14, `worst ${worstPrice.toExponential(2)}`)
check('sizeBase * price equals notionalQuote', worstSize < 1e-14, `worst ${worstSize.toExponential(2)}`)
check('notionals sum to the capital given', Math.abs(sumQuote - CAP) / CAP < 1e-14, `${n(sumQuote, 15)} vs ${CAP}`)
check('capitalRequiredQuote is the buy side', Math.abs(buyQuote - plan.capitalRequiredQuote) < 1e-9, `${n(buyQuote)} vs ${n(plan.capitalRequiredQuote)}`)
check('capitalRequiredBase is the sell side', Math.abs(sellBase - plan.capitalRequiredBase) < 1e-12, `${n(sellBase)} vs ${n(plan.capitalRequiredBase)}`)
check('buys sit under the mark and sells at or over it', plan.levels.every((lv) => (lv.side === 'buy') === lv.price < m), sides)
check('band round trips: lower * (1 + spacingPct/100)^(n-1) is upper', Math.abs(plan.lower * (1 + plan.spacingPct / 100) ** (LEVELS - 1) / plan.upper - 1) < 1e-12, `${n(plan.lower * (1 + plan.spacingPct / 100) ** (LEVELS - 1))} vs ${n(plan.upper)}`)
check('expectedFillsPerCycle is two per interior crossing', plan.expectedFillsPerCycle === 2 * (LEVELS - 1), String(plan.expectedFillsPerCycle))
check('levelCount matches the ladder length', plan.levelCount === plan.levels.length && plan.levelCount === LEVELS, `${plan.levelCount} and ${plan.levels.length}`)
check('indices are 0..n-1 in order', plan.levels.every((lv, i) => lv.index === i), 'ordered')
check('a plan that was produced carries no warnings here', plan.warnings.length === 0, JSON.stringify(plan.warnings))
check('breakoutRule names both edges', plan.breakoutRule.includes(String(Number(plan.upper.toPrecision(6)))) && plan.breakoutRule.includes(String(Number(plan.lower.toPrecision(6)))), 'both present')

// Below the band the sells never sold, so the drawdown inventory is the bought base plus the sell
// side reserve. A rule that quoted only the bought half would understate the exposure.
const boughtBase = plan.levels.filter((l) => l.side === 'buy').reduce((s, l) => s + l.sizeBase, 0)
const totalBase = boughtBase + plan.capitalRequiredBase
check(
  'breakoutRule quotes the whole downside inventory',
  plan.breakoutRule.includes(String(Number(totalBase.toPrecision(6)))),
  `${n(totalBase)} = ${n(boughtBase)} bought plus ${n(plan.capitalRequiredBase)} reserved`,
)
check(
  'breakoutRule still quotes the average buy',
  plan.breakoutRule.includes(String(Number((plan.capitalRequiredQuote / boughtBase).toPrecision(6)))),
  `${n(plan.capitalRequiredQuote / boughtBase)} average buy`,
)

console.log('\n--- 3. the gas term and the break even, recomputed ---')
const gasPrice = await c.getGasPrice()
const bnbPerSwap = Number(gasPrice * SWAP_GAS_UNITS) / 1e18
const quotePerSwap = bnbPerSwap * plan.markPrice
const feeRate = raw.fee / 1e6
const spacing = plan.spacingPct / 100
const minPerLevel = (2 * quotePerSwap) / (spacing - 2 * feeRate)
console.log(
  `gasPrice ${gasPrice} wei (${Number(gasPrice) / 1e9} gwei)  ${SWAP_GAS_UNITS} units\n` +
    `per swap ${n(bnbPerSwap)} BNB = ${n(quotePerSwap)} USDT   two swaps ${n(2 * quotePerSwap)} USDT\n` +
    `min per level ${n(minPerLevel)} USDT   given ${n(per)} USDT`,
)
check('gas price is the measured BSC floor', gasPrice >= 50_000_000n && gasPrice <= 3_000_000_000n, `${Number(gasPrice) / 1e9} gwei`)
check('the 11 level ladder clears the break even', per > minPerLevel, `${n(per)} over ${n(minPerLevel)}`)

const tooSmall = await planGrid({ pool: USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: LEVELS, capitalQuote: 5 })
const quoted = tooSmall.warnings.join(' ').match(/needs ([\d.]+) USDT/)
console.log(`refusal quotes min per level ${quoted?.[1] ?? 'nothing'}`)
check(
  'the refusal quotes the same break even this script computed',
  quoted !== null && Math.abs(Number(quoted[1]) / minPerLevel - 1) < 0.2,
  `${quoted?.[1]} vs ${n(minPerLevel, 6)}`,
)

console.log('\n--- 4. refusals ---')
async function refuse(label: string, input: Parameters<typeof planGrid>[0], expect: RegExp): Promise<void> {
  const out = await planGrid(input)
  console.log(`\n${label}: ${JSON.stringify(out.warnings)}`)
  check(`${label}: no ladder`, out.levels.length === 0 && out.levelCount === 0, `${out.levels.length} levels`)
  check(`${label}: fills per cycle null not zero`, out.expectedFillsPerCycle === null, String(out.expectedFillsPerCycle))
  check(`${label}: warning says why`, out.warnings.some((w) => expect.test(w)), expect.source)
  check(`${label}: the mark it refused against is real`, out.markPrice > 100 && out.atBlock !== null, `${n(out.markPrice)} at ${out.atBlock}`)
  check(`${label}: breakoutRule says there is nothing to act on`, /No ladder was planned/.test(out.breakoutRule), out.breakoutRule.slice(0, 40))
}
await refuse('one level', { pool: USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: 1, capitalQuote: CAP }, /at least two levels/)
await refuse('fractional levelCount', { pool: USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: 4.5, capitalQuote: CAP }, /at least two levels/)
await refuse('201 levels', { pool: USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: 201, capitalQuote: CAP }, /more gas than its steps capture/)
await refuse('zero width band', { pool: USDT_WBNB_100, lowerPct: 0, upperPct: 0, levelCount: 11, capitalQuote: CAP }, /nowhere to place levels/)
await refuse('lower 100% below the mark', { pool: USDT_WBNB_100, lowerPct: 100, upperPct: 10, levelCount: 11, capitalQuote: CAP }, /at or under zero/)
await refuse('NaN bound', { pool: USDT_WBNB_100, lowerPct: Number.NaN, upperPct: 10, levelCount: 11, capitalQuote: CAP }, /two finite bounds/)
await refuse('no capital', { pool: USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: 11, capitalQuote: 0 }, /needs capital to fund it/)
await refuse('capital too small', { pool: USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: LEVELS, capitalQuote: 5 }, /does not clear a round trip/)

console.log('\n--- 5. spacing under the fee, on the live 1% tier ---')
const tier = await readRaw(USDT_WBNB_10000)
const tight = await planGrid({ pool: USDT_WBNB_10000, lowerPct: 10, upperPct: 10, levelCount: 21, capitalQuote: CAP })
const tightStep = (1.1 / 0.9) ** (1 / 20) - 1
console.log(
  `pool fee ${tier.fee} pips, so a round trip pays ${n((2 * tier.fee) / 1e4, 4)}%\n` +
    `21 levels on +/-10% is a ${n(tightStep * 100, 6)}% step\nwarnings ${JSON.stringify(tight.warnings)}`,
)
check('the 1% tier pool is fee 10000', tier.fee === 10_000, String(tier.fee))
check('a 1.0% step under a 2.0% round trip fee is refused', tight.levels.length === 0 && tight.warnings.some((w) => /loses money/.test(w)), `${tight.levels.length} levels`)
check('the refusal quotes the real tier', tight.warnings.some((w) => w.includes(n((2 * tier.fee) / 1e4, 6))), `expected ${n((2 * tier.fee) / 1e4, 6)} percent`)

console.log('\n--- 6. a pool with no dollar side, so the quote stays token1 ---')
const cakeRaw = await readRaw(CAKE_WBNB_100)
const cake = await planGrid({ pool: CAKE_WBNB_100, lowerPct: 12, upperPct: 12, levelCount: 7, capitalQuote: 4 })
console.log(
  `${cakeRaw.symbol0}/${cakeRaw.symbol1} fee ${cakeRaw.fee}  exact price1Per0 ${n(cakeRaw.price1Per0)}\n` +
    `plan ${cake.pair} mark ${n(cake.markPrice)}  quote needed ${n(cake.capitalRequiredQuote)}  base needed ${n(cake.capitalRequiredBase)}\n` +
    `warnings ${JSON.stringify(cake.warnings)}`,
)
check('pair keeps the AMM order when neither side is a dollar', cake.pair === `${cakeRaw.symbol0}/${cakeRaw.symbol1}`, cake.pair)
check('mark is price1Per0 the way round the pool quotes it', Math.abs(cake.markPrice / cakeRaw.price1Per0 - 1) < 5e-3, `${n(cake.markPrice)} vs ${n(cakeRaw.price1Per0)}`)
check('CAKE mark is inside a plausible range', cake.markPrice > 0.0001 && cake.markPrice < 1, `${n(cake.markPrice)} WBNB per Cake`)
check('a 7 level CAKE ladder was produced', cake.levels.length === 7, `${cake.levels.length}`)
check('gas priced into WBNB needs no mark, since the quote is WBNB itself', cake.warnings.every((w) => !/gas per fill not priced/.test(w)), JSON.stringify(cake.warnings))

console.log('\n--- 7. an all sell band, where the quote requirement is honestly zero ---')
const allSell = await planGrid({ pool: USDT_WBNB_100, lowerPct: 0, upperPct: 20, levelCount: 9, capitalQuote: CAP })
console.log(
  `levels ${allSell.levels.map((l) => l.side).join('')}  quote ${n(allSell.capitalRequiredQuote)}  base ${n(allSell.capitalRequiredBase)}\n` +
    `warnings ${JSON.stringify(allSell.warnings)}\nbreakoutRule ${allSell.breakoutRule}`,
)
check('every level is a sell when the band starts at the mark', allSell.levels.every((l) => l.side === 'sell'), 'all sells')
check('the note says base is needed rather than quote', allSell.warnings.some((w) => /rather than USDT/.test(w)), JSON.stringify(allSell.warnings))
check('breakoutRule admits there is no buy side', /no buy side under the mark/.test(allSell.breakoutRule), 'stated')

console.log('\n--- 8. a pool with no WBNB side, where gas cannot be priced into the quote ---')
const stableRaw = await readRaw(USDT_USDC_100)
const stable = await planGrid({ pool: USDT_USDC_100, lowerPct: 0.1, upperPct: 0.1, levelCount: 5, capitalQuote: 20_000 })
console.log(
  `${stableRaw.symbol0}/${stableRaw.symbol1} fee ${stableRaw.fee}  exact price1Per0 ${n(stableRaw.price1Per0)}\n` +
    `plan ${stable.pair} mark ${n(stable.markPrice)} spacing ${n(stable.spacingPct)}% levels ${stable.levelCount}\n` +
    `warnings ${JSON.stringify(stable.warnings)}`,
)
check('a stable pair still gets a ladder', stable.levels.length === 5, `${stable.levels.length}`)
check('the mark on a dollar pair sits near parity', stable.markPrice > 0.9 && stable.markPrice < 1.1, n(stable.markPrice))
check('gas is left unpriced with the reason rather than guessed', stable.warnings.some((w) => /neither side of this pool is WBNB/.test(w)), JSON.stringify(stable.warnings))
check('an unpriced gas term does not fabricate a capital refusal', stable.expectedFillsPerCycle === 8, String(stable.expectedFillsPerCycle))

console.log('\n--- 9. numeric edges ---')
const wide = await planGrid({ pool: USDT_WBNB_100, lowerPct: 99.99, upperPct: 10, levelCount: 2, capitalQuote: CAP })
console.log(`two level band ${n(wide.lower)} to ${n(wide.upper)} spacing ${n(wide.spacingPct)}% warnings ${JSON.stringify(wide.warnings)}`)
check('a two level ladder is allowed', wide.levels.length === 2, `${wide.levels.length}`)
check('every number on a wide band stays finite', wide.levels.every((l) => Number.isFinite(l.price) && Number.isFinite(l.sizeBase)), 'finite')
const inf = await planGrid({ pool: USDT_WBNB_100, lowerPct: 10, upperPct: Number.POSITIVE_INFINITY, levelCount: 5, capitalQuote: CAP })
console.log(`infinite upper: lower ${n(inf.lower)} upper ${n(inf.upper)} warnings ${JSON.stringify(inf.warnings)}`)
check('an infinite bound is refused', inf.levels.length === 0 && inf.warnings.some((w) => /two finite bounds/.test(w)), JSON.stringify(inf.warnings))
check('the refused plan reports finite edges', Number.isFinite(inf.lower) && Number.isFinite(inf.upper), `${inf.lower} to ${inf.upper}`)
const neg = await planGrid({ pool: USDT_WBNB_100, lowerPct: -10, upperPct: -10, levelCount: 11, capitalQuote: CAP })
console.log(`both bounds negative: ${n(neg.lower)} to ${n(neg.upper)} warnings ${JSON.stringify(neg.warnings)}`)
check('a negative upper is read as a distance and noted', neg.levels.length === 11 && neg.warnings.some((w) => /percent above the mark/.test(w)), JSON.stringify(neg.warnings))
check('200 levels is the last accepted count', (await planGrid({ pool: USDT_WBNB_100, lowerPct: 40, upperPct: 40, levelCount: 200, capitalQuote: 2_000_000 })).levels.length === 200, 'accepted')

console.log('\n--- 10. exact break even against the first order one the file uses ---')
for (const f of [100, 500, 2500, 10_000]) {
  const rate = f / 1e6
  const firstOrder = 2 * rate
  const exact = 1 / (1 - rate) ** 2 - 1
  console.log(`  fee ${String(f).padStart(5)} pips: 2f ${(firstOrder * 100).toFixed(6)}%  exact ${(exact * 100).toFixed(6)}%  gap ${((exact - firstOrder) * 1e4).toFixed(4)} bps`)
}

console.log(`\n=== ${fails === 0 ? 'VERIFY PASS' : `VERIFY FAIL, ${fails} check(s)`} ===`)
process.exit(fails === 0 ? 0 : 1)
