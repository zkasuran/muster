/**
 * Independent audit of lib/yield.ts. Written from the brief, not from the module, so a shared
 * mistake cannot pass. Everything here is read fresh at one pinned block.
 */
import { parseAbi, decodeAbiParameters, getAddress, type Address } from 'viem'
import { withRpc, MAX_LOG_SPAN } from '../lib/rpc.ts'

const ORACLE = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A' as const
const POOLS = [
  '0x172fcD41E0913e95784454622d1c3724f546f849',
  '0xD0e226f674bBf064f54aB47F42473fF80DB98CBA',
  '0x46Cf1cF8c69595804ba91dFdd8d6b960c9B0a7C4',
] as const
const VTOKEN_OF: Record<string, Address> = {
  '0x55d398326f99059ff775485246999027b3197955': '0xfD5840Cd36d94D7229439859C0112a4185BC0255',
  '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': '0x6bCa74586218dB34cdB402295796b79663d816e9',
  '0x2170ed0880ac9a755fd29b2688956bd959f933f8': '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8',
  '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B',
}

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

const POOL_ABI = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)',
  'function fee() view returns (uint24)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
])
const ERC20_ABI = parseAbi(['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)'])
const ORACLE_ABI = parseAbi(['function getUnderlyingPrice(address) view returns (uint256)'])

const SECONDS_PER_YEAR = 31_536_000
const SCALE = 1e36

await withRpc(async (c, url) => {
  const tip = await c.getBlockNumber()
  const from = tip - BigInt(MAX_LOG_SPAN)
  console.log(`audit on ${url}, tip ${tip}, window ${from}..${tip}`)
  const [head, tail] = await Promise.all([c.getBlock({ blockNumber: from }), c.getBlock({ blockNumber: tip })])
  const windowSeconds = Number(tail.timestamp - head.timestamp)
  console.log(`window ${windowSeconds} s (${(windowSeconds / 60).toFixed(1)} min), cadence ${(windowSeconds / MAX_LOG_SPAN).toFixed(5)} s/block\n`)

  for (const raw of POOLS) {
    const pool = getAddress(raw)
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
    const packed = Number(slot0[5])
    const sqrtP = slot0[0] as bigint
    const tick = Number(slot0[1])

    const v0 = VTOKEN_OF[token0.toLowerCase()]
    const v1 = VTOKEN_OF[token1.toLowerCase()]
    if (!v0 || !v1) throw new Error(`no vToken for ${pool}`)

    const state = (await c.multicall({
      contracts: [
        { address: token0, abi: ERC20_ABI, functionName: 'balanceOf', args: [pool] },
        { address: token1, abi: ERC20_ABI, functionName: 'balanceOf', args: [pool] },
        { address: token0, abi: ERC20_ABI, functionName: 'symbol' },
        { address: token1, abi: ERC20_ABI, functionName: 'symbol' },
        { address: ORACLE, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v0] },
        { address: ORACLE, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v1] },
      ],
      allowFailure: false,
      blockNumber: tip,
    })) as unknown[]
    const bal0 = state[0] as bigint
    const bal1 = state[1] as bigint
    const price0 = state[4] as bigint
    const price1 = state[5] as bigint

    // tick round trip: 1.0001^tick should equal (sqrtPriceX96/2^96)^2
    const fromSqrt = (Number(sqrtP) / 2 ** 96) ** 2
    const fromTick = 1.0001 ** tick
    console.log(`== ${pool}  ${String(state[2])}/${String(state[3])}  fee ${feeTier}/1e6`)
    console.log(`   feeProtocol packed ${packed}, low16 ${packed & 0xffff}, high16 ${packed >>> 16}`)
    console.log(`   tick ${tick}: 1.0001^tick=${fromTick.toExponential(6)} vs sqrtP^2=${fromSqrt.toExponential(6)}, ratio ${(fromTick / fromSqrt).toFixed(6)}`)

    let logs
    try {
      logs = await c.getLogs({ address: pool, fromBlock: from, toBlock: tip })
    } catch (e) {
      console.log(`   getLogs REFUSED: ${(e as Error).message.slice(0, 120)}\n`)
      continue
    }
    let in0 = 0n
    let in1 = 0n
    let pf0 = 0n
    let pf1 = 0n
    let swaps = 0
    let topUsd = 0
    const pfSeq: bigint[] = []
    for (const log of logs) {
      if (log.topics[0] !== SWAP_TOPIC) continue
      const d = decodeAbiParameters(SWAP_ARGS, log.data)
      const a0 = d[0] as bigint
      const a1 = d[1] as bigint
      swaps++
      if (a0 > 0n) in0 += a0
      if (a1 > 0n) in1 += a1
      pf0 += d[5] as bigint
      pf1 += d[6] as bigint
      if (pfSeq.length < 12) pfSeq.push((d[5] as bigint) + (d[6] as bigint))
      const paid = a0 > 0n ? (a0 * feeTier * price0) / 1_000_000n : (a1 * feeTier * price1) / 1_000_000n
      topUsd = Math.max(topUsd, Number(paid) / SCALE)
    }
    const gross0 = (in0 * feeTier) / 1_000_000n
    const gross1 = (in1 * feeTier) / 1_000_000n
    const grossUsd = Number(gross0 * price0 + gross1 * price1) / SCALE
    const protoUsd = Number(pf0 * price0 + pf1 * price1) / SCALE
    const lpUsd = grossUsd - protoUsd
    const tvlUsd = Number(bal0 * price0 + bal1 * price1) / SCALE
    const share = grossUsd > 0 ? protoUsd / grossUsd : null
    const apy = tvlUsd > 0 && swaps > 0 ? ((lpUsd * (SECONDS_PER_YEAR / windowSeconds)) / tvlUsd) * 100 : null
    console.log(`   ${logs.length} logs, ${swaps} swaps`)
    console.log(`   first protocol-fee words: ${pfSeq.map((v) => v.toString()).join(' ')}`)
    console.log(`   gross fee USD ${grossUsd.toFixed(2)}, protocol USD ${protoUsd.toFixed(2)}, LP USD ${lpUsd.toFixed(2)}`)
    console.log(`   measured protocol share ${share === null ? 'n/a' : share.toFixed(4)} vs packed low16/1e4 = ${((packed & 0xffff) / 1e4).toFixed(4)}, /1e2 = ${((packed & 0xffff) / 1e2).toFixed(4)}`)
    console.log(`   TVL USD ${tvlUsd.toFixed(0)}, top swap fee USD ${topUsd.toFixed(2)} (${grossUsd > 0 ? ((topUsd / grossUsd) * 100).toFixed(1) : 'n/a'} pct of gross)`)
    console.log(`   simple annualised LP APY ${apy === null ? 'null' : apy.toFixed(4)} percent\n`)
  }
})
