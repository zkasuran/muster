// R11 analysis. Distributions over the 600-agent uniform sample, the four mandated
// category keywords, and the stranger-pays funnel.
//
// run: node tools/r11-analyze.mjs
// out: raw/r11-analysis-2026-09-05.json  and a printed digest

import { readFileSync, writeFileSync } from 'node:fs'

const A = JSON.parse(readFileSync('raw/r11-agents-merged-2026-09-05.json', 'utf8'))
const P = JSON.parse(readFileSync('raw/r11-probe-2026-09-05.json', 'utf8'))
const S = Object.values(A).filter((x) => !x.isProbe)
const N = S.length

const pct = (k) => `${k}/${N} = ${(100 * k / N).toFixed(2)}%`
// Wilson 95% interval, so a share from n=600 is reported with its real width
function wilson(k, n) {
  if (!n) return [0, 0]
  const z = 1.959964, p = k / n
  const d = 1 + z * z / n
  const c = p + z * z / (2 * n)
  const s = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
  return [Math.max(0, (c - s) / d), Math.min(1, (c + s) / d)]
}
const share = (k) => { const [lo, hi] = wilson(k, N); return { k, n: N, pct: +(100 * k / N).toFixed(2), ci95: [+(100 * lo).toFixed(2), +(100 * hi).toFixed(2)] } }

// ---------------------------------------------------------------- names
const nameCount = {}
for (const r of S) { const k = r.name === null ? '(no name / doc unreadable)' : r.name; nameCount[k] = (nameCount[k] || 0) + 1 }
const names = Object.entries(nameCount).sort((a, b) => b[1] - a[1])
const distinctNames = names.length

// ---------------------------------------------------------------- uri and doc
const uriKinds = {}
for (const r of S) uriKinds[r.uriKind] = (uriKinds[r.uriKind] || 0) + 1
const docOk = S.filter((r) => r.name !== null || r.description !== null || r.services.length)
const docParsed = S.filter((r) => r.docSource !== null && !r.docErr)

// ---------------------------------------------------------------- endpoints
const isHttp = (e) => typeof e === 'string' && /^https?:\/\//i.test(e)
const TEMPLATE = /\{[^}]+\}|\$\{|<[a-z_]+>|:agentid\b/i
const hostOf = (u) => { try { return new URL(u).host.toLowerCase() } catch { return null } }

const hostVerdict = {}
for (const [h, v] of Object.entries(P.hosts)) {
  const probes = (v.probes || []).filter((p) => p.status !== undefined)
  hostVerdict[h] = {
    dnsOk: !v.dnsErr, dnsErr: v.dnsErr, ip: v.ip,
    anyTlsFail: probes.some((p) => p.netErr && /TLS|CERT|ECONNRESET|EPROTO/i.test(p.netErr)),
    allNetFail: probes.length > 0 && probes.every((p) => p.status === 0),
    anyOk: probes.some((p) => p.status >= 200 && p.status < 400),
    any404: probes.some((p) => p.status === 404),
    anyJson: probes.some((p) => p.jsonApi),
    allHtml: probes.length > 0 && probes.every((p) => p.htmlPage),
    any402: probes.some((p) => p.is402),
    wellKnown200: v.wellKnown && v.wellKnown.status === 200,
    probeCount: probes.length,
    urlCount: v.urlCount,
  }
}

const per = S.map((r) => {
  const eps = r.services.filter((s) => isHttp(s.endpoint))
  const concrete = eps.filter((s) => !TEMPLATE.test(s.endpoint))
  const templated = eps.filter((s) => TEMPLATE.test(s.endpoint))
  const hosts = [...new Set(concrete.map((s) => hostOf(s.endpoint)).filter(Boolean))]
  const hv = hosts.map((h) => hostVerdict[h]).filter(Boolean)
  const apiNamed = concrete.filter((s) => /a2a|mcp|oasf|api|rpc|x402|q402|relay|jsonrpc|card/i.test(String(s.name || '') + ' ' + s.endpoint))
  return {
    id: r.id, name: r.name,
    docParsed: r.docSource !== null && !r.docErr,
    httpEndpoints: eps.length,
    concreteEndpoints: concrete.length,
    templatedEndpoints: templated.length,
    hosts,
    dnsOk: hv.length > 0 && hv.some((h) => h.dnsOk),
    dnsFailOnly: hv.length > 0 && hv.every((h) => !h.dnsOk),
    tlsFail: hv.length > 0 && hv.every((h) => h.anyTlsFail || h.allNetFail),
    reachable: hv.some((h) => h.anyOk),
    jsonSurface: hv.some((h) => h.anyJson) && apiNamed.length > 0,
    jsonAnywhere: hv.some((h) => h.anyJson),
    htmlOnly: hv.length > 0 && hv.every((h) => h.allHtml),
    challenge402: hv.some((h) => h.any402),
    walletEqualsOwner: r.walletEqualsOwner,
    x402Support: r.x402Support === true,
    priceInDoc: /\b(price|pricing|fee|cost|per call|per request|usd|usdt|usd1|cake|bnb)\b/i.test(String(r.description || '')) && /\d/.test(String(r.description || '')),
  }
})

const T0 = per.filter((p) => p.docParsed && p.concreteEndpoints > 0)
const T1 = T0.filter((p) => p.reachable)
const T2 = T1.filter((p) => p.jsonSurface)
const T3 = T2.filter((p) => p.challenge402 || (p.x402Support && p.priceInDoc))

// ---------------------------------------------------------------- categories
const CAT = {
  rebalancing: { narrow: /rebalanc/i, wide: /rebalanc|portfolio\s*(drift|weight|allocation)|target\s*weight/i },
  grid: { narrow: /\bgrid\b/i, wide: /\bgrid\b|grid\s*(bot|trading|strateg)|range\s*order/i },
  yield: { narrow: /\byield\b|\bapy\b|\bapr\b/i, wide: /\byield\b|\bapy\b|\bapr\b|farm(ing)?\b|vault|stak(e|ing)|lend(ing)?\b|deposit\s*rate/i },
  healthFactor: { narrow: /health\s*-?\s*factor/i, wide: /health\s*-?\s*factor|liquidat(e|ion)|collateral(is|iz)ation|\bltv\b|loan[- ]to[- ]value|margin\s*call/i },
}
const hay = (r) => [r.name, r.description, ...(r.skills || []), ...r.services.map((s) => `${s.name} ${s.endpoint}`)].filter(Boolean).join(' \n ')
const cats = {}
for (const [k, v] of Object.entries(CAT)) {
  const nh = S.filter((r) => v.narrow.test(hay(r)))
  const wh = S.filter((r) => v.wide.test(hay(r)))
  cats[k] = { narrow: share(nh.length), wide: share(wh.length), narrowIds: nh.map((r) => r.id).slice(0, 30), narrowNames: [...new Set(nh.map((r) => r.name))].slice(0, 20) }
}
const allFourNarrow = S.filter((r) => Object.values(CAT).every((v) => v.narrow.test(hay(r))))
const anyFourNarrow = S.filter((r) => Object.values(CAT).some((v) => v.narrow.test(hay(r))))

// ---------------------------------------------------------------- output
const out = {
  measuredAt: new Date().toISOString(),
  sample: { n: N, seed: '20260905', maxId: 334923, prng: 'splitmix64' },
  names: { distinct: distinctNames, top: names.slice(0, 25), topClusterShare: share(names[0][1]), singletons: names.filter(([, c]) => c === 1).length },
  uriKinds,
  docs: { parsed: share(docParsed.length), unreadable: share(N - docParsed.length) },
  endpoints: {
    anyHttp: share(per.filter((p) => p.httpEndpoints > 0).length),
    concrete: share(per.filter((p) => p.concreteEndpoints > 0).length),
    templatedOnly: share(per.filter((p) => p.httpEndpoints > 0 && p.concreteEndpoints === 0).length),
    none: share(per.filter((p) => p.httpEndpoints === 0).length),
    dnsFailOnly: share(per.filter((p) => p.dnsFailOnly).length),
    tlsFail: share(per.filter((p) => p.concreteEndpoints > 0 && p.tlsFail).length),
    reachable: share(per.filter((p) => p.reachable).length),
    htmlOnly: share(per.filter((p) => p.reachable && p.htmlOnly).length),
    jsonSurface: share(per.filter((p) => p.jsonSurface).length),
    challenge402: share(per.filter((p) => p.challenge402).length),
    hostCount: new Set(per.flatMap((p) => p.hosts)).size,
  },
  wallets: {
    getAgentWalletNonZero: share(S.filter((r) => r.agentWallet && r.agentWallet !== '0x0000000000000000000000000000000000000000').length),
    equalsOwner: share(S.filter((r) => r.walletEqualsOwner).length),
    distinctFromOwner: share(S.filter((r) => !r.walletEqualsOwner).length),
  },
  x402: { declaredTrue: share(S.filter((r) => r.x402Support === true).length), declaredFalse: share(S.filter((r) => r.x402Support === false).length), absent: share(S.filter((r) => r.x402Support === undefined || r.x402Support === null).length) },
  categories: cats,
  categoriesCombined: { allFourNarrow: share(allFourNarrow.length), anyOfFourNarrow: share(anyFourNarrow.length) },
  strangerPaysFunnel: { tier0_discoverable: share(T0.length), tier1_reachable: share(T1.length), tier2_machineCallable: share(T2.length), tier3_payable: share(T3.length),
    tier2Ids: T2.map((p) => ({ id: p.id, name: p.name, hosts: p.hosts })), tier3Ids: T3.map((p) => ({ id: p.id, name: p.name, hosts: p.hosts })) },
  hostVerdict,
  perAgent: per,
}
writeFileSync('raw/r11-analysis-2026-09-05.json', JSON.stringify(out, null, 1))

console.log('n =', N)
console.log('distinct names', distinctNames, '| top:', names.slice(0, 8).map(([k, v]) => `${v}x ${k}`).join(' | '))
console.log('uriKinds', uriKinds)
console.log('doc parsed', pct(docParsed.length))
console.log('endpoints', JSON.stringify(out.endpoints))
console.log('wallets', JSON.stringify(out.wallets))
console.log('x402', JSON.stringify(out.x402))
for (const [k, v] of Object.entries(cats)) console.log('cat', k, 'narrow', v.narrow.k, 'wide', v.wide.k, '| names:', v.narrowNames.slice(0, 6).join(' / '))
console.log('allFourNarrow', allFourNarrow.length, 'anyOfFour', anyFourNarrow.length)
console.log('funnel T0', T0.length, 'T1', T1.length, 'T2', T2.length, 'T3', T3.length)
console.log('T2 members', JSON.stringify(out.strangerPaysFunnel.tier2Ids))
