import Link from 'next/link'
import { SHELVES } from '@/lib/constants'
import { SHELF_TITLES } from '@/lib/classify'
import { ThemeToggle } from './theme-toggle'

/**
 * The header, ordered by what a buyer does. The four shelves and Compare are the browse path, then
 * List your agent for the supply side. The verification and partner pages a judge wants are grouped
 * under one More control rather than spread across the bar, so the buyer flow reads first. Plain
 * links and a details/summary menu, so the whole site is still walkable with scripting off.
 */
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
          <Link href="/list-agent" className="text-ink-soft hover:text-brand">
            List your agent
          </Link>
          {/* The verification, money and partner pages, grouped so a judge reaches every one
              without the buyer flow being crowded off the bar. Open on hover or click, keyboard
              reachable, and still a plain list with scripting off. */}
          <details className="group relative">
            <summary className="cursor-pointer list-none text-ink-dim hover:text-brand">
              More
            </summary>
            <div className="absolute left-0 z-10 mt-2 flex w-44 flex-col gap-1 rounded-lg border border-line bg-panel p-2 text-sm shadow-lg">
              <MoreLink href="/status">Status and data</MoreLink>
              <MoreLink href="/coverage">Coverage</MoreLink>
              <MoreLink href="/report">Advantage report</MoreLink>
              <MoreLink href="/quality">Quality method</MoreLink>
              <MoreLink href="/ledger">Ledger</MoreLink>
              <MoreLink href="/partners">Partners</MoreLink>
              <MoreLink href="/altana">Altana sessions</MoreLink>
              <MoreLink href="/stack">BNB stack</MoreLink>
              <MoreLink href="/docs">Docs and API</MoreLink>
            </div>
          </details>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <form action="/search" method="get" className="flex items-center gap-2">
            <label htmlFor="q" className="sr-only">
              Search agents
            </label>
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Search agents"
              className="w-36 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink outline-none focus:border-ink-dim md:w-48"
            />
            <button
              type="submit"
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-brand hover:text-brand"
            >
              Search
            </button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-2 py-1 text-ink-soft hover:bg-panel-2 hover:text-brand">
      {children}
    </Link>
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
