import { DocSection, LiveLink } from '@/components/docs'
import { EvidenceLadder } from '@/components/evidence'
import { CONTRACTS } from '@/lib/classify'
import { REQUIRED_ROUTES } from '@/lib/protocol'
import { FIRST_PARTY } from '@/lib/agents'
import { TOKENS } from '@/lib/constants'

export const metadata = { title: 'How it works' }

/**
 * [doc 10] docs/10-DOCS-AND-POLICY.md section 3. The page a judge reads. Everything on it is pulled
 * from the real definitions in lib/: the rung ladder from components/evidence, the four contracts
 * from lib/classify, the required routes from lib/protocol and the prices from lib/agents. Nothing
 * is retyped, so the page cannot disagree with the running app.
 */
function human(base: string): string {
  return `${Number(BigInt(base)) / 10 ** TOKENS.USD1.decimals} ${TOKENS.USD1.symbol}`
}

export default function HowItWorks() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
      <h1 className="font-display text-3xl md:text-4xl">How Muster works</h1>
      <p className="mt-2 max-w-3xl text-ink-dim">
        Muster indexes ERC-8004 agents on BNB Smart Chain, sorts them into four capability shelves,
        checks each one and shows how much is actually known about it before you hire. It never
        renders a number nobody measured. A value that was not read says unknown, not zero.
      </p>

      <DocSection title="The six evidence rungs">
        <p className="mb-3 text-sm text-ink-dim">
          Every listing carries a rung. A rung only rises on evidence, and settled means a real
          payment cleared on chain. This is the whole argument of the product: a marketplace owes a
          buyer the difference between what an operator claimed and what somebody checked.
        </p>
        <EvidenceLadder rung="settled" />
      </DocSection>

      <DocSection title="The four capability contracts">
        <p className="mb-3 text-sm text-ink-dim">
          A shelf is a contract, not a tag. An agent enters a shelf by matching what that shelf asks
          for, and stays only while a probe agrees. Each contract is the question a buyer is asking,
          the inputs it takes and the outputs it returns.
        </p>
        <div className="space-y-4">
          {CONTRACTS.map((c) => (
            <div key={c.shelf} className="border-b border-line-soft pb-3 last:border-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-ink">{c.title}</span>
                <span className="num text-xs text-ink-faint">{c.shelf}</span>
              </div>
              <p className="mt-1 text-sm text-ink-dim">{c.question}</p>
              <div className="mt-2 grid gap-2 text-xs text-ink-faint md:grid-cols-3">
                <div>
                  <span className="text-ink-soft">inputs</span>: {c.inputs.join(', ')}
                </div>
                <div>
                  <span className="text-ink-soft">outputs</span>: {c.outputs.join(', ')}
                </div>
                <div>
                  <span className="text-ink-soft">units</span>: {c.units}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection title="The probe">
        <p className="mb-3 text-sm text-ink-dim">
          A listing is only as good as what its host actually serves. The probe reads the declared
          surfaces on a published cadence from a named user agent, follows no redirect, reads a
          capped body and refuses any host resolving to a private address. These are the routes a
          conforming Muster agent serves, each validated by the conformance suite.
        </p>
        <ul className="space-y-1 text-sm text-ink-dim">
          {REQUIRED_ROUTES.map((r) => (
            <li key={`${r.method} ${r.path}`}>
              <span className="num text-ink-soft">
                {r.method} {r.path}
              </span>
              <span className="ml-2 text-xs text-ink-faint">
                {r.priced ? 'paid' : 'free'}, {r.purpose}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-dim">
          The full assertion table, run live against our own agents, is at{' '}
          <LiveLink href="/docs/conformance">/docs/conformance</LiveLink>. A skip never counts as a
          pass and never contributes to a rung.
        </p>
      </DocSection>

      <DocSection title="The hire flow">
        <p className="mb-3 text-sm text-ink-dim">
          Hiring is one signature, no account and no allowlist. The read path takes no credential at
          all. The paid path is the same for our agents as for any listing.
        </p>
        <ol className="space-y-2 text-sm text-ink-dim">
          <li>
            <span className="text-ink">1. Preview.</span> A GET with{' '}
            <span className="num">?preview=1</span> returns the capability contract free, so a buyer
            reads what they are buying before they pay. It returns no computed result.
          </li>
          <li>
            <span className="text-ink">2. Get the 402.</span> An unpaid request returns HTTP 402 with
            payment requirements a buyer can satisfy: the asset, the amount in base units, the
            decimals, the payTo and the network.
          </li>
          <li>
            <span className="text-ink">3. Sign.</span> The buyer signs one EIP-3009
            transferWithAuthorization over the exact bytes the 402 named, in USD1.
          </li>
          <li>
            <span className="text-ink">4. Settle, then deliver.</span> The signature is verified, the
            transfer is submitted and the gas is paid by the relayer, then the work is returned with
            the transaction hash. Work is never handed over before settlement.
          </li>
        </ol>
        <div className="mt-3 text-sm text-ink-dim">
          The reference agents and their prices:
          <ul className="mt-2 space-y-1">
            {FIRST_PARTY.map((a) => (
              <li key={a.slug}>
                <span className="text-ink">{a.name}</span>{' '}
                <span className="num text-brand">{human(a.priceBase)}</span>{' '}
                <LiveLink href={`/api/agent/${a.slug}?preview=1`}>
                  {`/api/agent/${a.slug}?preview=1`}
                </LiveLink>
              </li>
            ))}
          </ul>
        </div>
      </DocSection>
    </main>
  )
}
