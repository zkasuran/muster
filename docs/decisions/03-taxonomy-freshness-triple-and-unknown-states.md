# Decision: every number carries block, timestamp and source. A missing value is one of six named states

Recorded by `03-TAXONOMY.md` sections 7.1 and 7.4. `15-SYSTEM.md` section 0 makes it one of the four
boundaries a reviewer should check.

## The decision

Nothing renders without its freshness triple of block number, timestamp plus source, with a per-field
staleness ceiling. A field with no fresh read renders one of six named unknown states, never a dash and
never a zero.

## The alternative rejected

One "last updated" stamp per page, which is what every dashboard does. For missing values: render a
dash, an em dash or a zero.

## Why

The reads behind one page differ by four orders of magnitude in cadence, from a per-render session read
to a six-hourly sweep, so one page-level stamp would be wrong for almost every field on the page. The
per-field ceiling is what lets a shelf show a price cell going unknown while the agent count beside it
stays fresh.

A zero is a claim. The failure this avoids is visible in the incumbent index: agent id 1 scores 100 out
of 100 with a certificate bound to the wrong hostname, which is what happens when a source guesses
instead of abstaining. A rival deployment serving `--` for three of four headline metrics is the same
defect wearing different clothes, since a dash does not say whether the number is missing, stale or
zero.

This is also the Data Quality argument in its cheapest form. The criterion asks for real-time accurate
data beyond basic counts and a number a judge can date is worth more than a number that is merely
present.

## What it binds

Every rendering surface in `03-TAXONOMY.md`, `06-QUALITY.md`'s intervals plus its unknown states,
`11-BNB-STACK.md`'s freshness comparison on the status page, `14-GAPS.md`'s pre-rendered fallback whose
status block reads unknown rather than the last green, `15-SYSTEM.md`'s per-field freshness targets plus
its `status` rule.

## What would make us revisit it

Nothing. Tightening a per-field ceiling is a constant change in the changelog, not a change to the
rule.
