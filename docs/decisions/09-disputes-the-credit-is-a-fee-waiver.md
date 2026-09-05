# Decision: the remedy credit is a waiver against our own fee, never a balance we hold

Recorded by `09-DISPUTES.md` section 6.

## The decision

Every remedy names its funder: refund, partial refund, re-run, credit, suspend, delist. The credit is a
waiver against a fee we would otherwise charge. It is not a spendable in-venue balance and today
`funder` reads `muster` on every credit, bounded by a published per-buyer cap plus a venue-wide ceiling.

## The alternative rejected

A spendable in-venue balance, which is the obvious shape. Also rejected: a discretionary goodwill payment
with no named funder. Also rejected: pointing the operator-lost case at a bond that does not ship yet.

## Why

Redeeming a balance against a third-party listing would have Muster funding a payment to that operator on
the buyer's instruction, which is the settlement flow the whole compliance posture assumes we sit outside.
A float is also a liability we would have to be licensed to hold. A discount on a fee we charge is a
service term and nothing more.

An unnamed funder is how a venue lands in the payment flow by accident, so the funder is a field rather
than a habit. Directing a seller's stake to a buyer on our own decision is value in plus value out, which
the payment-processor exemption does not cover, which is why the operator-lost credit is ours today rather
than the operator's (`05-onboarding-the-e1-bond-holds-no-stake-of-ours.md`).

The remedy set keeps suspend plus delist as separate entries because a machine may fire the first and only
a human may confirm the second.

## What it binds

`09-DISPUTES.md`'s remedies plus its abuse gates, `08-MONEY.md`'s fee which is what a credit reduces,
`05-ONBOARDING.md`'s bond, `10-DOCS-AND-POLICY.md`'s dispute policy plus fee schedule.

## What would make us revisit it

The bond landing on mainnet, which gives the operator-lost case a funder that is not us. A credit ceiling
being reached, which would be a signal about failure rates rather than about the instrument.
