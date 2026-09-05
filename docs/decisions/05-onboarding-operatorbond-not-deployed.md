# Decision: no bond contract is deployed anywhere. `OperatorBond` is specified, not shipped

Recorded 2026-09-05 during the cross-document consistency pass. Four documents described the same contract
in three incompatible states and under two names.

## The conflict

| File | What it said |
| --- | --- |
| `05-ONBOARDING.md` section 14 | "`OperatorBond` on mainnet. The contract, its surface and its terms ship, **deployed on chain 97 only**" |
| `02-THESIS.md` section 9 and its deferred table | "`E1 Bonded` ships as published terms plus a chain 97 contract", "the contract is deployed on chain 97 only" |
| `15-SYSTEM.md` section 5 and its decisions table | Solidity: "**none ships** ... no escrow of ours, **no bond contract**, no hook", with "No Solidity ships at all" recorded as the decision |
| `10-DOCS-AND-POLICY.md` section 5.4 | "`E1 Bonded` with real slashing, `not built`" |
| `08-MONEY.md` section 1 | "Nothing holds a stake by 2026-09-09" and its decisions table rejects "the `MusterBond` contract behind evidence tier E1" |
| `09-DISPUTES.md` section 12 | documented as next: "The E1 bond contract ... nothing holds a stake by 2026-09-09" |

Two separate defects. The **name** was `OperatorBond` in 05 and `MusterBond` in 08, for one contract that
`SPINE.md` never named. The **state** was deployed-on-testnet in two documents and deployed-nowhere in
four, including the document that owns the stack and the build order.

## The decision

**No Solidity ships. `OperatorBond` is a specification with no deployment on any chain.** E1 ships as
published terms: the stake amount, the release rule, the forfeit trigger, the fraction, the
money-transmitter analysis, plus the sort band the rung would unlock. Nothing holds a stake, so nobody
stands on E1 during judging and every document says so in those words.

The name is **`OperatorBond`**, fixed in `SPINE.md`'s vocabulary table. `05-ONBOARDING.md` owns the rung,
so its name wins over 08's and `MusterBond` also repeats the product name inside a contract name for no
gain.

## The alternative rejected

Deploy it on chain 97 so the surface is demonstrable, which is what 05 and 02 described. Rejected on the
rubric. None of Functionality, Data Quality or Agent Diversity reads a testnet bond, `15-SYSTEM.md`'s build
order has three days and protects the demo path and a deployed-contract claim is one a judge can check,
so the claim costs more than the artifact returns. `09-DISPUTES.md` section 6 already carries the harder
reason: directing an operator's stake to a buyer on our own decision is the FinCEN fact pattern the whole
non-custodial design avoids, so the contract wants the analysis attached before it exists, not after.

## What changes downstream

* `02-THESIS.md`: section 9 and the deferred table drop the chain 97 deployment.
* `05-ONBOARDING.md`: section 14 says specified and not deployed.
* `08-MONEY.md`: `MusterBond` becomes `OperatorBond` in both places.
* `14-GAPS.md`: the insurance row stops saying the E1 bond ships on chain 97.
* `research/SPINE.md`: `OperatorBond` is in the vocabulary table with `MusterBond` rejected and the stake
  is in the design-constants table.
