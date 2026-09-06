import { db } from '../lib/db.ts'
const one = (s: string, ...a: unknown[]) => db().prepare(s).get(...(a as never[])) as Record<string, number>
const many = (s: string, ...a: unknown[]) => db().prepare(s).all(...(a as never[])) as Record<string, unknown>[]
console.log('  agents:', one('SELECT COUNT(*) c FROM agent').c, ' parsed:', one('SELECT COUNT(*) c FROM agent WHERE registrationParsed=1').c)
for (const s of ['rebalancing', 'grid-trading', 'yield', 'health-factor']) {
  console.log(`  ${s.padEnd(14)} ${one('SELECT COUNT(*) c FROM listing WHERE category=?', s).c} listings`)
  for (const r of many(
    `SELECT l.agentId, l.evidenceTier, l.visibility, a.name, substr(coalesce(a.description,''),1,70) d
     FROM listing l JOIN agent a ON a.chainId=l.chainId AND a.agentId=l.agentId
     WHERE l.category=? ORDER BY CAST(l.agentId AS INTEGER) LIMIT 3`, s))
    console.log(`      ${String(r.agentId).padStart(6)} [${r.evidenceTier}/${r.visibility}] ${r.name} :: ${r.d}`)
}
