// R11 endpoint liveness probe. Honest, bounded, polite.
//
// run: node tools/r11-probe.mjs
// in:  raw/r11-endpoints-2026-09-05.json
// out: raw/r11-probe-2026-09-05.json
//
// Rules held to:
//  - classify BEFORE requesting: template placeholders and example domains are
//    counted separately and never fetched
//  - DNS lookup per host, so "host does not resolve" is separated from "host 404s"
//  - robots.txt fetched once per host and Disallow honoured for the probed path
//  - at most PER_HOST distinct paths per host, serialised, GAP ms apart
//  - one retry only, and only on a network-level failure
//  - 8 s timeout

import { readFileSync, writeFileSync } from 'node:fs'
import dns from 'node:dns/promises'

const IN = 'raw/r11-endpoints-2026-09-05.json'
const OUT = 'raw/r11-probe-2026-09-05.json'
const UA = 'erc8004-census/1.0 (+research; liveness probe, one pass)'
const PER_HOST = 5
const GAP = 1500
const TIMEOUT = 8000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const TEMPLATE = /\{[^}]+\}|\$\{|<[a-z_]+>|:agentid\b/i
const EXAMPLE_HOST = /^(localhost$|127\.|0\.0\.0\.0|.*\.local$|example\.(com|org|net)$|.*\.example$|your-|my-domain|yourdomain|placeholder|test\.com$|foo\.bar$|agent\.example$)/i
const EXAMPLE_PATHY = /example\.com|your-agent|YOUR_|changeme/i

async function req(url, method = 'GET') {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), TIMEOUT)
  try {
    const r = await fetch(url, {
      method, redirect: 'follow', signal: ac.signal,
      headers: { 'user-agent': UA, accept: 'application/json, text/plain, */*' },
    })
    const hdr = {}
    for (const k of ['content-type', 'www-authenticate', 'x-payment', 'x-payment-required', 'server', 'location']) {
      const v = r.headers.get(k); if (v) hdr[k] = v.slice(0, 300)
    }
    const body = (await r.text()).slice(0, 20000)
    return { status: r.status, finalUrl: r.url, hdr, body }
  } catch (e) {
    return { status: 0, netErr: (e.name === 'AbortError' ? 'timeout' : String(e.cause?.code || e.message || e)).slice(0, 120) }
  } finally { clearTimeout(t) }
}

function looksJsonApi(r) {
  if (!r.body) return false
  const ct = (r.hdr && r.hdr['content-type']) || ''
  if (/json/i.test(ct)) return true
  const s = r.body.trimStart()
  return s.startsWith('{') || s.startsWith('[')
}
function isHtmlPage(r) {
  const ct = (r.hdr && r.hdr['content-type']) || ''
  if (/text\/html/i.test(ct)) return true
  return !!r.body && /^\s*<(!doctype|html)/i.test(r.body)
}
// x402 / B402 payment challenge: HTTP 402, or a body carrying the x402 accepts array
function is402(r) {
  if (r.status === 402) return true
  if (!r.body) return false
  try {
    const j = JSON.parse(r.body)
    if (j && (j.x402Version || Array.isArray(j.accepts))) return true
  } catch {}
  return false
}

function robotsAllows(robotsTxt, path) {
  if (!robotsTxt) return true
  let inStar = false, allowed = true
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const k = m[1].toLowerCase(), v = m[2].trim()
    if (k === 'user-agent') inStar = v === '*'
    else if (inStar && k === 'disallow' && v && path.startsWith(v)) allowed = false
    else if (inStar && k === 'allow' && v && path.startsWith(v)) allowed = true
  }
  return allowed
}

const endpoints = JSON.parse(readFileSync(IN, 'utf8'))

// bucket by host, classify placeholders first
const byHost = new Map()
const classified = []
for (const e of endpoints) {
  let cls = 'probe'
  if (TEMPLATE.test(e.url) || EXAMPLE_PATHY.test(e.url)) cls = 'template-placeholder'
  else if (!e.host) cls = 'unparseable-url'
  else if (EXAMPLE_HOST.test(e.host)) cls = 'example-domain'
  classified.push({ ...e, cls })
  if (cls === 'probe') {
    if (!byHost.has(e.host)) byHost.set(e.host, [])
    byHost.get(e.host).push(e)
  }
}

const hosts = {}
for (const [host, list] of byHost) {
  // spread the picks: most-shared first, then evenly across the rest
  list.sort((a, b) => b.agentCount - a.agentCount)
  const picks = [list[0]]
  const rest = list.slice(1)
  const step = Math.max(1, Math.floor(rest.length / (PER_HOST - 1)))
  for (let i = 0; i < rest.length && picks.length < PER_HOST; i += step) picks.push(rest[i])

  let ip = null, dnsErr = null
  try { const a = await dns.lookup(host); ip = a.address } catch (e) { dnsErr = String(e.code || e.message) }

  let robots = null, robotsStatus = null
  if (!dnsErr) {
    const r = await req(`https://${host}/robots.txt`)
    robotsStatus = r.status
    if (r.status === 200 && r.body && !isHtmlPage(r)) robots = r.body.slice(0, 8000)
    await sleep(GAP)
  }

  // ERC-8004 endpoint-domain verification file
  let wellKnown = null
  if (!dnsErr) {
    const r = await req(`https://${host}/.well-known/agent-registration.json`)
    wellKnown = { status: r.status, netErr: r.netErr, json: looksJsonApi(r), head: r.body ? r.body.slice(0, 300) : undefined }
    await sleep(GAP)
  }

  const probes = []
  for (const p of picks) {
    if (dnsErr) { probes.push({ url: p.url, agentCount: p.agentCount, skipped: 'dns-fail' }); continue }
    const path = (() => { try { const u = new URL(p.url); return u.pathname + (u.search || '') } catch { return '/' } })()
    if (!robotsAllows(robots, path)) { probes.push({ url: p.url, agentCount: p.agentCount, skipped: 'robots-disallow' }); continue }
    let r = await req(p.url)
    if (r.status === 0) { await sleep(GAP); r = await req(p.url) }   // one retry, network only
    probes.push({
      url: p.url, agentCount: p.agentCount, names: p.names,
      status: r.status, netErr: r.netErr, finalUrl: r.finalUrl, hdr: r.hdr,
      is402: is402(r), jsonApi: looksJsonApi(r), htmlPage: isHtmlPage(r),
      bodyHead: r.body ? r.body.slice(0, 500) : undefined,
    })
    await sleep(GAP)
  }
  hosts[host] = { host, ip, dnsErr, robotsStatus, robotsHasRules: !!robots, wellKnown, urlCount: list.length, agentCount: list.reduce((s, x) => s + x.agentCount, 0), probes }
  console.error('host', host, dnsErr ? 'DNS-FAIL ' + dnsErr : 'ip ' + ip, 'probed', probes.length)
}

const summary = {
  totalUniqueUrls: endpoints.length,
  byClass: classified.reduce((a, e) => ((a[e.cls] = (a[e.cls] || 0) + 1), a), {}),
  agentsByClass: classified.reduce((a, e) => ((a[e.cls] = (a[e.cls] || 0) + e.agentCount), a), {}),
  hostCount: byHost.size,
}
writeFileSync(OUT, JSON.stringify({ summary, classified, hosts }, null, 1))
console.error(JSON.stringify(summary, null, 1))
