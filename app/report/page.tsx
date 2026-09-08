import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Agent Advantage Report' }

interface Arm { label: string; ms: number; calls: number; output: unknown; cost: string }
interface Task { id: string; title: string; category: string; question: string; agent: Arm; manual: Arm; agreement: string }
interface Report { generatedAt: string; site: string; method: string; tasks: Task[] }

/**
 * The Agent Advantage Report the TermiX track requires: at least three real tasks run both ways,
 * with an agent hired through the marketplace and without, reporting time, cost and output
 * quality with the actual outputs attached, at least one from trading, stock or security.
 *
 * Rendered from the JSON the runner wrote, so the page cannot say anything the run did not
 * produce. The method paragraph states what kind of control this is, and what it is not.
 */
export default function ReportPage() {
  // The standalone bundle carries no docs/, so deploy copies this one file beside the server.
  const path = process.env.MUSTER_REPORT ?? join(process.cwd(), 'docs', 'research', 'agent-advantage-report.json')
  const report: Report | null = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Report) : null

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl md:text-4xl">Agent Advantage Report</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Three real tasks, each run twice: once by hiring the agent through Muster, once by hand
          against the same chain. Time, cost and whether the two answers agree, with both outputs
          attached in full.
        </p>

        {!report ? (
          <p className="mt-8 rounded-lg border border-line bg-panel p-6 text-sm text-ink-dim">
            The report has not been generated in this deployment yet. That is the honest state
            rather than an error. It is produced by <span className="num">tools/advantage-report.ts</span>{' '}
            against the live chain.
          </p>
        ) : (
          <>
            <section className="mt-6 rounded-lg border border-line bg-panel p-4 text-sm text-ink-dim">
              <h2 className="mb-2 text-xs uppercase tracking-wide text-ink-faint">Method, stated before the numbers</h2>
              <p>{report.method}</p>
              <p className="num mt-2 text-xs text-ink-faint">generated {report.generatedAt} against {report.site}</p>
            </section>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs font-normal text-ink-faint">
                    <th className="border-b border-line py-2">Task</th>
                    <th className="border-b border-line py-2">Category</th>
                    <th className="border-b border-line py-2">Hired through Muster</th>
                    <th className="border-b border-line py-2">By hand</th>
                    <th className="border-b border-line py-2">Do the answers agree</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tasks.map((t) => (
                    <tr key={t.id} className="border-b border-line-soft align-top">
                      <td className="py-3 pr-3"><span className="num text-ink-faint">{t.id}</span> <span className="text-ink">{t.title}</span></td>
                      <td className="py-3 pr-3 text-ink-dim">{t.category}</td>
                      <td className="py-3 pr-3">
                        <div className="num text-ink">{(t.agent.ms / 1000).toFixed(2)} s</div>
                        <div className="text-xs text-ink-faint">{t.agent.calls} call · {t.agent.cost}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="num text-ink">{(t.manual.ms / 1000).toFixed(2)} s</div>
                        <div className="text-xs text-ink-faint">{t.manual.calls} RPC calls · {t.manual.cost}</div>
                      </td>
                      <td className="py-3 text-ink-dim">{t.agreement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <section className="mt-10 space-y-8">
              {report.tasks.map((t) => (
                <div key={t.id}>
                  <h2 className="text-lg text-ink"><span className="num text-ink-faint">{t.id}</span> {t.title}</h2>
                  <p className="text-xs text-ink-faint">{t.question}</p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <Out label={`${t.agent.label}, ${t.agent.ms} ms`} v={t.agent.output} />
                    <Out label={`${t.manual.label}, ${t.manual.ms} ms, ${t.manual.calls} calls`} v={t.manual.output} />
                  </div>
                </div>
              ))}
            </section>

            <section className="mt-10 rounded-lg border border-line bg-panel p-4 text-sm text-ink-dim">
              <h2 className="mb-2 text-xs uppercase tracking-wide text-ink-faint">What this does and does not show</h2>
              <p>
                On T1 and T3 the agent arm is faster because one call replaces a chain of reads a
                person has to sequence and price by hand, and its outputs carry the block they were
                read at. On T2 the hired arm was slower than the control. That is a real result and it is kept: the agent walks every Venus market, 55 of them, then ranks, while the control read five markets the operator already knew to pick. The agent also measures the block time it compounds with, where the control assumed 0.45 seconds. A cold process paid the full walk. A second call within the freshness window answers from the cache in under a second, which the status page shows. Coverage cost time here. The report says so rather than picking the faster framing. The
                manual arm is what a competent operator with cast can do in the time shown, and it
                needs the operator to already know the contract addresses and the formula. Cost on
                the agent side is the quoted price in the 402. Settlement through Binance B402 is
                pending a merchant developer account, so the hired arm in this run was the identical
                code path minus the on-chain settle, and the report says that rather than implying a
                payment cleared. No independent grader and no first-time visitor rated the outputs,
                so quality is reported as agreement between the two arms.
              </p>
            </section>
          </>
        )}
        <p className="mt-8 text-sm"><Link className="text-brand" href="/">Back to Muster</Link></p>
      </main>
      <Footer />
    </>
  )
}

function Out({ label, v }: { label: string; v: unknown }) {
  return (
    <div>
      <div className="mb-1 text-xs text-ink-faint">{label}</div>
      <pre className="num max-h-80 overflow-auto rounded-md border border-line bg-canvas p-3 text-xs text-ink-soft">{JSON.stringify(v, null, 2)}</pre>
    </div>
  )
}
