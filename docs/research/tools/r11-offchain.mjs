// R11 off-chain registration fetch. For every sampled agent whose tokenURI is not
// a data: URI, fetch the registration JSON once.
//
// run: node tools/r11-offchain.mjs
// in:  raw/r11-sample-onchain-2026-09-05.json
// out: raw/r11-sample-offchain-2026-09-05.json
//
// Politeness: 6 in flight, 12 s timeout, at most one retry, ipfs via a public gateway.

import { readFileSync, writeFileSync } from 'node:fs'

const IN = 'raw/r11-sample-onchain-2026-09-05.json'
const OUT = 'raw/r11-sample-offchain-2026-09-05.json'
const UA = 'erc8004-census/1.0 (+research; one request per agent URI)'
const IPFS_GW = 'https://ipfs.io/ipfs/'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function toHttp(uri) {
  if (/^https?:\/\//i.test(uri)) return uri
  if (uri.startsWith('ipfs://')) return IPFS_GW + uri.slice('ipfs://'.length).replace(/^ipfs\//, '')
  return null
}

async function once(url) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 12000)
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ac.signal,
      headers: { 'user-agent': UA, accept: 'application/json,*/*' },
    })
    const ct = r.headers.get('content-type') || ''
    const body = (await r.text()).slice(0, 200000)
    return { status: r.status, ct, body, finalUrl: r.url }
  } catch (e) {
    return { status: 0, err: String(e.name === 'AbortError' ? 'timeout' : e.message || e).slice(0, 200) }
  } finally {
    clearTimeout(t)
  }
}

async function fetchOne(uri) {
  const url = toHttp(uri)
  if (!url) return { kind: 'unsupported-scheme', uri }
  let r = await once(url)
  if (r.status === 0 || r.status >= 500) {
    await sleep(1200)
    r = await once(url)
  }
  let parsed = null, parseErr = null
  if (r.body) {
    try { parsed = JSON.parse(r.body) } catch (e) { parseErr = String(e.message).slice(0, 120) }
  }
  return { uri, url, status: r.status, ct: r.ct, err: r.err, finalUrl: r.finalUrl, parseErr, parsed, rawHead: r.body ? r.body.slice(0, 400) : undefined }
}

const onchain = JSON.parse(readFileSync(IN, 'utf8'))
const jobs = []
for (const [id, e] of Object.entries(onchain)) {
  const u = e.uri
  if (typeof u !== 'string' || u === '' || u.startsWith('data:') || u.startsWith('ERR:')) continue
  jobs.push([id, u])
}
console.error('offchain fetches:', jobs.length)

const out = {}
const WIDTH = 6
let cursor = 0, done = 0
async function worker() {
  for (;;) {
    const i = cursor++
    if (i >= jobs.length) return
    const [id, uri] = jobs[i]
    out[id] = await fetchOne(uri)
    done++
    process.stderr.write(`\r  ${done}/${jobs.length}   `)
    await sleep(150)
  }
}
await Promise.all(Array.from({ length: WIDTH }, worker))
process.stderr.write('\n')
writeFileSync(OUT, JSON.stringify(out, null, 1))
console.error('wrote', Object.keys(out).length)
