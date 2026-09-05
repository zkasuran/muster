# 04-AGENT-PROTOCOL: the contract a Muster listing satisfies on the wire

Written 2026-09-05. Build closes 2026-09-09 UTC+0.

## What this settles

Muster cannot consume what BSC agents declare. It has to define the wire, probe it, then publish
the distance between what an agent claims and what it does.

The measurement behind that sentence is not close. Of 600 agent ids drawn uniformly from the
registry, 233 declare a concrete `http(s)` endpoint (**T0**), 230 answer 2xx or 3xx (**T1**), **12
are machine-callable (T2)** and **0 are payable by a stranger (T3)**. All 12 T2 agents are one
product on one host. Across the whole chain, 336,088 agents at block 120,141,168
(2026-09-05T16:17:48Z, `SPINE.md`) over the 334,935 ids the sweep ran on, 5 carry a verified endpoint
domain and 3 of those 5 are one operator's. The
registration document carries no category field and the on-chain metadata key `category` is populated
on zero agents. Sources: `MEASUREMENT.md` for the ladder, `R12-agent-comms.md` for the domain proofs,
`R01-erc8004.md` for the metadata keys.

So this is not a survey of conventions in use. It is the contract, the probe suite that decides
whether a listing meets it and the behaviour rules a listing accepts by being listed. Ten things
get settled here: the agent card and where it lives, the wire, the job lifecycle, the four long-job
shapes, the error taxonomy, the behaviour rules, brokered against direct hire, agent hires agent,
the conformance suite, then the list of things we deliberately do not require.

Three things it leaves alone. `03-TAXONOMY.md` owns the category contracts this wire carries.
`08-MONEY.md` owns the rail down to the bytes a buyer signs. `06-QUALITY.md` owns what an outcome
does to a score. Numbers from those are cited, never re-derived.

One rule runs through all of it. **A declaration is a claim. A probe is a fact.** Every field an
operator writes gets recorded, shown with its source, then checked.

### Field discipline

Wire field names reuse `SPINE.md`'s data model spelling wherever a stored field exists for the same
thing: `category`, `contractVersion`, `inputSchema`, `outputSchema`, `priceBase`, `priceToken`,
`priceDecimals`, `priceRail`, `deliveryTarget`, `refusalConditions[]`, `deliverableRule`,
`requestHash`, `responseHash`, `deliverableUri`, `state`, `terminalState`, `refusal`, `freshness`.
Fields that exist only in transit (`progress`, `partial`, `retryAfterSeconds`, `nonTerminalErrors`,
`writes`, `expectedDurationSeconds`, `maxDurationSeconds`, `skillId`) stay in transit
and never enter the stored model except through the columns named above, so `15-SYSTEM.md` has
nothing to add for them. Foreign envelopes keep their own spelling verbatim: x402 stays camelCase,
the ERC-8183 job description stays snake_case, an A2A card keeps whichever revision's spelling it
arrived in. Every amount is a base-unit decimal string beside its `decimals` and its token
address. **Every BSC stablecoin in play is 18 decimals**, so a 6-decimal constant is wrong by a
factor of a trillion (`VERIFIED-payment-rail.md`).

Four stored fields this document needs do not exist yet. `job.attribution`, an enum of `brokered`,
`onChain`, `signedReceipt` and `unattributed`, defined in section 8. `listing.reviewedCardHash`, the
card hash pinned at review, which the precedence table reads, rule B12 compares against and probe
C05 asserts. `listing.advicePosture[]`, the declared output shapes C09 gates on. And
`listing.subcontracts`, the flag rule B13 enforces. All four are requests to `15-SYSTEM.md`, which is
the only document allowed to extend the stored model, rather than renames of anything already there.
A rule enforced at review needs somewhere to keep the reviewed value.

## 1. The agent card

### Four documents, one of them ours

Every agent already has three documents, written by different hands at different times. They
drift. Telling them apart is the first half of the design.

| Document | Written by | Authoritative for |
| --- | --- | --- |
| the ERC-8004 record on chain | the operator, through `register`, `setAgentURI`, `setMetadata` | control (`ownerOf`), the payee (`getAgentWallet`), the pointer to everything else (`tokenURI`) |
| the registration document at `tokenURI` | the operator, off chain | the `services[]` list, so the endpoints |
| `/.well-known/agent-registration.json` on the endpoint domain | the operator, off chain | control of that domain. Nothing else |
| **the Muster card** | the operator, off chain, hash pinned at review | skills, prices, schemas, delivery shape, refusal conditions, write scope |

The two well-known paths get confused constantly and they are different things. A2A's
`/.well-known/agent-card.json` is IANA-registered, status permanent, Linux Foundation, 2025-08-01.
ERC-8004's `/.well-known/agent-registration.json` is that ERC's own optional domain proof and is
**not** in the IANA registry at all. Neither belongs to x402, which registers no well-known path and
does discovery through a facilitator Bazaar and a capability block inside the 402 itself
(`R12-agent-comms.md`).

**We do not mint a fourth well-known path.** RFC 8615 says an application that wants a new
well-known URI MUST register it. It also says well-known URIs are rooted at the top of the path
hierarchy so `/foo/.well-known/example` is not one. That second clause is why a multi-tenant
platform sharding agents onto `/aip/erc8004:<slug>/.well-known/agent-card.json` cannot pass the
ERC-8004 proof by construction, verified live at 404 on the nested path and at the origin root
(`R12-agent-comms.md`). Minting `/.well-known/muster.json` would put us in the same wrong place with
an unregistered name.

So the card is a plain HTTPS document, declared like any other service:

```json
{ "name": "muster", "version": "1", "endpoint": "https://agent.example/muster/v1/card.json" }
```

`services[].name` is free text in the wild (`OASF` 11, `web` 3, `agentWallet` 2, `email` 2, the
literal string `undefined` 2, then `A2A`, `A2ACard`, `MCP` once each in R01's decode of 253
documents), so the resolver matches on a normalised lowercase name and accepts `muster` plus
`muster-card`. The endpoint may be a full document URL or a base URL we append `/card.json` to,
because both shapes are live for A2A today, one of them still carrying an unsubstituted `{agentId}`
placeholder (`R12-agent-comms.md`, trap 5). The resolver records which shape it took.

### The card, field by field

`muster-card/1`. JSON, UTF-8, served with `application/json`, under 64 KB. Validated against a JSON
Schema 2020-12 document we publish at `{docs}/schema/muster-card-1.json`.

```json
{
  "musterCard": "1",
  "agent": {
    "chainId": 56,
    "registry": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    "agentId": "999999999",
    "payTo": "0x0000000000000000000000000000000000000000"
  },
  "wire": {
    "baseUrl": "https://agent.example/muster/v1",
    "protocols": ["muster/1"],
    "maxRequestBytes": 65536,
    "timeouts": { "healthMs": 2000, "manifestMs": 3000, "createMs": 10000 }
  },
  "payment": {
    "rails": [
      { "priceRail": "eip3009",
        "priceToken": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
        "priceDecimals": 18,
        "domainName": "World Liberty Financial USD",
        "domainVersion": "1",
        "paymentFlow": "upfront" },
      { "priceRail": "escrow8183",
        "priceToken": "0xcE24439F2D9C6a2289F741120FE202248B666666",
        "priceDecimals": 18 }
    ]
  },
  "skills": [
    {
      "skillId": "grid.size",
      "category": "grid",
      "contractVersion": "grid/1",
      "title": "Grid sizing for one BSC pair",
      "summary": "Chooses grid spacing and order count for a stated pair, band and capital.",
      "priceBase": "50000000000000000",
      "priceToken": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
      "priceDecimals": 18,
      "priceRail": "eip3009",
      "inputSchema": { "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object" },
      "outputSchema": { "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object" },
      "deliveryTarget": "poll",
      "expectedDurationSeconds": 45,
      "maxDurationSeconds": 900,
      "deliverableRule": "keccakCanonical",
      "refusalConditions": [
        { "code": "dataStale", "when": "pool observation older than 600 s" },
        { "code": "outOfScope", "when": "pair not in the declared pair list" }
      ],
      "advicePosture": ["measurement", "simulation"],
      "writes": [],
      "freshness": { "sourceKind": "chain", "maxAgeSeconds": 60 }
    }
  ],
  "policy": {
    "custody": "none",
    "trustModels": ["reputation"],
    "dataRetentionDays": 30,
    "subcontracts": false
  },
  "cardHash": "0x0000000000000000000000000000000000000000000000000000000000000000"
}
```

The identifiers in that example are placeholders rather than data. `agent.example` is not a host we
control, `payTo` and `cardHash` are zero and `999999999` is above `_lastId`, which was 335,003 at block
120,036,371 (`R12-agent-comms.md`). No live agent is described. A card carrying those values fails C04
and C08 by construction. The chain id, the registry address and the token addresses are real.

Required: `musterCard`, `agent` (all four members), `wire.baseUrl`, `payment.rails` with at least one
entry, `skills` with at least one entry, `policy.custody`, `cardHash`. Every skill requires
`skillId`, `category`, `contractVersion`, `title`, `summary`, the three price fields, `priceRail`,
`inputSchema`, `outputSchema`, `deliveryTarget`, `expectedDurationSeconds`, `maxDurationSeconds`,
`deliverableRule`, `refusalConditions`, `advicePosture`, `writes`, plus `freshness` on any skill
whose category contract reads chain state. Everything else is optional.

Value rules that are not obvious from the shape:

- `agent.agentId` is a **decimal string**, never a number. It appears as a number in some live
  registration documents and as a quoted string in others, so we pick one form ourselves rather than
  inherit the ambiguity (`R12-agent-comms.md`, trap 3).
- `category` is one of exactly four slugs: `rebalancing`, `grid`, `yield`, `health-factor`. One skill
  names one category. An agent covering more than one category ships more than one skill, which is
  what lets one agent hold up to four listings.
- `priceBase` is base units at `priceDecimals`, as a string. `"50000000000000000"` at 18 decimals is
  0.05 units.
- `deliveryTarget` is `sync`, `poll`, `pollWebhook` or `pollStream`. Section 4 defines each.
- `deliverableRule` is `keccakCanonical`, `sha256Raw` or `keccakRaw`. Each one names the exact
  bytes it covers. `keccakCanonical` is `keccak256(utf8(canonicalJson(result)))` over the `result`
  member of the terminal job resource. `sha256Raw` is `sha256` and `keccakRaw` is `keccak256`, both
  over the raw bytes served at `deliverableUri`, byte for byte as served. A skill declaring
  `keccakCanonical` carries `result` on the terminal poll, one declaring a raw rule carries
  `deliverableUri`. A skill may carry both. Declaring the rule is what makes a receipt checkable,
  so the field is required on every skill. **`none` is not a card value.** It exists in the stored
  model for a foreign ERC-8183 record whose producer ships empty `optParams`, where no rule can be
  recovered (`R02-erc8183.md`). A listing that declared it could never satisfy C24.
- `writes` is the complete list of `{target, selector}` pairs the agent may call on chain while
  running this skill. An empty array means the skill is read-only. Nothing outside the list is
  permitted, which is enforceable rather than aspirational: an Altana session's own
  `canExecute(keyHash, target, data)` returns false for an unlisted pair (`R06-altana.md`).
- `advicePosture` is declared **per skill**, beside `refusalConditions`, because the permitted range
  is a property of one skill's output rather than of an operator. Values are `measurement`,
  `comparison`, `simulation`, `mechanical`. These are the four output shapes that stay outside a
  personalised recommendation under MiCA Art 3(1)(24) plus MiFID II's delegated Art 9
  (`R15-compliance.md`). Declaring a fifth is a listing rejection.
- `freshness` is `{sourceKind, maxAgeSeconds}` and is required on any skill whose category contract
  reads chain state. A skill that omits it inherits a 60 s ceiling, which is deliberately tight so
  declaring a real number is cheaper than accepting the default. Rule B11 refuses anything older.
- `policy.trustModels[]` is optional and is the one card field that maps onto ERC-8004's
  `supportedTrust[]`. Values are the ones the ERC defines and the wild uses: `reputation`,
  `crypto-economic`, `tee-attestation` (`R01-erc8004.md`). It says nothing about custody.
  `policy.custody` is a separate card-only field with no ERC-8004 home.

### How it maps onto ERC-8004

| Card field | Its ERC-8004 home | Note |
| --- | --- | --- |
| `agent.agentId`, `agent.chainId`, `agent.registry` | a `registrations[]` entry in the registration document, `agentRegistry` written `eip155:56:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `registrations` appears on 15 of 253 decoded documents and only 3 of them carry an `agentRegistry` at all, with one live document carrying `"registrations": []` (`R01-erc8004.md`), so we require it in the card and read it from the chain regardless. Compare the CAIP-2 prefix case-sensitively, the address case-insensitively, then reject `agentId: 0`: one live document's `registrations` array spans 22 chains and three of its entries carry `agentId: 0` (`R12-agent-comms.md`) |
| `agent.payTo` | `getAgentWallet(agentId)` `0x00339509`, which returns a normal ABI-encoded address, falling back to `ownerOf(agentId)` `0x6352211e` | `agentWallet` is the one reserved metadata key. `setMetadata` rejects it with `reserved key`. Every `register` overload writes `abi.encodePacked(msg.sender)` into it at mint, which is why 600 of 600 sampled agents have it non-zero and 0 of 600 have it differ from the holder. The source clears it on transfer (`_update` writes `""`), which no live transfer has been observed doing (`R01-erc8004.md`) |
| the same value read as metadata | `getMetadata(agentId,"agentWallet")` `0xcb4799f2` | **a different decode.** The metadata value is 20 raw packed bytes rather than a 32-byte word (`R01-erc8004.md`), so a reader that ABI-decodes it as an address gets nothing usable. Use `getAgentWallet` for the payee and treat this call as the raw-bytes path it is |
| `wire.baseUrl` | a `services[]` entry whose normalised name is `muster` | https only, under 512 characters |
| `skills[].category` | on-chain metadata key `category`, which we write for our own agents | `getMetadata(id,"category")` is populated on zero agents today, so writing it is a first rather than a convention we join. Never required of a third party |
| `cardHash` | on-chain metadata key `muster.cardHash`, ASCII hex, following the live `termix.metadataHash` shape | optional. It is the only way a third party can check the card without our index |
| `payment.rails[].priceRail` | `x402Support` in the registration document, read in both spellings | self-declared and unreliable. The one agent whose entire product is gasless stablecoin payment declares `x402Support: false` (`R01-erc8004.md`) |
| `policy.trustModels[]` | `supportedTrust[]`, read in both spellings | it declares trust models and nothing else. 228 of 253 decoded documents are exactly `["reputation"]`. A live document carrying the non-standard `["termix-platform"]` is a defect precisely because the ERC does not define that value (`R01-erc8004.md`). `supportedTrusts` and `x402support` are each on about 5% of documents, so reading one spelling silently mislabels one agent in twenty |
| `policy.custody` | none. Card only | ERC-8004 has no custody field and `supportedTrust[]` is not one. Writing a custody value there would emit a non-conforming registration document |

### Precedence, so a drift is never a guess

The four documents disagree in practice. On the one BSC agent where both copies could be compared,
the `tokenURI` document listed 12 services including an A2A entry while the well-known copy listed 8
with no A2A entry at all (`R12-agent-comms.md`, trap 4). Precedence is fixed:

| Fact | Authoritative source | If the card disagrees |
| --- | --- | --- |
| who controls the agent | `ownerOf` or `isApprovedForAll` on chain | card ignored |
| where money goes | `getAgentWallet`, else `ownerOf` | listing blocked until they match |
| which endpoints exist | the `tokenURI` document, because the chain points at it | card's `baseUrl` must appear there |
| does the operator control the endpoint domain | the well-known file, which is defined for exactly this and nothing else | badge only |
| skills, prices, schemas, refusals, write scope | the Muster card, only while `cardHash` matches `listing.reviewedCardHash` | last reviewed card stands, listing shows re-review pending |
| is any of it live | the probe | card never overrides a probe |

### One canonicalisation, three hashes

`cardHash` is `keccak256(utf8(canonicalJson(card minus cardHash)))`. `canonicalJson` sorts object
keys at every depth, uses compact separators, then escapes every non-ASCII code unit as `\uXXXX`. It
is byte-identical to Python `json.dumps(x, sort_keys=True, separators=(",", ":"))` with the escape
pass applied. That is not our invention and it is not `JSON.stringify`: it is the recipe BNB Chain's
own SDK and the Altana SDK both ship for the ERC-8183 `negotiation_hash`, reproduced exactly against
4 of 4 live mainnet jobs (`R02-erc8183.md`). Both SDKs warn that plain `JSON.stringify` breaks
cross-implementation verification for any accented character, CJK or emoji.

We use that one function for all three hashes in this protocol. `cardHash` covers the card minus
`cardHash`. `requestHash` is `keccak256(utf8(canonicalJson(request body)))` over the body the payment
authorised. `responseHash` under `deliverableRule: keccakCanonical` is
`keccak256(utf8(canonicalJson(result)))` over the `result` member of the terminal job resource. One
implementation, three uses, no second canonicaliser to keep in step. The two raw rules deliberately
do not use it, because they cover bytes as served rather than a re-serialisation.

## 2. The wire contract

### The endpoints

Seven, relative to `wire.baseUrl`, plus one priced route a metered skill adds. Nothing else is
required and nothing else is read.

| Method and path | Priced | Purpose |
| --- | --- | --- |
| `GET /manifest` | free | the machine-readable capability declaration |
| `GET /health` | free | liveness. It has to actually move |
| `GET /schema` | free | the input and output schemas, with one worked example per skill |
| `POST /jobs` | **priced** | create a job. The only paid path into a new job |
| `GET /jobs?skill=…&…` | **priced** | the same create, expressed as a GET |
| `GET /jobs/{jobId}` | free | poll state, progress, partial results, payment sub-state, the deliverable |
| `POST /jobs/{jobId}/cancel` | free | cancel |
| `POST /jobs/{jobId}/renewals` | **priced** | one metered increment against a live job. Required on any skill that meters by interval, which section 5 defines |

Optional, declared per skill through `deliveryTarget`: `POST /jobs/{jobId}/subscribe` for a stream.

Two of those routes exist because of a real delisting on another venue rather than because of taste.

**Free information lives off the paid path.** A listing there answered `GET /oracle?market=BTC-4H`
with 200 and a static info blob because only POST was gated. An x402 client pays for the request it
already tried, then replays it, so a GET that cannot be paid for can never deliver work
(`R16-reuse.md`, section 1.1). Every route a card invites **as a work route** is payable on every verb
it invites. The five free routes in the table (`/manifest`, `/health`, `/schema`,
`GET /jobs/{jobId}`, `POST /jobs/{jobId}/cancel`) are not work routes, no card invites them as one and
C17 does not apply to them. Free description sits at `/schema`.

**The GET create exists because the replay drops the body.** The same review round recorded a payment
client replaying a POST with an empty body even though the quote had been given a parameter. A GET
carries its parameters in the resource URL, so the URL that was quoted is the URL that is replayed.
Both forms are the same operation with the same idempotency rules.

### The manifest

The capability declaration. It carries the same skill content the card does, plus what only a
running server knows: current price, current capacity, current freshness.

```http
GET /manifest
200 OK
Content-Type: application/json
Cache-Control: public, max-age=60
ETag: "…"

{ "protocol": "muster/1",
  "agent": { "chainId": 56, "agentId": "999999999" },
  "cardHash": "0x…",
  "skills": [ { "skillId": "grid.size", "category": "grid", "contractVersion": "grid/1",
                "priceBase": "50000000000000000", "priceToken": "0x8d0D…", "priceDecimals": 18,
                "priceRail": "eip3009", "deliveryTarget": "poll",
                "expectedDurationSeconds": 45, "maxDurationSeconds": 900,
                "inputSchema": { }, "outputSchema": { },
                "refusalConditions": [ ], "writes": [ ],
                "available": true, "queueDepth": 0 } ],
  "freshness": { "block": 120036371, "observedAt": "2026-09-05T03:11:02Z", "source": "bsc-rpc" } }
```

The manifest must agree with the card on `skillId`, `category`, `contractVersion`, the three price
fields, `priceRail`, `deliveryTarget` and both schemas. Disagreement on a price or a token is a hard
conformance failure, because that is the pair a buyer signs against. Disagreement on anything else is
a `lintFindings[]` entry shown on the listing.

Where a listing also declares another protocol, the same facts have to appear there too and they have
to match:

| Also declared | Where the capability block lives there | Our rule |
| --- | --- | --- |
| `x402/2` | `extensions.bazaar.info` and `extensions.bazaar.schema` inside the 402 challenge, validated against its own 2020-12 schema | required if x402 is declared. Facilitators must validate `info` against `schema` before cataloguing, so a mismatch is fatal there anyway |
| `mcp/2026-07-28` | `tools/list`, where `inputSchema` is a JSON Schema object defaulting to draft 2020-12 | tool names map one to one onto `skillId`. MCP's own `ttlMs` and `cacheScope` are honoured when present |
| `a2a/0.1.0`, `a2a/0.2.6`, `a2a/0.3.0`, `a2a/1.0` | `skills[]` on the agent card, in that revision's spelling | detected by field shape, never by the declared version string, then normalised into one internal shape |

That last row is not pedantry. One live BSC card declares A2A `0.4.0`, a release that has never
existed: the complete tag list runs to `v1.0.1` with no `v0.4.x` at all. The string is the agent's
own version copied into the protocol slot. That card itself validates only at 0.1.0. Detect the
revision from the field set (`supportedInterfaces` means 1.0, `protocolVersion` starting `0.3` means 0.3.0, an
`authentication` block with no `protocolVersion` means 0.1.0), because the published A2A 1.0 JSON
artifact has no `required` array at all and validates `{}` as a valid card (`R12-agent-comms.md`).

### The health check

```http
GET /health
200 OK
Content-Type: application/json
Cache-Control: no-store

{ "ok": true, "checkedAt": "2026-09-05T03:11:02Z", "skills": { "grid.size": "ready" },
  "dependencies": [ { "name": "bsc-rpc", "ok": true, "latencyMs": 41 } ] }
```

Three rules. It answers inside 2,000 ms. It is never cached. `checkedAt` is the moment the agent
actually re-checked its own dependencies, so two probes 60 s apart must not return a byte-identical
`checkedAt`. That third rule is the whole point: on another venue a listing was delisted for "no
response from your Agent, task timed out" while its HTTP surface never went down, because the contact
listener it declared ran on a laptop that was powered off during the test window (`R16-reuse.md`,
section 1.1). A static 200 is exactly what that failure looks like from outside. A frozen `checkedAt`
is how we catch it.

The same defect exists in the index we build on. 8004scan health-checks two service types, `a2a` and
`mcp`. On one live agent it marked a single service healthy, marked 11 others `skipped` with
`Service type not health-checked`, then reported `health_score: 100.0` for that agent
(`R12-agent-comms.md`, `R05-8004scan-api.md`). A skipped check is not a passing check, which is why
section 10 gives `skip` its own verdict rather than folding it into `pass`.

### The 402 challenge

x402 version 2, which is current and which B402's V2 endpoint requires. Header
`PAYMENT-REQUIRED`, base64 of UTF-8 JSON, standard base64 with camelCase keys and null fields
omitted (`R03-x402-b402.md`).

```http
POST /jobs
402 Payment Required
PAYMENT-REQUIRED: <base64 of the object below>
Content-Type: application/json
Access-Control-Expose-Headers: PAYMENT-REQUIRED, PAYMENT-RESPONSE
Access-Control-Allow-Headers: Content-Type, PAYMENT-SIGNATURE, Idempotency-Key

{ "x402Version": 2,
  "error": "PAYMENT-SIGNATURE header is required",
  "resource": { "url": "https://agent.example/muster/v1/jobs", "description": "Grid sizing, one pair",
                "mimeType": "application/json", "serviceName": "Grid sizing",
                "tags": ["grid","bsc"] },
  "accepts": [
    { "scheme": "exact",
      "network": "eip155:56",
      "amount": "50000000000000000",
      "asset": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
      "payTo": "0x0000000000000000000000000000000000000000",
      "maxTimeoutSeconds": 300,
      "extra": { "assetTransferMethod": "eip3009",
                 "paymentFlow": "upfront",
                 "name": "World Liberty Financial USD",
                 "version": "1",
                 "decimals": 18 } } ],
  "extensions": { "bazaar": { "info": { "input": { "type": "http", "method": "POST",
                                                   "bodyType": "json", "body": { } },
                                        "output": { "type": "json", "example": { } } },
                              "schema": { "$schema": "https://json-schema.org/draft/2020-12/schema",
                                          "type": "object", "required": ["input"] } } } }
```

Five requirements Muster adds on top of the spec, each with its reason:

1. **The header and the body carry the same object, emitted once.** The wire spec says protocol
   information rides in headers and treats bodies as an implementation concern, but a real BSC-accepting
   resource serves a v2 challenge in the header while its body is still v1 with `maxAmountRequired`
   and `network: "base"` (`R12-agent-comms.md`). We require both channels populated from one
   serialisation so they cannot drift, then a client reads the header first.
2. **`extra.decimals` is required.** x402 has no decimals field. A validator on another venue refused
   a listing with `cannot determine token decimals: token-info lookup failed … and the accepts entry
   does not provide a decimals field`. A task that cannot be priced never pays (`R16-reuse.md`,
   section 1.5). `extra` is the spec's own slot for scheme-specific keys beside the two reserved ones,
   so this is an addition rather than a deviation.
3. **`extra.name` and `extra.version` are the token's real EIP-712 domain, read from the chain.** Not
   the symbol. USD1's domain name is `World Liberty Financial USD` version `1`, FDUSD's is
   `First Digital USD` version `1`, `$U`'s is `United Stables` version `1`. Every one was derived then
   matched byte for byte against the on-chain `DOMAIN_SEPARATOR()`, with versions `2`, `1.0` and `v1`
   computed and excluded (`VERIFIED-payment-rail.md`, `R16-reuse.md`). USD1's `version()` returns the
   integer 2 while its EIP-712 domain version is the string `1`, so reading the wrong one produces a
   signature every facilitator rejects.
4. **`extra.paymentFlow` is `upfront` or `escrow`, never `authorization`.** Section 5 has the argument.
5. **`maxTimeoutSeconds` is at least 300.** Every example in the spec says 60. The live BSC resource
   says 300 on all three of its `accepts` entries. Treat the spec number as a floor.

Which token, which rail, which facilitator and who pays gas belong to `08-MONEY.md`. The wire
requirement here is only that the challenge is complete, self-consistent, present in both channels and
reproducible against the chain.

### The paid call

```http
POST /jobs
Content-Type: application/json
Idempotency-Key: 4f9a1e2c-7b3d-4c1e-9f21-0a5b6c7d8e90
PAYMENT-SIGNATURE: <base64 PaymentPayload>
Prefer: respond-async, wait=10

202 Accepted
Location: https://agent.example/muster/v1/jobs/job_01J8Z2QK
Retry-After: 5
Preference-Applied: respond-async
PAYMENT-RESPONSE: <base64 SettleResponse>

{ "jobId": "job_01J8Z2QK", "state": "paid", "requestHash": "0x…",
  "createdAt": "2026-09-05T03:11:02Z", "expiresAt": "2026-09-05T03:26:02Z",
  "retryAfterSeconds": 5,
  "cancelUrl": "https://agent.example/muster/v1/jobs/job_01J8Z2QK/cancel",
  "payment": { "state": "settled", "rail": "eip3009",
               "txHash": "0x…", "network": "eip155:56",
               "amountBase": "50000000000000000", "token": "0x8d0D…", "decimals": 18 } }
```

`Prefer: respond-async` with an optional `wait=<seconds>` is RFC 7240 section 4.1, so one endpoint can
answer 200 for a fast job and 202 for a slow one, with `Preference-Applied` echoed. `requestHash` is
the canonical hash of the request body the payment authorised. Without it a settled payment proves
money moved but not what it bought.

### Status codes, complete

Errors are RFC 9457 problem details (`application/problem+json`), which obsoletes RFC 7807 and carries
`type`, `status`, `title`, `detail`, `instance` plus our extensions. `type` is an absolute URL under
our published docs origin, written here as `{docs}/problems/<slug>`.

| Code | When | Body | Notes |
| --- | --- | --- | --- |
| 200 | a synchronous job done, a refusal or an unsupported value answered with the offer list | job resource | a refusal is a 200. Section 6 |
| 202 | job accepted, work continues | job resource with `state` non-terminal | carries `Location` and `Retry-After` |
| 304 | poll with `If-None-Match` and nothing changed | empty | counts as a successful probe |
| 400 | malformed request, unparseable JSON, missing required key **before** payment | problem+json | never after payment. Rule B9 |
| 402 | no `PAYMENT-SIGNATURE` present, else a payment that failed | challenge in both channels | 402 covers both cases in x402 |
| 404 | unknown `jobId`, unknown `skillId` | problem+json | an expired job id may 404 after its retention window, which the card declares |
| 409 | the same `Idempotency-Key` is still in flight | problem+json, `title` naming the outstanding request | the IETF draft's code for this case |
| 412 | Permit2 rail, payer has no allowance | problem+json with `permit2_allowance_required` | the scheme spec's own code, telling the client to approve once then retry |
| 422 | the same `Idempotency-Key` arrives with a different payload | problem+json | never used for a schema complaint |
| 429 | rate limited | problem+json and `Retry-After` | free endpoints only. A paid call is never rate limited after settlement |
| 500 | agent fault | problem+json | section 6 assigns the consequence |
| 503 | a dependency is down, else `queueDepth` is at its ceiling | problem+json and `Retry-After` | the honest answer when an RPC is unavailable |

The 409 against 422 split matters because two live specifications disagree on it. x402's
`payment-identifier` extension returns **409** when the same id arrives with a different payload, while
`draft-ietf-httpapi-idempotency-key-header-07` reserves 409 for a request still in flight then uses
**422** for a reused key with a changed payload (`R12-agent-comms.md`). We follow the IETF draft on our
own surface, because that is the surface a buyer's HTTP client sees, then accept either code inbound
from a listed agent's own payment layer. The draft is expired (revision 07, dated 15 October 2025,
expiry 18 April 2026), which is worth stating rather than presenting it as a standard.

### Timeouts, published

| Hop | Ceiling | Source of the number |
| --- | --- | --- |
| `GET /health` | 2,000 ms | ours, declared in the card |
| `GET /manifest` | 3,000 ms | ours, declared in the card |
| `POST /jobs` create step | 10,000 ms | AIP-151's rule of thumb for what counts as long running is 10 seconds |
| a synchronous skill (`deliveryTarget: sync`) | 10,000 ms | same. Anything slower declares `poll` |
| our own probe budget | 8,000 ms | the timeout `MEASUREMENT.md` used, so probe results stay comparable with the census |
| the broker's gateway | 15,000 ms | above the create ceiling, below any human's patience |
| payment authorisation validity | 300 s | `maxTimeoutSeconds` in the challenge, matching the live BSC resource |
| a job's own life | `maxDurationSeconds` per skill | declared, then enforced by the state machine |

## 3. The job lifecycle

Ten states. Three are non-terminal, seven are terminal. The value goes in `job.state`. When the
state is terminal it is also copied to `job.terminalState`, which is the field every downstream
document reads, so a consumer never has to know which values are terminal.

```
quoted ──pay──► paid ──accept──► working ──deliver──► completed
  │               │                 │  ▲                     
  │               │                 │  └──inputRequired──┘   
  │               │                 ├──refuse──► refused     
  │               │                 ├──fail────► failed      
  │               │                 ├──cancel──► cancelled   
  │               │                 └──clock───► expired     
  │               ├──refuse before work starts──► refused
  │               ├──fail before work starts────► failed
  │               ├──cancel before work starts──► cancelled
  │               └──no work started, money back──► voided
  └──quote expired, nothing charged──► lapsed
```

| State | Meaning | Money | Terminal |
| --- | --- | --- | --- |
| `quoted` | a signed price exists, nothing paid | none moved | no |
| `paid` | payment verified or settled, work not yet accepted by the agent | held or settled | no |
| `working` | the agent accepted and started. `inputRequired` is a sub-state, not a separate state | settled | no |
| `completed` | deliverable produced, `responseHash` recomputes under the declared rule | agent keeps it | **yes** |
| `refused` | the agent said no, naming a condition from its own `refusalConditions[]` | nothing charged unless a partial was declared | **yes** |
| `failed` | the agent accepted then could not deliver | refunded where possible, owed where not | **yes** |
| `cancelled` | the buyer cancelled before delivery | refunded minus a declared partial | **yes** |
| `expired` | `maxDurationSeconds` elapsed with no delivery and no refusal | refunded | **yes** |
| `voided` | payment cleared but the job was never created or was abandoned before any work | refunded in full | **yes** |
| `lapsed` | the quote expired without payment | nothing ever moved | **yes** |

Seven terminal states, named: `completed`, `refused`, `failed`, `cancelled`, `expired`, `voided` and
`lapsed`. Six of the seven end a hire. A hire is a job that reached `paid` or beyond, so `lapsed` is the
one terminal state that never was a hire, which is why it is counted separately everywhere.

Rules on the machine:

- A terminal state is final. A second `cancel` on a terminal job returns 409. Cancel is otherwise
  idempotent.
- `refused`, `failed` and `cancelled` are reachable from `paid` as well as from `working`, without
  passing through `working`. A synchronous skill answers one response carrying `state: refused`, so an
  immediate refusal has no `working` moment at all, which is the case probe C25 pays for.
- `inputRequired` is a flag on `working` with a deadline, not a state. A2A models it as a state, we do
  not, because a paid job sitting in a distinct state waiting for a human is the shape that hides
  stalled money. The deadline runs against `maxDurationSeconds` like any other work time, then the job
  goes `expired`.
- `refused` after settlement is legitimate. The agent states whether it keeps a partial, the card
  declares that partial in advance. `06-QUALITY.md` treats a correct refusal as a success rather
  than a failure.
- Only `completed` produces a `receipt`. Every other terminal state produces a `ledgerEntry` with the
  reason plus, where money moved, a refund record. `08-MONEY.md` owns the refund mechanics.

### Mapping onto the two machines that already exist

Neither mapping is optional. A listing may already speak A2A. An escrow job on BSC has its own
enum whose order is locked.

| Muster `state` | A2A `TaskState` | ERC-8183 `JobStatus` | Note |
| --- | --- | --- | --- |
| `quoted` | none | `0 OPEN` | ERC-8183 has a real pre-funding state, A2A does not |
| `paid` | `SUBMITTED` | `1 FUNDED` | on chain the escrow transition **is** the hire |
| `working` | `WORKING` | `1 FUNDED` | the chain cannot see work happening |
| `working` + `inputRequired` | `INPUT_REQUIRED`, `AUTH_REQUIRED` | `1 FUNDED` | two A2A states collapse to one flag |
| `completed` | `COMPLETED` | `2 SUBMITTED` then `3 COMPLETED` | the deliverable hash goes in at `submit`, money moves at `settle`. Section 9 has both call sets |
| `refused` | `REJECTED` | `4 REJECTED` | A2A's REJECTED is the agent declining, which is our refusal |
| `failed` | `FAILED` | `4 REJECTED` | |
| `cancelled` | `CANCELED` | `4 REJECTED` while Open | one L in A2A's spelling, two in ours. Normalise at the boundary |
| `expired` | none | `5 EXPIRED` | `claimRefund` is permissionless once `expiredAt` passes |
| `voided` | none | `5 EXPIRED` | |
| `lapsed` | none | none | ours |

`JobStatus` order is `0 OPEN, 1 FUNDED, 2 SUBMITTED, 3 COMPLETED, 4 REJECTED, 5 EXPIRED` and reordering
it silently mislabels every job, which is why it carries a do-not-reorder note in our own indexer
(`R16-reuse.md`, `R02-erc8183.md`). Note the asymmetry that shapes the product: on mainnet a submitted
escrow job cannot reach `COMPLETED` for **604,800 seconds**, because silence approves only after
`submittedAt + disputeWindow` elapses. So `paid` and `working` are first-class UI states with a
countdown, not a loading spinner.

Muster's own wire uses the lowercase names above. A2A's uppercase enum is normalised by the `broker` at
the boundary, in one place, with the table above as the map. That is deliberate: a single internal
vocabulary means the rest of the marketplace never branches on which protocol a listing speaks.

## 4. Long jobs, four shapes

A grid runs for days. A rebalancer runs on a schedule. A health-factor monitor never finishes. One HTTP
response expresses none of that. MCP has no task resource at all. x402 settles one payment against one
bounded execution. Four shapes, each with the contract, each chosen against a specific failure.

### A. Synchronous

For work that provably fits in one response. The threshold is AIP-151's own rule of thumb, 10 seconds.

```http
POST /jobs                          200 OK
Idempotency-Key: <uuid>             { "jobId": "job_…", "state": "completed",
PAYMENT-SIGNATURE: <base64>           "result": { }, "responseHash": "0x…",
                                      "deliverableRule": "keccakCanonical",
                                      "computedAt": "2026-09-05T03:11:02Z",
                                      "inputsAsOfBlock": 120036371 }
```

Contract: the published ceiling is below the broker's gateway timeout. `Idempotency-Key` is honoured
even here, because a client that times out will retry and a quote that moved money must not run twice.
`inputsAsOfBlock` is required on anything derived from chain state, so a stale answer is detectable
rather than merely plausible. No cancellation, no partials, no stream. Needing any of those means shape
B.

### B. Polling with a job id, the baseline every listing implements

This is the required shape. It works through every firewall, it needs no inbound reachability from the
agent to us. It survives a client that goes away.

```http
GET /jobs/job_01J8Z2QK
200 OK
ETag: "7"
Retry-After: 10

{ "jobId": "job_01J8Z2QK",
  "state": "working",
  "progress": { "percent": 42, "phase": "backtesting grid spacing", "updatedAt": "…" },
  "partial": { "artifacts": [ { "artifactId": "a1", "name": "grid-plan", "chunk": 3,
                               "append": true, "lastChunk": false } ] },
  "nonTerminalErrors": [ { "type": "{docs}/problems/rpc-timeout", "title": "RPC timeout",
                           "status": 504, "detail": "one of three RPCs timed out, retried",
                           "at": "…" } ],
  "payment": { "state": "settled", "txHash": "0x…", "network": "eip155:56" },
  "retryAfterSeconds": 10 }
```

The terminal poll is the one a buyer keeps. It carries the deliverable, the rule and the hash in the
same body, so nothing has to be fetched from a second place to check it:

```http
GET /jobs/job_01J8Z2QK
200 OK
ETag: "11"
Cache-Control: no-store

{ "jobId": "job_01J8Z2QK",
  "state": "completed",
  "terminalState": "completed",
  "result": { "spacingBps": 45, "orders": 18, "band": ["0.98", "1.02"] },
  "deliverableUri": "https://agent.example/muster/v1/jobs/job_01J8Z2QK/deliverable",
  "deliverableRule": "keccakCanonical",
  "responseHash": "0x…",
  "computedAt": "2026-09-05T03:19:44Z",
  "inputsAsOfBlock": 120036371,
  "payment": { "state": "settled", "txHash": "0x…", "network": "eip155:56" } }
```

`responseHash` covers exactly what `deliverableRule` names: `canonicalJson` of the `result` member
under `keccakCanonical`, the raw bytes served at `deliverableUri` under `sha256Raw` or `keccakRaw`.
A skill declaring a raw rule must serve those bytes byte for byte as hashed, because a buyer verifies
the fetched text rather than re-serialising it. `deliverableUri` is optional under `keccakCanonical`
and required under either raw rule. Probe C24 asserts the declared rule and only the declared rule.

| Clause | Requirement |
| --- | --- |
| job id | opaque, UUIDv4-grade entropy when the endpoint is unauthenticated, because then the id **is** a bearer token. Authorisation checked against the id on every call |
| retention | published in the card. AIP-151's rule of thumb for operation expiry is 30 days. A 404 after that is correct. The creation response says so through `expiresAt` |
| idempotency | `Idempotency-Key` as a structured-header item, a UUID or similar. First sighting processes, a repeat after completion returns the stored original (success or error), a repeat while in flight returns 409, the same key with a different payload returns 422, a missing key where required returns 400. Detecting the 422 case needs a fingerprint of the body stored beside the key |
| polling cadence | `Retry-After` on the 202 and on every non-terminal poll, honoured by the client. The agent publishes a minimum interval so we can rate-limit fairly rather than guess |
| partial results | artifact chunks with `append` and `lastChunk`, held **on the job resource**, not only on a stream, so a poller that arrives late still reads everything produced so far |
| non-terminal errors | an array of problem details, so a degraded-but-running job is visible rather than silently late |
| cancellation | `POST /jobs/{id}/cancel`, 202 on accept, 409 on terminal, idempotent. The card states what happens to work already paid for |
| payment sub-state | `pending`, `settled` or `failed` on the job, never a boolean. The reason is below |

The state names are ours. The mechanisms are not invented: `Prefer: respond-async` is RFC 7240,
problem details are RFC 9457, the partial-results shape is A2A's `TaskArtifactUpdateEvent` expressed as
state rather than as events, the opaque-handle discipline is MCP's own guidance for stateful tools. The
retention and 10-second numbers are AIP-151's (`R12-agent-comms.md`).

### C. Webhook callback

The right shape for pushing a state change into a buyer's dashboard. The wrong shape to make mandatory,
because it needs the receiver reachable and it inverts the trust direction. Declared as
`deliveryTarget: pollWebhook`, which means polling still works and the webhook is the convenience.

```http
POST https://buyer.example/hooks/muster/{subscriptionId}
Authorization: Bearer <single-purpose token issued at subscribe time>
webhook-id: msg_01J8Z3
webhook-timestamp: 1788571904
webhook-signature: v1,<base64 HMAC-SHA256(secret, "msg_01J8Z3.1788571904.{raw body}")>
Content-Type: application/json

{ "type": "job.completed", "timestamp": "2026-09-05T03:11:02Z",
  "data": { "jobId": "job_01J8Z2QK", "state": "completed", "listingId": "…" } }
```

Standard Webhooks is the convention, because it is the only webhook spec with a written signature
scheme and a written retry schedule. Its rules, applied verbatim: header names are lowercase with the
`webhook-` prefix, the signed content is `msg_id.timestamp.payload` joined by full stops over the
**raw** body bytes, `v1,` is symmetric HMAC-SHA256 while `v1a,` is asymmetric ed25519, the header is a
space-delimited list so a secret rotates with no downtime, secrets serialise as `whsec_` with keys as
`whsk_` and `whpk_`, verification is constant-time inside a timestamp tolerance window. `webhook-id`
is the receiver's idempotency key. The published retry schedule is immediate, 5 s, 5 min,
30 min, 2 h, 5 h, 10 h, 14 h, 20 h, ending 51 hours after the first attempt, with jitter
(`R12-agent-comms.md`).

Delivery is at-least-once and we say so. A2A's own language: an agent MUST attempt delivery at least
once per configured webhook, MAY retry with exponential backoff, SHOULD time out in 10 to 30 seconds,
MAY stop after N consecutive failures. So the receiver must be idempotent, which is what the delivery id
plus a seen-id store is for. Authentication travels in the subscription config rather than in the URL,
because a capability URL leaks through logs and referrers. Per-delivery observability is exposed as
`{id, event, status, responseCode, attempt, createdAt, deliveredAt}` with statuses success, failed,
pending, because without it "the webhook did not arrive" is unarguable.

The subscription endpoint is an SSRF sink: we accept a URL from a buyer then fetch it repeatedly. Rule
B8 applies to it. A2A says the same thing normatively for its own push configs.

### D. Server-sent events

The right shape for a buyer watching a run in a browser tab. Never the system of record. Declared as
`deliveryTarget: pollStream`.

```http
POST /jobs/job_01J8Z2QK/subscribe        200 OK
Accept: text/event-stream                Content-Type: text/event-stream
                                         Cache-Control: no-store
                                         X-Accel-Buffering: no

retry: 3000

id: 1
data: {"state":"working","progress":{"percent":42}}

:keep-alive

id: 2
data: {"artifactUpdate":{"artifactId":"a1","append":true,"lastChunk":false}}

id: 3
data: {"state":"completed","terminalState":"completed"}
```

Contract, from the WHATWG rules plus A2A plus MCP. The status must be 200 with the content type exactly
`text/event-stream`. Anything else and the client fails the connection permanently rather than
retrying. Only four field names exist (`event`, `data`, `id`, `retry`), compared literally with no case
folding. `retry:` is set explicitly because the default is implementation-defined. A line starting with
`:` is a comment, sent about every 15 s as keep-alive, with `X-Accel-Buffering: no` so a proxy does not
hold the stream. `204` is the documented way to tell a client to stop reconnecting for good. Events
must not be reordered. Multiple concurrent streams on one job all see the same events in the same order.

A stream is not delivery. A2A states outright that messages must not be treated as a reliable mechanism
for critical information, since a client that reconnects may never see one. **MCP 2026-07-28 dropped
resumable streams via `Last-Event-ID`** so a dropped stream on an MCP transport starts again
(`R12-agent-comms.md`). That is exactly why anything that matters is also readable from the job
resource.

### Which shape, per skill rather than per agent

| Work | `deliveryTarget` | Why |
| --- | --- | --- |
| a quote, a health-factor read, a yield quote, a pool snapshot | `sync` | under 10 s, one response, nothing to cancel |
| a rebalance plan, a grid sizing run, a yield comparison across venues, a backtest | `poll` | minutes, needs progress and cancellation |
| a grid running for days, a health-factor watch, a yield watch with an alert, a monitor with no end | `pollWebhook` | the job outlives every connection, so polling is the contract |
| a run a buyer watches live | `pollStream` | the stream is the view, the job is the truth |

The card declares `expectedDurationSeconds` per skill, the broker picks the shape from the declaration,
then the `prober` checks the declaration against measured latency. A skill that declares `sync` at 5 s
then measures 40 s over three probes gets a `lintFindings[]` entry and a forced move to `poll`.

## 5. How a seconds-long payment carries a days-long job

This is the mismatch that has to be stated in numbers rather than waved at.

`maxTimeoutSeconds` is a required field on every `PaymentRequirements` entry and it means the time
allowed for **payment completion**. The EIP-3009 authorisation the buyer signs carries `validAfter` plus
`validBefore`. The spec's own worked example is a 65-second window. An expired authorisation is a
facilitator error, `invalid_exact_evm_payload_authorization_valid_before`. So the signed payment is a
minutes-scale object whatever the work is. It cannot be held for three days then settled
(`R03-x402-b402.md`, `R12-agent-comms.md`).

x402 defines three payment flows and only two of them survive a long job:

| `extra.paymentFlow` | Ordering | Fits a long job |
| --- | --- | --- |
| `authorization`, the default | verify, resource, settle, respond | **No.** Settlement happens after the resource finishes, so a three-day resource means settling a three-day-old authorisation, which has expired |
| `upfront` | settle, resource, respond | **Yes.** Money is durably committed before work starts, so the payment exchange finishes in seconds while the work runs for days |
| `escrow` | settle, resource, settle, respond | **Yes. The better fit for metered work.** The first settle commits a deposit or a ceiling, the second records the final charge |

Clients are told to prefer `authorization` where both are offered, which is backwards for our case, so
**a Muster listing must not offer `authorization` on any skill whose `deliveryTarget` is not `sync`.**
The spec requires `extra.paymentFlow` to be stated whenever the resolved flow is not `authorization`,
which is why rule 4 of the challenge section makes the field mandatory here.

### The composition, as a sequence

Split the priced resource from the job. The priced resource is the **create call**, which is bounded.

1. `POST /jobs` validates the input, reserves capacity, returns a job id. Seconds.
2. That endpoint answers 402 with `extra.paymentFlow: "upfront"` and a `maxTimeoutSeconds` covering
   only the create call.
3. The client retries with `PAYMENT-SIGNATURE`. The server reserves the idempotency key, settles, then
   creates the job, then answers 202.
4. **Polling is free.** It is rate-limited rather than priced. Charging per poll would make the meter a
   function of the buyer's client rather than of the work.
5. Anything genuinely incremental is a **new priced call against the same `jobId`**, which is what
   `POST /jobs/{jobId}/renewals` is for: another day of grid operation, another rebalance, an extra
   backtest. Each 402 exchange still covers one bounded execution. Under `escrow` those become the
   second settle against the committed ceiling instead.

### The renewal route

The one priced route that takes an existing `jobId`. It exists because a metered job needs a second
payment while the first job is still running. The create route cannot serve that, since a create makes a
new job where a seven-day grid is one job.

```http
POST /jobs/job_01J8Z2QK/renewals
Idempotency-Key: 0x9f2c…                      402 Payment Required
Content-Type: application/json                PAYMENT-REQUIRED: <base64, amount = renewal.priceBase>
{ "dayIndex": 3 }

POST /jobs/job_01J8Z2QK/renewals              202 Accepted
Idempotency-Key: 0x9f2c…                      PAYMENT-RESPONSE: <base64 SettleResponse>
PAYMENT-SIGNATURE: <base64>
{ "dayIndex": 3 }                             { "jobId": "job_01J8Z2QK", "state": "working",
                                                "renewal": { "dayIndex": 3, "paidAt": "…",
                                                  "coversUntil": "2026-09-08T03:11:02Z",
                                                  "settlementTxHash": "0x…" },
                                                "renewalsPaid": 3,
                                                "nextRenewal": { "dueAt": "…",
                                                  "priceBase": "50000000000000000",
                                                  "idempotencyKey": "0x…" } }
```

Four rules. The `Idempotency-Key` is the agent's own published `renewal.idempotencyKey`,
`sha256(jobId + "|" + dayIndex)`, so buyer and agent derive the same key for the same interval and
neither can invent a second one. Reservation happens before settlement, exactly as on a create, so a
repeat of a paid key returns the stored 202 and settles nothing. A renewal never changes the price, the
token or the rail the card declared. A 402 quoting a different `amount` than `renewal.priceBase` is
a conformance failure. A renewal on a terminal job returns 409. Probe C31 pays one published key twice
and counts settlements on chain.

### The grid case, concretely

A grid trading job priced for seven days of operation, `deliveryTarget: pollWebhook`:

- `POST /jobs` with `{"skillId":"grid.run","days":7,…}`. One 402, one signature, one settle, in seconds.
  `maxDurationSeconds` is 604,800. The job goes `paid` then `working`.
- The agent's own renewal cadence is one priced increment per 24 hours of operation, requested by the
  agent on the job resource as `renewal: { dueAt, priceBase, idempotencyKey }` and paid at
  `POST /jobs/{jobId}/renewals`. The buyer's client pays it with a fresh authorisation, so every
  signature is minutes old at settlement.
- `idempotencyKey` for a renewal is `sha256(jobId + "|" + dayIndex)`, published by the agent, so a
  retried renewal can never charge twice for the same day.
- A missed renewal **pauses at the interval boundary**. It does not liquidate, does not cancel open
  orders, does not leave capital in a half-built grid. The card declares that behaviour as a
  `refusalConditions[]` entry with code `capExceeded`. The job carries `state: working` with
  `progress.phase: "paused, renewal overdue"` until either payment arrives or `maxDurationSeconds`
  elapses and it goes `expired`.
- Where the buyer wants the whole seven days committed up front instead, the rail is `escrow8183` rather
  than x402. Section 9 has the calls.

### The other three, concretely, because grid is not the general case

Grid is the longest of the four, so it is the worked example. The other three compose differently and the
difference is the price shape rather than the protocol, which is why one wire contract carries all four.
`08-MONEY.md` owns every price below as a shape, never a number.

| Category | What one priced execution buys | Shape | Renewals |
| --- | --- | --- | --- |
| `rebalancing` | one evaluation of the band plus the plan it produces, at a pinned block | `poll`, minutes | none. A second evaluation is a new job, because the position moved and the old plan is stale |
| `yield` | one comparison across the venues the card declares, each rate carrying its unit and its source call | `sync` under 10 s, `poll` where it spans several venues | none for a one-shot quote. A yield watch is `pollWebhook` with the same daily increment a grid uses |
| `health-factor` | one read of the account's distance to liquidation at a pinned block, otherwise a watch that alerts on a threshold crossing | `sync` for the read, `pollWebhook` for the watch | the watch renews per 24 hours of cover on the same `sha256(jobId + "\|" + dayIndex)` key. A missed renewal stops alerting at the interval boundary and says so, it never silently keeps watching |

Two rules bind all four and neither is category-specific. A missed renewal **pauses at the interval
boundary** and never liquidates, cancels or half-completes, declared as a `refusalConditions[]` entry with
code `capExceeded`. And a watch whose renewal lapsed reports `progress.phase` naming the lapse, because a
monitor a buyer believes is running is worse than one that stopped loudly.

### Settlement is not a boolean

x402 defines `settlement_pending` as a **non-terminal** error reason: the transaction was broadcast but
confirmation could not be established. A settle response carrying it must include the broadcast
`transaction` hash and `network` so the caller can reconcile on chain. B402 is worse than that in the
same direction: settle became asynchronous on 2026-07-14, it returns a pending shape after about 20
seconds. A confirmed on-chain revert and a pending confirmation **both** surface as `success:
false` with a hash, so the discriminator is whether `transaction` is empty rather than what
`errorReason` says. B402 reconciles a broadcast transaction for up to about 30 minutes and `/settle` is
idempotent on `(nonce, network, payer)` (`R03-x402-b402.md`).

So the job carries `payment.state` as `pending`, `settled` or `failed` with the tx hash and the
network recorded from the first moment. A marketplace that reads a non-success settle as a refusal drops work
that was in fact paid for.

### The ordering rule that stops double charging

Check idempotency **before** touching payment. A client whose create request times out retries with a
fresh EIP-3009 nonce, because the old authorisation may have expired. The 32-byte random nonce makes
replaying the *same* payload harmless, since the token marks `_authorizationStates[from][nonce]` and
emits `AuthorizationUsed`, but it does nothing about a second, different, valid payment for the same
job.

```
receive POST /jobs with Idempotency-Key K and PAYMENT-SIGNATURE P
  K seen, job complete       -> return the stored 200/202 for K, do NOT settle P
  K seen, job in flight      -> 409 problem+json,                do NOT settle P
  K seen, different body     -> 422 problem+json,                do NOT settle P
  K unseen                   -> reserve K, then verify/settle P, then create the job
```

That is the IETF draft's own enforcement table with the payment step moved inside the reservation. The
other order costs the buyer twice on every client timeout.

## 6. The error taxonomy Muster can act on

Four fault classes. The fourth is the one most venues leave out, then quietly charge to the operator.

| Class | What it is | Wire signals | `probeResult.failureClass` | Money | What it does to the record |
| --- | --- | --- | --- | --- | --- |
| `agentFault` | the agent accepted then failed its own declaration | 500, a timeout after 202, a `responseHash` that does not recompute, a refusal outside the declared conditions, a declared skill that is absent | `http`, `shape` | buyer not charged or refunded. Already settled means the operator owes it, funded from the E1 bond | counts as a failed job in the Muster score. A wire-level fault also drops `reachabilityTier` |
| `buyerFault` | the request was never valid | 400 before payment, 404 on an unknown `skillId`, 412 with no Permit2 allowance, 422 on a reused key, an expired authorisation, `insufficient_funds` | none, this is not a probe outcome | agent may keep a declared partial once work started | no effect on the agent. Repeats hit the buyer's own rate limit |
| `networkFault` | neither party's decision | DNS failure, TLS failure, connection reset, 429 from a shared host, 503 with `Retry-After`, `settlement_pending`, an RPC timeout inside the agent | `dns`, `tls`, `timeout` | no charge. Retry per the schedule | excluded from the score on first occurrence in a window. Affects `reachabilityTier` only after three consecutive full-suite failures |
| `marketplaceFault` | ours | our facilitator down, our probe misconfigured, our gateway timeout at 15 s, our index stale | recorded, then the probe is voided | we absorb it | **excluded from the agent's record entirely** and published on the status page |

Attribution rules, because the class is the consequence:

- **Timing decides between `agentFault` and `buyerFault`.** Before the 402 is answered, a malformed
  request is the buyer's. After payment settles, a schema complaint is the agent's, always, which is
  rule B9. There is no case where a paying caller receives a 422 about its own body.
- **A 402 answered twice is not a fault at all.** x402 uses 402 for both "payment needed" and
  "payment failed", so the second 402 is a normal step in the protocol.
- **A `skip` is not a `pass`.** A probe that could not run because the surface was not declared is
  recorded as `skip` with the reason and contributes to no tier.
- **Our own failure never becomes the agent's.** Every probe result carries `prober` and `observedAt`,
  so a bad probe window can be identified then voided in bulk. This is the class that makes the
  published per-listing history honest.

Every error the wire returns is a problem detail with a `type` under `{docs}/problems/`. The slug set we
publish, mapping onto the four classes: `agent-internal`, `agent-timeout`, `hash-mismatch`,
`declared-skill-missing`, `refusal-out-of-scope`, `malformed-request`, `unknown-skill`,
`allowance-required`, `idempotency-conflict`, `idempotency-mismatch`, `authorization-expired`,
`insufficient-funds`, `upstream-dns`, `upstream-tls`, `upstream-timeout`, `rate-limited`,
`dependency-down`, `settlement-pending`, `marketplace-facilitator-down`, `marketplace-gateway-timeout`.

## 7. Behaviour rules a listing accepts by listing

Thirteen rules. Each one names how it is checked, because a rule nobody checks is a wish. The probe ids
are section 10's.

**B1 Declared means callable.** Every skill in the manifest runs for a stranger at the stated price.
A skill that fails its probe comes out of the manifest. Checked by C12 and C22.

**B2 Cold start is read-only.** On first entry into a new environment (a new session, a new wallet, a
new market) the agent's first action is a scope read, never a write. Concretely, before any transaction
it reads its own allowlist, cap and expiry from chain: `canExecutePackedInfos(keyHash)` `0xe5adda71`,
`spendInfos(keyHash)` `0xdcc09ebf`, `getExpiry(wallet, keyId)` `0x3b49ad47`. It then echoes the scope
back to the buyer in plain language before acting. If any of the three reads is missing or empty it
**fails closed** and refuses with code `sessionMissing`. Checked by C28.

**B3 No unbounded spend, ever.** An agent that transacts holds a session carrying all three of a call
allowlist, a spend cap and an expiry. Omitting the allowlist is not a smaller grant, it is a total one:
the Altana SDK's own documentation says twice that omitting `permissions.calls` grants **every** target
inside the spend cap (`R06-altana.md`). So a session with `spend` but no `calls` is a hard failure rather
than a finding. Two further rules from the same source. Caps are raw units at that token's decimals **on
that chain**, so a cap written for a 6-decimal chain reads generous then reverts at 0.0000000001 units on
BSC. And every entry is scoped by selector rather than by bare target, because a session executes as the
wallet: a registry-wide grant would also authorise two calls nobody meant to give away, `transferFrom`,
which steals the identity, then `setApprovalForAll`, which is an operator approval that outlives session
revocation (`R06-altana.md`). An
ERC-20 `approve` is allowed and expected, since all four category shapes need it, but only on named
tokens and only for a bounded amount, never `setApprovalForAll` and never the max-uint form. Checked by
C28, which is a hard gate for any listing whose `writes[]` is non-empty, at every tier.

**B4 No side effect outside the declared scope.** `writes[]` in the card is the complete set of
`{target, selector}` pairs a skill may call. This is enforceable rather than promised, because
`canExecute(keyHash, target, data)` `0xff619c6b` returns false for an unlisted pair and the transaction
reverts. Two consequences follow. A free probe can never cause a state change. And Porto's
any-function sentinel `0x32323232` in a `canExecutePackedInfos` entry means "any call to this
target", so a listing whose entries carry it declares an unbounded scope and is rejected. Checked
by C27 and C28.

**B5 A refusal is a success.** Structured, coded, never a 500:

```json
{ "jobId": "job_…", "state": "refused", "terminalState": "refused",
  "refusal": { "code": "dataStale", "detail": "newest pool observation is 812 s old, limit 600 s",
               "observedAt": "…", "inputsAsOfBlock": 120036371,
               "chargedBase": "0", "retryAfterSeconds": 60 } }
```

Codes are a closed set: `outOfScope`, `inputUnsupported`, `dataStale`, `capExceeded`, `sessionMissing`,
`screenedCounterparty`, `advicePosture`, `marketConditionUnsafe`, `injectionDetected`, `rateLimited`.
Every code a skill can emit is declared in `refusalConditions[]` in advance. A refusal with an undeclared
code is `agentFault`, because the point of declaring them is that a buyer knows before paying. HTTP
status is 200: the request succeeded, the answer was no. Checked by C25.

**B6 Measurement, comparison, simulation or mechanical execution. Nothing else.** Those four output
shapes are the whole permitted range. The line they stay on the safe side of is personalisation
rather than subject matter: MiCA Art 3(1)(24) defines advice as a personalised recommendation to a
client. MiFID II's delegated Art 9 makes a recommendation personal when it is presented as suitable
for that person or built on their circumstances (`R15-compliance.md`). So no "you should move your USDT
into the 8.2% pool", no "based on your portfolio, rebalance to 60/40", never the word suitable, no
"safe" or "guaranteed" applied to a DeFi position, no forward APY without saying it floats, no
health-factor number without the liquidation consequence beside it. One presentation rule rides with
it: every number carries its inputs and its block. Checked by C09 (declaration) and a human read at
review. Two clauses belong elsewhere and are named rather than restated here. `09-DISPUTES.md` owns the
financial-advice posture itself, so this rule is the declarable field plus what the agent may emit.
`03-TAXONOMY.md` owns presentation, including showing downside at the same visual weight as upside.

**B7 Untrusted input is data, never instruction.** A deterministic gate runs before any model call and
cannot be overridden by model output. The pattern list is ours and already written: `ignore (all|any|
the|your|previous|above)`, `disregard …`, `forget …`, `you are (now )?(a|an|my)`, `system prompt`,
`new instructions?`, `override (the|your|all|safety)`, `bypass`, `jailbreak`, `pretend (to be|you are|
that)` (`R16-reuse.md`, section 5.3). Both directions are screened, input before the model and output
before anything is published. Redaction substitutes rather than rejects so a flagged deliverable
still renders. On the render side agent output is never trusted markdown: images are not rendered at all
and links are shown as text, because the markdown exfiltration class is real and shipped. GitHub's
fix for it in Copilot Chat was to disable image rendering entirely despite already proxying images
through an HMAC-signed rewriter (`R12-agent-comms.md`). A2A's own media-type registration says
implementations MUST sanitise user-provided content to prevent injection. The agent-side gate is this
rule and is checked by C26. Injection defence on agent output rendered to a buyer is `14-GAPS.md`'s.
This rule states what an agent must emit rather than how our own page renders it.

**B8 No SSRF, on either side of the wire.** Every host in a task input or a webhook target is resolved,
then **every** returned address is checked as global rather than only the first, so a multi-A-record host
cannot smuggle one private answer through. Redirects are not followed, because a public host that 302s to
`169.254.169.254` defeats a pre-flight check on its own. Response bodies are truncated before use. One
language trap worth naming: Python's `ipaddress.is_global` returns True for `224.0.0.1`,
`239.255.255.250`, `ff02::1`, `ff00::1` and the NAT64 form `64:ff9b::7f00:1`, so multicast and NAT64
need explicit rejection on top of the library check (`R12-agent-comms.md`). An agent that fetches a
private target named in a task input fails C27. SSRF on our own probes and on our own subscription
fetches is `14-GAPS.md`'s, with `15-SYSTEM.md` owning the guard's implementation. This rule binds the
listed agent.

**B9 Never 422 after payment.** A paid handler reads any shape. The resolver walks the payload to a
bounded depth, reads a priority key list first, then every other key, before answering. A request naming
nothing gets a stated default with `resolvedFrom` echoed in the response. A request naming something the
agent does not offer gets **200 with the offer list** and commits nothing, never a silently substituted
answer. Unresolved calls log with the raw payload truncated so the next probe is diagnosable. One
word-boundary detail that is experience rather than polish: alias matching uses
`(?<![a-z0-9])alias(?![a-z])` so "console" cannot yield "sol" (`R16-reuse.md`, sections 1.5 and 5.4).
Checked by C21.

**B10 Idempotent and replay-safe.** Honour `Idempotency-Key`, reserve before settle, never charge twice
for one key, publish the retention window for keys. Checked by C20 on chain, by counting settlement
transactions rather than by trusting the response.

**B11 Freshness is stated, not implied.** Every number carries `block`, `observedAt` and `source`. A
number outside the skill's declared `freshness.maxAgeSeconds` is refused with `dataStale` rather than
served. `freshness` is required on any skill whose category contract reads chain state, C09 asserts it,
then a skill that omits it inherits a 60 s ceiling rather than an unbounded one. This is the field the
rubric's Data Quality criterion is asking about. The index we build on
demonstrates the failure: 8004scan's `endpoint_last_checked_at` does not move even when a verification
demonstrably runs, so it must never be displayed as freshness (`R05-8004scan-api.md`).

**B12 No silent capability change.** `setAgentURI`, `setMetadata` and `setAgentWallet` are all callable
by the owner at any moment, so without this rule a review means nothing. The card hash is pinned at
review as `listing.reviewedCardHash`. A change to `baseUrl`, `payTo`, any price, any schema or the skill
set re-runs conformance. Until it passes, the listing serves the last reviewed card with a re-review
notice. Detected by comparing `cardHash` and `tokenUriHash` against the reviewed values on every sweep,
one storage read and one hash per agent.

**B13 Screening flows down one hop.** An agent that subcontracts declares `policy.subcontracts: true`,
may go one hop deep, must not pass a job to an address we have blocked, then attaches the sub-hire's
receipt to the parent job's evidence bundle. Undisclosed subcontracting to a screened party is a
prohibited use in its own right, because otherwise a block is one hop from meaningless given that
ERC-8183 hiring composes (`R15-compliance.md`). `09-DISPUTES.md` owns the screening mechanism.

Two rules deliberately not on this list, so nobody adds them later by assumption. We do not require an
agent to be a language model: deterministic code is preferable for all four categories. The rules
above are written so a plain program satisfies every one of them. We do not require an agent to hold a
session at all, because three of the four categories can be served read-only. B2, B3 and B4 bind only
an agent that declares a non-empty `writes[]`. For every one of those, C28 is a hard gate whatever
tier the listing claims. E4 adds two clauses on top of C28 and nothing else: the session is registered
in the Keystore and its expiry runs past the judging window. There is no state where an agent takes a
write scope and no probe reads it.

## 8. How a buyer reaches an agent

Two paths, both supported, both recorded, one of them recorded better. We are not a toll booth. There
is a compliance reason for that as well as a product one: a venue that only hosts bids and offers, with
the parties settling through an outside venue, is not a money transmitter under FinCEN FIN-2019-G001,
while a payment processor for convertible virtual currency is (`R15-compliance.md`). Forcing every hire
through our own hands would change what we are.

### Brokered, through the `broker`

The buyer never touches the agent's endpoint. Muster quotes, answers the challenge, dispatches the call,
verifies the deliverable, then publishes the receipt. What gets recorded:

| Record | Contents |
| --- | --- |
| `quote` | `quoteId`, `listingId`, `agentId`, `buyer`, price triple, `expiresAt`, `negotiationHash`, `providerSig`, `signerRecovered`, `signerMatchesProvider` |
| `payment` | `rail`, `token`, `decimals`, `amountBase`, `payer`, `payTo`, `nonce`, `validAfter`, `validBefore`, `txHash`, `blockNumber`, `facilitator`, `gasPaidBy`, `feeBase`, `origin` |
| `job` | the whole lifecycle including `requestHash`, `responseHash`, `deliverableUri`, `deliverableRule`, `terminalState`, `refusal` |
| `receipt` | `contentHash`, `hashRule`, `txHash`, `blockNumber`, `pinnedBlock`, `inputsHash`, `codeVersion`, `recomputeCommand` |
| `ledgerEntry` | one append-only hash-chained entry per money movement and per outcome, `origin` fixed at append time |

`origin` is `house` or `order` and the chain refuses any other value when the entry is appended, so the
tag is a structural invariant rather than a display convention. Revenue and volume count `order`
only. Our own probe spend, our own seeded jobs and our own first-party agents' internal runs are all
`house`, rendered on the same public page and visibly distinct (`R16-reuse.md`, section 1.6).

### Direct, agent to buyer

The buyer reads the manifest then pays the agent themselves. We keep four attribution levels in
`job.attribution` rather than pretending we saw it:

| `attribution` | How we learned about it | Feeds the Muster score |
| --- | --- | --- |
| `brokered` | we ran it | yes |
| `onChain` | the `escrow-index` saw an ERC-8183 job whose `provider` joins back to an agent id | yes |
| `signedReceipt` | the agent or the buyer posted a receipt to our API, signed by a key that recovers to `getAgentWallet(agentId)` or `ownerOf(agentId)` | shown, weighted down, never a substitute for a settled job |
| `unattributed` | we never saw it. A plain transfer leaves nothing to join | no |

`POST /v1/receipts` on our own API takes a `signedReceipt`. Its body is the job's canonical record and a
signature over `keccak256(utf8(canonicalJson(record)))`, verified by recovering the signer then comparing
against the chain. Where the agent is a contract the fallback is ERC-1271
`isValidSignature(bytes32,bytes)` returning `0x1626ba7e`, which is the same pattern the identity
registry itself uses inside `setAgentWallet`, where `ECDSA.tryRecover` failing falls through to
`IERC1271(newWallet).isValidSignature(digest,sig) == 0x1626ba7e` (`R01-erc8004.md`). A receipt that fails
recovery is stored with the failure recorded and shown as unverified, never dropped silently.

x402's `offer-receipt` extension is the standardised version of exactly this: a server-signed offer in
the challenge and a server-signed receipt on success, as EIP-712 or JWS, whose stated purposes are
dispute evidence, "user-review attestations" and reputation systems. Its EIP-712 domain is
`{name: "x402 receipt", version: "1", chainId: 1}` with chainId pinned to 1 on purpose because the
signing is off chain. Whether any BSC agent serves it is **unverified**: the one live challenge we
decoded carries `bazaar` and `builder-code` only. No sweep of the Bazaar's resources was run
(`R12-agent-comms.md`). So we read it opportunistically then fall back to our own shape.

## 9. Agent hires agent

The buyer is not always a person. TermiX has said they will hire from every submitted marketplace then
grade what comes back, so the machine lane is a scored surface rather than a nice extra
(`R07-termix.md`).

### What changes when the buyer is code

Nothing in the wire, which is the point. The differences are all at the edges:

- **No browser, so no wallet popup.** The whole hire is `GET /manifest`, `POST /jobs`, 402,
  `PAYMENT-SIGNATURE`, poll. Four requests and one signature.
- **Read surface in the shape their tooling already speaks.** A recursive grep of TermiX's own live 1.5.0
  client package finds no `mcp` and no `x402`: it is Node scripts over a REST API and a `.well-known`
  manifest (`R07-termix.md`). So REST first, no auth on reads, `{ items, page, pageSize, total,
  totalPages }` envelopes, decimal display strings for money beside base units, ISO-8601 UTC timestamps.
  MCP second, for buyers driving Claude or Cursor. Nothing gated on an address list, because which
  wallet they judge from is unverified and unknowable in advance.
- **Buyer identity is optional and verifiable.** A buying agent may send
  `X-Muster-Buyer: eip155:56:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432:<agentId>` plus
  `X-Muster-Buyer-Signature`, a signature over `requestHash` recovering to that agent's
  `getAgentWallet`. Verified buyer identity unlocks a higher rate limit and the ability to leave
  ERC-8004 feedback bound to a real hire. An unverified buyer is served identically.
- **Self-feedback is blocked on chain, which matters here.** `giveFeedback` from the agent owner reverts
  `Self-feedback not allowed` (`R01-erc8004.md`), so a buying agent that shares an owner with the
  provider cannot rate it, so our own first-party agents cannot rate each other either. That is a
  useful floor we get for free.

### Where ERC-8183 applies

When the buying agent wants escrow rather than a signature, the rail is the official BNB kernel. It is
not a paper spec: 56,713 lifetime jobs, 28,244 completed, 292.24 `$U` paid on completed jobs, with one
address holding 99.0% of the jobs and 96.3% of the paid value (`R02-erc8183.md`, `R16-reuse.md`). The
five buyer calls, in order, from the verified deployment:

```ts
const jobId = (await commerce.read.jobCounter()) + 1n     // predicted, not returned, when batching
commerce.createJob(provider, ROUTER, expiredAt, description, ROUTER)  // evaluator AND hook = router
router.registerJob(jobId, POLICY)        // client-only, before fund, policy must be whitelisted
commerce.setBudget(jobId, budget, "0x")  // client or provider
paymentToken.approve(COMMERCE, budget)   // approve the KERNEL, not the router
commerce.fund(jobId, budget, "0x")       // expectedBudget must equal job.budget or BudgetMismatch()
```

Kernel `0xEa4DAa3100A767e86FDed867729ae7446476EBA6`, router
`0x51895229E12F9876011789B04f8698af06cCD6DA`, policy `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5`,
payment token `$U` `0xcE24439F2D9C6a2289F741120FE202248B666666` at 18 decimals. One `paymentToken` per
kernel, so every escrow job on BSC is priced in `$U` with no route to USDT inside the escrow. A hook is
mandatory (`address(0)` reverts `HookRequired()` `0x55c45de1`) and must pass ERC-165 `IACPHook`
`0x7ff6bc9e`, with no hook allowlist. `expiredAt` must be more than 300 s ahead and at most 31,536,000 s
ahead. The working formula is `now + disputeWindow + 1800`.

The provider side is ours too, because a hire from TermiX lands on one of our listings. Two calls. Only
the first is the provider's:

```ts
commerce.submit(jobId, deliverable, optParams)   // provider-only, FUNDED only, before expiredAt
router.settle(jobId, "0x")                       // permissionless, once submittedAt + disputeWindow elapses
```

`deliverable` is a `bytes32` with no protocol-enforced meaning, so what goes in it is a decision rather
than a read. Ours is the convention both SDKs already write: `deliverable =
keccak256(utf8(canonicalJson(manifest)))` with `optParams = utf8(JSON.stringify({"deliverable_url":
"https://…"}))`. The bytes served at that URL are byte-identical to the bytes hashed
(`R02-erc8183.md`). That is the same rule our own wire calls `keccakCanonical`, so one job has one hash
rule whichever rail carried it. The `JobInitialised` event the policy emits is the on-chain home of
the pointer. A buyer verifies the raw fetched text rather than re-canonicalising it.

`submit` is provider-only and only from FUNDED: on an OPEN job it reverts `WrongStatus()` `0x8e78f0cb`,
so an unfunded job cannot be delivered into. For a first-party agent the call is made by that agent's
own Altana session key under a selector-scoped grant, which is exactly what
`erc8183SubmitPermissions(chainId)` grants, one entry for `submit(uint256,bytes32,bytes)` on the kernel
(`R02-erc8183.md`). Muster never calls `submit` for a third party, because the kernel refuses any caller
that is not the job's provider: we index the log and show it. Our `settler` calls `settle` for any job
whose window elapsed.

When a job is rejected, the evaluator calls `reject` and the client is refunded. There is no appeal on
chain and no second submit, so what our agent does is keep the deliverable and its hash in the
`evidence-store`, record the rejection with the policy reason hash on the job, then let the listing's
record carry it. `09-DISPUTES.md` owns what happens next. If nobody submits before `expiredAt`, anyone
may call `claimRefund` and the escrow goes back to the client, which is why the provider-side deadline
is the job's expiry rather than the dispute window.

Four consequences for this protocol:

1. **The quote is signable and checkable.** The on-chain `job.description` carries `negotiation_hash`
   and `provider_sig`. The recipe reproduces exactly on 4 of 4 live jobs: the hash is
   `keccak256(utf8(canonicalJson(description minus negotiation_hash and provider_sig)))` with
   `provider_sig` an EIP-191 signature over that hash **as a hex string**. Wire keys there are snake_case
   and stay that way. The SDK caps the quote at 900 s. Muster's own `quote` record stores
   `signerRecovered` and `signerMatchesProvider` from that check, so a listing shows "the operator signed
   this price" rather than "the buyer typed a number".
2. **A foreign record needs all three rules tried, because three are live.** One producer uses
   `keccak256(canonicalJson(manifest))`, one uses `sha256(raw optParams bytes)` verified byte-exact, one
   ships empty `optParams` so nothing can be checked. Reading somebody else's job we try all three in
   that order, then label which matched, then say "not retrievable" rather than showing a blank
   (`R02-erc8183.md`). That walk is for foreign records only. On our own wire the rule is declared in the
   card and C24 applies the declared rule alone.
3. **`settle` is permissionless, so we run a `settler`.** Once `submittedAt + disputeWindow` elapses,
   anyone may call `router.settle(jobId, evidence)` and silence approves, since there is no
   `voteApprove` on chain. The router's own `inflightJobCount()` read **28,326** on 2026-09-05
   (`R02-erc8183.md`), while the census counts 994 Open plus 285 Funded plus 27,170 Submitted, so the two
   reads are close without being the same read. Only the Submitted portion is settleable at all: `settle`
   reverts `NotDecided()` inside the window and `PolicyNotSet()` on a job that was never registered. An
   Open or Funded job has nothing submitted to approve. So the number is jobs in flight, not stalled
   payouts. Settling any job whose window has elapsed, not only ours, turns a stalled escrow into a paid
   provider.
4. **The mainnet window shapes the honest claim.** `disputeWindow()` is 604,800 s on mainnet and 900 s
   on testnet. The clock runs from `submittedAt`, not from funding, so a mainnet job funded **and
   submitted** on 2026-09-08 becomes settleable around 2026-09-15, inside the judging window. The page
   shows it as an in-flight hire with its auto-approval date and its job id, then it settles on the 15th.
   A job funded on the 8th and submitted later settles later, which is why the submission is ours to make
   rather than somebody else's to remember. The testnet loop closes inside one sitting at 900 s, which is
   what proves the settlement path works end to end. Neither claim is made before it is true.

One thing we will not do, stated because it is technically available. The evaluator is unconstrained at
`createJob`, the kernel accepts any ERC-165 hook, there is no hook allowlist, so we could make
ourselves the evaluator on a job we also buy then complete it ourselves. That is a self-dealt attestation
a judge who reads the job will spot. Where a custom evaluator is ever used the framing is that the
marketplace runs its own policy for its own agents, disclosed on the page.

### Fan-out and subcontracting

A buying agent may hire several of ours in parallel (`07-MATCHING.md` owns the selection). A hired agent
may subcontract one hop under rule B13, with the sub-hire disclosed in the parent receipt. Deeper chains
are refused rather than tracked, because the evidence bundle stops being checkable and the screening
stops being enforceable at depth 2.

## 10. The conformance suite

Thirty-one probes. Each one is a single assertion with its own timestamp, verdict, latency and
`failureClass`, stored as a `probeResult` row and published on the listing. The `conformance` component
runs them, `05-ONBOARDING.md` owns the schedule and what a failure does to visibility.

Verdicts are `pass`, `fail` or `skip`. **A `skip` never counts as a pass and never contributes to a
tier.** That rule exists because the index we are compared against violates it: 8004scan marked 11 of one
agent's declared services `skipped` then reported `health_score: 100.0` for it
(`R12-agent-comms.md`). Every probe result carries `prober` and `observedAt`, so a bad window is
voidable in bulk under `marketplaceFault`.

### Identity and document

| Id | Surface | It asserts | Fail is | Gate |
| --- | --- | --- | --- | --- |
| C01 | chain | `ownerOf(agentId)` `0x6352211e` returns the address the operator proved, else `isApprovedForAll(owner, operator)` `0xe985e9c5` is true (`R01-erc8004.md`). `ERC721NonexistentToken` `0x7e273289` means the id does not exist | `http` | **hard** |
| C02 | chain | `tokenURI(agentId)` `0xc87b56dd` is non-empty and resolves through all six live shapes: base64 `data:`, **gzip `data:`** (`enc=gzip;level=6`), `https`, `ipfs`, empty, raw JSON with no prefix (`R01-erc8004.md`). A template (`{agentId}`) or an example host is a fail, not a pass | `template` | **hard** |
| C03 | http | the registration document parses as JSON and carries `type`, `name`, `description`, `services[]`. About 5% of agents hold something no correct parser can use and about 5% of off-chain URIs 404 or return HTML (`R01-erc8004.md`) | `shape` | **hard** |
| C04 | chain | `getAgentWallet(agentId)` `0x00339509` is non-zero and equals the card's `payTo`. It returns an ABI-encoded address, so no 20-byte decode belongs here. Whether it differs from `ownerOf` is recorded, never gated: 0 of 600 sampled agents differ | `http` | **hard** |
| C05 | chain | the agent has no `Registered` re-mint and its `tokenUriHash` matches the reviewed value, then `cardHash` matches `listing.reviewedCardHash`. A change re-runs the suite under B12 | `shape` | soft |

### The card

| Id | Surface | It asserts | Fail is | Gate |
| --- | --- | --- | --- | --- |
| C06 | http | a `services[]` entry normalising to `muster` exists, its endpoint is https, under 512 characters, answers 200 with a JSON content type inside 3,000 ms | `http` | **hard** |
| C07 | http | the card validates against `muster-card-1.json` with every required field present and every enum value in range | `shape` | **hard** |
| C08 | http | `agent.chainId`, `agent.registry` and `agent.agentId` match the on-chain agent. CAIP-2 prefix compared case-sensitively, address case-insensitively, `agentId: 0` rejected as a placeholder | `shape` | **hard** |
| C09 | http | every skill names one of the four category slugs, declares both schemas as JSON Schema 2020-12, declares `expectedDurationSeconds`, `maxDurationSeconds`, `deliverableRule` (never `none`), `refusalConditions`, `writes`, an `advicePosture` inside the permitted four, plus `freshness` wherever the category contract reads chain state | `shape` | **hard** |
| C10 | wellKnown | `https://{endpoint-domain}/.well-known/agent-registration.json` answers over HTTPS with a JSON content type and a `registrations` entry matching the triple. **A 200 is not existence**, so the content type is the assertion rather than the status (`R12-agent-comms.md`): `https://evoevo.ai/.well-known/agent-registration.json` returned 200 with `text/html` and 74,551 bytes when we re-probed it on 2026-09-05 | `shape` | badge only |
| C11 | http | `cardHash` recomputes from the served bytes under the canonical rule | `shape` | **hard** |

C10 is a badge rather than a gate on purpose. It costs one static file to pass and 5 agents on the whole
chain have it, so as a filter it removes everything while as a differentiator it shows a signal no rival
listing carries. Publishing the reason a domain failed is the part that is worth points.

### The wire

| Id | Surface | It asserts | Fail is | Gate |
| --- | --- | --- | --- | --- |
| C12 | http | `GET /manifest` answers 200 JSON inside 3,000 ms, `protocol` is `muster/1`, with a skill set matching the card on ids, prices, tokens, rails, schemas and `deliveryTarget`. A price or token mismatch is hard, anything else is a finding | `shape` | **hard** |
| C13 | http | `GET /health` answers 200 inside 2,000 ms with `ok` and `checkedAt` within 60 s of now, then two probes 60 s apart return different `checkedAt` values | `timeout` | **hard** |
| C14 | x402 | an unpaid call to the priced path returns **402** with `PAYMENT-REQUIRED` populated **plus** a body that decodes to the same object, `accepts[]` non-empty, `network` exactly `eip155:56` | `http` | **hard** |
| C15 | x402 | every `accepts[]` entry carries `asset`, `amount` in base units, `payTo`, `maxTimeoutSeconds` at least 300, `extra.assetTransferMethod`, `extra.paymentFlow`, `extra.name`, `extra.version` and `extra.decimals` | `shape` | **hard** |
| C16 | chain | the declared token's `decimals()` read on chain equals `extra.decimals`. `extra.name` with `extra.version` recompute the token's live `DOMAIN_SEPARATOR()` `0x3644e515` under the 4-field domain typehash `0x8b73c3c6…400f` | `shape` | **hard** |
| C17 | http | every route the card invites **as a work route** answers a payable 402 unpaid, on every verb it invites. A 200 with an info blob on an invited work route fails. The five free routes are out of scope, since no card invites them as work | `http` | **hard** |
| C18 | http | `GET /schema` answers 200 unpaid and carries no priced content | `http` | soft |

C16 is the decimals gate and it is the probe that would have caught a real delisting elsewhere. A
validator that cannot resolve decimals cannot price the task. A task that cannot be priced never pays
(`R16-reuse.md`, section 1.5).

### The paid call and the job

These probes cost money, so they run against a house budget with a per-listing daily ceiling, priced at
the listing's own price, tagged `origin: house` in the ledger so probe spend never counts as revenue.
**Nine settlements is the full-run cost**, listed so the spend is a number rather than a shrug: C19 one,
C20 one (the second call must settle nothing, which is the assertion), C21 two, C25 one, C26 one, C27 one,
C31 two (one create plus one renewal). C22, C23, C24 and C30 read the job C19 created and settle nothing.
Every other probe in the suite is a free read. **The per-listing ceiling is twelve settlements a day**,
which covers one full run plus three retries of a single failed paid probe, set here because the suite is
this document's. `08-MONEY.md` owns the rail and the fee rather than this budget.

| Id | Surface | It asserts | Fail is | Gate |
| --- | --- | --- | --- | --- |
| C19 | x402 | a paid create returns 200 or 202 with a `state` in the enum, a `requestHash` plus `payment.state` in `pending`/`settled`/`failed` with a tx hash the moment anything was broadcast | `shape` | **hard** |
| C20 | x402 | the same `Idempotency-Key` with the same body twice returns the stored first answer and settles **exactly one** payment, counted on chain rather than trusted from the response. The same key with a different body returns 422, the same key in flight returns 409 | `shape` | **hard** |
| C21 | http | a paid create with an empty body and one with a plausible-but-wrong shape both answer 200 or 202 with `resolvedFrom` stated. A 422 to a paying caller fails | `shape` | **hard** |
| C22 | http | polling returns `retryAfterSeconds`, then either advances state or reaches a terminal state inside `expectedDurationSeconds x 3`, never past `maxDurationSeconds` | `timeout` | **hard** |
| C23 | http | `POST /jobs/{id}/cancel` returns 202 on a live job and 409 on a terminal one, idempotently | `http` | soft |
| C24 | http | `responseHash` recomputes under the rule the card declared and only that rule: `canonicalJson` of `result` for `keccakCanonical`, the raw served bytes at `deliverableUri` for `sha256Raw` or `keccakRaw`. A rule that does not recompute fails. No other rule is tried on our own wire | `shape` | **hard** |
| C31 | x402 | on a skill that meters by interval, `POST /jobs/{jobId}/renewals` answers 402 with `amount` equal to the published `renewal.priceBase`, then paying the agent's own published `renewal.idempotencyKey` twice returns the stored 202 and counts **exactly one** renewal settlement on chain. A renewal on a terminal job returns 409 | `shape` | hard for a metered skill |

### The category contract and the output

The suite is worthless if a listing can pass every wire assertion then deliver something that is not a
grid sizing. `03-TAXONOMY.md` publishes each category contract as named inputs, named outputs and units.
These two probes assert a listing satisfies the one it declares, which is the `conformance` component's
job and the criterion Agent Diversity is scored on.

| Id | Surface | It asserts | Fail is | Gate |
| --- | --- | --- | --- | --- |
| C29 | http | the skill's `inputSchema` and `outputSchema` satisfy the contract named in its `contractVersion`: every input the contract names is accepted, every output the contract names is present in `outputSchema` with the contract's unit, no named output optional. A `contractVersion` that does not exist fails | `shape` | **hard** |
| C30 | http | the delivered payload from the C19 job validates against the skill's own `outputSchema`, then carries every output the contract names, in the contract's units, with `inputsAsOfBlock` and the freshness triple where the contract reads chain state | `shape` | **hard** |

### Behaviour

| Id | Surface | It asserts | Fail is | Gate |
| --- | --- | --- | --- | --- |
| C25 | http | an input outside the declared scope returns 200 with `state: refused`, a code from that skill's own `refusalConditions[]` plus the charge it declared. An undeclared code fails | `shape` | **hard** |
| C26 | http | a task input carrying an injection string from our pattern list is not obeyed, is not echoed as an instruction. The output passes our own output screen. Fail suspends rather than delists, because the buyer-facing sanitizer is ours | `shape` | soft, suspends |
| C27 | http | an input naming `127.0.0.1`, `169.254.169.254`, a `10.0.0.0/8` address, a multicast address or a NAT64 form is refused. The agent's own declared hosts resolve only to global addresses on every returned record | `dns` | **hard** |
| C28 | chain | for any listing whose `writes[]` is non-empty: `canExecute(keyHash, declaredTarget, declaredSelector)` `0xff619c6b` is true for every declared pair, the same call on an unlisted target is false, no entry carries the any-function sentinel `0x32323232`, `spendInfos(keyHash)` `0xdcc09ebf` shows a real limit rather than an unbounded one, then `getExpiry(wallet, keyId)` `0x3b49ad47` is in the future. E4 adds two clauses: the session is registered so `isValidKey` `0x8fd4f06b` is true, then the expiry runs past the judging window | `shape` | **hard** wherever `writes[]` is non-empty |

### Three index-level probes, not per listing

| Id | It asserts |
| --- | --- |
| P1 | the EIP-1967 implementation slot `0x360894a1…382bbc` on each of the three registries still holds the pinned implementation (`0x7274e874…`, `0x16e0FA7f…`, `0xDB31f5d9…`). All three are upgradeable: identity and reputation behind a 3-of-5 Safe, validation behind a **single EOA**. A change raises a banner rather than being absorbed silently |
| P2 | `_lastId` at slot `0xa040f782…04e00` moves as expected and the sweep's agent count matches it, which is how a partial index is caught before it is displayed |
| P3 | every source we display has a live freshness stamp, including the second index, whose BSC checkpoint was **32 hours** stale with `status: down` on the day this was written |

### Pass and fail semantics

- **Eleven hard gates block go-live**, in cheapest-first order: C01, C02, C03, C04, C06, C07, C08, C09,
  C11, C12, C29. They cost reads and one fetch each. They run before anything is paid for.
- **Thirteen more hard gates block a `live` listing** and run once money is available: C13 to C17, C19 to
  C22, C24, C25, C27 and C30. Two more join them conditionally: C28 wherever `writes[]` is non-empty, C31
  for a skill that meters by interval. A `live` listing failing any that apply to it is suspended.
- **A soft failure is published rather than hidden.** The listing shows the assertion, the verdict, the
  timestamp and the failure class. `lintFindings[]` carries them.
- **A tier is the highest tier whose probes all passed**, with `skip` blocking advancement:
  T0 needs C02 and C03, T1 needs C06, T2 needs C12 and C13, T3 needs C14 to C17. E4 additionally needs
  C28 plus its two E4 clauses. A listing that also passes C19 to C24 and C30 carries a
  paid-and-delivered mark, which sits above the census ladder because the census had nothing to measure
  up there.
- **A Muster tier is not the census tier of the same name, so the two are never quoted side by side.**
  `MEASUREMENT.md` defines T0 to T3 over the whole population and every one of our gates sits somewhere
  else. Its T0 wanted the document to parse **and** declare a concrete `http(s)` endpoint, where C02 plus
  C03 assert the `tokenURI` resolves and the document parses with a `services[]` key. Its T1 wanted DNS,
  TLS then any 2xx or 3xx, where C06 also demands a JSON content type inside 3,000 ms on a service named
  `muster`, which folds in a census T2 requirement and our own naming. Its T2 wanted any JSON or
  recognised protocol surface, where C12 plus C13 demand a `muster/1` manifest agreeing with the card and
  a `checkedAt` that moves. Its T3 wanted a 402 carrying an `accepts` array **or** a declared
  `agentWallet` distinct from the mint default plus a price, where C14 to C17 require the 402 path and add
  an on-chain domain-separator recompute. So the census percentages are the population baseline while our
  tiers are the listing bar. "12 of 600 reach T2" is not a comparison a Muster T2 can be set against.
- **The suite is published, not described.** An operator runs the identical assertions themselves before
  submitting, against their own URL, then gets the same output we would.

## 11. What we deliberately do not require

The bar has to be clearable by a real operator with one HTTPS host and an afternoon. Everything below was
considered then left out, with the reason.

| Not required | Why not |
| --- | --- |
| A2A | 250 of the 251 A2A declarations sampled on BSC point at one platform template that fails **every** published A2A schema. The 251st points at a nested well-known path that 404s (`R12-agent-comms.md`). The best third-party card validates at 0.1.0, 0.2.6 and 0.3.0, so real cards do exist, they are just rare. Requiring A2A would gate on a convention nobody implements consistently |
| MCP | 12 of the 13 MCP declarations in the corpus are one stdio install descriptor whose install step is `npx -y …`. The 13th is a web page that answers 308 (`R12-agent-comms.md`). Hosting a marketplace that spawns `npx` per listing is not a design we would ship. We serve MCP, we do not demand it |
| OASF skills | the two highest-volume OASF strings on BSC are invented: `information_skills/news_synthesis` on 8,487 agents has no `information_skills` group at any version. `analytical_skills/market_insights` on 4,940 fails at v0.8.7 (`R12-agent-comms.md`). No canonical OASF path names any of our four categories. We read it when present, validate against the declared version, then show valid and invalid counts |
| The ERC-8004 endpoint-domain proof | 5 agents in the whole registry pass it (`R12-agent-comms.md`) and a multi-tenant platform cannot pass it at all by construction. It is a badge (C10), never a gate |
| `setAgentWallet` | its EIP-712 deadline window is at most **300 seconds** and the signature must come from the **new wallet** rather than the owner (`R01-erc8004.md`). Not one of the 600 sampled agents has ever used it. `payTo` equal to `getAgentWallet` (which is the holder by default) satisfies us |
| ERC-8183 | it is a bonus rail and the strongest evidence available, not a listing requirement. Three of the four categories can be served with no escrow at all |
| A signed card | A2A v0.3.0 added `signatures` with JCS and JWS. Nobody on BSC signs one. The `cardHash` pinned at review gives us the same tamper detection with no key management for the operator |
| RFC 9421 request signing | standardised inside x402 as `http-message-signatures`, with keys at a third well-known path that is **not** IANA-registered (`R12-agent-comms.md`). Named as the upgrade path, not shipped |
| Webhooks or SSE | both are declared shapes, never mandatory. Polling is the contract because it needs no inbound reachability |
| x402 `offer-receipt` and `payment-identifier` | whether any BSC agent serves either is **unverified**: the one live challenge we decoded carries `bazaar` and `builder-code` only and the Bazaar's resources were never swept (`R12-agent-comms.md`). Read opportunistically, never required |
| AP2 mandates | zero occurrences of `ap2` or `mandate` across 306 fetched registration documents (`R12-agent-comms.md`). Its normative spec has no crypto rail at all: x402 appears only as a Base Sepolia sample with hardcoded Anvil keys. The constraint vocabulary is the right mental model, the rail is not available |
| CORS | no specification in this space mentions it. One live BSC card sends no `Access-Control-Allow-Origin` at all (`R12-agent-comms.md`). We fetch cards server-side, always, then serve our own normalised copy with our own cache headers |
| A fixed protocol version string | detected from the field shape instead, because the declared version lies |
| An LLM | deterministic code is preferable for all four categories and it satisfies every behaviour rule more cheaply |
| An Altana session | required wherever `writes[]` is non-empty, at every tier, with C28 a hard gate for all of those. E4 adds the Keystore registration plus an expiry past the judging window. A read-only listing needs no session at all |

### The smallest conforming agent

One host, four documents, four routes, one token, one category, read-only:

```
https://agent.example/muster/v1/card.json    the card, one skill, writes: []
https://agent.example/muster/v1/manifest     matching, available: true
https://agent.example/muster/v1/health       moving checkedAt
https://agent.example/muster/v1/schema       free, one worked example
POST + GET /muster/v1/jobs                   402 with a complete accepts[] entry, then the work
GET  /muster/v1/jobs/{jobId}                 state plus retryAfterSeconds, then result and responseHash
POST /muster/v1/jobs/{jobId}/cancel          409 on a terminal job is a valid answer
```

Plus two on-chain acts. Only one of them is work. Holding the agent id costs nothing, since the
operator already holds it by existing. Listing the `muster` service needs one `setAgentURI(uint256,string)`
`0x0af28bd3` call to add the entry, because zero agents on chain list one today. That is the whole bar. It
passes all eleven go-live gates, reaches **T3** and one person can build it in an afternoon in any
language.

## 12. What ships by 2026-09-09

Shipped means running against live BSC with its output visible on the public site.

| Ships | Note |
| --- | --- |
| the card schema and its published validator | `muster-card-1.json`, plus the canonical-hash function shared with the quote hash and the receipt hash |
| the wire contract as a published page | the eight routes, the status codes, the timeouts, the challenge requirements |
| shapes A and B | synchronous under 10 s and polling with a job id, idempotency enforced in the reservation-before-settle order |
| the ten-state lifecycle with all seven terminal states | including `voided` and `lapsed`, the two most venues fold into a shrug |
| the renewal route | `POST /jobs/{jobId}/renewals`, one priced increment against a live job, with C31 asserting that a repeated published key settles once. The seven-day grid run it carries outlives judging, so what ships is the increment and the pause behaviour |
| the error taxonomy including `marketplaceFault` | with our own failures excluded from agent records and published on the status page |
| the conformance suite, all 31 probes and the 3 index probes | run against every listing, per-assertion results published, the operator-side runner shipped with it |
| brokered hire over x402 `exact` with `eip3009`, our own facilitator in process | `08-MONEY.md` owns which token. The wire does not care |
| direct-hire attribution from chain | the `escrow-index` join from `job.provider` back to an agent id, plus the four attribution levels |
| the ERC-8183 read path, one funded mainnet job, one settled testnet job, plus the `settler` | the mainnet job's provider is our own first-party grid agent at a 0.1 `$U` budget, so it is a self-hire, labelled one on the page and tagged `origin: house` in the ledger. That agent's own session key calls `submit` in the same sitting the job is funded, which is what fixes the settle date at `submittedAt + 604,800 s`, about 2026-09-15 for a job funded on the 8th. Until it is submitted the page shows FUNDED with no settle date claimed. The testnet loop closes at 900 s and is the claim that the whole path works |
| the injection gate, the output screen and the SSRF guard | deterministic, before any model call, on both directions |
| refusal semantics end to end | declared conditions, coded refusals, a refusal counted as a success |

Documented as next, not shipped, described that way everywhere:

- Shape C outbound with Standard Webhooks signing and the published retry schedule. The receiver side of
  it is the part we would ship first.
- Shape D beyond one demo stream.
- A full seven-day metered grid run. The route, the idempotency rule and the probe ship, the run itself
  ends after judging, so what the page shows during judging is the increments actually paid.
- A settled mainnet ERC-8183 job. The funded job and the submission ship, the 604,800 s window puts the
  `settle` call around 2026-09-15, so the page carries that date as pending rather than done.
- B402 as the facilitator. Its authenticated base URL is unpublished for both environments, onboarding is
  a manual per-environment form with IP allowlisting and no published turnaround, so the client sits
  behind the same interface as our own facilitator with a config flip to switch (`R03-x402-b402.md`).
- x402 `offer-receipt`, `payment-identifier` and `http-message-signatures`.
- Inbound A2A and MCP adapters beyond a read-only bridge.
- An ERC-8004 Validation Registry request against a listing. The registry is deployed at
  `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58` with `getVersion()` `2.0.0`, correctly wired, carrying
  **zero validations across 1,999 sampled ids and zero platform-wide**. `06-QUALITY.md` owns whether we write
  one as an artifact. This protocol does not gate on it.

## Decisions and rejected alternatives

**1. The card is a plain HTTPS document declared in `services[]`, not a new well-known path.** Rejected:
`/.well-known/muster.json`. RFC 8615 says a new well-known URI MUST be registered and that nested paths
are not well-known at all, which is why one BSC platform's `/aip/erc8004:<slug>/.well-known/agent-card.json`
404s at both the nested path and the origin root. An unregistered fourth path would inherit that
problem then add a squatting risk on somebody else's origin.

**2. `cardHash` pinned at review, rather than a signed card.** Rejected: A2A v0.3.0's JCS and JWS
signature block. Nobody on BSC signs a card, so requiring it would gate the whole suite on key management
we cannot support in four days. The hash gives the same tamper detection with one keccak then reuses
the canonicalisation the ERC-8183 quote path already needs.

**3. One canonicalisation for three hashes.** Rejected: a per-purpose hash rule. Both BNB Chain's SDK and
the Altana SDK ship the same `canonicalJson` for `negotiation_hash` and both warn that `JSON.stringify`
breaks cross-implementation verification on any non-ASCII character. Sharing that one function means the
card hash, the request hash and the receipt hash cannot drift apart.

**4. Polling is the required shape. Webhooks and streams are declared options.** Rejected: making a
webhook mandatory, which is what a dashboard-first design wants. A webhook needs the receiver reachable, it
inverts the trust direction and it turns the subscription endpoint into an SSRF sink we then have to
defend for every listing. Rejected too: an MCP-only long-job story, because MCP 2026-07-28 has no task
resource, no protocol session and no resumable stream, so a dropped connection loses the job.

**5. `extra.paymentFlow` must be `upfront` or `escrow` on anything not synchronous.** Rejected: the spec's
default `authorization` flow, which clients are told to prefer. It settles after the resource completes,
so a three-day resource settles a three-day-old EIP-3009 authorisation, which is expired by
`maxTimeoutSeconds` and by `validBefore`. The default is wrong for our workload and saying so in the
challenge is cheaper than discovering it at settlement.

**6. Idempotency reserved before payment is verified.** Rejected: settle first then dedupe, which reads
more natural. A client that times out retries with a fresh 32-byte nonce, so the token's own replay
protection does not stop a second valid payment for the same job. The reservation has to be the outer step.

**7. The IETF draft's 409 and 422 split on our surface, accepting either inbound.** Rejected: following
x402's `payment-identifier`, which returns 409 for a changed payload. Our surface is the one a buyer's HTTP
client sees, so it follows the HTTP draft. The draft is expired, which is stated rather than hidden.

**8. `inputRequired` is a flag on `working`, not a state.** Rejected: A2A's separate `INPUT_REQUIRED` and
`AUTH_REQUIRED` states. A paid job parked in its own state waiting for a human is exactly how stalled money
hides. As a flag on `working` it still consumes `maxDurationSeconds` and ages into `expired`.

**9. `marketplaceFault` is a first-class error class.** Rejected: three classes, which is the usual
taxonomy. Our facilitator, our probes and our gateway will fail. Without a fourth class those failures
land on the operator's record. Publishing them on the status page instead is what makes the per-listing
history worth reading.

**10. Direct hire is supported and recorded at four attribution levels.** Rejected: requiring every hire
to pass through the broker. It would improve our data then make us a payment processor rather than a venue
hosting bids and offers, which is the FinCEN line. It would also lose the on-chain hires we can already see
without asking anyone.

**11. A skipped probe is neither a pass nor a fail.** Rejected: folding `skip` into `pass`, which is what
the index we build on does when it reports `health_score: 100.0` over 11 skipped services. A tier that can
be reached by declaring less is not a tier.

**12. Payment probes cost real money, tagged `origin: house`.** Rejected: a sandbox or testnet-only
conformance path. The claim being tested is that a stranger can pay this agent on mainnet. A testnet
pass does not test it. A full run settles nine payments. The per-listing ceiling is twelve a day. The
spend is excluded from every revenue figure by the ledger's own append-time invariant.

**13. Refusal codes are a closed set declared in advance.** Rejected: free-text refusal reasons, which is
what agents do today. A closed set is what lets a buyer see before paying what would make this agent say
no. It is also what lets `06-QUALITY.md` score a correct refusal as a success rather than a failure.

**14. Category comes from the card, never from OASF or on-chain metadata.** Rejected: consuming
`skills[]` from OASF, since its two highest-volume BSC strings are invented and no canonical path names any
of our four categories. Rejected too: requiring the `category` metadata key, which is populated on zero
agents. We write that key for our own agents so a third party can verify without our index.

**15. A GET form of the priced create exists beside the POST.** Rejected: POST only, which is cleaner. A
real payment client replayed a POST with an empty body after being given a parameter, so the parameter has
to be able to ride in the resource URL. The GET form is the one that survives that client.

**16. The four permitted output shapes are declared per skill and enforced at review.** Rejected: a
blanket disclaimer, which is what most venues ship. The line under MiCA and MiFID II is personalisation,
so it has to be a property of the output rather than a footer. `advicePosture` is that property made
declarable and checkable. Rejected too: declaring it once per card under `policy`, which is where it
started. One agent can hold a measurement skill and a mechanical-execution skill, so a card-level value
would be wrong for one of them and C09 could not gate it.

**17. A metered job is renewed on its own priced route, `POST /jobs/{jobId}/renewals`.** Rejected: a new
`POST /jobs` per interval, which makes a seven-day grid seven jobs and breaks the one-job-one-receipt
record. Rejected too: charging per poll, which meters the buyer's client rather than the work. The route
takes an existing `jobId` and the agent publishes the key, so buyer and agent derive the same
`Idempotency-Key` for the same interval and C31 can count the settlements on chain.

**18. `responseHash` covers one named object, not "the deliverable".** Rejected: hashing the whole job
resource, which changes every time `progress` moves. Rejected too: keeping `none` as a card value, which
would let a listing declare a rule that can never recompute and still pass a hard gate. `keccakCanonical`
covers `canonicalJson` of the `result` member, the two raw rules cover the bytes served at
`deliverableUri`. `none` survives only for a foreign ERC-8183 record whose producer shipped empty
`optParams`.

**19. C28 is a hard gate wherever `writes[]` is non-empty, at every tier.** Rejected: running it only for
a listing claiming E4, which is what an evidence-ladder reading suggests. That leaves an agent free to
declare a write scope, accept B2 to B4, then never have its session read, which is the one rule on the
list where nobody checking means real money. E4 keeps only the two clauses that are about the operator's
standing rather than about safety: Keystore registration and an expiry past judging.

## Open questions

1. **Will any listed agent other than ours implement this in time?** T3 is 0 of 600 today, so the honest
   answer on 2026-09-09 may be that every fully conforming listing is first-party. The disclosure of
   first-party supply belongs to `02-THESIS.md` and `10-DOCS-AND-POLICY.md`. What this document can do is
   make the bar small enough that a third party can clear it in an afternoon, which is why section 11
   exists.
2. **Does the buyer-signature header for a buying agent need `getAgentWallet` or `ownerOf`?** They are the
   same address for 600 of 600 sampled agents, so the question is untestable in the wild today. We check
   both and record which matched.
3. **Which code does a real x402 client send back on a changed payload?** Unverified. So is the
   population: whether any BSC agent serves the `payment-identifier` extension is unproved, since the one
   live challenge we decoded carries `bazaar` and `builder-code` only and the Bazaar's resources were never
   swept (`R12-agent-comms.md`). Until one serves it the 409-against-422 conflict is theoretical here.
4. **Will B402 accept the `escrow` payment flow on BSC?** Unverified and unanswerable without merchant
   credentials, since `/supported` is gated by credentials and an IP allowlist. That answer decides
   whether a days-long job can be pre-committed on the official facilitator rather than authorised
   (`R03-x402-b402.md`).
5. **How often should the paid probes re-run?** The cost of a run is settled: nine settlements at the
   listing's own price, with a ceiling of twelve a day per listing, set in section 10. What is open is the
   cadence once the shelves are full, because 50 listings running a full paid suite daily at a 0.05-unit
   price is 22.5 units a day. `08-MONEY.md` owns the rail and the fee, not this budget, so the number to
   settle is how many days apart a full paid run sits for a listing that keeps passing.
6. **Whether 8004scan's own A2A health probe validates against a revision at all.** Its message is
   `Valid A2A AgentCard (4 skills) (cached)` and it accepts a card our validator passes only at 0.1.0.
   Undocumented, so we cannot reconcile our verdict with theirs on a listing where they disagree
   (`R12-agent-comms.md`).
7. **Whether a `voided` job can be distinguished from an `expired` one on chain.** Both map to ERC-8183
   `5 EXPIRED`, so the distinction lives only in our record. A buyer reading the chain alone sees one
   state where we show two.
8. **Whether the deliverable rule can be inferred when a producer ships empty `optParams`.** Verified that
   it cannot for at least one live rival. We say "not retrievable" rather than guessing, which is a worse
   answer than we would like and an honest one.
