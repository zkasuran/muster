# Decision: the agent card is a plain HTTPS document declared in `services[]`, pinned by hash

Recorded by `04-AGENT-PROTOCOL.md` decisions 1, 2 and 3.

## The decision

The card a listing publishes is an ordinary HTTPS document named in the registration's `services[]`
array. Muster pins `cardHash` at review and re-checks it on every drift probe. One
`canonicalJson` function produces the card hash, the request hash plus the receipt hash.

## The alternative rejected

A new well-known path of ours, `/.well-known/muster.json`. Also rejected: requiring A2A v0.3.0's JCS
plus JWS signature block on the card. Also rejected: a per-purpose hash rule, one per artifact.

## Why

RFC 8615 says a new well-known URI must be registered and that nested paths are not well-known at
all. That is not theoretical here: one BSC platform serves
`/aip/erc8004:<slug>/.well-known/agent-card.json`, which 404s at both the nested path and the origin
root. An unregistered fourth path would inherit that problem then add a squatting risk on somebody
else's origin.

Nobody on BSC signs a card, so requiring a signature would gate the whole conformance suite on key
management we cannot support in four days. A keccak over the canonical bytes gives the same tamper
detection and it reuses the canonicalisation the ERC-8183 quote path already needs.

One canonicalisation for three hashes is the cheaper correctness argument. Both the BNB Chain SDK plus
the Altana SDK ship the same `canonicalJson` for their negotiation hash and both warn that
`JSON.stringify` breaks cross-implementation verification on any non-ASCII character. Sharing one
function means the three hashes cannot drift apart.

## What it binds

`04-AGENT-PROTOCOL.md`'s card, manifest plus receipt sections, `05-ONBOARDING.md`'s drift probe which
compares the pinned hash, `06-QUALITY.md` where drift on the contract or the price resets the record,
`08-MONEY.md`'s quote hash, `14-GAPS.md`'s agent revisions keyed on content hashes.

## What would make us revisit it

A registered well-known URI for agent cards, which would make the fourth path legitimate. Cards being
signed in practice on BSC, which would make a signature a cheap upgrade rather than a gate. Both are
additive: the hash still works.
