# Decision: one egress client is the only way out, with the deny table written out ourselves

Recorded by `15-SYSTEM.md` section 7.3, with `14-GAPS.md` section 4.3 running it on every probe.

## The decision

Every outbound fetch goes through one client. It resolves the name, checks **every** resolved address
against a deny table we wrote, connects to the address it checked while preserving the hostname for `Host`
plus SNI, never follows a redirect, then caps the body. The deny table names multicast plus NAT64 explicitly.

## The alternative rejected

Use a language runtime's own `is_global` or `is_private` check. Resolve, validate, then hand the hostname to
the HTTP client. Follow redirects, which is the default everywhere.

## Why

Measured: Python 3.11.5 returns `is_global=True` for `224.0.0.1`, `239.255.255.250`, `ff02::1`, `ff00::1`
plus `64:ff9b::7f00:1`. Our runtime is not Python, which is exactly the reason not to inherit any runtime's
opinion about what is public.

Validating a name then connecting by name leaves a DNS-rebinding window between the two calls, so checking
every resolved address is necessary plus not sufficient. Pinning the connection to the address that passed
is what closes it.

Redirects defeat a pre-flight on their own: a public host that returns a 302 to a metadata address passes
every check we ran before the redirect existed.

The probe path is where this bites, because the URLs come from strangers and we fetch hundreds of thousands
of them.

## What it binds

`05-ONBOARDING.md`'s probes which run the guard every time rather than once at review,
`04-AGENT-PROTOCOL.md`'s webhook refusal which would otherwise create another egress sink,
`14-GAPS.md`'s SSRF row, `15-SYSTEM.md`'s outbound rate limits.

## What would make us revisit it

A new address class worth denying, which is a table edit. The three structural rules (check every address,
connect to the one you checked, no redirects) do not move.
