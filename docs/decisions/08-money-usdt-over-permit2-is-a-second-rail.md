# Decision: USDT ships over Permit2 as a labelled second rail, off the default path

Recorded by `08-MONEY.md` section 2, following `00-payment-rail-is-not-usdt.md`.

## The decision

USDT is supported through Permit2 `SignatureTransfer`, with its own verify table, labelled as a second
rail. It is never the default quote. Binance-Peg USDC is added as a fifth `accepts[]` entry on the same
labelled rail.

## The alternative rejected

Make USDT the default because it is the token most buyers hold. Or do not ship it at all, since the
one-signature story is cleaner without it. Or ship it as a name in the ship list with no wire shape plus
no verify checks of its own.

## Why

USDT supports neither EIP-3009 nor EIP-2612 on BSC, so it cannot do one signature. Permit2 is deployed at
`0x000000000022D473030F116dDEE9F6B43aC78BA3` and the path is verified working on a fork, so the token most
buyers hold still works, at the cost of one on-chain `approve` the first time.

It is not the default precisely because of that approve. The first call is not gasless, so selling it as
one-click would be a false claim about the thing a judge tests first.

Not shipping it at all would leave the widest-held asset on BSC unusable on a marketplace whose whole
argument is that a stranger can pay. Binance-Peg USDC rides the same rail for a measured reason: 507 of
509 listings on the partner venue that says it will hire from us price in USDC, so the buyer we know is
coming holds the one token that cannot sign once. It is one config row plus a `decimals()` assertion and
it changes no default.

A rail in the ship list with no verify path is a rail a builder cannot implement, which is why the
Permit2 verify table is written out beside the EIP-3009 one.

## What it binds

`08-MONEY.md`'s `accepts[]` composition plus both verify tables, `04-AGENT-PROTOCOL.md`'s challenge,
`12-BINANCE.md` where B402 treats USDT as Permit2-only for the same reason, `13-PARTNERS.md`'s fifth
entry, `15-SYSTEM.md`'s boot assertion on every token's decimals.

## What would make us revisit it

USDT gaining EIP-3009 or EIP-2612 on BSC, which would move it onto the default rail. A metered `upto`
settlement over Permit2 is separately deferred, so that path could open the second rail wider later.
