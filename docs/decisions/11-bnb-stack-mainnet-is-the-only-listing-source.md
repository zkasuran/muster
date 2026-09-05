# Decision: BSC mainnet is the only source of listings. Testnet carries exactly one artifact

Recorded by `11-BNB-STACK.md` sections 2, 3 and its decisions table.

## The decision

Every listing on every shelf is an agent on BSC mainnet, chain 56. Chain 97 carries one artifact only, the
ERC-8183 settlement loop, labelled as testnet wherever it appears. Nothing else about the product runs on
97 and the Altana wallets plus sessions are on mainnet.

## The alternative rejected

Fill shelves from chain 97, where the registry is friendlier plus emptier. Also rejected: treating testnet
as a second environment where anything awkward can run, which an earlier draft did when it booked a B402
hire as a chain-97 ship.

## Why

2,165 agents exist on 97 against 336,088 on 56, read on 2026-09-05. The eligibility rule also says agents
surfaced must be live on BSC, so a testnet catalogue fails the rule then looks like a demo besides.

The awkward-work premise was retired by reading the primary pages: the B402 sandbox on 97 also reads
"Please contact us for access", with its own account, its own credentials plus its own unpublished base
URL. A credential-gated stretch presented as shipped is the worst of both, so every demonstrated hire runs
on our own facilitator on mainnet.

Testnet keeps one job because it is the one place a full escrow loop can complete inside the build window.
The mainnet dispute window is 604,800 seconds against 900 on testnet, a factor of 672, so a mainnet job
funded on 2026-09-08 settles mid-judging. The testnet loop shows the whole state machine now, labelled,
while the mainnet job shows as in flight with its auto-approval date.

## What it binds

`02-THESIS.md`'s supply sources, `11-BNB-STACK.md`'s surface map, `12-BINANCE.md`'s B402 posture,
`13-PARTNERS.md`'s Altana placement, `14-GAPS.md`'s dry run which replaces a testnet mirror,
`15-SYSTEM.md`'s cut item 8.

## What would make us revisit it

Nothing inside this programme. A testnet-only demonstration would be weaker even where a partner says
testnet counts, which is why Altana runs on mainnet too.
