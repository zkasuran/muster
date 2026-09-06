/**
 * Grid trading plans on BNB Smart Chain, built on a live PancakeSwap mark price.
 *
 * Nothing here is a table lookup. The mark comes from `readPool` in ./pancake.ts. The round
 * trip cost comes from the pool's own fee tier plus the live gas price. The break even that
 * decides whether a ladder is worth placing falls out of those two.
 * docs/research/R08-pancakeswap.md carries the measurements this file leans on: v3 fee tiers
 * are in pips with no 0.3% tier on BSC. An Infinity pool can report `fee` 8388608 as a
 * dynamic fee flag rather than a tier. An aggregator swap costs about 738k gas at the
 * 0.05 gwei BSC base price.
 *
 * Verified live on 2026-09-06 at block 120,210,866 against
 * 0x172fcD41E0913e95784454622d1c3724f546f849 (USDT/WBNB, fee 100, tickSpacing 1). The price
 * off `sqrtPriceX96` and `1.0001^tick` agreed to 0.73 bps, which is inside one tick.
 *
 * A refusal is a first class result. Bad inputs come back as a plan with no levels plus the
 * reasons in `warnings`, so a shelf renders why instead of rendering nonsense.
 */
import { readPool, type PoolState } from './pancake.ts'
import { TOKENS } from './constants.ts'
import { withRpc } from './rpc.ts'

export interface GridLevel {
  index: number
  /** Resting price in quote per base, the same orientation as `GridPlan.markPrice`. */
  price: number
  side: 'buy' | 'sell'
  /** Base tokens bought or sold if this level fills, in human units. */
  sizeBase: number
  /** Quote paid on a buy fill or received on a sell fill. Equal across the ladder. */
  notionalQuote: number
}

export interface GridPlan {
  /** `BASE/QUOTE`, so the mark reads the way a buyer says it out loud. */
  pair: string
  markPrice: number
  lower: number
  upper: number
  levelCount: number
  /** One geometric step, as a percentage. Every step is this same percentage. */
  spacingPct: number
  levels: GridLevel[]
  /** Quote cash the buy side needs. */
  capitalRequiredQuote: number
  /** Base inventory the sell side needs held up front. */
  capitalRequiredBase: number
  breakoutRule: string
  /**
   * Fills in one full traversal of the band, low to high to low, where every interior level
   * is crossed twice. It is a count under that definition rather than a forecast: no price
   * path was measured here, since R08 records that the pool oracle cannot even serve a 24h
   * TWAP on BSC. Null when no ladder was produced.
   */
  expectedFillsPerCycle: number | null
  warnings: string[]
  /** When the mark was read. A plan is exactly as fresh as the price it stands on. */
  readAt: number
  atBlock: number | null
}

/**
 * One aggregator swap on BSC, the `gasUseEstimate` measured in R08. It is the conservative
 * figure: a direct single pool swap is cheaper, so a ladder that clears the break even at
 * this number clears it routed as well.
 */
const SWAP_GAS_UNITS = 738_000n

/**
 * A fill is its own on chain swap, so a very long ladder spends more on gas than its steps
 * capture. The cap is a house limit rather than a protocol one, set where the arithmetic
 * stops being interesting instead of where a response gets slow.
 */
const MAX_LEVELS = 200

/**
 * Every token in the payment rail table is dollar denominated, so a pool with exactly one of
 * them has an obvious quote side. Lowercased because `token0` casing varies by RPC.
 */
const DOLLAR_QUOTES = new Set(Object.values(TOKENS).map((t) => t.address.toLowerCase()))

/**
 * WBNB is not in lib/constants.ts, which covers the payment rail rather than the AMM. This
 * address was read live as `token1()` on each of the three pools in tools/grid-gate.ts. It
 * matches R08. It is here for one job: pricing gas, which is paid in BNB, into the quote.
 */
const WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'

/** Six significant figures, so a 767 price and a 0.0029 price both read correctly. */
function sig(n: number, digits = 6): string {
  if (!Number.isFinite(n)) return 'unknown'
  return Number(n.toPrecision(digits)).toString()
}

/**
 * Which side of the pool is the money. A grid is quoted as quote per base, so token order is
 * not enough on its own: on the deepest USDT/WBNB pool `token0` is the stablecoin, so
 * `price1Per0` is WBNB per USDT and a buyer wants the other way up. A dollar stablecoin takes
 * the quote side whenever exactly one side is one. Otherwise the AMM convention stands, where
 * `price1Per0` already prices token0 in token1.
 */
function orient(state: PoolState): {
  pair: string
  base: string
  quote: string
  markPrice: number
  invert: boolean
} {
  const zeroIsDollar = DOLLAR_QUOTES.has(state.token0.toLowerCase())
  const oneIsDollar = DOLLAR_QUOTES.has(state.token1.toLowerCase())
  const invert = zeroIsDollar && !oneIsDollar
  if (!Number.isFinite(state.price1Per0) || state.price1Per0 <= 0) {
    throw new Error(
      `pool ${state.pool} returned price1Per0 ${state.price1Per0}, which cannot carry a grid. ` +
        `A plan without a mark is not a plan.`,
    )
  }
  const base = invert ? state.symbol1 : state.symbol0
  const quote = invert ? state.symbol0 : state.symbol1
  return {
    pair: `${base}/${quote}`,
    base,
    quote,
    markPrice: invert ? 1 / state.price1Per0 : state.price1Per0,
    invert,
  }
}

/** Gas priced into the quote token. Where that cannot be done the reason takes its place. */
type GasTerm =
  | { quotePerSwap: number; gwei: number; why: null }
  | { quotePerSwap: null; gwei: null; why: string }

/**
 * Gas is paid in BNB, so it only converts into the quote when one side of the pool is WBNB.
 * When the quote is WBNB the cost is already in quote units. When the base is WBNB the mark is
 * the BNB price, so one multiply does it. Any other pair leaves the term unpriced rather than
 * guessed, which is why this returns a reason instead of a number.
 */
async function swapCostInQuote(
  state: PoolState,
  markPrice: number,
  invert: boolean,
): Promise<GasTerm> {
  const quoteToken = (invert ? state.token0 : state.token1).toLowerCase()
  const baseToken = (invert ? state.token1 : state.token0).toLowerCase()
  if (quoteToken !== WBNB && baseToken !== WBNB) {
    return {
      quotePerSwap: null,
      gwei: null,
      why: 'neither side of this pool is WBNB, so gas paid in BNB has no rate into the quote token here',
    }
  }
  let gasPrice: bigint
  try {
    gasPrice = await withRpc((c) => c.getGasPrice())
  } catch (e) {
    return {
      quotePerSwap: null,
      gwei: null,
      why: `gas price read failed: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`,
    }
  }
  const bnbPerSwap = Number(gasPrice * SWAP_GAS_UNITS) / 1e18
  return {
    quotePerSwap: quoteToken === WBNB ? bnbPerSwap : bnbPerSwap * markPrice,
    gwei: Number(gasPrice) / 1e9,
    why: null,
  }
}

/**
 * Plan a grid on one live pool.
 *
 * `lowerPct` and `upperPct` are distances from the mark in percent, so `{lowerPct: 10,
 * upperPct: 10}` is a band 10% either side. The sign is ignored on the lower bound because a
 * distance below the mark means the same thing written either way. A negative upper bound gets
 * a note rather than a silent reading.
 *
 * The mark read happens first, before any input check, so a refused plan still carries the
 * real price it was refused against.
 */
export async function planGrid(input: {
  pool: string
  lowerPct: number
  upperPct: number
  levelCount: number
  capitalQuote: number
}): Promise<GridPlan> {
  const state = await readPool(input.pool)
  const { pair, base, quote, markPrice, invert } = orient(state)

  // Refusals stop the ladder. Notes ride along with a plan that was still worth producing.
  const refusals: string[] = []
  const notes: string[] = []

  const n = input.levelCount
  if (!Number.isInteger(n) || n < 2) {
    refusals.push(
      `levelCount ${input.levelCount} refused: a grid needs at least two levels for a step to exist between them`,
    )
  } else if (n > MAX_LEVELS) {
    refusals.push(
      `levelCount ${n} refused: every fill is its own on chain swap, so a ladder past ${MAX_LEVELS} levels pays more gas than its steps capture`,
    )
  }

  if (input.upperPct < 0) {
    notes.push(
      `upperPct ${input.upperPct} read as ${sig(Math.abs(input.upperPct))} percent above the mark, since both bounds are distances from it`,
    )
  }

  const lowerMag = Math.abs(input.lowerPct)
  const upperMag = Math.abs(input.upperPct)
  if (!Number.isFinite(lowerMag) || !Number.isFinite(upperMag)) {
    refusals.push(
      `lowerPct ${input.lowerPct} with upperPct ${input.upperPct} refused: a band needs two finite bounds`,
    )
  } else if (lowerMag >= 100) {
    refusals.push(
      `lowerPct ${input.lowerPct} refused: ${sig(lowerMag)} percent below the mark puts the bottom of the band at or under zero`,
    )
  }

  const lower = markPrice * (1 - lowerMag / 100)
  const upper = markPrice * (1 + upperMag / 100)
  if (!(lower < upper)) {
    refusals.push(
      `band ${sig(lower)} to ${sig(upper)} ${quote} refused: the lower bound is not below the upper one, so there is nowhere to place levels`,
    )
  }

  if (!Number.isFinite(input.capitalQuote) || input.capitalQuote <= 0) {
    refusals.push(`capitalQuote ${input.capitalQuote} refused: a ladder needs capital to fund it`)
  }

  // R08 measured Infinity pools carrying 8388608 as a dynamic fee flag with lpFee 0. There a
  // hook prices each swap, so there is no static tier to charge the round trip against and
  // saying so beats printing a fabricated number.
  const feeRate = state.fee > 0 && state.fee < 1_000_000 ? state.fee / 1_000_000 : null
  if (feeRate === null) {
    notes.push(
      `pool reports fee ${state.fee}, which is not a static tier in pips, so the round trip fee could not be priced`,
    )
  }

  const gas = await swapCostInQuote(state, markPrice, invert)
  if (gas.why !== null) notes.push(`gas per fill not priced: ${gas.why}`)

  // Geometric spacing, not arithmetic. A pool price is a ratio, so it moves in percentages:
  // equal percentage steps make every round trip capture the same fraction of its notional, so
  // one break even covers the whole ladder. On the 11 level band this file was gated against,
  // arithmetic steps would capture 2.222% at the bottom against 1.852% at the top, so which
  // levels paid would depend on where they happened to sit.
  let step: number | null = null
  let perLevelQuote: number | null = null
  if (refusals.length === 0) {
    step = Math.pow(upper / lower, 1 / (n - 1))
    perLevelQuote = input.capitalQuote / n
    const spacing = step - 1
    if (feeRate !== null && spacing <= 2 * feeRate) {
      refusals.push(
        `spacing ${sig(spacing * 100)} percent refused: the pool takes ${sig(2 * feeRate * 100)} percent across a buy plus a sell, so every round trip on this ladder loses money. Widen the band or cut the level count.`,
      )
    } else if (feeRate !== null && gas.why === null) {
      // Break even per round trip: notional * (spacing - 2 * fee) has to clear two swaps of
      // gas. Solved for the notional, it is the smallest level worth placing.
      const minPerLevel = (2 * gas.quotePerSwap) / (spacing - 2 * feeRate)
      if (perLevelQuote < minPerLevel) {
        refusals.push(
          `capitalQuote ${sig(input.capitalQuote)} refused: ${sig(perLevelQuote)} ${quote} a level does not clear a round trip, which needs ${sig(minPerLevel)} ${quote} to cover ${sig(2 * gas.quotePerSwap)} ${quote} of gas on two swaps at ${sig(gas.gwei)} gwei net of the ${sig(2 * feeRate * 100)} percent pool fee. Fund ${sig(minPerLevel * n)} ${quote} or more across ${n} levels.`,
        )
      }
    }
  }

  if (refusals.length > 0 || step === null || perLevelQuote === null) {
    // A non finite bound cannot produce a band, so both edges report the mark. The empty
    // ladder plus the refusal is what says there is no band, rather than a made up width.
    const edgeLow = Number.isFinite(lower) ? lower : markPrice
    const edgeHigh = Number.isFinite(upper) ? upper : markPrice
    return {
      pair,
      markPrice,
      lower: edgeLow,
      upper: edgeHigh,
      levelCount: 0,
      spacingPct: 0,
      levels: [],
      capitalRequiredQuote: 0,
      capitalRequiredBase: 0,
      breakoutRule: `No ladder was planned, so there is no breakout to act on. The mark on ${pair} is ${sig(markPrice)} ${quote} and the reasons are in warnings.`,
      expectedFillsPerCycle: null,
      warnings: [...refusals, ...notes],
      readAt: state.readAt,
      atBlock: state.atBlock,
    }
  }

  // Equal quote notional per level, which is what pairs each buy with a sell of the same size
  // and makes the capture per round trip exactly the spacing. A level at the mark rests as a
  // sell, since the only crossing that can fill it is price coming up through it.
  const levels: GridLevel[] = []
  for (let i = 0; i < n; i++) {
    const price = lower * Math.pow(step, i)
    levels.push({
      index: i,
      price,
      side: price < markPrice ? 'buy' : 'sell',
      sizeBase: perLevelQuote / price,
      notionalQuote: perLevelQuote,
    })
  }

  let capitalRequiredQuote = 0
  let capitalRequiredBase = 0
  let baseIfAllBuysFill = 0
  for (const level of levels) {
    if (level.side === 'buy') {
      capitalRequiredQuote += level.notionalQuote
      baseIfAllBuysFill += level.sizeBase
    } else {
      capitalRequiredBase += level.sizeBase
    }
  }

  if (capitalRequiredQuote === 0) {
    notes.push(
      `the band starts at the mark, so every level is a sell and the plan needs ${sig(capitalRequiredBase)} ${base} up front rather than ${quote}`,
    )
  }

  const avgBuy = baseIfAllBuysFill > 0 ? capitalRequiredQuote / baseIfAllBuysFill : null
  const soldOut = `Above ${sig(upper)} ${quote} every sell has filled, the plan holds only ${quote} and nothing fills again until price comes back inside the band.`
  // The downside figure is the whole inventory, not just what the buys bought. Below the band the
  // sell side never sold, so its up front base is still held and a buyer sizing the drawdown needs
  // both numbers.
  const boughtOut =
    avgBuy === null
      ? `Below ${sig(lower)} ${quote} nothing fills either, because this ladder has no buy side under the mark to catch a fall.`
      : `Below ${sig(lower)} ${quote} every buy has filled while no sell did, so the plan holds ${sig(baseIfAllBuysFill + capitalRequiredBase)} ${base} in all: the ${sig(capitalRequiredBase)} the sell side started with plus ${sig(baseIfAllBuysFill)} bought at an average of ${sig(avgBuy)} ${quote}, down on paper for as long as price stays under the band.`
  const breakoutRule = `${soldOut} ${boughtOut} It never buys above ${sig(upper)} or sells below ${sig(lower)}, so a breakout stops the earning rather than forcing a loss. Recentre the grid on the new mark or hold the inventory until price comes back.`

  return {
    pair,
    markPrice,
    lower,
    upper,
    levelCount: levels.length,
    spacingPct: (step - 1) * 100,
    levels,
    capitalRequiredQuote,
    capitalRequiredBase,
    breakoutRule,
    // Every interior level is crossed twice in one full traversal of the band.
    expectedFillsPerCycle: 2 * (n - 1),
    warnings: [...refusals, ...notes],
    readAt: state.readAt,
    atBlock: state.atBlock,
  }
}
