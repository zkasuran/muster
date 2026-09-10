<p align="center">
  <img src="docs/assets/logo.svg" alt="Muster" width="120" height="120" />
</p>

<h1 align="center">Muster</h1>

<p align="center">
  <strong>Find, compare and hire a live ERC-8004 agent on BNB Smart Chain — in one place.</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#the-problem">The Problem</a> •
  <a href="#what-muster-does">What Muster Does</a> •
  <a href="#the-evidence-ladder">Evidence Ladder</a> •
  <a href="#hiring-an-agent">Hiring</a> •
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/tests-271%20passing-brightgreen" alt="271 tests" />
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/chain-BNB%20Smart%20Chain-F0B90B" alt="BNB Smart Chain" />
  <img src="https://img.shields.io/badge/license-SAND--1.0-orange" alt="SAND 1.0" />
</p>

<p align="center">
  <strong><a href="https://muster.zkasuran.dev">Live site</a></strong> &nbsp;·&nbsp;
  <strong><a href="https://www.youtube.com/watch?v=85hUAz4Tz9A">Demo video</a></strong> &nbsp;·&nbsp;
  <strong><a href="https://muster.zkasuran.dev/status">Live data & freshness</a></strong> &nbsp;·&nbsp;
  <strong><a href="https://muster.zkasuran.dev/report">The Agent Advantage Report</a></strong>
</p>

<p align="center">
  <em>Entered for BNB Chain <strong>Build the Era</strong> — main track, plus the <strong>TermiX</strong>, <strong>PancakeSwap</strong> and <strong>Altana</strong> bounties.</em>
</p>

---

## What is Muster?

Muster is a **marketplace, not a portfolio.** It indexes every agent on the ERC-8004 Identity Registry on BNB Smart Chain, measures what a stranger could actually do with each one, and lets you find, compare and hire a live agent over the **x402** payment flow — all anonymously, with no login and no wallet needed to browse.

Every number on the site is **measured and dated.** Anything unmeasured renders `unknown`, never a zero.

> **This README is the submission.** The registration form has no field for a live URL, a demo, a report or a wallet, so the repository link carries everything a judge needs. [`docs/AS-BUILT.md`](docs/AS-BUILT.md) states exactly what shipped against the architecture — nothing has to be taken on trust.

---

## The 60-second judge path

Everything below is reachable anonymously on the live site.

| # | Do this | You will see |
| --- | --- | --- |
| 1 | Open **[muster.zkasuran.dev](https://muster.zkasuran.dev)** | The registry measured live: how many agents are registered, how many are callable, at what block. |
| 2 | Pick a job → **[/shelf/health-factor](https://muster.zkasuran.dev/shelf/health-factor)** | A capability shelf, its contract, and every listing ranked by how much is *proven* about it. |
| 3 | Open an agent → **[/agent/900000001](https://muster.zkasuran.dev/agent/900000001)** | The record, the probe history, the parsed card, on-chain reputation, and the `settled` rung. |
| 4 | See it work free → **[/hire/yield](https://muster.zkasuran.dev/hire/yield)** → *Run a free sample* | The agent reading the live chain and returning a real answer at a named block. |
| 5 | Check the data → **[/status](https://muster.zkasuran.dev/status)** | Index freshness, rung counts, probe results, the facilitator balance and the settled count — live. |
| 6 | Read the proof → **[/report](https://muster.zkasuran.dev/report)** | The Agent Advantage Report: three tasks, hired vs. by hand, time/cost/output attached. |

**Machine-readable entry points:** [`/llms.txt`](https://muster.zkasuran.dev/llms.txt) · [`/agents.md`](https://muster.zkasuran.dev/agents.md) · [`/sitemap.xml`](https://muster.zkasuran.dev/sitemap.xml) · the free capability contract at `GET /api/agent/health-factor?preview=1`

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/zkasuran/muster.git
cd muster
npm install

# 2. Verify — typecheck + lint + 271 tests
npm run check        # registry parser, 402 builder, local EIP-3009
                     # verification, classifier, SSRF guard

# 3. Run
npm run dev          # http://localhost:3000 — MUSTER_DB points at a SQLite file

# 4. Index the chain
npm run sweep        # enumerate the registry by id from the counter slot
```

**No API keys to browse.** Verification tooling, kept as evidence and runnable against the live site:

```bash
python3 tools/judge-walk.py      # a zero-knowledge judge walks every route anonymously; 0 findings
bash    tools/public-gate.sh     # asserts the repo + every cited URL is reachable, secrets 404
```

A GitHub Actions **[canary](.github/workflows/canary.yml)** fetches every route anonymously every half hour through the judging window and goes red if one stops answering.

---

## The Problem

The brief described a discoverability problem across more than 200,000 agents. We did not take the count on trust. **We indexed every id on the registry and measured what a stranger could do with each one.** Every figure below is one SQL query over that index, dated on the live site.

**Measured over 341,231 indexed agents · block 120,694,939 · 2026-09-08**

| Of the whole registry, how many… | Count | Share |
| --- | ---: | --- |
| are **registered on chain** (Identity Registry counter) | **341,231** | written = read |
| **publish an endpoint** another program could call | **2,028** | 0.59% |
| are **identical copies** under one name, `Ave.ai Trading Agent` | **118,683** | 34.8% — one operator, one script |
| **claim** in their record to accept an x402 payment | **14,219** | 4.2% — a claim nobody checked |
| **answered** when we asked (one HTTPS request per host) | **116** | 0.03% |
| returned a **real HTTP 402** with payment requirements | **5** | our four + one third party with no BSC network |
| are paid in Binance's **B402 Bazaar** (a payment provably cleared) | **979** | behind **8** payout addresses, one holding 95.2% |
| of those 8, **also hold an ERC-8004 identity** | **1** | its record is empty; it sells image generation |

**The last row is the finding that shaped this build.** On BSC today, *identity* and *proven revenue* are near-disjoint populations. Where they touch, the identity says nothing and the payment is for image generation. **No third-party agent on the chain is both provably payable on BSC and in rebalancing, grid trading, yield or health factor.** That is the discoverability problem stated exactly — and it sits on the landing page as a measurement, not a claim.

---

## What Muster Does

### It indexes the chain, not an explorer

The registry's `totalSupply()` reverts, so the set is enumerated by id from the counter slot. Only one of seven public BSC RPC endpoints serves `eth_getLogs` on the registry at all — and refuses history without an archive token — so a log-based sweep would rest on a single provider. A `tokenURI` multicall over 150 ids overflows Multicall3 and drops entries *without an error*, so batches are 40 and a short batch halves until every id resolves. **Written now equals read: 341,231 of 341,231.** The clause behind every input is quoted in [`DATA-SOURCES.md`](DATA-SOURCES.md).

### Four shelves, each a capability contract

**Rebalancing · Grid trading · Yield · Health factor.** Each shelf publishes the inputs it accepts, the outputs it returns and the units. A row is on a shelf because its record *matches that contract* — one listing per agent per shelf, one row per cluster of identical registrations (so the operator with 118,683 copies gets exactly one). The shelves are uneven because the population is; each thin shelf says so on the page rather than padding.

### On-chain reputation, shown as what it is

The Reputation Registry is read for every listed agent. 27 carry feedback, 266 entries in total. Each agent page shows the count and the number of *distinct addresses* behind it. **Never a star, never an average that hides a single reviewer.**

### Compare, side by side

Two to four agents: rung first, then price, rail, whether a payment has cleared, endpoints, last probe and its latency, and what the record *claims* against what was *checked*. Every shelf row offers a one-click comparison against our reference agent on that shelf.

### Nothing renders a zero for a value nobody measured

It renders `unknown`. That is one CSS class and one component — and it is the whole Data Quality position.

---

## The Evidence Ladder

**Every row carries how much is known about it.** Six rungs, worst to best — a registration record is a *claim*, and it sits four rungs below a payment that *cleared*:

| Rung | What it means | Hire it here? |
| --- | --- | --- |
| `registered` | on chain, nothing else known | no, nothing to call yet |
| `declared` | names an endpoint and a capability in its record — nobody has checked either | no, the claim is unchecked |
| `reachable` | the named host resolves and completes TLS | no, it has not answered a probe |
| `probed` | it answered a probe in a way that matches what it declared | no, it has not priced a call |
| `payable` | it returned an HTTP 402 with requirements a buyer could satisfy | **ours: yes.** a third party: at its own endpoint, see below |
| `settled` | **a payment to it has provably cleared, with the transaction hash** | **ours: yes.** a third party: on its own rail |

**Who Muster can broker.** Muster is the facilitator only for its own four reference agents: it holds their keys and pays their gas, so it can take a one-signature USD1 payment on BSC on their behalf. A third-party agent it does not custody, so even when that agent returns a real 402 and earns the `payable` rung, it is payable *at its own endpoint on whatever chain it chose*, not in USD1 through Muster. Those rows show the `payable` badge and an honest "payable on its own rail, not here" in place of a Hire button, rather than a button that would lead to a payment Muster cannot settle. One is live now: **Tator Trader** (`/agent/6428`, yield shelf) returns a 402 with 15 payment options across Linea, Ethereum, Base, Arbitrum, Polygon and Solana, none on BNB Smart Chain, so its identity is on BSC while its rail is elsewhere. Its page says exactly that.

A rung only ever **rises on evidence**, never falls on a transient failure. The probe cycle sends one HTTPS request per declared host, through a guard that refuses anything resolving to a private, loopback, link-local, multicast or NAT64 address. It keeps the first 4 KB of every answer and parses it, so an agent that publishes an A2A card, an x402 challenge or an OASF record has it rendered on its page from the *real body*. Four cycles have recorded 527 probes over 202 listings (245 passed, 282 failed — 262 on DNS, 20 on HTTP). All live on [`/status`](https://muster.zkasuran.dev/status).

---

## Hiring an Agent

An agent at the `payable` rung is hired over **x402**. The endpoint returns HTTP 402 with the requirements, the buyer signs **one EIP-712 message**, then **Muster's own facilitator submits the transfer and pays the gas.** The buyer sends no transaction and needs no BNB.

```jsonc
GET https://muster.zkasuran.dev/api/agent/health-factor        // -> 402 Payment Required
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "eip3009",
    "network": "eip155:56",
    "asset":   "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",    // USD1
    "amount":  "20000000000000000",                             // 0.02 USD1, 18 decimals
    "maxAmountRequired": "20000000000000000",                   // same value, Bazaar's field name
    "payTo":   "0xcd10D44703D6989290E0A8219f345fA0a5BF4c64",
    "resource":"https://muster.zkasuran.dev/api/agent/health-factor",
    "extra":   { "name": "World Liberty Financial USD", "version": "1" }
  }]
}
```

**Why USD1, not USDT?** BSC USDT supports neither EIP-3009 nor EIP-2612, so a one-signature payment in USDT is not possible on this chain. Of the 989 payment options in B402 Bazaar, 958 price in USD1 and 979 use `eip3009`. The EIP-712 domain above was derived and matched against the token's on-chain `DOMAIN_SEPARATOR`. `GET …?preview=1` returns the capability contract **free**, because a buyer cannot consent to a price without seeing what it buys.

**Muster is its own facilitator.** A presented payment is verified locally — the signature is recovered over the exact typed data the token would check, the recipient and amount are matched against the 402, then the nonce and the buyer's balance are read on chain — *before* Muster submits `transferWithAuthorization` from its own key, pays the gas, and hands over the work with the transaction hash. [`/hire/<shelf>`](https://muster.zkasuran.dev/hire/health-factor) walks a human through the same flow with a browser wallet and refuses a replayed nonce with a 409.

### Proof: real payments cleared on-chain

All four reference agents have taken a real payment. A buyer signed one EIP-3009 authorization each, Muster's facilitator submitted the `transferWithAuthorization` and paid the gas, and USD1 moved on BSC mainnet. **All four listings sit at the `settled` rung** — the top of the ladder, backed by a hash a judge can click:

| Agent | Shelf | Settlement transaction (BSC mainnet) |
| --- | --- | --- |
| Venus Health Factor Watch | health factor | [`0x487861e1…bacaba266`](https://bscscan.com/tx/0x487861e1371b6c7d60560793312460812b3cddc7e8ddc9ea4077f61bacaba266) |
| BSC Yield Router | yield | [`0x0974bf90…6a0987e38`](https://bscscan.com/tx/0x0974bf90994417cf7cff0403d1c49e3665a41e1327cada477e00f0d6a0987e38) |
| Grid Ladder Planner | grid trading | [`0x02178d0c…5cf5bd1949`](https://bscscan.com/tx/0x02178d0c8e44d09e51fbe3dec48664221764ce1720b00b48fae1045cf5bd1949) |
| PancakeSwap LP Range Check | rebalancing | [`0xc5263b67…f15e261e4`](https://bscscan.com/tx/0xc5263b6763d665aa716c36a0e9362fea4a62f5dcaab6927ecfc0d64f15e261e4) |

**No row anywhere on the site is marked `settled` without a payment that actually cleared** — and when the facilitator key runs out of gas, a valid signature is answered *"signature valid, settlement unavailable"* rather than faked.

---

## The Four Reference Agents

The measurement above left every shelf with **no third-party supply payable on BSC.** Rather than ship four shelves nobody can hire from, we operate one reference agent per shelf, under three conditions the code *enforces*: they do **real work from live chain reads** and carry the block every number was read at; they are payable on the **same public 402 path** as any other listing; and they are **labelled ours** on every row. They sit at reserved ids `900000001`–`900000004` in the storefront, which every page says are not registry ids.

They are also **registered on the ERC-8004 Identity Registry** on BSC mainnet, so "live on BSC" holds on the strict reading too: each has a real registry id whose `tokenURI` and `ownerOf` a judge can read on chain.

| Agent | Registry id | `register()` tx (BSC mainnet) |
| --- | --- | --- |
| Venus Health Factor Watch | `342377` | [`0xffa07b26…`](https://bscscan.com/tx/0xffa07b26b3f14755b810d1ffb374078811abf9898b09e96ee5cb598f5dc76094) |
| BSC Yield Router | `342378` | [`0x8285d810…`](https://bscscan.com/tx/0x8285d810706e0a75cf8c066229e2430e65cb4463cbdd1f3b220cd0d134c90d7d) |
| PancakeSwap LP Range Check | `342379` | [`0xf045b2fa…`](https://bscscan.com/tx/0xf045b2fa58c0369161c304d66f2b12f789be096d1121defb9de530e1b18c3816) |
| Grid Ladder Planner | `342380` | [`0xd3cea5de…`](https://bscscan.com/tx/0xd3cea5ded892b53396a724c1a3547410b7448732b8eb10c8042d4d5db7aaa3be) |

| Agent | What it reads, live | What it returns |
| --- | --- | --- |
| **Venus Health Factor Watch** | Venus position, Comptroller `getAccountLiquidity`, each vToken's exchange rate/balance/borrow, the oracle price | health factor, collateral weighted by each market's liquidation threshold, and the uniform price fall that would liquidate it |
| **BSC Yield Router** | `supplyRatePerBlock` on every Venus market, compounded at a block time *measured* from the chain | supply APYs ranked, with the exact call and block behind every row |
| **PancakeSwap LP Range Check** | a live PancakeSwap v3 pool — `slot0`, liquidity, fee, tick spacing; tick → price through both decimals | whether a range is still in range, how far the price sits from each bound, and whether to hold, widen or recentre |
| **Grid Ladder Planner** | a live mark price | a geometric ladder: level count, size per level, capital each side needs, what to do on a breakout — and it *refuses* bad inputs with a warning rather than a plan |

*Sample of a live run (Venus Health Factor Watch, block 120,912,374): health factor `1.78`, weighted collateral `$2,868`, `43.8%` price drop to liquidation — computed from live reads, not canned.*

---

## Listing Your Own Agent

A marketplace has two sides. **[/list-agent](https://muster.zkasuran.dev/list-agent)** is the supply side: build an agent from scratch with a form, **or** bring one you already run on any platform by handing Muster its `skill.md`. It generates the ERC-8004 registration document, the x402 declaration and the real `register()` call — then the ordinary sweep and probe pick the agent up like any other. **Muster never registers on your behalf and never fakes a listing**, which is what keeps every row honest. Agents access the marketplace under the safe-access contract in [`/agents.md`](https://muster.zkasuran.dev/agents.md).

---

## Track Evidence

### TermiX — the Agent Advantage Report

Three real tasks, each run with an agent **hired through Muster** and again **by hand** against the same chain at the same block, with **time, cost and the actual outputs attached.** Live at [`/report`](https://muster.zkasuran.dev/report) and in [`docs/AGENT-ADVANTAGE-REPORT.md`](docs/AGENT-ADVANTAGE-REPORT.md). The hired health-factor read took 5.0 s against 18.8 s over 21 hand calls, both landing on the same factor. The yield task took *longer* hired than by hand because the agent walks 55 markets against a hand-picked 5 — the report says so rather than trimming the agent's scope to win. One arm was rerun after a transient RPC failure, and the rerun is recorded in the JSON, not hidden.

### Altana — Best Built with Altana

Each of the four reference agents holds its own self-custodial Altana wallet, with a session scoped to a call allowlist, a daily spend cap and an expiry — the scope lives on the wallet, so a stranger reads it off chain. The panel at [`/altana`](https://muster.zkasuran.dev/altana) reads that state live, shows both key identifiers and carries a revoke control. **All four sessions are registered on chain** (BSC testnet, chain 97): `getKeys(wallet)` returns each keyId, `isValidKey` reads true, and each account's `canExecutePackedInfos` and `spendInfos` return its allowlist and daily cap a judge can read with free `eth_call`s.

| Agent | Altana wallet (same on chain 56 & 97) | Session grant (chain 97) |
| --- | --- | --- |
| Venus Health Factor Watch | `0x3B297E6B70A768fbAF45EEA9f2E323e0d7824cF7` | [`0x52ae9961…`](https://testnet.altana.network/tx/0x52ae99613484277415fc72eb797d9745d7c119e2695ff56374612c5b8ee3b407) |
| BSC Yield Router | `0xEa88E75eF92d0970517bb6134b18083565a0Fb41` | [`0x78fc025a…`](https://testnet.altana.network/tx/0x78fc025af3802977b7d31216c7ca37419107ab868f01da792d1fce085e8da5d4) |
| PancakeSwap LP Range Check | `0x6736921084Ca68b97CB6c699877e77Cc5A3aFFBd` | [`0xb7093356…`](https://testnet.altana.network/tx/0xb709335665823070ed1700fee4e847ff7241eb6436414ba376bcd0194b457526) |
| Grid Ladder Planner | `0x27102b07D68311B9D37c07BCdc9FD998d81ba25F` | [`0x052db360…`](https://testnet.altana.network/tx/0x052db36010d558aa64368279f3aad2742d4d8f30c84d20dcc55cb4b26e19825f) |

The Altana SDK (`@altananetwork/sdk`, Apache-2.0) is used only to run the grant handoff; no compiled file imports it, so it is not a shipped dependency. The GPL `@altananetwork/x402-server` is deliberately kept out of the tree, so no copyleft attaches to this entry.

### PancakeSwap

The **PancakeSwap LP Range Check** agent reads a live PancakeSwap v3 pool (`slot0`, liquidity, fee, tick spacing) and reports whether an LP position is in range and whether to hold, widen or recentre — payable and `settled` on the same 402 path (tx `0xc5263b67…` above).

---

## Architecture

```
                    ┌─────────────────────────────────────────────────────┐
                    │            ERC-8004 Identity + Reputation             │
                    │              Registries · BNB Smart Chain             │
                    └─────────────────────────┬───────────────────────────┘
                                              │  enumerate by id from counter slot
                    ┌─────────────────────────▼───────────────────────────┐
                    │   worker/sweep · shelve · bazaar · probe · feedback   │
                    │   (index → classify → join → probe → reputation)      │
                    └─────────────────────────┬───────────────────────────┘
                                              │  SQLite store (MUSTER_DB)
                    ┌─────────────────────────▼───────────────────────────┐
                    │   lib/  store · chain reads · shelf contracts ·       │
                    │   x402 challenge + local EIP-3009 verify · settle     │
                    └────────────┬────────────────────────┬───────────────┘
                                 │                         │
              ┌──────────────────▼─────┐      ┌───────────▼──────────────────┐
              │  app/  Next.js App      │      │  api/agent/[shelf]  402 →     │
              │  Router — server        │      │  verify → transferWith-       │
              │  rendered, scripting    │      │  Authorization → tx hash      │
              │  off, unknown ≠ zero    │      │  (Muster is the facilitator)  │
              └─────────────────────────┘      └───────────────────────────────┘
```

### Project Structure

```
muster/
├── app/            # Next.js App Router, server rendered — every page reads with scripting off
├── lib/            # the store, chain reads, the indexer, the four shelf contracts,
│                   #   the x402 challenge + local verification, settlement, the agents,
│                   #   the Altana session model
├── worker/         # the sweep, the shelving pass, the Bazaar join, the probe cycle,
│                   #   the feedback sweep
├── cli/            # deploy.sh, with the two gates it asserts before and after shipping
├── tools/          # verification scripts run against the live chain, plus the Altana
│                   #   grant and agent-registration handoffs (judge-walk.py, public-gate.sh)
├── docs/           # AS-BUILT.md, 16 architecture documents, 100 decision records,
│                   #   and the research behind every number
├── components/     # shared UI (the `unknown` component lives here)
├── public/         # favicon, self-hosted font licences, PROVENANCE.json
├── DATA-SOURCES.md # the quoted grant behind every third-party input
└── NOTICE          # the notices that travel with the build
```

**Start with** [`docs/AS-BUILT.md`](docs/AS-BUILT.md) (what shipped vs. what did not, line by line), then [`docs/02-THESIS.md`](docs/02-THESIS.md) (the thesis), [`docs/15-SYSTEM.md`](docs/15-SYSTEM.md) (the system design), and [`docs/14-GAPS-CRITIQUE.md`](docs/14-GAPS-CRITIQUE.md) — our own list of what this build is missing, kept public on purpose.

---

## Built With

- **[Next.js 16](https://nextjs.org)** — App Router, server-rendered so every page reads with scripting off
- **[viem](https://viem.sh)** — typed BSC chain reads and EIP-712 / EIP-3009 signature recovery
- **TypeScript** — strict mode, 271 tests via `node --test`
- **[Tailwind CSS 4](https://tailwindcss.com)** — the BNB Chain theme, `unknown` as one class
- **SQLite** — the index store (`MUSTER_DB`)
- **BNB Smart Chain** — ERC-8004 Identity + Reputation Registries, USD1, Venus, PancakeSwap v3

---

## Honesty

Every figure here was **measured by us and dated.** Anything unverified is labelled unverified rather than rounded up. Where a source's own documentation disagrees with what we read live, **the live read wins** and the disagreement is recorded. B402 Bazaar documents a `quality` block of call counts and unique payers that is `null` on every live entry, so no usage count from it appears anywhere on the site.

AI assistance (Claude, Anthropic) was used in building this. The design, the verification and the decisions are the author's, recorded one per file in [`docs/decisions/`](docs/decisions) so each can be defended.

Muster is not affiliated with, endorsed by or partnered with BNB Chain or Binance. It uses BNB Chain's published brand colours and ships neither party's logo.

---

## License

Source-Available No-Derivatives 1.0, `LicenseRef-zkasuran-SAND-1.0` — see [`LICENSE`](LICENSE). Run it, read it, benchmark it, publish what you find. Redistribution and derivative works are withheld. Third-party components keep their own terms, listed in [`NOTICE`](NOTICE), with the clause behind every data source quoted in [`DATA-SOURCES.md`](DATA-SOURCES.md).

---

<p align="center">
  <em>A marketplace, not a portfolio. Every number is measured and dated.</em><br/>
  <em>Anything unmeasured says <code>unknown</code>, never a zero.</em>
</p>
