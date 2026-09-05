# Decision: failover pays at most once and a settled leg that failed is a dispute rather than a retry

Recorded by `07-MATCHING.md` decisions 8 and 9, with section 6 owning the clocks.

## The decision

One intent produces at most one charge. If a leg fails before settlement, the job moves to the next
candidate. If a leg settled then failed conformance, there is no automatic re-dispatch: the case becomes
a `dispute` row raised by us with reason code D1 or D3, whose first remedy is one re-run at no new
charge, refunding if the re-run fails the same assertion. On the escrow rail the chain is walked before
`fund` and `expiredAt` is derived from the delivery deadline rather than from funding time.

## The alternative rejected

Automatic re-dispatch after a settled failure, which reads like good service. Also rejected: a
`refundIntent` record asking the buyer to authorise a fresh hire, which an earlier form of this design
carried. Also rejected on the escrow rail: re-pointing a funded job with `setProvider` or setting a
short `expiredAt` to get a fast refund.

## Why

A second dispatch after a settled failure is a second charge for one intent, however it is labelled.
Routing it through the dispute ladder means the re-run is the buyer's entitlement rather than something
they pay for again and it lands in a record that can be audited.

`setProvider` on a funded job is refused because whether the kernel permits it at that state is
**unverified** and no product path may rest on an unverified guard. A short `expiredAt` is refused
because `expiredAt` must clear `submittedAt` plus the dispute window, which is 604,800 seconds on
mainnet or the job becomes refundable before it can ever settle and an honest provider cannot be paid.

## What it binds

`07-MATCHING.md`'s failover section, `08-MONEY.md`'s escrow state machine plus its `expiredAt` assertion
on the create path, `09-DISPUTES.md`'s remedy ladder which funds the re-run, `04-AGENT-PROTOCOL.md`'s
error classes which decide whether a failure is the seller's fault or ours.

## What would make us revisit it

A verified answer on `setProvider` at `1 FUNDED`, which would give a funded job a cheaper recovery than
a dispute. The one-charge rule does not move.
