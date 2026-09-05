# 06-QUALITY: the signals, the score and what stops it being gamed

Written 2026-09-05. Build closes 2026-09-09 UTC+0. Vocabulary, component names, field names and every
constant come from `research/SPINE.md`. Population numbers come from `01-GROUND-TRUTH.md` and
`research/MEASUREMENT.md`. This document owns the signal families, the Muster score, one performance
metric per category plus the per-listing delivery-latency metric, the verified-outcome-only rule, the
Validation Registry, anti-gaming, cold start, the maintenance loop, delisting and the honesty surface. It
leaves the tier ladder's onboarding side to `05-ONBOARDING.md`, the probe and sweep cadences to
`05-ONBOARDING.md` and `15-SYSTEM.md`, the ranking function and exploration selection to
`07-MATCHING.md`, the on-screen wording of an unknown to `03-TAXONOMY.md`, the dispute lifecycle to
`09-DISPUTES.md` and storage to `15-SYSTEM.md`.

## 0. The rule the rest of the document follows

**Two numbers, never blended.** The **Muster score** answers one question: does this listing deliver
what it promised. The **category performance panel** answers a different one: was the work any good.
They are computed separately, displayed side by side and neither is folded into the other.

The reason is arithmetic, not taste. The score is a Bernoulli quantity, so it carries a sample size and
an interval a stranger can recompute. Category performance is a continuous measure in different units
per category (bps of excess return, seconds of alarm lead time, percentage points of APY gap), so
averaging it into a rating destroys both the units and the interval. Every rival ships the blend:
8004scan publishes a five-dimension composite with weights engagement 0.30, service 0.25, publisher
0.20, compliance 0.15, momentum 0.10 inside a 30 to 55 band and trust8004 sells a seven-dimension
score with a tier from `unverified` to `diamond` (`research/R05-8004scan-api.md`,
`research/R14-rivals.md`). On BSC, where 111 addresses wrote all 29,712 feedbacks, a composite that
puts 0.30 on engagement is 30% a measurement of one spam campaign.

Three consequences that bind every later section:

1. A number Muster shows carries its freshness stamp (block, timestamp, source), its sample size and
   its interval. A number missing any of those is not shown at all.
2. Only a settled paid job moves the score. Everything else is displayed with its author and its date.
3. Every automatic adverse action emits a statement of reasons and has an appeal route.

## 1. Signal families

Seven families. The **scores** column is the whole design in one column: exactly one family moves the
Muster score.

| Family | Answers | Carried by | Scores | Freshness target |
| --- | --- | --- | --- | --- |
| **F1 Settled outcome** | did a paying buyer get what the listing promised | our own `ledger` plus `payment` rows and ERC-8183 `getJob` `0xbf22c457`, `JobSettled` topic `0x771fbd01…96fc` | **yes and only this** | event driven, plus a nightly pass at a pinned block |
| **F2 Category performance** | was the work good, in the category's own units | our `sampler` series plus pinned-block reads of PancakeSwap, Venus, Lista and Aave | no, shown beside the score | 7-day rolling window, recomputed hourly |
| **F3 Reachability and conformance** | can a stranger call it at all | `prober` and `conformance` against `tokenURI` `0xc87b56dd` and the declared service endpoints | no, it gates the shelf | 10 min for a live listing |
| **F4 Control and payee** | does the operator control this agent and where does money land | `ownerOf` `0x6352211e`, `isApprovedForAll` `0xe985e9c5`, `getAgentWallet` `0x00339509`, `getMetadata(id,"agentWallet")` `0xcb4799f2`, `setAgentWallet` `0x2d1ef5ae` | no, it gates the hire | every indexer sweep |
| **F5 Foreign reputation** | what did somebody else write on chain about this agent | `getClients` `0x42dd519c`, `getLastIndex` `0xf2d81759`, `readAllFeedback` `0xd9d84224`, `readFeedback` `0x232b0810`, `getSummary` `0x81bbba58`, `NewFeedback` topic `0x6a4a6174…febc` | **zero weight, always displayed** | hourly for listed agents |
| **F6 Attestation and accountability** | is a human answerable and is the agent's authority bounded | BABT `balanceOf` `0x70a08231`, Galxe Passport, BNB Passport reader, Altana `canExecutePackedInfos` `0xe5adda71`, `spendInfos` `0xdcc09ebf`, `getExpiry` `0x3b49ad47` | no, it sets caps and the tie-break | read at request time, 60 s cache |
| **F7 Validation** | did a named suite run against this endpoint at a named block | `validationRequest` `0xaaf400c4`, `validationResponse` `0x3d659a96`, `getAgentValidations` `0x8d5d0c2d`, `getSummary` `0x1b7cabd6` | no, it is a badge with a hash | on approval and on drift |

Four notes the table cannot hold.

**F1 has no ERC-8004 call, because ERC-8004 has no notion of a paid job.** The registries carry
identity, free-form feedback and validation. Money lives on ERC-8183 or on our own payment rail, so
F1 is joined from `payment.txHash` plus `escrowJobId` and never from the reputation registry. That is
why the score is ours to compute rather than ours to read.

**F5's most useful fields exist only in the event log.** `endpoint`, `feedbackURI` and `feedbackHash`
are emitted by `NewFeedback` and never written to storage, so a marketplace that wants the evidence
behind a rating has to index logs (`research/R01-erc8004.md`). Two asymmetries go with it:
`getSummary` reverts `clientAddresses required` on an empty array while `readAllFeedback` with an empty
array falls back to every client that ever rated the agent, so `readAllFeedback` is the only
client-list-free read path. `feedbackIndex` is 1-indexed per `(agentId, clientAddress)` pair and index
0 always reverts.

**F5 is arithmetic over spam, measured.** A whole-chain sweep of every id 0 to 334,934 found 4,406
agents with any feedback (1.32%), 29,712 feedbacks written, 0 revoked and **111 distinct authors**, with
95 agents holding half of it and the busiest author rating 1,800 agents. Of 950 sampled rows, 844 tag a
persona trait, 68 tag uptime or response time and **none tags a financial outcome**
(`research/MEASUREMENT.md`, read at block 120,027,164, 2026-09-05T02:02:32Z). Separately, the last 3,000
BSC feedbacks came from 31 addresses, the top 10 of them wrote 65.3%, one address left 12 feedbacks on a
single agent and none of the 12 heaviest reviewers holds any attestation
(`research/R10-bab-attestation.md`). A star rating computed from this ranks a Telegram advertisement
first.

**F3 is the scarce signal, so it is a gate rather than a score term.** Of 600 uniformly sampled agents,
233 declare a concrete `http(s)` endpoint, 230 answer, **12 answer as a machine surface** (2.00%, 95%
Wilson 1.15 to 3.46) and **0 are payable by a stranger** (0.00%, 95% 0 to 0.64). All 12 machine-callable
agents are one product on one host. On the whole chain, 5 agents have a verified endpoint domain and 3
of those belong to one operator. Reachability is therefore the difference between a listing and a row,
which is why it decides shelf placement and never adds points.

## 2. The Muster score

### What it answers

For one listing in one category: **of the paid jobs a buyer settled through Muster, what share were
delivered to the listing's own contract, weighted by size, decayed by age, capped per buyer and shrunk
toward the category baseline until the evidence earns its own weight.** The `quality` component computes
it. It surfaces as the spine's `musterScore`, `scoreLowerBound` and `scoreSampleSize`.

It is not a rating of advice, not stars, not a trust score and not comparable across categories with
different baselines. Every intermediate term below is published per job in the listing's audit row, so
nothing here is a black box. `score.json` is a projection rather than a stored collection, so it needs
no table of its own: every field in a row is either a SPINE field on `job` and `payment` or a pure
function of the eight constants, computed on read. The one derived value worth a cache is
`buyerCluster`, the union-find component id from section 6.2, because that is recomputed nightly rather
than per request.

### Symbols

| Symbol | Meaning | Units |
| --- | --- | --- |
| `l` | one listing, that is one agent offered under one category contract | |
| `c` | the listing's category: `rebalancing`, `grid`, `yield` or `health-factor` | |
| `J` | the counted set: jobs on listing `l` that reached a paid terminal state with a settled `payment` row and `origin = order` | |
| `b` | one buyer cluster, defined in section 6.2. A lone address is a cluster of one | |
| `v_j` | outcome of job `j`, **1** delivered to contract, **0** not | 0 or 1 |
| `a_j` | the job's price | base units of `payment.token` |
| `a_c` | the median counted price in category `c` over the trailing 30 days, undefined until `N_c` reaches `k` | same |
| `w_j` | size weight, `clamp(sqrt(a_j / a_c), 0.5, 2.0)`. It is 1 while `a_c` is undefined | dimensionless |
| `t_j` | age of the job, now minus `terminalAt` | days |
| `H` | decay half-life | days |
| `lambda` | `ln 2 / H` | per day |
| `d_j` | decay factor, `exp(-lambda * t_j)` | dimensionless |
| `C` | per-buyer contribution cap | effective jobs |
| `beta_b` | buyer-tier multiplier for cluster `b` | dimensionless |
| `phi_b` | cluster scaling, `beta_b * min(1, C / rawN_b)` | dimensionless |
| `N` | effective sample size after capping | effective jobs |
| `S` | effective successes after capping | effective jobs |
| `mu_c` | category baseline success rate | 0 to 1 |
| `m` | prior strength | effective jobs |
| `z` | interval constant | |
| `M` | the Muster score, point estimate | 0 to 100 |
| `M_lo` | the lower end of the 95% interval and the sort key | 0 to 100 |

### The formula

```
d_j    = exp(-lambda * t_j)              lambda = ln(2) / H
w_j    = clamp(sqrt(a_j / a_c), 0.5, 2.0)     when N_c >= k
       = 1                                    when N_c <  k, the launch case

rawN_b = sum over j in J_b of  w_j * d_j
rawS_b = sum over j in J_b of  w_j * d_j * v_j
phi_b  = beta_b * min(1, C / rawN_b)

N      = sum over b of  phi_b * rawN_b
S      = sum over b of  phi_b * rawS_b

n_eff  = N + m
p_hat  = (S + m * mu_c) / n_eff
M      = 100 * p_hat

M_lo   = 100 * ( p_hat + z^2/(2*n_eff)
                 - z * sqrt( (p_hat*(1 - p_hat) + z^2/(4*n_eff)) / n_eff ) ) / (1 + z^2/n_eff)
M_hi   = 100 * ( p_hat + z^2/(2*n_eff)
                 + z * sqrt( (p_hat*(1 - p_hat) + z^2/(4*n_eff)) / n_eff ) ) / (1 + z^2/n_eff)
```

The `w_j` fallback exists because `a_c` is a median over counted jobs and the counted set starts at zero
on 2026-09-09 (section 7). Without it the one term every score multiplies through would be undefined for
the first job in every category. It falls away at the same count that lets `mu_c` carry its own weight,
and `score.json` publishes which of the two rules produced each `w_j`.

`p_hat` is the posterior mean of a Beta with pseudo-counts `alpha = m*mu_c + S` and
`beta = m*(1 - mu_c) + (N - S)` and it is identical to the published Bayesian weighted rating
`(v/(v+m))*R + (m/(v+m))*C` with `v = N`, `R = S/N` and `C = mu_c` (`research/R13-prior-art.md`). `M_lo`
is the Wilson lower bound in its canonical published form, evaluated on the shrunk pseudo-counts. `M_hi` is
the same expression with the sign of the square-root term flipped. Both ends of the interval on the card come
from there, so nothing on screen is left to a builder to infer. We publish `alpha` and `beta` beside them so
anyone preferring the exact Beta quantile can compute it.

The category baseline is itself shrunk, one level up, so a category with no history cannot invent one:

```
mu_c = clamp( (S_c + k * mu_0) / (N_c + k), 0.40, 0.90 )
```

where `S_c` and `N_c` are the same sums over every counted job in category `c`, `k` is the category
prior's own strength and `mu_0` is the launch baseline. Recomputed nightly at a pinned block and
published with that block.

### Constants, with the reason each one is that number

| Constant | Value | Why |
| --- | --- | --- |
| `mu_0` | **0.50** | Not invented. The neighbouring venue on the same chain uses the same baseline: TermiX's reputation contract `0xFf3f7038c4919A420B30D7B3533cb386D5898189` returns `getScore(1) = 50` for an agent with no settled history (`research/R07-termix.md`). The alternative on the table was 0.80, which is the illustrative prior `research/R13-prior-art.md` tunes its worked shrink with for a market that already has volume. No file in the corpus measures an aggregate success rate for any freelance market, so 0.80 is a tuning value rather than a fact about one. It also describes a population with settled jobs where ours has none |
| `m` | **10** effective jobs | The prior stops being the majority of the answer at 10 counted jobs. Below that a listing is visibly provisional. `research/R13-prior-art.md` uses 20 for illustration and IMDb uses 25,000 for a chart with millions of votes; 10 is the smallest value that still kills the single-perfect-job attack and the table below shows what it costs |
| `H` | **30** days | A policy constant, labelled as one. The operator practice we can point at is Steam splitting a 30-day window from lifetime and Upwork taking the best of 6, 12 and 24 months (`research/R13-prior-art.md`). No measurement fixes this number, so we publish it, show the undecayed lifetime figure beside the decayed one and never claim it was derived |
| `C` | **3** effective jobs | One buyer cannot make a listing look proven. This is the wash-trade defence as arithmetic rather than as detection (section 6.1) |
| `beta_b` | **1.00** or **0.35** | 1.00 for a cluster holding an attestation (BABT, Galxe Passport or a BNB Passport hit) or with a settled job at least 7 days older than this one. 0.35 otherwise. 0.35 is chosen so three fresh anonymous buyers weigh about one established buyer |
| `k` | **20** effective jobs | The category baseline needs more evidence to move than a single listing does, so `k` is twice `m`. It does a second job: it is also the count at which `a_c` becomes a trustworthy denominator, so `w_j` falls back to 1 below it rather than dividing by a median drawn from one or two prices |
| `z` | **1.96** | The published Wilson constant for a 95% interval, with `z^2 = 3.8416`, `z^2/2 = 1.9208`, `z^2/4 = 0.9604` (`research/R13-prior-art.md`) |
| `mu_c` clamp | **0.40 to 0.90** | One good week in a thin category cannot push the baseline to self-congratulation and one bad week cannot make every listing in it unhireable |

Every one of these eight is published on the public methodology page with this table's reasons and
changing one is a human decision that appears in the changelog (section 8). Publishing the parameters
and the thresholds while withholding nothing is the strong end of what operators actually do: Fiverr
publishes its six inputs and its level thresholds while hiding the weights, IMDb publishes the chart
formula and refuses the page one and P2B Article 5(1) requires the main parameters with 5(6) carving out
anything that would enable manipulation (`research/R13-prior-art.md`). Nothing in this formula is
manipulable by knowing it, because the only input an operator controls is settled paid work.

### What makes `v_j` a 1

Four conditions, all checked by `conformance` after delivery and before the job's outcome is written:

1. The job reached a paid terminal state. On our own rail that is a settled `payment` row with a
   `txHash` and a `blockNumber`. On the official escrow that is ERC-8183 status `3 COMPLETED`, reached
   either by the evaluator or by the permissionless `settle` `0x39c2ebb9` after `submittedAt +
   disputeWindow`, which is 604,800 s on mainnet (`research/R02-erc8183.md`).
2. The deliverable hash reproduces under the job's declared `deliverableRule`. Three incompatible
   conventions are live on the official rail at once and one producer ships an empty `optParams` so its
   deliverable cannot be checked from chain at all, which is why the rule is recorded per job rather
   than assumed.
3. The output satisfies the listing's `outputSchema` and the category contract's named outputs.
4. **Every number the deliverable asserts reconciles.** `conformance` re-runs the reads the deliverable
   claims, at the deliverable's own pinned block and compares. Position principal and uncollected fees
   reproduce to the wei against a simulated `collect` and `decreaseLiquidity`
   (`research/R08-pancakeswap.md`); Venus account liquidity reproduces to the wei against
   `getAccountLiquidity` `0x5ec88c79` and `getBorrowingPower` `0x528a174c`
   (`research/R09-bsc-defi.md`). A fabricated figure is therefore a failed delivery, not a matter of
   opinion.

A correct refusal is not in `J` at all. A refusal that names the failed condition and takes no money is
a success in the product sense, it is counted in the listing's `refusalRate` and shown on the card and
it never touches `S` or `N`. A job the buyer paid for and never received an answer to is `v_j = 0`. A
dispute the buyer wins is `v_j = 0` and the job keeps its dispute id.

### Worked examples

Computed with the constants above at `w_j = 1`, which is the launch rule. The first two rows are what a
listing actually looks like on 2026-09-09: the counted set starts at zero that day (section 7) and a buyer
with no attestation and no older settled job carries `beta_b = 0.35`, against 6 of 585 sampled agent
owners holding a BABT.

| Case | `N` | `S` | `M` | interval | what the card says |
| --- | --- | --- | --- | --- | --- |
| no settled job | 0 | 0 | 50.0 | 23.7 to 76.3 | `provisional (n=0)` with "no settled job yet" under it, the number suppressed |
| 4 clean jobs, 3 **fresh anonymous** buyers, ages 0 to 3 days | 1.353 | 1.353 | 56.0 | 29.4 to 79.5 | `beta_b = 0.35` on all three, the launch-day shape |
| the same 4 jobs, 3 **attested** buyers | 3.865 | 3.865 | **63.9** | 38.3 to 83.5 | "63.9, 95% interval 38 to 84, 4 jobs from 3 buyers" |
| the same plus one failure today | 4.865 | 3.865 | 59.6 | 35.3 to 80.0 | one failure costs 4.3 points at this sample size |
| 12 clean jobs, **one** buyer | 3.000 | 3.000 | 61.5 | 35.5 to 82.3 | the cap binds at `phi_b = 0.283` |
| 12 clean jobs, **six** buyers | 10.602 | 10.602 | **75.7** | 54.2 to 89.2 | the same work, spread, is worth 14 points more |
| 12 clean jobs, six **fresh anonymous** buyers | 3.711 | 3.711 | 63.5 | 37.9 to 83.3 | `beta_b = 0.35` on all six |
| 20 clean jobs, 7 buyers | 20.0 | 20.0 | 83.3 | 66.4 to 92.7 | |
| 18 of 20, 7 buyers | 20.0 | 18.0 | 76.7 | 59.1 to 88.2 | 90% raw reads as 76.7 |
| 45 of 50 | 50.0 | 45.0 | 83.3 | 72.0 to 90.7 | the same 90% raw, more evidence |
| 200 clean, many buyers | 200.0 | 200.0 | 97.6 | 94.5 to 99.0 | |

The two rows in bold are the point of the whole design. Twelve clean jobs bought by one address score
61.5. The same twelve bought by six addresses score 75.7. Nobody has to detect anything for that gap to
exist.

Decay, with `H = 30`:

| Age of the whole record | `N` from 20 clean jobs | `M` |
| --- | --- | --- |
| today | 20.0 | 83.3 |
| 15 days | 14.14 | 79.3 |
| 30 days | 10.0 | 75.0 |
| 60 days | 5.0 | 66.7 |
| 90 days | 2.5 | 60.0 |
| 365 days | 0.004 | 50.0 |

Recency also decides how much a failure hurts. Ten clean jobs 90 days old plus one failure today gives
`M = 51.0`. Ten clean jobs today plus the same failure gives `M = 71.4`. A stale record does not
protect a listing that just broke.

### The interval a buyer sees and why it is Wilson

The card shows `M` as the headline, the interval as "95% interval 38 to 84", the raw job count and the
distinct buyer count. The default sort uses `M_lo`, never `M`, so a listing cannot outrank a
better-evidenced one on the strength of a tiny sample. That is the same reason the published Wilson
treatment exists: 2 of 2 perfect scores 0.3424 and 45 of 50 scores 0.7864 (`research/R13-prior-art.md`).

Wilson on the shrunk counts against the exact Beta quantile, both computed:

| `N` = `S` | `M` | Wilson lower | Beta 2.5% lower |
| --- | --- | --- | --- |
| 0 | 50.0 | 23.7 | 21.2 |
| 3 | 61.5 | 35.5 | 34.9 |
| 5 | 66.7 | 41.7 | 41.9 |
| 20 | 83.3 | 66.4 | 68.3 |
| 200 | 97.6 | 94.5 | 95.2 |

Wilson sits about 2 points above the Beta bound between zero and three jobs, below it from five jobs on and
within a point by 200. We ship Wilson because it needs one square root, reproduces identically in any
language a judge might use and its published form has precomputed constants. We publish `alpha` and
`beta` because that costs two fields and lets anyone disagree with our choice by computing their own.

### A stranger can recompute it

Every listing publishes `score.json` on the read API with no auth: the eight constants, `mu_c` with the
block it was computed at, `a_c` with a flag saying whether `w_j` came from the price ratio or from the
launch fallback and one row per counted job carrying `jobId`, `escrowJobId`, `txHash`, `blockNumber`,
`terminalAt`, `buyerCluster` (a hash, not an address), `a_j`, `w_j`, `t_j`, `d_j`, `v_j`, `phi_b` and the
reason for any zero. `M`, `M_lo`, `M_hi`, `alpha` and `beta` follow from those rows with one sum. This is the Data Quality answer stated as a property rather than a claim: the score is not merely
published, it is re-derivable from published rows and if our arithmetic is wrong anyone can show it.

### Two honesty rules the decay must obey

**Inactivity converges to the baseline, never to zero.** As every `t_j` grows, `N` goes to 0 and `M`
goes to `mu_c`. A listing that stops selling drifts back to 50 and stops there. Both operators who
publish a rule here say the same thing: absence of evidence must not be punished and a score must not
fall through inactivity alone (`research/R13-prior-art.md`).

**The lifetime figure stays on the page.** Beside the decayed score the card shows the undecayed
lifetime counts, so a reader can see exactly what the decay did. When the newest counted job is older
than two half-lives, the card carries a "record is 60 days old" stamp rather than quietly presenting an
old number as current.

### Scope: per listing, per category, never pooled

One agent may hold up to four listings, one per category. Each carries its own score. The uniqueness
invariant behind that is `15-SYSTEM.md`'s, one listing per `(agentId, category)` enforced by a unique
index, so "four" is a consequence of there being four categories rather than a cap of its own. A grid
record says nothing about health-factor competence, so nothing is pooled across categories. The listing page shows the agent's
other categories as context with their own counts. The rejected alternative is a hierarchical
agent-level pool with per-category shrinkage, which is better statistics once volume exists and is
exactly wrong at launch, because it lets one category's record flatter three empty ones. That is the
Agent Diversity failure the rubric punishes, produced by our own formula.

## 3. One performance metric per category, plus one that spans them

A grid agent's win rate and a yield agent's APY are not the same kind of number, so one metric cannot
serve four categories. Each category gets one headline metric plus a fixed envelope. All four are
specified to the same depth, because Agent Diversity is a published criterion and the page says
single-category submissions score poorly. A fifth metric, delivery latency, is per listing rather than per
category and carries the identical envelope.

### The envelope every metric carries

Ten fields, identical across all five. A metric missing any of them is displayed as unknown rather than
rendered.

| Field | Meaning |
| --- | --- |
| `metric` | the named headline, one per category |
| `value` with `unit` | the number, with bps, seconds or percentage points spelled out |
| `window` | `[firstBlock, asOfBlock]` plus both timestamps. BSC blocks are 0.45000 s apart, so the ordering key is `(blockNumber, transactionIndex, logIndex)` and never a wall clock |
| `observations` | fills, round trips, alarms or samples in that window |
| `benchmark` | the counterfactual, computed over the identical window and marked at the identical blocks |
| `risk` | the category's risk measure, never omitted |
| `basis` | `live`, `backtest` or `staged`. A backtest labelled as a backtest costs nothing. An unlabelled one loses the criterion |
| `costs` | gas paid, swap cost and protocol fees, subtracted before the headline |
| `excludes` | the named things the number does not contain |
| `recompute` | the exact command a stranger runs, plus the pinned block |

Two rules that apply to all four. Every read in one report comes from **one pinned block**: three blocks
of skew moved a position's `amount0` by 0.63 bps and an unpinned Venus recompute disagreed with the chain
by 2.9e16 wei, which looks like a formula error and is six blocks of drift
(`research/R08-pancakeswap.md`, `research/R09-bsc-defi.md`). And **measured and advertised are never
blended**: where a protocol publishes its own figure we show ours beside theirs and show that they
reconcile, because the gap is the product.

These definitions are also the ones the Agent Advantage Report uses, so the report and the shelves
cannot disagree. `13-PARTNERS.md` owns the report.

### Delivery latency, the one metric that is per listing rather than per category

**Headline: median elapsed seconds from dispatch to accepted deliverable, with p90 beside it.** The four
headline metrics above measure whether the work was any good. This one measures how long it took, which is
a different question and the one a buyer comparing two listings asks second.

```
elapsedSeconds = job.deliveredAt - job.startedAt        per job, over the counted set J only
medianElapsed  = median(elapsedSeconds)
p90Elapsed     = 90th percentile(elapsedSeconds)
```

It carries the identical ten-field envelope, with `observations` as the count of counted jobs in the
window, `window` as `[firstBlock, asOfBlock]` and `basis` as `live`. `benchmark` is the published median
delivery time of the nearest venue's listings, cited with its source and its date rather than asserted
(`13-PARTNERS.md` holds the comparator). `excludes` names three things every time: refused jobs, because a
refusal is a success in the product sense and its clock measures a different act; disputed jobs until the
dispute closes, because the accepted-deliverable timestamp is what is in dispute; and any job whose
`startedAt` or `deliveredAt` is missing, which is counted and reported rather than dropped silently.

It is per listing, not per category, because latency is a property of one endpoint under one contract and
averaging it across four categories would mix a health-factor alarm with a rebalance plan. `/compare`
renders it per row. It is distinct from `probeResult.latencyMs`, which is round-trip time on a liveness
probe: a fast probe on a slow worker is exactly the case a buyer needs to see separated, so both are shown
with their own labels and neither is presented as the other.

### rebalancing

**Headline: net excess return against the never-rebalanced counterfactual, in bps of starting value.**

```
V_start, V_end        position value at the two pinned blocks, marked at the same oracle
HODL_end              the starting inventory, unrebalanced, marked at asOfBlock
netExcessBps = 10000 * ((V_end + feesCollected + rewards - costs) - HODL_end) / V_start
```

For a concentrated LP position the value function is
`V(p) = 2*L*sqrt(p) - L*p/sqrt(pb) - L*sqrt(pa)` inside the range, with the all-token0 and all-token1
branches outside it and `HODL(p) = x(p0)*p + y(p0)`. That function is verified: principal and
uncollected fees reproduce a simulated `decreaseLiquidity` and `collect` to the wei at a pinned block
(`research/R08-pancakeswap.md`). It also settles a live error worth naming: the official published
impermanent-loss table gives a plus or minus 10% range 0.03% IL at a 2x move where the correct figure is
-30.66% and full range 0% at 5x where the correct figure is -25.46%.

Supporting fields, all displayed: `inRangeFraction` from `snapshotCumulativesInside(tickLower,
tickUpper).secondsInside` deltas divided by wall-clock elapsed; `feeApr` at the position level with
`pool.liquidity()` as the denominator, on a 7-day basis, net of the protocol fee read from
`slot0().feeProtocol` rather than assumed, because the 0.01% tier pays LPs 0.0067%; `cakeApr` on the
`lmPool.lmLiquidity()` basis, where only 48.95% of the staked liquidity in the pool measured was in range
earning anything. For a portfolio rebalancer the same envelope carries `targetWeights`, `weightsBefore`,
`weightsAfter`, `driftBps` at trigger and the trigger rule.

**Window** 7 days rolling, plus a lifetime figure that opens at the first sample of our own series and
never at `firstTradeBlock`. There is no free BSC archive, so a window that predates our own sampling
cannot be measured: the panel renders `not-measured` for it. Where a partial answer is still useful it
labels the figure "since our series began <date>". **Risk** realised volatility of position
value from daily log returns annualised by sqrt(365), reported beside the volatility of the benchmark, so
a rebalancer that underperforms a trend while halving volatility reads as doing its job. **Excludes**
unclaimed farm rewards, out-of-range time already counted in `inRangeFraction`, plus any Merkl or Incentra
campaign that is not live at `asOfBlock`. Report a negative excess as a negative number.

### grid trading

**Headline: win rate per round trip, with net P&L against the hold-the-starting-inventory benchmark
beside it.** Never per fill. A grid strategy only buys below and sells above its reference, so every
individual fill is a "win" by construction and a per-fill win rate is meaningless to anyone who trades.

```
roundTrip     = a buy fill matched FIFO to the sell fill that closed that grid level
winRate       = count(roundTrip.netPnl > 0) / count(roundTrip)
profitFactor  = sum(wins) / abs(sum(losses))
grossPnlQuote = sum(quoteDelta) + finalBaseInventory*mark(asOfBlock)
                               - initialBaseInventory*mark(firstBlock)
gasCostQuote  = sum(gasUsed * gasPriceWei * bnbPriceQuote1e18) / 1e36
netPnlQuote   = grossPnlQuote - gasCostQuote - sum(protocolFeePaid)
benchmarkPnl  = initialBaseInventory * (mark(asOfBlock) - mark(firstBlock))
excessReturn  = netPnlQuote - benchmarkPnl
```

Every term in `netPnlQuote` is in base units of the quote token. The gas term needs the scale spelled out
because it starts in a different unit: `gasUsed * gasPriceWei` is BNB wei, `bnbPriceQuote1e18` is quote base
units per whole BNB scaled 1e18 and read from the same oracle at the same pinned block, so the product
carries 1e36 of scaling that has to come off. A gas cost that skips the divide is a trillion times too
large and reads as a catastrophic strategy.

Every fill resolves to a BSC transaction: `txHash`, `blockNumber`, `logIndex`, `side`, `baseDelta`,
`quoteDelta`, `executionPrice1e18`, `oraclePrice1e18` from the Venus ResilientOracle
`0x6592b5DE802159F3E74B2486b091D11a8256ab8A` as an independent mark, `gasUsed`, `gasPriceWei`,
`slippageBps`, `gridLevel`, `gridSpacingBps` and the inventory after. A claimed fill with no `txHash` did
not happen (`research/R09-bsc-defi.md`). Fills are read from the pool's `Swap` topic
`0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83` (`research/R09-bsc-defi.md`), whose
seven non-indexed words carry both protocol-fee fields.

The benchmark is load bearing in this category more than any other: a grid that made 4% while BNB rose
30% lost. Marking the same starting inventory at the same oracle at the same two blocks is the only
comparison that means anything.

**Window** `[firstBlock, asOfBlock]` where `firstBlock` is the first fill in our own series, with the
round-trip count printed beside it, plus a 7-day slice. A whole-life figure back to `firstTradeBlock` is
not available: there is no free BSC archive, so fills before we started watching cannot be read and the
panel renders that span as `not-measured` or labels the number "since our series began <date>" rather
than implying a lifetime it could not have measured. Win rate over "the last 30 trades" is a selected
sample and is not displayed. **Risk** maximum drawdown of position value, peak notional exposure, peak
leverage and `worstHealthFactor` if the strategy ever borrowed, which is null rather than blank when it
did not. An annualised excess over realised volatility is shown as "excess per unit vol" and never as a
Sharpe ratio, because it is not one. **Excludes** unrealised inventory drift beyond the marked value, MEV
losses not visible in the fill, plus any fill on a venue we do not index.

### yield

**Headline: realised APY measured from state, beside the advertised APY, with the gap in percentage
points.** Two numbers and their difference, never one blended figure.

```
realisedApy   = (valueEnd / valueStart) ^ (31536000 / dtSeconds) - 1     net of costs
```

Advertised comes from the protocol, in the protocol's own unit and the three units are different:

| Protocol | Primitive | Annualisation |
| --- | --- | --- |
| Venus core | `supplyRatePerBlock()` and `borrowRatePerBlock()`, 1e18 per block | `((1 + r/1e18 * 192000)^364 - 1) * 100` reproduces `api.venus.io` to 4e-12. Blocks per year is Venus's own 70,080,000, confirmed on chain by the 300% deprecation rate `42808219178` |
| Lista Lending (Moolah) | `irm.borrowRateView` `0x8c00bf6b`, 1e18 per second | `exp(r/1e18 * 31536000) - 1`, matching the Taylor-compounded accrual |
| Aave v3 | `liquidityRate` in ray | already annual, no annualisation step |
| PancakeSwap pool | `feeUSD24h - protocolFeeUSD24h` | `/ tvlUSD * 365` and the position-level figure uses `pool.liquidity()` as the denominator |

Every stored rate carries the raw integer, the unit and the source call. A stored "4.58" has thrown away
the only thing that made it checkable. The exponent-364 form is labelled "as Venus publishes it" and the
mathematically honest 365 form is labelled as ours, with both shown; 365 differs on borrow by 0.013
percentage points (`research/R09-bsc-defi.md`).

**Window** 7 days rolling plus lifetime, both from our own `sampler` series, because there is no free BSC
archive: state reads fail beyond roughly 60 to 82 blocks and `eth_getLogs` is capped at 5,000 blocks on
the endpoints that answer at all. **Risk** the utilisation at both ends of the window, the liquidation
threshold and liquidation incentive that apply to the account rather than the pool, the leverage if the
position is looped, plus the exit queue on any liquid-staking leg. **Excludes** named every time: XVS
emissions, CAKE farm emissions, out-of-range time on a concentrated position, the protocol fee already
subtracted, plus any Prime boost, whose units the API leaves unresolved and which we therefore do not
display at all.

### health factor

**Headline: median alarm lead time in seconds, with the false-alarm rate and the miss rate beside it.**
A health-factor agent sells warning, so the metric measures warning: how long before the position could
have been liquidated did the alarm fire and how often was the alarm wrong or absent.

```
leadSeconds   = t(position first became liquidatable OR the deadline it would have)
                - t(our first alarm)                     per episode, median and p10
actedWithin   = alarms whose remedy transaction landed before liquidatability / alarms
falseAlarmRate = alarms where HF recovered without any action inside 1 hour / alarms
missRate      = liquidations on watched accounts with no prior alarm / liquidations
```

The health factor itself is derived, not read, on three of the four venues and each formula is exact:

| Venue | Health factor | Cross-check |
| --- | --- | --- |
| Venus core | `sumCollateral(LT) / sumBorrowPlusEffects`, with the per-market weight from `getEffectiveLtvFactor(account, vToken, 1)` `0x19ef3e8b` and prices from `ResilientOracle.getUnderlyingPrice` scaled `1e(36 - underlyingDecimals)` | recompute must equal `getAccountLiquidity` `0x5ec88c79` to the wei at a pinned block. A mismatch is the alarm |
| Lista Lending | `maxBorrow / borrowed` with `maxBorrow = floor(floor(collateral*collateralPrice/1e36)*lltv/1e18)` and `collateralPrice = 10^(36 + loanDecimals - collateralDecimals) * oracle ratio` | `isHealthy(marketParams, id, borrower)` `0x2c2c904f`, one call |
| Lista CDP | `(ink * spot) / (art * rate)` | `Interaction.currentLiquidationPrice(token, usr)` |
| Aave v3 | `getUserAccountData` field 6, scaled 1e18, `2^256-1` with no debt | it is the only literal health factor on BSC, so it is its own check |

Three facts decide what a good agent in this category even is, so the metric has to reward them. Venus
separates the collateral factor from the liquidation threshold on 12 of 55 core markets, so an agent
reading `getAccountLiquidity` as borrowing power is wrong by up to 3.9% of collateral value on a real
account and reads vLINK (CF 0, LT 0.63) as worthless collateral when it is still fully seizable. The
E-Mode liquidation incentive is 1.06e18 inside pool 1 against 1.10e18 in core, so "10% penalty on Venus"
is wrong for any account with `userPoolId != 0`. And Lista CDP evaluates liquidation against the stored
`spot`, which sat 0.229% above the live pip when measured, so the alarm is "live price crossed my
liquidation price" while "spot poked" is the deadline and `poke` is permissionless
(`research/R09-bsc-defi.md`).

**Window** 30 days rolling plus lifetime, with the episode count. An episode is one continuous approach
to the alarm threshold on one account. **Risk** the worst health factor the watched position reached, the
remedy's own risk posture (a scoped Altana session with a selector allowlist and a spend cap against full
custody, read live from the wallet by `session-panel`), plus whether
`isForcedLiquidationEnabled(vToken)` `0x8c1ac18a` was true at any point in the window, because it defeats
the shortfall check entirely. **Excludes** accounts the agent was not watching at the start of the
episode, protocols outside the four we read, plus any episode whose price history we could not sample
because it predates our own series.

### The unknown case, in all five

A listing with no measurable record shows `observations: 0` beside `03-TAXONOMY.md`'s `unknown, never
checked`, never a zero standing alone and never a blank. `trades: 0` is a fact. An empty panel is a gap
(`research/R09-bsc-defi.md`). A metric we cannot compute because a source is down renders as `stale, <age>
old (last good at block N)` with the source named, its own lag and our last value. Section 10 holds the
whole mapping from our knowledge states to those strings.

## 4. Verified outcomes only

### What counts

A job enters `J` when all four hold: it carries a Muster `quoteId`, its `payment` row is settled with a
`txHash` and a `blockNumber`, its `origin` is `order` and it reached a paid terminal state. That is it.
The rail may be `eip3009`, `permit2Exact`, `permit2Upto`, `escrow8183` or `directTransfer`, since the
question is whether money moved against a quote we hold, not which signature moved it.

`origin = house` is the mechanism that stops us seeding our own numbers. The `ledger` enforces the tag at
append time and house-funded jobs never touch `S` or `N`. They appear on the receipt trail labelled as
house runs, because hiding them would be worse than showing them.

### What does not count and why each exclusion holds up

| Excluded | Reason |
| --- | --- |
| ERC-8004 feedback from anywhere | `giveFeedback` has one guard, `require(!isAuthorizedOrOwner(msg.sender, agentId))`, so it blocks the agent's own wallet and nothing else. It costs gas and proves nothing (`research/R10-bab-attestation.md`) |
| an ERC-8183 job we did not broker | we hold no request hash, no deliverable rule and no reconciliation for it. Three incompatible deliverable conventions are live at once and one producer ships empty `optParams`, so a COMPLETED status on a stranger's job is not evidence the work was right. It is displayed in its own panel from `escrow-index` |
| a job whose buyer is inside the listing's own control set | section 6.4 |
| a job in a window flagged anomalous | section 6.3 and it stays visible |
| a completed job with a house origin | see above |
| 8004scan's `total_score`, `health_score` or `average_score` | cited with their algorithm name and their date, never ours. Their `health_score` reads 100.0 for an agent whose certificate does not match its own hostname and whose verification error had sat unrefreshed for 108 days |

The precedent for the split is Steam, which lets anyone write a review and counts only accounts that
bought the product on Steam toward the score, key activations excluded
(`research/R13-prior-art.md`). On BSC the payment is already the primitive, so the split costs one join.

### Foreign ERC-8004 feedback: displayed in full, trusted nowhere

The panel is titled with its provenance, "written on chain by other people, not by Muster" and each row
shows the author address, that author's distinct-agent count across the whole chain, the raw `value` with
its `valueDecimals`, `tag1` and `tag2` verbatim, the tx hash, the block and whether that author has ever
settled a job with this listing through Muster. No average, no stars, no arrow.

Five display rules, each earned from a measurement:

1. **One row per author per agent** by default, the most recent, with the author's distinct-agent count
   beside it. One address left 12 feedbacks on a single agent and the highest `feedback_index` seen is
   18, so an unbounded list is a megaphone.
2. **The census sits at the top of the panel**: 111 authors wrote all 29,712 feedbacks on BSC, 844 of 950
   sampled rows tag a persona trait and none tags a financial outcome. A reader who sees that reads the
   rest correctly.
3. **Never render `appendResponse` as the operator's reply** unless the responder is `ownerOf` or an
   approved operator. Anyone may append a response to anyone's feedback.
4. **Rescale by `summaryValueDecimals`** if `getSummary` is ever quoted. It averages in 18-decimal fixed
   point then truncates to the **modal** decimals of the inputs, so mixing a decimals-0 score of 87 with a
   decimals-2 score of 9977 returns an answer in whichever occurred more often
   (`research/R01-erc8004.md`). Today decimals 0 dominates.
5. **Tag the spam** where the pattern is unambiguous, with the reason shown rather than the row hidden.
   The dominant `tag2` on chain is a Telegram handle.

### What Muster writes back to chain

Two writes, with a hard line between them.

**The buyer writes the rating.** After a job settles, the `broker` offers the buyer a pre-filled
`giveFeedback(agentId, value, valueDecimals, tag1, tag2, endpoint, feedbackURI, feedbackHash)`
`0x3c036a7e` with `value = round(100 * outcome)`, `valueDecimals = 2`, `tag1 = "musterOutcome"`,
`tag2 = jobId`, `endpoint` set to the endpoint actually called, `feedbackURI` pointing at the public
receipt and `feedbackHash` equal to the receipt's `contentHash`. The buyer signs it or does not. We never
sign it for them and the score does not change either way, because the score already counted the job.

**Muster writes only `appendResponse`.** `appendResponse(agentId, clientAddress, feedbackIndex,
responseURI, responseHash)` `0xc2349ab2` is open to anyone, so we use it for exactly one purpose: to
attach our reconciliation to a foreign feedback row, pointing at a report that says what we measured and
at which block. Muster never calls `giveFeedback` from its own address about a listing it ranks. That is
self-dealing on a public registry and it would make our own score an input to itself.

## 5. The Validation Registry

**It exists on BSC and it has never been used.** `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`,
implementation `0xDB31f5d9167f8ebc8B30FbBF814c4d297c2D7F99` at 5,876 bytes, `getVersion()` `2.0.0`,
`getIdentityRegistry()` returning the identity registry. Across 1,999 sampled agent ids
`getAgentValidations` returned empty every time and 8004scan reports `total_validations: 0` and
`total_validators: 0` platform-wide, marks its own validator certification `[DEPRECATED]` and does not
list the contract at all. The other full index reports `validation: null` for BSC. Both indexes are wrong
about the chain rather than the chain being empty (`research/R01-erc8004.md`, `research/R14-rivals.md`).
Chain 97's validation proxy is a stub whose `getIdentityRegistry()` reverts, so validation is a
mainnet-only mechanism for us.

One risk to record rather than discover later: the validation proxy's upgrade authority is a **single
EOA**, `0x8888d0A88ef8302dfa4BA53c41c2fE3c4E486f42`, where identity and reputation sit behind a 3-of-5
Safe. We pin the implementation address and show a banner if it moves (section 8).

### When we request a validation

Exactly two triggers, at most one open request per listing:

1. **First pass.** A listing reaches a shelf, meaning it cleared the conformance suite against its
   category contract. One `validationRequest` per listing per `contractVersion`.
2. **After drift.** A pinned-hash drift event fired (section 6.6) and the re-run passed. A new request
   with a new `requestHash`, so the on-chain trail shows the re-validation rather than overwriting it.

`validationRequest(address validatorAddress, uint256 agentId, string requestURI, bytes32 requestHash)`
must come from the agent's owner or an approved operator: a random EOA reverts `Not authorized` and the
owner simulates clean. The guard is OpenZeppelin's, `_isAuthorized(ownerOf(agentId), spender, agentId)`
(`research/raw/erc8004-src-IdentityRegistryUpgradeable-2026-09-05.sol`). A per-token
`approve(muster, agentId)` satisfies it exactly as well as a blanket grant. So the default we ask for is
the per-token approval, one agent at a time. That is an explicit request to `05-ONBOARDING.md` for its
onboarding checklist rather than a step this document can add on its own.
`setApprovalForAll(muster, true)` is offered only as the operator's own choice with the cost stated: it
authorises transfer of **every** agent NFT that owner holds in the collection, not only the one being
validated. Where the operator grants nothing we hand them the prepared transaction to sign.
`requestHash` is caller-chosen and must be unique, since reusing one reverts `exists`, so ours is
`keccak256(listingId || contractVersion || suiteVersion || pinnedBlock)`. `validator` may not be the zero
address.

### Who validates

**We do and we say so on the badge.** There is no third-party validator on BSC, so pretending otherwise
is not an option: zero validators exist anywhere the public index covers. The validator address is
published, its assertion set is published and the badge reads "validated by Muster's own suite" rather
than "validated". P2B Article 7 requires a platform to describe differentiated treatment of anything it
controls and DMA Article 6(5) bans ranking self-preference outright for a designated gatekeeper
(`research/R13-prior-art.md`), so a first-party validator that is silent about being first party is the
one version of this we cannot ship.

### What a response means

`validationResponse(bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash,
string tag)`, with `response` bounded to 0 to 100 and `resp>100` reverting. We define the byte precisely
so nobody can read it as a rating:

```
response     = round(100 * assertionsPassed / assertionsTotal)      of the named suite
tag          = "conformance-v1"  on the first pass
             = "recheck-v1"      on a scheduled or drift re-run
responseURI  = the machine-readable report: assertion, verdict, httpStatus, observedAt, prober, block
responseHash = keccak256 of the report's canonical bytes
```

The same validator may respond repeatedly on the same `requestHash` with a different `tag`, which is how
the standard expects progressive states to work, so the trail reads as a history rather than a single
verdict. `getValidationStatus(requestHash)` returns `(validator, agentId, response, responseHash, tag,
lastUpdate)` and reverts `unknown` for a hash nobody requested. `getSummary(agentId, validators, tag)`
`0x1b7cabd6` returns `(count, averageResponse)` and accepts an empty validator array, unlike the
reputation registry's version.

In words, on the badge: **a validation says a named suite ran against a named endpoint at a named block
and how many of its assertions passed.** It is not an audit, not a rating of output quality and not an
endorsement. Its weight in the Muster score is **zero**, because the validator is us.

Shipping one real request plus one real response on BSC mainnet is an artifact no rival has, since the
mechanism has never fired on this chain. The committed number is **four pairs, one per category**, on
listings we own, because a third-party listing needs its operator's approval and no approval can be
assumed before the operator gives it. Four is what four categories means at launch and it is the number
section 11 ships. Beyond that we claim no more for it than what the previous paragraph says.

## 6. Anti-gaming

### The response ladder

Four outcomes, no others, because every restriction owes a statement of reasons and a reason cannot be
written against an outcome that was never defined (`research/R15-compliance.md`).

| Outcome | What it does | Who can trigger it |
| --- | --- | --- |
| **note** | a labelled fact on the listing, nothing else changes | automatic |
| **weight zero** | the affected jobs stay visible in `score.json` with a reason and contribute nothing to `S` or `N` | automatic |
| **suppress** | the listing leaves the default shelf sort and the exploration slot, stays findable by search and by direct link, with the reason shown | automatic on every detector that runs automatically. A ring flag is the exception, since that detector is hand-run (6.5) |
| **delist** | `visibility = delisted`, out of search, receipts stay published with the notice attached | human only |

Payment block is a fifth lever and it belongs to `09-DISPUTES.md` and `screening`, not here. Nothing in
this section deletes a record. Deleting looks like suppression of unfavourable content and the sentiment-
neutral filter list is what keeps withholding defensible, so we withhold weight and never rows
(`research/R13-prior-art.md`, 16 CFR 465.7(b)).

### 6.1 Wash trading, detection `self-financed`

**The attack.** An operator buys its own listing's jobs from a second address it funded, paying real
money to itself minus fees, then walks up a record.

**The detection.** One hop of funding provenance, the published heuristic, plus a count threshold:

```
self_financed(buyer, provider) := funder(buyer) == provider
                               OR funder(buyer) == funder(provider)
habitual(listing)              := count(counted jobs where self_financed) > 25
```

`funder(x)` is the sender of the first inbound native or stablecoin transfer to `x` that we can observe.
The published version of this heuristic found 262 habitual wash traders on Ethereum NFT sales denominated
in Wrapped Ether, 110 of them profitable and 152 losing money at it (`research/R13-prior-art.md`). For an
agent marketplace the query is cheaper than it is for NFTs, because both sides of every job are addresses
we already index and we hold the settlement transaction.

**The limit, stated.** BSC has no free archive: `eth_call` at tip minus 1,000 returns 403 and `eth_getLogs`
is capped at 5,000 recent blocks on the endpoints that answer. So `funder(x)` is resolvable only inside our
own observation window or from a paid archive and where it is not resolvable the row carries
`funderUnknown` rather than a guessed answer. This is why the cap in section 2 is the primary defence and
this detection is the secondary one: `C = 3` needs no provenance at all.

**The response.** `self_financed` on a job: weight zero, note on the listing. `habitual`: suppress plus a
human review. Both keep the jobs visible with the reason.

**The false-positive guard.** A shared funder is common and innocent: an exchange withdrawal address, a
paymaster or a treasury funds thousands of unrelated wallets. So a funder seen funding more than 50
distinct addresses across the whole index is classed as a **hub** and excluded from the test entirely.
The hub list is published.

### 6.2 Sybil clients, detection `buyer-cluster`

**The attack.** Twenty fresh addresses, each paying once, to defeat the per-buyer cap.

**The detection.** Union-find over four edges, evaluated nightly and at hire time. **Edges 1 and 2 ship.
Edges 3 and 4 are documented as next and are not running by 2026-09-09** (section 11), so the detector that
actually runs is the funding pair:

```
edge 1  funder(a) == funder(b)                    both non-hub                                  ships
edge 2  a and b were first funded by the same address within 7,200 blocks (about 54 minutes)     ships
edge 3  a and b granted an approval to the same spender in the same transaction batch            next
edge 4  a and b appear as `payer` on settlements sharing one relayer nonce sequence               next
```

Both shipped edges rest on `funder(x)`, so both inherit its limit from 6.1: resolvable inside our own
observation window and `funderUnknown` outside it. That is the second reason `C = 3` is the primary
defence.

Every address in a component counts as **one** buyer for `C` and the component's `beta_b` is the minimum
of its members'. Two arithmetic facts follow, both publishable. A single cluster can lift a listing no
higher than 61.5 no matter how many jobs it buys. Fresh anonymous buyers carry `beta_b = 0.35`, so the
ceiling table reads:

| Distinct buyer clusters, all clean | attested or returning | fresh and anonymous |
| --- | --- | --- |
| 1 | 61.5 | 54.8 |
| 3 | 73.7 | 62.0 |
| 5 | 80.0 | 67.2 |
| 10 | 87.5 | 75.6 |
| 20 | 92.9 | 83.9 |

**The response.** Cluster collapse is automatic and silent, because it is not an accusation. A `newBuyerBurst`,
defined as more than 10 first-time clusters settling on one listing inside 24 hours, adds a note and queues
a human look.

**Why the gate is on the buyer side.** An attestation gate on operators costs 99% of supply: 6 of 585 agent
owners hold a BABT and 9 hold either a BABT or a Galxe Passport. The same signal on the write path costs
almost nothing, because almost nobody writing on chain today is a real buyer
(`research/R10-bab-attestation.md`). So attestation never gates a listing and always weights a buyer.

### 6.3 Review bombing, detection `anomalous-window`

**The attack.** A coordinated burst that drags a listing's number in either direction. On our rail each
burst costs a real settled payment, which is already most of the defence, so the residual risk is a
competitor buying a batch of cheap jobs to fail them or a friendly party buying a batch to pass them.

**The detection.** Steam's mechanism, made explicit. For each listing, over the trailing 28 days, take the
daily count of counted outcomes:

```
anomalous(day) := count(day) > max(5, mean + 4*stdev)
                  AND abs(rate(day) - rate(trailing 28 days)) > 0.40
```

Both clauses are needed: volume alone is a good day, divergence alone is noise. A flagged day is excluded
from `S` and `N`, every row stays visible with "excluded from the score, window flagged on <date>" and
the day is queued for a human. Individual rows outside a flagged window always keep counting, which is the
same split the precedent draws: an off-topic single review keeps contributing while an abnormal bulk period
is removed from the score and stays readable (`research/R13-prior-art.md`).

**Symmetry is the compliance point.** The rule triggers on volume plus divergence in either direction, so a
positive burst is caught by the identical test. A filter applied without regard to sentiment is the
defensible kind; one that triggers on bad outcomes only is not (16 CFR 465.7(b)).

### 6.4 Self-feedback and self-dealing, detection `control-set`

**The attack.** The registry blocks self-feedback exactly one wallet deep:
`require(!isAuthorizedOrOwner(msg.sender, agentId), "Self-feedback not allowed")`. Register from A, review
from B and it passes. The same hole exists on the buying side.

**The detection.** Build the listing's control set and refuse buyers in it. Two of the five terms are
bounded by what a keyless RPC will answer, so each term carries its own scope:

```
controlSet(listing) = { ownerOf(agentId) }                                          full
                    + { getAgentWallet(agentId) }                                   full
                    + { x in operatorCandidates : isApprovedForAll(owner, x) }      window-bounded
                    + { counterparties of a Transfer of that agentId we observed }  window-bounded
                    + { every member of the buyer-cluster of any of the above }     inherits both
```

`isApprovedForAll(owner, operator)` is a two-key mapping read, so it needs a candidate operator and cannot
produce one. `operatorCandidates` is therefore the set of operators we have actually seen: every address in
an `ApprovalForAll` log inside our own indexed range, every address that has authenticated against this
listing as an operator, plus the buyer being checked right now. The Transfer term has the same shape and the
same bound, transfers inside our indexed range. Outside that range neither term is computable at all:
`eth_getLogs` caps at 5,000 recent blocks and `eth_call` at tip minus 1,000 returns 403 on the endpoints
that answer (section 6.1, `research/R09-bsc-defi.md`, `research/MEASUREMENT.md`). What we cannot resolve is
marked `controlSetUnknown` on the row, exactly as `funderUnknown` marks an unresolvable funder. The
full-history version sits in section 11's next column beside `self-financed`.

The cheap part is the batch: `ownerOf` `0x6352211e`, `getAgentWallet` `0x00339509` and
`isApprovedForAll(owner, buyer)` `0xe985e9c5` for the one named buyer in front of us, as a single
`aggregate3` through Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11`, measured at 183 agents per
second for three reads each. Those three reads cover the owner, the agent wallet and a named-operator
approval check, which is what refusing the buyer at the checkout needs. They do not enumerate operators or
transfer history and nothing here claims they do. Note that `agentWallet` is written to `msg.sender` at mint
and equals `ownerOf` for 600 of 600 sampled agents, so it is a control-set member rather than a payout
signal.

**The response.** A job from the control set: weight zero, note. More than 3 such jobs: suppress plus
review. And the reverse case is disclosed rather than detected: **Muster's own first-party listings run the
identical formula with no bonus term**, their house-funded jobs are `origin = house` and therefore
uncounted, then first-party and third-party counts are reported separately wherever we publish a count.
`07-MATCHING.md` owns the anti-favouritism rule in ranking and its audit.

**Do not forget the honest admission.** We are the only validator (section 5), so validation is
self-validation by construction. It is disclosed on the badge and it scores nothing.

### 6.5 Collusion rings, detection `ring`

**The attack.** Three or more operators and three or more buyers trade jobs among themselves, so every
listing has multiple distinct buyers and none of the earlier tests fires.

**The detection.** A connected-component pass over the bipartite buyer-to-listing graph of counted jobs.
**The shipped form is a hand-run nightly script**, not a scheduled job: automatic scheduling plus automatic
suppression on a flag is documented as next (section 11). Flag a component as a ring when all four hold:

```
listings(component)      >= 3
buyerClusters(component) >= 3
internalEdgeShare         > 0.90     jobs inside the component / jobs touching it
externalBuyers(component) == 0       no buyer cluster with a settled job outside the component
```

The graph is small: our own counted jobs, not the chain. Even at a thousand jobs this is milliseconds.

**Why the thresholds are those.** They are chosen against a pattern already visible on the official escrow
rail. Of 56,713 lifetime ERC-8183 jobs, one address holds 56,167 of them (99.0% of jobs and
96.3% of paid value), only 28 of 97 providers have any completed job and **18 of those 28 have their entire
record from a single client address** (`01-GROUND-TRUTH.md`, `research/R16-reuse.md`). A single-client record
is the norm in this ecosystem, not an outlier, so a marketplace that treats it as normal is importing the
problem.

**The rule that holds whichever that address turns out to be.** Whether the 99.0% holder is one operator or
a platform router changes nothing in this section, because the detector never runs on it. Section 4 keeps an
ERC-8183 job we did not broker out of `J` entirely and this pass runs over counted jobs only, so that
address cannot reach a Muster score under either reading. `escrow-index` displays its record in its own
panel with the per-provider split. The population above is an analogy that shaped the thresholds rather than
a set the detector is evaluated on.

**The response.** The detector is hand-run, so the response is too: a human runs the script, confirms the
component, then suppresses every listing in it and keeps the jobs visible at weight zero. Automatic
suppression on a ring flag is next, not shipped. A ring accusation published automatically is a defamation
risk and an appeal we would lose, so the human step is part of the design rather than a gap in it.

**One cheap extra rule.** After a dispute the buyer wins, the matcher blocks that buyer-listing pair from
being matched again, which is a one-table version of a mechanism a large marketplace already runs on
one-star history (`research/R13-prior-art.md`).

### 6.6 An endpoint swapped after approval, detection `pinned-hash drift`

**The attack.** Pass review with a working, honest endpoint, then change it. Every lever is owner-callable
at any time: `setAgentURI` `0x0af28bd3`, `setMetadata` `0x466648da` and `setAgentWallet` `0x2d1ef5ae`. The
off-chain document can change with **no on-chain event at all**, which the official index's own validator
warns about in code `WA040`: "HTTP/HTTPS URI is not content-addressed (metadata can be changed without
detection)".

**What we pin at approval.** Six hashes plus two values: `tokenUriHash` = keccak256 of the `tokenURI`
bytes, the canonicalised registration document hash, the resolved endpoint set, the A2A card or MCP
manifest content hash, the `outputSchema` hash, the category contract version, plus `priceBase` with
`priceToken` and the `agentWallet` value.

**Three watchers, because one is not enough.**

1. **Logs.** `URIUpdated` topic `0x3a2c7fffc2cba7582c690e3b82c453ea02a308326a98a3ad7576c606336409fb` and
   `MetadataSet` topic `0x2c149ed548c6d2993cd73efe187df6eccabe4538091b33adbd25fafdb8a1468b`, the latter
   filtered on topic1 `0x2ac6109326e720d1435c0db66f7e35eda7839f52b6f1f5520a60788e132b4e39`, which is
   `keccak256("agentWallet")`. An indexed string topic is always the keccak of its UTF-8 bytes, so filter by
   hash and never by string.
2. **A hash re-read every sweep.** `tokenURI` for listed agents only, in the same Multicall3 batch as the
   control set. A few hundred agents is one call.
3. **A content re-fetch on the probe schedule.** ETag with `If-None-Match` where the host offers one and a
   body hash otherwise, because watcher 1 cannot see a mutable HTTPS document change and watcher 2 cannot
   see it either.

**The response, graded by what changed.**

| Changed | Automatic action | Score |
| --- | --- | --- |
| endpoint host or path | listing drops to `visibility = indexed`, conformance re-runs, badge reads "changed on <date>, re-checking". Back on the shelf only on a pass | kept, jobs tagged with the version they ran under |
| A2A card or manifest content, contract unchanged | note plus a conformance re-run, stays on the shelf | kept |
| `outputSchema`, category contract or price | drops to `indexed`, open quotes invalidated, needs an operator confirmation before returning | **reset to `mu_c`**, history preserved and labelled "N jobs under a previous version" |
| `agentWallet` or payee | `visibility = suspended` immediately, every open quote void | frozen until re-approval |
| nothing on chain, body hash moved | note with both hashes and both dates | kept |

The asymmetry is the point. Moving a server is not evidence of failure. Changing what you promised means
the old record was earned against different promises, so it stays visible and stops counting.

**One free lever worth using.** `POST /agents/verify-endpoint/{chain_id}/{token_id}` on the official index
needs no auth and is capped at once per hour per agent. A real run rewrote the error string on a test
agent inside the window it estimated. So we can make the official scanner re-verify the agents we list, then
cite its verdict with its date. Read the result from `endpoint_verification_error` and `updated_at`, never
from `endpoint_last_checked_at`, which stayed frozen at 2026-05-20 through a check that demonstrably ran
(`research/R05-8004scan-api.md`).

### 6.7 Fabricated numbers in a deliverable, detection `reconcile`

**The attack.** Deliver a beautifully formatted report whose figures were never read from chain. This is
the attack that matters most for a marketplace judged on Data Quality and no reputation mechanism catches
it, because the buyer cannot tell.

**The detection.** `conformance` re-runs every read the deliverable asserts, at the deliverable's own
pinned block and compares against a tolerance stated per field: exact for integers read from chain, 1 bps
for derived ratios, 0.5 percentage points for an annualised rate where the annualisation basis is
disclosed. The precedents are in hand: position principal and fees reproduce to the wei, Venus liquidity
reproduces to the wei, the Venus published APY reproduces to 4e-12 with exponent 364 and Moolah's own
`isHealthy` verdict reproduced on 3 of 3 real positions.

**The response.** `v_j = 0` on that job, the mismatch published in the receipt with both numbers, then the
dispute default goes to the buyer. Three failures inside 30 days: suppress plus review. This is also the
one anti-gaming rule that produces a positive product feature, because the same machinery puts a
"reconciles to chain at block N" line under every number we display.

## 7. Cold start and the exploration budget

The cold start here is total and pretending otherwise is the fastest way to lose the Data Quality
criterion. At launch, across the whole chain: 0 of 600 sampled agents are payable by a stranger, 12 of 600
are machine-callable and 4,406 of 334,935 have any feedback, every one of those read at block 120,027,164,
2026-09-05T02:02:32Z (`research/MEASUREMENT.md`). The four mandated categories together match about 518
agents at the most generous keyword reading, which is 0.17% of the index. The registry counter moves between
1,940 and 2,110 a day across the two windows measured and the rate itself moves (`SPINE.md`), so it is
re-read the day the submission goes out rather than quoted from here. Muster's own
counted job set on 2026-09-09 starts at zero.

Five mechanisms, in the order they bite.

**1. A listing is rankable on day one without being trusted.** With no jobs, `M = mu_c = 50` and
`M_lo = 23.7`, which sorts below any listing with two clean jobs (`M_lo = 32.0`). The card renders
`03-TAXONOMY.md`'s `provisional (n=0)` with "no settled job yet" as the detail line under it and suppresses
the number, because a 50 with no evidence reads as a rating and it is not one. The prior does the work that a
fraud detector would otherwise have to: one perfect job scores 54.5, not 100.

**2. The exploration budget is two numbers and this document owns their size, nothing else about them.**

The shelf budget is **one slot per shelf, four in the product**. A slot rather than a share of impressions,
because a slot is publishable and checkable at any traffic level while a share of impressions needs
impression accounting a judge has to take on trust. Everything else about that card is `03-TAXONOMY.md`'s:
where it sits, how the occupant is chosen by hourly deterministic rotation so a judge can reproduce it, then
who is eligible, which for the card means zero settled jobs with us in this category plus its conformance,
reachability and visibility conditions. Those are not restated here and this document holds no second
eligibility rule for the card.

The dispatch budget is **epsilon = 0.10 of counted dispatches**, the constant `07-MATCHING.md` asks this
document for. The denominator is dispatches in our own ledger rather than impressions, which is what makes
the rate auditable from published rows and is the whole difference between this number and the invented 10%
of traffic an earlier pass carried. Which candidate substitutes in is `07-MATCHING.md`'s, as is whether an
exploration row can win a dispatch at all. Its cold set is the wider `scoreSampleSize < 5`, because a listing
with two jobs still cannot be judged, where the shelf card requires zero. Two budgets with two eligibility
rules is deliberate and both documents say so in those words.

A bandit is the selector for neither. `07-MATCHING.md` carries Thompson sampling as documented and not
shipped, with the switch condition published: at least 8 agents in a category each holding at least 5
settled jobs. It keeps the `S` and `F` counters from job one, so the switch is a config change rather than a
rebuild.

**3. An unproven listing is capped rather than excluded.** At E0 and E1: one open job at a time, plus the
per-job and outstanding ceilings `05-ONBOARDING.md` section 4.3 publishes per tier, which are 5 units per job
and 25 units outstanding at those rungs. Those are numbers rather than "the category median" for the reason
section 2 gives: the median is `a_c` and `a_c` has no value on day one.

Two caps act on listings and they bind different things. `15-SYSTEM.md`'s unique index allows one listing per
`(agentId, category)`, so one agent cannot exceed four. `14-GAPS.md` sets four **live listings per owner**,
which is the cap that binds an operator holding several agents: four agents at one category each fills it.
The per-owner cap is the tighter of the two and it is the one that wins. Whether it blocks a legitimate
multi-agent operator is `14-GAPS.md`'s open question rather than settled here.

What the per-owner cap stops is one owner filling a shelf with near-identical rows of its own, which is a
flooding shape rather than a fraud shape, so capping what an unproven supplier may list beats refusing to
list it. The precedent for that choice is a marketplace that gates its first level on 5 orders, 3 unique
clients and $400 earned while still letting a new account list a limited number of items
(`research/R13-prior-art.md`). Duplicate registration documents are a different problem with a different
answer and `03-TAXONOMY.md` owns it.

**4. First-party supply seeds the categories under a label and cannot seed its own score.** House-funded
runs carry `origin = house` and are structurally excluded from `S` and `N` by the `ledger`. So our own
agents appear with receipts, with real category performance and with "no settled job yet" on the score
until an external buyer pays. `02-THESIS.md` owns how first-party supply is disclosed.

**5. A 2% placebo holdout, so the exploration claim is causal.** On 2% of shelf renders the exploration slot
is filled by the ranked winner instead of the sampled candidate, the assignment is random and nothing on
screen differs. That is the only design in the prior art that produces a causal number about whether a
ranking feature helps, it is worth about three hours and almost nobody does it
(`research/R13-prior-art.md`). What it buys by 2026-09-09 is the instrumentation and an honest "too few
renders to report" line, not a result.

## 8. The quality maintenance loop

### What runs and how often

Two of these schedules are not this document's to set. `05-ONBOARDING.md` section 9.1 owns the probe cadence
and `15-SYSTEM.md` owns the sweep, so their numbers are cited here rather than restated with different ones:
a `live` listing is probed **every 5 minutes**, an `indexed` candidate in one of the four categories **every
6 hours**, the tail sweep on the `_lastId` delta runs **every 30 seconds** and the full registry sweep
**every 6 hours** with daily as its floor. An earlier pass of this document carried 10 minutes, hourly and
daily. Those
are withdrawn rather than left to argue with their owners. At 10 minutes one missed cycle crosses
`02-THESIS.md`'s 15-minute freshness edge with nothing on screen saying so. An hourly probe of indexed
candidates is six times the owner's rate against a per-host budget of one request per 1.5 seconds, which 05
sized around the 9 hosts carrying 229 of the sampled endpoint URLs.

The rows below are the ones this document owns.

| Job | Cadence | Cost, measured |
| --- | --- | --- |
| `sampler` on covered pools and accounts: `snapshotCumulativesInside`, `pool.liquidity()`, `lmPool.lmLiquidity()`, `slot0` | every 60 s, retained 30 days | a few dozen `eth_call`s a minute |
| oracle price watch for the union of watched assets | every block | one batched `getUnderlyingPrice` |
| governance parameter watch: collateral factors, thresholds, incentives, pause flags, `isForcedLiquidationEnabled` | hourly | one batch |
| score recompute | on every settled job, plus a nightly full pass at a pinned block | trivial, the job set is small |
| `mu_c` recompute per category | nightly, published with its block | trivial |
| `a_c` recompute per category | nightly, published with the flag saying whether it is defined yet | trivial |
| `anomalous-window` check | hourly | trivial |
| `self-financed` plus `buyer-cluster` on edges 1 and 2 | nightly, scheduled | seconds over our own ledger |
| `ring` | a hand-run nightly script rather than a scheduled job (section 6.5) | seconds over our own ledger |
| `tokenUri` hash re-read for listed agents plus the control-set batch | once per sweep, at the sweep cadence above | one `aggregate3` call for a few hundred agents |
| implementation-drift watch on the three registry proxies, the three EIP-3009 tokens plus `policyWhitelist()` | once per sweep | three storage reads plus one call |
| 8004scan cross-check and freshness banner | every 5 min, cached, never blocking a render | one call, retried |

The implementation-drift watch is not paranoia. The reason is narrower than an earlier pass claimed. One
of the three moves is verified: the whitelisted escrow policy on chain 97 changed, the current one is
`0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA` with a 900 s dispute window and the previous one still has code
while `policyWhitelist()` on the router now returns false, so `registerJob` against it reverts
`PolicyNotWhitelisted()` (`research/R02-erc8183.md`). The registry and token implementations are a different
claim and a weaker one. Identity and reputation sit behind a 3-of-5 Safe and validation behind a single EOA,
so an upgrade could change the storage meaning of every record we show. FDUSD, USD1 and U are live
proxies with live admins whose upgrade could remove EIP-3009 (`research/R01-erc8004.md` upgrade-authority
rows, `research/R04-bsc-tokens.md`). Whether any of them has ever exercised the path is not knowable from a
free endpoint: `research/R01-erc8004.md` records the proxies emitting no `Upgraded` log in the window it
could scan and lists the full upgrade history as blocked by the archive limit. So they are watched rather
than known. Pin, read, banner.

We compute liveness ourselves because the one published field for it is not usable. The official index holds
81,113 `agent_health` rows against 811,915 agents, that corpus grew by 2 rows over 69 minutes of watching,
`health_checked_at` was absent for 45 of 53 sampled BSC agents and its read path returned non-200 on 20.8%
then 56.7% of calls in two windows on one day (`research/R05-8004scan-api.md`). We serve from our own store,
call theirs asynchronously and degrade silently.

### What the loop may do on its own

Automatic, no human: attach a note to a listing, weight a job to zero, **suppress a listing out of the
default shelf sort and the exploration slot**, collapse a buyer cluster, exclude an anomalous window, drop a
listing from a shelf to `indexed` on a failed probe or a drift event, suspend on a payee change or a
sanctions hit, invalidate open quotes, freeze or reset a score to `mu_c` under the drift table, widen an
interval, request or answer a validation, re-run conformance, re-price `a_c` and `mu_c`, publish a statement
of reasons. Note and suppress are on this list because section 6's ladder marks both automatic and section
9's trigger table fires suppression without a human, so the three have to read the same. Suppression is the
most consequential of them, which is why it owes a reasons record like any other adverse action.

Human required: **delisting**, running the ring script and publishing anything it finds, restoring after an
appeal, changing any of the eight constants, overriding a detection in either direction, versioning a
category contract, plus any decision about a first-party listing. Each of those lands in a public changelog
with a date, because a constant that moves silently makes every published score unreproducible.

### Every automatic restriction writes its reasons

One record per adverse action, machine-readable, published in a public reasons log and linked from the
listing. Six fields, taken from the statutory checklist rather than invented: the action taken, its scope
and duration, the facts relied on, whether an automated means decided it, the rule or clause applied with
why it applies, plus the redress route. Demotion counts as a restriction and so does suspending payment, so
a suppression owes reasons exactly as a delisting does (DSA Article 17(3) and 17(1),
`research/R13-prior-art.md`). The public reasons log is cheap and no rival has one, which makes it a Data
Quality differentiator rather than a compliance chore: it is what turns "our ranking is fair" into
something a judge can audit in a browser.

## 9. Delisting and the appeal

### What triggers what

| Trigger | Outcome | Automatic |
| --- | --- | --- |
| a failing probe | per `05-ONBOARDING.md` section 9.4's ladder, which owns it: one failure records and retries with no visibility change, a newest passing probe older than 15 minutes goes `stale`, 6 consecutive failures spanning 30 minutes goes `suspended` | yes, on 05's clock |
| conformance assertion fails | off the shelf until a pass | yes |
| pinned-hash drift | per the section 6.6 table | yes |
| `M_lo` below 30 with `scoreSampleSize >= 5` | suppressed from the default sort into a "thin record" group, still searchable, reason shown | yes |
| `self_financed`, control-set or anomalous-window hit | weight zero plus a note | yes |
| `habitual` or 3 reconcile failures in 30 days | suppressed, queued for review | yes to suppress, human to publish |
| a ring flag | suppressed, queued for review | **human**, because the detector is a hand-run script (section 6.5) |
| payee or price changed under a live quote | suspended | yes |
| sanctions screening hit on the operator or the payee | suspended, payment blocked | yes. `09-DISPUTES.md` owns the rest |
| prohibited-use finding | delisted | **human** |
| repeated suppression with no remediation across 30 days | delisted | **human** |
| operator request | delisted | human, same day |

The probe row is 05's ladder cited rather than a second one written here. An earlier pass of this document
carried "3 consecutive failures drops the listing to `indexed`", which has no counterpart in the owning
document and would have taken a listing off the shelf while 05 still had it protected by `stale` at no cost
to the operator. The owner's ladder is the one that ships.

The `M_lo` floor exists because the alternative is a shelf whose bottom is indistinguishable from its
middle. Publishing a visibility floor is normal practice: a large storefront publishes that a score at or
above the "Mixed" band, 40% positive, is not a factor in its algorithmic visibility and that below it a
product is less likely to be featured (`research/R13-prior-art.md`). Ours is stated as a number with a
minimum sample so it cannot fire on noise.

**Delisting never reaches the chain.** The ERC-8004 registries are append-only, so "delisted" always means
delisted from Muster's index and the policy says that in those words rather than implying a takedown that
we cannot perform (`research/R15-compliance.md`). A delisted listing's receipts stay published, because
buyers relied on them, with the delisting notice attached.

### The appeal

| Element | What we ship | Why |
| --- | --- | --- |
| Window | 30 days from the notice for the hackathon build and the shipped policy states a 6-month channel as the target | 30 days is eBay's published window to appeal a decision, 6 months is the statutory floor for an internal complaint channel (DSA Article 20(1), `research/R13-prior-art.md`) |
| Form | a public form plus an email route, free, electronic, no account needed to file | same |
| Decider | a person who did not make the original decision. At hackathon scale that is the operator, stated plainly | an appeal to the same decider is not an appeal |
| Standard | **new evidence only.** A passing conformance run, a corrected document, a funder explanation, a reconciliation | it makes the outcome checkable rather than a matter of mood and it matches the practice of asking for additional documentation |
| Clock | acknowledgement within 24 h, decision within 5 business days | short enough to matter inside a judging window |
| On success | the restriction is reversed without delay and **the score history is restored unchanged**, never re-zeroed | a wrongful suspension that costs a listing its record is a second penalty for the same non-event. The reversal duty on an unfounded decision is explicit in DSA Article 20 |
| On refusal | the reasons record is updated, not replaced, so the trail shows both decisions | |

**Abuse of the appeal and report channels is symmetric.** A party that repeatedly files manifestly
unfounded reports or appeals is suspended from the channel after one warning, weighing four published
factors: the absolute number in a time frame, that number as a proportion of everything they filed, the
gravity of the misuse plus the intention where it can be identified (DSA Article 23(1) to (4),
`research/R13-prior-art.md`). A marketplace with a report button and no misuse rule gets used as a weapon
between rival agents. This one has a takedown path by design. `10-DOCS-AND-POLICY.md` publishes the
policy text, including the worked examples Article 23(4) asks for.

## 10. What we show a buyer when we do not know

This is the honesty surface for the Data Quality criterion and the criterion is won here rather than in the
score. The rubric asks for "real-time, accurate data that goes beyond basic counts" so that "a user should
be able to look at what you are showing and make a genuinely informed call". A number with no age is not
accurate data and a blank is not an informed call.

### The rules

1. **Never a blank, never a zero standing in for unknown, never a stale number without its age.** Every
   number carries the freshness triple: block, timestamp, source.
2. **Never merge failure classes.** DNS, TLS, HTTP, template placeholder, wrong shape and timeout are six
   different things needing six different fixes from the operator and lumping them into "offline" destroys
   the only actionable part (`research/MEASUREMENT.md`).
3. **Show the reject count on screen.** Showing every registered row (336,088 at block 120,141,168,
   2026-09-05T16:17:48Z, the stamped head in `SPINE.md`) with 5% unreadable cards scores worse than a
   filtered, labelled shelf that says how many were rejected and why (`research/R01-erc8004.md`).
4. **Every rate carries what it excludes.** A total-yield number with no breakdown is a claim. A breakdown
   that sums to it is evidence (`research/R09-bsc-defi.md`).
5. **Where two sources disagree, show both with their ages.** The registry counter said 334,935 at block
   120,027,164 while 8004scan's list endpoint returned 303,461 and its own stats endpoint returned 304,281
   for the same registry, from a checkpoint 32 h stale (`research/MEASUREMENT.md`). Two endpoints of one
   index disagreeing by 820 is the sharper version of the point: publishing all three, with the lag, turns a
   discrepancy into the product.
6. **Our own unknowns get the same treatment.** The methodology page lists the eight constants, the suite
   version, the validator address, the first-party label, plus the count of jobs excluded from each score
   with the reason for each exclusion.

### The closed set of unknown states

Seven states, each with its reason and the thing that would resolve it. These are the **knowledge model**,
which is the part this document owns: what we do not know and why. The **words on screen belong to
`03-TAXONOMY.md`**, which fixes six render strings and says they are used everywhere in that exact wording.
So each row below maps onto one of those strings rather than inventing a second string for the same cell. Any
copy this document carries is the detail line under the render string rather than a replacement for it. A
knowledge state not on this list is a defect in the score panel or in a category panel, the two surfaces this
document owns. It is not a claim about any other cell.

| State | Renders as, in `03-TAXONOMY.md`'s words | Detail we add under it | Resolved by |
| --- | --- | --- | --- |
| `no-record` | `provisional (n=0)` on the score cell, `unknown, never checked` on a category metric cell | the category baseline named as context. The score number itself is suppressed | one settled job |
| `not-measured` | `unknown, never checked` | "first sample due <time>" | the sampler reaching it |
| `source-down` | `stale, <age> old (last good at block N)` | the source name plus our own last value | the source recovering |
| `unreadable` | `unknown, check failed (shape)` | "registration document could not be parsed", the failure and the raw bytes hash. 5.00% of 600 sampled agents are here | the operator fixing the document |
| `unreachable` | `unknown, check failed (<failureClass>)`, the class being one of `dns`, `tls`, `http`, `template`, `shape`, `timeout` | the observed status and our probe timestamp | a passing probe |
| `not-applicable` | `not applicable (<reason>)` | why this listing's shape puts the metric out of scope | nothing resolves it, which is fine |
| `conflicting` | no unknown string, because both values are present: they render side by side | both sources, both ages, plus which one we compute ourselves | usually nothing, so it stays |

Two of 03's six strings have no row here and that is correct. `not published by the agent` covers a field the
operator never declared, which is 03's surface rather than a gap in our knowledge. `refused (<condition>)`
is a delivered outcome that `04-AGENT-PROTOCOL.md` owns.

Three worked examples of the detail line, so the tone is fixed rather than described. Each sits under the
render string, never instead of it:

- Under `unknown, check failed (tls)`: "The TLS certificate does not match the declared hostname. Our probe,
  2026-09-08 14:02 UTC. The agent's own host answers on HTTP." That is the true state of the second agent ever
  registered on this chain, where the official index shows `health_score: 100.0`.
- Under `unknown, never checked`: "In-range share is not measured before 2026-09-06. There is no free BSC
  archive, so we sample forward from the day we started."
- Under a value that is present: "APY 2.799% as Venus publishes it, exponent 364, reconciles to `api.venus.io`
  to 4e-12. Our own annualised figure is 2.807% at exponent 365. Excludes XVS emissions, which are zero on
  this market today."

### One line on posture

Muster publishes measured facts about listings. It does not tell a buyer what to do with their money, it
shows every buyer the same fields in the same order and it never presents a listing as suitable for a
particular person. `09-DISPUTES.md` and `10-DOCS-AND-POLICY.md` own the full advice posture and the reason
the line sits where it does.

## 11. What ships by 2026-09-09 and what is documented as next

**Ships.** The score with all eight constants and the published `score.json` audit row, including the `w_j`
launch fallback and the flag saying which rule produced it. The Wilson interval at both ends plus `alpha` and
`beta`. Per-buyer capping, the buyer-tier multiplier and the buyer-cluster union-find on edges 1 and 2. The
four category metrics with their envelopes, drawn from live reads on the venues in
`research/R08-pancakeswap.md` and `research/R09-bsc-defi.md`, every window opening no earlier than our own
series. The per-listing delivery-latency metric on the same envelope. Verified-outcome-only counting with the
`origin` tag enforced at append. The foreign-feedback panel with the census, the per-author cap and the
`appendResponse` responder check. The pinned-hash drift watcher on all three paths, with the graded response.
The control-set test bounded to our own observation window, with `controlSetUnknown` on what it cannot
resolve. The anomalous-window test. Reconcile on every deliverable. The reasons log, the suppression ladder
and the appeal intake. All seven knowledge states, rendered in `03-TAXONOMY.md`'s six strings. Four
`validationRequest` plus `validationResponse` pairs on BSC mainnet, one per category, on listings we own.

**Documented as next and named as not shipped.** `self-financed` beyond our own observation window and the
full-history control set (every `ApprovalForAll` operator, every past `Transfer` counterparty), both of which
need a paid archive endpoint. The same endpoint is what a lifetime rebalancing or grid window needs, so those
windows open at our first sample until it exists. Buyer-cluster edges 3 and 4. Ring detection as a scheduled
job with automatic suppression, above the hand-run nightly script that ships. The 2% placebo holdout as a
measurement rather than as instrumentation. A third-party validator, which does not exist on BSC today. A
per-listing uptime time series longer than the build has existed, which is a statement about the calendar
rather than about the design. Thompson sampling is on this list in `07-MATCHING.md` rather than here, since
selection is its call and it publishes the switch condition.

Everything in the shipped column runs against a keyless BSC RPC plus our own store, with one dependency named
rather than glossed: the four validation writes need gas on an address that owns or is approved for the four
listings, which is our own operator key on our own listings.

## Decisions and rejected alternatives

| Decision | Rejected alternative | Why |
| --- | --- | --- |
| Two numbers, delivery and performance, never blended | one composite score, which is what every incumbent ships | a composite cannot carry an interval and cannot be recomputed. On BSC a composite weighting engagement at 0.30 is 30% a measurement of 111 addresses |
| Only a job with a Muster `quoteId`, a settled payment and `origin = order` counts | counting ERC-8004 feedback or counting COMPLETED ERC-8183 jobs we did not broker | `giveFeedback` costs gas and proves nothing. On a stranger's escrow job we hold no request hash and no deliverable rule and three incompatible deliverable conventions are live at once |
| `mu_0 = 0.50` | 0.80, the figure the prior art tunes its worked shrink with | 0.80 is an illustrative value for a market that already has volume rather than a measured success rate for any market. Nothing in the corpus measures one. The nearest venue on this chain baselines a historyless agent at 50 with `getScore(1) = 50`, so 0.50 is anchored to a number anyone can read on chain |
| `m = 10` effective jobs | 20 | 20 keeps the prior in the majority until 20 jobs and no listing on this marketplace will have 20 jobs during judging. 10 still scores one perfect job at 54.5 |
| Wilson lower bound on the shrunk counts, with `alpha` and `beta` published | the exact Beta quantile as the shipped number | Wilson needs one square root and reproduces in any language a judge might use. Publishing `alpha` and `beta` lets anyone compute the exact bound and disagree with us |
| Per-buyer cap `C = 3` as the primary wash-trade defence | funding-provenance detection as the primary defence | there is no free BSC archive, so the funder of an arbitrary address is often not resolvable. A cap needs no provenance and cannot be evaded by a wallet that looks clean |
| Buyer attestation as a weight (`beta_b`), never a gate | requiring an attestation for a job to count | 6 of 585 agent owners hold a BABT. A gate on either side of this market removes the market. A weight keeps 335k agents of inventory and still rewards verification |
| Binary `v_j`, with graded quality kept in the category panel | a graded 0 to 1 quality value inside the score | a graded value inside a Bernoulli makes the interval meaningless and the interval is the reason a buyer can trust a small sample |
| Reconciling every asserted number is part of delivery, so a fabricated figure is `v_j = 0` | treating fabricated numbers as a dispute matter only | the buyer cannot tell, so a mechanism that waits for a complaint never fires. We already reproduce position and lending maths to the wei |
| Score per listing per category, never pooled across an agent's categories | hierarchical pooling at agent level with per-category shrinkage | better statistics once volume exists and at launch it lets one category's record flatter three empty ones, which is the Agent Diversity failure the rubric punishes |
| Our own validator, labelled as ours, scoring zero | no validation at all or presenting the badge as third-party validation | the registry is live and unused on BSC, so a real request plus response is a genuine artifact. Zero weight is what stops it being self-scoring and the label is what stops it being a claim we cannot support |
| The shelf budget is one slot per shelf and the dispatch budget is epsilon = 0.10 of counted dispatches | one epsilon over impressions covering both | a slot is checkable at any traffic level and a rate over our own ledger has a denominator we publish. An epsilon over impressions we do not count is unauditable, which is exactly what the invented 10% in an earlier pass of this lane was |
| Neither exploration budget uses a bandit selector | Thompson sampling as the v1 selector | a Beta posterior with no observations is the category prior, so a bandit at launch is the prior plus noise, which is the one thing a why-this-agent panel cannot explain. `07-MATCHING.md` carries it as documented and not shipped with the switch condition published, at least 8 agents in a category each holding 5 settled jobs. It keeps the counters from job one so the switch is a config change |
| Weight to zero and keep every row visible | deleting or hiding flagged rows | deletion looks like suppression of unfavourable content. A sentiment-neutral filter that withholds weight is the defensible shape |
| Drift on the host keeps the record, drift on the contract or the price resets the score to `mu_c` | wiping the record on any change or keeping it through a contract change | moving a server is not evidence of failure. Changing what you promised means the old record was earned against different promises |
| Muster writes `appendResponse` only | Muster writing `giveFeedback` about listings it ranks | that is self-dealing on a public registry and it would feed our own opinion back into our own ranking |
| Delisting is human-only | automatic delisting on a detection | every automated detection here has a false-positive path and a published ring accusation is an appeal we would lose |
| `H = 30` days, published as a policy constant | deriving a half-life or no decay at all | nothing we can measure fixes a half-life today. No decay makes a dead listing look live forever, which is the failure mode of every index in this ecosystem |
| Publish all eight constants plus the thresholds | withholding them, which the ranking-transparency carve-out permits | nothing in this formula is manipulable by knowing it. The only input an operator controls is settled paid work, so publishing costs nothing and buys the audit |

## Open questions

1. **Will any listing have a non-zero sample by the time judges look?** Unknown and outside our control. The
   design has to read as deliberate in its cold-start state, which is why "no settled job yet" is copy we
   wrote rather than an empty field. If the answer is no, every score on screen is the prior and the
   category panels carry the weight.
2. **Is a 30-day half-life right for jobs that settle in seconds?** Unverified. Nothing in the research fixes
   it. Thirty days of our own counted jobs would settle it and we do not have thirty days.
3. **Is `beta_b = 0.35` the right discount for a fresh anonymous buyer?** Unverified. It is set so three
   fresh buyers weigh about one established buyer, which is a judgment. A real buyer population would settle
   it.
4. **Is `funder(x)` computable often enough to matter on BSC?** Unverified. `eth_call` at tip minus 1,000
   returns 403 on the free endpoints and `eth_getLogs` caps at 5,000 recent blocks, so the answer today is
   "only inside our own window". A paid archive endpoint would settle it and would also let us backfill the
   test over the existing population.
5. **Is the address holding 99.0% of ERC-8183 jobs one operator or a platform router?** Unverified and
   flagged as such in `research/SPINE.md`. It is an unverified external fact rather than a pending decision
   here, because the rule that holds either way is already in section 6.5: an ERC-8183 job we did not broker
   never enters `J` and the ring pass runs over counted jobs only, so that address cannot reach a Muster score
   under either reading. That population shaped the ring thresholds as an analogy and the detector does not
   run on it. Reading its code and its client set would settle what it is.
6. **Are the anomalous-window thresholds right?** 4 sigma plus a 40-point divergence with a floor of 5
   outcomes a day has never been tested on real volume, because no listing has real volume. They are set so
   the test cannot fire on a normal day at launch scale, which is the failure mode we can afford.
7. **Will the official index be readable during judging?** Unverified. Two windows on one day measured 20.8%
   then 56.7% non-200 and the trend inside the session was worse, while its own status endpoint reported the
   database healthy throughout. Re-measure before submitting. Nothing we render blocks on it either way.
8. **Will the registry implementations move under us?** Unverified and, on a free endpoint, unknowable.
   Identity and reputation sit behind a 3-of-5 Safe and validation behind a single EOA, so the authority
   exists. Whether it has ever been used is what no free RPC serves: the proxies emit no `Upgraded` log in the
   window `research/R01-erc8004.md` could scan and it lists the full history as blocked by the archive limit.
   The one move in this stack that is verified is the whitelisted escrow policy on chain 97
   (`research/R02-erc8183.md`). So the registries and the tokens are watched rather than known. The watcher
   plus the banner is the whole mitigation.
9. **Will a buyer actually sign the prepared `giveFeedback`?** Unverified. It is a registry call rather than a
   token transfer, so a payment facilitator does not sponsor its gas, which means the buyer pays for the
   privilege of rating. The score does not depend on it, which is the design's answer, but the on-chain
   trail is thinner without it.
10. **Venus Prime boost units are unresolved**, so the yield metric excludes the boost entirely rather than
    displaying a number whose meaning is a coin flip between 0.1476 percentage points and 14.76%. Reading the
    Prime contract at `0x059EabA8676b03e4e8f009eFb7F587C28450F50f` (`research/R09-bsc-defi.md`) would settle
    it.
11. **Is the `mu_c` clamp band of 0.40 to 0.90 right?** It is a guard against a thin category becoming
    self-congratulatory, chosen rather than measured. Once any category has 50 counted jobs the clamp should
    either be widened or removed and that is a human decision in the changelog.
