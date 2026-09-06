import { cn } from '@/lib/cn'

/**
 * A value with the age of the read beside it. Anything unmeasured renders as unknown, never
 * as zero and never as a dash that reads like zero.
 */
export function Value({
  value,
  readAt,
  ceilingSeconds,
  suffix,
  className,
}: {
  value: string | number | null | undefined
  readAt?: number | null
  ceilingSeconds?: number
  suffix?: string
  className?: string
}) {
  if (value === null || value === undefined || value === '') {
    return <span className={cn('unknown text-sm', className)}>unknown</span>
  }
  const age = readAt ? Math.round((Date.now() - readAt) / 1000) : null
  const stale = age !== null && ceilingSeconds !== undefined && age > ceilingSeconds
  return (
    <span className={cn('num', className)}>
      {value}
      {suffix ? <span className="text-ink-dim">{suffix}</span> : null}
      {age !== null && (
        <span className={cn('ml-2 text-xs', stale ? 'text-warn' : 'text-ink-faint')}>
          {stale ? 'stale ' : ''}
          {ago(age)}
        </span>
      )}
    </span>
  )
}

export function ago(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86400)}d ago`
}

export function num(n: number | null | undefined): string {
  return n === null || n === undefined ? 'unknown' : n.toLocaleString('en-US')
}
