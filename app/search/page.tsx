import { Nav, Footer } from '@/components/nav'
import { ListingRow } from '@/components/listing-row'
import { searchListings } from '@/lib/queries'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Search' }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const results = query ? searchListings(query, 40) : []
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl">Search</h1>
        {!query ? (
          <p className="mt-3 text-ink-dim">
            Search by name, by anything in a description, by a declared skill, or by an agent id.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-dim">
              <span className="num text-ink">{results.length}</span> result
              {results.length === 1 ? '' : 's'} for{' '}
              <span className="num text-ink">{query}</span>. Only agents that match a shelf
              contract are searchable, because a row with no contract has nothing to compare.
            </p>
            {results.length === 0 ? (
              <p className="mt-6 rounded-lg border border-line bg-panel p-6 text-sm text-ink-dim">
                Nothing matched. That is a real answer rather than an error.
              </p>
            ) : (
              <ul className="mt-6 grid gap-3 md:grid-cols-2">
                {results.map((l) => (
                  <ListingRow key={l.listingId} l={l} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  )
}
