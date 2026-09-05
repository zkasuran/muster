# Decision: the Agent Studio CLI is a tool we point at, not a dependency we build on

Recorded by `11-BNB-STACK.md` section 6.1.

## The decision

We use the `bag` CLI where it helps an operator and the product does not sit on top of it or on the Studio
runtimes. Muster is the demand side. Registration is the operator's own step
(`05-onboarding-muster-never-calls-register.md`), documented against both the CLI plus the registry call
directly.

## The alternative rejected

Build Muster on `bag deploy` plus the Studio runtimes, which is the obvious way for an entry to show
alignment with the sponsor's own toolchain.

## Why

Studio ships a wallet, an LLM aggregator, identity registration, a task interface, a cloud runtime plus the
CLI. It ships no marketplace, no discovery page, no listing flow, no indexer plus no storefront spec, which
is the hole this track exists to fill. Studio's own Developer Dashboard is unshipped and occupies the
lifecycle surface, so building on that surface means colliding with the product we want to be adopted by.

Depending on it would also make our uptime depend on a runtime we do not operate, through a judging window
where nobody is watching.

Pointing at it costs nothing and helps the operator: a `preflight` command tells them what our lint will
say before they spend a second transaction, whichever route they registered through.

## What it binds

`05-ONBOARDING.md`'s entry points, `11-BNB-STACK.md`'s Studio section, `10-DOCS-AND-POLICY.md`'s operator
quickstart which has to work without us, `12-BINANCE.md` where the same reasoning keeps the connectivity
layer at arm's length.

## What would make us revisit it

Adoption. A marketplace adopted as Studio's own would negotiate where the seam sits, which is what
`ADOPTION.md` exists to name.
