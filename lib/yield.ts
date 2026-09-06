/**
 * Real yields on BSC, recomputed from calls this module made. Nothing here is copied from an
 * aggregator. Every row carries the call it came from so the UI can cite it and a reader can
 * re-derive the number. The verification is docs/research/R09-bsc-defi.md.
 *
 * Four facts shape the file:
 *   Venus quotes rates per block, so annualising needs the real cadence. BSC blocks land
 *   0.45 s apart now, not the 3 s older integrations assume, so the cadence is measured on
 *   every read instead of taken from a constant.
 *   `getUnderlyingPrice(vToken)` returns USD scaled `1e(36 - underlyingDecimals)`. A balance
 *   in base units times that price, divided by 1e36, is USD with the decimals cancelled,
 *   which is why nothing below reads `decimals()` to scale a number.
 *   One wrong EIP-55 checksum makes every entry in a multicall batch fail, not just its own,
 *   so each address here was passed through `cast to-check-sum-address`. Two of the addresses
 *   transcribed out of the research notes were wrong that way.
 *   Public BSC RPC has no archive, so nothing is pinned further back than the tip and log
 *   windows stay inside the measured `MAX_LOG_SPAN`.
 */
import { parseAbi, decodeAbiParameters, type Address, type PublicClient } from 'viem'
import { withRpc, MAX_LOG_SPAN } from './rpc.ts'
import { TOKENS } from './constants.ts'

export type YieldKind = 'supply' | 'borrow' | 'lp-fee' | 'stake'

export interface YieldRow {
  venue: string
  asset: string
  assetAddress: string
  kind: YieldKind
  /** Percent, e.g. 4.21. null when it cannot be computed, which renders as unknown. */
  apy: number | null
  tvlUsd: number | null
  /** The exact call, with the raw integer where there is one, so the row can be re-derived. */
  source: string
  readAt: number
  atBlock: number | null
}

const VENUS_COMPTROLLER: Address = '0xfD36E2c2a6789Db23113685031d7F16329158384'
/** Venus ResilientOracle. It prices all 55 core markets, which is the only free USD feed here. */
const VENUS_ORACLE: Address = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A'

/**
 * The core markets we publish, biggest first. Symbols and underlyings are read live, so these
 * comments are orientation rather than data.
 *
 * vBNB is deliberately absent. Its underlying is native BNB, so there is no token contract and
 * no `assetAddress` a row could cite. vWBNB is the same asset wrapped, it carries a real address
 * and its rate tracks vBNB within a hundredth of a point.
 */
const VENUS_MARKETS: readonly Address[] = [
  '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B', // vBTC
  '0xfD5840Cd36d94D7229439859C0112a4185BC0255', // vUSDT
  '0x6bCa74586218dB34cdB402295796b79663d816e9', // vWBNB
  '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8', // vUSDC
  '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8', // vETH
  '0x86aC3974e2BD0d60825230fa6F355fF11409df5c', // vCAKE
  '0x3d5E269787d562b74aCC55F18Bd26C5D09Fa245E', // vU
]

/**
 * Where a market's underlying is already verified in lib/constants.ts, the live `underlying()`
 * is checked against it. A market mislabelled at this layer would publish the wrong asset's
 * APY. That is the failure hardest to catch by eye further downstream.
 */
const EXPECTED_UNDERLYING: Readonly<Record<string, string>> = {
  '0xfd5840cd36d94d7229439859c0112a4185bc0255': TOKENS.USDT.address,
  '0xeca88125a5adbe82614ffc12d0db554e2e2867c8': TOKENS.USDC.address,
  '0x3d5e269787d562b74acc55f18bd26c5d09fa245e': TOKENS.U.address,
}

/**
 * PancakeSwap v3 pools measured from their own Swap logs. Both legs of each pool are priced by
 * the Venus oracle, so fee income and TVL share one price source and one block.
 */
const PCS_V3_POOLS: readonly Address[] = [
  '0x172fcD41E0913e95784454622d1c3724f546f849', // USDT / WBNB, 0.01 percent tier
  '0xD0e226f674bBf064f54aB47F42473fF80DB98CBA', // ETH / WBNB, 0.05 percent tier
  '0x46Cf1cF8c69595804ba91dFdd8d6b960c9B0a7C4', // USDT / BTCB, 0.05 percent tier
]

/** PancakeSwap v3 Swap. Seven non-indexed words, the last two being this swap's protocol fee. */
const SWAP_TOPIC = '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83'
const SWAP_ARGS = [
  { type: 'int256' },
  { type: 'int256' },
  { type: 'uint160' },
  { type: 'uint128' },
  { type: 'int24' },
  { type: 'uint128' },
  { type: 'uint128' },
] as const

const VTOKEN_ABI = parseAbi([
  'function supplyRatePerBlock() view returns (uint256)',
  'function getCash() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function totalReserves() view returns (uint256)',
  'function underlying() view returns (address)',
])
const ERC20_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
])
const COMPTROLLER_ABI = parseAbi(['function getAllMarkets() view returns (address[])'])
const ORACLE_ABI = parseAbi(['function getUnderlyingPrice(address) view returns (uint256)'])
const POOL_ABI = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, uint8 unlocked)',
  'function fee() view returns (uint24)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
])

/** The 1e36 that cancels the oracle's `1e(36 - decimals)` scaling against a base-unit balance. */
const PRICE_BALANCE_SCALE = 1e36
const SECONDS_PER_YEAR = 31_536_000
/** Wide enough that BSC's per-block jitter averages out. Two headers, so no archive request. */
const BLOCK_TIME_SPAN = 100_000n
/** v3 fee tiers are hundredths of a basis point. The protocol share denominator is 10000. */
const FEE_TIER_SCALE = 1_000_000n
const PROTOCOL_FEE_DENOM = 10_000

/** Narrowed by hand because a heterogeneous multicall batch defeats viem's result inference. */
type CallResult = { status: 'success'; result: unknown } | { status: 'failure'; error: unknown }

/**
 * Measured seconds per block. Block headers are not archive state, so a public node serves an
 * old one even though it refuses `eth_call` at the same height.
 */
async function measureBlockSeconds(c: PublicClient, tip: bigint): Promise<number> {
  const [now, then] = await Promise.all([
    c.getBlock({ blockNumber: tip }),
    c.getBlock({ blockNumber: tip - BLOCK_TIME_SPAN }),
  ])
  return Number(now.timestamp - then.timestamp) / Number(BLOCK_TIME_SPAN)
}

/**
 * Daily compounding of a per-block rate, which is the convention Venus and Compound publish:
 *
 *     apy = ((1 + ratePerBlock / 1e18 * blocksPerDay) ^ 365 - 1) * 100
 *
 * `blocksPerDay` comes from the measured cadence, so the number moves with the chain instead of
 * with a hardcoded 192000. Venus's own site raises the same base to 364 rather than 365, an
 * off-by-one it inherited from the Compound v2 docs, which is why our figure sits a few
 * thousandths of a point above theirs on a busy market. tools/yield-gate.ts shows both.
 */
function compoundDaily(ratePerBlock: bigint, blocksPerDay: number): number {
  return ((1 + (Number(ratePerBlock) / 1e18) * blocksPerDay) ** 365 - 1) * 100
}

interface VenusRead {
  rows: YieldRow[]
  /** Underlying token, lowercased, to its vToken. Anything Venus lists can then be priced. */
  vTokenFor: Map<string, Address>
}

/** Per market: supply rate, cash, borrows, reserves, underlying, price. */
const VENUS_CALLS_PER_MARKET = 6

async function readVenusCore(): Promise<VenusRead> {
  return withRpc(async (c) => {
    const tip = await c.getBlockNumber()
    const secondsPerBlock = await measureBlockSeconds(c, tip)
    const blocksPerDay = 86_400 / secondsPerBlock

    const listed = await c.readContract({
      address: VENUS_COMPTROLLER,
      abi: COMPTROLLER_ABI,
      functionName: 'getAllMarkets',
      blockNumber: tip,
    })
    // A delisted market keeps answering supplyRatePerBlock, so membership is read, not assumed.
    const live = new Set(listed.map((a) => a.toLowerCase()))
    const markets = VENUS_MARKETS.filter((v) => live.has(v.toLowerCase()))
    if (markets.length === 0) throw new Error('no curated Venus market is listed on the comptroller')

    const calls = markets.flatMap((v) => [
      { address: v, abi: VTOKEN_ABI, functionName: 'supplyRatePerBlock' },
      { address: v, abi: VTOKEN_ABI, functionName: 'getCash' },
      { address: v, abi: VTOKEN_ABI, functionName: 'totalBorrows' },
      { address: v, abi: VTOKEN_ABI, functionName: 'totalReserves' },
      { address: v, abi: VTOKEN_ABI, functionName: 'underlying' },
      { address: VENUS_ORACLE, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v] },
    ])
    const res = (await c.multicall({
      contracts: calls,
      allowFailure: true,
      blockNumber: tip,
    })) as CallResult[]
    // Multicall3 drops entries rather than erroring when a batch overruns, so the count is checked.
    if (res.length !== calls.length) {
      throw new Error(`multicall returned ${res.length} entries for ${calls.length} calls`)
    }
    const int = (i: number): bigint | null => {
      const r = res[i]
      return r && r.status === 'success' ? (r.result as bigint) : null
    }
    const text = (i: number): string | null => {
      const r = res[i]
      return r && r.status === 'success' ? String(r.result) : null
    }

    const underlyings = markets.map((v, k) => text(k * VENUS_CALLS_PER_MARKET + 4))
    for (let k = 0; k < markets.length; k++) {
      const market = markets[k]
      const und = underlyings[k]
      const expected = market ? EXPECTED_UNDERLYING[market.toLowerCase()] : undefined
      if (expected && und && und.toLowerCase() !== expected.toLowerCase()) {
        throw new Error(`${market} underlying is ${und}, lib/constants.ts says ${expected}`)
      }
    }

    // Strings go in their own small batch, because a batch mixing them with numbers is the shape
    // that overruns Multicall3. A dropped symbol would silently relabel a row.
    const known = underlyings.filter((u): u is string => u !== null)
    const symCalls = known.map((u) => ({ address: u as Address, abi: ERC20_ABI, functionName: 'symbol' }))
    const symRes = (await c.multicall({
      contracts: symCalls,
      allowFailure: true,
      blockNumber: tip,
    })) as CallResult[]
    if (symRes.length !== symCalls.length) {
      throw new Error(`symbol multicall returned ${symRes.length} of ${symCalls.length}`)
    }
    const symbolOf = new Map<string, string>()
    known.forEach((u, i) => {
      const r = symRes[i]
      if (r && r.status === 'success') symbolOf.set(u.toLowerCase(), String(r.result))
    })

    const readAt = Date.now()
    const atBlock = Number(tip)
    const vTokenFor = new Map<string, Address>()
    const rows: YieldRow[] = []

    for (let k = 0; k < markets.length; k++) {
      const market = markets[k]
      const und = underlyings[k]
      if (!market || !und) continue
      vTokenFor.set(und.toLowerCase(), market)

      const b = k * VENUS_CALLS_PER_MARKET
      const rate = int(b)
      const cash = int(b + 1)
      const borrows = int(b + 2)
      const reserves = int(b + 3)
      const price = int(b + 5)

      // Supplied underlying is the protocol's own definition: lender-owned cash plus what is out
      // on loan, less the reserves the protocol has taken for itself.
      const supplied =
        cash !== null && borrows !== null && reserves !== null ? cash + borrows - reserves : null
      const tvlUsd =
        supplied !== null && price !== null
          ? Number(supplied * price) / PRICE_BALANCE_SCALE
          : null

      rows.push({
        venue: 'Venus',
        asset: symbolOf.get(und.toLowerCase()) ?? und,
        assetAddress: und,
        kind: 'supply',
        apy: rate === null ? null : compoundDaily(rate, blocksPerDay),
        tvlUsd,
        source:
          `Venus core ${market}.supplyRatePerBlock()=${rate ?? 'unavailable'} at block ${atBlock}, ` +
          `compounded daily over ${blocksPerDay.toFixed(1)} blocks/day measured at ` +
          `${secondsPerBlock.toFixed(5)} s/block. TVL from getCash()+totalBorrows()-totalReserves() ` +
          `priced by ResilientOracle ${VENUS_ORACLE}`,
        readAt,
        atBlock,
      })
    }
    return { rows, vTokenFor }
  })
}

/**
 * Venus supply APYs for the curated core markets, each one recomputed from that market's own
 * `supplyRatePerBlock` at a single pinned block.
 */
export async function readVenusSupplyApys(): Promise<YieldRow[]> {
  return (await readVenusCore()).rows
}

/**
 * Fee yield for a concentrated-liquidity pool, measured from the Swap logs of the last
 * `MAX_LOG_SPAN` blocks. That is about 37 minutes on BSC and the widest window a free endpoint
 * will serve, so the row states its window rather than pretending to a 24 hour figure.
 *
 * Two things this number is not. It is gross of nothing except the protocol's own cut, which is
 * subtracted from the on-chain `feeProtocol` rather than guessed, so it is LP fee income and not
 * the headline most dashboards print. And it divides by the pool's whole balance, which includes
 * liquidity parked out of range earning nothing, so a single position's realised rate is at or
 * below this. The annualisation is simple rather than compounded, because v3 fees sit uncollected
 * until an LP takes them out.
 */
async function readPancakeLpFees(vTokenFor: Map<string, Address>): Promise<YieldRow[]> {
  return withRpc(async (c) => {
    const tip = await c.getBlockNumber()
    const from = tip - BigInt(MAX_LOG_SPAN)
    const [head, tail] = await Promise.all([
      c.getBlock({ blockNumber: from }),
      c.getBlock({ blockNumber: tip }),
    ])
    const windowSeconds = Number(tail.timestamp - head.timestamp)
    if (windowSeconds <= 0) throw new Error(`log window measured ${windowSeconds} s`)
    const readAt = Date.now()
    const atBlock = Number(tip)
    const rows: YieldRow[] = []

    // Sequential per pool. The public endpoints are shared infrastructure and each pool costs a
    // multi-thousand-entry log response.
    for (const pool of PCS_V3_POOLS) {
      const meta = (await c.multicall({
        contracts: [
          { address: pool, abi: POOL_ABI, functionName: 'slot0' },
          { address: pool, abi: POOL_ABI, functionName: 'fee' },
          { address: pool, abi: POOL_ABI, functionName: 'token0' },
          { address: pool, abi: POOL_ABI, functionName: 'token1' },
        ],
        allowFailure: false,
        blockNumber: tip,
      })) as unknown[]
      const slot0 = meta[0] as readonly unknown[]
      const feeTier = BigInt(meta[1] as number)
      const token0 = meta[2] as Address
      const token1 = meta[3] as Address
      // feeProtocol packs one share per direction, low 16 bits then high 16. Both have been equal
      // on every pool checked. The measured share below is what proves the decode.
      const protocolShare = Number(slot0[5] ?? 0) & 0xffff

      const v0 = vTokenFor.get(token0.toLowerCase())
      const v1 = vTokenFor.get(token1.toLowerCase())
      const priced = v0 !== undefined && v1 !== undefined

      const state = (await c.multicall({
        contracts: [
          { address: token0, abi: ERC20_ABI, functionName: 'balanceOf', args: [pool] },
          { address: token1, abi: ERC20_ABI, functionName: 'balanceOf', args: [pool] },
          { address: token0, abi: ERC20_ABI, functionName: 'symbol' },
          { address: token1, abi: ERC20_ABI, functionName: 'symbol' },
        ],
        allowFailure: false,
        blockNumber: tip,
      })) as unknown[]
      const bal0 = state[0] as bigint
      const bal1 = state[1] as bigint
      const pair = `${String(state[2])}/${String(state[3])}`

      let price0 = 0n
      let price1 = 0n
      if (priced) {
        const quotes = (await c.multicall({
          contracts: [
            { address: VENUS_ORACLE, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v0] },
            { address: VENUS_ORACLE, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v1] },
          ],
          allowFailure: false,
          blockNumber: tip,
        })) as unknown[]
        price0 = quotes[0] as bigint
        price1 = quotes[1] as bigint
      }

      const logs = await c.getLogs({ address: pool, fromBlock: from, toBlock: tip })
      let in0 = 0n
      let in1 = 0n
      let protoFee0 = 0n
      let protoFee1 = 0n
      let topSwapUsd = 0
      let swaps = 0
      for (const log of logs) {
        if (log.topics[0] !== SWAP_TOPIC) continue
        const d = decodeAbiParameters(SWAP_ARGS, log.data)
        const a0 = d[0] as bigint
        const a1 = d[1] as bigint
        swaps++
        // Positive means the token came in, so it is the leg the swapper paid the fee on.
        if (a0 > 0n) in0 += a0
        if (a1 > 0n) in1 += a1
        protoFee0 += d[5] as bigint
        protoFee1 += d[6] as bigint
        if (priced) {
          const paid = a0 > 0n ? (a0 * feeTier * price0) / FEE_TIER_SCALE : (a1 * feeTier * price1) / FEE_TIER_SCALE
          topSwapUsd = Math.max(topSwapUsd, Number(paid) / PRICE_BALANCE_SCALE)
        }
      }

      const grossFee0 = (in0 * feeTier) / FEE_TIER_SCALE
      const grossFee1 = (in1 * feeTier) / FEE_TIER_SCALE
      const grossUsd = Number(grossFee0 * price0 + grossFee1 * price1) / PRICE_BALANCE_SCALE
      const protocolUsd = Number(protoFee0 * price0 + protoFee1 * price1) / PRICE_BALANCE_SCALE
      const lpUsd = grossUsd - protocolUsd
      const tvlUsd = Number(bal0 * price0 + bal1 * price1) / PRICE_BALANCE_SCALE
      const measuredShare = grossUsd > 0 ? protocolUsd / grossUsd : null
      // Gross against gross. Comparing one swap's fee to the net figure would overstate its share
      // by whatever the protocol took.
      const topShare = grossUsd > 0 ? topSwapUsd / grossUsd : 0

      // One trade must not be the estimate. Annualising a 37 minute window is fair when the fees
      // came from a crowd and misleading when they came from a whale, so a dominated window
      // publishes no APY at all rather than a number nobody could reproduce an hour later.
      const dominated = topShare > 0.5
      const computable = priced && swaps > 0 && tvlUsd > 0 && !dominated
      const apy = computable ? ((lpUsd * (SECONDS_PER_YEAR / windowSeconds)) / tvlUsd) * 100 : null

      const withheld = !priced
        ? ' No APY: the Venus oracle does not price both legs.'
        : swaps === 0
          ? ' No APY: no swap landed in the window.'
          : dominated
            ? ` No APY: one swap carried ${(topShare * 100).toFixed(0)} percent of the window's fees.`
            : ''

      rows.push({
        venue: 'PancakeSwap v3',
        asset: pair,
        // The asset an LP holds is the pool position, so the pool is the address to cite.
        assetAddress: pool,
        kind: 'lp-fee',
        apy,
        tvlUsd: priced ? tvlUsd : null,
        source:
          `eth_getLogs Swap on ${pool}, ${swaps} swaps over ${MAX_LOG_SPAN} blocks ` +
          `(${windowSeconds} s) to block ${atBlock}. Fee tier ${feeTier} of 1e6 less protocol share ` +
          `${protocolShare}/${PROTOCOL_FEE_DENOM} from slot0, measured ` +
          `${measuredShare === null ? 'unmeasured' : measuredShare.toFixed(4)} from the logs. ` +
          `Annualised simple, since v3 fees sit uncollected rather than compounding. TVL from both ` +
          `token balances priced by ResilientOracle ${VENUS_ORACLE}.${withheld}`,
        readAt,
        atBlock,
      })
    }
    return rows
  })
}

/**
 * Every yield row we can currently measure, best first. Rows whose APY could not be computed
 * sort last and keep their null, because unknown is a fact and zero would be a claim.
 *
 * A venue that cannot be read is absent rather than present with a fabricated number. Venus is
 * the floor: if that read fails the caller gets the error, since a yield shelf with nothing on
 * it should not look like a yield shelf with nothing to offer.
 */
export async function rankYields(limit?: number): Promise<YieldRow[]> {
  const venus = await readVenusCore()
  const rows = [...venus.rows]
  try {
    rows.push(...(await readPancakeLpFees(venus.vTokenFor)))
  } catch {
    // Swallowed on purpose. The pool measurement needs a log window that only one public
    // endpoint serves. Losing it must not take the lending rows down with it.
  }
  rows.sort((a, b) => {
    if (a.apy === null && b.apy === null) return 0
    if (a.apy === null) return 1
    if (b.apy === null) return -1
    return b.apy - a.apy
  })
  return limit !== undefined && limit > 0 ? rows.slice(0, limit) : rows
}
