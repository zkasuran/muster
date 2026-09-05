// R12: sweep live A2A cards declared by BSC ERC-8004 agents.
// Reads the 8004scan index for BSC agents that declare an A2A service, pulls each
// agent detail for its a2a_endpoint, then fetches the card itself and classifies
// which A2A revision the bytes actually match.
const API = 'https://api.8004scan.io/api/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function j(url, opts = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(25000) });
      const ct = r.headers.get('content-type') || '';
      const body = await r.text();
      return { status: r.status, ct, body };
    } catch (e) {
      if (i === 2) return { status: 0, ct: '', body: String(e) };
      await sleep(1200 * (i + 1));
    }
  }
}

function classify(card) {
  const has = (k) => Object.prototype.hasOwnProperty.call(card, k);
  if (has('supportedInterfaces')) return 'v1.0 (supportedInterfaces)';
  if (has('protocolVersion')) return `0.x declared ${card.protocolVersion}`;
  if (has('url') || has('additionalInterfaces')) return '0.x undeclared (url present, no protocolVersion)';
  return 'not an A2A card shape';
}

const REQUIRED_V1 = ['name', 'description', 'supportedInterfaces', 'version', 'capabilities', 'defaultInputModes', 'defaultOutputModes', 'skills'];

const seenHost = new Set();
const rows = [];
let offset = 0;
const WANT = Number(process.argv[2] || 40);

while (rows.length < WANT && offset < 400) {
  const listUrl = `${API}/agents?chain_id=56&has_a2a=true&limit=20&offset=${offset}`;
  const list = await j(listUrl);
  offset += 20;
  let items = [];
  try { items = JSON.parse(list.body).items || []; } catch { process.stderr.write(`LIST FAIL ${list.status} ${list.body.slice(0, 200)}\n`); break; }
  if (!items.length) { process.stderr.write(`LIST EMPTY ${list.status} at offset ${offset}\n`); break; }
  for (const it of items) {
    if (rows.length >= WANT) break;
    await sleep(400);
    const d = await j(`${API}/agents/56/${it.token_id}`);
    let det = {};
    try { det = JSON.parse(d.body); } catch { continue; }
    const ep = det.a2a_endpoint;
    if (!ep) { rows.push({ token_id: it.token_id, name: it.name, a2a_endpoint: null, note: 'index says has_a2a but detail has no a2a_endpoint' }); continue; }
    let host = null;
    try { host = new URL(ep.replace('{agentId}', String(it.token_id))).host; } catch { }
    const key = `${host}|${ep.includes('{agentId}') ? 'tmpl' : ep}`;
    if (seenHost.has(key)) continue;
    seenHost.add(key);
    const url = ep.replace('{agentId}', String(it.token_id));
    await sleep(500);
    const c = await j(url);
    let card = null, parseErr = null;
    try { card = JSON.parse(c.body); } catch (e) { parseErr = String(e).slice(0, 80); }
    const inner = card && card.card && typeof card.card === 'object' ? card.card : card;
    rows.push({
      token_id: it.token_id, name: it.name, a2a_endpoint: ep, fetched: url,
      declared_version: det.a2a_version || null,
      status: c.status, ct: c.ct.split(';')[0], bytes: c.body.length,
      parseErr,
      shape: inner && typeof inner === 'object' ? classify(inner) : null,
      wrapped: card !== inner,
      missing_v1_required: inner && typeof inner === 'object' ? REQUIRED_V1.filter((k) => !(k in inner)) : null,
      skills: inner && Array.isArray(inner.skills) ? inner.skills.length : null,
      skills_missing_tags: inner && Array.isArray(inner.skills) ? inner.skills.filter((s) => !Array.isArray(s.tags)).length : null,
      top_keys: inner && typeof inner === 'object' ? Object.keys(inner).slice(0, 24) : null,
    });
    process.stderr.write(`${rows.length}. ${it.token_id} ${host} ${c.status} ${rows[rows.length - 1].shape}\n`);
  }
}

console.log(JSON.stringify(rows, null, 1));
