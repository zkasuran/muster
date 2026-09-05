import { batch, call, u256, decStr, decAddr, sleep } from './rpc.mjs';
import fs from 'fs';
const ID = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const MAX = 334877;
const ids = [];
for (let i = 1; i <= 24; i++) ids.push(i);
for (let i = 1; i <= 400; i++) ids.push(Math.round(i * MAX / 401));
let seed = 20260905;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let i = 0; i < 120; i++) ids.push(1 + Math.floor(rnd() * MAX));
const uniq = [...new Set(ids)].filter(x => x >= 1 && x <= MAX).sort((a, b) => a - b);
console.error('sampling', uniq.length, 'ids');
const out = {};
const CH = 20;
for (let i = 0; i < uniq.length; i += CH) {
  const chunk = uniq.slice(i, i + CH);
  const calls = [];
  for (const id of chunk) {
    calls.push(call(ID, '0xc87b56dd' + u256(id)));
    calls.push(call(ID, '0x6352211e' + u256(id)));
    calls.push(call(ID, '0x00339509' + u256(id)));
  }
  let res = await batch(calls);
  for (let k = 0; k < calls.length; k++) {
    if (res[k] === undefined) { const [r] = await batch([calls[k]]); res[k] = r; await sleep(150); }
  }
  chunk.forEach((id, k) => {
    const t = res[k * 3], o = res[k * 3 + 1], w = res[k * 3 + 2];
    out[id] = {
      uri: t.error ? 'ERR:' + t.error.message : decStr(t.result),
      owner: o.error ? 'ERR' : decAddr(o.result),
      agentWallet: w.error ? 'ERR' : decAddr(w.result),
    };
  });
  process.stderr.write(`\r${i + chunk.length}/${uniq.length}   `);
  await sleep(300);
}
process.stderr.write('\n');
fs.writeFileSync('raw/bsc-tokenuri-sample-2026-09-05.json', JSON.stringify(out));
console.error('wrote', Object.keys(out).length, 'entries');
