import { batch, call, u256, sleep } from './rpc.mjs';
import fs from 'fs';
const ID = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const KEYS = ['agentWallet','platform','platformAgentId','displayName','profileURL','termix.metadataHash',
 'name','description','category','categories','skills','endpoint','x402','x402Support','trustModels','tags',
 'version','image','agentCard','a2a','mcp','did','ens','feedbackURI','owner','type','active','supportedTrust'];
const sample = JSON.parse(fs.readFileSync('raw/bsc-tokenuri-sample-2026-09-05.json','utf8'));
const ids = Object.keys(sample).map(Number).sort((a,b)=>a-b).filter((_,i)=>i%3===0); // ~181 ids
function encGetMetadata(id, key) {
  const kb = Buffer.from(key,'utf8');
  const pad = (32 - kb.length % 32) % 32;
  return '0xcb4799f2' + u256(id) + u256(64) + u256(kb.length) + kb.toString('hex') + '00'.repeat(pad);
}
function decBytes(hex){ if(!hex||hex==='0x') return null; const b=hex.slice(2);
  const off=parseInt(b.slice(0,64),16)*2; const len=parseInt(b.slice(off,off+64),16);
  return len===0?'':'0x'+b.slice(off+64, off+64+len*2); }
const counts = {}; const samples = {};
for (const k of KEYS){counts[k]=0; samples[k]=[]}
const jobs=[]; for(const id of ids) for(const k of KEYS) jobs.push([id,k]);
const CH=60;
for(let i=0;i<jobs.length;i+=CH){
  const chunk=jobs.slice(i,i+CH);
  const res=await batch(chunk.map(([id,k])=>call(ID,encGetMetadata(id,k))));
  chunk.forEach(([id,k],n)=>{const r=res[n]; if(!r||r.error) return;
    const v=decBytes(r.result); if(v && v!==''){counts[k]++; if(samples[k].length<3) samples[k].push([id,v.length>90?v.slice(0,90)+'..':v])}});
  process.stderr.write(`\r${i+chunk.length}/${jobs.length}  `);
  await sleep(230);
}
process.stderr.write('\n');
console.log('ids probed:', ids.length);
for(const k of KEYS) console.log('  '+k.padEnd(20)+' populated on '+String(counts[k]).padStart(4)+'/'+ids.length+'  '+(100*counts[k]/ids.length).toFixed(1)+'%  e.g. '+JSON.stringify(samples[k].slice(0,2)));
fs.writeFileSync('raw/bsc-metadata-key-probe-2026-09-05.json', JSON.stringify({ids:ids.length,counts,samples},null,1));
