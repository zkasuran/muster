import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'
import { EvidenceBadge, EvidenceLadder } from '@/components/evidence'
import { ago, num } from '@/components/fresh'
import { agentDetail, probeHistory } from '@/lib/queries'
import { SHELF_TITLES } from '@/lib/classify'
import { REGISTRY, TOKENS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^(0|[1-9][0-9]*)$/.test(id)) notFound()
  const a = agentDetail(id)
  if (!a) notFound()
  const probes = probeHistory(a.listingId, 8)
  const priceSym =
    Object.values(TOKENS).find((t) => t.address.toLowerCase() === a.priceToken?.toLowerCase())
      ?.symbol ?? null

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl">
              {a.name ?? <span className="unknown">unnamed agent</span>}
            </h1>
            <p className="num mt-1 text-sm text-ink-faint">
              agent id {a.agentId} on BNB Smart Chain
              {a.firstParty === 1 && (
                <span className="ml-2 rounded-sm border border-warn/50 px-1.5 text-warn">
                  operated by us
                </span>
              )}
            </p>
          </div>
          <EvidenceBadge rung={a.evidenceTier} className="mt-2" />
        </div>

        {a.description ? (
          <p className="mt-4 max-w-3xl text-ink-dim">{a.description}</p>
        ) : (
          <p className="mt-4 unknown">Its registration record carries no description.</p>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <section className="md:col-span-2 space-y-6">
            <Card title="What a buyer can act on">
              <Field label="Price" value={a.priceBase && a.priceDecimals !== null ? `${Number(BigInt(a.priceBase)) / 10 ** a.priceDecimals} ${priceSym ?? ''}` : null} fallback="not quoted" />
              <Field label="Payment rail" value={a.priceScheme} fallback="none declared" />
              <Field label="Paid to" value={a.payTo ?? null} fallback="no payout address published" mono />
              <Field label="In B402 Bazaar" value={a.inBazaar === 1 ? 'yes, a payment has settled' : null} fallback="not listed there" />
              <Field label="Shelves" value={a.categories.length ? a.categories.map((c) => SHELF_TITLES[c]).join(', ') : null} fallback="matches no shelf contract" />
            </Card>

            <Card title="What it declared, and what that is worth">
              <p className="mb-3 text-xs text-ink-faint">
                Everything in this block is the operator&apos;s own claim, stored separately from
                anything we checked. Across the live population almost every agent declares x402
                support, and our own sample found none payable by a stranger, so a claim here
                carries no weight on its own.
              </p>
              <Field label="Claims x402 support" value={a.declaresX402 === 1 ? 'yes, unverified' : 'no'} />
              <Field label="Claims to be active" value={a.declaresActive === 1 ? 'yes, unverified' : 'no'} />
              <Field label="Trust models" value={a.trustModels.length ? a.trustModels.join(', ') : null} fallback="none declared" />
              <Field label="Service kinds" value={a.serviceKinds.length ? a.serviceKinds.join(', ') : null} fallback="none declared" />
              <Field label="Skills" value={a.skills.length ? `${a.skills.length} declared` : null} fallback="none declared" />
              <div className="mt-3">
                <div className="text-xs text-ink-faint">Endpoints</div>
                {a.endpoints.length === 0 ? (
                  <div className="unknown text-sm">none in its registration record</div>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {a.endpoints.map((e) => (
                      <li key={e} className="num break-all text-sm text-ink-soft">
                        {e}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            <Card title="Probe history">
              {probes.length === 0 ? (
                <p className="unknown text-sm">
                  Never probed. Until it is, nothing above the declared rung can be claimed.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {probes.map((p) => (
                    <li key={p.probeId} className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className={p.verdict === 'pass' ? 'text-up' : p.verdict === 'fail' ? 'text-down' : 'text-ink-dim'}>
                        {p.verdict}
                      </span>
                      <span className="text-ink-soft">{p.assertion}</span>
                      {p.httpStatus !== null && <span className="num text-ink-dim">HTTP {p.httpStatus}</span>}
                      {p.sawPaymentRequired === 1 && <span className="text-brand">402 with requirements</span>}
                      {p.failureClass && <span className="text-down">{p.failureClass}</span>}
                      <span className="ml-auto text-xs text-ink-faint">
                        {ago(Math.round((Date.now() - p.observedAt) / 1000))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <aside className="space-y-6">
            <Card title="Evidence ladder">
              <EvidenceLadder rung={a.evidenceTier} />
            </Card>
            <Card title="On chain">
              <Field label="Owner" value={a.owner} mono />
              <Field label="Payout wallet" value={a.agentWallet} mono fallback="unset" />
              <Field
                label="Distinct from owner"
                value={a.agentWallet && a.agentWallet.toLowerCase() !== a.owner.toLowerCase() ? 'yes' : 'no, it is the holder'}
              />
              <Field label="First seen at block" value={a.firstSeenBlock ? num(a.firstSeenBlock) : null} />
              <Field label="Identical registrations" value={a.clusterSize > 1 ? `${a.clusterSize} agents share this record` : 'unique'} />
              <div className="mt-3 space-y-1 text-xs">
                <a className="block text-brand" href={`https://bscscan.com/token/${REGISTRY.identity}?a=${a.agentId}`} rel="noreferrer noopener" target="_blank">
                  View on BscScan
                </a>
                <Link className="block text-brand" href={`/shelf/${a.category}`}>
                  Back to {SHELF_TITLES[a.category]}
                </Link>
              </div>
            </Card>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <h2 className="mb-3 text-sm uppercase tracking-wide text-ink-faint">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, value, fallback = 'unknown', mono }: { label: string; value: string | null | undefined; fallback?: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line-soft py-1.5 last:border-0">
      <span className="text-xs text-ink-faint">{label}</span>
      {value ? (
        <span className={mono ? 'num break-all text-sm text-ink' : 'text-sm text-ink'}>{value}</span>
      ) : (
        <span className="unknown text-sm">{fallback}</span>
      )}
    </div>
  )
}
