import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Nav, Footer } from '@/components/nav'
import { FeeDisclosure } from '@/components/fee-disclosure'
import { db } from '@/lib/db'
import { tokenLabel, formatTokenAmount } from '@/lib/money'
import { syncFromHireAttempts, loadChain, verifyChain, canonicalJson, GENESIS_PREV_HASH } from '@/lib/ledger'
import { findAgent } from '@/lib/agents'
import { SHELF_TITLES } from '@/lib/classify'
import { CHAIN } from '@/lib/constants'

export const dynamic = 'force-dynamic'

interface AttemptRow {
  attemptId: string
  shelf: string
  signer: string
  payTo: string
  token: string
  amountBase: string
  nonce: string
  validBefore: number
  signatureHash: string
  signerBalance: string | null
  settled: number
  settleTx: string | null
  createdAt: number
}

function loadAttempt(attemptId: string): AttemptRow | null {
  return (
    (db()
      .prepare(
        `SELECT attemptId, shelf, signer, payTo, token, amountBase, nonce, validBefore, signatureHash,
                signerBalance, settled, settleTx, createdAt
         FROM hireAttempt WHERE attemptId = ?`,
      )
      .get(attemptId) as AttemptRow | undefined) ?? null
  )
}

export async function generateMetadata({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params
  const row = loadAttempt(attemptId)
  return { title: row ? `Receipt ${attemptId.slice(0, 8)}` : 'Receipt not found' }
}

/**
 * [doc 08] A receipt for one hire attempt: the exact authorization the buyer signed, the settle
 * state or the transaction hash with a BscScan link, the fee (zero), and the ledger entry this
 * attempt maps to with a command anyone can paste to recompute its hashes. 08-MONEY section 12.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params
  const row = loadAttempt(attemptId)
  if (!row) notFound()

  const token = tokenLabel(row.token)
  const amountDec = formatTokenAmount(row.amountBase, token.decimals)
  const balCovers =
    row.signerBalance === null ? null : BigInt(row.signerBalance) >= BigInt(row.amountBase)
  const shelfTitle = SHELF_TITLES[row.shelf as keyof typeof SHELF_TITLES] ?? row.shelf
  const isFirstParty = findAgent(row.shelf) !== null

  // The ledger entries this attempt maps to, and the walk over the whole chain.
  syncFromHireAttempts()
  const chain = loadChain()
  const hireEntry = chain.find((e) => e.refKey === `hireAttempt:${attemptId}`) ?? null
  const settleEntry = chain.find((e) => e.refKey === `settlement:${attemptId}`) ?? null
  const walk = verifyChain(chain)

  const settledOn = row.settled === 1 && row.settleTx

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <p className="text-xs uppercase tracking-wide text-ink-faint">
          Receipt · {shelfTitle}
          {isFirstParty && <span className="ml-2 rounded-sm border border-warn/50 px-1.5 text-warn">ours</span>}
        </p>
        <h1 className="num mt-2 break-all font-display text-2xl md:text-3xl">{attemptId}</h1>
        <p className="mt-2 text-sm text-ink-dim">
          {settledOn
            ? 'This authorization settled on chain. The transaction hash below is the proof.'
            : 'This authorization was signed and verified, not settled. Nothing is marked settled without a transaction that cleared.'}
        </p>

        <section className="mt-8 rounded-lg border border-line bg-panel p-4">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">What was signed</h2>
          <p className="mt-2 text-sm text-ink-dim">
            An EIP-3009 <span className="num">TransferWithAuthorization</span> in {token.symbol} on{' '}
            {CHAIN.name}. The signature is single use: the nonce burns on chain when it settles.
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 text-sm md:grid-cols-2">
            <Field k="Payer (signer)" v={row.signer} href={`https://bscscan.com/address/${row.signer}`} />
            <Field k="Pay to" v={row.payTo} href={`https://bscscan.com/address/${row.payTo}`} />
            <Field k="Amount" v={`${amountDec} ${token.symbol}`} sub={`${row.amountBase} base units, ${token.decimals ?? '?'} decimals`} />
            <Field
              k="Token"
              v={`${token.symbol}${token.known ? '' : ' (unrecognised)'}`}
              sub={row.token}
              href={`https://bscscan.com/token/${row.token}`}
            />
            <Field k="Valid before" v={new Date(row.validBefore * 1000).toISOString()} sub={`unix ${row.validBefore}`} />
            <Field k="Nonce" v={row.nonce} />
            <Field k="Signature hash" v={row.signatureHash} sub="keccak256 of the signature. The signature itself is never stored" />
            <Field k="EIP-712 domain" v="World Liberty Financial USD, version 1" sub={`chainId ${CHAIN.id}, verifyingContract ${row.token}`} />
          </dl>
          <p className="mt-3 text-xs text-ink-faint">
            validAfter and the raw signature are not retained: the server keeps only the fields it
            needs to show the receipt and the keccak256 of the signature as evidence it verified.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-line bg-panel p-4">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">Settlement</h2>
          <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 text-sm md:grid-cols-2">
            <Field k="State" v={settledOn ? 'settled' : 'signed, not settled'} />
            {settledOn ? (
              <Field k="Transaction" v={`${row.settleTx!.slice(0, 22)}…`} href={`https://bscscan.com/tx/${row.settleTx}`} />
            ) : (
              <Field k="Transaction" v="unknown" sub="no transfer has cleared for this authorization yet" unknown />
            )}
            <Field
              k="Signer balance at verify"
              v={row.signerBalance === null ? 'unknown' : `${formatTokenAmount(row.signerBalance, token.decimals)} ${token.symbol}`}
              sub={balCovers === null ? 'balance was not read' : balCovers ? 'covers the amount' : 'below the amount'}
              unknown={row.signerBalance === null}
            />
          </div>
        </section>

        <FeeDisclosure priceBase={row.amountBase} tokenSymbol={token.symbol} />

        <section className="mt-8 rounded-lg border border-line bg-panel p-4">
          <h2 className="text-sm uppercase tracking-wide text-ink-faint">On the ledger</h2>
          {hireEntry ? (
            <>
              <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 text-sm md:grid-cols-2">
                <Field k="Sequence" v={String(hireEntry.seq)} sub={hireEntry.backfilled === 1 ? 'backfilled from an attempt made before the ledger' : 'appended live'} />
                <Field k="Origin" v={hireEntry.origin} sub={hireEntry.origin === 'house' ? 'our own first-party listing, not counted as revenue' : 'third-party revenue'} />
                <Field k="Entry hash" v={hireEntry.entryHash} />
                <Field k="Links to previous" v={hireEntry.prevHash === GENESIS_PREV_HASH ? `${hireEntry.prevHash} (genesis)` : hireEntry.prevHash} />
                {settleEntry && <Field k="Settlement entry" v={`seq ${settleEntry.seq}, ${settleEntry.entryHash.slice(0, 16)}…`} />}
              </div>
              <p className={`num mt-3 text-sm ${walk.ok ? 'text-ink-soft' : 'text-warn'}`}>
                chain walk: {walk.ok ? `ok, ${walk.checked} checked` : `${walk.failures.length} failures across ${walk.checked} entries`}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-dim">This attempt is not on the ledger yet.</p>
          )}
          <p className="mt-3 text-sm">
            <Link className="text-brand" href="/ledger">The whole ledger</Link>
            <span className="mx-2 text-ink-faint">·</span>
            <Link className="text-brand" href="/api/ledger">Raw JSON</Link>
          </p>
        </section>

        {hireEntry && (
          <section className="mt-8 rounded-lg border border-line bg-panel p-4">
            <h2 className="text-sm uppercase tracking-wide text-ink-faint">Recompute this entry</h2>
            <p className="mt-2 text-sm text-ink-dim">
              The canonical bytes are sorted-key compact JSON. Paste these and the two hashes must
              match the entry above, with no trailing newline.
            </p>
            <pre className="num mt-2 overflow-x-auto rounded-md border border-line bg-canvas p-3 text-xs text-ink-soft">
{`printf '%s' '${hireEntry.payload}' | sha256sum
# -> ${hireEntry.payloadHash}  (payloadHash)

printf '%s' '${canonicalJson({
  seq: hireEntry.seq,
  ts: hireEntry.ts,
  origin: hireEntry.origin,
  kind: hireEntry.kind,
  refKey: hireEntry.refKey,
  payloadHash: hireEntry.payloadHash,
  prevHash: hireEntry.prevHash,
})}' | sha256sum
# -> ${hireEntry.entryHash}  (entryHash)`}
            </pre>
          </section>
        )}

        <p className="mt-8 text-sm">
          <Link className="text-brand" href={`/hire/${row.shelf}`}>Hire {shelfTitle}</Link>
          <span className="mx-2 text-ink-faint">·</span>
          <Link className="text-brand" href={`/shelf/${row.shelf}`}>Back to the shelf</Link>
        </p>
      </main>
      <Footer />
    </>
  )
}

function Field({
  k,
  v,
  sub,
  href,
  unknown,
}: {
  k: string
  v: string
  sub?: string
  href?: string
  unknown?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{k}</dt>
      <dd className={unknown ? 'unknown break-all text-sm' : 'num break-all text-sm text-ink'}>
        {href ? (
          <a className="text-brand underline" href={href} target="_blank" rel="noreferrer noopener">
            {v}
          </a>
        ) : (
          v
        )}
      </dd>
      {sub && <dd className="mt-0.5 text-xs text-ink-faint">{sub}</dd>}
    </div>
  )
}
