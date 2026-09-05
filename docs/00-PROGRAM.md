# 00-PROGRAM: what the programme asks for and how it scores

Read from the live pages on 2026-09-05. The two sources are the hackathon page,
`https://www.bnbchain.org/en/hackathons/smart-money-era`, plus the launch blog,
`https://www.bnbchain.org/en/blog/build-the-era-build-the-official-bnb-agent-studio-marketplace`.
Local captures sit in `research/raw/bnb-smart-money-era-2026-09-05.html`,
`research/raw/bnb-hackathon-page-2026-09-05.txt` and `research/raw/launch-blog-2026-08-27.html`.

Everything quoted below is quoted. Everything the programme withholds is named as withheld. No
document in this set may assume a fact that this file does not carry.

## The ask

The programme is BNB Chain's **Build the Era / Smart Money Era** hackathon. The main track is to
build the official BNB Agent Studio marketplace: the venue where a stranger finds an ERC-8004 agent
on BSC, understands it, compares it and hires it.

It is not a portfolio of agents. The programme says so in its own words on the TermiX section of the
same page: "The submission is the marketplace itself." The gap it names is discoverability, because
"hiring one today means digging through X threads and GitHub repos".

Read for the shape of the socket rather than the pitch: BNB Agent Studio ships a wallet, an LLM
aggregator, ERC-8004 identity registration, an ERC-8183 task interface, a cloud runtime and the `bag`
CLI. It ships **no marketplace, no discovery page, no listing flow, no indexer and no storefront
spec**. That absence was verified across the Studio product page and the whole nine-page Studio
developer kit (`R14-rivals.md`). The demand side is the empty half.

## Dates

| Stage | What the page says | Date |
| --- | --- | --- |
| Build | "Build: NOW!" | closes **2026-09-09 UTC+0** |
| Judging | submissions assessed | 2026-09-09 to 2026-09-23 |
| Shortlist | the top 3 are named publicly | inside the judging window |
| Phase 2 | printed as `Phase 2: [REDACTED]` | unpublished |
| Winner announced | | **2026-11-05** |

**No time of day is published for the close.** Treat 2026-09-09 00:00 UTC as the deadline and have
everything green before 2026-09-08 ends. That reading is a decision, not a quotation.

The judging window is a hard product constraint, not a formality. The submission must be functional
and publicly accessible for the whole of 2026-09-09 to 2026-09-23.

## The main rubric

Three criteria. **Three judges score independently then compare.** Quoted verbatim from the live
page:

**Functionality.** "The full journey works end to end: land, find an agent by category, understand
what it does, activate it, with minimal friction. Someone with zero Agent Studio knowledge should be
able to get through it without hitting a dead end."

**Data Quality.** "Real-time, accurate data that goes beyond basic counts. A user should be able to
look at what you are showing and make a genuinely informed call on which agent to hire."

**Agent Diversity.** "All four categories (rebalancing, grid trading, yield, health factor) surfaced
with equal depth." The same page adds: "Single-category submissions score poorly. All four, equally
deep, is the bar."

### The weights are not published

The rubric table on the live page carries a **Weight** column and that column is **empty**. There is
no number in it for any of the three criteria.

So: **no document in this set may state, imply or design against a weighting.** Not "Functionality
is the biggest", not "a third each", not "weighted toward Data Quality". A design that only holds
under one guess about the weights is a design that loses under the other two.

The rubric was checked live on 2026-09-05 against the 2026-08-27 capture. The three criteria are
unchanged and the Weight column is still empty.

### More criteria are withheld

The page states that further criteria arrive in a second phase. The sentence carries a typo in the
original, so it is reproduced as written: "We'all also assess more criterias in the second phase."
The timeline entry for that phase reads `[REDACTED]`.

Consequence for the build: nothing can be optimised for phase 2, so the only defence is a submission
that is complete rather than tuned. What we do know is that Phase 2 exists, that it applies to the
main rubric and that the TermiX table carries no equivalent line, so whether it reweights the partner
tracks is **unverified**.

## The four mandated categories

Exactly four: **rebalancing, grid trading, yield, health factor**. All four, at equal depth.

One trap, verified. The launch blog lists a different four: "Monitoring agents", "Grid trading
agents", "Health factor agents", "Yield agents". The blog itself calls them "guidance, not a
definitive list or judging criteria". The **live rubric page replaced monitoring with rebalancing and
made all four mandatory**. Build against the rubric page's four. Monitoring is not one of them.

## Eligibility

| Rule | As published |
| --- | --- |
| Who may enter | open globally, individuals or teams |
| How many entries | **one entry per team** |
| Availability | the submission must be functional and publicly accessible during judging |
| The agents | agents surfaced on the marketplace **must be live on BSC** |
| Prize stacking | "taking first place doesn't rule you out of partner track prizes, and one build can win both" |

"Publicly accessible" has to be checked the way a judge sees it, from a clean anonymous session,
never from our own logged-in browser or an authenticated API call. Our own credentials pass either
way, so they prove nothing.

## Prizes and what each one requires

### Main track

**$30,000 USDT**, plus official adoption as the BNB Agent Studio marketplace.

Adoption is stated conditionally and the wording matters, so it is quoted rather than paraphrased.
The blog says the winning marketplace is "**in line to** become the officially adopted community
marketplace" and its own summary says the winner "has the chance to become" it. Adoption is described
as BNB Chain backing it "as a standalone product with its own brand and team".

That last phrase is the only hint in the whole programme about what happens after judging. A product
with its own brand and team implies a business, which matters because no rival among the fifteen builds
read closely has a revenue design at all (`R14-rivals.md`). That is a sample and not a census: 206 public
repositories is a floor on public builds and says nothing about private ones.

### TermiX Challenge

**$10,000 USDT**: first $6,000, second $3,000, third $1,000.

This is **the only fully weighted rubric anywhere in the programme**. Quoted from the live page, with
the phrasing TermiX's own campaign page uses beside it:

| Weight | The page's label | What great looks like, quoted |
| --- | --- | --- |
| **30%** | Value of the services | "Real working agents at a price and speed that beat the alternative. TermiX will hire from your marketplace and evaluate the results." |
| **30%** | Proven agent advantage | "Measured, not asserted, backed by the required Agent Advantage Report." |
| **20%** | High-stakes categories and track record | "Trading, stock/equities and security agents weighted above general-purpose. Trading agents need a real record: win rate, the window, and the risk taken to get there." |
| **20%** | Marketplace quality | "Find, compare, hire, without instructions." |

Three more sentences from the same section decide how the build is shaped:

- "You are not asked to integrate anything with TermiX. The submission is the marketplace itself,
  judged on whether the agents on it are genuinely worth paying for."
- "TermiX will hire from your marketplace themselves and see what comes back."
- "The 'Proven agent advantage' criterion (30%) is scored against this report, so plan for it from
  day one."

**The Agent Advantage Report is an eligibility gate, not a bonus.** The page: "Submissions must
include the required Agent Advantage Report to be eligible." Its published spec is four
requirements: at least **3 real tasks**, each run **both ways** (an agent hired through the
marketplace against doing it without one), reporting **time, cost and output quality**, with **the
actual outputs attached**, plus **at least one task from trading, stock or security**.

Read 30% plus 30% together: 60% of this track is one thing measured twice, once by them hiring us and
once by us reporting. A report claiming a large win against a live agent that fails when they hire it
is worse than no report, because the mismatch becomes evidence against every other number in the
submission.

### Best Built with Altana

**50,000 Altana XP**, winner takes all, one team. The page adds "(Allocation mechanics to be
confirmed.)", so what the XP resolves to is **unverified**.

Five requirements, all five required, quoted from the Tracks tab:

1. Agents on their own Altana wallets.
2. Sessions with real limits: a call allowlist, a spend cap and an expiry.
3. Sessions registered in Keystore, "so integration is read onchain rather than from the pitch".
4. Real onchain transactions through a session key. "Testnet counts, mainnet is stronger."
5. User-facing control: a user can see what their agent may do, and revoke it, inside the product.

Two prize gates on top: "your submission must show live onchain transactions in the Altana explorer
(testnet or mainnet)" and "make sure you include your wallet address(es) in your submission".

Two bonuses: hiring BNB Agent Studio agents through **ERC-8183** using the Altana ERC-8183 SDK, then
selling over **x402 or B402** using the x402 server SDK.

Every one of the five is a chain read a judge can run without our help, which is the point of
requirement 3. `01-GROUND-TRUTH.md` carries the addresses and the exact calls.

### PancakeSwap

**1,000 CAKE.** No separate rubric is published for this track on the page.

### AltLayer

**8004scan Pro tier plus AltLLM credits.** Amounts are published as to be confirmed.

The Pro-tier grant is a real, live form at `https://forms.gle/jQevEPCAacBXaKG79`, titled "Build the
Era Hackathon x 8004scan Pro-Tier Upgrade", promising "up to 500 API requests per minute and 100,000
requests per day" to approved participants. It requires an 8004scan account created with a wallet the
entrant controls. Worth filing for the track, worth nothing for throughput: a self-service 8004scan
key already measures 600 requests per minute and 100,000 per day (`R05-8004scan-api.md`).

## Published against withheld

The line between these two columns is the single most useful thing on this page for the fourteen
documents, because everything on the right is something a document must label unverified.

| Published | Withheld |
| --- | --- |
| the three main criteria and their descriptions | **every weight in the main rubric** |
| the four mandated categories | the phase 2 criteria, printed `[REDACTED]` |
| that three judges score independently then compare | who the judges are |
| the build close date, 2026-09-09 | the time of day it closes |
| the judging window, Sep 9 to 23 | how the shortlist is chosen from the entries |
| that the top 3 are named publicly | whether the repo is read at all, as opposed to the running site |
| the winner date, 2026-11-05 | what adoption commits BNB Chain to beyond backing a standalone product |
| the TermiX rubric at 30/30/20/20 | whether phase 2 reweights the partner tracks |
| the Agent Advantage Report spec | where the report is filed, plus whether TermiX pays for its hire |
| the five Altana requirements and two bonuses | how 50,000 XP is allocated |
| the prize amounts for the main track and TermiX | the AltLayer amounts |
| that entries stack across tracks | the number of entries received |

No public roster of entries exists. The hackathon page publishes no project list, no participant
count and no shortlist. Four searches across the usual hackathon hosts returned zero entry
listings (`R14-rivals.md`). The 206 public rival repositories found by GitHub search are a floor on
public builds and say nothing about private ones.

## The submission surface

Entry is a Google Form: `https://forms.gle/9g9XPNFwnYaHAz9L8`. It is the only submission channel
published, which is why the Agent Advantage Report ships as a public URL inside the submission and
as a file in the repo, so either reading works.

What the submission has to carry, assembled from the eligibility rules and the partner gates:

- a live public URL that needs no login and stays up through 2026-09-23
- every URL it cites resolving to 200 for an anonymous fetch, including raw and blob links
- the four categories filled with agents live on BSC
- the Agent Advantage Report. Without it the TermiX track is not eligible
- every Altana wallet address, not just one
- the repo, public, with its licence and its third-party attributions in the bytes

## What is not asked for

Two absences worth stating, because a document may otherwise assume the opposite.

**No TermiX integration is required.** The track is scored on the marketplace, not on a connector.

**Nothing on either page states an AI-disclosure rule.** That absence was checked on both the
hackathon page and the launch blog. The entry discloses AI assistance anyway, in the submission and
in the public repository README, because an undisclosed assist is not a risk worth carrying for the
size of the prize. `10-DOCS-AND-POLICY.md` owns the wording.

## What downstream documents may and may not assume

**May.** Every quotation on this page. The four categories. The dates. The eligibility rules. The
TermiX weights, because those are published. The five Altana requirements. That the judging window
is an uptime requirement.

**May not.** Any main-rubric weighting. Any guess at phase 2. That judges read code. That a testnet
demonstration scores as well as mainnet anywhere except where Altana says testnet counts. That the
prize amounts for AltLayer are known. That a rival count is known.
