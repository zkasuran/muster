# R12: how a listed agent is contacted and how it must behave on the wire

## Headline

Two `.well-known` paths matter on BSC and they are different things that get confused: A2A's
`/.well-known/agent-card.json`, an IANA-registered permanent URI owned by the Linux Foundation, and
ERC-8004's `/.well-known/agent-registration.json`, which is that ERC's own optional endpoint-domain
proof and is not IANA-registered at all. Neither belongs to x402: three x402 spec captures contain zero
occurrences of `well-known`, and x402 discovery is a facilitator-hosted Bazaar API plus a machine-readable
capability block carried inside the 402 challenge itself. The population on BSC is thin but not broken.
Machine-validating four live BSC agent cards against the four published A2A schemas shows three of them
are valid against at least one revision (one is valid against 0.1.0, 0.2.6 and 0.3.0 all three), while
the one platform template behind roughly 250 of 251 sampled A2A declarations is valid against none. Only
**5 of 335,003** BSC agents carry a verified endpoint domain. So the marketplace cannot consume what
agents declare. It has to define the wire contract, probe it, and publish the difference between what an
agent claims and what it does.

## Verified facts

### Discovery paths and registries

| Claim | Value | How verified |
| --- | --- | --- |
| A2A card discovery path | `https://{server_domain}/.well-known/agent-card.json`, per RFC 8615 | A2A spec section 8.2, `raw/a2a-specification-2026-09-05.md:1988`, plus `docs/topics/agent-discovery.md:25` |
| `agent-card.json` is IANA-registered | one row: `agent-card.json` / `[https://a2a-protocol.org/latest/specification/]` / status **permanent** / Linux Foundation / 2025-08-01 | parsed the registry HTML today, 158 rows, exactly 1 matching `agent`: `curl -A 'Mozilla/5.0 (research)' https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml` |
| `agent-registration.json` is NOT registered | 0 occurrences in the same 44,841-byte registry | same fetch, string count 0 |
| Nor is `http-message-signatures-directory` | 0 occurrences | same fetch |
| Nor is anything x402 | 0 occurrences of `x402` | same fetch |
| RFC 8615 forbids nested well-known paths | verbatim: "Well-known URIs are rooted in the top of the path's hierarchy; they are not well-known by definition in other parts of the path. For example, `/.well-known/example` is a well-known URI, whereas `/foo/.well-known/example` is not." | `curl https://www.rfc-editor.org/rfc/rfc8615.txt`, section 3 |
| RFC 8615 requires registration | "Applications that wish to mint new well-known URIs MUST register them" | same, section 3 |
| Legacy A2A path `/.well-known/agent.json` is dead | `https://arcabot.ai/.well-known/agent.json` returns 404 while `agent-card.json` returns 200 `application/json` 1,200 B | two curls today, `%{http_code}` capture |

### A2A versions and live conformance

| Claim | Value | How verified |
| --- | --- | --- |
| A2A latest release | `v1.0.1`, created and published **2026-05-28**; `main` at `98853be3`, 2026-09-01 | `gh api repos/a2aproject/A2A/releases/latest`, `gh api repos/a2aproject/A2A/commits/main` |
| The complete A2A tag list | `v0.1.0 v0.2.0 v0.2.1 v0.2.2 v0.2.3 v0.2.4 v0.2.5 v0.2.6 v0.3.0 v1.0.0-rc v1.0.0 v1.0.1` | `gh api --paginate repos/a2aproject/A2A/tags` |
| **There is no A2A 0.4.x** | 0 tags matching `^v0\.4` | same paginated tag list |
| Yet the most conformant third-party BSC agent declares A2A `0.4.0` | on-chain doc service entry `{"name":"A2A","version":"0.4.0",...}` and the card's own `"version": "0.4.0"` | `cast call ... tokenURI(uint256) 705`, then `curl https://arcabot.ai/agent-metadata.json` and the card |
| A2A v1.0 `AgentCard` required set | `name`, `description`, `supported_interfaces`, `version`, `capabilities`, `default_input_modes`, `default_output_modes`, `skills`. No `url`, no `protocolVersion` | `specification/a2a.proto` at `main`, saved `raw/a2a-proto-2026-09-05.proto` |
| A2A v0.3.0 and v0.2.6 required set | identical 9 fields: `capabilities`, `defaultInputModes`, `defaultOutputModes`, `description`, `name`, `protocolVersion`, `skills`, `url`, `version` | `jq` over the committed `a2a.json` at each tag, saved `raw/r12-a2a-schema-v0.2.6-2026-09-05.json` and `raw/r12-a2a-schema-v0.3.0-2026-09-05.json` |
| A2A v0.1.0 required set is only 5 fields | `name`, `url`, `version`, `capabilities`, `skills` | same, `raw/r12-a2a-schema-v0.1.0-2026-09-05.json` |
| `authentication.schemes` is a **v0.1.0** field, not 0.2.x | `AgentAuthentication` with `required: ["schemes"]` exists in v0.1.0 and the string `AgentAuthentication` appears **0 times** in v0.2.6 | `jq` on both schemas, plus `grep -c AgentAuthentication` |
| `skills[].tags` is required from 0.2.6, not before | v0.1.0 `AgentSkill.required` is `["id","name"]`; v0.2.6 and v0.3.0 are `["description","id","name","tags"]` | `jq` over the three schemas |
| v0.3.0 added `signatures` to the card | present in v0.3.0 properties, absent in v0.2.6 | key diff of the two schemas |
| v0.3.0 transport enum | `TransportProtocol` is exactly `["JSONRPC","GRPC","HTTP+JSON"]`, and `AgentInterface` requires `transport` plus `url` | `jq '.definitions.TransportProtocol'` and `.AgentInterface` |
| The published A2A v1.0 JSON artifact **cannot validate a card** | `$defs.AgentCard` has **no `required` array**, so `{}` and `{"name":"x"}` both come back VALID | `python3 tools/r12-a2a-card-validate.py` on `/tmp/emptycard.json`; schema saved `raw/r12-a2a-schema-v1.0-published-2026-09-05.json` |
| That artifact is not committed upstream | "`a2a.json` is a **non-normative build artifact** ... intentionally **not** committed to source control" | `curl https://raw.githubusercontent.com/a2aproject/A2A/v1.0.1/specification/json/README.md` |
| It does still reject unknown fields, in both spellings | `additionalProperties: false` with camelCase `properties` **and** 7 snake_case `patternProperties` (`^(default_input_modes)$` and so on) | `python3` inspection of the saved artifact |
| Live card conformance, machine-checked | arcabot: **VALID 0.1.0**, 6 errors at 0.2.6 and 0.3.0. bortagent: **VALID at 0.1.0, 0.2.6 and 0.3.0**. bitagent S3: VALID 0.1.0, 1 error at 0.2.6 and 0.3.0 (`protocolVersion` missing). TermiX template: invalid at every revision (3 errors at 0.1.0, 6 at 0.2.6 and 0.3.0) | `python3 tools/r12-a2a-card-validate.py`, full output saved `raw/r12-a2a-card-conformance-2026-09-05.txt` |
| arcabot's `defaultInputModes: ["text"]` is not an error | v0.1.0 declares `"default": ["text"]` on that field with items typed as plain strings; the MIME-type wording only arrives by v0.3.0 | `jq` on the v0.1.0 and v0.3.0 schemas |
| arcabot's card really has 4 skills | `skills.length == 4`, first skill `agent-infrastructure` with no `tags` | `curl https://arcabot.ai/.well-known/agent-card.json \| jq` |

### MCP

| Claim | Value | How verified |
| --- | --- | --- |
| Current MCP revision | `2026-07-28`. Full published set: `2024-11-05`, `2025-03-26`, `2025-06-18`, `2025-11-25`, `2026-07-28`, plus `draft` | `gh api repos/modelcontextprotocol/modelcontextprotocol/contents/docs/specification` and `.../tags` |
| 2026-07-28 removed the GET stream endpoint and protocol-level sessions | stated in the revision Info box | `raw/mcp-2026-07-28-basic-transports-streamable-http-2026-09-05.mdx:16-21` |
| Resumable SSE via `Last-Event-ID` is "not supported" in this revision | same Info box | same file |
| No MCP document mentions CORS | 0 matches for `cors`, `access-control` or `cross-origin` across 9 captured MCP 2026-07-28 documents | `grep -rniE 'cors\|access-control\|cross-origin' raw/mcp-2026-07-28-*.mdx` |

### x402 and payment protocols

| Claim | Value | How verified |
| --- | --- | --- |
| x402 defines no `.well-known` | 0 matches for `well-known` across the v1 spec, the v2 spec and the v2 HTTP transport | `grep -c well-known raw/x402-spec-v2-*.md raw/x402-spec-v1-*.md raw/x402-transport-http-v2-*.md` |
| x402 discovery is facilitator Bazaar endpoints | `GET /discovery/resources`, `GET /discovery/search` | `raw/x402-spec-v2-2026-09-05.md:496-586` |
| x402 upstream repo head | `coinbase/x402` `main` at `dd927a26`, 2026-04-21, with 7 extension specs under `specs/extensions/` | `gh api repos/coinbase/x402/contents/specs/extensions` and `.../commits/main` |
| `maxTimeoutSeconds` in the spec's own examples | 60 at every occurrence (6 hits) | `grep -n maxTimeoutSeconds raw/x402-spec-v2-2026-09-05.md` |
| A live BSC-accepting resource sets it to **300** | all three `accepts[]` entries carry `"maxTimeoutSeconds": 300` | decoded the live `PAYMENT-REQUIRED` header, saved `raw/r12-x402-signalpulse-PAYMENT-REQUIRED-decoded-2026-09-05.json` |
| A live x402 resource serves v2 in the header and v1 in the body at the same time | header decodes to `{"x402Version":2, accepts:[eip155:8453, eip155:56, solana:5eykt...]}` with `amount`; body is `{"x402Version":1,"error":"X-PAYMENT header is required","accepts":[{...,"network":"base","maxAmountRequired":"50000",...}]}` | one `curl` with `-D` on `https://signalpulse.theaslangroupllc.com/api/scan/crypto-lite`, both saved |
| That resource's BSC leg, exactly | `{"scheme":"exact","network":"eip155:56","asset":"0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d","amount":"50000000000000000","payTo":"0x50ab2018c06c6E4eAA9BA52057Eb55eD284912fc","maxTimeoutSeconds":300,"extra":{"name":"World Liberty Financial USD","version":"1","assetTransferMethod":"eip3009","signerAddress":"0x34F7a661160780Ce1346e6D7B96D2bE244590899"}}` | same decoded header. 5e16 at 18 decimals is 0.05 units, matching the resource's own `$0.05` description |
| A real x402 server does solve CORS for browser buyers | `access-control-expose-headers: PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE` and `access-control-allow-headers: Content-Type, PAYMENT-SIGNATURE, X-API-KEY, X-PAYMENT`, with `access-control-allow-origin: *` | response headers saved `raw/r12-x402-signalpulse-402-headers-2026-09-05.txt` |
| x402 carries its own machine-readable capability block | `extensions.bazaar.info` plus `extensions.bazaar.schema`, live on that resource, `info.input` `{type:"http",method:"GET",queryParams:{}}` and `info.output` `{type:"json",example:{...}}` validated by a 2020-12 schema shipped alongside | decoded header, `jq '.extensions'` |
| The bazaar extension is first-class for MCP tools | `input.type: "mcp"` with required `tool` plus `inputSchema` (MCP's own `Tool.inputSchema` format), optional `transport` in `{"streamable-http","sse"}` defaulting to streamable-http; the catalog key is the tuple (`resource.url`, `input.tool`) and "Facilitators **must** use both fields" | `raw/r12-x402-ext-bazaar-2026-09-05.md`, Discovery Info Structure |
| Facilitators must validate `info` against `schema` before cataloging | verbatim "Facilitators **must** validate `info` against `schema` before cataloging." | same file, Schema Validation |
| x402 has an idempotency extension of its own | `payment-identifier`: `info.id`, 16 to 128 chars, recommendation UUIDv4 with a `pay_` prefix, `info.required` boolean | `raw/r12-x402-ext-payment_identifier-2026-09-05.md` |
| Its status codes disagree with the IETF draft on one case | x402 `payment-identifier`: same id with a **different payload returns 409 Conflict**. `draft-ietf-httpapi-idempotency-key-header-07`: that case is **422**, and 409 is for a key still in flight | the extension's Idempotency Behavior table versus `raw/r12-draft-idempotency-key-07-2026-09-05.txt` sections 2.6 and 2.7 |
| x402 has a signed offer and receipt extension | `extensions["offer-receipt"].info.offers[]` in the challenge and `extensions["offer-receipt"].info.receipt` in the settlement response, formats `eip712` or `jws`, stated purposes "dispute evidence and auditability", user-review attestations, "verifiable proof of commercial interactions for reputation systems" | `raw/r12-x402-ext-extension-offer-and-receipt-2026-09-05.md` sections 1, 4.1, 5.1 |
| x402 also standardises RFC 9421 request signing | the `http-message-signatures` extension carries `registrationUrl`, `signatureSchemes`, `tags`, and clients "must host their public keys at `/.well-known/http-message-signatures-directory`" | `raw/r12-x402-ext-http-message-signatures-2026-09-05.md` |
| AP2 current version | v0.2, `google-agentic-commerce/AP2`, `main` at `e1ea56db`, 2026-04-29 | `gh api repos/google-agentic-commerce/AP2/commits/main` |
| AP2 has two mandate types | Checkout Mandate and Payment Mandate; `vct` values `mandate.checkout.open.1`, `mandate.payment.open.1`, `mandate.payment.1` | `raw/ap2-specification-2026-09-05.md:100-165`, `raw/ap2-payment-mandate-2026-09-05.md` |
| AP2's normative spec has no crypto rail | 0 occurrences of `x402`, `stablecoin`, `on-chain`, `onchain`, `blockchain` or `eip155` across the four AP2 docs | grep over `raw/ap2-*.md` |
| AP2's x402 support is a Base Sepolia sample | `code/samples/python/src/common/x402_constants.py` hardcodes Anvil account keys, Base Sepolia USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` and `https://sepolia.base.org` | `raw/r12-ap2-x402-constants-2026-09-05.py` |
| Zero AP2 adoption in the BSC corpus | 0 occurrences of `ap2` or `mandate` across 306 fetched off-chain registration documents | python string count over `raw/r11-sample-offchain-2026-09-05.json` |

### ERC-8004 on BSC, measured today

| Claim | Value | How verified |
| --- | --- | --- |
| Registry head | `_lastId` = **335,003** at block 120,036,371 | `cast storage 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00` then `cast to-dec`, plus `cast block-number`, RPC `https://bsc-rpc.publicnode.com` |
| Registration rate right now | 334,947 earlier in this session, 335,003 later, 56 new ids in roughly 40 minutes | the same storage read at two times |
| The endpoint-domain proof rule, exact | publish `https://{endpoint-domain}/.well-known/agent-registration.json` carrying at least a `registrations` list; a user MAY treat the domain as verified when the file is reachable over HTTPS and a `registrations` entry's `agentRegistry` and `agentId` match the on-chain agent | `curl https://eips.ethereum.org/EIPS/eip-8004`, saved `raw/eip-8004-live-2026-09-05.txt`, identical to the 2026-08-27 capture, no drift |
| ERC-8004 is still Draft | status Draft, Standards Track: ERC | same fetch |
| Its own service example is stale on both protocols | `"name":"MCP","version":"2025-06-18"` and `"name":"A2A","version":"0.3.0"` while MCP is on 2026-07-28 and A2A on 1.0.1 | `raw/eip-8004-2026-08-27.txt:60-88`, one occurrence each in the live text |
| BSC agents with a verified endpoint domain | **5** in total | `curl "https://api.8004scan.io/api/v1/agents?chain_id=56&is_endpoint_verified=true&limit=5"`, `total: 5`, saved `raw/r12-8004scan-is_endpoint_verified-true.json` |
| Those 5 | ids 304493, 302258, 302257 (all `brainonbnb.com`, **a third party, not ours**, corrected 2026-09-05: `ownerOf` returns `0x73809F69916FcF7Ddc5BB1315fBdf96A569a5963` for all three, no signer for it exists in this workspace, see `decisions/02-thesis-brainonbnb-is-third-party.md`), 7612 (8k4 Protocol Trust Oracle), 705 (Arca) | same response |
| A third-party BSC agent does publish both files | `arcabot.ai/.well-known/agent-registration.json` 200 `application/json` 3,162 B, `/.well-known/agent-card.json` 200 `application/json` 1,200 B | re-probed today, `raw/r12-wellknown-probe-2026-09-05.tsv` plus the two saved bodies |
| Its registration file satisfies the rule for BSC | contains exactly `{"agentId":705,"agentRegistry":"eip155:56:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"}` | `jq '[.registrations[]\|select(.agentRegistry\|test("eip155:56";"i"))]'` on the fetched file |
| One agent's `registrations` array spans 22 chains | ids across `eip155:1`, `8453`, `10`, `5000`, `1088`, `59144`, `534352`, `167000`, `42220`, `42161`, `143`, `196`, `137`, `2741`, `56`, `43114`, `100`, `2345`, `360`, `4326`, `1776`, `1187947933` | `jq '.registrations' https://arcabot.ai/agent-metadata.json` |
| Several of those entries carry `agentId: 0` | `eip155:10`, `eip155:5000`, `eip155:1088` all say `agentId: 0` | same output. Id 0 is a placeholder, so a matcher must compare the full CAIP-2 triple and reject 0 |
| The two published documents for the same agent disagree | the on-chain `agentURI` doc lists **12** services including `A2A` v`0.4.0`; the `.well-known` copy lists **8** with **no A2A entry at all**. Both files carry the identical top-level key set | `cast call ... tokenURI 705` then `curl` both, `jq '[.services[]\|{name,version}]'` and `jq '.services\|length'` on each |
| The A2A service endpoint in that doc is a full card URL, not a domain | `"endpoint": "https://arcabot.ai/.well-known/agent-card.json"` | same `jq` output. A resolver must accept both a card URL and a base domain to append the well-known path to |
| A 200 status is not proof the file exists | `https://evoevo.ai/.well-known/agent-card.json` returns **200 with `text/html` and 74,239 bytes**, the SPA shell | re-probed today |
| Platform-sharded well-known paths do not work and are not well-known | `https://www.app.bitagent.io/aip/erc8004:daydream/.well-known/agent-card.json` 404, `...erc8004:fifi/...` 404, and the origin root `https://www.app.bitagent.io/.well-known/agent-card.json` 404, all `text/html` 38,709 B. Per RFC 8615 the nested paths are not well-known URIs in the first place | three curls today |
| Declared-but-absent is common | `q402.quackai.ai/.well-known/agent-registration.json` 404 `text/html` 13,926 B | re-probed today |
| TermiX's platform manifest is live | `https://platform-backend.prod.termix.live/.well-known/aacp-agent.json` 200 `application/json` **34,261 B** | curl today |
| The on-chain service vocabulary, 290 parsed docs | `web` 218, `a2a` 52, `termix platform` 51, `q402` 12, `mcp` 12 | python count over `raw/r11-sample-offchain-2026-09-05.json` |
| Every one of those `a2a` endpoints but one is a platform template | `platform-backend.prod.termix.live/api/v1/a2a/agents/{agentId}/card` 51 times with the literal `{agentId}` placeholder unsubstituted, plus `www.app.bitagent.io/aip/erc8004:daydream/...` once | same count, endpoint rows printed |
| Every `mcp` endpoint in that corpus is one URL | `https://q402.quackai.ai/api/mcp/info` 12 times | same |
| That MCP URL is a stdio install descriptor, not an HTTP MCP server | `{"type":"...#service.mcp","transport":"stdio","install":{"npx":"npx -y @quackai/q402-mcp@latest"},"tools":[...]}` | `raw/r12-q402-mcp-info-2026-09-05.json` |
| `#service.mcp` is not an ERC-8004 convention | 0 occurrences of `service.` in the EIP text | `grep -o "service\.[a-z0-9]*" raw/eip-8004-2026-08-27.txt` |
| On-chain sweep, newest 300 ids | 246 http URIs, 47 data URIs, 7 empty; 245 distinct http docs, 245 of 245 parsed; services web 154, a2a 80, termix platform 80, q402 12, mcp 12, erc-8183 1 | `node tools/r12-onchain-service-sweep.mjs 300`, output `raw/r12-onchain-service-sweep-2026-09-05.json` |
| Four stratified 120-id windows | from id 1: 79 data URIs, 19 ipfs, 20 empty, 2 junk, services oasf 30 web 1 agentwallet 1 email 1 mcp 1. From 60000: 113 data URIs, no services. From 160000: 115 http, `web` only. From 260000: 119 http, a2a 119 plus termix platform 119, one host | four runs of the same tool, `raw/r12-onchain-sweep-from-{1,60000,160000,260000}-2026-09-05.json` |
| The one MCP endpoint in the oldest window is a web page | `https://www.8004scan.io/create`, 308 on both GET and POST | two curls |

### OASF, the only capability taxonomy in live use on BSC

| Claim | Value | How verified |
| --- | --- | --- |
| What an OASF service entry looks like on chain | `{"name":"OASF","endpoint":"https://github.com/agntcy/oasf/","version":"0.8.0","skills":["natural_language_processing/information_retrieval_synthesis/search", ...],"domains":["media_and_entertainment/news", ...]}` | `raw/bsc-decoded-registration-docs-2026-09-05.json`, agent ids 1, 7, 14 |
| Its `endpoint` is not callable | every OASF entry points at the GitHub repo, identically | same, 30 of 120 in the oldest id window |
| Upstream is real and maintained | `agntcy/oasf`, "Open Agentic Schema Framework", 332 stars, updated 2026-08-31, tags up to `v1.1.1` | `gh api repos/agntcy/oasf`, `.../tags` |
| The canonical taxonomy today | **496** skill paths under **19** top-level groups: `ai_ml_engineering`, `audio_speech_processing`, `base_skill`, `business_professional`, `computer_vision`, `content_writing_marketing`, `cybersecurity`, `data_engineering_analytics`, `devops_cloud_infra`, `governance_compliance`, `language_processing`, `mathematical_reasoning`, `multimodal_processing`, `reasoning_planning`, `research_knowledge_productivity`, `science_specialized`, `software_engineering`, `three_d_generation`, `tool_use_automation` | `curl https://schema.oasf.outshift.com/api/skills`, 550,821 B, saved `raw/r12-oasf-skills-api-2026-09-05.json`, paths extracted from each entry's `attributes.name.enum` |
| The taxonomy was renamed between 0.8.x and 1.x | v0.8.7 groups are `advanced_reasoning_planning`, `agent_orchestration`, `analytical_skills`, `audio`, `data_engineering`, `devops_mlops`, `evaluation_monitoring`, `governance_compliance`, `images_computer_vision`, `multi_modal`, `natural_language_processing`, `retrieval_augmented_generation`, `security_privacy`, `tabular_text`, `tool_interaction` | `gh api repos/agntcy/oasf/contents/schema/skills?ref=v0.8.7` |
| Some live BSC strings are valid OASF 0.8.x | `agent_orchestration/task_decomposition`, `security_privacy/threat_detection`, `evaluation_monitoring/anomaly_detection`, `natural_language_processing/text_classification` all exist as files at v0.8.7 | `gh api repos/agntcy/oasf/contents/schema/skills/<group>?ref=v0.8.7` for five groups |
| The two highest-volume strings are invented | `information_skills/news_synthesis` (8,487 agents) has no `information_skills` group at any version (repo path 404, code search total 0). `analytical_skills/data_analysis/crypto_analysis` and `analytical_skills/market_insights` (4,940 each) fail because v0.8.7 `analytical_skills` contains only `coding_skills` and `mathematical_reasoning` | `gh api .../schema/skills/information_skills?ref=v0.8.7` returns 404; `gh api "search/code?q=repo:agntcy/oasf+information_skills"` total 0; the analytical_skills listing |
| A doc can misspell the group | agent id 1 declares `evaluation_and_monitoring/quality_evaluation` where the real group is `evaluation_monitoring` | the decoded doc versus the v0.8.7 listing |
| The indexer agrees they are non-standard | every one of the top-used skills and domains carries `"is_standard": false, "category_id": null` | `raw/8004scan-oasf-skills-2026-09-05.json`, `raw/8004scan-oasf-domains-2026-09-05.json` |
| Top declared domains on BSC | `technology/blockchain/cryptocurrency` 5,554, `finance/markets/crypto` 4,940, `geopolitics/international_relations` 3,547, `finance/global_economics` 3,546 | same domain capture |

### CORS and caching, measured on live hosts

| Host and path | `Access-Control-Allow-Origin` | Cache headers | How verified |
| --- | --- | --- | --- |
| `arcabot.ai/.well-known/agent-card.json` | **absent** | `cache-control: public, max-age=0, must-revalidate`, strong `etag` | `curl -D - -H 'Origin: https://marketplace.example'` today |
| `api.bortagent.xyz/.well-known/agent-card.json` | `*` | `cache-control: public, max-age=300`, weak `etag` | same |
| `brainonbnb.com/.well-known/agent-registration.json` | `*` | `cache-control: public, max-age=300` | same |
| `signalpulse...` 402 challenge | `*` plus `expose-headers` and `allow-headers` for the payment headers | n/a | same |

No specification covers this. A2A mentions CORS zero times (one grep hit is an unrelated section
cross-reference), MCP mentions it zero times across nine captured documents, x402 mentions it zero times.

### Long-job, idempotency and webhook standards

| Claim | Value | How verified |
| --- | --- | --- |
| `Prefer: respond-async` is standardised | RFC 7240 section 4.1, with `wait=<seconds>`, a `202 (Accepted)` response and a `Preference-Applied` response header | `curl https://www.rfc-editor.org/rfc/rfc7240.txt`, 32,866 B |
| `Idempotency-Key` is still an expired draft | `draft-ietf-httpapi-idempotency-key-header` rev **07**, dated 15 October 2025, expiry 18 April 2026 | `curl https://datatracker.ietf.org/api/v1/doc/document/?name=draft-ietf-httpapi-idempotency-key-header` |
| Its status codes | 400 when a required key is missing, 409 when the same key is retried while the original is still in flight, 422 when a key is reused with a different payload, all `application/problem+json` | `raw/r12-draft-idempotency-key-07-2026-09-05.txt` sections 2.6 and 2.7 |
| RFC 9457 obsoletes RFC 7807 | header line `Obsoletes: 7807`; members `type`, `status`, `title`, `detail`, `instance` plus extensions | `curl https://www.rfc-editor.org/rfc/rfc9457.txt` |
| AIP-151's numbers | "A good rule of thumb is 10 seconds" for what counts as long-running, "a good rule of thumb for operation expiry is 30 days", and a resource refusing a parallel operation returns `ABORTED` | `raw/aip-151-long-running-operations-2026-09-05.txt` |
| Standard Webhooks exists and is current | `standard-webhooks/standard-webhooks`, `main` at `7537d2a2`, 2026-08-31, one 28,403-byte spec file | `gh api repos/standard-webhooks/standard-webhooks/commits/main`, saved `raw/r12-standard-webhooks-2026-09-05.md` |
| Its exact header names are lowercase | `webhook-id`, `webhook-timestamp`, `webhook-signature`, and "All of the headers should be prefixed with `webhook-` and follow the exact naming as below" | that file, Webhook headers section |
| Its signed content | `msg_id.timestamp.payload`, full stops as delimiters | same, verbatim: "The content to be signed is therefore: `msg_id.timestamp.payload`" |
| Its signature prefixes and key formats | `v1,` symmetric HMAC-SHA256, `v1a,` asymmetric ed25519, space-delimited list in one header for zero-downtime rotation; secrets serialise as `whsec_`, keys as `whsk_` and `whpk_` | same |
| It names the idempotency rule outright | "Use the `webhook-id` header as an idempotency key to prevent accidentally processing the same webhook more than once (e.g. save the IDs in redis for 5 minutes)" | same, Verifying signatures |
| Its retry schedule | immediate, 5 s, 5 min, 30 min, 2 h, 5 h, 10 h, 14 h, 20 h, reaching 51:35:05 after start, with jitter recommended | same, Deliverability table |
| SSE rules | status must be 200 and type exactly `text/event-stream` or the client fails the connection permanently; `204` tells a client to stop reconnecting; only four field names exist (`event`, `data`, `id`, `retry`); a line starting with `:` is a comment, suggested every ~15 s; `Last-Event-ID` is sent only on re-establish | WHATWG HTML server-sent-events section |
| DOMPurify current release | `dompurify@3.4.14`, licence `(MPL-2.0 OR Apache-2.0)`; `isomorphic-dompurify@4.1.0` for server-side | `curl https://registry.npmjs.org/dompurify/latest` |
| The markdown exfiltration class is real and shipped | GitHub fixed CamoLeak in Copilot Chat by disabling image rendering entirely, despite already routing images through its HMAC-signed Camo proxy; Checkmarx demonstrated a zero-click image path plus a one-click link path against Copilot Chat and Gemini | Legit Security writeup and Checkmarx writeup, both read |
| The CVE id circulating for CamoLeak is wrong | `CVE-2025-59145` in NVD is the `color-name` npm account takeover, CVSS 4.0 base 8.8, published 2025-09-15 | `curl "https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2025-59145"` |
| Python's `is_global` misses multicast and NAT64 | on python 3.11.5 `224.0.0.1`, `239.255.255.250`, `ff02::1`, `ff00::1` and `64:ff9b::7f00:1` all return `is_global=True`, while every IPv4-mapped private form returns False | two `python3 -c` runs, table reproduced in the SSRF section |

### The indexer is not a safe hard dependency

| Claim | Value | How verified |
| --- | --- | --- |
| It went down twice in one session | `/api/v1/agents?chain_id=56&limit=1` returned `{"success":false,"error":{"code":"DATABASE_ERROR"}}` at roughly 02:21Z and again at **03:11Z**, while `/api/v1/status/freshness` self-reported `"status":"down"` both times | repeated curls, second observation saved `raw/r12-8004scan-freshness-recheck-2026-09-05.json` and `raw/r12-8004scan-agents-recheck-2026-09-05.json` |
| What it says about itself when down | `{"status":"down","checked_at":"2026-09-05T03:09:45Z","components":[{"name":"direct_checkpoints","status":"down","total":59,"stale_warning":2,"stale_critical":2,...,"message":"2 chains exceed direct checkpoint warning freshness"}, ...]}` | the saved freshness body |
| One filter combination fails reproducibly | `?chain_id=56&has_a2a=true&sort_by=total_score&sort_order=desc` returns `DATABASE_ERROR` | curl, reproduced twice earlier in the session |
| Its declaration counts, captured while it was up | 27,048 of 303,461 BSC agents `has_a2a=true`, 5,366 `has_mcp=true`, 339 `has_oasf=true`, 70,464 `x402_supported=true` | `curl ".../agents?chain_id=56&limit=1&<filter>"`, totals in `raw/r12-8004scan-*.json`. Not re-verifiable at the time of writing because the index is down |
| It health-checks only two service types | for agent 705 it marks `a2a` healthy at 254.77 ms with `domain_verified: true` and marks all 11 others `skipped` with `"Service type not health-checked: <key>"` | `raw/8004scan-quality-56-705-2026-09-05.json` |
| Its endpoint verification is exactly the ERC-8004 check | "queues a verification task to check if the agent's endpoint domain has a valid .well-known/agent-registration.json file that contains matching registration info. Rate limit: Once per hour per agent." | `jq '.paths["/api/v1/agents/verify-endpoint/{chain_id}/{token_id}"]' raw/8004scan-openapi-2026-09-05.json` |
| Its own protocol fields are stale in two directions at once | for agent 705 the score dimension says `a2a_stats.version "0.3.0"` with `skills_count 3` while the health check in the same response says 4 skills. The live card has **4** skills and calls itself `0.4.0`, so the health count is right and the score dimension is stale | the saved quality response versus today's live card fetch |
| It has no MCP JSON-RPC endpoint | `POST https://api.8004scan.io/mcp` with a well-formed `tools/list` returns 404 `{"detail":"Not Found"}`; its "MCP tools" are six REST paths under `/api/v1/mcp/tools/*` | one POST plus `jq '.paths\|keys[]\|select(test("mcp"))' raw/8004scan-openapi-2026-09-05.json` |

## Unverified or open

| Claim | What blocked it |
| --- | --- |
| Whether the 27,048 `has_a2a` figure survives validation | across 1,086 sampled agents (780 read straight off chain plus a 306-agent off-chain corpus) every A2A declaration but one points at the TermiX template, which my validator rejects against all four A2A revisions. Extrapolating to all 27,048 needs a full sweep, about 30 minutes of `eth_call`, which I did not run. The counts also cannot be refreshed right now because the index is returning `DATABASE_ERROR`. |
| Which A2A method `api.bortagent.xyz/api/a2a` does implement | 8 read-only method names all returned JSON-RPC `-32601 unsupported method` (`tasks/get`, `tasks/list`, `GetTask`, `agent/getAuthenticatedExtendedCard`, `agent/authenticatedExtendedCard`, `agent/card`, `a2a/card`). Only `message/send` and `message/stream` remain plausible and firing either could start a real, possibly billable task on somebody else's agent, so I stopped. |
| Whether TermiX agents are reachable through A2A at all | the card returns `endpoint: null`, `status: "UNBOUND"`, `presence: "offline"` for the agent I checked. R07 covers the platform's own `/api/v1/a2a/rpc` and `/api/v1/acn/rpc`, which I did not exercise. |
| The header name 8004scan signs its webhooks with | the skill doc states HMAC-SHA256 over a shared secret of at least 16 characters and HTTPS-only delivery, but neither the doc nor the OpenAPI names the signature header, and registering a webhook needs an API key. If it follows Standard Webhooks the names are `webhook-id`, `webhook-timestamp`, `webhook-signature`, which is a guess, not a reading. |
| 8004scan's precise A2A health probe | its message is `Valid A2A AgentCard (4 skills) (cached)` with a latency, which implies GET plus parse plus a skills count. Which revision it validates against is not documented and it accepts a card my validator only passes at 0.1.0. |
| How stale the indexer's protocol fields run | no published TTL, and one response carried two different skill counts for the same agent. |
| Whether B402 accepts the `escrow` payment flow on BSC | R03 could not get a `/supported` response from the Binance facilitator, so which `assetTransferMethod` and `paymentFlow` pairs it accepts is open. That decides whether a days-long job can be pre-committed on chain rather than authorised. |
| Whether any BSC agent implements A2A push notifications | no card I read sets `capabilities.pushNotifications` true. All three set it false. |
| Whether any BSC agent serves the `offer-receipt` or `payment-identifier` x402 extensions | the one live 402 challenge I decoded carries `bazaar` and `builder-code` only. I did not sweep the b402 bazaar's 100 captured resources for extension keys. |
| Whether the OASF 0.8.0 taxonomy the docs cite matches v0.8.7 exactly | I checked group and leaf names at tag v0.8.7, not at 0.8.0. A rename inside the 0.8.x line would move a few of the hits, though it cannot rescue `information_skills`, which exists at no version. |
| Whether arcabot's missing CORS header is deliberate | it serves `application/json` with an ETag and no `Access-Control-Allow-Origin`. Whether that is policy or oversight is not knowable from outside, and it makes no difference to the design conclusion. |

## Interfaces and constants

### 1. A2A (Agent2Agent), Linux Foundation, v1.0.1

**What it standardises.** The agent-to-agent task lifecycle: how a client sends a message, how the server
returns a long-lived `Task`, how progress and outputs stream back, how a webhook is registered for a task,
and how the agent advertises all of that in a card. It does not standardise payment and it does not
standardise a registry API. The discovery guide says so directly: "The current A2A specification does not
prescribe a standard API for curated registries."

**Discovery.** `GET https://{server_domain}/.well-known/agent-card.json`, IANA-registered permanently on
2025-08-01. Cards should carry `Cache-Control` plus an `ETag` derived from the card `version` or a content
hash, and clients should use `If-None-Match`. Both live BSC hosts that serve a card do send an ETag, one
with `max-age=0, must-revalidate` and one with `max-age=300`.

**AgentCard, v1.0, field for field** (proto field names; JSON is camelCase per protojson):

```
message AgentCard {
  string name                                  = 1;   REQUIRED
  string description                           = 2;   REQUIRED
  repeated AgentInterface supported_interfaces = 3;   REQUIRED
  AgentProvider provider                       = 4;
  string version                               = 5;   REQUIRED   (the agent's version, not the protocol's)
  optional string documentation_url            = 6;
  AgentCapabilities capabilities               = 7;   REQUIRED
  map<string, SecurityScheme> security_schemes  = 8;
  repeated SecurityRequirement security_requirements = 9;
  repeated string default_input_modes          = 10;  REQUIRED
  repeated string default_output_modes         = 11;  REQUIRED
  repeated AgentSkill skills                   = 12;  REQUIRED
  repeated AgentCardSignature signatures       = 13;
  optional string icon_url                     = 14;
}
message AgentInterface   { string url = 1 REQ; string protocol_binding = 2 REQ; string tenant = 3;
                           string protocol_version = 4 REQ; }
message AgentProvider    { string url = 1 REQ; string organization = 2 REQ; }
message AgentCapabilities{ optional bool streaming = 1; optional bool push_notifications = 2;
                           repeated AgentExtension extensions = 3; optional bool extended_agent_card = 4; }
message AgentExtension   { string uri = 1; string description = 2; bool required = 3; Struct params = 4; }
message AgentSkill       { string id = 1 REQ; string name = 2 REQ; string description = 3 REQ;
                           repeated string tags = 4 REQ; repeated string examples = 5;
                           repeated string input_modes = 6; repeated string output_modes = 7;
                           repeated SecurityRequirement security_requirements = 8; }
message AgentCardSignature { string protected = 1 REQ; string signature = 2 REQ; Struct header = 3; }
```

`protocol_binding` values in the spec's own sample: `JSONRPC`, `GRPC`, `HTTP+JSON`. The first entry of
`supportedInterfaces` is the preferred one, and a client must copy that entry's `tenant` verbatim into
every request or omit the field when the entry omits it.

Card signing, when we choose to require it: strip default values honouring proto field presence, exclude
`signatures`, canonicalise with JCS (RFC 8785), sign as JWS (RFC 7515) with `alg`, `typ: "JOSE"`, `kid` in
the protected header, optionally `jku` pointing at a JWKS.

**Version detection by shape, because the declared version lies.** The one third-party BSC agent with a
real card declares A2A `0.4.0`, a release that does not exist. Its card carries no `protocolVersion` at
all, so the string came from somewhere else. Detect the revision from the field set, never from a version
string:

| Signal present on the card | Revision to validate against | Required set to enforce |
| --- | --- | --- |
| `supportedInterfaces` | 1.0 | `name`, `description`, `supportedInterfaces`, `version`, `capabilities`, `defaultInputModes`, `defaultOutputModes`, `skills`. Hand-coded, because the published schema enforces nothing. |
| `protocolVersion` starting `0.3`, plus `url`, plus `preferredTransport` or `additionalInterfaces`, possibly `signatures` | 0.3.0 | the 9-field set below |
| `protocolVersion` starting `0.2` | 0.2.6 | the same 9-field set, minus `signatures` from the allowed properties |
| no `protocolVersion`, no `supportedInterfaces`, possibly an `authentication` block | 0.1.0 | `name`, `url`, `version`, `capabilities`, `skills`. Skills need only `id` and `name`. `defaultInputModes` defaults to `["text"]` and is not typed as MIME. |

The 0.2.6 and 0.3.0 required set, identical in both: `capabilities`, `defaultInputModes`,
`defaultOutputModes`, `description`, `name`, `protocolVersion`, `skills`, `url`, `version`, plus
`skills[].{id,name,description,tags}` and `provider.{organization,url}` where `provider` is present.

**Normalise all four into one internal shape** so the rest of the marketplace never branches on revision:

| Internal field | 1.0 source | 0.3.x source | 0.2.x source | 0.1.0 source |
| --- | --- | --- | --- | --- |
| `interfaces[]` | `supportedInterfaces[]` as-is | `[{url, transport: preferredTransport}]` then `additionalInterfaces[]` | same | `[{url, transport: "JSONRPC"}]`, transport assumed and flagged as assumed |
| `revision` | `1.0` | `protocolVersion` | `protocolVersion` | `0.1.0`, inferred |
| `agentVersion` | `version` | `version` | `version` | `version` |
| `security` | `securitySchemes` plus `securityRequirements` | `securitySchemes` plus `security` | same | `authentication.schemes[]`, mapped to scheme names only |
| `skills[].tags` | present | present | present | absent, so category inference falls back to text |
| `capabilities.streaming` / `pushNotifications` | present | present | present | present |
| `extendedCard` | `capabilities.extendedAgentCard` | `supportsAuthenticatedExtendedCard` | same | absent |

Two fields worth reading opportunistically and never trusting: `capabilities.stateTransitionHistory`
(0.2.x and 0.3.x only, dropped in 1.0) and `capabilities.x402`, which appears on a live BSC card and is in
no A2A revision.

**Method map across the three bindings** (spec section 5.3, reproduced exactly):

| Functionality | JSON-RPC method | gRPC method | REST endpoint |
| --- | --- | --- | --- |
| Send message | `SendMessage` | `SendMessage` | `POST /message:send` |
| Send streaming message | `SendStreamingMessage` | `SendStreamingMessage` | `POST /message:stream` |
| Get task | `GetTask` | `GetTask` | `GET /tasks/{id}` |
| List tasks | `ListTasks` | `ListTasks` | `GET /tasks` |
| Cancel task | `CancelTask` | `CancelTask` | `POST /tasks/{id}:cancel` |
| Subscribe to task | `SubscribeToTask` | `SubscribeToTask` | `POST /tasks/{id}:subscribe` |
| Create push config | `CreateTaskPushNotificationConfig` | same | `POST /tasks/{id}/pushNotificationConfigs` |
| Get push config | `GetTaskPushNotificationConfig` | same | `GET /tasks/{id}/pushNotificationConfigs/{configId}` |
| List push configs | `ListTaskPushNotificationConfigs` | same | `GET /tasks/{id}/pushNotificationConfigs` |
| Delete push config | `DeleteTaskPushNotificationConfig` | same | `DELETE /tasks/{id}/pushNotificationConfigs/{configId}` |
| Get extended card | `GetExtendedAgentCard` | same | `GET /extendedAgentCard` |

The 0.x names in the wild are different (`tasks/get`, `tasks/cancel`, `message/send`), which is why a probe
has to try the version the card declares rather than one fixed spelling. A live BSC endpoint returned
`-32601` for both spellings of every read-only name I tried, so probe results have to distinguish "method
absent" from "endpoint absent".

**Error taxonomy, with the exact three-way mapping** (spec section 5.4):

| A2A error | JSON-RPC | gRPC | HTTP |
| --- | --- | --- | --- |
| `TaskNotFoundError` | `-32001` | `NOT_FOUND` | 404 |
| `TaskNotCancelableError` | `-32002` | `FAILED_PRECONDITION` | 400 |
| `PushNotificationNotSupportedError` | `-32003` | `FAILED_PRECONDITION` | 400 |
| `UnsupportedOperationError` | `-32004` | `FAILED_PRECONDITION` | 400 |
| `ContentTypeNotSupportedError` | `-32005` | `INVALID_ARGUMENT` | 400 |
| `InvalidAgentResponseError` | `-32006` | `INTERNAL` | 500 |
| `ExtendedAgentCardNotConfiguredError` | `-32007` | `FAILED_PRECONDITION` | 400 |
| `ExtensionSupportRequiredError` | `-32008` | `FAILED_PRECONDITION` | 400 |
| `VersionNotSupportedError` | `-32009` | `FAILED_PRECONDITION` | 400 |

Every error payload must carry a machine-readable code, a human-readable message, optionally a `details`
array whose objects each carry a `@type` key, using `google.rpc.ErrorInfo` or `google.rpc.BadRequest` where
they fit.

**Task model.**

```
enum TaskState { UNSPECIFIED=0 SUBMITTED=1 WORKING=2 COMPLETED=3 FAILED=4
                 CANCELED=5 INPUT_REQUIRED=6 REJECTED=7 AUTH_REQUIRED=8 }
Task       { id REQ, context_id, status REQ, artifacts[], history[], metadata }
TaskStatus { state REQ, message, timestamp }
Message    { message_id REQ, context_id, task_id, role REQ (USER|AGENT), parts[] REQ,
             metadata, extensions[], reference_task_ids[] }
Part       { oneof: text | raw(bytes) | url | data(Value); metadata; filename; media_type }
Artifact   { artifact_id REQ, name, description, parts[] REQ, metadata, extensions[] }
```

Terminal states for cancellation: COMPLETED, FAILED, CANCELED, REJECTED. Cancel is idempotent and a
duplicate cancel may return `TaskNotFoundError` once the task is purged.

Results belong in `Artifact`, not `Message`: "Messages SHOULD NOT be used to deliver task outputs." And
messages are explicitly not a reliable channel: "Messages MUST NOT be considered a reliable delivery
mechanism for critical information", because a client that disconnects and reconnects may never see them.

**Versioning on the wire.** Clients MUST send `A2A-Version: <Major.Minor>` on every request or
`?A2A-Version=1.0` as a query parameter. An empty value MUST be read as `0.3`. Patch numbers must not
appear. An unsupported version gets `VersionNotSupportedError`.

**Push notification config and webhook payload.**

```
TaskPushNotificationConfig { tenant, id, task_id, url REQ, token, authentication }
AuthenticationInfo         { scheme REQ, credentials }
```

Delivery is plain HTTP regardless of which binding the agent otherwise speaks:

```http
POST {webhook_url}
Authorization: {scheme} {credentials}
Content-Type: application/a2a+json

{  /* StreamResponse: exactly one of */
   "task": {...} | "message": {...} | "statusUpdate": {...} | "artifactUpdate": {...} }
```

Server guarantees, quoted in force: agents MUST attempt delivery at least once per configured webhook, MAY
retry with exponential backoff, SHOULD use a 10 to 30 second timeout, MAY stop after a configured number of
consecutive failures. Receiver duties: MUST return 2xx to acknowledge, SHOULD process idempotently "as
duplicate deliveries may occur", MUST validate the task id matches one it created, SHOULD rate limit to
prevent webhook flooding, SHOULD use HTTPS.

The two update events:

```
TaskStatusUpdateEvent   { task_id REQ, context_id REQ, status REQ, metadata }
TaskArtifactUpdateEvent { task_id REQ, context_id REQ, artifact REQ, append, last_chunk, metadata }
```

`append` plus `last_chunk` is the whole partial-results mechanism: an artifact arrives in pieces, each piece
appended, the final piece flagged.

**Streaming.** `POST /message:stream` or `POST /tasks/{id}:subscribe`, response
`Content-Type: text/event-stream`, each event a `data:` line holding one `StreamResponse`. Ordering is
mandatory: "All implementations MUST deliver events in the order they were generated." Multiple concurrent
streams per task are allowed, all get the same events in the same order, and closing one does not affect the
others or the task. The shape is first a `Task` (or a single `Message`), then zero or more status or artifact
update events until the task reaches a terminal or interrupted state, at which point the stream closes.

**A2A's own SSRF and injection lines**, the closest thing to a normative rule we can point at when we impose
ours: agents SHOULD validate webhook URLs against SSRF by rejecting `127.0.0.0/8`, `10.0.0.0/8`,
`172.16.0.0/12`, `192.168.0.0/16`, rejecting localhost and link-local, and using allowlists where
appropriate. The `application/a2a+json` media type registration adds that implementations MUST sanitise
user-provided content to prevent injection attacks and MUST validate file references to prevent SSRF.

**The v1.0 sample card, trimmed to what a validator checks:**

```json
{
  "name": "GeoSpatial Route Planner Agent",
  "description": "...",
  "supportedInterfaces": [
    {"url": "https://x.example.com/a2a/v1",   "protocolBinding": "JSONRPC",   "protocolVersion": "1.0"},
    {"url": "https://x.example.com/a2a/grpc", "protocolBinding": "GRPC",      "protocolVersion": "1.0"},
    {"url": "https://x.example.com/a2a/json", "protocolBinding": "HTTP+JSON", "protocolVersion": "1.0"}
  ],
  "provider": {"organization": "Example Geo Services Inc.", "url": "https://www.examplegeoservices.com"},
  "iconUrl": "https://x.example.com/icon.png",
  "version": "1.2.0",
  "documentationUrl": "https://docs.example.com/api",
  "capabilities": {"streaming": true, "pushNotifications": true, "extendedAgentCard": true},
  "securitySchemes": {"google": {"openIdConnectSecurityScheme": {"openIdConnectUrl": "..."}}},
  "securityRequirements": [{"schemes": {"google": {"list": ["openid", "profile", "email"]}}}],
  "defaultInputModes": ["application/json", "text/plain"],
  "defaultOutputModes": ["application/json", "image/png"],
  "skills": [{"id": "route-optimizer-traffic", "name": "...", "description": "...",
              "tags": ["maps","routing"], "examples": ["..."],
              "inputModes": ["application/json"], "outputModes": ["application/json"]}],
  "signatures": [{"protected": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpPU0UiLCJraWQiOiJrZXktMSJ9",
                  "signature": "QFdkNLNszlGj..."}]
}
```

**What live BSC cards actually look like, with the machine verdict beside each.** Four shapes, all fetched
today, all run through `tools/r12-a2a-card-validate.py` against the four published schemas.

`arcabot.ai/.well-known/agent-card.json`, 1,200 bytes. Verdict: **VALID at A2A 0.1.0**, 6 errors at 0.2.6
and 0.3.0 (`protocolVersion` missing, `provider.url` missing, `tags` missing on all 3 skills that the
validator reached), 2 errors at 1.0 (`url` and `provider.identity` are unknown fields).

```json
{ "name": "Arca", "description": "...", "url": "https://arcabot.ai", "version": "0.4.0",
  "provider": { "organization": "arcabot.ai", "identity": "arcabot.eth" },
  "capabilities": { "streaming": false, "pushNotifications": false },
  "defaultInputModes": ["text"], "defaultOutputModes": ["text"],
  "skills": [ { "id": "agent-infrastructure", "name": "Agent Infrastructure",
                "description": "A3Stack SDK for agent identity, discovery, payments, data, and accounts" },
              "... 3 more, none with tags ..." ] }
```

Read this as an old card, not a broken one. `defaultInputModes: ["text"]` is literally the v0.1.0 schema
default. `version: "0.4.0"` is the agent's own version, and the operator then copied it into the on-chain
service entry's `version` slot, where a consumer reads it as a protocol version. A marketplace that showed
"A2A 0.4.0" would be repeating a number that means nothing.

`api.bortagent.xyz/.well-known/agent-card.json`, 2,739 bytes. Verdict: **VALID at 0.1.0, 0.2.6 and 0.3.0**,
2 errors at 1.0 (the four 0.x-only fields plus two unknown capability keys). This is the most conformant
third-party A2A card I found on BSC.

```json
{ "protocolVersion": "0.3.0", "name": "BORT Agent", "description": "...",
  "url": "https://api.bortagent.xyz/api/a2a", "preferredTransport": "JSONRPC",
  "additionalInterfaces": [ { "transport": "JSONRPC",  "url": "https://api.bortagent.xyz/api/a2a" },
                            { "transport": "HTTP+JSON","url": "https://api.bortagent.xyz/api/inference/v1" },
                            { "transport": "HTTP+JSON","url": "https://api.bortagent.xyz/api/credits/v1" } ],
  "capabilities": { "streaming": false, "pushNotifications": false,
                    "stateTransitionHistory": false, "x402": true },
  "provider": { "organization": "BORT", "url": "https://bortagent.xyz" },
  "documentationUrl": "https://bortagent.xyz", "version": "1.0.0",
  "defaultInputModes": ["text/plain"], "defaultOutputModes": ["text/plain"], "skills": [] }
```

`skills: []` is schema-valid and useless. A conformance check passes, a usefulness check does not, and the
marketplace needs both. `capabilities.x402: true` is not in any A2A revision. It is the only
machine-readable payment signal I found on a live BSC card, worth reading opportunistically and never
trusting.

`bitagent`'s S3 copy fuses an ERC-8004 registration document and an A2A card into one file: top-level keys
include `registrations`, `services`, `supportedTrust`, `trustModels`, `x402support`, `FeedbackDataURI`,
`metadata`, `userInterface` alongside the card fields, and it uses the v0.1.0 `authentication` block.
Verdict: **VALID at 0.1.0**, 1 error at 0.2.6 and 0.3.0 (`protocolVersion` missing). Its declared card URL
404s today, so the only readable copy is the S3 object.

`platform-backend.prod.termix.live/api/v1/a2a/agents/216292/card`, 636 bytes. Verdict: **invalid at every
revision**: 3 errors at 0.1.0 (`url`, `version`, `capabilities` all missing), 6 at 0.2.6 and 0.3.0.

```json
{ "agentTokenId": "216292", "id": "cmrth2kxu16gxvl01gz6efpja", "name": "Ultra_Gold.agent",
  "description": "Ultra_Gold.agent on Termix Platform",
  "card": { "name": "Ultra_Gold.agent", "description": "...", "avatarUrl": null,
            "profile": { "category": "general", "displayName": "Ultra_Gold" },
            "roles": ["PROVIDER"], "tags": [] },
  "endpoint": null, "presence": "offline", "status": "UNBOUND",
  "skills": [], "roles": [], "tags": [],
  "tokenUri": "https://termix-platform-prod.s3.../<sha256>.json",
  "updatedAt": "2026-07-20T17:02:06.210Z" }
```

The useful part is the liveness triple. `status: "UNBOUND"`, `presence: "offline"`, `endpoint: null` means
the agent is registered on chain with nothing behind it. This is the single most common A2A "endpoint" on
BSC, and any listing built off the declaration alone would advertise a dead service. Note it does carry a
`card.profile.category` field, which is the only category signal anywhere in the live population, and it
reads `"general"`.

**One trap the validator cannot catch.** Nesting a card inside a `card` key, as TermiX does, means a naive
parser that does `card.name || doc.name` gets a plausible-looking result from a document that fails every
schema. Validate the document you fetched, not a sub-object you went looking for.

### 2. MCP (Model Context Protocol), revision 2026-07-28

**What it standardises.** A JSON-RPC tool and resource interface between a client and a server, with a
declared JSON Schema per tool. It is a capability surface, not a task lifecycle: no task id, no cancellation
of a job that outlives a connection, and as of this revision no protocol-level session at all.

**Two standard transports, no more.** stdio (newline-delimited JSON-RPC over a subprocess's standard
streams) and Streamable HTTP (one POST per message to a single MCP endpoint). Identical protocol semantics.

**What 2026-07-28 changed**, which matters because a marketplace cannot assume the old shape. The GET stream
endpoint is gone. Protocol-level sessions are gone. Server-to-client requests on an SSE stream are gone,
replaced by `InputRequiredResult` embedded in a result (MRTR, SEP-2322). Resumable SSE via `Last-Event-ID`
is "not supported".

**Streamable HTTP, exact rules.**

- Client MUST POST every message to the single MCP endpoint.
- Client MUST send `Accept` listing both `application/json` and `text/event-stream`.
- Client MUST send `MCP-Protocol-Version: 2026-07-28` on every POST and it MUST match
  `_meta["io.modelcontextprotocol/protocolVersion"]` in the body, or the server MUST reject with
  `400 Bad Request` and a `HeaderMismatch` error.
- Client MUST send `Mcp-Method: <method>` on all requests and `Mcp-Name: <params.name or params.uri>` on
  `tools/call`, `resources/read`, `prompts/get`. Both are REQUIRED for compliance.
- A notification body gets `202 Accepted` with no body, or an HTTP error status.
- A request body gets either `application/json` (one object) or `text/event-stream` (a stream scoped to that
  request). The client MUST support both.
- Unknown method: `404 Not Found` plus JSON-RPC `-32601`. Unsupported version: `400` plus
  `UnsupportedProtocolVersionError` listing supported versions.
- Servers MUST validate `Origin` and MUST return 403 when it is present and invalid, to stop DNS rebinding.
  Locally they SHOULD bind 127.0.0.1 only.
- Servers SHOULD set `X-Accel-Buffering: no` on SSE responses so proxies do not buffer.
- Long-lived streams SHOULD emit an SSE comment (`:\r\n`) as keep-alive.
- Cancellation on Streamable HTTP is closing the response stream. There is no `notifications/cancelled` on
  this transport.

**Capability discovery.** `server/discover` is the one method a server MUST implement and it needs no prior
handshake:

```json
{ "jsonrpc": "2.0", "id": "discover-1", "method": "server/discover",
  "params": { "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": { "name": "Marketplace", "version": "1.0.0" },
      "io.modelcontextprotocol/clientCapabilities": {} } } }
```

```json
{ "jsonrpc": "2.0", "id": "discover-1", "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": { "tools": {}, "resources": {} },
    "_meta": { "io.modelcontextprotocol/serverInfo": { "name": "ExampleServer", "version": "1.0.0" } },
    "instructions": "This server provides weather and resource utilities.",
    "ttlMs": 3600000, "cacheScope": "public" } }
```

`serverInfo` is self-reported and the spec says clients SHOULD NOT rely on it for security decisions.
`ttlMs` plus `cacheScope` is the server telling us how long we may cache, which is exactly what a listing
wants and is a field no other convention here provides.

**Tool declaration.** `tools/list` with cursor pagination, `nextCursor`, `ttlMs`, `cacheScope`. A tool:

```json
{ "name": "get_weather",
  "title": "Weather Information Provider",
  "description": "Get current weather information for a location",
  "inputSchema": { "type": "object",
                   "properties": { "location": { "type": "string", "description": "City name or zip code" } },
                   "required": ["location"] },
  "outputSchema": { "type": "object", "properties": { } },
  "annotations": { },
  "icons": [ { "src": "https://example.com/weather-icon.png", "mimeType": "image/png", "sizes": ["48x48"] } ] }
```

`inputSchema` MUST be a valid JSON Schema object, defaulting to draft 2020-12 when `$schema` is absent. No
parameters is expressed as `{"type":"object","additionalProperties":false}`. Names SHOULD be 1 to 128
characters from `[A-Za-z0-9_.-]`, case-sensitive, unique per server, and the spec warns that an aggregator
across servers must disambiguate collisions itself. `annotations` MUST be treated as untrusted unless the
server is trusted.

**Calling, and the two-channel error model.** `tools/call` returns `{resultType, content[], isError}`.
Protocol errors (unknown tool, malformed request, server fault) come back as JSON-RPC errors, for example
`-32602 Unknown tool: invalid_tool_name`. Tool execution errors come back as a **successful** JSON-RPC result
with `isError: true` and human-readable text in `content`, so the model can self-correct. A marketplace must
handle both and must not treat `isError: true` as an HTTP-level failure.

**Long jobs under MCP.** There is no task resource. The spec's own non-normative answer is an explicit opaque
handle returned by a creation tool and passed back as an argument:

```jsonc
// tools/call create_basket {}  ->  structuredContent { "basket_id": "bsk_a1b2c3" }
// tools/call add_item { "basket_id": "bsk_a1b2c3", ... }
```

with four stated design duties: validate authorisation against the handle on every call (a handle is a name,
not a capability, unless the server is unauthenticated in which case it is a bearer token and needs
UUIDv4-grade entropy plus a bounded lifetime), keep handles opaque, state the retention policy in the
creation tool's description so the model can see it, and return a tool execution error naming expiry so the
caller can recover. That is the pattern our own job ids should follow.

**MCP auth discovery, the one `.well-known` MCP touches.** An unauthenticated call gets:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource",
                  scope="..."
```

The client reads `resource_metadata`, fetches the RFC 9728 Protected Resource Metadata document, then the
Authorization Server Metadata. Insufficient scope is 403 with `error="insufficient_scope"`. Every one of
those URLs is operator-controlled input, which is why the SSRF section applies to MCP as much as to our own
probing.

**MCP tool declaration is the richest capability declaration in this ecosystem and nobody on BSC serves
one.** All 12 MCP declarations in the corpus point at a stdio install descriptor whose install step is
`npx -y @quackai/q402-mcp@latest`. Hosting a marketplace that spawns `npx` per listing is not a design we
would ship, and the one path that would make MCP consumable, x402's bazaar extension with
`input.type: "mcp"`, is not in use on any BSC agent I read.

### 3. x402: no well-known, a facilitator API, and a capability block inside the challenge

x402 has **no** `.well-known` path. Verified three ways: zero `well-known` matches across the v1 spec, the v2
spec and the v2 HTTP transport; `https://x402.org/.well-known/x402` returns 301 to HTML and
`https://x402.org/.well-known/agent-registration.json` returns 404; and the IANA registry has zero rows
mentioning x402. Discovery is a facilitator API:

```
GET /discovery/resources?type=http&limit=10
GET /discovery/search?query=weather+APIs&type=http&limit=5
GET /discovery/search?query=financial+data&limit=10&cursor=eyJwYWdlIjoyfQ==
```

On BSC the live instance is Binance's
`https://www.binance.com/bapi/ramp/v1/public/ramp/b402/bazaar/{resources,search}` (R03 has the details and a
captured response of 100 resources).

The three headers, since a listed agent has to speak them:

| Header | Direction | Contents |
| --- | --- | --- |
| `PAYMENT-REQUIRED` | server to client | base64 `PaymentRequired` |
| `PAYMENT-SIGNATURE` | client to server | base64 `PaymentPayload` |
| `PAYMENT-RESPONSE` | server to client | base64 `SettlementResponse` |

402 covers both "payment needed" and "payment failed". All protocol information rides in headers, so
"response bodies are a server implementation concern".

**A live challenge, decoded, because this is what our client will actually parse.** One BSC-accepting
resource returns a v2 challenge in the header and a v1 challenge in the body at the same time:

```
PAYMENT-REQUIRED (base64, decoded):
{ "x402Version": 2,
  "accepts": [
    { "scheme":"exact", "network":"eip155:8453",
      "asset":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "amount":"50000",
      "payTo":"0x50ab2018c06c6E4eAA9BA52057Eb55eD284912fc", "maxTimeoutSeconds":300,
      "extra":{"name":"USD Coin","version":"2"} },
    { "scheme":"exact", "network":"eip155:56",
      "asset":"0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d", "amount":"50000000000000000",
      "payTo":"0x50ab2018c06c6E4eAA9BA52057Eb55eD284912fc", "maxTimeoutSeconds":300,
      "extra":{"name":"World Liberty Financial USD","version":"1",
               "assetTransferMethod":"eip3009",
               "signerAddress":"0x34F7a661160780Ce1346e6D7B96D2bE244590899"} },
    { "scheme":"exact", "network":"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "asset":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "amount":"50000",
      "payTo":"985iFjbnGQ3dJcwXnfRCMSrH4Jnc3kW1N6msR64B5KX1", "maxTimeoutSeconds":300,
      "extra":{"feePayer":"GVJJ7rdGiXr5xaYbRwRbjfaJL7fmwRygFi1H6aGqDveb"} } ],
  "resource": { "url":"...", "description":"...", "mimeType":"application/json",
                "serviceName":"SignalPulse", "tags":["crypto","market-tick","btc","eth","sol"],
                "iconUrl":"..." },
  "extensions": { "bazaar": {...}, "builder-code": {...} } }

body (same response):
{ "x402Version": 1, "error": "X-PAYMENT header is required",
  "accepts": [ { "scheme":"exact", "network":"base", "maxAmountRequired":"50000", "resource":"...", ... } ] }
```

Four things to take from that. The header is authoritative and the body is a v1 courtesy, so a client reads
the header first and only falls back to the body. `amount` in v2 replaces `maxAmountRequired` in v1 and
`network` moves from a name (`base`) to CAIP-2 (`eip155:8453`), so a parser must handle both keys.
`maxTimeoutSeconds` is 300 in the wild against 60 in every spec example, so treat the spec number as a floor
and read the field. And the BSC leg pays in an 18-decimal asset, so `5e16` is 0.05 units, which means any
price display has to read decimals per asset rather than assuming 6.

**The four x402 extensions that bear on a marketplace.** All four live in `specs/extensions/` upstream and
all four follow one pattern: an `info` object carrying the data and a `schema` object carrying the JSON Schema
that validates `info`. Servers advertise extensions in `PaymentRequired`, clients echo them in
`PaymentPayload`, and "the client must include at least the info received; it may append additional info but
cannot delete or overwrite existing info."

**`bazaar`, the capability declaration.** This is x402's answer to "what does this endpoint take and return".

```json
{ "extensions": { "bazaar": {
  "info": {
    "input":  { "type": "http", "method": "GET", "queryParams": {}, "headers": {} },
    "output": { "type": "json", "format": "...", "example": { } } },
  "schema": { "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object",
              "properties": { "input": { }, "output": { } }, "required": ["input"] },
  "routeTemplate": "/users/:userId" } } }
```

Input is a discriminated union on `input.type`:

| `input.type` | Required fields | Notes |
| --- | --- | --- |
| `http` with `method` in `GET`, `HEAD`, `DELETE` | `type`, `method` | optional `queryParams`, `headers` |
| `http` with `method` in `POST`, `PUT`, `PATCH` | `type`, `method`, `bodyType` in `json`/`form-data`/`text`, `body` | presence of `bodyType` is the sub-discriminator |
| `mcp` | `type`, `tool`, `inputSchema` | `inputSchema` is MCP's own `Tool.inputSchema` format, "Servers should reuse the same schema their MCP tool already declares". Optional `transport` in `streamable-http` (default) or `sse`, optional `description`, optional `example` |

For MCP tools the catalog key is the tuple (`resource.url`, `input.tool`), because MCP multiplexes many tools
over one endpoint, and "Facilitators **must** use both fields when cataloging MCP tools". Facilitators
**must** validate `info` against `schema` before cataloging, and they signal the outcome back on an
`EXTENSION-RESPONSES` header, base64 JSON keyed by extension name, with `bazaar.status` in
`success` / `processing` / `rejected` plus `bazaar.rejectedReason`.

`routeTemplate` handles parameterised routes: `info.input.pathParams` carries the concrete values for this
request, `routeTemplate` at the top level of the extension carries `/users/:userId`, and the facilitator maps
every concrete request to one catalog entry. Its validation rules are worth copying verbatim into our own
URL handling because they are a compact path-injection guard:

| Rule | Reason given |
| --- | --- |
| non-empty string | empty or absent means "no template" |
| must start with `/` | prevents relative paths and external URLs |
| must match `^/[a-zA-Z0-9_/:.\-~%]+$` | only safe URL path characters and `:param` identifiers |
| must not contain `..` | prevents path traversal |
| must not contain `://` | prevents URL injection |

Percent-encoding is decoded **before** the `..` and `://` checks, so `%2e%2e` is caught. A value that fails
any rule is discarded and the concrete path is used instead.

Backwards compatibility, if we ever read a v1 challenge: `accepts[0].outputSchema` maps to
`extensions.bazaar`, `accepts[0].resource` to `resource.url`, `accepts[0].description` to top-level
`description`, `accepts[0].mimeType` to top-level `mimeType`.

**`offer-receipt`, signed terms and signed proof of delivery.** This is the piece that turns a payment into
evidence, and its stated purposes are dispute evidence, "user-review attestations (e.g., 'I paid and received
service')" and "verifiable proof of commercial interactions for reputation systems". For a marketplace whose
reputation surface is ERC-8004 feedback, that is the missing link between a payment and a review.

Both artifacts share one shape: `{format, payload, signature, acceptIndex?}` with `format` in `eip712` or
`jws`. For `jws` the `payload` is omitted because the compact string already carries it. EIP-712 domain is
`{name: "x402 offer" | "x402 receipt", version: "1", chainId: 1}`, with chainId hardcoded to 1 on purpose
because this is off-chain signing only and the payment network lives in the payload. The canonical `types`
are normative and MUST NOT be transmitted:

```javascript
{ "primaryType": "Offer",
  "types": { "EIP712Domain": [ {"name":"name","type":"string"}, {"name":"version","type":"string"},
                               {"name":"chainId","type":"uint256"} ],
             "Offer": [ {"name":"version","type":"uint256"}, {"name":"resourceUrl","type":"string"},
                        {"name":"scheme","type":"string"},   {"name":"network","type":"string"},
                        {"name":"asset","type":"string"},    {"name":"payTo","type":"string"},
                        {"name":"amount","type":"string"},   {"name":"validUntil","type":"uint256"} ] } }

{ "primaryType": "Receipt",
  "types": { "EIP712Domain": [ ...same three... ],
             "Receipt": [ {"name":"version","type":"uint256"}, {"name":"network","type":"string"},
                          {"name":"resourceUrl","type":"string"}, {"name":"payer","type":"string"},
                          {"name":"issuedAt","type":"uint256"},  {"name":"transaction","type":"string"} ] } }
```

Placement: offers at `extensions["offer-receipt"].info.offers[]` in the challenge, the receipt at
`extensions["offer-receipt"].info.receipt` in the settlement response, on success only. Unused optional
fields MUST be zero (`validUntil: 0`) or empty string (`transaction: ""`) for signing, and verifiers MUST
treat those as absence. `acceptIndex` is an unsigned convenience field and MUST NOT be relied on: clients
match an offer to an `accepts[]` entry by comparing the signed fields. Signer authorisation is left open,
with the simple option being that the recovered signer equals `payTo`. The receipt omits `transaction` by
default for privacy and includes it when verifiability matters more. Security notes worth carrying: the
`signature` field must not be inside the signed payload, long-lived offers need `validUntil` to bound replay,
and both artifacts are transferable bearer proofs so HTTPS is essential.

**`payment-identifier`, x402's own idempotency key.** `info.id`, 16 to 128 characters of alphanumerics,
hyphens and underscores, recommended as UUIDv4 with a `pay_` prefix, plus `info.required` as a boolean the
server sets. Behaviour table, verbatim in effect: new id processes normally, same id with the same payload
returns the cached response, same id with a different payload returns **409 Conflict**, and `required: true`
with no id returns 400. Either the resource server or the facilitator may enforce it, or both.

That 409 is a real conflict with the IETF draft, which reserves 409 for "a request is outstanding for this
Idempotency-Key" and uses **422** for a key reused with a different payload. A marketplace speaking both has
to pick one mapping per surface and document it. My recommendation is in the wire contract below: follow the
IETF draft on our own `POST /v1/jobs` because that is the surface a buyer's HTTP client sees, and accept
either code from a listed agent's own payment layer.

**`http-message-signatures`, RFC 9421 identity for the paying agent.** `info` carries `registrationUrl`,
`signatureSchemes` (for example `["ed25519","ecdsa-p256-sha256","rsa-pss-sha512"]`) and `tags` (for example
`["web-bot-auth","agent-browser-auth"]`). The client hosts its public keys at
`/.well-known/http-message-signatures-directory` per `draft-meunier-http-message-signatures-directory`, which
is a third well-known path in this space and is **not** IANA-registered. Servers may also sign responses,
covering `@status`, the `payment-required` or `payment-response` header, and request components bound with
the `req` flag (`"@authority";req`, `"@path";req`), with `tag="x402-response"`. Cloudflare's `cloudflare:402`
network is named as a live user with ed25519 and the `web-bot-auth` tag.

### 4. AP2 (Agentic Payments Protocol), v0.2

**What it standardises.** Cryptographic proof that an agent was authorised to buy a specific thing and to pay
for it, as two linked signed mandates plus receipts, designed to survive a dispute. Explicitly not a commerce
protocol: "The exact details of the Commerce Protocol (e.g. catalog APIs, checkout updates, and specific APIs
for communication between the different roles) are outside the scope of AP2."

**Five roles.** Shopping Agent, Credential Provider, Merchant, Merchant Payment Processor, Trusted Surface.
One entity may play several. Roles MAY delegate.

**Two mandates, versioned by `vct`.** `mandate.checkout.open.1`, `mandate.payment.open.1`,
`mandate.payment.1`. Implementations MUST match the exact `vct` string including the numeric suffix, and an
incompatible revision gets a new suffix.

- The Checkout Mandate proves the agent may buy the assembled checkout. The merchant MUST provide a
  merchant-signed JWT holding the Checkout, and the closed mandate binds to it by cryptographic hash. The
  merchant MUST return a Checkout Receipt on accept or reject.
- The Payment Mandate proves the agent may pay for that checkout, bound by the hash of the Checkout JWT. That
  JWT MUST be signed with a non-deterministic scheme (ECDSA, not Ed25519) to stop rainbow-table attacks on the
  hash.

**Two modes.** Direct (human present): the user sees the closed checkout and signs. Autonomous (human not
present): the user pre-approves constraints in an open mandate and the agent signs the closed mandates with
its own key, trust flowing from the open mandate. Verifiers always receive closed mandates either way and
only the constraints relevant to them are disclosed.

**Wire format is SD-JWT with key binding.** Real shape from the spec's own example:

```json
{ "issuer_signed_jwt": { "header": { "alg": "ES256", "typ": "kb+sd-jwt" },
    "payload": { "delegate_payload": [ { "...": "<digest>" } ], "iat": 1777342370,
                 "aud": "credential-provider", "nonce": "a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3",
                 "sd_hash": "uixoHemmfrrCSbPREo9j-ziLuMkqExsPeWrwA-PK0Ck", "_sd_alg": "sha-256" } },
  "disclosures": [ { "digest": "<digest>", "decoded": [ "<salt>", {
      "vct": "mandate.payment.1",
      "transaction_id": "NivWhuqfzcvZNapvIEJ2-3tsdQLkiuIcye2g46WVgX8",
      "payee": { "id": "merchant_1", "name": "Demo Merchant", "website": "https://demo-merchant.example" },
      "payment_amount": { "amount": 19900, "currency": "USD" },
      "payment_instrument": { "id": "stub", "type": "card", "description": "Card 4242" } } ] } ] }
```

An open mandate carries typed constraints plus a `cnf.jwk` key binding and `iat` / `exp`:

```json
{ "vct": "mandate.payment.open.1",
  "constraints": [
    { "type": "payment.amount_range", "currency": "USD", "max": 20000, "min": 0 },
    { "type": "payment.allowed_payees", "allowed": [ { "...": "<digest>" } ] },
    { "type": "payment.reference", "conditional_transaction_id": "FzLoxbbtgQGYZxoSM2NJ..." } ],
  "cnf": { "jwk": { "crv": "P-256", "kty": "EC", "x": "...", "y": "..." } },
  "iat": 1777342357, "exp": 1777345957 }
```

Constraint types seen in the spec: `payment.amount_range`, `payment.budget`, `payment.allowed_payees`,
`payment.allowed_payment_instruments`, `payment.allowed_pisps`, `payment.agent_recurrence` (`frequency`,
`max_occurrences`), `payment.execution_date`, `payment.reference`.

**Where AP2 stands for us.** The constraint vocabulary is the right mental model for a delegated mandate (a
spend cap, an allowlist, an expiry), which is the same triple the Altana track requires, so it is worth
citing in a design doc. It is not a rail we can implement against on BSC in this window: zero crypto
instruments in the normative spec, x402 present only as a Base Sepolia sample with Anvil keys, zero adoption
across 306 parsed BSC registration documents.

### 5. ERC-8004 endpoint domain verification, the exact rule, and five traps

The rule, from the live EIP: an agent MAY prove control of an HTTPS endpoint-domain by publishing
`https://{endpoint-domain}/.well-known/agent-registration.json` containing at least a `registrations` list or
the full registration file. Users MAY treat the domain as verified when the file is reachable over HTTPS and
includes a `registrations` entry whose `agentRegistry` and `agentId` match the on-chain agent. If the
endpoint-domain is the same domain that serves the `agentURI` document, the extra check is redundant because
control is already demonstrated.

Minimum body that satisfies it, matching what a live BSC domain serves:

```json
{ "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "...", "description": "...", "image": "...",
  "registrations": [ { "agentId": 705,
                       "agentRegistry": "eip155:56:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" } ],
  "supportedTrust": ["reputation"], "active": true }
```

**Trap 1, case.** On-chain documents write the registry address checksummed (`0x8004A169FB4a...`) and
lowercased interchangeably. Compare the CAIP-2 prefix case-sensitively and the address case-insensitively.

**Trap 2, 200 is not existence.** `evoevo.ai` returns HTTP 200 with `text/html` and 74,239 bytes for both
well-known paths. A checker that tests `status == 200` marks it verified. Require a JSON content type or a
successful parse, and require the `registrations` array to be present.

**Trap 3, `agentId` type and the zero placeholder.** It appears as a JSON number in some documents and a
quoted string in others (`"agentId": "38561"` on one card, `"agentId": 705` on another). Coerce before
comparing. Separately, one live agent's `registrations` array spans 22 chains and three of them carry
`agentId: 0`. Match the full triple (chain id, registry address, agent id) and treat 0 as unusable rather than
as a match.

**Trap 4, the two documents drift.** The `agentURI` copy and the well-known copy are separate files
maintained by hand. On the one BSC agent where I compared them today they carry the identical top-level key
set and differ in service count (12 versus 8) and in whether an A2A service exists at all. Read endpoints from
the `agentURI` document, the one the chain points at, and use the well-known file only as the domain proof it
is defined to be.

**Trap 5, the endpoint may be a document URL rather than a domain.** The same agent's A2A service entry reads
`"endpoint": "https://arcabot.ai/.well-known/agent-card.json"`. Another agent's reads
`https://platform-backend.prod.termix.live/api/v1/a2a/agents/{agentId}/card` with the literal placeholder
still in it. A resolver has to handle three cases (a full card URL, a base URL to append the well-known path
to, a template needing the on-chain id substituted) and record which one it took.

**A structural reason the proof rate is so low.** RFC 8615 says well-known URIs are rooted at the top of the
path hierarchy and "are not well-known by definition in other parts of the path". A platform that shards its
agents onto nested paths, as one BSC platform does with
`/aip/erc8004:<slug>/.well-known/agent-card.json`, cannot pass the ERC-8004 check by construction, because the
proof has to sit at the origin root and the origin root belongs to the platform rather than to the agent. Any
multi-tenant platform hits this. It is not an oversight on their part, it is the well-known mechanism being
per-origin.

**What the check is worth on BSC right now: almost nothing as a filter, everything as a differentiator.**
5 agents out of 335,003 pass it. A marketplace that displays it, and publishes the reason a domain failed, is
showing a signal no rival listing carries. It also costs one static JSON file to pass, which we have already
done once on our own domain.

### 6. OASF, the one capability taxonomy already on chain, and why it needs validating

OASF (Open Agentic Schema Framework, `agntcy/oasf`) is a skill and domain taxonomy, not a transport. On BSC it
appears as a service entry whose `endpoint` is always the GitHub repo, carrying two arrays of slash-separated
paths:

```json
{ "name": "OASF", "endpoint": "https://github.com/agntcy/oasf/", "version": "0.8.0",
  "skills": [ "natural_language_processing/information_retrieval_synthesis/search",
              "natural_language_processing/text_classification",
              "agent_orchestration/agent_coordination",
              "evaluation_and_monitoring/quality_evaluation" ],
  "domains": [ "media_and_entertainment/news", "technology/artificial_intelligence" ] }
```

That is the only structured, machine-readable capability signal in the ERC-8004 documents at volume: 30 of
120 in the oldest id window, and the indexer counts 339 BSC agents with `has_oasf=true`.

The canonical taxonomy is fetchable: `GET https://schema.oasf.outshift.com/api/skills` returns 550,821 bytes
with 496 skill paths under 19 top-level groups, each entry carrying an integer `id` alongside the path.
`/export/skills`, `/api/categories` and `/api/v1/skills` all 404, so `/api/skills` is the endpoint.

**The taxonomy was renamed between 0.8.x and 1.x, and the live strings are 0.8.x-era.** Current groups are
`ai_ml_engineering`, `audio_speech_processing`, `base_skill`, `business_professional`, `computer_vision`,
`content_writing_marketing`, `cybersecurity`, `data_engineering_analytics`, `devops_cloud_infra`,
`governance_compliance`, `language_processing`, `mathematical_reasoning`, `multimodal_processing`,
`reasoning_planning`, `research_knowledge_productivity`, `science_specialized`, `software_engineering`,
`three_d_generation`, `tool_use_automation`. At tag v0.8.7 they were `advanced_reasoning_planning`,
`agent_orchestration`, `analytical_skills`, `audio`, `data_engineering`, `devops_mlops`,
`evaluation_monitoring`, `governance_compliance`, `images_computer_vision`, `multi_modal`,
`natural_language_processing`, `retrieval_augmented_generation`, `security_privacy`, `tabular_text`,
`tool_interaction`. So a validator has to pin the version the document declares.

**Even pinned to 0.8.7, the highest-volume strings are invented.** Checked leaf by leaf against the repo at
that tag:

| Live string | Agents declaring it | Verdict at OASF v0.8.7 |
| --- | --- | --- |
| `information_skills/news_synthesis` | 8,487 | **invalid**, no `information_skills` group at any version (path 404, code search total 0) |
| `analytical_skills/data_analysis/crypto_analysis` | 4,940 | **invalid**, `analytical_skills` contains only `coding_skills` and `mathematical_reasoning` |
| `analytical_skills/market_insights` | 4,940 | **invalid**, same reason |
| `agent_orchestration/task_decomposition` | 1,666 | valid, `task_decomposition.json` exists |
| `security_privacy/threat_detection` | 1,597 | valid |
| `evaluation_monitoring/anomaly_detection` | 1,383 | valid |
| `natural_language_processing/text_classification` | in use | valid |
| `retrieval_augmented_generation/document_retrieval` | in use | **invalid**, real leaves are `document_or_database_question_answering`, `generation_of_any`, `retrieval_of_information` |
| `evaluation_and_monitoring/quality_evaluation` | agent id 1 | **invalid**, the group is `evaluation_monitoring` |

The indexer independently marks every top-used skill and domain `"is_standard": false, "category_id": null`,
which agrees. Top declared domains on BSC are `technology/blockchain/cryptocurrency` 5,554,
`finance/markets/crypto` 4,940, `geopolitics/international_relations` 3,547, `finance/global_economics` 3,546,
and none of those are canonical OASF domain paths either.

**What to do with it.** Consume OASF when it is present, validate each path against the pinned version, and
show valid and invalid counts per listing rather than a badge. Do not build the four mandated categories on
top of it: no canonical OASF path names rebalancing, grid trading, yield or health factor, and the
finance-adjacent strings in live use are the invented ones. Categories are ours to define, which the manifest
below does.

### 7. Conventions the surrounding ecosystem already ships

**8004scan's health model** is what our listings will be compared against. Its per-agent `endpoint_health`
block:

```json
{ "overall_status": "healthy", "health_score": 100.0, "checked_at": "2026-09-04T09:41:00Z",
  "declared_services_count": 4,
  "counts": { "healthy": 1, "degraded": 0, "unhealthy": 0, "unknown": 0, "skipped": 11 },
  "services": [ { "key": "a2a", "label": "A2A", "status": "healthy",
                  "message": "Valid A2A AgentCard (4 skills) (cached)", "latency_ms": 254.77,
                  "checked_at": "...", "domain": "arcabot.ai", "domain_verified": true,
                  "verification_status": "verified", "verification_error": null },
                { "key": "web", "status": "skipped",
                  "message": "Service type not health-checked: web" } ] }
```

Status vocabulary `healthy` / `degraded` / `unhealthy` / `unknown` / `skipped`, with only `a2a` and `mcp`
probed. Verification vocabulary `verified` / `skipped` plus a `verification_error` string. Metadata issues are
coded (`WA040`, "HTTP/HTTPS URI is not content-addressed") and risk flags carry
`{id, severity, category, title, description, evidence, source, detected_at}` with severities low, medium,
high. Two lessons: 11 of 15 declared services get no check at all, and its own score dimension can disagree
with its own health check inside a single response.

**Its webhook contract**, the shape a buyer-facing marketplace should match:

```json
POST /api/v1/webhooks   { "url": "https://yourserver.com/webhook",
                          "events": ["feedback.received", "validation.completed"],
                          "secret": "your-shared-secret", "description": "optional" }
```

Rules: HTTPS url, secret at least 16 characters, HMAC-SHA256 signing, at least one valid event type.
Delivery history exposes `{id, event, status, responseCode, attempt, payload, createdAt, deliveredAt}` with
statuses `success` (2xx received), `failed` (retries exhausted), `pending` (awaiting next retry). Events:
`validation.requested`, `validation.completed`, `feedback.received`, `feedback.revoked`, `star.received`,
`star.removed`, each payload carrying
`{event, timestamp, data.chainId, data.tokenId, data.agentId, data.transactionHash}` with `agentId` formatted
`{chainId}:{tokenId}`.

**Standard Webhooks** is the spec to follow for our own outbound notifications, because it is the only
webhook convention with a written signature scheme and a written retry schedule. Exact form:

```http
POST {subscriber_url}
webhook-id: msg_2KWPBgLlAfxdpx2AI54pPJ85f4W
webhook-timestamp: 1674087231
webhook-signature: v1,K5oZfzN95Z9UVu1EsfQmfVNQhnkZ2pj9o9NDN/H/pI4= v1a,hnO3f9T8Ytu9HwrXslvumlUp...
Content-Type: application/json

{ "type": "job.completed", "timestamp": "2026-09-05T03:11:02Z", "data": { } }
```

Signed content is `msg_id.timestamp.payload` joined by full stops. `v1,` is symmetric HMAC-SHA256, `v1a,` is
asymmetric ed25519, and the header is a space-delimited list so a secret can be rotated with no downtime.
Secrets serialise as `whsec_`, asymmetric keys as `whsk_` and `whpk_`, so an implementation can tell which
scheme a key belongs to without configuration. Verification duties: constant-time comparison, a timestamp
tolerance window, and use `webhook-id` as the idempotency key. Its retry schedule is immediate, 5 s, 5 min,
30 min, 2 h, 5 h, 10 h, 14 h, 20 h, ending 51 hours after the first attempt, with jitter recommended and
consumer notification plus endpoint disablement after sustained failure. Event type names should be
hierarchical and full-stop delimited from `[a-zA-Z0-9_]`.

**TermiX's platform manifest** is a fourth well-known: `/.well-known/aacp-agent.json` on
`platform-backend.prod.termix.live`, live today at 34,261 bytes, `protocolVersion: "aacp-platform-v1"`, with
`endpoints: {acnRpc, a2aRpc, agentCard}`, a `capabilities` array (`discovery`, `rfq`, `offer`, `reviseOffer`,
`acceptOffer`, `evidence`, `arbitration`, `task-message`, `task-artifact`), `auth` (`api-key-scope`,
`wallet-session`) and an inline agent roster. R07 covers it. The relevant point here is that the one platform
with real BSC volume invented its own manifest rather than serving A2A's, and its per-agent card fails every
A2A schema.

### 8. CORS and caching, the unspecified layer that breaks a browser client

No specification in this space says anything about CORS. A2A mentions it zero times, MCP zero times across
nine captured documents, x402 zero times. Measured on live hosts today:

- `arcabot.ai/.well-known/agent-card.json` sends **no** `Access-Control-Allow-Origin`. A browser-side fetch
  from our origin is blocked, and the failure surfaces as a network error with no status, which is the worst
  possible diagnostic.
- `api.bortagent.xyz` and `brainonbnb.com` both send `Access-Control-Allow-Origin: *`.
- The live x402 resource sends `access-control-allow-origin: *`,
  `access-control-expose-headers: PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE` and
  `access-control-allow-headers: Content-Type, PAYMENT-SIGNATURE, X-API-KEY, X-PAYMENT`.

Two consequences. Card and manifest fetching happens server-side, always, and the marketplace serves its own
normalised copy to the browser with our own cache headers. And if a buyer is ever to pay from the browser
directly against a listed agent, that agent must expose the three payment headers, which is a Tier 2
requirement rather than something to assume. Caching hints do exist in the wild (`max-age=0,
must-revalidate` with a strong ETag on one host, `max-age=300` with a weak ETag on another), so honour
`If-None-Match` on refetch and treat a 304 as a successful probe.

## Cross-check against R01: what an ERC-8004 record carries and what it points at

R01 established the registry surface and the document corpus. Three of its findings decide the comms design,
and I re-verified the parts that bear on endpoints.

**The record carries no endpoint on chain.** The whole on-chain metadata vocabulary in live use on BSC is six
keys (`agentWallet`, `platform`, `platformAgentId`, `displayName`, `profileURL`, `termix.metadataHash`) plus
`category`, `skills` and `x402Support`, which are used by nobody. Endpoints exist only inside the off-chain
registration document that `tokenURI` points at. Every capability claim we surface therefore arrives over HTTP
from an operator-controlled URL, which puts the SSRF and injection rules below on the critical path rather
than in a hardening backlog.

**`services[]` is free text and the names collide.** R01 measured `services[].name` values `OASF` 11, `web` 3,
`agentWallet` 2, `email` 2, `undefined` 2, then `chat`, `A2A`, `A2ACard`, `MCP`, `twitter`, `telegram` once
each. My newest-300 sweep adds `termix platform`, `q402` and `erc-8183`. My oldest window adds `oasf` at 30 of
120. Match on a normalised lowercase name and accept `a2a`, `a2acard`, `a2a-card` as one thing.

**What the conventions point at, measured.** Combining the 780-agent on-chain sweep with the 290 parsed
documents from the off-chain corpus:

| Declared service | Occurrences | Distinct hosts | What is behind it |
| --- | --- | --- | --- |
| `A2A` / `a2a` | 251 | 2 | 250 the TermiX template (fails every A2A schema, mostly `UNBOUND` and `offline`), 1 `www.app.bitagent.io/aip/...` which 404s today at the nested path and at the origin root |
| `MCP` / `mcp` | 13 | 2 | 12 the q402 stdio install descriptor, 1 `www.8004scan.io/create` which is a web page returning 308 |
| `OASF` | 30 | n/a | slash-separated skill and domain paths, no callable endpoint, most-used strings not in the taxonomy |
| `web` | 270 | many | a human page |
| `q402` | 12 | 1 | `https://q402.quackai.ai/api/relay/info`, a payment relay descriptor |
| `erc-8183` | 1 | 1 | an on-chain hire path, not an HTTP endpoint |

Individually registered agents outside those windows do serve real cards (arcabot at 0.1.0, bortagent at
0.3.0, bitagent's S3 copy at 0.1.0), so the population is not empty. It is concentrated: two platforms account
for essentially all of it, and neither serves a card that validates.

**Reading of the ERC's intent versus its practice.** The ERC says endpoints "MAY point to an A2A agent card, an
MCP endpoint, an ENS agent name, DIDs, or the agent's wallets" and its example spells the service names `A2A`
and `MCP` with `version` values `0.3.0` and `2025-06-18`. That is the convention to emit. It is not a
convention to consume without validation, and the version field in particular is not a protocol version in
practice: the one live example says `0.4.0`, which no A2A release has ever been.

## The long-running job problem, four contracts in full

A grid trading agent runs for days. A rebalancer runs on a schedule. A health-factor monitor never finishes. A
synchronous HTTP request cannot express any of that, and neither MCP nor x402 has a task resource. Here are
the four shapes, each with the contract to require and the failure it is chosen to avoid.

### Pattern A: synchronous request

Use it only when the work provably fits inside one response. AIP-151's threshold is the one to quote: "A good
rule of thumb is 10 seconds."

```http
POST /v1/quote HTTP/1.1
Content-Type: application/json
Idempotency-Key: "8e03978e-40d5-43e8-bc93-6894a57f9324"
Accept: application/json

200 OK
Content-Type: application/json
{ "result": { }, "computedAt": "2026-09-05T03:11:02Z", "inputsAsOfBlock": 120036371 }
```

Contract:

- Server timeout published, and a hard ceiling below the marketplace's own gateway timeout.
- `Idempotency-Key` accepted and honoured per the draft rules below even here, because a client that times out
  will retry and a quote that moved money must not run twice.
- Errors as RFC 9457 problem details.
- No streaming, no partial results, no cancellation. If any of those are needed, it is pattern B.
- `inputsAsOfBlock` on anything derived from chain state, so a stale answer is detectable rather than
  plausible.

### Pattern B: polling with a job id, the default for a marketplace

This is the baseline to require. It works through every firewall, needs no inbound reachability from the agent
to us, and survives a client that goes away.

```http
POST /v1/jobs HTTP/1.1
Content-Type: application/json
Idempotency-Key: "1f9a...c2"
Prefer: respond-async, wait=10

202 Accepted
Location: https://agent.example/v1/jobs/job_01J8Z2QK
Retry-After: 5
Preference-Applied: respond-async
Content-Type: application/json
{ "jobId": "job_01J8Z2QK", "state": "SUBMITTED", "createdAt": "...", "expiresAt": "...",
  "pollAfterSeconds": 5, "cancelUrl": "https://agent.example/v1/jobs/job_01J8Z2QK/cancel" }
```

```http
GET /v1/jobs/job_01J8Z2QK

200 OK
{ "jobId": "job_01J8Z2QK",
  "state": "WORKING",
  "progress": { "percent": 42, "phase": "backtesting grid spacing", "updatedAt": "..." },
  "partial": { "artifacts": [ { "artifactId": "a1", "name": "grid-plan", "chunk": 3, "lastChunk": false } ] },
  "nonTerminalErrors": [ { "type": "https://agent.example/problems/rpc-timeout", "title": "RPC timeout",
                           "status": 504, "detail": "one of three RPCs timed out, retried", "at": "..." } ],
  "payment": { "state": "settled", "transaction": "0x...", "network": "eip155:56" },
  "retryAfterSeconds": 10 }
```

Contract, each clause traceable to a source:

- **`Prefer: respond-async` is standardised**, RFC 7240 section 4.1, with an optional `wait=<seconds>` so a
  client can ask for a synchronous answer up to a bound and fall back to 202. The server SHOULD echo
  `Preference-Applied` when it is not obvious from the response which preference was honoured. This is the
  cleanest way to offer one endpoint that answers 200 for a fast job and 202 for a slow one.
- **State machine.** Reuse A2A's, because a listed agent may already speak it and it is the only
  agent-specific one with published semantics: `SUBMITTED`, `WORKING`, `INPUT_REQUIRED`, `AUTH_REQUIRED`, then
  terminal `COMPLETED`, `FAILED`, `CANCELED`, `REJECTED`. Terminal means cancel returns
  `TaskNotCancelableError`.
- **Job id opacity and lifetime.** MCP's stateful-tools guidance: opaque, UUIDv4-grade entropy when the
  endpoint is unauthenticated because the id is then a bearer token, authorisation checked against the id on
  every call, retention policy published. AIP-151's number for expiry: 30 days is a good rule of thumb.
- **Idempotency.** `Idempotency-Key` as an RFC 8941 item structured header, value a UUID or similar random
  identifier. Server behaviour exactly as the draft specifies: first sighting processes normally; a repeat
  after completion returns the stored result of the original, success or error; a repeat while the original is
  still running returns **409** with `application/problem+json` titled "A request is outstanding for this
  Idempotency-Key"; the same key with a different payload returns **422**; a missing key where one is required
  returns **400**. A fingerprint over the request body MAY be used alongside the key, which is how the 422 case
  is detected. Note the conflict flagged above: x402's `payment-identifier` extension uses 409 for the
  different-payload case. Follow the draft on this surface.
- **Polling cadence.** `Retry-After` on the 202 and on every non-terminal poll, and a client that honours it.
  Poll intervals back off, and the agent publishes a minimum interval so we can rate-limit fairly rather than
  guess.
- **Partial results.** Artifact chunks with an append flag and a last-chunk flag, which is A2A's
  `TaskArtifactUpdateEvent` model expressed as state rather than events. A poller that arrives late must still
  read everything produced so far, so partials live on the job resource, not only on a stream.
- **Non-terminal errors.** AIP-151 puts these in the operation metadata and requires structured status
  objects. Same here: a `nonTerminalErrors` array of problem details, so a degraded-but-running job is visible
  rather than silently late.
- **Cancellation.** `POST /v1/jobs/{id}/cancel`, idempotent, 202 on accept, 409 on a terminal job, and a
  documented answer to what happens to work already paid for.
- **Payment sub-state on the job**, for the reason in the composition section: settlement is not always
  immediate and a job must not be gated on a boolean.

### Pattern C: webhook callback

The right pattern when the marketplace wants to update a buyer's dashboard without polling every agent, and
the wrong pattern to make mandatory, because it needs the receiver reachable and it inverts the trust
direction.

```http
POST https://marketplace.example/hooks/agent/{listingId}
Content-Type: application/json
Authorization: Bearer <single-purpose token issued at subscribe time>
webhook-id: msg_01J8Z3
webhook-timestamp: 1788571904
webhook-signature: v1,<base64 HMAC-SHA256(secret, "msg_01J8Z3.1788571904.{raw body}")>

{ "type": "job.completed", "timestamp": "2026-09-05T03:11:02Z",
  "data": { "jobId": "job_01J8Z2QK", "state": "COMPLETED", "listingId": "..." } }
```

Contract:

- **Delivery is at-least-once and must be stated as such.** A2A: agents MUST attempt delivery at least once,
  MAY retry with exponential backoff, SHOULD time out in 10 to 30 seconds, MAY stop after N consecutive
  failures. Therefore the receiver MUST be idempotent, and the way to be idempotent is a delivery id plus a
  store of seen ids, which is exactly what Standard Webhooks says: "Use the `webhook-id` header as an
  idempotency key".
- **Header names are lowercase and `webhook-` prefixed.** Standard Webhooks says "follow the exact naming".
  HTTP header names are case-insensitive on the wire, so this is about the documented form, not about
  correctness.
- **Signed content is `msg_id.timestamp.payload`** over the **raw** body bytes, never a re-serialised object.
  Verify in constant time. Reject a timestamp outside a tolerance window so a captured delivery cannot be
  replayed.
- **Support both signature schemes.** `v1,` HMAC-SHA256 with a `whsec_` secret is the pragmatic default,
  `v1a,` ed25519 with `whpk_` is stronger because the consumer never holds a signing secret, and the header is
  a space-delimited list so both can travel during a rotation. Standard Webhooks says prefer asymmetric and
  says keys must be unique per endpoint.
- **Authentication travels in the config, not in the URL.** A2A's `TaskPushNotificationConfig` carries `url`,
  `token` and an `AuthenticationInfo {scheme, credentials}`. Single-purpose token per subscription, rotated,
  treated as a secret. A capability URL alone leaks through logs and referrers.
- **RFC 9421 is the upgrade path** and it is now standardised inside x402 too, via the
  `http-message-signatures` extension with keys at `/.well-known/http-message-signatures-directory`. Naming it
  as the roadmap is honest; shipping HMAC first is correct.
- **Retry schedule, published.** Standard Webhooks' schedule is immediate, 5 s, 5 min, 30 min, 2 h, 5 h, 10 h,
  14 h, 20 h, spanning 51 hours, with jitter. Publish ours so an operator can tell a slow retry from a dropped
  one.
- **Delivery observability.** Expose per-delivery `{id, event, status, responseCode, attempt, createdAt,
  deliveredAt}` with statuses success, failed, pending. Without it, "the webhook did not arrive" is
  unarguable.
- **The registration endpoint is an SSRF sink.** We accept a URL from an operator and then fetch it
  repeatedly. Every rule in the SSRF section applies to webhook targets, and A2A says so explicitly.

### Pattern D: server-sent events

The right pattern for a live view while a buyer watches, and never the system of record.

```http
POST /v1/jobs/job_01J8Z2QK/subscribe
Accept: text/event-stream

200 OK
Content-Type: text/event-stream
Cache-Control: no-store
X-Accel-Buffering: no

retry: 3000

id: 1
data: {"task":{"id":"job_01J8Z2QK","status":{"state":"TASK_STATE_WORKING"}}}

:keep-alive

id: 2
data: {"artifactUpdate":{"taskId":"job_01J8Z2QK","artifact":{},"append":true,"lastChunk":false}}

id: 3
data: {"statusUpdate":{"taskId":"job_01J8Z2QK","status":{"state":"TASK_STATE_COMPLETED"}}}
```

Contract, from the WHATWG spec plus A2A plus MCP:

- `Content-Type` must be exactly `text/event-stream` and the status must be 200. Anything else and the client
  fails the connection permanently rather than retrying.
- Only four field names exist: `event`, `data`, `id`, `retry`. Everything else is ignored. Names are compared
  literally with no case folding.
- `retry:` sets the reconnection delay in milliseconds. The default is implementation-defined, "probably in the
  region of a few seconds", so set it explicitly.
- `Last-Event-ID` is sent by the client only when re-establishing, carrying the last `id` seen. **MCP
  2026-07-28 does not support resumable streams via `Last-Event-ID`**, so on an MCP transport a dropped stream
  means starting again, which is precisely why the job resource has to be pollable.
- A line beginning with `:` is a comment. Send one about every 15 seconds as keep-alive, which is both the
  WHATWG authoring advice and MCP's. Set `X-Accel-Buffering: no` so a proxy does not hold the stream.
- `204 No Content` is the documented way to tell a client to stop reconnecting for good.
- Events MUST NOT be reordered. Multiple concurrent streams per job are allowed and all see the same events in
  the same order.
- A stream is not delivery. A2A states messages are not a reliable mechanism for critical information, and a
  reconnecting client may miss status messages. Anything that matters must also be readable from the job
  resource.

### Choosing between the four, per skill rather than per agent

| Work shape | Pattern | Why |
| --- | --- | --- |
| a quote, a health-factor read, a pool state snapshot | A | under 10 s, one response, nothing to cancel |
| a backtest, a rebalance plan, a grid sizing run | B | minutes, needs progress and cancellation |
| a grid running for days, a monitor with no end | B plus C | the job outlives every connection, so polling is the contract and the webhook is the convenience |
| a buyer watching a run in a browser tab | B plus D | the stream is the view, the job is the truth |

An agent declares `expectedDurationSeconds` per skill in the manifest below, so the marketplace picks the
pattern from the declaration and then checks the declaration against measured latency.

## How a paid call and a long job compose

x402 settles one payment against one bounded resource execution. A grid trading job runs for days. Those two
facts do not fit together by default, and the mismatch is precise enough to state in numbers.

**The constraint.** `maxTimeoutSeconds` is a REQUIRED field on every `PaymentRequirements` entry and it means
"maximum time allowed for payment completion". Every example in the spec sets it to 60; the live BSC-accepting
resource I decoded sets 300. On EVM `exact` the buyer signs an EIP-3009 authorisation carrying `validAfter` and
`validBefore`, and the spec's own example window is 65 seconds (`1740672089` to `1740672154`). An expired
authorisation is a facilitator error, `invalid_exact_evm_payload_authorization_valid_before`. So the signed
payment is a minutes-scale object either way. It cannot be held for three days and settled at the end.

**The three flows and which one a long job can use** (x402 v2 section 6.1):

| Flow | Ordering | Fits a long job? |
| --- | --- | --- |
| `authorization` (default) | verify, resource, settle, respond | **No.** Settlement happens after the resource completes, so a three-day resource means settling a three-day-old authorisation, which is expired. |
| `upfront` | settle, resource, respond | **Yes.** Money is durably committed before the work starts, so the payment exchange finishes in seconds while the work runs for days. |
| `escrow` | settle, resource, settle, respond | **Yes, and the better fit for metered work.** First settle commits a deposit or ceiling, second settle records the final charge. |

The protocol's invariant is that at least one check runs before the resource executes, so the resource never
runs with nothing checked. Clients are told to prefer `authorization` when both are offered, which is exactly
backwards for our case, so a long-job resource must **not** offer `authorization` at all. It must publish
`extra.paymentFlow` explicitly, because the spec requires that field whenever the resolved flow is not
`authorization`.

**The composition that works, as a sequence.** Split the priced resource from the job.

1. `POST /v1/jobs` is the priced resource and it is bounded: validate inputs, reserve capacity, return a job
   id. Seconds, not days.
2. That endpoint answers 402 with `PAYMENT-REQUIRED` naming `extra.paymentFlow: "upfront"` (or `escrow`) and a
   `maxTimeoutSeconds` that reflects only the create call.
3. The client retries with `PAYMENT-SIGNATURE`. The server settles first, then creates the job, then answers
   202 with `PAYMENT-RESPONSE` and the job resource.
4. Polling the job is free and unmetered, rate-limited rather than priced. Charging per poll would make the
   meter a function of the buyer's client rather than of the work.
5. Anything genuinely incremental (another day of grid operation, another rebalance, an extra backtest) is a
   **new** priced call against the same job id, so each 402 exchange still covers one bounded execution. With
   `escrow` those become the second settle against the committed ceiling instead.

**The ordering rule that stops double charging.** Check idempotency before touching payment. A client whose
create request times out will retry, and it will retry with a fresh EIP-3009 nonce because the old
authorisation may have expired. The 32-byte nonce makes replaying the *same* payload harmless, but it does
nothing about a second, different, valid payment for the same job. So:

```
receive POST /v1/jobs with Idempotency-Key K and PAYMENT-SIGNATURE P
  if K seen and job complete    -> return stored 202/200 for K, do NOT settle P   (draft: return the original)
  if K seen and job in flight   -> 409 problem+json,             do NOT settle P  (draft: outstanding request)
  if K seen with different body -> 422 problem+json,             do NOT settle P  (draft: key reused)
  if K unseen                   -> reserve K, then verify/settle P, then create the job
```

That is the draft's own enforcement table, reordered so the payment step sits inside the reservation. Get it
the other way round and every client timeout costs the buyer twice. If an agent implements x402's
`payment-identifier` extension instead, it gets deduplication one layer down as well, at either the resource
server or the facilitator, and its different-payload answer will be 409 rather than 422. Accept both codes
inbound, emit the draft's codes outbound.

**Settlement is not always immediate, so a job must not be gated on a boolean.** x402 defines
`settlement_pending` as a **non-terminal** error reason: the transaction was broadcast but confirmation could
not be established, and a `SettleResponse` carrying it MUST include the broadcast `transaction` hash plus
`network` so the caller can reconcile on chain. A marketplace that treats a non-success settle as a refusal
will drop work that was in fact paid for. The job resource therefore carries its own payment sub-state,
`pending` / `settled` / `failed`, with the tx hash and the network recorded from the first moment.

**Receipt binding, because a buyer must be able to prove what they bought.** Record on the job at creation: the
settlement transaction hash, the network as CAIP-2, the payer address, the resolved `scheme` /
`assetTransferMethod` / `paymentFlow`, the amount in atomic units with the asset address and its decimals, and
the hash of the request body the payment authorised. Without the last item, a settled payment proves money
moved, not what it bought.

**And now there is a standard for exactly this.** x402's `offer-receipt` extension gives a server-signed offer
in the challenge and a server-signed receipt on success, both as EIP-712 or JWS, whose stated purposes are
dispute evidence, "user-review attestations" and reputation systems. For our marketplace the composition is
direct:

- Require a **signed offer** in the challenge for any listing above a price threshold. Its `validUntil` bounds
  how long the terms stand, and its `resourceUrl` plus `amount` plus `payTo` plus `network` are the terms a
  buyer can later prove were quoted. Match it to the `accepts[]` entry by field comparison, never by
  `acceptIndex`.
- Store the **receipt** on the job. Its `payer`, `resourceUrl`, `issuedAt` and optional `transaction` are the
  proof of delivery, and its signature makes it a bearer artifact that survives outside our database.
- That receipt is what makes an ERC-8004 reputation feedback meaningful rather than assertable: the feedback
  can cite an artifact signed by the agent's own key attesting that this payer paid for this resource at this
  time. R11 covers the feedback surface; this is the piece that gates it.

**The on-chain alternative already live on BSC.** ERC-8183 gives a job state machine with escrowed budget in an
ERC-20: `OPEN`, `FUNDED`, `SUBMITTED`, `COMPLETED`, `REJECTED`, `EXPIRED` (R02 has the deployed kernel's guards
and error selectors). For a days-long job that is a stronger fit than any HTTP-only scheme, because the escrow,
the deliverable and the settlement are all on chain and a judge can read them with one `getJob` call. The clean
division of labour: ERC-8183 for the priced, long, disputable unit of work, x402 or B402 for the small metered
reads around it. Nothing forces a choice between the two rails, and offering both is a stronger answer than
picking one.

<!--NEXT-->
















