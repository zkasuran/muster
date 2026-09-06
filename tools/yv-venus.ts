/**
 * Independent Venus check. Recomputes each curated market's supply APY from raw reads, then
 * compares the module's own row against it. Also asks api.venus.io what it publishes.
 */
import { parseAbi, type Address } from 'viem'
import { withRpc } from '../lib/rpc.ts'
import { readVenusSupplyApys, rankYields } from '../lib/yield.ts'

const ORACLE = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A' as const
const MARKETS: Address[] = [
  '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B',
  '0xfD5840Cd36d94D7229439859C0112a4185BC0255',
  '0x6bCa74586218dB34cdB402295796b79663d816e9',
  '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8',
  '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8',
  '0x86aC3974e2BD0d60825230fa6F355fF11409df5c',
  '0x3d5E269787d562b74aCC55F18Bd26C5D09Fa245E',
]
const V = parseAbi([
  'function supplyRatePerBlock() view returns (uint256)',
  'function getCash() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function totalReserves() view returns (uint256)',
  'function symbol() view returns (string)',
])
const O = parseAbi(['function getUnderlyingPrice(address) view returns (uint256)'])

const pad = (s: string, n: number) => s.padEnd(n)
const apyOf = (rate: bigint, perDay: number, exp: number) => ((1 + (Number(rate) / 1e18) * perDay) ** exp - 1) * 100

const mine = await withRpc(async (c) => {
  const tip = await c.getBlockNumber()
  const [a, b] = await Promise.all([c.getBlock({ blockNumber: tip }), c.getBlock({ blockNumber: tip - 100_000n })])
  const sec = Number(a.timestamp - b.timestamp) / 100_000
  const perDay = 86_400 / sec
  const out: Record<string, { sym: string; rate: bigint; tvl: number; apy365: number; apy364at192k: number }> = {}
  for (const m of MARKETS) {
    const r = (await c.multicall({
      contracts: [
        { address: m, abi: V, functionName: 'supplyRatePerBlock' },
        { address: m, abi: V, functionName: 'getCash' },
        { address: m, abi: V, functionName: 'totalBorrows' },
        { address: m, abi: V, functionName: 'totalReserves' },
        { address: m, abi: V, functionName: 'symbol' },
        { address: ORACLE, abi: O, functionName: 'getUnderlyingPrice', args: [m] },
      ],
      allowFailure: false,
      blockNumber: tip,
    })) as unknown[]
    const rate = r[0] as bigint
    const supplied = (r[1] as bigint) + (r[2] as bigint) - (r[3] as bigint)
    out[m.toLowerCase()] = {
      sym: String(r[4]),
      rate,
      tvl: Number(supplied * (r[5] as bigint)) / 1e36,
      apy365: apyOf(rate, perDay, 365),
      apy364at192k: apyOf(rate, 192_000, 364),
    }
  }
  return { tip, sec, perDay, out }
})
console.log(`independent read at block ${mine.tip}, cadence ${mine.sec.toFixed(5)} s/block, ${mine.perDay.toFixed(1)} blocks/day\n`)

const api = (await (await fetch('https://api.venus.io/markets/core-pool?chainId=56&limit=60&page=0')).json()) as {
  result?: { address: string; symbol: string; supplyApy: string; supplyRatePerBlock?: string; totalSupplyUsd?: string }[]
}
const pub = new Map((api.result ?? []).map((m) => [m.address.toLowerCase(), m]))

const rows = await readVenusSupplyApys()
console.log(`${pad('MARKET', 12)}${pad('MODULE APY', 13)}${pad('MY APY 365', 13)}${pad('MY 364@192k', 13)}${pad('venus.io', 11)}${pad('MODULE TVL', 15)}MY TVL`)
for (const m of MARKETS) {
  const k = m.toLowerCase()
  const g = mine.out[k]
  if (!g) continue
  const row = rows.find((r) => r.source.toLowerCase().includes(k))
  const p = pub.get(k)
  console.log(
    pad(g.sym, 12) +
      pad(row?.apy?.toFixed(6) ?? 'absent', 13) +
      pad(g.apy365.toFixed(6), 13) +
      pad(g.apy364at192k.toFixed(6), 13) +
      pad(p ? Number(p.supplyApy).toFixed(6) : 'absent', 11) +
      pad(row?.tvlUsd?.toFixed(0) ?? 'absent', 15) +
      g.tvl.toFixed(0),
  )
}

console.log(`\nrankYields() rows:`)
const all = await rankYields()
for (const r of all) {
  console.log(
    `  ${pad(r.venue, 16)}${pad(r.asset, 12)}${pad(r.kind, 8)}${pad(r.apy === null ? 'null' : r.apy.toFixed(4), 12)}${pad(
      r.tvlUsd === null ? 'null' : r.tvlUsd.toFixed(0),
      14,
    )}block ${r.atBlock}`,
  )
}
console.log(`\nfull sources:`)
for (const r of all) console.log(`  [${r.asset} ${r.kind}] ${r.source}`)
console.log(`\nlimit test: rankYields(2) -> ${(await rankYields(2)).length} rows`)
