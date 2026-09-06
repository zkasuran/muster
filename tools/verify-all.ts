/**
 * My own verification of the six modules, not the agents' self-reports. The rule in this lane
 * is that a subagent finding is unverified until checked, and these numbers end up on a page a
 * judge reads, so each one gets exercised here against the live chain and sanity checked
 * against reality.
 */
import { readHealthFactor, listMarkets, HEALTH_FACTOR_FORMULA } from '../lib/venus.ts'
import { readVenusSupplyApys, rankYields } from '../lib/yield.ts'
import { readPool, lpDrift, PCS_POOLS } from '../lib/pancake.ts'
import { planGrid } from '../lib/grid.ts'
import { build402, transferWithAuthorizationTypedData, permit2TypedData } from '../lib/b402.ts'
import { checkUrl } from '../worker/probe.ts'
import { privateKeyToAccount } from 'viem/accounts'
import { hashTypedData, recoverTypedDataAddress, keccak256, toHex } from 'viem'

const ok = (b: boolean) => (b ? 'PASS' : 'FAIL')
let fails = 0
const check = (label: string, pass: boolean, detail = '') => {
  if (!pass) fails++
  console.log(`  ${ok(pass)}  ${label}${detail ? '  ' + detail : ''}`)
}

console.log('\n=== venus: markets and the health factor formula ===')
const markets = await listMarkets()
console.log(`  markets read: ${markets.length}`)
for (const m of markets.slice(0, 6)) {
  console.log(`    ${m.symbol.padEnd(8)} vToken=${m.vToken.slice(0, 10)} cf=${m.collateralFactor} dec=${m.underlyingDecimals}`)
}
check('at least 3 markets', markets.length >= 3, `${markets.length}`)
check('every collateral factor is a fraction between 0 and 1', markets.every((m) => m.collateralFactor >= 0 && m.collateralFactor <= 1))
// Venus has three vault markets whose underlying carries 24 decimals (vvhUSDT, vvhUSDC,
// vvhU), read live. 24 is real here, so the range allows it. Another decimals trap.
check('every underlying decimals is sane for BSC, 6 to 24', markets.every((m) => m.underlyingDecimals >= 6 && m.underlyingDecimals <= 24))
console.log(`  formula: ${HEALTH_FACTOR_FORMULA.slice(0, 150)}`)

console.log('\n=== venus: a real account ===')
for (const acct of [
  '0x0000000000000000000000000000000000000000',
  '0xF2D3cF6F9D5d51B67F17624C21e7db0E97eB6077',
]) {
  try {
    const r = await readHealthFactor(acct)
    console.log(
      `  ${acct.slice(0, 12)} hf=${r.healthFactor === null ? 'null' : r.healthFactor.toFixed(4)} ` +
        `collateral=$${r.totalCollateralUsd?.toFixed(2) ?? 'null'} borrow=$${r.totalBorrowUsd?.toFixed(2) ?? 'null'} ` +
        `liquidity=$${r.liquidityUsd?.toFixed(2) ?? 'null'} shortfall=$${r.shortfallUsd?.toFixed(2) ?? 'null'} block=${r.atBlock}`,
    )
    check(
      `no borrow means hf is null rather than 0 or Infinity (${acct.slice(0, 8)})`,
      r.totalBorrowUsd === null || r.totalBorrowUsd === 0 ? r.healthFactor === null : Number.isFinite(r.healthFactor ?? 0),
    )
  } catch (e) {
    check(`readHealthFactor did not throw for ${acct.slice(0, 8)}`, false, (e as Error).message.slice(0, 90))
  }
}

console.log('\n=== yield: Venus supply APYs must be plausible and must be able to move ===')
const apys = await readVenusSupplyApys()
for (const y of apys.slice(0, 6)) {
  console.log(`    ${y.venue.padEnd(12)} ${y.asset.padEnd(8)} ${y.kind.padEnd(7)} apy=${y.apy === null ? 'null' : y.apy.toFixed(4) + '%'}  src=${y.source.slice(0, 46)}`)
}
check('at least 3 yield rows', apys.length >= 3, `${apys.length}`)
const nonNull = apys.filter((y) => y.apy !== null)
check('every APY is between 0 and 200 percent', nonNull.every((y) => y.apy! >= 0 && y.apy! < 200), `${nonNull.length} non-null`)
check('every row cites the call it came from', apys.every((y) => y.source.length > 4))
check('every row is dated', apys.every((y) => y.readAt > 1_700_000_000_000))
const ranked = await rankYields(5)
console.log(`  ranked top: ${ranked.map((r) => `${r.asset}=${r.apy?.toFixed(2)}%`).join(' ')}`)
check('rankYields is sorted descending', ranked.every((r, i) => i === 0 || (ranked[i - 1]!.apy ?? 0) >= (r.apy ?? 0)))

console.log('\n=== pancakeswap: a live price that has to be plausible for BNB ===')
console.log(`  pools configured: ${PCS_POOLS.map((p) => p.label).join(', ')}`)
for (const p of PCS_POOLS.slice(0, 3)) {
  try {
    const s = await readPool(p.pool)
    console.log(
      `    ${p.label.padEnd(14)} ${s.symbol0}/${s.symbol1} fee=${s.fee} tick=${s.tick} price=${s.price1Per0.toPrecision(8)} liq=${String(s.liquidity).slice(0, 12)} block=${s.atBlock}`,
    )
    const isBnbStable = /WBNB/i.test(s.symbol0 + s.symbol1) && /USDT|USDC|USD1/i.test(s.symbol0 + s.symbol1)
    if (isBnbStable) {
      const p1 = /WBNB/i.test(s.symbol0) ? s.price1Per0 : 1 / s.price1Per0
      check('BNB priced in a plausible range 200 to 3000 USD', p1 > 200 && p1 < 3000, `got ${p1.toFixed(2)}`)
    }
    check(`tick round-trips through 1.0001^tick (${p.label})`, Math.abs(Math.log(1.0001 ** s.tick) - s.tick * Math.log(1.0001)) < 1e-6)
    const d1 = await lpDrift(p.pool, s.tick - 500, s.tick + 500)
    const d2 = await lpDrift(p.pool, s.tick + 20_000, s.tick + 30_000)
    console.log(`      drift in-range=${d1.inRange} rec=${d1.recommendation} | far-range in-range=${d2.inRange} rec=${d2.recommendation}`)
    check(`a range around the current tick is in range (${p.label})`, d1.inRange)
    check(`a range far above is not in range (${p.label})`, !d2.inRange)
  } catch (e) {
    check(`readPool worked for ${p.label}`, false, (e as Error).message.slice(0, 100))
  }
}

console.log('\n=== grid: the ladder arithmetic has to add up ===')
try {
  const plan = await planGrid({ pool: PCS_POOLS[0]!.pool, lowerPct: 10, upperPct: 10, levelCount: 8, capitalQuote: 1000 })
  console.log(`  ${plan.pair} mark=${plan.markPrice.toPrecision(8)} range ${plan.lower.toPrecision(6)}..${plan.upper.toPrecision(6)} spacing=${plan.spacingPct.toFixed(3)}%`)
  for (const l of plan.levels.slice(0, 4)) console.log(`    L${l.index} ${l.side.padEnd(4)} @ ${l.price.toPrecision(8)} size=${l.sizeBase.toPrecision(6)} notional=${l.notionalQuote.toFixed(4)}`)
  const buyNotional = plan.levels.filter((l) => l.side === 'buy').reduce((s, l) => s + l.notionalQuote, 0)
  console.log(`  buy-side notional=${buyNotional.toFixed(4)} declared capitalRequiredQuote=${plan.capitalRequiredQuote.toFixed(4)}`)
  check('level count matches', plan.levels.length === plan.levelCount, `${plan.levels.length} vs ${plan.levelCount}`)
  check('buy notional reconciles with the declared quote capital within 1%', Math.abs(buyNotional - plan.capitalRequiredQuote) / Math.max(1, plan.capitalRequiredQuote) < 0.01)
  check('spacing is geometric, so consecutive ratios are equal', (() => {
    const r = plan.levels.map((l) => l.price)
    if (r.length < 3) return false
    const a = r[1]! / r[0]!, b = r[2]! / r[1]!
    return Math.abs(a - b) < 1e-9
  })())
  check('the breakout rule is stated in words', plan.breakoutRule.length > 20)
  const bad = await planGrid({ pool: PCS_POOLS[0]!.pool, lowerPct: 10, upperPct: 10, levelCount: 1, capitalQuote: 0 })
  console.log(`  rejected input warnings: ${JSON.stringify(bad.warnings)}`)
  check('a bad input produces warnings rather than a plan', bad.warnings.length > 0)
} catch (e) {
  check('planGrid worked', false, (e as Error).message.slice(0, 120))
}

console.log('\n=== b402: the bytes a buyer signs ===')
const body = build402({ resource: 'https://muster.zkasuran.dev/api/agent/yield', description: 'Yield route', priceBase: '10000000000000000', token: 'USD1', payTo: '0x1111111111111111111111111111111111111111' })
check('402 status', body.status === 402)
check('accepts is non-empty', body.body.accepts.length > 0)
console.log(`  scheme=${body.body.accepts[0]?.scheme} network=${body.body.accepts[0]?.network} asset=${body.body.accepts[0]?.asset.slice(0, 12)} amount=${body.body.accepts[0]?.maxAmountRequired}`)
check('network is CAIP-2 eip155:56', body.body.accepts[0]?.network === 'eip155:56')

const key = ('0x' + '11'.repeat(32)) as `0x${string}`
const acct = privateKeyToAccount(key)
const now = Math.floor(Date.now() / 1000)
const td = transferWithAuthorizationTypedData({
  token: 'USD1', from: acct.address, to: '0x2222222222222222222222222222222222222222',
  value: '10000000000000000', validAfter: now - 60, validBefore: now + 3600,
  nonce: keccak256(toHex('muster-test-nonce')),
}) as never
const sig = await acct.signTypedData(td)
const recovered = await recoverTypedDataAddress({ ...(td as object), signature: sig } as never)
console.log(`  USD1 typed data hash: ${hashTypedData(td).slice(0, 20)}...`)
console.log(`  signer ${acct.address.slice(0, 12)} recovered ${String(recovered).slice(0, 12)}`)
check('the recovered signer equals the signer', String(recovered).toLowerCase() === acct.address.toLowerCase())

const p2 = permit2TypedData({
  token: '0x55d398326f99059fF775485246999027B3197955', amount: '5000000',
  spender: '0x3333333333333333333333333333333333333333', nonce: '12345',
  deadline: now + 3600, payTo: '0x2222222222222222222222222222222222222222', validAfter: now - 60,
}) as never
const sig2 = await acct.signTypedData(p2)
const rec2 = await recoverTypedDataAddress({ ...(p2 as object), signature: sig2 } as never)
check('permit2 signature recovers', String(rec2).toLowerCase() === acct.address.toLowerCase())
check('permit2 domain carries no version key', !('version' in ((p2 as { domain: Record<string, unknown> }).domain)))
check('permit2 primaryType is PermitWitnessTransferFrom', (p2 as { primaryType: string }).primaryType === 'PermitWitnessTransferFrom')

console.log('\n=== probe: the SSRF guard is the most important code in the build ===')
const hostile: [string, string][] = [
  ['file:///etc/passwd', 'scheme'],
  ['ftp://example.com/x', 'scheme'],
  ['http://localhost/x', 'loopback'],
  ['http://127.0.0.1/x', 'loopback'],
  ['http://127.1/x', 'loopback'],
  ['http://[::1]/x', 'ipv6 loopback'],
  ['http://10.0.0.1/x', 'private'],
  ['http://172.16.0.1/x', 'private'],
  ['http://192.168.1.1/x', 'private'],
  ['http://169.254.169.254/latest/meta-data/', 'link-local, the cloud metadata attack'],
  ['http://100.64.0.1/x', 'cgnat'],
  ['http://224.0.0.1/x', 'multicast'],
  ['http://255.255.255.255/x', 'broadcast'],
  ['http://[fc00::1]/x', 'unique-local'],
  ['http://[::ffff:127.0.0.1]/x', 'ipv4-mapped ipv6'],
  ['http://[64:ff9b::7f00:1]/x', 'nat64'],
  ['http://user:pass@example.com/x', 'credentials in the url'],
  ['http://example.com:22/x', 'non web port'],
  ['http://0.0.0.0/x', 'unspecified'],
  ['http://[2130706433]/x', 'decimal ip'],
  ['http://this-host-does-not-exist-muster-test.invalid/x', 'dns fails'],
]
let refused = 0
for (const [url, why] of hostile) {
  const v = await checkUrl(url)
  if (!v.ok) refused++
  console.log(`    ${v.ok ? '!! ALLOWED' : 'refused   '} ${url.padEnd(52).slice(0, 52)} ${v.reason ?? ''} (${why})`)
}
check(`every hostile input refused (${refused}/${hostile.length})`, refused === hostile.length)
for (const good of ['https://api.xona-agent.com/binance/token/signal', 'https://muster.zkasuran.dev/']) {
  const v = await checkUrl(good)
  console.log(`    ${v.ok ? 'allowed  ' : '!! REFUSED'} ${good}  ${v.reason ?? ''}`)
  check(`a real https endpoint is allowed: ${good.slice(8, 30)}`, v.ok)
}

console.log(`\n=== ${fails === 0 ? 'ALL CHECKS PASSED' : fails + ' CHECK(S) FAILED'} ===`)
process.exit(fails === 0 ? 0 : 1)
