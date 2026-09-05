// R11 feedback census. Per-agent feedback counts read straight from the
// Reputation Registry, no indexer in the path.
//
// run: node tools/r11-feedback.mjs
// out: raw/r11-feedback-onchain-2026-09-05.json
//
// Method, from ReputationRegistryUpgradeable:
//   giveFeedback does  currentIndex = ++$._lastIndex[agentId][msg.sender]
//   and pushes msg.sender into $._clients[agentId] the first time.
// So for any agent:
//   getClients(agentId)                    -> every address that ever left feedback
//   sum of getLastIndex(agentId, client)   -> total feedbacks ever written, revoked included
// getSummary excludes revoked ones, so the two differ only by revocations.
//
// The wide sample reuses the SAME splitmix64 stream as tools/r11-sample.mjs, so the
// first 600 ids in draw order are exactly the main sample and the remainder extends it.

import { writeFileSync } from 'node:fs'
import { drawIds, SEED, MAXID } from './r11-sample.mjs'

const REPUTATION = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'
const SEL_GETCLIENTS = '0x42dd519c'   // cast sig "getClients(uint256)"
const SEL_GETLASTIDX = '0xf2d81759'   // cast sig "getLastIndex(uint256,address)"
const WIDE_N = 5000
const MAIN_N = 600

const RPCS = ['https://bsc-rpc.publicnode.com', 'https://bsc-dataseed.binance.org', 'https://binance.llamarpc.com']
let rpcIdx = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const u256 = (n) => BigInt(n).toString(16).padStart(64, '0')
const padA = (a) => a.replace(/^0x/, '').toLowerCase().padStart(64, '0')

async function batch(calls, tries = 6) {
  const body = calls.map((c, i) => ({ jsonrpc: '2.0', id: i, method: 'eth_call', params: [{ to: c.to, data: c.data }, 'latest'] }))
  let last
  for (let t = 0; t < tries; t++) {
    const url = RPCS[rpcIdx % RPCS.length]
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) throw new Error('http ' + r.status)
      const j = await r.json()
      if (!Array.isArray(j)) throw new Error('not a batch')
      const out = new Array(calls.length)
      for (const e of j) out[e.id] = e
      return out
    } catch (e) { last = e; rpcIdx++; await sleep(700 * (t + 1)) }
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

const { drawOrder } = drawIds({ n: WIDE_N })
const wide = drawOrder
const main = drawOrder.slice(0, MAIN_N)

console.error('seed', String(SEED), 'maxId', MAXID, 'wide', wide.length, 'main', main.length)

// ---- phase 1: getClients for every id in the wide sample
const clients = {}
const CH = 40
for (let i = 0; i < wide.length; i += CH) {
  const chunk = wide.slice(i, i + CH)
  const calls = chunk.map((id) => ({ to: REPUTATION, data: SEL_GETCLIENTS + u256(id) }))
  let res = await batch(calls)
  for (let k = 0; k < calls.length; k++) {
    if (res[k] === undefined) { const [r] = await batch([calls[k]]); res[k] = r; await sleep(200) }
  }
  chunk.forEach((id, k) => {
    const r = res[k]
    clients[id] = r.error ? { err: r.error.message } : decAddrArray(r.result)
  })
  process.stderr.write(`\r  getClients ${i + chunk.length}/${wide.length}   `)
  await sleep(260)
}
process.stderr.write('\n')

// ---- phase 2: getLastIndex per (agent, client) for the agents that have any
const pairs = []
for (const [id, c] of Object.entries(clients)) {
  if (Array.isArray(c)) for (const a of c) pairs.push([Number(id), a])
}
console.error('agents with >=1 client:', Object.values(clients).filter((c) => Array.isArray(c) && c.length).length,
  '| (agent,client) pairs:', pairs.length)

const lastIndex = {}
for (let i = 0; i < pairs.length; i += CH) {
  const chunk = pairs.slice(i, i + CH)
  const calls = chunk.map(([id, a]) => ({ to: REPUTATION, data: SEL_GETLASTIDX + u256(id) + padA(a) }))
  let res = await batch(calls)
  for (let k = 0; k < calls.length; k++) {
    if (res[k] === undefined) { const [r] = await batch([calls[k]]); res[k] = r; await sleep(200) }
  }
  chunk.forEach(([id, a], k) => {
    const r = res[k]
    lastIndex[`${id}:${a}`] = r.error ? -1 : decU(r.result)
  })
  process.stderr.write(`\r  getLastIndex ${i + chunk.length}/${pairs.length}   `)
  await sleep(260)
}
if (pairs.length) process.stderr.write('\n')

// ---- roll up
function rollup(ids) {
  let agentsWithClient = 0, agentsWithFeedback = 0, totalFeedbacks = 0, totalClients = 0
  const perAgent = {}
  for (const id of ids) {
    const c = clients[id]
    if (!Array.isArray(c)) continue
    if (c.length) agentsWithClient++
    totalClients += c.length
    let n = 0
    for (const a of c) n += Math.max(0, lastIndex[`${id}:${a}`] || 0)
    if (n > 0) { agentsWithFeedback++; perAgent[id] = { clients: c.length, feedbacks: n, clientList: c } }
    totalFeedbacks += n
  }
  return { n: ids.length, agentsWithClient, agentsWithFeedback, totalClients, totalFeedbacks, perAgent }
}

const out = {
  measuredAt: new Date().toISOString(),
  seed: String(SEED), maxId: MAXID, prng: 'splitmix64',
  reputationRegistry: REPUTATION,
  main: rollup(main),
  wide: rollup(wide),
  rawClients: clients,
  rawLastIndex: lastIndex,
}
writeFileSync('raw/r11-feedback-onchain-2026-09-05.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify({ main: { ...out.main, perAgent: out.main.perAgent }, wide: { ...out.wide, perAgent: undefined } }, null, 1))
