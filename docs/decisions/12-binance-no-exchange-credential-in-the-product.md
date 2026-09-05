# Decision: no exchange credential enters the product and asking a buyer for one fails a hard gate

Recorded by `12-BINANCE.md` decision 11.

## The decision

Muster never holds an exchange API key and a listing that asks a buyer for one fails a hard gate at
review. The same posture governs the buyer path: a wallet connector is offered, never an account.

## The alternative rejected

An optional exchange MCP connection as a convenience for buyers who already hold an account, which would
let an agent trade on a venue with real depth.

## Why

The credential's scope is the account rather than the job and no configurable spend limit exists on that
surface. So the smallest thing a buyer could grant is everything, for as long as the key lives.

It would also change what our database is worth. Every field we keep today is already public on chain, which
is the property that makes a breach uninteresting. One credential turns that into a database worth stealing,
which is a different security posture with a different cost.

The gate is on the listing rather than on the buyer's choice, because a listing that asks is the mechanism
that would normalise it.

## What it binds

`05-ONBOARDING.md`'s hard gates plus its buyer onboarding, `12-BINANCE.md`'s refusals,
`14-GAPS.md`'s key management which names three keys plus two credentials and no more,
`15-SYSTEM.md`'s security section where the only authenticated surface is a signature.

## What would make us revisit it

A scoped, spend-capped, expiring credential that a buyer can revoke, which is what an Altana session
already is on chain. That path exists in the product, so the exchange key has nothing left to offer.
