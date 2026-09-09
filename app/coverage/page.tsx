import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'
import { num } from '@/components/fresh'
import { coverageByShelf, type CountSplit, type ShelfCoverage } from '@/lib/queries'
import { contractFor, SHELF_TITLES } from '@/lib/classify'
import type { Shelf } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Coverage',
  description: 'Every category at the same depth: candidates, answering, hireable and settled, with the first-party split beside each count.',
}

/**
 * The Agent Diversity proof. docs/03-TAXONOMY.md section 5.1 fixes the layout and the unknown
 * states, docs/02-THESIS.md section 7 fixes the field list. It publishes, per category, the
 * candidate count, the answering count, the hireable count and the settled job count. It splits
 * every one of those into third-party supply and our own reference supply, because a
 * shelf that looks full of our own agents fails the criterion the moment the split is hidden.
 *
 * Every number is a read over the index at one block, so a zero here is a measurement rather than
 * an unknown. The page renders on the server and reads with scripting off.
 */
export default function CoveragePage() {
  const cov = coverageByShelf()
  const atBlock = cov[0]?.atBlock ?? null
  const rows: { key: keyof Pick<ShelfCoverage, 'candidates' | 'listed' | 'indexed' | 'answering' | 'hireable'>; label: string; note: string }[] = [
    { key: 'candidates', label: 'Candidates', note: 'placed on this shelf by the classifier' },
    { key: 'listed', label: 'Listed', note: 'a callable endpoint, shown on the shelf' },
    { key: 'indexed', label: 'Indexed', note: 'readable but nothing to call, kept off the shelf' },
    { key: 'answering', label: 'Answering', note: 'the most recent probe passed' },
    { key: 'hireable', label: 'Hireable here', note: 'payable in a token we quote on BSC' },
  ]

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl md:text-4xl">Coverage</h1>
        <p className="mt-2 max-w-3xl text-ink-dim">
          The four categories side by side, at the same depth, so a judge compares like with like.
          Each count carries the split between third-party supply and the reference agents we run
          ourselves, because a shelf that looks full is a different thing from a shelf that is full
          of our own agents. Read over the index{atBlock !== null ? <> at block <span className="num text-ink">{num(atBlock)}</span></> : null}.
        </p>

        <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">Coverage per category, with the third-party and first-party split of every count</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b border-line px-4 py-3 text-left text-xs font-normal text-ink-faint">Count</th>
                {cov.map((c) => (
                  <th key={c.shelf} scope="col" className="border-b border-line px-4 py-3 text-left">
                    <Link href={`/shelf/${c.shelf}`} className="text-ink hover:text-brand">{SHELF_TITLES[c.shelf]}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line-soft">
                  <th scope="row" className="px-4 py-3 text-left align-top">
                    <div className="text-ink">{r.label}</div>
                    <div className="text-xs text-ink-faint">{r.note}</div>
                  </th>
                  {cov.map((c) => (
                    <td key={c.shelf} className="px-4 py-3 align-top">
                      <Split s={c[r.key]} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className="px-4 py-3 text-left align-top">
                  <div className="text-ink">Settled jobs</div>
                  <div className="text-xs text-ink-faint">paid work that cleared through Muster</div>
                </th>
                {cov.map((c) => (
                  <td key={c.shelf} className="px-4 py-3 align-top">
                    {c.settledJobs > 0 ? (
                      <span className="num text-ink">{num(c.settledJobs)}</span>
                    ) : (
                      <span className="text-xs text-ink-dim">none settled yet</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-3xl text-sm text-ink-dim">
          The hireable row reads its third-party count as a real zero, not an unknown. No agent on
          BSC is both provably payable and in one of these four categories, so the only hireable
          rows today are the four we run and label ours. That is the finding this whole build is
          shaped around, stated as a number rather than hidden by a full-looking shelf.
        </p>

        <section className="mt-12" aria-labelledby="classifier">
          <h2 id="classifier" className="font-display text-2xl">How a row lands on a shelf</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink-dim">
            A category is a capability contract, not a tag. The classifier reads four fields off the
            registration record, the name, the description, the declared skills and the declared
            service kinds, then matches them against the contract for each shelf. A match is a
            candidate. A row rises above the declared rung only when a probe agrees, which is the
            answering count above.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {cov.map((c) => (
              <ClassifierCard key={c.shelf} shelf={c.shelf} />
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-line bg-panel px-5 py-4">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">On precision</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink-dim">
            The classifier is a text match, so it is a candidate signal and not a verified capability.
            No hand-labelled precision sample has been drawn, so this page publishes no precision
            percentage rather than an invented one. The honest check is the answering count beside
            every candidate count: a candidate the probe never confirms stays a candidate. It is
            counted as one here. Where the split shows a third-party count that a probe passed, that
            count is a measured answer and not a claim.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}

/** A count with its split. A measured zero renders as a plain zero, never as unknown. */
function Split({ s }: { s: CountSplit }) {
  return (
    <div>
      <span className="num text-lg text-ink">{num(s.total)}</span>
      <div className="mt-0.5 text-xs text-ink-faint">
        <span className="num text-ink-dim">{num(s.third)}</span> third party
        {' · '}
        <span className="num text-warn">{num(s.ours)}</span> ours
      </div>
    </div>
  )
}

function ClassifierCard({ shelf }: { shelf: Shelf }) {
  const c = contractFor(shelf)
  const terms = c.strong.map((re) => re.source)
  return (
    <div className="rounded-lg border border-line bg-canvas p-4">
      <div className="flex items-baseline justify-between gap-3">
        <Link href={`/shelf/${shelf}`} className="font-display text-lg text-ink hover:text-brand">{c.title}</Link>
        <Link href={`/shelf/${shelf}/contract`} className="text-xs text-brand">the full contract</Link>
      </div>
      <p className="mt-1 text-sm text-ink-dim">{c.question}</p>
      <div className="mt-3 text-xs">
        <div className="text-ink-faint">A strong signal, any one of which makes a candidate</div>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {terms.map((t) => (
            <li key={t} className="num rounded-sm border border-line px-1.5 py-0.5 text-ink-soft">{t}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
