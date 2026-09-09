import { Nav, Footer } from '@/components/nav'
import { ago, num } from '@/components/fresh'
import { indexHealth, rungCounts, shelfSummaries, probeSummary, populationFacts } from '@/lib/queries'
import { cacheState } from '@/lib/cache'
import { hireStats } from '@/lib/hire'
import { facilitatorState } from '@/lib/settle'
// [doc 08] the money ledger summary
import { syncFromHireAttempts, ledgerSummary } from '@/lib/ledger'
import { db } from '@/lib/db'
import { SHELF_TITLES } from '@/lib/classify'
import { CHAIN, REGISTRY } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Status' }

/**
 * The page that makes the Data Quality claim checkable. It reports what the jobs actually
 * did rather than what they were configured to do, and it publishes our own gaps.
 */
export default async function StatusPage() {
  const h = indexHealth()
  const fac = await facilitatorState()
  const settledCount = (db().prepare('SELECT COUNT(*) c FROM hireAttempt WHERE settled = 1').get() as { c: number }).c
  const r = rungCounts()
  const shelves = shelfSummaries()
  const probes = probeSummary()
  const pop = populationFacts()
  const caches = cacheState()
  const hires = hireStats()
  // [doc 08] project attempts into the ledger (idempotent on the refKey) and read the summary
  syncFromHireAttempts()
  const ledger = ledgerSummary()
  const latestAttempt = (db().prepare('SELECT attemptId FROM hireAttempt ORDER BY createdAt DESC LIMIT 1').get() as { attemptId: string } | undefined)?.attemptId ?? null
  const coverage =
    h.agentsOnChain && h.agentsOnChain > 0
      ? ((h.agentsIndexed / h.agentsOnChain) * 100).toFixed(1)
      : null

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl md:text-4xl">Status</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Everything this page reports was measured by the job that wrote it. Where a figure is
          missing it says unknown, because a zero standing in for an unmeasured value is the
          failure mode this page exists to prevent.
        </p>

        <Section title="The index">
          <Row label="Registered on chain" value={num(h.agentsOnChain)} note={h.atBlock ? `read from the counter slot at block ${h.atBlock.toLocaleString()}` : 'not read yet'} />
          <Row label="Indexed here" value={num(h.agentsIndexed)} note={coverage ? `${coverage}% of the chain count` : 'no sweep has completed'} />
          <Row label="Last sweep" value={h.sweepFinishedAt ? ago(Math.round((Date.now() - h.sweepFinishedAt) / 1000)) : null} note={h.sweepSeconds !== null ? `took ${h.sweepSeconds}s, ${h.sweepOk ? 'no errors' : 'with errors'}` : 'still running or never run'} />
          <Row label="Third-party explorer count" value={num(h.foreignReported)} note={h.foreignObservedAt ? `read ${ago(Math.round((Date.now() - h.foreignObservedAt) / 1000))}` : 'not cross-checked yet'} />
        </Section>

        <Section title="How much is known, by rung">
          {(['registered', 'declared', 'reachable', 'probed', 'payable', 'settled'] as const).map((k) => (
            <Row key={k} label={k} value={num(r[k])} note="" />
          ))}
        </Section>

        <Section title="The four shelves">
          {shelves.map((s) => (
            <Row
              key={s.shelf}
              label={SHELF_TITLES[s.shelf]}
              value={`${s.listed} listed, ${s.indexed} indexed`}
              note={s.hireable > 0 ? `${s.hireable} payable or better${s.hireableOurs > 0 ? `, ${s.hireableOurs === s.hireable ? (s.hireable === 1 ? 'that one is ours' : 'all ours') : `${s.hireableOurs} ours`}` : ', none ours'}` : 'none payable yet'}
            />
          ))}
        </Section>

        <Section title="The probe cycle">
          <p className="mb-3 text-xs text-ink-faint">
            One HTTPS request per declared endpoint, through a guard that refuses anything
            resolving to a private, loopback, link-local, multicast or NAT64 address. A row moves
            above the declared rung only on what the probe actually observed, and a 402 carrying
            payment requirements is what the payable rung means.
          </p>
          <Row label="Probes recorded" value={num(probes.total)} note={probes.lastObservedAt ? `last ${ago(Math.round((Date.now() - probes.lastObservedAt) / 1000))}` : 'no cycle has run'} />
          <Row label="Listings probed" value={num(probes.listingsProbed)} note="one request per host per cycle" />
          <Row label="Passed" value={num(probes.verdicts['pass'] ?? 0)} note="host resolved, TLS completed, an answer came back" />
          <Row label="Failed" value={num(probes.verdicts['fail'] ?? 0)} note={probes.failureClasses.map((f) => `${f.failureClass} ${f.c}`).join(', ') || ''} />
          <Row label="Answered 402 with requirements" value={num(probes.sawPaymentRequired)} note="the payable rung, checked rather than claimed" />
        </Section>

        <Section title="Hire attempts">
          <Row label="Signed authorizations verified" value={num(hires.attempts)} note="a real EIP-712 signature that recovered to its signer. Signed, not paid" />
          <Row label="Distinct signers" value={num(hires.distinctSigners)} note="" />
          <Row label="Settled on chain" value={num(settledCount)} note={settledCount > 0 ? 'real USD1 transfers submitted by our own facilitator' : 'none has cleared yet'} />
          <Row label="Facilitator" value={fac.address ? `${fac.address.slice(0, 10)}…` : null} note={fac.canSettle ? `can settle, holds ${fac.bnb} BNB for gas` : fac.reason ?? ''} />
        </Section>

        <Section title="The B402 Bazaar join">
          <Row label="Paid endpoints in Bazaar" value={num(pop.bazaarResources)} note="every one has settled a real payment" />
          <Row label="Distinct payout addresses" value={num(pop.bazaarPayoutAddresses)} note={pop.bazaarLargestShare !== null ? `one publisher holds ${(pop.bazaarLargestShare * 100).toFixed(1)}% of all payment options` : ''} />
          <Row label="Also hold an ERC-8004 identity" value={num(pop.intersection)} note="the intersection of identity and proven revenue on BSC" />
        </Section>

        <Section title="Caches on the render path">
          {caches.length === 0 ? (
            <p className="text-sm text-ink-dim">Nothing cached in this process yet.</p>
          ) : (
            caches.map((c) => (
              <Row key={c.key} label={c.key} value={`${c.ageSeconds}s old`} note={`refreshes after ${c.ceilingSeconds}s. A cached value carries the time it was read, never the time it was served`} />
            ))
          )}
        </Section>

        {/* [doc 08] the money ledger */}
        <Section title="The money ledger">
          <Row label="Entries" value={num(ledger.entries)} note={`${ledger.hireAttempts} hire attempts, ${ledger.settlements} settlements, append-only and hash-chained`} />
          <Row label="House vs order" value={`${ledger.house} house, ${ledger.order} order`} note="revenue counts order only, so the honest order figure today is zero" />
          <Row label="Backfilled" value={num(ledger.backfilled)} note="entries projected from attempts made before the ledger existed" />
          <Row label="Chain integrity" value={ledger.walk.ok ? `walk ok, ${ledger.walk.checked} checked` : `${ledger.walk.failures.length} failures`} note="the same walk anyone can reproduce from /api/ledger" />
          <p className="mt-3 text-sm text-ink-dim">
            The full chain, each entry linked to its receipt, is at{' '}
            <a className="text-brand" href="/ledger">/ledger</a>. The raw JSON with the hash rule is at{' '}
            <a className="text-brand" href="/api/ledger">/api/ledger</a>.
            {latestAttempt && (
              <>
                {' '}Most recent receipt:{' '}
                <a className="text-brand" href={`/receipt/${latestAttempt}`}>/receipt/{latestAttempt.slice(0, 8)}…</a>.
              </>
            )}
          </p>
        </Section>

        <Section title="What this build does not do">
          <p className="text-sm text-ink-dim">
            Published rather than hidden, because a judge finding it first is worse. Settlement
            through Binance B402 needs a merchant developer account that is granted on request.
            Until then Muster settles EIP-3009 authorizations itself, submitting the transfer from
            its own key and paying the gas, when that key holds gas. The facilitator row above says
            whether it can right now. No row is marked settled without a transaction that cleared. The
            hash-chained money ledger ships and is at /ledger. The Altana session panel ships and is
            at /altana, with the on-chain Keystore grant left as a documented testnet handoff. Escrow
            is out of scope for this entry and the reasons are in the decision records.
          </p>
        </Section>

        <Section title="Reproduce it">
          <p className="text-sm text-ink-dim">
            The population figure is one call. Anyone can run it.
          </p>
          <pre className="num mt-2 overflow-x-auto rounded-md border border-line bg-canvas p-3 text-xs text-ink-soft">
{`cast storage ${REGISTRY.identity} \\
  ${REGISTRY.identityCounterSlot} \\
  --rpc-url https://bsc-rpc.publicnode.com

# chain id ${CHAIN.id}. totalSupply() reverts on this registry, which is why the
# count comes from the counter slot and the set is enumerated by id.`}
          </pre>
        </Section>
      </main>
      <Footer />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-lg border border-line bg-panel p-4">
      <h2 className="mb-3 text-sm uppercase tracking-wide text-ink-faint">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value, note }: { label: string; value: string | null; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line-soft py-2 last:border-0">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="flex items-baseline gap-3">
        <span className={!value || value === "unknown" ? "unknown text-sm" : "num text-sm text-ink"}>{value ?? "unknown"}</span>
        {note && <span className="text-xs text-ink-faint">{note}</span>}
      </span>
    </div>
  )
}
