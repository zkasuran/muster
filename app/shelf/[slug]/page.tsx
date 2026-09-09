import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Nav, Footer } from '@/components/nav'
import { ListingRow, ListingTr } from '@/components/listing-row'
import { RungBar } from '@/components/evidence'
import { num } from '@/components/fresh'
import { shelfListings, shelfCount, rungCounts, type ShelfQuery } from '@/lib/queries'
import { contractFor, SHELF_TITLES } from '@/lib/classify'
import { SHELVES } from '@/lib/constants'
import { EVIDENCE_ORDER, type EvidenceRung, type Shelf } from '@/lib/types'
import { cn } from '@/lib/cn'

export const dynamic = 'force-dynamic'

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

function parse(sp: SP): ShelfQuery & { view: 'cards' | 'table'; page: number } {
  const rung = first(sp['rung']) as EvidenceRung
  const sort = first(sp['sort'])
  const page = Math.max(1, Number(first(sp['page']) || 1) || 1)
  return {
    minRung: (EVIDENCE_ORDER as readonly string[]).includes(rung) ? rung : undefined,
    payable: first(sp['payable']) === '1',
    who: first(sp['who']) === 'ours' ? 'ours' : first(sp['who']) === 'third' ? 'third' : undefined,
    unique: first(sp['unique']) === '1',
    q: first(sp['q']) || undefined,
    sort: (['rung', 'probe', 'name', 'id', 'price'] as const).find((s) => s === sort) ?? 'rung',
    view: first(sp['view']) === 'table' ? 'table' : 'cards',
    page,
    limit: 40,
    offset: (page - 1) * 40,
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
  const pages = Math.max(1, Math.ceil(total / 40))

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl">{contract.title}</h1>
            <p className="mt-2 max-w-2xl text-ink-dim">{contract.question}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            <span className="num text-2xl text-ink">{num(all)}</span> on this shelf ·
            <span className="num text-brand">{num(rungs.payable + rungs.settled)}</span> hireable
          </div>
        </div>

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
              <span><span className="num text-ink">{num(total)}</span> match{total === 1 ? 'es' : ''}{total !== all && <> of {num(all)}</>} · page {f.page} of {pages}</span>
              <span className="inline-flex overflow-hidden rounded-md border border-line">
                <Link href={href(slug, sp, { view: null })} className={cn('px-3 py-1', f.view === 'cards' ? 'bg-panel-2 text-ink' : 'text-ink-dim hover:text-ink')}>cards</Link>
                <Link href={href(slug, sp, { view: 'table' })} className={cn('border-l border-line px-3 py-1', f.view === 'table' ? 'bg-panel-2 text-ink' : 'text-ink-dim hover:text-ink')}>table</Link>
              </span>
            </div>

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
