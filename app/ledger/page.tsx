import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'
import { ago } from '@/components/fresh'
import { syncFromHireAttempts, loadChain, verifyChain, ledgerSummary, GENESIS_PREV_HASH } from '@/lib/ledger'
import { amountWithSymbol } from '@/lib/money'
import { CHAIN } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'The money ledger',
  description: 'The append-only, hash-chained ledger of every hire attempt and settlement, with a walk that recomputes every link.',
}

/**
 * [doc 08] The ledger page. Every hire attempt and every settlement is one entry in an append-only
 * hash chain. This page runs the same walk() a reader can reproduce offline and shows the verdict,
 * so the integrity claim is checked on the page rather than asserted. Each entry links to its
 * receipt and the raw chain is at /api/ledger.
 */
export default function LedgerPage() {
  syncFromHireAttempts()
  const rows = loadChain()
  const summary = ledgerSummary()
  const walk = verifyChain(rows)

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl md:text-4xl">The money ledger</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Every hire attempt and every settlement is one entry in an append-only chain. Each entry
          carries the previous entry&apos;s hash, so a reader can recompute the whole chain and check
          that nothing was inserted, dropped or edited. The verdict below is the same{' '}
          <span className="num">walk</span> anyone can reproduce from the raw entries at{' '}
          <Link className="text-brand" href="/api/ledger">/api/ledger</Link>.
        </p>

        <section className={`mt-8 rounded-lg border p-4 ${walk.ok ? 'border-line bg-panel' : 'border-warn/60 bg-panel'}`}>
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">Chain integrity</h2>
          {walk.ok ? (
            <p className="num mt-2 text-lg text-ink">
              walk ok, {walk.checked} {walk.checked === 1 ? 'entry' : 'entries'} checked, 0 failures
            </p>
          ) : (
            <div className="mt-2">
              <p className="num text-lg text-warn">walk failed, {walk.failures.length} issue(s) across {walk.checked} entries</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-warn">
                {walk.failures.map((f, i) => (
                  <li key={i} className="num">seq {f.seq}, {f.check}: {f.issue}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Tile k="Entries" v={String(summary.entries)} note={`${summary.hireAttempts} attempts, ${summary.settlements} settlements`} />
          <Tile k="House" v={String(summary.house)} note="our own first-party listings" />
          <Tile k="Order" v={String(summary.order)} note="third-party revenue, counted alone" />
          <Tile k="Backfilled" v={String(summary.backfilled)} note="projected from attempts made before the ledger" />
        </section>

        <section className="mt-8 rounded-lg border border-line bg-panel p-4">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">Entries</h2>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-ink-dim">
              No hire attempt has been recorded yet, so the chain is empty. The first signed
              authorization writes entry 1 from the genesis hash of 64 zeros.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3 font-normal">Seq</th>
                    <th className="py-2 pr-3 font-normal">Kind</th>
                    <th className="py-2 pr-3 font-normal">Origin</th>
                    <th className="py-2 pr-3 font-normal">Payer</th>
                    <th className="py-2 pr-3 font-normal">Amount</th>
                    <th className="py-2 pr-3 font-normal">Entry hash</th>
                    <th className="py-2 pr-3 font-normal">When</th>
                    <th className="py-2 font-normal">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const p = JSON.parse(r.payload) as Record<string, unknown>
                    const attemptId = String(p['attemptId'] ?? '')
                    const payer = String(p['payer'] ?? '')
                    const base = String(p['amountBase'] ?? '')
                    const token = String(p['token'] ?? '')
                    return (
                      <tr key={r.seq} className="border-b border-line-soft last:border-0 align-top">
                        <td className="num py-2 pr-3 text-ink">{r.seq}</td>
                        <td className="py-2 pr-3 text-ink-soft">{r.kind}</td>
                        <td className="py-2 pr-3">
                          <span className={r.origin === 'order' ? 'num text-brand' : 'num text-ink-dim'}>{r.origin}</span>
                          {r.backfilled === 1 && <span className="ml-1 text-xs text-ink-faint">backfilled</span>}
                        </td>
                        <td className="num py-2 pr-3 text-ink-soft">{payer ? `${payer.slice(0, 10)}…` : 'unknown'}</td>
                        <td className="num py-2 pr-3 text-ink">{base && token ? amountWithSymbol(base, token) : 'unknown'}</td>
                        <td className="num py-2 pr-3 text-ink-faint">{r.entryHash.slice(0, 12)}…</td>
                        <td className="py-2 pr-3 text-ink-faint">{ago(Math.round((Date.now() - r.ts) / 1000))}</td>
                        <td className="py-2">
                          {attemptId ? (
                            <Link className="text-brand" href={`/receipt/${attemptId}`}>view</Link>
                          ) : (
                            <span className="unknown">unknown</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-lg border border-line bg-panel p-4">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">Recompute any entry offline</h2>
          <p className="mt-2 text-sm text-ink-dim">
            The canonical bytes are sorted-key compact JSON, so the standard library alone reproduces
            every hash. Genesis <span className="num">prevHash</span> is 64 zeros. Fetch an entry from{' '}
            <Link className="text-brand" href="/api/ledger">/api/ledger</Link>, then:
          </p>
          <pre className="num mt-2 overflow-x-auto rounded-md border border-line bg-canvas p-3 text-xs text-ink-soft">
{`import json, hashlib

def canon(o): return json.dumps(o, sort_keys=True, separators=(",", ":")).encode()

payload = {}   # the entry's "payload" object from /api/ledger
payload_hash = hashlib.sha256(canon(payload)).hexdigest()

head = {  # the entry's own fields, payloadHash and prevHash included
  "seq": 1, "ts": 0, "origin": "house", "kind": "hireAttempt",
  "refKey": "hireAttempt:<id>", "payloadHash": payload_hash, "prevHash": "${GENESIS_PREV_HASH.slice(0, 8)}...",
}
entry_hash = hashlib.sha256(canon(head)).hexdigest()
# payload_hash must equal the entry's payloadHash, entry_hash its entryHash,
# and prevHash must equal the previous entry's entryHash. chain id ${CHAIN.id}.`}
          </pre>
        </section>

        <p className="mt-8 text-sm">
          <Link className="text-brand" href="/status">Status</Link>
          <span className="mx-2 text-ink-faint">·</span>
          <Link className="text-brand" href="/api/ledger">Raw ledger JSON</Link>
        </p>
      </main>
      <Footer />
    </>
  )
}

function Tile({ k, v, note }: { k: string; v: string; note: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="text-xs text-ink-faint">{k}</div>
      <div className="num mt-1 text-2xl text-ink">{v}</div>
      <div className="mt-1 text-xs text-ink-faint">{note}</div>
    </div>
  )
}
