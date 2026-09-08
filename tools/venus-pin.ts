/**
 * Two claims left. First, how far back the free endpoints will serve a pinned eth_call, which is
 * what the module's pin-to-tip design rests on. Second, whether an account in shortfall reports
 * HF < 1 with priceDropToLiquidationPct clamped at zero.
 * Run: node --experimental-strip-types --no-warnings tools/venus-pin.ts
 */
import { createPublicClient, http, parseAbi, parseAbiItem } from 'viem'
import { bsc } from 'viem/chains'
import { ENDPOINTS } from '../lib/rpc.ts'
import { readHealthFactor } from '../lib/venus.ts'

const CT = '0xfD36E2c2a6789Db23113685031d7F16329158384' as const
const ABI = parseAbi([
  'function closeFactorMantissa() view returns (uint256)',
  'function getAllMarkets() view returns (address[])',
])

console.log('=== how far back does a pinned eth_call answer ===')
for (const url of ENDPOINTS) {
  const c = createPublicClient({ chain: bsc, transport: http(url, { timeout: 15_000, retryCount: 0 }) })
  let tip: bigint
  try {
    tip = await c.getBlockNumber()
  } catch (e) {
    console.log(`  ${url.padEnd(38)} no blockNumber: ${(e as Error).message.slice(0, 60)}`)
    continue
  }
  const reached: number[] = []
  let firstFail = ''
  for (const back of [0, 8, 32, 64, 128, 512, 5_000, 100_000]) {
    try {
      await c.readContract({ address: CT, abi: ABI, functionName: 'closeFactorMantissa', blockNumber: tip - BigInt(back) })
      reached.push(back)
    } catch (e) {
      if (!firstFail) firstFail = `${back} back: ${(e as Error).message.split('\n')[0]?.slice(0, 70)}`
      break
    }
  }
  console.log(`  ${url.padEnd(38)} tip ${tip} answered at -${reached.join(', -')}${firstFail ? `   first refusal at ${firstFail}` : '  (no refusal)'}`)
}

console.log('\n=== any account in shortfall right now ===')
const c = createPublicClient({ chain: bsc, transport: http('https://bsc-rpc.publicnode.com', { timeout: 30_000 }) })
const tip = await c.getBlockNumber()
const markets = (await c.readContract({ address: CT, abi: ABI, functionName: 'getAllMarkets' })) as readonly `0x${string}`[]
const LIQ = parseAbiItem(
  'event LiquidateBorrow(address liquidator, address borrower, uint256 repayAmount, address vTokenCollateral, uint256 seizeTokens)',
)
const victims = new Set<string>()
for (const v of markets.slice(0, 14)) {
  try {
    const logs = await c.getLogs({ address: v, event: LIQ, fromBlock: tip - 5_000n, toBlock: tip })
    for (const l of logs) if (l.args.borrower) victims.add(l.args.borrower)
  } catch {
    /* a market with no events in the window, or a refusal, is not a failure of this check */
  }
  if (victims.size >= 4) break
}
console.log(`  liquidated borrowers in the last 5000 blocks: ${victims.size}`)
for (const v of [...victims].slice(0, 4)) {
  const r = await readHealthFactor(v)
  console.log(
    `  ${v} hf=${r.healthFactor === null ? 'null' : r.healthFactor.toFixed(6)} short=$${r.shortfallUsd?.toFixed(2) ?? 'null'} liq=$${r.liquidityUsd?.toFixed(2) ?? 'null'} drop=${r.priceDropToLiquidationPct === null ? 'null' : r.priceDropToLiquidationPct.toFixed(4) + '%'}`,
  )
  if (r.healthFactor !== null && r.healthFactor < 1) {
    console.log(`    shortfall path: drop clamped to ${r.priceDropToLiquidationPct} (must be 0), chain shortfall ${r.shortfallUsd} (must be > 0)`)
  }
}
