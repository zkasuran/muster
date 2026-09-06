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

async function venus(tip: bigint, secondsPerBlock: number) {
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
