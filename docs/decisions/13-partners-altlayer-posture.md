# Decision: 8004scan is a credited cross-check and AltLLM leaves the compare path

Recorded 2026-09-05 by `13-PARTNERS.md`. This is where the third pass overturns the partner row for the
AltLayer track.

## What passes one and two said

`../ARCHITECTURE-PART-2.md` section 13 maps the AltLayer track as "Primary index + profile link + score;
AltLLM as alternate compare provider", with the index listed as MVP because "it is the index" and the
AltLLM route as a stretch behind the compare engine. `../ARCHITECTURE.md` section 3.2 designs the indexer
with the 8004scan Pro API as primary and a log backfill as the fallback.

## What this pass decides instead

1. **8004scan is not the index of record.** The chain is primary through `_lastId` plus a Multicall3 sweep,
   the second index is a cross-check with its own lag rendered on our status page. The log tail is
   bounded change detection rather than a backfill. `15-SYSTEM.md` owns the pipeline and states the same
   deviation.
2. **We keep six real uses of 8004scan and credit every one**: per-agent enrichment, its cross-chain links,
   its v5 score cited with its published weights and its date, its own freshness disclosure, the
   unauthenticated re-verify trigger plus its public IPFS gateway fan-out. Nothing foreign renders as ours
   and no bulk output is redistributed.
3. **AltLLM leaves the compare path entirely.** No language model runs in the render path. The one honest
   home is an offline operator-side triage queue over unshelved rows and the hand-labelled precision
   sample, wired only if a real call drops into the existing OpenAI-compatible provider layer, with the
   output never becoming a listing field.

## Why

The index half fails on measurement rather than on design. 8004scan's chain-56 indexer self-reported
`status: down` with a canonical checkpoint at block 119,687,744, about 32 hours behind head, while
`/status/summary` reported the database healthy. It holds 304,281 BSC agents against 334,935 on chain at
block 120,027,164 and returns 404 for token ids whose `ownerOf` answers. Its read path returned non-200 on
20.8% then 56.7% of calls across two windows in one day. There is no bulk export, no `updated_after`
filter, no since-block cursor and no webhook for a new agent, so even a healthy day cannot serve change
detection (`R05-8004scan-api.md`, `R14-rivals.md`, `MEASUREMENT.md`).

The consequence is observable rather than theoretical. `R14-rivals.md` read a rival marketplace that
single-sources 8004scan while its BSC indexer was down: the landing page rendered "Registry sync pending",
the word "Offline" four times and three of four headline metrics as `--`. That is the page a judge would
have opened during judging week. Pass one could not know this, because nobody had measured the index.

The AltLLM half fails on a decision taken elsewhere in this pass rather than on the partner. Compare is a
deterministic render over stored fields with a freshness stamp per number, `categoryConfidence` is a
published five-value ladder rather than a model score. Keeping every model out of the render path is the
strongest form of the prompt-injection defence for text an agent supplied. Nothing about AltLLM is
verified in this research set either: no endpoint, no request shape, no terms page, no credit amount. So
the posture is stated rather than claimed.

Credit is not reduced by any of this. The track's artifact is a build that uses the index inside the limits
its own measurements set, credits it wherever it appears, files the Pro-tier form and re-derives every
published number from the on-chain registry, which needs no grant. Its OpenAPI `info` object carries no
`termsOfService`, no `license` and no `contact`, so there is no clause to quote and no basis for
redistributing its output (`R15-compliance.md`).
