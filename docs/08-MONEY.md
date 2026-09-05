# 08-MONEY: pricing, the rail, escrow and fees

What this settles: what a listing may charge for, the exact bytes a buyer signs, who pays gas, when a
job goes through escrow, where Muster's fee comes from without Muster ever holding a buyer's money,
what happens when a payment or a job fails, what is written down per payment and what a buyer can
take away for their own books.

Two measurements set the problem before any design starts.

**Nothing on BSC can take money today.** Of 600 uniformly sampled agents, **0 reach T3 payable**: no
sampled endpoint returned a 402 and no sampled agent set a wallet distinct from the mint default
(`MEASUREMENT.md`, sample seed `20260905`). 12 of 600 reach T2 machine-callable and all twelve are one
product on one host. So the rail is not something Muster discovers and surfaces. It is something
Muster supplies and every listing inherits it. That is the whole reason this document exists.

**The token most buyers hold cannot do one signature.** On BSC, USDT supports neither EIP-3009 nor
EIP-2612 and neither does Binance-Peg USDC or BUSD (`VERIFIED-payment-rail.md`, the highest-trust
file in the folder). Circle publishes no native USDC on BNB Smart Chain at all. Every BSC stablecoin
measured is **18 decimals**, so a constant carried from a 6-decimal chain is wrong here by a factor of
a trillion. Binance shipped that error in their own B402 docs for about a month.

Everything below follows from those two facts.

## 1. Pricing shapes and which the four categories need

Four shapes exist. Three ship. One does not, for a stated reason.

| Shape | What the buyer authorises | Ships | Rail |
| --- | --- | --- | --- |
| **Per call** | one exact amount for one invocation, known before signing | yes | `eip3009` |
| **Per unit of work** | one exact amount for a measured quantity, quoted after measuring | yes, as a two-phase exact quote | `eip3009` |
| **Subscription** | one exact amount for a fixed watch window, prepaid | yes, as one prepaid escrow window | `escrow8183` |
| **Success fee** | a share of an outcome | **no** | |

### What each category actually sells

The unit of work is a property of the category contract, not of the operator. `03-TAXONOMY.md` owns the
contracts. What follows is only the money shape each one needs. All four draw from the same three shapes
and every one sells two of them, a per-call report and a prepaid watch window, which is how equal depth
across the four mandated categories becomes a checkable property rather than a claim.

| Category | One unit of work | Shapes it needs |
| --- | --- | --- |
| `rebalancing` | one drift-and-trade-list report for a stated basket at a pinned block, then optionally N executed legs | per call for the report, prepaid window for the drift watch, per unit of work for the legs |
| `grid` | one grid specification (bounds, step count, order size, fee tier, expected fee capture net of gas) or a refusal naming the failed condition | per call for the spec, prepaid window for the ladder watch, per unit of work for the fills |
| `yield` | one rate comparison across named venues at a pinned block, each rate with its own unit and its own source call | per call for the comparison, prepaid window for the rate-change watch |
| `health-factor` | one health-factor snapshot with the liquidation price of the largest collateral asset and the price move that liquidates | per call for the snapshot, prepaid window for the watch, per unit of work for a remedy |

The metered leg is present exactly where the category contract carries an execution or remedy surface,
which is `rebalancing`, `grid` and the two `health-factor` remedy shapes. `yield`'s three shipped
sub-capabilities are read-only, so it prices per call plus the window and nothing else
(`03-TAXONOMY.md` section 3). That is the one asymmetry left and it comes from the contracts rather
than from the pricing.

Every category has a continuous product as well as a one-shot one and that is what forces the third
shape. `R09-bsc-defi.md` measures the polling a health-factor watch really needs: the oracle price is the
only input that can move a healthy position to liquidatable in one step, so it is watched every block for
the union of assets the watched accounts hold, while collateral factors, liquidation thresholds,
incentives, close factors and pause flags change on governance only and are read hourly or watched by
event. A grid ladder is the same shape with a price trigger instead of a solvency trigger. A drift watch
is the same shape again with the basket weights as the trigger. A yield rate watch is cheaper to run and
still moves: `supplyRatePerBlock()` is recomputed by the interest-rate model on every mint, redeem,
borrow, repay or liquidate in that market, so on the busy Venus markets it changes effectively every
block (`R09-bsc-defi.md`). None of the four can be sold per call without either overcharging for silence
or undercharging for the watch.

### The reference price ladder

Prices belong to operators. Muster fixes the shape, the display and the decimals, never the number. The
four first-party reference listings need a number anyway and this is it. Each row applies wherever its
shape is sold, so the first and third apply to all four categories and the second applies to the three
that carry an execution or remedy surface:

| Item | Price | Base units at 18 decimals | Rail |
| --- | --- | --- | --- |
| One report or snapshot | 0.10 `$U` | `100000000000000000` | `eip3009` |
| One executed leg, metered | 0.05 `$U` per leg | `50000000000000000` | `eip3009` |
| Seven-day watch window | 1.00 `$U` | `1000000000000000000` | `escrow8183` |

Those are anchored to measurements rather than to taste. Across 262 funded-or-later recent ERC-8183
jobs the modal budget is 0.0001 `$U` and completed jobs skew to 0.1 `$U`, with the two live rivals
pricing at 0.1 and 0.25 `$U` (`R02-erc8183.md`). The B402 Bazaar's full live catalogue is 989 payment
options across 979 endpoints, priced from 0.000001 to 5.0, with the mode at exactly 0.10 on 299 of them
and 958 of the 989 denominated in USD1 (recomputed from `raw/b402-bazaar-resources-full-2026-09-05.json`;
the 0.01 to 2 range quoted elsewhere is the first-100-row slice). TermiX's own published market is a
median 70 USDC at 3 days across 509 listings, with the rival covering all four mandated categories at 5
USDC and 1 day (`R07-termix.md`). So 0.10 `$U` delivered in seconds sits at the ERC-8183 completed mode,
on the Bazaar's own modal price and roughly 700 times under the TermiX median.

That last comparison and the fee floor in Section 9 both size one 18-decimal dollar-denominated token
against another at nominal parity. Muster asserts no peg for `$U`: the comparison is for sizing only,
the export still prints token units and no USD figure is displayed anywhere in the product.

### Per unit of work: a two-phase exact quote, not `upto`

EIP-3009 authorises an exact `value`. There is no primitive to settle less than the amount signed, so
metered work cannot be expressed as a ceiling on the 3009 rail. The shipped answer is two phases:

1. `POST /v1/quote` is free, runs the measurement only (count the legs, size the ladder, read the
   pool state at a pinned block) and returns a signed `quote`: `quoteId`, `priceBase`, `priceToken`,
   `priceDecimals`, `expiresAt`, `negotiationHash`, `providerSig` (SPINE `quote`).
2. The buyer signs that exact amount. The 402 challenge for a metered listing carries the quoted
   amount, not a guess.

Quote TTL is **900 s**, matching the cap the official SDK puts on an ERC-8183 quote
(`R02-erc8183.md`). The signature recipe is the one already reproduced on four of four live mainnet
jobs: `negotiationHash = keccak256(utf8(canonicalJson(description minus negotiation_hash and
provider_sig)))`, with `providerSig` an EIP-191 signature over that hash **as a hex string**. Muster
verifies the recovered signer equals the provider and shows the result, because that is the difference
between the operator agreeing a price and the buyer typing a number.

`canonicalJson` is not `JSON.stringify`: keys sorted at every depth, compact separators, every
non-ASCII code unit escaped `\uXXXX`, byte-identical to Python
`json.dumps(sort_keys=True, separators=(",", ":"))`.

### Subscription: one prepaid escrow window, never a recurring pull

A watch is sold as **one escrow job for the whole window**, not as one job per check and not as an
EIP-3009 authorisation. It has one exact amount, a stated start, a stated end and a bounded published
number of checks inside it. Nothing recurs. There is no standing allowance and no stored authorisation
that outlives the window it was signed for.

It has to be escrow and the reason is arithmetic. A 3009 authorisation is dead at `validBefore`, which is
`now + 300`, so a seven-day deliverable cannot be paid for on that rail under the Section 5 rule. The
1.00 `$U` reference price crosses the escrow threshold in the same table, so the window fails the 402
rail twice over. The buyer therefore funds the window through the official ERC-8183 kernel in `$U`: an
`approve(kernel, exactBudget)` plus the create, register, budget and fund calls, five transactions in the
plain case, each paying its own BNB. Section 5 has the mechanics and the gas.

Two consequences the buyer sees rather than discovers. The window is FUNDED from the moment it is paid
and the deliverable is submitted when the window closes, so on mainnet COMPLETED lands
`submittedAt + 604,800 s` after that. The UI carries the auto-approval countdown, the dispute button
and the claim-refund button from the first screen. And an escrow window is not gasless, which the UI says
before the buyer commits.

The rejected alternative is Permit2 `AllowanceTransfer` with periodic pulls, which is the closest thing
BSC has to a card-style subscription. It is refused because the allowance is a standing claim on the
buyer's balance that survives the job it was granted for, which is exactly the shape
`R15-compliance.md` puts on the prohibited-use list under custody and because Permit2 routes a signer
that has code to ERC-1271 and an EIP-7702 delegated EOA whose delegate does not implement it fails with
**empty revert data**, no error selector (`R04-bsc-tokens.md`, reproduced in a trace). EIP-7702 is live
on BSC. An empty revert is the worst thing to debug in front of a judge.

When a window ends, the watch stops and the UI says so. Renewal is a fresh escrow job.

### Success fee: deliberately not built

A success fee needs an agreed outcome measure and a settlement that happens after the measure lands.
Both are wrong here.

The measure does not exist on chain. Nothing in the ERC-8004 or ERC-8183 surface attests that a
rebalance made money. Of 950 sampled feedback rows on BSC, **0 tag a financial outcome**
(`MEASUREMENT.md`). Building our own measure would mean Muster deciding whether an agent's work
succeeded, which is the DSA Article 6(3) fact pattern where a platform stops being a broker and becomes
the seller (`R15-compliance.md`).

The incentive is worse than the measure. A share of a trading outcome is a performance fee and a
performance fee on a discretionary mandate is the MiCA Article 3(1)(16)(i) portfolio-management shape
the whole product is built to stay outside. `R15-compliance.md` settles the safe side: every agent
output is a measurement, a comparison on stated criteria, a simulation of the buyer's own inputs or the
mechanical execution of a rule the buyer set. None of those four has an outcome for a fee to share.

Documented as next, though it is not a success fee: an outcome-linked **bond** rather than an outcome-linked
fee, where an operator's stake is at risk on an upheld dispute. That puts the operator's own money
behind the claim without Muster pricing an outcome. Where the money sits is not settled in this document:
`05-ONBOARDING.md` fixes the stake at 5 `$U` in `OperatorBond`, releasable permissionlessly after a clean
604,800 s window, with **no key of ours over the funds**, which supersedes SPINE's "held in Muster's own
escrow" wording for the same money-transmitter reason. `09-DISPUTES.md` fixes the forfeit trigger and the
fraction. The contract is deployed on no chain
(`three/decisions/05-onboarding-operatorbond-not-deployed.md`). Open question 9 below is the one
part 08 owns, which is whether that stake may share the fee treasury.

**So SPINE's E1 Bonded tier has no mechanism anywhere at ship.** Nothing holds a stake by 2026-09-09,
which is stated here because the money question is 08's and the tier ladder owners (03, 05, 06) need to
know the rung is empty rather than merely unpopulated. Nothing on a shelf depends on it, because shelf
placement is E2.

## 2. The rail, settled

Every listing quotes in a token from this ladder, in that order. The 402 challenge carries all four as
separate `accepts[]` entries so the buyer pays in whichever they already hold, with FDUSD dropped whenever
the B402 client is the active facilitator. Section 3 has the composition rule.

| Rank | Token | Address | Dec | Signature | Verifies | Provenance |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **`$U`** United Stables | `0xcE24439F2D9C6a2289F741120FE202248B666666` | 18 | EIP-3009 and EIP-2612, one signature | `ecrecover` then ERC-1271 on `from` | verified by `R04`, `R06` and `R16`, **not** by `VERIFIED-payment-rail.md` |
| 2 | **USD1** | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | 18 | EIP-3009, EIP-2612, plus `cancelAuthorization`, one signature | `ecrecover` only, so no smart-account payer | `VERIFIED-payment-rail.md` |
| 3 | **FDUSD** | `0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409` | 18 | EIP-3009 and EIP-2612, one signature | `ecrecover` then ERC-1271 on `from` | `VERIFIED-payment-rail.md` |
| 4 | USDT (BSC-USD) | `0x55d398326f99059fF775485246999027B3197955` | 18 | neither, so Permit2 only. One approval then one signature | Permit2 recovers, then branches to ERC-1271 | `VERIFIED-payment-rail.md` |

`$U` is first because it is the token BNB Chain's own ERC-8183 kernel pays in: `paymentToken()` on
`0xEa4DAa3100A767e86FDed867729ae7446476EBA6` returns it, one token per kernel, so every escrow job on
BSC is priced in `$U` (`R02-erc8183.md`). Putting the per-call rail on the same token means one balance
for a buyer, one `decimals()` read, one price display and one export column across both rails instead of
two. Its supply is 956,298,607.91, deeper than FDUSD's 58,019,741.17 and behind USD1's
1,396,757,367.13 (`R16-reuse.md`, `VERIFIED-payment-rail.md`).

**That order departs from the file SPINE makes authoritative here, so it is stated rather than implied.**
`VERIFIED-payment-rail.md` recommends quoting in USD1 as the default. Three facts back it. Live supply
is 39 to 1 in USD1's favour: of 989 payment options across the 979 B402 Bazaar endpoints, 958 price in
USD1 and 24 in `$U` (recomputed from `raw/b402-bazaar-resources-full-2026-09-05.json`). USD1 alone
implements ERC-5267, so its domain can be read rather than brute-forced, confirmed by an `eip712Domain()`
call returning ("World Liberty Financial USD", "1", 56, self) and by selector `84b0196e` being present in
the USD1 implementation and absent from both the `$U` and FDUSD implementations. And USD1 alone lets a
buyer cancel an unspent authorisation on chain. Against all three: a Muster buyer needs `$U` regardless,
because the kernel is not ours to reconfigure and every escrow product on the shelf is priced in it, so
leading with USD1 makes the same buyer hold two tokens to buy two products from one shelf. `$U` is also
the only one of the two a smart-account buyer can pay with, which is the token BNB Agent Studio needs
(`R06-altana.md`). Ordering costs a USD1 holder nothing, because both entries carry the same amount in the
same challenge and a client picks the asset it holds. Recorded in
`decisions/08-money-u-first-over-usd1.md`.

Its provenance is weaker than USD1's and the document says so rather than rounding up.
`VERIFIED-payment-rail.md` never tested `$U`. `R04-bsc-tokens.md` then executed a one-signature `$U`
transfer end to end on a fork of BSC mainnet at block 120,020,269 from a buyer whose BNB balance was
forced to zero (108,164 gas for USD1, 103,377 for `$U`, tokens moved, balance still zero).
`R06-altana.md` and `R16-reuse.md` then independently derived and matched its domain separator. Three files
agree, none of them the highest-trust one. `$U`'s issuer, peg and redemption are **unverified**: it is
not on Circle's list and no primary source from the issuer was read. That is why USD1 sits beside it in
the same challenge rather than behind a toggle.

### The exact bytes a buyer signs

EIP-712 domain typehash `0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f` over
`EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)`. Each domain below
was derived and then matched byte for byte against the on-chain `DOMAIN_SEPARATOR()`, so the name and the
version are proven rather than guessed.

| Token | domain `name` | `version` | on-chain `DOMAIN_SEPARATOR()` |
| --- | --- | --- | --- |
| `$U` | `United Stables` | `1` | `0x358738403e5a61fdc30a8be78a60f289cbe4d2545b735a344b6229c70c1679b6` |
| USD1 | `World Liberty Financial USD` | `1` | `0x5d939dc193fd011c5e26fb861450a696546a09db6b26db26501fe354ba3ed4ba` |
| FDUSD | `First Digital USD` | `1` | `0xac2ff863e00ee93e90d01514d46b9b8179ca650e856138a6d8aea00702ca62a0` |

Version is `1` on all three. Versions `2`, `1.0` and `v1` were each computed and each failed to match, so
it is settled by exclusion as well as by match. Two traps that have each cost somebody a day: USD1's
`version()` returns `uint256 2`, which is **not** the domain version and wiring it in produces an
unrecoverable signature; and `$U`'s ERC-20 `name()` is `United Stables` while Binance's own docs example
shows `extra.name: "U"`. Read the domain rather than typing it. USD1 alone implements ERC-5267
`eip712Domain()`, so for `$U` and FDUSD the only confirmation is recomputing the separator against
candidate pairs at boot and failing loudly on no match.

The struct:

```
TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)
  typehash 0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267
ReceiveWithAuthorization(same six fields)
  typehash 0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8
```

The digest the buyer's key signs, which is the sentence a defence of this design rests on:

```
D = keccak256(abi.encode(0x8b73c3c6…400f, keccak256(name), keccak256(version), 56, token))
S = keccak256(abi.encode(0x7c7c6cdb…2267, from, to, value, validAfter, validBefore, nonce))
Digest = keccak256(0x19 || 0x01 || D || S)
{v, r, s} = sign(Digest, buyerKey)
```

Field values Muster sets and why each one:

| Field | Value | Reason |
| --- | --- | --- |
| `from` | the buyer's address | |
| `to` | `getAgentWallet(agentId)` read at quote time, selector `0x00339509` | the payee comes from chain, never from a form field |
| `value` | the listing's `priceBase`, a base-unit decimal string | never a float, never a hardcoded decimals count |
| `validAfter` | `0` | replay is stopped by the nonce, not by this field |
| `validBefore` | `now + 300` | a 3009 authorisation is a bearer instrument until spent or expired, so the window is the buyer's main control |
| `nonce` | 32 random bytes from a CSPRNG | a random `bytes32`, not a counter, which is why one buyer can hire four agents in the same second with no ordering constraint |

`maxTimeoutSeconds` in the challenge is **300**, matching the value a live BSC-accepting resource
actually serves (`R12-agent-comms.md` decoded its `PAYMENT-REQUIRED` header) rather than the 60 every
spec example shows. It stays at or under 480 so a BNB Agent Studio buyer can pay it: Studio refuses
windows over 600 s and backdates `validAfter` by 120 s (`R06-altana.md`).

Selectors, all three tokens: `transferWithAuthorization(…,uint8,bytes32,bytes32)` `0xe3ee160e`,
`receiveWithAuthorization(…,uint8,bytes32,bytes32)` `0xef55bec6`, `authorizationState(address,bytes32)`
`0xe94a0102`. `$U` and FDUSD additionally accept a packed 65-byte `bytes` signature (`0xcf092995` and
`0x88b7ab63`), USD1 accepts only the split `v, r, s` form. USD1 alone exposes
`cancelAuthorization(address,bytes32,uint8,bytes32,bytes32)` `0x5a049a70`, so on `$U` and FDUSD a short
`validBefore` is the only revocation a buyer has. Signature split from the 65-byte hex:
`r = sig[0:66]`, `s = "0x" + sig[66:130]`, `v = "0x" + sig[130:132]`, adding 27 when `v` comes back as 0
or 1.

### How each token verifies the signature, which is not the same on all three

This matters because it decides which buyers can pay at all. The earlier reading of it was wrong.

| Token | Verification path | A payer with code can pay |
| --- | --- | --- |
| `$U` | `ecrecover`, then a staticcall to ERC-1271 `isValidSignature(bytes32,bytes)` on `from` when the recovered address does not match | yes |
| FDUSD | the same two steps | yes |
| USD1 | `ecrecover` only | **no** |

Traced on BSC mainnet, one `transferWithAuthorization` per token with a deliberately invalid signature so
the failure path is visible. `$U` and FDUSD both staticcall `isValidSignature` on `from` and revert
`Invalid signature`. USD1 calls the `ecrecover` precompile, recovers a non-zero address and reverts
`EIP3009: invalid signature` with no ERC-1271 call. Bytecode agrees: selector `1626ba7e` is present in the
`$U` implementation `0xbef21313c69c009fd7d9510a8d3a481a32473dfc` and the FDUSD implementation
`0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50` but absent from the USD1 implementation
`0x694aa534bdef8ed63244eb902e7914e527891f08`. All three were resolved from the EIP-1967 slot at block
120,156,574. This supersedes `R04-bsc-tokens.md`'s line that all three verify with plain `ecrecover` and
no 1271 branch, recorded in `decisions/08-money-erc1271-branch-supersedes-r04.md`.

Two consequences the rest of the document is written to. A smart-account buyer, which on BSC means an
Altana wallet or any EIP-7702 delegated EOA, is a payable buyer on `$U` and FDUSD, though it must first call
`approveSignatureChecker` naming the token contract itself, because a session key's `isValidSignature`
returns the magic value only when `msg.sender` is an approved checker for that key and returns
`0xffffffff` for a perfectly valid signature otherwise (`R06-altana.md`). And USD1, the rank 2 token, is
the one where a smart-account buyer genuinely cannot pay: that quote is refused and re-quoted in `$U`, with
the ERC-8183 escrow as the fallback because the kernel pulls against an allowance rather than recovering a
signature.

### `transferWithAuthorization`, not `receiveWithAuthorization`

Muster uses the transfer form, because the payee is the agent's own wallet and no contract of ours is in
the path. The receive form requires `msg.sender == to`, which is the correct choice the moment a contract
of ours receives funds and then does something. Closing that door is precisely why we do not have
such a contract on the default rail. Section 4 settles that.

The transfer form leaves one window open: anyone who sees the signature can submit it, so a mempool
observer can front-run our relayer and burn the nonce at a moment we did not choose. No funds are at
risk, because `to` and `value` are inside the signature. Only ordering is. Our settle path treats
"already used by someone else at the signed `to` for the signed `value`" as a success, reads the
`AuthorizationUsed` log and records the third party's transaction hash.

### The second rail: USDT over Permit2, labelled, not default

USDT has no signature path of its own, so it goes through Uniswap's canonical Permit2 at
`0x000000000022D473030F116dDEE9F6B43aC78BA3` (9,152 bytes, deployed on 56 and 97) via
`x402ExactPermit2Proxy` at `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` (`settle` `0x13cd3b53`). The
proxy matters because it binds the recipient inside the buyer's signature: `WITNESS_TYPEHASH()` is
`0xd97b3239a7f32295517bd14cb074edfdd188dfe5eb42f802bb26d4fd1eb12c37` =
`keccak256("Witness(address to,uint256 validAfter)")` and tampering with `witness.to` reverts
`InvalidSigner()` `0x815e1d64`, executed and confirmed on a fork (`R04-bsc-tokens.md`). Without the
witness form the facilitator picks the recipient, which is not a rail a marketplace may offer.

Three things make it a labelled second rail rather than the default. The buyer's first payment in a
token needs `approve(Permit2, 2^256-1)`, which is an on-chain transaction the buyer pays for (46,446 gas
measured), so the flow is not gasless from the first call and must not be advertised as one. The Permit2
domain has three fields and **no** `version` (`{name: "Permit2", chainId: 56, verifyingContract}`,
separator `0x4142cc3c823f819c467fa4437d637fe20589a31dfcd1da2ff22292c9ed9344e7`), so a four-field domain
rejects every signature. And PancakeSwap deploys its own different Permit2 at
`0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768` whose separator is
`0x024cdb51703e56fe56eb1dd9dcfc321c085e4e6c3a10c912b579c56b3dbca86e`, so signatures are not
interchangeable and the address is read from config, never from memory (`R08-pancakeswap.md`).

Before offering this rail Muster calls `eth_getCode(buyer)`. A non-empty result starting `0xef0100` is an
EIP-7702 delegated EOA, which Permit2 routes to ERC-1271 and which may revert with empty data. Those
buyers are routed to the 3009 rail in `$U` or FDUSD, whose own ERC-1271 branch is verified above, never
to USD1.

### The decimals gate

At boot, for every configured token on every configured chain, Muster calls `decimals()` and asserts it
against the configured value, then refuses to serve if any pair disagrees. Capability is detected by
resolving the EIP-1967 implementation slot
`0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` and grepping the **implementation**
bytecode for the selector, never the proxy, because a proxy holds no dispatch table and grepping it
reports every selector absent. Call-based probing is wrong on BSC in both directions: CAKE answers
`nonces(address)` without supporting `permit`, while WBNB never reverts on an unknown selector because its
fallback is `deposit()`, so try-and-catch detection reads it as supporting everything
(`R04-bsc-tokens.md`). All three 3009 tokens are upgradeable proxies with live admins, so the capability
cache is re-checked on a schedule and who holds each upgrade key is **unverified**.

## 3. x402 and B402

Muster speaks x402 **version 2** on the wire. Version 2 is current in the specification and B402's V2
endpoint rejects anything else with `invalid_x402_version` (`R03-x402-b402.md`).

### The 402 we emit

`PAYMENT-REQUIRED`, plain base64 of UTF-8 JSON, camelCase keys, `None` fields omitted. The v1 body goes
out in the same response, because a live BSC resource serves v2 in the header and v1 in the body at once
and the header is authoritative (`R12-agent-comms.md`). `X-PAYMENT-REQUIREMENTS` goes out too, because
one B402 documentation page asks for it while another returns a JSON body and a third points at
`PAYMENT-REQUIRED`, three different answers. An extra header costs nothing.

```json
{
  "x402Version": 2,
  "error": "PAYMENT-SIGNATURE header is required",
  "resource": { "url": "https://<host>/v1/agents/<agentId>/invoke",
                "description": "Health factor snapshot for one address on Venus, Lista and Moolah",
                "mimeType": "application/json", "serviceName": "Muster",
                "tags": ["health-factor", "bsc", "erc-8004"] },
  "accepts": [
    { "scheme": "exact", "network": "eip155:56", "amount": "100000000000000000",
      "asset": "0xcE24439F2D9C6a2289F741120FE202248B666666",
      "payTo": "0x<agentWallet>", "maxTimeoutSeconds": 300,
      "extra": { "assetTransferMethod": "eip3009", "paymentFlow": "authorization",
                 "name": "United Stables", "version": "1", "decimals": 18 } },
    { "scheme": "exact", "network": "eip155:56", "amount": "100000000000000000",
      "asset": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
      "payTo": "0x<agentWallet>", "maxTimeoutSeconds": 300,
      "extra": { "assetTransferMethod": "eip3009", "paymentFlow": "authorization",
                 "name": "World Liberty Financial USD", "version": "1", "decimals": 18 } },
    { "scheme": "exact", "network": "eip155:56", "amount": "100000000000000000",
      "asset": "0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409",
      "payTo": "0x<agentWallet>", "maxTimeoutSeconds": 300,
      "extra": { "assetTransferMethod": "eip3009", "paymentFlow": "authorization",
                 "name": "First Digital USD", "version": "1", "decimals": 18 } },
    { "scheme": "exact", "network": "eip155:56", "amount": "100000000000000000",
      "asset": "0x55d398326f99059fF775485246999027B3197955",
      "payTo": "0x<agentWallet>", "maxTimeoutSeconds": 300,
      "extra": { "assetTransferMethod": "permit2-exact", "paymentFlow": "authorization",
                 "decimals": 18,
                 "spenderAddress": "0x402085c248EeA27D92E8b30b2C58ed07f9E20001",
                 "signerAddress": "0x<relayer>",
                 "permit2Address": "0x000000000022D473030F116dDEE9F6B43aC78BA3",
                 "requiresApproval": true } }
  ],
  "extensions": { "muster-fee": {
      "info": { "amount": "10000000000000000",
                "asset": "0xcE24439F2D9C6a2289F741120FE202248B666666", "decimals": 18,
                "payTo": "0x<treasury>", "basisPoints": 200, "floorBase": "10000000000000000",
                "minBrokeredBase": "100000000000000000",
                "buys": ["receipt", "export", "dispute intake", "screening verdict"] },
      "schema": { "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object",
                  "properties": { "amount": { "type": "string", "pattern": "^[0-9]+$" },
                                  "asset": { "type": "string" },
                                  "decimals": { "type": "integer" },
                                  "payTo": { "type": "string" },
                                  "basisPoints": { "type": "integer" },
                                  "floorBase": { "type": "string", "pattern": "^[0-9]+$" },
                                  "minBrokeredBase": { "type": "string", "pattern": "^[0-9]+$" },
                                  "buys": { "type": "array", "items": { "type": "string" } } },
                  "required": ["amount", "asset", "decimals", "payTo",
                               "basisPoints", "floorBase"] } } }
}
```

The `agentId` in `resource.url` is a placeholder on purpose. Concrete ids in this document are either our
own registered listings or nobody's, because a copyable example naming a live third-party agent quotes a
payment to somebody else's wallet: Section 2 pins `payTo` to `getAgentWallet(agentId)` read from chain, so
the id decides who gets paid.

`extra.paymentFlow` is `authorization` on every entry, which is the flow Muster actually runs and the one
the specification makes the default (`R03-x402-b402.md`). Declaring it costs one key and it is the only
way a client can tell that this resource settles after the work rather than before.

The extension carries `info` plus a `schema` that validates `info`, because that is the pattern all four
upstream x402 extensions follow (`R12-agent-comms.md`). An extension with `info` alone is a shape a client
cannot validate.

### What composes `accepts[]`

Four entries, in the Section 2 ladder order, with two rules on top.

**FDUSD is dropped whenever the B402 client is the active facilitator.** B402's `eip3009` scheme accepts
USD1 and `$U` only, so an FDUSD entry that settles in process would fail on B402
(`VERIFIED-payment-rail.md`, corrected 2026-09-05; `R17-binance-agent-os.md`). The token set is a property
of the facilitator implementation, not of the listing, so the interface contract in Section 3 states it.

**The Permit2 entry is always advertised and gated later.** A 402 is served before the payer is known, so
the `eth_getCode(buyer)` pre-check cannot gate the challenge. It gates two later moments instead: the
Muster UI does not offer the Permit2 rail to an address with code. Verify rejects a Permit2 payload
whose payer has code that does not implement ERC-1271. A machine client that holds USDT and knows its own
account type can still pick the entry directly.

`extra.decimals` is ours rather than the spec's. It is there because a listing on a live agent marketplace
carried a `tokenResolveError` that left it unpriceable and was later delisted. The validator's own message
was `tokenResolveError: cannot determine token decimals: token-info lookup failed … and the accepts entry
does not provide a decimals field`. The platform's stated delisting reason was a task timeout, so the
two are recorded side by side rather than as cause and effect (`R16-reuse.md` section 1.5). The fix moved
the validator from returning no human amount at all to returning a priced one: `amountMinimal 50000`
against `amountHuman 0.05` on that deployment's 6-decimal token, which on BSC would be
`50000000000000000`. The factor of a trillion between those two numbers is the whole reason this
document reads `decimals()` rather than assuming it. A task that cannot be priced never pays. The field is
additive, it sits in the slot the spec reserves for scheme-specific keys and a client that ignores it loses
nothing.

Header and body are serialised from **one object**, so the two can never drift. Nothing signed is
affected: an EIP-3009 authorisation covers `from`, `to`, `value`, `validAfter`, `validBefore` and
`nonce`, none of which appear in the challenge. Verify rebuilds the requirements from the listing
record rather than from the response we sent.

### The payload we accept

`PAYMENT-SIGNATURE`, base64 of the v2 `PaymentPayload`, where `accepted` is a full echo of the chosen
`accepts[]` entry and `payload` carries `signature` plus `authorization`. The parser reads
`PAYMENT-SIGNATURE`, then its lowercase form, then `X-PAYMENT`, then `x-payment`, because that
compatibility ladder saves a round of debugging against v1 clients. For the Permit2 rail the payload key
is `permit2Authorization` instead of `authorization` and the two must never both be present.

### Verify, in order, before the work runs

`verify` is read-only. It must not write chain state and must not commit payment state. Checks 1, 2, 9 and
10 are rail-independent. Checks 3 to 8 are the 3009 rail and the `permit2Exact` table below mirrors them.

| # | Check | Failure |
| --- | --- | --- |
| 1 | envelope is v2 and the scheme is one we serve | `invalid_x402_version`, `invalid_scheme` |
| 2 | `accepted` matches a live `accepts[]` entry for this listing at this block | `invalid_payment_requirements` |
| 3 | `authorization.to` equals the payee we quoted **and** equals `getAgentWallet(agentId)` re-read now | `invalid_exact_evm_payload_recipient_mismatch` |
| 4 | `authorization.value` equals `amount` exactly | `invalid_exact_evm_payload_authorization_value_mismatch` |
| 5 | `now > validAfter` and `now < validBefore` with a 30 s margin | `…valid_after`, `…valid_before` |
| 6 | `authorizationState(from, nonce)` is false | `invalid_exact_evm_nonce_already_used` |
| 7 | signature recovers to `from`, branched on `eth_getCode(from)`. Empty code: `ecrecover(digest, v, r, s) == from` and not the zero address. Non-empty code on `$U` or FDUSD: the token's own `isValidSignature(digest, sig)` returns the magic value. Non-empty code on USD1: refuse and re-quote in `$U`, because USD1 has no ERC-1271 branch | either `invalid_exact_evm_payload_signature` or our own `smart_account_token_unsupported` for the USD1 case |
| 8 | `balanceOf(from) >= value` | `invalid_exact_evm_insufficient_balance` |
| 9 | `frozen(from)`, `frozen(to)` and `paused()` on the settlement token, guarded for tokens that do not implement them | our own `token_frozen` / `token_paused` |
| 10 | screening: `isSanctioned` on the Chainalysis oracle plus the local OFAC SDN EVM set, on buyer, payee and the agent's registered wallet | our own `screened_block` |

Check 7 is where the earlier reading was wrong. Recovering with `ecrecover` alone refuses a payment the
token itself would accept, which is precisely the BNB Agent Studio or Altana-wallet buyer the Altana track
needs. The two-branch form is what the traces in Section 2 support. A smart-account payer must also have
called `approveSignatureChecker` naming the token before its signature verifies at all (`R06-altana.md`).

### Verify on the Permit2 rail

Same 1, 2, 9 and 10. The middle six are Permit2's. Every failure code is the specification's own
(`R03-x402-b402.md` lists the set, `R04-bsc-tokens.md` confirmed the on-chain selectors).

| # | Check | Failure |
| --- | --- | --- |
| P3 | `permit2Authorization.witness.to` equals the payee we quoted **and** equals `getAgentWallet(agentId)` re-read now | `invalid_permit2_recipient_mismatch` |
| P4 | `permitted.amount` equals `amount` exactly and `permitted.token` equals `asset` | `permit2_amount_mismatch`, `permit2_token_mismatch` |
| P5 | `now < deadline` with a 30 s margin, plus `witness.validAfter` at or below the next block's timestamp, back-dated about 60 s for clock skew | `permit2_deadline_expired`, `permit2_not_yet_valid` |
| P6 | the nonce's bitmap bit is clear: `nonceBitmap(from, nonce / 256)` `0x4fe02b44` with bit `nonce % 256` unset | `invalid_permit2_nonce` |
| P7 | the `PermitWitnessTransferFrom` digest recovers to `from` over the three-field Permit2 domain, with `spender` equal to `extra.spenderAddress`. An on-chain attempt with a wrong signer or a tampered `witness.to` reverts `InvalidSigner()` `0x815e1d64` | `invalid_permit2_signature`, `invalid_permit2_spender` |
| P8 | `Permit2.allowance` is irrelevant here, so instead `token.allowance(from, permit2)` is at least `amount`, plus `balanceOf(from) >= amount` | `permit2_allowance_required`, `permit2_insufficient_balance` |

`payTo` in the challenge stays the agent wallet on this rail. The proxy
`0x402085c248EeA27D92E8b30b2C58ed07f9E20001` is the signed `spender`, never the payee: it calls
`permitWitnessTransferFrom` and Permit2 moves the token from the buyer straight to `witness.to`, so no
contract in the path ever holds the money. `permit2_allowance_required` is the one failure that is a
buyer instruction rather than an error, because it means the one-time `approve(Permit2, 2^256-1)` has not
been sent.

Checks 9 and 10 are Muster's additions, neither of them in the x402 specification. Rejected: a spec-pure
verify with eight checks, which is faster by two RPC calls and would let a brokered payment settle to a
frozen wallet or a screened counterparty. Their subject matter belongs to `09-DISPUTES.md`, which owns
wallet-level sanctions screening, plus `R15-compliance.md`, which owns the oracle's coverage gap against
the OFAC SDN file and the rule that the chain tag is ignored on ingest. The money-side consequence is the
only part 08 fixes: **a quote that cannot run both checks is not served**. A stale local set refuses
rather than serving quietly. Selector inventory for check 9, read from each implementation's bytecode:
`freeze(address)` `0x8d1fdf2f`, `unfreeze(address)` `0x45c8b1a6`, `frozen(address)` `0xd0516650` and
`paused()` `0x5c975abb` are present on all three 3009 tokens including `$U`, so the freeze surface is
real everywhere; `reallocate(address,address,uint256)` `0x308b8c00` is present on USD1 alone, so USD1 is
the only one of the three where the issuer can move a balance outright. BSC-USD exposes none of them,
which is why the call is guarded rather than assumed.

### Settle and who pays gas

Order is fixed by the x402 `authorization` payment flow, which is the default and the one Muster uses:
**verify, run the resource, settle, respond.** Funds move only after the work exists. The alternative
flows the specification allows are `upfront` (settle, resource, respond) and `escrow` (settle, resource,
settle, respond). Muster's broker never settles before a deliverable hash exists, so it never runs
`upfront` and a listing that only supports `upfront` is recorded as such and is not eligible for the
default shelf. Rejected: serving `upfront` for the listings that want it, which is one fewer round trip
and no signature risk for the operator, refused because a stranger's first hire on this marketplace must
not be able to take the money and answer nothing.

Settle is exactly one transaction, sent by Muster's relayer EOA:

```
to    = 0xcE24439F2D9C6a2289F741120FE202248B666666        # the token, not a contract of ours
data  = 0xe3ee160e || abi.encode(from, to, value, validAfter, validBefore, nonce, v, r, s)
value = 0
```

Gas is paid by the relayer in BNB. Nobody else pays anything on this rail. Measured cost of one 3009
settle: 103,377 gas for `$U`, 108,164 for USD1, 103,395 for FDUSD, 86,731 for the packed FDUSD form
(`R04-bsc-tokens.md`, executed on a fork). At the measured BSC gas price of 50,000,000 wei (0.05 gwei)
that is about **0.0000052 BNB** per settle, so sponsoring a million hires costs about 5.2 BNB. That is
cheap enough to be a feature rather than a cost. The submission states the measured gas numbers
rather than a claim.

The three wallets and what each one can do:

| Wallet | Holds | Signs | Needs BNB |
| --- | --- | --- | --- |
| buyer | the stablecoin | one EIP-712 typed message per payment | **no** |
| `agentWallet` | receives the payment | nothing on chain | no |
| Muster relayer | a gas-only key | one Ethereum transaction per settle | yes and only this one |

The relayer key can do exactly one thing: submit an authorisation the buyer already signed, for a
recipient and an amount the buyer already fixed. It cannot redirect a payment, change an amount or move
a token it has not been handed a signature for.

### B402, behind the same interface

`facilitator` is one interface with two implementations (SPINE component list). The interface contract
carries a **supported token set** alongside verify and settle, because the two implementations do not
accept the same tokens. The in-process one is what the demo runs on, because the reference Python
facilitator works on BSC unmodified: `get_network_config` falls back to `{"chain_id": n}` for any
`eip155:*` and the exact-EVM facilitator reads the EIP-712 domain from `requirements.extra` rather than
from a registered asset table, even though neither official SDK ships BSC in its network list
(`R03-x402-b402.md`). The public x402.org facilitator does not cover `eip155:56` at all.

B402 is a config flip. It is not a token-transparent one. **B402's `eip3009` scheme accepts USD1 and
`$U` only, so FDUSD does not survive the flip.** That is the correction `VERIFIED-payment-rail.md` carries
in bold as of 2026-09-05. `R17-binance-agent-os.md` plus Binance's own asset list (U, USD1, USDT,
USDC) say the same. FDUSD is therefore an in-process rail token: it is configured, it appears in
`accepts[]` under the in-process facilitator, then the challenge builder drops it whenever the B402 client
is active. USDT and Binance-Peg USDC survive the flip only as `permit2-exact`, which is what B402 itself
says is the only path to settle for those two.

Its authenticated base URL is **unverified and unpublished**: both rows of Binance's own base-URL table
read "Please contact us for access", onboarding is a manual per-environment form with an IP allowlist and
RSA request signing. Whether mainnet credentials can be had before 2026-09-09 is unverified. What is
verified: B402 is BNB Chain only (`eip155:56` and `eip155:97`), it sponsors gas on settle **for the tokens
its schemes cover**, it holds no custody ("All token transfers occur strictly peer-to-peer"), its settle
became asynchronous on 2026-07-14 and is idempotent on `(nonce, network, payer)`. Its public Bazaar answers
with no credentials at `https://www.binance.com/bapi/ramp/v1/public/ramp/b402` with 979 live resources.

Three rules the B402 client is written to from the start, so switching it on is not a rewrite. Poll
`/settle` at 3 to 5 s and key the outcome on `transaction` being empty or not, never on `errorReason` and
never on the HTTP status, which is always 200: a confirmed on-chain revert and a pending confirmation both
surface as `success: false`. Enforce our own idempotency on `(nonce, network, payer)` as well as relying
on theirs. And build the challenge from their cached `/supported` response rather than from our own
constants, because B402 requires the merchant to copy the whole `kinds[].extra` object into the 402 and
its `signerAddress` and `spenderAddress` values are **unverified**, every address in the public docs
being a placeholder.

## 4. Non-custodial by default and where the fee comes from

The architecture rests on one sentence of primary text, quoted in `R15-compliance.md` from FinCEN
FIN-2019-G001 section 4.6.2: a platform that only hosts bids and offers, with the parties themselves
settling "through an outside venue (either through individual wallets or other wallets not hosted by the
trading platform)", "does not qualify as a money transmitter under FinCEN regulations". The same document
says the opposite about the alternative: "CVC payment processors fall within the definition of a money
transmitter and are not eligible for the payment processor exemption."

So the rule, applied everywhere and testable: **no code path exists in which a buyer's payment reaches an
address Muster controls.** Money moves buyer to `agentWallet` or buyer to the official ERC-8183 kernel
and nowhere else. The only address Muster controls that ever holds value is the treasury. It only ever
receives Muster's own fee, never a payment in transit.

That is checked rather than asserted. The go-live gate greps the settle path for any `to` that resolves to
a Muster-controlled address, the payment record's `payTo` is compared against `getAgentWallet(agentId)` or
the kernel address on every append. Any other value fails the append.

### The fee, without custody

The fee is a **second EIP-3009 authorisation, signed by the buyer, payable to the treasury, additive to
the operator's price and disclosed as its own line before acceptance.** Two authorisations, two
transactions, no contract of Muster's in either path:

```
tx 1   token.transferWithAuthorization(buyer -> agentWallet, priceBase, …, nonce1, v1, r1, s1)
tx 2   token.transferWithAuthorization(buyer -> treasury,    feeBase,   …, nonce2, v2, r2, s2)
```

The principal goes first, always. If tx 2 fails the job is still complete, the operator is still paid and
Muster absorbs the loss. If the order were reversed a failed principal would leave Muster holding a fee
for work nobody did, which is a refund obligation invented for no reason.

Because the fee is additive, `accepts[].amount` is exactly the price the operator declared. That is the
property worth paying two prompts for: any x402 client anywhere can pay a Muster listing with no
Muster-specific code, so the challenge we serve does not disagree with the operator's own number. The fee
sits in `extensions["muster-fee"]`, which is the slot the specification reserves for exactly this
("Servers advertise extensions in `PaymentRequired`, clients echo them in `PaymentPayload`"). A client
that ignores the extension pays the operator and gets no receipt, no export and no dispute intake, which is
the free surface stated honestly rather than a leak.

Rejected: a splitter contract taking `receiveWithAuthorization` for the total and forwarding net plus fee
atomically in one call. It is one signature instead of two, it costs less gas because one authorisation
plus an internal transfer is cheaper than two authorisations and `R04-bsc-tokens.md` ranks it the safest
mechanic available because a leaked authorisation is then
redeemable by nobody but our contract. It is refused anyway: accepting the buyer's value in order to pass
it to the operator is the payment-processor fact pattern FIN-2019-G001 puts **inside** the money-transmitter
definition. Atomicity is a technical property rather than a legal one. A design that needs one fewer
wallet prompt is not worth the perimeter.

Rejected: deducting the fee from the operator's proceeds, which is what TermiX does on chain (protocol fee
200 bps, so a provider nets 98 on a 100 USDC order, read live in `R07-termix.md`). Taking it from the
proceeds means splitting funds we hold, which is the custody above. The alternative is quoting
`accepts[].amount` below the price the operator published, which makes our challenge disagree with the
operator's own listing.

## 5. Escrow

### When it is needed

The rail is chosen by one rule, not by a preference: **if the work cannot be delivered inside the
authorisation window, it cannot be paid for on the 402 rail.** `validBefore` is `now + 300`, so:

| Condition | Rail |
| --- | --- |
| expected delivery under 300 s minus a 30 s margin, with price under 1.00 `$U` | `eip3009` |
| expected delivery over that window | `escrow8183` |
| price at or over 1.00 `$U` | `escrow8183` |
| the buyer asks for a dispute window | `escrow8183` |
| the buyer is an agent hiring an agent | `escrow8183`, because that is what the ecosystem reads |

Both continuous products hit the first two conditions, which is why Section 1 sells every watch window as
an escrow job rather than as an authorisation. `04-AGENT-PROTOCOL.md` owns the long-job shapes. The money
consequence is only this: a seconds-long payment cannot carry a days-long job, so the two rails are not a
preference and a listing declares which one it delivers on.

**`listing.priceRail` is exactly `eip3009 | escrow8183`.** SPINE gives the field its enum slot without
values and 08 owns the rails, so those two are the value set 03 filters on and 05 lints against.
`permit2Exact` is deliberately not in it: which token a buyer pays a 402 challenge in is a buyer-side
choice made against `accepts[]` at hire time, never a property of the listing. `payment.rail` is the wider
enum and it does carry `permit2Exact`, because that record describes what actually happened.

### We do not deploy our own escrow

The official ERC-8183 stack is live on BSC and it is what Muster uses.

| Contract | Address | Read that proves it |
| --- | --- | --- |
| AgenticCommerce kernel | `0xEa4DAa3100A767e86FDed867729ae7446476EBA6` | `codesize` 130 so it is a proxy, `jobCounter()` **56,716 at block 120,156,766, timestamp 1788632091, 2026-09-05T18:14:51Z**. It moves every few minutes, so it is cited with its height rather than bare |
| EvaluatorRouter | `0x51895229E12F9876011789B04f8698af06cCD6DA` | `commerce()` returns the kernel |
| OptimisticPolicy | `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5` | `router()` and `commerce()` return the pair |
| Payment token | `0xcE24439F2D9C6a2289F741120FE202248B666666`, `$U`, 18 dec | `paymentToken()` on the kernel |

Deploying our own would mean self-issuing the attestations that decide whether a job was done. We
cannot register our own policy on the shared router in any case: `setPolicyWhitelist` is owner-only,
exactly one policy is whitelisted per chain and the owner is `0x5057b09A4b510ccaf7e3fb3038Ba60713E62B1fc`,
not us. That is verified, not assumed (`R02-erc8183.md`). The available lever is a custom `IACPHook` plus
a custom evaluator, since the kernel enforces only ERC-165 on the hook and nothing on the evaluator. Using
it means leaving the optimistic settlement and the 3-of-5 dispute panel behind. Muster does not use
it. The blueprints for our own escrow exist and stay unbuilt for this entry.

### The state machine and who may call what

Statuses are order-locked: `0 OPEN, 1 FUNDED, 2 SUBMITTED, 3 COMPLETED, 4 REJECTED, 5 EXPIRED`. Jobs are
1-indexed and `getJob(0)` returns an empty struct.

| Transition | Caller | Call | Guard verified |
| --- | --- | --- | --- |
| create | client | `createJob(provider, router, expiredAt, description, router)` `0x41528812` | `hook = address(0)` reverts `HookRequired()` `0x55c45de1`, a non-ERC-165 hook reverts `HookMissingInterface()` `0x1a5d3d5f` |
| register the policy | client only, OPEN only, once | `router.registerJob(jobId, policy)` `0x51d5456d` | a stranger reverts `NotJobClient()` `0x0d86e226`, a non-whitelisted policy reverts `PolicyNotWhitelisted()` `0xc94463e3` |
| set the price | client **or** provider | `setBudget(jobId, amount, "0x")` `0xdd4ae9d4` | a third address reverts `Unauthorized()` `0x82b42900` |
| fund, OPEN to FUNDED | client | `approve(kernel, budget)` then `fund(jobId, expectedBudget, "0x")` `0xd2e13f50` | a wrong budget reverts `BudgetMismatch()` `0x99b0fc87` |
| deliver, FUNDED to SUBMITTED | provider only | `submit(jobId, deliverable, optParams)` `0x9e63798d` | wrong state reverts `WrongStatus()` `0x8e78f0cb` |
| settle, SUBMITTED to COMPLETED | **anyone** | `router.settle(jobId, "0x")` `0x39c2ebb9` | inside the window it reverts `NotDecided()` `0x17be5b7b` identically for the client and a stranger |
| dispute | client only, inside the window | `policy.dispute(jobId)` `0x86d6282c` | a stranger reverts `NotClient()` `0x20dbc874`, after the window `OutsideDisputeWindow()` `0x4393d7a1` |
| refund, FUNDED or SUBMITTED to EXPIRED | **anyone**, after `expiredAt` | `claimRefund(jobId)` `0x5b7baf64` | deliberately not hookable, so a broken hook can never trap the escrow |

Release is by silence. There is no `voteApprove` on chain, so a job with no dispute auto-approves the
moment `submittedAt + disputeWindow` elapses. `check(jobId, "0x")` then returns verdict `1` with
reason `REASON_APPROVED` = `keccak256("OPTIMISTIC_APPROVED")` =
`0xcff4b2730cac7938c235056123e2b993a9ad6c647dcf36188f099ba8b8cb6845`. A disputed job needs 3 of 5 human
voters (`voteQuorum()` 3, `activeVoterCount()` 5) to reject it.

### Timeouts and the one that shapes the product

| Clock | Mainnet | Testnet |
| --- | --- | --- |
| `disputeWindow()` | **604,800 s (7 days)** | **900 s (15 min)** on policy `0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA` |
| `expiredAt` floor | more than 300 s ahead, else `ExpiryTooShort()` `0xf7a0748c` | same |
| `MAX_EXPIRY_DURATION()` | 31,536,000 s, else `ExpiryTooLong()` `0xb40b2a0e` | same |
| what Muster sets | `expiredAt = deliveryDeadline + disputeWindow + 1800` | same |

**`expiredAt` is derived from the delivery deadline, never from funding time.** That is the correction the
rail forces and it is worth spelling out, because an earlier form of this document set
`expiredAt = now + disputeWindow + 1800` at fund time and that formula is wrong for every job the escrow
rail actually exists to carry. `claimRefund` is callable by anyone from FUNDED or SUBMITTED once
`expiredAt` passes, while `settle` reverts `NotDecided()` until `submittedAt + disputeWindow`. Fix
`expiredAt` at funding and any job submitted more than 1800 s later becomes refundable before it can
settle: a seven-day mainnet watch funded at T submits at T+7d and settles at T+14d, while anybody could
refund it at T+7d 30min. The escrow rail is only reached by work that cannot be delivered inside 300 s, so
that is not an edge case, it is the normal case.

The invariant is asserted on the create path rather than trusted to a constant:

```
require(expiredAt > deliveryDeadline + disputeWindow)                 # settle before refund, always
require(expiredAt > now + 300)                                        # else ExpiryTooShort()
require(expiredAt - now <= MAX_EXPIRY_DURATION())                     # else ExpiryTooLong()
expiredAt = deliveryDeadline + disputeWindow + 1800                   # 1800 s of headroom on the settle
```

`disputeWindow` is read from the live policy rather than pinned, so the same code produces 900 s of testnet
clock and 604,800 s of mainnet clock. `deliveryDeadline` is the job's own promised end: the listing's
`deliveryTarget` for a one-shot job or the published window end for a watch, both pinned into the job
description at create so a reader can check the arithmetic. The `+ 1800` is headroom for the settler's own
transaction, not the guarantee: the assertion is the guarantee. `MAX_EXPIRY_DURATION()` 31,536,000 s caps
`deliveryDeadline` at about 355 days out on mainnet, which no product on this shelf comes near. An operator
who submits after `deliveryDeadline` can lose the job to a refund, which is the correct outcome rather than
a defect.

The 7-day mainnet window is a product constraint, not a footnote. A buyer who funds on mainnet cannot see
COMPLETED for a week, so FUNDED and SUBMITTED are first-class states in the UI with a countdown to
auto-approval, a dispute button while the window is open and a claim-refund button after `expiredAt`.
Treating COMPLETED as the only success state makes the product look broken on its own happy path. Do not
hardcode the old testnet policy `0x4F4678D4439feC812Ac7674Bb3Efb4C8f5Fb78A6`: it still has code, the
router no longer whitelists it and `registerJob` against it reverts. Read the policy from config and
assert `router.policyWhitelist(policy) == true` before the first hire.

### Gas on the escrow rail, stated plainly

Escrow hires are **not** gasless for the buyer. The kernel pulls with `safeTransferFrom`, so the buyer
sends an `approve` transaction plus the create, register, budget and fund calls, five transactions in the
plain case, paying BNB for each. An Altana wallet batches them into one atomic intent, which is one
signature instead of five, but the Altana relay fronts that gas and recovers it from the wallet rather
than sponsoring it, so the wallet still needs BNB (`R02-erc8183.md`, quoting the official SDK's own
Altana document). The 402 rail is the gasless one and the UI says which is which before the buyer
commits.

The approval is `approve(kernel, exactBudget)`, never `approve(kernel, max)`. A standing allowance on an
escrow kernel is a standing claim on the buyer's balance and there is no reason to create one.

### The settler, which is a service and not a chore

`settle` is permissionless and nobody is obliged to call it. **`inflightJobCount()` on the router reads
28,327 at block 120,156,766, timestamp 1788632091, 2026-09-05T18:14:51Z.** It will not match SPINE's
per-status census (Open 994 plus Funded 285 plus Submitted 27,170 is 28,449) and it is not meant to: the
two are read at different times by different files, so a reader comparing them is looking at two
timestamps rather than a contradiction. Muster runs the `settler` component: the moment
`submittedAt + disputeWindow` elapses it calls `router.settle(jobId, "0x")` for any job, **including jobs
that have nothing to do with Muster**. It turns a stalled escrow into a paid operator, it costs one
transaction, it is free to the operator and it is the cheapest real service in this document. Rejected:
settling only our own jobs, which saves the gas on every stranger's escrow, refused because a marketplace
that leaves 28,327 in-flight jobs stuck to save a few tenths of a BNB has nothing to show a judge. The
subsidy is bounded by choice rather than by hope (one settle is about 0.0000052 BNB at the measured gas
price, so the whole backlog is under 0.2 BNB).

### Platform fee inside the escrow

`platformFeeBP()` `0xff96092a` is **0** today, `MAX_PLATFORM_FEE_BP()` is 1000 and `setPlatformFee` is
owner-only on an upgradeable proxy that is not ours. So Muster cannot take a fee inside an ERC-8183
settlement and must not display a net-to-operator figure computed from a hardcoded zero: read
`platformFeeBP()` and compute.

**Muster's own fee on an escrow hire is a second EIP-3009 `$U` authorisation signed and submitted at
funding time, not at settlement.** This is the one place the two rails differ on timing and the reason is
arithmetic. A 3009 authorisation dies at `validBefore`, which is `now + 300`, while a mainnet escrow cannot
settle until `submittedAt + 604,800 s`, so an authorisation signed for the settle would be six days and 23
hours dead before the transaction it was meant to accompany. Extending `validBefore` past `expiredAt`
instead would break the 300 s cap that Section 7 calls the buyer's main control, which is a worse trade.
So the fee precedes delivery on this rail. That is acceptable for one reason: the principal is already
locked in the kernel when the fee is taken, so the buyer's exposure is the fee alone and the fee follows
the job (Section 8 returns it from the treasury on any refund or upheld dispute). Every fee row in the
ledger names its rail, so an `escrow8183` fee row is understood to have been taken at funding while an
`eip3009` fee row was taken after the deliverable existed.

The signature path is the one from Section 2 and it works for both kinds of buyer, because the escrow rail
is `$U` only and `$U` verifies `ecrecover` then ERC-1271. An EOA buyer signs normally. A smart-account
buyer signs through ERC-1271 with `approveSignatureChecker` naming `$U`. No allowance pull, no `approve`
plus pull and no waiver is needed for the fee leg on either rail.

## 6. Agent wallets

### The ERC-8004 `agentWallet` key

`agentWallet` is the only reserved metadata key on the Identity Registry: any other key is accepted and
this one is rejected by `setMetadata` and by the register overload with `reserved key`. Read it with
`getAgentWallet(uint256)` `0x00339509`. Change it with
`setAgentWallet(uint256,address,uint256,bytes)` `0x2d1ef5ae`, whose EIP-712 domain is
`("ERC8004IdentityRegistry", "1", 56, registry)` over
`AgentWalletSet(uint256 agentId,address newWallet,address owner,uint256 deadline)`, **signed by the new
wallet** with a deadline window of at most 300 s.

Two measured facts change how much weight that field can carry. `getAgentWallet` is non-zero on **600 of
600** sampled agents, because `register` writes `msg.sender` at mint. And it differs from `ownerOf` on
**0 of 600** (`MEASUREMENT.md`). So a non-zero `agentWallet` is not a filter, it is the whole registry.
A settlement wallet distinct from the owner is a signal Muster can offer an operator rather than one it
can rely on.

Because the owner may call `setAgentWallet` at any time, the payee is pinned at quote time and re-read at
settle. A change between the two is a hard refusal and a re-quote, never a silent payment to the new
address. That is the money half of the silent-capability-change rule in `R15-compliance.md`.

### Altana wallets and sessions

An Altana wallet is not a deployed contract, it is an EIP-7702 delegated EOA: 23 bytes of code, `0xef0100`
plus the Porto account proxy `0xc0f16888f4198f53892c53af859f673e23f26fa3` on chain 56. One wallet per
agent, never one wallet for four agents.

The half most write-ups miss is where the permissions live. The Keystore stores the key and the expiry,
nothing else. The allowlist and the spend cap live **on the wallet** and both are free `eth_call`s:

| What | Call | Where |
| --- | --- | --- |
| is this key live | `isValidKey(wallet, keyId)` `0x8fd4f06b` | Keystore `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a`, `VERSION()` `1.0.1` |
| when does it expire | `getExpiry(wallet, keyId)` `0x3b49ad47`, unix seconds, 0 means a root key | Keystore |
| what may it call | `canExecutePackedInfos(keyHash)` `0xe5adda71`, then `canExecute(keyHash, target, data)` `0xff619c6b` | the wallet |
| how much may it spend | `spendInfos(keyHash)` `0xdcc09ebf` | the wallet |

A `canExecutePackedInfos` entry is 32 bytes: `target (20) || zero (8) || selector (4)`, with `0x32323232`
as the any-function sentinel. A `spendInfos` entry is a static 7-word struct where word 0 is the token
(`0x0` for native BNB), word 1 the period enum (`0 minute, 1 hour, 2 day, 3 week, 4 month, 5 year`), word
2 the limit in raw units and word 6 the current period start. A limit of `2^160` is Porto's practical
no-cap value, so a panel that prints it as a number is printing "unlimited" in disguise.

Registration costs real money: `registrationFeeUSD()` is `5e17`, so $0.50 priced off a Chainlink BNB/USD
feed, about 694,041,152,910,285 wei on mainnet. Four agents with one session each is eight registrations
on first use, under $5 in total.

Two key identifiers exist for the same key and confusing them is the most likely integration bug in the
whole track:

```
Keystore keyId  = keccak256(SEC1 publicKey)                       // 0x04 || X || Y, 65 bytes
account keyHash = keccak256(abi.encode(uint8 keyType, keccak256(publicKeyBytes)))   // keyType 2 = secp256k1
```

The Keystore takes `keyId`. Every account-level permission read takes `keyHash`. Muster's panel shows both
with the derivation beside them.

Revocation is one admin call, atomic across both layers and monotonic: `revokeSession` batches
`revokeKey(wallet, keccak256(pubkey))` on the Keystore with `revoke(keyHash)` on the account. From the next
block `isValidKey` is false and the keyId drops out of `getKeys`. It cannot be undone, so restoring access
means granting a fresh keypair. Five things Muster never does, each of which costs a gate: grant a session
without `calls` (omitting it grants every target inside the cap), scope the ERC-8004 registry as
`{to: registry}` (that also authorises `transferFrom`, `setApprovalForAll` and `setAgentWallet`), pass
`register: false` on anything submitted, let the SDK generate the session signer or set a stablecoin cap
with 6 decimals.

The session shapes the four categories need are narrow and the narrowest belongs to the riskiest category.
A health-factor session needs `approve` on the debt asset plus `repay` and `supply` on the pool, nothing
else. Rebalancing and grid trading share one shape: `approve` on the basket tokens plus the
PancakeSwap v2 router `0x10ED43C718714eb63d5aA57B78B54704E256024E`, with a daily cap. Yield is `approve`
plus two or three methods on one protocol. Four narrow scopes read better than one wide one and they are
what makes the consent screen short enough to be honest.

### Whether an Altana wallet can pay a 402, settled

**It can, on `$U` and on FDUSD. It cannot on USD1.** This section previously recorded the opposite as a
conflict between two research files. The chain settles it in `R06-altana.md`'s favour: `$U` and FDUSD both
staticcall ERC-1271 `isValidSignature(bytes32,bytes)` on `from` after `ecrecover` fails to match, USD1 does
not. Selector `1626ba7e` is present in the first two implementations and absent from the third. The
traces and the greps are in Section 2 and the reversal is recorded in
`decisions/08-money-erc1271-branch-supersedes-r04.md`.

What that costs a smart-account buyer is one extra call per session, not a different rail. The account's
`isValidSignature` returns the magic value only when `msg.sender` is an approved checker for that key, so
the session calls `approveSignatureChecker` once, naming the **token contract** for the EIP-3009 rails and
the canonical Permit2 for the Permit2 rails. Skip it and a perfectly valid signature comes back
`0xffffffff`. The digest is nested rather than plain: the account wraps our EIP-712 digest under its own
`verifyingContract`-only domain and the wire signature is `innerSig || keyHash || prehash`, 98 bytes for a
secp256k1 session key, so a verifier calls `isValidSignature` and never `ecrecover` (`R06-altana.md`).

The escrow rail stays the fallback rather than the universal smart-account path, since USD1 is what needs
it: a quote a smart account asked for in USD1 is refused and re-quoted in `$U`, because the kernel pulls
against an allowance and does not care what kind of account the client is.

**No buyer-side Altana grant ships by 2026-09-09.** The token support is verified and the flow is
specified. The ship table puts the buyer-side grant under Documented as next, so on the judged build
there is no Altana-wallet buyer to exercise it. Hiring never requires an Altana wallet. What ships is the
operator side: the session panel reads and revokes any session that exists, on all four categories.

## 7. Buyer-side spend controls

On the 402 rail **the authorisation is the cap**. It names one token, one exact amount, one recipient and
one expiry. It can be spent once because the nonce burns on chain. There is no allowance to leak and
nothing to revoke afterwards, which is why this rail is the default for a stranger's first hire.

Four controls sit around it:

| Control | Value | Enforced |
| --- | --- | --- |
| expiry | `validBefore = now + 300` | in the signature, so nothing off chain can extend it |
| per-listing ceiling | a listing whose price exceeds the ceiling cannot be signed from the UI | server side, before the challenge is built |
| per-buyer window budget | `limit`, `spent`, `remaining` in base units, checked before every signature request | server side |
| cancel an unspent authorisation | USD1 only, `cancelAuthorization` `0x5a049a70` over `CancelAuthorization(address authorizer,bytes32 nonce)`, typehash `0x158b0a9edf7a828aad02f63cd515c68ef2f50ba807396f6d12842833a1597429` | on chain, by the buyer |

The per-listing ceiling is one line with real teeth: without it a single rogue listing can consume a whole
per-buyer budget in one call. On `$U` and FDUSD there is no on-chain cancel, so the expiry is the only
revocation and the signing sheet says so in words rather than leaving it implied.

### Where the revoke button lives

Three surfaces and none of them is a settings page nobody opens.

**The signing sheet, before any signature.** What is being paid, to which address, in which token, the
amount in both base units and decimal, the expiry as a countdown, the fee as its own line and the total.
Continuing and stopping are presented with equal weight rather than a bright button beside a grey link,
which is the transferable idea from the FCA's cooling-off rule (`R15-compliance.md`).

**`/agent/<agentId>/authority`, the session panel.** Rendered from the four chain reads above on every
render, with no server cache, so a judge running the identical calls gets the identical answer. It shows the
allowlist as target-and-selector pairs resolved to names, each spend cap with its period and the live
period window, the expiry countdown, both key identifiers, the live or revoked verdict and a link to
`https://explorer.altana.network/account/<wallet>` and `/key/<full 32-byte keyId>` as third-party evidence.
A truncated key id 404s there, so the full one is always used. The **Revoke** button sits on this panel and
is wired to `revokeSession`. After a click, `isValidKey` flips false and the keyId drops out of `getKeys`
in the next block, which is the check a verifier runs.

The explorer is linked as evidence and never used as the source of truth. On 2026-09-05 an Altana account
page reported "0 Active keys, 0 Total keys" while `getKeys` returned two keys with one valid. A key
page said "(from indexed history, live node read unavailable)" (`R06-altana.md`). Anything Muster asserts
comes from the contract.

**`/account/spend`, the buyer's own page.** Every authorisation the buyer has signed through Muster with
its state (`signed`, `settled`, `expired`, `cancelled`), every unspent nonce with a Cancel button where the
token supports it, the window budget with `spent` and `remaining`, plus every escrow job with its countdown
to auto-approval plus its dispute and claim-refund buttons. The buyer-session block is present and empty on
the judged build, with one line saying why: the buyer-side Altana grant is Documented as next, so a buyer
has no session for Muster to render or revoke. It fills itself from the same four chain reads the moment
that grant ships.

## 8. Refunds without a card network

There is no chargeback on either rail and Muster cannot force one. Saying so plainly is part of the design,
because a refund promise the rail cannot execute is worse than no promise.

| Situation | What happens | Who acts |
| --- | --- | --- |
| the work fails before settle | nothing settled, so nothing to refund. `verify` commits no state and the payment flow is verify, resource, settle, respond | automatic |
| the buyer abandons after signing | the authorisation expires unspent at `validBefore`. On USD1 the buyer may also burn the nonce on chain | automatic or the buyer |
| the deliverable is wrong and the payment already settled on the 402 rail | the operator sends a plain transfer back from `agentWallet` and Muster verifies it by matching token, amount, `from` and `to` then links both transactions in the receipt | the operator, with reputational and evidence-tier consequences if they do not |
| the deliverable is wrong on the escrow rail | the client calls `dispute` inside the window, then 3 of 5 voters must `voteReject` for the escrow to return | the client, then the panel |
| the operator never submits | anyone calls `claimRefund(jobId)` after `expiredAt` and the full escrow returns to the client, unhookable | anyone, including Muster |
| the client rejects before funding | `reject` while OPEN | the client |
| the fee on a refunded job | Muster sends the fee back from the treasury as an explicit outbound transfer, recorded as its own ledger entry. The fee follows the job | Muster |

**There is no `refundIntent` object and 08 does not define one.** An earlier form of this row named one.
`09-DISPUTES.md` owns the intake and every clock on it, then settles the handoff as a `dispute` row
like any other rather than a second record: `raisedBy`, a reason code, a state and remedy `refund`. So the
question of who may file, within how long, plus how long the operator has before the reputational and
evidence-tier consequence lands is answered there, not here. 08 owns exactly two things in this row: the
`directTransfer` ledger leg and the rule that a refund is only recognised when a second transaction matches
the first on token, amount, `from` and `to`.

Two limits are structural rather than chosen. **Neither rail supports a partial refund**: an EIP-3009
authorisation is all or nothing and ERC-8183 has no partial release and no streaming, so the unit of refund
is one job. And a refunded job's on-chain history stays on chain forever, so a refund is a second payment in
the opposite direction rather than the erasure of the first. The receipt shows both legs.

## 9. Fees: the number, who pays, when and what is free

**The number, as a formula rather than a headline:**

```
feeBase = max(floorBase, floorDiv(priceBase * basisPoints, 10000))
  basisPoints = 200
  floorBase   = 10000000000000000        # 0.01 $U at 18 decimals
  minimum brokered price = 100000000000000000    # 0.10 $U, below which Muster does not broker
```

All three symbols are base-unit integers in the settlement token. The multiplication happens before the
division and the division truncates toward zero, so the percentage leg never rounds up against the buyer.

Describe it as what it is rather than as a percentage: **a flat 0.01 `$U` brokerage on everything up to
0.50 `$U`, with 200 bps taking over above that.** The crossover is exactly `floorBase * 10000 / 200`, which
is 0.50 `$U`. Below it the floor binds and the effective rate falls as the price rises.

| Price | Fee | Effective rate | Which leg binds |
| --- | --- | --- | --- |
| 0.05 `$U`, one metered leg | 0.01 `$U` | 20% | floor |
| 0.10 `$U`, one report or snapshot | 0.01 `$U` | 10% | floor |
| 0.50 `$U` | 0.01 `$U` | 2% | both, exactly |
| 1.00 `$U`, seven-day window | 0.02 `$U` | 2% | percentage |
| 5.00 `$U`, the E0 to E2 price cap | 0.10 `$U` | 2% | percentage |

**The 200 bps comparison holds only above the crossover, so it is not the defence.** `protocolFeeBps()` on
`0x6A52ba4C84b348FaEAe13dDC7A97b4F6af23913C` returns 200, read on chain today. The incumbent's 200 bps
is also **deducted from provider proceeds** with no floor (`R07-termix.md`), where ours is additive to the
buyer with a floor. Those are different instruments, so quoting the same integer proves nothing on its own.
The defence at our prices is cost recovery, stated as an amount: one 3009 settle is 103,377 gas measured for
`$U` and the fee leg is a second one, so a brokered hire costs Muster about 200,000 gas, about 0.00001 BNB
at the measured 0.05 gwei. The floor is that cost plus the compute and the storage of a receipt, a screening
verdict and a ledger entry, rounded to a number a buyer can read. At 0.10 `$U` that is 10% of the price and
the document says 10% rather than implying 2%.

**Below the floor Muster does not broker at all.** The floor cannot exceed the principal, because a listing
priced under 0.10 `$U` is not brokered: it can still be paid directly over the challenge we publish, at zero
fee, which is the free path in this same section. That rule exists because the market's own measured mode
runs below our floor: at the modal ERC-8183 budget of 0.0001 `$U` a 200 bps fee is 2e-6 `$U` while the floor
is 100 times the principal, so charging either would be absurd in a different direction. Publishing a
minimum brokered price is the only answer that is neither.

The floor is set from the measured gas and a BNB price read at deploy time (720.62 USDT on 2026-09-05 from
Binance's public ticker, per `R07-termix.md`), sized against `$U` at nominal parity for that one purpose and
asserting no peg. It is published as a base-unit number rather than recomputed per request so a buyer can
predict it. The BNB price is used to choose the constant, never redisplayed in the product, because
Binance's market-data licence terms for redisplay are **unverified**.

**Who pays: the buyer, additively, as a disclosed line item.** Not the operator. The operator receives
exactly the price they published. The reasoning is in Section 4: an additive fee keeps `accepts[].amount`
identical to the operator's own number and it makes the fee visibly the price of the marketplace service
rather than a hidden cut of the operator's revenue. MiCA Article 81(3)(b) treats a third-party benefit as
incompatible with a claim of independent advice, so Muster never claims independence anywhere, publishes the
fee and publishes the ranking methodology with a statement that the fee does not influence it
(`R15-compliance.md`).

**When it is taken depends on the rail and both are stated.** On `eip3009` it is taken at settlement, in a
second transaction, after the principal, never before the work exists. On `escrow8183` it is signed and
submitted at funding time, because a 300 s authorisation cannot survive a 604,800 s dispute window: Section
5 has the arithmetic and the reason that is acceptable when the principal is already locked in the kernel.
Never at listing time and never as a subscription on either rail. Every fee row in the ledger names its
rail, so which of the two happened is a fact on the record rather than an assumption.

**What is free, which is also the answer to "why not just pay the agent directly".** Browsing, search,
compare, the whole `api` read surface with no auth, the `mcp` read tools, the conformance suite, the status
page, every receipt including receipts for payments that did not go through us and the settler, which calls
`settle` for anybody's job. Paying an agent directly over plain x402 with the challenge we publish is also
free and always will be. What the fee buys is the receipt, the export, the dispute intake and the screening
verdict attached to the payment.

The four first-party reference listings pay the fee like anybody else and every fee entry carries its
`origin` tag, so a judge can see which fee revenue was `house` and which was `order`. Revenue counts `order`
only. If nobody outside pays a fee inside the judging window, the ledger shows zero `order` fee revenue,
which is the honest number rather than an embarrassing one.

## 10. Failure modes

| Failure | What Muster does |
| --- | --- |
| **a paid call the agent never answers** | it is never paid. Settle runs only after the resource returns and the deliverable hash exists, so an unanswered call ends with the authorisation unspent and expiring at `validBefore`. The probe result is recorded against the listing |
| **a settled payment on a failed job** | possible only when the agent returns 200 with unusable content. The deliverable hash is recorded, the buyer files under Section 8, the refund is a transfer back and the outcome feeds the evidence tier. Muster cannot claw it back and the receipt says so |
| **the work ran but settle failed** | the buyer spent the balance after signing or the token paused or a freeze landed. The deliverable is withheld, the buyer is told which numbered check failed and the compute cost is Muster's loss. Mitigated by verifying immediately before running and by rate-limiting unpaid work per payer address |
| **a reorg** | a payment is `settled` only after the configured confirmation depth, shipped at 15 blocks, which is about 6.8 s at the measured 0.45 s block time. If the transaction is absent at that point the state goes to `settlement_pending` and the **same authorisation is resubmitted**, which is safe because the nonce is unspent and, if the original later lands, the second attempt reverts `Authorization already used`. A 3009 nonce makes double charging structurally impossible. Our 15-block depth is a conservative choice of ours, not a published BSC finality figure. Rejected: one confirmation, which would show `settled` about 6 s sooner and put the claim at the mercy of a reorg we have not measured |
| **a stuck relayer nonce** | Ethereum transaction nonces are sequential, so one stuck submission stalls a single-key relayer. One in-flight transaction per key, a replace-by-fee bump after a timeout (trivially cheap at 0.05 gwei) and N relayer keys sharded by payer address so one stuck key cannot stall the marketplace |
| **a stuck payment nonce** | does not exist on the 3009 rail. The nonce is a random `bytes32` rather than a counter, so many authorisations are outstanding at once with no ordering constraint. This is the exact deficiency EIP-2612 has and EIP-3009 was written to fix, which is why Muster never uses `permit` even though all three tokens support it. On the Permit2 rail the nonce is a bitmap position: read `nonceBitmap(owner, wordPos)` `0x4fe02b44` and pick a clear bit |
| **an expired authorisation** | check 5 of verify rejects it before the work runs and a settle attempt would revert `authorization is expired`. The buyer is re-quoted and never charged. Work whose expected duration exceeds `validBefore - now - 30 s` is refused on this rail and routed to escrow |
| **an escrow job refundable before it can settle** | the failure `expiredAt` exists to prevent, which is why it is derived from the delivery deadline rather than from funding time. `claimRefund` opens at `expiredAt` while `settle` reverts `NotDecided()` until `submittedAt + disputeWindow`, so a funding-time formula strands every job that takes longer than 1800 s to deliver. The create path asserts `expiredAt > deliveryDeadline + disputeWindow` and refuses to create the job otherwise, so the ordering is a precondition rather than a hope. An operator who submits after `deliveryDeadline` can still lose the job to a refund, which is the intended outcome |
| **a smart-account buyer on a token with no ERC-1271 branch** | USD1 only. `eth_getCode(from)` is non-empty, the signature can never recover to `from`, so verify refuses with our own `smart_account_token_unsupported` before any work runs and the buyer is re-quoted in `$U` or routed to the escrow rail, which pulls against an allowance |
| **the payee changed mid-flight** | `getAgentWallet` is re-read at settle. A change is a refusal and a re-quote |
| **the front-run** | another submitter lands the buyer's authorisation first. Funds still reach the signed `to`, so Muster reads the `AuthorizationUsed` log, records the third party's transaction hash and treats the payment as settled |
| **B402 returns `success: false` with a hash** | not terminal. Poll `/settle` at 3 to 5 s, key on `transaction` being empty or not and never on the HTTP status, which is always 200. Reading it as terminal books paid calls as failures |
| **both RPC endpoints unreachable** | refuse to quote. Screening and freeze checks cannot be skipped, so a quote that cannot run them is not served |

## 11. The ledger

Every payment writes one `payment` record and one `ledgerEntry`. The `ledger` is append-only and
hash-chained, `origin` is enforced at append time so an unknown value cannot be written rather than merely
being detected later. `walk()` recomputes every hash, follows every link, checks every signature and
returns `{ok, checked, failures[]}` with each failure naming its `seq`, its `check` and its issue.

`payment`, exactly the SPINE fields, with what each holds here:

| Field | Value on this build |
| --- | --- |
| `paymentId`, `jobId` | ours |
| `rail` | `eip3009` on the default rail, `permit2Exact` on the USDT rail, `escrow8183` for a funded job, `directTransfer` for a refund leg. `permit2Upto` is defined and unused |
| `token`, `decimals`, `amountBase` | address, the `decimals()` read at boot and a base-unit decimal string. Never a float, never a hardcoded decimals count |
| `payer`, `payTo` | `from` and `to` from the authorisation, with `payTo` proved against `getAgentWallet(agentId)` or the kernel address |
| `nonce`, `validAfter`, `validBefore` | the signed values, so a buyer can re-derive the digest they approved |
| `txHash`, `blockNumber`, `settledAt` | from the receipt, with the hash `0x`-normalised before it is ever put in a link |
| `facilitator` | `in-process` or `b402` |
| `gasPaidBy` | `muster-relayer`, `buyer`, `b402` or `altana-relay` |
| `feeBase` | the fee on the principal row, `0` on the fee row |
| `state` | `quoted`, `signed`, `verified`, `settlement_pending`, `settled`, `expired`, `cancelled`, `failed`. `settlement_pending` keeps x402's own spelling because x402 defines it as a non-terminal error reason, which is the one exception to SPINE's camelCase rule |
| `origin` | `house` or `order`, nothing else |

### The payment lifecycle, with the writer per edge

Eight states are not a lifecycle until the transitions and the terminal set are written down, so here they
are in the shape Section 5 uses for the escrow.

| From | To | Who writes it | On |
| --- | --- | --- | --- |
| `quoted` | `signed` | `broker` | the buyer returns a `PAYMENT-SIGNATURE` |
| `quoted` | `expired` | `broker` | the quote's own `expiresAt` passes with no signature |
| `signed` | `verified` | `facilitator` | all ten verify checks pass |
| `signed` | `failed` | `facilitator` | any verify check fails, with the numbered code recorded |
| `signed` | `expired` | `broker` | `validBefore` passes before verify runs |
| `signed` | `cancelled` | `broker` | the buyer burns the nonce on chain, USD1 only |
| `verified` | `settlement_pending` | `facilitator` | settle is broadcast and not yet at the confirmation depth |
| `verified` | `expired` | `facilitator` | the resource took longer than `validBefore` allowed |
| `settlement_pending` | `settled` | `facilitator` | the transaction is present at 15 confirmations |
| `settlement_pending` | `failed` | `facilitator` | the transaction reverted for a reason that is not `Authorization already used` |
| `settlement_pending` | `settled` | `facilitator` | the front-run case: `AuthorizationUsed` is on chain at the signed `to` and `value`, so somebody else's transaction hash is recorded |

**Terminal: `settled`, `expired`, `cancelled`, `failed`.** `verified` never goes to `expired` after settle
is broadcast, because the broadcast is what moves it to `settlement_pending`. Nothing leaves a terminal
state. A refund does not reopen `settled`: it is a second `payment` record on the `directTransfer` rail,
which is why Section 8 calls a refund a payment in the opposite direction.

Four attributes are attached to the record that are not in SPINE's `payment` field list, each because
something else in this build needs them: `quoteId` with `providerSigVerdict`, `screeningId` with
`listFetchedAt` and `listSha256`, `freshness` as the block number, timestamp and source triple, plus
`authDigest`. The digest is what lets a buyer prove later that what they signed is what settled.
The names are camelCase per SPINE's spelling rule. The record they point at keeps the name its owner
gave it: `09-DISPUTES.md` writes the verdict as `kind: screening_verdict` in the R15 shape, so
`screeningId` is a reference to that record rather than a rename of it. It is spelled the way
`screeningCheck`'s own key is spelled so a join reads the same on both tables.
**`15-SYSTEM.md` section 2.6 extends
SPINE's `payment` list with exactly these four names and no others**, since SPINE reserves new field names
to that document. Two of the four are shorter than an earlier draft of this section asked for,
`screeningId` rather than `screeningVerdictId` and `authDigest` rather than `authorizationDigest`, settled
in `three/decisions/15-system-stored-model-requests-delivered.md`.

A brokered hire therefore writes two ledger entries under one `jobId`, `kind: payment.principal` and
`kind: payment.fee`, so a CSV export sums to the buyer's real outlay and revenue can be counted without
double counting the principal.

Entry bodies are hashed and signed over **canonical bytes**:
`json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")`, keys sorted recursively. A
browser verifier reproduced those bytes with WebCrypto and matched what the server signed, which is what
makes the format canonical rather than merely self-consistent.

The third check is the one a plain append-only log cannot do. Every entry carries its inputs, so `walk()`
also recomputes the decision from the recorded inputs using the same function the live path used. An entry
edited by hand fails that check even when its hash and its signature are recomputed perfectly with the real
key. For a payment the re-derivation is cheap and exact: the digest recomputes from `token`, `payer`,
`payTo`, `amountBase`, `validAfter`, `validBefore` and `nonce`. The fee recomputes from the price plus
the published basis points and floor.

Nothing personal goes into an entry. An entry holds wallet addresses, job ids, hashes, amounts, tokens,
timestamps and screening verdicts. It holds no email, no IP joined to an address, no raw job brief past
the challenge window and no free text about a person. That list is the EDPB position in
`R15-compliance.md` applied to the money records. It is also why a subpoena answer is short.

## 12. What a buyer can export

Three artifacts, all reachable without an account, all keyed on the buyer's address.

**The per-job receipt**, at `/receipt/<receiptId>`, carrying the SPINE `receipt` fields: `contentHash`,
`hashRule`, `txHash`, `blockNumber`, `pinnedBlock`, `inputsHash`, `codeVersion` and a
`recomputeCommand` a reader can paste. Because three incompatible deliverable-hash conventions are live on
BSC right now (`keccak256(canonicalJson(manifest))`, `sha256(optParams bytes)` verified byte-exact on one
producer and empty `optParams` where nothing can be checked), the receipt names which rule matched rather
than printing "verified" with no referent. Where nothing matched it says the deliverable is not retrievable
from chain data. This doubles as the durable confirmation the withdrawal-right exemption needs, alongside
the acceptance record that stores the exact wording the buyer ticked and when.

**`GET /v1/export.csv?payer=0x…&from=…&to=…`**, one row per payment leg so principal and fee are separate
rows and the total reconciles against the wallet:

```
settledAtUtc,jobId,agentId,listingId,category,rail,kind,tokenSymbol,tokenAddress,decimals,
amountBase,amountDecimal,counterparty,txHash,blockNumber,explorerUrl,state,origin,
deliverableHash,hashRule,receiptId,usdRate,usdRateSource
```

`amountBase` is the base-unit string and `amountDecimal` is a decimal **string**, never a float, because a
float loses a wei at 18 decimals and an accounting export that cannot be reconciled to the chain is worse
than none. `usdRate` and `usdRateSource` ship **empty** and the docs say why: `$U`'s issuer, peg and
redemption are unverified, it is on no stablecoin issuer list we read and the market-data licence terms
for redisplay are unverified too. Printing 1.00 USD beside a token whose peg we have not read would be
exactly the kind of unverified claim this build exists to avoid. A buyer who needs fiat brings their own
rate and the columns are there so they can fill them.

**`GET /v1/export.json?payer=0x…`**, the signed ledger slice with `seq`, `prevHash`, `entryHash` and `sig`
per entry plus the public key and the `walk()` command, so the export verifies offline with no call back to
us.

Both exports are **unauthenticated and keyed on a public address**, deliberately. Every field in a row is
already on chain or derived from it: transaction hashes, block numbers, token amounts, the two counterparties
and a deliverable hash. No screening verdict, no email, no IP and no free text about a person is in either
export, which is the Section 11 rule applied to the outward surface. Rejected: gating the export behind a
signature from the payer, which is the obvious privacy default. It is refused because the export exists so
a stranger can check our arithmetic against the chain without asking us for anything. Gating it would
put Muster between a judge and a claim we made about our own ledger. The gate belongs on anything that is
not already public. Nothing here is.

Not produced, said plainly rather than implied: an invoice, a tax document and any statement of profit or
loss. `14-GAPS.md` owns invoicing and tax as documented-next work. Muster exports what it can prove from
chain.

## What ships by 2026-09-09

| Ships | Documented as next | Deliberately not built |
| --- | --- | --- |
| x402 v2 challenge and payload, in-process facilitator, verify plus settle on BSC mainnet | B402 as the facilitator, a config flip that changes the token set as well as the endpoint | a success fee, for the reasons in Section 1 |
| four `accepts[]` entries: `$U`, USD1, FDUSD and USDT over Permit2. FDUSD is in-process only and the builder drops it under the B402 client | `permit2Upto` metered settlement | our own escrow contract |
| the two-authorisation brokered hire, `feeBase = max(0.01 $U, 200 bps)`, with 0.10 `$U` as the minimum brokered price | a stateless batcher putting both legs in one transaction | any standing allowance, including a subscription pull |
| the conformant single-authorisation direct path at zero fee | the buyer-side Altana grant as an optional advanced path, so no Altana-wallet buyer exists on the judged build | a splitter contract that receives then forwards |
| USDT over Permit2, labelled, with the approve step surfaced, its own verify table and the EIP-7702 pre-check | `OperatorBond` behind evidence tier E1, so E1 has no mechanism on any chain at ship | a fiat rate in the export |
| escrow over the official ERC-8183 stack, plus the settler running for anybody's job | an outcome-linked bond in place of a success fee | a partial refund on either rail |
| the hash-chained ledger with `origin` enforced at append, `walk()` and re-derivation | | |
| receipts, CSV and signed JSON export | | |
| screening plus freeze and pause checks on the quote path and again at settle | | |
| the session panel read live from chain with Revoke wired, on all four categories | | |
| one COMPLETED testnet escrow job on the 900 s window, plus one funded mainnet escrow job **conditional on the funding transaction being sent** | | |

The last row is the honest shape of an escrow demo inside this calendar, written as two rows in
one on purpose. The testnet job is unconditional: it proves the loop closes end to end inside one sitting on
the 900 s window. The mainnet job is conditional because it needs real funds moved by a human. The
trigger and the fallback are both named. **Trigger:** a mainnet `$U` balance in the demo wallet plus the
`approve` and `fund` transactions sent. **Fallback if it is not sent:** the row moves to Documented as next
and the testnet COMPLETED job is the shipped escrow evidence, which is already sufficient because it is a
full lifecycle rather than a partial one.

The acquisition question that used to sit under this row is settled. A `$U` route exists on mainnet:
PancakeSwap v3 0.01% pool `0xA0909f81785f87f3e79309F0E73A7d82208094E4` pairs USDT against `$U` and holds
11,313,040.02 `$U` against 9,706,504.98 USDT with `liquidity()` 2.66e27, read at block 120,156,766,
timestamp 1788632091, 2026-09-05T18:14:51Z. A second pool `0x882e23dbA77BFe0e514cF5BcDad7a58acEB01522` at
0.05% holds 2,684,557.81 `$U` against WBNB. No substitution was ever available for the escrow leg anyway,
because `paymentToken()` on the kernel returns `$U` and one token per kernel is the contract's rule, so the
route mattering was the whole question. A mainnet job funded on 2026-09-08 becomes settleable around
2026-09-15, mid-judging, so the page shows it as an in-flight hire with its auto-approval date and its job
id. Nothing is described as COMPLETED before it is.

## Decisions and rejected alternatives

| Decision | Rejected | Why |
| --- | --- | --- |
| Quote in `$U` first with USD1 in the same challenge, against `VERIFIED-payment-rail.md`'s own recommendation | USD1 first, which the authoritative file recommends and which live B402 supply favours 958 to 24; USDT as the default | `$U` is the token the official ERC-8183 kernel pays in, so one token covers both rails, one balance, one decimals read, one export column, plus a buyer who wants any escrow product needs it regardless. `$U` also branches to ERC-1271 where USD1 does not, so it is the token a smart-account or Studio buyer can pay with. USD1 rides beside it in the same challenge, so ordering costs a USD1 holder nothing. USDT cannot do one signature at all. Recorded in `decisions/08-money-u-first-over-usd1.md` |
| Verify branches on `eth_getCode(from)`: `ecrecover` for an EOA, ERC-1271 on `$U` or FDUSD for a payer with code | Plain `ecrecover` on all three tokens, which is what `R04-bsc-tokens.md` reported | Traced on mainnet: `$U` and FDUSD staticcall `isValidSignature` on `from`, USD1 does not, while selector `1626ba7e` is in the first two implementations and absent from the third. `ecrecover`-only verify refuses a payment the token itself would accept, which is exactly the Altana or Studio buyer the Altana track needs. Recorded in `decisions/08-money-erc1271-branch-supersedes-r04.md` |
| `transferWithAuthorization` straight to `agentWallet` | `receiveWithAuthorization` into a Muster contract | The receive form is the safer mechanic, though it requires a contract of ours to hold the funds, which is the perimeter we will not cross. Ordering exposure is the price and no funds are at risk, because `to` and `value` are inside the signature |
| The fee is a second buyer-signed authorisation, additive, disclosed | A splitter contract that receives the total and forwards atomically | Accepting value in order to pass it on is the payment-processor pattern FinCEN puts inside the money-transmitter definition. Atomicity is a technical property, not a legal one. One fewer wallet prompt is not worth the perimeter |
| The fee is additive to the operator's price | Deducting it from the operator's proceeds, as the incumbent does | Deduction needs either custody or an `accepts[].amount` below the price the operator published. Additive keeps our challenge byte-identical to the operator's own number, so any x402 client can pay a Muster listing |
| The escrow fee leg is signed and submitted at funding time | Signing it at hire for the settle, which would keep the two rails identical; extending `validBefore` past `expiredAt` | A 300 s authorisation is dead six days and 23 hours before a mainnet escrow can settle, so the uniform version collects nothing. Extending the window instead would break the 300 s cap that is the buyer's main control. The principal is already locked in the kernel when the fee is taken and the fee follows the job on any refund |
| `feeBase = max(0.01 $U, 200 bps)` with 0.10 `$U` as the minimum brokered price | Percentage only; a floor with no minimum price; zero fee for the launch window | At the market's measured modal budget of 0.0001 `$U` a 200 bps fee is 2e-6 `$U` while the gas we sponsor costs orders of magnitude more, so percentage-only means paying strangers to transact. A floor with no minimum price would let the fee exceed the principal, which the minimum removes. A launch-window zero would leave the mechanism undemonstrated, which is the thing a judge can actually check |
| Use the official ERC-8183 stack, deploy no escrow | `MusterEscrow`; a custom `IACPHook` plus a custom evaluator on the shared router | Our own escrow means self-issuing the verdict on our own listings. A custom policy is not even available: `setPolicyWhitelist` is owner-only and the owner is not us. The custom hook route exists and abandons the 3-of-5 panel and the optimistic settle |
| `expiredAt = deliveryDeadline + disputeWindow + 1800`, asserted on the create path | `expiredAt = now + disputeWindow + 1800` fixed at fund time | The funding-time form makes any job that takes over 1800 s to deliver refundable before it can settle, which is every job the escrow rail exists for. Deriving from the delivery deadline makes the ordering a precondition the create path checks rather than a property of how fast the operator happened to be |
| The authorisation window picks the rail, with a 1.00 `$U` threshold | Letting the buyer choose freely | A job that cannot deliver inside `validBefore` cannot be paid on the 402 rail, so the choice is arithmetic rather than taste. Offering a rail that will expire mid-job is offering a failure |
| Metered work is a two-phase exact quote | `upto` over `x402UptoPermit2Proxy` | EIP-3009 authorises an exact value with no primitive to settle less, so `upto` means moving to USDT plus Permit2, a one-time approve and a B402 extension whose `signerAddress` we cannot read without credentials. A signed exact quote gives the buyer a number before they sign |
| A watch window is one escrow job | A prepaid EIP-3009 authorisation; one escrow job per check; Permit2 `AllowanceTransfer` with periodic pulls | A seven-day deliverable cannot be paid on a 300 s authorisation and the 1.00 `$U` price crosses the escrow threshold besides, so the authorisation form has no rail. One job per check multiplies five transactions by the check count. A standing allowance outlives the job it was granted for, while Permit2 routes a signer with code to ERC-1271 where an EIP-7702 delegated EOA can fail with empty revert data |
| No success fee | A performance fee on the outcome | No on-chain outcome measure exists: 0 of 950 sampled feedback rows tag a financial outcome. Building our own means Muster judging the work, which is where a broker becomes the seller in the DSA sense. A performance fee is also the portfolio-management shape the product is built to stay outside |
| Carry `decimals` in `extra`, plus `paymentFlow` on every entry and a `schema` beside the extension's `info` | Spec-pure omission | A live marketplace listing carried a `tokenResolveError` naming the missing decimals field and could not be priced, so nobody paid it. The `extra` slot is reserved for scheme-specific keys, `paymentFlow` is a reserved key in that same slot and all four upstream extensions carry a `schema` that validates their `info`. A client that ignores any of the three loses nothing |
| The settler calls `settle` for anybody's job | Settling only our own jobs | 28,327 in-flight jobs is the ecosystem's problem to see solved and one settle is about 0.0000052 BNB, so the whole backlog costs under 0.2 BNB. Saving that would trade the cheapest demonstrable service in the document for a rounding error |
| The CSV and JSON exports are unauthenticated, keyed on a public address | An auth-gated export keyed to a signature from the payer | Every field is already on chain or derived from it. No screening verdict or personal field is in either export. The point of the export is that a stranger can check our arithmetic without asking us, so a gate would put Muster between a judge and a claim we made |
| Resubmit the same authorisation after a suspected reorg | Re-quote with a fresh nonce | The nonce makes double charging impossible: whichever transaction lands first burns it and the other reverts `Authorization already used`. A fresh nonce would need a fresh signature from a buyer who has already left |
| USDT over Permit2 ships labelled, off the default path, with its own verify table | Making it the default; not shipping it; shipping it with no verify path of its own | It widens the token story to the asset most buyers hold and it is verified working on a fork. It is not default because the buyer pays for a one-time approve, so it is not gasless from the first call and must not be sold as one. A rail in the ship list with no wire shape and no verify checks is a rail a builder cannot implement |
| The export prints token units and leaves the USD columns empty | Displaying stablecoins at 1.00 USD | `$U`'s peg and redemption are unverified and the market-data licence for redisplay is unverified. An accounting export that invents a rate is worse than one that names the gap |
| Hiring never requires an Altana wallet | Making the buyer-side Altana grant the hire path | The Functionality criterion is a stranger getting through with minimal friction and an Altana wallet costs $0.50 plus gas plus a new mental model. The panel still renders and revokes any session that exists |

## Open questions

| Question | What would settle it |
| --- | --- |
| B402's authenticated base URL, its real `signerAddress` and `spenderAddress`, whether it settles in `$U` or USD1 on mainnet and whether it accepts the `escrow` payment flow | one `/supported` response, which needs merchant credentials plus an allowlisted source IP. Whether those can be had before 2026-09-09 is itself unverified |
| Whether B402's verify rejects an unknown extension, which would decide whether our fee extension survives that facilitator | the same `/supported` and one verify call under credentials |
| Who holds the upgrade key on `$U`, USD1 and FDUSD. All three are proxies with live admins, so EIP-3009 could be removed under us mid-judging | read each admin slot and resolve its owner. `R04-bsc-tokens.md` recorded the three admin addresses without resolving what they are |
| `$U`'s issuer, peg and redemption. It is on no stablecoin issuer list we read | a primary source from the issuer. Until then the export prints token units and the product makes no peg claim |
| The real BSC finality depth. Our 15-block wait is a conservative choice of ours | a published finality figure or measuring reorg depth over a window |
| Whether an Altana **session key** signature verifies end to end on `$U`, as opposed to whether the token has the branch, which is settled | one `transferWithAuthorization` on a fork with an Altana wallet as `from` after `approveSignatureChecker($U)`, checking the nested ERC-1271 digest and the 98-byte wrapped signature. Nothing on the judged build depends on it, because no buyer-side Altana grant ships |
| Whether holding fee revenue plus, later, an operator bond in the same treasury changes the perimeter analysis in Section 4 | a read of the bond mechanics against FIN-2019-G001, done before `OperatorBond` is deployed rather than after. `05-ONBOARDING.md` fixes the stake and `09-DISPUTES.md` fixes the forfeit trigger, so this is the only open part |

Four questions that stood here are now settled, each by a read run on 2026-09-05 rather than by an argument.

| Was open | Settled answer | The read |
| --- | --- | --- |
| Does `$U` expose the freeze surface? Does it expose `reallocate`? | **Yes to the freeze surface, no to `reallocate`.** Verify check 9 is safe on `$U` and the issuer cannot move a `$U` balance outright | selector grep of implementation `0xbef21313c69c009fd7d9510a8d3a481a32473dfc`: `freeze(address)` `0x8d1fdf2f`, `unfreeze(address)` `0x45c8b1a6`, `frozen(address)` `0xd0516650` and `paused()` `0x5c975abb` all present, `reallocate(address,address,uint256)` `0x308b8c00` absent. USD1's implementation is the only one of the three carrying it |
| Can `$U` be obtained on mainnet at all? | **Yes, on PancakeSwap v3.** So the mainnet escrow demo has a funding route | `0xA0909f81785f87f3e79309F0E73A7d82208094E4`, fee 100, token0 USDT and token1 `$U`, holding 11,313,040.02 `$U` against 9,706,504.98 USDT, `liquidity()` 2.66e27 at block 120,156,766. Plus `0x882e23dbA77BFe0e514cF5BcDad7a58acEB01522` at fee 500 holding 2,684,557.81 `$U` against WBNB |
| The testnet `$U` address and its decimals, contradictory across three files | **Both files were right about different tokens.** So the boot-time `decimals()` assertion is what keeps testnet code correct, not a constant | on chain 97: `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` returns `name()` "United Stables", `symbol()` "U", `decimals()` **18**; `0x330949Aed7d00FCe0558C64ED6FeC9792616cC39` returns `name()` "U", `symbol()` "U", `decimals()` **6**. The second is B402's mock |
| Whether an Altana wallet can be the payer on the 3009 rail | **Yes on `$U` and FDUSD, no on USD1.** Section 6 has the full answer and the consequence for verify check 7 | the mainnet traces and selector greps in Section 2 |

Sources for every constant above: `SPINE.md` for names and verified values, `VERIFIED-payment-rail.md`
for token capability and the exact bytes, `R04-bsc-tokens.md` for the executed transfers and the gas,
`R03-x402-b402.md` for the envelope and B402, `R17-binance-agent-os.md` for B402's token set,
`R02-erc8183.md` for the escrow, `R06-altana.md` for wallets and sessions, `R12-agent-comms.md` for the
extension shape and the live 402 header, `R15-compliance.md` for the perimeter and the screening,
`R07-termix.md` for the fee comparable and the market prices, `R09-bsc-defi.md` for the watch cadence,
`MEASUREMENT.md` for the population figures and `R16-reuse.md` for the settled-money history. The five
reads dated 2026-09-05 in this document (the two ERC-1271 traces, the selector greps, `jobCounter()` with
`inflightJobCount()`, the two `$U` pools and the two chain 97 `decimals()` calls) were run for this
document and are cited with their block heights rather than to a research file.
