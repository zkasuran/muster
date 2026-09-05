# Decision: no Solidity ships

Recorded by `15-SYSTEM.md` decisions table, with `08-money-no-own-escrow.md` settling the escrow half.

## The decision

The entry deploys no contract of its own, on any chain. Escrow rides the official ERC-8183 stack, the fee is a
signed authorisation rather than a splitter and the operator bond is a specification with published terms
rather than a deployment (`05-onboarding-operatorbond-not-deployed.md`).

## The alternative rejected

Our own escrow, a bond contract on mainnet or a custom hook plus evaluator on the shared router.

## Why

A custom policy is not even available: the whitelist call is owner-only and we are not the owner. The hook
route exists then abandons the optimistic settle plus the panel that make the official stack worth using.
Our own escrow would mean issuing the verdict on our own listings.

The schedule argument is the second half plus it is decisive at four days. Every hour not spent on Solidity
is an hour on the journey the rubric names and a contract needs writing, testing, deploying, verifying plus
defending. The rubric scores the journey rather than the contract count.

## What it binds

`08-MONEY.md`'s rail plus its escrow section, `05-ONBOARDING.md`'s bond which stays specified rather than
deployed, `09-DISPUTES.md` which cannot press an on-chain dispute we have no standing for,
`15-SYSTEM.md`'s build order plus its test plan.

## What would make us revisit it

Being the owner of a policy, which is not something we can grant ourselves. Post-adoption the calculus
changes, because a venue with a mandate has time plus a reason to own its escrow.
