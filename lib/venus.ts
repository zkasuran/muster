/**
 * Venus core pool reads on BSC. The health factor here is derived rather than read: Venus
 * publishes liquidity and shortfall and never a health factor, so the ratio is recomputed from
 * the same primitives the protocol weighs, then cross-checked against the Comptroller's own
 * answer. tools/venus-gate.ts is that cross-check and it reconciles to the wei.
 *
 * Three facts shape the whole file, each confirmed live before it was written:
 *
 *   The Comptroller is a Diamond, not the plain Unitroller every Compound v2 tutorial
 *   describes. getEffectiveLtvFactor and getAccountLiquidity sit on facets and appear in no
 *   published core-pool ABI, so they are declared here from their deployed selectors.
 *
 *   Collateral factor and liquidation threshold are separate numbers on 23 of the 55 core
 *   markets, counted on 2026-09-06 and expected to drift as governance votes land.
 *   getAccountLiquidity weights collateral by the liquidation threshold, which is the
 *   liquidation question. Weighting by the collateral factor answers the borrow-capacity
 *   question instead and lands on a different number, so the two are never mixed here.
 *
 *   Free BSC RPC has no archive. A pinned eth_call answers for roughly the last 64 blocks then
 *   returns 403, so a position read pins to the tip and a pin that goes stale restarts the
 *   whole read on the next endpoint rather than being stitched across two blocks.
 */
import { parseAbi, isAddress, type PublicClient } from 'viem'
import { bsc } from 'viem/chains'
import { CHAIN } from './constants.ts'
import { withRpc } from './rpc.ts'

/**
 * Only the entry point is hardcoded. It was verified on 2026-09-06 to carry 3,019 bytes of
 * code on chain 56, with closeFactorMantissa() 0.5e18 and lastPoolId() 15. The price oracle
 * and the VAI controller are read off it at call time instead of being pinned here, because
 * governance can move either one and a stale address would price a position against a feed
 * Venus itself no longer uses. They answered 0x6592b5DE802159F3E74B2486b091D11a8256ab8A
 * (ResilientOracle) and 0x004065D34C6b18cE4370ced1CeBDE94865DbFAFE when this was written.
 */
export const VENUS = {
  chainId: CHAIN.id,
  comptroller: '0xfD36E2c2a6789Db23113685031d7F16329158384',
} as const

export const COMPTROLLER_ABI = parseAbi([
  'function getAllMarkets() view returns (address[])',
  'function getAssetsIn(address account) view returns (address[])',
  'function markets(address vToken) view returns (bool isListed, uint256 collateralFactorMantissa, bool isVenus)',
  'function getAccountLiquidity(address account) view returns (uint256 err, uint256 liquidity, uint256 shortfall)',
  'function getEffectiveLtvFactor(address account, address vToken, uint8 strategy) view returns (uint256)',
  'function oracle() view returns (address)',
  'function vaiController() view returns (address)',
])

/** getAccountSnapshot is three reads in one call, which is what keeps a position read cheap. */
export const VTOKEN_ABI = parseAbi([
  'function getAccountSnapshot(address account) view returns (uint256 err, uint256 vTokenBalance, uint256 borrowBalance, uint256 exchangeRateMantissa)',
  'function symbol() view returns (string)',
  'function underlying() view returns (address)',
])

export const ORACLE_ABI = parseAbi([
  'function getUnderlyingPrice(address vToken) view returns (uint256)',
])

/** VAI debt is not a market, so it never shows up in getAssetsIn. It still counts as debt. */
export const VAI_CONTROLLER_ABI = parseAbi([
  'function getVAIRepayAmount(address account) view returns (uint256)',
])

export const ERC20_ABI = parseAbi(['function decimals() view returns (uint8)'])

/**
 * Both sums the lens keeps are USD scaled 1e18 whatever the underlying's own decimals, because
 * getUnderlyingPrice returns 1e(36 - underlyingDecimals) and exchangeRateStored carries the
 * matching 1e(18 + underlyingDecimals - 8). The decimals cancel, so no health factor here
 * depends on reading them. listMarkets reads them anyway because a caller showing amounts does.
 */
const WAD = 10n ** 18n

/**
 * Multicall3 overflows on an oversized batch and drops entries instead of erroring, so batches
 * stay small and every returned count is checked against the count asked for.
 */
const MARKETS_PER_BATCH = 10
const CALLS_PER_MARKET = 5

/** getEffectiveLtvFactor strategy. 0 weights by collateral factor, 1 by liquidation threshold. */
const WEIGHT_COLLATERAL_FACTOR = 0
const WEIGHT_LIQUIDATION_THRESHOLD = 1

/**
 * Shown verbatim in the UI, so it states what was computed rather than gesturing at it. The
 * truncating integer order matters: it is the order ComptrollerLens uses, which is why the
 * recompute lands on getAccountLiquidity to the wei instead of a rounding error away from it.
 */
export const HEALTH_FACTOR_FORMULA =
  'HF = sumCollateral(liquidationThreshold) / sumBorrowPlusEffects. Venus publishes liquidity ' +
  'and shortfall, never a health factor, so this is derived. Per entered market, collateral = ' +
  'liquidationThreshold * exchangeRateStored / 1e18 * oraclePrice / 1e18 * vTokenBalance / 1e18 ' +
  'and debt = oraclePrice * borrowBalance / 1e18, both USD scaled 1e18, all integer truncating. ' +
  'VAIController.getVAIRepayAmount is added to the debt side. Venus liquidates when shortfall ' +
  'is non-zero, which is exactly HF < 1.'

export interface VenusMarket {
  symbol: string
  vToken: string
  underlying: string
  underlyingDecimals: number
  collateralFactor: number
}

export interface HealthFactorReport {
  account: string
  healthFactor: number | null
  totalCollateralUsd: number | null
  totalBorrowUsd: number | null
  liquidityUsd: number | null
  shortfallUsd: number | null
  priceDropToLiquidationPct: number | null
  /**
   * `suppliedUsd` is UNWEIGHTED, and `totalCollateralUsd` is weighted by
   * `liquidationThreshold`. The two therefore do not add up, which looks like an error unless
   * the threshold is on the row, so it is. Venus carries a collateral factor and a liquidation
   * threshold separately on newer markets and they differ: vXRP reads 0.5 and 0.65.
   */
  markets: {
    symbol: string
    suppliedUsd: number
    borrowedUsd: number
    collateralFactor: number
    liquidationThreshold: number
    weightedCollateralUsd: number
  }[]
  formula: string
  readAt: number
  atBlock: number
}

/** One entered market at the pinned block, as read, with nothing derived yet. */
interface MarketPosition {
  vToken: `0x${string}`
  symbol: string
  vTokenBalance: bigint
  borrowBalance: bigint
  exchangeRate: bigint
  /** USD for one whole unit of underlying, scaled 1e(36 - underlyingDecimals). */
  price: bigint
  collateralFactorMantissa: bigint
  liquidationThresholdMantissa: bigint
}

/**
 * viem's multicall generics do not survive a heterogeneous batch, so the entries are narrowed
 * by hand. Each leg is checked before it is used rather than being trusted by its position.
 */
type Attempt = { status: 'success'; result: unknown } | { status: 'failure'; error: unknown }

function ok(a: Attempt | undefined): unknown {
  return a && a.status === 'success' ? a.result : null
}

function toUsd(wad: bigint): number {
  return Number(wad) / 1e18
}

/**
 * The account's position in the Venus core pool, every leg read at one block. A caller gets
 * numbers or it gets null: a leg that did not answer nulls the totals rather than dropping out
 * of a sum, because a sum that quietly lost a market reads as a healthier account than it is.
 *
 * `markets` is the entered set from getAssetsIn, not every market the account holds a vToken in.
 * Supplying without calling enterMarkets leaves the balance outside the protocol's own liquidity
 * math, so counting it here would overstate collateral against a threshold Venus never applies.
 * That case is common: five of the sixteen recent suppliers the gate sampled had entered nothing.
 */
export async function readHealthFactor(account: string): Promise<HealthFactorReport> {
  // Reads only, so a bad checksum is not a hazard here and refusing one would break a
  // lowercased URL parameter. Something that is not an address at all still gets refused.
  if (!isAddress(account, { strict: false })) throw new Error(`not an address: ${account}`)
  const acct = account as `0x${string}`
  const comptroller = VENUS.comptroller as `0x${string}`

  return withRpc(async (c) => {
    // One block for the whole read. BSC blocks are 0.45 s apart and debt accrues every block,
    // so a position stitched from two blocks cannot be reconciled against the Comptroller.
    const atBlock = await c.getBlockNumber()
    const head = (await c.multicall({
      contracts: [
        { address: comptroller, abi: COMPTROLLER_ABI, functionName: 'getAssetsIn', args: [acct] },
        { address: comptroller, abi: COMPTROLLER_ABI, functionName: 'oracle' },
        { address: comptroller, abi: COMPTROLLER_ABI, functionName: 'vaiController' },
      ],
      allowFailure: false,
      blockNumber: atBlock,
    })) as unknown as [readonly `0x${string}`[], `0x${string}`, `0x${string}`]
    const [assets, oracle, vaiController] = head

    const rows: MarketPosition[] = []
    let incomplete = false
    for (let i = 0; i < assets.length; i += MARKETS_PER_BATCH) {
      const batch = assets.slice(i, i + MARKETS_PER_BATCH)
      const contracts = batch.flatMap((v) => [
        { address: v, abi: VTOKEN_ABI, functionName: 'getAccountSnapshot', args: [acct] },
        { address: v, abi: VTOKEN_ABI, functionName: 'symbol' },
        { address: oracle, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v] },
        {
          address: comptroller,
          abi: COMPTROLLER_ABI,
          functionName: 'getEffectiveLtvFactor',
          args: [acct, v, WEIGHT_COLLATERAL_FACTOR],
        },
        {
          address: comptroller,
          abi: COMPTROLLER_ABI,
          functionName: 'getEffectiveLtvFactor',
          args: [acct, v, WEIGHT_LIQUIDATION_THRESHOLD],
        },
      ])
      const res = (await c.multicall({
        contracts,
        allowFailure: true,
        blockNumber: atBlock,
      })) as unknown as Attempt[]
      // Multicall3 drops entries on overflow instead of erroring, so a short answer is a bug
      // in the batch size rather than a chain fact and it must not be averaged over.
      if (res.length !== contracts.length) {
        throw new Error(`multicall returned ${res.length} of ${contracts.length} calls`)
      }
      for (let j = 0; j < batch.length; j++) {
        const vToken = batch[j] as `0x${string}`
        const base = j * CALLS_PER_MARKET
        const snap = ok(res[base]) as readonly [bigint, bigint, bigint, bigint] | null
        const price = ok(res[base + 2]) as bigint | null
        const cf = ok(res[base + 3]) as bigint | null
        const lt = ok(res[base + 4]) as bigint | null
        // Venus returns an error code in the first slot instead of reverting, so a non-zero
        // code is a failed read that happens to have decoded.
        if (!snap || snap[0] !== 0n || price === null || cf === null || lt === null) {
          incomplete = true
          continue
        }
        const symbol = ok(res[base + 1])
        rows.push({
          vToken,
          // A missing symbol costs a label, not a number, so it never nulls the totals.
          symbol: typeof symbol === 'string' && symbol !== '' ? symbol : vToken,
          vTokenBalance: snap[1],
          borrowBalance: snap[2],
          exchangeRate: snap[3],
          price,
          collateralFactorMantissa: cf,
          liquidationThresholdMantissa: lt,
        })
      }
    }

    const tail = (await c.multicall({
      contracts: [
        { address: comptroller, abi: COMPTROLLER_ABI, functionName: 'getAccountLiquidity', args: [acct] },
        { address: vaiController, abi: VAI_CONTROLLER_ABI, functionName: 'getVAIRepayAmount', args: [acct] },
      ],
      allowFailure: true,
      blockNumber: atBlock,
    })) as unknown as Attempt[]
    const liq = ok(tail[0]) as readonly [bigint, bigint, bigint] | null
    const vaiDebt = ok(tail[1]) as bigint | null
    if (vaiDebt === null) incomplete = true

    let sumCollateral = 0n
    let sumBorrow = vaiDebt ?? 0n
    const markets = rows.map((r) => {
      const weighted = (((r.liquidationThresholdMantissa * r.exchangeRate) / WAD) * r.price) / WAD
      const supplied = (((r.exchangeRate * r.price) / WAD) * r.vTokenBalance) / WAD
      const borrowed = (r.price * r.borrowBalance) / WAD
      sumCollateral += (weighted * r.vTokenBalance) / WAD
      sumBorrow += borrowed
      return {
        symbol: r.symbol,
        // Unweighted on purpose. The row shows the position, the total does the weighting.
        // Both the threshold and the weighted figure ride along, because otherwise the rows
        // visibly do not add up to the total and that reads as a bug rather than as a
        // liquidation threshold doing its job.
        suppliedUsd: toUsd(supplied),
        liquidationThreshold: Number(r.liquidationThresholdMantissa) / 1e18,
        weightedCollateralUsd: toUsd((weighted * r.vTokenBalance) / WAD),
        borrowedUsd: toUsd(borrowed),
        collateralFactor: Number(r.collateralFactorMantissa) / 1e18,
      }
    })

    const totalCollateralUsd = incomplete ? null : toUsd(sumCollateral)
    const totalBorrowUsd = incomplete ? null : toUsd(sumBorrow)
    // Venus puts an error code in the first slot when the other two mean nothing.
    const liquidityUsd = liq && liq[0] === 0n ? toUsd(liq[1]) : null
    const shortfallUsd = liq && liq[0] === 0n ? toUsd(liq[2]) : null
    // No debt means there is no health factor to report. Infinity would render as a figure a
    // user could sort on. Zero would read as the most dangerous position on the shelf.
    // Dividing the two published totals is deliberate: the number shown is the ratio of the
    // numbers shown, so a reader can check it with a calculator.
    const healthFactor =
      totalCollateralUsd === null || totalBorrowUsd === null || totalBorrowUsd === 0
        ? null
        : totalCollateralUsd / totalBorrowUsd

    // A uniform fall across the collateral prices scales the weighted collateral linearly, so
    // the fall that lands the health factor on 1 is 1 - 1/HF. It holds the debt's own price
    // still, which is right for a stablecoin debt and optimistic when the debt is priced in
    // something that falls with the collateral. Clamped at zero because a position already in
    // shortfall needs no fall at all, so that zero is measured rather than a stand-in.
    const priceDropToLiquidationPct =
      healthFactor === null ? null : Math.max(0, 1 - 1 / healthFactor) * 100

    return {
      account: acct,
      healthFactor,
      totalCollateralUsd,
      totalBorrowUsd,
      liquidityUsd,
      shortfallUsd,
      priceDropToLiquidationPct,
      markets,
      formula: HEALTH_FACTOR_FORMULA,
      readAt: Date.now(),
      atBlock: Number(atBlock),
    }
  })
}

/**
 * Every listed core market with the collateral factor Venus applies in the core pool.
 *
 * Not pinned to a block, unlike a position read. These values move only on a governance vote,
 * so a list that straddles a block is still coherent. Pinning 55 markets across a dozen round
 * trips would risk running past the end of the short window the free RPC serves.
 *
 * The factor here is the core-pool one. An account that has entered an E-Mode pool is weighted
 * differently, which is why readHealthFactor asks getEffectiveLtvFactor per account rather than
 * reusing this number.
 */
export async function listMarkets(): Promise<VenusMarket[]> {
  const comptroller = VENUS.comptroller as `0x${string}`
  return withRpc(async (c) => {
    const vTokens = (await c.readContract({
      address: comptroller,
      abi: COMPTROLLER_ABI,
      functionName: 'getAllMarkets',
    })) as readonly `0x${string}`[]

    const out: VenusMarket[] = []
    for (let i = 0; i < vTokens.length; i += MARKETS_PER_BATCH) {
      const batch = vTokens.slice(i, i + MARKETS_PER_BATCH)
      const contracts = batch.flatMap((v) => [
        { address: v, abi: VTOKEN_ABI, functionName: 'symbol' },
        { address: v, abi: VTOKEN_ABI, functionName: 'underlying' },
        { address: comptroller, abi: COMPTROLLER_ABI, functionName: 'markets', args: [v] },
      ])
      const res = (await c.multicall({ contracts, allowFailure: true })) as unknown as Attempt[]
      if (res.length !== contracts.length) {
        throw new Error(`multicall returned ${res.length} of ${contracts.length} calls`)
      }

      // vBNB's underlying is the native coin, so underlying() reverts there and nowhere else.
      const underlyings = batch.map((_, j) => ok(res[j * 3 + 1]) as `0x${string}` | null)
      const decimalsFor = await readDecimals(c, underlyings)

      for (let j = 0; j < batch.length; j++) {
        const vToken = batch[j] as `0x${string}`
        const symbol = ok(res[j * 3])
        const market = ok(res[j * 3 + 2]) as readonly [boolean, bigint, boolean] | null
        if (!market) throw new Error(`markets(${vToken}) did not answer`)
        const underlying = underlyings[j] ?? null
        out.push({
          symbol: typeof symbol === 'string' && symbol !== '' ? symbol : vToken,
          vToken,
          // No token contract exists behind vBNB, so naming one would be an invented address.
          underlying: underlying ?? 'native',
          underlyingDecimals: underlying === null ? bsc.nativeCurrency.decimals : decimalsFor(underlying),
          collateralFactor: Number(market[1]) / 1e18,
        })
      }
    }
    return out
  })
}

/**
 * decimals() for every underlying in one call, keyed lowercase because getAllMarkets and
 * underlying() do not agree on checksum casing. A listed market whose decimals() does not answer
 * throws rather than defaulting to 18: lib/constants.ts makes the on-chain value the source of
 * truth exactly because a guess here is wrong by orders of magnitude, not by a rounding error.
 */
async function readDecimals(
  c: PublicClient,
  underlyings: readonly (`0x${string}` | null)[],
): Promise<(token: `0x${string}`) => number> {
  const wanted = [...new Set(underlyings.filter((u): u is `0x${string}` => u !== null))]
  const table = new Map<string, number>()
  if (wanted.length > 0) {
    const res = (await c.multicall({
      contracts: wanted.map((u) => ({ address: u, abi: ERC20_ABI, functionName: 'decimals' })),
      allowFailure: true,
    })) as unknown as Attempt[]
    if (res.length !== wanted.length) {
      throw new Error(`multicall returned ${res.length} of ${wanted.length} calls`)
    }
    wanted.forEach((u, i) => {
      const d = ok(res[i])
      if (typeof d === 'number') table.set(u.toLowerCase(), d)
    })
  }
  return (token) => {
    const d = table.get(token.toLowerCase())
    if (d === undefined) throw new Error(`decimals() did not answer on ${token}`)
    return d
  }
}
