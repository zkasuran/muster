# Decision: two numbers, delivery and performance, never blended into one score

Recorded by `06-QUALITY.md` section 2 plus its decisions table, following `02-THESIS.md`'s rule that
there is no aggregate rating ever.

## The decision

A listing carries a delivery number plus one performance metric for its category. They are never
combined, never averaged into a rating, never rendered as stars. The delivery number is a Wilson lower
bound on shrunk counts with its interval plus its sample size beside it. Performance is per category,
per listing, never pooled across an agent's categories.

## The alternative rejected

One composite score, which is what every incumbent ships. Also rejected: a five-star average, because
buyers expect one. Also rejected: hierarchical pooling at agent level with per-category shrinkage,
which is better statistics once volume exists.

## Why

A composite cannot carry an interval, cannot be recomputed by a reader then hides which half broke. On
this chain a composite weighting engagement at 0.30 would be 30 percent a measurement of 111 addresses,
because 111 addresses wrote all 29,712 feedbacks and 0 of 950 sampled rows tag a financial outcome. A
five-star average over that data is a decoration.

Pooling across categories is the Agent Diversity failure in statistical form: one category's record
would flatter three empty ones, on exactly the axis the rubric scores. Once volume exists pooling is the
better estimator, which is why it is written down as next rather than dismissed.

The interval is the reason a small sample can be trusted at all. It is also why `v_j` stays binary:
a graded quality value inside a Bernoulli makes the interval meaningless.

## What it binds

`03-TAXONOMY.md`'s comparison row plus its two-chip rule, `06-QUALITY.md`'s formula plus its constants,
`07-MATCHING.md` which ranks on the lower bound rather than the point estimate,
`10-DOCS-AND-POLICY.md`'s quality standards page.

## What would make us revisit it

Volume. Eight agents in a category each holding five settled jobs is the published switch condition for
the selector and the same threshold is when pooling becomes worth the complexity. The composite stays
refused either way.
