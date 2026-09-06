/**
 * Three claims in lib/yield.ts that its own gate does not test: that the oracle prices every
 * core market, that vWBNB tracks vBNB closely enough to stand in for it, and that the published
 * APYs actually move between reads.
 */
import { parseAbi, type Address } from 'viem'
import { withRpc, sleep } from '../lib/rpc.ts'
import { readVenusSupplyApys } from '../lib/yield.ts'

const COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384' as const
const ORACLE = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A' as const
const VBNB = '0xA07c5b74C9B40447a954e1466938b865b6BBea36' as const
const VWBNB = '0x6bCa74586218dB34cdB402295796b79663d816e9' as const

const C = parseAbi(['function getAllMarkets() view returns (address[])', 'function oracle() view returns (address)'])
const O = parseAbi(['function getUnderlyingPrice(address) view returns (uint256)'])
const V = parseAbi(['function supplyRatePerBlock() view returns (uint256)', 'function symbol() view returns (string)'])

const apy = (r: bigint, perDay: number) => ((1 + (Number(r) / 1e18) * perDay) ** 365 - 1) * 100

await withRpc(async (c) => {
  const tip = await c.getBlockNumber()
  const listed = await c.readContract({ address: COMPTROLLER, abi: C, functionName: 'getAllMarkets', blockNumber: tip })
  const live = await c.readContract({ address: COMPTROLLER, abi: C, functionName: 'oracle', blockNumber: tip })
  console.log(`${listed.length} core markets listed at block ${tip}`)
  console.log(`comptroller.oracle() = ${live}, file pins ${ORACLE}, match ${live.toLowerCase() === ORACLE.toLowerCase()}`)

  let priced = 0
  const unpriced: string[] = []
  for (let i = 0; i < listed.length; i += 10) {
    const slice = listed.slice(i, i + 10)
    const res = await c.multicall({
      contracts: slice.map((v) => ({ address: ORACLE, abi: O, functionName: 'getUnderlyingPrice', args: [v] })),
      allowFailure: true,
      blockNumber: tip,
    })
    if (res.length !== slice.length) throw new Error(`dropped ${slice.length - res.length}`)
    res.forEach((r, k) => {
      const m = slice[k]
      if (r.status === 'success' && (r.result as bigint) > 0n) priced++
      else unpriced.push(String(m))
    })
  }
  console.log(`oracle priced ${priced} of ${listed.length}${unpriced.length ? `, unpriced: ${unpriced.join(' ')}` : ''}`)

  const [a, b] = await Promise.all([c.getBlock({ blockNumber: tip }), c.getBlock({ blockNumber: tip - 100_000n })])
  const perDay = 86_400 / (Number(a.timestamp - b.timestamp) / 100_000)
  const pair = (await c.multicall({
    contracts: [
      { address: VBNB, abi: V, functionName: 'supplyRatePerBlock' },
      { address: VWBNB, abi: V, functionName: 'supplyRatePerBlock' },
    ],
    allowFailure: false,
    blockNumber: tip,
  })) as unknown[]
  const bnb = apy(pair[0] as bigint, perDay)
  const wbnb = apy(pair[1] as bigint, perDay)
  console.log(`vBNB APY ${bnb.toFixed(6)}, vWBNB APY ${wbnb.toFixed(6)}, gap ${Math.abs(bnb - wbnb).toFixed(6)} pp`)
})

console.log(`\nmovement, two reads 45 s apart`)
const first = await readVenusSupplyApys()
await sleep(45_000)
const second = await readVenusSupplyApys()
const later = new Map(second.map((r) => [r.asset, r]))
let moved = 0
let tvlMoved = 0
for (const r of first) {
  const s = later.get(r.asset)
  const dA = r.apy !== null && s?.apy != null ? s.apy - r.apy : null
  const dT = r.tvlUsd !== null && s?.tvlUsd != null ? s.tvlUsd - r.tvlUsd : null
  if (dA !== null && dA !== 0) moved++
  if (dT !== null && dT !== 0) tvlMoved++
  console.log(
    `  ${r.asset.padEnd(8)} ${String(r.apy?.toFixed(6)).padEnd(12)} -> ${String(s?.apy?.toFixed(6)).padEnd(12)} dAPY ${
      dA === null ? 'n/a' : dA.toFixed(9)
    }  dTVL ${dT === null ? 'n/a' : dT.toFixed(2)}  block ${r.atBlock} -> ${s?.atBlock}`,
  )
}
console.log(`${moved} of ${first.length} APYs moved, ${tvlMoved} TVLs moved`)
