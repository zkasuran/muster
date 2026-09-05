# Decision: the chain is the primary index. A foreign index is a cross-check with its lag on screen

Recorded by `15-SYSTEM.md` section 0 as the one deviation stated up front, with `11-BNB-STACK.md`
section 2.2 owning the enumeration.

## The decision

The catalogue comes from two reads that work: one `eth_getStorageAt` for the registry counter, then
`aggregate3` through Multicall3 for the bodies, about 30.5 minutes for the whole registry. Change detection
is a `tokenUriHash` diff with a bounded log tail as the second layer. The sponsor index is rendered as a
cross-check with its own lag, its own status plus the size of its shortfall against chain.

## The alternative rejected

8004scan as the primary index with a from-genesis `eth_getLogs` backfill as the fallback, which is what
passes one and two of this lane designed.

## Why

Measured, all on 2026-09-05:

* Its BSC indexer self-reported `status: down` with a canonical checkpoint about 32 hours stale, while its
  own summary endpoint said the database was fine.
* It holds 304,281 BSC agents on one endpoint against 334,935 on chain, a shortfall of 30,654, then 303,461
  on its list endpoint, which is 31,474 short plus 820 below its own other figure. One vendor publishing two
  totals for the same chain is itself the Data Quality exhibit.
* It 404s agent ids whose `ownerOf` answers.
* Its read path returned non-200 on 20.8 percent then 56.7 percent of calls in two windows on one day.
* There is no bulk export, no `updated_after` filter, no since-block cursor plus no agent webhook.

The log backfill is not available either: free BSC endpoints cap `eth_getLogs` at 5,000 blocks and refuse
archive depth, which is about 8,200 requests over the 40.93 million blocks since the first registration.

A rival's landing page was visibly broken from exactly this dependency while we were reading it, serving
`--` for three of four headline metrics.

## What it binds

`02-THESIS.md`'s read-the-chain-first clause, `03-TAXONOMY.md`'s freshness ceilings, `11-BNB-STACK.md`'s
enumeration plus its RPC pool, `13-PARTNERS.md` where the sponsor index is a credited cross-check,
`15-SYSTEM.md`'s indexing pipeline plus its reconciler.

## What would make us revisit it

The sponsor index recovering plus publishing a cursor or a bulk export. Even then it stays a cross-check,
because a second source with its lag on screen is the argument. Nothing we serve blocks on it either way.
