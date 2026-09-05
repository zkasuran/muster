# Decision: the fourteen unattended judging days are covered by artifacts, not by alerting

Recorded by `15-SYSTEM.md` sections 6.5 and 8.3.

## The decision

Four things carry the judging window: a static fallback whose status blocks read `unknown` rather than the
last green, a nightly signed dump with one timed restore rehearsal before submit, an availability canary
running on infrastructure that is not ours, plus implementation drift that degrades the hire path and clears
itself when the fingerprint matches again. One named routine: read `/status` once a day.

## The alternative rejected

Serve the last known-good page during an outage. Trust one always-on process plus one SQLite file for
fourteen days. Run the canary on our own machine. Close the hire path on drift until a human clears it.

## Why

Eligibility requires the submission functional plus publicly accessible for the whole window and there is
no alerting, which is stated rather than glossed. So the cover has to be artifacts a judge sees rather than a
promise about response times.

A cached green during an outage is exactly the thing the status component may not do and a cached page
inherits that rule, so the fallback says `unknown` plus keeps every number's original freshness stamp. It
exports from the same command as the pre-submit gate, so it cannot drift from what was submitted.

A check from inside our own network proves nothing about what a judge sees, which is the same reason our own
authenticated calls do not prove a repository is public.

Drift that only a human can clear reads as a dead marketplace on day nine. Reads stay up, the hire button
states its reason, then an upgrade that changes no selector, no domain separator plus no version clears with
nobody woken.

A backup nobody restored is a belief, which is why the rehearsal restores into an empty database, walks the
ledger then recomputes a receipt from its own published command.

## What it binds

`14-GAPS.md`'s backup, status plus incident rows, `15-SYSTEM.md`'s deployment plus its cut line where the
fallback sits above it, `11-BNB-STACK.md`'s upgrade watch which feeds the drift check,
`10-DOCS-AND-POLICY.md`'s freshness contract.

## What would make us revisit it

Real alerting, which would be a post-adoption addition. It would not replace the fallback, because the
fallback is what answers a URL when the process is gone.
