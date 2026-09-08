/**
 * Recompute every third-party listing's rung from its probe history. This exists because the
 * shelving pass once overwrote earned rungs with the declaration-derived one, which downgraded
 * probed and payable rows to declared. The fix in shelve.ts stops it recurring, and this puts
 * the evidence back where it was observed.
 *
 * The rung is the best a probe ever earned, never lower than what the declaration supports,
 * and it comes from the same `observedRung` the prober uses, so the two cannot disagree.
 */
import { db, tx } from '../lib/db.ts'
import { observedRung, type ProbeOutcome } from './probe.ts'
import { EVIDENCE_ORDER, type EvidenceRung } from '../lib/types.ts'

interface Row {
  listingId: string
  evidenceTier: EvidenceRung
  firstParty: number
}

export function repairTiers(): { examined: number; raised: number } {
  const listings = db()
    .prepare("SELECT listingId, evidenceTier, firstParty FROM listing WHERE visibility IN ('listed','indexed')")
    .all() as unknown as Row[]
  const probes = db().prepare(
    'SELECT verdict, httpStatus, sawPaymentRequired, tlsOk FROM probeResult WHERE listingId = ?',
  )
  const upd = db().prepare('UPDATE listing SET evidenceTier = ?, updatedAt = ? WHERE listingId = ?')
  let raised = 0
  tx(() => {
    for (const l of listings) {
      if (l.firstParty === 1) continue
      let best = EVIDENCE_ORDER.indexOf(l.evidenceTier)
      for (const p of probes.all(l.listingId) as unknown as { verdict: 'pass' | 'fail' | 'skip'; httpStatus: number | null; sawPaymentRequired: number; tlsOk: number }[]) {
        const out = {
          url: '', assertion: '', verdict: p.verdict, failureClass: null, httpStatus: p.httpStatus,
          sawPaymentRequired: p.sawPaymentRequired === 1, tlsOk: p.tlsOk === 1, latencyMs: null, note: null,
        } as ProbeOutcome
        const r = observedRung(out)
        if (r !== null) best = Math.max(best, EVIDENCE_ORDER.indexOf(r))
      }
      const tier = EVIDENCE_ORDER[best]
      if (tier && tier !== l.evidenceTier) {
        upd.run(tier, Date.now(), l.listingId)
        raised++
      }
    }
  })
  return { examined: listings.length, raised }
}

if (import.meta.filename === process.argv[1]) {
  const r = repairTiers()
  console.log(`repair: examined ${r.examined} listings, raised ${r.raised} back to the rung their probe history earned`)
}
