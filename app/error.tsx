'use client'

import Link from 'next/link'

/**
 * The route-level error boundary. Without one, any throw inside an async server component (a bad
 * query param that reaches the DB, a read that fails) becomes a bare HTTP 500 with no page. With
 * one, the route degrades to a readable page that keeps the buyer on the site. Kept minimal and
 * self-contained: no Nav, since Nav itself reads nothing that can throw, but the boundary must not
 * depend on whatever failed below it.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-3xl md:text-4xl">Something went wrong on this page</h1>
      <p className="mt-3 text-ink-dim">
        The rest of the marketplace is fine. Try again or head back to the front.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-black transition hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-line px-4 py-2 font-medium transition hover:bg-panel"
        >
          Back to the front
        </Link>
      </div>
    </main>
  )
}
