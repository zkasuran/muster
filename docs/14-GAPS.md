# 14-GAPS: everything else a complete marketplace needs

Written 2026-09-05. Build closes 2026-09-09 UTC+0, read as 00:00 UTC with everything green before
2026-09-08 ends (`00-PROGRAM.md`).

## What this settles

Nine documents cover the spine of Muster: the thesis, the taxonomy, the agent protocol, onboarding,
quality, matching, money, disputes, then the published policy set. This one covers the rest of what a
venue needs to be operated rather than demonstrated. Thirty-five areas, each with what it is, why it
matters, the smallest version worth having and a verdict on whether it is in the submission.

Two rules keep it out of other documents' territory. Where a sibling owns a subject, this document
settles only the part the sibling leaves and names the sibling in a clause. Where nobody owns it, this
document settles it outright, because a hole is as bad as an overlap.

Four verdicts, used on every area:

| Verdict | Means |
| --- | --- |
| **Ships** | in the submission by 2026-09-09, as described here |
| **Ships thin** | a deliberately reduced version is in the submission, with the rest named as next |
| **Next** | designed here, not built, never described as shipped |
| **Refused** | not built, the reason is stated and it stays not built |

Three rows in the register carry two verdicts rather than one. That is deliberate rather than a hedge:
bonding ships thin while insurance is refused, growth ships everything except the incentives, which are
refused, then the legal statement ships while the entity is next. In each case the two halves are different
things with different answers, so collapsing them into one label would be the dishonest move. Where a row
carries one verdict it means it. No row anywhere reads "partly" or "if there is time".

`02-THESIS.md` section 12 carries the product ship line and this document adds to it. What it adds is
operational rather than product: the status page, the incident file and its banner, the kill switches, the
rate limits, the nightly dump, the retention job, the badge, the operator view, the per-address feed, the
three support routes and the no-wallet dry run. None of those appear in 02's Ships table, which is written
at the level of Index, Liveness, Hire and Evidence. A Ships label is a claim a judge checks on the live
site, so section 1.1 names the `15-SYSTEM.md` build-order block that builds each one and re-labels the
rows that have no block. Where an area below says Ships, it ships at the size stated and no larger.

**What this document hands to `15-SYSTEM.md`.** Three files appear below that 15's surface list does not
carry: `sitemap.xml` and `llms.txt` (section 2.2) plus `synonyms.json` (section 2.3, served at a public URL
so a reader can check what was matched). `robots.txt` is named in 15 as a thing the prober honours, not as a
thing we serve, so its served form is new here too. `incidents.json` (section 3.2) is carried by
`09-DISPUTES.md` section 10 rather than by 15. Since 09 already depends on its exact shape, it needs a
store. The routes and the flag file this document introduced in an earlier pass, `/v1/feed`,
`/v1/webhooks/{subscriptionId}/deliveries`, `/badge/<listingId>.svg`, `/operator` and `/flags.json`, are all
in 15's list now.

Five record shapes are also new. `SPINE.md`'s data model reserves naming, so they are listed here: the
eight-field incident record (section 3.2), the seven-field webhook delivery record (section 5.2), the
`(class, ttl, action, selector)` retention table (section 4.6), the agent revision record (section 6.1) and the per-listing
analytics counters (section 5.5). One field is new on an existing record, `listing.sunsetAt` (section 6.2).
They are collected here so 15 can key and index them rather than discover them. None of them may be
dropped: `09-DISPUTES.md` already reads the incident shape field by field.

## 1. The register

Thirty-five areas in the order the rest of the document takes them. Section 10 re-sorts them by what a
judge or a first real user hits first, which is a different order.

| Area | Verdict | The minimum version | Part of it owned elsewhere |
| --- | --- | --- | --- |
| The URL, DNS, TLS and link permanence | Ships | one apex we control, certificate good past 2026-09-23, outside canary every 15 min, a pre-rendered fallback that never shows a green it did not measure | `15-SYSTEM.md` deploys it |
| SEO and shareable links | Ships | server-rendered routes, per-route title and description from real facts, text-only cards, `sitemap.xml` per sweep, `llms.txt`, permanent URLs, 410 on a delisting | `03-TAXONOMY.md` fixes the routes |
| Search relevance and query understanding | Ships thin | published field weights with the function that combines them, a versioned synonym map per category, the parsed query shown back, no fuzzy matching | `03-TAXONOMY.md` owns the box, the operators, the facets, the sorts |
| Accessibility | Ships | WCAG 2.2 AA target, never colour alone for a verdict, freshness as text, whole journey by keyboard, readable with scripting off | `03-TAXONOMY.md` owns mobile plus the shelf surfaces |
| Injection defence on agent output | Ships | one deterministic screen no path can waive, text nodes only, no markdown, no agent-controlled image, no model in the render path | `15-SYSTEM.md` wires the screen, `04-AGENT-PROTOCOL.md` asserts it as C26 |
| Observability and the status page | Ships | per-source freshness rows, canary history, four internal counters per component, an incident log | `15-SYSTEM.md` owns where collectors run |
| Incident comms | Ships | one `incidents.json` driving a sitewide banner, a four-level severity ladder, a postmortem inside 5 business days on S1 and S2 | `09-DISPUTES.md` owns the money-at-risk runbook |
| Capacity and rate limiting | Ships | per-IP token buckets with a published 429 shape, a per-source circuit breaker, two RPC endpoints split by workload | `05-ONBOARDING.md` owns the per-host probe budget |
| Kill switches and feature flags | Ships | eight named flags read per request, every flip writing a `reasonsRecord`, reads never taken down by a write path | |
| Backup and recovery | Ships | nightly signed dump of the ledger, decisions and probe history, 7 days, one timed restore rehearsal, deletion job re-run after any restore | |
| Fraud and abuse of the free surfaces | Ships | per-owner live-listing cap, reserved-name block, three brakes on any spend we sponsor, duplicate cluster collapse | `06-QUALITY.md` owns score gaming, `09-DISPUTES.md` owns prohibited use |
| Sybil resistance | Ships thin | no surface unlocked by identity count, one-hop funding-cluster weight of zero, recorded not deleted | `05-ONBOARDING.md` owns the ladder, `06-QUALITY.md` owns the detections |
| SSRF on every fetch we make | Ships | the egress client is the only way out, every resolved address checked, no redirects, resolved address pinned to the connection, body capped | `15-SYSTEM.md` owns the guard, `05-ONBOARDING.md` runs it per probe |
| Key management and secrets | Ships | three keys and two credentials, two keys in the one long-running process that loads any, bounded relayer balance, no key in the tree, a written rotation path each | `15-SYSTEM.md` isolates that process behind a unix socket |
| Dependency and supply-chain integrity | Ships | exact pins, committed lockfile, `npm ci`, no dependency without a quoted licence clause | `10-DOCS-AND-POLICY.md` owns the licence table |
| Data retention, the mechanism | Ships | one scheduled job over a `(class, ttl, action, selector)` table where `action` is `blank` or `delete`, with a test per action | `09-DISPUTES.md` owns the schedule |
| Notifications | Ships thin | pull, not push: a permanent receipt URL, a public per-address feed, the operator's own declared channel. Push is section 5.2 and it is not built | |
| Webhooks | Next | the event catalogue, the signing scheme and the retry schedule are published and the delivery route answers its published shape. Outbound delivery itself is not built | `04-AGENT-PROTOCOL.md` owns the inbound side of an agent's own webhook |
| Buyer support | Ships | three no-account routes, published response targets and every failure state answering its own question on the page | `09-DISPUTES.md` owns the intake and the clocks |
| Operator tooling | Ships thin | a public self-check that needs no wallet, plus a signature-gated operator view with the lint, the drift diff and a re-check button | `05-ONBOARDING.md` owns the lint rules |
| Analytics for operators | Ships thin | the five counters that fall out of rows we already write, plus the reason a row lost a hire, with no person in any of them. The three that need a counter store and a roll-up job are not built | `07-MATCHING.md` owns the ranking those counts explain |
| A sandbox and the dry run that replaces it | Ships | a zero-cost dry run of the whole hire path showing the exact bytes, plus one labelled testnet escrow job | `08-MONEY.md` owns the rails |
| Versioning an agent itself | Ships thin | revisions keyed on `tokenUriHash` and a card hash, evidence attached to the revision that earned it | `05-ONBOARDING.md` owns the drift probe |
| Deprecating a listing | Ships thin | an operator-initiated sunset with a notice period, off the shelf at once, receipts kept forever, 410 after | `06-QUALITY.md` owns delisting for cause |
| Admin tooling and the audit log | Ships | no admin web surface at all, CLI actions with a mandatory reason, a statement of reasons per action, the ledger as the log | `15-SYSTEM.md` owns the CLI process |
| SLA and uptime credits | Refused | no SLA, no credits. A published freshness contract plus a public canary instead | |
| Insurance and bonding | Ships thin for the bond, Refused for insurance | `OperatorBond` plus its published terms on BSC testnet 97 at a flat 5 `$U`, keys we do not hold, no mainnet stake. Median-based sizing is what it becomes once a shelf has a counted median | `05-ONBOARDING.md` owns the E1 tier and fixes the amount and the lock |
| Tax and invoicing | Next | nothing this section owns is built. The receipt and the export that cover the need are `08-MONEY.md`'s deliverables. No invoice or tax document is produced | `08-MONEY.md` owns and ships both |
| Referral and growth | Refused for incentives, Ships for the rest | the machine face, share cards with measured facts, the public self-check. No referral reward, no points, no token | `10-DOCS-AND-POLICY.md` publishes the rule |
| Unit economics | Ships | the coded take rate plus the published arithmetic behind it, including what it does not cover | `08-MONEY.md` owns the fee |
| Legal entity and jurisdiction | Ships the honest statement, Next for the entity | no entity behind this entry, said plainly, with one contact point and a declared language | `10-DOCS-AND-POLICY.md` publishes it |
| The third-party API contract | Ships | `/v1` in the path, additive-only inside a major, a 90-day deprecation window and a data rule that refuses to mirror somebody else's index | `15-SYSTEM.md` owns the endpoints |
| Embeddability | Ships thin | a static SVG badge at a permanent URL, CORS open on reads only. No iframe, no script embed | |
| i18n, currency and time | Ships thin | one language, a strict number and time discipline, no fiat conversion anywhere | `03-TAXONOMY.md` owns the field rendering |
| Entry to an operated product | Next | eight steps in dependency order, with the blocker named on each | |

### 1.1 Where each shipping row is built

A Ships label is a claim a judge checks on the live site, so every row above that says Ships or Ships thin
names the `15-SYSTEM.md` build-order block that builds it. The blocks are wall clock UTC from 2026-09-06
00:00 to 2026-09-08 18:00 and each one already has a gate, so this table adds work to a block rather than
adding a block. Nothing here is scheduled outside 15's plan.

| Block | Areas it builds |
| --- | --- |
| Day 1 00:00 to 02:00, scaffold | 2.1's apex, TLS and DNS. 3.3's token buckets, the `429` shape and the load-shedding path, as middleware. 3.4's `flags.json` read in the same middleware. 4.5's pins, lockfile and `npm ci`. 2.2's two static files, `robots.txt` and `llms.txt` |
| Day 1 02:00 to 05:00, `indexer` | 2.2's `sitemap.xml`, written by the sweep that already writes the shelf counts |
| Day 1 05:00 to 07:00, `resolver` | 6.1's revision record and its diff, because `tokenUriHash` and the card hash are computed here and a revision is a row keyed on both. 4.1's duplicate-cluster collapse, which is this block's own dedupe |
| Day 1 09:00 to 12:00, `prober` plus `conformance` | 4.3 in full, including the deny table. 4.1's reserved-name block and the per-owner cap, both checked at the `in_review` to `live` edge |
| Day 1 12:00 to 16:00, `web` | 2.2's rendering, per-route title, description, text-only cards and the 410. 2.4's floor. 2.5's screen. 6.2's sunset banner and the 410 reason class. 8.3's amount, time and duration rendering, on the `decimals()` assertion the scaffold block already makes. 5.3's self-service half, which is every failure state naming its own number |
| Day 1 16:00 to 18:00, `api` plus `mcp` | 8.1 in full. 5.1's `/v1/feed`. 5.2's delivery route answering its published shape. 8.2's badge |
| Day 2 00:00 to 03:00, the signer process | 4.4 in full. 3.5's nightly dump, which is signed in the same process that signs the ledger. 7.5's `house` against `order` split at append, so revenue can only be counted from real customers |
| Day 2 03:00 to 06:00, `broker` | 5.6's dry run, which is this block's code path with the submit suppressed and the typed data rendered instead |
| Day 2 06:00 to 08:00, `screening` plus the `reasonsRecord` writer | 6.3's statement of reasons, since the writer is the same one |
| Day 2 13:00 to 16:00, `quality` | 4.2's funding-cluster filter. 5.5's five counters and the loss reason |
| Day 2 16:00 to 19:00, search | 2.3 in full |
| Day 3 03:00 to 05:00, `sampler` | 8.3's rate discipline, every rate stored with its unit and its source call |
| Day 3 05:00 to 08:00, the docs site | 5.3's three routes. 3.2's postmortem template. 5.4's self-check runner and `/operator`, which read the same lint output. 5.2's published catalogue and retry schedule. 7.5's arithmetic. 7.6's statement |
| Day 3 08:00 to 10:00, `reconciler` plus the drift banner | 3.2's `incidents.json` and the sitewide banner, on the banner machinery this block builds |
| Day 3 10:00 to 12:00, `/status` plus the canary | 3.1 in full |
| Day 3 12:00 to 14:00, the test plan | 2.4's recorded keyboard and contrast pass. 4.6's reaper and both of its tests. 3.5's timed restore rehearsal |
| Day 3 14:00 to 16:00, the publish gates | 2.1's pre-rendered fallback, which `cli` already exports, plus the anonymous-fetch gate. 4.5's clause per dependency |
| Day 3 16:00 to 18:00, the numbers re-read | every block height and timestamp in this document, including the agent count |

Two areas moved because no block could hold them. **Webhooks is Next**, not Ships thin: outbound delivery
needs a subscription record `15-SYSTEM.md` does not carry plus a retry schedule that runs for 51 hours,
against a plan that has eight items on a cut list already. What ships is the catalogue, the signing
scheme, the schedule and the route, so a consumer can build against the contract. And **three of section 5.5's eight
counters are Next**, the three that need a counter store plus a daily roll-up job, because 15's `run.kind`
enum is exhaustive and carries no roll-up. The five that fall out of rows we already write do ship.

One row is thinner than the ranking in section 10 implies. Search relevance is item 6 of 15's cut list, so
section 2.3 says what survives the cut.

## 2. Land and first contact

Everything in this section is hit before a judge forms an opinion, so each one is a scoring surface
rather than an operational nicety.

### 2.1 The URL, DNS, TLS and link permanence

**What it is.** The single address the submission cites, plus everything that has to keep answering it
for a stranger from 2026-09-09 to 2026-09-23.

**Why it matters.** Eligibility says the submission must be functional and publicly accessible during
judging (`00-PROGRAM.md`), so the URL is the first gate and the only one that fails silently. The field
already shows what failure looks like: of 59 URLs published by rival repositories 53 answer 200 and only
39 return more than 8 KB of page. Two rival deployments already 404 (`R14-rivals.md`). None of that is
exotic. It is a preview host rotating a hostname, a certificate lapsing or an app that boots into an
empty shell.

**The minimum version.**

- One apex domain we control, with the certificate's expiry read and recorded as later than 2026-09-23.
  A preview URL is never the cited URL, because its hostname is not ours to keep.
- DNS TTL at 300 seconds so the origin can move inside an hour without editing the submission.
- The anonymous-fetch gate before the form is filed: the repository flipped public, then the apex, the
  four shelves, one listing, one receipt, the status page, the API root and every raw or blob link the
  submission cites, each fetched with no credentials and each returning 200. Our own authenticated
  requests pass either way, so they prove nothing (`00-PROGRAM.md`).
- The canary runs from outside our infrastructure every 15 minutes through the whole judging window and
  walks the journey rather than pinging the root: land, shelf, listing, quote, receipt. It holds no
  credentials (`15-SYSTEM.md`).
- A pre-rendered fallback at the apex. If the app is down, the apex serves the last full render with its
  own freshness stamp, a banner saying the live path is down and a status block reading unknown rather
  than the last green. Reporting a green it did not measure is the one thing the `status` component may
  not do. A cached page inherits that rule.

**Ships.** The fallback is one static export written by the same command that runs the pre-submit gate,
so it costs a build step rather than a subsystem.

### 2.2 SEO and shareable links

**What it is.** What a link to Muster looks like when it arrives somewhere else and whether it still
resolves later.

**Why it matters.** The submission is filed as a URL in a form, so every judge arrives by a link. A route
that needs script execution to show a title is a dead end in a preview pane. The criterion is explicit
about dead ends. Nothing published says how a judge reaches the site or what they do first. `00-PROGRAM.md` puts judge behaviour on the list of things no document here may assume, so the case rests
on the link rather than on a guess about who forwards it.

**The minimum version.**

| Piece | Rule |
| --- | --- |
| Rendering | every route server-rendered and readable with scripting off (`15-SYSTEM.md`) |
| `<title>` | route plus the row's own measured facts, in the form `Grid trading on Muster: N hireable of M candidates, block 120,027,164`, with N, M and the block all read from the store at render time. The block in that example is illustrative and the rendered one is whatever the sweep last reached |
| Description | generated from the same fields, never written by hand per row, never a claim |
| Cards | `og:` and `twitter:` tags, **text only**. No image, because the only images available are agent-controlled and an agent-controlled image is an exfiltration channel (section 2.5) |
| `sitemap.xml` | regenerated each sweep, covering the four shelves, every `live` listing and every receipt |
| `robots.txt` | allow the read surfaces, disallow `/v1/export*` so an accidental crawl does not pull per-address exports. The path has no `/api/` prefix anywhere in this design, so the pattern has to match the route as section 8.1 fixes it |
| `llms.txt` | present, because one incumbent explorer publishes one (`erc-8004.quicknode.com`, with `llms-full.txt` beside it) and several rivals do too, so an agent reading this site is a real visitor here (`R14-rivals.md`) |
| Permanence | `/a/<agentId>/<listingId>` and `/receipt/<receiptId>` never change shape, no route needs a query parameter to render and a delisted listing answers **410** with its reason class and date rather than 404 or a redirect (`03-TAXONOMY.md`) |

One thing deliberately absent: `schema.org` `Product` and `Offer` markup. It would assert a price and an
availability in a form no freshness stamp travels with. A stale price in a search result is exactly the
inaccuracy the Data Quality criterion is looking for. The machine path is the `api` and the `mcp` tools,
which carry the block, the timestamp and the source on every field.

**Ships.**

### 2.3 Search relevance and query understanding

**What it is.** How a bare term is scored and what happens when somebody types a sentence instead of a
query. `03-TAXONOMY.md` owns the box itself, the operator set (`is:`, `has:`, `tag:`, `venue:`, `token:`,
`rail:`, `tier:`, `reach:`, `price:`, `answered:`, `basis:`, `owner:`, `agent:`, `cluster:`), the facets,
the sorts and the empty states. This section owns the ranking of a matched set and the mapping from
English to a query.

**Why it matters.** The population makes relevance a correctness problem rather than a polish one. A
generous keyword sweep over the index finds rebalancing 47, grid 20, health factor 21 and apy 430 with
yield inside it at 290. Taking the most generous single term for each category gives 518 agents, 0.17% of
the index, while the single word `trading` matches 129,023 (`MEASUREMENT.md`). So one wrong synonym turns a
four-row shelf into a six-figure result set. In the same index 215 of 600 sampled agents carry the
byte-identical name `Ave.ai Trading Agent`, so name matching alone ranks 215 copies of one thing above
everything else.

**The minimum version.**

Field weights, published in Docs because P2B Article 5(1) asks for the main ranking parameters and their
relative importance and 5(6) only permits withholding what would enable manipulation (`R13-prior-art.md`).
These are not worth withholding:

| Field | Weight `w(f)` | Note |
| --- | --- | --- |
| `declaredSkills[]` exact token | 4 | the operator said it about themselves in a machine field |
| `category` plus sub-capability slug | 4 | assigned by the `classifier` with its `basis` recorded |
| `name` exact token | 3 | collapsed to one row per `duplicateClusterId` before scoring |
| `services[].name` | 2 | normalised lowercase, so `a2a`, `A2A` and `a2a-card` are one thing |
| `description` token | 1 | contributes at most 2 across the whole query, whatever the query length |

**The function, because weights without one are not implementable.** `T` is the set of **distinct** tokens
left in the query after the operator clauses and the synonym expansion are taken out. Distinct is the whole
point: a token repeated five times counts once, so no amount of repetition in a query or in a field moves a
row. `hit(f, t)` is 1 when token `t` matches field `f` under that field's own rule in the table above, else
0.

```
score(t)  = max over f of  w(f) * hit(f, t)        one token scores its best field, never a sum
desc(q)   = min( 2, sum over t of 1 * hit(description, t) )
relevance = ( sum over t in T of score(t) ) / ( 4 * |T| )      in 0 to 1
```

Two properties follow from the `max` rather than a sum. A token present in both `declaredSkills[]` and
`description` scores 4, not 5, so copying a skill word into prose buys nothing. And dividing by `4 * |T|`
makes a two-token query comparable with a five-token one, which is what lets one number sort a set of
mixed-length queries. `desc(q)` is the numeric cap the table promises: two description-only tokens are
worth half a skill token and a third is worth nothing, so a keyword-stuffed description cannot outrank a
real skill.

**Relevance bands the set, it does not replace the sort.** `relevance` is rounded to one decimal and that
band is the primary key, descending. Inside a band the order is `03-TAXONOMY.md`'s published browse rank,
`0.30*Q + 0.25*R + 0.15*C + 0.15*P + 0.10*F + 0.05*E`, then `agentId` ascending as the final key so the
order is reproducible. Banding rather than sorting on the raw number is deliberate: a hairline relevance
difference should not put an unproven row above a proven one. One decimal is coarse enough that it
cannot. Eligibility is never relevance: a row that fails a hard constraint is absent rather than demoted.
That filter belongs to `07-MATCHING.md`.

Query understanding is a versioned lookup table, not a model. `synonyms.json` carries a `version` and a
`contractHash`-style digest, ships in the repo and is served at a public URL so a reader can check that
what we matched is what we published. Equal depth across the four, one row each:

| Category | Phrases mapped to it | Refused for it |
| --- | --- | --- |
| `rebalancing` | rebalance, rebalancer, drift, band, weights, 60/40, reposition, re-range, LP range | `trading`, which matches 129,023 agents |
| `grid` | grid, grid bot, ladder, range bot, buy low sell high, DCA grid | `bot`, `trading` |
| `yield` | apy, apr, yield, farm, farming, earn, pool rate, staking rate, best rate | `defi`, `finance` |
| `health-factor` | health factor, hf, liquidation, liquidated, collateral ratio, margin, borrow safety | `risk`, `monitor` |

Three rules make that safe. A mapping expands into an explicit `tag:` clause and the expansion is shown
back to the buyer as text (`interpreted as tag:health-factor is:live`), so nothing is rewritten silently.
A phrase that matches two categories produces both clauses and says so rather than picking. And the
refused column is enforced: a term in it is treated as a bare token against the field weights and never
as a category, because a single word that hits 129,023 rows is noise wearing a facet's clothes.

No fuzzy matching in this version. Instead a fixed misspelling table for the four category names, the
sub-capability slugs and the eight token symbols, plus prefix matching on tokens of four characters or
more. Trigram similarity over about 335k mostly-templated names (336,240 at block 120,163,219,
2026-09-05T19:03:16Z, read from the `_lastId` slot) produces a confident wrong answer, which is
the failure this whole product is built against. The one index that offers a semantic path answers
"watch my Venus health factor" with three astrology agents while its weighting knobs return byte-identical
sets across a sweep of 0.3, 0.5, 0.8 and 1.0 (`R05-8004scan-api.md`, quoted in `02-THESIS.md`).

Zero results use `03-TAXONOMY.md`'s empty state, with the parsed query and a hit count per clause so the
buyer sees which clause emptied it. An unknown operator runs nothing and lists the valid set.

Query logging is what makes the next version possible, so it is defined now: the query string, the parsed
clauses, the result count, the clicked rank if any and a coarse timestamp. No wallet address and no IP are
stored beside any of it. Retained 30 days, which is section 4.6's class table.

**Ships thin.** Weights, the function, the synonym map, the parse-back and the misspelling table. Learning
from clicks, a relevance holdout and any fuzzy recall are next. Each needs traffic this entry will not have.

**What survives the cut, because this area sits below the only cut line in the lane.** Search's operator
grammar is item 6 of `15-SYSTEM.md`'s eight-item cut list and losing day 1 cuts items 1 to 6, which would
leave a plain substring search over `name` and `description`. That is the failure this section spends a
page on: one bare term matches 129,023 rows and 215 of 600 sampled names are byte-identical
(`MEASUREMENT.md`). So the cut is ordered inside the area rather than taken whole. The synonym map, the
refused-term list and the duplicate collapse survive to the last, because they are a JSON file plus a
`WHERE` clause and they are what stops a shelf becoming noise. The operator grammar goes first, then the
parse-back, then the misspelling table. A visitor who loses the grammar still gets a four-shelf browse that
never routes a bare `trading` into a category, which is the part a judge scores.

### 2.4 Accessibility

**What it is.** Whether the journey works for somebody not using a mouse, a large screen or colour vision.
`03-TAXONOMY.md` owns mobile layout and the shelf, listing and compare surfaces. This section owns the
floor that applies everywhere and the pass that proves it.

**Why it matters.** The rubric's Functionality criterion says someone with zero Agent Studio knowledge
should get through without hitting a dead end. A keyboard trap is a dead end that a mouse user never sees.
A data-dense marketplace fails accessibility in specific, predictable ways, so the floor names them.

**The minimum version.** WCAG 2.2 AA as the target, with five things checked by hand before submit:

1. **No verdict carried by colour alone.** Every `pass`, `fail` and `skip` renders its word and a probe
   failure renders its `failureClass` (`dns`, `tls`, `http`, `template`, `shape`, `timeout`) rather than a
   status light. The design already forces this, because merging those into one indicator destroys the
   only actionable part of the finding (`05-ONBOARDING.md`).
2. **Freshness as text, never as a tooltip.** The block number, the age and the source sit in the document
   for every number, so a screen reader reaches them in the same pass as the value.
3. **The whole journey by keyboard**, including the compare picker, the operator hint, the shelf filters
   and the Revoke button on the session panel, with a visible focus ring and no focus trap. Revoke is the
   one that matters most: it is a control over money that a track requirement says a user must be able to
   reach (`00-PROGRAM.md`).
4. **Readable with scripting off.** Server rendering makes this true by construction (`15-SYSTEM.md`) and
   it is the strongest single accessibility guarantee available, since it also covers a text browser, a
   preview crawler and a slow connection.
5. **Contrast at 4.5:1 for text and 3:1 for controls**, checked on the tier bands, the `differs` marker in
   compare and the risk banner. The banner is separately required to be statically fixed at the top of any
   view showing a rate or a projection rather than in a footer or a dismissable modal, which is a placement
   rule from the FCA's own handbook and an accessibility rule at the same time (`R15-compliance.md`,
   published by `10-DOCS-AND-POLICY.md`).

**Ships** at that floor. An automated axe pass in CI and a screen-reader walkthrough are next.

### 2.5 Injection defence on agent output rendered to a buyer

**What it is.** The screen that every operator-supplied and agent-supplied string passes before it reaches
a browser, a rendered log or any prompt. `07-MATCHING.md` assigns the sanitiser here,
`04-AGENT-PROTOCOL.md` asserts it as conformance check C26 and `15-SYSTEM.md` wires it as one of its four
boundaries.

**Why it matters.** Every capability claim on this site arrives over HTTP from an operator-controlled URL,
because the registry carries no endpoint on chain (`R12-agent-comms.md`). The listing page renders the
agent's most recent probe response verbatim as the answer sample (`03-TAXONOMY.md`), so a hostile operator
gets a paragraph of their own text onto our page in front of a judge. The exfiltration class is live and
recent: GitHub fixed the Copilot Chat image path by disabling image rendering entirely, despite already
proxying images through its own HMAC-signed proxy. The same researchers demonstrated a zero-click image
path plus a one-click link path against two shipped assistants (`R12-agent-comms.md`). One correction from
the same file, because it will otherwise be repeated: the CVE identifier circulating for that GitHub issue
is wrong. `CVE-2025-59145` in NVD is the `color-name` npm account takeover, CVSS 4.0 base 8.8, published
2025-09-15. Cite the class, never that id.

**The minimum version.** One screen, deterministic, running before render, before any log that gets
rendered and before any prompt. No later code path may waive it.

| Rule | Detail |
| --- | --- |
| Text nodes only | agent and operator strings are set as text, never as HTML and never parsed as markdown. No autolinking, so a URL in a description renders as characters |
| No agent-controlled image | not hot-linked, not proxied, not in an `og:` card. Where an image is shown at all it was fetched server-side, content-type and magic-bytes checked, byte-capped, re-encoded and served from our origin (`05-ONBOARDING.md`) |
| Length caps per field | 400 characters on a description, 1,500 on a captured response body before anything reads it. The cap applies before the pattern scan so a scan cannot be starved |
| Control characters | C0, C1, bidi overrides and zero-width joiners stripped, then the string normalised to NFC before storage, so what is hashed is what is rendered |
| No model in the render path | Muster runs no language model to produce a page. This is the strongest form of the defence, because an instruction embedded in agent text has nothing to instruct |
| Injection pattern scan | the pattern set in `R16-reuse.md` section 5.3 (`ignore (all\|any\|the\|your\|previous\|above)`, `disregard …`, `forget …`, `you are (now )?(a\|an\|my)`, `system prompt`, `new instructions?`, `override (the\|your\|all\|safety)`, `bypass`, `jailbreak`, `pretend (to be\|you are\|that)`), applied to listing copy, task inputs and agent outputs |
| Flagged is annotated, not deleted | the scan redacts and labels rather than rejecting, so a flagged listing still renders and the buyer can see why it is flagged. A C26 failure suspends rather than delists, because the sanitiser is ours (`04-AGENT-PROTOCOL.md`) |
| Structured logs only | agent text is a field value in a log record, never concatenated into a log line, so a newline in a description cannot forge a log entry |
| Export guard | any export column that could ever carry operator text is prefixed with `'` when the value starts with `=`, `+`, `-`, `@`, a tab or a carriage return. Today's CSV columns carry none (`08-MONEY.md`), so this is a rule that binds the next column added |
| DOMPurify as depth, not as the control | `isomorphic-dompurify` 4.1.0 over `dompurify` 3.4.14, taken under Apache-2.0 of its dual grant (`10-DOCS-AND-POLICY.md`), sits on the one path that would ever render rich text. That path is empty in this version and the primary control stays the text node |

Two tests per pattern, not one. A positive that must flag, then a false positive that must not, on the
discipline that a substring rule which turns `console` into `sol` is a defect rather than a near miss
(`R16-reuse.md` sections 1.5 and 5.3). The pattern list ships with its own test rows so a later addition
cannot quietly widen it.

**Ships.**

## 3. Staying up

The judging window is 2026-09-09 to 2026-09-23, which is fourteen days of unattended operation by one
person. Everything here exists because of that sentence.

### 3.1 Observability and the status page

**What it is.** What we measure about ourselves and the public page that shows it. `15-SYSTEM.md` owns
where the collectors run and holds the `status` component to one rule: never report a green it did not
measure.

**Why it matters.** Data Quality is a scored criterion and it asks for real-time accurate data. The
honest version of that claim is not a promise, it is a page showing each source's age beside our own. The
risk is measured rather than hypothetical: the sponsor's index self-reported `status: down` for a whole
session with a canonical checkpoint at block 119,687,744, roughly 32 hours stale, holding 304,281 BSC
agents against 334,935 on chain at block 120,027,164, 2026-09-05T02:02:32Z, plus 11,780 feedbacks against
29,712 written across that same sweep, while a different endpoint of its own said the database was fine
(`R05-8004scan-api.md`, `R14-rivals.md`, `SPINE.md`). A rival's landing page rendered `--` for three of
four headline metrics from exactly that dependency while it was being read.

**The minimum version.** `/status`, server-rendered, no auth, four blocks:

1. **Per-source freshness.** One row per source with its own age, never a single site-wide green. Our own
   sweep block and age from the `indexer`. BSC head from our own RPC. 8004scan's chain-56 row read from
   `/status/indexers` and shown with its own `direct_canonical_checkpoint_block` and
   `direct_canonical_checkpoint_age_seconds` rather than our summary of it. trust8004 reconciled against
   itself, `lastAgentId` against `onChainLastAgentId`, since it publishes its own lag and both fields are
   in its captured payload (`R14-rivals.md`). Two of **8004scan's** fields are never displayed as
   freshness: `endpoint_last_checked_at`, which does not move even when a verification demonstrably runs,
   then `health_score`, which read 100.0 for an agent whose certificate does not match its own hostname
   (`R05-8004scan-api.md`). Neither field exists on trust8004, so neither is a trust8004 problem.
2. **The canary history.** Every run in the window with a pass or fail per step of the journey, run from
   outside our infrastructure with no credentials. A failed step names the step.
3. **Our own numbers.** Four counters and one histogram per component, which is enough to diagnose and
   small enough to keep: requests, failures, refusals with a class, items processed, plus a latency
   histogram. Rendered as the ones a reader can act on: probe pass rate over the last hour, `api` p50 and
   p95, facilitator settle success, sweep duration, ledger `walk()` result.
4. **The incident log.** Section 3.2's records, newest first, each linking its postmortem.

**Alerting, stated honestly.** There is one operator and no rota, so the design does not imply a pager.
The alert is a failed GitHub Actions run: the canary workflow exits non-zero and opens an issue on the
repository using the runner's own ambient token, which is the fourth entry in section 4.4's secret
inventory. Watching that repository is the channel. There is no chat webhook, bot token or paging
credential anywhere in the design, because a credential we do not hold cannot be listed and a channel we
cannot reach must not be promised. `09-DISPUTES.md` names the same posture for the money-at-risk runbook.
The published response target is acknowledgement inside one business day, which is a target we can meet.
Section 7.1 explains why no availability number is promised anywhere.

**Ships.**

### 3.2 Incident comms

**What it is.** How a degradation is announced in our own words before a visitor finds it and what is
owed afterwards.

**Why it matters.** A stale number with no notice reads as inaccuracy. The same number with a banner
naming the source, the age and the next update reads as operations. Since the whole field shares one
upstream dependency, an outage during judging is likely rather than possible.

**The minimum version.** One file, `incidents.json`, each record
`{id, startedAt, endedAt, severity, affects[], statement, nextUpdateBy, postmortemUrl}`. An open record
renders a sitewide banner and the status page renders the history. The severity ladder decides what else
happens:

| Severity | Definition | Obligation |
| --- | --- | --- |
| **S1** | a wrong number was published or a payment path can lose money | banner inside 15 minutes of detection, the affected fields marked individually, a correction entry appended to the `ledger` because it is append-only and a published number is never silently edited (`08-MONEY.md`), a correction notice attached to every affected receipt, postmortem inside 5 business days |
| **S2** | the hire path is down while reads work | banner, `hire.enabled` flipped to false so the button states its reason rather than failing (section 3.4), postmortem inside 5 business days |
| **S3** | a source is stale beyond its contract | the per-source row goes red on its own, the dependent fields render their unknown state, no banner unless a shelf empties |
| **S4** | cosmetic | logged only |

The postmortem template lives in Docs and carries five things: what a visitor saw, when we knew, what the
cause was, what changed so it does not repeat, then what is still true and unfixed. No blameless-culture
prose, no apology paragraph.

**Ships.** With an empty history, because seeding a fake incident to demonstrate the surface would be the
same defect as seeding a fake listing.

### 3.3 Capacity and rate limiting

**What it is.** Three sets of limits: what we accept, what we send to third parties, then what we send to
the agents themselves. `07-MATCHING.md` assigns this section the marketplace's own limits and
`05-ONBOARDING.md` owns the probe budget, which is the third set.

**Why it matters.** Three judges, a rival scan, a crawler and our own canary can arrive inside the same
minute. The read surfaces are anonymous by design, so there is no account to throttle. On the outbound side
every free dependency has a published or measured ceiling and one of them forbids bulk extraction in its
terms.

**Inbound, per IP, token bucket, `429` with `Retry-After` and a problem-details body
(`04-AGENT-PROTOCOL.md`'s error shape).** Every response carries `RateLimit-Limit`, `RateLimit-Remaining`
and `RateLimit-Reset`, which `10-DOCS-AND-POLICY.md` publishes and takes its numbers from here. **The three
headers always report the per-minute bucket**, because that is the window a client actually hits and the one
`Retry-After` is computed from. Where a surface also carries an hourly ceiling, that number is published in
Docs and its `429` carries a `Retry-After` counting to the top of the hour, so a client never has to infer
which of two windows tripped. `RateLimit-Reset` is seconds remaining, not a timestamp.

| Surface | Limit | Reason |
| --- | --- | --- |
| Read pages and `api` list reads | 60 per minute, burst 120, plus 600 per hour | enough for a human plus a script, cheap to serve from the store |
| `/search` | 30 per minute | the most expensive read and the one a crawler will hammer |
| `/badge/*.svg` | 300 per minute, cached at the freshness contract | an embed on a busy page is one client with many readers |
| `GET /v1/feed?address=` | 20 per minute per IP plus 20 per minute per `address` value | it is an unauthenticated per-address enumeration surface, so the address is the thing to bound as well as the caller. Every field in it is already public, which is why it is not gated rather than not limited |
| `GET /v1/export.csv?payer=` and `/v1/export.json?payer=` | 10 per minute per IP plus 10 per hour per `payer` value | the same per-address shape and the heaviest to build. Section 2.2 keeps crawlers off it. A limit is what keeps a scripted sweep off it |
| `GET /v1/ledger` | 20 per minute, `to - from` capped at 1,000 entries | it is the audit surface, so it stays open. A page cap is cheaper than a rate cap for the caller |
| `GET /v1/decisions/{reasonId}` and `GET /v1/receipts/{receiptId}` | 60 per minute | single-record reads, same cost as a page |
| `GET /v1/status` and `GET /v1/webhooks/{subscriptionId}/deliveries` | 60 per minute | both are small fixed reads. The deliveries route answers an empty collection in this entry (section 5.2) |
| Quote and hire | not rate limited after payment | a paid call is never throttled once settled (`04-AGENT-PROTOCOL.md`) |
| Webhook subscription registration | 5 per job | published with the contract in section 5.2 rather than enforced, because the registration surface is not built. It is an SSRF sink, so the number is fixed before anybody builds it |

Above a global concurrency cap the answer is load shedding rather than failure: shelf and listing pages
serve their last full render with the freshness stamps they were built with, which is honest because every
number on the page already carries its own age. The hire path never serves a cached quote.

**Outbound to third parties**, each number measured rather than assumed:

| Dependency | Ceiling | How we stay inside it |
| --- | --- | --- |
| `bsc-rpc.publicnode.com` | `eth_getLogs` capped at 5,000 blocks with anything older refused as an archive request. The operator's terms forbid "data mining, robots, scraping, or similar data gathering or extraction methods" (`R15-compliance.md`, `R01-erc8004.md`). It returns HTTP 429 with a complete correct body when throttling, so a well-formed array counts as success (`MEASUREMENT.md`) | interactive single reads. Batching is technically fine here and we still do not bulk-index through it, because the reason is the terms rather than a capability |
| `bsc.rpc.blxrbdn.com` | the fastest keyless batcher measured, 200 calls in 0.27 s, `eth_getLogs` capped at 5,000 blocks (`SPINE.md` constants, `MEASUREMENT.md`) | every batch goes here, size pinned at 200 calls. **Every batch response length must equal the request length or the sweep fails loudly**, which is the assertion below |
| `bsc-dataseed.binance.org` plus the `defibit.io` and `ninicoin.io` mirrors | **a named negative example, never a batch target.** It silently truncates: a 200-call batch returns HTTP 200 with exactly one result (`MEASUREMENT.md`, line 681 of that file). Re-measured here on 2026-09-05T19:02Z with a plain `curl` and no custom headers: 5 requests returned 5, 20 returned 20, 100 returned 100, 150 returned 1 and 200 returned 1, so the truncation point sits between 100 and 150 and the failure is a silent short answer rather than an error | it is recorded so nobody re-adds it. Used only as a single-read fallback when blxrbdn is unreachable, with a hard refusal to quote when neither answers. `15-SYSTEM.md` owns the final endpoint assignment |
| Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11` | `aggregate3` takes 1,500 sub-calls in one `eth_call`, 2,500 hits the node's 30 s timeout | batch size pinned at 1,000 with the ceiling recorded beside it |
| A full registry sweep | 183 agents per second, so about 30.5 minutes, 670 `eth_call`s and 0.27 GB | daily, plus a tail on the `_lastId` delta every minute (`R01-erc8004.md`) |
| 8004scan | anonymous 30 per minute and 1,000 per day per IP, a self-service `free_api` key 600 per minute and 100,000 per day, a `limit` ceiling of 100 with 101 returning 422, plus a mandatory `User-Agent` that is not `Python-urllib/*` because Cloudflare 403s that even with a valid key | one key, `limit=100`, a stated user agent, then treat it as a cross-check rather than a dependency |
| `POST /agents/verify-endpoint/{chain_id}/{token_id}` | no auth, once per hour per agent | the button carries a countdown rather than a silent failure (`05-ONBOARDING.md`) |
| PancakeSwap Unified Swap API | 10 requests per second per IP, quote TTL exactly 180 s | quotes are fetched on demand and never cached past their TTL (`R08-pancakeswap.md`) |
| Human Passport, if it is ever wired | 125 requests per 15 minutes on tier 1, 60 second timeout | listing-time only, cached and never on a request path (`R13-prior-art.md`) |

**The batching conflict in the research, named rather than picked.** `R15-compliance.md` line 114 records
publicnode rejecting JSON-RPC batching, "a 5-item and a 20-item batch both return HTTP 403", plus dataseed
accepting batches. `MEASUREMENT.md` lines 679 to 681 records the opposite on both counts. The measured file
wins here and the reason is a re-test rather than a preference. Against
`https://bsc-rpc.publicnode.com` on 2026-09-05T19:02Z, 5-item, 20-item and 200-item `eth_chainId` batches
all returned HTTP 200 with the full result count, with a default `curl` User-Agent and again with the header
suppressed. So the 403 was observed on one pass and does not reproduce. `R08-pancakeswap.md` line 1037 names the likely confound, "a 60-item batch with no user-agent header got a
403 from publicnode", which reads as a WAF response rather than a batching policy. Nothing in the design
rests on it: publicnode stays on interactive single reads because of the terms clause, which is the stronger
reason and is unaffected. Batches go to blxrbdn because it is the fastest measured batcher rather than
because publicnode refused them.

**One assertion carries the whole batching design.** Every batch response is checked for
`len(response) == len(request)` before a single result is read. A short answer aborts the sweep with the
endpoint named rather than writing a partial pass. Without it a truncating endpoint looks like a chain with
fewer agents in it, which is data loss wearing the shape of a fact. `15-SYSTEM.md`'s RPC pool probe already
marks a truncating endpoint no-batch at boot, so this is the per-call form of a check that also runs once.

**A circuit breaker per source, because one of them has already failed under measurement.** 8004scan
returned non-200 on 20.8% then 56.7% of calls across two windows in one day (`R05-8004scan-api.md`). So
each foreign source has a breaker: when its non-200 rate crosses 25% over a rolling 5 minute window or its
self-reported freshness exceeds its contract, we stop calling it, mark the row stale on the status page and
keep serving from the chain. A short outage memory plus demotion rather than exclusion is the shape that
survives production elsewhere (`R13-prior-art.md`).

**The half-open state, because without it the breaker cannot close.** Three consecutive successes are the
close condition and an open breaker makes no calls, so the trial cadence has to be stated or one bad
5 minute window parks a source at unavailable for the rest of the judging window. Sixty seconds after it
opens the breaker goes half-open and allows exactly **one** trial call, then one more every 60 seconds. A
success advances the counter, a failure resets it to zero and returns to open for another 60 seconds. Three
in a row closes it, so the fastest recovery is about three minutes and a source that is genuinely down costs
one call a minute rather than a page of them. The trial call is a read we would make anyway, the source's own
status endpoint, so half-open costs no extra request budget. The current state and the time of the next
trial both render on the status page, because a reader who sees a stale row should be able to tell a source
we stopped calling from a source that is answering wrong.

**Ships.** A shared quota store across more than one `web` process is next, because this entry runs one.

### 3.4 Kill switches and feature flags

**What it is.** One place to turn a path off without a deploy and a rule about what turning it off is
allowed to break.

**Why it matters.** The submission has to stay functional for fourteen days. The failure that costs a
score is not a broken hire path, it is a broken hire path that takes the readable half of the site with
it. A flag read per request is the difference between a minute of degradation and an hour of downtime.

**The minimum version.** One `flags.json` read per request rather than at boot, eight flags, each with a
published effect on the interface:

| Flag | Effect when false |
| --- | --- |
| `hire.enabled` | the hire button renders a stated reason. Reads, search, compare and receipts all keep working |
| `hire.mainnet.enabled` | mainnet settlement pauses while the testnet job and the dry run stay |
| `probe.enabled` | probing stops, every row's check age keeps counting up and rows cross into `stale` on schedule, which is the correct outcome rather than a frozen timestamp |
| `probe.paid.enabled` | paid probes stop, free probes continue, the house budget row on `/coverage` says why |
| `source.8004scan.enabled` | that source's rows read unavailable with the reason, our own numbers unaffected |
| `source.trust8004.enabled` | the same |
| `webhooks.enabled` | deliveries queue rather than drop and the queue depth is on the status page |
| `exploration.enabled` | the exploration slot on each shelf renders empty with its reason (`07-MATCHING.md` owns the slot) |

Every flip writes a `reasonsRecord` with a reason and appears in the incident log if it lasted more than
five minutes. A flag is never used to hide a number: turning a source off marks it unavailable, it does not
substitute a stale value.

**Ships.**

### 3.5 Backup and recovery

**What it is.** What we back up, what we rebuild and how long each takes.

**Why it matters.** The recovery story is unusually strong here and worth stating as a design property
rather than a chore: everything authoritative lives on BSC. Identity, ownership, agent wallets, payments,
escrow state and feedback are all on chain, so a total loss of our store costs time rather than truth. The
exception is the only data we create ourselves, which is the probe history, the conformance verdicts, the
decisions and the ledger. Those cannot be re-derived from anywhere, so those are what a backup is for.

**The minimum version.**

- Rebuild path, timed rather than assumed: a full registry sweep at 183 agents per second is about 30.5
  minutes, 670 `eth_call`s and 0.27 GB (`R01-erc8004.md`). A full re-index of the ERC-8183 kernel took
  455.6 s (`R16-reuse.md`). So an empty store returns a complete catalogue inside about 40 minutes with no
  backup at all.
- Nightly dump of the four things that cannot be rebuilt: `ledger`, `decisions`, `probeResult` history and
  the `evidence-store` index. Written as the same hash-chained signed form the live store uses, so a
  restored copy verifies with `walk()` and a tampered backup fails on the same three checks a tampered
  live record fails.
- Retention 7 days. The restore is rehearsed once before submit against an empty store, with the measured
  wall clock written into Docs. An unrehearsed restore is a claim.
- **The deletion job re-runs immediately after any restore.** This is the interaction most designs miss: a
  restore that resurrects a job brief past its retention window undoes the retention guarantee, which is
  meant to be technical rather than documented (`09-DISPUTES.md`, `R15-compliance.md`).
- Stated plainly: RPO 24 hours on our own measurements, RTO about an hour dominated by the sweep. No money
  is at risk in either number because no money is in our store (`08-MONEY.md`).

**Ships.**

## 4. Keeping it honest under attack

`06-QUALITY.md` owns gaming of the score and `09-DISPUTES.md` owns prohibited use, the takedown path and
abuse of the dispute channel. This section owns the attacks that cost us money or corrupt the venue without
touching a score, plus the four operational defences nobody sees until they fail.

### 4.1 Fraud and abuse of the free surfaces

**What it is.** Everything a stranger can do to Muster for free, given that browsing, search, compare, the
whole read API, the conformance suite, the status page and the settler are all free and need no account
(`08-MONEY.md`).

**Why it matters.** Registration on the registry is permissionless: a simulated `register(string)` from an
arbitrary address returns an id (`R15-compliance.md`), 2,110 agents are added a day and metadata is mutable
by the owner at any time. So the adversary's cost of creating supply is close to zero while our cost of
processing it is not.

**The attacks, each with the defence that ships.**

| Attack | Defence |
| --- | --- |
| Register 5,000 agents pointing at a host somebody wants hammered, turning our prober into an amplifier | the probe budget is per host rather than per listing, one request per 1.5 seconds, `robots.txt` fetched and its `Disallow` honoured, then the SSRF guard on every attempt (`05-ONBOARDING.md`). The measured population makes this concrete: 229 endpoint URLs live on 9 hosts with one host holding 217 |
| Listing spam by duplication | duplicate collapse on the `tokenUri` content hash with one representative per `duplicateClusterId` (`03-TAXONOMY.md`). The shape is measured: 215 of 600 sampled agents are the byte-identical `Ave.ai Trading Agent` under 215 distinct owners (`MEASUREMENT.md`) |
| One operator flooding a shelf | a cap of four live listings per owner address, checked at the `in_review` to `live` edge, appealable. The per-agent limit is already handled by `15-SYSTEM.md`'s unique index on `(agentId, category)`, so this cap exists to bind the operator rather than the id: an unproven supplier holds four live rows in total, however many agent ids it owns. Four is what a shelf set can absorb from one supplier without becoming that supplier's shelf. Capping what an unproven supplier may list, rather than refusing to list it, is the pattern that holds a large catalogue together. The sharpest published version of it lets a new seller hold 4 listings while it has no score (`R13-prior-art.md`) |
| A shell listing with no function | the hireable bar, which is a live call that satisfies the category contract. The sharpest published version of this test is the functional one: a name is squatted when the package "has no genuine function" (`R13-prior-art.md`). `02-THESIS.md` owns the bar |
| Impersonating a protocol or a sponsor | a reserved-token list (`bnb`, `binance`, `pancakeswap`, `venus`, `lista`, `aave`, `altana`, `termix`, `muster`, `agent studio`) blocks go-live and routes to review. The operator address from `ownerOf` shows on every card. Silent capability change is separately a prohibited practice (`R15-compliance.md`) |
| Free on the probe, paid differently on the real path | a route that answered a payable challenge and now answers a free 200 suspends immediately, which is an existing gate (`05-ONBOARDING.md`) |
| Spending our own money | the house probe budget is real money tagged `origin: house` (`04-AGENT-PROTOCOL.md`), so it carries three ceilings: per call, per day and a lifetime cap after which probing keeps running free and stops spending. All three render on the report page with the amount spent to date |
| Abuse of any public try-it path | the same three brakes: a per-IP rolling minute, a per-request budget the path can see, then the global lifetime cap |

**What the cap's appeal grants, since a cap with an unnamed appeal is a refusal.** An operator over the
limit gets a statement of reasons naming the cap. The fifth listing holds at `in_review` rather than
being rejected, so nothing is lost. The appeal is decided on one question, whether the rows are distinct
services or near-identical copies. It grants a **raised per-owner limit recorded against that address**
rather than a waiver of the rule. The raise is published as a `reasonsRecord` with the address and
the new number, so the exception is as checkable as the rule. An owner whose rows collapse into one
`duplicateClusterId` is refused, because that is the flooding shape the cap exists for.

**Ships.** A moderation queue with a human reviewer and a trusted-flagger path are next. The accredited
flagger programme in the DSA is a real mechanism and nobody joins one inside four days
(`R13-prior-art.md`), so the intent is published and the queue is not built.

### 4.2 Sybil resistance

**What it is.** Why creating a thousand identities buys nothing here. `05-ONBOARDING.md` owns the E0 to E4
ladder and the BABT check, `06-QUALITY.md` owns the detections that keep sybil feedback out of a score.
This section owns the structural rule.

**Why it matters.** Identity is free on this chain and the reputation surface proves it: of the 334,935 ids
swept at block 120,027,164, 2026-09-05T02:02:32Z, only 4,406 carry any feedback at all, 111 addresses wrote
all 29,712 rows and the busiest single author rated 1,800 agents (`MEASUREMENT.md`, `SPINE.md`). Any design
where a count unlocks something is already defeated. The head has moved since that sweep, to 336,240 at
block 120,163,219, 2026-09-05T19:03:16Z, which is the point rather than a caveat: a bare count is stale
inside the hour and `15-SYSTEM.md`'s day 3 16:00 block re-reads every one of these before submit.

**The minimum version, one rule and one filter.**

The rule: **nothing on Muster is unlocked by a count of identities.** Not visibility, not rank, not a
badge. The three things that unlock anything each cost something a duplicate cannot cheaply repeat. A
settled paid job with a distinct payer costs money and reaches E2. An attestation reaches E3 as an OR across
BABT `balanceOf(address)` non-zero, Galxe Passport or a BNB Passport schema hit through
`user_finished_one_of_attestation(address,bytes32[])`, so no single issuer is a chokepoint and BABT alone is
never the gate (`SPINE.md`, `05-ONBOARDING.md`). A live Altana session readable on chain reaches E4 and costs
a registration fee of `registrationFeeUSD()` 5e17, about $0.50 priced off a Chainlink feed (`R06-altana.md`).
BABT is a real population rather than a universal one, 1,166,396 live against 1,319,158 ever minted, so
11.58% are revoked or burned and an OR ladder is the only honest form of it (`R10-bab-attestation.md`).

The filter: feedback and score weight from a payer inside the provider's own one-hop funding cluster counts
zero. Self-financed means `funder(buyer) == provider` or `funder(buyer) == funder(provider)`, spelled the
way `06-QUALITY.md` section 6.1 spells it. More than 25 such
**sales** marks the listing habitual, which is a published heuristic with a published result behind it and is
counted as events rather than as distinct counterparties: the source formalises it as
`count(sales where self_financed(buyer, provider)) > 25` (`R13-prior-art.md`). Twenty-five sales to one address
and twenty-five single sales are different populations, so the unit matters. Two properties matter. The row is **recorded and labelled rather than deleted**,
because silently withholding is the pattern a US rule treats as review suppression while a sentiment-neutral
published filter stays legitimate (16 CFR 465.7(b), `R13-prior-art.md`). And the cluster is computed from
addresses we already index on both sides of every job, so it is a join rather than a research project.

**Ships thin.** The rule and the filter ship. A scored humanity check as optional enrichment is next: the
API returns `passing_score`, `threshold` and a per-credential `dedup` flag, which is the actual sybil signal,
but tier 1 is 125 requests per 15 minutes so it is a listing-time cached lookup and never a gate
(`R13-prior-art.md`).

### 4.3 SSRF on every fetch we make

**What it is.** The rule set for outbound requests. `15-SYSTEM.md` owns the guard as code and
`05-ONBOARDING.md` runs it on every probe. This section owns the complete list of paths it binds and the two
gaps a naive guard leaves.

**Why it matters.** Muster's inputs are URLs supplied by strangers. There are more of those paths than the
probe alone. Each one is a sink.

| Path | Whose URL |
| --- | --- |
| `resolver` fetching a `tokenUri` | the agent owner's, across all six live URI shapes |
| `prober` calling a declared endpoint | the agent owner's |
| the `.well-known/agent-registration.json` and card fetch | the agent owner's. The endpoint may be a card URL, a base domain or a template with a literal `{agentId}` still in it (`R12-agent-comms.md`) |
| image fetch for a listing | the agent owner's |
| a buyer's webhook target | the buyer's, re-resolved on every attempt |
| a deliverable pointer on a settled job | the provider's |
| foreign index reads | ours, but they are configured strings and belong under the same client |

**The minimum version.** One egress client. Nothing in the codebase may open an outbound connection any
other way, which is the only property that makes the rest of the list enforceable.

1. Scheme restricted to `http` and `https`. Anything else refused with a reason.
2. Resolve the host, then check **every** returned address rather than the first, so a multi-record host
   cannot smuggle one private answer through (`R16-reuse.md` section 2.5).
3. An explicit deny list on top of the standard library, because the standard library is not enough:
   `ipaddress.is_global` returns True for `224.0.0.1`, `239.255.255.250`, `ff02::1`, `ff00::1` and
   `64:ff9b::7f00:1` on python 3.11.5, so multicast and NAT64 pass a naive check (`R12-agent-comms.md`).
   The deny list also carries what A2A's own security text names: `127.0.0.0/8`, `10.0.0.0/8`,
   `172.16.0.0/12`, `192.168.0.0/16`, localhost, link-local and every cloud metadata address.
4. **Connect to the address that was checked**, not to the hostname again. Resolving and then handing the
   hostname to the HTTP client leaves a window in which DNS can change between the check and the connection,
   which is the gap that makes a check-only guard decorative. The client connects to the pinned address with
   the `Host` header and the TLS SNI set to the original hostname, so certificate validation still binds to
   the name.
5. **Redirects are never followed.** A public host that answers 302 to a private address defeats a
   pre-flight check on its own. A redirect is recorded as its own probe outcome with the target, which is
   also a useful listing diagnostic rather than only a defence.
6. Response body truncated before anything reads it, 1,500 characters on a probe head and a hard byte cap on
   an image, then content type checked before parsing, because 200 is not existence: one live host answers
   both well-known paths with 74,239 bytes of HTML shell (`R12-agent-comms.md`).
7. Timeouts and one retry only on a network-layer failure, never on a status code (`05-ONBOARDING.md`).
8. Path handling on any URL we assemble from operator input follows the published template rules: must start
   with `/`, must match `^/[a-zA-Z0-9_/:.\-~%]+$`, must not contain `..` and must not contain `://`.
   Percent-encoding is decoded **before** those last two checks so `%2e%2e` is caught
   (`R12-agent-comms.md`). A template that fails is discarded rather than repaired.

**The test matrix**, because each of these has a shipped counterexample somewhere: the five addresses the
standard library gets wrong, a hostname that resolves to one public and one private address, a host that
302s to a metadata address, a URL with `%2e%2e` in the path, a 200 answering `text/html` where JSON was
declared, then a body larger than the cap.

**Ships.**

### 4.4 Key management and secrets

**What it is.** Every secret Muster holds, where it lives, what it can do and how it rotates.

**Why it matters.** The product's whole security claim is that it cannot move a buyer's money
(`15-SYSTEM.md`'s custody boundary). That claim is only as good as the list of keys being short and known.

**The minimum version.** Three keys and two credentials. No others exist:

| Secret | Power | Where | Rotation |
| --- | --- | --- | --- |
| the relayer key | holds BNB for gas only. It can submit an authorisation the buyer already signed for a fixed payee and a fixed amount, nothing more | the `facilitator` process, which binds a unix socket and no TCP port, so nothing on the network reaches it even if `web` is compromised (`15-SYSTEM.md`) | generate the new key, point the config at it, drain the old one, publish the change as a `reasonsRecord` |
| the ledger signing key | signs append-only entries, ed25519 | the **same** `facilitator` process, which is the only place any private key is loaded. `ledger.append` runs inside it on the same unix socket, so no other process can produce a signed entry (`15-SYSTEM.md`). `cli` holds no key and `walk()` verifies with the public one | publish the new public key beside the old, record a boundary entry, then `walk()` verifies both sides of the boundary. A rotation that breaks `walk()` is a failed rotation |
| four Altana session keys | one per first-party agent, bounded by their own call allowlist, spend cap and expiry, readable and revocable on chain | with the agent they belong to | revoke through `revokeSession` and register a new key, which is the same path a buyer uses, so the mechanism is exercised rather than described |
| the 8004scan `free_api` key | read-only on a cross-check source | environment file outside the tree | reissue from their console |
| the canary workflow's ambient repository token | opens an issue on our own repository when a canary step fails, which is the whole of the alerting design (section 3.1) | minted by GitHub for the length of one workflow run, never stored by us and never present on our own hosts | it expires when the run ends, so there is nothing to rotate. Scope is the one repository |

Rules that make the table true. No key or `.env` in the repository, proven before the flip with
`git check-ignore` rather than asserted. Keys loaded from files at mode 0600 outside the working tree, never
from a command line and never printed by a log line. The log formatter carries a deny list of key names so a
future `debug` call cannot leak one. **Two keys sit in the one long-running process that holds any key, so
the loss ceiling is stated for both rather than for one.** The relayer holds a bounded balance rather than a
float: at about 0.00001 BNB of gas per brokered hire (section 7.5) a 0.05 BNB balance funds roughly 5,000
hires, so a compromise costs at most that balance. The ledger signer's ceiling is different in kind and is
the reason `walk()` exists: an attacker with that key can sign a well-formed entry. `walk()`'s third
check recomputes the decision from the recorded inputs, so a forged entry fails re-derivation even when its
hash and signature are perfect (`15-SYSTEM.md`, `R16-reuse.md`). The facilitator's own per-call and per-day
caps bound the relayer further and no admin path can mutate the `ledger` at all (`15-SYSTEM.md`).

**What we never hold**, from the exclusion list in `R15-compliance.md`: no buyer or operator private key,
seed phrase, mnemonic or keystore file, encrypted or otherwise. No unbounded token approval created on our
behalf. No authorisation that outlives the job it was signed for. No payment card data. No third-party API
key belonging to a user.

**Ships.**

### 4.5 Dependency and supply-chain integrity

**What it is.** Keeping somebody else's package out of the process that holds the two keys.

**Why it matters.** The class is live and it lands in packages nobody chooses deliberately. The CVE
identifier that circulates for a well-known assistant exfiltration bug is in fact the `color-name` npm
account takeover, CVSS 4.0 base 8.8, published 2025-09-15 (`R12-agent-comms.md`). `color-name` is a
transitive dependency of half the ecosystem. An install-time script in a package like that runs with the
same rights as the build.

**The minimum version.**

- Exact pinned versions for every direct dependency, a committed lockfile and `npm ci` in CI and in the
  build so a resolution never floats between the test and the deploy. The house rule already says pinned
  rather than ranged. It binds hardest on the packages a hackathon reaches for fastest.
- No dependency enters without its licence clause quoted in `DATA-SOURCES.md`. The publish step refuses a
  release where a row has no clause and no explicit note that no terms were found, which is the same
  pattern as refusing an unstamped artifact. `10-DOCS-AND-POLICY.md` owns the table it writes into.
- The `facilitator` process carries the smallest dependency set of the four processes, because it is the only
  one that loads a private key at all and it loads two, the relayer and the ledger signer (section 4.4).
  Nothing that renders, parses somebody else's HTML or fetches an image belongs in it.
- No Aave v3 source vendored, since its Additional Use Grant forbids use that would "directly or
  indirectly, enable, facilitate, or assist in any way with the migration of users and/or funds from the
  Aave ecosystem" while reading positions through the deployed ABI needs no grant at all
  (`R15-compliance.md`).
- No GPL Solidity vendored into the source-available tree, for the same reason on the other side: a
  copyleft obligation on the combined work collides with the entry's own licence (`R15-compliance.md`).

**Ships.**

### 4.6 Data retention, the mechanism

**What it is.** The job that actually deletes. `09-DISPUTES.md` owns the schedule and its legal clocks and
`10-DOCS-AND-POLICY.md` publishes the notice. This section owns the mechanism plus the operational classes
the schedule does not name.

**Why it matters.** The guidance written for exactly this architecture asks for a technical solution that
guarantees the period rather than a policy that describes one. Where no such solution exists it says no
personal data should be on the chain at all (`R15-compliance.md`). A retention table with no job behind it is
the failure that guidance is aimed at.

**The minimum version.** One table of `(class, ttl, action, selector)`, one scheduled job that walks it. The
`action` column is the part that was missing and it is load bearing, because **a row kept with its bytes
removed is a different guarantee from a row that is gone** and the classes below need both. `blank` clears
the named field, stamps `redactedAt` and keeps the row. `delete` removes the row. `15-SYSTEM.md`'s
`evidenceObject` reaper is the `blank` case of this same job rather than a second mechanism: it clears the
bytes, sets `deletedAt` and keeps the row, with its test asserting exactly that. Two tests, not one: one class
of each kind, each written with a backdated timestamp, then the job run, then the assertion that a `blank`
row survives with its field empty and a `delete` row is gone.

The operational classes, additional to the schedule in `09-DISPUTES.md`:

| Class | Retention | Action | Why this number and this action |
| --- | --- | --- | --- |
| search query strings plus parsed clauses | 30 days, never stored beside a wallet address or an IP | `delete` | the query is the whole record, so there is nothing left worth keeping. It is the relevance input, while the joined form is the identification link the EDPB test turns on (`R15-compliance.md`) |
| `probeResult.rawHead` | 30 days | `blank` | a response fragment from an operator-controlled server, unbounded in content. The verdict, the class and the latency are kept forever, which is why the row survives: the probe history per agent is the data product nobody else has and it holds no personal data (`15-SYSTEM.md` section 2.7) |
| `evidenceObject` bytes | at dispute-window close plus a grace period, per `deleteAfter` | `blank` | the bytes are user content and can carry a third party's data. The hash, the id and the slot stay, so a receipt still verifies (`09-DISPUTES.md`, `15-SYSTEM.md`) |
| canary run history, per-run rows | 14 days rolling | `delete` | a per-run row has no summary value once the roll-up exists |
| canary per-day roll-up | kept for the judging window and after | `blank` never applies | the window is the thing a judge may look back over. The roll-up is what they read |
| rate-limit counters | 1 hour | `delete` | they are a control, not a record |
| incident and postmortem records | 2 years | `delete` | matched to the notice and statement-of-reasons retention so the two do not disagree |
| nightly backups | 7 days, then the deletion job re-runs after any restore | `delete` | a restore must not resurrect data past its window (section 3.5) |

**Ships.**

## 5. The two sides of the market

### 5.1 Notifications

**What it is.** How a buyer learns their job finished and how an operator learns their listing left the
shelf.

**Why it matters.** Two of the four categories produce work that outlives any connection. A grid runs for
days and a health-factor monitor never finishes, while a rebalance is scheduled and a yield read is bounded,
so the notification problem is real for the whole shelf set rather than for one corner of it. And the
constraint is self-imposed: wallet signature is the only account mechanism, we collect no email and store no
IP joined to an address, because storing an email beside a wallet address is precisely what makes that
address personal data for us, with our own database named as the means reasonably likely to be used
(`R15-compliance.md`). So there is no channel to push to and the design has to work without one.

**The minimum version, which is pull rather than push.**

1. **A permanent receipt URL per job**, `/receipt/<receiptId>`, bookmarkable, no auth, carrying the content
   hash, the transaction, the block and the recompute command (`08-MONEY.md`). This is the notification for
   most buyers, because the thing they want is the artifact rather than an alert.
2. **A public per-address feed**, `GET /v1/feed?address=0x…`, paged in the same shape as every other list,
   returning that address's jobs, quotes, receipts, listing state changes and any statement of reasons
   addressed to it. No credential, because every field in it is either already on chain or already public
   on the site, so returning it adds no PII. Anything can poll it: a browser tab, a script, an agent
   through the `mcp` tools.
3. **A per-job webhook, designed and published but not built**, section 5.2. Its catalogue, its signing
   scheme, its retry schedule and its delivery route are all fixed so a consumer can build against them. Outbound
   delivery is not in this entry.
4. **The operator's own declared channel.** An agent card declares a contact channel and a suspension
   already turns on it: the contact channel going silent on three consecutive probes is itself a suspension
   gate (`05-ONBOARDING.md`). So a suspension notice goes to the channel the operator published. The listing
   page carries the same statement of reasons for anybody who arrives without it.

**Refused: collecting an email to enable notifications.** It would create the identification link the entire
data posture is built to avoid, for a convenience the feed already covers.

**Ships thin.** The receipt URL and the public feed ship, which is the whole pull half. Push does not: the
webhook is Next (section 5.2) and so is any notification that reaches a person rather than an endpoint.
`02-THESIS.md` section 12 files notifications under what is documented as next, which is right about push
and wrong about pull. `three/decisions/14-gaps-notifications-and-i18n-ship-thin.md` records why the two
documents now say the same thing.

### 5.2 Webhooks

**What it is.** The outbound delivery contract. `04-AGENT-PROTOCOL.md` owns the wire mechanics and states
them verbatim from the one webhook convention with a written signature scheme and a written retry schedule:
lowercase `webhook-` headers, `msg_id.timestamp.payload` signed over raw bytes, `v1,` HMAC-SHA256 with
`v1a,` ed25519 as the asymmetric form, a space-delimited header so a secret rotates without downtime,
constant-time verification inside a timestamp tolerance, `webhook-id` as the receiver's idempotency key,
the published retry schedule ending 51 hours after the first attempt and per-delivery observability. This
section owns what that mechanism carries and what it refuses.

**Why it matters.** A delivery that is not idempotent, not signed or not observable turns into an argument
nobody can settle. The target is also a URL a stranger gave us.

**The minimum version.**

The event catalogue, hierarchical and full-stop delimited from `[a-zA-Z0-9_]`, which is the convention's own
naming rule. Ten events, no wildcards, because a wildcard subscription means we cannot tell a receiver what
it agreed to receive:

```
job.created        job.delivered      job.settled       job.refused      job.disputed
listing.suspended  listing.restored   listing.deprecated  listing.sunset  source.stale
```

`listing.deprecated` fires when the operator sets a sunset date and `listing.sunset` fires when that date
passes and the listing closes. Both exist because the transition that actually ends a listing is the one a
subscriber most needs. An earlier version of this catalogue emitted nothing at all for it (section 6.2).

The registration surface: subscribe at hire time or from the operator view, one target per subscription, a
single-purpose secret issued per subscription and never shared across two, at most five subscriptions per
job, then the target re-resolved through the egress client on **every** attempt rather than once at
registration, because a host that resolved public an hour ago can move (section 4.3).

Delivery lifecycle, published so an operator can tell a slow retry from a dropped one: at-least-once stated
plainly, the retry schedule published rather than described, deliveries visible per attempt at
`GET /v1/webhooks/{subscriptionId}/deliveries` with `{id, event, status, responseCode, attempt, createdAt,
deliveredAt}`, an endpoint disabled after the schedule is exhausted with the reason recorded, then the queue
depth on the status page so a stalled queue is visible without asking.

**Inbound webhooks: we accept none and the reason is specific.** The one index that offers them documents
HMAC-SHA256 over a shared secret of at least 16 characters and HTTPS-only delivery, but names no signature
header anywhere, while registering one needs an API key (`R12-agent-comms.md`). Building a receiver against
an unnamed header would be guessing at somebody else's contract. The events it offers are ones we already
detect by reading the chain. So we poll and we say so.

**Next, for a scheduling reason rather than a design one.** Outbound delivery needs a subscription record
`15-SYSTEM.md`'s data model does not carry plus a retry loop that runs for 51 hours, against a build order that is
full to the freeze with eight items already on a cut list (section 1.1). So what ships is the contract: the
ten events, the header and signature scheme, the published retry schedule, the per-delivery record shape and
`GET /v1/webhooks/{subscriptionId}/deliveries` answering its published envelope over an empty collection. A
consumer can write and test a receiver against that today. What does not ship is us sending anything. HMAC
first then the ed25519 form is the order when it is built, because the receiver holding no signing secret is
the better property and it is worth doing properly rather than in the last day.

### 5.3 Buyer support

**What it is.** Where a buyer goes when something is wrong, given that there is no account, no email on
file and one operator.

**Why it matters.** The immunity a hosting provider relies on is conditional on acting once notified, while
a qualifying notice is what creates that knowledge, so the intake is a liability clock rather than a customer
service queue (`R15-compliance.md`). Separately, a marketplace with a takedown button and no misuse rule
gets used as a weapon against rival agents.

**The minimum version.** Three routes, none of which needs an account. `09-DISPUTES.md` owns the intake
schema, the states and the clocks, so this section names the surfaces and the self-service half.

1. **The in-product report**, one click from a listing and from a settled job, pre-filling the exact
   location as the agent id, the job id and the deliverable hash. That pre-fill is not a convenience, it
   satisfies the requirement that a notice indicate the exact electronic location of the material.
2. **The public notice form** with the four mandated fields and an anonymous branch for child-safety
   reports, where the contact requirement drops rather than being enforced.
3. **One published contact address with a declared language**, English, which is the whole point-of-contact
   obligation at our scale.

Published response targets come from `09-DISPUTES.md` rather than being invented here. They are targets we
can meet with one person.

**The self-service half is the real answer.** Every failure state on the site names the number that is zero,
when we last looked, the command that reproduces it and the nearest thing that is not empty
(`03-TAXONOMY.md`). A listing that is not on a shelf shows the failing assertion and the failure class. A
price that is missing says that 0 of 600 sampled agents were payable by a stranger, so this is the normal
state on BSC today. Most support questions are answered by the page that raised them, which is the only
support design that works at this staffing level.

**What we do not have, said rather than implied:** no live chat, no ticket portal, no phone number, no
response-time guarantee beyond the published targets.

**Ships.**

### 5.4 Operator tooling

**What it is.** What an operator can see and do without talking to us. `05-ONBOARDING.md` owns the lint
rules, the gates and the lifecycle. This section owns the surfaces.

**Why it matters.** Coverage is the opening in this field. Probing before listing appears in at least eight
independent rival builds, so it is table stakes, while the strongest rival by build volume shows two of four
categories empty with third-party activation coverage explicitly zero (`R14-rivals.md`). The fastest route to
four shelves filled by third parties is not more verification depth, it is making the failure legible to the
person who can fix it.

**And the field of people who could fix it is two hosts plus one certificate, not a population.** That is
worth stating precisely, because a page of failure counts reads like 269 addressable operators and it is not.
All 51 templated endpoints belong to one platform host, `platform-backend.prod.termix.live`
(`MEASUREMENT.md`). Substituting the on-chain token id resolves them, then 6 of 6 cards probed across the id
range come back `status: "UNBOUND"` with `endpoint: null` while the second declared path 404s, so **there is
no endpoint behind those ids to fix**: that block is not a two-line substitution bug, it is a platform whose
agents are registered and not bound. Of the 229 endpoint URLs in the sample, `evoevo.ai` holds 217 with an
identical body prefix, so the 218 HTML answers are one host's template rather than 218 independent choices.
The certificate bound to `*.up.railway.app` is a single agent. So the lever is one conversation with the
platform that owns 51 records, one with the host that owns 217, then one certificate. Small enough to
attempt inside a week. Nothing like a broad outreach programme.

**The minimum version, two surfaces.**

**A public self-check that needs no wallet and lists nothing.** Paste a `tokenUri`, a card URL or an
`agentId` and get back the resolver's verdict across all six URI shapes, the lint findings field by field
with the rule and the reason, the classifier's category with its `basis` and its confidence, then the same
conformance assertions the shelf uses with `pass`, `fail` or `skip` and a `failureClass` per failure. A rival
already ships a builder validation endpoint (`R14-rivals.md`), so the surface is expected. What ours can say
that theirs cannot is that these are the identical assertions that decide shelf placement, which makes the
tool a contract rather than a courtesy.

**A signature-gated operator view at `/operator`.** A `personal_sign` over a single-use nonce, no account
created and nothing stored beyond the address, which is already public. It lists the agent ids that address
owns or is approved for, each listing's `visibility` with the statement of reasons behind it, the lint
findings, the drift diff when `tokenUriHash` or the card hash moved, the probe history with per-attempt
failure classes, the analytics in section 5.5 and one Re-check button rate limited to once per 60 seconds
per listing. The third-party corroboration button sits here too, with its countdown, since
`POST /agents/verify-endpoint/{chain_id}/{token_id}` needs no auth and is capped at once per hour per agent
(`R05-8004scan-api.md`).

**Refused, which is a position rather than a shortfall:** no agent builder, no hosting, no key management
for somebody else's agent, no start, stop or restart of an agent. BNB Agent Studio already ships the wallet,
the runtime and the `bag` CLI, with its unshipped Developer Dashboard sitting exactly there
(`R14-rivals.md`). Muster is the demand side (`02-THESIS.md`).

**Ships thin.** Both surfaces ship. Bulk operations, an operator API token and a change-subscription are
next.

### 5.5 Analytics for operators

**What it is.** Numbers an operator can act on, produced without tracking a person.

**Why it matters.** An operator who cannot see why they lost a hire has no reason to fix anything. The supply
side is where this venue is thin. It is also the one analytics surface a marketplace can build without a
third-party script, since every event we would count happens on our own server.

**The minimum version.** Per listing, in the operator view and in the `api`. The Ships column is the honest
half: five of these are a query over rows we already write. Three need a counter store plus a daily
roll-up job that `15-SYSTEM.md`'s `run.kind` enum does not carry, so those three are not built.

| Metric | Definition | In this entry |
| --- | --- | --- |
| quote requests | quotes issued against the listing | Ships, a count over `quote` rows |
| hires | jobs that reached a paid state | Ships, a count over `job` rows |
| refusals by class | the agent's own structured refusals, grouped, because a correct refusal is a success and an operator needs to know which condition keeps failing | Ships, a group-by on `job.refusal` |
| probe pass rate and p50 latency | over 24 hours and over the window | Ships, a query over `probeResult` |
| **why it lost** | for a quote that did not become a hire, the binding constraint: the eligibility filter that excluded it or the ranking term that put another row first (`07-MATCHING.md` owns the function, this names its output) | Ships. It is an output of the ranking function rather than a counter, so it costs a field rather than a job |
| shelf impressions | shelf renders that included this row, counted server side | Next. A render is not a row, so this needs a write on the read path plus a roll-up |
| compare adds | times the row entered a comparison | Next, same reason |
| rank held | the row's position in its shelf's default sort, daily median | Next. A daily median needs a daily job |

Nothing in that table needs a wallet address, an IP or a cookie, so nothing in it creates a record we would
then have to retain, notify about or hand over. **Refused: any third-party analytics script anywhere.** A
wallet address in a third-party analytics payload is an international transfer of personal data with no
assessment behind it (`R15-compliance.md`). No page here needs a script to count a render it already served.

**Ships thin.** The five counters above plus the loss reason. The three that need a counter store and a
roll-up job are next. So is a time series longer than the build has existed, which cannot be produced
honestly and which `06-QUALITY.md` already says. Trends are next by arithmetic rather than by choice.

### 5.6 A sandbox and the dry run that replaces it

**What it is.** How somebody walks the hire path without spending mainnet money.

**Why it matters.** A judge who will not connect a wallet still has to score "activate it, with minimal
friction". A full testnet mirror looks like the answer and is not, for four measured reasons.

- **No chain-97 token implements EIP-3009** (`R04-bsc-tokens.md`), so the one-signature path that is the
  whole point of our hire flow cannot be demonstrated on testnet at all. Permit2 and the x402 proxy are both
  live on 97, so a testnet demo would show a different rail from the mainnet product.
- **The testnet token addresses and decimals for `$U` and USDC are contradictory across sources and
  unverified**, with one file naming `$U` on 97 at 18 decimals and another quoting a mock at 6
  (`SPINE.md`, Unverified). Writing testnet pricing code before one `decimals()` call per token settles that
  is how a factor-of-a-trillion bug gets shipped.
- **The dispute window differs by a factor of 672**, 604,800 s on mainnet against 900 s on the
  testnet policy `0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA` (`R02-erc8183.md`, both re-read from
  `disputeWindow()` on 2026-09-05: the mainnet OptimisticPolicy `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5`
  returns 604800 and the testnet policy returns 900), so a testnet walkthrough teaches the wrong clock.
- **Eligibility requires the agents surfaced to be live on BSC** (`00-PROGRAM.md`), so a testnet catalogue
  would show a population the submission is not allowed to count.

**The minimum version, cheaper than a sandbox.**

**A dry run of the whole hire path, at zero cost, with no wallet.** The quote is real, the 402 challenge is
real, the typed data is rendered in full with the domain, the struct, the token address, its `decimals` read
from chain, the amount in base units and the payee taken from `getAgentWallet(agentId)`. The flow stops at
the signature with a line saying exactly what signing would authorise and what it would not. A stranger sees
the bytes, the price and the counterparty without spending or connecting anything, which is a better
demonstration of the mechanism than a testnet transaction because it shows the mainnet object.

**One labelled testnet escrow job.** The 900 s window means the loop closes inside one sitting, which mainnet
cannot do inside the build (`08-MONEY.md`). The `$U` faucet at `0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3`
pays 10 `$U` per 1,800 s, so funding it needs no purchase (`R02-erc8183.md`). Every testnet artifact is
labelled testnet on the same surface it appears, never in a footnote.

One more constraint worth recording rather than discovering: the Binance agentic wallet that the incumbent agent
market on this chain uses as its default signer supports BSC 56 and Base 8453 only, with no testnets
(`R07-termix.md`), so a testnet-first design would also break the path that tooling takes.

**Ships** as the dry run plus the one testnet job. **Refused:** a parallel testnet catalogue, mock data of
any kind and a `demo` mode that fabricates a row.

## 6. Lifecycle

### 6.1 Versioning an agent itself

**What it is.** How Muster tracks that the thing behind a listing changed. `05-ONBOARDING.md` owns the drift
probe that detects it. This section owns what a change means to everything already recorded.

**Why it matters.** `setAgentURI`, `setMetadata` and `setAgentWallet` are owner-callable at any time
(`R15-compliance.md`), so a listing that passed review can be rewritten after review and nothing is ever
removed from the chain. Without versioning, a settled-job count earned by one service is inherited by a
different service with the same id, which is the cheapest possible attack on the only signal we trust. A
declared version is not a fact either: the most conformant third-party card on BSC declares A2A `0.4.0`, a
release that has never existed. The operator then copied that string into the on-chain service entry, where a
consumer reads it as a protocol version (`R12-agent-comms.md`).

**The minimum version.** Muster versions an agent by what it can hash, never by what the operator declares.

| Identifier | What it covers |
| --- | --- |
| `tokenUriHash` | the registration document's bytes, already in the data model |
| a card hash | the resolved agent card's canonical bytes, sorted keys and compact separators, which is the same canonicalisation the receipts use |
| `contractVersion` | which category contract the listing was assessed against (`03-TAXONOMY.md`) |
| `codeVersion` | our own version at the time of the assessment, already on the receipt |

A change to either content hash opens a new **agent revision**: a record carrying the revision number, the
block it was first seen at, the diff and which fields moved. The listing suspends and routes to re-review
rather than delisting, because a rewrite is neither an outage nor fraud (`05-ONBOARDING.md`).

The rule that makes it worth doing: **evidence stays attached to the revision that earned it.** Settled jobs,
conformance verdicts and probe history all belong to a revision. The listing page shows the current revision's
counts with the earlier revisions' counts beside them rather than summed into one number. The score's window
and sample size make the difference visible (`06-QUALITY.md`). An operator who rewrites their agent starts the
evidence again, which is the correct incentive.

Display: "revision 3, first seen at block N" with a link to the diff. Any operator-declared `version` string
renders as a quoted claim, attributed to the operator, never as a protocol version.

**Ships thin.** Revisions, the diff and evidence attribution ship. A public per-revision changelog page and a
subscribe-to-changes feed are next.

### 6.2 Deprecating a listing

**What it is.** The graceful end of a listing, which is a different thing from a suspension and from a
delisting for cause. `06-QUALITY.md` owns delisting for cause and its appeal.

**Why it matters.** Without a graceful exit an operator's only options are to leave a dead listing up or to
disappear. A catalogue that cannot retire anything rots. The published position at the other end of this
market is blunt about the same problem: listings that stop working or offer a degraded experience get removed
(`R13-prior-art.md`).

**The minimum version.** Deprecation is operator-initiated. It adds no `visibility` value and no lifecycle
state. What it adds is one field, `listing.sunsetAt`, plus a reason class on the delisting that closes it:

1. The operator marks the listing deprecated and names a sunset date, which writes `sunsetAt`. Minimum notice
   is 7 days where the listing has any settled job in the last 30 days, immediate where it has none, because
   notice exists to protect buyers who are relying on it rather than as ceremony. `listing.deprecated` fires.
2. **Pre-sunset the listing sits at `visibility: indexed`.** It leaves the shelf immediately and stays
   searchable under `is:indexed` with a banner naming the sunset date, so a buyer mid-evaluation is not left
   wondering.
3. No new quote is issued after the sunset date. In-flight jobs are untouched and their own clock governs:
   604,800 s on the mainnet escrow window, 900 s on testnet (`R02-erc8183.md`).
4. **After sunset the listing sits at `visibility: delisted` with reason class `operatorSunset`.** That is
   the terminal state and `03-TAXONOMY.md` section 6.1 already fixes what it means: off every shelf, out of
   default search, out of the API except as a 410, `noindex,nofollow`, with the URL answering **410** carrying the
   reason, the date and the receipts, never 404 and never a redirect to the shelf. So it stops being
   searchable at sunset, which is the difference from step 2 and is deliberate: a row nobody can hire should
   not sit in a result set. `listing.sunset` fires, which is the event section 5.2's catalogue was missing.
5. **A sunset and a delisting for cause answer the same 410 and are told apart by the reason class**, not by
   the status code. `operatorSunset` renders as the operator retired it. A `policyBreach` or
   `appealRefused` class renders the rule and the appeal outcome. That is why the reason class is in the 410
   body rather than only in an internal record: two very different endings on one status code need the body to
   distinguish them. A buyer reading the page is owed which one it was.
6. Receipts never disappear. A settled job's receipt outlives the listing, the agent and the operator,
   because it is the venue's only permanent product.

The same path applies to the four first-party reference listings. If we stop operating one, it is deprecated
in public with a notice, since the venue's own supply is not exempt from the venue's own rules and the
first-party share is already tracked separately in every number we publish (`02-THESIS.md`).

**Ships thin.** The state, the banner, the 410 and the receipt permanence ship. An operator-facing scheduler
that runs the sunset without us is next.

### 6.3 Admin tooling and the audit log

**What it is.** How we act on the venue and the record every action leaves.

**Why it matters.** Suspending a listing, overriding a category, pinning an exploration slot or blocking a
payment each change what a buyer sees and what an operator earns. Every one of those is a restriction that owes
a written reason to the affected party, with the duty covering demotion and payment suspension rather than
only removal (`R15-compliance.md`). An action taken by a script at three in the morning cannot produce a
hand-written reason, so the reason has to be generated from the action.

**The minimum version, where the shape is the decision: there is no admin web surface at all.**

Admin actions are `cli` commands on the operator's own machine, five verbs (approve, suspend, delist, restore,
constant change), each taking a mandatory `--reason` and a `--policy` drawn from the published category list,
each authenticated by a wallet signature from a short configured allowlist. `15-SYSTEM.md` carries the same
five verbs in its `cli` process and states plainly that no admin HTTP route exists, so the two documents agree
on the shape. Each writes a statement of reasons with the fields the law asks for: the action, whether it also
restricts payments, the territorial scope, the duration, the facts relied on, the policy or contractual basis,
whether automated means contributed, the redress route with its window and `onChainEffect`, which reads `none`
on anything registry-related because a takedown is a delisting from our index and the registry entry plus its
feedback stay on BSC forever (`R15-compliance.md`, `09-DISPUTES.md`).

**One name for that artifact, because two were in use.** The stored record is `reasonsRecord`, keyed on
`reasonId`, which is `15-SYSTEM.md`'s data model name and therefore the one that wins. "Statement of reasons"
stays as the prose name for what it holds, since that is the statutory phrase. The public form is
`GET /v1/decisions/{reasonId}` and its list view, which is the changelog 15 refers to rather than a second
store. There is no separate `decisions` collection and this document no longer claims one. 14 asks 15 for the
one rename that follows: the route parameter is `reasonId`, not `decisionId`, so an id in a URL is the id in
the record.

**How the entry reaches the ledger, given that `cli` holds no key.** The signing key lives in the
`facilitator` process and `ledger.append` runs inside it on a unix socket, which is what makes a signed entry
unforgeable from anywhere else (section 4.4, `15-SYSTEM.md`). So the admin verb writes through that socket
rather than signing anything itself. The audit log is the ledger plus the public reasons route. `walk()`
recomputes hashes, links, signatures and the decision itself from the recorded inputs, so an action edited by
hand fails re-derivation even when the chain verifies (`08-MONEY.md`, `R16-reuse.md` section 5.1).

Why a CLI rather than a console: an admin console is a new authenticated surface with a session to steal, on
a product whose entire authentication story is that there are no accounts. A CLI on one machine has no
network surface to attack. The cost is honest and worth stating: an admin action requires the operator at a
terminal, so the response targets in `09-DISPUTES.md` are set to what that allows.

**Ships.**

## 7. Promises, money and the entity

### 7.1 SLA and uptime credits

**What it is.** A promise about availability with a remedy when it breaks.

**Why it matters.** An SLA is the most tempting thing on this list and the easiest to get wrong. A published
availability number with no remedy behind it is a misrepresentation. A credit needs a billing relationship:
there are no accounts, no subscriptions and the only money that moves is a per-job fee taken at settlement in
a second transaction (`08-MONEY.md`). There is nothing to credit against.

**Refused.** The replacement is stronger than the thing refused.

**What ships instead is a freshness contract, which is a number a buyer can hold us to.** A `live` listing is
probed every 5 minutes. A row whose newest passing probe is older than 15 minutes goes `stale`, which closes
its hire path, withdraws it from the shelf and costs the operator no standing, then restores itself on the
next passing probe (`05-ONBOARDING.md`). That is an availability guarantee expressed as behaviour rather than
as a percentage, it is verifiable from the outside and it fails safe toward not selling rather than toward
selling something dead.

Alongside it, availability is measured in public rather than promised: the canary history on the status page
covers the whole judging window, run from outside our infrastructure, with a pass or fail per step. A reader
can compute whatever availability number they want from data we did not curate.

For the agent's own reliability, the remedy for a failed paid call is the dispute path and the refund position
in `09-DISPUTES.md` and `08-MONEY.md`, not a credit from us, because we did not take the principal.

**Next, in this order and only after a billing relationship exists:** an SLA per evidence tier, with the
credit funded by the operator's bond rather than by the venue, which is the only version that does not turn the
venue into an insurer of other people's software.

### 7.2 Insurance and bonding

**What it is.** Money at risk that makes a promise credible. `E1 Bonded` is on the evidence ladder,
`05-ONBOARDING.md` owns the ladder and the contract and `02-THESIS.md` section 12 records what ships. This
section owns the sizing rule and the reason insurance is refused.

**Why it matters.** Every tier above E0 currently rests on evidence rather than on stake. E1 is the only rung
that a new operator with no jobs and no attestation can reach, which is why it exists and why it needs no
document and no exchange account. Without a stake behind it, E1 is a label.

**What ships, taken from `05-ONBOARDING.md` rather than decided here.** `OperatorBond` plus its published
terms, deployed on **BSC testnet 97**, with the mainnet deployment documented as next. No owner, no upgrade
path and no function that can move a stake to a Muster address. Release is permissionless once
`releasableAt` passes with no open dispute flag, so getting a stake back never depends on us answering. The
amount is a flat **5 `$U`** at 18 decimals and the lock runs **604,800 seconds** past the last job the stake
might answer for, which is the official ERC-8183 kernel's own `disputeWindow()`. Those two numbers are 05's
and this document adopts them: a flat amount is right on day one for the same reason 05's caps are flat,
which is that no category has a counted median price yet. The visible consequence, which the ladder states on
screen, is that **the E1 rung is empty on mainnet at ship** and no shelf row depends on it.

**The sizing rule this section owns, which is what the amount becomes.** Once a shelf has a counted median,
the stake is sized off that category's own median listing price rather than a flat number, because a flat
bond is either trivial for a serious operator or prohibitive for a small one. The reference points are
measured and far apart: completed jobs on the official escrow average about 0.0103 `$U` each while the
incumbent agent market's median listing price is 70 USDC (`R16-reuse.md`, `R07-termix.md`). A median-sized
bond only exists after the median does, so the flat 5 `$U` is not a compromise, it is the only number the
data supports today. Slashing is unchanged either way: slashed only on an upheld dispute, capped at the
recorded price of the job it answers for, paid only to the buyer named on that job, with every slash carrying
a statement of reasons and an appeal window like any other adverse action (section 6.3).

**The constraint that makes this a real design problem rather than a switch:** holding somebody's money in
order to pay it to somebody else is the exact fact pattern that moves a venue from forum toward payment
intermediary (`R15-compliance.md`). So the bond cannot sit in an account we control. It sits in a contract
with mechanical release and no key of ours that can redirect it. The same reasoning is already recorded for
payments in `three/decisions/08-money-no-own-escrow.md`.

**Step zero on the chain-97 deployment, because section 5.6 flags exactly this risk and the bond inherits
it.** The amount is denominated in `$U` at 18 decimals. The testnet `$U` address and decimals are
contradictory across our own research: one pair of files names `$U` on chain 97 at 18 decimals while another
quotes a mock at 6 (`SPINE.md`, Unverified). Section 5.6 calls writing testnet pricing code before one
`decimals()` call "how a factor-of-a-trillion bug gets shipped". A bond amount is testnet pricing code.
So one live `decimals()` call against the chain-97 `$U` the contract is actually pointed at, recorded with its
address, is the first step of the deployment and not a check afterwards. `05-ONBOARDING.md` already asserts
`decimals()` at boot for the settlement token, so this is the same gate applied one chain over.

**Ships thin.** The chain-97 contract and the published terms are in the submission. The mainnet stake is
next and the ladder says so on screen rather than implying a stake exists.

**Insurance is refused outright.** There is no underwriter for an autonomous agent's output. A pooled fund the
venue tops up is an unlicensed insurance product plus a custody surface, which is two regulated activities
bolted onto a product that currently has none. A bond is an operator's own money at risk. A pool is ours.

### 7.3 Tax and invoicing

**What it is.** The documents a buyer or an operator needs for their own accounts. `08-MONEY.md` owns the
export and states that an invoice, a tax document and any statement of profit or loss are not produced, then
assigns this section the reason and the path.

**Why it matters.** An operator earning through the venue and a buyer expensing a hire both need something
their accountant accepts. A fee-taking venue has its own indirect-tax position in every jurisdiction it serves.
Both are blocked on the same thing, which is a legal entity, so they are blocked on section 7.6 rather than on
engineering.

**The minimum version, of which nothing this section owns is in the submission.** What covers the need is a receipt plus an
export that reconcile to the chain. Both are `08-MONEY.md`'s deliverables rather than anything built here,
which is why the register reads Next rather than Ships thin. Named so the boundary is clear:
`/receipt/<receiptId>` names both parties by address, the amount in base units with the token address and its
`decimals`, the block, the transaction and the recompute command. `GET /v1/export.csv?payer=…` gives one row
per payment leg so principal and fee are separate rows, with `amountBase` as a base-unit string and
`amountDecimal` as a decimal string rather than a float, because a float loses a wei at 18 decimals and an
export that cannot be reconciled is worse than none (`08-MONEY.md`).

Two columns ship deliberately empty, `usdRate` and `usdRateSource`, with the reason published. `$U`'s issuer,
peg and redemption are unverified, it appears on no issuer list we read, then the market-data licence terms for
redisplaying a price are unverified too (`SPINE.md`, Unverified). A buyer who needs fiat brings their own rate
and the columns are there to hold it.

**Next:** a per-job invoice with a sequential number, an operator statement per period, a stated VAT or sales-tax
position per jurisdiction and any withholding. Each needs an entity, a registration and a number series that
belongs to somebody.

**Refused:** computing anybody's tax, printing a fiat value for a token whose peg we have not read and issuing
a document that looks like a tax invoice with no entity behind it. The docs say what the receipt is and what it
is not, in the same words in both places.

### 7.4 Referral and growth

**What it is.** How the venue gets used, given that the usual instruments are closed to it.

**Why it matters.** The obvious growth levers are all refused for reasons already settled elsewhere, so the
honest question is what is left rather than which incentive to design. Two rules bind. A promotion offering a
retail client "any monetary or non-monetary incentive" is barred by the regulator's own handbook with referral
bonuses named in the guidance, so there is no bonus on a hire (`R15-compliance.md`, published by
`10-DOCS-AND-POLICY.md`). And there is no token, no points and no airdrop, because the only signal we trust is
a job somebody paid for. Paying people to generate that signal destroys it (`02-THESIS.md`).

**What ships, all of it non-incentive.**

- **The machine face as the distribution channel.** An agent that can search, compare and hire through the
  `mcp` tools and the `api` is a channel that needs no referral fee. The sponsor's own CLI already normalises
  a machine face over the same data, so ours reads as native rather than novel (`R14-rivals.md`,
  `15-SYSTEM.md`).
- **Share cards carrying measured facts** rather than claims, one per listing and one per shelf, text only
  (section 2.2).
- **The public self-check**, which is a growth surface aimed at supply: an operator who can see exactly why
  they fail can fix it and list without asking us (section 5.4).
- **Settled turnover on the landing page**, `origin: order` only, with its window and its per-provider split
  (`03-TAXONOMY.md`). Every rival leads with the agent count, which is the number BNB Chain's own brief calls
  the problem, while the mature agent marketplace elsewhere leads with money settled (`R14-rivals.md`).
- **No attribution parameter that identifies a person.** A share link carries the listing, not the sharer.

**Refused:** referral rewards, points, a token, paid placement of any kind. Undisclosed paid ranking is unfair
in all circumstances under the consumer rules, while a disclosed paid slot still poisons the one signal the
product has (`R15-compliance.md`).

### 7.5 Unit economics

**What it is.** What a hire earns, what it costs and where that leaves us. `08-MONEY.md` owns the fee. This
section owns the arithmetic and what it does not cover.

**Why it matters.** Adoption is described as BNB Chain backing the winner "as a standalone product with its own
brand and team" (`00-PROGRAM.md`), which implies a business. No rival among the fifteen builds read closely has
a take rate, a fee split or any revenue design at all (`R14-rivals.md`). That is a sample rather than a census:
206 public repositories is a floor on public builds and says nothing about private ones, so the claim is about
what was read and not about the field. A coded take rate with published arithmetic is cheap differentiation.
Publishing arithmetic that flatters itself is not.

**Revenue per brokered hire.** 200 basis points of the listing price with a floor of 0.01 `$U`, base units
`10000000000000000`, paid by the buyer additively as a disclosed line item, taken at settlement in a second
transaction. 200 bps is the incumbent's own protocol fee on the same chain, read on chain rather than off a
page (`08-MONEY.md`, `R07-termix.md`).

**Cost per brokered hire.** Two EIP-3009 settlements, the principal and the fee, which is about 200,000 gas.
One measured settle is 103,377 gas for `$U`, 103,395 for FDUSD and 108,164 for USD1 (`R04-bsc-tokens.md`). At
the gas price measured on the day, 50,000,000 wei or 0.05 gwei, 200,000 gas is **0.00001 BNB**.

**The break-even, stated without asserting a peg.** The fee is denominated in `$U` and the cost in BNB, while
we do not read a price into the product, so the honest form is a ratio rather than a margin. The floor covers
the gas while one BNB costs less than **1,000 `$U`**:

```
fee floor      = 0.01 $U
gas per hire   = 0.00001 BNB          (200,000 gas at 0.05 gwei, measured)
break-even     = 0.01 / 0.00001       = 1,000 $U per BNB
```

**Where the ratio stops, which is here.** The floor covers gas while one BNB costs less than 1,000 `$U`.
Both sides of that inequality are measured, so it is a fact. Clearing it with a USDT price is not the same
kind of statement: BNB was 720.62 USDT on 2026-09-05 on the exchange's public ticker (`R07-termix.md`, used by
`08-MONEY.md` to pick the constant). Reading that as headroom assumes `$U` trades at parity with USDT.
**`$U`'s issuer, peg and redemption are unverified** (`SPINE.md`, Unverified), so that assumption is a step
this document does not take. What would settle it is a primary source from the `$U` issuer stating the peg and
the redemption path. Until that exists the 720.62 figure is a datapoint about BNB rather than a margin.
The constant is a published base-unit number rather than a per-request computation, so a buyer can predict it.
No fiat figure is printed anywhere in the product, for the same reason plus the market-data redisplay licence,
which is also unverified (`SPINE.md`).

**The other costs, each measured rather than estimated.** A daily full sweep is 670 `eth_call`s and 0.27 GB at
183 agents per second, plus a per-minute tail on the `_lastId` delta (`R01-erc8004.md`). Probing runs at one
request per 1.5 seconds per host across 9 hosts in the measured sample (`MEASUREMENT.md`,
`05-ONBOARDING.md`). The house probe budget is real money on any paid probe and is capped three ways (section
4.1). Hosting is `15-SYSTEM.md`'s number.

**The part that would be dishonest to omit.** At today's on-chain volumes this fee cannot fund an operated
product. The official escrow has settled 292.24 `$U` across 28,244 completed jobs, about 0.0103 `$U` each. One
address holds 99.0% of the jobs and 96.3% of the paid value (`R16-reuse.md`). At the modal budget of 0.0001
`$U`, which is measured as the most common budget across the 262 funded-or-later jobs in the recent sample at
95 of them (`R02-erc8183.md`, used by `08-MONEY.md`), a 200 bps fee is 2e-6 `$U` while the sponsored gas costs
orders of magnitude more, which is exactly why the floor exists. So the fee is a real, coded, published take
rate rather than a revenue plan.
The number that would change the conclusion is the median price rather than the rate: the incumbent agent
market on the same chain runs a median listing at 70 USDC with 499 of 509 listings instantly buyable
(`R07-termix.md`). Moving this market's median toward that is a supply-quality problem.

**Refused:** a subscription, a listing fee, a success fee on the buyer's outcome and any paid ranking slot.

**Ships.** The rate, the floor, the arithmetic above and the ledger that separates `house` from `order` so
revenue can only be counted from real customers.

### 7.6 Legal entity and jurisdiction

**What it is.** Who the counterparty is, which texts the design was built against and where a notice goes.

**Why it matters.** A marketplace that presents itself as a company it does not have is misrepresenting the
one thing a buyer needs in order to have a remedy. And several duties in the policy set attach to an entity
rather than to a product, so the honest statement is what makes the rest of the policy set coherent.

**The minimum version, which is a statement rather than a build.**

There is no legal entity behind this submission. It is an individual entrant's build and the terms say so
instead of implying a company. Three consequences follow and each is published rather than glossed:

- **No tax registration**, so no invoices and no VAT position (section 7.3).
- **Trader verification is out of scope.** The rules would require a marketplace to obtain a trader's name,
  address, telephone, email, an identification document or electronic identification, payment account details,
  a trade register number and a self-certification of compliance before that trader may offer anything
  (`R15-compliance.md`). What ships is the schema, the self-certification collected at listing and a verified
  contact plus a payee address, with the identity-document fields defined and empty because the venue is not
  operating commercially. Claiming trader verification that did not happen would be the worse answer.
- **The seller-complaint statistics duty exempts a small enterprise**, so publishing the four numbers is
  voluntary. We publish them anyway, because it is the cheapest credible marketplace-quality artifact on the
  list, while the incumbent in the sponsor's own track publishes no terms at all (`R15-compliance.md`).

**Jurisdiction, handled by design rather than by geography.** The programme is global and the submission must be
publicly accessible during judging, so a geo-block would break the eligibility rule. The design is built to the
strictest specification that is actually written down, which is the EU and UK material. It names which texts it
was built against and says plainly that this is a design input rather than a legal opinion
(`R15-compliance.md`, `10-DOCS-AND-POLICY.md`). The perimeter that does the real work is wallet screening
rather than a country list: the oracle read plus our own SDN ingest with the chain tag ignored, because 20 of
the 42 BSC-active addresses on today's list are invisible to the oracle alone (`R15-compliance.md`,
`09-DISPUTES.md` owns the screening design).

One published contact point with a declared language, English, satisfies the point-of-contact obligation at this
scale and the same address is the law-enforcement intake.

**Ships** the statement, the contact point and the empty-by-design schema. **Next:** an entity, a named
responsible person, terms with a governing-law clause and the trader fields populated. Those are conditions of
operating rather than of entering.

## 8. Surfaces for other people's software

### 8.1 The third-party API contract

**What it is.** The promises around the read API. `15-SYSTEM.md` owns the endpoint list, the paging envelope
`{ items, page, pageSize, total, totalPages }` and the OpenAPI document. This section owns versioning,
deprecation and what a stranger may do with what they read.

**Why it matters.** The API is a growth channel and a compliance surface at the same time. It is how an agent
hires through us and it is where a data-licence mistake would be replicated at scale.

**The minimum version.**

- `/v1` in the path. Inside a major, changes are additive only: a new field may appear, an existing field never
  changes type or meaning and an enum only grows. Clients are told to ignore unknown fields.
- A deprecation window with a mechanism: a field or endpoint is marked deprecated in the OpenAPI document,
  announced on the status page with a date and kept for at least 90 days after that announcement.
- No auth on reads, per-IP limits from section 3.3 and the `429` shape from `04-AGENT-PROTOCOL.md`.
- Every response carries the `freshness` triple per field group, so a consumer can decide staleness for itself
  rather than trusting a summary.
- CORS `*` on GET, credentials never accepted, which is safe precisely because no read needs a credential.
- `info.license` populated in the OpenAPI document (`15-SYSTEM.md`) and the terms name what may be
  redistributed.

**The data rule, which is the load-bearing part.** The `api` serves two things. Facts derived from the chain,
which need no grant because they are public contract state. Then our own measurements, which are ours to
license. It does not serve a bulk mirror of somebody else's index. That is not caution for its own sake: the
index we cross-check against publishes no terms of service and no data licence, its OpenAPI `info` object
carries no `termsOfService`, `license` or `contact`, while its legal paths 404 or redirect to a stub, so a
grant to republish its output is unestablished rather than permissive (`R15-compliance.md`). Foreign fields
appear on our pages attributed by name with their own timestamps, never as our numbers and never in bulk.
Anything the product asserts publicly is re-derived from the registry.

**Ships.**

### 8.2 Embeddability

**What it is.** Putting a piece of Muster on somebody else's page, which in practice means an operator showing
their own evidence on their own site.

**Why it matters.** An operator with real evidence is our best distribution. The badge is the one artifact they
will actually place. It has to be honest off-site, which is harder than on-site because the freshness strip is
not there to carry the caveat.

**The minimum version.** A static SVG at a permanent URL, `/badge/<listingId>.svg`, generated server-side from
our own data, served as `image/svg+xml` with no script inside it, carrying three facts and a stamp: the
evidence tier, settled jobs in the stated window, the age of the last answered probe, then the block number in
the `<title>` and the `alt` text so the caveat travels with the image. Cache headers match the freshness
contract, so a badge cannot claim a fresher state than the site would. It links back to the listing page.

**Refused: an iframe widget and a script embed.** An iframe on a page we do not control is a surface we cannot
patch quickly. It invites the framing and clickjacking questions for no product gain. A script embed ships our
code into somebody else's origin. Neither is needed for the one use case that exists.

One measured reason the badge is server-generated rather than fetched by the operator's page: cards and
manifests in this ecosystem cannot be fetched from a browser reliably. One live agent card sends no
`Access-Control-Allow-Origin` header at all while another sends `*`. No specification in the space mentions
CORS even once, across A2A, MCP and x402 (`R12-agent-comms.md`). So we fetch server-side, normalise and
re-serve from our origin, which is the same rule that makes our own read API safe to open.

**Ships thin.** The badge and open CORS on reads. An iframe widget is next only if somebody asks for it.

### 8.3 i18n, currency and time

**What it is.** How numbers, money and times are rendered and in what language. `03-TAXONOMY.md` owns
per-field rendering on the listing and comparison surfaces.

**Why it matters.** This is a money product read by strangers in every timezone. A rendering mistake here is a
wrong statement rather than a cosmetic one. The trap is measured and specific: every BSC stablecoin in play is
18 decimals, so a constant carried from a 6-decimal chain is wrong by a factor of a trillion
(`VERIFIED-payment-rail.md`). Three lending protocols publish rates in three different units, Venus per block,
Lista's Moolah per second and Aave per year in ray (`R09-bsc-defi.md`).

**The minimum version.**

| Class | Rule |
| --- | --- |
| Amounts | rendered from the base-unit string with the token symbol, the token address and the `decimals` read at boot and asserted against the configured value. Never a float, never a bare currency symbol |
| Fiat | not rendered anywhere. No conversion, no `$` prefix on a token amount and the export's rate columns ship empty with the reason (section 7.3) |
| Rates | the raw integer, its unit and the source call stored together, then rendered with the unit named. A percentage with no unit and no window is not published |
| Times | ISO-8601 UTC with the trailing `Z`, plus a relative age, plus the block number. No local timezone guessing, because a reader in another timezone cannot compare a local time to a block |
| Durations | seconds as the stored unit, with the human form beside it, so 604,800 s and 7 days appear together for the escrow window |
| Language | English only, stated on the site. No machine translation of operator copy, because a mistranslated refusal condition is a wrong statement about somebody's money |

**Ships thin.** The discipline ships, enforced in the render layer rather than trusted to authors. Additional
locales are next. The honest note is that translating the nine policy documents is a legal exercise rather than
a string exercise, so the currency and unit discipline is what lands now (`10-DOCS-AND-POLICY.md`).

## 9. Entry to an operated product

**What it is.** The path from a submission to something BNB Chain could back "as a standalone product with its
own brand and team", which is how adoption is described (`00-PROGRAM.md`).

**Why it matters.** Adoption is the prize, so the entry should make the first steps cheap rather than leave
them undiscovered. It also has one genuinely unresolved item, which is the licence. Pretending otherwise would
be the wrong kind of confidence.

**Eight steps in dependency order, each with its blocker named.**

| # | Step | Blocked on | What it unblocks |
| --- | --- | --- | --- |
| 1 | A legal entity, a named responsible person and terms with a governing-law clause | nothing but a decision and a filing | everything below |
| 2 | Settle the licence for adoption | **the programme's own IP terms are unverified**, because the rules host is behind a WAF that returned HTTP 405 with a human-verification page on every path tried (`R15-compliance.md`) | the right to run, host and modify, which the entry's own outbound licence withholds by default |
| 3 | Tax registration, invoices and a number series | step 1 | section 7.3 |
| 4 | A billing relationship, meaning accounts or a standing arrangement rather than a per-job fee | steps 1 and 3 | an SLA with a remedy, section 7.1 |
| 5 | The E1 bond live, with a slash exercised | money at risk plus a dispute path with teeth (`02-THESIS.md`) | credits funded by the operator rather than the venue and the first tier that means stake rather than evidence |
| 6 | Trader verification populated | step 1, plus a document handling posture we do not want before it is owed | the consumer-facing half of the marketplace duties |
| 7 | B402 as the facilitator behind the existing interface | its authenticated base URL, its signer and spender addresses and its BSC settlement token are all **unverified and unpublished**, with credentials needing manual review per environment (`SPINE.md`, Unverified) | gas sponsorship we do not run ourselves |
| 8 | A durable evidence store beyond our own disk | Greenfield billing behaviour is **unverified**, including whether a dry payment account deletes data (`SPINE.md`, Unverified) | evidence that outlives our hosting |

Step 2 is the one to be careful about. The position is already set: the entry ships source-available
no-derivatives with an `ADOPTION.md` stating that terms for the named programme are separate and available on
request, which keeps a rival from forking the entry during judging while keeping the prize reachable
(`10-DOCS-AND-POLICY.md`, `R15-compliance.md`). Licensing the entry permissively to look cooperative would hand
the fork to every rival at the same time.

**What the entry already carries so that step 1 is cheap:** the policy set, the `reasonsRecord` trail with a reason per
material choice, the export formats, the retention schedule with a job behind it, the screening records with
their list version and fetch date, then the licence posture in the bytes.

**What must not change on the way through those eight steps**, because each of them is a place where an
operated product would be tempted to trade the thing that makes this defensible: no custody of buyer funds, no
personalised advice, no number we did not measure and first-party supply labelled and counted separately
wherever it appears.

**Next.** None of this is in the submission and none of it is presented as though it were.

## 10. The order these get hit

Ranked by who runs into it first, which is a different order from the register and a different order again from
importance. The trigger column is the point of the table: it is what makes each row schedulable.

### The first five minutes, a judge with no context

| Rank | Area | The trigger |
| --- | --- | --- |
| 1 | The URL, DNS, TLS (2.1) | they click the link. Nothing else is reachable if this fails. Two rival deployments already 404 (`R14-rivals.md`) |
| 2 | SEO and shareable links (2.2) | the second judge arrives by a forwarded URL and sees a title, a description and a page that renders without script |
| 3 | Injection defence (2.5) | the first listing page renders agent-supplied text and a probe response verbatim |
| 4 | Search relevance (2.3) | they type a phrase rather than clicking a shelf. A synonym that resolves to 129,023 rows is the failure here |
| 5 | Capacity and rate limiting (3.3) | three judges, a rival scan, a crawler and our own canary can arrive in one minute |
| 6 | Observability and the status page (3.1) | Data Quality is scored and this is the page where the claim is checked |
| 7 | Accessibility (2.4) | a judge on a phone or on a keyboard or with script blocked |
| 8 | The dry run (5.6) | the judge who will not connect a wallet still has to score "activate it" |

### The first real buyer, day one

| Rank | Area | The trigger |
| --- | --- | --- |
| 9 | Notifications (5.1) | they hire something that runs for days, which is two of the four categories, then close the tab |
| 10 | Webhooks (5.2) | the same buyer wants it pushed instead of polled |
| 11 | Incident comms (3.2) | the number they are about to act on is stale and nothing on the page says so |
| 12 | Buyer support (5.3) | the first failure that is not self-explanatory |
| 13 | i18n, currency and time (8.3) | they read an amount, a rate and a timestamp in the first minute of the listing page |
| 14 | Tax and invoicing (7.3) | the first buyer who expenses a hire, which is the first hire |

### The first real operator, week one

| Rank | Area | The trigger |
| --- | --- | --- |
| 15 | Operator tooling (5.4) | they registered, they are not on a shelf, they want to know why |
| 16 | Analytics for operators (5.5) | they are on a shelf and losing hires |
| 17 | Agent versioning (6.1) | they fix their endpoint, which rewrites the document we reviewed |
| 18 | Embeddability (8.2) | they want their evidence on their own site |
| 19 | Deprecating a listing (6.2) | they retire the first one |
| 20 | The third-party API contract (8.1) | somebody builds on us and asks what will change |

### The first adversary, which arrives with the first prize money

| Rank | Area | The trigger |
| --- | --- | --- |
| 21 | Fraud and abuse of the free surfaces (4.1) | the first attempt to point our prober at somebody or to flood a shelf |
| 22 | Sybil resistance (4.2) | the first attempt to buy a tier with volume |
| 23 | SSRF (4.3) | the first listing URL aimed at an internal address, which is a two-line change for the attacker |
| 24 | Admin tooling and the audit log (6.3) | the first enforcement action, which owes a written reason |
| 25 | Kill switches (3.4) | the first time something has to go off now rather than after a deploy |

### Continuous and invisible until they fail

| Rank | Area | The trigger |
| --- | --- | --- |
| 26 | Key management (4.4) | every settlement |
| 27 | Data retention, the mechanism (4.6) | the first retention boundary crossed, which is 30 days after the first probe |
| 28 | Dependency and supply chain (4.5) | any install |
| 29 | Backup and recovery (3.5) | the first data loss, which is also the only time it can be tested honestly if it was not rehearsed |

### Only after adoption

| Rank | Area | The trigger |
| --- | --- | --- |
| 30 | Unit economics (7.5) | the first conversation about whether this can be a business, which is the adoption conversation |
| 31 | Legal entity and jurisdiction (7.6) | the same conversation |
| 32 | SLA and uptime credits (7.1) | a customer who wants a promise, which needs a billing relationship first |
| 33 | Insurance and bonding (7.2) | the first loss somebody wants covered |
| 34 | Referral and growth (7.4) | a growth budget, which an entrant does not have |
| 35 | Entry to an operated product (9) | the winner announcement on 2026-11-05 |

Two notes on the order. Rank is not importance: key management sits at 26 because nobody encounters it, yet it
is the one row where a mistake is unrecoverable. And of the first eight rows, which are the ones that decide a
score, seven say Ships and one says Ships thin. The thin one is **search relevance at rank 4**. It is
worth naming rather than smoothing over, because it also sits below the only cut line in the lane: the operator
grammar is item 6 of `15-SYSTEM.md`'s eight-item cut list and losing day 1 cuts items 1 to 6. What the thin
version guarantees a judge is the part that cannot be cut: the versioned synonym map with its refused-term
list, the duplicate collapse before scoring and the published field weights with the function in section 2.3.
A judge who types a category phrase lands on that category. A judge who types `trading` never lands on
129,023 rows. What a judge may not get is the operator grammar, the parse-back and the misspelling table, in
that order, with section 2.3 saying which goes first.

## 11. The three to build next if the deadline moved a week

Chosen against the three published criteria rather than against what is most interesting. Each one is a gap
that would still be a gap after everything above ships.

**1. Operator tooling, finished, plus a supply push at the two hosts that hold the field (about two days).**
The self-check and the operator view ship thin in section 5.4. Finished means bulk operations plus a fix-it
diff per lint finding that names the exact bytes to change, then using it. The reason this is first is Agent
Diversity: it is one of three criteria, the page says "All four, equally deep, is the bar", while the field's
weakness is coverage rather than craft, with the strongest rival by build volume showing two empty shelves and
zero third-party activation coverage (`R14-rivals.md`). A shelf filled by third parties beats any further
verification depth.

**What the concentration actually buys, which is the reason a week is enough.** The addressable field is not
269 operators. It is one platform, one host and one certificate. `platform-backend.prod.termix.live` owns all
51 templated records. A probe of 6 cards across the id range returns `status: "UNBOUND"` with
`endpoint: null` on 6 of 6 while the second declared path 404s (`MEASUREMENT.md`), so that block is **not a
two-line fix**: nothing is deployed behind those ids and the conversation is about binding endpoints, not
about substituting a placeholder. `evoevo.ai` holds 217 of the 229 endpoint URLs with an identical body prefix,
so the 218 HTML answers are one template. The certificate bound to the wrong hostname is a single agent. Two
conversations plus one certificate is a week's work for one person, where a 269-operator outreach is not. That is the whole reason this is achievable rather than aspirational. The fix-it diff is what makes each
conversation short: it names the bytes rather than describing the problem.

**2. The long-job path finished end to end, with notifications behind it (about two days).** Section 5.1 ships
pull. Finished means the per-address feed, the per-job webhook with delivery observability and a job view that
survives a closed tab, exercised on a real multi-day job in each of the two categories that need it, a grid that
runs and a health-factor monitor that does not end, with the scheduled shapes in rebalancing and yield exercised
on the same path. This is second because Functionality is scored on the journey and half the journey is
currently only demonstrable for work that finishes while you watch. It is also the piece that turns a second
hire from a possibility into a habit.

**3. Seven days of rate samples across all four categories, which is the one thing only elapsed time buys
(about one day of work plus the week).** The `sampler` ships and reads every category's rates from their own
contracts at a pinned block, but the series starts the day it is deployed, so at submit the 7-day window is
partial and every field it feeds renders the `not-measured` state (`02-THESIS.md` section 12, `06-QUALITY.md`).
A week turns that into a real series: a 7-day APY with its own window and unit for the yield shelf, drift
history for rebalancing, realised range occupancy for grid, then a health-factor trace against the actual
liquidation threshold. Three protocols publish rates in three different units, Venus per block, Lista's Moolah
per second and Aave per year in ray (`R09-bsc-defi.md`), so the work is the derivation and the unit discipline
rather than more collection. This is the direct answer to a criterion that asks for data that "goes beyond
basic counts" and lets a user "make a genuinely informed call", because a rate with a window behind it is a
comparison a buyer can act on and a spot read is not. It is third rather than first because no amount of effort
compresses it: the samples arrive at one a day whatever we do, which is exactly what a moved deadline is worth.
The E1 bond is deliberately not here. Its surface and its terms are specified and `OperatorBond` is deployed
on no chain (section 7.2, `three/decisions/05-onboarding-operatorbond-not-deployed.md`), so the open piece
is a deployment plus a stake rather than a stake alone. An unaudited escrow holding strangers' money is the wrong risk in week
one as much as in week zero (`05-ONBOARDING.md`).

**What that week would not buy, deliberately.** No SLA, because it needs a billing relationship (7.1). No
insurance, ever (7.2). No mainnet E1 stake, for the reason in item 3. No i18n beyond the discipline, because the
policy set is the real translation cost (8.3). No admin console, because it adds an authenticated surface to a
product with no accounts (6.3). No parallel testnet catalogue, because the agents surfaced must be live on BSC
(5.6). No fuzzy search, because a confident wrong answer is the failure the whole product is built against
(2.3).

**And one thing that looks attractive and is not, at this size.** A randomised holdout on our own ranking is the
only design in the prior art that produces a causal number about whether matching helps, at about three hours of
work (`R13-prior-art.md`). It is not in the three because it needs traffic to produce a number and a holdout
with no traffic produces an empty table with a methodology attached, which is worse than not claiming it. It is
the first thing to build the week after there is traffic.

## Decisions and rejected alternatives

| Decision | Rejected alternative | Why |
| --- | --- | --- |
| Four verdict labels on every area, with Refused as a first-class outcome | a backlog with priorities | a backlog implies everything arrives eventually. Refused says an SLA and an insurance product are not coming, which is the honest and defensible answer |
| No SLA and no uptime credits, replaced by a published freshness contract plus a public canary | a 99.x% availability target in the terms | there is no billing relationship to credit against, the fee is per job at settlement and an availability promise with no remedy is a misrepresentation. A `live` row going `stale` after 15 minutes is a behaviour a reader can verify |
| No admin web console. Admin actions are CLI commands with a mandatory reason | a protected admin route in the web app | it would add the only authenticated session in a product whose security story is that there are no accounts. The cost is that an action needs the operator at a terminal, which is why the response targets are set where they are |
| Pull-based notifications: a permanent receipt URL, a public per-address feed, an optional webhook | collect an email at hire so we can send one | storing an email beside a wallet address is what makes that address personal data for us, with our own database named as the means reasonably likely to be used (`R15-compliance.md`). The feed covers the need without creating the link |
| A zero-cost dry run of the mainnet hire path, plus one labelled testnet escrow job | a full testnet mirror of the marketplace | no chain-97 token implements EIP-3009, so the one-signature rail cannot be shown there at all. The testnet `$U` and USDC addresses and decimals are contradictory and unverified. The dispute window differs by a factor of 672, 604,800 s against 900 s, both re-read from `disputeWindow()`. Eligibility requires surfaced agents to be live on BSC |
| A versioned synonym table with the expansion shown back to the buyer | semantic search or fuzzy matching over names | the one index offering a semantic path answers "watch my Venus health factor" with three astrology agents and its weighting knobs return byte-identical sets across a sweep (`R05-8004scan-api.md`). 215 of 600 sampled names are byte-identical duplicates, so name similarity ranks copies of one thing |
| `trading`, `bot`, `defi`, `finance`, `risk` and `monitor` are refused as category synonyms | expand generously to fill thin shelves | `trading` alone matches 129,023 agents against 518 for the four categories' most generous terms combined (`MEASUREMENT.md`). A generous synonym turns a shelf into noise and the shelf is the scored surface |
| Text nodes only, no markdown, no agent-controlled image anywhere | render markdown for a nicer listing page, proxy images through a signed proxy | GitHub disabled image rendering in Copilot Chat entirely despite already running an HMAC-signed image proxy, because the proxy did not close the class (`R12-agent-comms.md`). A nicer page is not worth an exfiltration channel in front of a judge |
| The SSRF client connects to the address it checked, with `Host` and SNI set to the name | resolve, validate, then hand the hostname to the HTTP client | validating a name and then connecting by name leaves a DNS-rebinding window between the two. Checking every resolved address is necessary and not sufficient |
| A static SVG badge for embedding | an iframe widget or a script embed | an iframe is a surface we cannot patch on somebody else's page and a script ships our code into an origin we do not control. Cards in this ecosystem are already unfetchable from a browser, since one live agent card sends no CORS header at all (`R12-agent-comms.md`) |
| The read API serves chain-derived facts and our own measurements, never a bulk mirror of a foreign index | republish the enriched catalogue, which would be a better API | the index we cross-check publishes no terms and no data licence and its legal paths do not resolve, so a grant to redistribute is unestablished rather than permissive (`R15-compliance.md`) |
| Evidence attaches to an agent revision keyed on content hashes | keep one running count per `agentId` | `setAgentURI`, `setMetadata` and `setAgentWallet` are owner-callable at any time, so a count against a bare id can be inherited by a rewritten service. A declared `version` cannot be trusted either: a live card declares an A2A release that has never existed |
| A per-owner cap of four live listings | no cap and let ranking bury the spam | ranking buries a row after it has already cost a probe and a shelf slot. Capping what an unproven supplier may list is the pattern that holds a large catalogue together (`R13-prior-art.md`) and four is the number of categories |
| Sybil defence is structural: no surface unlocked by identity count, plus a zero-weight funding-cluster filter that records rather than deletes | a humanity score as a listing gate | identity is free on this chain and 111 addresses wrote all 29,712 feedbacks in the sweep over 334,935 ids at block 120,027,164, 2026-09-05T02:02:32Z, so a count-based gate is already defeated. Deleting rather than labelling a cluster row is the pattern a US rule treats as review suppression (`R13-prior-art.md`) |
| Publish the search field weights | withhold them as ranking coefficients | the rules require the main ranking parameters and their relative importance and only permit withholding what would enable manipulation (`R13-prior-art.md`). Five field weights are not that and publishing them is a Data Quality answer |
| Unit economics published with the break-even as a `$U` per BNB ratio | print a margin in dollars | `$U`'s issuer, peg and redemption are unverified and the market-data redisplay licence is unverified. A ratio between two measured numbers is a fact. A dollar margin would be a claim resting on two unverified inputs |
| A pre-rendered fallback at the apex whose status block reads unknown | serve the last known-good status page during an outage | the `status` component may not report a green it did not measure (`15-SYSTEM.md`) and a cached green during an outage is exactly that |
| Incident history ships empty | seed one worked example so the surface is visible | seeding a fake incident is the same defect as seeding a fake listing and `02-THESIS.md` rules out mock data of any kind |
| Insurance refused outright, while the E1 bond ships as published terms with no deployment | a pooled fund the venue tops up so a buyer is covered when an agent fails | there is no underwriter for an autonomous agent's output. A venue-funded pool is an unlicensed insurance product plus a custody surface, which bolts two regulated activities onto a product that currently has none. A bond is the seller's own money at risk. A pool is ours (7.2) |
| No referral reward, no points, no token and no paid placement | pay whoever routed a hire, which is what the comparable designs elsewhere do | a promotion offering a retail client "any monetary or non-monetary incentive" is barred by the regulator's own handbook with referral bonuses named in the guidance, undisclosed paid ranking is unfair in all circumstances under the consumer rules (`R15-compliance.md`). A disclosed paid slot still poisons the one signal the product has, which is a job somebody paid for (7.4) |
| No third-party analytics script anywhere, only server-side counts | one analytics tag, which is what every product does and which would give real funnel data | a wallet address in a third-party analytics payload is an international transfer of personal data with no assessment behind it (`R15-compliance.md`). No page here needs a script to count a render it already served, so the tag would buy convenience at the price of the whole data posture (5.5) |
| Webhooks publish their full contract and deliver nothing | ship a thin single-event HMAC delivery so push exists | delivery needs a subscription record the data model does not carry plus a retry loop running 51 hours, against a build order that is full to the freeze with eight items already on a cut list. A published contract a receiver can be written against is honest. A half-delivered webhook is an argument nobody can settle (5.2, 1.1) |

## Open questions

- **The programme's own IP and licensing terms.** Unverified. This is the one open question that blocks a step
  rather than a detail: the rules host returned HTTP 405 with a human-verification page on every path tried and
  the hackathon page renders client-side with no terms text (`R15-compliance.md`). Step 2 of section 9 cannot be
  planned against it. Settled by reading the actual clause before the submission form is filed, which is already
  a checklist line in `10-DOCS-AND-POLICY.md`.
- **Whether judges read the repository at all.** Unverified. All three published criteria are properties of the
  running site (`00-PROGRAM.md`, `R14-rivals.md`). It matters here because the postmortem template, the
  retention test, the SSRF test matrix and the CLI admin path are all repository artifacts. Nothing in the design
  depends on the answer, but the status page carries links to them so the running site can show them.
- **Whether the circuit breaker threshold and its half-open cadence are right.** 25% non-200 over a rolling
  5 minute window is set from two measurements on one day, 20.8% then 56.7% (`R05-8004scan-api.md`). Two points
  do not describe a distribution. The 60 second trial interval and the three-success close are a choice about
  how long a source may stay marked unavailable, not a measurement either. The trade is visible: a shorter
  interval recovers faster and spends more calls on a source that is down. Settled by logging the observed rate
  and the observed open time per source through judging and publishing both, which the status page does anyway.
- **Whether two hosts answer a fix-it contact inside the window.** The supply push in section 11 rests on it and
  nothing in the research measures operator responsiveness. Stated at the right size: the addressable field is
  one platform holding 51 records, one host holding 217 of 229 endpoint URLs and one wrong certificate, not a
  population of operators (`MEASUREMENT.md`). That makes the question narrow rather than reassuring. Two
  refusals close the whole lever. The platform block needs endpoints bound behind ids that currently answer
  `status: "UNBOUND"` with `endpoint: null`, which is more than a configuration change on their side. Settled by
  sending both and publishing the reply rate, including zero.
- **Whether a cap of four live listings per owner blocks a legitimate operator.** Multi-agent owners exist: of
  the five agents on BSC carrying a verified endpoint domain, three belong to one operator (`SPINE.md`
  constants, from `R12-agent-comms.md` and `R05-8004scan-api.md`). So an owner with two agents covering all four
  categories sits at the limit with nothing spare, which is the case the cap is least comfortable with. It is
  appealable for that reason, the appeal grants a recorded raise rather than a waiver (section 4.1) and the
  number is a judgement rather than a measurement.
- **Whether the sunset notice period should be 7 days.** Chosen with no data on buyer reliance, because there
  are no repeat buyers on this market yet: of the 334,935 ids swept at block 120,027,164, 2026-09-05T02:02:32Z
  only 4,406 carry any feedback, while the escrow's paid value is concentrated in one address (`MEASUREMENT.md`,
  `SPINE.md`, `R16-reuse.md`). Settled by the first deprecation with a live buyer.
- **Whether the SSRF deny list covers every IPv6 transition mechanism.** Five shapes are verified as passing a
  naive check, including NAT64 `64:ff9b::/96` and multicast (`R12-agent-comms.md`). 6to4 and Teredo were not
  measured, so they are on the list by reasoning rather than by test. Settled by adding them to the test matrix
  and running it.
- **Whether the relayer's 0.05 BNB ceiling is the right loss ceiling.** It funds roughly 5,000 brokered hires at
  the measured gas, which is far more than this entry will see, so the number is a choice about how much a
  compromise can cost rather than a capacity calculation. Settled by observed volume, which does not exist yet.
- **Whether a query log with no address attached can improve relevance.** A click cannot be attributed to a
  query beyond the same request without a session, which the design does not have. So the learning signal may be
  too weak to act on, which would make the relevance work in section 2.3 permanently a matter of published
  weights rather than of measurement. Settled by trying it on real traffic. The fallback position is acceptable:
  published weights that anybody can check are defensible in a way a learned ranker is not.
