# R04 BSC tokens and signature capability

## Headline

The one-signature hire flow is not impossible on BSC. It works today. I executed it end to end
against a fork of BSC mainnet at block 120020269. Three tokens on BSC carry native EIP-3009
`transferWithAuthorization`: USD1 `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d`, U (United Stables)
`0xcE24439F2D9C6a2289F741120FE202248B666666` and FDUSD
`0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409`. A buyer holding **zero BNB** signed one EIP-712
message, a third-party relayer submitted it and the tokens moved. For USDT and USDC, which have
neither 3009 nor 2612, Uniswap Permit2 is deployed on BSC and BSC testnet at the canonical address,
and so is the x402 `x402ExactPermit2Proxy` at `0x402085c248EeA27D92E8b30b2C58ed07f9E20001`. I ran
that path too: 31 USDT moved from a zero-BNB buyer on one signature.

Second finding, equally load-bearing: **every stablecoin on BSC is 18 decimals, not 6.** BSC-USD,
USDC, FDUSD, USD1 and U all return `decimals() = 18`. Any code carried over from Ethereum or Base
that hardcodes 6 will underquote agent prices by a factor of 10^12.

Third finding: Binance's own B402 facilitator is already live in production with this exact
mechanic and its resource directory is readable with no credentials. 22 of the 25 listed resources
price in USD1 over `eip3009`.

## Verified facts

### Token metadata, BSC mainnet chain 56

Every row from `cast call <addr> "<fn>" --rpc-url https://bsc-rpc.publicnode.com` at block
120019278.

| claim | value | how verified |
|---|---|---|
| BSC-USD / USDT address | `0x55d398326f99059fF775485246999027B3197955` | given, confirmed live |
| USDT name, symbol | "Tether USD", "USDT" | `cast call ... "name()(string)"`, `"symbol()(string)"` |
| **USDT decimals** | **18** | `cast call 0x55d3... "decimals()(uint8)"` |
| USDT totalSupply | 9184991905680829664064698687 (9.185e27 base units, 9.185e9 whole) | `cast call ... "totalSupply()(uint256)"` |
| USDC address | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | given, confirmed live |
| USDC name, symbol | "USD Coin", "USDC" | same calls |
| **USDC decimals** | **18** (not 6) | `cast call 0x8AC7... "decimals()(uint8)"` |
| USDC totalSupply | 1588999877439803987446539541 (1.589e9 whole) | same |
| WBNB address | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | given, confirmed live |
| WBNB name, symbol, decimals | "Wrapped BNB", "WBNB", 18 | same calls |
| WBNB totalSupply | 1760637115693627888572822 (1,760,637 whole) | same |
| CAKE address | `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82` | given, confirmed live |
| CAKE name, symbol, decimals | "PancakeSwap Token", "Cake", 18 | same calls. Note symbol is mixed case "Cake" |
| CAKE totalSupply | 5209477531751051201610995531 (5.209e9 whole) | same |
| FDUSD address | `0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409` | found by probe, confirmed by `name()` returning "First Digital USD" |
| FDUSD name, symbol, decimals | "First Digital USD", "FDUSD", 18 | same calls |
| FDUSD totalSupply | 58019741170000000000000000 (58,019,741 whole) | same |
| USD1 address | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | found by probe, confirmed by `name()` and by the B402 docs table |
| USD1 name, symbol, decimals | "World Liberty Financial USD", "USD1", 18 | same calls |
| USD1 totalSupply | 1396757367127409022195967177 (1.397e9 whole) | same |
| U address | `0xcE24439F2D9C6a2289F741120FE202248B666666` | named in the B402 docs token table, confirmed live |
| U name, symbol, decimals | "United Stables", "U", 18 | same calls |
| U totalSupply | 956298607908467150000000000 (956,298,607 whole) | same |

### EIP-3009 support per token

Method: three independent probes. (a) `cast call ... "authorizationState(address,bytes32)(bool)"`,
a revert means absent. (b) `cast code` then grep the runtime for the four-byte selector. (c) for
proxies, resolve the EIP-1967 implementation slot
`0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` and grep the implementation.
(d) an actual signed transfer executed on a mainnet fork.

| token | EIP-3009 | evidence |
|---|---|---|
| USDT `0x55d3...7955` | **NO** | `authorizationState` reverts. 4413-byte runtime, none of `e3ee160e cf092995 ef55bec6 5a049a70 e94a0102` present |
| USDC `0x8AC7...580d` | **NO** | `authorizationState` reverts. 1596-byte runtime, no 3009 selectors |
| WBNB `0xbb4C...095c` | **NO** | no 3009 selectors in the 3124-byte runtime. See the WBNB trap below |
| CAKE `0x0E09...cE82` | **NO** | `authorizationState` reverts. No 3009 selectors in the 7285-byte runtime |
| **FDUSD** `0xc5f0...6409` | **YES** | `authorizationState(...)` returns `false` (does not revert). Proxy, impl `0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50` (10590 bytes) contains `e3ee160e`, `cf092995`, `ef55bec6`, `88b7ab63`, `e94a0102`. Executed live, see below |
| **USD1** `0x8d0D...8B0d` | **YES** | `authorizationState(...)` returns `false`. Proxy, impl `0x694aa534bdef8ed63244eb902e7914e527891f08` (15071 bytes) contains `e3ee160e`, `ef55bec6`, `5a049a70`, `e94a0102`. Executed live |
| **U** `0xcE24...6666` | **YES** | `authorizationState(...)` returns `false`. Proxy, impl `0xbef21313c69c009fd7d9510a8d3a481a32473dfc` (12027 bytes) contains `e3ee160e`, `cf092995`, `ef55bec6`, `88b7ab63`, `e94a0102`. Executed live |

Selector coverage differences that matter:

| selector | signature | FDUSD | USD1 | U |
|---|---|---|---|---|
| `0xe3ee160e` | `transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)` | yes | yes | yes |
| `0xcf092995` | `transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,bytes)` | yes | **no** | yes |
| `0xef55bec6` | `receiveWithAuthorization(...,uint8,bytes32,bytes32)` | yes | yes | yes |
| `0x88b7ab63` | `receiveWithAuthorization(...,bytes)` | yes | **no** | yes |
| `0x5a049a70` | `cancelAuthorization(address,bytes32,uint8,bytes32,bytes32)` | **no** | yes | **no** |
| `0xb7b72899` | `cancelAuthorization(address,bytes32,bytes)` | no | no | no |
| `0xe94a0102` | `authorizationState(address,bytes32)` | yes | yes | yes |

So FDUSD and U accept a packed 65-byte `bytes` signature. USD1 only accepts split `v, r, s`. USD1 is
the only one of the three that lets a buyer cancel an unspent authorization on chain.

### EIP-2612 permit support per token

| token | EIP-2612 | `DOMAIN_SEPARATOR()` | `nonces(address)` | `PERMIT_TYPEHASH()` | domain version |
|---|---|---|---|---|---|
| USDT | NO | reverts | reverts | reverts | n/a |
| USDC | NO | reverts | reverts | reverts | n/a |
| WBNB | NO | returns empty (fallback) | returns empty | returns empty | n/a |
| CAKE | **NO, but it looks like yes** | reverts | returns 0 | reverts | n/a |
| FDUSD | YES | `0xac2ff863e00ee93e90d01514d46b9b8179ca650e856138a6d8aea00702ca62a0` | 0 | not exposed | "1" |
| USD1 | YES | `0x5d939dc193fd011c5e26fb861450a696546a09db6b26db26501fe354ba3ed4ba` | 0 | not exposed | "1" |
| U | YES | `0x358738403e5a61fdc30a8be78a60f289cbe4d2545b735a344b6229c70c1679b6` | 0 | not exposed | "1" |

Two traps in that table, both verified.

**CAKE is not permit-capable even though `nonces(address)` answers.** Its runtime contains
`0x7ecebe00` (`nonces`) and `0xc3cda520` (`delegateBySig`) but not `0xd505accf` (`permit`) and not
`0x3644e515` (`DOMAIN_SEPARATOR`). That nonce counter belongs to Compound-style vote delegation. A
capability check that only probes `nonces` will classify CAKE as 2612-capable and every permit will
revert.

**WBNB never reverts on an unknown selector.** Its fallback is the payable `deposit()`, so
`DOMAIN_SEPARATOR()`, `nonces(address)`, `authorizationState(...)` and `version()` all return empty
calldata and succeed. `cast` reports "could not decode output", not "execution reverted". Feature
detection by try/catch will read WBNB as supporting everything. Detect by selector grep on
`cast code`, not by call success.

**Domain version strings were recovered by brute force, not read from the contract.** No token
exposes `PERMIT_TYPEHASH()`. USD1 exposes `eip712Domain()`; FDUSD and U do not. For FDUSD and U I
recomputed the domain separator over candidate `(name, version)` pairs until it matched the on-chain
value exactly:

| token | recovered name | recovered version | reproduce |
|---|---|---|---|
| FDUSD | "First Digital USD" | "1" | `cast keccak $(cast abi-encode "f(bytes32,bytes32,bytes32,uint256,address)" $(cast keccak "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)") $(cast keccak "First Digital USD") $(cast keccak "1") 56 0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409)` |
| USD1 | "World Liberty Financial USD" | "1" | same formula with that name, plus confirmed by `eip712Domain()` |
| U | "United Stables" | "1" | same formula with that name |

`USD1.eip712Domain()` returns `fields = 0x0f`, `name = "World Liberty Financial USD"`,
`version = "1"`, `chainId = 56`, `verifyingContract = 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d`,
`salt = 0x00...00`, `extensions = []`.

**USD1 `version()` returns `uint256 2`, not the string "1".** Raw return is
`0x0000...0002`. The EIP-712 domain version is the string `"1"`. Anyone who wires `version()` into
the domain will produce an unrecoverable signature. FDUSD and U do not expose `version()` at all
(`0x54fd4d50` absent).

### Live executions on a fork of BSC mainnet

`anvil --fork-url https://bsc-mainnet.public.blastapi.io --port 8547`, chain id 56, fork block
120020269. publicnode refuses historical state reads with
`Archive requests require a personal token`, so it cannot be used as a fork source once the fork
block falls behind the head. blastapi served historical state and worked.

Test cast: buyer is a freshly generated EOA with no code on BSC. Relayer and payee are separate
accounts. Tokens were sourced by impersonating `0xF977814e90dA44bFA03b6295A0616a897441aceC`, which
held 27.5M FDUSD, 293M USD1, 650M U and 590M USDT at that block.

| # | what ran | gas used | result |
|---|---|---|---|
| 1 | `FDUSD.transferWithAuthorization(v,r,s)` submitted by relayer | 103,395 | success. `AuthorizationUsed` then `Transfer`, 25 FDUSD moved |
| 2 | same call replayed with the same nonce | n/a | reverts `Authorization already used` |
| 3 | `FDUSD.transferWithAuthorization(...,bytes)` with the packed 65-byte signature | 86,731 | success |
| 4 | `FDUSD.receiveWithAuthorization` submitted **by the payee** | 103,513 | success |
| 5 | same, submitted by a third party | n/a | reverts `Caller must be the payee` |
| 6 | `FDUSD.permit` (EIP-2612) submitted by relayer | 93,177 | success. allowance 50e18 set, `nonces` 0 to 1 |
| 7 | `USD1.transferWithAuthorization(v,r,s)`, **buyer BNB balance forced to 0** | 108,164 | success. 7.5 USD1 moved, buyer BNB still 0 |
| 8 | `U.transferWithAuthorization(v,r,s)`, buyer BNB 0 | 103,377 | success. 12 U moved |
| 9 | `USDT.approve(Permit2, max)` sent by buyer | 46,446 | success. One-time, buyer pays this gas |
| 10 | `Permit2.permitTransferFrom` called by the signed `spender` | 94,885 | success. 40 USDT moved, `nonceBitmap(buyer,0)` becomes 128 (bit 7) |
| 11 | same nonce replayed | n/a | reverts custom error `0x756688fe` = `InvalidNonce()` |
| 12 | same permit submitted by an address that is not the signed `spender` | n/a | reverts `0x815e1d64` = `InvalidSigner()` |
| 13 | `x402ExactPermit2Proxy.settle` for USDT, buyer BNB 0 | 70,157 | success. 31 USDT moved to `witness.to` |
| 14 | same, with `witness.to` tampered to the relayer's own address | n/a | reverts `0x815e1d64` = `InvalidSigner()` |

Rows 7, 8 and 13 are the load-bearing ones. The buyer's BNB balance was `0` before and after. Only
the relayer spent gas.

One more confirmation, this one against **live mainnet state with no transaction at all**. Simulating
`transferWithAuthorization` with a deliberately bogus signature reveals which revert path the token
takes. A token that implements the function rejects the signature by name. A token that does not
implement it reverts with no reason data:

```
cast call <token> "transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)" \
  0x..01 0x..02 1 0 4102444800 0x..01 27 0x..01 0x..01 --rpc-url https://bsc-rpc.publicnode.com

FDUSD 0xc5f0...6409  ->  execution reverted: Invalid signature
USD1  0x8d0D...8B0d  ->  execution reverted: EIP3009: invalid signature
U     0xcE24...6666  ->  execution reverted: Invalid signature
USDT  0x55d3...7955  ->  execution reverted            (no reason data, function absent)
```

USD1 names the standard in its own revert string. That is live mainnet, not a fork.

Live BSC gas price at the time of the run: `cast gas-price --rpc-url https://bsc-rpc.publicnode.com`

returned `50000000` wei, that is 0.05 gwei. A 3009 settle at 103,400 gas therefore costs
0.00000517 BNB. Sponsoring a million agent hires costs about 5.2 BNB in gas.

### EIP-7702 is live on BSC and it breaks Permit2 for delegated EOAs

While debugging the first Permit2 attempt I found that anvil's four default accounts all carry code
on BSC mainnet:

```
cast code 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --rpc-url https://bsc-rpc.publicnode.com
0xef01008a67b5020ee254ef48e3b6a04927f39baf7e408a
```

`0xef0100` is the EIP-7702 delegation designator, so 7702 is active on BSC and those well-known keys
have been delegated to `0x8a67b5020ee254ef48e3b6a04927f39baf7e408a`. The same 47-byte code sits on
`0xf39Fd6e5...92266`, `0x3C44CdDd...293BC` and `0x90F79bf6...3b906`.

The consequence is a real production failure mode. `Permit2.SignatureVerification.verify` branches
on `claimedSigner.code.length`. A signer with code is routed to ERC-1271
`isValidSignature(bytes32,bytes)`. A 7702-delegated EOA whose delegate does not implement 1271 fails
with **empty revert data**, `0x`, not a named error. The trace from my run:

```
0x000000000022D473030F116dDEE9F6B43aC78BA3::permitTransferFrom(...)
  ├─ 0x70997970C51812dc3A010C7d01b50e0d17dc79C8::isValidSignature(0xcfdf2cdc..., 0x424a92ea...) [staticcall]
  │   ├─ 0xCc04506D439d338bdE8eBBb074F17A54B7673B95::fallback()
  │   │   └─ ← [Stop]
  │   └─ ← [Stop]
  └─ ← [Revert] EvmError: Revert
```

FDUSD, USD1 and U use plain `ecrecover` with no 1271 branch, so 3009 keeps working for a
7702-delegated account. Permit2 does not.

### BSC testnet, chain 97

`https://bsc-testnet-rpc.publicnode.com`, chain id 97, block 129165659.
`https://data-seed-prebsc-1-s1.binance.org:8545` also answers with chain id 97.
`https://bsc-testnet.public.blastapi.io` returns HTTP 403.

| token | address | name | symbol | decimals | totalSupply | 3009 | 2612 |
|---|---|---|---|---|---|---|---|
| WBNB | `0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd` | "Wrapped BNB" | WBNB | 18 | 275552046159095768346416 | no | no |
| USDT | `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd` | "USDT Token" | USDT | 18 | 1e26 (100,000,000 whole) | no | no |
| USDC | `0x64544969ed7EBf5f083679233325356EbE738930` | "USDC Token" | USDC | 18 | 1e26 | no | no |
| BUSD | `0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee` | "Binance USD" | BUSD | 18 | 1.76e26 | no | no |
| CAKE | `0xFa60D973F7642B748046464e165A65B7323b0DEE` | "PancakeSwap Token" | Cake | 18 | 2^256-1 | no | no |
| FDUSD | `0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409` | "First Digital USD" | FDUSD | 18 | **0** | **no** | yes |
| USD1 | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | no code | | | | | |
| U | `0xcE24439F2D9C6a2289F741120FE202248B666666` | no code | | | | | |

**No BSC testnet token supports EIP-3009.** FDUSD sits at the same address on testnet with the same
name, symbol and decimals. Its domain separator
`0x205ddc0041b2fd5fb3948627b2206924d700c8bd091dc3b2a0d00da1a35261aa` recomputes exactly from
`("First Digital USD", "1", 97, 0xc5f0...)`. But its testnet implementation is older:
`0xda1814d75ef1c42d0a4e6abe0d43d49a1d300c8d`, 7341 bytes, containing `d505accf`, `7ecebe00` and
`3644e515` but none of the 3009 selectors. `authorizationState` reverts and `totalSupply` is 0. It is
not usable for a 3009 demo.

Faucet: `https://www.bnbchain.org/en/testnet-faucet`. Dispenses 0.3 tBNB per claim, one claim per 24
hours across all tokens and requires the requesting address to hold at least 0.002 BNB on BSC
mainnet. The FAQ says BTC, BUSD, DAI, ETH, USDC, XRP and USDT are also issued as BEP-20 testnet
tokens, though the claim selector on the page only offers BNB. Backup faucets named on that page:
`faucet.quicknode.com/binance-smart-chain/bnb-testnet` and
`faucet.chainstack.com/bnb-testnet-faucet`.

### Permit2 on BSC and BSC testnet

| claim | value | how verified |
|---|---|---|
| Permit2 deployed on BSC mainnet | yes, `0x000000000022D473030F116dDEE9F6B43aC78BA3`, 9152-byte runtime | `cast code ... --rpc-url https://bsc-rpc.publicnode.com` |
| Permit2 deployed on BSC testnet | yes, same address, 9152-byte runtime | `cast code ... --rpc-url https://bsc-testnet-rpc.publicnode.com` |
| mainnet `DOMAIN_SEPARATOR()` | `0x4142cc3c823f819c467fa4437d637fe20589a31dfcd1da2ff22292c9ed9344e7` | `cast call ... "DOMAIN_SEPARATOR()(bytes32)"` and it recomputes exactly from `("Permit2", 56, 0x0000...8BA3)` |
| testnet `DOMAIN_SEPARATOR()` | `0x4b0ae55c3d01d102f0a8e756724fe8f86b39420717f3217a9a35504cbfdf4553` | same call, recomputes exactly from `("Permit2", 97, 0x0000...8BA3)` |
| Permit2 domain has no `version` field | confirmed | the 3-field domain typehash reproduces both separators, a 4-field one does not |
| runtime bytecode differs per chain | BSC `0x48774d93...310f`, Ethereum `0xc67d1657...1131`, Base `0xa67739ab...f8ed` | `cast keccak $(cast code ...)` on each. Expected: the chain id and the cached domain separator are constructor immutables |
| `nonceBitmap(address,uint256)` readable | yes, returns 0 for an unused word | `cast call ... "nonceBitmap(address,uint256)(uint256)"` |
| `allowance(address,address,address)` readable | yes, returns `(uint160,uint48,uint48)` all zero for a fresh triple | `cast call ... "allowance(address,address,address)(uint160,uint48,uint48)"` |
| SignatureTransfer, AllowanceTransfer selectors present | `30f28b7a`, `edd9444b`, `137c29fe`, `3ff9dcb1`, `2b67b570`, `36c78516`, `4fe02b44` all found | grep of the BSC runtime |

### x402ExactPermit2Proxy on BSC and BSC testnet

This is the piece that makes Permit2 safe for a marketplace. Without it the facilitator picks the
recipient. With it the recipient is inside the buyer's signature.

| claim | value | how verified |
|---|---|---|
| deployed on BSC mainnet | yes, `0x402085c248EeA27D92E8b30b2C58ed07f9E20001`, 2913-byte runtime | `cast code` on mainnet |
| deployed on BSC testnet | yes, same address, same runtime length | `cast code` on testnet |
| `PERMIT2()` | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | `cast call ... "PERMIT2()(address)"` |
| `WITNESS_TYPE_STRING()` | `"Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)"` | `cast call ... "WITNESS_TYPE_STRING()(string)"` |
| `WITNESS_TYPEHASH()` | `0xd97b3239a7f32295517bd14cb074edfdd188dfe5eb42f802bb26d4fd1eb12c37` | `cast call` and equals `cast keccak "Witness(address to,uint256 validAfter)"` |
| `settle` selector | `0x13cd3b53` | `cast sig`, found in the runtime |
| `settleWithPermit` selector | `0xfa340378` | `cast sig`, found in the runtime |
| enforces the signed recipient | yes | row 14 above, tampering `witness.to` reverts `InvalidSigner()` |

### B402, Binance's x402 facilitator, is live and readable without credentials

| claim | value | how verified |
|---|---|---|
| public Bazaar base URL | `https://www.binance.com/bapi/ramp/v1/public/ramp/b402` | named in the docs base-urls page, then called |
| `/bazaar/resources` answers unauthenticated | yes, HTTP 200, `code: "000000"` | `curl -sS https://www.binance.com/bapi/ramp/v1/public/ramp/b402/bazaar/resources` |
| `/bazaar/search` answers unauthenticated | yes, key is `data.resources` not `data.items` | same curl on `/bazaar/search` |
| `/bazaar/merchant` needs a parameter | `{"code":"000002","message":"illegal parameter","success":false}` | same curl on `/bazaar/merchant` |
| live resource count | 25 | `jq '.data.items \| length'` on the saved capture |
| schemes actually in production | only `eip3009` and `permit2-exact`. No `permit2-upto` in any live listing | `jq -r '.data.items[].accepts[].scheme' \| sort \| uniq -c` |
| scheme and asset tally | 22 `eip3009`/USD1, 4 `permit2-exact`/USDT, 3 `permit2-exact`/USDC, 3 `eip3009`/U, 2 `permit2-exact`/U, 1 `permit2-exact`/USD1 | same jq |
| network string | `eip155:56` on every entry | same jq |
| amounts confirm 18 decimals | `10000000000000000` = 0.01 USD1, up to `2000000000000000000` = 2 USD1 | `jq -r '.data.items[].accepts[].maxAmountRequired'` |
| B402 methods documented | `eip3009`, `permit2-exact`, `permit2-upto`. EIP-2612 `permit` is not a B402 method | docs introduction page |
| B402 names U and USD1 as its 3009 tokens | yes, FDUSD is not listed by B402 despite being 3009-capable on chain | docs introduction token table |
| B402 pays gas both sides | "B402 pays the gas for every settle", "Buyers do not run wallets or hold gas" | docs introduction page |
| B402 does not custody | "B402 does not take possession, custody, or control of user funds or payment tokens", "All token transfers occur strictly peer-to-peer" | docs introduction page |
| authenticated endpoints | `POST {BASE_URL}/papi/v2/b402/{supported,verify,settle}`, `/papi/v1/...` legacy | docs quick-start and open-apis pages |
| authenticated BASE_URL is not published | "Please contact us for access" for sandbox and production | docs base-urls page. Guessing `api.binance.com` and `papi.binance.com` returned empty and an error page |
| auth scheme | headers `X-Tesla-ClientId`, `X-Tesla-SignAccessToken`, `X-Tesla-Timestamp`, `X-Tesla-Signature`. RSA PKCS#1 v1.5 SHA-256 over body concatenated with millisecond timestamp, base64. Plus an IP allowlist | docs quick-start page |
| `/supported` response keys | `kinds`, `extensions`, `signers`. `kinds[].extra` carries `name`, `version`, `assetTransferMethod`, `signerAddress` and, for `permit2-*`, `spenderAddress` | docs quick-start page |
| mainnet status | testnet is open for partner onboarding, mainnet credentials by application | docs introduction page |

### Native Circle USDC does not exist on BSC

Circle's own contract-address listing covers 37 mainnets and 39 testnets and contains no BNB Smart
Chain row under any alias. So there is no Circle FiatTokenV2 on BSC, which is why the 6-decimal,
3009-native USDC that x402 examples assume has no BSC counterpart. `0x8AC76a51...` is the Binance-Peg
wrapper: 18 decimals, no 2612, no 3009, 1596-byte runtime.

Other BSC stables checked and found to have neither 3009 nor 2612: TUSD
`0x14016E85a25aeb13065688cAFB43044C2ef86784`, USDD `0xd17479997F34dd9156Deef8F95A52D81D265be9c`, BUSD
`0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56`, DAI `0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3`. All
18 decimals except WBTC `0x0555E30da8f98308EdB960aa94C0Db47230d2B9c` at 8.

## Unverified or open

| claim | why it is not verified |
|---|---|
| The B402 `/supported` response for BSC mainnet, field by field | the authenticated `BASE_URL` is issued only at onboarding. `api.binance.com/papi/v2/b402/supported` returned an empty body, `papi.binance.com` returned a Binance error page. Nothing to read without credentials |
| Which `signerAddress` B402 uses on BSC mainnet | only obtainable from `/supported`, which needs credentials |
| Which `spenderAddress` B402 uses for `permit2-exact` | same. It may be the canonical `x402ExactPermit2Proxy` at `0x402085c2...0001` or a Binance-specific spender. Do not assume |
| Whether B402 mainnet credentials can be obtained before 2026-09-09 | the docs say mainnet is by application. I did not apply |
| Whether the FDUSD, USD1 or U implementations change before judging | all three are EIP-1967 proxies with live admins. Admin slots read: FDUSD `0xbb812b978e41929e86ad9ea8c1025710fee85957`, USD1 `0xa032fe6c496732bdfc0d235066f55f171fa4aece`, U `0x36124fa57e049846e9dc181c8caa31a3c5da4e9c`. An upgrade could remove 3009 |
| Whether a given buyer address is frozen or the token is paused at settle time | all three tokens expose `paused()` and `frozen(address)`, both `false` for the addresses I checked. State can change per block |
| The exact BNB price, so the gas cost in fiat | out of scope for this pass. Gas cost is stated in BNB only |
| Whether Permit2 on BSC was deployed by the canonical CREATE2 deployer | bytecode differs from Ethereum because of constructor immutables, so a hash comparison cannot prove provenance. The domain separator matching the canonical formula is strong evidence, not proof of deployer |
| Whether `x402ExactPermit2Proxy` on BSC is byte-identical to the audited reference | I verified its address, `PERMIT2()`, `WITNESS_TYPE_STRING()`, `WITNESS_TYPEHASH()`, both selectors and behaviour under tampering. I did not diff its runtime against a compiled reference |
| Whether the x402 spec's `eip2612GasSponsoring` extension is offered by any BSC facilitator | the public x402.org facilitator lists it under `extensions`, but its `kinds` are Base Sepolia, Solana, Algorand, Aptos, Stellar, Hedera and XRPL. No `eip155:56` entry |
| CAKE holder count or whether any BSC DEX router needs Permit2 approvals | not part of this brief |
| WBNB `deposit()` semantics beyond the fallback observation | I inferred the fallback from the empty return on unknown selectors. I did not read WBNB source |

The public x402.org facilitator does **not** support BSC. Its `/supported` response lists
`eip155:84532` (Base Sepolia) and non-EVM networks only, with `signers["eip155:*"]` set to
`0xd407e409E34E0b9afb99EcCeb609bDbcD5e7f1bf`. That address has **no code on BSC or BSC testnet**, so
it is an EOA there. For BSC the facilitator has to be B402 or one we run.

## Interfaces and constants

### Addresses, paste-ready

```jsonc
// BSC mainnet, chain id 56
{
  "chainId": 56,
  "rpc": ["https://bsc-rpc.publicnode.com", "https://bsc-mainnet.public.blastapi.io", "https://bsc-dataseed.binance.org"],
  "archiveRpc": "https://bsc-mainnet.public.blastapi.io",   // publicnode refuses historical state
  "tokens": {
    "USDT": { "address": "0x55d398326f99059fF775485246999027B3197955", "decimals": 18, "eip3009": false, "eip2612": false },
    "USDC": { "address": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", "decimals": 18, "eip3009": false, "eip2612": false },
    "WBNB": { "address": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "decimals": 18, "eip3009": false, "eip2612": false },
    "CAKE": { "address": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", "decimals": 18, "eip3009": false, "eip2612": false },
    "FDUSD": { "address": "0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409", "decimals": 18, "eip3009": true, "eip2612": true,
               "domain": { "name": "First Digital USD", "version": "1" }, "sigForm": ["vrs", "bytes"], "cancel": false },
    "USD1": { "address": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d", "decimals": 18, "eip3009": true, "eip2612": true,
              "domain": { "name": "World Liberty Financial USD", "version": "1" }, "sigForm": ["vrs"], "cancel": true },
    "U": { "address": "0xcE24439F2D9C6a2289F741120FE202248B666666", "decimals": 18, "eip3009": true, "eip2612": true,
           "domain": { "name": "United Stables", "version": "1" }, "sigForm": ["vrs", "bytes"], "cancel": false }
  },
  "permit2": "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  "permit2Domain": { "name": "Permit2", "chainId": 56, "verifyingContract": "0x000000000022D473030F116dDEE9F6B43aC78BA3" },
  "permit2DomainSeparator": "0x4142cc3c823f819c467fa4437d637fe20589a31dfcd1da2ff22292c9ed9344e7",
  "x402ExactPermit2Proxy": "0x402085c248EeA27D92E8b30b2C58ed07f9E20001",
  "b402BazaarPublic": "https://www.binance.com/bapi/ramp/v1/public/ramp/b402"
}

// BSC testnet, chain id 97
{
  "chainId": 97,
  "rpc": ["https://bsc-testnet-rpc.publicnode.com", "https://data-seed-prebsc-1-s1.binance.org:8545"],
  "faucet": "https://www.bnbchain.org/en/testnet-faucet",
  "tokens": {
    "WBNB": { "address": "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", "decimals": 18 },
    "USDT": { "address": "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", "decimals": 18 },
    "USDC": { "address": "0x64544969ed7EBf5f083679233325356EbE738930", "decimals": 18 },
    "BUSD": { "address": "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee", "decimals": 18 },
    "CAKE": { "address": "0xFa60D973F7642B748046464e165A65B7323b0DEE", "decimals": 18 }
  },
  "eip3009Tokens": [],
  "permit2": "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  "permit2DomainSeparator": "0x4b0ae55c3d01d102f0a8e756724fe8f86b39420717f3217a9a35504cbfdf4553",
  "x402ExactPermit2Proxy": "0x402085c248EeA27D92E8b30b2C58ed07f9E20001"
}
```

### EIP-3009 solidity interface, as deployed on FDUSD, USD1 and U

```solidity
interface IEIP3009 {
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    // topic0 = 0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5

    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);
    // topic0 = 0x1cdd46ff242716cdaa72d159d339a485b3438398348d68f09d7c8c0a59353d81
    // USD1 only

    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool);
    // 0xe94a0102, all three tokens

    function transferWithAuthorization(
        address from, address to, uint256 value,
        uint256 validAfter, uint256 validBefore, bytes32 nonce,
        uint8 v, bytes32 r, bytes32 s
    ) external;                                     // 0xe3ee160e, all three tokens

    function transferWithAuthorization(
        address from, address to, uint256 value,
        uint256 validAfter, uint256 validBefore, bytes32 nonce,
        bytes memory signature
    ) external;                                     // 0xcf092995, FDUSD and U only

    function receiveWithAuthorization(
        address from, address to, uint256 value,
        uint256 validAfter, uint256 validBefore, bytes32 nonce,
        uint8 v, bytes32 r, bytes32 s
    ) external;                                     // 0xef55bec6, all three. requires msg.sender == to

    function receiveWithAuthorization(
        address from, address to, uint256 value,
        uint256 validAfter, uint256 validBefore, bytes32 nonce,
        bytes memory signature
    ) external;                                     // 0x88b7ab63, FDUSD and U only

    function cancelAuthorization(
        address authorizer, bytes32 nonce, uint8 v, bytes32 r, bytes32 s
    ) external;                                     // 0x5a049a70, USD1 only

    function DOMAIN_SEPARATOR() external view returns (bytes32);   // 0x3644e515
    function nonces(address owner) external view returns (uint256); // 0x7ecebe00, this is the 2612 nonce
    function permit(address owner, address spender, uint256 value, uint256 deadline,
                    uint8 v, bytes32 r, bytes32 s) external;        // 0xd505accf
    function paused() external view returns (bool);                 // 0x5c975abb
    function frozen(address account) external view returns (bool);  // 0xd0516650
}
```

Typehashes, all reproduced with `cast keccak`:

```
TRANSFER_WITH_AUTHORIZATION_TYPEHASH
  keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
  = 0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267

RECEIVE_WITH_AUTHORIZATION_TYPEHASH
  keccak256("ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
  = 0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8

CANCEL_AUTHORIZATION_TYPEHASH
  keccak256("CancelAuthorization(address authorizer,bytes32 nonce)")
  = 0x158b0a9edf7a828aad02f63cd515c68ef2f50ba807396f6d12842833a1597429

PERMIT_TYPEHASH (EIP-2612)
  keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
  = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9

EIP712Domain typehash, 4-field, used by FDUSD, USD1, U
  keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
  = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f

EIP712Domain typehash, 3-field, used by Permit2
  keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)")
  = 0x8cad95687ba82c2ce50e74f7b754645e5117c3a5bec8151c0726d5857980a866
```

Digest construction, unchanged from the EIP:

```
Digest = keccak256(0x1901 ‖ DOMAIN_SEPARATOR ‖ keccak256(abi.encode(TYPEHASH, from, to, value, validAfter, validBefore, nonce)))
```

The `nonce` in EIP-3009 is a caller-chosen random 32-byte value, not a counter. Two authorizations
can be outstanding at once with no ordering constraint. That is the property that makes it right for
a marketplace where one buyer hires several agents in the same second.

### EIP-712 typed data a buyer signs, USD1 3009, verified working

Saved at `three/research/raw/eip712-usd1-transferwithauthorization.json`. This exact document
produced signature `0xb294dce9...01c31c`, which settled on the fork in row 7.

```json
{
  "types": {
    "EIP712Domain": [
      {"name":"name","type":"string"},
      {"name":"version","type":"string"},
      {"name":"chainId","type":"uint256"},
      {"name":"verifyingContract","type":"address"}
    ],
    "TransferWithAuthorization": [
      {"name":"from","type":"address"},
      {"name":"to","type":"address"},
      {"name":"value","type":"uint256"},
      {"name":"validAfter","type":"uint256"},
      {"name":"validBefore","type":"uint256"},
      {"name":"nonce","type":"bytes32"}
    ]
  },
  "primaryType": "TransferWithAuthorization",
  "domain": {
    "name": "World Liberty Financial USD",
    "version": "1",
    "chainId": 56,
    "verifyingContract": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d"
  },
  "message": {
    "from": "<buyer>",
    "to": "<agent payout address>",
    "value": "7500000000000000000",
    "validAfter": "0",
    "validBefore": "4102444800",
    "nonce": "0x2222222222222222222222222222222222222222222222222222222222222222"
  }
}
```

Swap the domain for FDUSD `{"name":"First Digital USD","version":"1","verifyingContract":"0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409"}`
or U `{"name":"United Stables","version":"1","verifyingContract":"0xcE24439F2D9C6a2289F741120FE202248B666666"}`.
For `receiveWithAuthorization` change `primaryType` and the type name to
`ReceiveWithAuthorization`, keep the field list identical.

Settle it with:

```bash
cast send $TOKEN "transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)" \
  $FROM $TO $VALUE $VALID_AFTER $VALID_BEFORE $NONCE $V $R $S \
  --private-key $RELAYER_KEY --rpc-url https://bsc-rpc.publicnode.com
```

### Permit2 SignatureTransfer, the universal fallback

Two flavours. Plain `permitTransferFrom` binds the signature to a `spender` who then chooses the
recipient. `permitWitnessTransferFrom` additionally binds the recipient inside the signature. For a
marketplace, use the witness form through `x402ExactPermit2Proxy`, otherwise the facilitator can
redirect the payment.

```solidity
interface ISignatureTransfer {
    struct TokenPermissions { address token; uint256 amount; }
    struct PermitTransferFrom { TokenPermissions permitted; uint256 nonce; uint256 deadline; }
    struct SignatureTransferDetails { address to; uint256 requestedAmount; }

    function permitTransferFrom(
        PermitTransferFrom memory permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;                                     // 0x30f28b7a

    function permitWitnessTransferFrom(
        PermitTransferFrom memory permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes32 witness,
        string calldata witnessTypeString,
        bytes calldata signature
    ) external;                                     // 0x137c29fe

    function nonceBitmap(address, uint256) external view returns (uint256);       // 0x4fe02b44
    function invalidateUnorderedNonces(uint256 wordPos, uint256 mask) external;   // 0x3ff9dcb1
    function DOMAIN_SEPARATOR() external view returns (bytes32);                  // 0x3644e515
}

interface Ix402ExactPermit2Proxy {
    struct Witness { address to; uint256 validAfter; }
    struct EIP2612Permit { uint256 value; uint256 deadline; bytes32 r; bytes32 s; uint8 v; }

    event x402PermitTransfer(address from, address to, uint256 amount, address asset);
    // topic0 = 0xc0482a187556d776f2ef86c70df26debca6009f9d1647f6ce59e2f57fea17dc6

    function PERMIT2() external view returns (address);            // 0x000000000022D473030F116dDEE9F6B43aC78BA3
    function WITNESS_TYPE_STRING() external view returns (string memory);
    function WITNESS_TYPEHASH() external view returns (bytes32);   // 0xd97b3239a7f32295517bd14cb074edfdd188dfe5eb42f802bb26d4fd1eb12c37

    function settle(
        ISignatureTransfer.PermitTransferFrom calldata permit,
        address owner, Witness calldata witness, bytes calldata signature
    ) external;                                                    // 0x13cd3b53

    function settleWithPermit(
        EIP2612Permit calldata permit2612,
        ISignatureTransfer.PermitTransferFrom calldata permit,
        address owner, Witness calldata witness, bytes calldata signature
    ) external;                                                    // 0xfa340378
}
```

Permit2 typehashes, reproduced with `cast keccak`:

```
TOKEN_PERMISSIONS_TYPEHASH
  keccak256("TokenPermissions(address token,uint256 amount)")
  = 0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1

PERMIT_TRANSFER_FROM_TYPEHASH
  keccak256("PermitTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)")
  = 0x939c21a48a8dbe3a9a2404a1d46691e4d39f6583d6ec6b35714604c986d80106

WITNESS_TYPEHASH (x402 proxy)
  keccak256("Witness(address to,uint256 validAfter)")
  = 0xd97b3239a7f32295517bd14cb074edfdd188dfe5eb42f802bb26d4fd1eb12c37

witness type string (echoed to permitWitnessTransferFrom verbatim)
  "Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)"

so the full signed type string is
  "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)"
```

Typed data for the witness form, saved at
`three/research/raw/eip712-x402-permitwitnesstransferfrom.json`. This exact document settled row 13.

```json
{
  "types": {
    "EIP712Domain": [
      {"name":"name","type":"string"},
      {"name":"chainId","type":"uint256"},
      {"name":"verifyingContract","type":"address"}
    ],
    "TokenPermissions": [
      {"name":"token","type":"address"},
      {"name":"amount","type":"uint256"}
    ],
    "Witness": [
      {"name":"to","type":"address"},
      {"name":"validAfter","type":"uint256"}
    ],
    "PermitWitnessTransferFrom": [
      {"name":"permitted","type":"TokenPermissions"},
      {"name":"spender","type":"address"},
      {"name":"nonce","type":"uint256"},
      {"name":"deadline","type":"uint256"},
      {"name":"witness","type":"Witness"}
    ]
  },
  "primaryType": "PermitWitnessTransferFrom",
  "domain": { "name": "Permit2", "chainId": 56, "verifyingContract": "0x000000000022D473030F116dDEE9F6B43aC78BA3" },
  "message": {
    "permitted": { "token": "0x55d398326f99059fF775485246999027B3197955", "amount": "31000000000000000000" },
    "spender": "0x402085c248EeA27D92E8b30b2C58ed07f9E20001",
    "nonce": "21",
    "deadline": "4102444800",
    "witness": { "to": "<agent payout address>", "validAfter": "0" }
  }
}
```

Permit2 nonces are unordered bitmap positions, not counters. `nonce / 256` picks the word,
`nonce % 256` picks the bit. Read `nonceBitmap(owner, wordPos)` and choose any clear bit. After row 10
used nonce 7, `nonceBitmap(buyer, 0)` read `128`.

Permit2 named errors, all four bytes, so a client can map them to messages:

| selector | error | when |
|---|---|---|
| `0x756688fe` | `InvalidNonce()` | that bitmap bit is already set. Confirmed in row 11 |
| `0x815e1d64` | `InvalidSigner()` | recovered signer is not `owner` or any signed field was altered including `spender` and `witness.to`. Confirmed in rows 12 and 14 |
| `0xcd21db4f` | `SignatureExpired(uint256)` | `block.timestamp > deadline` |
| `0x3728b83d` | `InvalidAmount(uint256)` | `requestedAmount > permitted.amount` |
| `0x4be6321b` | `InvalidSignatureLength()` | signature is neither 64 nor 65 bytes |
| `0x8baa579f` | `InvalidSignature()` | `ecrecover` returned the zero address |
| `0x` (empty) | none | the signer has code and its ERC-1271 `isValidSignature` returned nothing. This is the EIP-7702 case |

### B402 Bazaar JSON shape, from the live capture

```jsonc
{
  "code": "000000", "message": null, "messageDetail": null, "success": true,   // BAPI envelope
  "data": {
    "x402Version": 2,
    "pagination": { /* ... */ },
    "items": [
      {
        "resource": "https://pro.cournot.ai/intelligence/v1/probability",
        "type": "http",
        "x402Version": 2,
        "description": "Fair probability for a prediction-market event. ...",
        "accepts": [
          {
            "scheme": "eip3009",                                       // or "permit2-exact"
            "network": "eip155:56",
            "asset": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
            "maxAmountRequired": "10000000000000000",                  // 0.01 USD1 at 18 decimals
            "payTo": "0xA8b2c2594eC5774479749d26105C9FB6CDcA1d68"
          }
        ],
        "lastUpdated": 1788571501475
      }
    ]
  }
}
```

`/bazaar/search` returns the same objects under `data.resources` rather than `data.items`. A CDP-style
x402 client must strip the BAPI envelope before handing the payload to its own parser.

## Ranked payment mechanics on BSC today, best first

### 1. EIP-3009 `receiveWithAuthorization` into our own settlement contract, USD1 or U or FDUSD

Buyer signs: **one** EIP-712 `ReceiveWithAuthorization` message. Nothing else, ever.
Transactions submitted: one, by our relayer, calling our settlement contract, which calls
`token.receiveWithAuthorization`. Because `msg.sender` must equal `to`, `to` is our contract.
Who pays gas: our relayer, in BNB. About 103k to 110k gas plus our own contract's overhead, so
roughly 0.0000055 BNB at 0.05 gwei.
Custody: our contract holds the funds for the length of that one transaction, then forwards to the
agent within the same call. If the forward is in the same transaction, custody is atomic and never
observable between blocks. If we hold for a dispute window, we do custody and that is a design
choice not a constraint.
Failure modes, all reproduced or read from the deployed revert strings:
`"Authorization already used"` on nonce reuse, `"Caller must be the payee"` if anyone else submits,
`"FiatToken: ..."`-style balance failures if the buyer spent the tokens after signing, expiry once
`block.timestamp > validBefore`, `paused()` true, `frozen(buyer)` or `frozen(payee)` true and the
proxy admin upgrading 3009 away. The buyer's signature is worthless to anyone but our contract, which
is why this ranks first: a leaked authorization cannot be redeemed elsewhere.

### 2. EIP-3009 `transferWithAuthorization` direct to the agent, USD1 or U or FDUSD

Buyer signs: one EIP-712 `TransferWithAuthorization`.
Transactions submitted: one, by our relayer, straight at the token. No contract of ours in the path.
Who pays gas: our relayer. 103,395 gas measured for FDUSD, 108,164 for USD1, 103,377 for U or 86,731
for FDUSD with the packed `bytes` variant.
Custody: never. Funds go buyer to agent in one `Transfer` event.
Failure modes: same as above minus the payee check, plus one extra that matters. Anyone who sees the
signature can submit it, so a mempool observer can front-run our relayer and burn our nonce or grief
by submitting at a moment we did not choose. The transfer still goes to the signed `to`, so no funds
are at risk. Only ordering is. Use this when the agent is paid directly with no marketplace fee split.

### 3. Permit2 witness transfer through `x402ExactPermit2Proxy`, any BEP-20 including USDT and USDC

Buyer signs: one on-chain `approve(Permit2, max)` transaction the first time ever, per token, then one
EIP-712 `PermitWitnessTransferFrom` per payment.
Transactions submitted: the one-time approve by the buyer (46,446 gas measured), then one
`x402ExactPermit2Proxy.settle` per payment by our relayer (70,157 gas measured).
Who pays gas: the buyer pays the first approve in BNB. Our relayer pays every settle after that.
Custody: never. Permit2 pulls from the buyer straight to `witness.to`.
Failure modes: the approve is a hard gate, so a brand-new buyer with zero BNB cannot start. The x402
spec covers this with `erc20ApprovalGasSponsoring` (facilitator sends BNB, then batches approve then
settle) and `eip2612GasSponsoring` (`settleWithPermit`, which needs the token to support 2612, so not
USDT or USDC). Beyond that: `InvalidNonce`, `InvalidSigner`, `SignatureExpired`, `InvalidAmount` and
the empty-revert ERC-1271 trap for EIP-7702-delegated buyers. Permit2 also carries third-party
contract risk we inherit.

### 4. Hand the whole thing to B402 as facilitator

Buyer signs: one EIP-712 message, in whichever of `eip3009`, `permit2-exact` or `permit2-upto` the
resource advertises.
Transactions submitted: none by us. B402 `/settle` broadcasts.
Who pays gas: B402. Documented as "B402 pays the gas for every settle".
Custody: documented as none, "All token transfers occur strictly peer-to-peer on the public
blockchain".
Failure modes: we cannot call `/verify` or `/settle` without onboarding-issued credentials, a
whitelisted source IP and an RSA-signed request. Mainnet is by application. That is a hard external
dependency on a timeline we do not control, four days before the deadline. It also means our demo
breaks if their sandbox is down during judging.
Verdict: build our own settle path and read the public Bazaar for discovery. Treat B402 as an
optional adapter behind an interface, not the only path.

### 5. EIP-2612 `permit` then a separate `transferFrom`

Buyer signs: one EIP-712 `Permit`.
Transactions submitted: two, one if a helper contract batches them. Our relayer submits both.
Who pays gas: our relayer. 93,177 gas for the permit alone, plus a transferFrom.
Custody: our spender contract holds the allowance, so it can pull at any later time up to the
approved value until we call it down. That is a standing claim on the buyer's balance, which is
strictly worse than 3009 or Permit2.
Failure modes: sequential nonces, so two concurrent hires from the same buyer race and one reverts.
This is the exact deficiency EIP-3009 was written to fix. Only FDUSD, USD1 and U support it anyway,
and all three of those support 3009, so 2612 is never the best available option on BSC.

### 6. Plain `approve` then `transferFrom`

Buyer signs: one on-chain `approve` transaction, which is not a signature, it is a transaction.
Who pays gas: the buyer, every time they change the allowance.
Custody: standing allowance, same problem as above.
Failure modes: the buyer needs BNB, breaking the gasless story entirely. Include only as the last
fallback when a token has neither 3009 nor 2612 and the buyer refuses to approve Permit2.

### Not viable on BSC today

**Native Circle USDC with 6 decimals and built-in 3009.** Does not exist on BSC. Circle lists 37
mainnets and BSC is not one of them.

**Any EIP-3009 path on BSC testnet.** No testnet token implements it. If the judging demo must run on
testnet, the options are deploying our own 3009 test token, running the Permit2 path there instead
or running the demo on mainnet with small real amounts. The testnet Permit2 and `x402ExactPermit2Proxy` are both deployed at
the same addresses as mainnet, so the Permit2 path is genuinely testable on chain 97 today.

**EIP-7702 batching as the primary rail.** 7702 is live on BSC, so a buyer could delegate to a batcher
contract and get approve-plus-settle in one transaction. That still needs the buyer to send one
7702-type transaction with gas. It is a nice extra, not the base mechanic.

## Design implications for the marketplace

**Price everything in USD1 at 18 decimals. Never hardcode 6.** USD1 carries native 3009, it is the
asset 22 of the 25 live B402 resources already price in and it is a BNB Chain ecosystem asset the
judges will recognise. Keep U as the second option and FDUSD as the third. Store prices as base-unit
strings, never floats. Derive the multiplier from an on-chain `decimals()` read at startup rather
than a constant. A single hardcoded `1e6` turns a 1 USD1 agent hire into 0.000001 USD1.

**Build the settlement contract around `receiveWithAuthorization`, not `transferWithAuthorization`.**
The payee check gives us the marketplace fee split, an ERC-8004 feedback write in the same
transaction and immunity from anyone else redeeming the buyer's signature. The cost is one extra
contract and about 30k gas. Worth it. The contract should emit its own event carrying the agent id
alongside the token `Transfer`, so the hire is queryable by agent without decoding two logs.

**Ship a per-token capability probe, not a token allowlist.** The probe must be
`cast code` plus selector grep, resolving EIP-1967 proxies first. Call-based probing is wrong on BSC
in two directions: CAKE answers `nonces(address)` without supporting permit and WBNB answers
everything because its fallback swallows unknown selectors. Cache the result per address per chain
and re-check on a schedule, because all three 3009 tokens are upgradeable proxies with live admins.

**Two rails, one interface.** Rail A is 3009 for USD1, U, FDUSD. Rail B is Permit2 witness transfer via
`0x402085c248EeA27D92E8b30b2C58ed07f9E20001` for USDT, USDC and everything else. Both are already
deployed on BSC mainnet and Rail B is also on testnet. Expose them as one `PaymentMethod` enum so the
UI shows the buyer "one signature" for Rail A and "one approval then one signature" for Rail B. Agent
Diversity in the rubric is about agent categories, but a marketplace that quotes in four assets across
two rails reads as more complete than one hardwired to a single token.

**Do not make B402 credentials a critical path.** Read the public Bazaar for discovery today, with no
credentials and keep our own relayer as the settle path. If B402 mainnet access lands before the
deadline, swap the adapter. If it does not, nothing breaks. Cite the public Bazaar endpoint in the
submission as evidence the payment rail interoperates.

**Handle the EIP-7702 buyer.** Before offering Rail B, check `eth_getCode(buyer)`. If it is non-empty
and starts `0xef0100`, the buyer is a delegated EOA and Permit2 will route to ERC-1271 and may revert
with empty data. Route those buyers to Rail A, which uses plain `ecrecover` or verify the delegate
implements `isValidSignature`. An empty revert with no error selector is the worst possible thing to
debug live in front of judges.

**Set `validBefore` tight and `validAfter` to zero.** A 3009 authorization with a far-future
`validBefore` is a bearer instrument until it is spent or cancelled. Use minutes, not years. Only USD1
lets a buyer cancel on chain (`cancelAuthorization`, `0x5a049a70`), so for FDUSD and U a short expiry
is the only revocation the buyer has. Surface the expiry in the signing prompt.

**Gas sponsorship is cheap enough to be a feature.** At 0.05 gwei, a 3009 settle costs 0.00000517 BNB.
Say so in the submission with the measured gas numbers. A sponsored relayer with a per-buyer rate limit
is a day of work and removes the "buyer needs BNB" objection entirely.

**Use blastapi, not publicnode, for anything that forks or reads history.** publicnode returns
`Archive requests require a personal token` on historical state, which silently breaks
`anvil --fork-url` the moment the fork block falls more than a couple of minutes behind the head.
`https://bsc-mainnet.public.blastapi.io` served archive state. Note this in the repo README so a judge
reproducing the tests does not hit it.

**For a testnet demo, deploy our own 3009 token.** No BSC testnet token implements 3009 and the FDUSD
proxy that exists at the same address on chain 97 runs an older implementation with 2612 only and zero
supply. Deploying a mock 3009 token to testnet is a few hours and makes the whole flow demoable without
real funds. The Permit2 rail needs no such work: Permit2 and the x402 proxy are both live on chain 97.

## Sources

### On-chain, all run this session

- `cast` 1.7.1, `anvil` 1.7.1.
- BSC mainnet reads: `https://bsc-rpc.publicnode.com`, chain id 56, blocks 120019278 to 120020400.
- BSC mainnet archive reads and the fork source: `https://bsc-mainnet.public.blastapi.io`.
- BSC testnet reads: `https://bsc-testnet-rpc.publicnode.com`, chain id 97, block 129165659. Chain id
  also confirmed on `https://data-seed-prebsc-1-s1.binance.org:8545`.
- Cross-chain Permit2 codehash comparison: `https://ethereum-rpc.publicnode.com`,
  `https://base-rpc.publicnode.com`.
- Fork used for every live execution: `anvil --fork-url https://bsc-mainnet.public.blastapi.io --port 8547`,
  fork block 120020269, chain id 56.
- Token holder impersonated on the fork for funding: `0xF977814e90dA44bFA03b6295A0616a897441aceC`.

### Local raw captures written by this pass

- `three/research/raw/b402-bazaar-resources-2026-09-05.json` (19,201 bytes, 25 live resources)
- `three/research/raw/bsc-fdusd-impl-code-2026-09-05.hex` (10,590-byte runtime)
- `three/research/raw/bsc-usd1-impl-code-2026-09-05.hex` (15,071-byte runtime)
- `three/research/raw/bsc-u-impl-code-2026-09-05.hex` (12,027-byte runtime)
- `three/research/raw/bsc-permit2-code-2026-09-05.hex` (9,152-byte runtime)
- `three/research/raw/eip712-fdusd-transferwithauthorization.json`
- `three/research/raw/eip712-fdusd-receivewithauthorization.json`
- `three/research/raw/eip712-fdusd-permit2612.json`
- `three/research/raw/eip712-usd1-transferwithauthorization.json`
- `three/research/raw/eip712-u-transferwithauthorization.json`
- `three/research/raw/eip712-permit2-permittransferfrom.json`
- `three/research/raw/eip712-x402-permitwitnesstransferfrom.json`

### Local raw captures read by this pass

- `three/research/raw/eip-3009-2026-08-27.txt`, the ERC-3009 draft. Typehashes, event shapes, the
  `0xef55bec6` receive selector and the digest formula were checked against it.
- `three/research/raw/x402-scheme-exact-evm-2026-09-05.md`, the x402 exact-scheme EVM document. Source
  of the `eip3009` and `permit2` PaymentPayload shapes, the `x402ExactPermit2Proxy` reference
  implementation and its canonical address.
- `three/research/raw/x402org-facilitator-supported-2026-09-05.json`, the public x402.org facilitator
  `/supported` response. Basis for the finding that it does not support `eip155:56`.

### Pages read live

- `https://developers.binance.com/en/docs/products/onchainpay-x402/introduction`, B402 methods, token
  table, gas and custody statements.
- `https://developers.binance.com/en/docs/products/onchainpay-x402/quick-start`, `/supported` method
  and path, `extra` field list, request-signing headers.
- `https://developers.binance.com/en/docs/products/onchainpay-x402/basics/4.base-urls`, environments,
  chain ids, the public Bazaar base URL.
- `https://www.binance.com/bapi/ramp/v1/public/ramp/b402/bazaar/resources` and `/bazaar/search` and
  `/bazaar/merchant`, called with plain `curl`, no credentials.
- `https://developers.circle.com/stablecoins/usdc-contract-addresses`, basis for the finding that
  Circle issues no native USDC on BSC.
- `https://www.bnbchain.org/en/testnet-faucet`, faucet amount, cadence, mainnet balance requirement.


















