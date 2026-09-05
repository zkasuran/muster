# Decision: evidence attaches to an agent revision keyed on content hashes, never to a bare id

Recorded by `14-GAPS.md` section 6.1, with `05-ONBOARDING.md` owning the drift probe.

## The decision

A probe result, a conformance verdict plus a settled job attach to a revision identified by content hashes
(`tokenUriHash` plus the card hash), not to the `agentId` alone. A change in either hash opens a new
revision and the record earned by the old one stays with the old one.

## The alternative rejected

Keep one running count per `agentId`, which is what an id-keyed index naturally does. Also rejected: trust
the `version` field the agent declares.

## Why

`setAgentURI`, `setMetadata` plus `setAgentWallet` are owner-callable at any time, so a count against a bare
id can be inherited by a service that was rewritten after the count was earned. That is the mechanism a
seller would use to launder a record: pass the bar, then swap the endpoint.

A declared version cannot carry the weight either. One live card declares an A2A release that has never
existed, so the field is an assertion rather than a fact. A hash is a fact.

The same hash does double duty. It drives the duplicate cluster id plus the content-addressed blob store, so
revision tracking costs no extra field.

## What it binds

`04-AGENT-PROTOCOL.md`'s pinned `cardHash`, `05-ONBOARDING.md`'s drift probe plus its fix-on-the-same-id
rule, `06-QUALITY.md` where drift on the host keeps the record while drift on the contract or the price
resets it, `14-GAPS.md`'s versioning section, `15-SYSTEM.md`'s blob store plus its change detection.

## What would make us revisit it

Nothing. A registry that made its metadata immutable would make revisions trivial rather than unnecessary.
