// R11 full feedback sweep. getClients over EVERY agentId on BSC, then getLastIndex
// for every (agent, client) pair. This is the exact on-chain feedback total, with no
// indexer in the path and no dependence on eth_getLogs history.
//
// run: node tools/r11-fbsweep.mjs           (resumes from the checkpoint if present)
// out: raw/r11-fbsweep-checkpoint.json      (progress, non-empty client lists only)
//      raw/r11-feedback-sweep-2026-09-05.json
//
// Cost: MAXID+1 eth_calls at 200 per JSON-RPC batch. publicnode answers a 200-call
// batch in about 0.4 s, so the whole id space is roughly 1700 requests.

import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs'

const REPUTATION = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'
const SEL_GETCLIENTS = '0x42dd519c'
const SEL_GETLASTIDX = '0xf2d81759'
const MAXID = 334934              // top live id at block 120027164
const BATCH = 200
const CKPT = 'raw/r11-fbsweep-checkpoint.json'

// Two endpoints that actually honour JSON-RPC batching. Measured 2026-09-05 with a
// 200-call batch: blxrbdn 273 ms, publicnode 897 ms warm and 7.9 s once it starts
// rate limiting. Every bsc-dataseed host answers a 200-call batch with ONE result,
// so they are useless here. publicnode returns HTTP 429 with a complete, correct
// body, so treat a well-formed array as success whatever the status code says.
const RPCS = ['https://bsc.rpc.blxrbdn.com', 'https://bsc-rpc.publicnode.com']
let rpcIdx = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const u256 = (n) => BigInt(n).toString(16).padStart(64, '0')
const padA = (a) => a.replace(/^0x/, '').toLowerCase().padStart(64, '0')

async function batchCall(datas, tries = 8) {
  const body = datas.map((d, i) => ({ jsonrpc: '2.0', id: i, method: 'eth_call', params: [{ to: REPUTATION, data: d }, 'latest'] }))
  let last
  for (let t = 0; t < tries; t++) {
    const url = RPCS[rpcIdx % RPCS.length]
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json().catch(() => null)
      if (!Array.isArray(j) || j.length !== datas.length) throw new Error('http ' + r.status + ' short batch ' + (Array.isArray(j) ? j.length : 'obj'))
      const out = new Array(datas.length)
      for (const e of j) out[e.id] = e
      if (out.some((x) => x === undefined)) throw new Error('gap in batch ids')
      if (r.status === 429) { rpcIdx++; await sleep(1500) }   // keep the body, move hosts
      return out
    } catch (e) { last = e; rpcIdx++; await sleep(900 * (t + 1)) }
  }
  throw last
}

function decAddrArray(hex) {
  if (!hex || hex === '0x') return []
  const b = hex.slice(2)
  const off = parseInt(b.slice(0, 64), 16) * 2
  const len = parseInt(b.slice(off, off + 64), 16)
  const out = []
  for (let i = 0; i < len; i++) out.push('0x' + b.slice(off + 64 + i * 64 + 24, off + 64 + (i + 1) * 64))
  return out
}
const decU = (hex) => (!hex || hex === '0x' ? 0 : Number(BigInt(hex)))

let state = { nextId: 0, clients: {}, errors: [], scanned: 0 }
if (existsSync(CKPT)) { state = JSON.parse(readFileSync(CKPT, 'utf8')); console.error('resuming at id', state.nextId) }

const save = () => { writeFileSync(CKPT + '.tmp', JSON.stringify(state)); renameSync(CKPT + '.tmp', CKPT) }

const t0 = Date.now()
const startedAt = state.nextId
let nBatches = 0
while (state.nextId <= MAXID) {
  const start = state.nextId
  const end = Math.min(start + BATCH - 1, MAXID)
  const ids = []
  for (let i = start; i <= end; i++) ids.push(i)
  let res
  try { res = await batchCall(ids.map((id) => SEL_GETCLIENTS + u256(id))) }
  catch (e) { state.errors.push({ phase: 'getClients', start, end, err: String(e).slice(0, 150) }); state.nextId = end + 1; save(); continue }
  ids.forEach((id, k) => {
    const r = res[k]
    if (r.error) { state.errors.push({ phase: 'getClients', id, err: String(r.error.message).slice(0, 120) }); return }
    const a = decAddrArray(r.result)
    if (a.length) state.clients[id] = a
  })
  state.scanned = end + 1
  state.nextId = end + 1
  nBatches++
  if (nBatches % 10 === 0 || end === MAXID) {
    save()
    const pctDone = (100 * (end + 1) / (MAXID + 1)).toFixed(2)
    const doneNow = end + 1 - startedAt
    const eta = doneNow > 0 ? ((Date.now() - t0) / doneNow * (MAXID - end) / 1000 / 60).toFixed(1) : '?'
    process.stderr.write(`\r  getClients ${end + 1}/${MAXID + 1} (${pctDone}%) hits=${Object.keys(state.clients).length} errs=${state.errors.length} eta~${eta}m   `)
  }
  await sleep(60)
}
process.stderr.write('\n')
save()

// ---- phase B: getLastIndex per pair
const pairs = []
for (const [id, list] of Object.entries(state.clients)) for (const a of list) pairs.push([Number(id), a])
console.error('agents with >=1 client:', Object.keys(state.clients).length, '| pairs:', pairs.length)

const lastIndex = {}
for (let i = 0; i < pairs.length; i += BATCH) {
  const chunk = pairs.slice(i, i + BATCH)
  let res
  try { res = await batchCall(chunk.map(([id, a]) => SEL_GETLASTIDX + u256(id) + padA(a))) }
  catch (e) { state.errors.push({ phase: 'getLastIndex', i, err: String(e).slice(0, 150) }); continue }
  chunk.forEach(([id, a], k) => { const r = res[k]; lastIndex[`${id}:${a}`] = r.error ? -1 : decU(r.result) })
  process.stderr.write(`\r  getLastIndex ${Math.min(i + BATCH, pairs.length)}/${pairs.length}   `)
  await sleep(120)
}
process.stderr.write('\n')

let totalFeedbacks = 0, agentsWithFeedback = 0
const perAgent = {}
for (const [id, list] of Object.entries(state.clients)) {
  let n = 0
  for (const a of list) n += Math.max(0, lastIndex[`${id}:${a}`] || 0)
  if (n > 0) { agentsWithFeedback++; perAgent[id] = { clients: list.length, feedbacks: n } }
  totalFeedbacks += n
}
const hist = {}
for (const v of Object.values(perAgent)) hist[v.feedbacks] = (hist[v.feedbacks] || 0) + 1
const clientAgents = {}
for (const [id, list] of Object.entries(state.clients)) for (const a of list) clientAgents[a] = (clientAgents[a] || 0) + 1
const top = Object.entries(perAgent).map(([id, v]) => ({ id: +id, ...v })).sort((a, b) => b.feedbacks - a.feedbacks)

writeFileSync('raw/r11-feedback-sweep-2026-09-05.json', JSON.stringify({
  measuredAt: new Date().toISOString(),
  reputationRegistry: REPUTATION, identityRegistryMaxId: MAXID,
  method: 'getClients(agentId) over every id, then getLastIndex(agentId,client) per pair. Counts include revoked feedbacks, which getSummary excludes.',
  idsScanned: MAXID + 1,
  agentsWithAnyClient: Object.keys(state.clients).length,
  agentsWithFeedback, totalFeedbacks,
  distinctClients: Object.keys(clientAgents).length,
  perAgentHistogram: hist,
  top100: top.slice(0, 100),
  topClients: Object.entries(clientAgents).sort((a, b) => b[1] - a[1]).slice(0, 40),
  errors: state.errors.slice(0, 200),
  errorCount: state.errors.length,
  perAgent,
}, null, 1))
console.log(JSON.stringify({ agentsWithFeedback, totalFeedbacks, distinctClients: Object.keys(clientAgents).length, hist, top: top.slice(0, 15), errorCount: state.errors.length }, null, 1))
