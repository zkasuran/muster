# R16 Reuse: what our own prior builds already paid for

Harvest pass run 2026-09-05. Every file named below was opened and read, not recalled. Every
test suite quoted was executed today. Every on-chain constant lifted out of old code was
re-called against BSC mainnet before it is repeated here, because a constant that was true in
August is a claim, not a fact.

## Headline

We already built a BSC ERC-8004 marketplace spine in this workspace and nobody in this pass
cycle has looked at it. `work/bnb-era/touchstone` holds verified mainnet and testnet addresses
for the identity registry, the reputation registry and the **official BNB ERC-8183 escrow**,
plus the four-category classifier, the Multicall3 enumerator and an assert-first gate that
refuses a wrong-registry read. It typechecks and its live probe went green today against BSC.
Running its indexer live took 456 seconds and produced the number that should change the build:
the official ERC-8183 escrow has **56,713 jobs, 28,244 completed and 292.24 U ever paid, with
one provider holding 56,167 of the jobs and 281.56 of the U**. Settled money on BSC is real,
countable and one address deep.

> **Correction, 2026-09-05.** This line originally read "indexed by nobody else". That is wrong.
> `brainonbnb.com/registry` publishes per-provider ERC-8183 employment history joined to agent ids
> (fetched 2026-09-05, HTTP 200), so the kernel is indexed by at least one live product. The narrower
> claim that survives is that no product we found publishes the full kernel joined to agent ids with
> per-category counts and a window. The rival census here is a GitHub repo query, so a live product with
> no public repo is invisible to it: check live sites too.
> See `decisions/02-thesis-brainonbnb-is-third-party.md`.

The second finding matters just as much. The escrow's `paymentToken()` is `U` (United Stables,
`0xcE24439F2D9C6a2289F741120FE202248B666666`) and U turns out to be a full EIP-3009 **and**
EIP-2612 token, 18 decimals, 956,298,607.91 supply, whose EIP-712 domain I derived and matched
against its on-chain `DOMAIN_SEPARATOR`. `VERIFIED-payment-rail.md` never tested U and
concluded the one-signature rail had to be FDUSD or USD1. U is deeper than both and it is what
BNB's own escrow already pays in.

## Verified facts

| claim | value | how verified |
| --- | --- | --- |
| A prior BSC ERC-8004 lane exists and still runs | `work/bnb-era/touchstone`, viem 2.55.0, bun, `tsc --noEmit` exits 0 | `bun run typecheck` |
| Its live probe gate passes today | registry answers `AgentIdentity`/`AGENT`, highest agentId **334,997** at block 120,035,552, 4/4 sampled agents resolved, 4/4 had `agentWallet` set, BSC gas 0.05 gwei | `RPC_URL=https://bsc-rpc.publicnode.com bun run probe` |
| Touchstone has no unit tests | 0 files match bun's test glob | `bun test` |
| ERC-8183 escrow (APEX AgenticCommerce) live on BSC | `0xEa4DAa3100A767e86FDed867729ae7446476EBA6`, codesize **130** so it is a proxy, `platformFeeBP()` = **0** | `cast codesize`, `cast call 'platformFeeBP()(uint256)'` |
| Escrow job count today | `jobCounter()` = **56,713** (was 56,585 in our 2026-08-09 snapshot) | `cast call 'jobCounter()(uint256)'` |
| Escrow payment token | `paymentToken()` = `0xcE24439F2D9C6a2289F741120FE202248B666666` | `cast call 'paymentToken()(address)'` |
| Full ERC-8183 history re-indexed today | 56,713 non-empty jobs in **455.6 s**; Open 994, Funded 285, Submitted 27,170, **Completed 28,244**, Rejected 6, Expired 14 | `RPC_URL=… bun run scripts/index-jobs.ts` |
| Money actually settled through that escrow | total budget **656.88 U**, budget on completed jobs **292.24 U** (about 0.0103 U per completed job) | same run |
| Provider concentration | **97 distinct providers, 28 with any completed job.** `0xc0d7D888d8Ff8925dc95Fbb16C89217718BF7c8d` holds 56,167 jobs and 281.56 U, that is 99.0% of jobs and 96.3% of paid value | same run |
| One-client records dominate the tail | **18 of the 28 completing providers** have their entire record from a single client address | same run |
| U is a real deep stablecoin on BSC | `name()` "United Stables", `symbol()` "U", `decimals()` **18**, `totalSupply()` 956,298,607.908467150 | `cast call` each |
| U is a proxy | proxy codesize 2,007, EIP-1967 impl slot holds `0xbef21313c69c009fd7d9510a8d3a481a32473dfc`, impl codesize 12,027 | `cast storage <token> 0x360894a1…382bbc`, `cast codesize` |
| U supports EIP-3009 | `authorizationState(address,bytes32)` returns `false` live; impl bytecode contains `e3ee160e` (`transferWithAuthorization`), `ef55bec6` (`receiveWithAuthorization`), `e94a0102` (`authorizationState`) | live `cast call` plus `cast code <impl> \| grep -c <selector>` |
| U also supports EIP-2612 permit | impl contains `d505accf` (`permit`), `7ecebe00` (`nonces`), `3644e515` (`DOMAIN_SEPARATOR`) | same grep |
| U has no `cancelAuthorization` and no ERC-5267 | `5a049a70` absent, `84b0196e` absent, `eip712Domain()` reverts | same grep plus live call |
| U EIP-712 domain, proven not guessed | `name` "United Stables", `version` **"1"**, chainId 56, verifyingContract the token. On-chain `DOMAIN_SEPARATOR()` = `0x358738403e5a61fdc30a8be78a60f289cbe4d2545b735a344b6229c70c1679b6` | derived `keccak(abi.encode(domainTypehash, keccak(name), keccak(version), 56, token))` and matched; seven other name and version combinations computed and excluded |
| FDUSD and USD1 both carry `receiveWithAuthorization` | selector `ef55bec6` present in both implementations, so a contract payee can pull a signed deposit | `cast storage` for the impl then `cast code \| grep` |
| `cancelAuthorization` is USD1 only | `5a049a70` present on USD1 impl, absent on FDUSD impl | same |
| Both are 18 decimals | `decimals()` returns 18 on FDUSD and USD1 | `cast call` |
| Moonwalk's contract blueprints still build and pass | **51 tests, 3 suites, 0 failed** on forge 1.7.1 (SpendGuard 10, ServiceRegistry 11, NanoChannel 30) | `forge test --offline` in `work/moonwalk/contracts` |
| Cassandra's suite is green in its own venv | **103 passed**, 1 pre-existing starlette deprecation warning | `./.venv/bin/python -m pytest -q` |
| Lepton-discord's suite is green in its own venv | **79 passed**, 2 deprecation warnings | `./.venv/bin/python -m pytest -q` |
| The genesis listing-linter code is gone | `work/okx-genesis/genesis` does not exist. Only `cassandra/` survives in that lane | `ls -d` |
| `three/research/MEASUREMENT.md`, cited by `three/README.md`, does not exist | the folder holds `R01`..`R15` and `census-bsc-2026-08-27.tsv` instead | `ls three/research` |
| No zeroclaw, zeroclg, agency-os or arena agent-behaviour lane exists under `work/` | see section 7 for what those names actually resolve to | `ls`, repo-wide `grep -ril` |

## Unverified or open

| claim | blocker |
| --- | --- |
| Whether B402 settles in U | No B402 endpoint was called in this pass. That U is the token BNB's own ERC-8183 escrow pays in is suggestive, not proof that the x402 facilitator quotes it. R03 owns this. |
| Who can upgrade U | The token is a proxy and I did not read its admin or owner slot, so its behaviour can change under a build that depends on it. Same open question `VERIFIED-payment-rail.md` leaves on FDUSD and USD1. |
| U's issuer, peg and redemption | Not researched. It is not on Circle's list. A settlement default should not be picked on capability alone. |
| The BSC testnet U at `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` | Recorded in our old code for chain 97. No chain-97 RPC call was made in this pass, so nothing about the testnet token is verified. |
| Whether `0xc0d7D888…7c8d` is one operator or the platform's own router | It holds 99% of ERC-8183 jobs and 32,614 distinct clients. A router would explain both. Not established either way and the ranking design depends on which it is. |
| The identity registry's creation block | Our old code pins `identityDeployBlock` 79,027,268. R01 verified the **first registration** at 79,094,807 and could not get historical `eth_getCode` from any free RPC. The two are not the same number and neither is proven to be proxy creation. |
| Whether `eth_getLogs` is usable on BNB public RPCs | Touchstone's comment says it is disabled outright and a one-block range returns `-32005 limit exceeded`. R01 pulled 4 logs from a single block on an archive RPC. Both may be true of different endpoints. Not reconciled. |
| Whether BNB Agent Studio runs the same listing probes OKX ran | Every rejection in section 1 is OKX's behaviour on X Layer. The failure modes are structural, the reviewer is not the same reviewer. |
| Cassandra listing final state | Approved and listed 2026-07-27 (`approvalDisplayStatus` 4), delisted 2026-08-01, resubmitted 2026-08-02 with the verdict still pending in the last record I found. No later entry exists in the files read. |

## 1. The onboarding ruleset, taken off a live marketplace review

Source: `work/okx-genesis/REQUIREMENTS.md`, `work/okx-genesis/cassandra/SPEC.md`,
`work/okx-genesis/cassandra/HANDOVER.md`, `work/pr-sweep/2026-08-02-cassandra-rejection.md`.
This is the single most valuable input in the pass because it is not theory. One paid agent
went through five review rounds on a live agent marketplace and every round named its own
failure. Our marketplace is the reviewer now, so each of those failures is a gate we run.

### 1.1 The rejection ledger, every round with its real cause

| date | verbatim reason | actual root cause, established from logs | the gate it becomes |
| --- | --- | --- | --- |
| 2026-07-16 | avatar rejected on image quality | Mark was a thin four-node chain diagram on near-black, carrying ink on about a seventh of the frame. Rules ban text, logos, borders, AI-generated images, humans and sub-1080p | Image lint, section 1.6 |
| 2026-07-17 | "Not passed x402 standard validation" | The 402 challenge itself was compliant. Their crawler fetched `/.well-known/agent-registration.json` for ERC-8004 domain verification and got **404**, visible in the container log at 06:57:01 UTC from 35.252.108.18, right after its two 402 probes | Well-known binding must resolve and its agentId must match on-chain, section 1.2 gate 2 |
| 2026-07-17 | "No response from your Agent, task timed out" | HTTP never went down. The **contact listener** ran on a laptop that was powered off 16:28 to 03:52 UTC, exactly the window their chat test ran | Contact-channel liveness probe, separate from HTTP health, section 1.2 gate 5 |
| 2026-08-01 | delisted, "unable to receive a response from your Agent, causing the task to time out" | Their own validator said it: `tokenResolveError: cannot determine token decimals: token-info lookup failed (asset 0x779ded… is not in the task system's supported token list (checked: USDT, USDG)) and the accepts entry does not provide a decimals field`. **A task that cannot be priced never pays.** Seven distinct caller IPs fetched the challenge across five days and not one returned with a payment | Decimals resolution gate, section 1.5 |
| 2026-08-01 | same event, second defect in the same log | `GET /oracle?market=BTC-4H` answered **200 with a static info blob** because only POST was gated. An x402 client pays for the request it already tried and replays it, so a GET that cannot be paid for can never deliver | Every route the listing invites answers a payable 402. Free info lives off the paid path at `/schema` |
| 2026-08-01 | same event, third defect | A caller POSTed a body the strict pydantic model rejected with **422**. Payment middleware runs ahead of validation, so a 422 there means the call was already let through and then failed on schema | Never-422 gate, section 1.5 |
| 2026-08-02 | "The current avatar doesn't align well with the Agent's actual positioning and functionality, and its visual quality isn't polished enough" | Neither the x402 complaint nor the timeout recurred. The 08-01 work held. The image was the only reason | Image lint again, this time measured rather than judged |

Two facts from that ledger are worth carrying as design pressure rather than as gates. The
02 log proves the fixes worked, because 71 seconds after resubmission the marketplace's own
fleet paid and was served on both verbs, 1.31 s from 402 to 200 on POST and 0.50 s on GET. And
their payment client **sends an empty body on a POST replay** even when the quote was given
`--param market=BTC-4H`, which is why the never-422 rule is not defensive polish. It is the
thing that makes the buyer's real flow return anything at all. A caller that needs a specific
parameter has to use the GET form, where the value rides in the resource URL and survives the
replay.

### 1.2 The hard gates (fail any and the listing cannot go live)

Six, from `REQUIREMENTS.md` sections 1 to 6 and `ONBOARDING.md` section D, restated as gates a
marketplace runs rather than gates a seller passes elsewhere.

1. **Ownership.** The lister controls the on-chain agentId, proven from `ownerOf`. The payout
   address is read from chain, never from a form field.
2. **Well-known binding.** `/.well-known/agent-registration.json` resolves over HTTPS and its
   `agentId` matches the on-chain id. This is the exact 404 that sank x402 validation.
3. **Endpoint hygiene.** HTTPS, publicly reachable, deployed at review time, not localhost, not
   RFC-1918, not a mock. Under 512 characters. Permanent on chain, so a change costs an update
   transaction. On ERC-8004 the `tokenURI` plays that role.
4. **Payable paths.** An unpaid call to every route the description invites returns a well-formed
   402 with token, amount, network and `decimals`, on the header **and** the body, emitted from
   one object so the two cannot drift.
5. **Contact liveness.** The declared contact channel answers a live probe inside its declared
   latency. An agent whose HTTP is green and whose contact path is dead gets delisted.
6. **Payment proven before go-live.** One real signed authorization settles end to end, 402 to
   pay to 200 replay. A 402 that nobody has ever paid is not a wired payment path.

One gate from that list has no analogue here and should be recorded as such: OKX ran a separate
email-gated **beta whitelist** that had to clear before any listing could be created at all,
backend error code 10016. Our lane's equivalent risk is any partner credential on the critical
path, so it is the same lesson under a different name: apply on day one, never day twelve.

### 1.3 The lifecycle, as a state machine

The live shape was: `pre-check` then `validate-listing` driven to pass, then `create`, then
`activate`, then `submit-approval`, then `approvalStatus 2` under review for roughly 24 hours,
then live. `approvalStatus 5` is rejected and the fix goes on the **same id** through `update`
and re-`activate`. Never create a new one. An update re-runs listing QA and restarts the review
round, so a listing is never edited mid-review.

Our version, from `ONBOARDING.md` section B, mapped onto ERC-8004 where identity already exists
so there is no create step, only a claim:

`draft` (wallet proven from `ownerOf`) then `linted` (field lint, zero findings, cheapest gate
first) then `probed` (the six hard gates against the live endpoint) then `in_review` (a human
judges what a probe cannot: does the description match behaviour, is the avatar on-theme) then
`live`. `rejected` returns a named reason and re-enters at `linted` on the same agentId, so
history and reputation stay attached across fixes. An edit while `in_review` is refused.
`delisted` is a live agent that later fails a re-probe and it names the failing probe.

The reject-and-fix-on-the-same-id loop is the load-bearing part. It is what lets an agent build
a track record across fixes instead of resetting it and it is why a delisting has to be
reversible without losing the agent's earned standing.

### 1.4 The listing lint, field by field

From `REQUIREMENTS.md` item 5 and `ONBOARDING.md` section C. These are the exact thresholds a
live marketplace enforced, so they are defensible numbers rather than invented ones. The code
that implemented them is gone (see section 7), the ruleset is not.

| field | rule |
| --- | --- |
| agent name | 3 to 25 characters, brand only. Not a person's name, no celebrity substring, no `(test)` |
| service name | 5 to 30 character noun phrase, distinct from the agent name, no price inside it |
| description | **exactly two parts**: what it does, then what the user provides. Hard ceiling 400 characters. No links, no example prompts, no tech-stack names, no disclaimers |
| category | one value from a closed enum. No free text |
| fee | a bare number in the listing's token, at most 6 decimal places as written, within sane bounds, with real decimals resolved from the token contract |
| avatar | a mandatory uploaded image passing the image lint. A URL alone is rejected |
| injection scan | the listing copy itself is scanned for prompt-injection, malicious content and data-leakage patterns |

The injection scan has a trap worth stating in the docs, because it caught us: a security agent
whose own description describes attacks will trip the scanner. The scan is on our side of the
boundary, the listing text is untrusted data and a listing that tries to steer a reader or a
downstream model is rejected on that basis alone. The shipped copy that passed all six checks
was 357 of 400 characters, which is the practical target for a two-part description.

### 1.5 The two gates that come from the delisting, stated precisely

**Decimals.** Every listing declares its settlement token. The marketplace reads that token's
real `decimals`, name and EIP-712 domain from the token contract at index time and caches them
with the listing. The 402 challenge carries token, atomic amount and resolved `decimals` in both
channels. A token whose decimals cannot be resolved or that does not support the signed
transfer path the hire uses, fails the gate. Refusing the listing beats listing an agent nobody
can pay. The delta that proved the fix: before it, the validator returned no `amountHuman` at
all; after it, `amountMinimal 50000` and `amountHuman 0.05` with `tokenResolveError` gone.

**Never-422.** A paid handler reads any shape and never answers a schema error to a caller who
has already paid. The shipped resolver accepted `market`, `market_code`, `symbol`, `pair`,
`asset`, `input`, `query`, `prompt`, `text`, `message`, `messages[]`, a bare string, an asset and
a horizon split across two fields and plain language like "forecast for bitcoin over the next
24 hours". A request naming nothing is served a stated default and the response says so in a
`resolved_from` field. A request naming something we do not offer gets **200 with the offer
list** and commits nothing, never a silently substituted answer. Unresolved calls log at WARNING
with the raw payload so the next probe is diagnosable instead of invisible. One word-boundary
detail that is real experience, not polish: the alias matcher uses
`(?<![a-z0-9])alias(?![a-z])` so that "console" cannot yield "sol".

The marketplace cannot force never-422 on external agents, so it is a probe with delisting on
failure, not an assumed guarantee.

### 1.6 Anti-wash and the integrity lines

The anti-gaming rule the live program enforced: revenue counts only from **distinct real
counterparties**. Self-paying is a fraud screen and a disqualification risk. Our own build held
the same line in code, which is the part worth copying:

- Every ledger entry carries `origin`, one of `house` (seeded) or `order` (paid). The chain
  refuses any other value at append time, so the tag is a structural invariant and not a display
  convention.
- Revenue and volume claims only ever count `origin: "order"`. House entries render on the same
  public page, visibly distinct.
- Losses render as prominently as wins. The live record read 1 of 7 beating a coin flip with a
  mean Brier of 0.3106 at demo time and the instruction in the brief was to **lead with that**,
  because a record you can check is the product and a flattering record you cannot check is not.
- No admin route can mutate the chain. A corrupted store refuses to boot rather than serving a
  lie.
- No "guaranteed" or "beat the market" language anywhere in the listing or the copy.

The residual attack is unchanged and should be named in the docs rather than claimed solved: an
agent paying itself through a controlled buyer address. That is a clustering heuristic, it needs
real data to tune and it is a listing-standing check rather than a one-time gate.

### 1.7 Image lint, with real measurements

The avatar was rejected twice, so this is the one lint with numbers behind it. Rules: minimum
1080p and we ship 2048x2048, full bleed, no text, no logos, no borders, no human faces, not an
AI-generated photo, on-theme for the agent's actual function, dense enough to read small,
fetched back after upload and hashed to confirm the served bytes are the approved bytes.

The measured floors, rejected mark against the accepted one:

| metric | rejected | accepted |
| --- | --- | --- |
| fraction of frame carrying drawn detail | 0.145 | 0.288 |
| brightness spread at 48 px | 18.3 | 32.4 |
| miss-colour ink present | 0.0000 | 0.0037 |
| detail surviving a circular crop | 0.998 | 1.000 |

Eight regression tests hold the shipped file above floors that sit between those two numbers,
one test fails if anyone loosens a floor far enough to readmit the rejected image and one
re-renders from the generator to prove the file on disk is its output. That is the pattern to
copy: an image lint whose thresholds are derived from a real rejection, with a test that cannot
be quietly relaxed. Generation is deterministic PIL geometry, not an image model, so there is no
image licence to defend.

## 2. The x402 shapes we already ship, with the Arc values fenced off

Source: `work/lepton-discord/src/api/paywall.py`, `src/payments/facilitator.py`,
`src/api/executor.py`, `src/api/app.py`, `src/payments/config.py`. 79 tests green today.

### 2.1 The payment envelope the browser builds

This is what our signing page posts in the `X-PAYMENT` header, base64 of this JSON:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "eip155:5042002",
  "payload": {
    "signature": "0x…",
    "authorization": {
      "from": "0x…",
      "to": "0x…",
      "value": "10000",
      "validAfter": "0",
      "validBefore": "1785339756",
      "nonce": "0x… 32 random bytes"
    }
  }
}
```

The typed data signed with `eth_signTypedData_v4`:

```js
domain    = { name: "USDC", version: "2", chainId: 5042002, verifyingContract: ASSET }
primaryType = "TransferWithAuthorization"
types.TransferWithAuthorization = [
  { name: "from",        type: "address" },
  { name: "to",          type: "address" },
  { name: "value",       type: "uint256" },
  { name: "validAfter",  type: "uint256" },
  { name: "validBefore", type: "uint256" },
  { name: "nonce",       type: "bytes32" },
]
```

`validAfter` is 0, `validBefore` is now plus 300 seconds, the nonce is 32 bytes from
`crypto.getRandomValues`. The page also handles `wallet_switchEthereumChain` and falls back to
`wallet_addEthereumChain` on error code 4902, which is the whole chain-switch dance a judge sees.

### 2.2 Everything in that section that must not travel to BSC

| Arc-specific value | why it is wrong on BSC |
| --- | --- |
| `network: "eip155:5042002"` | BSC is `eip155:56` |
| chainId 5042002, RPC `https://rpc.testnet.arc.network`, explorer `https://testnet.arcscan.app` | Arc testnet only |
| asset `0x3600000000000000000000000000000000000000` | Arc's USDC precompile address. Nothing at that address on BSC |
| EIP-712 domain `name: "USDC", version: "2"` | Verified on BSC: FDUSD is `First Digital USD`/`1`, USD1 is `World Liberty Financial USD`/`1`, U is `United Stables`/`1`. **Version 1, not 2, on all three** |
| **6 decimals everywhere** (`price_atomic / 1_000_000`, `10000` = $0.01, `50000` = $0.05) | Every BSC stablecoin checked is **18** decimals. Carrying 6-decimal arithmetic here is wrong by a factor of a trillion |
| `nativeCurrency: { symbol: "USDC", decimals: 6 }` in the add-chain call | BSC's native currency is BNB at 18 decimals |
| "Arc uses USDC as its gas token" and the dual 18/6 decimal views in `IUSDC.sol` | Arc-only property. On BSC gas is BNB and the facilitator pays it |
| Measured gas numbers (87,145 gas and $0.001873 per x402 settle, 8,755 gas per channel call) | Arc measurements. Quoting them as BSC numbers would be a fabricated claim |
| `x402Version: 1` | The version to send on BSC comes from B402's own docs. R03 owns that value |

### 2.3 The gas-sponsoring facilitator pattern

Three distinct wallets and the separation is the point:

- **payer**: holds the stablecoin, signs EIP-3009, needs no native gas, never sends a transaction.
- **payTo**: the service wallet that receives the value.
- **facilitator relayer**: submits `transferWithAuthorization` on chain and pays the gas. It holds
  a gas-only key and can only submit an authorization the buyer already signed for a fixed
  recipient and a fixed amount.

Our implementation runs the facilitator **in the same process** as the resource server, so verify
and settle need no HTTP round trip to an external facilitator:

```python
signer = FacilitatorWeb3Signer(private_key=FACILITATOR_PRIVATE_KEY, rpc_url=RPC_URL)
facilitator = x402Facilitator()
register_exact_evm_facilitator(facilitator, signer, networks=NETWORK)

class EmbeddedFacilitatorClient:      # satisfies the FacilitatorClient protocol
    async def verify(self, payload, requirements) -> VerifyResponse: ...
    async def settle(self, payload, requirements) -> SettleResponse: ...
    def get_supported(self) -> SupportedResponse: ...
```

The route then reads the v2 header first and falls back to v1, which is the compatibility detail
that saves a round of debugging: `PAYMENT-SIGNATURE`, then its lowercase form, then `X-PAYMENT`,
then `x-payment`. Verify, then settle, then run the work, then persist. The settle hash is
normalised to a `0x` prefix before it is ever put in a link, because our explorer links broke on
a bare hash. Idempotency: a record already marked paid returns its cached result with
`already_paid: true` rather than re-running or double-charging.

### 2.4 The 402 emitter and the compat wrapper that fixes it

The plain emitter puts requirements in the header and a thin JSON body:

```python
def _402_response(reqs: PaymentRequirements) -> JSONResponse:
    pr = PaymentRequired(accepts=[reqs])
    return JSONResponse(
        status_code=402,
        content={"x402Version": 2, "error": "payment required"},
        headers={PAYMENT_REQUIRED_HEADER: encode_payment_required_header(pr)},
    )
```

That is exactly the shape that got delisted, because the body carries nothing payable and no
`accepts` entry states its `decimals`. The fix lives in `cassandra/x402_compat.py`, an ASGI
wrapper **outside** the payment middleware. It only touches responses that are already 402 with a
decodable challenge, it fills `decimals` per asset from a map, it leaves an entry that declares
its own decimals alone, it invents nothing for an unknown asset and it re-emits header and body
from **one object** so the two cannot drift. Nothing signed is touched: an EIP-3009 authorization
covers `from`, `to`, `value`, `validAfter`, `validBefore` and `nonce`, none of which appear in the
challenge and verification rebuilds requirements from the route config rather than from the
response. That reasoning is the answer to the obvious reviewer question, "you rewrote the
challenge, is it still x402" and it should be in the docs verbatim in spirit.

### 2.5 The SSRF guard, whole

Listing URLs are member-supplied, so a listing can aim the marketplace's own fetch at localhost
or a cloud metadata address. This is 20 lines and it belongs in the indexer, the prober and any
callback path:

```python
async def _url_is_public(url: str) -> tuple[bool, str]:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        return False, "only http(s) URLs are allowed"
    host = parts.hostname or ""
    if not host:
        return False, "URL has no host"
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except OSError:
        return False, f"cannot resolve host '{host}'"
    for info in infos:
        if not ipaddress.ip_address(info[4][0]).is_global:
            return False, f"host '{host}' resolves to a non-public address"
    return True, ""
```

Two properties worth keeping. It checks **every** resolved address, not just the first, so a
multi-A-record host cannot smuggle one private answer through. And the caller sets
`follow_redirects=False`, because a public host that 302s to `169.254.169.254` defeats a
pre-flight check on its own. The response body is truncated to 1500 characters before it is used.

### 2.6 The off-chain list-and-verify surface and its spend rails

`app.py` also holds a working two-sided catalogue that is a smaller version of what we are
building and its guards transfer directly:

- `POST /market/list`: name must match `[a-z0-9_]{3,40}`, url must be http(s), wallet must match
  `^0x[0-9a-fA-F]{40}$`, price must be `0 < p <= MARKET_MAX_PRICE_ATOMIC` and a duplicate name in
  the same namespace returns **409**. A listing is created **unverified** and is invisible to the
  paying agent until an admin verifies it.
- `POST /market/verify` is idempotent and returns the verified state rather than erroring on a
  re-verify.
- `GET /market/services/{namespace}` defaults to verified-only, with `?all=true` for the admin's
  pending queue.
- A per-listing price ceiling exists so **one rogue listing cannot eat a whole per-user budget in
  a single call**. That is a one-line rule with real teeth.
- A per-user budget endpoint returns `limit`, `spent` and `remaining` in atomic units, which the
  buying agent checks before it pays.
- The public demo route carries three separate brakes: a per-IP rolling-minute limit, a per-request
  budget the planner sees and a global lifetime spend cap after which it keeps answering and
  stops spending. A public "try it" button on a judged site needs all three.

## 3. The Solidity blueprints, with their real interfaces

Source: `work/moonwalk/contracts/src/`. 51 tests, 0 failures, forge 1.7.1, run today. Deployed on
Arc testnet at the addresses in `work/moonwalk/deployments/arc-testnet.json`, which are **Arc
addresses and must not be repeated as BSC ones**. Licence header on all three is `MIT`, which is
the wrong outbound licence for a competition entry under our own rules, so the header changes
before any of this ships in a public entry repo.

### 3.1 SpendGuard: per-subject windowed caps, on chain

The Altana-shaped control, already written and tested. 159 lines. The design decision that makes
it multi-tenant: **scopes are namespaced by the calling contract**, so `msg.sender` is the app and
two apps can never touch each other's usage.

```solidity
struct Cap   { uint256 limit; uint64 window; bool set; }   // window 0 means lifetime total
struct Usage { uint256 used;  uint64 windowStart; }

function registerScope(bytes32 scope, address owner) external;
function setDefaultCap(address app, bytes32 scope, uint256 limit, uint64 window) external;
function setSubjectCap(address app, bytes32 scope, bytes32 subject, uint256 limit, uint64 window) external;
function consume(bytes32 scope, bytes32 subject, uint256 amount) external;   // app is msg.sender

function scopeOwner(address app, bytes32 scope) external view returns (address);
function capOf(address app, bytes32 scope, bytes32 subject) external view returns (uint256 limit, uint64 window, bool set);
function usageOf(address app, bytes32 scope, bytes32 subject) external view returns (uint256 used, uint64 windowStart);
function remaining(address app, bytes32 scope, bytes32 subject) external view returns (uint256);
```

Errors: `ScopeTaken`, `NotScopeOwner`, `ZeroOwner`, `NotConfigured(app, scope, subject)`,
`CapExceeded(subject, used, amount, limit)`. Events: `ScopeRegistered`, `DefaultCapSet`,
`SubjectCapSet`, `Consumed(app, scope, subject, amount, used, limit)`.

Four properties to keep verbatim in any port. Scope key is `keccak256(abi.encode(app, scope))`.
A subject is a hash chosen off chain, in our build `keccak256("discord:<guildId>:<userId>")`, so
one shared wallet keeps honest per-person accounting. It **fails closed**: an unconfigured scope
cannot spend anything and a default limit of 0 blocks every unnamed subject, which is the safe
default for a scope serving a known list. And a window rolls only on the next `consume` after it
expires, while `remaining()` treats an expired window as already rolled, so the view and the write
agree without a keeper transaction.

### 3.2 NanoChannel: the escrow and voucher blueprint

335 lines, 30 tests. This is the closest thing we have to a hire-escrow and its shape answers
several open questions in the lane's architecture at once.

```solidity
struct Channel { address payer; address service; uint256 deposit; uint256 redeemed;
                 uint64 closeAt; bool guarded; bool settled; }
struct Voucher { bytes32 channelId; bytes32 subject; uint256 cumulative; uint64 validBefore; }
struct Authorization { address from; uint256 value; uint256 validAfter; uint256 validBefore;
                       bytes32 nonce; bytes signature; }

bytes32 public constant VOUCHER_TYPEHASH =
  keccak256("Voucher(bytes32 channelId,bytes32 subject,uint256 cumulative,uint64 validBefore)");
bytes32 public constant CLOSE_TYPEHASH =
  keccak256("Close(bytes32 channelId,uint256 redeemed)");

function open(address service, bytes32 salt, bool guarded, address capOwner, Authorization calldata auth)
  external returns (bytes32 channelId);
function topUp(bytes32 channelId, Authorization calldata auth) external returns (uint256 deposit);
function redeem(bytes32 channelId, Voucher[] calldata vouchers, bytes[] calldata signatures)
  external returns (uint256 total);
function requestClose(bytes32 channelId) external returns (uint64 closeAt);
function withdraw(bytes32 channelId) external returns (uint256 refund);
function closeMutual(bytes32 channelId, bytes calldata payerSignature, bytes calldata serviceSignature)
  external returns (uint256 refund);

function channelIdOf(address payer, address service, bytes32 salt) public pure returns (bytes32);
function outstanding(bytes32 channelId) external view returns (uint256);
function subjectRedeemed(bytes32 channelId, bytes32 subject) external view returns (uint256);
function voucherHash(Voucher calldata v) public view returns (bytes32);
function closeHash(bytes32 channelId, uint256 redeemed) public view returns (bytes32);
function domainSeparator() public view returns (bytes32);
```

The five decisions inside it that are worth more than the code:

1. **Funding is `receiveWithAuthorization`, not `transferWithAuthorization`.** EIP-3009 requires
   `msg.sender == to` on receive, which is what lets a contract pull a signed deposit and closes
   the front-running window the transfer form leaves open. Verified today: FDUSD, USD1 and U all
   carry selector `ef55bec6`, so this pattern ports to BSC on any of the three.
2. **Vouchers are cumulative, not per call.** A lost voucher costs nothing and a replayed voucher
   pays nothing, because `redeem` pays only `cumulative - alreadyRedeemed` and reverts on a stale
   value. That removes a whole class of double-spend handling.
3. **Anyone may submit every state transition except close-request and withdraw.** Money always
   goes to the channel's recorded service, so a service can hand its batch to a relayer and the
   payer's wallet sends no transaction for the entire life of the channel.
4. **A cap owner separate from the payer.** A payer that never sends a transaction cannot configure
   anything on chain and delegating is safe because caps only ever **restrict** what may be
   redeemed while spending still needs the payer's own signature. That reasoning is directly
   reusable for a buyer-configured agent session.
5. **Signature hygiene the naive version skips.** `_recover` rejects `s > secp256k1n/2` (the
   malleable twin), rejects `v` outside {27, 28}, rejects a zero recovery and demands a 65-byte
   signature. `voucherHash` is public **so the off-chain signer can assert byte-for-byte agreement
   with the contract** rather than trusting two implementations to match. There is a test named
   `test_VoucherHashMatchesTheSpec` doing exactly that.

Close is a challenge window: `requestClose` sets `closeAt = now + challengeWindow` and the service
can still redeem until then or both sides sign the same `Close(channelId, redeemed)` digest and it
settles immediately. Pinning the digest to `redeemed` means a stale co-signature is worthless once
the service redeems more.

### 3.3 ServiceRegistry: the on-chain listing hygiene blueprint

221 lines, 11 tests. This is not our identity source (ERC-8004 is), but every rule in it is a rule
the marketplace needs somewhere:

```solidity
struct Service { bytes32 namespace; address lister; address payTo; address asset;
                 uint256 priceAtomic; bool verified; bool enabled;
                 string name; string description; string endpoint; }

uint256 public constant MAX_NAME = 40;
uint256 public constant MAX_DESCRIPTION = 200;
uint256 public constant MAX_ENDPOINT = 400;

function serviceIdOf(bytes32 namespace, string calldata name) public pure returns (bytes32);
function claimNamespace(bytes32 namespace) external;
function transferNamespace(bytes32 namespace, address newAdmin) external;
function setMaxPrice(bytes32 namespace, uint256 maxPriceAtomic) external;
function register(bytes32 namespace, string calldata name, string calldata description,
                 string calldata endpoint, address payTo, address asset, uint256 priceAtomic)
  external returns (bytes32 id);
function setPrice(bytes32 id, uint256 priceAtomic, address payTo) external;
function setVerified(bytes32 id, bool verified) external;
function setEnabled(bytes32 id, bool enabled) external;
function isBuyable(bytes32 id) external view returns (bool);   // lister set && verified && enabled
```

The three rules to lift whatever the storage layer is:

- **A price change drops verification.** `setPrice` clears `verified` and emits
  `ServiceVerified(id, sender, false)`, so what an admin approved is what stays buyable and nobody
  is surprised by a price they did not sign off. This is the cleanest answer to the stale-quote
  problem the lane's architecture worries about.
- **A namespace admin sets a price ceiling** that every listing in it must sit under.
- **The endpoint must be HTTPS**, checked as a `bytes8` prefix compare against `"https://"` with a
  length band of 12 to 400. A registry other agents read should not advertise a plaintext endpoint.
- Deterministic ids: `keccak256(abi.encode(namespace, keccak256(bytes(name))))`, so an off-chain
  catalogue can address a listing without reading the chain first.
- Either the lister or the namespace admin can disable a listing and disabling is separate from
  un-verifying, so a takedown and a re-review are different acts.

### 3.4 The token interface and the one line in it that is a trap

`IUSDC.sol` is the EIP-3009 slice: `transfer`, `balanceOf`, `decimals`,
`receiveWithAuthorization(from, to, value, validAfter, validBefore, nonce, signature)` and
`authorizationState(authorizer, nonce)`. The nonce is a random `bytes32` chosen by the signer, not
a sequential counter, which is worth stating because reviewers assume otherwise.

`_pull` wraps the receive call in a balance check before and after and reverts `TransferFailed` if
the delta is not exactly the authorized value. That is defensive against a token that silently
no-ops and it costs two extra reads.

The trap is in the doc comment: "Every amount in MoonWalk is the 6 decimal ERC-20 view." That
sentence is Arc-only and it is exactly the assumption that has to be deleted rather than adapted.

## 4. The BSC spine we already built and forgot: touchstone

`work/bnb-era/touchstone`, written 2026-08-09 for this same hackathon, 1,052 lines of TypeScript
over viem 2.55.0. It typechecks clean and its live probe passed today. It has **no unit tests**,
which is the one honest gap. This is the biggest reuse win in the pass and it is not mentioned
anywhere in `ARCHITECTURE.md`, `ARCHITECTURE-PART-2.md` or `ONBOARDING.md`.

### 4.1 The deployment table, re-verified where it matters

```ts
bsc: {                                   // chainId 56
  identityRegistry:  '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry:'0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  agenticCommerce:   '0xEa4DAa3100A767e86FDed867729ae7446476EBA6',  // ERC-8183 escrow
  evaluatorRouter:   '0x51895229E12F9876011789B04f8698af06cCD6DA',
  optimisticPolicy:  '0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5',
  paymentToken:      '0xcE24439F2D9C6a2289F741120FE202248B666666',  // U, 18 decimals
  identityDeployBlock: 79_027_268n,
  explorer: 'https://bscscan.com',
},
bscTestnet: {                            // chainId 97
  identityRegistry:  '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  reputationRegistry:'0x8004B663056A597Dffe9eCcC1965A193B7388713',
  agenticCommerce:   '0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE',
  evaluatorRouter:   '0xd7d36d66d2f1b608a0f943f722d27e3744f66f25',
  optimisticPolicy:  '0x4f4678d4439fec812ac7674bb3efb4c8f5fb78a6',
  paymentToken:      '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565',
  identityDeployBlock: 84_555_147n,
},
```

Re-verified today on chain 56: identity registry, reputation registry, escrow and payment token
all answer. **Not verified**: every chain-97 address above, the two `identityDeployBlock` values,
`evaluatorRouter` and `optimisticPolicy`. Those four are recorded here as prior work, not as facts.

The file's own comments carry two traps that cost us time once and should not cost it twice:

1. **The BSC testnet registry addresses also have code on BSC mainnet.** Point at the wrong pair
   and every read succeeds while returning a live but empty registry, so the marketplace shows zero
   agents and looks like a UI bug.
2. Public BNB RPC endpoints refuse `eth_getLogs`. A one-block range answered
   `{"code":-32005,"message":"limit exceeded"}`. R01 later pulled logs from a single block on an
   archive endpoint, so this is endpoint-specific and not a chain property, but the design
   consequence stands: **do not put log scanning on the day-one path.**

### 4.2 The assert-first gate

`assertIdentityRegistry` throws rather than returning a bad handle. It checks `getChainId()`
against the expected id, checks there is code at the address, then demands
`name() == "AgentIdentity"` and `symbol() == "AGENT"`, then demands that an agent resolves, then
finds the population. Its error strings name the likely misconfiguration, which is the difference
between a five-minute fix and an afternoon.

`findHighestAgentId` doubles from 1 until `ownerOf` misses, then bisects, about `2*log2(n)` calls
and roughly 36 for a quarter of a million agents. R01 later found the cheaper route (`_lastId` in a
single `eth_getStorageAt` at slot
`0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00`), so the storage read should
replace the binary search, with the binary search kept as the fallback that needs no slot knowledge.

One correction the new build must apply: the gate hard-codes `ownerOf(1)` and the indexer starts at
id 1. R01 verified agentIds start at **0** (`ownerOf(0)` returns a real owner, agent name `dAi`), so
the range is `0 .. lastId-1` and starting at 1 silently drops agent 0.

A second correction: `chain.ts` states the validation registry is "deliberately absent" because
"the two sources we checked disagree on whether a mainnet deployment exists at all". R01 proved it
exists at `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`, version `2.0.0`, with zero validations
across 1,999 sampled agents. The address changes, the conclusion does not: there is nothing to
rank on there.

### 4.3 The enumerator

`readIdentities` batches `ownerOf`, `tokenURI` and `getAgentWallet` for a range of ids into one
`multicall` at `0xcA11bde05977b3631167028862bE2a173976CA11` with `allowFailure: true`, skips any id
whose owner read failed and maps a zero `agentWallet` to `null`. The escrow indexer does the same
over `getJob(1..jobCounter)` at a batch size of 400 and skips jobs with a zero provider as empty
slots. Both are the pattern R01 measured at 183 agents per second, so the paid-for code and the
measured throughput agree.

### 4.4 The four-category classifier, already written for this rubric

`src/agents.ts` carries the exact four program categories and a term list per category, matched
OASF-skills-first then declared-text-second, with the basis recorded so the UI can say how strong
the assignment is:

```ts
CATEGORIES = ['rebalancing', 'grid', 'yield', 'healthFactor']
basis: 'oasf' | 'text' | 'none'

rebalancing:  ['rebalanc','lp range','liquidity range','concentrated liquidity','reposition','range order']
grid:         ['grid trad','grid bot','grid strateg','dca grid','ladder order']
yield:        ['yield optimi','yield farm','apr','apy','auto-compound','autocompound','vault strateg','staking reward']
healthFactor: ['health factor','liquidation','collateral ratio','loan-to-value','ltv','margin call','undercollateral']
```

The reasoning behind it is the reusable part: 8004scan exposes no category filter and its
tags/categories fields come back empty on most records, so the only machine-readable capability
taxonomy real BSC agents populate is **OASF `skills` and `domains` inside the registration file's
`services` array**. Category assignment is therefore derived from the agent's own declaration and
where that is absent it falls back to name and description and marks itself weaker. `basis: 'none'`
is a real state, not an error.

`AgentRecord` is the indexed shape it produces: `agentId`, `owner`, `agentWallet`, `uri`, `name`,
`description`, `serviceCount`, `endpoints[]`, `skills[]`, `x402Support`, `active`, `categories[]`,
`basis`, `unresolved`. `resolveRegistration` handles `data:` URIs inline (base64 or percent-encoded)
and `http(s)` with an 8-second `AbortSignal.timeout`, returning `null` rather than throwing, so one
bad listing cannot stop an index run. Note the gap against section 2.5: **that fetch has no SSRF
guard.** Wiring `_url_is_public` in front of it is a required change, not an optional one.

### 4.5 The ERC-8183 escrow ABI and its status enum

```solidity
function jobCounter()    external view returns (uint256);
function paymentToken()  external view returns (address);
function platformFeeBP() external view returns (uint256);
function getJob(uint256 jobId) external view returns (
  uint256 id, address client, address provider, address evaluator, string description,
  uint256 budget, uint256 expiredAt, uint8 status, address hook,
  uint256 submittedAt, bytes32 deliverable);   // returned as one tuple
```

```ts
JOB_STATUS = ['Open','Funded','Submitted','Completed','Rejected','Expired']  // do not reorder
isPaid(status)   = status === Completed          // the only state where the provider was paid
isFunded(status) = Funded | Submitted | Completed | Rejected   // client's money went in
```

The enum order is read from `bnb-chain/apex-contracts` `contracts/IACP.sol` and getting it wrong
silently mislabels every job, so it carries a do-not-reorder comment. Jobs are **1-indexed**:
`getJob(0)` returns an empty struct. The `evaluator` and `hook` fields are the two hooks a
marketplace could use for validator-gated release without deploying its own escrow.

## 5. The trust machinery: audit chain, canonical bytes, sanitizer

### 5.1 The hash chain and the third check that matters

Two independent implementations exist, one Python and one TypeScript. They agree on the design.
`work/okx-genesis/cassandra/src/cassandra/chain.py` (143 lines) and
`work/calle-mps/apps/typescript/phone-approval-gate/src/audit.ts` (299 lines).

The entry shape:

```python
@dataclass(frozen=True)
class Entry:
    kind: str        # "genesis" | "prediction" | "settlement"
    seq: int
    prev_hash: str   # "" only for genesis
    ts: int
    origin: str      # "house" | "order"
    body: dict
    entry_hash: str = ""
    sig: str = ""

    def hashing_body(self) -> bytes:      # excludes entry_hash and sig
        return canonical_bytes({k: v for k, v in asdict(self).items()
                                if k not in ("entry_hash", "sig")})
```

`append` refuses an unknown kind, an unknown origin, a `seq` that is not the current length, a
`prev_hash` that is not the head, a first entry that is not genesis, a hash that does not match the
body and an unsigned entry. Seven invariants enforced at write time, so a broken chain cannot be
created rather than merely being detected later.

`walk(pubkey)` recomputes every hash, follows every link, checks every ed25519 signature, then
returns `{ok, checked, failures[]}` where each failure names `seq`, `check` and `issue`. The live
endpoint served `{"ok":true,"checked":449}` at one point in its life, which is the shape of evidence
a judge can hit.

**The third check is the one a plain append-only log cannot do.** Both implementations recompute the
*decision* from the recorded inputs using the same function the live path used. In Cassandra the
strategy is a pure committed function over a committed input snapshot, so a rewritten entry fails
re-derivation even when its hash and signature are recomputed perfectly with the real key. In the
TypeScript version the comment says it plainly: "A record whose verdict was edited by hand fails on
the third check even when the chain is valid." Any agent-performance record we publish should carry
its inputs and be re-derivable, not merely hash-linked.

### 5.2 Canonical bytes

17 lines and every signature and every anchor hash depends on it, so it is the first thing to port:

```python
def canonical_bytes(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")

def sha256_hex(obj) -> str:
    return hashlib.sha256(canonical_bytes(obj)).hexdigest()
```

The TypeScript twin sorts object keys recursively for the same reason. A browser verifier reproduced
these bytes with WebCrypto and matched what Python signed, which is the proof that the format is
genuinely canonical and not merely consistent with itself.

### 5.3 The untrusted-content sanitizer

`work/all-things-agentic/kilter/kilter/safety/guard.py`, 51 lines, plus `redflags.py`, 124 lines.
The architecture is two layers and the split is the reusable idea: a **deterministic gate that runs
before any model call and cannot be overridden by model discretion**, then a guardrail seam on top
for a hosted screening API. The comment states the invariant: "an injected instruction can flag here
but can never bypass the deterministic gate, which runs regardless."

The injection pattern list is directly usable for the listing-copy scan in section 1.4:

```python
_INJECTION = [re.compile(p, re.I) for p in (
    r"ignore (all|any|the|your|previous|above)",
    r"disregard (all|the|your|previous|above)",
    r"forget (all|everything|your|the)",
    r"you are (now )?(a|an|my)\b",
    r"system prompt", r"\bnew instructions?\b", r"override (the|your|all|safety)",
    r"mark me (as )?(cleared|fine|healthy|ready)", r"\bbypass\b", r"\bjailbreak\b",
    r"pretend (to be|you are|that)",
)]
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE = re.compile(r"\+\d[\d\s\-().]{6,}\d|\b\d{10}\b")
```

`GuardResult(flagged, categories[], sanitized)` with a `verdict()` string and both directions
screened: `screen_input` before the model, `screen_output` before anything is published. The
redaction substitutes rather than rejecting, so a flagged listing still has a renderable form.

`redflags.py` itself is a clinical triage gate and is not transferable. What transfers is its
structure: a frozen `RedFlag(key, severity, reason, patterns)` record with a two-level severity plus
the discipline of tuning patterns against real false positives (its comment notes that "chest press"
must not trip the chest-pain flag, which is exactly the "console" must not yield "sol" problem in
section 1.5). Any pattern list we ship needs its own false-positive test row.

### 5.4 The invocation resolver

`cassandra/invocation.py`, 224 lines, is the never-422 rule as code. `_flatten` walks a payload to
depth 4, reads a priority key list first (`market`, `market_code`, `symbol`, `pair`, `ticker`,
`instId`, `asset`, `input`, `query`, `prompt`, `text`, `message`, `messages`, `content`, `args`,
`params`, `body`, `data`, `payload`, `q` and more) then every other key, so an unknown wrapper still
works. A field carrying both parts of the answer wins outright; a field naming only one part is held
back in case a later field supplies the rest; then all candidates are joined and rescanned. The
resolution reports its own `source`: `explicit`, `asset-only`, `split`, `default` or `unsupported`,
and the response echoes it. Recognised-but-unsupported values are refused **with the offer list at
200**, never silently substituted. The raw candidate string is truncated to 300 characters and
returned as `seen`, which is what made the next probe diagnosable.

For this build the shape ports and the vocabulary does not: the key list and the flattening are
reusable, the market codes and coin aliases are Cassandra's domain.

## 6. The three prior lane passes, judged section by section

All three were written 2026-08-27, before anyone measured the catalogue. Verdicts below are
**keep**, **correct** (the idea survives, a stated value or reason is wrong), **invalidated**
(measurement kills it) or **never verified** (an invented number nobody checked).

### 6.1 ARCHITECTURE.md, sections 1 to 11

| § | what it says | verdict |
| --- | --- | --- |
| 1 | Executive summary. Three criteria, no weights. "Around 200k ERC-8004 agents already live on BSC, so the marketplace does not create agents, it indexes and ranks them" | **correct.** The count is 334,997 today. The framing needs the measurement bolted on: indexing 335k agents of which 2 in 400 have a callable endpoint is not a discovery product on its own |
| 2 | System diagram, with three named boundaries: custody, sanitize, signed | **keep.** The three boundary notes are the most reusable lines in the document. One box needs a footnote: the validation registry is real but has never been used |
| 3.1 | Browse-first frontend, four equal category tiles, three clicks to hire, wallet only at hire, "we reuse our own EIP-3009 signing page" | **keep.** The reuse claim is now concrete: the page exists (section 2.1) and the BSC domain values are verified |
| 3.2 | Indexer with the 8004scan Pro API as **primary** and `eth_getLogs` as fallback | **invalidated on both halves.** 8004scan's BSC index reported checkpoint 119,687,744 with status `down` and its newest indexed BSC feedback at block 119,137,534 against a head of 120,025,025 and it does not list the validation registry at all. `eth_getLogs` is refused by public BNB RPCs. The verified path is the one our own code already uses: contiguous ids through Multicall3, about 30 minutes and 670 `eth_call`s for the whole registry. Keep the resolver, the probe worker and the sanitize step |
| 3.3 | Stateless API, free discovery, paid hire, well-known route | **keep**, plus two rules from section 1: every invited route answers a payable 402 and free info lives at `/schema` off the paid path |
| 3.4 | Matching: gate on liveness and capacity, then rank. Explore quota 10%, UCB bonus, 30-day half-life, shrink toward the category mean, deterministic tie-break | **keep the shape, never verified on the numbers.** 10%, the UCB constant and the 30-day half-life are invented. R13 has real operator practice to pin them to. The gate-then-rank order and the published tie-break (lower price, more recent passing validation, more distinct clients, lower agentId) are the parts a judge can recompute, so they stay |
| 3.5 | x402 and facilitator. Envelope, one-object challenge, real decimals | **keep the two interop rules, correct the token story.** It says the network and token come from source, which is right, but the design has to state that BSC USDT supports neither EIP-3009 nor EIP-2612, so "one signature" is only true on U, FDUSD or USD1 |
| 3.6 | HireEscrow as payee, validator-gated release, fee in basis points, fail closed to refund | **correct.** The design is sound and the buyer-takes-the-work-then-times-out hole is already closed. What changed: BNB's own ERC-8183 escrow is live on BSC with 28,244 completed jobs, an `evaluator` field, a `hook` field and `platformFeeBP` 0. Deploying our own now needs an explicit reason and "the official one exists and we index it" is the stronger story |
| 3.7 | Disputes, three tiers, Tier 1 automated through the Validation Registry | **invalidated at Tier 1.** Zero validations and zero validators across the whole network and 8004scan's global stats agree at `total_validations: 0`. A tier that has never fired anywhere is a published policy with a stub, not a mechanism. Tiers 2 and 3 stand |
| 3.8 | Three wallets, one custody rule and the honest statement that EIP-3009 is single-shot so the MVP has no session cap | **keep, unchanged.** This is the cleanest honesty in the document and it should survive verbatim in spirit |
| 4 | On-chain versus off-chain table, the indexed agent document, recompute-at-render, origin tags, the `trusted-v1` client set with a scaling rule and a long-tail rule | **keep the disciplines, correct two facts.** The example document prices in USDT at `"priceAtomic": "10000"`, which is 6-decimal thinking; BSC is 18. And the payout wallet **is** readable on chain for essentially every agent through `getAgentWallet` / `getMetadata(id,"agentWallet")`, verified 135/136 on a stratified sample and 4/4 today. The measurement that "0 of 400 declare a payout wallet" is about the registration JSON, not the registry. Never verified: `trusted-v1`. R01 found 265 of 388 sampled feedback entries came from **one** address, so a naive trusted set is one address wearing a badge |
| 5.1 to 5.6 | Discover, compare, hire, deliver, settle, rate | **keep.** 5.3 step 2's live-price reconciliation before signing is now essential rather than nice: a cached quote the agent no longer honours cannot be signed against |
| 5.7 | Dispute flow | **correct**, same Tier 1 problem as 3.7 |
| 6 | The nine sections folded into one flow, with three contradictions resolved (escrow versus direct pay, display score versus routing utility, subscriptions as a built layer) | **keep all three resolutions.** They are still the right calls |
| 7 | Tech stack | **keep with one demotion.** 8004scan moves from primary to cross-check. "At 200k rows the whole index fits in memory on one node" survives at 335k rows: R01 measured 0.27 GB for a full sweep |
| 8 | Build order, days 1 to 13 from Aug 27 | **invalidated by the calendar.** Days 1 to 9 of that plan are in the past. Today is Sep 5 and the build closes Sep 9. This section has to be rewritten as a four-day plan, not adjusted |
| 9 | Rubric alignment table, no weight column | **keep.** It matches the live rubric, including the absence of published weights |
| 10 | Risks and open questions | **keep.** Several are now answered: 200k scale (measured), wash detection (still open), reputation set (worse than feared) |
| 11 | Build-time inputs to read from source | **largely discharged** by R01, R03, R04 and the payment-rail file. Keep it as the ledger of what has been closed and by which pass |

### 6.2 ARCHITECTURE-PART-2.md, sections 11 to 18

| § | what it says | verdict |
| --- | --- | --- |
| 11.1 | BSC is the system of record. "Our two EIP-3009 settlement candidates are U and USD1. U is the neutral default. USD1 carries a political association we do not need on a judged demo" | **keep and it is now verified.** U really does carry `transferWithAuthorization`, `receiveWithAuthorization`, `authorizationState` and `permit`, at 18 decimals, with domain `("United Stables","1",56,token)`. This was an unverified assertion when written and it turns out to be right. The optics argument for preferring U over USD1 is a judgment and stands on its own |
| 11.2 | Buyer-gasless hire is MVP through the facilitator; MegaFuel or Particle paymasters are stretch; Altana sessions are the agent-side story | **keep the three-way split.** MegaFuel, Particle and their pricing are never verified. The observation that a feedback write is a registry call and not a token transfer, so the facilitator does not cover it, is a genuinely useful catch |
| 11.3 | Greenfield for `feedbackURI` bodies and reputation snapshots, hash-anchored, pre-funded past judging because a dry payment account can delete data | **keep as stretch.** The deletion behaviour is never verified and it is the whole reason the section is cautious, so it stays a stretch until someone reads the billing docs |
| 11.4 | opBNB deliberately not used, with the bridge-tax reasoning | **keep verbatim in spirit.** A documented non-use reads as a decision. The reasoning is still correct |
| 11.5 | Oracles are the marketplace's own reference, not a feed to the agents. Keyless market data for USD display now, on-chain oracle reads with escrow later | **keep the scoping.** The Binance Oracle feed-registry address and read signature are never verified |
| 11.6 | Layer-to-rubric table | **keep** |
| 12.1 | B402 closes Part 1's open values. Testnet open, mainnet gated, facilitator sponsors gas both sides, non-custodial. Recommends B402 primary with our self-hosted relayer as fallback and reads Part 1's "on mainnet" green bar down to a dust-value upgrade | **unverified throughout, keep the fallback architecture.** No B402 endpoint was called in this pass or recorded as called in any prior one. The facilitator-swap-behind-one-interface design is right regardless of which one lands. R03 owns the values |
| 12.2 | Token table: U and USD1 as EIP-3009, USDT and USDC as Permit2 | **correct the reason, keep the routing.** USDT and USDC on BSC support neither EIP-3009 nor EIP-2612, so Permit2 `SignatureTransfer` is not a preference, it is the only signature path they have. Both are 18 decimals. Circle publishes no native USDC on BSC, so `0x8AC7…580d` is Binance-Peg. The note that "BSC USDT does not use the 6 decimals some reference code assumes" is right and load-bearing |
| 12.3 | Binance Web3 Wallet as a first-class EIP-1193 connector, WalletConnect v2 outside the app, no proprietary SDK | **never verified.** Plausible and cheap, but the injection path and connector package names are unread |
| 12.4 | Keyless market data for USD display and the independent performance check against klines beside an agent-declared number | **keep the idea, endpoints never verified.** The independent-check pattern is the strongest Data Quality lever in Part 2 and it costs almost nothing on top of the report |
| 12.5 | Binance Pay, Login and KYC are out of scope with reasons | **keep.** Naming a non-use with its access reason is worth more than a vague claim |
| 12.6, 12.7 | Prize mapping and the MVP/stretch split | **keep, re-time.** The split logic is right, the day counts are not |
| 13.1 | The Altana correction: a home-grown SpendGuard is our Keystore, our explorer, our claim, so it does not qualify. The qualifying path uses the Altana SDK so the session lands in Altana's Keystore | **keep. This is the most valuable single correction in Part 2** and it is exactly the kind of mistake that loses a track while the code works |
| 13.2 | Per-partner design, dependency and prize | **keep.** The TermiX report as a hard eligibility gate matches the live rubric. The AltLLM caveat (wire only if a real call drops into our existing OpenAI-compatible layer) is the right posture |
| 13.3 | Partner-to-feature-to-prize table with a minimum bar per track | **keep.** The "minimum bar to qualify" column is the part to carry forward |
| 13.4 | Stretch order: TermiX report, Altana session, PancakeSwap read-only, AltLLM last | **keep the order, re-time the runway** |
| 13.5 | Pre-build gates per partner track, including the anonymous Keystore Explorer URL as a day-one gate | **keep.** An anonymous-URL gate is the correct shape for every judged link, not just Altana's |
| 14.1 to 14.12 | Completeness roadmap with fast-follow and later labels | **keep as roadmap, with one promotion.** 14.2 (per-agent uptime history and a status page) was labelled fast-follow because it is net-new surface. With 2 of 400 endpoints answering, **uptime history is the discriminating data product**, not a nice-to-have and it is the cheapest thing on the list that a rival directory will not have |
| 15 | One-build-every-track table with a Status column | **keep.** The Status column is what stops a reader mistaking the design for the shipped set |
| 16 | Honesty and access, split into wire-today, needs-a-key, needs-a-partnership, needs-money | **keep, nearly intact.** This is the best section in either document and it is the one a judge or a maintainer would respect most |
| 17 | What actually ships in the days left | **invalidated by the calendar**, same as Part 1 section 8 |
| 18 | Build-time inputs | **largely discharged.** ERC-8004 addresses and ABI (R01), token capability and decimals (payment rail plus this pass), Multicall3, PancakeSwap and 8004scan (R05, R08). Still open: B402 routes, Binance Web3 Wallet, market-data hosts, Binance Oracle, Altana SDK parameter shapes, Greenfield billing |

### 6.3 ONBOARDING.md, sections A to J

This is the strongest of the three documents and almost all of it survives. It is the only one
grounded in something that happened rather than something designed.

| § | verdict |
| --- | --- |
| A | **keep.** Six real rejections mapped to six gates. Section 1.1 above is the fuller version with the log lines, the timings and the seventh row (the 422) broken out |
| B | **keep.** The lifecycle is right, including reject-and-fix-on-the-same-id and refusing an edit while under review |
| C | **keep.** Every threshold in the lint is a number a live marketplace enforced. Add the injection pattern list from section 5.3 so the scan is code rather than an intention |
| D | **keep.** Six hard gates, each traceable to a real failure. Add the day-one lesson from `REQUIREMENTS.md` gate 1: a credential on the critical path is applied for on day one |
| E | **keep and promote.** Scheduled probes with delisting on sustained failure was written as hygiene. It is the product: HTTP and contact liveness are the two things that actually knock an agent offline and both pass a one-time check |
| F | **keep, now with a verified table.** Section "Interfaces and constants" below supplies the real decimals and domains that section F says to read at index time |
| G | **keep.** The `origin` tag is a structural invariant in our own code, not a display rule and that is the version to build |
| H | **keep and add the measured floors** from section 1.7 so the lint has thresholds instead of adjectives |
| I | **keep as the go-live checklist.** Ten lines, all of them earned |
| J | **keep** as the mapping back into Part 1 |
| Build-time inputs | **discharged** for ERC-8004 and the token values, still open for the partner SDKs |

## 7. Prior agent-behaviour work: what exists, what does not

Searched `work/` and the workspace root by name and by concept. Results, honestly:

| name searched | what actually exists | worth lifting |
| --- | --- | --- |
| `zeroclaw` | **No local lane.** It resolves to `zeroclaw-labs/zeroclaw-plugins#30`, a Solana payment-suite bounty PR, documented in `work/pr-sweep/2026-08-02-zeroclaw-30.md`. No clone on disk, so no code to read | The transferable lesson is process, not code: fork-PR workflows sit at `action_required` until a maintainer approves them, so run the gate locally and put the numbers where the maintainer reads them |
| `zeroclg` | **Nothing.** No file, path or mention anywhere in the workspace | nothing |
| `agency-os` | Exists at the workspace root, `agency-os/`, a Next.js 16 plus better-sqlite3 plus zod agency-operations app (leads, estimates, proposals, projects, automations, an intake form, a cron route, a token-scoped client portal at `/p/[token]`) | Almost nothing for this build. It is business ops, not agent behaviour. The one crossover is the token-scoped share link pattern for a portal a client opens without an account |
| `strk20` | `work/strk20/`, a Starknet lane (starter kit, `veilcast`, `starknet-privacy`, a roadmap) | Nothing for BSC. Different VM, different account model |
| `arena` | **No agent lane.** The word resolves to a static arena **allocator** in `telegraph/scorer-lab` docs and to unrelated JSON payloads | nothing |
| audit hash chain | Two real implementations, section 5.1: `cassandra/src/cassandra/chain.py` and `calle-mps/apps/typescript/phone-approval-gate/src/audit.ts` | Copy the code. Both are complete, tested and small |
| untrusted-content sanitizer | `all-things-agentic/kilter/kilter/safety/guard.py` plus `redflags.py`, section 5.3 | Copy the injection pattern list and the two-layer architecture. Leave the clinical patterns |
| agent-safety runtime | The kilter safety package (deterministic gate before any model call, guardrail seam on top) and the calle approval-gate family (`gate.ts` 406 lines, `decide.ts` 360 lines, `config.ts`, `secret.ts`, `reserve.ts`, plus a `docs/threat-model.md`) | Copy the rule: the safety decision is a pure function over recorded inputs, so it is re-derivable from the audit record. Copy the threat-model habit. The phone and call machinery is not relevant here |
| trust decay | **Nothing in our own prior code.** No half-life, no decay function, no reputation aging anywhere in a shipped build of ours. `three/research/tools/r13-reputation-math.py` is this cycle's work, not prior art | Nothing to lift. The 30-day half-life in `ARCHITECTURE.md` 3.4 is invented and has to come from R13 instead |

Dead paths in old notes, so nobody hunts for them:

- `work/okx-genesis/genesis` **does not exist.** The Genesis product was removed on 2026-08-01 to free disk. Its listing linter, the one that ran the six checks in section 1.4, is gone with it. `cassandra/` survives and carries the canonical-bytes, signer and x402 wiring that Genesis originated.
- `three/research/MEASUREMENT.md`, cited by `three/README.md` as the evidence file, **does not exist.** The evidence is spread across `R01` to `R15`, `census-bsc-2026-08-27.tsv` and `sample-400-tokenuris-2026-08-27.json`.
- `three/design/` and `three/decisions/` are **empty directories.** The 16 documents `three/README.md` promises have not been written yet, which is what this research cycle is feeding.
- `work/bnb-build-era/old/reuse/`, `old/research/` and `old/design/` are **empty.** `old/pre-reframe-20260827T203407/` holds an earlier copy of the same three documents and `old/raw/` holds the 2026-08-27 hackathon page and launch blog captures.

## Interfaces and constants

Everything here was called today against BSC mainnet (chain id 56) over
`https://bsc-rpc.publicnode.com` with cast 1.7.1 or lifted from our own code and then re-called.

### BSC addresses, verified today

```
ERC-8004 Identity Registry     0x8004A169FB4a3325136EB29fA0ceB6D2e539a432   name AgentIdentity, symbol AGENT
ERC-8004 Reputation Registry   0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
ERC-8183 AgenticCommerce       0xEa4DAa3100A767e86FDed867729ae7446476EBA6   codesize 130 (proxy), platformFeeBP 0
  paymentToken()               0xcE24439F2D9C6a2289F741120FE202248B666666
Multicall3                     0xcA11bde05977b3631167028862bE2a173976CA11
U (United Stables)             0xcE24439F2D9C6a2289F741120FE202248B666666   18 dec, impl 0xbef21313c69c009fd7d9510a8d3a481a32473dfc
FDUSD                          0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409   18 dec, impl 0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50
USD1                           0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d   18 dec, impl 0x694aa534bdef8ed63244eb902e7914e527891f08
```

Recorded from our prior code, **not re-verified in this pass**: `evaluatorRouter`
`0x51895229E12F9876011789B04f8698af06cCD6DA`, `optimisticPolicy`
`0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5` and every BSC-testnet address in section 4.1.

### Signature capability, per token, on the implementation not the proxy

| token | `transferWithAuthorization` `e3ee160e` | `receiveWithAuthorization` `ef55bec6` | `cancelAuthorization` `5a049a70` | `authorizationState` `e94a0102` | `permit` `d505accf` |
| --- | --- | --- | --- | --- | --- |
| U | yes | yes | **no** | yes | yes |
| FDUSD | yes | yes | **no** | yes | yes |
| USD1 | yes | yes | yes | yes | yes |

The trap that makes this table worth re-deriving rather than trusting: **a proxy holds no dispatch
table**, so grepping the proxy bytecode reports every selector absent. U's proxy is 2,007 bytes and
contained none of these; its implementation is 12,027 bytes and contains five of them. Always read
the EIP-1967 slot `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` first, then
grep the implementation, then confirm with a live `authorizationState` call.

### EIP-712 domains, derived and matched against on-chain `DOMAIN_SEPARATOR()`

Domain typehash `0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f` over
`EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)`.

| token | `name` | `version` | on-chain `DOMAIN_SEPARATOR()` |
| --- | --- | --- | --- |
| U | `United Stables` | `1` | `0x358738403e5a61fdc30a8be78a60f289cbe4d2545b735a344b6229c70c1679b6` |
| FDUSD | `First Digital USD` | `1` | `0xac2ff863e00ee93e90d01514d46b9b8179ca650e856138a6d8aea00702ca62a0` |
| USD1 | `World Liberty Financial USD` | `1` | `0x5d939dc193fd011c5e26fb861450a696546a09db6b26db26501fe354ba3ed4ba` |

Version is `1` on all three. For U, versions `2`, `1.0` and `v1` and the short name `U` were each
computed and each failed to match, so it is settled by exclusion as well as by match.

Struct typehashes, unchanged from the payment-rail file and reusable as constants:

```
TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)
  -> 0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267
ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)
  -> 0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8
```

### Reproducing the two numbers that matter

```bash
export PATH="$PATH:$HOME/.foundry/bin"
export RPC=https://bsc-rpc.publicnode.com

# the settlement-token capability check, on the implementation
SLOT=0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
IMPL=0x$(cast storage 0xcE24439F2D9C6a2289F741120FE202248B666666 $SLOT --rpc-url $RPC | tail -c 41)
cast code $IMPL --rpc-url $RPC | grep -c e3ee160e
cast call 0xcE24439F2D9C6a2289F741120FE202248B666666 'DOMAIN_SEPARATOR()(bytes32)' --rpc-url $RPC

# the whole ERC-8183 settled-money history, 456 s, no key, no archive node
cd work/bnb-era/touchstone && bun install
RPC_URL=$RPC bun run probe                       # assert-first gate
RPC_URL=$RPC bun run scripts/index-jobs.ts       # writes data/jobs-bsc.json
```

## Design implications for the marketplace

1. **Start from touchstone, not from an empty repo.** It has the verified addresses, the enumerator,
   the classifier for exactly the four rubric categories, the assert-first gate and a live probe that
   goes green today. Four days from the close, that is the difference between a demo and a claim.
   Four things change on the way in: start ids at 0 not 1, replace the binary search with the
   `_lastId` storage read, put the SSRF guard in front of `resolveRegistration` and add the
   validation registry address with a note that it has never been used.

2. **Rank on ERC-8183 settled money and say out loud how concentrated it is.** Nothing else indexes
   that escrow. 28,244 completed jobs and 292.24 U paid is a real signal and it is the only signal on
   BSC that cost someone money to create. The honest framing is stronger than the flattering one: 97
   providers, 28 with any completed job, one address holding 99% of jobs and 18 of the 28 with a
   single-client record. A marketplace that shows that, labels it and weights a one-client record
   down is demonstrating Data Quality rather than asserting it.

3. **Settle in U by default.** It is the token BNB's own ERC-8183 escrow pays in, it carries the full
   EIP-3009 motion so the buyer signs once and sends no transaction, its domain is proven and at
   956M supply it is deeper than FDUSD and closer to USD1. Keep USD1 as the configured alternate and
   FDUSD as the second. Ship USDT behind a labelled Permit2 path, because USDT has no signature path
   of its own. Whether B402 quotes U is the one thing that could overturn this, so it is the first
   question R03 has to answer.

4. **Delete every 6 as a decimal count.** Our own signing page, paywall, config, `IUSDC.sol` doc
   comment and price constants are all 6-decimal Arc code. Every BSC stablecoin checked is 18. This
   is the single highest-probability silent failure in the whole port, so it wants a test that reads
   `decimals()` from chain and asserts against the configured value at boot.

5. **Liveness and uptime history are the product, not hygiene.** Two of four hundred agents publish
   an endpoint another program could call and one of those two is a placeholder. A directory over
   335k rows is worthless; a directory that says which of them answered, when and for how long is
   the scarce thing. That promotes `ARCHITECTURE-PART-2.md` 14.2 from fast-follow into the build.
   It also makes `ONBOARDING.md` section E the core data pipeline rather than a background job.

6. **Publish the validation tier as policy and stub the mechanism.** Zero validations and zero
   validators network-wide means an ERC-8004-validation-gated release has never fired anywhere. Write
   the tier, name the validator address, ship tiers 2 and 3 and be explicit that tier 1 is
   unexercised. Claiming it works would be the kind of unverified assertion this whole cycle exists
   to avoid.

7. **Index the official escrow before deploying our own.** ERC-8183 on BSC already has the lifecycle,
   an `evaluator`, a `hook` and a zero platform fee. NanoChannel and SpendGuard remain the blueprint
   for what we control (per-subject caps, cumulative vouchers, mutual close) and SpendGuard is still
   the right shape for the Altana story, but `ARCHITECTURE.md` 3.6's HireEscrow now needs a reason to
   exist beside the official contract rather than instead of it.

8. **Run the six listing gates as probes, publish the results and delist on sustained failure.**
   Every one of them came from a real rejection: the well-known 404, the sleeping contact listener,
   the unresolvable decimals, the 200-instead-of-402 GET, the 422 to a paying caller, the avatar. A
   marketplace that runs the probes its own sellers will otherwise fail is the differentiator and the
   seller-facing version of it (`hire-cli verify <agentURI>`) is one code path away.

9. **Carry the honesty machinery, not just the honesty claim.** The `origin` tag enforced at append
   time, the recompute-at-render rule, the re-derivable audit record, the canonical bytes a browser
   can reproduce and the "losses render as prominently as wins" instruction are all already written
   and tested. They are the cheapest Data Quality points in the build.

10. **Fix the licence before the repo flips public.** Moonwalk's three contracts are `MIT` and
    touchstone is `Apache-2.0`. Both are contribution licences. This is an entry, so it ships under
    the source-available no-derivatives terms, which means the headers change before the flip and not
    after.

## The reuse map

Document targets are the sixteen named in `three/README.md`: `00-PROGRAM`, `01-GROUND-TRUTH`,
`02-THESIS`, `03-TAXONOMY`, `04-AGENT-PROTOCOL`, `05-ONBOARDING`, `06-QUALITY`, `07-MATCHING`,
`08-MONEY`, `09-DISPUTES`, `10-DOCS-AND-POLICY`, `11-BNB-STACK`, `12-BINANCE`, `13-PARTNERS`,
`14-GAPS`, `15-SYSTEM`.

| source path | what it gives us | feeds | copy what |
| --- | --- | --- | --- |
| `work/bnb-era/touchstone/src/chain.ts` | BSC and testnet addresses for both registries, the ERC-8183 escrow, the evaluator router, the optimistic policy and the payment token, plus the wrong-registry and no-`eth_getLogs` traps | `01`, `15`, `11` | **code** |
| `work/bnb-era/touchstone/src/assert.ts` | Assert-first gate: chain id, code presence, name and symbol, a resolving agent, then the population. Errors that name the misconfiguration | `15`, `05` | **code**, with `ownerOf(0)` and the `_lastId` storage read swapped in |
| `work/bnb-era/touchstone/src/agents.ts` | Multicall3 enumerator, `data:` and `http(s)` registration resolver, OASF-first category classifier over exactly the four rubric categories with a `basis` field, the `AgentRecord` shape | `03`, `15`, `06` | **code**, with the SSRF guard added in front of the fetch |
| `work/bnb-era/touchstone/src/jobs.ts` and `src/abi/erc8183.ts` | ERC-8183 escrow ABI, the six-state job enum with its do-not-reorder note, `isPaid` and `isFunded`, the batched job indexer, `summarizeProviders` | `06`, `08`, `15`, `02` | **code** |
| `work/bnb-era/touchstone/src/abi/erc8004.ts` | Identity and reputation ABI slices, with the `getSummary` Sybil-defence note and the "`totalSupply` is not implemented" note | `01`, `15` | **code**, cross-checked against R01's fuller ABI |
| `work/bnb-era/touchstone/data/jobs-bsc.json` (re-run today) | The settled-money dataset: status counts, total and paid budget, 97 providers with per-provider jobs, funded, completed, rejected, distinct clients and paid value | `02`, `06`, `01` | **code** and re-run it before submitting so the numbers are same-day |
| `work/okx-genesis/REQUIREMENTS.md` | The six hard gates, the lifecycle, the field-by-field lint, the anti-wash rule, the day-one credential lesson | `05`, `10` | **rule** |
| `work/okx-genesis/cassandra/HANDOVER.md` | Five review rounds with verbatim reasons, log lines, timings and the fix per round | `05`, `04`, `09`, `10` | **rule** for the gates, **lesson** for the sequencing |
| `work/pr-sweep/2026-08-02-cassandra-rejection.md` | The avatar rejection with measured before-and-after floors, the health evidence, the paid-replay log lines | `05`, `10` | **rule** for the image lint, **code** for the measure-and-floor test pattern |
| `work/okx-genesis/cassandra/src/cassandra/chain.py` | Hash-chained signed ledger with seven append-time invariants, `origin` as a structural enum, `walk()` returning per-entry failures | `06`, `09`, `15` | **code** |
| `work/okx-genesis/cassandra/src/cassandra/_canonical.py` | Canonical JSON bytes and `sha256_hex`, the base of every signature and anchor hash | `06`, `09`, `15` | **code** |
| `work/okx-genesis/cassandra/src/cassandra/x402_compat.py` | ASGI wrapper that fills `decimals` per asset and re-emits header and body from one object, plus the "no signed field is touched" argument | `08`, `04`, `05` | **code** |
| `work/okx-genesis/cassandra/src/cassandra/invocation.py` | The never-422 resolver: priority key list, depth-4 flatten, both-parts-wins ordering, `resolved_from` echo, unsupported returns the offer list at 200, word-boundary aliasing | `04`, `05` | **code** for the shape, **rule** for the behaviour we probe on others |
| `work/okx-genesis/cassandra/src/cassandra/payments.py` | Both verbs on one resource as paid routes and the challenge `description` carrying the call shape plus the free schema URL | `04`, `08` | **rule** |
| `work/okx-genesis/cassandra/src/cassandra/app.py` | The `.well-known/agent-registration.json` body shape with `registrations[].agentId` and `agentRegistry` as `eip155:<chain>:<address>` | `04`, `05` | **code** |
| `work/okx-genesis/cassandra/SPEC.md` | The four-layer proof model (commit inputs, hash-link, sign, re-derive) plus settlement scoring and the integrity lines | `06`, `02`, `10` | **rule** |
| `work/lepton-discord/src/api/paywall.py` | The EIP-3009 signing page: typed-data block, envelope JSON, chain-switch with the 4902 fallback, status polling | `08`, `15` | **code**, with every Arc constant replaced |
| `work/lepton-discord/src/payments/facilitator.py` | The embedded facilitator: three-wallet split, in-process verify and settle, the `FacilitatorClient` protocol so a hosted facilitator swaps in behind one interface | `08`, `12`, `15` | **code** |
| `work/lepton-discord/src/api/app.py` | The 402 emitter, the v2-then-v1 header fallback, `0x` normalisation of the settle hash, nonce idempotency, the list-and-verify catalogue with its regex and price-ceiling guards, the three-brake public demo | `08`, `05`, `07`, `15` | **code** for the guards, **rule** for the price ceiling and the demo brakes |
| `work/lepton-discord/src/api/executor.py` | The SSRF guard (`_url_is_public`), redirects disabled, body truncation and the never-500 pattern where every executor returns a clean sentence on failure | `04`, `15`, `09` | **code** |
| `work/moonwalk/contracts/src/SpendGuard.sol` | Per-subject windowed caps namespaced by the calling app, fail-closed defaults, `remaining()` that agrees with `consume()` without a keeper | `11`, `13`, `08` | **code**, licence header changed |
| `work/moonwalk/contracts/src/NanoChannel.sol` | Cumulative vouchers, `receiveWithAuthorization` funding, anyone-can-submit settlement, a separate cap owner, the challenge window, mutual close pinned to `redeemed`, malleability-hardened `_recover`, a public `voucherHash` for cross-checking the off-chain signer | `08`, `09`, `11` | **code** for the primitives, **rule** for the five decisions |
| `work/moonwalk/contracts/src/ServiceRegistry.sol` | Price change drops verification, namespace price ceiling, HTTPS-only endpoint check, deterministic ids, disable separate from un-verify | `05`, `07`, `10` | **rule** (ERC-8004 is our identity source, so this is hygiene not storage) |
| `work/moonwalk/contracts/src/interfaces/IUSDC.sol` | The EIP-3009 slice, the `msg.sender == to` reasoning, the random-`bytes32` nonce note, the balance-delta check in `_pull` | `08` | **code**, with the 6-decimal comment deleted |
| `work/moonwalk/contracts/test/*.t.sol` | 51 tests covering cap breach, stale voucher, malleable signature, wrong-channel voucher, mutual-close replay, scope ownership | `15` | **code**. The test names are the specification |
| `work/all-things-agentic/kilter/kilter/safety/guard.py` | The injection pattern list, `GuardResult`, screen-input and screen-output, redaction rather than rejection | `05`, `04` | **code** for the patterns, **rule** for the two-layer split |
| `work/all-things-agentic/kilter/kilter/safety/redflags.py` | The deterministic-gate-before-any-model-call architecture and the false-positive tuning discipline | `04`, `10` | **lesson** |
| `work/calle-mps/apps/typescript/phone-approval-gate/src/audit.ts` | The same hash chain in TypeScript, with the third check stated plainly: recompute the verdict from recorded inputs with the same function the live path used | `06`, `09` | **code** if the stack is TS, **rule** either way |
| `work/bnb-build-era/ONBOARDING.md` | Sections A to J, the whole seller-side ruleset | `05` | **rule**. Fold section 1 of this file into it and it is close to done |
| `work/bnb-build-era/ARCHITECTURE-PART-2.md` §13.1, §16 | The Altana qualification correction and the wire-today versus gated split | `13`, `10` | **rule** |
| `work/bnb-build-era/ARCHITECTURE.md` §2, §3.8, §6 | The three named boundaries, the three-wallet custody rule with the honest single-shot limit, the three resolved contradictions | `15`, `08`, `02` | **rule** |
| `work/bnb-era/touchstone/README.md` | The measured problem statement in house voice, with the counts, the 0.047-feedback-per-agent ratio and the "sorts by noise" line | `02` | **lesson** and the numbers get refreshed |

## Do not carry over

- **Any 6-decimal amount, constant or division.** `price_atomic / 1_000_000`, `10000` for one cent, `50000` for five cents, `DEFAULT_BUDGET_ATOMIC` 50000, `MARKET_MAX_PRICE_ATOMIC` 10000. Every BSC stablecoin checked is 18 decimals.
- **The Arc chain and asset identity.** `eip155:5042002`, chainId 5042002, `https://rpc.testnet.arc.network`, `https://testnet.arcscan.app`, asset `0x3600000000000000000000000000000000000000` and the `nativeCurrency` USDC-at-6 add-chain block.
- **The EIP-712 domain `("USDC","2")`.** Version is `1` on U, FDUSD and USD1 and the names are all different.
- **Arc's gas story.** "Gas on Arc is USDC" and the dual 18/6 balance views are Arc-only. On BSC gas is BNB and the facilitator pays it.
- **Every gas and fee figure measured on Arc.** 87,145 gas and $0.001873 per x402 settle, 262,639 gas for a 30-call redeem, 8,755 gas per call, $0.000219 per call. Repeating any of those as a BSC number would be a fabricated claim.
- **The Arc deployment addresses.** SpendGuard `0xfbb8…b67b`, NanoChannel `0x3e2d…d568`, ServiceRegistry `0x774e…8f9b`, deployer `0xdb6c…7777`. Nothing is deployed at those addresses on BSC.
- **X Layer values from the OKX lane.** `eip155:196`, USDT0 `0x779ded0c9e1022225f8e0630b35a9b54be713736`, the `payTo` wallet, agent id 4577 and the `onchainos` and `okx-a2a` CLI surface. The rules from that lane travel, none of the identifiers do.
- **The `aggr_deferred` scheme name and the OKX facilitator client.** Both are OKX-specific. What travels is the pattern of offering more than one scheme in `accepts`.
- **`MIT` and `Apache-2.0` headers.** Moonwalk is MIT, touchstone is Apache-2.0. This build is an entry, so it ships source-available no-derivatives and the headers change before the repo flips public.
- **8004scan as the primary index.** Its BSC checkpoint was behind the head and reporting `down` and it does not list the validation registry. Cross-check and profile links, not the source of truth.
- **`eth_getLogs` on the day-one path.** Public BNB endpoints refuse it. Contiguous ids through Multicall3 is the verified route.
- **The 13-day build order** in `ARCHITECTURE.md` §8 and `ARCHITECTURE-PART-2.md` §17. Four days remain.
- **The invented ranking constants** in `ARCHITECTURE.md` §3.4: the 10% explore quota, the UCB bonus and the 30-day half-life. Take those from R13 instead of inheriting them.
- **Cassandra's domain vocabulary.** Market codes, coin aliases, Brier scoring and the CoinGecko feed are that product's, not this one's.
- **`agency-os` and `strk20`.** Different problems, different chains. Nothing in either belongs here.

## Sources

Our own files, all read in this pass:

- `work/okx-genesis/REQUIREMENTS.md`
- `work/okx-genesis/cassandra/SPEC.md`
- `work/okx-genesis/cassandra/HANDOVER.md`
- `work/okx-genesis/cassandra/src/cassandra/chain.py`
- `work/okx-genesis/cassandra/src/cassandra/_canonical.py`
- `work/okx-genesis/cassandra/src/cassandra/x402_compat.py`
- `work/okx-genesis/cassandra/src/cassandra/invocation.py`
- `work/okx-genesis/cassandra/src/cassandra/payments.py`
- `work/okx-genesis/cassandra/src/cassandra/app.py`
- `work/pr-sweep/2026-08-02-cassandra-rejection.md`
- `work/pr-sweep/2026-08-02-zeroclaw-30.md`
- `work/lepton-discord/src/api/paywall.py`
- `work/lepton-discord/src/api/executor.py`
- `work/lepton-discord/src/api/app.py`
- `work/lepton-discord/src/payments/facilitator.py`
- `work/lepton-discord/src/payments/config.py`
- `work/moonwalk/contracts/src/SpendGuard.sol`
- `work/moonwalk/contracts/src/NanoChannel.sol`
- `work/moonwalk/contracts/src/ServiceRegistry.sol`
- `work/moonwalk/contracts/src/interfaces/IUSDC.sol`
- `work/moonwalk/deployments/arc-testnet.json`
- `work/moonwalk/README.md`
- `work/bnb-era/touchstone/README.md`
- `work/bnb-era/touchstone/src/chain.ts`
- `work/bnb-era/touchstone/src/assert.ts`
- `work/bnb-era/touchstone/src/agents.ts`
- `work/bnb-era/touchstone/src/jobs.ts`
- `work/bnb-era/touchstone/src/abi/erc8004.ts`
- `work/bnb-era/touchstone/src/abi/erc8183.ts`
- `work/bnb-era/touchstone/scripts/probe.ts`
- `work/bnb-era/touchstone/scripts/index-jobs.ts`
- `work/all-things-agentic/kilter/kilter/safety/guard.py`
- `work/all-things-agentic/kilter/kilter/safety/redflags.py`
- `work/calle-mps/apps/typescript/phone-approval-gate/src/audit.ts`
- `work/bnb-build-era/ARCHITECTURE.md`
- `work/bnb-build-era/ARCHITECTURE-PART-2.md`
- `work/bnb-build-era/ONBOARDING.md`
- `work/bnb-build-era/three/README.md`
- `work/bnb-build-era/three/research/VERIFIED-payment-rail.md`
- `work/bnb-build-era/three/research/R01-erc8004.md` (verified-facts table and open items, for reconciliation)
- `work/bnb-build-era/three/research/R13-prior-art.md` (headline only, to confirm no overlap with this pass)

Artifact written by this pass:

- `work/bnb-build-era/three/research/raw/r16-erc8183-jobs-bsc-2026-09-05.json` (28,960 bytes, the live ERC-8183 snapshot: status counts, total and paid budget, 97 provider rows). Note that re-running `index-jobs.ts` overwrites `work/bnb-era/touchstone/data/jobs-bsc.json` in place, so the 2026-08-09 snapshot is no longer on disk. Its headline numbers are preserved in the verified-facts table above.

Commands run against BSC mainnet (chain id 56) over `https://bsc-rpc.publicnode.com` with cast 1.7.1, forge 1.7.1, node 22 and bun 1.3.14: `cast codesize`, `cast code`, `cast storage`, `cast call`, `cast keccak`, `cast abi-encode`, `cast block-number`, `forge test --offline`, `pytest -q` in two project venvs, `bun run typecheck`, `bun test`, `bun run probe`, `bun run scripts/index-jobs.ts`.

External page read for the licence and decimals context, quoted in `VERIFIED-payment-rail.md` rather than re-fetched here: `https://developers.circle.com/stablecoins/usdc-contract-addresses`.

AI assistance (Claude, Anthropic) was used to run this pass and draft this file. Every number in the verified table came from a command executed here. The author owns the design and the verification.
