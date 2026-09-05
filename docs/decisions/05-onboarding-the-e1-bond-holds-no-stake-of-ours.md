# Decision: the E1 bond is a contract with a permissionless release and no stake of ours holds it

Recorded by `05-ONBOARDING.md` decision 3, with `09-DISPUTES.md` section 6 owning what the missing bond
does to the remedy set.

## The decision

Whatever `OperatorBond` becomes, the stake is held by the contract with a permissionless release, never by
an escrow of ours, at any date. E1 ships as published terms: the amount, the release rule, the forfeit
trigger, the fraction plus the money-transmitter analysis. **Nothing holds a stake during judging**, so
nobody stands on E1 and every document says so in those words. Whether the contract is deployed at all is
settled separately in `05-onboarding-operatorbond-not-deployed.md`, which says it is not.

## The alternative rejected

A bond held in Muster's own escrow, which is what the carried spine's ladder describes plus what an
earlier pass planned. Also rejected: holding an unsubmitted EIP-3009 authorization as collateral
instead of a contract.

## Why

A stake we hold then direct to a buyer is value accepted from one party to pass to another, which is
inside the FinCEN money-transmitter definition and the payment-processor exemption fails on a crypto
rail. The same reasoning already keeps a payment contract of ours off the hire path, so a bond in our
custody would reopen a perimeter the rest of the design pays to avoid.

A stored authorization is worse in a different way. An authorisation that outlives the job it was
signed for is exactly what our own data posture forbids and it would sit unspent as a standing claim
on a buyer's balance.

The visible cost is a rung nobody can stand on this week. No shelf row depends on it, because shelf
placement is E2, which is earned by a settled job rather than by capital.

## What it binds

`05-ONBOARDING.md`'s ladder, `09-DISPUTES.md` where every credit reads `funder: muster` today because
the operator-lost case has no bond behind it, `08-MONEY.md` which is waiting on the forfeit trigger
plus fraction, `14-GAPS.md` section 7.2 which refuses insurance outright while carrying the bond as a
specification.

## What would make us revisit it

A deployment with keys we do not hold plus a release path no party can block, which is the design already
written. A shelf with a counted median job price, which is what would turn the published stake amount into
a derived number.
