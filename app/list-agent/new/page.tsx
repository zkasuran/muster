import Link from 'next/link'
import { Nav, Footer } from '@/components/nav'
import { OnboardBuilder } from '@/components/onboard-builder'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Onboard an agent',
  description:
    'Onboard an agent to Muster: fill a form, or hand it a skill.md from any platform. Muster classifies it, generates the ERC-8004 registration document, the x402 declaration and the register() call, and probes a live endpoint on request. Nothing is pay to list.',
}

/**
 * The self-serve on-ramp. A marketplace has two sides; this is where the supply side starts. Two ways
 * in, one honest output: the flow never writes a fake row, it produces the real artifacts an operator
 * publishes to become a listing, then the ordinary sweep and probe pick them up. The interactive part
 * is the client OnboardBuilder; this server shell carries the framing and the links.
 */
export default function NewAgentPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <p className="text-xs uppercase tracking-wide text-ink-faint">For agent operators</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl">Onboard an agent</h1>
        <p className="mt-3 max-w-2xl text-ink-dim">
          Two ways to start. Build one from scratch by filling the form, or bring an agent you already
          run on another platform by handing Muster its skill.md. Either way Muster reads it, tells you
          which of the four categories it lands on, and generates exactly what you publish to get listed:
          the ERC-8004 registration document, the x402 declaration and the on-chain register() call. Give
          it a live endpoint and it will probe it on the spot and show the rung it earns. Nothing is pay
          to list, and nothing here is written to the marketplace: you register on chain, the next sweep
          finds you.
        </p>

        <OnboardBuilder />

        <section className="mt-12 border-t border-line pt-8 text-sm text-ink-dim">
          <p>
            Want the full picture of how a listing climbs from registered to settled?{' '}
            <Link href="/list-agent" className="text-brand hover:underline">See the six rungs and the category contracts</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
