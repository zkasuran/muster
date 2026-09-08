import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'
import { EvidenceBadge } from '@/components/evidence'
import { ago } from '@/components/fresh'
import { listingsForCompare, latestProbes, type ListingCard } from '@/lib/queries'
import { SHELF_TITLES } from '@/lib/classify'
import { TOKENS } from '@/lib/constants'
import { EVIDENCE_ORDER } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Compare' }

/**
 * Two to four agents side by side. Every row in the grid is a fact a buyer can act on, and a
 * fact nobody measured renders as unknown rather than as a dash that reads like zero.
 *
 * Plain links and a plain form, so it works with scripting off: `?ids=1,2,3`.
 */
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams
  const wanted = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const rows = listingsForCompare(wanted)
  const probes = latestProbes(rows.map((r) => r.listingId))

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl md:text-4xl">Compare</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Put two to four agents side by side. The rung comes first because it is the only row
          that says how much of the rest has been checked.
        </p>

        <form action="/compare" method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="text-xs text-ink-faint">
            Agent ids, comma separated
            <input
              name="ids"
              defaultValue={wanted.join(',')}
              placeholder="900000001,322885,259573"
              className="mt-1 block w-72 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-ink-dim"
            />
          </label>
          <button type="submit" className="rounded-md border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand hover:text-brand">
            Compare
          </button>
          <span className="text-xs text-ink-faint">Or open any shelf and use the compare links on each row.</span>
        </form>

        {rows.length < 2 ? (
          <p className="mt-8 rounded-lg border border-line bg-panel p-6 text-sm text-ink-dim">
            {rows.length === 0
              ? 'Pick at least two agents to compare. Nothing is loaded yet.'
              : 'One agent is loaded. Add at least one more to compare.'}
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-40 border-b border-line py-2 text-left text-xs font-normal text-ink-faint">Field</th>
                  {rows.map((r) => (
                    <th key={r.listingId} className="border-b border-line px-3 py-2 text-left align-top">
                      <Link href={`/agent/${r.agentId}`} className="text-ink hover:text-brand">
                        {r.name ?? <span className="unknown">unnamed</span>}
                      </Link>
                      <div className="num mt-0.5 text-xs font-normal text-ink-faint">
                        id {r.agentId}
                        {r.firstParty === 1 && <span className="ml-2 rounded-sm border border-warn/50 px-1.5 text-warn">ours</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row label="Evidence rung" cells={rows.map((r) => <EvidenceBadge key={r.listingId} rung={r.evidenceTier} />)} />
                <Row label="Rungs reached" cells={rows.map((r) => <Ladder key={r.listingId} rung={r.evidenceTier} />)} />
                <Row label="Shelf" cells={rows.map((r) => <span key={r.listingId}>{SHELF_TITLES[r.category]}</span>)} />
                <Row label="Price" cells={rows.map((r) => <Price key={r.listingId} l={r} />)} />
                <Row label="Payment rail" cells={rows.map((r) => <V key={r.listingId} v={r.priceScheme} fallback="none declared" />)} />
                <Row label="Payment provably cleared" cells={rows.map((r) => <V key={r.listingId} v={r.inBazaar === 1 ? 'yes, in B402 Bazaar' : null} fallback="no record" />)} />
                <Row label="Callable endpoints" cells={rows.map((r) => <span key={r.listingId} className="num">{r.endpointCount}</span>)} />
                <Row
                  label="Last probe"
                  cells={rows.map((r) => {
                    const p = probes.get(r.listingId)
                    if (!p) return <span key={r.listingId} className="unknown">never probed</span>
                    return (
                      <span key={r.listingId} className={p.verdict === 'pass' ? 'text-up' : 'text-down'}>
                        {p.verdict}
                        {p.httpStatus !== null && <span className="num ml-2 text-ink-dim">HTTP {p.httpStatus}</span>}
                        {p.sawPaymentRequired === 1 && <span className="ml-2 text-brand">402 with requirements</span>}
                        {p.failureClass && <span className="ml-2 text-down">{p.failureClass}</span>}
                        <span className="ml-2 text-xs text-ink-faint">{ago(Math.round((Date.now() - p.observedAt) / 1000))}</span>
                      </span>
                    )
                  })}
                />
                <Row label="Latency" cells={rows.map((r) => { const p = probes.get(r.listingId); return <V key={r.listingId} v={p?.latencyMs != null ? `${p.latencyMs} ms` : null} fallback="not measured" mono /> })} />
                <Row label="Claims x402" cells={rows.map((r) => <V key={r.listingId} v={r.declaresX402 === 1 ? 'yes, unverified' : 'no'} />)} />
                <Row label="Claims active" cells={rows.map((r) => <V key={r.listingId} v={r.declaresActive === 1 ? 'yes, unverified' : 'no'} />)} />
                <Row label="Identical registrations" cells={rows.map((r) => <V key={r.listingId} v={r.clusterSize > 1 ? `${r.clusterSize} share this record` : 'unique'} />)} />
                <Row label="Operator" cells={rows.map((r) => <V key={r.listingId} v={r.firstParty === 1 ? 'Muster, first party' : r.owner} mono={r.firstParty !== 1} />)} />
                <Row
                  label="Hire"
                  cells={rows.map((r) =>
                    r.evidenceTier === 'payable' || r.evidenceTier === 'settled' ? (
                      <Link key={r.listingId} href={`/agent/${r.agentId}`} className="text-brand">open and hire</Link>
                    ) : (
                      <span key={r.listingId} className="unknown">not payable, nothing to hire yet</span>
                    ),
                  )}
                />
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr className="border-b border-line-soft">
      <th scope="row" className="py-2.5 pr-3 text-left text-xs font-normal text-ink-faint">{label}</th>
      {cells.map((c, i) => (
        <td key={i} className="px-3 py-2.5 align-top text-ink">{c}</td>
      ))}
    </tr>
  )
}

function V({ v, fallback = 'unknown', mono }: { v: string | null | undefined; fallback?: string; mono?: boolean }) {
  if (!v) return <span className="unknown">{fallback}</span>
  return <span className={mono ? 'num break-all text-xs' : ''}>{v}</span>
}

function Price({ l }: { l: ListingCard }) {
  if (!l.priceBase || l.priceDecimals === null) return <span className="unknown">not quoted</span>
  const sym = Object.values(TOKENS).find((t) => t.address.toLowerCase() === l.priceToken?.toLowerCase())?.symbol ?? 'token'
  return <span className="num">{Number(BigInt(l.priceBase)) / 10 ** l.priceDecimals} {sym}</span>
}

function Ladder({ rung }: { rung: ListingCard['evidenceTier'] }) {
  const reached = EVIDENCE_ORDER.indexOf(rung)
  return (
    <span className="flex gap-1" title={`${reached + 1} of 6 rungs`}>
      {EVIDENCE_ORDER.map((r, i) => (
        <span key={r} aria-hidden className={`h-2 w-5 rounded-sm ${i <= reached ? 'bg-brand' : 'bg-line'}`} />
      ))}
      <span className="num ml-2 text-xs text-ink-dim">{reached + 1}/6</span>
    </span>
  )
}
