# 11-BNB-STACK: every BNB Chain surface Muster touches and exactly how

Written 2026-09-05. Build closes 2026-09-09 UTC+0.

This document settles which BNB Chain surfaces Muster reads, writes and depends on, which it
deliberately does not use and what each choice costs. Every address, endpoint and number below was
either read from `research/SPINE.md`'s constants table, cited to a named research file or produced by
a call this pass ran. Calls run this pass are marked **read today** with their block or their
timestamp. Anything nobody has proved carries the word unverified in the same sentence.

Two boundaries, stated first so nothing is looked for here that lives elsewhere.

**BNB Chain is not Binance.** BNB Smart Chain, BNB Smart Chain Testnet, opBNB and BNB Greenfield are
chains. Binance Agent OS, the Binance MCP server, B402, Agentic Wallet and Skill Hub are a company's
products that happen to settle on one of those chains. `R17-binance-agent-os.md` established that
Binance's own Agent OS page never mentions BNB Chain or ERC-8004. This document owns the chains.
`12-BINANCE.md` owns the products. B402 is where they meet, because a B402 settlement is a BSC
transaction, so the chain-level facts about that transaction (gas, token decimals, RPC) are here and
the envelope, the headers and the bytes a buyer signs are in `08-MONEY.md`.

**The rail's bytes are not here.** `VERIFIED-payment-rail.md` is authoritative on signature
capability per token and `08-MONEY.md` owns the rail decision. This document states the chain facts
that constrain it: which tokens exist on which chain, at what decimals and what a settlement costs
in gas. The partner tracks are in `13-PARTNERS.md`. The component map and the build order are in
`15-SYSTEM.md`.

## 1. The surface map

One row per BNB Chain surface, with the verdict. The sections below defend each row.

| Surface | Chain id | Verdict for 2026-09-09 | Why |
| --- | --- | --- | --- |
| BSC mainnet | 56 | **ships, system of record** | the three ERC-8004 registries, the ERC-8183 kernel, every listed agent, every settlement |
| BSC testnet | 97 | **ships, exactly one artifact** | one ERC-8183 settlement loop driven to COMPLETED, labelled with its chain id on screen. Never a source of listings and never a hire a judge is asked to treat as real money |
| opBNB | 204 | **deliberate non-use** | read today: codesize 0 at all three ERC-8004 registries, all three ERC-8183 contracts, U, USD1 and FDUSD. Nothing we need is there |
| opBNB testnet | 5611 | deliberate non-use | same and not on the canonical ERC-8004 roster |
| BNB Greenfield | 1017 | **documented as next, not scheduled** | verified cheap and verified anonymously checkable, but three of four public storage providers return 404 for a sealed object that exists on chain. No block in the build order carries it |
| BNB Greenfield testnet | 5600 | deliberate non-use | read today: `greenfield_5600-1` answers anonymously at height 34,926,055, so it works. The artifact it would hold is a mainnet snapshot, so a testnet host weakens the claim it exists to support |
| Greenfield cross-chain hubs on BSC | 56 | not used | read today: live and mirroring one object costs 0.0004 BNB against 0.0000000293 BNB to store it |
| ERC-8004 Identity Registry | 56 | ships, primary read | `tokenURI`, `ownerOf`, `getAgentWallet`, `getMetadata`, `_lastId` |
| ERC-8004 Reputation Registry | 56 | ships, read plus one write of ours | `getClients`, `readAllFeedback`, `appendResponse`. The buyer signs their own `giveFeedback` and we never sign it for them |
| ERC-8004 Validation Registry | 56 | ships, read plus two writes, the request gated on the operator's approval | deployed and wired, zero validations across 1,999 sampled ids, no public index tracks the contract at all |
| Multicall3 | called on 56 and 97 | ships | the whole enumeration strategy rests on it. Read today it is also deployed on 204 at 3,808 bytes, which changes nothing because nothing we read is there |
| BNB Agent Studio, `bag` CLI | n/a | ships as a tool, not a dependency | `bag erc8004` and `bag erc8183` are the socket we plug into |
| Binance Web3 Wallet connector | n/a | ships as one buyer path | three injection branches, verified from the package source |
| The AI agent landscape data | n/a | ships as a citation we beat | its BSC count is a correctly dated 2026-07-16 figure that no longer describes the chain |

## 2. BSC mainnet, chain 56: the system of record

Everything Muster shows is a fact about chain 56 or a fact we derived from one. Identity, feedback,
validation, escrow jobs, settlement and the `agentWallet` a payout goes to all live here. Nothing
Muster ranks on is stored anywhere a stranger cannot read with a public RPC and a block number.

### 2.1 The three ERC-8004 registries and the calls we actually make

Addresses from `SPINE.md`, proved in `R01-erc8004.md`. The Identity Registry is
`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (`name()` `AgentIdentity`, `symbol()` `AGENT`), the
Reputation Registry is `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` and the Validation Registry is
`0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`. All three are UUPS proxies at `getVersion()` `2.0.0`.

`registry-reader` makes exactly these reads and no others. The writes are a separate table below,
because they are signed by different keys:

| Call | Selector | Who reads it | Cadence |
| --- | --- | --- | --- |
| `eth_getStorageAt` on `_lastId` | slot `0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00` | `indexer` | every tail poll |
| `tokenURI(uint256)` | `0xc87b56dd` | `resolver` | on first sight, then on a `URIUpdated` log |
| `ownerOf(uint256)` | `0x6352211e` | `indexer` | full sweep, then on a `Transfer` log |
| `getAgentWallet(uint256)` | `0x00339509` | `broker`, `escrow-index` | full sweep, then before any payout display |
| `getMetadata(uint256,string)` | `0xcb4799f2` | `resolver` | six keys only, the six `SPINE.md` records in live use: `agentWallet`, `platform`, `platformAgentId`, `displayName`, `profileURL`, `termix.metadataHash` |
| `isAuthorizedOrOwner(address,uint256)` | `0xd95e72be` | `conformance`, `quality` | before a write that needs the operator's approval plus before rendering any response as the operator's own |
| `getClients(uint256)` | `0x42dd519c` | `quality` | on listing, then daily |
| `readAllFeedback(uint256,address[],string,string,bool)` | `0xd9d84224` | `quality` | with an empty client array, the only client-list-free read |
| `getAgentValidations(uint256)` | `0x8d5d0c2d` | `quality` | on listing |

Four writes reach the registries and the signer differs on every one, which is the fact a builder
needs before wiring any of them:

| Write | Selector | Who signs | When |
| --- | --- | --- | --- |
| `appendResponse(uint256,address,uint64,string,bytes32)` | `0xc2349ab2` | Muster's own signing key | when we publish a reconciliation against a foreign feedback entry. Open to anyone, which is why we use it and never `giveFeedback` |
| `validationRequest(address,uint256,string,bytes32)` | `0xaaf400c4` | the agent's **owner or an approved operator**, never Muster's key on its own | when a listing passes the conformance suite. A random EOA reverts `Not authorized` (`R01-erc8004.md`), so onboarding asks for a per-token `approve(muster, agentId)` and offers `setApprovalForAll(muster, true)` `0xa22cb465` as the operator's own choice (`06-QUALITY.md`). Where an operator grants neither, they get a prepared transaction to sign |
| `validationResponse(bytes32,uint8,string,bytes32,string)` | `0x3d659a96` | the validator, which is us and is published as us | once per request on the first pass, then again on the same `requestHash` with a different `tag` after a drift re-run |
| `setMetadata(uint256,string,bytes)` | `0x466648da` | the operator, for the optional `muster.claim` marker | once per agent, at claim time (`05-ONBOARDING.md`) |

The buyer signs a fifth, `giveFeedback(...)` `0x3c036a7e`, prepared by the `broker` after a job
settles and signed by the buyer or not at all (`06-QUALITY.md`). Muster never signs it.

Two chain facts shape the reads and neither is optional. `totalSupply()` reverts, because the registry
is not `ERC721Enumerable`, so there is no count to ask for. And `getSummary` on the Reputation
Registry reverts `clientAddresses required` on an empty array while `readAllFeedback` with an empty
array falls back to every client that ever rated the agent (`R01-erc8004.md`). So every aggregate
Muster computes runs off `readAllFeedback`, never off `getSummary`.

The Validation Registry is deployed, wired and unused. **Read today:** codesize 130 at
`0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`, `getVersion()` `2.0.0`, `getIdentityRegistry()`
returning the Identity Registry, `validationRequest` from a random EOA reverting `Not authorized` and
`validationResponse` on an unknown hash reverting `unknown`. `R01-erc8004.md` found zero validation
requests across 1,999 sampled agent ids, which is 0.6% of the population.

What the indexes add is nothing. That is worth stating precisely rather than reading as
corroboration. Read today, 8004scan's `/chains` carries no validation field for any chain and its
`chain_stats` row for 56 has none either, while its platform-wide `total_validators`,
`total_validations` and `daily_validations` are all 0 with `average_validation_score` null. That zero
is structural, not measured. trust8004 reports `validation: null` for BSC. `SPINE.md` settles both
as wrong about the chain rather than the chain being empty. So the honest claim is that we can prove
the mechanism has never fired on the ids we sampled and that no public index can confirm or deny the
rest, on BSC or on any other network the registries are deployed to.

One address trap on mainnet, read today. `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` is the
testnet-family validation address and it also exists on chain 56, as a 130-byte proxy over
implementation `0xd53dE688e0b0ad436FBdbDa00036832FF6499234` whose `getIdentityRegistry()` reverts.
Pointing mainnet code at it fails at the first read rather than at the write.

`06-QUALITY.md` owns what a validation means. The chain-level notes here: `requestHash` is
caller-chosen and a reused hash reverts `exists`, so the hash has to be derived from something unique
per run. `validationResponse` may be called repeatedly on the same hash with a different `tag`.

### 2.2 Enumeration: one storage read plus Multicall3

The population is a contiguous range. `register` does `agentId = $._lastId++`, ids start at 0 and
there is no burn function in the ABI, so the whole catalogue is `0 .. _lastId - 1` and the count is one
`eth_getStorageAt` (`R01-erc8004.md`).

**Read today.** `_lastId` = **336,088** at block **120,141,168**, timestamp 1788625068 =
2026-09-05T16:17:48Z, over `https://bsc-rpc.publicnode.com`. That is the head read `SPINE.md` now
carries in its population table, so every document citing a BSC agent count cites this one row rather
than reading its own. `SPINE.md`'s earlier row is 334,935 at block 120,027,164 fourteen hours before,
so the counter moved 1,153 in 114,004 blocks. That is 0.0101 per block, **about 1,940 per day**. That is
the one figure the build quotes. It supersedes `MEASUREMENT.md`'s 0.011 per block, about
2,110 per day, which came from a 5,000-block window: 114,004 blocks is 23 times the span. The two
agree to within 8%, which is the useful conclusion. The rate itself moves, so it is published with
its window and never as a constant (`SPINE.md`).

```bash
cast storage 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 \
  0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00 \
  --rpc-url https://bsc-rpc.publicnode.com | xargs cast to-dec
```

Multicall3 is at `0xcA11bde05977b3631167028862bE2a173976CA11` on 56 and read today it is also at that
address with the same 3,808 bytes on 97 and on 204. We call it on 56 and on 97 only, because nothing
we read lives on 204 (section 4). `aggregate3` takes 1,500 sub-calls in one
`eth_call` and 2,500 hits the node's 30 s timeout. At 500 agents times three reads per batch,
`R01-erc8004.md` measured 183 agents/s, so a full sweep of the registry is about 30.5 minutes, 670
`eth_call`s and 0.27 GB with no API key. Re-sweeping the tail on a `_lastId` delta is seconds.

Publish the block with the number, every time. A bare agent count is a number a judge cannot check and
a number that is wrong within a minute. The `freshness` stamp on every agent record is the block plus
the timestamp plus the source call. The shelf header carries the same triple.

### 2.3 RPC: which endpoints, in what order, then where the wall is

`R01-erc8004.md` measured the log and archive behaviour of nine public BSC endpoints. The operating
rules that come out of it:

| Job | Endpoint | Limit that matters |
| --- | --- | --- |
| Every view call and every Multicall3 batch | `https://bsc-rpc.publicnode.com` | `eth_getLogs` capped at 5,000 blocks, recent only, then `Archive requests require a personal token` |
| Fastest keyless batching | `https://bsc.rpc.blxrbdn.com` | 200 calls in 0.27 s, archive for logs, `not supported` for historical `eth_getCode` |
| Deep log windows | `https://bsc.drpc.org` | 10,000 blocks then an aggressive rate limit |
| Fork and archive `eth_call` | `https://bsc-mainnet.public.blastapi.io` | rate-limited quickly, needs a key in practice |
| Testnet | `https://bsc-testnet-rpc.publicnode.com` | read today, head 129,288,933 |

Two endpoints are named so nobody wastes an hour on them: `https://1rpc.io/bnb` caps `eth_getLogs` at
**50 blocks** and `https://bsc.meowrpc.com` does not support the method at all.

**The archive wall is a design constraint, not an inconvenience.** No free BSC RPC serves historical
`eth_call` past roughly 1,000 blocks (`R09-bsc-defi.md` got HTTP 403 at tip minus 1,000) and no free
endpoint serves both archive depth and a range over 10,000 blocks. There are about 41 million blocks
between the first registration at 79,094,807 and head, so a from-genesis log scan at 5,000 blocks per
request is roughly 8,200 requests. Three consequences Muster is built around:

1. The catalogue comes from storage plus Multicall3, never from a log replay.
2. `eth_getLogs` is reserved for the three `NewFeedback` fields that exist only in the log (`endpoint`,
   `feedbackURI`, `feedbackHash`) plus the `URIUpdated`, `MetadataSet` and `Transfer` tails, always in
   small recent windows.
3. Any time series Muster shows has to be collected forward by `sampler`, because it cannot be
   reconstructed backward. In-range seconds for a liquidity position, pool depth, indexer lag and
   probe latency are all in that class. This is the single strongest argument for starting the sampler
   the day the index goes up rather than the day before submission.

### 2.4 Gas: what a hire costs on BSC, in numbers

**Read today.** `eth_gasPrice` on chain 56 returns 50,000,000 wei, which is 0.05 gwei, the same value
`SPINE.md` carries. BNB in USD comes from **two independent sources, agreeing within 0.1%.** The Venus
ResilientOracle at `0x6592b5DE802159F3E74B2486b091D11a8256ab8A` returned
`getUnderlyingPrice(0xA07c5b74C9B40447a954e1466938b865b6BBea36)` = 773058009487666300000, so
**$773.058**. That address is Venus's BNB market: `symbol()` `vBNB`, `name()` `Venus BNB`, read today,
and every dollar figure in 2.4, 4.1 and 5.2 rests on it. The keyless Binance spot ticker
`api.binance.com/api/v3/ticker/price?symbol=BNBUSDT` returned 772.29 with HTTP 200 to an anonymous
fetch, which is the second source.

`getPrice(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c)` on the same oracle is **not a third source, it
is the same feed.** Read today at one pinned block, 120,161,900, `getUnderlyingPrice(vBNB)` and
`getPrice(WBNB)` return the byte-identical 777044590000000000000, because `getTokenConfig(WBNB)`
resolves both. The $772.768 quoted earlier in this lane was that feed read at a different block, not a
second opinion. Two sources is what the dollar column has.

Gas costs below use $773.058. Every settle figure is measured in `R04-bsc-tokens.md` and named with
its token, because the token is the variable:

| Action | Gas | Cost at 0.05 gwei |
| --- | --- | --- |
| EIP-3009 `transferWithAuthorization` settle, **FDUSD** | 103,395 | 0.00000516975 BNB = **$0.0040** |
| the same on **USD1** | 108,164 | 0.0000054082 BNB = $0.0042 |
| the same on **U** | 103,377 | 0.00000516885 BNB = $0.0040 |
| the same on FDUSD in the packed 65-byte signature form | 86,731 | 0.00000433655 BNB = $0.0034 |
| Permit2 proxy `settle`, **USDT** | 70,157 | 0.00000350785 BNB = $0.0027 |
| One-time `approve(Permit2, max)` on **USDT** by the buyer | 46,446 | 0.0000023223 BNB = $0.0018 |
| Buyer-signed `giveFeedback` on the Reputation Registry | 199,819 | 0.00000999095 BNB = **$0.0077** |
| Plain **USDT** `transfer` to a zero-balance recipient, for scale | 51,996 | 0.0000025998 BNB = $0.0020 |

USDT does not carry EIP-3009 and never appears on that rail (`VERIFIED-payment-rail.md`). It is on the
Permit2 rows because that is the rail it can actually sign for.

The last two rows are ours rather than R04's, both `eth_estimateGas` read today on chain 56. The
`giveFeedback` estimate uses a realistic payload: agent 1, `value` 8700 at `valueDecimals` 2, the
`musterOutcome` tag, a job id, an endpoint URL and a receipt URL. The transfer row is the
**cold-recipient** case, which is the honest one to quote for scale: the same call to an address that
already holds a balance estimates 34,862 gas, a third less, because the storage slot is already
non-zero.

Two numbers matter for the product. **A settlement costs four tenths of a cent** and the buyer pays
none of it on the one-signature path, because the facilitator submits and sponsors it (`08-MONEY.md`).
**The buyer does pay for the rating**, about eight tenths of a cent: `giveFeedback` is a registry write
rather than a token transfer, so no payment facilitator sponsors it. The score never depends on that
write landing (`06-QUALITY.md`) and the cost is disclosed on the button rather than discovered in a
wallet prompt. The only other gas a buyer ever pays is the one-time `approve(Permit2, max)` at $0.0018,
and only on a token that needs the Permit2 rail because it cannot sign once.

So gas pressure never reaches a size that changes a design choice. That is why every "move it to a
cheaper chain" argument fails on arithmetic rather than on taste. Section 4 does that arithmetic.

One asymmetry worth knowing before anyone benchmarks on testnet: read today, `eth_gasPrice` on chain
97 returns 100,000,000 wei, which is **0.1 gwei, twice mainnet**. Testnet is the more expensive
environment per unit of gas. Nothing breaks, but a cost figure measured on 97 and quoted for 56 is
double the truth.

### 2.5 BEP-20 tokens: the decimals rule is the whole rule

**Every BSC stablecoin in `SPINE.md`'s token table is 18 decimals.** USDT
`0x55d398326f99059fF775485246999027B3197955`, Binance-Peg USDC
`0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`, BUSD, FDUSD, USD1 and U are all 18. Circle publishes no
native USDC on BNB Smart Chain (`VERIFIED-payment-rail.md`), so any code carried from a 6-decimal USDC
chain is wrong here by a factor of a trillion.

The rule the code enforces, not the rule the code assumes:

- `decimals()` is read at boot for every configured token and asserted against the configured value.
  A mismatch is a startup failure, never a warning.
- Every amount Muster stores is a base-unit decimal string plus its `decimals` plus its `token`, per
  `SPINE.md`'s money rule. No floats, no numbers, no hardcoded scale.
- A price shown to a buyer is rendered from that triple at display time. A listing whose
  `priceDecimals` does not match the live `decimals()` read is a lint failure that blocks go-live
  (`05-ONBOARDING.md`).

Two feature-detection traps from `SPINE.md` that are chain facts rather than rail facts, so they belong
here. A **proxy holds no dispatch table**, so grepping a token address for a selector reports every
selector absent: read the EIP-1967 implementation slot
`0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` and grep the implementation.
And **WBNB never reverts** on an unknown selector, because its fallback is `deposit()`, so try/catch
feature detection reads WBNB as supporting everything.

### 2.6 The upgrade watch, because the registries can move under us

The Identity and Reputation registries can be replaced at will by a 3-of-5 Safe at
`0xF223968Dd0c66472E31043acAcCcF5D1464D644b`. The Validation Registry can be replaced by a **single
EOA** at `0x8888d0A88ef8302dfa4BA53c41c2fE3c4E486f42` (`R01-erc8004.md`). An upgrade could change the
storage meaning of every record Muster shows, including the `_lastId` slot the whole enumeration rests
on.

So `registry-reader` reads the EIP-1967 implementation slot on all three proxies on every sweep and
compares against the pinned build-time values `0x7274e874CA62410a93Bd8bf61c69d8045E399c02`,
`0x16e0FA7f7C56B9a767E34B192B51f921BE31dA34` and `0xDB31f5d9167f8ebc8B30FbBF814c4d297c2D7F99`. That is
three extra storage reads per sweep and it converts an unmanaged dependency into a monitored one.

A mismatch has to have a defined behaviour, because it can fire between 2026-09-09 and 2026-09-23 with
nobody at a keyboard. So the fallback is specified rather than named:

- **The banner goes up on `status`** naming the proxy, the pinned implementation, the value read now and
  the block. The site keeps rendering from the last good sweep with its freshness stamp, because a
  stale number with its age beats a blank page.
- **The `_lastId` fast path freezes** and the count comes from a binary search on `ownerOf` instead.
  The predicate is the revert: `ERC721NonexistentToken(uint256)`, error selector `0x7e273289`,
  distinguished from a node error by decoding the selector rather than by catching any failure. The
  bounds are the last known good `_lastId` as the low end, doubling the offset above it until a probe
  reverts to find the high end, then a bisection between the two. That is about two dozen `eth_call`s
  for a registry of this size and it needs no storage layout at all, which is the point: it survives a
  slot the upgrade moved.
- **The terminal state is a human decision, not a timeout.** Two exits and no third. Either the new
  implementation is read, the slot layout is confirmed against it and the pinned value is re-pinned in
  config, which clears the banner and restores the fast path. Or nobody confirms it, in which case the
  banner stays up and the binary search stays on for as long as that takes. Nothing silently resumes
  the fast path.

### 2.7 The four categories, four BSC read surfaces, equal depth

Agent Diversity is one of the three published criteria and the rubric says single-category submissions
score poorly, so the chain layer has to serve all four equally. `03-TAXONOMY.md` owns the category
contracts and `13-PARTNERS.md` owns the partner framing. What is settled here is which BSC surface
supplies each category's checkable number, at what cadence and what the honest label on it is.

| Category | The BSC read that makes a claim checkable | Cadence | Measured or advertised |
| --- | --- | --- | --- |
| **rebalancing** | PancakeSwap v3 NonfungiblePositionManager `0x46A15B0b27311cedF172AB29E4f4766fbE7F4364` plus the pool's `slot0` and `getFeeGrowthInside`. `R08-pancakeswap.md` reproduced `decreaseLiquidity` and `collect` to the wei at a pinned block | per block for price, per position event for state | measured |
| **grid trading** | `Swap` logs on the pool, topic `0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83`, seven non-indexed words. `R09-bsc-defi.md` summed 6,583 swaps in 3,000 blocks and reproduced the explorer's fee figure within 10% | every swap, in 3,000-block windows | measured |
| **yield** | Venus `supplyRatePerBlock` and `borrowRatePerBlock` annualised with 70,080,000, Lista Moolah `borrowRateView` per second annualised with `exp(r*31536000)-1`, Aave v3 rates already annual in ray | rates every few minutes, governance parameters hourly | measured, with the protocol's own published APY shown beside it as advertised |
| **health factor** | Venus `getAccountLiquidity` `0x5ec88c79` against `getBorrowingPower` `0x528a174c` plus `getEffectiveLtvFactor`, Lista Moolah `isHealthy` `0x2c2c904f`, Aave `getUserAccountData` field 6 | oracle price every block for the held asset set, account recompute on an account event or a price threshold crossing | measured |

Three rules from `R09-bsc-defi.md` bind every one of those four and they are chain-level, so they are
enforced in the read layer rather than left to a display decision.

**Pin every multi-call read to one block number.** BSC blocks land 0.45 s apart, measured 0.45000 s
over 1,000 blocks. An unpinned Venus position read disagreed with the chain by 2.9e16 wei on both
weighting paths, an identical offset that looked like a formula error and was six blocks of drift.
Every number Muster shows carries the block it was read at, which is the same `freshness` stamp the
catalogue uses.

**Store the rate's unit with the rate.** Venus is per block, Lista Moolah is per second, Aave is per
year in ray, Lista CDP is a per-second ray exponent. Store the raw integer, the unit and the source
call, then derive the display figure. A stored "4.58" has thrown away the thing that made it checkable.

**Never poll at block speed.** Nothing in the four needs 0.45 s resolution and polling that fast burns
a free RPC's budget in minutes. One price watcher over the union of assets the watched accounts hold,
one slow parameter watcher, then a per-account recompute triggered by a precomputed price threshold or
an account event.

## 3. BSC testnet, chain 97: one artifact, never a second catalogue

Chain 97 carries **exactly one thing**: the ERC-8183 settlement loop, one job driven to COMPLETED,
labelled with its chain id on screen. Nothing else. The reason is the Altana bonus gate, which wants a
mainnet job at FUNDED or later paired with a testnet job at COMPLETED. The mainnet dispute window
is 604,800 s against 900 s on the current testnet policy, so the closed loop only closes on 97 inside
one sitting (`13-PARTNERS.md`). Altana wallets, sessions and Keystore registrations are all mainnet.

B402 is not a reason for testnet and it never was. `12-BINANCE.md` read the environments table from the
primary page: the Sandbox row for chain 97 also reads "Please contact us for access", sandbox is a
separate developer account with its own credentials and its own unpublished base URL, then the
application is a form with no published review turnaround. So testnet buys no B402 access either. Every
demonstrated hire runs on the in-process `facilitator` (`12-BINANCE.md`, `08-MONEY.md`), both B402
applications are filed on day one and a grant during judging is a config flip. That supersedes
`R17-binance-agent-os.md`'s reading, which took mainnet as gated and testnet as open.

**Read today**, all against `https://bsc-testnet-rpc.publicnode.com`:

| Fact | Value |
| --- | --- |
| Chain id, head | 97, block 129,288,933 |
| Gas price | 100,000,000 wei = 0.1 gwei, twice mainnet |
| Identity Registry `0x8004A818BFB912233c491871b3d84c89A494BD9e` | 130-byte proxy, `name()` `AgentIdentity`, `getVersion()` `2.0.0` |
| Reputation Registry `0x8004B663056A597Dffe9eCcC1965A193B7388713` | 130-byte proxy, `getClients(1)` returns one client |
| Validation Registry `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` | 130-byte proxy, `getVersion()` `2.0.0`, `getIdentityRegistry()` returns the chain-97 Identity Registry, implementation `0xDB31f5d9167f8ebc8B30FbBF814c4d297c2D7F99`. Confirmed on two independent endpoints |
| Agents ever registered on 97 (`_lastId`) | **2,165** |
| ERC-8183 kernel `0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE`, router `0xD7d36D66d2F1B608A0F943f722D27e3744f66F25` | 130-byte proxies each |
| ERC-8183 policy `0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA` | 4,413 bytes, a real implementation not a proxy |
| Permit2 `0x000000000022D473030F116dDEE9F6B43aC78BA3` | 9,152 bytes, same as mainnet |
| Multicall3, `x402ExactPermit2Proxy` `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` | 3,808 and 2,913 bytes |

**One correction to `SPINE.md`, from those reads.** Its testnet row calls the chain-97 validation proxy
"a stub, `getIdentityRegistry()` reverts". On chain 97 that call answers with the chain-97 Identity
Registry, on two endpoints, so the registry is live and wired. The stub is the same address on **chain
56**, where `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` sits over implementation
`0xd53dE688e0b0ad436FBdbDa00036832FF6499234` and does revert, which is what `R01-erc8004.md` recorded
and what the spine row compressed into the wrong chain (section 2.1). The consequence is small but it
runs the other way from the note in `06-QUALITY.md`: the validation request and response can be
rehearsed on 97 against an agent we register there. What still cannot move off mainnet is the shipped
pair, because a listing is a mainnet fact and the validated agent id is a mainnet id.

2,165 agents on 97 against 336,088 on 56 is the reason testnet is never a source of listings. A
marketplace whose shelves are filled from chain 97 has 0.6% of the supply and breaks the eligibility
rule that agents surfaced must be live on BSC.

### 3.1 The symbol collisions on chain 97, settled

`SPINE.md` lists this as unverified and contradictory, in two halves. `R02-erc8183.md` and
`R06-altana.md` name the chain-97 `$U` as `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` at 18 decimals
while `R03-x402-b402.md` quotes B402's mock `$U` as `0x330949Aed7d00FCe0558C64ED6FeC9792616cC39` at 6
decimals. Separately, R03 and `R04-bsc-tokens.md` name two different testnet USDC addresses at 6 and 18
decimals. The resolution the spine asked for was one `decimals()` call per token. **Read today, every
row:**

| Address on chain 97 | `symbol()` | `decimals()` | Codesize | What it is |
| --- | --- | --- | --- | --- |
| `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` | `U` | **18** | 2,007 | the ERC-8183 kernel's payment token |
| `0x330949Aed7d00FCe0558C64ED6FeC9792616cC39` | `U` | **6** | 6,835 | B402's Mock U |
| `0x64544969ed7EBf5f083679233325356EbE738930` | `USDC` | **18** | 3,969 | `name()` "USDC Token", the faucet token `R04-bsc-tokens.md` read |
| `0xEC1C60D64a06896Df296438c12edD14E974FDE47` | `USDC` | **6** | 2,445 | the USDC `R03-x402-b402.md` and `R17-binance-agent-os.md` name, Permit2 only |
| `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd` | `USDT` | **18** | 3,969 | the testnet USDT, Permit2 only per `R17-binance-agent-os.md` |
| `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | n/a | n/a | **0** | mainnet Binance-Peg USDC's address. No code on 97, so a config carried across chains fails here rather than lying |

**No research file was wrong. Both halves of the spine entry have the same answer.** Chain 97
carries two tokens symbolled `U` and two symbolled `USDC`, one of each pair at 18 decimals and one at 6.
Mainnet U at `0xcE24439F2D9C6a2289F741120FE202248B666666` is 18 and every mainnet stablecoin in the
spine's table is 18. Any chain-97 code that paid an ERC-8183 job and settled a B402 payment in the same
run would touch two tokens called U that differ by a factor of a trillion, then promoting it to mainnet
would change the B402 leg by another factor of a trillion. We do not run that combination on 97, which is
a scheduling accident rather than a defence, so the rule below stands either way.

The direction is what makes it dangerous. Mainnet has no 6-decimal stablecoin at all, so mainnet never
catches the mistake: code that resolves a token by symbol works on 56 then is wrong by a factor of 10^12
on 97. Whether any other chain-97 token collides the same way is unverified, because only the six
rows above were read.

The rule that removes the whole class of bug: **`decimals()` is read at runtime per token per chain and
never taken from a constant.** Binance's own docs say the on-chain `decimals()` is the source of truth
(`R17-binance-agent-os.md`), which is the same rule arrived at from the other side. Muster's token
config carries the expected value only as an assertion target and a mismatch fails the boot.

## 4. opBNB, chain 204: settled and not used, with the proof

The earlier passes in this lane called opBNB a deliberate non-use and argued it from a bridge tax
(`ARCHITECTURE-PART-2.md` 11.4). The argument was right and it was never checked. It is checked now.

**Read today**, against `https://opbnb-mainnet-rpc.bnbchain.org`. Chain id 204, head 182,032,560,
`eth_gasPrice` 1,000,000 wei = 0.001 gwei.

| Contract we would need | Address | Codesize on opBNB |
| --- | --- | --- |
| ERC-8004 Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | **0** |
| ERC-8004 Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | **0** |
| ERC-8004 Validation Registry | `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58` | **0** |
| ERC-8183 AgenticCommerce kernel | `0xEa4DAa3100A767e86FDed867729ae7446476EBA6` | **0** |
| ERC-8183 EvaluatorRouter | `0x51895229E12F9876011789B04f8698af06cCD6DA` | **0** |
| ERC-8183 OptimisticPolicy | `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5` | **0** |
| U (United Stables) | `0xcE24439F2D9C6a2289F741120FE202248B666666` | **0** |
| USD1 | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | **0** |
| FDUSD | `0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409` | **0** |
| Altana KeyStore | `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a` | **0** |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | 3,808 |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | 9,152 |
| A CREATE2 factory | `0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7` | 69, the same 69 runtime bytes as on 56, read today. What project ships it is unverified, so it is described by what it does rather than named |

Second proof, independent of the chain. The canonical deployment script
`erc-8004/erc-8004-contracts/scripts/addresses.ts`, fetched today, lists **23** mainnet chain ids and 25
testnet chain ids by hand. **Neither list contains 204 or 5611.** So the codesize zeros are not a
misread address, they are the deployment roster. The counts are checkable in one `curl`, so they are
worth getting right: 23 entries in `MAINNET_CHAIN_IDS` and 25 in `TESTNET_CHAIN_IDS`, counted from
`research/raw/erc8004-scripts-addresses-2026-09-05.ts`. The raw URL re-fetched today came back
byte-identical to that capture at 5,935 bytes. `R01-erc8004.md` said 24 mainnets and is corrected.

Nothing Muster needs is on opBNB. Not one agent, not one feedback entry, not one escrow job, not one
settlement token, not the Altana Keystore the partner track scores on. Multicall3 and Permit2 are
there, so a build could be deployed there with nothing for it to read.

### 4.1 The arithmetic, so the non-use is a decision rather than an omission

opBNB's case is per-transaction cost on high-volume workloads. Priced with the two gas figures read
today and the settle costs from `R04-bsc-tokens.md`:

| | BSC 56 at 0.05 gwei | opBNB 204 at 0.001 gwei | Saving per action |
| --- | --- | --- | --- |
| EIP-3009 settle, 103,395 gas | $0.003997 | $0.000080 | **$0.00392** |
| Permit2 proxy settle, 70,157 gas | $0.002712 | $0.000054 | $0.00266 |

Moving every settlement to opBNB saves under four tenths of a cent each. Ten thousand hires would save
$39. That is the whole prize, which is why the codesize table above is the argument rather than a
supporting detail: there is nothing on 204 to read.

**What a BSC-to-opBNB bridge hop costs is unmeasured and nothing in this lane measures it.** The only
cross-chain relayer fees read today are Greenfield's, from its live `storage/params`:
`bsc_mirror_object_relayer_fee` 0.0004 BNB = $0.31 on the BSC side and `op_mirror_object_relayer_fee`
0.000013 BNB = $0.010 on the opBNB side, each plus a 0.000006 BNB = $0.005 ack fee. Those price a
Greenfield object mirror, not a token bridge, so quoting either as the bridge tax would be a number
about the wrong mechanism. On the opBNB-side figure a hop would repay itself after about three
settlements, which is the honest version and it is not much of an argument either way.

The argument that does hold is not money. The identity Muster ranks on, the reputation it reads, the
escrow it indexes and the token it settles in are all on 56, so a split puts a bridge on the critical
path of a hire, with its latency and its failure mode, to relieve a cost pressure of $0.0039 that
nobody feels.

### 4.2 The one case, documented as next and not built

If Muster ever runs its own high-volume on-chain stream, per-view metering, agent-to-agent tick
payments or a public on-chain event feed, opBNB is the right host for that stream while identity and
settlement stay on 56. That is a scaling question about a product that has users. It is out of scope
before 2026-09-09 and it is not a stretch item, it is a later one.

## 5. BNB Greenfield, chain 1017: settled by measurement, then bounded

This is the question the earlier passes could not answer. `ARCHITECTURE-PART-2.md` 11.3 put
`feedbackURI` bodies, reputation snapshots and dispute evidence on Greenfield as a stretch, hedged
because "if a payment account runs dry the stored data can be permanently deleted". `R16-reuse.md`
judged it "keep as stretch. The deletion behaviour is never verified and it is the whole reason the
section is cautious". `SPINE.md` lists Greenfield billing as unverified and names it "the whole reason
any Greenfield use stays a stretch". So it got verified, end to end, including a real object fetched
anonymously and its checksum recomputed.

The short answer: **Greenfield works, it is nearly free, its integrity claim is genuinely checkable by
a stranger and it is still not where our evidence bundles go before 2026-09-09.** The reason is not
cost and not the deletion clause. It is that three of the four public storage providers we tried return
404 for a sealed object that provably exists on chain.

### 5.1 What read today establishes

`https://greenfield-chain.bnbchain.org` answers `eth_chainId` **1017** and serves the Cosmos
gRPC-gateway REST and the Tendermint RPC on the same host, anonymously, with no key. Network
`greenfield_1017-1`, height **36,395,494** at 2026-09-05T16:34:17Z.

Live payment parameters, `GET /greenfield/payment/params`:

| Parameter | Live value |
| --- | --- |
| `reserve_time` | 15,552,000 s = **180 days** |
| `forced_settle_time` | 604,800 s = 7 days |
| `validator_tax_rate` | 0.01 |
| `payment_account_count_limit` | 200 |
| `max_auto_settle_flow_count`, `max_auto_resume_flow_count` | 100, 100 |
| `fee_denom` | BNB |
| `withdraw_time_lock_threshold`, `_duration` | 100000000000000000000 wei = 100 BNB, 86,400 s |

Live storage parameters, `GET /greenfield/storage/params`:

| Parameter | Live value |
| --- | --- |
| `min_charge_size` | **131,072 bytes = 128 KiB** |
| `max_segment_size` | 16,777,216 = 16 MiB |
| `redundant_data_chunk_num`, `redundant_parity_chunk_num` | 4, 2 |
| `max_payload_size` | 34,359,738,368 = 32 GiB |
| `max_buckets_per_account` | 100 |
| `discontinue_confirm_period` | 604,800 s |
| `bsc_mirror_object_relayer_fee`, ack | 400,000,000,000,000 and 6,000,000,000,000 wei |
| `op_mirror_object_relayer_fee`, ack | 13,000,000,000,000 and 6,000,000,000,000 wei |

Live prices, `GET /greenfield/sp/global_sp_store_price_by_time/0`, set at `update_time_sec` 1788220801
which is the first block of 2026-09, in wei BNB per byte per second: `primary_store_price`
0.008283932060000000, `secondary_store_price` 0.000994071847200000, `read_price`
0.055754464480000000. `GET /greenfield/sp/params` gives `secondary_sp_store_price_ratio` 0.12 and an SP
`min_deposit` of 500 BNB. Dividing 0.000994071847200000 by 0.008283932060000000 gives exactly 0.12, so
the two reads agree.

The storage provider set is readable anonymously through the Tendermint ABCI query, which is the route
the SDK uses:

```bash
curl -s 'https://greenfield-chain.bnbchain.org/abci_query?path=%22/greenfield.sp.Query/StorageProviders%22&data=0x'
```

Decoded, that returns **8 mainnet storage providers**: `greenfield-sp.bnbchain.org`,
`greenfield-sp.nodereal.io`, `greenfield-sp.defibit.io`, `greenfield-sp.ninicoin.io`,
`greenfield-sp.lumibot.org`, `greenfield-sp.nariox.org`, `greenfield-sp.voltbot.io` and
`gnfd-mainnet-sp.4everland.org`.

### 5.2 The cost, computed from those prices

The billing formula is Greenfield's own, from `bnb-chain/greenfield`
`docs/modules/billing-and-payment.md` read today:

```
primaryRate      = PrimaryStorePrice   * ChargeSize
secondaryRate    = SecondaryStorePrice * ChargeSize * SecondarySPNumber
validatorTaxRate = ValidatorTaxRate    * (primaryRate + secondaryRate)
totalRate        = primaryRate + secondaryRate + validatorTaxRate
lockAmount       = totalRate * ReserveTime
```

With `SecondarySPNumber` = 6 (4 data chunks plus 2 parity), the live prices above and BNB at $773.058:

| What | Rate | Cost |
| --- | --- | --- |
| Total store rate per byte per second | 0.014390846774632 wei BNB | |
| 1 GiB for 30 days | 15,452,054 wei/s | 0.0000400517 BNB = **$0.031** |
| One object at the 128 KiB minimum charge | 1,886.2 wei/s | locks 2.933e-8 BNB = **$0.0000227** for the 180-day reserve, $0.0000038 per 30 days |
| Ten thousand such objects | | locks 0.000293 BNB = **$0.23**, costs $0.038 per 30 days |
| 1 GiB of read quota for 30 days | | **$0.12** |

**Cost is not the argument against Greenfield.** Ten thousand receipts, evidence bundles or dispute
packets, each padded to the 128 KiB minimum, lock 23 cents for six months. Funding it past the
2026-09-23 end of judging is trivial and the earlier passes' worry about pre-funding is answered by the
number rather than by caution.

Two cost facts do change the design if we use it. The **128 KiB minimum charge** means a 2 KB receipt
and a 128 KB bundle cost the same, so small artifacts get bundled rather than written one per object.
Greenfield's own docs say so out loud: "To optimize your cost, it is advisable to consolidate small
files into payloads exceeding 128KB." And **deleting an object early still pays for `ReserveTime`**, so
a 180-day commitment is made at seal time whatever happens afterwards.

### 5.3 The recompute path, verified to the byte on a real object

The Data Quality claim Greenfield would buy is that a stranger re-fetches the bytes and re-hashes them.
That claim was tested rather than asserted, on an object nobody in this lane created.

Searching `GET /greenfield/storage/head_bucket/{name}` for existing public buckets turned up an
unrelated bucket named `agents`, owner `0x3397B41B392EAfF0c37883D175B68873f84791dd`, id 60682,
`VISIBILITY_TYPE_PUBLIC_READ`, created 1764664844, holding 17 objects, all `ObjectStatus` 1 (sealed).
Read today, the 17 are twelve registration documents of 766 or 767 bytes (`agents/3` to `agents/9` at
766, `agents/10` to `agents/14` at 767) plus five test objects of 17 to 107 bytes under a `test/`
prefix. Somebody is already parking ERC-8004 registration documents on Greenfield mainnet. The one
fetched decodes to a chain-97 test agent with an endpoint of
`http://localhost:8000/api/weather`, so it is an end-to-end test harness rather than a product, but it
is a real sealed object with real on-chain state.

Anonymous list-objects on a storage provider returns the whole `ObjectInfo`, no key required:

```bash
curl -s 'https://agents.greenfield-sp.defibit.io/?max-keys=1000'
```

That gives `Owner`, `Creator`, `Id`, `PayloadSize`, `ContentType`, `Visibility`, `CreateAt`,
`ObjectStatus`, `RedundancyType`, `LocalVirtualGroupId`, seven `Checksums`, `CreateTxHash`,
`SealTxHash`, `Operator`, `UpdateAt` and `Version`. For `agents/10/registration.json`: id 17342523, 767
bytes, `application/json`, `RedundancyType` 0, LVG 3, `CreateTxHash`
`0x37364d1a5bff99a9dc7e0869411c41b4804ea2e3c1db582de6fa6ef65281c374`, `SealTxHash`
`0xf48c336cd1f02e15b6f129c503cdcb2db34c4493da197bd9262b1c9f16cf373f`.

The integrity identity, worked out here because Greenfield's docs do not state it in this form:

```
sha256(bytes)          = 4dba5f48050e496cf289ccb8153b08e916ac5e05b34c1f04e73245a6686b370a
Checksums[0] (base64)  = XDWKZb0blDweq6M3TUSyQm8usvGGd/TCHmAtU6YKhAg=
Checksums[0] (hex)     = 5c358a65bd1b943c1eaba3374d44b2426f2eb2f18677f4c21e602d53a60a8408
sha256(sha256(bytes))  = 5c358a65bd1b943c1eaba3374d44b2426f2eb2f18677f4c21e602d53a60a8408   exact match
```

So for an object inside one 16 MiB segment, **`Checksums[0]` is `sha256(sha256(payload))`**, not
`sha256(payload)`. `Checksums[1..6]` are the six erasure-coded shard hashes and neither the payload hash
nor a plain concatenation of the shard hashes reproduces `Checksums[0]`. Anyone who writes the naive
one-line check will see a mismatch on correct data and conclude the wrong thing.

### 5.4 The three failure modes, in the order that matters

**One: a Greenfield URL is storage-provider specific, so picking the wrong one 404s real data.** The
same sealed object, fetched anonymously from four public storage providers within a minute of each
other:

| Storage provider | Result for `agents/10/registration.json` |
| --- | --- |
| `greenfield-sp.defibit.io` | **HTTP 200, 767 bytes**, `content-type: application/json` |
| `greenfield-sp.bnbchain.org` | HTTP 404, `<Code>85102</Code>` "failed to get piece data from piece store ... NoSuchKey" |
| `greenfield-sp.nodereal.io` | HTTP 404, `<Code>85102</Code>` |
| `greenfield-sp.ninicoin.io` | HTTP 404, `<Code>85102</Code>` |

All four served the metadata identically, including the checksums. Only one served the bytes. A second
object in a different bucket, `files/images/azuki0.png`, returned the same 85102 from
`greenfield-sp.bnbchain.org`, so this is not one broken bucket.

That is the disqualifying fact for a submission judged between 2026-09-09 and 2026-09-23. The rule in
`00-PROGRAM.md` is that every URL the submission cites resolves to 200 for an anonymous fetch. A
Greenfield object URL satisfies that only from the storage provider that holds it. Which provider that
is has to be discovered and pinned, because the public REST gateway cannot answer it (see failure mode
three). One provider changing its serving behaviour during the judging window turns published evidence
into a 404.

**Two: an out-of-balance payment account really does lose the data.** Greenfield's own words, from
`docs/modules/billing-and-payment.md` read today: if the dynamic balance plus buffer balance falls under
the forced-settlement threshold, "All payment streams of the account will be closed and the account will
be marked as out of balance. The download speed for all objects associated with the account or payment
account will be downgraded. **The objects will be deleted by the SPs if no fund is provided within the
predefined threshold.**" The account is then marked frozen, the validators take the remaining buffer as
a reward and during the out-of-balance period no new object can be created under the bucket. Depositing
resumes it automatically from a backup of the stream settings.

So the earlier passes' hedge was correct and it is now a quoted clause rather than a worry. It is also
the least of the three problems, because 180 days of reserve for ten thousand objects is 23 cents and
`forced_settle_time` gives a further 7 days of warning. A funding alarm plus a deposit well past
2026-09-23 closes it.

**Three: the public REST gateway has holes exactly where the resolution logic needs it.** Read today on
`https://greenfield-chain.bnbchain.org`, anonymously:

| Route | Result |
| --- | --- |
| `/greenfield/payment/params`, `/greenfield/storage/params`, `/greenfield/sp/params`, `/greenfield/virtualgroup/params` | 200 |
| `/greenfield/sp/global_sp_store_price_by_time/{ts}` | 200 |
| `/greenfield/storage/head_bucket/{bucket}` | 200, structured error for a missing bucket |
| `/greenfield/storage/head_object/{bucket}/{object}` | **`code 12 Not Implemented`** |
| `/greenfield/sp/storage_providers`, `/greenfield/sp/storage_provider/{id}` | **`code 12 Not Implemented`** |
| the `virtualgroup` family routes | **`code 12 Not Implemented`** |
| `/abci_query?path="/greenfield.sp.Query/StorageProviders"` | 200, protobuf, the full SP set |
| `/status` | 200, height and network |

A bucket exposes `global_virtual_group_family_id` (4 for the `agents` bucket) and resolving that family
to its primary storage provider is exactly what the disabled routes would do. It is reachable through
`abci_query`, which means a builder has to decode protobuf by hand or take the Greenfield SDK. That SDK,
`@bnb-chain/greenfield-js-sdk`, is at **2.2.2 published 2025-05-07**, read today from the npm registry,
which is sixteen months old.

### 5.5 The decision

**Greenfield is not the store of record for evidence bundles or job artifacts in the shipped build.**
`evidence-store` is content-addressed storage we run. What makes a receipt checkable is the content
hash published in the receipt plus the `recomputeCommand` beside it, both of which work with any
storage. That discipline belongs to `09-DISPUTES.md` and `06-QUALITY.md`. It does not need a second
chain to be true.

Rejected alternatives, each with what it buys:

- **Greenfield as the primary store.** Buys a decentralised, content-addressed home and a BNB Chain
  surface a judge can see us using. Costs a serving path that 404s from three of four providers, a
  protobuf resolution step behind a disabled REST route, a sixteen-month-old SDK, a second chain to fund
  and a deletion failure mode live across the judging window. Rejected on the 404s alone.
- **IPFS or Arweave.** Buys familiarity and an existing gateway fleet. Rejected because it is not a BNB
  Chain surface, so it spends the same integration budget with none of the ecosystem credit. Pinning
  reliability is then its own problem on top.
- **A private bucket with no published hash.** Rejected outright. It makes every number an assertion.

**What ships instead.** Every receipt carries `contentHash`, `hashRule`, `inputsHash`, `pinnedBlock`,
`codeVersion` and `recomputeCommand` (`SPINE.md`'s `receipt` fields). The bytes are served from
`evidence-store` over the same public origin as the site, so the anonymous-fetch gate is one origin
rather than eight. A stranger recomputes the hash from the published command and compares it against the
hash in the receipt and against the on-chain anchor the job already has, which for an ERC-8183 job is
`JobInitialised` from the policy, the only on-chain home of the deliverable pointer
(`R02-erc8183.md`).

### 5.6 The bounded slice, specified and not scheduled

If Greenfield ever ships it ships as a **mirror, never as the path**. It covers exactly one artifact
class: the published quality snapshot, the versioned file that makes a Muster score reproducible. One
object per snapshot, padded past 128 KiB so the minimum charge is not wasted, in one public-read bucket,
on one payment account funded past 2026-09-23 with an alarm on the balance.

**It is not in the build before 2026-09-09.** Earlier drafts of this section gated it on "if a day
frees up", which is not a trigger anybody owns: `15-SYSTEM.md` has no Greenfield block in its build
order, no row for it in the cut list and no line in the day-lost table, so there is no hour it comes out
of and nothing to cut it from. A half-day item nobody scheduled does not happen. It is written down here
so it is a decision with a recipe rather than a gap. The earliest it can ship is after the deadline.

**Mainnet rather than testnet, if it does ship.** Greenfield testnet works (read today,
`greenfield_5600-1` at height 34,926,055, anonymous) and it would make the funding, the deletion clause
and the 180-day reserve moot. It is still the wrong host: the object exists to make a mainnet number
recomputable, so a stranger who fetches it has to be fetching the same class of artifact the score is
built from. At 23 cents for ten thousand objects the mainnet cost is not what testnet would be saving us
from.

The recipe is specified from what was actually run. Steps 2 to 5 were executed today against a real
sealed object nobody in this lane created. Step 1 is the write side and nobody here has performed it, so
that step is unverified:

1. Create the bucket public-read, note its `global_virtual_group_family_id`, seal the object.
2. Resolve the serving provider once, by fetching the object from every provider in the ABCI list and
   keeping the one that returns 200. Pin that host in the config.
3. Publish, per snapshot: the object URL on the pinned provider, `PayloadSize`, `Checksums[0]`,
   `SealTxHash` and the Greenfield height.
4. Publish the check as a command, not a claim:
   `curl -s <url> | sha256sum | ... | sha256sum` compared against `base64 -d` of `Checksums[0]`, plus a
   byte-count assertion against `PayloadSize`.
5. Run the anonymous fetch as a gate in the submit checklist, from a clean session, on the same schedule
   as every other cited URL.

It is about half a day of work and it buys one honest sentence: the snapshot behind our score lives on
BNB Greenfield and here is the command that proves the bytes are the bytes. It is never on the render
path of a page. The reversal it represents against the earlier passes is recorded in
`three/decisions/11-bnb-stack-greenfield-not-store-of-record.md`.

### 5.7 The Greenfield hubs on BSC exist and we still do not mirror

**Read today**, every address from `bnb-chain/greenfield-contracts` `deployment/56-deployment.json` and
every codesize from chain 56:

| Contract | Address | Codesize |
| --- | --- | --- |
| CrossChain | `0x77e719b714be09F70D484AB81F70D02B0E182f7d` | 2,206 |
| TokenHub | `0xeA97dF87E6c7F68C9f95A69dA79E19B834823F25` | 2,206 |
| BucketHub | `0xE909754263572F71bc6aFAc837646A93f5818573` | 2,206 |
| ObjectHub | `0x634eB9c438b8378bbdd8D0e10970Ec88db0b4d0f` | 2,206 |
| GroupHub | `0xDd9af4573D64324125fCa5Ce13407be79331B7F7` | 2,206 |
| PermissionHub | `0xe1776006dBE9B60d9eA38C0dDb80b41f2657acE8` | 2,206 |
| GreenfieldExecutor | `0xFa39D9111D927836b14D071d43e0aAD9cE83bBBf` | 2,096 |
| LightClient | `0x433bB48Bd86c089375e53b2E2873A9C4bC0e986B` | 2,206 |
| ObjectERC721Token | `0x4B92705a60d69f7A96aaDB8faa892526eB71adb7` | 6,587 |
| MultiMessage | `0x26204702935e2D617EE75B795152B9623a7d9809` | 2,096 |

Two live calls confirm the wiring rather than the file: `CrossChain.gnfdChainId()` returns **1017** and
`ObjectHub.ERC721Token()` returns `0x4B92705a60d69f7A96aaDB8faa892526eB71adb7`, the ObjectERC721Token
above.

So a Greenfield object can be mirrored onto BSC as an ERC-721 and controlled from a BSC contract. We do
not do it. Mirroring one object costs `bsc_mirror_object_relayer_fee` 0.0004 BNB plus a
6,000,000,000,000 wei ack, which is **$0.31 per object against $0.0000227 to store it**, a factor of
13,600. The mirror also buys a token that represents the object rather than the bytes a judge needs.
Nothing in the rubric asks for an object NFT.

## 6. BNB Agent Studio and the `bag` CLI

Studio is the socket Muster plugs into. `R14-rivals.md` established what it ships (a wallet, an LLM
aggregator, ERC-8004 registration, an ERC-8183 task interface, a cloud runtime, the CLI) and what it
does not: no marketplace, no discovery page, no listing flow, no indexer, no storefront spec. The demand
side is the empty half and that is the whole thesis (`02-THESIS.md`).

**Read today** from the npm registry and from the published tarball of `@bnbagent/studio-cli`:

| Fact | Value |
| --- | --- |
| Version, published | **0.0.13**, 2026-08-27 |
| Licence | **Apache-2.0** |
| Binary | `bag` -> `./dist/bag.js` |
| Node | `>=22` |
| Pinned deps | `@bnbagent/sdk` 0.5.5, `@bnbagent/deploy-cli` 0.5.15, `@bnbagent/studio-runtime` 0.0.13, viem ^2.54.0 |
| Ships | `dist`, `skills`, `recipes`, `README.md`, `DISCLAIMER.md` |
| Sibling versions | `@bnbagent/sdk` 0.5.5 (2026-08-27), `@bnbagent/deploy-cli` 0.5.15 (2026-08-20) |

The command surface, extracted from the bundle's own command registrations rather than from the docs
page. The four groups that matter to us:

- `bag erc8004 register | show | resolve | update-endpoint | update-metadata | get-metadata | clear-pending`
- `bag erc8183 buy | status | settle | submit`
- `bag x402 quote | buy | sell | trust`, plus `x402-setup`
- `bag wallet new | session | grant | revoke | policy | balance | show | rotate | list-keys`

Also present: `bag mpp trust | quote | buy`, `bag budget enable | disable`, `bag llm activate | topup |
auto-renew | list-models`, `bag skills install | uninstall`, `bag deploy prepare | verify | status |
destroy | logs | info | provision-cognito`, `bag platform login | invoke-client | credit`, plus
`bag doctor`, `bag audit`, `bag scan`, `bag test`, `bag dev`, `bag init`, `bag recipe code`,
`bag config set` and `bag env set`.

Two flags are load bearing. `--protocols` takes any non-empty subset of A2A, MCP and X402 as the
generated agent's public faces. `--rails <8183|b402|both>` picks the hire rail. **Studio's own CLI treats
ERC-8183 and B402 as the two rails**, which is the same pair `08-MONEY.md` settles on, so our rail
choice is BNB Agent Studio's own rather than a preference we have to defend.

**One correction to `R14-rivals.md`.** It reports "`bag mcp serve` runs 15 read-only chain tools for your
IDE, it never signs", read off the Studio docs page. There is **no `mcp` top-level command in the
published 0.0.13 command registrations.** MCP in 0.0.13 is a scaffolded face for the agent you generate:
the bundle carries `mcpMain`, `McpServer`, `Mcp-Session-Id` and streamable-HTTP wiring, reached through
`--protocols MCP`. Either the docs describe an unreleased command or it is exposed some other way. The
consequence for us is small and worth stating. Our own `mcp` server is not duplicating a Studio command.
And `--protocols MCP` is evidence that a machine face over this data is the house pattern, so Muster's
`mcp` reads as native rather than novel.

### 6.1 What we use it for and what we do not

**Use.** `bag erc8004 register` and `bag erc8004 update-endpoint` are the exact commands an operator runs
to get a listable identity, so `05-ONBOARDING.md`'s operator path is written against them and Muster's
listing lint checks the state those commands leave behind. `bag erc8183 buy | status | settle` is the
buyer path on the official kernel, so `escrow-index` indexes what those commands produce rather than a
shape of our own. Our own first-party demo agents are scaffolded with the CLI, at `--rails both`, so the
supply side of the demo is built the way the platform intends.

**Do not use.** `bag deploy` and its AWS AgentCore or Azure Foundry providers are not on Muster's path.
Muster is a marketplace rather than an agent runtime. Studio's unshipped Developer Dashboard is
adjacent to that surface (`R14-rivals.md`), so duplicating agent lifecycle control would collide with the
thing we want to be adopted by. `bag llm` and `bag platform credit` are Studio's own billing and are not
a dependency. `bag mpp` is the payments layer BNB Chain's own landscape post says is "still being
confirmed internally" (section 8), so it is unverified and we do not build on it.

Licence note, because Apache-2.0 requires it: the CLI is a build-time and operator-facing tool, we
redistribute none of it. `10-DOCS-AND-POLICY.md` lists it with its licence in `NOTICE`.

## 7. Binance Web3 Wallet as one path onto BSC

`SPINE.md` lists the injection path and the connector package as unverified and `R16-reuse.md` judged
`ARCHITECTURE-PART-2.md` 12.3 "never verified. Plausible and cheap, but the injection path and connector
package names are unread". They are read now, from the published packages.

**Read today** from the npm registry: `@binance/w3w-ethereum-provider` **1.1.13** (2026-01-05),
`@binance/w3w-wagmi-connector` 1.2.3 (2026-01-05), `@binance/w3w-rainbow-connector` 1.1.8 (2026-01-05),
`@binance/w3w-utils` 1.1.8, `@binance/w3w-types` 1.1.4. The provider package's own dependencies are
`@binance/w3w-http-client`, `@binance/w3w-sign-client`, `eip1193-provider` plus `eventemitter3`. Its
licence field reads ISC.

`getProvider()` in `@binance/w3w-ethereum-provider` 1.1.13 has exactly three branches, in this order,
read from `src/index.ts` and the built bundle:

1. **Inside the Binance app's browser.** `isInBinance()` is `window.ethereum?.isBinance === true`. Use
   `window.ethereum`.
2. **Extension installed.** `isExtensionInstalled()` is `window.binancew3w?.isExtension === true`. Use
   `window.binancew3w.ethereum`.
3. **Neither.** Construct `BinanceW3WProvider`, a WalletConnect-shaped QR and deeplink sign client whose
   `isWalletConnect` getter returns true and whose **default chain id is 56**.

Three consequences for the hire page, all concrete:

**The typed-data method is on the wallet path.** The provider routes only `signingMethods` to the wallet
and everything else to an HTTP JSON-RPC client. That list, read from `@binance/w3w-utils`
`src/constants.ts`, contains `eth_signTypedData_v4`, `eth_signTypedData_v3`, `personal_sign`,
`eth_sendTransaction`, `wallet_switchEthereumChain` and `wallet_watchAsset`. Muster's whole hire rests on
one EIP-712 signature (`08-MONEY.md`), which is `eth_signTypedData_v4`, so the one method that has to
work does.

**An RPC must be supplied or non-signing calls throw.** `getRpcUrl(chainId, rpc)` prefers
`rpc.custom[chainId]`, otherwise builds an Infura URL from an `infuraId`. With neither, the provider has
no HTTP client and `request()` throws `Cannot request JSON-RPC method (...) without provided rpc url`. So
the connector is configured with `rpc: { 56: <our BSC endpoint> }` and never left to a default. This is
the one trap that would cost an hour on the day.

**Three branches means three test paths.** In-app browser, extension and QR each hit a different code
path. The one a judge on a laptop with no extension will hit is the third, so that is the one the demo
has to be recorded against.

What this does not settle: whether the wallet is the right default connector against a generic EIP-1193
or WalletConnect v2 setup, what it means for custody and what it does not solve for a buyer. Those are
product questions and `SPINE.md` gives them to `12-BINANCE.md`. The scope lines for 11 and 12 both name
this wallet, so the split taken here is chain-connection mechanics in this document and buyer-experience
posture in 12.

## 8. The AI agent landscape data

BNB Chain publishes its own account of the agent population. The post is titled
"BNB Chain AI Agent Landscape: Agents, Tools, and Payments" (their Oxford comma, kept because it is a
title) at `https://www.bnbchain.org/en/blog/bnb-chain-ai-agent-landscape-agents-tools-and-payments`,
dated **2026-07-16** and read today. What it claims, with its own attributions:

- BNB Smart Chain carries "more than 200,000 ERC-8004 agents (as of 16 July 2026)", "roughly 60% of all
  such agents across 26 networks", with the runner-up chain "under 40,000". Cited to
  `8004scan.io/networks`.
- "About 72,800 of those agents registered in the past 30 days." Cited to `8004scan.io/networks/stats`.
- About $13.7 billion in stablecoins on BSC, "the money agents would actually move". Cited to DefiLlama,
  2026-06-29.
- It calls ERC-8004 "the discoverability and reputation layer that agents register on" and names four
  requirements of an agent economy: identity, capability, payment, accountability.
- It names BAP-578 as BNB Chain's "native Non-Fungible Agent standard", plus BNB Attestation Service,
  Agent Passport, x402, ERC-8183, $U, USD1, Pieverse, AEON, Trust Wallet AgentKit and the BNBAgent SDK.
- Its own caveat, in its own words: application-level demand is unproven and an MPP-based payments SDK's
  naming and timing are "still being confirmed internally".

### 8.1 The freshness table, which is the argument

Four counts of the same population, every one read or published, every one with its own clock:

| Source | BSC agent count | As of | How it was read |
| --- | --- | --- | --- |
| **Our own `_lastId`** | **336,088** | block 120,141,168, 2026-09-05T16:17:48Z | one `eth_getStorageAt`, read today |
| trust8004, a rival index | 336,124, `lastAgentId` 336,123 | 2026-09-05T16:40:35Z | `GET https://trust8004.xyz/api/v1/chains`, read today |
| 8004scan, the official scanner | 304,629 | indexer `status: down`, checkpoint block 119,687,744 | `GET https://api.8004scan.io/api/v1/stats/global`, the `chain_stats` row for 56, read today |
| BNB Chain's own landscape post | "more than 200,000" | 2026-07-16, cited to 8004scan | published |

8004scan's chain-56 indexer reported `status: down` with the message "100 direct events are pending
parent data" and `canonical_checkpoint_age_seconds` **167,499**, which is 46.5 hours, still frozen at
block 119,687,744. `R05-8004scan-api.md` recorded the same frozen checkpoint at 01:08 and 02:17 UTC with
ages of 111,530 s and 115,668 s. Fifteen hours later it has not advanced one block.

Its BSC gap has widened, by less than the headline numbers suggest, so the comparison is drawn on one
basis. `R05`'s 20,280 is minted ids minus **indexed rows with every filter off**, 334,876 against
314,596. Against its own `total_agents` of 304,281, which is the field this table quotes, the gap at that
hour was 30,595. Today's is 336,088 minus 304,629, so **31,459**. Like against like the widening is
**864 agents**, not the eleven thousand the two headline numbers would imply. The gap is large and it is
barely moving, which is the honest reading: the indexer is frozen and the chain is not.

Its `daily_new_agents` for BSC reads 477 against our measured 1,940 per day. That field is not
structurally broken. `MEASUREMENT.md` read 2,254 from it hours earlier, so it collapsed when the indexer
froze rather than always having been wrong.

trust8004 is the useful cross-check and it corroborates our own full-registry sweep exactly:
`totalFeedbacks` 29,712 and `uniqueReviewers` 111, both identical to `MEASUREMENT.md`'s figures from a
sweep of every agent id. It also reports `validation: null` for BSC, which `SPINE.md` already settled as
wrong: the Validation Registry is deployed and both public indexes miss it. Its `metadataHealthy` is
193,535 of 336,124, so 57.6% of the population has a parseable registration document by its reckoning.

### 8.2 How Muster uses this

**The claim we can make**, because every number in it is ours and reproducible: Muster's count of BSC
agents is the chain's own counter read at a published block, it is fresher than the official scanner by
46 hours and it is 31,459 agents ahead of it. The `status` page shows our block height beside 8004scan's
checkpoint and the age of each, so the comparison is on screen rather than in a pitch.

**The claim we do not make about the landscape post.** Its "more than 200,000" is not a wrong number, it
is a correctly dated one: the post carries "as of 16 July 2026" in the same sentence, twice. At the
registration rate measured here the registry held roughly 237,000 on that date. It is a figure that no
longer describes the chain, which is a fact about how fast this population moves rather than a mistake
anybody made. Calling it low would invite exactly the correction we would deserve. The beat-the-scanner
claim is made against 8004scan same-day, where it is 46 hours and 31,459 agents.

**The claim we cannot make.** Nothing about 8004scan being wrong in general. It is the official scanner
for the AltLayer track, its `cross_chain_links`, `field_sources` provenance map and `parse_status` issue
codes are genuinely good and costly to rebuild. Its `/status/*` family is the only honest freshness
disclosure in the ecosystem (`R05-8004scan-api.md`). We cite it, cache it and never block a page render
on it. The one number we quote from it is its own score, labelled with its algorithm and its date.

**BAP-578 is unverified and we do not use it.** BNB Chain's own post names it as the native
Non-Fungible Agent standard. No deployed BAP-578 registry address was read from a primary source this
pass, so nothing in Muster depends on it and no document should name it as available. An ERC-8004
`agentId` is already an ERC-721 token on BSC, so identity ownership and transfer are solved without it.

## 9. Deliberate non-uses, with the reason each

A non-use stated with its reason reads as a decision. A non-use left silent reads as an omission. These
are the ones a judge or a maintainer might ask about.

| Not used | Reason, verified where it can be |
| --- | --- |
| **opBNB, chain 204** | Read today: codesize 0 at all three ERC-8004 registries, all three ERC-8183 contracts, U, USD1, FDUSD and the Altana Keystore. Not on the canonical ERC-8004 roster. There is nothing there to read. A settlement there saves $0.0039 |
| **Greenfield as the store of record** | Three of four public storage providers 404 a sealed object that exists on chain. Section 5.4 |
| **Greenfield object mirroring to BSC** | $0.31 per object against $0.0000227 to store it, plus the mirror represents the object rather than the bytes |
| **A from-genesis `eth_getLogs` backfill** | No free BSC RPC serves both archive depth and a range over 10,000 blocks. About 8,200 requests for the full range. Storage plus Multicall3 replaces it |
| **8004scan as the index of record** | Its chain-56 indexer has been `status: down` with a frozen checkpoint for 46.5 hours and is 31,459 agents behind. It stays an enrichment source |
| **`agent_wallet` as a payout address** | It defaults to the registrant for every agent. 600 of 600 sampled non-zero and 0 of 600 different from `ownerOf` (`MEASUREMENT.md`). Paying it pays the registrant |
| **Our own ERC-8183 policy on the shared router** | `setPolicyWhitelist` is owner-only and we are not the owner. Verified in `SPINE.md`, not open |
| **Our own escrow contract** | The official ERC-8183 kernel is live on BSC with 28,244 completed jobs and `platformFeeBP` 0. Indexing the official one is the stronger story and the smaller build |
| **BAP-578** | No deployed address read from a primary source. Unverified |
| **Binance Oracle as an on-chain price reference** | Its feed-registry address and read signature are unverified (`SPINE.md`). Venus's ResilientOracle at `0x6592b5DE802159F3E74B2486b091D11a8256ab8A` is verified, covers 55 BSC assets and is free, so it is the on-chain mark we use |
| **A gas paymaster (MegaFuel, Particle)** | Pricing unverified for both and one needs a funded deposit. The facilitator already makes the buyer gasless on the one-signature hire, so what a paymaster would buy is the optional `giveFeedback` at 199,819 gas = $0.0077 plus the one-time Permit2 approve at $0.0018, both measured in 2.4. Sponsoring writes that cost under a cent, one of which the score does not depend on, does not repay an integration with unverified pricing. Section 13 carries what would change that |
| **BSC testnet as a source of listings** | 2,165 agents on 97 against 336,088 on 56, plus the eligibility rule says agents surfaced must be live on BSC |
| **`bag deploy` and the Studio runtimes** | Muster is a marketplace rather than an agent host. Studio's own unshipped Developer Dashboard occupies that surface |
| **Any exchange credential path** | Out of scope as a security position. `12-BINANCE.md` owns the framing |

## 10. What we would use with more time

Ordered by what each buys, not by how interesting it is. None of these is presented as shipping.

1. **A paid archive RPC.** One credential removes the whole class of problem in section 2.3. It makes
   historical liquidity, historical health factors and a real uptime backfill computable instead of
   collectable-forward-only and it turns the `sampler` from the only source of a time series into a
   cross-check on one. Cheapest single upgrade in this document.
2. **Greenfield for the full evidence archive**, on the bounded recipe in 5.6 extended to dispute bundles
   and the hash-chained `ledger` archive, once the provider-resolution step is a library rather than a
   protobuf decode and once the serving behaviour has been watched for a fortnight rather than a minute.
3. **The `mcp` server as a first-class BNB Chain surface.** `@bnb-chain/mcp` 1.5.1 (2026-04-17, read
   today from npm) is BNB Chain's own MCP server covering BSC, opBNB and Greenfield. `--protocols
   MCP` in the Studio CLI says the same thing. Muster's `mcp` ships in the build; publishing it as an
   installable server that other agents discover is the next step.
4. **Cross-chain read for free.** The same three ERC-8004 addresses exist on 23 mainnets from one CREATE2
   factory and `getIdentityRegistry()` resolves per chain, so an `eip155:<chainId>:0x8004A169…` key
   generalises with nothing but a new RPC URL (`R01-erc8004.md`, count taken from the deployment script
   in section 4). BSC is the largest registry by agent count, so this is a later expansion rather than a
   hedge.
5. **On-chain oracle validation of a category outcome.** A health-factor alert or a rebalance trigger
   recomputed from an oracle read at a pinned block is the strongest form of the Data Quality claim. It
   needs the archive endpoint from item 1 to be worth anything historically.
6. **A funded Greenfield payment account with an alarm**, plus the forced-settlement watch, so the
   deletion clause in 5.4 becomes a monitored parameter rather than a reason to stay off the chain.

## 11. What ships by 2026-09-09

Plainly, so nothing on this page is mistaken for a plan.

**Ships.** BSC mainnet as the only source of listings. The `_lastId` plus Multicall3 sweep with a tail on
the delta. The three ERC-8004 registries read through `registry-reader` with the read table in 2.1, plus
the four registry writes in the table beside it with the signer each needs. The implementation-slot
upgrade watch with the specified fallback in 2.6. The decimals assertion at boot on every configured
token. Publicnode as the primary RPC with the failover order in 2.3. Gas figures and USD conversion from
the reads in 2.4. The four category read surfaces in 2.7 with a pinned block on every multi-call. The
Studio CLI as the operator and demo-agent path. The Binance Web3 Wallet connector as one of the buyer
paths, configured with an explicit `rpc.custom[56]`. The freshness comparison in 8.1 on the public
`status` page. Every hire a judge walks runs on the in-process `facilitator` on mainnet.

**Ships on chain 97, exactly one artifact, labelled with its chain id on screen.** The ERC-8183
settlement loop, one job driven to COMPLETED, which is the testnet half of the Altana ERC-8183 gate
paired with a mainnet job at FUNDED or later (`13-PARTNERS.md`). Nothing else. Not B402, whose sandbox
needs its own application and its own unpublished base URL (`12-BINANCE.md`). Not Altana, whose wallets,
sessions and Keystore registrations are all mainnet. Never a listing, never a number quoted without the
chain id beside it.

**Documented as next, not shipped.** Greenfield in any form, including the bounded snapshot mirror in
5.6, which has no block in the build order and therefore no path into this build. opBNB in any form. A
paid archive endpoint. On-chain oracle validation of a category outcome. Cross-chain reads. A published
`mcp` server install.

**Not shipped and not promised.** BAP-578. A gas paymaster. Any exchange credential path. Our own escrow
or our own ERC-8183 policy.

## 12. Decisions and rejected alternatives

**BSC mainnet is the only source of listings.** Rejected: filling shelves from chain 97 where the
registry is friendlier and emptier. Why: 2,165 agents on 97 against 336,088 on 56, read today. The
eligibility rule also says agents surfaced must be live on BSC. A testnet catalogue fails the rule and looks
like a demo.

**Chain 97 carries exactly one artifact, the ERC-8183 settlement loop.** Rejected: treating testnet as
the second environment where anything awkward can run, which is what an earlier draft of this document
did when it booked "the B402 hire" as a chain-97 ship. Why: that premise was retired by
`12-BINANCE.md`'s read of the primary pages, where B402's sandbox on 97 also reads "Please contact us
for access" with its own account, its own credentials and its own unpublished base URL. A
credential-gated stretch presented as shipped is the worst of both, so every demonstrated hire runs on
the in-process `facilitator` on mainnet, both B402 applications are filed on day one and a grant during
judging is a config flip. Also rejected: putting the Altana wallets or sessions on 97, which
`13-PARTNERS.md` settles on mainnet.

**The catalogue comes from `_lastId` plus Multicall3, not from logs and not from an API.** Rejected: an
`eth_getLogs` replay of `Registered` and 8004scan as the primary read. Why: no free BSC RPC serves the
range, about 8,200 requests for the full history, while one storage read gives the exact count and 670
`eth_call`s give the whole registry in half an hour. 8004scan's chain-56 indexer has been down with a
frozen checkpoint for 46.5 hours and is 31,459 agents behind, read today.

**opBNB is not used at all.** Rejected: hosting settlement, the audit stream or a metering feed there.
Why: read today, codesize 0 at all six contracts the hire path needs plus all three settlement tokens plus
the Altana Keystore. 204 is not on the canonical ERC-8004 roster either. There is nothing on 204 to read,
which is the whole reason. The saving for moving anyway is $0.0039 per settlement. What a
BSC-to-opBNB bridge would cost is unmeasured, so no bridge arithmetic is claimed in either direction.

**Greenfield is not the store of record and the bounded snapshot mirror is documented rather than
scheduled.** Rejected: making it the primary evidence store, which the earlier passes held open as a
stretch. Why: three of four public storage providers returned 404 with error 85102 for a sealed object
that exists on chain, the REST route that resolves a bucket to its serving provider answers `Not
Implemented`, then the JS SDK is sixteen months old. Cost is not the reason: ten thousand 128 KiB objects
lock 23 cents for 180 days. Also rejected: IPFS or Arweave, which spends the same budget with none of the
BNB Chain credit. Recorded in `three/decisions/11-bnb-stack-greenfield-not-store-of-record.md`.

**Greenfield's `Checksums[0]` is `sha256(sha256(payload))` for a single-segment object, written down here
because we proved it.** Rejected: publishing a recompute command using a plain `sha256`. Why: the
plain hash does not match, verified on a live 767-byte object, so the naive command would fail on correct
data and make our own evidence look broken.

**Storage keeps the published content hash as the anchor wherever the bytes live.** Rejected: trusting a
storage provider's integrity header, which the Greenfield fetch did not return. Also rejected: trusting a
URL alone.
Why: the hash plus the `recomputeCommand` in the receipt works with any storage and survives a provider
change mid-judging.

**`decimals()` is read at runtime for every token on every chain and a mismatch fails the boot.**
Rejected: a constants table, which is what almost every reference implementation does. Why: read today,
chain 97 carries two different tokens symbolled `U` and two symbolled `USDC`, one of each pair at 18
decimals and one at 6, while mainnet U is 18 and every mainnet stablecoin is 18. A constant that is right
on one is wrong by a factor of a trillion on another. Mainnet never catches it.

**Venus's ResilientOracle is the on-chain USD mark, not Binance Oracle.** Rejected: Binance Oracle's feed
registry. Why: its address and read signature are unverified, while the Venus oracle is verified through
its vBNB market, covers 55 BSC assets, costs nothing and cross-checked to within 0.1% of the keyless
Binance spot ticker today. Also rejected: counting `getPrice(WBNB)` as a second on-chain opinion. It is
the same token config, byte-identical at a pinned block, so the dollar column rests on two sources and
not three.

**The upgrade watch is three storage reads per sweep rather than a pinned ABI and hope.** Rejected:
pinning the implementations and ignoring the slots. Why: a 3-of-5 Safe can replace two registries and a
single EOA can replace the third. An upgrade could change the meaning of the `_lastId` slot the whole
enumeration depends on.

**Studio's CLI is a tool we use, not a dependency we ship on.** Rejected: building Muster on top of
`bag deploy` and the Studio runtimes. Why: Muster is the demand side and Studio's own unshipped Developer
Dashboard occupies the lifecycle surface. Colliding with the product we want to be adopted by is the one
avoidable mistake in this integration.

**Binance Web3 Wallet ships as one buyer path with an explicit RPC, not as the default connector.**
Rejected: making it the only path or leaving `rpc` unset. Why: three injection branches means three test
paths, the QR branch is what a judge on a laptop hits, then with no `rpc.custom[56]` every non-signing
call throws by design. All three verified in the package source.

**The freshness comparison goes on the public status page.** Rejected: keeping it in the writeup. Why: the
rubric scores the running site and all three criteria are properties of it, so a number a judge can see
beats a number a judge has to be told.

## 13. Open questions

Each one names what would settle it. Nothing here is a blocker for 2026-09-09 unless it says so.

**Which Greenfield storage provider serves a bucket, resolved programmatically.** The bucket exposes
`global_virtual_group_family_id` and the REST route that maps a family to its primary provider answers
`Not Implemented`. It is reachable through `abci_query` with a protobuf decode. Settled by decoding the
`virtualgroup` query response by hand or by taking the sixteen-month-old SDK. Until then, the provider is
discovered by trying the eight in the ABCI list and pinning the one that answers 200.

**Why three of four providers 404 a sealed object.** Read today and reproduced on a second object in a
different bucket, so it is not a one-off. Whether it is by design (only the holding provider serves
payload) or a data-availability failure on those providers is unresolved. The distinction decides
whether Greenfield is safe for evidence at all. Settled by reading the storage-provider standard or by
watching one object across all eight providers for a week.

**Whether a BAP-578 registry is deployed on BSC and at what address.** BNB Chain's own landscape post
names it. No primary source with an address was reached this pass. Settled by a deployment record or a live
`codesize` at a named address. Unverified today, so unused.

**Binance Oracle's feed-registry address and read signature.** Still unverified, carried from `SPINE.md`.
Settled by one read against a named address. Not a blocker, because the Venus oracle covers the same need.

**Whether the `bag mcp serve` command in Studio's docs exists in any published version.** Absent from
0.0.13's command registrations, read today. Settled by a later release or by Studio's own changelog. It
changes nothing in our build either way.

**Whether 8004scan's chain-56 indexer recovers before judging.** Down with a frozen checkpoint across
three reads on 2026-09-05, spanning 15.5 hours, with the gap widening. It matters only for how we phrase
the comparison in 8.1, because nothing renders from it. Settled by re-reading `/status/indexers/direct` on
the day of submission, which is on the submit checklist regardless.

**Whether the two chain-97 tokens both symbolled `U` are related.** The 18-decimal one is the ERC-8183
kernel's payment token, the 6-decimal one is B402's mock, both verified today. Whether B402 will accept the
kernel's token on 97 is unverified and belongs to `08-MONEY.md`, which needs a `/supported` response to
settle it. The same question is open for the two tokens symbolled `USDC` on 97 and it has the same answer:
resolve a token by address, never by symbol.

**Whether Greenfield's `min_charge_size` or the store prices change during judging.** Prices are set from
the median of provider-suggested prices at the first block of each month. The live epoch's
`update_time_sec` is 1788220801, which is 2026-09-01T00:00:01Z, so **the next epoch lands 2026-10-01,
after the 2026-09-23 close of judging.** Nothing we publish inside the window is exposed to a reprice.
The price-epoch stamp still goes on any published cost figure, for the reader who arrives after the
window. Settled by re-reading the price route after the month boundary.

**Whether a buyer will pay the gas to rate a job.** The prepared `giveFeedback` costs the buyer 199,819
gas, $0.0077 at 0.05 gwei, measured in 2.4. No payment facilitator sponsors a registry write. The
score does not depend on it (`06-QUALITY.md`), so the design absorbs a zero response rate, but the
on-chain trail is thinner without it. It is also the one thing a gas paymaster would buy, which is why
the paymaster non-use in section 9 rests on this number. Settled by watching the ratio of settled jobs to
signed feedback writes once real hires exist, which is after the deadline.

**Whether a judge reads the repo at all.** Unverified and carried from `00-PROGRAM.md`. It decides whether
the verified-command detail in this document earns anything directly or only through the numbers it puts
on screen. Every command here is also reproducible from the public site's `status` page and `api`, so the
answer changes the presentation and not the build.
