/**
 * [doc 10] PROVENANCE for Muster's first-party artifacts, docs/10-DOCS-AND-POLICY.md section 6.
 * The lineage of a published artifact is read off the bytes rather than hand maintained, so this
 * file fingerprints each one and groups it by lineage. Three states only, and binary_wrap must read
 * zero. It fingerprints the four reference agent cards and the constants file from the code that
 * serves them, then LICENSE, NOTICE, DATA-SOURCES.md and the OFL font licence files from disk.
 *
 * It is pure over the tree: it reads local files and calls the local generators, never the network,
 * so lib/provenance.test.ts can assert the whole thing and the served public/PROVENANCE.json can be
 * regenerated with `node --input-type=module -e "import('./lib/provenance.ts').then(m =>
 * require('node:fs').writeFileSync('public/PROVENANCE.json', m.provenanceJson()))"`.
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { musterCard, canonicalJson, cardHash } from './protocol.ts'
import { constantsJson } from './constants-json.ts'
import { SHELVES } from './constants.ts'
import type { Shelf } from './types.ts'

export const PROVENANCE_LICENSE = 'LicenseRef-zkasuran-SAND-1.0'
const OFL = 'OFL-1.1'

/** The card fingerprint pins the canonical public origin and a zero payTo, so the hash is stable
 *  run to run. The per-deployment payTo is recorded on the served card, not here. */
const CANON_ORIGIN = 'https://muster.zkasuran.dev'
const CANON_PAYTO = '0x0000000000000000000000000000000000000000'

export type Lineage = 'own' | 'source_fork' | 'binary_wrap'

export interface Artifact {
  id: string
  /** Where the bytes are served or stored. */
  path: string
  kind: string
  sha256: string
  bytes: number
  lineage: Lineage
  license: string
  note?: string
  /** Present for the agent cards: the hash the card commits to over its own bytes. */
  cardHash?: string
}

function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex')
}

/** The repository root, resolved from this file so the reads work whatever the cwd is. */
function repoRoot(): string {
  return resolve(import.meta.dirname, '..')
}

function fileArtifact(id: string, relPath: string, lineage: Lineage, license: string, note?: string): Artifact {
  const buf = readFileSync(join(repoRoot(), relPath))
  return { id, path: relPath, kind: 'file', sha256: sha256(buf), bytes: buf.length, lineage, license, note }
}

function cardArtifact(shelf: Shelf): Artifact {
  const card = musterCard(shelf, { origin: CANON_ORIGIN, payTo: CANON_PAYTO })
  const bytes = canonicalJson(card)
  return {
    id: `agent-card:${shelf}`,
    path: `/api/agent/${shelf}/card`,
    kind: 'musterCard',
    sha256: sha256(bytes),
    bytes: Buffer.byteLength(bytes, 'utf8'),
    lineage: 'own',
    license: PROVENANCE_LICENSE,
    cardHash: cardHash(card),
    note: `canonical bytes fingerprinted with origin ${CANON_ORIGIN} and a zero payTo`,
  }
}

/** The OFL licence files under public/licenses, sorted, each shipped verbatim under OFL-1.1. */
function fontLicenceArtifacts(): Artifact[] {
  const dir = 'public/licenses'
  const names = readdirSync(join(repoRoot(), dir))
    .filter((n) => n.endsWith('.txt'))
    .sort()
  return names.map((n) =>
    fileArtifact(
      `font-licence:${n}`,
      `${dir}/${n}`,
      'source_fork',
      OFL,
      'third-party font licence text, shipped verbatim as OFL-1.1 condition 2 requires, not modified',
    ),
  )
}

export function provenanceArtifacts(): Artifact[] {
  const cards = SHELVES.map((s) => cardArtifact(s as Shelf))
  const constants: Artifact = (() => {
    const bytes = constantsJson()
    return {
      id: 'constants.json',
      path: '/constants.json',
      kind: 'json',
      sha256: sha256(bytes),
      bytes: Buffer.byteLength(bytes, 'utf8'),
      lineage: 'own',
      license: PROVENANCE_LICENSE,
    }
  })()
  return [
    ...cards,
    constants,
    fileArtifact('LICENSE', 'LICENSE', 'own', PROVENANCE_LICENSE),
    fileArtifact('NOTICE', 'NOTICE', 'own', PROVENANCE_LICENSE, 'names every third-party component with its own terms'),
    fileArtifact('DATA-SOURCES.md', 'DATA-SOURCES.md', 'own', PROVENANCE_LICENSE, 'one row per third-party input with the quoted grant'),
    ...fontLicenceArtifacts(),
  ]
}

export interface ProvenanceDoc {
  $comment: string
  license: string
  generatedBy: string
  lineageStates: Record<Lineage, string>
  artifacts: Artifact[]
  lineageCounts: Record<Lineage, number>
  binaryWrap: number
  binaryWrapStatement: string
}

/** Build the provenance document. Pure over the tree, no network. */
export function provenanceDocument(): ProvenanceDoc {
  const artifacts = provenanceArtifacts()
  const lineageCounts: Record<Lineage, number> = { own: 0, source_fork: 0, binary_wrap: 0 }
  for (const a of artifacts) lineageCounts[a.lineage]++
  return {
    $comment:
      'PROVENANCE for Muster first-party artifacts. Generated by lib/provenance.ts by fingerprinting ' +
      'the published bytes with sha256. Regenerate after any change to a listed artifact.',
    license: PROVENANCE_LICENSE,
    generatedBy: 'lib/provenance.ts',
    lineageStates: {
      own: 'our source, our build',
      source_fork: "built from another author's source under a licence permitting it",
      binary_wrap: "another author's compiled binary plus our bytes",
    },
    artifacts,
    lineageCounts,
    binaryWrap: lineageCounts.binary_wrap,
    binaryWrapStatement:
      "No published first-party artifact wraps another author's compiled binary. binary_wrap is zero.",
  }
}

/** The exact bytes written to public/PROVENANCE.json and served at /PROVENANCE.json. */
export function provenanceJson(): string {
  return JSON.stringify(provenanceDocument(), null, 2)
}
