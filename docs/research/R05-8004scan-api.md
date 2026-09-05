# R05: the 8004scan API, settled

Research pass run 2026-09-05, 01:04 to 02:25 UTC. Every number below came from a
call made in that window or a page read in it. The command or URL sits next to the
claim. Where the live answer disagrees with the 2026-08-27 local capture, both are
shown.

---

## Headline

8004scan has a real, deep, free REST API (150 routes, OpenAPI 3.1 published, a key
mintable headless in four calls) and it is the right read layer for a marketplace,
but it cannot be our index of record: its BSC chain indexer reported itself `down`
for the whole session with a canonical checkpoint stuck 32 hours behind head, it is
missing 20,280 BSC agents that `ownerOf` proves exist on chain, it parses agent
metadata roughly once at registration and then never again (median BSC agent
metadata was last parsed 64 days ago), it has no bulk export, no since-block cursor
and no agent-registration webhook. During the session its read path returned
HTTP 500 for 21% of calls in one 48-call window and 57% in a later 30-call window.
Design for a local mirror built from BSC RPC, with 8004scan as an enrichment and
cross-link source plus the one lever it uniquely gives us: an unauthenticated
endpoint-verification trigger.

---

## Verified facts

### Access, auth and limits

| Claim | Value | How verified |
| --- | --- | --- |
| API base URL | `https://api.8004scan.io/api/v1` | Read from the Builder Hub page, `curl https://8004scan.io/developers` |
| Backend version | `0.4.363`, environment `production` | `curl https://api.8004scan.io/health` |
| OpenAPI spec | OpenAPI 3.1.0, 426,107 bytes, 150 paths | `curl https://api.8004scan.io/openapi.json` |
| Auth schemes | three: `X-API-Key` header, `X-Access-Token` header (JWT), `Authorization: Bearer` (JWT) | `components.securitySchemes` in the spec |
| Most read endpoints need no auth at all | `security: None` on `/agents`, `/agents/{chain}/{token}`, `/agents/search/semantic`, `/feedbacks`, `/chains`, `/stats/*`, `/status/*`, `/wallets/*`, `/mcp/tools/*` (GET), `/ipfs/fetch` | per-operation `security` in the spec, plus anonymous 200s |
| An API key can be created with no interactive login | yes, four calls, wallet signature only | did it: nonce, `cast wallet sign`, login, create (recipe below) |
| Key format | `8004_` + 41 chars, 46 total; `key_prefix` is the first 12 | `POST /api/v1/api-keys` response |
| Key tier granted by self-service | `free_api` | `tier` field in the create response and in `GET /api/v1/api-keys` |
| Measured free_api limits | 600 req/min, 100,000 req/day | `x-ratelimit-limit-minute: 600`, `x-ratelimit-limit-day: 100000` on a keyed `GET /api/v1/agents?chain_id=56&limit=1` |
| Measured anonymous limits | 30 req/min, 1,000 req/day, counted per IP | same headers on an unkeyed call |
| Published tier table | Anonymous 30/1,000. Free API 600/100,000. Basic 900/300,000. Pro 3,000/3,000,000. Enterprise 10,000/unlimited | `https://8004scan.io/developers` |
| Both `X-API-Key: <key>` and `Authorization: Bearer <key>` accept an API key | yes, identical rate headers | two curls, one with each header |
| Keys per user | free 2, basic 5, pro 10, enterprise unlimited | `POST /api/v1/api-keys` description |
| `tier` in the key-create body is dead | "Deprecated and ignored. API key tier is derived from the user's active subscription." | `APIKeyCreate` schema |
| JWT lifetime | `expires_in: 86400` (24h), with a refresh token | `POST /api/v1/auth/login` response |
| Nonce lifetime | 10 minutes | `POST /api/v1/auth/nonce` description and the returned `expires_at` |
| Cloudflare 403s the default Python UA | `User-Agent: Python-urllib/3.11` gets HTTP 403 even with a valid key; any other UA gets 200 | two urllib calls differing only in UA, plus `curl -A "Python-urllib/3.11"` reproducing the 403 |
| `X-RateLimit-Tier` header is documented but not sent | absent from every response inspected | full header dump on keyed and unkeyed calls |
| 500 responses carry no rate-limit headers | confirmed | header dump on a DATABASE_ERROR response |
| `/api/v1/chains` emits no rate-limit headers and survived 39 anonymous calls in a minute | confirmed | burst loop |

### The hackathon Pro grant

| Claim | Value | How verified |
| --- | --- | --- |
| The grant form is real and live | title "Build the Era Hackathon x 8004scan Pro-Tier Upgrade" | `curl -L https://forms.gle/jQevEPCAacBXaKG79`, resolves to a Google Forms viewform, HTTP 200 |
| What the form promises | "Approved participants will receive up to 500 API requests per minute and 100,000 requests per day." | the form's own description text |
| The form's prerequisite | visit the Developer Hub, log in, create an API key, then apply with the same account | form description |
| The form asks for | a name, a hackathon registration email, the wallet address connected to the 8004scan account, a project description and how the project will use the API. Five required fields. | parsed the public form payload (labels only) |
| The grant is not a blocker | the self-service `free_api` key we already hold measures 600/min and 100,000/day, which meets or beats the 500/min the grant advertises | measured rate headers vs the form text |

The grant is worth filing for the AltLayer track optics, not for throughput. Note the
form wants the wallet tied to the 8004scan account, so the account must be created
with a wallet the operator actually controls, not a throwaway.

### Scale and the drift since 2026-08-27

| Claim | 2026-08-27 capture | 2026-09-05 live | How verified |
| --- | --- | --- | --- |
| BSC agents | 287,029 | 304,281 | `GET /api/v1/stats/global`, `chain_stats` row for chain 56 |
| BSC feedbacks | 11,719 | 11,780 | same row and `GET /api/v1/feedbacks?chain_id=56&limit=1` returns `total: 11780` |
| Base agents / feedbacks | 52,588 / 441,591 | 63,616 / 448,216 | same |
| Chains configured | 29 mainnet on the networks page | 62 total, 30 mainnet, 32 testnet | `GET /api/v1/chains`, `data.mainnet_chain_ids` and `data.testnet_chain_ids` |
| New chain since the capture | n/a | Robinhood Chain, id 4663, `robinhood_mainnet` | present in live `mainnet_chain_ids`, absent from the capture |
| Platform totals | n/a | 811,915 agents, 453,159 users, 3,647,705 feedbacks, 0 validations, 0 chats | `GET /api/v1/stats/global` |
| BSC new agents per day | n/a | 2,292 (`chain_stats`), 3,120 platform-wide | same |
| BSC feedbacks today | n/a | 0 | `chain_stats.daily_feedbacks` for chain 56 |
| Validations are dead platform-wide | n/a | `total_validators: 0`, `total_validations: 0`, `average_validation_score: null` and the leaderboard's `validation_score` is labelled DISABLED | `/stats/global` plus the `/agents/leaderboard` description |

Three different agent counters disagree and a builder has to pick one deliberately:
`/stats/global.total_agents` = 811,915; `GET /agents?limit=1` (default filters) =
822,001; and the score engine's cached `global_max.total_agents` = 852,407 computed
at 2026-08-31T01:06:00Z. All three read at 2026-09-05T01:0x.

### BSC agent counts by filter and the on-chain truth

| Query | `total` | How verified |
| --- | --- | --- |
| `?chain_id=56` (defaults `is_registered=true`, `is_active=true`) | 303,461 | `GET /api/v1/agents?chain_id=56&limit=1` |
| `?chain_id=56&is_registered=any&is_active=any` | 314,596 | same shape |
| `?chain_id=56&is_registered=true&is_active=any` | 304,264 | same |
| `?chain_id=56&is_registered=false&is_active=any` (placeholders) | 10,332 | same |
| `?chain_id=56&x402_supported=true` | 70,464 | same |
| `?chain_id=56&has_a2a=true` | 27,048 | same |
| `?chain_id=56&has_mcp=true` | 5,366 | same |
| `?chain_id=56&is_endpoint_verified=true` | **5** | same |
| Highest token id that exists on chain | **334,876** | `cast call 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 "ownerOf(uint256)(address)" <id> --rpc-url https://bsc-rpc.publicnode.com`, binary searched between 334,802 and 335,000; 334,876 returns an owner, 334,877 reverts |
| Newest BSC agent in the index | token 334,802, created 2026-09-04T20:50:45Z | `GET /api/v1/agents?chain_id=56&limit=5` |
| Gap: on-chain ids minus indexed rows | **20,280** (314,596 indexed with every filter off, against 334,876 minted ids) | the two rows above |

Five endpoint-verified agents out of 304,281 is the single most useful number on this
page. Four of the five are one owner's hackathon build (`0x73809f...`, five "Brain on
BNB" agents), the fifth is `Arca` at token 705.

The API also 404s agents that provably exist. `GET /api/v1/agents/56/334876`,
`/56/324781`, `/56/314702` and `/56/282878` returned `{"detail":"Agent not found on
chain 56 with identifier ..."}` while `cast call ... ownerOf(...)` returned a real
owner for each of those four ids.

### Freshness, measured

8004scan publishes its own freshness SLOs, which is unusually honest and the numbers
are bad on the two things a marketplace needs.

`GET /api/v1/status/freshness` at 2026-09-05T01:07:15Z returned `status: "down"`:

| Component | Rows | Warn after | Critical after | Stale (warn) | Stale (critical) | Age p50 / p95 |
| --- | --- | --- | --- | --- | --- | --- |
| `direct_checkpoints` | 59 | 60s | 300s | 3 | 2 | 4s / 117s |
| `agent_health` | 81,113 | 86,400s | 604,800s | 0 | 0 | null |
| `wallet_metrics` | 190,305 | 172,800s | 604,800s | **128,940** | **124,928** | null |

So 128,940 of 190,305 wallet-metric rows (67.7%) are past the 48-hour target and
124,928 (65.6%) are past seven days. A re-read at 02:16:00Z gave 127,466 and 123,557
of 190,308, so it is not recovering.

`agent_health` carries 81,113 rows against 811,915 agents, which is 10.0% coverage.
That reads better once you know `protocol_distribution` is `{mcp: 25,700, a2a: 67,863,
unknown: 718,353}`: 81,113 health rows cover about 87% of the 93,563 agents that
declare a checkable protocol at all and 0% of the 88.5% that declare nothing. Over 69
minutes the row count moved 81,113 to 81,115, so the health corpus is not growing.

**Metadata is parsed once and never again.** A uniform random sample of 60 BSC token
ids drawn from 0 to 334,876 (`8004scan-probe-freshness-sample.py`, seed 8004) gave 53
usable records and against a reference clock of 2026-09-05T01:30Z:

| Field | Present | Age p50 (days) | Age p90 | Age max |
| --- | --- | --- | --- | --- |
| `created_at` | 53/53 | 64.21 | 179.49 | 202.10 |
| `updated_at` | 53/53 | 37.07 | 90.80 | 104.66 |
| `parse_status.last_parsed_at` | 53/53 | **64.19** | 90.80 | 104.66 |
| `health_checked_at` | **8/53** | 53.65 | 118.58 | 119.56 |
| `endpoint_last_checked_at` | **6/53** | 0.41 | 107.46 | 162.30 |

The mechanism is visible in the raw data, not inferred. Every agent registered before
about 2026-05-23 has `last_parsed_at` inside a two-minute band on **2026-06-06
06:07 to 06:15 UTC**, one bulk backfill sweep. Every agent registered after that has
`last_parsed_at` within an hour of its `created_at`. Parse lag after creation across
the sample: min 0.00h, p50 0.98h, p90 2128.50h, max 2670.98h, with 36 of 53 parsed
within 24 hours of registration and 17 of 53 parsed more than seven days later (those
17 are the pre-backfill cohort). There is no periodic re-parse.

That matters because 8004scan's own validator says so: agent 705 carries warning
`WA040`, "HTTP/HTTPS URI is not content-addressed (metadata can be changed without
detection)". An agent that points `agentURI` at a mutable HTTPS URL can change its
name, description, services and price after registration and 8004scan will keep
serving the old parse indefinitely.

The reference agent proves the same thing on the endpoint side. `GET
/api/v1/agents/56/1` (ClawNews) still reports `endpoint_last_checked_at:
2026-05-20T20:22:51Z` and `health_checked_at: 2026-05-20T20:22:57Z`, 108 days stale,
while `health_score` sits at a cached `100.0` and `endpoint_verification_error` says
the domain is broken. `updated_at` on that record was 2026-09-03T12:48:35Z, so
`updated_at` moves without any re-check or re-parse behind it.

`score_history` is stale too. `GET /api/v1/agents/score-history/56/705` returned four
data points, all dated 2026-08-18 to 2026-08-21, nothing in the 15 days since.

### The BSC indexer was down for the whole session

`GET /api/v1/status/indexers/direct`, the chain-56 row, read at 01:08:07Z and again at
02:17Z with identical checkpoint values:

```
status                            down
message                           "100 direct events are pending parent data"
mode                              rpc
canonical_checkpoint_block        119687744
canonical_checkpoint_age_seconds  111530  (01:08 read) -> 115668  (02:17 read)
canonical_last_checkpoint_at      2026-09-03T18:09:16.958512Z
canonical_total_synced            976400
canonical_last_sync_duration_ms   92302
latest_event_block                119985609
latest_event_processed_at         2026-09-04T21:01:05.926642Z
pending_events                    100
warn_after_seconds / down_after   60 / 300
rpc_endpoint_count                2
```

Live BSC head at 01:09Z was **120,019,977** (`cast block-number --rpc-url
https://bsc-rpc.publicnode.com`), so the canonical checkpoint sat **332,233 blocks**
behind and did not advance by a single block over 69 minutes of watching.

Both of the BSC RPC endpoints 8004scan uses were erroring: `bsc-mainnet.alt.technology`
at `error_rate_5m: 0.0909` and `bsc-dataseed.binance.org` at `error_rate_5m: 1.0`, that
second one failing every call. Platform-wide the indexer totals were 59 chains, 54 ok,
3 degraded, 2 down at 01:08 and 55/2/2 at 02:17. The two `down` chains were
`scroll_sepolia` (checkpoint 2,227,399s old) and `bsc_mainnet`.

BSC is also the only mainnet chain 8004scan has no block explorer for:
`GET /api/v1/chains/56` returns `blockscout_configured: false`, `effective_provider:
null`, `provider_status: "rpc_only"`, `provider_reason: "etherscan_disabled_for_chain"`.
Every other large mainnet in the list has blockscout or etherscan. So the chain the
hackathon is about is the one 8004scan indexes with the least redundancy.

### Reliability of the read path

Two windows, same key, sequential calls with 0.3s gaps:

| Window | Calls | 200 | HTTP 500 `DATABASE_ERROR` | client error/timeout | Non-200 rate |
| --- | --- | --- | --- | --- | --- |
| 2026-09-05T01:42:22Z | 48 | 38 | 9 | 1 | 20.8% |
| 2026-09-05T02:18:21Z | 30 | 13 | 17 | 0 | 56.7% |

The failures are transient and per-request, not per-resource: five consecutive reads of
`/api/v1/agents/56/705` returned `[200, 500, 200, 200, 200]` and `/56/334802` returned
`[500, 200, 500, 500, 500]`. The same id can return 200, then 500, then 404.

Latency is the other half of the problem. `GET /api/v1/agents?chain_id=56&limit=20`
returned in 0.48s at best and 36.97s at worst inside one six-call round. Deep offset
pagination, timed:

| Query | Time |
| --- | --- |
| `?chain_id=56&limit=1&offset=0` | 1.23s |
| `offset=10000` | 5.95s |
| `offset=100000` | **28.85s** |
| `offset=300000` | 13.07s |
| `offset=303461` (past the end, returns 0 items) | 7.52s |

`/api/v1/chains` was the only endpoint that never failed in either window: 11 of 11
successes, 0.34 to 0.88s.

`GET /api/v1/status/summary` reported `"database": "ok"` at 02:16:26Z while the read
path was returning `DATABASE_ERROR` on more than half of all calls, so the status
endpoint cannot be used as a gate on whether reads will work.

### Bulk export, cursors, streams and webhooks

| Question | Answer | How verified |
| --- | --- | --- |
| Bulk or export endpoint | none | grepped all 150 spec paths for `export`, `bulk`, `snapshot`, `dump`, `csv`. Only hit is `/api/v1/admin/featured-agents/bulk`, admin only |
| Since-block cursor | none. No parameter anywhere in the API mentions a block | enumerated all 94 distinct parameter names in the spec; no `since`, `from_block`, `cursor` |
| Websocket or SSE | none | grepped paths for `stream`, `sse`, `ws`, `socket`. Only `/views` and `/views/history` match on the substring |
| GraphQL | none | grepped |
| Incremental cursor that does exist | `created_after` and `created_before`, ISO datetimes, plus `sort_by=created_at&sort_order=asc\|desc` | tested, works |
| Filter on `updated_at` | **does not exist** | no such parameter in the spec |
| `limit` cap | 100. `limit=101` returns 422 `{"type":"less_than_equal","ctx":{"le":100}}` | tested |
| Webhooks exist | yes, five routes, JWT auth only | `POST /api/v1/webhooks/register`, `GET /api/v1/webhooks`, `GET`, `PATCH` and `DELETE /api/v1/webhooks/{id}`, `GET /api/v1/webhooks/{id}/deliveries` |
| Webhook auth | wallet JWT only. `X-API-Key` returns `{"detail":"Authentication required"}` 401 | tested on both register and list |
| Webhook event types | six, none of them agent registration or metadata change | the vendor's own skill reference, `.claude/skills/8004scan-webhooks/references/events.md` |
| Event names are not validated | registering with `"totally.bogus.event"` returned 200 and echoed it back | tested, then deleted the probe webhook |

The six real events: `validation.requested`, `validation.completed`,
`feedback.received`, `feedback.revoked`, `star.received`, `star.removed`. The Builder
Hub skills tab says the same thing in prose: "get notified when agents receive
feedback, validations or stars". Since platform validations are zero and BSC
feedbacks are zero per day, a webhook subscription on BSC would almost never fire.
For a new agent appearing it would never fire at all. **There is no push path for new
agents.**

The vendor's own webhook skill docs are wrong against the live API, which will cost a
builder an hour if they trust them. The skill shows `POST https://www.8004scan.io/api/v1/webhooks`
with a body of `{url, events, secret}` authenticated by `X-API-Key`. Live: the path is
`POST https://api.8004scan.io/api/v1/webhooks/register`, the body key is `webhook_url`
not `url`, the secret is generated server side and returned once and auth is the JWT.
Tested: the skill's body shape returns 422 `{"loc":["body","webhook_url"],"msg":"Field
required"}`, the skill's path returns 405 Method Not Allowed and `www.8004scan.io`
308-redirects. That repo is **AGPL-3.0** (`jiayaoqijia/8004`, `gh api repos/jiayaoqijia/8004`),
so read it for facts and copy no code from it.

### The one lever: an unauthenticated re-verification trigger

`POST /api/v1/agents/verify-endpoint/{chain_id}/{token_id}` requires no auth. The spec
says so out loud: "Currently does not require authentication. Owner verification will
be added when wallet signature auth is implemented. Rate limit: Once per hour per
agent." It checks the agent's domain for a valid `.well-known/agent-registration.json`
whose contents match the on-chain registration.

Tested on agent 1 at 01:44Z:

```
POST /api/v1/agents/verify-endpoint/56/1
-> 200 {"message":"Verification request queued successfully","queued":true,
        "estimated_check_at":"2026-09-05T02:09:07.389374Z"}
```

It ran. Before the trigger, `endpoint_verification_error` was `clawnews.io: HTTP 404`.
After, at 02:20Z, it was `clawnews.io: Connection error: ClientConnectorCertificateError`
and `updated_at` had moved to `2026-09-05T02:08:42Z`, matching the estimate.

Two things follow. We can make 8004scan freshen any agent we list, on demand, once an
hour, with no key. And `endpoint_last_checked_at` is broken: it stayed at
`2026-05-20T20:22:51Z` through a verification that demonstrably ran and rewrote the
error string. Do not use that field as a staleness signal. `updated_at` and the error
text move; the "last checked" timestamp does not.

The owner-only cousins, `POST /agents/{chain}/{token}/health-check` and
`POST /agents/{chain}/{token}/metadata-refresh`, both need the JWT and both only queue
the async task. There is no way to force a metadata re-parse for an agent we do not own.

### Search quality against the four mandated categories

Full-text search works. `GET /api/v1/agents?chain_id=56&limit=3&search_type=text&search=<q>`,
default filters, `total` and the top three names:

| Query | total | Top three |
| --- | --- | --- |
| rebalance | 44 | Warden, RangeRebalance Lens, AiKi PancakeSwap LP Rebalancer |
| rebalancing | 47 | defi-market-engine.agent, defi-market-engine.agent, Assay Range |
| grid trading | 13 | defi-market-engine.agent, defi-market-engine.agent, Sentinels Grid Trader |
| grid | 20 | defi-market-engine.agent, defi-market-engine.agent, Assay Grid |
| yield | 290 | cYqxakwCh.agent, AdCZtqn.agent, defi-market-engine.agent |
| APY | 430 | huetam.agent, silco.agent, tuankiet.agent |
| health factor | 21 | defi-market-engine.agent, defi-market-engine.agent, SMEAI Reference Health Factor Monitor |
| liquidation | 342 | TradeScope.agent, Assay Health, SMEAI Reference PancakeSwap LP Monitor |
| Venus | 22 | Assay Health, Assay Yield, SMEAI Reference Health Factor Monitor |
| PancakeSwap | 69 | Assay Grid, Assay Range, SMEAI Reference PancakeSwap LP Monitor |
| Lista | 1 | Sentinels Yield Router |
| staking | 110 | EtherSage, cs55467.agent, useragent |

Semantic search does not. `GET /api/v1/agents/search/semantic?chain_id=56&limit=3&q=<q>`:

| Query | total | Top three |
| --- | --- | --- |
| rebalance my BNB portfolio | 6 | babycaisubagent66_quickassistant6584 (0.8205), babycaisubagent100_cleverassistant9005 (0.8089), babycaisubagent8_proudbuilder2465 (0.806) |
| set up a grid trading bot | 6 | tradeBOT (0.7849), tradingbot (0.7778), traderclaw (0.7474) |
| find the best yield on BSC | 1 | hjktyu.agent (0.788) |
| watch my Venus health factor | 3 | Stellar_Moon_Pro.agent (0.7762), AstroAgent.agent (0.7459), Astroify.agent (0.7368) |

"AstroAgent" ranking first for "Venus health factor" is the tell: the embeddings look
like they are over the agent name string, not the description. The advertised hybrid
knobs do nothing. Holding the query at "set up a grid trading bot on BSC" and sweeping
`semantic_weight` across 0.3, 0.5, 0.8, 1.0 and `similarity_threshold` across 0.5 and
0.2 produced **byte-identical** result sets and identical similarity scores every time.
`semantic_weight=0.0`, documented as pure full-text, returns `total: 0`. The candidate
set is also bounded and query-dependent (`q=trading` gives `total: 400`, `q=a` gives 0,
broad queries time out), so it cannot page a corpus.

One more trap: `/agents/search/semantic` items are **not** the lightweight schema. Each
item carries all 68 `AgentResponse` fields including `raw_metadata`, `health_status` and
`field_sources`, plus `similarity_score`. Five results came to 19,173 bytes.

### The OASF taxonomy cannot supply the four categories

| Claim | Value | How verified |
| --- | --- | --- |
| Agents declaring OASF at all, platform-wide | 13,286 of 811,915, so 1.6% | `GET /api/v1/stats/oasf/skills`, `total_agents_with_oasf` |
| On BSC | 376 of 304,281, so 0.12% | `chain_stats.oasf_agents` for chain 56 |
| Skills in the top 100 that 8004scan recognises as standard | **2 of 100** | `is_standard` flag in `/stats/oasf/skills` |
| Domains in the top 100 recognised as standard | 3 of 100 | `/stats/oasf/domains` |
| Top-100 skills matching rebalance, grid, yield or health factor | **0** | regex over the returned skill strings |
| Top-100 domains matching them | 1 useful (`technology/blockchain/defi`, 463 agents) plus false positives (`energy/smart_grids`, several healthcare domains) | same |
| `oasf_skill` / `oasf_domain` filters cannot be scoped to a chain | `/stats/oasf/*` accepts only `limit` and `is_testnet`, no `chain_id` | spec |

Why almost nothing is "standard": 8004scan's validator rejects plausible OASF paths.
Agent 1's parse status carries six `IA027` info items of the form "Unknown OASF skill
category: Unknown skill: 'natural_language_processing/text_classification' (not in OASF
standard categories)" and matching `IA028` items for its domains.

### Reputation data on BSC is not a quality signal

Profiled 600 BSC feedbacks, `GET /api/v1/feedbacks?chain_id=56&limit=100&offset=0..500`:

| Property | Value |
| --- | --- |
| `score` (the normalised 0 to 100 field) non-null | **8 of 600** |
| `comment` non-null | **0 of 600** |
| `feedback_uri` non-null | 569 of 600 |
| `offchain_data` resolved into the record | 494 of 600 |
| `is_revoked` | 0 of 600 |
| Distinct agents covered | 156 |
| Distinct submitters | **27** |
| `submitted_at` range | 2026-03-10T01:36:27Z to 2026-08-31T10:43:56Z |
| `value_decimals` distribution | 0 for 551, 2 for 49 |
| `tag1` vocabulary | stance 85, relationship 84, personality 84, knowledge 81, timeline 80, style 80, uptime 49, q402-weekly 23, responseTime 19, starred 8, agripinaa-verified 6, security 1 |
| `tag2` vocabulary | fragment 494, 3d 28, bsc 23, 4d 12, 5d 10, 2d 8, 7d 7, empty 5, 1d 3, health-factor 2, yield 2 |

27 addresses wrote all 600 feedbacks and 494 of them are one project emitting
personality and knowledge "fragments" rather than service ratings. `tag1` is a freeform
ERC-8004 string, not a scale. Eight starred entries in 600. BSC's
`average_feedback_score` of 92.5 in `chain_stats` is computed over that.

The useful part is recoverable. `GET /api/v1/ipfs/fetch?cid=<cid>` is public, needs no
key, tries ipfs.io then cloudflare-ipfs.com then gateway.pinata.cloud then dweb.link
and it resolved a real feedback URI into a structured record with `value`,
`valueDecimals`, `tag1`, `tag2`, `endpoint`, a `reasoning` paragraph and a `method`
object naming the measurer, protocol, probe count, window and known defects. So
per-feedback evidence exists off chain even when `offchain_data` is null in the API row.

### What is read from chain and what 8004scan derives

`AgentResponse.field_sources` answers this per agent, in the response itself, with three
values documented in the spec: `hardcoded` means contract state, `onchain` means a
`setMetadata` write, `offchain` means the fetched `agentURI` document. Live example, from
`GET /api/v1/agents/56/705`:

```json
{"name":"offchain","description":"offchain","image":"offchain",
 "agent_wallet":"hardcoded","agent_wallet_chain_id":null,"x402_supported":"offchain",
 "mcp_server":null,"a2a_endpoint":null,"tags":null,"categories":null,
 "capabilities":null,"active":"offchain","services":"offchain",
 "agent_type":"offchain","registrations":"offchain","supportedTrust":"offchain"}
```

Grouping the 68 detail fields by where they come from:

**Read from chain, trustworthy.** `token_id`, `chain_id`, `contract_address`,
`owner_address`, `creator_address`, `created_block_number`, `created_tx_hash`,
`created_at`, `agent_wallet` and `raw_metadata.onchain` (the decoded `setMetadata`
key/value list).

**Parsed from the agent's own metadata document, as of `last_parsed_at` and never
re-read after that.** `name`, `description`, `image` (before proxying), `agent_type`,
`is_active`, `services`, `supported_protocols`, `supported_trust_models`, `x402_supported`,
`tags`, `categories`, `ens`, `did`, `mcp_server`, `mcp_version`, `a2a_endpoint`,
`a2a_version`, `agent_url`, `raw_metadata.offchain_uri`, `raw_metadata.offchain_content`.
Staleness: median 64 days on BSC, up to 105 days.

**Computed by 8004scan's own probes.** `is_endpoint_verified`, `endpoint_verified_at`,
`endpoint_verified_domain`, `endpoint_verification_error`, `endpoint_last_checked_at`
(broken, see above), `health_status`, `health_score`, `health_checked_at`. Staleness:
absent for 85% of a BSC sample and up to 120 days old where present.

**Computed by 8004scan's scoring engine.** `total_score`, `scores` (with the full v5
breakdown), `quality_score`, `popularity_score`, `activity_score`, `wallet_score`,
`freshness_score`, `metadata_completeness_score`, `rank`, `network_rank`. Staleness:
`quality.score.last_scored_at` was 2026-09-03T13:09:35Z for agent 705, about 36 hours
and `score_history` had no point newer than 2026-08-21.

**Aggregated from indexed events.** `total_feedbacks`, `average_score`,
`total_validations`, `successful_validations`, `star_count`, `watch_count`. As above,
validations are zero everywhere.

**8004scan platform state, nothing to do with the chain.** `id` (a UUID),
`owner_id`, `owner_username`, `owner_avatar_url`, `owner_publisher_tier`,
`owner_certified_name`, `is_verified`, `parse_status`, `updated_at` and `image_url`
which is rewritten to a proxy (`https://api.8004scan.io/api/v1/media/agents/56/1/image`,
which returned HTTP 503 when fetched).

**Derived cross-chain links.** `cross_chain_links` and `cross_chain_versions`, each entry
carrying `verification_status`. Agent 705 had 22 links, every one `owner_match`. Platform
counts from `/stats/global.registration_stats`: 4,822 total, 4,279 resolved, 543
unresolved, 2,953 `owner_verified`, 303 `reciprocal_verified`. So reciprocal declaration,
the strong form, covers 303 links platform-wide.

### `agent_wallet` is not a payout wallet

This one changes the money design, so it is worth stating flatly. `agent_wallet` was
non-null for **53 of 53** sampled BSC agents, which looks like universal payout-address
coverage and is not. In every case checked (`705`, `7612`, `302258`, `1`) it was
byte-identical to `owner_address` and `field_sources.agent_wallet` was `hardcoded`.

ERC-8004 explains why: "The key `agentWallet` is reserved and cannot be set via
`setMetadata()` or during `register()` (including the metadata array overload). It
represents the address where the agent receives payments and is initially" the owner
(`eip-8004-2026-08-27.txt`). So `agent_wallet` defaults to the registry owner and only
differs where an operator deliberately moved it. A non-null `agent_wallet` is therefore
zero evidence that an agent declared anywhere to be paid.

---

## Unverified or open

| Claim | What blocked it |
| --- | --- |
| That the four non-validation webhook events actually fire | Would need a publicly reachable HTTPS receiver plus a real feedback or star landing on a subscribed agent inside the observation window. BSC logged 0 feedbacks today, so nothing would have fired anyway. The API accepted a nonsense event name without complaint, which suggests events are stored unvalidated and only the implemented ones dispatch, but that is inference not proof. |
| Whether the 500 rate is a passing outage or the normal state | Measured only two windows, 36 minutes apart, on one day. 20.8% then 56.7%. The trend inside the session was worse, not better. `/status/summary` kept saying the database was fine throughout. Re-measure before the submission build depends on it. |
| The real Pro tier limits as granted | The form promises 500/min and 100,000/day; the docs table lists `pro` at 3,000/min and 3,000,000/day; our self-service key measured `free_api` at 600/min. Which row the grant maps to can only be settled by holding a granted key. Not filed from this pass because the form wants a hackathon registration email and the operator's own wallet. |
| Whether the 20,280-agent gap is missing rows or burned tokens | The registry has no `totalSupply`, so the gap was computed as (highest live token id) minus (indexed rows with all filters off). If ids are dense from 0 to 334,876 the gap is real. Spot checks at 705, 1, 302258, 282878, 314702, 324781, 334876 all had owners and 334,877 reverted, but the full range was not swept. |
| Whether `is_endpoint_verified=true` count of 5 is a hard cap or genuinely five agents | Read the count three ways and got 5 each time. Could not test whether the flag is write-blocked for most agents. |
| Why `total_agents` differs across three counters | 811,915 vs 822,001 vs 852,407. No endpoint documents which one is authoritative or what each filters. |
| Whether a Pro key removes the deep-offset slowness | Offset cost looks like a Postgres `OFFSET` plus an unbounded `COUNT`, so a higher rate limit would not help, but that was not measured against a Pro key. |
| Whether `/api/v1/agents` supports keyset pagination on `token_id` | `sort_by=token_id` is accepted but there is no `token_id_lt` / `token_id_gt` filter, so it cannot be used as a cursor. Not tested whether `search_type=token_id` can be abused for range scans. |
| Reciprocal cross-chain verification semantics | 303 links platform-wide are `reciprocal_verified` and 2,953 are `owner_match`. The exact rule 8004scan applies to promote one to the other is not documented in the spec text read. |
| Whether 8004scan re-parses metadata on any trigger we can reach | `metadata-refresh` is owner-only. The 2026-06-06 bulk sweep shows they can do it in batch. Whether they run it again before judging is unknowable. |

## Interfaces and constants

### Base, auth and the headless key recipe

```
Base URL   https://api.8004scan.io/api/v1
Spec       https://api.8004scan.io/openapi.json      (OpenAPI 3.1.0)
Health     https://api.8004scan.io/health            -> {"success":true,"data":{"status":"healthy","version":"0.4.363","environment":"production"}}
Ready      https://api.8004scan.io/ready

Headers
  X-API-Key: 8004_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    # API key, also works as Authorization: Bearer
  X-Access-Token: <jwt>                                        # wallet JWT, required for /api-keys and /webhooks
  Authorization: Bearer <jwt>                                  # same JWT, standard form
  User-Agent: <anything but Python-urllib/*>                    # mandatory, Cloudflare 403s the default

Response headers on rate-limited routes
  x-ratelimit-limit-minute, x-ratelimit-remaining-minute,
  x-ratelimit-limit-day,    x-ratelimit-remaining-day
  (no x-ratelimit-tier despite the docs; none of these appear on a 500)
```

Four calls, no browser, about 30 seconds:

```bash
# 1. throwaway or real wallet
cast wallet new --json > w.json
ADDR=$(jq -r '.[0].address' w.json); PK=$(jq -r '.[0].private_key' w.json)

# 2. nonce
curl -s -X POST https://api.8004scan.io/api/v1/auth/nonce \
  -H 'Content-Type: application/json' -d "{\"wallet_address\":\"$ADDR\"}" > nonce.json
MSG=$(jq -r '.message' nonce.json); NONCE=$(jq -r '.nonce' nonce.json)

# 3. EIP-191 personal_sign, then login (returns a 24h JWT)
SIG=$(cast wallet sign --private-key "$PK" "$MSG")
curl -s -X POST https://api.8004scan.io/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"wallet_address\":\"$ADDR\",\"signature\":\"$SIG\",\"nonce\":\"$NONCE\"}" > login.json
TOK=$(jq -r '.access_token' login.json)

# 4. mint the key (shown once)
curl -s -X POST https://api.8004scan.io/api/v1/api-keys \
  -H 'Content-Type: application/json' -H "X-Access-Token: $TOK" \
  -d '{"name":"marketplace-index","scopes":["read:agents"]}'
```

The nonce message is exactly this shape and the signature must be over it verbatim
including newlines:

```
Welcome to 8004scan!

Sign this message to authenticate your wallet.

Wallet: 0x<lowercased address>
Nonce: <32 hex chars>
Timestamp: 2026-09-05T01:12:13.970670+00:00

This signature will not trigger any blockchain transaction or cost any gas fees.
```

Login accepts EOA (EIP-191, 132-char signature), ERC-1271 contract wallets and
ERC-6492 (which additionally requires `chain_id` in the body). Response:
`{access_token, refresh_token, token_type:"bearer", expires_in:86400, user_id,
wallet_address, is_new_user}`.

### Every endpoint (150 routes). Auth column: `none` means no credential needed

**agents** (24 routes)

| Route | Auth | Query parameters |
| --- | --- | --- |
| `GET /agents` | none | limit, offset, chain_id, is_testnet, owner_publisher_tier, owner_address, supported_protocol, x402_supported, is_active, is_endpoint_verified, supported_trust, has_mcp, has_a2a, has_oasf, is_registered, oasf_skill, oasf_domain, sort_by, sort_order, search, search_type, search_fields, min_feedbacks, min_validations, min_score, created_after, created_before, tags, categories |
| `GET /agents/{chain_id}/{token_id}` | none | none (60s cache) |
| `GET /agents/{chain_id}/{registry_address}/{token_id}` | none | none (use for non-official registries) |
| `GET /agents/search/semantic` | none | q (1 to 500 chars, required), limit, offset, chain_id, is_active, semantic_weight, similarity_threshold |
| `GET /agents/latest` | none | limit, offset, chain_id, is_testnet, is_registered (2min cache) |
| `GET /agents/trending` | none | period (24h/7d/30d), limit (max 50), offset, chain_id, is_testnet (1min cache) |
| `GET /agents/leaderboard` | none | period (7d/30d/90d/all), sort_by, limit, offset, chain_id, is_testnet, group_cross_chain (5min cache) |
| `GET /agents/featured` | none | limit, offset, chain_id, is_testnet |
| `GET /agents/most-starred` | none | period, limit, offset, chain_id, is_testnet |
| `GET /agents/best-wallet` | none | limit, offset, chain_id, is_testnet |
| `GET /agents/scores/v5/{chain_id}/{token_id}` | none | none |
| `GET /agents/score-history/{chain_id}/{token_id}` | none | days, limit |
| `GET /agents/{chain_id}/{token_id}/quality` | none | history_days, history_limit |
| `GET /agents/{chain_id}/{token_id}/views` | none | none |
| `GET /agents/{chain_id}/{token_id}/views/history` | none | days |
| `POST /agents/{chain_id}/{token_id}/views` | JWT | none (10/min, 100/hour, 500/day per IP) |
| `POST /agents/verify-endpoint/{chain_id}/{token_id}` | **none** | none (once per hour per agent) |
| `POST /agents/{chain_id}/{token_id}/health-check` | JWT, owner | none |
| `POST /agents/{chain_id}/{token_id}/metadata-refresh` | JWT, owner | none |
| `POST /agents/stars/{chain_id}/{token_id}` | JWT | none |
| `DELETE /agents/stars/{chain_id}/{token_id}` | JWT | none |
| `GET /agents/stars/{chain_id}/{token_id}/is-starred` | JWT | none |
| `GET /agents/user/me/starred` | JWT | limit, offset |
| `GET /agents/user/{user_id}/starred` | none | limit, offset |

**feedbacks** (3), **chains** (2), **wallets** (4), **leaderboards** (2), **media** (1), **ipfs** (2)

| Route | Auth | Query parameters |
| --- | --- | --- |
| `GET /feedbacks` | none | limit, offset, agent_id, agent_token_id, user_address, min_score, max_score, include_revoked, tag1, tag2, chain_id, is_testnet, oasf_skill, oasf_domain, sort_by (submitted_at/score/created_at), sort_order, include_replies |
| `GET /feedbacks/{feedback_id}` | none | none |
| `GET /feedbacks/{feedback_id}/replies` | none | limit, offset |
| `GET /chains` | none | none |
| `GET /chains/{chain_id}` | none | none |
| `GET /wallets/{address}` | none | none |
| `GET /wallets/{address}/agents` | none | limit, offset, sort_by, sort_order |
| `GET /wallets/{address}/metrics` | none | none |
| `GET /wallets/{address}/stats` | none | none |
| `GET /leaderboards/publishers` | none | period, sort_by, limit, offset, chain_id, is_testnet, min_agents |
| `GET /leaderboards/validators` | none | period, sort_by, limit, offset, chain_id, is_testnet, tier |
| `GET /media/agents/{chain_id}/{token_id}/image` | none | none (returned 503 on test) |
| `GET /ipfs/fetch` | none | cid (accepts bare CID or `ipfs://` prefix) |
| `POST /ipfs/upload` | JWT | none |

**stats** (10) and **status** (6)

| Route | Auth | Query parameters |
| --- | --- | --- |
| `GET /stats/global` | none | is_testnet, is_registered |
| `GET /stats/daily` | none | from_date, to_date (**both required**, YYYY-MM-DD) |
| `GET /stats/growth` | none | metric (**required**: agents/users/feedbacks/validations), period |
| `GET /stats/growth/chains` | none | period, chain_id, is_testnet |
| `GET /stats/feedbacks` | none | is_testnet (timed out repeatedly on test) |
| `GET /stats/feedbacks/tags` | none | limit (max 500), is_testnet. **No chain_id** |
| `GET /stats/oasf/skills` | none | limit (max 500), is_testnet. **No chain_id** |
| `GET /stats/oasf/domains` | none | limit (max 500), is_testnet. **No chain_id** |
| `GET /stats/agents/{chain_id}/{token_id}` | none | none |
| `GET /stats/agents/{chain_id}/{token_id}/analytics` | none | period |
| `GET /status/summary` | none | strict, strict_level |
| `GET /status/components` | none | strict, strict_level |
| `GET /status/freshness` | none | strict, strict_level |
| `GET /status/indexers` | none | strict, strict_level |
| `GET /status/indexers/direct` | none | strict, strict_level (90 KB response, per-chain and per-RPC-host detail) |
| `GET /status/taskqueue` | none | strict, strict_level |

**auth** (6), **api-keys** (6), **webhooks** (6), **mcp tools** (6)

| Route | Auth | Notes |
| --- | --- | --- |
| `POST /auth/nonce` | none | body `{wallet_address}` |
| `POST /auth/login` | none | body `{wallet_address, signature, nonce, chain_id?}` |
| `POST /auth/refresh` | none | body `{refresh_token}`, rotates both tokens |
| `GET` and `PUT /auth/me`, `POST /auth/logout` | JWT | profile |
| `POST /api-keys` | JWT | body `{name, scopes[], expires_in_days?}`. `tier` is ignored |
| `GET /api-keys`, `GET` and `DELETE /api-keys/{id}` | JWT | `include_inactive` on the list |
| `POST /api-keys/{id}/reveal` | JWT | only for keys created after the feature shipped, else `key: null` |
| `GET /api-keys/{id}/usage` | JWT | `days` (default 7, max 30) |
| `POST /webhooks/register` | JWT | body `{webhook_url, events[]}`. Secret generated server side, returned once |
| `GET /webhooks`, `GET`, `PATCH` and `DELETE /webhooks/{id}` | JWT | list hides the secret |
| `GET /webhooks/{id}/deliveries` | JWT | `limit` (default 100) |
| `GET /mcp/tools/search_agents` | key or JWT | query, chain_id, limit, search_type, api_key. Works with `X-API-Key`; **does not default to one chain**, a BSC-intent query returned chain 97 rows |
| `GET /mcp/tools/get_agent` | key or JWT | chain_id, token_id, api_key. Returns a trimmed 3 KB view |
| `GET /mcp/tools/get_agent_feedbacks` | key or JWT | chain_id, token_id, limit, api_key |
| `GET /mcp/tools/get_starred_agents`, `POST /mcp/tools/(un)star_agent` | JWT | user state |

**Not useful to a marketplace index, listed for completeness.** `users/*` (34 routes:
profile, email verification, wallet merge, follow graph, publisher and validator
certification, account deletion), `inbox/*` (7), `donations/*` (5), `storage/*` (5),
`admin/*` (32, all admin-gated), `GET /health`, `GET /ready`, `GET /test/login`.

Two of those are worth one line each. Publisher certification (`OFFICIAL`, `VERIFIED`,
`COMMUNITY` tiers, surfaced as `owner_publisher_tier` and `owner_certified_name` on every
agent) is 8004scan's own trust badge and is filterable on `/agents`. Validator
certification is marked `[DEPRECATED]` throughout, matching the zero validations.

### Response envelopes are inconsistent. Handle both

Some routes wrap in `{"success":bool,"data":{...}}` and some return the payload bare. All
verified live:

| Wrapped in `success`/`data` | Bare |
| --- | --- |
| `/health`, `/chains`, `/chains/{id}`, `/stats/global` | `/agents`, `/agents/{c}/{t}`, `/agents/search/semantic`, `/feedbacks`, `/agents/{c}/{t}/quality`, `/agents/score-history/...`, `/wallets/*`, `/status/*`, `/stats/agents/*`, `/agents/{c}/{t}/views` |

Errors come in two shapes too. A handled error is
`{"success":false,"error":{"code":"DATABASE_ERROR","message":"Database error occurred"}}`.
A FastAPI validation failure is `{"detail":[{"type":"...","loc":["query","limit"],"msg":"...","input":"...","ctx":{...}}]}`.
A missing resource is `{"detail":"Agent not found on chain 56 with identifier 334876"}`.
Auth failure is `{"detail":"Authentication required"}`.

### List shape

```json
{"items":[ /* AgentSummary */ ], "total": 303461, "limit": 5, "offset": 0}
```

`AgentSummary` (list views, about 1 KB per agent, 30 fields), from a real BSC row:

```json
{"id":"9e726d50-1f03-4ccd-8ff7-d601748f6679",
 "agent_id":"56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:334802",
 "token_id":"334802","chain_id":56,"chain_type":"evm",
 "contract_address":"0x8004a169fb4a3325136eb29fa0ceb6d2e539a432","is_testnet":false,
 "owner_id":"a78a367e-638e-4808-84f0-1099f9cfaee1",
 "owner_address":"0xcc249ca3ab02b3c69f39dafacac358e911753771",
 "owner_ens":null,"owner_username":null,"owner_avatar_url":null,
 "owner_publisher_tier":null,"owner_certified_name":null,
 "name":"asdfd.agent","description":null,"image_url":null,"is_verified":false,
 "star_count":0,"supported_protocols":["A2A"],"x402_supported":false,
 "total_score":0.0,"rank":null,"network_rank":null,"health_score":null,
 "total_feedbacks":0,"average_score":0.0,"cross_chain_versions":null,
 "created_at":"2026-09-04T20:50:45Z","updated_at":"2026-09-04T21:25:53.795651Z"}
```

The spec notes `AgentSummary` exists precisely to avoid shipping `raw_metadata` (~2 KB),
the full `scores` breakdown (~2 KB), `health_status` (~1 KB), `parse_status` (~1.3 KB) and
`field_sources` (~0.4 KB), taking 25 agents from ~250 KB to ~25 KB. `rank` and
`network_rank` are the same value; `network_rank` is the field for new clients and it is
scoped to mainnet or testnet, not mixed.

### Detail shape: 68 fields

Field-by-field grouping is in the verified section above. The parts worth pasting:

```json
"services": {"a2a":{"endpoint":"https://arcabot.ai/.well-known/agent-card.json",
                    "version":"0.4.0","skills":[]},
             "web":{"endpoint":"https://arcabot.ai"},
             "email":{"endpoint":"<the agent's published contact address>"},
             "ens":"arcabot.eth"}

"raw_metadata": {"onchain":[{"key":"agentWallet",
                             "value":"0x1be9...","decoded":"0x1be9..."}],
                 "offchain_uri":"https://arcabot.ai/agent-metadata.json",
                 "offchain_content":{ /* the agent's own registration JSON, verbatim */ }}

"parse_status": {"status":"warning","info":[],"errors":[],
                 "warnings":[{"code":"WA040","field":"agentURI",
                              "message":"HTTP/HTTPS URI is not content-addressed (metadata can be changed without detection)",
                              "uri_type":"https","computed_hash":"4387662d91071cc9f9..."}],
                 "llm_attempted":false,"llm_attempted_at":null,
                 "last_parsed_at":"2026-06-06T06:07:30.646759+00:00"}

"cross_chain_links": [{"target_chain_id":1,
                       "target_registry":"0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
                       "target_token_id":"22775","target_agent_id":null,
                       "linked_agent_id":"e691a5ac-...","verification_status":"owner_match"}]
```

`health_status` keys every declared service and marks most of them `skipped`. Only `a2a`
and `mcp` are actually probed; `web`, `email`, `ens`, `github`, `blog`, `twitter`, `wallet`
and any custom service name all come back `"status":"skipped","message":"Service type not
health-checked: <key>"`. For agent 705 that was 1 healthy and 11 skipped across 4 declared
services while `health_score` was still 100.0. **A `health_score` of 100 can mean one A2A
card parsed once, months ago, with nothing else ever checked.**

### The v5 scoring algorithm, weights and all

8004scan publishes its whole ranking formula inside every agent response. Algorithm
`v5_leaderboard_policy`, version `5.2`. Five dimensions, weights summing to 1.00:

| Dimension | Weight | What feeds it |
| --- | --- | --- |
| `engagement` | **0.30** | feedback count and average, stars, views, chats, each normalised against a cached platform max |
| `service` | **0.25** | has_a2a / has_mcp, A2A card version and skill count, health status, `aggregation_method: "max"`, `integrity_tier`, `discoverability_tier` |
| `publisher` | **0.20** | wallet score, validation bonus, certification tier bonus |
| `compliance` | **0.15** | metadata completeness, parse error and warning counts (`parse_penalty` 0.95 for one warning), `verification_bonus: 10` when the endpoint is verified |
| `momentum` | **0.10** | activity score and freshness score, with `days_since_creation` |

On top sit two multipliers and a band. `multipliers.completeness` has a `tier` and a
`value` (1.0 at tier `complete`). `multipliers.no_service` is documented as "Built into
service dimension (cap at 30)", so an agent with neither A2A nor MCP is capped near 30.
`leaderboard_policy` adds `weights: {proof: 0.85, support: 0.15}`, a
`score_band: {floor: 30.0, ceiling: 55.0}`, plus `merit_score`, `proof_score`,
`support_score`, `evidence_tier`, `integrity_tier`, `discoverability_tier`,
`discoverability_factor`, `feedback_signal_score` and `effective_evidence_rank`.

The engagement normaliser is a cached snapshot and it was five days old:

```json
"global_max":{"max_chats":0,"max_stars":4013,"max_views":9807,"max_feedbacks":293941,
              "total_agents":852407,"mainnet_agents":530340,"testnet_agents":322070,
              "agents_with_feedbacks":155284,
              "calculated_at":"2026-08-31T01:06:00.806681+00:00"}
```

Two internal inconsistencies in the same payload for agent 705, both real: the score
breakdown's `a2a_stats` says version `0.3.0` with 3 skills while the live `health_status`
says `0.4.0` with 4 skills, so the score was computed from an older probe than the one
being displayed. And `breakdown.final_score` was `30.463065879990385` while `total_score`
was `30.48` and `quality.score.total_score` was `30.46`, three values for one number.

`sort_by` on `/agents` accepts `created_at`, `stars`, `name`, `token_id`, `total_score`,
`quality_score`, `popularity_score`, `activity_score`, `validation_score`, `wallet_score`,
`freshness_score`, `metadata_completeness_score`, `total_feedbacks`, `average_score`,
`total_validations`. `/agents/leaderboard` accepts the seven score dimensions only.

### The Quality Center endpoint is the most useful single call

`GET /api/v1/agents/{chain_id}/{token_id}/quality` returns `{id, agent_id, chain_id,
token_id, generated_at, score, score_history, endpoint_health, metadata_validation,
risk_flags}`. `score.dimensions[]` carries a plain-English `explanation` per dimension
("No user feedback yet. Early reviews help establish trust and improve ranking.",
"Healthy services: A2A (3 skills). All endpoints responding well.", "Veteran agent (204
days). Increase activity to boost momentum."). `risk_flags` is a typed list:

```json
[{"id":"metadata_warnings","severity":"medium","category":"metadata",
  "title":"Metadata warnings","description":"1 warning may reduce quality or compatibility.",
  "evidence":{"warning_count":1},"source":"parse_status",
  "detected_at":"2026-09-05T01:18:07.599030Z"},
 {"id":"low_quality_score","severity":"medium","category":"score",
  "title":"Low quality score","description":"Total quality score is below 50.",
  "evidence":{"total_score":30.46},"source":"agent_scores","detected_at":"..."},
 {"id":"no_feedback_yet","severity":"low","category":"reputation",
  "title":"No feedback yet","description":"No user feedback has been indexed for this agent yet.",
  "evidence":{},"source":"agents.total_feedbacks","detected_at":"..."}]
```

`endpoint_health` gives `overall_status`, `health_score`, `checked_at`,
`declared_services_count`, a `counts` histogram over healthy/degraded/unhealthy/unknown/skipped
and a per-service array with `domain`, `domain_verified`, `verification_status`,
`verification_error`, `latency_ms`. `metadata_validation` gives `status`, `last_parsed_at`,
counts and an `issues[]` array with `severity`, `code`, `field`, `message`,
`onchain_value`, `offchain_value`.

### Feedback shape, 29 fields, real BSC row

```json
{"id":"1040603c-1081-461d-9856-7be98eeb2c0c",
 "feedback_id":"56:153776:0xc7f5cdc8dd028e0b9af2ca9d3891f135b23f4b92:2",
 "agent_id":"6829ee4e-24d8-4f3c-ba1e-3b4b4c273f36","chain_id":56,"is_testnet":false,
 "score":null,"value":"674","value_decimals":0,"comment":null,
 "feedback_uri":"ipfs://QmdDMBWQG6kekn8n8KGMfNYduiMsN6MpnXQbbqN66Xqfcx",
 "transaction_hash":"0x8887280196f44a2e3537bc84f37bbe35aefac542fadabd096d1059ba827b24d4",
 "block_number":119137534,
 "user_id":"a6d2bbde-dd78-4152-ae5b-5e1c97fe10ef",
 "user_address":"0xc7f5cdc8dd028e0b9af2ca9d3891f135b23f4b92",
 "agent":{"token_id":"153776","chain_id":56,
          "registry_address":"0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
          "name":"BORT Governance Lens #10923","ens":null},
 "user":{"address":"0xc7f5...","ens":null,"username":null,"validator_tier":null},
 "endpoint":"https://api.bortagent.xyz/.well-known/agent-card.json",
 "tag1":"responseTime","tag2":"4d","feedback_index":2,
 "feedback_hash":"0xdcd5c4e4efba5b1bae07b6f1145f49c507621785406f0df7bd92cb3684eadbf4",
 "offchain_data":null,
 "parse_status":{"status":"warning","errors":[],"warnings":[],
   "info":[{"code":"IF_DIRECT_CANONICAL_MINIMAL",
            "message":"Direct-chain sync stored on-chain feedback before offchain parsing."}],
   "last_parsed_at":"2026-08-31T12:29:07.726637+00:00"},
 "is_revoked":false,"revoked_at":null,
 "submitted_at":"2026-08-31T10:43:56Z","created_at":"2026-08-31T12:29:04.410779Z",
 "updated_at":"2026-08-31T12:29:04.410779Z","replies":null}
```

`feedback_id` is `{chain_id}:{agent_token_id}:{submitter_address}:{feedback_index}`. The
real rating is `value` scaled by `value_decimals`; `score` is 8004scan's optional
normalisation and it is null for 99% of BSC rows. Resolve `feedback_uri` yourself via
`GET /ipfs/fetch?cid=...` to get `reasoning` and `method`.

### Chain shape

```json
{"success":true,"data":{"chain_key":"bsc_mainnet","chain_id":56,"name":"BSC",
 "is_testnet":false,"enabled":true,"blockscout_configured":false,
 "etherscan_supported":true,"etherscan_keys_present":true,"effective_provider":null,
 "provider_status":"rpc_only","provider_reason":"etherscan_disabled_for_chain"}}
```

The list form adds `data.mainnet_chain_ids` and `data.testnet_chain_ids` as flat int
arrays, which is the cheapest way to enumerate coverage. There are no agent counts here;
those live in `/stats/global.chain_stats[]` as `{chain_id, name, is_testnet, total_agents,
daily_new_agents, total_feedbacks, daily_feedbacks, average_feedback_score, mcp_agents,
a2a_agents, oasf_agents}`.

### Wallet shape

`GET /wallets/{address}` returns `{address, ens_name, balance, updated_at, user_id,
username, is_claimed, total_agents, total_stars, total_watches, total_feedbacks_received,
total_validations_received, average_score, most_popular_agent{chain_id,token_id,name},
has_metrics, tx_count, payment_count, total_revenue, first_tx_at, is_agent_wallet,
is_contract}`. `/metrics` adds `primary_chain_id`, `wallet_age_days`, `first_tx_block`,
`last_tx_block`, `metrics_updated_at`, `sync_error`, `associated_agents[]` with a `role`
field and a `chain_metrics[]` array.

Treat these as unreliable. For `0x73809f...`: `tx_count: 13` but `wallet_age_days: 0`,
`first_tx_at: null`, `last_tx_at: null`, `first_tx_block: null`. `balance` is a string in
scientific notation (`"3.9270222E+15"`), not a decimal wei string, so parse it as a float
or a `Decimal`, never with `BigInt`. `metrics_updated_at` was 2026-08-31, five days stale,
consistent with the 67.7% stale `wallet_metrics` figure. `/wallets/{a}/stats` reported
`active_agents: 0, inactive_agents: 5` for a wallet whose five agents all return
`is_active: true` on their own records.

One more list-vs-detail gotcha: `AgentSummary` **omits `is_active` entirely**, so activity
cannot be read from any list response. Verified: every row from
`/wallets/{a}/agents` lacks the key, while `GET /agents/56/302258` returns
`is_active: true`. The list default is `is_active=true`, so absence is implied but not
stated and `is_active=any` needs a detail fetch per row to recover the flag.

### On-chain interfaces the backfill needs

BSC, chain id 56. Both registries are proxies (about 120 bytes of deployed code) and the
same two addresses appear on every EVM chain 8004scan lists.

```
Identity Registry     0x8004A169FB4a3325136EB29fA0ceB6D2e539a432   ERC-721, name "AgentIdentity", symbol "AGENT"
Reputation Registry   0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
Working RPC           https://bsc-rpc.publicnode.com               (head 120,019,977 at 2026-09-05T01:09Z)
```

Identity Registry, verified live:

```solidity
function ownerOf(uint256 agentId) external view returns (address);
function tokenURI(uint256 agentId) external view returns (string);
function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes);
function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external;
function setAgentURI(uint256 agentId, string calldata newURI) external;
function register(string agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId);

event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
event URIUpdated(uint256 indexed agentId, string newURI);
event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue);
```

Topic hashes, from `cast keccak`:

```
Registered(uint256,string,address)          0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a
URIUpdated(uint256,string)                  0xbf032ae7dcb484f99f9f3977ba9cde222756e7073de74244ceb89de862569bdb
MetadataSet(uint256,string,string,bytes)    0x2c149ed548c6d2993cd73efe187df6eccabe4538091b33adbd25fafdb8a1468b
```

`totalSupply()` reverts, so the contract is not `ERC721Enumerable` and the population has
to be found by binary search on `ownerOf` or by replaying `Registered`. A nonexistent id
reverts with selector `0x7e273289`, which is OpenZeppelin's
`ERC721NonexistentToken(uint256)` and the reverted data carries the id, e.g.
`0x7e2732890000...00051c98` for 335,000. `cast logs` on `Registered` over a 2,000-block
window returned 7 events and over 10,000 blocks it timed out on the public RPC, so plan on
small windows or a paid endpoint.

Reputation Registry, from the ERC-8004 text:

```solidity
event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex,
                  int128 value, uint8 valueDecimals, string indexed indexedTag1,
                  string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash);
event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex);

function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex)
  external view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked);
function readAllFeedback(uint256 agentId, address[] calldata clientAddresses, string tag1, string tag2, bool includeRevoked) external view returns (...);
function getSummary(uint256 agentId, address[] calldata clientAddresses, string tag1, string tag2)
  external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);
function getClients(uint256 agentId) external view returns (address[]);
function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64);
function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, ...) external;
```

`getSummary` requires a non-empty `clientAddresses`, so `getClients` first. `appendResponse`
is callable by anyone, which is the on-chain hook for a marketplace to publish its own
verdict against a feedback entry.

**`agentWallet` is a reserved key.** ERC-8004: it "cannot be set via `setMetadata()` or
during `register()`", it "represents the address where the agent receives payments" and
it starts as the owner. That is why 8004scan reports it for every agent and why it means
nothing on its own.

**Metadata often lives on chain.** In the 53-agent BSC sample, `raw_metadata.offchain_uri`
was a `data:` URI for 27 of 53 (51%), `metadata.evoevo.ai` for 20, a TermiX S3 bucket for
3, absent for 3. Decoding `tokenURI(1)` gave the full registration document with no HTTP
fetch at all and it matched 8004scan's parse field for field. So a `tokenURI` sweep is a
complete, self-contained backfill for about half the corpus and needs one HTTP fetch per
agent for the rest.

---

## Design implications for the marketplace

**1. 8004scan is an enrichment source, not the index of record.** The chain it indexes
worst is the chain we are judged on. Its BSC checkpoint was frozen 32 hours behind head
for the whole session, it is missing 20,280 minted token ids and it 404s agents whose
owner `ownerOf` returns. A submission whose agent list is a live proxy to
`api.8004scan.io` will show a judge an empty or erroring page if the 57% failure window
recurs during judging. Own the index; borrow the enrichment.

**2. Build the mirror from BSC RPC and use `Registered` plus `tokenURI` as the spine.**
Ids are dense from 0 to 334,876 and half the corpus carries its metadata in a `data:` URI,
so the whole registry is reachable with `ownerOf` plus `tokenURI` per id and no third-party
dependency. Tail with `Registered` logs in small block windows. That gives us a fresher and
more complete index than the official scanner, which is a claim we can demonstrate on
screen rather than assert.

**3. Never plan a full backfill through the API.** 3,035 pages of 100 at offsets that cost
up to 29 seconds each, with a 20% to 57% error rate and a mandatory retry, is a
multi-hour job that can fail at page 2,000. `created_after` with `sort_order=asc` is the
only sane read pattern (verified: `created_after=2026-09-04T12:00:00Z&chain_id=56` returned
`total: 1643` for the last 13 hours in 7.3s) and it is for the incremental tail, not the
history.

**4. There is no way to learn that an existing agent changed.** No `updated_after` filter,
no agent webhook, no stream and `updated_at` moves for reasons unrelated to content. So
change detection has to be ours: hash the `tokenURI` bytes per agent, watch `URIUpdated`
and `MetadataSet` logs and re-fetch on a hash change. This is also the thing that makes a
"live" claim defensible in a demo.

**5. Classification into the four mandated categories has to be ours and it is buildable.**
OASF covers 0.12% of BSC agents, its top 100 skills contain nothing about rebalancing,
grids, yield or health factors and 98 of those 100 fail 8004scan's own standards check.
Semantic search returns junk for all four category prompts and its knobs are inert.
Full-text search, on the other hand, finds the right agents in every one of the four, so
seed the taxonomy from keyword recall over name plus description plus service metadata and
then rank with our own evidence, not `total_score`.

**6. The scarce signal is a verified, reachable endpoint and there are five of them on
BSC.** Five endpoint-verified agents out of 304,281 and four of the five belong to one
rival's hackathon build. Any marketplace whose ranking rewards a working endpoint will look
almost empty on 8004scan's data and will be right. That is the case for our own probing:
fetch the A2A card or MCP manifest ourselves, timestamp it and show the timestamp.

**Corrected 2026-09-05T19:00Z.** The total is still 5. The operator split has moved to
**three of five** under `0x73809f…`, with token 7612 under a second owner and 705 under a
third, on two reads of the same query three seconds apart. So the sentence above is a
capture of the set as it read earlier that day rather than a constant. `SPINE.md` carries 3
and holds. Recorded in `decisions/13-partners-endpoint-verified-count.md`.

**7. Use the unauthenticated verify trigger as a product feature.** `POST
/agents/verify-endpoint/{chain}/{token}` needs no key and is capped at once per hour per
agent. For a shortlist of a few thousand candidates that is a real freshening lever: we
can make the official scanner re-verify the agents we list, then cite its verdict on our
profile page. Read the result from `endpoint_verification_error` and `updated_at`, never
from `endpoint_last_checked_at`, which the run does not touch.

**8. Do not display 8004scan's freshness fields as freshness.** `health_score: 100.0` on
an agent whose site has a broken certificate, `endpoint_last_checked_at` frozen at
2026-05-20 through a check that ran today, `last_parsed_at` on a mutable HTTPS URL. Show
our own probe timestamp. Where we surface theirs, label it with their date.

**9. Treat their score as a citation, not as our ranking.** The v5 weights are public
(engagement 0.30, service 0.25, publisher 0.20, compliance 0.15, momentum 0.10) with a
30-to-55 band and engagement at 0.30 is 60% of it on BSC where 27 addresses wrote every
feedback. Publishing "8004scan score: 30.5 (their algorithm, their date)" next to our own
evidence-based rank is both honest and a differentiator.

**10. `agent_wallet` cannot be the payment destination.** It defaults to the owner for
every agent, so a marketplace that pays it is paying the registrant, not a declared payout
address. Get the payout target from an x402 challenge or an explicit onboarding step and
treat a non-null `agent_wallet` as zero evidence.

**11. Reputation has to be earned inside our own product.** 3.6M platform feedbacks and
only 11,780 on BSC, zero today, `score` null in 99% of rows, no comments, 27 distinct
submitters across 600 records and zero validations platform-wide. Nothing here ranks
anything. The upside: `appendResponse` is open to anyone, so our verdicts can be written
back on chain and `/ipfs/fetch` recovers the evidence payload behind a `feedback_uri`
when 8004scan has not parsed it.

**12. Engineering rules for the client, each one earned in this pass.** Set a
`User-Agent`; the default Python one gets a Cloudflare 403 even with a valid key. Retry
every 5xx with backoff, because the same URL flaps 200/500/404. Never trust a 404 as
absence, cross-check `ownerOf`. Handle both response envelopes. Cap `limit` at 100.
Do not read rate-limit headers off a 500, they are absent. `/api/v1/chains` is the one
endpoint stable enough to use as a liveness probe and `/status/summary` is not, because
it said the database was fine during the worst of it.

**13. Mint the key headlessly, on a wallet we control, in CI.** Four calls, no browser, no
waiting on a grant. Do this with the operator's identity wallet rather than a throwaway,
because the Pro grant form asks for the wallet tied to the account. Then file the form for
the AltLayer track, knowing it buys nothing we do not already measure.

---

## What 8004scan cannot give us, for 15-SYSTEM

The backfill has to cover all of this. Nothing on this list is available from the API at
any tier.

| Gap | Why it matters | What has to cover it |
| --- | --- | --- |
| A complete BSC agent list | 20,280 minted ids are absent and reads 404 on agents that exist | `ownerOf` sweep over 0 to the live max id, ids are dense; tail with `Registered` logs |
| Current metadata | parsed once at registration, median 64 days old on BSC, up to 105 | `tokenURI` per agent, half are `data:` URIs needing no fetch; hash and diff |
| Change detection | no `updated_after`, no agent webhook, no stream, `updated_at` is noise | watch `URIUpdated` and `MetadataSet` logs, plus a `tokenURI` content hash per agent |
| A bulk snapshot | no export, no dump, no GraphQL; only 100-row pages at up to 29s each | our own store, seeded from RPC |
| Endpoint liveness | 5 of 304,281 verified, `health_checked_at` absent for 85% of a sample, `health_score` cached from months ago | our own prober against the A2A card, MCP manifest and any declared HTTP service, with our own timestamp |
| Category classification | OASF covers 0.12% of BSC and contains none of the four categories; semantic search returns junk | our own taxonomy, seeded by keyword recall and confirmed against the agent's declared skills |
| A usable payout address | `agent_wallet` defaults to the owner for every agent | x402 challenge or explicit onboarding |
| Price and terms | no price, no currency, no unit anywhere in the 68 fields | our own listing fields or an x402 402 challenge per service |
| Reputation that ranks anything | `score` null in 99% of BSC rows, no comments, 27 submitters, zero validations | our own settled-job outcomes; write back with `appendResponse` |
| Feedback evidence | `offchain_data` null on 106 of 600 rows and never re-fetched | resolve `feedback_uri` ourselves or via the public `/ipfs/fetch` |
| Anything on the second registry | no validation endpoints that return data, the whole feature is `[DEPRECATED]` and zero | direct reads on `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| Uptime history | no time series of availability; `score_history` had nothing newer than 2026-08-21 | our own probe log per agent |
| Read reliability during judging | 20.8% then 56.7% non-200 in one hour | serve from our store; call 8004scan async, cache aggressively, degrade silently |

Worth keeping from them, because it is genuinely good and costly to rebuild:
`cross_chain_links` and `cross_chain_versions` with their `verification_status`, the
`field_sources` provenance map, the `parse_status` issue codes (WA040, IA027, IA028 and
friends), the publisher certification tiers, the public `/ipfs/fetch` gateway fan-out,
`/stats/global.chain_stats` for cross-chain context and the `/status/*` family which is
the only honest freshness disclosure in the ecosystem. Cite them, cache them and never
block a page render on them.

---

## Sources

Live, read or called 2026-09-05 between 01:04 and 02:25 UTC:

- `https://api.8004scan.io/openapi.json` (OpenAPI 3.1.0, v0.4.363), saved as
  `three/research/raw/8004scan-openapi-2026-09-05.json`
- `https://8004scan.io/developers` (Builder Hub: base URL, tier table, endpoint list)
- `https://8004scan.io/developers?tab=skills` (webhook event count, skill install, AGPL note)
- `https://api.8004scan.io/health`, `/api/v1/status/{summary,components,freshness,indexers/direct,taskqueue}`
- `/api/v1/agents`, `/agents/{c}/{t}`, `/agents/{c}/{registry}/{t}`, `/agents/search/semantic`,
  `/agents/{latest,trending,leaderboard,featured,most-starred,best-wallet}`,
  `/agents/scores/v5/...`, `/agents/score-history/...`, `/agents/{c}/{t}/quality`,
  `/agents/{c}/{t}/views`, `POST /agents/verify-endpoint/56/1`
- `/api/v1/feedbacks`, `/chains`, `/chains/56`, `/wallets/{a}{,/agents,/metrics,/stats}`,
  `/stats/{global,daily,growth,growth/chains,feedbacks/tags,oasf/skills,oasf/domains,agents/...}`,
  `/mcp/tools/{search_agents,get_agent}`, `/ipfs/fetch`, `/media/agents/56/1/image`
- `/api/v1/auth/{nonce,login}`, `POST /api/v1/api-keys`, `GET /api/v1/api-keys`,
  `POST|DELETE /api/v1/webhooks/register|{id}`, `GET /api/v1/webhooks`
- `https://forms.gle/jQevEPCAacBXaKG79` (resolves to a Google Forms viewform titled
  "Build the Era Hackathon x 8004scan Pro-Tier Upgrade")
- `gh api repos/jiayaoqijia/8004` and its webhook skill references, saved as
  `raw/8004scan-skill-{events,webhook-api,verification}.md` (AGPL-3.0, do not copy code)
- BSC RPC `https://bsc-rpc.publicnode.com` via `cast 1.7.1`: `block-number`, `chain-id`,
  `ownerOf`, `tokenURI`, `logs`, `keccak`
- `cast wallet new`, `cast wallet sign` for the EIP-191 login signature

Local captures used and compared against:

- `three/research/raw/8004scan-networks-2026-08-27.txt` (the drift baseline)
- `three/research/raw/eip-8004-2026-08-27.txt` (event and function signatures, the
  `agentWallet` reserved-key rule)
- `three/research/census-bsc-2026-08-27.tsv` (prior category counts)

Artifacts written this pass, all in `three/research/raw/`:

`8004scan-openapi-2026-09-05.json`, `8004scan-chains-2026-09-05.json`,
`8004scan-chain-56-2026-09-05.json`, `8004scan-agents-bsc-limit5-2026-09-05.json`,
`8004scan-bsc-endpoint-verified-2026-09-05.json`, `8004scan-agent-56-705-2026-09-05.json`,
`8004scan-agent-1-2026-09-05.json`, `8004scan-agent-302258-2026-09-05.json`,
`8004scan-agent-full-id-2026-09-05.json`, `8004scan-quality-56-705-2026-09-05.json`,
`8004scan-scores-v5-56-705-2026-09-05.json`,
`8004scan-score-history-56-705-2026-09-05.json`,
`8004scan-bsc-freshness-sample-2026-09-05.json` (the 60-id sample),
`8004scan-bsc-feedbacks-600-2026-09-05.json` (slimmed to the profiled fields),
`8004scan-feedbacks-bsc-2026-09-05.json`, `8004scan-semantic-grid-2026-09-05.json`,
`8004scan-stats-global-2026-09-05.json`, `8004scan-stats-daily-2026-09-05.json`,
`8004scan-stats-growth-2026-09-05.json`, `8004scan-stats-growth-chains-2026-09-05.json`,
`8004scan-stats-feedback-tags-2026-09-05.json`, `8004scan-oasf-skills-2026-09-05.json`,
`8004scan-oasf-domains-2026-09-05.json`, `8004scan-status-freshness-2026-09-05.json`,
`8004scan-status-indexers-direct-2026-09-05.json`,
`8004scan-status-summary-2026-09-05.json`, `8004scan-status-components-2026-09-05.json`,
`8004scan-status-taskqueue-2026-09-05.json`, `8004scan-wallet-2026-09-05.json`,
`8004scan-wallet-agents-2026-09-05.json`, `8004scan-wallet-metrics-2026-09-05.json`,
`8004scan-wallet-stats-2026-09-05.json`, `8004scan-agents-featured-2026-09-05.json`,
`8004scan-agents-most-starred-2026-09-05.json`,
`8004scan-agents-best-wallet-2026-09-05.json`, `8004scan-mcp-search-2026-09-05.json`,
`8004scan-mcp-get-agent-2026-09-05.json`, `8004scan-stats-agent-2026-09-05.json`,
`8004scan-stats-agent-analytics-2026-09-05.json`, `8004scan-agent-views-2026-09-05.json`,
`8004scan-endpoint-probe-index-2026-09-05.json`,
`8004scan-skill-events.md`, `8004scan-skill-webhook-api.md`,
`8004scan-skill-verification.md`.

Reproducible probes: `8004scan-probe-freshness-sample.py` (the 60-id freshness sample,
seed 8004), `8004scan-probe-feedbacks.py` (600-row feedback profile),
`8004scan-probe-categories.py` (four-category search comparison),
`8004scan-probe-errorrate.py` (the error-rate windows). Each expects an API key at
`/tmp/8004key`; mint a fresh one with the four-call recipe above.

The research account used for the key-minting proof was a throwaway wallet generated with
`cast wallet new` and its key was left in `/tmp` deliberately so nothing sensitive lands
in the lane. The probe webhook created during the event-validation test was deleted and
`GET /api/v1/webhooks` returned `[]` afterwards.

