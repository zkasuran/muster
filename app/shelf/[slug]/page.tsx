import { notFound } from 'next/navigation'
import { Nav, Footer } from '@/components/nav'
import { ListingRow } from '@/components/listing-row'
import { num } from '@/components/fresh'
import { shelfListings, rungCounts } from '@/lib/queries'
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
  return { title: SHELF_TITLES[slug as Shelf] }
}

export default async function ShelfPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!(SHELVES as readonly string[]).includes(slug)) notFound()
  const shelf = slug as Shelf
  const contract = contractFor(shelf)
  const listings = shelfListings(shelf, 60)
  const rungs = rungCounts(shelf)

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl md:text-4xl">{contract.title}</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">{contract.question}</p>

        <section className="mt-6 rounded-lg border border-line bg-panel p-4">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">
            The contract this shelf enforces
          </h2>
          <p className="mt-2 text-xs text-ink-dim">
            A shelf is a capability contract, not a tag. An agent appears here because it matches
            the contract, and it rises above the declared rung only when a probe agrees.
          </p>
          <dl className="mt-3 grid gap-3 text-xs md:grid-cols-3">
            <div>
              <dt className="text-ink-faint">Inputs it must accept</dt>
              <dd className="mt-1 space-y-0.5 text-ink-soft">
                {contract.inputs.map((i) => (
                  <div key={i}>{i}</div>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-ink-faint">Outputs it must return</dt>
              <dd className="mt-1 space-y-0.5 text-ink-soft">
                {contract.outputs.map((o) => (
                  <div key={o}>{o}</div>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-ink-faint">Units</dt>
              <dd className="num mt-1 text-ink-soft">{contract.units}</dd>
            </div>
          </dl>
        </section>

        <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs text-ink-faint">
          <span>
            <span className="num text-ink">{num(listings.length)}</span> shown
          </span>
          <span>
            payable or better:{' '}
            <span className={rungs.payable + rungs.settled > 0 ? 'num text-brand' : 'unknown'}>
              {rungs.payable + rungs.settled > 0 ? num(rungs.payable + rungs.settled) : 'none yet'}
            </span>
          </span>
          <span>ordered by how much is known, then by registration order</span>
        </div>

        {listings.length === 0 ? (
          <p className="mt-8 rounded-lg border border-line bg-panel p-6 text-sm text-ink-dim">
            Nothing is on this shelf yet. That is the honest state rather than an error: the
            index is still filling, and a row only appears once it matches this shelf&apos;s
            contract. The <a className="text-brand" href="/status">status page</a> says how far
            the sweep has got.
          </p>
        ) : (
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {listings.map((l) => (
              <ListingRow key={l.listingId} l={l} />
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  )
}
