# R11 measurement: the live census of ERC-8004 agents on BSC

Measured 2026-09-05, chain id 56. Every number below carries the command that produced it.
Scripts live in `three/research/tools/`, raw output in `three/research/raw/`.

## Headline

BSC holds **334,935 registered ERC-8004 agents** at block 120,027,164 (2026-09-05T02:02:32Z),
read straight off the registry's own counter. 8004scan reports 303,461 for the same registry,
so the indexer is 31,474 agents short and its BSC checkpoint is 32 hours stale. Under a stated
bar, **12 of 600 uniformly sampled agents expose a machine-callable endpoint and 0 of 600 expose
a way for a stranger to pay** them. A full sweep of all 334,935 ids finds **4,406 agents with any
feedback (1.32%), 29,712 feedbacks in total, written by only 111 distinct addresses**. Population
keyword counts for the four mandated categories total roughly 500 agents, under 0.2% of the
registry. The supply is not the story. The usable fraction of it is. On this evidence that fraction
is about 2% at the most generous bar and zero at the bar a buyer needs.

## Verified facts

### Population count

| Claim | Value | How verified |
| --- | --- | --- |
| Chain | BSC, chain id 56 | `cast chain-id --rpc-url https://bsc-rpc.publicnode.com` returns `56` |
| Head block at measurement | 120,027,164 | `cast block-number`, then `eth_getBlockByNumber` |
| Head block timestamp | 1788573752 = 2026-09-05T02:02:32Z | `cast block 120027164 --json` field `timestamp` = `0x6a9b7838` |
| Agents ever registered | **334,935** | `cast storage 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00` returns `0x…051c57` = 334935 |
| Storage slot is the right one | derivation matches the source comment | `cast index-erc7201 "erc8004.identity.registry"` returns `0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00` |
| That slot holds `_lastId` | first member of `IdentityRegistryStorage` | `raw/erc8004-src-IdentityRegistryUpgradeable-2026-09-05.sol`, struct member `uint256 _lastId` at offset 0 |
| Ids start at 0, not 1 | `agentId = $._lastId++` in all three `register` overloads | same source file |
| Top live id | 334,934 | `cast call … "ownerOf(uint256)(address)" 334934` returns `0xDb126dd74De60dA61E4B50281E31b05f750d7664` |
| One past the top reverts | `ERC721NonexistentToken(334935)` | `ownerOf(334935)` reverts with `0x7e273289` + `0x…051c57`; `cast sig "ERC721NonexistentToken(uint256)"` = `0x7e273289` |
| Id 0 exists | owner `0x8CE2b1348740D27d6075F602Ad679a041407fdEc`, name `dAi` | `ownerOf(0)`, `tokenURI(0)` decoded |
| Id 1 name | `ClawNews`, owner `0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029` | `tokenURI(1)` decoded, `ownerOf(1)` |
| Registry genesis block | 79,094,807 at 2026-02-03T17:01:53Z (mint of id 0) | 8004scan `created_block_number` for token 0, block timestamp read on chain with `cast block 79094807` |
| Mean block time since genesis | 0.4504 s | (1788572787 - 1770138113) / (120025020 - 79094807) |
| `totalSupply()` is unavailable | reverts, so there is no ERC721Enumerable path to a count | `cast call 0x8004A169… "totalSupply()(uint256)"` returns `execution reverted`. `totalSupply` is absent from `raw/erc8004-abi-IdentityRegistry-2026-09-05.json` |
| Head block hash | `0x59404718c27e56a567721d57aab800604499444a4aa853a53f7cf453fb962a9f` | `raw/r11-census-2026-09-05.json`, `head.hash` |
| `_lastId` was unchanged across the whole log scan | `0x…051c57` before and after | same file, `lastIdBefore` equals `lastIdAfter`, so the window and the count describe the same state |

### Id allocation is sequential with no gaps

The count above is only the agent count if every id from 0 to `_lastId - 1` was minted exactly once.
`node tools/r11-census.mjs` proves it over the newest 5,000 blocks and the sample proves it across
the range.

| Claim | Value | How verified |
| --- | --- | --- |
| `Registered` topic0 | `0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a` | `cast sig-event "Registered(uint256,string,address)"` |
| Registered events, blocks 120,022,165 to 120,027,164 | 55 | `eth_getLogs` in 1,000-block chunks, `raw/r11-census-2026-09-05.json` |
| Their agentIds | 334,880 to 334,934, span 55, zero gaps | same file, `contiguousNoGaps: true`, `gaps: []` |
| Top logged id equals `_lastId - 1` | true | same file, `idMaxTouchesLastId: true` |
| Mint `Transfer` events in the same window | 55, identical id set | `eth_getLogs` with topics `[Transfer, 0x00…00]`, `mintTransfersEqualRegistered: true` |
| No `tokenURI` reverts across the sample | 0 of 600 sampled ids missing | `raw/r11-sample-onchain-2026-09-05.json`, no `ERR:` values |
| No transfers away from the minter in the sample | 600 of 600 still hold the mint-time wallet | `_update` clears `agentWallet` on transfer and 600 of 600 have `getAgentWallet == ownerOf` |
| Current registration rate | 55 per 5,000 blocks = 0.011 per block = about 2,110 per day | same window; 8004scan reports `daily_new_agents` 2,254 for BSC |

### The second source disagrees and its own status page says why

| Claim | Value | How verified |
| --- | --- | --- |
| 8004scan BSC agent total, list endpoint | 303,461 | `curl 'https://api.8004scan.io/api/v1/agents?chain_id=56&limit=1'` field `total` |
| 8004scan BSC agent total, stats endpoint | 304,281 | `curl 'https://api.8004scan.io/api/v1/stats/global'`, then jq `.chain_stats[] \| select(.chain_id==56) \| .total_agents` |
| Shortfall against chain | 31,474 agents, 9.40% of the true count | 334,935 - 303,461 |
| The two 8004scan endpoints disagree with each other | by 820 agents | 304,281 - 303,461 |
| 8004scan BSC indexer status | `down`, message `100 direct events are pending parent data` | `curl 'https://api.8004scan.io/api/v1/status/indexers/direct'` |
| Its canonical checkpoint | block 119,687,744, last written 2026-09-03T18:09:16Z, age 117,411 s (32.6 h) | same call, `raw/8004scan-indexers-direct-R11b-2026-09-05.json` |
| Its newest processed event | block 119,985,609 at 2026-09-04T21:01:05Z | same call |
| Blocks behind head on the event stream | 41,555 | 120,027,164 - 119,985,609 |
| 8004scan BSC feedback total | 11,780 | `stats/global`, `chain_stats[56].total_feedbacks` |
| 8004scan protocol counts for BSC | mcp 5,382, a2a 27,956, oasf 376 | same `chain_stats[56]` object |

Both numbers are real. The registry counter is the count of agents. The 8004scan number is the count
of agents that one indexer has finished ingesting. A marketplace that quotes 8004scan without saying
so is quoting a 32 hour old view.

## The sample and why it reproduces

`node tools/r11-sample.mjs` draws 600 distinct agentIds uniformly from 0 to 334,923 inclusive.
No `Math.random` anywhere. The generator is splitmix64 with three fixed constants, so the same
draw comes out of python, go or rust as easily as node.

```js
const M64 = (1n << 64n) - 1n
function makeRng(seed) {
  let s = seed & M64
  return function next() {
    s = (s + 0x9e3779b97f4a7c15n) & M64
    let z = s
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & M64
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & M64
    return (z ^ (z >> 31n)) & M64
  }
}
// uniform on [0, n) by rejection, so there is no modulo bias
function uniformBelow(next, n) {
  const limit = ((1n << 64n) / n) * n
  for (;;) { const r = next(); if (r < limit) return r % n }
}
```

| Parameter | Value | Why |
| --- | --- | --- |
| seed | `20260905n` | fixed in the file, not passed in |
| id range | 0 to 334,923 inclusive | pinned to `_lastId - 1` read at block 120,025,020, so the draw survives registry growth |
| n | 600 | above the 400 the brief asks for, so a 2% finding gets a 95% interval of about 1.2 to 3.5 points |
| method | distinct ids, rejection-sampled, no replacement | `drawIds()` in `tools/r11-sample.mjs` |
| first 8 ids in draw order | 298939, 282263, 288202, 44429, 334103, 176405, 114427, 192976 | printed by the script on every run |

Ids 0 and 1 are read as well, appended after the draw so they never displace a sampled id. They are
excluded from every count marked "of 600" and are used only in the claim checks.

The sample is validated against the population it came from. 8004scan publishes protocol counts over
its whole BSC index, so the sample shares should land on them.

| Protocol | Sample share of 600 | 8004scan population share of 304,281 |
| --- | --- | --- |
| A2A service declared | 52 = 8.67% | 27,956 = 9.19% |
| MCP service declared | 12 = 2.00% | 5,382 = 1.77% |
| OASF service declared | 0 = 0.00% | 376 = 0.12%, so 0.7 expected in 600 |

Three independent agreements on a uniform draw is as much validation as a sample can carry.

Two more checks on the draw itself, both re-runnable:

```bash
node --input-type=module -e '
import {drawIds} from "./tools/r11-sample.mjs"; import fs from "node:fs";
const saved=JSON.parse(fs.readFileSync("raw/r11-sample-ids-2026-09-05.json","utf8"));
const {drawOrder,sorted}=drawIds();
console.log("reproduces:", JSON.stringify(drawOrder)===JSON.stringify(saved.drawOrder));
const B=10,MAX=334923,c=new Array(B).fill(0);
for(const i of sorted) c[Math.min(B-1,Math.floor(i/((MAX+1)/B)))]++;
console.log("deciles:",c.join(" "),"chi2:",c.reduce((s,x)=>s+(x-60)**2/60,0).toFixed(2));'
```

| Check | Result |
| --- | --- |
| Re-derived draw equals the saved id list, in draw order and sorted | true |
| Sampled id min, max | 371 and 334,618 |
| Decile counts | 50, 51, 54, 64, 66, 76, 51, 63, 67, 58 |
| Chi-square against 60 per decile | 11.13 on 9 degrees of freedom, 5% critical value 16.92, so uniform |

## What the 600 agents actually declare

Read with `node tools/r11-sample.mjs`, then `node tools/r11-offchain.mjs`, then
`node tools/r11-merge.mjs`, then `node tools/r11-analyze.mjs`.

### tokenURI and whether the registration document can be read at all

| Metric | Count of 600 | Share |
| --- | --- | --- |
| tokenURI is a `data:` URI | 280 | 46.67% |
| tokenURI is `https://` | 301 | 50.17% |
| tokenURI is `ipfs://` | 2 | 0.33% |
| tokenURI is empty string | 14 | 2.33% |
| tokenURI is freeform text, not a URI | 3 | 0.50% |
| registration document parsed as JSON | 570 | 95.00% |
| document unreadable (empty, unfetchable, not JSON) | 30 | 5.00% |

Off-chain fetch of the 306 non-`data:` URIs: 301 answered HTTP 200, one 404, one 503, three failed at
the network layer. 290 of the 301 bodies parsed as JSON, 13 did not. One request per URI, 12 s timeout,
one retry only on a network failure.

### Names: one duplicated name is the plurality of the registry

322 distinct names across 600 agents, 312 of them appearing exactly once.

| Name | Count of 600 | Share (95% Wilson) |
| --- | --- | --- |
| `Ave.ai Trading Agent` | 215 | 35.83% (32.10 to 39.75) |
| no readable name | 31 | 5.17% |
| `Debot Trading Agent` | 16 | 2.67% |
| `Q402 Agent (by Quack AI)` | 12 | 2.00% |
| `" "` (a single space) | 3 | 0.50% |
| `Crypto Agent` | 3 | 0.50% |
| `OpenClaw Agent`, `MevX Trading Agent`, `APM Trading Agent`, `Geopolitics Agent` | 2 each | 0.33% each |
| every other name | 1 each, 312 names | |

The `Ave.ai Trading Agent` block is not 215 similar agents. All 215 carry a **byte-identical**
`data:application/json;base64` tokenURI, decoding to name `Ave.ai Trading Agent`, description
`AI-driven multi-chain trading agent with on-chain reputation.`, `active: true`,
`supportedTrust: ["reputation"]` and **no `services` array at all**. They sit under 215 distinct owner
addresses. `Debot Trading Agent` is the same pattern at 16, one shared URI, no services.

Distribution across the id space, which explains why this share moves:

| Id decile | Sampled | Ave.ai | Share |
| --- | --- | --- | --- |
| 0 to 10% | 50 | 17 | 34.0% |
| 10 to 20% | 51 | 33 | 64.7% |
| 20 to 30% | 54 | 41 | 75.9% |
| 30 to 40% | 64 | 36 | 56.3% |
| 40 to 50% | 66 | 29 | 43.9% |
| 50 to 60% | 76 | 15 | 19.7% |
| 60 to 70% | 51 | 15 | 29.4% |
| 70 to 80% | 63 | 22 | 34.9% |
| 80 to 90% | 67 | 4 | 6.0% |
| 90 to 100% | 58 | 3 | 5.2% |

Lowest Ave.ai id in the sample 12,683, highest 333,031.

### Endpoints: 9 hosts serve the whole sample

| Metric | Count of 600 | Share (95% Wilson) |
| --- | --- | --- |
| declares at least one `http(s)` service endpoint | 284 | 47.33% (43.37 to 51.33) |
| declares a **concrete** endpoint, no template placeholder | 233 | 38.83% (35.02 to 42.79) |
| declares only templated endpoints | 51 | 8.50% (6.52 to 11.00) |
| declares no `http(s)` endpoint at all | 316 | 52.67% (48.67 to 56.63) |
| endpoint host fails DNS | 2 | 0.33% |
| endpoint host live but every probe failed at TLS | 0 of the 600 (1 among the fixed probes) | |
| endpoint answered 2xx or 3xx | 230 | 38.33% (34.53 to 42.29) |
| every reachable endpoint returned an HTML page | 218 | 36.33% (32.58 to 40.26) |
| endpoint returned a JSON or protocol surface on an API-named service | 12 | 2.00% (1.15 to 3.46) |
| endpoint returned an HTTP 402 or an x402 `accepts` body | 0 | 0.00% (0 to 0.64) |

229 distinct `http(s)` URLs across the 600 agents, on **9 hosts**:

| Host | Distinct URLs | Agents | DNS | robots.txt | `/.well-known/agent-registration.json` | Probe outcome |
| --- | --- | --- | --- | --- | --- | --- |
| `evoevo.ai` | 217 | 217 | 2606:4700:83ba:… | 200 | **200** | 5 probed, all HTTP 200 `text/html`, identical body prefix, service named `web` |
| `platform-backend.prod.termix.live` | 2 | 51 | not probed, URLs carry `{agentId}` | | | classified as template, then resolved by hand, see below |
| `q402.quackai.ai` | 2 | 12 | 216.150.1.65 | 404 | 404 | both HTTP 200 `application/json` |
| `ensoul.ac` | 2 | 2 | 2606:4700:3031::… | 200 | 404 | both HTTP 200 `text/html` |
| `www.app.bitagent.io` | 2 | 2 | 2600:9000:21b4:… | 404 | 404 | both **HTTP 404**, including its declared `.well-known/agent-card.json` |
| `github.com` | 1 | 1 | 20.207.73.82 | 200 | 404 | HTTP 200 `text/html`, it is the OASF spec repo, not an agent |
| `clawnews.io` | 1 | 1 (id 1, a fixed probe) | 69.46.46.51 | fails | fails | TLS `ERR_TLS_CERT_ALTNAME_INVALID` |
| `nethub847.io` | 1 | 1 | **ENOTFOUND** | | | not requested, host does not exist |
| `aurakey222.io` | 1 | 1 | **ENOTFOUND** | | | not requested, host does not exist |

Two hosts that do not resolve are counted separately from hosts that resolve and refuse. Templated
URLs are counted separately from both. Nothing was fetched to discover a placeholder.

### The Termix block: a resolvable convention that resolves to nothing

51 of 600 agents (8.50%) publish exactly two endpoints, both containing a literal `{agentId}`:

```
https://platform-backend.prod.termix.live/api/v1/a2a/agents/{agentId}/card
https://platform-backend.prod.termix.live/api/v1/agents/{agentId}/services
```

Their registration documents carry `"registrations": []`, so nothing in the published data says what
to substitute. Substituting the on-chain token id does work, which is worth knowing because it means
the block is reachable by convention rather than by declaration:

| Probe | Result |
| --- | --- |
| `GET …/a2a/agents/188489/card` | HTTP 200 `application/json`, `{"agentTokenId":"188489","name":"btc.agent","endpoint":null,"status":"UNBOUND",…}` |
| `GET …/agents/188489/services` | HTTP 404 `{"error":{"code":"NOT_FOUND","message":"Agent not found"}}` |
| 6 cards probed across the id range (188489, 264448, 300537, 304851, 318110, 334618) | 6 of 6 HTTP 200, 6 of 6 `status: "UNBOUND"`, 6 of 6 `endpoint: null` |

So the card exists, the agent is not bound to an endpoint and the second declared path does not exist.
Their self-declared categories are not the mandated ones either: of the 51, Code and Smart Contracts 24,
Writing and Content 5, Automation and Ops 5, Design and Brand 4, Security and Verification 4, Data and
Research 4, general 3, Market and Protocol Research 2. Raw at `raw/r11-termix-card-probe-2026-09-05.json`.

### Wallets: the previous pass read this backwards

| Metric | Count of 600 | Share |
| --- | --- | --- |
| `getAgentWallet(agentId)` returns a non-zero address | **600** | 100.00% (99.36 to 100) |
| that address equals `ownerOf(agentId)` | **600** | 100.00% |
| that address differs from `ownerOf(agentId)` | **0** | 0.00% (0 to 0.64) |

The registry source explains both lines. Every `register` overload runs
`$._metadata[agentId]["agentWallet"] = abi.encodePacked(msg.sender)` before minting, so a non-zero
wallet is the **default**, not a signal. `_update` wipes it on transfer, so a zero would mean the agent
changed hands. Setting a wallet that differs from the holder needs `setAgentWallet` with an EIP-712
signature from the new wallet. **Nobody in the sample has done it.**

### Payment declarations

| Metric | Count of 600 | Share |
| --- | --- | --- |
| `x402Support: true` in the registration document | 24 | 4.00% (2.70 to 5.88) |
| `x402Support: false` | 289 | 48.17% |
| field absent entirely | 287 | 47.83% |
| endpoint actually answered with a 402 or an x402 `accepts` body | **0** | 0.00% (0 to 0.64) |

Key casing is not stable in the wild. `x402Support` appears 280 times in the off-chain documents,
`x402support` 3 times. `supportedTrust` competes with `supportedTrusts`. A parser that only reads
the spec spelling silently drops those rows.

## The stranger-pays bar, defined before it is counted

The bar is one question: **could a stranger, holding only public data and no relationship with the
operator, pay this agent and get work back?** Four tiers, each adding one requirement, each checked
against something that was actually run.

| Tier | Requirement added | Count of 600 | Share (95% Wilson) |
| --- | --- | --- | --- |
| T0 discoverable | registration document parses as JSON **and** declares at least one concrete `http(s)` endpoint, no template, no example domain | 233 | 38.83% (35.02 to 42.79) |
| T1 reachable | that host resolves in DNS, completes TLS against the declared hostname **and** answers 2xx or 3xx | 230 | 38.33% (34.53 to 42.29) |
| T2 machine-callable | the response is JSON or a recognised protocol surface (A2A card, MCP info, x402 challenge) on a service named as an API, not an HTML page built for a browser | **12** | 2.00% (1.15 to 3.46) |
| T3 payable | a payment destination is discoverable without asking the operator: an HTTP 402 carrying an x402 or B402 `accepts` array, **or** a declared `agentWallet` distinct from the mint default plus a price in the document | **0** | 0.00% (0 to 0.64) |

All 12 T2 agents carry the same name, `Q402 Agent (by Quack AI)`, describe themselves as
`Gasless stablecoin payment agent on BNB Chain.` and point at the single host `q402.quackai.ai`.
Ids 210894, 215630, 217162, 218750, 228731, 230264, 249181, 263541, 266601, 284978, 299847, 317961.
They have **12 distinct owner addresses and 12 distinct tokenURIs**, so this is one codebase registered
twelve times rather than one address spamming. It is still one host running one operator's software.
All 12 declare `x402Support: false` while describing themselves as payment agents. Their two endpoints
return:

```
GET https://q402.quackai.ai/api/relay/info
{"facilitator":"0xfc77FF29178B7286A8bA703D7a70895CA74fF466"}

GET https://q402.quackai.ai/api/mcp/info
{"type":"https://eips.ethereum.org/EIPS/eip-8004#service.mcp","name":"@quackai/q402-mcp",
 "version":"0.11.15","transport":"stdio","registry":{"npm":"https://www.npmjs.com/package/@q…"}}
```

The relay does name a facilitator address, which is the closest anything in the sample comes to a
payment surface, but neither endpoint answers with a 402 and neither carries a price, so it does not
reach T3 on the bar as written.

T3 is zero because no endpoint in the sample returned a 402 and no agent set a wallet distinct from
the mint default. The path from T1 to T2 is where 218 of 230 agents fall out and every one of them
falls out for the same reason: the declared endpoint is a human web page.

## The four mandated categories

At n=600 the sample answer is essentially zero, which is the correct answer and also a useless one, so
both scales are reported.

### Sample, n=600, keyword over name plus description plus skills plus service names

| Category | Narrow pattern | Hits | Wide pattern | Hits |
| --- | --- | --- | --- | --- |
| rebalancing | `/rebalanc/i` | **0** | adds portfolio drift, target weight, allocation | 0 |
| grid trading | `/\bgrid\b/i` | **0** | adds grid bot, range order | 0 |
| yield | `/yield\|apy\|apr/i` | **1** (`dawei.agent`) | adds farm, vault, stake, lend | 1 |
| health factor | `/health\s*-?\s*factor/i` | **0** | adds liquidation, collateralisation, LTV, margin call | 0 |
| all four narrow patterns in one agent | | **0** | | |
| any of the four | | **1** | | |

### Population, via the 8004scan search index over 303,461 indexed BSC agents

`node tools/r11-catcount.mjs`, raw at `raw/r11-8004scan-search-counts-2026-09-05.json`.

| Term | Agents | Term | Agents | Term | Agents |
| --- | --- | --- | --- | --- | --- |
| rebalance | 44 | yield | 290 | health factor | **21** |
| rebalancing | **47** | apy | **430** | liquidation | 342 |
| rebalancer | 47 | apr | 4 | lending | 54 |
| grid | **20** | yield farming | 31 | borrow | 7 |
| grid trading | 13 | portfolio | 182 | collateral | 9 |
| grid bot | 3 | arbitrage | 380 | venus | 22 |
| pancakeswap | 69 | staking | 110 | lista | **1** |
| aave | 3 | x402 | 41 | b402 | **1** |
| trading | **129,023** | | | | |

The four mandated categories, read at their most generous single term each, are 47 plus 20 plus 430 plus
21 = **518 agents, 0.17% of the 303,461 indexed**. Reading `yield` instead of `apy` puts it at 378, 0.12%.
Even folding in `liquidation`, `staking` and `portfolio` keeps the union under 1,300, so under 0.5%. Set
against that, `trading` matches 129,023 agents, 42% of the index. 215 of my 600 are one duplicated
trading name.

These numbers came out of a degraded API, so the failures are recorded with them. `search=rebalance`
and `search=arbitrage` returned `DATABASE_ERROR` on the first attempts and a number only on retry,
which is why `tools/r11-catcount.mjs` retries four times and writes the error string when it gives up.
Every `min_feedbacks`, `is_active`, `has_a2a`, `is_endpoint_verified` and `owner_publisher_tier` filter
query returned `{"success":false,"error":{"code":"DATABASE_ERROR","message":"Database error occurred"}}`
at exactly 10 s, which is a server-side query timeout rather than a rate limit, so those population
figures are absent. See Unverified below.

## The feedback side, measured on chain over every id

`node tools/r11-fbsweep.mjs` calls `getClients(agentId)` for **all 334,935 ids**, then
`getLastIndex(agentId, client)` for every resulting pair. `node tools/r11-fbsummary.mjs` then runs
`getSummary` over the agents that have feedback, which excludes revoked entries, so the two together
separate "written" from "live". No indexer and no `eth_getLogs` in either path.

| Claim | Value | How verified |
| --- | --- | --- |
| Ids swept | 334,935, every id from 0 to 334,934 | `raw/r11-feedback-sweep-2026-09-05.json`, `idsScanned` |
| Call errors during the sweep | **0** | same file, `errorCount: 0` |
| Agents with at least one feedback | **4,406** = 1.316% of 334,935 | same file, `agentsWithFeedback` |
| Total feedbacks ever written | **29,712** | sum of `getLastIndex` over 8,329 (agent, client) pairs |
| Total feedbacks not revoked | **29,712** | `getSummary` over all 4,406, `raw/r11-feedback-summary-2026-09-05.json` |
| Revocations | **0** | the two totals are equal, `feedbacksRevoked: 0` |
| Distinct client addresses in the whole graph | **111** | `distinctClients` |
| 8004scan's count of the same thing | 11,780 | `stats/global`, `chain_stats[56].total_feedbacks` |
| Share of on-chain feedback the indexer holds | **39.6%** | 11,780 / 29,712 |

Independent check with a different tool on one agent, to prove the encoder rather than trust it:

```
cast call 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63 "getClients(uint256)(address[])" 2554
  -> 29 addresses
cast call 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63 \
  "getSummary(uint256,address[],string,string)(uint64,int128,uint8)" 2554 "$CL" "" ""
  -> 234, 75, 0
```
The sweep records agent 2554 as 29 clients and 234 feedbacks. It matches.

### The distribution is a handful of writers hitting a handful of agents

| Metric | Value |
| --- | --- |
| Agents holding 50% of all feedbacks | 95 |
| Agents holding 80% | 255 |
| Agents holding 90% | 1,435 |
| Agents holding 99% | 4,109 |
| Share held by the top 100 agents | 52.35% |
| Agents with exactly one feedback | 3,708 of 4,406, together 12.48% of all feedbacks |
| Agents with feedback whose id is under 50,000 | 4,086 of 4,406 |
| Agents with feedback whose id is 300,000 or above | **9** of 4,406 |
| Joint busiest agents | id 2554 with 234 feedbacks from 29 clients, id 30867 with 234 from 17 |
| Busiest client `0xa06f907f7ea437ebe60e3d452831ec69e5be43a4` | left feedback on **1,800** agents |
| Next two clients | 1,137 agents and 924 agents |
| Top 3 clients | 3,861 of the 8,329 (agent, client) pairs |

Per-agent histogram, whole chain: 3,708 agents on 1 feedback, 277 on 2, 35 on 3, 29 on 4, then a long
thin tail to 234. Full histogram in `raw/r11-feedback-sweep-2026-09-05.json` under `perAgentHistogram`.

### What the feedback is actually about

A bounded slice of 950 of 8004scan's 11,780 BSC feedback rows, 11 pages lost to `DATABASE_ERROR`, at
`raw/r11-feedbacks-8004scan-slice-2026-09-05.json`. The `tag1` distribution is the finding:

| tag1 | Rows | tag1 | Rows |
| --- | --- | --- | --- |
| `personality` | 146 | `uptime` | 49 |
| `knowledge` | 143 | `q402-weekly` | 23 |
| `relationship` | 139 | `responseTime` | 19 |
| `style` | 139 | `starred` | 8 |
| `stance` | 139 | `agripinaa-verified` | 6 |
| `timeline` | 138 | `security` | 1 |

844 of the 950 rows score a persona trait. 68 score anything operational (`uptime` plus `responseTime`),
and **not one row in the slice scores a financial outcome**: no realised yield, no slippage, no drawdown,
no liquidation avoided. 27 distinct clients wrote all 950 rows, the busiest four writing 66 each, which is
consistent with the 111-address total from the on-chain sweep. Block range 85,681,249 to 119,137,534.
Revoked rows in the slice: 0, matching the on-chain revocation count of 0.

A 5,000-id sample drawn from the same splitmix64 stream lands on the full sweep, which is a consistency
check rather than an independent one since the 5,000 are a subset: 75 of 5,000 agents with feedback =
1.50%, Wilson 95% 1.20 to 1.88. The true figure 1.316% sits inside it. Raw at
`raw/r11-feedback-onchain-2026-09-05.json`.

## The four claims from the previous pass

### 1. "2 of 400 publish a callable endpoint". Corrected upward, magnitude confirmed

Measured: **12 of 600 = 2.00%** (95% 1.15 to 3.46) reach T2 machine-callable. **0 of 600** reach T3
payable. The claimed 0.50% sits below my T2 interval and above my T3 point estimate, so the honest
reading is that the previous pass was measuring something between the two tiers without saying which.
The finding that survives is the shape: a couple of percent at the most generous bar, zero at the bar
that matters for a marketplace. Every T2 agent is one product on one host under 12 distinct owner
addresses, so the count is one operator's software, not twelve independent services.

### 2. "166 of 400 share the name Ave.ai Trading Agent". Confirmed on its own data, now falling

Re-ran the count on the previous pass's own capture. `sample-400-tokenuris-2026-08-27.json` contains
exactly **166 of 400** agents whose decoded `data:` URI has name `Ave.ai Trading Agent`, 41.5%. The claim
reproduces byte for byte.

It has since fallen. The fall is real rather than sampling noise:

| Draw | Date | n | Ave.ai | Share |
| --- | --- | --- | --- | --- |
| previous pass | 2026-08-27 | 400 | 166 | 41.5% |
| this session, earlier 544-id draw | 2026-09-05 | 544 | 186 | 34.2% |
| R11 uniform draw | 2026-09-05 | 600 | 215 | 35.83% (95% 32.10 to 39.75) |

41.5% falls outside the R11 interval. The decile table above shows why: the cluster is dense between the
10th and 50th percentile of the current id range and thin in the top 20%. The id range grew from about
287,000 to 334,935 between the two draws, so the newer ids dilute it. The claim was right on its date and
is stale now. Quote 35.8% with its interval, not 41.5%.

### 3. "0 of 400 declare a payout wallet". Right conclusion, wrong mechanism

`getAgentWallet` returns a **non-zero** address for **600 of 600**. That address equals `ownerOf` for
**600 of 600**. Anyone who read this as "getAgentWallet returns the zero address" read it wrong. Any
marketplace filter built on `agentWallet != 0` will pass the entire registry.

The conclusion still holds under the only reading that means anything: **0 of 600 declare a payout wallet
distinct from the NFT holder**, which is the only case where a wallet was deliberately set rather than
auto-written at mint. The mechanism is in the source, quoted in Interfaces below.

### 4. "the agent at id 1 has answered 404 since 2026-05-20". Wrong on every clause but the date

Id 1 is `ClawNews`, owner `0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029`. What is actually true:

| Sub-claim | Verdict | Evidence |
| --- | --- | --- |
| there is a 404 attached to id 1 | partly | 8004scan field `endpoint_verification_error` = `"clawnews.io: HTTP 404"` |
| dated 2026-05-20 | yes | `endpoint_last_checked_at` = `2026-05-20T20:22:51.613049Z`, `health_checked_at` = `2026-05-20T20:22:57.099070Z` |
| "since" 2026-05-20, meaning continuously | **no** | that is a **single** check. 8004scan has not re-checked in 108 days. There is no series |
| the endpoint answers 404 today | **no** | live on 2026-09-05 `https://clawnews.io` fails at TLS, not HTTP. `curl` returns `(60) SSL: no alternative certificate subject name matches target host name 'clawnews.io'`, node returns `ERR_TLS_CERT_ALTNAME_INVALID` |
| the host is dead | **no** | DNS resolves `clawnews.io` to `69.46.46.51`, CNAME `kjsv757h.up.railway.app`. `http://clawnews.io` returns `301` to `https://clawnews.io/`. `openssl s_client` shows the served certificate is `CN = *.up.railway.app` |
| the underlying app 404s | yes, separately | `https://kjsv757h.up.railway.app/` returns HTTP 404 |
| the 404 was even about the endpoint | **no** | 8004scan reports the `web` service as `"status":"skipped"`, `"message":"Service type not health-checked: web"`. The 404 came from the ERC-8004 endpoint-domain verification file, not from calling the agent |
| 8004scan calls the agent unhealthy | **no** | `health_score: 100.0`, `overall_status: "healthy"`, on the strength of `owner_wallet` holding 8.6614 BNB with 1 transaction |

Three separate reasons not to trust a health field you did not compute. The failure is a certificate
bound to the wrong name. The 404 is a 108 day old check of a different thing. The indexer scores the
agent 100 out of 100 while none of its endpoints verify.

## Unverified or open

| Claim | What blocked it |
| --- | --- |
| A full-history `Registered` log count as an independent total | No keyless BSC RPC serves it. `bsc-rpc.publicnode.com` caps `eth_getLogs` at 5,000 blocks and answers anything older than roughly the last hour with `Archive requests require a personal token`. `bsc-dataseed*.binance.org` returns `-32005 limit exceeded`, `bsc.drpc.org` refuses ranges over 10,000 on the free plan, `1rpc.io/bnb` caps at 50 blocks, `bsc.meowrpc.com` does not implement the method, `rpc.48.club` and `bsc.rpc.blxrbdn.com` cap at 5,000, `bscrpc.com` returns `API key disabled`. Probed 2026-09-05, all in one pass. The storage-slot read plus the 5,000-block contiguity proof stands in for it |
| The exact deployment block of the proxy | Taken from 8004scan's `created_block_number` for token 0 (79,094,807) rather than from a historical `eth_getCode` binary search, which needs archive state. The block timestamp itself was read on chain |
| Population count of `Ave.ai Trading Agent`, `Debot Trading Agent`, `Q402 Agent` | `search=` on those strings returns `DATABASE_ERROR` at 10 s. The sample share with its Wilson interval is the only figure offered |
| Population counts behind `is_endpoint_verified`, `has_a2a`, `has_mcp`, `has_oasf`, `x402_supported`, `is_active`, `is_registered`, `min_feedbacks`, `owner_publisher_tier` | Every one returned `{"success":false,"error":{"code":"DATABASE_ERROR","message":"Database error occurred"}}` at 10 s on 2026-09-05. `stats/global.chain_stats[56]` still yielded mcp 5,382, a2a 27,956, oasf 376 for BSC |
| A complete page-through of 8004scan's 11,780 BSC feedback rows | `/api/v1/feedbacks?chain_id=56` fails intermittently with the same `DATABASE_ERROR`. A working page of 50 rows takes 2 to 10 s, so a full pass is hours. A bounded slice was pulled instead. The on-chain sweep supersedes this for every count |
| Whether 217 `evoevo.ai` URLs are all HTML pages | 5 of 217 probed, all HTTP 200 `text/html` with a byte-identical body prefix. All 217 declare the service name `web`, which the ERC-8004 registration schema uses for a human web surface. Probing 217 paths on one host is not polite, so the remaining 212 are an inference from the pattern, labelled as one |
| Whether the other 45 Termix agents are also `UNBOUND` | 6 of 51 probed, 6 of 6 `UNBOUND` with `endpoint: null`. Same politeness limit |
| Whether any of the 30 unreadable registration documents hide a working endpoint | 14 have an empty tokenURI, so there is nothing to read. 3 are freeform text. 13 returned a body that is not JSON. None can be parsed without guessing |
| Feedback value semantics | `getSummary` returns `(count, summaryValue, summaryValueDecimals)` and for agent 2554 that is `(234, 75, 0)`. Whether 75 is a mean, a sum or a WAD-normalised mode is readable in the source but was not exercised against a second agent, so no scoring claim is made here |
| Whether any agent was ever burned, leaving a gap | No public burn function exists in the ABI and no sampled id reverted, but a historical burn cannot be ruled out without the log history above |

## Interfaces and constants

Everything a builder can paste. Nothing here is from memory.

### Addresses, BSC chain id 56

```
IdentityRegistry    0x8004A169FB4a3325136EB29fA0ceB6D2e539a432   proxy
  implementation    0x7274e874ca62410a93bd8bf61c69d8045e399c02   EIP-1967 slot read below
ReputationRegistry  0x8004BAa17C55a88189AE136b182e5fdA19dE9b63   proxy
```

```bash
# implementation behind the identity proxy
cast storage 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 \
  0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc \
  --rpc-url https://bsc-rpc.publicnode.com
# -> 0x0000000000000000000000007274e874ca62410a93bd8bf61c69d8045e399c02
```

### The agent count in one call

```bash
# ERC-7201 slot for IdentityRegistryStorage, whose first member is uint256 _lastId
cast index-erc7201 "erc8004.identity.registry"
# -> 0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00

cast storage 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 \
  0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00 \
  --rpc-url https://bsc-rpc.publicnode.com | xargs cast to-dec
# -> 334935   agents ever registered. Top live id is this minus 1.
```

The slot is correct because the source declares
`keccak256(abi.encode(uint256(keccak256("erc8004.identity.registry")) - 1)) & ~bytes32(uint256(0xff))`
and `cast index-erc7201` computes the same value.

### Selectors and event topics, all from `cast`

| Signature | Selector or topic0 |
| --- | --- |
| `tokenURI(uint256)` | `0xc87b56dd` |
| `ownerOf(uint256)` | `0x6352211e` |
| `getAgentWallet(uint256)` | `0x00339509` |
| `getMetadata(uint256,string)` | `0xcb4799f2` |
| `getClients(uint256)` | `0x42dd519c` |
| `getLastIndex(uint256,address)` | `0xf2d81759` |
| `getSummary(uint256,address[],string,string)` | `0x81bbba58` |
| `Registered(uint256,string,address)` | `0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a` |
| `Transfer(address,address,uint256)` | `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef` |
| `NewFeedback(uint256,address,uint64,int128,uint8,string,string,string,string,string,bytes32)` | `0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc` |
| `ERC721NonexistentToken(uint256)` | `0x7e273289` (error selector seen on `ownerOf` past the top id) |

### Why `getAgentWallet` is never zero, quoted from the deployed source

```solidity
function register(string memory agentURI) external returns (uint256 agentId) {
    IdentityRegistryStorage storage $ = _getIdentityRegistryStorage();
    agentId = $._lastId++;
    $._metadata[agentId]["agentWallet"] = abi.encodePacked(msg.sender);   // <- the default
    _safeMint(msg.sender, agentId);
    _setTokenURI(agentId, agentURI);
    emit Registered(agentId, agentURI, msg.sender);
    emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encodePacked(msg.sender));
}

// cleared on transfer, so a zero wallet means the agent changed hands
function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
    address from = _ownerOf(tokenId);
    if (from != address(0) && to != address(0)) {
        $._metadata[tokenId]["agentWallet"] = "";
        emit MetadataSet(tokenId, "agentWallet", "agentWallet", "");
    }
    return super._update(to, tokenId, auth);
}
```

Changing it needs an EIP-712 signature from the incoming wallet, within 5 minutes:

```
AgentWalletSet(uint256 agentId,address newWallet,address owner,uint256 deadline)
EIP712 domain name "ERC8004IdentityRegistry", version "1"
MAX_DEADLINE_DELAY = 5 minutes. address(0) is rejected
ERC-1271 fallback accepts 0x1626ba7e from a contract wallet
```

The marketplace filter that means something is therefore
`getAgentWallet(id) != 0 && getAgentWallet(id) != ownerOf(id)`, which currently matches nothing.

### Reading feedback without an indexer

```solidity
// giveFeedback: currentIndex = ++$._lastIndex[agentId][msg.sender], 1-indexed
// and pushes msg.sender into $._clients[agentId] the first time only
getClients(uint256 agentId) returns (address[])
getLastIndex(uint256 agentId, address client) returns (uint64)   // feedbacks ever, revoked included
getSummary(uint256 agentId, address[] clients, string tag1, string tag2)
  returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)  // revoked excluded
```

Total feedbacks for an agent is the sum of `getLastIndex` over `getClients`. `getSummary` **reverts with
`clientAddresses required` on an empty array**, so pass the client list, never `[]`. Empty `tag1` and
`tag2` mean no filter. Hand-rolled calldata for `getSummary`, head is four words:

```
0x81bbba58
  word0  agentId
  word1  0x80                        offset to clients
  word2  0x80 + 32 + n*32            offset to tag1
  word3  that + 32                   offset to tag2
  then   n, then n left-padded addresses
  then   0   (tag1 length, empty)
  then   0   (tag2 length, empty)
```

Self-feedback is impossible, which matters for a marketplace that wants to trust a score:
`giveFeedback` calls `IIdentityRegistry(_identityRegistry).isAuthorizedOrOwner(msg.sender, agentId)` and
reverts with `Self-feedback not allowed`. It also bounds `valueDecimals <= 18`.

### The registration JSON as it actually appears, not as the spec draws it

The spec key is `services`. Observed across 570 readable documents:

| Key | Documents | Note |
| --- | --- | --- |
| `name`, `description`, `image` | 289 of the 290 fetched off-chain | |
| `type` | 283 | usually `https://eips.ethereum.org/EIPS/eip-8004#registration-v1` |
| `services` | 283 off-chain, 18 of 253 in `data:` URIs | the array a marketplace needs |
| `x402Support` | 280 | plus `x402support` 3 times, different casing |
| `registrations` | 271 | frequently `[]`, so the on-chain back-reference is missing |
| `active` | 271 | |
| `supportedTrust` | 64 off-chain plus 229 in `data:` URIs | plus `supportedTrusts` twice |
| `attributes` | 57 | ERC-721 trait pairs, sometimes carrying `Network` and `Chain ID` |
| `termix` | 51 | vendor block with `namespace`, `roles`, `profile.category` |
| `tags`, `owner`, `avatarUrl` | 51 each | same vendor block |

A service entry:

```json
{ "name": "A2A",
  "endpoint": "https://agent.example/.well-known/agent-card.json",
  "version": "0.3.0" }
{ "name": "OASF", "endpoint": "https://github.com/agntcy/oasf/", "version": "0.8.0",
  "skills": ["natural_language_processing/information_retrieval_synthesis/search"],
  "domains": ["technology/blockchain"] }
{ "name": "agentWallet", "endpoint": "eip155:56:0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029" }
{ "name": "email", "endpoint": "<a plain mailbox string, redacted here>" }
```

Service names seen in the sample and how many agents declare each: `web` 221, `A2A` 52,
`Termix Platform` 51, `q402` 12, `MCP` 12, `chat` 1. **316 of 600 declare no service at all.**
`agentWallet` also appears as a service entry with a CAIP-10 string, which is a second, unrelated
channel from the on-chain `agentWallet` metadata key.

### RPC facts a builder will hit within the hour

Probed 2026-09-05, one pass, recorded because each one cost a wrong assumption.

| Endpoint | JSON-RPC batching | `eth_getLogs` | Note |
| --- | --- | --- | --- |
| `https://bsc-rpc.publicnode.com` | yes, 200 calls in 0.9 s warm | 5,000 block cap, recent blocks only | returns **HTTP 429 with a complete, correct body** when throttling. Treat a well-formed array as success or you throw away good data and retry for nothing |
| `https://bsc.rpc.blxrbdn.com` | yes, 200 calls in 0.27 s | 5,000 block cap | fastest batcher found, no key |
| `https://bsc-dataseed*.binance.org`, `*.defibit.io`, `*.ninicoin.io` | **no**, a 200-call batch returns **one** result | `-32005 limit exceeded` | silently truncates a batch, which looks like data loss rather than an error |
| `https://bsc.drpc.org` | partial | ranges over 10,000 refused on the free plan | public rate limit trips fast |
| `https://1rpc.io/bnb` | untested | 50 block cap | |
| `https://bsc.meowrpc.com` | untested | method not supported | |
| `https://api.zan.top/bsc-mainnet` | yes | `cu limit exceeded` | |
| `https://bscrpc.com` | untested | `API key disabled` | |

Anything older than roughly the last hour is an archive request on every keyless endpoint tried, so a
full-history log scan needs a paid provider. The whole-chain feedback sweep runs on `eth_call` only,
which is why it works.

### 8004scan API, what worked and what did not

Base `https://api.8004scan.io/api/v1`, no key needed for any of the below.

| Path | Works | Note |
| --- | --- | --- |
| `GET /stats/global` | yes | `chain_stats[]` carries per-chain `total_agents`, `total_feedbacks`, `mcp_agents`, `a2a_agents`, `oasf_agents`, `average_feedback_score` |
| `GET /agents?chain_id=56&limit=1` | yes | `total` is the indexed agent count. `limit` max 100 |
| `GET /agents/56/{token_id}` | yes, occasionally 500 then fine on retry | carries `created_block_number`, `created_tx_hash`, `health_status`, `endpoint_verification_error`, `endpoint_last_checked_at`, `total_feedbacks`, `quality_score` |
| `GET /status/indexers/direct` | yes | per-chain `canonical_checkpoint_block`, `canonical_checkpoint_age_seconds`, `latest_event_block`, `pending_events` |
| `GET /status/freshness` | yes | rolls the above into `status: down` |
| `GET /feedbacks?chain_id=56&limit=50` | flaky | `limit=100` failed outright, `limit=50` loses about 1 page in 10 to `DATABASE_ERROR` |
| `GET /agents?...&search=<term>` | mostly | high-frequency terms (`rebalance`, `arbitrage`) intermittently `DATABASE_ERROR` at 10 s |
| `GET /agents?...&min_feedbacks=N`, `&has_a2a=`, `&is_active=`, `&is_endpoint_verified=`, `&owner_publisher_tier=` | **no** | all `DATABASE_ERROR` at 10 s on 2026-09-05 |
| `POST /agents/{chain_id}/{token_id}/health-check` | POST only | a GET is routed as `token_id="health-check"` and returns a 422 `int_parsing` error, which reads like a bug but is just the wrong verb |

The health data on an agent detail is a **cached single check**, not a monitor. Token 1 was last checked
2026-05-20, token 0 on 2026-03-16. `agent_health` in `/status/freshness` warns only after 86,400 s and
still reports `ok` with 81,115 rows, so a 108 day old check is inside its tolerance.

## Design implications for the marketplace

1. **Publish the count from the registry counter, not from an indexer.** One `eth_getStorageAt` gives
   334,935 with a block number attached. 8004scan gives 303,461 from a 32 hour old checkpoint. Its
   own two endpoints disagree by 820. A judge who checks the number will check it on chain. Show the
   block height and the timestamp next to it. Show the indexer's number as a second row with its
   lag, which turns a discrepancy into a feature.
2. **The scarce thing is a callable agent, so make callability the product.** 233 of 600 declare a
   concrete endpoint, 230 answer, 218 of those answer with a web page for humans, 12 answer as an API
   and 0 answer with a payment challenge. A marketplace that lists 334,935 agents is a directory. One
   that ranks the 2% you can actually call and says why the rest fail is the only listing that
   carries information.
3. **Compute liveness yourself and stamp it.** The registry has no liveness field. The one indexer
   that has one scores ClawNews 100 out of 100 while its certificate does not match its own hostname and
   its verification error has sat unrefreshed for 108 days. Store the probe result, the timestamp, the
   HTTP status, the TLS verdict and the DNS verdict per endpoint. Show the age of the check, which
   is the field the one indexer read here does not surface.
4. **Separate the four failure modes and never merge them.** DNS does not resolve (2 of 600), TLS name
   mismatch (clawnews.io), HTTP 404 from a live host (bitagent.io, twice) and template placeholder never
   substituted (51 of 600). Each needs a different fix from the operator. Lumping them into "offline"
   destroys the only actionable part of the finding.
5. **`agentWallet != 0` is not a filter, it is the whole registry.** `register` writes `msg.sender` into
   the wallet slot at mint, so 600 of 600 pass. The filter with signal is
   `getAgentWallet(id) != ownerOf(id)`, which currently matches 0 of 600. Until someone sets one, price
   and payment destination have to come from the endpoint's 402 challenge, not from the registry.
6. **Resolve vendor endpoint templates and say so.** The 51 Termix agents publish
   `{agentId}` and an empty `registrations` array, so no conforming client can call them. Substituting
   the token id works and returns a card. Every card sampled says `UNBOUND` with a null endpoint.
   A marketplace that resolves the template turns 51 dead rows into 51 honest "registered but not bound"
   rows, which is a different and more useful statement.
7. **Do not build the four categories from registry keyword search.** The whole index yields 47
   rebalancing, 20 grid, 430 apy, 21 health factor. Even at the most generous reading that is 518 agents,
   0.17%. The sample of 600 contains one. The four categories have to be **populated** with agents
   the marketplace itself runs or onboards. The census is the argument for why, because on the
   evidence read here the existing supply in those four categories is a few hundred rows out of
   303,461. Sizing the gap honestly beats pretending the supply exists.
8. **The reputation layer scores personas, so do not resell it as performance.** 4,406 agents of 334,935
   have any feedback, 111 addresses wrote all 29,712 rows, the top 100 agents hold 52% of them and 844
   of 950 sampled rows tag `personality`, `knowledge`, `relationship`, `style`, `stance` or `timeline`.
   Not one row scores yield, slippage or drawdown. A rubric line about proven agent advantage cannot be
   satisfied from this data, so the marketplace has to generate its own outcome records. Whether
   anyone else already does is not something this census can settle, so claim the measurement, not
   the primacy.
9. **Show the indexer shortfall as a first-class number.** 8004scan holds 39.6% of the on-chain feedback
   and 90.6% of the on-chain agents. Both are checkable in one command each. Being the source that
   reconciles them costs two commands. No source found during this pass publishes both side by side,
   which is an observation about what was searched rather than a claim about every source.
10. **Deduplicate by tokenURI bytes, not by name.** 215 of 600 share one byte-identical `data:` URI and
    215 distinct owner addresses, so owner-based dedup fails and name-based dedup catches only the exact
    string. Hashing the tokenURI collapses the block in one pass. 322 distinct names over 600 agents
    with 312 singletons is the real diversity number to report.

## Reproduce every number

From `three/research/`. Node 22, cast 1.7.1, python 3.11, jq. No API key anywhere.

```bash
# ---- population count, boundaries and the gapless proof
cast chain-id --rpc-url https://bsc-rpc.publicnode.com
cast block-number --rpc-url https://bsc-rpc.publicnode.com
cast block <N> --rpc-url https://bsc-rpc.publicnode.com --json | jq -r '{number,timestamp,hash}'
cast index-erc7201 "erc8004.identity.registry"
cast storage 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 \
  0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00 \
  --rpc-url https://bsc-rpc.publicnode.com | xargs cast to-dec        # 334935
cast call 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 "ownerOf(uint256)(address)" 334934 \
  --rpc-url https://bsc-rpc.publicnode.com                            # succeeds
cast call 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 "ownerOf(uint256)(address)" 334935 \
  --rpc-url https://bsc-rpc.publicnode.com                            # reverts 0x7e273289
node tools/r11-census.mjs        # -> raw/r11-census-2026-09-05.json

# ---- the 600-agent sample, end to end
node tools/r11-sample.mjs        # -> raw/r11-sample-ids-…json, raw/r11-sample-onchain-…json
node tools/r11-offchain.mjs      # -> raw/r11-sample-offchain-…json
node tools/r11-merge.mjs         # -> raw/r11-agents-merged-…json, raw/r11-endpoints-…json
node tools/r11-probe.mjs         # -> raw/r11-probe-…json          (DNS, robots, TLS, HTTP, 402)
node tools/r11-analyze.mjs       # -> raw/r11-analysis-…json       (names, funnel, categories)

# ---- feedback, whole chain
node tools/r11-fbsweep.mjs       # -> raw/r11-feedback-sweep-…json    resumable, ~4 min
node tools/r11-fbsummary.mjs     # -> raw/r11-feedback-summary-…json  revoked-adjusted
node tools/r11-feedback.mjs      # -> raw/r11-feedback-onchain-…json  600 and 5000 id samples

# ---- the second source
curl -s 'https://api.8004scan.io/api/v1/stats/global' | \
  jq '{total_agents,total_feedbacks}, (.chain_stats[]|select(.chain_id==56))'
curl -s 'https://api.8004scan.io/api/v1/agents?chain_id=56&limit=1' | jq '.total'
curl -s 'https://api.8004scan.io/api/v1/status/indexers/direct' | \
  jq '[..|objects|select(.chain_id?==56)][0] |
      {status,message,canonical_checkpoint_block,canonical_checkpoint_age_seconds,latest_event_block}'
curl -s 'https://api.8004scan.io/api/v1/agents/56/1' | \
  jq '{name,created_block_number,health_status,endpoint_verification_error,endpoint_last_checked_at}'
node tools/r11-catcount.mjs      # -> raw/r11-8004scan-search-counts-…json

# ---- the id-1 claim, three ways
curl -sS -o /dev/null -w 'code=%{http_code}\n' --max-time 15 https://clawnews.io       # SSL error 60
curl -sS -o /dev/null -w 'code=%{http_code} redirect=%{redirect_url}\n' http://clawnews.io  # 301
getent hosts clawnews.io
openssl s_client -connect clawnews.io:443 -servername clawnews.io </dev/null 2>&1 | head -8

# ---- the previous pass's own numbers, re-derived from its own capture
node --input-type=module -e '
import fs from "node:fs";
const d=JSON.parse(fs.readFileSync("sample-400-tokenuris-2026-08-27.json","utf8"));
const nm=u=>{try{const c=u.indexOf(",");const t=/base64/.test(u.slice(5,c))
  ?Buffer.from(u.slice(c+1),"base64").toString("utf8"):decodeURIComponent(u.slice(c+1));
  return JSON.parse(t).name}catch{return null}};
const v=Object.values(d).filter(u=>typeof u==="string"&&u.startsWith("data:"));
console.log(Object.keys(d).length, v.filter(u=>nm(u)==="Ave.ai Trading Agent").length);'   # 400 166
```

## Files this pass produced

| Path | What |
| --- | --- |
| `tools/r11-sample.mjs` | splitmix64 sampler plus the on-chain read pass. Exports `drawIds`, `SEED`, `MAXID` |
| `tools/r11-offchain.mjs` | one HTTPS fetch per non-`data:` tokenURI |
| `tools/r11-merge.mjs` | normalises on-chain plus off-chain into one record per agent, emits the endpoint list |
| `tools/r11-probe.mjs` | DNS, robots.txt, `.well-known/agent-registration.json`, endpoint probe, 402 detection |
| `tools/r11-analyze.mjs` | names, endpoint funnel, wallets, x402, categories, Wilson intervals |
| `tools/r11-census.mjs` | count, boundary probes, `Registered` and mint `Transfer` window, contiguity |
| `tools/r11-fbsweep.mjs` | `getClients` over all 334,935 ids, resumable checkpoint |
| `tools/r11-fbsummary.mjs` | `getSummary` over the 4,406, revoked-adjusted total |
| `tools/r11-feedback.mjs` | 600 and 5,000 id feedback samples from the same seed stream |
| `tools/r11-catcount.mjs` | population keyword counts with retries and recorded failures |
| `tools/r11-fb8004.mjs` | 8004scan feedback pager, tolerant of failed pages |
| `raw/r11-sample-ids-2026-09-05.json` | the 600 ids in draw order and sorted, with seed and range |
| `raw/r11-sample-onchain-2026-09-05.json` | tokenURI, ownerOf, getAgentWallet for 602 ids |
| `raw/r11-sample-offchain-2026-09-05.json` | 306 fetched registration documents with status and headers |
| `raw/r11-agents-merged-2026-09-05.json` | the normalised records |
| `raw/r11-endpoints-2026-09-05.json` | 229 unique endpoint URLs with host and agent counts |
| `raw/r11-probe-2026-09-05.json` | per-host DNS, robots, well-known plus every probe response head |
| `raw/r11-analysis-2026-09-05.json` | every share in this document with its Wilson interval |
| `raw/r11-census-2026-09-05.json` | head block, `_lastId` before and after, boundaries, log window |
| `raw/r11-feedback-sweep-2026-09-05.json` | whole-chain feedback census, histogram, top 100, top clients |
| `raw/r11-feedback-summary-2026-09-05.json` | `getSummary` per agent, revocation count |
| `raw/r11-feedback-onchain-2026-09-05.json` | the 600 and 5,000 id feedback samples |
| `raw/r11-8004scan-search-counts-2026-09-05.json` | population keyword counts |
| `raw/r11-8004scan-filter-counts-2026-09-05.json` | the filter queries that failed, with their error |
| `raw/r11-feedbacks-8004scan-slice-2026-09-05.json` | 950 feedback rows, tag distribution, lost offsets |
| `raw/r11-termix-card-probe-2026-09-05.json` | 6 Termix A2A cards, all `UNBOUND` |
| `raw/8004scan-stats-global-R11-2026-09-05.json` | live global and per-chain stats |
| `raw/8004scan-indexers-direct-R11-2026-09-05.json`, `…-R11b-…` | indexer checkpoints, two captures |
| `raw/8004scan-status-freshness-R11-2026-09-05.json` | freshness rollup |
| `raw/8004scan-agent-56-0-R11-2026-09-05.json`, `…-56-1-…` | full detail for ids 0 and 1 |
| `raw/8004scan-agents-bsc-total-R11.json` | the `total` field, 303,461 |
| `raw/r11-fbsweep-checkpoint.json` | resume state plus the raw client lists per agent |

## Sources

On chain, BSC chain id 56, all reads against `https://bsc-rpc.publicnode.com` unless stated:
- IdentityRegistry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, implementation
  `0x7274e874ca62410a93bd8bf61c69d8045e399c02`
- ReputationRegistry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- Batch reads against `https://bsc.rpc.blxrbdn.com`

Local captures read before going live:
- `raw/erc8004-src-IdentityRegistryUpgradeable-2026-09-05.sol`, the storage layout, the `_lastId++`
  allocation, the `agentWallet` default and the transfer clear
- `raw/erc8004-src-ReputationRegistryUpgradeable-2026-09-05.sol`, `_lastIndex`, `_clients`,
  `getSummary` and the self-feedback guard
- `raw/erc8004-abi-IdentityRegistry-2026-09-05.json`, `raw/erc8004-abi-ReputationRegistry-2026-09-05.json`
- `raw/eip-8004-2026-08-27.txt`, the registration JSON shape and the endpoint-domain verification file
- `raw/8004scan-openapi-2026-09-05.json`, version 0.4.363, every parameter and HTTP verb used above
- `sample-400-tokenuris-2026-08-27.json`, the previous pass's own sample, re-counted
- `raw/bsc-tokenuri-sample-2026-09-05.json`, the earlier 544-id draw from this session
- `census-bsc-2026-08-27.tsv`, the earlier keyword counts, superseded by
  `raw/r11-8004scan-search-counts-2026-09-05.json`

Live HTTP:
- `https://api.8004scan.io/api/v1/` paths listed in the table above
- `https://q402.quackai.ai/api/relay/info`, `https://q402.quackai.ai/api/mcp/info`
- `https://platform-backend.prod.termix.live/api/v1/a2a/agents/{tokenId}/card`
- `https://evoevo.ai/robots.txt`, `https://evoevo.ai/.well-known/agent-registration.json`
- `https://clawnews.io`, `http://clawnews.io`, `https://kjsv757h.up.railway.app/`
- `https://www.app.bitagent.io/aip/erc8004:daydream/.well-known/agent-card.json`
- `https://ensoul.ac/soul/doge`, `https://github.com/agntcy/oasf/`

Every endpoint probe was one request with an 8 s timeout, at most one retry and only on a network
failure, `robots.txt` fetched first and its `Disallow` rules honoured, at most 5 distinct paths per host
spaced 1.5 s apart plus a user agent that says what the request is for.

