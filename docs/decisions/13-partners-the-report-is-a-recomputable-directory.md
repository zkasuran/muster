# Decision: the report ships as a recomputable directory, not a PDF

Recorded by `13-PARTNERS.md` decisions table plus section 2.8.

## The decision

The Agent Advantage Report is a directory in the public repository with `/report` as its page. It carries
`recompute.mjs`, the stored call set, the ground truth per task plus one hash per file. The same content is
reachable as a public URL inside the submission and as a file in the repo, because where the report is
filed is **unverified**.

## The alternative rejected

A PDF attached to the submission, which is what most entries will send.

## Why

Their specification says the report ships "with the actual outputs attached" and a PDF cannot be re-run. A
directory lets a judge check a number rather than read a claim about it: pin the block, run the script,
diff the value.

The stored call set matters as much as the script. One input in the rebalancing task is a rolling venue
aggregate rather than a chain read, so that capture ships with its fetch timestamp and the recompute reads
the capture instead of re-fetching. Naming which input is reproduced from our stored bytes rather than from
chain is the difference between reproducible plus almost reproducible.

Filing it twice costs nothing and covers the gap: no channel is named on either page, so a URL plus a file
means either reading works.

## What it binds

`13-PARTNERS.md`'s report, `10-DOCS-AND-POLICY.md`'s licence split (the report is entry material, the kit
around it is not), `15-SYSTEM.md`'s anonymous URL check which has to include every path the report cites,
`00-PROGRAM.md`'s eligibility gate for the partner track.

## What would make us revisit it

The programme naming a filing channel or a format. A required PDF would be produced from the directory
rather than instead of it.
