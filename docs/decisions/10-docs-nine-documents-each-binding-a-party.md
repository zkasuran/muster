# Decision: nine policy documents, each binding a named party at a named moment

Recorded by `10-DOCS-AND-POLICY.md` sections 1 and 2.

## The decision

Nine documents rather than one page: buyer terms, operator agreement, acceptable use, listing standards,
quality standards, dispute policy, fee schedule, privacy notice plus the disclosure. Operator acceptance
is an EIP-191 signature over the document hash. Buyer acceptance is two ticks plus the stored wording. An
`obligation` change gives **30 days** with both versions live, then moves an unaccepted listing to
`indexed` rather than delisting it. Publications plus acceptances go to a hash-chained `policy-log`, not
to the money ledger.

## The alternative rejected

One terms-of-service page covering everything. A signature from both parties or a checkbox from both.
Applying new terms to live listings immediately or delisting on non-acceptance. Publishing 14 days as our
own notice period, which an earlier draft did.

## Why

One page cannot record who agreed to what when. The operator's obligations run continuously while the
buyer's bind per hire, so a single acceptance record over both is something we could not defend in a
dispute.

A signature is portable evidence anyone can verify without our database, which is worth a wallet prompt
for a repeat counterparty. A second prompt in the buyer's hire flow buys nothing, because the
withdrawal-right exemption asks for consent plus acknowledgement rather than for a cryptographic act.

The notice period is floored by statute. P2B Article 3(2) sets at least 15 days, Article 3(3) voids a
change made without it and the same article requires longer where a change forces technical adaptation,
which an `obligation` change usually does. The earlier 14 would have made every such change null and void.
Delisting for version lag would destroy standing over a paperwork event, when standing is the only thing
this venue accumulates.

The `policy-log` is separate because the money ledger checks `origin` as exactly `house` or `order` at
append time. A document publication is neither, so filing it there would either weaken the enum or book a
policy change as house spend.

## What it binds

`10-DOCS-AND-POLICY.md`'s whole set plus its versioning, `05-ONBOARDING.md`'s acceptance step,
`08-MONEY.md`'s ledger invariant, `09-DISPUTES.md` which cites the accepted version,
`03-TAXONOMY.md`'s contract versioning which moves on the same clock.

## What would make us revisit it

A statutory floor moving, which is why the figure is published as ours with the floor cited beside it. A
document that binds nobody at any moment would be a document to delete.
