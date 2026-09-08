/** Render docs/AGENT-ADVANTAGE-REPORT.md from the runner's JSON, so the repo carries the same report the site renders. */
import { readFileSync, writeFileSync } from 'node:fs'
interface Arm { label: string; ms: number; calls: number; output: unknown; cost: string }
interface Task { id: string; title: string; category: string; question: string; agent: Arm; manual: Arm; agreement: string }
const r = JSON.parse(readFileSync('docs/research/agent-advantage-report.json', 'utf8')) as { generatedAt: string; site: string; method: string; tasks: Task[] }
const lines: string[] = []
lines.push('# Agent Advantage Report', '', `Generated ${r.generatedAt} against ${r.site}. Rendered live at ${r.site}/report from`, '`docs/research/agent-advantage-report.json`, which `tools/advantage-report.ts` produced. Nothing here was hand edited.', '', '## Method', '', r.method, '', '## Summary', '', '| Task | Category | Hired through Muster | By hand | Agreement |', '| --- | --- | --- | --- | --- |')
for (const t of r.tasks) lines.push(`| ${t.id} ${t.title} | ${t.category} | ${(t.agent.ms / 1000).toFixed(2)} s, ${t.agent.calls} call, ${t.agent.cost} | ${(t.manual.ms / 1000).toFixed(2)} s, ${t.manual.calls} RPC calls, ${t.manual.cost} | ${t.agreement} |`)
lines.push('', 'At least one task is from trading or security, as the track requires: T1 is a liquidation risk check and T3 is a grid trading plan.', '')
for (const t of r.tasks) {
  lines.push(`## ${t.id}. ${t.title}`, '', `Question: ${t.question}`, '', `### ${t.agent.label}, ${t.agent.ms} ms`, '', '```json', JSON.stringify(t.agent.output, null, 2), '```', '', `### ${t.manual.label}, ${t.manual.ms} ms, ${t.manual.calls} calls`, '', '```json', JSON.stringify(t.manual.output, null, 2), '```', '')
}
lines.push('## What this does and does not show', '', 'The agent arm is faster because one call replaces a chain of reads a person has to sequence and price by hand, and its outputs carry the block they were read at. The manual arm is what a competent operator with cast can do in the time shown, and it needs the operator to already know the contract addresses and the formula. Cost on the agent side is the quoted price in the 402. Settlement through Binance B402 is pending a merchant developer account, so the hired arm in this run was the identical code path minus the on-chain settle. No independent grader and no first-time visitor rated the outputs, so quality is reported as agreement between the two arms.', '')
writeFileSync('docs/AGENT-ADVANTAGE-REPORT.md', lines.join('\n'))
console.log(`  wrote docs/AGENT-ADVANTAGE-REPORT.md, ${lines.length} lines, ${r.tasks.length} tasks`)
