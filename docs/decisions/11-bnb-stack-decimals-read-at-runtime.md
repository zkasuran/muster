# Decision: `decimals()` is read at runtime for every token and a mismatch fails the boot

Recorded by `11-BNB-STACK.md` section 2.5, with `15-SYSTEM.md` section 2.4 running the assertion.

## The decision

Every token's `decimals()` is read from its own contract on every chain we touch, asserted against the
configured value and a mismatch stops the process rather than warning. A listing whose token decimals
cannot be resolved fails the hireable bar.

## The alternative rejected

A constants table, which is what almost every reference implementation does.

## Why

Read on 2026-09-05: chain 97 carries two different tokens symbolled `U` plus two symbolled `USDC`, one of
each pair at 18 decimals and one at 6, while on mainnet `$U` is 18 and every stablecoin above is 18. A
constant that is right on one chain is wrong by a factor of a trillion on the other and mainnet never
catches it.

The field has already got this wrong at scale. Binance's own B402 documentation published 6 decimals for
all four mainnet tokens until a 2026-05-19 changelog correction, with merchants pricing one cent as
`amount: "10000"` then charging 1e-14 of a token. A live marketplace listing elsewhere carried a token
resolve error naming the missing decimals field, so nobody could pay it.

Failing the boot rather than warning is the part that matters. A warning in a log is a mispriced hire in
production.

## What it binds

`02-THESIS.md` H5, `04-AGENT-PROTOCOL.md`'s challenge which carries the resolved decimals in header plus
body from one object, `08-MONEY.md`'s decimals gate, `13-PARTNERS.md`'s fifth `accepts[]` entry which ships
with its own assertion, `15-SYSTEM.md`'s money rule checked at boot.

## What would make us revisit it

Nothing. This is the cheapest assertion in the system and the most expensive omission.
