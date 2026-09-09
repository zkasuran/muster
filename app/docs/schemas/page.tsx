import { headers } from 'next/headers'
import { DocSection, Code, LiveLink } from '@/components/docs'
import { build402, paymentRequiredHeaders } from '@/lib/b402'
import { previewContract } from '@/lib/preview'
import { envelope } from '@/lib/v1'
import { constantsJson } from '@/lib/constants-json'
import { FIRST_PARTY } from '@/lib/agents'
import { publicOrigin } from '@/lib/origin'

export const metadata = { title: 'Schemas' }

/**
 * [doc 10] docs/10-DOCS-AND-POLICY.md section 3, the schemas page. Every shape here is the real one,
 * produced by the same code the routes run: the 402 from lib/b402, the transport header from the
 * same module, the preview contract from lib/preview, the paged envelope from lib/v1 and the
 * constants from lib/constants-json. None of it is retyped, so a reader diffing the page against the
 * wire finds them identical.
 */
const ZERO = '0x0000000000000000000000000000000000000000'

export default async function SchemasPage() {
  const origin = publicOrigin(await headers(), 'https://muster.zkasuran.dev')
  const payTo = process.env.MUSTER_PAYTO ?? ZERO
  const agent = FIRST_PARTY.find((a) => a.slug === 'rebalancing')!

  const challenge = build402({
    resource: `${origin}/api/agent/${agent.slug}/jobs`,
    description: agent.summary,
    priceBase: agent.priceBase,
    token: 'USD1',
    payTo,
  })
  const envelopeHeaders = paymentRequiredHeaders(challenge.body)
  const preview = previewContract('health-factor')
  const pagedShape = envelope([], 0, 1, 50)

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
      <h1 className="font-display text-3xl md:text-4xl">Schemas and shapes</h1>
      <p className="mt-2 max-w-3xl text-ink-dim">
        The exact shapes the API returns, rendered here from the same generators the routes call.
        Amounts are decimal strings in base units with the token and its decimals beside them, never
        floats. Every list is the same paged envelope. Nothing on this page was typed by hand.
      </p>

      <DocSection title="The 402 payment challenge">
        <p className="mb-1 text-sm text-ink-dim">
          What an unpaid request to a paid endpoint returns. The <span className="num">amount</span>{' '}
          and the v1 <span className="num">maxAmountRequired</span> carry the same value so a client
          reading either spelling finds it. Built live by <span className="num">lib/b402.ts</span>{' '}
          for the rebalancing agent.
        </p>
        <Code label={`HTTP ${challenge.status}, body`}>
          {JSON.stringify(challenge.body, null, 2)}
        </Code>
      </DocSection>

      <DocSection title="The x402 transport envelope">
        <p className="mb-1 text-sm text-ink-dim">
          x402 v2 also carries the 402 as a <span className="num">PAYMENT-REQUIRED</span> response
          header, base64 of the same JSON, so a client that reads the header rather than the body
          reads the same fields. These are the real headers the route sets.
        </p>
        <Code label="response headers">{JSON.stringify(envelopeHeaders, null, 2)}</Code>
      </DocSection>

      <DocSection title="The preview contract">
        <p className="mb-1 text-sm text-ink-dim">
          A GET with <span className="num">?preview=1</span> returns this free, so a buyer reads what
          they are buying before they pay. It carries no computed result. From{' '}
          <span className="num">lib/preview.ts</span>, the same definition the route serves.
        </p>
        <Code label="GET /api/agent/health-factor?preview=1">
          {JSON.stringify(preview, null, 2)}
        </Code>
      </DocSection>

      <DocSection title="The paged list envelope">
        <p className="mb-1 text-sm text-ink-dim">
          Every list under <LiveLink href="/v1/openapi.json">/v1</LiveLink> is returned in one
          envelope, with <span className="num">pageSize</span> capped at 100. Each item carries a
          derived <span className="num">firstParty</span> boolean, so the first-party label travels
          with the data and not only with the page. The wrapper, from{' '}
          <span className="num">lib/v1.ts</span>:
        </p>
        <Code label="{ items, page, pageSize, total, totalPages }">
          {JSON.stringify(pagedShape, null, 2)}
        </Code>
        <p className="mt-2 text-xs text-ink-faint">
          The per-item schemas are in the OpenAPI document at{' '}
          <LiveLink href="/v1/openapi.json" />. Try{' '}
          <LiveLink href="/v1/listings?hireable=1" /> for a populated envelope.
        </p>
      </DocSection>

      <DocSection title="The constants file">
        <p className="mb-1 text-sm text-ink-dim">
          Every constant a builder needs, machine readable at <LiveLink href="/constants.json" />.
          Generated from the code&apos;s own tables, deterministic, so it can be diffed against the
          published prose. Read <span className="num">decimals()</span> at runtime rather than
          trusting the table, which the token docs call the source of truth.
        </p>
        <Code label="GET /constants.json">{constantsJson()}</Code>
      </DocSection>
    </main>
  )
}
