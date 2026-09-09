import { FEE_SCHEDULE, documentedFee, chargedFeeBase } from '@/lib/fee'
import { formatTokenAmount } from '@/lib/money'

/**
 * [doc 08] The marketplace fee, disclosed the same way on the hire page and the receipt. This
 * deployment takes no fee: the buyer signs exactly the operator's price and nothing else, and the
 * 402 challenge price is authoritative on any contradiction. The documented schedule is shown so
 * the zero is a checkable arithmetic rather than a bare claim. Nothing here changes what the buyer
 * signs.
 */
export function FeeDisclosure({ priceBase, tokenSymbol }: { priceBase: string; tokenSymbol: string }) {
  const doc = documentedFee(priceBase)
  const priceDec = formatTokenAmount(priceBase, FEE_SCHEDULE.decimals)
  const floorDec = formatTokenAmount(FEE_SCHEDULE.floorBase, FEE_SCHEDULE.decimals)
  const minDec = formatTokenAmount(FEE_SCHEDULE.minBrokeredBase, FEE_SCHEDULE.decimals)

  return (
    <section className="mt-8 rounded-lg border border-line bg-panel p-4">
      <h2 className="text-sm uppercase tracking-wide text-ink-faint">Marketplace fee</h2>
      <p className="num mt-2 text-2xl text-ink">fee 0</p>
      <p className="mt-1 text-sm text-ink-dim">
        This deployment takes no fee. You sign exactly the operator&apos;s price of {priceDec}{' '}
        {tokenSymbol} and nothing else. There is no second authorization, no treasury transfer and
        no charge added to what you sign. Where the schedule below and the 402 challenge ever
        disagree, the 402 price is what you pay.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs md:grid-cols-4">
        <Kv k="Charged here" v={`${formatTokenAmount(chargedFeeBase(), FEE_SCHEDULE.decimals)} ${tokenSymbol}`} />
        <Kv k="Schedule rate" v={`${FEE_SCHEDULE.basisPoints} bps`} />
        <Kv k="Schedule floor" v={`${floorDec} ${tokenSymbol}`} />
        <Kv k="Minimum brokered" v={`${minDec} ${tokenSymbol}`} />
      </dl>
      <p className="mt-3 text-xs text-ink-faint">
        {doc.brokered
          ? `Under the documented schedule a ${priceDec} ${tokenSymbol} listing would pay ${formatTokenAmount(doc.feeBase, FEE_SCHEDULE.decimals)} ${tokenSymbol} (${doc.bindingLeg === 'percentage' ? '200 bps' : doc.bindingLeg === 'both' ? 'floor and 200 bps meet' : 'the floor binds'}). This deployment charges none of it.`
          : `Under the documented schedule this ${priceDec} ${tokenSymbol} listing is below the ${minDec} ${tokenSymbol} minimum brokered price, so the schedule would charge nothing either. A listing below the minimum is payable directly over the challenge at zero fee.`}
      </p>
    </section>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-ink-faint">{k}</dt>
      <dd className="num text-ink-soft">{v}</dd>
    </div>
  )
}
