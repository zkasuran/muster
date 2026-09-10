/**
 * verifyHire is the app-layer money-authorization guard: it recovers the EIP-712 signer and refuses
 * a mismatch, refuses an expired authorization, refuses a window it did not issue, then refuses a
 * replayed nonce with 409. Those branches authorize a transfer, so they are pinned here rather than
 * trusted. Signing is real with a throwaway key (the x402-local.test.ts idiom); no chain is touched,
 * so the balance read fails closed to null, which the assertions account for. MUSTER_DB points at a
 * temp file and MUSTER_PAYTO is set before importing hire.ts, the same order coverage.test.ts uses.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync, rmSync } from 'node:fs'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const TEMP_DB = join(tmpdir(), `muster-hire-test-${process.pid}.db`)
process.env['MUSTER_DB'] = TEMP_DB
const PAY_TO = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
process.env['MUSTER_PAYTO'] = PAY_TO

const { db } = await import('./db.ts')
const { offerTypedData, verifyHire, HireError } = await import('./hire.ts')
const { transferWithAuthorizationTypedData } = await import('./b402.ts')

const buyer = privateKeyToAccount(generatePrivateKey())
const attacker = privateKeyToAccount(generatePrivateKey())

/** A fresh signed authorization for the yield shelf, over the offer's own typed data. */
async function signedHire(signer = buyer) {
  const offer = offerTypedData('yield', buyer.address)
  const signature = await signer.signTypedData(offer.typedData as never)
  return {
    shelf: 'yield',
    from: buyer.address,
    signature,
    nonce: offer.nonce,
    validAfter: offer.validAfter,
    validBefore: offer.validBefore,
  }
}

test('teardown', (t) => {
  t.after(() => {
    if (existsSync(TEMP_DB)) rmSync(TEMP_DB)
  })
})

test('a correctly signed authorization verifies and records the signer', async () => {
  const r = await verifyHire(await signedHire())
  assert.equal(r.ok, true)
  assert.equal(r.signer.toLowerCase(), buyer.address.toLowerCase())
  assert.equal(r.settlement, 'pending_merchant_account')
  // The attempt is persisted under its nonce, which is what the replay guard reads back.
  const row = db().prepare('SELECT signer FROM hireAttempt WHERE attemptId = ?').get(r.attemptId) as
    | { signer: string }
    | undefined
  assert.equal(row?.signer, buyer.address.toLowerCase())
})

test('a signature from a different key is refused 400 and names the recovered address', async () => {
  const h = await signedHire()
  // The attacker signs the exact typed data verifyHire will rebuild (same nonce and window), so only
  // the signer recovery can catch it, not a field mismatch. yield prices at USD1_2_CENTS.
  const typed = transferWithAuthorizationTypedData({
    token: 'USD1',
    from: h.from,
    to: PAY_TO,
    value: '20000000000000000',
    validAfter: h.validAfter,
    validBefore: h.validBefore,
    nonce: h.nonce,
  })
  const forged = { ...h, signature: await attacker.signTypedData(typed as never) }
  await assert.rejects(
    () => verifyHire(forged),
    (e: unknown) => e instanceof HireError && e.status === 400 && /recovers to/.test(e.message),
  )
})

test('the same nonce presented twice is refused 409', async () => {
  const h = await signedHire()
  const first = await verifyHire(h)
  assert.equal(first.ok, true)
  await assert.rejects(
    () => verifyHire(h),
    (e: unknown) => e instanceof HireError && e.status === 409 && /already presented/.test(e.message),
  )
})

test('an expired authorization is refused 400', async () => {
  const h = await signedHire()
  const now = Math.floor(Date.now() / 1000)
  await assert.rejects(
    () => verifyHire({ ...h, validBefore: now - 1 }),
    (e: unknown) => e instanceof HireError && e.status === 400 && /expired/.test(e.message),
  )
})

test('a window wider than the one we issue is refused 400', async () => {
  const h = await signedHire()
  const now = Math.floor(Date.now() / 1000)
  await assert.rejects(
    () => verifyHire({ ...h, validAfter: now - 60, validBefore: now + 24 * 3600 }),
    (e: unknown) => e instanceof HireError && e.status === 400 && /window is not one we issued/.test(e.message),
  )
})

test('a malformed signature is refused 400 before any recovery', async () => {
  const h = await signedHire()
  await assert.rejects(
    () => verifyHire({ ...h, signature: '0xdeadbeef' }),
    (e: unknown) => e instanceof HireError && e.status === 400 && /65 bytes/.test(e.message),
  )
})
