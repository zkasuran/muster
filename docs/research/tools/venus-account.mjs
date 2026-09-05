import { rpc, view, num, addr, w, sleep } from './rpclib.mjs'
import { writeFileSync } from 'node:fs'
const C = '0xfD36E2c2a6789Db23113685031d7F16329158384'
const ORACLE = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A'
const VAIC = '0x004065D34C6b18cE4370ced1CeBDE94865DbFAFE'
const acct = process.argv[2]
const bn = process.argv[4] ? Number(process.argv[4]) : Number(BigInt((await rpc('eth_blockNumber', [])).result)) - 3
const TAG = '0x' + bn.toString(16)
const ai = await view(C, 'getAssetsIn(address)', [acct], TAG)
const hex = ai.result
const n = Number(BigInt(w(hex, 1)))
const assets = []
for (let i = 0; i < n; i++) assets.push('0x' + hex.slice(2 + (2 + i) * 64 + 24, 2 + (3 + i) * 64))
const rows = []
for (const a of assets) {
  const snap = await view(a, 'getAccountSnapshot(address)', [acct], TAG)
  const h = snap.result
  const r = {
    vToken: a,
    err: String(BigInt(w(h, 0))),
    vTokenBalance: BigInt(w(h, 1)).toString(),
    borrowBalance: BigInt(w(h, 2)).toString(),
    exchangeRateMantissa: BigInt(w(h, 3)).toString()
  }
  const cf = await view(C, 'getCollateralFactor(address)', [a], TAG); r.cf = String(num(cf.result))
  const lt = await view(C, 'getLiquidationThreshold(address)', [a], TAG); r.lt = String(num(lt.result))
  const e0 = await view(C, 'getEffectiveLtvFactor(address,address,uint8)', [acct, a, 0], TAG); r.effCF = e0.error ? e0.error : String(num(e0.result))
  const e1 = await view(C, 'getEffectiveLtvFactor(address,address,uint8)', [acct, a, 1], TAG); r.effLT = e1.error ? e1.error : String(num(e1.result))
  const px = await view(ORACLE, 'getUnderlyingPrice(address)', [a], TAG); r.price1e18 = String(num(px.result))
  const sy = await view(a, 'symbol()', [], TAG); r.symbol = Buffer.from(sy.result.slice(130, 130 + Number(BigInt(w(sy.result,1)))*2), 'hex').toString()
  rows.push(r)
  await sleep(100)
}
const al = await view(C, 'getAccountLiquidity(address)', [acct], TAG)
const bp = await view(C, 'getBorrowingPower(address)', [acct], TAG)
const vai = await view(VAIC, 'getVAIRepayAmount(address)', [acct], TAG)
const out = {
  block: bn, account: acct, assets,
  getAccountLiquidity_LT: al.error ? al.error : { err: String(BigInt(w(al.result,0))), liquidity: BigInt(w(al.result,1)).toString(), shortfall: BigInt(w(al.result,2)).toString() },
  getBorrowingPower_CF: bp.error ? bp.error : { err: String(BigInt(w(bp.result,0))), liquidity: BigInt(w(bp.result,1)).toString(), shortfall: BigInt(w(bp.result,2)).toString() },
  vaiRepayAmount: vai.error ? vai.error : String(num(vai.result)),
  rows
}
// local recompute, mirroring ComptrollerLens._calculateAccountPosition
const E = 10n ** 18n
const trunc = (a, b) => (a * b) / E  // mul_ScalarTruncate on Exp*scalar
function position(useLT) {
  let sumC = 0n, sumB = 0n
  for (const r of rows) {
    const factor = BigInt(useLT ? r.lt : r.cf)
    const xr = BigInt(r.exchangeRateMantissa), px = BigInt(r.price1e18)
    if (BigInt(r.vTokenBalance) === 0n && BigInt(r.borrowBalance) === 0n) continue
    const tokensToDenom = (factor * xr / E) * px / E   // Exp mul_ chain, each step truncating
    sumC += tokensToDenom * BigInt(r.vTokenBalance) / E
    sumB += px * BigInt(r.borrowBalance) / E
  }
  sumB += BigInt(out.vaiRepayAmount === undefined ? 0 : out.vaiRepayAmount)
  return { sumCollateral: sumC.toString(), sumBorrowPlusEffects: sumB.toString(),
    liquidity: (sumC > sumB ? sumC - sumB : 0n).toString(), shortfall: (sumB > sumC ? sumB - sumC : 0n).toString(),
    healthFactor: sumB === 0n ? null : Number(sumC * 10000n / sumB) / 10000 }
}
out.recomputed_LT = position(true)
out.recomputed_CF = position(false)
writeFileSync(process.argv[3], JSON.stringify(out, null, 2))
console.log(JSON.stringify({ acct, chainLT: out.getAccountLiquidity_LT, localLT: out.recomputed_LT, chainCF: out.getBorrowingPower_CF, localCF: out.recomputed_CF, nAssets: assets.length }, null, 2))
