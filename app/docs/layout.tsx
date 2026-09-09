import { Nav, Footer } from '@/components/nav'
import Link from 'next/link'

/**
 * [doc 10] The public docs site, docs/10-DOCS-AND-POLICY.md section 3. One layout wraps every page
 * under /docs so the sub-nav and chrome are written once. Every page here is a server component and
 * reads with scripting off, the same commitment the buyer surface makes.
 */
export const metadata = { title: 'Docs' }

const DOCS_PAGES: { href: string; label: string }[] = [
  { href: '/docs', label: 'Overview' },
  { href: '/docs/how-it-works', label: 'How it works' },
  { href: '/docs/conformance', label: 'Conformance' },
  { href: '/docs/schemas', label: 'Schemas' },
  { href: '/docs/policy', label: 'Policy' },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="mx-auto max-w-5xl px-5 pt-6 md:px-8">
        <nav className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line pb-3 text-sm">
          {DOCS_PAGES.map((p) => (
            <Link key={p.href} href={p.href} className="text-ink-soft hover:text-brand">
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
      <Footer />
    </>
  )
}
