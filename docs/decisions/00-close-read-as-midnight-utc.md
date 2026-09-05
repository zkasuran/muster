# Decision: the close is read as 2026-09-09 00:00 UTC

Recorded by `00-PROGRAM.md`. The page publishes a date with no time of day, so this is our reading and
it is flagged as a reading rather than a quotation.

## The decision

Treat the build close as **2026-09-09 00:00 UTC**. Everything green, submitted and publicly reachable
before 2026-09-08 ends.

## The alternative rejected

Read "closes 2026-09-09 UTC+0" as the end of that day, which buys 24 more hours of build time.

## Why

The page states the close date and never states a time. The judging window also starts on 2026-09-09,
which reads as the build being over when that day begins. The generous reading buys one day and risks
the entry and an entry that arrives after a close is worth nothing whatever it contains. The
conservative reading costs a day of scope, which the cut list in `15-SYSTEM.md` already prices.

The same reading sets the internal gates: the money gate at 03:00 on 2026-09-07, the day 3 freeze,
then the pre-submit gates and the anonymous URL check running before 2026-09-08 ends rather than
during a window we may not have.

## What it binds

`15-SYSTEM.md`'s build order, its cut line and its if-a-day-is-lost table. `13-PARTNERS.md`'s cut
order for the report tasks. `05-ONBOARDING.md`'s funding gate. Every "what ships by 2026-09-09"
section in the set.

## What would make us revisit it

The programme publishing a time of day for the close or answering a direct question about it. A later
close would release the day back into the cut list, in the order that list already fixes.
