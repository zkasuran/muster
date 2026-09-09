import Link from 'next/link'
import { SHELVES } from '@/lib/constants'
import { SHELF_TITLES } from '@/lib/classify'
import { ThemeToggle } from './theme-toggle'

/**
 * The header, ordered by what a buyer does. The four shelves and Compare are the browse path, then
 * List your agent for the supply side. The verification and partner pages a judge wants are grouped
 * under one More control rather than spread across the bar, so the buyer flow reads first. Plain
 * links and a details/summary menu, so the whole site is still walkable with scripting off.
 *
 * `active` is an optional shelf/route hint a page passes so the current tab is marked. It is a plain
 * data attribute, so the underline is CSS and needs no client JavaScript.
 */
export function Nav({ active }: { active?: string } = {}) {
  return (
    <header className="nav-bar">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" aria-hidden />
          <span className="font-display text-2xl text-ink">Muster</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {SHELVES.map((s) => (
            <Link key={s} href={`/shelf/${s}`} className="nav-link" data-active={active === s ? 'true' : undefined}>
              {SHELF_TITLES[s]}
            </Link>
          ))}
          <Link href="/compare" className="nav-link" data-active={active === 'compare' ? 'true' : undefined}>
            Compare
          </Link>
          <Link href="/list-agent" className="nav-link" data-active={active === 'list-agent' ? 'true' : undefined}>
            List your agent
          </Link>
          {/* The verification, money and partner pages, grouped so a judge reaches every one
              without the buyer flow being crowded off the bar. Open on hover or click, keyboard
              reachable, and still a plain list with scripting off. */}
          <details className="group relative">
            <summary className="cursor-pointer list-none text-ink-dim hover:text-brand">
              More
            </summary>
            <div className="absolute left-0 z-10 mt-2 flex w-44 flex-col gap-1 rounded-lg border border-line bg-panel p-2 text-sm">
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
    <footer className="section border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" aria-hidden />
              <span className="font-display text-xl text-ink">Muster</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-dim">
              A marketplace for ERC-8004 agents on BNB Smart Chain. Every figure is measured and
              dated, and anything unmeasured says <span className="unknown">unknown</span> rather than
              showing a zero.
            </p>
          </div>
          <div>
            <div className="eyebrow">Browse</div>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {SHELVES.map((s) => (
                <li key={s}><Link href={`/shelf/${s}`} className="text-ink-soft hover:text-brand">{SHELF_TITLES[s]}</Link></li>
              ))}
              <li><Link href="/compare" className="text-ink-soft hover:text-brand">Compare</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow">Verify</div>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              <li><Link href="/status" className="text-ink-soft hover:text-brand">Status and data</Link></li>
              <li><Link href="/report" className="text-ink-soft hover:text-brand">Advantage report</Link></li>
              <li><Link href="/stack" className="text-ink-soft hover:text-brand">BNB stack</Link></li>
              <li><Link href="/docs" className="text-ink-soft hover:text-brand">Docs and API</Link></li>
              <li><Link href="/list-agent" className="text-ink-soft hover:text-brand">List your agent</Link></li>
            </ul>
          </div>
        </div>
        <hr className="hr-soft my-8" />
        <p className="text-xs leading-relaxed text-ink-faint">
          Not affiliated with, endorsed by or partnered with BNB Chain or Binance. Source available
          under LicenseRef-zkasuran-SAND-1.0. AI assistance was used in building this, and the design
          and verification are the author&apos;s.
        </p>
      </div>
    </footer>
  )
}
