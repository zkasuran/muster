import { listMarkets, readHealthFactor } from '../lib/venus.ts'
import { isSafeUrl } from '../worker/probe.ts'

console.log('=== which Venus markets have implausible decimals? ===')
const ms = await listMarkets()
for (const m of ms.filter((x) => x.underlyingDecimals < 6 || x.underlyingDecimals > 18))
  console.log(`  ${m.symbol.padEnd(10)} dec=${m.underlyingDecimals} vToken=${m.vToken} underlying=${m.underlying}`)
console.log(`  total markets=${ms.length}, out of range=${ms.filter((x) => x.underlyingDecimals < 6 || x.underlyingDecimals > 18).length}`)
const byDec = new Map<number, number>()
for (const m of ms) byDec.set(m.underlyingDecimals, (byDec.get(m.underlyingDecimals) ?? 0) + 1)
console.log('  decimals distribution:', JSON.stringify([...byDec].sort((a, b) => a[0] - b[0])))

console.log('\n=== find a real Venus borrower from recent Borrow events ===')
const { createPublicClient, http, parseAbiItem } = await import('viem')
const { bsc } = await import('viem/chains')
const c = createPublicClient({ chain: bsc, transport: http('https://bsc-rpc.publicnode.com', { timeout: 25000 }) })
const head = await c.getBlockNumber()
const BORROW = parseAbiItem('event Borrow(address borrower, uint256 borrowAmount, uint256 accountBorrows, uint256 totalBorrows)')
const borrowers = new Set<string>()
for (const m of ms.slice(0, 12)) {
  try {
    const logs = await c.getLogs({ address: m.vToken as `0x${string}`, event: BORROW, fromBlock: head - 4000n, toBlock: head })
    for (const l of logs) if (l.args.borrower) borrowers.add(l.args.borrower)
    if (borrowers.size >= 4) break
  } catch { /* some markets are paused or have no events in the window */ }
}
console.log(`  borrowers found in the last 4000 blocks: ${borrowers.size}`)
for (const b of [...borrowers].slice(0, 4)) {
  const r = await readHealthFactor(b)
  const hf = r.healthFactor === null ? 'null' : r.healthFactor.toFixed(4)
  console.log(`  ${b}`)
  console.log(`    hf=${hf} collateral=$${r.totalCollateralUsd?.toFixed(2) ?? 'null'} borrow=$${r.totalBorrowUsd?.toFixed(2) ?? 'null'} drop=${r.priceDropToLiquidationPct?.toFixed(2) ?? 'null'}%`)
  for (const mk of r.markets.filter((x) => x.suppliedUsd > 0 || x.borrowedUsd > 0))
    console.log(`      ${mk.symbol.padEnd(8)} supplied=$${mk.suppliedUsd.toFixed(2).padStart(12)} borrowed=$${mk.borrowedUsd.toFixed(2).padStart(12)} cf=${mk.collateralFactor}`)
  if (r.totalCollateralUsd && r.totalBorrowUsd) {
    const weighted = r.markets.reduce((s, mk) => s + mk.suppliedUsd * mk.collateralFactor, 0)
    console.log(`      hand check: weighted collateral $${weighted.toFixed(2)} / borrow $${r.totalBorrowUsd.toFixed(2)} = ${(weighted / r.totalBorrowUsd).toFixed(4)}  module said ${hf}`)
  }
}

console.log('\n=== SSRF: a HOSTNAME that resolves to a private address is the real attack ===')
for (const u of [
  'http://localtest.me/x',
  'http://127.0.0.1.nip.io/x',
  'http://10.0.0.1.nip.io/x',
  'http://169.254.169.254.nip.io/latest/meta-data/',
  'http://metadata.google.internal/computeMetadata/v1/',
]) {
  const v = isSafeUrl(u)
  console.log(`  ${v.ok ? '!! ALLOWED' : 'refused   '} ${u.padEnd(50)} ${v.reason ?? ''}`)
}
