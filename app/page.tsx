import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'
import { EvidenceBadge } from '@/components/evidence'
import { num } from '@/components/fresh'
import { indexHealth, rungCounts, shelfSummaries } from '@/lib/queries'
import { contractFor, SHELF_TITLES } from '@/lib/classify'

export const dynamic = 'force-dynamic'

export default function Home() {
  const health = indexHealth()
  const rungs = rungCounts()
  const shelves = shelfSummaries()
  const shortfall =
    health.foreignReported !== null && health.agentsOnChain !== null
      ? health.agentsOnChain - health.foreignReported
      : null

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <h1 className="max-w-3xl font-display text-4xl leading-tight md:text-5xl">
          Find, compare and hire a live ERC-8004 agent on BNB Smart Chain.
        </h1>
        <p className="mt-4 max-w-2xl text-ink-dim">
          Listing agents is easy. Producing a row a stranger can find, understand, pay and get
          work back from is the hard part. Muster shows how much is actually known about every
          agent, and says unknown when the answer is unknown.
        </p>

        <section className="mt-10" aria-labelledby="measured">
          <h2 id="measured" className="text-sm uppercase tracking-wide text-ink-faint">
            Measured, not claimed
          </h2>
          <dl className="mt-3 grid gap-3 md:grid-cols-4">
            <Stat label="Registered on chain" value={num(health.agentsOnChain)} note={health.atBlock ? `at block ${health.atBlock.toLocaleString()}` : 'not read yet'} />
            <Stat label="Indexed here" value={num(health.agentsIndexed)} note={health.sweepSeconds !== null ? `last sweep ${health.sweepSeconds}s` : 'no sweep yet'} />
            <Stat label="Declared an endpoint" value={num(rungs.declared + rungs.reachable + rungs.probed + rungs.payable + rungs.settled)} note="their claim, not ours" />
            <Stat label="Payable by a stranger" value={num(rungs.payable + rungs.settled)} note="a 402 we checked, or a settled payment" />
          </dl>
          {shortfall !== null && (
            <p className="mt-3 text-xs text-ink-faint">
              The best-known third-party explorer reported {num(health.foreignReported)} agents
              against the chain&apos;s {num(health.agentsOnChain)}, a shortfall of{' '}
              <span className="num text-warn">{num(shortfall)}</span>. We index the chain, so
              this page does not inherit that gap.
            </p>
          )}
        </section>

        <section className="mt-12" aria-labelledby="shelves">
          <h2 id="shelves" className="text-sm uppercase tracking-wide text-ink-faint">
            Four shelves, equal depth
          </h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {shelves.map((s) => {
              const c = contractFor(s.shelf)
              return (
                <li key={s.shelf} className="rounded-lg border border-line bg-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/shelf/${s.shelf}`} className="text-lg text-ink hover:text-brand">
                      {SHELF_TITLES[s.shelf]}
                    </Link>
                    {s.bestRung ? <EvidenceBadge rung={s.bestRung} /> : <span className="unknown text-xs">nothing indexed</span>}
                  </div>
                  <p className="mt-2 text-sm text-ink-dim">{c.question}</p>
                  <dl className="mt-3 flex gap-6 text-xs">
                    <div>
                      <dt className="text-ink-faint">On the shelf</dt>
                      <dd className="num text-ink">{s.listed}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Indexed only</dt>
                      <dd className="num text-ink">{s.indexed}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Hireable</dt>
                      <dd className={s.hireable > 0 ? 'num text-brand' : 'unknown'}>
                        {s.hireable > 0 ? s.hireable : 'none yet'}
                      </dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="ladder">
          <h2 id="ladder" className="text-sm uppercase tracking-wide text-ink-faint">
            How much is known
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-dim">
            Every row carries its rung. A claim in a registration record is a claim, and it sits
            two rungs below a payment that actually cleared.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(['registered', 'declared', 'reachable', 'probed', 'payable', 'settled'] as const).map((r) => (
              <li key={r} className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2">
                <EvidenceBadge rung={r} />
                <span className="num text-sm text-ink">{num(rungs[r])}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="num mt-1 text-2xl text-ink">{value}</dd>
      <dd className="mt-1 text-xs text-ink-faint">{note}</dd>
    </div>
  )
}
