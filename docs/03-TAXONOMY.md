# 03-TAXONOMY: the four categories as contracts and the surface a stranger navigates

Written 2026-09-05. Build closes 2026-09-09 UTC+0. Judging runs 2026-09-09 to 2026-09-23.

This document settles eight things. What a **category contract** is and what the four of them say,
field by field, in the same shape so the four shelves are structurally equal. The full category
tree, including where the long tail goes. How an agent enters a category and which side wins when
the declaration and the evidence disagree. The whole information architecture: nav, shelf page,
listing page, compare, search, every filter with its real value set, every sort, every empty state.
The visibility rules, what each evidence tier unlocks on screen, the bounded exploration slot from
the buyer's side and duplicate cluster collapse. The comparison row with a freshness ceiling and an
unknown state per field. Mobile and accessibility. Then how a contract changes under live listings.

Vocabulary, component names and every constant come from `research/SPINE.md`. Facts come from
`01-GROUND-TRUTH.md` and the research files named inline. Two things are left to others on purpose:
the wire contract behind a category contract is `04-AGENT-PROTOCOL.md` and the formula behind any
number this document displays is `06-QUALITY.md` for the score and `07-MATCHING.md` for the rank.

One note on naming discipline. The contract document below has its own JSON keys and a query
operator has its own spelling. Neither is an addition to the Muster data model in `SPINE.md`. Where
a contract field is also stored, this document uses the spine's field name and adds none.
`15-SYSTEM.md` remains the only document that extends the stored field list.

## 1. A category is a document, not a tag

A tag is a string an operator types. A **category contract** is a published document that names the
inputs a listing must accept, the outputs it must return, the unit on every number, the question it
answers, the conditions under which it must refuse and the assertions the `conformance` component
runs against it. A tag cannot be wrong. A contract can be, which is the point: it makes
miscategorisation a checkable claim instead of an opinion.

That matters here because there is nothing to inherit. `getMetadata(id,"category")` is populated on
zero agents (`R01-erc8004.md`, 0 of 136 stratified ids and 0 of the newest 49). OASF is the only
structured capability taxonomy in live use on BSC and its canonical 496 skill paths contain no
rebalancing, grid, yield or health factor concept, while the two highest-volume strings agents
actually declare (`information_skills/news_synthesis` on 8,487 agents,
`analytical_skills/data_analysis/crypto_analysis` on 4,940) exist at no OASF version
(`R12-agent-comms.md`). 8004scan's top-100 OASF skills match none of the four and its
`technology/blockchain/defi` domain holds 463 agents chain-wide (`R05-8004scan-api.md`). The second
index returns `category: "other"` with `categoryConfidence: 0` on a fresh row (`R14-rivals.md`). So
the four categories are ours to define and the definition is the artifact.

### 1.1 The contract document

One file per category at `/categories/<slug>/contract/v<major>.json`. Keys, in this order:

| Key | Type | What it holds |
| --- | --- | --- |
| `slug` | string | one of `rebalancing`, `grid`, `yield`, `health-factor`. Frozen |
| `contractVersion` | string | `major.minor`. Listings carry the version they were probed under |
| `question` | string | the single question a listing on this shelf answers |
| `inputs[]` | object[] | `{name, type, unit, required, source, notes}` |
| `outputs[]` | object[] | `{name, type, unit, required, freshnessCeilingSeconds, crossCheck}`. `required` is a bool and it is what `C2` validates. An optional output that is absent is not a failure |
| `refusalConditions[]` | string[] | the named conditions a listing must refuse on, not guess through |
| `assertions[]` | object[] | `C1` to `C7`, each with a fixture, an expectation and a cross-check |
| `metric` | string | the single headline performance metric this category is scored on. Supporting figures are named beside it and are not the headline. `06-QUALITY.md` computes it and owns which is which |
| `excludes[]` | string[] | what a number in this category never includes, stated so a buyer reads it |
| `venues[]` | string[] | the venue facet values this contract is defined against |
| `exemplars[]` | object[] | exactly three, each `{kind, ref, shows}`. `kind` is `listing` for a third-party listing id, `firstParty` for a listing we run or `transcript` for a stored probe request and response replayed as a worked example. `ref` resolves to that listing page or that transcript. `shows` names the assertion or the output the example makes concrete. Every entry carries a real request and a real response. A `firstParty` or `transcript` entry is labelled as one on the contract page |
| `contractHash` | string | `keccak256` of the canonical JSON of this document minus this key |

**Two pages per category and they own different things.** `/categories/<slug>` is the contract's human
page: the whole document rendered, every assertion with its fixture, the three exemplars, the changelog
and the link to the JSON with its hash. `/c/<slug>` is the shelf. Its first region is a summary of
that page with a link to it, so a visitor reaches the contract from the shelf, from the nav under Docs
and from any listing's claim block. The shelf never restates the assertions. The contract page never
lists rows.

**Where an exemplar comes from, said plainly.** 0 of 600 sampled agents are payable by a stranger and
the contract pass rate on the live population is unknown, so hand-picking three live third-party
exemplars per category is not something this document can promise. Each contract ships three, drawn in
this order of preference: a third-party listing that passed, then a first-party listing, then a stored
transcript. Every entry is labelled with its `kind` on the page. Section 10 says which mix actually
shipped rather than implying live third-party supply.

`contractHash` uses the canonical-JSON rule `01-GROUND-TRUTH.md` section 3 already fixes for
ERC-8183 quotes: keys sorted at every depth, compact separators, every non-ASCII code unit escaped.
One canonicalisation, already reproduced against 4 of 4 live jobs, now also hashes our own
documents. A receipt records the `contractVersion` and the `contractHash` the job settled under, so
the terms of a completed hire stay provable after the contract moves.

### 1.2 The shape every contract shares, which is how equal depth becomes checkable

Every one of the four returns the same four blocks, in the same order: `answer` (the category's own
outputs), `evidence` (the reads behind them, each with its call and its block), `freshness` (the
triple `SPINE.md` fixes: block number, timestamp, source) and `refusals` (which named conditions
were evaluated and which fired). Every numeric output carries its unit inline. Nothing returns a
bare float.

Every one of the four is probed with the same seven assertions, so the suites are the same size:

| Assertion | What it checks |
| --- | --- |
| `C1` | the declaration resolves and names this `slug` and a `contractVersion` we publish |
| `C2` | the surface answers with the four blocks and every **required** output in `outputs[]` is present and validates. An absent optional output is not a failure |
| `C3` | every required input in `inputs[]` is accepted and an absent required input is refused |
| `C4` | every numeric output that is present carries a unit from `outputs[].unit` and no output is a bare number |
| `C5` | `freshness` carries a block number, a timestamp and a source, with the block inside the ceiling |
| `C6` | a deliberately impossible input is refused and the refusal names the failed condition |
| `C7` | the category's `crossCheck` field reconciles against an independent read we run ourselves |

`C7` is the one that differs per category and it is the one that carries the Data Quality argument.
`04-AGENT-PROTOCOL.md` owns the wire assertions in front of these (transport, status codes, the 402
challenge, timeouts). `conformance` runs both suites and records a pass or a named failure per
assertion, never a score.

**The equal-depth check, split in two, because one half is ours and the other half is the
population's.** Agent Diversity is a published criterion and the programme page says single-category
submissions score poorly, so four-way symmetry is asserted by a test rather than promised in prose.
`15-SYSTEM.md` owns where both halves run.

The **gate** fails the build. Every condition in it is an artifact we write, so a failure is our bug:
seven assertions per category, all twelve contract keys present, three exemplars, a contract page plus
a shelf page for each of the four all rendering from the identical template, three sub-capabilities per
root, the `contractHash` recomputing over the published JSON and the same six unknown states wired on
every field of every shelf.

The **status line** reports and never fails. Every number in it belongs to the live population, so a
zero is a measurement: third-party rows that answered inside the freshness window per shelf, candidates
matched, probed and passed per shelf, then the `kind` mix of the three exemplars. It renders on the
Status page and in each shelf's off-shelf drawer. A shelf may legitimately read zero there. A build
that failed on it would fail on the state the rest of this document plans for.

## 2. The four contracts

Four, equal depth, no fifth. The slugs are `rebalancing`, `grid`, `yield`, `health-factor` and they
are spelled exactly that way everywhere (`SPINE.md`). Monitoring is not one of them: the launch blog
listed it and the live rubric page replaced it with rebalancing (`00-PROGRAM.md`).

Money in every contract is a base-unit decimal string plus its `decimals` plus its token address.
Every BSC stablecoin is 18 decimals, so a constant carried from a 6-decimal chain is wrong here by a
factor of a trillion (`01-GROUND-TRUTH.md` section 4). A price is quote per base as a decimal string
with the pair and the source named. A rate is the raw integer plus its unit plus the exact call that
produced it. Time is unix seconds plus a block number, because BSC blocks land 0.45 s apart
(`SPINE.md`, measured over 100,000 blocks) and two reads a few blocks apart do not reconcile.

### 2.1 `rebalancing`

**Question.** Is this position in the wrong place and what is the cheapest move that fixes it?

**Inputs**

| Name | Type and unit | Required | Source |
| --- | --- | --- | --- |
| `positionRef` | `{venue, poolAddress, tokenId}` for an LP position, `tokenId` is the NFPM id | one of two | buyer or read from `NonfungiblePositionManager.tokenOfOwnerByIndex` |
| `basket` | `[{token, targetWeightBps}]`, weights sum to 10000 | one of two | buyer |
| `driftTriggerBps` | integer bps of 10000 | yes | buyer, default 100 |
| `maxSlippageBps` | integer bps | yes | buyer, default 50 |
| `deadlineCapSeconds` | integer seconds, at most 300 | yes | buyer, default 60 |
| `priceScenarios[]` | array of multipliers as decimal strings, for example `["0.5","2","5"]` | no | buyer |
| `pinnedBlock` | uint | no | if absent the agent pins head and returns it |

**Outputs**

| Name | Type and unit | Freshness ceiling | Required | Cross-check |
| --- | --- | --- | --- | --- |
| `verdict` | enum `hold` \| `widen` \| `narrow` \| `recentre` \| `exit` | 60 s | yes | the arithmetic below it |
| `range` | `{tickLower, tickUpper}` int24 plus human prices as quote per base | 60 s | yes | `positions(tokenId)` `0x99fbab88` (`R08-pancakeswap.md`) |
| `principal` | `{amount0, amount1}` base-unit strings plus token and decimals | 60 s | yes | simulated `decreaseLiquidity` at the pinned block |
| `feesUncollected` | same shape, plus `pendingCake` where staked | 60 s | yes | simulated `collect`, plus `pendingCake(tokenId)` |
| `inRange` | bool at the pinned block | 60 s | yes | `slot0().tick` against `tickLower` and `tickUpper` |
| `inRangeFraction` | decimal fraction plus `sinceBlock` and `asOfBlock`, both published | 60 s | no | `snapshotCumulativesInside(tickLower,tickUpper)` differenced across two of our own samples |
| `feeAprNet` | decimal fraction, with the `window` it covers named | 60 s | yes | `feeUSD - protocolFeeUSD` over `pool.liquidity()` share |
| `ilAtScenarios[]` | decimal fraction per scenario, signed | 60 s | no, required when `priceScenarios[]` is supplied | the value function, not a lookup table |
| `breakEven` | `{expectedFeeGain, realisedIl, gasCost, swapCost}` all in the quote token | 60 s | yes | a live quote for the swap leg |
| `plan` | `{to, calldata, minOut, deadline, recipient}` or a deep link | quote TTL, at most 180 s | no, a read-only advisor is a valid listing | `to` against the live router allowlist |

**`inRangeFraction` is sampled forward and it says over what.** `snapshotCumulativesInside` returns a
running `secondsInside` counter, so a fraction needs two reads separated by a known interval. No free
BSC archive serves the earlier read: `cast call --block` fails past 60 to 82 blocks on every public RPC
and publicnode answers an older read with `Archive requests require a personal token`
(`R08-pancakeswap.md`). Two reads 145 s apart give a fraction over 145 s and nothing else. So the series
is accumulated by `sampler` and the field publishes the window it actually covers rather than a bare 24
hour claim. A 24 hour form appears only once the series holds 24 hours for that tick range. Before then
the field renders `not applicable (series is <age> old, 24 h needed)`. With no sample at all it
renders `unknown, never checked`. It is optional in `outputs[]` for that reason, so an agent on its
first day does not fail `C2` on a number free infrastructure cannot produce. The yield contract refuses
a liquid-staking APY on the same limit, so the two are handled the same way.

**Refusal conditions.** No position at `positionRef`. Caller is not the position owner or the staking
contract holding it. Fee tier 3000 requested, because PancakeSwap v3 has no 0.3% tier
(`R08-pancakeswap.md`, `feeAmountTickSpacing(3000)` returns 0). A dynamic-fee Infinity pool where
`poolKey.fee` is `0x800000` and `slot0.lpFee` is 0, so there is no static fee to quote from. Basket
weights that do not sum to 10000. `deadlineCapSeconds` above 300. No pinned block available. A quote
older than its TTL.

**`C7` cross-check.** Principal and uncollected fees are recomputed locally from
`getAmountsForLiquidity` plus `getFeeGrowthInside`, then compared against `eth_call` simulations of
`decreaseLiquidity` and `collect` at the same pinned block. `R08-pancakeswap.md` reproduced all four
values to the wei on position 7251129 at block 120,022,524. A mismatch marks the answer degraded and
shows both numbers. Reading the same position three blocks apart moved `amount0` by 0.63 bps, so the
pinned block is part of the assertion, not a detail.

**Metric.** Excess return against the same basket never rebalanced over the identical window, plus
the change in realised volatility. `06-QUALITY.md` computes it.

**Excludes.** `feeAprNet` excludes CAKE farm emissions, excludes any time the position sat out of
range and excludes the protocol's cut, which is a third of the fee tier (`slot0.feeProtocol` decodes
to 3300, 3400, 3200, 3200 of 10000, so the 0.01% tier pays LPs 0.0067%). Pool `apr24h` from the
explorer is never passed through on v2 pools: it reproduces 0.68x low with no findable cause, so it
is re-derived (`R08-pancakeswap.md`). Impermanent loss is never quoted from the published table,
which understates a plus or minus 10% range at a 2x move as 0.03% where the value function gives
-30.66%.

**Venues.** `pancakeswap-v3-{100,500,2500,10000}`, `pancakeswap-v2`, `pancakeswap-infinity-cl`, plus
`portfolio` for the weights shape.

### 2.2 `grid`

**Question.** At this ladder and this budget, what did the last round trips actually earn against
holding the same inventory and what is the next fill?

**Inputs**

| Name | Type and unit | Required | Source |
| --- | --- | --- | --- |
| `pair` | `{baseToken, quoteToken}` addresses, `decimals` read from each | yes | buyer |
| `venue` | one venue facet value, plus `poolAddress` where the venue is a pool | yes | buyer |
| `budget` | `{amountBase, token, decimals}` per side | yes | buyer |
| `bounds` | `{lowerPrice, upperPrice}` quote per base, decimal strings | yes | buyer |
| `levels` | integer, at least 2 | yes | buyer |
| `spacingBps` | integer bps or derived from bounds and levels | one of two | buyer |
| `perLevelSizeBase` | base-unit string | no | derived from budget and levels if absent |
| `maxSlippageBps` | integer bps | yes | buyer, default 50 |
| `deadlineCapSeconds` | integer, at most 300 | yes | buyer, default 60 |
| `window` | `{firstBlock, asOfBlock}` for the record request | no | defaults to the listing's whole life |

**Outputs**

| Name | Type and unit | Freshness ceiling | Required | Cross-check |
| --- | --- | --- | --- | --- |
| `ladder[]` | `[{level, price, sideAtLevel, sizeBase}]`, price as quote per base | 60 s | yes | `sqrtPriceX96` on the deepest pool for the pair |
| `nextFill` | `{level, price, sizeBase, expectedOut, minOut}` | quote TTL, at most 180 s | yes | a live quote, `minOut` in the calldata |
| `inventory` | `{inventoryBaseAfter, inventoryQuoteAfter}` base-unit strings | 60 s | yes | `balanceOf` on both tokens at the pinned block |
| `record` | `{window:{firstBlock,asOfBlock}, trades, roundTrips}` | 10 min | yes. Zero trades is a valid answer | the fill list below |
| `fills[]` | one record per fill, schema below. May be empty | 10 min | yes | every row resolves to a BSC transaction |
| `winRate` | decimal fraction, **per round trip**, never per fill | 10 min | no, required once `record.roundTrips` is above 0 | recomputable from the fill list |
| `netPnlQuote` | base-unit string in the quote token | 10 min | no, same condition | fills plus gas, recomputable |
| `benchmarkPnlQuote` | base-unit string, holding the starting inventory | 10 min | no, same condition | one oracle mark at each window end |
| `excessReturn` | `netPnlQuote - benchmarkPnlQuote`, base-unit string | 10 min | no, same condition | arithmetic |
| `risk` | `{maxDrawdown, realisedVol, peakNotional}` fractions and base units | 10 min | no, same condition | the position value series |

**The fill record.** Every fill carries `txHash`, `blockNumber`, `transactionIndex`, `logIndex`,
`blockTimestamp`, `side`, `baseToken`, `quoteToken`, `baseDelta`, `quoteDelta`,
`executionPrice1e18`, `oraclePrice1e18`, `oracleSource`, `gasUsed`, `gasPriceWei`, `slippageBps`,
`gridLevel`, `gridSpacingBps`, `inventoryBaseAfter`, `inventoryQuoteAfter`
(`R09-bsc-defi.md`). The ordering key is `(blockNumber, transactionIndex, logIndex)` and never a wall
clock, because blocks are 0.45 s apart. A claimed fill with no `txHash` is not a fill.

**Refusal conditions.** `lowerPrice` not below `upperPrice`. Fewer than 2 levels. A ladder whose
per-level size rounds to zero at the token's decimals. Bounds that do not straddle the current mid,
unless the buyer sets a one-sided flag. A pair with no pool at the named venue. A window whose
`asOfBlock` is beyond head. A record request over a range no free RPC serves, which is refused with
the reason rather than answered from a partial scan.

**`C7` cross-check.** Every published fill is re-derived from the venue's own `Swap` logs and
`executionPrice1e18` is shown beside `oraclePrice1e18` from the Venus ResilientOracle at
`0x6592b5DE802159F3E74B2486b091D11a8256ab8A`, which prices 55 BSC assets for free and is an
independent feed. `R09-bsc-defi.md` re-derived a pool's fee flow from 6,583 `Swap` events across 3,000
blocks, a 1,350 second window, priced with that oracle and scaled by 86400/1350 = 64 to reach a 24 hour
figure. It landed within 10% of the explorer's own 24 hour aggregate. The gap is the 22 minute
window against a daily average rather than an error. So the assertion compares an extrapolated flow
against a measured one and it publishes the window it actually read.

**Metric.** Round-trip win rate with its window and its trade count. Profit factor, max drawdown and
excess return against holding are supporting figures beside it, not the headline. `06-QUALITY.md`
computes it.

**Excludes.** `netPnlQuote` includes gas at `gasUsed * gasPriceWei` and includes protocol fees, so it
is net. `winRate` per fill is not published at all: a grid only ever buys below and sells above its
reference, so a per-fill win rate is 100% by construction and a judge who trades spots it in
seconds (`R09-bsc-defi.md`).

**Venues.** `pancakeswap-v2`, `pancakeswap-v3-{100,500,2500,10000}`, `pancakeswap-infinity-cl`,
`pancakeswap-stableswap`.

### 2.3 `yield`

**Question.** What will this position pay, on what basis and what does that number leave out?

**Inputs**

| Name | Type and unit | Required | Source |
| --- | --- | --- | --- |
| `venue` | one venue facet value | yes | buyer |
| `asset` | token address, `decimals` read from the contract | yes | buyer |
| `amountBase` | base-unit string plus token plus decimals | yes | buyer |
| `horizonDays` | integer days | no | default 365 |
| `includeIncentives` | bool | no | default false and the effect is itemised either way |
| `pinnedBlock` | uint | no | if absent the agent pins head and returns it |

**Outputs**

| Name | Type and unit | Freshness ceiling | Required | Cross-check |
| --- | --- | --- | --- | --- |
| `ratePerUnit` | raw integer, exactly as the contract returns it | 5 min | yes | the source call named below it |
| `rateUnit` | enum `perBlock` \| `perSecond` \| `perYearRay` | 5 min | yes | fixed per venue |
| `sourceCall` | string, the exact signature and address called | 5 min | yes | reproducible by the buyer |
| `apy` | decimal fraction, plus `annualisation` naming the constants used | 5 min | yes | recomputable from `ratePerUnit` |
| `basis` | enum `measured` \| `advertised` | 5 min | yes | never blended, both may appear |
| `components[]` | `[{name, apyPart, basis, sourceCall}]` summing to `apy` | 5 min | yes | the sum is asserted |
| `excludes[]` | string[] | n/a | yes | the contract's own list plus any venue-specific one |
| `utilisation` | decimal fraction where the venue has one | 5 min | no, required on the money markets | `U = borrows / (cash + borrows - reserves)` |
| `capacity` | base-unit string, the supply cap headroom where one exists | 5 min | no, required where the venue has a cap | the venue's cap read |

**Rate units, per venue, because three protocols use three.** Venus core is per block and annualises
with 70,080,000 blocks a year, which is Venus's own constant and is confirmed on chain by deprecated
markets carrying `borrowRatePerBlock` of `floor(3e18 / 70080000) = 42808219178`, the exact quotient
being 42808219178.08 (`R09-bsc-defi.md`). Venus's published APY uses
`((1 + ratePerBlock/1e18 * 192000)^364 - 1) * 100`, exponent 364, which reproduces `api.venus.io` to
4e-12. A listing may publish either and it must say which: exponent 364 reconciles with venus.io,
exponent 365 is the honest annualisation and is 0.013 points apart on borrow. Lista Lending (Moolah)
is per second and annualises `exp(r * 31536000) - 1`, because the contract accrues with a Taylor
expansion of the same. Aave v3 is already annual in ray, so there is no annualisation step at all.
Lista CDP's stability fee is a per-second ray exponent over `YEAR = 31556952`. All of this is read
live in `R09-bsc-defi.md`, which reproduced the Venus supply-rate identity and the Lista CDP fee to
the wei.

**Refusal conditions.** A venue and asset pair with no market. A rate whose unit cannot be
established from the call. A supply cap already reached. A liquid-staking rate quoted as an APY
without two reads separated by a known interval, which no free BSC archive RPC can supply
retroactively, so the honest answer is the current exchange rate plus the interval we have sampled
ourselves. An `includeIncentives` request on a venue whose incentive units are unresolved, which
today is Venus Prime: its API returns `0.1476...` and whether that is points or percent is
**unverified** (`R09-bsc-defi.md`).

**`C7` cross-check.** The published `apy` is recomputed from `ratePerUnit` under the named
annualisation. For Venus it is additionally reconciled against `api.venus.io` with the
exponent-364 form. For a PancakeSwap pool the fee APR is recomputed from `Swap` logs and shown beside
the explorer's aggregate. For a liquid-staking token the rate is cross-checked against the Venus
oracle's own ratio of the two underlyings, which agreed to six digits for asBNB against BNB
(1.066576 by composition against 1.066577 from the oracle).

**Metric.** Realised yield against quoted yield over a stated window, plus the size of the
`excludes[]` list actually itemised. `06-QUALITY.md` computes it.

**Excludes, published as the contract's own list.** A Venus supply APY excludes XVS emissions, which
`venusSupplySpeeds` returned 0 for on vUSDT today and will not always. A pool fee APR excludes CAKE
farm emissions, excludes the protocol's cut and excludes the fact that concentrated liquidity out of
range earns nothing: in one measured farm 48.95% of staked liquidity was out of range, so
apportioning CAKE on TVL or on total staked liquidity roughly halves the answer. A liquid-staking
rate excludes the exit queue, which on slisBNB is a two-step withdrawal with a 7 to 15 day unbonding
wait (`R06-altana.md`). A CDP rate excludes the liquidation penalty, which is `chop` 1.1e18 on every
live ilk.

**Venues.** `venus-core`, `venus-emode-1` to `venus-emode-15`, `venus-isolated-{btc,defi,gamefi,
liquid-staked-bnb,liquid-staked-eth,meme,stablecoins,tron}`, `lista-moolah`,
`lista-cdp-{SnBNB,BTCB,wBETH,USDT,USD1,FDUSD,solvBTC,ceABNBc}`, `aave-v3`, `pancakeswap-v2`,
`pancakeswap-v3-{100,500,2500,10000}`, `pancakeswap-infinity-cl`, `lst-slisBNB`, `lst-asBNB`,
`lst-wBETH`. Kinza Finance and Avalon Labs are **not** venue values: their BSC addresses are
**unverified**, one docs page 403s and the other publishes no address index, so no address for either is
written down anywhere in this set (`01-GROUND-TRUTH.md` section 12).

### 2.4 `health-factor`

**Question.** How far is this account from liquidation, measured against which threshold at which
block and which single call moves it furthest?

**Inputs**

| Name | Type and unit | Required | Source |
| --- | --- | --- | --- |
| `account` | address | yes | buyer |
| `venue` | one venue facet value | yes | buyer |
| `marketId` | `bytes32` for Moolah, `ilk` for Lista CDP, absent for Venus and Aave | per venue | buyer |
| `alarmHf` | decimal string, 1e18 scale on the wire | yes | buyer, default `1.15e18` |
| `remedyBudget` | `{amountBase, token, decimals}` the agent may spend to fix it | no | buyer |
| `pinnedBlock` | uint | no | if absent the agent pins head and returns it |

**Outputs**

| Name | Type and unit | Freshness ceiling | Required | Cross-check |
| --- | --- | --- | --- | --- |
| `hf` | decimal string, 1e18 scale, dimensionless | 30 s | yes | the venue's own answer, below |
| `hfBasis` | enum `liquidationThreshold` \| `lltv` \| `storedSpot` \| `protocolNative` | 30 s | yes | fixed per venue |
| `sums` | `{sumCollateral, sumBorrowPlusEffects}`, USD scaled 1e18 | 30 s | yes | recomputed per entered market |
| `liquidationPrices[]` | `[{collateralToken, price}]` quote per base, decimal strings | 30 s | yes | the venue's own formula |
| `distanceBps` | integer bps between live price and the nearest liquidation price | 30 s | yes | arithmetic on the two |
| `liquidationIncentive` | decimal string, 1e18 scale, **effective for this account** | 1 h | yes | `getEffectiveLiquidationIncentive(account,vToken)` |
| `crossCheck` | `{ourValue, venueValue, match: bool, deltaWei}` | 30 s | yes | `C7` below |
| `closeFactor` | decimal string, 1e18 scale | 1 h | no, required on Venus and Moolah | `closeFactorMantissa()` |
| `pausedActions[]` | string[] from the venue's action enum | 1 h | no, required where the venue has a pause enum | `actionPaused(vToken, action)` |
| `remedy` | `{action, target, selector, argumentBinding, sessionScope}` | 30 s | no, refused outright under `health-factor/monitor` | the selector exists at the target |

**The traps this contract exists to avoid, every one measured in `R09-bsc-defi.md`.** Venus core is a
Diamond, not the Compound v2 fork every tutorial describes. `getAccountLiquidity` `0x5ec88c79`
answers the **liquidation** question while `getBorrowingPower` `0x528a174c` answers the borrow
question. On one real account at block 120,026,311 the two differ by $29.81 on $825 of debt.
Collateral factor and liquidation threshold are separate numbers on 12 of 55 core markets and vLINK
carries collateral factor 0 with liquidation threshold 0.63, so a model that ignores CF-zero markets
understates the distance to liquidation. The correct per-account reads are
`getEffectiveLtvFactor(account, vToken, strategy)` `0x19ef3e8b` with 0 for the collateral factor and
1 for the liquidation threshold, because the core-pool getters return core values and 15 E-Mode pools
are live. Inside E-Mode pool 1 the liquidation incentive is 1.06e18 against 1.10e18 in core, so "10%
penalty on Venus" is wrong for any account with `userPoolId != 0`. Isolated pools are a different
codebase with `minLiquidatableCollateral()` at 100e18, so a plan for a close-factor-limited partial
repay on a small isolated position is the wrong transaction. On Moolah, `brokers(id)` `0x2b9a878a`
has to be read first, because a broker market throws away the passed price and the Moolah-side debt
entirely. Moolah's price scale is `10^(36 + loanDecimals - collateralDecimals)` and a hardcoded 1e36
breaks silently the first time a 6 or 8 decimal token is listed. Lista CDP evaluates eligibility
against the **stored** `spot`, which sat 0.229% above the live oracle on the day we read it. `poke`
is permissionless, so live price crossing the liquidation price is the alarm and the poke is the
deadline. Aave v3 is the only BSC venue that returns a literal health factor, field 6 of
`getUserAccountData` at 1e18. It returns `2**256-1` when there is no debt.

**Refusal conditions.** No position for `account` at the venue. A broker market whose broker we
cannot read. An unpinned block. A remedy whose gate blocks it, checked before it is offered: Moolah
`repay` reverts `NOT_BROKER` on a broker market, `supplyCollateral` requires
`isWhiteList(id, onBehalf)` and Lista CDP `deposit` carries a `whitelisted(participant)` modifier
plus a provider check. `isForcedLiquidationEnabled(vToken)` true, which defeats the shortfall
requirement and makes any distance number misleading unless it is stated.

**`C7` cross-check.** Our own recompute must match the venue to the wei at the pinned block. On Venus
that is `sumCollateral` under the liquidation threshold minus borrows against `getAccountLiquidity`,
then under the collateral factor against `getBorrowingPower`. `R09-bsc-defi.md` matched both exactly
at 1,608,173,057,197,108,996,576 and 1,578,359,224,759,365,354,291. On Moolah it is our
`maxBorrow >= borrowed` against `isHealthy(marketParams, id, borrower)` `0x2c2c904f`, matched on 3 of
3 real positions. A mismatch is the alarm rather than a rounding note. The listing renders degraded
with both numbers side by side.

**Metric.** Alarm lead time, measured in blocks between the agent's alarm and the block at which the
position first became liquidatable, plus the false-alarm rate over the same window.
`06-QUALITY.md` computes it.

**Excludes.** `hf` excludes any oracle push that has not landed, excludes a `poke` nobody has called
on Lista CDP and excludes governance changes to the threshold, which are read hourly rather than per
block because they only move on a vote. The remedy set deliberately excludes anything that can move
collateral out: `redeem`, `redeemUnderlying`, `withdrawCollateral`, `borrow`, `exitMarket`,
`Vat.hope` and `Moolah.setAuthorization` never appear in a `sessionScope` this contract emits
(`R09-bsc-defi.md`). `08-MONEY.md` and `13-PARTNERS.md` own the session itself.

**Venues.** `venus-core`, `venus-emode-1` to `venus-emode-15`, the eight `venus-isolated-*` pools,
`lista-moolah`, `lista-cdp-*`, `aave-v3`.

## 3. The full category tree

Four roots. Sub-capabilities under each, expressed as `<root>/<sub>` on a listing, never as a
navigation tab. A sub-capability narrows the contract's inputs and venues and it never adds an
output the root does not define, so a comparison row stays valid across a whole shelf.

**Three per root ship, twelve in all. The count is symmetric on purpose.** Agent Diversity is
scored on equal depth, so a tree with four sub-capabilities under two roots and two under the others
is asymmetry in the one dimension that criterion measures. The gate in section 1.2 asserts three per
root. Two more are in the published tree and marked next. The grammar still accepts them.

| Root | Sub-capability | Ships | What narrows | Venue set |
| --- | --- | --- | --- | --- |
| `rebalancing` | `rebalancing/lp-range` | yes | `positionRef` required, `basket` refused | v3 tiers, Infinity CL |
| | `rebalancing/portfolio-weights` | yes | `basket` required, `positionRef` refused | v2, v3, Infinity CL, aggregator |
| | `rebalancing/lst-basket` | yes | basket restricted to LST pairs, drift measured on the exchange rate | `lst-slisBNB`, `lst-asBNB`, `lst-wBETH` |
| `grid` | `grid/spot-ladder` | yes | swap-based fills | v2, v3, StableSwap, Infinity CL |
| | `grid/range-orders` | yes | fills are single-tick v3 positions, not swaps | v3 tiers only |
| | `grid/dca-ladder` | yes | one side only, time-triggered rather than price-triggered | v2, v3 |
| `yield` | `yield/lending-supply` | yes | `venue` restricted to money markets | Venus, Moolah, Aave |
| | `yield/lp-fees` | yes | `venue` restricted to pools, position level required | v2, v3, Infinity CL |
| | `yield/lst-staking` | yes | rate is an exchange rate, not a per-period rate | the three LST venues |
| | `yield/looping` | next | requires both a supply leg and a borrow leg, emits an `hf` field | Venus, Moolah plus an LST |
| `health-factor` | `health-factor/monitor` | yes | read only, no `remedyBudget` | all six lending venues |
| | `health-factor/preliquidation-repay` | yes | `remedyBudget` required, remedy is a repay | Venus, Moolah, Lista CDP, Aave |
| | `health-factor/emode-move` | yes | remedy is `enterPool(uint96)`, moves no token | `venus-emode-*` |
| | `health-factor/self-liquidation` | next | remedy is a flash loan closed in one transaction | `lista-moolah` |

The two marked next are the two that reach outside their own contract. `yield/looping` needs a supply leg
and a borrow leg on two protocols at once and it emits an `hf` field the health-factor contract owns, so
it is the only sub-capability that spans two contracts and it is the only one whose outputs are not a
narrowing of its root. `health-factor/self-liquidation` needs a flash loan closed inside one transaction
on one venue, which is a different risk surface from the other three remedies. Both stay valid `tag:`
values: a query for one returns zero rows with a labelled empty state naming it as documented next, never
an unknown-operator error, because the value is real and the shelf for it is not built.

`health-factor/monitor` is a narrowing of the health factor contract and not a revival of the retired
`monitoring` category. It emits the same outputs with no `remedyBudget` accepted, so it lives under
one of the four rather than beside them.

`yield/looping` and `health-factor/*` describe the same position from two sides and that is
deliberate. A looped LST position earns the staking rate on the whole collateral stack while paying
the borrow rate on the BNB leg, so the net is `stakingRate * leverage - borrowRate * (leverage - 1)`
and every input is one of the calls tabulated in `R09-bsc-defi.md`. One agent may hold up to four
listings, one per category (`SPINE.md`), so an operator who can answer both sides lists both and each
listing carries its own contract, its own conformance record and its own evidence. Nothing is
inherited across a listing boundary.

### 3.1 Where the long tail goes

The registry held **336,088** agents at block 120,141,168, 2026-09-05T16:17:48Z and the four
categories at their most generous single keyword each sum to 518 agents, which is 0.17% of the
index, while `trading` alone matches 129,023 (`MEASUREMENT.md`). So the tail is not a rounding error,
it is the whole population and it needs a home that does not dilute the four.

Three destinations and no fourth:

**Unshelved, which is an agent with no listing rather than a listing with no category.**
`listing.category` holds one of the four slugs and `(agentId, category)` is unique, so there is no row
to write for an agent that fits no contract (`15-SYSTEM.md` section 2.3). An agent we can read but
cannot place therefore holds **zero listing rows** and its page is the agent page at `/a/<agentId>`.
Nothing new is stored to describe that state. All of it is derived from fields that already exist:

| What the page shows | Derived from |
| --- | --- |
| indexed rather than live | no `listing` row exists, so there is nothing that could be `live` |
| reason `unreadable registration` | `registrationParsed` false, with `registrationError` shown |
| reason `no declaration` | parsed, with `declaredSkills[]`, `declaredDomains[]` and `services[]` carrying nothing a contract accepts |
| reason `declaration outside the four` | the classifier resolved a structured declaration to no slug |
| reason `text match only` | a term hit with no structured declaration and no passing probe |
| reason `unprobed` | no `probeResult` row for any declared surface |
| reason `probe failed` | the newest `probeResult` per surface carries `verdict: fail`, with its `failureClass` |

It is searchable under `is:indexed`, reachable by direct link and never present on a shelf or in a
default search result. 30 of 600 sampled registration documents cannot be parsed at all, which is the
honest floor on `unreadable` (`MEASUREMENT.md`).

**So `/a/<agentId>` is the agent page and `/a/<agentId>/<listingId>` is the listing page.** Every agent
we can read has the first. An agent holding one to four listings has the first plus one of the second
each. Its agent page carries identity and provenance once, then the list of its listings with each
one's category, sub-capability, tier and conformance summary. An agent holding zero listings renders the
same page with the derived reason where that list would be, plus links to the four contracts so the
operator can see what would qualify. That split is what makes "every agent we can read has a page and a
stable URL" in section 6.1 true for every one of them without asking the store for a null-category
listing row it is built to refuse.

**Adjacent capability, surfaced as a filter and never as a tab.** Some agents genuinely support the
four without answering any of them: a price or oracle read, a pool state snapshot, a wallet screening
call, a research or alerting surface. These hold no listing either. `adjacent` is **derived, not
stored**: an agent with zero listings whose newest `probeResult` on any surface carries `verdict: pass`
against one of four supporting-read assertions, `priceRead`, `poolState`, `addressScreen` or
`researchFeed`. Each of those is a value of the existing `probeResult.assertion` field, so nothing is
added to the stored model and `15-SYSTEM.md` needs an index over the derivation rather than a new
column. They appear in one place only, the shelf's supporting-reads facet, where a buyer assembling a
job can find them. They are counted separately from shelved rows in every number we publish.

Two more operators in section 5.6 derive the same way, which is what keeps the grammar free of
free-text filters wearing a facet's clothes. `is:hireable` is `evidenceTier` at or above what the
listing's own `priceRail` needs, plus `priceBase` present, plus `priceToken` carrying the signature that
rail requires. `is:answered` is a `conformance` history row with a contract-shaped pass inside the
window. Both read stored fields only.

**Cross-chain.** The same three registries exist on 24 mainnets from one CREATE2 factory
(`R01-erc8004.md`) and an agent's `registrations[]` can span 22 chains. Muster indexes chain 56 only
and shows a cross-chain row as a link out with the chain named. Programme eligibility requires the
agents surfaced to be live on BSC (`00-PROGRAM.md`), so a chain-1 listing is never shelved here.

**No fifth shelf ships before 2026-09-23.** Agent Diversity is a published criterion and the page
says all four at equal depth is the bar, so adding a tab that competes for the same attention is a
scoring risk with no upside. New roots are a post-judging question.

## 4. How an agent enters a category

Declared first, then checked by a probe. `classifier` assigns and records `categoryBasis` and
`categoryConfidence`. `conformance` runs the seven contract assertions plus the wire suite
`04-AGENT-PROTOCOL.md` owns. The probe verdict decides the shelf. The declaration decides what we
claim the operator promised.

### 4.1 Declaration sources, in precedence order

| Rank | Source | `categoryBasis` | Why it ranks here |
| --- | --- | --- | --- |
| 1 | a Muster listing the operator signed, naming `slug` plus `contractVersion` | `declared` | the operator chose the contract and can be held to it |
| 2 | on-chain `getMetadata(agentId,"category")` `0xcb4799f2` | `declared` | on chain and owner-signed. Populated on **zero** agents today |
| 3 | OASF `services[].skills` and `.domains`, each path validated against the version the document declares | `declared` | structured, machine-readable and the only such signal at volume |
| 4 | an A2A card's `skills[].id` and `skills[].tags` | `declared` | structured, but the card revision has to be pinned |
| 5 | MCP tool names plus each tool's `inputSchema` | `declared` | structured and the schema is comparable to `inputs[]` |
| 6 | an x402 challenge's `extensions.bazaar.info` input and output shape | `declared` | machine-readable and it arrives with a price |
| 7 | name, description, service names | `text` | free text. Never enough on its own |

Rank 3 needs validating, not trusting. It also needs two sources, because one endpoint does not answer
per version. `https://schema.oasf.outshift.com/api/skills` returns a single canonical taxonomy, 496
paths under 19 top-level groups, with no version parameter anywhere in it. The version-specific set
comes from the repository at the tag the document names, `repos/agntcy/oasf/contents/schema/skills` at
`ref=<tag>`, which is how the v0.8.7 group list behind the findings below was established
(`R12-agent-comms.md`). So a path is checked against the canonical set and against the declared tag,
and the listing page says which check it passed.
`information_skills/news_synthesis` on 8,487 agents exists at no OASF version.
`analytical_skills/data_analysis/crypto_analysis` and `analytical_skills/market_insights` on 4,940
each are invalid, because that group contains only `coding_skills` and `mathematical_reasoning`.
`evaluation_and_monitoring/quality_evaluation` is a misspelling of a real group. So a declaration is
counted only where the path resolves and the listing page shows valid and invalid counts rather
than a badge.

**The rank that fired is displayed, because ranks 1 and 5 are not the same promise.** Ranks 1 through 6
all record `categoryBasis: declared`, which is three stored values and this document adds none. A
listing whose operator signed a row naming the slug and the contract version would otherwise render
identically to a category inferred from an MCP tool name, both at `categoryConfidence 1.00`. So the
listing page's claim block and the Category row in section 7.2 both print the rank and its source in
words, for example `declared, rank 1: operator-signed listing naming health-factor v1` against
`declared, rank 5: MCP tool name plus inputSchema`. The stored value stays one of the three. The rank is
computed by `classifier` at assignment time and it is what makes rank 1 worth holding an operator to.

Rank 4 needs a revision pinned. The published A2A v1.0 JSON artifact has no `required` array, so it
validates an empty object and one live BSC card declares A2A `0.4.0` when no such tag exists
(`R12-agent-comms.md`). We validate a card against 0.1.0, 0.2.6 and 0.3.0, then display the highest
revision it passes. The platform template behind roughly 250 of 251 sampled A2A declarations passes
none of them, which is why an A2A declaration alone never reaches a shelf.

### 4.2 Precedence when the declaration and the evidence disagree

Six cases and only these six. In every case the declaration is kept and displayed. Nothing is
deleted, because the mismatch is itself data and quiet removal is indistinguishable from suppression.
Every case names the `categoryConfidence` it produces, so the ladder in 4.3 is read off the table
rather than inferred.

| Case | Declaration | Probe | Result |
| --- | --- | --- | --- |
| A | names category X | X passes | `visibility: live` on X's shelf, `categoryBasis: declared`, `categoryConfidence: 1.00` |
| B | names X | X fails | not on any shelf. `visibility: indexed`, `categoryConfidence: 0.00`, the failing assertion named on the card, the claim shown as unmet |
| C | names X | cannot run | `visibility: indexed`, `categoryConfidence: 0.50`, reason `unprobed`, ranked below every probed row, retried on the off-shelf cadence |
| D | names nothing | X passes | on X's shelf, `categoryBasis: probe`, `categoryConfidence: 0.75`, card reads "assigned by probe, not declared", with a claim link for the operator |
| E | names X | X fails, Y passes | on Y's shelf at `categoryBasis: probe`, `categoryConfidence: 0.75` there. The unmet X claim at `0.00` shows on both the Y card and the listing page |
| F | names X | X passes and Y also passes | two listings. X at `declared` and `1.00`, Y created at `probe` and `0.75` with the same claim link case D uses |

**Evidence outranks declaration for placement. Declaration outranks evidence for what we say was
promised.** Case D is the rule that lets a working agent be found even when its operator never
filled anything in. Case E is the rule that stops a wrong declaration from either hiding a working
agent or borrowing a shelf it does not serve. Case F is the rule that stops a silent agent being treated
better than a truthful one: without it, case D would give a shelf placement to an agent that declared
nothing while an agent that declared one side and demonstrably answers the other got nothing on the
second shelf.

Case F is not hypothetical. A `yield/lending-supply` listing on a Venus account that also carries a
borrow leg answers a `health-factor` question from the same reads, so an agent that declared one side and
demonstrably answers both is the ordinary instance of it. `(agentId, category)` uniqueness is satisfied
because the second row sits on a different category. The cap of four listings per agent still binds. A
passing declaration never suppresses a probe-created sibling on another shelf. A probe-created sibling
never edits the declared row.

**Text alone never reaches a shelf.** That single rule is what keeps 518 keyword hits from becoming
518 listings and it is why our shelf counts will be smaller than a rival's candidate counts. We
publish both numbers side by side for exactly that reason: candidates matched, then rows that
answered.

### 4.3 `categoryConfidence` is a published ladder, not a model score

| Value | Meaning |
| --- | --- |
| `1.00` | a declaration we can read and the contract probe passes |
| `0.75` | no usable declaration and the contract probe passes |
| `0.50` | a valid structured declaration, probe not yet run |
| `0.25` | text match only, no structured declaration, no passing probe |
| `0.00` | no category established. Either nothing has been probed and we abstain or the declared category was probed and failed. The card names which. On a failure it names the assertion too |

Five values, no interpolation, so a buyer can reason about the number and a judge can recompute it. The
bottom rung carries two reasons on purpose. An abstention and a checked negative are both "this row does
not go on that shelf", they differ only in whether anybody looked. The wording on the card is what
separates them. A probe that ran and failed is the stronger statement of the two, so it never sorts above
a text match: `0.00` is the floor for both. The second index returns `category: "other"` with confidence
0 on a fresh row and we do the same, while naming which of the five states applies and, at `0.00`, which
of the two reasons (`R14-rivals.md`). Every case in 4.2 names the value it produces, so the builder reads
the mapping instead of inferring it.

### 4.4 The classifier is published

The term list per category, the OASF paths accepted per version, the A2A and MCP mappings and the
per-category counts (candidates matched, probed, passed, shelved) all ship as a page and as JSON at
`/categories/classifier`. Precision is stated against a hand-labelled sample of 200 candidates
drawn with the same splitmix64 seeded draw `MEASUREMENT.md` uses, so the label set is reproducible.
Publishing the rule set costs a page and turns the one piece of unavoidable inference in the product
into something a judge can audit.

## 5. The information architecture

The Functionality criterion is quoted in `00-PROGRAM.md`: "The full journey works end to end: land,
find an agent by category, understand what it does, activate it, with minimal friction. Someone with
zero Agent Studio knowledge should be able to get through it without hitting a dead end." So the IA
is built backwards from that sentence and every surface below names the dead end it removes.

### 5.1 Top-level nav

Eight items, fixed order, nothing else: **Shelves**, **Search**, **Compare**, **Receipts**,
**Coverage**, **Report**, **Status**, **Docs**. Shelves expands to the four category names in the mandated
order:
rebalancing, grid trading, yield, health factor. The four get identical treatment in the nav, on the
landing page and in the page template, because equal depth has to be visible before a judge reads a
single row.

`Receipts` is the public list of settled jobs with their transaction hashes, filtered to
`origin: order` so house traffic never inflates it. **`Coverage` and `Report` are two different pages and
neither is the other.** `Coverage` is the four-category coverage proof this section routes at `/coverage`,
carrying the field list `02-THESIS.md` section 7 fixes. `Report` is the Agent Advantage Report, which
`13-PARTNERS.md` owns and specifies as a product surface reachable by an anonymous fetch with no login.
Both are nav items rather than links buried in Docs, for two different reasons: coverage is the evidence
behind a criterion worth a third of the published rubric while the report is an eligibility gate for one of
the partner tracks, so a judge has to be able to find either from any page
(`three/decisions/03-taxonomy-coverage-page-splits-from-report.md`). `Status` is the per-source freshness
page plus the anonymous canary that runs through judging. `Docs` carries the contracts, the classifier,
the rulebook and the licence.

**Every route, so nothing in the nav is unaddressed.** `15-SYSTEM.md` renders what this table fixes and
nothing else. Server-rendered surfaces carry their state in the URL, because section 8 commits Compare
and Search to work with scripting off and a selection held in a script cannot survive that.

| Route | Surface | Notes |
| --- | --- | --- |
| `/` | landing | the regions in 5.2, in that order |
| `/c/<slug>` | shelf, four of them | the five regions in 5.3. Default order is the browse form in 5.8 |
| `/a/<agentId>` | agent page | every readable agent has one. Zero listings renders the derived unshelved reason from 3.1 |
| `/a/<agentId>/<listingId>` | listing page | the nine blocks in 5.4. One per listing, at most four per agent |
| `/compare?ids=<listingId>,<listingId>` | Compare | up to four ids, comma separated, all from one category. Zero ids is a real state, see 5.9 |
| `/search?q=<query>` | Search | the whole query string including operators, so a result set is a shareable link |
| `/receipts` | Receipts index | `origin: order` only, paged |
| `/receipt/<receiptId>` | one receipt | permanent. It survives a delisting |
| `/coverage` | the four-category coverage proof | four regions, one per category, each carrying candidates, answering now, hireable and settled jobs, every one of the four split third-party against first-party, plus the per-category classifier link. `02-THESIS.md` section 7 fixes the field list, this document fixes the layout and the unknown states, `15-SYSTEM.md` renders it. Anonymous fetch, no login |
| `/report` | Agent Advantage Report | `13-PARTNERS.md` owns the content. Anonymous fetch, no login |
| `/status` | Status | per-source freshness, the canary history, the equal-depth status line from 1.2 |
| `/categories/<slug>` | contract human page | the whole contract rendered, its assertions, its three exemplars |
| `/categories/<slug>/contract/v<major>.json` | contract JSON | with `contractHash`. One file per live major |
| `/categories/<slug>/changelog` | contract changelog | one entry per version, section 9 fixes the fields |
| `/categories/classifier` | classifier page plus JSON | 4.4 |
| `/docs/...` | the rulebook, the licence, the disclosure | `10-DOCS-AND-POLICY.md` owns what is under it |

**Add to compare is a control on two surfaces and it is a link, not a script.** Every shelf card and
every listing page carries a checkbox labelled "Compare" whose form target is
`/compare?ids=<the current ids plus this one>`, so it works with scripting off and the resulting URL is
shareable. A pick from a second category is refused by the Compare route itself with the one-line
refusal in 5.5 rather than being dropped from the list without a word.

### 5.2 Landing

In order down the page:

1. The hero, two lines, written here so the build and the demo cannot invent them separately.
   Line one: "Find an agent on BNB Chain that rebalances a position, runs a grid, quotes a yield or
   watches a health factor, then hire it." Line two: "We publish only what we called ourselves. No star
   rating, no number without the block it came from, no agent on a shelf until it answered that shelf's
   contract."
2. The search box, with the operator hint visible rather than hidden behind a help icon.
3. Four shelf cards, identical layout, each carrying exactly three numbers: rows shelved, rows that
   answered inside the last hour, hires settled in this category. No card is larger than another.
4. One turnover row: value settled through Muster, `origin: order` only, with its window and its
   per-provider split. Agent count is not the headline. The registry count is the number BNB Chain
   itself calls the problem and four rivals lead with it inside the same funnel triple
   (`R14-rivals.md`).
5. The freshness strip: our own sweep block and age, then each foreign source with its own age. On
   the day we measured, 8004scan's BSC indexer self-reported `status: down` with a canonical checkpoint
   32 hours stale while its `/status/summary` said the database was fine (`R05-8004scan-api.md`). Its
   shortfall against chain is published with the endpoint it was read from, because its own two
   endpoints disagree: 31,474 short against the `/agents` list count of 303,461, 30,654 short against
   `/stats/global`'s 304,281, the two differing by 820 at block 120,027,164 (`MEASUREMENT.md`). A rival's
   landing page renders `--` for three of four headline metrics because it single-sources that index
   (`R14-rivals.md`). Publishing per-source freshness turns the field's shared dependency into a visible
   strength. Naming the endpoint is what lets a judge reproduce the shortfall instead of taking it.
6. The honest funnel, stated once and small, with its block height: 336,088 registered at block
   120,141,168, then over the sweep's own range of 334,935 ids, 233 of 600
   sampled declare a concrete endpoint, 230 answer, 12 answer as a machine surface, 0 are payable by
   a stranger. Four rivals put that same funnel on their landing page, so it is table stakes rather
   than a pitch and it belongs below the fold.
7. Two lines, one each to the two proof pages. `/coverage` carries the four-category counts with the
   first-party split, which is the Agent Diversity evidence. `/report` is the Agent Advantage Report,
   naming the date it was measured and the tasks
   it covers. `13-PARTNERS.md` owns the report. Both are linked here as well as in the nav, the first
   because it is the evidence for a published criterion and the second because it is a partner-track
   eligibility gate and a judge should not have to hunt for it.

No wallet is requested anywhere on the landing page or on any browse surface. The wallet connects at
the hire step and nowhere earlier.

### 5.3 The shelf page, `/c/<slug>`

Five regions, in this order, on every one of the four:

**Contract summary.** The question, the required inputs, the outputs with their units and which of them
are required, the `excludes[]` list, a link to `contract.json` with its `contractHash` and a link to the
contract's own page at `/categories/<slug>` for the assertions and the exemplars. A visitor who reads
only this knows what the shelf sells.

**The banded list.** One ranked list, banded by `evidenceTier` descending, with a band header naming
what that tier means and how many rows are in it. Band headers use the spine's own tier names:
Accountable (E4), Attested (E3), Proven (E2), Bonded (E1), Listed (E0). Inside a band the order comes
from the browse form of the ranking function, which 5.8 states term by term because browsing carries no
buyer intent. Because the ladder is not strictly nested, every card
also shows four independent checkmarks (bond, settled jobs, attestation, session) so a buyer can see
which requirement earned the tier.

**The exploration slot.** At most one, pinned directly under the first band header, labelled and
specified in section 6.4, which also fixes what the header renders when nothing is eligible.

**Supporting reads.** The adjacent-capability facet from section 3.1, collapsed by default, so a
buyer assembling a job can reach an oracle read or a pool snapshot without those rows competing with
listings that answer the contract.

**Off shelf.** A drawer at the bottom carrying the count of candidates that did not make the shelf,
broken out by reason and never merged into one "offline" number. The reason set is `probeResult`'s own
`failureClass` plus two classification reasons: `dns`, `tls`, `http`, `template`, `shape`, `timeout`,
`text-only`, `unreadable`. The shape of that drawer is already measured: of 600 sampled agents 2 fail
DNS, 51 publish an endpoint containing a literal `{agentId}` that nothing in the published data says
how to substitute and 218 of 230 reachable endpoints serve an HTML page built for a browser
(`MEASUREMENT.md`). Each of those needs a different fix from the operator, which is the whole reason
they are separate rows.

### 5.4 The listing page, `/a/<agentId>/<listingId>`

Nine blocks, in this order. The first three answer "what is this", the next three answer "does it
work", the last three answer "can I act on it".

1. **Identity.** `agentId`, `name`, `operator` from `ownerOf`, `agentWallet` with
   `agentWalletIsDistinct` stated plainly, `firstSeenBlock`, `duplicateClusterId` with the cluster
   size and outbound links to BscScan, 8004scan and trust8004 so a visitor can leave and check.
2. **The claim.** Category, sub-capability, `categoryBasis` with the precedence rank that fired spelled
   out in words (4.1), `categoryConfidence` with which of its five states applies, `contractVersion`,
   a link to that contract's page and the operator's own two-part description under a 400 character
   ceiling.
3. **Provenance.** Which sources hold this agent, what each says and where they disagree, each with
   its own timestamp. Where a foreign field is shown it carries their date and their name, never ours.
4. **Conformance.** A table with one row per assertion, `C1` to `C7` plus the wire suite, each with
   `pass`, `fail` or `skip`, the `observedAt` and the `failureClass` where it failed. This is the
   block that replaces a trust badge.
5. **The answer sample.** The most recent probe's real response, verbatim, rendered as text, with the
   exact request we sent, the pinned block and a label saying it is a probe rather than a paid job.
   Agent-supplied strings are never rendered as markdown or HTML and no image is loaded from an
   agent-controlled URL, because that is a live exfiltration class (`R12-agent-comms.md`).
6. **Evidence.** `evidenceTier` with its four checkmarks, the Muster score as the triple
   `musterScore`, `scoreLowerBound`, `scoreSampleSize`, settled jobs in this category with the window,
   `lastHire`, then foreign ERC-8004 feedback shown with its author count and its tag distribution
   rather than as an average. On the whole chain 4,406 agents of 334,935 have any feedback, 111
   addresses wrote all 29,712 rows, the top 100 agents hold 52.35% of them and of 950 sampled rows
   844 tag a persona trait while **zero** tag a financial outcome (`MEASUREMENT.md`). An average of
   that is an average of spam, so no star rating appears anywhere in this product.
7. **Price and rail.** `priceBase` with its token and `decimals`, `priceRail`, whether the named token
   supports the signature that rail needs, the signed quote with `signerMatchesProvider` where one
   exists and the gas payer. USDT on BSC supports neither EIP-3009 nor EIP-2612, so a USDT listing
   shows the extra approval step rather than implying one signature
   (`research/VERIFIED-payment-rail.md`).
8. **Authority.** The session panel, read live from chain on every render: the call allowlist by
   target and selector, each spend cap as token plus period plus limit, the expiry, whether the key is
   registered in the Keystore, the revoke state, the Altana explorer link and a Revoke button. Nothing
   here is cached, because the whole point of the requirement is that a user can see and revoke what
   their agent may do (`R06-altana.md`, `00-PROGRAM.md`).
9. **Recompute.** The refusal conditions, the per-field freshness stamps and a copyable command block
   that reproduces every number on the page from a public RPC. `01-GROUND-TRUTH.md` is written the
   same way for the same reason.

### 5.5 Compare

Up to four listings side by side on desktop, two on a phone, columns in the order the buyer picked
them. Rows are exactly the comparison row in section 7, in the same order every time, with a
`differs` marker on any row where the values are not equal and a per-field freshness footnote. That
includes the per-category output block 7.2 defines, so two `health-factor` columns put `hf`,
`distanceBps` and `liquidationPrices[]` beside each other and two `yield` columns put `apy`, `basis`,
`components[]` and `excludes[]` beside each other, rather than four columns of identical plumbing.
Because Compare is within one category, that block is well defined for every column on the page.

Three rules:

- **Compare is within one category.** The comparison row is defined by the contract, so a
  cross-category comparison would put unlike units in one column. Attempting it returns a one-line
  refusal naming the two categories and offering the two shelves instead.
- **No winner.** No composite badge, no highlight on a "best" column, no recommendation. Every row is
  sortable and the buyer decides.
- **A version mismatch is stated, not hidden.** If two columns were probed under different
  `contractVersion` majors, the rows that changed between the versions render as `not comparable
  (v1 against v2)` with a link to the changelog entry.

### 5.6 Search

One box. Bare terms are ANDed and matched against name, description, service names and declared
skills. Operators narrow. A leading `-` inverts any operator. An unknown operator is an error that
names the operator and lists the valid set, because silently ignoring a typo is how a buyer gets a
confidently wrong result.

| Operator | Real value set |
| --- | --- |
| `is:` | `live`, `indexed`, `suspended`, `delisted`, `hireable`, `answered`, `a2a`, `mcp`, `x402`, `duplicate`, `first-party`, `adjacent` |
| `has:` | `feedback`, `receipt`, `session`, `price`, `endpoint`, `quote`, `attestation`, `bond` |
| `tag:` | the four roots plus the fourteen sub-capabilities from section 3. Twelve ship. A value marked next parses and returns a labelled zero naming it as next |
| `venue:` | the venue values from the four contracts |
| `token:` | `FDUSD`, `USD1`, `U`, `USDT`, `USDC`, `BUSD`, `WBNB`, `CAKE` or any 20-byte address |
| `rail:` | `eip3009`, `permit2Exact`, `permit2Upto`, `escrow8183`, `directTransfer` |
| `tier:` | `E0`, `E1`, `E2`, `E3`, `E4`, with `tier:>=E2` accepted |
| `reach:` | `T0`, `T1`, `T2`, `T3`, with `reach:>=T2` accepted |
| `price:` | `..5`, `5..50`, `50..` in the listing's own token, which must be pinned with `token:` |
| `answered:` | `5m`, `1h`, `24h`, `ever`, `never` |
| `basis:` | `declared`, `text`, `probe` |
| `owner:` | a 20-byte address |
| `agent:` | an `agentId` |
| `cluster:` | a `duplicateClusterId` |

Default scope is `is:live`, so a bare query searches what can be acted on. Adding `is:indexed` widens
to the whole index. Results page as `{ items, page, pageSize, total, totalPages }`, which is the
shape the `api` component publishes. Every operator maps to an indexed field, so nothing in this
grammar is a free-text filter wearing a facet's clothes.

Semantic search does not ship. Its behaviour on the one index that offers it is measured. For the query
"watch my Venus health factor" the top three are `Stellar_Moon_Pro.agent` at 0.7762, `AstroAgent.agent`
at 0.7459 and `Astroify.agent` at 0.7368: three name-shaped matches with no Venus integration between
them, which is the tell that the embedding is over the name string rather than the description. Sweeping
`semantic_weight` across 0.3, 0.5, 0.8 and 1.0 returns byte-identical result sets, so the knobs are
inert (`R05-8004scan-api.md`). Full-text recall over name, description and declared skills does find the
right agents in all four categories, which is what the classifier already runs on.

### 5.7 Facets, with the real value set for each

The facet rail on a shelf page and on search. Hard facets exclude. Soft facets deprioritise and say
so, which is the split a marketplace of machines needs: a spend cap is a hard constraint and a
latency target is a preference.

| Facet | Kind | Values |
| --- | --- | --- |
| Sub-capability | hard | the three shipped sub-capabilities of that root only. The two marked next in section 3 are valid `tag:` values and are not facet values, because a facet advertises a population |
| Reachability | hard | `T0` discoverable, `T1` reachable, `T2` machine-callable, `T3` payable by a stranger |
| Evidence tier | hard | `E0` Listed, `E1` Bonded, `E2` Proven, `E3` Attested, `E4` Accountable |
| Answered within | hard | 5 minutes, 1 hour, 24 hours, ever, never |
| Rail | hard | `eip3009`, `permit2Exact`, `permit2Upto`, `escrow8183`, `directTransfer` |
| Token | hard | FDUSD `0xc5f0…6409`, USD1 `0x8d0D…8B0d`, U `0xcE24…6666`, USDT `0x55d3…7955`, USDC `0x8AC7…580d`, BUSD, WBNB, CAKE. Every one 18 decimals |
| Signature capable | hard | all eight tokens the Token facet lists. Yes for FDUSD, USD1 and U. No for USDT, USDC, BUSD, WBNB and CAKE |
| Price band | hard | in the token the facet pins, four bands plus "no price published" |
| Venue | hard | the union of the four contracts' `venues[]` |
| Transport | hard | `a2a`, `mcp`, `http`, `x402`, `wellKnown` |
| Declaration basis | hard | `declared`, `text`, `probe` |
| Attestation | hard | BABT, Galxe Passport, BNB Passport, none. An OR across the three, with BNB Passport carrying an **unverified** label because no holder has been observed |
| Supply | hard | third party, first party. Defaults to third party |
| Cluster | hard | representative only (default on), all members |
| Latency | soft | p50 under 1 s, under 5 s, under 30 s. Deprioritises, never excludes |
| Freshness | soft | probed in the last 5 minutes, hour, day |

Three facets carry a note in the UI rather than a tooltip. **Signature capable** exists because USDT is
the token everyone reaches for and on BSC it supports neither EIP-3009 nor EIP-2612, so a USDT hire is
two steps and the buyer should see that before choosing. Two of the eight answer `no` for a reason worth
printing: CAKE answers `nonces(address)` without supporting `permit`, so a probe of `nonces` alone
misclassifies it. WBNB never reverts on an unknown selector because its fallback is `deposit()`, so
try-and-catch feature detection reads it as supporting everything. Capability is therefore read from the
implementation behind the EIP-1967 slot rather than from the token address, on all eight
(`SPINE.md`). The same note carries `$U`'s provenance
plainly: its one-signature path is verified by three research files and **not** by
`research/VERIFIED-payment-rail.md`, which never tested it, so it is a fact with a different
provenance rather than a weaker fact.

**Attestation** carries a note because one leg of the OR is a read that works with no observed
population behind it. BABT and Galxe Passport are measured: 6 of 585 sampled agent owners hold each, 3
hold both, 576 hold neither (`R10-bab-attestation.md`). BNB Passport is different. The reader at
`0x97F0Ed637276907dcecbE49Bf08464Bdc7E46734` answers `user_finished_one_of_attestation` without
reverting. Every address probed returned an empty schema list, including two live BAS recipients,
while the mint host `passport.bnbattest.io` returns NXDOMAIN. So whether any BSC address holds one is
**unverified** and the facet says so in the value label rather than advertising a population that may
not exist. The OR ladder keeps all three legs because the read is real and cheap. The third leg is
labelled everywhere it appears.

**Supply** defaults to third party because the failure mode
across the rival field is a shelf filled by the operator's own agents and a judge reading "the
submission is the marketplace itself, not a portfolio of agents" will discount that
(`R14-rivals.md`). First-party rows are labelled on every surface they appear on and counted
separately in every number we publish.

`token:` and `price:` interact, so a price band with no token pinned is refused rather than silently
mixing three stablecoins into one range.

### 5.8 Sort options

| Sort | Key, in order | Notes |
| --- | --- | --- |
| Evidence (default) | `evidenceTier` desc, then `07-MATCHING.md`'s rank, then `scoreLowerBound` desc, then `reachabilityTier` desc, then price asc, then `agentId` asc | the final key makes the order deterministic and reproducible |
| Price | `priceBase` asc or desc, normalised inside one token | refuses to run across mixed tokens without a stated conversion source and its stamp |
| Freshness | `lastProbe` desc | rows never probed sort last, not first |
| Settled jobs | count desc, `origin: order` only, window shown | never a lifetime figure with no window |
| Last hire | `lastHire` desc | |
| Newest listing | listing creation desc | not `agentId` desc, because ids are mint order and not listing order |

There is no relevance sort without a query and there is no sort on the Muster score alone, because a
score with a sample size of one would top the list. `scoreLowerBound` is the sortable form, which is
what a lower bound is for.

**The browse form of the rank, because browsing has no buyer.** `07-MATCHING.md` owns the weight vector
and computes `0.30*Q + 0.25*R + 0.15*C + 0.15*P + 0.10*F + 0.05*E` against a captured intent, a quote and
a buyer's precision. A shelf has none of those and it is the first order a judge sees, so the browse form
is fixed here. Same six terms, same weights, no renormalisation, so the order a visitor browses and the
order a dispatch considers are the same function:

| Term | With no intent |
| --- | --- |
| `Q` | unchanged, `scoreLowerBound` for that listing in that category over 100 |
| `R` | unchanged, the probe-pass lower bound over 24 h times the conformance pass fraction at the current version |
| `C` | the fraction of the contract's optional outputs present in the listing's most recent probe answer, measured at the contract's own units instead of a buyer's precision |
| `P` | the listing's published `priceBase` against the median published price on that shelf in the same token. A listing that publishes no price takes `P = 0`, which is uniform inside a band where nothing is priced and still ranks a priced row above an unpriced one where the two sit together |
| `F` | unchanged, `exp(-age / 900)` on the probe age |
| `E` | unchanged, the tier map |

No term is dropped and no weight moves, so nothing about the browse order needs a second explanation.
The tie-break chain in the table above closes anything still level and it ends on `agentId` ascending,
which is why the same shelf renders in the same order for three judges reading it on three days.

### 5.9 Empty states

Every empty state names the number that is zero, says when we last looked, offers the one command that
reproduces it and points at the nearest thing that is not empty. No spinner is a terminal state. No
zero stands in for an unknown.

| Surface | Condition | What it says and offers |
| --- | --- | --- |
| Shelf | no shelved rows | "No listing on this shelf passed its contract at block N (checked <age> ago). M candidates matched, K answered, none passed. Here is the failing assertion for the closest three." Plus the off-shelf drawer expanded and a link to the contract |
| Shelf | rows exist, none answered in the window | "N rows, none answered in the last 5 minutes. Last successful call <age> ago." The window widens with one click rather than the rows disappearing |
| Shelf | only first-party rows | states that plainly, with the third-party count at zero and the reason breakdown, because pretending otherwise is the failure mode we are counting |
| Shelf | rows pass conformance, none is hireable | says so above the list with the count, then names what each row is missing (no published price, no rail its token supports, a tier below what the rail needs) and what the operator has to publish. This is the launch state rather than a fault: 0 of 600 sampled agents are payable by a stranger, so a shelf of readable rows with every hire button disabled is expected |
| Shelf | nothing eligible for the exploration slot | the slot is omitted and the first band header renders without it, with one line naming the requirement nothing met. Section 6.4 fixes the eligibility list |
| Facet combination | no hits | names which facet removed the last row, with a one-click release of that facet only |
| Search | no hits | shows the parsed query back with each operator's hit count, so the buyer sees which clause emptied it |
| Search | unknown operator | names the operator, lists the valid set, runs nothing |
| Search | a `tag:` value marked next | returns zero with a line naming that sub-capability as documented next in section 3. Not an unknown-operator error, because the value is real and the shelf for it is not built |
| Compare | no columns | `/compare` with no `ids` keeps the row labels visible, names the four shelves and invites a first pick. It is what clicking the nav item gives, so it is a starting surface and never an error |
| Compare | one column | keeps the row labels visible and invites a second pick from the same shelf |
| Compare | cross-category attempt | one-line refusal naming both categories, with both shelf links |
| Listing | registration unreadable | names the `uriScheme` and the parse failure, shows the raw `tokenUri` bytes and the `tokenUriHash`, offers the operator a fix link. 30 of 600 sampled documents are in this state |
| Listing | never probed | "No probe has run against this listing. Queued, next attempt <time>." Never a zero score |
| Listing | no price published | "This agent publishes no price. 0 of 600 sampled agents were payable by a stranger, so this is the normal state on BSC today." Plus what the operator has to publish |
| Listing | probe failed | the `failureClass`, the exact request, the response head, the timestamp and the operator-facing fix |
| Listing | delisted | HTTP 410 with the reason class, the date and any receipts, which never disappear |
| Receipts | none yet | shows the ledger's own zero with its window rather than hiding the page |
| Whole site | our own sweep is stale | a banner naming our sweep age and block, with the affected fields marked `stale` individually rather than the page going blank |

## 6. Visibility

### 6.1 The four states

`visibility` takes exactly the four values `SPINE.md` fixes. What each one means on screen:

| State | Earned by | Shelf | Default search | Direct URL | Crawlers | API |
| --- | --- | --- | --- | --- | --- | --- |
| `live` | conformance pass on the current contract version, plus a probe inside the freshness window | yes, in its evidence band | yes | yes | `index,follow` | default result set |
| `indexed` | we can read the agent, it does not pass a contract or it has not been probed | no | no | yes, with the reason class | `noindex,follow` | only with `visibility=indexed` |
| `suspended` | a rule fired. `05-ONBOARDING.md` and `06-QUALITY.md` own the triggers | no | no | yes, with a banner naming the reason class and the appeal route | `noindex,nofollow` | only with `visibility=suspended` |
| `delisted` | terminal for the listing, never for the `agentId` | no | no | HTTP 410 with the reason, the date and the receipts | `noindex,nofollow` | 410 |

Two consequences worth stating.

**Indexed is not hidden, it is unlisted.** Every agent we can read has a page and a stable URL and
its page states why it is not on a shelf. That page is `/a/<agentId>` and section 3.1 fixes what it
renders for an agent holding zero listings, where the indexed state is derived from the absence of a
listing rather than stored on one. An agent holding one to four listings has that page plus a
`/a/<agentId>/<listingId>` per listing. `visibility` on each listing is the stored value in the
table above. Nothing is deleted, because a catalogue that disappears
rows is indistinguishable from one that suppresses them and because the reason is the useful part
for the operator.

**Indexed pages carry `noindex`.** Publishing hundreds of thousands of thin pages to search engines
would be spam we authored. Shelved listings are indexable, the four shelves and the contracts are
indexable, everything else is `noindex,follow` so a crawler still reaches the shelves.

A `delisted` listing keeps the `agentId` alive. An operator fixes and re-lists on the same id so the
record travels across the fix, which is what makes a delisting reversible without erasing an earned
standing (`R16-reuse.md`).

### 6.2 The two ladders stay separate

`reachabilityTier` T0 to T3 is what a probe measured about the wire. `evidenceTier` E0 to E4 is what
the operator earned. They are displayed as two chips and never merged into one badge, because they
fail independently: an E4 operator whose host stopped answering is a different problem from a T2
agent nobody has ever hired. The population shares behind the reachability chip, from a uniform
sample of 600 drawn with a fixed seed (`MEASUREMENT.md`): T0 38.83%, T1 38.33%, T2 2.00%, T3 0.00%,
with the 95% Wilson intervals published beside them on the Status page.

### 6.3 What each evidence tier unlocks on screen

| Tier | Card | Score presentation | Hire button | Sort |
| --- | --- | --- | --- | --- |
| `E0` Listed | no category badge, probe evidence and a claim link | `provisional (n=0)` | disabled, reading "not hireable through Muster yet", with the missing requirement named | last band, sorted last |
| `E1` Bonded | bond amount and its escrow transaction shown | `provisional` until a settled job exists | disabled for the escrow rail, enabled for a direct paid call where the agent publishes one | enters the ranked bands |
| `E2` Proven | category badge, settled-job count with its window | full triple: score, lower bound, sample size | enabled on the direct or x402 rail the listing publishes. The escrow rail still needs E4 | above every unproven row |
| `E3` Attested | a badge reading "holds a Binance Account Bound Token" or the Galxe Passport equivalent, naming the contract and the call. The BNB Passport leg carries the same badge shape plus an **unverified** label, because the read answers and no BSC holder has been observed | as E2 | as E2, with higher caps shown | above E2 |
| `E4` Accountable | the live session panel with its allowlist, caps, expiry and a Revoke button | as E2 | enabled on the ERC-8183 escrow path | top of the default sort |

Three rules keep the badges honest. The attestation wording is exactly what the chain proves: Binance
states its role "is limited to issuing" the token and that it makes no representation about holders,
so "KYC verified by Binance" is not ours to say (`R10-bab-attestation.md`). The attestation is read at
request time with a 60 second cache on the read and is never persisted as a verified flag, because
11.58% of all BABTs ever minted are already revoked or burned. And the ladder is not strictly nested,
so the card always shows the four requirements individually rather than implying that an E3 row has
settled a job.

The tier is a weight, never a filter. 576 of 585 distinct owners sampled from 600 agents hold neither
a BABT nor a Galxe Passport, so gating the catalogue on attestation would empty it
(`R10-bab-attestation.md`). A bare address with settled jobs sorts above an attested address with
none and the buyer can invert that with one facet.

**Shelf visibility at E0 is a display rule. The ladder still governs what is earned.** `SPINE.md` gives
E2 "shelf placement" and E4 "hireable over ERC-8183" in its Unlocks column. The table above puts a
conforming third-party E0 row on the shelf in the Listed band with its hire button disabled. Both
statements hold because they answer different questions: the Unlocks column says what a tier earns, this
table says what a page renders. Nothing about that E0 row is promoted. It carries no category badge, its
score reads `provisional (n=0)`, its hire button is disabled with the missing requirement named and it
sorts last inside the last band. What it gets is visibility, because 0 of 600 sampled agents are payable
by a stranger and an E2-only shelf is four empty shelves or four first-party ones. The deviation from the
spine's literal reading is recorded in `three/decisions/03-taxonomy-e0-shelf-visibility.md`, so
`05-ONBOARDING.md` and `06-QUALITY.md` can cite the Unlocks column for what is earned without
contradicting the shelf this document specifies.

### 6.4 The exploration slot, from the buyer's side

At most one slot per shelf. Pinned immediately under the first band header, so it is seen without
displacing a ranked row. Labelled in plain words: "Unproven listing, shown so it can earn a record." The
card carries the same fields as any other card, with the score reading `provisional (n=0)` and the
conformance table linked.

| Property | Value |
| --- | --- |
| Count | at most 1 per shelf, so at most 4 in the product. Zero is a valid render |
| Eligibility | conformance pass on the current `contractVersion`, `reachabilityTier` T2 or better inside 5 minutes, no unresolved `lintFindings`, `visibility: live`, zero settled jobs with us in this category, cluster representative only and the operator holds no other row in this slot in the last 24 hours |
| Rotation | hourly, deterministic, guarded on a non-empty set: where `len(eligible) > 0`, `member = sorted(eligible, by agentId)[floor(unixHour) mod len(eligible)]`, so a judge can reproduce the choice and refresh-spamming cannot change it |
| Empty case | where `len(eligible)` is 0 the slot is omitted, the first band header renders without it and one line under the header names the requirement nothing met. No placeholder card, because a card with no listing behind it is a fabricated row |
| Exclusions | never in the default API sort, never preselected in Compare, never counted as a shelved row in a published number |
| Exit up | on the first settled job it leaves the slot and joins the ranked bands |
| Exit down | on a refusal or a probe failure it leaves the slot for 24 hours, with the reason shown on the card while it is out |

**The empty case is the expected one at launch, not an edge.** The eligibility list is deliberately
demanding and the measured population barely reaches it: the 12 rows at T2 are one product on one host
under 12 owners, which `K2` collapses to a single representative. Zero rows reach T3
(`MEASUREMENT.md`). So most shelves will render no slot on most hours. Omitting it is honest and the
band header still says what the band is, which is why 5.9 carries the row.

`06-QUALITY.md` owns the size of the exploration budget and `07-MATCHING.md` owns whether an
exploration row can win a dispatch. This section owns only what a buyer sees, which is one labelled
card in a fixed place and the fact that its presence never changes what any other row claims.

### 6.5 Duplicate cluster collapse

The measured problem, from a uniform sample of 600 (`MEASUREMENT.md`): one name,
`Ave.ai Trading Agent`, is on 215 of 600 rows, which is 35.83% with a 95% interval of 32.10 to 39.75.
All 215 carry a **byte-identical** `data:application/json;base64` `tokenUri` under **215 distinct
owner addresses**. `Debot Trading Agent` is the same pattern at 16. So owner-based deduplication fails
completely and name-based deduplication catches only the exact string. Separately, all 12 agents that
reach T2 are one product on one host under 12 distinct owners with 12 **distinct** URIs, so a
byte-hash alone would leave the machine-callable shelf showing one operator twelve times.

Three cluster keys, applied in order, with the key that fired shown on the row:

| Key | Rule | Catches |
| --- | --- | --- |
| `K1` | identical `tokenUriHash` | the 215-row and 16-row blocks |
| `K2` | identical endpoint host, plus identical normalised name, plus the same declared service-name set | the 12 T2 agents on one host |
| `K3` | identical `keccak256` of the canonical registration JSON after removing `registrations[]` and any `agentId` | the same document republished with its back-reference edited |

`duplicateClusterId` is the hash of the key that fired plus its value. Representative selection, in
order: highest `evidenceTier`, then most settled jobs with us, then best `reachabilityTier`, then
lowest `agentId`. The lowest id is a deterministic tie-break, which matters because 215 rows tie on
everything else.

What the buyer sees. The shelf shows the representative with a chip carrying the member count, for
example "214 identical registrations", plus an expander that lists the members with their own tiers.
Counts are published as both numbers, always: clusters and rows. `is:duplicate` and `cluster:<id>`
reach the members directly.

Three anti-laundering rules. A cluster never pools evidence: the representative shows its own
settled jobs and its own score and the expander shows each member's tier so nobody can present one
member's record as the cluster's. A cluster is entitled to one exploration slot appearance, not one
per member. And a cluster with a shelved representative counts once in the shelf number, while the
member count is shown next to it rather than folded into it.

### 6.6 The operator cap

At most one shelved row per operator per shelf by default. A second row from the same operator on the
same shelf needs settled jobs with us in that category and it is labelled as the same operator's
second listing. `isApprovedForAll(owner, operator)` is checked as well as `ownerOf`, because an
approved operator can manage a whole fleet's metadata without holding the tokens
(`R01-erc8004.md`), so an operator identity is the union of the owner address and any address
approved for it.

First-party supply, meaning anything we run, is labelled on every surface, ranked under the identical
function with no bonus term and counted separately in every published number. The commercial reason
it exists (a reference implementation and a floor under an otherwise empty shelf) is stated in the
rulebook `10-DOCS-AND-POLICY.md` publishes. The closest comparable marketplace does not label its
own listings at all, so shipping the label is a visible edge rather than a chore
(`R13-prior-art.md`).

## 7. The comparison row

The Data Quality criterion is quoted in `00-PROGRAM.md`: "Real-time, accurate data that goes beyond
basic counts. A user should be able to look at what you are showing and make a genuinely informed
call on which agent to hire." This section is where that criterion is either won or lost, so every
field carries four things: its unit, the exact call behind it, the age at which it stops being
current and what a buyer reads when we do not know.

### 7.1 The unknown vocabulary

Six states, used everywhere, in this exact wording. No dashes. No zeros standing in for an unknown.

| State | Wording on screen |
| --- | --- |
| never checked | `unknown, never checked` |
| check failed | `unknown, check failed (<failureClass>)` |
| stale | `stale, <age> old (last good at block N)` |
| not published | `not published by the agent` |
| not applicable | `not applicable (<reason>)` |
| refused | `refused (<condition>)` |

`unknown` and `0` are different claims and the difference is the product. The case that settles it is
**ClawNews, agent id 1**, a third-party news agent that happens to hold the first id: 8004scan reports
`health_score: 100.0` while the host's certificate is bound to `*.up.railway.app` and does not match its
own hostname. The 404 in its record is a single 108-day-old check of a different file
(`MEASUREMENT.md`). A zero there would have been wrong. A 100 was worse.

### 7.2 The row, field by field

| Field | Unit and type | Source, exact | Freshness ceiling | When unknown |
| --- | --- | --- | --- | --- |
| Listing and operator | strings plus a 20-byte address | `ownerOf(uint256)` `0x6352211e`, plus the registration document through `resolver` | 6 h, tail 30 s | `unknown, check failed (shape)` on an unreadable document, with the raw bytes shown |
| Payout wallet | address plus `agentWalletIsDistinct` bool | `getAgentWallet(uint256)` `0x00339509` compared with `ownerOf` | 6 h | never unknown. Renders "same as owner, registry default" for 600 of 600 sampled agents |
| Cluster | `duplicateClusterId` plus member count plus the key that fired | our own `K1`, `K2`, `K3` over indexed bytes | 6 h | `not applicable (singleton)` |
| Category | slug plus `categoryBasis` plus the precedence rank that fired plus `categoryConfidence` | `classifier`, published rules | on re-probe | `0.00` with which of its two reasons applies, abstained or declared and probed and failed |
| Sub-capability | `<root>/<sub>`, one of the twelve that ship | `classifier`, the same published rules | on re-probe | `not published by the agent`. A listing at the root with no sub-capability is valid, because the root contract is what the shelf sells |
| Contract version | `major.minor` plus `contractHash` | the listing record | on listing change | never unknown for a `live` row |
| Conformance | `passed / total` plus the failing assertion names | `conformance`, `C1` to `C7` plus the wire suite | 5 min shelved, 6 h off shelf | `unknown, never checked` and the queue position |
| Declared skills | valid count over declared count, split by which check passed | each OASF path against the canonical set at `schema.oasf.outshift.com/api/skills`, then against the tagged repository paths for the version the document declares (`R12-agent-comms.md`) | 24 h | `not published by the agent` |
| Transport | `a2a` with the highest revision it validates against, `mcp`, `http`, `x402` | probe of `/.well-known/agent-card.json`, an MCP `initialize`, a 402 challenge decode | 5 min | `unknown, check failed (<class>)` |
| Duration | declared seconds against measured `latencyMs` p50 and p90 | the listing's declaration against `probeResult` | rolling 5 min | `unknown, never checked` |
| Price | base-unit decimal string plus token plus `decimals` | the listing or `accepts[].amount` or `accepts[].maxAmountRequired` from the live 402 challenge, whichever is present. Live BSC entries carry `scheme` `eip3009` or `permit2-exact` rather than `exact`. One live resource served v2 in the header with `amount` and v1 in the body with `maxAmountRequired` in the same response, so both spellings are read the way the spine already reads `x402Declared` (`R03-x402-b402.md`, `R12-agent-comms.md`) | signed quote TTL, at most 180 s, else 60 s | `not published by the agent`, with the note that 0 of 600 sampled agents were payable by a stranger |
| Rail | one of `eip3009`, `permit2Exact`, `permit2Upto`, `escrow8183`, `directTransfer` | the listing plus the token's own capability | 24 h | `not applicable (no price)` |
| Signature capable | bool per token | `authorizationState(address,bytes32)` `0xe94a0102` and `DOMAIN_SEPARATOR()` `0x3644e515` read on the **implementation** behind the EIP-1967 slot | 24 h | never unknown for the eight facet tokens. Re-read daily because all three signature-capable tokens are proxies with live admins |
| Quote | `providerSig` plus `signerMatchesProvider` plus `expiresAt` | recover the EIP-191 signature over the canonical `negotiation_hash` and compare with `job.provider` | quote `expiresAt` | `not published by the agent` |
| Gas payer | enum plus measured gas | our `facilitator` config plus measured settle cost | 1 h | `not applicable` |
| Reachability | `T0` to `T3` | the probe suite verdict | 5 min shelved | `unknown, never checked` |
| Last probe | age plus `httpStatus` plus `failureClass` | `probeResult.observedAt` | 5 min | `unknown, never checked` |
| Latency | p50 and p90 in ms | rolling window over `probeResult.latencyMs` | rolling 5 min | `unknown, never checked` |
| Answered within | timestamp of the last contract-shaped pass | `conformance` history | 5 min | `never` |
| Evidence tier | `E0` to `E4` plus four independent checkmarks | bond escrow read, settled jobs from our ledger, `balanceOf(address)` `0x70a08231` on BABT, `isValidKey` `0x8fd4f06b` on the Keystore | 10 min, attestation 60 s, session per render | each checkmark carries its own unknown state rather than collapsing the tier |
| Muster score | `musterScore`, `scoreLowerBound`, `scoreSampleSize` as a triple | `quality`, settled jobs only | 10 min | `provisional (n=0)`. Never a number with no sample size |
| Settled jobs | count plus `[firstBlock, asOfBlock]`, `origin: order` only | `escrow-index` over `getJob(uint256)` `0xbf22c457` plus our `ledger` | 10 min | `0 in this category (window shown)`, which is a measured zero rather than an unknown |
| Category metric | the unit the contract's `metric` names | `06-QUALITY.md` | 10 min | `unknown, never checked` until the first settled job |
| Category outputs | the per-shelf block below, drawn from that contract's `outputs[]` | the listing's **most recent probe answer**, the same response block 5 of the listing page renders verbatim | each field's own `freshnessCeilingSeconds` from `outputs[]` | each field carries its own state from 7.1, independently of the others |
| Refusals | count plus rate over the window | our job records with `terminalState` a refusal | 10 min | `not applicable (no jobs)` |
| Foreign feedback | count, distinct authors, tag distribution | `getClients(uint256)` `0x42dd519c`, `getLastIndex(uint256,address)` `0xf2d81759`, `readAllFeedback(...)` `0xd9d84224` | 1 h | `none for this listing. 4,406 of 334,935 agents chain-wide have any (block 120,027,164)`, never a star average |
| Session | allowlist entries, each cap as token plus period plus limit, expiry, revoke state | `canExecutePackedInfos(bytes32)` `0xe5adda71` and `spendInfos(bytes32)` `0xdcc09ebf` on the wallet, `getExpiry` `0x3b49ad47` on the Keystore | per render, no cache | `not published by the agent`, which is honest: 123 keys have ever been registered on mainnet |
| Attestation | which of BABT, Galxe Passport, BNB Passport | `balanceOf` on each contract, plus `user_finished_one_of_attestation(address,bytes32[])` on the BNB Passport reader. That third leg is **unverified** as a population: the read answers, every address probed returned an empty list and the mint host does not resolve (`R10-bab-attestation.md`) | 60 s, never persisted | `none held at block N` |
| Sources | which indexes hold this agent and where they disagree | our index, `GET /agents/56/{id}`, `GET /api/v1/catalog/agents/56:{id}` | 15 min, each row with its own age | a source that is down is shown as down with its own status, not as agreement |
| Our freshness | block number plus timestamp plus source | the `_lastId` read at slot `0xa040f782…04e00` plus the sweep record | 30 s | never unknown. It is the field that says how stale everything else is |

Thirty rows. Compare renders all of them. The listing page renders all of them plus the
conformance table, the answer sample and the recompute block.

**The per-category output block, because otherwise the row is plumbing.** Twenty-nine of the thirty rows
are venue-agnostic on purpose: identity, cluster, transport, price, rail, tier, latency, sources. That is
what makes a row comparable across a shelf. It is not enough on its own. Section 2 defines rich outputs
per contract and none of them would reach the surface where the hire decision is made, so a buyer
comparing two `health-factor` listings would see no health factor and two `yield` listings would show no
APY. One row therefore expands into a per-shelf block drawn from that contract's own `outputs[]`, with
each field's unit, its `freshnessCeilingSeconds` and its unknown state.

Its source is the **last probe answer** and never a settled job. `Category metric` reads
`unknown, never checked` until a job settles. No agent in the sample of 600 is payable by a stranger, so a
row carrying only the metric would carry nothing at judging. A probe answer exists for every shelved row
by definition, because a conformance pass is what put it on the shelf. Compare is within one category,
so the block is well defined for every column on the page.

| Shelf | Fields in the block | Ceiling | When unknown |
| --- | --- | --- | --- |
| `rebalancing` | `verdict`, `range`, `principal`, `feesUncollected`, `inRange`, `feeAprNet` with its window, `breakEven` | 60 s each | per field. The optional `inRangeFraction` renders `not applicable (series is <age> old, 24 h needed)` until the series is long enough |
| `grid` | `winRate` per round trip with the round-trip count, `netPnlQuote`, `benchmarkPnlQuote`, `excessReturn`, `risk.maxDrawdown`, `record.window` | 10 min for the record fields, 60 s for `ladder[]` and `inventory` | a listing with no round trips renders `0 in this window (window shown)` as a measured zero, then the four P&L fields render `not applicable (no round trips)` |
| `yield` | `apy` with its `annualisation`, `basis`, `components[]`, `excludes[]`, `utilisation`, `capacity` | 5 min | `refused (<condition>)` where the contract refuses, for example an `includeIncentives` request on Venus Prime |
| `health-factor` | `hf`, `hfBasis`, `distanceBps`, `liquidationPrices[]`, `liquidationIncentive`, `pausedActions[]`, `crossCheck` | 30 s, venue parameters 1 h | per field. A `crossCheck` mismatch renders both numbers side by side rather than one |

Every field in the block carries its unit inline, its own freshness stamp and one of the six states from
7.1, the same as the thirty rows above. Nothing in the block is averaged across listings and no composite
is computed from it.

### 7.3 The shelf column subset

A shelf row is eight fields, because eight is what fits on a phone without a horizontal scroll: listing
and operator, price with its token, reachability with the age of the last probe, evidence tier, the
score triple, settled jobs with the window, then **two fields from the per-category output block**. Those
two are named per shelf and they are the ones a buyer sorts on before opening anything:

| Shelf | The two on the card |
| --- | --- |
| `rebalancing` | `verdict` and `feeAprNet` with its window |
| `grid` | `winRate` per round trip with its round-trip count, plus `excessReturn` |
| `yield` | `apy` and `basis`, so an advertised number never sits on a card looking measured |
| `health-factor` | `hf` and `distanceBps` |

Everything else is one tap away on the listing page
or one click away in Compare.

### 7.4 Where the freshness ceilings come from

Each ceiling is set by what the underlying read actually costs, measured rather than guessed. The
numbers are from `R01-erc8004.md`, `MEASUREMENT.md`, `R05-8004scan-api.md`, `R08-pancakeswap.md`,
`R09-bsc-defi.md` and `R16-reuse.md`.

| Read | Measured cost | Cadence | Why that cadence |
| --- | --- | --- | --- |
| Agent count | one `eth_getStorageAt` on the `_lastId` slot | 30 s | free and it is the number every other count is quoted against |
| Registry tail | one `aggregate3` over the delta since the last run | 30 s | 2,110 registrations a day, so a 30 s tail never falls behind |
| Full registry sweep | 183 agents/s, about 670 `eth_call`s, 0.27 GB, 30.5 min for the whole id range | 6 h | a keyless RPC does it four times a day at no cost |
| Feedback graph | `getClients` plus `getLastIndex` over every id, about 4 min, 0 call errors | 1 h | it was flat on the day we measured, so an hour is generous |
| ERC-8183 jobs | full re-index of 56,713 jobs in 455.6 s | 10 min tail | `jobCounter` did not move at all over 1,714 seconds |
| Probe, shelved row | one request, 8 s timeout, at most one retry | 5 min | this is the number the shelf sorts on, so it is the tightest |
| Probe, off-shelf row | same | 6 h | 300k rows cannot be probed on a 5 minute loop and there is nothing to gain |
| Never-answered row | same | 24 h | it stays reachable by URL and it stops costing us |
| Oracle mark | one batched `getUnderlyingPrice` across the assets in view | 30 s | blocks are 0.45 s and price is the only input that can move a healthy position to liquidatable in one step |
| Pool state | `slot0`, `liquidity`, `feeGrowthGlobal` in one pinned batch | 60 s | three blocks of skew moved `amount0` by 0.63 bps, so the block is pinned and the cache is short |
| Venue parameters | collateral factors, thresholds, incentives, pause flags | 1 h | they only move on a governance vote |
| Session | wallet plus Keystore reads | every render | the track requires a user to see and revoke live, so a cache would defeat the requirement |
| Attestation | one `balanceOf` per contract | 60 s TTL | cheap and the answer decays because tokens get revoked |
| Foreign index | `GET /agents/56/{id}` and the second index's catalogue row | 15 min | anonymous limits are 30 a minute and 1,000 a day per IP, our own key measures 600 a minute and the read path returned 20.8% then 56.7% non-200 across two windows on one day |
| Foreign re-verification | `POST /agents/verify-endpoint/56/{id}`, no auth, once per hour per agent | 1 h for shelved rows only | it demonstrably runs and it is the one lever that makes the sponsor's own index agree with us |

Two hard limits shape all of it. `aggregate3` takes 1,500 sub-calls in one `eth_call` and 2,500 hits
the node's 30 second timeout. `eth_getLogs` is capped at 5,000 blocks on the free endpoints and
anything older than roughly the last hour is an archive request they refuse, so nothing in this
product depends on a from-genesis log scan.

### 7.5 What the comparison row deliberately does not show

Each of these was measured and rejected and the rejection is published in the rulebook.

- **A star average of ERC-8004 feedback.** 111 addresses wrote all 29,712 rows on the chain, one
  address rated 1,800 agents and 265 of 388 entries in an earlier survey came from a single address
  whose tag pair is a Telegram advertisement. An average of that ranks the advertiser first.
- **Any foreign health score as ours.** ClawNews, agent id 1, scores 100.0 with a broken certificate.
- **`endpoint_last_checked_at` from 8004scan as freshness.** It stayed at 2026-05-20 through a
  verification that demonstrably ran and rewrote the error string. `updated_at` and the error text
  move, that field does not (`R05-8004scan-api.md`).
- **Their `total_score` as our rank.** It is cited with their algorithm name, their weights and their
  date, next to our own evidence and never used as a sort key.
- **TVL as a quality signal.** Two live v3 pools with $21.1M and $19.7M TVL had 24 hour volume of
  $277 and $634.
- **The aggregator's top-level `priceImpactBps` at small size.** One CAKE reported -20624 bps on a
  trade whose realised price is within 4 bps of the pool mid, so impact is recomputed as
  `1 - (outputAmount/inputAmount) / mid` and the aggregator's own figure is shown only as a
  cross-check.
- **`agentWallet != 0` as a filter.** It passes the entire registry, because `register` writes
  `msg.sender` into that slot at mint.
- **A lifetime job count with no window.** 56,713 ERC-8183 jobs exist, one address holds 56,167 of
  them and 96.3% of the paid value and whether that address is one operator or a platform router is
  **unverified** (`01-GROUND-TRUTH.md` section 12). Every count we publish carries its window and its
  per-provider split.

## 8. Mobile and accessibility

A judge may open this on a phone, on a bad connection, with a keyboard or with a screen reader. Any
one of those failing is a dead end and the Functionality criterion is written as "without hitting a
dead end".

**Server rendered, works without JavaScript.** The landing page, the four shelves, the listing page
and Compare render on the server and are readable with scripting off. JavaScript adds the facet rail,
the live probe updates and the Revoke button. Nothing needed to understand a listing depends on a
bundle arriving. This is the single biggest mobile decision in the document, because the failure the
rival field is already showing is a page that renders a shell or `--` to a plain fetch
(`R14-rivals.md`).

**Breakpoints and what changes.** Three: under 480, 480 to 1024, above 1024.

| Surface | Phone | Tablet | Desktop |
| --- | --- | --- | --- |
| Shelf | one card per row, eight fields stacked with the label above the value | two cards per row | table with eight columns |
| Compare | two columns, the field label sticky on the left, one field per row, `differs` rows first | three columns | four columns |
| Listing | the nine blocks in order, each collapsible, conformance and freshness expanded by default | same | two columns, evidence and authority on the right |
| Facets | a sheet behind one button, with the active count on the button | sidebar | sidebar |
| Search | full-width box, operator hint under it as a wrapping list of chips | inline | inline |

Compare never becomes a horizontal scroll on a phone. It becomes a field-by-field diff of two
columns, with the rows that differ pulled to the top, because that is the comparison a buyer is
actually making.

**Accessibility, as specific commitments.**

- Every table is a real `<table>` with a `<caption>`, `scope` on every header cell and no layout
  tables anywhere.
- Pass and fail are never colour alone. Each carries an icon plus the word and the conformance table
  reads as text in a screen reader without the colour.
- Contrast at 4.5:1 for body text, 3:1 for large text and for non-text indicators, in both light and
  dark, with the same palette applied to both.
- Focus is always visible, never removed and the tab order follows the reading order. The hire path
  is reachable from the landing page in at most eight tabs and completable with the keyboard alone.
- Touch targets 44 by 44 CSS pixels minimum, including the facet chips and the Revoke button.
- One skip link to the main content, one `<h1>` per page, headings in order with none skipped.
- Live probe updates land in an `aria-live="polite"` region and never move focus, so a row refreshing
  under a screen reader does not interrupt it.
- Every freshness stamp is bound to its value with `aria-describedby`, so a screen reader reads "APY
  2.79%, measured at block 120,027,349, 40 seconds old" rather than a bare number.
- Numbers use `font-variant-numeric: tabular-nums` and the unit is always rendered next to the value
  rather than in a column header alone.
- `prefers-reduced-motion` removes every transition. Nothing important is conveyed by motion.
- `lang` is set, page titles are unique and name the shelf and the four shelf pages have distinct
  `<title>` values so a tab strip is legible.
- Agent-supplied text is rendered as text through one sanitiser, never as markdown or HTML. No
  remote image is loaded from an agent-controlled URL. That is an accessibility rule as well as a
  security one, because a screen reader will happily read an injected instruction out loud.

**The test plan, which runs before submit.** An automated accessibility scan with zero critical findings
on twelve page types, named by route so a builder can tell what is in scope: `/`, `/c/<slug>`,
`/a/<agentId>`, `/a/<agentId>/<listingId>`, `/compare`, `/search`, `/receipts`, `/coverage`, `/report`,
`/status`, `/categories/<slug>` and `/categories/classifier`. One shelf and one listing stand for all four
categories, because 5.3 makes the four render from the identical template and the equal-depth gate in 1.2
asserts it. Then a keyboard-only pass through land, shelf, listing, compare, hire. A 320
pixel width pass on the same path. A scripting-off pass on the same path. A screen reader label check
on the facet rail and the conformance table. `15-SYSTEM.md` owns where these run in CI.

## 9. Versioning a contract under live listings

A category contract is a published document that listings are measured against, so changing it
changes what the shelf means. The rules below make that change legible instead of silent.

**Numbering.** `major.minor`. A minor bump is additive: a new optional input, a new **optional** output,
a clarified unit, a new refusal condition. A major bump is breaking: a new required input, a new required
output, a changed unit, a tightened assertion, a removed or renamed output.

Two of the additive cases still change what a listing has to do, so they do not get a free pass. A new
required output is breaking by definition, because `C2` validates required outputs, which is why only an
optional one may arrive on a minor bump. A new refusal condition is asserted by `C3` and `C6`, so a minor
bump that adds one applies immediately and the row's conformance table keeps showing the **old** version
until `C3` and `C6` have been re-run against the new one, which happens inside one probe cycle: 5 minutes
for a shelved row, 6 hours off shelf. That way a shelf row never displays a full pass against a version
it was not tested on, which is the one thing the conformance table exists to prevent. Every other
additive change applies immediately, needs no re-probe and is recorded by the next conformance run.

**A major bump ships as a parallel document.** `/categories/<slug>/contract/v2.json` goes up beside
`v1.json` and both stay live for the notice window. Every listing keeps the `contractVersion` it was
probed under. The shelf shows a `v1` chip on any row not yet re-probed, sorts re-probed rows above
unmigrated ones and does not delist a row for version lag alone. The operator gets the diff and, on
a failed re-probe against the new version, the failing assertion by name. Only after the notice window
plus a failed re-probe does the row move to `indexed`, with the reason recorded.

**The notice window is 14 days and that is a floor.** `noticeDays` is a changelog field so an entry may
lengthen the window, never shorten it. An entry that omits it takes 14. The clock starts at
`effectiveAt` on the `v2` entry. A row whose operator never answers inside it is re-probed against `v2`
anyway: if it passes it migrates with no operator action at all. Only a row that both failed the
re-probe and went unanswered moves to `indexed`, with the reason and the last contact attempt recorded.
So an unreachable operator loses shelf placement for a failing listing and never for silence alone.

**The changelog is a document, not a commit message.** One entry per version at
`/categories/<slug>/changelog`, each carrying `version`, `effectiveAt`, `change` as `additive` or
`breaking`, `fields[]`, `reason`, `reprobeRequired`, `noticeDays` (14 or more, defaulting to 14 when
absent) and `supersedes`. Retroactive terms
changes are not a thing we do. A listing is judged against the contract in force when it was probed
and a receipt records the `contractVersion` and the `contractHash` it settled under, so a completed
hire stays provable after the contract moves.

**Slugs are retired, never repurposed.** A slug means one thing forever. If a category is dropped its
slug is marked retired in the changelog and no future contract reuses it. The standing example is
`monitoring`, which the launch blog listed and the live rubric page replaced with rebalancing
(`00-PROGRAM.md`): we never shipped it and we never will as one of the four.

**Frozen for the programme.** No breaking change to any of the four contracts between
2026-09-06 00:00 UTC and 2026-09-23 23:59 UTC. Additive changes are allowed and logged. The reason is
that three judges score independently across a two week window, so a contract that changed underneath
them would mean two judges saw two different shelves. If a defect forces a change, it ships as `v2`
beside `v1` with both live and the changelog entry naming the defect.

**A version mismatch is never averaged.** Compare refuses to put a v1 row beside a v2 row on a field
whose definition changed and any published aggregate is computed within one version and labelled with
it.

## 10. What ships by 2026-09-09 and what is documented as next

Stated plainly, because a stretch item presented as shipped is worse than an absent one.

**Ships.**

- Four contracts as JSON at a public URL with a `contractHash`, a contract page each at
  `/categories/<slug>`, plus three exemplars each. The exemplars may be first-party listings or stored
  probe transcripts and each carries its `kind` on the page, because live third-party supply that passes
  a contract is exactly the thing this population may not have.
- The seven contract assertions per category, run by `conformance`, with a pass or a named failure per
  assertion on every shelved listing and on every off-shelf candidate in the four categories once it has
  been probed. Everywhere else the field reads `unknown, never checked` with its queue position, which is
  most of the registry and is the honest state rather than a gap.
- The classifier with `categoryBasis` and the rank that fired, the five-value `categoryConfidence`
  ladder, the published term list, the OASF path validation against the canonical set and the declared
  tag, then the per-category candidate, probed, passed and shelved counts.
- The four shelves with the banded list, the contract summary, at most one exploration slot each, the
  supporting-reads facet collapsed and the off-shelf drawer broken out by reason.
- Three sub-capabilities per root, twelve in all, with the two marked next in section 3 valid as `tag:`
  values and returning a labelled zero.
- The listing page with all nine blocks, including the live session panel and the recompute block, plus
  the agent page at `/a/<agentId>` for every readable agent including the 99.8% that hold no listing.
- Compare within one category, up to four columns, with `differs` and per-field freshness, addressed as
  `/compare?ids=`.
- Search with the operator grammar in section 5.6, the facets in 5.7, the sorts in 5.8 and every empty
  state in 5.9.
- Duplicate collapse on all three keys, `K1` then `K2` then `K3` in that order, with cluster and row
  counts both published.
- The comparison row's thirty fields with their freshness ceilings, the per-category output block drawn
  from the last probe answer and the six-state unknown vocabulary.
- Mobile, the scripting-off path and the accessibility commitments in section 8, with the test plan
  green before submit.
- Contract versioning with `v1` frozen for the judging window and a changelog page that exists even
  though it has one entry.
- The equal-depth gate as a build failure on the artifacts we control, plus the equal-depth status line
  on the Status page. **A shelf may ship with zero third-party rows and that is a measured zero, not a
  build failure.** The population makes it likely: rebalancing 0, grid 0, yield 1, health factor 0 in the
  sample of 600, all 12 machine-callable agents one product on one host in none of the four categories,
  and 0 of 600 payable by a stranger (`MEASUREMENT.md`).

**Documented as next, not built.** The `yield/looping` and `health-factor/self-liquidation`
sub-capabilities, for the reasons section 3 gives. Per-field history charts, which need the 30 day series
`sampler` has to accumulate
first. Semantic search, which is deliberately out on the evidence in section 5.6. An operator-facing
appeal UI for the operator cap, which ships as an email route and a policy page instead. i18n, where
only the currency and unit rendering discipline lands now. A migration tool for a `v2` contract, which
is a changelog entry plus a re-probe queue today and could be a diff viewer later.

## 11. Decisions and rejected alternatives

| Decision | Rejected alternative | Why |
| --- | --- | --- |
| A category is a contract document with named inputs, outputs, units and a question, published with a hash | A category is a tag or a closed enum with prose descriptions only | A tag cannot be checked, so miscategorisation becomes an argument. A contract makes it an assertion and Agent Diversity is scored on depth rather than on labels |
| Exactly four roots, sub-capabilities inside them, no fifth tab before 2026-09-23 | A fifth shelf for the long tail or a general shelf | A fifth tab competes for the attention the rubric points at the four. The tail is reachable by search and by the supporting-reads facet without diluting a shelf |
| Evidence outranks declaration for placement, declaration outranks evidence for what we say was promised | Trust the declaration or ignore it entirely | Trusting it puts 518 keyword matches on four shelves. Ignoring it throws away the one thing an operator signed. Splitting the two questions keeps both signals |
| Text-only never reaches a shelf | Show text matches with a low confidence chip | A confidence chip on an unprobed row is a decoration. The candidate count is published beside the shelved count instead, which says the same thing honestly |
| An E0 third-party row that passes conformance and is T2-fresh appears on the shelf in the Listed band, with the hire button disabled and the missing requirement named | Restrict the shelf to E2 and above, as the ladder's Unlocks column reads literally | 0 of 600 sampled agents are payable by a stranger, so an E2-only shelf would be four empty shelves or four first-party shelves and the field already shows judges discounting the latter. The tier still gates the badge, the full-weight feedback and the hire button, so nothing is promoted, only shown |
| Reachability and evidence stay two separate chips | One composite trust badge or a single 0 to 100 score | They fail independently and a composite hides which one broke. The one index that publishes a composite scores a broken host 100 out of 100 |
| Compare is within one category and never declares a winner | Cross-category compare or a recommended pick | The comparison row is defined by the contract, so cross-category columns carry unlike units. A winner badge is a recommendation we cannot defend per buyer |
| A published operator grammar with typed operators and an unknown operator is an error | A filter sidebar only or a natural language box | Operators make the same data feel like a tool, they demo in one line and they map one-to-one onto indexed fields. Silently ignoring a typo returns a confidently wrong result |
| Semantic search does not ship | Ship it as an extra ranking input | Measured: for "watch my Venus health factor" the top three are `Stellar_Moon_Pro.agent`, `AstroAgent.agent` and `Astroify.agent`, all name-shaped matches with no Venus integration. The weighting knobs return byte-identical results. It adds noise and a dependency |
| Duplicate collapse uses three keys, with `K2` on host plus name plus service set | Deduplicate by owner or by name or by URI hash alone | Owner-based fails on 215 rows under 215 owners. Name-based catches only the exact string. A hash alone leaves the 12 machine-callable agents showing as twelve independent services on one host |
| Six-state unknown vocabulary, never a zero or a dash | Render an em dash or a zero for a missing value | A zero is a claim. ClawNews, agent id 1, scoring 100 out of 100 with a certificate bound to the wrong hostname is what happens when a source guesses instead of abstaining |
| Every number carries block, timestamp and source, with a per-field ceiling | One "last updated" stamp per page | The reads behind one page differ by four orders of magnitude in cadence, from a per-render session read to a six-hourly sweep. One stamp would be wrong for almost every field on the page |
| Server-rendered pages that work with scripting off | A single-page app with client-side data fetching | A judge on a phone with a bad connection is the case that fails and rival deployments are already serving shells and `--` to a plain fetch |
| One exploration slot per shelf, hourly deterministic rotation, omitted when nothing is eligible | A percentage of impressions, a randomised slot or a placeholder card when the set is empty | A fixed slot is auditable by a judge and cannot be gamed by refreshing. A percentage needs impression accounting we would have to be trusted about. A placeholder card is a row with no listing behind it |
| The four contracts are frozen against breaking changes for the judging window | Ship improvements as they land | Three judges score independently across two weeks. A contract that moves under them means two judges scored two different products |
| Slugs are retired, never repurposed | Reuse a slug when a category evolves | `monitoring` becoming `rebalancing` in the programme's own materials is the exact failure this avoids |
| At most one shelved row per operator per shelf, a second needing settled jobs with us in that category | No cap at all or one global cap across the whole product | With no cap, one operator with a template fills a shelf and shelf position stops carrying information: 215 of 600 sampled rows are one name under 215 owners. A global cap punishes an operator who genuinely serves three categories, which is the supply we want |
| `noindex,follow` on every page that is not a shelved listing, a shelf or a contract | Index everything or index nothing | Publishing hundreds of thousands of thin pages is spam we authored. It is our own thin content that would rank against our shelves. Indexing nothing throws away the four shelf pages and the four contracts, which are the pages worth finding. `follow` keeps a crawler reaching the shelves through the thin pages |
| The equal-depth check is a build gate on our own artifacts plus a reported status line on the population | One CI check that fails the build on both, including zero third-party rows on a shelf | The population is not ours to fix by 2026-09-09. Rebalancing, grid and health factor each score 0 in the sample of 600, so a gate on third-party rows would block the deploy in the state the rest of this document plans for. A reported zero is a measurement and it belongs on the Status page |
| A per-category output block in the comparison row, sourced from the last probe answer | Only the venue-agnostic fields, with the category metric standing in for depth | The metric reads `unknown, never checked` until a job settles and 0 of 600 agents are payable by a stranger, so at judging the row would carry no category data at all. A probe answer exists for every shelved row because a conformance pass is what shelved it |
| An agent with no listing gets an agent page at `/a/<agentId>` and its unshelved state is derived | Write a listing row carrying `category: null` for every readable agent | `listing.category` is constrained to the four slugs with `(agentId, category)` unique, so a null-category row means relaxing that constraint for 99.8% of the registry and inventing a uniqueness rule for the null case. Deriving the state from `registrationParsed`, the classifier's output and `probeResult` adds no field and still gives all 334,935 agents a stable URL |
| Three sub-capabilities per root, twelve shipped, two documented as next | Ship all fourteen or leave the shipped tree at two, two, four, four | Agent Diversity scores equal depth. An unequal sub-capability count is asymmetry in exactly that dimension. Twelve symmetric is more depth than eight symmetric. The two left out each reach outside their own contract |

## 12. Open questions

1. **Whether any main-rubric criterion outweighs another.** The Weight column on the live page is
   published empty, so this is unverified and unknowable. Nothing in this IA assumes one, which is why
   the four shelves, the conformance table and the freshness strip all get first-class surfaces rather
   than one of them getting the hero slot.
2. **What Phase 2 assesses.** The page prints `[REDACTED]`. Unverified and nothing here is tuned for
   it.
3. **How many third-party rows each shelf will actually carry on 2026-09-09.** The classifier's
   candidate counts are known (rebalancing 47, grid 20, yield 290 or 430 depending on the term, health
   factor 21, from the sponsor index's full-text search) and the pass rate through a contract probe is
   not, because nobody has run one. The equal-depth status line publishes the answer per shelf once the
   first probe cycle runs, the off-shelf drawer publishes the reason breakdown behind it. Neither
   number can fail the build. The honest floor is zero and section 10 says so.
4. **Whether the 27,048 A2A declarations survive validation.** Every declaration sampled but one is
   the same platform template, which passes no published A2A schema. A full sweep is about 30 minutes
   of `eth_call` and has not been run, so the transport facet's A2A count is unverified at population
   scale.
5. **Whether one address holding 99% of ERC-8183 jobs is one operator or a platform router.** The
   settled-jobs field's per-provider split depends on which and it is unverified.
6. **Venus Prime boost units.** The API returns `0.1476…` and whether that is points or percent is
   unresolved, so `includeIncentives` refuses on that venue rather than publishing a number with an
   unknown unit.
7. **Whether an operator will claim a case D listing.** Placement by probe with a claim link is
   untested behaviour on a population where 576 of 585 sampled owners hold no attestation at all. If
   nobody claims, the shelves stay full of `basis: probe` rows, which is honest but weaker than a
   signed declaration.
8. **Whether the sponsor index's re-verification lever stays unauthenticated.** It needs no key today
   and its own spec says owner verification "will be added". If it closes, the sources row loses its
   freshening path and shows their stale date instead of ours.
9. **Which BAS schema, if any, we would use to publish our own conformance verdicts on chain.** The
   candidate schema is registered and the mapping to the six KYC providers is inferred, so it stays
   unverified and out of the shipped surface.
10. **Whether a fifth category is the right answer after judging.** The tail is 99.8% of the registry
    and the supporting-reads facet is a holding pattern, not an answer.
