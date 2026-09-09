/**
 * [doc 08] The fee schedule and what this deployment actually charges. 08-MONEY section 9 fixes
 * the documented schedule: a flat floor of 0.01 with 200 bps taking over above the crossover, and
 * a minimum brokered price of 0.10 below which Muster does not broker at all. Pure logic, no db and
 * no network, covered by lib/fee.test.ts.
 *
 * This deployment takes NO fee. The buyer signs exactly the operator's price and nothing else, and
 * the 402 challenge price stays authoritative on any contradiction. documentedFee() exists only to
 * show, transparently, what the published schedule would charge, so the disclosure is a checkable
 * arithmetic rather than a bare claim. The schedule is denominated in an 18-decimal token at
 * nominal parity for sizing only, which is the same convention 08-MONEY uses, and no peg is asserted.
 */

export const FEE_SCHEDULE = {
  basisPoints: 200,
  /** 0.01 at 18 decimals. The flat floor. */
  floorBase: '10000000000000000',
  /** 0.10 at 18 decimals. Below this price Muster does not broker, so no fee applies. */
  minBrokeredBase: '100000000000000000',
  decimals: 18,
} as const

/** This deployment takes no fee. Stated as a constant so the pages and the tests read one source. */
export const DEPLOYMENT_TAKES_FEE = false

export interface DocumentedFee {
  brokered: boolean
  feeBase: string
  bindingLeg: 'floor' | 'percentage' | 'both' | 'not brokered'
}

/**
 * The fee the published schedule WOULD charge on a price, for disclosure only. Multiplication
 * before division and truncation toward zero, so the percentage leg never rounds up against the
 * buyer. A price below the minimum brokered price is not brokered, so the schedule charges nothing.
 */
export function documentedFee(priceBase: string): DocumentedFee {
  if (!/^[0-9]+$/.test(priceBase)) return { brokered: false, feeBase: '0', bindingLeg: 'not brokered' }
  const price = BigInt(priceBase)
  if (price < BigInt(FEE_SCHEDULE.minBrokeredBase)) return { brokered: false, feeBase: '0', bindingLeg: 'not brokered' }
  const floor = BigInt(FEE_SCHEDULE.floorBase)
  const pct = (price * BigInt(FEE_SCHEDULE.basisPoints)) / 10000n
  const feeBase = pct > floor ? pct : floor
  const bindingLeg: DocumentedFee['bindingLeg'] = pct === floor ? 'both' : pct > floor ? 'percentage' : 'floor'
  return { brokered: true, feeBase: feeBase.toString(), bindingLeg }
}

/** What this deployment charges in fees: nothing, on every listing. */
export function chargedFeeBase(): string {
  return '0'
}
