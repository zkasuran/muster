/**
 * [doc 08] Pure-logic tests for the ledger export shaping. No db, no network.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectRows, toExportEntries, rowsToCsv, csvCell, CSV_COLUMNS } from './ledger-export.ts'
import type { LedgerRow } from './ledger.ts'

function row(seq: number, payload: Record<string, unknown>, over: Partial<LedgerRow> = {}): LedgerRow {
  return {
    seq,
    ts: 1_700_000_000_000 + seq,
    origin: 'house',
    kind: 'hireAttempt',
    refKey: `hireAttempt:${String(payload['attemptId'])}`,
    payload: JSON.stringify(payload),
    payloadHash: `ph${seq}`,
    prevHash: seq === 1 ? '0'.repeat(64) : `eh${seq - 1}`,
    entryHash: `eh${seq}`,
    backfilled: 1,
    backfilledAt: 1,
    ...over,
  }
}

const rows: LedgerRow[] = [
  row(1, { attemptId: 'a1', shelf: 'yield', payer: '0xAAA', payTo: '0xPAY', token: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d', amountBase: '20000000000000000' }),
  row(2, { attemptId: 'a2', shelf: 'grid-trading', payer: '0xbbb', payTo: '0xPAY', token: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d', amountBase: '50000000000000000' }),
]

test('selectRows returns everything when no payer is given', () => {
  assert.equal(selectRows(rows, null).length, 2)
  assert.equal(selectRows(rows, '').length, 2)
})

test('selectRows matches a payer case-insensitively and narrows an unknown payer to nothing', () => {
  assert.equal(selectRows(rows, '0xaaa').length, 1)
  assert.equal(selectRows(rows, '0xBBB').length, 1)
  assert.equal(selectRows(rows, '0xnope').length, 0)
})

test('toExportEntries carries the fields that let an entry verify offline', () => {
  const e = toExportEntries(rows)[0]!
  assert.equal(e.seq, 1)
  assert.equal(e.entryHash, 'eh1')
  assert.equal(e.prevHash, '0'.repeat(64))
  assert.equal(e.payloadHash, 'ph1')
  assert.equal(e.payload['payer'], '0xAAA')
  assert.equal(e.tsUtc, new Date(e.ts).toISOString())
})

test('the CSV has a header row and one row per entry, amounts exact to the wei', () => {
  const csv = rowsToCsv(rows)
  const lines = csv.trimEnd().split('\n')
  assert.equal(lines[0], CSV_COLUMNS.join(','))
  assert.equal(lines.length, 3)
  assert.ok(lines[1]!.includes('0.02'))
  assert.ok(lines[1]!.includes('USD1'))
  assert.ok(lines[2]!.includes('0.05'))
})

test('csvCell quotes only when a cell carries a comma, quote or newline', () => {
  assert.equal(csvCell('0xabc'), '0xabc')
  assert.equal(csvCell('a,b'), '"a,b"')
  assert.equal(csvCell('a"b'), '"a""b"')
})

test('a settlement row carries its transaction hash and an explorer url', () => {
  const settle = row(3, { attemptId: 'a1', shelf: 'yield', payer: '0xAAA', payTo: '0xPAY', token: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d', amountBase: '20000000000000000', txHash: '0xdeadbeef' }, { kind: 'settlement' })
  const csv = rowsToCsv([settle])
  assert.ok(csv.includes('0xdeadbeef'))
  assert.ok(csv.includes('https://bscscan.com/tx/0xdeadbeef'))
})
