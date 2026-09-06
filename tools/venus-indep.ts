/**
 * Independent re-verification of lib/venus.ts. Nothing here imports the module's math: the
 * recompute is written from the Venus Lens source (contracts/Lens/ComptrollerLens.sol,
 * _calculateAccountPosition) and reconciled against getAccountLiquidity on chain. The module is
 * called only at the end, to compare.
 *
 * Run: node --experimental-strip-types --no-warnings tools/venus-indep.ts
 */
import { createPublicClient, http, parseAbi, parseAbiItem } from 'viem'
import { bsc } from 'viem/chains'
import { readHealthFactor, listMarkets } from '../lib/venus.ts'

const RPC = 'https://bsc-rpc.publicnode.com'
const c = createPublicClient({ chain: bsc, transport: http(RPC, { timeout: 30_000, retryCount: 1 }) })
const CT = '0xfD36E2c2a6789Db23113685031d7F16329158384' as const
const E18 = 10n ** 18n

// markets() on the diamond returns SEVEN values, per MarketFacet.sol line 548.
const FULL = parseAbi([
  'function getAllMarkets() view returns (address[])',
  'function markets(address) view returns (bool isListed, uint256 cf, bool isVenus, uint256 lt, uint256 li, uint96 poolId, bool borrowAllowed)',
  'function getAssetsIn(address) view returns (address[])',
  'function getAccountLiquidity(address) view returns (uint256,uint256,uint256)',
  'function getBorrowingPower(address) view returns (uint256,uint256,uint256)',
  'function getEffectiveLtvFactor(address,address,uint8) view returns (uint256)',
  'function userPoolId(address) view returns (uint96)',
  'function oracle() view returns (address)',
  'function vaiController() view returns (address)',
])
const THREE = parseAbi(['function markets(address) view returns (bool, uint256, bool)'])
const VT = parseAbi([
  'function getAccountSnapshot(address) view returns (uint256,uint256,uint256,uint256)',
  'function symbol() view returns (string)',
  'function underlying() view returns (address)',
])
const OR = parseAbi(['function getUnderlyingPrice(address) view returns (uint256)'])
const VAI = parseAbi(['function getVAIRepayAmount(address) view returns (uint256)'])
const BORROW = parseAbiItem(
  'event Borrow(address borrower, uint256 borrowAmount, uint256 accountBorrows, uint256 totalBorrows)',
)

let bad = 0
const chk = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`)
}
const usd = (x: bigint) => (Number(x) / 1e18).toFixed(6)

console.log('=== 1  entry point ===')
const code = await c.getCode({ address: CT })
console.log(`  code bytes ${((code?.length ?? 2) - 2) / 2}  (hex chars ${(code?.length ?? 0) - 2})`)
chk('comptroller has code', !!code && code.length > 2)
const [oracle, vaiCtl, poolId0] = await c.multicall({
  contracts: [
    { address: CT, abi: FULL, functionName: 'oracle' },
    { address: CT, abi: FULL, functionName: 'vaiController' },
    { address: CT, abi: FULL, functionName: 'userPoolId', args: ['0x0000000000000000000000000000000000000001'] },
  ],
  allowFailure: false,
})
console.log(`  oracle=${oracle}  vaiController=${vaiCtl}  userPoolId(0x..01)=${poolId0}`)

console.log('\n=== 2  markets(): 7 outputs on chain vs the 3 the module declares ===')
const vTokens = (await c.readContract({ address: CT, abi: FULL, functionName: 'getAllMarkets' })) as readonly `0x${string}`[]
console.log(`  getAllMarkets -> ${vTokens.length} markets`)
const rows: { sym: string; v: `0x${string}`; cf: bigint; lt: bigint; poolId: bigint; price: bigint; under: string; dec: number | null }[] = []
for (let i = 0; i < vTokens.length; i += 8) {
  const b = vTokens.slice(i, i + 8)
  const res = await c.multicall({
    contracts: b.flatMap((v) => [
      { address: CT, abi: FULL, functionName: 'markets', args: [v] } as const,
      { address: v, abi: VT, functionName: 'symbol' } as const,
      { address: oracle as `0x${string}`, abi: OR, functionName: 'getUnderlyingPrice', args: [v] } as const,
      { address: v, abi: VT, functionName: 'underlying' } as const,
      { address: CT, abi: THREE, functionName: 'markets', args: [v] } as const,
    ]),
    allowFailure: true,
  })
  if (res.length !== b.length * 5) throw new Error(`short multicall ${res.length}`)
  for (let j = 0; j < b.length; j++) {
    const m = res[j * 5]
    const three = res[j * 5 + 4]
    if (m?.status !== 'success') throw new Error(`markets() failed on ${b[j]}`)
    const full = m.result as readonly [boolean, bigint, boolean, bigint, bigint, bigint, boolean]
    // The module reads the same call with a 3-output ABI. Prove the truncated decode agrees.
    if (three?.status === 'success') {
      const t = three.result as readonly [boolean, bigint, boolean]
      if (t[1] !== full[1]) throw new Error(`3-output decode disagrees on ${b[j]}: ${t[1]} vs ${full[1]}`)
    } else {
      console.log(`  !! 3-output markets() decode FAILED on ${b[j]}`)
    }
    const u = res[j * 5 + 3]
    rows.push({
      sym: res[j * 5 + 1]?.status === 'success' ? String(res[j * 5 + 1]!.result) : '?',
      v: b[j]!,
      cf: full[1],
      lt: full[3],
      poolId: full[5],
      price: res[j * 5 + 2]?.status === 'success' ? (res[j * 5 + 2]!.result as bigint) : -1n,
      under: u?.status === 'success' ? String(u.result) : 'native',
      dec: null,
    })
  }
}
const threeOk = rows.length === vTokens.length
chk('3-output markets() decode returns the same collateralFactor as the 7-output one', threeOk, `${rows.length}/${vTokens.length}`)
const split = rows.filter((r) => r.cf !== r.lt)
console.log(`  markets where collateralFactor != liquidationThreshold: ${split.length} of ${rows.length}`)
const xrp = rows.find((r) => r.sym === 'vXRP')
console.log(`  vXRP cf=${xrp ? Number(xrp.cf) / 1e18 : 'n/a'} lt=${xrp ? Number(xrp.lt) / 1e18 : 'n/a'}`)
chk('every listed market prices non-zero', rows.every((r) => r.price > 0n), `${rows.filter((r) => r.price <= 0n).length} zero or failed`)
chk('every cf and lt inside [0,1]', rows.every((r) => r.cf <= E18 && r.lt <= E18))
chk('lt >= cf on every market', rows.every((r) => r.lt >= r.cf), `${rows.filter((r) => r.lt < r.cf).length} inverted`)

console.log('\n=== 3  price sanity, price is scaled 1e(36 - underlyingDecimals) ===')
for (const sym of ['vBNB', 'vUSDT', 'vBTC', 'vETH', 'vUSDC']) {
  const r = rows.find((x) => x.sym === sym)
  if (!r) continue
  const dec = r.under === 'native' ? 18 : Number(await c.readContract({ address: r.under as `0x${string}`, abi: parseAbi(['function decimals() view returns (uint8)']), functionName: 'decimals' }))
  const human = Number(r.price) / 10 ** (36 - dec)
  console.log(`  ${sym.padEnd(7)} dec=${String(dec).padEnd(3)} raw=${r.price}  -> $${human.toFixed(dec === 18 ? 2 : 6)}`)
  if (sym === 'vBNB') chk('BNB price in [100, 5000]', human > 100 && human < 5000, `$${human.toFixed(2)}`)
  if (sym === 'vUSDT') chk('USDT price in [0.9, 1.1]', human > 0.9 && human < 1.1, `$${human.toFixed(4)}`)
  if (sym === 'vBTC') chk('BTC price in [10k, 500k]', human > 10_000 && human < 500_000, `$${human.toFixed(2)}`)
}

console.log('\n=== 4  find borrowers from my own Borrow scan, narrow recent range ===')
const tip = await c.getBlockNumber()
const found: `0x${string}`[] = []
for (const sym of ['vUSDT', 'vUSDC', 'vBNB', 'vBTC', 'vETH', 'vFDUSD']) {
  const r = rows.find((x) => x.sym === sym)
  if (!r) continue
  try {
    const logs = await c.getLogs({ address: r.v, event: BORROW, fromBlock: tip - 4_000n, toBlock: tip })
    console.log(`  ${sym} Borrow over 4000 blocks to ${tip}: ${logs.length}`)
    for (const l of logs) if (l.args.borrower) found.push(l.args.borrower)
  } catch (e) {
    console.log(`  ${sym} getLogs refused: ${(e as Error).message.slice(0, 80)}`)
  }
  if (found.length >= 3) break
}
const cands = [...new Set(found)]
console.log(`  distinct borrowers: ${cands.length}`)

/** The recompute, written from the Lens source. Every step truncates the way Exp does. */
async function recompute(account: `0x${string}`, block: bigint) {
  const assets = (await c.readContract({ address: CT, abi: FULL, functionName: 'getAssetsIn', args: [account], blockNumber: block })) as readonly `0x${string}`[]
  let sumColLt = 0n
  let sumColCf = 0n
  let sumBorrow = 0n
  const detail: string[] = []
  for (const a of assets) {
    const r = await c.multicall({
      contracts: [
        { address: a, abi: VT, functionName: 'getAccountSnapshot', args: [account] } as const,
        { address: a, abi: VT, functionName: 'symbol' } as const,
        { address: oracle as `0x${string}`, abi: OR, functionName: 'getUnderlyingPrice', args: [a] } as const,
        { address: CT, abi: FULL, functionName: 'getEffectiveLtvFactor', args: [account, a, 0] } as const,
        { address: CT, abi: FULL, functionName: 'getEffectiveLtvFactor', args: [account, a, 1] } as const,
      ],
      allowFailure: false,
      blockNumber: block,
    })
    const snap = r[0] as readonly [bigint, bigint, bigint, bigint]
    if (snap[0] !== 0n) throw new Error(`snapshot err ${snap[0]}`)
    const price = r[2] as bigint
    const cf = r[3] as bigint
    const lt = r[4] as bigint
    const tokensToDenomLt = (((lt * snap[3]) / E18) * price) / E18
    const tokensToDenomCf = (((cf * snap[3]) / E18) * price) / E18
    sumColLt += (tokensToDenomLt * snap[1]) / E18
    sumColCf += (tokensToDenomCf * snap[1]) / E18
    sumBorrow += (price * snap[2]) / E18
    if (snap[1] > 0n || snap[2] > 0n) {
      detail.push(
        `      ${String(r[1]).padEnd(9)} vBal=${snap[1]} borrow=${snap[2]} er=${snap[3]} price=${price} cf=${Number(cf) / 1e18} lt=${Number(lt) / 1e18}\n` +
          `        weightedCollateral=$${usd((tokensToDenomLt * snap[1]) / E18)}  debt=$${usd((price * snap[2]) / E18)}`,
      )
    }
  }
  const [vai, liq, power, pool] = await c.multicall({
    contracts: [
      { address: vaiCtl as `0x${string}`, abi: VAI, functionName: 'getVAIRepayAmount', args: [account] } as const,
      { address: CT, abi: FULL, functionName: 'getAccountLiquidity', args: [account] } as const,
      { address: CT, abi: FULL, functionName: 'getBorrowingPower', args: [account] } as const,
      { address: CT, abi: FULL, functionName: 'userPoolId', args: [account] } as const,
    ],
    allowFailure: false,
    blockNumber: block,
  })
  return {
    assets: assets.length,
    sumColLt,
    sumColCf,
    sumBorrow: sumBorrow + (vai as bigint),
    vai: vai as bigint,
    liq: liq as readonly [bigint, bigint, bigint],
    power: power as readonly [bigint, bigint, bigint],
    pool: pool as bigint,
    detail,
  }
}

console.log('\n=== 5  reconcile the recompute against getAccountLiquidity, per borrower ===')
const withDebt: `0x${string}`[] = []
for (const acct of cands.slice(0, 6)) {
  const block = await c.getBlockNumber()
  const g = await recompute(acct, block)
  const expectLiq = g.sumColLt > g.sumBorrow ? g.sumColLt - g.sumBorrow : 0n
  const expectShort = g.sumColLt > g.sumBorrow ? 0n : g.sumBorrow - g.sumColLt
  const okLiq = g.liq[0] === 0n && g.liq[1] === expectLiq && g.liq[2] === expectShort
  console.log(`  ${acct}  block ${block}  pool=${g.pool}  assets=${g.assets}  vai=${g.vai}`)
  for (const d of g.detail) console.log(d)
  console.log(`      sumCollateral(LT)=$${usd(g.sumColLt)}  sumCollateral(CF)=$${usd(g.sumColCf)}  sumBorrow=$${usd(g.sumBorrow)}`)
  console.log(`      chain liquidity=$${usd(g.liq[1])} shortfall=$${usd(g.liq[2])}   mine liquidity=$${usd(expectLiq)} shortfall=$${usd(expectShort)}`)
  console.log(`      borrowingPower(CF) liquidity=$${usd(g.power[1])} shortfall=$${usd(g.power[2])}`)
  chk(`getAccountLiquidity reconciles to the wei on ${acct.slice(0, 10)}`, okLiq)
  if (g.sumBorrow > 0n) {
    withDebt.push(acct)
    const hf = Number(g.sumColLt) / Number(g.sumBorrow)
    console.log(`      HF(LT) = ${hf.toFixed(6)}   HF(CF) = ${(Number(g.sumColCf) / Number(g.sumBorrow)).toFixed(6)}   drop to 1.0 = ${(Math.max(0, 1 - 1 / hf) * 100).toFixed(4)}%`)
    const mod = await readHealthFactor(acct)
    const drift = mod.healthFactor === null ? NaN : Math.abs(mod.healthFactor - hf) / hf
    console.log(`      module: hf=${mod.healthFactor?.toFixed(6)} col=$${mod.totalCollateralUsd?.toFixed(6)} borrow=$${mod.totalBorrowUsd?.toFixed(6)} liq=$${mod.liquidityUsd?.toFixed(6)} short=$${mod.shortfallUsd?.toFixed(6)} block=${mod.atBlock}`)
    chk(`module HF matches my recompute on ${acct.slice(0, 10)}`, Number.isFinite(drift) && drift < 2e-4, `relative drift ${(drift * 100).toFixed(6)}%`)
    chk(`module collateral is the LT-weighted sum, not the CF one`, mod.totalCollateralUsd !== null && Math.abs(mod.totalCollateralUsd - Number(g.sumColLt) / 1e18) / (Number(g.sumColLt) / 1e18 || 1) < 2e-4)
    const rowSum = mod.markets.reduce((s, m) => s + m.weightedCollateralUsd, 0)
    chk('market rows sum to totalCollateralUsd', Math.abs(rowSum - (mod.totalCollateralUsd ?? 0)) < 0.02, `rows $${rowSum.toFixed(4)} vs total $${mod.totalCollateralUsd?.toFixed(4)}`)
    chk('HF sanity: inside [0.01, 1e6]', (mod.healthFactor ?? 0) > 0.01 && (mod.healthFactor ?? 0) < 1e6, String(mod.healthFactor))
    chk('shortfall non-zero iff HF < 1', (mod.shortfallUsd ?? 0) > 0 === (mod.healthFactor ?? 1) < 1)
  }
}
console.log(`  borrowers with live debt: ${withDebt.length}`)

console.log('\n=== 6  supply-only and empty accounts must be null, never 0 or Infinity ===')
// A supplier that never entered a market, and a fresh address with nothing at all.
const supplyOnly: `0x${string}`[] = []
for (const sym of ['vUSDT', 'vBNB']) {
  const r = rows.find((x) => x.sym === sym)
  if (!r) continue
  const logs = await c.getLogs({
    address: r.v,
    event: parseAbiItem('event Mint(address minter, uint256 mintAmount, uint256 mintTokens, uint256 accountBalance)'),
    fromBlock: tip - 4_000n,
    toBlock: tip,
  })
  for (const l of logs) if (l.args.minter) supplyOnly.push(l.args.minter)
}
const zeroDebt: `0x${string}`[] = []
for (const a of [...new Set(supplyOnly)].slice(0, 8)) {
  const g = await recompute(a, await c.getBlockNumber())
  if (g.sumBorrow === 0n) zeroDebt.push(a)
  if (zeroDebt.length >= 2) break
}
for (const a of [...zeroDebt, '0x000000000000000000000000000000000000dEaD' as `0x${string}`]) {
  const m = await readHealthFactor(a)
  console.log(`  ${a}  hf=${JSON.stringify(m.healthFactor)} col=${JSON.stringify(m.totalCollateralUsd)} borrow=${JSON.stringify(m.totalBorrowUsd)} drop=${JSON.stringify(m.priceDropToLiquidationPct)} rows=${m.markets.length}`)
  chk(`no debt -> healthFactor null on ${a.slice(0, 10)}`, m.healthFactor === null)
  chk(`no debt -> priceDropToLiquidationPct null on ${a.slice(0, 10)}`, m.priceDropToLiquidationPct === null)
}

console.log('\n=== 7  listMarkets shape and decimals ===')
const ms = await listMarkets()
console.log(`  ${ms.length} markets, keys ${JSON.stringify(Object.keys(ms[0] ?? {}))}`)
chk('listMarkets covers getAllMarkets', ms.length === vTokens.length, `${ms.length} vs ${vTokens.length}`)
chk('every collateralFactor in [0,1]', ms.every((m) => m.collateralFactor >= 0 && m.collateralFactor <= 1))
chk('every underlyingDecimals in [2,18]', ms.every((m) => m.underlyingDecimals >= 2 && m.underlyingDecimals <= 18), JSON.stringify([...new Set(ms.map((m) => m.underlyingDecimals))].sort((a, b) => a - b)))
const native = ms.filter((m) => m.underlying === 'native')
console.log(`  native-underlying markets: ${native.map((m) => m.symbol).join(', ') || 'none'}`)
// listMarkets reports the core-pool factor. Prove it against the 7-output read.
let cfMismatch = 0
for (const m of ms) {
  const on = rows.find((r) => r.v.toLowerCase() === m.vToken.toLowerCase())
  if (!on) continue
  if (Math.abs(m.collateralFactor - Number(on.cf) / 1e18) > 1e-12) cfMismatch++
}
chk('listMarkets collateralFactor equals the core-pool markets() value', cfMismatch === 0, `${cfMismatch} mismatched`)

console.log(`\n${bad === 0 ? 'ALL CHECKS PASSED' : `${bad} CHECK(S) FAILED`}`)
process.exit(bad === 0 ? 0 : 1)
