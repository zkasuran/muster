# Decision: first-party reference agents exist, one per category, disclosed by derivation

Recorded by `02-THESIS.md` sections 9 and 10. This is the supply source of last resort plus the
disclosure that makes it safe to have.

## The decision

Four reference agents, one per mandated category, built and run by us, as the last of five supply
sources. The disclosure is mechanical rather than a note on an about page:

* The first-party label is **derived** from `agent.owner` against a published machine-readable address
  list, never stored as a flag on the listing.
* The label appears on every surface the listing appears on, including the API plus MCP payloads.
* Every published count splits first-party from third-party, with the third-party number as the
  headline.
* No term in the ranking function may read the first-party list.
* A job we paid for is tagged `origin: house` at ledger append time and revenue plus volume count
  `origin: order` only.
* Losses render as prominently as wins. A third-party agent that beats ours ranks above ours.
* The first-party share of hireable rows per category is published, as a number we want to fall.

## The alternative rejected

No first-party supply at all, which is the cleanest answer to a judge. On the mechanism: a stored
`firstParty` flag on the listing, which every other marketplace would use.

## Why

0 of 600 sampled agents are payable by a stranger and the four categories hold about 518 agents at
0.17 percent of the index. Some shelf would have nothing hireable on it, which fails Functionality and
Agent Diversity together. The field's most common failure is the opposite error, filling a category
with your own agent then reporting the shelf as coverage and the programme's own framing ("the
submission is the marketplace itself") is why a judge discounts that.

So the agents exist and the disclosure is structural. A flag someone has to set is a flag someone can
fail to set. Derivation cannot drift and adds no field to the model. The published list holds exactly
the addresses we can produce a signature for, which is the test that settled the one ownership
question in this evidence base (`02-thesis-brainonbnb-is-third-party.md`). An address a research note
calls ours does not get on the list on the strength of the note.

The one sentence we do not write in any form: a count of agents in a category that mixes our supply
with the ecosystem's.

## What it binds

`03-TAXONOMY.md`'s shelf cards, `06-QUALITY.md`'s `origin` rule, `07-MATCHING.md`'s anti-favouritism
audit plus the rule that a first-party listing is never the exploration candidate, `08-MONEY.md`'s
ledger append invariant, `10-DOCS-AND-POLICY.md`'s per-agent commercial statement, `13-PARTNERS.md`.

## What would make us revisit it

Third-party hireable rows on all four shelves. The reference agents stay as the conformance target
plus the reference implementation of each category contract either way, so the change would be to the
count we publish rather than to their existence.
