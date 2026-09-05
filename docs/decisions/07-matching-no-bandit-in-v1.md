# Decision: no bandit and no auction in v1, with the counters shipping anyway

Recorded by `07-MATCHING.md` decisions 2 and 3, with `06-QUALITY.md` agreeing from the score side.

## The decision

The v1 selector is the banded draw. Thompson sampling is not shipped and a sealed-bid auction is
specified rather than built. The counters a bandit needs are written from job one, so the switch is a
config change. The switch condition is published: at least 8 agents in a category each holding 5 settled
jobs.

## The alternative rejected

Thompson sampling now, which won the published production comparison on real data at 3.72 percent CTR
regret against 4.14 for LinUCB, 4.98 for epsilon-greedy plus 5.00 for exploit-only and which is
specifically robust to the delayed rewards a paid job produces. Also rejected: an auction as the v1
selector.

## Why

A Beta posterior with no observations is the category prior, so a bandit at launch is the prior plus
noise. That is the one thing the why-this-agent panel cannot explain and an unexplainable dispatch is
worse for us than a slightly worse dispatch.

The auction fails on supply rather than on theory. It needs bidders that can price a job on demand
inside the buyer's latency budget and the measurement says they do not exist: 12 of 600 machine-callable,
0 of 600 payable by a stranger, 97 lifetime ERC-8183 providers of which 28 hold a completed job, with one
address holding 56,167 jobs and whether that address is one operator or a router **unverified**. Where an
auction ever ships it is first price with a published reserve, because the live multi-slot marketplace
auction in the field is pay-your-bid and the generalised second-price version is not truthful anyway.

Publishing the switch condition is what stops this being taste. It is a threshold anybody can check
against our own counters.

## What it binds

`06-QUALITY.md`'s exploration section, `07-MATCHING.md`'s selection policy plus its panel,
`15-SYSTEM.md` which writes the counters, `10-DOCS-AND-POLICY.md`'s ranking disclosure.

## What would make us revisit it

The published threshold being met in any category. The counters exist for exactly that moment.
