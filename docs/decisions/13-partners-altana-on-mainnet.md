# Decision: Altana runs on mainnet and no buyer ever needs an Altana wallet to hire

Recorded by `13-PARTNERS.md` section 4, with `08-MONEY.md` section 6 owning the buyer side.

## The decision

Four agent wallets on Altana, one session each, on **mainnet**, registered in Keystore with a call
allowlist, a spend cap plus an expiry past judging. Testnet is used only for the labelled settlement loop.
The session panel in the product shows what an agent may do plus revokes it. Hiring never requires the
buyer to hold an Altana wallet. Consent plus permission copy is generated from chain reads rather than from
their registry content.

## The alternative rejected

A testnet-only demonstration, which the track's own wording allows ("testnet counts, mainnet is stronger").
Also rejected: making the buyer-side Altana grant the hire path. Also rejected: rendering their skill
registry's own permission strings verbatim.

## Why

Mainnet is stronger by their own wording, four wallets with one session each costs under $5 and their
default signer supports no testnets at all. Mainnet's Keystore is nearly empty, so eight registrations are
visible rather than lost in traffic. The requirement is read on chain rather than from a pitch, which is the
point of the Keystore clause, so the cheaper path buys a weaker read.

The buyer side is a Functionality question. The criterion is a stranger getting through with minimal
friction and an Altana wallet costs setup, gas plus a new mental model. The panel still renders plus
revokes any session that exists, so the capability is demonstrated without being imposed.

The copy is generated because no licence, terms or grant for the skills registry content was found in any
pass. Absence of terms is not permission. Chain reads need none, then the skill is cited by id, version plus
its published hash.

## What it binds

`13-PARTNERS.md`'s Altana checklist plus its submission fields, `08-MONEY.md`'s agent wallets plus the ERC-1271
verify branch that lets a wallet with code pay, `03-TAXONOMY.md`'s session panel surface,
`04-AGENT-PROTOCOL.md`'s hard gate wherever a listing declares a write scope, `15-SYSTEM.md`'s above-the-cut
items.

## What would make us revisit it

Nothing on the mainnet placement. A licence for the registry content would let the copy be rendered
verbatim, which is a cosmetic upgrade rather than a design change.
