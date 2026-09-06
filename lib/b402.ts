/**
 * The B402 hire path: the 402 a seller answers with, the exact bytes a buyer signs, then the
 * facilitator calls that verify and settle it.
 *
 * Two measured facts shape the whole file. B402 settles `eip3009` over U and USD1 only, so a
 * one-signature hire quotes in one of those two. Every EIP-712 domain here was derived then
 * matched against the token's own `DOMAIN_SEPARATOR()` before it was written down. A domain
 * guessed wrong does not fail loudly, it produces a signature that recovers to the wrong
 * address, which is why matching came first. docs/research/R17-binance-agent-os.md and
 * docs/research/R03-x402-b402.md carry the reads.
 *
 * What this file deliberately cannot do. BSC mainnet B402 access is granted on request and no
 * merchant credentials exist here, so `verifyPayment` and `settlePayment` refuse and name the
 * credential they are missing. Neither ever reports a payment that did not happen.
 */
import { getAddress } from 'viem'
import { createPrivateKey, createSign } from 'node:crypto'
import { B402, CHAIN, EIP712, PERMIT2, TOKENS } from './constants.ts'

/**
 * U's domain, derived because `eip712Domain()` reverts on this token. `name()` returns
 * "United Stables" on chain. Version "1" reproduces its on-chain DOMAIN_SEPARATOR
 * 0x358738403e5a61fdc30a8be78a60f289cbe4d2545b735a344b6229c70c1679b6 exactly, where version
 * "2" gives 0xa979004e3f8b7ce3772329e44fcdc8cc97bc7777fc99e0698b4e28a9c4ca07e2 and the name
 * "U" gives 0xd63e0976c5cbc2cc374be6701de5fff64e2eda4d1feeb73ed59472ed61fb5bff. So the pair is
 * settled by match and by exclusion. USD1 needs none of that work because it implements
 * ERC-5267, so its pair in constants was confirmed straight from `eip712Domain()`.
 */
const U_DOMAIN = { name: 'United Stables', version: '1' } as const

/** The two tokens B402 settles over `eip3009`, each with the domain it signs under. */
const EIP3009_TOKENS = {
  USD1: { address: TOKENS.USD1.address, domain: EIP712.domains.USD1 },
  U: { address: TOKENS.U.address, domain: U_DOMAIN },
} as const

/**
 * The buyer's authorization budget, not a settlement SLA. B402 publishes a synchronous settle
 * window of about 20 s and up to 45 s for large amounts. The reference facilitator rejects a
 * `validBefore` inside 6 s of now, so 300 s leaves the buyer room to sign without leaving a
 * long-lived authorization outstanding.
 */
const AUTHORIZATION_WINDOW_SECONDS = 300

/** x402 v2 names the retry header `PAYMENT-SIGNATURE`, so the 402 asks for that one. */
const PAYMENT_HEADER_MISSING = 'PAYMENT-SIGNATURE header is required'

export interface PaymentRequirements {
  scheme: string
  network: string
  asset: string
  maxAmountRequired: string
  payTo: string
  resource: string
  description: string
  mimeType: string
  maxTimeoutSeconds: number
  extra: { signerAddress?: string; spenderAddress?: string; name?: string; version?: string }
}

/**
 * The 402 a paid endpoint answers with. `priceBase` is atomic units, already scaled, because
 * every mainnet B402 token is 18 decimals and Binance shipped that wrong once: their
 * 2026-05-19 changelog records merchants pricing a cent at "10000" and charging 1e-14 of a
 * token. One cent of USD1 is 10000000000000000.
 *
 * Two field spellings need explaining, since both differ from the x402 v2 spec text. `scheme`
 * carries the B402 asset transfer method and `maxAmountRequired` is the v1 name for the
 * amount. That pair is not a mistake, it is the shape Binance's own live index publishes on
 * all 979 Bazaar entries and the shape lib/bazaar.ts parses, so a client that reads either one
 * of ours reads the same fields. B402's authenticated /verify wants the spec spelling instead,
 * `scheme` in {exact, upto} with the method moved to `extra.assetTransferMethod`. That rename
 * belongs at the call site rather than here, because the requirements object is echoed into the
 * payload the buyer signs against and rewriting one copy would leave the two disagreeing.
 * Nothing here has been round-tripped through /verify: there are no credentials to do it with.
 */
export function build402(input: {
  resource: string
  description: string
  priceBase: string
  token: 'USD1' | 'U'
  payTo: string
  network?: string
}): { status: 402; body: { x402Version: number; accepts: PaymentRequirements[]; error: string } } {
  const network = input.network ?? CHAIN.caip2
  // Only the mainnet token table was read from the chain. Testnet moves every address and puts
  // Mock U at 6 decimals, so quoting a mainnet asset there would name the wrong contract and
  // ask for 1e12 times the intended price.
  if (network !== CHAIN.caip2) {
    throw new Error(`no verified token table for ${network}, only ${CHAIN.caip2}`)
  }
  if (!/^[1-9][0-9]*$/.test(input.priceBase)) {
    throw new Error(`priceBase must be atomic units as a positive decimal string, got ${JSON.stringify(input.priceBase)}`)
  }
  if (!/^https?:\/\//i.test(input.resource)) {
    throw new Error(`resource must be an absolute http(s) URL, got ${JSON.stringify(input.resource)}`)
  }
  const token = EIP3009_TOKENS[input.token]
  const requirement: PaymentRequirements = {
    scheme: 'eip3009',
    network,
    asset: getAddress(token.address),
    maxAmountRequired: input.priceBase,
    // Checksummed here and in the typed data below, off the same input, so the seller address
    // in the 402 and the one inside `witness.to` are the same bytes and cannot fail a
    // recipient-mismatch check on a string compare.
    payTo: getAddress(input.payTo),
    resource: input.resource,
    description: input.description,
    mimeType: 'application/json',
    maxTimeoutSeconds: AUTHORIZATION_WINDOW_SECONDS,
    // `name` and `version` are the token's EIP-712 domain, which the buyer needs and cannot
    // read anywhere else. `signerAddress` is missing on purpose: B402 expects the merchant to
    // copy it out of a cached /supported response and we have no access to one. A placeholder
    // address would be a claim about who settles this. `spenderAddress` does not apply to
    // eip3009 at all.
    extra: { name: token.domain.name, version: token.domain.version },
  }
  return {
    status: 402,
    body: { x402Version: B402.x402Version, accepts: [requirement], error: PAYMENT_HEADER_MISSING },
  }
}

interface TypedField {
  readonly name: string
  readonly type: string
}

interface TypedDataDocument {
  types: Record<string, readonly TypedField[]>
  domain: Record<string, string | number>
  primaryType: string
  message: Record<string, unknown>
}

/** Four-field domain, typehash 0x8b73c3c6..400f, recomputed locally and matched. */
const EIP712_DOMAIN_FIELDS = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
] as const

/** Order is load bearing. It builds the type string, so the typehash follows from it. */
const TRANSFER_WITH_AUTHORIZATION_FIELDS = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' },
] as const

function uintString(value: number, field: string): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer of unix seconds, got ${value}`)
  }
  // Every numeric field travels the wire as a decimal string and signs as a uint256. viem takes
  // BigInt() over it, so the string and a bigint hash to the same bytes. The string is also the
  // one eth_signTypedData_v4 accepts and JSON can carry.
  return String(value)
}

/**
 * The one-signature path. The buyer signs this, sends no transaction and holds no BNB. The B402
 * facilitator submits `transferWithAuthorization` and pays the gas.
 *
 * `nonce` is 32 random bytes rather than a counter, which is the point of EIP-3009 over
 * EIP-2612: a buyer can hold many authorizations at once with no ordering between them. The
 * contract burns it on use, so reusing one is a replay the token itself rejects.
 */
export function transferWithAuthorizationTypedData(input: {
  token: 'USD1' | 'U'
  from: string
  to: string
  value: string
  validAfter: number
  validBefore: number
  nonce: string
  chainId?: number
}): unknown {
  if (!/^[1-9][0-9]*$/.test(input.value)) {
    throw new Error(`value must be atomic units as a positive decimal string, got ${JSON.stringify(input.value)}`)
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.nonce)) {
    throw new Error('nonce must be 32 random bytes as hex')
  }
  if (input.validBefore <= input.validAfter) {
    throw new Error(`validBefore ${input.validBefore} must be after validAfter ${input.validAfter}`)
  }
  const chainId = input.chainId ?? CHAIN.id
  // The address and the domain below are both mainnet. Neither survives a chain swap: on 97 the
  // mainnet U address holds no code and the real testnet token signs as name "U" at six decimals, so
  // any other chainId here yields a well-formed signature that no contract will ever honour. Refused
  // rather than returned, for the same reason build402 refuses a network it has no token table for.
  if (chainId !== CHAIN.id) {
    throw new Error(`no verified ${input.token} domain for chain ${chainId}, only ${CHAIN.id}`)
  }
  const token = EIP3009_TOKENS[input.token]
  const doc: TypedDataDocument = {
    types: {
      EIP712Domain: EIP712_DOMAIN_FIELDS,
      TransferWithAuthorization: TRANSFER_WITH_AUTHORIZATION_FIELDS,
    },
    // verifyingContract is the token, never the facilitator.
    domain: {
      name: token.domain.name,
      version: token.domain.version,
      chainId,
      verifyingContract: getAddress(token.address),
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: getAddress(input.from),
      to: getAddress(input.to),
      value: input.value,
      validAfter: uintString(input.validAfter, 'validAfter'),
      validBefore: uintString(input.validBefore, 'validBefore'),
      nonce: input.nonce.toLowerCase(),
    },
  }
  return doc
}

/**
 * Three fields, no `version` key. Permit2's own separator is built over
 * `EIP712Domain(string name,uint256 chainId,address verifyingContract)`, so adding a version
 * changes the separator and every signature comes back
 * `invalid_exact_evm_payload_signature`.
 */
const PERMIT2_DOMAIN_FIELDS = [
  { name: 'name', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
] as const

/**
 * Struct order and the struct names are both load bearing. `WITNESS_TYPE_STRING()` on the
 * deployed exact proxy returns
 * "Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)",
 * so these three arrays are what the contract enforces rather than what a doc describes.
 */
const PERMIT2_FIELDS = {
  PermitWitnessTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'witness', type: 'Witness' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  Witness: [
    { name: 'to', type: 'address' },
    { name: 'validAfter', type: 'uint256' },
  ],
} as const

/** Permit2 tracks the nonce as a bitmap, so it is a random uint256. Hex in, decimal out. */
function permit2Nonce(nonce: string): string {
  if (/^0x[0-9a-fA-F]{1,64}$/.test(nonce)) return BigInt(nonce).toString()
  if (/^[0-9]+$/.test(nonce)) return nonce
  throw new Error(`nonce must be a random uint256 as decimal or hex, got ${JSON.stringify(nonce)}`)
}

/**
 * The compatibility path, for any token with no EIP-3009 of its own. This builds the
 * `permit2-exact` witness. `permit2-upto` signs a third witness field, `facilitator`, between
 * `to` and `validAfter`, so it is a different type string and is not built here.
 *
 * `spender` is the x402 Permit2 proxy from `extra.spenderAddress`, never the facilitator EOA,
 * and it is an argument rather than a constant because Binance redeploys those proxies and says
 * to read the address fresh from /supported.
 *
 * `chainId` is open here where the 3009 path refuses anything but 56, because Permit2 sits at the
 * same address on both BSC chains and the token is a caller argument rather than a table lookup. The
 * three-field separator recomputed at chainId 97 equals the testnet contract's own
 * DOMAIN_SEPARATOR(), so a testnet signature off this function is real.
 *
 * Two things verify does not catch and settle does. The buyer must have run
 * `approve(Permit2, max)` once for this token, paying its own gas. Without it, settlement
 * reverts on chain with TRANSFER_FROM_FAILED. A finite approval works once then breaks, because
 * each transfer consumes it. So this path is not gasless on a buyer's first payment in a token.
 */
export function permit2TypedData(input: {
  token: string
  amount: string
  spender: string
  nonce: string
  deadline: number
  payTo: string
  validAfter: number
  chainId?: number
}): unknown {
  if (!/^[1-9][0-9]*$/.test(input.amount)) {
    throw new Error(`amount must be atomic units as a positive decimal string, got ${JSON.stringify(input.amount)}`)
  }
  const doc: TypedDataDocument = {
    types: { EIP712Domain: PERMIT2_DOMAIN_FIELDS, ...PERMIT2_FIELDS },
    domain: {
      name: 'Permit2',
      chainId: input.chainId ?? CHAIN.id,
      verifyingContract: getAddress(PERMIT2.address),
    },
    primaryType: PERMIT2.primaryType,
    message: {
      permitted: { token: getAddress(input.token), amount: input.amount },
      spender: getAddress(input.spender),
      nonce: permit2Nonce(input.nonce),
      deadline: uintString(input.deadline, 'deadline'),
      // `to` must equal paymentRequirements.payTo. Back-date validAfter by about a minute to
      // absorb clock skew, since it is checked against the settling block's timestamp. Replay
      // protection is the nonce, not this field.
      witness: { to: getAddress(input.payTo), validAfter: uintString(input.validAfter, 'validAfter') },
    },
  }
  return doc
}

/**
 * B402's transport codes, which arrive in the envelope's `code` field and are separate from the
 * payment reason inside `data`. Carried so a refusal renders as a sentence rather than a number.
 */
const TRANSPORT_CODES: Record<string, string> = {
  '1160101': 'system error',
  '1160102': 'system busy',
  '1160103': 'illegal parameter',
  '1160201': 'data not found',
  '1160202': 'duplicate data',
  '1160301': 'invalid status',
  '1160401': 'merchant not found',
  '1160402': 'merchant disabled',
  '1160403': 'amount exceeds single limit',
  '1160404': 'exceeds merchant daily limit',
  '1160405': 'exceeds payer daily limit',
  '1160406': 'payer blacklisted',
  '1160407': 'sanctioned address',
  '1160408': 'API rate limit exceeded',
}

const SUCCESS_CODE = '000000'

interface Credentials {
  baseUrl: string
  clientId: string
  accessToken: string
  privateKeyB64: string
}

/**
 * The authenticated base URL is not published anywhere, it ships with the credentials, so a
 * missing one is the normal state here rather than a misconfiguration.
 */
function credentials(baseUrl?: string): { creds: Credentials | null; missing: string[] } {
  const found = {
    baseUrl: (baseUrl ?? process.env['B402_BASE_URL'] ?? '').replace(/\/+$/, ''),
    clientId: process.env['B402_CLIENT_ID'] ?? '',
    accessToken: process.env['B402_ACCESS_TOKEN'] ?? '',
    privateKeyB64: process.env['B402_PRIVATE_KEY_B64'] ?? '',
  }
  const missing: string[] = []
  if (!found.baseUrl) missing.push('B402_BASE_URL')
  if (!found.clientId) missing.push('B402_CLIENT_ID')
  if (!found.accessToken) missing.push('B402_ACCESS_TOKEN')
  if (!found.privateKeyB64) missing.push('B402_PRIVATE_KEY_B64')
  return missing.length > 0 ? { creds: null, missing } : { creds: found, missing }
}

/**
 * The merchant signature, which authenticates us to the Binance gateway and has nothing to do
 * with the buyer's payment signature. RSA-SHA256 PKCS#1 v1.5 over the body bytes concatenated
 * with the millisecond timestamp, from a PKCS#8 DER key handed over as base64 with no PEM
 * header. The serialized body is passed in rather than re-serialized here, because a second
 * `JSON.stringify` with different key order would sign bytes the gateway never receives.
 */
function signedHeaders(body: string, creds: Credentials): Record<string, string> {
  const timestamp = String(Date.now())
  const key = createPrivateKey({
    key: Buffer.from(creds.privateKeyB64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  })
  return {
    'content-type': 'application/json',
    'X-Tesla-ClientId': creds.clientId,
    'X-Tesla-SignAccessToken': creds.accessToken,
    'X-Tesla-Timestamp': timestamp,
    'X-Tesla-Signature': createSign('RSA-SHA256').update(body + timestamp, 'utf8').sign(key, 'base64'),
  }
}

/**
 * The same three checks B402 runs before it looks at a payload, run here so a malformed
 * envelope costs nothing and comes back with the code B402 would have used.
 */
function envelopeFault(envelope: unknown): string | null {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) return 'invalid_payload'
  const e = envelope as Record<string, unknown>
  const version = e['x402Version']
  if (version !== undefined && version !== B402.x402Version) return 'invalid_x402_version'
  if (!e['paymentPayload'] || typeof e['paymentPayload'] !== 'object') return 'invalid_payload'
  if (!e['paymentRequirements'] || typeof e['paymentRequirements'] !== 'object') {
    return 'invalid_payment_requirements'
  }
  return null
}

type Posted =
  | { ok: true; data: Record<string, unknown>; raw: unknown }
  | { ok: false; reason: string; raw: unknown }

/**
 * One POST to the authenticated facilitator, with every refusal named. Success is never read
 * off the HTTP status, which is 200 on a declined payment too: it is read off the envelope
 * `code` and then off the field inside `data`.
 */
async function post(path: string, envelope: unknown, baseUrl?: string): Promise<Posted> {
  const fault = envelopeFault(envelope)
  if (fault) return { ok: false, reason: fault, raw: null }
  const { creds, missing } = credentials(baseUrl)
  if (!creds) return { ok: false, reason: `b402_credentials_missing: ${missing.join(' ')}`, raw: null }
  const body = JSON.stringify({
    ...(envelope as Record<string, unknown>),
    x402Version: B402.x402Version,
  })
  // A malformed key is named as a key problem rather than folded into a request failure, since
  // the two are fixed in different places.
  let headers: Record<string, string>
  try {
    headers = signedHeaders(body, creds)
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 160)
    return { ok: false, reason: `b402_signing_failed: ${msg}`, raw: null }
  }
  let res: Response
  try {
    res = await fetch(`${creds.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 160)
    return { ok: false, reason: `b402_request_failed: ${msg}`, raw: null }
  }
  let parsed: unknown = null
  try {
    parsed = await res.json()
  } catch {
    parsed = null
  }
  if (!res.ok) return { ok: false, reason: `b402_http_${res.status}`, raw: parsed }
  const env = (parsed ?? {}) as { code?: unknown; message?: unknown; data?: unknown }
  const code = typeof env.code === 'string' ? env.code : ''
  if (code !== SUCCESS_CODE) {
    const text = TRANSPORT_CODES[code] ?? (typeof env.message === 'string' ? env.message : 'unnamed')
    return { ok: false, reason: `b402_${code || 'no_code'}: ${text}`, raw: parsed }
  }
  if (!env.data || typeof env.data !== 'object') {
    return { ok: false, reason: 'b402_empty_data', raw: parsed }
  }
  return { ok: true, data: env.data as Record<string, unknown>, raw: parsed }
}

/**
 * Off-chain checks only. It commits nothing. Note what it does not catch: a missing
 * `approve(Permit2, max)` passes verify and fails at settle, so a green verify is not a promise
 * that the money will move.
 *
 * With no credentials configured this returns false with the variable names it wants. That is
 * the honest answer while mainnet access is on request. It is also why the reason field exists.
 */
export async function verifyPayment(
  envelope: unknown,
  baseUrl?: string,
): Promise<{ isValid: boolean; reason: string | null; raw: unknown }> {
  const sent = await post('/papi/v2/b402/verify', envelope, baseUrl)
  if (!sent.ok) return { isValid: false, reason: sent.reason, raw: sent.raw }
  if (sent.data['isValid'] === true) return { isValid: true, reason: null, raw: sent.raw }
  const reason = sent.data['invalidReason']
  return {
    isValid: false,
    reason: typeof reason === 'string' && reason !== '' ? reason : 'unexpected_verify_error',
    raw: sent.raw,
  }
}

/**
 * Settlement, which is asynchronous and idempotent on (nonce, network, payer), so polling it
 * cannot double charge. `transaction` is the discriminator, not `errorReason`: a non-null hash
 * with `success` false means the transfer is broadcast and unresolved, so poll every 3 to 5 s,
 * well past `maxTimeoutSeconds`, because the backend reconciles for up to about half an hour. A
 * null hash with a reason is terminal. Deliver the resource only on `success` true.
 */
export async function settlePayment(
  envelope: unknown,
  baseUrl?: string,
): Promise<{ success: boolean; transaction: string | null; errorReason: string | null; raw: unknown }> {
  const sent = await post('/papi/v2/b402/settle', envelope, baseUrl)
  if (!sent.ok) {
    return { success: false, transaction: null, errorReason: sent.reason, raw: sent.raw }
  }
  const hash = sent.data['transaction']
  const reason = sent.data['errorReason']
  return {
    success: sent.data['success'] === true,
    transaction: typeof hash === 'string' && hash !== '' ? hash : null,
    errorReason: typeof reason === 'string' && reason !== '' ? reason : null,
    raw: sent.raw,
  }
}
