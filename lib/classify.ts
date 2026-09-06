/**
 * Shelf classification. A category here is a capability contract, not a tag, so an agent
 * enters a shelf by matching what that shelf actually asks for and stays there only while a
 * probe agrees. docs/03-TAXONOMY.md owns the contracts and this file implements them.
 *
 * Text is the only signal available at index time. The declared skills are OASF taxonomy
 * paths like `analytical_skills/mathematical_reasoning/geometry`, measured across the live
 * population, and none of them describe a DeFi capability. So the contract matches name,
 * description and declared service kinds, then the prober is what moves a row above the
 * declared rung. A match here is a candidate and never a claim.
 */
import type { Shelf } from './types.ts'

export interface CategoryContract {
  shelf: Shelf
  title: string
  /** The question a buyer is asking when they open this shelf. */
  question: string
  inputs: string[]
  outputs: string[]
  units: string
  /** Strong signals. One hit is enough to make a candidate. */
  strong: RegExp[]
  /** Supporting signals. Two are needed, because one is too weak on its own. */
  weak: RegExp[]
  /** Present and the row is rejected from this shelf however strong the rest looks. */
  exclude: RegExp[]
}

export const CONTRACTS: readonly CategoryContract[] = [
  {
    shelf: 'rebalancing',
    title: 'Rebalancing',
    question: 'My allocation has drifted. What should I move, and what will it cost?',
    inputs: ['wallet address or position set', 'target weights', 'drift tolerance', 'slippage ceiling'],
    outputs: ['an ordered set of swaps', 'expected cost in basis points', 'post-trade weights'],
    units: 'percent of portfolio, basis points of cost',
    strong: [/\brebalanc\w*/i, /\bportfolio\s+(re)?balanc/i, /\bdrift\s+correct/i, /\blp\s+range\s+manage/i],
    weak: [/\ballocation\b/i, /\btarget\s+weight/i, /\bportfolio\b/i, /\bposition\s+size/i, /\brange\s+order/i],
    exclude: [/\bairdrop\s+farm/i],
  },
  {
    shelf: 'grid-trading',
    title: 'Grid trading',
    question: 'Run a grid in this range. How many levels, what size, and what happens if it breaks out?',
    inputs: ['pair', 'upper and lower bound', 'level count', 'order size', 'breakout rule'],
    outputs: ['the level ladder', 'filled and open orders', 'realised and unrealised result'],
    units: 'price levels, order size in base units, result in quote units',
    strong: [/\bgrid\s*(trad|bot|strateg|plann)/i, /\bgrid\b(?=.*\b(range|level|bot|order)\b)/i, /\bdca\s+grid/i],
    weak: [/\blevels?\b/i, /\bupper\s+bound/i, /\blower\s+bound/i, /\brange\s+bound/i, /\blimit\s+order/i],
    exclude: [/\bpower\s+grid/i, /\bgrid\s*(layout|css|design)/i],
  },
  {
    shelf: 'yield',
    title: 'Yield',
    question: 'Where does this capital earn the most right now, after cost, and how sure is that?',
    inputs: ['token and amount', 'risk ceiling', 'lock tolerance', 'venue allowlist'],
    outputs: ['a ranked route', 'APY with its components', 'the read it was computed from'],
    units: 'APY as a percentage, TVL in USD',
    strong: [/\byield\s*(optimi|farm|aggregat|rout|strateg|rank)/i, /\bapy\b/i, /\bapr\b/i, /\bstaking\s+reward/i, /\bliquidity\s+mining/i],
    weak: [/\byield\b/i, /\bfarm\w*/i, /\bvault\b/i, /\bstake\b/i, /\bcompound\w*/i, /\bventus|venus\b/i, /\blista\b/i],
    exclude: [/\byield\s+curve\s+(analysis|research)\s+only/i],
  },
  {
    shelf: 'health-factor',
    title: 'Health factor',
    question: 'How close is this loan to liquidation, and what is the cheapest way to step back?',
    inputs: ['borrower address', 'market', 'a health floor to defend'],
    outputs: ['health factor now', 'the price move that liquidates', 'a repay or top-up plan'],
    units: 'health factor as a ratio, price distance as a percentage',
    strong: [/\bhealth\s*factor/i, /\bliquidation\s*(risk|protect|guard|prevent|monitor)/i, /\bcollateral\s+ratio/i, /\bpre-?liquidat/i],
    weak: [/\bliquidat\w*/i, /\bcollateral\b/i, /\bborrow\w*/i, /\blending\b/i, /\bloan\b/i, /\bltv\b/i, /\bvenus\b/i, /\baave\b/i],
    exclude: [/\bliquidity\s+pool\s+only/i],
  },
] as const

export interface Classification {
  shelf: Shelf
  /** 'strong' when a strong signal hit, 'weak' when two supporting ones did. */
  basis: 'strong' | 'weak'
  matched: string[]
}

/**
 * Classify one agent from what it declared. Returns every shelf it qualifies for, because an
 * agent that genuinely does two things should appear on both, and the one-listing-per-shelf
 * constraint in the store is what stops that becoming a flood.
 */
export function classify(input: {
  name?: string | null
  description?: string | null
  skills?: string[]
  serviceKinds?: string[]
}): Classification[] {
  const haystack = [
    input.name ?? '',
    input.description ?? '',
    (input.skills ?? []).join(' '),
    (input.serviceKinds ?? []).join(' '),
  ]
    .join('  ')
    .slice(0, 4_000)

  if (haystack.trim() === '') return []

  const out: Classification[] = []
  for (const c of CONTRACTS) {
    if (c.exclude.some((re) => re.test(haystack))) continue
    const strong = c.strong.filter((re) => re.test(haystack))
    if (strong.length > 0) {
      out.push({ shelf: c.shelf, basis: 'strong', matched: strong.map(String) })
      continue
    }
    const weak = c.weak.filter((re) => re.test(haystack))
    if (weak.length >= 2) {
      out.push({ shelf: c.shelf, basis: 'weak', matched: weak.map(String) })
    }
  }
  return out
}

export function contractFor(shelf: Shelf): CategoryContract {
  const c = CONTRACTS.find((x) => x.shelf === shelf)
  if (!c) throw new Error(`no contract for shelf ${shelf}`)
  return c
}

export const SHELF_TITLES: Record<Shelf, string> = {
  rebalancing: 'Rebalancing',
  'grid-trading': 'Grid trading',
  yield: 'Yield',
  'health-factor': 'Health factor',
}
