import { rpc, sleep, w, num } from './rpclib.mjs'
import { writeFileSync } from 'node:fs'
const C = '0xfD36E2c2a6789Db23113685031d7F16329158384'
const bnHex = (await rpc('eth_blockNumber', [])).result
const TAG = '0x' + (Number(BigInt(bnHex)) - 4).toString(16)
const pad = (a) => String(a).replace(/^0x/, '').toLowerCase().padStart(64, '0')
const padN = (n) => BigInt(n).toString(16).padStart(64, '0')
const call = async (data) => rpc('eth_call', [{ to: C, data }, TAG])
const out = { block: Number(BigInt(TAG)), lastPoolId: null, pools: [] }
out.lastPoolId = Number(BigInt((await call('0xa657e579')).result))
const symCache = {}
async function sym(a) {
  if (symCache[a]) return symCache[a]
  const r = await rpc('eth_call', [{ to: a, data: '0x95d89b41' }, TAG])
  const h = r.result
  const len = Number(BigInt(w(h, 1)))
  symCache[a] = Buffer.from(h.slice(130, 130 + len * 2), 'hex').toString()
  return symCache[a]
}
for (let p = 1; p <= out.lastPoolId; p++) {
  const meta = await call('0x96c99064' + padN(p))
  const h = meta.result
  const labelOff = Number(BigInt(w(h, 0)))
  const llen = Number(BigInt('0x' + h.slice(2 + labelOff * 2, 2 + labelOff * 2 + 64)))
  const label = Buffer.from(h.slice(2 + labelOff * 2 + 64, 2 + labelOff * 2 + 64 + llen * 2), 'hex').toString()
  const isActive = BigInt(w(h, 1)) === 1n
  const allowFallback = BigInt(w(h, 2)) === 1n
  const vt = await call('0x63e0d634' + padN(p))
  const vh = vt.result
  const n = Number(BigInt(w(vh, 1)))
  const list = []
  for (let i = 0; i < n; i++) list.push('0x' + vh.slice(2 + (2 + i) * 64 + 24, 2 + (3 + i) * 64))
  const mk = []
  for (const a of list) {
    const r = await call('0x3093c11e' + padN(p) + pad(a))
    const d = r.result
    mk.push({ vToken: a, symbol: await sym(a),
      isListed: BigInt(w(d, 0)) === 1n,
      collateralFactorMantissa: BigInt(w(d, 1)).toString(),
      isVenus: BigInt(w(d, 2)) === 1n,
      liquidationThresholdMantissa: BigInt(w(d, 3)).toString(),
      liquidationIncentiveMantissa: BigInt(w(d, 4)).toString(),
      marketPoolId: Number(BigInt(w(d, 5))),
      isBorrowAllowed: BigInt(w(d, 6)) === 1n })
    await sleep(80)
  }
  out.pools.push({ poolId: p, label, isActive, allowCorePoolFallback: allowFallback, markets: mk })
  console.error(`pool ${p} "${label}" active=${isActive} fallback=${allowFallback} markets=${n}`)
  await sleep(100)
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 2))
console.log('pools:', out.pools.length)
