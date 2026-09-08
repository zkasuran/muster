/**
 * Adversarial inputs against lib/grid.ts. The brief says refuse rather than return nonsense, so
 * this pass looks for any accepted input whose plan carries a NaN, an Infinity or a zero price.
 *
 * Run: node --experimental-strip-types --no-warnings tools/grid-adverse.ts
 */
import { planGrid } from '../lib/grid.ts'

const POOL_WBNB = '0x172fcD41E0913e95784454622d1c3724f546f849'
const POOL_STABLE = '0x92b7807bF19b7DDdf89b706143896d05228f3121'

interface Case {
  label: string
  input: Parameters<typeof planGrid>[0]
}

const cases: Case[] = [
  {
    label: 'lowerPct just under 100, which rounds to 100 in a double',
    input: { pool: POOL_WBNB, lowerPct: 99.99999999999999999, upperPct: 10, levelCount: 5, capitalQuote: 20_000 },
  },
  {
    label: 'lowerPct 99.999999',
    input: { pool: POOL_WBNB, lowerPct: 99.999999, upperPct: 10, levelCount: 5, capitalQuote: 20_000 },
  },
  {
    label: 'upperPct 1e308, finite but overflows the product',
    input: { pool: POOL_WBNB, lowerPct: 10, upperPct: 1e308, levelCount: 5, capitalQuote: 20_000 },
  },
  {
    label: 'upperPct 1e300',
    input: { pool: POOL_WBNB, lowerPct: 10, upperPct: 1e300, levelCount: 5, capitalQuote: 20_000 },
  },
  {
    label: 'lowerPct 1e-300, a band narrower than a double can hold',
    input: { pool: POOL_WBNB, lowerPct: 1e-300, upperPct: 1e-300, levelCount: 5, capitalQuote: 20_000 },
  },
  {
    label: 'capitalQuote 1e308 with two levels',
    input: { pool: POOL_WBNB, lowerPct: 10, upperPct: 10, levelCount: 2, capitalQuote: 1e308 },
  },
  {
    label: 'capitalQuote negative',
    input: { pool: POOL_WBNB, lowerPct: 10, upperPct: 10, levelCount: 5, capitalQuote: -20_000 },
  },
  {
    label: 'levelCount 200, the cap itself, on a wide band',
    input: { pool: POOL_WBNB, lowerPct: 90, upperPct: 900, levelCount: 200, capitalQuote: 5_000_000 },
  },
  {
    label: 'dust capital on a pool where gas cannot be priced',
    input: { pool: POOL_STABLE, lowerPct: 1, upperPct: 1, levelCount: 5, capitalQuote: 0.001 },
  },
]

let bad = 0
for (const c of cases) {
  const plan = await planGrid(c.input)
  const nonFinite: string[] = []
  const walk = (name: string, v: number): void => {
    if (!Number.isFinite(v)) nonFinite.push(`${name}=${v}`)
  }
  walk('markPrice', plan.markPrice)
  walk('lower', plan.lower)
  walk('upper', plan.upper)
  walk('spacingPct', plan.spacingPct)
  walk('capitalRequiredQuote', plan.capitalRequiredQuote)
  walk('capitalRequiredBase', plan.capitalRequiredBase)
  for (const l of plan.levels) {
    walk(`levels[${l.index}].price`, l.price)
    walk(`levels[${l.index}].sizeBase`, l.sizeBase)
    walk(`levels[${l.index}].notionalQuote`, l.notionalQuote)
  }
  const zeroPrice = plan.levels.some((l) => l.price === 0)
  const refused = plan.levels.length === 0
  const verdict = nonFinite.length > 0 || zeroPrice ? 'NONSENSE' : refused ? 'refused ' : 'planned '
  if (nonFinite.length > 0 || zeroPrice) bad++
  console.log(
    `${verdict} ${c.label}\n         levels ${plan.levels.length} spacing ${plan.spacingPct} lower ${plan.lower} upper ${plan.upper}`,
  )
  if (nonFinite.length > 0) console.log(`         non finite: ${nonFinite.slice(0, 6).join(' ')}`)
  if (zeroPrice) console.log('         a level is priced at zero')
  if (plan.warnings.length > 0) console.log(`         warnings ${JSON.stringify(plan.warnings).slice(0, 300)}`)
}

console.log(`\n${cases.length - bad} of ${cases.length} inputs produced a sane plan or an honest refusal`)
if (bad > 0) process.exitCode = 1
