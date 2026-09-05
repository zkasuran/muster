# Decision: the Agent Advantage Report ships three paired tasks with two control arms each

Recorded by `13-PARTNERS.md` section 2.

## The decision

Three tasks, each an instance of a category contract that already exists, each pinned to a block so the
correct answer is fixed forever. Each task runs three arms: the agent hired through the marketplace, a
control doing the task without an agent (C1), then a second control that tries to find plus hire an agent
with no marketplace under a 30 minute cap (C2). The harness is built for five tasks with the cut order
published as T5 then T4. T1 is the trading task (grid), T2 is the high-stakes task (health factor), T3 is
rebalancing.

## The alternative rejected

Promise five pairs, since the harness supports them. Also rejected: the single control arm their
specification requires.

## Why

Their specification asks for three real tasks run both ways, so three is the floor plus the promise. The
day-2 block protects three. The pairs share one runner plus one scorer, so a fourth and fifth are cheap if
the time exists and nothing claims a pair that did not run.

The second control is the interesting one. C1 measures the agent. C2 measures the marketplace, which is
the programme's own gap statement about digging through threads plus repositories, tested rather than
quoted. The measured population makes it a result either way: 0 of 600 sampled agents are payable by a
stranger and the sponsor index lists five endpoint-verified agents on BSC.

Pinning each task to a block is what makes the whole report reproducible. Every input is a read at that
block, so a judge recomputes rather than trusting.

## What it binds

`13-PARTNERS.md`'s report sections plus its submission checklist, `03-TAXONOMY.md`'s contracts which define
each task, `06-QUALITY.md`'s category metrics which the scorer reuses, `15-SYSTEM.md`'s day-2 block plus its
cut list.

## What would make us revisit it

Time. A fourth or fifth pair lands if the schedule allows, in the published order. The three-task floor plus
the two-control shape do not move, because eligibility rests on the first and the argument rests on the
second.
