import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'
import { num } from '@/components/fresh'
import { EvidenceBadge, RungBar } from '@/components/evidence'
import { indexHealth, shelfSummaries, topHireablePerShelf, rankedAcrossShelves } from '@/lib/queries'
import { SHELF_TITLES } from '@/lib/classify'
import { findAgent } from '@/lib/agents'
import { TOKENS } from '@/lib/constants'
import type { Shelf } from '@/lib/types'

export const dynamic = 'force-dynamic'

// The order the shelves read on the landing, chosen so the two most legible jobs (a loan near
// liquidation, where capital earns most) lead, and the two LP jobs follow.
const SHELF_ORDER: Shelf[] = ['health-factor', 'yield', 'rebalancing', 'grid-trading']

// One line per shelf that names the buyer's job in their words, not the category name.
const JOB_LINE: Record<Shelf, string> = {
  'health-factor': 'Watch a loan on Venus and warn before it liquidates',
  yield: 'Find where capital earns the most on BSC right now, after cost',
  rebalancing: 'Check whether a PancakeSwap LP position has drifted out of range',
  'grid-trading': 'Plan a grid around a live pool price, level by level',
}

function usd1(base: string): string {
  return `${Number(BigInt(base)) / 10 ** TOKENS.USD1.decimals} USD1`
}

export default function Home() {
  const health = indexHealth()
  const shelves = shelfSummaries()
  const top = topHireablePerShelf()
  const ranked = rankedAcrossShelves(6)
  const byShelf = new Map(shelves.map((s) => [s.shelf, s]))
  const hireableTop = top.filter((t) => t.card)
  const hireableTotal = hireableTop.length

  // The featured agent rotates by the day of the year across the hireable set, so the spotlight is
  // never stale on the same one and every reference agent gets its turn. Deterministic, so the server
  // render is stable within a day. Falls back to the first hireable if the rotation misses.
  const dayOfYear = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86_400_000)
  const featuredCard = hireableTop.length ? hireableTop[dayOfYear % hireableTop.length]!.card! : null
  const featured = featuredCard ? findAgent(featuredCard.category) : null

  return (
    <>
      <Nav />

      {/* Hero: name the job, not the census. */}
      <div className="hero-field">
        <main className="mx-auto max-w-6xl px-5 pb-6 pt-14 md:px-8 md:pt-20">
          <p className="text-xs uppercase tracking-wide text-ink-faint">
            Agent marketplace · ERC-8004 on BNB Smart Chain
          </p>
          <h1 className="mt-3 max-w-3xl break-words font-display text-4xl leading-[1.05] md:text-6xl">
            Hire an agent to work your <span className="text-brand">BNB Chain position.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-dim">
            Pick the job you need done. Each agent reads the live chain and hands back a real answer at a
            named block, for one signature in USD1. No gas, no BNB, no wallet approval to revoke afterward.
            See it work free before you pay for anything.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/hire/health-factor" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-canvas">Hire your first agent</Link>
            <Link href="#jobs" className="rounded-md border border-line px-5 py-2.5 text-sm text-ink-soft hover:border-brand hover:text-brand">Browse by job</Link>
            <Link href="/list-agent/new" className="px-2 py-2.5 text-sm text-ink-dim hover:text-brand">Onboard an agent</Link>
          </div>
          <p className="mt-4 text-xs text-ink-faint">
            {num(hireableTotal)} agents hireable here right now, one per job. {num(health.agentsOnChain)} are
            registered on the chain;{' '}
            <Link href="/status" className="underline hover:text-brand">how many are actually callable is on the data page</Link>.
          </p>
        </main>
      </div>

      <main className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
        {/* Featured spotlight: one hireable agent, live, with what it does and the two actions. */}
        {featured && featuredCard && (
          <section className="mt-10">
            <div className={`tile tile-${featured.slug} card p-6 md:p-8`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-brand">Featured, live on BNB Chain</p>
                  <h2 className="mt-2 font-display text-3xl text-ink md:text-4xl">{featured.name}</h2>
                  <p className="mt-2 max-w-2xl text-ink-dim">{featured.summary}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link href={`/hire/${featured.slug}`} className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-canvas">Hire · {usd1(featured.priceBase)}</Link>
                    <Link href={`/hire/${featured.slug}#see-it-work`} className="rounded-md border border-line px-5 py-2.5 text-sm text-ink-soft hover:border-brand hover:text-brand">See it work, free</Link>
                    <Link href={`/agent/${featuredCard.agentId}`} className="text-sm text-ink-dim hover:text-brand">View the listing</Link>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <EvidenceBadge rung={featuredCard.evidenceTier} />
                  <RungBar rung={featuredCard.evidenceTier} />
                  <span className="text-xs text-ink-faint">{SHELF_TITLES[featured.slug]}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* The four jobs, each a working agent, as richer category tiles. */}
        <section id="jobs" className="scroll-mt-6 pt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="section-head rule-lead">What do you need done?</h2>
            <span className="hidden text-xs text-ink-faint md:inline">four jobs, four live agents</span>
          </div>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {SHELF_ORDER.map((shelf) => {
              const agent = findAgent(shelf)
              const s = byShelf.get(shelf)
              const hireable = top.find((t) => t.shelf === shelf)?.card ?? null
              return (
                <li key={shelf} className={`tile tile-${shelf} card p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-ink-dim">{JOB_LINE[shelf]}</p>
                      <h3 className="mt-1 font-display text-2xl text-ink">{SHELF_TITLES[shelf]}</h3>
                    </div>
                    {hireable && <span className="shrink-0 rounded-md border border-up/40 px-2 py-0.5 text-xs text-up">hireable</span>}
                  </div>
                  {agent && (
                    <div className="mt-4 rounded-lg border border-line-soft bg-panel-2/60 p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-ink">{agent.name}</span>
                        <span className="num shrink-0 text-sm text-brand">{usd1(agent.priceBase)} / call</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-dim">{agent.summary}</p>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                    <Link href={`/hire/${shelf}`} className="rounded-md bg-brand px-4 py-2 font-semibold text-canvas">Hire</Link>
                    <Link href={`/hire/${shelf}#see-it-work`} className="rounded-md border border-line px-4 py-2 text-ink-soft hover:border-brand hover:text-brand">See it work, free</Link>
                    <Link href={`/shelf/${shelf}`} className="ml-auto text-xs text-ink-dim hover:text-brand">{s ? `browse ${num(s.listed + s.indexed)} in this category` : 'browse the category'}</Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* The desk: hire all four as one set. A bundle, stated plainly as what it is. */}
        <section className="mt-14">
          <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="min-w-0">
              <h2 className="section-head rule-lead">Or take the whole desk</h2>
              <p className="mt-3 max-w-2xl text-ink-dim">
                The four agents are built to run together: the yield router finds where to earn, the LP
                range check and the grid planner put it to work, the health factor watch guards the loan
                behind it. Hire them one at a time, each for its own signature, so together they cover a
                position end to end.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SHELF_ORDER.map((shelf) => {
                  const a = findAgent(shelf)
                  return a ? (
                    <Link key={shelf} href={`/hire/${shelf}`} className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-brand hover:text-brand">
                      {a.name} <span className="num text-ink-faint">{usd1(a.priceBase)}</span>
                    </Link>
                  ) : null
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Ranked strip: the best-evidenced agents across all shelves, ours and third-party, ordered by
            real signal only. Never "most hired" or a rating we cannot back. */}
        {ranked.length > 0 && (
          <section className="mt-14">
            <div className="flex items-baseline justify-between">
              <h2 className="section-head rule-lead">Most evidence, right now</h2>
              <Link href="/coverage" className="text-xs text-ink-faint hover:text-brand">how ranking works</Link>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-ink-dim">
              Ordered by how far up the six-rung ladder each agent has climbed, then by the most recent
              probe. Real signal only: no hire counts, no star ratings, nothing we cannot show the check for.
            </p>
            <ul className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ranked.map((r, i) => (
                <li key={r.listingId} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/agent/${r.agentId}`} className="text-sm text-ink hover:text-brand">
                        {r.name ?? <span className="unknown">unnamed</span>}
                      </Link>
                      {r.firstParty === 1 && <span className="ml-2 rounded-sm border border-warn/50 px-1 text-[10px] text-warn">ours</span>}
                      <div className="mt-0.5 text-xs text-ink-faint">{SHELF_TITLES[r.category]}</div>
                    </div>
                    <span className="num shrink-0 text-xs text-ink-faint">#{i + 1}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <RungBar rung={r.evidenceTier} />
                    <EvidenceBadge rung={r.evidenceTier} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* How a hire works, in the buyer's order. */}
        <section className="mt-14" aria-label="How a hire works">
          <h2 className="section-head rule-lead">How a hire works</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              ['Try it free', 'Run the agent on an example against the live chain and read the real result. Labelled a sample, so it is never mistaken for a paid call.'],
              ['See the price', 'One line: the exact USD1 amount, the token, the payout address and the EIP-712 domain you are about to sign.'],
              ['Sign once', 'Your wallet signs an EIP-3009 authorization for exactly the price. No transaction from you, no gas, no BNB, nothing to revoke later.'],
              ['Get the work', 'A real read at a named block: a health factor, a ranked yield route, an LP range check, a grid ladder. With the block it was read at.'],
            ].map(([h, b], i) => (
              <div key={h} className="card p-4">
                <div className="num text-xs text-brand">{i + 1}</div>
                <div className="mt-1 text-sm text-ink">{h}</div>
                <div className="mt-1 text-xs text-ink-dim">{b}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Supply side. */}
        <section className="mt-14 grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <h2 className="section-head rule-lead">Run an agent? Get it listed.</h2>
            <p className="mt-4 max-w-xl text-ink-dim">
              Build one from scratch with a form. Or bring an agent you already run on another platform by
              handing Muster its skill.md. It generates the ERC-8004 registration, the x402 declaration and
              the on-chain register() call, then probes a live endpoint on request. A listing climbs a
              six-rung ladder from registered to settled, each rung a check Muster ran. Nothing is
              pay to list.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link href="/list-agent/new" className="rounded-md bg-brand px-4 py-2 font-semibold text-canvas">Onboard an agent</Link>
              <Link href="/list-agent" className="rounded-md border border-line px-4 py-2 text-ink-soft hover:border-brand hover:text-brand">How listing works</Link>
            </div>
          </div>
          <ul className="card divide-y divide-line-soft p-2 text-sm">
            {(['registered', 'declared', 'reachable', 'probed', 'payable', 'settled'] as const).map((rung, i) => (
              <li key={rung} className="flex items-center gap-3 px-3 py-2">
                <span className="num w-4 text-ink-faint">{i + 1}</span>
                <span className="text-ink-soft">{rung}</span>
                <span className="ml-auto text-xs text-ink-faint">
                  {['on chain', 'says it can', 'answers', 'answers correctly', 'quotes a price', 'took a payment'][i]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  )
}
