import { Nav, Footer } from '@/components/nav'
import { ago } from '@/components/fresh'
import {
  ALTANA_AGENTS,
  sessionScope,
  readLiveSession,
  accountExplorerUrl,
  keyExplorerUrl,
  DEFAULT_READ_CHAIN,
  ALTANA_NET,
  type LiveSession,
} from '@/lib/altana'
import { SHELF_TITLES } from '@/lib/classify'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Altana sessions' }

const CHAIN = DEFAULT_READ_CHAIN // 97, testnet, the free path this build lands its transaction on

function statusOf(live: LiveSession): { label: string; cls: string } {
  if (live.error) return { label: 'chain read failed, shown as unknown', cls: 'text-warn' }
  if (!live.registered) return { label: 'built, not yet registered onchain', cls: 'text-ink-dim' }
  if (live.valid) return { label: 'live on chain', cls: 'text-up' }
  return { label: 'registered, now revoked or expired', cls: 'text-down' }
}

export default async function AltanaPage() {
  const net = ALTANA_NET[CHAIN]
  const sessions = await Promise.all(
    ALTANA_AGENTS.map((a) => readLiveSession(CHAIN, a.wallet, a.keyId, a.keyHash)),
  )
  const netName = CHAIN === 56 ? 'BSC mainnet' : 'BSC testnet'

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl md:text-4xl">Altana sessions</h1>
        <p className="mt-2 max-w-3xl text-ink-dim">
          Each of our four reference agents holds its own self-custodial Altana wallet. A session key
          on that wallet is scoped to a short allowlist of calls, a daily spend cap and an expiry, so
          the agent can act on chain without holding the keys to everything. The scope lives on the
          wallet, so a stranger can read it. Everything below the planned scope is read live from{' '}
          {netName}, contract by contract, not from a config file. Where a value is not on chain yet
          it says unknown, never a zero.
        </p>

        <section className="mt-6 rounded-lg border border-warn/40 bg-panel p-4">
          <h2 className="text-sm uppercase tracking-wide text-warn">What is registered on chain, and what is a handoff</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink-dim">
            The Venus Health Factor Watch session is <span className="text-up">registered on chain</span>,
            on {netName} (chain {CHAIN}), in transaction{' '}
            <a className="num break-all text-brand" href={`${ALTANA_NET[CHAIN].explorer}/tx/0x52ae99613484277415fc72eb797d9745d7c119e2695ff56374612c5b8ee3b407`} target="_blank" rel="noreferrer noopener">0x52ae9961…5b8ee3b407</a>.
            Its status below is read live from chain: <span className="num">getKeys</span> returns its
            keyId, <span className="num">isValidKey</span> reads true, and the account&apos;s allowlist
            and daily cap are the four calls and 100 USDT you can read with free{' '}
            <span className="num">eth_call</span>s. The wallet addresses and both key identifiers for all
            four agents are real, derived from keys we hold. The other three sessions are built and
            funded-ready; each is one <span className="num">tools/altana-grant.ts</span> command away
            once its wallet holds gas, and this page shows each the moment its grant lands, with no code
            change. Mainnet (chain 56) is the same one command and is never run automatically. The
            method is in the repository at <span className="num">docs/16-ALTANA.md</span>.
          </p>
        </section>

        <section className="mt-6 rounded-lg border border-line bg-panel p-4">
          <h2 className="mb-2 text-sm uppercase tracking-wide text-ink-faint">The four wallet addresses</h2>
          <p className="mb-3 text-xs text-ink-faint">
            One wallet per agent, never one shared. Include these in the submission. Same address on
            chain 56 and chain 97.
          </p>
          <ul className="space-y-1">
            {ALTANA_AGENTS.map((a) => (
              <li key={a.agentId} className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line-soft py-1.5 last:border-0">
                <span className="text-sm text-ink-soft">{a.name}</span>
                <a className="num break-all text-sm text-brand" href={accountExplorerUrl(CHAIN, a.wallet)} target="_blank" rel="noreferrer noopener">
                  {a.wallet}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 space-y-6">
          {ALTANA_AGENTS.map((a, i) => {
            const live = sessions[i]!
            const scope = sessionScope(a.shelf)
            const st = statusOf(live)
            return (
              <section key={a.agentId} className="rounded-lg border border-line bg-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl">
                      {a.name}
                      <span className="ml-2 rounded-sm border border-warn/50 px-1.5 align-middle text-xs text-warn">operated by us</span>
                    </h2>
                    <p className="num mt-1 text-xs text-ink-faint">
                      {SHELF_TITLES[a.shelf]} shelf, reserved id {a.agentId}, not a registry id
                    </p>
                  </div>
                  <span className={`text-sm ${st.cls}`}>{st.label}</span>
                </div>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-ink-faint">The wallet and its keys</h3>
                    <Field label="Altana wallet" value={a.wallet} link={accountExplorerUrl(CHAIN, a.wallet)} />
                    <Field label="Keystore keyId" value={a.keyId} link={keyExplorerUrl(CHAIN, a.keyId)} />
                    <Field label="Account keyHash" value={a.keyHash} />
                    <Field label="Session EOA" value={a.sessionEoa} />
                    <p className="mt-2 text-xs text-ink-faint">
                      The Keystore takes the keyId, which is keccak256 of the session public key. The
                      account takes the keyHash, a different value for the same key. Both are shown so
                      the derivation reconciles.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-ink-faint">Read live from {netName}, {ago(Math.round((Date.now() - live.readAt) / 1000))}</h3>
                    <Field label="Registered in Keystore" value={live.error ? null : live.registered ? 'yes' : 'no, not yet'} />
                    <Field label="isValidKey" value={live.valid === null ? null : live.valid ? 'true, live' : 'false'} />
                    <Field
                      label="Expiry"
                      value={live.expiry === null ? null : new Date(live.expiry * 1000).toISOString().replace('.000Z', 'Z')}
                    />
                    <Field
                      label="Allowlist on chain"
                      value={
                        live.allowlist === null
                          ? null
                          : live.allowlist.length === 0
                            ? 'none set'
                            : `${live.allowlist.length} entries`
                      }
                      hint={live.allowlist === null ? 'unreadable until the account is delegated at first grant' : undefined}
                    />
                    <Field
                      label="Spend cap on chain"
                      value={
                        live.spend === null
                          ? null
                          : live.spend.length === 0
                            ? 'none set'
                            : live.spend.map((s) => `${s.limit} @ token ${s.token.slice(0, 10)}…`).join(', ')
                      }
                      hint={live.spend === null ? 'unreadable until the account is delegated at first grant' : undefined}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-xs uppercase tracking-wide text-ink-faint">Planned scope, written to chain at grant</h3>
                  <p className="mt-1 mb-2 text-sm text-ink-dim">{scope.summary}</p>
                  <div className="text-xs text-ink-faint">Calls this session may make</div>
                  <ul className="mt-1 space-y-1 text-sm">
                    {scope.calls.map((c) => (
                      <li key={c.signature} className="flex flex-wrap gap-x-3">
                        <span className="num text-ink">{c.signature}</span>
                        <span className="num text-ink-faint">on {c.to}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 text-xs text-ink-faint">Daily spend cap</div>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {scope.spend.map((s) => (
                      <li key={s.token} className="num text-ink-soft">
                        {(Number(s.limit) / 1e18).toString()} USDT per {s.period}, token {s.token}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 border-t border-line-soft pt-4">
                  <form method="post" action="/api/altana/revoke" className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="agentId" value={a.agentId} />
                    <input type="hidden" name="chainId" value={CHAIN} />
                    <button
                      type="submit"
                      className="rounded-md border border-down/60 px-3 py-1.5 text-sm text-down hover:border-down hover:bg-down/10"
                    >
                      Revoke this session
                    </button>
                    <span className="text-xs text-ink-faint">
                      Reads the chain, then revokes if the session is live. It says so when there is
                      nothing to revoke yet, which is the case until the grant lands.
                    </span>
                  </form>
                </div>
              </section>
            )
          })}
        </div>

        <section className="mt-8 rounded-lg border border-line bg-panel p-4">
          <h2 className="mb-2 text-sm uppercase tracking-wide text-ink-faint">Verify it without us</h2>
          <p className="text-sm text-ink-dim">
            Every value above is a free call anyone can repeat. The Keystore on chain {CHAIN} is{' '}
            <span className="num break-all">{net.keystore}</span>. Read{' '}
            <span className="num">getKeys(wallet)</span>, <span className="num">isValidKey(wallet, keyId)</span> and{' '}
            <span className="num">getExpiry(wallet, keyId)</span> on it. Read{' '}
            <span className="num">canExecutePackedInfos(keyHash)</span> plus{' '}
            <span className="num">spendInfos(keyHash)</span> on the wallet once it is delegated. The
            Altana explorer at <span className="num">{net.explorer}</span> shows the same, as an indexed
            view rather than the authority.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}

function Field({ label, value, link, hint }: { label: string; value: string | null; link?: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line-soft py-1.5 last:border-0">
      <span className="text-xs text-ink-faint">{label}</span>
      {value ? (
        link ? (
          <a className="num break-all text-sm text-brand" href={link} target="_blank" rel="noreferrer noopener">{value}</a>
        ) : (
          <span className="num break-all text-sm text-ink">{value}</span>
        )
      ) : (
        <span className="unknown text-sm" title={hint}>unknown</span>
      )}
    </div>
  )
}
