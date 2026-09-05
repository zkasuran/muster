# Decision: four numbers are re-read the day the submission goes out, never quoted bare

Recorded by `01-GROUND-TRUTH.md`, final section.

## The decision

Four facts in the evidence base move on their own. Each is cited with its block height plus its
timestamp wherever it appears, never bare and the whole set is re-read on submit day. Three more are
re-checked rather than re-read, because they are somebody else's decision to change.

Re-read: the agent count (one `eth_getStorageAt` on the `_lastId` slot), the feedback graph (a
`getClients` sweep, about 4 minutes), the ERC-8183 job plus settlement totals (the job indexer, about
456 seconds), then 8004scan's own freshness plus status.

Re-check: the implementation address behind each of the three registry proxies, the implementation
behind each of the three EIP-3009 tokens, then the whitelisted ERC-8183 policy on each chain.

## The alternative rejected

Freeze the measured numbers at the date of the research pass and cite them as of that date, which is
cheaper and reads as rigorous.

## Why

The registry grows about 2,110 agents a day, so a frozen count is wrong by roughly 8,000 by the close
and the submission would understate the population it claims to cover. The other three move at their
own pace: the job counter is bursty and the feedback graph was flat on the day it was measured. Each
re-read is one command and minutes of wall clock.

The re-check set is different in kind. Both registries and all three settlement tokens are proxies with
live admins, so an upgrade can change what a slot means or what a token accepts. Each has already moved
once in this ecosystem inside a fortnight. A number that is only stale is embarrassing. A rail whose
implementation changed under us is a broken hire.

## What it binds

`15-SYSTEM.md`'s pre-submit gate runs the re-read. `03-TAXONOMY.md`'s freshness triple is how the
numbers are rendered. Every document that quotes a population figure inherits the block plus timestamp
requirement.

## What would make us revisit it

A figure joining the set (any new number that moves on its own) or one leaving it once a source stops
changing. The `unverified` label on who can upgrade the proxies is what keeps the re-check in place, so
proving the upgrade authority is fixed would retire that half.
