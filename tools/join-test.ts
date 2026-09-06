import { fetchAllResources, indexResources } from '../lib/bazaar.ts'
import { createPublicClient, http, parseAbi } from 'viem'
import { bsc } from 'viem/chains'
const idx = indexResources(await fetchAllResources(), Date.now())
console.log(`  Bazaar: ${idx.resources.length} resources, ${idx.distinctPayTo} payout addresses`)
const c = createPublicClient({ chain: bsc, transport: http('https://bsc-rpc.publicnode.com', { timeout: 20000 }) })
const IDR = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const
const ABI = parseAbi(['function balanceOf(address) view returns (uint256)'])
console.log('  does each payout address hold an ERC-8004 agent NFT?')
let holders = 0
for (const [payTo, res] of idx.byPayTo) {
  let bal = -1n
  try { bal = await c.readContract({ address: IDR, abi: ABI, functionName: 'balanceOf', args: [payTo as `0x${string}`] }) } catch {}
  const host = (() => { try { return new URL(res[0]!.resource).hostname } catch { return '?' } })()
  if (bal > 0n) holders++
  console.log(`    ${payTo}  agents=${bal < 0n ? 'err' : bal.toString().padStart(4)}  resources=${String(res.length).padStart(4)}  ${host}`)
}
console.log(`  payout addresses that also hold an ERC-8004 identity: ${holders} of ${idx.distinctPayTo}`)
