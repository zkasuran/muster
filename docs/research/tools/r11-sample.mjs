// R11 census sampler. Deterministic uniform sample of ERC-8004 agentIds on BSC,
// then one on-chain read pass per sampled id.
//
// run: node tools/r11-sample.mjs            (from three/research/)
// out: raw/r11-sample-ids-2026-09-05.json   the id list alone
//      raw/r11-sample-onchain-2026-09-05.json  tokenURI + ownerOf + getAgentWallet per id
//
// The id range is PINNED so the draw reproduces even as the registry grows:
//   MAXID = 334923  (= _lastId - 1, read from storage at block 120025020)
// Change SEED or MAXID and you get a different sample. Do not.

import { writeFileSync } from 'node:fs'

export const SEED = 20260905n
export const MAXID = 334923      // inclusive, ids run 0..MAXID
export const N = 600             // sample size, brief asks for >= 400

const M64 = (1n << 64n) - 1n

// splitmix64. Same 3 constants everywhere, so this draw is reproducible in
// python, go, rust or C without trusting a language's stdlib PRNG.
function makeRng(seed) {
  let s = seed & M64
  return function next() {
    s = (s + 0x9e3779b97f4a7c15n) & M64
    let z = s
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & M64
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & M64
    return (z ^ (z >> 31n)) & M64
  }
}

// Uniform on [0, n) with rejection sampling, so no modulo bias.
function uniformBelow(next, n) {
  const limit = ((1n << 64n) / n) * n
  for (;;) {
    const r = next()
    if (r < limit) return r % n
  }
}

export function drawIds({ seed = SEED, maxId = MAXID, n = N } = {}) {
  const next = makeRng(seed)
  const span = BigInt(maxId + 1)
  const seen = new Set()
  const order = []
  while (order.length < n) {
    const v = Number(uniformBelow(next, span))
    if (seen.has(v)) continue
    seen.add(v)
    order.push(v)
  }
  return { drawOrder: order, sorted: [...order].sort((a, b) => a - b) }
}

// ---------------------------------------------------------------- rpc

const RPCS = [
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed.binance.org',
  'https://binance.llamarpc.com',
]
let rpcIdx = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function batch(calls, tries = 6) {
  const body = calls.map((c, i) => ({ jsonrpc: '2.0', id: i, method: c.method, params: c.params }))
  let lastErr
  for (let t = 0; t < tries; t++) {
    const url = RPCS[rpcIdx % RPCS.length]
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error('http ' + r.status)
      const j = await r.json()
      if (!Array.isArray(j)) throw new Error('not a batch: ' + JSON.stringify(j).slice(0, 160))
      const out = new Array(calls.length)
      for (const e of j) out[e.id] = e
      return out
    } catch (e) {
      lastErr = e
      rpcIdx++
      await sleep(700 * (t + 1))
    }
  }
  throw lastErr
}

const u256 = (n) => BigInt(n).toString(16).padStart(64, '0')
const call = (to, data) => ({ method: 'eth_call', params: [{ to, data }, 'latest'] })

function decStr(hex) {
  if (!hex || hex === '0x') return null
  const b = hex.slice(2)
  const off = parseInt(b.slice(0, 64), 16) * 2
  const len = parseInt(b.slice(off, off + 64), 16) * 2
  return Buffer.from(b.slice(off + 64, off + 64 + len), 'hex').toString('utf8')
}
const decAddr = (hex) => (!hex || hex === '0x' ? null : '0x' + hex.slice(-40))

// ---------------------------------------------------------------- main

const IDENTITY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
const SEL = {
  tokenURI: '0xc87b56dd',        // cast sig "tokenURI(uint256)"
  ownerOf: '0x6352211e',         // cast sig "ownerOf(uint256)"
  getAgentWallet: '0x00339509',  // cast sig "getAgentWallet(uint256)"
}

async function main() {
  const { drawOrder, sorted } = drawIds()
  writeFileSync(
    'raw/r11-sample-ids-2026-09-05.json',
    JSON.stringify({ seed: String(SEED), maxId: MAXID, n: N, prng: 'splitmix64', drawOrder, sorted }, null, 1),
  )
  console.error('drew', sorted.length, 'ids, first 8 in draw order:', drawOrder.slice(0, 8).join(' '))

  // ids 0 and 1 are fixed probes for the claim-check section, appended after
  // the random draw so they never displace a sampled id.
  const probes = [0, 1].filter((x) => !sorted.includes(x))
  const all = [...sorted, ...probes]

  const out = {}
  const CH = 24
  for (let i = 0; i < all.length; i += CH) {
    const chunk = all.slice(i, i + CH)
    const calls = []
    for (const id of chunk) {
      calls.push(call(IDENTITY, SEL.tokenURI + u256(id)))
      calls.push(call(IDENTITY, SEL.ownerOf + u256(id)))
      calls.push(call(IDENTITY, SEL.getAgentWallet + u256(id)))
    }
    let res = await batch(calls)
    for (let k = 0; k < calls.length; k++) {
      if (res[k] === undefined) {
        const [r] = await batch([calls[k]])
        res[k] = r
        await sleep(200)
      }
    }
    chunk.forEach((id, k) => {
      const t = res[k * 3], o = res[k * 3 + 1], w = res[k * 3 + 2]
      out[id] = {
        uri: t.error ? 'ERR:' + t.error.message : decStr(t.result),
        owner: o.error ? 'ERR:' + o.error.message : decAddr(o.result),
        agentWallet: w.error ? 'ERR:' + w.error.message : decAddr(w.result),
        isProbe: probes.includes(id),
      }
    })
    process.stderr.write(`\r  onchain ${i + chunk.length}/${all.length}   `)
    await sleep(280)
  }
  process.stderr.write('\n')
  writeFileSync('raw/r11-sample-onchain-2026-09-05.json', JSON.stringify(out, null, 1))
  console.error('wrote', Object.keys(out).length, 'records')
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
