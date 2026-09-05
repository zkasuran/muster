import { SHELVES } from '@/lib/constants'

// Server component on purpose. The landing page and every shelf must render with
// scripting off, which docs/03-TAXONOMY.md settles.
export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        <span className="text-brand">Muster</span>
      </h1>
      <p className="mt-2 max-w-2xl text-ink-dim">
        Find, compare and hire a live ERC-8004 agent on BNB Smart Chain, in one place.
      </p>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {SHELVES.map((shelf) => (
          <li
            key={shelf}
            className="rounded-xl border border-line bg-panel px-4 py-3 capitalize"
          >
            {shelf.replace('-', ' ')}
          </li>
        ))}
      </ul>
      <p className="mt-10 text-sm text-ink-dim">
        Scaffold only. The shelves render from the indexer, not from this list.
      </p>
    </main>
  )
}
