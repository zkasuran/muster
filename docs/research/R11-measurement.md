# R11 measurement: pointer

The full document is **`three/research/MEASUREMENT.md`**. It carries the method, every command, the
Wilson intervals, the interfaces and the raw file index. This page is the numbers a document author
needs without opening it.

Measured 2026-09-05, BSC chain id 56, at block 120,027,164 (2026-09-05T02:02:32Z).

## The numbers

| Fact | Value |
| --- | --- |
| ERC-8004 agents ever registered on BSC | **334,935** (registry counter `_lastId`, one storage read) |
| Top live agentId | 334,934. `ownerOf(334935)` reverts `ERC721NonexistentToken` |
| First agentId | **0**, not 1. `agentId = $._lastId++` in every `register` overload |
| Id allocation | sequential, gapless. 55 `Registered` logs over 5,000 blocks give ids 334,880 to 334,934, span equals count, 55 matching mint `Transfer`s |
| 8004scan's count of the same registry | 303,461 from `/agents`, 304,281 from `/stats/global`. Short by 31,474, which is 9.40% |
| Why | its BSC indexer reports `down`, canonical checkpoint block 119,687,744 written 2026-09-03T18:09:16Z, age 32.6 h, newest processed event block 119,985,609 |
| Registration rate now | 0.011 per block, about 2,110 per day. 8004scan says 2,254 |
| Registry genesis | block 79,094,807, 2026-02-03T17:01:53Z. Mean block time since 0.4504 s |

## The 600-agent uniform sample

splitmix64, seed `20260905`, ids 0 to 334,923, rejection-sampled, no `Math.random`.
Reproduce with `node tools/r11-sample.mjs`. First 8 ids in draw order: 298939, 282263, 288202, 44429,
334103, 176405, 114427, 192976. Validated against 8004scan population shares: A2A 8.67% sample against
9.19% population, MCP 2.00% against 1.77%, OASF 0 of 600 against 0.12%.

| Metric | Of 600 | 95% Wilson |
| --- | --- | --- |
| registration document parses as JSON | 570 = 95.00% | |
| declares any `http(s)` endpoint | 284 = 47.33% | 43.37 to 51.33 |
| declares a concrete endpoint, no template | 233 = 38.83% | 35.02 to 42.79 |
| declares only a templated endpoint | 51 = 8.50% | 6.52 to 11.00 |
| declares no endpoint at all | 316 = 52.67% | 48.67 to 56.63 |
| endpoint answers 2xx or 3xx | 230 = 38.33% | 34.53 to 42.29 |
| every reachable endpoint is an HTML page | 218 = 36.33% | 32.58 to 40.26 |
| **machine-callable (T2)** | **12 = 2.00%** | 1.15 to 3.46 |
| **payable by a stranger (T3)** | **0 = 0.00%** | 0 to 0.64 |
| `getAgentWallet` non-zero | 600 = 100% | 99.36 to 100 |
| `getAgentWallet` differs from `ownerOf` | **0 = 0.00%** | 0 to 0.64 |
| `x402Support: true` declared | 24 = 4.00% | 2.70 to 5.88 |
| endpoint actually returned a 402 | 0 = 0.00% | 0 to 0.64 |
| shares the name `Ave.ai Trading Agent` | 215 = 35.83% | 32.10 to 39.75 |
| distinct names | 322, of which 312 are singletons | |

All 12 T2 agents are one product (`Q402 Agent (by Quack AI)`) on one host, under 12 distinct owner addresses. 229 distinct endpoint URLs
sit on **9 hosts**. `evoevo.ai` holds 217 of the 229.

The T-tiers are defined in full in MEASUREMENT.md. T0 parses plus concrete endpoint, T1 adds DNS plus
TLS plus 2xx or 3xx, T2 adds a JSON or protocol response on an API-named service, T3 adds a payment
destination a stranger can find without asking the operator.

## The four mandated categories barely exist

Sample of 600: rebalancing **0**, grid **0**, yield **1**, health factor **0**.
Population via the 8004scan search index over 303,461 agents: rebalancing **47**, grid **20**, apy
**430** (yield 290), health factor **21**. Most generous single term each sums to **518 agents, 0.17%**.
For scale, `trading` matches **129,023** agents, 42% of the index.

## Feedback, swept over every id on chain

`getClients` over all 334,935 ids then `getLastIndex` per pair, 0 errors, cross-checked with `getSummary`.

| Fact | Value |
| --- | --- |
| Agents with at least one feedback | **4,406 = 1.32%** |
| Total feedbacks | **29,712**, of which revoked **0** |
| Distinct client addresses in the whole graph | **111** |
| Busiest client | left feedback on **1,800** agents. Next two: 1,137 and 924 |
| Concentration | 95 agents hold 50%, top 100 hold 52.35%, 3,708 agents have exactly one |
| Agents with feedback whose id is 300,000 or above | **9** of 4,406 |
| 8004scan's count | 11,780, so the indexer holds **39.6%** of on-chain feedback |
| What the feedback measures | of 950 sampled rows, 844 tag a persona trait (`personality`, `knowledge`, `relationship`, `style`, `stance`, `timeline`), 68 tag `uptime` or `responseTime`, **0 tag a financial outcome** |

## The previous pass's four claims

1. **"2 of 400 publish a callable endpoint."** Corrected upward, shape confirmed. 12 of 600 = 2.00%
   reach machine-callable, 0 of 600 reach payable. 0.50% sits between the two tiers.
2. **"166 of 400 share the name Ave.ai Trading Agent."** Confirmed exactly on its own capture
   (166 of 400, 41.5%). Now 35.83% (32.10 to 39.75) and falling, because the cluster is thin in the
   47,000 ids added since.
3. **"0 of 400 declare a payout wallet."** Right conclusion, wrong mechanism. `getAgentWallet` is
   non-zero for 600 of 600 because `register` writes `msg.sender` at mint. The claim holds only as
   "0 declare a wallet distinct from the holder", which is 0 of 600.
4. **"id 1 has answered 404 since 2026-05-20."** Wrong on every clause but the date. Id 1 is
   `ClawNews`. The 404 is 8004scan's single domain-verification check timestamped
   2026-05-20T20:22:51Z, never re-run in 108 days. It was about the `.well-known` file, not the
   endpoint. Live today `https://clawnews.io` fails at TLS (`ERR_TLS_CERT_ALTNAME_INVALID`, the served
   certificate is `*.up.railway.app`), not with a 404. 8004scan still scores the agent `health_score:
   100.0`.

## One-line reproduction of the headline

```bash
cast storage 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 \
  0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00 \
  --rpc-url https://bsc-rpc.publicnode.com | xargs cast to-dec
```
