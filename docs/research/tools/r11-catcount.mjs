// R11 category coverage at population scale, via the 8004scan search index.
// Sample-level keyword counts on n=600 are all 0 or 1 for the four mandated
// categories, so the population count is the only way to size them. This asks
// 8004scan directly and records every failure instead of dropping it.
//
// run: node tools/r11-catcount.mjs
// out: raw/r11-8004scan-search-counts-2026-09-05.json

import { writeFileSync } from 'node:fs'

const TERMS = [
  'rebalance', 'rebalancing', 'rebalancer', 'grid', 'grid trading', 'grid bot',
  'yield', 'apy', 'apr', 'yield farming', 'health factor', 'liquidation',
  'lending', 'borrow', 'collateral', 'venus', 'lista', 'pancakeswap', 'aave',
  'portfolio', 'arbitrage', 'staking', 'x402', 'b402', 'trading',
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function count(term) {
  const url = `https://api.8004scan.io/api/v1/agents?chain_id=56&limit=1&search=${encodeURIComponent(term)}`
  for (let t = 0; t < 4; t++) {
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 90000)
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' }, signal: ac.signal })
      const j = await r.json().catch(() => null)
      if (r.ok && j && typeof j.total === 'number') return { term, total: j.total, url }
      if (j && j.error) { if (t === 3) return { term, total: null, error: `${r.status} ${j.error.code}: ${j.error.message}`, url } }
      else if (t === 3) return { term, total: null, error: 'http ' + r.status, url }
    } catch (e) {
      if (t === 3) return { term, total: null, error: String(e.name === 'AbortError' ? 'timeout 90s' : e.message), url }
    } finally { clearTimeout(to) }
    await sleep(2500 * (t + 1))
  }
}

const baselineUrl = 'https://api.8004scan.io/api/v1/agents?chain_id=56&limit=1'
const baseline = await (await fetch(baselineUrl)).json()
const rows = []
for (const t of TERMS) {
  const r = await count(t)
  rows.push(r)
  console.log(`${String(r.total ?? 'FAIL').padStart(8)}  ${t}${r.error ? '   <- ' + r.error : ''}`)
  await sleep(900)
}
writeFileSync('raw/r11-8004scan-search-counts-2026-09-05.json', JSON.stringify({
  measuredAt: new Date().toISOString(),
  note: 'search matches name, description and tags per the /agents search_fields default; totals are 8004scan index totals, not on-chain',
  baselineUrl, baselineTotalBscAgents: baseline.total, rows,
}, null, 1))
