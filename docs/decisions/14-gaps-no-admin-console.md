# Decision: there is no admin web console. Admin actions are CLI verbs with a mandatory reason

Recorded by `14-GAPS.md` section 6.3, with `15-SYSTEM.md` owning the process the verbs run in.

## The decision

Five admin verbs (approve, suspend, delist, restore, constant change), each in the CLI, each taking a
mandatory reason plus a published policy code, each writing a statement of reasons. The ledger is the audit
log. No protected admin route exists in the web application.

## The alternative rejected

A protected admin route in the web app, which is faster to use plus available from a phone.

## Why

It would add the only authenticated session in a product whose security story is that there are no
accounts. One admin session means a login, a session store, a password or key recovery path plus a new class
of compromise that reaches the write side.

The cost is that an action needs the operator at a terminal, which is why the published response targets are
set where they are rather than promising minutes.

The mandatory reason is the other half. An action with no recorded reason is indistinguishable from a
mistake later and every automatic restriction already writes its reasons, so a human action writing less
than a machine action would be backwards.

## What it binds

`14-GAPS.md`'s admin tooling, `05-ONBOARDING.md`'s state transitions, `06-QUALITY.md`'s human-only
delisting, `09-DISPUTES.md`'s runbook, `15-SYSTEM.md`'s `cli` process which holds no key.

## What would make us revisit it

An operated product with more than one operator, which would need real access control rather than a shell.
That is a phase this entry does not reach.
