# Decision: the payment rail is EIP-3009 on a token that implements it. Not USDT

Settled before the documents were written, by running the calls by hand on 2026-09-05. Full evidence
in `research/VERIFIED-payment-rail.md`.

## The decision

One-signature payment on BSC means EIP-3009 `TransferWithAuthorization` and that means `$U` or USD1.
USDT is not the rail. It ships as a labelled second rail over Permit2, off the default path
(`08-money-usdt-over-permit2-is-a-second-rail.md`).

## The alternative rejected

Price in USDT because it is the token buyers already hold, which is what the earlier passes in this
lane assumed and what most x402 material implies. Also rejected: wait for a hosted facilitator to
cover `eip155:56`.

## Why

Verified directly against chain 56 over `https://bsc-rpc.publicnode.com`, two independent tests per
token because the first one lies about proxies:

* USDT (`0x55d398326f99059fF775485246999027B3197955`, **18 decimals**) supports **neither EIP-3009 nor
  EIP-2612**. Binance-Peg USDC (18 decimals) and BUSD support neither either.
* FDUSD and USD1 support both. Their EIP-712 domains were derived then matched against the on-chain
  `DOMAIN_SEPARATOR()`, so `First Digital USD` version `1` and `World Liberty Financial USD` version
  `1` are proven rather than guessed. Versions `2`, `1.0` and `v1` were each computed and each failed.
* Permit2 is deployed at `0x000000000022D473030F116dDEE9F6B43aC78BA3`, which is the fallback USDT can
  use.
* Circle lists **no native USDC on BNB Smart Chain**, so "use USDC like every other x402 deployment"
  is not available.
* Every BSC stablecoin above is **18 decimals**. Code carried from a 6-decimal chain is wrong here by
  a factor of a trillion.

The trap worth keeping: grepping a token's own bytecode for a selector reports every selector absent
when the token is a proxy. Read the EIP-1967 implementation slot and grep the implementation.

The cost is real and stated. The rail that supports one signature is not the rail most buyers hold.

## What it binds

`02-THESIS.md` H5, `04-AGENT-PROTOCOL.md`, `08-MONEY.md` (which owns the final rail and the fallback),
`11-BNB-STACK.md`, `12-BINANCE.md`, `13-PARTNERS.md`, `15-SYSTEM.md`'s boot assertion.

## What would make us revisit it

USDT shipping EIP-3009 or EIP-2612 on BSC. A live B402 `/supported` response naming a different set,
since that response is authoritative and its token table has been corrected before. Any of the three
EIP-3009 tokens changing implementation: all are proxies with live admins and who holds each upgrade
key is **unverified**, which is why the implementation address is re-checked before submit.
