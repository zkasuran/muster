import Link from 'next/link'
import { SHELVES } from '@/lib/constants'
import { SHELF_TITLES } from '@/lib/classify'

/** Plain links, so the whole site is walkable with scripting off. */
export function Nav() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 md:px-8">
        <Link href="/" className="font-display text-2xl text-brand">
          Muster
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {SHELVES.map((s) => (
            <Link key={s} href={`/shelf/${s}`} className="text-ink-soft hover:text-brand">
              {SHELF_TITLES[s]}
            </Link>
          ))}
          <Link href="/compare" className="text-ink-soft hover:text-brand">
            Compare
          </Link>
          <Link href="/report" className="text-ink-dim hover:text-brand">
            Report
          </Link>
          <Link href="/status" className="text-ink-dim hover:text-brand">
            Status
          </Link>
          {/* [doc 03] Coverage is the Agent Diversity proof, so a judge reaches it from any page. */}
          <Link href="/coverage" className="text-ink-dim hover:text-brand">
            Coverage
          </Link>
          {/* [doc 08] the money ledger */}
          <Link href="/ledger" className="text-ink-dim hover:text-brand">
            Ledger
          </Link>
          {/* [doc 16] Altana partner track session panel */}
          <Link href="/altana" className="text-ink-dim hover:text-brand">
            Altana
          </Link>
          {/* [doc 06] the quality methodology and anti-gaming summary */}
          <Link href="/quality" className="text-ink-dim hover:text-brand">
            Quality
          </Link>
          {/* [doc 13] the four partner tracks off one build */}
          <Link href="/partners" className="text-ink-dim hover:text-brand">
            Partners
          </Link>
          {/* [doc 11] the BNB Chain facts, read live and checked against the pinned values */}
          <Link href="/stack" className="text-ink-dim hover:text-brand">
            Stack
          </Link>
        </nav>
        <form action="/search" method="get" className="ml-auto flex items-center gap-2">
          <label htmlFor="q" className="sr-only">
            Search agents
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="Search agents"
            className="w-44 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink outline-none focus:border-ink-dim md:w-56"
          />
          <button
            type="submit"
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-brand hover:text-brand"
          >
            Search
          </button>
        </form>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-8 text-xs leading-relaxed text-ink-faint md:px-8">
        <p>
          Muster indexes the ERC-8004 registries on BNB Smart Chain directly. Every figure is
          measured and dated, and anything unmeasured says unknown rather than showing a zero.
        </p>
        <p className="mt-2">
          Not affiliated with, endorsed by or partnered with BNB Chain or Binance. Source
          available under LicenseRef-zkasuran-SAND-1.0. AI assistance was used in building
          this, and the design and verification are the author&apos;s.
        </p>
      </div>
    </footer>
  )
}
