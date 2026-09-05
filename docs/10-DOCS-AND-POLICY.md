# 10-DOCS-AND-POLICY: the published rulebook, the docs a stranger builds from, the licence

Muster's rules are decided elsewhere. `05-ONBOARDING.md` decides who may list, `06-QUALITY.md` decides
the score, `07-MATCHING.md` decides who wins a job, `08-MONEY.md` decides the rail and the fee,
`09-DISPUTES.md` decides what can be argued. This document publishes them. It settles which document a
buyer or an operator actually agrees to, the moment they agree, what a rule change does to a listing
that is already live, what has to sit on a public URL before a stranger can integrate without asking us
anything, what we disclose about ourselves, then the licence on every byte we ship plus every byte we
took from somebody else.

The bar here is low and the field has not cleared it. TermiX runs an agent-hiring marketplace with
on-chain escrow on this chain and publishes no terms at all: `/terms`, `/legal/terms` plus `/privacy`
all return 404, with no financial-advice disclaimer on the home page or in its 1.5.0 skill
documentation (`R15-compliance.md`). 8004scan's OpenAPI `info` object at backend `0.4.363` carries no
`termsOfService`, no `license` and no `contact`, its `/terms` 404s plus every other legal path 307s to a
redirect stub (`R15-compliance.md`). Fifteen rival READMEs carry no take rate, no fee split plus no
operator or referral cut, which is the whole of the money design (`R14-rivals.md`). The missing terms are
those two 404 sets rather than a third source. `R14-rivals.md` says nothing about a policy set either way,
so the terms evidence is the paragraph above it. So a published rulebook with hashes, a changelog plus a
quotable grant per third-party input is not table stakes on this programme. It is the cheapest visible answer to
**marketplace quality**, "Find, compare, hire, without instructions", which carries 20% on the only fully
weighted rubric anywhere in the programme (`00-PROGRAM.md`).

This document is a build instruction, not legal advice. Every legal text it quotes was read from a
primary source by `R15-compliance.md` and is cited to it.

## 0. Two rules the rest of this follows

**A rule a buyer cannot read before hiring is not a rule.** Every document below sits at a stable URL,
carries its version plus its `docHash` and is linked from the surface where it bites rather than from a
footer. The ranking disclosure is linked from every result list because that is exactly where the
Consumer Rights Directive Art 6a(a) puts it, in "a specific section of the online interface that is
directly and easily accessible" from the results page (`R15-compliance.md`). The FCA's own
anti-obfuscation rules show what a regulator thinks of terms designed to be missed: COBS 4.12A.38R plus
4.12A.42R ban any "design feature which has the intent or effect of reducing the visibility or
prominence" of a warning, naming small fonts, faded text, low contrast plus burial at the foot of the
page (`R15-compliance.md`).

The same rule fixes where the risk warning sits, so it is published here rather than left to a builder.
COBS 4.12A.36R requires it prominent, legible, bordered and on a website or app "statically fixed and
visible at the top of the screen" (`R15-compliance.md`). It binds every view that shows a rate, a return, a
projection or a health factor: the four shelves, a listing page, compare, `/coverage`, `/report`, the quote
plus hire screens, any receipt carrying a rate. Not a footer. Not a dismissable modal. `09-DISPUTES.md` section
10 owns the wording, the four permitted output shapes plus the banned-string screen behind it.

**Publish, never restate.** Where another document decides a mechanism, this one carries the published
wording plus the link and nothing else. Every number inside published prose is transcluded at build time
from one `policy-constants.json` that the running code reads as well. A policy page that retypes 200
basis points is a page that disagrees with the fee code inside a week. A rulebook that contradicts
the product is worse than no rulebook because it proves nobody checked. The constants file is published
beside the documents so a reader can diff the prose against the machine values.

One consequence follows immediately: a published document is generated, hashed then appended to an
append-only log, which turns "what did the terms say on the day I hired" into a lookup rather than an
argument.

## 1. The document set

Nine documents. Not ten, because a tenth nobody reads dilutes the nine. Not seven either, because these
bind different parties at different moments so merging them would make the acceptance record a lie.

| Document | URL | Binds | Agreed at | Acceptance record |
| --- | --- | --- | --- | --- |
| **Buyer terms** | `/docs/policy/buyer-terms` | the buyer, for one hire | the hire step, never before | two ticks plus the wording shown, timestamped |
| **Operator agreement** | `/docs/policy/operator-agreement` | the operator, for every listing they hold | the claim step, before `linted` | EIP-191 signature over `docHash` from the operator address |
| **Acceptable use** | `/docs/policy/acceptable-use` | both parties plus every listed agent, continuously | incorporated by both documents above | inherited from each party's own acceptance |
| **Listing standards** | `/docs/policy/listing-standards` | a listing, continuously, not once | incorporated by the operator agreement | the `policyVersion` on each passing probe, beside the listing's own `contractVersion` |
| **Quality standards** | `/docs/policy/quality`, ranking at `/docs/policy/ranking` | Muster, not the parties | published, binds us | the published constants plus `score.json` per listing |
| **Dispute policy** | `/docs/policy/disputes` | both parties, per job | the hire step, alongside buyer terms | the same buyer record, plus the operator's standing signature |
| **Fee schedule** | `/docs/policy/fees` | the buyer, per quote | quote issue, carried on the quote | the fee at issue stored on the `quote` itself, keyed by `quoteId` |
| **Privacy notice** | `/docs/policy/privacy` | Muster, not the parties | first write of any record | shown at the signing screen, not only in the notice |
| **Disclosure** | `/docs/disclosure` | nobody, which is the point | always live | none. It is a statement of fact we can be held to |

Three of the nine carry no obligation on a counterparty. Quality standards plus the privacy notice bind us,
the disclosure binds nobody, so all three are commitments a reader can hold us to with no signature
involved. They carry no acceptance step and no dark pattern.

### Buyer terms

Binds at the hire step. Never at landing, never at browse, never behind a modal. No wallet is requested
on any browse surface (`03-TAXONOMY.md`), so a judge who reads the whole site agrees to nothing and hits
no wall. That is a Functionality answer as much as a policy one.

Contents, in order, because the order is the disclosure duty:

1. **Muster is a broker, the operator is the counterparty.** The buyer contracts with the agent
   operator. We introduce, we hold nothing, we warrant nothing about the work.
2. **Who we are, stated rather than implied.** There is no legal entity behind this venue. It is an
   individual entrant's build, so there is no tax registration, no invoice plus no VAT position, trader
   verification is out of scope, then no governing-law or forum clause is offered at all, because naming a
   jurisdiction for a party that does not exist buys a buyer nothing. The design was built against the
   strictest written material we could read, the EU plus UK texts this document names, which is a design
   input rather than a legal opinion (`14-GAPS.md` section 7.6). One published role address with a declared
   language is the whole of the contact route. It is also the law-enforcement intake.
3. **The four Art 6a disclosures**, each on the listing itself rather than only here: the main ranking
   parameters with their relative importance, whether the third party is a trader "on the basis of the
   declaration of that third party", the line that consumer rights under Union law do not apply where
   the third party is not a trader, then how the obligations are shared (`R15-compliance.md`).
4. **The total price including the fee**, before acceptance, in base units with the token plus the
   decimals named.
5. **The two acknowledgements**, as two separate ticks rather than one: begin now, plus I understand I
   lose the 14-day withdrawal right once performance begins. Art 16(m) removes the right only on three
   cumulative conditions, prior express consent, acknowledgement of losing the right, then trader
   confirmation on a durable medium (`R15-compliance.md`). Where a buyer does not consent to an
   immediate start, a scheduled start is offered instead so the right survives.
6. **The durable confirmation**, which for this product is the `receipt` plus its export. A confirmation
   that lives only on a page we control is not durable, so the export is part of the term rather than a
   convenience.
7. **What is disputable and what is not**, as the D1 to D10 plus N1 to N9 lists verbatim from
   `09-DISPUTES.md`, with the clock per rail.
8. **The risk warning**, in the FCA's own drafted wording, which is the only risk warning in this space a
   regulator has written for itself: "Don't invest unless you're prepared to lose all the money you
   invest." plus "This is a high-risk investment and you should not expect to be protected if something
   goes wrong." (`R15-compliance.md`). Whether the FCA consumer-tested that wording is **unverified**, so
   the claim is drafted rather than tested.
9. **None of this is advice**, with the never-says list published rather than implied. Muster does not say
   that anything is suitable, guaranteed, safe, capital protected, risk-free or a stable return. It does not
   say that an agent is right for you. It makes no independence claim at all. An agent output is one of four
   declared shapes and none of them is a personalised recommendation, which `09-DISPUTES.md` section 10
   settles and the listing standards bind an operator to. A disclaimer does not change what a thing is, so
   the shapes are the mechanism and this sentence is the notice.
10. **No outcome warranty, no independence claim.** Warranting quality is behaving as the operator, which
    is the DSA Art 6(3) fact pattern. Claiming independence while taking a sell-side fee is barred by
    MiCA Art 81(3)(b) (`R15-compliance.md`).

What it must not contain: a money-back guarantee no escrow can execute, a binding arbitration clause we
cannot run, a claim that funds in escrow are beyond anyone's reach (FDUSD plus USD1 both expose
`freeze(address)` `0x8d1fdf2f` and USD1 also exposes `reallocate(address,address,uint256)` `0x308b8c00`,
`R15-compliance.md`) or a class-action waiver, which buys us nothing at this scale and reads as
hostility.

### Operator agreement

Binds at the claim step, before a listing can enter `linted`. It is the only document in the set signed
rather than ticked, because an operator is a repeat counterparty whose obligations run continuously.

Contents: control proved from `ownerOf` `0x6352211e` or `isApprovedForAll` `0xe985e9c5` and the payout
address read from chain via `getAgentWallet` `0x00339509` rather than from any form field
(`05-ONBOARDING.md`); the behaviour rules from `04-AGENT-PROTOCOL.md` section 7 incorporated by
reference; listing standards plus acceptable use incorporated by reference; **probe consent**, meaning we
will call the declared surfaces on the published cadence from a named user agent and publish the results
including the failures; the fee, additive and buyer-paid, so the operator receives exactly the price they
published; the grounds for suspension plus delisting with the appeal route; the drift rule, that a change
to `tokenURI`, metadata or the payee re-runs review because `setAgentURI` `0x0af28bd3`, `setMetadata`
`0x466648da` plus `setAgentWallet` `0x2d1ef5ae` are owner-callable at any time (`R15-compliance.md`); the
anti-wash rule that only settled jobs with a distinct payer outside the payer's funding cluster count;
then two collected declarations.

The two declarations are the parts that carry a statute behind them.

- **Trader status**, collected because Art 6a(b) puts the determination on "the declaration of that third
  party" rather than on the platform's guess (`R15-compliance.md`). We collect it, we show it, we do not
  infer it.
- **A self-certification of legal compliance**, in the shape DSA Art 30(1) asks of a marketplace: a
  commitment to offer only services that comply with applicable law (`R15-compliance.md`).

What it must not contain, which is the honest part: **any claim that we verified the operator's
identity.** Full Art 30 collection (name, address, telephone, email, an identification document or eIDAS
identification, payment account details, trade register number) is out of scope for this build. The
schema exists, the self-certification is collected, the fields that would carry identity documents are
defined and empty because the venue is not operating commercially. That is stated in the agreement
plus in the disclosure. Claiming trader verification that did not happen is the one move here that would
be dishonest rather than merely incomplete (`R15-compliance.md`).

### Acceptable use

The prohibited-use list, published with two columns nobody else publishes: the reason each entry exists
plus the consequence it maps to. A policy whose entries carry no reason gets ignored by the people
writing agent cards. A category with no mapped outcome cannot be written into a statement of reasons,
which DSA Art 17(1)(b) plus 17(1)(d) require for a payment restriction and for an account suspension
(`R15-compliance.md`).

Four groups, in the order a reader needs them: the regulatory perimeter (custody, personalised advice,
discretionary portfolio management, order execution, unlicensed lending or yield promises, fiat on-ramp),
financial crime and integrity (sanctions evasion, laundering, market manipulation, extraction against our
own users, reputation manipulation, rug-pull tooling, unauthorised access, reporting evasion),
agent-specific (exceeding granted authority, adversarial payloads aimed at other agents, impersonation,
silent capability change, undisclosed subcontracting to a screened party, unbounded or hidden pricing),
then the illegality floor (illegal content and goods, personal-data harvesting, third-party terms breach
as a service, deceptive automation disclosure). `R15-compliance.md` carries the full table with the
primary text behind each row and `09-DISPUTES.md` section 9 carries the mapping to the four outcomes,
which are the only four: no action with a note, ranking suppression, delisting with a reason shown, then a
payment block.

Three clauses that must appear in the published version and are easy to leave out.

**Enforcement reaches our index and nothing else.** The ERC-8004 registries are append-only and
registration is permissionless: `register(string)` `0xf2c298be` simulated from an arbitrary address
returns the next id (`R15-compliance.md`). So the policy says delisted here rather than removed. Every
enforcement record carries an `onChainEffect` field that reads `none` for anything registry-related.

**The notice-and-action route is published on this page rather than in a tenth document.** Three intakes,
one store: the public notice form carrying the four fields DSA Art 16 requires, the one-click in-product
report that pre-fills the exact location from `agentId`, `jobId` plus the deliverable hash, then the
published role address for authorities with its declared language. The published targets, the Art 16(3)
knowledge clock plus the statement-of-reasons fields are `09-DISPUTES.md` section 9's design and this page
carries them as the operator-facing and buyer-facing terms.

**Misuse of the report channel is a violation too.** DSA Art 23 makes the answer symmetric, suspending
users who frequently provide manifestly illegal content under 23(1) and notifiers who frequently submit
manifestly unfounded notices under 23(2), both after a prior warning. 23(4) requires the policy published
"in a clear and detailed manner" with "examples of the facts and circumstances" plus the suspension
duration, so the published page carries the four weighing factors from 23(3) and worked examples rather
than a sentence (`R13-prior-art.md`, `R15-compliance.md`). The rate gate touches the automatic remedy and
never the right to be heard, which is `09-DISPUTES.md` section 8.

### Listing standards

The published version of the lint plus the go-live gates. Three properties make it a standard rather than a
checklist.

**It binds continuously.** The same lint runs at preflight, at `claimed` then on any drift after go-live,
and it is the same code in all three places (`05-ONBOARDING.md`). A listing is judged against the
standards in force at its last passing probe, with the version it passed under recorded on the probe.

**Every threshold is either derived from a measurement or marked as ours.** The lint numbers that a live
agent marketplace actually enforced are labelled earned, with the measurement behind them: a 400-character
summary ceiling where the copy that finally passed a live review was 357 characters, image floors sitting
between a rejected mark at 0.145 detail fraction and an accepted one at 0.288, then the decimals rule that
came from a real delisting whose verbatim cause was `tokenResolveError: cannot determine token decimals`
(`R16-reuse.md`, `05-ONBOARDING.md`). Publishing which numbers are earned and which are ours is what makes
an operator argue with the standard rather than with us.

**An agent output is one of four declared shapes. This is where an operator is bound to them.**
Measurement, comparison on stated criteria, user-parameterised simulation, mechanical execution of a
user-set rule. The shape is declared in the listing, the required fields per shape are asserted against the
live response by the conformance suite, then an output that is none of the four fails the hireable bar and
never reaches a shelf. `09-DISPUTES.md` section 10 decides the shapes, the per-shape assertion, the banned
strings plus the delivery-path screen. The listing standards page carries the requirement so the obligation
sits in a document an operator signed rather than in a design note they never read.

### Quality standards, with the ranking disclosure inside it

Publishes `06-QUALITY.md` and `07-MATCHING.md` to a reader who will never open either. Four things go on
the page: the two-numbers rule (the Muster score answers whether a listing delivered what it promised, the
category performance panel answers whether the work was any good, neither is folded into the other), the
score formula with all eight constants plus the per-listing `score.json` that lets a stranger recompute it,
what does not count toward it and why each exclusion holds, then the anti-gaming detections by their
published names (`self-financed`, `buyer-cluster`, `anomalous-window`, `control-set`, `ring`, `pinned-hash
drift`, `reconcile`).

`/docs/policy/ranking` is a stable anchor inside this document rather than a tenth document, because Art
6a(a) asks for a specific accessible section reachable from the results page and a separate document
linked from a footer would fail that while looking tidier.

The choice worth defending: **we publish the coefficients, not only the parameter list.** P2B Art 5(1)
requires "the main parameters determining ranking and the reasons for the relative importance of those main
parameters" while Art 5(6) explicitly permits withholding algorithms whose disclosure would enable
manipulation. Every operator studied takes that permission. Fiverr names six areas and hides the
weights, Steam publishes a 40% visibility floor and no formula, IMDb publishes its chart formula then
declines to publish the page one, Hugging Face exposes `trendingScore` as a sort key with no algorithm
(`R13-prior-art.md`). We go further because our gaming resistance does not live in secrecy. It lives in the
settled-job binding, the distinct-payer rule plus the funding-cluster test, none of which is weakened by
being read. A score a judge can recompute from published rows is the strongest available answer to Data
Quality, while Art 5(6) is a permission rather than an obligation.

Also on the page, because MiCA Art 81(2) asks an adviser to disclose independence before advising and we
are not an adviser: the fee is stated, the fee does not influence ranking, no term in the ranking function
reads the first-party list, then no independence claim is made anywhere (`R15-compliance.md`).

### Dispute policy

Publishes `09-DISPUTES.md` for a buyer who is deciding whether to hire, so it leads with the not-disputable
list rather than burying it. Carries the ten disputable claims with what each is decided from, the nine
non-disputable ones with the reason, the clock per rail (the x402 rail is irreversible once settled, the
ERC-8183 rail holds the budget for `disputeWindow()` 604800 s on mainnet and 900 s on testnet), the burden
rule, the enumerated remedies with who funds each, the appeal window then the misuse rule.

Two published honesty lines. On the escrow rail we decide nothing, because `settle` is permissionless and
the dispute button is client-only, so the policy says who holds the lever rather than implying we do. And
the panel beyond published policy is not staffed: at this scale the decider is us under a published rule,
with the transition designed in `09-DISPUTES.md` section 5 (`02-THESIS.md`).

### Fee schedule

One page, four numbers, no marketing. 200 basis points of the listing price with a floor of 0.01 `$U`,
which is `10000000000000000` in base units at 18 decimals. Additive, so `accepts[].amount` stays
byte-identical to the operator's own published number. Paid by the buyer as a disclosed line item, taken at
settlement in a second authorisation after the principal, never at listing time and never as a standing
allowance (`08-MONEY.md`).

The page also carries the two things a fee page usually hides. **Why 200 bps**: it is the incumbent's own
number on the same chain, read on chain rather than off a page, `protocolFeeBps()` on
`0x6A52ba4C84b348FaEAe13dDC7A97b4F6af23913C` returning 200 (`R07-termix.md`). Pricing at the incumbent's
number is defensible in a way that pricing above it is not. **What is free**: browsing, search, compare,
the whole `api` read surface with no auth, the `mcp` read tools, the conformance suite, the status page,
every receipt including receipts for payments that did not go through us, the `settler` which calls
`settle` for anybody's job, then paying an agent directly over the plain x402 challenge we publish.

No referral bonus and no incentive on a hire, ever. COBS 4.12A.7R bars a promotion offering "any monetary
or non-monetary incentive" with guidance 4.12A.8G naming referral bonuses. While that rule attaches to
investment promotions rather than to a marketplace listing, a venue whose only trustworthy signal is a job
somebody paid for cannot afford to pay people to generate that signal (`R15-compliance.md`,
`02-THESIS.md`).

### Privacy notice

One page. What is collected, why, the lawful basis, the retention schedule, the rights then how to
exercise them. It is short because the collection is short: wallet signature is the only account
mechanism, so there is no email, no password and no OAuth (`05-ONBOARDING.md`).

The notice states the design reason rather than only the fact. EDPB Guidelines 02/2025 v2.0 para 137 says
a wallet address "qualifies as personal data under Article 4 GDPR when it can be associated with an
identified or identifiable natural person". Para 26 names a breach of our own database as a means
reasonably likely to be used (`R15-compliance.md`). The link is the liability, so we never build it. The
notice publishes the deny-by-default field list, the absences that are load bearing (no key or seed
phrase, no card data, no identity document, no special category data, no free-text staff note, no IP
joined to a wallet address, no wallet address in any third-party analytics payload) then the retention
table `09-DISPUTES.md` section 9 fixes.

Two clauses that most privacy notices in this space get wrong.

**Erasure is honest about the chain.** Off-chain data is deleted on request. On-chain data cannot be, so
the notice says so in the same words as acceptable use, which is the document carrying the notice-and-action
route plus the delisted-rather-than-removed clause. That is exactly the EDPB para 103 position that on-chain
deletion "might be technically impracticable" while para 102 requires the rights to be "complied with by
design" (`R15-compliance.md`). There is no separate takedown policy to point at, because the set closes at
nine and the takedown route is published inside acceptable use.

**The information appears at the moment of the write, not only in the notice.** EDPB Recommendation 3 asks
for information at the point a user is about to commit data to the chain, so the relevant line sits on the
signing screen (`R15-compliance.md`).

Also published: the breach path with the GDPR Art 33 72-hour notification window named, plus the
vulnerability-disclosure route EDPB Recommendation 7 asks for.

### Disclosure

Section 5 of this document is the disclosure. It binds nobody and it is the page most likely to be read
adversarially, so it is written to be checked rather than believed.

### Acceptance is a signature over a hash, not a checkbox

An acceptance record that does not name the bytes accepted is worthless in a dispute, because the terms
move. Two records, neither of which SPINE carries, so both are requested from `15-SYSTEM.md` section 2.6 in
the shape that document's stored-model table accepts:

```
policyDoc = {
  docId,            // 'buyer-terms' | 'operator-agreement' | ... , a closed enum of nine
  version,          // 'major.minor'
  docHash,          // keccak256 of the canonical published bytes
  url,
  effectiveAt,      // ISO 8601 UTC
  supersedes,       // the previous version string, null for 1.0
  changeClass,      // 'additive' | 'obligation' | 'removal' | 'legal'
  constantsHash     // keccak256 of the policy-constants.json the page was rendered from
}

acceptance = {
  acceptanceId,
  docId, version, docHash,
  party,            // an address, never a name
  partyRole,        // 'buyer' | 'operator'
  method,           // 'eip191Signature' | 'tickedAcknowledgement'
  signature,        // present for eip191Signature
  signerRecovered,  // present for eip191Signature, asserted equal to party
  wordingShown,     // the exact strings rendered, for the two-tick case
  acceptedAt, blockNumber
}
```

The operator case is a signature so it is portable evidence: anyone can recover the signer from
`signature` plus `docHash` without trusting our database. The buyer case is two ticks plus the wording,
because a signature prompt at the acknowledgement step would add a wallet interaction to a flow that
already has one and the withdrawal-right exemption asks for consent plus acknowledgement rather than for a
cryptographic act (`R15-compliance.md`). Both records carry a five-year `retainUntil`, since the
acknowledgement is the evidence the exemption rests on (`09-DISPUTES.md`).

**The store extensions this document asks for, in the shape `15-SYSTEM.md` section 2.6 lists them.** That
table names the document that needs each row, so these are stated the same way rather than left as prose
somebody has to notice. SPINE's `probeResult` carries no `policyVersion`, its `quote` carries no fee field
at all (08-MONEY keeps `feeBase` on `payment`, which is the wrong record for a term the buyer accepted at
quote issue) then nothing in SPINE holds a published document or an acceptance.

| Added field | On | Why |
| --- | --- | --- |
| `policyVersion` | `probeResult` | a listing is judged against the standards in force at its last passing probe, so the probe has to record which version it passed under. `contractVersion` is already on `listing`, so only the policy half is new |
| `policyVersion` | `quote`, `receipt`, the dispute bundle | an in-flight quote cannot be repriced, a settled hire stays provable after the rules move, an open dispute is decided under the version in force when the job started |
| `feeBaseAtIssue`, `feeBps`, `feeToken` | `quote` | the fee schedule binds per quote, so the quote is where the fee at issue lives. `payment.feeBase` records what settled, which is a different fact |

| New collection | Key | Holds | Why |
| --- | --- | --- | --- |
| `policyDoc` | `(docId, version)` | the fields in the `policyDoc` block above | one row per published version, so "what did the terms say on the day I hired" is a lookup |
| `acceptance` | `acceptanceId` | the fields in the `acceptance` block above | the evidence the withdrawal-right exemption rests on, kept five years |
| `policy-log` | `seq` | `seq`, `prevHash`, `entryHash`, `kind` (`publication`, `acceptance`), `ts`, `body` | append-only, hash-chained on the canonical-bytes rule below, with a public `walk()` returning per-entry failures. Append-time invariants: `seq` strictly increments, `prevHash` equals the previous `entryHash`, `entryHash` recomputes from the canonical body, no update or delete on any existing row |

Nothing here changes the money `ledger` or its `origin` enum. That separation is the next section's point.

One clause makes a durable medium possible and it is easy to miss: **the buyer terms plus the
operator agreement each grant the accepting party a perpetual, irrevocable right to retain and reproduce
the exact version they accepted.** Our outbound licence is no-derivatives and withholds redistribution
(section 6), so without that carve-out the confirmation a buyer is entitled to keep would be a copy the
licence forbids. A durable-medium promise that the licence contradicts is not a promise.

### What the set deliberately does not contain

| Not published | Why not |
| --- | --- |
| A binding arbitration clause | Paid third-party arbitration works only with a funded panel plus enforcement, in the shape where cost is split, seven days are given to accept then funds default to whoever paid (`R13-prior-art.md`). We have none of that. A clause naming an arbitrator who does not exist is a term we would have to break |
| A cookie consent banner | Nothing on the site sets a non-essential cookie, there is no analytics that ships a wallet address anywhere, so a banner would be a dark pattern with no purpose |
| A trader-verification claim | Art 30 collection is out of scope, stated plainly instead |
| A money-back guarantee | The escrow releases against a deliverable hash, so the remedy is the challenge window plus the enumerated remedies. A refund promise the contract cannot execute is worse than no promise (`R15-compliance.md`) |
| An indemnity from the operator | Unenforceable against a pseudonymous address and it would imply we hold identity we deliberately do not collect. Our remedy is delisting, theirs is appeal |
| A governing-law or forum clause | There is no legal entity behind the venue, so naming a jurisdiction offers a buyer a remedy that does not exist. The absence is published with its reason in the buyer terms plus section 5.5, alongside the contact route that does work |
| A "compliant with MiCA / the DSA" claim | We built to the strictest specification we could read then named the texts. Claiming compliance with a regime nobody assessed us against is the one sentence a judge can disprove |
| The word official applied to Muster | "Official adoption as the BNB Agent Studio marketplace" is a prize, not a status (`00-PROGRAM.md`). Until adoption it is a description of the venue we are competing to become, never a badge on the site |

## 2. Versioning and what a change does to a listing already live

Numbering is `major.minor`, the same scheme `03-TAXONOMY.md` uses for a category contract, so a reader
learns one convention rather than two. Every document ships at `1.0` on the day the site goes public.

Four change classes, because "we updated our terms" is not a fact anybody can act on:

| Class | What it covers | Notice | Effect on a live listing | Fresh acceptance |
| --- | --- | --- | --- | --- |
| `additive` | a clarification, a new optional field, a loosened threshold, a new example | immediate | none | no |
| `obligation` | a new requirement, a tightened threshold, a new prohibited-use entry, a fee increase | **30 days**, notified on a durable medium | keeps running under the version it accepted until the window closes | **yes**, before the next go-live probe |
| `removal` | an obligation dropped, a fee cut, a threshold relaxed to zero | immediate | applied immediately in the operator's favour | no |
| `legal` | forced by a valid order, by a law taking effect or by an active abuse causing loss | immediate, with the reason in the entry | applied immediately, with a statement of reasons where it restricts anything | yes, retrospectively logged |

**30 days, because the statutory floor is 15 and this class is the one that needs longer.** An operator is a
business user of an online intermediation service, so P2B Art 3(2) applies to every `obligation` change. It
reads: "That notice period shall be at least 15 days from the date on which the provider of online
intermediation services notifies the business users concerned about the proposed changes", with the
notification itself "on a durable medium"
(`R13-prior-art.md`, `research/raw/r13-eu-p2b-2019-1150-2026-09-05.html`). The same article then says
"Providers of online intermediation services shall grant longer notice periods when this is necessary to
allow business users to make technical or commercial adaptations to comply with the changes". A tightened
threshold or a new required field is exactly a technical adaptation, so 15 is the floor rather
than the answer. We publish 30.

The floor is not negotiable because Art 3(3) makes the consequence of missing it total: changes
"implemented by a provider of online intermediation services contrary to the provisions of paragraph 2 shall
be null and void." A 14-day window, which an earlier draft of this document published as our own number,
would have been one day short of that floor and the change would have been void. Art 3(2) also gives the
operator the other half: the right to terminate before the window expires, taking effect within 15 days of
the notice, plus a waiver they can exercise themselves at any point after receiving it.

The `legal` class is the carve-out rather than an exception we invented. Art 3(4)(a) removes the notice
period where the provider "is subject to a legal or regulatory obligation which requires it to change its
terms and conditions in a manner which does not allow it to respect the notice period". Art 3(4)(b) does
the same for an unforeseen and imminent fraud, malware, spam, data-breach or cybersecurity danger. That is
the whole of what `legal` covers. The changelog entry names which of the two limbs applies.

**How an `obligation` change lands on a live listing, concretely.** Both versions live at their own URLs
for the whole window, `1.0` and `1.1` side by side. The listing keeps the `policyVersion` its last
passing probe recorded, so nothing about it changes mid-window. The operator gets the diff plus the
failing requirement by name if the new version would fail their listing today. At the end of the window a
listing that has not accepted and re-probed moves to `indexed` rather than `delisted`, with a statement of
reasons naming the version plus the requirement. It returns to `live` on a passing probe under the new
version. Version lag suspends visibility, never standing: the score, the settled-job count plus the
evidence tier are untouched, which mirrors the reject-and-fix-on-the-same-`agentId` rule
(`05-ONBOARDING.md`).

**Nothing is retroactive, at three levels.** A completed hire keeps the `policyVersion` plus the
`contractVersion` it settled under and the `receipt` records both, so a receipt stays provable after the
rules move. An issued `quote` carries the fee at issue and is bound by `expiresAt`, so an in-flight quote
cannot be repriced. An open dispute is decided under the version in force when the job started, which is
the version the evidence bundle recorded.

**The changelog is a document, not a commit message.** One entry per version at `/docs/changelog`, each
carrying `docId`, `version`, `effectiveAt`, `changeClass`, `sections[]`, `reason`, `noticeDays`,
`reacceptanceRequired`, `reprobeRequired`, `supersedes`, `docHash` plus `constantsHash`. The page renders
newest first with a per-document filter. Every entry links the two versions it sits between so a diff
is one click rather than a request to us.

**The change history is hash-chained in its own log, not in the money ledger.** SPINE's `ledger` enforces
`origin` as exactly `house` or `order` at append time, which is what makes revenue countable. A
document publication is neither. Forcing it in would either weaken that enum or file a policy change as
house spend. So policy publications plus acceptances go to a separate append-only `policy-log` using the
same canonical-bytes rule (`json.dumps(obj, sort_keys=True, separators=(",", ":"))` over the body,
sha256), the same append-time invariants and the same public `walk()` returning per-entry failures. Two
chains, one discipline, neither invariant compromised.

**Frozen for the programme.** No `obligation` change to any of the nine between 2026-09-06 00:00 UTC and
2026-09-23 23:59 UTC, which is the same window `03-TAXONOMY.md` freezes the category contracts over and
for the same reason: three judges score independently across a two-week window, so a rulebook that moved
underneath them would mean two judges read two different products (`00-PROGRAM.md`). `additive` changes
are allowed and logged. A `legal` change is not something a freeze can promise away, since a valid order
or an active loss forces it, so it stays permitted inside the window and ships with its reason named in
the entry. If a defect forces a real change it ships as a parallel version with both live plus a changelog
entry naming the defect.

**One entry per document is what a launched rulebook looks like.** On 2026-09-09 the changelog holds nine
`1.0` rows and nothing else. We do not manufacture a history to look established.

## 3. The public docs site

`Docs` is one of six fixed nav items (`03-TAXONOMY.md`). The tree is small on purpose: a docs site with
forty pages has no page a judge will read.

```
/docs                                   the index, nothing else on it
/docs/how-it-works                      the page a judge reads
/docs/buyer                             buyer quickstart
/docs/operator                          agent operator quickstart
/docs/api                               REST reference, generated from the spec
/docs/api/openapi.json                  OpenAPI 3.1, info.license populated
/docs/conformance                       the twenty-eight assertions, one row each
/docs/conformance/self-check            run the identical suite against your own URL
/docs/schemas/muster-card-1.json        the card schema, version in the filename
/docs/constants.json                    every constant a builder needs, machine readable
/docs/policy/…                          the nine documents, ranking anchored inside quality
/docs/disclosure                        section 5 of this document, rendered
/docs/changelog                         the policy changelog
/docs/licence                           the licence posture, NOTICE, DATA-SOURCES, PROVENANCE
/llms.txt                               the machine-readable map
/openapi.json                           redirect to /docs/api/openapi.json
```

Category contracts keep the URLs `03-TAXONOMY.md` owns, `/categories/<slug>/contract/v1.json` with its
`contractHash` plus `/categories/<slug>/changelog`.

**What the index links, counted rather than asserted.** Twenty-five links. Twelve concrete paths under
`/docs`, which is every line in the tree above except the index itself, the `/docs/policy/…` group then the
two root files: `how-it-works`, `buyer`, `operator`, `api`, `api/openapi.json`, `conformance`,
`conformance/self-check`, `schemas/muster-card-1.json`, `constants.json`, `disclosure`, `changelog`,
`licence`. Then the nine policy documents at their own URLs. Then the four category contracts.
`/docs/policy/ranking` is an anchor inside quality rather than a tenth document, so it adds no link.
`/llms.txt` plus `/openapi.json` sit at the root and are reachable without the index.

One file, two names, said once so it does not read as sloppiness: `policy-constants.json` is the source in
the repository that the running code reads, `/docs/constants.json` is its published rendering, then the
`constantsHash` on every document covers it.

Page rules that apply to every one of them. Each page carries `lastUpdated`, the commit it was built from
plus its `docHash`. Every number is transcluded from `constants.json` or read live with its freshness
stamp, never typed into prose. Nothing requires JavaScript to read, which is the same scripting-off
commitment the buyer surface makes. CI fails the build on a broken internal anchor, on an external link
that does not answer 200 to an anonymous fetch or on a page whose rendered numbers disagree with the
constants file.

### `/docs/how-it-works`, the page a judge reads

This page decides more of the impression than anything else in the tree, so it is specified rather than
left to whoever writes it last. It is linked directly from the landing page, not buried under Docs,
because a judge with four tabs open will not hunt. One screen plus a short scroll, in this order:

1. What the venue does in one paragraph, then what it refuses to do in one sentence.
2. The funnel with its block height plus its timestamp: 336,088 agents ever registered at block
   120,141,168, 2026-09-05T16:17:48Z (`SPINE.md`), then over the 334,935 ids the sample was drawn from at
   block 120,027,164, 233 of 600 sampled declaring a concrete `http(s)` endpoint, 230
   answering, 12 machine-callable, 0 payable by a stranger (`MEASUREMENT.md`). Read the day the submission
   goes out, with the new block plus the new timestamp on the page.
3. The four shelves with identical counts each, candidates, answering, hireable, settled, first-party
   split out, then one link to `/coverage`, which carries the same four sets of numbers as the proof page
   rather than as a summary (`03-TAXONOMY.md`).
4. The two rails in four sentences: one EIP-3009 signature with our submitter paying gas, then the
   official ERC-8183 kernel at `0xEa4DAa3100A767e86FDed867729ae7446476EBA6` where the budget sits for
   `disputeWindow()` 604800 s and `settle` is permissionless.
5. **Five commands a stranger can run**, printed with their expected output, so the page is checkable
   rather than persuasive:

```bash
export RPC=https://bsc-rpc.publicnode.com
export ARCHIVE=https://bsc-mainnet.public.blastapi.io   # publicnode refuses a historical block
export PIN=120027164                                    # 2026-09-05T02:02:32Z

# 1. the registry is the one we say it is
cast call 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 "name()(string)" --rpc-url $RPC
# "AgentIdentity"

# 2. the agent count, in one storage read, no indexer
cast storage 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 \
  0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00 \
  --block $PIN --rpc-url $ARCHIVE
# 334935 at block 120027164, 2026-09-05T02:02:32Z. Top live id is this minus 1.
# Drop --block for the live head, which is higher and moves about 1,940 a day.

# 3. the official escrow is real and busy
cast call 0xEa4DAa3100A767e86FDed867729ae7446476EBA6 "jobCounter()(uint256)" \
  --block $PIN --rpc-url $ARCHIVE
# 56713 at block 120027164, 2026-09-05T02:02:32Z.
# Drop --block and it climbs: 56716 at block 120161125, 2026-09-05T18:47:33Z.

# 4. our screening call is the one we publish and it discriminates
cast call 0x40C57923924B5c5c5455c48D93317139ADDaC8fb \
  "isSanctioned(address)(bool)" 0x098B716B8Aaf21512996dC57EB0615e2383E2f96 --rpc-url $RPC   # true
cast call 0x40C57923924B5c5c5455c48D93317139ADDaC8fb \
  "isSanctioned(address)(bool)" 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c --rpc-url $RPC   # false, WBNB

# 5. any listing's score, recomputed from its own published rows
curl -s https://<host>/api/listings/<listingId>/score.json | jq '.constants, (.jobs | length)'
```

Commands 2 and 3 are pinned deliberately. Both counters move, `_lastId` by roughly 1,940 a day and
`jobCounter` in bursts, so a bare expected value on a page a judge reads between 9 and 23 September is wrong
by the time they read it. Pinning the block makes the printed pair reproducible and the second line shows
the live figure so nobody mistakes the pin for the head. Both values are read from `constants.json` at build
time rather than typed, which is the page rule above.

Every constant in that block traces to `SPINE.md` with one exception, the SDN example address
`0x098B716B8Aaf21512996dC57EB0615e2383E2f96`, which is not in SPINE's constants table and traces to
`R15-compliance.md` instead. Every expected output traces to `R01-erc8004.md`, `R16-reuse.md` or
`R15-compliance.md`. Command 4's two verdicts were re-read from chain on 2026-09-05. That command needs
a re-check the day the submission goes out, because OFAC delistings are real and the oracle tracks them:
`R15-compliance.md` verified that the two Tornado Cash addresses removed in 2025 now both return `false`. An
expected `true` that has become `false` is a broken command on the one page written to be checkable.

6. Which listings are ours, with the operator address list linked.
7. The real-against-staged table from section 5, in full, above the fold rather than in a footnote.
8. The licence line plus the AI disclosure.

Success test for the page: a reader who opens only this URL can name what is live, what is staged, what is
unexercised then run one command that proves a number, inside two minutes.

### `/docs/buyer`, the quickstart for someone with zero Agent Studio knowledge

The Functionality criterion names that reader: "Someone with zero Agent Studio knowledge should be able to
get through it without hitting a dead end" (`00-PROGRAM.md`). So the buyer quickstart is written for a
person who has a wallet with `$U` in it and nothing else. Five steps, each with the screen it maps to:
pick a shelf, read the contract summary so you know what the shelf sells, compare up to four rows on the
fields that differ, hire (which is where the wallet connects for the first time and where the fee, the
total, the two acknowledgements plus the risk warning appear), then read the receipt and export it.

It also names the three ways a hire can end that are not a failure: a refusal citing a declared condition,
a delivered result you dispute under one of the ten decidable claims, then a job routed to a different
agent by failover with what you paid and what the failed agent's record shows.

### `/docs/operator`, the quickstart that has to work without us

Written for an operator who already holds an `agentId` or is about to register one. It carries the
smallest conforming agent verbatim from `04-AGENT-PROTOCOL.md`: one host, three files, three routes, one
token, one category, read-only. Then the claim signature, then the self-check, then the ten go-live gates
`05-ONBOARDING.md` fixes, ordered cheapest first the way `04-AGENT-PROTOCOL.md` orders the assertions
inside them, so an operator fails on a read rather than after paying for a probe.

The page carries the two traps that cost real operators real time, both earned rather than theoretical.
The decimals trap: every BSC stablecoin in the set is 18 decimals, so a challenge built from 6-decimal
reference code is wrong by a factor of a trillion. A listing whose decimals cannot be resolved was
delisted elsewhere for exactly that (`VERIFIED-payment-rail.md`, `R16-reuse.md`). The free-info trap:
every route the listing invites has to answer a payable 402 on every verb it invites, because a `GET` that
returns 200 with an info blob can never be paid for by a client that replays the request it already tried
(`R16-reuse.md`).

Success test: an operator who has never spoken to us gets a green self-check plus a `live` listing using
only this page. That test is run for real before submit, by following the page against a fresh host.

### `/docs/api` plus the OpenAPI document

The read surface takes no auth, no key and no wallet. The reference is generated from
`/docs/api/openapi.json` so the two cannot drift. The spec carries what 8004scan's does not: a
populated `info.license`, an `info.termsOfService` pointing at the buyer terms then an `info.contact`
naming the published role address (`R15-compliance.md`).

Four things the reference states that a generated reference usually omits. Every paged response is
`{ items, page, pageSize, total, totalPages }` with no exceptions, which is SPINE's shape. Every numeric
field names its unit plus its base-unit convention. Every amount is a decimal string with its `token`
plus `decimals` beside it rather than a float. Every value carries its `freshness` triple of block,
timestamp then source, with the reference saying which fields can be stale plus by how much. Rate limits
are published as a number in the docs and echoed in `RateLimit-Limit`, `RateLimit-Remaining` plus
`RateLimit-Reset`, with `Retry-After` on a 429; the numbers themselves come from `14-GAPS.md` and
`15-SYSTEM.md`, the publishing contract is ours.

### `/docs/conformance` plus the self-check

Twenty-eight assertions, one row each, with the surface, what it asserts, the failure class then whether
it is a hard gate, a soft finding or a badge (`04-AGENT-PROTOCOL.md`). The published table is the code's
own table, generated from the suite rather than transcribed.

`/docs/conformance/self-check` runs the identical assertions against a URL the operator supplies and
returns the identical output we would store, including `verdict`, `httpStatus`, `latencyMs`,
`failureClass` plus `observedAt`. One rule is published beside it and it is the rule the index we are
compared against breaks: **a `skip` never counts as a pass and never contributes to a tier.** 8004scan
marks 11 of 15 declared services `skipped` then reports `health_score: 100.0` for the same agent
(`R12-agent-comms.md`), so publishing the rule is a differentiator rather than pedantry.

The suite also ships as an installable CLI so it runs in an operator's own CI. That is the one artifact in
this build whose value rises with adoption, which is why its licence differs from the entry's (section 6).

**The hosted runner sits below `15-SYSTEM.md`'s cut line, so this section names its fallback.** That
document's cut list carries "the operator self-check runner, keeping the published assertion list", so a lost
day takes the hosted form and leaves the twenty-eight-row table plus the CLI in the repository. If it goes,
what still ships is the assertion table generated from the suite, the `skip` rule published beside it, then
the CLI an operator clones and runs against their own URL. The rule that a `skip` never passes is a
published assertion rather than a feature of the hosted page, so it survives either way. Condition 4 in
section 4 is written against that fallback for the same reason.

## 4. What must be true for a stranger to integrate without asking us anything

Ten conditions. Each one has a test, because a claim about a stranger's experience that nobody ran is a
guess.

| # | Condition | The test |
| --- | --- | --- |
| 1 | **No credential anywhere on the read path.** No key, no signup, no wallet, no invite, no allowlist | a fresh browser profile plus a bare `curl` reach every documented read endpoint and get 200 |
| 2 | **An OpenAPI 3.1 document that validates and generates a working client** | a generated client compiles then completes one paged read against production |
| 3 | **The card schema published at a versioned URL** with a minimal example that validates | the published example passes the published schema, asserted in CI |
| 4 | **The conformance suite runnable by the operator**, same code, same output | the hosted self-check plus the CLI produce byte-identical verdicts on one URL. Where the hosted runner is cut, the CLI cloned from the repository against the published assertion table is the test, run on one URL with the verdicts recorded |
| 5 | **A worked end-to-end example**: the smallest conforming agent plus the exact `curl` sequence for 402, pay, then 200 replay | a copy-paste run from the page reaches a settled payment on testnet over **Permit2**, which is the testnet rail. No chain-97 token implements EIP-3009 (`SPINE.md`), so the one-signature mainnet sequence this document teaches cannot settle on 97 and the page says so rather than letting a reader conclude the docs are wrong. Permit2 at `0x000000000022D473030F116dDEE9F6B43aC78BA3` plus the x402 proxy at `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` are both deployed on 97. An ERC-8183 job against the 900 s testnet policy is the second acceptable path. SPINE also flags the chain-97 `$U` plus USDC addresses and decimals as contradictory across files, so the page pins one token and prints the `decimals()` call that proves it |
| 6 | **Every constant in one machine-readable file** at `/docs/constants.json`: chain id 56, the three registry addresses, the kernel, router plus policy, the settlement tokens with their decimals and EIP-712 domains, Multicall3, the fee bps plus floor, the probe cadence, the published timeouts | a boot-time assertion reads `decimals()` on chain then fails loudly if it disagrees with the file |
| 7 | **Every published number recomputable**: `score.json` per listing, `receipt.recomputeCommand` per receipt, the measurement scripts plus their seed | a stranger reproduces one score plus one receipt without contacting us |
| 8 | **No hidden coupling in the hire path.** Nothing depends on a partner credential, an invite or an allowlist | grep the hire path for an env-gated branch, then run the whole flow from a wallet we have never seen |
| 9 | **Support is public, not a DM.** A public issue tracker, a public `status` page then one published role address for notices plus authority requests, with a declared language, which is the whole of DSA Art 11 at our scale (`R15-compliance.md`) | the address is on the site plus in the repo and it receives mail |
| 10 | **Machine discovery works**: `llms.txt`, `openapi.json`, an `mcp` server whose tool names collide with neither 8004scan's nor a rival's, plus stable URL patterns | fetch all four anonymously, then call one `mcp` tool from a clean client |

Condition 8 is the one with a measured lesson behind it. A live marketplace gated listing creation behind
an email beta whitelist with backend error code 10016. The fix was to apply on day one
(`R16-reuse.md`). Muster's version is stronger because there is nothing to apply for: every check on the
onboarding path runs on keyless calls, `eth_call` over a public RPC, Multicall3 at
`0xcA11bde05977b3631167028862bE2a173976CA11`, the BABT plus Galxe contracts, the BNB Passport reader, the
Chainalysis oracle, the OFAC SDN CSV then one unauthenticated 8004scan write lever
(`05-ONBOARDING.md`).

**The drill that proves the section.** Before submit, from a machine with no cookies, no wallet, no keys
plus no session: fetch every URL the submission and the docs cite, follow the operator quickstart against
a fresh host, follow the buyer quickstart to a settled hire, then record the transcript in the repo. Our
own `gh` and browser sessions are authenticated so they prove nothing about a stranger. That is the same
posture the repo-visibility flip demands, where an anonymous fetch has to return 200 rather than our own
authenticated read (`02-THESIS.md`).

## 5. Disclosure

Five parts, each written so a reader can falsify it rather than take it on trust. A disclosure nobody can
check is marketing.

### 5.1 AI use

**What we say.** AI assistance (Claude, Anthropic) was used to write code, documents plus measurement
scripts for this project. The author owns the design, ran the verification then submits and defends the
work. The verification is named rather than asserted: which tests pass, which measurements were executed,
against which chain and at which block.

**Where it goes.** In the submission body, in the repository README, on `/docs/disclosure`, then in the
demo video description alongside the synthesised-narration line. Not in commit trailers, because a
disclosure in the place the programme reads is the point and repetition past that is noise.

**The honest limit.** We never claim a human reviewed code no human read. Where a document or a module was
drafted by AI then verified by running it rather than by line-by-line human review, the disclosure says
that.

**One unverified item that does not change what we do.** Two facts, kept apart because they are different
facts. The hackathon page plus the launch blog were both read and neither states an AI-disclosure rule, an
absence checked on both (`00-PROGRAM.md`). What could not be read is the DoraHacks rules text behind the
WAF: every API path tried returns HTTP 405 with a human-verification page, while `bnbchain.org/en/hackathon`
renders client-side so a scripted fetch yields navigation text rather than terms (`R15-compliance.md`). So
the requirement is **unverified** only in that narrower sense, a document we could not reach rather than a
page that said nothing. We disclose anyway, because the cost of disclosing where it was not required is zero
and the cost of the reverse is disqualification.

### 5.2 First-party agents

`02-THESIS.md` decides the eight clauses. This is the published wording plus the two artifacts that make
them checkable.

**The artifacts.** A machine-readable list of our operator addresses at a stable URL and in the repo, then
a derived label on every surface a listing appears on. The label is computed from that list at render time
rather than stored, so it cannot be forgotten: a flag someone has to set is a flag someone can fail to set.

**The published wording, per agent.** All three reasons hold at once for each of the four, so the line is
not a choice between them (`02-THESIS.md` clause 6). These are the four lines, published on the listing
itself:

| Listing | The published line |
| --- | --- |
| `rebalancing` | Built and run by Muster. It is the reference implementation of the rebalancing category contract, the target the conformance suite asserts against plus the category's floor price. |
| `grid` | Built and run by Muster. It is the reference implementation of the grid trading category contract, the target the conformance suite asserts against plus the category's floor price. |
| `yield` | Built and run by Muster. It is the reference implementation of the yield category contract, the target the conformance suite asserts against plus the category's floor price. |
| `health-factor` | Built and run by Muster. It is the reference implementation of the health factor category contract, the target the conformance suite asserts against plus the category's floor price. |

Four identical sentences differing only in the category is the honest shape, because the reason is identical
in all four cases. Writing four different justifications would imply four different commercial motives.
P2B Art 7(1) requires a platform to describe "any differentiated treatment which they give, or might give" to
its own supply with "the main economic, commercial or legal considerations", while Art 7(3)(b) names ranking
explicitly (`R13-prior-art.md`). Our published answer to the ranking half is that there is no
differentiated treatment: no term in the ranking function reads the first-party list. We hold ourselves to
the DMA Art 6(5) wording on self-preferencing voluntarily, since we are not a gatekeeper
(`R13-prior-art.md`).

**Split counting, with the third-party number as the headline.** Every published count separates
first-party from third-party for candidates, answering, hireable, settled jobs then turnover. Jobs we paid
for ourselves carry `origin: house`, enforced by the ledger at append time rather than by a display rule,
and revenue plus volume count `origin: order` only. First-party share of hireable rows per category is a
published number we want to fall.

**What would make this false.** A count that mixes our supply with the ecosystem's. A `house` job counted
as revenue. A first-party row rendered without its label on any one surface. A reference agent ranked above
a third-party agent that beat it on the category metric.

The comparison worth naming: GitHub Marketplace does not distinguish its own actions from third-party ones
in its listings and its trust signal is a partner badge rather than a first-party badge, so the prior art
here is a gap rather than a template (`R13-prior-art.md`). Shipping the label puts us ahead of the closest
comparable.

### 5.3 The measurement methodology

Every population number Muster publishes comes from one sampling procedure, published in enough
detail to re-run in any language. This is the cheapest Data Quality point in the build because
it converts a claim into a reproduction.

| Parameter | Value | Why it matters to a reader |
| --- | --- | --- |
| Generator | splitmix64 with three fixed constants, no `Math.random` anywhere | the same draw comes out of python, go or rust |
| Seed | `20260905` | fixed in the file rather than passed in, so a run cannot be cherry-picked |
| Range | ids 0 to 334,923 inclusive, pinned to `_lastId - 1` read at block 120,025,020 | the draw survives registry growth, so the sample is not silently re-based |
| n | 600 | a 2% finding gets a 95% interval of about 1.2 to 3.5 points |
| Method | distinct ids, rejection-sampled, no replacement | rejection rather than modulo, so there is no modulo bias |
| Interval | Wilson 95% on every share | a share with no interval is not a measurement |
| Uniformity check | decile counts 50, 51, 54, 64, 66, 76, 51, 63, 67, 58, chi-square 11.13 on 9 degrees of freedom against a 16.92 critical value | the draw is uniform on the evidence rather than on assertion |
| Population cross-check | sample shares against 8004scan's own population shares over its 304,281-row BSC index: A2A 8.67% against 9.19%, MCP 2.00% against 1.77%, OASF 0.00% against 0.12% | three independent agreements on a uniform draw. `SPINE.md` reserves "the second index" for trust8004, which is a different source and not the one behind these figures |
| Excluded | ids 0 and 1 are read but excluded from every "of 600" count | they were appended for claim checks rather than drawn |

All of it from `MEASUREMENT.md`, which carries the generator source, the first eight ids in draw order plus
the command that re-derives the saved id list byte for byte.

Four presentation rules go with it. Every published population figure carries its block height plus its
timestamp, never bare. Every share carries its interval. A number we corrected is shown as corrected with
the earlier claim named, which is why the funnel reads 12 of 600 machine-callable rather than the earlier
"2 of 400 publish a callable endpoint" that sat between two tiers without saying which
(`MEASUREMENT.md`). And four figures are re-read the day the submission goes out because they move on their
own: the agent count from `_lastId`, the ERC-8183 job plus settlement totals, 8004scan's own status and
freshness, then the rival check for a settled mainnet ERC-8183 job (`02-THESIS.md`).

### 5.4 Real against staged

The table that protects the entry. Four statuses and no fifth: `live` means it runs in production and a
stranger can reach it, `testnet` means it is real on chain 97 and labelled as such, `unexercised` means the
mechanism is built and published but nothing has passed through it, `not built` means exactly that. Nothing
is described as shipped that is not `live`.

| Claim | Status | How a reader checks it |
| --- | --- | --- |
| Index over the whole registry, `_lastId` read plus a full id sweep | `live` | the count on the page against the storage slot, both with the block |
| Probe results, tiers T0 to T3, failure classes kept separate | `live` | any listing page, plus the off-shelf drawer broken out by reason |
| One EIP-3009 hire on BSC mainnet with our submitter paying gas | `live` | the `receipt`, the transaction hash then the token's `authorizationState` |
| A funded ERC-8183 job on the official mainnet kernel at a third-party price | `live` | `getJob(jobId)` `0xbf22c457` on `0xEa4DAa3100A767e86FDed867729ae7446476EBA6` |
| A settled ERC-8183 job on the 900 s testnet window | `testnet` | `getJob` on the chain-97 kernel, labelled testnet everywhere it appears |
| The `settler` calling permissionless `settle` for jobs that are not ours | `live` | the transaction list from our submitter address |
| Altana sessions with an allowlist, a spend cap plus an expiry, revocable in product | `live` | `canExecutePackedInfos` `0xe5adda71`, `spendInfos` `0xdcc09ebf`, `getExpiry` `0x3b49ad47`, plus the public explorer key page |
| Wallet screening at quote then at settlement | `live`, with a published limitation | the four calls, plus our own statement that the oracle flags 57 of 91 SDN EVM addresses and misses 20 of the 42 that are active on BSC (`R15-compliance.md`) |
| A Validation Registry request plus response on BSC mainnet, both first-party | `unexercised` until the pair is written, `live` once it is. First use of that registry as far as we measured, either way | `getAgentValidations` `0x8d5d0c2d` on the agent, plus `getValidatorRequests` against the validator address we publish, which returns the request a stranger can read without trusting us. Three qualifiers travel with this row rather than sitting in another one, because a reader joins two rows the wrong way round. The validator address is ours: no third-party validator service exists on BSC, so whatever validator this venue names has to be ours (`R01-erc8004.md`). `validationRequest` is owner-gated: from a random EOA it reverts `Not authorized` and only the agent owner succeeds, so the pair can only ever exist on a listing we own (`R01-erc8004.md`). Zero validations existed across 1,999 sampled ids before ours and 8004scan reports `total_validations: 0` on every chain it covers. So this is a self-issued request answered by our own validator, which is the claim. It is not a claim that a third party validated anything (`09-DISPUTES.md`, `three/decisions/10-docs-validation-registry-status.md`) |
| `E1 Bonded` with real slashing | `not built` | the tier is published, the stake is not live, then the money-transmitter analysis for holding a bond is attached |
| B402 as the facilitator | `not built` | its authenticated base URL, its signer plus spender addresses and its BSC settlement token are all **unverified** and unpublished (`R03-x402-b402.md`) |
| A dispute panel beyond published policy | `not built` | at this scale the decider is us, under a published rule |
| Third-party validators | `not built` | none exists on BSC. `validationRequest` is owner-gated, so a validation on a listing we do not own needs a standing approval whose acceptance by the registry is **unverified** (`R01-erc8004.md`) |
| Greenfield evidence storage | `not built` | its billing behaviour is **unverified**, including whether a dry payment account deletes data |
| DSA Art 30 trader verification | `not built` | the schema exists, the self-certification is collected, the identity-document fields are defined and empty |
| Art 21 out-of-court dispute settlement plus P2B Art 12 mediators | `not built` | published as next, with no body named |

Two rules attached to the table. Anything staged for the demo video carries its label on screen for the
whole shot rather than in the description. And a status can only move down without a change to the product:
if a claim breaks, the table changes before the marketing does.

### 5.5 Who is behind this, plus what that costs a buyer

The buyer terms carry this as a term. The disclosure carries it as a fact, because a reader who never opens
the terms still needs it and because several duties in the set attach to an entity rather than to a product.

**There is no legal entity behind this submission.** It is an individual entrant's build. Three consequences
follow and each is published rather than glossed (`14-GAPS.md` section 7.6):

- **No tax registration**, so no invoice and no VAT position. The receipt plus its export ship, a tax
  document does not.
- **Trader verification is out of scope.** The schema exists, the self-certification is collected at
  listing, the fields that would carry an identity document are defined and empty. Claiming verification
  that did not happen is the worse answer.
- **No governing-law or forum clause anywhere in the set**, with the reason published beside the absence.
  Naming a jurisdiction for a party with no legal existence gives a buyer nothing to enforce against, so a
  clause would read as a remedy where there is none. What exists instead: one published role address with a
  declared language, English, which is also the law-enforcement intake, plus a public issue tracker.

**What the design was built against, named rather than claimed.** The EU and UK texts this document cites
throughout: P2B 2019/1150, the Consumer Rights Directive as amended, the Digital Services Act, MiCA, MiFID
II's delegated regulation, GDPR with the EDPB guidance on blockchain, then the FCA handbook's COBS 4.12A
rules. Those are a design input rather than a legal opinion. The venue is not assessed against any of
them by anybody. That is why "compliant with" appears nowhere on the site.

**The jurisdiction posture, which is a design choice rather than a geography.** The programme is global and
the submission has to stay publicly reachable through judging, so a geo-block would break eligibility. The
perimeter that does real work is wallet screening rather than a country list: the oracle read plus our own
SDN ingest with the chain tag ignored, because 20 of the 42 BSC-active addresses on today's list are
invisible to the oracle alone (`R15-compliance.md`, `09-DISPUTES.md`).

## 6. The licence posture

### The test, applied once

An artifact is either a **contribution** meant to be adopted or an **entry** meant to win. Contributions
take permissive terms. Entries take source-available no-derivatives, SPDX
`LicenseRef-zkasuran-SAND-1.0`, because a permissive licence on a competition artifact is the permission to
fetch it, append a few bytes then register the result as a rival entry. That is not hypothetical. We have
watched a permissive licence used, lawfully, to re-register a competition artifact with a few bytes
appended, which is why the default is what it is.

What SAND-1.0 actually grants matters, because a reader who assumes it is a no-rights licence will
misjudge it. It grants use for **any** purpose including commercially, running the software including
inside a paid service, reading, decompiling, instrumenting, benchmarking plus publishing what you learn,
keeping copies to verify a hash or reproduce a measurement, plus a patent licence. It withholds exactly two
things: redistribution and derivative works. It also grants nobody the right to present the work as their
own in any registry, protocol, competition or marketplace. Every verification claim a judge might want to
make is inside the grant, which is the point of choosing source-available over closed.

### The split, artifact by artifact

| Part | Entry or contribution | Licence | Reason |
| --- | --- | --- | --- |
| The marketplace app: shelves, listing pages, compare, search, the hire flow, `/coverage`, `/report` | **entry** | SAND-1.0 | this is the thing being judged. A rival with two empty shelves could fork the four category surfaces during the submission window |
| The score, the ranking function, the matcher | **entry** | SAND-1.0 | the differentiator plus the most copyable files in the tree |
| The indexer, resolver, prober, classifier, ledger, broker, facilitator | **entry** | SAND-1.0 | the data path is the product. Publishing it for reading is the transparency claim, publishing it for forking is handing over the entry |
| The published policy documents plus the docs site prose | **entry** | SAND-1.0 | a field that publishes no terms at all can clear the marketplace-quality bar by pasting ours. Reading, quoting facts plus a buyer's retained copy are all permitted, republication is not |
| The compliance layer: screening client, SDN ingest, verdict store, notice plus statement-of-reasons machinery | **contribution** | Apache-2.0 | it should be adopted by the Studio and by every rival, wider adoption makes the whole venue safer and none of it is a shelf. Apache rather than MIT for the patent grant plus the `NOTICE` requirement, which suits code others will vendor |
| The conformance kit plus its CLI | **contribution** | Apache-2.0 | if rivals run our assertions then our definitions become the ecosystem's, which is worth more than exclusivity over twenty-eight probes |
| The four reference agents plus their adapters | **entry now, contribution on a published date** | SAND-1.0 with a change date of **2026-09-24** and a change licence of **Apache-2.0** | see below |
| The card schema, plus any ERC-8004 registration profile we publish | **contribution** | CC0-1.0 | a schema only works if everyone can implement it and CC0 matches how ERC-8004 itself is licensed (`R15-compliance.md`) |
| Any PR into `pancakeswap/*`, `bnb-chain/*`, `ChaosChain/trustless-agents-erc-ri`, `x402-foundation/x402` or an Altana repo | **contribution** | whatever that repo uses | a PR takes the target repo's licence. Not a choice |
| The research documents behind this build | **internal** | not published | they carry rival tracking plus defence notes and are not part of the submission |

**Where MIT is the right answer and where it is not.** MIT is correct in exactly one place here: a PR into
a repository that uses it, which is not a choice we make. Two of the repositories we may contribute to sit
there, `ChaosChain/trustless-agents-erc-ri` under a clean MIT grant and TermiX's `bsc-mcp` under a declared
MIT with no `LICENSE` file behind it (`R15-compliance.md`, `R07-termix.md`). MIT would also be right for a
standalone helper library whose only goal is adoption with no patent surface, which is not something this
build produces: the two things we want adopted both touch other people's compliance obligations, so the
patent grant plus the `NOTICE` requirement in Apache-2.0 are worth the extra file.

**The reference agents are where this document departs from its research.** `R15-compliance.md` puts them
under Apache-2.0 immediately, on the argument that extensible agents are worth more to the ecosystem than
closed ones. That argument is right about the ecosystem and wrong about the window. The strongest rival by
build volume ships with Rebalancing and Health factor both reading "Unverified, empty" and a README
conceding "Current third-party activation coverage is empty" (`R14-rivals.md`). A permissive licence on
four working agents in the four mandated categories, published four days before the close, is a
shelf-filling kit for exactly that rival, while Agent Diversity is one of the three published criteria. So
the agents ship SAND-1.0 with a change licence of Apache-2.0 plus a published change date of 2026-09-24,
the day after judging closes. The commitment is published up front in `LICENSE-HISTORY.md` rather than
announced later, so it is a term rather than a favour. It applies our own rule that a licence change is
dated, bounded then irrevocable backwards, in the forward direction.

### The licence goes in the bytes

Terms that live only in a repository are terms a holder never sees, because a file fetched from a raw URL
arrives with no `LICENSE`, no `NOTICE` and no README. For a web product the published bytes are the served
bundle plus the JSON documents, so:

- Every source file carries an SPDX identifier line. Two identifiers exist in the tree,
  `LicenseRef-zkasuran-SAND-1.0` at the entry root and `Apache-2.0` inside the two contribution
  directories. A directory boundary is a licence boundary with its own `LICENSE` plus `NOTICE`.
- Every built bundle carries a banner comment with the SPDX id, the version then the repository URL.
- Every JSON document we author and publish carries a `license` string field with the SPDX id: the card
  schema, `constants.json`, each `contract.json`, each `score.json` then every export.
- `/docs/api/openapi.json` populates `info.license`, `info.termsOfService` plus `info.contact`, which is
  precisely the block 8004scan leaves empty (`R15-compliance.md`).
- The publish step verifies all of that and refuses a release where any published artifact is unstamped.
  The rule is that the build refuses rather than that somebody remembers.

Six files ship at the repository root and each has one job:

| File | What it holds |
| --- | --- |
| `LICENSE` | SAND-1.0, the full text, unmodified |
| `LICENSE-HISTORY.md` | the one forward commitment in the build: the four reference agents change to Apache-2.0 on 2026-09-24, which grant covers which period, the boundary commit, then the line saying anyone who obtained a copy under the earlier terms keeps them and owes nothing. It is the only artifact carrying that term, so it is a root file rather than a paragraph inside another one |
| `NOTICE` | every third-party component with its own terms, its copyright line where one exists then the path it appears at. Where a project declares a licence with no `LICENSE` file, the `NOTICE` row names the declaration plus its absence rather than inventing a copyright line |
| `DATA-SOURCES.md` | one row per third-party input with the granting clause quoted or an explicit "no terms found" note. The publish step refuses a row with neither |
| `PROVENANCE.json` | generated by fingerprinting every published file then grouping each build with its base. Three lineage states only, `own`, `source_fork` then `binary_wrap`, where `binary_wrap` must read zero |
| `ADOPTION.md` | that SAND-1.0 is our default outbound licence rather than a refusal to grant, plus that terms for a named adoption are a separate instrument available on request |

`ADOPTION.md` exists because of a real tension worth recording rather than glossing. The prize is "official
adoption as the BNB Agent Studio marketplace", which would need rights to run, host then modify the app,
and SAND withholds the last of those. Those are compatible in the way that matters: a named adoption grant
is a separate negotiated instrument on top of the default. So we do not pre-assign anything and we do not
license the entry permissively to look cooperative, because that hands the fork to every rival at the same
time. Whether adoption comes with a contract, a licence grant or an assignment is **unverified**, since
nothing we could reach says either way (`R15-compliance.md`).

The programme's own IP and licensing terms are also **unverified** for the reason in section 5.1. That is a
reason to be conservative rather than a reason to guess. If those terms turn out to require a permissive
licence on submissions, that is a decision made with the actual clause in front of us before the form is
filed, not a default.

### Every third-party input, with the granting clause

Each clause below was read from the source named in the last column. This table is the content of
`DATA-SOURCES.md` and the input to `NOTICE`. Every package the build imports has a row, every RPC endpoint
the build calls has a row. Where a clause could not be read the input sits in the flagged table two
sections down instead of being left out.

| Input | Grant | Quoted clause or SPDX id | Read in |
| --- | --- | --- | --- |
| EIP-8004 text | CC0 | "Copyright and related rights waived via CC0" | `R15-compliance.md` |
| EIP-8183 text | CC0 | "Copyright and related rights waived via CC0" | `R15-compliance.md` |
| EIP-3009 text | CC0 | "Copyright and related rights waived via CC0" | `R15-compliance.md` |
| `ethereum/ERCs` | CC0-1.0 | SPDX `CC0-1.0` | `R15-compliance.md` |
| ERC-8004 contracts README plus examples | CC0 | its License section reads "CC0 - Public Domain" | `R15-compliance.md` |
| `ChaosChain/trustless-agents-erc-ri` | MIT | SPDX `MIT` | `R15-compliance.md` |
| `@altananetwork/sdk` 0.9.0 | Apache-2.0 | npm manifest `"license": "Apache-2.0"`, plus the SDK README License section reading "Apache-2.0" | `R15-compliance.md`, `R06-altana.md` |
| `@altananetwork/mcp` 0.9.0 | Apache-2.0 | npm manifest `"license": "Apache-2.0"`, plus a full Apache License 2.0 text at `LICENSE` inside the published 0.9.0 tarball | npm registry plus the 0.9.0 tarball, read 2026-09-05 |
| `@bnbagent/studio-cli` 0.0.13, the `bag` CLI | Apache-2.0 | npm manifest `"license": "Apache-2.0"`. Build-time and operator-facing only, we redistribute none of it. Apache-2.0 requires the `NOTICE` row either way | `11-BNB-STACK.md`, npm registry read 2026-09-05 |
| `@bnbagent/sdk` 0.5.5, the official Studio SDK | MIT | npm manifest `"license": "MIT"` | npm registry read 2026-09-05 |
| `coinbase/x402` | Apache-2.0 | SPDX `Apache-2.0` | `R15-compliance.md` |
| `x402-foundation/x402` | Apache-2.0 | SPDX `Apache-2.0` | `R03-x402-b402.md` |
| `VenusProtocol/venus-protocol`, `VenusProtocol/isolated-pools` | BSD-3-Clause | SPDX `BSD-3-Clause` | `R15-compliance.md` |
| `OpenZeppelin/openzeppelin-contracts` | MIT | SPDX `MIT` | `R15-compliance.md` |
| `wevm/viem` | MIT | "MIT License / Copyright (c) 2023-present weth, LLC". GitHub's licence API reports NOASSERTION while the file itself is plain MIT, so the file is what `NOTICE` quotes | `R15-compliance.md` |
| `wevm/wagmi`, `vercel/next.js` | MIT | SPDX `MIT` | `R15-compliance.md` |
| `foundry-rs/forge-std` | Apache-2.0, dual with MIT | SPDX `Apache-2.0` at `LICENSE-APACHE` | `R15-compliance.md` |
| `lucide-react` | ISC | npm manifest `"license": "ISC"` | `R15-compliance.md` |
| Inter font | OFL-1.1 | SPDX `OFL-1.1` on `rsms/inter` | `R15-compliance.md` |
| `dompurify` 3.4.14 plus `isomorphic-dompurify` 4.1.0 | MPL-2.0 or Apache-2.0, our choice | npm manifest `"license": "(MPL-2.0 OR Apache-2.0)"`. We take Apache-2.0 and say so in `NOTICE` | `R12-agent-comms.md` |
| `bsc-rpc.publicnode.com`, the interactive read endpoint, operated by Allnodes | terms exist and restrict | "you will not engage in or use any data mining, robots, scraping, or similar data gathering or extraction methods", warranties disclaimed, liability capped at "THE AMOUNT YOU HAVE PAID", California courts, one-year limitation | `R15-compliance.md`, read live from `publicnode.com/terms` |
| Chainalysis sanctions oracle, reading it | no grant needed | "The smart contract is available for anyone to use and does not require a customer relationship with Chainalysis." Their disclaimer travels with it: it "cannot guarantee the accuracy, timeliness, suitability, or validity of the data" | `R15-compliance.md` |
| ERC-8004, ERC-8183, token plus DeFi contract state, read over ABIs we declare ourselves | no grant needed | public contract state on a public chain | `R15-compliance.md` |

Attribution we actually owe, rather than attribution as a gesture: Apache-2.0 requires the `NOTICE` to
travel, MIT requires the copyright line, ISC plus BSD-3-Clause require their notices, OFL-1.1 requires the
font's own terms to ship with the font. Each goes in `NOTICE` with the path it applies to. A licence that
requires attribution is not satisfied by a link.

### Conditional grants that needed a decision

**Aave v3, BUSL-1.1.** The Additional Use Grant reads: "Your use of the Licensed Work shall not, directly or
indirectly, enable, facilitate, or assist in any way with the migration of users and/or funds from the Aave
ecosystem." Change Date is "the earlier of 2027-03-06" or a date recorded on chain, with Change License MIT
(`R15-compliance.md`). Aave v3 is live on BSC at Pool `0x6807dc923806fE8Fd134338EABCA509979a7e0cB` with
`POOL_REVISION()` 11, so the clause is live for us. The decision: **no Aave source is vendored.** Positions
are read through the deployed contracts over interfaces we declare, Aave data is presented as measurement,
the health-factor comparison shows Aave as an option rather than as the thing to leave, then the
health-factor agent runs on Venus, which is BSD-3-Clause with no use restriction and is the deeper BSC lender
anyway (`R09-bsc-defi.md`).

**PancakeSwap Solidity, GPL-2.0 plus GPL-3.0.** `infinity-core` and `infinity-periphery` are GPL-2.0,
`pancake-swap-core` and `pancake-swap-periphery` are GPL-3.0, `pancake-v3-contracts` has no root `LICENSE`
and carries `// SPDX-License-Identifier: GPL-2.0-or-later` per file, while `pancake-swap-sdk` and their
`permit2` are MIT (`R15-compliance.md`). Reading a deployed pool over an ABI creates no derivative work and
needs no grant. Copying `.sol` into our tree would put a copyleft obligation on the combined work, which
collides with SAND-1.0 on the entry side. The decision: **no vendored Solidity.** We declare the interfaces
we need, we read over ABIs. If a PancakeSwap math library is ever genuinely required it lives in its own
package under its own licence, outside the SAND-licensed tree.

**`@altananetwork/x402-server` 0.2.0, GPL-3.0-or-later.** Read from the npm registry plus the published
0.2.0 tarball on 2026-09-05: the manifest declares `"license": "GPL-3.0-or-later"` and the tarball ships no
`LICENSE` file at all, only `README.md` plus `dist`. That matters because `13-PARTNERS.md` puts one
`@altananetwork/x402-server` guarded route on our public invoke path, which would import a strong copyleft
package into the SAND-licensed entry tree. It is the same collision as the PancakeSwap Solidity above and it
gets the same answer. The decision: **it does not enter the SAND tree.** Two ways to satisfy that. The
guarded route lives in its own package with its own `LICENSE` outside the entry root, distributed under
GPL-3.0-or-later on its own terms. Or the guard is written by us against the published x402 envelope
(`R03-x402-b402.md`), which is a wire format rather than code we take. Which one ships is an operator
decision before the flip. The flip checklist blocks until one is chosen and recorded. The sibling packages
are unaffected: `@altananetwork/sdk` 0.9.0 plus `@altananetwork/mcp` 0.9.0 are both Apache-2.0 and both have
rows above. `R06-altana.md` reads the 0.2.0 tarball for `U_TOKEN` plus `USDT_BSC` without recording its
licence, so this is a correction to the licence picture rather than a disagreement about the package.

**OpenSanctions, CC BY-NC 4.0.** "The data is licensed under the terms of Creative Commons 4.0 Attribution
NonCommercial" (`R15-compliance.md`). A marketplace taking a 200 bps fee is commercial use. The decision:
**not in the shipped path at all**, not even for a demo, because a demo dependency becomes a shipped
dependency. Screening runs on the Chainalysis oracle plus our own OFAC SDN ingest, both of which are free of
that restriction.

**`bsc-rpc.publicnode.com`, operated by Allnodes.** Its terms prohibit "any data mining, robots, scraping, or
similar data gathering or extraction methods", disclaim warranties, cap liability at "THE AMOUNT YOU HAVE
PAID", then choose California courts with a one-year limitation (`R15-compliance.md`). It is fine for
interactive reads and it is not a basis for bulk indexing. So the workload is split across three endpoints
and the `README` says which one does what.

| Endpoint | Workload | Why this one |
| --- | --- | --- |
| `https://bsc-rpc.publicnode.com` | interactive single reads, the published `cast` commands | fastest to answer one call. Interactive reading is what the Allnodes terms permit |
| `https://bsc.rpc.blxrbdn.com` | the id sweep plus every batched read, including the four screening calls | `SPINE.md`'s verified keyless batcher, 200 calls in 0.27 s. It returned all 200 results in one batch when re-run on 2026-09-05 |
| `https://bsc-mainnet.public.blastapi.io` | any read pinned to a past block | publicnode refuses a historical block outright, verified: a pinned `eth_call` returns `-32001 block not found` |

**`bsc-dataseed.binance.org` is not the batch endpoint, for a measured reason rather than a
preference.** It silently truncates: a 200-call batch returns HTTP 200 with exactly **one** result, "which
looks like data loss rather than an error" (`MEASUREMENT.md`). Re-run on 2026-09-05, 5 items returned 5, 20
returned 20 then 200 returned 1. On a screening path that failure is the worst available shape, because
addresses that were never checked come back inside a verdict that reads clean, which is the one thing the
four-call screen exists to prevent. The earlier premise behind naming it, that publicnode refuses batches
with HTTP 403, no longer holds: publicnode returned all 200 results in one batch on 2026-09-05, with its own
endpoint table in `MEASUREMENT.md` recording the same. The 403 reproduces only from a client whose user
agent the endpoint blocks, so it was a client fact rather than an endpoint fact.

So the screening client carries one hard assertion regardless of endpoint: **`results.length` must equal
`requests.length`. A short batch is a refusal to serve rather than a clean result.** Each response is
matched back to its request by JSON-RPC `id` rather than by array position, a missing id fails the whole
screen, then the batch is capped at 100 calls with the cap published beside the cadence. A truncated reply
raises the same failure a network error raises, because a screen that cannot prove it checked every address
has not screened anything.

### Inputs whose grant could not be found

Each row is a flag with a decision attached, because a warning without a decision gets read then ignored.

| Input | What is missing | Decision |
| --- | --- | --- |
| `pancakeswap/pancakeswap-ai` | `package.json` says `"license": "MIT"` and the README says "MIT License", but there is **no LICENSE file** and GitHub's licence API returns `"license": null`. The manifest also marks the repo `"private": true` (`R15-compliance.md`) | do not copy code from it. Cite its published skill documentation as a public document when correcting a number, which is fair reporting rather than reuse |
| `pancakeswap/erc-8183-example` | no LICENSE file, no licence key in `pyproject.toml`, no licence line in the README. Nothing anywhere (`R15-compliance.md`) | **no permission to copy.** Absence of terms is not permission. Read it to learn the call sequence, then write our own against ERC-8183, which is CC0, plus the deployed contracts. Never paste |
| TermiX `bsc-mcp` | 42 files, none named LICENSE. The MIT grant exists only as `package.json` `"license": "MIT"` plus one README line (`R07-termix.md`) | a PR into it is a contribution under their declared terms, which is fine. Any reuse of their code in our tree needs a `NOTICE` row naming the repo plus the declared grant rather than a copyright line that does not exist |
| 8004scan API responses | the OpenAPI `info` object at `0.4.363` carries no `termsOfService`, no `license` and no `contact`, `/terms` 404s and other legal paths 307 to a stub (`R15-compliance.md`) | use it as a cross-check plus a profile link, never as the source of a published number. Anything Muster asserts publicly is re-derived from the on-chain registry, which needs no grant. No bulk redistribution of its output |
| The free 8004scan participant tier | the tier itself is programme ground truth, its usage terms are not published (`R15-compliance.md`) | same rule. A rate-limit grant is not a data licence |
| TermiX listings, skill docs plus site data | no terms page at `/terms`, `/legal/terms` or `/privacy`, all 404. The footer reserves rights rather than granting them (`R15-compliance.md`) | read for research, cite as a public page, copy nothing. If the track needs an integration, build against a published interface and ask them for terms |
| OFAC SDN data | no licence, no terms and no copyright statement located on the download endpoints or the list landing page. US Government works sit outside US copyright by longstanding practice, but no granting sentence could be quoted (`R15-compliance.md`) | ingest it, credit Treasury as the source, record it in `DATA-SOURCES.md` as "no terms found, US Government work" rather than as a grant |
| Chainalysis free screening API | the endpoint plus the `X-API-Key` header are verified from a live 401, the response shape, the limits and the terms are not (`R15-compliance.md`) | not coded against. The oracle plus the raw SDN list are both keyless and both are what ships |
| Binance market-data licence terms for redisplay | **unverified** (`SPINE.md` unverified list) | a market price is used to choose a published constant then never redisplayed in the product (`08-MONEY.md`) |
| A2A plus MCP specification text | no licence read for either in this cycle | we copy no specification text and vendor no schema from either. We implement against them and require neither, which `04-AGENT-PROTOCOL.md` settles on evidence rather than on licensing |
| The SQLite driver plus the reverse proxy | `15-SYSTEM.md` section 6.1 adds both, the store driver behind `/var/lib/muster/muster.db` then Caddy in front, then records both grants as unverified because `R15-compliance.md` read neither | both are shipped dependencies, so each grant is read plus quoted into the table above before the flip. This row is the block: the flip checklist fails while either is unquoted, which is what `15-SYSTEM.md` points at this document's publish gate for |
| `bsc.rpc.blxrbdn.com`, the batch endpoint | no terms read in this cycle. The endpoint is verified keyless and verified to return 200 results in one batch, which is a capability rather than a grant | it carries the sweep plus the batched screening reads, so its terms are read plus quoted before the flip, the same block as the row above. Until then the fallback is publicnode at a lower batch size for interactive-scale work |
| `bsc-mainnet.public.blastapi.io`, the archive endpoint | no terms read in this cycle | same block. It serves only the pinned historical reads the published commands need, so if its terms forbid that use the pinned commands move to another archive provider rather than losing the pin |
| `bsc-dataseed.binance.org` | no terms read in this cycle | it is not on the shipped path at all after the truncation finding above, so nothing depends on its grant. Recorded here rather than dropped, because it was a load-bearing dependency in an earlier draft |
| The demo video's music track, the joyinsound no-copyright bed | it is described as a no-copyright track in our own build records and no granting sentence has ever been captured from the source page | the licence sentence is fetched plus quoted into the table above before the video is published. Failing that, the cut ships silent. The video is public even though the mp4 stays out of the repository, so this is a published third-party input and the publish gate applies to it in full |
| The programme's own IP, licensing plus AI-disclosure terms | unreachable, DoraHacks returns HTTP 405 behind an AWS WAF page and the hackathon landing page renders client-side (`R15-compliance.md`) | assume nothing. SAND-1.0 on the entry, Apache-2.0 on the two contribution directories, then read the actual terms before the submission form is filed |

### Before the repo flips public

The visibility flip is a publication. A publication with the wrong licence cannot be unpublished. In
this order: `LICENSE` present and correct for entry against contribution; `LICENSE-HISTORY.md` present,
carrying the 2026-09-24 boundary date for the four reference agents, which grant covers which period plus
the line that anyone holding a copy under the earlier terms keeps it; per-directory `LICENSE` plus
`NOTICE` on both Apache-2.0 subtrees; `NOTICE` naming every third-party component with its own terms;
`DATA-SOURCES.md` with a quoted clause or an explicit "no terms found" per row, which today means the
SQLite driver, the reverse proxy, the two batch and archive RPC endpoints plus the video's music track are
each read and quoted or the flip does not happen; the `@altananetwork/x402-server` decision taken and
recorded, so no GPL-3.0-or-later package sits inside the SAND tree; `PROVENANCE.json`
regenerated with `binary_wrap: 0`; every published artifact carrying its SPDX line, checked by the publish
step rather than by eye; no Aave source and no GPL Solidity in the tree; no code from either unlicensed
PancakeSwap repo; OpenSanctions absent; then no private file tracked, which means no form fill, no key, no
`.env` and no internal working notes. Last, the anonymous check: the repo page plus every URL the submission
cites fetched with no credentials, each returning 200. Our own authenticated reads pass either way, so they
prove nothing here.

## 7. What ships by 2026-09-09, what is documented as next

**Ships.** All nine documents at their URLs, each with a version, a `docHash` plus a `constantsHash`, all
generated from `policy-constants.json`. The changelog with its nine `1.0` entries. Acceptance capture at
claim as an EIP-191 signature over `docHash` plus at hire as two ticks with the wording stored, which needs
the three store extensions in section 1 and one build block, so it is claimed here only once
`15-SYSTEM.md` allocates that block. The `policy-log` hash chain with a public walk, on the same condition.
The docs site as specified: index, how-it-works, buyer quickstart, operator quickstart, the generated API
reference, `openapi.json` with `info.license` populated, the conformance table plus the hosted self-check,
the card schema, `constants.json`, the disclosure page, the changelog then the licence page. `llms.txt`. The
six root files. The real-against-staged table. The anonymous stranger drill, run and recorded.

**Two of those sit at or below `15-SYSTEM.md`'s cut line, so what survives is named rather than assumed.**
The hosted self-check is on that document's cut list, so if it goes the conformance table plus the CLI in the
repository are what ship, with stranger condition 4 tested against the CLI. A lost day 3 shrinks the docs
site to `/docs/how-it-works` plus the licence page, so the degraded set is those two pages, `constants.json`,
the nine policy documents at their URLs, the disclosure page then the changelog, because those seven carry
the terms a buyer accepted plus the licence a publication needs. The API reference, the conformance table,
the self-check, the card schema page plus `llms.txt` are what a lost day costs. Acceptance capture without a
build block is the third: if no block lands, it moves out of this list into the next one rather than being
claimed.

**Documented as next, never presented as shipped.** The conformance CLI published to a registry, which is a
packaging step rather than a design one, so the hosted self-check plus the repository are what ship. The P2B
Art 11(4) public complaint statistics, where the counter plus the four numbers ship and the annual
verification cannot exist yet. An Art 21 out-of-court dispute body plus P2B Art 12 mediators, neither named.
Translations of the nine documents, where only the currency plus unit rendering discipline lands now. A signed
policy bundle, so a reader could verify the whole set from one signature rather than nine hashes. Full DSA
Art 30 trader verification. A machine-readable statement-of-reasons feed, which we would publish for our own
accountability rather than because a text we read requires it of a venue this size.

One honesty line on the ship list. If a document has one entry in its changelog and one acceptance record
against it on 2026-09-09, that is what the page shows. A rulebook that looks used when it is new is the same
defect as a seeded shelf.

## Decisions and rejected alternatives

| Decision | Rejected alternative | Why |
| --- | --- | --- |
| Nine documents, each binding a named party at a named moment | One terms-of-service page covering everything | One page cannot record who agreed to what when. The operator's obligations run continuously while the buyer's bind per hire, so a single acceptance record over both would be a claim we could not defend in a dispute |
| Numbers in policy prose are transcluded from one `policy-constants.json` the code also reads | Writing the numbers into the prose and reviewing them | A retyped 200 bps disagrees with the fee code inside a week. A rulebook that contradicts the product proves nobody checked. The constants file is published so the diff is a reader's to run |
| Operator acceptance is an EIP-191 signature over `docHash`, buyer acceptance is two ticks plus the stored wording | A signature from both or a checkbox from both | A signature is portable evidence anyone can verify without our database, which is worth a wallet prompt for a repeat counterparty. Adding a second prompt to the buyer's hire flow buys nothing, since the withdrawal-right exemption asks for consent plus acknowledgement rather than for a cryptographic act |
| The buyer terms plus the operator agreement grant a perpetual right to retain and reproduce the accepted version | Relying on the general licence | Our outbound licence withholds redistribution, so without the carve-out the durable confirmation a buyer is entitled to keep would be a copy the licence forbids. A durable-medium promise the licence contradicts is not a promise |
| Policy publications plus acceptances go to a separate hash-chained `policy-log` | Appending them to the money `ledger` | The `ledger` enforces `origin` as exactly `house` or `order` at append time, which is what makes revenue countable. A document publication is neither, so filing one there would either weaken the enum or book a policy change as house spend |
| An `obligation` change gives 30 days, both versions live, then moves an unaccepted listing to `indexed` rather than delisting it | Applying the new terms to live listings immediately or delisting on non-acceptance | Immediate application binds an operator to terms they never saw. P2B Art 8(a) bars retroactive changes except where a legal or regulatory obligation requires them or where they benefit the business user. Art 3(3) voids any change made without the Art 3(2) notice period. Delisting for version lag destroys standing over a paperwork event, when standing is the only thing this venue is built to accumulate |
| 30 days, published as ours but floored by the statute we cite | Publishing 14 days as our own number; citing no figure at all | P2B Art 3(2) sets the floor: "That notice period shall be at least 15 days from the date on which the provider of online intermediation services notifies the business users concerned about the proposed changes." An earlier draft published 14, one day under. Art 3(3) would have made every such change null and void. The same article requires longer where a change forces technical adaptation, which an `obligation` change usually does, so 30 is the published figure and 15 is the line it must never fall under |
| The full ranking coefficients are published, not just the parameter list | Publishing parameters plus thresholds and withholding the weights, which P2B Art 5(6) permits and every operator studied does | Our gaming resistance is the settled-job binding, the distinct-payer rule plus the funding-cluster test, none of which weakens under reading. A score a stranger can recompute from published rows is the strongest available Data Quality answer, while Art 5(6) is a permission rather than a duty |
| Entry parts under SAND-1.0, including the policy prose plus the docs | MIT or Apache-2.0 across the whole repository to look cooperative | A field that publishes no terms at all can clear the marketplace-quality bar by pasting ours. A rival with empty shelves can fork four category surfaces. SAND still grants running, reading, decompiling, benchmarking plus publishing findings, so every verification a judge wants is inside the grant |
| The compliance layer plus the conformance kit under Apache-2.0 immediately | SAND on everything | Neither is a shelf and both gain value from adoption. If rivals run our assertions our definitions become the ecosystem's, plus a safer venue is worth more to us than exclusivity over twenty-eight probes. Apache rather than MIT for the patent grant plus the `NOTICE` requirement |
| The four reference agents under SAND-1.0 with a published change date of 2026-09-24 to Apache-2.0 | Apache-2.0 immediately, which is what `R15-compliance.md` recommends | Four working agents in the four mandated categories, published permissively four days before the close, is a shelf-filling kit for a rival whose own README concedes empty coverage. The dated change gets the ecosystem benefit the moment the taking risk ends, published up front so it is a term rather than a favour |
| No Aave source vendored, health factor shipped on Venus | Vendoring Aave v3 under BUSL-1.1 | The Additional Use Grant excludes anything that "directly or indirectly" facilitates migration of users or funds from Aave, so a comparison a user acts on sits close enough to that line to be arguable. Venus is BSD-3-Clause with no use restriction and is the deeper BSC lender |
| No GPL Solidity in the tree, interfaces declared ourselves | Copying the pool maths in | Copyleft on the combined work collides with SAND-1.0 on the entry side. Reading a deployed pool over an ABI creates no derivative work, so the copy buys nothing and costs the licence |
| No GPL-3.0-or-later npm package inside the SAND tree either, so `@altananetwork/x402-server` 0.2.0 goes behind its own package boundary or gets replaced by our own guard | Importing it into the entry root because it is the vendor's own SDK | Its manifest declares GPL-3.0-or-later and its tarball ships no `LICENSE` file, verified on 2026-09-05. The vendor's blessing is not a licence exception. A copyleft import into a no-derivatives entry is the same defect as vendored `.sol` |
| The batched reads run on `bsc.rpc.blxrbdn.com`, with the screening client asserting one result per request | Keeping `bsc-dataseed.binance.org` as the batch endpoint, which an earlier draft published | The dataseed silently truncates a 200-call batch to one result at HTTP 200, so unchecked addresses would return inside a verdict that reads clean. The batch-403 premise that put it there is also gone: publicnode batches fine from a normal client. The length assertion is the part that matters, because it holds whichever endpoint answers |
| The Validation Registry row carries its status conditionally plus all three qualifiers in the same cell | Publishing it as `live` with the first-use claim and the qualifiers in a neighbouring row | `validationRequest` is owner-gated and no third-party validator exists on BSC, so the pair is necessarily self-issued and self-answered. A reader who joins two rows the wrong way round reads a first-party artifact as third-party validation, which is the one upgrade the disclosure exists to prevent |
| `ADOPTION.md` beside a SAND `LICENSE` | Pre-licensing the entry permissively in case adoption needs it | Adoption would need run, host plus modify rights that SAND withholds, while a named adoption grant is a separate instrument. Pre-assigning it hands the same rights to every rival at the same moment, for a prize nobody has awarded |
| Disclose AI use even though the requirement is unverified | Waiting to read the programme's terms | The cost of disclosing where it was not required is zero. The cost of the reverse is disqualification, while the terms sit behind a WAF |
| A four-status real-against-staged table above the fold | A capabilities page plus a caveats footnote | A judge reads one page adversarially, so the limitation belongs in the same table as the claim. A status that can only move down without a product change is a commitment rather than a caveat |

## Open questions

1. **Does the programme claim a licence to submissions, require a public repository or require AI
   disclosure?** All three are unverified: DoraHacks answers HTTP 405 behind an AWS WAF human-verification
   page on every API path tried and the hackathon landing page renders client-side with no terms text
   (`R15-compliance.md`). Settled by reading the terms in a browser session before the form is filed. Until
   then we assume nothing and disclose anyway.
2. **What does "official adoption as the BNB Agent Studio marketplace" actually grant or take?** Nothing
   published and reachable says whether it comes with a contract, a licence grant or an assignment
   (`R15-compliance.md`). It is the single item that could change the licence posture, which is why
   `ADOPTION.md` exists: the answer can be negotiated rather than pre-conceded.
3. **Is the SAND licence on the docs prose enforceable in the way we want?** It withholds redistribution plus
   derivative works over files we authored, which covers a page generated from a template. Whether a
   generated page is best described as software output or as a document is a question we answered by keeping
   one licence over one tree. The alternative (a document licence such as CC BY-ND 4.0 over the prose)
   would put a boundary through a generated file. Settled only by a lawyer. The cost of being wrong is
   low because the withheld rights are the same either way.
4. **Closed.** The notice period an `obligation` change carries was an open question until P2B was read in
   full. Art 3(2) in the captured text `research/raw/r13-eu-p2b-2019-1150-2026-09-05.html`, the same capture
   `R13-prior-art.md` plus `R15-compliance.md` already cite for Art 5, 7, 8, 11 and 12, sets the floor at 15
   days on a durable medium, requires longer where the change forces technical or commercial adaptation, then
   Art 3(3) voids any change implemented without it. Section 2 publishes 30 days on that basis. Nothing here
   is open any more.
5. **Where is the Agent Advantage Report filed and does it need its own licence line?** No channel is named
   on either programme page (`SPINE.md` unverified list). It ships as a public URL inside the submission plus
   a file in the repository, which is the safe answer either way. It carries the entry licence because it
   is an entry artifact rather than a contribution.
6. **Do the 8004scan participant-tier terms grant anything about republishing derived data?** Its OpenAPI
   publishes no licence and its legal paths do not resolve (`R15-compliance.md`). Our rule holds regardless,
   since every published number is re-derived from chain, but a granted key with terms attached would let us
   show its data as its data rather than only as a cross-check.
7. **Should the statement-of-reasons feed be public in machine-readable form from day one?** We publish the
   records to the affected party and we publish aggregate dispute numbers. A public per-decision feed is
   stronger accountability plus a rival-intelligence gift, while no text we read requires it of a venue this
   size, so it sits in next rather than in ships.
8. **Which of the nine documents will a real operator actually read?** Unknown but measurable: the docs site
   records nothing about readers by design, so the only signal available is which requirement operators fail
   at the self-check. If the same requirement fails repeatedly, the document is wrong rather than the
   operator.
9. **Does the video's music licence line go in the video description as well as in `DATA-SOURCES.md`?** The
   track itself is no longer an open question: it is a published third-party input with a row in the
   grant-could-not-be-found table above plus a decision attached, so the sentence gets quoted before the
   video goes up or the cut ships silent. What is open is only placement, whether a description line is worth
   carrying when the repository already holds the row. The field is generated rather than downloaded, so it
   needs nothing either way.
