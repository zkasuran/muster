# Decision: the USD mark is Venus's on-chain oracle, not an exchange feed

Recorded by `11-BNB-STACK.md` section 2.7 plus its decisions table, with `12-BINANCE.md` decision 7
refusing the exchange feed on licence grounds.

## The decision

Wherever a dollar figure is shown it comes from the Venus ResilientOracle, read at a pinned block. An
exchange ticker is kept as a labelled cross-check only. `getPrice(WBNB)` is not counted as a second
opinion, so the dollar column rests on two sources rather than three.

## The alternative rejected

Binance Oracle's feed registry as the on-chain mark. Also rejected: the Binance spot ticker as the primary
source. Also rejected: treating the Venus oracle's own WBNB read as an independent second source.

## Why

The Venus oracle is verified through its vBNB market, covers 55 BSC assets, costs nothing, needs no grant
plus reproduces at a pinned block forever. It cross-checked to within 0.1 percent of the keyless exchange
spot ticker on the day it was read. Binance Oracle's address plus read signature are **unverified**, so it
cannot be the mark.

For a health factor the protocol's own oracle is the only correct price regardless of licence, because that
is the price the protocol liquidates against.

The exchange ticker is refused as a primary source for a licence reason rather than a technical one: no
redisplay clause could be quoted, the docs repository carries no licence and the terms page returns a body
we could not read.

Counting `getPrice(WBNB)` twice would be a false independence claim: it is the same token config,
byte-identical at a pinned block.

## What it binds

`03-TAXONOMY.md`'s price rendering, `06-QUALITY.md`'s per-category metrics, `08-MONEY.md`'s export which
prints token units with the USD columns empty where no mark applies, `13-PARTNERS.md`'s report conversion
at the pinned block, `10-DOCS-AND-POLICY.md`'s third-party input table.

## What would make us revisit it

A quotable redisplay grant for exchange market data, which would make the ticker publishable as a second
source. A verified address plus signature for Binance Oracle, which would make it a candidate mark.
