# SPINE: the internal contract for the sixteen documents

Written 2026-09-05. Build closes 2026-09-09 UTC+0.

Every author reads this file first, before their own research files. It fixes the product name,
one term per concept, the component names, the data model field names, every constant that more
than one document cites, the list of things nobody has proved and one scope line per document.

**Three rules bind every author.**

1. **A number originates here.** If a constant appears in this file, cite it from here and do not
   re-derive it. If a document needs a constant that is not here, take it from the named research
   file and say which file. Never state a value from memory.
2. **Precedence, when two sources disagree.** `VERIFIED-payment-rail.md` beats every research
   file, because every line of it was run by hand. A research file beats `../ARCHITECTURE.md`,
   `../ARCHITECTURE-PART-2.md` and `../ONBOARDING.md`. This file beats all of them on names and on
   constants. Where a conflict is already known it is settled in **Conflicts already settled**
   below, so do not re-open one without new evidence.
3. **Verified and unverified are labelled separately, always.** Every claim is either traceable to
   a call we ran or a page we read. Anything else carries the word unverified in the same sentence. The
   **Unverified** section is the checklist. Anything on it that appears in a document without that
   label is a defect.

## The product name

The product is **Muster**.

One word, capitalised, used identically in every document, in the UI, in the repo name, in the
submission and in the video. Not MUSTER, not Muster.ai, not Muster Marketplace, not "the Muster
platform". When a sentence needs the full form once, it is "Muster, the BNB Agent Studio
marketplace".

The name carries the two things the product is. A muster roll is the honest record of who is
present and fit for duty. To pass muster is to meet a stated standard. Muster is the roll of BSC
agents that answered and the bar a listing has to clear to reach a buyer.

Checked against the field before choosing it. `muster` appears nowhere in `R14-rivals.md`, in the
206-repo rival census, in the five incumbent ERC-8004 explorers or in any of the other-chain
marketplaces studied. A live GitHub search for `muster erc-8004` returns zero repositories and
`muster in:name agent` returns three, none of them a BNB agent marketplace and none pushed since
2026-06-23. The names the field converged on are the ones to stay away from: fourteen repos are
literally `bnb-agent-marketplace`, four are some form of `mandate` and three are `assay`.

## Canonical vocabulary

One term per concept. The rejected column is not style advice, it is a list of words that must not
appear in that meaning anywhere in the sixteen documents.

| Term | Means exactly | Rejected for this meaning |
| --- | --- | --- |
| **Muster** | the marketplace itself, the product we ship | the platform, the protocol, the app, the DApp, the site, the directory |
| **agent** | one ERC-8004 identity on BSC, that is one `agentId` in the Identity Registry | bot, AI agent, service, model, worker |
| **operator** | the human or team that controls an agent, proven from `ownerOf` or `isApprovedForAll` | seller, vendor, developer, publisher, owner, provider. "The seller side" is allowed for the supply half of the market, never for a party: an operator is never "a seller" |
| **OperatorBond** | the E1 stake contract, specified in `05-ONBOARDING.md` and `09-DISPUTES.md` and deployed nowhere. One name, because two documents cite it | MusterBond, HireEscrow, the bond, the stake contract |
| **provider** | the ERC-8183 on-chain role, the address in `job.provider` that gets paid | (use only for that role, never for a person) |
| **buyer** | the party that pays for a job, human or agent | user, customer, consumer, hirer, client |
| **client** | the ERC-8183 role `job.client` and the ERC-8004 `getClients` role | (use only for those roles) |
| **listing** | Muster's record of one agent offered under one category contract, carrying price, terms, freshness and evidence. One agent may hold up to four listings | offer, gig, product, SKU, service, item |
| **job** | one unit of paid work with a lifecycle and a receipt | task, order, request, engagement, gig |
| **escrow job** | an ERC-8183 job on the official kernel, identified by `jobId` | job (unqualified), order, contract |
| **hire** | the buyer's act and the moment money is committed. A hire is a job that reached a paid state | purchase, checkout, booking, activation |
| **hireable bar** | the gate a listing has to pass to reach a shelf. `02-THESIS.md` defines it, everybody else uses this name for it | quality bar, minimum standard, threshold, filter |
| **probe** | one automated call Muster makes to an agent's declared surface to establish one fact, carrying its own timestamp, status and verdict | health check, ping, crawl, test, monitor |
| **category** | one of the four mandated shelves: rebalancing, grid trading, yield, health factor | vertical, tag, sector |
| **category contract** | the machine-checkable definition of a category: named inputs, named outputs, units and the question it answers | category, schema, capability, skill, taxonomy node |
| **shelf** | the buyer-facing surface for one category. UI vocabulary only | tab, tile, section, feed |
| **Muster score** | our own composite, computed from settled jobs only, shrunk toward the category prior, time-decayed, shown with its interval and its sample size | rating, stars, grade, trust score, reputation |
| **rank** | position in one sorted list, nothing more | score, rating, tier |
| **reputation** | raw ERC-8004 feedback, which Muster displays with its author and never treats as a score | Muster score, rating |
| **reachability ladder** | what a probe measured about an agent's wire surface. Tiers **T0** to **T3**, defined in `MEASUREMENT.md` | evidence ladder, trust ladder, health tier |
| **evidence ladder** | what an operator has earned. Tiers **E0** to **E4**, defined below | reachability ladder, KYC ladder, verification level |
| **session** | an Altana session: a call allowlist, a spend cap and an expiry, registered in the Altana Keystore and readable on the agent's own wallet | delegation, permission, grant, key, approval |
| **attestation** | a third-party human or identity credential: BABT, Galxe Passport, a BNB Passport schema hit or a BAS attestation | verification, KYC, badge, proof |
| **quote** | a signed, expiring price for one job from one agent | price, estimate, bid, offer |
| **refusal** | an agent's structured no, naming which condition failed. A correct refusal is a success | error, rejection, decline, failure |
| **receipt** | the permanent public record of one job: content hash, transaction, block, inputs, pinned block and the command to recompute it | proof, certificate, invoice, attestation |
| **settle** | the money movement and the permissionless ERC-8183 call of that name | payout, release, capture, disburse |
| **index** | Muster's own store of agent records, built from BSC | database, cache, mirror, catalogue, registry |
| **registry** | strictly the three ERC-8004 contracts on BSC | index, catalogue, our store |
| **freshness stamp** | the triple attached to every number Muster shows: block number, timestamp and source | last updated, as of, cache time |
| **ledger** | the append-only hash-chained record of every payment and job outcome, each entry tagged `origin` | log, history, audit trail |
| **origin** | the ledger tag, exactly `house` or `order`. Revenue and volume count `order` only | source, type, kind |

### The four categories, spelled one way

Prose: rebalancing, grid trading, yield, health factor. Slugs: `rebalancing`, `grid`, `yield`,
`health-factor`. Never `healthFactor`, never `health-factor-monitoring`, never
`yield-optimisation`, never `monitoring`. The launch blog listed monitoring as a category and the
live rubric page replaced it with rebalancing, so monitoring is not one of the four.

### The evidence ladder, E0 to E4

| Tier | Earned by | Unlocks |
| --- | --- | --- |
| **E0 Listed** | an agent id whose control the operator proved | appears in search, ranked last, score shown as provisional |
| **E1 Bonded** | a refundable stake held in Muster's own escrow | ranked in the main list, dispute rights |
| **E2 Proven** | settled jobs through Muster in that category | shelf placement, full-weight feedback, category badge |
| **E3 Attested** | any one of BABT, Galxe Passport or a BNB Passport hit | human-verified badge, higher caps, dispute filing |
| **E4 Accountable** | E3 plus a live Altana session a buyer can read and revoke | hireable over ERC-8183, top of the default sort |

E3 is an OR across three attestations, never BABT alone. E1 needs no document and no exchange
account, so it is always reachable. E3 is never a prerequisite for E1.

### Two words the rubric uses and we do not

The rubric says **activate**. Our word is **hire**. Quote the rubric verbatim where a document
quotes it, then use hire everywhere else. The rubric says **agent diversity** for the
four-category bar. Use that phrase only when naming the criterion.

## Component names

These are the names `15-SYSTEM.md` uses in its component map and every other document uses when it
needs to say which part does a thing. One line each. 15-SYSTEM expands them. Nobody renames them.

| Component | Owns |
| --- | --- |
| `registry-reader` | pinned-block reads of the three ERC-8004 contracts through Multicall3, plus the `_lastId` storage read that gives the exact agent count in one call |
| `indexer` | sweeps agent ids 0 to `_lastId - 1`, writes one agent record each, tails on the `_lastId` delta, reconciles against a second index and never blocks a page render |
| `resolver` | turns a `tokenURI` into a registration document, handling all six shapes it takes in the wild, behind the SSRF guard, returning null rather than throwing |
| `prober` | runs the probe suite against every declared surface, assigns a reachability tier, records status, TLS verdict, DNS verdict, latency and its own timestamp |
| `classifier` | assigns category contracts from declared skills first then text, records the `basis` and abstains rather than guessing |
| `conformance` | the published suite that asserts a listing satisfies its category contract and the wire contract, with pass or a named failure per assertion |
| `quality` | computes the Muster score, its interval, its sample size and the evidence tier, from settled jobs only |
| `matcher` | intent to dispatch: eligibility filter, feasibility check, ranking, selection, the bounded exploration slot, failover |
| `broker` | the hire path end to end: quote, payment challenge, dispatch, deliverable, receipt |
| `facilitator` | x402 verify and settle behind one interface, with an in-process implementation we run and a B402 client behind the same interface |
| `escrow-index` | indexes the official ERC-8183 kernel, router and policy, joins `job.provider` back to an agent id, publishes per-provider and per-category counts with the window |
| `settler` | calls the permissionless ERC-8183 `settle` the moment a dispute window elapses, for any job, not only ours |
| `ledger` | the append-only hash-chained record, `origin` enforced at append time, `walk()` returning per-entry failures |
| `evidence-store` | content-addressed job artifacts and dispute bundles, addressed by the hash the receipt publishes |
| `session-panel` | reads an agent's Altana allowlist, spend cap, expiry and revoke state live from chain on every render, with the Revoke button wired to `revokeSession` |
| `screening` | wallet-level sanctions screening against the Chainalysis oracle plus our own SDN ingest, with the result recorded at write time |
| `sampler` | polls the time series no free surface keeps: in-range seconds, pool liquidity, staked in-range liquidity, indexer freshness |
| `web` | the public surface: land, shelf, listing, compare, hire, receipt, report, status |
| `api` | the public REST read surface, no auth, paged `{ items, page, pageSize, total, totalPages }` |
| `mcp` | the machine face, with tool names that do not collide with 8004scan's or a rival's |
| `status` | the public status page, the per-source freshness banner and the anonymous canary that runs through judging |

## Data model field names

Names and types only. `15-SYSTEM.md` expands these into tables or collections and adds indexes,
keys and constraints. Every other document uses these names and adds none.

**Spelling rule.** camelCase for every Muster field, in storage, in code and in our own JSON. When
we emit or parse somebody else's envelope (the ERC-8004 registration document, an x402 payload, an
ERC-8183 job description, an A2A card) we use that envelope's own spelling verbatim and never
normalise it in place. The ERC-8183 job description is snake_case on the wire and stays that way.

Money rule. Every amount is a base-unit decimal string plus its `decimals` and its `token`. Never
a float, never a number, never a hardcoded decimals count.

### agent

`agentId` (uint string), `chainId` (56), `owner`, `agentWallet`, `agentWalletIsDistinct` (bool),
`tokenUri`, `tokenUriHash`, `uriScheme` (enum), `registrationParsed` (bool), `registrationError`,
`name`, `description`, `image`, `active`, `services[]`, `declaredSkills[]`, `declaredDomains[]`,
`x402Declared` (bool, read from both spellings), `supportedTrust[]`, `registrations[]`,
`firstSeenBlock`, `lastSeenBlock`, `duplicateClusterId`, `sourceSet[]`, `freshness`.

### listing

`listingId`, `agentId`, `category` (slug), `categoryBasis` (`declared` | `text` | `probe`),
`categoryConfidence`, `contractVersion`, `title`, `summary`, `inputSchema`, `outputSchema`,
`priceBase` (string), `priceToken`, `priceDecimals`, `priceRail` (enum), `deliveryTarget`,
`refusalConditions[]`, `reachabilityTier` (T0..T3), `evidenceTier` (E0..E4), `musterScore`,
`scoreLowerBound`, `scoreSampleSize`, `visibility` (`live` | `indexed` | `suspended` |
`delisted`), `lintFindings[]`, `lastProbe`, `lastHire`, `freshness`.

### probeResult

`probeId`, `agentId`, `target` (url), `surface` (`a2a` | `mcp` | `http` | `x402` | `wellKnown`),
`assertion`, `verdict` (`pass` | `fail` | `skip`), `httpStatus`, `dnsVerdict`, `tlsVerdict`,
`latencyMs`, `bodyKind`, `failureClass` (`dns` | `tls` | `http` | `template` | `shape` |
`timeout`), `observedAt`, `prober`, `rawHead`.

### quote

`quoteId`, `listingId`, `agentId`, `buyer`, `priceBase`, `priceToken`, `priceDecimals`,
`expiresAt`, `negotiationHash`, `providerSig`, `signerRecovered`, `signerMatchesProvider` (bool),
`verifyingContract`, `chainId`, `issuedAt`.

### job

`jobId` (ours), `escrowJobId` (ERC-8183, nullable), `listingId`, `agentId`, `buyer`, `provider`,
`state`, `priceBase`, `priceToken`, `priceDecimals`, `rail`, `quoteId`, `requestHash`,
`responseHash`, `deliverableUri`, `deliverableRule` (`keccakCanonical` | `sha256Raw` |
`keccakRaw` | `none`), `startedAt`, `deliveredAt`, `terminalAt`, `terminalState`, `refusal`,
`disputeId`, `receiptId`, `origin`.

### payment

`paymentId`, `jobId`, `rail` (`eip3009` | `permit2Exact` | `permit2Upto` | `escrow8183` |
`directTransfer`), `token`, `decimals`, `amountBase`, `payer`, `payTo`, `nonce`, `validAfter`,
`validBefore`, `txHash`, `blockNumber`, `settledAt`, `facilitator`, `gasPaidBy`, `feeBase`,
`state`, `origin`.

### receipt

`receiptId`, `jobId`, `contentHash`, `hashRule`, `txHash`, `blockNumber`, `pinnedBlock`,
`inputsHash`, `codeVersion`, `recomputeCommand`, `publishedAt`.

### session

`sessionId`, `agentId`, `walletAddress`, `keyId` (Keystore, `keccak256(publicKey)`), `keyHash`
(account, a different value for the same key), `publicKey`, `allowlist[]` (`{target, selector}`),
`spendCaps[]` (`{token, period, limitBase}`), `expiry`, `registered` (bool), `revokedAt`,
`explorerUrl`, `lastReadBlock`.

### ledgerEntry

`seq`, `prevHash`, `entryHash`, `kind`, `origin`, `ts`, `body`, `sig`.

## Verified constants

The single place a number is allowed to originate. Every row was read from chain or from a live page
on 2026-09-05 by the named file. Chain is BSC mainnet, chain id **56**, unless a row says 97.

### Chain and RPC

| Constant | Value | Proved in |
| --- | --- | --- |
| Chain id | `56` mainnet, `97` testnet | R01, R04 |
| Primary RPC | `https://bsc-rpc.publicnode.com` | R01, MEASUREMENT |
| Archive and fork RPC | `https://bsc-mainnet.public.blastapi.io` (publicnode refuses archive) | R04 |
| Fastest keyless batcher | `https://bsc.rpc.blxrbdn.com`, 200 calls in 0.27 s | MEASUREMENT |
| Testnet RPC | `https://bsc-testnet-rpc.publicnode.com` | R04 |
| Measured block time | 0.45000 s over 1,000 blocks, 0.45017 s over 100,000 | R09 |
| `eth_getLogs` cap on publicnode | 5,000 blocks, recent only, then `Archive requests require a personal token` | MEASUREMENT, R01 |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11`, 3,808 bytes | R01, R10 |
| Multicall3 batch ceiling | `aggregate3` takes 1,500 sub-calls in one `eth_call`, 2,500 hits the 30 s node timeout | R01 |
| Measured sweep rate | 183 agents/s, so about 30.5 min, 670 `eth_call`s and 0.27 GB for the whole registry | R01 |
| Gas price at measurement | 50,000,000 wei = 0.05 gwei | R04, R08 |
| EIP-1967 implementation slot | `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` | VERIFIED, R01 |
| EIP-7702 is live on BSC | delegation designator `0xef0100` found on live EOAs | R04 |

### ERC-8004 on BSC

| Constant | Value | Proved in |
| --- | --- | --- |
| Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, `name()` `AgentIdentity`, `symbol()` `AGENT` | R01, MEASUREMENT, R05 |
| Identity implementation | `0x7274e874CA62410a93Bd8bf61c69d8045E399c02`, 14,474 bytes | R01 |
| Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | R01, R10 |
| Reputation implementation | `0x16e0FA7f7C56B9a767E34B192B51f921BE31dA34`, 10,491 bytes | R01 |
| **Validation Registry** | `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`, `getVersion()` `2.0.0`, wired to the Identity Registry | R01 |
| Validation implementation | `0xDB31f5d9167f8ebc8B30FbBF814c4d297c2D7F99`, 5,876 bytes | R01 |
| All three are UUPS proxies | 130 bytes of proxy code each, `getVersion()` `2.0.0`, OZ upgrade interface `5.0.0` | R01 |
| Upgrade authority, Identity and Reputation | 3-of-5 Safe `0xF223968Dd0c66472E31043acAcCcF5D1464D644b`, Safe 1.4.1 | R01 |
| Upgrade authority, Validation | single EOA `0x8888d0A88ef8302dfa4BA53c41c2fE3c4E486f42` | R01 |
| Agent count slot (`_lastId`) | `0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00`, from `cast index-erc7201 "erc8004.identity.registry"` | R01, MEASUREMENT |
| Ids start at | **0**, not 1. `agentId = $._lastId++` in all three `register` overloads | R01, MEASUREMENT |
| `totalSupply()` | **reverts**. Not ERC721Enumerable, `supportsInterface(0x780e9d63)` false | R01, MEASUREMENT |
| Interfaces advertised | ERC-165, ERC-721, ERC721Metadata, **ERC-4906** all true | R01 |
| First registration | block **79,094,807**, 2026-02-03T17:01:53Z, tx `0xdf12ce11…a5c1b` | R01 |
| Reserved metadata key | `agentWallet`, the only one. Rejected by `setMetadata` and by the register overload with `reserved key` | R01 |
| Metadata keys in live use | `agentWallet`, `platform`, `platformAgentId`, `displayName`, `profileURL`, `termix.metadataHash`. `category`, `skills` and `x402Support` are populated on zero agents | R01 |
| `setAgentWallet` EIP-712 | domain `("ERC8004IdentityRegistry", "1", 56, registry)`, struct `AgentWalletSet(uint256 agentId,address newWallet,address owner,uint256 deadline)`, signed by the **new wallet**, deadline window at most **300 s** | R01, MEASUREMENT |
| Testnet registries (97) | identity `0x8004A818BFB912233c491871b3d84c89A494BD9e`, reputation `0x8004B663056A597Dffe9eCcC1965A193B7388713`, validation `0x8004Cb1BF31DAf7788923b405b754f57acEB4272`. All three are 130-byte proxies. **The chain-97 validation registry is live, not a stub**: `getVersion()` `2.0.0` and `getIdentityRegistry()` returns the chain-97 identity registry, re-read on two independent endpoints. The stub carrying that same address sits on **chain 56**, over implementation `0xd53dE688e0b0ad436FBdbDa00036832FF6499234`. That is the one whose `getIdentityRegistry()` reverts | R01, corrected by 11-BNB-STACK |

### ERC-8004 selectors and event topics

| Signature | Selector or topic0 | Proved in |
| --- | --- | --- |
| `tokenURI(uint256)` | `0xc87b56dd` | R01 |
| `ownerOf(uint256)` | `0x6352211e` | R01 |
| `getAgentWallet(uint256)` | `0x00339509` | R01 |
| `getMetadata(uint256,string)` | `0xcb4799f2` | R01 |
| `setAgentURI(uint256,string)` | `0x0af28bd3` | R01 |
| `setAgentWallet(uint256,address,uint256,bytes)` | `0x2d1ef5ae` | R01 |
| `register(string)` / `register(string,(string,bytes)[])` | `0xf2c298be` / `0x8ea42286` | R01 |
| `getClients(uint256)` | `0x42dd519c` | R01 |
| `getLastIndex(uint256,address)` | `0xf2d81759` | R01 |
| `getSummary(uint256,address[],string,string)` | `0x81bbba58` | R01 |
| `readAllFeedback(uint256,address[],string,string,bool)` | `0xd9d84224` | R01 |
| `giveFeedback(...)` | `0x3c036a7e` | R01, R10 |
| `appendResponse(uint256,address,uint64,string,bytes32)` | `0xc2349ab2` | R01 |
| `getAgentValidations(uint256)` | `0x8d5d0c2d` | R01 |
| `validationRequest(address,uint256,string,bytes32)` | `0xaaf400c4` | R01 |
| `Registered(uint256,string,address)` | `0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a` | R01, MEASUREMENT |
| `URIUpdated(uint256,string,address)` | `0x3a2c7fffc2cba7582c690e3b82c453ea02a308326a98a3ad7576c606336409fb` | R01 |
| `MetadataSet(uint256,string,string,bytes)` | `0x2c149ed548c6d2993cd73efe187df6eccabe4538091b33adbd25fafdb8a1468b` | R01 |
| `NewFeedback(...)` | `0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc` | R01, MEASUREMENT |
| `Transfer(address,address,uint256)` | `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef` | R01 |
| `ERC721NonexistentToken(uint256)` | error selector `0x7e273289` | R01, MEASUREMENT |
| `keccak("agentWallet")`, the **second** indexed topic on `MetadataSet` | `0x2ac6109326e720d1435c0db66f7e35eda7839f52b6f1f5520a60788e132b4e39` | R01 |

An indexed `string` event topic is always `keccak256` of the UTF-8 bytes, so filter `MetadataSet`
and `NewFeedback` by hash and never by string. **The key hash is `topics[2]`, not `topics[1]`.**
`MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, ...)` puts the agent id
first, so the `eth_getLogs` filter is positional and a key hash in the `topics[1]` slot returns zero
rows with no error:

```
topics: [ 0x2c149ed5…1468b, null, keccak(key) ]
```

`keccak("")` is
`0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470`.

### ERC-8183 on BSC, the official hire rail

| Constant | Value | Proved in |
| --- | --- | --- |
| AgenticCommerce kernel, mainnet | `0xEa4DAa3100A767e86FDed867729ae7446476EBA6`, 130-byte proxy | R02, R16 |
| EvaluatorRouter, mainnet | `0x51895229E12F9876011789B04f8698af06cCD6DA` | R02 |
| OptimisticPolicy, mainnet | `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5` | R02 |
| Payment token | `0xcE24439F2D9C6a2289F741120FE202248B666666`, `$U`, United Stables, 18 decimals. One token per kernel, so every escrow job is priced in `$U` | R02, R06, R16 |
| `disputeWindow()` mainnet | **604800 s (7 days)** | R02, R06 |
| `platformFeeBP()` | **0** today, `MAX_PLATFORM_FEE_BP` 1000, `BP_DENOMINATOR` 10000, owner can change it | R02 |
| `MAX_EXPIRY_DURATION()` | 31,536,000 s. `expiredAt` must be more than 300 s ahead | R02 |
| `HOOK_GAS_LIMIT()` | 1,000,000 | R02 |
| Hook is mandatory | `hook = address(0)` reverts `HookRequired()` `0x55c45de1`. It must pass ERC-165 `IACPHook` `0x7ff6bc9e`. There is no hook allowlist | R02 |
| Job status enum, order locked | `0 OPEN, 1 FUNDED, 2 SUBMITTED, 3 COMPLETED, 4 REJECTED, 5 EXPIRED` | R02, R16 |
| `settle` is permissionless | anyone may call `router.settle(jobId, evidence)` once `submittedAt + disputeWindow` elapses. Silence approves | R02 |
| Policy reasons | `REASON_APPROVED` `0xcff4b2730cac7938c235056123e2b993a9ad6c647dcf36188f099ba8b8cb6845`, `REASON_REJECTED` `0xb9b7ef8cad1a17a35730d4cfa27844586a1e7eb45522adb6013816c101cdf9f6` | R02 |
| Dispute panel | `voteQuorum()` 3, `activeVoterCount()` 5, admin `0x5057b09A4b510ccaf7e3fb3038Ba60713E62B1fc` | R02 |
| Selectors | `createJob` `0x41528812`, `setProvider` `0xc9a84bb9`, `setBudget` `0xdd4ae9d4`, `fund` `0xd2e13f50`, `submit` `0x9e63798d`, `complete` `0xd75bbdf3`, `reject` `0x41dd26f5`, `claimRefund` `0x5b7baf64`, `getJob` `0xbf22c457`, `jobCounter` `0x50355d76`, `registerJob` `0x51d5456d`, `settle` `0x39c2ebb9`, `dispute` `0x86d6282c` | R02 |
| Event topics | `JobCreated` `0xb0f0239b…79b9`, `JobFunded` `0xbdb056de…ac52` (four fields, not the three the EIP lists), `JobSubmitted` `0x80c17db7…538e`, `JobCompleted` `0x0fd54bd3…1444`, `JobRegistered` `0xab6d9121…5715`, `JobSettled` `0x771fbd01…96fc`, `JobInitialised` `0x979e9cbf…3a8d` (emitted by the policy, the only on-chain home of the deliverable pointer) | R02 |
| Quote signing | `negotiation_hash = keccak256(utf8(canonicalJson(description minus negotiation_hash and provider_sig)))`, `provider_sig` is EIP-191 over that hash **as a hex string**. Reproduced on 4 of 4 live jobs. Quote TTL capped at 900 s by the SDK | R02 |
| Testnet (97) | kernel `0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE`, router `0xD7d36D66d2F1B608A0F943f722D27e3744f66F25`, **policy `0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA`** with `disputeWindow()` **900 s**, payment token `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565`, `$U` faucet `0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3` paying 10 `$U` per 1,800 s | R02 |

### Tokens and signature capability

**Every BSC stablecoin below is 18 decimals.** Any constant carried from a 6-decimal chain is wrong
here by a factor of a trillion. Read `decimals()` at boot and assert it against the configured value.

| Token | Address | Dec | EIP-3009 | EIP-2612 | EIP-712 domain name, version | Proved in |
| --- | --- | --- | --- | --- | --- | --- |
| USDT (BSC-USD) | `0x55d398326f99059fF775485246999027B3197955` | 18 | **no** | **no** | n/a, both reads revert | VERIFIED |
| USDC (Binance-Peg) | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | 18 | **no** | **no** | n/a | VERIFIED |
| BUSD | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` | 18 | no | no | n/a | VERIFIED |
| **FDUSD** | `0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409` | 18 | **yes** | **yes** | `First Digital USD`, `1` | VERIFIED |
| **USD1** | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | 18 | **yes**, plus `cancelAuthorization` | **yes** | `World Liberty Financial USD`, `1` | VERIFIED |
| **U (United Stables)** | `0xcE24439F2D9C6a2289F741120FE202248B666666` | 18 | **yes** | **yes** | `United Stables`, `1` | R04, R16, R06 |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | 18 | no | no | n/a | VERIFIED, R04 |
| CAKE | `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82` | 18 | no | **no**, despite answering `nonces` | n/a | R04 |

On-chain `DOMAIN_SEPARATOR()`, each derived then matched byte for byte:

| Token | `DOMAIN_SEPARATOR()` | Implementation behind the proxy |
| --- | --- | --- |
| FDUSD | `0xac2ff863e00ee93e90d01514d46b9b8179ca650e856138a6d8aea00702ca62a0` | `0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50` |
| USD1 | `0x5d939dc193fd011c5e26fb861450a696546a09db6b26db26501fe354ba3ed4ba` | `0x694aa534bdef8ed63244eb902e7914e527891f08` |
| U | `0x358738403e5a61fdc30a8be78a60f289cbe4d2545b735a344b6229c70c1679b6` | `0xbef21313c69c009fd7d9510a8d3a481a32473dfc` |

Version is `1` on all three. Versions `2`, `1.0` and `v1` were each computed and each failed, so it
is settled by exclusion as well as by match. USD1 alone implements ERC-5267 `eip712Domain()`. USD1
alone accepts only the split `v, r, s` form. FDUSD and U also accept a packed 65-byte `bytes`
signature. USD1 alone lets a buyer cancel an unspent authorization on chain.

Traps, each verified. A **proxy holds no dispatch table**, so grepping the token address for a
selector reports every selector absent: read the EIP-1967 slot and grep the implementation. **WBNB
never reverts** on an unknown selector because its fallback is `deposit()`, so try/catch feature
detection reads it as supporting everything. **CAKE answers `nonces(address)`** without supporting
`permit`, so probing `nonces` alone misclassifies it. **USD1's `version()` returns `uint256 2`**
while its EIP-712 domain version is the string `1`.

### Payment rail constants

| Constant | Value | Proved in |
| --- | --- | --- |
| Permit2, canonical | `0x000000000022D473030F116dDEE9F6B43aC78BA3`, 9,152 bytes, deployed on 56 and 97 | VERIFIED, R03, R04 |
| Permit2 domain | three fields, no version: `{name: "Permit2", chainId, verifyingContract}` | R03, R04 |
| Permit2 `DOMAIN_SEPARATOR()` | mainnet `0x4142cc3c823f819c467fa4437d637fe20589a31dfcd1da2ff22292c9ed9344e7`, testnet `0x4b0ae55c3d01d102f0a8e756724fe8f86b39420717f3217a9a35504cbfdf4553` | R04 |
| **PancakeSwap's own Permit2** | `0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768`, 7,020 bytes, `DOMAIN_SEPARATOR()` `0x024cdb51703e56fe56eb1dd9dcfc321c085e4e6c3a10c912b579c56b3dbca86e`. A different contract. Signatures are not interchangeable with the canonical one | R08 |
| `x402ExactPermit2Proxy` | `0x402085c248EeA27D92E8b30b2C58ed07f9E20001`, on 56 and 97, `settle` `0x13cd3b53`, `settleWithPermit` `0xfa340378` | R03, R04 |
| `x402UptoPermit2Proxy` | `0x4020A4f3b7b90ccA423B9fabCc0CE57C6C240002` | R03 |
| EIP-712 domain typehash, 4 field | `0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f` | VERIFIED, R03 |
| EIP-712 domain typehash, 3 field | `0x8cad95687ba82c2ce50e74f7b754645e5117c3a5bec8151c0726d5857980a866` | R04 |
| `TransferWithAuthorization` typehash | `0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267` | VERIFIED |
| `ReceiveWithAuthorization` typehash | `0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8` | VERIFIED |
| `CancelAuthorization` typehash | `0x158b0a9edf7a828aad02f63cd515c68ef2f50ba807396f6d12842833a1597429` | R03, R04 |
| `Witness(address to,uint256 validAfter)` typehash | `0xd97b3239a7f32295517bd14cb074edfdd188dfe5eb42f802bb26d4fd1eb12c37` | R03, R04 |
| 3009 selectors | `transferWithAuthorization` v,r,s `0xe3ee160e` and bytes `0xcf092995`; `receiveWithAuthorization` v,r,s `0xef55bec6` and bytes `0x88b7ab63`; `cancelAuthorization` `0x5a049a70`; `authorizationState` `0xe94a0102`; `permit` `0xd505accf`; `nonces` `0x7ecebe00`; `DOMAIN_SEPARATOR` `0x3644e515` | VERIFIED, R03, R04 |
| Permit2 selectors | `permitTransferFrom` `0x30f28b7a`, `permitWitnessTransferFrom` `0x137c29fe`, `nonceBitmap` `0x4fe02b44` | R04 |
| Permit2 errors | `InvalidNonce` `0x756688fe`, `InvalidSigner` `0x815e1d64`, `SignatureExpired` `0xcd21db4f`, `InvalidAmount` `0x3728b83d`, `InvalidSignatureLength` `0x4be6321b`, `InvalidSignature` `0x8baa579f`. An **empty revert** means the signer has code and its ERC-1271 returned nothing, which is the EIP-7702 case | R04 |
| x402 version | `2` is current. Headers `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`, each base64 of UTF-8 JSON. v1 used `X-PAYMENT` and `X-PAYMENT-RESPONSE` with the challenge in the body | R03 |
| v2 field renames | v1 `maxAmountRequired` becomes v2 `amount`; `network` moves from a name to CAIP-2 (`eip155:56`); `scheme` and `network` move into `accepted` | R03, R12 |
| B402 public Bazaar | `https://www.binance.com/bapi/ramp/v1/public/ramp/b402`, no auth, 979 resources live | R03 |
| B402 authenticated paths | `POST {BASE_URL}/papi/v2/b402/{supported,verify,settle}`. **`BASE_URL` is not published**, it ships with merchant credentials | R03 |
| B402 networks | `eip155:56` and `eip155:97` only. It sponsors gas on settle and holds no custody | R03 |
| Measured 3009 settle cost | 103,395 gas FDUSD, 108,164 USD1, 103,377 U, 86,731 for the packed FDUSD form. About 0.0000052 BNB at 0.05 gwei | R04 |
| Measured Permit2 path cost | one-time `approve(Permit2, max)` 46,446 gas paid by the buyer, then 70,157 gas per proxy `settle` paid by the relayer | R04 |
| No EIP-3009 token on testnet | no chain-97 token implements it. Permit2 and the x402 proxy are both live on 97 | R04 |

### 8004scan, our enrichment source

| Constant | Value | Proved in |
| --- | --- | --- |
| API base | `https://api.8004scan.io/api/v1`, backend `0.4.363`, OpenAPI 3.1.0, 150 paths | R05 |
| Auth | most reads need none. `X-API-Key` or a wallet JWT for the rest | R05 |
| Rate limits | anonymous 30/min and 1,000/day per IP. Self-service `free_api` key 600/min and 100,000/day | R05 |
| `limit` ceiling | 100. `limit=101` returns 422 | R05 |
| Mandatory header | any `User-Agent` except `Python-urllib/*`, which Cloudflare 403s even with a valid key | R05 |
| The one write lever | `POST /agents/verify-endpoint/{chain_id}/{token_id}`, **no auth**, once per hour per agent, queues the ERC-8004 domain check | R05 |
| Its v5 score weights | engagement 0.30, service 0.25, publisher 0.20, compliance 0.15, momentum 0.10, band floor 30.0 ceiling 55.0 | R05 |
| Freshness endpoints | `/status/indexers`, `/status/indexers/direct`, `/status/freshness`, `/status/components` | R05, R14 |
| Its BSC state on 2026-09-05 | chain 56 indexer `status: down`, canonical checkpoint block 119,687,744, age about 32 h, `total_agents` 304,281 against 334,935 on chain, `total_feedbacks` 11,780 against 29,712 on chain | R05, R14, MEASUREMENT |
| Its read reliability that day | 20.8% then 56.7% non-200 across two windows. `/status/summary` said the database was fine throughout | R05 |
| Broken field to never display as freshness | `endpoint_last_checked_at` does not move even when a verification demonstrably runs. `updated_at` and the error string do | R05 |
| Metadata is parsed once | median 64 days old on BSC, up to 105. One bulk backfill on 2026-06-06, no periodic re-parse | R05 |
| Second index, fresher, run by a rival | `https://trust8004.xyz/api/v1/chains` and the free keyset catalogue `/api/v1/catalog/agents?chainId=56&afterId=0&limit=100`. Publishes its own lag and reports `validation: null` on BSC | R14 |
| Registry deployment block it publishes | 79,031,670, which is **not** the same number as the first registration | R14 |

### Altana

| Constant | Value | Proved in |
| --- | --- | --- |
| KeyStore | 56 `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a`, 97 `0x6b8361C29d05D498b1a12B54A37310f94171E94A`, `VERSION()` `1.0.1` | R06 |
| KeyStoreController | 56 `0x0834Ee2C9BdC3E3efF0a2dC34393D4B0e546A555`, 97 `0xb530D1971f5453F3359518343F05D0AedFfF7e12`, `VERSION()` `1.1.1` | R06 |
| Relay | mainnet `https://relay.altana.network` serving `0x1`, `0x38` and `0x2105`; testnet `https://testnet-relay.altana.network` serving `0x61` only | R06 |
| Explorer | `https://explorer.altana.network`, testnet `https://testnet.altana.network`. Evidence URLs `/account/<wallet>` and `/key/<full 32-byte keyId>`, both public. A truncated key id 404s | R06 |
| Registration fee | `registrationFeeUSD()` 5e17, so $0.50 priced off a Chainlink BNB/USD feed. About 694,041,152,910,285 wei on mainnet | R06 |
| A wallet is an EIP-7702 delegated EOA | 23 bytes of code, `0xef0100` plus the Porto account proxy `0xc0f16888f4198f53892c53af859f673e23f26fa3` on 56 | R06 |
| Where the allowlist and cap actually live | on the wallet, not in the Keystore. `canExecute(bytes32,address,bytes)` `0xff619c6b`, `canExecutePackedInfos(bytes32)` `0xe5adda71`, `spendInfos(bytes32)` `0xdcc09ebf` | R06 |
| Keystore read surface | `isValidKey` `0x8fd4f06b`, `getKeys` `0x34e80c34`, `getExpiry` `0x3b49ad47`, `isRootKey` `0xe1248ed6` | R06 |
| Two key identifiers, different values | Keystore `keyId = keccak256(SEC1 publicKey)`. Account `keyHash = keccak256(abi.encode(uint8 keyType, keccak256(publicKeyBytes)))`, keyType 2 for secp256k1 | R06 |
| `spendInfos` layout | word 0 token (`0x0` is native), word 1 period enum `0 minute, 1 hour, 2 day, 3 week, 4 month, 5 year`, word 2 limit in raw units, word 6 period start | R06 |
| Any-function sentinel | selector `0x32323232` in a `canExecutePackedInfos` entry, `ANY_TARGET()` returns `0x3232…32` | R06 |
| Event topics | `KeyRegistered` `0x9cd59dd65b7552c8a0b81bf6f9beee2eba669ab1957be114308eba6bf28975cf`, `KeyRevoked` `0xa97703d8de1d538ac2ccf4453e57ec2aa4ab8b29c9a57f2a6e70a9d0e268f802` | R06 |
| Mainnet Keystore census | 123 keys ever registered, 56 live, 33 revoked, 34 expired, 90 transactions in 14 days | R06 |
| XP | quests total 3,000 (create 500, fund 1,000, grant 1,500). Levels Scout 0, Operator 2,000, Delegate 6,000, Principal 15,000, Sovereign 30,000. Leaderboard top 10 all sit at the 3,000 quest cap | R06 |
| SDK | `@altananetwork/sdk@0.9.0`, `@altananetwork/x402-server@0.2.0`, `@altananetwork/mcp@0.9.0`. Omitting `permissions.calls` grants **every** target inside the cap | R06 |
| Skills registry | `https://skills.altana.network/index.json`, exactly 10 skills, byte-identical to the 2026-08-27 capture. Each carries `display.may`, `display.mayNot` and `inputs[].askAt` in `grant` or `run` | R06 |

### TermiX

| Constant | Value | Proved in |
| --- | --- | --- |
| API base | `https://platform-backend.prod.termix.live`, public reads need no auth | R07 |
| Escrow | USDC deployment `0x6A52ba4C84b348FaEAe13dDC7A97b4F6af23913C`, USDT deployment `0xCE02f987D8b8AF694E13C8a843Db9c77caBF544c` | R07 |
| Staking, reputation | `0x0Bd066f5113e6B8336b06F8Aa3EF90D37F7e65FC`, `0xFf3f7038c4919A420B30D7B3533cb386D5898189` | R07 |
| Fees, read on chain | protocol 200 bps, evaluator 300 bps, arbitrator 300 bps, challenge bond 0, `minChallengeWindow` 86,400 s, `acceptWindow` 259,200 s, `verdictTimeout` 259,200 s | R07 |
| Provider stake required | `providerLockBps()` 0, `minPoolBalance()` 0. A provider can list without staking | R07 |
| Baseline reputation | `getScore(id)` returns 50 for an agent with no history | R07 |
| Its market, measured | 509 published listings, median price 70 USDC, median delivery 3 days, 499 of 509 instant-buyable. 513 providers against 334,739 verified agents | R07 |
| Its hire path | four signatures plus a minted client agent: login, `approveEscrow`, `createOrder`, `releaseEscrow` | R07 |
| Its default signer | Binance Agentic Wallet (`@binance/agentic-wallet` 1.9.0, binary `baw`), **BSC 56 and Base 8453 only, no testnets** | R07 |
| bStocks are real BEP-20 | METAB `0x7425889FE94F9d693E8daefE88BCCed6AcFEf4c0` Meta Platforms, PLTRB `0x0Ca5D51D0277Bd006fd9607d3E560785EBad8222` Palantir, both 18 decimals. `uiMultiplier()` is 1e18 today and must be applied rather than assumed | R07 |

### PancakeSwap

| Constant | Value | Proved in |
| --- | --- | --- |
| v2 factory, router | `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73`, `0x10ED43C718714eb63d5aA57B78B54704E256024E` | R08, R06 |
| v2 swap fee today | exactly 0.25% (9975/10000), not the 0.2% in the old periphery repo | R08 |
| v3 factory, SwapRouter, NFPM | `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865`, `0x1b81D678ffb9C0263b24A97847620C99d213eB14`, `0x46A15B0b27311cedF172AB29E4f4766fbE7F4364` | R08 |
| v3 QuoterV2, TickLens, MasterChefV3 | `0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997`, `0x9a489505a00cE272eAa5e07Dba6491314CaE3796`, `0x556B9306565093C855AEA9AE92A594704c2Cd59e` | R08 |
| v3 fee tiers, fee ppm / tickSpacing | 100/1, 500/10, 2500/50, 10000/200. **There is no 3000 tier on PancakeSwap v3** | R08 |
| v3 protocol fee per tier, of 10000 | 3300, 3400, 3200, 3200. So the 0.01% tier pays LPs 0.0067%, not 0.01% | R08 |
| Infinity Vault, CLPoolManager, CLPositionManager | `0x238a358808379702088667322f80aC48bAd5e6c4`, `0xa0FfB9c1CE1Fe56963B0321B32E7A0302114058b`, `0x55f4c8abA71A1e923edC303eb4fEfF14608cC226` | R08 |
| Infinity fee model | the protocol fee is **added** to the LP fee, not carved out of it: `swapFee = protoFee + lpFee - protoFee*lpFee/1e6` in pips | R08 |
| Explorer REST, keyless | `https://explorer.pancakeswap.com/api/cached/pools/...`. `feeUSD24h` is gross, `protocolFeeUSD24h` is the protocol cut, LP fee is the difference | R08 |
| Unified Swap API, keyless | `https://swap.pancakeswap.com/v1/quote` and `POST /v1/calldata`, 10 RPS per IP, quote TTL exactly 180 s, `minOut` baked into the calldata | R08 |
| MEV Guard RPC | `https://bscrpc.pancakeswap.finance`, chain 56, free, method-allowlisted | R08 |
| Reference pool | USDT/WBNB 0.01% `0x172fcD41E0913e95784454622d1c3724f546f849`, token0 is USDT. v2 pair `0x16b9a82891338f9bA80E2D6970FDda79D1eb0daE` holds the deepest liquidity on the pair | R08, R09 |
| Position maths verified to the wei | `getAmountsForLiquidity` plus `getFeeGrowthInside` reproduce `decreaseLiquidity` and `collect` exactly at a pinned block. Three blocks of skew moved `amount0` by 0.63 bps | R08 |
| The oracle cannot serve a day | `observe([86400])` reverts `OLD`. Measured maximum lookback 39,234 s and 21,407 s on two live pools | R08 |

### Venus, Lista and Aave

| Constant | Value | Proved in |
| --- | --- | --- |
| Venus Comptroller (a Diamond, 5 facets) | `0xfD36E2c2a6789Db23113685031d7F16329158384` | R09 |
| Venus ResilientOracle | `0x6592b5DE802159F3E74B2486b091D11a8256ab8A`, `getUnderlyingPrice` scaled `1e(36 - underlyingDecimals)` | R09 |
| Venus vUSDT | `0xfD5840Cd36d94D7229439859C0112a4185BC0255`, 8 decimals against USDT's 18 | R09, R06 |
| Venus vBNB, the BNB/USD mark every dollar figure uses | `0xA07c5b74C9B40447a954e1466938b865b6BBea36`, `symbol()` `vBNB`, `name()` `Venus BNB`, 8 decimals. `getUnderlyingPrice(vBNB)` scales 1e18. It resolves to the same ResilientOracle token config as `getPrice(WBNB)`, byte-identical at a pinned block, so the two calls are one source and not two | 11-BNB-STACK |
| Venus close factor, core liquidation incentive | 0.5e18, 1.1e18. Inside E-Mode pool 1 the incentive is 1.06e18 | R09 |
| Venus market count, pools | 55 core markets, 15 E-Mode pools, 8 isolated pools plus core | R09 |
| **Collateral factor and liquidation threshold are separate** | 12 of 55 core markets have CF different from LT. `getAccountLiquidity` `0x5ec88c79` uses the **liquidation threshold**, `getBorrowingPower` `0x528a174c` uses the **collateral factor** | R09 |
| The per-account correct reads | `getEffectiveLtvFactor(account,vToken,strategy)` `0x19ef3e8b` with 0 for CF and 1 for LT, plus `getEffectiveLiquidationIncentive` `0xafd3783b`. The core-pool getters are wrong for any account with `userPoolId != 0` | R09 |
| Venus blocks per year | **70,080,000**, which is Venus's own constant and confirmed on chain by the 300% deprecation rate | R09 |
| Venus published APY | `((1 + ratePerBlock/1e18 * 192000)^364 - 1) * 100`. Exponent **364**, which reproduces `api.venus.io` to 4e-12 | R09 |
| Lista Lending (Moolah) | `0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C`, IRM `0xFe7dAe87Ebb11a7BEB9F534BB23267992d9cDe7c`. `isHealthy` `0x2c2c904f` answers in one call | R09 |
| Moolah constants | `ORACLE_PRICE_SCALE` 1e36, `LIQUIDATION_CURSOR` 0.3e18, `MAX_LIQUIDATION_INCENTIVE_FACTOR` 1.15e18. Rates are per second, annualise with `exp(r*31536000)-1` | R09 |
| Lista CDP | Vat `0x33A34eAB3ee892D40420507B820347b1cA2201c4`, Spotter `0x49bc2c4E5B035341b7d92Da4e6B267F7426F3038`, Interaction `0xB68443Ee3e828baD1526b3e0Bdf2Dfc6b1975ec4`, `chop` 1.1e18 on every ilk, `YEAR` 31,556,952 s | R09 |
| Lista liquid staking | StakeManager `0x1adB950d8bB3dA4bE104211D5AB038628e477fE6`, slisBNB `0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B` | R09, R06 |
| Aave v3 on BSC | Pool `0x6807dc923806fE8Fd134338EABCA509979a7e0cB` (`POOL_REVISION()` 11), PoolDataProvider `0xc90Df74A7c16245c5F5C5870327Ceb38Fe5d5328`, AaveOracle `0x39bc1bfDa2130d6Bb6DBEfd366939b4c7aa7C697`, 8 reserves | R09 |
| Aave health factor | `getUserAccountData` field 6, scaled 1e18, `2**256-1` when there is no debt. The only literal health factor on BSC | R09, R06 |
| Three protocols, three rate units | Venus per block, Moolah per second, Aave per year in ray. Store the raw integer, the unit and the source call | R09 |

### Identity, attestation and screening

| Constant | Value | Proved in |
| --- | --- | --- |
| BABT | `0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8`, impl `0x57340D99B7774C328b17b13d6b37548C84EE3C1e`, testnet `0x984E6a7b9cb73cB7884c9ca9b1Ee625546F9D0E3` | R10 |
| The BABT check | `balanceOf(address)` `0x70a08231`. 1 holds, 0 does not, never reverts. `tokenIdOf` reverts for non-holders, so never use it in a gate | R10 |
| BABT is ISBT721, not ERC-721 | `supportsInterface(0x80ac58cd)` is **true** while `transferFrom` does not exist and reverts with no data | R10 |
| BABT scale | 1,166,396 live, 1,319,158 ever minted, so 11.58% revoked or burned. Minting is live | R10 |
| Galxe Passport | `0xe84050261cb0a35982ea0f6f3d9dff4b8ed3c012`, non-transferable with explicit revert reasons | R10 |
| BAS core, SchemaRegistry | `0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC`, `0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa`, both `version()` `1.3.0` | R10 |
| BNB Passport reader | `0x97F0Ed637276907dcecbE49Bf08464Bdc7E46734` on 56, `0x63e7C33db44F3a14d27fd3E42B88FD8Cf6a5c953` on 97. `user_finished_one_of_attestation(address,bytes32[])` is the OR-ladder primitive | R10 |
| Chainalysis sanctions oracle | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb`, `isSanctioned(address)` `0xdf592f7d`, free, about 3,694 gas over base | R15 |
| The oracle is not a superset of OFAC | of 91 EVM-format SDN addresses it flags 57. 42 of the 91 are active on BSC and 20 of those 42 are not flagged | R15 |
| The freeze layer under an escrow | FDUSD and USD1 both expose `freeze(address)`, `unfreeze(address)` and `frozen(address)`. USD1 also exposes `reallocate(address,address,uint256)`. BSC-USD exposes none | R15 |
| The money-transmitter line | FinCEN FIN-2019-G001: a venue that only hosts bids and offers, with parties settling through an outside venue, is not a money transmitter. A CVC payment processor is | R15 |

### The agent population, measured

These are moving numbers. **Cite every one with its block height and its timestamp**, never bare.
Re-read them the day the submission goes out.

| Fact | Value | Read at | Proved in |
| --- | --- | --- | --- |
| Agents ever registered (`_lastId`), the head read every document cites | **336,088** | block 120,141,168, 2026-09-05T16:17:48Z | 11-BNB-STACK, re-read from the archive endpoint here |
| The same counter earlier the same day | 334,935, then 334,997, then 335,003 | blocks 120,027,164 at 02:02:32Z, then 120,035,552 and 120,036,371 | MEASUREMENT, R16, R12 |
| Registration rate | 0.0101 per block across the 14 h spanned by the two rows above, about 1,940 a day. MEASUREMENT's 0.011 per block, about 2,110 a day, came from a 5,000-block window, so the rate itself moves and neither figure is a constant | those two windows | MEASUREMENT, this table |
| Id allocation | sequential and gapless, proved over 5,000 blocks and across a uniform sample | 120,022,165 to 120,027,164 | MEASUREMENT |
| Registration document parses as JSON | 570 of 600 = 95.00% | uniform sample, seed `20260905` | MEASUREMENT |
| Declares a concrete `http(s)` endpoint (**T0**) | 233 of 600 = 38.83% (95% 35.02 to 42.79) | same | MEASUREMENT |
| Endpoint resolves and answers 2xx or 3xx (**T1**) | 230 of 600 = 38.33% | same | MEASUREMENT |
| **Machine-callable (T2)** | **12 of 600 = 2.00%** (95% 1.15 to 3.46), all one product on one host | same | MEASUREMENT |
| **Payable by a stranger (T3)** | **0 of 600 = 0.00%** (95% 0 to 0.64) | same | MEASUREMENT |
| Distinct endpoint hosts in the sample | 9 hosts across 229 URLs, `evoevo.ai` holding 217 | same | MEASUREMENT |
| `getAgentWallet` non-zero | 600 of 600, because `register` writes `msg.sender` at mint | same | MEASUREMENT |
| `getAgentWallet` differs from `ownerOf` | **0 of 600**. So `agentWallet != 0` is not a filter, it is the whole registry | same | MEASUREMENT, R05 |
| One duplicated name is the plurality | `Ave.ai Trading Agent` on 215 of 600 = 35.83% (95% 32.10 to 39.75), all byte-identical `data:` URIs under 215 distinct owners | same | MEASUREMENT |
| Distinct names | 322 across 600, of which 312 are singletons | same | MEASUREMENT |
| Agents with any feedback | **4,406 = 1.32%**, from a sweep of every id | all 334,935 ids | MEASUREMENT |
| Total feedbacks, revoked | **29,712** written, **0** revoked | same sweep | MEASUREMENT |
| Distinct feedback authors on the whole chain | **111** | same sweep | MEASUREMENT |
| Feedback concentration | 95 agents hold 50%, top 100 hold 52.35%, busiest author rated 1,800 agents | same sweep | MEASUREMENT |
| What the feedback measures | of 950 sampled rows, 844 tag a persona trait, 68 tag uptime or response time, **0 tag a financial outcome** | 8004scan slice | MEASUREMENT |
| Agents with a verified endpoint domain | **5** in total, of which 3 are one operator's | 8004scan, 2026-09-05 | R12, R05 |
| Validation requests on BSC | **0** across 1,999 sampled ids. 8004scan reports 0 platform-wide | R01 | R01 |
| The four categories, population keyword counts | rebalancing 47, grid 20, apy 430 (yield 290), health factor 21. Most generous single term each sums to **518 agents, 0.17%** of the index. `trading` matches 129,023 | 8004scan search | MEASUREMENT |
| The four categories in the sample of 600 | rebalancing 0, grid 0, yield 1, health factor 0 | same sample | MEASUREMENT |
| ERC-8183 lifetime jobs | **56,713**, Open 994, Funded 285, Submitted 27,170, **Completed 28,244**, Rejected 6, Expired 14 | full re-index, 455.6 s | R16 |
| ERC-8183 money settled | total budget 656.88 `$U`, budget on completed jobs **292.24 `$U`**, about 0.0103 `$U` per completed job | same | R16 |
| ERC-8183 provider concentration | 97 distinct providers, 28 with any completed job. One address holds 56,167 jobs and 281.56 `$U`, so 99.0% of jobs and 96.3% of paid value. 18 of the 28 have a single-client record | same | R16 |
| Mainnet `$U` liquidity, the only route named anywhere in this set | PancakeSwap v3 0.01% pool `0xA0909f81785f87f3e79309F0E73A7d82208094E4`, token0 USDT and token1 `$U`, holding 11,313,040.02 `$U` against 9,706,504.98 USDT, `liquidity()` 2.66e27 | block 120,156,766, 2026-09-05T18:14:51Z | 08-MONEY, re-read at block 120,162,613 by 13-PARTNERS |
| Second `$U` pool, 0.05% | `0x882e23dbA77BFe0e514cF5BcDad7a58acEB01522`, 2,684,557.81 `$U` against WBNB | same | 08-MONEY |

**Two ways to cite the population and they are not interchangeable.** The head is 336,088 at block
120,141,168, which is the number a document uses when it says how many agents exist. 334,935 at block
120,027,164 is the **denominator of the full sweeps** (feedback over every id, the category counts, the
8004scan gap pair), so a sweep-derived ratio keeps its own denominator and says which sweep it came from.
A document that prints 334,935 as the current head is wrong. A document that reprints a sweep ratio
against 336,088 is also wrong, because nobody re-ran the sweep at that block.

### Design constants more than one document cites

Verified constants above are read from chain or from a live page. These are ours, each owned by one
document, listed here because a second document cites them and every one of them has already drifted in
a draft. The owner may change a value. A consumer may not.

| Constant | Value | Owner |
| --- | --- | --- |
| Conformance suite size | **31** per-listing probes `C01` to `C31`, plus **3** index-level probes `P1` to `P3`. Never quoted as one total | 04-AGENT-PROTOCOL |
| Hard conformance gates | 11 block go-live, 13 more block `live`, 2 conditional (`C28`, `C31`) | 04-AGENT-PROTOCOL |
| Hireable-bar freshness edge | a passing probe no older than **900 s (15 min)** at render time. 05 may tighten it, never loosen it | 02-THESIS |
| Probe cadence, `live` listing | **5 min**. `probed` or `in_review` 60 s, `stale` 60 s for 10 min then 5 min, `suspended` 15 min, indexed candidate in a mandated category 6 h | 05-ONBOARDING |
| Full registry sweep | **every 6 h**, daily as the floor. `_lastId` tail **every 30 s** | 15-SYSTEM, settling 05 and 06 |
| Quote TTL | **180 s** on the displayed brokered path, **900 s** on the ERC-8183 leg where the SDK sets it | 15-SYSTEM, narrowing 08 |
| Fee | `feeBase = max(0.01 $U, floorDiv(priceBase * 200, 10000))`, minimum brokered price **0.10 `$U`**, below which Muster does not broker | 08-MONEY |
| E1 stake | **5 `$U`** in `OperatorBond`, released after a clean 604,800 s window. No mainnet mechanism at ship | 05-ONBOARDING |
| Per-tier caps | E0 and E1 5 units per job and 25 outstanding, E2 the same with 4 concurrent, E3 25 and 100 | 05-ONBOARDING |
| Exploration | one slot per shelf, four in the product, plus a dispatch budget of **epsilon = 0.10** of counted dispatches | 06-QUALITY |
| Score constants | `mu_0` 0.50, `m` 10, `H` 30 days, `C` 3, `beta_b` 1.00 or 0.35, `k` 20, `z` 1.96, `mu_c` clamped 0.40 to 0.90 | 06-QUALITY |
| Ranking weights | `0.30 Q + 0.25 R + 0.15 C + 0.15 P + 0.10 F + 0.05 E`, versioned and published | 07-MATCHING |
| Live listings per owner | 4, checked at the `in_review` to `live` edge | 14-GAPS |
| The two proof pages | `/coverage` is the four-category coverage proof, `/report` is the Agent Advantage Report. Never one route | 03-TAXONOMY for the route, 02-THESIS and 13-PARTNERS for the contents |

## Conflicts already settled

Do not re-open these without new evidence. If a research file says otherwise, this table wins.

| Question | Settled answer | Why |
| --- | --- | --- |
| Is an ERC-8004 Validation Registry deployed on BSC? | **Yes**, `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`. It has never been used | R01 called `codesize`, `getIdentityRegistry()` and `getVersion()` on it. 8004scan does not list it and trust8004 reports `validation: null`, so both indexes are wrong, not the chain |
| Which BSC tokens carry EIP-3009? | **FDUSD, USD1 and U.** Not USDT, not USDC, not BUSD | `VERIFIED-payment-rail.md` proved FDUSD and USD1 and ruled out the rest. It never tested U. R04 executed a live `transferWithAuthorization` for U on a mainnet fork and R16 and R06 independently matched its domain separator, so U is verified by three files but not by the highest-trust one. Label it that way |
| Which testnet ERC-8183 policy? | **`0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA`, `disputeWindow()` 900 s** | R02 read `policyWhitelist()` false for the old `0x4F4678D4…78A6` and got `PolicyNotWhitelisted()` from `registerJob`. R06 and our own prior code both still name the dead one |
| `URIUpdated` topic0? | **`0x3a2c7fff…09fb`** for `URIUpdated(uint256,string,address)` | R01 matched real logs. R05 quotes the two-argument signature from the EIP text, which hashes to a different and unusable topic |
| Is there one Permit2 on BSC? | **No, two.** The canonical Uniswap one and PancakeSwap's own | R04 and R08 both read code at both addresses. Signatures are not interchangeable |
| How many agents are on BSC? | It depends on the block. Read `_lastId` and publish the block | MEASUREMENT, R14, R16 and R12 all read a different correct value hours apart |
| Which reachability figure supersedes "2 of 400 publish a callable endpoint"? | **12 of 600 reach T2, 0 of 600 reach T3** | MEASUREMENT re-measured the earlier pass's claim at n=600 with Wilson intervals. The earlier number sat between two tiers without saying which |
| Which four categories? | rebalancing, grid trading, yield, health factor | The launch blog listed monitoring and the live rubric page replaced it with rebalancing and made all four mandatory. R14 read both |
| Is the identity registry's deployment block 79,027,268? | **Unknown.** 79,094,807 is the verified **first registration**, which is a different fact | R01 could not get historical `eth_getCode` from any free RPC. Our prior code's 79,027,268 and trust8004's 79,031,670 are both unverified |

## Unverified

Nobody has proved any of these. A document may name one, but only with the word unverified in the
same sentence and only with what would settle it. This list is the checklist a verify pass runs
against, so keep it easy to search: every entry is a claim a document might reach for.

### Programme and judging

| Claim | Status | What would settle it |
| --- | --- | --- |
| Any weighting between Functionality, Data Quality and Agent Diversity | **unverified and unknowable.** The Weight column on the live page is published empty | nothing. Never assume one |
| What Phase 2 assesses | **unverified.** The page prints `[REDACTED]` | the programme publishing it |
| Whether phase 2 reweights the partner tracks | unverified. The TermiX table carries no such line | same |
| Whether judges read the repo at all | unverified. All three criteria are properties of the running site | nothing published says either way |
| The total number of entries | unverified. One entry per team, a Google Form, no public roster. 206 public rival repos is a floor on public builds only | the shortlist, published after judging opens |
| The time of day the build closes on 2026-09-09 | **verified 2026-09-06: 12:00 UTC**, from the registration form's description | keep 00:00 UTC as the freeze, 12:00 UTC is the wall |
| How the 50,000 Altana XP is allocated | unverified. Their own page says "allocation mechanics to be confirmed" | Altana publishing it |
| Whether Altana XP needs the wallet declared anywhere | unverified. The XP page looks fully derived from chain | put every wallet in the submission anyway, which the programme separately requires |
| Where the Agent Advantage Report is filed | unverified. No channel is named on either page | ship it as a public URL inside the submission and as a file in the repo |
| Whether TermiX pays for its hire or expects a free trial | unverified | support both paths |
| Which wallet address TermiX judges from | unverified | nothing in the hire path may depend on an allowlist |
| Whether AltLayer's 8004scan Pro grant beats our self-service key | unverified. The form promises 500/min while the self-service `free_api` key measures 600/min | holding a granted key |

### Payment rail

| Claim | Status | What would settle it |
| --- | --- | --- |
| The B402 authenticated base URL, for either environment | **unverified and unpublished.** Both rows read "Please contact us for access" | merchant onboarding |
| B402's real `signerAddress` and `spenderAddress` on BSC | unverified. Every address in the docs is a placeholder | a `/supported` response, which needs credentials plus an IP allowlist |
| Whether B402 settles in `$U`, USD1 or both on mainnet | unverified. That `$U` is the token BNB's own escrow pays in is suggestive, not proof | a `/supported` response |
| Whether B402 mainnet credentials can be had before 2026-09-09 | unverified. Manual per-environment review, no published turnaround | applying |
| Whether any facilitator will sponsor gas for FDUSD, USD1 or `$U` 3009 settlement | unverified. The public x402.org facilitator does not cover `eip155:56` at all | run our own submitter, which removes the question |
| Who holds the upgrade key on FDUSD, USD1 and `$U` | unverified. All three are proxies with live admins, so 3009 could be removed under us | reading each admin slot and its owner |
| `$U`'s issuer, peg and redemption | unverified. It is not on Circle's list | primary source from the issuer |
| Whether B402 accepts the `escrow` payment flow on BSC | unverified | a `/supported` response |
| The testnet token addresses for `$U` and USDC | **`$U` is settled, USDC is not.** On chain 97 `0xc70B8741…5565` returns `United Stables`, symbol `U`, `decimals()` **18** and `0x330949Ae…cC39` returns name `U`, symbol `U`, `decimals()` **6**, which is B402's mock, so R02, R06 and R03 were each right about a different token (08-MONEY, read on chain). R03 and R04 still name two different testnet USDC addresses at 6 and 18 decimals | one `decimals()` call on each testnet USDC before any testnet code touches it. The boot assertion is what keeps the code correct either way |

### Protocol and index

| Claim | Status | What would settle it |
| --- | --- | --- |
| Whether the deployed ERC-8004 implementations match the public repo byte for byte | unverified. Inferred from an exact dispatch match, the ERC-7201 slot constants and every revert string | verified source, which needs a BscScan key |
| Whether any agent id was ever burned, leaving a gap | unverified. No burn function in the ABI and no sampled id reverted | a from-genesis log scan, which no free RPC serves |
| Whether `FeedbackRevoked` or `ResponseAppended` has ever fired on BSC | unverified. Zero in every sample | archive logs |
| Whether 8004scan's non-validation webhook events fire at all | unverified. BSC logged zero feedbacks that day, so nothing would have fired | a public receiver plus a real event |
| Whether 8004scan's 500 rate is an outage or the normal state | unverified. Two windows on one day, 20.8% then 56.7%, trending worse | re-measure before the build depends on it |
| Whether the `has_a2a` count of 27,048 survives validation | unverified. Every A2A declaration sampled but one is the same platform template, which fails every published A2A schema | a full sweep, about 30 minutes of `eth_call` |
| Whether any rival has a settled **mainnet** ERC-8183 job | unverified. Absence of evidence, not evidence of absence | re-run the rival check before submitting |
| Whether one address holding 99% of ERC-8183 jobs is one operator or a platform router | unverified. The ranking design depends on which | reading its code and its client set |
| Whether a marketplace can register its own policy on the shared router | **no. That is verified.** `setPolicyWhitelist` is owner-only and we are not the owner | not open |
| Whether any BSC agent serves the x402 `offer-receipt` or `payment-identifier` extensions | unverified. The one live challenge decoded carries `bazaar` and `builder-code` only | a sweep of the Bazaar's resources |

### Partners and protocols

| Claim | Status | What would settle it |
| --- | --- | --- |
| Whether `@altananetwork/sdk` 0.9.0 works against `@bnbagent/sdk` 0.5.5 | unverified. The official SDK pins Altana 0.7.1 and 0.9.0 changed the testnet policy | running the pair end to end |
| Whether the Altana relay accepts a Base intent | unverified. The docs say Base is cache-only, the relay's own capabilities say otherwise | attempting one, which we do not need |
| Porto `SpendInfo` field names at positions 3, 4 and 5 | unverified. All zero on the wallet sampled | a wallet with a partially spent cap |
| Whether TermiX judges hire through their own skill package | unverified, inferred from it being their only published client | nothing |
| Whether `liveServices` 10,068 and 509 listings describe the same population | unverified. Their own two endpoints disagree by 20x | undocumented field |
| Kinza Finance and Avalon Labs addresses on BSC | **unverified.** One docs page 403s, the other has no address index. Do not write an address we could not read from a primary source | a readable primary source |
| Venus Prime APY boost units | unverified. The API returns `0.1476…` and whether that is points or percent is unresolved | reading the Prime contract |
| Whether Lista's documented minimum liquidation incentive of 1.048 exists | unverified and contradicted. The on-chain arithmetic gives 1.0438 at lltv 0.86 | finding the off-path contract or treating the doc as stale |
| The cause of PancakeSwap's `priceImpactBps` anomaly | unverified. The direction of the defect is settled, the cause is not, because the aggregator is closed source | nothing available |
| Whether PancakeSwap Explorer `apr24h` on v2 pools can be trusted | **no.** Reproducibly 0.68x low with no findable cause. Re-derive it | not open |
| Whether the BABT metadata `id` is stable for one person across re-mints | unverified. Binance states it. Testing needs a real account and 72 hours | nothing we can run |
| Who holds `OPERATOR_ROLE` on BABT | unverified. Plain `AccessControl`, so `getRoleMemberCount` reverts | archive logs |
| Which BAS schema UIDs are the six KYC providers | unverified. One candidate schema is registered and the mapping is inferred | the passport host resolving, which it does not today |
| Whether any BSC address holds a BNB Passport KYC attestation | unverified. Every address probed returned an empty schema list and the mint host has no DNS record | archive logs plus a working mint flow |

### Greenfield, opBNB and the rest of the BNB surface

| Claim | Status | What would settle it |
| --- | --- | --- |
| Greenfield billing behaviour, including whether a dry payment account deletes data | **unverified.** This is the whole reason any Greenfield use stays a stretch | the billing docs |
| Binance Web3 Wallet's injection path and connector package | unverified | reading the connector |
| Binance Oracle feed registry address and read signature | unverified | one read against a named address |
| Binance market-data licence terms for redisplay | unverified | the terms page, quoted |
| MegaFuel and Particle paymaster pricing | unverified | their pricing pages |
| Whether zkPass has a verifier contract on BSC | unverified. A third-party post says BNB is indexed, nothing primary publishes an address | a primary source |

## Scope, document by document

One line of ownership and one line of what to leave alone. If two documents both want a subject, the
one that owns it writes it and the other cites it in a sentence. A hole is as bad as an overlap: if a
document's scope names something, that document produces it and nobody waits for another author.

`00-PROGRAM.md` and `01-GROUND-TRUTH.md` are written by the spine, so they are already done when the
fourteen authors start. Cite them rather than restating them.

### 02-THESIS

**Owns** the one-sentence product claim, the argument that a directory of 335k rows loses, the core
move that the unit of the marketplace is a completed paid job, the definition of the **hireable bar**
as a gate a row must pass to reach a shelf, what happens to everything that fails it, how each of the
three published criteria is won and by which surface, why equal depth across four categories is a
design constraint, the cold start including exactly how first-party supply is disclosed, the
deliberate non-builds and the ship line for 2026-09-09.

**Leaves to others** the category contracts themselves (03), the probe suite (04), the score formula
(06), the ranking function (07), the payment rail (08) and the build order (15). It may quote a
number from `01-GROUND-TRUTH.md` and must not compute a new one.

### 03-TAXONOMY

**Owns** the four category contracts as inputs, outputs, units and the question each answers, the
full category tree with sub-capabilities and where the long tail goes, how an agent enters a category
(declared then checked) with precedence settled when declaration and evidence disagree, the whole
information architecture (nav, shelf page, listing page, compare view, search, the `/coverage` proof
page, every filter and facet with its real value set, sort options, empty states), visibility rules
including what is listed against indexed-but-hidden, what each evidence tier unlocks on screen, the
bounded exploration slot
seen from the buyer's side, duplicate cluster collapse, the comparison row field by field with
per-field freshness and unknown states, mobile and accessibility, then taxonomy versioning under live
listings.

**Leaves to others** the wire contract behind a category contract (04), how the tiers are earned
(05, 06), the maths of the score (06), which agent wins one job (07) and the render pipeline (15).

### 04-AGENT-PROTOCOL

**Owns** the agent card schema and where it lives, how it maps onto ERC-8004 metadata keys and the
registration record, the wire contract (endpoints, the 402 challenge, the paid call, status codes,
timeouts, health check, the machine-readable capability declaration), the job lifecycle state machine
with every terminal state named, all four long-job shapes with idempotency keys, retry semantics,
cancellation and partial results, how a seconds-long payment composes with a days-long job, the error
taxonomy Muster can act on, the behaviour rules a listed agent must obey including initial state,
bounded spend, no undeclared side effects, refusal semantics, honest capability declaration and
injection resistance in untrusted task input, how a buyer reaches an agent through us or direct and
what we record either way, agent-hires-agent and where ERC-8183 applies, the conformance suite probe
by probe with pass and fail semantics, plus what we deliberately do not require.

**Leaves to others** the category contracts (03), who may list (05), scoring an outcome (06),
selection (07), the money bytes (08) and the SSRF guard implementation (15).

### 05-ONBOARDING

**Owns** who may list and the operator identity model, BABT as human verification with the exact
on-chain check, what it proves, what it does not and the privacy posture, the E0 to E4 ladder with
what each tier unlocks and the fallback for an operator with no attestation, the onboarding lifecycle
as a state machine (pre-check, register or claim, listing lint, probe, review, live, plus suspend,
appeal and delist) fixing on the same `agentId` and never re-creating, the listing lint field by
field with the rule and the reason, the hard gates that block go-live, the token and price resolution
gate including the decimals trap, liveness probing on a schedule and exactly what a failed probe does
to visibility, seller-side anti-wash, the claim flow for an agent somebody else registered, buyer
onboarding including the zero-knowledge-of-Agent-Studio path, then the go-live checklist.

**Leaves to others** the probe assertions themselves (04), the score and its anti-gaming detections
(06), disputes and takedown (09), the policy documents (10) and the payment rail (08).

### 06-QUALITY

**Owns** the signal families and the ERC-8004 calls that carry them, the Muster score as an actual
formula with shrinkage toward the category prior, time decay and the interval a buyer sees, every
symbol defined, one performance metric per category with its window and risk adjustment, the
verified-outcome-only rule and how foreign ERC-8004 feedback is displayed without being trusted, the
Validation Registry (it exists on BSC, it has never been used, when we request validation, who
validates and what a response means), anti-gaming with a named detection for wash trading, sybil
clients, review bombing, self-feedback, collusion rings and an endpoint swapped after approval, cold
start and the exploration budget's size, the maintenance loop split into automatic and human,
delisting and appeal, then what a buyer is shown when we do not know.

**Leaves to others** the tier ladder's onboarding side (05), the ranking function that consumes the
score (07), the dispute lifecycle (09) and the storage layout (15).

### 07-MATCHING

**Owns** the pipeline from intent capture to settle, eligibility as hard constraints, the ranking
function with its weights and why each term exists, the selection policy chosen for the ship with
what the rejected alternatives buy, the bounded exploration slot's mechanics, failover including what
the buyer pays and what the failed agent's record shows, multi-agent jobs (fan-out for redundancy,
decomposition into a chain, who arbitrates disagreement), buyer override, the why-this-agent panel in
words a stranger accepts, plus the anti-favouritism rule that stops first-party agents winning by
default plus how it is audited.

**Leaves to others** the score itself (06), the category contracts (03), the wire dispatch (04) and
the money (08).

### 08-MONEY

**Owns** pricing shapes and which the four categories actually need, the payment rail settled to the
token, address, decimals, signature type and exact bytes the buyer signs, the x402 and B402
integration (402 body, payment header, verify, settle, who sponsors gas), non-custodial by default
and where the fee comes from without custody, escrow (when it is needed, the state machine, release
conditions, timeouts, who may call what), agent wallets across the ERC-8004 `agentWallet` key and
Altana self-custodial wallets with session caps and expiry, buyer-side spend controls and where the
revoke button lives, refunds without a card network, the fee number and who pays it, failure modes
(a paid call never answered, a settled payment on a failed job, a reorg, a stuck nonce, an expired
authorization), the ledger record per payment with its `origin` tag, then what a buyer can export.

**Leaves to others** the Altana qualification checklist (13), the dispute decision (09), the
compliance perimeter around custody (09) and the deployment of the facilitator (15).
`VERIFIED-payment-rail.md` is authoritative here and USDT cannot do one signature on BSC.

### 09-DISPUTES

**Owns** what is disputable and what is not as a list a buyer reads before hiring, the evidence
bundle captured automatically at job time and where each part is stored, the lifecycle with a real
clock on every step, burden of proof and the default when evidence is absent, who decides at
hackathon scale and at real scale with the transition designed in, remedies and who funds each, abuse
of the dispute system in both directions, compliance (wallet-level sanctions screening, the
prohibited-use list, the takedown path, law-enforcement requests, what is logged and for how long),
the financial-advice posture, then the incident runbook for the first hour when an agent starts losing
buyers money.

**Leaves to others** the policy documents that publish these rules (10), the escrow mechanics (08),
the delisting trigger (05, 06) and the evidence store's implementation (15).

### 10-DOCS-AND-POLICY

**Owns** the document set (buyer terms, operator agreement, acceptable use, listing standards, quality
standards, dispute policy, fee schedule, privacy, disclosure) with what each binds and who agrees to
it when, versioning including how a change takes effect for a live listing plus the notice period and
changelog, the public docs site structure, what must be true for a stranger to integrate without
asking us, the disclosure section (AI use, first-party agents, the measurement methodology, real
against staged), then the licence posture applying our own rule: this is an entry, so
source-available no-derivatives by default, with MIT or Apache named only where it is correct, plus
every third-party input listed with its granting clause quoted and any input whose grant could not be
found flagged.

**Leaves to others** the dispute mechanics (09), the onboarding gates (05) and the deployment
(15). Where 09 states a rule, 10 publishes it and does not restate the mechanism.

### 11-BNB-STACK

**Owns** every BNB Chain surface we use and exactly how: BSC mainnet and testnet, opBNB, Greenfield,
the three ERC-8004 registries, RPC and indexing, gas, BEP-20 tokens, Binance Web3 Wallet, BNB Agent
Studio and its `bag` CLI, plus the AI agent landscape data. It settles Greenfield as the right store
for evidence bundles or a distraction, verifying the claim either way. It settles what belongs on
opBNB, if anything. It states the deliberate non-uses with a reason each and what we would use with
more time. Every address and endpoint it names is either in this file's constants table or labelled
unverified.

**Leaves to others** Binance's own products (12), the partner tracks (13), the payment rail's bytes
(08) and the component map (15).

### 12-BINANCE

**Owns** Binance x402 and B402 as the payment facilitator grounded in `R03-x402-b402.md` rather than
the blog wording, BABT tied to the tier ladder in 05, Binance Web3 Wallet as the buyer path and what
it does not solve, Binance market data for the four categories with the licence for that data under
our own third-party rule, any listing or distribution path worth naming labelled real or speculative,
and what we deliberately do not touch (custody, exchange APIs holding user keys, anything needing a
user exchange credential) framed as a security position.

**Leaves to others** the chain surfaces (11), the tier ladder's definition (05), the wallet-level
screening design (09) and the rail decision (08).

### 13-PARTNERS

**Owns** all four partner tracks and the stacking argument. TermiX: the 30/30/20/20 rubric mapped to
concrete features and artifacts, then the Agent Advantage Report designed in full (the exact tasks,
the control condition, the measurement protocol for time, cost and output quality, the evidence
bundle format, at least one task from trading, stock or security, reproducible by a judge), plus what
"TermiX will hire from your marketplace" requires of us gate by gate. Altana: the qualification
checklist item by item with the artifact and the verifier's own command for each, then the ERC-8183
and x402 bonuses and which of the ten skills we wire. PancakeSwap: the agent that genuinely helps a
trader or an LP, tied to rebalancing and yield, with the data it needs from us. AltLayer: 8004scan as
our index plus AltLLM, with attribution wherever required. Then the stacking rule and a submission
checklist per track naming the required artifact.

**Leaves to others** the score (06), the rail (08), the taxonomy (03) and the build order (15). The
Agent Advantage Report is a build deliverable and an eligibility gate, not a writeup afterthought.

### 14-GAPS

**Owns** everything a complete marketplace needs beyond the nine areas already listed, exhaustively
and concretely: search relevance and query understanding, observability and a status page, incident
comms, capacity and rate limiting, fraud and abuse, sybil resistance, key management and secrets,
injection defence on agent output rendered to a buyer, SSRF on our own probes, data retention, i18n
and currency display, notifications, buyer support, operator tooling, a sandbox or testnet mode,
versioning an agent itself, deprecating a listing, SLA and uptime credits, insurance or bonding, tax
and invoicing, referral and growth, analytics for operators, admin tooling and an audit log, backup
and recovery, legal entity and jurisdiction, accessibility, SEO and shareable links, embeddability, a
third-party API, webhooks, unit economics and the path from entry to operated product. For each: what
it is, why it matters, the minimum version and whether it ships before the deadline or is documented
as next. Then a ranking by what a judge or a first real user hits first, then the three to build next
if the deadline moved a week.

**Leaves to others** anything already owned above. Where 14 names a gap another document owns, it
says so in a clause and moves on.

### 15-SYSTEM

**Owns** the component map with responsibilities and boundaries expanded from this file's component
list, the data model expanded from this file's field names with the on-chain against off-chain split
and what is authoritative where, the indexing pipeline (the chain as primary, the second index as
cross-check, freshness targets per field and the reconciliation job), sequence flows in text for
browse, compare, hire, long job, dispute and onboarding, the stack with the reason for each choice
and what was rejected, deployment including the public URL, the anonymous-fetch gate and the cost,
security (authn, authz, secret handling, the SSRF guard on probes, rate limits and the sanitizer for
agent-supplied text rendered to a buyer), observability and the status page, the build order against
the days left blocked by hour with the cut line marked and the demo path protected, what is abandoned
if a day is lost, the test plan that must be green before submit, then the submit checklist tied to
every track including the anonymous URL check and the repo visibility flip.

**Leaves to others** every policy and every formula. 15 says where a formula runs and never restates
it. It is the only document that may introduce a new field name, doing it only by extending this file's
list, never by renaming.

## House rules for every author

- **Style.** No em dashes. No comma before `and` or `or`. No Oxford comma. No AI filler, no
  forced three-item lists, no hedging. Short direct sentences, varied length. Say what the design is
  and why. Grep your own text for an em dash and for `, and` and `, or` before you finish.
- **Voice.** The work is ours, stated plainly. No "adapted from", no "ported from", no inline
  pointers to our own prior builds, no naming another platform as the source of a design choice.
  Credit only where a licence or a programme demands it.
- **Nothing personal.** No personal name, no email, no key, no form field id, nothing from the lane's
  private folder. These documents may end up in a public repo.
- **Every document ends** with its material decisions plus the alternative rejected for each, then its
  open questions. A decision with no rejected alternative is not a decision, it is a preference.
- **Cite a file, not a memory.** `R07-termix.md` and `raw/termix-stats-network-2026-09-05.json` are
  citations. "as measured" is not.
- **Four categories, equal depth.** Any document that treats one category in more detail than the
  other three has a defect, because Agent Diversity is one of three published criteria and the page
  says single-category submissions score poorly.

