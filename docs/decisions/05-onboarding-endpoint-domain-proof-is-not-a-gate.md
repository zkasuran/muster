# Decision: the ERC-8004 endpoint-domain proof is a badge, not a go-live gate

Recorded by `05-ONBOARDING.md` decision 4. This reverses the prior pass in this lane, so the reasoning
is written out.

## The decision

A resolving `/.well-known/agent-registration.json` is a badge on a listing plus the only accepted
non-owner claim proof. It is not a hard gate on going live.

## The alternative rejected

Keep it as a hard gate, which is what the earlier pass in this lane had, on the strength of a real
rejection where a missing well-known file failed a live marketplace's x402 validation.

## Why

RFC 8615 makes the gate structurally unpassable for any multi-tenant platform, because a nested path is
not a well-known URI. Keeping it would have excluded 51 platform-hosted agents plus 217 more on a single
host in a sample of 600. That argument is verified and it stands on its own.

The often-quoted five passing agents is a different thing: it is the sponsor index's endpoint-verified
flag over the 303,461 rows it holds, with three of the five under one owner address and whether that
count is real or an artifact of its own checker is **unverified**. The decision does not rest on it.

Keeping the proof as a badge preserves what it is actually good for. It is real evidence when it
resolves, it is the one way a claimant who is not the on-chain owner can prove control, then it costs an
operator who can pass it nothing to display.

## What it binds

`05-ONBOARDING.md`'s go-live gates plus its claim cases, `03-TAXONOMY.md`'s badge rendering,
`04-AGENT-PROTOCOL.md`'s rejection of a new well-known path of ours for the same RFC reason.

## What would make us revisit it

A registered well-known URI that platform-hosted agents can satisfy or the population shifting to
single-tenant hosts where the proof is passable. Neither is likely inside this programme.
