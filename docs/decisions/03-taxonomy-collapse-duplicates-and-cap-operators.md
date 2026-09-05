# Decision: concentration is handled by collapsing duplicates and capping operators, never by suspending them

Recorded by `03-TAXONOMY.md` sections 6.5 and 6.6, with `05-ONBOARDING.md` decision 11,
`14-GAPS.md` section 4.1 plus `15-SYSTEM.md`'s unique index.

## The decision

Four rules, one purpose:

* **Collapse duplicates on three keys**, where `K2` is host plus name plus service set, with the
  cluster size shown and expandable. The registration bytes live in a content-addressed blob store
  keyed by `tokenUriHash`, so the same hash drives `duplicateClusterId`.
* **At most one shelved row per operator per shelf.** A second needs settled jobs with us in that
  category.
* **At most four live listings per owner**, which is the number of categories.
* **One listing per `(agentId, category)`**, enforced by a unique index.

A duplicate cluster raises a review flag. It never triggers an automatic suspension.

## The alternative rejected

Deduplicate by owner, by name or by URI hash alone. No cap at all, letting ranking bury the spam. One
global cap across the whole product. Suspending every listing that shares a suspended row's
`tokenUriHash`, which is the cheap way to stop a re-registration escape.

## Why

Owner-based dedupe fails completely on this population: 215 of 600 sampled agents share one
byte-identical `data:` URI under **215 distinct owner addresses**. Name-based dedupe catches only the
exact string. A hash alone leaves the 12 machine-callable agents rendering as twelve independent
services on one host.

With no cap, one operator with a template fills a shelf and shelf position stops carrying information.
A global cap punishes an operator who genuinely serves three categories, which is the supply we want.
Ranking-only defence spends a probe plus a shelf slot before it works.

Cluster-wide suspension punishes 214 parties for one, because the cluster is what one publisher's
script produced under many owners rather than one bad actor's sock puppets.

## What it binds

`03-TAXONOMY.md`'s shelf rendering, `05-ONBOARDING.md`'s review queue plus its `listingId` derivation,
`06-QUALITY.md`'s clustering signals, `14-GAPS.md`'s fraud brakes, `15-SYSTEM.md`'s blob store plus its
per-host cap on `live` rows.

## What would make us revisit it

A shelf where the cap is the binding constraint on real supply rather than on templates, which would
be a good problem. The second-row condition (settled jobs with us in that category) is the intended
release valve and it needs volume before it can be judged.
