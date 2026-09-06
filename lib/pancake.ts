/**
 * PancakeSwap v3 pool state plus LP range drift on BSC. This is the read side of the rebalancing
 * shelf: what a pool is doing at one block plus whether a position's range still covers it.
 *
 * Two measured facts shape the file. Every field in a report comes from one pinned block, because
 * reading the price from one call and the range from another describes a state that never existed:
 * three blocks of skew moved a position amount by 0.63 bps and the BNB/USDT mid moved 27 bps over
 * 190 s during the measurement pass. Nothing here reads history, because no free BSC endpoint
 * serves it past about 60 blocks (publicnode answers "Archive requests require a personal token").
 *
 * Addresses and formulas are verified in docs/research/R08-pancakeswap.md. The price conversion is
 * checked against a separate first-party implementation: on pool 0x172fcD41 at sqrtPriceX96
 * 2864457715199330936727200016 this formula and PancakeSwap's own Explorer agree on
 * 0.0013071507119136283 token1 per token0, the same double down to the last bit.
 *
 * Token addresses are deliberately absent. Every one is read off the pool at run time, including
 * decimals, which Binance's own docs call the source of truth.
 */
import { getAddress, parseAbi } from 'viem'
import { withRpc } from './rpc.ts'

/**
 * PancakeV3Factory, 5151 bytes. A pool address is cheap to fake, so `readPool` asks the factory
 * which pool it owns for the pair and tier it just read, then refuses anything else.
 */
const V3_FACTORY = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865' as const

/**
 * The whole slot0 tuple is spelled out because a short returns clause silently drops the fields it
 * does not name. `feeProtocol` is uint32 here where Uniswap v3 has uint8. A uint8 clause decodes
 * this pool's 216272100 into it and raises nothing, so a Uniswap ABI pasted in mangles the call
 * with no sign of it.
 */
const POOL_ABI = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function tickSpacing() view returns (int24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)',
])

const FACTORY_ABI = parseAbi([
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)',
])

const ERC20_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
])

/**
 * The pools the rebalancing shelf covers, ordered by 7 day volume over TVL rather than by TVL,
 * because TVL on its own is a trap: two v3 pools holding $21.1M and $19.7M turned over $277 and
 * $634 in a day when this was measured. Each address was confirmed as
 * `factory.getPool(token0, token1, fee)` on 2026-09-06 and every figure below came off
 * PancakeSwap's Explorer the same day.
 *
 * Labels follow the chain's own token order, so USDT/WBNB rather than the WBNB/USDT a person would
 * say. `price1Per0` is quoted in that same order, which for this pair means WBNB per USDT.
 */
export const PCS_POOLS: { label: string; pool: string }[] = [
  /** $11.66M TVL, $786.8M 7d volume. Deepest and busiest v3 pool on the chain's main pair. */
  { label: 'USDT/WBNB 0.01%', pool: '0x172fcD41E0913e95784454622d1c3724f546f849' },
  /** $10.82M TVL, $110.5M 7d volume. MasterChefV3 pid 5 at allocPoint 910, so it pays CAKE too. */
  { label: 'USDT/WBNB 0.05%', pool: '0x36696169C63e42cd08ce11f5deeBbCeBae652050' },
  /** $26.40M TVL, $150.3M 7d volume. */
  { label: 'BTCB/WBNB 0.05%', pool: '0x6bbc40579ad1BBD243895cA0ACB086BB6300d636' },
  /** $29.03M TVL, $67.7M 7d volume. A stable pair, so a band a few ticks wide is normal here. */
  { label: 'USDT/USDC 0.01%', pool: '0x92b7807bF19b7DDdf89b706143896d05228f3121' },
  /** $5.37M TVL, $4.44M 7d volume. Thinnest turnover of the five, kept because CAKE is the pair. */
  { label: 'Cake/WBNB 0.25%', pool: '0x133B3D95bAD5405d14d53473671200e9342896BF' },
]

export interface PoolState {
  pool: string
  token0: string
  token1: string
  symbol0: string
  symbol1: string
  /** Read from the token, never assumed. Code carried from a 6 decimal USDC chain is wrong here. */
  decimals0: number
  decimals1: number
  /** Parts per million. PancakeSwap v3 on BSC enables 100, 500, 2500 and 10000. There is no 3000. */
  fee: number
  tickSpacing: number
  /** The pool's current tick, floor of log(price) in base 1.0001. */
  tick: number
  /** Decimal strings, because both overflow a double. */
  sqrtPriceX96: string
  /** In range liquidity only. The pool's own interface says it has no relation to the total. */
  liquidity: string
  /** Human units, token1 per token0. Invert it to read the pair the other way round. */
  price1Per0: number
  /** Wall clock of the read, ms since epoch. */
  readAt: number
  /** The one block every field above was read at. */
  atBlock: number
}

export interface DriftReport {
  pool: string
  /** `lowerTick <= tick < upperTick`, the branch the pool itself takes. */
  inRange: boolean
  lowerTick: number
  upperTick: number
  currentTick: number
  /**
   * Percent of spot sitting between spot and that bound. Positive while the bound is still on the
   * far side, negative once spot has crossed it. Null when the arithmetic gave no number, which
   * reads as unknown rather than as a position sitting on its bound.
   */
  distanceToLowerPct: number | null
  distanceToUpperPct: number | null
  recommendation: 'hold' | 'widen' | 'recentre'
  /** One sentence carrying the numbers that produced the recommendation. */
  why: string
  readAt: number
  atBlock: number
}

/** `TickMath.MIN_TICK` and `MAX_TICK`. `PancakeV3Pool.checkTicks` reverts outside them. */
const MIN_TICK = -887272
const MAX_TICK = 887272

/** Price per tick, from the v3 whitepaper section 6.1: `price = 1.0001^tick`. */
const TICK_BASE = 1.0001

/**
 * How far the price from `sqrtPriceX96` may sit from `1.0001^tick` before the read is treated as
 * broken. The tick is the floor of the log so the true gap is under one tick, which is 1 bp. The
 * bound is loose on purpose: it is there to catch a bad decode, not to police the market.
 */
const TICK_CHECK_TOLERANCE = 0.01

/**
 * A band narrower than this is treated as too thin to hold rather than as merely off centre. The
 * BNB/USDT mid moved 27 bps in 190 s during the measurement pass, so a sub 1% band is inside a few
 * minutes of ordinary drift on the majors here.
 */
const THIN_BAND_PCT = 1

/** Spot inside the outer 15% of a band on either side counts as drifted rather than centred. */
const EDGE_FRACTION = 0.15

/**
 * Pool state at one block. Two small batches instead of one wide call: Multicall3 drops entries
 * rather than erroring when a batch overflows. The string returns here are exactly the kind of call
 * that overflows it, so the count is checked both times.
 *
 * The reads retry across endpoints. The checks after them sit outside that retry, because an
 * address that fails one fails it on every endpoint and retrying only spends four round trips
 * saying so.
 */
export async function readPool(pool: string): Promise<PoolState> {
  const address = getAddress(pool)
  const read = await withRpc(async (c) => {
    // cacheTime 0 because viem otherwise reuses a block number for a polling interval, which is
    // five blocks on BSC. A report is only worth as much as the block it names.
    const atBlock = await c.getBlockNumber({ cacheTime: 0 })
    const state = await c.multicall({
      contracts: [
        { address, abi: POOL_ABI, functionName: 'token0' },
        { address, abi: POOL_ABI, functionName: 'token1' },
        { address, abi: POOL_ABI, functionName: 'fee' },
        { address, abi: POOL_ABI, functionName: 'tickSpacing' },
        { address, abi: POOL_ABI, functionName: 'liquidity' },
        { address, abi: POOL_ABI, functionName: 'slot0' },
      ],
      allowFailure: false,
      blockNumber: atBlock,
    })
    if (state.length !== 6) {
      throw new Error(`${address}: pool batch returned ${state.length} of 6 entries at block ${atBlock}`)
    }
    const [token0, token1, fee, tickSpacing, liquidity, slot0] = state
    const meta = await c.multicall({
      contracts: [
        { address: token0, abi: ERC20_ABI, functionName: 'symbol' },
        { address: token0, abi: ERC20_ABI, functionName: 'decimals' },
        { address: token1, abi: ERC20_ABI, functionName: 'symbol' },
        { address: token1, abi: ERC20_ABI, functionName: 'decimals' },
        {
          address: V3_FACTORY,
          abi: FACTORY_ABI,
          functionName: 'getPool',
          args: [token0, token1, fee],
        },
      ],
      allowFailure: false,
      blockNumber: atBlock,
    })
    if (meta.length !== 5) {
      throw new Error(`${address}: token batch returned ${meta.length} of 5 entries at block ${atBlock}`)
    }
    const [symbol0, decimals0, symbol1, decimals1, owned] = meta
    const [sqrtPriceX96, tick] = slot0
    return {
      atBlock: Number(atBlock),
      readAt: Date.now(),
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
      liquidity,
      owned,
    }
  })

  if (getAddress(read.owned) !== address) {
    throw new Error(
      `${address} is not a PancakeSwap v3 pool: the factory's ${read.symbol0}/${read.symbol1} pool at fee ${read.fee} is ${read.owned}`,
    )
  }

  // slot0 carries the price and the tick separately, so one checks the other. A gap wider than a
  // tick means the decode is wrong rather than that the market moved.
  const raw = rawPrice(read.sqrtPriceX96)
  const fromTick = TICK_BASE ** read.tick
  const gap = Math.abs(raw / fromTick - 1)
  if (!(gap < TICK_CHECK_TOLERANCE)) {
    throw new Error(
      `${address}: sqrtPriceX96 gives ${raw} where 1.0001^${read.tick} gives ${fromTick}, ${(gap * 100).toFixed(2)}% apart`,
    )
  }

  // The decimals shift is the piece that is easy to forget on BSC, where nearly everything is 18 so
  // the factor is 1. It is only wrong the one time a pair is not.
  const price1Per0 = raw * 10 ** (read.decimals0 - read.decimals1)
  if (!Number.isFinite(price1Per0) || price1Per0 <= 0) {
    throw new Error(
      `${address}: sqrtPriceX96 ${read.sqrtPriceX96} at decimals ${read.decimals0}/${read.decimals1} gives ${price1Per0}`,
    )
  }

  return {
    pool: address,
    token0: read.token0,
    token1: read.token1,
    symbol0: read.symbol0,
    symbol1: read.symbol1,
    decimals0: read.decimals0,
    decimals1: read.decimals1,
    fee: read.fee,
    tickSpacing: read.tickSpacing,
    tick: read.tick,
    sqrtPriceX96: read.sqrtPriceX96.toString(),
    liquidity: read.liquidity.toString(),
    price1Per0,
    readAt: read.readAt,
    atBlock: read.atBlock,
  }
}

/**
 * Where a range sits against the pool right now, plus what to do about it. Every number comes from
 * one `readPool`, so the report describes a single block rather than a blend of several.
 */
export async function lpDrift(
  pool: string,
  lowerTick: number,
  upperTick: number,
): Promise<DriftReport> {
  // `PancakeV3Pool.checkTicks` reverts on each of these, so a range that fails them describes no
  // position that could exist on chain.
  if (!Number.isInteger(lowerTick) || !Number.isInteger(upperTick)) {
    throw new Error(`ticks must be integers, got ${lowerTick} to ${upperTick}`)
  }
  if (lowerTick >= upperTick) {
    throw new Error(`lowerTick ${lowerTick} must sit below upperTick ${upperTick}`)
  }
  if (lowerTick < MIN_TICK || upperTick > MAX_TICK) {
    throw new Error(`range [${lowerTick}, ${upperTick}] leaves the tick bounds [${MIN_TICK}, ${MAX_TICK}]`)
  }

  const state = await readPool(pool)
  const tick = state.tick
  const inRange = tick >= lowerTick && tick < upperTick

  // Bounds and spot are compared before the decimals shift, which cancels in a ratio anyway.
  const spot = rawPrice(BigInt(state.sqrtPriceX96))
  const distanceToLowerPct = finitePct((spot - TICK_BASE ** lowerTick) / spot)
  const distanceToUpperPct = finitePct((TICK_BASE ** upperTick - spot) / spot)

  const width = upperTick - lowerTick
  const widthPct = (TICK_BASE ** width - 1) * 100
  // 0 sits on a bound, 0.5 sits dead centre.
  const offset = Math.min(tick - lowerTick, upperTick - tick) / width

  let recommendation: DriftReport['recommendation']
  let why: string
  if (widthPct < THIN_BAND_PCT) {
    recommendation = 'widen'
    why = `band spans ${fmt(widthPct)}% of price. Anything under ${THIN_BAND_PCT}% exits again within minutes on this chain, so widen before recentring.`
  } else if (!inRange) {
    recommendation = 'recentre'
    const side = tick < lowerTick ? 'below' : 'at or above'
    why = `tick ${tick} is ${side} the band [${lowerTick}, ${upperTick}) so the position holds one token only, earning no fees.`
  } else if (offset < EDGE_FRACTION) {
    recommendation = 'recentre'
    why = `spot sits ${fmt(offset * 100)}% of the way in from the nearer bound of a band ${fmt(widthPct)}% wide, inside the outer ${EDGE_FRACTION * 100}%. ${pctText(nearer(distanceToLowerPct, distanceToUpperPct))} of price is left to that bound.`
  } else {
    recommendation = 'hold'
    why = `spot sits ${fmt(offset * 100)}% of the way in from the nearer bound of a band ${fmt(widthPct)}% wide, ${pctText(distanceToLowerPct)} above the lower bound with ${pctText(distanceToUpperPct)} to the upper.`
  }

  // Position bounds have to be multiples of the tier's tickSpacing, so an off grid range cannot be
  // minted as given even when everything above reads fine.
  if (lowerTick % state.tickSpacing !== 0 || upperTick % state.tickSpacing !== 0) {
    why += ` Bounds are off the ${state.tickSpacing} tick grid so this range cannot be minted as given.`
  }

  return {
    pool: state.pool,
    inRange,
    lowerTick,
    upperTick,
    currentTick: tick,
    distanceToLowerPct,
    distanceToUpperPct,
    recommendation,
    why,
    readAt: state.readAt,
    atBlock: state.atBlock,
  }
}

/**
 * Raw token1 per token0, before decimals. `Number(sqrtPriceX96)` rounds to 53 bits so the answer
 * carries about 16 significant digits. The whole tick range stays inside a double: 2.9e-39 at
 * MIN_TICK up to 3.4e38 at MAX_TICK, no overflow either end. Checked against exact BigInt
 * arithmetic on every pool above, where the gap runs a few parts in 1e16, the floor of a double.
 */
function rawPrice(sqrtPriceX96: bigint): number {
  const r = Number(sqrtPriceX96) / 2 ** 96
  return r * r
}

/** Percent. Null when the arithmetic gave no number, because a zero reads as "on the bound". */
function finitePct(ratio: number): number | null {
  const v = ratio * 100
  return Number.isFinite(v) ? v : null
}

/** The closer of two distances, tolerating a missing one rather than treating it as zero. */
function nearer(a: number | null, b: number | null): number | null {
  if (a === null) return b
  if (b === null) return a
  return Math.min(a, b)
}

/** Percent for a sentence a person reads. The honest word when there is no number. */
function pctText(v: number | null): string {
  return v === null ? 'an unknown distance' : `${fmt(v)}%`
}

/** Three significant figures is enough for a sentence. Full precision stays in the fields. */
function fmt(v: number): string {
  if (Math.abs(v) >= 1e6) return v.toExponential(2)
  if (Math.abs(v) >= 100) return v.toFixed(0)
  if (Math.abs(v) >= 1) return v.toFixed(2)
  return v.toPrecision(3)
}
