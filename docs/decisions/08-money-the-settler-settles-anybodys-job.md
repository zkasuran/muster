# Decision: the settler calls `settle` for anybody's job, not only ours

Recorded by `08-MONEY.md` section 5 plus `02-THESIS.md` section 9.

## The decision

The `settler` component calls `settle` on the ERC-8183 evaluator router the moment a job's dispute window
elapses, for any job on the kernel, under a published per-run cap with the gas budget printed beside the
count.

## The alternative rejected

Settle only our own jobs, which is what a marketplace minding its own business would do.

## Why

`settle` is permissionless, verified by a staticcall from an unrelated funded address returning empty on
11 of 11 sampled jobs whose window had elapsed. It reverts on a job that was never registered. So the
backlog is settleable by anybody and today it is sitting unsettled: the census counts 27,170 jobs at
`SUBMITTED`, with the router's own in-flight counter at 28,326 and the two disagreeing by 123, so both
numbers are published rather than one being picked.

Settling for everybody produces paid third-party outcomes we did not pay for, which is the only supply
source that costs us nothing but gas. One `settle` is about 141,744 gas, roughly 0.0000071 BNB, so the
whole in-flight set costs under 0.2 BNB. Saving that would trade the cheapest demonstrable service in the
document for a rounding error.

The cost is concentration and it is disclosed rather than smoothed. One address holds 99.0 percent of
jobs plus 96.3 percent of paid value, so it dominates whatever the settler produces. Its jobs are settled
like anybody else's, its record is weighted as a single-client record and whether that address is one
operator or a platform router is **unverified**. Whether anybody else runs `settle` is also
**unverified**, so the claim we make is only that the backlog is unsettled today.

## What it binds

`02-THESIS.md`'s supply sources, `06-QUALITY.md`'s single-client weighting, `08-MONEY.md`'s gas budget,
`15-SYSTEM.md`'s `settler` inside the facilitator process, `11-BNB-STACK.md`'s gas arithmetic.

## What would make us revisit it

Somebody else running the same job, which would make it unremarkable rather than wrong. A gas price rise
that turns the per-run cap into the binding constraint, which the published cap already handles.
