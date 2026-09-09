/**
 * [doc 08] Small money helpers shared by the ledger page, the receipt page and the fee
 * disclosure. Pure logic, no db and no network, so they are covered by lib/money.test.ts.
 *
 * Amounts are rendered from a base-unit integer string with BigInt, never through a float,
 * because a float loses a wei at 18 decimals and an amount a buyer cannot reconcile against the
 * chain is worse than none (08-MONEY section 12).
 */
import { TOKENS } from './constants.ts'

export interface TokenLabel {
  symbol: string
  decimals: number | null
  address: string
  known: boolean
}

/** Resolve a token address to its symbol and decimals from the verified table, case-insensitively. */
export function tokenLabel(address: string): TokenLabel {
  const a = address.toLowerCase()
  for (const t of Object.values(TOKENS)) {
    if (t.address.toLowerCase() === a) {
      return { symbol: t.symbol, decimals: t.decimals, address: t.address, known: true }
    }
  }
  return { symbol: 'unknown token', decimals: null, address, known: false }
}

/**
 * A base-unit integer string as a decimal string, exact to the wei. Trailing zeros in the
 * fraction are trimmed. Returns 'unknown' for anything that is not a non-negative integer string.
 */
export function formatTokenAmount(base: string, decimals: number | null): string {
  if (!/^[0-9]+$/.test(base)) return 'unknown'
  if (decimals === null) return `${base} base units`
  const b = BigInt(base)
  const d = 10n ** BigInt(decimals)
  const whole = b / d
  const frac = b % d
  if (frac === 0n) return whole.toString()
  const fs = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole}.${fs}`
}

/** '0.02 USD1' from a base-unit string and a token address, for a one-line price. */
export function amountWithSymbol(base: string, tokenAddress: string): string {
  const t = tokenLabel(tokenAddress)
  return `${formatTokenAmount(base, t.decimals)} ${t.symbol}`
}
