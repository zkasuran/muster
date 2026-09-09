/**
 * [doc 10] lib/provenance.ts is pure over the tree, so it is pinned here. binary_wrap must read zero
 * and the served file must match the generator, so it cannot drift. No network.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { provenanceDocument, provenanceJson, PROVENANCE_LICENSE } from './provenance.ts'
import { SHELVES } from './constants.ts'

const LINEAGES = new Set(['own', 'source_fork', 'binary_wrap'])

test('binary_wrap reads zero and the document says so plainly', () => {
  const d = provenanceDocument()
  assert.equal(d.binaryWrap, 0)
  assert.equal(d.lineageCounts.binary_wrap, 0)
  assert.ok(!d.artifacts.some((a) => a.lineage === 'binary_wrap'), 'an artifact is tagged binary_wrap')
  assert.match(d.binaryWrapStatement, /binary_wrap is zero/)
})

test('every artifact carries a real sha256, byte count, lineage and licence', () => {
  const d = provenanceDocument()
  assert.ok(d.artifacts.length >= 8, 'too few artifacts fingerprinted')
  for (const a of d.artifacts) {
    assert.match(a.sha256, /^[0-9a-f]{64}$/, `${a.id} has no sha256`)
    assert.ok(a.bytes > 0, `${a.id} has zero bytes`)
    assert.ok(LINEAGES.has(a.lineage), `${a.id} has an out-of-range lineage`)
    assert.ok(a.license && a.license.length > 0, `${a.id} names no licence`)
    assert.ok(a.path && a.path.length > 0, `${a.id} names no path`)
  }
})

test('the four reference agent cards are fingerprinted as own with a card hash', () => {
  const d = provenanceDocument()
  for (const shelf of SHELVES) {
    const card = d.artifacts.find((a) => a.id === `agent-card:${shelf}`)
    assert.ok(card, `no provenance row for ${shelf}`)
    assert.equal(card.lineage, 'own')
    assert.equal(card.license, PROVENANCE_LICENSE)
    assert.match(card.cardHash ?? '', /^0x[0-9a-f]{64}$/i)
  }
})

test('the six named first-party files are present', () => {
  const d = provenanceDocument()
  for (const id of ['constants.json', 'LICENSE', 'NOTICE', 'DATA-SOURCES.md']) {
    assert.ok(d.artifacts.some((a) => a.id === id), `no provenance row for ${id}`)
  }
  const fonts = d.artifacts.filter((a) => a.id.startsWith('font-licence:'))
  assert.ok(fonts.length >= 3, 'expected at least three OFL font licence files')
  assert.ok(fonts.every((f) => f.lineage === 'source_fork' && f.license === 'OFL-1.1'))
})

test('the served public/PROVENANCE.json matches the generator, so it cannot drift', () => {
  const root = resolve(import.meta.dirname, '..')
  const served = readFileSync(join(root, 'public/PROVENANCE.json'), 'utf8')
  assert.deepEqual(JSON.parse(served), JSON.parse(provenanceJson()))
})
