# Decision: B402's own supported-token list is the constraint, never what a token can do

Recorded by `12-BINANCE.md` decision 12.

## The decision

What a B402 hire may be priced in comes from a live `/supported` response, cached rather than hardcoded.
A token's on-chain capability is not sufficient. FDUSD is not offered on the B402 path even though we
proved it implements EIP-3009 with its domain matched byte for byte.

## The alternative rejected

Price a B402 hire in FDUSD, on the strength of our own verified read of the token.

## Why

B402's `eip3009` scheme accepts `$U` plus USD1 only and FDUSD appears in no B402 token table. A capability
proof answers whether the token could settle. It does not answer whether the facilitator will submit it,
which is the only question that matters on somebody else's rail.

Their own changelog shows the table moving: Binance corrected a token claim in it in 2026-05. So the list is
authoritative and mutable at the same time, which is the argument for reading it live rather than pinning
it.

This is also why our own rail plus the B402 rail are configured separately rather than assumed identical.
The values we verified stand for our facilitator. Theirs are theirs to publish.

## What it binds

`08-MONEY.md`'s `accepts[]` composition, `12-BINANCE.md`'s integration surface,
`00-payment-rail-is-not-usdt.md` which the correction amended,
`13-PARTNERS.md` where the B402 sell path stays unverified until a `/supported` response.

## What would make us revisit it

A `/supported` response naming a different set, which is exactly the event the design reads for. Credentials
are the gate on seeing one.
