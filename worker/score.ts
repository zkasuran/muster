/**
 * Fills listing.scoreValue and listing.scoreConfidence for every listing, which are the columns
 * docs/06-QUALITY.md's audit flagged as declared and never written. The value is the
 * evidence-readiness score of lib/score.ts, computed from real rows only: the evidence rung, how
 * fresh the last check is, how many agents share the registration record and how many distinct
 * addresses left on-chain feedback. No settled order-job exists yet, so the delivery score of
 * section 2 is the same cold-start value for every listing and carries no information between rows;
 * this score is the one a buyer can act on today and it uses the same shrinkage, decay and Wilson
 * interval the delivery score does.
 *
 * The write is deterministic in `asOf`: run it twice at the same time and every row is identical,
 * which is the "a stranger can recompute it" property. updatedAt is deliberately not touched, because
 * it is the freshness anchor the score decays against and bumping it on every score run would reset
 * the clock.
 */
import { randomUUID } from 'node:crypto'
import { db, tx } from '../lib/db.ts'
import { CHAIN } from '../lib/constants.ts'
import { computeEvidenceScore } from '../lib/score.ts'
import type { EvidenceRung } from '../lib/types.ts'

interface ScoreRow {
  listingId: string
  agentId: string
  evidenceTier: EvidenceRung
  lastProbeAt: number | null
  updatedAt: number
  firstParty: number
  clusterSize: number
  distinctAuthors: number | null
}

export function recomputeScores(asOf = Date.now()): { listings: number; written: number; distribution: Record<string, number> } {
  const runId = randomUUID()
  db()
    .prepare('INSERT INTO run (runId, kind, startedAt, itemsRead, itemsWritten, errors, ok) VALUES (?,?,?,0,0,0,0)')
    .run(runId, 'scoreRecompute', asOf)

  const rows = db()
    .prepare(
      `SELECT l.listingId, l.agentId, l.evidenceTier, l.lastProbeAt, l.updatedAt, l.firstParty,
              (SELECT COUNT(*) FROM agent s WHERE s.duplicateClusterId IS NOT NULL
                 AND s.duplicateClusterId = a.duplicateClusterId) AS clusterSize,
              (SELECT CAST(json_extract(m.v, '$.clients') AS INTEGER) FROM meta m
                 WHERE m.k = 'feedback.' || l.agentId) AS distinctAuthors
       FROM listing l JOIN agent a ON a.chainId = l.chainId AND a.agentId = l.agentId
       WHERE l.chainId = ?`,
    )
    .all(CHAIN.id) as unknown as ScoreRow[]

  const upd = db().prepare('UPDATE listing SET scoreValue = ?, scoreConfidence = ? WHERE listingId = ?')
  const distribution: Record<string, number> = {}
  let written = 0
  tx(() => {
    for (const r of rows) {
      const s = computeEvidenceScore({
        rung: r.evidenceTier,
        lastProbeAt: r.lastProbeAt,
        updatedAt: r.updatedAt,
        distinctAuthors: r.distinctAuthors ?? 0,
        clusterSize: r.clusterSize,
        firstParty: r.firstParty === 1,
        asOf,
      })
      upd.run(s.scoreValue, s.scoreConfidence, r.listingId)
      written++
      const bucket = `${Math.floor(s.scoreValue / 10) * 10}-${Math.floor(s.scoreValue / 10) * 10 + 9}`
      distribution[bucket] = (distribution[bucket] ?? 0) + 1
    }
  })

  db()
    .prepare('UPDATE run SET finishedAt = ?, itemsRead = ?, itemsWritten = ?, ok = 1, note = ? WHERE runId = ?')
    .run(Date.now(), rows.length, written, `scored ${written} listings at asOf ${asOf}`, runId)

  return { listings: rows.length, written, distribution }
}

if (import.meta.filename === process.argv[1]) {
  const r = recomputeScores()
  console.log(`score: ${r.written} of ${r.listings} listings scored`)
  console.log('distribution by evidence score:')
  for (const [bucket, c] of Object.entries(r.distribution).sort()) console.log(`  ${bucket}: ${c}`)
}
