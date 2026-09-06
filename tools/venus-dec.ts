/**
 * Which Venus core markets have a non-18-decimal underlying, and does the docstring's price
 * scaling hold on them. Run: node --experimental-strip-types --no-warnings tools/venus-dec.ts
 */
import { createPublicClient, http, parseAbi } from 'viem'
import { bsc } from 'viem/chains'
import { listMarkets } from '../lib/venus.ts'

const c = createPublicClient({ chain: bsc, transport: http('https://bsc-rpc.publicnode.com', { timeout: 30_000 }) })
const CT = '0xfD36E2c2a6789Db23113685031d7F16329158384' as const
const OR = parseAbi(['function getUnderlyingPrice(address) view returns (uint256)'])
const ERC = parseAbi([
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
])
const VTABI = parseAbi([
  'function decimals() view returns (uint8)',
  'function exchangeRateStored() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
])
const oracle = (await c.readContract({ address: CT, abi: parseAbi(['function oracle() view returns (address)']), functionName: 'oracle' })) as `0x${string}`

const ms = await listMarkets()
const odd = ms.filter((m) => m.underlyingDecimals !== 18)
console.log(`non-18-decimal underlyings: ${odd.length} of ${ms.length}`)
for (const m of odd) {
  const [price, uSym, uName, vDec, er, uSupply] = await c.multicall({
    contracts: [
      { address: oracle, abi: OR, functionName: 'getUnderlyingPrice', args: [m.vToken as `0x${string}`] } as const,
      { address: m.underlying as `0x${string}`, abi: ERC, functionName: 'symbol' } as const,
      { address: m.underlying as `0x${string}`, abi: ERC, functionName: 'name' } as const,
      { address: m.vToken as `0x${string}`, abi: VTABI, functionName: 'decimals' } as const,
      { address: m.vToken as `0x${string}`, abi: VTABI, functionName: 'exchangeRateStored' } as const,
      { address: m.underlying as `0x${string}`, abi: ERC, functionName: 'totalSupply' } as const,
    ],
    allowFailure: true,
  })
  const d = m.underlyingDecimals
  const p = price.status === 'success' ? (price.result as bigint) : 0n
  const human = Number(p) / 10 ** (36 - d)
  const erv = er.status === 'success' ? (er.result as bigint) : 0n
  // Docstring claim: price scales 1e(36-d), exchangeRateStored scales 1e(18 + d - vTokenDecimals).
  const expectErExp = 18 + d - (vDec.status === 'success' ? Number(vDec.result) : 8)
  const erExp = erv === 0n ? 0 : Math.floor(Math.log10(Number(erv)))
  console.log(
    `  ${m.symbol.padEnd(10)} dec=${String(d).padEnd(3)} vTokenDec=${vDec.status === 'success' ? vDec.result : '?'} underlying=${m.underlying}` +
      `\n      uSymbol=${uSym.status === 'success' ? String(uSym.result) : '?'} uName=${uName.status === 'success' ? String(uName.result) : '?'} uTotalSupply=${uSupply.status === 'success' ? String(uSupply.result) : '?'}` +
      `\n      price raw=${p} -> $${human < 0.01 ? human.toExponential(4) : human.toFixed(4)}   erExp10~${erExp} expected~${expectErExp}`,
  )
}
