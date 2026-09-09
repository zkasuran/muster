/**
 * [doc 08] GET /api/ledger/export, the ledger export (08-MONEY section 12). Two formats, an
 * optional payer slice:
 *   ?format=json (default)  the hash-chained slice, every entry with seq, prevHash, entryHash and
 *                           its payload, plus the walk command, so it verifies offline with no
 *                           call back to us and no key
 *   ?format=csv             one row per ledger entry, principal and settlement as separate rows so
 *                           a total reconciles against the chain
 *
 * Unauthenticated and keyed on a public address, deliberately: every field is already on chain or
 * derived from it, and nothing about a person is in either format. The export is hash-chained, not
 * key-signed. This deployment holds no ledger signing key, so a key signature over the chain head
 * is documented as next rather than faked.
 */
import { NextRequest, NextResponse } from 'next/server'
import { syncFromHireAttempts, loadChain, verifyChain, ledgerSummary, GENESIS_PREV_HASH } from '@/lib/ledger'
import { selectRows, toExportEntries, rowsToCsv } from '@/lib/ledger-export'

export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  syncFromHireAttempts()
  const sp = req.nextUrl.searchParams
  const format = sp.get('format') === 'csv' ? 'csv' : 'json'
  const payer = sp.get('payer')

  const full = loadChain()
  const rows = selectRows(full, payer)

  if (format === 'csv') {
    return new NextResponse(rowsToCsv(rows), {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="muster-ledger.csv"',
        'cache-control': 'no-store',
      },
    })
  }

  const summary = ledgerSummary()
  return NextResponse.json(
    {
      generatedAt: Date.now(),
      payer: payer && payer.trim() !== '' ? payer.trim().toLowerCase() : null,
      chain: {
        entries: summary.entries,
        hireAttempts: summary.hireAttempts,
        settlements: summary.settlements,
        house: summary.house,
        order: summary.order,
        backfilled: summary.backfilled,
        sliceSize: rows.length,
      },
      integrity: {
        signed: false,
        publicKey: null,
        method: 'hash-chained, not key-signed',
        canonical: 'json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")',
        payloadHash: 'sha256(canonical(payload))',
        entryHash: 'sha256(canonical({seq, ts, origin, kind, refKey, payloadHash, prevHash}))',
        genesisPrevHash: GENESIS_PREV_HASH,
        walkCommand: "printf '%s' '<payload>' | sha256sum matches payloadHash; the same over the entry fields matches entryHash; each prevHash equals the previous entry's entryHash",
        note: 'A key signature over the chain head is documented as next. This deployment holds no ledger signing key, and its only key is the gas-only payout key, which is never used to sign ledger bytes.',
      },
      // The full chain verdict, so a payer slice can still be checked against the whole chain.
      walk: verifyChain(full),
      entries: toExportEntries(rows),
    },
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': 'attachment; filename="muster-ledger.json"',
        'cache-control': 'no-store',
      },
    },
  )
}
