// R11 merge. Normalise the on-chain reads plus the off-chain registration JSON into
// one record per sampled agent, and emit the unique endpoint list for liveness probing.
//
// run: node tools/r11-merge.mjs
// in:  raw/r11-sample-onchain-2026-09-05.json, raw/r11-sample-offchain-2026-09-05.json
// out: raw/r11-agents-merged-2026-09-05.json, raw/r11-endpoints-2026-09-05.json

import { readFileSync, writeFileSync } from 'node:fs'

const onchain = JSON.parse(readFileSync('raw/r11-sample-onchain-2026-09-05.json', 'utf8'))
const offchain = JSON.parse(readFileSync('raw/r11-sample-offchain-2026-09-05.json', 'utf8'))

function decodeDataUri(u) {
  // data:application/json;base64,<b64>  or  data:application/json,<urlencoded>
  const comma = u.indexOf(',')
  if (comma < 0) return { err: 'no comma' }
  const meta = u.slice(5, comma)
  const payload = u.slice(comma + 1)
  let text
  try {
    if (/;base64$/i.test(meta) || /;base64;/i.test(meta)) {
      text = Buffer.from(payload, 'base64').toString('utf8')
    } else {
      text = decodeURIComponent(payload)
    }
  } catch (e) { return { err: 'decode: ' + e.message } }
  try { return { parsed: JSON.parse(text) } } catch (e) { return { err: 'json: ' + String(e.message).slice(0, 80), text: text.slice(0, 300) } }
}

function uriKind(u) {
  if (typeof u !== 'string') return 'null'
  if (u.startsWith('ERR:')) return 'call-error'
  if (u === '') return 'empty'
  if (u.startsWith('data:')) return 'data'
  if (/^https:\/\//i.test(u)) return 'https'
  if (/^http:\/\//i.test(u)) return 'http'
  if (u.startsWith('ipfs://')) return 'ipfs'
  if (u.startsWith('ar://')) return 'arweave'
  return 'freeform'
}

const hostOf = (u) => { try { return new URL(u).host.toLowerCase() } catch { return null } }

const records = {}
for (const [id, oc] of Object.entries(onchain)) {
  const kind = uriKind(oc.uri)
  let doc = null, docSource = null, docErr = null
  if (kind === 'data') {
    const r = decodeDataUri(oc.uri)
    if (r.parsed) { doc = r.parsed; docSource = 'data-uri' } else docErr = r.err
  } else if (offchain[id]) {
    const f = offchain[id]
    if (f.parsed && typeof f.parsed === 'object') { doc = f.parsed; docSource = 'http' }
    else docErr = f.err || f.parseErr || ('http ' + f.status)
  } else if (kind !== 'empty') {
    docErr = 'not fetched'
  }

  // services is the ERC-8004 key. Some registrants used endpoints/endpoint instead.
  const svcRaw = doc && (doc.services || doc.endpoints || doc.endpoint)
  const services = []
  if (Array.isArray(svcRaw)) {
    for (const s of svcRaw) {
      if (!s) continue
      if (typeof s === 'string') { services.push({ name: null, endpoint: s }); continue }
      services.push({
        name: s.name ?? s.type ?? null,
        endpoint: s.endpoint ?? s.url ?? s.uri ?? null,
        version: s.version ?? null,
        skills: Array.isArray(s.skills) ? s.skills : undefined,
        domains: Array.isArray(s.domains) ? s.domains : undefined,
      })
    }
  } else if (svcRaw && typeof svcRaw === 'object') {
    for (const [k, v] of Object.entries(svcRaw)) services.push({ name: k, endpoint: typeof v === 'string' ? v : (v && v.endpoint) || null })
  } else if (typeof svcRaw === 'string') {
    services.push({ name: null, endpoint: svcRaw })
  }
  // A2A agent cards put the callable base in url, MCP-ish docs in documentationUrl
  if (doc && typeof doc.url === 'string' && !services.some((s) => s.endpoint === doc.url)) {
    services.push({ name: 'url', endpoint: doc.url })
  }

  const skills = []
  const pushSkill = (v) => { if (typeof v === 'string' && v.trim()) skills.push(v.trim()) }
  if (doc) {
    if (Array.isArray(doc.skills)) for (const s of doc.skills) pushSkill(typeof s === 'string' ? s : (s && (s.id || s.name)))
    if (Array.isArray(doc.tags)) for (const s of doc.tags) pushSkill(s)
    for (const s of services) {
      if (s.skills) for (const k of s.skills) pushSkill(typeof k === 'string' ? k : (k && (k.id || k.name)))
      if (s.domains) for (const k of s.domains) pushSkill(typeof k === 'string' ? k : (k && (k.id || k.name)))
    }
    if (Array.isArray(doc.attributes)) for (const a of doc.attributes) if (a && a.trait_type) pushSkill(`${a.trait_type}=${a.value}`)
  }

  records[id] = {
    id: Number(id),
    isProbe: !!oc.isProbe,
    owner: oc.owner,
    agentWallet: oc.agentWallet,
    walletEqualsOwner: String(oc.agentWallet).toLowerCase() === String(oc.owner).toLowerCase(),
    uriKind: kind,
    uriHost: kind === 'https' || kind === 'http' ? hostOf(oc.uri) : null,
    uri: typeof oc.uri === 'string' ? oc.uri.slice(0, 400) : oc.uri,
    docSource, docErr,
    name: doc && typeof doc.name === 'string' ? doc.name : null,
    description: doc && typeof doc.description === 'string' ? doc.description.slice(0, 1200) : null,
    active: doc ? doc.active : undefined,
    x402Support: doc ? (doc.x402Support ?? doc.x402support) : undefined,
    supportedTrust: doc ? (doc.supportedTrust ?? doc.supportedTrusts) : undefined,
    registrations: doc && Array.isArray(doc.registrations) ? doc.registrations : undefined,
    services,
    skills: [...new Set(skills)],
  }
}

writeFileSync('raw/r11-agents-merged-2026-09-05.json', JSON.stringify(records, null, 1))

// unique endpoint URLs worth an HTTPS probe
const eps = new Map()
for (const r of Object.values(records)) {
  for (const s of r.services) {
    const e = s.endpoint
    if (typeof e !== 'string' || !e.trim()) continue
    if (!/^https?:\/\//i.test(e)) continue
    const key = e.trim()
    if (!eps.has(key)) eps.set(key, { url: key, host: hostOf(key), names: new Set(), agents: [] })
    const rec = eps.get(key)
    if (s.name) rec.names.add(String(s.name))
    rec.agents.push(r.id)
  }
}
const list = [...eps.values()].map((e) => ({ url: e.url, host: e.host, names: [...e.names], agentCount: e.agents.length, agents: e.agents.slice(0, 40) }))
list.sort((a, b) => b.agentCount - a.agentCount)
writeFileSync('raw/r11-endpoints-2026-09-05.json', JSON.stringify(list, null, 1))

console.error('records', Object.keys(records).length, 'unique http(s) endpoints', list.length,
  'unique hosts', new Set(list.map((x) => x.host)).size)
