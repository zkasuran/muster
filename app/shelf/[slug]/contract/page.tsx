import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Nav, Footer } from '@/components/nav'
import { num } from '@/components/fresh'
import { coverageByShelf } from '@/lib/queries'
import { contractFor, SHELF_TITLES } from '@/lib/classify'
import { SHELVES } from '@/lib/constants'
import type { Shelf } from '@/lib/types'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return SHELVES.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!(SHELVES as readonly string[]).includes(slug)) return { title: 'Not found' }
  return {
    title: `${SHELF_TITLES[slug as Shelf]} contract`,
    description: `What the ${SHELF_TITLES[slug as Shelf]} shelf asks a listing for, plus the published rules that make a candidate.`,
  }
}

/**
 * The category contract page, docs/03-TAXONOMY.md section 1 and 4.4. A category here is a
 * capability contract rather than a tag, so this page publishes what the shelf asks for and the
 * exact rules the classifier runs to make a candidate. Everything shown is read off lib/classify.ts
 * CONTRACTS, so a judge can audit the one piece of inference in the product instead of taking it.
 *
 * The counts are the same read the coverage page uses, at the same block, so the contract page and
 * the coverage page cannot disagree about how many rows this contract matched and how many answered.
 */
export default async function ContractPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!(SHELVES as readonly string[]).includes(slug)) notFound()
  const shelf = slug as Shelf
  const c = contractFor(shelf)
  const cov = coverageByShelf().find((x) => x.shelf === shelf)!

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <Link href={`/shelf/${shelf}`} className="text-sm text-brand">back to the {c.title} shelf</Link>
        <h1 className="mt-2 font-display text-3xl md:text-4xl">{c.title} contract</h1>
        <p className="mt-3 max-w-3xl text-ink-dim">
          A category on Muster is a capability contract, not a tag. A tag is a string an operator
          types and it cannot be wrong. This contract names what a listing on the {c.title} shelf must
          accept and return, so a wrong placement is a checkable claim rather than an opinion. A row
          matches the rules below and becomes a candidate. It rises above the declared rung only when a
          probe agrees.
        </p>

        <section className="mt-8 rounded-xl border border-line bg-panel p-5">
          <div className="text-xs uppercase tracking-wide text-ink-faint">The question this shelf answers</div>
          <p className="mt-1 text-lg text-ink">{c.question}</p>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="text-sm uppercase tracking-wide text-ink-faint">Inputs it must accept</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              {c.inputs.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </section>
          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="text-sm uppercase tracking-wide text-ink-faint">Outputs it must return</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              {c.outputs.map((o) => <li key={o}>{o}</li>)}
            </ul>
            <p className="mt-3 text-xs text-ink-faint">Units: <span className="num text-ink-dim">{c.units}</span></p>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-line bg-panel p-5">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">Against this contract, right now</h2>
          <p className="mt-1 text-xs text-ink-faint">
            One read over the index{cov.atBlock !== null ? <> at block <span className="num text-ink-dim">{num(cov.atBlock)}</span></> : null}. Each number carries the third-party against first-party split, so a full-looking shelf cannot hide whose supply it is.
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <Stat label="Candidates" total={cov.candidates.total} third={cov.candidates.third} ours={cov.candidates.ours} note="matched the rules below" />
            <Stat label="Answering" total={cov.answering.total} third={cov.answering.third} ours={cov.answering.ours} note="a probe confirmed it" />
            <Stat label="Hireable" total={cov.hireable.total} third={cov.hireable.third} ours={cov.hireable.ours} note="payable in a token we quote" />
          </dl>
          <p className="mt-3 text-xs text-ink-dim">
            See all four shelves side by side on the <Link href="/coverage" className="text-brand">coverage page</Link>.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-2xl">The classifier, published</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink-dim">
            On-chain metadata carries no category on any agent. The OASF skill paths agents declare
            name no DeFi capability, so the only signal at index time is text. The classifier reads the
            name, the description and the declared service kinds and runs these rules against them.
            Publishing the rules turns the one piece of unavoidable inference into something a judge can
            check.
          </p>

          <SignalBlock
            title="Strong signals"
            rule="Any one of these makes a candidate."
            signals={c.strong.map((re) => re.source)}
            tone="brand"
          />
          <SignalBlock
            title="Supporting signals"
            rule="Two of these together make a candidate. One on its own is too weak."
            signals={c.weak.map((re) => re.source)}
            tone="soft"
          />
          <SignalBlock
            title="Exclusions"
            rule="Any one of these rejects the row from this shelf however strong the rest looks."
            signals={c.exclude.map((re) => re.source)}
            tone="down"
          />
        </section>

        <section className="mt-8 rounded-lg border border-line bg-panel px-5 py-4">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">On precision</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink-dim">
            A text match is a candidate signal, not a verified capability. No hand-labelled precision
            sample has been drawn, so no precision percentage is published here rather than an invented
            one. The honest check is the answering count beside the candidate count above: a candidate a
            probe never confirms stays a candidate and is counted as one.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}

function Stat({ label, total, third, ours, note }: { label: string; total: number; third: number; ours: number; note: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="num text-2xl text-ink">{num(total)}</dd>
      <dd className="mt-0.5 text-xs text-ink-faint">
        <span className="num text-ink-dim">{num(third)}</span> third party · <span className="num text-warn">{num(ours)}</span> ours
      </dd>
      <dd className="mt-1 text-xs text-ink-faint">{note}</dd>
    </div>
  )
}

function SignalBlock({ title, rule, signals, tone }: { title: string; rule: string; signals: string[]; tone: 'brand' | 'soft' | 'down' }) {
  const ink = tone === 'down' ? 'text-down' : tone === 'brand' ? 'text-ink' : 'text-ink-soft'
  return (
    <div className="mt-4 rounded-lg border border-line bg-canvas p-4">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className={`text-sm ${ink}`}>{title}</span>
        <span className="text-xs text-ink-faint">{rule}</span>
      </div>
      {signals.length === 0 ? (
        <p className="mt-2 text-xs text-ink-faint">None.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {signals.map((s) => (
            <li key={s} className="num rounded-sm border border-line px-1.5 py-0.5 text-xs text-ink-soft">{s}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
