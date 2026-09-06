# The intersection of identity and proven revenue on BSC is one agent, so we operate the supply

**Measured 2026-09-06. It changes the critical path.** The thesis rested on joining two
indexes: ERC-8004 identity against B402 Bazaar's proof that a payment cleared. The join was
built, run against the live chain and against our own index of the full registry. Here is what
it returns.

| | |
| --- | --- |
| ERC-8004 identities on BSC | **336,339** at block 120,208,122 |
| Paid endpoints in B402 Bazaar | **979**, all `eip155:56` |
| Distinct payout addresses behind them | **8**, one holding 941 resources, 95% of all payment options |
| Payout addresses that also hold an ERC-8004 identity | **1 of 8** |
| Agents in the intersection | **1**, id `127417`, owner `0x515e7bce…f2f8cc` |
| That agent's registration record | **empty**: no name, no description, no endpoint, no x402 claim |
| What it actually sells | image generation, LLM calls, text to speech, music, video |
| Of those 15 paid endpoints, how many match one of the four shelves | **zero** |

So the finding is not that the join is thin. It is that **no agent on BNB Smart Chain today is
both provably payable and in any of rebalancing, grid trading, yield or health factor.** The
identity layer and the payment layer are near-disjoint populations, and where they touch the
identity says nothing useful while the payments are real.

That last row is the discoverability problem stated exactly, and it is worth more to a judge
than a full shelf of unverifiable rows. It stays on the site as a measurement.

## What follows

Two of the three published criteria cannot be met by indexing alone. Agent Diversity asks for
all four categories at equal depth. Functionality asks that a stranger can activate an
agent end to end. Neither is satisfiable when the payable population in those categories is
empty, so a marketplace that only indexes would ship four empty shelves and no hire.

**We operate four reference agents, one per shelf, disclosed as ours on every row that
renders.** This was already the direction in
`decisions/02-thesis-first-party-supply-one-per-category.md`. The measurement promotes it
from a hedge to the critical path.

Three conditions on that, because otherwise it is a portfolio pretending to be a marketplace.

1. **They do real work from live reads.** Yield reads Venus supply rates on chain. Health
   factor computes a real health factor with the real formula. Rebalancing computes drift
   against a live PancakeSwap pool. Grid computes a level ladder against a live price. No
   fixtures, no canned responses.
2. **They are payable the same way any listing is**, over B402 with an EIP-712 signature and no
   privileged path. If a first-party agent needs a shortcut the marketplace does not offer
   everyone, the marketplace is not real.
3. **Disclosure is on the row, not in a footnote.** Every first-party listing carries an
   "operated by us" marker in the shelf, in search, in compare and on the listing page, while
   `07-MATCHING.md`'s anti-favouritism rule keeps them out of any default ranking advantage.

## What we do not do

We do not manufacture third-party supply, register agents we do not operate, nor promote a
`declared` row to `payable` to fill a shelf. Third-party rows keep the rung the evidence
supports, which for almost all of them is `declared` or lower. The shelves show both
populations with the difference visible.

## Rejected

**Ship four empty shelves and call it honest.** It is honest and it scores nothing on two of
three criteria. Honesty is the constraint, not the deliverable.

**Reclassify the joined agent into a shelf to get a non-zero number.** It sells image
generation. Putting it on the yield shelf would be exactly the category dishonesty this build
argues against.

**Widen the four categories until something fits.** The programme names them and the rubric
scores depth in them, so widening is losing while looking busy.
