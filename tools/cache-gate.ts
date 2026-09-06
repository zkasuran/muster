import { FIRST_PARTY } from '../lib/agents.ts'
const y = FIRST_PARTY.find((a) => a.slug === 'yield')!
for (const pass of [1, 2, 3]) {
  const t0 = Date.now()
  const out = (await y.run(new URLSearchParams({ limit: '5' }))) as { rows: { readAt: number }[] }
  const ms = Date.now() - t0
  const age = Math.round((Date.now() - (out.rows[0]?.readAt ?? Date.now())) / 1000)
  console.log(`  pass ${pass}: ${String(ms).padStart(6)}ms  rows=${out.rows.length}  the data itself is ${age}s old`)
}
console.log('  the second and third passes must be fast, and the age must keep rising, because a')
console.log('  cached value is served with the time it was read rather than the time it was served.')
