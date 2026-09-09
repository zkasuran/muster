/**
 * [doc 08] Shaping for the ledger export (08-MONEY section 12). Pure logic over already-hashed
 * rows: it selects an optional payer slice, projects each row to an export entry and builds a CSV,
 * one row per ledger entry so principal and settlement legs are separate rows that reconcile
 * against the chain. No db and no network, covered by lib/ledger-export.test.ts.
 *
 * The export is hash-chained, not key-signed. Every entry carries seq, prevHash, entryHash and its
 * payload, so a reader recomputes payloadHash from the payload and entryHash from the entry fields,
 * then follows prevHash to the previous entryHash, and verifies the whole thing offline with no
 * call back to us and no key. A key signature over the chain head is documented as next: this
 * deployment holds no ledger signing key, and the one key it does have is the gas-only payout key,
 * which is never used to sign ledger bytes.
 */
import type { LedgerRow } from './ledger.ts'
import { tokenLabel, formatTokenAmount } from './money.ts'

export interface ExportEntry {
  seq: number
  ts: number
  tsUtc: string
  origin: string
  kind: string
  refKey: string
  backfilled: boolean
  payloadHash: string
  prevHash: string
  entryHash: string
  payload: Record<string, unknown>
}

function parsePayload(row: LedgerRow): Record<string, unknown> {
  try {
    return JSON.parse(row.payload) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** The optional payer slice. An unknown payer narrows to nothing rather than returning everything. */
export function selectRows(rows: LedgerRow[], payer: string | null): LedgerRow[] {
  if (payer === null || payer.trim() === '') return rows
  const p = payer.trim().toLowerCase()
  return rows.filter((r) => String(parsePayload(r)['payer'] ?? '').toLowerCase() === p)
}

export function toExportEntries(rows: LedgerRow[]): ExportEntry[] {
  return rows.map((r) => ({
    seq: r.seq,
    ts: r.ts,
    tsUtc: new Date(r.ts).toISOString(),
    origin: r.origin,
    kind: r.kind,
    refKey: r.refKey,
    backfilled: r.backfilled === 1,
    payloadHash: r.payloadHash,
    prevHash: r.prevHash,
    entryHash: r.entryHash,
    payload: parsePayload(r),
  }))
}

export const CSV_COLUMNS = [
  'seq',
  'tsUtc',
  'kind',
  'origin',
  'backfilled',
  'shelf',
  'payer',
  'payTo',
  'tokenSymbol',
  'tokenAddress',
  'decimals',
  'amountBase',
  'amountDecimal',
  'txHash',
  'explorerUrl',
  'payloadHash',
  'entryHash',
  'prevHash',
] as const

/** RFC 4180 quoting, only when a cell needs it. Ledger cells are ASCII, so this rarely fires. */
export function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function rowsToCsv(rows: LedgerRow[]): string {
  const lines: string[] = [CSV_COLUMNS.join(',')]
  for (const r of rows) {
    const p = parsePayload(r)
    const token = tokenLabel(String(p['token'] ?? ''))
    const amountBase = String(p['amountBase'] ?? '')
    const txHash = String(p['txHash'] ?? '')
    const cells: string[] = [
      String(r.seq),
      new Date(r.ts).toISOString(),
      r.kind,
      r.origin,
      r.backfilled === 1 ? 'true' : 'false',
      String(p['shelf'] ?? ''),
      String(p['payer'] ?? ''),
      String(p['payTo'] ?? ''),
      token.symbol,
      token.address || String(p['token'] ?? ''),
      token.decimals === null ? '' : String(token.decimals),
      amountBase,
      /^[0-9]+$/.test(amountBase) ? formatTokenAmount(amountBase, token.decimals) : '',
      txHash,
      txHash ? `https://bscscan.com/tx/${txHash}` : '',
      r.payloadHash,
      r.entryHash,
      r.prevHash,
    ]
    lines.push(cells.map(csvCell).join(','))
  }
  return lines.join('\n') + '\n'
}
