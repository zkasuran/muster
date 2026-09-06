/**
 * The four first-party reference agents, one per shelf.
 *
 * They exist because of a measurement, not a preference. Of 336,318 ERC-8004 identities on BSC
 * and 979 proven-payable endpoints in B402 Bazaar, the intersection is one agent, its
 * registration record is empty and it sells image generation. So the payable population in
 * rebalancing, grid trading, yield and health factor is empty, and a marketplace that only
 * indexes would ship four shelves nobody can hire from.
 * See docs/decisions/18-the-intersection-is-one-agent.md.
 *
 * Three conditions bind them, and each is enforced here rather than promised:
 *   They do real work from live chain reads. Every handler below calls a verified module and
 *   returns numbers with the block they were read at. There are no fixtures.
 *   They are payable on the same public path as any other listing, over B402, with no
 *   privileged shortcut.
 *   They are labelled ours on every row that renders, and kept out of any ranking advantage.
 */
import type { Shelf } from './types.ts'
import { readHealthFactor } from './venus.ts'
import { rankYields } from './yield.ts'
import { readPool, lpDrift, PCS_POOLS } from './pancake.ts'
import { planGrid } from './grid.ts'
import { cached } from './cache.ts'

export interface AgentInput {
  name: string
  required: boolean
  description: string
  example: string
}

export interface FirstPartyAgent {
  /** Stable slug, and the last path segment of its endpoint. */
  slug: Shelf
  name: string
  /** One line a buyer reads before paying. */
  summary: string
  /** Priced in USD1 atomic units, 18 decimals. 0.02 USD1 is 20000000000000000. */
  priceBase: string
  inputs: AgentInput[]
  /** What the paid response contains, so a buyer knows what they bought. */
  outputs: string[]
  /** The reads it performs, named, so the answer is checkable. */
  reads: string[]
  run: (params: URLSearchParams) => Promise<Record<string, unknown>>
}

const USD1_2_CENTS = '20000000000000000'
const USD1_5_CENTS = '50000000000000000'

function need(params: URLSearchParams, key: string): string {
  const v = params.get(key)
  if (v === null || v.trim() === '') throw new BadRequest(`missing required parameter: ${key}`)
  return v.trim()
}

export class BadRequest extends Error {}

export const FIRST_PARTY: readonly FirstPartyAgent[] = [
  {
    slug: 'health-factor',
    name: 'Venus Health Factor Watch',
    summary:
      'Reads a borrower position on Venus and returns the health factor, the weighted collateral behind it and the uniform price fall that would liquidate it.',
    priceBase: USD1_2_CENTS,
    inputs: [
      {
        name: 'account',
        required: true,
        description: 'the borrower address to inspect',
        example: '0xed87331DcAe2ed002c42EdD102fEf91bd2BdB0bE',
      },
    ],
    outputs: [
      'healthFactor, or null when the account carries no borrow',
      'totalCollateralUsd weighted by each market liquidation threshold',
      'per-market rows with the threshold used, so the weighting reconciles',
      'priceDropToLiquidationPct',
      'the block every number was read at',
    ],
    reads: [
      'Venus Comptroller getAssetsIn and getAccountLiquidity',
      'per vToken exchangeRateStored, balanceOfUnderlying and borrowBalanceStored',
      'the Venus oracle price per underlying',
    ],
    async run(params) {
      const account = need(params, 'account')
      if (!/^0x[0-9a-fA-F]{40}$/.test(account)) throw new BadRequest('account is not an address')
      const r = await readHealthFactor(account)
      return {
        account: r.account,
        healthFactor: r.healthFactor,
        verdict:
          r.healthFactor === null
            ? 'no borrow, so no liquidation risk'
            : r.healthFactor < 1
              ? 'liquidatable now'
              : r.healthFactor < 1.1
                ? 'critical, under 1.1'
                : r.healthFactor < 1.5
                  ? 'thin, under 1.5'
                  : 'comfortable',
        totalCollateralUsd: r.totalCollateralUsd,
        totalBorrowUsd: r.totalBorrowUsd,
        liquidityUsd: r.liquidityUsd,
        shortfallUsd: r.shortfallUsd,
        priceDropToLiquidationPct: r.priceDropToLiquidationPct,
        markets: r.markets.filter((m) => m.suppliedUsd > 0 || m.borrowedUsd > 0),
        formula: r.formula,
        atBlock: r.atBlock,
        readAt: r.readAt,
      }
    },
  },
  {
    slug: 'yield',
    name: 'BSC Yield Router',
    summary:
      'Ranks live supply yields on BSC from on-chain rate reads, and names the exact call behind every number so the answer can be re-derived.',
    priceBase: USD1_2_CENTS,
    inputs: [
      {
        name: 'limit',
        required: false,
        description: 'how many ranked rows to return, 1 to 20, default 8',
        example: '5',
      },
    ],
    outputs: [
      'rows ranked by APY, highest first',
      'apy as a percentage, or null where it could not be computed',
      'the source call for each row',
      'the block and the read timestamp',
    ],
    reads: [
      'Venus vToken supplyRatePerBlock, compounded at the measured BSC block time',
      'Venus market metadata for the asset and its decimals',
    ],
    async run(params) {
      const raw = params.get('limit')
      const limit = raw === null ? 8 : Number(raw)
      if (!Number.isFinite(limit) || limit < 1 || limit > 20) {
        throw new BadRequest('limit must be a number between 1 and 20')
      }
      // 22.7 seconds cold, because it walks every Venus market. The ceiling here is the one
      // docs/15-SYSTEM.md section 3.5 already sets for a rate field, so a cached row is still
      // served with the block and timestamp it was actually read at.
      const all = await cached('yield.rank', 60, () => rankYields(20))
      const rows = all.slice(0, limit)
      return {
        rows,
        note:
          'APY is derived from the per-block supply rate compounded at the measured BSC block ' +
          'time. It is the rate at the block shown and not a forecast.',
        count: rows.length,
        readAt: Date.now(),
      }
    },
  },
  {
    slug: 'rebalancing',
    name: 'PancakeSwap LP Range Check',
    summary:
      'Reads a live PancakeSwap v3 pool and reports whether a range is still in range, how far the price is from each bound and whether to hold, widen or recentre.',
    priceBase: USD1_2_CENTS,
    inputs: [
      {
        name: 'pool',
        required: false,
        description: 'a PancakeSwap v3 pool address, default the WBNB/USDT 0.01% pool',
        example: PCS_POOLS[0]?.pool ?? '',
      },
      { name: 'lowerTick', required: false, description: 'the lower tick of your position', example: '-67000' },
      { name: 'upperTick', required: false, description: 'the upper tick of your position', example: '-65800' },
    ],
    outputs: [
      'pool state: tick, fee, liquidity and the human price',
      'inRange, plus the distance to each bound as a percentage',
      'a recommendation of hold, widen or recentre with the reason',
      'the block every number was read at',
    ],
    reads: ['PancakeSwap v3 pool slot0, liquidity, fee, tickSpacing, token0 and token1', 'ERC-20 symbol and decimals for both tokens'],
    async run(params) {
      const pool = params.get('pool') ?? PCS_POOLS[0]?.pool
      if (!pool || !/^0x[0-9a-fA-F]{40}$/.test(pool)) throw new BadRequest('pool is not an address')
      const state = await readPool(pool)
      const lower = params.get('lowerTick') ? Number(params.get('lowerTick')) : state.tick - 600
      const upper = params.get('upperTick') ? Number(params.get('upperTick')) : state.tick + 600
      if (!Number.isInteger(lower) || !Number.isInteger(upper) || lower >= upper) {
        throw new BadRequest('lowerTick and upperTick must be integers with lowerTick below upperTick')
      }
      const drift = await lpDrift(pool, lower, upper)
      return { pool: state, position: { lowerTick: lower, upperTick: upper }, drift, readAt: Date.now() }
    },
  },
  {
    slug: 'grid-trading',
    name: 'Grid Ladder Planner',
    summary:
      'Builds a geometric grid around a live pool price: the level ladder, the capital each side needs and what to do on a breakout.',
    priceBase: USD1_5_CENTS,
    inputs: [
      { name: 'pool', required: false, description: 'a PancakeSwap v3 pool address', example: PCS_POOLS[0]?.pool ?? '' },
      { name: 'lowerPct', required: false, description: 'how far below the mark the grid starts, default 10', example: '8' },
      { name: 'upperPct', required: false, description: 'how far above the mark the grid ends, default 10', example: '12' },
      { name: 'levels', required: false, description: 'number of levels, 2 to 50, default 8', example: '10' },
      { name: 'capital', required: false, description: 'quote-token capital to deploy, default 1000', example: '2500' },
    ],
    outputs: [
      'the level ladder with price, side and size per level',
      'spacing as a percentage, geometric rather than arithmetic',
      'capital required on each side',
      'the breakout rule in words',
      'warnings for any input that was refused',
    ],
    reads: ['PancakeSwap v3 pool slot0 for the mark price', 'ERC-20 symbol and decimals for both tokens'],
    async run(params) {
      const pool = params.get('pool') ?? PCS_POOLS[0]?.pool
      if (!pool || !/^0x[0-9a-fA-F]{40}$/.test(pool)) throw new BadRequest('pool is not an address')
      const n = (k: string, d: number) => (params.get(k) === null ? d : Number(params.get(k)))
      const plan = await planGrid({
        pool,
        lowerPct: n('lowerPct', 10),
        upperPct: n('upperPct', 10),
        levelCount: n('levels', 8),
        capitalQuote: n('capital', 1000),
      })
      return { plan, readAt: Date.now() }
    },
  },
] as const

export function findAgent(slug: string): FirstPartyAgent | null {
  return FIRST_PARTY.find((a) => a.slug === slug) ?? null
}
