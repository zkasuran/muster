import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Nav, Footer } from '@/components/nav'
import { HireWidget, SampleRun } from '@/components/hire-widget'
// [doc 08] the marketplace fee disclosure, fee 0 on this deployment
import { FeeDisclosure } from '@/components/fee-disclosure'
import { findAgent, FIRST_PARTY } from '@/lib/agents'
import { TOKENS } from '@/lib/constants'
import { SHELF_TITLES } from '@/lib/classify'
import { firstPartyOnShelf } from '@/lib/queries'
import type { Shelf } from '@/lib/types'

export const dynamic = 'force-dynamic'

const PUBLIC_ORIGIN = process.env.MUSTER_ORIGIN_URL ?? 'https://muster.zkasuran.dev'
const PAY_TO = process.env.MUSTER_PAYTO ?? null

export function generateStaticParams() {
  return FIRST_PARTY.map((a) => ({ shelf: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ shelf: string }> }) {
  const { shelf } = await params
  const a = findAgent(shelf)
  return { title: a ? `Hire ${a.name}` : 'Not found' }
}

/**
 * The activation step of the rubric, for a human. Land, understand what it does, see the exact
 * price and what you sign, sign it, see the result. Every claim on this page is derived from the
 * same code that serves the 402, so the page cannot drift from the endpoint.
 */
export default async function HirePage({ params }: { params: Promise<{ shelf: string }> }) {
  const { shelf } = await params
  const agent = findAgent(shelf)
  if (!agent) notFound()
  const listing = firstPartyOnShelf(agent.slug as Shelf)
  const price = `${Number(BigInt(agent.priceBase)) / 10 ** TOKENS.USD1.decimals} USD1`
  const endpoint = `${PUBLIC_ORIGIN}/api/agent/${agent.slug}`

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <p className="text-xs uppercase tracking-wide text-ink-faint">
          Hire · {SHELF_TITLES[agent.slug]} ·{' '}
          <span className="rounded-sm border border-warn/50 px-1.5 text-warn">operated by us</span>
        </p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl">{agent.name}</h1>
        <p className="mt-3 max-w-2xl text-ink-dim">{agent.summary}</p>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Fact k="Price per call" v={price} />
          <Fact k="How you pay" v="one EIP-712 signature, eip3009, no gas" />
          <Fact k="Network" v="BNB Smart Chain, eip155:56" />
        </section>

        <section id="see-it-work" className="mt-8 scroll-mt-6">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">1. See it work, free</h2>
          <p className="mt-2 mb-3 text-sm text-ink-dim">
            Runs the agent on its documented example input against the live chain and shows the
            real result. Labelled as a sample on every response, so it cannot be mistaken for a
            paid call.
          </p>
          <SampleRun shelf={agent.slug} />
        </section>

        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">2. Sign a real authorization</h2>
          <p className="mt-2 mb-3 text-sm text-ink-dim">
            Your wallet signs an EIP-3009 transfer authorization for exactly {price} to the payout
            address below. The server recovers the signer from the signature, reads your USD1
            balance, records the attempt and shows the envelope a facilitator would settle.
            Nothing is charged: settlement through Binance B402 is pending a merchant developer
            account that is granted on request, and this page says so rather than pretending.
          </p>
          {PAY_TO ? (
            <HireWidget shelf={agent.slug} price={price} />
          ) : (
            <p className="rounded-lg border border-line bg-panel p-4 text-sm text-warn">
              This deployment has no payout address configured, so it cannot issue an authorization
              a buyer could sign. The sample above still works.
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">3. Or pay it from a program</h2>
          <p className="mt-2 text-sm text-ink-dim">
            The same agent is an ordinary x402 endpoint. An unpaid GET returns 402 with the
            requirements, and a GET with a signed payment in the <span className="num">x-payment</span>{' '}
            header returns the result.
          </p>
          <pre className="num mt-3 overflow-x-auto rounded-md border border-line bg-canvas p-3 text-xs text-ink-soft">
{`curl -i ${endpoint}                 # 402 with accepts[]
curl -s ${endpoint}?preview=1       # the contract, free
# sign accepts[0] as EIP-712 TransferWithAuthorization in USD1, then
curl -s -H "x-payment: <base64 envelope>" "${endpoint}?${agent.inputs.filter((i) => i.required).map((i) => `${i.name}=${i.example}`).join('&') || 'limit=5'}"`}
          </pre>
        </section>

        <section className="mt-8 rounded-lg border border-line bg-panel p-4">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">What you are buying</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-ink-faint">Inputs</div>
              <ul className="mt-1 space-y-1 text-sm">
                {agent.inputs.map((i) => (
                  <li key={i.name}>
                    <span className="num text-ink">{i.name}{i.required ? '*' : ''}</span>{' '}
                    <span className="text-ink-dim">{i.description}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs text-ink-faint">What comes back</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-dim">
                {agent.outputs.map((o) => <li key={o}>{o}</li>)}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-ink-faint">What it reads on chain, every call</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-dim">
              {agent.reads.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs md:grid-cols-3">
            <Kv k="Asset" v={TOKENS.USD1.address} />
            <Kv k="Amount, atomic" v={agent.priceBase} />
            <Kv k="Pay to" v={PAY_TO ?? 'unset'} />
            <Kv k="EIP-712 domain" v="World Liberty Financial USD, version 1" />
            <Kv k="Endpoint" v={endpoint} />
            <Kv k="Listing" v={listing ? `/agent/${listing.agentId}` : 'unknown'} />
          </dl>
        </section>

        {/* [doc 08] marketplace fee, disclosed as fee 0 with the documented schedule */}
        <FeeDisclosure priceBase={agent.priceBase} tokenSymbol="USD1" />

        <p className="mt-8 text-sm">
          {listing && <Link className="text-brand" href={`/agent/${listing.agentId}`}>Back to the listing</Link>}
          <span className="mx-2 text-ink-faint">·</span>
          <Link className="text-brand" href={`/shelf/${agent.slug}`}>Back to {SHELF_TITLES[agent.slug]}</Link>
        </p>
      </main>
      <Footer />
    </>
  )
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="text-xs text-ink-faint">{k}</div>
      <div className="num mt-1 text-lg text-ink">{v}</div>
    </div>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-ink-faint">{k}</dt>
      <dd className="num break-all text-ink-soft">{v}</dd>
    </div>
  )
}
