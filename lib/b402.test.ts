/**
 * The 402 a seller answers with and the exact bytes a buyer signs. Every address asserted
 * here is the checksummed form of the value in lib/constants.ts, because the 402 and the
 * typed data are compared by string in the facilitator and a case mismatch is a refusal.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  build402,
  paymentRequiredHeaders,
  transferWithAuthorizationTypedData,
  permit2TypedData,
  verifyPayment,
  settlePayment,
} from './b402.ts'

const USD1 = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d'
const U = '0xcE24439F2D9C6a2289F741120FE202248B666666'
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'
const SELLER = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
const BUYER = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'
/** One cent of an 18-decimal token, the figure the file's own comment pins. */
const ONE_CENT = '10000000000000000'
const RESOURCE = 'https://muster.zkasuran.dev/api/hire/1'

interface TypedDoc {
  types: Record<string, readonly { name: string; type: string }[]>
  domain: Record<string, string | number>
  primaryType: string
  message: Record<string, unknown>
}

function ok402() {
  return build402({
    resource: RESOURCE,
    description: 'One rebalancing plan.',
    priceBase: ONE_CENT,
    token: 'USD1',
    payTo: SELLER.toLowerCase(),
  })
}

test('build402 answers 402 with one USD1 eip3009 requirement', () => {
  const r = ok402()
  assert.equal(r.status, 402)
  assert.equal(r.body.x402Version, 2)
  assert.equal(r.body.error, 'PAYMENT-SIGNATURE header is required')
  assert.equal(r.body.accepts.length, 1)
  const a = r.body.accepts[0]
  assert.ok(a)
  assert.equal(a.scheme, 'eip3009')
  assert.equal(a.network, 'eip155:56')
  assert.equal(a.asset, USD1)
  // Both spellings carry the same price, so a v1 or a v2 client reads the same number.
  assert.equal(a.maxAmountRequired, ONE_CENT)
  assert.equal(a.amount, ONE_CENT)
  // Given lowercase, returned checksummed, so it string-compares equal to the typed data.
  assert.equal(a.payTo, SELLER)
  assert.equal(a.resource, RESOURCE)
  assert.equal(a.description, 'One rebalancing plan.')
  assert.equal(a.mimeType, 'application/json')
  assert.equal(a.maxTimeoutSeconds, 300)
  assert.equal(a.extra.name, 'World Liberty Financial USD')
  assert.equal(a.extra.version, '1')
  // No placeholder settler address, because there is no /supported response to read one from.
  assert.equal(a.extra.signerAddress, undefined)
  assert.equal(a.extra.spenderAddress, undefined)
})

test('build402 quotes U under its own derived domain', () => {
  const r = build402({ resource: RESOURCE, description: 'x', priceBase: '1', token: 'U', payTo: SELLER })
  const a = r.body.accepts[0]
  assert.ok(a)
  assert.equal(a.asset, U)
  assert.equal(a.extra.name, 'United Stables')
  assert.equal(a.extra.version, '1')
})

test('build402 refuses a resource that is not an absolute http(s) URL', () => {
  for (const resource of ['/api/hire/1', 'muster.zkasuran.dev/api', 'ipfs://bafy', '']) {
    assert.throws(
      () => build402({ resource, description: 'x', priceBase: ONE_CENT, token: 'USD1', payTo: SELLER }),
      /resource must be an absolute http\(s\) URL/,
    )
  }
})

test('build402 refuses a price that is not positive atomic units', () => {
  for (const priceBase of ['0.01', '0', '', '1e16', '-1', '01']) {
    assert.throws(
      () => build402({ resource: RESOURCE, description: 'x', priceBase, token: 'USD1', payTo: SELLER }),
      /priceBase must be atomic units as a positive decimal string/,
    )
  }
})

test('build402 refuses testnet, where the token table was never read', () => {
  assert.throws(
    () =>
      build402({
        resource: RESOURCE,
        description: 'x',
        priceBase: ONE_CENT,
        token: 'USD1',
        payTo: SELLER,
        network: 'eip155:97',
      }),
    /no verified token table for eip155:97, only eip155:56/,
  )
})

test('paymentRequiredHeaders base64-encodes exactly the 402 body', () => {
  const body = ok402().body
  const headers = paymentRequiredHeaders(body)
  assert.equal(headers['cache-control'], 'no-store')
  const encoded = headers['PAYMENT-REQUIRED']
  assert.ok(encoded)
  const decoded = Buffer.from(encoded, 'base64').toString('utf8')
  assert.equal(decoded, JSON.stringify(body))
  assert.deepEqual(JSON.parse(decoded), body)
})

test('transferWithAuthorizationTypedData signs against the USD1 token on chain 56', () => {
  const doc = transferWithAuthorizationTypedData({
    token: 'USD1',
    from: BUYER.toLowerCase(),
    to: SELLER.toLowerCase(),
    value: ONE_CENT,
    validAfter: 1_757_000_000,
    validBefore: 1_757_000_300,
    nonce: `0x${'AB'.repeat(32)}`,
  }) as TypedDoc
  assert.equal(doc.primaryType, 'TransferWithAuthorization')
  assert.equal(doc.domain['name'], 'World Liberty Financial USD')
  assert.equal(doc.domain['version'], '1')
  assert.equal(doc.domain['chainId'], 56)
  // The token, never the facilitator.
  assert.equal(doc.domain['verifyingContract'], USD1)
  // Field order builds the type string, so it decides the typehash.
  assert.deepEqual(
    doc.types['TransferWithAuthorization']?.map((f) => `${f.type} ${f.name}`),
    ['address from', 'address to', 'uint256 value', 'uint256 validAfter', 'uint256 validBefore', 'bytes32 nonce'],
  )
  assert.deepEqual(
    doc.types['EIP712Domain']?.map((f) => f.name),
    ['name', 'version', 'chainId', 'verifyingContract'],
  )
  assert.equal(doc.message['from'], BUYER)
  assert.equal(doc.message['to'], SELLER)
  assert.equal(doc.message['value'], ONE_CENT)
  // Numbers travel as decimal strings so JSON can carry them and viem still hashes uint256.
  assert.equal(doc.message['validAfter'], '1757000000')
  assert.equal(doc.message['validBefore'], '1757000300')
  assert.equal(doc.message['nonce'], `0x${'ab'.repeat(32)}`)
})

test('transferWithAuthorizationTypedData uses the derived U domain for U', () => {
  const doc = transferWithAuthorizationTypedData({
    token: 'U',
    from: BUYER,
    to: SELLER,
    value: '1',
    validAfter: 0,
    validBefore: 1,
    nonce: `0x${'11'.repeat(32)}`,
  }) as TypedDoc
  assert.equal(doc.domain['name'], 'United Stables')
  assert.equal(doc.domain['version'], '1')
  assert.equal(doc.domain['verifyingContract'], U)
})

test('transferWithAuthorizationTypedData refuses any chain but 56', () => {
  assert.throws(
    () =>
      transferWithAuthorizationTypedData({
        token: 'U',
        from: BUYER,
        to: SELLER,
        value: '1',
        validAfter: 0,
        validBefore: 1,
        nonce: `0x${'11'.repeat(32)}`,
        chainId: 97,
      }),
    /no verified U domain for chain 97, only 56/,
  )
})

test('transferWithAuthorizationTypedData refuses a bad value, nonce or window', () => {
  const base = {
    token: 'USD1' as const,
    from: BUYER,
    to: SELLER,
    value: ONE_CENT,
    validAfter: 100,
    validBefore: 400,
    nonce: `0x${'11'.repeat(32)}`,
  }
  assert.throws(() => transferWithAuthorizationTypedData({ ...base, value: '0' }), /value must be atomic units/)
  assert.throws(() => transferWithAuthorizationTypedData({ ...base, nonce: '0x1234' }), /nonce must be 32 random bytes/)
  assert.throws(
    () => transferWithAuthorizationTypedData({ ...base, validAfter: 400, validBefore: 400 }),
    /validBefore 400 must be after validAfter 400/,
  )
  assert.throws(
    () => transferWithAuthorizationTypedData({ ...base, validAfter: 1.5 }),
    /validAfter must be a non-negative integer of unix seconds/,
  )
})

test('permit2TypedData signs a three-field domain with no version key', () => {
  const doc = permit2TypedData({
    token: '0x55d398326f99059ff775485246999027b3197955',
    amount: ONE_CENT,
    spender: SELLER,
    nonce: '0xff',
    deadline: 1_757_000_300,
    payTo: SELLER.toLowerCase(),
    validAfter: 1_757_000_000,
  }) as TypedDoc
  assert.equal(doc.primaryType, 'PermitWitnessTransferFrom')
  assert.equal(doc.domain['name'], 'Permit2')
  assert.equal(doc.domain['chainId'], 56)
  assert.equal(doc.domain['verifyingContract'], PERMIT2_ADDRESS)
  // A version key here changes the separator and every signature comes back invalid.
  assert.equal('version' in doc.domain, false)
  assert.deepEqual(
    doc.types['EIP712Domain']?.map((f) => f.name),
    ['name', 'chainId', 'verifyingContract'],
  )
  assert.deepEqual(doc.types['Witness']?.map((f) => f.name), ['to', 'validAfter'])
  // Permit2 tracks the nonce as a bitmap word, so hex in comes out decimal.
  assert.equal(doc.message['nonce'], '255')
  assert.equal(doc.message['deadline'], '1757000300')
  assert.deepEqual(doc.message['permitted'], {
    token: '0x55d398326f99059fF775485246999027B3197955',
    amount: ONE_CENT,
  })
  assert.deepEqual(doc.message['witness'], { to: SELLER, validAfter: '1757000000' })
})

test('permit2TypedData is open on chainId, because Permit2 sits at one address on both chains', () => {
  const doc = permit2TypedData({
    token: USD1,
    amount: '1',
    spender: SELLER,
    nonce: '7',
    deadline: 10,
    payTo: SELLER,
    validAfter: 0,
    chainId: 97,
  }) as TypedDoc
  assert.equal(doc.domain['chainId'], 97)
  assert.equal(doc.message['nonce'], '7')
})

test('permit2TypedData refuses a bad amount or nonce', () => {
  const base = {
    token: USD1,
    amount: '1',
    spender: SELLER,
    nonce: '1',
    deadline: 10,
    payTo: SELLER,
    validAfter: 0,
  }
  assert.throws(() => permit2TypedData({ ...base, amount: '0' }), /amount must be atomic units/)
  assert.throws(() => permit2TypedData({ ...base, nonce: 'zzz' }), /nonce must be a random uint256/)
})

// These two never reach the network: the envelope fault is checked before credentials are read
// and before any fetch, which is the whole point of running B402's own three checks locally.
test('verifyPayment names the envelope fault without leaving the process', async () => {
  assert.deepEqual(await verifyPayment(null), { isValid: false, reason: 'invalid_payload', raw: null })
  assert.deepEqual(await verifyPayment([]), { isValid: false, reason: 'invalid_payload', raw: null })
  assert.equal((await verifyPayment({ x402Version: 1, paymentPayload: {}, paymentRequirements: {} })).reason, 'invalid_x402_version')
  assert.equal((await verifyPayment({ paymentRequirements: {} })).reason, 'invalid_payload')
  assert.equal((await verifyPayment({ paymentPayload: {} })).reason, 'invalid_payment_requirements')
})

test('settlePayment reports the same faults and never a transaction', async () => {
  const r = await settlePayment({ x402Version: 3, paymentPayload: {}, paymentRequirements: {} })
  assert.equal(r.success, false)
  assert.equal(r.transaction, null)
  assert.equal(r.errorReason, 'invalid_x402_version')
})
