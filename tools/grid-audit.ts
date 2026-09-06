/**
 * Independent audit of lib/grid.ts. Nothing here imports lib/pancake.ts or lib/rpc.ts, so a
 * shared bug cannot hide inside both the module and its check. The pool is read with a fresh
 * viem client at one pinned block, the price is recomputed in exact BigInt arithmetic, and the
 * whole ladder is rebuilt from the brief rather than from the module's own intermediates.
 *
 * Run: node --experimental-strip-types --no-warnings tools/grid-audit.ts
 */
import { createPublicClient, http, parseAbi, getAddress } from 'viem'
import { bsc } from 'viem/chains'
import { planGrid } from '../lib/grid.ts'

const RPCS = [
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
]

const POOL_USDT_WBNB_100 = '0x172fcD41E0913e95784454622d1c3724f546f849'
const POOL_USDT_USDC_100 = '0x92b7807bF19b7DDdf89b706143896d05228f3121'
const POOL_CAKE_WBNB_2500 = '0x133B3D95bAD5405d14d53473671200e9342896BF'

/** The literal grid.ts carries for pricing gas into the quote. Checked against token1 below. */
const WBNB_IN_GRID_TS = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'

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

let pass = 0
let fail = 0
const failures: string[] = []

function check(label: string, ok: boolean, detail = ''): void {
  if (ok) {
    pass++
    console.log(`  ok   ${label}${detail ? `   ${detail}` : ''}`)
  } else {
    fail++
    failures.push(`${label}${detail ? `   ${detail}` : ''}`)
    console.log(`  FAIL ${label}${detail ? `   ${detail}` : ''}`)
  }
}

function n(v: number, digits = 10): string {
  if (!Number.isFinite(v)) return String(v)
  return Number(v.toPrecision(digits)).toString()
}

async function pick(): Promise<{ url: string; client: ReturnType<typeof createPublicClient> }> {
  const errs: string[] = []
  for (const url of RPCS) {
    try {
      const client = createPublicClient({ chain: bsc, transport: http(url, { timeout: 20_000, retryCount: 0 }) })
      const id = await client.getChainId()
      if (id !== 56) throw new Error(`chain id ${id}`)
      return { url, client }
    } catch (e) {
      errs.push(`${url}: ${(e instanceof Error ? e.message : String(e)).slice(0, 100)}`)
    }
  }
  throw new Error(`no endpoint answered:\n${errs.join('\n')}`)
}

interface Raw {
  pool: string
  token0: string
  token1: string
  symbol0: string
  symbol1: string
  decimals0: number
  decimals1: number
  fee: number
  tickSpacing: number
  tick: number
  sqrtPriceX96: bigint
  atBlock: bigint
  /** token1 per token0 in human units, from exact integer arithmetic. */
  price1Per0: number
}

/** Exact ratio (sqrt/2^96)^2 scaled by 1e30 before it ever touches a double. */
function exactRawPrice(sqrtPriceX96: bigint): number {
  const scaled = (sqrtPriceX96 * sqrtPriceX96 * 10n ** 30n) / 2n ** 192n
  return Number(scaled) / 1e30
}

async function readRaw(client: Awaited<ReturnType<typeof pick>>['client'], pool: string): Promise<Raw> {
  const address = getAddress(pool)
  const atBlock = await client.getBlockNumber({ cacheTime: 0 })
  const [token0, token1, fee, tickSpacing, slot0] = await Promise.all([
    client.readContract({ address, abi: POOL_ABI, functionName: 'token0', blockNumber: atBlock }),
    client.readContract({ address, abi: POOL_ABI, functionName: 'token1', blockNumber: atBlock }),
    client.readContract({ address, abi: POOL_ABI, functionName: 'fee', blockNumber: atBlock }),
    client.readContract({ address, abi: POOL_ABI, functionName: 'tickSpacing', blockNumber: atBlock }),
    client.readContract({ address, abi: POOL_ABI, functionName: 'slot0', blockNumber: atBlock }),
  ])
  const [symbol0, decimals0, symbol1, decimals1] = await Promise.all([
    client.readContract({ address: token0, abi: ERC20_ABI, functionName: 'symbol', blockNumber: atBlock }),
    client.readContract({ address: token0, abi: ERC20_ABI, functionName: 'decimals', blockNumber: atBlock }),
    client.readContract({ address: token1, abi: ERC20_ABI, functionName: 'symbol', blockNumber: atBlock }),
    client.readContract({ address: token1, abi: ERC20_ABI, functionName: 'decimals', blockNumber: atBlock }),
  ])
  const sqrtPriceX96 = slot0[0]
  const tick = slot0[1]
  return {
    pool: address,
    token0,
    token1,
    symbol0,
    symbol1,
    decimals0,
    decimals1,
    fee,
    tickSpacing,
    tick,
    sqrtPriceX96,
    atBlock,
    price1Per0: exactRawPrice(sqrtPriceX96) * 10 ** (decimals0 - decimals1),
  }
}

const { url, client } = await pick()
console.log(`endpoint ${url}`)

// ---------------------------------------------------------------- part A, the chain reads
console.log('\nA. live pool reads, independent of lib/pancake.ts')
const main = await readRaw(client, POOL_USDT_WBNB_100)
console.log(
  `  ${main.symbol0}/${main.symbol1} fee ${main.fee} tickSpacing ${main.tickSpacing} tick ${main.tick} block ${main.atBlock}`,
)
console.log(`  sqrtPriceX96 ${main.sqrtPriceX96}   price1Per0 ${n(main.price1Per0, 17)}`)

check('pool fee is the 0.01% tier in pips', main.fee === 100, String(main.fee))
check('tickSpacing is 1 on that tier', main.tickSpacing === 1, String(main.tickSpacing))
check(
  'the WBNB literal in grid.ts is this pool token1',
  main.token1.toLowerCase() === WBNB_IN_GRID_TS,
  `${main.token1} vs ${WBNB_IN_GRID_TS}`,
)
check('both sides are 18 decimals', main.decimals0 === 18 && main.decimals1 === 18, `${main.decimals0}/${main.decimals1}`)

const fromTick = 1.0001 ** main.tick
const rawOnly = exactRawPrice(main.sqrtPriceX96)
const tickGapBps = Math.abs(rawOnly / fromTick - 1) * 1e4
check('price off sqrtPriceX96 round trips through 1.0001^tick inside one tick', tickGapBps < 1, `${n(tickGapBps, 3)} bps`)
const tickFromPrice = Math.floor(Math.log(rawOnly) / Math.log(1.0001))
check('floor(log_1.0001(price)) reproduces slot0 tick', tickFromPrice === main.tick, `${tickFromPrice} vs ${main.tick}`)

const bnbPerUsdt = main.price1Per0
const usdtPerBnb = 1 / bnbPerUsdt
console.log(`  implied mark ${n(usdtPerBnb, 8)} USDT per WBNB`)
check('BNB mark sits in a plausible range', usdtPerBnb > 100 && usdtPerBnb < 5000, `${n(usdtPerBnb, 8)}`)

let external: number | null = null
for (const src of [
  'https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT',
  'https://api.binance.us/api/v3/ticker/price?symbol=BNBUSDT',
]) {
  try {
    const r = await fetch(src, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) continue
    const j = (await r.json()) as { price?: string }
    const p = Number(j.price)
    if (Number.isFinite(p) && p > 0) {
      external = p
      console.log(`  external ${src.split('?')[0]} says ${p}`)
      break
    }
  } catch {
    /* offline or blocked, the plausibility band above still stands */
  }
}
if (external === null) {
  console.log('  external price source unreachable, so the cross check is skipped rather than faked')
} else {
  const gap = Math.abs(usdtPerBnb / external - 1) * 100
  check('pool mark agrees with an off chain BNBUSDT ticker inside 3%', gap < 3, `${n(gap, 4)}% apart`)
}

const gasPrice = await client.getGasPrice()
const swapBnb = (Number(gasPrice) * 738_000) / 1e18
console.log(`  gasPrice ${gasPrice} wei (${n(Number(gasPrice) / 1e9, 4)} gwei), 738k gas costs ${n(swapBnb, 6)} BNB`)

// ---------------------------------------------------------------- part B, rebuild the ladder
console.log('\nB. planGrid on the live pool, ladder rebuilt from the brief')
const CAP = 20_000
const LEVELS = 11
const plan = await planGrid({ pool: POOL_USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: LEVELS, capitalQuote: CAP })
console.log(
  `  ${plan.pair} mark ${n(plan.markPrice, 8)} band ${n(plan.lower, 8)}..${n(plan.upper, 8)} spacing ${n(plan.spacingPct, 8)}% block ${plan.atBlock}`,
)
console.log(`  warnings ${plan.warnings.length === 0 ? 'none' : JSON.stringify(plan.warnings)}`)

check('pair is quoted base over quote', plan.pair === `${main.symbol1}/${main.symbol0}`, plan.pair)
check('levelCount matches the request', plan.levelCount === LEVELS && plan.levels.length === LEVELS, String(plan.levelCount))
check('mark is the inverted pool price', Math.abs(plan.markPrice * bnbPerUsdt - 1) < 5e-3, `${n(plan.markPrice, 10)} vs ${n(usdtPerBnb, 10)}`)

const expLower = plan.markPrice * 0.9
const expUpper = plan.markPrice * 1.1
check('lower is the mark less 10%', Math.abs(plan.lower / expLower - 1) < 1e-12, `${n(plan.lower)} vs ${n(expLower)}`)
check('upper is the mark plus 10%', Math.abs(plan.upper / expUpper - 1) < 1e-12, `${n(plan.upper)} vs ${n(expUpper)}`)

const expStep = (plan.upper / plan.lower) ** (1 / (LEVELS - 1))
check('spacingPct is the geometric step, not the arithmetic one', Math.abs(plan.spacingPct - (expStep - 1) * 100) < 1e-12, `${n(plan.spacingPct)} vs ${n((expStep - 1) * 100)}`)
const arithFirst = ((plan.upper - plan.lower) / (LEVELS - 1) / plan.lower) * 100
check('the step is not the arithmetic first step', Math.abs(plan.spacingPct - arithFirst) > 1e-6, `geometric ${n(plan.spacingPct, 6)}% vs arithmetic ${n(arithFirst, 6)}%`)

let ladderOk = true
let sizeOk = true
let notionalOk = true
let sideOk = true
let ratioOk = true
const perLevel = CAP / LEVELS
for (let i = 0; i < LEVELS; i++) {
  const lvl = plan.levels[i]
  if (!lvl) {
    ladderOk = false
    break
  }
  const wantPrice = plan.lower * expStep ** i
  if (Math.abs(lvl.price / wantPrice - 1) > 1e-12) ladderOk = false
  if (lvl.index !== i) ladderOk = false
  if (Math.abs(lvl.notionalQuote - perLevel) > 1e-9) notionalOk = false
  if (Math.abs(lvl.sizeBase - lvl.notionalQuote / lvl.price) > 1e-15) sizeOk = false
  const wantSide = lvl.price < plan.markPrice ? 'buy' : 'sell'
  if (lvl.side !== wantSide) sideOk = false
  if (i > 0) {
    const prev = plan.levels[i - 1]
    if (!prev || Math.abs(lvl.price / prev.price - expStep) > 1e-12) ratioOk = false
  }
}
check('every level price is lower * step^i', ladderOk)
check('every adjacent pair sits one identical ratio apart', ratioOk)
check('notionalQuote is capitalQuote / levelCount on every level', notionalOk, `${n(perLevel)}`)
check('sizeBase is notionalQuote / price on every level', sizeOk)
check('side is buy under the mark and sell at or above it', sideOk)
const first = plan.levels[0]
const last = plan.levels[LEVELS - 1]
check('level 0 sits on the lower bound', !!first && Math.abs(first.price / plan.lower - 1) < 1e-15)
check('the top level sits on the upper bound', !!last && Math.abs(last.price / plan.upper - 1) < 1e-12, last ? `${n(last.price)} vs ${n(plan.upper)}` : 'missing')

let buySum = 0
let sellBase = 0
let buyBase = 0
let buyCount = 0
for (const lvl of plan.levels) {
  if (lvl.side === 'buy') {
    buySum += lvl.notionalQuote
    buyBase += lvl.sizeBase
    buyCount++
  } else {
    sellBase += lvl.sizeBase
  }
}
console.log(`  ${buyCount} buys, ${LEVELS - buyCount} sells, buy notional ${n(buySum, 12)}, sell inventory ${n(sellBase, 12)} ${main.symbol1}`)
check('capitalRequiredQuote is exactly the buy side notional', Math.abs(buySum - plan.capitalRequiredQuote) < 1e-9, `${n(buySum, 12)} vs ${n(plan.capitalRequiredQuote, 12)}`)
check('capitalRequiredQuote is buyCount * capitalQuote / levelCount', Math.abs(plan.capitalRequiredQuote - buyCount * perLevel) < 1e-9, `${n(buyCount * perLevel, 12)}`)
check('capitalRequiredBase is exactly the sell side inventory', Math.abs(sellBase - plan.capitalRequiredBase) < 1e-15, `${n(sellBase, 12)} vs ${n(plan.capitalRequiredBase, 12)}`)
check('capitalRequiredQuote never exceeds the capital supplied', plan.capitalRequiredQuote <= CAP + 1e-9, `${n(plan.capitalRequiredQuote)} of ${CAP}`)

check('expectedFillsPerCycle counts every interior crossing twice', plan.expectedFillsPerCycle === 2 * (LEVELS - 1), String(plan.expectedFillsPerCycle))
check('readAt is a recent wall clock', Math.abs(Date.now() - plan.readAt) < 120_000, new Date(plan.readAt).toISOString())
check('atBlock is a real block number', plan.atBlock !== null && plan.atBlock > 100_000_000, String(plan.atBlock))

const deep = JSON.stringify(plan, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NON_FINITE' : v))
check('no field anywhere in the plan is NaN or Infinity', !deep.includes('NON_FINITE'))

// The break even the module refuses on, rebuilt here rather than read back from it.
const spacing = plan.spacingPct / 100
const feeRate = main.fee / 1e6
const gasQuote = swapBnb * plan.markPrice
const minPerLevel = (2 * gasQuote) / (spacing - 2 * feeRate)
console.log(`  round trip: spacing ${n(spacing * 100, 6)}% less fees ${n(2 * feeRate * 100, 6)}%, gas ${n(2 * gasQuote, 6)} ${main.symbol0} per cycle, min level ${n(minPerLevel, 6)} ${main.symbol0}`)
check('the funded level clears the break even it was accepted against', perLevel > minPerLevel, `${n(perLevel, 8)} vs ${n(minPerLevel, 8)}`)
const capture = perLevel * (spacing - 2 * feeRate) - 2 * gasQuote
check('one round trip nets a positive number at this size', capture > 0, `${n(capture, 6)} ${main.symbol0}`)

// Equal quote notional means the paired sell is smaller in base than the buy that fed it.
const buy0 = plan.levels[0]
const sell1 = plan.levels[1]
if (buy0 && sell1) {
  const ratio = buy0.sizeBase / sell1.sizeBase
  console.log(`  level 0 buys ${n(buy0.sizeBase, 8)} ${main.symbol1}, level 1 sells ${n(sell1.sizeBase, 8)}, ratio ${n(ratio, 8)}`)
  check('adjacent base sizes differ by exactly one step, so the pair is not size matched', Math.abs(ratio - expStep) < 1e-12, `${n(ratio, 12)} vs step ${n(expStep, 12)}`)
}

// ---------------------------------------------------------------- part C, refusals
console.log('\nC. refusals carry reasons and no ladder')
async function refuse(label: string, input: Parameters<typeof planGrid>[0], expect: RegExp): Promise<void> {
  const out = await planGrid(input)
  const hit = out.warnings.find((w) => expect.test(w))
  check(`${label}: warns`, hit !== undefined, hit ?? JSON.stringify(out.warnings))
  check(`${label}: no ladder`, out.levels.length === 0 && out.levelCount === 0)
  check(`${label}: fills per cycle is null not zero`, out.expectedFillsPerCycle === null, String(out.expectedFillsPerCycle))
  check(`${label}: mark survives the refusal`, Number.isFinite(out.markPrice) && out.markPrice > 0, n(out.markPrice, 8))
  check(`${label}: breakoutRule says there is nothing to act on`, /no ladder/i.test(out.breakoutRule))
}

await refuse('levelCount 1', { pool: POOL_USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: 1, capitalQuote: 1000 }, /at least two levels/)
await refuse('levelCount 201', { pool: POOL_USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: 201, capitalQuote: 1e6 }, /pays more gas/)
await refuse('zero width band', { pool: POOL_USDT_WBNB_100, lowerPct: 0, upperPct: 0, levelCount: 5, capitalQuote: 1000 }, /not below the upper/)
await refuse('lowerPct 100', { pool: POOL_USDT_WBNB_100, lowerPct: 100, upperPct: 10, levelCount: 5, capitalQuote: 1000 }, /at or under zero/)
await refuse('capital 0', { pool: POOL_USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: 5, capitalQuote: 0 }, /needs capital/)
await refuse('capital far too small', { pool: POOL_USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: 11, capitalQuote: 0.02 }, /does not clear a round trip/)
await refuse('band tighter than the fee', { pool: POOL_USDT_WBNB_100, lowerPct: 0.005, upperPct: 0.005, levelCount: 5, capitalQuote: 1e6 }, /loses money/)
await refuse('NaN bound', { pool: POOL_USDT_WBNB_100, lowerPct: Number.NaN, upperPct: 10, levelCount: 5, capitalQuote: 1000 }, /two finite bounds/)
await refuse('fractional levelCount', { pool: POOL_USDT_WBNB_100, lowerPct: 10, upperPct: 10, levelCount: 4.5, capitalQuote: 1000 }, /at least two levels/)

// ---------------------------------------------------------------- part D, the other pools
console.log('\nD. orientation and the unpriceable gas term on other pools')
const stable = await readRaw(client, POOL_USDT_USDC_100)
const stablePlan = await planGrid({ pool: POOL_USDT_USDC_100, lowerPct: 1, upperPct: 1, levelCount: 5, capitalQuote: 500_000 })
console.log(`  ${stablePlan.pair} mark ${n(stablePlan.markPrice, 10)} warnings ${JSON.stringify(stablePlan.warnings)}`)
check('a two dollar pool keeps the AMM order', stablePlan.pair === `${stable.symbol0}/${stable.symbol1}`, stablePlan.pair)
check('a stable pair marks near parity', Math.abs(stablePlan.markPrice - 1) < 0.05, n(stablePlan.markPrice, 8))
check(
  'gas is left unpriced with a reason when neither side is WBNB',
  stablePlan.warnings.some((w) => /neither side of this pool is WBNB/.test(w)),
  JSON.stringify(stablePlan.warnings),
)

const cakeRaw = await readRaw(client, POOL_CAKE_WBNB_2500)
const cakePlan = await planGrid({ pool: POOL_CAKE_WBNB_2500, lowerPct: 15, upperPct: 15, levelCount: 7, capitalQuote: 100 })
console.log(
  `  ${cakePlan.pair} mark ${n(cakePlan.markPrice, 8)} quote capital ${n(cakePlan.capitalRequiredQuote, 8)} base inventory ${n(cakePlan.capitalRequiredBase, 8)} warnings ${JSON.stringify(cakePlan.warnings)}`,
)
check('a WBNB quoted pool keeps the AMM order', cakePlan.pair === `${cakeRaw.symbol0}/${cakeRaw.symbol1}`, cakePlan.pair)
check('its mark matches the exact pool ratio', Math.abs(cakePlan.markPrice / cakeRaw.price1Per0 - 1) < 5e-3, `${n(cakePlan.markPrice, 10)} vs ${n(cakeRaw.price1Per0, 10)}`)
check('a WBNB quote prices gas without a conversion warning', !cakePlan.warnings.some((w) => /gas per fill not priced/.test(w)), JSON.stringify(cakePlan.warnings))
const cakeUsd = cakePlan.markPrice * usdtPerBnb
console.log(`  implied CAKE ${n(cakeUsd, 6)} USDT, BTCB and CAKE marks are the only cross checks available off chain`)
check('the CAKE mark implies a plausible dollar price', cakeUsd > 0.05 && cakeUsd < 200, n(cakeUsd, 6))

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.log('failures:')
  for (const f of failures) console.log(`  ${f}`)
  process.exitCode = 1
}
