import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'
import { EvidenceBadge, RungBar } from '@/components/evidence'
import { ago, num } from '@/components/fresh'
import { indexHealth, populationFacts, rungCounts, shelfSummaries, topHireablePerShelf, recentProbes } from '@/lib/queries'
import { contractFor, SHELF_TITLES } from '@/lib/classify'
import { TOKENS } from '@/lib/constants'
import { EVIDENCE_ORDER } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function Home() {
  const health = indexHealth()
  const rungs = rungCounts()
  const shelves = shelfSummaries()
  const pop = populationFacts()
  const top = topHireablePerShelf()
  const probes = recentProbes(8)
  const totalListed = shelves.reduce((s, x) => s + x.listed + x.indexed, 0)

  return (
    <>
      <Nav />
      <div className="hero-field">
        <main className="mx-auto max-w-6xl px-5 pb-4 pt-14 md:px-8 md:pt-20">
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-start">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-ink-faint">A marketplace for ERC-8004 agents on BNB Smart Chain</p>
              <h1 className="mt-3 break-words font-display text-4xl leading-[1.05] md:text-6xl">
                Find, compare and hire an agent that is <span className="text-brand">actually there.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink-dim">
                {num(health.agentsOnChain)} agents are registered on chain. {num(pop.withHttpEndpoint)} publish
                anything you could call. Muster shows how much is known about every one of them, and says
                unknown when the answer is unknown.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/shelf/yield" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-canvas">Browse the shelves</Link>
                <Link href="/hire/health-factor" className="rounded-md border border-line px-5 py-2.5 text-sm text-ink-soft hover:border-brand hover:text-brand">Hire one in 30 seconds</Link>
                <Link href="/status" className="px-2 py-2.5 text-sm text-ink-dim hover:text-brand">Check our numbers</Link>
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between text-xs text-ink-faint">
                <span>Hireable here right now, one per shelf</span>
                <span className="num">{num(rungs.payable + rungs.settled)} payable of {num(totalListed)}</span>
              </div>
              <ul className="mt-3 divide-y divide-line-soft">
                {top.map(({ shelf, card }) => (
                  <li key={shelf} className="py-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="w-24 shrink-0 text-xs text-ink-faint">{SHELF_TITLES[shelf]}</span>
                      {card ? (
                        <Link href={`/agent/${card.agentId}`} className="min-w-0 flex-1 text-sm text-ink hover:text-brand">{card.name}</Link>
                      ) : (
                        <span className="unknown text-sm">none hireable in USD1 yet</span>
                      )}
                      {card?.firstParty === 1 && <span className="shrink-0 rounded-sm border border-warn/50 px-1 text-[10px] text-warn">ours</span>}
                    </div>
                    {card && (
                      <div className="mt-1 flex items-center justify-between gap-3 pl-24">
                        <span className="num text-xs text-ink-dim">{card.priceBase && card.priceDecimals !== null ? `${Number(BigInt(card.priceBase)) / 10 ** card.priceDecimals} ${TOKENS.USD1.symbol} per call` : ''}</span>
                        <RungBar rung={card.evidenceTier} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-faint">Every hireable row today is one we operate, and it is labelled. The measurement below is why.</p>
            </div>
          </div>
        </main>
      </div>

      <main className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
        <section className="mt-10 grid gap-3 md:grid-cols-4" aria-label="How it works">
          {[
            ['1. Find', 'Four shelves, each a capability contract with inputs, outputs and units. Filter by how much is known.'],
            ['2. Understand', 'Every row carries its rung: registered, declared, reachable, probed, payable, settled. Claims and checks are kept apart.'],
            ['3. Sign', 'One EIP-712 signature in USD1 for exactly the price. No transaction, no gas, no BNB.'],
            ['4. Get the work', 'Real reads at a named block: a health factor, a yield ranking, a range check, a grid ladder.'],
          ].map(([h, b]) => (
            <div key={h} className="rounded-lg border border-line bg-panel p-4">
              <div className="text-sm text-ink">{h}</div>
              <div className="mt-1 text-xs text-ink-dim">{b}</div>
            </div>
          ))}
        </section>

        <section className="mt-12" aria-labelledby="shelves">
          <div className="flex items-baseline justify-between">
            <h2 id="shelves" className="font-display text-3xl">Four shelves, equal depth</h2>
            <span className="text-xs text-ink-faint">the four categories the programme names</span>
          </div>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {shelves.map((s) => {
              const c = contractFor(s.shelf)
              const r = rungCounts(s.shelf)
              const known = r.reachable + r.probed + r.payable + r.settled
              const tot = s.listed + s.indexed
              return (
                <li key={s.shelf} className="rounded-xl border border-line bg-panel p-5 hover:border-ink-dim">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/shelf/${s.shelf}`} className="font-display text-2xl text-ink hover:text-brand">{SHELF_TITLES[s.shelf]}</Link>
                    {s.bestRung && <EvidenceBadge rung={s.bestRung} />}
                  </div>
                  <p className="mt-2 text-sm text-ink-dim">{c.question}</p>
                  <div className="mt-4 flex items-end justify-between gap-4 text-xs">
                    <div className="flex gap-5">
                      <div><div className="text-ink-faint">Rows</div><div className="num text-lg text-ink">{num(tot)}</div></div>
                      <div><div className="text-ink-faint">Checked</div><div className="num text-lg text-ink">{num(known)}</div></div>
                      <div><div className="text-ink-faint">Hireable</div><div className={`num text-lg ${s.hireable > 0 ? 'text-brand' : 'unknown'}`}>{s.hireable > 0 ? num(s.hireable) : 'none'}</div></div>
                    </div>
                    <div className="w-40">
                      <div className="mb-1 flex justify-between text-ink-faint"><span>checked</span><span className="num">{tot ? Math.round((known / tot) * 100) : 0}%</span></div>
                      <div className="bar"><span style={{ width: `${tot ? (known / tot) * 100 : 0}%` }} /></div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          {/* [doc 03] The Agent Diversity proof: every shelf's counts with the first-party split. */}
          <p className="mt-4 text-sm text-ink-dim">
            <Link href="/coverage" className="text-brand">See all four side by side on the coverage page</Link>, with the third-party and first-party split beside every count, the classifier basis and an honest note on precision.
          </p>
        </section>

        <section className="mt-14" aria-labelledby="measured">
          <h2 id="measured" className="font-display text-3xl">Why a directory of all of them is worthless</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink-dim">
            Measured over the whole registry, not a sample, at block {health.atBlock ? num(health.atBlock) : 'unknown'}. Each bar is one SQL query over an index built from the chain. The commands are on the <Link href="/status" className="text-brand">status page</Link>.
          </p>
          <ul className="mt-5 space-y-4">
            <Bar n={pop.agentsIndexed} of={pop.agentsIndexed} label="registered on chain" note="the number the brief was built around" />
            <Bar n={pop.largestCluster?.size ?? null} of={pop.agentsIndexed} label={`identical registrations under one name, ${pop.largestCluster?.name ?? 'unknown'}`} note="one operator, one script. Muster collapses a cluster to one row" />
            <Bar n={pop.declaresX402} of={pop.agentsIndexed} label="claim they can take an x402 payment" note="a claim in a record nobody checked" />
            <Bar n={pop.withHttpEndpoint} of={pop.agentsIndexed} label="publish an endpoint another program could call" note="the rest are a name and nothing to call" />
            <Bar n={rungs.probed + rungs.payable + rungs.settled + rungs.reachable} of={pop.agentsIndexed} label="answered when we asked" note="one HTTPS request per declared host, through a guard against private addresses" />
            <Bar n={rungs.payable + rungs.settled} of={pop.agentsIndexed} label="returned a real 402 with payment requirements" note="the payable rung, checked rather than claimed" />
            <Bar n={pop.intersection} of={pop.bazaarPayoutAddresses} label="hold both an ERC-8004 identity and a payout address in B402 Bazaar" note={`Bazaar: ${num(pop.bazaarResources)} paid endpoints behind ${num(pop.bazaarPayoutAddresses)} addresses, one holding ${pop.bazaarLargestShare !== null ? (pop.bazaarLargestShare * 100).toFixed(0) : '?'}%`} />
          </ul>
          <p className="mt-5 max-w-3xl text-sm text-ink-dim">
            The last bar is the finding that shaped this build. Identity and proven revenue are near-disjoint populations on BSC, and the one agent in the intersection has an empty registration record and sells image generation. No agent on the chain is both provably payable and in one of these four categories. So we operate one reference agent per shelf, and label it ours on every row.
          </p>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl">How much is known</h2>
            <ul className="mt-3 space-y-2">
              {EVIDENCE_ORDER.map((r) => {
                const n = rungs[r]; const tot = totalListed || 1
                return (
                  <li key={r} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-ink-soft">{r}</span>
                    <div className="bar flex-1"><span style={{ width: `${Math.max(1, (n / tot) * 100)}%` }} /></div>
                    <span className="num w-10 text-right text-ink">{num(n)}</span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs text-ink-faint">A registration record is a claim. It sits two rungs below a payment that cleared.</p>
            {rungs.settled === 0 ? (
              <p className="mt-2 text-xs text-ink-faint">
                Settled reads 0 because no payment has cleared through Muster yet. Each hire is a real EIP-3009
                authorization that Muster verifies itself and submits from its own key, paying the gas. Whether that key
                can pay gas right now is on the <Link href="/status" className="underline">status page</Link>, and a row
                is never marked settled without a transaction hash.
              </p>
            ) : null}
          </div>
          <div>
            <h2 className="font-display text-2xl">Last probes</h2>
            {probes.length === 0 ? <p className="mt-3 unknown text-sm">no probe has run yet</p> : (
              <ul className="mt-3 divide-y divide-line-soft text-sm">
                {probes.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 py-1.5">
                    <span className={`w-10 text-xs ${p.verdict === 'pass' ? 'text-up' : 'text-down'}`}>{p.verdict}</span>
                    <Link href={`/agent/${p.agentId}`} className="min-w-0 flex-1 truncate text-ink hover:text-brand">{p.name ?? <span className="unknown">unnamed</span>}</Link>
                    <span className="num hidden text-xs text-ink-faint md:inline">{p.host}</span>
                    {p.sawPaymentRequired === 1 && <span className="text-xs text-brand">402</span>}
                    <span className="num w-14 text-right text-xs text-ink-faint">{ago(Math.round((Date.now() - p.observedAt) / 1000))}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-faint">Real rows from the probe cycle. Nothing here is a fixture.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function Bar({ n, of, label, note }: { n: number | null; of: number | null; label: string; note: string }) {
  const pct = n !== null && of !== null && of > 0 ? (n / of) * 100 : null
  return (
    <li>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-ink">{label}</span>
        <span className="num shrink-0 text-ink"><span className="text-brand">{num(n)}</span> <span className="text-ink-faint">of {num(of)}</span>{pct !== null && <span className="ml-2 text-ink-dim">{pct < 1 ? pct.toFixed(2) : pct.toFixed(0)}%</span>}</span>
      </div>
      <div className="bar mt-1.5"><span style={{ width: `${pct === null ? 0 : Math.max(0.4, pct)}%` }} /></div>
      <div className="mt-1 text-xs text-ink-faint">{note}</div>
    </li>
  )
}
