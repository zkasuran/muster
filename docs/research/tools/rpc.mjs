export const RPCS = [
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed.binance.org',
  'https://binance.llamarpc.com',
];
let rpcIdx = 0;
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function batch(calls, { tries = 5 } = {}) {
  const body = calls.map((c, i) => ({ jsonrpc: '2.0', id: i, method: c.method, params: c.params }));
  for (let t = 0; t < tries; t++) {
    const url = RPCS[rpcIdx % RPCS.length];
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      if (!Array.isArray(j)) throw new Error('not a batch: ' + JSON.stringify(j).slice(0, 200));
      const out = new Array(calls.length);
      for (const e of j) out[e.id] = e;
      return out;
    } catch (e) {
      rpcIdx++;
      await sleep(600 * (t + 1));
      if (t === tries - 1) throw e;
    }
  }
}
export const u256 = n => BigInt(n).toString(16).padStart(64, '0');
export const call = (to, data) => ({ method: 'eth_call', params: [{ to, data }, 'latest'] });
export function decStr(hex) {
  if (!hex || hex === '0x') return null;
  const b = hex.slice(2);
  const off = parseInt(b.slice(0, 64), 16) * 2;
  const len = parseInt(b.slice(off, off + 64), 16) * 2;
  return Buffer.from(b.slice(off + 64, off + 64 + len), 'hex').toString('utf8');
}
export const decAddr = hex => (!hex || hex === '0x') ? null : '0x' + hex.slice(-40);
export const decUint = hex => (!hex || hex === '0x') ? null : BigInt(hex);
