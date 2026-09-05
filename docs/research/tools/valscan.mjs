import { batch, call, u256, sleep } from './rpc.mjs';
import fs from 'fs';
const VAL = '0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58';
const MAX = 334908;
const ids = [];
for (let i = 0; i <= 600; i++) ids.push(i);
for (let i = 1; i <= 1400; i++) ids.push(Math.round(i * MAX / 1401));
const uniq = [...new Set(ids)];
let nonEmpty = 0, checked = 0, missing = 0;
const hits = {};
const CH = 60;
for (let i = 0; i < uniq.length; i += CH) {
  const chunk = uniq.slice(i, i + CH);
  let res = await batch(chunk.map(id => call(VAL, '0x8d5d0c2d' + u256(id))));
  for (let n = 0; n < chunk.length; n++) if (res[n] === undefined) { const [r] = await batch([call(VAL, '0x8d5d0c2d' + u256(chunk[n]))]); res[n] = r; await sleep(120) }
  chunk.forEach((id, k) => {
    const r = res[k];
    if (!r || r.error) { missing++; return }
    checked++;
    const n = parseInt(r.result.slice(66, 130), 16);
    if (n > 0) { nonEmpty++; hits[id] = n }
  });
  process.stderr.write(`\r${i + chunk.length}/${uniq.length} nonEmpty=${nonEmpty}  `);
  await sleep(220);
}
process.stderr.write('\n');
console.log('agentIds checked with getAgentValidations:', checked, ' unreadable:', missing);
console.log('agentIds with >=1 validation request:', nonEmpty, JSON.stringify(hits));
fs.writeFileSync('raw/bsc-validation-scan-2026-09-05.json', JSON.stringify({checked, missing, hits}, null, 1));
