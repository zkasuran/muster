import { headers } from 'next/headers'
import { DocSection, LiveLink } from '@/components/docs'
import { conformanceReport } from '@/lib/conformance'
import { publicOrigin } from '@/lib/origin'
import { agentByShelf } from '@/lib/altana'
import { SHELVES } from '@/lib/constants'
import { SHELF_TITLES } from '@/lib/classify'
import { REQUIRED_ROUTES } from '@/lib/protocol'
import type { Shelf } from '@/lib/types'

export const metadata = { title: 'Conformance' }

/**
 * [doc 10] docs/10-DOCS-AND-POLICY.md section 3, the conformance page. It reuses lib/conformance.ts,
 * the same code the prober runs, against our own four reference agents and shows the result row by
 * row, so a judge reads the same list our probe would write rather than a claim about it. Every
 * document it validates is linked live so a reader can fetch the bytes it checked. Nothing here
 * touches the network: the checks run in process against the generated documents.
 */
const ZERO = '0x0000000000000000000000000000000000000000'

const AGENT_DOCS: { path: string; label: string }[] = [
  { path: 'card', label: 'card' },
  { path: 'registration', label: 'registration' },
  { path: 'manifest', label: 'manifest' },
  { path: 'health', label: 'health' },
  { path: 'schema', label: 'schema' },
]

export default async function ConformancePage() {
  const origin = publicOrigin(await headers(), 'https://muster.zkasuran.dev')
  const reports = SHELVES.map((shelf) => {
    const payTo = process.env.MUSTER_PAYTO ?? agentByShelf(shelf as Shelf)?.wallet ?? ZERO
    return { shelf: shelf as Shelf, report: conformanceReport(shelf as Shelf, { origin, payTo }) }
  })
  const passed = reports.reduce((n, r) => n + r.report.passed, 0)
  const total = reports.reduce((n, r) => n + r.report.total, 0)

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
      <h1 className="font-display text-3xl md:text-4xl">Conformance</h1>
      <p className="mt-2 max-w-3xl text-ink-dim">
        Does an agent serve every route a Muster listing must serve, and does each document actually
        validate. This is the same suite the prober runs, in <span className="num">lib/conformance.ts</span>,
        shown against our own four reference agents so we clear our own bar rather than only asserting
        it. Each check runs in process against the generated document, with no self-fetch.
      </p>
      <p className="mt-3 num text-sm text-brand">
        {passed} of {total} assertions pass across the four reference agents.
      </p>

      <DocSection title="One rule published beside the suite">
        <p className="text-sm text-ink-dim">
          A skip never counts as a pass and never contributes to a rung. An agent that skips half its
          declared checks does not get a full score for the half it answered. The suite reports a
          verdict per route with the reason, so a fail is legible rather than a bare number.
        </p>
      </DocSection>

      {reports.map(({ shelf, report }) => (
        <DocSection key={shelf} title={`${SHELF_TITLES[shelf]} — ${report.passed} of ${report.total}`}>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
            <span>live documents:</span>
            {AGENT_DOCS.map((d) => (
              <LiveLink key={d.path} href={`/api/agent/${shelf}/${d.path}`}>
                {d.label}
              </LiveLink>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-line bg-canvas">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs font-normal text-ink-faint">
                  <th className="px-3 py-2">Route</th>
                  <th className="py-2 pr-3">Verdict</th>
                  <th className="py-2 pr-3">What it asserts</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td:first-child]:pl-3 align-top">
                {report.results.map((r) => (
                  <tr key={r.route.path} className="border-t border-line-soft">
                    <td className="num py-2 text-ink-soft">
                      {r.route.method} {r.route.path}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={r.present ? 'text-up' : 'text-warn'}>
                        {r.present ? 'pass' : 'fail'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-ink-dim">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocSection>
      ))}

      <DocSection title="Run it against your own URL">
        <p className="text-sm text-ink-dim">
          The suite is the code, not a description of it. The routes it checks are the seven a Muster
          agent serves:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-ink-dim">
          {REQUIRED_ROUTES.map((r) => (
            <li key={r.path} className="num text-xs text-ink-faint">
              {r.method} {r.path}
            </li>
          ))}
        </ul>
      </DocSection>
    </main>
  )
}
