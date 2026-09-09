/**
 * [doc 10] Shared chrome for the public docs site, docs/10-DOCS-AND-POLICY.md section 3. Small on
 * purpose: a heading block, a code block and a labelled field, so every docs page reads as one
 * surface and no page retypes a layout. The JSON these render is passed in from the real generators
 * in lib/, never hand-written, so a schema on the page cannot drift from the code that serves it.
 */
import Link from 'next/link'

export function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-lg border border-line bg-panel p-4">
      <h2 className="mb-3 text-sm uppercase tracking-wide text-ink-faint">{title}</h2>
      {children}
    </section>
  )
}

/**
 * A JSON or shell block. The value is stringified from a real object where the caller has one, so
 * the page shows the served bytes rather than a copy of them.
 */
export function Code({ children, label }: { children: string; label?: string }) {
  return (
    <div className="mt-2">
      {label && <div className="mb-1 text-xs text-ink-faint">{label}</div>}
      <pre className="overflow-x-auto rounded-lg border border-line bg-canvas p-3 text-xs leading-relaxed num text-ink-soft">
        {children}
      </pre>
    </div>
  )
}

/** A live link a reader can fetch, shown as the path so it can be typed as well as clicked. */
export function LiveLink({ href, children }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="num text-brand hover:underline">
      {children ?? href}
    </Link>
  )
}
