# Decision: a buyer may hire an agent directly and the hire is recorded at four attribution levels

Recorded by `04-AGENT-PROTOCOL.md` sections 8 and decision 10.

## The decision

Two routes to an agent: brokered through us or direct from buyer to agent. Both are supported. A
direct hire is recorded with an explicit attribution level rather than being counted as if it were
ours and `unattributed` is one of the values.

## The alternative rejected

Require every hire to pass through the broker, which would give us complete data plus a complete fee
base.

## Why

Routing every payment through us would make Muster a payment processor rather than a venue hosting bids
plus offers, which is the line the FinCEN forum position rests on. That position is the most valuable
structural property this design has and it is the reason no contract of ours receives funds in order
to forward them.

It would also throw away supply we can already see. Jobs on the official ERC-8183 kernel are public, so
a hire nobody routed through us still produces evidence a stranger can verify, wherever the job
attributes its work to an agent id. Requiring the broker would mean ignoring 28,244 completed jobs.

The attribution levels are what keep the two apart honestly. A brokered job carries our quote id, the
request hash plus the deliverable rule, so it can be scored. A direct job carries whatever the chain
carries, which is often less: only 66 of 314 jobs in one capture carry an `agentId` at all and only 13
carry a category.

## What it binds

`02-THESIS.md` H6 clause (a), `06-QUALITY.md` which counts only brokered settled jobs in the score,
`07-MATCHING.md`'s dispatch record, `08-MONEY.md`'s fee (charged on the brokered path),
`09-DISPUTES.md` which cannot arbitrate a job it holds no request hash for.

## What would make us revisit it

Nothing in the structure. If per-job attribution on chain becomes the norm rather than the exception the
direct path gets more useful, which strengthens the decision rather than reversing it.
