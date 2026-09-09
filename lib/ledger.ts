/**
 * [doc 08] The money ledger: an append-only, hash-chained record of every hire attempt and every
 * settlement, plus a walk() that recomputes the whole chain and reports whether it holds.
 *
 * The ledger is a faithful projection of the hireAttempt table rather than a second source of
 * truth. syncFromHireAttempts() appends one entry per attempt and one per settlement, keyed by a
 * natural refKey so it runs to the same result every time and never rewrites a row. That is what
 * keeps the chain stable across restarts: the append path only ever adds, so the hash of an
 * existing row cannot change under a reader.
 *
 * Hash rule, stated so a reader can reproduce it offline. Canonical bytes are
 * json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8"): keys sorted at every
 * depth, no spaces. Every value in a payload is ASCII (addresses, ids, hashes, decimal amounts,
 * integer timestamps), so ensure_ascii makes no difference and the two forms are byte-identical.
 * payloadHash is sha256 of the canonical payload. entryHash is sha256 of the canonical
 * {seq, ts, origin, kind, refKey, payloadHash, prevHash}. prevHash is the previous entryHash, or
 * 64 zeros at genesis. Nothing personal goes into a payload: it holds addresses, ids, hashes,
 * amounts, tokens and timestamps and no email, IP or free text about a person.
 */
import { createHash } from 'node:crypto'
import { db, tx } from './db.ts'
import { findAgent } from './agents.ts'

export const GENESIS_PREV_HASH = '0'.repeat(64)

export type Origin = 'house' | 'order'
export type LedgerKind = 'hireAttempt' | 'settlement'

export interface LedgerRow {
  seq: number
  ts: number
  origin: Origin
  kind: LedgerKind
  refKey: string
  /** Canonical JSON string of the event body, exactly as it was hashed. */
  payload: string
  payloadHash: string
  prevHash: string
  entryHash: string
  backfilled: 0 | 1
  backfilledAt: number | null
}

export interface WalkFailure {
  seq: number
  check: string
  issue: string
}

export interface WalkResult {
  ok: boolean
  checked: number
  failures: WalkFailure[]
}

/**
 * Canonical JSON: keys sorted recursively, compact separators, byte-identical to Python
 * json.dumps(sort_keys=True, separators=(",", ":")) for the ASCII-only payloads used here. Arrays
 * keep their order, which is why the append order of the chain is itself part of what is signed.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('canonicalJson: non-finite number')
    return JSON.stringify(value)
  }
  if (typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`
  }
  throw new Error(`canonicalJson: unsupported type ${typeof value}`)
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

export function payloadHashOf(payload: unknown): string {
  return sha256Hex(canonicalJson(payload))
}

/** The hash that links the chain, computed over exactly the fields a reader can see on the row. */
export function entryHashOf(fields: {
  seq: number
  ts: number
  origin: Origin
  kind: LedgerKind
  refKey: string
  payloadHash: string
  prevHash: string
}): string {
  return sha256Hex(canonicalJson(fields))
}

/**
 * Origin is re-derived from the payload rather than trusted, so a hand-edit that flips the tag
 * fails the walk. Every hireable listing on this build is one of our four first-party reference
 * agents, so firstParty is 1 and origin is house. order is emitted only for a hire of a
 * non-first-party listing, which the current build has no path to create. Revenue counts order
 * only, so the honest number today is zero rather than a house hire dressed up as revenue.
 */
export function deriveOrigin(payload: { firstParty?: number }): Origin {
  return payload.firstParty === 1 ? 'house' : 'order'
}

/**
 * Recompute the chain from the stored rows. Three checks per entry: the payload still hashes to
 * its payloadHash, the link matches the previous entryHash, and the entryHash recomputes from the
 * row's own fields. One more across the row: origin re-derives from the payload. Any mismatch is
 * a named failure rather than a thrown error, because a walk that stops at the first break cannot
 * tell a reader how much of the chain is sound.
 */
export function verifyChain(rows: LedgerRow[]): WalkResult {
  const failures: WalkFailure[] = []
  let prev = GENESIS_PREV_HASH
  let expectedSeq = 1
  for (const row of rows) {
    if (row.seq !== expectedSeq) {
      failures.push({ seq: row.seq, check: 'seq', issue: `expected seq ${expectedSeq}, found ${row.seq}` })
    }
    let parsed: Record<string, unknown> | null = null
    try {
      parsed = JSON.parse(row.payload) as Record<string, unknown>
    } catch {
      failures.push({ seq: row.seq, check: 'payload', issue: 'payload is not valid JSON' })
    }
    if (parsed) {
      const reHash = payloadHashOf(parsed)
      if (reHash !== row.payloadHash) {
        failures.push({ seq: row.seq, check: 'payloadHash', issue: `payload hashes to ${reHash}, row says ${row.payloadHash}` })
      }
      const reOrigin = deriveOrigin(parsed as { firstParty?: number })
      if (reOrigin !== row.origin) {
        failures.push({ seq: row.seq, check: 'origin', issue: `payload re-derives origin ${reOrigin}, row says ${row.origin}` })
      }
    }
    if (row.prevHash !== prev) {
      failures.push({ seq: row.seq, check: 'prevHash', issue: `link is ${row.prevHash}, previous entryHash is ${prev}` })
    }
    const reEntry = entryHashOf({
      seq: row.seq,
      ts: row.ts,
      origin: row.origin,
      kind: row.kind,
      refKey: row.refKey,
      payloadHash: row.payloadHash,
      prevHash: row.prevHash,
    })
    if (reEntry !== row.entryHash) {
      failures.push({ seq: row.seq, check: 'entryHash', issue: `recomputes to ${reEntry}, row says ${row.entryHash}` })
    }
    prev = row.entryHash
    expectedSeq += 1
  }
  return { ok: failures.length === 0, checked: rows.length, failures }
}

export function loadChain(): LedgerRow[] {
  return db().prepare('SELECT seq, ts, origin, kind, refKey, payload, payloadHash, prevHash, entryHash, backfilled, backfilledAt FROM ledgerEntry ORDER BY seq').all() as unknown as LedgerRow[]
}

/** Walk the stored chain. This is the public verifier GET /api/ledger returns. */
export function walk(): WalkResult {
  return verifyChain(loadChain())
}

interface AppendInput {
  origin: Origin
  kind: LedgerKind
  refKey: string
  payload: Record<string, unknown>
  ts: number
  backfilled: boolean
}

/**
 * Append one entry, or skip it if its refKey is already on the chain. The read of the tail and
 * the insert share one transaction so the seq and the prevHash cannot be computed against a row
 * that a concurrent append has already moved past.
 */
function appendEntry(input: AppendInput): boolean {
  return tx(() => {
    const existing = db().prepare('SELECT 1 FROM ledgerEntry WHERE refKey = ?').get(input.refKey)
    if (existing) return false
    const last = db().prepare('SELECT seq, entryHash FROM ledgerEntry ORDER BY seq DESC LIMIT 1').get() as
      | { seq: number; entryHash: string }
      | undefined
    const seq = last ? last.seq + 1 : 1
    const prevHash = last ? last.entryHash : GENESIS_PREV_HASH
    const payloadStr = canonicalJson(input.payload)
    const payloadHash = sha256Hex(payloadStr)
    const entryHash = entryHashOf({
      seq,
      ts: input.ts,
      origin: input.origin,
      kind: input.kind,
      refKey: input.refKey,
      payloadHash,
      prevHash,
    })
    db()
      .prepare(
        `INSERT INTO ledgerEntry (seq, ts, origin, kind, refKey, payload, payloadHash, prevHash, entryHash, backfilled, backfilledAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        seq,
        input.ts,
        input.origin,
        input.kind,
        input.refKey,
        payloadStr,
        payloadHash,
        prevHash,
        entryHash,
        input.backfilled ? 1 : 0,
        input.backfilled ? Date.now() : null,
      )
    return true
  })
}

interface HireAttemptRow {
  attemptId: string
  shelf: string
  signer: string
  payTo: string
  token: string
  amountBase: string
  nonce: string
  validBefore: number
  signerBalance: string | null
  settled: number
  settleTx: string | null
  createdAt: number
}

/** The event body for a hire attempt. Only chain-derivable fields, nothing about a person. */
function hireAttemptPayload(row: HireAttemptRow): Record<string, unknown> {
  return {
    attemptId: row.attemptId,
    shelf: row.shelf,
    firstParty: findAgent(row.shelf) ? 1 : 0,
    payer: row.signer,
    payTo: row.payTo,
    token: row.token,
    amountBase: row.amountBase,
    nonce: row.nonce,
    validBefore: row.validBefore,
    signerBalance: row.signerBalance,
    createdAt: row.createdAt,
  }
}

function settlementPayload(row: HireAttemptRow): Record<string, unknown> {
  return {
    attemptId: row.attemptId,
    shelf: row.shelf,
    firstParty: findAgent(row.shelf) ? 1 : 0,
    payer: row.signer,
    payTo: row.payTo,
    token: row.token,
    amountBase: row.amountBase,
    nonce: row.nonce,
    txHash: row.settleTx,
  }
}

/**
 * Append a hire attempt as a ledger entry. Called inline when a live hire is verified, and by the
 * sync when an attempt exists with no entry yet. backfilled says which: an entry the sync creates
 * for an attempt that predates the ledger is backfilled, an entry the live path creates is not.
 * Idempotent on the refKey, so the two paths never double-count.
 */
export function recordHireAttempt(row: HireAttemptRow, opts: { backfilled: boolean }): boolean {
  const payload = hireAttemptPayload(row)
  return appendEntry({
    origin: deriveOrigin(payload as { firstParty?: number }),
    kind: 'hireAttempt',
    refKey: `hireAttempt:${row.attemptId}`,
    payload,
    ts: row.createdAt,
    backfilled: opts.backfilled,
  })
}

export function recordSettlement(row: HireAttemptRow, opts: { backfilled: boolean }): boolean {
  if (row.settled !== 1 || !row.settleTx) return false
  const payload = settlementPayload(row)
  return appendEntry({
    origin: deriveOrigin(payload as { firstParty?: number }),
    kind: 'settlement',
    refKey: `settlement:${row.attemptId}`,
    payload,
    ts: Date.now(),
    backfilled: opts.backfilled,
  })
}

/**
 * Project the hireAttempt table into the ledger. Every attempt gets a hireAttempt entry and every
 * settled attempt gets a settlement entry, appended in a stable order so the chain is the same on
 * a re-run. Entries created here are backfilled, because a live hire appends its own entry inline
 * before the sync ever sees it. Returns how many of each it added this pass.
 */
export function syncFromHireAttempts(): { hireAttempts: number; settlements: number } {
  const rows = db()
    .prepare(
      `SELECT attemptId, shelf, signer, payTo, token, amountBase, nonce, validBefore, signerBalance, settled, settleTx, createdAt
       FROM hireAttempt ORDER BY createdAt ASC, attemptId ASC`,
    )
    .all() as unknown as HireAttemptRow[]
  let hireAttempts = 0
  let settlements = 0
  for (const row of rows) if (recordHireAttempt(row, { backfilled: true })) hireAttempts += 1
  for (const row of rows) if (recordSettlement(row, { backfilled: true })) settlements += 1
  return { hireAttempts, settlements }
}

/** Summary for the status page: entry counts by kind and origin, and the walk verdict. */
export function ledgerSummary(): {
  entries: number
  hireAttempts: number
  settlements: number
  house: number
  order: number
  backfilled: number
  walk: WalkResult
} {
  const rows = loadChain()
  const count = (fn: (r: LedgerRow) => boolean) => rows.filter(fn).length
  return {
    entries: rows.length,
    hireAttempts: count((r) => r.kind === 'hireAttempt'),
    settlements: count((r) => r.kind === 'settlement'),
    house: count((r) => r.origin === 'house'),
    order: count((r) => r.origin === 'order'),
    backfilled: count((r) => r.backfilled === 1),
    walk: verifyChain(rows),
  }
}
