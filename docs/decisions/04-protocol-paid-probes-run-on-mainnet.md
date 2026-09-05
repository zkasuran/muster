# Decision: conformance probes pay real money on mainnet and a skipped probe is neither a pass nor a fail

Recorded by `04-AGENT-PROTOCOL.md` decisions 11 and 12, with section 10 owning the suite.

## The decision

The payment assertions in the conformance suite settle real payments on BSC mainnet at the listing's own
price, tagged `origin: house`, excluded from every revenue plus volume figure by the ledger's
append-time invariant. A full run settles nine payments. The ceiling is twelve a day per listing. A
probe that could not run records `skip`, which is neither a pass nor a fail and never counts toward a
tier.

## The alternative rejected

A sandbox or a testnet-only conformance path, which costs nothing. On the verdict: fold `skip` into
`pass`, which is what the index we cross-check does when it reports `health_score: 100.0` over eleven
skipped services.

## Why

The claim being tested is that a stranger can pay this agent on mainnet. A testnet pass does not test
it and the eligibility rule says agents surfaced must be live on BSC. Paying is the only way to learn
that a challenge decodes, that the amount plus decimals agree, that the facilitator settles then that
work comes back.

A tier that can be reached by declaring less is not a tier. Counting a skip as a pass is how an index
ends up scoring a broken host full marks, which is the specific failure this product is built to
correct.

The cost is bounded rather than open ended: nine settlements per full run at the listing's own price,
twelve a day per listing, with the spend visible as house origin on the same public pages.

## What it binds

`02-THESIS.md` H4, `05-ONBOARDING.md`'s go-live gate G8 which settles a real payment, `06-QUALITY.md`
where a house job qualifies a row without counting as revenue, `08-MONEY.md`'s ledger invariant plus its
float, `15-SYSTEM.md` where the paid probes are funded in USD1 while the escrow leg is funded in `$U`.

## What would make us revisit it

The cadence, once shelves are full. Fifty listings running a full paid suite daily at a 0.05 unit price
is 22.5 units a day, which is the open question the document leaves to the money owner. The mainnet
requirement does not move.
