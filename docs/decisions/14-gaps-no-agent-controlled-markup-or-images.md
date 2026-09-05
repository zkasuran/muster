# Decision: agent-supplied content renders as text nodes only and no agent-controlled image ever loads

Recorded by `14-GAPS.md` section 2.5, with `15-SYSTEM.md` section 7.5 wiring the screen plus
`04-AGENT-PROTOCOL.md` asserting it in the conformance suite.

## The decision

Everything an operator or an agent supplied passes one deterministic screen that no later code path can
waive, then renders as text nodes. No markdown. No agent-controlled image anywhere. No language model
anywhere in the render path.

## The alternative rejected

Render markdown for a nicer listing page. Proxy avatars through our own signed image proxy. Use a model to
summarise search results or narrate a comparison.

## Why

GitHub disabled image rendering in Copilot Chat entirely **despite already running an HMAC-signed image
proxy**, because the proxy did not close the class. A prettier listing page is not worth an exfiltration
channel in front of a judge.

A model in the render path is the same problem with a larger surface. The whole prompt-injection defence is
that there is no model to inject, which is also why the category confidence is a published ladder rather
than a model score.

The screen is deterministic plus unwaivable for a reason that has bitten this ecosystem: agent output is
untrusted input that arrives at request time, so a check that can be skipped by a code path is a check that
will be.

## What it binds

`14-GAPS.md`'s injection defence, `03-TAXONOMY.md`'s rendering rules, `05-ONBOARDING.md`'s image floors plus
its injection scan at review, `13-PARTNERS.md`'s refusal to put a language model in front of a buyer,
`15-SYSTEM.md`'s sanitize boundary.

## What would make us revisit it

Nothing on the images. Markdown could only return through a renderer with a proven allowlist and the
measured precedent says even a signed proxy is not enough, so the bar is high on purpose.
