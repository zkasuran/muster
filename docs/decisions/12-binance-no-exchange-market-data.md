# Decision: no exchange market data in the published product

Recorded by `12-BINANCE.md` decisions 7 and 8.

## The decision

No exchange klines, no exchange spot prices in anything we publish. Any window longer than a pool oracle
serves comes from our own sampled series with a block number on every point. A venue's own REST aggregate is
used only where the venue publishes the field plus the capture ships with its fetch timestamp.

## The alternative rejected

Klines for the grid window plus spot for a USD denominator, which is the cheapest build and the one most
entries will ship. Also rejected: a swap venue's explorer REST as the window source.

## Why

No redisplay clause could be quoted. The docs repository carries no licence, the production terms file is a
pointer, then the terms page returns a status with no body. Under our own rule a third-party input needs a
granting sentence we can quote, so absence of terms is not permission. Their own disclaimer also says the
data should not be relied upon for trading decisions, which is an awkward citation for a product that helps
somebody choose an agent.

For a health factor the protocol's oracle is the only correct price anyway, licence aside, because that is
the price the protocol liquidates against.

The explorer REST alternative swaps one unquotable grant for another then adds a measured defect: its 24
hour APR field reproduced 0.68 times low with no findable cause.

## What it binds

`11-bnb-stack-venus-oracle-is-the-usd-mark.md`, `06-QUALITY.md`'s per-category metrics plus their windows,
`03-TAXONOMY.md`'s currency rendering, `08-MONEY.md`'s export with empty USD columns,
`10-DOCS-AND-POLICY.md`'s input table, `13-PARTNERS.md` where the ticker is a labelled cross-check only.

## What would make us revisit it

A quotable redisplay grant. Then the ticker becomes a published cross-check rather than a private one and
the sampled series stops being the only source for a long window.
