/**
 * The sweep. Reads the whole registry into the store, resumable, and writes a `run` row so
 * the status page reports what happened rather than what was configured.
 *
 * One deliberate deviation from docs/15-SYSTEM.md section 3.1, recorded in
 * docs/decisions/18-enumerate-by-id-not-by-logs.md. The document enumerates from
 * `Registered` logs. Measured on 2026-09-06: of seven public BSC endpoints, exactly one
 * serves `eth_getLogs` on the Identity Registry at all, and the other six refuse at every
 * span down to 100 blocks. A sweep built on logs therefore depends on a single provider for
 * fourteen unattended judging days.
 *
 * So the primary path is the id range instead. The counter slot gives the highest id, ids are
 * dense from 0, and `multicall` works on every endpoint. That is resumable by id rather than
 * by block, needs no archive access and has no single point of failure. Logs stay in use for
 * the tail only, where a miss is recovered by the next counter read anyway.
 */
import { randomUUID } from 'node:crypto'
import { db, tx, getMeta, setMeta } from '../lib/db.ts'
import {
  readAgentCount,
  resolveAgents,
  hashTokenUri,
  CHAIN_ID,
  type ResolvedAgent,
} from '../lib/registry.ts'
import { sleep } from '../lib/rpc.ts'

// 40 ids is 120 multicall entries. Measured safe against the tokenURI payload size.
const BATCH = Number(process.env.SWEEP_BATCH ?? 40)
const PAUSE_MS = Number(process.env.SWEEP_PAUSE_MS ?? 120)
const LIMIT = process.env.SWEEP_LIMIT ? Number(process.env.SWEEP_LIMIT) : null
const RESUME_KEY = 'sweep.nextId'

const UPSERT = `
INSERT INTO agent (
  chainId, agentId, owner, agentWallet, tokenUri, tokenUriHash, name, description,
  endpoints, skills, serviceKinds, declaresX402, declaresActive, trustModels,
  registrationParsed, firstSeenBlock, lastSeenBlock, updatedAt
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(chainId, agentId) DO UPDATE SET
  owner = excluded.owner,
  agentWallet = excluded.agentWallet,
  tokenUri = excluded.tokenUri,
  tokenUriHash = excluded.tokenUriHash,
  name = excluded.name,
  description = excluded.description,
  endpoints = excluded.endpoints,
  skills = excluded.skills,
  serviceKinds = excluded.serviceKinds,
  declaresX402 = excluded.declaresX402,
  declaresActive = excluded.declaresActive,
  trustModels = excluded.trustModels,
  registrationParsed = excluded.registrationParsed,
  lastSeenBlock = excluded.lastSeenBlock,
  updatedAt = excluded.updatedAt`

/**
 * Resolve a run of ids, splitting on partial resolution rather than accepting it.
 *
 * This exists because of a real silent failure. `tokenURI` returns kilobytes of base64 per
 * agent, so a multicall over 150 ids is 450 calls carrying hundreds of kilobytes, and
 * Multicall3 starts dropping calls rather than erroring. The first run of this sweep wrote
 * 30,423 rows for 56,400 ids read and reported zero errors, which reads exactly like 46
 * percent of the registry not existing. It does exist: every id from 0 to the counter
 * resolves when asked in a smaller batch.
 *
 * So a batch that comes back short is halved and retried, down to single ids. Only an id
 * that fails alone is genuinely absent, and that is the only case allowed to be dropped.
 */
async function resolveWithSplit(ids: bigint[]): Promise<ResolvedAgent[]> {
  const resolved = await resolveAgents(ids)
  const missing = resolved.filter((r) => !r.owner).map((r) => BigInt(r.agentId))
  if (missing.length === 0 || ids.length === 1) return resolved
  const good = resolved.filter((r) => r.owner)
  const mid = Math.ceil(missing.length / 2)
  const halves = [missing.slice(0, mid), missing.slice(mid)].filter((h) => h.length > 0)
  const recovered: ResolvedAgent[] = []
  for (const half of halves) {
    recovered.push(...(await resolveWithSplit(half)))
    await sleep(40)
  }
  return [...good, ...recovered]
}

export async function sweep(): Promise<{
  runId: string
  from: number
  to: number
  read: number
  written: number
  errors: number
  seconds: number
}> {
  const runId = randomUUID()
  const startedAt = Date.now()
  const { count, block } = await readAgentCount()

  const resumeFrom = Number(getMeta(RESUME_KEY) ?? '0')
  const from = resumeFrom >= count ? 0 : resumeFrom
  const to = LIMIT ? Math.min(count, from + LIMIT) : count

  db()
    .prepare(
      'INSERT INTO run (runId, kind, startedAt, fromBlock, toBlock, itemsRead, itemsWritten, errors, ok) VALUES (?,?,?,?,?,0,0,0,0)',
    )
    .run(runId, 'sweep', startedAt, from, to)

  let read = 0
  let written = 0
  let errors = 0

  for (let start = from; start < to; start += BATCH) {
    const end = Math.min(start + BATCH, to)
    const ids = Array.from({ length: end - start }, (_, i) => BigInt(start + i))
    let resolved
    try {
      resolved = await resolveWithSplit(ids)
    } catch (e) {
      errors++
      process.stderr.write(`  batch ${start}-${end} failed: ${(e as Error).message.slice(0, 140)}\n`)
      await sleep(1_000)
      continue
    }
    read += resolved.length

    const now = Date.now()
    written += tx(() => {
      const stmt = db().prepare(UPSERT)
      let n = 0
      for (const a of resolved) {
        // An id that resolves to nothing was never minted or was burned. Skip rather than
        // storing a row that claims an agent exists.
        if (!a.owner) continue
        const r = a.registration
        stmt.run(
          CHAIN_ID,
          a.agentId,
          a.owner.toLowerCase(),
          a.agentWallet ? a.agentWallet.toLowerCase() : null,
          a.tokenUri,
          a.tokenUri ? hashTokenUri(a.tokenUri) : null,
          r?.name ?? null,
          r?.description ?? null,
          JSON.stringify(r?.endpoints ?? []),
          JSON.stringify(r?.skills ?? []),
          JSON.stringify(r?.serviceKinds ?? []),
          r?.declaresX402 ? 1 : 0,
          r?.declaresActive ? 1 : 0,
          JSON.stringify(r?.trustModels ?? []),
          r ? 1 : 0,
          block,
          block,
          now,
        )
        n++
      }
      return n
    })

    setMeta(RESUME_KEY, String(end))
    if (end % 1200 === 0 || end === to) {
      const pct = (((end - from) / Math.max(1, to - from)) * 100).toFixed(1)
      process.stdout.write(`  ${end}/${to} (${pct}%)  written=${written}  errors=${errors}\n`)
    }
    if (PAUSE_MS) await sleep(PAUSE_MS)
  }

  // Duplicate clustering, which is what lets a shelf collapse one operator's flood. Two
  // agents sharing a registration record byte for byte are the same listing in practice.
  const clustered = tx(() => {
    db().prepare('UPDATE agent SET duplicateClusterId = NULL WHERE chainId = ?').run(CHAIN_ID)
    return db()
      .prepare(
        `UPDATE agent SET duplicateClusterId = tokenUriHash
         WHERE chainId = ? AND tokenUriHash IN (
           SELECT tokenUriHash FROM agent
           WHERE chainId = ? AND tokenUriHash IS NOT NULL AND tokenUri != ''
           GROUP BY tokenUriHash HAVING COUNT(*) > 1)`,
      )
      .run(CHAIN_ID, CHAIN_ID).changes
  })

  const seconds = Math.round((Date.now() - startedAt) / 1000)
  db()
    .prepare(
      'UPDATE run SET finishedAt = ?, itemsRead = ?, itemsWritten = ?, errors = ?, ok = ?, note = ? WHERE runId = ?',
    )
    .run(
      Date.now(),
      read,
      written,
      errors,
      errors === 0 ? 1 : 0,
      `counter=${count} block=${block} clustered=${clustered}`,
      runId,
    )

  return { runId, from, to, read, written, errors, seconds }
}

if (import.meta.filename === process.argv[1]) {
  const r = await sweep()
  console.log(
    `sweep ${r.runId.slice(0, 8)} ids ${r.from}..${r.to} read=${r.read} written=${r.written} errors=${r.errors} in ${r.seconds}s`,
  )
}
