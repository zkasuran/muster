/**
 * Gate for lib/venus.ts. Two halves.
 *
 * First it recomputes Venus core account liquidity from the primitives on its own, with no
 * help from the module, reconciling that against what the Comptroller reports. Then it calls
 * the module and checks the module agrees. An independent recompute is the only way to catch a
 * formula that is wrong in the same direction in both places.
 *
 * Run: node --experimental-strip-types --no-warnings tools/venus-gate.ts [account]
 */
import { parseAbi } from 'viem'
import { withRpc, MAX_LOG_SPAN } from '../lib/rpc.ts'
import { listMarkets, readHealthFactor, type VenusMarket } from '../lib/venus.ts'

const COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384' as const
const ORACLE = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A' as const
const VAI_CONTROLLER = '0x004065D34C6b18cE4370ced1CeBDE94865DbFAFE' as const
/** The busiest core markets, resolved to addresses from listMarkets so nothing is hardcoded. */
const SCAN_SYMBOLS = ['vUSDT', 'vUSDC', 'vBNB', 'vBTC', 'vETH']

const CA = parseAbi([
  'function getAssetsIn(address) view returns (address[])',
  'function getAccountLiquidity(address) view returns (uint256,uint256,uint256)',
  'function getBorrowingPower(address) view returns (uint256,uint256,uint256)',
  'function getEffectiveLtvFactor(address,address,uint8) view returns (uint256)',
  'function userPoolId(address) view returns (uint96)',
])
const VT = parseAbi([
  'function getAccountSnapshot(address) view returns (uint256,uint256,uint256,uint256)',
  'function symbol() view returns (string)',
])
const BORROW_EVENT = parseAbi([
  'event Borrow(address borrower, uint256 borrowAmount, uint256 accountBorrows, uint256 totalBorrows)',
])[0]
/** Venus adds a fourth field to Compound's Mint and Redeem, so the 3-argument forms match nothing. */
const MINT_EVENT = parseAbi([
  'event Mint(address minter, uint256 mintAmount, uint256 mintTokens, uint256 accountBalance)',
])[0]
const REDEEM_EVENT = parseAbi([
  'event Redeem(address redeemer, uint256 redeemAmount, uint256 redeemTokens, uint256 accountBalance)',
])[0]
const ORACLE_ABI = parseAbi(['function getUnderlyingPrice(address) view returns (uint256)'])
const VAI_ABI = parseAbi(['function getVAIRepayAmount(address) view returns (uint256)'])

const E18 = 10n ** 18n
const usd = (x: bigint) => (Number(x) / 1e18).toFixed(4)

let failures = 0
function check(label: string, ok: boolean, detail: string): void {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${detail}`)
}

/** Total USD debt right now, so a stale Borrow event does not pass as an open position. */
async function debtOf(account: `0x${string}`): Promise<bigint> {
  const { rows, vai } = await recompute(account)
  let debt = vai
  for (const r of rows) debt += (r.price * r.borrow) / E18
  return debt
}

/**
 * Discovery over a narrow recent range, because publicnode refuses historical getLogs. Venus
 * borrows are sparse: five markets over 5,000 blocks is about 37 minutes of chain and often
 * turns up a single event, which is why the gate does not depend on the scan hitting.
 */
async function scanBorrowers(targets: VenusMarket[]): Promise<`0x${string}`[]> {
  return withRpc(async (c) => {
    const tip = await c.getBlockNumber()
    const found: `0x${string}`[] = []
    for (const t of targets) {
      const logs = await c.getLogs({
        address: t.vToken as `0x${string}`,
        event: BORROW_EVENT,
        fromBlock: tip - BigInt(MAX_LOG_SPAN),
        toBlock: tip,
      })
      console.log(`scan  ${t.symbol} Borrow over ${MAX_LOG_SPAN} blocks to ${tip}: ${logs.length} events`)
      for (const log of logs.reverse()) if (log.args.borrower) found.push(log.args.borrower)
    }
    return found
  })
}
interface Row {
  vToken: `0x${string}`
  symbol: string
  vBalance: bigint
  borrow: bigint
  exchangeRate: bigint
  price: bigint
  cf: bigint
  lt: bigint
}

/** The independent recompute. Same integer order as ComptrollerLens, all truncating. */
async function recompute(account: `0x${string}`) {
  return withRpc(async (c, url) => {
    const block = await c.getBlockNumber()
    const assets = (await c.readContract({
      address: COMPTROLLER, abi: CA, functionName: 'getAssetsIn', args: [account], blockNumber: block,
    })) as readonly `0x${string}`[]
    const rows: Row[] = []
    for (const v of assets) {
      const calls = [
        { address: v, abi: VT, functionName: 'getAccountSnapshot', args: [account] } as const,
        { address: v, abi: VT, functionName: 'symbol' } as const,
        { address: ORACLE, abi: ORACLE_ABI, functionName: 'getUnderlyingPrice', args: [v] } as const,
        { address: COMPTROLLER, abi: CA, functionName: 'getEffectiveLtvFactor', args: [account, v, 0] } as const,
        { address: COMPTROLLER, abi: CA, functionName: 'getEffectiveLtvFactor', args: [account, v, 1] } as const,
      ]
      const r = await c.multicall({ contracts: calls, allowFailure: false, blockNumber: block })
      if (r.length !== calls.length) throw new Error(`multicall gave ${r.length} of ${calls.length}`)
      const snap = r[0] as readonly [bigint, bigint, bigint, bigint]
      if (snap[0] !== 0n) throw new Error(`getAccountSnapshot error ${snap[0]} on ${v}`)
      rows.push({
        vToken: v, symbol: String(r[1]), vBalance: snap[1], borrow: snap[2], exchangeRate: snap[3],
        price: r[2] as bigint, cf: r[3] as bigint, lt: r[4] as bigint,
      })
    }
    const [vai, liq, power, poolId] = (await c.multicall({
      contracts: [
        { address: VAI_CONTROLLER, abi: VAI_ABI, functionName: 'getVAIRepayAmount', args: [account] } as const,
        { address: COMPTROLLER, abi: CA, functionName: 'getAccountLiquidity', args: [account] } as const,
        { address: COMPTROLLER, abi: CA, functionName: 'getBorrowingPower', args: [account] } as const,
        { address: COMPTROLLER, abi: CA, functionName: 'userPoolId', args: [account] } as const,
      ],
      allowFailure: false,
      blockNumber: block,
    })) as [bigint, readonly [bigint, bigint, bigint], readonly [bigint, bigint, bigint], bigint]
    return { url, block, rows, vai, liq, power, poolId }
  })
}
async function report(account: `0x${string}`, label: string): Promise<bigint> {
  console.log(`\n=== ${label}  ${account} ===`)
  const { url, block, rows, vai, liq, power, poolId } = await recompute(account)
  console.log(`rpc ${url}  block ${block}  entered markets ${rows.length}  userPoolId ${poolId}`)
  console.log(
    'market'.padEnd(10) + 'vTokenBalance'.padStart(15) + 'exchangeRateStored'.padStart(31) +
    'priceUsd'.padStart(31) + 'CF'.padStart(20) + 'LT'.padStart(20) +
    'collateralAtLT'.padStart(17) + 'debtUsd'.padStart(15),
  )
  let sumLt = 0n
  let sumCf = 0n
  let sumBorrow = vai
  for (const r of rows) {
    const denomLt = (((r.lt * r.exchangeRate) / E18) * r.price) / E18
    const denomCf = (((r.cf * r.exchangeRate) / E18) * r.price) / E18
    const collLt = (denomLt * r.vBalance) / E18
    const debt = (r.price * r.borrow) / E18
    sumLt += collLt
    sumCf += (denomCf * r.vBalance) / E18
    sumBorrow += debt
    console.log(
      r.symbol.padEnd(10) + String(r.vBalance).padStart(15) + String(r.exchangeRate).padStart(31) +
      String(r.price).padStart(31) + String(r.cf).padStart(20) + String(r.lt).padStart(20) +
      usd(collLt).padStart(17) + usd(debt).padStart(15),
    )
  }
  console.log(`getVAIRepayAmount            ${vai}`)
  console.log(`sumCollateral(LT) wei        ${sumLt}   = $${usd(sumLt)}`)
  console.log(`sumCollateral(CF) wei        ${sumCf}   = $${usd(sumCf)}`)
  console.log(`sumBorrowPlusEffects wei     ${sumBorrow}   = $${usd(sumBorrow)}`)
  console.log(`chain getAccountLiquidity    liquidity ${liq[1]}  shortfall ${liq[2]}`)
  console.log(`chain getBorrowingPower      liquidity ${power[1]}  shortfall ${power[2]}`)

  const localLt = sumLt - sumBorrow
  const chainLt = liq[1] - liq[2]
  check('recompute(LT) equals getAccountLiquidity', localLt === chainLt, `local ${localLt} chain ${chainLt}`)
  const localCf = sumCf - sumBorrow
  const chainCf = power[1] - power[2]
  check(
    'recompute(CF) equals getBorrowingPower',
    localCf === chainCf,
    `local ${localCf} chain ${chainCf}${localCf === chainCf ? '' : ' (bounded oracle differs from spot, see notes)'}`,
  )

  const hf = sumBorrow === 0n ? null : Number(sumLt) / Number(sumBorrow)
  if (hf !== null) {
    console.log(`hand check   HF = ${sumLt} / ${sumBorrow} = ${hf.toFixed(6)}`)
    console.log(`hand check   drop to HF 1 = (1 - 1/${hf.toFixed(6)}) * 100 = ${((1 - 1 / hf) * 100).toFixed(4)} %`)
  }
  await compareModule(account, hf, sumBorrow > 0n)
  return sumBorrow
}
/**
 * The module runs at its own block, seconds later, so debt has accrued and prices may have
 * moved. Compare to a tolerance rather than to the wei. The wei-exact comparison belongs to the
 * recompute above, where both sides sit on one block.
 */
async function compareModule(account: `0x${string}`, handHf: number | null, hasBorrow: boolean): Promise<void> {
  const rep = await readHealthFactor(account)
  console.log(`module  block ${rep.atBlock}  hf ${rep.healthFactor}  collateral ${rep.totalCollateralUsd}`)
  console.log(`module  borrow ${rep.totalBorrowUsd}  liquidity ${rep.liquidityUsd}  shortfall ${rep.shortfallUsd}`)
  console.log(`module  dropToLiquidation ${rep.priceDropToLiquidationPct} %  markets ${rep.markets.length}`)
  console.log(`module  formula ${rep.formula}`)
  check('module account echoes the query', rep.account.toLowerCase() === account.toLowerCase(), rep.account)
  check('module atBlock is a real height', rep.atBlock > 120_000_000, String(rep.atBlock))
  check('module readAt is recent', Math.abs(Date.now() - rep.readAt) < 120_000, String(rep.readAt))
  if (hasBorrow) {
    check('module healthFactor is a number', typeof rep.healthFactor === 'number', String(rep.healthFactor))
    check(
      'module healthFactor within 0.5 % of the hand computation',
      handHf !== null && rep.healthFactor !== null && Math.abs(rep.healthFactor - handHf) / handHf < 0.005,
      `module ${rep.healthFactor} hand ${handHf}`,
    )
    const c = rep.totalCollateralUsd
    const b = rep.totalBorrowUsd
    const l = rep.liquidityUsd
    const s = rep.shortfallUsd
    check(
      'collateral minus borrow equals liquidity minus shortfall',
      c !== null && b !== null && l !== null && s !== null && Math.abs(c - b - (l - s)) < Math.max(1, c * 0.005),
      `${c} - ${b} vs ${l} - ${s}`,
    )
    check(
      'healthFactor equals collateral over borrow',
      c !== null && b !== null && b > 0 && rep.healthFactor !== null &&
        Math.abs(rep.healthFactor - c / b) < 1e-9,
      `${rep.healthFactor} vs ${c !== null && b !== null ? c / b : 'n/a'}`,
    )
  } else {
    check('no borrow gives healthFactor null, not 0 and not Infinity', rep.healthFactor === null, String(rep.healthFactor))
    check('no borrow gives priceDropToLiquidationPct null', rep.priceDropToLiquidationPct === null, String(rep.priceDropToLiquidationPct))
  }
}
/** A supplier with no debt, to prove the null path is null rather than 0 or Infinity. */
async function findSupplyOnly(targets: VenusMarket[]): Promise<`0x${string}` | null> {
  const suppliers = await withRpc(async (c) => {
    const tip = await c.getBlockNumber()
    const seen = new Set<`0x${string}`>()
    for (const t of targets) {
      for (const [name, event] of [['Mint', MINT_EVENT] as const, ['Redeem', REDEEM_EVENT] as const]) {
        const logs = await c.getLogs({
          address: t.vToken as `0x${string}`,
          event,
          fromBlock: tip - BigInt(MAX_LOG_SPAN),
          toBlock: tip,
        })
        console.log(`scan  ${t.symbol} ${name} over ${MAX_LOG_SPAN} blocks to ${tip}: ${logs.length} events`)
        for (const log of logs.reverse()) {
          // Both events carry one address under a different name, so read them as one shape.
          const args = log.args as { minter?: `0x${string}`; redeemer?: `0x${string}` }
          const who = args.minter ?? args.redeemer
          if (who) seen.add(who)
        }
      }
    }
    return [...seen]
  })
  // A supply in a market the account never entered is not collateral to Venus either, so a
  // candidate with no entered market is skipped instead of being reported as an empty position.
  // Debt is compared in wei because a few wei of dust debt still rounds to $0.0000 on screen.
  let bare: `0x${string}` | null = null
  for (const m of suppliers.slice(0, 16)) {
    const { rows, vai } = await recompute(m)
    let debt = vai
    let collateral = 0n
    for (const r of rows) {
      debt += (r.price * r.borrow) / E18
      collateral += ((((r.lt * r.exchangeRate) / E18) * r.price) / E18) * r.vBalance / E18
    }
    console.log(
      `candidate ${m}  entered markets ${rows.length}  collateral $${usd(collateral)}  open debt ${debt} wei`,
    )
    if (debt !== 0n || rows.length === 0) continue
    // Collateral with no debt is the stronger case, because it shows null is not simply what an
    // empty account returns. A supplier holding nothing is kept only as a fallback.
    if (collateral > 0n) return m
    bare ??= m
  }
  return bare
}

const markets = await listMarkets()
console.log(`\n=== listMarkets ===`)
console.log(`markets ${markets.length}`)
for (const m of markets.slice(0, 6)) {
  console.log(
    `  ${m.symbol.padEnd(10)} vToken ${m.vToken}  underlying ${m.underlying}  decimals ${String(m.underlyingDecimals).padStart(2)}  cf ${m.collateralFactor}`,
  )
}
const allMarkets = (await withRpc((c) =>
  c.readContract({
    address: COMPTROLLER,
    abi: parseAbi(['function getAllMarkets() view returns (address[])']),
    functionName: 'getAllMarkets',
  }),
)) as readonly string[]
check('listMarkets matches getAllMarkets length', markets.length === allMarkets.length, `${markets.length} vs ${allMarkets.length}`)
check('every market has a symbol', markets.every((m) => m.symbol.length > 0), '')
check('every collateral factor is a fraction of one', markets.every((m) => m.collateralFactor >= 0 && m.collateralFactor <= 1), '')
check('every underlyingDecimals was read', markets.every((m) => m.underlyingDecimals >= 6 && m.underlyingDecimals <= 24), '')
const vBnb = markets.find((m) => m.symbol === 'vBNB')
check('vBNB is listed even though underlying() reverts', vBnb !== undefined, vBnb ? `underlying ${vBnb.underlying} decimals ${vBnb.underlyingDecimals}` : 'missing')

const targets = SCAN_SYMBOLS.map((s) => markets.find((m) => m.symbol === s)).filter(
  (m): m is VenusMarket => m !== undefined,
)
check(
  'scan targets resolved out of listMarkets',
  targets.length === SCAN_SYMBOLS.length,
  targets.map((t) => `${t.symbol} ${t.vToken}`).join(', '),
)

let scanned: `0x${string}` | null = null
for (const b of await scanBorrowers(targets)) {
  const debt = await debtOf(b)
  console.log(`candidate ${b}  open debt ${debt} wei ($${usd(debt)})`)
  if (debt > 0n) {
    scanned = b
    break
  }
}
if (scanned) await report(scanned, 'borrower found by the live Borrow scan')
else console.log('\nthe scan window held no borrower with open debt, which is a window fact')

const known = '0x61486edf787168addd1eb791bd7496977094d607' as const
const knownDebt = await report(known, 'multi-market borrower, eleven entered markets')
check('the account gated here has an open Venus borrow', knownDebt > 0n, `$${usd(knownDebt)} of debt`)

const supplyOnly = await findSupplyOnly(targets)
if (supplyOnly) await report(supplyOnly, 'supplier with no debt')
else {
  console.log('\nno supply-only account in the scan window, so the null path is shown on an unused account')
  await report('0x0000000000000000000000000000000000000000', 'no Venus position at all')
}

console.log(`\n${failures === 0 ? 'GATE PASS' : `GATE FAIL: ${failures} check(s) failed`}`)
process.exit(failures === 0 ? 0 : 1)
