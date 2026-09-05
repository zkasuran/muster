// R12: on-chain sweep for declared A2A / MCP endpoints, no indexer in the path.
// Uses the lane's existing Multicall3 helper. Reads the newest N agentIds, decodes
// tokenURI, resolves the registration document (https, data base64, data gzip), then
// extracts every service entry so the distinct A2A and MCP hosts can be probed live.
import { gunzipSync } from 'node:zlib';
import { batch, call, sleep, u256 } from './rpc.mjs';
import { aggregate3, decodeAggregate3 } from './mc.mjs';

const MC = '0xcA11bde05977b3631167028862bE2a173976CA11';
const REG = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const SLOT_LASTID = '0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00';
const TOKENURI = '0xc87b56dd';

function decStrRaw(hex) {
  if (!hex || hex === '0x') return null;
  const b = hex.slice(2);
  const off = parseInt(b.slice(0, 64), 16) * 2;
  const len = parseInt(b.slice(off, off + 64), 16) * 2;
  return Buffer.from(b.slice(off + 64, off + 64 + len), 'hex').toString('utf8');
}

function parseDataUri(uri) {
  if (!uri.startsWith('data:')) return null;
  const comma = uri.indexOf(',');
  if (comma < 0) return null;
  const meta = uri.slice(5, comma);
  const payload = uri.slice(comma + 1);
  let buf;
  try { buf = /base64/i.test(meta) ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf8'); } catch { return null; }
  if (/gzip/i.test(meta)) { try { buf = gunzipSync(buf); } catch { return null; } }
  try { return JSON.parse(buf.toString('utf8')); } catch { return null; }
}

const COUNT = Number(process.argv[2] || 200);
const START = process.argv[3] ? Number(process.argv[3]) : null;   // omit for the newest window

const st = await batch([{ method: 'eth_getStorageAt', params: [REG, SLOT_LASTID, 'latest'] }]);
const lastId = Number(BigInt(st[0].result));
process.stderr.write(`_lastId = ${lastId} (agentIds 0..${lastId - 1})\n`);
const first = START === null ? lastId - COUNT : START;
const ids = Array.from({ length: COUNT }, (_, i) => first + i);

const rows = [];
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100);
  const data = aggregate3(chunk.map((id) => ({ target: REG, allowFailure: true, data: TOKENURI + u256(id) })));
  const res = await batch([call(MC, data)]);
  if (res[0].error) { process.stderr.write(`batch err ${JSON.stringify(res[0].error).slice(0, 120)}\n`); continue; }
  const dec = decodeAggregate3(res[0].result);
  dec.forEach((d, k) => rows.push({ id: chunk[k], uri: d.ok ? decStrRaw(d.data) : null }));
  process.stderr.write(`onchain ${rows.length}/${ids.length}\n`);
  await sleep(300);
}

const services = [];
const httpDocs = new Map();
for (const r of rows) {
  if (r.uri === null) { r.kind = 'call-failed'; continue; }
  if (r.uri.startsWith('data:')) {
    const doc = parseDataUri(r.uri);
    r.kind = doc ? 'data-uri' : 'data-uri-unparseable';
    if (doc) for (const s of doc.services || []) services.push({ id: r.id, src: 'data', name: s.name, endpoint: s.endpoint, version: s.version });
  } else if (/^https?:\/\//.test(r.uri)) { r.kind = 'http'; httpDocs.set(r.id, r.uri); }
  else if (r.uri.startsWith('ipfs://')) r.kind = 'ipfs';
  else if (r.uri === '') r.kind = 'empty';
  else r.kind = 'junk';
}

const seenUrl = new Map();
let fetched = 0, fetchFail = 0;
for (const [id, url] of httpDocs) {
  if (!seenUrl.has(url)) {
    let doc = null;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const txt = await r.text();
      if ((r.headers.get('content-type') || '').includes('json') || txt.trimStart().startsWith('{')) doc = JSON.parse(txt);
    } catch { }
    seenUrl.set(url, doc);
    doc ? fetched++ : fetchFail++;
    await sleep(200);
  }
  const doc = seenUrl.get(url);
  if (doc) for (const s of doc.services || []) services.push({ id, src: 'http', name: s.name, endpoint: s.endpoint, version: s.version });
}

const kinds = {}; for (const r of rows) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
const byName = {}; for (const s of services) { const k = String(s.name).toLowerCase(); byName[k] = (byName[k] || 0) + 1; }
const hosts = {};
for (const s of services) {
  const k = String(s.name).toLowerCase();
  if (!/a2a|mcp/.test(k)) continue;
  let h = 'unparseable';
  try { h = new URL(String(s.endpoint).replace('{agentId}', '1')).host; } catch { }
  const key = `${k}|${h}`;
  hosts[key] = hosts[key] || { n: 0, sample: s.endpoint, versions: [] };
  hosts[key].n++;
  if (s.version && !hosts[key].versions.includes(s.version)) hosts[key].versions.push(s.version);
}

console.log(JSON.stringify({
  registry: REG, lastId, sampled: { first, count: COUNT },
  uri_kinds: kinds, distinct_http_urls: seenUrl.size, http_docs_parsed: fetched, http_docs_failed: fetchFail,
  service_name_counts: byName, a2a_mcp_hosts: hosts,
  agents_with_any_service: new Set(services.map((s) => s.id)).size,
}, null, 1));
