# Decision: tier 0 opens and decides a dispute itself where a deterministic check failed

Recorded by `09-DISPUTES.md` sections 3 and 4 plus its decisions table.

## The decision

Where our own check finds a delivery failed a decidable assertion, the dispute opens automatically after
the terminal timestamp, with no complaint required. Silence from the operator decides against the
operator. Silence from the buyer lets the payment stand. A tie on the decidable facts resolves as
`undecided`, funded from our own pool, with the job excluded from both records.

## The alternative rejected

Wait for the buyer to complain, which is what every venue does. Also rejected: symmetric escalation to a
human on any silence. Also rejected: deciding for the buyer on the assumption they are the weaker party.

## Why

A venue that only refunds the buyers who notice is running a quiet discount for attentive users. The
check has already run, so the finding exists whether or not anybody looks and acting on it costs one
scheduled call after the terminal timestamp.

The silence asymmetry matches the information asymmetry. The operator controls the delivery evidence, so
their silence is a failure to produce what only they hold. The buyer controls only whether they complain,
so their silence says nothing about the work.

Deciding a tie for the buyer is a subsidy paid in operator reputation, then an operator cannot appeal a
coin flip. `undecided` with a credit from our own pool costs us money instead of costing them standing.

## What it binds

`09-DISPUTES.md`'s clocks plus its burden of proof, `06-QUALITY.md` where an excluded job leaves both
records, `08-MONEY.md`'s refund paths, `04-AGENT-PROTOCOL.md`'s deliverable rules which decide what
"decidable" means.

## What would make us revisit it

A false-positive rate in the deterministic checks that makes the automatic open unfair. The checks are
published per assertion, so that would show up as appeals we lose rather than as a judgement call.
