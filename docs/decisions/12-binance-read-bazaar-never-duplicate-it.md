# Decision: read the B402 Bazaar, never duplicate it and print its ceiling

Recorded by `12-BINANCE.md` decision 9.

## The decision

The Bazaar is read as a cross-check plus a join, never republished as inventory. Where a payout address
matches an ERC-8004 agent wallet the row gains a proof-of-payment line, with the ceiling on that join
printed beside it. The Bazaar read carries its own row in the third-party input table.

## The alternative rejected

Present the 979 Bazaar endpoints as marketplace inventory, which would look like instant supply on day one.

## Why

Eight payout addresses hold all of it and one of them holds 941 of the 979 resources, 96 percent. Only one
of the eight owns an ERC-8004 agent at all. A catalogue ranked by count would republish one operator's list
under our name, which is the same failure as ranking the registry by count and getting one publisher's
template.

The join is real and small. It pairs identity with proof of payment, which neither index has alone and it
decorates about one row today. Saying that in the same breath as the join is what keeps it a cross-check
rather than a claim.

The listing side is also honest about what the Bazaar can support: its `quality` field is documented plus
null on every entry across three endpoints, so nothing here leans on its usage counts. Only the fact of
listing, which requires a confirmed settle, plus the last-updated timestamp are usable.

A shipped input with no entry in the third-party table fails the publish gate, which is why the Bazaar read
gets the same treatment as the market-data source we refused.

## What it binds

`12-BINANCE.md`'s Bazaar section, `02-THESIS.md`'s treatment of concentrated supply, `06-QUALITY.md` which
cannot count a foreign usage number, `10-DOCS-AND-POLICY.md`'s input table plus its publish gate,
`15-SYSTEM.md`'s reconciler which renders each source's lag.

## What would make us revisit it

More publishers on the Bazaar, which would make the join cover more than a handful of rows. A usable quality
field, which would need to be non-null before it could be read at all.
