# Decision: a BAB token is a tier, never a gate

Recorded by `05-ONBOARDING.md` decisions 1 and 2, with `12-BINANCE.md` decision 4 reading the same
numbers from the Binance side.

## The decision

BABT is one signal behind the `E3 Attested` rung, never a requirement to list. E3 is an **OR** across
BABT, Galxe Passport plus the BNB Passport reader. One bit is read at request time, nothing is stored
and the token metadata is never fetched.

## The alternative rejected

Require a BABT to list, which is the obvious reading of a human-verification requirement on a BNB
Chain product. Also rejected inside E3: BABT alone, because it is the BNB-native credential. Also
rejected: caching a `verified` flag per operator plus keeping the metadata id for cross-wallet dedupe.

## Why

Measured on the 585 distinct owners behind a 600-agent sample: **6 hold a BABT, 1.0 percent** and 576
hold no attestation of any kind. A BABT gate leaves roughly nine listable agents, scores zero on Agent
Diversity then cannot fill four mandated shelves. The OR across all three reaches nine owners, which is
E3's own ceiling rather than a gate's.

BABT also needs a Binance account, which is unavailable in several jurisdictions. Galxe Passport needs
a Sumsub pass plus no exchange at all. The BNB Passport SDK documents six providers. An OR costs one
extra slot in an `aggregate3`.

Storing the bit is wrong for a different reason. In the fifteen hours between two reads, 18 BABTs were
minted while the live count rose by 14, so four were revoked or burned. The issuer can revoke without
the holder. 11.58 percent of all BABTs ever minted are revoked or burned, so a persisted badge is a
claim that decays silently and the metadata id is precisely the identifier Binance breaks on purpose
by 404ing a revoked token.

## What it binds

`05-ONBOARDING.md`'s evidence ladder, `06-QUALITY.md` where a buyer attestation is a weight rather than
a gate, `12-BINANCE.md` section 3, `15-SYSTEM.md` which caches an attestation read for 60 seconds in
memory and never persists it.

## What would make us revisit it

BABT coverage among agent owners rising far enough that a gate would not empty the shelves, which is
not a four-day change. A programme rule requiring human verification to list would be answered with the
OR plus its coverage numbers rather than with a single-credential gate.
