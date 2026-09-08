# 15-SYSTEM: the build, the boxes, the deployment and the four days

Written 2026-09-05. Build closes 2026-09-09 at **12:00 UTC**, read from the registration form's own
description on 2026-09-06. The plan below was built to 00:00 UTC before that read, which leaves twelve hours of margin, and everything is green
before 2026-09-08 ends (`00-PROGRAM.md`, the unverified list in `research/SPINE.md`).

## What this settles

Every other document says what Muster does. This one says what runs, where it stores what it knows,
what it refuses to do, how it gets onto a public URL a stranger can fetch, then what has to be true
before the form is filed. Names, field spellings and constants come from `research/SPINE.md` and are
used exactly. Where a sibling document owns a formula or a policy, this document says which component
runs it and never restates it.

It also carries the extension right. `SPINE.md` makes this the only document that may add a stored
field name and only by extending its list. Section 2.6 is the whole list of stored additions with the
document that asked for each. Section 1.1 records the one component name added beyond `SPINE.md`'s list,
with its reason, so both extensions are in one place each rather than scattered.

## 0. Four boundaries, then one deviation recorded up front

The component map in section 1 is drawn so that four lines are crossable in exactly one place each.
A reviewer who checks nothing else should check these.

**The custody boundary.** No key Muster holds can move a buyer's money. The buyer signs an EIP-3009
authorisation naming the agent's own wallet as `to`, read from `getAgentWallet(agentId)` `0x00339509`
at quote time. Our relayer key holds BNB for gas and nothing else. The only thing it can do with an
authorisation is submit the one the buyer already signed for a fixed payee and a fixed amount
(`08-MONEY.md`, `three/decisions/08-money-no-own-escrow.md`). No contract of ours receives funds in
order to forward them.

One departure from the file that outranks every other on the rail, stated here rather than left
implied. `VERIFIED-payment-rail.md` prefers `receiveWithAuthorization` where the payee holds code. An
Altana agent wallet does hold code: 23 bytes of EIP-7702 delegation (`SPINE.md`). That form pins
`msg.sender` to the payee, so a relayer cannot submit it. Muster therefore uses
`transferWithAuthorization` `0xe3ee160e` and accepts the open submission window, which costs nothing
here because the payee and the amount are both fixed on the quote before the buyer signs. A
front-runner can only submit the payment the buyer already authorised to the payee already recorded.

**The sanitize boundary.** Nothing an operator or an agent supplied reaches a buyer's browser, a log
that gets rendered or any model prompt, until it has passed one deterministic screen that no later
code path can waive. Section 7.5 is that screen.

**The signed boundary.** Nothing enters the `ledger` unhashed and unsigned. `origin` is checked at
append time so an unknown value cannot be written at all, then `walk()` recomputes hashes, links,
signatures and the decision itself from the recorded inputs (`08-MONEY.md`).

**The freshness boundary.** Nothing renders a number without its `freshness` triple of block number,
timestamp and source. A field with no fresh read renders one of the six unknown states
`03-TAXONOMY.md` fixes, never a dash and never a zero.

### The deviation

Passes one and two of this lane call for an indexing pipeline with 8004scan as primary and a log backfill
as fallback (`../ARCHITECTURE.md` section 3.2), which `R16-reuse.md` marks invalidated on both
halves. The chain is primary here, the second index is a cross-check with its lag on screen and the
log tail is a bounded change-detection path rather than a backfill. Three measured reasons, all from
`R05-8004scan-api.md` unless stated:

- Its BSC indexer self-reported `status: down` for a whole session with a canonical checkpoint at block
  119,687,744, about 32 hours stale, while `/status/summary` said the database was fine.
- It holds **304,281** BSC agents on `/stats/global` against 334,935 on chain at block 120,027,164, so
  a shortfall of 30,654 (`SPINE.md`, `MEASUREMENT.md`). Its own list endpoint
  `/agents?chain_id=56&limit=1` answers 303,461 in the same window, which is 31,474 short and 820 below
  its own stats figure. Every count in this document carries the endpoint that served it, because one
  vendor publishing two different totals for the same chain is itself the Data Quality exhibit. It also
  returns 404 for agent ids whose `ownerOf` answers.
- Its read path returned non-200 on 20.8% then 56.7% of calls across two windows on one day. There is no
  bulk export, no `updated_after` filter, no since-block cursor and no agent webhook.

A from-genesis log scan is not available either. `eth_getLogs` is capped at 5,000 blocks on the free
BSC endpoints and anything older than roughly the last hour is refused as an archive request
(`R01-erc8004.md`, `MEASUREMENT.md`), which is about 8,200 requests for the 40.93 million blocks since
the first registration. Section 3 is built on the two reads that do work: one `eth_getStorageAt` for
the count, then `aggregate3` through Multicall3 for the bodies.

## 1. The component map

### 1.1 Four processes, four reference-agent services and one thing that runs off our machine

Twenty-two components, four processes. A component is a module with one responsibility. A process is a
unit that starts, crashes and restarts on its own. Every component below sits in exactly one process, so
a crash has a known cost and nothing is owned by nobody.

`SPINE.md` names twenty-one components. `reconciler` is the twenty-second and is a named extension of
that list, recorded here the way section 0 records the indexing deviation. It owns the six comparisons
in section 3.7, the per-source lag and the drift banner, which is a different responsibility from
sweeping the registry and would otherwise disappear inside `indexer`.

| Process | Holds | Contains | Restart cost |
| --- | --- | --- | --- |
| `web` | no signing key | `web`, `api`, `mcp`, `status`, `session-panel`, `matcher`, the whole of `broker` including the write side, `evidence-store` | seconds. A hire in flight survives, because the `Idempotency-Key` reservation and `payment.state` are rows rather than memory, so a restart resumes instead of paying twice |
| `worker` | no signing key | `registry-reader`, `indexer`, `resolver`, `prober`, `classifier`, `conformance`, `quality`, `escrow-index`, `sampler`, `screening`, `reconciler`, the long-job poller, the retention reaper, the SDN refresh, the nightly dump | a sweep restarts from its checkpoint |
| `facilitator` | **the relayer key, the ledger signing key plus the house probe key, the only three loaded in any Muster process** | `facilitator`, `settler`, `ledger` append | seconds, no state of its own |
| `cli` | no key. `walk()` verifies with the public key | one-shot sweeps, `walk()`, exports, the self-check runner, the publish gates, the static fallback export, plus the five admin verbs (approve, suspend, delist, restore, constant change) each taking a mandatory reason and a published policy code | not resident |
| `canary` | nothing, no credentials at all | the anonymous outside-in check | runs on GitHub's infrastructure, not ours |

**No admin HTTP route exists.** Every action in 7.1's admin row is a `cli` command on the operator's own
machine, which is why no process above serves one (`14-GAPS.md`).

`matcher` and `broker`'s write side sit in `web` because a hire is one HTTP request: stages 1 to 6 run
against the store at one pinned block and block on nothing foreign. The genuinely long-lived part is the
poll of a dispatched job, which is a `worker` job (`jobPoll`) reading and writing the same `job` row, so
a `web` restart cannot lose work in flight.

The four first-party reference agents are **not** Muster components and hold none of the above. They are
four separate services, one per category, with their own units, their own wallet keys and their own
Altana session keys. Section 6.1 deploys them.

`facilitator` binds a unix socket and no TCP port, so nothing on the network can reach any of those three
keys even if `web` is compromised. `08-MONEY.md` and `SPINE.md` say the facilitator is in process, meaning
ours rather than a hosted third party. Splitting it into its own OS process keeps that interface exactly and
isolates the keys, so the B402 client still swaps in behind the same two methods.

### 1.2 What each component owns and what it may not do

The "may not" column is the load-bearing half. It is what makes a boundary a boundary rather than a
diagram.

| Component | Owns | May not |
| --- | --- | --- |
| `registry-reader` | pinned-block reads of the three ERC-8004 contracts through Multicall3, plus the `_lastId` storage read at slot `0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00` | write anything or read at an unpinned block inside one pass |
| `indexer` | sweeps ids 0 to `_lastId - 1`, one `agent` record each, tails on the `_lastId` delta, records the sweep | block a page render, replace a complete sweep with a partial one or fetch a URL itself |
| `resolver` | turns a `tokenUri` into a registration document across all six live shapes, returns null rather than throwing | make an outbound request except through the egress client in section 7.3 |
| `prober` | the probe suite per declared surface, the reachability tier, status, DNS verdict, TLS verdict, latency, its own timestamp | exceed the per-host budget, follow a redirect or record a `skip` as a `pass` |
| `classifier` | category assignment from declared skills first then text, records `categoryBasis`, abstains | guess. `categoryConfidence` 0.00 with a stated reason is a valid output |
| `conformance` | the 31 per-listing assertions `C01` to `C31` plus the 3 index probes `P1` to `P3` from `04-AGENT-PROTOCOL.md`, one `probeResult` row per assertion | spend outside the house budget, hold the probe key itself or run a paid probe without the `origin: house` tag |
| `quality` | the Muster score, its interval, its sample size, the evidence tier, from settled jobs only | read an unsettled job or use any foreign score as an input |
| `matcher` | the eight stages of `07-MATCHING.md` from intent to dispatch | block on a third party in stages 2 to 6 |
| `broker` | quote, payment challenge, dispatch, deliverable, receipt | hold a key or settle. It asks `facilitator` |
| `facilitator` | x402 verify and settle behind one interface | settle to any `payTo` other than the one recorded on the quote or exceed its per-call and per-day caps |
| `escrow-index` | the official ERC-8183 kernel, router and policy, the `job.provider` join back to an agent id, per-provider and per-category counts with the window | present a lifetime count with no window or no per-provider split |
| `settler` | the permissionless `settle(jobId, evidence)` `0x39c2ebb9` once `submittedAt + disputeWindow` elapses, for anybody's job | pick which jobs to settle by owner. It runs the whole router |
| `ledger` | append-only hash chain, `origin` checked at append, `walk()` returning per-entry failures | accept a mutation or be reachable from any admin route |
| `evidence-store` | content-addressed job artifacts and dispute bundles | serve a stored body inline into an HTML page |
| `session-panel` | the Altana allowlist, cap, expiry and revoke state, read from chain on every render | cache. The track requires a live read |
| `screening` | wallet screening against the Chainalysis oracle plus our own SDN ingest, verdict recorded at write time | let a quote or a settle proceed without a verdict row |
| `sampler` | the time series no free surface keeps: in-range seconds, pool liquidity, staked in-range liquidity, indexer freshness | be on the critical path of a render |
| `reconciler` | the six reconciliations in section 3.7 and the per-source lag | hide a disagreement. A mismatch renders |
| `web`, `api`, `mcp` | the public surfaces | require auth for a read or render agent text unscreened |
| `status` | the public status page, the per-source freshness banner, the canary history | report a green it did not measure |

### 1.3 The three surfaces, named

`web` renders the routes `03-TAXONOMY.md` fixes: `/`, `/c/<slug>` for the four shelves,
`/a/<agentId>/<listingId>`, `/compare`, `/search`, `/receipt/<receiptId>`, `/coverage`, `/report`,
`/status`,
`/docs/...`. Server rendered, readable with scripting off, wallet requested only at hire. `/coverage` is
the four-category coverage proof and `/report` is the Agent Advantage Report, two pages on two routes
(`three/decisions/03-taxonomy-coverage-page-splits-from-report.md`). Two more
routes come from `14-GAPS.md`, which names them then leaves them here. `/operator` is the signature-gated
operator view over the lint, the drift diff and a re-check button. `/badge/<listingId>.svg` is a
server-rendered badge at a permanent URL, cached at the freshness contract.

`api` is REST, no auth, every list paged as `{ items, page, pageSize, total, totalPages }`:

```
GET /v1/agents            ?category=&tier=&answeredWithin=&page=      GET /v1/agents/{agentId}
GET /v1/listings          ?category=&visibility=&hireable=            GET /v1/listings/{listingId}
GET /v1/categories        GET /v1/categories/{slug}/contract
GET /v1/probes            ?listingId=&since=                          GET /v1/jobs/{jobId}
GET /v1/receipts/{receiptId}    GET /v1/decisions/{reasonId}          GET /v1/ledger?from=&to=
GET /v1/export.csv?payer=       GET /v1/export.json?payer=            GET /v1/status
GET /v1/feed              ?address=                                   GET /v1/webhooks/{subscriptionId}/deliveries
GET /docs/api/openapi.json      OpenAPI 3.1 with info.license populated
GET /first-party.json           GET /flags.json
```

Two of those are files rather than handlers, both absorbed from `14-GAPS.md`. `/first-party.json` is the
published list of our own operator addresses, which is what makes the first-party label derived rather
than stored: `02-THESIS.md` section 10 clause 1 publishes the list and every surface reads it, so no flag
can be forgotten. `/flags.json` is the eight kill switches, read **per request** rather than at boot, with
the flag list and the published effect of each fixed by `14-GAPS.md`. A flip writes a `reasonsRecord` and
a `ledgerEntry`, so the render path reads flags and the write path records them.

The first-party label travels with the data, not only with the page. Every `api` payload and every `mcp`
tool result that carries a listing carries `firstParty` as a derived boolean plus the `listHash` it was
derived from, which is clause 2's requirement that the label appears on every surface the listing appears
on. Nothing is stored on `agent` and the published file stays the source of truth.

`mcp` speaks MCP 2026-07-28 over Streamable HTTP at one endpoint, implements `server/discover` with
`ttlMs` and `cacheScope` set and names its tools so they cannot be confused with the index we build on.
8004scan's are `search_agents`, `get_agent`, `get_agent_feedbacks`, `get_starred_agents`, `star_agent`
and `unstar_agent` (`R05-8004scan-api.md`). Ours are `muster.find_agents`, `muster.get_listing`,
`muster.compare_listings`, `muster.get_quote`, `muster.get_receipt` and `muster.get_status`. MCP names
allow `[A-Za-z0-9_.-]` at 1 to 128 characters, so the dotted prefix is legal and an aggregator that
mounts both servers cannot collide (`R12-agent-comms.md`).

## 2. The data model

### 2.1 The store

One SQLite database file in WAL mode on the machine's own disk, plus a content-addressed blob directory
beside it. Reads are in-process with no network hop, which is what lets a shelf render inside a page
budget while a sweep is running. `R01-erc8004.md` measured the whole registry at 0.27 GB of RPC payload
and after the dedupe in section 2.5 the stored form is smaller than that, so the whole index fits on one
disk with room for the probe history.

**Three processes write, so the lock policy is stated rather than assumed.** `worker` writes the sweeps
and the probe rows, `web` writes the quote, job, payment and receipt rows on the hire path, `facilitator`
appends to the `ledger`. WAL allows one writer at a time and never blocks a reader, so four rules make
that safe. Every connection sets `busy_timeout` to 5000 ms at open. A sweep commits in batches of at most
500 agents. A batch holds the write lock for at most 250 ms, which is a budget the first full sweep on the
box measures rather than a figure already measured. And `ledger` append runs on its own connection inside
`facilitator`, never nested in another transaction, so a settle-time append waits one batch at worst
instead of one sweep. Verified locally on Node 22.22.2 today: `node:sqlite` returns `journal_mode` `wal`
and `busy_timeout` 5000 from those two pragmas, so both are set through the runtime's own module.

Rejected: Postgres, because it adds a second service to operate for no gain at 335k rows and one write
path per table. The claim is one write path, never one writer: three processes hold a write connection and
the rules above are what make that ordinary rather than a race.
Rejected: an in-memory index with no persistence, because the probe history and the ledger are the
product and both have to survive a restart.

### 2.2 What is authoritative where

Three tiers. A lower tier never overrides a higher one.

| Tier | Source | Authoritative for | Never authoritative for |
| --- | --- | --- | --- |
| 1 | BSC state at a pinned block | `agentId` existence, `owner`, `agentWallet`, `tokenUri`, on-chain metadata keys, feedback rows, ERC-8183 job state, token `decimals()` and `DOMAIN_SEPARATOR()`, session allowlist, cap and expiry, the sanctions **oracle's own answer**, payment settlement | price, category, liveness, quality, the sanctions verdict |
| 2 | Muster's own measurement | probe verdicts, reachability tier, category assignment, conformance results, the Muster score, our job and payment records, receipts, the ledger, the **sanctions verdict** | anything in tier 1. A disagreement means re-read the chain |
| 3 | A foreign index | nothing at all | everything. It is displayed with its own name, its own timestamp and its own status |

The sanctions row is split on purpose. The Chainalysis oracle is not a superset of OFAC: it flags 57 of 91
EVM-format SDN addresses. Of the 42 that are active on BSC, 20 are not flagged (`SPINE.md` from
`R15-compliance.md`). So the oracle's boolean is a tier 1 fact and the verdict Muster acts on is a tier 2
fact, because it is the union of that boolean with our own SDN ingest. The `screeningCheck` row already
stores both sides, the `oracleResult` beside the `listSha256` and the `listFetchedAt`, so which half blocked
a quote is always answerable after the fact.

The operator's own declaration sits inside tier 2 as a recorded claim rather than a fact: it is stored
with its source, shown as declared, then checked. `04-AGENT-PROTOCOL.md`'s rule holds throughout, a
declaration is a claim and a probe is a fact.

Two traps this split exists to avoid, both measured. `agentWallet` is non-zero for 600 of 600 sampled
agents and equal to `ownerOf` for 600 of 600, because `register` writes `msg.sender` into that slot at
mint, so `agentWallet != 0` is not a filter, it is the whole registry (`MEASUREMENT.md`). And a foreign
`health_score` of 100.0 sat on an agent whose certificate is bound to `*.up.railway.app` and does not
match its own hostname (`MEASUREMENT.md`, `R05-8004scan-api.md`), which is why tier 3 is authoritative
for nothing.

### 2.3 The nine collections `SPINE.md` names, with keys and constraints

Field lists are `SPINE.md`'s and are not repeated. What is added here is the key, the indexes a query in
`03-TAXONOMY.md` or `07-MATCHING.md` actually needs, then the constraints checked at write time rather
than trusted.

| Collection | Primary key | Indexes | Enforced at write |
| --- | --- | --- | --- |
| `agent` | `(chainId, agentId)` | `tokenUriHash`, `owner`, `duplicateClusterId`, `lastSeenBlock`, `registrationParsed` | `chainId` is 56 or 97. `agentId` is a decimal string with no leading zero. `tokenUriHash` present whenever `tokenUri` is non-empty. `sweepId` references a completed or in-flight `run` |
| `listing` | `listingId` | `(category, visibility, evidenceTier)`, `(agentId, category)` unique, `lifecycleState`, `lastProbe`, `musterScore` | one listing per `(agentId, category)`, so an agent holds at most four. `category` in the four slugs. `priceDecimals` equals the `decimals()` read for `priceToken`. `visibility` in the four SPINE values. A `live` row must reference a passing probe inside the freshness window |
| `probeResult` | `probeId` | `(listingId, observedAt)`, `(assertion, verdict)`, `hostId`, `failureClass` | `verdict` in `pass`, `fail`, `skip`. `failureClass` present on every `fail` and only on a `fail`. `observedAt` and `prober` never null. Rows are immutable |
| `quote` | `quoteId` | `(listingId, expiresAt)`, `buyer` | `signerRecovered` and `signerMatchesProvider` both stored, never inferred at read. `expiresAt` at most **180 s** ahead on the displayed brokered path, at most 900 s on an ERC-8183 leg, settled below. `screeningId` present |
| `job` | `jobId` | `(buyer, startedAt)`, `(listingId, terminalAt)`, `escrowJobId`, `state`, `attribution` | `state` in the ten `04-AGENT-PROTOCOL.md` states, `terminalState` set if and only if the state is terminal. `origin` in `house` or `order`. `deliverableRule` in the four values. `requestHash` present before dispatch |
| `payment` | `paymentId` | `(jobId, kind)`, `txHash`, `payer`, `state` | `rail` in the five SPINE values. `payTo` equals the `getAgentWallet` read recorded on the quote or the kernel address on an `escrow8183` row. `amountBase` matches `/^[0-9]+$/`. `decimals` equals the boot-time read for `token`. `origin` checked |
| `receipt` | `receiptId` | `jobId` unique | `hashRule` in the four values. `pinnedBlock` and `recomputeCommand` non-empty. A receipt is written once and never updated |
| `session` | `sessionId` | `(agentId, expiry)`, `walletAddress` | `keyId` is 32 bytes and `keyHash` is a different value for the same key, so the two are separate columns and never cross-assigned. Rows are a read cache for history only and are never the source for a render |
| `ledgerEntry` | `seq` | `entryHash` unique, `(kind, ts)`, `origin` | `seq` equals the current length, `prevHash` equals the head, entry 1 is the genesis, `entryHash` matches the canonical body, `sig` present, `origin` in `house` or `order`. Seven invariants, all at append, so a broken chain cannot be created |

Two of those constraints exist because of a specific measured failure. The `(agentId, category)`
uniqueness is what stops one operator flooding a shelf with the same agent under four sub-capabilities.
The `session` note is there because the Altana track requires the allowlist, the cap, the expiry and the
revoke state to be read on chain rather than from a pitch (`00-PROGRAM.md`), so a cached row can be shown
as history but never as the current state.

**The quote TTL is a third sibling conflict and it is settled here**, because this document writes the
`quote` row and renders the price cell. `08-MONEY.md` caps a quote at 900 s, matching the cap the official
ERC-8183 SDK puts on a quote. `03-TAXONOMY.md` caps the Price field's freshness at the signed quote TTL,
at most 180 s. As drawn a buyer could hold a valid signature whose price cell had already gone unknown,
which is exactly the unknown-versus-stale distinction the freshness boundary exists for. So 180 s wins on
the displayed path: a brokered quote is written with `expiresAt` at most 180 s ahead, the signature and
the price cell expire together and a buyer who takes longer re-requests rather than resigns. 900 s stays
the ceiling on the ERC-8183 leg, where the SDK sets it and the price sits on chain rather than in a cell
we render. `08-MONEY.md`'s number is the one that yields, narrowed to the escrow path.

### 2.4 The money rule, checked at boot

Every amount is a base-unit decimal string beside its `token` and its `decimals`, never a float and
never a hardcoded decimals count (`SPINE.md`). **Every BSC stablecoin in play is 18 decimals**, so a
6-decimal constant is wrong by a factor of a trillion (`VERIFIED-payment-rail.md`).

The boot sequence therefore refuses to start rather than trusting configuration. For each of `$U`
`0xcE24439F2D9C6a2289F741120FE202248B666666`, USD1 `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` and
FDUSD `0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409` it reads `decimals()` and asserts 18, reads the
EIP-1967 implementation slot then greps the implementation for `0xe3ee160e` and recomputes
`DOMAIN_SEPARATOR()` `0x3644e515` from the configured name and version under the 4-field domain typehash
`0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f`. A mismatch on any of the three is
a hard boot failure with the expected and actual values printed. The proxy trap is the reason the grep is
on the implementation: a proxy holds no dispatch table, so grepping the token address reports every
selector absent (`VERIFIED-payment-rail.md`, `R16-reuse.md`).

### 2.5 Blobs, dedupe and why the registry fits

Registration bytes are not stored on the `agent` row. They go into the blob directory keyed by
`tokenUriHash` and the row keeps the hash. That is not tidiness, it is the dedupe: 215 of 600 sampled
agents carry a **byte-identical** `data:application/json;base64` tokenURI under 215 distinct owner
addresses. Sixteen more share a second one (`MEASUREMENT.md`). Hashing the bytes collapses that block in
one pass, where owner-based dedupe fails completely and name-based dedupe catches only the exact string.

`duplicateClusterId` is assigned from the same hash, so the cluster a buyer sees on a listing page and
the storage dedupe are the same fact rather than two implementations that can disagree.

Blob objects are content-addressed, written once, indexed in `evidenceObject` with `contentHash`,
`byteLength`, `mediaType`, an optional `jobId` and a `deleteAfter`. Nothing in the directory is served
inline: a fetch returns `application/octet-stream` with `Content-Disposition: attachment`,
`X-Content-Type-Options: nosniff` and a sandbox CSP, because half of what is in there is bytes an
operator chose.

### 2.6 The stored model extensions, in full

Seventeen new field names across eighteen placements, then eleven new collections. Every row names the
document that needs it, so nothing here is speculative. Every field a sibling document asked for is here:
a gate, a probe or a lint rule that reads a value nobody stores is a rule that does not run, which is why
`three/decisions/15-system-stored-model-requests-delivered.md` records the seven that were missing.

| Added field | On | Asked for by |
| --- | --- | --- |
| `attribution` (`brokered` \| `onChain` \| `signedReceipt` \| `unattributed`) | `job` | `04-AGENT-PROTOCOL.md` section 8, explicitly as a request to this document |
| `reviewedCardHash` | `listing` | `04-AGENT-PROTOCOL.md` section 7, the card hash pinned at review that rule B12 compares and probe C05 asserts. A different object from `approvedTokenUriHash`: that one pins the on-chain registration bytes, this one pins the off-chain card the operator serves |
| `advicePosture[]` | `listing` | `04-AGENT-PROTOCOL.md` section 7, the declared output shapes C09 gates on |
| `subcontracts` (bool) | `listing` | `04-AGENT-PROTOCOL.md` section 7, the flag rule B13 enforces so screening flows down one hop |
| `lifecycleState` (the nine states) | `listing` | `05-ONBOARDING.md` section 5.2, which makes the lifecycle a separate field from `visibility` |
| `approvedTokenUriHash`, `approvedFieldsHash` | `listing` | `05-ONBOARDING.md` section 9.6, the drift probe pins these two plus `reviewedCardHash` at review |
| `contactChannel` (`{ kind: webhook \| email, target, maxLatencySec }`) | `listing` | `05-ONBOARDING.md` section 6, read by gate G7, by the 9.4 escalation row and by checklist item 8 |
| `listingName`, `listingEndpoint` | `listing` | `05-ONBOARDING.md` section 11.3, the two Case C stand-ins. Both are ours, neither touches the chain and the row renders the registry's string beside whichever we probe |
| `screeningId` | `quote`, `payment` | `08-MONEY.md` section 11 and `09-DISPUTES.md` section 9, a verdict at quote and again at settle |
| `authDigest` | `payment` | `08-MONEY.md` section 11, so a buyer can prove what they signed is what settled |
| `quoteId`, `providerSigVerdict` | `payment` | `08-MONEY.md` section 11, so a settled row carries the quote it priced and the verdict on that quote's signature |
| `freshness` | `payment` | `08-MONEY.md` section 11, the block, timestamp and source triple on the settlement read |
| `sweepId` | `agent` | this document, section 3.5, so a partial sweep is detectable rather than silently mixed |
| `hostId` | `probeResult` | `05-ONBOARDING.md` section 9.2, the probe budget is per host and 9 hosts carry 229 of the sampled URLs |

**Two of `08-MONEY.md`'s four names are settled against the requester and this is the only field where
that happens.** `screeningId` rather than `screeningVerdictId`, because it is a foreign key into
`screeningCheck` whose own key is `screeningId` and `quote` already carries that column. `authDigest`
rather than `authorizationDigest`, same field, already written into the hire flow in 4.3. The other two
are added as asked.

| New collection | Key | Holds | Needed by |
| --- | --- | --- | --- |
| `operator` | `operatorAddress` | the six fields `05-ONBOARDING.md` section 2.3 lists and nothing else, plus a durable `tierExercises[]` of `{ tier, source, blockNumber, timestamp, privilege }`. `evidenceTier` is a computed column, never persisted. No name, no email, no country, no document, no BABT id: the absences are the design and the type refuses them | `05-ONBOARDING.md` section 2.3, which has the record and no placement for it |
| `run` | `runId` | every scheduled execution: `kind` (the eighteen values below), `startedAt`, `finishedAt`, `pinnedBlock`, `itemsRead`, `itemsWritten`, `errorCount`, `complete` (bool), `checkpoint` | section 3, plus the status page |
| `host` | `hostId` | one row per endpoint host: `hostname`, `robotsFetchedAt`, `disallow[]`, `lastRequestAt`, `backoffUntil`, `consecutiveFailures`, `listingCount` | the per-host budget in `05-ONBOARDING.md` 9.2 |
| `sourceState` | `sourceId` | per foreign source: `lastOkAt`, `lastErrorAt`, `lastError`, `selfReportedStatus`, `checkpointBlock`, `lagSeconds`, `nonOkRate` | the freshness strip in `03-TAXONOMY.md` 5.2 and section 8 here |
| `screeningCheck` | `screeningId` | `address`, `role` (`buyer`, `operator`, `payee`, `agentWallet`), `verdict`, `oracleResult`, `listFetchedAt`, `listSha256`, `checkedAt`, `blockNumber` | `09-DISPUTES.md` section 9, kept 5 years |
| `dispute` | `disputeId` | `jobId`, `raisedBy`, `reasonCode`, `state`, the clock at each step, `deciderId`, `verdict`, `remedy`, `funder`, `bundleHash`, `automatedMeansUsed` | `09-DISPUTES.md`, which has `job.disputeId` and no collection to point at |
| `reasonsRecord` | `reasonId` | the six statutory fields: action, scope and duration, facts relied on, whether automated means decided, the rule applied with why, the redress route | `06-QUALITY.md` section 8 and `09-DISPUTES.md`, one per adverse action |
| `evidenceObject` | `contentHash` | `byteLength`, `mediaType`, `jobId`, `slot`, `storedAt`, `deleteAfter`, `deletedAt` | `09-DISPUTES.md` section 2 and the deletion test in section 10 |
| `categoryContract` | `(slug, contractVersion)` | the contract document, `contractHash`, `publishedAt`, `supersededAt` | `03-TAXONOMY.md` section 9, versioning under live listings |
| `canaryCheck` | `checkId` | `url`, `httpStatus`, `latencyMs`, `bodyPrefixHash`, `checkedAt`, `runner` | the availability requirement in `00-PROGRAM.md`, judged Sep 9 to 23 |
| `firstPartyOwner` | `address` | the published operator address list materialised for query speed, with `listHash` and `loadedAt` | `02-THESIS.md` section 10 clause 1, which allows the materialisation while `/first-party.json` stays the source of truth |

The collection is `screeningCheck` and the component is `screening`. An earlier draft used one word for
both, which makes "the screening row" and "the screening component" indistinguishable in prose and a
collision in code. Every other collection here carries a name no component uses.

`run.kind` has one value per row in section 3.5's schedule, plus two jobs that are not on a clock. `jobPoll`
runs once per dispatched long job. `ledgerWalk` runs on demand from `cli` plus once inside the nightly pass.
The eighteen values: `countRead`, `tail`, `hashRefresh`, `sweep`, `probeCycle`,
`feedbackSweep`, `escrowTail`, `escrowReindex`, `scoreRecompute`, `poolSample`, `venueSample`,
`sourceProbe`, `reconcile`, `jobPoll`, `retentionReap`, `sdnRefresh`, `ledgerDump`, `ledgerWalk`. The
three probe rows in 3.5 are one job over three due sets, so they share `probeCycle` and the `run` row
records which due set it served. The enum is exhaustive on purpose: 3.5 promises a `run` row per
execution and section 8 derives every counter from `run`, so a job with no value here is a job that runs
invisibly. The only read with no `run` row is `session` history, because there the live read is the render.

Two things deliberately have no table. **Attestation reads are never persisted**, only cached in memory
for 60 s, because `03-TAXONOMY.md` sets that TTL and a BABT can be revoked: 11.58% of all BABTs ever
minted are revoked or burned (`R10-bab-attestation.md` via `SPINE.md`). `operator.tierExercises[]` is not
an exception to that: it records a privilege we granted at a block, which is our own act, rather than a
copy of the credential that unlocked it. And `07-MATCHING.md`'s decision records are `ledgerEntry` bodies
by its own choice, so ranking decisions add no collection.

### 2.7 Retention and the job that has to prove it deleted

Raw request and response bodies are user content and a job brief can carry a third party's personal
data, so they are deleted at dispute-window close plus a short grace by a scheduled job, leaving the
hashes, ids, amounts, timestamps and screening verdicts (`09-DISPUTES.md`, citing EDPB Guidelines
02/2025 Recommendations 2, 10 and 11 through `R15-compliance.md`). Implementation detail that makes it
real rather than stated: `evidenceObject.deleteAfter` is set at write time, then the reaper deletes the
bytes and sets `deletedAt`. Section 10 carries a test that writes an object with a past `deleteAfter`, runs
the reaper and asserts the file is gone while the row survives. A retention policy with no test is a
sentence.

Screening verdicts are kept 5 years for recordkeeping and are never published. Probe results are kept
indefinitely, because the probe history per agent is the data product nobody else has and it holds no
personal data (`R16-reuse.md` design implication 5).

## 3. The indexing pipeline

### 3.1 Primary: the chain, in two reads

**The count, one call.** `eth_getStorageAt` on the Identity Registry at
`0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00`, the ERC-7201 slot for
`erc8004.identity.registry`, whose first member is `uint256 _lastId`. The head at the time of writing is
**336,088** at block 120,141,168, 2026-09-05T16:17:48Z (`SPINE.md`). The same read returned 334,935 at
block 120,027,164 fourteen hours earlier (`MEASUREMENT.md`), which is the denominator the full sweeps in
this document keep. `totalSupply()` reverts and the contract is not `ERC721Enumerable`, so
this is the only exact count available and ids are contiguous from **0** with no burn function in the
ABI (`R01-erc8004.md`).

**The bodies, one batch per 500 agents.** `aggregate3((address,bool,bytes)[])` `0x82ad56cb` on Multicall3
`0xcA11bde05977b3631167028862bE2a173976CA11` with `allowFailure: true`, three sub-calls per agent:
`tokenURI(uint256)` `0xc87b56dd`, `ownerOf(uint256)` `0x6352211e`, `getAgentWallet(uint256)` `0x00339509`.
Measured at 183 agents per second, about 30.5 minutes, 670 `eth_call`s and 0.27 GB for the whole registry
on a keyless endpoint. 1,500 sub-calls fit one `eth_call` and 2,500 hits the node's 30 second timeout, so
500 agents per batch is the ceiling with headroom (`R01-erc8004.md`).

Starting at id 0 matters. Our own earlier spine hard-coded `ownerOf(1)` and started the sweep at 1, which
silently drops agent 0, an agent that exists and is named `dAi` (`R16-reuse.md`, `MEASUREMENT.md`).

### 3.2 The resolver, six shapes and a guard

`tokenUri` is hostile input. The measured mix across 544 and then 600 sampled agents: `https://` about
half, `data:application/json;base64` about half, `ipfs://` 2 of 544, empty 14 of 600, freeform text that
is not a URI 3 of 600, plus **6 of 544 carrying `data:application/json;enc=gzip;level=6;base64,`** which
is a gzip stream and fails `JSON.parse` after a plain base64 decode (`R01-erc8004.md`,
`MEASUREMENT.md`). All six shapes are handled, the resolver returns null rather than throwing, then every
outcome is recorded in `registrationParsed` with `registrationError`.

Two rules on top. **A 200 is not existence**: `https://evoevo.ai/.well-known/agent-card.json` answers 200
with `text/html` and 74,239 bytes, so a JSON content type or a successful parse is required before
anything counts as a document (`R12-agent-comms.md`). **Both spellings of two keys are read**, because
`x402support` appears alongside `x402Support` and `supportedTrusts` alongside `supportedTrust` on about
5% of documents each. Reading only the spec spelling mislabels roughly one agent in twenty on the
two fields the sponsors care about most (`R01-erc8004.md`).

Every fetch the resolver makes goes through the egress client in section 7.3. About 5% of off-chain URIs
404 or return HTML and two sampled hosts do not exist in DNS at all, so the failure path is the common
path.

### 3.3 Change detection, which is where the log tail lives

There is no push path for a changed agent. 8004scan has no `updated_after` filter, no since-block cursor
and no agent webhook, its six webhook events are validation, feedback and star only, then its `updated_at`
moves for reasons unrelated to content (`R05-8004scan-api.md`). So change detection is ours, in two
layers:

1. **The hash diff, which always works.** Every sweep recomputes `tokenUriHash` per agent and re-resolves
   only where it changed. That is one `aggregate3` per 500 agents and it needs no logs.
2. **The log tail, bounded to what the endpoints allow.** `URIUpdated` topic0
   `0x3a2c7fffc2cba7582c690e3b82c453ea02a308326a98a3ad7576c606336409fb` and `MetadataSet` topic0
   `0x2c149ed548c6d2993cd73efe187df6eccabe4538091b33adbd25fafdb8a1468b` over the newest window, in chunks
   of at most 5,000 blocks, which is the cap on the free endpoints. `MetadataSet` is filtered on topic1 by
   `keccak` of the key, never by the string, because an indexed `string` topic is always the hash:
   `agentWallet` is `0x2ac6109326e720d1435c0db66f7e35eda7839f52b6f1f5520a60788e132b4e39`
   (`R01-erc8004.md`).

The tail also picks up the three `NewFeedback` fields that exist **only in the log** and are not in
storage at all: `endpoint`, `feedbackURI` and `feedbackHash`, at topic0
`0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc` (`R01-erc8004.md`). Feedback counts
themselves come from `getClients` plus `getLastIndex` over every id, which is a pure `eth_call` sweep that
took about 4 minutes with zero call errors across all 334,935 ids (`MEASUREMENT.md`), so nothing about the
reputation surface depends on log availability.

The log tail is best effort by design. If an endpoint refuses the range, the run records the refusal in
`run.errorCount`, the hash diff covers the same ground more slowly and the status page says which path is
live. Nothing in the product depends on a from-genesis scan.

### 3.4 The second index, as a cross-check with its lag on screen

Two foreign sources, both read asynchronously, neither ever blocking a render.

| Source | Read | Limits and traps |
| --- | --- | --- |
| 8004scan | `GET /api/v1/agents/56/{id}` for a listed agent, `/status/indexers/direct` plus `/status/freshness` for its own lag, `GET /ipfs/fetch?cid=` to recover a `feedback_uri` body | anonymous 30 a minute and 1,000 a day per IP, a self-service key 600 a minute and 100,000 a day, `limit` capped at 100 and any `User-Agent` except `Python-urllib/*`, which Cloudflare 403s even with a valid key. `offset=100000` took 28.85 s, so deep offset pagination is never used. Retry every 5xx, because the same URL flaps 200, 500 then 404 |
| trust8004 | `GET /api/v1/chains` for its published lag, `GET /api/v1/catalog/agents?chainId=56&afterId=0&limit=100` for a keyset catalogue | it reports `validation: null` on BSC, which is wrong: the Validation Registry is deployed at `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58` with `getVersion()` `2.0.0` (`R01-erc8004.md`) |

One write lever is used deliberately.
`POST https://api.8004scan.io/api/v1/agents/verify-endpoint/56/{token_id}` needs **no auth** and is capped
at once per hour per agent. It demonstrably runs: it rewrote a live agent's
`endpoint_verification_error` and moved `updated_at` inside the estimate it returned. Muster fires it for
shelved rows only, at most hourly per agent, then reads the result from `updated_at` and the error string.
It never reads `endpoint_last_checked_at`, which stayed frozen at 2026-05-20 through a verification that
ran (`R05-8004scan-api.md`).

Nothing foreign is ever displayed as ours. A foreign field carries their name, their timestamp and their
own status. Their v5 score is cited with its published weights (engagement 0.30, service 0.25,
publisher 0.20, compliance 0.15, momentum 0.10, band floor 30.0 ceiling 55.0) beside our own evidence
rather than as a sort key (`R05-8004scan-api.md`).

### 3.5 The schedule and the freshness target per stored field

`03-TAXONOMY.md` section 7 owns what a buyer reads and the age at which each field stops being current.
This is the writer side: the job that has to run often enough to meet that ceiling, with the measured cost
that sets the cadence. Every run writes a `run` row, so the status page reports what actually happened
rather than what was configured.

| Stored field group | Written by (`run.kind`) | Ceiling it has to meet | Cadence | Measured cost |
| --- | --- | --- | --- | --- |
| agent count and the block it was read at | `registry-reader` (`countRead`) | 30 s | every 30 s | one `eth_getStorageAt` |
| new agents since the last run | `indexer` tail (`tail`) | 30 s | every 30 s | one `aggregate3` over the `_lastId` delta. Between 1,940 and 2,110 registrations a day across the two windows measured, with the rate itself moving (`SPINE.md`), so the delta is about one id and a 30 s tail never falls behind |
| `agent.*` for the whole registry | `indexer` full sweep (`sweep`) | 6 h | every 6 h | 30.5 min, 670 `eth_call`s, 0.27 GB, no key |
| `tokenUriHash` for listed agents plus the shelf candidate set | `indexer` (`hashRefresh`) | on every sweep | every 30 min | one `aggregate3` for a few hundred agents |
| `probeResult`, `reachabilityTier`, conformance for a `live` listing | `prober`, `conformance` (`probeCycle`) | 5 min | every 5 min | one request per declared surface |
| the same for a `probed` or `in_review` listing | `prober` (`probeCycle`) | 60 s | every 60 s | as above. A listing about to go live is the one we know least about |
| the same for a `stale` listing | `prober` (`probeCycle`) | 60 s while recovering | every 60 s for 10 min, then every 5 min | as above. Fast recovery, then no hammering a host that is down |
| the same for an indexed candidate in one of the four categories | `prober` (`probeCycle`) | 6 h | every 6 h | as above |
| feedback graph | `indexer` (`feedbackSweep`) | 1 h | every 1 h | `getClients` plus `getLastIndex` over every id, about 4 minutes, 0 call errors |
| ERC-8183 job state and per-provider counts | `escrow-index` (`escrowTail`, `escrowReindex`) | 10 min | 10 min tail, full reindex daily | full re-index of 56,713 jobs in 455.6 s |
| `musterScore` triple | `quality` (`scoreRecompute`) | 10 min | on every settled job plus a nightly pass at a pinned block | trivial, the job set is small |
| pool state, oracle marks, in-range series | `sampler` (`poolSample`) | 30 s oracle, 60 s pool | every 60 s, oracle every block window | a few dozen `eth_call`s a minute |
| venue parameters: collateral factors, thresholds, incentives, pause flags | `sampler` (`venueSample`) | 1 h | hourly | one batch. They move on a governance vote |
| `sourceState` for each foreign source | `reconciler` (`sourceProbe`) | 15 min | every 5 min, cached | one call, retried |
| implementation drift on three registries, three tokens and `policyWhitelist()` | `reconciler` (`reconcile`) | on every sweep | every 6 h | **six** `eth_getStorageAt` reads plus one call. Read live today, each of the six slots holding a distinct implementation |
| `evidenceObject` bytes past their `deleteAfter` | the retention reaper in `worker` (`retentionReap`) | deleted inside 1 h of the deadline | hourly | a scan of rows whose `deleteAfter` has passed, then an unlink each. `09-DISPUTES.md` makes this a commitment rather than an intention |
| the SDN list behind `screening` | `worker` (`sdnRefresh`) | 24 h | every 6 h | one download plus a sha256. Above 48 h the quote path refuses rather than passing on a stale list. `/status` says which |
| the signed nightly dump of `ledger`, decisions and probe history | `worker` (`ledgerDump`) | one dump inside 24 h, 7 kept | nightly | one file, hashed in `worker` then signed by `facilitator` over the socket, so the dump needs no second copy of the key. `14-GAPS.md` asks for it and named no other owner |
| `session` history rows | `session-panel` | per render, no cache | on demand only | the live read is the render |

Three conflicts between sibling documents are settled here, because this document builds the scheduler.

**A `live` listing is probed every 5 minutes, not every 10.** `05-ONBOARDING.md` section 9.1 says 5
minutes and an earlier pass of `06-QUALITY.md` section 8 said 10. The binding constraint is
`02-THESIS.md`'s H3, a passing probe no older than 15 minutes at render time, plus the 5 minute display
ceiling in `03-TAXONOMY.md`.
At 5 minutes, one pass then two failures reaches the edge, so the window is never crossed silently. At 10
minutes a single missed cycle crosses it. `05-ONBOARDING.md` owns the probe schedule per `SPINE.md`, so
its number wins. 06 now cites 5 minutes with its own 10 recorded as withdrawn.

**The full sweep runs every 6 hours, not daily.** `03-TAXONOMY.md` sets a 6 hour display ceiling on
sweep-derived fields. A 30.5 minute keyless
sweep four times a day meets the tighter number at no cost, so 6 hours is the target and daily is the
floor that must never be missed. A sweep that does not complete leaves `run.complete` false and its rows
keep the previous `sweepId`, which is how a partial index is caught before it is displayed.
`05-ONBOARDING.md` section 9.1 and `06-QUALITY.md` section 8 both carry the 6 hour figure with daily as
the floor, so no sibling still prints daily as the target.

**The `_lastId` tail runs every 30 seconds, not every minute.** An earlier pass of
`05-ONBOARDING.md` section 9.1 put the
tail on the `_lastId` delta at one minute. One `eth_getStorageAt` plus one `aggregate3` over a delta of
about one id costs nothing at 30 s. That is also the ceiling `03-TAXONOMY.md` sets on the count a landing
page shows, so the display's number wins and both siblings now carry 30 s. Every other cadence in the
table above is `05-ONBOARDING.md`'s
own, restored where an earlier draft of this table flattened it: the `stale` row decays from 60 s to 5
minutes after 10 minutes rather than probing at 60 s forever. `in_review` keeps its own 60 s row instead of
being folded into `stale`. Both matter for the same reason, an off-shelf row must not spend a contested host
budget at the live cadence.

### 3.6 The RPC pool, with a capability assertion instead of a hope

Three endpoints. A role per job rather than per endpoint. A boot probe run at the width the work uses.

| Endpoint | Role | Why | Verified property |
| --- | --- | --- | --- |
| `https://bsc-rpc.publicnode.com` | interactive reads, quotes, the render path | 200 JSON-RPC calls in 0.9 s warm | its operator's terms prohibit "any data mining, robots, scraping, or similar data gathering or extraction methods", so it is not the sweep endpoint (`R15-compliance.md`) |
| `https://bsc.rpc.blxrbdn.com` | the full sweep, the log tail, the feedback sweep | fastest keyless batcher measured, 200 calls in 0.27 s and it answered every deep log query needed | 5,000 block log cap. Its terms are **unread**, so it is a `DATA-SOURCES.md` row before the repo flips |
| `https://bsc-dataseed.binance.org` | third in the failover order, single-call only | first party and always up | **it silently truncates a JSON-RPC array batch above about ten calls** and refuses `eth_getLogs` with `-32005 limit exceeded`. Its terms are unread too |

**The boot probe runs at sweep width, because a narrow probe passes the one endpoint it exists to catch.**
Measured today against all three: `bsc-dataseed.binance.org` returned 2 of 2 results at two calls, 10 of
10 at ten, then **1 of 200** at two hundred, every response HTTP 200. A two-call probe therefore certifies
the truncating endpoint as batch-capable, which is worse than no probe. So the probe sends the shape the
sweep sends, 200 calls minimum with a distinct `id` per call, then asserts three things: the body parses
as an array, its length equals the request length and every `id` sent came back. An endpoint that fails
one of the three is marked no-batch for the session and serves single calls only. The two-call form stays
as a reachability smoke test, never as the capability test. Silent truncation looks like data loss rather
than an error, which is the expensive shape (`MEASUREMENT.md`).

A 429 from publicnode arrives with a complete and correct body, so a well-formed array is treated as
success rather than thrown away.

Two research findings are overturned by that run, so both are recorded rather than quietly dropped.
`R15-compliance.md` measured publicnode answering HTTP 403 to a 5-item and a 20-item batch. Today the same
endpoint returned 200 with 200 of 200 results, which reproduces `MEASUREMENT.md` and not R15. R15 also
recommends keeping `bsc-dataseed.binance.org` as the batch-capable fallback. The truncation measurement
beats that recommendation, so dataseed is the single-call fallback and never a batch target.

Which endpoint each job gets, named per job:

| Job | Endpoint | Shape |
| --- | --- | --- |
| the render path, quotes, the boot assertions | publicnode | single calls where latency is what matters |
| the registry full sweep and the 30 s tail | blxrbdn | 670 sequential `eth_call`s to Multicall3, so batching is irrelevant and the terms decide |
| the log tail | blxrbdn | `eth_getLogs` in 5,000-block chunks |
| the feedback sweep, 334,935 `getClients` calls | blxrbdn, only while the boot probe marks it batch-capable | array batching is what earns the 4 minute figure |

**The fallback when no endpoint is batch-capable.** The feedback sweep runs sequentially, which turns 4
minutes into hours, so its cadence drops from hourly to once per full sweep and the 1 h ceiling on the
feedback graph renders as relaxed on the status page with the reason. The alternative, batching into an
endpoint that truncates, drops 199 of every 200 results with no error at all. A slower number that is
published beats a fresh number that is wrong.

### 3.7 The reconciliation job

Six comparisons, one job, every 6 hours plus on demand. Each one writes a `run` row and a `sourceState`
row. Each has a defined action on a mismatch. Nothing here hides a disagreement, because publishing
the disagreement is the Data Quality argument.

| Check | Compares | On mismatch |
| --- | --- | --- |
| R1 count | `_lastId` against `count(agent)` at the sweep's pinned block | the sweep is marked incomplete, the delta renders on the status page and the landing count carries the words "sweep in progress" with the delta |
| R2 escrow | `jobCounter()` `0x50355d76` against the highest indexed `escrowJobId` | reindex the gap. Jobs are 1-indexed and `getJob(0)` returns an empty struct, so a zero-provider row is an empty slot rather than an error (`R16-reuse.md`) |
| R3 feedback | our summed `getLastIndex` total against what the foreign index reports | publish both, with the share. On the day we measured it was 29,712 on chain against 11,780 indexed, so 39.6% |
| R4 source agreement | for every listed row plus a fixed random sample, our record against 8004scan and trust8004, field by field | render the disagreement in the listing's provenance block with each side's timestamp. Never silently prefer one |
| R5 implementation drift | the EIP-1967 slot on the three registries against the pinned implementations `0x7274e874…`, `0x16e0FA7f…` and `0xDB31f5d9…`, the same on the three EIP-3009 tokens against `0xbef21313…` for `$U`, `0x694aa534…` for USD1 and `0xa6b2c3d2…` for FDUSD, plus `policyWhitelist()` on the ERC-8183 router. All six slots were read live on 2026-09-05 and each holds a distinct implementation | raise the banner on every page, keep every read working, flip `hire.enabled` false so the hire button renders its reason instead of vanishing. Then re-fingerprint the new implementation: same selector set from a PUSH4 enumeration, same `DOMAIN_SEPARATOR()` on a token, same `getVersion()` on a registry means the upgrade changed nothing we read, so the check clears itself and pins the new address. Anything else holds the degraded state until a human clears it, which is the only path that needs one. Identity and reputation sit behind a 3-of-5 Safe and validation behind a **single EOA**. Three implementations in this stack have each moved once inside a fortnight (`R01-erc8004.md`, `01-GROUND-TRUTH.md`) |
| R6 receipt recompute | a sample of published receipts re-derived from their own `recomputeCommand` | mark the receipt as unreproducible on its page and open an incident. A receipt that does not recompute is worse than no receipt |

R1 is the one that protects the headline. The count on the landing page is our own storage read with its
block height beside it, then the foreign count as a second row carrying the endpoint that served it and
its own lag: 304,281 from `/stats/global` against 334,935 on chain at block 120,027,164, so a shortfall of
30,654, with the same vendor's list endpoint answering 303,461 in the same window. Publishing all three,
each against the endpoint it came from, turns a 30,654 agent shortfall plus an 820 agent self-disagreement
from an embarrassment into the point being made (`SPINE.md`, `MEASUREMENT.md` design implication 1).

### 3.8 Queues, backpressure and politeness

One work queue per job kind, ordered by due time then by shelf position, so a `live` listing on a shelf is
always probed before an off-shelf candidate. The probe budget is **per host, not per listing**, because 229
distinct endpoint URLs in the sample sit on 9 hosts with `evoevo.ai` holding 217 of them. A per-listing
limit would point 217 requests at one host at once (`MEASUREMENT.md`, `05-ONBOARDING.md`).

The rules, the same ones the census ran under: `robots.txt` fetched first and its `Disallow` honoured, one
request per 1.5 s per host, an 8 second timeout, one retry and only on a network-layer failure, a user
agent that says what the request is for, `If-None-Match` on refetch and a 304 treated as a successful
probe.

**The ceiling, recomputed against the cadence rather than against the freshness edge.** One request per
1.5 s is 40 a minute, so **200 requests per host per 5 minute cycle**. A `live` row costs one request per
declared surface each cycle, so one host carries **200 single-surface live rows or 100 two-surface rows**.
The 60 s recovery cadence, the review queue and the 6 hourly candidate pass all spend from the same 200.
The earlier figure of 600 rows per host came from the 15 minute freshness edge rather than from the 5
minute cadence, which is H3 with no margin left and contradicts the reason 5 minutes beat 10 in section
3.5. Two numbers per host render on the status page: the configured ceiling and the count in use.

**Above the ceiling a row does not rotate, it does not go live.** The live count per host is capped at the
ceiling and the excess is held at `visibility: indexed` with the reason published on the row, in the queue
order that decides which row takes the next free slot. A rotating row is by definition a row whose newest
passing probe is older than its own cycle, which section 4.1 step 5 withdraws from the shelf and
`05-ONBOARDING.md` names as an explicitly rejected alternative, so rotation would only manufacture shelf
rows nobody can hire. With `evoevo.ai` holding 217 of 229 sampled endpoint URLs the cap binds on that host
before any other. It binds late in practice, because one listing per `(agentId, category)` plus 12 of 600
agents reaching T2 keeps the `live` rows on any one host few. The 6 hourly candidate pass is what actually
spends the budget.

Backpressure is explicit. When a queue's due set exceeds what the budget can serve, the queue sheds from
the back (off-shelf candidates first, then never-answered rows at 24 h) and the status page publishes the
shed count. A silently growing queue is how a freshness claim becomes false.

## 4. Sequence flows

Six flows, in text, each naming the component, the read, the write and the failure branch. No flow blocks
on a foreign source at any step. The four that need a worked example each take a different category, so no
flow is written against one shelf: browse opens `grid`, compare puts two `rebalancing` rows side by side,
the brokered hire buys a `yield` read and the long job is a `health-factor` watch with no fixed end.

### 4.1 Browse

1. A stranger opens `/` with no wallet, no login and no email. `web` reads `/flags.json` for that request,
   then renders from the store only.
2. `web` reads the four shelf headers from materialised counts written by the last `probeCycle` and the
   last sweep: rows shelved, rows that answered inside the last hour, hires settled in this category.
   **Every one of those three is split**, the third-party figure as the headline then ours in a second
   figure beside it, which is clause 3 of `02-THESIS.md` section 10. The split is a join against
   `firstPartyOwner`, so it cannot be forgotten the way a stored flag can.
3. `web` reads the freshness strip from `run` and `sourceState`: our sweep block and age, then each
   foreign source's own age and self-reported status.
4. The visitor opens `/c/grid`. `web` reads the contract summary from `categoryContract`, the banded list
   from `listing` ordered by `evidenceTier` then by the ranking function, the one exploration slot, then
   the off-shelf drawer counted by `probeResult.failureClass`.
5. **Failure branch.** If the newest passing probe for a row is older than 15 minutes the row is `stale`
   and does not render on the shelf. If a whole shelf has no hireable row it renders its candidate list
   with the named failure per candidate, which is the honesty clause in `02-THESIS.md` section 12. If the
   reason every row went `stale` is that the probe loop stopped rather than that the hosts went down, the
   page says that: it names the probe outage with the last `probeCycle` finish time from `run` instead of
   attributing a failure to each host. That is the same rule as `14-GAPS.md`'s `probe.enabled` effect, a
   check age that keeps counting up is honest and a frozen timestamp is not.
6. Nothing on this path touches a key, a foreign API or an outbound fetch.

### 4.2 Compare

1. The visitor selects up to four `rebalancing` listings from a shelf or from search. Selection is a query
   parameter, so
   the URL is shareable and needs no session.
2. `web` renders all 30 comparison rows from the store, each with its unit, its source and its age, then
   the per-category output block under them (`03-TAXONOMY.md` sections 7.2 and 7.3).
3. For the three fields that cannot be cached (the session allowlist, the cap and the expiry) `web` calls
   `session-panel`, which reads `canExecutePackedInfos(bytes32)` `0xe5adda71` and `spendInfos(bytes32)`
   `0xdcc09ebf` on the agent's own wallet plus `getExpiry` `0x3b49ad47` and `isValidKey` `0x8fd4f06b` on
   the Keystore at `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a`, on every render.
4. Any field with no fresh read renders one of the six unknown states rather than a zero.
5. **Failure branch.** A chain read that times out renders `unknown, check failed (timeout)` for that cell
   and the rest of the row still renders. One dead cell never blanks a comparison.

### 4.3 Hire, the brokered path

1. The buyer presses hire on a `yield` listing. `matcher` runs stages 1 to 6 of `07-MATCHING.md` against
   our own store and one
   pinned block, top K = 5 and writes the decision record as a `ledgerEntry` body.
2. `screening` checks the buyer, the operator, the payee and the agent wallet against the Chainalysis
   oracle `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` with `isSanctioned(address)` `0xdf592f7d` plus our
   own SDN ingest and writes a `screeningCheck` row carrying both halves. A hit on either blocks the quote
   and writes a `reasonsRecord`.
3. `broker` requests a quote from the chosen listing, verifies `signerRecovered` against `job.provider`,
   sets `signerMatchesProvider`, then writes a `quote` row with `screeningId` and an `expiresAt` at most
   180 s ahead, so the signature and the price cell expire together (section 2.3).
4. `broker` reads `getAgentWallet(agentId)` `0x00339509` at the quote block and stores it as the only
   permitted `payTo`. The payee comes from chain, never from a form field.
5. The buyer signs one EIP-3009 `TransferWithAuthorization` in their wallet, `validAfter` 0,
   `validBefore` now plus 300, a 32-byte CSPRNG nonce. No transaction from the buyer. The 300 s
   authorisation window outlives the 180 s quote on purpose, so a settle already in flight cannot expire
   mid-submission. `facilitator` still refuses to settle against an expired quote.
6. `broker` reserves the `Idempotency-Key` **before** any payment step, then asks `facilitator` over the
   unix socket to verify then settle. Reservation before settlement is the ordering that stops a client
   timeout costing the buyer twice (`04-AGENT-PROTOCOL.md`, `R12-agent-comms.md`).
7. `facilitator` refuses any `payTo` other than the recorded one, submits `transferWithAuthorization`
   `0xe3ee160e` paying about 103,377 gas at 0.05 gwei and returns the hash. `payment.state` is
   `settlement_pending` until the receipt confirms, never a boolean.
8. `broker` dispatches the job, records `requestHash`, polls to a terminal state, records `responseHash`
   under the declared `deliverableRule`, writes the `receipt` and appends two `ledgerEntry` rows, one
   `payment.principal` and one `payment.fee`.
9. **Failure branches.** A settle that broadcasts but cannot be confirmed stays `settlement_pending` with
   its tx hash recorded and is reconciled on chain rather than treated as a refusal. A refusal from the
   agent naming a declared condition is a **success** with `terminalState` set to that refusal. A quote
   that expired before signature is re-requested rather than resigned.

### 4.4 A long job

1. The priced resource is the create call, not the work. A `health-factor` watch has no fixed end, so
   `POST /jobs` validates, reserves capacity and
   returns a job id in seconds. The 402 challenge for it names `extra.paymentFlow` as `upfront` or
   `escrow` and never `authorization`, because settling a three-day-old EIP-3009 authorisation is settling
   an expired one (`R12-agent-comms.md`).
2. `broker` settles first, then creates, then answers 202 with `Location`, `Retry-After` and the job
   resource.
3. Polling is free and rate-limited rather than priced. Charging per poll would make the meter a function
   of the buyer's client rather than of the work.
4. `broker` stores every poll's `progress`, `partial` artifacts with their append and last-chunk flags,
   plus any `nonTerminalErrors`, so a poller that arrives late still reads everything produced so far.
5. Anything genuinely incremental is a **new** priced call against the same job id, so each 402 exchange
   still covers one bounded execution.
6. Where the work is escrowed, `escrow-index` follows the on-chain leg: `JobFunded`, `JobSubmitted` with
   its `bytes32 deliverable`, then `JobInitialised` topic0 `0x979e9cbf…3a8d`, which is emitted by the
   **policy** rather than the kernel and is the only on-chain home of the deliverable pointer, so an
   indexer watching the kernel alone captures jobs whose deliverable it cannot retrieve
   (`R02-erc8183.md` via `09-DISPUTES.md`).
7. `settler` calls `settle(jobId, evidence)` `0x39c2ebb9` once `submittedAt + disputeWindow` elapses. On
   mainnet that window is **604,800 s** and on testnet the whitelisted policy
   `0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA` uses **900 s**, which is why the testnet loop can close
   inside one sitting while a mainnet job funded on 2026-09-08 settles around 2026-09-15, mid-judging.
8. **Failure branch.** The page shows a mainnet escrow job as an in-flight hire with its job id and its
   auto-approval date. Nothing is described as COMPLETED before it is.

### 4.5 A dispute

1. At `terminalAt` the `broker` seals the bundle: `bundleHash` is the keccak256 of a canonical manifest of
   `(slot, value or content hash)` pairs, appended to the `ledger` with its `prevHash` and `entryHash`.
2. A buyer opens a dispute from the receipt page. `dispute` is written with the reason code, the clock and
   the `bundleHash`. From then on neither side adds to the bundle except through the dispute's own
   submission slot.
3. The decider reads only what was sealed: terms, promise, request, probe state at dispatch, session state
   at dispatch, delivery, timing, payment, screening, the escrow leg and any refusal.
4. The verdict writes a `reasonsRecord` with the six statutory fields, updates `dispute`, then renders on
   the public dispute log with the clock actually taken at each step.
5. The remedy runs through the rails in `08-MONEY.md`. No mutation of a sealed bundle at any point. Any
   later edit is detectable by recomputing the manifest.
6. **Failure branch.** Where the evidence is absent the default in `09-DISPUTES.md` applies and the record
   says which side the default went to and why.

### 4.6 Onboarding an operator

1. `pre_check`. Anyone runs preflight against an `agentId` with no claim. `conformance` runs the eleven
   hard gates `04-AGENT-PROTOCOL.md` section 10 orders cheapest first, C01 to C04, C06 to C09, C11 and C12
   plus C29, publishes a findings report at a permanent URL and writes `probeResult` rows.
2. `claimed`. The operator signs a nonce. `web` verifies `isAuthorizedOrOwner(address,uint256)`
   `0xd95e72be` on chain, which also accepts `isApprovedForAll`, so a delegated operator can run a fleet
   without holding the tokens (`R01-erc8004.md`). The listing is created at `visibility: indexed`.
3. `linted`. The field lint runs, zero hard findings required and the full findings list is published
   including the soft ones.
4. `probed`. Every hard gate in `05-ONBOARDING.md` section 7 passes against the live endpoint, including
   the decimals gate, which reads the declared token's `decimals()` on chain and recomputes its
   `DOMAIN_SEPARATOR()` from `extra.name` and `extra.version`.
5. `in_review`. A human judges what a probe cannot. `listing.approvedTokenUriHash`,
   `approvedFieldsHash` and `reviewedCardHash` are pinned at approval, the third being the card hash probe
   C05 compares on every cycle (`04-AGENT-PROTOCOL.md`).
6. `live`. A shelf row, a hire path, a compare row. From here `prober` runs every 5 minutes and the
   drift probe re-reads all three pinned hashes every cycle.
7. **Failure branches, all reversible on the same `agentId`.** A rejection re-enters at `linted`, so the
   agent's earned standing survives a fix. A stale probe flips to `stale` with no loss of standing. A
   private, loopback or link-local resolution suspends immediately with no retry, because that is a hostile
   change rather than an outage. An edit while `in_review` is refused.

## 5. The stack

Every row names what it replaces. Two constraints shaped most of it. The third-party inputs in
`10-DOCS-AND-POLICY.md` already carry a read and quotable grant, so adding a dependency means adding a
`DATA-SOURCES.md` row. And a 30.5 minute sweep plus a 5 minute probe loop means the process has to be
long-lived rather than serverless.

| Layer | Choice | Why | Rejected |
| --- | --- | --- | --- |
| Language and runtime | TypeScript on Node 22 | one language across `web`, `worker` and `cli`. The money path shares its typed-data code with the browser signing page | Python: the two traps we measured are Python-shaped, its default user agent gets a Cloudflare 403 from the index even with a valid key (`R05-8004scan-api.md`) and `ipaddress.is_global` passes multicast and NAT64 (`R12-agent-comms.md`) |
| Runner | Node, not bun | Next.js on Node is the path with no unknowns | bun: our carried spine typechecks and probes green under bun (`R16-reuse.md`), but putting an unverified runtime under the render path with three days left buys nothing. The port is a task in section 9 with its own check |
| Web | Next.js, App Router, server rendered | the landing page, the four shelves, the listing page and Compare have to be readable with scripting off, which is `03-TAXONOMY.md`'s biggest mobile decision. MIT, already in `NOTICE` | a client-rendered SPA: a rival's landing page renders `--` for three of four headline metrics because it single-sources a foreign index client side (`R14-rivals.md`) |
| Hosting shape | one always-on process per role on a machine we already run | a 30.5 minute sweep, a 5 minute probe loop and a unix-socket key holder | Vercel or any serverless host: a function cannot run a 30 minute sweep, there is no persistent volume for the blob store and the relayer key would sit in a multi-tenant platform environment |
| Chain reads | viem | one library for reads, typed data and signature recovery. MIT, already in `NOTICE` | ethers: no advantage here and a second grant row |
| Wallet at hire | wagmi over injected EIP-1193, with the chain-switch fallback on error 4902 | the wallet is requested at hire and nowhere earlier. `12-BINANCE.md` owns which wallets are named | WalletConnect only: another dependency and another grant for a path an injected wallet already serves |
| Store | SQLite in WAL mode, one file, one write path, through the runtime's own `node:sqlite` on Node 22.22.2 | in-process reads, no network hop on the render path, 335k rows plus the probe history on one disk. It is part of Node, so it adds no dependency and no grant row. Verified locally today: `DatabaseSync`, `journal_mode` `wal` and `busy_timeout` 5000 all answered. It is flagged experimental and prints a warning at load, which is a stability note rather than a licence question | Postgres: a second service to operate for no gain at this size. Redis: the queue is a table and nothing needs a second datastore. `better-sqlite3`: a native build plus one more grant to read, for an API the runtime already ships |
| Indexer shape | our own sweep over Multicall3 | `eth_getLogs` is capped at 5,000 blocks on the free endpoints and refuses archive depth | a subgraph or a log-tailing framework: both need the log history the endpoints will not serve |
| Sanitizer | our own deterministic screen first, then `isomorphic-dompurify` 4.1.0 | the deterministic gate cannot be waived by anything downstream, which is the property that matters. `(MPL-2.0 OR Apache-2.0)`, we take Apache-2.0 and say so in `NOTICE` | a sanitizer alone: it would run after a model call rather than before one |
| Icons and type | `lucide-react` (ISC), Inter (OFL-1.1) | already in `NOTICE` with their terms | an icon font from a CDN: a third-party request on every page and no grant read |
| Tests | the built-in `node:test` runner, plus HTML assertions over fetched markup | zero new dependencies, zero new grant rows and asserting over server-rendered HTML is exactly the scripting-off contract | a browser driver: another large dependency and half a day of setup, for a JS path that gets one recorded manual pass instead |
| Solidity | **none ships** | no escrow of ours, no bond contract, no hook. Escrow rides the official ERC-8183 stack (`three/decisions/08-money-no-own-escrow.md`) | deploying our own kernel: we cannot even register a policy on the shared router, `setPolicyWhitelist` is owner-only |
| Chain tooling in gates | `cast` from Foundry | the gates in section 11 are the same commands a judge can paste | a bespoke script for a check a one-line `cast` call already makes reproducible |
| CI | GitHub Actions on the private repo, plus one `make check` that runs the identical suite locally | the publish step is gated on the same commands either way | a hosted CI with a new account: nothing to gain three days out |

Any dependency added after this list needs its grant read and quoted in `DATA-SOURCES.md` before it ships,
which is the publish gate in `10-DOCS-AND-POLICY.md` rather than a preference. This document adds three
rows to that file and no library. Caddy, the reverse proxy in section 6.1, is the one dependency whose
licence `R15-compliance.md` did not read, so it stays **unverified** until it is quoted.
`bsc.rpc.blxrbdn.com` and `bsc-dataseed.binance.org` are data sources whose terms nobody has read: R15
reviewed publicnode's terms and neither of those two, so each needs a quoted clause or an explicit "no
terms found" note before the flip, the same way R15 already handles the OFAC row. The store adds nothing at
all, because `node:sqlite` ships inside the runtime.

## 6. Deployment

### 6.1 Topology

One Linux machine we already operate, seven units under systemd, one reverse proxy in front:

```
caddy            :443  TLS, automatic certificate, HSTS, the security headers in section 7.5
  -> muster-web        127.0.0.1:3000   Next.js, api, mcp, status, matcher, broker
  -> muster-worker     no listener      the scheduler and every job in section 3.5
  -> muster-facilitator unix socket     the only hot key, no TCP port at all
  -> agent-rebalancing 127.0.0.1:3101   first-party reference agent, /agents/rebalancing
  -> agent-grid        127.0.0.1:3102   /agents/grid
  -> agent-yield       127.0.0.1:3103   /agents/yield
  -> agent-health      127.0.0.1:3104   /agents/health-factor
/var/lib/muster/muster.db               SQLite, WAL
/var/lib/muster/blobs/<hh>/<hash>       content-addressed evidence objects
/var/lib/muster/dumps/<date>.jsonl.sig  the nightly signed dump, 7 kept
/etc/muster/relayer.key                 0600, user muster, opened by muster-facilitator only
/etc/muster/ledger.ed25519              0600, user muster, same
/etc/agents/<slug>/wallet.key           0600, user agent-<slug>, that agent's Altana admin signer
/etc/agents/<slug>/session.key          0600, user agent-<slug>, the session signer under its allowlist
```

The four agent units are the Altana track's entire surface, so they are deployed here rather than assumed.
Each runs as its own service user and opens only its own two key files, so no Muster process can read
either. Each has restart policy `always` with the same bounded backoff as the rest. Each is reachable
through caddy on its own path, so a judge can call it without going through Muster at all. The single
`/.well-known/agent-registration.json` on that host carries one `registrations` entry per agent id, which
is how one hostname proves four agents instead of needing four certificates (`R12-agent-comms.md` for the
rule). A crash costs that one category's hire path and nothing else: the row keeps rendering, the probe
records the failure inside a cycle and the shelf withdraws the row at 15 minutes.

Restart policy is `always` with a bounded backoff and each unit logs one structured JSON line per request
or per job to the journal. `worker` resumes a sweep from `run.checkpoint`, so a restart mid-sweep costs
seconds rather than a re-read.

A new paid host is deliberately not introduced. Spending real money is an operator decision, so the build
runs on capacity that already exists and the one line that does need money is isolated in section 6.4.

### 6.2 The public URL

`https://muster.brainonbnb.com`, a subdomain of a domain we already control. That domain already serves
`/.well-known/agent-registration.json` over HTTPS with a 200, `application/json`,
`Access-Control-Allow-Origin: *` and `cache-control: public, max-age=300` (`R12-agent-comms.md`), so the
apex is proven rather than assumed and the subdomain needs one DNS record plus one certificate issuance.

The certificate has to match the exact hostname served. The reference failure is in our own research:
`clawnews.io` resolves, redirects correctly and serves a certificate for `*.up.railway.app`, so every
browser and every probe fails it at TLS while a naive HTTP check reports it fine (`MEASUREMENT.md`).

Two more properties are read and recorded rather than left to a default, both of them asked for by
`14-GAPS.md`. The certificate's `notAfter` is read at issuance and asserted **later than 2026-09-23**, the
last day of judging. If it lands earlier the gate fails on 2026-09-06 and the certificate is reissued
then, which is a decision made at leisure rather than mid-judging. The check re-runs on every canary run,
so a failed renewal inside the window surfaces as a red run instead of as a dead link. And the DNS record
carries a **300 second TTL**, so the origin can move inside an hour without editing a URL that has already
been submitted.

The cited URL stays `muster.brainonbnb.com`. `14-GAPS.md` puts the pre-rendered fallback at the apex, which
would hand a judge a second hostname to trust, so the fallback serves from the same subdomain the
submission cites: caddy answers from the static export when `muster-web` is down, at the same paths, with
the banner and the unknown states section 6.5 describes. One hostname, two backends, nothing to rewrite
under pressure.

### 6.3 The anonymous-fetch gate

Eligibility says the submission must be "functional and publicly accessible during judging"
(`00-PROGRAM.md`). Our own reads are authenticated in some way or come from our own network, so they prove
nothing. The gate is therefore run from outside, with no credentials. It is a hard blocker on the
submission rather than a check:

1. Every URL the submission cites is fetched with no cookies, no key and no session, including raw and blob
   links to any asset the writeup or the video description names. Each must return 200.
2. The browse path is fetched with scripting off and asserted on the returned HTML: the landing page, all
   four shelves, one listing page per shelf, Compare, one receipt, `/status` and `/docs/how-it-works`.
3. **It walks as far as a quote, to the dry run rather than to a signed one.** `14-GAPS.md` asks the
   canary to walk land, shelf, listing, quote, receipt instead of pinging a root. The quote step is the
   zero-cost dry run of the hire path, which renders the exact bytes a buyer would sign from a fixed
   placeholder buyer address. The check asserts the payee in those bytes equals the `getAgentWallet`
   read published on the listing. It never asks a third-party agent for a signed quote, because a
   credential-free checker firing 96 times a day would be spending somebody else's rate budget on our
   monitoring. A real signed quote is exercised by the pre-submit gate and by the paid conformance probes,
   which are ours to pay for.
4. The check runs from GitHub Actions rather than from our machine, so the network path is somebody else's.
5. It repeats every 15 minutes through judging and writes a `canaryCheck` row per URL, which the status page
   renders as a history rather than as a light. Each run also reads the certificate's `notAfter` and fails
   if it is not later than 2026-09-23.
6. A non-200 on any cited URL fails the run loudly. GitHub's scheduled runs are best effort, so a gap in
   the history is rendered as a gap rather than as an outage. That scheduling behaviour is **unverified**
   here and is treated as unreliable on purpose.

### 6.4 Cost and the one line that needs the operator

| Item | Cost | Basis |
| --- | --- | --- |
| Hosting | no new spend | a machine and a domain we already run |
| RPC | 0 | every read in section 3 is keyless. The whole registry sweep is 670 `eth_call`s and 0.27 GB (`R01-erc8004.md`) |
| The foreign index | 0 | a self-service key measures 600 a minute and 100,000 a day and is minted headlessly in four calls (`R05-8004scan-api.md`) |
| Gas per brokered settle | about 103,377 gas at 0.05 gwei, so about 0.0000052 BNB | measured for `$U`, 108,164 for USD1 (`SPINE.md` from `R04-bsc-tokens.md`) |
| Gas for 200 settles | about 0.00104 BNB | the row above times 200 |
| Altana session registration | `registrationFeeUSD()` is 5e17, so $0.50 per key, about 694,041,152,910,285 wei on mainnet. Four agent wallets is about 0.00278 BNB | `R06-altana.md` via `SPINE.md` |
| Altana wallet first use | each wallet's first `execute` prepends the admin `initialRegisterKey`, so four **more** key registrations at the same fee, another 0.00278 BNB | `R06-altana.md`: four agents with one session each is eight registrations on first use, under 5 USD |
| BNB sitting inside each agent wallet | 0.002 BNB each, 0.008 BNB for four | their relay fronts the gas then recovers it from the wallet, which is read from Altana's own doc rather than measured (`R02-erc8183.md` quoting it), so an empty wallet cannot transact |
| The mainnet ERC-8183 call sequence | six transactions: `createJob`, `registerJob`, `setBudget`, `approve` on `$U`, `fund`, then `settle` once the window elapses | `R02-erc8183.md`'s own recipe. Per-call gas is **unmeasured**, so this line is bounded rather than measured: 2,000,000 gas in total at 0.05 gwei is 0.0001 BNB |
| ERC-8183 mainnet demonstration | one funded job at a third-party published price, 0.10 or 0.25 `$U` (`02-THESIS.md`) | plus the `$U` to fund it |
| Paid conformance probes | 0.05 **USD1** per paid assertion, the price a live BSC resource actually serves. Six assertions across a dozen listings once a day is about 3.6 USD1 a day, so about 11 USD1 across the build under a **40 USD1 global lifetime cap** that also covers judging | `R12-agent-comms.md`: that resource's decoded BSC leg reads `asset` `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` with `extra.name` `World Liberty Financial USD`, which is USD1 and not `$U`. `04-AGENT-PROTOCOL.md` for the probes |

So the build needs **about 0.015 BNB in gas and fees, 40 USD1 and 2 `$U`**. Floor is the honest word rather
than total: the eight Altana registrations, the 200 settles and the escrow sequence are the lines with
numbers behind them, per-call gas on that sequence is unmeasured and the BNB inside each agent wallet is a
balance rather than a spend. The command asks for 0.02 BNB, the floor plus a third.

Two tokens rather than one, because the rails are not interchangeable. The escrow leg is `$U` since
`paymentToken()` on the kernel returns `$U` and one token per kernel is not ours to reconfigure. The paid
probes are USD1 since that is what the live resource we probe prices in. Section 2.4 boot asserts `$U`,
USD1 and FDUSD alike, so both legs sit behind the same assertions and neither is a new trust.

Where mainnet `$U` comes from, named rather than left implied: the PancakeSwap v3 0.01% pool
`0xA0909f81785f87f3e79309F0E73A7d82208094E4` pairs USDT against `$U` and held 11,313,040.02 `$U` against
9,706,504.98 USDT at block 120,156,766 (`three/decisions/08-money-u-first-over-usd1.md`). The `$U` faucet in
`SPINE.md` is chain 97 only, so it funds the testnet loop and nothing on mainnet. No pool is named for USD1:
its total supply is 1,396,757,367.13 (`VERIFIED-payment-rail.md`), so depth is not the constraint and the
command names the token plus the amount rather than a venue we have not measured.

**The one ready command.** `cli float` prints a single funding command carrying the amounts above and the
destination for each: the relayer address the boot assertion expects, the four agent wallet addresses,
then the house probe address whose key section 7.2 lists. It also prints the `$U` venue line. Nothing in the
build spends any of it. The command is emitted in the first block of day 1, more than 24 hours before the
first money gate at 03:00 on 2026-09-07, so the operator has a day rather than a minute. No fiat figure is
printed beside any of it, because `$U`'s peg and redemption are unverified and Binance's market-data licence
for redisplay is unverified too (`08-MONEY.md`).

If the float arrives late or not at all, section 9's cut list branches rather than stalling: the brokered
settle moves to FDUSD or USD1 on testnet, the ERC-8183 leg falls back to the testnet 900 s loop that cut
item 8 already names and the disclosure table at `/docs/disclosure` says which token settled what. What
never happens is a page
claiming a mainnet settle that did not occur.

### 6.5 The fourteen unattended days

Judging runs 2026-09-09 to 2026-09-23 and eligibility requires the submission to be functional and publicly
accessible throughout (`00-PROGRAM.md`). Section 8.3 says plainly that there is no alerting, so the
fortnight is covered by three artifacts plus one named routine rather than by a hope.

**A static fallback that never shows a green it did not measure.** `cli export-static` writes the last full
render of every cited path into a directory caddy serves when `muster-web` is down: the landing page, the
four shelves, one listing per shelf, Compare, one receipt, `/coverage`, `/report`, `/status` and `/docs`.
Every number
keeps the freshness stamp it was built with. A banner says the live path is down. Each status block reads
`unknown` rather than the last green, because reporting a green it did not measure is the one thing
`status` may not do and a cached page inherits that rule. The export runs from the same command as the
pre-submit gate, so it cannot drift from what was submitted. It sits above the cut line.

**A nightly signed dump, seven kept.** `ledgerDump` writes the `ledger`, the decision records and the probe
history to `/var/lib/muster/dumps/`, hashed in `worker` then signed by `facilitator`, so the one SQLite file
stops being the only copy of the evidence every receipt points at. One timed restore rehearsal runs before
submit: restore the newest dump into an empty database, run `walk()` for `{ok: true}`, then recompute a
receipt sample from its own `recomputeCommand`. A backup nobody restored is a belief.

**Who watches it, named.** The entry's owner reads `/status` once a day through judging, which is the one
page carrying the canary history, the drift banner, the queue depths and the flag state together. A red run
has its response fixed in advance rather than invented at the time. Re-run the gate by hand first, because
that separates a GitHub scheduling gap from a real outage. If the origin is down, point DNS at the static
fallback, which the 300 s TTL turns into an inside-the-hour move. Then record the incident on the status
page with what was down and for how long. The drift banner needs no human unless the fingerprint check
fails, which is what the auto-clear in section 3.7's R5 row is for.

## 7. Security

### 7.1 Who authenticates and for what

| Actor | Surface | Authentication | Authorisation |
| --- | --- | --- | --- |
| Anyone | `web` browse, `api` reads, `mcp` reads, `/status`, `/docs` | **none, by design** | none needed. No read on this surface exposes anything that is not already public on chain or published by us |
| A buyer | hire | a wallet signature over the EIP-3009 typed data, at the hire step only | the signature authorises exactly one payment to one payee for one amount inside a 300 s window. No account, no email, no session |
| An operator | claim, listing edit, appeal | EIP-191 signature over a server-issued nonce bound to the `agentId`, single use, short lived | `isAuthorizedOrOwner(address,uint256)` `0xd95e72be` re-read on chain **at request time**, never from a cached row. It accepts owner, `getApproved` or `isApprovedForAll`, so a delegated operator can run a fleet without holding the tokens |
| An operator, self-check | the published conformance runner against their own URL | none | it only probes a URL the caller supplies, through the same egress guard, with the same per-host budget |
| Us, admin | approve, suspend, delist, restore, constant change | shell access to the machine plus a `cli` command taking a mandatory reason and a published policy code. **No admin HTTP route exists**, so the network cannot reach an admin verb at all (`14-GAPS.md`) | every action writes a `reasonsRecord` and lands in a public changelog. **No admin path can mutate the `ledger` or a sealed bundle.** A corrupted store refuses to boot rather than serving a lie (`R16-reuse.md`) |

Two properties worth stating because they are unusual. A read never needs a credential, which is what makes
the anonymous gate in section 6.3 pass. And an operator's authority is a chain read on every request, so a
transfer of the agent token revokes their access with no revocation step of ours. That rests on the
`isAuthorizedOrOwner(address,uint256)` `0xd95e72be` re-read, which is the verified half: the registry answers
against current ownership every time it is asked. The registry also clears `agentWallet` on transfer, which
is **read from source** (`_update` writes an empty string and emits `MetadataSet`) and consistent with one
empty value in 136 sampled ids, with no observed transfer inside the scanned window to confirm it
(`R01-erc8004.md`). The security property does not lean on that second half either way.

### 7.2 Keys, where each lives and what it costs if it leaks

| Key | Lives in | Can do at worst | Cannot do |
| --- | --- | --- | --- |
| Relayer | the isolated signer process, `/etc/muster/relayer.key` at mode 0600 owned by the service user | spend the BNB it holds on gas and submit an authorisation a buyer already signed for a fixed payee and a fixed amount | move any stablecoin, change a payee or sign anything on a buyer's behalf. It is a gas wallet |
| Ledger signer, ed25519 | the same isolated process, `/etc/muster/ledger.ed25519` | sign entries. The chain's own invariants still reject a wrong `seq`, a wrong `prevHash` or an unknown `origin` at append | rewrite history undetectably. `walk()`'s third check recomputes the decision from the recorded inputs, so an entry edited by hand fails even when its hash and signature are recomputed perfectly with the real key (`R16-reuse.md`, `08-MONEY.md`) |
| House probe key | the same isolated process, `/etc/muster/probe.key` | sign one paid-probe authorisation in USD1 at a time, up to the per-listing daily ceiling and the global lifetime ceiling in section 6.4, both enforced inside that process rather than trusted to the caller | exceed either ceiling, pay any payee other than the `getAgentWallet` read recorded on the listing, sign anything at all for a buyer. Its balance is the probe float and nothing else |
| Four agent wallet keys, one per first-party reference agent | each reference agent's own service, `/etc/agents/<slug>/wallet.key` at 0600 under that agent's own user, never in `web` or `worker` | act as that agent | touch Muster's store, our ledger or another agent |
| Four Altana session keys | the same service, `/etc/agents/<slug>/session.key` at 0600, one per agent | exactly the calls in that session's allowlist, up to that session's spend cap, until that session's expiry and only while the Keystore entry is valid | anything outside the allowlist. That is the property the track asks a judge to read on chain rather than take from a pitch (`00-PROGRAM.md`) |
| The foreign index read key | `worker` environment | read a public API faster | write anything. Every write path there is JWT-only except the no-auth verify trigger |

The signer process is the only place a **Muster** process loads a private key. It loads three: the
relayer, the ledger signer and the house probe key. `web`, `worker` and `cli` hold none. `ledger` append
runs inside that process on the same unix socket, so neither `web` nor `worker` can produce a signed entry,
and a paid probe is a request over that socket rather than a key handed to `conformance`. The four
reference-agent services each load their own two keys and nothing else, which is why a compromise of one
agent reaches one agent. Boot asserts that the relayer address derived from the key equals a configured
expected address, then refuses to start on a mismatch, which is how a swapped key file is caught before a
transaction rather than after one.

Handling rules, all mechanical. No key in the repo, no key in a build artifact, no key in a log line, no key
in an error page. `.env` and the key directory are untracked and the pre-commit hook refuses a staged path
that matches either. Rotation is a new key file plus a config flip plus a boot assertion, with the old
relayer left holding dust. Every log line passes a redaction pass that drops anything matching a 64-hex
private-key shape or a `whsec_`, `whsk_` or `8004_` prefix before it is written.

### 7.3 The egress client, which is the only way out

Four components make outbound requests and all four go through one client: `resolver`, `prober`,
`conformance` and the B402 path inside `facilitator`. There is no second HTTP helper in the tree, because a
second one is how a guard gets bypassed by accident. Every listing URL is operator-controlled input, so this
is on the critical path rather than in a hardening backlog. `conformance` never holds the probe key: a paid
assertion asks `facilitator` for the signature over the unix socket, then sends it through this same client.

The sequence, per request:

1. Scheme must be `http` or `https`. Anything else is refused with a reason string.
2. Resolve the hostname and check **every** returned address, not the first, so a multi-A-record host cannot
   smuggle one private answer through (`R16-reuse.md` section 2.5).
3. Reject on the deny table below.
4. Connect to the **resolved address** with the original hostname preserved for SNI and the `Host` header,
   so the address that was checked is the address that is used. A pre-flight check alone loses to a DNS
   answer that changes between the check and the connection.
5. Never follow a redirect. A public host that 302s to `169.254.169.254` defeats any pre-flight
   (`R16-reuse.md`).
6. Enforce the per-host budget from section 3.8, the 8 second timeout and one retry only on a network-layer
   failure.
7. Cap the body. 1,500 characters for anything that only feeds a lint finding, 256 KB for a document we
   parse, then record whether truncation happened. One live registration document is 11,315 bytes decoded and
   one host answers a well-known path with 74,239 bytes of HTML, so the cap has to sit above the real
   documents and below a page (`R01-erc8004.md`, `R12-agent-comms.md`).
8. Require a JSON content type or a successful parse before anything counts as a document. **A 200 is not
   existence.**

The deny table, which is explicit rather than delegated to a standard library:

| Rejected | Why it is listed separately |
| --- | --- |
| `127.0.0.0/8`, `::1`, `localhost` | A2A's own security text names these (`R12-agent-comms.md`) |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7` | same |
| `169.254.0.0/16`, `fe80::/10` | link-local, which is where a cloud metadata endpoint lives |
| `0.0.0.0/8`, `100.64.0.0/10`, `192.0.0.0/24`, `198.18.0.0/15` | unspecified and carrier-grade shared space |
| **`224.0.0.0/4` and `ff00::/8`**, including `224.0.0.1`, `239.255.255.250`, `ff02::1` and `ff00::1` | Python's `ipaddress.is_global` returns **True** for all four, measured on 3.11.5 (`R12-agent-comms.md`). Our runtime is not Python, which is exactly why the deny list is written out rather than inherited from any language's idea of global |
| **`64:ff9b::/96`**, including `64:ff9b::7f00:1` | NAT64, which maps a private IPv4 address into a global-looking IPv6 address. The same measurement caught it |
| Any IPv4-mapped IPv6 form of the above | the mapped forms are checked after normalisation, not before |

The guard re-runs on **every** probe rather than once at review, because a host that resolved public at
review can resolve to a metadata address an hour later. That case suspends the listing immediately with
no retry (`05-ONBOARDING.md` section 9.3). The five shapes above each get a unit test in section 10, since
the whole point of writing them down is that a plausible check misses them.

### 7.4 Rate limits, inbound and outbound

| Direction | Surface | Limit | Reason |
| --- | --- | --- | --- |
| in | `api` and `mcp` reads | a per-IP token bucket, 60 a minute with a burst of 120 and 600 an hour, per route class | a read costs a store hit, so the limit is generous. Those are `14-GAPS.md`'s published numbers, taken as written rather than re-picked here. Deep pagination is capped at `pageSize` 100, the same ceiling the foreign index enforces |
| in | the hire path | one open quote per `(buyer, listingId)`, one settle in flight per `Idempotency-Key`, five hires a minute per address | the idempotency rules are `04-AGENT-PROTOCOL.md`'s: 409 while in flight, 422 on the same key with a different body and the reservation happens before any payment step |
| in | the operator self-check runner | three runs an hour per `agentId`, one concurrent run per caller | it spends our probe budget on somebody else's host |
| in | the foreign re-verify trigger | once an hour per agent, shelved rows only, with a countdown shown in the UI rather than a silent failure | that is the published cap on `POST /agents/verify-endpoint/{chain_id}/{token_id}` (`R05-8004scan-api.md`) |
| out | probes | one request per 1.5 s per host, `robots.txt` honoured, 8 s timeout, one retry on a network failure only | 9 hosts carry 229 of the sampled URLs |
| out | the foreign index | under 600 a minute with our own key, retry every 5xx with backoff, never on the render path | its read path returned non-200 on up to 56.7% of calls in one window |
| out | paid probes | a per-listing daily ceiling and a global lifetime ceiling in **USD1**, both configured, both enforced inside the signer process, both tagged `origin: house` | a probe budget with no ceiling is a way to spend real money by accident. USD1 rather than `$U` because USD1 is what the live resource prices in (section 6.4) |
| out | the public demo path | three brakes: a per-IP rolling-minute limit, a per-request budget the caller can read, then a global lifetime spend cap after which it keeps answering and stops spending | a public try-it button on a judged site needs all three (`R16-reuse.md` section 2.6) |

**The published 429.** Every inbound bucket refuses the same way, because a machine client that cannot read
the backoff retries into the wall. A refusal is HTTP 429 with `Retry-After` in seconds plus an
`application/problem+json` body carrying `type`, `title`, `status`, `detail`, `retryAfterSeconds` and the
`routeClass` that was hit, which is `04-AGENT-PROTOCOL.md`'s error shape. Four route classes exist and the
response names which one it hit: `read` at the numbers above, `search` at 30 a minute, `badge` at 300 a
minute cached at the freshness contract, then `hire` under the per-buyer rules in the table. The 429 is
published as a shared response in `/docs/api/openapi.json`, so the backoff is machine-readable rather than
prose. A paid call that already settled is never throttled (`04-AGENT-PROTOCOL.md`).

### 7.5 The sanitizer and the render rules for agent-supplied text

Everything an operator or an agent wrote is untrusted data: the name, the description, a refusal string, a
probe response body, a `responseURI` reply, a category label, an error message. Two layers, in this order.
The order is the design.

**Layer one, the deterministic screen.** It runs before any model call and before any render. It cannot
be waived by a later code path. An injected instruction can flag here but can never bypass it. It carries
the pattern list our own prior gate shipped with (`R16-reuse.md` section 5.3): `ignore (all|any|the|your|
previous|above)`, `disregard (all|the|your|previous|above)`, `forget (all|everything|your|the)`, `you are
(now )?(a|an|my)`, `system prompt`, `new instructions?`, `override (the|your|all|safety)`, `bypass`,
`jailbreak`, `pretend (to be|you are|that)`, plus an email and a phone shape for redaction. It returns
`{flagged, categories[], sanitized}` and it **redacts rather than rejects**, so a flagged listing still has
a renderable form and the finding shows on the listing.

Every pattern list ships with a false-positive test row, because a security agent whose own description
describes attacks will trip the scanner and that is a real rejection we have already lived through. The
word-boundary discipline is the same lesson at the token level: the matcher uses
`(?<![a-z0-9])alias(?![a-z])` so that "console" cannot yield "sol".

**Layer two, the render rules.** These are absolute and they are what stops the exfiltration class:

- Agent-supplied strings are **never** rendered as markdown or HTML. They are escaped and rendered as text.
- **No image is ever loaded from an agent-controlled URL**, including an avatar. GitHub disabled image
  rendering in Copilot Chat outright to close this, despite already routing images through an HMAC-signed
  proxy. A zero-click image path plus a one-click link path were demonstrated against two products
  (`R12-agent-comms.md`). An operator's avatar is fetched server side, re-encoded and served from our own
  origin or it is not shown.
- A link inside agent text renders as inert text with its href visible, never as an anchor.
- Anything that genuinely has to be embedded goes through `isomorphic-dompurify` with a strict allowlist as
  the second pass, never as the first.
- Stored bodies download as an attachment with `nosniff` and a sandbox CSP, never inline.

Response headers on every page: `Content-Security-Policy: default-src 'self'; img-src 'self' data:;
script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self';
base-uri 'none'`, plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and
`Strict-Transport-Security`. `img-src 'self'` is the header form of the image rule, so a mistake in a
template fails closed.

The output screen runs on both directions, `screen_input` before a model call and `screen_output` before
anything is published. Conformance probe C26 checks the same property on the agent's side: a task input
carrying an injection string must not be obeyed and must not be echoed back as an instruction
(`04-AGENT-PROTOCOL.md`).

## 8. Observability and the status page

### 8.1 What is measured

One structured JSON line per request and per job into the journal, with a request id, the route, the status,
the duration and the pinned block where one applies. No third-party APM: nothing about a buyer leaves the
machine and no vendor's terms for that were read.

Counters and gauges are derived from `run`, `probeResult`, `sourceState` and `canaryCheck` rather than kept
in a second system, so what the status page shows is the same data the product used. The set:

| Signal | Read from | Why it is on the page |
| --- | --- | --- |
| our sweep block, its age and whether the last sweep completed | `run` | it is the field that says how stale everything else is |
| agent count with its block height and timestamp | `registry-reader` | a judge who checks the number will check it on chain |
| probe queue depth, due-set size, shed count | the queue tables | a growing queue is how a freshness claim goes false |
| probes in the last hour by verdict and by `failureClass` | `probeResult` | the four failure modes are never merged into "offline" |
| p50 and p90 render time per route | request log | Functionality is judged in a browser |
| foreign source lag, self-reported status, non-200 rate | `sourceState` | on the day we measured, one index reported `status: down` with a 32 hour stale checkpoint while its own summary said the database was fine |
| ledger head, `walk()` result and when it last ran | `ledgerEntry` | `{ok, checked}` is the shape of evidence a judge can hit |
| implementation-drift state for the three registries, the three tokens and the escrow policy | R5 | an upgrade could change the meaning of every record we show |
| settled jobs and value by `origin`, with the window, third-party first then first-party | `payment` joined to `firstPartyOwner` | revenue counts `origin: order` only. The third-party figure is the headline in every count we publish (`02-THESIS.md` section 10 clause 3) |
| hireable rows per shelf, split the same way | `listing` joined to `firstPartyOwner` | "four categories, deeply covered" must never quietly mean four categories we built |
| flag state per flag, with the reason and the time it flipped | `/flags.json` plus the decision records behind each flip | a degraded surface a reader cannot see is indistinguishable from a broken one |
| the last nightly dump, its signature and the last restore rehearsal | `run` rows of kind `ledgerDump` | the receipts point at evidence that lives in one file, so the copy has to be visible |
| the canary history per cited URL | `canaryCheck` | availability during judging is an eligibility rule |

### 8.2 `/status` and the same thing as JSON

One page, no login, rendered server side. In order: our own freshness first, then every job with its last
run and duration, then the queue depths with the configured per-host ceiling beside the count in use, then
each foreign source as its own row with its own status, then the ledger walk result, then the drift banner if
it is raised, then the flag state, then the last nightly dump with the last restore rehearsal, then the
canary history. `GET /v1/status` returns the identical content as JSON so a machine gets the same answer and
`/status.json` redirects to it.

Three rules about what the page may say. It reports only what it measured, so a source we could not reach
shows as unreachable with the time of the attempt rather than as agreement. A degraded source is named and
the page still says which product surfaces are unaffected, because everything we serve comes from our own
store. And a green banner is never rendered from a configuration value, only from a `run` row inside its
cadence.

### 8.3 Alerting, honestly

There is no on-call rotation on a four-day build, so no alerting design is claimed. What exists: the canary
fails a GitHub Actions run loudly on any non-200, the drift banner degrades the hire path on its own without
taking the reads down, a sanctions hit blocks payment on its own and `09-DISPUTES.md` carries the incident
runbook for the first hour when an agent starts losing buyers money. Automatic actions are listed in
`06-QUALITY.md` section 8 and the human-required ones are listed beside them. Anything needing a human waits
for a human and the status page is what tells them. Section 6.5 names who reads that page through judging
and what a red run gets, because "no alerting" is only honest when the manual routine is written down.

## 9. The build order, blocked by hour

Three working days plus a freeze. The window is 2026-09-06 00:00 UTC to 2026-09-08 23:59 UTC. The close is
2026-09-09 12:00 UTC, read from the registration form. 00:00 UTC on the 9th stays the freeze the plan is
built to (`SPINE.md`). Blocks are wall clock in UTC and each names its gate. Nothing moves to the next block
until its gate passes, because a half-built surface later is worse than a missing one now.

**The blocks are continuous automated execution, not one person's working hours.** Building, testing and
committing run without pausing for approval, so a block boundary is a gate rather than a shift change. The
human is in the loop at exactly five named points: the float command in the first block of day 1, the
`in_review` approval that lets any listing go live, the yes that starts the demo video, the submission form
then any hard stop a gate raises. Everything else is unattended, which is why the gates are written as
assertions rather than as reviews.

**2026-09-05 is usable and block one starts on it.** The window above is the plan's frame, not a start
date. The certificate and the DNS record are the one open question with a hard external dependency, so the
first block runs the moment this document lands rather than waiting for 00:00, which turns the open
question's slack from 70 hours into more than 80. Everything downstream keeps its stated hour.

### Day 1, 2026-09-06: the index and the four shelves

| Block | Work | Gate |
| --- | --- | --- |
| 00:00 to 02:00 | scaffold: Next.js, the store schema from section 2, systemd units, Caddy, the boot assertions in section 2.4, the RPC pool probe at sweep width in section 3.6, then `cli float` | the app answers on the public URL over HTTPS, the certificate's `notAfter` is later than 2026-09-23, the boot asserts pass on all three tokens, the batch probe marks each endpoint at 200 calls, then the float command prints with its amounts, its destinations and the `$U` venue |
| 02:00 to 05:00 | `registry-reader` plus `indexer`: the `_lastId` read, the Multicall3 sweep from id 0, the `run` and checkpoint machinery. Port the two carried modules to Node 22 and re-run the assert-first gate | a completed sweep whose row count equals `_lastId` at the pinned block, R1 clean |
| 05:00 to 07:00 | `resolver` behind the egress client, all six tokenURI shapes including the gzip variant, the tokenUriHash dedupe and `duplicateClusterId` | fixture tests for all six shapes green and the sampled 215-agent identical-URI block collapses to one cluster |
| 07:00 to 09:00 | `classifier` over declared skills then text, with `categoryBasis`, `categoryConfidence` and abstention | the four category candidate counts render, each with its basis split |
| 09:00 to 12:00 | `prober` plus `conformance`: the eleven cheapest hard gates, the four failure classes, the per-host budget, the SSRF deny table with its tests | the deny table's seven rows pass, including the five shapes a naive check misses |
| 12:00 to 16:00 | `web`: landing, the four shelves from one template, the listing page, the unknown vocabulary, the freshness strip | all four shelves render with scripting off and every number carries a stamp |
| 16:00 to 18:00 | `api` plus `mcp` with the six tool names, OpenAPI 3.1 published | an anonymous fetch of every `/v1` route returns a paged envelope |
| 18:00 to 20:00 | `escrow-index` over the ERC-8183 kernel, the provider join, per-category counts with the window | the indexed job count matches `jobCounter()`, R2 clean |

**End of day 1 the demo path exists as far as a listing page.** If day 1 slips, day 2 starts with the
unfinished block and the day 3 stretch list is cut, not the gate.

### Day 2, 2026-09-07: money, evidence and the partner gates

| Block | Work | Gate |
| --- | --- | --- |
| 00:00 to 03:00 | the signer process: relayer key isolation on a unix socket, `facilitator` verify and settle, the ledger signer and `ledger.append` inside it | a testnet settle end to end, the boot address assertion and `walk()` returning `{ok: true}` |
| 03:00 to 06:00 | `broker`: quote, `payTo` from chain, the challenge, reservation before settle, the two ledger legs, the receipt with its `recomputeCommand` | one **mainnet** brokered hire settled at a real price, its receipt recomputing from the published command |
| 06:00 to 08:00 | `screening` on the quote path and again at settle, the SDN ingest, the `reasonsRecord` writer | a known-flagged address blocks a quote and writes reasons |
| 08:00 to 11:00 | the four first-party reference agents, one per category, each on its own Altana wallet with a session carrying an allowlist, a spend cap and an expiry, registered in Keystore | `isValidKey` true, `canExecute` true on a listed target and false on an unlisted one, no any-function sentinel, an expiry inside the judging window, plus a live transaction visible in the Altana explorer |
| 11:00 to 13:00 | `session-panel` with the live chain read on every render and a working Revoke | a judge can read the allowlist, the cap and the expiry, then revoke, inside the product |
| 13:00 to 16:00 | `quality` and the score triple, the evidence tier with its four checkmarks, `/receipt`, `/coverage`, `/report` | a score never renders without its interval and its sample size. `/coverage` reads the per-shelf counts the index already computes, so it is a render rather than a subsystem |
| 16:00 to 19:00 | Compare with all 28 rows, search with the query grammar, the off-shelf drawer | a comparison renders with one dead cell and the rest of the row intact |
| 19:00 to 22:00 | the Agent Advantage Report: three real tasks run both ways, time, cost and output quality, the outputs attached, one task from trading, stock or security | the report is a public URL **and** a file in the repo, since where it is filed is unverified |

**The 03:00 and the 08:00 blocks are the two that spend the float**, which is why the command goes out more
than 24 hours earlier. If it has not arrived by 03:00, both run on testnet, the mainnet legs move into the
first block of day 3 (the last place they fit) and `/docs/disclosure` names the testnet run for what it is.
If
day 2 slips, day 3 starts with the unfinished block and cut items 1 and 2 go, never a gate.

### Day 3, 2026-09-08: escrow, the docs, the gates, the freeze

| Block | Work | Gate |
| --- | --- | --- |
| 00:00 to 03:00 | one funded **mainnet** ERC-8183 job at a third-party agent's published price, one **testnet** job driven to COMPLETED on the 900 s window, `settler` running against the whole router | the mainnet job renders as in flight with its auto-approval date, the testnet job renders as COMPLETED |
| 03:00 to 05:00 | `sampler` and the four category data paths read from their own contracts at a pinned block, with the unit and the source call stored beside every rate | three protocols, three rate units, each stored with its unit rather than normalised silently |
| 05:00 to 08:00 | the docs site: `/docs/how-it-works` with its five runnable commands, the conformance page, the self-check runner, the schemas, `constants.json`, the policy set | CI fails on a broken anchor or an external link that does not answer 200 anonymously |
| 08:00 to 10:00 | `reconciler`: all six checks, `sourceState`, the drift banner, the foreign re-verify trigger with its countdown | R1 to R6 all run and publish, with a forced mismatch rendering rather than hiding |
| 10:00 to 12:00 | `/status`, `GET /v1/status`, the canary workflow on GitHub Actions, the static fallback export in section 6.5, then one timed restore rehearsal from the newest nightly dump | the canary passes from outside our network on every cited URL, the fallback serves each of those paths with its own stamps plus an unknown status block, then the restored database walks `{ok: true}` and recomputes a sampled receipt |
| 12:00 to 14:00 | the full test plan in section 10, end to end | everything green, with any skip named |
| 14:00 to 16:00 | licence and publish gates: `LICENSE`, `NOTICE`, `DATA-SOURCES.md` with a quoted clause per input, `PROVENANCE.json` with `binary_wrap: 0`, no tracked private file, then the visibility flip | an anonymous fetch of the repo page returns 200 and every cited raw and blob link resolves |
| 16:00 to 18:00 | the numbers re-read: `_lastId`, the ERC-8183 totals, the foreign index status, the rival check | every published number carries the block height and timestamp read that day |
| 18:00 | **freeze.** Nothing merges after this except a fix for a failing gate | |
| 18:00 to 20:00 | the submission itself | the checklist in section 11, every field |
| 20:00 to 23:00 | **stretch:** the demo video, on the operator's yes and only once the submission is filed | its own gates: scaffold, preflight, render, then the upload package with the thumbnail, the captions and the chapters |

**The video never shares a block with the submission.** It is a scaffold, a preflight, a render, an upload
package plus its own gates, so putting it in the same hours as the form is how both arrive late. The
submission stands on its own by 20:00. The video is stretch behind it and is dropped without argument if the
clock runs out.

**If day 3 slips**, the order is fixed rather than argued at 22:00. The `sampler` block goes first, then the
docs site shrinks to `/docs/how-it-works` plus the licence page, then Compare's remaining rows. The last
four blocks are untouchable, because the test plan, the licence gates, the anonymous check and the number
re-read are what make the entry eligible at all. A slip that reaches those four ships the submission with a
named gap on `/coverage` rather than with a missed form.

### The cut line

Everything above the line ships. Everything below is cut in the order listed, from the bottom.

**Above the line, never cut.** The index with its own freshness on screen. The four shelves from one
template. At least one hireable row per shelf. The hire path with a real settled mainnet payment and a
recomputable receipt. The four Altana sessions readable and revocable in the product. The Agent Advantage
Report. The status page. The static fallback that keeps every cited URL answering while the app is down.
The licence gates and the anonymous URL check. The disclosure.

**Below the line, cut from the bottom up.**

1. The `sampler` time series, keeping spot reads at a pinned block.
2. Compare's full 28 rows, keeping the six-field shelf row plus the listing page which carries all of them.
3. The `mcp` surface, keeping `api`.
4. The operator self-check runner, keeping the published assertion list.
5. The CSV export, keeping receipts plus the signed JSON export.
6. Search's operator grammar, keeping a plain substring search over name and description.
7. The exploration slot, keeping the banded list.
8. The mainnet ERC-8183 funded job, keeping the testnet COMPLETED job plus the read-only index.

**A branch rather than a ninth item: the float arrives late or not at all.** Four above-the-line items and
two of the five tracks touch real money, so this needs a rule rather than optimism. The deadline is 03:00 on
2026-09-07, the first money gate. Past it, the brokered settle runs on testnet in FDUSD or USD1, both
already covered by the boot assertions in section 2.4. The ERC-8183 leg becomes the testnet 900 s loop that
cut item 8 names. Paid conformance probes fall back to the free assertions with `/docs/disclosure` naming
which
ceiling stopped them. The mainnet demonstration is funded in `$U` for the escrow leg and in USD1 for the
probes, stated here rather than left to be inferred. A real settled mainnet payment is the one
above-the-line item a refused float genuinely changes, so the page says testnet where it is testnet instead
of the claim standing unqualified.

### The demo path, protected

One click path is rehearsed and is never allowed to be the thing that breaks: `/` then `/c/<slug>` for a
shelf then a listing page then Compare then hire with a real signature then the receipt then `/status`. Every
gate above tests that path first and any block that would leave it half-built is deferred instead. The video
and the submission both walk it, so a regression there costs two deliverables rather than one.

### If a day is lost

Stated plainly rather than left to the moment. Losing a day cuts a block of the list above in one decision,
never one item at a time under pressure.

| Day lost | What is abandoned | What survives |
| --- | --- | --- |
| Day 1 | items 1 to 6 of the cut list, so the exploration slot and the query grammar go too | the index, the four shelves, the listing page, the hire path, receipts, the status page. The submission is a working marketplace with a thinner surface |
| Day 2 | additionally the mainnet ERC-8183 funded job plus the `sampler` entirely. The report drops to exactly three tasks with no fourth | the brokered hire on mainnet and the four Altana sessions both stay, because they are two of the four tracks |
| Day 3 | the docs site shrinks to `/docs/how-it-works` plus the licence page. The demo video is not built | the gates, the licence flip, the anonymous check and the re-read still run, because a submission that fails those is not eligible |

The two things a lost day may never touch: a real settled payment on mainnet and the honesty of the ship
line. A shelf with no hireable row ships with its candidate list and its named failures rather than with a
fabricated row (`02-THESIS.md`).

## 10. The test plan: exactly what must be green before submit

One command, `make check`, runs every layer below and the same workflow runs in CI. A skip is reported as a
skip with its reason, never folded into a pass, which is the rule `04-AGENT-PROTOCOL.md` imposes on probes
and applies here too.

### 10.1 Unit and the fixture behind each

| Test | Asserts | Exists because |
| --- | --- | --- |
| canonical bytes | `json.dumps(obj, sort_keys=True, separators=(",", ":"))` byte-for-byte against a stored vector, keys sorted recursively, reproduced in the browser with WebCrypto | every signature and every anchor hash depends on it |
| ledger invariants | each of the seven append-time rejections: unknown `kind`, unknown `origin`, wrong `seq`, wrong `prevHash`, a first entry that is not genesis, a hash that does not match the body, an unsigned entry | a broken chain must be impossible to create rather than detectable later |
| `walk()` third check | an entry whose body is edited by hand and whose hash and signature are recomputed with the real key still fails re-derivation | this is the check a plain append-only log cannot do |
| decimals and domain | `decimals()` is 18 for `$U`, USD1 and FDUSD and each `DOMAIN_SEPARATOR()` recomputes from its name and version. Version `2`, `1.0` and `v1` each fail | a 6-decimal constant is wrong by a factor of a trillion and USD1's `version()` returns `uint256 2` while its domain version is the string `1` |
| the proxy trap | a selector grep against a token proxy reports absent while the same grep against the implementation reports present | the first grep is the trap that cost a wrong conclusion once |
| tokenURI resolver | all six shapes: base64 `data:`, **gzip `data:`**, `https`, `ipfs`, empty, raw JSON with no prefix, plus three junk fixtures that must return null rather than throw | about 5% of agents hold something no correct parser can use |
| both spellings | `x402support` and `x402Support`, `supportedTrusts` and `supportedTrust` both read | each misspelling sits on about 5% of documents |
| SSRF deny table | all seven rows and specifically `224.0.0.1`, `239.255.255.250`, `ff02::1`, `ff00::1` and `64:ff9b::7f00:1` are refused | a standard library call passes all five |
| A2A revision detection | a card is validated at the revision its **field shape** implies, never at its declared version string and a card declaring `0.4.0` is handled | no A2A `0.4.x` release exists and the published 1.0 JSON artifact validates `{}` as a valid card |
| injection screen | the pattern list flags, redacts and returns a renderable form, plus a false-positive row where a security agent's own description must not trip it | that false positive is a real rejection we have lived through |
| render rules | agent text is escaped, no anchor is produced, no `img` with an external host survives a render | the image exfiltration class is live and shipped in the wild |
| score maths | shrinkage toward the category prior, the decay, the interval, the sample size, plus a settled-jobs-only assertion | a score with no sample size is not renderable |
| the six unknown states | each renders its exact wording and a zero never stands in for an unknown | `unknown` and `0` are different claims |

### 10.2 Integration, against live BSC at a pinned block

| Test | Asserts |
| --- | --- |
| sweep against `_lastId` | a completed sweep's row count equals the counter at the pinned block, ids are contiguous from 0 and a partial sweep leaves `run.complete` false without replacing the previous rows |
| escrow reindex | the indexed job count equals `jobCounter()` and `getJob(0)` is treated as an empty slot |
| feedback sweep | the summed `getLastIndex` total is recorded with its block and the foreign share is computed rather than assumed |
| the RPC pool probe | at 200 calls, not at 2: the result count equals the request count, every `id` sent came back, an endpoint that truncates is marked no-batch and a 429 with a complete body counts as success. The fixture is the measured one, 2 of 2 then 10 of 10 then 1 of 200 from the same endpoint |
| conformance against our own reference agent | all 31 assertions run, the ten go-live gates pass and C20 proves **exactly one** payment settled for a repeated `Idempotency-Key`, counted on chain rather than trusted from the response |
| the hire path on testnet | 402 then one signature then settle then dispatch then receipt, with the reservation before the settle |
| the hire path on mainnet | the same, once, at a real price, with the tx hash on the receipt |
| the Altana session reads | `isValidKey`, `canExecute` true on a listed target and false on an unlisted one, no `0x32323232` sentinel, a real `spendInfos` limit, an expiry inside the judging window |
| the retention reaper | an `evidenceObject` with a past `deleteAfter` loses its bytes and keeps its row |
| the drift watch | a forced implementation mismatch raises the banner, leaves every read working, flips `hire.enabled` false with its reason rendered, then clears itself when the replacement fingerprints identical |
| the restore rehearsal | the newest nightly dump restores into an empty database, `walk()` returns `{ok: true}` and a sampled receipt recomputes from its own `recomputeCommand` |
| the concurrent write | a sweep committing in batches while the ledger appends at settle time: no `SQLITE_BUSY` reaches either caller and the append waits at most one batch |

### 10.3 Surface and gates

| Test | Asserts |
| --- | --- |
| scripting-off render | the landing page, all four shelves, a listing page, Compare, a receipt, `/status` and `/docs/how-it-works` all return 200 with the expected content in the HTML, asserted over the fetched markup |
| anonymous fetch | every URL the submission cites returns 200 with no credentials, run from GitHub Actions |
| paging envelope | every `/v1` list returns `{ items, page, pageSize, total, totalPages }` and refuses a `pageSize` over 100 |
| the 429 shape | a bucket driven over its limit answers 429 with `Retry-After` plus the problem-details body naming its `routeClass`. The same shape is present in the published OpenAPI document |
| the static fallback | with `muster-web` stopped, every cited path still returns 200 from the export, each number keeps its own stamp and every status block reads unknown rather than the last green |
| the first-party split | every published count on the shelves, `/coverage` and the `api` payloads carries both figures. A listing whose owner is in `/first-party.json` renders labelled on all of them |
| mobile and keyboard | one recorded manual pass at a phone viewport with the keyboard path and the landmark structure, since no browser driver ships |
| outward words | a grep over every outward string for an em dash and for `, and` or `, or`, which must return empty |
| publish gates | `LICENSE`, per-directory licences, `NOTICE`, `DATA-SOURCES.md` with a clause or an explicit "no terms found" per row, `PROVENANCE.json` with `binary_wrap: 0`, no Aave source, no GPL Solidity, no code from either unlicensed repo, OpenSanctions absent, no tracked private file |

## 11. The submit checklist

Run in this order, because each step invalidates the one before it if it is done first.

### 11.1 The gates, in order

1. `make check` fully green, with every skip named and justified. The static fallback export and the timed
   restore rehearsal run inside it, because both are gates rather than extras.
2. The four moving numbers re-read the same day, each recorded with its block height and timestamp: the agent
   count from `_lastId`, the ERC-8183 job and settlement totals, the foreign index's own status and
   freshness, plus the rival re-check for a settled mainnet ERC-8183 job (`01-GROUND-TRUTH.md`).
3. Every published number on the site traced to a live read or to `constants.json`, none typed into prose.
4. The licence set complete: `LICENSE` at SAND-1.0 for the entry, per-directory Apache-2.0 with its own
   `NOTICE` on any subtree meant to be adopted, `NOTICE` naming every third-party component with its terms,
   `DATA-SOURCES.md` with a quoted clause or an explicit "no terms found" per row, `PROVENANCE.json`
   regenerated with `binary_wrap: 0`.
5. No private file tracked. The submission fill and any form-side material live outside the repository and
   are proven ignored before the flip.
6. The repository flip, then the anonymous check, in that order.
7. The submission itself, one entry, since the programme allows one per team.

### 11.2 The repo visibility flip

```bash
# 1. prove nothing private is tracked, before anything becomes public
git check-ignore submit/ && git status --porcelain --untracked-files=all | grep -c '^.. submit/'   # 0

# 2. flip
gh api -X PATCH repos/<owner>/<repo> -F private=false

# 3. verify as a stranger, not as us
curl -sS -o /dev/null -w '%{http_code}\n' https://github.com/<owner>/<repo>            # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://raw.githubusercontent.com/<owner>/<repo>/main/README.md
```

Our own `gh` calls are authenticated and pass either way, so step 3 is the only one that proves anything.
The flip and its verification are recorded with the exact commands, so a later session can tell a deliberate
private repo from one left private by accident.

### 11.3 The anonymous URL check, enumerated

Every one of these is fetched with no credentials from outside our network and must return 200. The list is
the canary's list, so it keeps running through judging:

```
/                          /c/rebalancing   /c/grid   /c/yield   /c/health-factor
/a/<agentId>/<listingId>   one per category
/compare?listings=…        /search?q=…
/receipt/<receiptId>       the mainnet brokered hire
/coverage                  /report               /status               /v1/status
/docs/how-it-works         /docs/conformance     /docs/licence      /docs/disclosure
/docs/api/openapi.json     /docs/schemas/muster-card-1.json        /docs/constants.json
/v1/categories/<slug>/contract        all four, spelled exactly as section 1.3 publishes it
/first-party.json          /flags.json
/badge/<listingId>.svg     one per shelf         /v1/feed?address=…        /operator
the Agent Advantage Report URL         the repo page      every raw link the report or the video cites
```

Two notes on that list. The category contract path is the published route rather than a static file name: an
earlier draft cited `/categories/<slug>/contract/v1.json`, which the built app answers with a 404. A gate
that 404s fails for the wrong reason. `/operator` is signature-gated for anything it can change, so what the
anonymous check asserts is that its nonce page returns 200 and exposes nothing, which is the same posture as
every other read here. Each run also asserts the certificate's `notAfter` is later than 2026-09-23.

### 11.4 Per track

| Track | What has to be in the submission | Verified how |
| --- | --- | --- |
| **Main** | the live public URL needing no login, the four categories filled with agents live on BSC, the full journey from land to hire working without a dead end, real-time data with a freshness stamp per field, all four shelves at equal depth | the anonymous check above, plus the demo path walked end to end. "Single-category submissions score poorly. All four, equally deep, is the bar" (`00-PROGRAM.md`) |
| **TermiX** | the **Agent Advantage Report**, at least 3 real tasks each run both ways, time, cost and output quality, the actual outputs attached, at least one task from trading, stock or security. It is an eligibility gate, not a bonus | shipped as a public URL **and** as a file in the repo, because where it is filed is **unverified**. Their hire has to work when they run it themselves, so the hire path is tested from a wallet with no relationship to us |
| **Altana** | agents on their own Altana wallets, sessions carrying a call allowlist plus a spend cap plus an expiry, sessions registered in Keystore, live transactions in the Altana explorer, a user able to see and revoke inside the product, **every wallet address in the submission** | each is a chain read a judge can run: `isValidKey` `0x8fd4f06b`, `getExpiry` `0x3b49ad47`, `canExecute` `0xff619c6b`, `spendInfos` `0xdcc09ebf`, plus an explorer URL of the form `/account/<wallet>` and `/key/<full 32-byte keyId>`, both public, where a truncated key id 404s (`R06-altana.md`) |
| **PancakeSwap** | the rebalancing and yield paths reading PancakeSwap's own contracts at a pinned block, with the fee model right: there is **no 3000 fee tier** on v3 and the protocol fee per tier means the 0.01% tier pays LPs 0.0067% | the numbers recompute from the pinned block. No separate rubric is published for this track (`00-PROGRAM.md`) |
| **AltLayer** | 8004scan used as a cross-check with attribution wherever required, plus the Pro-tier form filed | the form is real and live. Three numbers rather than one: the form promises up to 500 requests a minute, our own self-service `free_api` key measures 600 a minute and 8004scan's own docs table lists `pro` at 3,000 a minute with 3,000,000 a day. Which of those a granted key maps to is **unverified** and only holding one settles it, which is the reason to file the form rather than to shrug at it (`R05-8004scan-api.md`) |

### 11.5 What the submission must not claim

No weighting between the three main criteria, because the Weight column on the live page is published empty.
Nothing about Phase 2, which prints `[REDACTED]`. No COMPLETED escrow job before it is completed. No fiat
rate beside a token whose peg we have not read. No aggregate star rating. And the AI disclosure ships in the
submission and in the public README even though neither programme page states a disclosure rule, which is
`10-DOCS-AND-POLICY.md`'s call and is cheaper than the alternative.

## Decisions and rejected alternatives

| Decision | Rejected alternative | Why |
| --- | --- | --- |
| The chain is the primary index, a foreign index is a cross-check with its lag rendered | 8004scan as primary with a log backfill as fallback, which is what `../ARCHITECTURE.md` section 3.2 designs | its BSC indexer self-reported `status: down` with a checkpoint about 32 hours stale, it holds 30,654 fewer agents than the chain on `/stats/global` and 31,474 fewer on its `/agents` list endpoint, its own two counters disagreeing by 820. It also 404s agents whose `ownerOf` answers and its read path returned non-200 on 20.8% then 56.7% of calls in two windows on one day. `R16-reuse.md` marks that section invalidated on both halves |
| Change detection is a `tokenUriHash` diff, with a bounded log tail as the second layer | a from-genesis `eth_getLogs` backfill | the free endpoints cap logs at 5,000 blocks and refuse archive depth, which is about 8,200 requests over the 40.93 million blocks since the first registration. There is also no `updated_after` filter, no cursor and no agent webhook on any index |
| One SQLite file in WAL mode, through the runtime's own `node:sqlite` | Postgres or Redis beside it. An external SQLite driver | one write path per table, 335k rows and a 0.27 GB corpus. Three processes hold a write connection, which WAL plus a 5000 ms `busy_timeout` plus a bounded batch hold makes ordinary rather than a race. A second service is operational surface with no gain, the queue is a table and an external driver is a native build plus a grant row for an API Node already ships |
| One always-on machine we already operate | a serverless host or a new paid host | a 30.5 minute sweep cannot run in a function, there is no persistent volume for the blob store and spending real money is an operator decision rather than a build decision |
| The facilitator is its own OS process on a unix socket with no TCP port | the literal reading of "in process", with the relayer key inside the web server | `08-MONEY.md` means ours rather than hosted, which the socket preserves exactly. It also means a compromise of the render path reaches no key |
| `ledger` append runs inside the same isolated process | append from `web` or `worker` with the signing key in their environment | then no other process can produce a signed entry and the seven append invariants sit on the same side of the boundary as the key |
| Node 22 everywhere | bun, which our carried spine is verified under | the port is one task with a check, where an unverified runtime under the render path is a risk with no upside. Python was rejected separately: both traps we measured are Python-shaped, the Cloudflare 403 on its default user agent and `is_global` passing multicast and NAT64 |
| `node:test` plus HTML assertions over fetched markup | a browser driver | asserting over server-rendered HTML **is** the scripting-off contract and a driver is another dependency, another grant row and half a day we do not have. The JS path gets one recorded manual pass |
| No Solidity ships at all | our own escrow, a bond contract or an `IACPHook` | escrow rides the official ERC-8183 stack and `setPolicyWhitelist` is owner-only, so we could not register a policy anyway. Every hour not spent on Solidity is an hour on the journey the rubric names |
| A `live` listing is probed every 5 minutes | the 10 minutes an earlier pass of `06-QUALITY.md` carried, since withdrawn | H3 requires a passing probe under 15 minutes old at render time. At 5 minutes one pass then two failures reaches the edge. At 10 minutes one missed cycle crosses it silently |
| The full sweep runs every 6 hours | daily, which both sibling documents carried before this pass reconciled them | `03-TAXONOMY.md` sets a 6 hour display ceiling on sweep-derived fields and a keyless sweep costs 30.5 minutes, so the tighter number is free. Daily becomes the floor |
| Registration bytes live in a content-addressed blob store keyed by `tokenUriHash` | bytes on the `agent` row or dedupe by owner or by name | 215 of 600 sampled agents share one byte-identical `data:` URI under 215 distinct owners, so owner dedupe fails completely and name dedupe catches only the exact string. Hashing collapses it in one pass and the same hash drives `duplicateClusterId` |
| Ten new collections, each named with the document that needs it | overloading `ledgerEntry` bodies for disputes, screening and scheduler state | the ledger is payments and job outcomes and stuffing operational state into a hash chain makes every append a consensus event. `07-MATCHING.md` chose the opposite trade for decision records deliberately, which is why those stay in the ledger |
| `transferWithAuthorization` with our relayer submitting | `receiveWithAuthorization`, which `VERIFIED-payment-rail.md` prefers where the payee holds code | the receive form pins `msg.sender` to the payee and our relayer is not the payee, so it cannot call that form at all. The open submission window costs nothing once the payee and the amount are fixed on the quote, which section 0 now states rather than leaving implied |
| Paid conformance probes priced in USD1 | `$U`, which is what the escrow leg uses | the live BSC resource we probe prices in USD1: its decoded leg carries `asset` `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` with `extra.name` `World Liberty Financial USD` (`R12-agent-comms.md`). One token per kernel forces `$U` on escrow, so the two legs are funded separately instead of pretending one token covers both |
| Implementation drift degrades the hire path and clears itself on a matching fingerprint | closing the hire path until a human clears it | judging runs fourteen unattended days, so a check only a human can reopen reads as a dead marketplace. Reads stay up, the hire button states its reason and an upgrade that changes no selector, no `DOMAIN_SEPARATOR()` and no `getVersion()` clears with nobody woken |
| A per-host cap on `live` rows, the excess held at `indexed` with the reason on the row | rotating the rows on a busy host so each is probed less often | a rotated row is a row rendered on a stale verdict, which `05-ONBOARDING.md` rejects explicitly and section 4.1 step 5 withdraws anyway. 40 requests a minute per host is 200 per 5 minute cycle, so the cap is arithmetic rather than taste |
| A displayed quote expires in 180 s, the ERC-8183 leg keeps 900 s | one 900 s TTL everywhere, matching the SDK | `03-TAXONOMY.md` caps the price cell at 180 s, so a single 900 s TTL lets a buyer hold a valid signature against a price cell that has already gone unknown. Split, the signature and the cell expire together |
| A static fallback plus a nightly signed dump, both above the cut line | trusting one always-on process and one SQLite file for fourteen unattended days | the submission has to answer for the whole judging window and `14-GAPS.md` names both, with no other owner. The fallback is one build step from the pre-submit gate and the dump is one nightly job, so neither is a subsystem |
| The SSRF deny table is written out, including multicast and NAT64 | a language's own `is_global` or `is_private` check | measured: Python 3.11.5 returns `is_global=True` for `224.0.0.1`, `239.255.255.250`, `ff02::1`, `ff00::1` and `64:ff9b::7f00:1`. Our runtime is not Python, which is the reason not to inherit any runtime's opinion |
| Connect to the resolved address with the hostname preserved and never follow a redirect | resolve, check, then connect by hostname | a check and a connect that resolve separately is a rebinding window and a public host that 302s to a metadata address defeats a pre-flight on its own |
| No image is ever loaded from an agent-controlled URL | proxy avatars through our own signed image proxy | GitHub disabled image rendering in Copilot Chat entirely to close this class **despite already having** an HMAC-signed proxy. Server-side fetch, re-encode and serve from our origin or show nothing |
| The availability canary runs on GitHub's infrastructure | a checker on our own machine | a check from inside our network proves nothing about what a judge sees, which is the same reason our authenticated `gh` calls do not prove the repo is public |
| Attestation reads are cached 60 s in memory and never persisted | store the badge on the listing | 11.58% of all BABTs ever minted are revoked or burned, so a persisted badge is a claim that decays silently |
| One listing per `(agentId, category)`, enforced by a unique index | many listings per agent per category | otherwise one operator fills a shelf with the same agent under four sub-capabilities and shelf position stops meaning anything |
| The cut list is fixed now, cut from the bottom up | decide what to drop when the time runs out | a list written under pressure protects whatever was most recently touched. This one protects the demo path and the four tracks |
| Every disagreement between sources renders | prefer one source silently | the disagreement is the Data Quality argument. A rival's landing page shows `--` for three of four headline metrics because it single-sources one index |

## Open questions

- **Whether the subdomain certificate and DNS land cleanly on the day.** The apex is proven, it already
  serves HTTPS with a 200 and a JSON well-known file (`R12-agent-comms.md`), but the subdomain itself is
  unissued. Settled by doing it in the first block, which now starts on 2026-09-05 rather than at 00:00 on
  the 6th, so a failure has more than 80 hours of slack rather than none. `notAfter` later than 2026-09-23
  is asserted in the same block.
- **Whether the sweep still costs 30.5 minutes on the day.** Measured once, on one endpoint, at 183 agents a
  second (`R01-erc8004.md`). The registry grows about 2,110 a day, so the figure drifts up on its own. The
  scheduler treats the number as a budget and records the real duration in `run`.
- **Whether one machine's disk keeps up with a full sweep writing while two other processes write.** The
  lock policy is settled in section 2.1 (WAL, a 5000 ms `busy_timeout`, batches of 500, the ledger append on
  its own connection), so what is open is the number rather than the design: whether a batch really holds
  the write lock under 250 ms on this disk. The cadences in section 3.5 are design budgets, not
  measurements. The first full sweep on the box is the measurement and the fallback is a longer sweep
  interval rather than a second machine.
- **The reverse proxy's licence, plus the terms behind the two non-publicnode RPC hosts.**
  `R15-compliance.md` read none of the three, so all three are **unverified** and each needs a quoted clause
  or an explicit "no terms found" in `DATA-SOURCES.md` before the repo flips. That is a gate in section 11,
  not a nice-to-have. The store adds no row, because `node:sqlite` ships inside the runtime.
- **Whether a third-party agent answers a real mainnet hire inside the window.** Two publish a price of 0.10
  and 0.25 `$U` with live endpoints (`R02-erc8183.md` through `02-THESIS.md`). If none answers, the receipt on
  the demo path is a first-party one and `/coverage` says so in the column that tracks it.
- **Whether the address holding 99% of ERC-8183 jobs is one operator or a platform router.** Unverified.
  `06-QUALITY.md` needs either the answer or a rule that holds both ways. It does not change anything in this
  document, since `escrow-index` publishes the per-provider split either way.
- **Whether GitHub's scheduled runs fire often enough for a 15 minute canary.** Unverified. Treated as
  unreliable: a gap in the history renders as a gap, never as an outage and never as a pass.
- **Whether B402 credentials arrive before the close.** Unverified, with manual per-environment review and no
  published turnaround. Nothing structural depends on it: the client sits behind the same two methods as our
  own facilitator and the switch is a config flip.
- **Whether the operator authorises the float in time.** The ask is about 0.02 BNB, 40 USD1 and 2 `$U`,
  which covers the mainnet brokered hire, the eight Altana key registrations, the escrow call sequence and
  the paid probes to their global ceiling. `cli float` prints it in the first block of day 1 with the amounts,
  the destinations and the `$U` venue, so the decision has more than 24 hours before the 03:00 gate on
  2026-09-07. Moving real money stays a human decision, which is why the cut line carries a branch for a
  float that never arrives rather than a plan that assumes one.
- **Where the Agent Advantage Report is filed.** Unverified, no channel is named on either page, so it ships
  as a public URL inside the submission and as a file in the repo.
- **Whether judges read the repository at all.** Unverified, since all three published criteria are
  properties of the running site. The flip and the licence gates run regardless, because a submitted writeup
  that links a private repo is broken for every judge who clicks it.