import { batch, u256 } from './rpc.mjs';
const MC = '0xcA11bde05977b3631167028862bE2a173976CA11';
const ID = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
// aggregate3((address,bool,bytes)[]) = 0x82ad56cb
export function aggregate3(calls) {          // calls: [{target,data}]
  const n = calls.length;
  let head = u256(32);                        // offset to array
  head += u256(n);
  const offs = [];
  let tail = '';
  let cursor = n * 32;
  for (const c of calls) {
    const d = c.data.slice(2);
    const words = Math.ceil(d.length / 64);
    const struct = u256(BigInt('0x' + c.target.slice(2).toLowerCase())) + u256(c.allowFailure ? 1 : 0) + u256(96) + u256(d.length / 2) + d + '0'.repeat(words * 64 - d.length);
    offs.push(cursor);
    cursor += struct.length / 2;
    tail += struct;
  }
  return '0x82ad56cb' + head + offs.map(o => u256(o)).join('') + tail;
}
export function decodeAggregate3(hex) {
  const b = hex.slice(2);
  const w = i => b.slice(i * 64, (i + 1) * 64);
  const arrAt = parseInt(w(0), 16) / 32;
  const n = parseInt(w(arrAt), 16);
  const out = [];
  for (let i = 0; i < n; i++) {
    const so = arrAt + 1 + parseInt(w(arrAt + 1 + i), 16) / 32;
    const ok = parseInt(w(so), 16) === 1;
    const dOff = so + parseInt(w(so + 1), 16) / 32;
    const len = parseInt(w(dOff), 16);
    out.push({ ok, data: '0x' + b.slice((dOff + 1) * 64, (dOff + 1) * 64 + len * 2) });
  }
  return out;
}
export function decStr(hex) {
  if (!hex || hex === '0x') return null;
  const b = hex.slice(2);
  const off = parseInt(b.slice(0, 64), 16) * 2;
  const len = parseInt(b.slice(off, off + 64), 16) * 2;
  return Buffer.from(b.slice(off + 64, off + 64 + len), 'hex').toString('utf8');
}
if (process.argv[2] === 'test') {
  for (const N of [50, 100, 200, 400]) {
    const calls = [];
    for (let i = 0; i < N; i++) calls.push({ target: ID, allowFailure: true, data: '0xc87b56dd' + u256(1000 + i) });
    const t0 = Date.now();
    const [r] = await batch([{ method: 'eth_call', params: [{ to: MC, data: aggregate3(calls) }, 'latest'] }]);
    const ms = Date.now() - t0;
    if (r.error) { console.log(`N=${N} ERR ${r.error.message}`); continue }
    const d = decodeAggregate3(r.result);
    const bytes = r.result.length / 2;
    console.log(`N=${N} ok=${d.filter(x => x.ok).length}/${d.length} respBytes=${bytes} ms=${ms} sample=${JSON.stringify((decStr(d[0].data) || '').slice(0, 40))}`);
    await new Promise(r => setTimeout(r, 400));
  }
}
