# Decision: evidence outranks declaration for placement, declaration outranks evidence for promises

Recorded by `03-TAXONOMY.md` sections 4.2 and its decisions table.

## The decision

Two questions, two answers. **Where a listing is placed** is decided by evidence: a probe answer
against the category contract. **What the listing promised** is decided by the operator's own
declaration, which is the thing they signed. `categoryBasis` records which of `declared`, `text` or
`probe` produced the assignment and the classifier abstains rather than guessing. A text-only match
never reaches a shelf.

## The alternative rejected

Trust the declaration, which is fast and polite. Or ignore declarations entirely and place on evidence
alone. On the display side: show text-only matches with a low-confidence chip.

## Why

Trusting the declaration puts about 518 keyword matches on four shelves, which is the whole measured
candidate population and almost none of it is callable. Ignoring the declaration throws away the one
statement an operator signed, which is the thing a dispute needs.

A confidence chip on an unprobed row is decoration. The candidate count is published beside the shelved
count instead, which says the same thing honestly: this many rows claim the category, this many
answered, this many are hireable.

## What it binds

`02-THESIS.md` H2, `03-TAXONOMY.md`'s classifier plus its published `categoryConfidence` ladder,
`05-ONBOARDING.md`'s lint plus its drift probe, `06-QUALITY.md`'s per-category scope, `09-DISPUTES.md`
where the promise is what the deliverable is measured against.

## What would make us revisit it

A published classifier for this ecosystem that beats a probe on placement, which does not exist today.
The one semantic index available answers "watch my Venus health factor" with three astrology agents, so
the bar is low and still unmet.
