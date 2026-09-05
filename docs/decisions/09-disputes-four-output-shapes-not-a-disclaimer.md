# Decision: four permitted output shapes, enforced per shape, instead of a disclaimer

Recorded by `09-DISPUTES.md` section 10, with `04-AGENT-PROTOCOL.md` making `advicePosture` a declarable
per-skill property.

## The decision

Every skill declares which of four output shapes it produces and each shape has its own named assertion
that runs on the delivery path. The banner is the last layer rather than the strategy, plus a string
screen runs on the output itself. The declaration is per skill, not per agent card.

## The alternative rejected

A blanket disclaimer, which is what most venues ship. Also rejected: a CI grep over agent output. Also
rejected: declaring the posture once per card, which is where this started.

## Why

The regulatory line under MiCA plus MiFID II is personalisation, so it has to be a property of the output
rather than a footer. A disclaimer does not change what a thing is and the regulator's own
anti-obfuscation rules show what it thinks of disclaimers designed to be missed.

A CI grep never sees a runtime response, so it would report green over unchecked live output, which is
worse than having no check at all.

Per skill rather than per card, because one agent can hold a measurement skill plus a mechanical-execution
skill. A card-level value would be wrong for one of them, then the conformance assertion could not gate
it.

## What it binds

`04-AGENT-PROTOCOL.md`'s per-skill `advicePosture` plus the assertion that checks it, `05-ONBOARDING.md`'s
review which enforces the declaration, `09-DISPUTES.md`'s financial-advice posture,
`10-DOCS-AND-POLICY.md`'s acceptable use plus listing standards, `15-SYSTEM.md`'s sanitize boundary which
no later code path can waive.

## What would make us revisit it

A fifth shape appearing in a category contract, which would need its own assertion before any listing
could declare it. The disclaimer-only route stays refused.
