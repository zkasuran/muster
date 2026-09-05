# Decision: every constant, coefficient and weight is published, so a stranger can recompute our numbers

Recorded by `06-QUALITY.md` (the score constants), `07-MATCHING.md` decision 6 (the ranking
coefficients), `14-GAPS.md` (the search field weights) plus `10-DOCS-AND-POLICY.md` (the disclosure
that binds them).

## The decision

Publish all of it: the score constants (`mu_0 = 0.50`, `m = 10` effective jobs, the decay half-life
`H = 30` days, the Wilson `z`, `alpha` plus `beta`, the per-buyer cap `C = 3`), the ranking coefficient
vector, the exploration rate, the five search field weights plus every threshold. The numbers live in
one `policy-constants.json` that the code reads plus the policy prose transcludes. Exports are
unauthenticated, keyed on a public address and every receipt carries the command that reproduces its
hash.

## The alternative rejected

Publish the parameter list plus the thresholds while withholding the weights, which P2B Article 5(6)
permits and which every operator studied does. Also rejected: writing the numbers into the policy prose
by hand. Also rejected: an auth-gated export keyed to a signature from the payer.

## Why

Nothing in the formula is manipulable by knowing it. The only input an operator controls is settled paid
work, so publishing costs nothing and buys the audit. Article 5(6) is a permission rather than a duty
and a score a stranger can recompute from published rows is the strongest Data Quality answer available.

The gaming defences do not weaken under reading either. They are the settled-job binding, the distinct
payer rule plus the funding-cluster test, none of which depends on secrecy.

Transclusion is the mechanism that keeps it true. A retyped 200 bps disagrees with the fee code inside a
week, then a rulebook that contradicts the product proves nobody checked.

Gating the export would put us between a judge and a claim we made, when every field in it is already on
chain or derived from it.

## What it binds

`06-QUALITY.md`, `07-MATCHING.md` section 10's stranger-run audit, `08-MONEY.md`'s CSV plus JSON
exports, `10-DOCS-AND-POLICY.md`'s quality standards page plus its `/docs/how-it-works` read-it-yourself
commands, `14-GAPS.md`'s relevance section.

## What would make us revisit it

A term entering the ranking that an operator could move without doing better work. That term would be
the thing to remove, not the thing to hide.
