# As built, 2026-09-09

What shipped against the sixteen architecture documents, checked file by file against the code
and the live site, last reconciled 2026-09-09 (evening). The documents were written on 2026-09-05
and 2026-09-06 as the design. This file is the inventory. Where the two disagree, this file is
right about the build and the document is right about the intent.

The rule for every row: BUILT means the code path exists and is reachable on the live site or
runs as a worker or tool. PARTIAL means a narrower form ships and the difference is named. NOT
BUILT means nothing in the tree does it.

## What a judge can reach

| Surface | Status | Where |
| --- | --- | --- |
| Landing, with the measured population bars and the hireable panel | BUILT | `/` |
| Four shelves from one template, facets, five sorts, cards or table, paging | BUILT | `/shelf/<slug>` |
| Agent page: rung, record, probe history, parsed A2A or x402 or OASF body, on-chain feedback, hire block | BUILT | `/agent/<id>` |
| Compare, two to four agents | BUILT | `/compare?ids=` |
| Search across name, description and capability | BUILT | `/search?q=` |
| Status: index lag, rung counts, probe cycle, hire attempts, facilitator balance, Bazaar join, what is not done | BUILT | `/status` |
| Agent Advantage Report, three tasks both ways with outputs | BUILT | `/report`, `docs/AGENT-ADVANTAGE-REPORT.md` |
| Hire for a human, browser wallet, EIP-712, signer recovery, balance read, replay refused | BUILT | `/hire/<shelf>` |
| Hire for a program, HTTP 402 with requirements, verify then settle then deliver | BUILT | `GET /api/agent/<shelf>` |
| Free capability contract | BUILT | `GET /api/agent/<shelf>?preview=1` |
| Every page readable with scripting off, on a phone viewport | BUILT | verified by screenshot at 1440 and 390 |
| Static fallback at the same hostname when the app is down | BUILT | Caddy `lb_policy first` to a file server |
| Anonymous canary through the judging window | BUILT | `.github/workflows/canary.yml`, every 30 minutes |
| `/coverage`, `/docs` site, `/quality`, `/ledger`, `/partners`, `/stack`, `/v1` REST API, `/constants.json` | BUILT | all reachable and 200 on the live site |
| `/receipt/<id>`, `/operator`, `/badge`, MCP server | NOT BUILT | the landing bars and `/status` carry the coverage counts; a settled hire returns a tx hash |

## The index and the data

| Item | Status | Detail |
| --- | --- | --- |
| Count from the counter slot, ids from 0, `totalSupply()` reverts | BUILT | `lib/registry.ts`, shown with its block on `/` and `/status` |
| Full id sweep through Multicall3, resumable | BUILT | batch 40 with adaptive halving, not the 500 in the design, because larger batches drop entries silently on the live endpoints |
| Duplicate collapse on the tokenURI hash | BUILT | 118,683 identical `Ave.ai Trading Agent` records collapse to one row |
| Both spellings of the x402 claim | BUILT | `x402support` and `x402Support` |
| Probe cycle with SSRF guard, one request per host per cycle, 4 KB body kept and parsed | BUILT | `worker/probe.ts`, `lib/agentcard.ts` |
| Probe cadence on a schedule, `robots.txt`, per-host spacing | NOT BUILT | cycles are run by hand, four so far |
| Rungs can only rise on evidence | BUILT | `worker/shelve.ts` is monotone after a downgrade bug was found and repaired from probe history |
| Bazaar join on `payTo` | BUILT | 979 resources, 8 payout addresses, intersection of 1 |
| On-chain feedback from the Reputation Registry | BUILT | 27 listed agents, 266 entries, count plus distinct clients per agent page |
| Venus health factor by liquidation threshold, rows reconcile to `getAccountLiquidity` | BUILT | `lib/venus.ts` |
| Venus supply APY at a measured block time | BUILT | `lib/yield.ts` |
| PancakeSwap v3 pool read, tick to price through both decimals, fee tiers 100, 500, 2500, 10000 | BUILT | `lib/pancake.ts` |
| Second index as a cross-check with lag rendered | NOT BUILT | `/status` says "not cross-checked yet" rather than borrowing a number |
| Muster quality score with interval and sample size | NOT BUILT | rungs plus feedback counts stand in |
| Sampler time series over pools and accounts | NOT BUILT | spot reads only, which `15-SYSTEM.md` allows as its first cut |
| Log tail for `URIUpdated`, `MetadataSet`, `NewFeedback` | NOT BUILT | only one public endpoint serves logs and refuses history |
| Unknown never rendered as zero | BUILT | one CSS class, one component, judge walk clean |

## Money

| Item | Status | Detail |
| --- | --- | --- |
| x402 challenge in USD1 over `eip3009`, domain matched on chain | BUILT | JSON body in the Bazaar shape, plus a base64 `PAYMENT-REQUIRED` header and the amount under both field names |
| Local verification of the buyer's signature | BUILT | `lib/x402-local.ts` recovers the signer over the exact typed data |
| Settlement | BUILT | Muster submits `transferWithAuthorization` from its own key and pays gas (`lib/settle.ts`). All four reference agents have taken a real cleared USD1 payment on BSC mainnet — txs `0x487861e1`, `0x0974bf90`, `0x02178d0c`, `0xc5263b67` — and sit at the `settled` rung. `/status` shows the facilitator balance and settled count live. If the key runs out of gas, a valid signature is answered "settlement unavailable" rather than faked |
| Binance B402 verify and settle | NOT USED | needs a merchant account granted on request. Code present, unused |
| Two signatures, price plus fee | NOT BUILT | one signature, no fee leg, no treasury |
| ERC-8183 escrow index, settler, funded testnet job | NOT BUILT | out of scope for this entry, said on `/status` |
| Receipts with a recompute command, ledger hash chain, signed nightly dump | NOT BUILT | a settled hire returns a transaction hash and nothing more |
| Wallet screening at write time | NOT BUILT | not claimed anywhere |
| Four first-party agents on reserved ids, labelled ours everywhere they render | BUILT | ids 900000001 to 900000004, said to be reserved and "not a registry id" on every page (decision 18) |
| Four first-party agents registered on the Identity Registry | AVAILABLE, NOT RUN | `tools/register-agents.ts` is written, measured at 180,382 gas each, and the facilitator now holds gas to run it. Deliberately not run: it would delete the reserved-id rows the README judge path, the Altana table and the settled proof all reference, for marginal gain. The reserved-id design is the documented choice |

## Tracks

| Track | Status | Detail |
| --- | --- | --- |
| Main track, three published criteria | ENTERED | this repository is the submission |
| TermiX, Agent Advantage Report as the eligibility gate | BUILT | three tasks, both arms, outputs attached, one rerun recorded |
| PancakeSwap | PARTIAL | the LP Range Check agent reads live v3 pools; there is no LP rebalance agent that moves funds |
| Altana | BUILT | four self-custodial wallets, four sessions registered on chain 97 (grant txs `0x52ae9961`, `0x78fc025a`, `0xb7093356`, `0x052db360`), each with an allowlist, a daily cap and an expiry read live on `/altana`, plus a revoke control. Requirements 1–5 met on chain; `tools/altana-grant.ts` landed them |
| AltLayer | NOT FILED | credits, not cash |

## Operations

| Item | Status | Detail |
| --- | --- | --- |
| One `muster-web` unit, SQLite WAL, Caddy in front | BUILT | `deploy/` |
| Separate facilitator process holding the key on a unix socket | NOT BUILT | the web process loads the payout key, which holds gas only |
| Content-Security-Policy header | BUILT | a conservative CSP ships alongside HSTS, nosniff, frame deny and referrer policy: `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`, `form-action 'self'`, with script/style kept inline-capable for the no-flash theme setter and Next hydration |
| `npm test` suite | BUILT | node:test over the registry parser, the 402 builder, local EIP-3009 verification, the classifier and the SSRF guard |
| `npm run check` as one command | BUILT | typecheck, lint, test |
| `DATA-SOURCES.md` with a quoted clause per input | BUILT | including the endpoint split that keeps bulk reads off PublicNode |
| Demo video | NOT BUILT | offered once, not requested |

## Statements in the documents that this build overtakes

* `02-THESIS.md` section 1 promises a settled paid job behind every shelf row. No row has one.
  The shelves carry candidates with their rung and their named failure, which is the fallback the
  same document names in section 12.
* `02-THESIS.md` section 12 "Ships" table is the plan of 2026-09-05. Roughly half of it shipped.
* `15-SYSTEM.md` sections 1.3 and 11.3 name routes the app does not serve. `tools/judge-walk.py`
  is the real route list. Section 6.2 was corrected to the live hostname.
* `15-SYSTEM.md` section 10 describes a test plan that was not written as tests until 2026-09-09.
  What exists now is smaller than that plan.
* Every document dates its population figure. The figures moved from 334,935 on 2026-09-05 to
  341,231 on 2026-09-08. Each is right for its date.
* `03-TAXONOMY.md` section on routes (l.690 to 707) names `/c/<slug>`, `/categories/<slug>`,
  `/a/<agentId>/<listingId>`, `/receipts`, `/coverage` and `/docs/...`. None is served. The frozen
  slug `grid` shipped as `grid-trading`. The twelve sub-capabilities, the banded list, the off-shelf
  drawer and the search grammar did not ship; four of its fifteen facets did.
* `04-AGENT-PROTOCOL.md` requires `extra.decimals` on every 402 and the same object in header and
  body. Both now hold on the live 402, as of 2026-09-09. The other seven routes it specifies are
  not served.
* `05-ONBOARDING.md` "What ships" table (l.1311 to 1326): the buyer half shipped, the seller half
  did not. No claim signature, no lint, no gate, no BABT tier, no screening. One row in eleven is
  true as written.
* `06-QUALITY.md` "Ships" paragraph (l.1235 to 1246) describes a score, an interval, category metrics
  and Validation Registry pairs, none of which exist. `listing.scoreValue` and `scoreConfidence`
  are columns nothing writes. Its rule at l.31 that a number without freshness, sample size and
  interval is not shown applies to scored numbers only; counts on the landing page carry a block
  and a date and no interval.
* `10-DOCS-AND-POLICY.md` assigns the id sweep to `bsc.rpc.blxrbdn.com` and calls
  `bsc-dataseed.binance.org` off the shipped path. As built, bulk reads go to the dataseed endpoints
  BNB Chain publishes for programs, under their stated 10K per 5 minutes. PublicNode carries
  single reads only. `DATA-SOURCES.md` is the current table and the tail sweep of 2026-09-09 ran on
  those endpoints with written equal to read.
