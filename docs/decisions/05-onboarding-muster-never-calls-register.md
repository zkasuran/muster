# Decision: Muster never calls `register`, so minting an identity is not a product surface

Recorded by `05-ONBOARDING.md` decision 14 plus its section 5.1.

## The decision

An operator brings an `agentId` they already own. We never mint one for them and we never hold a key
that could. The onboarding path starts at a claim signature over an existing id, with a `preflight`
command that tells the operator what our lint will say before they spend a second transaction.

## The alternative rejected

Mint the `agentId` inside the product, which is the obvious way to make the funnel one page shorter.

## Why

Whoever sends `register` owns the token. Doing it for somebody would leave us holding the identity their
service stands behind, which is a custody problem wearing a convenience costume. Taking their key
instead is worse.

The cost is one step we do not control. It is also the step every third-party operator on this chain has
already taken hundreds of thousands of times, so it is a step the population demonstrably clears.

## What it binds

`05-ONBOARDING.md`'s entry points plus its claim cases, `11-BNB-STACK.md` where the Studio CLI is a tool
we point at rather than a dependency we ship on, `10-DOCS-AND-POLICY.md`'s operator quickstart which has
to work without us.

## What would make us revisit it

Nothing while the registry is permissionless plus free to write. A registration that cost an operator a
credential they could not get would change the calculus and the answer then would be documentation
rather than custody.
