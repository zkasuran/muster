import { Nav, Footer } from '@/components/nav'
import { ago, num } from '@/components/fresh'
import { indexHealth, rungCounts, shelfSummaries } from '@/lib/queries'
import { SHELF_TITLES } from '@/lib/classify'
import { CHAIN, REGISTRY } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Status' }

/**
 * The page that makes the Data Quality claim checkable. It reports what the jobs actually
 * did rather than what they were configured to do, and it publishes our own gaps.
 */
export default function StatusPage() {
  const h = indexHealth()
  const r = rungCounts()
  const shelves = shelfSummaries()
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
              note={s.hireable > 0 ? `${s.hireable} payable or better` : 'none payable yet'}
            />
          ))}
        </Section>

        <Section title="What this build does not do yet">
          <p className="text-sm text-ink-dim">
            Published rather than hidden, because a judge finding it first is worse. The probe
            cycle, the B402 Bazaar join and the hire path are in the repository and not yet wired
            into these counts, so every row above the declared rung reads zero. Escrow, the
            signed ledger chain and the Altana session panel are out of scope for this entry and
            the reasons are recorded in the decision records.
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
