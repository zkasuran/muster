# Decision: search is a published grammar plus a versioned synonym table. Semantic search does not ship

Recorded by `03-TAXONOMY.md` sections 5.6 and its decisions table, with `14-GAPS.md` section 2.3
owning the synonym table plus the refused terms.

## The decision

A typed operator grammar over indexed fields, published, where an unknown operator is an error rather
than a silent ignore. Beside it a versioned synonym map per category, with the parsed query shown back
to the buyer. No semantic search, no fuzzy matching over names. Six terms are refused as category
synonyms: `trading`, `bot`, `defi`, `finance`, `risk` plus `monitor`.

## The alternative rejected

Semantic search, either as the box itself or as an extra ranking input. Also rejected: a filter sidebar
only, a natural-language box, expanding synonyms generously to fill thin shelves.

## Why

Measured on the one index in this ecosystem that offers a semantic path: "watch my Venus health factor"
returns `Stellar_Moon_Pro.agent`, `AstroAgent.agent` plus `Astroify.agent`, all name-shaped matches with
no Venus integration and its weighting knobs return byte-identical results across a sweep. That is a
dependency plus noise in exchange for nothing.

Fuzzy name matching is worse than useless on this population, because 215 of 600 sampled names are
byte-identical duplicates, so name similarity ranks copies of one thing.

The refused synonyms are arithmetic. `trading` alone matches 129,023 agents, 42 percent of the index,
against 518 for the four categories' most generous terms combined. A generous synonym turns a shelf
into noise and the shelf is the scored surface.

Operators earn their place for the opposite reason: they make the same data feel like a tool, they demo
in one line, they map one to one onto fields we already index. Silently ignoring a typo returns a
confidently wrong result, so an unknown operator is an error with the grammar printed.

## What it binds

`03-TAXONOMY.md`'s search surface, facets plus sorts. `14-GAPS.md`'s relevance section plus its
published field weights. `13-PARTNERS.md`'s AltLLM posture, since no language model runs in the render
path. `15-SYSTEM.md`'s cut list, where the operator grammar is item 6 and a plain substring search is
what survives a cut.

## What would make us revisit it

An embedding index we build ourselves over contract-shaped fields rather than over names, evaluated
against the same query set that broke the incumbent. Until an evaluation exists the answer stays no.
