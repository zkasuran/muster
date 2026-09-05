# Decision: a wallet signature is the whole account and the payout address is read from chain

Recorded by `05-ONBOARDING.md` decisions 16 and 9, plus its sections 2.3 and 2.4.

## The decision

No email, no password, no OAuth, no session store, no account recovery. An operator proves control of an
`agentId` with an off-chain signature that costs nothing. The payout address is read from
`getAgentWallet(agentId)` on chain and there is no payout field on any form.

## The alternative rejected

An account system, which every marketplace has. On the payout: an operator-supplied payout field, which
every other listing form in the world has.

## Why

The link between a wallet address and a person is what turns a pseudonymous address into personal data.
EDPB Guidelines 02/2025 make that explicit by naming a breach of our own database as the means that
makes the link reasonably likely. We never build the link, so a breach leaks addresses that were already
public on chain.

The payout field is the single field that turns a listing into a theft vector and the chain already
answers the question. A zero value there carries useful signal of its own, that the token was
transferred.

The costs are real and published rather than hidden: no recovery if a key is lost, no notification
channel except the operator's own declared contact channel, then a team that is a set of addresses
rather than an organisation.

## What it binds

`05-ONBOARDING.md`'s operator record plus the fields it forbids, `08-MONEY.md` where `to` in every
authorisation is the address read at quote time, `09-DISPUTES.md`'s retention schedule,
`10-DOCS-AND-POLICY.md`'s privacy notice, `14-GAPS.md`'s pull-based notifications plus its refusal of
third-party analytics, `15-SYSTEM.md` where the only authenticated surface is a signature.

## What would make us revisit it

Nothing at this scale. An operated product with support obligations would need a contact channel, which
is why the operator's own declared channel exists now: the shape is already there without us storing an
identity.
