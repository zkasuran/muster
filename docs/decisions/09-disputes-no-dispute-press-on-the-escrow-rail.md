# Decision: Muster never presses `dispute` on the escrow rail and says so in the product

Recorded by `09-DISPUTES.md` section 5.

## The decision

On the ERC-8183 escrow rail the on-chain dispute belongs to the buyer. We hand the panel a sealed
evidence bundle and the product states plainly that the on-chain decision is not ours.

## The alternative rejected

Present the on-chain dispute as ours, which would make the venue look like it protects buyers all the way
to the chain.

## Why

`policy.dispute` reverts `NotClient()` from any address that is not the job client, so the alternative is
a button that reverts. Verified from the selector plus the revert data.

Saying so is the second half. A venue that implies it can escalate on the buyer's behalf sets an
expectation the chain refuses and the buyer discovers that at the worst possible moment. The bundle is
what we can actually contribute: the captured bytes, the hashes plus the assertion that failed, in a form
the panel can read.

The same reasoning runs the other way for the rail's own settlement. We do not deploy an escrow of ours
(`08-money-no-own-escrow.md`), so the optimistic settle plus the panel are the kernel's, not ours.

## What it binds

`09-DISPUTES.md`'s lifecycle on the escrow rail, `08-MONEY.md`'s escrow state machine plus who may call
what, `03-TAXONOMY.md` which prints the window plus the rail on the listing page,
`10-DOCS-AND-POLICY.md`'s dispute policy.

## What would make us revisit it

The kernel permitting a third party to raise a dispute or a policy of ours being whitelisted, which is
owner-only today and therefore not available.
