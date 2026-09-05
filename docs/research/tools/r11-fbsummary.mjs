// R11 revoked-adjusted feedback total. getLastIndex counts every feedback ever
// written including revoked ones; getSummary skips revoked. Running both over the
// 4406 agents that have feedback gives the live count and the revocation count.
//
// run: node tools/r11-fbsummary.mjs
// in:  raw/r11-feedback-sweep-2026-09-05.json
// out: raw/r11-feedback-summary-2026-09-05.json
//
// getSummary(uint256,address[],string,string) -> (uint64 count,int128 value,uint8 decimals)
// selector 0x81bbba58. Head is 4 words: agentId, offset(clients)=0x80,
// offset(tag1), offset(tag2). Empty strings encode as a single zero length word.
// clientAddresses MUST be non-empty, the contract reverts on an empty array.

import { readFileSync, writeFileSync } from 'node:fs'

const REPUTATION = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'
const SEL = '0x81bbba58'
const BATCH = 60
const RPCS = ['https://bsc.rpc.blxrbdn.com', 'https://bsc-rpc.publicnode.com']
let rpcIdx = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const w = (n) => BigInt(n).toString(16).padStart(64, '0')
const wa = (a) => a.replace(/^0x/, '').toLowerCase().padStart(64, '0')

function encodeGetSummary(agentId, clients) {
  const n = clients.length
  const offClients = 0x80
  const offTag1 = offClients + 32 + n * 32
  const offTag2 = offTag1 + 32
  return SEL + w(agentId) + w(offClients) + w(offTag1) + w(offTag2)
    + w(n) + clients.map(wa).join('')
    + w(0) + w(0)
}

async function batchCall(datas, tries = 8) {
  const body = datas.map((d, i) => ({ jsonrpc: '2.0', id: i, method: 'eth_call', params: [{ to: REPUTATION, data: d }, 'latest'] }))
  let last
  for (let t = 0; t < tries; t++) {
    const url = RPCS[rpcIdx % RPCS.length]
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json().catch(() => null)
      if (!Array.isArray(j) || j.length !== datas.length) throw new Error('http ' + r.status + ' bad batch')
      const out = new Array(datas.length)
      for (const e of j) out[e.id] = e
      if (out.some((x) => x === undefined)) throw new Error('gap')
      if (r.status === 429) { rpcIdx++; await sleep(1500) }
      return out
    } catch (e) { last = e; rpcIdx++; await sleep(900 * (t + 1)) }
  }
  throw last
}

const sweep = JSON.parse(readFileSync('raw/r11-feedback-sweep-2026-09-05.json', 'utf8'))
const ckpt = JSON.parse(readFileSync('raw/r11-fbsweep-checkpoint.json', 'utf8'))
const ids = Object.keys(sweep.perAgent).map(Number).sort((a, b) => a - b)
console.error('agents to summarise:', ids.length)

// smoke test against a hand-checked agent before the bulk run
const smoke = await batchCall([encodeGetSummary(153776, ckpt.clients['153776'] || ['0xc7F5cdC8dd028E0b9aF2cA9d3891F135b23f4B92'])])
console.error('smoke 153776 raw:', JSON.stringify(smoke[0]).slice(0, 260))

const res = {}
const errs = []
for (let i = 0; i < ids.length; i += BATCH) {
  const chunk = ids.slice(i, i + BATCH)
  let out
  try { out = await batchCall(chunk.map((id) => encodeGetSummary(id, ckpt.clients[String(id)]))) }
  catch (e) { errs.push({ i, err: String(e).slice(0, 120) }); continue }
  chunk.forEach((id, k) => {
    const r = out[k]
    if (r.error) { errs.push({ id, err: String(r.error.message).slice(0, 120) }); return }
    const h = r.result.slice(2)
    res[id] = {
      count: Number(BigInt('0x' + h.slice(0, 64))),
      valueRaw: '0x' + h.slice(64, 128),
      decimals: Number(BigInt('0x' + h.slice(128, 192))),
    }
  })
  process.stderr.write(`\r  getSummary ${Math.min(i + BATCH, ids.length)}/${ids.length} errs=${errs.length}   `)
  await sleep(80)
}
process.stderr.write('\n')

let live = 0, ever = 0, revoked = 0
const revokedAgents = []
for (const id of ids) {
  const e = sweep.perAgent[id]
  const s = res[id]
  ever += e.feedbacks
  if (!s) continue
  live += s.count
  if (s.count < e.feedbacks) { revoked += e.feedbacks - s.count; revokedAgents.push({ id, ever: e.feedbacks, live: s.count }) }
}
const agentsWithLive = ids.filter((id) => res[id] && res[id].count > 0).length

const out = {
  measuredAt: new Date().toISOString(),
  agentsSummarised: ids.length,
  feedbacksEver: ever,
  feedbacksLive: live,
  feedbacksRevoked: revoked,
  agentsWithLiveFeedback: agentsWithLive,
  revokedAgentsSample: revokedAgents.slice(0, 50),
  revokedAgentCount: revokedAgents.length,
  errorCount: errs.length,
  errors: errs.slice(0, 40),
  perAgentSummary: res,
}
writeFileSync('raw/r11-feedback-summary-2026-09-05.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify({ ...out, perAgentSummary: undefined, revokedAgentsSample: out.revokedAgentsSample.slice(0, 10) }, null, 1))
