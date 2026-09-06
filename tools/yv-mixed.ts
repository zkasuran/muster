import { parseAbi } from 'viem'
import { withRpc } from '../lib/rpc.ts'
const V = parseAbi(['function supplyRatePerBlock() view returns (uint256)', 'function underlying() view returns (address)'])
await withRpc(async (c) => {
  // claim: vBNB has no underlying() to cite
  try {
    const u = await c.readContract({ address: '0xA07c5b74C9B40447a954e1466938b865b6BBea36', abi: V, functionName: 'underlying' })
    console.log('vBNB underlying():', u)
  } catch (e) { console.log('vBNB underlying() reverts:', (e as Error).message.split('\n')[0]) }
  // claim: one bad checksum fails the whole multicall batch
  const good = '0xfD5840Cd36d94D7229439859C0112a4185BC0255'
  const bad = '0xfd5840Cd36d94D7229439859C0112a4185BC0255' as `0x${string}`
  try {
    const r = await c.multicall({ contracts: [
      { address: good, abi: V, functionName: 'supplyRatePerBlock' },
      { address: bad, abi: V, functionName: 'supplyRatePerBlock' },
    ], allowFailure: true })
    console.log('mixed-checksum batch returned:', JSON.stringify(r.map((x) => x.status)))
  } catch (e) { console.log('mixed-checksum batch THREW for the whole batch:', (e as Error).message.split('\n')[0]) }
})
