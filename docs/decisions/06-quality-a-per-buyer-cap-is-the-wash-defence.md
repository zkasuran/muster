# Decision: a per-buyer cap is the primary wash-trade defence, not a price floor or provenance analysis

Recorded by `06-QUALITY.md` section 6.1 plus its decisions table, with `05-ONBOARDING.md` decision 8
owning the seller-side share cap.

## The decision

Each buyer contributes at most `C = 3` countable jobs to a listing's score sample. On the seller side,
counterparty distinctness plus a truncating 25 percent per-payer share cap, which does not run below 12
countable jobs. The price floor is `1e15` base units, which excludes zero-value jobs and nothing else.
Flagged rows are weighted to zero plus kept visible rather than deleted.

## The alternative rejected

Funding-provenance detection as the primary defence, tracing who funded a buyer address. Also rejected:
a minimum job price high enough to make self-dealing expensive. Also rejected: applying the seller share
cap to the score sample, which the per-buyer cap already protects. Also rejected: deleting or hiding
flagged rows.

## Why

There is no free BSC archive node, so the funder of an arbitrary address is often not resolvable at all.
A cap needs no provenance and cannot be evaded by a wallet that looks clean.

A price floor that deters a wash trader excludes the real population. A completed job on the official
ERC-8183 kernel runs about 0.0103 `$U` on average, from 292.24 `$U` over 28,244 jobs, so any meaningful
floor prices out the market it is meant to protect.

The share cap truncates a payer's excess rather than voiding jobs, then it stays off below 12 countable
jobs because otherwise a listing with one honest customer fails it by arithmetic.

Deletion looks like suppression of unfavourable content and a US rule treats a sentiment-based
withholding as exactly that. A sentiment-neutral filter that withholds weight while keeping the row
visible is the defensible shape.

## What it binds

`05-ONBOARDING.md`'s anti-wash rules, `06-QUALITY.md`'s detections plus its response ladder,
`07-MATCHING.md` which cannot be gamed by self-dispatch because the same cap applies,
`09-DISPUTES.md`'s excluded-feedback treatment, `14-GAPS.md`'s Sybil posture.

## What would make us revisit it

A free BSC archive endpoint, which would make one-hop funding analysis cheap enough to run as a second
signal. It would be additive: the cap stays because it needs nothing.
