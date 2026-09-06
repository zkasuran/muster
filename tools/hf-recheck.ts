import { readHealthFactor } from '../lib/venus.ts'
for (const b of ['0xed87331DcAe2ed002c42EdD102fEf91bd2BdB0bE', '0x6143821F107559c2be6084bC425896089A895a1c']) {
  const r = await readHealthFactor(b)
  const rows = r.markets.filter((m) => m.suppliedUsd > 0 || m.borrowedUsd > 0)
  const weighted = rows.reduce((s, m) => s + m.suppliedUsd * m.liquidationThreshold, 0)
  const sumWeightedCol = rows.reduce((s, m) => s + m.weightedCollateralUsd, 0)
  console.log(`  ${b.slice(0, 12)} hf=${r.healthFactor?.toFixed(4)} totalCollateral=$${r.totalCollateralUsd?.toFixed(2)} borrow=$${r.totalBorrowUsd?.toFixed(2)}`)
  for (const m of rows) console.log(`    ${m.symbol.padEnd(8)} supplied=$${m.suppliedUsd.toFixed(2).padStart(11)} cf=${m.collateralFactor} lt=${m.liquidationThreshold} weighted=$${m.weightedCollateralUsd.toFixed(2).padStart(11)} borrowed=$${m.borrowedUsd.toFixed(2)}`)
  console.log(`    sum(weightedCollateralUsd)=$${sumWeightedCol.toFixed(2)}  vs totalCollateralUsd=$${r.totalCollateralUsd?.toFixed(2)}  ${Math.abs(sumWeightedCol - (r.totalCollateralUsd ?? 0)) < 0.02 ? 'RECONCILES' : 'MISMATCH'}`)
  console.log(`    supplied x lt = $${weighted.toFixed(2)} -> hf ${(weighted / (r.totalBorrowUsd ?? 1)).toFixed(4)}`)
}
