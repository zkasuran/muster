# 02-THESIS: what Muster is and why a directory loses

Written 2026-09-05. The build closes 2026-09-09 UTC+0.

Vocabulary, component names and constants come from `research/SPINE.md`. Programme wording comes from
`00-PROGRAM.md` and every quotation there is quoted. Measured numbers come from
`research/MEASUREMENT.md`, `research/R14-rivals.md`, `research/R05-8004scan-api.md`,
`research/R02-erc8183.md`, `research/R16-reuse.md` and `research/VERIFIED-payment-rail.md`, each with
the block height or the read date the source recorded. Where the review pass re-read a fact on chain or
over the wire, the read carries its own call and its own date in place. Nothing else here computes a
new number.

## 1. The claim

**Muster is the BNB Agent Studio marketplace where every agent on a shelf has a settled paid job a
stranger can recompute, in all four mandated categories, with our own supply labelled and excluded from
every revenue figure.**

That sentence is a gate rather than a slogan. It commits us to three things a judge can check in a
browser inside five minutes. Every row on a shelf carries a receipt with a content hash, a transaction
and a pinned block. Every number carries a freshness stamp, so nothing on screen is undated. All four
shelves are built from the same category contract, the same probe suite and the same data panel, so
none of them is a stub with a nice name.

The supply split sits inside the sentence rather than in a footnote. This is the line the submission
form, the video and the article all reuse, so it has to survive section 10 clause 3, which forbids a
four-category claim that blends our supply with the ecosystem's. Check the sentence against that clause
before it is used anywhere outward.

The rest of this document settles what that costs, what it excludes and what is actually shipped by
2026-09-09.

## 2. The name

The product is **Muster**, fixed in `research/SPINE.md` and used identically in the UI, the repo, the
submission and the video.

Two reasons. A muster roll is the honest record of who is present and fit for duty, which is the
product. To pass muster is to meet a stated standard, which is the gate in section 5. The name says
both halves of the design in one word and it survives a judge scanning a list of submission titles.

The field check, run live on 2026-09-05. `muster` appears nowhere in `research/R14-rivals.md`, nowhere
in its 206-repo rival census (`raw/r14-rival-field-206-2026-09-05.tsv`), nowhere in the five incumbent
ERC-8004 explorers it studied and nowhere in the other-chain marketplaces it read. My own GitHub
searches today: `muster erc-8004` returns 0 repositories, `muster in:name bnb` returns 0,
`muster in:name erc8004` returns 0, `muster in:name agent` returns 3 and none of the three is a
marketplace (an agent-orchestration tool last pushed 2026-06-23, a German-language voicebot, a
LangGraph observability test). `muster agent marketplace bnb in:name,description,readme` returns 2 and
both are personal starred-repo lists.

The names to stay away from are the ones the field converged on. `R14-rivals.md` counted them:
fourteen repositories are literally `bnb-agent-marketplace`, four are some form of `mandate` and three
are some form of `assay`. A judge scanning titles merges those. A generic name is now a liability.

## 3. Why a directory of the whole BSC agent set loses

The registry is enormous and almost none of it is usable. Both halves are measured, not argued.

**The population, from `MEASUREMENT.md` and `SPINE.md`.** BSC held **336,088 registered agents** at block
120,141,168 (2026-09-05T16:17:48Z), read from the Identity Registry's own `_lastId` counter, growing at
between 1,940 and 2,110 a day across the two windows measured, with the rate itself moving. Ids are
sequential with no gaps over the window checked. So the denominator is
real. The problem BNB Chain's own brief names is discoverability, because "hiring one today means
digging through X threads and GitHub repos" (`00-PROGRAM.md`). That head is the denominator behind that
sentence. Every full-sweep ratio below keeps its own denominator, **334,935 at block 120,027,164**, because
that is the id range the sweep actually ran over and nobody re-ran it fourteen hours later.

**The usable fraction, from the same file.** A uniform sample of 600 ids, splitmix64, seed `20260905`,
rejection-sampled and reproducible:

| Tier | What it adds | Count of 600 | Share, 95% Wilson |
| --- | --- | --- | --- |
| document parses | registration JSON readable | 570 | 95.00% |
| **T0** | a concrete `http(s)` endpoint, no template | 233 | 38.83% (35.02 to 42.79) |
| **T1** | that host resolves, completes TLS and answers 2xx or 3xx | 230 | 38.33% (34.53 to 42.29) |
| **T2** | the answer is a machine surface rather than a web page | **12** | 2.00% (1.15 to 3.46) |
| **T3** | a stranger can discover where to pay | **0** | 0.00% (0 to 0.64) |

Where the funnel collapses is the useful part. 218 of the 230 reachable endpoints serve an HTML page
built for a human browser. All 12 that reach T2 are one product on one host under 12 distinct owner
addresses. Not one endpoint in the sample answered with an HTTP 402 or an x402 `accepts` body.

**Every tier here is counted per agent. T0 counts any concrete `http(s)` endpoint the document
declares, so it is deliberately generous.** That matters because a rival census over the same registry
publishes a much smaller share and the gap is definitional rather than a disagreement about the chain.
`brainonbnb.com/registry` publishes a full sweep of 332,331 of 332,331 ids dated 2026-09-03 16:45 UTC
reporting 47.7% readable registrations and 0.56% naming an endpoint (fetched 2026-09-05, HTTP 200). Our
own data explains most of the distance: 217 of our 233 T0 agents point at one host, `evoevo.ai`, every
one of them declaring the service name `web`, which the registration schema uses for a human web
surface (`MEASUREMENT.md`). T2 is the tier that removes them, at 12 of 600. So the comparison a judge
should make is tier to tier. Our page publishes the tier definition beside the count for exactly that
reason.

**The registry is also duplicated.** 215 of 600 agents carry a **byte-identical**
`data:application/json;base64` tokenURI decoding to the name `Ave.ai Trading Agent`, under 215
distinct owner addresses, so owner-based deduplication fails and name-based deduplication catches only
the exact string. 322 distinct names cover the 600 and 312 of those names appear once. 229 endpoint
URLs resolve to **9 hosts**, one of which holds 217 of them.

**The reputation layer cannot sort it either.** A sweep of every one of the 334,935 ids in that range finds
**4,406 agents with any feedback (1.32%)**, **29,712 feedbacks** written, **0** revoked and
**111 distinct authors on the whole chain**. 95 agents hold half of all feedback, the top 100 hold
52.35% and the busiest single author rated 1,800 agents. Of 950 sampled rows, 844 tag a persona trait,
68 tag uptime or response time and **not one tags a financial outcome**. Separately,
`R05-8004scan-api.md` read `is_endpoint_verified=true` for chain 56 three ways and got **5 agents on the
whole chain**, of which 3 share one owner. That owner is a third party, verified rather than assumed:
`ownerOf` returns `0x73809F69916FcF7Ddc5BB1315fBdf96A569a5963` for 302257, 302258 and 304493 while 7612
and 705 return two other addresses, read 2026-09-05 over `https://bsc-rpc.publicnode.com`.
`decisions/02-thesis-brainonbnb-is-third-party.md` settles the ownership question the research files
disagreed on. `R05-8004scan-api.md:988` says four of the five share an operator, which the chain
contradicts.

**And the four mandated categories are the thinnest part of all.** In the sample of 600 the counts are
rebalancing 0, grid 0, yield 1, health factor 0. Across the 8004scan search index the most generous
single term for each of the four sums to **518 agents, 0.17% of the 303,461 indexed**, while `trading`
matches **129,023**. `MEASUREMENT.md` records that those counts came out of a degraded API and lists
the queries that returned `DATABASE_ERROR`, so treat them as a floor with a named defect rather than a
clean census.

So a directory loses for a reason that is arithmetic rather than aesthetic. Sorting a third of a million rows
by any
property the registry publishes puts unreachable rows in front of a buyer, because unreachable is the
overwhelming majority state and the registry has no liveness field to sort on. The prettier the
directory, the more convincing the wrong answer looks. `MEASUREMENT.md` puts it as a design implication
and I am adopting it as the thesis: the scarce thing is a callable agent, so callability is the product.

**The field already learned half of this and stopped there.** `R14-rivals.md` found 206 public rival
repositories created since 2026-07-15, 53 of 59 published URLs answering HTTP 200 and at least eight
independent builds converged on "we call the agent before we list it". Probing is table stakes. What
nobody closed is coverage plus freshness at the same time. The strongest rival by build volume (1,429
commits, live on a custom domain, five-tool MCP server) renders Rebalancing and Health factor as
"Unverified · empty", Grid and Yield as "1 candidate" each. Its own README states "Current
third-party activation coverage is empty". A second rival's landing page was rendering `--` for three
of four headline metrics while `R14-rivals.md` read it, because it single-sources 8004scan, whose BSC
mainnet indexer reported `status: down` with a checkpoint 32 hours stale for the whole measurement
window. One rival has filled all four shelves with third-party agents and its headline metric is
answered-ness, not hireability.

**One rival is further along than the repo census can see, so the opening is narrower than it looks.**
`R14-rivals.md`'s field is a GitHub query plus a probe of the URLs those repos publish, which cannot see
a live product with no public repo. `brainonbnb.com/registry` is one. Fetched 2026-09-05 (HTTP 200,
235,479 B) it publishes a full-registry sweep dated 2026-09-03, its own funnel down to 814 answering
agents, all four mandated shelves with 16 rows carrying a Hire button and 11 that returned a price when
asked, duplicate collapse to a fleet count, an open machine surface at `agent.brainonbnb.com/find` plus
`POST /dispatch`, prices in `$U` with escrow and per-provider ERC-8183 employment history joined to
agent ids ("Hired 9 times through the escrow, 2 paid out (4 delivered, still in the dispute window)").
So a shelf with hireable third-party rows and settled escrow evidence exists today.

What that page does not carry is what is left to win on. It has no recompute command, no content hash
and no per-field freshness: 0 occurrences of "recompute", "content hash", "sha256", "pinned" or
"freshness" in the page as fetched, with its registry sweep dated 2026-09-03 16:45 UTC and its
reputation read dated 2026-08-31. Data Quality asks for real-time. So what is left to win is not more
verification depth. It is a dated snapshot answered by a per-field freshness stamp, an asserted history
answered by a receipt a stranger can recompute, plus four category data paths with their own arithmetic.
A closed loop from a cold landing page to money that moved, in four categories, with the evidence
attached and every number carrying the age of its check.

## 4. The core move: the unit of the marketplace is a completed paid job

A listing is a claim. A job is a fact. Every marketplace surface, every count and every ranking input
in Muster is built on the second one.

Concretely, this is what the choice changes:

- **The headline number is settled turnover per category over a stated window**, never the agent count.
  The agent count still appears, as the denominator, with its block height beside it.
- **A shelf row means somebody paid this agent for this category of work and here is the receipt.**
  Reachability is a prerequisite, not the achievement. An agent that answers a probe has demonstrated a
  web server.
- **The score consumes settled jobs only** (`06-QUALITY.md` owns the formula). Raw ERC-8004 feedback is
  displayed with its author and never treated as a score, because 111 addresses wrote all of it.
- **A receipt is a first-class page**, addressable, anonymous-fetchable and recomputable: content hash,
  hash rule, transaction, block, pinned block, inputs hash, code version and the command that
  reproduces the hash.
- **Every payment carries an `origin` tag of exactly `house` or `order`, enforced at ledger append
  time.** Revenue and volume count `order` only. This is a structural invariant rather than a display
  convention, which is what makes section 10 defensible.

The programme's own words support the choice without naming it. Functionality ends at "activate it".
Data Quality asks for enough to "make a genuinely informed call on which agent to hire". A settled job
with a receipt is the only artifact on BSC today that answers both, because it is the only signal in the
stack that cost somebody money to create.

There is a real cost and I am taking it deliberately. A paid-job unit makes our shelves small. A
reachability unit would let us render hundreds of rows per category today. Small and true beats large
and unusable. Section 6 keeps the large set visible rather than hiding it.

## 5. The hireable bar

The **hireable bar** is the gate a listing passes to reach a shelf. Six assertions, each machine
checked, each with a named failure. All six or the listing does not reach a shelf.

**Where the verdict is carried.** Reachability failures already have a home: `probeResult.failureClass`
is a closed enum of `dns`, `tls`, `http`, `template`, `shape` and `timeout` (`research/SPINE.md`), which
covers H1 and H3. The other four assertions fail for reasons no probe enum can express, so the per
assertion verdict is carried in `listing.lintFindings[]` with a stable code per assertion, `h1` to `h6`,
plus the timestamp of the check. That uses two fields the model already has. Materialising it, indexing
it or naming a column is `15-SYSTEM.md`'s call, which is the only document allowed to extend the stored
model.

| Assertion | Named failure | Carried by |
| --- | --- | --- |
| H1 identity | `template` or `shape` on the tokenURI read, plus `h1:owner-missing` when the owner read fails | `probeResult.failureClass`, `lintFindings[]` |
| H2 category | `h2:no-confident-category`, with `categoryBasis` and the abstention reason | `lintFindings[]` |
| H3 machine surface | `dns`, `tls`, `http`, `template`, `shape`, `timeout`, plus `h3:stale-verdict` past the window | `probeResult.failureClass`, `lintFindings[]` |
| H4 wire contract | `h4:` plus the failing `conformance` assertion id, one per failure | `lintFindings[]` |
| H5 money | `h5:decimals-unresolved` or `h5:rail-unsupported`, naming the token | `lintFindings[]` |
| H6 settled job | `h6:no-settled-job` or `h6:unattributable`, the second when a job exists with no per-job agent attribution | `lintFindings[]` |

**H1 Identity resolves.** `agentId` exists on the Identity Registry
`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, `ownerOf(agentId)` returns an address and `tokenURI`
resolves to a registration document that parses. Failure class: `template` or `shape`. This costs the
operator nothing, so the bar is passable by an agent whose operator has never heard of us.

**H2 Category fit is declared or evidenced, never guessed.** The listing satisfies exactly one of the
four category contracts in `03-TAXONOMY.md`, with its named inputs, named outputs and units.
`categoryBasis` records whether the assignment came from `declared`, `text` or `probe` and the
classifier abstains rather than guessing. A listing with no confident category is not a shelf row.

**H3 A machine surface, freshly measured.** A `prober` run reaching **T2** or better, with a passing
verdict no older than **15 minutes** at render time. `05-ONBOARDING.md` owns the probe schedule and may
tighten that window, never loosen it. The page shows the age of the check, because
`R05-8004scan-api.md` proves what a cached verdict is worth: 8004scan scores agent id 1
`health_score: 100.0` while its certificate does not match its own hostname and its
`endpoint_last_checked_at` stayed at 2026-05-20 through a verification that demonstrably ran.

**H4 The wire contract holds.** The `conformance` suite passes every assertion in
`04-AGENT-PROTOCOL.md`. Three of those assertions are load bearing here. Every route the listing invites
answers a payable challenge rather than a free 200. The challenge carries token, atomic amount and
resolved `decimals` in the header and the body, emitted from one object so the two cannot drift. A
caller who has already paid never receives a schema error. A request the agent will not serve gets a
structured refusal naming the failed condition. A correct refusal is a pass.

**H5 The money resolves.** Two parts. The settlement token's `decimals` is read from its own contract at
index time then asserted against the configured value. The token must support the signature path the hire
uses (`08-MONEY.md` owns the rail). This assertion exists because the arithmetic here is easy to get
wrong. Every BSC stablecoin is 18 decimals, which is the constant the field has already got wrong:
Binance's own B402 documentation published 6 decimals for all four mainnet tokens until its 2026-05-19
changelog, with merchants pricing one cent as `amount: "10000"` and charging 1e-14 of a token
(`R03-x402-b402.md`). `VERIFIED-payment-rail.md` also proved that USDT on BSC supports neither EIP-3009
nor EIP-2612, nor does Binance-Peg USDC, nor does BUSD. A listing priced in a token whose decimals
cannot be resolved fails H5. Refusing the listing beats listing an agent nobody can pay.

**H6 One settled job in this category, verifiable by a stranger.** Satisfied by any one of:
(a) an ERC-8183 job on the official kernel `0xEa4DAa3100A767e86FDed867729ae7446476EBA6` that reached
`COMPLETED`, where the provider address joins back to this `agentId` **and** the job itself attributes
the work to this `agentId`;
(b) a Muster job whose `terminalState` is one of the paid terminal states in `04-AGENT-PROTOCOL.md`'s
ten-state lifecycle, with `origin: order`;
(c) a Muster job with `origin: house`, which qualifies the row and is labelled on every surface and
excluded from every revenue and volume figure.

**Clause (a) needs both halves of the join, because an owner is not a category.** One owner holds many
listings across categories. Read today over `https://bsc-rpc.publicnode.com`, `ownerOf` returns
`0x73809F69916FcF7Ddc5BB1315fBdf96A569a5963` for 302257 (health factor), 302258, 304493 and 304494
(rebalancing), so an owner-level join alone would let one completed job by that owner pass H6 for that
owner's listings in every one of the four categories. The chain already carries the missing half: job
56712's on-chain description is `{"schema":"mandate/hire/v1","agentId":"304494", … ,"category":"rebalancing", … }`
and `raw/erc8183-jobs-56400-56713-bsc-2026-09-05.json` parses a per-job `agentId` plus `category`
already. So the rule is: the job description's `agentId` names this listing's agent, falling back to a
signature recovering to `agentWallet`, with `ownerOf` kept as a necessary condition rather than a
sufficient one. A job whose agent attribution is missing passes nothing and is classed `unattributed`,
which is already a value in `04-AGENT-PROTOCOL.md`'s attribution enum. That matters in practice: only 66
of the 314 jobs in that capture carry an `agentId` at all and only 13 carry a `category`.

H6 is why the bar is not circular. 28,244 ERC-8183 jobs have already reached `COMPLETED` on BSC
(`R16-reuse.md`, full re-index in 455.6 s), so a third-party agent can pass H6 on evidence that
predates us, wherever the attribution survives. Clause (c) is the cold-start valve and section 10 governs
it.

A bar pass is not a recommendation. The bar says hireable. The Muster score says how well, with its
interval and its sample size. It weights a single-client record down because 18 of the 28 ERC-8183
providers with any completed job have their entire record from one client address.

## 6. What happens to everything that fails the bar

Nothing is deleted and nothing is hidden. A failing listing takes `visibility: indexed` instead of
`visibility: live`, which means all of this:

- **It stays in the index and stays searchable.** Every agent in the registry is reachable by id, by
  name, by owner and by category candidacy. A permanent URL per agent, fetchable anonymously, indexable
  by a search engine.
- **It renders which of H1 to H6 failed, in the words of section 5's table, with the timestamp of the
  check.** Reachability failures keep their six classes separate and are never merged into "offline",
  because each needs a different fix from a different person: `dns` does not resolve, `tls` name
  mismatch, `http` error from a live host, `template` placeholder never substituted, plus `shape` and
  `timeout`. `MEASUREMENT.md` found four of the six in one sample of 600. An H2, H5 or H6 failure is not
  a reachability failure at all, so it renders its own `lintFindings[]` code rather than borrowing a
  probe class.
- **It never enters the hire path, the compare view or a ranked shelf position.** No quote, no payment
  challenge, no dispatch. There is no way to reach a payment screen for a listing that failed H4 or H5.
- **It counts in the candidate total for its category and never in the hireable total.** Four counts per
  category exist and each has one home, because a number with two homes drifts: the shelf card carries
  rows shelved, rows that answered inside the last hour and hires settled, the shelf's own off-shelf drawer
  carries the candidates that did not make it broken out by reason, then `/coverage` carries all four
  together with the first-party split (`03-TAXONOMY.md` owns both surfaces). Every one of them renders with
  a freshness stamp.
- **A duplicate cluster collapses to one row.** Deduplication is on the `tokenURI` content hash, which
  is what collapses the 215-agent block in one pass, with the cluster size shown and expandable.
- **Delisting is a separate act with a named reason.** Neither `suspended` nor `delisted` applies to a
  row we index and never onboarded, because it never had standing to lose. `05-ONBOARDING.md` owns both
  transitions and the causes of each. `03-TAXONOMY.md` owns how an `indexed` row renders.

The reason this is not a hedge: the candidate list is the honest form of the coverage claim. It says we
looked at the whole registry, here is everything in this category, here is what each one failed and here
is when we checked. A judge can pick any row and check the verdict against the live endpoint.

## 7. Winning the three published criteria

The Weight column on the live rubric page is published empty (`00-PROGRAM.md`), so nothing below assumes
a weighting and no surface is traded off against another. Three judges score independently, then compare.

### Functionality

Quoted: "The full journey works end to end: land, find an agent by category, understand what it does,
activate it, with minimal friction. Someone with zero Agent Studio knowledge should be able to get
through it without hitting a dead end."

**The surface that wins it is the hire path: `land` to `shelf` to `listing` to `hire` to `receipt`, in
the `web` component, with no wallet connection until the hire.** Four design commitments carry it.

Browsing needs no wallet, no login and no signature, so a judge who does not hold BNB still reaches the
listing page and the receipts of past jobs. The brokered hire is **two typed-data signatures and no
transaction from the buyer**: one authorisation for the price to the agent's own `agentWallet`, one for
our fee to the treasury, disclosed as its own line before acceptance, with our submitter paying gas for
both. `08-MONEY.md` owns the bytes and settles the count: two authorisations, two transactions, with the
one-signature splitter rejected on purpose. One signature is the zero-fee direct path, which is not the
path the marketplace runs. Two is still the low-friction answer, because the friction a buyer normally
pays is an `approve` transaction plus a gas balance plus a custody step. This path has none of those.
The rail is EIP-3009 in `$U`, FDUSD or USD1: `VERIFIED-payment-rail.md` is authoritative on FDUSD and
USD1, while `$U`'s EIP-3009 support is verified by `R04-bsc-tokens.md`, `R16-reuse.md` and
`R06-altana.md` instead.

**The journey terminates in a page rather than a toast. Which page depends on the rail.** The rail is
chosen by arithmetic rather than preference (`08-MONEY.md`): expected delivery inside the authorisation
window with a price under 1.00 `$U` goes to `eip3009`, everything else goes to the ERC-8183 escrow. The
402 rail ends on a `receipt` with the content hash, the transaction and the recompute command. The escrow
rail ends on a job page carrying the job id, the state, the countdown and the auto-approval date, because
an escrow hire has no settled payment and no receipt until that window elapses. Neither is
a dead end. The demo path a judge walks is the 402 rail, so the recompute command is on screen at the end
of it, with the escrow job page linked from the same receipt as the slower proof.

Every surface has a defined non-empty answer, which is what "without hitting a dead end" actually asks
for: an empty shelf states which assertion the candidates failed, a failed probe states which one, a
refusal states which condition and `status` states what is stale right now.

Two supporting surfaces exist because the criterion is scored during a two-week window rather than on one
afternoon. `status` publishes per-source freshness plus an anonymous canary that runs the whole journey
through 2026-09-23. `api` plus `mcp` give a machine the same journey. Eligibility requires the submission
to be "functional and publicly accessible during judging", while `R14-rivals.md` found live rival
deployments already returning 404 or rendering empty.

### Data Quality

Quoted: "Real-time, accurate data that goes beyond basic counts. A user should be able to look at what
you are showing and make a genuinely informed call on which agent to hire."

**The surface that wins it is the `compare` view, field by field, with a freshness stamp per field and an
explicit unknown state.** Not a dashboard of totals. The decision the criterion names is a choice between
two agents, so the artifact is the row that puts them side by side: price with its token and decimals,
the per-category performance metric with its window, the reachability tier with the age of the check, the
evidence tier, the Muster score with its interval and its sample size, the count of distinct paying
counterparties and links to the receipts.

One field in that row is thin at submit and the page says so rather than letting a judge discover it. The
per-category metric runs on a 7-day rolling window over the `sampler` series (`06-QUALITY.md`). That
series only starts on the day the sampler is deployed, so at submit the window is partial and each
affected field renders `06-QUALITY.md`'s `not-measured` state with the first-sample time until enough
series exists. There is no free BSC archive to backfill from, which is the whole reason the series has to
accumulate forward.

Three properties make the data defensible rather than merely present.

**We read the chain first and name our sources with their lag.** The agent count comes from one
`eth_getStorageAt` on the `_lastId` slot with the block height printed beside it, not from an index.
The second index is a cross-check and 8004scan supplies the social layer it uniquely has. Each source
renders its own freshness line. That matters because `MEASUREMENT.md` measured the cost of the alternative
on 2026-09-05: 8004scan's BSC agent count is 303,461 in the `total` field on
`GET /api/v1/agents?chain_id=56` against 304,281 in `chain_stats[56].total_agents` on
`GET /api/v1/stats/global`, while the chain said 334,935 at that same block. Against the list endpoint that
is a shortfall of
31,474 agents, 9.40% of the true count. **One gap figure per read, with the read carrying its block**, which
is what stops this document, `SPINE.md` and `R14-rivals.md` printing three unexplained numbers for one
indictment. `11-BNB-STACK.md` re-read the same pair fourteen hours later and publishes 31,459 against its
own block, which is the same indictment re-measured rather than a second one.
`total_feedbacks` reads 11,780
against 29,712 read from chain, with 20.8% then 56.7% non-200 across two read windows while
`/status/summary` reported the database healthy. Publishing the discrepancy turns the field's shared
dependency failure into a demonstration of the criterion.

**Nothing is displayed that we did not compute or read. No field is invented.** No price, APY, TVL,
volume, risk or execution status appears unless it came from a call we made. `R05-8004scan-api.md` lists
the specific fields that must never be shown as freshness (`endpoint_last_checked_at` does not move even
when a verification runs) and the specific one that must never be shown as health (`health_score` 100 on
one A2A card parsed months ago).

**Foreign reputation is shown with its author, never as a star.** Section 3 is the reason: an average over
111 authors who never scored a financial outcome is an average of spam. We render the author, the
distinct-author count and the raw rows.

### Agent Diversity

Quoted: "All four categories (rebalancing, grid trading, yield, health factor) surfaced with equal
depth." The same page adds: "Single-category submissions score poorly. All four, equally deep, is the
bar."

**The surface that wins it is the set of four `shelf` pages, plus the `/coverage` page that proves the
equality rather than asserting it.** Each shelf is generated from a category contract with the same
structure, the same probe suite, the same comparison fields and the same counts. The coverage page
publishes, per category, the candidate count, the answering count, the hireable count, the settled job
count, the split between third-party and first-party supply on each of those, plus a link to the
classifier's published precision at `/categories/classifier`. A judge comparing shelves is comparing like
with like, which is what "equal depth"
means operationally.

The field list above is this document's requirement and the page has owners elsewhere:
`03-TAXONOMY.md` owns its information architecture and its empty states as it owns every other buyer
surface, `15-SYSTEM.md` owns where it renders and what it queries. It is `/coverage` rather than `/report`
because `/report` is the Agent Advantage Report that `13-PARTNERS.md` owns as a TermiX eligibility gate,
and one route with two owners is how the proof of a criterion worth a third of the rubric ends up buried in
a partner artifact (`three/decisions/03-taxonomy-coverage-page-splits-from-report.md`). A
criterion-winning page specified only
in the thesis is the page that gets dropped on the last day, so it is named here as a handover rather than
as a description.

## 8. Equal depth across four categories is a design constraint, not a content chore

Filling four shelves looks like writing four times as much copy. It is not. Each category answers a
different question over different chain state, in different units, with its own arithmetic trap already
found and recorded. That is why equal depth is a structural cost and why it has to be paid up front.

| Category | The question | The data path, from research | The trap already found |
| --- | --- | --- | --- |
| rebalancing | is this position in range and what does moving it cost | PancakeSwap v3 and Infinity position state, `getAmountsForLiquidity` plus `getFeeGrowthInside` at a pinned block | position values reproduce to the wei only when the block is pinned. Three blocks of skew moved `amount0` by 0.63 bps (`R08-pancakeswap.md`) |
| grid trading | do the rungs sit where fees are actually earned | v3 fee tiers and tick spacing, pool liquidity by tick through TickLens | there is **no 0.3% tier** on PancakeSwap v3 and the protocol takes a third per tier, so the 0.01% tier pays LPs 0.0067% (`R08-pancakeswap.md`) |
| yield | what does this actually pay, net, annualised how | Venus per-block rates, Lista Moolah per-second rates, Aave per-year rates in ray | three protocols, three rate units. Venus configures 70,080,000 blocks a year, so 192,000 a day, then compounds daily with exponent **364**, which reproduces `api.venus.io` to 4e-12. PancakeSwap gross fee APR overstates LP yield by a third, 42.34% against 28.37% net (`R09-bsc-defi.md`) |
| health factor | how far is this account from liquidation and at what penalty | Venus effective per-account LTV getters, Lista `isHealthy` on Moolah, Aave `getUserAccountData` field 6 | collateral factor and liquidation threshold are **separate numbers** on 12 of 55 Venus core markets and the core-pool getters are wrong for any account in an E-Mode pool (`R09-bsc-defi.md`) |

Three consequences follow and each one is a constraint on the build rather than a nice observation.

**A category with no verified data path can only be filled with numbers we cannot check.** Shipping that
to win Agent Diversity would lose Data Quality in the same screen, since both criteria are read on the
same page by the same judge.

**The population is thinnest exactly where the rubric is strictest.** 518 agents at 0.17% across the four
categories, against 129,023 for `trading`. So equal depth forces the cold-start design in section 9
rather than following from it. A build that treats the four categories as a content pass discovers this
on the last day.

**The unit of work is a slice across all four, never one category end to end.** Any cut we take under
time pressure reduces depth in four places at once. The alternative, finishing one shelf and stubbing
three, is the failure the rubric page names in a single sentence: "Single-category submissions score
poorly."

## 9. Cold start: where the agents on the four shelves come from

The eligibility rule is that agents surfaced "must be live on BSC". The measurement says the four
categories hold roughly 518 agents at 0.17% of the index with 0 of 600 sampled agents payable by a
stranger. So supply is a build problem with a priority order, not a search problem. Five sources, in this
order. The order is the position.

**S1. Agents already paid on the official rail.** The `escrow-index` component indexes the ERC-8183
kernel and joins the provider address plus the job's own agent attribution back to an `agentId`.
`R16-reuse.md` re-indexed all 56,713 jobs in 455.6 s against a free RPC: 28,244 `COMPLETED`, 292.24 `$U`
paid on completed jobs, 97 distinct providers and **28 with any completed job**. That is a small set of
real agents with real paid history. Every one of them can pass H6 clause (a) wherever the attribution
survives. On how rare that index is: `R16-reuse.md:18` called it "indexed by nobody else" and that is now
wrong, because `brainonbnb.com/registry` publishes per-provider ERC-8183 employment history joined to
agent ids (fetched 2026-09-05, HTTP 200). The claim we can hold is narrower. No product we found publishes
the full kernel joined to agent ids with per-category counts and a window, checked on 2026-09-05 across
`R14-rivals.md`'s 206-repo census plus a live-web check of the products that census misses. The
concentration is published beside all of it, because one address holds 56,167 jobs and 281.56 `$U`, which
is 99.0% of jobs and 96.3% of paid value. `research/SPINE.md` records that whether that address is one
operator or a platform router is **unverified**.

**S2. Named third-party agents inside the four categories that publish a price and a rail.**
`R02-erc8183.md` read three of them on chain today. Agent **325479** publishes a live metadata URL listing
exactly the four mandated categories with listing ids, a heartbeat at 2026-09-05T01:21:13.529Z and a price
of 0.25 `$U`. Agents **302257** (Venus health factor) and **304494** (portfolio rebalance) share an owner,
carry a domain proof at a `.well-known/agent-registration.json` that resolves and declare themselves
hireable over ERC-8183 for 0.10 `$U`.

**The ownership of that second cluster was contradicted inside our own evidence base, so it was settled
before this section shipped.** `R12-agent-comms.md:99` calls those ids "our own domain from an earlier
lane" while `R02-erc8183.md:66` calls the same cluster a rival. R02 is right and the whole check is in
`decisions/02-thesis-brainonbnb-is-third-party.md`: no signer for
`0x73809F69916FcF7Ddc5BB1315fBdf96A569a5963` exists anywhere in this workspace, the earlier lane is a
read-only indexer with no deployment and no domain, `participations.md` plus `CONTENT-LOG.md` carry
nothing about that site; the site itself sells a meme token we have never shipped. So they are
third-party supply, they stay out of every first-party count and they do not need our permission to be
listed, because the registry is public and `createJob` names any provider address. Job 56712 from that
provider carried its whole deliverable inline as JSON whose `sha256` verified byte-exact, at status
`SUBMITTED` rather than `COMPLETED`, so it does not itself pass H6 clause (a) yet. We hire them at their
own published price, on mainnet, then publish what came back. A refusal is a publishable outcome too. One
caveat travels with them: `R02-erc8183.md` found agent 325479's provider address equal to its client
address on every job sampled, which is a self-hire rather than a market, so its record is shown that way
and weighted that way.

**S3. Registry-wide candidates from our own sweep.** The `indexer` sweeps ids 0 to `_lastId - 1` through
Multicall3 at a measured 183 agents per second, about 30.5 minutes and 0.27 GB for the whole registry. The
`classifier` assigns category contracts from declared skills first then text, recording `basis` and
abstaining rather than guessing. This is the candidate list in section 6 and it is where the coverage claim
lives. It reaches every agent in the four categories that exists, at whatever tier each one actually holds.

**S4. Operator onboarding, open from the first hour.** One path, one `agentId`, no invitation, no
allowlist, no attestation prerequisite. What is actually reachable on 2026-09-09 is `E0 Listed`, which
costs an operator nothing but a claim signature over an `agentId` they already control, then `E2 Proven`
the moment a job settles through us. `E1 Bonded` ships as published terms only. `OperatorBond` is
specified and deployed on no chain, so nothing holds a stake and it is not a rung anybody can stand on
this week (`05-ONBOARDING.md`, `09-DISPUTES.md`,
`three/decisions/05-onboarding-operatorbond-not-deployed.md`).
The conclusion survives that gap: an operator with no attestation, no exchange account and no capital can
still get a listing onto a shelf, because `E3 Attested` is a prerequisite for nothing on the path. Anything
that lands before the deadline lands on a shelf. Nothing in the plan depends on it, because four days is
not enough to schedule other people's time.

**S5. First-party reference agents, one per category, as the last resort.** Built by us, run by us,
labelled everywhere. They exist so that a shelf is never empty, so that the category contract has a
reference implementation a third-party operator can copy and so that the conformance suite has something
to assert against. Section 10 is the whole disclosure rule.

One more supply-side move that belongs here because it produces paid third-party outcomes without us
paying for them. `settle(uint256,bytes)` `0x39c2ebb9` lives on the ERC-8183 EvaluatorRouter
`0x51895229E12F9876011789B04f8698af06cCD6DA` rather than on the kernel, whose deployed bytecode does not
carry that selector. It is **permissionless**, verified again today: a staticcall from an unrelated
funded address returns `0x` on 11 of 11 sampled jobs whose 7-day window has elapsed. It reverts
`PolicyNotSet()` `0x32d53d69` on a job that was never registered. The `settler` component calls it the
moment a dispute window elapses, for any job, not only ours. That pays third-party providers for work they
already delivered.

**The settleable set and the bound on the run.** `inflightJobCount()` on the router reads 28,326 at the
time `R02-erc8183.md` read it, which is the router's own counter rather than a count of delivered work.
The delivered set is the 27,170 jobs at `SUBMITTED` in the full status census (Open 994, Funded 285,
Submitted 27,170, `research/SPINE.md`), because a job with nothing submitted has nothing to settle. Those
two do not reconcile: 994 plus 285 plus 27,170 is 28,449, which is 123 more than the counter at the same
`jobCounter`, so the counter and the per-job census disagree by 123 and we publish both rather than
picking one. In the 314-job recent capture, 124 are `SUBMITTED` and 104 of those have a 7-day window that
already elapsed, which is the shape of the backlog. The run is bounded rather than open ended: a cap on
jobs settled per run, published beside the count, at a measured 141,744 gas per `settle` and 0.05 gwei,
which is about 0.0000071 BNB each, so 1,000 settles costs about 0.0071 BNB and the whole in-flight set
would cost about 0.20 BNB (`cast estimate` today). The concentration carries into the output and it is
disclosed rather than smoothed: the address holding 99.0% of jobs dominates whatever the settler produces,
its jobs are settled like anybody else's, its record is weighted as a single-client record and open
question 5 still says its nature is unverified. Whether anybody else runs `settle` is **unverified**.
Absence of evidence is not evidence of absence. The honest statement is that the backlog above is sitting
unsettled today.

On hiring agents built by other teams in this same programme: we pay the price they published, we label
them as third-party supply, we rank them under the same formula as everything else, we publish only what we
measured and we say nothing about them we did not read from chain or from their own endpoint.
`R14-rivals.md` records that this already happens in the field, with one marketplace funding a BSC testnet
job for 0.001 `U` against an agent operated by another marketplace.

## 10. First-party supply and exactly how it is disclosed

`R14-rivals.md` names the pattern to avoid and it is the field's most common failure: fill a category with
your own agent, then report the shelf as coverage. The programme's own framing, "the submission is the
marketplace itself", is the reason a judge discounts it. We run first-party agents anyway, because a shelf
with nothing hireable on it fails Functionality and Agent Diversity together. So the disclosure has to be
structural rather than a note on an about page. Eight clauses, all of them mechanical.

**1. The label is derived, never stored, so it cannot be forgotten.** Our operator addresses are published
as a machine-readable list at a stable public URL and in the repo. Any listing whose `agent.owner` is in
that list renders as first-party. No new field enters the data model, which is deliberate: a flag someone
has to set is a flag someone can fail to set. (`15-SYSTEM.md` may materialise it for query speed. The
published list stays the source of truth.) The list holds exactly the addresses we can produce a signature
for, which is the test that settled the one ownership question in this evidence base
(`decisions/02-thesis-brainonbnb-is-third-party.md`). An address a research note calls ours does not get on
the list on the strength of the note.

**2. The label appears on every surface the listing appears on.** Shelf card, listing page, compare column,
search result, receipt page, `api` payload, `mcp` tool result and `/coverage`. A buyer never sees a
first-party row without seeing that it is ours.

**3. Every published count splits first-party from third-party and the third-party number is the
headline.** "Four categories, deeply covered" never quietly means "four categories we built". The report
page carries both columns for candidates, answering, hireable, settled jobs and turnover.

**4. Ranking carries no first-party term.** No term in the ranking function may read the first-party list.
The published parameter list makes that checkable from outside. `07-MATCHING.md` owns the
anti-favouritism rule plus how it is audited.

**5. A job we paid for ourselves is tagged `origin: house` at ledger append time, enforced by the ledger
rather than by a display rule.** Revenue and volume count `origin: order` only. House rows
render on the same public pages, visibly distinct. This is what stops a seeded shelf from inflating a
turnover figure.

**6. The commercial reason is stated, per agent, in the rulebook.** Each reference agent exists as a
reference implementation of its category contract, as the target the conformance suite asserts against and
as a floor price for the category. `10-DOCS-AND-POLICY.md` publishes that wording.

**7. Losses render as prominently as wins.** If a third-party agent outperforms ours on the category
metric, it ranks above ours and the shelf shows it. If ours refuses a job or delivers late, its record says
so.

**8. The ratio is a number we publish and want to fall.** First-party share of hireable rows per category
is on `/coverage`. It is the honest measure of how much of the marketplace is still us.

The sentence we will not write anywhere, in any form: a count of agents in a category that mixes our supply
with the ecosystem's.

## 11. What we deliberately do not build

Each of these is a position with evidence behind it, not a backlog item we ran out of time for.

**No aggregate star rating, ever.** The feedback graph measured in section 3 is 111 authors, 52.35% of all
rows sitting on 100 agents and not one financial outcome. A number computed over that is a number
pretending to be a signal.

**No custody of buyer funds.** The buyer signs, our submitter relays and the value moves peer to peer.
`R15-compliance.md` reads FinCEN FIN-2019-G001 as drawing the line at the venue that settles. Every token
we can settle in carries an issuer freeze: FDUSD and USD1 both expose `freeze(address)`,
`unfreeze(address)` and `frozen(address)`, with USD1 also exposing `reallocate(address,address,uint256)`
(`R15-compliance.md`). `$U` was never covered by that pass, so it was read directly for this section: its
EIP-1967 implementation `0xbef21313c69c009fd7d9510a8d3a481a32473dfc` carries `freeze(address)` `0x8d1fdf2f`,
`unfreeze(address)` `0x45c8b1a6`, `frozen(address)` `0xd0516650`, `pause()`, `unpause()`,
`mint(address,uint256)` plus `owner()`, by PUSH4 enumeration of its deployed bytecode. Live through the
proxy today: `frozen(address)` false for a probe address, `paused()` false, `owner()`
`0x59F94AdE4F881f21ea608AD4448bf70B78e37187`. It does not carry `reallocate`. So custody would add a
regulatory surface plus a freeze target on the settlement token for no product gain.

**No escrow kernel of our own and no dispute policy of our own on chain.** `setPolicyWhitelist` on the
ERC-8183 router is owner-only and we are not the owner, which is verified, so a custom policy is not
available at any price. The stronger answer is to index the official kernel, join its jobs back to agent
ids and run the permissionless `settle` for everybody. Building a parallel escrow beside a live one with
28,244 completed jobs would be a worse product with a longer explanation.

**No semantic search and no chat layer over the index.** 8004scan's semantic endpoint answers "watch my
Venus health factor" with three astrology agents: `Stellar_Moon_Pro.agent`, `AstroAgent.agent` and
`Astroify.agent`. Sweeping its `semantic_weight` across 0.3, 0.5, 0.8 and 1.0 returned byte-identical
result sets, so the knobs are inert (`R05-8004scan-api.md`). Its full-text search does work. We ship a
query grammar over facts we measured, because a filter that names its own predicate is checkable and an
embedding over agent names is not.

**No supply-side tooling.** No agent builder, no hosting, no key management for other people's agents, no
lifecycle control. BNB Agent Studio already ships the wallet, the runtime and the `bag` CLI.
`R14-rivals.md` found its unshipped Developer Dashboard sitting exactly there. We are the demand side,
which is the half that is empty.

**No token, no points and no airdrop.** The only trustworthy signal we have is a job somebody paid for.
Paying people to generate that signal destroys it. Every anti-gaming rule downstream would then be
fighting our own incentive.

**No Greenfield and no opBNB in this entry.** Greenfield billing behaviour is **unverified**, including
whether a dry payment account deletes data, which is precisely the risk you cannot carry on evidence that
has to survive until 2026-11-05. `11-BNB-STACK.md` owns the full argument and the what-we-would-do-next.

**No social layer.** Stars, follows and view counts already exist on the incumbent explorer. None of them
is evidence that an agent did a job.

**No second chain.** A rival index already covers 32 chains. We are judged on BSC. Our verification story
is BSC-specific down to the token decimals, so breadth here would cost depth in the four categories.

**No mock data, no seeded numbers and no placeholder rows.** An empty state is empty and says why.

## 12. What ships by 2026-09-09 and what is documented as next

No time of day is published for the close, so the working deadline is 2026-09-09 00:00 UTC with everything
green before 2026-09-08 ends. That reading is a decision recorded in `00-PROGRAM.md`, not a quotation.
`15-SYSTEM.md` owns the build order, the hour-by-hour cut line and the test plan. This section owns the
line between what the submission claims and what it defers.

### Ships

| Area | In the submission |
| --- | --- |
| Index | `_lastId` read with its block on screen, full id sweep 0 to `_lastId - 1` through Multicall3, `resolver` handling every tokenURI shape behind the SSRF guard, duplicate collapse on the tokenURI content hash, a second index as cross-check with each source's lag rendered |
| Liveness | `prober` on a schedule, T0 to T3 per listing, the six failure classes kept separate, DNS, TLS, HTTP status, latency and our own timestamp stored per probe, probe history per agent |
| Categories | four category contracts, `classifier` with `categoryBasis` and abstention, four shelves generated from one template |
| Buyer surface | `land`, `shelf` x4, `listing`, `compare`, search with the query grammar, `hire`, `receipt`, `/coverage`, `report`, `status`. No wallet, login or email to browse. Every empty state names its reason |
| Machine surface | `api` with no auth and paged reads, `mcp` with tool names that collide with neither 8004scan's nor a rival's |
| Hire | `broker` plus an in-process `facilitator`: x402 v2 challenge, the brokered hire as two EIP-3009 typed-data signatures (price to `agentWallet`, fee to the treasury, each disclosed before acceptance), no transaction from the buyer, our submitter pays gas for both, receipt published. The single-signature zero-fee direct path ships too, labelled as what it is |
| Escrow | `escrow-index` over the official ERC-8183 kernel joined to agent ids, at least one settled testnet job on the 900 s window as the escrow proof that closes inside one sitting, `settler` running against the router under a published per-run cap. The mainnet funded job is conditional: the kernel pays only in `$U` and mainnet `$U` has to be bought, so it needs an operator funding decision (about 0.4 `$U` covers four categories at 0.10 each, plus gas). The route exists and was checked: the PancakeSwap v3 0.01% `$U`/USDT pool `0xA0909f81785f87f3e79309F0E73A7d82208094E4` held 11,313,040.02 `$U` against 9,706,504.98 USDT at block 120,156,766, which is the pool row in `SPINE.md` rather than a second read |
| Evidence | `ledger` with `origin` enforced at append and a public `walk()`, `evidence-store` holding the bundle parts content-addressed on our own disk, `quality` scores from settled jobs only with interval and sample size, receipts recomputable from a published command |
| Data series | `sampler` on the pools and accounts the four categories cover. The series starts the day it is deployed, so the 7-day window is partial at submit and every field it feeds renders `06-QUALITY.md`'s `not-measured` state until the first sample lands |
| Validation Registry | one real `validationRequest` plus one real `validationResponse` on BSC mainnet carrying a decision, which is the first use of that registry as far as we measured (`06-QUALITY.md` owns it, `09-DISPUTES.md` ships the pair) |
| Altana | four agent wallets on **mainnet**, one session each with a call allowlist, a spend cap and an expiry, registered in the mainnet Keystore, at least one live session-signed transaction per category in their explorer, `session-panel` reading allowlist, cap, expiry and revoke state from chain on every render with a working Revoke, every wallet address plus every session `keyId` in the submission. Testnet is used only for the settlement loop and is labelled. Two dependencies are **unverified** (`research/SPINE.md`): whether `@altananetwork/sdk` 0.9.0 works against `@bnbagent/sdk` 0.5.5, which pins 0.7.1, plus the Porto `SpendInfo` field names at positions 3, 4 and 5, which were all zero on the wallet sampled. Fallback if either fails: the buyer calls are written against the deployed ABI, then the panel renders the allowlist, the expiry and the revoke state from chain with the cap shown as an explicit unknown rather than a number we cannot decode |
| TermiX | the Agent Advantage Report as an eligibility gate: at least three real tasks, each run with an agent hired through Muster and without one, time, cost and output quality, the actual outputs attached, at least one task from trading, stock or security |
| PancakeSwap plus Venus, Lista, Aave | the four category data paths read from their own contracts at a pinned block, with the units and the source call stored beside every stored rate |
| Compliance and licence | wallet screening at write time, the rulebook set, the source-available no-derivatives terms in the bytes, `NOTICE`, a quotable grant per third-party source, the AI disclosure, the repo public with every cited URL fetched anonymously |

### Documented as next and never presented as shipped

| Deferred | Why |
| --- | --- |
| B402 as the facilitator | its authenticated base URL, its real signer and spender addresses and its BSC settlement token are all **unverified** and unpublished. Credentials need manual review per environment. The facilitator sits behind one interface so it swaps in later |
| `E1 Bonded` with real slashing | needs money at risk plus a dispute path with teeth. The tier is published, `OperatorBond` is specified and deployed on no chain, so nothing holds a stake by 2026-09-09 (`09-DISPUTES.md`, `three/decisions/05-onboarding-operatorbond-not-deployed.md`) |
| A third-party validator on the Validation Registry | the registry is deployed at `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58` at `getVersion()` `2.0.0` and nobody has used it on BSC. We write the first request and response pair ourselves, which ships. Somebody else's validator answering for a listing needs a validator that exists |
| A dispute panel beyond published policy | at this scale the decider is us, under a published rule, with the transition to a panel designed in `09-DISPUTES.md` |
| Greenfield as the evidence backend | billing behaviour unverified, including whether a dry payment account deletes data. The `evidence-store` itself ships, content-addressed on our own disk, so what is deferred is where the bytes live rather than whether they are kept |
| The mainnet ERC-8183 funded job, if the `$U` funding decision does not land | the testnet settled job is the escrow proof either way. `R02-erc8183.md` records that the weighting between a mainnet FUNDED job and a testnet COMPLETED job is a judgement call rather than a documented rule, so this is a strength question rather than an eligibility one |
| Ranking holdout instrumentation, richer exploration | the selection policy that ships is `07-MATCHING.md`'s call. Measuring the causal lift of our own ranking is next |
| Our own `IACPHook` or evaluator | available, since the kernel enforces only ERC-165 on the hook. Taking it means leaving the optimistic settlement path. Worth knowing, not worth doing for this entry |
| Operator onboarding at scale, notifications, i18n, SLA credits, insurance | `14-GAPS.md` owns the list, the minimum version of each and the ranking by what a first real buyer hits |

### The honesty clause on the ship line

If a shelf has no hireable row by the deadline, it ships with its candidate list, its three counts and the
named failure per candidate. It does not ship with a fabricated row, a mock price or a number we did not
measure. If the first-party share of hireable rows is high, `/coverage` says so in the column that
tracks it.

Six things are re-read the day the submission goes out, because they move on their own: the agent count
from `_lastId`, the ERC-8183 job and settlement totals, 8004scan's own status and freshness, the settlement
token's implementation address plus its EIP-3009 and freeze selectors (all three tokens are proxies with
live admins), the rival check for a settled mainnet ERC-8183 job, plus a live-web rival pass that does not
depend on a public repo, since `R14-rivals.md`'s census is a GitHub query and `brainonbnb.com/registry` is
the proof that a shipped product can sit outside it. `01-GROUND-TRUTH.md` carries the re-read table.

## Decisions and rejected alternatives

| Decision | Rejected alternative | Why |
| --- | --- | --- |
| The unit of the marketplace is a completed paid job | reachability as the unit, an agent that answers a probe | probing appears in at least eight independent rival builds (`R14-rivals.md`), it proves a web server rather than a service, the rubric's journey ends at "activate it" and a paid job is the only BSC signal that cost somebody money to create |
| The hireable bar includes a settled job (H6), not just conformance | gate on conformance and reachability, then let the market decide | conformance proves an agent could be paid. H6 proves one was. 28,244 ERC-8183 jobs already reached `COMPLETED`, so a third-party agent passes H6 without our money wherever the job attributes its work to an agent id. Where the attribution is missing the row is `unattributable` rather than passed |
| Rows that fail the bar stay `indexed`, searchable and annotated | hide them so shelves look clean or mix them into the shelf | hiding voids the coverage claim over the whole registry. Mixing makes a shelf position mean nothing. The candidate list with a named failure per row is the honest form of both |
| Muster | a descriptive name of the `bnb-agent-marketplace` shape | fourteen rival repositories hold that exact name, four are a form of `mandate` and three of `assay`. A judge scanning titles merges them |
| Read the chain first, treat every index as a cross-check with its lag on screen | 8004scan as the primary index, since it is the sponsor's and a Pro tier is on offer | its BSC indexer read `status: down` with a 32-hour-stale checkpoint, 31,474 agents short of chain on its list endpoint's `total`, 20.8% then 56.7% non-200 in two windows. A rival's landing page was visibly broken from exactly that dependency while `R14-rivals.md` read it |
| First-party reference agents exist, one per category, as the last supply source | no first-party supply at all | 0 of 600 sampled agents are payable by a stranger and the four categories hold about 518 agents at 0.17%, so some shelf would have nothing hireable on it, which fails Functionality and Agent Diversity together |
| The first-party label is derived from `agent.owner` against a published address list | a stored `firstParty` flag on the listing | a flag someone has to set is a flag someone can fail to set. Derivation cannot drift and adds no field to the model |
| Settle in `$U` over EIP-3009 through our own submitter, with FDUSD and USD1 configured | price in USDT because that is what buyers hold; or wait for a hosted facilitator | on BSC, USDT supports neither EIP-3009 nor EIP-2612, nor does Binance-Peg USDC, nor does BUSD (`VERIFIED-payment-rail.md`). The public x402 facilitator does not cover `eip155:56` at all. Note the provenance: `$U`'s EIP-3009 support is verified by `R04-bsc-tokens.md`, `R16-reuse.md` and `R06-altana.md` rather than by `VERIFIED-payment-rail.md`, which never tested it. `08-MONEY.md` owns the final rail and the USDT fallback path |
| Index and settle the official ERC-8183 kernel | deploy our own escrow with our own policy | `setPolicyWhitelist` is owner-only and we are not the owner, which is verified. A live kernel with 28,244 completed jobs plus a `settle` we verified is permissionless today is a better product and a shorter explanation. Whether anybody else calls it is unverified |
| The `settler` runs for anybody's job, under a per-run cap | settle only our own jobs | settling for everybody produces paid third-party outcomes we did not pay for, which is the only supply source that costs us nothing but gas at 141,744 gas a call. The cost is concentration: the address holding 99.0% of jobs dominates the output and its nature is unverified, so its record is weighted as a single-client record and the cap plus the gas budget are published beside the count |
| A hireable verdict expires after 15 minutes at render time | a cached verdict; a window tied to the probe interval | a cached verdict is exactly the defect we criticise in the incumbent index, where `endpoint_last_checked_at` sat at 2026-05-20 through a verification that demonstrably ran while `health_score` read 100.0 (`R05-8004scan-api.md`). Tying the window to the probe interval would let a slower schedule silently loosen the guarantee, so the window is fixed here and `05-ONBOARDING.md` may tighten it, never loosen it |
| List and hire other teams' agents at their published price, under the same formula | exclude programme rivals from our shelves | the registry is public, `createJob` names any provider address and `R14-rivals.md` records the practice already happening in the field. Excluding them would shrink real supply to protect a ranking we claim is neutral. The guardrail is the third-party label plus saying nothing about them we did not measure |
| Four shelves from one template, work sliced across all four | one deep flagship category plus three thin ones | "Single-category submissions score poorly. All four, equally deep, is the bar." Each category also needs its own verified data path, so depth cannot be copied sideways later |
| No aggregate rating, ever | a five-star average, because buyers expect one | 111 addresses wrote all 29,712 BSC feedbacks, the top 100 agents hold 52.35% of them and 0 of 950 sampled rows score a financial outcome |
| A query grammar over measured facts | semantic search over the index | 8004scan's semantic endpoint answers "watch my Venus health factor" with three astrology agents. Its weighting knobs produced byte-identical results across a sweep (`R05-8004scan-api.md`) |
| Settled turnover per category over a stated window is the headline number, with the agent count as the denominator beside it | lead with the agent count, as every rival does | the agent count is the denominator behind the discoverability problem BNB Chain's own brief names, not an achievement. Turnover reframes the product from directory to market. `R02-erc8183.md` shows why any volume figure must carry its window plus its per-provider split |

## Open questions

- **Will a third-party agent actually answer a real mainnet hire from us inside the build window?** Two of
  them publish a price of 0.10 `$U` and 0.25 `$U` with live endpoints (`R02-erc8183.md`). Settled by
  sending one at the published price, then publishing whatever comes back including a refusal or silence.
- **Any weighting between the three criteria.** Unknowable: the Weight column on the live page is empty. No
  surface in this design is traded against another for that reason.
- **What Phase 2 assesses.** Printed `[REDACTED]`. Nothing can be tuned for it, so the defence is a
  submission that is complete rather than optimised.
- **Whether judges read the repository at all.** All three published criteria are properties of the running
  site. The repo still ships public with its licence and its attributions.
- **Whether the address holding 99% of ERC-8183 jobs is one operator or a platform router.** Unverified. The
  ranking treatment of a provider record differs depending on which. `06-QUALITY.md` needs the answer or a
  rule that holds either way.
- **Whether B402 credentials can be obtained before 2026-09-09.** Unverified, with manual review per
  environment and no published turnaround. The facilitator interface is built so the answer changes nothing
  structural.
- **Whether 8004scan's BSC indexer recovers during judging.** Nothing we serve blocks on it. Its state is
  rendered either way, which is the only posture that is honest in both cases.
- **Where the Agent Advantage Report is filed.** Unverified, no channel is named on either page, so it ships
  as a public URL inside the submission and as a file in the repo.
- **What the first-party share of hireable rows will be per category at submit.** Measured on `/coverage`
  rather than predicted here.
- **Whether a 15-minute probe freshness window is right for a two-week judging window.**
  `05-ONBOARDING.md` may tighten it. Loosening it would let a stale pass hold a shelf position, which is the
  exact defect we criticise in the incumbent index.
- **Whether hiring another team's agent during the same programme draws an objection.** Nothing in the rules
  we read addresses it. We pay the published price, label the supply as third-party and publish only what we
  measured.
- **Whether mainnet `$U` is acquired before 2026-09-09.** The ERC-8183 kernel takes one token
  (`0xcE24439F2D9C6a2289F741120FE202248B666666`) and no research file named a mainnet source, so `SPINE.md`
  now carries one: the PancakeSwap v3 0.01% `$U`/USDT pool held 11,313,040.02 `$U` against 9,706,504.98 USDT
  at block 120,156,766, which makes about 0.4 `$U` for four categories a trivial swap. It still needs
  an operator funding decision, because real money is not ours to move. `$U`'s issuer, peg and redemption
  stay **unverified** either way (`research/SPINE.md`), which is a reason to hold minutes of exposure rather
  than days.
- **Whether `@altananetwork/sdk` 0.9.0 works against `@bnbagent/sdk` 0.5.5.** Unverified: the official SDK
  pins 0.7.1 and validates vendor types at that pin, while 0.9.0 changed the testnet policy address. Settled
  by running the pair end to end before the first hire. The fallback is 0.9.0's seller side with the buyer
  calls written against the deployed ABI, which is also why the Porto `SpendInfo` positions being unverified
  cannot break the panel: an undecodable cap renders as an explicit unknown.
