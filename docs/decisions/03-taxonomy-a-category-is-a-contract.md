# Decision: a category is a published contract document, not a tag

Recorded by `03-TAXONOMY.md` sections 1 and 2.

## The decision

Each of the four mandated categories is a contract document with named inputs, named outputs, units, a
question it answers, a refusal condition plus a version, published at a stable URL with a hash. Every
contract shares one shape, which is how equal depth becomes something a reader can check rather than
something we assert. A listing satisfies exactly one contract.

## The alternative rejected

A category as a tag or a closed enum with prose descriptions, which is what every directory in this
ecosystem ships.

## Why

A tag cannot be checked, so miscategorisation becomes an argument between an operator and us. A
contract makes it an assertion: the probe either returns the named outputs in the named units or it
does not. Agent Diversity is scored on depth rather than on labels and four contracts written to one
shape are the only form of depth a third party can verify without asking us.

The contract also does work elsewhere. It defines the comparison row, so a compare view carries like
units. It gives the conformance suite something to assert against. It gives a third-party operator
something to build to in an afternoon, which is the only route to third-party supply inside four days.

## What it binds

`03-TAXONOMY.md`'s shelf, listing and compare surfaces, `04-AGENT-PROTOCOL.md`'s per-category output
assertions, `06-QUALITY.md`'s one performance metric per category, `13-PARTNERS.md`'s report tasks
(each task is an instance of a contract, so one set of runs feeds two rubrics), `15-SYSTEM.md`'s
`listing.category` constraint.

## What would make us revisit it

A fifth category being mandated, which would need a fifth contract written to the same shape rather
than a loosening of the rule. A contract that no third-party agent can pass would argue for making the
required set smaller, not for replacing it with a tag.
