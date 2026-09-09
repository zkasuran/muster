import { Nav, Footer } from '@/components/nav'
import { ListingRow } from '@/components/listing-row'
import { searchGrammar } from '@/lib/queries'
import { parseQuery, OPERATOR_VALUES, OPERATORS, type OperatorName } from '@/lib/search'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Search' }

/** A short gloss per operator for the legend, so the value set reads with a reason beside it. */
const OP_HELP: Record<OperatorName, string> = {
  is: 'the row state: on shelf, in the whole index, hireable now, ours, a duplicate or declaring x402',
  tag: 'one of the four categories',
  tier: 'the evidence rung, exact or with >= for at least that rung',
  rail: 'the payment scheme a hireable row uses',
  token: 'the token a price is quoted in, a symbol or a 20-byte address',
  answered: 'how recently a probe last passed against it',
  owner: 'the on-chain owner address',
  agent: 'a single agent id',
  cluster: 'a duplicate-cluster id',
}

function freeValueHint(op: OperatorName): string {
  if (op === 'owner') return 'a 0x address'
  if (op === 'agent') return 'an agent id'
  return 'a cluster id'
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const parsed = query ? parseQuery(query) : null
  const hasErrors = (parsed?.errors.length ?? 0) > 0
  const results = parsed && !hasErrors ? searchGrammar(parsed, 40) : []

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl">Search</h1>

        {!query ? (
          <p className="mt-3 max-w-3xl text-ink-dim">
            Type words to match a name, a description, a declared skill or an agent id. Add an operator
            to narrow, for example <span className="num text-ink">venus tag:yield is:hireable</span>. A
            leading <span className="num text-ink">-</span> inverts an operator. The default scope is
            what can be acted on, so add <span className="num text-ink">is:indexed</span> to widen to the
            whole index.
          </p>
        ) : hasErrors ? (
          <div className="mt-4 rounded-lg border border-down bg-panel p-5">
            <p className="text-sm text-ink">The query was not run, because part of it is not a valid filter.</p>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              {parsed!.errors.map((e, i) => (
                <li key={`${e.op}:${e.value}:${i}`}>
                  {e.kind === 'operator' ? (
                    <>Unknown operator <span className="num text-down">{e.op}:</span></>
                  ) : (
                    <><span className="num text-down">{e.op}:{e.value}</span> is not a value <span className="num">{e.op}:</span> accepts</>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-faint">The valid operators and their values are below. Nothing was searched, so this is not a wrong result, it is a stop.</p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-dim">
              <span className="num text-ink">{results.length}</span> result{results.length === 1 ? '' : 's'}. Only rows that match a shelf contract are searchable, because a row with no contract has nothing to compare. The scope is on-shelf rows unless the query says <span className="num">is:indexed</span>.
            </p>
            {(parsed!.clauses.length > 0 || parsed!.terms.length > 0) && (
              <p className="mt-1 text-xs text-ink-faint">
                Read as:{' '}
                {parsed!.terms.map((t) => <span key={`t-${t}`} className="num mr-2 text-ink-dim">{t}</span>)}
                {parsed!.clauses.map((c, i) => (
                  <span key={`c-${i}`} className="num mr-2 text-ink-dim">{c.negate ? '-' : ''}{c.op}:{c.gte ? '>=' : ''}{c.value}</span>
                ))}
              </p>
            )}
            {results.length === 0 ? (
              <p className="mt-6 rounded-lg border border-line bg-panel p-6 text-sm text-ink-dim">
                Nothing matched. That is a real answer rather than an error. Widen with <span className="num">is:indexed</span> or drop a clause.
              </p>
            ) : (
              <ul className="mt-6 grid gap-3 md:grid-cols-2">
                {results.map((l) => <ListingRow key={l.listingId} l={l} />)}
              </ul>
            )}
          </>
        )}

        <details className="mt-10 rounded-lg border border-line bg-panel" open={hasErrors}>
          <summary className="cursor-pointer px-4 py-3 text-sm text-ink-soft">The operators and the values each one takes</summary>
          <div className="border-t border-line px-4 py-4">
            <p className="text-xs text-ink-dim">
              Bare words are matched against name, description, declared skills and the id. They are
              ANDed together. Each operator below maps to one stored field, so a result set is a shareable link
              and a typo is a named error rather than a silently wrong answer.
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              {OPERATORS.map((op) => {
                const values = OPERATOR_VALUES[op] as readonly string[]
                return (
                  <div key={op}>
                    <dt className="num text-ink">{op}:</dt>
                    <dd className="text-xs text-ink-faint">{OP_HELP[op]}</dd>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {values.length === 0 ? (
                        <span className="text-xs text-ink-dim">{freeValueHint(op)}</span>
                      ) : (
                        values.map((v) => (
                          <span key={v} className="num rounded-sm border border-line px-1.5 py-0.5 text-xs text-ink-soft">{v}</span>
                        ))
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>
        </details>
      </main>
      <Footer />
    </>
  )
}
