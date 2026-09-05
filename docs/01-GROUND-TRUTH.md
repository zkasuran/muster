# 01-GROUND-TRUTH: every external fact we verified ourselves

Read date 2026-09-05, BSC mainnet chain id 56 unless a line says 97. Every fact below carries the
call or the URL that produced it. Verified means somebody here ran that call and read that answer.
It does not mean somebody read a document that asserted it.

Two rules for using this file.

**Values live in `research/SPINE.md`.** This file proves things. The spine is where a constant
originates, so cite an address, a selector or a typehash from there and cite the proof from here.
Where a value is short enough to be useful in place it is repeated here. The two never disagree
because the spine was built from this evidence.

**`research/VERIFIED-payment-rail.md` outranks every other research file.** Every line of it was run
by hand rather than by a research pass. Section 4 below says exactly where `R04-bsc-tokens.md` goes
further than the verified file and how to label the difference.

Section 12 is what we could not verify. Anything in a document that touches section 12 carries the
word unverified in the same sentence.

## 1. ERC-8004 on BSC

The three registries exist, all three are live and one of them is missing from every public index.

| Fact | Verified by |
| --- | --- |
| Identity Registry is `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `cast call ... "name()(string)"` returns `AgentIdentity`, `"symbol()(string)"` returns `AGENT` |
| Reputation Registry is `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | `cast call ... "getIdentityRegistry()(address)"` returns the Identity Registry |
| **Validation Registry is `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`** | `cast codesize` returns 130, `getIdentityRegistry()` returns the Identity Registry, `getVersion()` returns `2.0.0` |
| 8004scan does not list the Validation Registry and trust8004 reports `validation: null` for chain 56 | `GET https://api.8004scan.io/api/v1/chains/56`, `GET https://trust8004.xyz/api/v1/chains` |
| All three are UUPS proxies over 130 bytes of identical dispatch code | `cast code` on each, `proxiableUUID()` on the proxy reverts `UUPSUnauthorizedCallContext()` |
| Upgrade authority on Identity and Reputation is a 3-of-5 Safe at `0xF223968Dd0c66472E31043acAcCcF5D1464D644b` | `cast call "owner()(address)"` on both proxies, then `getOwners()`, `getThreshold()` returns 3, `VERSION()` returns `1.4.1` |
| Upgrade authority on Validation is a single EOA at `0x8888d0A88ef8302dfa4BA53c41c2fE3c4E486f42` | `cast call "owner()"`, `cast codesize` returns 0, `cast nonce` returns 34 |
| Agent ids start at **0**, not 1 | `ownerOf(0)` returns `0x8CE2b1348740D27d6075F602Ad679a041407fdEc`, `tokenURI(0)` decodes to the agent named `dAi` |
| `totalSupply()` **reverts**, so the registry is not enumerable | `cast call ... "totalSupply()(uint256)"` returns `execution reverted`. `supportsInterface(0x780e9d63)` returns false |
| The exact agent count is one storage read | `cast index-erc7201 "erc8004.identity.registry"` gives slot `0xa040f78…04e00`, `cast storage` on it returns `_lastId` |
| Ids are contiguous with no gaps | 55 `Registered` logs across 5,000 blocks give ids 334,880 to 334,934, span equals count, plus 55 matching mint `Transfer` events |
| The first registration is block 79,094,807 at 2026-02-03T17:01:53Z | `eth_getLogs` on that single block returns 4 logs for agent id 0, tx `0xdf12ce1124937e842a2802e174cdb4c0af9c0c86795b9e92123ace02af0a5c1b` |
| `register` writes `msg.sender` into `agentWallet` at mint | the deployed source, cross-checked against 600 of 600 sampled agents returning a non-zero wallet equal to `ownerOf` |
| `agentWallet` is the only reserved metadata key | simulated `setMetadata(1,"agentWallet",...)` reverts `reserved key`. So does the register overload carrying it |
| Setting a distinct payout wallet needs an EIP-712 signature from the **new** wallet inside 300 seconds | simulated `setAgentWallet` reverts `expired`, `deadline too far`, `bad wallet` and `invalid wallet sig` across four probes |
| Nobody on BSC has ever done it | `getAgentWallet(id) != ownerOf(id)` matches 0 of 600 in a uniform sample and 0 of 544 in a stratified one |
| Self-feedback is impossible. That is the only sybil defence in the standard | `giveFeedback` from the agent owner reverts `Self-feedback not allowed`, from any other address it simulates clean |
| Anyone may append a response to anyone's feedback | `appendResponse` from a random EOA simulates clean. It never checks that the sender owns the agent |
| `getSummary` reverts on an empty client array while `readAllFeedback` falls back to every client | `getSummary(1,[],"","")` reverts `clientAddresses required`, `readAllFeedback(1,[],"","",false)` returns 2 rows |
| The Validation Registry has never been used | `getAgentValidations` returns empty for 1,999 sampled ids. 8004scan reports `total_validations: 0` platform-wide |
| `tokenURI` takes six different shapes in the wild | across 544 sampled ids: `https` 254, base64 `data:` 253, empty 17, **gzip `data:`** 6, non-URI junk 12, `ipfs` 2 |
| Two flags each have two live spellings | `x402Support` on 280 documents and `x402support` on 3, `supportedTrust` against `supportedTrusts`. Read both, prefer the spec spelling |
| There is no category field anywhere on chain | `getMetadata(id,"category")` is populated on 0 of 136 stratified ids and 0 of the newest 49 |

Source files: `R01-erc8004.md`, `MEASUREMENT.md`, plus the captures under `research/raw/`
(`erc8004-src-*-2026-09-05.sol`, `bsc-logs-first-registration-block79094807-2026-09-05.json`,
`bsc-metadata-key-probe-2026-09-05.json`, `bsc-validation-scan-2026-09-05.json`).

## 2. The agent population

Measured, not estimated. The sample is 600 agent ids drawn uniformly from the whole id range with a
splitmix64 generator, fixed seed `20260905`, rejection-sampled so there is no modulo bias, no
`Math.random` anywhere. It reproduces: re-deriving the draw gives the saved id list byte for byte,
and a chi-square over deciles is 11.13 on 9 degrees of freedom against a 5% critical value of 16.92.
Reproduce with `node tools/r11-sample.mjs`.

The sample validates against the population it came from. Sample A2A share 8.67% against 9.19%
population, MCP 2.00% against 1.77%, OASF 0 of 600 against 0.12%.

| Fact | Value | Read at | Verified by |
| --- | --- | --- | --- |
| **Agents ever registered, the head every document cites** | **336,088** | block 120,141,168, 2026-09-05T16:17:48Z | the same `eth_getStorageAt`, re-read from the archive endpoint by `11-BNB-STACK.md` |
| The same counter at the start of the sweep, which is every sweep's denominator below | **334,935** | block 120,027,164, 2026-09-05T02:02:32Z | one `eth_getStorageAt` on the `_lastId` slot |
| The same counter hours later | 334,997 then 335,003 | blocks 120,035,552 and 120,036,371 | the same read, twice more |
| Registration rate | between 0.0101 and 0.011 per block, so 1,940 to 2,110 a day. The two figures come from a 14 hour span and a 5,000-block window, so the rate itself moves and neither is a constant | both windows | `Registered` log count over the window, then the counter delta across the day |
| Registration document parses as JSON | 570 of 600 = 95.00% | | `tokenURI` per id, decode, parse |
| Declares a concrete `http(s)` endpoint | 233 of 600 = 38.83%, 95% Wilson 35.02 to 42.79 | | the merged on-chain plus off-chain record set |
| Endpoint resolves and answers 2xx or 3xx | 230 of 600 = 38.33% | | one request per URI, 8 s timeout, robots honoured |
| **Answers as a machine surface** | **12 of 600 = 2.00%**, 95% 1.15 to 3.46 | | the probe pass. All 12 are one product on one host under 12 owner addresses |
| **Payable by a stranger** | **0 of 600 = 0.00%**, 95% 0 to 0.64 | | no endpoint in the sample returned a 402 or an x402 `accepts` body |
| Where the funnel collapses | 218 of the 230 reachable endpoints serve an HTML page built for a browser | | content type plus service name on each |
| Distinct endpoint hosts | 9 hosts across 229 URLs, `evoevo.ai` holding 217 of them | | host extraction over the endpoint set |
| One duplicated name is the plurality | `Ave.ai Trading Agent` on 215 of 600 = 35.83%, 95% 32.10 to 39.75 | | all 215 carry a **byte-identical** `data:` URI under 215 distinct owner addresses |
| Real name diversity | 322 distinct names over 600 agents, 312 of them singletons | | the same decode pass |
| Agents with any feedback | **4,406 = 1.32%** | every id 0 to 334,934 | `getClients` over all 334,935 ids, then `getLastIndex` per pair, 0 call errors |
| Total feedbacks written, revoked | **29,712** and **0** | same sweep | `getLastIndex` sum, cross-checked with `getSummary` over the 4,406 |
| Distinct feedback authors on the whole chain | **111** | same sweep | the client set of the whole graph |
| Concentration | 95 agents hold 50% of feedback, the top 100 hold 52.35%, the busiest author rated 1,800 agents | same sweep | the per-agent histogram |
| What the feedback measures | of 950 sampled rows, 844 tag a persona trait, 68 tag uptime or response time, **0 tag a financial outcome** | 8004scan slice | the `tag1` distribution |
| Agents whose endpoint domain is verified | **5** on the whole chain, 3 of them one operator's | 8004scan | `GET /agents?chain_id=56&is_endpoint_verified=true` returns `total: 5` |
| The four categories in the sample | rebalancing 0, grid 0, yield 1, health factor 0 | | keyword patterns over name, description, skills and service names |
| The four categories across the index | rebalancing 47, grid 20, apy 430 (yield 290), health factor 21. Most generous single term each sums to **518 agents, 0.17%** | 8004scan search | `node tools/r11-catcount.mjs`, with the queries that failed recorded |
| For scale | `trading` matches **129,023** agents, 42% of the index | same | same |

Three of those numbers correct an earlier pass in this lane and the corrections are the useful part.

**"2 of 400 publish a callable endpoint" was measuring something between two tiers.** The honest
figures are 12 of 600 machine-callable and 0 of 600 payable. The shape survives, the number moves.

**"0 of 400 declare a payout wallet" had the right conclusion and the wrong mechanism.**
`getAgentWallet` is non-zero for 600 of 600 because `register` writes `msg.sender` at mint. The claim
holds only as "0 declare a wallet distinct from the holder". Any filter built on `agentWallet != 0`
passes the entire registry.

**"Agent id 1 has answered 404 since 2026-05-20" was wrong on every clause but the date.** Id 1 is
`ClawNews`. The 404 was a single 8004scan domain-verification check, never re-run in 108 days, about
the `.well-known` file rather than the endpoint. Live today the host fails at TLS with a certificate
bound to `*.up.railway.app`, not with a 404. 8004scan still scores that agent `health_score: 100.0`.

Reproduce the headline in one command:

```bash
cast storage 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 \
  0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00 \
  --rpc-url https://bsc-rpc.publicnode.com | xargs cast to-dec
```

Source: `MEASUREMENT.md`, with the tools in `research/tools/` and the raw output in
`research/raw/r11-*.json`.

## 3. ERC-8183, the official hire rail

ERC-8183 is a Draft ERC that names no chain and no deployment. On BSC it is a live three-contract
stack whose addresses ship inside BNB Chain's own `@bnbagent/sdk`. It is the only mechanism in
the whole stack that turns "hire this agent" into a state change a judge can check.

| Fact | Verified by |
| --- | --- |
| The kernel is `0xEa4DAa3100A767e86FDed867729ae7446476EBA6` | `cast codesize` returns 130 so it is a proxy, `jobCounter()` returns 56,713 |
| The router is `0x51895229E12F9876011789B04f8698af06cCD6DA` | `cast call "commerce()(address)"` returns the kernel |
| The policy is `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5` | `router()` and `commerce()` both return the pair above |
| Every job on BSC is priced in `$U` | `cast call "paymentToken()(address)"` returns `0xcE24439F2D9C6a2289F741120FE202248B666666`, whose `name()` is `United Stables` and `decimals()` is 18 |
| The mainnet dispute window is 7 days | `cast call "disputeWindow()(uint64)"` returns 604800 |
| The platform fee is zero today and the owner can set 10% | `platformFeeBP()` returns 0, `MAX_PLATFORM_FEE_BP()` returns 1000, `setPlatformFee` is owner-only on an upgradeable proxy |
| A hook is mandatory and must pass ERC-165 | `createJob` with `hook = address(0)` reverts `HookRequired()` `0x55c45de1`, with a non-conforming hook it reverts `HookMissingInterface()` `0x1a5d3d5f` |
| There is no hook allowlist | the deployed kernel has no `whitelistedHooks` and no `setHookWhitelist`, confirmed by selector probe and by the upstream ABI |
| `fund` carries live front-running protection | `fund(1, wrongBudget, 0x)` reverts `BudgetMismatch()` `0x99b0fc87` |
| `settle` is permissionless | `settle(56400, 0x)` from an unrelated address simulates clean once the window has elapsed. It reverts `NotDecided()` identically for the client and a stranger inside it |
| Silence approves | there is no `voteApprove` on chain. A job with no dispute auto-approves the moment `submittedAt + disputeWindow` passes |
| The dispute panel is 3 of 5 human voters | `voteQuorum()` returns 3, `activeVoterCount()` returns 5 |
| We cannot register our own policy | `setPolicyWhitelist` is owner-only and exactly one policy is whitelisted per chain |
| The quote signature reproduces exactly | for 4 of 4 live jobs, `keccak256(canonicalJson(description minus negotiation_hash and provider_sig))` equals the on-chain `negotiation_hash` and the recovered signer equals `job.provider` |
| `canonicalJson` is not `JSON.stringify` | keys sorted at every depth, compact separators, every non-ASCII code unit escaped `\uXXXX`. Byte-identical to Python `json.dumps(sort_keys=True, separators=(",",":"))` |
| Three incompatible deliverable conventions are live at once | one producer uses `keccak256(canonicalJson(manifest))`, one uses `sha256(optParams bytes)` verified byte-exact, one ships empty `optParams` so its deliverable cannot be checked from chain at all |
| The testnet policy changed under us | the old `0x4F4678D4439feC812Ac7674Bb3Efb4C8f5Fb78A6` still has code but `policyWhitelist()` returns false and `registerJob` against it reverts `PolicyNotWhitelisted()` `0xc94463e3`. The live one is `0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA` with a **900 second** window |

### What has actually settled through it

A full re-index of all 56,713 jobs took 455.6 seconds against a free RPC, with no archive node and no
key. `RPC_URL=... bun run scripts/index-jobs.ts`.

| Fact | Value |
| --- | --- |
| Lifetime jobs | 56,713 |
| By state | Open 994, Funded 285, Submitted 27,170, **Completed 28,244**, Rejected 6, Expired 14 |
| Total budget across all jobs | 656.88 `$U` |
| Budget on completed jobs | **292.24 `$U`**, about 0.0103 `$U` per completed job |
| Distinct providers | 97, of which **28** have any completed job |
| Concentration | one address holds 56,167 jobs and 281.56 `$U`, so 99.0% of jobs and 96.3% of paid value |
| Tail shape | 18 of the 28 completing providers have their entire record from a single client address |
| Real prices | the modal budget across 262 funded-or-later recent jobs is 0.0001 `$U`, then 1 wei, then 0.1 `$U`. Completed jobs skew to 0.1 `$U` |
| A zero-budget job reaches a terminal state | of the 314 most recent jobs, 37 have budget 0 and 10 of those are COMPLETED. `setBudget(jobId, 0)` explicitly is what makes `jobHasBudget` true |

**Headline "56,713 jobs" is technically true and materially misleading.** In a stride-197 sample
across the whole range, 285 of 288 jobs carried one description pointing at one endpoint, with 4
distinct providers against 288 distinct clients. `jobCounter` did not move at all over 1,714 seconds.
Any volume figure Muster shows carries its window, its per-provider split and its per-category split,
or it is the same misleading number with a different logo on it.

Source: `R02-erc8183.md`, `R16-reuse.md`, `research/raw/erc8183-jobs-56400-56713-bsc-2026-09-05.json`,
`research/raw/r16-erc8183-jobs-bsc-2026-09-05.json`.

## 4. The token and payment rail

This section is the highest-trust material in the folder. Every capability below was established two
ways, because the first way lies about proxies: call the function, then read the EIP-1967
implementation slot and grep the **implementation** bytecode for the selector. Grepping the token
address itself reports every selector absent, because a proxy holds no dispatch table. That trap said
FDUSD had no `transferWithAuthorization`. It does.

**Two findings decide the money design.**

**On BSC, USDT supports neither EIP-3009 nor EIP-2612.** Nor does Binance-Peg USDC. Nor does BUSD. So
an x402 integration that prices in USDT on BSC cannot be one signature, whatever the spec says.

**Every BSC stablecoin is 18 decimals.** Any constant carried from a 6-decimal chain is wrong here by
a factor of a trillion. Binance shipped this wrong in their own B402 docs for about a month. Their
changelog records merchants pricing one cent as `10000` and charging 1e-14 of a token.

| Token | Address | Dec | EIP-3009 | EIP-2612 |
| --- | --- | --- | --- | --- |
| USDT (BSC-USD) | `0x55d398326f99059fF775485246999027B3197955` | **18** | **no** | **no** |
| USDC (Binance-Peg) | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | **18** | **no** | **no** |
| BUSD | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` | 18 | no | no |
| **FDUSD** | `0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409` | **18** | **yes** | **yes** |
| **USD1** | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | **18** | **yes**, plus `cancelAuthorization` | **yes** |
| **U (United Stables)** | `0xcE24439F2D9C6a2289F741120FE202248B666666` | **18** | **yes** | **yes** |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | 18 | no | no |
| CAKE | `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82` | 18 | no | no, despite answering `nonces` |

How each row was established:

```bash
export RPC=https://bsc-rpc.publicnode.com
IMPL_SLOT=0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
cast storage 0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409 $IMPL_SLOT --rpc-url $RPC
cast code 0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50 --rpc-url $RPC | grep -c e3ee160e
cast call 0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409 \
  "authorizationState(address,bytes32)(bool)" \
  0x0000000000000000000000000000000000000000 \
  0x0000000000000000000000000000000000000000000000000000000000000000 --rpc-url $RPC
```

`authorizationState` returning `false` means the function exists. Reverting means it does not.

### The exact bytes a buyer signs

Domain typehash `0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f` over
`EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)`. Each domain
below was derived then matched against the on-chain `DOMAIN_SEPARATOR()`, so the name and the version
are proven rather than guessed.

| Token | domain `name` | `version` | on-chain `DOMAIN_SEPARATOR()` |
| --- | --- | --- | --- |
| FDUSD | `First Digital USD` | `1` | `0xac2ff863e00ee93e90d01514d46b9b8179ca650e856138a6d8aea00702ca62a0` |
| USD1 | `World Liberty Financial USD` | `1` | `0x5d939dc193fd011c5e26fb861450a696546a09db6b26db26501fe354ba3ed4ba` |
| U | `United Stables` | `1` | `0x358738403e5a61fdc30a8be78a60f289cbe4d2545b735a344b6229c70c1679b6` |

Version is `1` on all three. Versions `2`, `1.0` and `v1` were each computed and each failed to
match, so it is settled by exclusion as well as by match. USD1 alone implements ERC-5267
`eip712Domain()`. USD1's `version()` returns `uint256 2`, which is **not** the EIP-712 domain version
and wiring it into the domain produces an unrecoverable signature.

Struct typehashes: `TransferWithAuthorization` is
`0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267`, `ReceiveWithAuthorization` is
`0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8`.

Prefer `receiveWithAuthorization` wherever the payee is a contract of ours. It pins `msg.sender` to
the payee, which closes the front-running window `transferWithAuthorization` leaves open. All three
3009 tokens carry it.

### Where R04 goes further than the verified file

`VERIFIED-payment-rail.md` proved FDUSD and USD1 and ruled out USDT, Binance-Peg USDC and BUSD. **It
never tested `$U`.** `R04-bsc-tokens.md` then executed a one-signature `$U` transfer end to end on a
fork of BSC mainnet at block 120,020,269 from a buyer whose BNB balance was forced to zero. Then
`R16-reuse.md` and `R06-altana.md` independently derived and matched its domain separator.

So `$U` is verified by three research files but not by the highest-trust one. Say exactly that where
it matters. It is not a weaker fact, it is a fact with a different provenance. A document that
blurs the two is the kind of thing a hostile fact check catches.

Nothing else in `R04-bsc-tokens.md` contradicts the verified file. Where the two overlap they agree
row for row.

### Executed, not simulated

`R04-bsc-tokens.md` ran fourteen transactions on a mainnet fork. The load-bearing three: a `$U`
one-signature transfer with the buyer's BNB balance at zero (108,164 gas, tokens moved, balance still
zero), the same for FDUSD (103,395 gas), plus a USDT transfer through the x402 Permit2 proxy from a
zero-BNB buyer (70,157 gas after a one-time 46,446 gas approve the buyer paid). Replays revert
`Authorization already used` and `InvalidNonce()`. Tampering with `witness.to` reverts
`InvalidSigner()`.

At the measured BSC gas price of 0.05 gwei a 3009 settle costs about 0.0000052 BNB, so sponsoring a
million hires costs about 5.2 BNB in gas. That makes gas sponsorship a feature rather than a cost.

### Two more verified constraints

**Circle publishes no native USDC on BSC.** Their own contract list covers 37 mainnets and 39
testnets and BNB Smart Chain appears in neither. `0x8AC7…580d` is the Binance-Peg wrapper at 18
decimals with no permit and no 3009. "Just use USDC like every other x402 deployment" is not
available here.

**No BSC testnet token implements EIP-3009.** FDUSD sits at the same address on chain 97 with the
same name and decimals, but on an older implementation carrying 2612 only, with `totalSupply` zero.
Permit2 and the x402 exact proxy are both live on 97 at the same addresses as mainnet, so the Permit2
rail is genuinely testable there and the 3009 rail is not.

**EIP-7702 is live on BSC and it breaks Permit2 for delegated EOAs.** A signer with code is routed to
ERC-1271. A 7702-delegated EOA whose delegate does not implement it fails with **empty revert
data**, not a named error. FDUSD, USD1 and `$U` use plain `ecrecover`, so 3009 keeps working. Check
`eth_getCode(buyer)` for the `0xef0100` prefix before offering the Permit2 path.

### x402 and B402, what is settled and what is not

| Fact | Verified by |
| --- | --- |
| x402 protocol version 2 is current | `specs/x402-specification-v2.md` line 3, plus `X402_VERSION: int = 2` in the reference implementation |
| The v2 headers are `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`, each plain base64 of UTF-8 JSON | the v2 HTTP transport spec plus `x402/http/constants.py` |
| v1 renamed fields, so a parser handles both | v1 `maxAmountRequired` becomes v2 `amount`, with `network` moving from a name to CAIP-2 |
| A live BSC-accepting resource serves v2 in the header and v1 in the body at once | one `curl -D` against a live paid endpoint, both captured. The header is authoritative |
| B402 is BNB Chain only, `eip155:56` and `eip155:97` | the Binance docs, supported payment methods |
| B402 sponsors gas on settle and holds no custody | the Binance docs, quoted: "All token transfers occur strictly peer-to-peer" |
| B402's settle is asynchronous since 2026-07-14 and idempotent on `(nonce, network, payer)` | their changelog plus the settle page. `transaction` being empty or not is the discriminator, never `errorReason` |
| The B402 public Bazaar answers with no credentials | `curl https://www.binance.com/bapi/ramp/v1/public/ramp/b402/bazaar/resources` returns HTTP 200 with 979 resources |
| USD1 over `eip3009` dominates that catalogue | of the first 100 resources, 97 `accepts` entries are `eip3009` on USD1 |
| The public x402.org facilitator does **not** cover BSC | its `/supported` lists Base Sepolia plus non-EVM networks. Zero hits for `eip155:56` |
| Neither official x402 SDK ships BSC in its network table, yet the Python one still works on it | `get_network_config` falls back to `{"chain_id": n}` for any `eip155:*` and the exact-EVM facilitator reads the domain from `requirements.extra` |

Source: `VERIFIED-payment-rail.md` first, then `R04-bsc-tokens.md`, `R03-x402-b402.md` and
`R16-reuse.md`.

## 5. 8004scan and the second index

8004scan is the sponsor's own explorer and it is a real, deep, free API. It is also the wrong index of
record for this build. The reason is measured rather than argued: the chain it indexes worst is
the chain we are judged on.

| Fact | Verified by |
| --- | --- |
| Base `https://api.8004scan.io/api/v1`, backend `0.4.363`, OpenAPI 3.1.0 with 150 paths | `GET /health`, `GET /openapi.json` |
| Most reads need no credential at all | per-operation `security: None` in the spec, plus anonymous 200s |
| A key can be minted headless in four calls, wallet signature only | nonce, `cast wallet sign`, login, create. The key measured 600 requests a minute and 100,000 a day |
| Anonymous limits are 30 a minute and 1,000 a day per IP | the rate-limit headers on an unkeyed call |
| `limit` is capped at 100 | `limit=101` returns 422 |
| The default Python user agent gets a Cloudflare 403 even with a valid key | two urllib calls differing only in the user agent, reproduced with `curl -A` |
| **Its BSC indexer reported `status: down` for the whole session** | `GET /status/indexers/direct`, chain 56 row: canonical checkpoint block 119,687,744, last written 2026-09-03T18:09:16Z, age about 32 hours, unchanged across 69 minutes of watching |
| BSC is the only mainnet it has no block explorer for | `GET /chains/56` returns `blockscout_configured: false`, `provider_status: "rpc_only"` |
| It is missing agents that provably exist | `total` with every filter off is 314,596 against 334,876 minted ids at the time. `GET /agents/56/334876` returns "Agent not found" while `ownerOf` returns a real owner |
| It holds under 40% of on-chain feedback | its 11,780 against 29,712 read from chain |
| Read reliability that day | 20.8% then 56.7% non-200 across two windows, with `/status/summary` reporting the database healthy throughout |
| Deep offset pagination is unusable | `offset=100000` took 28.85 s on a single-row query |
| Metadata is parsed once and never again | a 60-id uniform sample gives `last_parsed_at` median 64 days old, up to 105. Every pre-2026-05-23 agent sits inside one two-minute backfill band on 2026-06-06 |
| Its own validator flags the reason | warning `WA040`, "HTTP/HTTPS URI is not content-addressed (metadata can be changed without detection)" |
| One field is broken and must never be shown as freshness | `endpoint_last_checked_at` stayed at 2026-05-20 through a verification that demonstrably ran and rewrote the error string. `updated_at` and the error text moved |
| A `health_score` of 100 can mean one card parsed months ago | for one agent, 1 service healthy and 11 `skipped` with "Service type not health-checked", while the score read 100.0 |
| There is no push path for a new agent | six webhook events exist and none is registration or metadata change. No `updated_after` filter, no cursor on a block, no stream, no bulk export |
| **One unauthenticated write lever exists** | `POST /agents/verify-endpoint/{chain}/{token}` needs no key, is capped at once per hour per agent and it ran: the error string changed and `updated_at` moved to match the estimate |
| Its v5 ranking formula is published inside every agent response | engagement 0.30, service 0.25, publisher 0.20, compliance 0.15, momentum 0.10, with a 30 to 55 band |
| Its taxonomy cannot produce the four categories | across its whole OASF surface, top-100 skills matching rebalance, grid, yield or health factor: **0**. `technology/blockchain/defi` holds 463 agents chain-wide |
| Its semantic search returns junk for all four category prompts and its knobs are inert | sweeping `semantic_weight` across 0.3, 0.5, 0.8 and 1.0 returned byte-identical result sets |
| Its full-text search does work | `rebalancing` 47, `grid` 20, `yield` 290, `health factor` 21, with plausible names at the top of each |
| A second full index of BSC exists, it is fresher and a rival operates it | `GET https://trust8004.xyz/api/v1/chains` reports BSC 334,938 agents and 29,712 feedbacks, publishes its own on-chain lag and offers a free keyset catalogue |
| That index reports `validation: null` on BSC, which is wrong | the Validation Registry is deployed, see section 1 |
| BSC reputation is written by roughly 111 addresses | trust8004's `uniqueReviewers` for chain 56 is 111 against 29,712 feedbacks, matching the on-chain sweep exactly |

Source: `R05-8004scan-api.md`, `R14-rivals.md`, `R12-agent-comms.md`, `MEASUREMENT.md`.

## 6. Altana

Altana's gate is cheap to clear and, more usefully, the whole read path is public. A judge can check
every one of the five requirements with free `eth_call`s and no help from us. That is the point of
their third requirement, which asks for sessions "read onchain rather than from the pitch".

| Fact | Verified by |
| --- | --- |
| KeyStore on 56 is `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a`, `VERSION()` `1.0.1` | `cast call`, plus an identical codehash on chains 1, 56 and 97 |
| KeyStoreController on 56 is `0x0834Ee2C9BdC3E3efF0a2dC34393D4B0e546A555`, `VERSION()` `1.1.1` | `cast call` |
| The explorer is public and needs no account | `https://explorer.altana.network/account/<wallet>` and `/key/<full 32-byte keyId>` both return 200 anonymously. A truncated key id 404s |
| **The Keystore stores the key and the expiry only** | the full 24-selector surface, resolved one by one: `getKeys`, `getPublicKey`, `getExpiry`, `isValidKey`, `isRootKey`, `getValidator`, `getMetadata`, `getNonce`. No allowlist, no cap |
| **The allowlist and the cap live on the wallet** | `canExecutePackedInfos(keyHash)` returned 31 entries and `spendInfos(keyHash)` returned 26 on a live session |
| The allowlist is enforced per selector | four live calls: router plus any selector true, unlisted target false, token plus `approve` true, token plus `transfer` false |
| An Altana wallet is an EIP-7702 delegated EOA, not a deployed contract | 23 bytes of code at a live wallet: `0xef0100` plus the Porto account proxy |
| The two key identifiers are different values for the same key | Keystore `keyId = keccak256(SEC1 pubkey)`, account `keyHash = keccak256(abi.encode(uint8 keyType, keccak256(publicKeyBytes)))`, both reproduced end to end on one live key |
| A grant costs real money | `registrationFeeUSD()` returns 5e17 so $0.50, priced off a Chainlink BNB/USD feed, about 0.000694 BNB on mainnet |
| Expired session keys stay in `getKeys` | 7 of 8 sampled keys on one wallet had `isValidKey` false with a past expiry and were still listed |
| Revocation is atomic across both layers and cannot be undone | one admin call runs `revokeKey` on the Keystore plus `revoke` on the account. From the next block `isValidKey` is false and the id drops out of `getKeys` |
| **Mainnet is nearly empty** | 123 keys ever registered, 56 live, 33 revoked, 34 expired, 90 transactions in 14 days. One single key on Ethereum |
| The XP prize is far above the current board | quests cap at 3,000 XP and the leaderboard's top ten all sit at 3,000. Sovereign tier starts at 30,000 and the prize is 50,000 |
| Their explorer is an indexed view, not the authority | one account page reported "0 Active keys, 0 Total keys" while `getKeys` returned two with one valid. A key page said "(from indexed history, live node read unavailable)" |
| The skills registry has exactly 10 skills and has not drifted | live `index.json` is byte-identical to the 2026-08-27 capture |
| Every address in those skills checks out | 14 `cast call`s across the Venus market, Aave pool, Lista rate and PancakeSwap pair each named in a skill |
| **No published skill covers health factor** | both lending skills exclude borrowing on purpose. The Aave skill's own `display.mayNot` lists "Borrow" |
| Omitting `permissions.calls` grants every target inside the cap | stated twice in their own docs. Always set both halves |
| A session gets no ERC-20 `approve` permission by design | so an admin has to pre-set a bounded allowance before a session can fund an ERC-8183 job |
| Their testnet relay faucet does not fund native BNB | `wallet_addFaucetFunds` returned a transaction that decodes to `mint(address,uint256)` sent to the zero address, a no-op. Use the BNB faucet |

Source: `R06-altana.md`, plus the SDK source read from the `staging` branch and the two live
transactions cited there.

## 7. TermiX

| Fact | Verified by |
| --- | --- |
| The live API base is `https://platform-backend.prod.termix.live` | `GET /api/v1/config/contracts` returns HTTP 200 |
| It uses the same ERC-8004 Identity Registry we do | that endpoint's `contracts.identityRegistry` is `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Escrows are per settlement currency | USDC `0x6A52ba4C84b348FaEAe13dDC7A97b4F6af23913C`, USDT `0xCE02f987D8b8AF694E13C8a843Db9c77caBF544c` |
| Its fees, read on chain rather than from docs | `protocolFeeBps()` 200, `evaluatorFeeBps()` 300, `arbitratorFeeBps()` 300, `challengeBondAmount()` 0 |
| Its clocks | `minChallengeWindow()` 86,400 s, `acceptWindow()` 259,200 s, `verdictTimeout()` 259,200 s |
| A provider can list without staking | `providerLockBps()` 0, `minPoolBalance()` 0, `requiredLock(1e18)` 0 |
| A new agent starts at reputation 50 | `getScore(1)` returns 50, the Bayesian baseline |
| Its own settlement tokens have no signature path | eight `cast call`s: `DOMAIN_SEPARATOR()`, `authorizationState`, `nonces` and `version()` all revert on both Binance-Peg USDC and BSC-USD |
| Its market, measured across six pages | 509 published listings, median price 70 USDC, mean 458.14, min 0.01, max 150,250, median delivery 3 days, 499 of 509 instant-buyable |
| Only 513 of 334,739 agents actually sell | `GET /api/v1/stats/network`, `providersCount` against `verifiedAgents`. That is 0.15% |
| Its own two endpoints disagree by 20x | `liveServices` 10,068 against 509 queryable listings, plus `verifiedAgents` 334,739 against `providersCount` 513 |
| Its hire path costs four signatures plus a minted client agent | login, `approveEscrow`, `createOrder`, `releaseEscrow`, each returned as an unsigned tx-intent |
| Its default signer is mainnet only | `TERMIX_WALLET_MODE` defaults to `agentic`, driven by `@binance/agentic-wallet` 1.9.0, whose own doc says it supports BSC 56 and Base 8453 "and no testnets" |
| Their reference MCP server does not boot | a clean install of the published package throws on a missing export, while a from-source build throws `ERR_MODULE_NOT_FOUND` on two extensionless imports |
| Nine of its eleven tools cannot run on Linux at all | the password prompt has a `darwin` branch, a `win32` branch and a `default` that rejects. A live tool call returned "Unsupported platform" |
| One of its tools fails silently | its security check indexes the provider's result map with the caller's address string, so a checksummed address returns `{}` while the tool still reports success |
| bStocks are real BEP-20 tokens on BSC | `0x7425889FE94F9d693E8daefE88BCCed6AcFEf4c0` is `Meta Platforms` / `METAB`, 18 decimals. `0x0Ca5D51D0277Bd006fd9607d3E560785EBad8222` is `Palantir Technologies` / `PLTRB` |
| They carry a scaled-UI hook | `uiMultiplier()` on METAB returns 1e18 today, while `multiplier()`, `scaledUIMultiplier()`, `getMultiplier()` and `shareToAmount()` all revert. Apply the multiplier rather than assuming it |
| Their 1:1 backing is not on-chain verifiable | Binance describes a daily proof of collateral at an off-chain page with no attestation contract, oracle or reserve feed named |
| A rival already covers all four categories on TermiX | five agents under one owner, five live listings, all 5 USDC at 1 day delivery, four of the five reading `OFFLINE` on presence and all five at `completedJobs: 0` |

Source: `R07-termix.md`, with the live captures in `research/raw/termix-*-2026-09-05.json`.

## 8. PancakeSwap

PancakeSwap already ships an agent surface. The verified opportunity is not to re-expose it, it is
that parts of it are measurably wrong.

| Fact | Verified by |
| --- | --- |
| Six AMM versions are live and indexed on BSC: v2, v3, Infinity CL, Infinity Bin, Infinity Stable, StableSwap | the Explorer pool list returns rows with each `protocol` value |
| v3 has four fee tiers and **no 0.3% tier** | `feeAmountTickSpacing(uint24)` returns non-zero for 100, 500, 2500 and 10000 only. 3000 returns 0 |
| The protocol takes a third of the fee, per tier | `slot0().feeProtocol` decodes to 3300, 3400, 3200 and 3200 of 10000. So the 0.01% tier pays LPs 0.0067%, not 0.01% |
| v2's fee today is 0.25%, not the 0.2% in the old periphery repo | `getAmountsOut` predicted to the wei by 9975/10000 and off by 3.6e17 under 998/1000 |
| Infinity inverts the fee model | its own `ProtocolFeeLibrary`: the protocol fee is **added** to the LP fee rather than carved out of it |
| Dynamic-fee Infinity pools are real | `poolKey.fee = 8388608` with `slot0.lpFee = 0` on two live pools, so there is no static fee to read |
| Position maths reproduces on chain to the wei | principal and uncollected fees for a live staked position matched simulated `decreaseLiquidity` and `collect` exactly at a pinned block, 0 bps error on all four values |
| A pinned block is not optional | reading the same position three blocks apart moved `amount0` by 0.63 bps, while the mid moved 27 bps over 190 seconds |
| **The official skill's impermanent-loss table is wrong** | it publishes 0% IL at 2x for full range and 0.03% for a plus or minus 10% range. The correct values from the value function, cross-checked against the on-chain-verified amounts, are -5.72% and -30.66% |
| **Its Infinity farm APR call returns zero on BSC** | `/farms/campaigns/56/false` returns `totalRecords: 0` while `/56/true` returns 865 |
| **Its aggregator's top-level price impact is unusable at small size** | four quotes on one pair: 1 CAKE reported -20624 bps, 50 CAKE reported +5 bps, with the realised price flat to 4 bps across a 500x size range |
| Its CAKE farm APR is apportioned on the wrong basis | for one farm, `poolInfo.totalLiquidity` is 6.182e24 while `lmPool.lmLiquidity()` is 3.026e24, so 48.95% of staked liquidity is out of range and earning nothing |
| The Unified Swap API is keyless and enforces `minOut` on chain | quote 98357409255966486634 at 0.5% slippage produced calldata carrying 97865622209686654200, which is 0.995x to the wei, inside a tuple the router checks |
| Its quote TTL is exactly 180 seconds | two timed calls, `expiresAt` minus request time |
| The pool oracle cannot serve a day | `observe([86400])` reverts `OLD`. Measured maximum lookback 39,234 s on one pool and 21,407 s on another |
| PancakeSwap runs its own Permit2, separate from the canonical one | `0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768` at 7,020 bytes with a different domain separator from `0x0000…78BA3` at 9,152 bytes. Signatures are not interchangeable |
| Their MEV Guard RPC is free and live | `https://bscrpc.pancakeswap.finance`, `eth_chainId` 56, head within one block of publicnode, `eth_syncing` refused as not whitelisted |
| TVL alone is a trap | two live v3 pools with $21.1M and $19.7M TVL had 24-hour volume of $277 and $634 |
| Their own execution agent enumerates fourteen named guardrails | read from `agent/guardrails.py` and `agent/settlement.py` in their ERC-8183 example: recipient invariant, endpoint safelist, `minOut > 0`, a freshness re-quote, an execution floor, a 300 s deadline cap, a per-job value cap, a router allowlist checked after calldata returns, no standing approval, pull not push, refund on revert, outcome measured from balances, one job at a time, no admin calls |
| Two things in that example are already stale | its router allowlist names an address the live API no longer targets, plus an aggregator base that returns 404 |

Source: `R08-pancakeswap.md`, with `research/raw/pcs-*-2026-09-05.json` and the two verification
scripts saved beside them.

## 9. Venus, Lista and Aave

The health factor category rests on this section, so it is the one where a wrong read is most
expensive. Venus core on BSC is **not** the Compound v2 fork every tutorial describes.

| Fact | Verified by |
| --- | --- |
| Venus core's Comptroller is a Diamond with 5 facets and 102 selectors | `cast call "facets()"` on `0xfD36E2c2a6789Db23113685031d7F16329158384` |
| `liquidationIncentiveMantissa()` no longer exists on it | the call reverts `Diamond: Function does not exist` and the selector is absent from `facets()` |
| **Collateral factor and liquidation threshold are separate numbers** | 12 of 55 core markets have them differ. `getCollateralFactor` against `getLiquidationThreshold` at a pinned block |
| **`getAccountLiquidity` answers the liquidation question, not the borrowing question** | the deployed source plus a real account where the two paths differ. `getAccountLiquidity` uses the liquidation threshold, `getBorrowingPower` uses the collateral factor |
| The gap is material on a real position | for account `0x61486e…d607` at block 120,026,311 the two answers differ by $29.81 on $825 of debt, which is 3.9% of collateral value |
| One market contributes seizable collateral and zero borrowing power | vLINK has collateral factor 0 and liquidation threshold 0.63, so an agent that ignores CF-zero markets understates the distance to liquidation |
| A local recompute of both paths matched the chain to the wei | 1,578,359,224,759,365,354,291 and 1,608,173,057,197,108,996,576 against `getBorrowingPower` and `getAccountLiquidity` exactly |
| Pinning the block is not optional | the same script unpinned was off by 2.9e16 wei on both paths, an identical offset that looked like a formula error and was six blocks of drift |
| 15 E-Mode pools are live and they change the penalty | inside pool 1 the liquidation incentive is 1.06e18 against 1.10e18 in core, so "10% penalty on Venus" is wrong for any account with `userPoolId != 0` |
| The correct per-account reads are the effective ones | `getEffectiveLtvFactor(account, vToken, strategy)` and `getEffectiveLiquidationIncentive(account, vToken)`. The core-pool getters return core values |
| Isolated pools are a different codebase with a different ABI | `markets()` returns three fields in a different shape, `liquidationIncentiveMantissa()` exists there, plus `minLiquidatableCollateral()` at 100e18 so a small position needs a full liquidation rather than a partial |
| The supply-rate identity holds exactly | at a pinned block, `U * borrowRate * (1 - reserveFactor)` reproduced `supplyRatePerBlock()` to the wei |
| Venus annualises with 70,080,000 blocks and an exponent of **364** | their own repo constant, confirmed on chain by deprecated markets carrying `borrowRatePerBlock` exactly equal to `3e18 / 70080000`. The 364 exponent reproduces their API to 4e-12 |
| Lista Lending answers health in one call | `isHealthy(marketParams, id, borrower)` on the Moolah singleton, with a local recompute matching it on 3 of 3 real positions |
| Its price scale is not always 1e36 | the formula is `10^(36 + loanDecimals - collateralDecimals)`. All three sampled markets were 18 against 18, so a hardcoded 1e36 breaks silently the first time a 6 or 8 decimal token is listed |
| One Lista branch has to be checked first | if `brokers(id)` is non-zero the health check throws away the passed price and the Moolah-side debt entirely. All three sampled markets returned the zero address |
| Lista's documented minimum liquidation incentive of 1.048 is contradicted by its own code | `min(1.15e18, 1e18/(1 - 0.3*(1 - lltv)))` gives 1.0438 at lltv 0.86, with no floor anywhere in `Moolah.liquidate` |
| Lista's own market table disagrees with the chain | its delayed-liquidation table lists a BTCB market at "Original LLTV 80%" while `idToMarketParams` on that id returns 0.86e18. Read lltv from chain |
| Lista CDP evaluates liquidation against a **stored** price, not the live one | `Vat.ilks(SnBNB).spot` implied 750.05 while `Interaction.collateralPrice(slisBNB)` returned 748.34, a 0.229% gap. `poke` is permissionless, so live price crossing is the alarm and the poke is the deadline |
| Its stability fee reproduces to the wei | `rpow(duty, 31556952, RAY)` matched `borrowApr(slisBNB)` exactly at 4,035,532,478,367,910,700 |
| Aave v3 is the only BSC money market that returns a literal health factor | `getUserAccountData` field 6 at 1e18, becoming `2**256-1` when there is no debt. 8 reserves, `POOL_REVISION()` 11 |
| Three protocols, three rate units | Venus per block, Moolah per second, Aave per year in ray. Any stored rate needs a unit tag or it publishes nonsense |
| Liquid staking rates cross-check against an independent feed | asBNB to BNB by composition is 1.066576 and the Venus oracle's ratio of the two underlyings is 1.066577 |
| PancakeSwap gross fee APR overstates LP yield by a third | 42.34% gross against 28.37% net of the protocol fee on one live pool, with out-of-range concentrated liquidity earning zero on top of that |
| Two BSC lending venues could not be pinned down | Kinza Finance's deployed-contracts page 403s and Avalon Labs publishes no address index. Neither address set is written down anywhere in this set |

Source: `R09-bsc-defi.md`, with the five scanner tools and the pinned-block captures in
`research/raw/venus-*` and `research/raw/lista-*`.

## 10. BABT and the attestation layer

| Fact | Verified by |
| --- | --- |
| BABT is `0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8` | `name()` returns `Binance Account Bound Token`, `symbol()` returns `BABT` |
| Its implementation is source-verified with an exact bytecode match | the Sourcify record for `0x57340D99B7774C328b17b13d6b37548C84EE3C1e`, `exact_match` on runtime and creation, verified 2026-05-25 |
| The check is one call that never reverts | `balanceOf(address)`, 1 holds and 0 does not, including for the zero address |
| `tokenIdOf` reverts for non-holders, so it must never be used in a gate | raw `eth_call` returns the string `The wallet has not attested any SBT` |
| **It advertises ERC-721 while having no transfer surface** | `supportsInterface(0x80ac58cd)` returns true. Then `transferFrom`, `safeTransferFrom`, `approve`, `setApprovalForAll`, `getApproved` and `isApprovedForAll` all revert with **zero-length revert data** because none of them exists in the verified source |
| 1,166,396 live holders against 1,319,158 ever minted | `totalSupply()` and the mint counter at storage slot 8, so 11.58% are revoked or burned |
| Minting is live | the counter moved between two reads minutes apart |
| It carries no personal data at all | `tokenURI(1)` resolves to 276 bytes whose `attributes` and `credentialList` are both empty, with the same name, description and image on every token |
| The only per-token value is an opaque id, whose link Binance deliberately breaks on re-mint | a revoked token's metadata returns HTTP 404 with a zero-length body, which their own FAQ says is so "others can't relate those two different wallets" |
| Binance declines to vouch for holders | its own disclaimer: its role "is limited to issuing" the token, procedures "may vary depending on the user's country of residence", plus "Binance is not making any representation to third-party projects about the holders" |
| The 72-hour re-mint cooldown is **not** on chain | `attest` checks only a non-zero address and that the address holds none. There is no timestamp check anywhere in the contract |
| The contract enforces one per address, not one per person | `!_tokenMap.contains(to)` is an address check and nothing on chain links two addresses to one account |
| **Coverage among agent owners is 1.0%** | 585 distinct owners sampled from 600 agents, checked on chain: 6 hold a BABT, 6 hold a Galxe Passport, 3 hold both, **576 of 585 hold neither** |
| Even among the 300 most-reviewed agents it is 3.1% | 96 distinct owners, 3 with a BABT |
| The reviewers who dominate the chain hold nothing | the last 3,000 BSC feedbacks came from 31 addresses, the top 10 wrote 65.3% of them. All 12 of the heaviest hold neither a BABT nor a Galxe Passport. All 12 are plain EOAs with nonces from 1,021 to 1,326 |
| `giveFeedback` has no gate beyond self-feedback | the deployed source has one `require`. One address left up to 12 feedbacks on a single agent |
| Galxe Passport is a live alternative on BSC | `0xe84050261cb0a35982ea0f6f3d9dff4b8ed3c012`, `totalSupply()` 1,044,437, non-transferable with named revert reasons, same interface flags as BABT |
| BAS is live and it is the same organisation that runs the ERC-8004 stack on BSC | core `0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC` and SchemaRegistry `0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa`, both `version()` `1.3.0`, plus a GitHub org that publishes `bas-contract`, `erc-8004-contracts` and the 8004scan MCP server |
| Two alternatives are **not** available on BSC | Human Passport's contract reference covers seven chains and BSC is not one. Trusta's sybil-score API accepts chain ids 1, 42161 and 324 only |
| The BNB Passport mint host does not resolve | `passport.bnbattest.io` and `www.passport.bnbattest.io` both return NXDOMAIN, plus a shipped config carrying two typos in that URL |

Source: `R10-bab-attestation.md`, with the coverage runs saved as
`research/raw/babt-galxe-coverage-agent-owners-2026-09-05.json`.

## 11. Sanctions screening and the freeze layer

| Fact | Verified by |
| --- | --- |
| The Chainalysis sanctions oracle is live on BSC, free and keyless | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb`, 3,557 bytes, `name()` returns `Chainalysis sanctions oracle`. `isSanctioned(address)` costs about 3,694 gas over base |
| **It is not a superset of the OFAC list** | today's SDN list yields 91 distinct EVM-format addresses. The oracle flags 57. Of the 91, 42 are active on BSC right now and **20 of those 42 are not flagged** |
| It does track delistings | two former Tornado Cash addresses both return false |
| It has no false positives on a mainstream control set | nine calls across WBNB, the PancakeSwap router, the Venus Unitroller, Permit2, USD1, FDUSD, both 8004 registries and a Binance hot wallet all return false |
| The two one-signature stablecoins can be frozen mid-job | FDUSD and USD1 both expose `freeze(address)`, `unfreeze(address)` and `frozen(address)`. USD1 also exposes `reallocate(address,address,uint256)`. BSC-USD exposes none of them |
| A venue that never settles is not a money transmitter. A payment processor is | FinCEN FIN-2019-G001, quoted from the primary PDF at two separate sections |
| A listing that passed review can be rewritten afterwards and nothing can be removed from the chain | `setAgentURI` and `setMetadata` are owner-callable on a permissionless registry, so takedown means delisting from our index and only that |

Source: `R15-compliance.md`, with the SDN capture and the screening run saved beside it.

## 12. What we could not verify

Same set as the Unverified checklist in `research/SPINE.md`, grouped here by the system it belongs to
and carrying the blocker rather than the label. A document that touches any line below says
unverified in the same sentence, names the blocker in a clause and moves on.

### Blocked by a credential we do not hold

| Claim | Blocker | What would settle it |
| --- | --- | --- |
| The B402 authenticated base URL, sandbox or production | not published. Both rows of their base-URL table read "Please contact us for access" | merchant onboarding, which is a form plus manual review per environment |
| B402's real `signerAddress` and `spenderAddress` on BSC | `/supported` needs credentials and a whitelisted source IP. Every address in the docs is a placeholder | one `/supported` response |
| Which token and scheme B402 settles in on BSC | same | same |
| Whether B402 accepts the `escrow` payment flow | same | same |
| Whether B402 mainnet credentials can be obtained before 2026-09-09 | no published turnaround | applying |
| Whether the ERC-8004 implementations match their public source byte for byte | no verified-source link. The block explorer API needs a key. Match is inferred from an exact dispatch match, the ERC-7201 slot constants and every revert string | a verified-source record |
| Whether an 8004scan Pro key removes the deep-offset slowness | we hold a `free_api` key. The cost looks like a Postgres `OFFSET` plus an unbounded `COUNT`, which a rate limit would not help | a granted key |
| Kinza Finance and Avalon Labs addresses on BSC | one docs page 403s, the other publishes no address index | a readable primary source. Until then no address is written down |
| The PancakeSwap Hub API request and response shapes | needs an `x-secure-token` issued by a partnership contact. The keyless Unified Swap API covers the same ground | a token, which we do not need |
| The v3 exchange subgraph, so historical positions and historical ticks | the decentralised network needs a gateway key | a Graph key |

### Blocked by the absence of a free BSC archive node

Every free public BSC RPC refuses historical state. publicnode answers `Archive requests require a
personal token` past roughly 60 to 82 blocks and caps `eth_getLogs` at 5,000 blocks, one competitor
caps at 10,000 then errors, one caps at 50 blocks and one does not implement the method.

| Claim | What would settle it |
| --- | --- |
| A from-genesis `Registered` log count as an independent agent total | a paid archive endpoint. The storage read plus the contiguity proof stand in for it |
| The creation block of any of the three registry proxies | historical `eth_getCode`. 79,094,807 is the verified first registration, which is a different fact from proxy creation |
| Whether any agent id was ever burned, leaving a gap | the same log history. No burn function exists in the ABI and no sampled id reverted |
| Whether `FeedbackRevoked` or `ResponseAppended` has ever fired on BSC | the same. Both are proven callable by simulation and neither has been seen in a real log |
| Whether the Safe or the EOA has ever exercised an upgrade | the proxies' full `Upgraded` history |
| Who holds `OPERATOR_ROLE` on BABT | its `RoleGranted` history. The contract uses plain `AccessControl` so `getRoleMemberCount` reverts |
| Whether any BSC address holds a BNB Passport KYC attestation | its `Attested` history, plus a mint host that resolves |
| Whether a BABT was held at the time a review was written | historical `eth_call`. Record the check result at write time instead |
| Full ERC-8183 per-category job counts across all 56,713 jobs | the same. The census is 314 contiguous recent ids plus 288 at stride 197 |
| A live Lista CDP position with non-zero debt, plus a live Aave v3 BSC borrower | the same log ranges. The formulas and the parameters are verified, the single-account demonstrations are not |
| How often the Lista staking rate steps | two reads separated by a known interval, held over hours |

### Blocked because the programme has not published it

Everything in the withheld column of `00-PROGRAM.md`, in particular any main-rubric weighting,
the phase 2 criteria, how the Altana XP is allocated, where the Agent Advantage Report is filed and
whether TermiX funds its own hire.

### Blocked by politeness or by scope

| Claim | Blocker |
| --- | --- |
| Whether all 217 endpoints on one host are HTML pages | 5 of 217 probed, all HTML with a byte-identical prefix. Probing 217 paths on one host is not polite, so the rest is an inference and labelled as one |
| Whether the other 45 platform-template agents are also unbound | 6 of 51 probed, 6 of 6 unbound with a null endpoint. Same limit |
| Whether the 27,048 `has_a2a` count survives validation | every A2A declaration sampled but one is the same platform template, which fails all four published A2A schemas. A full sweep is about 30 minutes of `eth_call` and was not run |
| Which A2A method one live agent does implement | eight read-only method names all returned `-32601`. Only `message/send` and `message/stream` remain, so firing either could start a real billable task on somebody else's agent |
| Whether any rival has a settled **mainnet** ERC-8183 job | none found. That is absence of evidence, not evidence of absence, so it gets re-checked immediately before submitting |
| Whether one address holding 99% of ERC-8183 jobs is one operator or a platform router | not established either way. The ranking design depends on which |
| Venus Prime APY boost units | their API returns `0.1476…` and whether that is points or percent was not resolved |
| The cause of the PancakeSwap price-impact defect | the aggregator is closed source. The direction of the defect is settled |
| Porto `SpendInfo` field names at positions 3, 4 and 5 | all zero on the wallet sampled. Naming them needs a wallet with a partially spent cap, which is not ours to spend from |
| Whether `@altananetwork/sdk` 0.9.0 works against `@bnbagent/sdk` 0.5.5 | the official SDK pins Altana 0.7.1 and 0.9.0 changed the testnet policy address. Untested by either party |

### Contradictory across files, so treat as unverified until one call settles it

The testnet token set. **The `$U` half is now settled and the USDC half is not.** On chain 97
`0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` returns `name()` `United Stables`, `symbol()` `U` and
`decimals()` **18**, while `0x330949Aed7d00FCe0558C64ED6FeC9792616cC39` returns `name()` `U`, `symbol()`
`U` and `decimals()` **6**, which is B402's mock. So `R02-erc8183.md`, `R06-altana.md` and
`R03-x402-b402.md` were each right about a different token, which was the likeliest reading and is now the
read one (`08-MONEY.md`, run on chain 2026-09-05). `R03` and `R04` still name two different testnet USDC
addresses at 6 and 18 decimals and that one is open. One `decimals()` call settles it. The boot-time
assertion in `15-SYSTEM.md` section 2.4 is what keeps the code correct either way rather than a constant in
a config file.

## The four categories and which section proves each one's reads

Agent Diversity is one of three published criteria, so this file carries the map rather than leaving each
document to rediscover which evidence backs which shelf. Every read named here is verified above, in the
section given.

| Category | The sections that prove its reads | The load-bearing correction in them |
| --- | --- | --- |
| rebalancing | 8, plus 2 for the population it draws from | position maths reproduces to the wei only at a pinned block, three blocks of skew moved `amount0` by 0.63 bps, then the official skill's impermanent-loss table is wrong (0% published against -5.72% correct at 2x full range) |
| grid trading | 8 | there is no 0.3% fee tier on PancakeSwap v3 and the protocol takes about a third per tier, so the 0.01% tier pays LPs 0.0067%. The pool oracle cannot serve a day: `observe([86400])` reverts `OLD` |
| yield | 9 | three protocols, three rate units. Venus annualises with 70,080,000 blocks at exponent 364, PancakeSwap gross fee APR overstates LP yield by a third and its v2 `apr24h` is reproducibly 0.68x low |
| health factor | 9 | collateral factor and liquidation threshold are separate numbers on 12 of 55 Venus core markets, `getAccountLiquidity` uses the threshold while `getBorrowingPower` uses the factor, then E-Mode changes the incentive from 1.10e18 to 1.06e18 |

Two facts bind all four rather than one of them. Aave v3's `getUserAccountData` field 6 is the only literal
health factor on BSC. No published Altana skill covers borrowing at all, so the health-factor path is
ours end to end. Both are in sections 9 and 6.

## The moving numbers, plus what to re-read before submitting

Four of the numbers in this file change on their own. Cite each with its block height and its
timestamp, never bare. Re-read the set the day the submission goes out.

| Number | Why it moves | Re-read with |
| --- | --- | --- |
| The agent count | between 1,940 and 2,110 new registrations a day, with the rate itself moving | one `eth_getStorageAt` on the `_lastId` slot |
| The feedback graph | slowly. It was flat on the day we measured | `getClients` sweep, about 4 minutes |
| The ERC-8183 job and settlement totals | burstily. `jobCounter` did not move at all across 1,714 seconds | the job indexer, about 456 seconds |
| 8004scan's freshness and its own status | it was `down` for BSC across our whole session | `/status/indexers/direct` plus `/status/freshness` |

Three things to re-check rather than re-read, because they are somebody else's decision and they can
change under us: the implementation address behind each of the three registry proxies, the
implementation behind each of the three EIP-3009 tokens, plus the whitelisted ERC-8183 policy on each
chain. Each is one storage read or one `policyWhitelist()` call. Each has already moved once in
this ecosystem inside a fortnight.

