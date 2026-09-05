# Decision: Node 22, one SQLite file, one machine, server-rendered HTML tested without a browser

Recorded by `15-SYSTEM.md` sections 2.1, 5 and 10, with `03-TAXONOMY.md` owning the scripting-off contract.

## The decision

One SQLite file in WAL mode through the runtime's own driver. Node 22 everywhere. One always-on machine we
already operate. Pages are server-rendered plus work with scripting off and the tests assert over fetched
markup with the runtime's own test runner rather than through a browser.

## The alternative rejected

Postgres or Redis beside it or an external SQLite driver. Bun, which the carried spine is verified under.
Python, which an earlier lane's code is written in. A serverless host or a new paid host. A browser driver
for the surface tests. A single-page app with client-side data fetching.

## Why

The corpus is 335k rows plus 0.27 GB with one write path per table, so a second service is operational
surface with no gain: the queue is a table. WAL plus a busy timeout plus a bounded batch hold makes three
writers ordinary rather than a race. An external driver is a native build plus another licence row when the
runtime already ships one.

An unverified runtime under the render path is a risk with no upside, so the port to Node is one task with a
check. Python was rejected on measurement rather than taste: both traps we hit are Python-shaped, a
Cloudflare 403 on its default user agent plus its own `is_global` passing multicast and NAT64 addresses.

A 30.5 minute sweep cannot run in a function plus there is no persistent volume for the blob store, so
serverless is out. Spending money on a new host is an operator decision rather than a build decision.

Asserting over server-rendered HTML **is** the scripting-off contract, so the test doubles as the guarantee.
A driver is another dependency, another licence row plus half a day we do not have. The failing case for a
client-side app is a judge on a phone with a bad connection and rival deployments are already serving shells
plus `--` to a plain fetch.

## What it binds

`03-TAXONOMY.md`'s server-rendered pages, `15-SYSTEM.md`'s stack, data model plus test plan,
`14-GAPS.md`'s accessibility row, `10-DOCS-AND-POLICY.md`'s dependency licence table.

## What would make us revisit it

Traffic that outgrows one machine, which is a post-adoption problem. The JS path gets one recorded manual
pass now, so a driver would only be worth it once there is a second interactive surface.
