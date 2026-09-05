# 13-PARTNERS: four partner tracks off one build

What this settles: the TermiX 30/30/20/20 rubric mapped to features a judge can click and artifacts a
judge can check, the Agent Advantage Report designed in full as a build deliverable, the five gates a
TermiX hire has to clear with no help from us, the Altana qualification line by line with the command a
verifier runs and the artifact that answers it, which of the ten Altana skills we wire and the one we
publish, the PancakeSwap agent and the data it needs from us, what we take from 8004scan and where AltLLM
can honestly go, then the rule that stops any of it becoming a bolt-on plus a checklist per track.

Vocabulary, component names, field names and constants come from `research/SPINE.md`. Programme wording
comes from `00-PROGRAM.md` and is quoted where it is quoted. Partner facts come from `R07-termix.md`,
`R06-altana.md`, `R08-pancakeswap.md`, `R05-8004scan-api.md`, `R02-erc8183.md`, `R14-rivals.md` and
`R15-compliance.md`, all read on 2026-09-05. The score belongs to `06-QUALITY.md`, the rail to
`08-MONEY.md`, the category contracts to `03-TAXONOMY.md`, the buyer doors to `05-ONBOARDING.md` and the
build order to `15-SYSTEM.md`. Where this document does arithmetic it shows it. Several facts were read
directly for this document on 2026-09-05, on chain or against a live endpoint. Each one carries its time or
its block in place.

**One rule governs everything below.** A partner artifact ships only if it sits on the path a buyer
already walks. A surface that exists to satisfy a track and nothing else is cut, because three judges who
have opened every other entry can tell an integration from a badge. Section 7 turns that rule into a
cross-walk and names what it cut.

## 1. TermiX: the rubric mapped to features and artifacts

The TermiX table is the only fully weighted rubric in the programme (`00-PROGRAM.md`). Four criteria at
30/30/20/20, judged independently of the main track, with the Agent Advantage Report as an eligibility
gate rather than a bonus: "Submissions must include the required Agent Advantage Report to be eligible."

Two sentences from the same page shape the build more than the weights do. "You are not asked to
integrate anything with TermiX. The submission is the marketplace itself, judged on whether the agents on
it are genuinely worth paying for." And "TermiX will hire from your marketplace themselves and see what
comes back."

So 60% of this track is one property measured twice: once when they hire us, once when we report. The two
readings had better agree. A report claiming a large win against an agent that times out when they hire it
is worse than no report, because the mismatch becomes evidence against every other number in the
submission (`R07-termix.md`).

### 1.1 Value of the services, 30%

Quoted: "Real working agents at a price and speed that beat the alternative. TermiX will hire from your
marketplace and evaluate the results."

| Feature | Artifact that proves it | Where it lives |
| --- | --- | --- |
| Four agents that return a decision with a refusal path, not prose | the four category contracts, each with named outputs, units and refusal conditions | `03-TAXONOMY.md` section 2, rendered on every listing page |
| Measured latency per listing, not a claim | elapsed seconds per completed job, published with the sample size and the window | `06-QUALITY.md` owns the metric, `/compare` renders it |
| A price hundreds of times under the incumbent median, with both numbers named | 0.10 `$U` per report plus a 0.01 `$U` fee against a median of 70 USDC across 509 published listings | the shelf price panel, with the median cited by source and date |
| A house lane so value is visible before payment | the same deliverable bytes and the same receipt a paid run produces, tagged `origin: house` | gate 2 lane A, section 3 |
| Sub-minute delivery against a three-day market median | the elapsed seconds on every receipt, beside the measured median delivery of 3 days | `/receipt/<receiptId>` |
| A refusal that is a success | the published refusal rate per listing, one worked example and the condition that failed | listing page, `04-AGENT-PROTOCOL.md` section 6 |

Both comparators are measured rather than asserted. `R07-termix.md` paged their public listings endpoint
six times and counted 509 rows: median price 70 USDC, mean 458.14, min 0.01, max 150,250, median delivery
3 days, 499 of 509 instant-buyable, 507 priced in USDC against 2 in USDT. The nearest rival prices all four
mandated categories at 5 USDC with one-day delivery. Our own 0.10 `$U` comes from `08-MONEY.md`, anchored to
the modal completed ERC-8183 budget rather than to taste. The fee floor adds 0.01 `$U`, so a buyer pays
0.11 `$U` for one report.

Two honest limits on that price claim, both stated wherever it is published. The published basis is price plus
fee, so the ratio of 70 to 0.11 is 636x on face value. On price alone it is 700x, which is the figure
`08-MONEY.md` quotes, so the two are one comparison on two bases and every place we publish it names which.
It also compares a USDC price against a `$U` price whose issuer, peg and redemption are
**unverified** (`SPINE.md`). So the sentence we publish is "0.11 `$U` against a median of 70 USDC across 509
listings read on 2026-09-05", with both tokens named, rather than a bare multiple.

Their market is moving, so the comparator gets re-read the day the submission goes out. Read directly for
this document at 2026-09-05T17:02Z: `GET /api/v1/listings/price-range` returned
`{"minPrice":"0.01","maxPrice":"150250","currency":"USDC","listingCount":559}` and
`GET /api/v1/stats/network` returned `verifiedAgents` 336,008, `providersCount` 563, `liveServices` 10,118,
`jobsCount` 196,625 at `latestBlock` 120,146,761. So the listing count moved 509 to 559 and the provider
count 513 to 563 inside one day, which is hackathon entrants arriving. The median belongs to R07's 509-row
sweep and is cited with that n.

The thing that actually wins this criterion is that they hire us and it works first time with nobody
helping them. Everything in the table is scaffolding for that one event, which is why section 3 exists.

### 1.2 Proven agent advantage, 30%

Quoted: "Measured, not asserted, backed by the required Agent Advantage Report."

| Feature | Artifact that proves it |
| --- | --- |
| The report is a product surface, not an attachment | `/report`, linked from the landing page, anonymous fetch returns 200, no login |
| Every figure traceable to a file | `INDEX.html` with a per-figure link, `MANIFEST.json` with a sha256 per file |
| A rubric nobody could tune afterwards | `rubric.md` plus the commit hash that froze it, dated before the first run |
| A judge re-derives our numbers | `recompute.mjs` against chain state at the pinned block on the free keyless archive endpoint, plus a stored call set with a hash check for the offline path |
| The control was real | one screen recording per human control arm, the logged active minutes, the published hourly rate |
| At least one arm hires somebody else's agent | a third-party `agentId`, its published price and the transaction that paid it. If the recruitment pass in section 2.3 lands nothing by its freeze, the named candidate list with a reason per candidate takes that row's place and the headline table says so |
| We published a loss | at least one column where a control beats the agent, in the headline table rather than a footnote |

A report that merely exists does not score. `R14-rivals.md` read a live rival entry whose report requirement
it records as already met: three qualifying with-agent against without-agent pairs including a trading task,
two wins and one loss, plus an ERC-8183 control job that reached `COMPLETED`. R14 took the escrow line from
their README and named no chain, so it was read on chain for this document. It is **testnet** job 675 on the
chain-97 kernel `0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE`: status field 3, `COMPLETED`, budget 0, its
description a deterministic integer-sum control task naming their own protocol. Mainnet job 675 is a different
job belonging to somebody else, a pieverse meme-booster judge with an unrelated client and provider, so the
chain is part of the claim rather than a detail. Whether any rival holds a settled **mainnet** escrow job stays
**unverified** (`SPINE.md`) and nothing found so far is one. Five
choices in section 2 exist to beat that specific bar: block-pinned machine ground truth rather than
judgement, two independent control arms per task, at least two arms hiring somebody else's agent, blind
grading whose disagreements are published rather than averaged away and a second control that measures
what hiring costs with no marketplace at all.

### 1.3 High-stakes categories and track record, 20%

Quoted: "Trading, stock/equities and security agents weighted above general-purpose. Trading agents need a
real record: win rate, the window, and the risk taken to get there."

This is the criterion most entries will fumble, because a track record is work and a category label is
free. The three words in their sentence are claimed as follows, with the limit of each claim stated beside
it.

| Their word | What we put behind it | The honest limit |
| --- | --- | --- |
| trading | the `grid` contract, whose outputs include `winRate` per round trip, `netPnlQuote`, `benchmarkPnlQuote`, `excessReturn`, `risk` as `{maxDrawdown, realisedVol, peakNotional}` and a `fills[]` array where every row resolves to a BSC transaction (`03-TAXONOMY.md` section 2.2) | a backtest is labelled a backtest in the same sentence as the win rate. Nothing claims live capital that did not move |
| stock and equities | a shipped `rebalancing/portfolio-weights` listing whose basket holds a bStock, priced and hireable, with `uiMultiplier()` applied rather than assumed. The listing ships whether or not report task T5 does, so the claim survives the cut order in section 2.2 | 1:1 backing is not on-chain verifiable. `R07-termix.md` found no attestation contract, oracle or reserve feed, so we quote no backing claim |
| security | the `health-factor` contract, whose remedy set structurally excludes every call that can move collateral out, plus wallet screening on both counterparties before a quote is served | this is risk protection, not code auditing. Their own manifest carries several audit agents, so we say which sense we mean instead of borrowing theirs |

The record itself is a page per trading listing carrying the window as `{firstBlock, asOfBlock}`, the trade
count, the round-trip win rate, the profit factor, the max drawdown and the excess return against holding
the starting inventory. A per-fill win rate is never published, because a grid only buys below and sells
above its own reference, so a per-fill rate is 100% by construction and a judge who has traded spots it in
seconds (`03-TAXONOMY.md`, `R09-bsc-defi.md`).

Their own baseline is the reason the record is worth building. TermiX's reputation contract returns
`getScore(id)` 50 for an agent with no history and every one of the nearest rival's five listings reads
`completedJobs: 0`, `stake: "0"`, `reputationScore: 50`, the untouched baseline (`R07-termix.md`). A record
of any length beats a baseline nobody has moved.

### 1.4 Marketplace quality, 20%

Quoted: "Find, compare, hire, without instructions."

| Feature | Artifact that proves it |
| --- | --- |
| Category-first landing, four shelves generated from one template | four `/c/<slug>` pages with identical components (`03-TAXONOMY.md` section 5.3) |
| A compare row on the fields that decide a hire | price with its token and decimals, the per-category metric with its window, reachability tier with the age of the check, evidence tier, Muster score with its interval and sample size, distinct paying counterparties, receipt links |
| Live means clickable | the last settled job per listing with its transaction hash and timestamp, never a badge |
| Search with no wallet connected | the cold anonymous fetch sweep in section 3 gate 1 |
| Every listing carries its input schema plus a worked example | `GET /schema` per agent, mirrored on the listing page (`04-AGENT-PROTOCOL.md`) |
| Proof a stranger can do it | a recording of a first-time visitor completing a hire unaided, timed, published with the elapsed seconds |

That last artifact is the literal test in their sentence, so it is built as a test rather than as a video:
hand the URL to somebody who has never seen it, record the screen, publish the time. If they stall, the
product gets fixed rather than the recording. It needs one person who is not us, which section 2.7 names in the
staffing assumption. The recording goes out under the scrub rule in section 2.8, with the runner described in
role terms only.

### 1.5 One data-quality lesson from their own endpoints

Their `/api/v1/stats/network` reported `liveServices: 10068` while `/api/v1/listings` totalled 509 and
`verifiedAgents: 334739` against `providersCount: 513` (`R07-termix.md`). At 2026-09-05T17:02Z the same two
endpoints read 10,118 against 559 and 336,008 against 563, so the gap is structural rather than a bad
minute. The field is undocumented, so any explanation is a guess and `R07-termix.md` says so.

The rule we take from it is not a criticism, it is a constraint. **Never show a count we cannot click
through to** and always show the registry population separately from the commercially live population.
336,008 registered against 563 selling is the single most useful fact about the BSC agent economy and
telling those two populations apart is a product feature rather than a footnote.

## 2. The Agent Advantage Report, designed in full

Their published spec has four requirements: at least three real tasks, each run both ways (an agent hired
through the marketplace against doing it without one), time plus cost plus output quality reported for each,
with the actual outputs attached and at least one task from trading, stock or security (`00-PROGRAM.md`).

Everything below is built so a judge can re-run it and get our numbers back, because "measured" is the word
the 30% criterion uses. The report is a directory in the public repo and a page on the product, because
where it is filed is **unverified**: neither the programme page nor the TermiX campaign page names a channel
(`R07-termix.md`).

### 2.1 The tasks

Every task is an instance of a category contract that already exists in `03-TAXONOMY.md`, so one set of runs
feeds two rubrics: the TermiX 30% and the main track's Agent Diversity. Every task is pinned to a block, so
the correct answer is a fixed value anybody can recompute forever. Every task is a decision with a stated
refusal condition, never an essay, because a refusal the ground truth confirms scores full marks and that has
to be true before the runs start.

**T1 grid, go or no-go with a record. This is the trading task.**
Contract `grid`, sub-capability `grid/spot-ladder`. Brief: for PancakeSwap v3 WBNB/USDT at block N, with a
stated budget per side, bounds, a level count, `maxSlippageBps` 50 and `deadlineCapSeconds` 60, return the
`ladder[]`, the `nextFill` with its `minOut`, the `inventory` after, then the record block: `winRate` per
round trip, `window` as `{firstBlock, asOfBlock}`, `netPnlQuote`, `benchmarkPnlQuote`, `excessReturn` and
`risk`. Or a refusal naming the failed condition. Ground truth: pool state, tick spacing, fee tier and gas
price are all reads at block N. The reference pool is `0x172fcD41E0913e95784454622d1c3724f546f849`, the
0.01% tier, where `token0` is USDT so the raw price is WBNB per USDT and has to be inverted
(`R08-pancakeswap.md`). Every published fill is re-derived from the venue's own `Swap` logs and
`executionPrice1e18` is shown beside `oraclePrice1e18` from the Venus ResilientOracle at
`0x6592b5DE802159F3E74B2486b091D11a8256ab8A`, which is an independent feed and free.

**T2 health factor, the smallest action that lifts an account. This is the high-stakes task.**
Contract `health-factor`, sub-capability `health-factor/preliquidation-repay`. Brief: for a named Venus
borrower at block N, with an `alarmHf` and a `remedyBudget`, return `hf`, `hfBasis`, `sums`,
`liquidationPrices[]`, `distanceBps`, the effective `closeFactor` and `liquidationIncentive`, then either the
single cheapest `remedy` with its `sessionScope` or a refusal. The borrower address is chosen from live accounts at
the pinned block and named in `brief.md` rather than here, because this document publishes no address it did
not read. Ground truth: every input is a read at block N and the arithmetic is closed form, so the recompute
emits one number to diff. This is the task where a human control loses time honestly. Venus core is a
Diamond rather than the Compound fork every tutorial describes, `getAccountLiquidity` `0x5ec88c79` answers
the liquidation question while `getBorrowingPower` `0x528a174c` answers the borrow question and on one real
account the two differed by $29.81 on $825 of debt, collateral factor and liquidation threshold are separate
numbers on 12 of 55 core markets and inside E-Mode pool 1 the liquidation incentive is 1.06e18 against
1.10e18 in core (`R09-bsc-defi.md`). A control that reads the wrong getter produces a plausible wrong
answer, which is exactly what the scorer is for.

**T3 rebalancing, an LP range reset or a HOLD.**
Contract `rebalancing`, sub-capability `rebalancing/lp-range`. Brief: for a live position token id at block N,
return `range`, `principal`, `feesUncollected` including `pendingCake`, `inRange` at the pinned block,
`feeAprNet` on both a 24 hour and a 7 day basis, `ilAtScenarios[]`, the `breakEven` block, then a `verdict`
of `hold`, `widen`, `narrow`, `recentre` or `exit` with the arithmetic shown. Both fee windows exist on the day
because the venue publishes `feeUSD24h`, `protocolFeeUSD24h`, `feeUSD7d`, `protocolFeeUSD7d` and `tvlUSD7d`
itself and the position side is a pinned-block liquidity share, so neither window needs a series of ours
(`R08-pancakeswap.md`). Those five venue fields are a rolling aggregate rather than a chain read, so the capture
ships with its fetch timestamp under `ground-truth/calls/` and the recompute reads the capture instead of
re-fetching. That is the one input in T3 a judge reproduces from our stored bytes rather than from chain.
`feeAprNet` carries its window plus that timestamp wherever it is shown. **`inRangeFraction` is not in T3's
required-field list**, so Completeness never scores
against it: `snapshotCumulativesInside` returns a running counter that cannot be read retroactively, a fraction
needs two of our own samples and the sampler starts inside the build week, so on 2026-09-09 the series is a
day or two old at best. It is published when it exists, under the name `03-TAXONOMY.md` settles, with
`sinceBlock` and `asOfBlock` beside it. Until the window is long enough it renders as not applicable with
the series age. Ground truth: position 7251129
in pool `0x36696169C63e42cd08ce11f5deeBbCeBae652050` at block 120,022,524, where `getAmountsForLiquidity`
plus `getFeeGrowthInside` reproduced principal `amount0` 269831877053662063423, `amount1`
2778988391779779884, fee0 3513241007712413575 and fee1 4804395069351404 against simulated
`decreaseLiquidity` and `collect` at 0 bps error on all four (`R08-pancakeswap.md`). The honest answer here
is often HOLD and the rubric says so before the runs start.

**T4 yield, a rate comparison with the migration cost netted off.**
Contract `yield`, sub-capability `yield/lending-supply`. Brief: across the Venus stablecoin markets plus Aave
v3 at block N, for a stated principal, return `ratePerUnit`, `rateUnit`, `sourceCall`, `apy` with the
`annualisation` naming its constants, `basis`, `components[]` summing to `apy`, `utilisation`, `excludes[]` and
`capacity`, then a break-even holding period in days once gas and any exit slippage are netted against the
APR gain. Or a HOLD with the same arithmetic shown. Ground truth: per-market supply rate, cash, borrows and reserves at block N. The trap the
scorer checks is the unit. Venus core is per block and compounds daily,
`((1 + ratePerBlock/1e18 * 192000)^364 - 1)`, where 192,000 is blocks per day and the exponent is 364, which
reproduces `api.venus.io` to 4e-12. Venus's own blocks-per-year constant is 70,080,000, which is 192,000 times
365 and carries no exponent, so the two do not compose and an arm that multiplies them is wrong (`SPINE.md`,
`R09-bsc-defi.md`). Lista Moolah is per second and annualises
`exp(r * 31536000) - 1` and Aave v3 is already annual in ray with no annualisation step at all
(`R09-bsc-defi.md`). Three protocols, three units and an answer that blends them without naming the unit is
wrong even when the number looks right. Aave appears as an option rather than as the thing to leave, because
`R15-compliance.md` reads the Aave v3 BUSL-1.1 Additional Use Grant as excluding use that facilitates
migration of funds out of Aave and no Aave source is vendored.

**T5 rebalancing with a tokenised equity in the basket. This is the stock task.**
Contract `rebalancing`, sub-capability `rebalancing/portfolio-weights`. Brief: for a basket whose target
weights include a bStock, at block N, with a maximum slippage, return the holder-facing balances, the deepest
PancakeSwap pool per leg with its fee tier, the mid price from `sqrtPriceX96`, the price impact of each leg
computed as `1 - (outputAmount / inputAmount) / mid`, a token screen verdict per new asset, the `breakEven`
block, then the plan or a refusal. Ground truth: token reads plus pool reads at block N. METAB is
`0x7425889FE94F9d693E8daefE88BCCed6AcFEf4c0`, `name()` "Meta Platforms", `symbol()` "METAB", 18 decimals and
`uiMultiplier()` returns exactly 1e18 today while `multiplier()`, `scaledUIMultiplier()`, `getMultiplier()`
and `shareToAmount(uint256)` all revert (`R07-termix.md`). So the holder-facing amount is
`balanceOf(a) * uiMultiplier() / 1e18`, which happens to equal `balanceOf(a)` right now. An agent that reads
the multiplier is correct by construction and a control that does not know the hook exists is correct by
luck. Whether it was ever anything else is a historical read and it was run for this document on the archive
endpoint in section 2.9: `uiMultiplier()` returns exactly 1e18 at sixteen sampled blocks from METAB's first
block of code, 106,007,876 at 2026-06-24T00:47:01Z, through 120,162,000. So the report states no observed
divergence as a sampled measurement with its blocks rather than as an absence of checking, the trap is latent
rather than triggered and nothing claims 1:1 backing. A continuous proof would need the setter's log history,
which no free RPC serves across 14 million blocks.

**Two refusal cases are scored on purpose**, one in T2 and one in T5, because a correct refusal is worth full
marks under the frozen rubric and an agent that never refuses is the failure mode this whole product exists
to avoid. Both refusal cases are declared in `rubric.md` before any run, so they cannot be presented as luck
afterwards.

### 2.2 What ships and the cut order

Their spec needs three. **Three pairs are the floor and they ship: T1, T2 and T3.** T1 carries the mandated
trading task, T2 is the highest-stakes category and T3 is the category the programme's own table lists first.
The harness is one runner plus one scorer, so T4 and T5 cost a brief, a recompute script and two arms each
rather than new machinery and they run in the same day-2 block if it holds (`15-SYSTEM.md`). **Cut order
under time pressure, decided now rather than at 3am on the 8th: T5 first, then T4.**

Nothing claims five pairs until five exist. The published count is whatever ran, stated as a number in the
headline table. The report says which pairs were planned and which were cut. Cutting a pair never removes a shelf:
all four shelves ship with their own receipts either way, since the shelves answer Agent Diversity and the
pairs answer TermiX.

### 2.3 The three arms per task

One agent arm and two control arms. The second control is the one nobody else is running and it is the arm
that measures the marketplace rather than the agent.

| Arm | Who does the work | What it measures |
| --- | --- | --- |
| **A. agent through Muster** | a listed agent, hired through the normal buyer path, paid, `origin: order` | what the product delivers to a stranger |
| **C1. operator unaided** | a competent operator with the same brief, allowed a general-purpose LLM chat | the "without one" arm their spec asks for |
| **C2. find and hire with no marketplace** | the same operator, 30 minute cap, registry plus 8004scan plus web and repo search, no Muster | what hiring an agent costs today, which is the gap the programme itself names |

C2 exists because the programme's own gap statement is testable: "hiring one today means digging through X
threads and GitHub repos" (`00-PROGRAM.md`). The measured population says what C2 will probably find. Of 600
uniformly sampled BSC agents, 12 reach reachability tier T2 (machine-callable) and **0 reach tier T3**
(payable by a stranger) on the ladder `MEASUREMENT.md` defines. 8004scan lists exactly **5**
endpoint-verified agents on BSC, **three of them one operator's**, which is the split `SPINE.md` carries. The
same query re-read twice at 2026-09-05T19:00Z returned `total` 5 with token ids 304493, 302258 and 302257 under
one owner, then 7612 under a second and 705 under a third. `R05-8004scan-api.md` recorded four of five under one
owner earlier the same day, so the composition moves and the count ships with its read time. The reconciliation
is in `decisions/13-partners-endpoint-verified-count.md`. So the honest expected
outcome of C2 is a named failure with a clock on it. A named failure is a result rather than a gap in the
report. C2's outcome is recorded as time-to-first-hire or as one of `no candidate found`,
`candidate unreachable`, `no price published`, `payment path needs the operator`.

**Two of the agent arms hire a third-party agent where one can be recruited**, not a first-party one, with its
`agentId`, its published price and the settlement transaction in the bundle. A report where every agent arm is
our own agent measures our own code twice. No BSC agent publishes a price today, so that arm needs an operator
recruited rather than found. The path is set here rather than discovered on the 8th.

The candidate pool is the 12 rows at tier T2, the 5 endpoint-verified rows and anything a fresh probe promotes
to T2, deduplicated by `agentId`. Each candidate's registration document is read for a contact surface, the
operator is offered a listing at their own price with our fee waived and the claim flow `05-ONBOARDING.md`
owns fixes the listing on the `agentId` they already control, so nothing is re-registered on their behalf.
**The candidate set freezes on 2026-09-07** so an arm can actually run on the 8th. A listing that clears the
hireable bar after the freeze is documented as next rather than used.

The fallback is published rather than avoided. If no third-party listing clears the bar by the freeze, the
report says so in the headline table, prints every candidate with the reason it failed, publishes
all-first-party agent arms and states in the same sentence that the comparison then measures our agents
against a human control rather than against the market. That is a weaker result than a third-party arm. It is
still a measurement, which an empty arm is not.

### 2.4 Measuring time

**Agent arm.** `t0` is the server-side timestamp when the brief is accepted, `t1` is the timestamp when the
deliverable becomes retrievable. Both come out of the `broker`'s own request log and the settlement
transaction, never a stopwatch. The bundle publishes `t0`, `t1`, the source of each and the elapsed seconds.
For a paid run it also publishes the payment transaction's block timestamp, so a judge can see whether we
measured from payment or from brief and can recompute either.

**Control arms.** A screen recording with a visible clock, started when the operator first reads the brief and
stopped when the operator commits the final answer. Active minutes and recording length are reported
separately. Every pause is logged in the recording with its reason. The recording ships.

**Every arm gets the byte-identical brief**, published as `brief.md`, with the same acceptance criteria and the
same required field list. A control that was told less than the agent is a rigged comparison and a reviewer
who has read several of these reports looks for exactly that.

One caveat the report states rather than hides: BSC blocks land 0.45 s apart (`SPINE.md`, measured over
100,000 blocks), so a block timestamp is a coarser clock than a stopwatch at the sub-second scale. Every
elapsed figure under 5 s is published to the second with its source named.

### 2.5 Measuring cost

Every figure in the agent arm traces to a transaction hash or a request log line. No estimates.

| Component | Agent arm | Control arms |
| --- | --- | --- |
| Service price | the amount actually settled, read off the settlement transaction | not applicable |
| Muster fee | the second authorisation's settled amount, its own transaction | not applicable |
| Gas | gas used times effective gas price, from each receipt, stated as who paid it | gas for any transaction the control had to send |
| Labour | zero operator minutes, stated plainly | active minutes times the published hourly rate |
| Data or API | any paid call the agent made | any paid call the control made |

Three rules that make the cost column defensible.

**The hourly rate is a published number, not a person.** It sits in `rates.md` so a judge who thinks it is
wrong can substitute their own and recompute every total. Padding the control's rate to manufacture a cost win
is the easiest thing in the whole report for a reviewer to catch, because the rate is the only number in it
they can argue with.

**USD conversion is an on-chain read. `$U` is not converted at all.** Every token amount that has a vToken
market is converted with the Venus ResilientOracle at
`0x6592b5DE802159F3E74B2486b091D11a8256ab8A` at the pinned block, called with the vToken for each asset, whose
address is read from the Comptroller's own market list rather than hardcoded here. `getUnderlyingPrice` is
scaled `1e(36 - underlyingDecimals)`, so the scale is read from `decimals()` and never assumed
(`R09-bsc-defi.md`). The Binance public ticker is recorded beside it as a cross-check and labelled as one,
because Binance's market-data terms for redisplay are **unverified** (`SPINE.md`). An on-chain price needs no
grant and reproduces at the pinned block forever, which a spot HTTP read does not.

**There is no vToken for `$U`, so the agent arm publishes no USD total.** `08-MONEY.md` ships `usdRate` and
`usdRateSource` empty for the same reason and asserts no peg anywhere in the product: `$U`'s issuer, peg and
redemption are **unverified**, so a dollar figure over it would be an asserted peg rather than a measurement. The
agent arm's cost is therefore the price and the fee in `$U` base units with `decimals` beside them, plus gas in
wei and in BNB. `cost.json` carries those and no USD total. The control arm's cost stays active minutes times
the rate in `rates.md`, in the rate's own currency. So the headline comparison is elapsed time and operator
minutes rather than a dollar ratio. The table says that in its caption rather than leaving a reader to work
it out.

**The honest total is reported, including the case where the agent arm costs the buyer more and wins on
time.** A gasless first hire on the signature rail costs the buyer nothing in gas, because our submitter pays
it, measured at 103,377 gas for `$U` and about 0.0000052 BNB at 0.05 gwei (`05-ONBOARDING.md`,
`R04-bsc-tokens.md`). That is a real advantage and it is small in dollars, so it is stated in gas and in BNB
rather than inflated.

### 2.6 Measuring quality

**Freeze the rubric before either arm runs.** Write it, commit it, publish the commit hash in the report. A
rubric written after the outputs exist is not a measurement.

**Score the numeric part with a script, not with judgement.** Each task ships `ground-truth/recompute.mjs`,
which reads chain state at the pinned block and emits `expected.json`. The scorer diffs every arm's answer
against `expected.json` field by field with a stated tolerance per field. The script, the expected file and
the tolerance table all ship.

Per task, out of 100:

| Component | Points | Scored by | How it is scored |
| --- | --- | --- | --- |
| Correctness | 50 | the script | field-by-field diff against `expected.json` inside the published tolerance |
| Completeness | 20 | the script | every required field present, from the field list in `brief.md` |
| Calibration | 15 | the graders | does the output state its own inputs, its pinned block, its bounds and its expiry. Does it refuse when the evidence does not support an action. A correct refusal scores full marks. The script checks the two declared refusal cases first, so judgement cannot mark a correct refusal down |
| Reproducibility | 15 | the script | does the output carry the pinned block, the source calls and a content hash a reader can verify |

Three components are the scorer's and one is the graders'. Saying which is which is what tells a builder what
the script writes into `score.json` and what a human writes.

**Anything not machine-checkable goes to two blind graders.** They ran neither arm. They receive every output
with each marker of origin stripped, in a randomised order, then score against the frozen rubric. Both grader
sheets ship, disagreements included. A disagreement is never averaged away in silence, because it is
information about how hard the task was.

**The aggregation rule is fixed before the runs: both sheets ship and the published Calibration figure is the
lower of the two.** An average hides the disagreement inside a number neither grader wrote. The lower value
cannot flatter us. The spread is printed beside it so a reader sees the figure and how far apart the graders
were. `score.json` carries the three script components as one value each per arm, then Calibration as
`{graderA, graderB, published, spread}`, then the arm total. C2 is scored only when it produced an answer,
because a search that found no hireable candidate has a clock and a failure reason rather than an output to
mark.

Tolerances are per field and they are not decoration. Principal and fee amounts on T3 are diffed **to the
wei**, because `R08-pancakeswap.md` reproduced all four to the wei at a pinned block, so anything looser would
hide a real error. Prices carry a bps tolerance and the reason: reading the same position three blocks apart
moved `amount0` by 0.63 bps and the mid moved 27 bps over 190 s, so an arm that failed to pin its block shows
up as a price miss rather than as noise.

### 2.7 The control condition, stated in the report rather than buried

This is where a report of this kind cheats, so the rules are published as rules.

- The control is a competent operator doing the task with the same brief, the same acceptance criteria and the
  same field list as the agent.
- **The control may use a general-purpose LLM chat.** Banning one builds a straw man and a reviewer will
  assume we banned it to flatter the agent. What the control may not use: Muster, our agent's code, our
  agent's output, our internal tooling or any recompute script from the bundle.
- The control runs first. Where both arms run in parallel, the control runs on an independent machine by a
  person who has not seen the agent's answer. The order is recorded per task.
- The control is not asked to work under time pressure and is not interrupted. A rushed control inflates the
  agent's win.
- C2 gets a hard 30 minute cap so the arm terminates and the cap is published with the result. A cap is
  honest, an open-ended search is not measurable.
- **If a control wins a task on time, cost or quality, it goes in the headline table.** A report where the
  agent wins every column by a wide margin reads as manufactured. One honest loss makes the rest credible.
- Every arm is run once. Best-of-N on either side is not a measurement and no re-run replaces a recorded one.
  A failed run is published as a failed run with its error.

**The staffing assumption is stated, because this is the one part of the report the build cannot produce by
itself.** The full protocol wants an operator per task for C1 and C2, two graders who ran neither arm and a
first-time visitor for the unaided-hire recording in section 1.4. What the build assumes is **one operator and
one grader**, plus a distinct first-time visitor who has not seen the product. The grader is never the operator
who ran an arm, because a grader scoring their own work is not blind. Everyone is named in role terms only, with
no personal data in any published file.

The reduced protocol, if that is all we have: the same operator runs C1 then C2 on every task with the order
recorded per task, the single sheet ships as `grader-a.md` with `grader-b.md` absent and no spread, then
`INDEX.html` prints "one grader, no inter-grader spread" in the headline table rather than in a footnote. An arm
nobody ran is published as not run. A control arm is never attributed to a human who did not sit through it.

### 2.8 The evidence bundle

"With the actual outputs attached" is a literal requirement, so the bundle is a directory in the public repo
rather than a PDF. A PDF cannot be re-run.

```
aar/
  INDEX.html                  the numbers up front, every figure linking to its file
  MANIFEST.json               every file with its sha256, plus the aggregate totals
  VERIFY.md                   one command that re-runs every recompute and diffs
  rubric.md                   frozen before any run, with the freezing commit hash
  rates.md                    the hourly rate and the USD price source, as numbers
  T1-grid/
    brief.md                  byte-identical text handed to every arm
    agent/
      request.json            exactly what was sent
      response.json           the raw deliverable, unedited
      receipt.json            the product's own receipt, fields below
      tx.txt                  payment and fee transaction hashes
      timing.json             t0, t1, elapsed, the source of each
      cost.json               price, fee, gas, who paid it, totals in base units. No USD over `$U`
    control-1/
      recording.mp4           screen capture with a visible clock, scrubbed per the rule below
      notes.md                what the operator did, in order
      answer.json             the final answer in the same schema
      timing.json             active minutes, recording length, logged pauses
      cost.json               minutes, rate, data costs, total
    control-2/
      notes.md                every candidate considered, with the reason it failed
      outcome.json            time-to-hire or one of the four named failures, plus the clock
      cost.json               capped minutes, the rate, the total, in the rate's own currency
    ground-truth/
      block.txt               block number, its timestamp, the RPC endpoint used
      recompute.mjs           reads chain state at that block, emits expected.json
      expected.json           the answer, regenerable
      calls/                  the raw call responses, keyed by call and block, hashed
      tolerance.json          the per-field tolerance the scorer used
    score/
      score.json              per-component points per arm, Calibration as both sheets plus the published lower value
      grader-a.md             blind sheet
      grader-b.md             blind sheet, absent when only one grader was available
  T2-health/, T3-lprange/, T4-yield/, T5-bstock/    the same shape
```

`receipt.json` is not a bespoke file. It is the product's own receipt record, carrying SPINE's fields:
`receiptId`, `contentHash`, `hashRule`, `txHash`, `blockNumber`, `pinnedBlock`, `inputsHash`, `codeVersion`,
`recomputeCommand` and `publishedAt`. So the strongest artifact in the report is a page the marketplace
already publishes for every hire, which is the whole stacking argument in one file.

Two rules make the bundle hold up. **Every number in `INDEX.html` links to the file it came from**, so a judge
who will not clone anything still sees the result and a judge who will clone lands on the byte behind any
figure in one click. **`VERIFY.md` is one command** and it re-emits every `expected.json` from chain state at
the pinned block.

A third rule covers the recordings, because gate 3 fetches every URL `INDEX.html` cites anonymously, which makes
a real person's screen a public artifact. **What a recording must not contain**: a wallet balance, any address
belonging to a person rather than to the build, an account name, an email or messaging client, a browser profile
name, a tab that is not the task and any window title carrying a real name. The operator who assembles the
bundle watches each recording end to end against that list before it goes in. The gate below records the
check per file. A recording that cannot be scrubbed is re-shot rather than published.

### 2.9 What a judge can reproduce and what nobody can

Naming the irreproducible half is what makes the reproducible half believable, so the report carries this
table rather than a reproducibility claim.

| Part | Reproducible by a judge | Why or why not |
| --- | --- | --- |
| `expected.json` for every task | **yes, exactly** | every input is a read at a pinned block, so the answer is a fixed value forever. The one exception is T3's `feeAprNet`, whose venue-side 24 hour and 7 day fee aggregates are rolling, so that input reproduces from the timestamped capture under `ground-truth/calls/` rather than from a re-fetch |
| the content hash of every deliverable | **yes** | `recomputeCommand` on the receipt, over the published bytes |
| the payment and fee amounts | **yes** | on chain, by transaction hash |
| the agent arm's field-by-field score | **yes** | the scorer, the tolerance table and both inputs all ship |
| the agent arm's latency on the day | **no** | a live measurement of a live service. The report publishes the log lines and the p50 and p95 over all runs so the claim is checkable in aggregate rather than replayable |
| the control's wall clock | **no** | one person, one sitting. The recording is the evidence and the report says so |
| the graders' judgement | **no** | every sheet ships, so the reasoning is inspectable rather than reproducible. With two graders the spread ships too |
| C2's search | **partly** | the candidate list and the failure reason per candidate ship and every candidate is an `agentId` a judge can re-probe. The clock is not replayable |

One environment limit is stated in the same table's footnote rather than discovered by a judge. **The three
RPCs the measurement covers serve no archive state**: publicnode answers roughly 60 blocks back, bsc-dataseed 82
and 1rpc 73, publicnode refuses an older read with "Archive requests require a personal token" and its
`eth_getLogs` is capped at 5,000 blocks (`R08-pancakeswap.md`, `MEASUREMENT.md`). One free keyless endpoint does
serve it and `SPINE.md` names it in its own constants table: `https://bsc-mainnet.public.blastapi.io`, proved in
`R04-bsc-tokens.md`, which used it as its fork source. Read for this document on 2026-09-05 it returned
`liquidity()` on the T3 pool at the pinned block 120,022,524 while publicnode returned HTTP 403 on the identical
call. It still answered at block 118,000,000, about eleven days back at the measured 0.45 s block time.

Two caveats travel with that endpoint. It rate-limits a bulk sweep, so it is a point-read endpoint rather than
an indexing one (`R01-erc8004.md`). And no second free keyless archive endpoint was found: `bsc.drpc.org`
returned HTTP 500 on three tries, `bsc.rpc.blxrbdn.com` answered `not supported` for a historical `eth_call` and
`api.zan.top` rate-limited. So the bundle gives a judge two runs rather than two endpoints. Every recompute
stores its own raw call responses under `ground-truth/calls/`, keyed by the call and the block, so `VERIFY.md`
replays offline against the stored set with a hash check. The same command re-runs live against the named
archive endpoint. A judge with no archive access verifies that our published numbers follow from the stored
reads. A judge who uses the endpoint verifies the reads themselves.

### 2.10 The gate before the report is published

Six checks, each recorded with its output, the same way any other gate in this build works.

1. `node aar/T*/ground-truth/recompute.mjs` for every task, twice: once live against
   `https://bsc-mainnet.public.blastapi.io` at the pinned block, then once offline against the stored call set
   under `ground-truth/calls/` with its hash check. Identical output both ways or the task is not block-pinned
   and does not ship. Two live endpoints is deliberately not the gate, because only one free keyless archive
   endpoint exists (section 2.9).
2. `sha256sum -c` against `MANIFEST.json`, clean.
3. Every URL `INDEX.html` cites fetched anonymously for a 200, including the repo, the receipts and the
   recordings. Our own authenticated calls prove nothing here (`00-PROGRAM.md`).
4. Every recording watched end to end against the scrub list in section 2.8, recorded per file.
5. A cold anonymous run of every listed agent through the house lane, timed, with the elapsed seconds inside
   the p95 the report claims.
6. `grep` the report text for em dashes and for the comma-before-and plus comma-before-or patterns, empty result.

## 3. What "TermiX will hire from your marketplace" requires of us

Five gates. Each is something a stranger has to get through with no help from us and each has a verified
constraint attached rather than a guess. Two facts set the shape of all five: **we do not know which wallet
TermiX judges from**, so nothing may depend on an allowlist and **whether they pay or expect a free trial is
unverified**, so both paths have to work (`SPINE.md`, `R07-termix.md`).

### Gate 1: a public URL that needs no login

Every path a judge might land on returns 200 to an anonymous fetch: `/`, each of the four `/c/<slug>` shelves,
every `/a/<agentId>/<listingId>`, `/compare`, `/search`, `/receipt/<receiptId>`, `/coverage`, `/report`,
`/status` and the
docs set (`03-TAXONOMY.md`, `15-SYSTEM.md`). No wallet-connect wall in front of browsing. Their own criterion
is "find, compare, hire, without instructions", so a connect prompt before the first useful screen loses
points before anything else is judged.

The check is a cold `curl -s -o /dev/null -w '%{http_code}'` per URL from a clean session, run again after the
repo flips public, including raw and blob links to any asset the writeup or the video description names. A
logged-in browser and an authenticated `gh` call both pass regardless, which is why neither counts.

### Gate 2: a hire an outsider finishes unaided

The trap is copying TermiX. Their own path needs a wallet session over an EIP-712 signed nonce, an owned agent
NFT to act as the client side, an ERC-20 `approve`, then a `createOrder`, then a `releaseEscrow`: four
signatures plus a minted identity before money reaches the provider (`R07-termix.md` section 8.5). A judge who
has not minted an agent on our marketplace cannot finish that. Three lanes instead, in order of friction, all
three matching the buyer doors `05-ONBOARDING.md` owns.

**Lane A, nothing at all.** The whole read journey with no wallet, no login, no signature and no token: land,
shelf, listing, compare, then a receipt of a job that already settled, whose `recomputeCommand` a stranger can
run on their own machine. On top of that, a house-funded try-it run on the four first-party reference listings,
producing the identical deliverable bytes and the identical receipt a paid run produces, tagged
`origin: house` so it never touches revenue, volume or the Muster score and shown on the receipt trail as a
house run (`06-QUALITY.md`). Three brakes sit on it because it is a public button on a judged site: a per-IP
rolling-minute limit, a per-request budget and a global lifetime house cap after which the lane keeps
answering and stops spending (`05-ONBOARDING.md`). This is table stakes rather than a differentiator: the
nearest rival already publishes a no-wallet trial URL in four of its listing descriptions. Not having one is
the only way it costs us.

**Lane B, one signature.** Connect any EIP-1193 wallet, see the price with its token and decimals before
signing, sign one EIP-3009 `TransferWithAuthorization` and get the deliverable. No identity NFT, no
`approve`, no on-chain transaction from the buyer, no BNB needed, because our submitter pays the gas
(`08-MONEY.md`, `05-ONBOARDING.md`). Their path is four signatures plus a mint. **Ours is one on the 3009 rail
and that number is the friction argument, stated with its rail.** Gate 4 concludes that the likeliest TermiX
buyer holds Binance-Peg USDC, whose only paid path here is Permit2: one `approve(Permit2, max)` transaction at
46,446 gas the buyer pays in BNB, then one signature per hire after that. So the likely judge's paid path is
two steps the first time. A USDC holder with no BNB has no paid path at all and lands on lane A, which is why
the house cap has to survive the whole judging window rather than the demo.

**Lane C, machine.** A whole hire completes over HTTP with no browser, then again over MCP. Gate 3 has the
detail.

Nothing in any lane routes through us. No email, no manual approval, no chat handoff, no allowlist. Two paths
into a hire are supported and both end in the same job record. Intent-first, where the buyer describes the task
and `matcher` selects. Name-the-agent, where the buyer already holds an `agentId` or a `listingId` and never
sees the ranking at all (`07-MATCHING.md`). The second is the likelier path for a buyer who arrived to
test one agent, so it is a first-class route rather than a fallback.

### Gate 3: the machine surface, in the shape their tooling can use

Verified: TermiX's own client is a skill package of Node scripts over their REST API plus a `.well-known`
manifest and a recursive grep of the live 1.5.0 package finds no `mcp` and no `x402` (`R07-termix.md`). So an
MCP-only surface is one their own tooling cannot drive. Four surfaces ship, in this priority.

| Surface | Ours | Their equivalent |
| --- | --- | --- |
| REST read API, no auth, paged | `GET /v1/agents`, `/v1/listings`, `/v1/categories`, `/v1/probes`, `/v1/receipts/{id}`, `/v1/status`, every list as `{ items, page, pageSize, total, totalPages }` (`15-SYSTEM.md`) | `/api/v1/listings`, `/api/v1/stats/network`, `/api/v1/service-categories` |
| An OpenAPI document plus `llms.txt` | `/docs/api/openapi.json` at 3.1 with `info.license` populated, plus `/llms.txt` (`10-DOCS-AND-POLICY.md`) | a placeholder OpenAPI file: theirs is the Mintlify sample with two paths and a sandbox server |
| MCP | one Streamable HTTP endpoint speaking MCP 2026-07-28, tools `muster.find_agents`, `muster.get_listing`, `muster.compare_listings`, `muster.get_quote`, `muster.get_receipt`, `muster.get_status` (`15-SYSTEM.md`) | none, which is the gap to fill |
| The x402 challenge itself | a `402` on the invoke route carrying `PAYMENT-REQUIRED`, which is a machine-readable price and payee (`08-MONEY.md`) | none in their client package |

**We do not mint a `.well-known` path.** R07 recommends mirroring their `/.well-known/aacp-agent.json` and we
deliberately do not, for the reason `04-AGENT-PROTOCOL.md` settles: RFC 8615 says an application wanting a new
well-known URI MUST register it and A2A's `/.well-known/agent-card.json` plus ERC-8004's
`/.well-known/agent-registration.json` are the only two that belong to anything we implement. Minting
`/.well-known/muster.json` would be an unregistered path in the same wrong place as the multi-tenant platform
whose sharded well-known path fails on its own terms. Machine discovery is the four rows above, which is more
than their client can already consume.

Their conventions are mirrored where mirroring is free, because a reviewer who has just read their API should
not re-learn ours: the paged envelope above, money as a decimal display string beside its base units and its
`decimals`, ISO-8601 UTC timestamps, strict request schemas that reject an unknown field rather than ignoring
it and an error whose code and message state the exact shortfall.

### Gate 4: a way to pay us that does not need our help

This gate carries the hardest verified constraints in the whole track and one addition to the rail
`08-MONEY.md` owns.

**Their default signer is mainnet only.** `TERMIX_WALLET_MODE` defaults to `agentic`, driven by the `baw` CLI
from `@binance/agentic-wallet` 1.9.0, whose own doc says it "supports BSC (56) and Base (8453) ... and no
testnets" and external signing additionally needs Developer Mode enabled with a daily spend limit
(`R07-termix.md`). Two consequences. **The paid path is BSC mainnet, priced small**, because a testnet-only
hire cannot be paid by their default wallet at all and a large price risks a daily limit we cannot see. And a
free lane has to exist, because whether they will fund a wallet for this is unverified.

**No single-signature rail exists in the token their market actually uses.** Binance-Peg USDC and BSC-USD both
revert on `DOMAIN_SEPARATOR()`, `authorizationState`, `nonces` and `version()`, so neither implements EIP-3009
or EIP-2612 (`VERIFIED-payment-rail.md`). Meanwhile 507 of their 509 listings are priced in USDC
(`R07-termix.md`). So the buyer we know is coming holds the one asset that cannot sign once.

The shipped answer is the ladder `08-MONEY.md` settled, plus one row. One label travels with it wherever `$U`
is priced here: `$U`'s EIP-3009 support is verified by a live `transferWithAuthorization` on a mainnet fork in
`R04-bsc-tokens.md` and matched independently through its domain separator by `R06-altana.md` and
`R16-reuse.md`, **not** by `VERIFIED-payment-rail.md`, which never tested it. FDUSD and USD1 are the two the
hand-run file proved. `SPINE.md` fixes that split and every `$U` row below inherits it.

| Rail | Token | Friction for the buyer | Role |
| --- | --- | --- | --- |
| house lane | none | zero | their first look, plus every screenshot in the report |
| EIP-3009 `TransferWithAuthorization` | `$U`, USD1, FDUSD, all 18 decimals | one typed-data signature, no transaction, no BNB | the default paid hire |
| Permit2 `PermitWitnessTransferFrom` through `x402ExactPermit2Proxy` `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` | USDT `0x55d398326f99059fF775485246999027B3197955` | one `approve(Permit2, max)` at 46,446 gas the first time, then one signature per hire | labelled second rail |
| the same Permit2 path, one more `accepts[]` entry | **Binance-Peg USDC `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`, 18 decimals** | identical to USDT | the token a TermiX buyer is most likely to hold |
| ERC-8183 escrow | `$U` on the official kernel | an allowance plus five calls, batchable | an agent buyer or a smart-account buyer |

**Adding USDC is a decision, not a note.** It is one configuration row plus one `decimals()` boot assertion,
it reuses the canonical Permit2 at `0x000000000022D473030F116dDEE9F6B43aC78BA3` and the same
`Witness(address to,uint256 validAfter)` typehash `0xd97b3239a7f32295517bd14cb074edfdd188dfe5eb42f802bb26d4fd1eb12c37`
that binds the recipient inside the buyer's signature and it changes no default: `$U` stays the first
`accepts[]` entry. `08-MONEY.md` owns the table, so this is a row to add there rather than a new rail here.
Two traps come with it, both already verified: Binance-Peg USDC is **18 decimals** on BSC, not 6, so a
constant carried from another chain is wrong by a factor of a trillion. And PancakeSwap deploys its own
different Permit2 at `0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768` whose signatures are not interchangeable
with the canonical one (`R08-pancakeswap.md`).

One more thing the gate needs and it is free: `x402Support` is a first-class boolean in the ERC-8004
registration document TermiX's own indexer reads and every agent in their manifest currently has it `false`
(`R07-termix.md`). Our first-party agents set it `true` and honour it, so a machine reading the registry finds
a payable agent without asking us.

### Gate 5: a receipt they can check

TermiX's own model, in their words: the deliverable hash is written on chain at submit and payment releases
against that hash rather than against a promise and their best-performing listing does the same voluntarily,
shipping a `report.json` carrying a keccak256 content hash (`R07-termix.md`). We use the same mechanism,
because it converts our claims into something a judge recomputes rather than believes.

Every completed job publishes a permanent `/receipt/<receiptId>` page carrying the SPINE `receipt` fields:
`contentHash` over the canonicalised deliverable bytes, `hashRule` naming which of `keccakCanonical`,
`sha256Raw`, `keccakRaw` or `none` produced it, `txHash`, `blockNumber`, `pinnedBlock`, `inputsHash`,
`codeVersion` and a `recomputeCommand` a reader pastes to reproduce the hash from the published bytes.

`hashRule` is on the page for a measured reason. **Three incompatible deliverable conventions are live on BSC
right now**: the official SDK's `keccak256(canonicalJson(manifest))`, one live producer's `sha256` over the raw
`optParams` bytes verified byte-exact on job 56712, then a third whose `optParams` is empty so its hash cannot
be checked at all (`R02-erc8183.md`). A marketplace that prints "verified" without naming the rule is making a
claim it cannot defend, so we name the rule and, on somebody else's escrow job, we try
`keccak256(canonicalJson)`, then `sha256(raw)`, then `keccak256(raw)` and publish which one matched or that
none did.

The test is that somebody who never paid us can verify a run we were paid for. That is the only claim in the
submission nobody can argue with.

## 4. Altana: the qualification checklist, line by line

Five requirements, all five required, plus two prize gates and two bonuses (`00-PROGRAM.md`). The reason this
track is winnable cheaply is structural: **every requirement is a free `eth_call` a judge can run without us**,
which is exactly what requirement 3 asks for when it says integration should be "read onchain rather than from
the pitch". The permissions do not live in the Keystore, they live on the agent's own EIP-7702 delegated
wallet and both halves are public reads (`R06-altana.md`).

Two identifiers exist for the same key and confusing them is the most likely integration bug in the whole
track:

```
Keystore keyId  = keccak256(publicKey)                                   // 0x04 || X || Y, 65 bytes
account keyHash = keccak256(abi.encode(uint8 keyType, keccak256(publicKeyBytes)))   // keyType 2 = secp256k1
session EOA     = address(uint160(uint256(keccak256(X || Y))))
```

The Keystore takes `keyId`. Every account-level permission read takes `keyHash`. Both are printed on the agent
page with the derivation beside them and both ship in `/docs/constants.json` per agent, so a verifier copies
rather than derives (`15-SYSTEM.md`).

### 4.1 The five requirements and the two prize gates

Chain 56 unless a row says 97. Keystore `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a`, `VERSION()` `1.0.1`.
Controller `0x0834Ee2C9BdC3E3efF0a2dC34393D4B0e546A555`, `VERSION()` `1.1.1` (`SPINE.md`, `R06-altana.md`).

| # | Their requirement | Our artifact | The command a verifier runs |
| --- | --- | --- | --- |
| G1 | "Agents on their own Altana wallets" | four wallets, one per category agent, never one shared. Each carries a registered root key with expiry 0 | `cast call <keystore> 'getKeys(address)(bytes32[])' <wallet>` is non-empty, then `isRootKey(address,bytes32)` `0xe1248ed6` true and `getExpiry(address,bytes32)` `0x3b49ad47` returns 0 for the admin key |
| G2 | "Sessions with real limits: call allowlist, spend cap, expiry" | per-agent `permissions.calls` scoped by target **and** selector, `permissions.spend` at **25 USDT a day**, which is base units `25000000000000000000` on `0x55d398326f99059fF775485246999027B3197955` at 18 decimals with `spendInfos` period enum **2 (day)**, plus a native cap of `20000000000000000` (0.02 BNB) for gas, `expiry` past 2026-09-23 | on the **wallet**: `canExecute(bytes32,address,bytes)` `0xff619c6b` true for a listed target plus selector and false for anything else, `canExecutePackedInfos(bytes32)` `0xe5adda71` shows no `0x32323232` any-function entry, `spendInfos(bytes32)` `0xdcc09ebf` word 2 reads `25000000000000000000` rather than `2^160` and word 1 reads 2 for the day period. On the Keystore: `getExpiry` in the future |
| G3 | "Sessions registered in Keystore, so integration is read onchain rather than from the pitch" | every grant runs with `register: true`, which is the default and costs `registrationFeeUSD()` 5e17, so $0.50 off a Chainlink BNB/USD feed, about 694,041,152,910,285 wei | `isValidKey(address,bytes32)` `0x8fd4f06b` returns true for `keccak256(sessionPublicKey)` |
| G4 | "Real onchain transactions through a session key. Testnet counts, mainnet is stronger" | one confirmed mainnet transaction per category, each one named rather than left open: `yield` supplies 5 USDT through `vUSDT.mint`, `health-factor` repays 1 USDT through `vUSDT.repayBorrowBehalf` against a borrow the admin opened on that wallet, `rebalancing` and `grid` each swap 2 USDT for WBNB on the v2 router. Every one is signed by the session and not the admin, with the `transactionHash` from its `ExecuteResult` in the packet and on the agent page | the BscScan transaction page shows the agent wallet as sender and the same key appears live on the Altana explorer key page |
| G5 | "User-facing control: a user can see what their agent may do, and revoke it, inside the product" | `/agent/<agentId>/authority`, the `session-panel`, rendered from the four reads above on **every** render with no server cache, Revoke wired to `revokeSession` (`08-MONEY.md`) | click Revoke in the product, then `isValidKey` flips false and the `keyId` drops out of `getKeys` in the next block |
| P1 | "your submission must show live onchain transactions in the Altana explorer" | one explorer URL per wallet: `https://explorer.altana.network/account/<wallet>`, plus `/key/<full 32-byte keyId>` per session | open the URL. Both are public and need no account. **A truncated key id 404s**, so the full 32 bytes go in the submission |
| P2 | "make sure you include your wallet address(es) in your submission" | all four wallet addresses listed, not one | read the submission |

Four things about that table decide whether a judge reads it as an integration or as a badge, because they are
what somebody who has already opened other entries will be checking for.

**A wide session fails G2 on inspection even when the cap is real.** Omitting `permissions.calls` grants every
target inside the spend cap and the Altana docs say so twice (`R06-altana.md`). So the verifier's negative test
matters as much as the positive one: `canExecute(keyHash, someUnlistedTarget, 0xdeadbeef)` must return false.
Ours returns false because each session names targets and selectors.

**The riskiest category gets the narrowest allowlist**, which is the opposite of what a bolted-on integration
produces. All four are spelled out by target and by selector here, because a session nobody can spell out is a
session nobody can build or check.

| Session | Target and selector | Note |
| --- | --- | --- |
| `health-factor` | USDT `approve(address,uint256)` `0x095ea7b3` with the spender pinned to the vToken, then vUSDT `0xfD5840Cd36d94D7229439859C0112a4185BC0255` `repayBorrowBehalf(address,uint256)` `0x2608f818` | repay only. Nothing that can move collateral out (`R09-bsc-defi.md`) |
| `rebalancing` and `grid` | `approve` `0x095ea7b3` on the basket tokens with the spender pinned to the router, then the PancakeSwap v2 router `0x10ED43C718714eb63d5aA57B78B54704E256024E` `swapExactTokensForTokens(uint256,uint256,address[],address,uint256)` `0x38ed1739` | one venue, one swap shape, one cap |
| `yield` | USDT `approve` `0x095ea7b3` with the spender pinned to vUSDT, then vUSDT `mint(uint256)` `0xa0712d68` and `redeemUnderlying(uint256)` `0x852a12e3` | Venus supply and withdraw, no borrow, matching the registry skill's own scope (`R06-altana.md`) |

`redeemUnderlying` sits inside the yield scope and outside the health-factor one on purpose. For a yield listing
the supply **is** the position and the redemption pays the agent's own wallet, so withdrawing is the exit the
listing promises. For a health-factor listing the same call moves collateral that backs a debt, which is the one
direction a rescue session must never be able to move value. Four narrow scopes read better than one wide one
and they are what keeps the consent screen short enough to be honest (`R06-altana.md`, `08-MONEY.md`). The
remedy set for health factor structurally excludes every call that can move collateral out: `redeem`,
`redeemUnderlying`, `withdrawCollateral`, `borrow`, `exitMarket`, `Vat.hope` and `Moolah.setAuthorization` never
appear in a `sessionScope` (`03-TAXONOMY.md`).

**The explorer is evidence, never our source of truth.** On 2026-09-05 an Altana account page reported "0
Active keys, 0 Total keys" while `getKeys` returned two keys with one valid and a key page said "(from
indexed history, live node read unavailable)" (`R06-altana.md`). So the panel reads contracts and links the
explorer beside them.

**An MPC wallet under an exchange account cannot satisfy that table, whatever its UI shows.** Binance Agentic
Wallet is MPC custody under a Binance account, its limits are enforced server side at the API level and it
publishes no on-chain permission record, with no documented expiry and no session keys
(`R17-binance-agent-os.md`). So there is no key for `getKeys` to return, no `spendInfos` entry to read on a
wallet and no `keyId` to register in the Keystore, which fails G1, G2 and G3 by construction rather than by
degree. G4 it could satisfy, since it does send real transactions. G5 it cannot, because what a user audits
there is executed activity rather than granted authority. That is why the two sit beside each other in the
product instead of one substituting for the other: Agentic Wallet is a convenience path for a buyer who already
holds a Binance account (`12-BINANCE.md`) and Altana is the self-custodial path this track scores.

### 4.2 Bonus one: hiring through ERC-8183

Quoted: "Hire BNB Agent Studio agents through ERC-8183 using the Altana ERC-8183 SDK. Altana ships both the
buyer side and the seller side."

Two jobs, neither of them a mock, which is the shape `R02-erc8183.md` settled and `08-MONEY.md` ships.

**Mainnet, one funded job.** Created from an Altana wallet against a real third-party `provider` address at
that provider's published price, with `evaluator` and `hook` both the router, the whitelisted policy registered before
funding, budget set, funded in `$U`. Kernel `0xEa4DAa3100A767e86FDed867729ae7446476EBA6`, router
`0x51895229E12F9876011789B04f8698af06cCD6DA`, policy `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5`, payment
token `$U` `0xcE24439F2D9C6a2289F741120FE202248B666666` at 18 decimals. The `$U` comes off chain rather than out
of a faucet, because mainnet has none. `08-MONEY.md` settles the route and it was re-read for this document on
2026-09-05: the PancakeSwap v3 0.01% pool `0xA0909f81785f87f3e79309F0E73A7d82208094E4` pairs USDT against `$U`
and held 11,314,333.69 `$U` against 9,705,212.29 USDT with `liquidity()` 2.66e27 at block 120,162,613, so a few
`$U` is one swap. One token per kernel is the contract's rule, so this leg has no substitute token. If the route
closes, the mainnet job moves to documented as next and the testnet `COMPLETED` job carries the escrow claim
alone, which it can because it is a full lifecycle rather than a partial one. Verifier command:

```
cast call 0xEa4DAa3100A767e86FDed867729ae7446476EBA6 \
  'getJob(uint256)((uint256,address,address,address,string,uint256,uint256,uint8,address,uint256,bytes32))' \
  <jobId> --rpc-url https://bsc-rpc.publicnode.com
```

Field 2 is our wallet as `client`, field 8 is the status against the locked enum
`0 OPEN, 1 FUNDED, 2 SUBMITTED, 3 COMPLETED, 4 REJECTED, 5 EXPIRED`.

**Testnet, one job driven to COMPLETED.** The same flow on chain 97 where `disputeWindow()` is **900 s** on the
current policy `0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA`, so the whole loop closes inside one sitting: claim
10 `$U` from the faucet `0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3`, hire, the provider submits, wait 15 minutes,
then anyone calls `settle`. The old testnet policy `0x4F4678D4439feC812Ac7674Bb3Efb4C8f5Fb78A6` is dead: the
router no longer whitelists it and `registerJob` reverts `PolicyNotWhitelisted()`, so the address is read from
the SDK at build time and `router.policyWhitelist(policy)` is asserted true before the first hire.

The mainnet timing is stated rather than dodged. `disputeWindow()` is **604800 s** and `settle` unlocks at
`submittedAt + disputeWindow` rather than at funding (`SPINE.md`, `R02-erc8183.md`), so a job **submitted** on
2026-09-08 becomes settleable around 2026-09-15, mid-judging. The page derives that date from the job's own
`submittedAt` and shows no date at all while the job is still `FUNDED`, so a job that sits funded for a day
renders a later date instead of a flattering one. The page shows it as an in-flight hire with its
job id and its status, with the dispute button live while the window is open and claim-refund after
`expiredAt`. Nothing is described as COMPLETED before it is.

Three constraints that bite if they are not planned for, all from `R06-altana.md` and `R02-erc8183.md`:

- **A session gets no ERC-20 `approve` permission, deliberately**, because a leaked key's allowance would
  outlive revocation. The admin pre-sets a bounded allowance to the kernel and the buyer batch becomes four
  calls plus that allowance rather than five.
- **Quote signing from a session is an ERC-1271 envelope** rather than an EOA signature. A session key's
  `isValidSignature` only returns the magic value when `msg.sender` is an approved checker for that key, so the
  checker is approved once per session and a verifier must call `isValidSignature` rather than `ecrecover`.
- **A hook is mandatory and there is no hook allowlist.** `hook = address(0)` reverts `HookRequired()`
  `0x55c45de1` and the hook must pass ERC-165 for `IACPHook` `0x7ff6bc9e`. The router is that hook.

One thing we will not do, stated because it is available and tempting. The evaluator is unconstrained at
`createJob` and any ERC-165 hook is accepted, so we could be the evaluator on a job we also buy and complete it
ourselves. That is a self-dealt attestation a judge who reads the job will spot, so the router path is the only
one we use and `settle` stays permissionless. The `settler` runs against **every** job on the router rather than
only ours, which turns a stalled escrow into a paid provider for strangers too: 28,326 jobs are in flight and
nobody is obliged to call `settle` (`R02-erc8183.md`).

### 4.3 Bonus two: selling over x402 and why B402 is a config flip rather than a claim

Quoted: "Implement sell over x402/B402 using the x402 server SDK."

**x402 ships.** One `@altananetwork/x402-server` guarded route on our public HTTPS invoke path, offering both
rails in the same challenge: `eip3009` in `$U` for a Studio buyer and `permit2-exact` in USDT for everyone else,
with `maxTimeoutSeconds` at 300 and never above 480, because Studio refuses windows over 600 s and backdates
`validAfter` by 120 s (`R06-altana.md`, `08-MONEY.md`). Verifier command: `curl` the invoke route with no
payment header and get a `402` back carrying `PAYMENT-REQUIRED` as base64 JSON, then pay it with any x402
client or with the Altana MCP `x402_request` tool.

**B402 does not ship as a sell path and the reason is the schedule rather than the surface.** The highest-trust
file in the set closed most of what used to be open here. `VERIFIED-payment-rail.md`, corrected by
`R17-binance-agent-os.md`, records B402's `eip3009` scheme as accepting **`$U` and USD1 only**, over
`POST {BASE_URL}/papi/v2/b402/{supported,verify,settle}` on `eip155:56` and `eip155:97`, with the facilitator
submitting the transaction and sponsoring the gas. Its public Bazaar at
`https://www.binance.com/bapi/ramp/v1/public/ramp/b402` is a keyless read surface with 979 live resources.
**BSC mainnet access is granted on request and needs a developer account. Testnet is open.** What stays
**unverified** is narrower than it was: the `BASE_URL` itself and the real `signerAddress` and
`spenderAddress`, both of which arrive with a `/supported` response, since every address in the docs is a
placeholder (`SPINE.md`, `R03-x402-b402.md`).

So testnet B402 is skippable rather than blocked. It is skipped for a stated reason. x402 already ships the
sell rail on mainnet where the product actually charges, the bonus asks for a sell integration rather than for
two of them and day 3 carries no free block (`15-SYSTEM.md`). A testnet-only sell path would also be the one
surface in this track a judge could not exercise against the live product. B402 therefore sits behind the same
`facilitator` interface as our in-process implementation and becomes a config flip the day credentials land
(`08-MONEY.md`), with that interface's supported-token set already carrying the `$U` and USD1 restriction so the
flip cannot silently drop FDUSD. Claiming a B402 integration we cannot demonstrate would fail the same honesty
test we apply to everybody else's numbers.

### 4.4 Which of the ten skills we wire

The registry at `https://skills.altana.network/index.json` holds exactly ten skills, all published by Altana,
all fork-tested 2026-07-21 and the live file is byte-identical to a capture taken nine days earlier, so the set
is stable (`R06-altana.md`). It returned 200 when re-read for this document at 2026-09-05T17:02Z. The
hackathon's own "Ideas to Build" table names the Altana piece for autonomous DeFi as spend caps plus the Aave,
Venus, PancakeSwap and Lista skills, so this mapping is the sanctioned path rather than an interpretation
(`R06-altana.md`, quoting the capture `raw/bnb-smart-money-era-2026-09-05.html`). That row is cited to the
capture because `00-PROGRAM.md` does not carry the table.

| Skill id | Wired | Which category or why not |
| --- | --- | --- |
| `venus-lending` | yes | `yield/lending-supply`. Supply and withdraw USDT, no borrow. vUSDT `0xfD5840Cd36d94D7229439859C0112a4185BC0255` is 8 decimals against USDT's 18 |
| `aave-v3-lending` | yes | `yield/lending-supply`. Pool `0x6807dc923806fE8Fd134338EABCA509979a7e0cB`. Aave appears as an option and no Aave source is vendored, per the BUSL grant in `R15-compliance.md` |
| `lista-staking` | yes | `yield/lst-staking`. StakeManager `0x1adB950d8bB3dA4bE104211D5AB038628e477fE6`, slisBNB `0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B`. Its exit is a two-step withdrawal with a 7 to 15 day unbonding wait, so a stake and its claim never sit in one session and the listing says so |
| `pancakeswap-liquidity` | yes | `yield/lp-fees`, v2 only. The skill does not cover v3 or Infinity, so the v3 half of that sub-capability is ours |
| `pancakeswap-trading` | yes | the execution leg for `rebalancing/portfolio-weights` and `grid/spot-ladder`. Its `tp-sl-watch` play is a two-sided price trigger and a grid is that pattern with a ladder of levels |
| `dexscreener-token-radar` | yes, read only | the risk gate before a basket takes a new asset and the polling shape behind a ladder watch. Read only, no cap needed |
| `x402-payments` | yes, buyer side | the agent-hires-agent path, which is how one of our agents pays another's invoice under a session cap |
| `four-meme` | **no** | launchpad sniping maps to none of the four mandated categories, which is the whole reason. The registry publishes this skill's own defaults as 3% slippage with a 0.1 BNB cap (`R06-altana.md`). The 20% by BNB value and 5% by token value belong to `Buy_Meme_Token` in the sponsor's `bsc-mcp` server (`R07-termix.md`) and are not this skill's |
| `copy-trade` | **no** | mirroring a named wallet is discretionary trading on someone else's decisions, which is the posture `R15-compliance.md` keeps the product outside and it maps to none of the four |
| `wallet-tracker` | **no** | research only. It has a home as an `adjacent` supporting read under `03-TAXONOMY.md` section 3.1, not as a listed category agent |

**Health factor has no Altana skill at all and that is the opening.** Both lending skills exclude borrowing on
purpose: Venus Lending is supply-only and the Aave skill's own `mayNot` list names borrowing
(`R06-altana.md`). So every rival who assembles four agents straight off the registry has a hole in exactly the
category the rubric mandates. We build it from the protocols directly, using the reads
`03-TAXONOMY.md` section 2.4 fixes and **we publish one skill back**: a health-factor skill submitted to
`https://skills.altana.network/submit`, which Altana fork-tests before listing. That is real upstream work that
stands on its own if the marketplace does not win and a listed skill is a durable third-party endorsement of
the entry. It is offered, not counted: nothing in the submission claims a listing Altana has not made.

**One deliberate departure from `R06-altana.md`.** That file recommends rendering the registry's own
`display.may` and `display.mayNot` copy verbatim on our consent screen, plus using `inputs[].askAt` to split
grant-time from run-time inputs. We take the structural idea and we do **not** ship their prose, because no
licence, terms or grant for the skills registry content was found by any research pass in this set and
`R15-compliance.md`'s rule is that a third-party input ships only under a clause we can quote. Absence of terms
is not permission. So the consent screen is generated from chain reads, which need no grant:
`canExecutePackedInfos` gives the allowlist as target and selector pairs, `spendInfos` gives the cap with its
live period window, `getExpiry` gives the countdown and the selector labels are written by us. Where a session
mirrors a skill's scope we cite the skill by `id`, `version` and the `sha256` the registry publishes and we
link the registry rather than copying it. This costs one afternoon of writing labels and it removes an
unlicensed dependency from the render path.

### 4.5 Submission mechanics, the do-not-ship list and what the XP actually is

| # | Requirement | What we do |
| --- | --- | --- |
| S1 | wallet addresses in the submission | all four agent wallets, plus each session's full 32-byte `keyId`, plus the explorer URL per wallet |
| S2 | functional and publicly accessible during judging, 2026-09-09 to 2026-09-23 | every session `expiry` is set past 2026-09-23, because a judge landing on an expired agent sees a dead integration. The anonymous canary runs the whole journey through the window (`15-SYSTEM.md`) |
| S3 | agents surfaced must be live on BSC | chain 56 for everything submitted. Testnet is used only for the settlement loop that mainnet's 7-day window cannot close in time and it is labelled |
| S4 | one entry per team, judged independently of the main track | the same submission, no separate Altana build |

Nine things we never do, each of which costs a gate (`R06-altana.md`): grant a session without `calls`, scope
the ERC-8004 registry as `{to: registry}` (which also authorises `transferFrom`, `setApprovalForAll` and
`setAgentWallet`), pass `register: false` on anything submitted, let the SDK generate the session signer, run
`JSON.stringify` over a `Session` object, set a stablecoin cap with 6 decimals when BSC stablecoins are 18,
rely on the relay faucet for tBNB when it resolves to a no-op mint against the zero address, share one wallet
across four agents or point the demo at localhost or an unlisted URL.

**The prize is standing rather than a payout and the writeup says so.** 50,000 XP against quests that total
3,000 (create 500, fund 1,000, grant 1,500) and a Sovereign tier at 30,000, with the current leaderboard's top
ten all sitting at the 3,000 quest cap. How the 50,000 is allocated is **unverified**: the programme page says
allocation mechanics are to be confirmed. Whether XP attribution needs the wallet declared anywhere is also
unverified and the mitigation is free because the programme separately requires the addresses in the
submission (`SPINE.md`, `R06-altana.md`).

**Mainnet is nearly empty, so timing matters.** 123 keys ever registered, 56 live, 157 events and 90
transactions in 14 days, with the activity feed paginated 25 at a time. Eight registrations from us moves the
whole registry by about 6%, so the grants are timed for the days around submission rather than weeks before,
which puts our wallets on the explorer's first screen during judging week.

The cost has two lines rather than one, because G4's four transactions move real value. **Fees are under $5**:
0.000694 BNB per key registration times eight keys, four admin and four session, plus gas at 0.05 gwei.
**Working principal is about 15 USDT plus the escrow budget in `$U`**: 5 USDT supplied on Venus, 1 USDT repaid
against a borrow opened with about 5 USDT of collateral, then 2 USDT swapped twice. That principal is committed
rather than consumed, since the supply is redeemable and the swapped side is sellable, so the irrecoverable part
stays the fees plus slippage. The `$U` line is the mainnet escrow job's budget at the third-party provider's
published price, which the report names once the provider is picked. Both lines are published, because "under
$5" counting only registration would be a cost claim the four mandated transactions contradict. Against a
$30,000 main prize and 50,000 XP it is still a rounding error. The three XP quests are steps one to three of
the build anyway.

## 5. PancakeSwap: the agent and the data it needs from us

**1,000 CAKE and no published rubric for this track** (`00-PROGRAM.md`). With no criteria to answer, the only
defensible artifact is an agent that is right where the ecosystem's own tooling is wrong, with every correction
runnable in one command.

### 5.1 The agent

One agent, two listings, because one agent may hold up to four listings and each carries its own category
contract (`SPINE.md`). It answers `rebalancing/lp-range` directly and `yield/lp-fees` at the position level.
The same pool state feeds `grid/spot-ladder`, so it is a category agent rather than a partner demo.

Per position, at one pinned block, using the output names `03-TAXONOMY.md` section 2.1 fixes: `range`,
`principal`, `feesUncollected` including `pendingCake`, `inRange`, the optional `inRangeFraction` with its
`sinceBlock` and `asOfBlock` once the sampler has a window, `feeAprNet` on both
a 24 hour and a 7 day basis, `ilAtScenarios[]` at the buyer's own price multipliers, `breakEven` as
`{expectedFeeGain, realisedIl, gasCost, swapCost}`, then a `verdict` of `hold`, `widen`, `narrow`, `recentre`
or `exit` with the arithmetic shown and a `plan` carrying `{to, calldata, minOut, deadline, recipient}` or a
deep link. No window is baked into a field name, because the window is data (`03-TAXONOMY.md`). Nothing in the
plan is signed by us.

Five things make it worth paying for, each measured in `R08-pancakeswap.md` rather than claimed:

**Impermanent loss computed from the value function, not a table.** The official liquidity-planner skill
publishes 0% IL for full range at 2x, 0% for full range at 5x and 0.03% for a plus or minus 10% range at 2x. The
correct figures are **-5.72%**, **-25.46%** and **-30.66%**. So the error is 5.72 points on the full-range row at
2x, **25.46 points on the full-range row at 5x** and **about a factor of 1000 on the plus or minus 10% row at
2x**, always in the direction that makes concentration look free. Both columns are named because the two errors
live in different ones.

The arithmetic is `IL(p) = V(p)/HODL(p) - 1`, with `V(p) = 2L sqrt(p) - Lp/sqrt(pb) - L sqrt(pa)` inside the
range and `HODL(p) = x(p0) p + y(p0)`. `L` is the position's own liquidity, `p` is the price in quote per base,
`pa` and `pb` are the range bounds as prices with `pa < pb`, `p0` is the entry price and `x(p0)` and `y(p0)` are
the base and quote amounts held at entry. Outside the range `V` collapses to one side: below `pa` it is
`p L (1/sqrt(pa) - 1/sqrt(pb))`, all base, above `pb` it is `L (sqrt(pb) - sqrt(pa))`, all quote
(`R08-pancakeswap.md`). The bound check holds: as the range tightens, IL at a 2x move converges to -1/3 and the
table reaches -33.06% at plus or minus 1%.

**CAKE APR on the in-range staked basis.** `share = L_position / lmPool.lmLiquidity()`, not over
`poolInfo.totalLiquidity` and not over TVL, because `lmLiquidity` is the in-range staked liquidity and the farm
pays only that. On the farm we measured, `lmLiquidity` was 3.026e24 against a staked
6.182e24, so **48.95% of staked liquidity was in range and the other 51.05% was earning nothing**. Apportioning
on the wrong basis roughly halves the answer. The subset relation was re-read for this document on 2026-09-05:
lmPool `0x4d67dc640f5327D0e1c7C6537eD8542aaf46cf99` returned `lmLiquidity()` 1,785,098,041,045,984,395,820,451
against MasterChefV3 `poolInfo(5)` `totalLiquidity` 5,695,701,114,535,367,640,649,661, so the in-range figure is
a strict subset of the staked total and the ratio moves with the price.

**Fee APR net of the protocol's cut, per tier, read from chain.** `slot0.feeProtocol` decodes to 3300, 3400,
3200 and 3200 of 10000 across the four live tiers, so the 0.01% tier pays LPs **0.0067%**, not 0.01%. There is
no 3000 tier on PancakeSwap v3 at all: `feeAmountTickSpacing(3000)` returns 0, so code ported from a Uniswap
example finds no pool. v2's fee is exactly 0.25% today (9975/10000), which predicts a live `getAmountsOut` to
the wei where the 0.2% in the old periphery repo is off by 3.6e17.

**One pinned block for every read in a report.** Reading the same position three blocks apart, which is 1.35 s
on BSC, moved `amount0` by 0.63 bps and the BNB mid moved 27 bps over 190 s. An agent that reads `slot0` in
one call and `positions` in another is reporting a state that never existed.

**Every number cross-checked by simulation before it is shown.** Principal and uncollected fees are recomputed
locally, then compared against `eth_call` simulations of `decreaseLiquidity` and `collect` at the same block.
That reproduced all four values to the wei on position 7251129 at block 120,022,524. A mismatch marks the answer
degraded and shows both numbers rather than picking one.

The trader half is the same discipline applied to a swap. Slippage is a real on-chain guarantee rather than a UI
hint: a quote of 98357409255966486634 at `slippageTolerance` 0.005 produced calldata carrying `minOut`
97865622209686654200, which is 0.995x to the wei inside a tuple the router checks. So the agent's job is
choosing the number. Price impact is computed as `1 - (outputAmount / inputAmount) / mid` with `mid` from
`sqrtPriceX96` on the deepest pool, because the aggregator's own `priceImpactBps` returned **-20624 bps** on a
1 CAKE trade whose realised price sat within 4 bps of the pool mid and gating on it would refuse every small
trade. The quote TTL is 180 s and the calldata deadline came back at `expiresAt + 121 s`, both longer than one
standard BSC move, so the agent caps its own deadline at 30 to 60 s and re-quotes. Sends route through
PancakeSwap's own MEV Guard RPC `https://bscrpc.pancakeswap.finance`, free and first party, with 4 to 5 seconds
of extra confirmation latency budgeted.

### 5.2 What the agent needs from us, ranked by how much it changes the output

| # | What we supply | Why the agent cannot do without it |
| --- | --- | --- |
| 1 | a pinned-block multicall reader over Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11`, one block number and one batch per report | without it every number in a report comes from a different state. `aggregate3` takes 1,500 sub-calls in one `eth_call` |
| 2 | the `sampler`: `snapshotCumulativesInside`, `pool.liquidity()`, `lmPool.lmLiquidity()` and `slot0.tick` on a fixed cadence, retained at least 30 days | `secondsInside` is a running counter, so a fraction needs two of our own samples and no archive endpoint substitutes for the earlier one. The three RPCs in the render pool serve 60 to 82 blocks of state and publicnode answers "Archive requests require a personal token". The one free keyless archive endpoint in section 2.9 covers a recompute at a pinned block, never a series |
| 3 | a per-tier fee and protocol-fee table read from chain at boot and refreshed daily | a pool owner can change `feeProtocol` and the two swap directions can differ, so it is a read rather than a constant |
| 4 | a USD price per token with an explicit staleness stamp, from the Venus ResilientOracle at the pinned block | every APR and every IL figure depends on it and the aggregator's own USD reference appears to be what produces the -20624 bps artefact |
| 5 | a router allowlist refreshed from a live `/v1/calldata` response at startup, with a hard reject on anything else | three different routers are in the wild. Today's target is `0x2f68417A18dA681589F4eA64B9Cc9839209acfF7` (`R08-pancakeswap.md`, which is not in `SPINE.md`'s constants table), 141 bytes of proxy code re-read on 2026-09-05. The official example's allowlist is stale |
| 6 | a verification pass that simulates `collect` and `decreaseLiquidity` for every position shown and marks the report degraded on a mismatch | this is the fifth differentiator above and it is a service rather than a feature of the agent |
| 7 | our own in-range time series in place of a 24 hour TWAP | the pool oracle cannot serve a day: `observe([86400])` reverts `OLD` and the measured maximum lookback was 39,234 s and 21,407 s on two live pools |

Three upstream numbers the agent refuses to pass through, each with its replacement: the Explorer's `apr24h` on
v2 pools, which reproduces 0.68x low with no findable cause and is re-derived from `feeUSD` minus
`protocolFeeUSD`; `/farms/campaigns/56/false`, which returns zero records on BSC so the official farm-APR script
reports a CAKE APR of 0 there; and a dynamic-fee Infinity pool, where `poolKey.fee` is `0x800000` with
`slot0.lpFee` 0, so there is no static fee to quote and the honest answer is realised fees plus a stated reason
rather than a fabricated tier. TVL is never a quality signal on its own either: two live pools with $21.1M and
$19.7M TVL had 24 hour volume of $277 and $634.

### 5.3 Licensing, because this is the track where it bites

PancakeSwap's contracts are copyleft: `pancake-v3-contracts` carries `GPL-2.0-or-later` in its file headers with
no root LICENSE, `infinity-core` is GPL-2.0 and `pancake-swap-core` is GPL-3.0 (`R15-compliance.md`). Reading a
deployed pool over its ABI creates no derivative work and needs no grant, so **we declare the interfaces
ourselves, read over ABI and vendor no Solidity.** Their agent tooling is worse: `pancakeswap-ai` declares MIT in
`package.json` and in its README while shipping **no LICENSE file**, with GitHub's licence API returning null.
`erc-8183-example` has no licence anywhere at all. So no code is copied from either. Citing the published skill
documentation when correcting its IL table is fair reporting of a public document, which is a different act from
reuse and the correction ships with our own script so the claim stands on arithmetic rather than on their text.

The correction is also worth filing upstream, with the reproducible script attached. A PR into their repo takes
their licence rather than ours (`R15-compliance.md`), it is genuine work the project wants and it stands on its
own merits whatever this competition does. It is offered as a contribution and never counted as a submission
artifact.

## 6. AltLayer: 8004scan and AltLLM, with the attribution each one needs

**8004scan Pro tier plus AltLLM credits, amounts published as to be confirmed** (`00-PROGRAM.md`). No rubric
either. So the honest artifact is a build that uses the index the way its own measurements permit, credits it
everywhere it appears and says plainly where it could not be relied on.

### 6.1 The deviation, stated first

This document's scope line asks for 8004scan as our index. It is not our index of record and three measurements
settle that, all from `R05-8004scan-api.md` unless noted.

- Its chain-56 indexer self-reported `status: down` for a whole session with a canonical checkpoint at block
  119,687,744, about 32 hours behind head, while `/status/summary` reported the database fine throughout.
  `R14-rivals.md` read the same frozen block over an hour later.
- It holds **304,281** BSC agents against **334,935** on chain at block 120,027,164 (`SPINE.md`,
  `MEASUREMENT.md`) and it returns 404 for token ids whose `ownerOf` answers, so it under-reports by about 9%.
- Its read path returned non-200 on 20.8% then 56.7% of calls across two windows on one day, the same URL
  flapping 200, 500 then 404. There is no bulk export, no `updated_after` filter, no since-block cursor and no
  webhook for a new agent.

A submission whose agent list proxies that API shows a judge an empty page if the 57% window recurs during
judging and `R14-rivals.md` watched exactly that happen to a rival: its landing page rendered "Registry sync
pending", the word "Offline" four times and three of four headline metrics as `--`, while 8004scan's BSC indexer
was down. So the chain is primary, the second index is a cross-check with its own lag on screen
(`15-SYSTEM.md`). That is a deviation from the brief and it is the one that keeps the product working on the day.

### 6.2 What we do use and how each one is credited

Six uses, all of them real and none of them load-bearing for a page render.

| Use | The call | How it is credited |
| --- | --- | --- |
| Per-agent enrichment on a listed row | `GET /api/v1/agents/56/{token_id}` | their name, their timestamp and their own status on every field. `field_sources` is displayed as theirs, since it is the only provenance map in the ecosystem |
| Cross-chain identity links | `cross_chain_links` and `cross_chain_versions` with `verification_status` | shown as their finding, with `owner_match` and `reciprocal_verified` distinguished rather than flattened. 303 links platform-wide are the strong form |
| Their own score, as a citation | `GET /api/v1/agents/scores/v5/56/{token_id}` | printed as "8004scan v5 score, their algorithm, their date" with the published weights beside it (engagement 0.30, service 0.25, publisher 0.20, compliance 0.15, momentum 0.10, band floor 30.0 ceiling 55.0). Never a sort key of ours |
| Their freshness disclosure, on our status page | `/status/indexers/direct`, `/status/freshness` | rendered as their self-reported lag under their name. It is the only honest freshness disclosure in the ecosystem and showing it is a credit rather than a criticism |
| The one write lever | `POST /api/v1/agents/verify-endpoint/56/{token_id}`, **no auth**, once per hour per agent | fired for shelved rows only, with the countdown shown in the UI. The result is read from `updated_at` and the error string, never from `endpoint_last_checked_at`, which stayed frozen at 2026-05-20 through a verification that demonstrably ran |
| Feedback evidence recovery | `GET /api/v1/ipfs/fetch?cid=` | their public gateway fan-out, cited as the fetch path when it is what resolved a `feedbackURI` body |

The Pro-tier form is filed for the track. It is a real live form promising up to 500 requests a minute and a
self-service `free_api` key already measures **600 a minute and 100,000 a day**, minted headlessly in four calls
on a wallet the operator controls. So it is worth the track and nothing for throughput and whether the granted
tier beats what we measured is **unverified** until a granted key is in hand (`SPINE.md`).

Attribution has a hard edge here rather than a soft one. Their OpenAPI `info` object at backend `0.4.363`
carries no `termsOfService`, no `license` and no `contact`, while `/terms` 404s, so there is no clause to quote
(`R15-compliance.md`). The rule that follows: use it as an index and a cross-check, credit it wherever it
appears, re-derive anything we assert publicly from the on-chain registry, which needs no grant, then
**redistribute no bulk output**. Their webhook skill repository is AGPL-3.0, so it is read for facts and no code
is copied from it.

Six engineering rules, every one earned in that research pass and every one cheap: send a `User-Agent` that is
not `Python-urllib/*`, which Cloudflare 403s even with a valid key; retry every 5xx with backoff; never treat a
404 as absence without checking `ownerOf`; handle both response envelopes, since some routes wrap in
`{success, data}` and some return the payload bare; cap `limit` at 100, because 101 returns 422; and never use a
deep offset, because `offset=100000` took 28.85 s. `/api/v1/chains` is the liveness probe and `/status/summary`
is not, because it reported healthy through the worst window.

### 6.3 AltLLM: one honest home and it is offline

**Nothing about AltLLM is verified.** No research pass in this set read an endpoint, an API shape, a model list,
a rate limit or a terms page. The credit amount is published as to be confirmed. So this section names where it
would go plus what it may never touch. It claims no integration.

Two invariants bound the answer before the partner is considered. **Muster runs no language model in the render
path**, which is the strongest form of the prompt-injection defence, because an instruction embedded in an
agent's text has nothing to instruct (`14-GAPS.md`). And `categoryConfidence` is a published five-value ladder
rather than a model score, so a model cannot set it and `categoryBasis` is a closed enum of `declared`, `text`
and `probe` with no fourth value (`03-TAXONOMY.md`).

That leaves exactly one place a model helps: **the operator-side triage queue**, offline. Roughly 335,000 agents
are indexed and the four categories at their most generous single keyword sum to 518, which is 0.17% of the
index (`MEASUREMENT.md`), so the unshelved tail is the whole population and a human has to work through the
candidates that abstained. A model can propose a category for a queued row and can propose labels for the
200-candidate hand-labelled sample the classifier's published precision is measured against. Three hard rules on
that: the output enters an internal queue and never a listing field, a human confirms every label that reaches
the sample and the published precision figure states that the labels were human-confirmed. If AltLLM's call
drops into the existing OpenAI-compatible provider layer with no adapter, it serves that queue and the house
gateway stays primary. If it does not, nothing is wired and the section stays as it reads now.

That posture is the point rather than a limitation. A partner integration we cannot demonstrate is a claim.
This document spends its credibility on the four tracks where a judge can run the command themselves.

## 7. The stacking rule: one surface, several tracks

The rule stated at the top, made checkable. **Every partner artifact is a surface a buyer uses. Read down the
table: no row exists for one track alone.**

| Surface | Main track | TermiX | Altana | PancakeSwap | AltLayer |
| --- | --- | --- | --- | --- | --- |
| The four `/c/<slug>` shelves from one template | Functionality plus Agent Diversity, four at equal depth | marketplace quality 20%, "find, compare, hire, without instructions" | the four sessions are one per shelf | the rebalancing and yield shelves each carry a hireable row | their enrichment appears per row, credited |
| The listing page's category contract block: named inputs, outputs, units, refusal conditions | Data Quality, a number a buyer can act on | value of the services 30%, a decision rather than prose | the contract's `sessionScope` is what the session allowlists | the contract **is** the LP agent's schema | their `parse_status` issue codes shown beside ours |
| `/agent/<agentId>/authority`, the session panel read live from chain | Functionality, a stranger sees what they authorised | high-stakes 20% in the security sense, plus revocability before a hire | **G2, G3 and G5 in one screen** | the LP agent's execute mode is bounded by that session | none |
| The hire path plus `/receipt/<receiptId>` | Functionality, "activate", with a recomputable receipt | gate 5 and value of the services 30% | bonus B2 is the same 402 challenge, bonus B1 the same escrow | the swap plan and its `minOut` live in the same job record | none |
| The Agent Advantage Report at `/report` | Data Quality, every figure recomputable | **the 30% eligibility gate** | the escrow control job is one of its artifacts | T1, T3 and T5 all read PancakeSwap state | 8004scan cited as a cross-check inside it |
| The LP range and rebalance agent | a hireable row on two of the four shelves | track record 20% with real fills | its transactions are G4 | **the track** | none |
| `/status` plus the per-source freshness strip | Data Quality, real-time with the age of every read | marketplace quality, live means clickable | session expiry countdowns render there | the sampler's own lag renders there | **their self-reported lag, under their name** |
| `api`, `mcp`, `openapi.json` and `llms.txt` | Functionality for a machine buyer | gate 3, the surface their own tooling can drive | the MCP tools call the same reads a verifier runs | quotes and plans over HTTP | none |

Two rows carry more than their share and both are worth naming. **The session panel answers three Altana
requirements with one screen** because it is a live chain read rather than a stored claim. The same screen is
what lets a buyer refuse a hire they do not like. **The receipt is simultaneously the product's proof of a hire,
the TermiX receipt gate and a file in the report bundle**, which is why `aar/T1-grid/agent/receipt.json` is the
product's record and not a bespoke artifact.

One row deliberately claims less than it could. The report is not an Agent Diversity artifact: the shipped floor
is T1 to T3, T3 and T5 are both `rebalancing`, so the pairs cover three categories at most and section 2.2
already rests Agent Diversity on the four shelves, which ship with their own receipts whether or not a pair is
cut.

### What the rule cut

Five things a track would have rewarded and the build does not have, each with the reason, because a cut with a
reason is a decision and a cut without one is an omission.

| Cut | Which track wanted it | Why it is out |
| --- | --- | --- |
| `/.well-known/muster.json` | TermiX gate 3, mirroring their own manifest | RFC 8615 requires registration for a new well-known URI and the two that exist belong to A2A and ERC-8004. `llms.txt`, `openapi.json`, the REST API and the MCP endpoint already cover machine discovery (`04-AGENT-PROTOCOL.md`) |
| Rendering Altana's skill copy verbatim | Altana G5, the plain-English "may and may not" text | no licence, terms or grant for the registry content was found. The panel is generated from chain reads instead, which need none (section 4.4) |
| A B402 sell integration | Altana bonus B2 | testnet B402 is open and mainnet access is granted on request, so the reason is the schedule rather than the surface: x402 already ships the sell rail where the product charges and day 3 carries no free block. It sits behind the `facilitator` interface as a config flip (section 4.3) |
| AltLLM anywhere a buyer can see | AltLayer | no model runs in the render path, by design. `categoryConfidence` is a published ladder rather than a model score (section 6.3) |
| Listing our own agents on TermiX before the deadline | TermiX, as distribution into a list TermiX itself reads | `R07-termix.md` recommends doing both. We do not, before 2026-09-09. It is the one partner move a judge cannot test as part of the product, it risks capturing the exact hire we want to happen on our own surface. Day 3 also carries no free block (`15-SYSTEM.md`). Revisited after the freeze. If it happens, the first line of every listing names the marketplace with its URL and the prices match ours exactly, so no reviewer can find a discrepancy |

One more thing is deliberately not a submission artifact although it is real work. `bsc-mcp`, the sponsor's own
reference MCP server, does not boot from npm or from source, nine of its eleven tools cannot run on Linux
because the password prompt has only macOS and Windows branches, `Get_Wallet_Info` and `QueryMemeTokenDetails`
both hit dead endpoints and `Token_Security_Check` returns `{}` while reporting success whenever the caller
passes a checksummed address, because GoPlus keys its result map by the lowercase form (`R07-termix.md`). The ESM
import fix and the silent-failure fix are one line each in a partner's own repository and they are worth filing
on their merits. They are a contribution under our licensing rule, which takes the target repo's licence. That
repo carries no LICENSE file, so any NOTICE naming it names the declared MIT grant rather than quoting a
copyright line that does not exist. None of it appears in the submission as an integration, because a broken
dependency is not one.

## 8. Submission checklist per track

The main-track checklist lives in `15-SYSTEM.md` section 11. These four are the partner rows, each naming the
artifact and the check that proves it. A row with no artifact is not a claim we make.

### TermiX

| # | Artifact | Where | The check |
| --- | --- | --- | --- |
| T-1 | the Agent Advantage Report | `/report` on the live site **and** `aar/` in the public repo, because where it is filed is unverified | anonymous fetch of `/report` returns 200 and the repo path resolves for a stranger |
| T-2 | at least three paired tasks, one of them trading | `aar/T1-grid/`, `aar/T2-health/` and `aar/T3-lprange/` at minimum | each task directory has an `agent/`, a `control-1/`, a `control-2/`, a `ground-truth/` and a `score/` |
| T-3 | time, cost and output quality per task | `timing.json` and `cost.json` per arm, `score.json` per task. C1 and C2 both carry a `cost.json`, C2's holding its capped minutes | every figure in `INDEX.html` links to the file it came from. `score.json` carries no C2 row where C2 produced no answer |
| T-4 | the actual outputs attached | `response.json` per agent arm, `answer.json` per control, `recording.mp4` per human control | `sha256sum -c` against `MANIFEST.json` is clean. Every recording is signed off against the section 2.8 scrub list before it is published |
| T-5 | the frozen rubric | `rubric.md` plus the commit hash that froze it | the commit date precedes the first run's `t0` |
| T-6 | one published loss | the headline table in `INDEX.html` | a column where a control beats the agent, named rather than buried |
| T-7 | a hire an outsider completes unaided | the five gates in section 3 | a cold URL sweep, a one-signature hire from a wallet with no relationship to us, then the same hire over HTTP and over MCP |
| T-8 | price and speed comparators | the shelf price panel and every receipt | both cite their source, their n and their date. The market read is refreshed the day the submission goes out |
| T-9 | a trading record | the record page per `grid` listing | `winRate` per round trip with `{firstBlock, asOfBlock}`, the trade count, max drawdown and excess return, every fill resolving to a transaction |
| T-10 | proof a stranger can do it | a timed recording of a first-time visitor | published with the elapsed seconds, with whoever ran it described in role terms and no personal data on screen. If they stall, the product is fixed rather than the recording |

### Altana

| # | Artifact | The check |
| --- | --- | --- |
| A-1 | four agent wallets, one per category | `getKeys(wallet)` non-empty and `isRootKey` true with `getExpiry` 0 for the admin key, on all four |
| A-2 | four sessions with an allowlist, a cap and an expiry | `canExecute` true on a listed target plus selector, false on anything else, no `0x32323232` entry, `spendInfos` word 2 reading `25000000000000000000` with word 1 reading 2 rather than any `2^160` limit, `getExpiry` past 2026-09-23 |
| A-3 | every session registered in Keystore | `isValidKey(wallet, keccak256(sessionPublicKey))` true, on all four |
| A-4 | one mainnet transaction per category signed by the session | the transaction hash on the agent page, the sender being the agent wallet |
| A-5 | see and revoke inside the product | `/agent/<agentId>/authority` renders from chain on every render, then a Revoke click flips `isValidKey` false in the next block |
| A-6 | explorer evidence | `https://explorer.altana.network/account/<wallet>` per wallet and `/key/<full 32-byte keyId>` per session, all public, full key ids only |
| A-7 | every wallet address in the submission | four addresses, four key ids, not one |
| A-8 | bonus, ERC-8183 | one mainnet job at `FUNDED` or later plus one testnet job at `COMPLETED`, both readable with `getJob` |
| A-9 | bonus, x402 | an unauthenticated `curl` of the invoke route returns 402 with a decodable `PAYMENT-REQUIRED` and a payment against it settles |

### PancakeSwap

| # | Artifact | The check |
| --- | --- | --- |
| P-1 | a hireable row on the rebalancing and yield shelves, both served by the LP agent | a settled job on each, with its receipt |
| P-2 | a position report that reconciles to chain | every principal and fee figure diffed against simulated `decreaseLiquidity` and `collect` at the same pinned block, with the block in the report |
| P-3 | the IL correction | our value-function table beside the published one, with the script that produces both and the bound check at -1/3 |
| P-4 | plan mode and execute mode as two modes | plan mode returns calldata or a deep link and signs nothing. Execute mode runs inside a session whose allowlist and cap are on screen |
| P-5 | sends routed through MEV Guard | the RPC named in the UI, with the extra latency stated |
| P-6 | no vendored Solidity and no copied skill code | the repo's `NOTICE` and `DATA-SOURCES.md` name every PancakeSwap surface as an ABI read |

### AltLayer

| # | Artifact | The check |
| --- | --- | --- |
| L-1 | the Pro-tier form filed from an account on a wallet the operator controls | the confirmation, plus the self-service key's measured limits recorded beside the form's promise |
| L-2 | 8004scan credited wherever it appears | every foreign field carries their name, their timestamp and their own status. Nothing foreign is displayed as ours |
| L-3 | their freshness disclosure on our status page | `/status` renders their `status/indexers/direct` lag under their name, live |
| L-4 | the re-verify trigger used within its published cap | at most once an hour per shelved agent, with the countdown in the UI and the result read from `updated_at` rather than the broken field |
| L-5 | no bulk redistribution | `DATA-SOURCES.md` records that no licence, terms or contact exists on their API and that everything we assert is re-derived from chain |
| L-6 | AltLLM stated honestly | the docs either say it is not wired plus the reason or they show it wired behind the offline triage queue with a real call recorded. No third option |

## What ships by 2026-09-09 and what is documented as next

| Ships | Documented as next | Deliberately not built |
| --- | --- | --- |
| the Agent Advantage Report with at least three paired tasks, T1 to T3, published as a URL and as a repo directory | T4 and T5 as the fourth and fifth pairs, in the same harness | a best-of-N pick on either arm |
| the five TermiX hire gates, with a one-signature paid hire on mainnet | a second measured stranger walkthrough after the first fixes land | a TermiX connector, since none is required |
| the four Altana wallets, four sessions, the live panel and Revoke, plus one named mainnet transaction per category | a fifth session for the buyer side of an agent-hires-agent job | a home-grown session guard, which would be our Keystore and our claim |
| one funded mainnet ERC-8183 job, funded in `$U` bought through the USDT pool in section 4.2, plus one COMPLETED testnet job and the settler running for anybody's job | a custom `IACPHook`. Also the mainnet job itself if the `$U` route closes before the 8th | our own escrow, our own policy or being our own evaluator |
| the x402 challenge with both rails and a 402 a stranger can pay | B402 behind the same interface, as a config flip | a B402 sell claim we cannot demonstrate |
| the LP range and rebalance agent on two shelves, with the IL correction and the reconciliation pass | the upstream correction filed as a PR | any vendored PancakeSwap Solidity |
| 8004scan as a credited cross-check, its lag on our status page, the re-verify trigger | a granted Pro key if the form lands in time | 8004scan as the index of record |
| USDC added as a fifth `accepts[]` entry on the labelled Permit2 rail | `permit2Upto` metered settlement, which `08-MONEY.md` already defers | AltLLM in the render path, ever |

## Decisions and rejected alternatives

| Decision | Rejected | Why |
| --- | --- | --- |
| Three paired tasks are the floor and they ship, the harness is built for five, cut order T5 then T4 | promising five pairs | their spec needs three and `15-SYSTEM.md` protects three in the day-2 block. The pairs share one runner and one scorer, so the fourth and fifth are cheap. Nothing claims a pair that did not run |
| Two control arms per task, the second being find-and-hire with no marketplace under a 30 minute cap | the single control their spec requires | C1 measures the agent while C2 measures the marketplace and tests the programme's own gap statement about digging through threads and repos. The measured population makes it a result either way: 0 of 600 sampled agents are payable by a stranger and 8004scan lists 5 endpoint-verified agents on BSC |
| USD conversion from the Venus ResilientOracle at the pinned block | the Binance spot ticker as the primary source | an on-chain read needs no grant and reproduces at that block forever. Binance's market-data terms for redisplay are unverified, so the ticker is kept as a labelled cross-check |
| Add Binance-Peg USDC as a fifth `accepts[]` entry on the labelled Permit2 rail | leaving the ladder at four and relying on the house lane | 507 of 509 TermiX listings price in USDC and their default signer supports no testnets, so the buyer we know is coming holds the one token that cannot sign once. It is one config row plus a `decimals()` assertion, it changes no default and `08-MONEY.md` owns the table |
| No `.well-known` manifest of ours | mirroring their `/.well-known/aacp-agent.json`, which `R07-termix.md` recommends | RFC 8615 requires registration for a new well-known URI. `llms.txt`, `openapi.json`, the REST API and the MCP endpoint already give a machine more than their own client can consume |
| Consent and permission copy generated from chain reads | rendering Altana's `display.may` and `display.mayNot` verbatim, which `R06-altana.md` recommends | no licence, terms or grant for the skills registry content was found in any pass. Absence of terms is not permission. The chain reads need none. We cite the skill by id, version and published `sha256` instead |
| x402 ships as the sell rail, B402 sits behind the same interface, testnet B402 is skipped rather than blocked | shipping a testnet B402 sale for the bonus | testnet B402 is open, so the honest reason is the schedule and the scope: x402 already sells on mainnet where the product charges, the bonus asks for a sell integration rather than two of them and day 3 carries no free block. Its `BASE_URL`, `signerAddress` and `spenderAddress` stay unverified until a `/supported` response, per `VERIFIED-payment-rail.md` as corrected by R17 |
| The shared router path for every escrow job, never our own evaluator or hook | being the evaluator on a job we also buy, which the kernel permits | that is a self-dealt attestation a judge who reads the job will spot and it abandons the optimistic settle plus the 3-of-5 panel. A custom policy is not even available: `setPolicyWhitelist` is owner-only |
| Altana on mainnet, with testnet used only for the settlement loop and labelled | a testnet-only demonstration | the requirement says mainnet is stronger, four wallets with one session each costs under $5 and their own default signer supports no testnets. Mainnet's Keystore is nearly empty, so eight registrations are visible |
| 8004scan is a credited cross-check, not the index of record | this document's own scope line, plus `../ARCHITECTURE.md`'s 8004scan-primary pipeline | its BSC checkpoint sat 32 hours stale with `status: down`, it under-reports the population by about 9% and its read path failed 20.8% then 56.7% of calls in one day. A rival single-sourcing it rendered `--` for three of four headline metrics during that outage |
| AltLLM offline in the operator triage queue or not wired at all | search summarisation, a compare narrative or any buyer-facing generation | no language model runs in the render path, which is the whole prompt-injection defence. `categoryConfidence` is a published ladder rather than a model score. Nothing about AltLLM is verified, so no integration is claimed |
| Do not list our own agents on TermiX before 2026-09-09 | `R07-termix.md`'s recommendation to do both | it is the one partner move a judge cannot test as part of the product, it risks capturing the exact hire we want to happen on our own surface. Day 3 also carries no free block. Revisited after the freeze. If it happens, the prices match ours exactly and the first line names the marketplace |
| Publish one health-factor skill to the Altana registry as upstream work, offered rather than counted | counting a pending listing as a submission artifact | Altana fork-tests before listing, so the timing is theirs. It fills the registry's own gap and stands on its own merits either way |
| Publish at least one loss in the report headline | reporting only the wins | five clean wins reads as manufactured, the rival's own report already carries a loss and the one number a reviewer can argue with is the control's rate |
| Every arm runs once, with no best-of-N on either side and no re-run replacing a recorded one | best-of-N on either arm. Also letting a failed run be re-run out of the record | a best pick is a selection effect wearing a measurement's clothes and it flatters whichever side gets the retries. A failed run published with its error is data. Section 2.7 carries the rule |
| The report ships as a directory in the public repo, with `/report` as its page | a PDF, which is what most entries will attach | "with the actual outputs attached" is literal and a PDF cannot be re-run. A directory carries `recompute.mjs`, the stored call set and one hash per file, so a judge can check a number rather than read a claim about it |
| Two blind graders, both sheets published, the lower value taken as the figure | averaging the two. Also one grader deciding alone by design | an average writes a number neither grader chose and buries the disagreement, which is itself information about how hard the task was. The lower value cannot flatter us and the spread ships beside it. Section 2.7 states what happens when only one grader is available |

## Open questions

| Question | What would settle it | What it changes |
| --- | --- | --- |
| Where the Agent Advantage Report is filed | the programme naming a channel | nothing today. It ships as a URL and as a repo directory so either reading works |
| Whether TermiX pays for its hire or expects a free trial, plus which wallet it judges from | their hire landing | nothing may depend on an allowlist and the house lane has to stay funded through 2026-09-23 |
| Whether the mainnet escrow job's provider submits in time to matter | their `submit` transaction | the page's own text. `settle` unlocks 7 days after `submittedAt`, so a job still `FUNDED` on 2026-09-09 shows a status and no auto-approval date. The `$U` acquisition half of this question is closed: the USDT pool in section 4.2 is the route |
| How the 50,000 Altana XP is allocated and whether attribution needs the wallet declared anywhere | Altana publishing the mechanics | nothing. All four addresses go in the submission because the programme separately requires it |
| Whether a granted 8004scan Pro key beats the self-service key we already measured at 600 a minute | holding a granted key | only the form's optics. No design depends on the rate |
| AltLLM's endpoint, request shape, terms and credit amount | one real call plus a terms page | whether section 6.3's triage queue is wired at all. It is stated as not wired until then |
| Whether phase 2 reweights the partner tracks | the programme publishing it | nothing can be optimised for it, so the defence is a complete submission rather than a tuned one |
| Whether `@altananetwork/sdk` 0.9.0 works against `@bnbagent/sdk` 0.5.5, which pins 0.7.1 and validates vendor types at that pin | running the pair end to end before the first hire | the ERC-8183 bonus path. The fallback is the seller side from 0.9.0 with the buyer calls written against the deployed ABI |
| Whether an Altana wallet can be the payer on the EIP-3009 rail | one `transferWithAuthorization` attempt on a fork with an Altana wallet as `from` | whether an agent buyer uses the escrow rail, Permit2 or neither. `08-MONEY.md` carries the same question |
| Whether any third-party listing clears the hireable bar by the 2026-09-07 freeze, then which two the agent arms hire | the recruitment pass in section 2.3 plus the day's probe results | whether the report carries third-party arms at all. If none clears the bar it publishes all-first-party arms with the candidate list, the reason per candidate and that limitation in the headline table |
| Whether a bStock `uiMultiplier()` has ever moved off 1e18 between the blocks we sampled | the setter's own log history, which no free RPC serves over that range | nothing in T5's arithmetic, which applies the multiplier either way. The sampled reads are now in the report: 1e18 at sixteen blocks from METAB's first block of code, 106,007,876 on 2026-06-24, through 120,162,000, read on the archive endpoint in section 2.9. So the report states no observed divergence as a measurement rather than as an absence of checking |
| Whether TermiX's judges hire through their own skill package | nothing published says either way | nothing. Their REST-shaped client and an MCP client are both answered |
