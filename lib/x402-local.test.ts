/**
 * Local verification of an eip3009 envelope, signed for real with a throwaway key. Signing
 * and recovery are pure EIP-712 arithmetic, so nothing here touches a chain or a
 * facilitator. The key is generated per run and never leaves the process.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { transferWithAuthorizationTypedData } from './b402.ts'
import { verifyEip3009Envelope } from './x402-local.ts'

const SELLER = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
const OTHER_SELLER = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'
const PRICE = '10000000000000000'
const NONCE = `0x${'ab'.repeat(32)}`

const buyer = privateKeyToAccount(generatePrivateKey())
const attacker = privateKeyToAccount(generatePrivateKey())

interface Auth {
  from: string
  to: string
  value: string
  validAfter: number
  validBefore: number
  nonce: string
}

function auth(over: Partial<Auth> = {}): Auth {
  const now = Math.floor(Date.now() / 1000)
  return {
    from: buyer.address,
    to: SELLER,
    value: PRICE,
    validAfter: now - 60,
    validBefore: now + 300,
    nonce: NONCE,
    ...over,
  }
}

async function sign(a: Auth, signer = buyer): Promise<string> {
  const typed = transferWithAuthorizationTypedData({ token: 'USD1', ...a })
  return signer.signTypedData(typed as never)
}

test('a correct envelope verifies and reports the signer', async () => {
  const a = auth()
  const r = await verifyEip3009Envelope(
    { payload: { authorization: a, signature: await sign(a) } },
    { payTo: SELLER, value: PRICE },
  )
  assert.equal(r.ok, true)
  assert.equal(r.reason, null)
  assert.equal(r.from, buyer.address)
  assert.equal(r.authorization?.value, PRICE)
  assert.equal(r.authorization?.nonce, NONCE)
  assert.equal(r.signature?.length, 132)
})

test('a flat envelope with no payload wrapper verifies the same way', async () => {
  const a = auth()
  const r = await verifyEip3009Envelope(
    { authorization: a, signature: await sign(a) },
    { payTo: SELLER, value: PRICE },
  )
  assert.equal(r.ok, true)
  assert.equal(r.from, buyer.address)
})

test('a payTo the 402 did not ask for is refused', async () => {
  const a = auth({ to: OTHER_SELLER })
  const r = await verifyEip3009Envelope(
    { payload: { authorization: a, signature: await sign(a) } },
    { payTo: SELLER, value: PRICE },
  )
  assert.equal(r.ok, false)
  assert.match(r.reason ?? '', /the 402 asked for 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432/)
  assert.equal(r.from, null)
})

test('a payTo that differs only in case is accepted', async () => {
  const a = auth()
  const r = await verifyEip3009Envelope(
    { payload: { authorization: a, signature: await sign(a) } },
    { payTo: SELLER.toLowerCase(), value: PRICE },
  )
  assert.equal(r.ok, true)
})

test('a value below the price is refused', async () => {
  const a = auth({ value: '9999999999999999' })
  const r = await verifyEip3009Envelope(
    { payload: { authorization: a, signature: await sign(a) } },
    { payTo: SELLER, value: PRICE },
  )
  assert.equal(r.ok, false)
  assert.equal(r.reason, `authorization value 9999999999999999 is below the price ${PRICE}`)
})

test('a value above the price is accepted', async () => {
  const a = auth({ value: '20000000000000000' })
  const r = await verifyEip3009Envelope(
    { payload: { authorization: a, signature: await sign(a) } },
    { payTo: SELLER, value: PRICE },
  )
  assert.equal(r.ok, true)
  assert.equal(r.authorization?.value, '20000000000000000')
})

test('an expired validBefore is refused', async () => {
  const now = Math.floor(Date.now() / 1000)
  const a = auth({ validAfter: now - 600, validBefore: now - 1 })
  const r = await verifyEip3009Envelope(
    { payload: { authorization: a, signature: await sign(a) } },
    { payTo: SELLER, value: PRICE },
  )
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'authorization has expired')
})

test('a validAfter far in the future is refused', async () => {
  const now = Math.floor(Date.now() / 1000)
  const a = auth({ validAfter: now + 3_600, validBefore: now + 7_200 })
  const r = await verifyEip3009Envelope(
    { payload: { authorization: a, signature: await sign(a) } },
    { payTo: SELLER, value: PRICE },
  )
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'authorization is not valid yet')
})

test('a signature from a different key is refused and names the recovered address', async () => {
  const a = auth()
  const r = await verifyEip3009Envelope(
    { payload: { authorization: a, signature: await sign(a, attacker) } },
    { payTo: SELLER, value: PRICE },
  )
  assert.equal(r.ok, false)
  assert.equal(r.reason, `signature recovers to ${attacker.address}, not to ${buyer.address}`)
  assert.notEqual(attacker.address, buyer.address)
})

test('an authorization edited after signing is refused', async () => {
  const signed = auth()
  const signature = await sign(signed)
  // Raising the value keeps it above the price, so only the recovery can catch this.
  const r = await verifyEip3009Envelope(
    { payload: { authorization: { ...signed, value: '20000000000000000' }, signature } },
    { payTo: SELLER, value: PRICE },
  )
  assert.equal(r.ok, false)
  const recovered = /recovers to (0x[0-9a-fA-F]{40}), not to (0x[0-9a-fA-F]{40})/.exec(r.reason ?? '')
  assert.ok(recovered, `unexpected reason ${r.reason}`)
  // The edit moves the digest, so it recovers to some address that is not the buyer.
  assert.equal(recovered[2], buyer.address)
  assert.notEqual(recovered[1], buyer.address)
})

test('a malformed nonce is refused before any recovery', async () => {
  const a = auth()
  const signature = await sign(a)
  for (const nonce of ['0x1234', '', `0x${'ab'.repeat(31)}`, 'ababab']) {
    const r = await verifyEip3009Envelope(
      { payload: { authorization: { ...a, nonce }, signature } },
      { payTo: SELLER, value: PRICE },
    )
    assert.equal(r.ok, false)
    assert.equal(r.reason, 'nonce must be 32 bytes')
  }
})

test('a non-object envelope is refused', async () => {
  for (const bad of [null, undefined, 'string', 42]) {
    const r = await verifyEip3009Envelope(bad, { payTo: SELLER, value: PRICE })
    assert.equal(r.ok, false)
    assert.equal(r.reason, 'envelope is not an object')
  }
})

test('a missing or wrong-length signature is refused', async () => {
  const a = auth()
  for (const signature of [undefined, '0xdeadbeef', `0x${'ab'.repeat(64)}`, 'ab'.repeat(65)]) {
    const r = await verifyEip3009Envelope(
      { payload: { authorization: a, signature } },
      { payTo: SELLER, value: PRICE },
    )
    assert.equal(r.ok, false)
    assert.equal(r.reason, 'missing authorization or signature')
  }
})

test('a from or to that is not an address is refused', async () => {
  const a = auth()
  const signature = await sign(a)
  const r = await verifyEip3009Envelope(
    { payload: { authorization: { ...a, from: 'not-an-address' }, signature } },
    { payTo: SELLER, value: PRICE },
  )
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'from or to is not an address')
})
