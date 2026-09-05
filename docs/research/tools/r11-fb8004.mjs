// R11 feedback, indexer side. Page every BSC feedback 8004scan holds and roll it up
// per agent, so the on-chain read can be checked against a second source.
//
// run: node tools/r11-fb8004.mjs
// out: raw/r11-feedbacks-8004scan-bsc-2026-09-05.json  (rollup, not every row)
//      raw/r11-feedbacks-8004scan-bsc-rows-2026-09-05.json (thin rows)

import { writeFileSync } from 'node:fs'

const BASE = 'https://api.8004scan.io/api/v1/feedbacks'
const UA = 'erc8004-census/1.0 (+research)'
const LIMIT = 50
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function page(offset) {
  const url = `${BASE}?chain_id=56&limit=${LIMIT}&offset=${offset}`
  for (let t = 0; t < 5; t++) {
    const ac = new AbortController()
    const to = setTimeout(() => ac.abort(), 60000)
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: ac.signal })
      const j = await r.json().catch(() => null)
      if (r.ok && j && Array.isArray(j.items)) return j
      throw new Error('http ' + r.status + ' ' + (j && j.error ? j.error.code : ''))
    } catch (e) {
      if (t === 4) return { failed: true, offset, url, err: String(e.message || e).slice(0, 160), items: [], total: null }
      await sleep(2000 * (t + 1))
    } finally { clearTimeout(to) }
  }
}

const first = await page(0)
const total = first.total
console.error('8004scan BSC feedbacks total:', total)

const rows = []
const push = (items) => {
  for (const it of items) {
    rows.push({
      feedback_id: it.feedback_id,
      token_id: it.agent?.token_id ?? null,
      agent_name: it.agent?.name ?? null,
      registry: it.agent?.registry_address ?? null,
      user: it.user_address,
      value: it.value,
      value_decimals: it.value_decimals,
      score: it.score,
      tag1: it.tag1, tag2: it.tag2,
      endpoint: it.endpoint,
      feedback_index: it.feedback_index,
      block_number: it.block_number,
      submitted_at: it.submitted_at,
      is_revoked: it.is_revoked,
    })
  }
}
push(first.items)
const failedPages = []
for (let off = LIMIT; off < total; off += LIMIT) {
  const p = await page(off)
  if (p.failed) failedPages.push({ offset: p.offset, err: p.err })
  else push(p.items)
  process.stderr.write(`\r  ${rows.length}/${total} failedPages=${failedPages.length}   `)
  await sleep(220)
}
process.stderr.write('\n')

const perAgent = {}
let revoked = 0, otherRegistry = 0
for (const r of rows) {
  if (r.is_revoked) revoked++
  if (r.registry && r.registry.toLowerCase() !== '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432') otherRegistry++
  const k = r.token_id ?? 'null'
  perAgent[k] = perAgent[k] || { token_id: k, name: r.agent_name, n: 0, clients: new Set() }
  perAgent[k].n++
  perAgent[k].clients.add(String(r.user).toLowerCase())
}
const agents = Object.values(perAgent)
  .map((a) => ({ token_id: a.token_id, name: a.name, feedbacks: a.n, clients: a.clients.size }))
  .sort((a, b) => b.feedbacks - a.feedbacks)

const hist = {}
for (const a of agents) hist[a.feedbacks] = (hist[a.feedbacks] || 0) + 1

const uniqueClients = new Set(rows.map((r) => String(r.user).toLowerCase()))
const tagHist = {}
for (const r of rows) { const k = String(r.tag1 ?? '') ; tagHist[k] = (tagHist[k] || 0) + 1 }

const out = {
  measuredAt: new Date().toISOString(),
  source: `${BASE}?chain_id=56&limit=${LIMIT}&offset=N`,
  reportedTotal: total,
  rowsFetched: rows.length,
  failedPages,
  revoked,
  rowsFromOtherRegistry: otherRegistry,
  distinctAgentsWithFeedback: agents.length,
  distinctClients: uniqueClients.size,
  perAgentHistogram: hist,
  topAgents: agents.slice(0, 40),
  tag1Histogram: Object.entries(tagHist).sort((a, b) => b[1] - a[1]).slice(0, 30),
  blockRange: [Math.min(...rows.map((r) => r.block_number || Infinity)), Math.max(...rows.map((r) => r.block_number || 0))],
  submittedRange: [rows.map((r) => r.submitted_at).filter(Boolean).sort()[0], rows.map((r) => r.submitted_at).filter(Boolean).sort().slice(-1)[0]],
}
writeFileSync('raw/r11-feedbacks-8004scan-bsc-2026-09-05.json', JSON.stringify(out, null, 1))
writeFileSync('raw/r11-feedbacks-8004scan-bsc-rows-2026-09-05.json', JSON.stringify(rows))
console.log(JSON.stringify({ ...out, topAgents: out.topAgents.slice(0, 15) }, null, 1))
