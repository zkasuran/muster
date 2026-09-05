import { rpc, view, num, addr, decStr, sleep, w } from './rpclib.mjs'
import { writeFileSync } from 'node:fs'
const COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384'
const bn = (await rpc('eth_blockNumber', [])).result
const markets = await view(COMPTROLLER, 'getAllMarkets()')
const hex = markets.result
const n = Number(BigInt(w(hex, 1)))
const list = []
for (let i = 0; i < n; i++) list.push('0x' + hex.slice(2 + (2 + i) * 64 + 24, 2 + (3 + i) * 64))
const oracleR = await rpc('eth_call', [{ to: COMPTROLLER, data: '0x7dc0d1d0' }, 'latest'])
const oracle = addr(oracleR.result)
const out = { block: Number(BigInt(bn)), comptroller: COMPTROLLER, oracle, marketCount: n, markets: [] }
for (const vt of list) {
  const rec = { vToken: vt }
  const q = async (k, sig, args) => { const r = await view(vt, sig, args); rec[k] = r.error ? { error: r.error } : r.result; }
  const sym = await view(vt, 'symbol()'); rec.symbol = decStr(sym.result)
  const und = await view(vt, 'underlying()'); rec.underlying = und.error ? null : addr(und.result)
  const dcm = await view(vt, 'decimals()'); rec.vTokenDecimals = dcm.error ? null : Number(num(dcm.result))
  for (const [k, s] of [['exchangeRateStored','exchangeRateStored()'],['supplyRatePerBlock','supplyRatePerBlock()'],
    ['borrowRatePerBlock','borrowRatePerBlock()'],['cash','getCash()'],['totalBorrows','totalBorrows()'],
    ['totalReserves','totalReserves()'],['totalSupply','totalSupply()'],['reserveFactorMantissa','reserveFactorMantissa()'],
    ['accrualBlockNumber','accrualBlockNumber()']]) {
    const r = await view(vt, s); rec[k] = r.error ? null : String(num(r.result))
  }
  const irm = await view(vt, 'interestRateModel()'); rec.interestRateModel = irm.error ? null : addr(irm.result)
  const cf = await view(COMPTROLLER, 'getCollateralFactor(address)', [vt]); rec.collateralFactorMantissa = cf.error ? { error: cf.error } : String(num(cf.result))
  const lt = await view(COMPTROLLER, 'getLiquidationThreshold(address)', [vt]); rec.liquidationThresholdMantissa = lt.error ? { error: lt.error } : String(num(lt.result))
  const px = await view(oracle, 'getUnderlyingPrice(address)', [vt]); rec.underlyingPrice1e18 = px.error ? { error: px.error } : String(num(px.result))
  const bc = await view(COMPTROLLER, 'borrowCaps(address)', [vt]); rec.borrowCap = bc.error ? null : String(num(bc.result))
  const sc = await view(COMPTROLLER, 'supplyCaps(address)', [vt]); rec.supplyCap = sc.error ? null : String(num(sc.result))
  if (rec.underlying) {
    const ud = await view(rec.underlying, 'decimals()'); rec.underlyingDecimals = ud.error ? null : Number(num(ud.result))
    const us = await view(rec.underlying, 'symbol()'); rec.underlyingSymbol = us.error ? null : decStr(us.result)
  } else { rec.underlyingDecimals = 18; rec.underlyingSymbol = 'BNB' }
  out.markets.push(rec)
  process.stderr.write(`${rec.symbol}\t${rec.collateralFactorMantissa}\t${rec.liquidationThresholdMantissa}\n`)
  await sleep(120)
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 2))
console.log('markets:', out.markets.length, 'block', out.block)
