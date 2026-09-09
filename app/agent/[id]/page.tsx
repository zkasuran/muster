import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'
import { EvidenceBadge, EvidenceLadder, RungBar } from '@/components/evidence'
import { ago, num } from '@/components/fresh'
import { agentDetail, probeHistory, firstPartyOnShelf, feedbackFor } from '@/lib/queries'
import { parseAgentCard } from '@/lib/agentcard'
import { SHELF_TITLES } from '@/lib/classify'
import { REGISTRY, TOKENS } from '@/lib/constants'
import { FIRST_PARTY } from '@/lib/agents'
import { conformanceReport } from '@/lib/conformance'
import { agentByShelf } from '@/lib/altana'
import { EVIDENCE_ORDER, type EvidenceRung } from '@/lib/types'

export const dynamic = 'force-dynamic'

const PUBLIC_ORIGIN = process.env.MUSTER_ORIGIN_URL ?? 'https://muster.zkasuran.dev'
const RESERVED_BASE = 900_000_000

/** What a row below payable still has to show before it can be hired. Derived from the rung. */
const MISSING: Record<EvidenceRung, string> = {
  registered: 'Its record names no endpoint, so there is nothing to probe and nothing to hire.',
  declared: 'It names an endpoint that nobody has reached yet. The next probe cycle will try it.',
  reachable: 'Its host answers over TLS, and it has not yet answered a probe in a way that matches what it declared.',
  probed: 'It answers, and it has not returned an HTTP 402 with payment requirements, so there is no price to pay.',
  payable: '',
  settled: '',
}

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^(0|[1-9][0-9]*)$/.test(id)) notFound()
  const a = agentDetail(id)
  if (!a) notFound()
  const probes = probeHistory(a.listingId, 8)
  const ours = a.firstParty === 1
  // What its endpoint actually returned, from the most recent probe that kept a body.
  const withBody = probes.find((p) => p.bodyExcerpt && p.bodyExcerpt.trim() !== '')
  const card = withBody ? parseAgentCard(withBody.bodyExcerpt!) : null
  const feedback = ours ? null : feedbackFor(a.agentId)
  const reserved = Number(a.agentId) >= RESERVED_BASE
  const spec = ours ? FIRST_PARTY.find((f) => f.slug === a.category) ?? null : null
  // [doc 04] Run our own conformance bar against this agent, in process, so the page shows we pass
  // the routes docs/04-AGENT-PROTOCOL.md requires of any listing. payTo is resolved the same way the
  // card route resolves it, so the checked 402 matches the one the agent would serve.
  const conformancePayTo =
    process.env.MUSTER_PAYTO ?? agentByShelf(a.category)?.wallet ?? '0x0000000000000000000000000000000000000000'
  const conformance = ours ? conformanceReport(a.category, { origin: PUBLIC_ORIGIN, payTo: conformancePayTo }) : null
  const sibling = ours ? null : firstPartyOnShelf(a.category)
  const hireable = a.evidenceTier === 'payable' || a.evidenceTier === 'settled'
  const latest = probes[0] ?? null
  const paidProbe = probes.find((p) => p.sawPaymentRequired === 1) ?? null
  const offChainOnly = paidProbe?.note?.includes('bsc=no') ?? false
  const priceSym =
    Object.values(TOKENS).find((t) => t.address.toLowerCase() === a.priceToken?.toLowerCase())?.symbol ?? null
  const priceHuman =
    a.priceBase && a.priceDecimals !== null ? `${Number(BigInt(a.priceBase)) / 10 ** a.priceDecimals} ${priceSym ?? ''}`.trim() : null

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
              {reserved ? `reserved id ${a.agentId}, not a registry id` : `agent id ${a.agentId} on BNB Smart Chain`}
              {ours && <span className="ml-2 rounded-sm border border-warn/50 px-1.5 text-warn">operated by us</span>}
            </p>
          </div>
          <div className="mt-2 flex flex-col items-end gap-2">
            <EvidenceBadge rung={a.evidenceTier} />
            <RungBar rung={a.evidenceTier} size="md" />
          </div>
        </div>

        {a.description ? (
          <p className="mt-4 max-w-3xl text-ink-dim">{a.description}</p>
        ) : (
          <p className="mt-4 unknown">Its registration record carries no description.</p>
        )}

        {ours && (
          <section className="mt-6 rounded-lg border border-warn/40 bg-panel p-4">
            <h2 className="text-sm uppercase tracking-wide text-warn">This one is ours, and here is why it exists</h2>
            <p className="mt-2 max-w-3xl text-sm text-ink-dim">
              We measured the whole registry against B402 Bazaar, Binance&apos;s index of endpoints where a
              payment has provably cleared. The intersection of identity and proven revenue on BNB Smart
              Chain is one agent, its registration record is empty, and it sells image generation. So no
              agent on the chain was both provably payable and in this category. Rather than ship a shelf
              nobody can hire from, we run one reference agent per shelf under three conditions: it does
              real work from live chain reads, it is payable on the same public 402 path as any other
              listing, and it is labelled ours on every row. Its id is reserved and is not an ERC-8004
              registry id. The reasoning and the rejected alternatives are in the repository at
              <span className="num"> docs/decisions/18-the-intersection-is-one-agent.md</span>.
            </p>
          </section>
        )}

        {ours && conformance && (
          <section className="mt-6 rounded-lg border border-line bg-panel p-4">
            <h2 className="text-sm uppercase tracking-wide text-ink-faint">Our own conformance bar</h2>
            <p className="mt-2 max-w-3xl text-sm text-ink-dim">
              The agent protocol sets the routes a listing must serve. We run that check against our own
              agents, so this is the bar we hold others to, held to ourselves. The verdicts are recomputed
              on every page load from the documents this agent serves, and pinned in a test at
              <span className="num"> lib/conformance.test.ts</span>.
            </p>
            <p className="mt-3 text-sm">
              <span className={conformance.passed === conformance.total ? 'text-up' : 'text-down'}>
                Passes {conformance.passed} of {conformance.total} required routes
              </span>
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {conformance.results.map((r) => (
                <li
                  key={r.route.path}
                  className="flex flex-wrap items-baseline gap-x-3 border-b border-line-soft pb-1 last:border-0"
                >
                  <span className={r.present ? 'text-up' : 'text-down'}>{r.present ? 'present' : 'absent'}</span>
                  <span className="num text-ink">
                    {r.route.method} {r.route.path}
                  </span>
                  {r.route.priced && <span className="text-xs text-brand">priced</span>}
                  <span className="text-ink-dim">{r.reason}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-xs">
              <div className="text-ink-faint">The documents it serves, open them</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {[
                  ['card', '/card'],
                  ['registration', '/registration'],
                  ['manifest', '/manifest'],
                  ['health', '/health'],
                  ['schema', '/schema'],
                ].map(([label, p]) => (
                  <a
                    key={p}
                    className="num text-brand"
                    href={`${PUBLIC_ORIGIN}/api/agent/${a.category}${p}`}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {label}
                  </a>
                ))}
                <a
                  className="num text-brand"
                  href={`${PUBLIC_ORIGIN}/.well-known/agent-registration.json`}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  .well-known
                </a>
              </div>
            </div>
          </section>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <section className="md:col-span-2 space-y-6">
            <Card title="Hire">
              {hireable && ours && spec ? (
                <>
                  <Link
                    href={`/hire/${a.category}`}
                    className="inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-canvas"
                  >
                    Hire it: see a sample, then sign for {priceHuman ?? 'the price'}
                  </Link>
                  <p className="mt-3 text-sm text-ink-dim">
                    Send a GET to the endpoint. Without payment it answers HTTP 402 with the requirements
                    below. Sign them once as EIP-712 typed data in USD1, resend with the signature in the
                    <span className="num"> x-payment</span> header, and the result comes back with the
                    settlement transaction. No BNB is needed. The capability contract is free at
                    <span className="num"> ?preview=1</span>.
                  </p>
                  <div className="mt-3 rounded-md border border-line bg-canvas p-3">
                    <div className="text-xs text-ink-faint">Endpoint</div>
                    <a className="num break-all text-sm text-brand" href={`${PUBLIC_ORIGIN}/api/agent/${a.category}?preview=1`}>
                      {PUBLIC_ORIGIN}/api/agent/{a.category}
                    </a>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-3">
                    <Kv k="Price" v={priceHuman} />
                    <Kv k="Scheme" v={a.priceScheme} />
                    <Kv k="Network" v="eip155:56" />
                    <Kv k="Asset" v={a.priceToken} mono />
                    <Kv k="Amount, atomic" v={a.priceBase} mono />
                    <Kv k="Pay to" v={a.payTo} mono />
                  </dl>
                  <div className="mt-4">
                    <div className="text-xs text-ink-faint">Inputs</div>
                    <ul className="mt-1 space-y-1 text-sm">
                      {spec.inputs.map((i) => (
                        <li key={i.name} className="flex flex-wrap gap-x-3">
                          <span className="num text-ink">{i.name}{i.required ? '*' : ''}</span>
                          <span className="text-ink-dim">{i.description}</span>
                          <span className="num text-ink-faint">e.g. {i.example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-ink-faint">What comes back</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-dim">
                      {spec.outputs.map((o) => <li key={o}>{o}</li>)}
                    </ul>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-ink-faint">What it reads on chain</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-dim">
                      {spec.reads.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  </div>
                  <p className="mt-4 text-xs text-ink-faint">
                    Settlement through Binance B402 needs a merchant developer account that is granted on
                    request. This deployment issues the real 402 and verifies the buyer&apos;s signature
                    locally. The on-chain settle is the step pending that account, which is why this row
                    is payable and not settled.
                  </p>
                </>
              ) : hireable ? (
                <>
                  <p className="text-sm text-ink-dim">
                    It returned an HTTP 402 with payment requirements when probed, so it is payable.
                  </p>
                  {paidProbe && (
                    <div className="mt-3 rounded-md border border-line bg-canvas p-3">
                      <div className="text-xs text-ink-faint">The URL that answered 402</div>
                      <span className="num break-all text-sm text-ink-soft">{paidProbe.url}</span>
                      {paidProbe.note && <div className="num mt-1 text-xs text-ink-faint">{paidProbe.note}</div>}
                    </div>
                  )}
                  {offChainOnly ? (
                    <p className="mt-3 text-sm text-warn">
                      None of its payment options is on BNB Smart Chain, so it cannot be hired in USD1 from
                      here. Its identity is on BSC. Its rail is elsewhere.
                    </p>
                  ) : a.inBazaar === 1 ? (
                    <p className="mt-3 text-sm text-ink-dim">A payment to its payout address has cleared on chain, which is the settled rung.</p>
                  ) : (
                    <p className="mt-3 text-sm text-ink-dim">Pay it directly at that URL with an x402 client. Muster does not broker third-party payments in this release.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-dim">
                  <span className="text-ink">Not hireable yet.</span> {MISSING[a.evidenceTier]}
                </p>
              )}
              {sibling && (
                <p className="mt-4 text-sm">
                  <Link href={`/compare?ids=${a.agentId},${sibling.agentId}`} className="text-brand">
                    Compare with {sibling.name ?? 'our reference agent'} on this shelf
                  </Link>
                </p>
              )}
            </Card>

            {card && (
              <Card title="What its endpoint actually returned">
                <p className="mb-3 text-xs text-ink-faint">
                  Read by the probe from <span className="num break-all">{withBody?.url}</span>, {withBody ? ago(Math.round((Date.now() - withBody.observedAt) / 1000)) : ''}.
                  This is the agent describing itself over the wire, which is one rung more than a registration record.
                </p>
                <Field label="Shape" value={card.kind === 'a2a' ? 'A2A agent card' : card.kind === 'x402' ? 'x402 payment challenge' : card.kind === 'oasf' ? 'OASF record' : card.kind === 'json' ? 'JSON' : card.kind === 'html' ? 'web page for a browser' : 'text'} />
                {card.kind !== 'html' && (
                  <>
                    <Field label="Name it gives itself" value={card.name} fallback="none in the response" />
                    <Field label="Version" value={card.version} fallback="none" />
                    <Field label="Endpoint it names" value={card.url} mono fallback="none" />
                  </>
                )}
                {card.capabilities.length > 0 && <Field label="Capabilities" value={card.capabilities.join(', ')} />}
                {card.description && <p className="mt-2 text-sm text-ink-dim">{card.description}</p>}
                {card.skills.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-ink-faint">Skills it advertises, {card.skills.length}</div>
                    <ul className="mt-1 space-y-1 text-sm">
                      {card.skills.slice(0, 12).map((s) => (
                        <li key={s.id}><span className="text-ink">{s.name}</span>{s.description && <span className="text-ink-dim"> · {s.description.slice(0, 120)}</span>}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {card.accepts.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-ink-faint">Payment options in its 402, {card.accepts.length}</div>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {card.accepts.slice(0, 8).map((x, i) => (
                        <li key={i} className={`num ${x.network === 'eip155:56' ? 'text-ink' : 'text-ink-faint'}`}>{x.scheme} · {x.network || 'network unknown'} · {x.asset.slice(0, 12)}… · {x.amount}{x.network === 'eip155:56' ? '' : '  (not BSC)'}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {card.kind === 'html' && (
                  <p className="mt-2 text-sm text-ink-dim">
                    The endpoint answered with a web page rather than a machine-readable card. A browser can
                    read it, an agent cannot, so this row earns no capability from it. Page title:{' '}
                    <span className="text-ink">{card.name ?? 'none set'}</span>.
                  </p>
                )}
                {card.kind === 'text' && <pre className="num mt-2 max-h-40 overflow-auto rounded-md border border-line bg-canvas p-2 text-xs text-ink-faint">{card.excerpt}</pre>}
              </Card>
            )}

            <Card title="What it declared, and what that is worth">
              <p className="mb-3 text-xs text-ink-faint">
                Everything in this block is the operator&apos;s own claim, stored separately from anything we
                checked. Across the live population 14,211 agents declare x402 support and 3 answered a
                402 when asked, so a claim here carries no weight on its own.
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
                    {a.endpoints.map((e) => <li key={e} className="num break-all text-sm text-ink-soft">{e}</li>)}
                  </ul>
                )}
              </div>
            </Card>

            <Card title="Probe history">
              {probes.length === 0 ? (
                <p className="unknown text-sm">
                  {ours
                    ? 'Our own endpoints are not probed by our own cycle. Their 402 is verifiable at the endpoint above.'
                    : 'Never probed. Until it is, nothing above the declared rung can be claimed.'}
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {probes.map((p) => (
                    <li key={p.probeId} className="border-b border-line-soft pb-2 last:border-0">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span className={p.verdict === 'pass' ? 'text-up' : p.verdict === 'fail' ? 'text-down' : 'text-ink-dim'}>{p.verdict}</span>
                        <span className="text-ink-soft">{p.assertion}</span>
                        {p.httpStatus !== null && <span className="num text-ink-dim">HTTP {p.httpStatus}</span>}
                        {p.sawPaymentRequired === 1 && <span className="text-brand">402 with requirements</span>}
                        {p.failureClass && <span className="text-down">{p.failureClass}</span>}
                        {p.latencyMs !== null && <span className="num text-ink-faint">{p.latencyMs} ms</span>}
                        <span className="ml-auto text-xs text-ink-faint">{ago(Math.round((Date.now() - p.observedAt) / 1000))}</span>
                      </div>
                      <div className="num mt-0.5 break-all text-xs text-ink-faint">{p.url}</div>
                      {p.note && <div className="num mt-0.5 text-xs text-ink-faint">{p.note}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <aside className="space-y-6">
            <Card title="Evidence ladder">
              <EvidenceLadder rung={a.evidenceTier} />
              {latest && (
                <p className="mt-3 text-xs text-ink-faint">
                  Rung {EVIDENCE_ORDER.indexOf(a.evidenceTier) + 1} of 6, last checked {ago(Math.round((Date.now() - latest.observedAt) / 1000))}.
                </p>
              )}
            </Card>
            <Card title={reserved ? 'Operator' : 'On chain'}>
              {reserved ? (
                <>
                  <Field label="Operator" value="Muster, first party" />
                  <Field label="Payout address" value={a.payTo ?? a.agentWallet} mono fallback="unset" />
                  <Field label="Registry id" value={null} fallback="none, this id is reserved" />
                  <p className="mt-3 text-xs text-ink-faint">
                    A reserved id sits above 900,000,000 and cannot collide with the registry, whose highest
                    minted id is a few hundred thousand.
                  </p>
                </>
              ) : (
                <>
                  <Field label="Owner" value={a.owner} mono />
                  <Field label="Payout wallet" value={a.agentWallet} mono fallback="unset" />
                  <Field label="Distinct from owner" value={a.agentWallet && a.agentWallet.toLowerCase() !== a.owner.toLowerCase() ? 'yes' : 'no, it is the holder'} />
                  <Field label="First seen at block" value={a.firstSeenBlock ? num(a.firstSeenBlock) : null} />
                  <Field label="Identical registrations" value={a.clusterSize > 1 ? `${a.clusterSize} agents share this record` : 'unique'} />
                  <Field
                    label="On-chain feedback"
                    value={feedback ? `${feedback.count} from ${feedback.clients} address${feedback.clients === 1 ? '' : 'es'}` : a.feedbackCount > 0 ? `${a.feedbackCount}` : null}
                    fallback="none on the Reputation Registry"
                  />
                  <div className="mt-3 space-y-1 text-xs">
                    <a className="block text-brand" href={`https://bscscan.com/token/${REGISTRY.identity}?a=${a.agentId}`} rel="noreferrer noopener" target="_blank">View on BscScan</a>
                  </div>
                </>
              )}
              <div className="mt-3 space-y-1 text-xs">
                <Link className="block text-brand" href={`/shelf/${a.category}`}>Back to {SHELF_TITLES[a.category]}</Link>
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
      {value ? <span className={mono ? 'num break-all text-sm text-ink' : 'text-sm text-ink'}>{value}</span> : <span className="unknown text-sm">{fallback}</span>}
    </div>
  )
}

function Kv({ k, v, mono }: { k: string; v: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{k}</dt>
      <dd className={v ? (mono ? 'num break-all text-ink' : 'text-ink') : 'unknown'}>{v ?? 'unknown'}</dd>
    </div>
  )
}
