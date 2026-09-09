'use client'

import { useState } from 'react'
import { parseSkillFile, SKILL_MD_EXAMPLE } from '@/lib/skillmd'

/**
 * The onboarding builder. Two ways in, one output. An operator either fills the form or drops a
 * skill.md (or a JSON agent card), and the file is parsed in the browser to prefill the same form,
 * so the two paths converge before anything is generated. Submit posts to /api/onboard, which
 * classifies, generates the registration document, the x402 entry and the register() call, and
 * optionally runs one live probe of the endpoint. Every generated block has its own copy button,
 * because a field is the unit an operator pastes.
 */

interface Result {
  ok: boolean
  errors: string[]
  shelves: { shelf: string; title: string; basis: string }[]
  registration: Record<string, unknown> | null
  x402: Record<string, unknown> | null
  registerCall: Record<string, unknown> | null
  probe: {
    ran: boolean
    verdict?: string
    httpStatus?: number | null
    sawPaymentRequired?: boolean
    tlsOk?: boolean
    rung?: string | null
    note?: string | null
  }
}

export function OnboardBuilder() {
  const [mode, setMode] = useState<'form' | 'skill'>('form')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [price, setPrice] = useState('')
  const [skills, setSkills] = useState('')
  const [probe, setProbe] = useState(true)
  const [skillText, setSkillText] = useState('')
  const [parseNote, setParseNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  function prefillFrom(text: string) {
    const p = parseSkillFile(text)
    if (p.source === 'empty') {
      setParseNote('Nothing to read yet. Paste a skill.md or a JSON agent card above.')
      return
    }
    if (p.name) setName(p.name)
    if (p.description) setDescription(p.description)
    if (p.endpoint) setEndpoint(p.endpoint)
    if (p.price) setPrice(p.price.replace(/[^0-9.]/g, '') || '')
    if (p.skills.length) setSkills(p.skills.join('\n'))
    const read = [p.name && 'name', p.description && 'description', p.endpoint && 'endpoint', p.skills.length && 'skills'].filter(Boolean).join(', ')
    setParseNote(`Read from ${p.source === 'json-card' ? 'a JSON agent card' : 'the skill.md'}: ${read || 'nothing usable'}.${p.missing.length ? ` Still need: ${p.missing.join(', ')}.` : ''}`)
    setMode('form')
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setSkillText(text)
    prefillFrom(text)
  }

  async function submit() {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          endpoint,
          skills,
          priceUsd1: price.trim() === '' ? null : Number(price),
          probe: probe && endpoint.trim() !== '',
        }),
      })
      setResult((await res.json()) as Result)
    } catch {
      setResult({ ok: false, errors: ['could not reach the onboarding endpoint'], shelves: [], registration: null, x402: null, registerCall: null, probe: { ran: false } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-8">
      {/* Mode switch */}
      <div className="inline-flex overflow-hidden rounded-md border border-line text-sm">
        <button type="button" onClick={() => setMode('form')} className={tab(mode === 'form')}>Fill a form</button>
        <button type="button" onClick={() => setMode('skill')} className={`border-l border-line ${tab(mode === 'skill')}`}>Paste a skill.md</button>
      </div>

      {mode === 'skill' && (
        <div className="mt-4 card p-4">
          <p className="text-sm text-ink-dim">
            Drop the skill.md your agent already ships, or a JSON agent card from any platform. It is
            read in your browser and used to prefill the form; nothing is uploaded until you generate.
          </p>
          <textarea
            value={skillText}
            onChange={(e) => setSkillText(e.target.value)}
            placeholder={SKILL_MD_EXAMPLE}
            rows={12}
            className="num mt-3 w-full rounded-md border border-line bg-canvas p-3 text-xs text-ink-soft outline-none focus:border-ink-dim"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => prefillFrom(skillText)} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-canvas">Parse and prefill</button>
            <label className="cursor-pointer rounded-md border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand hover:text-brand">
              Choose a file
              <input type="file" accept=".md,.markdown,.json,.txt,text/markdown,application/json" onChange={onFile} className="hidden" />
            </label>
            <button type="button" onClick={() => { setSkillText(SKILL_MD_EXAMPLE); setParseNote(null) }} className="text-sm text-ink-dim hover:text-brand">load the example</button>
          </div>
          {parseNote && <p className="mt-3 text-xs text-ink-dim">{parseNote}</p>}
        </div>
      )}

      {mode === 'form' && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Name" hint="what a buyer scans for">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Venus Liquidation Guard" className={input()} />
          </Field>
          <Field label="Service endpoint" hint="https URL your agent answers on, optional">
            <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://my-agent.example.com/a2a" className={input()} />
          </Field>
          <Field label="Description" hint="a sentence or two; the classifier reads this" full>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Reads a Venus borrow position and warns before it can be liquidated." className={`${input()} resize-y`} />
          </Field>
          <Field label="Skills" hint="one per line: OASF paths or plain names" full>
            <textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows={2} placeholder={'risk_management/liquidation\ndefi/health factor monitoring'} className={`${input()} num resize-y`} />
          </Field>
          <Field label="Price per call, USD1" hint="leave blank if the agent is free">
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0.02" className={input()} />
          </Field>
          <Field label="Live check" hint="probe the endpoint now and show the rung it earns">
            <label className="flex items-center gap-2 py-1.5 text-sm text-ink-soft">
              <input type="checkbox" checked={probe} onChange={(e) => setProbe(e.target.checked)} className="accent-brand" />
              Probe my endpoint when I generate
            </label>
          </Field>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={submit} disabled={busy} className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-canvas disabled:opacity-60">
          {busy ? 'Generating…' : 'Generate listing artifacts'}
        </button>
        <span className="text-xs text-ink-faint">Nothing is written to the marketplace. This produces what you publish to get listed.</span>
      </div>

      {result && <Results result={result} />}
    </div>
  )
}

function Results({ result }: { result: Result }) {
  if (!result.ok) {
    return (
      <div className="mt-6 rounded-lg border border-down/40 bg-panel p-4">
        <h3 className="text-sm font-semibold text-down">Fix these first</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-dim">
          {result.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </div>
    )
  }
  const noShelf = result.shelves.length === 0
  return (
    <div className="mt-8 space-y-5">
      {/* Where it lands */}
      <div className="card p-4">
        <h3 className="text-sm uppercase tracking-wide text-ink-faint">Where it lands</h3>
        {noShelf ? (
          <p className="mt-2 text-sm text-warn">
            The text does not match any of the four category contracts yet, so it would be indexed but not
            shelved. Adjust the description or skills to match rebalancing, grid trading, yield or health factor.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {result.shelves.map((s) => (
              <span key={s.shelf} className="rounded-md border border-up/40 px-2.5 py-1 text-sm text-up">
                {s.title} <span className="text-ink-faint">· {s.basis} match</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Live probe */}
      {result.probe.ran && (
        <div className="card p-4">
          <h3 className="text-sm uppercase tracking-wide text-ink-faint">Live probe of your endpoint</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>rung earned: <span className={result.probe.rung ? 'text-up' : 'unknown'}>{result.probe.rung ?? 'none yet'}</span></span>
            <span className="text-ink-dim">verdict {result.probe.verdict}</span>
            <span className="text-ink-dim">HTTP {result.probe.httpStatus ?? 'none'}</span>
            <span className="text-ink-dim">TLS {result.probe.tlsOk ? 'ok' : 'no'}</span>
            {result.probe.sawPaymentRequired && <span className="text-brand">returned a 402</span>}
          </div>
          {result.probe.note && <p className="mt-1 text-xs text-ink-faint">{result.probe.note}</p>}
        </div>
      )}

      {/* The artifacts */}
      <Copyable title="Registration document" hint="host this at your agent's tokenURI, the register() argument below points at it" value={result.registration} />
      {result.x402 && <Copyable title="x402 accepts[] entry" hint="what your 402 returns; replace payTo with your payout address" value={result.x402} />}
      {result.registerCall && <Copyable title="On-chain register() call" hint="send this from the wallet that will own the agent" value={result.registerCall} />}

      <p className="text-sm text-ink-dim">
        Once you register on chain and your endpoint answers, Muster&apos;s next sweep indexes you and the
        probe moves you up the ladder, no submission needed.
      </p>
    </div>
  )
}

function Copyable({ title, hint, value }: { title: string; hint: string; value: unknown }) {
  const text = JSON.stringify(value, null, 2)
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard blocked; the text is selectable in the block */
    }
    setDone(true)
    setTimeout(() => setDone(false), 1200)
  }
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-xs text-ink-faint">{hint}</p>
        </div>
        <button type="button" onClick={copy} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${done ? 'bg-up text-white' : 'bg-brand text-canvas'}`}>
          {done ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="num mt-3 max-h-96 overflow-auto rounded-md border border-line bg-canvas p-3 text-xs text-ink-soft">{text}</pre>
    </div>
  )
}

function Field({ label, hint, full, children }: { label: string; hint: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="text-xs text-ink-faint">{label} <span className="text-ink-faint/70">· {hint}</span></label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

const input = () => 'w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ink-dim'
const tab = (active: boolean) => `px-4 py-2 ${active ? 'bg-panel-2 text-ink' : 'text-ink-dim hover:text-ink'}`
