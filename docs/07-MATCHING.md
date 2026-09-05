# 07-MATCHING: from one intent to one settled job

Written 2026-09-05. Build closes 2026-09-09 UTC+0.

This document owns the `matcher`: everything between a buyer wanting work done and one agent being
handed that work, plus what happens when the agent chosen does not deliver. It settles the pipeline,
the hard constraints, the ranking function with its published weights, the selection policy, the
exploration slot, failover, multi-agent jobs, buyer override, the explanation a stranger reads and
the rule that stops our own agents winning by default.

Boundaries, so nothing is written twice. `06-QUALITY.md` owns the Muster score and we consume
`musterScore`, `scoreLowerBound` and `scoreSampleSize` without restating the formula.
`03-TAXONOMY.md` owns the four category contracts and we consume `inputSchema`, `outputSchema` and
`contractVersion`. `04-AGENT-PROTOCOL.md` owns the wire and the job state machine, so we cite the
patterns and set the clocks. `08-MONEY.md` owns the rail and the exact bytes a buyer signs, so we
say which rail a failover needs and never how the signature is built. `09-DISPUTES.md` owns the
dispute lifecycle. `15-SYSTEM.md` is the only document that may extend the spine's field list, so
every record below is expressed as a `ledgerEntry` body rather than as a new collection.

Two measured facts shape every decision in here, both from `research/MEASUREMENT.md` at block
120,027,164 (2026-09-05T02:02:32Z). Of 600 uniformly sampled BSC agents, **12 reach T2
machine-callable** (2.00%, 95% interval 1.15 to 3.46) and **0 reach T3 payable by a stranger** (95%
interval 0 to 0.64). And 4,406 agents out of 334,935 carry any ERC-8004 feedback at all, 1.32%, from
111 distinct authors chain-wide, of which 0 of 950 sampled rows tag a financial outcome. So a matcher
built on declared capability or on foreign reputation has nothing to stand on. Ours stands on what we
probe, what we settle and what we pin to a block.

## 1. The pipeline

Eight stages. Each one has an input, an output, a budget and a named failure. The budgets are
design budgets and not measurements.

| # | Stage | Input | Output | Budget | On failure |
| --- | --- | --- | --- | --- | --- |
| 1 | intent capture | a buyer action | one complete intent | none, it is a form | refuse to proceed with an incomplete intent |
| 2 | eligibility filter | intent, our index | eligible set plus a reason code per exclusion | p95 under 150 ms, index only | empty set, explain, offer the nearest relaxation |
| 3 | static feasibility | eligible set | feasible set, one pinned block | one or two `aggregate3` calls | exclude with `session_insufficient` or `rail_unavailable` |
| 4 | ranking | feasible set | ordered shortlist, top K = 5 | p95 under 50 ms | never fails, it is arithmetic |
| 5 | live feasibility | shortlist | quoted candidates | 3 s, K in parallel | drop the candidate, keep its place in the log |
| 6 | selection | quoted candidates | one chosen listing plus an ordered failover chain | under 10 ms | one candidate means a deterministic pick |
| 7 | dispatch and failover | chosen listing | a job in a terminal state | the intent's `needBy` | walk the chain, at most 3 attempts |
| 8 | settle | terminal job | outcome, ledger closure, quality feed | rail dependent | the escrow trap in section 6 |

No stage gates on a third-party index. Stages 2, 3, 4 and 6 read our own `index` plus the chain, so the
only external dependency anywhere in the pipeline is the candidate agent itself at stage 5, capped at 3 s
and dropped with `quote_timeout`. On 2026-09-05
the 8004scan chain-56 indexer reported `status: down` with a canonical checkpoint 32 hours old and
`total_agents` of 304,281 against 334,935 on chain. Its read reliability measured 20.8% then 56.7%
non-200 across two windows (`R05-8004scan-api.md`, `SPINE.md`). Enrichment from it is displayed
with its own freshness stamp and is never a gate.

Every pass pins one block number and every chain read in that pass uses it. `R09-bsc-defi.md` is the
reason: an unpinned Venus recompute disagreed with the chain by 2.9e16 wei on both liquidity paths,
an identical offset that looked like a formula error and was six blocks of drift at 0.45 s per block.
The pinned block goes in the decision record and in the panel.

### Stage 1, intent capture

One intent shape serves both doors. The shelf door is a buyer pressing hire on a listing, which fixes
the category and the listing and leaves only the job inputs. The category door is a buyer arriving at
a shelf with a job and no agent in mind, which fixes the category and leaves everything else.

An intent carries: the `category` slug (exactly one of `rebalancing`, `grid`, `yield`,
`health-factor`), the category contract's required inputs at the declared `contractVersion`, a price
ceiling as `{amountBase, token, decimals}`, a `needBy` in seconds, a redundancy count defaulting to 1,
the buyer address, an optional named `listingId` for an override and an optional
already-signed-session constraint. Nothing else.

Two rules on capture. Free text never becomes a category silently: the `classifier` proposes and the
buyer confirms, because the classifier abstains rather than guessing and records its `basis`
(`SPINE.md`). And the intent is frozen before a quote is requested, because a quote is signed over the
request and `quote.negotiationHash` binds to it.

The zero-knowledge path the Functionality criterion asks about is this stage with every field
defaulted except the shelf's own category. A buyer who has never heard of Agent Studio presses hire,
gets one agent, one price and one explanation and never sees the word intent.

### Stage 3, static feasibility and stage 5, live feasibility

Eligibility asks whether the listing record permits this job. Feasibility asks whether this agent can
actually do it now. Splitting it in two is a deliberate ordering choice: the cheap half runs before
ranking so a hopeless candidate never gets ranked and the expensive half runs on the top K only,
because probing 47 agents to hire one costs the buyer's deadline and is rude to 46 operators.

**Static feasibility, before ranking.** All of it is our own index plus one batched chain read.
Multicall3 at `0xcA11bde05977b3631167028862bE2a173976CA11` takes 1,500 sub-calls in one `eth_call`
and 2,500 hits the 30 s node timeout (`SPINE.md`), so a whole category's candidate set fits in one
call.

| Check | The read | Fails with |
| --- | --- | --- |
| the job's inputs validate against `inputSchema` at the listing's `contractVersion` | local | `input_schema_mismatch` |
| declared duration fits the deadline | `expectedDurationSeconds` per skill (`R12-agent-comms.md`) against `needBy` | `duration_over_deadline` |
| the agent's session allows the calls this job needs | `canExecutePackedInfos(bytes32)` `0xe5adda71` on the agent's own wallet, plus `isValidKey` `0x8fd4f06b` and `getExpiry` `0x3b49ad47` on the Keystore (`R06-altana.md`) | `session_insufficient` |
| the session's spend cap covers the job's worst case | `spendInfos(bytes32)` `0xdcc09ebf`, word 0 token, word 1 period enum, word 2 limit in raw units | `cap_below_worst_case` |
| the session expiry is beyond the job's expected end | `getExpiry` | `session_expires_first` |
| a rail exists that this buyer can pay | `08-MONEY.md` resolves the pair, the matcher only reads the verdict | `rail_unavailable` |

The session checks are worth their cost twice over. They are the difference between a listing that
claims a bounded mandate and one that has a readable one. Requirement 3 of the Altana track is that
integration is read on chain rather than from the pitch (`00-PROGRAM.md`). A candidate whose
session cannot cover the job is excluded before it can fail in front of a buyer.

**Live feasibility, after ranking, top K = 5 in parallel.** One quote request and one 402 challenge
per candidate. A quote counts as feasible when `signerRecovered` equals the provider and
`signerMatchesProvider` is true, the price is at or under the ceiling and `expiresAt` leaves enough
room to dispatch. `R02-erc8183.md` records the official SDK capping quote TTL at 900 s and the job
description carrying `quote_expires_at`, so 900 s is the outer bound on how long a selection may sit
before it is stale. A candidate that does not answer inside 3 s is dropped from this intent with
`quote_timeout` and keeps its row in the decision record, because a silent drop is how a ranking
becomes unauditable.

### Stage 8, settle and close

Most matchers stop at dispatch and leave the ending to the payment layer. The intent is what the buyer
opened, so the intent is what has to end, which makes this stage ours.

**Four terminal states and every intent reaches exactly one.**

| Intent state | Reached when | The job behind it | Charged |
| --- | --- | --- | --- |
| `delivered` | one leg produced a deliverable that recomputes | `completed` | the price of that leg. Nothing where the settle itself failed (6.4 rule 7) |
| `refused` | a leg answered a structured refusal naming a declared condition | `refused` | nothing, unless the card declared a partial |
| `exhausted` | the chain reached its attempt limit with nothing delivered | `failed`, `expired` or `voided` per attempt | nothing |
| `blocked` | we stop before any dispatch: an empty eligible set, a `buyerFault`, a screening hit | no job exists | nothing |

The job column is `04-AGENT-PROTOCOL.md`'s lifecycle, unchanged. The intent's state is about the work and
the `payment` row's state is about the money, which is why `delivered` rather than `settled` is the name:
that document makes settlement a sub-state with three values rather than a boolean. The two questions
resolve on different clocks. A delivered leg whose deliverable then
fails conformance is still `delivered` here, with a `dispute` row hanging off the job (6.4 rule 6). The
intent never reopens.

**What closes the ledger.** One `dispatchDecision` entry per intent, appended at stage 4 and never
amended. On a settled payment, the two entries the hire flow already appends, `payment.principal` and
`payment.fee` (`15-SYSTEM.md`). On every other ending, one `intentClosed` entry naming the terminal state,
each attempt's fault class and `amountBase` `"0"`. All three are `kind` values on `ledgerEntry`, so
stage 8 stores no new object.

**A refusal receipt is not a `receipt`.** SPINE's `receipt` carries `txHash`, `blockNumber` and a
`recomputeCommand`. Only a `completed` job produces one (`04-AGENT-PROTOCOL.md`). So the page 6.7
promises is the `intentClosed` entry rendered: the pinned block, one row per attempt with its fault
class, the total charged, then the transaction hash where anything was broadcast at all. There are no null
receipt
fields, because no receipt row was written.

**Where the intent itself lives.** Nowhere new. `15-SYSTEM.md` places the decision record and adds no
intent collection, so the frozen intent is the body of that `dispatchDecision` entry. Its non-identifying
fields are published: `category`, `contractVersion`, the ceiling, `needBy`, the redundancy count and the
named `listingId` where the buyer set one. The buyer address is not in it (9.1 has the reason) and the
`entryHash` covers the whole body either way.

The settle lock, the `pending` branch and what a failed settle does to the buyer and to the agent are all
in 6.4, because they only bite when a chain is walking.

## 2. Eligibility as hard constraints

Five families. Every one is a boolean with a named reason code, computed from the listing record and
the chain, never from a score. One code per distinct condition rather than one per family, because the
panel counts by code and the decision record stores the code, so a family with five conditions and one
code cannot say what happened. Soft preferences belong in the ranking function in section 3 and never
here. `R13-prior-art.md` verified that split running in production: a price ceiling blocks the request
outright while throughput and latency preferences only deprioritise and are documented as no
guarantee.

**Family 1, category contract.** Five conditions, five codes. `listing.category` equals the intent's slug
or `category_mismatch`. `contractVersion` is one the intent was formed against or
`contract_version_unsupported`. The `conformance` suite passed every assertion for that category
contract at that version or `conformance_failed`. `visibility` is exactly `live`, else `not_live`, so
`indexed`, `suspended` and `delisted` never dispatch. And `categoryBasis` is `declared` or `probe`: a
listing whose only claim on a category
is `text`, our own reading of its prose, is `category_unconfirmed` unless the buyer explicitly opens the
unconfirmed set. Dispatching on our own guess about what an agent does is how a buyer gets an agent
that cannot do the job. The classifier records `basis` precisely so this rule is enforceable.

**Family 2, price ceiling.** A quote above the ceiling is `over_ceiling`. Compared in base units, never in
a display string, with `priceDecimals`
read rather than assumed. Every BSC stablecoin in play is 18 decimals (`VERIFIED-payment-rail.md`), so
a constant carried from a 6-decimal chain is wrong by a factor of a trillion and the comparison is the
place it would bite. Same-token comparison is exact. Cross-token comparison happens only where a
verified on-chain mark exists for that token, which today means a token with a listed Venus market
read through `ResilientOracle.getUnderlyingPrice(vToken)` at `0x6592b5DE802159F3E74B2486b091D11a8256ab8A`,
scaled `1e(36 - underlyingDecimals)` (`R09-bsc-defi.md`). Where no such read exists the listing shows
"quoted in `<token>`, not converted" and sits outside the hard ceiling until the buyer opts in. The
reason is the honesty floor rather than caution: `$U`'s issuer, peg and redemption are unverified
(`SPINE.md`), so a silent 1:1 conversion would be an unverified external fact presented as settled.

**Family 3, liveness.** `reachabilityTier` at least **T2**. Below that is `tier_below_t2`. T1 is a host that
resolves
and answers 2xx,
which 230 of 600 sampled agents do. T2 is a machine-callable surface, which 12 do
(`MEASUREMENT.md`). The gap between those two numbers is the whole reason a status code is not
liveness: `evoevo.ai` returns HTTP 200 with `text/html` and 74,239 bytes for both well-known paths, so
a checker that tests `status == 200` marks a single-page app as a verified agent
(`R12-agent-comms.md`). On top of the tier, two clocks. `lastProbe` inside 15 minutes or the listing is
excluded with `probe_stale` until the `prober` returns. And a failure inside the last 30 seconds
demotes rather than excludes, while three consecutive probe failures spanning at least 90 seconds
exclude with `probe_failing` until one probe passes. `R13-prior-art.md` verified both halves of that
shape in production, a 30 second outage memory and endpoints moved to the end of the list rather than
excluded entirely.

**Family 4, compliance.** Both sides screened, at write time, with the verdict recorded. The on-chain
read is `isSanctioned(address)` selector `0xdf592f7d` on the Chainalysis oracle at
`0x40C57923924B5c5c5455c48D93317139ADDaC8fb`, free as an `eth_call` and about 3,694 gas over base
inside a transaction (`R15-compliance.md`). It is not sufficient on its own and we say so where we show
it: of 91 EVM-format SDN addresses the oracle flags 57 while 20 of the 42 active on BSC are not
flagged, so `screening` runs our own SDN ingest alongside it and either hit refuses the dispatch with
`screened`. Chainalysis disclaims accuracy in its own docs, which is another reason the oracle is one
input rather than the answer.

Compliance also constrains the ranking function itself, which is the part a matcher usually gets wrong.
`R15-compliance.md` reads the operative test out of two primary texts. MiCA Art 3(1)(24) defines advice
as "personalised recommendations to a client ... in respect of one or more transactions relating to
crypto-assets, or the use of crypto-asset services" and that tail covers recommending which service to
use. MiFID II's delegated regulation 2017/565 Art 9 makes a recommendation personal when it is made to
someone in their capacity as an investor and is either "presented as suitable for that person" or "based
on a consideration of the circumstances of that person", with recital 14 giving the safe side: "Advice
about financial instruments addressed to the general public should not be considered as a personal
recommendation." Both limbs true means advice. Either false means it is not.

So the matcher's function signature is a compliance boundary. It takes the listing record and the shape
of the job. It never takes the buyer's holdings, positions, portfolio value or risk profile. The buyer's
address goes into the **job inputs** for a health-factor read, never into the **rank**. Ranking on
predicted financial outcome for this buyer would make the second limb true. The ranking criteria are
published for everyone rather than tuned per person, which keeps it inside shape 2 of
`R15-compliance.md`'s four permitted output shapes, a comparison on stated criteria addressed to
everybody who loads the page.

One more rule from the same section, the one that decides our revenue design here rather than in
`08-MONEY.md`: **no operator payment can move position, in v1, at all.** UCPD Annex I point 11a makes
undisclosed paid ranking unfair in all circumstances (`R15-compliance.md`) and P2B Art 5(3) requires a
platform where money can move ranking to describe those possibilities and their effects
(`R13-prior-art.md`).
Rather than write that disclosure we remove the fact it would disclose.

**Family 5, capacity.** Two limits. The agent's and ours. An agent at its declared concurrency limit is
ineligible with `at_capacity` until a slot frees. A listing that declares no limit is capped at 3
in-flight jobs, so one operator's agent cannot absorb a whole shelf and then fail all of it. Being busy
is not being worse, so load never enters the merit ranking. It enters the selection draw in section 4.
Our own limits sit with the `api` and the `prober` (`14-GAPS.md` owns rate limiting) and the only rule
that belongs here is that a capacity check never calls a third party.

**The pair blocklist.** A buyer and an agent that already produced a terminal failure or an upheld
dispute for that buyer are blocked with `blocked_pair`, per buyer rather than globally. The buyer can
override it. `R13-prior-art.md` verified the production version of this, a marketplace blocking a
pairing where either party previously gave the other a one-star rating. It is one table and it prevents
the worst repeat match.

**The self-dealing block.** A dispatch is refused with `self_dealing` when the buyer address and the
agent's payout address
sit in the same funding cluster, using the published one-hop heuristic from `R13-prior-art.md`:
`funder(buyer) == provider` or `funder(buyer) == funder(provider)`, with more than 25 such events marking a
habitual pattern, which is `06-QUALITY.md` section 6.1's own spelling of the test. `06-QUALITY.md` zero-weights the feedback from such a counterparty. The matcher goes
further and blocks the dispatch, because a self-dealt job would otherwise buy the agent a real settled
job count, which is the one number the whole ranking trusts. The attempt is recorded rather than
dropped, because deleting it would look like suppression under the filtering rule the same file quotes.

Every reason code above is shown to the buyer as a count with an example, never hidden. The panel line
reads "9 listings excluded: 4 over your ceiling, 3 not machine-callable, 1 stale probe, 1 at capacity".
A filter that cannot show its work is indistinguishable from an empty shelf.

## 3. The ranking function

Six terms, each on [0, 1], weights summing to 1, computed only from the listing record and the job
shape. The weight vector is versioned and published.

```
rank_i = 0.30 * Q_i + 0.25 * R_i + 0.15 * C_i + 0.15 * P_i + 0.10 * F_i + 0.05 * E_i
```

Candidates split into two partitions before sorting: everything not demoted, then everything demoted.
A demoted candidate sorts after every non-demoted candidate whatever its rank, which is how a
30-second outage memory expresses itself without excluding anybody.

| Symbol | What it is | Where it comes from | Why it is in here |
| --- | --- | --- | --- |
| **Q** | delivered quality, `scoreLowerBound` for this agent in this category, divided by 100 because `06-QUALITY.md` publishes it on a 0 to 100 scale | `06-QUALITY.md`, settled jobs only, shrunk toward the category prior, time decayed | a settled paid job is the only signal that survives contact with a faked one |
| **R** | measured reliability, the Wilson lower bound of probe passes over 24 h, multiplied by the fraction of conformance assertions passing at the current `contractVersion` | our own `prober` and `conformance` | at launch it is the only term with real data, because we generate it |
| **C** | category contract fit, the fraction of the contract's optional outputs the listing actually produces at the buyer's precision | `03-TAXONOMY.md` contracts, per-category signals below | it makes four-category depth a property of the matcher and not only of the UI |
| **P** | price value, `1 / (1 + p_i / p̃_c)` where `p̃_c` is the median eligible price in that category, same token, base units | the quote | price is the one number a buyer verifies alone, so it belongs in the order they see |
| **F** | evidence freshness, `exp(-age / 900)` on the probe age in seconds | `listing.lastProbe` | a stale liveness claim is a guess and Data Quality is a published criterion |
| **E** | evidence tier, E0 0.00, E1 0.25, E2 0.50, E3 0.75, E4 1.00 | the ladder in `SPINE.md` | E4 means a buyer can read and revoke what the agent may spend, which is a real risk reduction |

Q uses the **lower** bound rather than the point estimate and that single choice does most of the
anti-gaming work in the ranking. `R13-prior-art.md` gives the measured behaviour of the canonical
published Wilson form: 2 of 2 perfect scores 0.3424, 5 of 5 scores 0.5655, 45 of 50 scores 0.7864 and
900 of 1000 at the same 90% ratio scores 0.8798. An agent with one lucky job cannot leapfrog an agent
with a record. Honesty about a small sample costs nothing because the interval already prices it.

R is the same arithmetic over our own probes:

```python
# lower bound of the Wilson score interval, z = 1.96 for 95 percent, 0 when n == 0
def wilson_lower(pos, n, z=1.96):
    if n == 0: return 0.0
    p = pos / n
    return (p + z*z/(2*n) - z*math.sqrt((p*(1-p) + z*z/(4*n))/n)) / (1 + z*z/n)
```

**R's conformance multiplier is inert most of the time and that is deliberate.** Family 1 excludes any
listing that has not passed every assertion at the version the intent was formed against, so outside one
case the fraction is exactly 1 and R is the bare probe bound, which is what the worked example prints.
The case where it moves is a major contract bump: `03-TAXONOMY.md` keeps a row on the shelf during the
14-day notice window with a `v1` chip while `v2` is the current version. It does not delist for version
lag alone. Family 1 reads the intent's version, the multiplier reads the current one, so a listing
mid-migration carries its shortfall in the order rather than only in a chip. Where the two versions
agree, conformance is a gate and nothing else.

P at three worked values, so the curve is not a mystery: a free listing scores 1.00, a listing at the
category median scores 0.5000, one at three times the median scores 0.2500. It is scale free, so it
behaves identically in a category where everything costs 0.0001 `$U`, which is the modal ERC-8183
budget across 262 recent funded-or-later jobs (`R02-erc8183.md`) and in one where a job costs 70 USDC, which
is the median listing price on the one comparable live market with real volume (`R07-termix.md`).

F worked, with τ = 900 s. The staleness gate in family 3 excludes anything probed longer than 900 s ago,
so **F is bounded to (0.368, 1] for every ranked candidate** and the low end of the curve is unreachable
rather than merely unlikely. Age 0 scores 1.000, 60 s scores 0.936, 5 minutes scores 0.717, 10 minutes
scores 0.513. The 0.368 at 15 minutes is the floor the gate sits on rather than a value a candidate
holds. τ is 900 s because an oracle push is the only input that can move a
healthy position to liquidatable in one step (`R09-bsc-defi.md`) and BSC blocks land every 0.45 s, so
past a quarter of an hour a liveness number is a story about the past. F is deliberately weighted below
R so a freshly probed broken agent never outranks a slightly stale reliable one.

C is where the four categories are held to equal depth inside the matcher. The contract lives in
`03-TAXONOMY.md`. What follows is the one signal per category that carries the most weight in C, each
one taken from a verified read rather than from a claim, plus the agreement rule section 7 needs.

| Category | The C signal that dominates | Fact or plan | Agreement is decidable how |
| --- | --- | --- | --- |
| `rebalancing` | publishes the drift trigger rule, the target weights, `weightsBefore` and `weightsAfter`, plus the identical basket never rebalanced over the identical window as the benchmark, with every pool input it names readable at the pinned block | plan | the plan is not decidable, so both go side by side. Its **inputs** are: `weightsBefore` reproduces from the account's own balances, the fee tier exists, the fee arithmetic is net of the protocol cut and any oracle window it claims is one the pool can serve (`R08-pancakeswap.md`) |
| `grid` | publishes win rate **per round trip** with both window endpoints and the trade count, plus max drawdown, peak notional, the bounds, the step count, the order size and the fee tier it trades | plan | same, both plans side by side, with the same four input checks against `R08-pancakeswap.md` |
| `yield` | tags every rate with its unit plus its source call, then states what the number excludes | fact | exact equality of the raw rate integer, its unit tag and the pinned block |
| `health-factor` | reads Venus core, Venus E-Mode, Lista Lending and Aave, returns the liquidation price and the block it read | fact | exact equality of `sumCollateral(LT)` and `sumBorrowPlusEffects` at one pinned block |

Each of those is a real discriminator rather than a checkbox. `R09-bsc-defi.md` measured that a grid
bot's individual fills are all wins by construction because it only buys below and sells above its
reference, so a per-fill win rate is meaningless and a judge who trades spots it in seconds. It measured
three rate units across three protocols, Venus per block, Lista per second and Aave per year in ray, so
an untagged rate is not checkable. It measured Venus's own published APY reproducing at exponent 364 to
4e-12 while exponent 365 is 0.013 percentage points off, so the convention has to be declared. And it
measured that 12 of 55 Venus core markets have a collateral factor different from their liquidation
threshold, with vLINK at CF 0 and LT 0.63, so an agent that only reads the core-pool getters misreads a
real account by $29.81 on $825 of debt, 3.9% of collateral value. An agent that handles those is
genuinely deeper than one that does not. C is where that shows up in the order.

**The two plan categories get the same treatment from `R08-pancakeswap.md`, so C is not thinner where the
output is a judgment.** A plan is not gradeable. Its stated inputs are. Four of them are measured
facts a wrong plan trips over. There is **no 3000 fee tier on PancakeSwap v3**: the tiers are 100, 500,
2500 and 10000 ppm at tick spacings 1, 10, 50 and 200, so a plan that names a 0.3% pool names a pool that
does not exist. The protocol fee per tier is 3300, 3400, 3200 and 3200 of 10000, so the 0.01% tier pays
LPs 0.0067% rather than 0.01% and any expected fee capture computed at the gross tier rate is wrong by
that cut. The pool oracle cannot serve a day: `observe([86400])` reverts `OLD` and the measured maximum
lookback was 39,234 s on one live pool and 21,407 s on another, so a plan claiming a 24-hour realised
volatility from that source did not read it there. And v2's swap fee is exactly 0.25%, not the 0.2% in the
old periphery repo. The rebalance decision itself is the break-even inequality R08 sets out, expected fee
gain times expected in-range time against realised impermanent loss plus gas plus swap cost. Every
term on the left needs `pool.liquidity()` and the tier net of the protocol fee. A plan that states the
inequality and its inputs scores C. A plan that states a target and a hope does not.

### Why these weights

Q at 0.30 because the unit of this marketplace is a completed paid job and nothing else is evidence.
R at 0.25 because it is the only term with data on day one and because it is ours to measure rather than
ours to trust. C at 0.15 because contract coverage predicts whether the buyer's actual question gets
answered. P at 0.15 because price is real and a cheap agent that fails is worth nothing, so price must
be visible without being decisive. F at 0.10 because staleness is a data-quality defect rather than a
capability defect. E at 0.05 because a tier is a summary of facts already counted elsewhere. Any
more weight makes the ladder the product.

The vector is published in full, as `rank-1.0.0`, coefficients included. `R13-prior-art.md` records the
common practice as publishing the parameters and the thresholds while withholding the coefficients,
which P2B Art 5(1) requires and Art 5(6) permits. We publish the coefficients anyway. Every term is a
measurement an operator improves by improving, the one term that invites gaming is Q and its defence
lives in the shrinkage plus the detections in `06-QUALITY.md`. A published vector is what makes the
anti-favouritism audit in section 10 something a stranger can run instead of something we assert.

**The ranking warms up, which is stated rather than hidden.** With 1.32% of BSC agents carrying any
feedback and zero settled Muster jobs at launch, Q sits at the category prior for nearly every candidate
and contributes almost nothing to the order. The first weeks are decided by R, C, P and F, all of which
we measure ourselves. By roughly 20 settled jobs per agent per category Q dominates, which is the
intended end state. A design that only works once reputation exists would not work at all in this
population.

**Tie-breaks, published and deterministic.** Ranks equal within 1e-6 break on lower price, then on
larger `scoreSampleSize`, then on the low 8 bytes of `keccak256(agentId ‖ intentHash)`, lower wins. The
last one is stable inside one intent and unstable across intents, so no listing inherits a permanent
advantage from its name or its id.

### Worked example

Category `health-factor`. Intent: monitor one account's Venus position, ceiling 0.50 USD1
(`500000000000000000` base units at 18 decimals), `needBy` 60 s, redundancy 1. Twelve listings on
the shelf, three survive the hard constraints, block pinned at 120,027,164. The three are named `L1`,
`L2` and `L3` so a candidate is never confused with the term `C`.

| | Q | probes 24 h | R | C | price USD1 | P | probe age | F | tier | E | in flight |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | 0.62 (n 16) | 96 / 98 | 0.9286 | 1.00 | 0.25 | 0.5000 | 40 s | 0.9565 | E4 | 1.00 | 1 of 3 |
| L2 | 0.58 (n 13) | 71 / 74 | 0.8874 | 0.75 | 0.18 | 0.5814 | 190 s | 0.8097 | E2 | 0.50 | 0 of 3 |
| L3 | 0.32 (n 2) | 40 / 40 | 0.9124 | 0.50 | 0.40 | 0.3846 | 20 s | 0.9780 | E1 | 0.25 | 0 of 2 |

The `n` beside each Q is the settled-job count the score was computed at, with `w_j = 1`, no decay yet and
no per-buyer cap binding, which is `06-QUALITY.md`'s launch rule. Sixteen clean jobs read 62 rather than
100 because the score shrinks toward `mu_c = 0.50` at prior strength `m = 10` and then reports the lower
end of the 95% interval: 62.1 at 16, 58.1 at 13 and 32.0 at 2, the last of which that document pins
independently. Where a cap or the decay does bind, the effective count is lower than `n` and the panel
prints both. Median eligible price is
0.25, so P is `1/(1 + p/0.25)`. R is the Wilson lower bound above. Note
that `L3`'s perfect 40 of 40 scores 0.9124 while `L2`'s 71 of 74 scores 0.8874: for `p = 1` the bound
collapses
to `1/(1 + z²/n)`, so a clean record still pays for its sample size.

```
rank_L1 = .30(.62) + .25(.9286) + .15(1.00) + .15(.5000) + .10(.9565) + .05(1.00) = 0.7888
rank_L2 = .30(.58) + .25(.8874) + .15(0.75) + .15(.5814) + .10(.8097) + .05(0.50) = 0.7015
rank_L3 = .30(.32) + .25(.9124) + .15(0.50) + .15(.3846) + .10(.9780) + .05(0.25) = 0.5671
```

`L1` wins, `L2` and `L3` become the failover chain in that order. The band in section 4 is 0.05 wide, so
0.7888 - 0.05 = 0.7388 and `L2` at 0.7015 is outside it: no lottery, `L1` is dispatched. The panel can say
truthfully that the second-placed listing was 0.087 behind on a published scale.

Change one input to show the lottery working. Give `L2` a 40 s probe age and full contract coverage and
`rank_L2` becomes 0.7537, inside the band. Draw weights are the inverse square of price, then a load
nudge of `1/(1 + u)` where `u` is in-flight over declared concurrency:

```
w_L1 = (1 / 0.25²) * 1/(1 + 1/3) = 16.000 * 0.750 = 12.000   ->  28.0%
w_L2 = (1 / 0.18²) * 1/(1 + 0/3) = 30.864 * 1.000 = 30.864   ->  72.0%
```

Both numbers go in the panel and in the decision record. `R13-prior-art.md` reproduced that inverse
square curve running in production, 0.7347 / 0.1837 / 0.0816 at prices of 1, 2 and 3, a 9.0x ratio
between cheapest and dearest that matches the operator's own published claim. It reproduced the load
expression exactly too, weight 2 with 4 active giving 0.4. Neither curve is a guess.

## 4. Selection policy

**What ships: a deterministic shortlist, a banded weighted draw and an ordered failover chain.**

1. Rank the feasible set. Take the top K = 5.
2. Form the band: every candidate whose rank is within δ = 0.05 of the top rank, on the same [0, 1]
   scale. One member means a deterministic pick.
3. Draw inside the band with weight proportional to `1/price²` times `1/(1 + u)`.
4. The exploration slot in section 5 may substitute one cold candidate, under its own caps.
5. The rest of the shortlist, in rank order, is the failover chain.

δ = 0.05 is the whole design in one number. Above it the draw starts handing work to materially worse
listings. Below it the draw almost never fires, so the top listing in a thin category takes everything.
It is published and it is per-category adjustable.

### Deterministic rank, settled against the two alternatives

**Deterministic argmax was rejected for dispatch and kept for display. The two are different
functions over the same six terms.** The shelf sort a buyer sees is
deterministic, because a list that reorders under the cursor is not a comparison surface. It is also not
argmax on this rank: `03-TAXONOMY.md` publishes the default shelf ladder as `evidenceTier` desc, then the
rank here, then `scoreLowerBound` desc, then `reachabilityTier` desc, then price asc, then `agentId` asc.
So evidence tier leads the display while it carries 0.05 inside the rank. The top shelf row and the
dispatched listing can be different listings for the same intent. That is deliberate. Browsing has no
intent, no quote and no buyer precision, so the shelf sorts on what a stranger can compare across every
row, while dispatch scores the candidates that cleared this intent's hard constraints. Two consequences
the panel carries rather than leaves to be discovered: it prints the chosen listing's shelf position
whenever that is not the top row. And its runner-up line names which ordering it is quoting, which is
always the dispatch ranking.

Dispatch is not deterministic, for two measured reasons. The four mandated categories are thin: the most
generous single keyword
per category across the whole index returns rebalancing 47, grid 20, apy 430 of which yield 290 and
health factor 21, summing to 518 agents or 0.17% of the index (`MEASUREMENT.md`). Pure argmax in a
category of 20 hands every job to one operator, which reads to a judge as a monopoly rather than as a
marketplace. It also starves exactly the agents whose records we need to build. And with Q flat at
launch, argmax on a near-tie is decided by whatever term happens to break it, which is a worse story
than a published lottery. What argmax buys is zero variance and the simplest possible explanation. We
keep most of that by banding: inside 0.05 the candidates are equivalent on our own published scale,
so drawing among them is not a compromise on quality.

**A sealed-bid auction was rejected for the ship and specified for later.** It needs bidders that can
price a job on demand inside the buyer's latency budget. Measured supply says they do not exist yet: 12
of 600 agents are machine-callable, 0 of 600 are payable by a stranger (`MEASUREMENT.md`) and on the
official hire rail 97 distinct providers have ever appeared with 28 holding any completed job and one
address holding 56,167 jobs, 99.0% of them (`SPINE.md`, `R16-reuse.md`). Whether that one address is a
single operator or a platform router in front of many is **unverified**. That reading is what
decides how thin the biddable supply actually is, so the count is the fact and the thinness is an
inference (open question 10). Under either reading an auction today runs over at most a handful of live
bidders, which
is a price you could have read off the listing. What an auction buys is real price discovery once supply
is deep and a revenue lever that does not touch ranking. The shape we would ship is a sealed first-price
round over quotes with a published reserve, closing at the earlier of 5 s or all quotes returned. It is
first price rather than second because `R13-prior-art.md` corrects the usual assumption here: the live
multi-slot marketplace auction it read is pay-your-bid, with each of four winners paying their own bid.
The generalised second-price version is not truthful anyway. A marketplace that says Vickrey and
charges the bid is misdescribing itself.

**A bandit was rejected for the ship, its counters ship anyway.** Thompson sampling is about ten lines
and it won the published production comparison on real display advertising data, CTR regret 3.72% against
LinUCB 4.14%, epsilon-greedy 4.98% and exploit-only 5.00% (`R13-prior-art.md`). The same source gives
the reason it fits a marketplace specifically: rewards arrive late and randomising over actions absorbs
delayed feedback where a deterministic upper-confidence rule does not. The reason it is not the v1
selector is that a bandit optimises one reward and we do not have one yet. A Beta posterior with no
observations is the category prior, so a bandit at launch is the prior plus noise, which is the one
thing a why-this-agent panel cannot explain. So we keep the counters from job one, `S` and `F` per agent
per category, then name the switch condition rather than leaving it to taste: **enable Thompson for a
category once at least 8 agents in it each hold at least 5 settled jobs.** Until then the exploration
slot does the job a bandit would do, with a bound a buyer can read.

## 5. The bounded exploration slot

One substitution per intent, at ε = 0.10 of counted dispatches. The size of that budget is
`06-QUALITY.md`'s to set and it sets it there, in dispatches recorded in our own `ledger` rather than in
impressions or in traffic, which is what makes the rate auditable from published rows.

The slot fires only when all three hold: the eligible set has at least two candidates, at least one
candidate is **cold** (fewer than 5 settled jobs in this category through Muster) and the buyer has not
opted out. When it fires, one cold candidate replaces the band's winner as the dispatch target and the
former winner becomes the head of the failover chain.

**The draw, in one line, because "10% of dispatches" does not say how one intent decides.** A Bernoulli
at the published rate per intent, evaluated once after the band is formed, then a uniform draw among the
cold candidates that cleared bound 2 plus bound 4's cluster-representative and operator-24-hour filters,
with the shelf card's current occupant
preferred where it is in that set. Uniform rather than weighted, because the whole point of the slot is
that we have no evidence to weight with yet. That is where `ε / k` below comes from.

ε = 0.10 is a policy constant rather than a measurement, which open question 2 says in those
words. The one tuned value in the corpus is lower: `R13-prior-art.md`'s epsilon-greedy row is best at
0.01 on a display-advertising stream, where 1% of an ad-serving firehose is still a large number of
trials. Our counted dispatch set starts at zero on 2026-09-09 against about 518 candidate agents across
the four categories, so 0.01 of the dispatches this window can produce is no exploration at all, which is
the failure the same file's other source names: a shipped commercial personalisation service runs plain
epsilon-greedy with the percentage as an operator dial, zero exploration causing "model stagnation,
drift, and ultimately lower performance" and 100% meaning learned behaviour cannot influence the outcome
at all. One job in ten is enough to build records in a category of 20 listings without the buyer noticing
a pattern. It is a dial, per category, published.

Five bounds, each of them there because of something measured in this population.

**Bound 1, eligibility is never relaxed.** A cold candidate passes all five hard-constraint families,
static feasibility and live feasibility, at the same pinned block as everybody else. The slot changes who
wins, never what winning requires. The reason is the scarcity: 12 of 600 sampled agents reach T2 and 0
reach T3 (`MEASUREMENT.md`), so the rare thing in this population is a callable agent rather than a
highly ranked one. A slot that waived liveness "to give a newcomer a chance" would dispatch to something
nothing can call.

**Bound 2, a rank floor rather than a coin flip.** The cold candidate needs `rank_cold >= 0.60 *
rank_top`. Take the worked example above, then add a cold listing `L4` with no
settled job, 30 of 30 probe passes, contract coverage 0.75, price 0.10 USD1, a 30 s probe age and tier E1.
Q is 0.237, which is what `06-QUALITY.md` returns at `N = 0`. R is `1/(1 + z²/30)` = 0.8865. `L4` is
eligible, so it joins the median P is taken over and **every P in the category moves**: four prices at
0.10, 0.18, 0.25 and 0.40 put the median at 0.215 rather than 0.25, which is the term working as
specified rather than a wrinkle:

```
P_L4 = 1/(1 + 0.10/0.215) = 0.6825      P_L1 = 0.4624
rank_L4 = .30(.237) + .25(.8865) + .15(0.75) + .15(.6825) + .10(.9672) + .05(0.25) = 0.6168
rank_L1 = .30(.62)  + .25(.9286) + .15(1.00) + .15(.4624) + .10(.9565) + .05(1.00) = 0.7832
floor   = 0.60 * 0.7832 = 0.4699        so L4 is eligible for the slot
```

`L1` is still the top rank at 0.7832, down from 0.7888 because the median it is priced against fell. The
floor is not decoration and it is not unreachable: a genuinely good unproven listing clears it on the
four terms we measure ourselves while a bad one does not. It matters here more than it would elsewhere
because "a new agent" in this registry is often the same agent again. One duplicated name holds 215 of 600
sampled agents with byte-identical `data:` URIs under 215 distinct owners (`MEASUREMENT.md`).

**Bound 3, read-only work only, with a price cap.** The slot fires on a category output that is a read:
a report, a snapshot, a grid specification, a rate comparison. It never fires on an executed leg or on a
prepaid watch window, because a leg moves the buyer's money through a session and a window is a
commitment rather than a call (`08-MONEY.md` owns the three shapes). The secondary cap is a quote at or
under 0.25 `$U`, which is 2.5x the reference report price of 0.10 `$U` in that document. Worst case on a
read is a wasted 0.10 `$U` and a refusal receipt naming what failed.

**Bound 4, one per intent, one per operator per 24 hours, cluster representative only.** The candidate
must be the representative of its `duplicateClusterId`, its operator must hold no other exploration
dispatch in the last 24 hours and no intent gets two exploration legs. Without those three the slot is
one operator's budget: nine hosts serve all 229 endpoint URLs in the sample with `evoevo.ai` holding 217
of them, plus all 12 machine-callable agents sitting on one product on one host (`MEASUREMENT.md`).

**Bound 5, the buyer can turn it off and the panel always says it fired.** Off per intent with one
control, off permanently in buyer settings. Either way the why-this-agent panel in section 9 states that
the exploration slot chose this listing and names the listing it displaced with the rank gap. A
substitution the buyer cannot see is a bait and switch. It is also a main parameter determining which
listing a buyer gets, which is exactly what P2B Article 5(1) requires a platform to describe, so it is
described where it acts rather than in a policy page nobody opens (`R13-prior-art.md`).

### A first-party listing is never the exploration candidate

The slot exists to build third-party records. Our own reference agents will be cold at launch, they will
pass conformance first because we wrote the suite, so a slot that treats "no settled jobs" as the only
test would hand them the exploration budget on day one. So the eligible cold set excludes any listing
whose `agent.owner` is on the published operator list. That is derived from the same list `02-THESIS.md`
section 10 publishes, never a stored flag.

### The other form of exploration: a house run

Substitution spends a buyer's money on an unproven listing. The cheaper instrument is to spend our own.
A **house run** is a real job Muster buys from a cold listing at its own price, tagged `origin: house` at
ledger append time, labelled on every surface, excluded from every revenue and volume figure. It is
already the cold-start valve `02-THESIS.md` names in clause (c) of the hireable bar. This is the
component that dispatches it.

What a house run does and does not buy, precisely:

| It builds | It does not build |
| --- | --- |
| the R term, because a live paid dispatch is the most informative probe we have | the Q term. `06-QUALITY.md` counts `origin: order` only, so a house run never touches `S` or `N` |
| the H6 pass that gets a row onto a shelf at all | any revenue, turnover or volume figure |
| a public receipt a stranger can recompute | a claim that somebody else chose this agent |

Bounds on it, because it is our money and our credibility: at most one house run per category per hour,
funded from a published budget, never against a first-party listing.

**A house run runs in all four categories, graded differently in two of them.** In `yield` and
`health-factor` the deliverable is graded on chain equality, which section 3's table fixes. In
`rebalancing` and `grid` it is graded on the named-field diff 7.2 already specifies (target weights,
trigger rule, `driftBps`, `weightsBefore`, `weightsAfter`, bounds, step count, order size, fee tier) plus
the four input checks against `R08-pancakeswap.md` in section 3: `weightsBefore` reproduces from the
account's balances at the pinned block, the fee tier is one that exists, the fee arithmetic is net of that
tier's protocol cut and any oracle window the plan claims is one the pool can serve. Restricting house
runs to the two decidable categories was the earlier rule and it was wrong in the one way that costs a
published criterion: `02-THESIS.md` clause (c) is the only cold-start valve that gets a third-party row
onto a shelf, so barring it left the rebalancing and grid shelves with no valve at all and their only
possible rows agents that already hold a `COMPLETED` ERC-8183 job. That is Agent Diversity thrown away to
avoid grading a plan, when a plan's inputs grade fine. What a house run in a plan category does not buy is
any claim that the plan was right. The receipt says so in those words.

### How slow this is, stated rather than implied

At ε = 0.10 with `k` cold candidates in a category, each cold listing sees `ε / k` of dispatches. With
five cold candidates that is one dispatch in fifty each, so a listing needs 250 category dispatches to
reach the 5 settled jobs that take it out of the cold set. Muster will not see 250 dispatches per category
in the days before 2026-09-09. So the honest claim on submission day is that the slot exists, is bounded,
is auditable and has fired a small number of times, with house runs doing most of the work of putting a
first receipt on a third-party row. The mechanism is what ships. A learning curve is not something four
days can buy.

### Where the boundaries sit

Three documents touch this slot and none of them decides the same thing. `06-QUALITY.md` sets the two
budget sizes and nothing else: one card per shelf, plus ε = 0.10 of counted dispatches for substitution.
`03-TAXONOMY.md` owns the buyer-facing card: exactly one labelled card per shelf, pinned under
the first band header, with hourly deterministic rotation `member = sorted(eligible, by
agentId)[floor(unixHour) mod len(eligible)]`, so a judge can reproduce the occupant. This document owns
the dispatch substitution and its draw, which is the Bernoulli plus the uniform pick above.

So there are two selectors and no bandit, which is the settlement all three documents state in the same
words: the shelf card is chosen by 03's hourly rotation, the dispatch substitute by our uniform draw,
with Thompson sampling documented and not shipped for either (section 4, `06-QUALITY.md`). A bandit would be
the third selector and it loses on the same argument in both places, that a Beta posterior with no
observations is the category prior.

Two differences between that card and this dispatch are
deliberate. The card requires zero settled jobs, because it is a display promise about a genuinely new
row, while dispatch substitution uses the wider cold set of fewer than 5, because a listing with two jobs
still cannot be judged. And when the shelf card is also the cold candidate the draw prefers it, so
a judge refreshing the page sees the same listing our dispatch would choose, which is one fewer thing to
explain.

## 6. Failover

Failover is sequential and it pays at most once. Fan-out is parallel and it pays for every leg that
delivers. They are different products and section 7 owns the second one. This section is what happens when
the chosen listing does not deliver.

The whole design rests on one fact from `08-MONEY.md`: on the default rail the order is **verify, run the
resource, settle, respond**, so funds move only after a deliverable exists. A leg that times out has
settled nothing, which is why a failover can be free. Everything harder in this section comes from the one
rail where that is not true, the official escrow, which is 6.5.

### 6.1 What triggers it, by fault class

`04-AGENT-PROTOCOL.md` owns the four fault classes and this table is the matcher's action for each. The
class is decided from the wire signal, then the action follows from the class rather than from taste.

| Class | Signal | Action | Same-agent retry |
| --- | --- | --- | --- |
| `networkFault` | DNS failure, TLS failure, connection reset, timeout with no response | next candidate now, failed listing demoted for 30 s | never inside this intent |
| `networkFault` | 429 or 503 carrying `Retry-After` | one retry on the same agent at the stated time, if it fits the remaining budget, else next candidate | once and only on this signal |
| `agentFault` | 500, a timeout after a 202, a `responseHash` that does not recompute, a refusal outside the declared conditions, a declared skill absent | next candidate now | never |
| `buyerFault` | 400 before payment, 404 on an unknown skill, 412 with no allowance, 422 on a reused key, an expired authorisation, insufficient funds | stop. No failover, no charge, the panel names the field to fix | not applicable |
| `marketplaceFault` | our facilitator down, our gateway at 15 s, our own index stale | retry ourselves once, then refuse the intent | not applicable, no agent record is touched |
| refusal inside the declared conditions | a structured refusal naming a condition from `refusalConditions[]` | **not a failure and not a failover.** The intent ends with a refusal receipt | not applicable |

The last row is the one most venues get wrong. A grid agent that refuses because the pair has no pool at
the requested fee tier has answered correctly. Walking the chain to find an agent that will say yes
would be selling the buyer a worse answer. SPINE fixes the vocabulary here: a correct refusal is a success.
The buyer is offered the relaxation that would make the job feasible instead.

Only two of those rows retry the same agent. The one that does uses the agent's own `Retry-After` rather
than a number we invented. Retrying a host that just timed out costs the buyer the same wait twice
against the same host. The production precedent for the alternative is the shape we already use in
eligibility: a short outage memory of 30 seconds, then deprioritise rather than exclude
(`R13-prior-art.md`).

### 6.2 The clocks

| Clock | Value | Where it comes from |
| --- | --- | --- |
| attempts per intent | 3, the chosen listing plus two from the failover chain | ours. K is 5, so two of the shortlist are held in reserve unused |
| one attempt's ceiling | the smaller of the listing's declared timeout and the remaining budget | `04-AGENT-PROTOCOL.md` publishes 10,000 ms for a create step or a synchronous skill |
| dispatch deadline, synchronous category output | `min(needBy, 45 s)` | three 10 s attempts plus slack, under a minute so the buyer never watches a blank screen |
| dispatch deadline, polling listing | each attempt's 202 must arrive inside 10 s, then the job's own `maxDurationSeconds` governs | 04's lifecycle, not ours to restate |
| our gateway | 15,000 ms | 04. This is why the hire answers 202 with a Muster `jobId` and the chain walks behind it |
| quote validity | 900 s | the SDK cap on an ERC-8183 quote (`R02-erc8183.md`), so a chain that walks for 45 s never uses a stale price |
| payment authorisation validity | 300 s | `maxTimeoutSeconds` on the challenge (`R12-agent-comms.md`, `08-MONEY.md`) |

The hire endpoint never holds the buyer's HTTP request open across a failover. It answers 202 with our own
job resource and the attempt list streams into it, which is 04's pattern B applied to our own surface even
when the underlying listing is synchronous. That choice is what keeps a three-attempt chain inside a
15 second gateway ceiling without lying about either number.

### 6.3 Keys and quotes: a retry is not a switch

The distinction is exact, because getting it wrong charges a buyer twice.

**A same-agent retry reuses everything.** Same `Idempotency-Key`, same `requestHash`, same quote, same
signed authorisation. The agent is then free to dedupe it. `04-AGENT-PROTOCOL.md` fixes the codes it
answers with: 409 while the original is in flight, 422 on the same key with a different body. Our client
treats both as "the first request is the real one" and polls rather than re-sending.

**A switch to the next candidate reuses nothing.** A different agent means a different payee, a different
price, a different `quoteId` and therefore a new `Idempotency-Key` plus a fresh `requestHash`. An EIP-3009
authorisation names `to` and `value` exactly, so a signature made for candidate A is not merely wrong for
candidate B, it is unusable, which is a property of the rail rather than a rule of ours.

### 6.4 What the buyer pays

Seven rules, in the order they bind.

1. **At most one leg settles per intent. The lock is taken before the money moves.** The matcher takes
   a settle lock on the intent at the moment a leg reaches its paid call, which is where the
   `Idempotency-Key` is reserved ahead of any payment step (`04-AGENT-PROTOCOL.md`, `15-SYSTEM.md`).
   Keying it on a settled `payment` row would be too late. `payment.state` is `pending`, `settled` or
   `failed` rather than a boolean, B402's settle is asynchronous and reconciles a broadcast transaction
   for up to about 30 minutes, so a lock that only closes on `settled` lets the chain walk while the first
   payment is still confirming. That is the double charge the rule exists to prevent, produced by the rule
   itself.
2. **`pending` blocks the chain rather than releasing it.** While a leg sits in `pending` the chain does
   not advance. The discriminator is whether the settle response carries a `transaction`, not what
   `errorReason` says, because a confirmed revert and an unconfirmed broadcast both come back
   `success: false` with a hash (`04-AGENT-PROTOCOL.md`). Non-empty `transaction`: the lock holds until
   reconciliation resolves, then `settled` ends the intent while a confirmed revert is rule 7 rather than a
   release, because by then the work has run. Empty
   `transaction`: nothing was broadcast, so the lock releases at once and the chain walks. The buyer sees
   "waiting for confirmation" with the hash on the attempt row. The wait is governed by the
   reconciliation window rather than by `needBy`.
3. **A failed leg with nothing broadcast costs nothing.** Verify commits no state and settle runs after
   the resource, so a
   timeout, a 5xx or a refusal leaves no payment (`08-MONEY.md`). The buyer's authorisation for that
   candidate simply goes unused and expires at `validBefore`, at most 300 s later. That is a property of
   the ordering rather than luck. It covers the whole 402 rail because `08-MONEY.md` sends any work
   that cannot be
   delivered inside the authorisation window (270 s after the 30 s margin) or priced at or above 1.00 `$U`
   to the escrow rail instead, where 6.5 governs. Where a transaction was broadcast, rule 2 governs and
   this rule does not apply.
4. **The buyer pays the price of the leg that delivered**, which may be higher or lower than the first
   choice and never more than the ceiling, because every candidate cleared the ceiling in eligibility
   before it entered the chain. That is the sentence the panel prints.
5. **The fee follows the settled leg.** `08-MONEY.md` charges the fee on the job that settled and sends it
   back when a job is refunded, so a failover carries exactly one fee.
6. **A leg that settled and then failed conformance is a dispute, never a failover.** A second attempt
   would be a second charge for one intent, which rule 1 forbids. The handoff is a `dispute` row like any
   other, `raisedBy: muster` with reason code D1 or D3 as the failure dictates. The remedy is
   `09-DISPUTES.md`'s ladder rather than ours: for a non-conforming delivery that starts with one re-run
   at no new charge, then a refund if the re-run fails the same assertion. The buyer is not asked to
   authorise anything to get that.
7. **A settle that fails after the resource ran is ours, not the agent's.** The order is verify, run,
   settle, so a broadcast that reverts leaves the buyer uncharged and the operator holding a deliverable
   it was not paid for. The deliverable is released to the buyer, the operator is owed and `08-MONEY.md`
   owns the make-good. On the record it is a `marketplaceFault`, which is
   excluded from the agent's dispatch record entirely and published on the status page
   (`04-AGENT-PROTOCOL.md`), because the agent did its part. The chain does not walk either: the answer
   exists, so a second dispatch would buy a second copy of it.

**Who signs and how many times.** The rail forces one authorisation per candidate, so the only real
question is when the buyer produces them.

| Buyer | Policy | Why |
| --- | --- | --- |
| a person in a browser | sign for the chosen listing only. On a failover the panel shows the fault, the next candidate and its price and asks for one more signature in one click | two extra wallet prompts on a path that should be rare is worse than none, so we only pay for the prompt when the failure actually happens |
| an agent, the MCP surface or the REST API | pre-sign the whole chain, one authorisation per candidate, one shared `validBefore`, at most one settled | a machine has no prompt cost and a fully autonomous hire cannot pause for a signature. `04-AGENT-PROTOCOL.md` makes this lane a scored surface |
| a person who opts in | same as the machine path, with the unused authorisations listed in the receipt | the buyer chose speed over a prompt, so the record has to show what they signed |

The unused authorisations are the honest part. Each one is a bearer object for up to 300 s, so the receipt
lists them by nonce with their expiry and on USD1 the buyer can retire one immediately with
`cancelAuthorization` `0x5a049a70`, the one settlement token on our ladder that exposes it
(`VERIFIED-payment-rail.md`, SPINE). On `$U` and FDUSD the only retirement is expiry and the page says so
rather than implying a cancel button that does not exist.

### 6.5 The escrow trap and the rule that avoids it

On the official ERC-8183 rail money moves **before** the work, so none of 6.4 holds. The state machine is
verified and it allows **two** routes back to the client once a job is funded, of which the client
controls neither directly (`R02-erc8183.md`):

- `Funded or Submitted -> Expired`: anyone calls `claimRefund(jobId)` `0x5b7baf64` once
  `block.timestamp >= expiredAt`, the client is refunded in full, deliberately not hookable so a broken
  hook cannot trap the escrow. Permissionless, so Muster can call it for a buyer.
- `Funded -> Rejected` and `Submitted -> Rejected`: the **evaluator** calls `reject` `0x41dd26f5`. Our jobs
  name the EvaluatorRouter `0x51895229E12F9876011789B04f8698af06cCD6DA` as evaluator.
- So the client's own lever is neither of those, it is `dispute(uint256)` `0x86d6282c` on the
  OptimisticPolicy
  `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5`, client-only and only inside the window, then five
  whitelisted voters with a quorum of three. One lever, whose pressing is what makes the evaluator route
  fire.
- Silence approves. `settle(uint256,bytes)` `0x39c2ebb9` is permissionless once `submittedAt +
  disputeWindow` elapses and `disputeWindow()` is **604,800 s** on mainnet against 900 s on testnet.

That produces a clamp with no way round it. `expiredAt` has to sit beyond `submittedAt + disputeWindow` or
the job becomes refundable before it can ever settle and an honest provider cannot be paid, which is why
`08-MONEY.md` derives it from the delivery deadline rather than from funding time:
`expiredAt = deliveryDeadline + disputeWindow + 1800`. On mainnet that means a funded job's refund route
does
not open for about seven days. There is no fast refund to be designed here. It is a property of the
deployed kernel.

So the matcher's rule is one line: **on the escrow rail the chain is walked before `fund`, never after.**
Concretely, in order: rank, quote, verify the provider signature on the quote, `createJob` with the chosen
provider, `registerJob`, `setBudget` and only then `approve` plus `fund`. Every failover happens in the
window between `createJob` and `fund`, where the job is status `0 OPEN` and nothing has moved. After
funding, a provider that does not deliver is a dispute plus a seven-day clock and the buyer is told that
before they sign the funding transaction rather than after.

Two related notes, labelled for what they are. `setProvider(uint256,address,bytes)` `0xc9a84bb9` exists on
the kernel and we use it only while a job is `0 OPEN`. Whether the kernel permits a provider change on a
`1 FUNDED` job is **unverified**, so no failover path depends on it and nothing in the product offers it.
And the honest demo shape follows from the two window values: the testnet loop closes inside one sitting at
900 s, while a mainnet job funded on 2026-09-08 becomes settleable around 2026-09-15, inside judging, shown
as an in-flight hire with its auto-approval date rather than as a completed one.

### 6.6 What the failed agent's record shows

Four things happen and one thing deliberately does not.

| Surface | What it records |
| --- | --- |
| the listing's public dispatch record | one row per attempt: `intentHash` (9.1 defines it and it carries no buyer address), `observedAt`, the fault class, the wire signal, the ceiling that applied, whether it was a retry, the pinned block |
| the R term in the ranking function | the attempt joins the 24-hour probe window as a failure, so the Wilson lower bound moves. Each attempt is one row in that window, a live paid dispatch and a synthetic probe alike. A live dispatch is the better evidence, because a real request with a real payment behind it exercises paths a probe does not. Weighting it would need a constant we cannot calibrate yet (open question 5) |
| the demotion partition | demoted for 30 s, meaning it sorts after every non-demoted candidate whatever its rank. Three consecutive failures spanning at least 90 s move it to `probe_failing` and out of eligibility until one probe passes (section 2, family 3) |
| the statement of reasons | a demotion is an adverse action, so it emits the same record any other restriction does: what happened, the facts relied on, that a machine decided it, the clause, the appeal route (`R13-prior-art.md`, DSA Article 17(3) and `09-DISPUTES.md` owns the appeal) |

What does not happen: the Muster score does not move. `06-QUALITY.md` counts a job only when a settled
`payment` row exists with `origin: order`, so a dispatch that failed before settlement is not in the
counted set at all. `04-AGENT-PROTOCOL.md` describes an `agentFault` as counting as a failed job in the
score and the reconciliation is that this holds where money settled: a settled leg whose deliverable does
not recompute is `v_j = 0`, while a leg that timed out before settlement lands in the dispatch record and in
R instead. Two documents, one counted set and the score keeps its property that every point of it was paid
for.

The failure is visible either way, which is the point. A listing whose card says "4 dispatch attempts in
the last 24 hours, 2 timeouts, last success 3 hours ago" is more use to a buyer than one whose score simply
declines to say.

### 6.7 What the buyer sees while it happens

The job page shows the attempt list live, one row per attempt, each with the listing name, the price, the
elapsed time and the outcome in plain words ("no answer in 10 seconds"). Nothing collapses into a spinner
and nothing silently substitutes. When the chain ends in a delivery the receipt keeps every attempt, so a
buyer reading it in a week can see that they were the second choice and why. When the chain ends with
nothing delivered the intent produces a refusal receipt naming each attempt, its fault class and the total
charged, which is zero.

## 7. Multi-agent jobs

Three shapes and confusing them is how a marketplace ends up charging for two answers while promising one.

| Shape | Structure | Who pays what | What it buys |
| --- | --- | --- | --- |
| **fan-out** | `r` listings run the same job in parallel | every leg that delivers is paid, so `r` prices | an answer that does not depend on one host being up, plus a second reading of the same question |
| **chain** | `n` listings each run a different leg, in order, output feeding input | every leg is a hire at its own price, so `n` prices | a job no single category contract answers |
| **subcontract** | one hired listing hires another itself | the buyer pays the parent price. The sub-hire is the parent's own cost | nothing to the buyer except the parent's own capability |

Fan-out and the chain are ours to select. A subcontract is the agent's own decision under rule B13 in
`04-AGENT-PROTOCOL.md`: one hop, disclosed in the parent receipt, deeper chains refused rather than
tracked, because at depth 2 the evidence bundle stops being checkable and the screening stops being
enforceable.

### 7.1 Fan-out for redundancy

Off by default. `intent.redundancy` is 1 unless the buyer sets it, `r <= 3` and the four rules are:

**Price.** The ceiling is the total for the intent, so eligibility compares each quote against
`floor(ceiling / r)` in base units. A 0.50 USD1 ceiling at `r = 2` admits candidates at or under
`250000000000000000` base units. One meaning for one number and the buyer cannot be charged twice their
stated ceiling by asking for redundancy.

**Independence, which is the whole point and the part this population breaks.** Four tests, all of them
required. The `r` legs must have
distinct `owner`, distinct `duplicateClusterId` and distinct endpoint host, plus **at most one leg may come
from our own published operator list**. Two candidates that share any
of the first three are one agent answering twice and that is not a hypothetical here: 215 of 600 sampled
agents
carry byte-identical `data:` URIs under 215 distinct owners, nine hosts serve all 229 endpoint URLs in the
sample with `evoevo.ai` holding 217 and all 12 machine-callable agents in the sample are one product on
one host (`MEASUREMENT.md`). Distinct owner alone would have passed the 215-copy cluster.

The fourth test exists because the first three would not catch us. `02-THESIS.md` clause 1 publishes our
operator addresses as a list, plural, so two of our own listings under two of our own addresses on two
hosts pass every structural test while being the same code and the same maker of the answer. That is the
same "one agent answering twice" the rule is for. It is also the easiest way for a fan-out to look
independent while proving nothing. Derived from the published list rather than a stored flag, the same way
the exploration slot's exclusion is, it binds every `origin: order` dispatch. Section 10.1 carries it
as rule 5.

**Shortfall is stated, never padded.** Where fewer than `r` independent candidates exist we dispatch to as
many as do and the panel says "you asked for 2, one independent candidate exists in this category, so one
ran". Padding the second slot with a copy of the first would sell redundancy that does not exist. On the
measured population that is the expected render rather than the edge: 0 of 600 sampled agents are payable
by a stranger, the 12 at T2 are one product on one host and the four categories match 0, 0, 1 and 0 of the
same sample (`MEASUREMENT.md`, `SPINE.md`).

**What redundancy means differs by category and the panel says which.** In `yield` and `health-factor` the
answer is decidable against chain, so a second leg is verification. In `rebalancing` and `grid` the output
is a plan, so a second leg is a second opinion. Selling the second as the first is the misrepresentation
worth avoiding.

### 7.2 Who arbitrates a disagreement

**Never agent against agent. Always agent against chain.** Each leg is graded independently by
`conformance`, which re-runs the reads the deliverable asserts at the deliverable's own pinned block and
compares (`06-QUALITY.md` section 2). A disagreement is a trigger for that recompute rather than a vote
and the recompute is a command anybody can run rather than an opinion we hold.

What "decidable" means per category is fixed in section 3's table and it is exact:

| Category | The comparison | Outcome of a disagreement |
| --- | --- | --- |
| `health-factor` | exact equality of `sumCollateral(LT)` and `sumBorrowPlusEffects` at one pinned block, with the per-market weight from `getEffectiveLtvFactor(account, vToken, 1)` `0x19ef3e8b` and prices from `ResilientOracle.getUnderlyingPrice` scaled `1e(36 - underlyingDecimals)` | whichever leg reproduces is delivered. The other is `v_j = 0` on its own settled job, with the two numbers and the block printed side by side |
| `yield` | exact equality of the raw rate integer, its unit tag and the pinned block, per venue | same, per rate. A leg can be right on Venus and wrong on Lista and the panel shows it that way |
| `rebalancing` | not decidable. A plan is a judgment about the future | both plans are delivered, both are paid, neither is marked wrong. The named fields are diffed: target weights, trigger rule, `driftBps` at trigger, `weightsBefore`, `weightsAfter` |
| `grid` | not decidable, same reason | both delivered, both paid, diffed on bounds, step count, order size, fee tier and expected fee capture net of gas |

The two decidable rows are decidable because `R09-bsc-defi.md` established the arithmetic to the wei. A
Venus recompute matches `getAccountLiquidity` `0x5ec88c79` exactly at a pinned block and the failure mode
it catches is not exotic: 12 of 55 core markets have a collateral factor different from their liquidation
threshold, vLINK sits at CF 0 with LT 0.63 and an agent that reads the core-pool getters instead of the
per-account ones is wrong by $29.81 on $825 of debt on a real account. Two agents disagreeing by exactly
that shape is the most likely disagreement on this shelf and it has a right answer.

**No majority vote and the reason is measured rather than aesthetic.** Three agents voting sounds like
redundancy and in this population it is one agent voting three times: all 12 machine-callable agents in the
sample are one product on one host (`MEASUREMENT.md`). A quorum over correlated supply produces a confident
wrong answer, which is worse than an unresolved one. The independence rule in 7.1 is the same argument
applied earlier.

**When both legs reproduce and still differ**, the disagreement was in the question rather than the answer.
That is a category contract defect: two readings of the same contract at the same block produced two valid
outputs, so the contract underdetermined something. Both legs are paid, both are marked correct and the
case is logged against the `contractVersion` for `03-TAXONOMY.md` to tighten. Silently picking one would
hide the only signal that tells us the contract is loose.

**A disagreement never resolves through a dispute.** `09-DISPUTES.md` decides whether a buyer was wronged
on one job. Grading a fan-out is our own conformance step and it happens before either deliverable is shown,
so a buyer sees the verified answer plus the discrepancy rather than a queue ticket.

### 7.3 Decomposition into a chain

A chain exists because a real question crosses two contracts. The demo case is concrete: read a Venus
position, then produce the rebalancing plan that acts on it. Six rules.

**The chain is quoted whole, before the first hire.** The buyer sees `sum(legPrice)` against their ceiling,
each leg named with its listing and its price and nothing is dispatched until they accept the total.
Quoting leg by leg as the chain unfolds is how a buyer ends up committed to a total they never agreed.

**Each leg is a full hire.** Its own `quoteId`, its own `requestHash`, its own payment to its own provider.
Non-custodial means we never take one payment and split it, so a two-leg chain is two settled payments to
two `agentWallet` addresses (`08-MONEY.md`).

**Leg `k + 1` receives leg `k`'s validated output, never its prose.** The bridge between two legs is the
downstream `inputSchema`, populated from the named outputs of the upstream contract. Free text from one
agent is never handed to another as an instruction. That is the injection boundary and it is the same rule
the transport layer states: implementations must sanitise agent-supplied content and must validate file
references against SSRF (`R12-agent-comms.md`, A2A's own media type registration). `14-GAPS.md` owns the
sanitiser and `15-SYSTEM.md` owns the SSRF guard. The matcher's part is refusing to compose two legs whose
schemas do not meet.

**One pinned block for the whole chain.** Leg 2 reads at the block leg 1 pinned, so the plan acts on the
position that was actually read. Without that a chain silently mixes two states, which is the failure
`R09-bsc-defi.md` measured as 2.9e16 wei of apparent formula error from six blocks of drift.

**Failure attributes to the leg, then the chain stops.** Leg 2's failure does not mark leg 1, whose work
was delivered and paid. The chain's own record carries `failedAtLeg` plus that leg's fault class. The
buyer pays for the legs that delivered and nothing for the leg that did not. Failover inside a chain is
the same section 6 machinery applied to one leg, with the chain's remaining budget as that leg's ceiling.

**No automatic re-planning.** If leg 2 fails on every candidate, we do not invent a different
decomposition. The intent ends, the buyer keeps leg 1's output plus its receipt and the panel offers the
single-leg alternatives explicitly. A matcher that reshapes the job after taking money is a matcher whose
receipts cannot be checked against what was agreed.

### 7.4 What ships by 2026-09-09 in this section

Fan-out at `r = 2` in the two decidable categories, with all four independence tests enforced and the
agreement or disagreement rendered, plus the two-leg chain from a health-factor read to a rebalancing plan,
both against live BSC. A subcontract hop is accepted where a listing declares it, since 04 already defines
the disclosure. We do not expect one in this window.

**Whose legs the r = 2 render actually uses, said here rather than left to be inferred.** A rendered
agreement needs two legs that both delivered. The measured population supplies no second independent
third-party candidate in any of the four categories, which 7.1's shortfall paragraph and open question 1
both state. So a buyer's fan-out on submission day dispatches one leg and prints the shortfall line. The
two-leg render is exercised by a **house** fan-out, `origin: house` on both legs, against two first-party
listings in one decidable category on distinct hosts under distinct owner addresses. That is the one place
the fourth independence test is relaxed. It is relaxed because the test exists to stop a buyer paying
twice for one answer while a house run pays with our money: both legs are labelled first-party on the
panel and neither counts in any revenue or volume figure. It needs a second first-party listing in that
category, which is one more deployment rather than another mechanism.

Documented as next: fan-out above `r = 2`, chains longer than two legs, the diff view for the two
non-decidable categories rendered as a visual comparison rather than a field table, plus any automatic
re-planning, which is a product decision rather than a missing function.

## 8. Buyer override

**A buyer who names a listing gets that listing.** Naming a `listingId` in the intent skips ranking, skips
the band, skips the draw and skips the exploration slot. The record carries `selectionBasis: buyerNamed`
and the receipt says so, which is also what makes `09-DISPUTES.md`'s N6 ("I would have picked a different
agent") a settled question rather than an argument.

Three levels of override exist, all of them buyer-side:

| Override | What it does | Precedent |
| --- | --- | --- |
| a named `listingId` | that listing is dispatched, no ranking runs | ours |
| an explicit sort or filter set | the buyer's own order decides, so the band draw and the exploration slot are both off | a shipped provider router disables load balancing whenever an explicit sort is set (`R13-prior-art.md`) |
| an include or exclude list | ranking runs inside the buyer's own candidate set | same source, `provider.only` and `provider.ignore` |

### 8.1 What an override waives and what it cannot

| Constraint | Waivable by the buyer | How |
| --- | --- | --- |
| ranking, band, draw, exploration | yes, that is the whole feature | naming the listing |
| the pair blocklist | yes, it is the buyer's own list | one confirmation, recorded |
| the price ceiling | yes, by restating it | the buyer raises the number. We never dispatch above a ceiling the buyer left in place |
| liveness below T2, a stale probe, a failing probe | yes, with a fresh probe first. See below | one confirmation showing the last probe result |
| `categoryBasis: text`, our own guess about what the agent does | yes | the buyer is naming the agent, so our classification is no longer load bearing |
| at capacity | no, but queued | the buyer is offered the queue position plus the estimated wait rather than a refusal |
| sanctions screening | **never** | `isSanctioned` `0xdf592f7d` on `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` plus our own SDN ingest, on buyer, payee and registered wallet (`R15-compliance.md`) |
| the self-dealing block | **never** | funding-cluster overlap between buyer and payee (section 2). An override would make it a feature |
| `visibility: suspended` or `delisted` | **never** | a suspension is an adverse decision with reasons and an appeal behind it (`09-DISPUTES.md`). A buyer cannot overturn our own enforcement and the page says which decision applies plus where the appeal is |
| the category contract's `inputSchema` | no | the job would fail on arrival. The panel names the field instead |

**The fresh probe, because "always gets that agent" has to survive contact with a dead endpoint.** When a
named listing's last probe failed or is older than 15 minutes, we run one probe inside the published 8,000
ms budget and show the result before anything is signed. A pass dispatches. A failure refuses the hire with
`probe_failing`, offers the buyer an alert when the endpoint next answers plus the ranked alternatives,
then takes no money. That is the one case where a named listing is not dispatched. It exists because the
alternative is charging a buyer for a call we already knew would not connect.

**No silent failover under an override.** A named listing gets a chain of length zero by default: the
buyer named one agent, so substituting another is the worst thing the matcher could do. A single control,
"or the next best if this one fails", builds the chain from the ranked set and is off unless the buyer
turns it on. When it is on, every rule in section 6 applies unchanged.

## 9. Explainability: the why-this-agent panel

The test for this panel is a stranger with no Agent Studio knowledge reading it once and agreeing. That is
the Functionality criterion's own bar, quoted in `00-PROGRAM.md`: land, find an agent by category,
understand what it does, activate it, with minimal friction and no dead end.

### 9.1 The shape

**One sentence first, everything else on demand.** The sentence is generated from the two highest
contributions plus the price, in that order, with units:

> Picked because it passed 96 of its last 98 checks, has 16 settled jobs on this shelf scoring 62 out of
> 100 and quotes 0.25 USD1 against your 0.50 limit. The second-ranked candidate for this job was 0.087
> behind on our published scale.

The runner-up line names the ordering because there are two: the dispatch ranking in section 3 and the
shelf ladder `03-TAXONOMY.md` publishes. Every gap the panel quotes is on the dispatch ranking.

Then, expandable, the six terms with the value, the weight, the contribution and the source of each, sorted
by contribution so the reader sees what actually decided it rather than the formula's own order:

| Term | Value | Weight | Contribution | Where it came from |
| --- | --- | --- | --- | --- |
| reliability, R | 0.9286 | 0.25 | 0.2322 | 96 of 98 probes passed in 24 h, Wilson lower bound |
| delivered quality, Q | 0.62 | 0.30 | 0.1860 | 16 settled jobs, `06-QUALITY.md`, interval shown |
| contract coverage, C | 1.00 | 0.15 | 0.1500 | every named output of `health-factor` v1 produced |
| evidence freshness, F | 0.9565 | 0.10 | 0.0957 | last probe 40 s ago |
| price value, P | 0.5000 | 0.15 | 0.0750 | 0.25 USD1 against a 0.25 category median |
| evidence tier, E | 1.00 | 0.05 | 0.0500 | E4, a live Altana session you can read and revoke |
| **rank** | | | **0.7888** | `rank-1.0.0`, block 120,027,164 |

Then three blocks the panel always carries, in this order:

**What we did not pick.** The runner-up by name with the gap on the same scale, then the exclusion counts
by reason from section 2: "9 listings excluded: 4 over your ceiling, 3 not machine-callable, 1 stale probe,
1 at capacity", each count opening the list behind it.

**How this choice was made.** Seven lines, each a fact rather than a reassurance: the pinned block, the
weights version, whether the band draw fired and with what probabilities, whether the exploration slot
fired and which listing it displaced, whether this was a buyer override, whether this listing is
first-party, then this listing's position in the shelf ladder whenever that is not the top row. The last
line exists because the shelf leads on `evidenceTier` and dispatch does not, so the two can name different
listings for the same intent and a stranger comparing them deserves the reason on the page rather than a
contradiction.

**Check it yourself.** A link to the decision record, `GET /v1/decisions/<intentHash>`, no auth, plus the
one-line command that recomputes the rank from the published term values. The record carries: `intentHash`,
`category`, `contractVersion`, `pinnedBlock`, `weightsVersion`, one row per candidate with all six term
values and their inputs, the exclusion reason per excluded candidate, the band membership, the draw weights
and the seed, the chosen `listingId`, the ordered failover chain, `selectionBasis`, the exploration flag,
the first-party flag per candidate and the freshness stamp of every number in it. It is a `ledgerEntry` of
kind `dispatchDecision` rather than a new collection, so `15-SYSTEM.md` gets no new field to place.

**`intentHash`, defined once, because four things key on it.** It is the path segment above, the join key
of the replay in 10.2, the anchor of the dispatch record in 6.6 and the assignment key of the holdout in
10.4, so two implementations that disagree about it make all four unbuildable:

```
intentHash = keccak256(utf8(canonicalJson({
  category, contractVersion, inputs, ceiling: {amountBase, token, decimals},
  needBy, redundancy, listingId, sessionConstraint, intentSalt
})))
```

`canonicalJson` is `04-AGENT-PROTOCOL.md`'s one function, keys sorted at every depth, compact separators,
every non-ASCII code unit escaped, which is the same recipe the ERC-8183 `negotiation_hash` uses and is
already reproduced against live jobs. So there is no field order to specify: the sort fixes it. Absent
optional members are absent rather than null, `listingId` and `sessionConstraint` included.

Two rules on that preimage, both about privacy. **The buyer address is not in it**, so the hash is not a
function of who asked. And `intentSalt` is 16 random bytes generated at freeze time and **never published**,
which is what makes the rest safe: category, a contract version, a ceiling and a `needBy` are low-entropy
against a public set of addresses, so a hash over them alone at a no-auth URL is grindable and would
identify buyers rather than protect them. The salt lives in the withheld half of the `dispatchDecision`
body, the `entryHash` covers the whole body, then the buyer can be shown their own salt. A stranger cannot
reverse the key and does not need to: what the record makes checkable is the arithmetic, not the preimage.

### 9.2 Four rules that keep the panel honest

**Every term in the formula appears in the panel and no term appears in the panel that is not in the
formula.** That is a testable property rather than an intention: the panel's term set equals the key set of
the published weight vector, asserted the same way `conformance` asserts anything else. It is also the
anti-favouritism mechanism in section 10 expressed as a UI rule, since a hidden bonus term would have
nowhere to render.

**Every number carries its freshness stamp.** Block, timestamp, source, per SPINE. A rank with no block is
a number about a chain state nobody can name.

**Plain words, with four phrases banned outright.** No "best", no "recommended for you", no "optimal", no
"AI-selected". The compliance boundary behind that is drawn in section 2, where the MiFID II 2017/565
Article 9 two-limb test and its recital 14 safe side are quoted in full. The panel states criteria and a
comparison addressed to everyone who loads the page. "Picked by these criteria" is what we can defend.
"Best for you" is a different regulated activity.

**When we do not know, the panel says so in the same place it would have shown the number.** Q on a listing
with no settled job reads "no settled job yet, so this term enters at 23.7 of 100, which is what our
formula returns with no evidence, contributing 0.071", never a zero and never a blank. The number it prints
is
the one the formula consumes, because 9.1 invites a stranger to recompute the rank and a figure that does
not reproduce it is worse than no figure: 23.7 at weight 0.30 is the 0.071. The point estimate of 50 stays
off the panel, on `06-QUALITY.md`'s rule that a 50 with no evidence reads as a rating and is not one. A
source that is down shows the source, its own lag and
the last value with its age, which on 2026-09-05 meant saying that the 8004scan chain-56 indexer reported
`status: down` with a checkpoint about 32 hours old (`R05-8004scan-api.md`). An empty panel is a gap. A
labelled unknown is data quality.

## 10. Anti-favouritism

We will run first-party agents. `02-THESIS.md` settles that and gives the reason: with 0 of 600 sampled
agents payable by a stranger and about 518 agents across the four categories at 0.17% of the index, some
shelf would otherwise have nothing hireable on it, which fails Functionality and Agent Diversity together.
So the question this section answers is not whether our own supply exists. It is why it cannot win by
default and how somebody who distrusts us can check.

### 10.1 Five rules

**Rule 1, no first-party term, enforced by the function signature rather than by discipline.** The ranker
takes a projection of the listing record that has no `owner` field in it, so a first-party bonus is not
policed, it is unrepresentable. `02-THESIS.md` clause 4 states the commitment ("No term in the ranking
function may read the first-party list") and this is the construction that keeps it true after somebody
edits the ranker in a hurry.

**Rule 2, the tie-break runs against us.** Where two ranks tie within 1e-6 and one candidate is first-party
and the other is not, the third-party candidate wins, ahead of the price and sample-size keys in section 3's
tie-break ladder. This is a deliberate extension of clause 4 rather than a contradiction of it: the rank
carries no first-party term, the tie-break does, so it can only ever cost us a dispatch. It is also
unexploitable by a rival, since nobody can make themselves first-party.

**Rule 3, the exploration slot never selects a first-party listing** (section 5). Our own listings will be
cold at launch and will pass conformance first because we wrote the suite, so a slot keyed on "no settled
jobs" would hand us the exploration budget on day one.

**Rule 4, no operator payment can move position, at all, in v1** (section 2, family 4). There is no boost, no
sponsored slot, no paid placement and no revenue-share tier that touches the order. The disclosure that
would otherwise be required is replaced by removing the thing it would disclose. The alternative is
expensive: UCPD Annex I point 11a makes undisclosed paid ranking unfair in all
circumstances (`R15-compliance.md`) and P2B Article 5(3) requires a platform where money can move ranking
to describe those
possibilities and their effects (`R13-prior-art.md`).

**Rule 5, at most one leg of a fan-out comes from our own operator list** (section 7.1). Three structural
independence tests on owner, cluster and host all pass for two of our own listings under two of our own
published addresses, so redundancy bought from us twice would look independent and prove nothing. This is
rule 3's argument moved from selection to redundancy. It binds every `origin: order` dispatch. 7.4 says
where a house demonstration relaxes it and why that costs a buyer nothing.

The legal frame those rules are shaped by, all read from primary text in `R13-prior-art.md`: P2B Article
5(1) requires the main ranking parameters plus the reasons for their relative importance, with 5(6)
permitting an operator to withhold detail that would enable manipulation. P2B Article 7(1) requires a
description of any differentiated treatment a platform gives its own goods or those of anyone it controls,
including 7(3)(b) ranking specifically. DMA Article 6(5) bans self-preferencing in ranking outright for a
designated gatekeeper: "The gatekeeper shall not treat more favourably, in ranking and related indexing and
crawling, services and products offered by the gatekeeper itself than similar services or products of a
third party." We are not a gatekeeper and we adopt the gatekeeper rule anyway, because it is the only
version of this that a judge can check. And 16 CFR 465.6 makes it an unfair practice to misrepresent that a
site or entity you control provides independent reviews, which is the same logic applied to presenting our
own seeded supply as an ecosystem.

One honest note about the field. `R13-prior-art.md` looked for an operator that labels first-party listings
inside its own catalogue and did not find one: the closest comparable does not distinguish its own actions
from anybody else's and its trust badge marks a partner rather than a first party. So this is a gap in the
prior art rather than a template we are copying, which is exactly why shipping it is visible.

### 10.2 How it is audited, by a stranger, with our own data

An assertion that our ranking is neutral is worth nothing. Three artifacts make it falsifiable and all three
already exist for other reasons.

**1. Replay.** Every dispatch publishes its decision record with all six term values per candidate
(section 9.1). Recompute `rank_i` from those values with the published `rank-1.0.0` weights and compare the
order to the order we acted on. Any hidden term, first-party or otherwise, shows up as a replay that
disagrees with the published choice. This is the same property `06-QUALITY.md` gives the score with
`score.json`, applied to the order rather than to the number.

**2. Expected against realised.** The band draw is probabilistic, so the honest test is not "did a
first-party listing ever win" but "did it win more often than its own published draw probabilities". For
every dispatch where a first-party listing sat in the band, the record already carries that listing's draw
weight, so summing those probabilities gives the expected number of first-party wins and the realised count
is a fact. An illustration with made-up counts, labelled as one: 40 dispatches with a first-party listing in
the band at an average draw probability of 0.31 gives 12.4 expected wins with a standard deviation of 2.93,
so a 95% interval of roughly 6.7 to 18.1. A realised 13 is unremarkable. A realised 31 is a defect and the
page would be showing it before anybody asked.

**3. Eligible share against dispatch share, per category, published daily.** Two percentages side by side:
the first-party fraction of eligible candidates and the first-party fraction of dispatches. `02-THESIS.md`
clause 8 already commits to publishing the first-party share of hireable rows and wanting it to fall. This is
the dispatch-side twin of that number and the two together are what stop "four categories, deeply covered"
from quietly meaning four categories we built.

The command a stranger runs is the boring part and that is the point: fetch the decision records for a
window from the public read API, recompute the six terms, compare the order, sum the draw probabilities,
count the wins. No auth, no permission, no cooperation from us beyond the data we publish anyway.

**What the audit shows at zero dispatches, which is what submission day looks like.** Artifact 1 replays
whatever dispatches exist and is exact at any count including one. Artifact 2 needs a first-party listing to
have sat in a band, so at zero dispatches the expected column is 0.0 and the page prints "no dispatch with a
first-party listing in the band yet" rather than an interval around nothing. Artifact 3 splits: the
eligible-share half is a real percentage from day one, because eligibility is computed per shelf render,
while the dispatch-share half is undefined on an empty denominator and the page prints "no dispatches yet"
in its place with the eligible share still beside it. A percentage over zero dispatches is not a small
number, it is not a number.

### 10.3 What this audit does not catch

Two things, said plainly rather than left for somebody to find.

**A category contract written to suit our own agent.** If the `health-factor` contract's named outputs
happen to be exactly what our reference agent produces, C rewards us without any first-party term existing.
The mitigations are not in the matcher: `03-TAXONOMY.md` publishes every contract with its version,
`04-AGENT-PROTOCOL.md` publishes the conformance suite probe by probe with an operator-side runner and
`10-DOCS-AND-POLICY.md` publishes the change route. What the matcher contributes is the C term's own
breakdown per candidate in the decision record, so a third party can see exactly which optional output cost
them the points and argue about that output rather than about our motives.

**A first-party listing that is genuinely better.** The audit is designed to detect favouritism rather
than competence. If our own agent wins because it reproduces `getAccountLiquidity` to the wei while a rival
misreads the core-pool getters then it deserves the dispatch. That is why rule 2 is a tie-break rather than a
handicap. `02-THESIS.md` clause 7 covers the other direction: when a third-party agent beats ours on the
category metric it ranks above ours and the shelf shows it.

### 10.4 The holdout and what we can and cannot claim from it

The strongest instrument here is a randomised holdout on our own ranking. The reason to name it is that
one live marketplace runs exactly that: a small percentage of job posts get a placebo auction where nothing
is charged and every proposal is ranked organically, with assignment random and independent of the client,
which is what licenses the causal number they publish (`R13-prior-art.md`).

What ships by 2026-09-09 is the part that makes a holdout possible later at no extra cost: every dispatch
already records the full ranked set, the weights version, the band, the draw probabilities and the seed, so
the counterfactual order is reconstructible after the fact for every job we ever brokered.

What does not ship is the holdout itself. `02-THESIS.md` already lists it as next rather than shipped. A 2%
control arm needs dispatch volume we will not have in this window. An arm that size over the number of
dispatches four days can produce measures nothing. Publishing a lift figure from it would be the exact kind
of unearned number this document keeps refusing. The design is settled so it can be switched on when
volume exists: 2% of intents assigned by hashing `intentHash` rather than by anything about the buyer, the
control policy being rank by price alone inside the eligible set, the arm recorded in the decision record,
the buyer's experience otherwise identical and the claim it would license being a difference in delivered
rate between the two arms with an interval on it.

## What ships by 2026-09-09

Shipped means running against live BSC with its output visible on the public site.

| Ships | Note |
| --- | --- |
| the eight-stage pipeline, one pinned block per pass | no stage gates on a third-party index. The only external dependency anywhere is the candidate agent itself at stage 5, capped at 3 s |
| the five hard-constraint families with a reason code per distinct condition | shown to the buyer as counts with examples, never as an empty shelf |
| `rank-1.0.0` published in full, coefficients included | the six terms, the two partitions, the tie-break ladder, the per-category C signals |
| the banded weighted draw, δ = 0.05, inverse-square price plus the load nudge | with the draw probabilities in the panel and in the record |
| the failover chain | 3 attempts, the fault-class trigger table, the settle lock taken at the paid call with an explicit `pending` branch, at most one settled leg per intent, the attempt list live on the job page |
| stage 8, the intent's four terminal states | `delivered`, `refused`, `exhausted`, `blocked`, each closed by a `ledgerEntry` and no new collection |
| the exploration slot with all five bounds, plus house runs | ε = 0.10 of counted dispatches, the size being `06-QUALITY.md`'s constant. House runs in all four categories tagged `origin: house` at ledger append |
| buyer override | the waiver table, the fresh-probe rule, no silent failover, `selectionBasis: buyerNamed` on the receipt |
| the why-this-agent panel plus `GET /v1/decisions/<intentHash>` | no auth, `intentHash` defined and salted, every term with its source, the exclusion drawer, the recompute line, the shelf position where it differs from the pick |
| anti-favouritism | the ownerless projection, the tie-break against ourselves, the slot exclusion, the fan-out cap on our own legs, the replay, plus the two percentages per category with the dispatch half labelled rather than faked at zero dispatches |
| fan-out at `r = 2` in the two decidable categories, plus the two-leg chain | all four independence tests, the shortfall line where no second independent candidate exists, the `r = 2` render exercised as a house demonstration (7.4) |
| the Thompson counters `S` and `F` per agent per category | recorded from job one, not used for dispatch selection. The shelf card's occupant is `03-TAXONOMY.md`'s hourly rotation and the dispatch substitute is section 5's uniform draw, so no bandit selects anything |

Documented as next, not shipped, plus said that way everywhere:

- Thompson sampling as the selector, with the switch condition already published: at least 8 agents in a
  category each holding at least 5 settled jobs.
- The sealed-bid round, first price with a published reserve, closing at the earlier of 5 s or all quotes
  returned. It needs bidders that price on demand and 0 of 600 sampled agents are payable by a stranger
  today (`MEASUREMENT.md`).
- The 2% randomised holdout. The record it needs already ships (section 10.4).
- Fan-out above `r = 2`, chains longer than two legs, the visual diff for the two non-decidable categories.
- Batched matching across intents. It only pays when jobs arrive faster than they complete, so at our volume
  a batch is one intent plus a delay (`R13-prior-art.md`).
- Cross-token price ceilings beyond tokens with a verified on-chain mark. Today that means a token with a
  listed Venus market and everything else shows "quoted in `<token>`, not converted".

## Decisions and rejected alternatives

**1. Dispatch is a banded weighted draw. Display is a different function.** Rejected: deterministic argmax
for
dispatch. The four mandated categories are thin, with the most generous single keyword per category
returning 47, 20, 430 and 21 agents and summing to 518 or 0.17% of the index (`MEASUREMENT.md`), so argmax
in a category of 20 hands every job to one operator and starves the records we need. Rejected in the other
direction: an unbanded lottery, which hands work to materially worse listings. δ = 0.05 keeps the draw
inside candidates our own published function calls equivalent. Rejected also: one function for both
surfaces. The shelf leads on `evidenceTier` because browsing has no intent and no quote
(`03-TAXONOMY.md`), so the two orders can name different listings and the panel prints the shelf position
rather than pretending they agree.

**2. A sealed-bid auction is specified and not shipped.** Rejected as the v1 selector. It needs bidders that
can price a job on demand inside the buyer's latency budget and the supply measurement says they do not
exist: 12 of 600 machine-callable, 0 of 600 payable by a stranger, 97 lifetime ERC-8183 providers of which
28 hold a completed job and one address holds 56,167 of the jobs (`MEASUREMENT.md`, `R16-reuse.md`), with
whether that address is one operator or a router **unverified**. Where
it ever ships it is first price with a published reserve, not second price, because the live multi-slot
marketplace auction that prior art actually runs is pay-your-bid. The generalised second-price version is
not truthful anyway (`R13-prior-art.md`).

**3. A bandit is not the v1 selector, its counters ship anyway.** Rejected: Thompson sampling now. It won
the published production comparison on real data at 3.72% CTR regret against 4.14% for LinUCB, 4.98% for
epsilon-greedy and 5.00% for exploit-only, plus it is specifically robust to the delayed rewards a paid job
produces (`R13-prior-art.md`). It is still wrong today, because a Beta posterior with no observations is the
category prior, so a bandit at launch is the prior plus noise, which is the one thing the panel in
section 9 cannot explain. The switch condition is published rather than left to taste.

**4. Eligibility is hard, preferences are soft and price is on the hard side.** Rejected: one scored
function with price as a term only. A ceiling that can be outvoted by a quality term charges a buyer more
than they agreed. The production split we follow puts a price ceiling in the hard set where it blocks the
request outright while throughput and latency targets only deprioritise and explicitly guarantee nothing
(`R13-prior-art.md`).

**5. Q is the lower bound of the interval, not the point estimate.** Rejected: the point estimate, which is
the number most marketplaces sort on. The published Wilson behaviour is the argument: 2 of 2 perfect scores
0.3424 while 45 of 50 scores 0.7864 and 900 of 1000 at the same 90% ratio scores 0.8798
(`R13-prior-art.md`). One lucky job cannot leapfrog a record and no fraud detection is required for that to
hold.

**6. The coefficients are published.** Rejected: publishing the parameter list and the thresholds while
withholding the weights, which is what the operators in the prior art do and what P2B Article 5(1) plus the
5(6) carve-out permits (`R13-prior-art.md`). We publish them because every term is a measurement an operator
improves by improving. The one gameable term is Q and its defence is the shrinkage plus `06-QUALITY.md`'s
detections rather than secrecy. A published vector is what makes section 10's audit something a stranger
runs rather than something we assert.

**7. Feasibility is two stages, cheap before ranking and expensive on the top 5.** Rejected: probing every
eligible candidate before ranking. Probing 47 agents to hire one spends the buyer's deadline and is rude to
46 operators. Rejected also: ranking with no live check, which is how a marketplace dispatches to a listing
whose session expired an hour ago.

**8. Failover pays at most once and a settled leg that fails conformance is a dispute rather than a
retry.** Rejected: automatic re-dispatch after a settled failure, which is a second charge for one intent
however it is labelled. The handoff is a `dispute` row, `raisedBy: muster` with reason code D1 or D3, whose
remedy is `09-DISPUTES.md`'s ladder, which starts with one re-run at no new charge and refunds if the
re-run fails the same assertion. An earlier form of this decision named a `refundIntent` record and asked
the buyer to authorise a fresh hire. Neither exists: `08-MONEY.md` and `09-DISPUTES.md` both settle that
there is no such record, then the re-run is the buyer's entitlement rather than something they pay for
again.

**9. On the escrow rail the chain is walked before `fund`.** Rejected: re-pointing a funded job with
`setProvider` `0xc9a84bb9`, because whether the kernel permits that on a `1 FUNDED` job is unverified and no
product path may rest on an unverified guard. Rejected: a short `expiredAt` to get a fast refund, because
`expiredAt` must clear `submittedAt + disputeWindow` or the job becomes refundable before it can ever settle
and an honest provider cannot be paid, with `disputeWindow()` at 604,800 s on mainnet (`R02-erc8183.md`).

**10. A fan-out is graded against chain, never by majority vote, with at most one leg of ours.** Rejected: a
three-way quorum, which
sounds like redundancy and is not: all 12 machine-callable agents in the 600-agent sample are one product on
one host, so a majority of correlated supply is one agent voting three times (`MEASUREMENT.md`). Rejected
also: independence on owner, cluster and host alone. Our own operator addresses are published as a list, so
three structural tests pass on two of our own listings while the answer has one maker. The fourth test caps
`origin: order` legs from that list at one, which costs us the easiest two-leg demonstration and is the
point of it.

**11. Buyer override is absolute except for screening, self-dealing and our own enforcement.** Rejected: a
literally absolute override. Sanctions screening is not ours to waive (`R15-compliance.md`), a self-dealt
dispatch buys the agent the one number the ranking trusts. A suspension is an adverse decision with reasons
and an appeal behind it, so a buyer cannot overturn it from a URL. Rejected in the other direction: a
priced exclusivity override, where a named agent keeps the job unless somebody beats it by a set margin.
That is a real mechanism in the prior art (`R13-prior-art.md`) and it swaps out the agent the buyer named,
which is the one thing an override exists to prevent.

**12. The tie-break runs against our own agents.** Rejected: strict neutrality on ties, which is what
clause 4 of `02-THESIS.md` alone would give. A coin flip between our listing and a stranger's is defensible
yet unprovable to somebody who distrusts us. The asymmetry costs us at most the ties. It cannot be
gamed, because nobody else can become first-party.

**13. Human buyers sign lazily, machine buyers pre-sign the chain.** Rejected: always pre-signing, which
costs a person three wallet prompts for a failure path that should be rare. Rejected: always re-signing,
which stalls an autonomous hire at the first timeout with nobody there to click. The rail forces one
authorisation per payee, so the only real choice is when the buyer produces them.

**14. No operator payment moves position in v1.** Rejected: a disclosed paid boost, which P2B Article 5(3)
permits with a description of the possibilities and their effects (`R13-prior-art.md`). A marketplace whose
first revenue lever is placement has to defend every ranking claim it makes afterwards. We would rather
have nothing to disclose.

**15. The exploration budget is ε = 0.10 of counted dispatches and its size is not ours to set.** Rejected:
fixing the number here. `06-QUALITY.md` owns the size of both exploration budgets and publishes them as one
card per shelf plus ε = 0.10 of counted dispatches, so this document consumes that constant and owns the
draw, the five bounds and the substitution. Rejected: expressing it as a percentage of traffic or of
impressions, which is what an earlier pass of this lane carried and which needs impression accounting a
judge has to take on trust. Dispatches in our own `ledger` have a denominator we publish. Rejected: pinning
it to `R13-prior-art.md`'s tuned 0.01, which is the best epsilon on a display-advertising stream and over
the dispatches four days can produce would be no exploration at all, the failure the same file names.
Rejected: a bandit for the slot occupant, on decision 3's argument, which is why the shelf card rotates
deterministically and the dispatch substitute is a uniform draw.

**16. A house run runs in all four categories.** Rejected: house runs in `yield` and `health-factor` only,
on the argument that a plan cannot be graded against chain. That trade was backwards. `02-THESIS.md` clause
(c) is the only cold-start valve that puts a third-party row on a shelf, so the restriction left the
rebalancing and grid shelves with no valve at all and left Agent Diversity, a published criterion, to
whichever agents already hold a `COMPLETED` ERC-8183 job. A plan's stated inputs grade even where the plan
does not: the named-field diff in 7.2 plus four measured checks from `R08-pancakeswap.md`, the tier set, the
protocol cut, the oracle window and `weightsBefore` against the account's own balances. What a house run in
a plan category never buys is a claim that the plan was right. The receipt says so.

## Open questions

1. **Will a band ever have two members?** Every constant in section 4 assumes at least two eligible
   candidates in a category. Today 0 of 600 sampled agents are payable by a stranger and the four categories
   hold about 518 agents at 0.17% of the index (`MEASUREMENT.md`), so on 2026-09-09 a shelf may have one
   eligible listing plus a queue of near-misses. The draw, the chain and the fan-out all degrade to a
   deterministic pick, which the panel states rather than hides. This is the single biggest gap between the
   mechanism and its exercise.
2. **δ = 0.05 and ε = 0.10 are policy constants with no measurement behind them.** δ is ours. ε's size is
   `06-QUALITY.md`'s and it is a policy number there too. Both would need dispatch volume to tune, which four
   days will not produce. They are per-category
   adjustable so a later pass changes a config value rather than a design.
3. **Whether the kernel permits `setProvider` on a `1 FUNDED` job.** Unverified. Reading that guard would
   settle whether escrow failover can exist at all after funding. The answer changes nothing we ship,
   because the pre-fund chain is correct either way.
4. **What P means in a category of one.** `p̃_c` is the median eligible price and a median over one listing
   is that listing's own price, so P is 0.5 for the only candidate and carries no information. It is
   harmless, since a single candidate is dispatched deterministically, though it does make the term's value
   in the panel look more meaningful than it is on a thin shelf.
5. **Should a live dispatch failure weigh more in R than a synthetic probe failure?** Today each is one row
   in the same 24-hour window. A dispatch failure is better evidence, because a real request with a real
   payment behind it exercises paths a probe does not. Weighting it would need a second constant we cannot
   calibrate yet.
6. **Whether the one-hop funding-cluster check produces false positives.** `funder(buyer) == funder(provider)`
   is the published heuristic (`R13-prior-art.md`). A fresh buyer wallet funded by the same exchange hot
   wallet that once funded a provider would trip it. The habitual threshold of more than 25 events is what the
   source uses for confidence, so a single hit blocking a dispatch is stricter than the source's own
   standard. Every block is recorded with the two addresses so a false positive is arguable rather than
   invisible.
7. **Whether the enrichment source is up during judging.** 8004scan measured 20.8% then 56.7% non-200 across
   two windows on 2026-09-05 with its chain-56 indexer reporting `status: down`
   (`R05-8004scan-api.md`). Nothing in this pipeline gates on it, so the practical question is only how often
   the panel exercises its "source down" line in front of a judge.
8. **Which path a buying agent takes.** TermiX has said it will hire from submitted marketplaces. Which
   wallet it judges from plus whether it pays or expects a free trial are both unverified (SPINE's unverified
   list). If it names an agent it takes section 8's path and never sees the ranking at all, which would make
   the panel invisible to the one buyer we know is coming.
9. **How often two legs of a fan-out both reproduce and still differ.** That case routes to a category
   contract defect (section 7.2) and it has never been observed, because nobody has run a fan-out on this
   population. The frequency decides whether contract tightening is a rare event or a weekly job.
10. **Whether the address holding 56,167 of the 56,713 ERC-8183 jobs is one operator or a platform router.**
   Unverified. SPINE routes the question here because the ranking design is what depends on the answer.
   One operator means the biddable supply is one operator deep and an auction has nothing to discover. A router
   means many operators sit behind one address, so the supply is deeper than the count reads and the case for
   a sealed-bid round arrives sooner. Reading that address's code and its client set settles it, which is what
   SPINE names. Everything we ship holds either way, because nothing joins a Muster score to that address
   (`06-QUALITY.md` reaches the same conclusion from its own side).
