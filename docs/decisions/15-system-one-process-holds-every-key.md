# Decision: one process holds every key, behind a unix socket with no TCP port

Recorded by `15-SYSTEM.md` sections 1.1 and 7.2.

## The decision

Three keys exist: the relayer key, the ledger signing key plus the house probe key. All three load in one
process, `facilitator`, which listens on a unix socket rather than a port. The ledger append runs inside that
same process. `web` and `worker` hold no signing key. `cli` holds none either and `walk()` verifies the
ledger with the public key.

## The alternative rejected

The literal reading of an in-process facilitator, with the relayer key inside the web server. Also rejected:
appending to the ledger from `web` or `worker`, with the signing key in their environment.

## Why

Ours rather than hosted is what "in process" was protecting and a unix socket preserves that exactly while
a compromise of the render path reaches no key. The render path is the surface that touches
agent-supplied bytes, so it is the last place a key belongs.

Putting the append behind the same boundary means no other process can produce a signed entry at all, then
the seven append invariants sit on the same side of the boundary as the key that signs them. An invariant
enforced in two processes is an invariant with two chances to be wrong.

The relayer key holds BNB for gas plus nothing else and the only thing it can do with an authorisation is
submit the one a buyer already signed for a fixed payee plus a fixed amount.

## What it binds

`08-MONEY.md`'s facilitator plus its ledger, `15-SYSTEM.md`'s custody boundary plus its signed boundary,
`14-GAPS.md`'s key management row, `05-ONBOARDING.md`'s probe budget which spends the house probe key.

## What would make us revisit it

A hosted facilitator taking over submission, which would remove the relayer key rather than move it. The
ledger key stays where it is either way.
