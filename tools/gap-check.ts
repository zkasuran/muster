import { createPublicClient, http, parseAbi } from 'viem'
import { bsc } from 'viem/chains'
const IDR = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const
const ABI = parseAbi(['function ownerOf(uint256) view returns (address)'])
const c = createPublicClient({ chain: bsc, transport: http('https://bsc-rpc.publicnode.com', { timeout: 20000, retryCount: 1 }) })
// sample ids across the range, individually, so a multicall artifact cannot hide a real gap
const ids = [0n, 1n, 2n, 999n, 5000n, 20000n, 20001n, 20002n, 50000n, 100000n, 150000n, 200000n, 250000n, 300000n, 336000n, 336300n, 336311n, 336312n, 400000n]
for (const id of ids) {
  let out: string
  try { out = String(await c.readContract({ address: IDR, abi: ABI, functionName: "ownerOf", args: [id] })) }
  catch (e) { out = 'REVERT: ' + ((e as Error).message.split('\n')[0] ?? '').slice(0, 60) }
  console.log(`  id ${String(id).padStart(7)}  ${out}`)
}
console.log('\n  multicall over the same ids, allowFailure, to compare:')
const r = await c.multicall({ contracts: ids.map(id => ({ address: IDR, abi: ABI, functionName: 'ownerOf', args: [id] } as const)), allowFailure: true })
console.log('  ok=' + r.filter(x => x.status === 'success').length + ' failed=' + r.filter(x => x.status !== 'success').length)
