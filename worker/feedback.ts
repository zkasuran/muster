/**
 * On-chain reputation for every listed agent, read from the ERC-8004 Reputation Registry rather
 * than from any explorer. `getClients` gives the distinct addresses that ever left feedback, and
 * `getSummary` gives the count and the aggregate value. Both are stored and both are shown, with
 * the caveat the measurement earned: across the whole registry 29,712 feedbacks were written by
 * 111 addresses, so a count is a count and not a reputation.
 */
import { randomUUID } from 'node:crypto'
import { parseAbi } from 'viem'
import { db, tx } from '../lib/db.ts'
import { withRpc, sleep } from '../lib/rpc.ts'
import { REGISTRY } from '../lib/constants.ts'
import { CHAIN_ID } from '../lib/registry.ts'

const REP_ABI = parseAbi([
  'function getClients(uint256 agentId) view returns (address[])',
  'function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)',
])

export async function sweepFeedback(): Promise<{ agents: number; withFeedback: number; totalFeedbacks: number }> {
  const runId = randomUUID()
  db().prepare('INSERT INTO run (runId, kind, startedAt, itemsRead, itemsWritten, errors, ok) VALUES (?,?,?,0,0,0,0)').run(runId, 'feedbackSweep', Date.now())
  const ids = (db().prepare('SELECT DISTINCT agentId FROM listing WHERE chainId = ? AND CAST(agentId AS INTEGER) < 900000000').all(CHAIN_ID) as { agentId: string }[]).map((r) => r.agentId)
  let withFeedback = 0
  let total = 0
  const upd = db().prepare('UPDATE agent SET feedbackCount = ?, updatedAt = ? WHERE chainId = ? AND agentId = ?')
  const meta = db().prepare("INSERT INTO meta (k, v, updatedAt) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updatedAt = excluded.updatedAt")
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20)
    const clients = await withRpc((c) =>
      c.multicall({
        contracts: batch.map((id) => ({ address: REGISTRY.reputation as `0x${string}`, abi: REP_ABI, functionName: 'getClients', args: [BigInt(id)] } as const)),
        allowFailure: true,
      }),
      { bulk: true },
    )
    const summaries = await withRpc((c) =>
      c.multicall({
        contracts: batch.map((id, j) => {
          const cl = clients[j]?.status === 'success' ? (clients[j]!.result as readonly `0x${string}`[]) : []
          return { address: REGISTRY.reputation as `0x${string}`, abi: REP_ABI, functionName: 'getSummary', args: [BigInt(id), cl, '', ''] } as const
        }),
        allowFailure: true,
      }),
      { bulk: true },
    )
    tx(() => {
      batch.forEach((id, j) => {
        const cl = clients[j]?.status === 'success' ? (clients[j]!.result as readonly string[]) : []
        const s = summaries[j]?.status === 'success' ? (summaries[j]!.result as readonly [bigint, bigint, number]) : null
        const count = s ? Number(s[0]) : cl.length
        if (count > 0) withFeedback++
        total += count
        upd.run(count, Date.now(), CHAIN_ID, id)
        if (s && count > 0) {
          meta.run(`feedback.${id}`, JSON.stringify({ clients: cl.length, count, value: s[1].toString(), decimals: s[2], readAt: Date.now() }), Date.now())
        }
      })
    })
    await sleep(60)
  }
  db().prepare('UPDATE run SET finishedAt = ?, itemsRead = ?, itemsWritten = ?, ok = 1, note = ? WHERE runId = ?')
    .run(Date.now(), ids.length, withFeedback, `withFeedback=${withFeedback} total=${total}`, runId)
  return { agents: ids.length, withFeedback, totalFeedbacks: total }
}

if (import.meta.filename === process.argv[1]) {
  const r = await sweepFeedback()
  console.log(`feedback: ${r.agents} listed agents read, ${r.withFeedback} carry on-chain feedback, ${r.totalFeedbacks} feedbacks in total`)
}
