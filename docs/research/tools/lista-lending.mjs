import { rpc, view, num, addr, w, sleep, SIG } from './rpclib.mjs'
import { writeFileSync } from 'node:fs'
const M = '0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C'
const IRMV = SIG['borrowRateView((address,address,address,address,uint256),(uint128,uint128,uint128,uint128,uint128,uint128))']
const bn = Number(BigInt((await rpc('eth_blockNumber', [])).result)) - 5
const TAG = '0x' + bn.toString(16)
const pad = (a) => String(a).replace(/^0x/, '').toLowerCase().padStart(64, '0')
const padN = (n) => BigInt(n).toString(16).padStart(64, '0')
const call = async (to, data) => rpc('eth_call', [{ to, data }, TAG])
const E = 10n ** 18n, PS = 10n ** 36n
const targets = JSON.parse(process.argv[2])
const out = { block: bn, moolah: M, positions: [] }
for (const { id, account } of targets) {
  const mp = await call(M, SIG['idToMarketParams(bytes32)'] + pad(id))
  const h = mp.result
  const P = { loanToken: '0x' + h.slice(26, 66), collateralToken: '0x' + h.slice(90, 130),
    oracle: '0x' + h.slice(154, 194), irm: '0x' + h.slice(218, 258), lltv: BigInt(w(h, 4)) }
  const packed = pad(P.loanToken) + pad(P.collateralToken) + pad(P.oracle) + pad(P.irm) + padN(P.lltv)
  const mk = await call(M, SIG['market(bytes32)'] + pad(id))
  const mh = mk.result
  const MK = { totalSupplyAssets: BigInt(w(mh,0)), totalSupplyShares: BigInt(w(mh,1)),
    totalBorrowAssets: BigInt(w(mh,2)), totalBorrowShares: BigInt(w(mh,3)),
    lastUpdate: BigInt(w(mh,4)), fee: BigInt(w(mh,5)) }
  const ps = await call(M, SIG['position(bytes32,address)'] + pad(id) + pad(account))
  const ph = ps.result
  const POS = { supplyShares: BigInt(w(ph,0)), borrowShares: BigInt(w(ph,1)), collateral: BigInt(w(ph,2)) }
  const gp = await call(M, SIG['getPrice((address,address,address,address,uint256))'] + packed)
  const collateralPrice = BigInt(w(gp.result, 0))
  const ih = await call(M, SIG['isHealthy((address,address,address,address,uint256),bytes32,address)'] + packed + pad(id) + pad(account))
  const chainHealthy = BigInt(w(ih.result, 0)) === 1n
  const br = await call(M, SIG['brokers(bytes32)'] + pad(id))
  const broker = '0x' + br.result.slice(26, 66)
  const irmPacked = packed + padN(MK.totalSupplyAssets) + padN(MK.totalSupplyShares) + padN(MK.totalBorrowAssets) + padN(MK.totalBorrowShares) + padN(MK.lastUpdate) + padN(MK.fee)
  const rateR = await call(P.irm, IRMV + irmPacked)
  const borrowRatePerSecond = rateR.error ? rateR.error : BigInt(w(rateR.result, 0)).toString()
  // local math per Moolah._isHealthy
  const mulDivUp = (x, y, d) => (x * y + (d - 1n)) / d
  const borrowed = MK.totalBorrowShares === 0n ? 0n : mulDivUp(POS.borrowShares, MK.totalBorrowAssets, MK.totalBorrowShares)
  const maxBorrow = (POS.collateral * collateralPrice / PS) * P.lltv / E
  const localHealthy = POS.borrowShares === 0n ? true : maxBorrow >= borrowed
  const collateralValue = POS.collateral * collateralPrice / PS
  const ltv = collateralValue === 0n ? null : Number(borrowed * 1000000n / collateralValue) / 1000000
  const hf = borrowed === 0n ? null : Number(maxBorrow * 1000000n / borrowed) / 1000000
  const cursor = 3n * E / 10n
  const denom = E - (cursor * (E - P.lltv) / E)
  let lif = E * E / denom
  const MAXLIF = 115n * E / 100n
  if (lif > MAXLIF) lif = MAXLIF
  out.positions.push({ id, account, marketParams: { ...P, lltv: P.lltv.toString() },
    market: Object.fromEntries(Object.entries(MK).map(([k, v]) => [k, v.toString()])),
    position: Object.fromEntries(Object.entries(POS).map(([k, v]) => [k, v.toString()])),
    broker, collateralPrice: collateralPrice.toString(), borrowRatePerSecond,
    borrowedAssets: borrowed.toString(), collateralValueInLoanUnits: collateralValue.toString(),
    maxBorrow: maxBorrow.toString(), ltv, healthFactorEquivalent: hf,
    liquidationIncentiveFactor: lif.toString(),
    chainIsHealthy: chainHealthy, localIsHealthy: localHealthy, match: chainHealthy === localHealthy })
  await sleep(120)
}
writeFileSync(process.argv[3], JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
