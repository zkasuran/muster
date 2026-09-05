import { batch, call, u256, sleep } from './rpc.mjs';
import fs from 'fs';
const REP = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
const hits = JSON.parse(fs.readFileSync('raw/bsc-getclients-hits-2026-09-05.json', 'utf8'));
const ids = Object.keys(hits).map(Number).sort((a, b) => a - b);
// readAllFeedback(agentId, [], "", "", true)
function enc(id) {
  const head = '0xd9d84224';
  const p = [u256(id), u256(0xa0), u256(0xc0), u256(0xe0), u256(1), u256(0), u256(0), u256(0)];
  return head + p.join('');
}
function dec(hex) {
  const b = hex.slice(2);
  const w = i => b.slice(i * 64, (i + 1) * 64);
  const offs = [0, 1, 2, 3, 4, 5, 6].map(i => parseInt(w(i), 16) / 32);
  const arr = o => { const n = parseInt(w(o), 16); return Array.from({ length: n }, (_, i) => w(o + 1 + i)); };
  const strArr = o => {
    const n = parseInt(w(o), 16);
    return Array.from({ length: n }, (_, i) => {
      const so = o + 1 + parseInt(w(o + 1 + i), 16) / 32;
      const len = parseInt(w(so), 16);
      return Buffer.from(b.slice((so + 1) * 64, (so + 1) * 64 + len * 2), 'hex').toString('utf8');
    });
  };
  const toI128 = h => { let v = BigInt('0x' + h); if (v >= 1n << 127n) v -= 1n << 128n; return v.toString(); };
  return {
    clients: arr(offs[0]).map(x => '0x' + x.slice(24)),
    idx: arr(offs[1]).map(x => parseInt(x, 16)),
    values: arr(offs[2]).map(toI128),
    dec: arr(offs[3]).map(x => parseInt(x, 16)),
    tag1: strArr(offs[4]),
    tag2: strArr(offs[5]),
    revoked: arr(offs[6]).map(x => parseInt(x, 16) === 1),
  };
}
const out = {};
const CH = 12;
for (let i = 0; i < ids.length; i += CH) {
  const chunk = ids.slice(i, i + CH);
  const res = await batch(chunk.map(id => call(REP, enc(id))));
  chunk.forEach((id, k) => {
    const r = res[k];
    if (!r || r.error) { out[id] = { error: r?.error?.message || 'missing' }; return; }
    try { out[id] = dec(r.result) } catch (e) { out[id] = { error: 'decode ' + e.message } }
  });
  process.stderr.write(`\r${i + chunk.length}/${ids.length}  `);
  await sleep(300);
}
process.stderr.write('\n');
fs.writeFileSync('raw/bsc-feedback-survey-2026-09-05.json', JSON.stringify(out));
console.log('agents surveyed:', Object.keys(out).length);
