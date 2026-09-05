# Decision: every gap area carries one of four verdicts and Refused is a first-class outcome

Recorded by `14-GAPS.md` sections 1 and its decisions table.

## The decision

Thirty-five areas, each labelled Ships, Ships thin, Next or **Refused**, with the minimum version written
out plus the document that owns any part of it. Refused means the thing is not coming, stated as a
decision rather than as a backlog item.

## The alternative rejected

A backlog with priorities, which is what a roadmap does.

## Why

A backlog implies everything arrives eventually. Three of these areas are not arriving: an SLA with
uptime credits, an insurance product plus any growth incentive. Filing them as low-priority would be a
promise we know we will not keep and a reader who checks back in a month would be right to call it a
miss.

Naming the minimum version per area is the other half. It converts a vague "we handle security" into a
list a reviewer can test and it is what lets the register double as the completeness argument: 35 areas
where each one says what shipped, what is thin plus what is refused.

The four labels also make the honesty check mechanical. A status can move down without a product change
and moving up requires the build, which is the same rule the disclosure table runs on.

## What it binds

`14-GAPS.md`'s whole register, `10-DOCS-AND-POLICY.md`'s real-against-staged table which uses the same
posture, `15-SYSTEM.md`'s cut list which is where a Ships-thin row goes if a day is lost.

## What would make us revisit it

An area moving between labels, which is the register working. A Refused row would need a structural change
to move, which for the three above means a licensed entity or a billing relationship that does not exist.
