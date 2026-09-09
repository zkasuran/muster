/**
 * [doc 08] GET /api/ledger, the public verifier for the hash-chained money ledger (08-MONEY
 * section 11). It projects the hireAttempt table into the ledger first, which is idempotent on the
 * refKey, then returns the whole chain, the walk verdict and the hash rule a reader needs to
 * recompute any entry offline. No auth: every field is an address, an id, a hash, an amount, a
 * token or a timestamp, all of it already on chain or derived from it, and nothing about a person.
 */
import { NextResponse } from 'next/server'
import { syncFromHireAttempts, loadChain, verifyChain, ledgerSummary, GENESIS_PREV_HASH } from '@/lib/ledger'

export const dynamic = 'force-dynamic'

export function GET() {
  // Backfill any attempt that predates the ledger, then read the chain back. The append path only
  // ever adds, so this can run on every read without rewriting a row.
  syncFromHireAttempts()
  const rows = loadChain()
  const summary = ledgerSummary()
  return NextResponse.json(
    {
      chain: {
        entries: summary.entries,
        hireAttempts: summary.hireAttempts,
        settlements: summary.settlements,
        house: summary.house,
        order: summary.order,
        backfilled: summary.backfilled,
      },
      walk: verifyChain(rows),
      hashRule: {
        canonical: 'json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")',
        payloadHash: 'sha256(canonical(payload))',
        entryHash: 'sha256(canonical({seq, ts, origin, kind, refKey, payloadHash, prevHash}))',
        genesisPrevHash: GENESIS_PREV_HASH,
        note: 'Every payload value is ASCII, so ensure_ascii makes no difference and the bytes are reproducible with the standard library alone.',
      },
      entries: rows.map((r) => ({
        seq: r.seq,
        ts: r.ts,
        origin: r.origin,
        kind: r.kind,
        refKey: r.refKey,
        payloadHash: r.payloadHash,
        prevHash: r.prevHash,
        entryHash: r.entryHash,
        backfilled: r.backfilled === 1,
        backfilledAt: r.backfilledAt,
        payload: JSON.parse(r.payload) as Record<string, unknown>,
      })),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
