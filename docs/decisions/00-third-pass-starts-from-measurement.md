# Decision: the design starts from a measured population, not from the programme page

Made before any document in this set was written. It is the reason there is a third pass at all.

## The decision

Measure the thing first, then design. No document in `three/` may assert a fact about the BSC agent
population that `three/research/` does not carry with the command that produced it. Verified and
unverified are labelled separately, every time.

## The alternative rejected

Write the architecture from the programme brief plus the ERC-8004 spec, which is what the first two
passes did and which is what a four-day deadline argues for.

## Why

The measurement changed the problem. Measured 2026-09-05 on chain 56 at block 120,027,164, with a
600-agent uniform sample (splitmix64, seed `20260905`, reproducible from
`research/tools/r11-sample.mjs`):

* 334,935 agents ever registered, from one `eth_getStorageAt` on the registry counter.
* 12 of 600 are machine-callable. **0 of 600 are payable by a stranger.** All twelve are one product
  on one host under twelve owner addresses.
* 215 of 600 carry one byte-identical registration document under 215 distinct owners.
* The four mandated categories hold about 518 agents, 0.17 percent of the index, on the most generous
  single term each. `trading` alone matches 129,023.
* 111 addresses wrote all 29,712 on-chain feedbacks. Of 950 sampled rows, 0 tag a financial outcome.

So the discoverability problem in the brief is real and it is not the problem it looks like. Listing
the registry is easy and worthless. The scarce thing is an agent a stranger can find, understand, pay
and get work back from. Measuring also corrected the prior pass's own claims: agent id 1 is
`ClawNews` rather than a reference agent and `getAgentWallet` is non-zero for 600 of 600 because
`register` writes `msg.sender` at mint.

## What it binds

Every document. `02-THESIS.md` is built on it directly. `research/MEASUREMENT.md` is the evidence and
`01-GROUND-TRUTH.md` is the reconciled set every other document cites.

## What would make us revisit it

Nothing in the method. The numbers themselves move, about 2,110 registrations a day, so the moving
set is re-read the day the submission goes out (`01-ground-truth-re-read-the-moving-numbers.md`). A
design change needs a new measurement rather than a new opinion.
