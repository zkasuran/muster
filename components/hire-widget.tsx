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
      // Chain 56. A wallet on another chain would sign a domain that no contract honours.
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] })
      } catch {
        throw new Error('please switch the wallet to BNB Smart Chain (chain id 56) and try again')
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
      setStep('done')
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
          <p className="text-ink-dim">
            Settlement through Binance B402 is pending a merchant developer account, which is granted
            on request. Nothing was charged. The envelope below is what a facilitator would settle, and
            it is recorded here as a signed attempt, not a payment.
          </p>
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
