/**
 * Verified constants. Every value here was read from the chain or from a primary source
 * and matched, on the date given. Nothing in this file is copied from a blog post or a
 * third-party palette site.
 *
 * The provenance for each block is docs/01-GROUND-TRUTH.md and
 * docs/research/VERIFIED-payment-rail.md. If a value here disagrees with a document,
 * this file is wrong until a fresh read says otherwise.
 */

export const CHAIN = {
  /** BNB Smart Chain mainnet. `cast chain-id` returned 56 on 2026-09-05. */
  id: 56,
  caip2: 'eip155:56',
  name: 'BNB Smart Chain',
  /** Testnet, where B402 is open without an access request. */
  testnetId: 97,
  testnetCaip2: 'eip155:97',
} as const

/**
 * The same two addresses appear on every EVM chain 8004scan lists. Both are proxies of
 * about 120 bytes, so who holds the upgrade key is a live risk recorded in docs/14-GAPS.md.
 */
export const REGISTRY = {
  /**
   * ERC-721. Verified 2026-09-05: name() "AgentIdentity", symbol() "AGENT",
   * supportsInterface(0x80ac58cd) true, ownerOf(1) 0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029,
   * tokenURI(1) a data:application/json;base64 URI decoding to "ClawNews".
   *
   * totalSupply() REVERTS. It is not ERC721Enumerable, so the agent set can only be
   * enumerated from Registered and Transfer logs. Never call totalSupply here.
   */
  identity: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputation: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  /**
   * Storage slot holding the registration counter. Reading it returned 334935 at block
   * 120,027,164 (2026-09-05T02:02:32Z), which is how the population is measured without
   * an enumerable supply.
   */
  identityCounterSlot:
    '0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00',
} as const

/**
 * Every BSC stablecoin below is 18 decimals. Code carried from a 6-decimal USDC chain is
 * wrong here by a factor of a trillion, so read decimals() at runtime rather than
 * trusting this table, which is what Binance's own docs call the source of truth.
 */
export const TOKENS = {
  /** United Stables. EIP-3009 and permit present on impl 0xbef21313c69c009fd7d9510a8d3a481a32473dfc. No cancelAuthorization. */
  U: {
    address: '0xcE24439F2D9C6a2289F741120FE202248B666666',
    symbol: 'U',
    decimals: 18,
    eip3009: true,
    permit: true,
    b402: ['eip3009', 'permit2-exact', 'permit2-upto'],
  },
  /** World Liberty Financial USD. Full EIP-3009 including cancelAuthorization, plus ERC-5267 eip712Domain(). */
  USD1: {
    address: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
    symbol: 'USD1',
    decimals: 18,
    eip3009: true,
    permit: true,
    b402: ['eip3009', 'permit2-exact', 'permit2-upto'],
    /** Default quote token. 958 of the 989 payment options in B402 Bazaar price in USD1. */
    isDefaultQuote: true,
  },
  /** BSC-USD. Supports NEITHER EIP-3009 NOR EIP-2612. Permit2 is the only signature path. */
  USDT: {
    address: '0x55d398326f99059fF775485246999027B3197955',
    symbol: 'USDT',
    decimals: 18,
    eip3009: false,
    permit: false,
    b402: ['permit2-exact', 'permit2-upto'],
  },
  /** Binance-Peg USDC, 18 decimals. Circle lists no native USDC on BNB Smart Chain at all. */
  USDC: {
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    symbol: 'USDC',
    decimals: 18,
    eip3009: false,
    permit: false,
    b402: ['permit2-exact', 'permit2-upto'],
  },
} as const

/** EIP-712 domains, each derived then matched against the on-chain DOMAIN_SEPARATOR. */
export const EIP712 = {
  domainTypehash:
    '0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f',
  transferWithAuthorizationTypehash:
    '0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267',
  receiveWithAuthorizationTypehash:
    '0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8',
  domains: {
    USD1: { name: 'World Liberty Financial USD', version: '1' },
    /** FDUSD implements EIP-3009 but B402 does not accept it, so it is not a quote option. */
    FDUSD: { name: 'First Digital USD', version: '1' },
  },
} as const

/**
 * Canonical Permit2, verified deployed on BSC with 9152 bytes of code. Its EIP-712 domain
 * carries NO version key: adding one changes the separator and B402 /verify rejects the
 * signature as invalid_exact_evm_payload_signature.
 */
export const PERMIT2 = {
  address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  domainSeparatorBsc:
    '0x4142cc3c823f819c467fa4437d637fe20589a31dfcd1da2ff22292c9ed9344e7',
  primaryType: 'PermitWitnessTransferFrom',
} as const

/** Binance B402. Read endpoints need no key. Settlement needs a merchant developer account. */
export const B402 = {
  bazaarBase: 'https://www.binance.com/bapi/ramp/v1/public/ramp/b402',
  x402Version: 2,
  /** Mainnet settlement is granted on request, so testnet is the provable path. */
  mainnetAccess: 'on-request',
} as const

/** The four shelves the rubric requires at equal depth. Order is the nav order. */
export const SHELVES = [
  'rebalancing',
  'grid-trading',
  'yield',
  'health-factor',
] as const

export type Shelf = (typeof SHELVES)[number]
