import { createPublicClient, http, parseAbi } from 'viem'
import { bsc } from 'viem/chains'
import { parseRegistration } from '../lib/registry.ts'
import { fetchByPayTo, preferredAccept } from '../lib/bazaar.ts'
const HOLDER = '0x515e7bce44baa5f6e42d16d4b5f27768e7f2f8cc' as const
const IDR = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const
const c = createPublicClient({ chain: bsc, transport: http('https://bsc-rpc.publicnode.com', { timeout: 25000 }) })
const ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function tokenOfOwnerByIndex(address,uint256) view returns (uint256)',
  'function tokenURI(uint256) view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
])
console.log('  balance:', await c.readContract({ address: IDR, abi: ABI, functionName: 'balanceOf', args: [HOLDER] }))
let id: bigint | null = null
try {
  id = await c.readContract({ address: IDR, abi: ABI, functionName: 'tokenOfOwnerByIndex', args: [HOLDER, 0n] })
  console.log('  via tokenOfOwnerByIndex:', id)
} catch {
  console.log('  tokenOfOwnerByIndex not supported, scanning Transfer logs to that address')
  const head = await c.getBlockNumber()
  for (let to = head; to > head - 4_000_000n; to -= 5000n) {
    const logs = await c.getLogs({ address: IDR, event: ABI[3], args: { to: HOLDER }, fromBlock: to - 4999n, toBlock: to })
    if (logs.length) { id = logs[0]!.args.tokenId!; console.log('  found via logs at block', logs[0]!.blockNumber, 'id', id); break }
  }
}
if (id !== null) {
  const uri = await c.readContract({ address: IDR, abi: ABI, functionName: 'tokenURI', args: [id] })
  const r = parseRegistration(String(uri))
  console.log('  agent id      :', id.toString())
  console.log('  name          :', r?.name)
  console.log('  description   :', (r?.description ?? '').slice(0, 200))
  console.log('  endpoints     :', JSON.stringify(r?.endpoints))
  console.log('  declaresX402  :', r?.declaresX402, ' active:', r?.declaresActive)
  console.log('  serviceKinds  :', JSON.stringify(r?.serviceKinds))
}
const res = await fetchByPayTo(HOLDER)
console.log(`  bazaar resources for this address: ${res.length}`)
for (const x of res.slice(0, 6)) {
  const a = preferredAccept(x.accepts ?? [])
  console.log(`    ${x.resource}`)
  console.log(`      ${a?.scheme} ${a?.maxAmountRequired} @ ${a?.asset.slice(0,10)}  updated=${x.lastUpdated ? new Date(x.lastUpdated).toISOString().slice(0,10) : '?'}`)
  if (x.description && !x.description.startsWith('http')) console.log(`      ${x.description.slice(0, 140)}`)
}
