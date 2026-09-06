/**
 * Gate for lib/grid.ts. Plans a real grid on a live PancakeSwap pool, proves the capital
 * arithmetic adds up, then shows three inputs that get refused instead of served.
 *
 * Run: node --experimental-strip-types --no-warnings tools/grid-gate.ts
 *
 * lib/pancake.ts is being written by another agent in the same pass. When it is not on disk
 * yet, this gate serves `readPool` through a resolution hook whose implementation does a real
 * pinned block read of the same pool over lib/rpc.ts, so planGrid still runs its own code path
 * against a live chain price. The header of the run says which of the two happened.
 */
import { existsSync } from 'node:fs'
import { registerHooks, type LoadHookSync, type ResolveHookSync } from 'node:module'

const PANCAKE_URL = new URL('../lib/pancake.ts', import.meta.url).href
const PANCAKE_PATH = new URL('../lib/pancake.ts', import.meta.url).pathname
/** GRID_GATE_FORCE_STUB=1 exercises the fallback while lib/pancake.ts is sitting right there. */
const HAVE_PANCAKE = existsSync(PANCAKE_PATH) && process.env['GRID_GATE_FORCE_STUB'] !== '1'

/** A real pinned block pool read, kept to the PoolState shape lib/pancake.ts exports. */
const STUB = `
import { parseAbi } from 'viem'
import { withRpc } from './rpc.ts'

const POOL_ABI = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)',
  'function liquidity() view returns (uint128)',
  'function fee() view returns (uint24)',
  'function tickSpacing() view returns (int24)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
])
const ERC20_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
])

export async function readPool(pool) {
  return withRpc(async (c) => {
    const blockNumber = await c.getBlockNumber()
    const p = { address: pool, abi: POOL_ABI }
    const first = await c.multicall({
      contracts: [
        { ...p, functionName: 'slot0' },
        { ...p, functionName: 'liquidity' },
        { ...p, functionName: 'fee' },
        { ...p, functionName: 'tickSpacing' },
        { ...p, functionName: 'token0' },
        { ...p, functionName: 'token1' },
      ],
      allowFailure: false,
      blockNumber,
    })
    if (first.length !== 6) throw new Error('multicall dropped entries: asked 6 got ' + first.length)
    const [slot0, liquidity, fee, tickSpacing, token0, token1] = first
    const second = await c.multicall({
      contracts: [
        { address: token0, abi: ERC20_ABI, functionName: 'symbol' },
        { address: token0, abi: ERC20_ABI, functionName: 'decimals' },
        { address: token1, abi: ERC20_ABI, functionName: 'symbol' },
        { address: token1, abi: ERC20_ABI, functionName: 'decimals' },
      ],
      allowFailure: false,
      blockNumber,
    })
    if (second.length !== 4) throw new Error('multicall dropped entries: asked 4 got ' + second.length)
    const [symbol0, decimals0, symbol1, decimals1] = second
    const ratio = Number(slot0[0]) / 2 ** 96
    const price1Per0 = ratio * ratio * 10 ** (Number(decimals0) - Number(decimals1))
    return {
      pool,
      token0,
      token1,
      symbol0,
      symbol1,
      decimals0: Number(decimals0),
      decimals1: Number(decimals1),
      fee: Number(fee),
      tickSpacing: Number(tickSpacing),
      tick: Number(slot0[1]),
      sqrtPriceX96: slot0[0].toString(),
      liquidity: liquidity.toString(),
      price1Per0,
      readAt: Date.now(),
      atBlock: Number(blockNumber),
    }
  })
}
`

if (!HAVE_PANCAKE) {
  const resolve: ResolveHookSync = (specifier, context, next) => {
    if (specifier === './pancake.ts' || specifier.endsWith('/lib/pancake.ts')) {
      return { url: PANCAKE_URL, shortCircuit: true, format: 'module' }
    }
    return next(specifier, context)
  }
  const load: LoadHookSync = (url, context, next) => {
    if (url === PANCAKE_URL) return { format: 'module', source: STUB, shortCircuit: true }
    return next(url, context)
  }
  registerHooks({ resolve, load })
}

const { planGrid } = await import('../lib/grid.ts')
type Plan = Awaited<ReturnType<typeof planGrid>>

/** WBNB/USDT 0.01%, the deepest v3 pool on the pair. token0 is USDT, so the mark inverts. */
const POOL_WBNB_USDT_100 = '0x172fcD41E0913e95784454622d1c3724f546f849'
/** Same pair on the 1% tier, where a tight ladder cannot clear the fee. */
const POOL_WBNB_USDT_10000 = '0x6805E0E5333c5c3acCF2930Be4734E2b98f4Ce06'
/** CAKE/WBNB 0.01%. Neither side is a dollar stablecoin, so the quote stays token1. */
const POOL_CAKE_WBNB_100 = '0x1E213600FA9317FEAC4Ef4087acDF5D0e25D7187'

let failures = 0
function check(label: string, ok: boolean, detail: string): void {
  if (!ok) failures += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`)
}

function n(v: number, d = 8): string {
  return Number(v.toPrecision(d)).toString()
}

function head(plan: Plan): void {
  console.log(`pair ${plan.pair}   mark ${n(plan.markPrice)}   block ${plan.atBlock}`)
  console.log(
    `band ${n(plan.lower)} to ${n(plan.upper)}   levels ${plan.levelCount}` +
      `   spacing ${n(plan.spacingPct, 6)}%   fills per cycle ${plan.expectedFillsPerCycle ?? 'unknown'}`,
  )
}

console.log('=== lib/grid.ts gate ===')
console.log(
  `readPool source: ${
    HAVE_PANCAKE
      ? 'lib/pancake.ts on disk'
      : `live pinned block read served through a resolution hook, because lib/pancake.ts ${existsSync(PANCAKE_PATH) ? 'was skipped by GRID_GATE_FORCE_STUB' : 'is not written yet'}`
  }`,
)
console.log(`node ${process.version}   ${new Date().toISOString()}`)

console.log('\n--- 1. a real grid, WBNB/USDT fee 100, +/-10%, 11 levels, 5000 USDT ---')
const CAPITAL = 5000
const LEVELS = 11
const plan = await planGrid({
  pool: POOL_WBNB_USDT_100,
  lowerPct: 10,
  upperPct: 10,
  levelCount: LEVELS,
  capitalQuote: CAPITAL,
})
head(plan)
console.log('idx side  price          sizeBase        notionalQuote   sizeBase*price')
for (const level of plan.levels) {
  console.log(
    `${String(level.index).padStart(3)} ${level.side.padEnd(5)}` +
      `${n(level.price).padEnd(15)}${n(level.sizeBase).padEnd(16)}` +
      `${n(level.notionalQuote).padEnd(16)}${n(level.sizeBase * level.price)}`,
  )
}
console.log(`capitalRequiredQuote ${n(plan.capitalRequiredQuote)} USDT`)
console.log(`capitalRequiredBase  ${n(plan.capitalRequiredBase)} WBNB`)
console.log(`breakoutRule: ${plan.breakoutRule}`)
console.log(`warnings: ${plan.warnings.length === 0 ? 'none' : JSON.stringify(plan.warnings)}`)

console.log('\n--- 2. the capital arithmetic ---')
let buyQuote = 0
let sellBase = 0
let allQuote = 0
let worstNotionalErr = 0
let worstStepErr = 0
let previous: number | null = null
const stepRatio = 1 + plan.spacingPct / 100
for (const level of plan.levels) {
  allQuote += level.notionalQuote
  if (level.side === 'buy') buyQuote += level.notionalQuote
  else sellBase += level.sizeBase
  worstNotionalErr = Math.max(
    worstNotionalErr,
    Math.abs(level.sizeBase * level.price - level.notionalQuote) / level.notionalQuote,
  )
  if (previous !== null) {
    worstStepErr = Math.max(worstStepErr, Math.abs(level.price / previous - stepRatio) / stepRatio)
  }
  previous = level.price
}
check('levels returned', plan.levels.length === LEVELS, `${plan.levels.length} of ${LEVELS}`)
check(
  'sum of every notional equals the capital given',
  Math.abs(allQuote - CAPITAL) / CAPITAL < 1e-12,
  `${n(allQuote, 12)} vs ${CAPITAL}`,
)
check(
  'buy side notionals equal capitalRequiredQuote',
  Math.abs(buyQuote - plan.capitalRequiredQuote) < 1e-9,
  `${n(buyQuote, 12)} vs ${n(plan.capitalRequiredQuote, 12)}`,
)
check(
  'sell side sizes equal capitalRequiredBase',
  Math.abs(sellBase - plan.capitalRequiredBase) < 1e-12,
  `${n(sellBase, 12)} vs ${n(plan.capitalRequiredBase, 12)}`,
)
check(
  'sizeBase times price equals notionalQuote on every level',
  worstNotionalErr < 1e-12,
  `worst relative error ${worstNotionalErr.toExponential(2)}`,
)
check(
  'every step is the same ratio, so the spacing is geometric',
  worstStepErr < 1e-12,
  `worst relative error ${worstStepErr.toExponential(2)} against ${n(stepRatio, 10)}`,
)

console.log('\n--- 3. the mark is a real read, checked against the tick ---')
const { readPool } = await import('../lib/pancake.ts')
const state = await readPool(POOL_WBNB_USDT_100)
const fromTick = Math.pow(1.0001, state.tick)
const bps = (state.price1Per0 / fromTick - 1) * 1e4
console.log(
  `token0 ${state.symbol0} ${state.token0}\ntoken1 ${state.symbol1} ${state.token1}\n` +
    `fee ${state.fee}  tickSpacing ${state.tickSpacing}  tick ${state.tick}\n` +
    `sqrtPriceX96 ${state.sqrtPriceX96}\nliquidity ${state.liquidity}\n` +
    `price1Per0 ${n(state.price1Per0)} ${state.symbol1} per ${state.symbol0}\n` +
    `1.0001^tick ${n(fromTick)}`,
)
check(
  'price off sqrtPriceX96 agrees with 1.0001^tick inside one tick',
  Math.abs(bps) < 1,
  `${bps.toFixed(4)} bps apart`,
)
check(
  'the plan quotes the pair the way a buyer says it',
  plan.pair === `${state.symbol1}/${state.symbol0}`,
  `${plan.pair} from a pool whose token0 is ${state.symbol0}`,
)
check(
  'the mark is the inverse of price1Per0, because token0 is the stablecoin',
  Math.abs(plan.markPrice * state.price1Per0 - 1) < 2e-3,
  `${n(plan.markPrice)} times ${n(state.price1Per0)} is ${n(plan.markPrice * state.price1Per0)}`,
)
check(
  'the mark is inside a plausible BNB range',
  plan.markPrice > 100 && plan.markPrice < 5000,
  `${n(plan.markPrice)} USDT per WBNB`,
)

console.log('\n--- 4. refused inputs come back as warnings, not as a ladder ---')
async function refusal(label: string, input: Parameters<typeof planGrid>[0]): Promise<void> {
  const out = await planGrid(input)
  console.log(`\n${label}`)
  console.log(`  input ${JSON.stringify({ ...input, pool: input.pool.slice(0, 10) })}`)
  head(out)
  for (const w of out.warnings) console.log(`  warning: ${w}`)
  console.log(`  breakoutRule: ${out.breakoutRule}`)
  check(
    `${label}: no levels`,
    out.levels.length === 0 && out.levelCount === 0,
    `${out.levels.length} levels`,
  )
  check(`${label}: at least one warning`, out.warnings.length > 0, `${out.warnings.length} present`)
  check(
    `${label}: fills per cycle is null rather than zero`,
    out.expectedFillsPerCycle === null,
    String(out.expectedFillsPerCycle),
  )
  check(
    `${label}: the mark it was refused against is still real`,
    out.markPrice > 0 && out.atBlock !== null,
    `${n(out.markPrice)} at block ${out.atBlock}`,
  )
}

await refusal('one level', {
  pool: POOL_WBNB_USDT_100,
  lowerPct: 10,
  upperPct: 10,
  levelCount: 1,
  capitalQuote: CAPITAL,
})
await refusal('capital too small to fund 11 levels', {
  pool: POOL_WBNB_USDT_100,
  lowerPct: 10,
  upperPct: 10,
  levelCount: LEVELS,
  capitalQuote: 5,
})
await refusal('spacing under the 1% tier fee, 21 levels on the same band', {
  pool: POOL_WBNB_USDT_10000,
  lowerPct: 10,
  upperPct: 10,
  levelCount: 21,
  capitalQuote: CAPITAL,
})

console.log('\n--- 5. a second pool where neither side is a dollar, so the quote stays token1 ---')
const cake = await planGrid({
  pool: POOL_CAKE_WBNB_100,
  lowerPct: 12,
  upperPct: 12,
  levelCount: 7,
  capitalQuote: 4,
})
head(cake)
console.log(
  `capitalRequiredQuote ${n(cake.capitalRequiredQuote)}   capitalRequiredBase ${n(cake.capitalRequiredBase)}`,
)
console.log(`warnings: ${cake.warnings.length === 0 ? 'none' : JSON.stringify(cake.warnings)}`)
check('CAKE grid quotes in WBNB', cake.pair === 'Cake/WBNB', cake.pair)
check('CAKE grid has a ladder', cake.levels.length === 7, `${cake.levels.length} levels`)
check(
  'CAKE ladder capital splits into a buy side plus a sell side',
  cake.capitalRequiredQuote > 0 && cake.capitalRequiredBase > 0,
  `${n(cake.capitalRequiredQuote)} WBNB plus ${n(cake.capitalRequiredBase)} Cake`,
)

console.log(`\n=== ${failures === 0 ? 'GATE PASS' : `GATE FAIL, ${failures} check(s) failed`} ===`)
process.exit(failures === 0 ? 0 : 1)
