# Decision: 15-SYSTEM carries every stored field its siblings asked for, under one name each

Recorded 2026-09-05 during the cross-document consistency pass. `SPINE.md` makes `15-SYSTEM.md` the only
document that may extend the stored model, so a field another document needs exists only if 15 lists it.
Eight requested fields and one requested collection were never listed.

## What was requested and not delivered

| Requester | Asked for | Was in 15 section 2.6 |
| --- | --- | --- |
| `04-AGENT-PROTOCOL.md` "What this settles" | `job.attribution` | yes |
| same | `listing.reviewedCardHash`, read by the precedence table, compared by rule B12, asserted by probe C05 | no |
| same | `listing.advicePosture[]`, gated by C09 | no |
| same | `listing.subcontracts`, enforced by rule B13 | no |
| `05-ONBOARDING.md` section 2.3 | an `operator` collection keyed `operatorAddress`, six fields plus a durable `tierExercises[]` | no |
| `05-ONBOARDING.md` section 6 | `listing.contactChannel`, read by G7, by the 9.4 escalation row and by checklist item 8 | no |
| `05-ONBOARDING.md` section 11.3 | `listing.listingName`, `listing.listingEndpoint`, without which Case C is a path we advertise and nobody can walk | no |
| `08-MONEY.md` section 11 | four names on `payment`: `quoteId` with `providerSigVerdict`, a screening reference, `freshness`, an authorisation digest | two, renamed |

Every one of those is load bearing somewhere: a gate, a probe, a lint finding or a claim path. A rule
enforced against a value nobody stores is a rule that does not run.

## The decision

`15-SYSTEM.md` section 2.6 lists all of them, under the requester's own name and its counts move to
**seventeen fields across eighteen placements, then eleven collections**.

Two names are settled against the requester and this is the only place that happens:

* `payment.screeningId`, not `screeningVerdictId`. It is a foreign key into `screeningCheck`, whose own key
  is `screeningId` and `quote` already carries the same column. A key that changes name with the table it
  sits on is a bug waiting for a join.
* `payment.authDigest`, not `authorizationDigest`. Same field, shorter, already written into 15's table and
  into the hire flow in section 4.3.

`08-MONEY.md` section 11 is corrected to those two names. Its other two, `quoteId` with
`providerSigVerdict` and `freshness`, are added as asked.

## The alternative rejected

Let each document keep its own spelling and treat the difference as cosmetic. Rejected because
`SPINE.md`'s field discipline exists so the storage layer can be generated from these documents and two
spellings of one column is the defect the spine's spelling rule was written to stop. Also rejected: 15
inventing a shorter name for `reviewedCardHash` to sit beside `approvedTokenUriHash`. The spine allows 15
to extend the list, never to rename and the two hashes pin different objects: `approvedTokenUriHash` pins
the on-chain registration bytes while `reviewedCardHash` pins the off-chain Muster card the operator
serves.

## What changes downstream

* `15-SYSTEM.md` section 2.6: seven added rows, the `operator` collection, the two corrected counts.
* `08-MONEY.md` section 11: the two names.
* `05-ONBOARDING.md` section 2.3: the pointer reads `screeningCheck`, which is the collection's real name.
