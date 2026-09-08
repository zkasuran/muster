# three: the architecture for the BNB Agent Studio marketplace

Third pass on the Build the Era lane. Opened 2026-08-27, rewritten against live
measurement on 2026-09-05. The product is **Muster**. The first two passes
(`../ARCHITECTURE.md`, `../ARCHITECTURE-PART-2.md`, `../ONBOARDING.md`) were
designed before anyone measured the thing they were designing for. This pass starts
from measurement, so it disagrees with them in places. Where it does, this folder
wins and the disagreement is recorded in `decisions/`.

## What the census says

We read the ERC-8004 identity registry on BSC ourselves. **334,935 agents ever
registered** at block 120,027,164 (2026-09-05T02:02:32Z), taken off the registry's
own `_lastId` slot with one storage read because `totalSupply()` reverts. The public
index we enrich from carries 303,461 of them, off a checkpoint 32.6 hours stale. Both
numbers are real. They answer different questions and they sit 31,474 apart.

A uniform sample of 600 ids (splitmix64, seed `20260905`, no `Math.random`
anywhere) says:

- **12 of 600 are machine-callable**, 2.00% with a 95% interval of 1.15 to 3.46.
  All 12 are one product on one host under 12 distinct owner addresses.
- **0 of 600 are payable by a stranger**, 95% interval 0 to 0.64. No sampled
  endpoint answered with a 402 and no sampled agent set a payout wallet.
- 233 declare a concrete endpoint, 230 of those answer, 218 of the answers are a web
  page built for a human.
- **215 of 600 carry a byte-identical tokenURI** decoding to the name `Ave.ai
  Trading Agent`, 35.83% (32.10 to 39.75), spread over 215 distinct owners.
- **1 of 600** matches any of the four mandated categories on a keyword read. Over
  the whole index the four, read at their most generous single term each, come to
  518 agents, 0.17%.

Feedback, swept over all 334,935 ids with no indexer in the path: **4,406 agents
carry any feedback at all** (1.32%), 29,712 rows written by **111 distinct
addresses**, none revoked, the top 100 agents holding 52% of them. Of 950 rows read
for their tags, 844 score a persona trait and not one scores a financial outcome.

So the discoverability problem the programme describes is real but it is not the
problem it looks like. Listing 334,935 agents is easy and worthless. The scarce
thing is an agent a stranger can find, understand, pay and get work back from.
Everything in this folder follows from that.

`research/MEASUREMENT.md` is the evidence, with the command behind every number and
the raw capture behind every command.

## What the measurement pass disproved

The first version of this page carried numbers from the 2026-08-27 pass. Every one
of them moved. They are kept here with their corrections, because a claim that was
quietly deleted is a claim nobody can check.

| Earlier claim | What the measurement found |
| --- | --- |
| 287,029 agents on BSC | **334,935**, at block 120,027,164 with its timestamp attached. The old figure carried no block and no source anyone could re-read |
| 2 of 400 publish a callable endpoint | **12 of 600** reach machine-callable, 2.00% (1.15 to 3.46). **0 of 600** reach payable. 0.50% sits between those two tiers, so the old count measured one of them without saying which. The shape survives, the number does not |
| One of the two is the placeholder `https://api.example-agent.ai/v1` | Placeholders and templates are their own failure mode now rather than a footnote. 51 of 600 publish a literal `{agentId}` with an empty `registrations` array, so no conforming client can call them |
| 166 of 400 share the name `Ave.ai Trading Agent` | Reproduces byte for byte on that pass's own capture, 41.5%. It is stale. The cluster is dense between the 10th and 50th percentile of the id range and thin in the newest fifth, so registry growth dilutes it. Quote **35.83%** with its interval |
| 0 of 400 declare a payout wallet | Right conclusion, wrong mechanism. `getAgentWallet` returns a **non-zero** address for 600 of 600, because `register` writes `msg.sender` into that slot at mint. It equals `ownerOf` for 600 of 600, so `agentWallet != 0` passes the entire registry. The filter with signal is `getAgentWallet(id) != ownerOf(id)`, which matches nothing |
| The reference agent at id 1 has answered 404 since 2026-05-20 | Wrong on every clause but the date |

Id 1 is `ClawNews`, a third-party agent owned by
`0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029`. Nothing marks it as a reference agent.
Ids start at 0 (`$._lastId++` in every `register` overload) and id 0 is `dAi`, so id
1 is the second registration anybody made.

The 404 is one indexer check dated 2026-05-20 rather than a series. That indexer has
not re-checked in 108 days. Read live on 2026-09-05 the endpoint does not 404. DNS
resolves `clawnews.io` to `69.46.46.51` behind a Railway CNAME, `http://clawnews.io`
returns 301 and `https://clawnews.io` fails at TLS, because the served certificate
is `CN = *.up.railway.app` and does not match the hostname. The 404 the indexer
recorded came from the ERC-8004 endpoint-domain verification file rather than from
calling the agent. The same record scores that agent `health_score: 100.0`,
`overall_status: "healthy"`.

Three separate reasons not to trust a health field you did not compute. That is why
liveness is computed in house, stored per endpoint with its DNS, TLS and HTTP
verdict, then shown with the age of the check.

## The documents

Sixteen numbered documents plus two indexes. Each one is self-contained enough to
hand to a reviewer on its own. Each owns its subject outright: where a sibling owns
a subject, the document cites it in a sentence rather than restating it.

| File | What it settles |
| --- | --- |
| `00-PROGRAM.md` | What the programme asks for and how it scores, quoted from the live pages, with everything it withholds named as withheld |
| `01-GROUND-TRUTH.md` | Every external fact we ran the call for ourselves, plus a closing section listing what we could not verify |
| `02-THESIS.md` | What Muster is in one sentence, why a directory of 335k rows loses, the hireable bar every row passes to reach a shelf, the ship line |
| `03-TAXONOMY.md` | The four categories as published contracts, the whole navigation surface, visibility per evidence tier, compare, duplicate collapse |
| `04-AGENT-PROTOCOL.md` | The wire a listing satisfies, the job lifecycle with every terminal state, the error taxonomy, the conformance probes |
| `05-ONBOARDING.md` | Who may list, how an operator proves it, the E0 to E4 ladder, the listing lint, the hard gates that block go-live |
| `06-QUALITY.md` | The signal families, the Muster score as an actual formula, one performance metric per category, anti-gaming, delisting |
| `07-MATCHING.md` | How one intent becomes one settled job: hard constraints, the published ranking weights, the exploration slot, failover |
| `08-MONEY.md` | What a listing may charge, the exact bytes a buyer signs, who pays gas, where our fee comes from without us ever holding a buyer's money |
| `09-DISPUTES.md` | What can be argued on each rail, who decides it, which remedies exist, the first hour of an incident |
| `10-DOCS-AND-POLICY.md` | The published rulebook, the moment a user agrees to it, what a rule change does to a live listing, the licence on every byte |
| `11-BNB-STACK.md` | Every BNB Chain surface Muster reads or writes, the deliberate non-uses, what each choice costs |
| `12-BINANCE.md` | Binance's own products: B402, the Bazaar, BABT, the Web3 Wallet, market data, plus the ones we refuse and why |
| `13-PARTNERS.md` | Four partner tracks off one build, the Agent Advantage Report as a deliverable, the Altana qualification line by line |
| `14-GAPS.md` | The thirty-five areas outside the spine, each with a verdict: ships, ships thin, next or refused |
| `AGENT-ADVANTAGE-REPORT.md` | The TermiX report: three tasks run both ways against the live chain, with both outputs attached, generated by `tools/advantage-report.ts` |
| `15-SYSTEM.md` | What actually runs: components, stored fields, sequences, the four boundaries, the deployment, the build order |
| `decisions/README.md` | The index of decision records, one per material fork, each naming the alternative we rejected and the evidence that settled it |
| `research/README.md` | The index of the research pass: seventeen research files, the census, the payment rail, the spine they all feed |

`decisions/` holds one file per material decision. `research/` holds the captured
sources, the measurement scripts and the raw output they wrote.

## Read in this order

1. **`02-THESIS.md`.** The claim, the gate a row passes to reach a shelf, the
   argument against a prettier directory. Read it first or nothing below has a
   reason for being the shape it is.
2. **`15-SYSTEM.md`.** What runs, what stores what, what is refused, the order it
   gets built in. The thesis says why. This says whether it is buildable by
   2026-09-09 and by whom.
3. `00-PROGRAM.md`, then `01-GROUND-TRUTH.md`. The rules we are scored against, then
   the facts every other document cites. Both are short. Reading them here stops a
   later claim being mistaken for an assumption.
4. `research/MEASUREMENT.md`. The census. Every number on this page comes out of it.
5. `03-TAXONOMY.md`, then `04-AGENT-PROTOCOL.md`. The four category contracts, then
   the wire behind them.
6. `05-ONBOARDING.md`, `06-QUALITY.md`, `07-MATCHING.md`. Supply gets in, gets
   scored, then gets matched to one job.
7. `08-MONEY.md`, then `09-DISPUTES.md`. The rail, then what happens when the rail
   or the job fails.
8. `10-DOCS-AND-POLICY.md`, `11-BNB-STACK.md`, `12-BINANCE.md`, `13-PARTNERS.md`.
   What we publish, then every surface we touch.
9. `14-GAPS.md` last. It is the honest list of what ships thin, what is next and
   what is refused. It reads as a shortfall until the other fifteen have set the
   bar.

`decisions/` and `research/` are reference rather than reading. Open a decision
record when a document surprises you. Open a research file when you want the call
behind a number.

## Standing rules for this lane

- Nothing outward claims a number we have not measured or a fact we have not read
  from source. Verified and unverified are labelled separately, always.
- A constant originates in `research/SPINE.md`, so documents cite it from there
  instead of re-deriving it. `research/VERIFIED-payment-rail.md` outranks every
  research file on the payment rail, because every line of it was run by hand.
- This is a competition entry rather than an upstream contribution, so the outbound
  licence is source-available no-derivatives. The conformance kit and the compliance
  layer are the exception, since both are worth more adopted than withheld. The
  licence section of `10-DOCS-AND-POLICY.md` is the whole rule.
- The repo stays private until the submission stage, then flips public and gets
  checked anonymously.
- AI assistance is disclosed where the programme requires it. The author owns the
  design and has to be able to defend it in a live conversation.
