# Decision: `three/` is the architecture. It wins over passes one and two wherever they disagree

Made before any document in this set was written, recorded here because every document depends on it.

## The decision

`three/` is the current design. Where it disagrees with `../ARCHITECTURE.md`,
`../ARCHITECTURE-PART-2.md` or `../ONBOARDING.md`, this folder wins, the earlier text is treated as
superseded on that point and the disagreement is written down in this folder rather than left for a
reader to notice.

## The alternative rejected

Patch the two earlier passes in place and keep one corpus or treat all three passes as equally live
and let each document cite whichever it prefers.

## Why

Passes one and two were written before anyone measured the agent population the product serves. They
are not sloppy, they are unmeasured and the specific places they are wrong are load bearing:

* The indexing pipeline. `../ARCHITECTURE.md` section 3.2 makes 8004scan the primary index with a
  from-genesis log backfill as the fallback. Both halves are invalidated: the sponsor index
  self-reported `status: down` on BSC with a checkpoint about 32 hours stale and free BSC endpoints
  cap `eth_getLogs` at 5,000 blocks. `15-SYSTEM.md` section 0 carries the replacement.
* The payment rail. The earlier passes assume a rail that does not exist on BSC. See
  `00-payment-rail-is-not-usdt.md`.
* The E1 bond held in an escrow of ours, which `05-ONBOARDING.md` decision 3 replaces with a
  permissionless contract.
* The ERC-8004 endpoint-domain proof as a hard go-live gate, which `05-ONBOARDING.md` decision 4
  demotes to a badge.
* An exploration rate of 10 percent over impressions, which nobody counted. `06-QUALITY.md` and
  `07-MATCHING.md` replace it with one shelf slot plus a rate over dispatches we publish.

A corpus that answers the same question two ways cannot be defended in a live conversation and the
answer a reader reaches would depend on which file they opened first.

## What it binds

Every document in `three/`, plus this folder. `15-SYSTEM.md` section 0 records the indexing
deviation, `05-ONBOARDING.md` the bond and the domain proof, `07-MATCHING.md` the exploration rate,
`08-MONEY.md` the rail.

## What would make us revisit it

An earlier pass turns out to carry a measurement or a primary-source read that `three/research/`
lacks. The fix then is to bring that evidence into `three/research/` and re-derive the design here,
never to reopen the earlier document as authority.
