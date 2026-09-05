# Decision: a human approves every listing and the queue is published

Recorded by `05-ONBOARDING.md` decisions 6 and 5, with the states in its section 5.2.

## The decision

Passing all ten hard gates puts a listing in a review queue rather than on a shelf. A person reads it
before it goes live. The queue is public with its depth plus its median decision time. Separately,
`stale` is an automatic state rather than a suspension: a lapsed freshness window closes the hire path
immediately, costs the operator nothing, then clears itself on the next passing probe.

## The alternative rejected

Auto-approve any listing that passes the ten gates, which would remove the only non-instant step in the
funnel. On the freshness side: suspend a listing the moment its window lapses or keep rendering the
shelf row on a stale verdict.

## Why

The gates cannot judge whether the description matches what the agent actually does. They check
identity, reachability, shape, decimals plus a settled job. They cannot read a listing that promises
portfolio management then delivers a horoscope. Calling an automated pass a review would be a claim that
a human read something no human read, which is a line we do not cross for a shorter funnel.

The cost is a queue, so the queue is published rather than hidden. A judge can see how long approval
takes instead of taking our word for it.

Suspension for a lapsed probe would treat a thirty second outage as misconduct then burn the operator's
standing for it. Rendering the row anyway would break the freshness rule the whole product rests on.
`stale` is the state that does neither.

## What it binds

`05-ONBOARDING.md`'s lifecycle plus its appeal path, `03-TAXONOMY.md`'s four visibility states,
`06-QUALITY.md` where delisting is human-only for the same reason, `09-DISPUTES.md` where a machine may
suspend while only a human confirms a delisting, `14-GAPS.md`'s admin CLI which is where the verb lives.

## What would make us revisit it

Volume. A queue that a person cannot clear inside its published target is a reason to narrow what review
covers, not a reason to call an automated pass a review.
