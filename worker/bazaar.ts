/**
 * Pull B402 Bazaar and join it against the registry on the payout address.
 *
 * The join is what makes `settled` mean something: an entry present in both indexes has an
 * identity and a reputation trail from ERC-8004, plus a price, a rail and proof a payment
 * cleared from Bazaar. Neither source produces that row alone.
 *
 * It also writes `sourceState` so the status page can show the shortfall of a foreign index
 * against the chain rather than assert that ours is better.
 */
import { randomUUID } from 'node:crypto'
import { db, tx, setMeta } from '../lib/db.ts'
import { fetchAllResources, indexResources, preferredAccept } from '../lib/bazaar.ts'
import { CHAIN_ID } from '../lib/registry.ts'

export async function syncBazaar(): Promise<{
  resources: number
  distinctPayTo: number
  largestShare: string
  matchedAgents: number
  listingsPromoted: number
}> {
  const runId = randomUUID()
  const startedAt = Date.now()
  db()
    .prepare('INSERT INTO run (runId, kind, startedAt, itemsRead, itemsWritten, errors, ok) VALUES (?,?,?,0,0,0,0)')
    .run(runId, 'bazaar', startedAt)

  const resources = await fetchAllResources()
  const idx = indexResources(resources, Date.now())

  // Which of our indexed agents own one of those payout addresses. Both sides lowercased,
  // and the owner counts as well as the explicit agentWallet, because `getAgentWallet`
  // returns the holder unless an operator set it and almost none have.
  const payTos = [...idx.byPayTo.keys()]
  const placeholders = payTos.map(() => '?').join(',')
  const matches =
    payTos.length === 0
      ? []
      : (db()
          .prepare(
            `SELECT agentId, owner, agentWallet FROM agent
             WHERE chainId = ? AND (lower(owner) IN (${placeholders}) OR lower(agentWallet) IN (${placeholders}))`,
          )
          .all(CHAIN_ID, ...payTos, ...payTos) as { agentId: string; owner: string; agentWallet: string | null }[])

  let promoted = 0
  tx(() => {
    const upd = db().prepare(
      `UPDATE listing SET inBazaar = 1, bazaarResource = ?, evidenceTier = 'settled',
              priceBase = ?, priceToken = ?, priceDecimals = ?, priceScheme = ?, payTo = ?,
              visibility = 'listed', updatedAt = ?
       WHERE chainId = ? AND agentId = ?`,
    )
    const now = Date.now()
    for (const m of matches) {
      const key = (m.agentWallet ?? m.owner).toLowerCase()
      const list = idx.byPayTo.get(key) ?? idx.byPayTo.get(m.owner.toLowerCase()) ?? []
      const first = list[0]
      if (!first) continue
      const accept = preferredAccept(first.accepts ?? [])
      if (!accept) continue
      // Every asset in Bazaar today is an 18-decimal BSC stablecoin. The decimals are stored
      // beside the price because a price without them is meaningless, and the store enforces
      // that pairing.
      const res = upd.run(
        first.resource,
        accept.maxAmountRequired,
        accept.asset,
        18,
        accept.scheme,
        accept.payTo,
        now,
        CHAIN_ID,
        m.agentId,
      )
      promoted += Number(res.changes)
    }

    db().prepare('DELETE FROM bazaarPayout').run()
    const insPay = db().prepare(
      'INSERT INTO bazaarPayout (payTo, resourceCount, sampleResource, observedAt) VALUES (?,?,?,?)',
    )
    for (const [payTo, list] of idx.byPayTo) {
      insPay.run(payTo, list.length, list[0]?.resource ?? null, now)
    }

    db()
      .prepare(
        `INSERT INTO sourceState (source, lastOkAt, reportedCount, observedAt)
         VALUES ('b402-bazaar', ?, ?, ?)
         ON CONFLICT(source) DO UPDATE SET lastOkAt = excluded.lastOkAt,
           reportedCount = excluded.reportedCount, observedAt = excluded.observedAt`,
      )
      .run(now, resources.length, now)
  })

  setMeta('bazaar.resources', String(resources.length))
  setMeta('bazaar.distinctPayTo', String(idx.distinctPayTo))
  setMeta('bazaar.largestPublisherShare', idx.largestPublisherShare.toFixed(4))
  setMeta('bazaar.observedAt', String(idx.observedAt))

  db()
    .prepare('UPDATE run SET finishedAt = ?, itemsRead = ?, itemsWritten = ?, ok = 1, note = ? WHERE runId = ?')
    .run(
      Date.now(),
      resources.length,
      promoted,
      `payTo=${idx.distinctPayTo} largestShare=${(idx.largestPublisherShare * 100).toFixed(1)}% matched=${matches.length}`,
      runId,
    )

  return {
    resources: resources.length,
    distinctPayTo: idx.distinctPayTo,
    largestShare: `${(idx.largestPublisherShare * 100).toFixed(1)}%`,
    matchedAgents: matches.length,
    listingsPromoted: promoted,
  }
}

if (import.meta.filename === process.argv[1]) {
  const r = await syncBazaar()
  console.log(`bazaar: ${r.resources} resources, ${r.distinctPayTo} payout addresses, largest ${r.largestShare}`)
  console.log(`join:   ${r.matchedAgents} indexed agents own a Bazaar payout address, ${r.listingsPromoted} listings promoted to settled`)
}
