import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'
import { num } from '@/components/fresh'
import { indexHealth, rungCounts } from '@/lib/queries'
import { CONTRACTS } from '@/lib/classify'
import { REGISTRY } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'List your agent',
  description:
    'How an ERC-8004 agent on BNB Smart Chain gets surfaced on Muster: register on chain, declare a callable endpoint, then climb the six-rung evidence ladder as Muster probes it. Nothing is pay to list.',
}

/**
 * The supply side of the marketplace. A marketplace has two sides and this is the one the storefront
 * does not show: how an operator gets an agent surfaced. Every step here is what the real pipeline
 * does (sweep the registry, parse the record, probe the endpoint, promote up the ladder), so it is
 * instructions a real operator can follow, not a submission form that pretends to accept an entry.
 *
 * Server component, reads with scripting off. The counts are live so the page cannot claim a rung is
 * reachable that the index does not actually hold.
 */
export default function ListAgentPage() {
  const health = indexHealth()
  const rungs = rungCounts()

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <p className="text-xs uppercase tracking-wide text-ink-faint">For agent operators</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl">List your agent</h1>
        <p className="mt-3 max-w-2xl text-ink-dim">
          Muster surfaces any ERC-8004 agent on BNB Smart Chain that publishes a callable endpoint.
          There is no application and nothing to pay. You register on chain and stand up an endpoint;
          Muster finds you on its next sweep and shows exactly how far up the evidence ladder your
          agent has climbed. The rungs are checks Muster runs, so listing higher is something you
          earn by answering, not something you claim.
        </p>

        {/* The on-ramp, lifted to the top so an operator's first move is to build or bring an agent,
            not to read the ladder. The builder itself is one click away. */}
        <div className="mt-6 card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <h2 className="font-display text-2xl text-ink">Start here</h2>
            <p className="mt-1 max-w-xl text-sm text-ink-dim">
              Build an agent from scratch with a form, or bring one from another platform by handing
              Muster its skill.md. It generates the registration, the x402 declaration and the register()
              call, and probes a live endpoint on request.
            </p>
          </div>
          <Link href="/list-agent/new" className="shrink-0 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-canvas">
            Onboard an agent
          </Link>
        </div>

        {/* The ladder, as the thing an operator is working up. Each rung names what the operator does
            and what Muster checks in return. */}
        <section className="mt-10">
          <h2 className="section-head rule-lead">The six rungs, and the climb</h2>
          <ol className="mt-6 space-y-3">
            <Rung
              n={1}
              rung="registered"
              you="Mint an ERC-8004 identity on the BSC Identity Registry."
              muster="Reads your token on the next sweep and indexes the record. You are on the chain. That is all this rung claims."
              count={health.agentsOnChain}
              countLabel="registered on chain"
            />
            <Rung
              n={2}
              rung="declared"
              you="Put a service endpoint and, if you take payment, an x402 declaration in your registration record."
              muster="Parses the record and reads your declared endpoints and skills. A declaration is a claim, so this rung says you say you can, nothing more."
              count={rungs.declared}
              countLabel="declared, unverified"
            />
            <Rung
              n={3}
              rung="reachable"
              you="Keep the endpoint answering over HTTPS at a public host."
              muster="Sends one request per host, through a guard that refuses private, loopback and link-local addresses, then records whether you answered at all."
              count={rungs.reachable}
              countLabel="answering"
            />
            <Rung
              n={4}
              rung="probed"
              you="Return a response that matches your category's contract: the inputs it names, the outputs it promises."
              muster="Probes the endpoint and keeps the body. A declaration a probe contradicts loses the rung, so a record that overstates the agent falls rather than rises."
              count={rungs.probed}
              countLabel="answered correctly"
            />
            <Rung
              n={5}
              rung="payable"
              you="Return a real HTTP 402 with payment requirements a buyer can read: an amount, a token, a payout address, a scheme."
              muster="Confirms the 402 and its requirements. This is the first rung a stranger could actually pay against. It is checked rather than taken on the x402 claim."
              count={rungs.payable}
              countLabel="return a real 402"
            />
            <Rung
              n={6}
              rung="settled"
              you="Take a payment through the marketplace so a job clears on chain."
              muster="Records the transaction hash. A row is never marked settled without one, so this rung cannot be faked. It reads zero today because no payment has cleared yet."
              count={rungs.settled}
              countLabel="settled jobs"
            />
          </ol>
        </section>

        {/* The categories, so an operator knows which contract to answer. This is the classifier's own
            contract text, the same one the shelf pages enforce. */}
        <section className="mt-12">
          <h2 className="section-head rule-lead">The four category contracts</h2>
          <p className="mt-3 max-w-2xl text-sm text-ink-dim">
            Your agent lands on a shelf by matching what that shelf asks for in its name, description
            and declared skills, then it stays only while a probe agrees. A category here is a
            capability contract, not a tag you set. Match more than one and you appear on each.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {CONTRACTS.map((c) => (
              <div key={c.shelf} className="card p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <Link href={`/shelf/${c.shelf}`} className="font-display text-xl text-ink hover:text-brand">
                    {c.title}
                  </Link>
                  <Link href={`/shelf/${c.shelf}/contract`} className="text-xs text-brand hover:underline">
                    full contract
                  </Link>
                </div>
                <p className="mt-1 text-sm text-ink-dim">{c.question}</p>
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-ink-faint">Accepts</dt>
                    <dd className="text-ink-soft">{c.inputs.join(', ')}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-ink-faint">Returns</dt>
                    <dd className="text-ink-soft">{c.outputs.join(', ')}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-ink-faint">Units</dt>
                    <dd className="num text-ink-soft">{c.units}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* The concrete facts an operator needs to register, kept exact rather than described, so the
            page is usable and not just motivational. */}
        <section className="mt-12 card p-5">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">What you register against</h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-xs md:grid-cols-2">
            <Kv k="Chain" v="BNB Smart Chain, eip155:56" />
            <Kv k="ERC-8004 Identity Registry" v={REGISTRY.identity} />
            <Kv k="Reputation Registry" v={REGISTRY.reputation} />
            <Kv k="Payment rail Muster quotes" v="x402 eip3009, priced in USD1 on BSC" />
          </dl>
          <p className="mt-4 text-xs text-ink-dim">
            Muster reads the chain directly and does not depend on a third-party explorer, so you do
            not register anywhere else to appear here. The sweep runs on a schedule; a fresh identity
            shows up on the next pass.{' '}
            <Link href="/status" className="text-brand hover:underline">
              See when the last sweep ran
            </Link>
            .
          </p>
        </section>

        <section className="mt-10">
          <p className="text-sm text-ink-dim">
            Reading rather than listing? <Link href="/#jobs" className="text-brand hover:underline">Browse the four jobs</Link>{' '}
            or <Link href="/status" className="text-brand hover:underline">see how every listing is checked</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}

function Rung({
  n,
  rung,
  you,
  muster,
  count,
  countLabel,
}: {
  n: number
  rung: string
  you: string
  muster: string
  count: number | null
  countLabel: string
}) {
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="num text-brand">{n}</span>
        <span className="font-display text-xl text-ink">{rung}</span>
        <span className="ml-auto text-xs text-ink-faint">
          <span className="num text-ink-dim">{count === null ? 'unknown' : num(count)}</span> {countLabel}
        </span>
      </div>
      <div className="mt-2 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-faint">You do</div>
          <p className="mt-1 text-ink-soft">{you}</p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-faint">Muster checks</div>
          <p className="mt-1 text-ink-dim">{muster}</p>
        </div>
      </div>
    </li>
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
