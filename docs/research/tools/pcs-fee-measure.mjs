// Measure realised PancakeSwap v3 pool fees straight from Swap logs.
import { rpc, sleep, w } from './rpclib.mjs'
import { writeFileSync } from 'node:fs'
const POOL = process.argv[2]
const BLOCKS = Number(process.argv[3] || 3000)
const TOPIC = '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83'
const tip = Number(BigInt((await rpc('eth_blockNumber', [])).result))
const from = tip - BLOCKS
const logs = await rpc('eth_getLogs', [{ fromBlock: '0x' + from.toString(16), toBlock: '0x' + tip.toString(16), address: POOL, topics: [TOPIC] }])
if (logs.error) { console.log('ERR', logs.error); process.exit(1) }
const s256 = (h) => { let v = BigInt(h); if (v >= 2n ** 255n) v -= 2n ** 256n; return v }
let in0 = 0n, in1 = 0n, pf0 = 0n, pf1 = 0n, n = 0
for (const l of logs.result) {
  const d = l.data
  const a0 = s256(w(d, 0)), a1 = s256(w(d, 1))
  pf0 += BigInt(w(d, 5)); pf1 += BigInt(w(d, 6))
  if (a0 > 0n) in0 += a0
  if (a1 > 0n) in1 += a1
  n++
}
const fee = BigInt((await rpc('eth_call', [{ to: POOL, data: '0xddca3f43' }, 'latest'])).result)  // fee()
const t0 = await rpc('eth_getBlockByNumber', ['0x' + from.toString(16), false])
const t1 = await rpc('eth_getBlockByNumber', ['0x' + tip.toString(16), false])
const secs = Number(BigInt(t1.result.timestamp)) - Number(BigInt(t0.result.timestamp))
const grossFee0 = in0 * fee / 1000000n
const grossFee1 = in1 * fee / 1000000n
console.log(JSON.stringify({ pool: POOL, fromBlock: from, toBlock: tip, seconds: secs, swaps: n,
  feeTier: Number(fee), amountIn0: in0.toString(), amountIn1: in1.toString(),
  grossFee0: grossFee0.toString(), grossFee1: grossFee1.toString(),
  protocolFee0Delta: pf0.toString(), protocolFee1Delta: pf1.toString(),
  impliedProtocolShare0: in0 ? Number(pf0 * 1000000n / grossFee0) / 1000000 : null,
  impliedProtocolShare1: in1 ? Number(pf1 * 1000000n / grossFee1) / 1000000 : null }, null, 2))
