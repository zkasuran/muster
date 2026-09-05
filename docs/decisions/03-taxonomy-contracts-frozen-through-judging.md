# Decision: the four contracts are frozen through judging and a slug is retired rather than reused

Recorded by `03-TAXONOMY.md` sections 9 and its decisions table.

## The decision

No breaking change to any of the four category contracts between 2026-09-09 and 2026-09-23. Additive
changes only, versioned, with the current `contractVersion` on every listing. A slug that stops meaning
what it meant is **retired**, never repurposed and a new slug is minted instead.

## The alternative rejected

Ship contract improvements as they land, since a better contract is a better product. On naming: reuse
a slug when a category evolves, which keeps URLs stable.

## Why

Three judges score independently across a two-week window. A contract that moves under them means two
judges scored two different products and the one who scored the earlier version cannot be told which
one they saw. The freeze costs improvements for fourteen days. It buys a comparable score.

Slug reuse has a live example in the programme's own materials, where monitoring became rebalancing
between the launch blog and the rubric page. A reader who bookmarked the first meaning now reads the
second under the same name. Retiring the slug makes that visible: the old URL says retired plus points
at the replacement and a `contractVersion` bump is what a listing has to answer for.

## What it binds

`03-TAXONOMY.md`'s versioning section, `04-AGENT-PROTOCOL.md`'s conformance assertions which are pinned
per contract version, `05-ONBOARDING.md`'s re-probe queue on a version change, `06-QUALITY.md` where a
contract change resets a score to the category prior because the old record was earned against
different promises, `10-DOCS-AND-POLICY.md`'s changelog.

## What would make us revisit it

The freeze ends on 2026-09-23 by construction. A defect in a contract that makes it unpassable would be
fixed inside the window as an additive clarification with the change published, because a contract
nobody can pass fails the same criterion the freeze protects.
