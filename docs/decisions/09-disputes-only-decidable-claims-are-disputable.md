# Decision: only claims decidable from captured bytes are disputable and the rest is named out of scope before the hire

Recorded by `09-DISPUTES.md` sections 1 and its decisions table.

## The decision

A dispute can be opened on anything a deterministic check can settle from evidence we captured: the
deliverable's hash, the named output fields, the units, the reconciled arithmetic, the timing against the
published deadline. Anything else, including whether the advice was good or the outcome profitable, is
listed as out of scope on the listing page before the buyer hires.

## The alternative rejected

A general satisfaction dispute in the consumer-marketplace style, which sounds friendlier.

## Why

To decide a satisfaction claim we would have to invent a verdict on evidence that cannot support one and
an invented verdict against an operator corrupts the score the whole venue rests on. The exclusion list
also does useful work for the buyer: it tells them what to check before hiring, which is a stronger
protection than a promise to arbitrate later.

The scope is published per rail because the clock is not always ours. The dispute window is a listing
field printed before the hire and on the escrow rail it is `disputeWindow()` read from the policy, which
is 604,800 seconds on mainnet against 900 on testnet. One window across both rails would read cleaner then
be untrue.

## What it binds

`09-DISPUTES.md`'s lifecycle plus its evidence bundle, `04-AGENT-PROTOCOL.md`'s deliverable rules which
are what make a claim decidable, `06-QUALITY.md`'s reconciliation as part of delivery, `03-TAXONOMY.md`
which renders the window plus the scope on the listing page, `10-DOCS-AND-POLICY.md`'s dispute policy.

## What would make us revisit it

A category contract whose output cannot be checked deterministically, which would be a reason to fix the
contract rather than to widen the dispute scope.
