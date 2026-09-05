# Decision: opBNB is not used at all and the non-use is proved rather than asserted

Recorded by `11-BNB-STACK.md` section 4.

## The decision

Nothing runs on chain 204. Not settlement, not the audit stream, not a metering feed. The reason is
published with the reads behind it.

## The alternative rejected

Host settlement, the audit stream or a metering feed on opBNB, which is the obvious way for a BNB Chain
entry to show breadth plus cheaper gas.

## Why

Read on 2026-09-05: codesize is **zero** at all six contracts the hire path needs, at all three settlement
tokens plus at the Altana Keystore. Chain 204 is not on the canonical ERC-8004 roster either. There is
nothing on 204 to read, which is the whole reason.

The saving for moving anyway is $0.0039 per settlement, which does not buy a second chain's worth of
failure modes. What a BSC-to-opBNB bridge would cost is **unmeasured**, so no bridge arithmetic is claimed
in either direction.

Publishing the non-use with its reads is the point. A deliberate absence with evidence reads as coverage of
the stack. A silent absence reads as something nobody looked at.

## What it binds

`11-BNB-STACK.md`'s surface map plus its deliberate non-uses, `12-BINANCE.md` which makes the same kind of
call on Binance surfaces, `10-DOCS-AND-POLICY.md`'s real-against-staged table where a non-use is a status
rather than a gap.

## What would make us revisit it

The registries, a settlement token plus the escrow kernel being deployed on 204, which is somebody else's
decision. The measured saving is small enough that deployment alone would not be sufficient, only
necessary.
