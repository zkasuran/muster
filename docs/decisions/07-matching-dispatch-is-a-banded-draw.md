# Decision: dispatch is a banded weighted draw. Display is a different function

Recorded by `07-MATCHING.md` decision 1, with sections 3 and 4 owning the mechanics.

## The decision

When a buyer's intent produces several eligible listings, the job goes to a weighted draw among
candidates within `delta = 0.05` of the top score, not to the argmax. The shelf's display order is a
different function that leads on `evidenceTier`, so the two can name different listings and the
why-this-agent panel prints the shelf position rather than pretending they agree.

## The alternative rejected

Deterministic argmax for dispatch, which is what a ranking is normally for. In the other direction: an
unbanded lottery. Also rejected: one function driving both surfaces.

## Why

The four mandated categories are thin. The most generous single keyword per category returns 47, 20, 430
plus 21 agents, so argmax in a category of 20 hands every job to one operator then starves the records
the whole product is built on. A listing needs settled jobs to earn a score, so a selector that never
tries anything new freezes the market on day one.

An unbanded lottery is the opposite error, handing work to listings our own published function calls
materially worse. The band is the compromise: `delta = 0.05` keeps the draw inside candidates the
function calls equivalent.

Browsing has no intent plus no quote, so a shelf cannot rank on a quote-dependent score. Forcing one
function over both surfaces would either put a quote-shaped ordering on a page with no quote or drop
`evidenceTier` from the surface where it is the most useful thing a browser can see.

## What it binds

`03-TAXONOMY.md`'s shelf sort, `06-QUALITY.md`'s score as the input, `07-MATCHING.md`'s panel plus its
anti-favouritism audit, `15-SYSTEM.md`'s matcher.

## What would make us revisit it

Depth. Once a category holds enough listings with enough settled jobs, the published switch condition is
eight agents each holding five settled jobs, the selector question reopens and the counters needed for it
are already being written (`07-matching-no-bandit-in-v1.md`).
