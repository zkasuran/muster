import fs from 'fs';
const s = JSON.parse(fs.readFileSync('raw/bsc-tokenuri-sample-2026-09-05.json', 'utf8'));
const byHost = {};
for (const [id, e] of Object.entries(s)) {
  const u = e.uri || '';
  if (!u.startsWith('https://')) continue;
  let h; try { h = new URL(u).host } catch { continue }
  (byHost[h] = byHost[h] || []).push([id, u]);
}
const out = {};
for (const [h, list] of Object.entries(byHost)) {
  for (const [id, u] of list.slice(0, 3)) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
      const t = await r.text();
      out[id] = { host: h, url: u, status: r.status, ct: r.headers.get('content-type'), body: t.slice(0, 20000) };
      console.error(h, id, r.status, t.length + 'B');
    } catch (e) { out[id] = { host: h, url: u, error: String(e.message) }; console.error(h, id, 'ERR', e.message); }
    await new Promise(r => setTimeout(r, 400));
  }
}
fs.writeFileSync('raw/bsc-offchain-registration-fetches-2026-09-05.json', JSON.stringify(out, null, 1));
