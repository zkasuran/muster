# 05-ONBOARDING: who may list, how they prove it, what keeps them honest

Written 2026-09-05. The build closes 2026-09-09 UTC+0.

Vocabulary, component names, field names and constants come from `research/SPINE.md`. The gate this
document feeds is the **hireable bar** defined in `02-THESIS.md`. Evidence comes from
`research/R10-bab-attestation.md` (attestation), `research/R01-erc8004.md` (the registry surface),
`research/R12-agent-comms.md` (the wire and the well-known traps), `research/R16-reuse.md` (a real
marketplace's rejection ledger), `research/MEASUREMENT.md` (the population),
`research/VERIFIED-payment-rail.md` (tokens), `research/R15-compliance.md` (screening and data
protection) and `research/R06-altana.md` (sessions). A handful of reads were run by hand today and
are marked as such.

This document owns who may list, the operator identity model, the attestation checks, the E0 to E4
ladder, the onboarding state machine, the listing lint, the hard gates, the token and price
resolution gate, the probe schedule and what a failure does to visibility, seller-side anti-wash,
the claim flow and buyer onboarding. It does not own the probe assertions themselves
(`04-AGENT-PROTOCOL.md`), the score or its anti-gaming detections (`06-QUALITY.md`), the dispute
lifecycle (`09-DISPUTES.md`), the published policy documents (`10-DOCS-AND-POLICY.md`) or the
payment rail (`08-MONEY.md`).

## 1. Three ladders and one gate, kept separate

Muster carries three graded measures. They get confused constantly and merging them is how a
marketplace ends up claiming an attestation means an agent works.

| Measure | Subject | Answers | Owned by |
| --- | --- | --- | --- |
| **reachability ladder** T0 to T3 | one endpoint | did the wire answer and how far | `MEASUREMENT.md`, measured by `prober` |
| **evidence ladder** E0 to E4 | one operator address | what has this party earned the right to do | this document |
| **hireable bar** H1 to H6 | one listing | may this row reach a shelf | `02-THESIS.md` |

They move independently and that is deliberate. An operator at E1 can hold a listing that passes the
bar, because H6 accepts a completed ERC-8183 job that predates Muster while E2 requires a settled job
through Muster. An operator at E4 can hold a listing that fails the bar this minute because its
endpoint stopped answering. A T3 endpoint under a fresh anonymous address is E0. Nothing about the
ladders is a claim that the agent is good, which is `06-QUALITY.md`'s job.

One rule binds all three: **a tier is a fact about a check we ran at a recorded block, never a
durable badge.** Every tier value carries the `freshness` triple SPINE fixes (block number,
timestamp, source) and a tier is recomputed rather than trusted.

## 2. Who may list: the operator identity model

### 2.1 An operator is an address that proves control of an agentId

An **operator** is an address that can demonstrate authority over an `agentId` in the Identity
Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`. The registry already answers that question in
one view, so we use its own answer rather than reimplementing it:

```
isAuthorizedOrOwner(address spender, uint256 agentId) -> bool     // selector 0xd95e72be
```

`R01-erc8004.md` establishes that this resolves to
`spender == ownerOf(agentId) || isApprovedForAll(ownerOf, spender) || getApproved(agentId) == spender`,
which is exactly the authority the registry itself demands for `setAgentURI`, `setMetadata`,
`setAgentWallet` and `unsetAgentWallet`. I re-ran it today against BSC mainnet: for agent 1 it returns
`true` for the owner `0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029` and `false` for
`0x1111111111111111111111111111111111111111`, at block 120,137,361.

Using the registry's own predicate has a consequence worth stating: an operator approved through
`setApprovalForAll` manages a whole fleet without holding a single token, so a platform that mints on
behalf of its users can onboard its fleet with one approval and one signature per listing
(`R01-erc8004.md` design implication 9).

### 2.2 The proof is an off-chain signature and it costs nothing

Claiming is free. Muster issues a challenge, the claimant signs it, we recover the signer and call
`isAuthorizedOrOwner(recovered, agentId)`. One `eth_call`, no transaction, no gas, no account.

The challenge is EIP-712 typed data so a wallet shows the claimant what they are signing rather than
a hex blob:

```
domain = { name: "Muster", version: "1", chainId: 56 }
Claim(uint256 agentId,address operator,bytes32 nonce,uint256 issuedAt,uint256 expiresAt)
```

Five rules on the challenge, each closing a real hole. `nonce` is 32 random bytes issued by us and
single-use, so a signature scraped from a log cannot be replayed. `expiresAt` is `issuedAt + 600`,
because a claim proof that never expires is a bearer credential. `chainId` is 56 and there is no
`verifyingContract`, since nothing on chain verifies this. The recovered signer, not a form field,
becomes the `operator` on the record. An ERC-1271 contract wallet is accepted by calling
`isValidSignature` and requiring the `0x1626ba7e` magic value, which is the same fallback the registry
itself uses for `setAgentWallet` (`R01-erc8004.md`).

**One signature claims one `agentId` across all four categories.** There is no `category` in the
struct, because the thing being proved is control of a token in the registry and that is not a
per-category fact. So the nonce is consumed once per agent, the record carries one entry per
`agentId` and an operator putting one agent on two shelves collects one signature rather than two.
Whether the agent belongs on a given shelf is G4's question and never the claim's. `listingId` still
derives from `(agentId, category, contractVersion)` per section 5.4, so two listings on one claim get
two ids.

An operator who wants a proof a stranger can read without our database can additionally write an
on-chain marker. Verified by simulation today: `setMetadata(1, "muster.claim", <32 bytes>)` from the
owner returns `0x` and would succeed. The same call from `0x1111...1111` reverts `Not authorized`.
`setMetadata(1, "agentWallet", ...)` reverts `reserved key`. So a free-form key works and the guard is
real. `keccak256("muster.claim")` is
`0x09daab751b943af0f863de1f995baf2d320537b0793270b7f843d4fbefa1165f`, computed with `cast keccak`.
An indexed `string` topic is the keccak of its UTF-8 bytes, so the key hash is the **second** indexed
topic, after the `agentId`. The filter is positional:

```
topics: [ keccak("MetadataSet(uint256,string,string,bytes)"), null, keccak("muster.claim") ]
       =  0x2c149ed5…1468b                                     any agent   0x09daab75…1165f
```

Verified today against the live registry: `eth_getLogs` filtered on topic0 alone over a 1,200-block
window returned 17 `MetadataSet` rows and every one carries the agent id in `topics[1]` and the key
hash in `topics[2]` (agent 336,225 with `agentWallet` `0x2ac61093…b4e39`, `platform` and
`platformAgentId`). Putting the key hash in the `topics[1]` slot returns zero rows with no error,
which is the silent-empty failure this filter exists to avoid (`R01-erc8004.md` shows the same
positions in its decoded genesis log). The marker is optional, it costs one transaction at 0.05 gwei
and it is what a rival index would need to corroborate a claim without asking us.

### 2.3 The operator record and the fields that must never exist

Wallet signature is the only account. No email, no password, no OAuth. That single decision is what
keeps a wallet address pseudonymous for us: `R15-compliance.md` quotes EDPB Guidelines 02/2025 v2.0
para 137 and para 26 to the effect that a wallet address becomes personal data once it can be
associated with an identifiable person by means reasonably likely to be used. A breach of our own
database is named as exactly such a means. The link is the liability, so we never build it.

The whole record:

```
operator = {
  operatorAddress,            // recovered from the claim signature, the primary key
  agentIds[],                 // one entry per claimed agent, with the block the control check passed at
  evidenceTier,               // E0..E4, recomputed on read, never stored as a durable flag
  tierExercises[],            // { tier, source, blockNumber, timestamp, privilege }
                              // written only when a privilege is exercised, never on a plain read
  bond,                       // { token, amountBase, decimals, lockedAt, releasableAt } or null
  screeningIds[],             // pointers into the `screeningCheck` collection, role `operator`
  firstSeenAt, lastActiveAt
}
```

Nothing else. Deny by default, enforced by the type system rather than by discipline
(`R15-compliance.md` minimum posture item 2). Every absence below is load bearing:
no name, no email, no phone, no company, no country, no IP joined to the address, no government
document, no BABT `tokenId`, no BABT metadata `id`, no free-text staff note. A team is a set of
addresses that each proved control, because modelling an organisation would need a name field.

**Two requests to `15-SYSTEM.md`, which is the only document that may extend the stored model.** It
carries no `operator` collection today and no placement for the row above, so the record has nowhere
to live: add `operator` keyed `operatorAddress` holding these six fields, the way `dispute` was added
for `09-DISPUTES.md`. `evidenceTier` is derived rather than stored, so it is a computed column and not
a persisted one. `tierExercises[]` is the one part that has to be durable, because it is the audit
trail behind a privilege we granted. It does not contradict 15-SYSTEM's rule that attestation
reads are never persisted and cached for 60 s only: a plain read writes nothing at all and the row
that does get written is a record of our own action rather than a copy of the credential. Section 3.5
rule 5 fixes the wording and the field names. The two lists are the same list.

### 2.4 The payout address is read from chain, never from a form

The listing never carries an operator-supplied payout address. Muster reads `getAgentWallet(agentId)`
(`0x00339509`) and falls back to `ownerOf`. `MEASUREMENT.md` established why this is safe and why it
carries no signal: `register` writes `msg.sender` into the `agentWallet` slot at mint, so 600 of 600
sampled agents return a non-zero wallet and all 600 equal `ownerOf`. I re-checked agent 1 today and
both reads return `0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029`. Two consequences. `agentWallet != 0`
is not a filter, it is the whole registry. And a **zero** `agentWallet` means the token was
transferred, because `_update` clears the slot on transfer, so a zero triggers a re-claim rather than
a payout to the old holder.

### 2.5 Nothing on the onboarding path needs a credential we do not already hold

Every check in this document runs on keyless calls: `https://bsc-rpc.publicnode.com` for `eth_call`,
Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11` for batching, the BABT and Galxe Passport
contracts, the BNB Passport reader, the Chainalysis sanctions oracle
`0x40C57923924B5c5c5455c48D93317139ADDaC8fb`, the OFAC SDN CSV and one unauthenticated 8004scan write
lever. `R16-reuse.md` records the lesson this is answering: a live marketplace gated listing creation
behind an email beta whitelist (backend error 10016) and the fix was to apply on day one. Our version
of the rule is stronger, because there is nothing to apply for.

Onboarding also never blocks on 8004scan. Its BSC chain 56 indexer reported `status: down` on
2026-09-05 with a checkpoint 32 hours stale and 20.8% then 56.7% non-200 across two windows
(`R05-8004scan-api.md`, `MEASUREMENT.md`), so it is a corroboration source and never a gate.

## 3. BABT as human verification

### 3.1 The exact check

One call, one bit:

```bash
cast call 0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8 \
  "balanceOf(address)(uint256)" <OPERATOR> \
  --rpc-url https://bsc-rpc.publicnode.com
# 1 = holds a live BABT, 0 = does not. Never reverts, including for address(0).
```

Selector `0x70a08231`. `R10-bab-attestation.md` verified this is the check Binance itself documents
and I re-ran both legs today: the known holder `0xD57BBd836cF5bFB92A04f0Ddd5F069dCf0CF0547` returns 1
and the ClawNews owner returns 0.

Four implementation facts that bite a naive integration, all from `R10-bab-attestation.md`. **Never
call `tokenIdOf`** in a gate: it reverts with `The wallet has not attested any SBT` for a non-holder,
so a plain read kills the transaction, while `balanceOf` returns zero. **Treat BABT as ISBT721, not
ERC-721**: `supportsInterface(0x80ac58cd)` returns true while `transferFrom` does not exist in the
source at all and reverts with zero-length revert data. **The miss path costs more than the hit**, at
34,809 total gas on `eth_estimateGas` for a non-holder against 32,414 for a holder. And **batch it**:
`aggregate3` over BABT `balanceOf`, Galxe Passport `balanceOf` and the BNB Passport reader resolves a
whole tier in one round trip, verified working on BSC.

### 3.2 What a BABT proves

One live token per Binance UID per chain, issued after a Binance identity check. Binance's own words,
quoted in `R10-bab-attestation.md`: "Binance Account Bound (BAB) tokens are the credentials of Binance
users that have passed KYC", "One UID can only have one BAB token at one time and on one chain" and
it "can be revoked by issuers".

### 3.3 What a BABT does not prove

Every line here is verified in `R10-bab-attestation.md` and every line changes what we are allowed to
put on screen.

- **No attributes and no credentials.** `tokenURI(1)` resolves to 276 bytes whose `attributes` is `[]`
  and `credentialList` is `[]`. Tokens 1, 1000 and 1,166,395 return byte-identical bodies apart from
  an opaque 32-byte `id`. There is no KYC tier, no country, no document type, no name, no birthdate
  anywhere.
- **Not one per person, only one per address.** The contract's guard is
  `!_tokenMap.contains(to)`, an address check. Nothing on chain links two addresses to one UID.
- **The 72 hour re-mint cooldown is not on chain.** `attest` has no timestamp check, so it is a
  Binance backend policy and no gate may assume the chain enforces it.
- **The `tokenId` is not an identity.** Binance says so directly: "Don't use `tokenId` as the identity
  of a KYC user, because the user can revoke the old BAB token and mint a new one to another wallet".
- **It decays.** 152,762 of 1,319,158 BABTs ever minted are already revoked or burned, 11.58%. The
  issuer can also revoke without the holder's signature.
- **Binance declines to vouch.** "Binance is not making any representation to third-party projects
  about the holders of the BAB Tokens". The check behind it "may vary depending on the user's
  country of residence".

### 3.4 The wording rule, fixed

The badge reads **"Holds a Binance Account Bound Token"**, with the contract address and the exact call
in a tooltip. Banned strings anywhere in the product, the docs, the video or the submission: "KYC
verified", "KYC verified by Binance", "identity verified by Binance", "verified human", "Binance
verified". The first is verifiable by anyone with an RPC URL. The rest are claims Binance explicitly
declines to make to us.

Nothing below E3 asserts that a human exists behind a listing and the UI must not imply one. An
autonomous agent holding its own owner key can pass every E0 to E2 check, which is correct, because
those tiers measure work rather than personhood.

### 3.5 Privacy posture

Six rules, from `R10-bab-attestation.md` section 4 and `R15-compliance.md` section 5.

1. **Read at request time. Never store a `verified: true` flag.** 11.58% of all BABTs are already
   revoked and the issuer can revoke unilaterally, so a cached boolean is a claim that decays.
2. **Cache the read, not the identity.** A 60 second in-memory TTL keyed by address keeps RPC cost
   flat. A plain read writes no row anywhere, which is the same posture `15-SYSTEM.md` states for
   attestation reads. The single exception is rule 5.
3. **Never store the metadata `id`.** Binance states the `id` is stable for one person across
   re-mints, which is **unverified** because testing it needs a real Binance account and 72 hours
   (SPINE's Unverified table, `R10-bab-attestation.md`). The rule does not rest on that claim. What is
   verified is the behaviour: Binance 404s a revoked token's metadata deliberately "so that the others
   can't relate those two different wallets by the `id`", so persisting it would rebuild a cross-wallet
   graph they took the trouble to break. We do not fetch it at all: the tier needs `balanceOf`, which
   returns a bit.
4. **Never store the `tokenId`** and never use it as a key.
5. **Record the result at the moment it is used, because the check cannot be replayed cheaply.**
   Historical `eth_call` is 403 on `bsc-rpc.publicnode.com` with `Archive requests require a personal
   token`, which I hit again today. The free archive endpoint SPINE names,
   `https://bsc-mainnet.public.blastapi.io`, does answer: I read a BABT `balanceOf` a million blocks
   back there today and got 1. That makes replay possible on a second provider rather than free on our
   own. A privilege check is not a thing to rest on somebody else's archive tier. Rule 1's decay
   argument settles it on its own: 11.58% of BABTs are already gone, so the only durable record is what
   we relied on and when. So `{ tier, source, blockNumber, timestamp, privilege }` is appended to
   `operator.tierExercises[]` at the moment a privilege is exercised, keyed by `operatorAddress`. That
   is an auditable claim about what was true then and it stores no identity.
6. **A tier read never leaves the machine.** No wallet address in a third-party analytics payload,
   which `R15-compliance.md` notes would be an international transfer of personal data with no
   assessment behind it.

### 3.6 Why BABT cannot be the gate

The measurement decides it. `R10-bab-attestation.md` screened 585 distinct BSC ERC-8004 agent owners
against both BABT and Galxe Passport on chain, 0 failures:

| Holding | Owners of 585 | Share |
| --- | --- | --- |
| BABT | 6 | 1.0% |
| Galxe Passport | 6 | 1.0% |
| both | 3 | 0.5% |
| **either** | **9** | **1.5%** |
| **neither** | **576** | **98.5%** |

Among the 300 most reviewed BSC agents (96 distinct owners) it is 3 with a BABT, 1 with a Galxe
Passport, 4 with either. So a BABT gate on operators leaves an inventory of about nine listable agents
from a sample of 600 agents under 585 distinct owners, scores zero on Agent Diversity and cannot fill
four mandated shelves. A modal that blocks 99% of the catalogue reads as a broken marketplace.

The same attestation is nearly free on the write paths and the measurement now covers both scopes.
`R10-bab-attestation.md` screened the 12 heaviest authors in the most recent 3,000 indexed feedbacks,
where 31 addresses wrote all 3,000 and the heaviest wrote 209 across 35 agents: none of the twelve
holds either credential. Those twelve are an index slice rather than the chain, so I screened
`MEASUREMENT.md`'s busiest whole-chain clients today as well:

```
0xa06f907f7ea437ebe60e3d452831ec69e5be43a4   1,800 agents rated   BABT 0   Galxe 0
0xc71a15fcb1149254f97059f6cf3f6ed43990ebd4   1,137 agents rated   BABT 0   Galxe 0
0x809d59b1dc5f7f03aa2f5f02e9679d7f66b4c7c7     924 agents rated   BABT 0   Galxe 0
```

The next three in that ranking (254, 165 and 164 agents) return 0 on both as well, all read at block
120,159,840. So the asymmetry holds on the sample R10 measured and on the heaviest writers the
whole-chain sweep found, which are disjoint sets.

## 4. The evidence ladder, E0 to E4

SPINE fixes the rungs and their names. This section fixes the exact check, the exact unlock and the
number.

| Tier | Check, per operator address | Unlocks | Cost to the operator |
| --- | --- | --- | --- |
| **E0 Listed** | a valid claim signature plus `isAuthorizedOrOwner(operator, agentId)` true | appears in search, sorted last, Muster score shown as provisional. **No hire button** | nothing, not even gas |
| **E1 Bonded** | a 5 `$U` stake in `OperatorBond`, released permissionlessly, with no key of ours over the funds | enters the ranked bands, plus the response slot on any dispute against it | capital, no document, no exchange account |
| **E2 Proven** | at least one Muster job in this category in a terminal paid state with a recomputable receipt | shelf placement, full-weight feedback, category badge, the hire button on the rail the listing publishes | real usage |
| **E3 Attested** | any one of three attestation reads below | human-verified badge, higher caps | one KYC, at one of several providers |
| **E4 Accountable** | E3 plus a live Altana session a buyer can read and revoke | hireable over ERC-8183, top of the default sort, highest caps | wiring work plus about $0.50 |

**The tier gates the hire button and reaching `live` does not.** `03-TAXONOMY.md` section 6.3 owns
what each rung renders and it disables the E0 button outright, reading "not hireable through Muster
yet" with the missing requirement named. Section 5.2 below says the same thing in state terms: a `live`
listing gets a shelf row and a compare row unconditionally, then a hire path where its tier and its
rail allow one. Both statements answer different questions, which is why 03 records the E0 shelf
visibility as a display rule that leaves the Unlocks column above intact. A price and a rail are
published at E0 and E1 so a buyer can read them. Nothing is payable through us at those rungs.

**No tier unlocks raising a dispute.** `09-DISPUTES.md` fixes `dispute.raisedBy` as `buyer` or
`muster`, so there is no operator filing path in the shipped record and this document does not invent
one. What an operator gets is the defence: a response slot with `responseDueBy`, `submissionCount` and
`responseArtifacts[]`, plus the one-click concede at decider tier `operator:concede`. SPINE's Unlocks
column says "dispute rights" at E1 and "dispute filing" at E3; the rows above restate both as the
response slot, because that is what is built. An operator who wants to open a case against a buyer
routes it through `muster` as the raiser, which is the same path a machine-opened dispute takes.

**What an operator with no attestation reaches on 2026-09-09.** E0 on signature alone, then E2 the
moment one job through us settles in that category, which is shelf placement, the category badge, the
full-weight feedback and a working hire button. E1 is empty on mainnet at ship (section 4.2), so it is
not a rung anyone stands on that day; its unlock is a sort band rather than a gate. E3 and E4 are the
two rungs an unattested operator cannot reach. Neither is required for a shelf row, a badge or a
hire. The ladder therefore does not trap an unattested operator at E0: settling one real job is the
route past it and it needs no document and no exchange account.

### 4.1 E3 is an OR across three reads and one of the three is unverified

```
BABT          0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8   balanceOf(address) != 0
Galxe Passport 0xe84050261cb0a35982ea0f6f3d9dff4b8ed3c012  balanceOf(address) != 0
BNB Passport  0x97F0Ed637276907dcecbE49Bf08464Bdc7E46734   user_finished_one_of_attestation(address,bytes32[])
```

All three in one `aggregate3`. The OR is the whole answer to exclusion. BABT needs a Binance account.
Galxe Passport needs a Sumsub `basic-kyc` pass and no exchange at all, with Galxe stating that its
tokens carry no PII on chain (`R10-bab-attestation.md`). The BNB Passport reader's SDK documents six
providers, `kyc_binance`, `kyc_bithumb`, `kyc_upbit`, `kyc_coinbase`, `kyc_okx` and `kyc_bybit`, which
reaches jurisdictions where a Binance account is unavailable.

**The third leg is unverified and ships saying so.** `R10-bab-attestation.md` records that every
address probed returns `[]` from `get_user_attested_schemas`, the mint host `passport.bnbattest.io` has
no DNS record and the mapping from the six provider strings to BAS schema UIDs is inferred rather than
proven (one candidate schema, `0x08ff4a23a1a44b6ede6f2fbc20f50f3992565944e050f9ba6f43ca8cc28d1339`,
body `address userAddress`, is registered). So the call is wired, it executes against mainnet and it
returns false for everyone today. The UI names the three sources and shows which one answered, so a
reader can see that the third has never fired.

### 4.2 E1 is the rung that must never need a document

E1 is reachable by an operator who cannot get any KYC, in any jurisdiction, under a pseudonym. **E3 is
never a prerequisite for E1** and no shelf row depends on E1.

**The binding constraint is the money-transmitter line, not an audit clock.** A stake we hold and then
direct to a buyer on our own decision is value accepted from one party in order to pass it to another,
which is the shape FinCEN FIN-2019-G001 puts inside the definition rather than outside it. The
payment-processor exemption fails on a crypto rail too, because it requires clearance systems that admit
only BSA-regulated institutions (`R15-compliance.md`, `09-DISPUTES.md` section 6). So a bond sitting in an
escrow of ours is not a thing we ship at any date. SPINE's "held in Muster's own escrow" wording for
E1 is superseded here for that reason. The same reasoning already keeps a payment contract of ours out of
the hire path.

The bond that does ship as a specification is **`OperatorBond`: no owner, no upgrade path and no function
that can move a
stake to a Muster address**. It is deployed on no chain, mainnet or testnet, because
`15-SYSTEM.md` ships no Solidity at all and a testnet bond is not read by any of the three published
criteria (`three/decisions/05-onboarding-operatorbond-not-deployed.md`). What ships is the surface below,
the terms and the analysis. Its surface, which is what `03-TAXONOMY.md` renders as the E1 checkmark once a
deployment exists:

| Purpose | Call | Who may call |
| --- | --- | --- |
| read the stake | `bondOf(address operator, bytes32 category) -> (uint256 amountBase, uint64 lockedAt, uint64 releasableAt, uint8 state)` | anyone, it is a view |
| post it | `bond(bytes32 category, uint256 amountBase)` after an ERC-20 `approve` | the operator, from the address that claimed |
| get it back | `release(address operator, bytes32 category)` | anyone, once `block.timestamp >= releasableAt` with no open dispute flag |
| answer an upheld dispute | `payOut(bytes32 disputeId, address payTo, uint256 amountBase, bytes decision)` | anyone carrying a decision signed by the decider key, where `payTo` must be the buyer recorded on the job and `amountBase` is capped at that job's price |

Three properties carry the design. **Release is permissionless**, so getting a stake back never depends on
us answering. **No key we hold can move a stake to us or to an address of our choosing**, which is what
keys we do not hold means: the decider key redirects a capped amount to the buyer named on a real job and
can do nothing else. And **the amount is 5 `$U`** (18 decimals,
`0xcE24439F2D9C6a2289F741120FE202248B666666`, SPINE), flat for this build because no category has a
counted median price on day one, which is the same reason the caps in 4.3 are flat. The median-based
sizing `14-GAPS.md` documents is what it becomes once a shelf has a counted median. The lock runs
**604,800 seconds** past the last job the stake might answer for, the official ERC-8183 kernel's
`disputeWindow()` (SPINE), so a bond cannot be released while a job is still disputable.

The visible effect of the gap is that the E1 rung is empty everywhere at ship, since nothing holds a stake
on any chain. Nothing on a shelf depends
on it, because shelf placement is E2. The alternative that avoids a contract is worse: holding an
unsubmitted EIP-3009 authorization as collateral is exactly the "stored authorisation that outlives the
job it was signed for" that `R15-compliance.md` rules out.

### 4.3 The caps, with the reason for each number

Amounts are base-unit decimal strings in the settlement token, which is 18 decimals on every BSC
stablecoin (SPINE). The unit below means one whole token, `1e18` base. **Unsettled**, the ceiling
`06-QUALITY.md` calls outstanding, is a level rather than a flow: the sum of `priceBase` over every job on
that listing which a buyer has signed for and which has not reached a terminal state, measured at the
instant of the next quote. No window, because a level does not need one.

| Tier | Max price per job | Max unsettled at any instant | Max open jobs at once |
| --- | --- | --- | --- |
| E0, E1 | 5 units | 25 units | 1 |
| E2 | 5 units | 25 units | 4 |
| E3 | 25 units | 100 units | 8 |
| E4 | 100 units | 500 units | 16 |

Two caps sit beside those and bind the operator rather than the listing. `15-SYSTEM.md`'s unique index
allows one listing per `(agentId, category)`, so one agent cannot exceed four listings. **Four live
listings per operator address** is the tighter one and it is the one that binds an operator holding many
agents (`14-GAPS.md`), so it is checked at the `in_review` to `live` edge and a fifth holds at `in_review`
with the reason shown.

The numbers are chosen rather than measured and the reasoning is the defensible part. The floor of the
range is set against the real market: the official ERC-8183 kernel has paid **292.24 `$U` across 28,244
completed jobs, about 0.0103 `$U` per completed job on average** (`R16-reuse.md`, full re-index in
455.6 s), so a 5-unit ceiling is roughly 485 times the average completed job on that rail and cannot be
what blocks an honest listing. The one-open-job limit at E0 and E1 is `06-QUALITY.md`'s number for an
unproven listing, stated here because who may list is this document's scope. Nothing is payable through us at
those two rungs anyway (section 4), so it binds a listing hired on a rail it publishes itself and it binds
the moment either rung ever carries a hire. The step at E3
exists because a raised cap is the concrete thing an attestation buys, which is the only way to make an
attestation worth getting without making it compulsory. The step at E4 exists because an Altana session
makes the agent's own authority readable and revocable by the buyer, so the buyer is no longer relying on
us.

One invariant binds the two sides. **A hire is bounded by the lower of the operator's tier ceiling and the
buyer's own cap**, so a buyer running the default 50-unit daily cap in section 12.4 is capped at 50 even
against an E4 operator. The operator's tier raises what it may ask for. It never raises what a buyer has
agreed to spend.

### 4.4 Coverage today, so no rung is mistaken for a filter

| Tier | Population ceiling today | Source |
| --- | --- | --- |
| E0 | **336,088** agents, `_lastId` at block 120,141,168, 2026-09-05T16:17:48Z | SPINE's population table, the one head read every document cites |
| E1 | zero on mainnet at ship, by the decision above | this document |
| E2 | our own settled jobs at ship, every one `origin: house`, which qualifies the row and is labelled on every surface while feeding no score and no revenue figure (`02-THESIS.md` H6 clause c, section 10.2 rule 1 here), plus any third party who hires through us during judging | `02-THESIS.md` |
| E3 | about 1.5% of agent owners, 9 of 585 measured | `R10-bab-attestation.md` |
| E4 | at most **56** addresses on the whole chain, the live key count in the Altana mainnet Keystore out of 123 ever registered | `R06-altana.md` |

That row is SPINE's rather than a read of our own, because three documents reading `_lastId` three hours
apart hand a judge three different agent counts on pages that are meant to agree. The counter moved 1,153
from `MEASUREMENT.md`'s 334,935 at block 120,027,164 to that head, 114,004 blocks and 14.25 hours later,
which is 0.0101 per block or about 1,940 a day. SPINE carries that rate and also carries why it is not a
constant: MEASUREMENT's 0.011 per block, about 2,110 a day, came from a 5,000-block window, so the two
windows disagree and the rate itself moves. It is why every count in the product carries its block: a bare
agent count is stale within the hour.

E4's ceiling is the fact to keep in view. Altana's entire mainnet Keystore holds 56 live keys, so E4
identifies a handful of operators by construction and could never be a listing requirement. That is the
same shape as BABT at 1.0%, one rung further up.

### 4.5 The E4 check and the two ways to read it wrong

E4 needs a session that is live now, so it is read on every render rather than cached, by the
`session-panel` component. From `R06-altana.md`, on chain 56:

```
Keystore  0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a
  isValidKey(user, keyId) 0x8fd4f06b   getExpiry(user, keyId) 0x3b49ad47   getKeys(user) 0x34e80c34
the agent's own wallet (an EIP-7702 delegated EOA)
  canExecutePackedInfos(keyHash) 0xe5adda71   spendInfos(keyHash) 0xdcc09ebf   canExecute(...) 0xff619c6b
```

Two traps. **The allowlist and the spend cap are not in the Keystore, they live on the wallet.** The
Keystore stores the key plus the expiry and nothing else, so a product that reads only the Keystore
cannot show what the agent may do. And **expired keys stay in `getKeys`**: 7 of 8 sampled keys on one
wallet were listed while `isValidKey` returned false, so membership of `getKeys` is not liveness and
`isValidKey` is. A third, from the SDK: omitting `permissions.calls` grants **every** target inside the
cap, so a session with an empty allowlist is not a narrow session but an unlimited one. E4 requires a
non-empty allowlist for that reason.

E4 also carries the Keystore's own key identifier convention, `keyId = keccak256(publicKey)`, which is a
different value from the account's `keyHash`. Muster stores both, because the public evidence URL is
`https://explorer.altana.network/key/<full 32-byte keyId>` and a truncated key id 404s.

## 5. The onboarding lifecycle

### 5.1 Two entry points and only one of them can be delisted

Every agent enters the index without anyone's participation. The `indexer` sweeps ids 0 to
`_lastId - 1`, writes an `agent` record and creates no `listing`. That population is searchable, has a
permanent URL and is never hidden, per `02-THESIS.md` section 6.

A `listing` exists only when an operator claims and walks it through the lifecycle. So an agent we
indexed and never onboarded cannot be suspended or delisted, because it never had standing to lose. The
distinction is not cosmetic. A delisting is a statement about a party who agreed to our terms, so
applying it to a stranger's row would be a claim we have no basis for.

**Registration comes before either entry point and Muster does not offer it.** An operator with no agent
needs an `agentId` first, which is one transaction against the Identity Registry: `register(string)`
`0xf2c298be` or `register(string,(string,bytes)[])` `0x8ea42286` to set metadata in the same call
(SPINE). BNB Agent Studio's own CLI wraps both, as `bag erc8004 register` with `bag erc8004
update-endpoint` for the follow-up, which is the path `11-BNB-STACK.md` sends an operator down. Muster
calls neither. We hold no key of theirs. Minting on their behalf would leave us owning the token that
somebody else's service stands behind, which is the standing the whole ladder exists to keep straight. The
state machine below therefore starts at `pre_check` against an `agentId` that already exists.

What that registration document has to contain is not a Muster invention either, because the lint reads
the document the chain points at and nothing else: `name` at 3 to 25 characters, `description`, an
optional `image` (section 6.1), a `services[]` entry carrying a concrete `https` endpoint with no
unsubstituted `{agentId}`, plus for a Case C claimant the `registrations[]` entry section 11.3 needs. The
order that saves an operator a transaction is `preflight` first: it runs the whole lint and every gate it
can reach against a bare `agentId`, with no claim and no wallet, so the findings arrive while the document
is still one `setAgentURI` `0x0af28bd3` away from being fixed.

### 5.2 The states

`visibility` on the `listing` record takes exactly the four SPINE values. The lifecycle states below are
a separate field and the mapping between them is fixed in the table.

| State | Entered when | `visibility` | What the buyer sees |
| --- | --- | --- | --- |
| `pre_check` | anyone runs preflight against an `agentId`, no claim needed | none, no listing yet | the agent's indexed row plus a public findings report |
| `claimed` | the claim signature verifies and `isAuthorizedOrOwner` is true | `indexed` | "operator proved control at block N" |
| `linted` | the listing lint returns zero hard findings | `indexed` | the lint report, findings and all |
| `probed` | every hard gate in section 7 passes against the live endpoint | `indexed` | every gate with its verdict and the age of the check |
| `in_review` | queued for the human judgment a probe cannot make | `indexed` | "awaiting review, position N in the queue" |
| `live` | a human approved it and a passing probe is inside the freshness window | `live` | a shelf row, a compare row and a hire path where its tier and its rail allow one |
| `stale` | the newest passing probe aged past the freshness window | `indexed` | "answered N minutes ago, checking again now", no hire path |
| `suspended` | sustained probe failure, a drift, a policy decision or a screening hit | `suspended` | the reason, the evidence, the appeal path |
| `delisted` | the operator withdrew or an appeal was refused | `delisted` | the reason and the date, the row stays reachable |

**One end state and no absorbing state.** `delisted` is the only end state: it is where a listing rests
with nothing scheduled against it. Every other state has an outbound edge in 5.3, so none of them can trap
a listing. `delisted` itself keeps one edge out, back to `linted` on a re-listing, because 5.4 attaches the
history to the row rather than to the state and a delisting has to be reversible for that to mean anything.
`pre_check` is the one state with no listing record behind it, so the edge out of it is where the first
`listing` row gets written. The edge back into it on a G1 failure is where a claim becomes void.

`stale` is the state that makes the freshness contract survivable. `02-THESIS.md` H3 requires a passing
probe no older than 15 minutes at render time and this document may tighten that window but never
loosen it. Rather than let a listing render on a stale verdict or suspend an agent for one slow minute,
`live` and `stale` flip on the freshness of the newest passing probe with no human in the loop and no
loss of standing. A listing that answers again is `live` again on the next probe.

### 5.3 The transitions

| From | To | Trigger | Recorded |
| --- | --- | --- | --- |
| `pre_check` | `claimed` | claim signature plus one `eth_call` | signer, agentId, block, nonce |
| `claimed` | `linted` | lint returns zero hard findings | the full findings list, hard and soft |
| `linted` | `probed` | all hard gates pass | every gate verdict with its `probeResult` id |
| `linted` | `linted` | G2, G3, G4, G5, G6, G7 or G8 fails on the gate run | the failing gate, its state and `failureClass` per section 7, the `probeResult` id |
| `linted` | `claimed` | G10 fails, a hard lint finding on the re-run | the finding, shown to the operator and on the public row |
| `linted` | `pre_check` | G1 fails, control no longer resolves at the recorded block | the failed predicate, the block, the void claim |
| `linted` | `suspended` | G9 hits on the operator, the payee or the agent wallet | the verdict, the list fetch date, the statement of reasons |
| `probed` | `in_review` | automatic, on entering the queue | queue position, entry time |
| `in_review` | `live` | a named human approves | reviewer role, decision, timestamp, the `tokenUriHash` and the listing hash approved |
| `in_review` | `in_review` | the operator already holds four live listings, so the fifth holds here | the cap, the four listings holding it |
| `in_review` | `claimed` | a named human rejects, with a reason | the reason, shown to the operator and on the public row |
| `live` | `stale` | newest passing probe older than the window | the probe that lapsed |
| `stale` | `live` | a probe passes | the passing probe |
| `live` or `stale` | `suspended` | the escalation in section 9, a drift or a screening hit | the failing check, the evidence, whether it was automated |
| `suspended` | `live` | probe-driven suspension clears on its own once a probe passes and the reviewed hashes still match | the passing probe |
| `suspended` | `linted` | a policy or drift suspension, after the operator fixes and re-requests | the fix, the re-lint |
| `suspended` | `delisted` | appeal refused or 30 days suspended with no fix | the decision and its reason |
| any | `delisted` | the operator withdraws | the request and its time |
| `delisted` | `linted` | the operator re-lists, on the same row per 5.4 | the re-lint, with the prior delisting and its reason kept on the row |

Three properties of the table matter more than its rows.

**An edit while `in_review` is refused.** `R16-reuse.md` records the live shape this comes from: an
update re-runs listing QA and restarts the review round, so a listing edited mid-review means a human
approved bytes that are no longer there. The operator gets a plain error and a choice: withdraw the
review request or wait.

**Rejection returns to `claimed`, not to nothing.** The named reason is attached and the operator fixes
in place.

**A probe-driven suspension self-heals and a policy suspension does not.** The first is a fact about a
web server, so a passing probe is a complete answer. The second is a judgment, so it needs a human to
lift it.

### 5.4 Fix on the same agentId, never re-create

`listingId` is derived, not allocated: `keccak256(abi.encode(agentId, keccak256(category), contractVersion))`.
A second create for the same triple returns the existing row with a 409 rather than a new id, so an
off-chain catalogue can address a listing without allocating anything (`R16-reuse.md` section 3.3). A unique constraint holds
one non-`delisted` listing per `(agentId, category)` pair and a re-listing after a delist reuses the
same row so its history, its receipts and its score sample stay attached. This is the load-bearing part
of the whole lifecycle: it is what lets an agent build a record across fixes instead of resetting it
and it is why a delisting can be reversed without erasing what the agent earned.

Registration is permissionless and free beyond gas, so an operator can always mint a fresh `agentId` to
escape a bad record. Three things make that unattractive rather than blocked. The evidence ladder is per
operator address, so a new agentId under the same operator inherits the same tier and the same screening
verdicts. A new address as well resets the operator to E0 with zero jobs, which is the intended price. And
duplicate detection is on the `tokenUriHash`, so a byte-identical re-registration lands in the same
duplicate cluster as the suspended row and is visible as such. Cluster membership raises a review flag
and never an automatic suspension, because `MEASUREMENT.md` found 215 of 600 agents sharing one
byte-identical `data:` URI under 215 distinct owners and auto-suspending a cluster would punish 214
parties for one.

### 5.5 Timing and the review queue nobody pretends is automatic

Every step except `in_review` is machine-timed and completes in seconds: the claim is one `eth_call`, the
lint is a pure function, the gate run is one probe pass. Two things can hold a listing longer than that and
both are published on its row rather than hidden. `in_review` is a human reading the listing copy against
the agent's actual behaviour, which is the one judgment a probe cannot make. G8 needs a funded proving
payment, so a listing waits at `linted` when the G8 slice is spent (section 7).

So the queue is published rather than papered over. The listing page shows "awaiting review, position N",
the queue depth and the median time to a decision over the last 20 decisions. If nobody is at the desk,
a listing sits at `probed` and says so. **A listing never reaches `live` without a human approval and
the approval record names the reviewer role and the exact hashes approved.** Auto-approving and calling
it review would be the one thing in this build we are not willing to write.

At hackathon scale that human is us, which has an obvious consequence for first-party listings: the same
party builds and approves them. We do not claim independence we do not have. Instead, first-party
listings pass every gate a third-party listing passes with no exception, their jobs carry
`origin: house`, they are excluded from every revenue and volume figure and they are labelled on every
surface, per `02-THESIS.md` section 4.

### 5.6 Appeal

Every restriction writes a statement of reasons before it takes effect: the listing, the agent, the check
that failed, a pointer to the evidence, whether the decision was automated or human, the timestamp and
the block. `R15-compliance.md` grounds the shape in DSA Article 17, which requires a statement of reasons
for a restriction of monetary payments. Article 16(6) adds the standard the decision has to meet, a
"timely, diligent, non-arbitrary and objective manner", plus a duty to disclose automated processing.

The path has two speeds because the causes are different in kind. A probe-driven suspension is appealed
by fixing the endpoint: the operator re-runs preflight, the next probe passes and the listing restores
itself with no human involved. A policy suspension is appealed in writing to one human, answered within
24 hours during judging and the queue depth is public the same way the review queue is. Retention
follows `R15-compliance.md`: statements of reasons and delisting decisions for 2 years, complaint records
for at least 6 months.

## 6. The listing lint, field by field

The lint is a pure function from a candidate listing to a list of findings. It runs in three places and
is the same code in all three: in `preflight` before a claim, at `claimed` to enter `linted` and on any
drift after go-live. **Hard** findings block, **soft** findings are shown to the buyer and to the
operator without blocking. A rule is hard only where a machine can decide it from the listing bytes, a
published list or a chain read. Every judgment a person has to make is soft and routed to review, which is
the same split section 6.2 makes for the injection scan and for the same reason. The thresholds marked as
measured are the ones a live listing review enforced, recorded in `R16-reuse.md` section 1.4, so they are
numbers rather than adjectives.

| Field | Rule | Hard | Reason |
| --- | --- | --- | --- |
| `agent.name` | 3 to 25 characters, no `(test)` in any casing, no string from the published reserved-name list (the four category slugs, `Muster`, plus the protocol and token names section 8's matrix already fixes) | hard | measured. A permissionless registry with mutable metadata makes impersonation cheap (`R15-compliance.md`) |
| `agent.name`, the judgment half | a brand rather than a person, no celebrity substring | soft, routed to review | no list of people or celebrities exists that we could hold, so a hard version would be a hidden human decision dressed as a check |
| `agent.name` duplicates | if byte-identical to 5 or more other listings, the operator must differentiate | hard | `MEASUREMENT.md`: 215 of 600 agents share one name under 215 owners, so a name alone identifies nothing |
| `title` | 5 to 30 characters, distinct from `agent.name`, no price inside it, which is a number adjacent to a token symbol or a currency sign | hard | measured. The title is the only field that separates two listings on one agent |
| `title`, the judgment half | reads as a noun phrase rather than a sentence or a pitch | soft, routed to review | grammar is not a check, it is an opinion. A wrong opinion should not block a shelf row |
| `summary` | 400 character ceiling, no URL, no unsubstituted `{{` marker, exactly two non-empty parts split on a blank line or the first full stop | hard | measured. The copy that finally passed a live review was 357 of 400 characters |
| `summary`, the judgment half | part one says what it does and part two says what the buyer provides, no tech-stack name from the published lexicon, no disclaimer | soft, routed to review | whether a sentence describes the right thing is a reading. The lexicon catches the common cases without pretending to be complete |
| `category` | one of `rebalancing`, `grid`, `yield`, `health-factor`. A closed enum, no free text | hard | `R01-erc8004.md`: `getMetadata(id,"category")` is populated on zero agents, so there is nothing to inherit and the contract is `03-TAXONOMY.md`'s |
| `inputSchema`, `outputSchema` | a JSON Schema object, 2020-12 when `$schema` is absent. No parameters is written `{"type":"object","additionalProperties":false}`. Every numeric field names its unit | hard | MCP requires a tool's `inputSchema` to be valid JSON Schema defaulting to 2020-12 and x402's bazaar extension says facilitators "must validate `info` against `schema` before cataloging" (`R12-agent-comms.md`). An unvalidatable schema cannot be catalogued by anyone |
| `priceBase` | a base-unit decimal string. Never a float, never a number type | hard | SPINE's money rule. Floats lose wei at 18 decimals |
| `priceToken` | an address on chain 56 whose `decimals()`, `name` and EIP-712 domain we read at index time | hard | section 8 |
| `priceDecimals` | must equal the value read from the token contract | hard | measured. It is the exact defect that made a live listing unpayable (`R16-reuse.md` section 1.5) |
| `priceRail` | one of the SPINE enum and supported by that token | hard | `VERIFIED-payment-rail.md`: USDT on BSC supports neither EIP-3009 nor EIP-2612 |
| price bounds | at least `1e15` base (0.001 unit), at most the tier ceiling in section 4.3 | hard | a zero-value job is not evidence of anything and an unbounded price is an unbounded loss |
| `refusalConditions[]` | at least one, each naming a machine-checkable condition | hard | `02-THESIS.md` H4: a correct refusal is a pass, so a listing declaring no refusal is claiming it never refuses |
| `deliveryTarget` | one of the four job shapes plus `expectedDurationSeconds` per skill. Over 10 seconds may not declare the synchronous shape | hard | `R12-agent-comms.md` takes AIP-151's "a good rule of thumb is 10 seconds" as the line and the marketplace picks the pattern from the declaration then checks it against measured latency |
| `contactChannel` | `{ kind, target, maxLatencySec }`. `kind` is `webhook` or `email`. A `webhook` target is `https`, resolves in DNS and every resolved address is public. `maxLatencySec` is between 60 and 86,400. The channel's registrable domain must differ from the endpoint's, which is what out-of-band means. Required on all four categories | hard | G7 probes this field, so it has to exist. `R16-reuse.md` section 1.1 records the failure it answers: HTTP stayed up while the contact listener sat on a machine that was powered off for the window a review ran |
| `agent.image` | fetched server-side behind the SSRF guard, content type and magic bytes checked, byte-capped, re-encoded, served from our origin, hashed | hard on the fetch, soft on the quality floors | never hot-link operator-controlled images. `R12-agent-comms.md` records that GitHub disabled image rendering in Copilot Chat outright over the exfiltration class, despite already proxying through a signed image proxy |
| image quality | detail fraction, brightness spread at 48 pixels, colour presence and survival of a circular crop, against the floors below | soft | the floors sit between two measured images (`R16-reuse.md` section 1.7). A broken or unreadable image is a Data Quality signal rather than a hireability one |
| operator text | injection scan over `title`, `summary`, `refusalConditions[]` and `agent.description` | soft, routed to review | the listing copy is untrusted data on our side of the boundary |
| claim language | none of the banned strings "guaranteed", "risk-free", "beat the market", plus no promised rate, which is a percentage adjacent to `apy`, `apr`, `return`, `gain` or `profit` | hard | both halves are a pattern match over the bytes |
| claim language, the judgment half | no output sized to an individual, no advice framed for one person's position | soft, routed to review | `R15-compliance.md` section 3: the regulated line is personalisation, not subject matter, so it is read rather than matched |

**One request to `15-SYSTEM.md`.** `contactChannel` is a new field on `listing` and this document may not
add one, so it goes on the extension list beside `lifecycleState` and `approvedTokenUriHash`: three
subfields, `kind` (`webhook` | `email`), `target` and `maxLatencySec`. Two channel kinds and no more,
because Telegram, Discord and any other account-based channel would put a bot credential of ours on the
critical path, which section 2.5 refuses. G7 in section 7, the escalation row in 9.4 and checklist item 8
all read this one field. `15-SYSTEM.md` section 2.6 carries it, along with `listingName` and
`listingEndpoint` from 11.3.

### 6.1 The image floors and the test that cannot be quietly relaxed

`R16-reuse.md` section 1.7 carries the only lint thresholds in this document with two measured images
behind them, one refused by a live listing review and one accepted:

| Metric | The rejected image | The accepted image | Our floor |
| --- | --- | --- | --- |
| fraction of frame carrying drawn detail | 0.145 | 0.288 | 0.220 |
| brightness spread at 48 pixels | 18.3 | 32.4 | 26.0 |
| off-hue ink present | 0.0000 | 0.0037 | 0.0020 |
| detail surviving a circular crop | 0.998 | 1.000 | 0.999 |

Each floor sits between the two measurements, so it admits the image that passed and refuses the one that
failed. The pattern worth copying is the regression test: one test asserts our own first-party marks sit
above the floors and one test fails if anyone loosens a floor far enough to readmit the rejected image.

Muster does **not** require an operator to upload an avatar. It renders `image` from the registration
document when it resolves and falls back to a mark generated deterministically from the `agentId`, so no
row is ever imageless. The floors are hard only for first-party listings, where we control the file.

### 6.2 The injection scan and the false positives it will produce

The pattern list runs over every operator-supplied string, ahead of any model call and never overridable
by one (`R16-reuse.md` section 5.3):

```
ignore (all|any|the|your|previous|above)      disregard (all|the|your|previous|above)
forget (all|everything|your|the)              you are (now )?(a|an|my)\b
system prompt                                 \bnew instructions?\b
override (the|your|all|safety)                \bbypass\b        \bjailbreak\b
pretend (to be|you are|that)                  mark me (as )?(cleared|fine|healthy|ready)
```

Two disciplines come with it. The scan **flags for review and never auto-rejects**, because a security
agent whose description describes attacks will trip it, which is a measured false positive rather than a
hypothetical one (`R16-reuse.md` section 1.4). And every pattern gets a
false-positive test row, the same way an alias matcher needs `(?<![a-z0-9])alias(?![a-z])` so that
"console" cannot yield "sol".

### 6.3 What the lint checks per category, four times over

Every rule above is category-blind on purpose, so the four shelves cannot drift apart at the gate. Four
rules are not, because `03-TAXONOMY.md`'s contracts name different inputs and different units. A
listing that declares a category it cannot answer wastes a review slot. The lint reads the contract for
the declared slug and checks these four things against it, one row per category so no shelf is onboarded
on a thinner check than another.

| Category | The declared inputs the lint requires | The unit trap it rejects | What G4 then confirms |
| --- | --- | --- | --- |
| `rebalancing` | a position identifier plus the band or target weights the agent acts on, then the venue it reads | a fee tier that does not exist, since PancakeSwap v3 has no 0.3% tier (`R08-pancakeswap.md` via `03-TAXONOMY.md`) | the outputs name a drift figure and a cost to move, both with units |
| `grid` | the bounds, the step count and the order size, plus the pool and its fee tier | a win rate quoted per fill rather than per round trip, which is meaningless for a grid by construction | the outputs carry both window endpoints and the trade count |
| `yield` | the venue plus the asset, then which rate is being quoted | a rate with no unit tag, where Venus is per block, Lista Moolah per second and Aave per year in ray | every rate output carries its unit and its source call |
| `health-factor` | the account plus the venue, then the pool or E-Mode it sits in | a factor computed off the collateral factor instead of the liquidation threshold, which differs on 12 of 55 Venus core markets | the outputs carry the liquidation distance and the block it was read at |

None of the four is a judgment call, so all four are hard findings. The contract is
`03-TAXONOMY.md`'s and the assertions behind G4 are `04-AGENT-PROTOCOL.md`'s: this table is only the lint's
own read of them, kept here so an operator sees the per-category requirement before a review does.

## 7. The hard gates that block go-live

Ten gates. Every one blocks `live`. `04-AGENT-PROTOCOL.md` owns the assertions inside G5 and G8 and this
document owns which of them are gates.

| Gate | The check | On failure | Where it comes from |
| --- | --- | --- | --- |
| **G1 Control** | `isAuthorizedOrOwner(operator, agentId)` true at the recorded block or a claim accepted under section 11 | the claim is void, back to `pre_check` | the registry's own authority predicate |
| **G2 Document** | `tokenURI` resolves and the registration document parses | stays `linted`, `failureClass: shape` | `R01-erc8004.md`: about 5% of agents hold something no correct parser can read |
| **G3 Endpoint hygiene** | HTTPS, under 512 characters, no unsubstituted template placeholder, resolves in DNS, TLS certificate matches the declared hostname, every resolved address public, no redirect followed | stays `linted`, `failureClass: dns`, `tls`, `template` or `http` | `MEASUREMENT.md`: 2 of 600 hosts fail DNS, 51 of 600 declare only `{agentId}` templates and `clawnews.io` serves a `*.up.railway.app` certificate |
| **G4 Category** | the listing satisfies exactly one of the four category contracts, with `categoryBasis` recorded as `declared`, `text` or `probe` and the classifier abstains rather than guessing | stays `linted`, no probe class, the abstention and its `categoryConfidence` recorded | `02-THESIS.md` H2 |
| **G5 Payable** | every route the listing invites answers a payable challenge, carrying token, atomic amount and resolved `decimals` in the header **and** the body, emitted from one object | stays `linted`, `failureClass: http` or `shape` | earned. A live listing was delisted partly because `GET /oracle?market=BTC-4H` answered 200 with a free info blob while only POST was gated |
| **G6 Money resolves** | section 8, in full | stays `linted`, `failureClass: shape` | earned. It is the defect that made a listing unpayable for five days |
| **G7 Contact liveness** | the `contactChannel` declared in section 6 answers a live probe inside its own `maxLatencySec`, on a registrable domain different from the endpoint's | stays `linted`, `failureClass: timeout` | earned. HTTP never went down; the contact listener ran on a laptop that was powered off for the exact window a review test ran |
| **G8 Payment proven** | one real signed authorization settles end to end, 402 to pay to 200 replay, with the transaction hash recorded. The house funds it from the slice below or the operator funds it. Either way the payment is a wire proof and never a countable job | stays `linted`, `failureClass: http`. An unfunded G8 also stays `linted`, recorded as `blocked: unfunded` rather than as the seller's failure | earned. A 402 nobody has ever paid is not a wired payment path |
| **G9 Screening clean** | section 12.5, run on the operator address, the payee and the agent wallet | `suspended` with a statement of reasons. Refused at `pre_check` where no listing exists yet | `R15-compliance.md` |
| **G10 Lint** | zero hard findings from section 6 | back to `claimed` | earned |

Every failure names a state as well as a class, because a builder reading this table has to know where the
row sits afterwards and a class alone does not say.

G8 is the gate that makes the rest mean something. It is also where the hireable bar and the evidence
ladder separate. G8 asks for one settled payment on this listing's own rail. `02-THESIS.md` H6 accepts a
completed ERC-8183 job on the official kernel `0xEa4DAa3100A767e86FDed867729ae7446476EBA6` that predates
Muster entirely, which is how a third-party operator passes the bar on evidence we had nothing to do with.
28,244 such jobs already exist (`R16-reuse.md`).

**Who pays for G8, since a real payment needs real money.** Default: **the house pays**, from a G8 slice of
the float sized at **2 `$U` lifetime with a 0.25 `$U` ceiling per listing**, which is at least 8 listings
and up to 40 at the 0.05 `$U` a live BSC resource actually charges (`R12-agent-comms.md`). That slice sits
inside the float `15-SYSTEM.md` sizes at about 10 `$U`. It is separate from the demo cap in 12.4 so a spent
demo can never close go-live. It is one ready command a human authorises rather than something the build
spends on its own. A G8 payment is tagged `origin: house` whoever funded it, because neither funder is
third-party demand, so it is labelled on the row and outside every countable count. Which of the two paid is
recorded beside it as the funder.

When the slice is spent the listing holds at `linted` with "G8 unfunded, waiting on the float" published on
its public row. An operator may instead fund the proving payment themselves, which needs an address holding
`$U`, FDUSD or USD1 (the seller-side version of section 12.2's problem, since that is not the rail most
operators hold either). An operator-funded G8 is excluded from countable jobs too, because the payer is
authorised on the agent: it proves the wire, never the demand.

### 7.1 What is deliberately not a gate

Each of these was considered and rejected. The reason is a measurement rather than a preference.

- **The ERC-8004 endpoint-domain proof.** 8004scan's endpoint-verified flag is set on **5 agents of the
  303,461 it has indexed**. Whether that count is real or an artifact of a write-blocked flag is
  **unverified**: `R05-8004scan-api.md` read it three ways and got 5 each time without being able to test
  the flag, then the same filter answered `DATABASE_ERROR` at 10 seconds inside `MEASUREMENT.md`'s window
  the same day. Three of the five resolve to one owner address, which is a chain read rather than an index
  field (`R12-agent-comms.md`, `ownerOf` on ids 302257, 302258 and 304493). So the 5 is a floor on one
  index rather than a property of the chain and this gate does not rest on it, because the structural
  argument is independent and verified: RFC 8615 says well-known URIs are rooted at the
  top of the path hierarchy and "are not well-known by definition in other parts of the path", so an agent
  sharded onto `/aip/<slug>/.well-known/...` cannot prove a domain it does not own the root of. Requiring
  it would exclude 51 platform-hosted agents and 217 more from one host in a sample of 600. It is a badge
  and, in section 11, a non-owner claim proof. It is not a listing gate.
- **A Validation Registry entry.** The registry is deployed at
  `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58` and correctly wired, with **zero** validation requests
  across 1,999 sampled agents and zero platform-wide (`R01-erc8004.md`). A gate nothing has ever passed is
  not a gate.
- **An A2A card, an MCP server or OASF skills.** Of 251 A2A declarations sampled, 250 are one platform
  template that fails every published A2A schema and reads mostly `UNBOUND`, `offline` and
  `endpoint: null`, on every card checked. 12 of 13 MCP declarations point at a stdio install descriptor
  and the thirteenth is a web page returning 308. The highest-volume OASF skill string exists at no
  version of the taxonomy and the next two fail at v0.8.7 (`R12-agent-comms.md`). We consume all three
  when present, validate them and require none.
- **BABT or any attestation.** Section 3.6.
- **An uploaded avatar or a listing fee.** Section 6.1. Registration is already free beyond gas, so a
  listing fee buys nothing and adds a payment surface.

## 8. The token and price resolution gate

This is the gate with a body count. `R16-reuse.md` records the verbatim reason a live listing was delisted:
`tokenResolveError: cannot determine token decimals: token-info lookup failed ... and the accepts entry
does not provide a decimals field`. Seven distinct caller IPs fetched the challenge across five days and
not one returned with a payment. **A task that cannot be priced never pays.**

Six checks, all of them `eth_call`, run at claim, re-run on every index sweep and re-run at quote.

1. **`decimals()` is read from the token contract and asserted against the configured value.** Not
   assumed, not carried over. Every BSC stablecoin is 18 decimals (SPINE), while the reference
   implementations of this rail assume 6, so a carried constant is wrong by a factor of a trillion. The
   assertion runs at boot as well as at index time. A mismatch refuses to serve rather than serving a
   wrong number.
2. **The signature path is checked against the token, not against the token's proxy.** A proxy holds no
   dispatch table, so grepping the token address reports every selector absent. Read the EIP-1967 slot
   `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`, then check the implementation,
   then confirm with a live `authorizationState` call (`VERIFIED-payment-rail.md`).
3. **The rail must exist for that token.** The verified matrix, from `VERIFIED-payment-rail.md` and SPINE:

| Token | Address | Dec | EIP-3009 | EIP-712 domain name, version |
| --- | --- | --- | --- | --- |
| `$U` United Stables | `0xcE24439F2D9C6a2289F741120FE202248B666666` | 18 | yes | `United Stables`, `1` |
| FDUSD | `0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409` | 18 | yes | `First Digital USD`, `1` |
| USD1 | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | 18 | yes, plus `cancelAuthorization` | `World Liberty Financial USD`, `1` |
| USDT (BSC-USD) | `0x55d398326f99059fF775485246999027B3197955` | 18 | **no**, nor EIP-2612 | none, both reads revert |

   A listing priced in USDT may not declare an `eip3009` rail. It may declare a Permit2 rail, which is a
   different signature and one prior on-chain approval. `08-MONEY.md` owns which rails ship.
4. **Three free reads that turn a mid-flight failure into a pre-quote refusal.** `frozen(payer)`,
   `frozen(payee)` and `paused()` on the settlement token where it exposes them. FDUSD and USD1 both do.
   USD1 additionally exposes `reallocate(address,address,uint256)`, so the product must never tell a
   buyer their escrowed funds are beyond anyone's reach (`R15-compliance.md`). BSC-USD exposes none of the
   three, which is a trade-off rather than a win.
5. **The challenge is emitted from one object.** The header and the body are serialised from the same
   struct, so they cannot drift. That is also the answer to the obvious reviewer
   question about rewriting a challenge: nothing signed is touched, because an EIP-3009 authorization
   covers `from`, `to`, `value`, `validAfter`, `validBefore` and `nonce`, none of which appear in the
   challenge. Verification rebuilds requirements from the route config rather than from the response.
6. **A price change drops the approval.** Changing `priceBase`, `priceToken` or `priceRail` sends the
   listing back to `linted`, because what a human approved is what stays buyable. This is the cleanest
   answer to the stale-quote problem: a buyer can never sign against a price nobody reviewed.

One reading trap worth naming. WBNB never reverts on an unknown selector, because its fallback is
`deposit()`, so try-and-catch feature detection reads it as supporting everything. CAKE answers
`nonces(address)` without supporting `permit`. Feature detection by probing one function is not a check
(SPINE, `R04-bsc-tokens.md`).

## 9. Liveness probing on a schedule

`MEASUREMENT.md` states the reason this section is the product rather than a background job: the registry
has no liveness field. The one index that has one scores agent 1 `health_score: 100.0` while its
certificate does not match its own hostname and its verification error has sat unrefreshed for 108 days.
Liveness exists only because we compute it and stamp it.

### 9.1 The cadence

| Subject | Interval | Why |
| --- | --- | --- |
| `live` listing | every 5 minutes | one pass then two failures reaches the 15 minute freshness edge, so the window is never crossed silently |
| `probed` or `in_review` listing | every 60 seconds | a listing about to go live is the one we know least about |
| `stale` listing | every 60 seconds for 10 minutes, then every 5 minutes | fast recovery, then stop hammering a host that is down |
| `suspended` listing | every 15 minutes | enough to notice a self-healing fix, no more |
| `indexed` candidate in one of the four categories | every 6 hours | it feeds the candidate and answering counts on each shelf |
| the whole registry read | a full sweep **every 6 hours**, daily as the floor, plus a tail sweep on the `_lastId` delta **every 30 seconds** | measured at 183 agents/s, so about 30.5 minutes, 670 `eth_call`s and 0.27 GB for the whole registry (`R01-erc8004.md`). `15-SYSTEM.md` section 3.5 sets both figures against `03-TAXONOMY.md`'s display ceilings and a keyless sweep four times a day costs nothing |

### 9.2 Politeness and the host that owns most of the sample

The probe budget is **per host, not per listing**, because `MEASUREMENT.md` found 229 distinct endpoint
URLs across just **9 hosts**, with `evoevo.ai` holding 217 of them. A per-listing rate limit would point
217 requests at one host at once, which is an attack rather than a health check.

The rules, the same discipline `MEASUREMENT.md` ran its own probes under: `robots.txt` fetched first and its
`Disallow` honoured, one request per 1.5 seconds per host, an 8 second timeout, one retry and only on a
network-layer failure, a user agent that states what the request is for, `If-None-Match` sent on refetch
and a 304 treated as a successful probe.

One request per 1.5 seconds per host is 600 probes per 15 minute window, so a single host can carry up to
600 live listings inside the freshness contract. Above that the listings on that host rotate and their
rows show a longer check age, stated on the page rather than hidden.

### 9.3 The SSRF guard runs on every probe, not once at review

A listing URL is operator-controlled input. A host that resolved public at review can resolve to
`169.254.169.254` an hour later. So the guard re-resolves on every probe, checks **every** returned
address rather than the first, refuses to follow redirects and truncates the body before anything reads
it (`R16-reuse.md` section 2.5). A2A's own security text asks for the same thing, naming `127.0.0.0/8`,
`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, localhost and link-local
(`R12-agent-comms.md`).

The standard library is not enough on its own. `R12-agent-comms.md` measured that Python's
`ipaddress.is_global` returns True for `224.0.0.1`, `239.255.255.250`, `ff02::1`, `ff00::1` and
`64:ff9b::7f00:1`, so multicast and NAT64 pass a naive check. The deny list is explicit and tested for
those five shapes.

### 9.4 What a failed probe does to visibility

The escalation, in order of severity. Note that the buyer is protected by `stale`, which costs the
operator nothing, so suspension is reserved for a change of state rather than a slow minute.

| Event | Effect |
| --- | --- |
| one failed probe on a `live` listing | recorded, no visibility change, immediate retry with backoff. The row shows "last check failed, retrying" with the failure class |
| newest passing probe older than 15 minutes | `stale`. Hire path closed, shelf row withdrawn, no standing lost, restores itself on the next pass |
| 6 consecutive failures spanning at least 30 minutes | `suspended` with a statement of reasons. Self-heals when a probe passes |
| the endpoint resolves to a private, loopback or link-local address | `suspended` immediately, no retry. This is a hostile change rather than an outage |
| a route that answered a payable challenge now answers a free 200 | `suspended` immediately. This is the G5 regression that got a real listing delisted |
| `decimals` no longer resolves or the rail no longer supports the token | `suspended` immediately, G6 |
| `tokenUriHash` differs from the hash approved at review | `suspended`, then `linted`, then re-review |
| `getAgentWallet` changed or went to zero | `suspended` pending a re-claim. Zero means the token was transferred |
| a screening hit on the operator, the payee or the agent wallet | payment blocked, `suspended`, statement of reasons |
| the `contactChannel` stays silent past its own `maxLatencySec` on 3 consecutive probes | `suspended`, G7 |

### 9.5 Failure classes are never merged into "offline"

`probeResult.failureClass` takes exactly the SPINE values `dns`, `tls`, `http`, `template`, `shape` and
`timeout`. The row renders the class rather than a status light. `MEASUREMENT.md` found all of the
first four in one sample of 600 and each needs a different fix from a different person: two hosts that do
not exist in DNS, a certificate bound to `*.up.railway.app` on a host that resolves and redirects fine, two
live hosts returning 404 for their own declared card and 51 agents whose endpoint still contains a literal
`{agentId}`. Collapsing those into "offline" destroys the only actionable part of the finding. It is
also the thing a judge scoring Data Quality can check row by row.

A related trap the same file names: **200 is not existence.** `https://evoevo.ai/.well-known/agent-card.json`
returns HTTP 200 with `text/html` and 74,239 bytes, the SPA shell. Every probe that expects a document
requires a JSON content type or a successful parse before it records a pass.

### 9.6 The drift probe, because review means nothing without it

`setAgentURI`, `setMetadata` and `setAgentWallet` are callable by the owner at any time
(`R15-compliance.md` names silent capability change as a prohibited practice for exactly this reason). So
the review record pins three hashes, the `tokenUriHash`, a hash over the approved listing fields and the
`reviewedCardHash` that `04-AGENT-PROTOCOL.md` probe C05 compares against the served card. Every
probe cycle re-reads all three. A drift is not an outage and it is not fraud, so it suspends and routes to
re-review rather than to a delisting. `15-SYSTEM.md` section 2.6 stores all three under those names.

### 9.7 One third-party corroboration, rate limited and honest about its bugs

When an operator does publish the endpoint-domain proof, Muster triggers
`POST https://api.8004scan.io/api/v1/agents/verify-endpoint/56/{token_id}`. It needs **no auth** and is
capped at **once per hour per agent** (`R05-8004scan-api.md`), so the button carries a countdown rather
than a silent failure. The value is a second party attesting the same fact.

Two things we do not do with that response. We never display `endpoint_last_checked_at` as freshness,
because `R05-8004scan-api.md` proved it does not move even when a verification demonstrably runs, so we
read `updated_at` and the error string. And we never display their `health_score`, because it read 100.0
for an agent whose certificate does not match its hostname.

## 10. Anti-wash on the seller side

An operator controls both ends of a fake job: it can pay itself and mint the settled-job evidence the whole
marketplace is built on. This is the attack our own unit of account invites, so it gets a defence rather
than a disclaimer.

### 10.1 The structural invariant

Every `ledgerEntry` carries `origin`, exactly `house` or `order`. The `ledger` refuses any other value
at append time. Revenue and volume claims count `origin: order` only. House entries render on the same
public page, visibly distinct. The tag is a structural invariant rather than a display convention
(`R16-reuse.md`), which is what matters: a tag enforced at write time cannot be forgotten by a renderer.

### 10.2 The countable-job rule

**Countable** is a weighting word, not a gate word. A settled job is countable when its payer is a
distinct third party. Countable jobs are what a tier's shelf count and a concentration figure are
computed from. Reaching E2 is a different question with a different answer: E2 asks for one settled job in
a terminal paid state with a recomputable receipt, so a job that qualifies the row under `02-THESIS.md`
H6 qualifies it whether or not it is countable. Getting that backwards is how an anti-wash rule empties
four shelves on the day it ships, so the two words stay apart. The score sample is not this document's:
`06-QUALITY.md` caps a buyer's contribution at `C = 3` effective jobs and that cap, not the share rule
below, is what protects `S` and `N`.

Four rules, all computable from data we already hold.

1. **Excluded payers.** A job is not countable when the payer equals `ownerOf(agentId)`, equals
   `getAgentWallet(agentId)` or returns true from `isAuthorizedOrOwner(payer, agentId)`. The last one is the
   important one: ERC-8004's own self-feedback guard is exactly this check and it is **one wallet deep**, so
   registering from wallet A and paying from unrelated wallet B passes it (`R10-bab-attestation.md`). We use
   it as a floor, not as the defence. **Two carve-outs, both explicit.** A G8 proving payment is a valid
   wire proof and never a countable job, whoever funded it. And a job with `origin: house` qualifies the row
   under `02-THESIS.md` H6 clause (c), carries its label on every surface and enters no countable count, no
   revenue figure and no volume figure, which is why the house paying for its own first-party listings
   breaches nothing below.
2. **Per-payer share cap, which truncates rather than excludes.** Above a floor of **12 countable jobs** on
   a listing, no single payer contributes more than **25%** of its countable job count or countable value:
   the excess is truncated at the cap and the jobs beyond it stop adding, while every job that payer already
   contributed still counts. A job is never made non-countable by this rule and no listing loses a real
   customer to it. Below the floor the share test does not run at all, because with one, two or three payers
   every payer is over 25% by arithmetic and a test that fires there would refuse the first honest customer
   along with the fake one. The floor is 12 because `06-QUALITY.md` weighs at most `C = 3` effective jobs per
   buyer, so four distinct payers is the smallest set where a 25% share is reachable at all: 4 times 3 is
   12.
3. **Distinct payers are published, not just counted.** Every listing shows `distinctPayerCount` beside its
   job count and a concentration figure. The measured precedent is the whole argument. On the official
   ERC-8183 kernel one address holds **56,167 of 56,713 jobs and 281.56 of 292.24 `$U` paid**, which is
   99.0% of jobs and 96.3% of value. **18 of the 28 providers with any completed job have their entire
   record from a single client address** (`R16-reuse.md`). A marketplace that shows that, labels it and
   weights a one-client record down is demonstrating Data Quality rather than asserting it.
4. **A price floor is not the defence.** The floor of `1e15` base in section 6 exists to exclude zero-value
   jobs, nothing more. It cannot be the anti-wash mechanism, because a completed job on that rail runs
   about 0.0103 `$U` on average (292.24 `$U` over 28,244 jobs) and a floor high enough to make self-dealing
   expensive would exclude the honest population. Counterparty distinctness is the defence, price is not.

### 10.3 Clustering signals, split by what ships

Ships by 2026-09-09, because each is one `eth_call` or one row we already have:

- payer is the owner, the agent wallet or authorised on the agent
- payer's only Muster counterparty is this one provider
- the provider's payee address and the payer address are the same address
- one payer above the 25% share in rule 2, once the listing is past that rule's 12-job floor
- the listing sits in a `tokenUriHash` duplicate cluster with another listing under the same operator

Documented as next, because each needs a transfer index we do not build in three days:

- the payer's funding source traces back to the operator's own address within N blocks
- net flow between payer and payee returns to zero after each job, which is a round-trip refund
- shared nonce or gas-funding patterns across a set of payers

**The residual attack is named rather than claimed solved.** An operator paying itself through an unrelated
address it controls is not detectable from a single settle. It is a clustering heuristic that needs real
data to tune, so it runs continuously as a listing-standing check rather than once as a gate. Saying so is
the honest position and it is what `R16-reuse.md` concluded from the same problem.

### 10.4 Asymmetric handling

The screening design in `R15-compliance.md` supplies the shape and it applies here too. A hit on a rule
that is factual (payer equals owner) is an automatic exclusion from the count with a public reason. A hit on
a rule that is inferential (cluster membership, concentration) is a review flag and never an automatic
action. Getting this backwards is how a marketplace punishes 214 owners for one shared metadata blob.

### 10.5 Two lines we do not cross

No administrative route can mutate the ledger. A corrupted store refuses to boot rather than serving a lie.
And losses render as prominently as wins. A refusal, a failed job or a dispute lost appears on the listing
page with the same weight as a settled one (`R16-reuse.md`), because a record a buyer can check is the
product and a flattering record they cannot check is not.

## 11. Claiming an agent somebody else registered

Every agent in the registry, 336,088 of them at block 120,141,168 (SPINE), was registered by a party that
has never heard of Muster. The claim flow is how any of them becomes a listing. It has four cases.

### 11.1 Case A, the owner claims

`isAuthorizedOrOwner(claimant, agentId)` returns true because the claimant is `ownerOf`. One signature, one
`eth_call`, done. This is the common case and it is the whole of section 2.2.

### 11.2 Case B, an approved operator claims

The same call returns true through `isApprovedForAll(owner, claimant)` or
`getApproved(agentId) == claimant`. This is the platform case: a platform that minted on behalf of its
users can `setApprovalForAll(operatorAddress, true)` once and then claim its fleet, with one signature per
listing and no token transfers. The record stores which of the three predicates answered, because
"approved" and "owner" are different standing and a buyer should see which one this is.

### 11.3 Case C, the claimant is not authorised on chain

This is the real case behind the two biggest blocks in the population: 51 agents in a sample of 600 are
minted by one platform onto its own template endpoints and 217 endpoint URLs in the same sample sit on one
host (`MEASUREMENT.md`). The operator of the actual service is often not the address holding the token.

**The only non-owner proof Muster accepts is control of the endpoint domain**, on the ERC-8004 rule read
verbatim from the live EIP in `R12-agent-comms.md`: publish
`https://{endpoint-domain}/.well-known/agent-registration.json` carrying a `registrations` entry whose
`agentRegistry` and `agentId` match the on-chain agent. Five traps come with it, all measured, all of which
the checker handles:

1. **Case.** The CAIP-2 prefix is compared case-sensitively and the address case-insensitively, because
   on-chain documents write `0x8004A169FB4a...` checksummed and lowercased interchangeably.
2. **200 is not existence.** A JSON content type or a successful parse is required, plus a present
   `registrations` array.
3. **Type and the zero placeholder.** `agentId` appears as a JSON number in some documents and a quoted
   string in others, so it is coerced before comparison. One live agent's `registrations` spans 22 chains
   and three entries carry `agentId: 0`, which is a placeholder in practice, so the full triple is matched
   and a 0 in a `registrations` entry is treated as unusable. That is a heuristic and it has a cost worth
   naming: **agent 0 is a real agent**, `dAi` under owner `0x8CE2b1348740D27d6075F602Ad679a041407fdEc`,
   confirmed by `ownerOf(0)` today, with ids starting at 0 rather than 1 (SPINE, `MEASUREMENT.md`). Section
   5.1 indexes it like any other. So agent 0 can be claimed under Case A or Case B and never under Case C.
   The row says so rather than failing silently.
4. **The two documents drift.** On the one BSC agent where both were compared the `agentURI` copy listed 12
   services and the well-known copy listed 8, with no A2A entry at all. Endpoints are read from the
   `agentURI` document, the one the chain points at. The well-known file is used only as the domain proof it
   is defined to be.
5. **Nested paths are not well-known.** Per RFC 8615 a proof at `/aip/<slug>/.well-known/...` is not a
   well-known URI, so a platform-sharded agent cannot pass this at all and gets Case D instead.

A Case C claim grants strictly less than Case A or B. It creates a listing, it earns E0, it can reach E2 on
settled work and it can reach E3 or E4 on the operator's own attestations. It never grants any authority
over the agentId, so Muster will not call `setAgentURI`, `setMetadata` or `setAgentWallet` on that agent's
behalf and the payee still comes from `getAgentWallet` on chain rather than from the claimant. The row
states "endpoint domain proven, on-chain owner is a different address" in those words.

**How a Case C listing satisfies a rule that reads the chain.** Two hard rows in section 6 and one leg of G3
read fields inside the registration document, which a Case C claimant cannot write. Left alone,
the two populations Case C exists for would face findings they are structurally unable to fix: the 51 agents
whose endpoint still carries a literal `{agentId}` and the 215-agent byte-identical cluster. Section 6.1
already sets the pattern by falling back to a mark generated from the `agentId` when `image` does not
resolve, so the same shape applies here. The listing carries two Muster-owned fields, both labelled as ours
rather than the chain's:

| Field | Stands in for | Accepted only when |
| --- | --- | --- |
| `listingName` | `agent.name`, where a hard name row fails, including the 5-or-more duplicate test | it passes every hard name row itself. The row prints "display name set on Muster" beside the registry name and both stay searchable |
| `listingEndpoint` | the declared endpoint, where it carries an unsubstituted template placeholder | its registrable domain equals the domain the Case C proof resolved on. G3 then runs against it unchanged and the row prints both the chain's string and the one we probe |

Neither field touches the chain. Neither is offered to Case A or Case B, who can fix the document itself
with one `setAgentURI` and should. Without them a Case C listing sits at `linted` forever with a finding it
cannot answer, which would make Case C a path we advertise and nobody can walk. **Two more fields for
`15-SYSTEM.md`'s extension list**, beside `contactChannel`.

### 11.4 Case D, a transferred agent and a contested claim

A zero `getAgentWallet` means the token changed hands, because `_update` clears the slot on transfer
(`MEASUREMENT.md`). The old operator's claim is void from that block, the listing suspends and the new
holder can claim it. History stays attached to the `agentId` and the listing page shows the transfer, since
hiding it would let a bad record be laundered by a sale.

Two claims for the same agent are resolved by on-chain authority, in this order: an authorised claimant
(Case A or B) beats a domain claimant (Case C). A later domain claimant does not displace an earlier one
while the earlier proof still resolves. If neither proof resolves the listing suspends until one does. There
is no ticket queue and no human tie-break, because the tie-break is a chain read.

Two things a claim never does. It never re-registers the agent: an operator fixing anything works on the same
`agentId` under section 5.4. And it never sets a payout address from a form, per section 2.4.

**Re-pointing the payee is possible and nobody on BSC has done it.** `setAgentWallet` moves the receiving
wallet away from the holder and its EIP-712 payload must be signed by the **new wallet**, not the owner,
with `block.timestamp <= deadline <= block.timestamp + 300` (`R01-erc8004.md`). All 600 sampled agents still
have `getAgentWallet == ownerOf`. Muster ships the builder for that signature with the 300 second window
enforced client-side, exercises it once on a first-party agent so the flow is proven rather than asserted
and records the transaction hash in the packet. Until that hash exists this is a build task, not a claim.

## 12. Buyer onboarding

### 12.1 The zero-knowledge-of-Agent-Studio path

The rubric asks that "Someone with zero Agent Studio knowledge should be able to get through it without
hitting a dead end". So the whole browse, understand and compare journey requires **no wallet, no login, no
signature and no token**:

`land` to `shelf` to `listing` to `compare` to `receipt`. Every page is anonymously fetchable and has a
permanent URL. A stranger can read a shelf, read four category shelves, open two listings side by side, open
a receipt of a job that already settled, copy its `recomputeCommand` and reproduce the content hash on their
own machine. That journey ends on a page rather than a paywall, which matters because a judge holding no BSC
stablecoin must still be able to finish something.

Nothing on that path asks who they are. No cookie wall, no email capture, no connect-wallet modal on load.
The connect button appears at the hire and nowhere earlier.

### 12.2 What a buyer actually needs before a first hire

Three doors and the page states which one the buyer is standing in before they connect.

| Door | Buyer needs | Cost of the first hire | Ships |
| --- | --- | --- | --- |
| **A. Signature rail** | an address holding `$U`, FDUSD or USD1 | **one typed-data signature, no transaction, no BNB.** Our submitter pays gas, measured at 103,377 gas for `$U`, 103,395 for FDUSD, 108,164 for USD1, about 0.0000052 BNB at 0.05 gwei | yes |
| **B. USDT rail** | an address holding USDT plus a little BNB | one on-chain `approve(Permit2, max)`, measured at 46,446 gas paid by the buyer, then one signature per hire with 70,157 gas per settle paid by the relayer | documented as next, `08-MONEY.md` owns it |
| **C. No tokens at all** | nothing | none. The read-only journey in 12.1, plus the live receipts of hires that already happened | yes |

Door A is the default because it is the only path where the first hire is one signature and nothing else.
Door B reaches one signature per hire too, after one on-chain `approve`, which is why
`VERIFIED-payment-rail.md` ranks Permit2 `SignatureTransfer` second rather than nowhere. What no BSC token
outside Door A can do is skip that first transaction: USDT supports neither EIP-3009 nor EIP-2612, nor does
Binance-Peg USDC or BUSD. Circle lists no native USDC on BNB Smart Chain at all. That is a
real cost and it is the honest trade-off to state: the rail that lets a buyer sign once is not the rail most
buyers hold.

The seller side of the same problem is smaller and it still exists. An operator who funds their own G8
proving payment needs an address holding `$U`, FDUSD or USD1 for the same reason a Door A buyer does, so the
default is that the house funds G8 (section 7) and the operator-funded route is the alternative rather than
the requirement.

Door C is what carries the criterion during judging rather than a testnet toy. `15-SYSTEM.md` owns the
anonymous canary that runs the whole journey through 2026-09-23 and its output is a receipt minted minutes
ago that any judge can open and recompute without holding anything.

### 12.3 Wallet options and the one dance that always breaks

Muster connects to any EIP-1193 provider and asks for nothing proprietary. The connect step does three
things in order: request accounts, `wallet_switchEthereumChain` to `0x38`, then
`wallet_addEthereumChain` on error code **4902** with BSC's own parameters and BNB at 18 decimals as the
native currency. That fallback exists because a wallet that has never seen chain 56 rejects the switch. It
is the failure a judge hits on a fresh profile.

Binance Web3 Wallet is the wallet the programme's own users hold. Its injection path and its connector
package are **unverified** (`R16-reuse.md` section 6.2, which records the connector as unread). So it is
treated as an EIP-1193 provider like any other and tested at build time. No claim about it appears in the
product until a real connection is observed.

All card, manifest and endpoint fetching happens server-side. `R12-agent-comms.md` measured that
`arcabot.ai` serves its agent card with no `Access-Control-Allow-Origin` header at all, so a browser fetch
from our origin fails as a network error with no status, which is the worst possible diagnostic. Muster
serves its own normalised copy with its own cache headers and a browser never talks to a listed agent's
host directly.

### 12.4 Buyer-side spend controls

Four brakes. The first two are what stop a single bad listing from emptying a wallet.

- **A per-listing price ceiling** from section 4.3, plus the lower-of-the-two rule there, so a hire can
  never exceed the buyer's own cap whatever tier the operator holds.
- **A per-buyer rolling 24 hour cap**, default 50 units, lowerable by the buyer, returned as `limit`,
  `spent` and `remaining` in base units so a buying agent can check it before it signs.
- **A per-IP rolling-minute limit** on the public try-it path, at **6 paid attempts a minute per IP**, plus a
  **per-request planner budget of 0.25 `$U`**, plus a **global lifetime demo cap of 3 `$U`** after which the
  demo keeps answering and stops spending. A judged site needs all three, with a number rather than a name
  for each, so a reviewer can check what the code enforces. The demo cap is separate from the G8 slice in
  section 7, so a spent demo never closes go-live.
- **Revocability the buyer can read.** For an E4 operator the `session-panel` renders the agent's live
  allowlist, spend cap and expiry from chain on every render, with a Revoke button. The same session is
  readable by a stranger at `https://explorer.altana.network/key/<full 32-byte keyId>`. SPINE names the
  action `revokeSession` and `08-MONEY.md` owns the calls behind it, both layers and both key identifiers, so
  they are not restated here.

### 12.5 Screening, on both sides

Four checks at quote and again at settlement, because the interval between them is when a designation or a
freeze lands (`R15-compliance.md`):

1. `isSanctioned(counterparty)` on `0x40C57923924B5c5c5455c48D93317139ADDaC8fb`, selector `0xdf592f7d`,
   about 3,694 gas over base. I ran it today against a live agent owner and it returned false.
2. Membership in a locally ingested set of the OFAC SDN EVM addresses, 91 today, chain tag ignored, with the
   fetch timestamp stored beside the verdict. The cache lives at most 24 hours and a stale cache refuses to
   serve rather than serving silently on old data.
3. `frozen(payer)` and `frozen(payee)` on the settlement token where exposed.
4. `paused()` on the settlement token.

Both legs are needed. Of 91 distinct EVM-format SDN addresses the oracle flags **57**. Of the 42 that are
active on BSC it misses **20**. So screening through the oracle alone misses live SDN addresses on the
chain we settle on. Screening the SDN list's `BNB`-tagged subset instead matches exactly one address, which
is a Beacon Chain bech32 string no EVM screen will ever match.

The screen runs on the **direct counterparty of the payment we are quoting**, never on transaction-graph
proximity. Anyone can send 1 wei to a thousand addresses, so a proximity rule hands the attacker the choice
of who gets frozen. A positive on the direct counterparty is a hard block with a plain reason shown.
Anything softer is a flag for review and never an automatic action.

### 12.6 What we never ask a buyer for

No email, no password, no OAuth, no private key or seed phrase for any reason, no unbounded token approval
created on our behalf, no payment card, no government document, no IP address stored joined to a wallet
address. A buyer record holds the wallet address, the job ids, the deliverable hashes, the amounts with their
tokens, the timestamps and the screening verdicts with their list-fetch dates. Every one of those is either
already public on chain or is a record we are required to be able to produce (`R15-compliance.md`).

## 13. The go-live checklist

Twelve lines. Every one is a real failure somebody already paid for and every one has an artifact attached
to the listing record so a reviewer or a judge can check it rather than take it on trust.

1. **Control proven.** `isAuthorizedOrOwner(operator, agentId)` returned true with the block recorded.
   Failing that, a Case C domain proof resolved and matched the full CAIP-2 triple.
2. **Document readable.** The `resolver` returned a parsed registration document and recorded which of the
   six `tokenURI` shapes it was, including the `data:application/json;enc=gzip;level=6;base64,` variant that
   is a gzip stream rather than JSON.
3. **Endpoint hygiene.** Anonymously fetched from outside our own network, not with our own credentials.
   DNS verdict, TLS verdict, HTTP status and latency recorded. No unsubstituted `{agentId}`. Every resolved
   address public. No redirect followed.
4. **Category settled.** Exactly one category contract satisfied, with `categoryBasis` and
   `categoryConfidence` recorded and the classifier abstained rather than guessed if it was unsure.
5. **Every invited route is payable.** Both verbs, every route the description invites, each answering a
   402 whose decoded challenge is attached to the record.
6. **The challenge is one object.** Header and body serialised from the same struct, both carrying token,
   atomic amount and resolved `decimals`.
7. **Money resolves.** `decimals()` read from the token and asserted against the config, the rail supported
   by that token, `frozen` and `paused` clean where exposed.
8. **Contact channel answered.** The `contactChannel` probed live, an ack inside its own `maxLatencySec`,
   with its timestamp, on a registrable domain different from the HTTP endpoint's.
9. **One payment settled end to end.** 402 to pay to 200 replay, with the chain 56 transaction hash plus the
   funder named on the record: `house` from the G8 slice in section 7, `operator` where the operator paid.
   Either way the row is `origin: house` and outside every countable count.
10. **Screening clean.** All four checks on the operator address, the payee and the agent wallet, with the
    SDN list's fetch date stored beside each verdict.
11. **Lint clean.** Zero hard findings. Soft findings visible on the public row rather than swallowed.
12. **A named human approved it.** The approval pinned the `tokenUriHash` and the listing hash. A passing
    probe sits inside the 15 minute freshness window at render time.

One addendum for a first-party listing: it passes all twelve with no exception, its jobs carry
`origin: house`, it is excluded from every revenue and volume figure and it is labelled as ours on every
surface it appears on.

## 14. What ships by 2026-09-09

| Ships | Documented as next |
| --- | --- |
| claim by EIP-712 signature plus `isAuthorizedOrOwner`, Cases A, B, C and D | `OperatorBond` anywhere. The contract, its surface and its terms are specified and it is deployed on no chain, so nothing holds a stake by 2026-09-09 (`three/decisions/05-onboarding-operatorbond-not-deployed.md`) |
| the optional on-chain `muster.claim` marker, simulated clean against mainnet today | door B, the USDT Permit2 rail, with the proxy address and the measured costs published |
| `preflight` as a public endpoint and a CLI, the same code path as the `prober`, runnable by anyone against any agent in the registry | funding-source tracing and net-flow round-trip detection, both of which need a transfer index |
| the lint, every field in section 6, as one pure function used in three places | a second reviewer on drift re-review, so the same party does not approve twice |
| all ten hard gates, with G8 dependent on the float a human authorises | an operator dashboard beyond `preflight` |
| the token and price resolution gate, with the `decimals()` assertion at boot | host-budget rotation above 600 live listings on one host |
| the probe scheduler, per-host budgets, the `live` and `stale` flip, the escalation table, the drift check | a BNB Passport leg that returns true for somebody |
| E0, E2, E3 with two live legs and one wired-and-honest leg, E4 as a live session read | |
| screening, the oracle plus the SDN ingest plus `frozen` and `paused` | |
| buyer doors A and C, the no-wallet journey and the one-signature hire | |
| statements of reasons, the self-healing appeal and the published review queue | |

One dependency in that left column and it is money rather than access. G8 settles a real payment, so a
listing reaches `live` only once the G8 slice is funded: 2 `$U` lifetime at a 0.25 `$U` ceiling per listing,
inside the float `15-SYSTEM.md` sizes at about 10 `$U`, surfaced as one ready command because moving real
money is a human decision. Nothing else on the left depends on a credential, an API key or a partner grant,
which is the property that makes the date believable.

## Decisions and rejected alternatives

**1. BABT is a tier, never a gate.** Rejected: requiring a BABT to list, which is the obvious reading of a
"human verification" requirement. Why: 6 of 585 BSC agent owners hold one, 1.0%. 576 of 585 hold no
attestation at all. A BABT gate leaves about nine listable agents from a sample of 600 agents under 585
distinct owners, scores zero on Agent Diversity and cannot fill four mandated shelves.

**2. E3 is an OR across BABT, Galxe Passport and the BNB Passport reader.** Rejected: BABT alone, on the
grounds that it is the BNB-native credential. Why: BABT needs a Binance account, which is unavailable in
several jurisdictions. Galxe Passport needs a Sumsub pass and no exchange at all. The BNB Passport SDK
documents six providers including Coinbase, Upbit, Bithumb, OKX and Bybit. An OR costs one extra slot in an
`aggregate3`.

**3. The E1 bond is `OperatorBond` with a permissionless release. No stake sits in an escrow of ours at
any date.** Rejected: a bond held in Muster's own escrow, which is what SPINE's ladder says and what an
earlier pass planned. Also rejected: holding an unsubmitted EIP-3009 authorization as collateral instead of
a contract. Why: a stake we hold and then direct to a buyer is value accepted from one party to pass to
another, which FinCEN FIN-2019-G001 puts inside the money-transmitter definition, while the payment-processor
exemption fails on a crypto rail (`R15-compliance.md`, `09-DISPUTES.md` section 6, plus the same reasoning
already kept a payment contract of ours off the hire path). A stored authorization that outlives the job it
was signed for is separately what our own data posture forbids. What ships is the contract, its four calls
and its terms on chain 97, with mainnet documented as next. The visible cost is that the E1 rung is empty on
mainnet at ship. No shelf row depends on it, because shelf placement is E2.

**4. The ERC-8004 endpoint-domain proof is not a go-live gate.** Rejected: keeping it as a hard gate, which
is what the prior pass in this lane had, on the strength of a real rejection where a missing
`/.well-known/agent-registration.json` failed a marketplace's x402 validation. Why: RFC 8615 makes it
structurally unpassable for any multi-tenant platform, because a nested path is not a well-known URI, so
keeping the gate would have excluded 51 platform-hosted agents and 217 more on one host in a sample of 600.
That argument is verified and it stands on its own. The often-quoted 5 passing agents is 8004scan's
endpoint-verified flag over the 303,461 rows it holds, with three of the five under one owner address, while
whether the count is real or an artifact is unverified (section 7.1), so the decision does not rest on it.
It survives as a badge and as the only accepted non-owner claim proof.

**5. `stale` is a separate automatic state, not a suspension.** Rejected: suspending a listing the moment its
freshness window lapses. Also rejected: rendering a shelf row on a stale verdict. Why: the first treats a
thirty second outage as misconduct and burns the operator's standing, the second breaks the freshness
contract in `02-THESIS.md` H3. `stale` closes the hire path immediately, costs the operator nothing and
restores itself on the next passing probe.

**6. A human approval is mandatory and the queue is published.** Rejected: auto-approving a listing that
passes all ten gates, which would have removed the only non-instant step. Why: the gates cannot judge whether
the description matches what the agent actually does. Calling an automated pass a review would be a claim
that a human read something no human read. The cost is a queue, so the queue is public with its
depth and its median decision time.

**7. An avatar is not required and the image floors are hard only for first-party listings.** Rejected: a
mandatory uploaded image with a URL alone refused, which is the rule a live listing review applied and the
floors in 6.1 come from (`R16-reuse.md` section 1.7). Why: that review saw operators uploading one file
each. We index 336,088 rows at block 120,141,168 (SPINE) that arrive with whatever `image` they already
have, so blocking go-live on picture quality would empty four shelves for a reason unrelated to
hireability. The floors, the two measured images behind them and the test that cannot be quietly relaxed all
survive.

**8. Anti-wash is counterparty distinctness with a truncating 25% per-payer share cap, not a price floor.**
Rejected: a minimum job price high enough to make self-dealing expensive. Also rejected: applying the share
cap to the score sample, which `06-QUALITY.md` protects with its own `C = 3` per-buyer cap. Why: a completed
job on the official ERC-8183 kernel runs about 0.0103 `$U` on average (292.24 `$U` over 28,244 jobs), so any
floor that deters a wash trader excludes the real population. The floor that ships, `1e15` base, only
excludes zero-value jobs. The share cap truncates a payer's excess rather than voiding jobs and it does not
run below 12 countable jobs, because otherwise a listing with one honest customer would fail it by
arithmetic.

**9. The payout address is read from chain and never from a form field.** Rejected: an operator-supplied
payout field, which every other listing form in the world has. Why: it is the single field that turns a
listing into a theft vector and `getAgentWallet` already answers, with a zero value carrying the useful
signal that the token was transferred.

**10. Screening is the Chainalysis oracle plus a locally ingested SDN EVM set, on the direct counterparty
only.** Rejected: the oracle alone. Also rejected: flagging on transaction-graph proximity. Why: of 91 SDN
EVM addresses the oracle flags 57. It misses 20 of the 42 that are active on BSC, so a single source leaves
a gap on the chain we settle on. Proximity is worse than useless because anyone can send 1 wei to a thousand
addresses and thereby choose who gets frozen.

**11. A duplicate cluster raises a review flag, never an automatic suspension.** Rejected: suspending every
listing sharing a suspended row's `tokenUriHash`, which would be the cheap way to stop a re-registration
escape. Why: 215 of 600 sampled agents share one byte-identical `data:` URI under 215 distinct owner
addresses, so cluster-wide action punishes 214 parties for one.

**12. The probe budget is per host, not per listing.** Rejected: a per-listing rate limit, which is the
obvious implementation. Why: 229 endpoint URLs in the sample resolve to 9 hosts and one host holds 217 of
them, so a per-listing limit aims a burst at a single third party.

**13. `listingId` is derived from `(agentId, category, contractVersion)` and a re-create returns 409.**
Rejected: allocating a fresh id per submission. Why: a fix has to land on the same `agentId` and the same
row. Otherwise an agent loses its receipts, its score sample and its history every time it corrects
something. A delisting also stops being reversible.

**14. Muster never calls `register`, so registration is not a product surface.** Rejected: minting an
`agentId` for an operator inside the product, which is the obvious way to make the funnel one page shorter.
Why: whoever sends `register` owns the token, so doing it for somebody would leave us holding the identity
that their service stands behind. Taking their key instead is worse. The operator runs `bag
erc8004 register` or the registry call directly (section 5.1), then `preflight` tells them what the lint will
say before they spend a second transaction. The cost is one step we do not control. It is the same step
every third-party operator on the chain has already taken 336,088 times.

**15. The tier caps are chosen numbers, published as chosen.** Rejected: scaling them off the measured median
job, which would make them look derived. Why: the honest reference points are 0.0103 `$U` per completed job
on the official rail and a 70 USDC median listing price on the incumbent agent market (`R16-reuse.md`,
`R07-termix.md`), which sit four orders of magnitude apart, while no category on our own shelves has a
counted median on day one. A number we picked and published beats a number we derived from a statistic that
does not exist yet. They move in a changelog entry once a category has its own counted median.

**16. A wallet signature is the whole account: no email, no password, no OAuth.** Rejected: an account system,
which every marketplace has and which would carry a password reset, a session store and a support path. Why:
the link between a wallet address and a person is what turns a pseudonymous address into personal data, which
EDPB Guidelines 02/2025 make explicit by naming a breach of our own database as exactly the means that makes
that link reasonably likely (`R15-compliance.md`). We never build the link, so a breach leaks addresses that
were already public on chain. The cost is real and stated: no recovery if a key is lost, no notification
channel except the operator's own declared `contactChannel`, plus a team that is a set of addresses rather
than an organisation.

**17. `live` listings are probed every 5 minutes against a 15 minute freshness window.** Rejected: 10
minutes, which halves the probe cost. Also rejected: event-driven probing, which the registry cannot support
because it has no liveness field and an off-chain document can change with no on-chain event at all. Why: at
5 minutes one pass plus two failures reaches the freshness edge, so the window can never be crossed
silently, while the per-host budget still supports 600 live listings on one host. At 10 minutes a single
missed probe puts a row inside the window with no second chance.

## Open questions

1. **Whether any third-party operator claims a listing during judging.** If none does, every shelf row is
   first-party, labelled and `origin: house`, which is a weaker position than a mixed marketplace but an
   honest one. Nothing in the design depends on it and no number would be overstated, but the coverage story
   changes and the report page has to say so.
2. **Whether the BNB Passport leg of E3 ever returns true.** Unverified in `R10-bab-attestation.md`: every
   address probed returns `[]`, the mint host `passport.bnbattest.io` has no DNS record and the mapping from
   the six provider strings to BAS schema UIDs is inferred. It ships wired and honest. What would settle it is
   one address that holds a passport attestation.
3. **Whether `setAgentWallet` lands inside its 300 second window in practice.** Nobody on BSC has done it: all
   600 sampled agents still have `getAgentWallet == ownerOf`. At 0.45 second blocks the window is roughly 660
   blocks, which should be ample, but the signature has to come from the new wallet rather than the owner and
   the flow is unexercised. What would settle it is one landed transaction hash on a first-party agent.
4. **Whether the 5 minute live cadence holds across the whole live set.** The per-host budget supports 600
   live listings on one host inside the freshness window, which is comfortable at the scale this launches at
   and unknown at any larger one. What would settle it is a live set big enough to measure.
5. **Whether a Case C domain claimant can be contested by the on-chain owner.** A listing carries a
   `contactChannel` for whoever claimed it, but the registry carries no contact field for the owner, so we
   have no channel to an owner who objects to somebody else listing their agent. The
   resolution rule in section 11.4 is a chain read rather than a negotiation and it is stated but untested.
6. **Whether 8004scan's `verify-endpoint` queue actually runs during judging.** The lever needs no auth and is
   capped at once per hour per agent, but its BSC indexer reported `status: down` with a 32 hour stale
   checkpoint on 2026-09-05, so a queued verification may never be processed. Nothing depends on it. It is
   corroboration only.
7. **Whether the OFAC SDN CSV download is reliable enough to gate a payment on.** It answered 200 with
   5,672,451 bytes and no key on 2026-09-05 and `R15-compliance.md` could not quote a granting clause because
   the endpoints publish no terms. The 24 hour cache with a refuse-on-stale rule is the mitigation. A mirror
   under our own control would settle it and would also need its own licence position.
8. **Whether Binance Web3 Wallet connects on the first attempt.** Its injection path and connector package are
   unverified. It is treated as a plain EIP-1193 provider until a real connection is observed.
9. **The time of day the build closes on 2026-09-09.** Verified on 2026-09-06 as 12:00 UTC from the
   registration form. This document's ship line assumes a 00:00 UTC freeze, which now carries twelve hours of margin.
10. **Whether one address holding 99.0% of ERC-8183 jobs is one operator or a platform router.** Unverified in
    `R16-reuse.md` and it matters here because the 25% per-payer cap in section 10.2 treats a router's clients
    as one payer. If it is a router, the cap under-counts a legitimate provider. What would settle it is
    reading that address's code and its client set.
11. **Whether the G8 slice of the float is authorised before the close.** G8 settles a real payment, so
    `live` depends on 2 `$U` a human has to release, which `15-SYSTEM.md` carries as its own open question
    over the whole float. Until then every listing stops at `linted` with `blocked: unfunded` on its row.
    An operator funding their own proving payment is the workaround and it needs a stablecoin most operators
    do not hold.
