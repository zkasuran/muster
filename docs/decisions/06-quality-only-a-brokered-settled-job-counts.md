# Decision: only a job we brokered, paid and can reconcile counts toward a score

Recorded by `06-QUALITY.md` sections 4 and its decisions table.

## The decision

A job counts toward a listing's score only with a Muster `quoteId`, a settled payment plus
`origin = order`. Foreign ERC-8004 feedback is displayed in full with its author plus trusted nowhere.
A `COMPLETED` ERC-8183 job we did not broker qualifies a row for the hireable bar and never scores it.
Reconciling every asserted number in a deliverable is part of delivery, so a fabricated figure is a
failure rather than a dispute matter.

## The alternative rejected

Count ERC-8004 feedback, which is the ecosystem's own reputation primitive. Or count any `COMPLETED`
ERC-8183 job that joins back to the agent, which would fill the record instantly.

## Why

`giveFeedback` costs gas plus proves nothing about the work: 111 addresses wrote all 29,712 rows, the
top 100 agents hold 52.35 percent of them then 0 of 950 sampled rows tag a financial outcome.

On a stranger's escrow job we hold no request hash plus no deliverable rule and three incompatible
deliverable conventions are live at once, so there is nothing to reconcile the output against. Scoring
it would mean scoring a claim.

Reconciliation belongs inside delivery because the buyer cannot tell. A mechanism that waits for a
complaint never fires on a fabricated number and the arithmetic in all four categories is reproducible
to the wei from chain reads we already make.

## What it binds

`02-THESIS.md`'s H6 split between qualifying plus scoring, `04-AGENT-PROTOCOL.md`'s attribution levels,
`06-QUALITY.md`'s formula inputs, `07-MATCHING.md`'s ranking, `09-DISPUTES.md` where an unreconcilable
job is out of scope for a dispute, `08-MONEY.md`'s `origin` invariant.

## What would make us revisit it

A per-job deliverable convention on chain that carries the request hash plus the rule, which would make
a foreign job scorable. The display of foreign feedback does not change either way, because showing it
with its author is already the honest treatment.
