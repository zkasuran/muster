import { EVIDENCE_ORDER, type EvidenceRung } from '@/lib/types'
import { computeEvidenceScore, feedbackInterval } from '@/lib/score'
import { ago } from '@/components/fresh'
import { cn } from '@/lib/cn'

/**
 * [doc 06] The score, shown honestly wherever a row renders. docs/06-QUALITY.md section 0 rule 1:
 * a number carries its freshness, its sample size and its interval or it is not shown at all. So the
 * evidence score never appears bare here: it is always the number, its 95% confidence floor, how
 * many rungs it rests on and when it was last checked. The delivery score of section 2 counts only
 * settled paid jobs and no listing has one, so it is stated as provisional rather than shown as a
 * misleading 50. Both numbers are named and neither is folded into the other.
 */
export function ScoreReadout({
  rung,
  lastProbeAt,
  updatedAt,
  distinctAuthors,
  clusterSize,
  firstParty,
  compact,
}: {
  rung: EvidenceRung
  lastProbeAt: number | null
  updatedAt: number
  distinctAuthors: number
  clusterSize: number
  firstParty: boolean
  compact?: boolean
}) {
  const ev = computeEvidenceScore({ rung, lastProbeAt, updatedAt, distinctAuthors, clusterSize, firstParty, asOf: Date.now() })
  const anchor = lastProbeAt ?? (updatedAt || null)
  const checkedLabel = firstParty ? 'confirmed' : 'checked'
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={cn('num font-display', compact ? 'text-2xl' : 'text-3xl', 'text-ink')}>{ev.scoreValue.toFixed(1)}</span>
        <span className="text-xs text-ink-faint">evidence score</span>
      </div>
      <div className="mt-1 text-xs text-ink-dim">
        95% floor <span className="num text-ink-soft">{ev.scoreConfidence.toFixed(1)}</span>
        <span className="text-ink-faint"> to {ev.scoreUpper.toFixed(1)}</span>
        {' · '}
        <span className="num">{ev.rungsCleared}</span> of {ev.maxRungSteps} rungs above registered
        {' · '}
        {ev.authorsCounted > 0 ? <><span className="num">{ev.authorsCounted}</span> independent author{ev.authorsCounted === 1 ? '' : 's'}</> : 'no independent authors'}
        {' · '}
        {anchor ? <>{checkedLabel} {ago(Math.round((Date.now() - anchor) / 1000))}</> : <span className="unknown">never checked</span>}
      </div>
      {ev.dupFactor < 1 && (
        <div className="mt-1 text-xs text-warn">
          Shares its registration record with <span className="num">{clusterSize}</span> agents, so its evidence is collapsed and the score is held down.
        </div>
      )}
      <p className={cn('text-xs text-ink-faint', compact ? 'mt-1' : 'mt-2')}>
        This is evidence readiness, not a delivery score. The delivery score counts only settled paid jobs and no
        listing has one yet, so it is provisional (n=0) for every row. The two are never blended.
      </p>
    </div>
  )
}

/**
 * [doc 06] Foreign ERC-8004 feedback, displayed in full and trusted nowhere (section 4). The value
 * carries a Wilson interval with the distinct-author count as the sample size, so a two-author
 * "rating" reads as the noise it is. Never a star, never a bare average. Zero weight in ranking.
 */
export function FeedbackBand({
  value,
  decimals,
  distinctAuthors,
  totalFeedbacks,
}: {
  value: string | number
  decimals: number
  distinctAuthors: number
  totalFeedbacks: number
}) {
  const fb = feedbackInterval(value, decimals, distinctAuthors, totalFeedbacks)
  return (
    <div className="rounded-md border border-line bg-canvas p-3">
      <div className="text-xs text-ink-faint">On-chain feedback, written by other people on the Reputation Registry, not by Muster</div>
      {fb.scaleResolved ? (
        <div className="mt-1 text-sm text-ink">
          aggregate value <span className="num">{fb.humanValue}</span> of 100
          <span className="text-ink-dim">, 95% interval </span>
          <span className="num">{fb.lo.toFixed(1)}</span>
          <span className="text-ink-dim"> to </span>
          <span className="num">{fb.hi.toFixed(1)}</span>
          <span className="text-ink-faint"> (n = {fb.distinctAuthors} distinct author{fb.distinctAuthors === 1 ? '' : 's'})</span>
        </div>
      ) : (
        <div className="mt-1 text-sm text-warn">
          aggregate value <span className="num">{fb.humanValue}</span> at decimals {fb.decimals}, outside the 0 to 100 range, so it is
          shown raw and not as a rating. getSummary averages in fixed point then truncates to the modal decimals.
        </div>
      )}
      <div className="mt-1 text-xs text-ink-faint">
        <span className="num">{fb.totalFeedbacks}</span> feedback{fb.totalFeedbacks === 1 ? '' : 's'} from <span className="num">{fb.distinctAuthors}</span> address{fb.distinctAuthors === 1 ? '' : 'es'}. Zero weight in ranking.
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Across the whole chain 111 addresses wrote all 29,712 feedbacks and none tags a financial outcome, so a count
        is a count and not a reputation. The interval is why the number is shown at all.
      </p>
    </div>
  )
}

/** A compact score cell for a table: the number over its floor, nothing bare. */
export function ScoreCell({ scoreValue, scoreConfidence }: { scoreValue: number | null; scoreConfidence: number | null }) {
  if (scoreValue === null) return <span className="unknown">not scored yet</span>
  return (
    <span className="inline-flex flex-col">
      <span className="num text-ink">{scoreValue.toFixed(1)}</span>
      <span className="num text-xs text-ink-faint">floor {scoreConfidence?.toFixed(1) ?? '—'}</span>
    </span>
  )
}

/** The rung index helper, so a caller can label "N of 6" without importing the order array. */
export function rungIndex(rung: EvidenceRung): number {
  return EVIDENCE_ORDER.indexOf(rung)
}
