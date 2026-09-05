# Verified: the payment rail on BSC

Checked directly against BSC mainnet (chain id 56) on 2026-09-05 with `cast` over
`https://bsc-rpc.publicnode.com`. Everything below is a call that was run, not a claim from a
document. This file exists because the whole hire flow depends on it and because two earlier
passes in this lane assumed a rail that does not exist here.

## The finding

The canonical x402 `exact` scheme signs an **EIP-3009 `TransferWithAuthorization`**: the buyer
signs once off-chain, then a facilitator submits the transfer. The buyer never sends a
transaction. On BSC, **USDT does not support EIP-3009 and does not support EIP-2612 permit
either**. Neither does Binance-Peg USDC. Neither does BUSD. So an x402 integration that
prices in USDT on BSC cannot be one-signature, whatever the spec says.

Two BSC stablecoins do support it, in full: **FDUSD** and **USD1**.

## Capability table

| Token | Address | Decimals | Proxy | EIP-3009 | EIP-2612 permit |
| --- | --- | --- | --- | --- | --- |
| USDT (BSC-USD) | `0x55d398326f99059fF775485246999027B3197955` | **18** | no | **no** | **no** |
| USDC (Binance-Peg) | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | **18** | yes, impl `0xba5fe23f8a3a24bed3236f05f2fcf35fd0bf0b5c` | **no** | **no** |
| BUSD | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` | 18 | no | no | no |
| **FDUSD** | `0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409` | **18** | yes, impl `0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50` | **yes** | **yes** |
| **USD1** | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | **18** | yes, impl `0x694aa534bdef8ed63244eb902e7914e527891f08` | **yes**, plus `cancelAuthorization` | **yes** |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | 18 | n/a | no | no |
| CAKE | `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82` | 18 | n/a | no | partial, `nonces` exists but `DOMAIN_SEPARATOR` reverts |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | n/a | no, 9152 bytes | n/a, `SignatureTransfer` instead | n/a |

Decimals is 18 for every BSC stablecoin above. Any code carried over from a 6-decimal USDC
chain is wrong here by a factor of a trillion.

## How each row was established

Two independent tests, because the first one lies about proxies.

1. Call the function. `authorizationState(address,bytes32)` returning `false` means the
   function exists. Reverting means it does not.
2. Grep the **implementation** bytecode for the selector, not the proxy's. A proxy holds no
   dispatch table, so grepping the proxy address reports every selector absent. That is the
   trap: the proxy-level grep said FDUSD had no `transferWithAuthorization` and the
   implementation-level grep said it does.

Selectors used: `transferWithAuthorization` `0xe3ee160e`, `receiveWithAuthorization`
`0xef55bec6`, `cancelAuthorization` `0x5a049a70`, `authorizationState` `0xe94a0102`, `permit`
`0xd505accf`, `nonces` `0x7ecebe00`.

```bash
export RPC=https://bsc-rpc.publicnode.com
IMPL_SLOT=0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc  # EIP-1967
cast storage 0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409 $IMPL_SLOT --rpc-url $RPC
cast code 0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50 --rpc-url $RPC | grep -c e3ee160e
cast call 0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409 \
  "authorizationState(address,bytes32)(bool)" \
  0x0000000000000000000000000000000000000000 \
  0x0000000000000000000000000000000000000000000000000000000000000000 --rpc-url $RPC
```

## The exact bytes a buyer signs

EIP-712 domain typehash
`0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f`, over
`EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)`.

Both domains were **derived and then matched against the on-chain `DOMAIN_SEPARATOR()`**, so the
name and version below are proven, not guessed.

| Token | domain `name` | `version` | chainId | verifyingContract | on-chain `DOMAIN_SEPARATOR()` |
| --- | --- | --- | --- | --- | --- |
| FDUSD | `First Digital USD` | `1` | 56 | the token | `0xac2ff863e00ee93e90d01514d46b9b8179ca650e856138a6d8aea00702ca62a0` |
| USD1 | `World Liberty Financial USD` | `1` | 56 | the token | `0x5d939dc193fd011c5e26fb861450a696546a09db6b26db26501fe354ba3ed4ba` |

Version `1`, not `2`. Versions `2`, `1.0` and `v1` were each computed and each failed to match,
so this is settled by exclusion as well as by match. USD1 also implements ERC-5267
`eip712Domain()`, which returns `("World Liberty Financial USD", "1", 56, self, 0x0, [])`. FDUSD
does not implement `eip712Domain()`, so its domain can only be confirmed the way it was
confirmed here.

Struct typehashes:

* `TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)`
  → `0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267`
* `ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)`
  → `0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8`

Prefer `receiveWithAuthorization` where the payee is a contract, because it pins `msg.sender` to
the payee and closes the front-running window that `transferWithAuthorization` leaves open.

## Supply, so nobody picks a rail nobody holds

* FDUSD total supply 58,019,741.17 (read on-chain, 18 decimals applied)
* USD1 total supply 1,396,757,367.13

USD1 is the deeper of the two by more than twenty times. Both are far behind BSC USDT, which is
the reason this is a trade-off and not a free win: the rail that supports one-signature payment
is not the rail most buyers already hold.

## Circle has no native USDC on BSC

Circle's own contract address list covers 37 mainnet chains and 39 testnets and **BNB Smart
Chain appears in neither**. The `0x8AC7...580d` token is Binance-Peg USDC, 18 decimals, no
permit, no 3009. So "just use USDC like every other x402 deployment" is not available here.

Source: https://developers.circle.com/stablecoins/usdc-contract-addresses read 2026-09-05.

## Ranked options for charging for one agent call on BSC

1. **EIP-3009 in USD1 or FDUSD.** Buyer signs one typed message, never sends a transaction, the
   facilitator submits and pays gas. This is the real canonical x402 flow. It works today.
   Cost: the buyer has to hold USD1 or FDUSD.
2. **Permit2 `SignatureTransfer` for USDT.** One on-chain `approve(Permit2, max)` the first
   time, then every later hire is a single off-chain EIP-712 signature that the facilitator
   submits. Keeps USDT liquidity, costs one setup transaction. Permit2 is verified deployed
   on BSC.
3. **Plain `approve` plus a pull by an escrow or router.** Two transactions the first time, one
   per hire after, buyer pays gas each time. The allowance is a standing risk.
4. **Buyer-submitted direct transfer with a payment id.** Always works, always costs the buyer
   gas and a wallet confirmation per call. Gives up the whole one-click claim.

Recommended: quote in **USD1** over path 1 as the default, offer path 2 for USDT so the liquid token
still works. Never write code that assumes 6 decimals.

**Corrected 2026-09-05 by R17.** An earlier version of this line said "USD1 or FDUSD". FDUSD does
implement EIP-3009, which was right, but **Binance B402 does not support FDUSD**. B402's `eip3009`
scheme accepts only **USD1** and **U** (`0xcE24439F2D9C6a2289F741120FE202248B666666`, "United Stables",
18 decimals, EIP-3009 verified on chain here). Live evidence settles the choice: of 989 payment options
across the 979 endpoints in B402 Bazaar, 958 price in USD1 and 979 use `eip3009`. See
`R17-binance-agent-os.md`.

## What is still open

* ~~Which token and scheme Binance x402 / B402 settles in, and whether it hosts a facilitator.~~
  **Closed by R17.** B402 offers `eip3009` (U and USD1 only), `permit2-exact` and `permit2-upto` (any
  ERC-20), on `eip155:56` and `eip155:97`, over `POST /papi/v2/b402/{supported,verify,settle}`.
* ~~Whether a facilitator will sponsor gas.~~ **Closed by R17.** The B402 facilitator submits the
  transaction and sponsors the gas, so the payer holds no BNB. BSC mainnet access is granted on request
  and needs a developer account, so testnet is the provable path with four days left.
* FDUSD and USD1 are both upgradeable proxies, so their behaviour can change under us. Who
  holds the upgrade key on each is unverified.
* Testnet equivalents. Nothing above was checked on chain 97. B402's docs list testnet tokens whose
  decimals differ from mainnet (Mock U and USDC at 6 against 18 on mainnet), so read `decimals()` at
  runtime rather than pinning a constant.
