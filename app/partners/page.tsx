import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Partners',
  description:
    'Four partner tracks off one build: TermiX, Altana, PancakeSwap and AltLayer 8004scan. Each row says what Muster does, links the proof and names what is a documented handoff rather than a shipped integration.',
}

/**
 * The partner tracks, stated so a judge can click every claim. docs/13-PARTNERS.md is the design.
 * This page is the honest read of it against what shipped: per partner, what Muster does, the
 * live surface that proves it, plus what is a documented handoff rather than a built integration.
 *
 * The rule the whole page holds to: never claim a partner integration that is not there. Where a
 * step needs money, a private key or a merchant account this build does not run, the row says so
 * in plain words and points at the surface that will show it the moment it lands.
 *
 * Server component, reads with scripting off. Every proof is a plain link a stranger can follow.
 */
export default function PartnersPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl md:text-4xl">Partners</h1>
        <p className="mt-2 max-w-3xl text-ink-dim">
          Four partner tracks come off one build rather than four bolt-ons. Each row below says
          what Muster does for that track, links the surface that proves it and names what is a
          documented handoff rather than a shipped integration. A step this build does not run,
          because it needs money, a private key or a merchant account, is written as a handoff
          rather than dressed up as done.
        </p>

        {/* A scannable index of the four tracks, so a judge sees the shape before the prose. Each
            card jumps to the honest write-up below and links the one surface that proves it. */}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            { id: 'termix', name: 'TermiX', one: 'The marketplace itself, plus the Agent Advantage Report their eligibility gate requires.', proof: '/report', proofLabel: 'the report' },
            { id: 'pancakeswap', name: 'PancakeSwap', one: 'A rebalancing agent that reads a live PancakeSwap v3 pool and reports range and drift at one block.', proof: '/hire/rebalancing', proofLabel: 'hire it' },
            { id: 'altana', name: 'Altana', one: 'Each reference agent holds a self-custodial wallet with a scoped session read straight off the chain.', proof: '/altana', proofLabel: 'the session panel' },
            { id: 'altlayer', name: 'AltLayer and 8004scan', one: '8004scan used as a cross-check with its own lag on screen, never as the source a render depends on.', proof: '/status', proofLabel: 'the data page' },
          ].map((t) => (
            <a key={t.id} href={`#${t.id}`} className="card block p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-xl text-ink">{t.name}</span>
                <Link href={t.proof} className="text-xs text-brand hover:underline">{t.proofLabel}</Link>
              </div>
              <p className="mt-1 text-sm text-ink-dim">{t.one}</p>
            </a>
          ))}
        </div>

        <Partner
          id="termix"
          name="TermiX"
          track="Agent marketplace track, $6,000 / $3,000 / $1,000, judged independently of the main track"
        >
          <Does>
            TermiX does not ask for an integration. The submission is the marketplace itself, and
            they hire from it to see what comes back. So the work is the four shelves, the compare
            view and a hire a stranger can finish, plus the Agent Advantage Report their eligibility
            gate requires: three real tasks, each run once by hiring the agent through Muster and
            once by hand against the same chain, with time, cost and the full outputs attached.
          </Does>
          <Built>
            <Proof href="/report">The Agent Advantage Report</Proof> with three paired tasks, one of
            them trading. It meets the gate that at least one task come from trading, stock or
            security.
            <Proof href="/">The four category shelves</Proof> and{' '}
            <Proof href="/compare">the compare view</Proof>, so a buyer can find and compare without
            instructions.
            <Proof href="/hire/yield">A one-signature hire</Proof>, no identity NFT, no allowance
            and no BNB from the buyer.
          </Built>
          <Handoff>
            Settlement over Binance B402 needs a merchant developer account granted on request, so
            the agent arm in the report is the identical code the paid endpoint runs, not a cleared
            payment. The site reads zero settled jobs and says so rather than implying money moved.
            No independent grader or first-time visitor was available before the close, so the
            report measures output quality as agreement between the two arms rather than a blind
            rating. The four agents the report hires are our own reference agents, labelled ours.
          </Handoff>
        </Partner>

        <Partner
          id="pancakeswap"
          name="PancakeSwap"
          track="1,000 CAKE, no published rubric"
        >
          <Does>
            Muster runs a rebalancing reference agent, the PancakeSwap LP Range Check, that reads a
            live PancakeSwap v3 pool at one pinned block and reports whether a position is still in
            range, how far the price sits from each bound and whether to hold, widen or recentre.
            Every field comes from one block, because reading the price from one call and the range
            from another describes a state that never existed.
          </Does>
          <Built>
            <Proof href="/shelf/rebalancing">The rebalancing shelf</Proof>, served by the LP Range
            Check agent. It takes a pool and two ticks and returns the pool state and a
            recommendation with the block it read.
            <Proof href="/hire/rebalancing">The hire path for it</Proof>, with the price and token
            shown before any signature.
          </Built>
          <Handoff>
            The impermanent-loss correction computed from the value function, plus the pass that
            reconciles principal and fees against a simulated decreaseLiquidity and collect, are
            designed in docs/13-PARTNERS.md and measured in the research, but they are not wired
            into this build. The shipped agent reports range status and drift, not an IL table. The
            correction is documented as next rather than shown as done.
          </Handoff>
        </Partner>

        <Partner
          id="altana"
          name="Altana"
          track="50,000 XP, winner takes all, read on chain rather than from the pitch"
        >
          <Does>
            Each of the four reference agents holds its own self-custodial Altana wallet. A session
            key on that wallet is scoped to a short allowlist of calls, a daily spend cap and an
            expiry, so the agent can act on chain without holding the keys to everything. The scope
            lives on the wallet, so a stranger reads it rather than trusting the pitch.
          </Does>
          <Built>
            <Proof href="/altana">The session panel</Proof>: the four wallet addresses, the planned
            scope per agent, plus the live chain reads of registration, validity, expiry, allowlist
            and spend cap, with a Revoke button wired to the chain. Every value is a free call the
            panel names so anyone can repeat it.
          </Built>
          <Handoff>
            The on-chain grant that registers each session key in the Keystore is the one step this
            build does not run, because it needs testnet BNB from a faucet and a signing key that
            stays off this web server. So each session reads as built, not yet registered onchain,
            and the panel reads the chain, so the moment a grant lands it shows with no code change.
            The exact grant command is in docs/16-ALTANA.md.
          </Handoff>
        </Partner>

        <Partner
          id="altlayer"
          name="AltLayer, 8004scan and AltLLM"
          track="8004scan Pro tier plus AltLLM credits, amounts to be confirmed"
        >
          <Does>
            The chain is the index of record here, not a third-party explorer, because the 8004scan
            BSC indexer under-reports the population and its read path flapped between 200, 404 and
            500 during the research window. So 8004scan is used as a cross-check with its own lag on
            screen, never as the source a page render depends on.
          </Does>
          <Built>
            <Proof href="/status">The status page</Proof> carries a third-party explorer count row,
            read separately from our own chain count, so the two populations are told apart rather
            than blended.
          </Built>
          <Handoff>
            No 8004scan checkpoint has been fetched into this build, so that row reads unknown rather
            than a zero, which is the honest state until a cross-check runs. AltLLM is not wired:
            Muster runs no language model in the render path, which is the whole prompt-injection
            defence, so a model has no honest home on a buyer-facing surface here. Both are stated as
            not done rather than implied.
          </Handoff>
        </Partner>

        <section className="mt-10 rounded-lg border border-line bg-panel px-5 py-4">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">Our own agents, labelled ours</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink-dim">
            The four reference agents that make these tracks demonstrable are ours. They exist
            because the payable population in the four categories is empty: of the ERC-8004
            identities on BSC and the proven-payable endpoints in the B402 Bazaar, the intersection
            is one agent that sells image generation. Our four are labelled ours everywhere they
            render, they get no ranking advantage, every count that includes them says so. The{' '}
            <Link className="text-brand" href="/coverage">coverage page</Link> shows the third-party
            and first-party split of every shelf, so a full-looking shelf is never confused with one
            full of our own agents.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}

function Partner({ id, name, track, children }: { id: string; name: string; track: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-6 rounded-lg border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-2xl text-ink">{name}</h2>
        <span className="text-xs text-ink-faint">{track}</span>
      </div>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  )
}

function Does({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-ink-faint">What Muster does</h3>
      <p className="mt-1 max-w-3xl text-sm text-ink-dim">{children}</p>
    </div>
  )
}

function Built({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-up">Built, with where to check it</h3>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-dim">{children}</p>
    </div>
  )
}

function Handoff({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-warn">Documented handoff, not a shipped integration</h3>
      <p className="mt-1 max-w-3xl text-sm text-ink-dim">{children}</p>
    </div>
  )
}

function Proof({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <>
      {' '}
      <Link className="text-brand hover:underline" href={href}>
        {children}
      </Link>
    </>
  )
}
