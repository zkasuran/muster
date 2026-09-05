# R07 TermiX and the Agent Advantage Report

Research pass, 2026-09-05. Build closes 2026-09-09 UTC+0. Everything below was
read or called today unless a date says otherwise.

## Headline

The TermiX track is the only fully weighted rubric in the programme and it is won
or lost on one sentence they published themselves: "does hiring an agent on this
marketplace actually beat doing the job yourself, and can you prove it with
numbers?" The default signer in their own agent skill is the Binance Agentic
Wallet, verified today. That wallet supports no testnets, so plan for a judge
paying on BSC mainnet in USDC or USDT with no help from us. A rival is already
ahead of us on shape: `positioncrew` has five ERC-8004 agents minted and five live
listings on TermiX itself covering all four mandated categories at 5 USDC and one
day each, with a no-wallet trial URL plus machine-readable JSON deliverables. Their
own reference MCP server (`bsc-mcp`) is stale and does not boot, so it is a
citation and a contribution target rather than a dependency.

## 1. Verified facts

| Claim | Value | How verified |
| --- | --- | --- |
| TermiX track weights | Value of the services 30%, Proven agent advantage 30%, High-stakes categories and track record 20%, Marketplace quality 20% | Read `https://www.bnbchain.org/en/hackathons/smart-money-era`, Tracks tab text, saved to `raw/bnb-hackathon-page-2026-09-05.txt` |
| TermiX track prize | $10,000 USDT, 1st $6,000, 2nd $3,000, 3rd $1,000 | Same page, plus `https://www.agent.family/campaigns/bnb-build-the-era` |
| Agent Advantage Report is a disqualifier | "Submissions must include the required Agent Advantage Report to be eligible" | Same BNB page, Prizes and Bounties section |
| Report spec | At least 3 real tasks run both ways (agent hired through your marketplace vs without), report time, cost and output quality with the actual outputs attached, at least one task from trading, stock or security | Same BNB page, "Required: Agent Advantage Report" |
| No TermiX integration required | "You are not asked to integrate anything with TermiX. The submission is the marketplace itself" | Same BNB page, Partner Track TermiX Challenge |
| They hire from every submission | "TermiX will hire from your marketplace themselves and see what comes back" | Same page. TermiX restates it: "TermiX will hire agents from every submitted marketplace and grade what comes back" |
| Trading agents need a stated record | "win rate, the window, and the risk taken to get there" | Same page, 20% criterion text |
| TermiX live BSC API base | `https://platform-backend.prod.termix.live` | `curl -s https://platform-backend.prod.termix.live/api/v1/config/contracts` returned HTTP 200 |
| TermiX BSC IdentityRegistry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, same address as the ERC-8004 registry in the session ground truth | Live config endpoint above, keys `contracts.identityRegistry` and `contracts.agentNft` |
| TermiX BSC escrow (USDC) | `0x6A52ba4C84b348FaEAe13dDC7A97b4F6af23913C` | Live config endpoint, `settlementCurrencies[0].contracts.escrow` |
| TermiX BSC escrow (USDT) | `0xCE02f987D8b8AF694E13C8a843Db9c77caBF544c` | Live config endpoint, `settlementCurrencies[1].contracts.escrow` |
| Protocol fee | 200 bps (2%) | `cast call --rpc-url https://bsc-rpc.publicnode.com 0x6A52ba4C84b348FaEAe13dDC7A97b4F6af23913C 'protocolFeeBps()(uint256)'` returned `200` |
| Evaluator fee | 300 bps | Same address, `evaluatorFeeBps()(uint256)` returned `300` |
| Arbitrator fee | 300 bps | Same address, `arbitratorFeeBps()(uint256)` returned `300` |
| Challenge bond | 0 | Same address, `challengeBondAmount()(uint256)` returned `0` |
| Minimum challenge window | 86400 s (24 h) | Same address, `minChallengeWindow()(uint256)` returned `86400` |
| Accept window | 259200 s (72 h) | Same address, `acceptWindow()(uint256)` returned `259200` |
| Verdict timeout | 259200 s (72 h) | Same address, `verdictTimeout()(uint256)` returned `259200` |
| Provider stake lock | 0 bps, `minPoolBalance` 0, `requiredLock(1e18)` 0 | `cast call ... 0x0Bd066f5113e6B8336b06F8Aa3EF90D37F7e65FC 'providerLockBps()(uint256)'` and siblings |
| Baseline reputation | 50 for an agent with no history | `cast call ... 0xFf3f7038c4919A420B30D7B3533cb386D5898189 'getScore(uint256)(uint256)' 1` returned `50` |
| BSC settlement tokens | USDC `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` 18 decimals, USDT `0x55d398326f99059fF775485246999027B3197955` 18 decimals | `cast call ... 'symbol()(string)'` and `'decimals()(uint8)'` on both. Both really are 18 on BSC, not 6 |
| Neither BSC stablecoin supports EIP-3009 or EIP-2612 | `DOMAIN_SEPARATOR()`, `authorizationState(address,bytes32)`, `nonces(address)` and `version()` all revert on both tokens | Eight `cast call` runs against the two addresses above on `bsc-rpc.publicnode.com` |
| Permit2 is deployed on BSC | Canonical `0x000000000022D473030F116dDEE9F6B43aC78BA3`, 9152 bytes of code | `cast code --rpc-url https://bsc-rpc.publicnode.com 0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| All seven TermiX BSC contracts are proxies | Every one returns exactly 170 bytes of code | `cast code` on all seven addresses, each 343 hex characters including `0x` |
| TermiX network stats, live | totalVolumeUsd 12,878,730.59; verifiedAgents 334,739; jobsCount 192,231; liveServices 10,068; clientsCount 11,858; providersCount 513; openForOffers 2,470; avgDailyNewJobs 5,883.6; latestBlock 120,020,321 | `curl -s https://platform-backend.prod.termix.live/api/v1/stats/network`, saved to `raw/termix-stats-network-2026-09-05.json` |
| Only 513 of 334,739 agents actually sell | providersCount 513 against verifiedAgents 334,739 | Same endpoint. 0.15% of the registry is commercially live |
| Published listings, live | 509 total, median price 70 USDC, mean 458.14, min 0.01, max 150,250, median delivery 3 days, 499 of 509 instant-buyable, 507 USDC against 2 USDT | Six paged calls to `/api/v1/listings?pageSize=100&page=N`, all 509 ids unique, saved page 1 to `raw/termix-listings-page1-2026-09-05.json` |
| Public reads need no auth | `/api/v1/config/contracts`, `/api/v1/stats/network`, `/api/v1/listings`, `/api/v1/listings/price-range`, `/api/v1/service-categories`, `/api/v1/explorer/leaderboard`, `/.well-known/aacp-agent.json` and `/api/v1/a2a/agents/:id/card` all returned 200 with no header | One anonymous `curl` each |
| Authenticated reads 401 cleanly | `/api/v1/stats`, `/api/v1/agents`, `/api/v1/requests`, `/api/v1/bounties` all 401 | Same sweep |
| Their hire path takes two on-chain transactions | `approveEscrow` then `createOrder`, both returned as unsigned tx-intents that the caller signs | `https://docs.termix.ai/api-reference/offers.md` and the skill's `docs/client-checkout-fund.md` |
| Their default signer is the Binance Agentic Wallet | `TERMIX_WALLET_MODE` defaults to `agentic`, driven by the `baw` CLI from `@binance/agentic-wallet`, private-key mode is the fallback | `SKILL.md` metadata and `docs/wallet-login.md` inside the live skill package |
| That wallet exists and is current | `@binance/agentic-wallet` 1.9.0, published 2026-08-27, binary `baw`, 18 versions | `curl -s https://registry.npmjs.org/@binance/agentic-wallet` |
| That wallet is mainnet only | "supports BSC (56) and Base (8453) ... and no testnets". External signing also needs Developer Mode on with a daily spend limit | `docs/wallet-login.md` in the skill package |
| TermiX ships a skill, not an MCP server, for the marketplace | 134,040-byte zip at `https://termix.ai/skills`, version 1.5.0, one `SKILL.md` router, 22 workflow docs, 1 example, 15 `.mjs` scripts, zero hits for `mcp`, `x402` or `well-known` in a recursive grep | `curl -sL https://termix.ai/skills`, unzip, `grep -rin` |
| Their published OpenAPI file is a placeholder | `https://docs.termix.ai/api-reference/openapi.json` is the Mintlify "OpenAPI Plant Store" sample with 2 paths and server `http://sandbox.mintlify.com` | Fetched and parsed the JSON |
| `bsc-mcp` registers exactly 11 MCP tools | Confirmed by an MCP `tools/list` round trip, not by reading the README | Built the repo from its own lockfile, ran `initialize` then `tools/list` over stdio, saved to `raw/termix-bsc-mcp-tools-list-2026-09-05.json` |
| `bsc-mcp` is stale | HEAD commit `a0aa570c672b412c347ce821d42d93e5432d2de5` dated 2025-08-30, npm `latest` 1.0.10 published 2025-03-30, `alpha` 1.0.12 published 2025-04-03, nothing since | `git log -1`, `curl -s https://registry.npmjs.org/bnbchain-mcp` |
| The published package does not boot | `npm i bnbchain-mcp@1.0.10` or `@1.0.12` then importing `build/main.js` fails with `SyntaxError: The requested module '@pancakeswap/swap-sdk-core' does not provide an export named 'SCALED_UI_DENOMINATOR'` | Clean install in an empty directory, twice, node 22 |
| A from-source build does not boot either | Two files import `../responseUtils` with no `.js` extension, so ESM resolution throws `ERR_MODULE_NOT_FOUND` before any tool registers | `npm ci && npx tsc && node build/index.js`. The two files are `src/tools/goplusSecurityCheck.ts:6` and `src/functions/fetchBalanceTool.ts:1` |
| 9 of its 11 tools cannot run on Linux | The password prompt only has a `darwin` AppleScript branch plus a `win32` PowerShell branch. The default branch rejects | `src/util.ts` `showInputBoxWithTerms`, then a live `tools/call` on `View_PancakeSwap_Positions` returned `Unsupported platform and command-line input is not available: linux` |
| `Get_Wallet_Info` is broken | Its backing endpoint `https://app.termix.ai/api/bscBalanceCheck` 301s to `https://www.agent.family/api/bscBalanceCheck`, which 404s. A live `tools/call` returned `Balance Fetch Error: Not Found` | `curl -sIL` on the endpoint, plus the tool call |
| `QueryMemeTokenDetails` is broken | `https://www.four.meme/meme-api/v1/private/token/query` returns HTTP 404 with `"error":"Not Found"`. A live `tools/call` returned `Failed to fetch token details: 404` | `curl` on the endpoint, plus the tool call |
| `Token_Security_Check` silently returns nothing for a checksummed address | GoPlus keys its result map by the lowercase address, the code indexes with the caller's string. Checksummed CAKE returned `{}`, the same address lowercased returned the full report including `holder_count: 1909789` | Two live `tools/call` runs, same tool, same token, case flipped |
| `bsc-mcp` has no LICENSE file | 42 files in the tree, none named LICENSE. The MIT grant exists only as `package.json` `"license": "MIT"` plus one README line | `find . -type f` on the clone |
| The TermiX Discord invite on their own homepage is dead | `https://discord.com/invite/Tb2SQBXBx` returns 200 in a browser but the API says `{"message": "Invite is expired.", "code": 50270}` | `curl -s https://discord.com/api/v10/invites/Tb2SQBXBx` |
| The AACP testnet backend is down | `https://aacp-backend.termix.live` returns nginx 503 on every path including `/api/v1/config`. DNS and TLS both resolve | Four anonymous `curl` calls plus `getent hosts` |
| bStocks are real BEP-20 tokens on BSC | `0x7425889FE94F9d693E8daefE88BCCed6AcFEf4c0` is `name() = "Meta Platforms"`, `symbol() = "METAB"`, 18 decimals, `totalSupply()` 11,692.37997593. `0x0Ca5D51D0277Bd006fd9607d3E560785EBad8222` is "Palantir Technologies", `PLTRB` | `cast call` on both, addresses taken from `https://tokens.pancakeswap.finance/pancakeswap-extended.json` which lists 9 of them on chain 56 |
| bStocks carry a scaled-UI multiplier | `uiMultiplier()(uint256)` on METAB returns `1000000000000000000`. `multiplier()`, `scaledUIMultiplier()`, `getMultiplier()` and `shareToAmount(uint256)` all revert | Five `cast call` probes on METAB |
| BNB spot price at the time of this pass | 720.62 USDT | `curl -s 'https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT'` returned HTTP 200 |
| A rival covers all four mandated categories on TermiX already | `positioncrew` holds five ERC-8004 agents (token ids 266229, 266231, 266232, 266234, 293111) and five live listings, all 5 USDC and 1 day delivery, all instant-buyable | The paged listings sweep plus `/.well-known/aacp-agent.json`, saved to `raw/termix-wellknown-aacp-agent-2026-09-05.json` |
| That rival publishes a no-wallet trial | `https://positioncrew.dolepee.com` returns HTTP 200 anonymously, page title "PositionCrew \| BSC capital jobs". The URL is printed in four of their listing descriptions | `curl -sL` on the URL, plus the listing bodies |
| Every one of that rival's agents has zero completed jobs | `completedJobs` 0, `stake` 0, `reputationScore` 50 (the baseline) on all five | The listing sweep, `providerAgent.metrics` on each |
| TermiX's own well-known manifest advertises 27 agents, several of them hackathon entrants | Includes a bStocks trading agent, a lending health-factor agent, several audit agents and a payments agent tagged `x402` | `curl -s https://platform-backend.prod.termix.live/.well-known/aacp-agent.json` |

## 2. Unverified or open

| Claim | Blocker |
| --- | --- |
| Where the Agent Advantage Report is actually filed | Neither the BNB page nor the TermiX campaign page names a channel. The only submission channel published is the BNB form. Treat the report as a public URL inside the submission and also as a file, so either reading works |
| Whether TermiX pays for the hire or expects a free trial | "TermiX will hire from your marketplace" implies a payment, but nothing states they will fund a wallet or that they will accept a comped run. Support both: a free trial and a real paid path |
| Which wallet address TermiX judges from | Not published. Cannot allowlist them, so nothing in the hire path may depend on an allowlist |
| Whether the second-phase criteria touch the TermiX track | The BNB page says "We'all also assess more criterias in the second phase" and "Phase 2: [REDACTED]" against the MAIN track rubric. The TermiX table has no such line. Unknown whether phase 2 reweights the partner tracks |
| Whether `liveServices` 10,068 and the 509 queryable listings describe the same population | Their own two endpoints disagree by 20x. Likely `liveServices` counts drafts, paused rows or non-searchable listings, but the field is undocumented, so this is a guess not a finding |
| Whether an x402 or B402 facilitator is live for BSC chain 56 | Not tested in this pass. The sibling capture in `raw/x402-*` has the spec. What is verified here is only the token-side constraint: the EIP-3009 route is unavailable on both BSC stablecoins and Permit2 is deployed |
| Whether a stock split has ever moved a bStock `uiMultiplier()` off 1e18 | METAB reads exactly 1e18 today. The hook exists and is live, but no historical divergence was observed, so do not claim one |
| The 1:1 backing of bStocks | Binance describes daily Proof of Collateral at an off-chain page. No attestation contract, oracle or on-chain reserve feed is named, so the backing is not on-chain verifiable |
| Whether TermiX's judges use their own skill package to hire | Inferred from the fact that the skill is their only published client and its default signer is the Binance wallet. Not stated anywhere |

## 3. The rubric, in their exact words

Both pages carry the same four weights with different labels. The BNB page is the
programme's own, so use its wording when we quote it and expect a TermiX reader to
recognise theirs.

| Weight | BNB page label | TermiX page label | What "great" looks like, quoted from the BNB page |
| --- | --- | --- | --- |
| 30% | Value of the services | Service value | "Real working agents at a price and speed that beat the alternative. TermiX will hire from your marketplace and evaluate the results." |
| 30% | Proven agent advantage | Demonstrable agent advantage | "Measured, not asserted, backed by the required Agent Advantage Report." |
| 20% | High-stakes categories & track record | High-value categories and track record | "Trading, stock/equities and security agents weighted above general-purpose. Trading agents need a real record: win rate, the window, and the risk taken to get there." |
| 20% | Marketplace quality | Marketplace usability | "Find, compare, hire, without instructions." |

Three sentences on the same page decide how we build:

- "You are not asked to integrate anything with TermiX. The submission is the
  marketplace itself, judged on whether the agents on it are genuinely worth
  paying for."
- "TermiX will hire from your marketplace themselves and see what comes back."
- "The 'Proven agent advantage' criterion (30%) is scored against this report, so
  plan for it from day one."

Read together: 60% of the TermiX score is one thing measured twice. They measure it
by hiring. We measure it in the report. The two had better agree, because a report
that claims a 40x speedup against a live agent that times out when they hire it is
worse than no report at all. The mismatch becomes evidence against every other
number we publish.

## 4. `bsc-mcp`, the complete tool surface

`github.com/TermiX-official/bsc-mcp`, HEAD `a0aa570c` dated 2025-08-30, MIT by
declaration, 105 stars, published to npm as `bnbchain-mcp`. The BNB resources tab
names it "TermiX's open-source MCP server for interacting with BNB Chain", so it is
the sponsor's own reference implementation and worth quoting even though it does not
run.

The README's tool table is wrong. It lists 13 camelCase names, four of which
(`createFourMeme`, `createBEP20Token`, `getBalance`, `callContractFunction`) are not
registered anywhere in the source. It also omits two that are (`Buy_Meme_Token`,
`QueryMemeTokenDetails`). The names it prints are the internal register-function
names, not the MCP tool names a client sees. The table below came from an actual
`tools/list` round trip.

| Tool name | Parameters (zod, as sent over MCP) | What it does | State today |
| --- | --- | --- | --- |
| `Send_BNB` | `recipientAddress: string`, `amount: string` | `sendTransaction` with `parseEther(amount)` | Needs a wallet, so Linux-blocked |
| `Send_BEP20_Token` | `recipientAddress: string`, `amount: string`, `address: string` | Reads `decimals()`, then `transfer` with a hard `gas: 100000n` | Needs a wallet, Linux-blocked. The fixed gas limit will fail on any token with a transfer hook |
| `PancakeSwap_Token_Exchange` | `inputToken: string`, `outputToken: string`, `amount: string` | Smart-router swap through `@pancakeswap/smart-router` | Needs a wallet, Linux-blocked |
| `Get_Wallet_Info` | `address?: string` ("When querying the user's own wallet value, it is null") | Native plus token balances | Broken. Backing endpoint 404s |
| `Buy_Meme_Token` | `token: string`, `tokenValue: string = "0"`, `bnbValue: string = "0"` | `tryBuy` quote then `buyTokenAMAP` on four.meme | Needs a wallet, Linux-blocked. Slippage is hardcoded at 20% when buying by BNB value and 5% when buying by token value |
| `Sell_Meme_Token` | `token: string`, `tokenValue: string` | `approve` if needed then `sellToken` | Needs a wallet, Linux-blocked |
| `Add_PancakeSwap_Liquidity` | `token0: string`, `token1: string`, `token0Amount: string`, `token1Amount: string` | V3 mint at `FeeAmount.MEDIUM` (0.3%) | Needs a wallet, Linux-blocked. The fee tier is hardcoded, so it cannot open a position in the 0.01%, 0.05% or 1% pool |
| `View_PancakeSwap_Positions` | none | Reads the caller's V3 positions | Needs a wallet, Linux-blocked |
| `Remove_PancakeSwap_Liquidity` | `positionId: string`, `percent: number` (min 1, max 100) | Burns a share of a V3 position | Needs a wallet, Linux-blocked |
| `Token_Security_Check` | `tokenAddress: string` | GoPlus token security on chain 56 | Runs keyless, but returns `{}` unless the address is lowercase |
| `QueryMemeTokenDetails` | `tokenName: string` ("The name of the token to query (e.g., HGUSDT)") | four.meme token query, price converted to USDT via the Binance BNBUSDT ticker | Broken. four.meme endpoint 404s |

Server identity over MCP: `{"name": "bsc-mcp", "version": "1.0.0"}`, protocol
`2024-11-05`, stdio transport only, no resources and no prompts. Contract constants
baked into `src/addressConfig.ts`: four.meme try-buy
`0xF251F83e40a78868FcfA3FA4599Dad6494E46034`, with buy, sell plus create all pointing
at the same `0x5c952063c7fc8610FFDB798152D69F0B9550762b`.

### The four defects, in the order they bite

1. **A clean install of the published package will not start.** `@pancakeswap/sdk`
   is pinned as `^5.8.8`, which now resolves a `@pancakeswap/swap-sdk-evm` that
   imports `SCALED_UI_DENOMINATOR` from a `@pancakeswap/swap-sdk-core` version the
   range also allows. Node throws before `main()` runs. The repo's own
   `package-lock.json` still installs cleanly, so `npm ci` from source is the only
   working path.
2. **A from-source build will not start either**, because two files import
   `../responseUtils` without the `.js` extension that Node's ESM resolver requires.
   Adding the extension to both was enough to get `tools/list` answering.
3. **Nine of eleven tools cannot run on Linux.** `getAccount()` calls
   `getPassword()`, which calls `showInputBoxWithTerms()`, whose `switch (platform)`
   has a `darwin` branch, a `win32` branch and a `default` that rejects. Any
   server-side or CI use is out. The two that work without a wallet are
   `Token_Security_Check` and `QueryMemeTokenDetails`, one of which returns nothing
   useful and the other of which is dead.
4. **`Token_Security_Check` fails quietly.** It calls GoPlus with the caller's
   address string, then reads `res.result[tokenAddress]`. GoPlus returns the map
   keyed by the lowercase address, so a checksummed input yields `{}` and the tool
   still reports `Security check successful`. A silent empty security report is
   worse than an error, because a calling agent will treat it as "no risks found".

### What a marketplace can actually do with it

Not use it as an execution engine. It holds a raw private key, decrypts it behind a
desktop GUI prompt, keeps it in a deobfuscatable in-process buffer for an hour and
cannot run headless. That is the opposite of what a hosted marketplace needs.

Three uses that do hold:

- **As the shape of a BSC action vocabulary.** Eleven tools that cover transfer,
  swap, LP add, LP read, LP remove, meme buy, meme sell and a security check is a
  usable inventory of what a BSC agent is expected to be able to do. Our own agent
  action schema can cover the same ground with better names and no wallet custody.
- **As a citation.** The BNB resources tab names it. Matching its vocabulary where
  it is free to do so costs nothing and reads as familiar to a TermiX reviewer.
- **As a merged contribution.** Defects 2 and 4 are one-line fixes in a sponsor's
  own MIT repo, each independently reproducible with a command. Defect 3 is a
  contained change: add a non-interactive branch driven by an environment variable
  so the server runs on Linux. That is a real PR that the project wants, on the
  repo of the partner scoring us. It is worth doing on its own merits rather
  than as a stunt. Note there is no LICENSE file in the tree, so any reuse of their
  code needs our NOTICE to name the repo and the declared MIT grant rather than
  quote a copyright line that does not exist.

## 5. What "TermiX will hire from your marketplace" requires of us

Five gates. Each one is a thing a stranger has to get through with no help from us,
and each one has a verified constraint attached rather than a guess.

### Gate 1: a public URL that needs no login

Every path a judge might land on returns 200 to an anonymous fetch: the landing
page, each of the four category pages, every agent detail page, the compare view,
the report and every receipt. No wallet-connect wall in front of browsing. Their own
criterion is "Find, compare, hire, without instructions", so a connect prompt before
the first useful screen loses points before anything else is judged.

Verify it the way a stranger sees it, not the way we see it. A logged-in browser and
an authenticated `gh` call both pass regardless. The check is a cold `curl -s -o
/dev/null -w '%{http_code}'` per URL from a clean session, run again after the repo
flips public, including raw and blob links to any asset the writeup or the video
description names.

### Gate 2: a hire path an outsider completes unaided

The trap is copying TermiX. Their own path needs a wallet session over an EIP-712
signed nonce, an owned agent NFT to act as the client side, an ERC-20 `approve`, then
a `createOrder`, which is two on-chain transactions and a minted identity before any
work starts. A judge who has not minted an agent on our marketplace cannot finish
that. Three lanes instead, in this order of friction.

**Lane A, no wallet.** Every agent runs from the browser with no account, capped by
rate limit, producing the identical deliverable and the identical receipt a paid run
produces. This is table stakes and not a differentiator: the rival already publishes
a no-wallet trial URL in four of their listing descriptions. Being without one is the
only way it costs us.

**Lane B, wallet, minimum signatures.** Connect any BSC wallet, see the price before
signing, pay in USDC or USDT, get the deliverable. No identity NFT required to buy.
One `approve` plus one transfer. Better still, a plain transfer to a per-order
address, which is one signature and no allowance at all.

**Lane C, machine.** A whole hire completes over HTTP with no browser, then again over
MCP. Details in Gate 3.

Nothing in any lane may route through us. No email, no manual approval, no Telegram
handoff, no allowlist. We do not know which address TermiX judges from, so anything
gated on an address list fails by construction.

### Gate 3: the machine surface, in the shape their tooling can use

Verified: TermiX's own client is a skill package of Node scripts over their REST API,
plus a `.well-known` manifest. A recursive grep of the live 1.5.0 package finds no
`mcp` and no `x402`. So an MCP-only surface is one their own tooling cannot drive.

Ship four surfaces, then know which one they will actually reach for:

| Surface | Why | Their equivalent |
| --- | --- | --- |
| Public REST read API, no auth | The one their scripts can call today | `/api/v1/listings`, `/api/v1/stats/network`, `/api/v1/service-categories` |
| A `.well-known` manifest | Machine discovery without reading our docs | `/.well-known/aacp-agent.json` |
| An MCP server | This is an agent programme. Claude or Cursor users reach for MCP first | none, which is the gap to fill |
| An installable skill package | Their preferred distribution, one URL pasted into a chat | `https://termix.ai/skills`, a 134 KB zip |

Mirror their conventions where mirroring is free, because a reviewer who has just
read their API should not have to re-learn ours: `{ items, page, pageSize, total,
totalPages }` for lists, decimal display strings for money (`"5"`, not
`5000000000000000000`), ISO-8601 UTC timestamps, strict request schemas that 400 on
an unknown field, then a 403 whose `code` plus `message` state the exact shortfall.

### Gate 4: a way to pay us that does not need our help

This gate has the hardest verified constraints in the whole pass.

**The Binance Agentic Wallet is the default signer in their own tooling. It is also
mainnet only.** `TERMIX_WALLET_MODE` defaults to `agentic`, driven by the `baw` CLI
from `@binance/agentic-wallet` (1.9.0, published 2026-08-27). Their own doc says it
"supports BSC (56) and Base (8453) ... and no testnets". External signing also needs
Developer Mode enabled inside the Binance App, which expires and carries a daily
spend limit. Conclusion: **price on BSC mainnet, small.** A testnet-only hire path
cannot be paid by their default wallet at all. A large price also risks a daily limit
we cannot see.

**A single-signature gasless payment is not available in the tokens that matter.**
Binance-Peg USDC and BSC-USD both revert on `DOMAIN_SEPARATOR()`,
`authorizationState(address,bytes32)`, `nonces(address)` and `version()`, so neither
implements EIP-3009 nor EIP-2612. The x402 `exact` scheme's EIP-3009
`transferWithAuthorization` path is therefore closed on BSC for these two tokens.
Permit2 is deployed at the canonical `0x000000000022D473030F116dDEE9F6B43aC78BA3`
with 9152 bytes of code, so the Permit2 variant works after a one-time approve. That
is one extra transaction the first time, not a signature-only flow.

**So the payment design is:**

| Rail | Friction | Use it for |
| --- | --- | --- |
| Free trial, no wallet | zero | The judge's first look, plus every screenshot in the report |
| USDC or USDT on BSC mainnet, approve plus transfer | two signatures once, one after that | The real paid hire, the one that produces a settlement tx we can cite |
| Direct transfer to a per-order address | one signature, no allowance | The lowest-friction paid path, worth having as the default |
| x402 over the Permit2 variant | one-time approve then per-call signature | The Altana and AltLayer bonus, labelled a bonus rail in our own docs, never the main one |

**Price and speed, against measured market data.** The TermiX marketplace median is
70 USDC at 3 days across 509 published listings. The rival prices all four mandated
categories at 5 USDC and 1 day. Their criterion is "a price and speed that beat the
alternative". The alternative they will compare against is a human doing it.
Price at or below 5 USDC and deliver in seconds, not days. A sub-minute delivery is a
category difference from a one-day delivery. It is also the cheapest single way to
win the 30% on service value.

### Gate 5: a receipt they can check

TermiX's model, in their own words: the deliverable hash is written on-chain at
submit and payment releases against that hash rather than against a promise. Their
best-performing listing does the same voluntarily, shipping a `report.json` carrying
a keccak256 content hash. Copy the mechanism, because it converts our claims from
assertions into something a judge can recompute.

Every completed run produces:

- The deliverable bytes, canonicalised (sorted keys, no insignificant whitespace).
- `keccak256` over exactly those bytes, printed in the deliverable's own envelope.
- That hash committed on-chain, in the settlement transaction or as an ERC-8004
  feedback record against the agent's token id.
- A permanent public receipt page: the hash, the tx, the block, the inputs, the
  pinned block the answer was computed at, the model or code version, plus a one-line
  command a reader can paste to recompute the hash from the published bytes.

The test is that somebody who never paid us can verify a run we were paid for. That
is the only claim in the submission nobody can argue with.

## 6. The Agent Advantage Report, designed to their spec

Their spec has exactly four requirements. At least 3 real tasks. Each run both ways,
once with an agent hired through our marketplace and once done ourselves. Time, cost
plus output quality reported for each. At least one task from trading, stock or
security. The actual outputs attached.

Everything below is built so a judge can re-run it and get our numbers back. That is
the difference between "measured" and "asserted", which is the exact word their 30%
criterion uses.

### 6.1 The tasks

Every task is pinned to a block number, so the correct answer is a fixed value that
anyone can recompute forever. Every task has a machine-checkable ground truth. Every
task is a decision with a stated refusal condition, not an essay.

**T1. Grid trading go or no-go, with a stated record. (Trading. This is the task that
satisfies the high-stakes requirement.)**

Brief: for PancakeSwap V3 WBNB/USDT at block N, with capital C, a maximum acceptable
loss L over horizon H plus a maximum slippage S, return either a grid specification
(price bounds, step count, order size, fee tier, expected fee capture net of gas at
the current base fee, the inventory drift at each bound) or an explicit refusal naming
which limit fails. The deliverable must carry a backtest over a named historical
window reporting win rate, the window's exact start and end, maximum drawdown plus the
realised fee capture.

Why this task: the 20% criterion says in as many words that "Trading agents need a
real record: win rate, the window, and the risk taken to get there". Those three
fields belong in the deliverable schema as required keys, not in prose on a landing
page. This task is the one that proves them.

Ground truth: pool state, tick spacing, fee tier plus gas price are all reads at block
N. The backtest is reproducible from a published candle series with a published
script.

**T2. Lending health-factor rescue. (Security-adjacent, also the highest-stakes of the
four mandated categories.)**

Brief: for a named Venus borrower on BSC at block N, compute the smallest action that
lifts the account's health factor to a buyer-chosen target: either a repayment in a
named asset or a collateral top-up, whichever costs less all-in. Report the projected
health factor after the action, the liquidation price of the largest collateral asset
before plus after, the all-in cost including gas and swap slippage, then an explicit
expiry after which the plan is void.

Why this task: a human doing this by hand has to find the Comptroller, enumerate the
account's entered markets, read each vToken exchange rate, collateral factor plus
oracle price, then solve for the shortfall. It takes real time and it is easy to get
wrong by one factor. That gap is the whole point of the report.

Ground truth: every input is a read at block N. The arithmetic is closed-form, so the
recompute script produces one number to diff against.

**T3. PancakeSwap V3 LP range reset. (Rebalancing.)**

Brief: for a live position token id at block N, report whether the position is in
range, the uncollected fees per token, the break-even fee capture that would pay for a
reset (gas plus the swap slippage to rebalance inventory into the new range), then a
recommended new range or HOLD with the reason.

Why this task: the honest answer is often HOLD. An agent that says HOLD when HOLD
is right is worth more than one that always acts. A refusal or a HOLD that the ground
truth confirms should score full marks, so the rubric has to be written that way
before the runs start.

Ground truth: `NonfungiblePositionManager` plus pool reads at block N.

**T4. Stablecoin yield allocation with migration cost. (Yield. Optional for their spec,
required by the main-track Agent Diversity criterion.)**

Brief: across the Venus stablecoin markets at block N, return a liquidity-, concentration-
and risk-bounded allocation of a stated principal, otherwise HOLD. The deliverable must net the
migration cost (gas plus any exit slippage) against the APR gain and state the break-even
holding period in days, because an APR quote that ignores the cost of getting there is the
usual failure mode.

Ground truth: per-market supply rate, cash, total borrows plus reserves at block N. The
allocation is a bounded optimisation with a published objective function, so the script
reproduces it exactly.

**T5. Tokenized-equity execution check. (Stock. Buys the equities weighting outright.)**

Brief: for a named bStock on BSC at block N, report the token address, the deepest
PancakeSwap V3 pool with its fee tier, the mid price in USDT, the price impact of a stated
market buy, the holder-facing balance conversion applying `uiMultiplier()`, then a go or
no-go against a stated maximum slippage.

Why this task: it is the only one where the human control has a specific trap waiting.
bStocks are BEP-20 with a scaled-UI multiplier hook. `uiMultiplier()` on METAB is verified
live and returns 1e18 today, so a naive `balanceOf / 1e18` happens to be right now and
would be wrong the moment the multiplier moves. An agent that reads the multiplier is
correct by construction. A human who does not know the hook exists is correct by luck.
Note honestly in the report that no divergence from 1e18 was observed, so the trap is
latent rather than triggered.

Ground truth: token reads plus pool reads at block N, all on-chain.

### Which of the five to run

Their spec needs three. Run all five. T1 satisfies the trading mandate on its own, so T5
is upside rather than insurance. T1 through T4 are exactly the four mandated
categories the main-track Agent Diversity criterion scores. One set of runs feeds two
rubrics, so the marginal cost of the fourth and fifth pair is one afternoon. If time
collapses, the three that must survive are T1 (mandate), T2 (highest stakes) and T3
(rebalancing is listed first in the programme's own category table).

### 6.2 Measuring time

**Agent arm.** `t0` is the server-side timestamp when the brief is accepted, `t1` is the
timestamp when the deliverable becomes retrievable. Both come out of our own request log
or the settlement transaction, never a stopwatch. Publish `t0`, `t1`, the source of each
and the elapsed seconds. For a paid run also publish the payment tx timestamp, so a judge
can see whether we measured from payment or from brief and can recompute either.

**Control arm.** A screen recording with a visible clock, started when the operator first
reads the brief, stopped when the operator commits the final answer. Report active
minutes and the recording length separately. Any pause is logged in the recording with
its reason. Publish the recording.

**Both arms get the byte-identical brief**, published in the bundle as `brief.md`, with
the same acceptance criteria and the same required field list. A control that was told
less than the agent is a rigged comparison. A reviewer who has read many of these
reports will look for exactly that.

### 6.3 Measuring cost

Every figure in the agent arm traces to a transaction hash or a request log line. No
estimates.

| Component | Agent arm | Control arm |
| --- | --- | --- |
| Service price | The amount actually settled, read off the transfer or settlement tx | not applicable |
| Gas | Actual gas used times effective gas price, from the receipt | Gas for any transaction the control had to send |
| Protocol fee | Whatever our own contract took, read on-chain | not applicable |
| Labour | Zero minutes of operator time, stated plainly | Active minutes times a published hourly rate |
| Data or API | Any paid call the agent made | Any paid call the control made |

Publish the hourly rate as a number, not a person. State it in the bundle so a judge who
thinks the rate is wrong can substitute their own and recompute. Convert everything to USD
at one BNB price with the source named and the timestamp recorded. The Binance public
ticker is the source we already verified working: `GET
https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT` returned 720.62 during this
pass.

Report the honest total, including the case where the agent arm costs more in dollars and
wins on time. Padding the control's rate to manufacture a cost win is the single easiest
thing for a reviewer to catch, because the rate is the only number in the report they can
argue with.

### 6.4 Measuring quality

**Freeze the rubric before either arm runs.** Write it, commit it, publish the commit hash
in the report. A rubric written after the outputs exist is not a measurement.

**Score the numeric part with a script, not with judgement.** Each task ships
`ground-truth/recompute.mjs`, which reads chain state at the pinned block and emits
`expected.json`. The scorer diffs both arms' answers against `expected.json` field by
field, with a stated tolerance per field. Publish the script, the expected file plus the
tolerance table.

Per task, out of 100:

| Component | Points | How it is scored |
| --- | --- | --- |
| Correctness | 50 | Field-by-field diff against `expected.json` within the published tolerance |
| Completeness | 20 | Required fields present, from the field list in `brief.md` |
| Calibration | 15 | Does the output state its own bounds, its inputs plus its expiry. Does it refuse when the evidence does not support an action. A correct refusal scores full marks |
| Reproducibility | 15 | Does the output carry the pinned block, the source reads plus a content hash a reader can verify |

**Anything not machine-checkable goes to two blind graders.** They did not run either arm.
They receive both outputs with every marker of origin stripped, in a randomised order,
and score against the frozen rubric. Publish both grader sheets including the
disagreements. Never average a disagreement away in silence, because the disagreement is
information about how hard the task was.

### 6.5 The control condition, stated plainly

This is where most reports of this kind cheat, so state it in the report itself rather
than burying it.

- The control is a competent operator doing the task unaided, with the same brief, the
  same acceptance criteria and the same field list.
- **The control may use a general-purpose LLM chat.** Banning one builds a straw man.
  A reviewer will assume we banned one to flatter the agent. What the control may not
  use is our marketplace, our agent's code, our agent's output or any of our internal
  tooling.
- The control runs first. If both arms run in parallel, the control runs on an
  independent machine by a person who has not seen the agent's answer. Record the order
  per task in the bundle.
- The control is not asked to work under time pressure and is not interrupted. A rushed
  control inflates the agent's win.
- If the control wins a task on time, cost or quality, publish it and say so in the
  headline table. A report where the agent wins five out of five by a wide margin reads
  as manufactured. One honest loss makes the other four credible.

### 6.6 The evidence bundle

"With the actual outputs attached" is a literal requirement, so the bundle is a directory
in the public repo rather than a PDF. A PDF cannot be re-run.

```
aar/
  INDEX.html                  the numbers up front, every figure linking to its file
  MANIFEST.json               every file with its sha256, plus the aggregate totals
  VERIFY.md                   one command that re-runs every recompute and diffs
  rubric.md                   frozen before any run, with the freezing commit hash
  rates.md                    the hourly rate and the BNB price source, as numbers
  T1-grid/
    brief.md                  byte-identical text handed to both arms
    agent/
      request.json            exactly what was sent
      response.json           the raw deliverable, unedited
      receipt.json            content hash, on-chain tx, block, code version
      tx.txt                  payment and settlement tx hashes
      timing.json             t0, t1, elapsed, source of each
      cost.json               price, gas, fee, total in USDC and USD
    control/
      recording.mp4           screen capture with a visible clock
      notes.md               what the operator did, in order
      answer.json             the control's final answer in the same schema
      timing.json             active minutes, recording length, logged pauses
      cost.json               minutes, rate, data costs, total
    ground-truth/
      block.txt               block number, its timestamp, the RPC endpoint used
      recompute.mjs           reads chain state at that block, emits expected.json
      expected.json           the answer, regenerable
      tolerance.json          per-field tolerance used by the scorer
    score/
      score.json              per-component points for both arms
      grader-a.md             blind sheet
      grader-b.md             blind sheet
  T2-health/ ... T5-bstock/   same shape
```

Two rules that make it hold up:

- **Every number in `INDEX.html` links to the file it came from.** A judge who will not
  clone anything still sees the result. A judge who will clone can land on the byte
  that produced any figure in one click.
- **`VERIFY.md` is one command.** Clone, run it, get the same `expected.json` for all five
  tasks because every read is pinned to a block. Then say plainly which parts cannot be
  reproduced: the control's wall clock, the graders' judgement, the live latency of the
  agent arm on the day. Naming the irreproducible parts is what makes the reproducible
  parts believable.

### 6.7 Reproducibility gate before we publish

Run these and record the output, the same way we gate anything else:

1. `node aar/T*/ground-truth/recompute.mjs` for all five, twice, on two different RPC
   endpoints. Identical output both times. Anything else means the task is not block-pinned.
2. `sha256sum -c` against `MANIFEST.json`, clean.
3. Every URL cited in `INDEX.html` fetched anonymously for a 200, including the repo, the
   receipts and the recordings.
4. A cold anonymous run of every agent through the free lane, timed, with the elapsed
   seconds inside the p95 the report claims.
5. `grep` the report text for em dashes and for `, and` plus `, or`, empty result.

## 7. The four weighted criteria, mapped to features and artifacts

### Value of the services, 30%

"Real working agents at a price and speed that beat the alternative. TermiX will hire from
your marketplace and evaluate the results."

| Feature | Artifact that proves it |
| --- | --- |
| Five agents that each return a decision, not prose, in under 60 seconds | A live latency panel driven by real completed runs, showing measured p50 and p95 per agent with the sample size |
| Price at or under 5 USDC, matched to the rival and 14x under the market median of 70 | A price panel putting our price beside the measured TermiX median (70 USDC, n=509) and the rival benchmark (5 USDC) |
| A free no-wallet run so value is visible before payment | The trial URL, plus the fact that the trial deliverable is byte-comparable to the paid one |
| A refusal path that says no when the evidence does not support an action | A published refusal rate per agent, with an example refusal and the reason |
| Sub-minute delivery against a 3-day market median | The receipt page for every run, carrying its own elapsed time |

The thing that actually wins this criterion is that they hire us and it works first time
with no help. Everything above is scaffolding for that one event.

### Proven agent advantage, 30%

"Measured, not asserted, backed by the required Agent Advantage Report."

| Feature | Artifact that proves it |
| --- | --- |
| The report is a first-class page on the product, not an attachment | `/report` on the live site, linked from the landing page, reachable with no login |
| Every figure traceable to a file | `INDEX.html` with per-figure links, `MANIFEST.json` with sha256 per file |
| A rubric nobody could tune after the fact | `rubric.md` plus the commit hash that froze it, before the first run |
| A judge can re-derive our numbers | `VERIFY.md`, five `recompute.mjs` scripts, five `expected.json`, the tolerance tables |
| The control was real | Five screen recordings, the operator notes, the published hourly rate |
| We published a loss | At least one task where the control wins a column, called out in the headline table |

### High-stakes categories and track record, 20%

"Trading, stock/equities and security agents weighted above general-purpose. Trading
agents need a real record: win rate, the window, and the risk taken to get there."

This criterion is the one most submissions will fumble, because a track record is work and
a category label is not.

| Feature | Artifact that proves it |
| --- | --- |
| The trading deliverable schema carries `winRate`, `windowStart`, `windowEnd`, `maxDrawdown` plus `riskTaken` as required keys | The JSON schema published on the agent page, plus a real deliverable that fills them |
| A track-record page per trading agent | The candle series used, the backtest script, the commit, the computed numbers, all published |
| An equities agent, so the stock weighting is claimed rather than argued | The bStocks agent, with `uiMultiplier()` handling shown in its own deliverable |
| A security-shaped agent whose finding is checkable | The health-factor agent, whose output is one number a script re-derives |
| An explicit statement of what the record is not | One line saying whether the record is a backtest or live capital. If it is a backtest, say so in the same sentence as the win rate |

The last row is the one that protects the other four. An inflated record is the fastest
way to lose this criterion. A backtest labelled as a backtest costs nothing.

### Marketplace quality, 20%

"Find, compare, hire, without instructions."

| Feature | Artifact that proves it |
| --- | --- |
| Category-first landing, all four mandated categories at equal depth | Four category pages, each with the same components filled to the same depth |
| A compare view on the fields that decide a hire | Side-by-side price, measured latency, refusal rate, track record, last-verified-live |
| Liveness as a measurement, not a badge | Last successful run per agent with its tx hash and timestamp, so "live" is clickable |
| Search that works with no wallet connected | The cold anonymous fetch sweep from Gate 1 |
| Every agent page carries its exact input schema plus a worked example | The schema block plus a copy-paste example on each page |
| Proof a stranger can do it | A recording of a first-time visitor completing a hire with no help, timed, published |

That last artifact is the literal test in their sentence. Hand the URL to somebody who has
never seen it, record them, publish the recording with the elapsed time. If they get
stuck, fix the product rather than the recording.

### One data-quality warning taken from their own numbers

TermiX's `/api/v1/stats/network` reports `liveServices: 10068` while their own
`/api/v1/listings` totals 509. It reports `verifiedAgents: 334739` against
`providersCount: 513`. Whatever the explanation, a judge who clicks through a big number
and cannot reach the rows behind it has found a data-quality problem. The main-track Data
Quality criterion says a user should be able to "make a genuinely informed call on which
agent to hire", so our rule is: never show a count we cannot click through to, then show
the registry count separately from the commercially live count. 334,739 registered against
513 selling is the single most useful fact about the BSC agent economy. Telling those
two populations apart is a product feature, not a footnote.

## 8. Interfaces and constants

### 8.1 TermiX BSC contracts, live at 2026-09-05

Read live from `GET https://platform-backend.prod.termix.live/api/v1/config/contracts`.
Their docs say never to hardcode these, which is correct, so treat the table as a snapshot
for orientation.

| Contract | USDC deployment | USDT deployment |
| --- | --- | --- |
| IdentityRegistry (ERC-8004) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | shared |
| TermixEscrow | `0x6A52ba4C84b348FaEAe13dDC7A97b4F6af23913C` | `0xCE02f987D8b8AF694E13C8a843Db9c77caBF544c` |
| TermixStaking | `0x0Bd066f5113e6B8336b06F8Aa3EF90D37F7e65FC` | `0x1DcafFB7275fa2650d480a4F939A0C0D5874750B` |
| TermixReputation | `0xFf3f7038c4919A420B30D7B3533cb386D5898189` | shared |
| CampaignVault | `0x5BaE7834B32a4b357F65dd20248068993466D294` | `0x16261F2BCbE8Ee47065C5ecB4be32c1571289809` |
| Settlement token | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` (USDC, 18 dp) | `0x55d398326f99059fF775485246999027B3197955` (USDT, 18 dp) |

Base (8453) runs the same contract set at different addresses with the identical
IdentityRegistry. All seven BSC proxies return exactly 170 bytes of code.

Verified live escrow parameters, USDC deployment:

```
protocolFeeBps()        = 200      # 2%
evaluatorFeeBps()       = 300      # 3%, taken from the order budget on a challenge
arbitratorFeeBps()      = 300      # 3%
challengeBondAmount()   = 0
minChallengeWindow()    = 86400    # 24 h
acceptWindow()          = 259200   # 72 h
verdictTimeout()        = 259200   # 72 h
```

Staking: `minPoolBalance() = 0`, `providerLockBps() = 0`, `requiredLock(1e18) = 0`. So a
provider can list without staking anything today. Reputation: `getScore(1) = 50`, the
Bayesian baseline for an agent with no settled history, which is also what every one of the
rival's five agents currently reads.

Fee arithmetic on a 100 USDC order: the provider nets 98. If the buyer challenges, the
three-seat evaluator panel takes 3% of the budget and an escalation to an arbitrator takes
another 3%.

### 8.2 The listing object, the shape a marketplace listing has to carry

From `GET https://platform-backend.prod.termix.live/api/v1/listings?pageSize=20`, real
response, trimmed.

```json
{
  "id": "cms5lieejux5rty01uf427usj",
  "title": "GEO Specialist | I will monitor how AI mention, rank and cite your brand",
  "category": "Market & Protocol Research",
  "skillTag": "AI Automation",
  "tags": ["AI Automation", "AI Agent Development", "Brand Strategy"],
  "status": "PUBLISHED",
  "instantBuyable": true,
  "basePrice": "5",
  "currency": "USDC",
  "priceLabel": "$5",
  "deliveryDays": 3,
  "deliveryLabel": "3 days",
  "proofMethod": "optimistic",
  "settlementType": "escrow",
  "chain": "BSC",
  "challengeWindowHours": 72,
  "bondAmount": "0",
  "providerAgent": {
    "agentTokenId": "243572",
    "name": "geox.agent",
    "tokenUri": "https://…/platform/agents/<sha256>.json",
    "a2aEndpoint": null,
    "a2aStatus": "ONLINE",
    "presence": "online",
    "lastSeenAt": "2026-09-05T01:12:05.369Z",
    "verified": true,
    "metrics": {
      "completedJobs": 4, "passRate": "1", "onTimeRate": "1",
      "stake": "0", "reputationScore": 100
    }
  },
  "metrics": {
    "ratingAvg": 0, "reviewCount": 0, "completedJobs": 4,
    "passRate": "1", "onTimeRate": "1",
    "avgFirstResponseMins": 2880, "avgDeliveryHours": null,
    "responseSampleSize": 1, "deliverySampleSize": 0,
    "stake": "0", "reputationScore": 100
  },
  "verified": true, "topRated": true, "pro": false, "saved": false,
  "createdAt": "2026-07-29T04:39:35.979Z", "updatedAt": "2026-07-31T04:40:15.763Z"
}
```

Two details worth copying. `avgDeliveryHours: null` with `deliverySampleSize: 0` is how they
say "we have no data" rather than showing a zero, which is exactly the honesty the Data
Quality criterion rewards. And the top-performing listing in the whole set writes its own
integrity guarantee into the description: "a machine-readable report.json ... carries a
keccak256 content hash, a fully auditable, verifiable deliverable". That listing also spells
out a HOW TO ORDER block with a paste-ready JSON brief. Both are free ideas.

Envelope for every list endpoint: `{ items, page, pageSize, total, totalPages, filters }`.
Unknown query parameters are rejected with a 400 rather than ignored, which is verified:
`?q=grid` returns 400.

### 8.3 The ERC-8004 registration JSON they mint

Fetched from a live agent's `tokenUri`. This is the shape our own agents' metadata should
follow, because it is what the sponsor's indexer already reads.

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "positioncrew-rescue-adf9.agent",
  "description": "Bounded BSC lending health-factor analysis and deterministic rescue planning with explicit cost, expiry, and no custody or autonomous transactions.",
  "image": null,
  "services": [
    { "name": "A2A",
      "endpoint": "https://platform-backend.prod.termix.live/api/v1/a2a/agents/{agentId}/card",
      "version": "0.3.0" },
    { "name": "Termix Platform",
      "endpoint": "https://platform-backend.prod.termix.live/api/v1/agents/{agentId}/services",
      "version": "aacp-platform-v1" }
  ],
  "x402Support": false,
  "active": true,
  "registrations": [],
  "supportedTrust": ["termix-platform"],
  "tags": ["bsc", "lending-risk", "health-factor"],
  "owner": "0xadd748c416e8a7efd7d65d18abb121dea268ddf9",
  "attributes": [{ "trait_type": "tag", "value": "bsc" }]
}
```

Note `x402Support` is a first-class boolean in their registration metadata. Every agent
in the manifest currently has it `false`. Setting it `true` and honouring it is a cheap,
visible differentiator that also feeds the Altana and AltLayer bonus criteria.

### 8.4 TermiX's public, unauthenticated endpoints

Verified 200 with no header. These are what a machine can read about us without an account,
so they are also the list we should be able to answer in kind.

```
GET /api/v1/config/contracts          chain, fees, settlement currencies, addresses
GET /api/v1/stats/network             volume, agents, jobs, services, latest block
GET /api/v1/listings                  paged listings, filters, 509 total
GET /api/v1/listings/:id              one listing in full
GET /api/v1/listings/price-range      {"minPrice":"0.01","maxPrice":"150250","currency":"USDC","listingCount":509}
GET /api/v1/listings/recommended      recommendations, optional ?briefId=
GET /api/v1/compare?listingIds=…      side-by-side comparison
GET /api/v1/service-categories        the category enum with labels, examples, icons
GET /api/v1/tags                      known tags
GET /api/v1/explorer/leaderboard      ranked by fees, with reputation and completed jobs
GET /api/v1/a2a/agents/:id/card       public agent card with live presence
GET /.well-known/aacp-agent.json      platform manifest, capabilities, 27 agents
```

Documented but not tested in this pass: `GET /api/v1/onchain/tx/:txHash`, the indexer view
of a transaction, which their own docs tell callers to poll instead of trusting a mined
transaction.

401 without a session: `/api/v1/stats`, `/api/v1/agents`, `/api/v1/requests`,
`/api/v1/bounties`.

Their `.well-known` manifest, trimmed:

```json
{
  "name": "Termix Platform Agent Gateway",
  "protocolVersion": "aacp-platform-v1",
  "endpoints": {
    "acnRpc": "/api/v1/acn/rpc",
    "a2aRpc": "/api/v1/a2a/rpc",
    "agentCard": "/api/v1/a2a/agents/{agentId}/card"
  },
  "capabilities": ["discovery","rfq","offer","reviseOffer","acceptOffer",
                   "evidence","arbitration","task-message","task-artifact"],
  "auth": ["api-key-scope","wallet-session"],
  "agents": [ /* 27 entries, each with id, agentTokenId, name, tags, status, card, tokenUri */ ]
}
```

### 8.5 Their hire path, end to end, so we can beat it on friction

```
POST /api/v1/auth/nonce                     {"walletAddress":"0x…"}   ->  EIP-712 typed data
       sign, exchange for a session JWT
POST /api/v1/listings/:id/instant-buy       session                   ->  straight to checkout
POST /api/v1/checkout/sessions              {offerId, revisionId, idempotencyKey,
                                             desiredStake, clientAgentId}
POST /api/v1/checkout/:id/tx-intent         {"action":"approveEscrow"} ->  unsigned intent
       sign and broadcast
POST /api/v1/checkout/:id/tx-intent         {"action":"createOrder"}   ->  unsigned intent
       sign and broadcast, keep the txHash
POST /api/v1/checkout/:id/confirm           {"txHash":"0x…"}
GET  /api/v1/onchain/tx/:txHash             poll until the indexer projects it
       provider accepts on-chain, delivers, then:
POST /api/v1/orders/:id/accept/prepare      {}                         ->  releaseEscrow intent
       sign and broadcast  ->  order SETTLED, provider paid budget minus 2%
```

Every state-changing call returns an unsigned tx-intent rather than broadcasting:

```json
{ "action": "submitDelivery", "chainId": 56, "contract": "0x…",
  "callData": "0x…", "value": "0", "status": "PREPARED", "nonceKey": "…" }
```

Intents are idempotent by `nonceKey`. Their own executor refuses to broadcast when the
intent's `chainId` does not match the live chain. Both are good patterns to copy.

Count the signatures: one for login, one for approve, one for createOrder, one for
releaseEscrow. Four signatures plus a minted client agent before money reaches the
provider. Our Lane B target is one.

### 8.6 `bsc-mcp` over the wire

Handshake and the first two tool schemas exactly as the server returns them. Full capture
in `raw/termix-bsc-mcp-tools-list-2026-09-05.json`.

```json
{"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},
 "serverInfo":{"name":"bsc-mcp","version":"1.0.0"}},"jsonrpc":"2.0","id":1}
```

```json
{"name":"Send_BNB",
 "description":"Transfer native token (BNB), Before execution, check the wallet information first",
 "inputSchema":{"type":"object",
   "properties":{"recipientAddress":{"type":"string"},"amount":{"type":"string"}},
   "required":["recipientAddress","amount"],"additionalProperties":false,
   "$schema":"http://json-schema.org/draft-07/schema#"}}
```

```json
{"name":"Remove_PancakeSwap_Liquidity",
 "description":"Withdraw your liquidity from PancakeSwap pools",
 "inputSchema":{"type":"object",
   "properties":{"positionId":{"type":"string"},
                 "percent":{"type":"number","maximum":100,"minimum":1}},
   "required":["positionId","percent"],"additionalProperties":false,
   "$schema":"http://json-schema.org/draft-07/schema#"}}
```

Ten of the eleven descriptions begin with an emoji in the real capture, the exception being
`QueryMemeTokenDetails`. Worth noting because a strict JSON-schema consumer is fine with an
emoji but a terminal renderer is not, plus it is the kind of detail that shows a reader we
ran the thing rather than read about it.

To reproduce the capture on Linux:

```bash
git clone --depth 1 https://github.com/TermiX-official/bsc-mcp.git && cd bsc-mcp
npm ci && npx tsc                              # npm install fails, npm ci works
# add the missing .js extensions in build/tools/goplusSecurityCheck.js
# and build/functions/fetchBalanceTool.js, then:
BSC_WALLET_PRIVATE_KEY=x BSC_WALLET_ADDRESS=0x00 node build/index.js
# send initialize, then notifications/initialized, then tools/list over stdio
```

### 8.7 bStocks constants, verified on BSC

Addresses taken from `https://tokens.pancakeswap.finance/pancakeswap-extended.json`, which
lists nine of them on chain 56, then confirmed with `cast`.

| Ticker | Address | Verified `name()` | Decimals |
| --- | --- | --- | --- |
| METAB | `0x7425889FE94F9d693E8daefE88BCCed6AcFEf4c0` | Meta Platforms | 18 |
| PLTRB | `0x0Ca5D51D0277Bd006fd9607d3E560785EBad8222` | Palantir Technologies | 18 |
| MSFTB | `0x80106cb3EAD06659A5ad19DF39D9b4733863B9b0` | not read this pass | 18 per the token list |
| MSTRB | `0xE87afb3076AeB0f9B14E368DE8145ae6a2826A14` | not read this pass | 18 per the token list |
| AMDB | `0x75Fd4cF6f8392E41E70391D60c90C0D5211603a1` | not read this pass | 18 per the token list |
| INTCB | `0xe614E2fc6C787035FF51f452e8E826Bfd32D5283` | not read this pass | 18 per the token list |
| LITEB | `0x64748BeA17b6D19e242ADf20425DE2440c656142` | not read this pass | 18 per the token list |
| EWYB | `0xBE82F76637DBA2C114C41Df856c2C51e522E2Cb8` | not read this pass | 18 per the token list |

The scaled-UI hook, verified on METAB:

```
uiMultiplier()          = 1000000000000000000      # 1e18 today
multiplier()            reverts
scaledUIMultiplier()    reverts
getMultiplier()         reverts
shareToAmount(uint256)  reverts
```

So the holder-facing amount is `balanceOf(a) * uiMultiplier() / 1e18`. Today that
happens to equal `balanceOf(a)`. Anything we publish about bStocks must apply the multiplier
rather than assume it, then say plainly that no divergence from 1e18 was observed.

Binance describes the 1:1 backing as a daily Proof of Collateral at an off-chain page, with
no attestation contract, oracle or on-chain reserve feed named. Do not claim on-chain
verifiable backing.

## 9. Rival intelligence, from TermiX's own data

TermiX's public manifest and listing endpoints are an unintentional rival scoreboard,
because hackathon entrants have been minting agents there. Twenty-seven agents in the
manifest, several of them clearly built for this programme.

**`positioncrew` is the closest rival and is further along than we are on shape.** Five
ERC-8004 agents on BSC, five live TermiX listings, one owner address
`0xadd748c416e8a7efd7d65d18abb121dea268ddf9`, one public trial site at
`https://positioncrew.dolepee.com` returning 200 anonymously.

| Their agent | Token id | Category | Price | Delivery | A2A status |
| --- | --- | --- | --- | --- | --- |
| positioncrew-lp-rebalance.agent | 266231 | rebalancing | 5 USDC | 1 day | OFFLINE |
| positioncrew-bounded-grid.agent | 266234 | grid trading | 5 USDC | 1 day | OFFLINE |
| positioncrew-yield-optimizer.agent | 266232 | yield | 5 USDC | 1 day | OFFLINE |
| positioncrew-lending-rescue.agent | 266229 | health factor | 5 USDC | 1 day | OFFLINE |
| positioncrew-rescue-adf9.agent | 293111 | health factor | 5 USDC | 1 day | ONLINE |

What they are doing well, verbatim from their own listing text: "The deliverable is
machine-readable JSON with source commitments, execution bounds, expiry, and an explicit
refusal when the evidence or buyer limits do not support a safe action. A no-wallet trial is
available at …". That is a strong position. It answers the refusal question, the
reproducibility question and the friction question in three clauses.

Where they are weak, all of it measured off TermiX's own API:

- **Zero track record.** All five read `completedJobs: 0`, `stake: "0"`,
  `reputationScore: 50`, which is the untouched Bayesian baseline. The 20% criterion asks
  for win rate, the window and the risk taken. They have listings, not a record.
- **Four of five agents are OFFLINE** on the A2A presence field, which TermiX derives from
  recent polling. Only the newest one is ONLINE.
- **One-day delivery.** Their own listings say 1 day. A sub-minute delivery is a different
  product against the criterion "a price and speed that beat the alternative".
- **Their category placement is loose.** Three of the four sit in "Market & Protocol
  Research" rather than in a trading or security category. The 20% criterion weights
  trading, equities plus security above general-purpose. Category choice is free points they
  left on the table.
- **No equities agent.** Nobody in the manifest covers tokenized stocks except one bStocks
  trading agent that is not theirs, so the "stock/equities" half of the 20% criterion is
  open.

Two other manifest entries worth knowing about: a bStocks trading and PancakeSwap V3 LP
assistant (token 315840, ONLINE), plus a payments agent tagged `payments, automation, x402,
webhooks, escrow, devops`. So somebody is already building the x402 angle.

### The call on listing our own agents on TermiX

Arguments for: TermiX's manifest is a list TermiX itself reads, the rival is already on it,
listing is off-chain and free, costing one afternoon. Arguments against: if TermiX
hires our TermiX listing instead of hiring through our marketplace, the hire does not test
the thing being judged, which is the marketplace.

The resolution is to do both without ambiguity. List on TermiX, then make each listing
description say in its first line that the service is delivered by our marketplace with the
URL, so a hire either way lands on our product. Keep prices identical across both so no
reviewer can find a discrepancy. Record the decision and the reasoning in the packet, since
"no TermiX integration is required" means this is a discretionary marketing move rather than
a requirement.

## 10. What this changes about the build

1. **Price at or under 5 USDC, deliver in seconds.** Both numbers are set by measured
   competition, not by taste: market median 70 USDC at 3 days, rival 5 USDC at 1 day.
2. **BSC mainnet only for the paid path.** Their default signer does not support testnets.
3. **One signature to hire, three lanes to get there.** Free, wallet, machine. Their own
   path costs four signatures plus a minted identity. That is the friction we beat.
4. **A keccak256 receipt on-chain per run, with a public verify command.** It is their own
   mechanism, so it reads as native rather than as invention.
5. **Ship a REST read API before an MCP server**, because their tooling can call REST today
   and cannot call MCP at all. Ship the MCP server too, since the wider programme is an
   agent programme.
6. **Five tasks in the report, not three.** T1 through T4 are the four mandated categories,
   which the main rubric scores separately, so the same evidence pays twice. T5 claims the
   equities weighting that nobody else has claimed.
7. **Freeze the report rubric now, before any run.** The 30% criterion turns on the word
   "measured". A rubric written after the outputs exist is not a measurement.
8. **Publish at least one loss.** Five clean wins reads as manufactured.
9. **Never show a count we cannot click through to.** Their own stats endpoint disagrees
   with their own listings endpoint by 20x. That is a Data Quality lesson available for
   free.
10. **`bsc-mcp` is a citation and a PR target, not a dependency.** It does not boot, two of
    its eleven tools are dead, nine cannot run on Linux, one fails silently. Fixing the
    silent failure and the ESM imports is a genuine contribution to the repo of the partner
    scoring us.

## Sources

Pages read live on 2026-09-05:

- `https://www.bnbchain.org/en/hackathons/smart-money-era` (main rubric, TermiX track,
  Agent Advantage Report spec, resources). Saved to
  `raw/bnb-hackathon-page-2026-09-05.txt`.
- `https://www.agent.family/campaigns/bnb-build-the-era` (TermiX's own statement of the
  track). Saved to `raw/termix-campaign-bnb-build-era-2026-09-05.txt`.
- `https://termix.ai/` and `https://www.agent.family/`, `/onboarding`,
  `/explorer-agents`, `/campaigns`, `/search`. Home text saved to
  `raw/termix-home-2026-09-05.txt`, which drifted from the 2026-08-27 capture in two
  places: skills version 1.2.0 to 1.5.0, plus a new "Browse campaigns" link.
- `https://docs.termix.ai/llms.txt` (27 doc pages plus one OpenAPI link). Saved to
  `raw/termix-docs-llms-2026-09-05.txt`.
- Sixteen doc pages fetched as markdown and saved to `raw/termix-docs-2026-09-05/`:
  `aacp/network`, `aacp/authentication`, `aacp/contract-reference`, `aacp/orders`,
  `aacp/a2a`, `api-reference/overview`, `api-reference/config`, `api-reference/listings`,
  `api-reference/offers`, `api-reference/stats`, `api-reference/agents`,
  `api-reference/requests`, `api-reference/bounties`, `api-reference/realtime`,
  `product/settlement`, `skill/overview`.
- `https://docs.termix.ai/api-reference/openapi.json` (the Mintlify Plant Store
  placeholder).
- `https://termix.ai/skills`, the live 1.5.0 skill package, 134,040 bytes, redirecting to
  S3, unpacked and grepped. Three files read in full and saved as
  `raw/termix-skill-1.5.0-SKILL-2026-09-05.md`,
  `raw/termix-skill-1.5.0-wallet-login-2026-09-05.md` plus
  `raw/termix-skill-1.5.0-client-checkout-fund-2026-09-05.md`.
- `https://registry.npmjs.org/@binance/agentic-wallet` and
  `https://registry.npmjs.org/bnbchain-mcp`.
- `https://www.bnbchain.org/en/blog/introducing-bstocks-on-bnb-chain-trade-24-7-with-zero-fees-deploy-across-defi-protocols-with-full-self-custody`
  plus a web search for bStocks. Tickers and DeFi integrations from there, addresses from
  the PancakeSwap token list, values from `cast`.
- `https://tokens.pancakeswap.finance/pancakeswap-extended.json` (977 tokens, 9 bStocks on
  chain 56).
- `https://discord.com/api/v10/invites/Tb2SQBXBx` (expired).

Live API calls, all anonymous unless noted:

- `https://platform-backend.prod.termix.live/api/v1/config/contracts` saved to
  `raw/termix-config-contracts-bsc-2026-09-05.json`.
- `.../api/v1/stats/network` saved to `raw/termix-stats-network-2026-09-05.json`.
- `.../api/v1/listings?pageSize=100&page=1..6`, page 1 saved to
  `raw/termix-listings-page1-2026-09-05.json`.
- `.../api/v1/listings/price-range`, `.../api/v1/service-categories`,
  `.../api/v1/explorer/leaderboard`, `.../api/v1/a2a/agents/:id/card`.
- `.../.well-known/aacp-agent.json` saved to
  `raw/termix-wellknown-aacp-agent-2026-09-05.json`.
- `https://aacp-backend.termix.live/...` (503 on every path).
- `https://app.termix.ai/api/bscBalanceCheck` (301 then 404).
- `https://www.four.meme/meme-api/v1/private/token/query` (404).
- `https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT` (200, 720.62).
- `https://positioncrew.dolepee.com` (200).

Code read and executed:

- `github.com/TermiX-official/bsc-mcp` at `a0aa570c672b412c347ce821d42d93e5432d2de5`,
  cloned, `npm ci`, `npx tsc`, run over stdio. `tools/list` and four `tools/call` captures
  saved to `raw/termix-bsc-mcp-tools-list-2026-09-05.json`.
- `github.com/TermiX-official/termix-agent-skills` (the AACP testnet skill, chain 97) and
  `github.com/TermiX-official/aacp-whitepaper`, both cloned. The testnet skill's env doc
  publishes a bearer token in the repo, which is not reproduced here.
- The `TermiX-official` org repo list via `gh api /users/TermiX-official/repos`: ten public
  repos, `bsc-mcp` 105 stars, `cryptoclaw` 101, `binance-mcp` 97, `defai-protocol` 77.

On-chain reads, `cast` 1.7.1 against `https://bsc-rpc.publicnode.com`, chain 56:

- `symbol()`, `decimals()`, `name()`, `totalSupply()` on the two settlement tokens plus
  METAB and PLTRB.
- `DOMAIN_SEPARATOR()`, `authorizationState(address,bytes32)`, `nonces(address)`,
  `version()` on both settlement tokens (all revert).
- `cast code` on all seven TermiX proxies plus canonical Permit2.
- `protocolFeeBps()`, `evaluatorFeeBps()`, `arbitratorFeeBps()`, `challengeBondAmount()`,
  `minChallengeWindow()`, `acceptWindow()`, `verdictTimeout()` on the USDC escrow.
- `minPoolBalance()`, `providerLockBps()`, `requiredLock(uint256)` on the USDC staking pool.
- `getScore(uint256)`, `priorTotal()`, `priorSuccess()` on reputation.
- `uiMultiplier()` plus four reverting probes on METAB.

Reused rather than re-derived: the x402 v1 and v2 specs plus the `exact` scheme bindings
already captured this session in `raw/x402-*-2026-09-05.md`. This pass added only the
BSC-token-side constraint, which is verified above.













