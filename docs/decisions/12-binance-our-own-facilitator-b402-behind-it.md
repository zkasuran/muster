# Decision: our own facilitator settles every demonstrated hire, with B402 behind the same interface

Recorded by `12-BINANCE.md` decisions 1, 2 and 3.

## The decision

Every hire we demonstrate settles through our own facilitator on mainnet. B402 is a second implementation
behind the same interface, so a credential grant is a config flip. Both B402 applications are filed on the
first build day, with the deploy host's egress address as the IP. When B402 does answer, `/settle` is
polled, the outcome is keyed on whether `transaction` is empty and our own idempotency runs on
`(nonce, network, payer)`.

## The alternative rejected

Build the hire path directly on B402, which is the obvious choice for a BNB Chain hackathon. Also rejected:
skipping the applications because they cannot land before the close. Also rejected: treating the first
`success: false` as terminal, which Binance's own payment-status page endorses by calling it a final state.

## Why

Both environments' authenticated base URLs read "Please contact us for access". Onboarding is a separate
manual application per environment with an IP allowlist plus no published review turnaround. Four days out
that is a dependency on somebody else's inbox, so it cannot carry the demonstration.

Filing anyway costs one form fill. Judging runs to 2026-09-23, so a grant inside that window is a flip and
credentials are also the only route to a listing on their discovery index.

The settle-polling rule comes from a contradiction inside their own documentation: the newer settle page
says a revert plus a pending confirmation are indistinguishable on V2, that only an empty `transaction` is
terminal, then that reconciliation runs about 30 minutes. Treating the first failure as final would book
paid work as failed. The poll carries a 35 minute ceiling plus a named terminal state per branch, because a
poll with no ceiling is not a decision.

## What it binds

`08-MONEY.md`'s facilitator interface, `12-BINANCE.md`'s integration surface,
`11-BNB-STACK.md` which keeps every demonstrated hire on mainnet, `13-PARTNERS.md` where selling over B402
is a config flip rather than a claim, `15-SYSTEM.md`'s facilitator process.

## What would make us revisit it

Credentials arriving. That is the flip the interface was built for and it changes nothing structural.
