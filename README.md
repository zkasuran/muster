# Muster

Find, compare and hire a live ERC-8004 agent on BNB Smart Chain, in one place.

**Live:** https://muster.zkasuran.dev
**Entered for:** BNB Chain Build the Era, main track, plus the TermiX and PancakeSwap bounties.

This README is the submission. The registration form has no field for a live URL, a demo video,
a report or a wallet address, so the repository link carries everything a judge needs. It is
all here or one click from here. `docs/AS-BUILT.md` says exactly what shipped against the
architecture, so nothing has to be taken on trust.

## The problem, measured over the whole registry

The brief described a discoverability problem across more than 200,000 agents. We did not take
the count on trust. We indexed every id on the registry and measured what a stranger could do
with each one. Every figure below is one SQL query over that index, it is dated on the live site
and the commands to rebuild it are on the status page.

| Measured over 341,231 indexed agents, block 120,694,939, 2026-09-08 | | |
| --- | --- | --- |
| Registered on chain, from the Identity Registry counter | **341,231** | written equals read |
| Publish an endpoint another program could call | **2,028** | 0.59% |
| Identical registrations under one name, `Ave.ai Trading Agent` | **118,683** | 34.8%, one operator, one script |
| Claim in their record that they accept an x402 payment | **14,219** | 4.2%, a claim nobody checked |
| Answered when we asked, one HTTPS request per declared host | **116** | 0.03% |
| Answered a real HTTP 402 with payment requirements | **5** | our four, plus one third party whose options carry no BSC network |
| Paid endpoints in Binance's B402 Bazaar, where a payment provably cleared | **979** | behind **8** payout addresses, one holding 95.2% |
| Of those 8 addresses, also holding an ERC-8004 identity | **1** | its record is empty, it sells image generation |

The last row is the finding that shaped this build. On BSC today, identity and proven revenue
are near-disjoint populations. Where they touch, the identity says nothing and the payments
are for image generation, LLM calls and text to speech. No third-party agent on the chain is
both provably payable on BSC and in rebalancing, grid trading, yield or health factor. That is
the discoverability problem stated exactly. It sits on the landing page as a measurement
rather than a claim.

## What Muster does about it

**It indexes the chain, not an explorer.** The registry's `totalSupply()` reverts, so the set
is enumerated by id from the counter slot. Only one of seven public BSC RPC endpoints serves
`eth_getLogs` on the registry at all, while refusing history without an archive token, so a
sweep built on logs would rest on one provider. A `tokenURI` multicall over 150 ids overflows
Multicall3 and drops entries without an error, so batches are 40 and a short batch is halved
until every id resolves. Written now equals read: 341,231 of 341,231. Bulk reads go only to
the endpoints BNB Chain publishes for programs, at the rate it states. The clause behind
every input is quoted in `DATA-SOURCES.md`.

**Every row carries how much is known about it.** Six rungs, worst to best:

| Rung | What it means | Rows today |
| --- | --- | --- |
| registered | on chain, nothing else known | 36 |
| declared | names an endpoint and a capability in its record, nobody has checked either | 88 |
| reachable | the named host resolves and completes TLS | 4 |
| probed | it answered a probe in a way that matches what it declared | 107 |
| payable | it returned an HTTP 402 with payment requirements a buyer could satisfy | 5 |
| settled | a payment to it has provably cleared, with the transaction hash | 0 |

A registration record is a claim and it sits two rungs below a payment that cleared. The probe
cycle is what moves a row up: one HTTPS request per declared host, through a guard that
refuses anything resolving to a private, loopback, link-local, multicast or NAT64 address, and
it can only ever raise a rung on evidence, never lower one on a transient failure. Four cycles
have recorded 527 probes over 202 listings: 245 passed, 282 failed (262 on DNS, 20 on HTTP).
The probe keeps the first 4 KB of every answer and parses it, so an agent that publishes an
A2A card, an x402 challenge or an OASF record has that rendered on its page from the real
body. Those counts are live on `/status`.

**Four shelves as capability contracts.** Rebalancing, grid trading, yield and health factor.
Each shelf publishes the inputs it accepts, the outputs it returns and the units. A row is
on the shelf because its record matches that contract. One listing per agent per shelf. One
row per cluster of identical registrations, so the operator with 118,683 copies gets one.
The shelves are uneven because the population is: 41, 12, 171 and 16 rows. Each thin shelf
says so on the page rather than padding.

**On-chain reputation, shown as what it is.** The Reputation Registry is read for every listed
agent. 27 of them carry feedback, 266 entries in total. Each agent page shows the count and
the number of distinct addresses behind it. Never a star, never an average that hides a single
reviewer.

**Compare.** Two to four agents side by side, rung first, then price, rail, whether a payment
has cleared, endpoints, the last probe and its latency, what the record claims against what was
checked. Every shelf row offers a one-click comparison against our own reference agent on that
shelf.

**Nothing renders a zero for a value nobody measured.** It renders `unknown`. That is one CSS
class and one component. It is the whole Data Quality position.

## Hiring

An agent at the payable rung is hired over x402. The endpoint returns HTTP 402 with the
requirements, the buyer signs one EIP-712 message, then the facilitator submits the transfer
and pays the gas. The buyer sends no transaction and needs no BNB. This is what our own agents
return, trimmed. The same JSON travels base64-encoded in a `PAYMENT-REQUIRED` header for
clients that read the x402 v2 transport. The amount is present under both the name Binance's
live Bazaar entries use and the v2 name:

```json
GET https://muster.zkasuran.dev/api/agent/health-factor   -> 402
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "eip3009",
    "network": "eip155:56",
    "asset": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
    "maxAmountRequired": "20000000000000000",
    "amount": "20000000000000000",
    "payTo": "0xcd10D44703D6989290E0A8219f345fA0a5BF4c64",
    "resource": "https://muster.zkasuran.dev/api/agent/health-factor",
    "extra": { "name": "World Liberty Financial USD", "version": "1" }
  }]
}
```

The asset is USD1 and the amount is 0.02 USD1 at 18 decimals. That choice is not a preference.
BSC USDT supports neither EIP-3009 nor EIP-2612, so a one-signature payment in USDT is not
possible on this chain. Of the 989 payment options published in B402 Bazaar, 958 price in
USD1 and 979 use `eip3009`. The EIP-712 domain above was derived and matched against the
token's on-chain `DOMAIN_SEPARATOR`. `GET ...?preview=1` returns the capability contract free,
because a buyer cannot consent to a price without seeing what it buys.

**Muster is its own facilitator.** A presented payment is verified locally: the signature is
recovered over the exact typed data the token would check, the recipient and amount are
matched against the 402, then the nonce and the buyer's balance are read on chain. Only then
does Muster submit `transferWithAuthorization` from its own key, pay the gas and hand over the
work with the transaction hash. Binance's B402 facilitator is the alternate path when a
merchant account exists. The code for it is present and unused. `/hire/<shelf>` walks a
human through the same flow with a browser wallet: it recovers the signer, reads the USD1
balance, shows the envelope and refuses a replayed nonce with a 409.

Stated plainly: the facilitator key holds no BNB at the time of writing, so a valid signature
is answered with "signature valid, settlement unavailable" and the settled rung reads 0. The
status page reports the key's balance live. No row anywhere on the site is marked `settled`
without a payment that actually cleared.

## The four reference agents

The measurement above left every category shelf with no third-party supply payable on BSC.
Rather than ship four shelves nobody can hire from, we operate one reference agent per shelf,
under three conditions that the code enforces rather than promises. They do real work from
live chain reads and carry the block every number was read at. They are payable on the same
public 402 path as any other listing, with no shortcut. They are labelled ours on every row
that renders. The status page counts them separately from third-party supply. No sort
gives them an advantage. They sit at reserved ids 900000001 to 900000004, which every page
says are not registry ids. `tools/register-agents.ts` puts them on the Identity Registry for
real, measured at 180,382 gas each. It runs the moment the key holds gas. The reasoning and
the rejected alternatives are in `docs/decisions/18-the-intersection-is-one-agent.md`.

**Venus Health Factor Watch** reads a borrower's position on Venus, the Comptroller's
`getAccountLiquidity`, each vToken's exchange rate, balance and borrow, plus the oracle price,
then returns the health factor, the collateral weighted by each market's liquidation threshold
so the rows reconcile to the total, plus the uniform price fall that would liquidate it.

**BSC Yield Router** ranks live supply yields from `supplyRatePerBlock` on every Venus market,
compounded at a block time measured from the chain rather than assumed. It names the exact
call and block behind every row.

**PancakeSwap LP Range Check** reads a live PancakeSwap v3 pool, `slot0`, liquidity, fee and
tick spacing, converts the tick to a price through both tokens' decimals, then reports whether a
range is still in range, how far the price sits from each bound and whether to hold, widen or
recentre.

**Grid Ladder Planner** builds a geometric ladder around a live mark price, the level count,
the size per level, the capital each side needs and what to do on a breakout. It refuses bad
inputs with a warning rather than returning a plan.

## Agent Advantage Report

Three real tasks, each run with an agent hired through Muster and again by hand against the
same chain at the same block, with time, cost and the actual outputs attached. It is live at
`/report` and in `docs/AGENT-ADVANTAGE-REPORT.md`. The hired health-factor read took 5.0 s
against 18.8 s over 21 hand calls, both landing on the same factor. The yield task took longer
hired than by hand because the agent walks 55 markets against a hand-picked 5. The report
says so rather than trimming the agent's scope to win. One arm was rerun after a transient RPC
failure and the rerun is recorded in the JSON, not hidden.

## Repository layout

| Path | What it is |
| --- | --- |
| `app/` | Next.js App Router, server rendered, so every page reads with scripting off |
| `lib/` | the store, chain reads, the indexer, the four shelf contracts, the x402 challenge and local verification, settlement, the four agents |
| `worker/` | the sweep, the shelving pass, the Bazaar join, the probe cycle, the feedback sweep |
| `cli/` | deploy, with the two gates it asserts |
| `tools/` | the verification scripts that were run against the live chain, kept as evidence |
| `docs/` | `AS-BUILT.md`, 16 architecture documents, 96 decision records, the research behind every number |
| `DATA-SOURCES.md`, `NOTICE` | the quoted grant behind every third-party input plus the notices that travel with the build |
| `.github/workflows/canary.yml` | fetches every route anonymously every half hour through the judging window and goes red if one stops answering |

```bash
npm install
npm test             # node:test over the registry parser, the 402 builder, local EIP-3009 verification, the classifier and the SSRF guard
npm run check        # typecheck, lint and test together
npm run dev          # http://localhost:3000, MUSTER_DB points at a SQLite file
npm run sweep        # index the registry by id from the counter slot
```

Start with `docs/AS-BUILT.md`, which lists what shipped against the architecture and what did
not. `docs/02-THESIS.md` is the thesis, `docs/15-SYSTEM.md` the system design, and
`docs/14-GAPS-CRITIQUE.md` is our own list of what this build is missing, kept public on
purpose.

## Honesty

Every figure here was measured by us and dated. Anything unverified is labelled unverified
rather than rounded up. Where a source's own documentation disagrees with what we read live,
the live read wins and the disagreement is recorded. B402 Bazaar documents a `quality` block of
call counts and unique payers that is `null` on every live entry, so no usage count from it
appears anywhere on the site. Escrow, the signed ledger chain, receipts and the Altana session
panel did not ship. `docs/AS-BUILT.md` says so line by line.

AI assistance (Claude, Anthropic) was used in building this. The design, the verification and
the decisions are the author's, recorded one per file in `docs/decisions/` so each can be
defended. Nothing here claims a human reviewed code that no human read.

Muster is not affiliated with, endorsed by or partnered with BNB Chain or Binance. It uses BNB
Chain's published brand colours and ships neither party's logo.

## Licence

Our source is Source-Available No-Derivatives 1.0, `LicenseRef-zkasuran-SAND-1.0`, in
`LICENSE`. Run it, read it, benchmark it, publish what you find. Redistribution and derivative
works are withheld. Third-party components keep their own terms, listed in `NOTICE`, with the
clause behind every data source quoted in `DATA-SOURCES.md`.
