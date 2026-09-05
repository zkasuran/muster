# 12-BINANCE: Binance's own products, what we use and what we refuse

Muster is the BNB Agent Studio marketplace. This document covers the surfaces owned by Binance the
company rather than by BNB Chain: the B402 payment facilitator, the Binance Account Bound Token, the
Binance Web3 Wallet, Binance market data, every listing path Binance publishes and the products we
decline on purpose. `11-BNB-STACK.md` owns the chain surfaces. `08-MONEY.md` owns the rail decision
and the exact bytes a buyer signs. `05-ONBOARDING.md` owns the evidence ladder E0 to E4 and the exact
BABT check. `09-DISPUTES.md` owns the screening design. `13-PARTNERS.md` owns the partner tracks.

Everything below is either traceable to a named research file or to a command run on 2026-09-05 and
printed here. Where a fact is unverified the sentence says so.

## 1. What Binance shipped and the hole in it

`R17-binance-agent-os.md` mapped the real product set. Binance Agent OS is a connectivity layer, not
a venue: there is no agent registry, no agent directory and no listing flow anywhere in it, ERC-8004
is never mentioned and the only catalogue is Skill Hub, which lists skills rather than agents.

| Binance surface | What it is | What Muster does with it |
| --- | --- | --- |
| B402, also branded Binance x402 | the on-chain payment facilitator: verifies an EIP-712 authorisation off chain, submits the transfer, sponsors the gas | second implementation of our `facilitator` interface, gated by credentials we do not hold |
| B402 Bazaar | the public index of B402-registered paid endpoints | read as a supply source and as proof a payout address has settled |
| BABT | the account-bound token issued after a Binance identity check | one of three reads behind evidence tier E3 |
| Binance Web3 Wallet | the wallet a BNB Chain user already holds | one of two named EIP-1193 connectors on the hire step, never the default, section 4.3 |
| Binance market data | keyless public price, kline and ticker endpoints | not shipped, section 5 says why |
| Binance MCP server | scoped access to a Binance account for trading | never called by Muster, section 7 |
| Binance Agentic Wallet | MPC custody under a Binance account | never a Muster wallet, section 7 |
| Skill Hub | 19 first-party skills in a public repo | a distribution path we file into after the deadline, section 6 |

The hole is the point. Binance's own Bazaar page names exactly two discovery paths: the agent queries
`/bazaar/search` over REST or it calls the `search_resources` tool on Bazaar's hosted MCP endpoint
(`raw/binance-b402-docs-2026-09-05.txt`, `b402-bazaar`). It names no browse surface anywhere. The
absence cannot be checked from the other side either, because `binance.com/en/bazaar`, `/en/b402` and
`/binancex402` each answered **HTTP 202 with zero bytes** to a browser user agent today, which is how
binance.com HTML behaves for a plain fetcher (`R03-x402-b402.md`). So the missing shopfront is
documented rather than observed. It is still the gap the main track asks to be filled.

The second finding in `R17-binance-agent-os.md` is the one the build turns on. Bazaar's entries all
settled a real payment, so listing there is evidence of payability, while ERC-8004 on BSC carries
identity and almost no payability. The join key is the payout address: `getAgentWallet(agentId)` on the
Identity Registry against `accepts[].payTo` in Bazaar, with `GET /bazaar/merchant?payTo=` as the reverse
lookup. Neither index produces that row alone.

The match rides an existing field rather than a new one. A hit appends `bazaar` to `sourceSet[]` on
the agent record, with the assertion behind it stored beside it: the matched `payTo`, the Bazaar
`resource` URL, its `lastUpdated`, the scheme plus asset it prices in and the block the
`getAgentWallet` read was pinned to. Nothing else is copied. It renders as one evidence source on the
listing page, beside the reachability tier rather than inside the E0 to E4 ladder, which
`05-ONBOARDING.md` owns and which has no Bazaar rung. `03-TAXONOMY.md` owns where on the page it
sits.

I re-read Bazaar today rather than trusting the earlier pull. `GET
https://www.binance.com/bapi/ramp/v1/public/ramp/b402/bazaar/resources?limit=100&offset=0` returned
HTTP 200 with `data.pagination.total` **979**, unchanged from `R17-binance-agent-os.md`. Across the
100 items on page one there are 110 `accepts[]` entries: **98 price in USD1**, 5 in `$U`, 4 in USDT, 3
in Binance-Peg USDC. 100 of the 110 declare the `eip3009` transfer method against 10 on
`permit2-exact`. Four distinct `payTo` addresses hold that whole page. `quality` is **absent from all
100 rows** rather than present holding null: `[.data.items[]|has("quality")]` is false on 100 of 100.
So the usage counts the documentation describes are still not delivered and no design may depend on
them.

The ceiling is stated on the page rather than hidden. Recomputed here from the saved full pull
(`raw/b402-bazaar-resources-full-2026-09-05.json`): 979 resources carrying 989 `accepts` entries under
**8 distinct payout addresses, the largest holding 941 of the 979 resources, 96%**, which is 95% of
accepts entries. Page one today agrees in shape at 4 addresses per 100 rows.

**What the join yields, counted rather than assumed.** `balanceOf` on the Identity Registry
`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` returns 0 for seven of those eight addresses and 1 for
`0x515e7bce44baa5f6e42d16d4b5f27768e7f2f8cc`, which holds 15 of the 989 entries. Read at block
**120,161,525**, 2026-09-05T18:50:33Z, on `https://bsc-rpc.publicnode.com`. Ownership is the right
proxy for the join key because `MEASUREMENT.md` found `getAgentWallet` equal to `ownerOf` on 600 of
600 with `setAgentWallet` unused across that sample. So the join decorates **about one agent today**.
It is a rare badge with a stated ceiling rather than a supply source, which is why the four shelves are
filled from the registry and this row is a bonus on top. Anyone claiming it fills a marketplace has not
counted it. That is the same concentration disease `MEASUREMENT.md` found on the registry side, where
one duplicated name covers 215 of 600 sampled agents, which is why `03-TAXONOMY.md` collapses by
operator instead of ranking by row count.

**So the no-match state is the normal state. It is specified rather than left to the render.** With no
Bazaar hit the listing's evidence block prints the sources it does have (the registry read, the
reachability tier, settled jobs through us) and prints no Bazaar line at all. No greyed slot, no "not
found" and no absence rendered as a negative, because a missing third-party row says nothing about the
agent. On a shelf the Bazaar-backed filter is off by default and carries its own live count in the
control, so a buyer who turns it on already knows what it will leave. A one-row result renders as a
normal result with its count stated plus a line offering the wider set, never as an empty state.
`03-TAXONOMY.md` owns the layout of all three.

## 2. B402 as the payment facilitator

### 2.1 What it is, in its own words

B402 is Binance Pay's x402 facilitator, BNB Chain only, on `eip155:56` and `eip155:97` and no other
network (`R03-x402-b402.md`). It verifies the buyer's EIP-712 signature off chain, submits one
transaction and pays the gas for it. The buyer holds no BNB and sends no transaction. The seller
signs nothing on chain.

The disclaimer at the foot of its introduction page is worth quoting because it is the same
architectural line `R15-compliance.md` draws from FinCEN. There is no separate disclaimer page: the
text sits in a `<small>` block at the bottom of `introduction`, added by the changelog entry dated
2026-04-22 ("updated service description and added Disclaimer section"). It is at lines 255 to 312 of
`raw/binance-b402-docs-2026-09-05.txt`. The sentence below is line 272:

> B402 does not take possession, custody, or control of user funds or payment tokens as part of the
> standard flow described in this documentation.

The same block puts the compliance work on us, in terms that make our own screening layer necessary
rather than decorative. Each integrator, it says at line 287, remains solely responsible for
"implementing its own compliance, fraud prevention, transaction monitoring, screening, risk
management, and customer support processes as required". It also disclaims continuity at lines 296 and
298: the documentation "may be updated, suspended, or
withdrawn at any time" and B402 "does not guarantee transaction success, network availability,
confirmation times, compatibility, merchant outcomes, user solvency, or continued support for any
blockchain, token, standard, or integration". Those three sentences are Binance's own wording, quoted
with its own punctuation.

Read those three together and the posture follows. B402 is worth wiring and it is not worth depending
on.

### 2.2 What it gives us that our own facilitator does not

Four things, each with a price.

1. **Gas paid by Binance's signer.** Our own submitter costs about 0.0000052 BNB per settle at 0.05
   gwei (`SPINE.md`, from `R04-bsc-tokens.md`), which is trivial in money and not trivial in
   operations: it means a hot key of ours signs on every hire. Under B402 no funded key of ours signs
   on chain, though our RSA merchant key still signs every request. What disappears is the key holding
   BNB rather than every key.
2. **A payer screen inside the rail.** Its envelope carries `1160406 PAYER_BLACKLISTED` and `1160407
   SANCTIONED_ADDRESS`, from the error-code table at `basics/5.error-code` in
   `raw/binance-b402-docs-2026-09-05.txt`. That is a second opinion, never a replacement, for the
   reason in 2.6.
3. **A listing in Bazaar that rides on settlement.** Section 6.
4. **A surface a judge recognises.** The programme is a BNB Chain hackathon and the facilitator is
   Binance's own. That is worth something on presentation and nothing on function.

Against that: no fee is stated anywhere in its documentation and no fee address is named
(`R03-x402-b402.md`). Its amount limits exist as error codes without numbers, so a merchant learns
the single-transaction, merchant-daily and payer-daily ceilings by hitting them. A rail with
undisclosed limits cannot be the only rail on a listing that quotes a price.

### 2.3 The integration surface, endpoint by endpoint

Two surfaces with different access models, which is the fact most integrations miss.

| Surface | Paths | Auth | Access |
| --- | --- | --- | --- |
| Authenticated facilitator | `POST {BASE_URL}/papi/v2/b402/supported`, `/verify`, `/settle` | RSA-signed merchant request plus an IP allowlist | base URL issued with credentials, both environments |
| Public discovery, Bazaar | `GET /bazaar/resources`, `/bazaar/merchant?payTo=`, `/bazaar/search` | none | production base URL published and safe to hardcode |

The merchant authentication is not the payment signature and conflating the two is the classic error
(`R03-x402-b402.md`). The buyer signs EIP-712 secp256k1 over `TransferWithAuthorization` or
`PermitWitnessTransferFrom`, which moves money. The merchant signs RSA-SHA256 PKCS#1 v1.5 over the
exact bytes `jsonBody + timestampMillis` with a 1024-bit key, base64 in `X-Tesla-Signature` beside
`X-Tesla-ClientId`, `X-Tesla-SignAccessToken` and `X-Tesla-Timestamp`, which moves nothing and only
proves the request came from a registered merchant. A timestamp more than five minutes off is
rejected and the source IP must be on the allowlist. Serialise the body once and sign the same bytes
you send, because re-serialising with different key order produces a different signature.

Five more surface facts that shape our client, all from `R03-x402-b402.md`:

- `/supported` is **POST**, not the GET the specification names, because the gateway signs every
  request body.
- Rate limits are per merchant: 100 requests per second on verify, 20 on settle, then 429.
- The envelope is `{code, message, data}` and a payment failure still returns HTTP 200 with `code:
  "000000"`, the reason inside `data`. Never key success on the HTTP status.
- B402 requires the merchant to copy the whole `kinds[].extra` object from its cached `/supported`
  response into the 402 it serves the buyer, because buyers cannot call `/supported` themselves. That
  object carries `name`, `version`, `assetTransferMethod`, `signerAddress` and, for Permit2,
  `spenderAddress`. Omit any of it and the signature is rejected as `invalid_payload`.
- Its scheme naming differs from the specification. `eip3009` and `permit2-exact` both ride under
  `scheme: exact`, while `permit2-upto` moves the scheme to `upto` and requires
  `witness.facilitator` to equal `extra.signerAddress`. The `upto` scheme also takes `settleAmount`
  on the settle body, which is the right primitive for metered work whose cost is unknown before it
  runs.

`08-MONEY.md` owns the bytes and the 402 we emit. The rule this document adds is that every one of
those five values is read from a live `/supported` response at boot and cached, never hardcoded,
because `signerAddress` and `spenderAddress` are **unverified** in every published example (each is a
placeholder like `0x1111...1111`) and the Permit2 proxies can be redeployed.

One more part of the surface belongs here because it narrows what B402 can price and contradicts
what a reader would guess from the token's capability alone. B402's own supported-methods page, in the
capture at `raw/binance-b402-docs-2026-09-05.txt`, publishes three methods and their token support:

| B402 `assetTransferMethod` | Token support as published | Buyer setup |
| --- | --- | --- |
| `eip3009` | **U and USD1 only** | none, the buyer signs and sends nothing |
| `permit2-exact` | any ERC-20 | one `approve(Permit2, max)` per token, buyer pays that gas |
| `permit2-upto` | any ERC-20 | same approval, then a ceiling the signature sets |

Its mainnet token table lists U `0xcE24439F2D9C6a2289F741120FE202248B666666`, USD1
`0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d`, Binance-Peg USDC
`0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` and USDT `0x55d398326f99059fF775485246999027B3197955`,
every one at 18 decimals, with the instruction to verify `decimals()` on chain as the source of truth.
**FDUSD appears in no B402 token table**, which is the correction `R17-binance-agent-os.md` made to
`VERIFIED-payment-rail.md`. FDUSD does implement EIP-3009, verified on chain. What the page actually
withholds from it is narrower than a flat refusal. B402's `eip3009` method will not settle FDUSD,
because that row reads "U and USD1 only", while `permit2-exact` and `permit2-upto` both read "Any
ERC-20" in the same table. Whether the mainnet token list is a closed set for the Permit2 methods is
**unverified** from here, since `/supported` is credential-gated and both authenticated base URLs read
"Please contact us for access". So a B402 hire priced in FDUSD is unverified until a live `/supported`
response says otherwise. Binance's own changelog records fixing this class of error in the other
direction, an entry dated 2026-05-11 reading "Fixed factual bug in `Supported payment methods`
(`eip3009` supports U and USD1, not USDC)". So the token a listing prices in is a rail decision rather
than a token-capability decision. `08-MONEY.md` owns it.

### 2.4 The access gate, settled, including a correction

This is the load-bearing paragraph of the section, so it was re-read from the primary page today
rather than carried forward: `basics/4.base-urls` in `raw/binance-b402-docs-2026-09-05.txt`. Binance's
own environments table lists four rows and three of them read `Please contact us for access`:

| Surface | Environment | Base URL as published today |
| --- | --- | --- |
| `/papi/v2/b402/*` | Sandbox, BSC testnet 97 | Please contact us for access |
| `/papi/v2/b402/*` | Production, BSC mainnet 56 | Please contact us for access |
| Bazaar discovery | Sandbox, 97 | Please contact us for access |
| Bazaar discovery | Production, 56 | `https://www.binance.com/bapi/ramp/v1/public/ramp/b402` |

The page gives its own reason, that the base URL ships with the credentials so a sandbox credential
cannot be pointed at production. The application page adds that Sandbox and Production are separate
developer accounts, that `clientId`, `accessToken`, RSA key pairs and IP allowlists are not shared
between them and that an applicant supplies a business name, a contact email, an EVM address to
receive funds, an RSA public key, the source IPs to allowlist and an optional webhook URL, then
receives a `clientId`, an `accessToken` and a webhook verification public key. The application is a
form at `https://forms.gle/aUQvxUETfGMzyTky5`. **No review turnaround is published.**

**The six inputs, each with its source, so day one is a fill rather than a research pass.** Every one
of them is settled here or owned by a named document, so nobody has to stop and decide at the form.

| Form input | Where the value comes from | Settled |
| --- | --- | --- |
| Business name | the entity the submission is filed under | one string, no lookup |
| Contact email | the contact address the submission already publishes | same for both environments |
| EVM address to receive funds | the treasury address `08-MONEY.md` owns, which only ever receives Muster's own fee | ours, never an agent's `payTo`, since a buyer's payment must not reach an address we control |
| RSA public key | generated at filing time under `15-SYSTEM.md`'s secret handling, the private half living with the key holder and never in a repo or an environment variable | one key pair per environment, because sandbox and production share nothing |
| Source IPs to allowlist | the egress address of the deploy host, which is a stated dependency on `15-SYSTEM.md`'s choice of one always-on process per role on a machine we already run | the same host the judged URL answers from, which is the whole reason a late grant is a config flip |
| Webhook URL | **none** | left blank, which the form permits. The settle outcome is only knowable by polling (2.5), so a webhook would add a public receiver to defend for a signal we already have |

Two filings, so two of everything above except the name and the email.

**Correction to `R17-binance-agent-os.md`.** That file records mainnet as access-on-request and
testnet as open, then concludes that testnet is therefore the provable path. Testnet is not open in the
sense that matters: sandbox needs its own application, its own credentials and its own base URL and
that base URL is unpublished too. The reason for the correction is that R17 read the product pages
while the environments and application pages say something narrower. Nothing else in R17's B402
section changes.

So the decision, which is the same shape `08-MONEY.md` states from the other side. The in-process
`facilitator` implementation ships and is what every demonstrated hire runs on, because the reference
Python facilitator works on BSC unmodified. The B402 client is written to the same interface and
switched on by configuration. Both applications go in on the first build day so a grant during judging
is a config flip. **No path a judge walks depends on a credential arriving**. The submission never
claims a B402 integration that has not run.

**What the B402 client is tested against, stated exactly, because nothing can have been recorded.**
Both authenticated base URLs read "Please contact us for access", `/supported` needs merchant
credentials plus an allowlisted source IP and every `signerAddress` and `spenderAddress` in the
published examples is a placeholder. So the fixture is **synthesised from the documented example
bodies** in `raw/binance-b402-docs-2026-09-05.txt`, placeholder addresses included. Calling it a
recording would be wrong. What it asserts is the part worth asserting anyway, five documented
behaviours a client gets wrong by default:

- the `{code, message, data}` envelope, with HTTP 200 plus `code: "000000"` on a failed payment
- `transaction: ""` as the only terminal failure, a non-empty hash as keep-polling
- the whole `kinds[].extra` object copied verbatim into the 402 we serve
- the 100 per second verify and 20 per second settle ceilings, then a 429
- the `upto` scheme moving `settleAmount` onto the settle body

What stays unexercised until credentials land: the RSA request signature against a real gateway, the
five-minute timestamp window, the IP allowlist, the real `signerAddress` and `spenderAddress`, the
three amount ceilings behind `1160403` to `1160405` and whether a live `/supported` lists the same
tokens the documentation does.

Rejected: waiting for credentials and building the hire flow against B402 directly. It is a dependency
on a manual review with no published clock. Four days out, if it lands late, the flow has never been
exercised end to end.

### 2.5 Two contradictions in Binance's own documentation, plus the machine that closes the first

Both are live today and both change our client's behaviour.

**Is a failed settle final?** The payment-status page prints a status table saying `success=false` with
a transaction hash means "Transaction was broadcast but reverted on-chain. Final state". The settle
page says the opposite in bold: presence of `errorReason` "does not mean terminal failure",
`invalid_transaction_state` with a non-empty hash is "indistinguishable" between a confirmed revert and
a pending confirmation, only `transaction: ""` is "a guaranteed terminal failure", polling `/settle` is
idempotent, the cadence is about 3 to 5 seconds and the backend keeps reconciling a broadcast
transaction for up to about 30 minutes, so a payment can finalise after `maxTimeoutSeconds` elapses.
Both pages are in `raw/binance-b402-docs-2026-09-05.txt`, at `basics/7.payment-status` and
`open-apis-v2/3.settle-payment`. `R03-x402-b402.md` settled this by taking the newer settle page as
authoritative and both were re-read today to confirm the conflict is still there. Our client polls,
keys the outcome on whether `transaction` is empty and enforces our own idempotency on `(nonce,
network, payer)` on top of theirs. Treating the first `success: false` as terminal books paid work as
failed, which is the worst failure mode available on a rubric line about data quality.

**So the machine is closed here, because a poll with no ceiling is not a design.** The ambiguity is
Binance's and the decision that lives with it is ours, so the states are named in this document rather
than left to `08-MONEY.md`.

| Poll result | `payment.state` | Terminal |
| --- | --- | --- |
| `success: true`, held to the 15-block confirmation depth | `settled` | yes |
| `success: false` with `transaction: ""` | `failed` | yes |
| `success: false` with a non-empty hash | `settlement_pending` | no, keep polling |

The ceiling is **35 minutes**, five past the roughly 30 minute reconciliation window Binance documents.
It is never set earlier than the signed authorisation's own expiry (`validBefore` on the 3009 rail,
`deadline` on Permit2), so the clock cannot run out while the transfer could still succeed. At 3 to 5
seconds that is at most about 700 polls against a 20 per second ceiling, so the rate limit is not the
binding constraint.

At the ceiling we stop asking B402 and resolve it from the hash B402 already returned, on our own RPC,
which is why the hash is stored the moment it appears. A receipt with `status: 1` resolves to `settled`
and releases the deliverable. `status: 0` resolves to `failed`, the deliverable is withheld and the
buyer is re-quoted. No receipt at all means the transaction was never mined. It can no longer be mined
either, because the authorisation expired long before, so that resolves to `failed` too, with the
unspent nonce confirmed by `authorizationState(payer, nonce)` `0xe94a0102` on the 3009 rail or a clear
`nonceBitmap` bit on Permit2. The one branch those rules say cannot happen, a spent nonce with no
receipt, holds `settlement_pending`, publishes no receipt and pages an operator, because it means our
model of the rail is wrong and guessing either way books a lie.

While it is unresolved the buyer sees the broadcast hash with a live explorer link plus one line saying
the transfer is broadcast and unconfirmed. No receipt is published, since a receipt names a settled
transaction and a block (`SPINE.md`). `job.terminalState` stays unset, so nothing is booked either way
in the meantime. `08-MONEY.md` carries the same three polling rules and points here for the ceiling.

**Which header carries the 402?** Three different answers across the documentation: an
`X-PAYMENT-REQUIREMENTS` header in the quick start, a JSON body in the worked `/supported` example and
`PAYMENT-REQUIRED` in the x402 v2 transport specification (`R03-x402-b402.md`). `08-MONEY.md` resolves
it by emitting all of them, since an extra header costs nothing and B402 never reads the buyer-facing
402 anyway, only the merchant's own `/verify` body.

### 2.6 What we do not take from B402

- **Its `quality` block.** Documented as `l30DaysTotalCalls`, `l30DaysUniquePayers` and `lastCalledAt`,
  undelivered on every entry across all three read endpoints in `R17-binance-agent-os.md` and absent
  from all 100 rows re-read today, where the key is missing rather than present holding null.
  `06-QUALITY.md` computes the Muster score from settlements we broker, so the absence costs us nothing
  and it would have cost us a lot if a shelf had been built on it.
- **Its payer blacklist as our screen.** Its own documentation puts screening on the integrator.
  `R15-compliance.md` measured why a single source is not enough: of 91 distinct EVM-format SDN
  addresses the Chainalysis oracle flags 57 and of the 42 that are active on BSC it misses 20. Our
  four keyless checks run at quote and again at settlement regardless of which facilitator settles.
  When B402 returns `1160406` or `1160407` we record it as a second source and surface a plain reason,
  never a generic failure.
- **Its ranking.** Recent activity with a 30-day sink, buyer diversity weighted above raw settle count,
  a fail rate over 50% in 24 hours filtered out entirely and a floor of about one US cent per settle
  before activity counts. That is a validated anti-gaming shape and `06-QUALITY.md` reaches the same
  place independently. We do not import a rank we cannot recompute.

## 3. BABT, tied to the ladder in 05

`05-ONBOARDING.md` owns the check (`balanceOf(address)` on
`0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8`, selector `0x70a08231`, 1 or 0, never reverts), the badge
wording, the privacy posture and the ladder. This section is the Binance-side reasoning behind those
choices, plus what Binance permits us to claim.

**It is one of three reads behind E3, never a gate.** `R10-bab-attestation.md` screened 585 distinct
BSC ERC-8004 agent owners on chain: 6 hold a BABT, 6 hold a Galxe Passport, 3 hold both, 9 hold either,
576 hold neither. A BABT requirement on operators leaves about **six** listable operators out of the 585
owners behind a 600-agent sample, which scores zero on Agent Diversity and cannot fill four shelves.
Nine is the OR figure across BABT and Galxe Passport, so it belongs to the whole of E3 rather than to a
BABT gate. So E3 is an OR across BABT, Galxe Passport and the BNB Passport reader. E1, the bonded rung,
never depends on any of them.

**What Binance lets us say.** Its own introduction page carries a disclaimer that its role "is limited
to issuing (upon request) the BAB Token for users who have completed identity verification procedures
for their Binance accounts, which may vary depending on the user's country of residence". The same
paragraph adds that "Binance is not making any representation to third-party projects about the
holders of the BAB Tokens" (`R10-bab-attestation.md`). Two consequences that bind the product. The
check behind a BABT is not one uniform standard, so no tier label may imply a level. And Binance
declines to vouch for holders to us, so the badge states the fact of the token and nothing about the
person. `05-ONBOARDING.md` fixes the string as "Holds a Binance Account Bound Token" and bans "KYC
verified", "verified human" and every variant.

**It decays while you watch it, which is why nothing is cached as a flag.** Two reads settle that, both
pinned to one block so the pair is coherent:

```bash
export RPC=https://bsc-rpc.publicnode.com
# live holders
cast call 0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8 "totalSupply()(uint256)" \
  --block 120148575 --rpc-url $RPC
# 1166410                       hex 0x11cc4a
# cumulative mints ever, the Counters.Counter at slot 8, which has no getter
cast storage 0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8 8 --block 120148575 --rpc-url $RPC
# 0x0000...00142108             which is 1319176
# block 120,148,575, 2026-09-05T17:13:23Z
```

Set that pair beside `R10-bab-attestation.md`, which read 1,166,396 live and 1,319,158 minted at block
120,026,269 about fifteen hours earlier. Mints rose by 18 while live holders rose by 14, so **four
tokens were revoked or burned inside that window** and the difference of 152,766 is 11.58% of every
BABT ever issued. Minting and revocation are both live right now. A stored `verified: true` is a
claim that expires without notice, because `R10-bab-attestation.md` also verified that the issuer can
revoke without the holder's signature.

Two notes on method, because both bit this pass. The mint counter is a raw storage read with no getter,
so it is the one number here that depends on the verified source layout rather than on an ABI. And a
pinned read only works near the head: the same `eth_call` at block 120,144,112, about 4,500 blocks
back, returns `Archive requests require a personal token`, which is the wall
`R10-bab-attestation.md` hit at a million blocks. Pin to the current head, record the block, then do
not plan on re-deriving a number from a block that has aged out.

**So we read a bit and store nothing.** The tier read happens at request time with a 60 second
in-memory cache keyed by address. The answer is never written to an operator row. We never fetch the
token metadata at all: `balanceOf` answers the question. Binance states that the metadata's opaque
32-byte `id` is stable for one person across re-mints, which is **unverified** because testing it needs
a real Binance account plus 72 hours, so persisting it would risk rebuilding the graph they took the
trouble to break. What is verified is the behaviour they built for that purpose: a revoked token's
metadata 404s deliberately, so two wallets cannot be linked through the `id`. We also never use
`tokenId` as a key, because Binance says in as many words not to. `05-ONBOARDING.md` carries the full
six-rule posture.

**The third verdict, for when the read itself fails.** An attestation read answers holds, does not hold
or **unknown**, never a silent false. `aggregate3` runs with its sub-calls allowed to fail, so one bad
leg does not lose the other two. A leg that fails leaves that attestation unknown rather than absent,
which withholds the badge, shows the reason and names the failed source in the freshness stamp, the same
posture every other number on the page gets. This is a judging-week case rather than a theoretical one:
`Archive requests require a personal token` came back twice while this document was being written. The
silent alternative renders a real BABT holder as having none.

**The gate cannot be rehearsed on testnet.** Testnet BABT exists at
`0x984E6a7b9cb73cB7884c9ca9b1Ee625546F9D0E3` on chain 97 with 1,252 tokens, but minting there is by
request through a form, so a test token is not self-serve (`R10-bab-attestation.md`). The E3 read is
therefore exercised against mainnet with a known live holder as the fixture and a known non-holder as
the negative, which is a better test anyway because it runs against the contract a buyer's badge
actually reflects.

**The same credential is nearly free on the write path, which is where it earns its keep.**
`R10-bab-attestation.md` measured that the last 3,000 BSC feedbacks came from 31 addresses, that the top
10 wrote 65.3% of them and that none of the 12 heaviest authors holds a BABT or a Galxe Passport. So
an attestation gate costs 99% of supply on the seller side and almost nothing on the review side. That
asymmetry is the whole reason the ladder tiers operators and `06-QUALITY.md` binds full-weight feedback to
a settled job with a distinct payer.

## 4. Binance Web3 Wallet as the buyer path

`05-ONBOARDING.md` records this connector as unverified and says no claim about it appears in the
product until a real connection is observed. That stands. What follows narrows the unknown, because I
read the published packages today.

### 4.1 What is actually published

```bash
curl -s https://registry.npmjs.org/@binance%2fw3w-ethereum-provider | jq -r '."dist-tags".latest, .license'
```

| Package | Latest | Licence | What it is |
| --- | --- | --- | --- |
| `@binance/w3w-ethereum-provider` | 1.1.13 | ISC | the EIP-1193 provider, implements `IEthereumProvider` from `eip1193-provider` |
| `@binance/w3w-wagmi-connector-v2` | 1.2.11 | ISC | wagmi v2 connector, peer deps `viem` 2.x and `wagmi` 2.x, connector id `wallet.binance.com` |
| `@binance/w3w-wagmi-connector` | 1.2.3 | ISC | the wagmi v1 predecessor |
| `@binance/w3w-utils` | 1.1.8 | ISC | environment detection, signing-method list, deep link builder |
| `@binance/w3w-types` | 1.1.4 | Apache-2.0 | types |

Every one of those was last published 2026-01-05 or earlier, so the connector has not moved in eight
months. ISC and Apache-2.0 are both permissive and both get a row in `NOTICE`.

The injection path, read from `src/index.ts` of the provider package rather than inferred. `getProvider()`
resolves in three steps:

1. Inside the Binance app, `isInBinance()` tests `window.ethereum.isBinance === true` and the injected
   `window.ethereum` is returned as the provider.
2. With the browser extension, `isExtensionInstalled()` tests `window.binancew3w.isExtension === true`
   and the provider is at `window.binancew3w.ethereum`.
3. Otherwise it constructs its own provider, which opens Binance's own sign channel, emits a
   `uri_ready` event carrying a URI for a QR code and reports `isWalletConnect` as true. The deep link
   it builds is `bnc://app.binance.com/mp/app` with a fixed `appId`, our URL and the chain id base64
   encoded into `startPageQuery`, plus an `https://app.binance.com/en/download?_dp=` fallback for a
   device with no app installed.

The default chain in both the provider and the wagmi connector is **56**, so the wallet needs no
persuading about BSC.

**Who holds the key material.** Binance's own wallet SDK introduction says the wallet "is built on the
latest multi-party computation (MPC) cryptographic standard" and that with it "private keys remain
secure and confidential, as each party only has access to its own key fragment"
(`raw/binance-web3-connect-introduction-2026-09-05.txt`, from
`/en/docs/products/web3-connect/introduction`). It names neither the parties nor the threshold, so
**whether a buyer can sign without Binance is unverified**, as is whether Binance could sign without
the buyer. What would settle it is Binance publishing the scheme or a key-export path a user can
exercise, which is the same posture this section takes on the connection round trip.

That uncertainty is why the money path in section 7 is built around what the bytes bound rather than
around a custody claim. Every authorisation Muster asks this wallet to sign is single-use and bounded
by amount, nonce and expiry, so nothing Muster requests widens a buyer's exposure. The standing
exposure a Permit2 buyer already carries is a different matter, since `approve(Permit2, max)` is
unbounded by construction and theirs rather than ours, which is one more reason `08-MONEY.md` prefers
the 3009 rail where no standing allowance exists. Either way no key of the buyer's reaches us, no
approval of ours outlives a job and the blast-radius test at the end of section 7 holds however the
fragments turn out to be split. This is a different arrangement from Binance Agentic Wallet despite both
being described as MPC: Agentic Wallet is custody under a Binance account with limits enforced server
side and no on-chain permission record, so what 4.2 point 5 opposes is where authority is recorded
rather than how keys are held.

### 4.2 What it does not solve

Five things, each with the consequence for our build.

1. **It is not a payment rail.** It signs. The one-signature hire still needs a token that implements
   EIP-3009. `VERIFIED-payment-rail.md` proved USDT on BSC implements neither EIP-3009 nor
   EIP-2612, as do Binance-Peg USDC and BUSD. A Binance wallet holding only USDT is still on the
   Permit2 path with one approval transaction first. The wallet does not soften that trade-off and
   `08-MONEY.md` owns it.
2. **`wallet_addEthereumChain` is not supported.** The provider special-cases `eth_requestAccounts`,
   `eth_chainId`, `eth_accounts` and `wallet_switchEthereumChain` and routes anything in its
   `signingMethods` list to the sign channel. That list is a constant in `@binance/w3w-utils`
   (`src/constants.ts`) and holds fourteen methods: the four above plus `eth_signTransaction`,
   `eth_sendTransaction`, `eth_sign`, `personal_sign`, `eth_signTypedData` and its `_v1` to `_v4`
   variants, then `wallet_watchAsset`. `wallet_addEthereumChain` is not one of them, so the call falls
   through to the HTTP JSON-RPC client where it is not a node method. The 4902 fallback in
   `05-ONBOARDING.md` section 12.3 therefore cannot
   be the only route to chain 56. The rule: attempt the switch, treat an unknown-method or rejected
   add-chain as non-fatal when the provider already reports 56 and read the chain id back rather than
   assuming the switch resolved. Its `switchChain` races the request against a `chainChanged` event, so
   a wallet that emits neither leaves a pending promise, which is why the hire step must never block on
   it.
3. **It brings no RPC.** `getRpcUrl(chainId, rpc)` returns a URL only from an explicit
   `rpc: { 56: ... }` map or an Infura id, while the package's Infura network table covers chains 1, 3, 4,
   5 and 42 only, none of them BSC. Without our own RPC in the options every non-signing request throws
   "Cannot request JSON-RPC method ... without provided rpc url". So the connector inherits our RPC
   configuration rather than supplying one, which is the correct division and has to be wired
   deliberately.
4. **It carries no session, no allowlist, no spend cap and no expiry.** A wallet connection says an
   address is present. It says nothing about what an agent may do with money afterwards. That is E4's
   job through an Altana session read on every render (`05-ONBOARDING.md`) and no Binance surface
   substitutes for it.
5. **It is not Binance Agentic Wallet.** They look adjacent in a feature list and they are opposites
   where it matters: Agentic Wallet is MPC custody under a Binance account with limits enforced server
   side and no on-chain permission record (`R17-binance-agent-os.md`). Section 7 says why Muster does
   not adopt it and `13-PARTNERS.md` owns why it cannot satisfy the Altana track.

What is still **unverified**: whether a real connection from the Binance app to our origin completes.
There is no Binance app in this environment, so the connector's behaviour above is read from its source
and the round trip is not observed. The product ships it as one of the two named connectors in 4.3 and
claims nothing about it until a real connection is recorded in the packet.

**Correction to `05-ONBOARDING.md` section 12.3.** That section describes the connect step as three
things in order, ending with `wallet_addEthereumChain` on error 4902, with no exception named. Point 2
above shows the method is absent from this provider's signing-method list, so for Binance Web3 Wallet
the third step cannot succeed and the switch has to be treated as advisory with the chain id read back.
05 owns the connect sequence, so the fix belongs there rather than standing as a second live rule here.
The reason for the correction is that 05 was written from the general EIP-1193 case while this document
read the connector's own constants.

### 4.3 The connector roster at the hire step, settled

`15-SYSTEM.md` gives this document the answer to which wallets are named. `11-BNB-STACK.md` asks
whether this one is the right default against a generic EIP-1193 or WalletConnect v2 setup. Three rows.
The default is the first.

| Connector | In or out | Why |
| --- | --- | --- |
| Injected EIP-1193, discovered by EIP-6963 announcement with `window.ethereum` as the fallback | **in, the default** | the only path with no third-party service in it, no project id to register and multi-wallet discovery is what stops two extensions fighting over one global. A buyer who already holds a BSC wallet is one click from a hire |
| Binance Web3 Wallet, through `@binance/w3w-wagmi-connector-v2` | **in, named, never primary** | it is the wallet the programme's own users hold and its default chain is already 56. Not primary because its round trip is unverified here, its packages have not moved since 2026-01-05 and 4.2 lists four things it does not solve. Naming it costs one connector entry and claims nothing |
| WalletConnect v2 | **out for the ship** | in the in-app and extension branches the injected path already serves the same user. On a fresh laptop the Binance connector's own third branch already emits a QR through Binance's sign channel. Taking it would add a hosted relay, a project id and a grant row for a path covered twice over. `15-SYSTEM.md` rejected "WalletConnect only" for the same reason from the other side |

So the hire step lists two connectors, offers the injected one first and treats the Binance entry as an
equal peer rather than a promoted one. Rejected: making Binance Web3 Wallet the default, which is the
BNB-native reading a judge might expect. It fails on the same evidence that keeps it in the list at all,
an unobserved round trip plus a connector nobody has published to in eight months. A default that
cannot be demonstrated is worse than a peer that can.

## 5. Binance market data and the clause we could not quote

### 5.1 What is available

Verified today, keyless, from this machine:

```bash
curl -s "https://data-api.binance.vision/api/v3/klines?symbol=BNBUSDT&interval=1h&limit=2"      # 200
curl -s "https://api.binance.com/api/v3/ticker/24hr?symbol=BNBUSDT"                             # 200
curl -s "https://data-api.binance.vision/api/v3/exchangeInfo?symbol=BNBUSDT" | jq -c '.rateLimits'
# [{"rateLimitType":"REQUEST_WEIGHT","interval":"MINUTE","intervalNum":1,"limit":6000}, ...
#  {"rateLimitType":"RAW_REQUESTS","interval":"MINUTE","intervalNum":5,"limit":300000}]
```

Both hosts answered 200 with no key and returned `x-mbx-used-weight-1m` on every response, so budget is
observable per request. BNBUSDT last price was 772.69 at 2026-09-05T16:26Z with a 24 hour change of
7.601%, then 775.94 and 7.835% on a second read whose `closeTime` was 16:58:46Z. Two reads 33 minutes
apart differ, which is the point: these are research reads with a timestamp, never product numbers.
Section 5.3 explains why none of them reaches a page.

`data-api.binance.vision` is the documented market-data-only host. Binance publishes the exact list of
13 REST endpoints it serves, all of them `NONE` security type, then says that User Data Streams
**cannot** be accessed through the matching websocket host `data-stream.binance.vision`. That property
matters to section 7: a host with no account surface cannot leak an account through a misconfiguration.

### 5.2 What each category would want it for and what we use instead

Equal depth across the four categories is a published criterion, so this table covers all four.

| Category | What a Binance endpoint would give | What Muster uses instead | Why the substitute is at least as good |
| --- | --- | --- | --- |
| rebalancing | pair price and 24 hour change for the drift calculation | the pool the trade would execute against: PancakeSwap's keyless quote surface with its 180 second TTL and the reference USDT/WBNB 0.01% pool `0x172fcD41E0913e95784454622d1c3724f546f849` (`R08-pancakeswap.md`) | the executable price is the pool price. An exchange mid quotes a venue the transaction never touches |
| grid trading | klines for the range, realised volatility and a backtest window | our own sampled series, written by the `sampler` component with a block number on every point | the v3 pool oracle cannot serve a day: `observe([86400])` reverts `OLD` and the measured maximum lookback was 39,234 s on a live pool (`R08-pancakeswap.md`). A short window we can pin beats a long window nobody can check |
| yield | spot prices for a USD denominator on top of a rate | each protocol's own rate call, annualised in that protocol's own unit: Venus per block with exponent 364 and 192,000 blocks a day, Lista's Moolah per second through `exp(r*31536000)-1`, Aave per year in ray (`R09-bsc-defi.md`) | the settlement token is already a dollar stablecoin, so the USD denominator is the unit we quote in and needs no feed |
| health factor | the collateral price | the protocol's own oracle only: Venus `ResilientOracle.getUnderlyingPrice` scaled `1e(36 - underlyingDecimals)`, Aave's `getUserAccountData` field 6 scaled 1e18, Moolah's `isHealthy` in one call (`R09-bsc-defi.md`) | the price that liquidates a position is the protocol's, so an exchange price here would be wrong even if it were free to use |

That last row generalises into the rule the whole product follows. **Any number that decides money
comes from the contract that decides it.** Binance market data cannot satisfy that test for three of
the four categories and is merely convenient for the fourth.

### 5.3 The licence, under our own third-party rule

Our rule is that every third-party input enters a build only under a clause we have read and can quote.
Absence of a quotable clause is not permission (`R15-compliance.md`). Applied to Binance market
data, here is what a search for that clause actually returns.

| What I checked | Result |
| --- | --- |
| `gh api repos/binance/binance-spot-api-docs` | `"license": null` and the root listing carries no `LICENSE` file |
| `PROD-TERMS-OF-USE.md` in that repo | 186 bytes. It says Binance products and services are subject to the Product Terms of Use and links `https://www.binance.com/en/terms` |
| `https://www.binance.com/en/terms` with a browser user agent | **HTTP 202, zero bytes**, re-run today. `R03-x402-b402.md` recorded the same behaviour for Binance's own HTML documentation pages, which is why its capture is the machine-readable dump |
| The market-data disclaimer Binance does publish in machine-readable form | a disclaimer, not a grant, quoted below |
| The Convert API introduction, on continuity | "Binance may restrict or terminate a Binance API connection at any time for any reason at its sole discretion and is not obliged to provide prior notice" (`raw/binance-convert-introduction-2026-09-05.txt`) |

The disclaimer, from Binance's documentation for its own ChatGPT integration and the closest thing to a
statement about redisplay that I could read:

> Market data is provided "as is" from Binance's public APIs and may be delayed, incomplete, or subject
> to change. This information is for informational purposes only and should not be relied upon for
> trading or financial decisions. Binance makes no representations or warranties regarding accuracy or
> timeliness and disclaims all liability arising from use of this data.

So the terms exist and are unreadable from here, which under our own rule is the same as no permission
to republish. `SPINE.md` lists "Binance market-data licence terms for redisplay" as unverified and this
document does not upgrade it.

**Decision: no Binance market data in the published product.** The client exists, it is one file and
its config flag defaults to off with a comment naming the missing clause. `DATA-SOURCES.md` carries the
row as "terms exist at binance.com/en/terms, not readable, no redisplay grant quoted" rather than as a
grant, which is the shape `R15-compliance.md` prescribes for an input whose grant could not be found.
If the clause becomes readable it turns on for exactly one job, the divergence check that
`06-QUALITY.md` runs against an agent's own declared figure. Even then the series is not republished
and no page shows a Binance number as ours.

**The same rule, applied to the other Binance input we do ship.** The Bazaar read comes from
`binance.com/bapi/ramp/v1/public/ramp/b402`, the same company behind the same terms page that answers
202 with no body, so it gets its own `DATA-SOURCES.md` row in the same shape. Without one it fails
`15-SYSTEM.md`'s publish gate, which refuses an input carrying neither a quoted clause nor an explicit
"no terms found". The row reads "terms exist at binance.com/en/terms, not readable, no redisplay grant
quoted", identically to the market-data row.

What justifies shipping one while refusing the other is what reaches a page. From the market-data host
the thing we would render is Binance's own content, a price series it produced. From Bazaar what reaches
a listing is a count we derived plus a payout address that is already public on BSC. The address is
chain data rather than Binance's and the count is our arithmetic over their rows rather than the rows
themselves. Binance's own descriptions, its `quality` block, its ranking and any bulk copy of the
catalogue stay off every page and out of the API. If that distinction ever looks thin the render goes
and the internal join survives, because the join's value is deciding which agent earns a badge rather
than showing a stranger a Binance table.

Two supporting reasons, so the licence is not the only leg. Binance's own disclaimer says its market
data should not be relied upon for trading decisions, which is an odd foundation for a page whose
purpose is helping a stranger make an informed call. And the continuity posture, kept inside its own
scope: Binance reserves the right to cut a **Convert API** connection "at any time for any reason",
published on that product's introduction beside a note that Convert API use is unsuitable for arbitrage
and high frequency trading. Nothing published about the keyless market-data host promises otherwise,
which is the point. A judged URL has to answer through 2026-09-23 on a host whose operator has committed
to nothing.

Where Binance data did get used: research reads, including the price and rate limits printed in 5.1.
Those are recorded as research, they are not product numbers and none of them appears on a page.

One boundary worth stating because it will come up. A listed agent may use Binance market data itself.
That is the operator's grant to hold rather than ours. Muster does not police it. What Muster does is
attach the freshness stamp to every number it renders, so a figure that came from the agent's own
declared source names that source, with its block or timestamp, rather than being restated as ours.

## 6. Listing and distribution paths, real or speculative

| Path | Real or speculative | What it requires of us | Verdict for 2026-09-09 |
| --- | --- | --- | --- |
| **B402 Bazaar** | real, live, measured | B402 merchant credentials plus at least one confirmed settle carrying an `extensions.bazaar` blob | read it now, list into it later. Documented as next |
| **Binance Web3 Wallet dApp Zone** | real, documented end to end | an Open Platform account, the vendor agreement accepted, the wallet SDK integrated including logo exposure, a full self-test, then a Binance quality test after approval (5 or 7 business days, the two copies of the manual disagree) | out of reach before the deadline. Named, not claimed |
| **Skill Hub** | real path, zero third-party merges | a pull request against a public repo with the required frontmatter | file after the deadline. Never claimed in the submission |
| Binance MCP server | real, but not a listing path | it is a client surface into a Binance account, section 7 | not a distribution channel |
| Binance Agent OS Mini Hackathon | real, separate programme | its own submission, closing 2026-09-08 | out of scope here. Filed as `three/decisions/12-binance-mini-hackathon.md`, which expires when that programme closes |
| Official adoption as the BNB Agent Studio marketplace | the prize itself | winning | not a channel we operate |

**Bazaar, precisely.** Listing is strictly opt-in and rides on payment: attach the `extensions.bazaar`
blob to `paymentPayload` on a successful V2 settle and the indexer upserts the row on its next
30-second tick. The blob must ride every settle, because Bazaar treats it as a re-advertise signal.
`info` plus `schema` are required while `routeTemplate` and `description` are optional. There is no
listing without a settle and no marketing-only row. The documentation contradicts itself on the listing
key, saying each `(payTo, resourceUrl)` pair is a separate listing in one answer and one listing per
`(merchantId, resourceUrl)` in the next, with multi-chain entries merging on `(scheme, network, asset)`
and the latest settle winning. The practical rule is one row per endpoint URL per merchant, so two price
tiers on one URL will not appear as two rows. Consequence for us: our own listings in Bazaar sit behind
the same credential wall as the rail, which is why section 2.4's decision covers both and why we read
Bazaar rather than duplicating it. Reading it needs nothing: the production discovery base URL is
published and Binance's own page says it is stable and safe to hardcode.

**The dApp Zone, precisely.** The path runs through the Binance Web3 Wallet Open Platform at
`https://www.binance.com/en/web3-wallet-open-platform`: read the Open Platform Vendor Agreement, apply
through the dApp form, then Binance runs a quality control test against its published self-test
checklist after the application is approved. Two copies of that manual are live in the documentation
and they disagree on the clock, one saying 5 business days after approval and the other 7, so plan on
the longer one. Applications themselves are expected to receive a review result within 7 business days.
The checklist items are concrete and most of them we would pass on the current build: the wallet
connects without a page redirection, Binance logo exposure on web and app, transactions succeed with
gas in a normal range, every URL in the dApp opens inside Binance,
the app switches to the user's current chain when it is supported and all of it checked on iOS and
Android. Only dApps that have completed the wallet integration including logo exposure get listed.

The vendor terms need a human read before anyone accepts them, which is why this is named rather than
started. The PDF is at
`https://public.bnbstatic.com/static/pdf/open_platform_vendor_terms_180924.pdf`, 16 pages, "Last
update: September 18, 2024". Its clause 9 grants the vendor "a limited, non-exclusive, non-transferable,
non-sublicensable and revocable license to access and use Open Platform solely for the proper
performance of the Vendor Services", reserves all other rights to Binance, then bars the vendor from
using the Open Platform "to develop any competing product or service". I found no clause in it
granting Binance rights in the vendor's own code, so on the text I read this is a one-way access
licence rather than a grant-back, but a marketplace that lists agents inside Binance's wallet is close
enough to Binance's own surfaces that the competing-product limb is a question for a person and not for
a build script.

**Skill Hub, with a correction.** `R17-binance-agent-os.md` records no documented third-party
submission path. There is one. I read it today: `binance/binance-skills-hub` carries a
`CONTRIBUTING.md` saying each contribution is added as a separate skill under `skills/`, requiring
frontmatter with `name`, `description`, `version` and `license`, then imposing content rules that are
worth knowing before drafting anything: do not promote any coin, token or asset, do not present any
asset as guaranteed, safe or recommended, do not include or share any valid wallet address. Those
rules sit comfortably with the four output shapes `R15-compliance.md` derives for advice. A skill
that points a reader at Muster carries a URL rather than an address, so it can satisfy them.

The acceptance record is the part that decides the verdict:

```bash
gh api "search/issues?q=repo:binance/binance-skills-hub+is:pr+is:merged&per_page=100" \
  --jq '[.items[].user.login]|group_by(.)|map({user:.[0],n:length})|sort_by(-.n)'
# [{"n":46,"user":"binance-skills-hub"},{"n":17,"user":"theo-s68"},{"n":16,"user":"alplabin"}]
```

All 79 merged pull requests come from three maintaining accounts and every recent merge title is a
release of a first-party skill. Meanwhile 51 pull requests are open, the oldest since 2026-03-03, while
the shipped tree is 19 first-party skills, 7 under `skills/binance` and 12 under `skills/binance-web3`.
So the submission path is real and nothing third-party has landed in six months. We file a pull request
after the deadline because it costs an hour and might land. The submission never claims a Skill Hub
listing. The repo also carries no licence (`"license": null`, read today), so nothing is copied out of
it in either direction.

## 7. What we deliberately do not touch

This is a security position, not a scoping excuse. Each refusal names what it protects and what it
costs.

**1. No exchange credential, ever.** Muster has no field for an API key, no field for a secret, no
OAuth consent screen against a Binance account and no code path that connects Binance's MCP server on a
buyer's behalf. The reason is blast radius: an exchange credential's scope is the account rather than
the job. No marketplace needs it to sell an agent. `R17-binance-agent-os.md` records that the Binance MCP
server's four consent scopes are Market data, Account, Trade and Transfer, that withdrawal is never
available and that no configurable spend limit exists, so the only economic bound is how much the
agentic sub-account holds. Those properties are documented rather than verified by us. Even taken at
face value they make the point: Trade scope on a funded account is enough to lose someone's money
without any withdrawal ever happening. `R15-compliance.md` puts "an agent that asks a buyer to hand over
a private key, seed phrase or an unbounded token approval" in the prohibited-use list. An exchange
credential is the same category with a nicer login screen.

**2. No custody of buyer funds.** The whole architecture rests on the FinCEN sentence
`R15-compliance.md` quotes: a venue that hosts bids and offers while the parties settle through an
outside venue "does not qualify as a money transmitter" and a payment processor does. `08-MONEY.md`
enforces it as a testable invariant, that no code path exists in which a buyer's payment reaches an
address Muster controls, with the treasury only ever receiving Muster's own fee. B402's own disclaimer
in 2.1 says the same thing about itself, which is why it is a facilitator we can sit behind rather than
a custodian we would have to become.

**3. No key material and no surviving authorisation.** No private key, no seed phrase, no keystore file,
no password, no unbounded approval created on our behalf and no stored authorisation that outlives the
job it was signed for (`R15-compliance.md`). `05-ONBOARDING.md` enforces the operator record's
exclusions in the type system rather than by discipline.

**4. Binance Agentic Wallet is not a Muster wallet.** It is MPC custody under a Binance account, its
limits are enforced server side and it publishes no on-chain permission record, so what a user can
audit is executed activity rather than granted authority (`R17-binance-agent-os.md`). Adopting it would
put a custodian inside a product whose whole claim is that nobody holds the buyer's money. It also
cannot satisfy the Altana gate, which `13-PARTNERS.md` owns. There is also a licence reason not to vendor it:
`@binance/agentic-wallet` 1.9.0 publishes as `UNLICENSED` on npm, read today, so there is no grant to
redistribute it. If an operator drives it as a tool on their own machine that is their choice and
nothing of ours ships it.

**5. At most one Binance host and it cannot serve an account.** If section 5's flag is ever turned on,
the only Binance host our servers call is `data-api.binance.vision`, documented as serving 13 public
market-data endpoints with `NONE` security type and explicitly unable to serve User Data Streams. A
credential cannot leak into a host that has no account surface and a misconfigured base URL cannot
escalate into one.

**The exception, so the list is not read as a ban.** An operator may connect their own agent to
Binance's MCP server or to Agentic Wallet and that agent can still list on Muster. That is the
operator's perimeter. Two rules cover it. A listing whose declared surface implies a user-supplied
exchange credential fails a hard gate rather than earning a warning, because `R15-compliance.md` puts
custody of buyer keys in the prohibited-use list and `05-ONBOARDING.md` owns the gate. Anything softer,
such as a listing that mentions exchange access without asking a buyer for anything, raises an entry in
`lintFindings[]` and is shown to the buyer rather than blocked, because the buyer is entitled to know
that the work happens partly off chain.

**The blast radius test, which is how the position is checked rather than asserted.** Take Muster's
whole database. It holds wallet addresses, agent ids, job ids, deliverable hashes, amounts with their
token and decimals, screening verdicts with their list version and receipts. Every one of those is
already public on BSC or derivable from it, none of it spendable. Three changes would break that
property and all three are forbidden above: an exchange credential, a key or authorisation we hold,
then a balance in transit. That is the same reason `R15-compliance.md` can answer a subpoena for the 18 USC
2703(c)(2) categories with a short letter: we hold a wallet address and session timestamps and nothing
else.

## 8. What ships by 2026-09-09

| Item | State at ship |
| --- | --- |
| BABT read behind E3, one slot in a Multicall3 `aggregate3` against mainnet | **shipped**, with unknown as a real verdict when a leg fails |
| Galxe Passport and BNB Passport reads beside it, third leg answering false for everyone | **shipped**, labelled, `05-ONBOARDING.md` |
| Our own in-process `facilitator`, which every demonstrated hire runs on | **shipped**, `08-MONEY.md` |
| B402 client behind the same interface, tested against a synthesised fixture, flag off | **written, unused**, switches on if credentials land |
| B402 sandbox and production applications filed | **filed** on day one from the six values in 2.4, no published turnaround |
| Bazaar read, plus the payout-address join carried on `sourceSet[]` | **shipped**, rendering on about one listing today, count and block in section 1, with its own `DATA-SOURCES.md` row |
| Our own listings inside Bazaar | **next**, needs credentials plus a real settle |
| Binance Web3 Wallet as one of two named EIP-1193 connectors, never the default | **shipped**, no claim until a real connection is recorded |
| Binance market data | **not shipped**, flag off, missing clause named in `DATA-SOURCES.md` |
| dApp Zone self-listing | **next**, a quality test after approval (5 or 7 business days per the two manuals), vendor agreement needs a human read |
| Skill Hub pull request | **next**, after the deadline |

Nothing in that table is a stretch item dressed as a shipped one. The credential-free judge-facing work
is the E3 attestation read, which resolves for any address a buyer arrives with, plus the Bazaar read
itself with its own counts and concentration printed. The payout-address join is not in that set: it
decorates about one listing today, so it ships as a rare badge with its ceiling stated rather than as a
surface a judge lands on.

## Decisions and rejected alternatives

**1. Our own facilitator settles every demonstrated hire. B402 is a second implementation behind the
same interface.** Rejected: building the hire path directly on B402, which is the obvious choice for a
BNB Chain hackathon. Why: both environments' authenticated base URLs read "Please contact us for access"
today, onboarding is a separate manual application per environment with an IP allowlist, plus no review
turnaround is published. Four days out that is a dependency on somebody else's inbox.

**2. File both B402 applications anyway, on the first build day.** Rejected: skipping the form because
it cannot land before the deadline. Why: judging runs to 2026-09-23, a grant inside that window is a
config flip and credentials are also the only route to a Bazaar listing. The form costs one fill.
Section 2.4 pins the six values it asks for to a source each, no webhook among them, so the fill is a
task rather than a research pass. The IP filed is the deploy host's egress address, which is what makes
a late grant a flip rather than a rebuild.

**3. Poll `/settle`, key the outcome on whether `transaction` is empty, keep our own idempotency on
`(nonce, network, payer)`.** Rejected: treating the first `success: false` as terminal, which Binance's
own payment-status page endorses by calling it "Final state". Why: the newer settle page says a revert
and a pending confirmation are indistinguishable on V2, that only an empty `transaction` is terminal, then
that reconciliation runs for about 30 minutes. Getting this wrong books paid work as failed. The 35
minute ceiling and the terminal state each branch resolves into are in 2.5, because a poll with no
ceiling is not a decision.

**4. BABT is one of three reads behind E3 and never a gate.** Rejected: requiring a BABT to list, the
BNB-native reading a judge might expect. Why: 6 of the 585 owners behind a 600-agent sample hold one, so
the gate leaves about six listable operators, zeroes Agent Diversity and cannot fill four shelves. Nine
is the OR across BABT and Galxe Passport, which is E3's own ceiling rather than a BABT gate's.

**5. Read one bit at request time, store nothing, never fetch the token metadata.** Rejected: caching a
`verified` flag per operator and keeping the metadata `id` for cross-wallet dedupe. Why: in the fifteen
hours between `R10-bab-attestation.md`'s read and this one, 18 BABTs were minted while the live count
rose by 14, so four were revoked or burned, the issuer can revoke without the holder and that `id` is
precisely the identifier Binance breaks on purpose by 404ing revoked tokens.

**6. Binance Web3 Wallet is one of two named EIP-1193 connectors, never the default, with our RPC passed
in and no dependency on `wallet_addEthereumChain`.** Rejected: making it the primary connector and
relying on the 4902 add-chain fallback for it. Why: `wallet_addEthereumChain` is absent from the
provider's signing-method list so the call cannot succeed, `getRpcUrl` returns nothing for chain 56
unless we supply it and the packages have not been published since 2026-01-05. The roster is settled in
4.3: injected EIP-1193 first with EIP-6963 discovery, then this wallet by name, with WalletConnect v2
out for the ship.

**7. No Binance market data in the published product.** Rejected: klines for the grid window plus spot
for a USD denominator, which is the cheapest build and the one most entries will ship. Why: no redisplay
clause could be quoted (the docs repo carries no licence, `PROD-TERMS-OF-USE.md` is a pointer, the terms
page returns 202 with no body), Binance's own disclaimer says the data should not be relied upon for
trading decisions, plus for a health factor the protocol's oracle is the only correct price regardless
of licence.

**8. Any window longer than the pool oracle serves comes from our own sampled series with a block on
every point.** Rejected: PancakeSwap's explorer REST as the window source. Why: `R08-pancakeswap.md`
found its v2 `apr24h` reproducibly 0.68x low with no findable cause and its terms were not read either,
so it swaps one unquotable grant for another and adds a known defect.

**9. Read Bazaar, never duplicate it and print its ceiling.** Rejected: presenting 979 Bazaar endpoints
as marketplace inventory, which would look like instant supply. Why: 8 payout addresses hold all of it,
one of them holding 941 of the 979 resources at 96%, while only one of the eight owns an ERC-8004 agent
at all. A catalogue ranked by count would republish one operator's list under our name. The join it
enables decorates about one row, which section 1 states with its block. The Bazaar read also gets its
own `DATA-SOURCES.md` row in the same shape as the refused market-data one, because a shipped input with
no row fails the publish gate (5.3).

**10. Skill Hub after the deadline, dApp Zone named rather than started.** Rejected: chasing either as a
submission artifact. Why: 79 merged pull requests on the Skill Hub come from three maintainer accounts
with 51 third-party requests open and the oldest six months old, while the dApp Zone needs the vendor
agreement accepted plus a Binance quality test after approval, which its own two manuals date at 5
business days in one place and 7 in the other.

**11. No exchange credential enters the product and a listing that asks a buyer for one fails a hard
gate.** Rejected: an optional Binance MCP connection as a convenience for buyers who already hold an
account. Why: the credential's scope is the account rather than the job, no configurable spend limit
exists on that surface and accepting one would turn a database whose entire contents are already public
into a database worth stealing.

**12. Read B402's own supported-token list as the constraint and never infer it from what a token can
do.** Rejected: pricing a B402 hire in FDUSD, which `VERIFIED-payment-rail.md` proved implements
EIP-3009 on chain with its domain matched byte for byte. Why: B402's `eip3009` method accepts U and
USD1 only, FDUSD appears in no B402 token table, then its own changelog shows Binance correcting
a token claim in that same table in 2026-05. The list moves, so only a live `/supported` response is
authoritative and every value from it is cached rather than hardcoded.

## Open questions

1. **Whether B402 credentials arrive for either environment and when.** Both base URLs are unpublished
   and no turnaround is stated. Settled by a response to the application at
   `https://forms.gle/aUQvxUETfGMzyTky5`. Until then the B402 client runs only against the synthesised
   fixture described in 2.4.
2. **B402's real `extra.signerAddress` and `extra.spenderAddress` on chain 56 and whether the spender
   is the canonical `x402ExactPermit2Proxy` at `0x402085c248EeA27D92E8b30b2C58ed07f9E20001`.**
   `R03-x402-b402.md` records a strong circumstantial match through the upto proxy's witness type string
   and calls it unconfirmed. Settled by one `/supported` response, which needs credentials plus an
   allowlisted IP.
3. **Whether B402 charges a fee and its single-transaction, merchant-daily and payer-daily limits.**
   Error codes exist for all three ceilings with no numbers published, while no fee or fee address
   appears anywhere in its documentation. Settled by credentials or by Binance publishing them.
4. **Whether Bazaar's `quality` fields are unshipped, gated or populated only above some volume.** The
   key is absent from every row in two independent pulls. Settled by Binance shipping them or by a
   merchant with volume confirming they populate.
5. **Whether the mainnet token list is closed for B402's Permit2 methods, which decides whether a hire
   can be priced in FDUSD at all.** The methods table reads "Any ERC-20" while the token table names four
   and FDUSD is not among them. Settled by one live `/supported` response, so it shares its blocker with
   question 2.
6. **Whether a real Binance app connection to our origin completes and whether the in-app injected
   provider behaves like the packaged one.** No Binance app in this environment, so section 4 is read
   from source only. Settled by one device test, which is a build task before any claim is made.
7. **Who holds which fragment of a Binance Web3 Wallet key.** Binance publishes the MPC framing with no
   party list and no threshold, so whether the buyer alone can sign is unverified. Settled by Binance
   publishing the scheme or by a key-export path a user can exercise. Nothing in the money path depends
   on the answer, for the reason in 4.1.
8. **The Binance market-data redisplay clause.** The terms page returns HTTP 202 with no body to a plain
   fetch. Settled by a readable page with the clause quoted into `DATA-SOURCES.md`, at which point the
   flag in section 5 can be reconsidered for the divergence check only.
9. **Whether the Open Platform vendor agreement reaches an agent marketplace through the
   competing-product limb, plus whether its 16 pages carry a grant-back one read did not find.**
   Settled by a human reading the PDF before anyone accepts it. Nothing in the build depends on the
   answer today.
10. **Whether the Skill Hub ever merges a third-party skill.** Six months of open requests suggest not.
    Settled by watching the queue, which costs nothing and gates nothing.
11. **Whether the BABT metadata `id` is genuinely stable for one person across re-mints.** Binance states
    it, testing it needs a real account plus 72 hours (`R10-bab-attestation.md`). It gates nothing here,
    because we never fetch that field.
12. **Whether the Binance Agent OS Mini Hackathon permits a project entered in another programme.**
    `R17-binance-agent-os.md` records that its rules say nothing either way and the main track allows
    one entry per team. It is a submission-level call rather than an integration one: no Binance surface
    in this document changes with the answer. Filed as
    `three/decisions/12-binance-mini-hackathon.md`. It expires when that programme closes on 2026-09-08,
    one day before the main build.
