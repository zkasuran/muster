/**
 * The search query grammar, docs/03-TAXONOMY.md section 5.6. One box. Bare terms are ANDed and
 * matched against name, description, declared skills and the agent id. An `operator:value` clause
 * narrows, a leading `-` inverts it. Every operator maps to a stored column, so nothing here is a
 * free-text filter wearing a facet's clothes. The value sets are published so an unknown
 * operator or an unknown value is an error that names the valid set rather than a silently wrong
 * result.
 *
 * This parser is pure: it never touches the store or the network. lib/queries.ts turns a ParsedQuery
 * into SQL. The operators are the ones the shipped schema can actually answer. The document lists a
 * few more (venue, attestation, reachability) that have no column behind them today, so they are not
 * offered here rather than accepted and quietly ignored.
 */
import { TOKENS } from './constants.ts'

/** Each operator with the value set it accepts. An empty array means a free value (an id or address). */
export const OPERATOR_VALUES = {
  is: ['live', 'indexed', 'hireable', 'first-party', 'duplicate', 'x402'],
  tag: ['rebalancing', 'grid-trading', 'yield', 'health-factor'],
  tier: ['registered', 'declared', 'reachable', 'probed', 'payable', 'settled'],
  rail: ['eip3009', 'permit2-exact', 'permit2-upto'],
  token: Object.keys(TOKENS),
  answered: ['5m', '1h', '24h', 'ever', 'never'],
  owner: [] as string[],
  agent: [] as string[],
  cluster: [] as string[],
} as const

export type OperatorName = keyof typeof OPERATOR_VALUES
export const OPERATORS = Object.keys(OPERATOR_VALUES) as OperatorName[]

/** Operators whose value is a free-form id or address rather than one of a fixed set. */
const FREE_VALUE: ReadonlySet<OperatorName> = new Set<OperatorName>(['owner', 'agent', 'cluster'])
/** Operators that accept a `>=value` comparison as well as an exact value. */
const GTE_OK: ReadonlySet<OperatorName> = new Set<OperatorName>(['tier'])

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/
const AGENT_ID_RE = /^(0|[1-9][0-9]*)$/

export interface Clause {
  op: OperatorName
  value: string
  negate: boolean
  /** Only meaningful for operators in GTE_OK: the clause is `>= value` on the rung ladder. */
  gte: boolean
}

export interface ParseError {
  /** The operator as typed, so the message can name it. */
  op: string
  value: string
  /** `operator` when the operator is unknown, `value` when the operator is known but the value is not. */
  kind: 'operator' | 'value'
}

export interface ParsedQuery {
  /** Bare words, ANDed and matched against name, description, declared skills and the id. */
  terms: string[]
  clauses: Clause[]
  /** Unknown operator or unknown value. When this is non-empty the page runs nothing and names them. */
  errors: ParseError[]
}

function valueOk(op: OperatorName, value: string): boolean {
  if (FREE_VALUE.has(op)) {
    if (op === 'owner') return ADDRESS_RE.test(value)
    if (op === 'agent') return AGENT_ID_RE.test(value)
    return value.length > 0
  }
  if (op === 'token') {
    // A published symbol or any 20-byte address.
    return (OPERATOR_VALUES.token as readonly string[]).includes(value) || ADDRESS_RE.test(value)
  }
  return (OPERATOR_VALUES[op] as readonly string[]).includes(value)
}

/**
 * Parse a raw query string into terms, clauses and errors. Tokens are whitespace separated, so a
 * value carries no space. A token shaped `op:value` (optionally `-op:value`) is a clause, anything
 * else is a bare term.
 */
export function parseQuery(raw: string): ParsedQuery {
  const terms: string[] = []
  const clauses: Clause[] = []
  const errors: ParseError[] = []
  const tokens = raw.trim().split(/\s+/).filter(Boolean)

  for (const tok of tokens) {
    const negate = tok.startsWith('-')
    const body = negate ? tok.slice(1) : tok
    const m = /^([a-zA-Z][a-zA-Z0-9-]*):(.*)$/.exec(body)
    if (!m) {
      if (body) terms.push(body)
      continue
    }
    const op = (m[1] ?? '').toLowerCase()
    const rawValue = m[2] ?? ''
    if (!(OPERATORS as string[]).includes(op)) {
      errors.push({ op, value: rawValue, kind: 'operator' })
      continue
    }
    const opName = op as OperatorName
    let gte = false
    let value = rawValue
    if (GTE_OK.has(opName) && value.startsWith('>=')) {
      gte = true
      value = value.slice(2)
    }
    if (!valueOk(opName, value)) {
      errors.push({ op: opName, value: rawValue, kind: 'value' })
      continue
    }
    clauses.push({ op: opName, value, negate, gte })
  }

  return { terms, clauses, errors }
}

/** The token symbol to address map, so `token:USD1` and a raw address both resolve. */
export function tokenAddress(value: string): string {
  const t = (TOKENS as Record<string, { address: string }>)[value]
  return t ? t.address : value
}
