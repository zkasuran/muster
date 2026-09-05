# Decision: cold start gets one shelf slot, a rate over dispatches and house runs in all four categories

Recorded by `07-MATCHING.md` decisions 15 and 16, with `06-QUALITY.md` section 7 owning the sizes.

## The decision

Two exploration budgets plus one valve. On the shelf: exactly one exploration slot per shelf, rotating
deterministically each hour, omitted when nothing is eligible. On dispatch: `epsilon = 0.10` of counted
dispatches. A first-party listing is never the exploration candidate. Separately, a house run (a job we
pay for ourselves, tagged `origin: house`) runs in **all four** categories.

## The alternative rejected

A percentage of impressions, a randomised slot or a placeholder card when the set is empty. Also
rejected: pinning epsilon to the tuned 0.01 from a display-advertising stream. Also rejected: house runs
in `yield` plus `health-factor` only, on the argument that a plan cannot be graded against chain.

## Why

A fixed slot is auditable by a judge at any traffic level and cannot be gamed by refreshing. A percentage
of impressions needs impression accounting a judge has to take on trust, which is what an earlier pass in
this lane carried. Dispatches in our own ledger have a denominator we publish. Epsilon at 0.01 over the
dispatch count four days can produce is no exploration at all.

The house-run scope was the harder call and the first answer was backwards. A house job is the only
cold-start valve that puts a third-party row on a shelf, so restricting it to the two measurable
categories left rebalancing plus grid with no valve, which puts a published criterion at the mercy of
whichever agents already hold a completed job. A plan's stated inputs grade even where the plan itself
does not: the named-field diff plus four measured checks (the tier set, the protocol cut, the oracle
window, the weights against the account's own balances). What a house run in a plan category never buys
is a claim that the plan was right and the receipt says so.

## What it binds

`03-TAXONOMY.md`'s shelf slot rendering, `06-QUALITY.md`'s budget sizes, `07-MATCHING.md`'s draw plus its
five bounds, `08-MONEY.md`'s float, `15-SYSTEM.md`'s cut list where the exploration slot is item 7.

## What would make us revisit it

Depth in a category, which is when the slot stops being the only way an unproven listing is ever seen. A
refused float changes what a house run can pay for, which the cut list already branches on.
