import { FIRST_PARTY, BadRequest } from '../lib/agents.ts'
console.log('=== the four first-party agents, doing real work from live reads ===\n')
let fails = 0
for (const a of FIRST_PARTY) {
  console.log(`--- ${a.slug}: ${a.name}`)
  console.log(`    price ${Number(BigInt(a.priceBase)) / 1e18} USD1   inputs: ${a.inputs.map(i => i.name + (i.required ? '*' : '')).join(', ')}`)
  const p = new URLSearchParams()
  for (const i of a.inputs) if (i.required) p.set(i.name, i.example)
  const t0 = Date.now()
  try {
    const out = await a.run(p)
    const ms = Date.now() - t0
    const j = JSON.stringify(out)
    console.log(`    ran in ${ms}ms, ${j.length} bytes of result`)
    // every agent must return the block it read at, otherwise the answer is undateable
    const hasBlock = /"atBlock":\s*\d+/.test(j) || /"readAt":\s*\d+/.test(j)
    console.log(`    dated: ${hasBlock ? 'yes' : 'NO'}`)
    if (!hasBlock) fails++
    const preview = j.length > 420 ? j.slice(0, 420) + '...' : j
    console.log(`    ${preview}`)
  } catch (e) {
    fails++
    console.log(`    FAILED: ${(e as Error).message.slice(0, 160)}`)
  }
  // and a bad input must be refused rather than answered
  try {
    const bad = new URLSearchParams()
    for (const i of a.inputs) if (i.required) bad.set(i.name, 'not-valid')
    if (a.inputs.some(i => i.required)) {
      await a.run(bad)
      console.log('    !! a bad required input was accepted')
      fails++
    } else {
      const b2 = new URLSearchParams({ limit: '999', levels: '1', capital: '0', lowerTick: '5', upperTick: '1' })
      try { const r = await a.run(b2); const w = (r as {plan?:{warnings?:string[]}}).plan?.warnings; console.log(`    bad optional input -> ${w?.length ? 'warnings: ' + JSON.stringify(w).slice(0,110) : 'accepted, check this'}`) }
      catch (e) { console.log(`    bad optional input refused: ${(e as Error).message.slice(0, 80)}`) }
    }
  } catch (e) {
    console.log(`    bad input refused: ${(e as Error).message.slice(0, 80)} ${e instanceof BadRequest ? '(BadRequest)' : ''}`)
  }
  console.log()
}
console.log(fails === 0 ? '=== ALL FOUR AGENTS WORK ===' : `=== ${fails} FAILURE(S) ===`)
process.exit(fails === 0 ? 0 : 1)
