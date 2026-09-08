import { cn } from '@/lib/cn'
import { EVIDENCE_ORDER, type EvidenceRung } from '@/lib/types'

/**
 * The evidence rung, shown on every row. This is the product's whole argument in one
 * control: a marketplace owes a buyer the difference between what an operator claimed and
 * what somebody checked.
 */
const LABEL: Record<EvidenceRung, string> = {
  registered: 'registered',
  declared: 'declared',
  reachable: 'reachable',
  probed: 'probed',
  payable: 'payable',
  settled: 'settled',
}

const MEANING: Record<EvidenceRung, string> = {
  registered: 'On chain. Nothing else is known about it.',
  declared: 'It names an endpoint and a capability. Nobody has checked either.',
  reachable: 'The host it named resolves and completes TLS.',
  probed: 'It answered a probe in a way that matches what it declared.',
  payable: 'It returns a 402 with payment requirements a buyer could satisfy.',
  settled: 'A real payment to it has cleared on chain at least once.',
}

export function EvidenceBadge({ rung, className }: { rung: EvidenceRung; className?: string }) {
  const i = EVIDENCE_ORDER.indexOf(rung)
  const proven = i >= 3
  return (
    <span
      title={MEANING[rung]}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs',
        proven ? 'border-brand/40 text-brand' : 'border-line text-ink-dim',
        className,
      )}
    >
      <span aria-hidden className="num">
        {i + 1}/6
      </span>
      {LABEL[rung]}
    </span>
  )
}

/** The ladder itself, for the listing page, so a buyer can see what is missing. */
export function EvidenceLadder({ rung }: { rung: EvidenceRung }) {
  const reached = EVIDENCE_ORDER.indexOf(rung)
  return (
    <ol className="space-y-2">
      {EVIDENCE_ORDER.map((r, i) => {
        const done = i <= reached
        return (
          <li key={r} className="flex gap-3">
            <span
              aria-hidden
              className={cn(
                'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                done ? 'bg-brand' : 'bg-line',
              )}
            />
            <div>
              <div className={cn('text-sm', done ? 'text-ink' : 'text-ink-faint')}>
                {LABEL[r]}
                {i === reached && <span className="ml-2 text-xs text-brand">reached</span>}
              </div>
              <div className={cn('text-xs', done ? 'text-ink-dim' : 'text-ink-faint')}>
                {MEANING[r]}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * The six-segment rung bar. Filled segments are what has been checked, empty ones are what has
 * not, so a row's standing is visible at a glance before a single word is read. Used on every
 * listing row, on compare and on the agent header.
 */
export function RungBar({ rung, size = 'sm' }: { rung: EvidenceRung; size?: 'sm' | 'md' }) {
  const reached = EVIDENCE_ORDER.indexOf(rung)
  const h = size === 'md' ? 'h-2.5 w-8' : 'h-1.5 w-5'
  return (
    <span className="inline-flex items-center gap-1" title={`${LABEL[rung]}, rung ${reached + 1} of 6`} aria-label={`${LABEL[rung]}, rung ${reached + 1} of 6`}>
      {EVIDENCE_ORDER.map((r, i) => (
        <span
          key={r}
          aria-hidden
          className={cn(h, 'rounded-sm', i <= reached ? (i >= 4 ? 'bg-brand' : 'bg-ink-soft') : 'bg-line')}
        />
      ))}
    </span>
  )
}
