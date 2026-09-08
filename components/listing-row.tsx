import Link from 'next/link'
import { EvidenceBadge } from './evidence'
import { ago } from './fresh'
import type { ListingCard } from '@/lib/queries'
import { TOKENS } from '@/lib/constants'

function priceLabel(l: ListingCard): string | null {
  if (!l.priceBase || !l.priceToken || l.priceDecimals === null) return null
  const sym =
    Object.values(TOKENS).find(
      (t) => t.address.toLowerCase() === l.priceToken?.toLowerCase(),
    )?.symbol ?? 'token'
  const v = Number(BigInt(l.priceBase)) / 10 ** l.priceDecimals
  return `${v.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${sym}`
}

/**
 * One row on a shelf. Every field a buyer needs to choose, and nothing it cannot support.
 */
export function ListingRow({ l, compareWith }: { l: ListingCard; compareWith?: string }) {
  const price = priceLabel(l)
  return (
    <li className="rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/agent/${l.agentId}`}
            className="text-base text-ink hover:text-brand"
          >
            {l.name ?? <span className="unknown">unnamed</span>}
          </Link>
          <div className="num mt-0.5 text-xs text-ink-faint">
            id {l.agentId}
            {l.firstParty === 1 && (
              <span className="ml-2 rounded-sm border border-warn/50 px-1.5 text-warn">
                ours
              </span>
            )}
            {l.clusterSize > 1 && (
              <span className="ml-2 text-ink-dim">
                1 of {l.clusterSize} identical registrations
              </span>
            )}
          </div>
        </div>
        <EvidenceBadge rung={l.evidenceTier} />
      </div>

      {l.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-ink-dim">{l.description}</p>
      ) : (
        <p className="mt-2 text-sm unknown">no description in its registration record</p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-4">
        <div>
          <dt className="text-ink-faint">Price</dt>
          <dd className={price ? 'num text-ink' : 'unknown'}>{price ?? 'not quoted'}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Rail</dt>
          <dd className={l.priceScheme ? 'text-ink' : 'unknown'}>
            {l.priceScheme ?? 'none'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">Endpoints</dt>
          <dd className="num text-ink">{l.endpointCount}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Last probe</dt>
          <dd className={l.lastProbeAt ? 'text-ink' : 'unknown'}>
            {l.lastProbeAt
              ? `${l.lastProbeVerdict} ${ago(Math.round((Date.now() - l.lastProbeAt) / 1000))}`
              : 'never probed'}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {compareWith && compareWith !== l.agentId && (
          <Link
            href={`/compare?ids=${l.agentId},${compareWith}`}
            className="rounded-sm border border-line px-2 py-0.5 text-ink-soft hover:border-brand hover:text-brand"
          >
            compare with ours
          </Link>
        )}
        {l.inBazaar === 1 && (
          <span className="rounded-sm border border-brand/40 px-2 py-0.5 text-brand">
            in B402 Bazaar
          </span>
        )}
        {l.declaresX402 === 1 && (
          <span className="rounded-sm border border-line px-2 py-0.5 text-ink-dim">
            claims x402, unverified
          </span>
        )}
        {l.declaresActive === 1 && (
          <span className="rounded-sm border border-line px-2 py-0.5 text-ink-dim">
            claims active, unverified
          </span>
        )}
      </div>
    </li>
  )
}
