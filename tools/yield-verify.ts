/**
 * Scratch verification for lib/yield.ts. Not part of the app. Proves, live:
 *   1. the measured BSC block time and the blocks-per-day it implies
 *   2. every curated vToken is still listed by the Venus core comptroller
 *   3. the Venus supply-rate identity U * borrowRate * (1 - reserveFactor) to the wei
 *   4. the decimals-free TVL formula against a decimals-aware recompute
 *   5. our 365-day annualisation against Venus's own published supplyApy
 */
import { parseAbi } from 'viem'
import { withRpc } from '../lib/rpc.ts'

const COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384' as const
const ORACLE = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A' as const

const VTOKENS = [
  '0xfD5840Cd36d94D7229439859C0112a4185BC0255',
  '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8',
  '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B',
  '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8',
  '0x6bCa74586218dB34cdB402295796b79663d816e9',
  '0x86aC3974e2BD0d60825230fa6F355fF11409df5c',
  '0x3d5E269787d562b74aCC55F18Bd26C5D09Fa245E',
  '0xA07c5b74C9B40447a954e1466938b865b6BBea36',
] as const

const V = parseAbi([
  'function supplyRatePerBlock() view returns (uint256)',
  'function borrowRatePerBlock() view returns (uint256)',
  'function getCash() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function totalReserves() view returns (uint256)',
  'function reserveFactorMantissa() view returns (uint256)',
  'function accrualBlockNumber() view returns (uint256)',
  'function symbol() view returns (string)',
  'function underlying() view returns (address)',
  'function decimals() view returns (uint8)',
])
const C = parseAbi(['function getAllMarkets() view returns (address[])'])
const O = parseAbi(['function getUnderlyingPrice(address) view returns (uint256)'])

const WAD = 10n ** 18n

async function main() {
  await withRpc(async (c, url) => {
    const tip = await c.getBlockNumber()
    const [bNow, bOld, bNear] = await Promise.all([
      c.getBlock({ blockNumber: tip }),
      c.getBlock({ blockNumber: tip - 100_000n }),
      c.getBlock({ blockNumber: tip - 1_000n }),
    ])
    const wide = Number(bNow.timestamp - bOld.timestamp) / 100_000
    const near = Number(bNow.timestamp - bNear.timestamp) / 1_000
    console.log(`rpc ${url}  tip ${tip}`)
    console.log(`block time  100000-span ${wide.toFixed(5)}s   1000-span ${near.toFixed(5)}s`)
    console.log(`blocks/day  ${(86_400 / wide).toFixed(1)}   blocks/year ${(31_536_000 / wide).toFixed(0)}   Venus config 70080000`)

    const listed = (await c.readContract({
      address: COMPTROLLER,
      abi: C,
      functionName: 'getAllMarkets',
      blockNumber: tip,
    })) as readonly string[]
    const set = new Set(listed.map((a) => a.toLowerCase()))
    console.log(`getAllMarkets -> ${listed.length} markets; curated all listed: ${VTOKENS.every((v) => set.has(v.toLowerCase()))}`)

    const calls = VTOKENS.flatMap((v) => [
      { address: v, abi: V, functionName: 'supplyRatePerBlock' } as const,
      { address: v, abi: V, functionName: 'borrowRatePerBlock' } as const,
      { address: v, abi: V, functionName: 'getCash' } as const,
      { address: v, abi: V, functionName: 'totalBorrows' } as const,
      { address: v, abi: V, functionName: 'totalReserves' } as const,
      { address: v, abi: V, functionName: 'reserveFactorMantissa' } as const,
      { address: v, abi: V, functionName: 'accrualBlockNumber' } as const,
      { address: v, abi: V, functionName: 'underlying' } as const,
      { address: ORACLE, abi: O, functionName: 'getUnderlyingPrice', args: [v] } as const,
    ])
    const r = await c.multicall({ contracts: calls, allowFailure: true, blockNumber: tip })
    console.log(`multicall asked ${calls.length} got ${r.length}  match=${r.length === calls.length}`)

    const n = (i: number) => (r[i]?.status === 'success' ? (r[i]!.result as bigint) : null)

    for (let k = 0; k < VTOKENS.length; k++) {
      const b = k * 9
      const [sr, br, cash, borrows, reserves, rf] = [n(b), n(b + 1), n(b + 2), n(b + 3), n(b + 4), n(b + 5)]
      const accrual = n(b + 6)
      const und = r[b + 7]?.status === 'success' ? String(r[b + 7]!.result) : null
      const price = n(b + 8)
      if (sr === null || br === null || cash === null || borrows === null || reserves === null || rf === null || price === null) {
        console.log(`${VTOKENS[k]} INCOMPLETE`)
        continue
      }
      const supplied = cash + borrows - reserves
      const u = supplied === 0n ? 0n : (borrows * WAD) / supplied
      const rateToPool = (br * (WAD - rf)) / WAD
      const identity = (u * rateToPool) / WAD
      const tvlFree = Number(supplied * price) / 1e36

      let dec: number | null = null
      let sym = 'native'
      if (und) {
        const [d, s] = await Promise.all([
          c.readContract({ address: und as `0x${string}`, abi: V, functionName: 'decimals', blockNumber: tip }),
          c.readContract({ address: und as `0x${string}`, abi: V, functionName: 'symbol', blockNumber: tip }),
        ])
        dec = Number(d)
        sym = String(s)
      }
      const tvlAware =
        dec === null ? null : (Number(supplied) / 10 ** dec) * (Number(price) / 10 ** (36 - dec))
      const perDay = 86_400 / wide
      const apy365 = ((1 + Number(sr) / 1e18 * perDay) ** 365 - 1) * 100
      const apyVenus = ((1 + Number(sr) / 1e18 * 192_000) ** 364 - 1) * 100
      console.log(
        `${sym.padEnd(8)} ${VTOKENS[k]} accrual=${accrual} lag=${tip - (accrual ?? 0n)}\n` +
          `  sr=${sr} br=${br} rf=${rf} U=${u}\n` +
          `  identity ${identity} ${identity === sr ? 'EXACT' : `OFF by ${identity - sr}`}\n` +
          `  apy365=${apy365.toFixed(6)}%  apyVenus364=${apyVenus.toFixed(6)}%  diff=${(apy365 - apyVenus).toFixed(6)}pp\n` +
          `  tvl decimals-free ${tvlFree.toFixed(2)}  decimals-aware ${tvlAware === null ? 'n/a' : tvlAware.toFixed(2)}  dec=${dec}  unitPrice=${dec === null ? 'n/a' : (Number(price) / 10 ** (36 - dec)).toFixed(6)}  underlying=${und}`,
      )
    }
    return null
  })

  const res = await fetch('https://api.venus.io/markets/core-pool?chainId=56&limit=60&page=0')
  const j = (await res.json()) as { result?: { address: string; symbol: string; supplyApy: string; borrowApy: string }[] }
  const mk = j.result ?? []
  console.log(`\napi.venus.io returned ${mk.length} markets`)
  for (const v of VTOKENS) {
    const m = mk.find((x) => x.address.toLowerCase() === v.toLowerCase())
    if (m) console.log(`  ${m.symbol.padEnd(8)} supplyApy=${m.supplyApy} borrowApy=${m.borrowApy}`)
  }
}

await main()
