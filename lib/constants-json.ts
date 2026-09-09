/**
 * [doc 10] The one machine-readable constants file docs/10-DOCS-AND-POLICY.md section 4 condition 6
 * asks for: every constant a builder needs in one place, served at GET /constants.json. It is
 * generated from lib/constants.ts and lib/fee.ts rather than typed, so it cannot drift from the
 * values the running code reads. Every address and decimal in here was read from chain, with the
 * provenance in docs/01-GROUND-TRUTH.md and docs/research/VERIFIED-payment-rail.md.
 *
 * The document is deterministic: no timestamp, no origin, no request state. That is on purpose, so
 * lib/provenance.ts can fingerprint the exact served bytes and a stranger can diff the prose in
 * docs/10 against these machine values. It carries a `license` string with the SPDX id, which
 * section 6 requires of every JSON document we author and publish.
 */
import { CHAIN, REGISTRY, TOKENS, EIP712, PERMIT2, B402, SHELVES } from './constants.ts'
import { FEE_SCHEDULE, DEPLOYMENT_TAKES_FEE } from './fee.ts'

export const CONSTANTS_LICENSE = 'LicenseRef-zkasuran-SAND-1.0'

interface TokenConstant {
  address: string
  symbol: string
  decimals: number
  eip3009: boolean
  permit: boolean
  b402: string[]
  isDefaultQuote?: boolean
}

/** Build the constants document from the code's own tables. Pure, deterministic, no I/O. */
export function constantsDocument(): Record<string, unknown> {
  const tokens: Record<string, TokenConstant> = {}
  for (const [key, t] of Object.entries(TOKENS)) {
    const entry: TokenConstant = {
      address: t.address,
      symbol: t.symbol,
      decimals: t.decimals,
      eip3009: t.eip3009,
      permit: t.permit,
      b402: [...t.b402],
    }
    if ('isDefaultQuote' in t && t.isDefaultQuote) entry.isDefaultQuote = true
    tokens[key] = entry
  }

  return {
    $comment:
      'Machine-readable constants for Muster on BNB Smart Chain. Generated from lib/constants.ts ' +
      'and lib/fee.ts. Every address and decimal was read from chain, see docs/01-GROUND-TRUTH.md. ' +
      'Read decimals() at runtime rather than trusting this table, which the token docs call the ' +
      'source of truth.',
    license: CONSTANTS_LICENSE,
    chain: {
      id: CHAIN.id,
      caip2: CHAIN.caip2,
      name: CHAIN.name,
      testnetId: CHAIN.testnetId,
      testnetCaip2: CHAIN.testnetCaip2,
    },
    registry: {
      identity: REGISTRY.identity,
      reputation: REGISTRY.reputation,
      identityCounterSlot: REGISTRY.identityCounterSlot,
    },
    tokens,
    eip712: {
      domainTypehash: EIP712.domainTypehash,
      transferWithAuthorizationTypehash: EIP712.transferWithAuthorizationTypehash,
      receiveWithAuthorizationTypehash: EIP712.receiveWithAuthorizationTypehash,
      domains: {
        USD1: { name: EIP712.domains.USD1.name, version: EIP712.domains.USD1.version },
        FDUSD: { name: EIP712.domains.FDUSD.name, version: EIP712.domains.FDUSD.version },
      },
    },
    permit2: {
      address: PERMIT2.address,
      domainSeparatorBsc: PERMIT2.domainSeparatorBsc,
      primaryType: PERMIT2.primaryType,
    },
    b402: {
      bazaarBase: B402.bazaarBase,
      x402Version: B402.x402Version,
      mainnetAccess: B402.mainnetAccess,
    },
    shelves: [...SHELVES],
    fee: {
      basisPoints: FEE_SCHEDULE.basisPoints,
      floorBase: FEE_SCHEDULE.floorBase,
      minBrokeredBase: FEE_SCHEDULE.minBrokeredBase,
      decimals: FEE_SCHEDULE.decimals,
      deploymentTakesFee: DEPLOYMENT_TAKES_FEE,
    },
  }
}

/**
 * The exact bytes served at /constants.json and fingerprinted by lib/provenance.ts. Two-space
 * pretty print over an object built in a fixed key order, so the string is stable run to run.
 */
export function constantsJson(): string {
  return JSON.stringify(constantsDocument(), null, 2)
}
