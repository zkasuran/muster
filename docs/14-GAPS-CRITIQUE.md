# 14-GAPS-CRITIQUE: what the set is missing, ranked by what it costs

Written 2026-09-06 against the sixteen documents, the eleven decision records, the research index and
the lane itself. The question here is not what the set covers. It is what a judge, a partner rubric or
the operator's own brief asks for that no document answers.

Eight items. Every area the brief names has a home and the closing section says where, so what follows
is the short list rather than a survey. The last section separates what was verified today from what
was taken from the set's own records.

## 1. Nobody opened the submission channel and it is a registration form

**Missing.** The one link the plan files through was never read. Fetched live on 2026-09-06,
`https://forms.gle/9g9XPNFwnYaHAz9L8` is titled "Build the Era Hackathon Registration". It carries 23
items and asks for prototype stage as "Fresh idea", "Early prototype" or "Working MVP", mentorship
interest during the build period plus a confirmation of availability across the build and judging
windows. It has **no field for the live URL, none for the Agent Advantage Report, none for agent wallet
addresses**. Its sub-prize picker offers PancakeSwap, AltLayer, TermiX or "Not sure" with **no
Altana option**. The only project-carrying fields are a project name, a one-line pitch, a description
paragraph, a required GitHub repo link, that picker plus an optional notes paragraph. The single wallet
field is for the prize payout. The hackathon page's "Submit Project" button points at this same form and
names two Telegram groups as the support channel. `00-PROGRAM.md` calls it "the only submission channel
published", which is true of the link and wrong about its shape.

**Cost.** Everything. Eligibility rests on a live public URL and the TermiX track rests on the report.
The set assumes both travel in fields that do not exist. The repo link is the only field that can carry
them and no repository exists: the lane holds no `.git`, the flip commands in `15-SYSTEM.md`
section 11.2 still read `<owner>/<repo>` and no block in the build order creates it. Our own entry
records carry no row for this programme, so whether we are registered at all is **unverified**.

**Do now.** File the registration today, record the values so a re-file is byte-identical and treat it
as one shot unless the confirmation page offers an edit link. Create the repository in the first block
and fix its name. Then write the README as the submission carrier: the live URL, the report URL, the
four agent wallets with their full 32-byte key ids, the four shelves plus the disclosure, because a
judge holding only the repo link needs all of it in one place. Ask in the discussion group whether a
separate project-submission channel exists, then record the answer in `00-PROGRAM.md`. Build the fill
page with one copy button per field, kept outside the repository.

## 2. The public hostname belongs to a rival

**Missing.** A hostname we control. `15-SYSTEM.md` section 6.2 cites `muster.brainonbnb.com` as "a
subdomain of a domain we already control" and its open question calls that apex "proven" because it
already serves a well-known file over HTTPS. Both lines rest on `R12-agent-comms.md`. This set's own
`decisions/02-thesis-brainonbnb-is-third-party.md` overturned it: the owner address behind that cluster
is not ours, no signer for it exists in this workspace and the site sells a token we have never shipped.
`02-THESIS.md` treats the same domain as a rival product in eight places. So the address the submission
would cite is a competitor's apex.

**Cost.** The entry. No DNS record, no certificate, no proven origin. `14-GAPS.md` section 2.1 sets
the rule itself: a hostname that is not ours is never the cited URL. The plan calls DNS plus the
certificate its only hard external dependency, which makes this the one gap with a lead time that
cannot be compressed on the last day.

**Do now.** Name a hostname on a domain the operator controls or register one, in the first block.
Point DNS at the origin with a 300 second TTL, issue the certificate, then assert `notAfter` later than
2026-09-23 in the same block. Rewrite section 6.2 with its open question and annotate the two research
lines the decision record already says are owed a correction. While that block is open, name the origin
too: "one Linux machine we already operate" is the only description of it anywhere in the set, so the
host that has to answer through fourteen unattended days is **unverified**.

## 3. The close time is published and six documents say it is not

**Missing.** A read of the form's own description, which states the build period as "12:00pm UTC+0, Aug
5 2026 – 12:00pm UTC+0, Sep 9 2026" with judging "Sep 9, 2026 – Sep 23, 2026". Six places in the set
call the time of day unverified and plan to 00:00 UTC on the 9th: `00-PROGRAM.md` twice, `02-THESIS.md`,
`05-ONBOARDING.md`, `15-SYSTEM.md` twice plus `research/SPINE.md`.

**Cost.** Twelve hours of the build, which is one sixth of what is left, given up by a conservative
reading nobody re-checked against the organiser's own text.

**Do now.** Correct the six places with the read fact, its source and its date. Keep 00:00 UTC on the
9th as the freeze, then treat 00:00 to 08:00 on the 9th as recovery time for a failed gate rather than
as build time. File no later than 08:00 UTC.

## 4. The funding command omits the token four of the five Altana requirements spend

**Missing.** USDT. `13-PARTNERS.md` section 4.5 commits about 15 USDT of working principal for the four
G4 transactions: 5 supplied on Venus, 1 repaid against a borrow opened with about 5 of collateral, then
2 swapped twice. `15-SYSTEM.md` section 6.4 sizes the float at about 0.015 BNB, 40 USD1 plus 2 `$U`
with no USDT row. Its open question repeats the same three tokens. `cli float` prints from that
table, so the one command that needs the operator asks for the wrong basket.

**Cost.** The Altana track, which is 50,000 XP plus the strongest on-chain evidence in the submission.
Four of its five requirements are proven by transactions that spend a token nobody was asked for. The
day 2 08:00 block cannot pass its gate without them.

**Do now.** Add the USDT row with an amount, a margin and the four wallet destinations before the
command prints in block one. Re-cost the health-factor leg while doing it: `repayBorrowBehalf` needs a
borrow that already exists, so the collateral that opens it is part of the ask rather than a detail.

## 5. The report needs three people and none of them is booked

**Missing.** The people plus the hours. `13-PARTNERS.md` section 2.7 states the assumption plainly: one
operator to run the control arms, one grader who ran no arm, one first-time visitor who has never seen
the product. Section 1.4 needs a recorded unaided hire from that visitor. Nobody is named, nobody is
booked and the schedule has no room for them. The report holds one three hour block on day 2, which is
assembly time. Three tasks times two control arms, each with a screen recording, a scrub pass against
the do-not-publish list plus a blind grading sheet, does not fit inside it. The third-party operator
recruitment in section 2.3 freezes on 2026-09-07 with no outreach drafted and no contact list built from
the candidate rows.

**Cost.** TermiX eligibility, so $10,000, plus the 30% criterion scored against the report. An arm
nobody ran is publishable as not run, which is a weaker submission than the design assumes and a slower
one to write.

**Do now.** Book the operator and the grader for named hours before the 19:00 block on day 2, then the
visitor for a slot on day 3. Draft the operator outreach today and send it to the contact surfaces in
the candidate rows, since the freeze is tomorrow. If no human is available, say so in `rubric.md` and
publish the control as an assisted run with no human timing rather than a recording that implies one.

## 6. Human verification ships as a mechanism with nothing on screen

**Missing.** One row a judge can see in the attested state. BABT is specified in full, E3 ships with
two live legs plus one wired leg and the measured coverage is 9 of 585 agent owners at about 1.5%.
Nothing in the set says any listing visible during judging holds one. The four first-party listings
are the only rows we control.

**Cost.** A brief item and a ladder rung that render zero times. A mechanism nobody can see scores the
same as an absent one on a criterion about what a user can look at and act on.

**Do now.** Read `balanceOf` on the BABT contract for the address that will own the first-party
listings. If it is zero, surface the measured BABT-holding owners as candidate rows with the attested
state rendered and labelled unclaimed, so the rung has at least one live instance on screen.

## 7. The README contradicts the measurement it introduces

**Missing.** A first page that agrees with the folder behind it. `three/README.md` still carries the
2026-08-27 pass: 287,029 agents, 2 of 400 publishing a callable endpoint, 166 of 400 sharing one name, 0
of 400 declaring a payout wallet plus "the reference agent at id 1 has an endpoint that has answered 404
since 2026-05-20". `research/MEASUREMENT.md` corrects all four. The population is 334,935 at a named
block then 336,088 fourteen hours later, machine-callable is 12 of 600 with 0 payable by a stranger,
`getAgentWallet` is non-zero for 600 of 600 so the wallet claim only holds as none distinct from the
holder. Id 1 is `ClawNews` failing at TLS, while the 404 was one stale check against a well-known
file.

**Cost.** It is the first file anyone opens and it breaks the set's own standing rule that nothing
outward claims a number we have not measured. Three of its four headline facts are corrected inside the
folder it introduces.

**Do now.** Rewrite the four bullets from `MEASUREMENT.md` with block heights, add the table rows for
the sixteenth document plus `research/SPINE.md`, then grep the set for the 400-sample numbers so nothing
else inherited them.

## 8. 103 open questions, no register, no triage

**Missing.** One list with a verdict per row. The open questions sit at the foot of twelve documents,
103 of them, so a question that blocks a gate reads exactly like one parked forever. Several are
load-bearing: whether a disputed ERC-8183 job can be rejected in practice, whether the duty reviewer is
reachable across the whole judging window, whether the reverse proxy licence plus the two non-publicnode
RPC terms can be quoted before the repo flips.

**Cost.** A blocking question found at 03:00 on the 8th. The licence row is already a gate in the submit
checklist and it is unresolved, so the flip cannot run today as written.

**Do now.** One pass over all 103 tagging each blocks-a-gate, decide-later or park. Pull the blocking
ones into the day plan with an hour against each. Start with the three licence rows, since the repo
cannot go public without them.

## One small one

`13-PARTNERS.md` section 6.2 writes the 8004scan Pro-tier form as filed and the AltLayer checklist row
wants the confirmation beside it. Nothing in the set records a confirmation, so the sentence is a plan in
the present tense. It costs minutes: file it from an account on a wallet the operator controls, save the
confirmation, then keep the self-service key's measured limits beside the form's promise as the checklist
already asks.

## Checked and not a gap

Named so this list is not re-litigated. Categorisation, menus and visibility have contracts, a nav, a
facet set with real values plus a four-state visibility model. Agent behaviour and contact have a wire
contract, four long-job shapes, an error taxonomy plus a conformance suite. Seller and buyer rules sit
across the onboarding ladders and the published policy set, with acceptance as a signature over a hash.
Quality has four signal families, a recomputable score with its interval plus seven named gaming
detections. Job assignment has hard constraints, a ranking function, failover by fault class plus a
fan-out arbitration rule. Disputes and compliance have clocks per step, remedies with a funder each, a
takedown path plus an incident runbook. Wallets and funds have two rails, escrow on the official stack,
spend controls plus a ledger with a writer per edge. BNB Chain and Binance both carry their deliberate
non-uses with the arithmetic behind each. The four categories are equal by construction, since the
shelves come from one template and one contract shape.

## Verification

Verified today by direct read: the submission form's title, its 23 items, its field set, its track
options plus its published build period and close time. The hackathon page's "Submit Project" anchor
target, read from the capture in `research/raw/`. The absence of a repository, of any code and of a
programme row in our own entry records. Every internal contradiction named above, read from the files
themselves.

Taken from the set rather than re-verified here: that the brainonbnb.com cluster is third-party, which
rests on `decisions/02-thesis-brainonbnb-is-third-party.md` and not on a fresh chain read. The measured
population figures, the Altana gas and fee numbers plus the BABT coverage share, all cited to their own
research files.

Not established either way: whether a project-submission channel exists beyond the registration form.
That is the first thing on the list because it is the one unknown that can void a finished build.
