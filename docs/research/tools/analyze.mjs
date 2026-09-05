import fs from 'fs';
const s = JSON.parse(fs.readFileSync('raw/bsc-tokenuri-sample-2026-09-05.json', 'utf8'));
const ids = Object.keys(s).map(Number).sort((a, b) => a - b);
let scheme = {}, errs = 0, emptyUri = 0, zeroWallet = 0, walletEqOwner = 0, walletDiff = 0;
const parsed = {};
for (const id of ids) {
  const e = s[id];
  if (typeof e.uri === 'string' && e.uri.startsWith('ERR:')) { errs++; continue; }
  const u = e.uri || '';
  let k = 'other';
  if (u === '') { k = '(empty)'; emptyUri++; }
  else if (u.startsWith('data:application/json;base64,')) k = 'data:application/json;base64';
  else if (u.startsWith('data:')) k = 'data:other';
  else if (u.startsWith('https://')) k = 'https';
  else if (u.startsWith('http://')) k = 'http';
  else if (u.startsWith('ipfs://')) k = 'ipfs';
  else if (u.startsWith('ar://')) k = 'ar';
  scheme[k] = (scheme[k] || 0) + 1;
  if (k === 'data:application/json;base64') {
    try { parsed[id] = JSON.parse(Buffer.from(u.slice(29), 'base64').toString('utf8')); }
    catch (err) { parsed[id] = { __parse_error: String(err.message) }; }
  }
  const w = (e.agentWallet || '').toLowerCase();
  if (w === '0x0000000000000000000000000000000000000000') zeroWallet++;
  else if (w === (e.owner || '').toLowerCase()) walletEqOwner++;
  else walletDiff++;
}
console.log('sampled ids:', ids.length, ' min:', ids[0], ' max:', ids[ids.length - 1]);
console.log('tokenURI errors:', errs);
console.log('uri schemes:', JSON.stringify(scheme, null, 1));
console.log('agentWallet: zero=%d equalsOwner=%d different=%d', zeroWallet, walletEqOwner, walletDiff);
// key frequency over decoded data-uri docs
const keyCount = {}, typeVals = {}, trustVals = {}, svcNames = {}, x402 = {}, extraShape = {};
const nested = {};
function noteKeys(o, prefix, bag) {
  for (const [k, v] of Object.entries(o)) {
    const p = prefix + k;
    bag[p] = (bag[p] || 0) + 1;
    const t = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
    (extraShape[p] = extraShape[p] || {})[t] = (extraShape[p][t] || 0) + 1;
  }
}
const n = Object.keys(parsed).length;
for (const [id, d] of Object.entries(parsed)) {
  if (d.__parse_error) { keyCount['__parse_error'] = (keyCount['__parse_error'] || 0) + 1; continue; }
  noteKeys(d, '', keyCount);
  if (d.type) typeVals[d.type] = (typeVals[d.type] || 0) + 1;
  for (const t of (d.supportedTrust || [])) trustVals[t] = (trustVals[t] || 0) + 1;
  for (const sv of (d.services || [])) {
    svcNames[sv.name] = (svcNames[sv.name] || 0) + 1;
    noteKeys(sv, 'services[].', nested);
  }
  if ('x402Support' in d) x402[String(d.x402Support)] = (x402[String(d.x402Support)] || 0) + 1;
  for (const r of (d.registrations || [])) noteKeys(r, 'registrations[].', nested);
}
console.log('\ndecoded data-uri docs:', n);
const pct = c => (100 * c / n).toFixed(1) + '%';
console.log('\ntop-level keys (count, share of decoded docs):');
for (const [k, c] of Object.entries(keyCount).sort((a, b) => b[1] - a[1]))
  console.log(`  ${k.padEnd(20)} ${String(c).padStart(4)}  ${pct(c).padStart(6)}  types=${JSON.stringify(extraShape[k])}`);
console.log('\nnested keys:');
for (const [k, c] of Object.entries(nested).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(28)} ${c}`);
console.log('\ntype values:', JSON.stringify(typeVals, null, 1));
console.log('supportedTrust values:', JSON.stringify(trustVals, null, 1));
console.log('services[].name values:', JSON.stringify(svcNames, null, 1));
console.log('x402Support values:', JSON.stringify(x402, null, 1));
fs.writeFileSync('raw/bsc-decoded-registration-docs-2026-09-05.json', JSON.stringify(parsed));
