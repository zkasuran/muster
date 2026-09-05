# R17: Binance Agent OS, B402 and the Bazaar

Researched 2026-09-05, after the first sixteen passes. It belongs with them because it changes the
thesis rather than decorating it. Everything marked verified was run here. Everything marked
documented is Binance's own wording that has not been confirmed against a live call.

## Headline

Binance shipped the plumbing and skipped the shopfront. Agent OS is a connectivity layer. Its
discovery layer, B402 Bazaar, is a JSON API with **no human-facing browse UI at all**. That is the gap
the hackathon is asking to be filled. It can now be said from Binance's own docs rather than
asserted.

Second finding, the one that changes the build: **Bazaar is a live, unauthenticated index of 979
paid endpoints on BSC where every entry has taken at least one confirmed on-chain payment.** Our
census of ERC-8004 found the opposite population, hundreds of thousands of identities with almost no
payable endpoint. The two join on the payout address. Identity plus proof-of-payment is the thing
neither index has on its own.

Third finding, which tempers the second and is the reason this pass measured instead of reading:
**979 endpoints belong to 8 payout addresses. One of them holds 941 of them, 96 percent.**

## What Agent OS is and is not

"Binance Agent OS is a developer toolkit for connecting AI agents to Binance." It launched
2026-08-20 as part of Binance Intelligence. The model is that agents live in the developer's own
environment and reach into Binance: "Works With Your Existing AI Agent Stack."

There is **no agent hosting, no agent registry, no agent directory and no listing flow** anywhere in
the product. The only catalogue is Skill Hub, which lists *skills* rather than agents. ERC-8004 is
never mentioned. MCP is the only standard cited. Neither "BNB Agent Studio" nor "BNB Chain" appears
on the Agent OS page.

That matters for positioning. Agent OS answers "how does my agent reach Binance". It does not answer
"which agent should I hire", which is the question the main-track rubric is scored on.

## The components, verified

| Component | What it is | Where |
| --- | --- | --- |
| Binance MCP Server | CEX trading and market data over streamable HTTP MCP | `https://agent.binance.com/mcp/agentic` |
| Skill Hub | 19 first-party skills, installed with `npx skills add` | `binance/binance-skills-hub` on GitHub |
| Binance Pay (x402), also **B402** | the on-chain payment API, non-custodial, gas sponsored | `/en/docs/products/onchainpay-x402/` |
| B402 Bazaar | the discovery index over B402-registered paid endpoints | `https://www.binance.com/bapi/ramp/v1/public/ramp/b402` |
| Agentic Wallet | an MPC wallet under a Binance account that an agent transacts from | `web3.binance.com/agentic-hub` |
| Web3 APIs | on-chain data and DeFi access | `web3.binance.com/dev-portal` |
| Binance AI Pro | in-app assistant | not relevant to us |

**"B402" is Binance x402.** The `binancex402` page introduces B402 as the parenthetical short form of
the product name, so the two names in the hackathon material are one thing. That closes an ambiguity
the earlier passes carried.

## B402: the payment rail, now settled

This closes the biggest open question in `VERIFIED-payment-rail.md`. Binance's docs and my own
on-chain checks agree exactly, which is the strongest kind of confirmation available.

Three schemes, all EIP-712 off-chain authorization:

| Scheme | Mechanism | Tokens | Buyer setup |
| --- | --- | --- | --- |
| `eip3009` | the token's own `transferWithAuthorization` | **U and USD1 only** | none |
| `permit2-exact` | Permit2, exactly the stated amount | any ERC-20 | one `approve(Permit2, max)` per token |
| `permit2-upto` | Permit2, up to a ceiling the signature sets | any ERC-20 | same |

EIP-2612 `permit` is **not** a supported B402 scheme, despite several BSC tokens implementing it.

Mainnet tokens on `eip155:56`, every one 18 decimals:

| Token | Contract | Schemes |
| --- | --- | --- |
| U | `0xcE24439F2D9C6a2289F741120FE202248B666666` | eip3009, permit2 |
| USD1 | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | eip3009, permit2 |
| USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | **permit2 only** |
| USDT | `0x55d398326f99059fF775485246999027B3197955` | **permit2 only** |

Binance's own docs name USDT on BSC as the reason Permit2 exists. For USDT they call Permit2 "the
only path to `/papi/v2/b402/settle`". That is the same wall this lane hit by hand, solved the same way.

**The U token, verified on-chain here.** `cast` against `0xcE24439F2D9C6a2289F741120FE202248B666666`
returns `name()` "United Stables", `symbol()` "U", `decimals()` 18, `totalSupply()` 956,298,607.91. It
is an EIP-1967 proxy over implementation `0xbef21313c69c009fd7d9510a8d3a481a32473dfc`, whose bytecode
carries `transferWithAuthorization` (`0xe3ee160e`), `receiveWithAuthorization` (`0xef55bec6`),
`authorizationState` (`0xe94a0102`) and `permit` (`0xd505accf`). It does **not** carry
`cancelAuthorization`. `DOMAIN_SEPARATOR()` is
`0x358738403e5a61fdc30a8be78a60f289cbe4d2545b735a344b6229c70c1679b6`. `eip712Domain()` reverts, so the
domain name and version still have to be derived and matched the way FDUSD's were.

**Correction to `VERIFIED-payment-rail.md`.** That file recommended USD1 or FDUSD for the one-signature
path. FDUSD does implement EIP-3009, which was correct, but **B402 does not support FDUSD**. For a
B402-compatible one-signature hire the choice is **USD1 or U**. The live evidence below says USD1.

Testnet on `eip155:97`. Note that the decimals change between environments:

| Token | Contract | Decimals | Schemes |
| --- | --- | --- | --- |
| Mock U | `0x330949Aed7d00FCe0558C64ED6FeC9792616cC39` | **6** | eip3009, permit2-exact, permit2-upto |
| USDC | `0xEC1C60D64a06896Df296438c12edD14E974FDE47` | **6** | permit2 only |
| USDT | `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd` | 18 | permit2 only |

Mainnet U is 18 decimals and testnet Mock U is 6. Code proven on testnet breaks on mainnet by a
factor of a trillion unless `decimals()` is read at runtime. Binance's docs say the on-chain
`decimals()` is "the source of truth", which is the rule to follow rather than a constant.

Permit2 is at `0x000000000022D473030F116dDEE9F6B43aC78BA3` on both BSC mainnet and testnet, which
matches the deployment confirmed by hand earlier.

### The flow and who bears what


1. Merchant calls `POST /papi/v2/b402/supported` (RSA-signed, response cacheable) to learn the accepted
   methods, tokens and networks, plus `extra.signerAddress` and `extra.spenderAddress`.
2. Buyer hits the paid endpoint, merchant answers **HTTP 402** with `paymentRequirements`. The merchant
   **must** forward the facilitator addresses in that body, because "Buyers do not, and cannot, call
   /supported themselves" (their wording).
3. Buyer signs EIP-712 off-chain. No gas, no transaction.
4. Buyer retries with the signed payload in a request header.
5. Merchant calls `POST /papi/v2/b402/verify`, off-chain checks only, expects `isValid: true`.
6. Merchant calls `POST /papi/v2/b402/settle`. Async and idempotent: a pending result is
   `success: false` with a `transaction` hash and no `errorReason`, so poll until `success: true` or a
   real `errorReason`.
7. **The facilitator submits the transaction and sponsors the gas**, so the payer needs no BNB.
8. Merchant delivers the resource only after `success: true`.

For the Permit2 path the EIP-712 domain is `{name: "Permit2", chainId, verifyingContract:
0x0000...78BA3}` with **no `version` key**, adding one changes the separator and `/verify` fails with
`invalid_exact_evm_payload_signature`. `primaryType` is `PermitWitnessTransferFrom` over
`{permitted: TokenPermissions, spender: address, nonce: uint256, deadline: uint256, witness: Witness}`,
`TokenPermissions{token, amount}`, `Witness{to, validAfter}`. Field order is load-bearing and the struct
must be named exactly `Witness`. `spender` is `extra.spenderAddress`, the Permit2 proxy, **not** the
facilitator EOA. Read it fresh from `/supported`, because it changes on redeploy.
`witness.to` must equal `paymentRequirements.payTo`. Nonce is 256-bit random, deadline `now + 3600`,
`validAfter` `now - 60` for clock skew.

The trap the docs call out: `/verify` does **not** catch a missing Permit2 approval. That surfaces only
at settle as `invalid_transaction_state` with an on-chain `TRANSFER_FROM_FAILED`. A finite approval also
gets consumed, hence the max-approval recommendation.

BSC **mainnet access is "on request"** and needs a developer account application. Testnet is open. That
is a real schedule risk with four days left, so testnet has to be the provable path and mainnet the
upgrade.

## B402 Bazaar, measured rather than read

"B402 Bazaar is the discovery layer for B402-registered paid endpoints." It indexes services, not
agents. It does not proxy calls. Listing is opt-in and free: attach an `extensions.bazaar` blob to
`paymentPayload` on a **successful** V2 settle, then a 30-second indexer tick upserts it. Failed settles
do not count. The blob must ride every settle, since it is treated as a re-advertise signal. The
dedup key is `(merchantId, resourceUrl)`. It is Coinbase CDP wire-shape compatible.

The read API needs **no authentication**. Base
`https://www.binance.com/bapi/ramp/v1/public/ramp/b402`, with `GET /bazaar/resources` (limit 100),
`GET /bazaar/merchant?payTo=0x...` and `GET /bazaar/search?query=&network=&asset=&scheme=&payTo=&maxUsdPrice=`
(limit 20, no offset).

**What the full pull says.** All 979 entries fetched here on 2026-09-05 and saved to
`raw/b402-bazaar-resources-full-2026-09-05.json`:

| Measure | Value |
| --- | --- |
| resources | 979, every one `type: http`, every one `x402Version: 2`, every one `eip155:56` |
| **distinct `payTo` addresses** | **8** |
| largest merchant | `0x50ab2018c06c6e4eaa9ba52057eb55ed284912fc`, **941 of 989 accepts entries, 96 percent**, all on `*.theaslangroupllc.com` subdomains |
| the other seven | xona-agent 15, CoinMarketCap 14, hyreagent 11, bortagent 3, cournot 2, syraa 2, Nansen 1 |
| schemes | `eip3009` 979, `permit2-exact` 10 |
| assets | **USD1 958**, U 24, USDT 4, USDC 3 |
| prices | 0.02 to 0.25 token units, mode 0.10 |
| `lastUpdated` span | 2026-06-23 to 2026-09-05, median 2026-08-22 |
| category text hits | yield 38, security 53, monitor 45, trading 110, research 172, **health factor 4, grid 3, rebalance 2** |

Two consequences. The second corrects my own first read.

**The live ecosystem has standardised on USD1 over EIP-3009.** 958 of 989 accepts entries price in USD1
and 979 use `eip3009`. That is not a marketing list, it is what merchants actually chose. Quoting in
USD1 over EIP-3009 puts us where the supply already is. Permit2 in USDT is the compatibility path
rather than the default.

**Bazaar has the same concentration disease as ERC-8004 on BSC.** Our census found one operator holding
41 percent of a 400-agent sample under a single repeated name. Bazaar has 979 endpoints behind 8 payout
addresses with one at 96 percent. So both available indexes of BSC agent supply are dominated by a
single publisher, so **any marketplace that ranks by count reproduces one operator's catalogue**. That
is a measured argument for collapsing by operator and ranking by distinct-counterparty evidence. It
applies to both sources for the same reason.

**The `quality` block is documented but not delivered.** The docs describe
`quality: {l30DaysTotalCalls, l30DaysUniquePayers, lastCalledAt}` and describe a ranking built on buyer
diversity, recency plus a fail-rate filter that drops anything over 50 percent in 24 hours. Live it is
`null` on every entry across `/resources`, `/search` and `/merchant`. So the design **cannot** depend on
Bazaar usage counts. What it can depend on: the fact of listing, which requires a confirmed settle, plus
`lastUpdated`, which the docs say only advances on a settle. Treat everything else as unavailable until
Binance ships it.

## The join, which is the design consequence

Two indexes of BSC agent supply exist and each is missing what the other has.

| | ERC-8004 on BSC | B402 Bazaar |
| --- | --- | --- |
| population | ~287,000 registered identities | 979 paid endpoints |
| identity | agentId, owner, agentURI, metadata | none, only a `payTo` address |
| reputation | on-chain feedback, 11,719 records | none delivered |
| proof it works | almost none, our census found ~2 in 400 with a callable endpoint | **every entry, by construction, settled a payment** |
| price | not declared | declared, in atomic units |
| payment rail | not declared, 0 in 400 declared a payout wallet | declared, scheme plus asset plus network |
| a place to browse it | 8004scan, an explorer | **nothing** |

The join key is the **payout address**. ERC-8004 exposes `getAgentWallet(agentId)`. Bazaar exposes
`accepts[].payTo` plus a `GET /bazaar/merchant?payTo=` lookup. Match them and a row gains an identity, a
reputation trail, a price, a working endpoint and a rail that settles with sponsored gas. Neither source
produces that row alone.

Set expectations honestly, because the numbers are small. With 8 distinct Bazaar payout addresses, the
join will match a handful of rows at best today, since our census says almost no ERC-8004 agent declares a
wallet to match against. So the join is the **evidence ladder's top rung**, not the whole catalogue. It
is what makes "proven" mean something. The ladder below it still has to carry declared and probed
tiers for everyone else. Anyone claiming this join fills a marketplace has not counted it.

## Agentic Wallet is not a substitute for Altana

They look similar in a feature list and they are opposites where the Altana track scores.

| | Binance Agentic Wallet | Altana |
| --- | --- | --- |
| custody | **MPC, managed under a Binance account** | self-custodial, the agent holds its own key |
| where limits are enforced | server side, "at the API level" | on-chain, read from Keystore |
| controls | daily limit, tradable token scope, address-book allowlist | call allowlist, spend cap, **expiry** |
| expiry or TTL | **none documented** | required by the track |
| session keys | none documented | yes |
| on-chain permission record | **none**, only executed activity is auditable | **required**, "read onchain rather than from the pitch" |
| revocation | sign out of the session | user-visible in product, per the track |
| chains | BSC 56, Ethereum 1, Base 8453, Solana `CT_501` | per R06 |

So Binance Agentic Wallet **cannot satisfy the Altana bounty**, because that bounty is specifically
scored on sessions registered on-chain with an expiry. Carry both: Agentic Wallet as the convenience
path for a buyer who already has a Binance account, Altana as the self-custodial path with on-chain
readable scope. Saying why we carry both is stronger than picking one.

## Binance MCP server

`https://agent.binance.com/mcp/agentic`, streamable HTTP, no local install, no API keys on the device.
Auth is OAuth-style browser consent on a Binance "Agentic Account Access" screen. Four scopes chosen at
connect time: Market data, Account, Trade, Transfer. **Withdrawal is never available**, so funds cannot
leave the sub-account to an external address. Every write is confirm-before-execute. The agent operates
inside a dedicated "Agentic virtual sub" account. The only economic bound is how much you fund it,
because **no configurable spend limit exists**. An emergency stop disconnects all agents and cancels
spot, margin and futures positions and orders.

This is centralized-exchange trading and market data only. No chains, no addresses, no on-chain calls,
and x402 is not part of it. Tool and parameter names are not published on the page, so the real
inventory needs a live `tools/list` after connecting, failing that `developers.binance.com/en/docs/llms-full.txt`.

## Skill Hub

Nineteen skills, **all first-party** under `binance/binance-skills-hub`, installed with
`npx skills add <tree-url>`. Framed as "An open skills marketplace giving AI agents native access to
crypto", with "All skills are security-reviewed before listing" and **no documented third-party
submission path**. Two useful things here.

First, the `binance-agentic-wallet` skill covers x402 and HTTP 402 payments, DeFi including staking,
LPs, yield, health factor, APY and TVL, market and limit orders, quotes, plus approval review and
revocation. That maps onto three of the four mandated categories, so it is a real capability source for
reference agents rather than a directory to copy.

Second, "security-reviewed before listing" is the same gate model this lane already settled on for
listings, arrived at independently. Worth citing as precedent, not as a source.

Chain coverage across the read-only skills is BSC, Base, Solana, with Ethereum on the audit and
tokenized-securities skills. The site's own count disagrees with its grid (the FAQ says eight skills
live while the grid shows more), so treat the count as unstable and the names as the reliable part.

## The adjacent opportunity: Binance Agent OS Mini Hackathon

Separate programme, already in our opportunity tracker, closing **before** the BNB one.

* Pool 60,000 USDC. **Entries close 2026-09-08 23:59 UTC**, one day ahead of BNB's 2026-09-09.
* Track A, the build track, 20,000 USDC: 1st 2,000, 2nd 1,500, 3rd 1,000, then 300 each for the next 50
  winners. The post's own arithmetic leaves 500 unaccounted for.
* Track B, participation, 40,000 USDC: the first 10,000 eligible users to connect the MCP server and
  trade get 4 USDC each.
* Track A must be built with Agent OS. Components may be combined: "You're not locked into just
  one."
* Submission is off-platform. Follow @Binance, repost the announcement, reply or quote-repost with a
  video or demo plus GitHub, then complete the survey at
  `https://www.binance.com/en/survey/2913aa200aac462c89a737779393f3d4`.
* **No judging rubric is published** for Track A beyond "the best agent built with Agent OS".
* Excluded jurisdictions include the US, UK, EEA, Hong Kong and Singapore, plus Binance's prohibited
  list. India is not on that list.
* **Nothing is said either way about entering a project that is also entered elsewhere.** So it is not
  prohibited and it is not permitted. Do not assume. Note also that the BNB main track's own rule is one
  entry per team, which constrains that side rather than this one.

The overlap is real: a marketplace that hires over B402 and lists into Bazaar is, on its face, "an agent
built with Agent OS". Worth a decision rather than a reflex, with the decision recorded in
`three/decisions/`.

## What this changes, document by document

| Document | Change |
| --- | --- |
| `02-THESIS.md` | The strongest version of the thesis is now the join: ERC-8004 identity crossed with Bazaar proof-of-payment, plus the fact that Binance built the index and shipped no venue. Also add the honest ceiling, 8 payout addresses today. |
| `03-TAXONOMY.md` | Real supply counts per category from Bazaar: yield 38, health factor 4, grid 3, rebalance 2. Cluster collapse now has a second justification, since one merchant is 96 percent of Bazaar. |
| `04-AGENT-PROTOCOL.md` | The wire contract should match B402's 402 body. The `extensions.bazaar` blob is the machine-readable capability declaration Binance already indexes. MCP is Binance's chosen transport. |
| `05-ONBOARDING.md` | A Bazaar listing is evidence of a settled payment, so it is a probe we get for free. "Security-reviewed before listing" is precedent for the review gate. |
| `06-QUALITY.md` | Bazaar's documented ranking (buyer diversity, recency decay, fail-rate filter, micro-settle floor) is a validated anti-gaming design. State plainly that its `quality` numbers are null live, so we compute our own from settlements we broker. |
| `08-MONEY.md` | Settled. USD1 over `eip3009` as the default, Permit2 in USDT as the compatibility path, facilitator sponsors gas, `/supported` then 402 then `/verify` then poll `/settle`, read `decimals()` at runtime, mainnet is access-on-request so testnet is the provable path. |
| `11-BNB-STACK.md` | Draw the boundary: Agent OS is Binance, not BNB Chain. B402 settles on BSC, which is where they meet. |
| `12-BINANCE.md` | Rewrite against the real component map above rather than the blog wording. |
| `13-PARTNERS.md` | Agentic Wallet cannot satisfy the Altana bounty. The reason is the on-chain session record. Carry both paths. |
| `14-GAPS.md` | Bazaar's missing UI, the missing `quality` data, the mainnet access gate, the Mini Hackathon decision. |
| `15-SYSTEM.md` | The indexing pipeline gains a second source with its own cadence: 8004scan plus log backfill for identity, Bazaar for payability, joined on `payTo`. |

## Verified here

Each of these was run on 2026-09-05 and the command is reproducible.

* The U token's name, symbol, decimals, supply, proxy implementation and EIP-3009 plus permit support,
  by `cast` against BSC and a selector grep of the implementation bytecode.
* Bazaar is live and unauthenticated, 979 resources, with the full pull saved to
  `raw/b402-bazaar-resources-full-2026-09-05.json`.
* The 8 distinct payout addresses and the 96 percent concentration, computed from that pull.
* The scheme, asset, price and freshness distributions, computed from that pull.
* `quality` is null on every entry across all three read endpoints.

```bash
export RPC=https://bsc-rpc.publicnode.com
cast call 0xcE24439F2D9C6a2289F741120FE202248B666666 "symbol()(string)" --rpc-url $RPC
cast storage 0xcE24439F2D9C6a2289F741120FE202248B666666 \
  0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc --rpc-url $RPC
cast code 0xbef21313c69c009fd7d9510a8d3a481a32473dfc --rpc-url $RPC | grep -c e3ee160e

B=https://www.binance.com/bapi/ramp/v1/public/ramp/b402
curl -s "$B/bazaar/resources?limit=100&offset=0"
curl -s "$B/bazaar/merchant?payTo=0x50ab2018c06c6E4eAA9BA52057Eb55eD284912fc&limit=2"
curl -s "$B/bazaar/search?query=yield&limit=20"
```

## Documented but not verified

Do not state any of these as settled without a live check.

* Every B402 endpoint shape, error code and the RSA request signing. Nothing was called, because BSC
  mainnet access is on request and no developer account exists yet.
* The Permit2 typed-data details are transcribed from Binance's docs and have not been round-tripped
  through `/verify`.
* Testnet token decimals, taken from the docs table and not read on chain 97.
* The U token's EIP-712 domain name and version. `eip712Domain()` reverts, so it needs deriving and
  matching against the `DOMAIN_SEPARATOR` above, the way FDUSD's was.
* Every MCP tool and parameter name. The page publishes none.
* Whether the Mini Hackathon permits a project entered in another programme.
* Whether Bazaar's `quality` fields are unshipped, gated or populated only above some volume.

## Sources

Read 2026-09-05. Captures in `raw/` where saved.

* `https://www.binance.com/en-IN/agent-os`
* `https://developers.binance.com/en/docs/agent-native/mcp-server/agentic` (page modified 2026-09-04)
* `https://developers.binance.com/en/docs/llms.txt`, the docs index that revealed the B402 tree
* `https://developers.binance.com/en/docs/products/onchainpay-x402/basics/9.supported-payment-methods`
* `https://developers.binance.com/en/docs/products/onchainpay-x402/basics/8.typical-integration-flow`
* `https://developers.binance.com/en/docs/products/onchainpay-x402/open-apis-v2/4.permit2-signing`
* `https://developers.binance.com/en/docs/products/onchainpay-x402/b402-bazaar`
* `https://developers.binance.com/en/docs/products/agentic-wallet/welcome` (modified 2026-09-04)
* `https://developers.binance.com/en/docs/products/wallet-skills/supported-skills`
* `https://www.binance.com/binancex402`
* `https://www.binance.com/en/skills`
* `https://web3.binance.com/agentic-hub`
* `https://www.binance.com/en/blog/community/8802181509900814931`, the Mini Hackathon
* `raw/b402-bazaar-resources-full-2026-09-05.json`, `raw/b402-bazaar-search-price-2026-09-05.json`




