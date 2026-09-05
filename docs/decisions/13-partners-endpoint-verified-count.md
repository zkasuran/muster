# 13-PARTNERS: the endpoint-verified count is 5, three of them one operator's

Recorded 2026-09-05. Owner of the conflict: `research/SPINE.md`, constants table, row "Agents with a
verified endpoint domain".

## The conflict

Three files carried three shapes of the same number.

| File | What it said |
| --- | --- |
| `SPINE.md` | 5 in total, of which 3 are one operator's, cited to R12 and R05 |
| `R05-8004scan-api.md` line 988 | "Five endpoint-verified agents out of 304,281 and four of the five belong to one rival's hackathon build", with lines 103 to 105 naming five "Brain on BNB" agents under `0x73809f…` plus Arca at token 705 |
| `R12-agent-comms.md` line 98 | 5 in total, no operator split |
| `13-PARTNERS.md` section 2.3, before this fix | "exactly 5 endpoint-verified agents on BSC, four of them one operator's" |

The number carries the whole C2 argument in section 2.3, so two documents publishing different splits is
not cosmetic.

## What settled it

The live query, run twice three seconds apart at 2026-09-05T19:00Z:

```
curl -s -H 'User-Agent: <ours>' \
  "https://api.8004scan.io/api/v1/agents?chain_id=56&is_endpoint_verified=true&limit=10"
```

Both reads returned `total` 5 with the same five rows:

| token_id | owner | name |
| --- | --- | --- |
| 304493 | `0x73809f69916fcf7ddc5bb1315fbdf96a569a5963` | Brain on BNB, Venus Yield Ranking |
| 302258 | `0x73809f69916fcf7ddc5bb1315fbdf96a569a5963` | Brain on BNB, BSC Grid Planner |
| 302257 | `0x73809f69916fcf7ddc5bb1315fbdf96a569a5963` | Brain on BNB, Venus Health Factor Monitor |
| 7612 | `0xb273616670037c0870e9835b3ffbe68f58de68b0` | 8k4 Protocol Trust Oracle |
| 705 | `0x1be93c700ddc596d701e8f2106b8f9166c625adb` | Arca |

Three of five under one owner, two under two others.

## The decision

**`SPINE.md` holds at 3 and is not edited. `13-PARTNERS.md` moves from four to three and cites the read
time.** R05 recorded four of five earlier the same day, which was true of the set it read: the composition
moves, because endpoint verification lapses and 8004scan's own read path flapped 20.8% then 56.7% non-200
across two windows that day. R05 keeps its original sentence as a capture, with a dated correction note
beside it pointing here.

Rejected: editing SPINE's row to 4 on R05's authority. That would have pinned the spine to a set that no
longer exists and left the live chain read contradicting the file every other document treats as canonical
for constants.

## The rule this leaves behind

The count ships with the read time everywhere it appears, the same way `SPINE.md` already requires for the
population numbers. A moving number cited bare is a defect whichever value it carries.
