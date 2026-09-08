/**
 * Independent re-verification of lib/yield.ts. Scratch, not part of the app. Nothing here
 * imports the module's own constants, so a wrong address or a wrong scale factor in the
 * module cannot make this file agree with it by construction.
 */
import { createPublicClient, http, parseAbi } from 'viem'
import { bsc } from 'viem/chains'

const URLS = [
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://binance.llamarpc.com',
]
const c = createPublicClient({ chain: bsc, transport: http(URLS[0], { timeout: 60_000 }) })

const COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384' as const
const ORACLE = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A' as const
const POOLS = [
  '0x172fcD41E0913e95784454622d1c3724f546f849',
  '0xD0e226f674bBf064f54aB47F42473fF80DB98CBA',
  '0x46Cf1cF8c69595804ba91dFdd8d6b960c9B0a7C4',
] as const
const SWAP_TOPIC = '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83'

const VTOKEN = parseAbi([
  'function symbol() view returns (string)',
  'function supplyRatePerBlock() view returns (uint256)',
  'function getCash() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function totalReserves() view returns (uint256)',
  'function underlying() view returns (address)',
])
const ERC20 = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
])
const ORACLE_ABI = parseAbi(['function getUnderlyingPrice(address) view returns (uint256)'])
const POOL = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, uint8 unlocked)',
  'function fee() view returns (uint24)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
])
const COMP = parseAbi(['function getAllMarkets() view returns (address[])'])

const s24 = (x: bigint) => (x >= 1n << 23n ? x - (1n << 24n) : x)
const s256 = (x: bigint) => (x >= 1n << 255n ? x - (1n << 256n) : x)

async function endpointHeaders(tip: bigint) {
  console.log('\n=== 1. does every endpoint serve a header 100000 blocks back ===')
  for (const url of URLS) {
    const k = createPublicClient({ chain: bsc, transport: http(url, { timeout: 20_000, retryCount: 0 }) })
    try {
      const own = await k.getBlockNumber()
      const [a, b] = await Promise.all([
        k.getBlock({ blockNumber: own }),
        k.getBlock({ blockNumber: own - 100_000n }),
      ])
      const spb = Number(a.timestamp - b.timestamp) / 100_000
      console.log(`  ${url}  tip=${own}  s/block=${spb.toFixed(5)}  blocks/day=${(86_400 / spb).toFixed(0)}`)
    } catch (e) {
      console.log(`  ${url}  FAILED ${(e as Error).message.slice(0, 100)}`)
    }
  }
  const [n, t] = await Promise.all([
    c.getBlock({ blockNumber: tip }),
    c.getBlock({ blockNumber: tip - 100_000n }),
  ])
  return Number(n.timestamp - t.timestamp) / 100_000
}

async function venus(tip: bigint) {
  console.log('\n=== 2. Venus core, recomputed ===')
  const all = await c.readContract({ address: COMPTROLLER, abi: COMP, functionName: 'getAllMarkets' })
  console.log(`  getAllMarkets() -> ${all.length} markets`)
  const priced = await c.multicall({
    contracts: all.map((v) => ({ address: ORACLE, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v] as const })),
    allowFailure: true,
    blockNumber: tip,
  })
  const zero = priced.filter((r) => r.status !== 'success' || r.result === 0n).length
  console.log(`  oracle prices ${all.length - zero} of ${all.length}, unpriced ${zero}`)
  return all
}

const CURATED = [
  '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B',
  '0xfD5840Cd36d94D7229439859C0112a4185BC0255',
  '0x6bCa74586218dB34cdB402295796b79663d816e9',
  '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8',
  '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8',
  '0x86aC3974e2BD0d60825230fa6F355fF11409df5c',
  '0x3d5E269787d562b74aCC55F18Bd26C5D09Fa245E',
] as const

async function venusRows(tip: bigint, blocksPerDay: number) {
  const out: { sym: string; rate: bigint; apy365: number; apy364: number; apr: number; tvl: number; dec: number }[] = []
  for (const v of CURATED) {
    const [sym, rate, cash, borrows, reserves, und] = await Promise.all([
      c.readContract({ address: v, abi: VTOKEN, functionName: 'symbol', blockNumber: tip }),
      c.readContract({ address: v, abi: VTOKEN, functionName: 'supplyRatePerBlock', blockNumber: tip }),
      c.readContract({ address: v, abi: VTOKEN, functionName: 'getCash', blockNumber: tip }),
      c.readContract({ address: v, abi: VTOKEN, functionName: 'totalBorrows', blockNumber: tip }),
      c.readContract({ address: v, abi: VTOKEN, functionName: 'totalReserves', blockNumber: tip }),
      c.readContract({ address: v, abi: VTOKEN, functionName: 'underlying', blockNumber: tip }),
    ])
    const [dec, price] = await Promise.all([
      c.readContract({ address: und, abi: ERC20, functionName: 'decimals', blockNumber: tip }),
      c.readContract({ address: ORACLE, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v], blockNumber: tip }),
    ])
    const daily = (Number(rate) / 1e18) * blocksPerDay
    const supplied = cash + borrows - reserves
    out.push({
      sym,
      rate,
      apr: daily * 365 * 100,
      apy365: ((1 + daily) ** 365 - 1) * 100,
      apy364: ((1 + daily) ** 364 - 1) * 100,
      tvl: Number(supplied * price) / 1e36,
      dec,
    })
  }
  console.log(`  market   rate/block        APR%      APY^365    APY^364    tvlUsd`)
  for (const r of out) {
    console.log(
      `  ${r.sym.padEnd(7)} ${String(r.rate).padStart(12)}  ${r.apr.toFixed(4).padStart(9)}  ${r.apy365.toFixed(4).padStart(9)}  ${r.apy364.toFixed(4).padStart(9)}  ${Math.round(r.tvl).toLocaleString('en-US').padStart(14)}  dec=${r.dec}`,
    )
  }
  return out
}

async function pools(tip: bigint) {
  console.log('\n=== 3. PancakeSwap v3 pools, recomputed from logs ===')
  const from = tip - 5000n
  const [head, tail] = await Promise.all([c.getBlock({ blockNumber: from }), c.getBlock({ blockNumber: tip })])
  const windowSeconds = Number(tail.timestamp - head.timestamp)
  console.log(`  window ${from}..${tip} = ${windowSeconds} s, annualiser ${(31_536_000 / windowSeconds).toFixed(1)}x`)

  for (const pool of POOLS) {
    const [slot0, fee, t0, t1] = await Promise.all([
      c.readContract({ address: pool, abi: POOL, functionName: 'slot0', blockNumber: tip }),
      c.readContract({ address: pool, abi: POOL, functionName: 'fee', blockNumber: tip }),
      c.readContract({ address: pool, abi: POOL, functionName: 'token0', blockNumber: tip }),
      c.readContract({ address: pool, abi: POOL, functionName: 'token1', blockNumber: tip }),
    ])
    const sqrtP = slot0[0]
    const tick = slot0[1]
    const feeProtocol = slot0[5]
    // sqrtPriceX96 and tick come out of the same struct, so 1.0001^tick against
    // (sqrtP/2^96)^2 proves the ABI decoded the right words.
    const fromSqrt = (Number(sqrtP) / 2 ** 96) ** 2
    const fromTick = 1.0001 ** tick
    const [s0, s1, d0, d1, b0, b1] = await Promise.all([
      c.readContract({ address: t0, abi: ERC20, functionName: 'symbol' }),
      c.readContract({ address: t1, abi: ERC20, functionName: 'symbol' }),
      c.readContract({ address: t0, abi: ERC20, functionName: 'decimals' }),
      c.readContract({ address: t1, abi: ERC20, functionName: 'decimals' }),
      c.readContract({ address: t0, abi: ERC20, functionName: 'balanceOf', args: [pool], blockNumber: tip }),
      c.readContract({ address: t1, abi: ERC20, functionName: 'balanceOf', args: [pool], blockNumber: tip }),
    ])
    console.log(`\n  ${pool}  ${s0}/${s1}  fee=${fee}  feeProtocol=${feeProtocol} low16=${Number(feeProtocol) & 0xffff} high16=${Number(feeProtocol) >> 16}`)
    console.log(`    tick=${tick}  1.0001^tick=${fromTick.toExponential(6)}  (sqrtP/2^96)^2=${fromSqrt.toExponential(6)}  ratio=${(fromTick / fromSqrt).toFixed(6)}  dec ${d0}/${d1}`)

    const vFor: Record<string, `0x${string}`> = {
      '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B',
      '0x55d398326f99059ff775485246999027b3197955': '0xfD5840Cd36d94D7229439859C0112a4185BC0255',
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': '0x6bCa74586218dB34cdB402295796b79663d816e9',
      '0x2170ed0880ac9a755fd29b2688956bd959f933f8': '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8',
    }
    const v0 = vFor[t0.toLowerCase()]
    const v1 = vFor[t1.toLowerCase()]
    if (!v0 || !v1) {
      console.log('    not priced by Venus, skipping')
      continue
    }
    const [p0, p1] = await Promise.all([
      c.readContract({ address: ORACLE, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v0], blockNumber: tip }),
      c.readContract({ address: ORACLE, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v1], blockNumber: tip }),
    ])

    const logs = await c.getLogs({ address: pool, fromBlock: from, toBlock: tip })
    let in0 = 0n
    let in1 = 0n
    let pf0 = 0n
    let pf1 = 0n
    let swaps = 0
    let topUsd = 0
    for (const log of logs) {
      if (log.topics[0] !== SWAP_TOPIC) continue
      const raw = log.data.slice(2)
      const w = Array.from({ length: raw.length / 64 }, (_, i) => BigInt('0x' + raw.slice(i * 64, i * 64 + 64)))
      if (w.length !== 7) throw new Error(`swap data has ${w.length} words`)
      const a0 = s256(w[0] as bigint)
      const a1 = s256(w[1] as bigint)
      swaps++
      if (a0 > 0n) in0 += a0
      if (a1 > 0n) in1 += a1
      pf0 += w[5] as bigint
      pf1 += w[6] as bigint
      const paid = a0 > 0n ? (a0 * BigInt(fee) * p0) / 1_000_000n : (a1 * BigInt(fee) * p1) / 1_000_000n
      topUsd = Math.max(topUsd, Number(paid) / 1e36)
    }
    const grossUsd = Number(((in0 * BigInt(fee)) / 1_000_000n) * p0 + ((in1 * BigInt(fee)) / 1_000_000n) * p1) / 1e36
    const protoUsd = Number(pf0 * p0 + pf1 * p1) / 1e36
    const tvl = Number(b0 * p0 + b1 * p1) / 1e36
    const lpUsd = grossUsd - protoUsd
    const apy = ((lpUsd * (31_536_000 / windowSeconds)) / tvl) * 100
    console.log(`    ${swaps} swaps, ${logs.length} logs total. grossUsd=${grossUsd.toFixed(2)} protoUsd=${protoUsd.toFixed(2)} measuredShare=${(protoUsd / grossUsd).toFixed(5)}`)
    console.log(`    tvlUsd=${Math.round(tvl).toLocaleString('en-US')}  lpUsd=${lpUsd.toFixed(2)}  topSwapShare=${(topUsd / grossUsd).toFixed(4)}  APY=${apy.toFixed(2)}%`)
  }
}

async function main() {
  const tip = await c.getBlockNumber()
  console.log(`independent yield check  ${new Date().toISOString()}  tip=${tip}`)
  const spb = await endpointHeaders(tip)
  const blocksPerDay = 86_400 / spb
  console.log(`  measured ${spb.toFixed(5)} s/block -> ${blocksPerDay.toFixed(1)} blocks/day, ${(blocksPerDay * 365).toFixed(0)} blocks/year`)
  await venus(tip)
  await venusRows(tip, blocksPerDay)
  await pools(tip)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
