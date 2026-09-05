# Decision: the hireable bar includes a settled job and everything that fails it stays indexed

Recorded by `02-THESIS.md` sections 5 and 6. Two halves of one rule, so they are recorded together.

## The decision

Six machine-checked assertions gate a shelf row, all six or no shelf: H1 identity resolves, H2 the
category fit is declared or evidenced, H3 a machine surface with a passing probe **no older than 15
minutes at render time**, H4 the wire contract holds, H5 the money resolves (`decimals()` read from
the token plus a supported signature path), H6 one settled job in this category a stranger can verify.

Every listing that fails takes `visibility: indexed`. It stays in the index, stays searchable, keeps a
permanent anonymous-fetchable URL, renders which of H1 to H6 failed with the timestamp of the check,
counts in the candidate total for its category and never reaches the hire path, the compare view or a
ranked shelf position.

## The alternative rejected

Gate on conformance plus reachability, then let the market decide. On the display side: hide the
failures so the shelves look clean or mix them into the shelf.

## Why

Conformance proves an agent could be paid. H6 proves one was. The bar is not circular because 28,244
ERC-8183 jobs already reached `COMPLETED` on BSC, so a third-party agent can pass H6 on evidence that
predates us wherever the job attributes its work to an agent id. Where the attribution is missing the
row is `unattributable` rather than passed and the attribution needs both halves of the join: one
owner address holds listings in all four categories, so an owner-level join alone would let one
completed job pass H6 four times.

Hiding the failures voids the coverage claim over 334,935 agents. Mixing them makes a shelf position
mean nothing. The candidate list with a named failure per row is the honest form of both and it is
checkable: a judge can pick any row and test the verdict against the live endpoint.

The 15-minute window is fixed in the thesis and `05-ONBOARDING.md` may tighten it, never loosen it. A
cached verdict is the defect we criticise in the incumbent index, which scores agent id 1
`health_score: 100.0` while its certificate does not match its own hostname and its last check date
sat at 2026-05-20 through a verification that demonstrably ran. Tying the window to the probe interval
would let a slower schedule loosen the guarantee silently.

## What it binds

`03-TAXONOMY.md`'s render rules for an `indexed` row, `04-AGENT-PROTOCOL.md`'s conformance suite (H4),
`05-ONBOARDING.md`'s probe cadence of 5 minutes against this 15 minute window, `06-QUALITY.md`'s
countable jobs, `08-MONEY.md`'s rail check (H5), `15-SYSTEM.md`'s freshness boundary.

## What would make us revisit it

A shelf sitting empty at judging on H6 alone. The valve for that is already specified as a labelled
house job rather than a relaxed bar. A judging window longer than two weeks would argue for revisiting
15 minutes, downward.
