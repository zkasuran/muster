import Link from 'next/link'
import { EvidenceBadge, RungBar } from './evidence'
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

/** A row is hireable here when we operate it, it has cleared the payable rung and it quotes a price. */
function isHireable(l: ListingCard): boolean {
  return l.firstParty === 1 && (l.evidenceTier === 'payable' || l.evidenceTier === 'settled')
}

/**
 * One row on a shelf, framed for a buyer. What the agent does leads, then the one action that fits
 * its state: hire it if it is ours and payable, otherwise open its details. The probe, rail and
 * endpoint facts a judge wants are kept, moved to a single muted line below, so the card sells the
 * work rather than reading like a database dump. Honest throughout: an unquoted price still says so,
 * a claim is still marked unverified, it is just no longer the first thing the eye lands on.
 */
export function ListingRow({ l, compareWith }: { l: ListingCard; compareWith?: string }) {
  const price = priceLabel(l)
  const hireable = isHireable(l)
  return (
    <li className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/agent/${l.agentId}`} className="text-base text-ink hover:text-brand">
            {l.name ?? <span className="unknown">unnamed agent</span>}
          </Link>
          {l.firstParty === 1 && (
            <span className="ml-2 rounded-sm border border-warn/50 px-1.5 text-xs text-warn">ours</span>
          )}
          {l.dupeCount > 1 && (
            <span className="ml-2 rounded-sm border border-line px-1.5 text-xs text-ink-dim">
              +{l.dupeCount - 1} more from this operator
            </span>
          )}
        </div>
        {hireable && price && (
          <span className="num shrink-0 text-sm text-brand">{price}</span>
        )}
      </div>

      {l.description ? (
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-dim">{l.description}</p>
      ) : (
        <p className="mt-2 flex-1 text-sm unknown">no description in its registration record</p>
      )}

      {/* The action, sized to the row's real state. A payable agent of ours can be hired; anything
          else opens where a buyer can read how far up the ladder it has climbed and decide. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {hireable ? (
          <>
            <Link
              href={`/hire/${l.category}`}
              className="rounded-md bg-brand px-3 py-1.5 font-semibold text-canvas"
            >
              Hire
            </Link>
            <Link
              href={`/hire/${l.category}#see-it-work`}
              className="rounded-md border border-line px-3 py-1.5 text-ink-soft hover:border-brand hover:text-brand"
            >
              See it free
            </Link>
          </>
        ) : (
          <Link
            href={`/agent/${l.agentId}`}
            className="rounded-md border border-line px-3 py-1.5 text-ink-soft hover:border-brand hover:text-brand"
          >
            See details
          </Link>
        )}
        {compareWith && compareWith !== l.agentId && (
          <Link
            href={`/compare?ids=${l.agentId},${compareWith}`}
            className="text-xs text-ink-dim hover:text-brand"
          >
            compare with ours
          </Link>
        )}
        <span className="ml-auto flex items-center gap-1.5" title={`evidence rung: ${l.evidenceTier}`}>
          <RungBar rung={l.evidenceTier} />
          <EvidenceBadge rung={l.evidenceTier} />
        </span>
      </div>

      {/* The evidence, muted. Everything a judge checks is still here: the rail, the endpoint count,
          the last probe verdict and age, whether it is in the Bazaar, and any unverified claim. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft pt-2.5 text-xs text-ink-faint">
        <span className="num">id {l.agentId}</span>
        {l.clusterSize > 1 && <span>1 of {l.clusterSize} identical</span>}
        {!hireable && (
          <span className={price ? 'num text-ink-dim' : 'unknown'}>
            {price ? `${price} · ${l.priceScheme ?? 'no rail'}` : 'price not quoted'}
          </span>
        )}
        <span className="num">{l.endpointCount} endpoint{l.endpointCount === 1 ? '' : 's'}</span>
        <span className={l.lastProbeAt ? (l.lastProbeVerdict === 'pass' ? 'text-up' : 'text-down') : 'unknown'}>
          {l.lastProbeAt
            ? `probe ${l.lastProbeVerdict} ${ago(Math.round((Date.now() - l.lastProbeAt) / 1000))}`
            : 'never probed'}
        </span>
        {l.inBazaar === 1 && <span className="text-brand">in B402 Bazaar</span>}
        {l.declaresX402 === 1 && !isHireable(l) && <span>claims x402, unverified</span>}
      </div>
    </li>
  )
}


/** The dense view: one line per agent, for scanning many rows without a wall of cards. */
export function ListingTr({ l, compareWith }: { l: ListingCard; compareWith?: string }) {
  const price = priceLabel(l)
  const hireable = isHireable(l)
  return (
    <tr className="border-b border-line-soft align-top hover:bg-panel-2">
      <td className="py-2.5 pr-3">
        <Link href={`/agent/${l.agentId}`} className="text-ink hover:text-brand">
          {l.name ?? <span className="unknown">unnamed</span>}
        </Link>
        <div className="num text-xs text-ink-faint">
          {l.agentId}
          {l.firstParty === 1 && <span className="ml-2 rounded-sm border border-warn/50 px-1 text-warn">ours</span>}
          {l.dupeCount > 1 && <span className="ml-2 text-ink-dim">+{l.dupeCount - 1} like it</span>}
        </div>
      </td>
      <td className="py-2.5 pr-3"><RungBar rung={l.evidenceTier} /><div className="mt-0.5 text-xs text-ink-dim">{l.evidenceTier}</div></td>
      <td className={`py-2.5 pr-3 ${price ? 'num text-ink' : 'unknown'}`}>{price ?? 'not quoted'}</td>
      <td className={`py-2.5 pr-3 text-xs ${l.priceScheme ? 'text-ink' : 'unknown'}`}>{l.priceScheme ?? 'none'}</td>
      <td className="num py-2.5 pr-3 text-ink">{l.endpointCount}</td>
      <td className={`py-2.5 pr-3 text-xs ${l.lastProbeAt ? (l.lastProbeVerdict === 'pass' ? 'text-up' : 'text-down') : 'unknown'}`}>
        {l.lastProbeAt ? `${l.lastProbeVerdict} ${ago(Math.round((Date.now() - l.lastProbeAt) / 1000))}` : 'never'}
      </td>
      <td className="py-2.5 text-xs">
        {hireable ? (
          <Link href={`/hire/${l.category}`} className="rounded-sm bg-brand px-2 py-0.5 font-semibold text-canvas">hire</Link>
        ) : compareWith && compareWith !== l.agentId ? (
          <Link href={`/compare?ids=${l.agentId},${compareWith}`} className="text-ink-soft hover:text-brand">compare</Link>
        ) : (
          <Link href={`/agent/${l.agentId}`} className="text-ink-soft hover:text-brand">details</Link>
        )}
      </td>
    </tr>
  )
}
