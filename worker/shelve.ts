/**
 * Turn indexed agents into shelf listings. Runs after a sweep and after every probe cycle,
 * because a listing's rung depends on both what it declared and what a probe found.
 *
 * The evidence rung here is the honest one. A row reaches `declared` on its own claim and no
 * further, and only the prober and the Bazaar join can move it above that.
 */
import { db, tx } from '../lib/db.ts'
import { classify } from '../lib/classify.ts'
import { CHAIN_ID } from '../lib/registry.ts'
import type { EvidenceRung } from '../lib/types.ts'

interface Row {
  agentId: string
  name: string | null
  description: string | null
  skills: string
  serviceKinds: string
  endpoints: string
  declaresX402: number
  declaresActive: number
  duplicateClusterId: string | null
}

export function shelve(): { scanned: number; written: number; perShelf: Record<string, number> } {
  const rows = db()
    .prepare(
      `SELECT agentId, name, description, skills, serviceKinds, endpoints,
              declaresX402, declaresActive, duplicateClusterId
       FROM agent WHERE chainId = ? AND registrationParsed = 1`,
    )
    .all(CHAIN_ID) as unknown as Row[]

  // One listing per cluster, so an operator who registered the same record hundreds of times
  // gets one row rather than hundreds. The kept id is the lowest, which is the first mint.
  const clusterSeen = new Set<string>()
  const now = Date.now()
  let written = 0
  const perShelf: Record<string, number> = {}

  tx(() => {
    const ins = db().prepare(
      `INSERT INTO listing (listingId, chainId, agentId, category, visibility, lifecycleState,
                            evidenceTier, firstParty, updatedAt)
       VALUES (?,?,?,?,?,?,?,0,?)
       ON CONFLICT(chainId, agentId, category) DO UPDATE SET
         evidenceTier = excluded.evidenceTier,
         visibility = excluded.visibility,
         updatedAt = excluded.updatedAt`,
    )
    for (const r of rows) {
      if (r.duplicateClusterId) {
        if (clusterSeen.has(r.duplicateClusterId)) continue
        clusterSeen.add(r.duplicateClusterId)
      }
      const hits = classify({
        name: r.name,
        description: r.description,
        skills: safeArr(r.skills),
        serviceKinds: safeArr(r.serviceKinds),
      })
      if (hits.length === 0) continue

      const endpoints = safeArr(r.endpoints)
      // The rung a declaration alone can reach, and no further.
      const tier: EvidenceRung = endpoints.length > 0 ? 'declared' : 'registered'
      // A row with nothing callable is indexed so search can find it, and not listed on a
      // shelf, because a shelf is a place a buyer expects to be able to hire from.
      const visibility = endpoints.length > 0 ? 'listed' : 'indexed'

      for (const h of hits) {
        ins.run(
          `${CHAIN_ID}:${r.agentId}:${h.shelf}`,
          CHAIN_ID,
          r.agentId,
          h.shelf,
          visibility,
          'candidate',
          tier,
          now,
        )
        written++
        perShelf[h.shelf] = (perShelf[h.shelf] ?? 0) + 1
      }
    }
  })
  return { scanned: rows.length, written, perShelf }
}

function safeArr(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

if (import.meta.filename === process.argv[1]) {
  const r = shelve()
  console.log(`shelved: scanned=${r.scanned} written=${r.written}`)
  for (const [k, v] of Object.entries(r.perShelf).sort()) console.log(`  ${k.padEnd(14)} ${v}`)
}
