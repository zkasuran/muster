# The Validation Registry row is conditional, not `live`

Date: 2026-09-05. Raised while applying review findings to `10-DOCS-AND-POLICY.md` section 5.4.

## What disagreed

Two reviewers read the same row differently, so the row itself was the problem.

- `10-DOCS-AND-POLICY.md` marked "A Validation Registry request plus response on BSC mainnet" as `live`
  and added "first use as far as we measured", with a check column naming only `getAgentValidations`.
- `02-THESIS.md`:658 ships the pair. Its Ships table reads "one real `validationRequest` plus one real
  `validationResponse` on BSC mainnet carrying a decision". Its deferred list at :670 defers only a
  **third-party** validator, not the pair. So the ship-line owner agrees the pair ships.
- `06-QUALITY.md` plus `09-DISPUTES.md`:1185 also ship it. 09-DISPUTES states every qualifier: the
  pair is necessarily first-party, decided by our own validator address, weighted at zero under the
  self-financing rule, "not a claim that a third party validated anything".
- `15-SYSTEM.md`:873-953 allocates **no build block that sends a `validationRequest`**. Day 3's 00:00 to
  03:00 block is the ERC-8183 escrow work and nothing in the order touches the Validation Registry.

So the disagreement was never between 02-THESIS and 10-DOCS. It is between four documents that ship the
pair and a build order with no hour for it.

## What was checked

From `R01-erc8004.md`:383-385, 398, 778, all read from chain:

- `validationRequest` from a random EOA reverts `Not authorized`. Only the agent owner succeeds. So the
  pair can only ever exist on a listing we own.
- No third-party validator service exists on BSC. Whatever validator this venue names is ours.
- Zero validations existed across 1,999 sampled ids. 8004scan reports `total_validations: 0` on
  every chain it covers. The first-use claim holds as measured.

## The decision

The row publishes `unexercised` until the pair is written, `live` once it is, with the first-use hedge
attached either way. All three qualifiers sit in the same cell rather than in a neighbouring row, because
a reader joins two rows the wrong way round and reads a self-issued request as third-party validation.
`getValidatorRequests` against our published validator address is added to the check column, so a
stranger can read the request without trusting our page.

Rejected: marking it `live` on the strength of four documents intending to ship it. The doc's own preamble
says nothing is described as shipped that is not `live`. Its own enum already carries `unexercised`
for a mechanism built and published with nothing through it. An overclaim in the honesty table is the one
defect an adversarial judge is certain to test, then the first-use claim raises the cost of being wrong.

Also rejected: deleting the row. The mechanism is real, the measurement behind the first-use claim is
real, then dropping it would lose a checkable artifact nobody else on this chain has.

## Open, owned elsewhere

`15-SYSTEM.md` needs one build block that sends the request plus the response. Failing that, the row settles
at `unexercised` and section 7's ships list moves it to the next list. That is `15-SYSTEM.md`'s call and it
is not made here.
