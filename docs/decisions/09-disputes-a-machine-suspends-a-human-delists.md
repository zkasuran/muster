# Decision: a machine may suspend and block payment. Only a human confirms a delisting

Recorded by `09-DISPUTES.md` section 11 plus its decisions table, with `06-QUALITY.md` agreeing from the
enforcement side.

## The decision

Automatic actions stop at suspension: a detection, a screening verdict or a prohibited-use hit can close
the hire path in the same second and every automatic restriction writes its reasons. Delisting needs a
person. In the first hour of an incident the fast actions are suspend plus enumerate. No money moves on a
machine's decision.

## The alternative rejected

Automatic delisting on a screening verdict or a detection, which is faster. Also rejected: an emergency
refund button for the first hour.

## Why

Every automated detection here has a false-positive path and a published delisting is an adverse decision
with reasons plus an appeal behind it. Automating it would put automated means on an action the quality
document promises is never automated and a ring accusation we cannot defend is an appeal we lose.

Suspension gets what the speed was actually for. It stops new exposure immediately and it is reversible,
so the cost of a false positive is minutes rather than an operator's standing.

The refund button fails on the rails themselves. Every money movement in an incident is either
irreversible on the x402 rail or not ours to make on the escrow rail, so a button that promises otherwise
is theatre. Money follows a decision and the decision follows the evidence.

## What it binds

`06-QUALITY.md`'s response ladder plus its delisting rules, `09-DISPUTES.md`'s runbook plus its takedown
path, `05-ONBOARDING.md`'s state transitions, `14-GAPS.md`'s admin CLI where the verb carries a mandatory
reason, `15-SYSTEM.md`'s five admin verbs.

## What would make us revisit it

A detection with a measured false-positive rate low enough to defend, on an action a suspension does not
already cover. Nothing in the current set qualifies.
