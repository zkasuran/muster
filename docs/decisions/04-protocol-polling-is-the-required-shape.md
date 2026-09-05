# Decision: polling is the required long-job shape. Webhooks and streams are declared options

Recorded by `04-AGENT-PROTOCOL.md` sections 4 and decision 4.

## The decision

Every listing implements polling with a job id. Webhook callbacks plus server-sent events are declared
per skill and supported where offered, never required. A paid job that needs input carries
`inputRequired` as a flag on `working` rather than as a state of its own, so it keeps ageing against
`maxDurationSeconds`.

## The alternative rejected

Make a webhook mandatory, which is what a dashboard-first design wants. Also rejected: an MCP-only
long-job story. Also rejected: A2A's separate `INPUT_REQUIRED` plus `AUTH_REQUIRED` states.

## Why

A webhook needs the receiver reachable, it inverts the trust direction, then it turns the subscription
endpoint into an SSRF sink we have to defend for every listing. Polling needs nothing of the buyer.

MCP as of 2026-07-28 has no task resource, no protocol session plus no resumable stream, so a dropped
connection loses the job. That is not a shape a paid job can rest on.

A paid job parked in its own state waiting for a human is how stalled money hides. As a flag on
`working` the clock keeps running and the job ages into `expired`, which is a state the ledger can
account for.

## What it binds

`04-AGENT-PROTOCOL.md`'s lifecycle, its status codes plus its conformance suite, `07-MATCHING.md`'s
failover clocks, `08-MONEY.md` where a long job rides an escrow window rather than a 300 second
authorisation, `14-GAPS.md` section 5.2 where the webhook contract is published while delivery is not
built, `15-SYSTEM.md`'s long-job poller.

## What would make us revisit it

MCP gaining a resumable task resource. Enough listings offering webhooks that the optional path carries
real traffic, which would make delivery worth building on our side too.
