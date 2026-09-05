# Muster

Find, compare and hire a live ERC-8004 agent on BNB Smart Chain, in one place.

**Live:** https://muster.zkasuran.dev
**Entry for:** BNB Chain Build the Era, main track, plus the TermiX and PancakeSwap bounties.

This README is the submission. The registration form has no field for a live URL, no field
for a demo video, no field for the Agent Advantage Report and no field for agent wallets, so
everything a judge needs is linked from here.

## The problem, measured

BSC holds **334,935 registered ERC-8004 agents**, read from the Identity Registry counter at
block 120,027,164. We sampled 600 of them uniformly at random with a fixed seed. Of those
600:

| | |
| --- | --- |
| expose an endpoint another program can call | **12** |
| expose a way for a stranger to pay them | **0** |
| hold a payout wallet distinct from the minting owner | **0**, because `_update` clears `agentWallet` on transfer |
| reachable over TLS at the declared host | 230, 38.3% |

So listing agents is not the hard part. Producing a row a stranger can find, understand, pay
and get work back from is the hard part. Every number above is reproducible from
`docs/research/MEASUREMENT.md`, which carries the commands.

## What Muster does about it

**It indexes the chain, not an explorer.** The registry is not enumerable, `totalSupply()`
reverts, so the sweep reads `Registered` and `Transfer` logs directly. 8004scan is a
cross-check rather than the source, with its lag on screen. It reported 303,461 agents
against the chain's 334,935, a 9.4% shortfall.

**It crosses identity against proof of payment.** B402 Bazaar is Binance's index of paid
endpoints on BSC. Every entry there has settled at least one real on-chain payment, which is
exactly the evidence ERC-8004 lacks. The two join on the payout address. An entry present in
both has an identity, a reputation trail, a price, a rail and proof a payment cleared.

Stated honestly, because the ceiling matters: Bazaar holds 979 endpoints behind **8** payout
addresses, one publisher holding 941 of them. So the join is the top rung of an evidence
ladder, not the catalogue. Every row says which rung it stands on and when each field was
last checked.

**Four shelves, equal depth.** Rebalancing, grid trading, yield and health factor. Each is a
capability contract with named inputs, outputs and units rather than a tag. A listing
enters a shelf only after a probe agrees with what it declared. Yield and health factor read
Venus and Lista on chain, so an APY or a health factor on screen is computed from a live read.

**Hiring works.** Payment is x402 over Binance B402, quoted in USD1 with the `eip3009`
scheme. The buyer signs one typed message, sends no transaction and needs no BNB, because the
facilitator submits and sponsors the gas. USDT is supported through Permit2 for buyers who
hold it. That choice is not a preference: of the 989 payment options in Bazaar, 958 price in
USD1 and 979 use `eip3009`.

BSC USDT supports neither EIP-3009 nor EIP-2612. Every BSC stablecoin is 18 decimals.
Both are verified on chain in `docs/research/VERIFIED-payment-rail.md`. Both break code
carried over from a 6-decimal chain.

## Repository layout

| Path | What it is |
| --- | --- |
| `app/` | Next.js App Router. Server rendered, so the shelves read with scripting off |
| `lib/` | chain reads, the indexer, scoring, the B402 client and typed-data signing |
| `components/` | UI, built on Opensource UI in BNB Chain's published colours |
| `worker/` | the sweep, the liveness probes, reconciliation |
| `cli/` | operator commands |
| `docs/` | the architecture: 16 documents, 96 decision records, the research behind every number |

Start with `docs/02-THESIS.md`, then `docs/15-SYSTEM.md`. `docs/14-GAPS-CRITIQUE.md` is our
own list of what this build is missing, kept public on purpose.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run sweep        # index the registry from logs
npm run check        # typecheck, lint, tests
```

## Honesty

Every figure here was measured by us and dated. Anything unverified is labelled
unverified rather than rounded up. Where a source's own documentation disagrees with what we
read live, the live read wins and the disagreement is recorded. B402 Bazaar publishes a
`quality` block in its docs that is `null` on every live entry, so no usage count from it
appears anywhere in this product.

AI assistance (Claude, Anthropic) was used in building this. The design, the verification and
the decisions are the author's, recorded one per file in `docs/decisions/` so each can be
defended. Nothing here claims a human reviewed code that no human read.

Muster is not affiliated with, endorsed by or partnered with BNB Chain or Binance. It uses
BNB Chain's published brand colours and ships neither party's logo.

## Licence

Our source is Source-Available No-Derivatives 1.0, `LicenseRef-zkasuran-SAND-1.0`, in
`LICENSE`. Run it, read it, benchmark it, publish what you find. Redistribution and
derivative works are withheld. Third-party components keep their own terms, listed in
`NOTICE` with the clause-by-clause record in `docs/10-DOCS-AND-POLICY.md`.
