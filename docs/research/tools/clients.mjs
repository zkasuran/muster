import { batch, call, u256, decAddr, sleep } from './rpc.mjs';
import fs from 'fs';
const REP = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
const MAX = 334877;
const ids = [];
for (let i = 0; i <= 1200; i++) ids.push(i);                        // dense early
for (let i = 1; i <= 900; i++) ids.push(Math.round(i * MAX / 901)); // stratified
const uniq = [...new Set(ids)].filter(x => x >= 0 && x <= MAX);
const hits = {};
const CH = 60;
function decAddrArr(hex) {
  if (!hex || hex === '0x') return [];
  const b = hex.slice(2);
  const n = parseInt(b.slice(64, 128), 16);
  const out = [];
  for (let i = 0; i < n; i++) out.push('0x' + b.slice(128 + i * 64 + 24, 128 + (i + 1) * 64));
  return out;
}
let scanned = 0;
for (let i = 0; i < uniq.length; i += CH) {
  const chunk = uniq.slice(i, i + CH);
  const res = await batch(chunk.map(id => call(REP, '0x42dd519c' + u256(id))));
  chunk.forEach((id, k) => {
    const r = res[k];
    if (!r || r.error) return;
    const a = decAddrArr(r.result);
    if (a.length) hits[id] = a;
  });
  scanned += chunk.length;
  process.stderr.write(`\r${scanned}/${uniq.length} hits=${Object.keys(hits).length}   `);
  await sleep(220);
}
process.stderr.write('\n');
fs.writeFileSync('raw/bsc-getclients-hits-2026-09-05.json', JSON.stringify(hits, null, 1));
console.log('agents with >=1 feedback client, out of', scanned, 'scanned:', Object.keys(hits).length);
for (const [id, a] of Object.entries(hits).slice(0, 30)) console.log(' agent', id, 'clients=', a.length, a.slice(0, 3).join(' '));
