/**
 * Pure-logic tests for the Altana track. No network, no file writes: only the derivations, the
 * scope builder, the entry parser and the pinned agent set. The key derivations are asserted against
 * the cast-verified worked example in docs/research/R06-altana.md and against viem's own address
 * derivation, so a wrong formula fails here rather than on the relay.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getAddress, isAddress, isHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import {
  keyIdFromPublicKey,
  eoaFromPublicKey,
  keyHashFromEoa,
  parseCanExecuteEntry,
  sessionScope,
  assertScopeSafe,
  serializeScope,
  ALTANA_AGENTS,
  agentByShelf,
} from './altana.ts'
import type { Shelf } from './types.ts'

// The one live session key R06 pinned end to end with cast.
const R06 = {
  publicKey:
    '0x04813725c34dbbea9d2f3181213e460b47c6c2bbe4835d5fdcfc859c50821c71c5f106b25ae4c4356240769c61aed70e1439bc97431fe09795a1af0478b1ec1f82' as const,
  keyId: '0x13f5e22da8d5e00e86c1ee6e79f1f9868483d87bf425a23ef17fabd8f30aad4b',
  eoa: '0xd2027a2450a8faea95c00387ffc41ce1da61c0ed',
  keyHash: '0xd7dcbd0ea8bafe7c98310663b02a97695cda8c3b07ce0802bb0aa3833077a485',
}

const SHELVES: Shelf[] = ['rebalancing', 'grid-trading', 'yield', 'health-factor']

test('keyId is keccak256 of the SEC1 public key, matching R06', () => {
  assert.equal(keyIdFromPublicKey(R06.publicKey).toLowerCase(), R06.keyId)
})

test('session EOA derives from the public key, matching R06', () => {
  assert.equal(eoaFromPublicKey(R06.publicKey).toLowerCase(), R06.eoa)
})

test('account keyHash derives from the EOA, matching R06', () => {
  assert.equal(keyHashFromEoa(getAddress(R06.eoa)).toLowerCase(), R06.keyHash)
})

test('EOA derivation agrees with viem for a fixed private key', () => {
  const pk = ('0x' + '01'.repeat(32)) as `0x${string}`
  const acct = privateKeyToAccount(pk)
  assert.equal(eoaFromPublicKey(acct.publicKey), acct.address)
  assert.ok(isHex(keyIdFromPublicKey(acct.publicKey)))
})

test('the two key identifiers are different values', () => {
  assert.notEqual(keyIdFromPublicKey(R06.publicKey).toLowerCase(), R06.keyHash)
})

test('a bad public key is refused, not silently hashed', () => {
  assert.throws(() => keyIdFromPublicKey('0xdeadbeef' as `0x${string}`))
  assert.throws(() => eoaFromPublicKey('0x04ff' as `0x${string}`))
})

test('canExecutePackedInfos entries parse target and selector, matching R06 samples', () => {
  const router = parseCanExecuteEntry(
    '0x10ed43c718714eb63d5aa57b78b54704e256024e000000000000000032323232',
  )
  assert.equal(router.target, getAddress('0x10ED43C718714eb63d5aA57B78B54704E256024E'))
  assert.equal(router.selector, '0x32323232') // Porto's any-function sentinel
  const approveOnly = parseCanExecuteEntry(
    '0x02fca66c1d1afb4e2a7884261eb00f63598a74360000000000000000095ea7b3',
  )
  assert.equal(approveOnly.target, getAddress('0x02fca66c1d1afb4e2a7884261eb00f63598a7436'))
  assert.equal(approveOnly.selector, '0x095ea7b3') // approve(address,uint256)
})

test('every shelf gets a scope with a real allowlist and a real cap', () => {
  for (const shelf of SHELVES) {
    const scope = sessionScope(shelf)
    assert.equal(scope.shelf, shelf)
    assert.ok(scope.calls.length > 0, `${shelf} has calls`)
    assert.ok(scope.spend.length > 0, `${shelf} has a spend cap`)
    assert.doesNotThrow(() => assertScopeSafe(scope))
    // Every call is scoped by selector AND target. Never a bare method and never a bare contract,
    // both of which widen the grant past what the consent screen shows.
    for (const c of scope.calls) {
      assert.ok(c.signature && c.signature.includes('('), `${shelf} call has a function signature`)
      assert.ok(isAddress(c.to), `${shelf} call is scoped to an address`)
    }
    // The cap is in USDT at 18 decimals, never a 6-decimal figure that reverts against a real limit.
    for (const s of scope.spend) {
      assert.equal(s.token, getAddress('0x55d398326f99059fF775485246999027B3197955'))
      assert.equal(s.period, 'day')
      assert.ok(s.limit >= 10n ** 18n, `${shelf} cap is a plausible 18-decimal amount`)
    }
  }
})

test('health factor is the tightest scope: defend only, no swap, no borrow', () => {
  const hf = sessionScope('health-factor')
  const sigs = hf.calls.map((c) => c.signature)
  assert.ok(sigs.some((s) => s.startsWith('repay(')), 'can repay debt')
  assert.ok(sigs.some((s) => s.startsWith('supply(')), 'can add collateral')
  assert.ok(!sigs.some((s) => s.startsWith('swap')), 'cannot swap')
  assert.ok(!sigs.some((s) => s.startsWith('borrow')), 'cannot borrow')
  assert.ok(!sigs.some((s) => s.startsWith('withdraw')), 'cannot withdraw, so it cannot drain collateral')
})

test('yield can supply and withdraw but never borrow', () => {
  const y = sessionScope('yield')
  const sigs = y.calls.map((c) => c.signature)
  assert.ok(sigs.some((s) => s.startsWith('supply(')))
  assert.ok(sigs.some((s) => s.startsWith('withdraw(')))
  assert.ok(!sigs.some((s) => s.startsWith('borrow')))
})

test('assertScopeSafe rejects an empty allowlist and an empty cap', () => {
  assert.throws(() => assertScopeSafe({ shelf: 'yield', calls: [], spend: sessionScope('yield').spend, summary: '' }))
  assert.throws(() => assertScopeSafe({ shelf: 'yield', calls: sessionScope('yield').calls, spend: [], summary: '' }))
})

test('serializeScope drops bigints so the scope is JSON-safe', () => {
  const s = serializeScope(sessionScope('rebalancing'))
  assert.equal(typeof s.spend[0]!.limit, 'string')
  assert.doesNotThrow(() => JSON.stringify(s))
})

test('the four agents are one per shelf on their own wallets', () => {
  assert.equal(ALTANA_AGENTS.length, 4)
  const shelves = new Set(ALTANA_AGENTS.map((a) => a.shelf))
  assert.equal(shelves.size, 4)
  const wallets = new Set(ALTANA_AGENTS.map((a) => a.wallet.toLowerCase()))
  assert.equal(wallets.size, 4, 'no two agents share a wallet, which requirement 1 forbids')
  const keyIds = new Set(ALTANA_AGENTS.map((a) => a.keyId.toLowerCase()))
  assert.equal(keyIds.size, 4)
  for (const a of ALTANA_AGENTS) {
    assert.ok(isAddress(a.wallet) && a.wallet === getAddress(a.wallet), `${a.agentId} wallet is checksummed`)
    assert.ok(isAddress(a.sessionEoa))
    assert.ok(isHex(a.keyId) && a.keyId.length === 66, `${a.agentId} keyId is 32 bytes`)
    assert.ok(isHex(a.keyHash) && a.keyHash.length === 66, `${a.agentId} keyHash is 32 bytes`)
    // The pinned keyHash must be the one derived from the pinned session EOA.
    assert.equal(a.keyHash.toLowerCase(), keyHashFromEoa(a.sessionEoa).toLowerCase())
    assert.ok(agentByShelf(a.shelf), `${a.shelf} resolves to an agent`)
  }
})
