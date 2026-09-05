# R14: rival and adjacent product scan

Read date 2026-09-05. Build closes 2026-09-09 UTC+0. Every number below either
carries the command that produced it or is labelled unverified.

## Headline

The field is crowded and further along than the star counts suggest. One GitHub
query returns 206 repositories created since 2026-07-15 that describe a BNB agent
marketplace, 59 of them publish a URL, 53 of those answer HTTP 200 and 39 serve a
real page. At least eight independent rivals have already converged on the same
pitch we would naturally reach for, "we call the agent before we list it", so
probing is table stakes, not a differentiator. The gap nobody has closed is
coverage plus freshness at the same time: the strongest rival by build volume
shows two of four mandated categories as empty and the sponsor data source every
rival leans on, 8004scan, has had its BSC mainnet indexer reporting `status: down`
with a 32-hour-old checkpoint for the whole time I was measuring.

## Verified facts

| Claim | Value | How verified |
| --- | --- | --- |
| Size of the public rival field | 206 repos created since 2026-07-15 match `agent marketplace bnb in:name,description,readme` | `gh api -X GET search/repositories -f q='agent marketplace bnb in:name,description,readme created:>2026-07-15'`, `.total_count` = 206 |
| Live rival deployments | of 59 distinct non-unrelated URLs published in those repos, 53 return HTTP 200 and 39 return more than 8 KB of page | `curl -s -o /dev/null -w "%{http_code}|%{size_download}" -m 15 -L` over every homepage field in `raw/r14-rival-field-206-2026-09-05.tsv` |
| No public submission roster exists | the hackathon page publishes no project list, no participant count and no shortlist; entry is via a Google Form | read `https://www.bnbchain.org/en/hackathons/smart-money-era` today, plus four web searches across DoraHacks, Devpost and Devfolio returned zero entry listings |
| The shortlist will be public later | timeline stages are "Build: NOW!", then "Shortlist" with the top 3 named publicly, then "Phase 2: [REDACTED]", then "Winner announced" | same page read |
| 8004scan's BSC mainnet indexer is down right now | `{"chain_key":"bsc_mainnet","status":"down","message":"100 direct events are pending parent data","direct_canonical_checkpoint_block":119687744,"direct_canonical_checkpoint_age_seconds":116288}` | `curl https://8004scan.io/api/v1/status/indexers` at 02:16:00Z and again at 02:27:25Z, both identical block |
| BSC chain head at the same moment | block 120,028,863 | `cast block-number --rpc-url https://bsc-rpc.publicnode.com` |
| So 8004scan's BSC checkpoint is about 341,000 blocks behind | 120,028,863 minus 119,687,744 = 341,119 blocks, about 32 hours at 0.75 s per block | arithmetic on the two reads above |
| 8004scan under-reports BSC agents by about 9% | 8004scan `chain_stats` for chain 56 gives `total_agents: 304281`; the chain has ids up to 334,939 | `curl https://8004scan.io/api/v1/stats/global` versus `cast call 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 "ownerOf(uint256)(address)"` |
| Live BSC agent count, read from chain | `ownerOf(334939)` returns `0xa61e089E3AB4C40810dBB7FD48C0b9E96755eef0`, `ownerOf(334940)` and `ownerOf(334941)` revert, `ownerOf(0)` returns `0x8CE2b1348740D27d6075F602Ad679a041407fdEc`, so ids are 0..334,939 and the count is 334,940 | six sequential `cast call` reads at block 120,028,863 |
| 8004scan under-reports BSC feedback by about 60% | 8004scan says `total_feedbacks: 11780` for chain 56; two independent indexers both say 29,712 | `8004scan.io/api/v1/stats/global` versus `trust8004.xyz/api/v1/chains` and the `erc-8004.quicknode.com/networks` table |
| 8004scan's own status endpoint says it is unhealthy overall | `{"status":"down","components":[{"name":"direct_checkpoints","status":"down"},{"name":"wallet_metrics","status":"down","stale_warning":127466,"total":190308}]}` | `curl https://8004scan.io/api/v1/status/freshness` |
| 8004scan has no marketplace vocabulary at all | across its 150-path OpenAPI, the strings `8183`, `hire`, `escrow`, `price`, `rebalanc`, `grid`, `yield`, `health factor`, `tvl`, `apy`, `pnl` occur zero times each | `grep -o -i` over `raw/8004scan-openapi-2026-09-05.json`, 150 paths counted with `jq '.paths|keys|length'` |
| 8004scan's taxonomy cannot produce the four mandated categories | its OASF domain list tops out at `technology/blockchain/cryptocurrency` 5,554 and `finance/markets/crypto` 4,940; `technology/blockchain/defi` has 463 agents chain-wide across all chains | `raw/8004scan-oasf-domains-2026-09-05.json` and `raw/8004scan-oasf-skills-2026-09-05.json` |
| A second full ERC-8004 index of BSC exists and is fresher | trust8004 reports BSC `totalAgents: 334938`, `metadataHealthy: 193233`, `totalFeedbacks: 29712`, `uniqueReviewers: 111`, `averageScore: 76.6`, `lastAgentId: 334937` | `curl https://trust8004.xyz/api/v1/chains` |
| BSC reputation is written by roughly 111 addresses | trust8004 `uniqueReviewers` for chain 56 is 111 against 29,712 feedbacks; Base is 3,392 reviewers against 128,928 | same read |
| trust8004 sells its index over x402 | unpaid `GET /api/v1/agents` returns HTTP 402 with `x402Version: 2` and eleven `accepts[]` entries, all `scheme: "exact"`, `amount: "10000"` (0.01 USDC), `payTo: 0x5ee75a1B1648C023e885E58bD3735Ae273f2cc52`, `extra.verifyingContract: 0x77777777dcc4d5a8b6e418fd04d8997ef11000ee`, `extra.name: "GatewayWalletBatched"` | `curl -H 'accept: application/json' 'https://trust8004.xyz/api/v1/agents?chainId=56&limit=1'`, saved to `raw/r14-trust8004-x402-challenge-2026-09-05.json` |
| BSC is not among trust8004's x402 payment networks | the eleven accepted networks are eip155:1, 8453, 43114, 42161, 10, 137, 130, 146, 480, 1329, 999. Chain 56 is absent | same capture |
| QuickNode runs a third ERC-8004 explorer and it does index BSC | its `/networks` table row reads "BNB Chain Mainnet 56 334940 29712 Coming Soon 120,028,766", so agents 334,940, feedback 29,712, validations not yet indexed | `curl https://erc-8004.quicknode.com/networks` then tag-stripped |
| BNB Agent Studio ships no marketplace, no discovery surface and no front-end contract | the Studio product page and the whole nine-page Studio developer kit contain no listing flow, no indexer, no storefront spec. The only discoverable pieces are the ERC-8004 identity plus the A2A card on port 9000 | read `https://www.bnbchain.org/en/bnb-agent-studio` and `https://docs.bnbchain.org/developer-kit/bnbchain-studio/` |
| The launch blog's four categories are NOT the rubric's four | the blog lists "Monitoring agents", "Grid trading agents", "Health factor agents", "Yield agents" and calls them "guidance, not a definitive list or judging criteria". The live rubric page replaced monitoring with rebalancing and made all four mandatory | `https://www.bnbchain.org/en/blog/build-the-era-build-the-official-bnb-agent-studio-marketplace` versus the hackathon page |
| Adoption is conditional in BNB Chain's own words | "The winning marketplace is **in line to** become the officially adopted community marketplace" and the TL;DR says the winner "has the chance to become" it. Adoption means "we back it as a standalone product with its own brand and team" | same blog |
| Prizes stack | "taking first place doesn't rule you out of partner track prizes, and one build can win both" | same blog |
| The strongest rival by build volume has two empty categories | its live landing shows Rebalancing "Unverified · empty", Grid trading "1 candidate", Yield optimisation "1 candidate", Health factor monitoring "Unverified · empty" and its README states "Current third-party activation coverage is empty" | read `https://bnb-agent-marketplace-ruby.vercel.app/` and `gh api repos/gilbertsahumada/bnb-agent-marketplace/readme` |
| That rival also operates the trust8004 index it consumes | its README names trust8004 as "the sole catalogue source", its footer says "Reputation data powered by trust8004.xyz" and `marketplace.trust8004.xyz` serves byte-identical content to its Vercel URL (114,384 bytes both) | two `curl -w '%{size_download}'` reads plus the README |
| That rival exposes a working MCP server | `initialize` returns `serverInfo: {"name":"bnb-agent-marketplace","version":"1.0.0"}` and `tools/list` returns five tools: `search_agents`, `get_passport`, `compare_agents`, `request_quote`, `get_job_status` | `curl -X POST https://marketplace.trust8004.xyz/api/mcp` with JSON-RPC `initialize` then `tools/list`, saved to `raw/r14-rival-marketplace-mcp-tools-2026-09-05.json` |
| At least one rival already writes ERC-8004 feedback to BSC mainnet | Kawal's README claims eleven records as of 2026-08-28 and links mainnet receipts including `0x5a4af5b6338411667abd4d9e7b32c214f7563ba130571023f358829809dee269` and `0xee044e1e6a4108a489a782dfb2021e57a1b7c353722be6ab81e25055313ce0ef` | README read; the tx hashes are their claim, I did not fetch the receipts |
| Rivals are hiring each other's agents | one marketplace funded BSC Testnet ERC-8183 Job 787 for 0.001 U against "Agent 2005 Canned Range Keeper", which is the first-party seller of a different rival marketplace | READMEs of `wyka0/bnb-agent-marketplace` and `Techkeyy/canned` |
| One rival has all four categories populated with third-party agents, live | its landing renders per-category answered-over-listed counts: Rebalancing 38 / 99, Grid Trading 6 / 57, Yield Optimisation 22 / 123, Health Factor 6 / 56, plus "68 agents on BSC will answer you right now" and "called 47s ago" | read `https://smeai-dev.vercel.app/` |
| A rival that single-sources 8004scan is visibly broken right now | its landing shows "Registry sync pending", the word "Offline" four times, "Registry data is temporarily unavailable" and three of four headline metrics render `--` | read `https://bnb-agent-marketplace-web.vercel.app/` while 8004scan's BSC indexer is down |
| Another rival's own refresh is failing | `{"refresh_status":{"status":"error","timestamp":"2026-09-05T01:43:12Z"},"registry_total":247146,"snapshot_age_seconds":45878}` | `curl https://docket.gudman.xyz/stats` |
| ERC-8004 is not the only 8004 registry on BSC | one rival's census covers "BRC8004 (full census) 26 agents" as a separate fork alongside the official `0x8004...` registry | README of `kaizenbnb/BNB-Agent-Marketplace` |

## The rival field, measured

### Ranked by what they actually shipped

Commit counts come from the `Link: ...rel="last"` header on
`gh api repos/{owner}/{repo}/commits?per_page=1`. Stars and push dates come from
`gh api repos/{owner}/{repo}`. Every live check is a `curl -L` today.

| Product and repo | Stars | Commits | Last push | Live | What it actually does | How far it got |
| --- | --- | --- | --- | --- | --- | --- |
| `gilbertsahumada/bnb-agent-marketplace` | 0 | 1429 | 2026-09-04 | `bnb-agent-marketplace-ruby.vercel.app` and `marketplace.trust8004.xyz`, both 200 | Four-category discovery, per-agent "Evidence Passport", compare page, `/validate` for builders, MCP server with five tools, ERC-8183 buyer journey where the browser signs all five writes, mainnet signed-quote path | Furthest along by a distance. Mainnet Grid seller Agent `303779`, testnet Jobs `514` and `551`, testnet fixture Agents `1815` and `1866`. Also owns the trust8004 index it reads. **Two of four categories empty and third-party activation coverage explicitly zero.** |
| `Ridwannurudeen/docket` | 0 | 506 | 2026-09-04 | `docket.gudman.xyz`, 200, JSON root not HTML | API-first observation service. Root advertises `/agents`, `/categories`, `/services`, `/hire`, `/escrow`, `/advantage.json` plus v2 and v3, `/lp-record`, `/pancake`, `/llms.txt`, `/openapi.json`, `/canary`. Four first-party services, one per category, with bounded self-funded sessions | Snapshot 57, `registry_total: 247146`, `with_feedback: 473`, `endpoints_responded: 57` of 60 attempted. Names its own BSC agent `311253` for rebalancing. `refresh_status: error` at time of read and its registry total is further behind the chain than 8004scan's |
| `qdeeworld/positioncrew` | 1 | 392 | 2026-09-05 | `positioncrew.dolepee.com`, 200 but a JS shell of 2,858 bytes | Job-first framing: buyer picks a task, sets hard limits, hires a provider, gets a machine-readable action or an explicit refusal listing the failed conditions. Claims all four categories at equal depth | Two GitHub Actions badges in the README, `quality.yml` and `production-smoke.yml`, so it has CI and a production smoke test. Could not read the rendered page without a browser |
| `marioggil/bnb-agent-marketplace` | 0 | 201 | 2026-09-05 | no homepage published | FastAPI plus PostgreSQL 16 plus HTMX, server rendered, no SPA. Mirrors the 8004scan index. EIP-191 `personal_sign` wallet-nonce auth with single-use 10-minute TTL. x402 over B402 in `$U` using `eip3009`, facilitator EOA settles on BSC. Own on-chain indexer for `$U` transfers, Alchemy for backfill and Chainstack for realtime | Self-described "pre-1.0 alpha", Dokploy-hosted, sync scheduled by an n8n workflow, no CI. The only rival I found with a real payment indexer rather than a payment claim |
| `Techkeyy/canned` | 0 | 92 | 2026-09-04 | `canned-lilac.vercel.app`, 200, renders | Hires its own agents for real work, grades the result against a human doing the same task, publishes the receipts including losses. Content-addressed evidence store, four deterministic benchmarks, fail-closed ERC-8183 buyer adapter on the official BNB SDK, separate shelves for endpoint-verified and merely discovered records | Four verified runs complete as of 2026-09-01, three qualifying with-agent versus without-agent pairs including a trading task, two wins and one loss. ERC-8183 control Job `675` reached `COMPLETED` with a validated deliverable. **Its TermiX Agent Advantage Report requirement is already met.** Its Agent `2005` was hired by a different rival |
| `iamdflame/mandate-bnb` | 0 | 52 | 2026-09-04 | `mandate-coral.vercel.app`, 200, 219 KB rendered | Leads with the honest funnel: "301,784 agents are registered on BNB Smart Chain. 473 carry any feedback at all, and 5 have an endpoint that answers." Then hires one against a bond it can lose | 3,402 indexed on the live page, measured 2026-09-04 11:20 UTC. The bond-slashing angle is the only economic-stake design I found in the field |
| `wyka0/bnb-agent-marketplace` | 0 | 50 | 2026-09-05 | `bnb-agent-marketplace-web.vercel.app`, 200 but degraded | Dedicated dashboard plus leaderboard per category, compare with explicit unavailable states, fail-closed activation, refuses to fabricate price, APY, TVL, volume, risk, performance, execution status, funded jobs, sessions or transactions | Real third-party ERC-8183 hire: Job `787` FUNDED on BSC Testnet for 0.001 U against Agent `2005`, provider equal to the registered owner. **Currently rendering `--` for three of four headline metrics because it single-sources 8004scan, whose BSC indexer is down** |
| `kaizenbnb/BNB-Agent-Marketplace` (KaizenScope) | 0 | 49 | 2026-08-27 | `bnb-agent-marketplace.vercel.app`, 200 | Every listing declares its allowed contracts, allowed function selectors and dedicated payment wallet before anyone connects. Buyer signs each work transaction from their own wallet. Four gates in fixed order with the payment gate last. Permit2 for the exact amount, never unlimited | Testnet 97 only, four buyer proofs at `/proof`. Published its own census: BRC8004 26 agents with 17 resolving cards and 0 with feedback, official registry 40 sampled with 35 resolving and 0 with feedback |
| `PugarHuda/kawal` | 0 | 47 | 2026-09-04 | `kawal-three.vercel.app`, 200 | Dials every endpoint itself in both protocols, MCP by handshake plus tool list and A2A by agent card plus the no-effect JSON-RPC call. Four stamps: Hireable, Reachable, Does not answer, Registered only. Reports who wrote an agent's feedback instead of the total. Publishes its own measurements back as ERC-8004 feedback. Four Altana sessions with allowlist, spend cap and expiry | 114 agents listed, of which 46 speak A2A only and are the ERC-8183 sellers. 67 endpoints called since 2026-08-26, 29 answered. Eleven feedback records claimed on BSC mainnet. Own MCP endpoint, A2A card and x402 challenge at 0.0001 BNB. Publishes 8004scan's stale 304,281 and 11,780 as its headline numbers |
| `Elioz404/SMEAI` | 0 | 44 | 2026-09-05 | `smeai-dev.vercel.app`, 200, 325 KB rendered | Calls every agent before listing it. Shows latency and price per agent. `/start` page laid out for a reviewer: every claim, where to check it, a working hire in one click, no wallet needed. 110-second screen recording of the deployed site | **The only rival I found with all four categories populated by third-party agents:** Rebalancing 38 / 99, Grid Trading 6 / 57, Yield Optimisation 22 / 123, Health Factor 6 / 56, 68 answering right now, last called 47 s before my read |
| `mcfarhat/agentcensus` | 0 | 22 | 2026-08-28 | none published | Indexes every BSC registration, probes each declared endpoint continuously, claims about 0.1% of registered agents are alive, then turns that into verified discovery plus one-click hiring plus ERC-8183 settlement | Claims live on **testnet and mainnet**. Unverified, no URL to check |
| `Ai-Rook/bnb-agent-marketplace` | 0 | 20 | 2026-08-24 | `ai-rook.com/bnb-marketplace/`, 200, 26 KB | Maps its build onto four requirements it attributes to BNB Chain: identity, capability, payment, accountability. ERC-721 owner plus EIP-712 `agentWallet` read from the registry, parsed `services[]` plus a category classifier, hire settling through B402 at `facilitator.b402.ai` and live proof-of-execution pulled from `/api/trust` and `/health` at render time with 15-minute snapshots | Surfaces its own three production agents as the accountability proof. The identity/capability/payment/accountability framing is **not** in the launch blog, so treat that attribution as theirs |
| `Zhekinmaksim/b8xmarket` | 0 | 15 | 2026-09-04 | `b8xmarket-repo.vercel.app`, 200, 95 KB | Compares realised PnL, drawdown, win rate, fills, risk ratio and venue on one screen. Scoped session review with allowlist, spend cap, expiry and revoke state. Performance-fee sizing before hire. Includes an Agent Advantage Report | Self-described "static production site seeded with live BSC testnet agent records and public A2A endpoints". Seeded, not live-indexed |
| `Zer0-Knowledge-Hack/pulse` | 1 | 7 | 2026-09-04 | none published | Explicitly positions against explorers: "This is not an ERC-8004 explorer clone. Identity already exists. The product is conversion: land, find by category, understand, activate" | Seven commits. The positioning line is the sharpest in the field even though the build is not |
| `winsznx/mandate` | 0 | 36 | 2026-09-04 | none published | An agent proves a capability under test, then receives exactly the authority it proved. The invariant is `GrantedEnforceableAuthority ⊆ TestedEnforceableAuthority`, compiled to an AuthorityIR then to an Altana session with target, selector, spend cap and expiry. Out-of-scope calls are refused by the account contract before broadcast | Claims a Venus health-factor agent tested, granted and used on BSC testnet. Sharpest Altana-track story I found |

### The names cluster, which is a signal in itself

Four separate repos are called some form of "mandate", three some form of "assay",
and at least fourteen are literally `bnb-agent-marketplace`. Names converge because
the briefs converge. A generic name is now a liability, not a neutral choice.

### What the whole field has already converged on

Read fifteen rival READMEs back to back and the same eight moves appear over and
over. None of these is a differentiator any more. Shipping one and calling it the
idea will read as generic to a judge who has opened four other tabs.

1. **Probe before listing.** "calls every agent before it lists it", "refuses to
   take the registry's word", "Kawal called it and it answered", "we probed 66
   ERC-8004 agents", "probes each declared endpoint continuously". At least eight
   rivals independently.
2. **The honest funnel as the hero number.** 300k registered, a few hundred with
   feedback, a handful reachable. Four rivals put that exact triple on the landing
   page. One of them makes it the entire headline.
3. **Refuse to fabricate.** Explicit lists of what the product will not invent:
   price, APY, TVL, volume, risk, performance, execution status, funded jobs,
   sessions, transactions. Empty states shown as empty rather than zeroed.
4. **Bounded authority on hire.** Contract allowlist plus selector allowlist plus
   spend cap plus expiry plus revoke, usually via an Altana session, sometimes via
   Permit2 with an exact amount.
5. **Non-custodial by construction.** The buyer's own wallet signs every write and
   the marketplace never holds a key. Several say so in the first paragraph.
6. **Four equal category shelves.** Everyone read the "single-category submissions
   score poorly" line. The four names are on every landing page.
7. **A machine face.** MCP server, A2A card, `llms.txt`, `openapi.json`, x402
   challenge. Three rivals expose all of them.
8. **An Agent Advantage Report.** The TermiX gate is public, so the with-agent
   versus without-agent table is being built by everyone chasing that track.

The two things almost nobody has: **all four categories filled with third-party
sellers** and **a data path that stays correct when 8004scan is down**.

## Incumbent explorers, studied properly

The judges have seen these. Anything we build that looks like one of them will be
read as a reskin.

### 8004scan (`8004scan.io`), the sponsor's own explorer

What it already does well, from its 150-path OpenAPI in
`raw/8004scan-openapi-2026-09-05.json`:

- **Rankings as first-class product surfaces**, each with a named frontend
  scenario and a documented algorithm: `/agents/featured` for the homepage hero
  carousel, `/agents/trending` with `trending_score = view_count / (hours_since_last_activity + 2)^1.5`,
  `/agents/leaderboard`, `/agents/most-starred` for "Most Loved", `/agents/best-wallet`
  for "Best Payment Integration" sorted by `wallet_score`.
- **A five-dimension v5 score with published weights**: Engagement 30%, Service
  25%, Publisher 20%, Compliance 15%, Momentum 10%. Every dimension returns a
  human-readable `explanation` plus a `details` object. Live example for agent
  56:705 in `raw/8004scan-scores-v5-56-705-2026-09-05.json`: total 30.46,
  service 79.0 with `"Healthy services: A2A (3 skills). All endpoints responding
  well."`, compliance 87.9 with `"Endpoint verified."`.
- **Score history** at `/agents/score-history/{chain_id}/{token_id}?days=30`, so
  trend lines already exist.
- **Hybrid semantic search** at `/agents/search/semantic?q=...&semantic_weight=0.5`,
  PostgreSQL tsvector plus pgvector embeddings, with a `similarity_score` per hit.
- **Domain proof verification** at `POST /agents/verify-endpoint/{chain}/{token}`,
  which queues a check that `.well-known/agent-registration.json` matches the
  registration. Rate limited to once per hour per agent.
- **Owner-triggered health checks** at `POST /agents/{chain}/{token}/health-check`.
- **A certification hierarchy** with publisher and validator tiers, apply, renew,
  reject and revoke flows, plus audit logs.
- **Publisher and validator leaderboards** with published composite weights.
- **Social layer**: stars, views with history, feedback replies, an inbox,
  donations with a leaderboard.
- **Its own MCP tools**: `search_agents`, `get_agent`, `get_agent_feedbacks`,
  `star_agent`, `unstar_agent`, `get_starred_agents`.
- **A public status surface** that admits its own failures: `/status/indexers`,
  `/status/freshness`, `/status/components`, `/status/taskqueue`.
- **Admin curation with an audit trail**: featured agents can be set individually
  or in bulk and a shadow-ranking review endpoint exists to "inspect suspicious
  high-rank agents".

What 8004scan does **not** do and a marketplace must:

| Missing | Evidence |
| --- | --- |
| Any notion of hiring, escrow or a job | `8183`, `hire`, `escrow` occur zero times in the OpenAPI |
| Any notion of price | `price` occurs zero times |
| The four mandated categories | `rebalanc`, `grid`, `yield`, `health.factor` occur zero times. Its OASF taxonomy stops at `technology/blockchain/defi` with 463 agents chain-wide |
| Any financial telemetry | `tvl`, `apy`, `pnl` occur zero times |
| A fresh BSC index | chain 56 indexer `status: down`, checkpoint 32 hours stale, `total_agents` 30,659 short of chain, `total_feedbacks` 17,932 short of two other indexers |
| Validation data on BSC | trust8004 reports `contracts.validation: null` for chain 56 |

The shape of the opening is exact. 8004scan answers "does this agent exist and is
it well formed". It never answers "what will this agent do to my position, at what
price and did it work the last twenty times".

### trust8004 (`trust8004.xyz`), the fresher index, run by a rival

This is the one to take seriously, because the strongest rival marketplace both
consumes it and operates it. Its OpenAPI 3.1.0 spec is titled "trust8004 Agent
Trust API" version 1.1.0 and is public at `https://trust8004.xyz/openapi.json`.

What it does well:

- **32 chains indexed**, including several 8004scan does not surface prominently.
  Arc Testnet leads with 891,668 agents and 202,539 feedbacks, then BSC at
  334,938 and 29,712, then Base at 84,772 and 128,928.
- **Per-chain contract addresses in the response**, including a `validation`
  slot which is `null` on BSC and populated on Arc.
- **Reconciliation against chain**: every chain row carries both `lastAgentId`
  (indexed) and `onChainLastAgentId` plus `onChainCheckedAt`. For BSC those read
  334,937 and 334,934, so it publishes its own lag.
- **A metadata health split**: BSC `metadataHealthy: 193233` against
  `totalAgents: 334938`, so 57.7% of BSC registrations have a usable document.
- **A free keyset-cursor path over the whole catalogue**: `GET /api/v1/catalog/agents?afterId=0&limit=100`,
  paginate on the last item's id, stop on a short page. Offset also works but caps
  at 10,000. Cursor responses carry no total.
- **A seven-dimension trust score** behind the paid tier: quality, completeness,
  availability, freshness, activity, wallet, popularity, each with weights and a
  confidence, plus a `tier` from `unverified` to `diamond`.
- **x402 pricing per call**: `/api/v1/agents` 0.01 USDC, `/api/v1/agents/bulk`
  0.10 USDC for pages up to 1,000, `/api/v1/agents/{id}` 0.01, `/api/v1/agents/{id}/score`
  0.01. Ids are `"{chainId}:{agentId}"`, for example `"8453:42"`.

What it does not do: no hiring, no escrow, no ERC-8183 state, no category
taxonomy matching the mandated four, no BSC payment network in its own x402
`accepts[]` and its marketing copy still says "Ethereum, Base, and Polygon" with
"6000+" agents while its API reports 32 chains and 1.4 million records.

### The other three ERC-8004 explorers

| Explorer | BSC coverage | What it has | Gap |
| --- | --- | --- | --- |
| `erc-8004.quicknode.com` | Yes. "BNB Chain Mainnet 56 334940 29712 Coming Soon 120,028,766" | Agents, networks, validators, feedback, validations, leaderboard, a published "Reputation formula (v1.3)" with sybil filters, RFC 9727 API catalogue, agent-skills index, `llms.txt` and `llms-full.txt`, Postman collection, `/healthz`. REST paywalled per call via x402 in USDC on Base | Validations on BSC are "Coming Soon". Zero DeFi framing, zero hiring, no category shelves. Its own landing text never says BNB or BSC |
| `agentscan.info` | Not stated on the landing shell | Browse Agents, Networks, Leaderboard, Insights, Create Agent, Install MCP, registration trend and capability distribution panels | Landing served unpopulated with a `Loading…` panel when I read it. No API documented, no scoring method published |
| `8004registry.goat.network` | Not stated. Copy says "Ethereum, Base, Polygon and more" | Browse, rate and register agents, plus tabs for FEEDBACK, DISCOVERY, SCORES, INDEXER | Positioned around registering on GOAT Network. 84 agents on chain 2345 per 8004scan |

Every one of the five explorers stops at the same line. They answer "who is
registered and how well formed are they". Not one of them answers "hire this one".

## BNB Agent Studio: what we would be adopted into

Read `https://www.bnbchain.org/en/bnb-agent-studio` and the nine-page Studio
developer kit at `https://docs.bnbchain.org/developer-kit/bnbchain-studio/`.

What Studio already provides:

- A wallet, an LLM aggregator, ERC-8004 identity registration, an ERC-8183 task
  interface and a cloud runtime in one toolkit. Its own framing is "an integration
  layer, not a locked-in stack".
- CLI `bag`, installed with `npm install --global @bnbagent/studio-cli`.
  `bag skills install` installs the `/bnbagent-studio` IDE router plus on-demand
  playbooks. `bag mcp serve` runs "15 read-only chain tools for your IDE, it never
  signs". `bag budget enable` turns on gasless `$U` auto-refill.
- Scaffolding into a TypeScript workspace: `sellerCore.ts` for your logic,
  `signing.ts` as the fixed quote, verify and submit path, `tools.ts`, plus
  `unifiedMain.ts`, `mcpMain.ts` and `dualMain.ts` entrypoints. Keys land in
  `.studio/wallets/` deliberately outside `app/agent/`.
- A `--protocols` flag selecting A2A, MCP and X402 as the public faces.
- Deploy delegated to a pinned `@bnbagent/deploy-cli`. Invalid combinations are
  refused before the project changes, named examples being Altana with paid B402,
  and Foundry with an MCP entrypoint.
- Guardrails: a balance threshold, a refill amount and a daily spend cap.
- Defaults today: `evm-local` wallet, Pieverse LLM, AWS AgentCore runtime, with
  TWAK offered as a wallet option and Azure Foundry as the alternate runtime.
- Roadmap items not yet shipped: BinancePay B402 merchants integration, a 48-hour
  free trial runtime on a managed testnet sandbox, a Developer Dashboard to
  "View, pause, and restart your agents without touching the CLI".

What Studio does **not** provide, verified by absence across both surfaces: no
marketplace, no discovery page, no listing flow, no indexer, no storefront spec,
no front-end contract and no statement of who consumes the identity plus the
ERC-8183 interface. Registration is folded into deployment through a natural
language prompt and after that the agent is discoverable only to a buyer who
already knows its endpoint.

**So the socket we would be adopted into is empty and it is the demand side.**
Studio manufactures supply then leaves it undiscoverable. That is the gap the
launch blog names: "hiring one today means digging through X threads and GitHub
repos". The front end is expected to make the registry "legible to a person
deciding who to hire". Two consequences. The unshipped Developer Dashboard is
adjacent to our surface, so we should not duplicate agent lifecycle control.
And `bag mcp serve` establishes that a machine face over the same data is the
house pattern, so our own MCP server reads as native rather than novel.

## Agent marketplaces on other chains: the shape of the winning answer

I read the two most-cited non-EVM-8004 marketplaces plus the Solana cluster to see
what a mature version of this looks like.

**Fetch.ai Agentverse Marketplace** (`agentverse.ai/docs/marketplace`). Framed as
"an Almanac Explorer". Listing is automatic, agents "are automatically listed in
the Almanac". Five run types, each its own shelf: Hosted, Local, Mailbox, Custom,
Proxy. Live listings carry a green `Active` tag and dead ones show as Offline
Agents. Its discovery language is the interesting part, a GitHub-style operator
grammar: `is:hosted`, `is:local`, `is:mailbox`, `is:custom`, `is:proxy`,
`is:fetch-ai`, `is:community`, `is:active`, `is:verified`, `is:mainnet`,
`is:testnet`, `has:location`, `has:readme`, `has:guide`,
`has:interactions>1k|10k|100k|1m|10m|100m`, plus `tag:finance`, `tag:llm`,
`tag:search` and others. Filters stack and a leading `-` inverts them. Trust is a
binary Verified flag plus a Rating score driven by search appearances and usage
frequency. Consumption is conversational through a "Chat with Agent" button, not
transactional. **No hiring flow, no checkout, no escrow, no pricing tier exists.**

**Olas Mech Marketplace** (`olas.network/mech-marketplace`). Positioned as
"Monetize your AI agent. Hire or offer AI agent services in the AI agent bazaar",
access with "No API keys. Just cryptographic signatures." Two live aggregate
metrics on 2026-09-05 at 02:01 UTC: turnover of $109,298 defined as total fees
collected including legacy mech contracts and 14,573,241 A2A transactions across
Ethereum, Gnosis, Arbitrum, Optimism, Base and Polygon. One case study quantified
at 57 paid prediction requests all fulfilled. The marketing page carries no listing
mechanics, no price-setting mechanism, no staking requirement and no dispute
handling.

**Solana cluster**: `rentagent.work` ("discover, rent and pay AI agents with
Solana. Each agent sets their own price."), `tetsuo-ai/AgenC` (host your own agent
store, post jobs, get hired, earn operator and referral cuts, with escrow, review
and settlement on chain), `iamaanahmad/agentmarket` (hire, pay in SOL, smart
contracts manage the work).

What the mature answer actually looks like, distilled:

1. **A query grammar, not a filter sidebar.** Agentverse's `is:` / `has:` / `tag:`
   operators are the single most copyable idea in the whole scan. It makes the same
   data feel like a tool instead of a catalogue and it is a two-day build.
2. **Cumulative marketplace turnover on the homepage.** Olas leads with dollars
   settled and A2A transaction count. Not agent count. Every BNB rival leads with
   agent count, which is the number BNB Chain already calls a problem.
3. **Explicit run types as shelves.** Agentverse splits by how an agent runs
   because that predicts whether it will answer. On BSC the equivalent split is
   already measured for us: A2A-only sellers are where ERC-8183 hiring happens and
   MCP-only agents cannot be hired at all. One rival found 46 of 114 are A2A-only.
4. **Offline is a state, not a hidden row.** Both mature products render dead
   agents rather than filtering them.
5. **Operator and referral cuts.** The Solana designs pay whoever routed the hire.
   No BNB rival I read has a take rate, a fee split or any revenue design at all,
   and "official adoption as a standalone product with its own brand and team"
   implies a business model question a judge may well ask.

## Unverified or open

| Claim | What blocked it |
| --- | --- |
| The eleven mainnet ERC-8004 feedback receipts one rival links | I read the README and the tx hashes, I did not fetch the receipts or decode the logs. Their claim, dated 2026-08-28, not my measurement |
| That `mcfarhat/agentcensus` is live on BSC mainnet with ERC-8183 settlement | the repo publishes no homepage and I found no URL. README claim only |
| Whether any rival has a paid, settled MAINNET ERC-8183 job | the furthest-along rival documents a mainnet quote path plus a registered mainnet seller and says the mainnet proof "becomes the primary public proof only after its real job is captured". I found no rival with a `COMPLETED` mainnet job. Absence of evidence, not evidence of absence |
| Actual rendered content of `positioncrew.dolepee.com` and `docket.gudman.xyz` | both serve a shell or JSON to `curl`. Reading them needs a browser I do not have here |
| Whether 8004scan's BSC feedback undercount is 17,932 or something else | I verified the three indexers disagree and that 8004scan self-reports `status: down` with a 32-hour-old checkpoint, which explains the direction. I did not do a full `NewFeedback` log sweep and every free BSC RPC refuses the range |
| Total number of hackathon entries | one entry per team, submitted through a Google Form, no roster published. 206 public repos is a floor on public builds and says nothing about private ones |
| Whether judges will look at GitHub at all | the criteria name Functionality, Data Quality and Agent Diversity, all of which are properties of the running site. Nothing published says the repo is read |
| Whether the withheld Weight column favours any one criterion | no numbers published and phase 2 criteria are withheld |
| Whether `is_featured` curation on 8004scan can be influenced | the featured-agent endpoints and their audit log are admin-only, so I could not see who curates or on what basis |

## Interfaces and constants a builder can paste

### Rival intelligence: the one API that is free, fresh and covers BSC

trust8004's catalogue tier needs no payment and no key. It is the fastest way to a
correct BSC catalogue while 8004scan is behind and it self-reports its own lag.

```bash
# per-chain truth including its own on-chain reconciliation. Free.
curl -s -H 'accept: application/json' https://trust8004.xyz/api/v1/chains

# free catalogue, keyset cursor. Paginate on the last item's id, stop on a short page.
curl -s -H 'accept: application/json' \
  'https://trust8004.xyz/api/v1/catalog/agents?chainId=56&afterId=0&limit=100'

# one agent, free. id is "{chainId}:{agentId}"
curl -s 'https://trust8004.xyz/api/v1/catalog/agents/56:705'

# the full spec
curl -s https://trust8004.xyz/openapi.json
curl -s https://trust8004.xyz/api/health
```

The BSC chain row, read today:

```json
{
  "chainId": 56, "chainName": "BNB Chain", "shortName": "BSC", "isTestnet": false,
  "explorerUrl": "https://bscscan.com", "explorerName": "BscScan",
  "contracts": {
    "identity":   "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    "reputation": "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
    "validation": null,
    "deploymentBlock": "79031670"
  },
  "totalAgents": 334938, "activeAgents": 334938,
  "metadataHealthy": 193233, "metadataPending": 4,
  "lastAgentId": 334937, "onChainLastAgentId": 334934,
  "totalFeedbacks": 29712, "revokedFeedbacks": 0,
  "averageScore": 76.6, "uniqueReviewers": 111
}
```

Note `validation: null` on BSC and `deploymentBlock: 79031670`. That deployment
block is the only number a builder needs to sweep the registry from zero.

A catalogue item's exact field set, from `/api/v1/catalog/agents?chainId=56&limit=2`:

```json
{
  "id": 1554861, "agentId": "334937", "chainId": 56,
  "contractAddress": "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
  "registerTxHash": "0x7de9...", "setUriTxHash": null,
  "ipfsCid": "", "ipfsUri": "https://q402.quackai.ai/api/wallet/agentic/agent-metadata/0x99f2...",
  "blockNumber": "120027561", "registeredAt": 1788573931000,
  "ownerAddress": "0xa354...", "deployerAddress": "0xa354...",
  "source": "onchain", "specVersion": "custom", "isLegacy": false,
  "name": "Agent #334937", "description": null, "version": null, "author": null,
  "image": null, "mcpEndpoint": null, "a2aEndpoint": null, "endpoints": null,
  "services": [], "skills": [], "domains": [], "capabilities": null,
  "endpointHealth": null, "agentWallet": "0xa354...", "agentWalletCheckedAt": null,
  "supportedTrusts": null, "x402support": false, "active": true,
  "regularizationStatus": "pending", "metadataStatus": "pending",
  "metadataReasonCode": "pending", "uriUpdateCount": 2,
  "trustScore": null, "trustTier": null,
  "category": "other", "categoryConfidence": 0, "categorySource": "auto",
  "rawMetadata": null, "customFields": null
}
```

Three things to read off that. `category` defaults to `"other"` with
`categoryConfidence: 0`, so their classifier abstains rather than guessing.
`trustScore` is `null` on the free tier. The paid listing adds `categoryCounts`
plus `metadataReasonCounts` facets that the free catalogue deliberately withholds,
per the spec's own `x-guidance`.

### The x402 challenge trust8004 serves, verbatim shape

Useful as a reference 402 body and as proof that a paid ERC-8004 data tier is
already a live business. One `accepts[]` entry of eleven:

```json
{
  "x402Version": 2,
  "resource": {
    "url": "https://trust8004.xyz/api/v1/agents?chainId=56&limit=1",
    "description": "trust8004 — ERC-8004 agent trust and reputation data",
    "mimeType": "application/json"
  },
  "accepts": [{
    "scheme": "exact",
    "network": "eip155:8453",
    "asset": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    "amount": "10000",
    "payTo": "0x5ee75a1B1648C023e885E58bD3735Ae273f2cc52",
    "maxTimeoutSeconds": 604900,
    "extra": {
      "name": "GatewayWalletBatched",
      "version": "1",
      "verifyingContract": "0x77777777dcc4d5a8b6e418fd04d8997ef11000ee"
    }
  }]
}
```

`amount: "10000"` against 6-decimal USDC is 0.01 USDC per call. Chain 56 is not in
their accepted set, so a BSC-native paid tier is unoccupied ground.

### The rival marketplace MCP contract, verbatim

Worth pasting because it is the bar for a machine face and because our tool names
should not collide with it.

```bash
curl -s -X POST https://marketplace.trust8004.xyz/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
        "protocolVersion":"2025-06-18","capabilities":{},
        "clientInfo":{"name":"probe","version":"1"}}}'
# -> {"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{}},
#     "serverInfo":{"name":"bnb-agent-marketplace","version":"1.0.0"}},...}
```

Their five tools, with the boundary each one states:

| Tool | Boundary it declares |
| --- | --- |
| `search_agents` | filters by outcome category, free text and availability. "MCP or A2A availability never implies ERC-8183 hireability", `availability=hireable` narrows to what the marketplace can actually hire |
| `get_passport` | "provenance-labeled identity, endpoint, quote and job checks plus its onchain track record", explicitly "not reputation or an endorsement" |
| `compare_agents` | 2 or 3 agents side by side, "the marketplace never declares a winner" |
| `request_quote` | fresh ERC-8183 quote, server validates seller, contracts, token, budget ceiling and expiry against an allowlist before returning. Envelope must be kept byte-identical |
| `get_job_status` | state in `OPEN, FUNDED, SUBMITTED, COMPLETED, REJECTED, EXPIRED`, plus budget, deadline and deliverable hash, "resolved from chain, not from marketplace claims" |

### 8004scan freshness endpoints, for a live staleness banner

If we consume 8004scan at all, these three reads let us label its state honestly
rather than inherit its lag silently.

```bash
curl -s https://8004scan.io/api/v1/status/indexers  | jq '.indexers[] | select(.chain_id==56)'
curl -s https://8004scan.io/api/v1/status/freshness
curl -s https://8004scan.io/api/v1/stats/global     | jq '.chain_stats[] | select(.chain_id==56)'
```

The chain 56 row today, trimmed to the fields that matter:

```json
{
  "chain_key": "bsc_mainnet", "chain_id": 56, "data_source": "direct_rpc",
  "status": "down", "message": "100 direct events are pending parent data",
  "direct_canonical_checkpoint_block": 119687744,
  "direct_canonical_checkpoint_age_seconds": 116288,
  "direct_latest_event_block": 119985609,
  "direct_latest_event_block_age_seconds": 20200,
  "direct_pending_events": 100, "direct_failed_events": 0,
  "last_checkpoint_at": "2026-09-04T21:01:05.966970Z"
}
```

BSC Testnet chain 97 in the same response is `status: ok` with a checkpoint one
second old. The failure is specific to BSC mainnet, which is the only chain that
matters here.

### Independent chain read that settles the agent count

```bash
R=https://bsc-rpc.publicnode.com
ID=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
cast call $ID "ownerOf(uint256)(address)" 334939 --rpc-url $R  # 0xa61e089E...5eef0
cast call $ID "ownerOf(uint256)(address)" 334940 --rpc-url $R  # execution reverted
cast call $ID "ownerOf(uint256)(address)" 0      --rpc-url $R  # 0x8CE2b134...fdEc
cast block-number --rpc-url $R                                  # 120028863
```

Ids are contiguous from 0, the ceiling is 334,939, so 334,940 agents at block
120,028,863. Use this as the denominator on screen. It is the only agent count in
this scan that came from the chain rather than from somebody's index.

## Design implications for the marketplace

**1. Do not single-source 8004scan. Say on screen that you do not.** Its BSC
mainnet indexer is `status: down` right now, 32 hours stale, 30,659 agents short
and 17,932 feedbacks short. One rival's landing page is visibly broken because of
it while I write this. The free Pro tier is a gift with a defect. Read the chain
for identity and count, use trust8004's free catalogue for breadth, use 8004scan
for the social layer it uniquely has and render a freshness line per source with
the block and the timestamp. Data Quality is a scored criterion and it says
"real-time". A visible per-source freshness line converts our biggest risk into a
demonstration of the criterion.

**2. Probing is table stakes. Coverage is the opening.** Eight-plus rivals already
call the endpoint before listing. Only one rival I found has all four categories
populated with third-party agents and the strongest rival by build volume has two
categories reading "Unverified · empty" with third-party activation coverage
explicitly zero. Agent Diversity is one of three criteria and the page says "All
four, equally deep, is the bar." Filling all four with real BSC sellers is worth
more than any further verification depth.

**3. Beware self-dealing coverage.** The pattern across the field is to fill a
category with your own first-party agent. The strongest rival's Grid shelf is one
marketplace-operated planner. Another rival's four categories are four first-party
services. Judges reading "we're asking for the marketplace itself, not a portfolio
of agents" will discount that. If we must seed a category, label the seed as ours
and keep third-party counts separate and visible.

**4. The four mandated categories must be derived and nobody's taxonomy helps.**
8004scan's OASF taxonomy has no rebalancing, grid, yield or health-factor concept
and `technology/blockchain/defi` holds 463 agents across all chains. trust8004
returns `category: "other"` with `categoryConfidence: 0`. So classification is our
own work either way, which also means our classifier is a differentiator we can
publish rather than a chore.

**5. Lead with settlement, not with agent count.** Every BNB rival leads with
300k registered, which is the number BNB Chain itself calls the problem. Olas leads
with dollars settled and A2A transaction count. Turnover on the homepage, however
small, reframes us from directory to market.

**6. Ship a query grammar.** Agentverse's `is:` / `has:` / `tag:` operator syntax
with stacking and `-` inversion is the single most transferable idea in the scan and
no BNB rival has it. On BSC the operators write themselves: `is:a2a`, `is:mcp`,
`is:hireable`, `is:x402`, `has:feedback`, `has:endpoint`, `-is:answered`,
`tag:rebalancing`. It reads as a tool, it demos in one line and it is cheap.

**7. Split shelves by transport, because transport predicts hireability.** One
rival measured 46 of 114 listed agents as A2A-only and identified those as the
ERC-8183 sellers, with MCP-only agents not hireable at all. Splitting the catalogue
by transport is both honest and the fastest route to a hire that works.

**8. Reputation on BSC is 111 addresses, so do not build a star rating.** trust8004
reports 111 unique reviewers behind 29,712 BSC feedbacks against 3,392 on Base and
R01 measured 265 of 388 sampled entries from a single address carrying a Telegram
advert. Any average score we display is an average of spam. Show who wrote a record
and how many distinct writers exist, never a five-star aggregate. Two rivals already
do this, so not doing it will look naive.

**9. Take the machine face seriously but do not collide.** The rival MCP server
already occupies `search_agents`, `get_passport`, `compare_agents`, `request_quote`,
`get_job_status` and 8004scan occupies `search_agents`, `get_agent`,
`get_agent_feedbacks`. Studio's own `bag mcp serve` normalises the pattern. Pick
distinct tool names and make at least one tool do something no rival's can.

**10. Nobody in the field has a revenue design.** No take rate, no fee split, no
operator or referral cut anywhere in fifteen READMEs, while the Solana marketplaces
treat it as core. Adoption means BNB Chain backs it "as a standalone product with
its own brand and team". A one-paragraph, coded take-rate is cheap differentiation
against a field that has not thought about it.

**11. Uptime through judging is a scored risk nobody else is managing except one.**
Submissions must be "functional and publicly accessible during judging", Sep 9 to
Sep 23 and only the strongest rival documents a scheduled uptime check across that
exact window. Two live rival sites already return 404 and several render empty. A
public canary plus a status page is a cheap, visible edge over a field where a third
of the deployments are already degraded.

**12. Name it something unclaimed.** Fourteen repos are literally
`bnb-agent-marketplace`, four are some form of "mandate" and three are "assay". A
judge scanning submission titles will merge them. Ours has to survive that scan.

## The three things most likely to beat us and the counter for each

### 1. `gilbertsahumada/bnb-agent-marketplace` plus the trust8004 index behind it

1,429 commits, live on a custom domain, five-tool MCP server, per-agent Evidence
Passport with a deterministic fingerprint, a compare page, a builder `/validate`
endpoint, a thin CLI over its own public APIs, a mainnet registered seller
(Agent `303779`), five browser-signed buyer transactions on testnet Job `551`, a
scheduled GitHub Actions uptime check pinned to 2026-09-09 through 2026-09-23 and
a 32-chain ERC-8004 index of its own that it also sells over x402. It is the only
rival that owns both the data layer and the marketplace layer. If a judge opens one
tab, that is the tab.

**Counter.** Attack coverage, not craft. Their own landing shows Rebalancing and
Health factor monitoring as "Unverified · empty", Grid and Yield as "1 candidate"
each and their README states "Current third-party activation coverage is empty"
with the one Grid seller being marketplace-operated. Against a rubric where Agent
Diversity is one of three criteria and "All four, equally deep, is the bar", two
empty shelves plus two self-supplied ones is a scoring hole a mile wide. Ship four
shelves each populated by third-party BSC agents that answered, with the count and
the last-called timestamp on every card and their evidence sophistication becomes
a well-built product with nothing in it. Second, their catalogue is single-sourced
to their own index and the README concedes that index "does not provide
catalogue-completeness guarantees, an API/schema version, ERC-8183 hireability,
quote/payment data or direct-chain verification proofs". A marketplace that reads
the chain directly for count and identity, then names two independent indexes and
shows where they disagree, is strictly better on Data Quality and can prove it on
screen in one line.

### 2. `Elioz404/SMEAI`, the one rival that has actually filled all four shelves

Only 44 commits, but its live landing is doing the thing the rubric asks for:
Rebalancing 38 / 99, Grid Trading 6 / 57, Yield Optimisation 22 / 123, Health
Factor 6 / 56, "68 agents on BSC will answer you right now", every one called 47
seconds before my read, latency and price shown per agent. Plus a `/start` page
built for a reviewer and a 110-second screen recording of the deployed site with
no narration and no mock-ups. On Functionality plus Agent Diversity read in five
minutes, this beats builds with ten times the commits.

**Counter.** They win discovery and lose the second half of the journey. The
criterion is "land, find an agent by category, understand what it does, **activate
it**" and their headline metric is answered-ness, not hireability. Answering an
A2A card is not a funded ERC-8183 job. Beat them by carrying the same four filled
shelves all the way to a settled job with an on-chain receipt a judge can click,
and by pricing in `$U` from a signed quote rather than displaying a self-declared
price. Their per-category denominators (99, 57, 123, 56) are also keyword
candidate sets, so a classifier we can explain plus a published precision number
takes the Data Quality point back.

### 3. The convergence itself and a judge who has seen it four times

The real threat is not one rival. It is that "we probe before we list", "the honest
funnel", "we refuse to fabricate" and "bounded authority on hire" now appear in
eight-plus independent builds, several with live sites and real testnet jobs. By the
fourth tab those sentences stop registering. Everything that felt like our sharp
angle is the field's baseline and the judge's attention goes to whatever is
structurally different.

**Counter.** Spend the differentiator budget where the field is empty rather than
where it is crowded. Four levers, none of which any rival has, all cheap:
a query grammar (`is:hireable`, `has:feedback`, `-is:answered`, `tag:grid`) that
makes the same data feel like a tool; **settled turnover** on the homepage instead
of agent count, which is the metric BNB Chain itself calls the problem; a coded
take rate, because "a standalone product with its own brand and team" implies a
business and nobody has one; and a public per-source freshness banner that turns
the whole field's shared dependency failure into our visible strength. Then say the
probe work plainly once and move on, rather than making it the pitch.

## Sources

Read live on 2026-09-05 unless dated otherwise.

**Programme**
- `https://www.bnbchain.org/en/hackathons/smart-money-era` (tracks, rubric, prizes, Altana and TermiX gates, timeline stages)
- `https://www.bnbchain.org/en/blog/build-the-era-build-the-official-bnb-agent-studio-marketplace` (main-track ask, four blog categories, adoption wording, prize stacking)
- `raw/launch-blog-2026-08-27.html` (local capture, tag-stripped to `/tmp/r14/launch-blog.txt`)
- `https://www.bnbchain.org/en/bnb-agent-studio`
- `https://docs.bnbchain.org/developer-kit/bnbchain-studio/`

**Rival census**
- `gh api -X GET search/repositories -f q='agent marketplace bnb in:name,description,readme created:>2026-07-15'`, three pages
- `gh search repos` for `erc-8004`, `erc8004`, `8004 agent`, `bnb agent studio`, `build the era hackathon`, `smart money era`, `bnb agent marketplace`, `agent studio marketplace`, `erc8004 marketplace`, `8004 explorer agent`, `erc8183`, `x402 marketplace bsc`
- `gh search code "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"`
- `gh api repos/{owner}/{repo}` and `repos/{owner}/{repo}/commits?per_page=1 -i` for 148 repos
- `gh api repos/{owner}/{repo}/readme` for 18 rivals
- saved: `raw/r14-rival-field-206-2026-09-05.tsv`, `raw/r14-rival-field-commitcounts-2026-09-05.tsv`, `raw/r14-rival-repos-enriched-2026-09-05.tsv`

**Rival live sites probed with curl and read**
- `bnb-agent-marketplace-ruby.vercel.app`, `marketplace.trust8004.xyz`, `bnb-agent-marketplace-web.vercel.app`, `bnb-agent-marketplace.vercel.app`, `kawal-three.vercel.app`, `b8xmarket-repo.vercel.app`, `smeai-dev.vercel.app`, `mandate-coral.vercel.app`, `canned-lilac.vercel.app`, `docket.gudman.xyz`, `positioncrew.dolepee.com`, `ai-rook.com/bnb-marketplace/`, plus 47 more in the uptime sweep
- saved: `raw/r14-rival-marketplace-mcp-tools-2026-09-05.json`, `raw/r14-rival-docket-stats-2026-09-05.json`, `raw/r14-rival-docket-categories-2026-09-05.json`

**Incumbent explorers**
- `8004scan.io/api/v1/status/indexers`, `/status/freshness`, `/stats/global`, `/chains/56`; local `raw/8004scan-openapi-2026-09-05.json`, `raw/8004scan-oasf-domains-2026-09-05.json`, `raw/8004scan-oasf-skills-2026-09-05.json`, `raw/8004scan-scores-v5-56-705-2026-09-05.json`, `raw/8004scan-quality-56-705-2026-09-05.json`
- saved: `raw/r14-8004scan-indexers-status-2026-09-05.json`, `raw/r14-8004scan-freshness-2026-09-05.json`
- `trust8004.xyz/openapi.json`, `/api/v1/chains`, `/api/v1/catalog/agents`, `/api/v1/agents` (402), `/api/health`
- saved: `raw/r14-trust8004-openapi-2026-09-05.json`, `raw/r14-trust8004-chains-2026-09-05.json`, `raw/r14-trust8004-x402-challenge-2026-09-05.json`
- `erc-8004.quicknode.com/` and `/networks`, `agentscan.info`, `8004registry.goat.network`, `agentrank-omega.vercel.app`

**Other-chain marketplaces**
- `agentverse.ai/docs/marketplace`, `olas.network/mech-marketplace`, plus repo and landing text for `rentagent.work`, `tetsuo-ai/AgenC`, `iamaanahmad/agentmarket`

**On chain**
- `cast call 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 "ownerOf(uint256)(address)"` at ids 0, 1, 334000, 334500, 334800, 334930, 334937, 334939, 334940, 334941, 335500, 340000 and `cast block-number`, all against `https://bsc-rpc.publicnode.com`

**Prior lane research relied on, not re-derived**
- `R01-erc8004.md` (BSC reputation sweep, 8004scan BSC indexer already down on an earlier read, tokenURI parser count, no category field on chain)
- `R02-erc8183.md` (rivals Plow agent `325479` and Brain on BNB agents `302257` and `304494`, job census, `@bnbagent/sdk` 0.5.5)
- `raw/rival-plow-agent-metadata-2026-09-05.json`

**Press, used only for corroboration of dates and framing**
- cryptobriefing.com, cryptoslate.com press release, kucoin.com news flash, tronweekly.com, forbes.com 2026-07-01







