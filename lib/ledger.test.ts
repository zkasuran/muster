/**
 * [doc 08] The ledger hash rule, tested as pure logic with no db and no network. These assertions
 * pin the canonical byte form and the four walk checks, so a change to either shows up here rather
 * than in a reader who trusted the chain. verifyChain runs against rows built by the same exported
 * hash functions the append path uses, then each mutation forces exactly one named failure.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  canonicalJson,
  sha256Hex,
  payloadHashOf,
  entryHashOf,
  deriveOrigin,
  verifyChain,
  GENESIS_PREV_HASH,
  type LedgerRow,
  type Origin,
  type LedgerKind,
} from './ledger.ts'

test('canonicalJson sorts keys at every depth and uses compact separators', () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}')
  assert.equal(canonicalJson({ z: { y: 1, x: 2 }, a: 3 }), '{"a":3,"z":{"x":2,"y":1}}')
})

test('canonicalJson drops undefined keys but keeps null', () => {
  assert.equal(canonicalJson({ a: undefined, b: null, c: 1 }), '{"b":null,"c":1}')
})

test('canonicalJson keeps array order and escapes strings the way JSON does', () => {
  assert.equal(canonicalJson([3, 1, 2]), '[3,1,2]')
  assert.equal(canonicalJson({ s: 'a"b\\c' }), '{"s":"a\\"b\\\\c"}')
})

test('canonicalJson refuses a non-finite number rather than emitting null', () => {
  assert.throws(() => canonicalJson({ n: Infinity }), /non-finite/)
  assert.throws(() => canonicalJson({ n: NaN }), /non-finite/)
})

test('sha256Hex matches the known empty-string vector', () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
})

test('payloadHashOf is sha256 of the canonical bytes, independent of key order', () => {
  const a = payloadHashOf({ x: 1, y: 'two' })
  const b = payloadHashOf({ y: 'two', x: 1 })
  assert.equal(a, b)
  assert.equal(a, sha256Hex('{"x":1,"y":"two"}'))
})

test('deriveOrigin reads firstParty and defaults to order', () => {
  assert.equal(deriveOrigin({ firstParty: 1 }), 'house')
  assert.equal(deriveOrigin({ firstParty: 0 }), 'order')
  assert.equal(deriveOrigin({}), 'order')
})

/** Build one correctly-formed row the way the append path would, given the previous entryHash. */
function makeRow(seq: number, prevHash: string, payload: Record<string, unknown>, opts?: { ts?: number; kind?: LedgerKind }): LedgerRow {
  const ts = opts?.ts ?? 1_700_000_000_000 + seq
  const kind = opts?.kind ?? 'hireAttempt'
  const origin: Origin = deriveOrigin(payload as { firstParty?: number })
  const refKey = `${kind}:${String(payload['attemptId'])}`
  const payloadStr = canonicalJson(payload)
  const payloadHash = sha256Hex(payloadStr)
  const entryHash = entryHashOf({ seq, ts, origin, kind, refKey, payloadHash, prevHash })
  return { seq, ts, origin, kind, refKey, payload: payloadStr, payloadHash, prevHash, entryHash, backfilled: 1, backfilledAt: ts }
}

function goodChain(): LedgerRow[] {
  const r1 = makeRow(1, GENESIS_PREV_HASH, { attemptId: 'a1', firstParty: 1, amountBase: '20000000000000000' })
  const r2 = makeRow(2, r1.entryHash, { attemptId: 'a2', firstParty: 1, amountBase: '50000000000000000' })
  return [r1, r2]
}

test('a well-formed chain walks clean and starts from the genesis prev hash', () => {
  const rows = goodChain()
  assert.equal(rows[0]!.prevHash, GENESIS_PREV_HASH)
  const out = verifyChain(rows)
  assert.equal(out.ok, true)
  assert.equal(out.checked, 2)
  assert.deepEqual(out.failures, [])
})

test('an empty chain is ok with nothing checked', () => {
  const out = verifyChain([])
  assert.equal(out.ok, true)
  assert.equal(out.checked, 0)
})

test('a hand-edited payload fails the payloadHash check', () => {
  const rows = goodChain()
  rows[0]!.payload = canonicalJson({ attemptId: 'a1', firstParty: 1, amountBase: '99999999999999999' })
  const out = verifyChain(rows)
  assert.equal(out.ok, false)
  assert.ok(out.failures.some((f) => f.seq === 1 && f.check === 'payloadHash'))
})

test('a broken link fails the prevHash check', () => {
  const rows = goodChain()
  rows[1]!.prevHash = GENESIS_PREV_HASH
  const out = verifyChain(rows)
  assert.equal(out.ok, false)
  assert.ok(out.failures.some((f) => f.seq === 2 && f.check === 'prevHash'))
})

test('a flipped origin tag fails the origin re-derivation', () => {
  const rows = goodChain()
  rows[0]!.origin = 'order'
  const out = verifyChain(rows)
  assert.equal(out.ok, false)
  assert.ok(out.failures.some((f) => f.seq === 1 && f.check === 'origin'))
})

test('a gap in the sequence is a named failure', () => {
  const r1 = makeRow(1, GENESIS_PREV_HASH, { attemptId: 'a1', firstParty: 1 })
  const r3 = makeRow(3, r1.entryHash, { attemptId: 'a3', firstParty: 1 })
  const out = verifyChain([r1, r3])
  assert.equal(out.ok, false)
  assert.ok(out.failures.some((f) => f.check === 'seq'))
})

test('a recomputed entryHash catches a tampered field the row hash was not updated for', () => {
  const rows = goodChain()
  rows[0]!.ts = rows[0]!.ts + 1
  const out = verifyChain(rows)
  assert.equal(out.ok, false)
  assert.ok(out.failures.some((f) => f.seq === 1 && f.check === 'entryHash'))
})
