import { batch, call, u256, sleep } from './rpc.mjs';
import fs from 'fs';
const ID = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const KEYS = ['agentWallet','platform','platformAgentId','displayName','profileURL','termix.metadataHash','category','skills','x402Support'];
const sample = JSON.parse(fs.readFileSync('raw/bsc-tokenuri-sample-2026-09-05.json','utf8'));
const strat = Object.keys(sample).map(Number).sort((a,b)=>a-b).filter((_,i)=>i%4===0);
const recent = []; for (let i=334860;i<=334908;i++) recent.push(i);
const ids = [...strat, ...recent];
function enc(id,key){const kb=Buffer.from(key,'utf8');const pad=(32-kb.length%32)%32;
 return '0xcb4799f2'+u256(id)+u256(64)+u256(kb.length)+kb.toString('hex')+'00'.repeat(pad);}
function decBytes(hex){if(!hex||hex==='0x')return null;const b=hex.slice(2);
 const off=parseInt(b.slice(0,64),16)*2;const len=parseInt(b.slice(off,off+64),16);
 return len===0?'':'0x'+b.slice(off+64,off+64+len*2);}
const res = {}; for(const k of KEYS) res[k]={strat:0,recent:0,missing:0,samples:[]};
const jobs=[]; for(const id of ids) for(const k of KEYS) jobs.push([id,k]);
const CH=45;
for(let i=0;i<jobs.length;i+=CH){
  const chunk=jobs.slice(i,i+CH);
  let out=await batch(chunk.map(([id,k])=>call(ID,enc(id,k))));
  for(let n=0;n<chunk.length;n++) if(out[n]===undefined){const [r]=await batch([call(ID,enc(chunk[n][0],chunk[n][1]))]);out[n]=r;await sleep(120);}
  chunk.forEach(([id,k],n)=>{const r=out[n];
    if(!r){res[k].missing++;return}
    if(r.error){res[k].missing++;return}
    const v=decBytes(r.result);
    if(v&&v!==''){ if(id>=334860)res[k].recent++; else res[k].strat++;
      if(res[k].samples.length<3)res[k].samples.push([id,v.length>80?v.slice(0,80)+'..':v]);}});
  process.stderr.write(`\r${i+chunk.length}/${jobs.length}  `); await sleep(240);
}
process.stderr.write('\n');
console.log('stratified ids:',strat.length,' newest ids (334860-334908):',recent.length);
for(const k of KEYS) console.log('  '+k.padEnd(21)+' strat '+String(res[k].strat).padStart(3)+'/'+strat.length+
  '   newest '+String(res[k].recent).padStart(3)+'/'+recent.length+'   missing '+res[k].missing+
  '   e.g. '+JSON.stringify(res[k].samples.slice(0,2)));
fs.writeFileSync('raw/bsc-metadata-key-probe-2026-09-05.json',JSON.stringify({strat:strat.length,recent:recent.length,res},null,1));
