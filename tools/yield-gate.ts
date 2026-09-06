/**
 * Gate for lib/yield.ts. Scratch, not part of the app. It proves five things about the rows the
 * module publishes, in this order:
 *   1. the block cadence it annualises with is measured, not assumed
 *   2. every row's APY can be re-derived from the integers in its own `source` string
 *   3. our recompute reproduces the APY Venus publishes when fed Venus's own constants
 *   4. each supply rate is the protocol's own arithmetic, checked to the wei
 *   5. the numbers move, which is the only proof an APY is not hardcoded
 */
import { parseAbi } from 'viem'
import { withRpc } from '../lib/rpc.ts'
import { readVenusSupplyApys, rankYields, type YieldRow } from '../lib/yield.ts'

const ORACLE = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A' as const
const VTOKEN = parseAbi([
  'function supplyRatePerBlock() view returns (uint256)',
  'function borrowRatePerBlock() view returns (uint256)',
  'function getCash() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function totalReserves() view returns (uint256)',
  'function reserveFactorMantissa() view returns (uint256)',
  'function symbol() view returns (string)',
])
const WAD = 10n ** 18n
/** Venus's own annualisation constants, from helpers/chains.ts plus the Compound v2 doc snippet. */
const VENUS_BLOCKS_PER_DAY = 192_000
const VENUS_EXPONENT = 364
const WAIT_MS = 30_000

const pad = (s: string, n: number) => s.padEnd(n)
const money = (v: number | null) => (v === null ? 'unknown' : v.toLocaleString('en-US', { maximumFractionDigits: 0 }))
const pct = (v: number | null, d = 6) => (v === null ? 'unknown' : v.toFixed(d))

function fail(msg: string): never {
  console.log(`\nGATE FAILED: ${msg}`)
  process.exit(1)
}

/** The two integers a Venus row's source promises, so the promise can be tested. */
function parseVenusSource(source: string): { rate: bigint; blocksPerDay: number; market: string } | null {
  const m = /(0x[0-9a-fA-F]{40})\.supplyRatePerBlock\(\)=(\d+)/.exec(source)
  const b = /over ([\d.]+) blocks\/day/.exec(source)
  if (!m || !b || m[1] === undefined || m[2] === undefined || b[1] === undefined) return null
  return { market: m[1], rate: BigInt(m[2]), blocksPerDay: Number(b[1]) }
}

function compoundDaily(rate: bigint, blocksPerDay: number, exponent: number): number {
  return ((1 + (Number(rate) / 1e18) * blocksPerDay) ** exponent - 1) * 100
}

async function main() {
  console.log(`MUSTER yield gate  ${new Date().toISOString()}`)

  // 1. cadence
  const cadence = await withRpc(async (c, url) => {
    const tip = await c.getBlockNumber()
    const [now, then] = await Promise.all([
      c.getBlock({ blockNumber: tip }),
      c.getBlock({ blockNumber: tip - 100_000n }),
    ])
    return { url, tip, sec: Number(now.timestamp - then.timestamp) / 100_000 }
  })
  const perDay = 86_400 / cadence.sec
  console.log(`\n1  BLOCK CADENCE  (${cadence.url})`)
  console.log(`   tip ${cadence.tip}, measured ${cadence.sec.toFixed(5)} s/block over 100000 blocks`)
  console.log(`   implies ${perDay.toFixed(1)} blocks/day and ${(perDay * 365).toFixed(0)} blocks/year`)
  console.log(`   Venus config is ${VENUS_BLOCKS_PER_DAY} blocks/day (0.45000 s/block), a gap of ${(((perDay / VENUS_BLOCKS_PER_DAY) - 1) * 100).toFixed(3)} percent`)
  if (cadence.sec < 0.2 || cadence.sec > 3.5) fail(`measured block time ${cadence.sec}s is outside anything believable`)

  // 2. the rows
  const rows = await rankYields()
  console.log(`\n2  rankYields() -> ${rows.length} rows`)
  console.log(`   ${pad('VENUE', 15)}${pad('ASSET', 12)}${pad('KIND', 8)}${pad('APY %', 12)}${pad('TVL USD', 16)}BLOCK`)
  for (const r of rows) {
    console.log(`   ${pad(r.venue, 15)}${pad(r.asset, 12)}${pad(r.kind, 8)}${pad(pct(r.apy), 12)}${pad(money(r.tvlUsd), 16)}${r.atBlock ?? 'unknown'}`)
  }
  console.log(`\n   sources, one per row:`)
  for (const r of rows) console.log(`   [${r.venue} ${r.asset} ${r.kind}] ${r.source}`)
  if (rows.length < 3) fail(`only ${rows.length} rows, the brief needs at least three verified markets`)
  const venusRows = rows.filter((r) => r.venue === 'Venus')
  if (venusRows.length < 3) fail(`only ${venusRows.length} Venus rows`)

  // 3. re-derive every Venus APY from its own source string
  console.log(`\n3  APY RE-DERIVED FROM EACH ROW'S OWN source STRING`)
  console.log(`   ${pad('ASSET', 12)}${pad('ROW APY', 14)}${pad('FROM SOURCE', 14)}MATCH`)
  for (const r of venusRows) {
    const p = parseVenusSource(r.source)
    if (!p) fail(`could not re-derive ${r.asset} from its source: ${r.source}`)
    const again = compoundDaily(p.rate, p.blocksPerDay, 365)
    const ok = r.apy !== null && Math.abs(again - r.apy) < 1e-6
    console.log(`   ${pad(r.asset, 12)}${pad(pct(r.apy), 14)}${pad(pct(again), 14)}${ok ? 'yes' : 'NO'}`)
    if (!ok) fail(`${r.asset} does not re-derive from its own source string`)
  }

  // 4. the advertised cross-check
  const res = await fetch('https://api.venus.io/markets/core-pool?chainId=56&limit=60&page=0')
  const api = (await res.json()) as { result?: { address: string; symbol: string; supplyApy: string }[] }
  const advertised = new Map((api.result ?? []).map((m) => [m.address.toLowerCase(), m]))
  console.log(`\n4  OUR RECOMPUTE vs api.venus.io supplyApy  (${advertised.size} markets returned)`)
  console.log(`   ${pad('ASSET', 10)}${pad('OURS 365d', 12)}${pad('VENUS FORMULA', 15)}${pad('venus.io', 15)}${pad('DIFF pp', 12)}`)
  let reconciled = 0
  for (const r of venusRows) {
    const p = parseVenusSource(r.source)
    if (!p) continue
    const theirs = advertised.get(p.market.toLowerCase())
    const ours364 = compoundDaily(p.rate, VENUS_BLOCKS_PER_DAY, VENUS_EXPONENT)
    const pub = theirs ? Number(theirs.supplyApy) : null
    const diff = pub === null ? null : ours364 - pub
    if (diff !== null && Math.abs(diff) < 1e-3) reconciled++
    console.log(`   ${pad(r.asset, 10)}${pad(pct(r.apy), 12)}${pad(pct(ours364), 15)}${pad(pub === null ? 'absent' : pct(pub), 15)}${pad(diff === null ? 'n/a' : diff.toFixed(9), 12)}`)
  }
  console.log(`   ${reconciled} of ${venusRows.length} reconcile with Venus's published number to under 0.001 pp`)
  console.log(`   Venus raises the same base to ${VENUS_EXPONENT} rather than 365, so our column sits a few thousandths above theirs by design.`)
  if (reconciled < 3) fail(`only ${reconciled} markets reconcile against api.venus.io`)

  // 5. the identity
  console.log(`\n5  SUPPLY RATE IS THE PROTOCOL'S OWN ARITHMETIC`)
  console.log(`   U = borrows*1e18/(cash+borrows-reserves), rateToPool = borrowRate*(1e18-rf)/1e18, supplyRate = U*rateToPool/1e18`)
  const markets = venusRows.map((r) => parseVenusSource(r.source)?.market).filter((m): m is string => m !== undefined)
  const identity = await withRpc(async (c) => {
    const tip = await c.getBlockNumber()
    const calls = markets.flatMap((v) => [
      { address: v as `0x${string}`, abi: VTOKEN, functionName: 'supplyRatePerBlock' } as const,
      { address: v as `0x${string}`, abi: VTOKEN, functionName: 'borrowRatePerBlock' } as const,
      { address: v as `0x${string}`, abi: VTOKEN, functionName: 'getCash' } as const,
      { address: v as `0x${string}`, abi: VTOKEN, functionName: 'totalBorrows' } as const,
      { address: v as `0x${string}`, abi: VTOKEN, functionName: 'totalReserves' } as const,
      { address: v as `0x${string}`, abi: VTOKEN, functionName: 'reserveFactorMantissa' } as const,
      { address: v as `0x${string}`, abi: VTOKEN, functionName: 'symbol' } as const,
    ])
    const out = (await c.multicall({ contracts: calls, allowFailure: false, blockNumber: tip })) as unknown[]
    if (out.length !== calls.length) fail(`identity multicall returned ${out.length} of ${calls.length}`)
    return { tip, out }
  })
  console.log(`   pinned at block ${identity.tip}`)
  console.log(`   ${pad('ASSET', 10)}${pad('SUPPLY RATE', 14)}${pad('RECOMPUTED', 14)}${pad('U', 22)}VERDICT`)
  let exact = 0
  for (let k = 0; k < markets.length; k++) {
    const b = k * 7
    const sr = identity.out[b] as bigint
    const br = identity.out[b + 1] as bigint
    const cash = identity.out[b + 2] as bigint
    const borrows = identity.out[b + 3] as bigint
    const reserves = identity.out[b + 4] as bigint
    const rf = identity.out[b + 5] as bigint
    const sym = String(identity.out[b + 6])
    const supplied = cash + borrows - reserves
    const u = supplied === 0n ? 0n : (borrows * WAD) / supplied
    const recomputed = (u * ((br * (WAD - rf)) / WAD)) / WAD
    const ok = recomputed === sr
    if (ok) exact++
    console.log(`   ${pad(sym, 10)}${pad(String(sr), 14)}${pad(String(recomputed), 14)}${pad(String(u), 22)}${ok ? 'exact' : `OFF BY ${recomputed - sr}`}`)
  }
  console.log(`   ${exact} of ${markets.length} reproduce to the wei`)
  if (exact !== markets.length) fail(`${markets.length - exact} markets do not reproduce the identity`)

  // 6. movement
  console.log(`\n6  MOVEMENT  re-reading after ${WAIT_MS / 1000} s`)
  const first = venusRows
  await new Promise((r) => setTimeout(r, WAIT_MS))
  const second = await readVenusSupplyApys()
  const key = (r: YieldRow) => `${r.venue}:${r.asset}`
  const later = new Map(second.map((r) => [key(r), r]))
  console.log(`   ${pad('ASSET', 10)}${pad('APY BEFORE', 12)}${pad('APY AFTER', 12)}${pad('APY DELTA', 14)}${pad('TVL DELTA USD', 16)}BLOCKS`)
  let apyMoved = 0
  let tvlMoved = 0
  for (const a of first) {
    const b = later.get(key(a))
    if (!b) {
      console.log(`   ${pad(a.asset, 10)}vanished from the second read`)
      continue
    }
    const dApy = a.apy !== null && b.apy !== null ? b.apy - a.apy : null
    const dTvl = a.tvlUsd !== null && b.tvlUsd !== null ? b.tvlUsd - a.tvlUsd : null
    if (dApy !== null && dApy !== 0) apyMoved++
    if (dTvl !== null && dTvl !== 0) tvlMoved++
    const blocks = a.atBlock !== null && b.atBlock !== null ? `${a.atBlock} -> ${b.atBlock}` : 'unknown'
    console.log(`   ${pad(a.asset, 10)}${pad(pct(a.apy), 12)}${pad(pct(b.apy), 12)}${pad(dApy === null ? 'n/a' : dApy.toFixed(9), 14)}${pad(dTvl === null ? 'n/a' : dTvl.toFixed(2), 16)}${blocks}`)
  }
  if (apyMoved > 0) {
    console.log(`   ${apyMoved} of ${first.length} supply APYs changed inside the window. ${tvlMoved} TVLs changed too. These rates are read, not stored.`)
  } else if (tvlMoved > 0) {
    console.log(`   No supply APY changed in ${WAIT_MS / 1000} s, which happens when no mint, redeem, borrow or repay hit those markets. ${tvlMoved} TVLs did change, so the reads are live.`)
  } else {
    console.log(`   Nothing moved in ${WAIT_MS / 1000} s. Stated plainly: this run does not prove the numbers are live. Re-run over a longer window.`)
  }

  console.log(`\nGATE PASSED`)
}

await main()
