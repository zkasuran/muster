'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * The one client component on the site, because signing needs the wallet. Everything else on
 * the page is server rendered and reads with scripting off. The flow is: connect, switch to BNB
 * Smart Chain, ask the server for the exact typed data, sign it with eth_signTypedData_v4, send
 * the signature back, show what came back. No transaction is sent and no BNB is spent.
 */
interface Eth {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

type Step = 'idle' | 'connecting' | 'offer' | 'signing' | 'verifying' | 'done' | 'error'

export function HireWidget({ shelf, price }: { shelf: string; price: string }) {
  const [step, setStep] = useState<Step>('idle')
  const [account, setAccount] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [offerState, setOfferState] = useState<Record<string, unknown> | null>(null)
  const [sig, setSig] = useState<string | null>(null)
  const [fac, setFac] = useState<Record<string, unknown> | null>(null)
  const [settle, setSettle] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [settleOut, setSettleOut] = useState<Record<string, unknown> | null>(null)

  async function doSettle() {
    if (!result || !sig || !offerState) return
    setSettle('running')
    try {
      const r = await fetch('/api/hire', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'settle', attemptId: result['attemptId'], signature: sig, validAfter: offerState['validAfter'] }) })
      const j = (await r.json()) as Record<string, unknown>
      setSettleOut(j)
      setSettle(r.ok ? 'done' : 'error')
    } catch (e) {
      setSettleOut({ reason: e instanceof Error ? e.message : String(e) })
      setSettle('error')
    }
  }

  const eth = (): Eth | null =>
    typeof window !== 'undefined' ? ((window as unknown as { ethereum?: Eth }).ethereum ?? null) : null

  async function run() {
    setMessage(null)
    setResult(null)
    const provider = eth()
    if (!provider) {
      setStep('error')
      setMessage('No wallet found in this browser. Any EIP-1193 wallet works, for example MetaMask or Binance Wallet.')
      return
    }
    try {
      setStep('connecting')
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
      const from = accounts[0]
      if (!from) throw new Error('the wallet returned no account')
      setAccount(from)
      // Chain 56. A wallet on another chain would sign a domain that no contract honours. A wallet
      // that has never added BNB Smart Chain answers the switch with EIP-3085 code 4902, so it is
      // added first, then the switch is retried, before asking the human to do anything by hand.
      const switchTo56 = () => provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] })
      try {
        await switchTo56()
      } catch (err) {
        const code = (err as { code?: number } | null)?.code
        if (code !== 4902) throw new Error('please switch the wallet to BNB Smart Chain (chain id 56) and try again')
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x38',
              chainName: 'BNB Smart Chain',
              nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
              rpcUrls: ['https://bsc-dataseed.bnbchain.org'],
              blockExplorerUrls: ['https://bscscan.com'],
            }],
          })
          await switchTo56()
        } catch {
          throw new Error('BNB Smart Chain (chain id 56) is not in this wallet and could not be added, add it and try again')
        }
      }

      setStep('offer')
      const offerRes = await fetch('/api/hire', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'typed-data', shelf, from }),
      })
      const offer = (await offerRes.json()) as Record<string, unknown>
      if (!offerRes.ok) throw new Error(String(offer['error'] ?? 'could not build typed data'))

      setStep('signing')
      const signature = (await provider.request({
        method: 'eth_signTypedData_v4',
        params: [from, JSON.stringify(offer['typedData'])],
      })) as string

      setStep('verifying')
      const verifyRes = await fetch('/api/hire', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          shelf,
          from,
          signature,
          nonce: offer['nonce'],
          validAfter: offer['validAfter'],
          validBefore: offer['validBefore'],
        }),
      })
      const verified = (await verifyRes.json()) as Record<string, unknown>
      if (!verifyRes.ok) throw new Error(String(verified['error'] ?? 'verification failed'))
      setResult(verified)
      setOfferState(offer)
      setSig(signature)
      setStep('done')
      try {
        const f = await fetch('/api/hire', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'facilitator' }) })
        setFac((await f.json()) as Record<string, unknown>)
      } catch { setFac(null) }
    } catch (e) {
      setStep('error')
      setMessage(e instanceof Error ? e.message : String(e))
    }
  }

  const busy = step === 'connecting' || step === 'offer' || step === 'signing' || step === 'verifying'
  const label =
    step === 'connecting' ? 'Connecting wallet' :
    step === 'offer' ? 'Building the typed data' :
    step === 'signing' ? 'Waiting for your signature' :
    step === 'verifying' ? 'Recovering the signer' :
    step === 'done' ? 'Sign again' :
    `Sign a ${price} authorization`

  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className={cn(
            'rounded-md bg-brand px-4 py-2 text-sm font-semibold text-canvas',
            busy && 'opacity-60',
          )}
        >
          {label}
        </button>
        <span className="text-xs text-ink-faint">
          One EIP-712 signature. No transaction, no gas, nothing leaves your wallet until a facilitator settles it.
        </span>
      </div>
      {account && <div className="num mt-3 text-xs text-ink-dim">wallet {account}</div>}

      {step === 'error' && message && (
        <p className="mt-3 rounded-md border border-down/40 p-3 text-sm text-down">{message}</p>
      )}

      {step === 'done' && result && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-up">
            Signature valid. It recovers to {String(result['signer'])} and authorizes {String(result['amountHuman'])}.
          </p>
          <p className="text-ink-dim">
            Your USD1 balance:{' '}
            <span className={cn('num', result['balanceCovers'] === false ? 'text-warn' : 'text-ink')}>
              {result['signerBalanceHuman'] === null ? 'unknown, the read failed' : String(result['signerBalanceHuman'])}
            </span>
            {result['balanceCovers'] === false && <span className="ml-2 text-warn">below the price, so this could not clear</span>}
            {result['balanceCovers'] === true && <span className="ml-2 text-up">covers the price</span>}
          </p>
          {fac && fac['canSettle'] === true && result['balanceCovers'] === true ? (
            <div className="rounded-md border border-brand/40 p-3">
              <p className="text-ink">
                Muster can settle this itself. It submits your authorization to the USD1 contract and pays
                the gas, so {String(result['amountHuman'])} moves from your wallet to the agent on chain.
              </p>
              <button type="button" onClick={doSettle} disabled={settle === 'running' || settle === 'done'}
                className={cn('mt-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-canvas', (settle === 'running' || settle === 'done') && 'opacity-60')}>
                {settle === 'running' ? 'Submitting to BNB Smart Chain' : settle === 'done' ? 'Settled' : `Settle ${String(result['amountHuman'])} on chain`}
              </button>
              {settleOut && settle === 'done' && (
                <p className="mt-2 text-up">
                  Settled. Transaction{' '}
                  <a className="num underline" href={`https://bscscan.com/tx/${String(settleOut['transaction'])}`} target="_blank" rel="noreferrer noopener">{String(settleOut['transaction']).slice(0, 18)}…</a>
                  {settleOut['gasUsed'] ? <span className="text-ink-faint">, {String(settleOut['gasUsed'])} gas paid by the facilitator</span> : null}
                </p>
              )}
              {settleOut && settle === 'error' && <p className="mt-2 text-down">{String(settleOut['reason'] ?? settleOut['error'])}</p>}
            </div>
          ) : (
            <p className="text-ink-dim">
              {fac && fac['canSettle'] === false
                ? `Settlement is unavailable right now: ${String(fac['reason'])}. Nothing was charged.`
                : result['balanceCovers'] === false
                  ? 'Your wallet holds less USD1 than the price, so this authorization could not clear. Nothing was charged.'
                  : 'Nothing was charged. The envelope below is what a facilitator would settle, recorded here as a signed attempt, not a payment.'}
            </p>
          )}
          <pre className="num max-h-64 overflow-auto rounded-md border border-line bg-canvas p-3 text-xs text-ink-soft">
            {JSON.stringify(result['envelope'], null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

/** Free sample run, labelled as such on every response, so a judge without a wallet can see the work. */
export function SampleRun({ shelf }: { shelf: string }) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [out, setOut] = useState<string | null>(null)
  const [ms, setMs] = useState<number | null>(null)

  async function go() {
    setState('running')
    setOut(null)
    const t0 = Date.now()
    try {
      const res = await fetch('/api/hire', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'sample', shelf }),
      })
      const j = (await res.json()) as Record<string, unknown>
      setMs(Date.now() - t0)
      if (!res.ok) throw new Error(String(j['error'] ?? 'sample failed'))
      setOut(JSON.stringify(j, null, 2))
      setState('done')
    } catch (e) {
      setOut(e instanceof Error ? e.message : String(e))
      setState('error')
    }
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={go}
          disabled={state === 'running'}
          className={cn('rounded-md border border-brand px-4 py-2 text-sm font-semibold text-brand', state === 'running' && 'opacity-60')}
        >
          {state === 'running' ? 'Running against the live chain' : 'Run a free sample'}
        </button>
        <span className="text-xs text-ink-faint">
          The documented example input, real reads, labelled as a sample. The paid call returns the same shape for your input.
        </span>
      </div>
      {ms !== null && <div className="num mt-2 text-xs text-ink-faint">{ms} ms round trip</div>}
      {out && (
        <pre className={cn('num mt-3 max-h-96 overflow-auto rounded-md border border-line bg-canvas p-3 text-xs', state === 'error' ? 'text-down' : 'text-ink-soft')}>
          {out}
        </pre>
      )}
    </div>
  )
}
