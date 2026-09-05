# Decision: Greenfield is not the store of record. The bounded mirror is not scheduled

Recorded 2026-09-05 by `11-BNB-STACK.md`. This is where the third pass disagrees with the first two and
with `R16-reuse.md`'s verdict on them.

## What passes one and two said

`../ARCHITECTURE-PART-2.md` 11.3 puts three artifact classes on BNB Greenfield as a stretch with a small
MVP demo slice: the rich review body behind `feedbackURI` anchored by the on-chain `feedbackHash`, each
published reputation snapshot, plus dispute deliverable evidence and an archive of the hash-chained audit
log. It hedges the whole section on one unread fact, in its own words, that "if a payment account runs
dry the stored data can be permanently deleted", then commits the MVP slice to a pre-funded account.

`R16-reuse.md` judged that section **keep as stretch**, with the reason stated plainly: "The deletion
behaviour is never verified and it is the whole reason the section is cautious, so it stays a stretch
until someone reads the billing docs." `SPINE.md` carries Greenfield billing on its Unverified list and
calls it "the whole reason any Greenfield use stays a stretch".

## What this pass decides instead

1. **Greenfield is not the store of record for evidence bundles, receipts or job artifacts.**
   `evidence-store` is content-addressed storage we run, served from the same public origin as the site.
2. **The bounded mirror is documented rather than scheduled.** It covers one artifact class, the published
   quality snapshot. The earliest it can ship is after 2026-09-09.
3. **The deletion clause is no longer the reason for either.** It is verified now, quoted from
   Greenfield's own billing doc, then found to be the least of the three problems.

## Why

The verification ran end to end rather than stopping at the docs. It moved the argument off the fact
everybody was waiting on.

Cost is not a constraint. At the live prices, ten thousand objects at the 128 KiB minimum charge lock
0.000293 BNB, which is 23 cents, for the full 180-day reserve. Pre-funding past the 2026-09-23 close of
judging is trivial, so pass one's worry is answered by arithmetic.

The deletion clause is real and it is small. Greenfield's own words: an out-of-balance account has its
streams closed, its downloads downgraded and "The objects will be deleted by the SPs if no fund is
provided within the predefined threshold." With 180 days of reserve and `forced_settle_time` giving a
further 7 days of warning, a funding alarm closes it.

**The serving path is what disqualifies it.** The same sealed object, fetched anonymously from four
public storage providers inside a minute, returned 200 from one and HTTP 404 with error 85102 from the
other three. A second object in a different bucket reproduced it, so it is not one broken bucket. The
programme rule is that every URL the submission cites resolves to 200 for an anonymous fetch. A
Greenfield object URL satisfies that only from the provider that holds the bytes. Resolving which
provider that is has no working public route: `/greenfield/sp/storage_providers` and the whole
`virtualgroup` family answer `code 12 Not Implemented`, so the resolution is a protobuf decode through
`abci_query` or a JS SDK last published 2025-05-07. One provider changing its serving behaviour inside
the judging window turns published evidence into a 404.

Scheduling is why the mirror is not a stretch item either. `15-SYSTEM.md` owns the build order and it has
no Greenfield block, no row in the cut list and no line in the day-lost table. A half-day item with no
hour allocated and no owner is not a stretch, it is a wish, so it is written down as next with a
specified recipe instead of carried as a conditional nobody can trigger.

## What we give up

The one honest sentence a working slice would buy: the snapshot behind our score lives on BNB Greenfield
and here is the command that proves the bytes are the bytes. That is a real loss on the Data Quality
criterion and on ecosystem credit. It is also why 5.6 keeps the full recipe rather than deleting it.
What survives is the property that mattered: the content hash plus the `recomputeCommand` in every
receipt works with any storage, so the recompute claim does not depend on a second chain.

## Sources

`11-BNB-STACK.md` section 5 for every read: the live payment and storage params, the price epoch, the
eight-provider ABCI list, the four-provider fetch, the `Checksums[0]` identity proved on a real 767-byte
object, the disabled REST routes and the SDK's publish date. `ARCHITECTURE-PART-2.md` 11.3 and
`R16-reuse.md` for what is being overturned. `SPINE.md` for the Unverified entry this closes.
`00-PROGRAM.md` for the anonymous-fetch rule and the judging window. `15-SYSTEM.md` for the build order
that has no room for it.
