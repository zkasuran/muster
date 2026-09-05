import { rpc, view, num, sleep } from './rpclib.mjs'
const VT = process.argv[2] || '0xfD5840Cd36d94D7229439859C0112a4185BC0255'
const bn = Number(BigInt((await rpc('eth_blockNumber', [])).result)) - 5
const TAG = '0x' + bn.toString(16)
const g = async (s) => { const r = await view(VT, s, [], TAG); return r.error ? r.error : num(r.result) }
const cash = await g('getCash()'); const borrows = await g('totalBorrows()')
const reserves = await g('totalReserves()'); const rf = await g('reserveFactorMantissa()')
const br = await g('borrowRatePerBlock()'); const sr = await g('supplyRatePerBlock()')
const er = await g('exchangeRateStored()'); const ts = await g('totalSupply()')
const ab = await g('accrualBlockNumber()')
const E = 10n ** 18n
const U = borrows * E / (cash + borrows - reserves)
const rateToPool = br * (E - rf) / E
const srCalc = U * rateToPool / E
const BPY = 70080000n, BPD = 192000n
const apy = (rate) => (Math.pow(1 + Number(rate) / 1e18 * 192000, 364) - 1) * 100
console.log(JSON.stringify({ block: bn, vToken: VT, accrualBlockNumber: String(ab),
  cash: String(cash), totalBorrows: String(borrows), totalReserves: String(reserves),
  reserveFactorMantissa: String(rf), borrowRatePerBlock: String(br), supplyRatePerBlock: String(sr),
  exchangeRateStored: String(er), totalSupply: String(ts),
  utilizationRate: String(U), rateToPool: String(rateToPool), supplyRateRecomputed: String(srCalc),
  supplyRateMatches: srCalc === sr, borrowApyPct: apy(br), supplyApyPct: apy(sr) }, null, 2))
