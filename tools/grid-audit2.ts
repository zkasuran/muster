/**
 * Second audit pass on lib/grid.ts: the degenerate bands, the average buy price inside
 * breakoutRule, and the factory claim the file's header leans on. Fresh client again, no
 * lib/rpc.ts.
 *
 * Run: node --experimental-strip-types --no-warnings tools/grid-audit2.ts
 */
import { createPublicClient, http, parseAbi } from 'viem'
import { bsc } from 'viem/chains'
import { planGrid } from '../lib/grid.ts'

const POOL = '0x172fcD41E0913e95784454622d1c3724f546f849'
const V3_FACTORY = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865'
const FACTORY_ABI = parseAbi(['function feeAmountTickSpacing(uint24 fee) view returns (int24)'])

const client = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-rpc.publicnode.com', { timeout: 20_000, retryCount: 1 }),
})

let pass = 0
let fail = 0
function check(label: string, ok: boolean, detail = ''): void {
  if (ok) pass++
  else fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `   ${detail}` : ''}`)
}
function n(v: number, digits = 10): string {
  return Number.isFinite(v) ? Number(v.toPrecision(digits)).toString() : String(v)
}

console.log('E. the fee tier table the header cites, read off the factory')
for (const fee of [100, 500, 2500, 3000, 10000] as const) {
  const spacing = await client.readContract({
    address: V3_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'feeAmountTickSpacing',
    args: [fee],
  })
  const want = fee === 3000 ? 0 : fee === 100 ? 1 : fee === 500 ? 10 : fee === 2500 ? 50 : 200
  check(`feeAmountTickSpacing(${fee}) is ${want}`, spacing === want, String(spacing))
}

console.log('\nF. band that starts at the mark, so every level is a sell')
const allSell = await planGrid({ pool: POOL, lowerPct: 0, upperPct: 10, levelCount: 6, capitalQuote: 20_000 })
console.log(`  mark ${n(allSell.markPrice, 8)} quote ${n(allSell.capitalRequiredQuote)} base ${n(allSell.capitalRequiredBase, 8)}`)
console.log(`  warnings ${JSON.stringify(allSell.warnings)}`)
console.log(`  breakoutRule ${allSell.breakoutRule}`)
check('a ladder was still produced', allSell.levels.length === 6)
check('every level rests as a sell', allSell.levels.every((l) => l.side === 'sell'))
check('quote capital required is zero because no level buys', allSell.capitalRequiredQuote === 0, n(allSell.capitalRequiredQuote))
check('base inventory is not zero', allSell.capitalRequiredBase > 0, n(allSell.capitalRequiredBase, 8))
check('the note says base is needed up front instead of quote', allSell.warnings.some((w) => /up front rather than/.test(w)))
check('breakoutRule admits there is no buy side under the mark', /no buy side under the mark/.test(allSell.breakoutRule))

console.log('\nG. band that ends at the mark')
const allBuy = await planGrid({ pool: POOL, lowerPct: 10, upperPct: 0, levelCount: 6, capitalQuote: 20_000 })
const sells = allBuy.levels.filter((l) => l.side === 'sell')
const top = allBuy.levels[allBuy.levels.length - 1]
console.log(`  mark ${n(allBuy.markPrice, 17)} top level ${top ? n(top.price, 17) : 'missing'} sells ${sells.length}`)
console.log(`  quote ${n(allBuy.capitalRequiredQuote)} base ${n(allBuy.capitalRequiredBase, 8)} warnings ${JSON.stringify(allBuy.warnings)}`)
check('a ladder was still produced', allBuy.levels.length === 6)
check('the top level lands on the mark to the last bit', !!top && top.price === allBuy.markPrice, top ? `${top.price} vs ${allBuy.markPrice}` : 'missing')
check('the level sitting on the mark rests as a sell', sells.length === 1, `${sells.length} sells`)
check('quote capital funds the five buys', Math.abs(allBuy.capitalRequiredQuote - 5 * (20_000 / 6)) < 1e-9, n(allBuy.capitalRequiredQuote))

console.log('\nH. the average buy price quoted in breakoutRule')
const plan = await planGrid({ pool: POOL, lowerPct: 10, upperPct: 10, levelCount: 11, capitalQuote: 20_000 })
let spent = 0
let bought = 0
let sellInv = 0
for (const l of plan.levels) {
  if (l.side === 'buy') {
    spent += l.notionalQuote
    bought += l.sizeBase
  } else sellInv += l.sizeBase
}
const avg = spent / bought
console.log(`  spent ${n(spent, 12)} bought ${n(bought, 12)} average ${n(avg, 12)}`)
console.log(`  breakoutRule ${plan.breakoutRule}`)
check('the average buy sits between the lower bound and the mark', avg > plan.lower && avg < plan.markPrice, `${n(avg, 10)} in ${n(plan.lower, 10)}..${n(plan.markPrice, 10)}`)
check('it is the notional weighted average, which is the harmonic mean of the buy prices', Math.abs(avg - spent / bought) < 1e-12)
check('breakoutRule prints that same average to six figures', plan.breakoutRule.includes(String(Number(avg.toPrecision(6)))), String(Number(avg.toPrecision(6))))
check('breakoutRule prints the whole downside inventory, sells plus buys', plan.breakoutRule.includes(String(Number((bought + sellInv).toPrecision(6)))), String(Number((bought + sellInv).toPrecision(6))))
check('the drawdown figure is bigger than the bought amount alone', bought + sellInv > bought)

console.log('\nI. capital reconciliation a buyer can check')
const markValue = plan.capitalRequiredQuote + plan.capitalRequiredBase * plan.markPrice
console.log(`  quote ${n(plan.capitalRequiredQuote, 12)} plus ${n(plan.capitalRequiredBase, 12)} base at the mark is ${n(markValue, 12)} against capitalQuote 20000`)
check('the two capital legs together stay inside the capital supplied', markValue <= 20_000 + 1e-9, n(markValue, 12))
check('they are within 3% of it, so the plan deploys what it was given', markValue / 20_000 > 0.97, n(markValue / 20_000, 6))

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exitCode = 1
