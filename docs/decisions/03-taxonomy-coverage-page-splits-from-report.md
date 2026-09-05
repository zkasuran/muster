# Decision: the coverage proof gets `/coverage`. `/report` stays the Agent Advantage Report

Recorded 2026-09-05 during the cross-document consistency pass. Two documents put two different pages on
one route, so the route had to be split before either could be built.

## The conflict

* `02-THESIS.md` section 7 names "the `report` page that proves the equality" as the surface that wins
  Agent Diversity and section 10 clause 8 puts the first-party share of hireable rows on "the report
  page". The field list it hands over is per category: candidate count, answering count, hireable count,
  settled job count, the first-party against third-party split, plus the classifier's precision.
* `03-TAXONOMY.md` section 5.1 fixes `/report` as **the Agent Advantage Report**, owned by
  `13-PARTNERS.md` and puts Report in the seven-item nav for that reason.
* `13-PARTNERS.md` gates the TermiX track on an anonymous 200 at `/report` in three places, including its
  T-1 submission row.
* `15-SYSTEM.md` renders `/report`, lists it in the anonymous-fetch gate and separately requires the
  first-party split on "the report page".

Read literally, one route carries a coverage proof owned by 02 and 03 plus an eligibility artifact owned
by 13. Two owners on one surface is the thing `SPINE.md` forbids and the cheap failure is real: the
proof of a criterion worth a third of the published rubric ends up inside a partner-track document.

## The decision

Two routes, one owner each.

* **`/coverage`** is the four-category coverage proof. `03-TAXONOMY.md` owns its place in the nav and its
  regions, `02-THESIS.md` owns the field list it has to carry, `15-SYSTEM.md` renders it and gates it.
  Per category: candidates, answering now, hireable, settled jobs, the first-party against third-party
  split on each of those, then a link to the classifier's published precision at
  `/categories/classifier`. Every number carries the freshness stamp its source already has.
* **`/report`** stays the Agent Advantage Report exactly as `13-PARTNERS.md` specifies it.

## The alternative rejected

Keep one `/report` carrying both, with the coverage numbers as its first section. Rejected on three
counts. It gives one surface two owners. It buries the Agent Diversity evidence under a partner artifact,
where a main-rubric judge has no reason to look for it. And `13-PARTNERS.md` treats `/report` as an
eligibility gate whose content is fixed by TermiX's own published spec, so anything else on that page is
noise against a gate we cannot afford to fail.

Also rejected: folding the coverage numbers into `/status`. The equal-depth status line already renders
there and stays, but `/status` answers "is this data fresh" and a judge scoring Agent Diversity does not
open it.

## What it costs

One server-rendered page over numbers the index already computes. `03-TAXONOMY.md` section 1.2 already
computes candidates matched, probed and passed per shelf for the status line and `15-SYSTEM.md` already
requires the first-party split on every published count. It lands in the same day-2 block as `/report`.

## What changes downstream

* `02-THESIS.md`: sections 7, 10 and 12 say coverage page and name the route.
* `03-TAXONOMY.md`: the nav gains Coverage, the route table gains `/coverage` with its regions, the
  landing page links it.
* `15-SYSTEM.md`: the surface list, the static fallback, the anonymous-fetch enumeration, the build order
  and the first-party split row name `/coverage`.
* `research/SPINE.md`: the design-constants table carries the two routes so neither drifts back.
