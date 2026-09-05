# 09-DISPUTES: what can be argued, who decides it and the first hour of an incident

Muster brokers hires on two rails with opposite dispute physics, so this settles both. On the x402
rail the buyer signs once off chain, over EIP-3009 or over Permit2, then a facilitator submits it and
the money moves in seconds. Irreversibility begins at settlement rather than at signature: until the
facilitator submits, the signature can still be killed on the sub-rails section 6 names. Once it lands
nothing on chain reverses it. On the official ERC-8183 rail the budget sits in the kernel for the
whole dispute window, `settle` is permissionless and silence pays the provider, so the only lever is a
button that only the buyer may press. `08-MONEY.md` owns the rails. `10-DOCS-AND-POLICY.md` publishes
every rule below. This document decides the mechanism.

Two constraints shape all of it.

**Muster never holds a counterparty's value.** FinCEN FIN-2019-G001 section 4.6.2 says a venue that
only hosts bids and offers, with the parties settling "through an outside venue", "does not qualify as
a money transmitter", while the same document says "CVC payment processors fall within the definition
of a money transmitter" (`R15-compliance.md`, read from the primary PDF). No remedy here routes a
buyer's money through an account we control. The one remedy denominated in our own liability, the
credit, is a waiver against our own fee rather than a balance we custody and pay out. Section 6 has
the mechanics. The remedy that would have put us in the flow, an operator bond we release to a buyer, is
documented as next with the reason.

**Nothing leaves the registry.** `register(string)` `0xf2c298be` is permissionless: simulated from an
arbitrary address it returns the next id (`R15-compliance.md`). `setAgentURI` `0x0af28bd3`,
`setMetadata` `0x466648da` and `setAgentWallet` `0x2d1ef5ae` are owner-callable at any time
(`R01-erc8004.md`). Takedown therefore means delisting from our own index and only that. Every
enforcement record we emit says so in a field rather than implying otherwise.

Field names are SPINE's. Where the dispute record needs a name SPINE does not carry, it is marked as a
name `15-SYSTEM.md` should add, never asserted as existing.

## 1. What is disputable and what is not

A buyer reads this on the listing before hiring, not in a policy page. One rule sits behind it: **a
claim is disputable when it can be decided from bytes Muster already holds.** A venue that accepts a
dispute it cannot decide has to invent a verdict, which is worse for both sides than a published
refusal to hear it.

| # | Disputable claim | Decided from |
| --- | --- | --- |
| D1 | Not delivered | no `responseHash` on the `job` by the deadline the listing published |
| D2 | Delivered, does not satisfy the category contract | the response validated against `outputSchema` at its pinned `contractVersion` |
| D3 | The deliverable does not match its hash | recompute under `deliverableRule` (`keccakCanonical`, `sha256Raw`, `keccakRaw`) against `receipt.contentHash` |
| D4 | Charged more than the quote | `payment.amountBase` against `quote.priceBase`, with `priceToken` plus `priceDecimals` compared rather than assumed |
| D5 | Charged twice for one job | two `payment` rows with the same `jobId` and different `txHash` |
| D6 | Paid for a refusal | `terminalState` is a refusal, a `payment` settled, no re-quote issued |
| D7 | The arithmetic contradicts the pinned inputs | `receipt.pinnedBlock` plus `receipt.recomputeCommand`, re-run by anyone |
| D8 | The agent acted outside the granted session | a transaction against `session.allowlist[]` plus `session.expiry` read at that block. The over-cap leg needs the spent-to-date words captured at dispatch and carries the caveat below |
| D9 | The listing was not what ran | `tokenUriHash` at dispatch against the hash pinned at review |
| D10 | A screened counterparty was paid anyway | the `screening` verdict written at quote and at settlement |

D7 is the strongest of the ten. A dispute about arithmetic is not an argument between two accounts, it
is a command either side runs to the same answer. D2 and D3 are machine-decided outright. D1, D4, D5,
D6, D9 and D10 are single comparisons. Only D8 needs a chain read at a historical block, which is why
the `session` snapshot is captured at dispatch rather than reconstructed later.

**The over-cap leg of D8 is the one part of the list that is not yet machine-decidable. It says so.** A
spend cap is cumulative over a period, so an over-cap spend can only be decided against the amount
already spent in that period. The snapshot SPINE defines carries `spendCaps[]` as
`{token, period, limitBase}` with no spent-to-date. That figure lives in the later words of
`spendInfos` `0xdcc09ebf`. SPINE lists the layout as unverified: "Porto `SpendInfo` field names at
positions 3, 4 and 5 unverified. All zero on the wallet sampled." So the bundle captures the **raw
`spendInfos` words plus the period start** at dispatch and labels the spent-to-date position
unverified, which preserves the bytes a later reading can decide against. Until a wallet with a
partially spent cap settles the layout, an over-cap claim is decided on the allowlist leg and the
expiry leg only and the buyer is told which part of the claim could not be checked.

| # | Not disputable, said before the hire | Why not |
| --- | --- | --- |
| N1 | The market moved against me | price risk is the buyer's. Muster promises measurement, never an outcome |
| N2 | The agent refused | a refusal naming a condition in `refusalConditions[]` where that condition held is a delivery. SPINE: a correct refusal is a success |
| N3 | The forecast was wrong | Muster ships no forecasts. Section 10 has the four output shapes and none predicts |
| N4 | Slippage moved the fill | the buyer set the tolerance and the calldata carried it |
| N5 | Gas and network fees | not ours and not the operator's |
| N6 | I would have picked a different agent | the ranking criteria are published and buyer override exists (`07-MATCHING.md`) |
| N7 | A third-party protocol failed | a paused market, a drained pool, an RPC outage. Named in advance because it will happen |
| N8 | A transaction my own key signed that Muster did not construct | outside the venue, so outside the record |
| N9 | A job Muster did not broker | no evidence bundle exists, so nothing is decidable. Stated where a direct hire is offered |

N7 carries an honesty note. **All three** settlement tokens that make one-signature payment work on BSC
can freeze a counterparty mid-job. SPINE settles the set as FDUSD, USD1 and `$U`. Each exposes
`freeze(address)` `0x8d1fdf2f`, `unfreeze(address)` `0x45c8b1a6`, `frozen(address)` `0xd0516650` plus
`paused()` `0x5c975abb` (`R15-compliance.md` for the first two, `R04-bsc-tokens.md` for all three).
USD1 also exposes `reallocate(address,address,uint256)` `0x308b8c00`. `$U` was read directly for this
pass: implementation `0xbef21313c69c009fd7d9510a8d3a481a32473dfc` behind the EIP-1967 slot on
`0xcE24439F2D9C6a2289F741120FE202248B666666`, all four selectors present in the implementation
bytecode, `reallocate` absent.

**The escrow rail is where that exposure is worst and `$U` is the token it lands on.** `paymentToken()`
`0x3013ce29` on the kernel reads `0xcE24439F2D9C6a2289F741120FE202248B666666`, so the escrow budget is
denominated in the one token whose issuer, peg and redemption are all on SPINE's unverified list. It
sits in the kernel for the whole seven-day window rather than moving in seconds. A freeze inside
that window locks the buyer's money while `settle` stays permissionless and `claimRefund` stays the
only unhookable exit. Muster therefore never tells a buyer that escrowed funds are beyond anyone's
reach. A freeze mid-job resolves under section 6 instead of being argued about. The freeze surface
on all three tokens is a live incident trigger under section 11.

### The same depth in each of the four categories

Each category answers a different question and fails a different way, so the line is drawn four times.

**Rebalancing.** Disputable: a drift figure that contradicts the position read at `pinnedBlock`, a trade
list that does not restore the band the buyer set, a rebalance fired while the position was inside the
band, a plan whose own arithmetic fails a recompute. Not disputable: that the band was wrong or that a
rebalance correct at its block lost value afterwards. A plan has to state the break-even test
`expectedFeeGain(newRange) * expectedInRangeTime > realisedIL(rebalance) + gasCost + swapCost`
(`R08-pancakeswap.md`) with a source per term, because a plan hiding the right-hand side cannot be
checked.

**Grid trading.** Disputable: a grid placed outside the bounds the buyer entered, a reported fill with no
matching on-chain event, an in-range fraction that does not reproduce from
`snapshotCumulativesInside(tickLower, tickUpper)` differenced over the stated wall clock, a fee income
that contradicts the pool's fee tier net of the protocol fee. Not disputable: that a trending market
walked out of the grid. `R08-pancakeswap.md` also records that `secondsInside` history cannot be fetched
retroactively on free infrastructure, so the `sampler` stores our own series forward and a grid dispute
is decided against the series that existed at dispatch.

**Yield.** Disputable: an APY that does not reproduce from the protocol's own call at the block cited, a
rate shown without its window, a figure taken from an aggregate we know is wrong. PancakeSwap Explorer's
`apr24h` on v2 pools measured reproducibly 0.68x low with no findable cause (`R08-pancakeswap.md`), so a
listing serving that number rather than re-deriving it has already lost D7. Venus publishes
`((1 + ratePerBlock/1e18 * 192000)^364 - 1) * 100`, exponent 364, which reproduces `api.venus.io` to
4e-12 (`R09-bsc-defi.md`), so an unreproducible yield figure has no excuse. Not disputable: that the rate
fell after measurement.

**Health factor.** Disputable: a health factor computed off the collateral factor rather than the
liquidation threshold, a liquidation distance contradicting the oracle price at the block cited, an alert
whose trigger condition was met and which did not fire. `getAccountLiquidity` `0x5ec88c79` uses the
liquidation threshold while `getBorrowingPower` `0x528a174c` uses the collateral factor. 12 of 55
Venus core markets have the two different, so the wrong read understates the distance to liquidation. On
the account measured in `R09-bsc-defi.md` the gap is $29.81 on $825 of debt. Not disputable: that a price
move liquidated the position.

## 2. The evidence bundle

Captured automatically at job time, with no operator action and no buyer action. Every venue that
publishes its dispute rules has learned the same lesson: a defensible decision comes from a checklist
written before the dispute rather than judgement applied after it. eBay's burden test is a closed list of
machine-checkable facts whose consequence is published in advance, "eBay may step in without the buyer
asking if there is no valid tracking information available". Stripe's dispute object is 30 typed evidence
fields plus `due_by`, `past_due` and `submission_count`, where one write submits the whole hash for
review (`R13-prior-art.md`). Muster's bundle is that shape. On chain it is stronger than either, because
delivery and payment are both hashes rather than prose.

| Slot | Content | Store |
| --- | --- | --- |
| Terms | `quote`: `quoteId`, `priceBase`, `priceToken`, `priceDecimals`, `expiresAt`, `negotiationHash`, `providerSig`, `signerRecovered`, `signerMatchesProvider`, `verifyingContract`, `chainId`, `issuedAt` | `ledger` entry |
| Promise | the listing snapshot at dispatch: `listingId`, `contractVersion`, `inputSchema`, `outputSchema`, `refusalConditions[]`, `priceBase`, `tokenUriHash`, the hash pinned at review | `evidence-store` |
| Request | `requestHash` plus the raw request body | hash in the `ledger`, body in `evidence-store` |
| Probe state at dispatch | the last `probeResult` for the target surface: `verdict`, `httpStatus`, `dnsVerdict`, `tlsVerdict`, `latencyMs`, `failureClass`, `observedAt`, `prober` | `evidence-store` |
| Session state at dispatch | `session`: `allowlist[]`, `spendCaps[]`, `expiry`, `registered`, `revokedAt`, `keyId`, `lastReadBlock`, read live from `canExecutePackedInfos` `0xe5adda71`, `spendInfos` `0xdcc09ebf`, `isValidKey` `0x8fd4f06b` plus `getExpiry` `0x3b49ad47`. The **raw `spendInfos` words plus the period start** are kept beside the decoded fields for the D8 caveat in section 1 | `evidence-store` |
| Delivery | `responseHash`, `deliverableUri`, `deliverableRule`, `deliveredAt` and the raw response | hashes in the `ledger`, body in `evidence-store` |
| Timing | `startedAt`, `deliveredAt`, `terminalAt`, `terminalState`, each with the block number read beside it | `ledger` |
| Payment | `payment`: `rail`, `token`, `decimals`, `amountBase`, `payer`, `payTo`, `nonce`, `validAfter`, `validBefore`, `txHash`, `blockNumber`, `settledAt`, `facilitator`, `gasPaidBy`, `feeBase`, `origin` | `ledger` and the tx on BSC |
| Screening | the verdict at quote and again at settlement, each with its list fetch time plus list hash | `ledger`, kept 5 years |
| Signed offer and receipt | x402 `offer-receipt`: the offer from the challenge's `extensions["offer-receipt"].info.offers[]`, the receipt from the settlement response | `evidence-store`, as received |
| Escrow leg | `escrowJobId`, the `job.description` JSON with `negotiation_hash` plus `provider_sig`, `JobFunded`, `JobSubmitted` with its `bytes32 deliverable`, `JobInitialised`, `submittedAt(jobId)`, `disputed(jobId)`, `rejectVotes(jobId)` | BSC, indexed by `escrow-index` |
| Refusal | `refusal`, naming which declared condition failed | `ledger` |

Two traps in that table. `JobInitialised` topic0 `0x979e9cbf...3a8d` is emitted by the policy rather than
the kernel and is the only on-chain home of the deliverable pointer (`R02-erc8183.md`), so an indexer
watching the kernel alone captures jobs whose deliverable it cannot retrieve. `NewFeedback` carries
`endpoint`, `feedbackURI` plus `feedbackHash` only in the log and never in storage (`R01-erc8004.md`), so
the reputation leg needs event indexing at topic0
`0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc` and cannot be read back with a view
call.

**The bundle is sealed.** At `terminalAt` the `broker` computes `bundleHash`, the keccak256 of a canonical
manifest of `(slot, value or content hash)` pairs, then appends it to the `ledger` with that entry's
`prevHash` plus `entryHash`. From then on neither side adds to the bundle except through the dispute's own
submission slot. Any later edit is detectable by recomputing the manifest. `bundleHash` is also the
natural key for the on-chain decision in section 5, because the Validation Registry's `requestHash` is
caller-chosen and must be unique.

**Retention is part of the design.** The raw request and response are user content, unbounded in what they
may contain, so a job brief can carry a third party's personal data. EDPB Guidelines 02/2025 v2.0
Recommendation 2 para 109 says keep additional personal data off chain, Recommendation 10 para 118
defaults to no on-chain publication without the data subject's intervention, Recommendation 11 para 120
says that where the retention period cannot be guaranteed no personal data goes on chain at all
(`R15-compliance.md`). So the bodies are deleted at window close plus a short grace by a scheduled job with
a test that proves it deletes. The hashes, ids, amounts, timestamps plus screening verdicts stay. A buyer
can export the whole bundle while the bodies exist, as a file whose manifest hash matches the `ledger`.

## 3. The lifecycle, with a clock on every step

The DSA gives qualitative standards rather than numbers: Art 16(4) confirm receipt "without undue delay",
Art 16(5) notify the decision "without undue delay", Art 16(6) process "in a timely, diligent,
non-arbitrary and objective manner" (`R15-compliance.md`). Inventing a number the statute does not give
would be inventing law, so Muster sets its own targets against those standards and publishes them. Every
number below is ours except the two read from chain.

### The window is a listing field, printed before the hire

| Rail | Window to raise | Source of the number |
| --- | --- | --- |
| x402 one-signature (`eip3009`, `permit2Exact`, `permit2Upto`) | **72 h from `terminalAt`** | ours. The money is already final, so a longer window leaves an operator's liability open with no matching power to act |
| ERC-8183 escrow (`escrow8183`) | **`disputeWindow()` from `submittedAt`**: 604,800 s (7 days) on mainnet, 900 s on testnet | read from the policy at `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5` on 56, `0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA` on 97 (`R02-erc8183.md`) |

One number per hire rather than one across the venue, because the escrow number is not ours to choose.
`settle` `0x39c2ebb9` is permissionless once `submittedAt + disputeWindow` elapses, there is no
`voteApprove` on chain and silence approves, so that window is the whole of a buyer's power on that rail.

**Step 1, auto-resolve, target 60 s from `terminalAt`.** The `conformance` component re-runs five
deterministic checks against the sealed bundle: `outputSchema` at the pinned `contractVersion`, the hash
under `deliverableRule`, `amountBase` against the quote, a duplicate-payment scan on `jobId`, then the
deadline. All five are local, so the real cost is milliseconds. On a failure Muster opens the dispute
itself, decides it against the operator and fires the remedy with the buyer typing nothing. The record
enters state `prevented`, which is Stripe's name for a dispute that never became one because the venue
refunded first. On a pass the `dispute` row's `checksPassed` flag is set true on the seal, which does
not settle a D7 or D8 claim and does not pretend to. `checksPassed` is a field rather than a verdict,
because the four verdict values all describe a decided argument and a machine pass decides nothing.

**Step 2, raise.** One click from the job page, no fee, no bond, a required reason code from D1 to D10.
Free text is stored and never decides anything alone. Raising is free on purpose: TermiX reads
`challengeBondAmount()` as 0 on its live escrow (`R07-termix.md`). A buyer-side bond suppresses exactly
the small disputes we most want to see.

**Step 3, agent response window, 72 h on the x402 rail and compressed on the escrow rail.** The 72 h
matches TermiX's `acceptWindow()` plus `verdictTimeout()`, both 259,200 s (`R07-termix.md`), so an
operator listed in both venues learns one number rather than two. Step 4 has the compression rule and
why the escrow rail needs one. One submission slot per dispute. One write submits everything in it,
which is Stripe's rule and stops a drip of afterthoughts. Both sides see the same `submissionCount` and
the same deadline. A response counts only when it names the contested assertion and attaches the
artifact that contests it, which removes the incentive to file one purely to run the clock.

**Silence decides against the silent party.** Upwork's arbitration default is that "if one party pursues
and pays for arbitration and the other does not, the funds will be released to the party who did choose to
participate" and eBay steps in unasked when tracking is absent (`R13-prior-art.md`).

**Step 4, decision.** Both clocks are anchored to `windowClosesAt`, the absolute close of the buyer's
own window, rather than to a duration measured from wherever the response window happened to end.
Anchored the other way a decision can land after the on-chain lever has already expired, which is the
one failure this step exists to prevent.

```
x402 rail, where nothing on chain is left to press:
  responseDueBy    = raisedAt + 72 h
  decision target  = responseDueBy + 48 h

escrow rail, where the buyer's only lever expires at windowClosesAt:
  responseDueBy    = min(raisedAt + 72 h, windowClosesAt - 48 h)
  decision target  = min(responseDueBy + 72 h, windowClosesAt - 24 h)
```

`windowClosesAt` is `terminalAt + 72 h` on the x402 rail (ours) then `submittedAt + disputeWindow()` on
the escrow rail (not ours). The subtraction only appears on the escrow rail because that is the only
rail with a button, so **the escrow rail compresses the response window rather than running past the
close.** Worked on mainnet, where the window is 604,800 s: a dispute raised at hour 0 gives the
operator the full 72 h and puts the decision at hour 144, a dispute raised at hour 100 gives the
operator 20 h and still puts the decision at hour 144. Either way 24 h of window is left for the buyer
to press `dispute` with our verdict in hand. 24 h is `R15-compliance.md`'s published target wherever
funds are actively at risk, so the same number sets the last safe margin.

**Where the remaining window is under 48 h, there is no process to run and we say so.** Tier 0 decides
on the sealed bundle immediately, the operator's submission slot stays open but no longer gates the
verdict. The buyer is told in plain words that the on-chain lever is theirs alone and expires at
`windowClosesAt` whatever we conclude. On the testnet escrow rail the window is 900 s, so every dispute
falls into this branch by construction: the machine tier decides or nothing does, floor 60 s. Saying so
beats shipping a testnet demo that implies human review inside fifteen minutes.

**The settler never pays a provider ahead of our own verdict.** `settle` is callable by anyone the
moment `submittedAt + disputeWindow` elapses, so the component in section 12 that calls it skips any job
carrying an open Muster dispute until either the verdict is delivered with the buyer's 24 h run out or
the window has shut. That only binds our own component. `settle` stays permissionless for everybody
else, which is one more reason the buyer's own button is the real lever and ours is a convenience.

**Step 5, appeal.** 30 calendar days from the decision, new evidence only, which is eBay's practice and
its framing ("provide additional documentation"). The internal complaint channel stays open **six months**
from the decision regardless, because DSA Art 20(1) sets that floor for removals, suspensions, account
actions plus restrictions on monetising. Honouring it costs one index. A complaint with sufficient
grounds reverses the decision without undue delay under Art 20(4). Our target for the reversal is 72 h.

**Step 6, enforcement, immediate.** The remedy executes, the statement of reasons goes to the affected
party, the job enters or does not enter the settled set that `quality` scores from, `visibility` moves if
the decision crossed a threshold. Nothing waits for a batch.

### What the buyer sees while the clock runs

On the escrow rail the states are first-class rather than hidden behind a spinner. Each one carries
the clock that actually applies to it rather than one generic countdown.

| State | The clock on screen | The button |
| --- | --- | --- |
| FUNDED | time to `expiredAt`, the deadline fixed at `createJob` | `claimRefund` `0x5b7baf64` once `expiredAt` passes. Unhookable, so nobody can block it |
| SUBMITTED | time to auto-approval, `submittedAt + disputeWindow()` | `dispute` while the window is open, then `claimRefund` after `expiredAt` |

**A FUNDED job has no auto-approval clock, because it has not been submitted.** Two live FUNDED jobs
registered against the mainnet policy were read for this pass, 56663 and 56674: `submittedAt(jobId)` is
0 on both and `check(jobId, 0x)` returns verdict 0 PENDING on both. Their only deadline is `expiredAt`,
which runs to `claimRefund`. This contradicts `R02-erc8183.md`'s UI note, which puts a countdown to
auto-approval on FUNDED and SUBMITTED together. The reason is R02's own transition table:
auto-approval runs from `submittedAt` while `Funded or Submitted -> Expired` runs from `expiredAt`. A
FUNDED countdown to auto-approval tells a buyer the wrong date for when their money can be released and
shows a judge a timer that reaches zero with nothing happening.

Treating COMPLETED as the only success state makes the product look broken on its own happy path
(`R02-erc8183.md`).

One consequence to state before a judge finds it. A mainnet escrow job submitted on 2026-09-08
auto-approves on 2026-09-15, inside the judging window of 2026-09-09 to 2026-09-23. A judge opening the
site on day one sees SUBMITTED with a live countdown. A judge returning the following week sees
COMPLETED. The countdown is on screen so the state reads as designed rather than as stalled.

### The dispute record

`job.disputeId` exists in SPINE and `15-SYSTEM.md` declares the `dispute` collection on this document's
behalf, with `state`, `funder` and a separate `reasonsRecord` keyed `reasonId`. Those are the spellings.
Earlier drafts of this document called them `remedyFundedBy` and `sorId`. Those two names are dropped
rather than carried in parallel. The rest are names `15-SYSTEM.md` should add rather than names asserted
as existing:

```
dispute:
  disputeId, jobId, listingId, agentId, buyer, provider
  reasonCode             one of D1..D10 or other with required free text
  raisedBy               buyer | muster        muster where Tier 0 opened it
  raisedAt, windowClosesAt
  state                  the enum below
  bundleHash             the seal from section 2
  checksPassed           bool, the Tier 0 machine pass, false until step 1 runs
  responseDueBy, submissionCount, responseArtifacts[]
  deciderId, verdict, decidedAt, decisionRecordHash
  remedy, funder, remedyExecutedAt
  reasonId               the statement of reasons, on `reasonsRecord`
  appealBy, appealedAt, reversedAt
  automatedMeansUsed     bool
  onChainEffect          "none" on any registry action
  validationRequestHash  = bundleHash on a first-party listing, null otherwise, per section 5
```

**The states, with the terminal ones marked.** A builder cannot tell which transitions are legal from a
list of clocked steps, so the enum is here rather than implied.

| `state` | Means | Terminal |
| --- | --- | --- |
| `prevented` | step 1 found the defect, decided it against the operator and fired the remedy before any buyer filed anything | **yes** |
| `open` | raised, reason code recorded, bundle sealed, nothing sent to the operator yet | no |
| `awaitingResponse` | the operator's submission slot is live and `responseDueBy` is set | no |
| `underReview` | the response landed or the slot closed, a decider holds it | no |
| `decided` | verdict, remedy and statement of reasons all written | no, until the appeal window shuts |
| `appealed` | new evidence inside 30 days, back to a decider | no |
| `closed` | the appeal window shut unused or an appeal was decided | **yes** |

Legal transitions and nothing else. `prevented` is entered only from step 1 and never leaves. `open` to
`awaitingResponse` when the raise is accepted or straight to `underReview` where the remaining window is
under 48 h and step 4's immediate branch applies. `awaitingResponse` to `underReview` on a response or on
the slot closing. `underReview` to `decided`. `decided` to `appealed` inside 30 days, `decided` to
`closed` after them. `appealed` to `decided` on the new verdict. One exception to `closed` being terminal,
and it is statutory rather than a design choice: an internal complaint inside the six-month Art 20 channel
can reverse a decision on a closed row, which writes `reversedAt` and re-enters `decided`. That is the
only path back out.

Every field exists because a rule or a statute above asks for it. Nothing in it is free text that decides
anything, which is what makes the public log in section 7 publishable.

## 4. Burden of proof and the default when evidence is absent

One rule: **the party that controls the missing bytes loses the point.** Not the weaker party, not the
newer account, not the smaller amount. Whoever could have produced the evidence and did not.

| Claim | Burden | Why there |
| --- | --- | --- |
| D1 delivery | operator | Muster captures `responseHash` automatically, so an operator that delivered already holds the proof without doing anything |
| D2 conformance | operator | the schema was published at its pinned `contractVersion` before the hire |
| D3 hash | operator | the operator chose the `deliverableRule` and the bytes |
| D4, D5 price and duplication | **Muster** | we hold the `ledger` plus the tx. If we cannot produce them the buyer wins, which is the right incentive on us |
| D6 paid refusal | operator | the refusal is the operator's own structured output |
| D7 arithmetic | whoever contradicts the recompute | the receipt publishes `pinnedBlock` plus `recomputeCommand`, so this is a command rather than an argument |
| D8 session breach | buyer names the transaction, then automatic | the allowlist plus the expiry are on chain and readable at that block. The cap is only readable as a limit, not as an amount already spent, so the over-cap leg carries section 1's caveat |
| D9 listing drift | Muster | we pinned the reviewed `tokenUriHash` and re-check it on a schedule |
| D10 screening | Muster | the verdict is our own record, written at quote and at settlement |

For anything outside D1 to D10 that a buyer still wants heard, the standard is that the output
**contradicts the pinned inputs**, not that the buyer disagrees with it. A buyer who cannot name the
contradiction loses and the payment stands. Publishing that standard in advance is the point: it lets us
hear an open-ended complaint without inventing a verdict.

| Situation | Default | Reason |
| --- | --- | --- |
| No bundle exists | not disputable here | N9. A job we did not broker leaves nothing to decide from, said where a direct hire is offered |
| Operator silent past 72 h | decided on the bundle, against the operator | silence decides against the silent party |
| Buyer silent past the window | payment stands, job settles, no mark on either record | absence of a complaint is not evidence of a fault |
| Our probe says the endpoint was down, the operator produces a signed response for that window | **the signed artifact wins** | a signature outweighs a timeout. The probe is recorded as a false negative against the `prober`'s own accuracy count, which we publish |
| A slot is gone because our retention job deleted the body | the hash decides where a hash suffices, otherwise the point is undecided and the remedy is ours | our schedule, our cost |
| The decidable facts tie | `undecided`. Money stands, the job leaves the settled set for both sides, the remedy is a credit from our own pool | more honest than a coin flip and it keeps the Muster score clean of outcomes nobody established |
| Evidence exists but only the buyer holds it and they will not share | the point fails | we cannot decide on an assertion and DSA Art 10(2)(b) reaches only what is already collected, so we do not go looking |

`undecided` is deliberate and it will be used. A dispute process with no verdict for "we could not tell"
produces a wrong verdict instead and a wrong verdict against an operator poisons the one number this
marketplace rests on.

## 5. Who decides, at hackathon scale and at real scale

### The interface is the transition

```
decide(disputeId, bundleHash) -> { verdict, reasonCode, deciderId, decidedAt, sig }
verdict in { upheldAgainstOperator, partiallyUpheld, dismissed, undecided }
deciderId is a namespaced string
```

Moving from a hackathon-scale decider to a real one is a new value of `deciderId` rather than a rewrite,
because every decision already writes the fields an on-chain validation response needs.

| Tier | `deciderId` | Decides | May execute | Cost |
| --- | --- | --- | --- | --- |
| 0 | `machine:conformance@v1` | D1 to D6, D9, D10 and D8 once the buyer names the transaction | refund, partial refund, re-run, credit, payment block, `visibility` to `suspended`. **Never a delisting** | milliseconds, no human |
| 1 | `operator:concede` | the operator concedes in one click and the remedy fires | the same set | none |
| 2 | `human:duty-reviewer` | the residue Tier 0 cannot decide, mostly D7, plus every delisting confirmation | the full set, including `visibility` to `delisted` | minutes, one named role |
| n/a | `panel:erc8183-optimistic` | every dispute on the escrow rail and it is **not us** | `voteReject`, which refunds the client from the kernel | not ours to spend |

**A machine never delists, on any reason code or any category.** `06-QUALITY.md` publishes delisting as
human-only and names automatic delisting on a detection as a rejected alternative, so the same line holds
here and `automatedMeansUsed` can never read `true` on a delisting. The machine tier's strongest lever is a
payment block plus `visibility: suspended`, which stops new exposure in the same second and is reversible.
The delisting that follows is a human confirmation against the same evidence, including on an upheld D10 and
on every row of section 9's prohibited-use table. That table's Immediate column is the machine's half, so
immediate means the suspension is immediate rather than that a script delists.

Tier 2 is one person acting in a published role against a published rubric per reason code and the public
policy names the role rather than a person. Volume is why that is honest rather than thin. A full re-index
of the whole ERC-8183 kernel on 2026-09-05, over every id up to `jobCounter` 56,713 read at chain timestamp
1788570564 (2026-09-05T01:09:24Z), found 56,713 lifetime jobs of which 28,244 completed, carrying 292.24
`$U` of budget on the completed ones at about 0.0103 `$U` each, across 97 distinct providers of which 28
have any completed job, with one address holding 56,167 of those jobs (`R16-reuse.md` via SPINE). That
counter moves, so it is never quoted bare: it read 56,716 at block 120,153,735 (2026-09-05T17:52:06Z) when
this section was last checked. It gets re-read the day the submission goes out. The market this venue
opens into is small, so a single duty reviewer is the correct size of the answer and a panel would be
theatre.

### On the escrow rail we decide nothing and we say so

`policy.dispute(uint256 jobId)` `0x86d6282c` is client-only inside the window: from the job client it
returns `0x`, from a stranger it reverts `NotClient()` `0x20dbc874`, after the window it reverts
`OutsideDisputeWindow()` `0x4393d7a1` (`R02-erc8183.md`). The button is the buyer's. After it is pressed,
rejection needs `voteReject` from 3 of 5 whitelisted voters (`voteQuorum()` 3, `activeVoterCount()` 5, admin
`0x5057b09A4b510ccaf7e3fb3038Ba60713E62B1fc`), there is no `voteApprove` and silence approves. We cannot
register our own policy either: `setPolicyWhitelist` is owner-only, exactly one policy is whitelisted per
chain and we are not the owner.

Two things follow, both in the product rather than in a footnote. Muster's job on that rail is to hand the
panel a sealed bundle plus a plain-English summary the moment the buyer presses the button, which is the
only useful thing a venue can do there. And **no disputed job has been observed on BSC, so no panel
rejection has been observed.** Rejected jobs do exist. SPINE's constants table records 6 of them against
56,713 lifetime jobs. All six were read directly for this pass: ids 56574, 56607, 56704, 56706, 56708
and 56710, each with `status` 4, `disputed(jobId)` false, `rejectVotes(jobId)` 0 and `submittedAt(jobId)`
0. So each one reached REJECTED through the client path (`Open -> Rejected`) or the evaluator path
(`Funded -> Rejected`), never through `voteReject`. Whether a **disputed** job can actually be rejected by
the panel is therefore **unverified**, the blocker being that there is nothing to observe. A buyer is told
that before relying on it.

### The path to real scale, designed in

**`validator:<address>`, through the ERC-8004 Validation Registry.** It is deployed on BSC at
`0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`, `getVersion()` returns `2.0.0`, `getIdentityRegistry()`
returns the Identity Registry, so it is correctly wired (`R01-erc8004.md`). It has never been used: 0
validation requests across 1,999 sampled agent ids, with 8004scan reporting `total_validations: 0`
platform-wide. The mapping from a decision to a response is exact. The request leg carries a gate that
decides how far the mapping reaches.

```
validationRequest(address validatorAddress, uint256 agentId, string requestURI, bytes32 requestHash)
  0xaaf400c4   AUTHORISED TO THE AGENT OWNER, which is the constraint the rest of this section turns on
  requestHash  = bundleHash      caller-chosen, unique, a reuse reverts "exists"
  requestURI   = the public manifest of the sealed bundle

validationResponse(bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)
  0x3d659a96   response is 0..100 and resp>100 reverts
  response     = 0 upheld against the operator, 100 dismissed, 50 undecided
  tag          = the reason code, D1..D10
  responseURI  = the public decision record, responseHash = keccak256 of it
```

**Who holds the key that opens a request, plus what that costs.** Read live for this pass against the
deployed registry: from a random EOA `validationRequest` reverts `Not authorized`, simulated from
`ownerOf(1)` it returns `0x`. `validationResponse` on a hash with no request behind it reverts
`unknown`. So the response leg cannot exist without a request leg. The request leg belongs to the
agent's owner. On a dispute against a third-party operator that owner **is the losing party**. Asking an
operator to sign the request that opens the public record of its own loss is not a mechanism, it is a
hope, so this document does not describe it as one.

Two paths follow and they are labelled differently on purpose.

**First-party, shipped.** The pair that lands on mainnet by 2026-09-09 runs on one of our own reference
agents, which we own and can therefore open a request for. It is a self-hire, self-disputed and decided by
our own validator address. Every part of that is disclosed rather than presented as a market event:
the job carries `origin: house`, section 8's zero-weight rule applies to it exactly as it applies to any
other self-financed job. The badge reads "validated by Muster's own suite" the way `06-QUALITY.md`
requires. The artifact is that the registry works and that our decision record has an on-chain shape, not
that a third party validated anything.

**Third-party, documented as next.** For a listing we do not own, the request needs the operator's own
consent, collected once at listing rather than begged for per dispute. The shape is a standing grant:
`setApprovalForAll(muster, true)` on the Identity Registry, which is the delegation the registry already
supports for its owner-gated identity calls, `msg.sender == ownerOf(agentId) || isApprovedForAll(owner,
msg.sender) || getApproved(agentId) == msg.sender` (`R01-erc8004.md`). Two honest gaps stop that from
shipping. Whether the **Validation Registry** honours the same `isApprovedForAll` grant is **unverified**:
the owner path and the random-EOA revert were both read on chain, an approved-operator call was not. What
would settle it is one simulated `validationRequest` from an address holding a live
`setApprovalForAll` on a test agent. And a grant collected as an E1 or E2 listing condition is a
governance decision `05-ONBOARDING.md` owns, not one this document can take on its own. Until both are
closed, `validationRequestHash` is populated on first-party rows and null everywhere else. The public
log says which.

`validationResponse` may be called repeatedly by the same validator on the same hash with different `tag`
values, which is how progressive finality is meant to work, so a machine verdict can be followed by a human
verdict on one request without inventing a second key. `getAgentValidations` `0x8d5d0c2d` lists them per
agent. The honest caveat, stated in the product: no third-party validator exists on BSC, so the validator
address we name is ours. That is a first rather than a decentralised panel and it is described as exactly
that.

**`panel:bonded`, next.** Deciders drawn from E4 operators who are not party to the job, bonded in the same
escrow that backs E1, paid from a dispute fee the losing side funds. Not built by 2026-09-09. The blocker is
not engineering, it is section 6: directing an operator's stake to a buyer is the fact pattern the FinCEN
payment-processor exemption does not cover, so the keys have to sit outside our hands before the contract
holds anything.

**`external:odr`, later.** DSA Art 21 out-of-court dispute settlement through a certified body, which
"shall not have the power to impose a binding settlement" (`R13-prior-art.md`). Naming a body we have not
contacted would be a claim we cannot support, so the field exists with an empty value.

## 6. Remedies and who funds each

Six remedies, enumerated in advance rather than invented per case, which is eBay's discipline. Each names
its funder, because a remedy with no named funder is a promise the venue cannot keep and a refund promise
the escrow cannot execute is worse than no promise (`R15-compliance.md`). Suspension and delisting are
listed separately rather than as one lever, because one is machine-executable and reversible and the other
needs a human, which is the same split section 9's outcome enum uses.

| Remedy | x402 rail | Escrow rail | Funded by |
| --- | --- | --- | --- |
| **Refund** | pre-settlement it depends on the sub-rail and the token, broken out below. After settlement the only path is the operator returning the amount from its `payTo` | the panel rejecting the job refunds the client from the kernel. `claimRefund` after `expiredAt` refunds in full and cannot be blocked | the operator or the kernel's own escrow. **Never Muster's account** |
| **Partial refund** | operator-sent against a stated fraction of `amountBase` | **not available.** The kernel has no partial release and no streaming, so a partial outcome resolves the way the verdict table below says | the operator |
| **Re-run** | Muster re-dispatches the same `requestHash` to the same agent once at no new charge, carrying the original idempotency key | a new job at zero budget: `setBudget(jobId, 0)` then `fund(jobId, 0)`, a real escrow at zero, which is what 10 of 62 completed jobs in the R02 sample did | the operator's own compute |
| **Credit** | a waiver against Muster's own fee, defined below, never a balance we pay out | same | **our own pool**, on every credit that ships today |
| **Suspend** | `visibility` moves `live` to `suspended`, machine-executable, reversible, hire path closed | same | nobody. It costs the operator its shelf placement while it holds |
| **Delist** | `visibility` moves `suspended` to `delisted`, **human confirmation only** | same | nobody. It costs the operator its shelf placement for good |

**Killing an x402 authorisation before the facilitator submits it.** There is no single lever, so it is one
row per sub-rail rather than one sentence. Every row was read on chain for this pass.

| Sub-rail | Lever | What it costs the buyer | Established how |
| --- | --- | --- | --- |
| `eip3009` in USD1 | `cancelAuthorization` `0x5a049a70`, one signed message against the token | a signature, no gas if we submit it | `VERIFIED-payment-rail.md` establishes it for USD1. The selector is present in the implementation at `0x694aa534bdef8ed63244eb902e7914e527891f08` |
| `eip3009` in FDUSD | **none** | n/a | negatively verified. The implementation at `0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50` does not carry `0x5a049a70` |
| `eip3009` in `$U` | **none** | n/a | negatively verified. The implementation at `0xbef21313c69c009fd7d9510a8d3a481a32473dfc` does not carry it either |
| `permit2Exact` and `permit2Upto` | `invalidateUnorderedNonces(uint256 wordPos, uint256 mask)` `0x3ff9dcb1` on Permit2, after reading `nonceBitmap(owner, wordPos)` `0x4fe02b44` for the bit | **a transaction and its gas.** This is not a gasless act like the USD1 path | both selectors present in the 9,152-byte Permit2 at `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

`08-MONEY.md` puts USDT on `permit2Exact`, so the sub-rail a BSC buyer is most likely to hold is the one
whose kill lever costs a transaction rather than a signature. Where a row reads none, the remedy on that
sub-rail is operator-return only and the product says so rather than showing a cancel button that cannot
work.

**The credit, defined tightly enough to execute.** A credit is not a refund and Muster never calls it one.
The statement of reasons says which of the two happened, in those words.

| Property | Value |
| --- | --- |
| Denomination | base units of the token the disputed job was priced in, carrying `priceToken` plus `priceDecimals` on the record so it never becomes a float |
| What it does | reduces Muster's own fee on the buyer's next hire, to zero where the credit covers it, remainder carried to the hire after |
| What it never does | pay an operator on the buyer's behalf, move to another address, leave as a stablecoin transfer or sit as a balance we custody |
| Redemption surface | the quote panel at the next hire. The fee line shows the credit applied by id and links the dispute that issued it |
| Expiry | 180 days from `remedyExecutedAt`, printed on the record at issue |
| Cap | per buyer per rolling 30 days at the figure `08-MONEY.md` publishes against the fee take, plus a venue-wide ceiling over the same window |

**Why a waiver rather than a payout.** Redeeming a credit as money against a third-party listing would mean
Muster funding a payment to that operator on the buyer's instruction, which puts us inside the settlement
flow the FinCEN forum position assumes we are outside. `R15-compliance.md` carries no clause on
venue-issued credits or prepaid balances that would cover it. A waiver against our own fee is a discount on
a service we sold, applied inside a settlement the buyer's own signature still funds, so no value is
accepted from one party in order to pass it to another. That is also why the constraint at the top of this
document reads "never holds a counterparty's value" rather than "never holds value". A waiver is a
liability we owe. It is not a float we hold.

**The re-run is evidence as well as a remedy.** Sending the original idempotency key means a compliant agent
returns the stored result of the first attempt, per the `Idempotency-Key` draft's rule that a repeat after
completion returns the original (`R12-agent-comms.md`). An agent returning the same failing output has
confirmed the failure. An agent returning something different on the same key has failed idempotency, which
is itself a conformance failure. Either way the re-run produces a fact. R12 also records the code conflict:
the draft returns 422 for a key reused with a different payload while x402's `payment-identifier` extension
returns 409, so we accept both inbound and emit the draft's codes outbound.

**The operator bond does not ship by 2026-09-09 and the reason is the money-transmitter line.** E1 in the
SPINE ladder is a refundable stake in Muster's own escrow. A bond we direct to a buyer on our own decision is
value accepted from one party in order to pass it to another, which is the shape FinCEN's guidance puts
inside the definition rather than outside it and the payment-processor exemption fails for crypto rails
because condition (b) requires "clearance and settlement systems that admit only BSA-regulated financial
institutions" (`R15-compliance.md`). So `OperatorBond` is specified with a decision-keyed release plus
keys we do not hold, then documented as next with no deployment on any chain. What ships instead is
operator-funded refunds, operator-funded
re-runs, credits from our own pool, suspension, human-confirmed delisting and the escrow rail's own refund
path. Our own money forgone on our own fee is not transmission, which is exactly why the pool is the
shipped remedy.

**So the credit is funded from our own pool even where the operator lost, until the bond exists.** The
`funder` field reads `muster` on every credit issued today, including the ones a bond would eventually
cover. Splitting the funder between our pool and a bond that does not exist would leave the shipped
fallback, a credit where the operator will not return the money inside 72 h, with no funder at all, which is
the exact defect this section opens by forbidding. The exposure is bounded and the bound is published: the
per-buyer cap above, plus a venue-wide ceiling per rolling 30 days that acts as a kill switch rather than a
promise. At the ceiling, issuance stops, the verdict still lands, the statement of reasons says the credit
is queued behind the ceiling and the buyer keeps the appeal. Naming the bound beats implying an unbounded
pool.

**When a bond is forfeit, settled here because `08-MONEY.md` waits on this document for it.** The trigger is
narrow on purpose: a dispute upheld against the operator at Tier 1 or Tier 2 where the remedy is a refund
and the operator has not sent it within 72 h of the decision. The fraction is the job's `priceBase` in full
and nothing punitive on top, capped at the bond balance, with any shortfall covered as a credit from our own
pool. A second forfeit inside 90 days drops the listing one evidence tier, so E1 returns to E0. Never on
`dismissed`, never on `undecided`, never on a Tier 0 machine verdict with no human confirmation, because
a machine that can move an operator's stake is a machine with the power to fine.

**The fee follows the remedy.** Where Muster took a fee it is refunded on any upheld dispute and it is taken
as a split inside the same settlement rather than as a cut of funds that landed with us first. `08-MONEY.md`
owns the number. On the escrow rail read `platformFeeBP()` `0xff96092a` rather than assuming: it is 0 today
with `MAX_PLATFORM_FEE_BP` 1000 and the owner can change it on an upgradeable proxy (`R02-erc8183.md`).

| Verdict | Default remedy |
| --- | --- |
| upheld, nothing delivered (D1, D6) | refund, then credit from our own pool where the operator does not return it inside 72 h |
| upheld, delivered but non-conforming (D2, D3) | re-run once, then refund if the re-run fails the same assertion |
| upheld, overcharge or duplicate (D4, D5) | refund of the difference, immediate, ours to pay where the defect was ours |
| upheld, arithmetic (D7) | re-run plus refund and the missing assertion added to the `conformance` suite |
| upheld, session breach (D8) | refund, listing suspended, revoke surfaced to every buyer holding a session against that agent |
| upheld, listing drift (D9) | refund, listing back to review as a new listing |
| upheld, screening (D10) | payment block going forward, listing suspended by the machine, delisting queued for a human confirmation, the verdict recorded against our own controls |
| **`partiallyUpheld`** | on the x402 rail, an operator-sent partial refund against the stated fraction. On the escrow rail the kernel has no partial release, so the buyer picks one of two named outcomes: either a full reject plus a re-hire at the lower price or keeping the delivery and taking a credit for the contested fraction from our own pool. The choice is the buyer's and the record stores which they took |
| dismissed | nothing moves. The dismissal is on the public record with its reason |
| undecided | credit from our own pool, the job excluded from the settled set for both sides |

**There is no `refundIntent` record and there does not need to be one.** `07-MATCHING.md` hands this
document a settled leg that then failed conformance under that name, twice, once as a failover rule and once
as a decision. The remedy vocabulary here has no such object, SPINE does not carry it and `15-SYSTEM.md`
adds no collection for it, so the handoff is a `dispute` row like any other: `raisedBy: muster`, `reasonCode`
D1 or D3 as the failure dictates, state `prevented` where Tier 0 decided it on the spot, remedy `refund`.
`07-MATCHING.md` should be corrected to that name rather than this document inventing a second record to
receive it.

## 7. The public record: on chain, off chain

### Three on-chain writes

**1. ERC-8004 feedback, written by the buyer from the buyer's own address.**

```
giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2,
             string endpoint, string feedbackURI, bytes32 feedbackHash)      0x3c036a7e
  value        the outcome, 0 or 100, at valueDecimals 0
  tag1         settled | refused | disputed-upheld | disputed-dismissed
  tag2         the category slug: rebalancing | grid | yield | health-factor
  feedbackURI  the public manifest of the sealed bundle
  feedbackHash bundleHash
```

Muster never writes it for a buyer and holds no key that could. `valueDecimals` is 0 because all 388 rows
surveyed in `R01-erc8004.md` used 0 and mixing decimals turns `getSummary`'s modal-decimals rescaling into a
trap for every reader. Self-feedback reverts `Self-feedback not allowed`, an anti-self-dealing guard we get
from the registry rather than build.

**2. `appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string responseURI,
bytes32 responseHash)` `0xc2349ab2`, the operator's right of reply.** It is callable by anyone and an empty
URI reverts `Empty URI` (`R01-erc8004.md`), so Muster shows a response as the operator's only after checking
the responder against `ownerOf(agentId)` or `isApprovedForAll`. Everything rendered from `responseURI` is
agent-supplied text bound for a buyer's browser, so it is sanitised server-side first. This is why a bad
review needs no deleting: the reply sits on the same permanent surface as the review.

**3. The Validation Registry, on first-party listings only.** Section 5 has the mapping and the reason for the
limit: `validationRequest` is authorised to the agent owner, so the on-chain trail exists where we own the
agent and nowhere else until an operator grants us standing consent. It is the only one of the three writes
that carries a decision rather than an opinion, it is unused on BSC today. The public log marks which
rows have it rather than implying every dispute gets one.

| Stays off chain | Reason |
| --- | --- |
| the request and response bodies | user content, unbounded, may carry a third party's personal data. EDPB Rec 2 para 109 plus Rec 11 para 120 |
| the notifier's name and email on an abuse notice | DSA Art 16(2)(c) requires collecting it. A chain cannot forget it |
| the `screening` verdict | a determination about an address, kept 5 years for OFAC recordkeeping. Publishing it permanently is a harm with no upside |
| the full statement of reasons | its facts field describes conduct. A redacted public version is published, keyed by its id |
| any personal data at all | Rec 10 para 118: by default personal data is not made accessible on a public blockchain without the data subject's intervention |

Erasure is honest about the split. Off-chain data is deleted on request. On-chain data cannot be and the
privacy notice plus the takedown policy say that in the same words, which is the EDPB para 103 position that
actual on-chain deletion "might be technically impracticable".

### The public dispute log

One page, one row per resolved dispute, no login. Each row: the dispute id, the category, the reason code,
the decider id, the verdict, the remedy, the funder, the clock actually taken at each step, whether automated
means contributed. Aggregates on the same page: total raised, upheld rate, dismissed rate, undecided rate,
median time to decision, each broken out per category.

Those aggregates are the four numbers P2B Art 11(4) asks a marketplace to publish and verify at least
annually, "the total number of complaints lodged, the main types of complaints, the average time period needed
to process the complaints and aggregated information regarding the outcome". Art 11(5) exempts small
enterprises, so it is not an obligation on an entrant, which makes it the cheapest credible
marketplace-quality artifact available. The incumbent in the TermiX partner track publishes no terms at all:
`/terms`, `/legal/terms` plus `/privacy` all return 404 and neither the home page nor the 1.5.0 skill
documentation carries a risk warning (`R15-compliance.md`). Clearing that bar costs a page.

### The surface we publish onto

The reputation registry's dominant live use on BSC is spam rather than rating. All of the figures below come
from one sweep of every id, read at block 120,027,164 (2026-09-05T02:02:32Z) with the id range pinned to
`_lastId - 1` at block 120,025,020. None of them is quoted without that read. 4,406 agents of 334,935
have any feedback at all, which is 1.32%. 29,712 feedbacks exist, 0 revoked. 111 distinct feedback authors
exist on the whole chain. Of 950 rows sampled from the 8004scan slice on 2026-09-05, 844 tag a persona
trait, 68 tag uptime or response time, **0 tag a financial outcome** (MEASUREMENT via SPINE). In the narrower
R01 survey, 265 of 388 entries came from one address whose tag pair is a Telegram advertisement. The
population counter moves by roughly 2,110 a day, so every one of these gets re-read the day the submission
goes out rather than carried forward.

So a dispute record bound to a settled paid job, with `bundleHash` in `feedbackHash` and a category in
`tag2`, is not a marginal improvement on that surface. It is the first financial-outcome signal on it.
`06-QUALITY.md` owns how the score consumes it. This document makes sure the thing being written is
decidable.

## 8. Abuse of the dispute system, in both directions

A report button with no misuse rule becomes a weapon between rival listings. DSA Art 23 makes the answer
symmetric: 23(1) suspends users who "frequently provide manifestly illegal content", 23(2) suspends notifiers
plus complainants who "frequently submit notices or complaints that are manifestly unfounded", both after a
prior warning. 23(3) fixes the four factors that make a suspension reviewable: the absolute number in a
window, that number as a proportion of the total, the gravity of the misuse including its consequences, then
the intention where it can be identified. 23(4) requires the policy published "in a clear and detailed
manner" with examples plus the suspension duration, so the tables below are written to be published
(`R13-prior-art.md`, which carries all four factors verbatim). DMCA 512(f) adds the same symmetry from the
other tradition: knowing material misrepresentation is actionable whichever side makes it (same file).

| Buyer-side pattern | Detection | Consequence |
| --- | --- | --- |
| Dispute farming: raise, take the re-run, keep both outputs | disputes raised over jobs paid, rolling 30 days, per buyer, against the category rate. Above 3x the category rate with a dismissal rate over 50% | warning, then the automatic remedy is withdrawn. Disputes are still heard and still decided |
| Consume then dispute | the delivery fetch is timestamped separately, so a D1 claim filed after the deliverable was fetched contradicts our own log | the D1 point fails on our record rather than on judgement |
| Extortion: a threatened dispute or review to obtain compensation | reported by the operator, decided on the message | dispute rights suspended for a stated duration, the feedback dropped from the score and left readable |
| Sybil disputing to sink a rival | funding-cluster test, one hop: `funder(buyer) == provider` or `funder(buyer) == funder(provider)`, published habitual threshold above 25 events (`R13-prior-art.md`). One cluster counts as one actor | the cluster's disputes carry zero weight and are recorded rather than deleted |
| Racing the clock: dispute every escrow job to hold every escrow for its full window | disputes per client on `escrowJobId` jobs against their completion rate | nothing on chain, because the button is theirs. It shows in that buyer's public record and we stop brokering to them |

The rate gate touches the **remedy**, never the right to be heard. DSA Art 20 requires the channel to stay
open and R15's asymmetric-handling rule says only a direct hit blocks while anything softer flags for
review. A buyer who loses the automatic credit still gets a decision and still gets an appeal.

| Operator-side pattern | Detection | Consequence |
| --- | --- | --- |
| Shedding the record by re-registering a fresh `agentId` | the record binds to the operator identity from `ownerOf` plus `isApprovedForAll` rather than to the agent id and the evidence tier travels with the operator | the new listing starts at the operator's existing tier, not at E0 with a clean sheet |
| Silent capability change after review | `tokenUriHash` pinned at review, re-checked on the `prober`'s schedule. `setAgentURI`, `setMetadata` plus `setAgentWallet` are owner-callable at any time | drift suspends the listing and decides an open D9 point against the operator |
| Empty responses to consume the submission slot | a response must name the contested assertion and attach an artifact | the window closes as if silent |
| Withholding the deliverable until positive feedback lands | delivery and feedback are separately timestamped, so the ordering is visible across jobs | listing suspended, the pattern named in the statement of reasons |
| Flooding the notice channel against a rival listing | the same Art 23 rate gate applied to notices | notice submission suspended for a stated duration, existing notices still processed |
| Retaliating through `appendResponse` with abusive text | callable by anyone, `responseURI` is free text | we display a reply only from the verified operator, we sanitise before render, we cannot remove it from chain |
| Self-hiring to manufacture a clean dispute history | the same funding-cluster test and the R02 finding that one rival's provider address equals its client address on every sampled job | those jobs carry zero weight and the listing shows its distinct-payer count |

The last row is observed rather than hypothetical: `R02-erc8183.md` found a rival whose provider address
equals its client address on every job sampled, which reads as a smoke test rather than a market. So
"settled jobs with a distinct payer outside the payer's funding cluster" is the only job count Muster shows
next to a dispute record, with the rule published beside the number. Excluded rows are recorded rather than
deleted, because 16 CFR 465.7(b) permits withholding only on criteria "applied equally to all reviews
submitted without regard to sentiment", so a published sentiment-blind filter survives scrutiny while a quiet
deletion does not (`R13-prior-art.md`).

## 9. Compliance

`10-DOCS-AND-POLICY.md` publishes these as documents. This section decides the mechanism, the numbers and the
storage.

### Wallet-level sanctions screening

**Four subjects, seven chain reads, one `eth_call`.** The screen runs on the quote path then again at
settlement, so a hire costs two `eth_call`s in total plus four in-memory lookups.

| Check | Call | Per what | Where |
| --- | --- | --- | --- |
| Oracle | `isSanctioned(address)` `0xdf592f7d`, about 3,694 gas over base | **per subject**, so four reads | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` |
| Our own list | membership in the SDN EVM set, chain tag ignored, 91 addresses on 2026-09-05 | **per subject**, four lookups, no chain call | local, with `listFetchedAt` plus the list sha256 stored on the verdict |
| Token freeze | `frozen(address)` `0xd0516650` | **per address the transfer touches**, so the payer and the payee, two reads | FDUSD, USD1 and `$U` all expose it, BSC-USD does not, so the call is guarded |
| Token pause | `paused()` `0x5c975abb` | **per settlement token**, one read | same |

**The four subjects** are the buyer, the **operator** from `ownerOf(agentId)`, the listing's `payTo` and the
agent's registered wallet from `getAgentWallet` `0x00339509`. The operator is on the list because it is the
one subject that survives a `setAgentWallet` change. It is also there because `05-ONBOARDING.md`,
`06-QUALITY.md` and `15-SYSTEM.md` all publish a consequence for an operator hit: 05 suspends on a hit
against the operator, the payee or the agent wallet, 06 suspends and blocks payment on a hit against the
operator or the payee. 15's `screening` collection declares `role` with `buyer`, `operator`, `payee` and
`agentWallet`. A mechanism that never produced an operator verdict would leave three siblings publishing a
consequence for a verdict that cannot exist. The payee stays a separate subject because it can be set
independently of the owner through `setAgentWallet`.

**Seven reads, batched, so the cost really is one call.** Four `isSanctioned` plus two `frozen` plus one
`paused` go into a single Multicall3 `aggregate3` at
`0xcA11bde05977b3631167028862bE2a173976CA11`, whose ceiling is 1,500 sub-calls in one `eth_call` (SPINE).
That exact batch was run for this pass, seven sub-calls in one `eth_call`, all seven returning success. So
the honest arithmetic is seven reads, one round trip, twice per hire. Never "four calls" as an earlier
draft of this section had it.

**One source is provably not enough.** `R15-compliance.md` pulled today's SDN list, extracted the 91 distinct
EVM-format addresses and screened all 91 on BSC: the oracle flags **57**, **42 of the 91 are active on BSC**
and **20 of those 42 are not flagged**. Exactly one SDN entry carries a `BNB` tag and it is a Beacon Chain
bech32 address no EVM screen will ever match, which is why the chain tag is ignored and every 0x-format
address in the list is taken whatever OFAC tagged it.

**Handling is asymmetric**, which is what stops the screen becoming an attack surface. A hit on the direct
counterparty of the payment being quoted is a hard block, logged, with a plain reason shown. Anything softer,
graph proximity, an issuer freeze on an unrelated address, a partial match, is a flag for human review and
never an automatic action. The reason is inbound taint: anyone can send 1 wei to a thousand addresses, so a
rule flagging any address with a sanctioned counterparty in its history lets the attacker choose who gets
frozen. The oracle does track delistings, both former Tornado Cash addresses now return false, so a local
list records its fetch date and a cache older than 24 h refuses to serve rather than serving quietly on stale
data.

The verdict record is the R15 shape, `kind` `screening_verdict`, carrying the block, the subject plus its
role, every check with its call and result, the outcome, the reason, `listFetchedAt`, `listSha256`, `setSize`
plus a five-year `retainUntil`. Without the list version a verdict cannot be re-derived and OFAC
recordkeeping expects a record that still means something in five years.

### Prohibited use mapped to consequences, because Art 17 needs one

`10-DOCS-AND-POLICY.md` publishes the list. Every category maps to values from a closed enum before go-live,
because a statement of reasons cannot be written against a category with no defined outcome and a generator
keyed on an enum cannot emit a sentence. **Five outcomes and only five.** `suspended` is one of them
because SPINE's `visibility` already carries it and four values could not express what these rows actually do:

| `outcome` | What it does | Who may fire it |
| --- | --- | --- |
| `note` | a labelled fact on the listing, nothing else changes | machine |
| `suppress` | off the default shelf sort and the exploration slot, still findable by search and by direct link, reason shown | machine |
| `paymentBlock` | no new quote settles for that listing, ours to fire and ours alone | machine |
| `suspend` | `visibility: suspended`, hire path closed, the listing page still resolves and states why | machine |
| `delist` | `visibility: delisted`, out of search, receipts stay published with the notice attached | **human confirmation only** |

Two things are named as side effects rather than outcomes, because they are levers other documents own:
`weightZero` belongs to `06-QUALITY.md`'s score and `revokeSurfaced` is section 11 step 5. A cell holds enum
values and nothing else.

| Category | Immediate | On repeat | Side effect |
| --- | --- | --- | --- |
| Asking a buyer for a key, a seed phrase or an unbounded approval | `suspend` `paymentBlock` | `delist` | |
| Sanctions evasion, including offering address rotation to defeat a screen | `paymentBlock` `suspend` | `delist` | |
| Exceeding the granted authority: a call outside the allowlist, a spend over the cap, a transaction after expiry | `suspend` | `delist` | `revokeSurfaced` |
| An adversarial payload aimed at another agent, injection carried in a deliverable or an agent card | `suspend` | `delist` | |
| Impersonating a protocol, a brand or a person | `suspend` | `delist` | |
| Silent capability change after review | `suspend` | `delist` | |
| Undisclosed subcontracting to a screened party | `paymentBlock` `suspend` | `delist` | |
| Unbounded or hidden pricing, a quote that can rise after acceptance | `suspend` | `delist` | |
| Personalised investment advice in an agent output | `suppress` | `suspend` then `delist` | |
| Reputation manipulation: wash jobs, sybil feedback, paid reviews presented as organic | `suppress` | `suspend` then `delist` | `weightZero` |
| Extraction against our own users: sandwiching or back-running the intents this venue generates | `suspend` | `delist` | |
| Illegal content, illegal goods, CSAM | `suspend` `paymentBlock` | `delist` | |
| A disclosure gap with no money effect: a rate served without its window, an aggregate served without its source | `note` | `suppress` | |

**Every `delist` cell in that table is a human confirmation.** The Immediate column is the machine's half of
the answer: it lands in the same second on a detection, it stops new exposure and it is reversible. The On
repeat column is the human's, taken against the same evidence, at the top of the queue on the first two rows
and on illegal content. That is the line `06-QUALITY.md` publishes three times. Holding it here is what keeps
`automatedMeansUsed` from ever reading `true` on a delisting. The CSAM row also accepts a report anonymously,
which the takedown path below implements rather than promises.

### The takedown path

Three intake routes, one store.

1. **The public notice form**, the DSA Art 16 route, enabling the four fields the statute requires: a
   sufficiently substantiated explanation of why the content is illegal, the exact electronic location, the
   notifier's name plus email, then a statement of bona fide belief. Art 16(2)(c) carves the contact
   requirement out for the child sexual abuse offences, so the category selector drops the contact fields on
   that branch instead of making an anonymous report impossible.
2. **The in-product report**, one click from a listing and from a job, pre-filling the exact location with
   `agentId`, `jobId` plus the deliverable hash so field (b) is satisfied with nothing typed.
3. **One published contact point for authorities** with a declared language, which is the whole of the DSA
   Art 11 obligation at our scale.

A qualifying notice creates actual knowledge under Art 16(3) where it lets a diligent provider identify the
illegality "without a detailed legal examination". So the notice queue is a liability clock and is monitored
like one rather than like a support inbox. Published targets: automated acknowledgement immediately, 72 h to
decide an ordinary notice, 24 h where funds are actively at risk, immediate suspension for CSAM. Where a
classifier contributed to triage the notification says so, which is the Art 16(6) automated-processing
disclosure and costs one boolean.

Every enforcement action emits a statement of reasons, generated from the action rather than written by hand,
because a hand-written one will not exist when a script acts at 3am. It carries the action, whether it
restricts monetary payments, the territorial scope, the duration, the facts relied on, the policy category,
whether automated means were used, the redress route with its six-month window, then `onChainEffect`, which
reads `none` on every registry-related action because that is the truth.

### Law-enforcement and authority requests

Validate the elements before acting, because acting on an invalid order is a decision we made rather than one
we were compelled to make. DSA Art 9(2) requires an order to carry its legal basis, a statement of reasons
citing specific provisions, the issuing authority, information sufficient to identify and locate the content
such as an exact URL, redress information, then a territorial scope "limited to what is strictly necessary"
(`R15-compliance.md`, which carries Art 9(2)(a) and Art 10(2)(b) verbatim). Art 9(5) requires informing the
affected user at the latest when effect is given. On receipt we inform the issuing authority of any effect
given "without undue delay, specifying if and when effect was given".

Art 10(2)(b) is the shield worth quoting in the policy: an information order "only requires the provider to
provide information already collected for the purposes of providing the service and which lies within its
control" (same file). We cannot be ordered to start collecting.

For US requests, 18 USC 2703(c)(2) reaches basic subscriber information: name, address, session times and
durations, length and type of service, subscriber number or identity including any temporarily assigned
network address, then means and source of payment (`R15-compliance.md`, read from Cornell LII). Because wallet
signature is the only account mechanism on Muster, the honest answer to most subpoenas is a short letter naming
which of those categories we hold, which is a wallet address plus session timestamps and nothing else. No name,
no address, no email, no payment instrument. Preservation under 2703(f) is 90 days, extendable once for a
further 90 days on a renewed request, then release. Over-broad scope is refused citing Art 9(2)(b) or
2703(d)'s undue-burden clause rather than complied with quietly. The affected user is notified by default,
with the exception documented where a valid non-disclosure requirement applies.

### What is logged and for how long

| Record | Retention | Source of the clock |
| --- | --- | --- |
| `screening` verdict with its list version plus fetch date | **5 years** | OFAC: records kept five years after the transaction or after blocked property is unblocked |
| Consent and acknowledgement records taken at hire | 5 years or the contract limitation period if longer | it is the evidence the withdrawal-right exemption rests on |
| Dispute records, decisions, statements of reasons, notices | 2 years, complaint channel open 6 months from the decision | DSA Art 20(1) sets the six-month floor. Two years is ours, to show Art 16(6) processing stayed timely and non-arbitrary |
| `bundleHash`, ids, amounts, tokens, decimals, timestamps, tx hashes | as long as the index exists | already public on chain, so deleting our copy achieves nothing |
| Job briefs and deliverable bodies | deleted at window close plus a short grace | user content, unbounded. The hash is what settlement needs |
| Server logs carrying IP addresses | 30 days, **never joined to a wallet address** | either is defensible alone. Joined, they are the identification link the EDPB test turns on |
| Anything else | it should not exist | the field policy is deny by default, enforced in the types |

Retention is implemented rather than documented. EDPB Recommendation 11 asks for a technical solution that
guarantees the period, so it is a scheduled deletion job with a test asserting the rows are gone.

The blocked-property clocks exist in the design even though an entrant will not file them: OFAC expects a
blocked-property report within 10 business days of the block, an annual report on holdings as of 30 June due
no later than 30 September, then a rejected-transaction report within 10 business days. What the product owes
is the ability to **produce the record that would let someone file**, which is what the five-year screening
log is for.

## 10. The financial-advice posture

All four mandated categories are an agent telling a buyer something about their money, so this decides what an
agent is allowed to output.

**The line is personalisation rather than subject matter.** MiCA Art 3(1)(24) defines advice as "personalised
recommendations to a client" and the tail matters: it covers recommendations about "the use of crypto-asset
services" rather than only about assets, so a venue telling one buyer which agent to hire sized to their
position is inside the definition on its face. Art 3(1)(16)(h) makes providing advice one of ten licensable
services and MiCA has applied since 30 December 2024. MiFID II's delegated regulation 2017/565 Art 9 reaches
the same place: a recommendation is personal when made to someone "in his capacity as an investor or potential
investor" and either "presented as suitable for that person" or "based on a consideration of the circumstances
of that person", while recital 14 gives the safe side, "Advice about financial instruments addressed to the
general public should not be considered as a personal recommendation" (`R15-compliance.md`).

Every agent output on Muster is exactly one of four shapes, declared in the listing and asserted per shape by
the `conformance` suite. An output that is none of the four fails the hireable bar and never reaches a shelf.

| Shape | What it is | Example from the four categories |
| --- | --- | --- |
| **Measurement** | a fact about the world with a block, a timestamp and a source | a pool's realised 30-day APY read from the pool's own contract at block N |
| **Comparison on stated criteria** | generic, addressed to everyone who loads the page, criteria plus weights published | health factors across Venus, Lista and Aave positions, each protocol's own call named |
| **User-parameterised simulation** | the buyer chose the inputs, the agent computed the consequence | 10,000 units at a 20% band would have executed 14 rebalances and paid 0.31% in fees over the period |
| **Mechanical execution of a user-set rule** | the judgement was the buyer's, taken before the trigger. The agent does arithmetic and timing | the grid bound was crossed, here is the transaction that restores it, sign or cancel |

**The per-shape assertion, named the way section 1 names its per-category ones.** "Asserted by the conformance
suite" is not a check a builder can write. Separating a measurement from a personalised recommendation is
not something a sentence settles. So each shape carries a declared value in the listing plus required fields
its `outputSchema` must contain. The assertion is the declared shape against the schema's shape plus the
presence of every required field in the live response:

| Declared shape | The schema must carry | The assertion that fails |
| --- | --- | --- |
| `measurement` | a block number and a named source per figure | any figure with no `block` or no `source` sibling |
| `comparison` | the criteria list plus the weight per criterion, published before the hire | a ranked output whose criteria or weights are absent from the schema |
| `simulation` | the buyer's inputs echoed back, field for field | an output that changes with an input the response does not echo |
| `execution` | the buyer's rule plus the trigger condition that fired, both stored before the trigger | a transaction proposed with no stored rule or no trigger record |

Shape 4 is what makes rebalancing, grid trading and health-factor agents work without becoming either advice
or discretionary portfolio management. The buyer sets the rule, the rule is visible, the agent applies it, the
buyer can revoke. No discretion means no discretionary management, which is the MiCA Art 3(1)(25) definition
being stayed out of, "managing portfolios in accordance with mandates given by clients on a discretionary
client-by-client basis". No target chosen by the agent means no personalised recommendation.

**Muster says:** the venue takes a stated fee, the fee does not change the ranking, the criteria are
published, none of this is advice, every number carries its block and its source, the downside sits in the
same view as the upside at the same visual weight.

**Muster never says:** that anything is suitable, guaranteed, safe, capital protected, risk-free or a stable
return. That an agent is right for you. That its advice is independent, because we take a fee from the sell
side and MiCA Art 81(3)(b) bars an adviser claiming independence from retaining "fees, commissions or any
monetary or non-monetary benefits paid or provided by any third party". Claiming independence while taking a
fee turns a disclosure problem into a misrepresentation, so we make no independence claim at all.

**The banned strings are checked on the delivery path, not in CI, because CI never sees an agent's runtime
response.** The list is `suitable`, `guaranteed`, `safe`, `capital protected`, `risk-free`, `stable returns`
and `you should`. Two mechanisms, deliberately separated:

- **Our own copy** is greped in CI. That is the right place for text we wrote and it fails the build.
- **A live deliverable** is screened by the same list in the render path, before anything reaches a browser,
  and a hit has a named consequence rather than a log line: the render is refused for that field, the job is
  marked with the matched string on its receipt, a prohibited-use finding opens against the listing under the
  personalised-advice row of section 9's table, so the immediate outcome is `suppress` and the escalation on
  repeat is `suspend` then a human-confirmed `delist`. The buyer sees the rest of the deliverable plus a plain
  statement of what was withheld and why.

A CI grep over agent output would report green while live output went unchecked, which is worse than no check
because it produces a false assurance. A forward-looking APY without the fact that it floats fails the same
delivery-path screen. A health factor rendered without the liquidation consequence beside it fails a
`conformance` assertion rather than a string match.

**Placement, which the FCA has already drafted.** COBS 4.12A.11R(1)(d) prescribes the exact sentence pair and
it is the only risk warning in this space a regulator has drafted and tested (`R15-compliance.md`, read from
the FCA handbook capture, which carries this rule plus the four below it):

> Don't invest unless you're prepared to lose all the money you invest.

> This is a high-risk investment and you should not expect to be protected if something goes wrong.

COBS 4.12A.36R requires it prominent, legible, bordered and on websites or apps "statically fixed and visible
at the top of the screen". COBS 4.12A.38R and 4.12A.42R ban any "design feature which has the intent or
effect of reducing the visibility or prominence" of it, naming small fonts, faded text, low contrast and
burial at the foot of the page. So it sits fixed at the top of every view showing a rate, a return, a
projection or a health factor. Not a footer. Not a modal that dismisses forever.

Two more FCA rules are copied for their conduct rather than their jurisdiction. COBS 4.12A.7R bars a promotion
offering "any monetary or non-monetary incentive", with guidance 4.12A.8G naming referral bonuses, so there is
no referral bonus on a hire. COBS 4.12A.18R's cooling-off period is not copied as a delay, but its structure
is: the first time a buyer grants an agent authority over their funds, continue and stop are "presented with
equal prominence" rather than one bright button beside one grey link.

A disclaimer does not change what a thing is. If an output is a personalised recommendation, a line underneath
saying otherwise does not make it generic. The four shapes are the strategy and the banner is the last layer.

**Why this belongs here.** The advice posture is what keeps the disputable list short and decidable. Muster
promises measurement, comparison, simulation and rule execution, so "the market moved" cannot be a dispute
while "the arithmetic contradicts the pinned inputs" can. A venue promising outcomes would owe a dispute
process for every outcome and no evidence bundle can decide those.

## 11. The incident runbook: the first hour when an agent starts losing buyers money

### Triggers, because a runbook with no trigger never fires

Any one of these opens an incident automatically:

- a listing's rolling one-hour failure rate crosses 20% over at least 5 dispatches
- two disputes upheld against one listing inside 24 h
- any D8 session breach: a call outside the allowlist, a spend over the cap, a transaction after expiry
- `tokenUriHash` drift on a live listing
- a `screening` hit on any of the four subjects in section 9 for a live listing
- `frozen()` true or `paused()` true on a settlement token in use
- a `conformance` assertion that passed at review now failing on a live dispatch
- the EIP-1967 implementation address moving on any watched proxy
- a watched constant changing value

**The slot sweep, which is one storage read per address.** The watch list is the three ERC-8004 registries,
the three settlement tokens FDUSD, USD1 and `$U`, then the ERC-8183 kernel at
`0xEa4DAa3100A767e86FDed867729ae7446476EBA6` and the router at
`0x51895229E12F9876011789B04f8698af06cCD6DA`. Every one of those was read for this pass and every one is a
live EIP-1967 proxy: the kernel points at `0xd5f9b570c96b5d67702d508c0bfb8b3b09209787`, the router at
`0xf0cf8f47e5c035f16247ff16e9f367e477ee5007`, `$U` at `0xbef21313c69c009fd7d9510a8d3a481a32473dfc`. Both the
Identity and Reputation registries can be replaced by a 3-of-5 Safe at
`0xF223968Dd0c66472E31043acAcCcF5D1464D644b` and the Validation Registry by a single EOA at
`0x8888d0A88ef8302dfa4BA53c41c2fE3c4E486f42` (`R01-erc8004.md`), while FDUSD, USD1 and `$U` are proxies with
live admin slots whose owners we have not resolved (`R04-bsc-tokens.md` records the admin addresses, SPINE
keeps all three on the unverified list). An upgrade could change the meaning of every agent record on screen
or remove EIP-3009 from under a quoted price, so watching the slot turns an unmanaged dependency into a
monitored one.

**The value sweep, for parameters that move without an upgrade.** The OptimisticPolicy at
`0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5` is **not** a 1967 proxy, read for this pass: the implementation
slot is zero and it holds 4,413 bytes of its own runtime code. So it cannot be watched by slot and its
constants are read by value instead, along with the kernel's fee:

| Read | Value today | Why it is watched |
| --- | --- | --- |
| `platformFeeBP()` `0xff96092a` on the kernel | 0 | the fee on every escrow hire, with `MAX_PLATFORM_FEE_BP` 1000 and an owner who can raise it on an upgradeable proxy. A silent move reprices every quote |
| `disputeWindow()` on the policy | 604,800 s | step 4's whole clock is anchored to it |
| `voteQuorum()` and `activeVoterCount()` on the policy | 3 and 5 | the panel a buyer is told about. A quorum change changes who can reject |
| `paymentToken()` `0x3013ce29` on the kernel | `0xcE24439F2D9C6a2289F741120FE202248B666666` | the token every escrow budget sits in |

### The hour

One principle orders it: **the first action stops new exposure and never touches anybody's money.**

**T+0 to T+5, stop the bleeding. Every step reversible, every step ours.**

1. `visibility` moves to `suspended`. The listing leaves every shelf and leaves the `matcher`'s eligibility
   set on the next request. It is not deleted: the listing page still resolves and states that it is suspended
   with the reason, because a listing that vanishes tells a buyer mid-job nothing.
2. Freeze the quote path for that listing. No new `quote` rows, so no new signed price can be accepted and no
   new payment challenge answered.
3. New intents in that category route to the next eligible agent through the existing failover, which records
   what the buyer paid and what the failed agent's record shows (`07-MATCHING.md`).

**T+5 to T+15, bound what is already in flight.**

4. Enumerate exposure: our own `job` rows in non-terminal states for that listing, `getJob(escrowJobId)`
   `0xbf22c457` for every `escrowJobId` on the escrow rail, then every `session` whose `agentId` is the
   affected agent and whose `expiry` has not passed.
5. For each buyer holding a live session against that agent, surface revoke in the `session-panel` and tell
   them. **We do not revoke for them**, because the session is theirs and `revokeSession` needs the wallet's
   admin signer. Where the agent is ours we revoke ours immediately: one atomic intent carrying
   `revokeKey(user, keyId)` `0x3cf26a01` on the Keystore plus `revoke(keyHash)` `0xb75c7dc6` on the account,
   after which `isValidKey` `0x8fd4f06b` is false from the next block and the key drops out of `getKeys`
   `0x34e80c34`. Revocation cannot be undone, so restoring that agent later needs a fresh keypair, which is
   the correct cost (`R06-altana.md`).
6. Kill any x402 authorisation the facilitator has not yet submitted, branching on the sub-rail as well as on
   the token, per the table in section 6. On `eip3009` in USD1 the buyer gets a `cancelAuthorization`
   `0x5a049a70` button. On `eip3009` in FDUSD or `$U` there is no such button, because the selector is absent
   from both implementations, so the panel says the only remaining path is the operator returning the money.
   On `permit2Exact` or `permit2Upto` the lever is `invalidateUnorderedNonces` `0x3ff9dcb1` on Permit2, which
   costs the buyer a transaction, so the panel says that plainly and shows the gas estimate rather than
   presenting it as a free cancel.
7. On the escrow rail there is nothing for us to stop. The money is in the kernel, `settle` is permissionless,
   the dispute button is client-only. So the buyer gets the countdown, the button, a plain summary of what we
   found and the note that `claimRefund` after `expiredAt` is unhookable and cannot be blocked by anyone
   including us. Our own `settler` stands down on any job with an open dispute, per step 4 of section 3.

**T+15 to T+30, decide and record.**

8. Open one incident record. It is a row in `14-GAPS.md`'s `incidents.json`, not a second store:
   `{id, startedAt, endedAt, severity, affects[], statement, nextUpdateBy, postmortemUrl}` on that document's
   four-level ladder, with `affects[]` carrying the listing ids, job ids and session ids this runbook
   enumerated. A money-at-risk incident is **S1** by that ladder's own definition, so it owes a banner inside
   15 minutes, a correction entry appended to the `ledger`, a correction notice on every affected receipt and
   a postmortem inside 5 business days. The row is also appended to the `ledger` so the timeline cannot be
   rewritten afterwards. Inventing a second incident shape here would guarantee two stores that disagree.
9. Auto-open a dispute per affected job, `raisedBy: muster`. Tier 0 decides the ones the five checks decide and
   those rows land in state `prevented`. A buyer who never noticed the incident is made whole without filing
   anything, which is the whole point of that state.
10. Emit the statement of reasons for the suspension to the operator, with the facts, the policy category, the
    automated-means flag plus the appeal route. DSA Art 17(2) says the duty applies at the latest from the date
    the restriction is imposed, so it goes out with the suspension rather than after a review.

**Who gets told, since the first hour is the premise.** One role, `duty-reviewer`, the same role section 5
names as Tier 2, with one person holding it. There is no rota on a four-day build, so no pager is claimed
here either: the channel is the one the canary already uses, an issue opened on the repository plus the
operator's own channel, with an acknowledgement target of one business day. `14-GAPS.md` and `15-SYSTEM.md`
both publish that posture and this document does not quietly promise something better. The honest
consequence, stated rather than buried: an incident opening at 03:00 gets its whole automatic half in the
first minute, the suspension, the quote freeze, the exposure enumeration, the Tier 0 verdicts and the
`status` entry, then waits for a human on the Tier 2 residue and the delist-or-lift call. Across a judging
window running to 2026-09-23 that residue has to be covered by a person. We hold no email for anyone,
so the status page is what tells a buyer in the meantime.

**T+30 to T+60, tell people and close the loop.**

11. Publish a `status` entry: what is affected, what a buyer should do, what we have already done, the time of
    the next update. It sits beside the per-source freshness banner rather than on its own page, because a
    buyer checking whether the venue is healthy should find one place.
12. Notify every buyer with a job or a session in the window, in product, because we hold no email by design
    and that is a trade made deliberately in section 9.
13. Make the delist-or-lift call. **Target T+60, hard cap 72 h.** Those are the only two numbers: at T+60
    the duty reviewer either lifts the suspension or confirms a delisting with reasons from the published
    list. Where no human is reachable inside T+60 the default is safe rather than convenient: the suspension
    holds and the record marks the call outstanding instead of pretending it was made, which is the same
    honesty the alert posture above requires. 72 h is the outer bound past which an outstanding call is
    escalated rather than left. The cap is scoped to **this runbook's incident-driven suspension** and to
    nothing else. Every other route into `suspended` runs on `05-ONBOARDING.md`'s clocks, which are different
    on purpose: a probe suspension self-heals on a passing probe, a policy or drift suspension routes back
    through lint on the operator's own schedule, then `suspended` to `delisted` fires on an appeal refused or
    30 days suspended with no fix. SPINE assigns the general delisting trigger to 05 and 06, so this document
    does not overwrite it with 72 h.
14. Where the cause is ours, say so in the same entry. A stale price, a bad probe, a dispatch to a delisted
    listing, a decimals read that assumed 6 on an 18-decimal token: each is our defect, the credit comes from
    our own pool and the assertion that would have caught it goes into the `conformance` suite in the same
    change.

The hour deliberately does not move anybody's money, does not write to chain except where we revoke our own
session, deletes nothing and never presses `dispute` for a buyer, because that call is client-only and
pretending otherwise would be a claim that reverts.

**Automated by 2026-09-09:** every trigger, the suspension, the quote-path freeze, the exposure enumeration,
the incident record, the auto-opened disputes, the Tier 0 decisions, the statement of reasons, the `status`
entry. **A human following this page:** the Tier 2 decision, the delist-or-lift call at T+60, every delisting
confirmation anywhere in this document, then the per-buyer notification at any volume above a handful. Said
plainly rather than described as automated.

## 12. What ships by 2026-09-09, what is documented as next

**Ships.**

- The disputable and not-disputable lists, on the listing, with the per-category detail in section 1
- The evidence bundle captured automatically, sealed with `bundleHash` in the `ledger`, exportable by the buyer, carrying the raw `spendInfos` words for the D8 caveat
- Tier 0 auto-resolve, five deterministic checks, target 60 s from `terminalAt`
- The dispute state machine: the seven states, the terminal two, the legal transitions, `checksPassed` on the record
- The published clocks: the raise window per rail, the response window with the escrow rail's compression, both decision formulas anchored to `windowClosesAt`, the under-48-h immediate branch, 30-day appeal, six-month complaint channel
- The dispute intake, the single operator submission slot with its counter plus its deadline, the statement of reasons with `onChainEffect`
- The remedy execution paths, each as real code rather than a policy line: operator-refund with the 72 h follow-up timer that converts to a credit, the zero-budget escrow re-run through `setBudget(jobId, 0)` then `fund(jobId, 0)`, credit issuance against the fee line with its denomination, expiry and per-buyer cap, the `partiallyUpheld` two-way choice on the escrow rail
- ERC-8004 feedback bound to a settled job with `bundleHash` in `feedbackHash` and verified-operator `appendResponse` display, sanitised before render
- The public dispute log with the four aggregate numbers, per category, marking which rows carry an on-chain validation pair
- Screening at quote and again at settlement: **four subjects, seven chain reads batched into one Multicall3 `aggregate3`**, both sources, asymmetric handling, a 24 h cache ceiling
- The prohibited-use mapping on the five-value outcome enum with its immediate and on-repeat columns, the notice form with the four Art 16(2) fields plus the anonymous branch, the authority contact point
- Delisting as a human confirmation everywhere, including D10 and the categories marked immediate, so `automatedMeansUsed` never reads true on one
- The four output shapes with a named per-shape assertion each, the fixed banner in FCA wording, the banned-strings screen **on the delivery path** with the render refusal plus the prohibited-use finding it opens, CI grepping our own copy only
- The escrow-rail surface: the right clock per state (`expiredAt` on FUNDED, auto-approval on SUBMITTED), the dispute button, the claim-refund button, then a `settler` that calls `settle` for any elapsed job **except one carrying an open Muster dispute**
- The incident triggers, the slot sweep over the three registries plus FDUSD, USD1, `$U`, the kernel and the router, then the value sweep over `platformFeeBP()`, `disputeWindow()`, `voteQuorum()`, `activeVoterCount()` and `paymentToken()`
- The incident record as a row in `14-GAPS.md`'s `incidents.json` on its severity ladder, with the money-at-risk case entered as S1
- **One real `validationRequest` plus one real `validationResponse` on BSC mainnet, on an agent we own, labelled as exactly that.** `validationRequest` is authorised to the agent owner, so the only pair we can land is first-party: a self-hire on one of our reference agents, `origin: house`, disputed and decided by our own validator address, scored at zero weight under section 8's self-financing rule and shown with the "validated by Muster's own suite" label. It is the first use of that registry as far as we measured, which is the claim. It is not a claim that a third party validated anything

Two of section 8's gates ship as **the published rule plus the counter, with no data behind them yet**, because
the volume they measure will not exist by 2026-09-09 and pretending otherwise would be inventing a baseline:
the buyer-side rate gate at 3x the category rate with a dismissal rate over 50%, plus the escrow racing gate
counting disputes per client against their completion rate. Both counters run from the first job, both
thresholds are published in advance so they cannot be tuned after the fact. The public log reads zero until
something crosses them. The consume-then-dispute ordering check needs no volume at all and ships live, because
it is a comparison of two timestamps we already hold.

**Documented as next, never presented as shipped.**

- `OperatorBond`, the E1 bond contract, with decision-keyed release plus keys outside our hands, with the money-transmitter analysis attached. Its forfeit trigger and fraction are settled in section 6 so `08-MONEY.md` is not left waiting, but it is deployed on no chain and nothing holds a stake by 2026-09-09 (`three/decisions/05-onboarding-operatorbond-not-deployed.md`)
- `panel:bonded` deciders drawn from E4 operators
- Any third-party validator, because none exists on BSC
- **An on-chain validation trail on a listing we do not own.** `validationRequest` is owner-authorised, so the general case needs a standing `setApprovalForAll` grant collected as a listing condition. Two things block it: whether the Validation Registry honours that grant is unverified, then whether it becomes an E1 or E2 condition is `05-ONBOARDING.md`'s call
- Partial refunds on the escrow rail, which the kernel cannot do. Section 6's `partiallyUpheld` row names what happens instead
- The DSA Art 22 trusted-flagger priority queue
- Art 21 out-of-court dispute settlement and the P2B Art 12 mediators
- Full DSA Art 30 trader verification. The schema exists and the self-certification is collected at listing. The fields that would carry identity documents are defined and empty because the venue is not operating commercially and claiming trader verification that did not happen is not an option

## Decisions and rejected alternatives

**Only claims decidable from captured bytes are disputable, everything else is named out of scope before the
hire.** Rejected: a general satisfaction dispute in the consumer-marketplace style. It sounds friendlier and it
is worse, because we would have to invent a verdict on evidence that cannot support one and an invented verdict
against an operator corrupts the score the venue rests on. The exclusion list also tells a buyer what to check
before hiring.

**The dispute window is a listing field, printed before the hire, differing by rail.** Rejected: one window
across both rails. It reads cleaner and it lies, because on the escrow rail the number is `disputeWindow()` read
from the policy, 604,800 s on mainnet against 900 s on testnet. It is not ours to choose.

**Tier 0 opens and decides the dispute itself where a deterministic check fails.** Rejected: waiting for the
buyer to complain. A venue that only refunds the buyers who notice is running a quiet discount for attentive
users. This is Stripe's `prevented` state and it costs one scheduled call after `terminalAt`.

**Silence from the operator decides against the operator while silence from the buyer lets the payment stand.**
Rejected: symmetric escalation to a human on any silence. The asymmetry matches every venue that publishes its
defaults, because the operator controls the delivery evidence and the buyer controls only whether they complain.

**A tie on the decidable facts resolves as `undecided`, credit from our own pool, the job excluded from both
records.** Rejected: deciding for the buyer on the assumption they are the weaker party. That is a subsidy paid
in operator reputation and an operator cannot appeal a coin flip.

**Muster does not press `dispute` on the escrow rail and says so in the product.** Rejected: presenting the
on-chain dispute as ours. `policy.dispute` reverts `NotClient()` `0x20dbc874` from any address that is not the
job client, so the alternative is a button that reverts. We hand the panel a sealed bundle instead.

**The remedy set is refund, partial refund, re-run, credit, suspend, delist, each naming its funder.** Rejected:
a discretionary goodwill payment. An unnamed funder is how a venue lands in the payment flow by accident and the
FinCEN forum position is the most valuable thing this design has. Suspend and delist are separate entries rather
than one, because a machine may fire the first and only a human may confirm the second.

**The credit is a waiver against our own fee, not a balance we hold and pay out.** Rejected: a spendable
in-venue balance, which is the obvious shape and the wrong one. Redeeming it against a third-party listing would
have Muster funding a payment to that operator on the buyer's instruction, which is the settlement flow the
FinCEN forum position assumes we sit outside. R15 carries no clause covering venue-issued credits. A
discount on a fee we charge is a service term. A float is a liability we would have to be licensed to hold.

**The operator bond does not ship and the reason is published, so the credit funds the operator-lost case too.**
Rejected: shipping the bond anyway because it makes the remedy story neater. Rejected equally: leaving the
operator-lost credit pointing at a funder that does not exist. Directing an operator's stake to a buyer on our own
decision is value in and value out, which the payment-processor exemption does not cover. So `funder` reads
`muster` on every credit today, bounded by a published per-buyer cap plus a venue-wide ceiling. Section 6
settles the forfeit trigger and fraction now so `08-MONEY.md` has the answer it is waiting on when the bond does
land.

**Decisions are written in validation-response shape from day one, with one real first-party pair on mainnet.**
Rejected: keeping decisions purely off chain while promising an on-chain future. Rejected just as firmly:
presenting a self-hire as market evidence. The registry is deployed, wired, callable and unused across 1,999
sampled ids, so the on-chain leg costs two calls and turns a claim about our process into something a judge reads
with `getAgentValidations`. `validationRequest` is owner-authorised, so that pair can only be first-party. It
ships labelled, at zero weight, with the general case in the documented-as-next list.

**Feedback is written by the buyer from the buyer's address, never by us.** Rejected: writing it for them for a
smoother flow. `Self-feedback not allowed` blocks the worst case already and a venue holding a key that can
write reputation for a buyer has made its own reputation surface worthless.

**Excluded feedback is recorded at zero weight rather than deleted.** Rejected: hiding it. 16 CFR 465.7(b)
permits withholding only on criteria "applied equally to all reviews submitted without regard to sentiment", so
a published sentiment-blind filter survives scrutiny while a quiet deletion does not.

**Dispute-rate abuse gates the automatic remedy, never the right to be heard.** Rejected: suspending dispute
rights outright on a rate threshold. DSA Art 20 requires the channel to stay open and only a direct hit blocks.

**The first hour suspends and enumerates, never moves money.** Rejected: an emergency refund button. Every money
movement in an incident is either irreversible on the x402 rail or not ours to make on the escrow rail, so the
fast actions are the reversible ones and the money follows a decision.

**The four output shapes are enforced by a named per-shape assertion, with the banner as the last layer and the
string screen on the delivery path.** Rejected: a disclaimer as the strategy. Rejected separately: a CI grep
over agent output. A disclaimer does not change what a thing is and the FCA's own anti-obfuscation rules show
what a regulator thinks of disclaimers designed to be missed. A CI grep never sees a runtime response, so it
would report green over unchecked live output, which is worse than having no check at all.

**A machine may suspend and block payment. Only a human confirms a delisting.** Rejected: automatic delisting on
a screening verdict or a prohibited-use detection, which was the faster path and would have put
`automatedMeansUsed: true` on an action `06-QUALITY.md` promises three times is never automated. Suspension stops
new exposure in the same second and is reversible, which is what the speed was actually for.

## Open questions

1. **Whether a disputed ERC-8183 job can actually be rejected in practice.** Unverified. Rejection needs 3 of 5
   whitelisted voters to call `voteReject`. **No disputed job has been observed on BSC**, so no panel
   rejection has been observed either. The six jobs that are in REJECTED, ids 56574, 56607, 56704, 56706, 56708
   and 56710, were each read for this pass with `disputed(jobId)` false, `rejectVotes(jobId)` 0 and
   `submittedAt(jobId)` 0, so all six arrived there through the client or evaluator path rather than through a
   vote. Settling the panel question means disputing one of our own testnet jobs where the window is 900 s and
   watching what it does. Worth attempting before submission. Not guaranteed to produce an answer.
2. **Who the five policy voters are.** Unverified. `isVoter(address)` is a per-address view with no enumerator
   and there is no `voters()` list, so reading them needs a `VoterAdded` log scan the free BSC RPCs refused
   (`R02-erc8183.md`). Until then the decider on the escrow rail is opaque to a buyer and the product says so
   rather than implying a panel we can describe.
3. ~~**Whether `$U` can be frozen.**~~ **Closed.** It can. `R04-bsc-tokens.md` already recorded that all three
   settlement tokens expose `paused()` and `frozen(address)`. The implementation behind `$U`'s EIP-1967 slot,
   `0xbef21313c69c009fd7d9510a8d3a481a32473dfc`, was grepped for this pass: `freeze` `0x8d1fdf2f`, `unfreeze`
   `0x45c8b1a6`, `frozen` `0xd0516650` and `paused` `0x5c975abb` are all present and `reallocate` `0x308b8c00` is
   absent. Section 1's N7 note and section 11's triggers both cover it. What remains unverified is different and
   still open: `$U`'s issuer, peg and redemption, plus who holds its upgrade key.
4. ~~**Whether FDUSD exposes `cancelAuthorization`.**~~ **Closed, negatively.** It does not. The implementation
   at `0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50` does not carry `0x5a049a70`. Neither does `$U`'s. USD1's
   at `0x694aa534bdef8ed63244eb902e7914e527891f08` does. Section 6's per-sub-rail refund table carries all three
   results plus the Permit2 alternative, so the product never offers a cancel button on a token with no cancel.
5. **Whether any BSC agent serves the x402 `offer-receipt` extension.** Unverified. The one live challenge
   decoded in `R12-agent-comms.md` carried `bazaar` and `builder-code` only. Until a third-party agent serves it,
   the signed offer in the bundle comes from our own `facilitator` for listings we broker and a third-party
   listing without one is labelled as having no signed offer rather than assumed to have one.
6. **Whether the programme's own IP terms bear on publishing the dispute log and the decision records.**
   Unverified: the rules sit on DoraHacks, which returned HTTP 405 with a WAF human-verification page on every
   API path R15 tried. Nothing here depends on it and the terms get read before the submission form is filed.
7. **What Phase 2 assesses.** The live page prints `[REDACTED]`. Nothing here is tuned for it, which is the only
   available defence.
8. **Whether the notice queue sees any real volume during judging.** Unknowable in advance. The queue, the clocks
   and the statement-of-reasons generator exist either way and the public log will honestly read zero if nothing
   arrives. A zero with a working form behind it is a better artifact than a populated log nobody can check.
9. **Whether the duty reviewer is reachable across the whole 2026-09-09 to 2026-09-23 judging window.**
   Operational rather than design. The load is larger than it looks: that one role carries the Tier 2
   decisions, every delisting confirmation and the T+60 delist-or-lift call. The honest mitigation is that
   Tier 0 decides D1 to D6, D9 and D10 with no human at all and can suspend plus block payment on its own, so a
   missed human window delays the D7 residue and leaves a listing suspended rather than leaving a buyer exposed.
10. **Whether the Chainalysis oracle covers EU and UN designations that OFAC does not.** Unverified. The oracle
    has no enumerator and a full log scan from deployment is beyond a public RPC's range caps. Chainalysis claims
    coverage wider than OFAC and calls its own list "explicitly non-exhaustive", which is their claim rather than
    our measurement and it is one reason the local SDN set exists alongside it.
11. **Whether the ERC-8004 Validation Registry honours an `isApprovedForAll` grant on `validationRequest`.**
    Unverified. It is the gate on every third-party on-chain decision trail. What was read on chain for this
    pass: the call reverts `Not authorized` from a random EOA, returns `0x` simulated from `ownerOf(1)`, then
    `validationResponse` on a hash with no request reverts `unknown`. The Identity Registry accepts
    `msg.sender == ownerOf || isApprovedForAll(owner, msg.sender) || getApproved == msg.sender` on its own
    owner-gated calls (`R01-erc8004.md`), but that was not tested against the Validation Registry. One simulated
    `validationRequest` from an address holding a live `setApprovalForAll` on a test agent settles it. Until it
    does, the on-chain pair is first-party only.














