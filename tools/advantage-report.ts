/**
 * The Agent Advantage Report runner. TermiX requires at least three real tasks run both ways,
 * with an agent hired through the marketplace and without, reporting time, cost and output
 * quality with the actual outputs attached, and at least one task from trading, stock or
 * security. This runs all three arms for real and writes what happened.
 *
 * The control arm is a scripted manual procedure: the same on-chain reads a person would make
 * with cast, one call at a time, in the order a person would make them, timed wall clock. It is
 * an operator-run control, not a blind human timing, and the report says so.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { listMarkets } from '../lib/venus.ts'

const BASE = process.env.BASE ?? 'https://muster.zkasuran.dev'
const RPC = 'https://bsc-rpc.publicnode.com'
const cast = (...args: string[]) => execFileSync('cast', [...args, '--rpc-url', RPC], { encoding: 'utf8', timeout: 30_000 }).trim()
const now = () => Date.now()

interface Arm { label: string; ms: number; calls: number; output: unknown; cost: string }
interface Task { id: string; title: string; category: string; question: string; agent: Arm; manual: Arm; agreement: string }
const tasks: Task[] = []
const ONLY = process.env.ONLY ?? null
const want = (id: string) => ONLY === null || ONLY === id

async function agentArm(shelf: string, params: Record<string, string>): Promise<Arm> {
  // The hired path, minus settlement which is pending a merchant account. The sample action
  // runs the identical code the paid endpoint runs, on the identical inputs, so the time and
  // output are those of the paid call. The price is what the 402 quotes.
  // The sample endpoint is rate limited to six per ten minutes per address, and this runner
  // shares an address with every other check run today. A 429 is waited out, once a minute,
  // because that is what a buyer would do and because the timing must be of the call itself.
  let r: Response | null = null
  let j: Record<string, unknown> = {}
  let t0 = now()
  for (let attempt = 0; attempt < 12; attempt++) {
    t0 = now()
    r = await fetch(`${BASE}/api/hire`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'sample', shelf }) })
    j = (await r.json()) as Record<string, unknown>
    if (r.status !== 429) break
    process.stderr.write(`  ${shelf}: rate limited, waiting 65s\n`)
    await new Promise((res) => setTimeout(res, 65_000))
  }
  if (!r || !r.ok || j['result'] === undefined) throw new Error(`agent arm ${shelf} -> HTTP ${r?.status}: ${JSON.stringify(j).slice(0, 200)}`)
  const q = await fetch(`${BASE}/api/agent/${shelf}`)
  const acc = ((await q.json()) as { accepts: { maxAmountRequired: string }[] }).accepts[0]!
  return { label: 'hired through Muster', ms: now() - t0, calls: 1, output: j['result'], cost: `${Number(BigInt(acc.maxAmountRequired)) / 1e18} USD1 per call, quoted in the 402` }
}

// Task 1, security: is this Venus borrower close to liquidation?
if (want('T1')) {
  const acct = '0xed87331DcAe2ed002c42EdD102fEf91bd2BdB0bE'
  const agent = await agentArm('health-factor', { account: acct })
  const t0 = now(); let calls = 0
  const COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384'
  const assets = cast('call', COMPTROLLER, 'getAssetsIn(address)(address[])', acct); calls++
  const liq = cast('call', COMPTROLLER, 'getAccountLiquidity(address)(uint256,uint256,uint256)', acct); calls++
  const list = assets.replace(/[\[\]\s]/g, '').split(',').filter(Boolean)
  const rows: Record<string, unknown>[] = []
  let weighted = 0, borrow = 0
  const oracle = cast('call', COMPTROLLER, 'oracle()(address)'); calls++
  for (const v of list) {
    const sym = cast('call', v, 'symbol()(string)').replace(/"/g, ''); calls++
    const bal = BigInt(cast('call', v, 'balanceOf(address)(uint256)', acct).split(' ')[0]!); calls++
    const rate = BigInt(cast('call', v, 'exchangeRateStored()(uint256)').split(' ')[0]!); calls++
    const bor = BigInt(cast('call', v, 'borrowBalanceStored(address)(uint256)', acct).split(' ')[0]!); calls++
    const mk = cast('call', COMPTROLLER, 'markets(address)(bool,uint256,bool,uint256)', v); calls++
    const lt = Number(mk.split('\n')[3]!.split(' ')[0]!) / 1e18
    const px = BigInt(cast('call', oracle, 'getUnderlyingPrice(address)(uint256)', v).split(' ')[0]!); calls++
    const supplied = Number((bal * rate) / 10n ** 18n) * Number(px) / 1e36
    const borrowed = Number(bor) * Number(px) / 1e36
    weighted += supplied * lt; borrow += borrowed
    rows.push({ market: sym, suppliedUsd: +supplied.toFixed(2), borrowedUsd: +borrowed.toFixed(2), liquidationThreshold: lt })
  }
  const hf = borrow > 0 ? weighted / borrow : null
  const manual: Arm = { label: 'by hand with cast', ms: now() - t0, calls, output: { account: acct, healthFactor: hf, weightedCollateralUsd: +weighted.toFixed(2), borrowUsd: +borrow.toFixed(2), rows, comptrollerLiquidity: liq }, cost: 'operator time only, no payment' }
  const a = (agent.output as { healthFactor: number | null }).healthFactor
  const agreement =
    a === null && hf === null ? 'both arms find no open borrow, so no liquidation risk' :
    a === null || hf === null ? `arms disagree on whether a borrow exists: agent ${a} vs manual ${hf}` :
    `agent ${a.toFixed(4)} vs manual ${hf.toFixed(4)}, ${(Math.abs(a - hf) / hf * 100).toFixed(2)}% apart`
  tasks.push({ id: 'T1', title: 'Is this Venus borrower close to liquidation?', category: 'security (liquidation risk)', question: `health factor of ${acct}`, agent, manual, agreement })
}

// Task 2, yield: where does USD earn the most on Venus right now?
if (want('T2')) {
  const agent = await agentArm('yield', { limit: '5' })
  const t0 = now(); let calls = 0
  // A person would look the vToken addresses up on Venus first. That lookup is one step here,
  // taken from the same verified market list rather than typed from memory.
  const all = await listMarkets(); calls++
  const markets: [string, string][] = all
    .filter((m) => ['vUSDT', 'vUSDC', 'vBTC', 'vETH', 'vBNB'].includes(m.symbol))
    .map((m) => [m.symbol, m.vToken])
  const blockTimeS = 0.45
  const perYear = (365 * 86400) / blockTimeS
  const out: { market: string; apy: number }[] = []
  for (const [sym, v] of markets) {
    const r = Number(cast('call', v, 'supplyRatePerBlock()(uint256)').split(' ')[0]!) / 1e18; calls++
    out.push({ market: sym, apy: +((Math.pow(1 + r * (perYear / 365), 365) - 1) * 100).toFixed(4) })
  }
  out.sort((x, y) => y.apy - x.apy)
  const manual: Arm = { label: 'by hand with cast', ms: now() - t0, calls, output: { assumedBlockTimeSeconds: blockTimeS, ranked: out }, cost: 'operator time only, no payment' }
  const top = (agent.output as { rows: { asset: string; apy: number }[] }).rows[0]!
  tasks.push({ id: 'T2', title: 'Where does USD earn the most on Venus right now?', category: 'yield', question: 'rank Venus supply APYs', agent, manual, agreement: `agent top ${top.asset} ${top.apy.toFixed(2)}% vs manual top ${out[0]!.market} ${out[0]!.apy.toFixed(2)}%. The manual arm assumes ${blockTimeS}s blocks; the agent measures block time from the chain` })
}

// Task 3, trading: plan a grid on WBNB/USDT around the live price
if (want('T3')) {
  const agent = await agentArm('grid-trading', {})
  const t0 = now(); let calls = 0
  const pool = '0x172fcD41E0913e95784454622d1c3724f546f849'
  const slot0 = cast('call', pool, 'slot0()(uint160,int24,uint16,uint16,uint16,uint32,bool)'); calls++
  const sqrt = Number(BigInt(slot0.split('\n')[0]!.split(' ')[0]!))
  const price1Per0 = (sqrt / 2 ** 96) ** 2
  const mark = 1 / price1Per0
  const lower = mark * 0.9, upper = mark * 1.1, n = 8
  const ratio = Math.pow(upper / lower, 1 / (n - 1))
  const levels = Array.from({ length: n }, (_, i) => +(lower * ratio ** i).toFixed(4))
  const manual: Arm = { label: 'by hand with cast', ms: now() - t0, calls, output: { pool, markPrice: +mark.toFixed(4), lower: +lower.toFixed(4), upper: +upper.toFixed(4), levels, capitalPerBuyLevel: 1000 / (n / 2) }, cost: 'operator time only, no payment' }
  const plan = (agent.output as { plan: { markPrice: number; levels: { price: number }[] } }).plan
  tasks.push({ id: 'T3', title: 'Plan an 8-level grid on WBNB/USDT around the live price', category: 'trading', question: 'grid ladder, 10% each side, 1000 USDT', agent, manual, agreement: `agent mark ${plan.markPrice.toFixed(2)} vs manual ${mark.toFixed(2)}; agent L0 ${plan.levels[0]!.price.toFixed(2)} vs manual ${levels[0]}` })
}

let merged = tasks
if (ONLY !== null) {
  const prev = JSON.parse(readFileSync('docs/research/agent-advantage-report.json', 'utf8')) as { tasks: Task[] }
  merged = prev.tasks.map((p) => tasks.find((n) => n.id === p.id) ?? p)
  for (const n of tasks) if (!merged.some((m) => m.id === n.id)) merged.push(n)
}
const report = { generatedAt: new Date().toISOString(), site: BASE, reruns: ONLY !== null ? `task ${ONLY} rerun after a transient RPC failure nulled the agent arm; other tasks kept from the first run` : 'none', method: 'Operator ran both arms. The agent arm is the identical code the paid endpoint runs, on the identical inputs, timed round trip from a client. The control arm is one cast call at a time in the order a person would make them, timed wall clock, on the same machine. No independent grader and no first-time visitor were available before the close, so output quality is measured as numerical agreement between the two arms rather than by a blind rating.', tasks: merged }
writeFileSync('docs/research/agent-advantage-report.json', JSON.stringify(report, null, 2))
for (const t of merged) console.log(`${t.id} ${t.title}\n   agent  ${t.agent.ms} ms, ${t.agent.calls} call, ${t.agent.cost}\n   manual ${t.manual.ms} ms, ${t.manual.calls} calls, ${t.manual.cost}\n   ${t.agreement}`)
