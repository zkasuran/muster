import { Nav, Footer } from '@/components/nav'
import { ago, num } from '@/components/fresh'
import { endpointCapability, tokenFacts, proxyFingerprints } from '@/lib/stack'
import { CHAIN } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Stack',
  description: 'The BNB Chain facts Muster rests on, read live and checked against the pinned values.',
}

/**
 * [doc 11] The page that shows the chain facts were verified, not assumed. It reads three things
 * live on every render: which public RPC endpoints answer chain 56 and serve getLogs at the sweep
 * width, the decimals() and DOMAIN_SEPARATOR() of every configured payment token, and the EIP-1967
 * implementation behind each proxy. A read that fails says unknown. A value that differs from the
 * pinned one is flagged, because that is how an upgrade or a token change becomes visible.
 */
export default async function StackPage() {
  const [endpoints, tokens, proxies] = await Promise.all([
    endpointCapability(),
    tokenFacts(),
    proxyFingerprints(),
  ])

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl md:text-4xl">The BNB Chain stack, verified</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Muster reads chain {CHAIN.id} directly. This page proves the reads work rather than
          asserting they do. Every row is read live on this render and checked against the value
          pinned at build time. A read that fails says unknown, and a value that has moved off its
          pin is flagged, because a silent token or registry change is the failure this page exists
          to catch.
        </p>

        <Section
          title="RPC endpoints, checked live"
          note="Each endpoint is asked for its chain id, its head block and a getLogs request at the width the id sweep actually uses. An endpoint that answers a block number but refuses the sweep is worse than one that is plainly down, because it looks healthy."
        >
          {endpoints.map((e) => (
            <div key={e.url} className="border-b border-line-soft py-3 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="num text-sm text-ink-soft">{e.url}</span>
                <Pill
                  ok={e.ok && e.logsAtMaxSpan}
                  warn={e.ok && !e.logsAtMaxSpan}
                  okText="answers chain 56, serves the sweep"
                  warnText="answers chain 56, refuses the sweep"
                  failText="did not answer"
                />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-faint">
                <span>chain id {e.chainId === null ? <Unknown /> : <span className="num text-ink-dim">{e.chainId}</span>}</span>
                <span>head block {e.blockNumber === null ? <Unknown /> : <span className="num text-ink-dim">{e.blockNumber.toLocaleString()}</span>}</span>
                <span>getLogs at 5,000 blocks {e.logsAtMaxSpan ? <span className="text-up">served</span> : <span className="text-down">refused</span>}</span>
                <span>latency {e.latencyMs === null ? <Unknown /> : <span className="num text-ink-dim">{e.latencyMs}ms</span>}</span>
              </div>
              {e.error && <p className="mt-1 num text-xs text-warn">{e.error}</p>}
            </div>
          ))}
        </Section>

        <Section
          title="Payment tokens, read on chain"
          note={
            tokens.block
              ? `decimals() and DOMAIN_SEPARATOR() read at block ${tokens.block.toLocaleString()}, ${ago(Math.round((Date.now() - tokens.readAt) / 1000))}. lib/constants.ts treats the on-chain decimals() as the source of truth, because a stablecoin carried from a 6-decimal chain is wrong here by a factor of a trillion.`
              : 'no endpoint answered, so every value below is unknown'
          }
        >
          {tokens.tokens.map((t) => (
            <div key={t.key} className="border-b border-line-soft py-3 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-sm text-ink">{t.symbol}</span>
                <span className="num text-xs text-ink-faint">{t.address}</span>
              </div>
              <div className="mt-2 grid gap-1 text-xs md:grid-cols-2">
                <Fact
                  label="decimals()"
                  value={t.decimalsOnChain === null ? null : String(t.decimalsOnChain)}
                  match={t.decimalsMatch}
                  matchText={`matches the pinned ${t.decimalsPinned}`}
                  missText={`differs from the pinned ${t.decimalsPinned}`}
                />
                <Fact
                  label="DOMAIN_SEPARATOR()"
                  value={t.domainSeparator}
                  match={t.domainSeparatorMatch}
                  matchText="matches the pinned value"
                  missText="differs from the pinned value"
                  unknownText={t.expectsDomainSeparator ? 'unknown' : 'not implemented, this token settles over Permit2'}
                  mono
                />
              </div>
              {t.error && <p className="mt-1 num text-xs text-warn">{t.error}</p>}
            </div>
          ))}
        </Section>

        <Section
          title="Proxy implementations, the upgrade watch"
          note={
            proxies.block
              ? `The EIP-1967 implementation slot on each proxy, read at block ${proxies.block.toLocaleString()}, ${ago(Math.round((Date.now() - proxies.readAt) / 1000))}. The registries can be replaced by their upgrade key, which would change what every record read through them means. A live implementation off its pin is flagged here.`
              : 'no endpoint answered, so every implementation below is unknown'
          }
        >
          {proxies.proxies.map((p) => (
            <div key={p.key} className="border-b border-line-soft py-3 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-sm text-ink">{p.label}</span>
                <span className="num text-xs text-ink-faint">{p.address}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs">
                <span className="text-ink-faint">implementation</span>
                {p.impl === null ? (
                  <span className="unknown">{p.isProxy ? 'unknown' : 'not an EIP-1967 proxy, no implementation slot'}</span>
                ) : (
                  <>
                    <span className="num text-ink-dim">{p.impl}</span>
                    {p.matchesPinned === true && <span className="text-up">matches the pinned implementation</span>}
                    {p.matchesPinned === false && <span className="text-down">differs from the pinned implementation, the proxy was upgraded</span>}
                    {p.matchesPinned === null && p.implPinned === null && <span className="text-ink-faint">read live, no pin to compare</span>}
                  </>
                )}
              </div>
              {p.error && <p className="mt-1 num text-xs text-warn">{p.error}</p>}
            </div>
          ))}
        </Section>

        <Section title="Reproduce it" note="Every value on this page is one call anyone can run.">
          <pre className="num mt-1 overflow-x-auto rounded-md border border-line bg-canvas p-3 text-xs text-ink-soft">
{`# chain id, expected ${CHAIN.id}
cast chain-id --rpc-url https://bsc-rpc.publicnode.com

# a payment token's decimals(), expected 18 on every BSC stablecoin
cast call 0xcE24439F2D9C6a2289F741120FE202248B666666 \\
  "decimals()(uint8)" --rpc-url https://bsc-rpc.publicnode.com

# its EIP-712 domain separator, matched against the value the hire path signs under
cast call 0xcE24439F2D9C6a2289F741120FE202248B666666 \\
  "DOMAIN_SEPARATOR()(bytes32)" --rpc-url https://bsc-rpc.publicnode.com

# the implementation behind a registry proxy, so an upgrade shows up
cast storage 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 \\
  0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc \\
  --rpc-url https://bsc-rpc.publicnode.com`}
          </pre>
        </Section>
      </main>
      <Footer />
    </>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-lg border border-line bg-panel p-4">
      <h2 className="mb-2 text-sm uppercase tracking-wide text-ink-faint">{title}</h2>
      {note && <p className="mb-3 text-xs text-ink-faint">{note}</p>}
      {children}
    </section>
  )
}

function Unknown() {
  return <span className="unknown">unknown</span>
}

function Pill({
  ok,
  warn,
  okText,
  warnText,
  failText,
}: {
  ok: boolean
  warn: boolean
  okText: string
  warnText: string
  failText: string
}) {
  if (ok) return <span className="text-xs text-up">{okText}</span>
  if (warn) return <span className="text-xs text-warn">{warnText}</span>
  return <span className="text-xs text-down">{failText}</span>
}

/** One live value beside whether it matched its pin. Unknown renders as unknown, never as zero. */
function Fact({
  label,
  value,
  match,
  matchText,
  missText,
  unknownText,
  mono,
}: {
  label: string
  value: string | null
  match: boolean | null
  matchText: string
  missText: string
  unknownText?: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-ink-faint">{label}</span>
      {value === null ? (
        <span className="unknown">{unknownText ?? 'unknown'}</span>
      ) : (
        <>
          <span className={mono ? 'num text-ink-dim' : 'num text-ink'}>{value}</span>
          {match === true && <span className="text-up">{matchText}</span>}
          {match === false && <span className="text-down">{missText}</span>}
        </>
      )}
    </div>
  )
}
