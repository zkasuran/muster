import { SHELVES } from '@/lib/constants'
import { cn } from '@/lib/cn'

// Server component on purpose. The landing page and every shelf must render with
// scripting off, which docs/03-TAXONOMY.md settles as the mobile decision.
// Only md: breakpoints, per the Opensource UI convention.
export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 md:px-8">
      <h1 className="font-display text-4xl leading-tight tracking-tight">
        <span className="text-brand">Muster</span>
      </h1>
      <p className="mt-3 max-w-2xl text-ink-dim">
        Find, compare and hire a live ERC-8004 agent on BNB Smart Chain, in one place.
      </p>

      <ul className="mt-10 grid gap-3 md:grid-cols-2">
        {SHELVES.map((shelf) => (
          <li
            key={shelf}
            className={cn(
              'rounded-lg border border-line bg-panel p-4',
              'flex items-baseline justify-between gap-4',
            )}
          >
            <span className="capitalize">{shelf.replace('-', ' ')}</span>
            <span className="num unknown text-xs">not indexed yet</span>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-ink-faint">
        Scaffold. The shelves render from the indexer, and a count nobody has measured shows
        as unknown rather than as zero.
      </p>
    </main>
  )
}
