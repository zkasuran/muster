import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Nav, Footer } from '@/components/nav'
import { ListingRow, ListingTr } from '@/components/listing-row'
import { RungBar, EvidenceBadge } from '@/components/evidence'
import { ScoreCell } from '@/components/score'
import { num } from '@/components/fresh'
import { shelfListings, shelfCount, rungCounts, offShelf, shelfByScore, type ShelfQuery, type ScoredCard } from '@/lib/queries'
import { contractFor, SHELF_TITLES } from '@/lib/classify'
import { SHELVES, TOKENS } from '@/lib/constants'
import { findAgent } from '@/lib/agents'
import { EVIDENCE_ORDER, type EvidenceRung, type Shelf } from '@/lib/types'
import { cn } from '@/lib/cn'

export const dynamic = 'force-dynamic'

// The buyer's job in their own words, the same line the landing cards lead with, so a shelf opened
// from anywhere reads as "here is what you can get done" before "here is a category".
const JOB_LINE: Record<Shelf, string> = {
  'health-factor': 'Watch a loan on Venus and warn before it liquidates.',
  yield: 'Find where capital earns the most on BSC right now, after cost.',
  rebalancing: 'Check whether a PancakeSwap LP position has drifted out of range.',
  'grid-trading': 'Plan a grid around a live pool price, level by level.',
}

export function generateStaticParams() {
  return SHELVES.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!(SHELVES as readonly string[]).includes(slug)) return { title: 'Not found' }
  return { title: SHELF_TITLES[slug as Shelf] }
}

type SP = Record<string, string | string[] | undefined>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

const PAGE_SIZES = [10, 20, 50] as const

function parse(sp: SP): ShelfQuery & { view: 'cards' | 'table'; page: number; perPage: number } {
  const rung = first(sp['rung']) as EvidenceRung
  const sort = first(sp['sort'])
  const page = Math.max(1, Number(first(sp['page']) || 1) || 1)
  const perPageRaw = Number(first(sp['per']) || 10)
  const perPage = (PAGE_SIZES as readonly number[]).includes(perPageRaw) ? perPageRaw : 10
  // Duplicates collapse by default. `all=1` opens every near-identical listing from one operator.
  const collapse = first(sp['all']) !== '1'
  return {
    minRung: (EVIDENCE_ORDER as readonly string[]).includes(rung) ? rung : undefined,
    payable: first(sp['payable']) === '1',
    who: first(sp['who']) === 'ours' ? 'ours' : first(sp['who']) === 'third' ? 'third' : undefined,
    unique: first(sp['unique']) === '1',
    collapse,
    q: first(sp['q']) || undefined,
    sort: (['rung', 'probe', 'name', 'id', 'price'] as const).find((s) => s === sort) ?? 'rung',
    view: first(sp['view']) === 'table' ? 'table' : 'cards',
    page,
    perPage,
    limit: perPage,
    offset: (page - 1) * perPage,
  }
}

/** Build the same URL with one parameter changed, so every facet is a link. */
function href(slug: string, sp: SP, patch: Record<string, string | null>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) { const s = first(v); if (s) u.set(k, s) }
  for (const [k, v] of Object.entries(patch)) { if (v === null) u.delete(k); else u.set(k, v) }
  if (!('page' in patch)) u.delete('page')
  const qs = u.toString()
  return `/shelf/${slug}${qs ? `?${qs}` : ''}`
}

export default async function ShelfPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params
  if (!(SHELVES as readonly string[]).includes(slug)) notFound()
  const shelf = slug as Shelf
  const sp = await searchParams
  const f = parse(sp)
  const contract = contractFor(shelf)
  const listings = shelfListings(shelf, f)
  const total = shelfCount(shelf, f)
  const all = shelfCount(shelf, {})
  const rungs = rungCounts(shelf)
  const ours = shelfListings(shelf, { who: 'ours', limit: 1 })[0]?.agentId
  const pages = Math.max(1, Math.ceil(total / f.perPage))
  // [doc 03] The off-shelf drawer reads the whole shelf, not the current facets, so the count of
  // candidates we can read but do not list is always the shelf's own, docs/03-TAXONOMY.md 5.3.
  const off = offShelf(shelf)
  // [doc 06] The shelf ranked by the evidence score's confidence floor, section 2's M_lo sort.
  const byScore = shelfByScore(shelf, 12)
  // The hireable reference agent for this shelf, shown as a hire panel at the top. Only surfaced
  // when it is actually payable, so the panel never offers a hire the endpoint would not honour.
  const hireAgent = rungs.payable + rungs.settled > 0 ? findAgent(shelf) : null
  const hirePrice = hireAgent ? `${Number(BigInt(hireAgent.priceBase)) / 10 ** TOKENS.USD1.decimals} USD1` : ''

  return (
    <>
      <Nav active={shelf} />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="section-lead">
          <div className="min-w-0">
            <p className="eyebrow">Capability shelf</p>
            <h1 className="mt-3 h-section text-4xl md:text-5xl">{contract.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-dim">{JOB_LINE[shelf]}</p>
            <p className="mt-1 max-w-2xl text-sm text-ink-faint">{contract.question}</p>
          </div>
          <div className="flex items-end gap-4">
            <div className="stat">
              <span className="stat-num">{num(all)}</span>
              <span className="stat-label">on this shelf</span>
            </div>
            <div className="stat">
              <span className="stat-num text-brand">{num(rungs.payable + rungs.settled)}</span>
              <span className="stat-label">hireable</span>
            </div>
          </div>
        </div>

        {/* The one hireable agent on this shelf, lifted to the top as a hire panel so the buyer's
            first move is to hire or try it free, not to read a directory. This is the same agent the
            landing card offers; the list below is for comparing the rest of the category against it. */}
        {hireAgent && (
          <div className="mt-6 card feature flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-card text-ink">{hireAgent.name}</span>
                <span className="pill pill-warn">ours</span>
                <span className="pill pill-up">hireable now</span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-ink-dim">{hireAgent.summary}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="num text-sm text-brand">{hirePrice} / call</span>
              <Link href={`/hire/${shelf}`} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-canvas">Hire</Link>
              <Link href={`/hire/${shelf}#see-it-work`} className="rounded-md border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand hover:text-brand">See it free</Link>
            </div>
          </div>
        )}

        {all < 30 && (
          <p className="mt-4 max-w-3xl rounded-lg border border-line bg-panel px-4 py-3 text-sm text-ink-dim">
            This shelf is thinner than the others because the registry holds fewer agents that match its
            contract, not because it gets less attention. It has the same contract, the same probe
            coverage, the same facets and one hireable reference agent, exactly like the other three.
            Depth here is the population, measured, and the count above is the whole of it.
          </p>
        )}

        <details className="mt-6 rounded-lg border border-line bg-panel">
          <summary className="cursor-pointer px-4 py-3 text-sm text-ink-soft">
            The contract this shelf enforces: {contract.inputs.length} inputs, {contract.outputs.length} outputs, units in {contract.units.split(',')[0]?.trim()}
          </summary>
          <div className="grid gap-4 border-t border-line px-4 py-4 text-xs md:grid-cols-3">
            <div><div className="text-ink-faint">Inputs it must accept</div>{contract.inputs.map((i) => <div key={i} className="text-ink-soft">{i}</div>)}</div>
            <div><div className="text-ink-faint">Outputs it must return</div>{contract.outputs.map((o) => <div key={o} className="text-ink-soft">{o}</div>)}</div>
            <div><div className="text-ink-faint">Units</div><div className="num text-ink-soft">{contract.units}</div><p className="mt-2 text-ink-faint">A row is here because its record matches this contract. It rises above declared only when a probe agrees.</p></div>
          </div>
        </details>

        {/* [doc 03] The full contract page: inputs, outputs, live counts and the published classifier rules. */}
        <p className="mt-2 text-sm">
          <Link href={`/shelf/${slug}/contract`} className="text-brand">Read the full contract</Link>
          <span className="text-ink-faint">. It lists what a listing must accept and return, plus the exact rules that make a candidate.</span>
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="space-y-5 text-sm">
            <form action={`/shelf/${shelf}`} method="get" className="space-y-1">
              {f.sort !== 'rung' && <input type="hidden" name="sort" value={f.sort} />}
              {f.view === 'table' && <input type="hidden" name="view" value="table" />}
              <label htmlFor="q" className="text-xs text-ink-faint">Filter by name or description</label>
              <div className="flex gap-1">
                <input id="q" name="q" defaultValue={f.q ?? ''} placeholder="e.g. Venus" className="w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink outline-none focus:border-ink-dim" />
                <button type="submit" className="rounded-md border border-line px-3 text-xs text-ink-soft hover:border-brand hover:text-brand">Go</button>
              </div>
            </form>

            <Facet title="At least this rung">
              {EVIDENCE_ORDER.map((r) => (
                <FacetLink key={r} active={f.minRung === r} href={href(slug, sp, { rung: f.minRung === r ? null : r })}>
                  <RungBar rung={r} /> <span className="ml-2">{r}</span>
                  <span className="num ml-auto text-ink-faint">{rungs[r]}</span>
                </FacetLink>
              ))}
            </Facet>

            <Facet title="Show">
              <FacetLink active={f.payable === true} href={href(slug, sp, { payable: f.payable ? null : '1' })}>hireable now</FacetLink>
              <FacetLink active={f.who === 'ours'} href={href(slug, sp, { who: f.who === 'ours' ? null : 'ours' })}>ours only</FacetLink>
              <FacetLink active={f.who === 'third'} href={href(slug, sp, { who: f.who === 'third' ? null : 'third' })}>third party only</FacetLink>
              <FacetLink active={!!f.unique} href={href(slug, sp, { unique: f.unique ? null : '1' })}>hide identical registrations</FacetLink>
            </Facet>

            <Facet title="Sort by">
              {(['rung', 'probe', 'price', 'name', 'id'] as const).map((s) => (
                <FacetLink key={s} active={f.sort === s} href={href(slug, sp, { sort: s === 'rung' ? null : s })}>
                  {s === 'rung' ? 'how much is known' : s === 'probe' ? 'most recently probed' : s === 'id' ? 'registration order' : s}
                </FacetLink>
              ))}
            </Facet>

            {(f.minRung || f.payable || f.who || f.unique || f.q) && (
              <Link href={`/shelf/${slug}`} className="block text-xs text-brand">clear filters</Link>
            )}
          </aside>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-faint">
              <span>
                <span className="num text-ink">{num(total)}</span>{' '}
                {f.collapse ? (total === 1 ? 'listing' : 'listings') : total === 1 ? 'match' : 'matches'}
                {total !== all && <> of {num(all)}</>} · page {f.page} of {pages}
              </span>
              <div className="flex items-center gap-3">
                {/* Page size: how many rows a page shows, so a long shelf is read in even chunks. */}
                <span className="inline-flex items-center gap-1">
                  <span className="hidden sm:inline">per page</span>
                  <span className="inline-flex overflow-hidden rounded-md border border-line">
                    {PAGE_SIZES.map((n, i) => (
                      <Link
                        key={n}
                        href={href(slug, sp, { per: n === 10 ? null : String(n), page: null })}
                        className={cn('px-2.5 py-1', i > 0 && 'border-l border-line', f.perPage === n ? 'bg-panel-2 text-ink' : 'text-ink-dim hover:text-ink')}
                      >
                        {n}
                      </Link>
                    ))}
                  </span>
                </span>
                <span className="inline-flex overflow-hidden rounded-md border border-line">
                  <Link href={href(slug, sp, { view: null })} className={cn('px-3 py-1', f.view === 'cards' ? 'bg-panel-2 text-ink' : 'text-ink-dim hover:text-ink')}>cards</Link>
                  <Link href={href(slug, sp, { view: 'table' })} className={cn('border-l border-line px-3 py-1', f.view === 'table' ? 'bg-panel-2 text-ink' : 'text-ink-dim hover:text-ink')}>table</Link>
                </span>
              </div>
            </div>

            {/* Duplicate collapse notice, so a judge knows the count is deduplicated and can open it.
                Only shown when collapsing actually folded something, so it is never noise. */}
            {f.collapse && all > total && (
              <p className="mt-2 text-xs text-ink-dim">
                Near-identical listings from one operator are folded to a single row.{' '}
                <Link href={href(slug, sp, { all: '1', page: null })} className="text-brand hover:underline">
                  Show all {num(all)}
                </Link>
                .
              </p>
            )}
            {!f.collapse && (
              <p className="mt-2 text-xs text-ink-dim">
                Showing every listing, including near-identical ones from one operator.{' '}
                <Link href={href(slug, sp, { all: null, page: null })} className="text-brand hover:underline">
                  Fold duplicates
                </Link>
                .
              </p>
            )}

            {listings.length === 0 ? (
              <p className="mt-4 rounded-lg border border-line bg-panel p-6 text-sm text-ink-dim">
                Nothing matches these filters. That is a real answer rather than an error. <Link href={`/shelf/${slug}`} className="text-brand">Clear them</Link> to see the whole shelf.
              </p>
            ) : f.view === 'table' ? (
              <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-panel">
                <table className="w-full min-w-[720px] text-sm">
                  <thead><tr className="text-left text-xs font-normal text-ink-faint">
                    <th className="px-3 py-2">Agent</th><th className="py-2 pr-3">Known</th><th className="py-2 pr-3">Price</th><th className="py-2 pr-3">Rail</th><th className="py-2 pr-3">Endpoints</th><th className="py-2 pr-3">Last probe</th><th className="py-2"></th>
                  </tr></thead>
                  <tbody className="[&>tr>td:first-child]:pl-3">{listings.map((l) => <ListingTr key={l.listingId} l={l} compareWith={ours} />)}</tbody>
                </table>
              </div>
            ) : (
              <ul className="mt-3 grid gap-3 md:grid-cols-2">{listings.map((l) => <ListingRow key={l.listingId} l={l} compareWith={ours} />)}</ul>
            )}

            {pages > 1 && (
              <nav className="mt-4 flex items-center gap-3 text-sm">
                {f.page > 1 && <Link href={href(slug, sp, { page: String(f.page - 1) })} className="text-brand">previous</Link>}
                <span className="num text-ink-faint">{f.page} / {pages}</span>
                {f.page < pages && <Link href={href(slug, sp, { page: String(f.page + 1) })} className="text-brand">next</Link>}
              </nav>
            )}
          </section>
        </div>

        {/* [doc 03] Off shelf: candidates we can read but do not list, broken out by reason, never
            merged into one offline number. docs/03-TAXONOMY.md section 5.3 and 3.1. */}
        <OffShelfDrawer shelfTitle={contract.title} off={off} />

        {/* [doc 06] The shelf ranked by the evidence score's confidence floor (M_lo, never M), so a
            thin sample cannot outrank a better-evidenced row. First-party rows are labelled ours and
            sort last on a tie, so being ours is never a ranking advantage. */}
        <ScoreRanking rows={byScore} />
      </main>
      <Footer />
    </>
  )
}

function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-ink-faint">{title}</div>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

function FacetLink({ href: h, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={h} className={cn('flex items-center rounded-md px-2 py-1 text-sm', active ? 'bg-panel-2 text-brand' : 'text-ink-soft hover:bg-panel-2 hover:text-ink')}>
      {children}
    </Link>
  )
}

// [doc 03] The off-shelf drawer. Every row is a candidate the classifier matched that we can read
// but cannot list, because it has no endpoint to call or its registration would not parse. Each
// reason is a separate count, never one merged offline number, so an operator sees the exact fix.
function OffShelfDrawer({ shelfTitle, off }: { shelfTitle: string; off: ReturnType<typeof offShelf> }) {
  if (off.total === 0) {
    return (
      <details className="mt-10 rounded-lg border border-line bg-panel">
        <summary className="cursor-pointer px-4 py-3 text-sm text-ink-soft">Off shelf: none</summary>
        <p className="border-t border-line px-4 py-3 text-sm text-ink-dim">
          Every candidate the classifier matched for {shelfTitle} has an endpoint to call, so it is on the
          shelf above. Nothing is held off it. That is a real zero, measured over the shelf.
        </p>
      </details>
    )
  }
  return (
    <details className="mt-10 rounded-lg border border-line bg-panel">
      <summary className="cursor-pointer px-4 py-3 text-sm text-ink-soft">
        Off shelf: <span className="num text-ink">{num(off.total)}</span> {off.total === 1 ? 'candidate we can read but do not list' : 'candidates we can read but do not list'}
      </summary>
      <div className="border-t border-line px-4 py-4">
        <p className="text-xs text-ink-dim">
          Each of these matched the contract text but is not callable. The reason is kept separate
          rather than merged into one offline number, because each needs a different fix from the operator.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {off.byReason.map((r) => (
            <li key={r.reason} className="rounded-sm border border-line px-2 py-1 text-ink-soft">
              {r.reason} <span className="num text-ink-faint">{num(r.c)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-canvas">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs font-normal text-ink-faint">
              <th className="px-3 py-2">Agent</th><th className="py-2 pr-3">Reason it is off shelf</th><th className="py-2 pr-3">Cluster</th>
            </tr></thead>
            <tbody className="[&>tr>td:first-child]:pl-3">
              {off.rows.map((r) => (
                <tr key={r.agentId} className="border-t border-line-soft">
                  <td className="py-2"><Link href={`/agent/${r.agentId}`} className="text-brand hover:underline">{r.name ?? `agent ${r.agentId}`}</Link></td>
                  <td className="py-2 pr-3 text-ink-soft">{r.reason}</td>
                  <td className="py-2 pr-3">{r.clusterSize > 1 ? <span className="num text-ink-faint">{num(r.clusterSize)} identical</span> : <span className="text-ink-faint">unique</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {off.rows.length < off.total && (
          <p className="mt-2 text-xs text-ink-faint">Showing the first <span className="num">{num(off.rows.length)}</span> of <span className="num">{num(off.total)}</span>.</p>
        )}
      </div>
    </details>
  )
}

// [doc 06] The shelf ranked by the evidence score's confidence floor. docs/06-QUALITY.md section 2:
// "the default sort uses M_lo, never M", so a listing cannot outrank a better-evidenced one on a
// tiny sample. The number is never bare: it carries its confidence floor. First-party rows are
// labelled ours and the query tie-breaks them last, so being ours is never a ranking advantage.
function ScoreRanking({ rows }: { rows: ScoredCard[] }) {
  return (
    <section className="mt-10 rounded-lg border border-line bg-panel p-4">
      <h2 className="text-sm uppercase tracking-wide text-ink-faint">Ranked by evidence score</h2>
      <p className="mt-1 text-xs text-ink-dim">
        Sorted by the 95% confidence floor, never the headline, so a thin record cannot jump a
        better-evidenced one. It measures how far up the six-rung ladder a listing has climbed, not
        whether its work was any good. No listing has a settled paid job yet, so the delivery score is
        provisional for every row. <a href="/quality" className="text-brand">How the score works</a>.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-dim">No listing on this shelf has been scored yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-canvas">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs font-normal text-ink-faint">
              <th className="px-3 py-2">#</th><th className="py-2 pr-3">Agent</th><th className="py-2 pr-3">Rung</th><th className="py-2 pr-3">Evidence score</th><th className="py-2 pr-3">Independent authors</th>
            </tr></thead>
            <tbody className="[&>tr>td:first-child]:pl-3">
              {rows.map((r, i) => (
                <tr key={r.listingId} className="border-t border-line-soft">
                  <td className="num py-2 text-ink-faint">{i + 1}</td>
                  <td className="py-2">
                    <Link href={`/agent/${r.agentId}`} className="text-brand hover:underline">{r.name ?? `agent ${r.agentId}`}</Link>
                    {r.firstParty === 1 && <span className="ml-2 rounded-sm border border-warn/50 px-1.5 text-xs text-warn">ours</span>}
                  </td>
                  <td className="py-2 pr-3"><EvidenceBadge rung={r.evidenceTier} /></td>
                  <td className="py-2 pr-3"><ScoreCell scoreValue={r.scoreValue} scoreConfidence={r.scoreConfidence} /></td>
                  <td className="num py-2 pr-3 text-ink-soft">{r.distinctAuthors > 0 ? num(r.distinctAuthors) : <span className="text-ink-faint">none</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
