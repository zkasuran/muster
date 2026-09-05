# Notifications and i18n: the pull half and the unit discipline ship, push and locales do not

Written 2026-09-05. Owner of the subject: `14-GAPS.md` sections 5.1, 5.2 and 8.3. Owner of the ship line:
`02-THESIS.md` section 12.

## The disagreement

`02-THESIS.md` section 12 files "Operator onboarding at scale, notifications, i18n, SLA credits, insurance"
under a heading that reads **Documented as next and never presented as shipped**, then points at
`14-GAPS.md` for the list and the minimum version of each. `14-GAPS.md` then labels notifications Ships
thin and i18n Ships thin. Read literally the two documents assert opposite things about the same two areas
and a Ships label is a claim a judge checks on the live site, so leaving both standing is the one class of
error in this set that costs a score directly.

## The decision

Both areas are **partly in the submission and the split is per mechanism, not per area**. That is what the
two documents now say, in the same words.

**Notifications.** The pull half ships: `/receipt/<receiptId>` as a permanent bookmarkable receipt, then
`GET /v1/feed?address=` as a public per-address feed carrying that address's jobs, quotes, receipts, listing
state changes and any statement of reasons addressed to it. Both are reads over rows the product already
writes, both are on `15-SYSTEM.md`'s route list and both land in the day 1 16:00 to 18:00 `api` block. The
push half does not ship. Section 5.2 is **Next**: outbound delivery needs a subscription record the data
model does not carry plus a retry loop that runs for 51 hours, against a build order that is full to the
freeze with eight items already on a cut list. What ships for webhooks is the contract, meaning the ten
events, the header and signature scheme, the published retry schedule, the per-delivery record shape and
`GET /v1/webhooks/{subscriptionId}/deliveries` answering its published envelope over an empty collection.
And no notification reaches a person, because we hold no email and no channel for anyone.

**i18n.** The rendering discipline ships and is enforced in the render layer: amounts from a base-unit
string with the token address and a `decimals()` read asserted at boot, no fiat anywhere, rates stored with
their own unit and source call, ISO-8601 UTC with the block number beside every timestamp, durations in
seconds with the human form beside them, English only and stated on the site. Additional locales do not
ship. The honest reason is that translating the nine policy documents is a legal exercise rather than a
string exercise.

## Why this way round

02's heading was written at the level of "notifications" as a feature and read the whole area as deferred.
That is right about push and wrong about pull, because the receipt URL and the feed cost a query each and
they are the thing a buyer of a multi-day job actually needs: two of the four mandated categories produce
work that outlives any connection, so a venue with no way to come back to a job is broken for half its
shelf set. Cutting them to keep a heading tidy would remove function to protect a label.

The same reasoning fails for push. The boundary is a real one rather than a convenience. A delivery that
is not idempotent, not signed and not observable turns into an argument nobody can settle. A half-built
retry loop is worse than a published contract with nothing behind it. So push is Next and it is labelled
Next.

`SPINE.md` assigns notifications and the i18n discipline to `14-GAPS.md`, so 14's per-mechanism reading is
the one that binds and 02's area-level heading is the one that was too coarse.

## What changed in the documents

- `14-GAPS.md` section 5.1: the shipping list is the receipt URL plus the feed. The webhook clause moved to
  designed-and-published. The closing paragraph names this file.
- `14-GAPS.md` section 5.2: verdict Ships thin becomes **Next**, with the published contract named as what
  does ship. `listing.sunset` was added to the catalogue so the terminal transition of a deprecation emits
  something a subscriber can see.
- `14-GAPS.md` section 1: the register rows for Notifications and Webhooks match the above. Section 1.1
  names the build-order block for every remaining Ships row.
- `14-GAPS.md` section 8.3 is unchanged. Ships thin was already accurate for the unit discipline.

## What would reopen this

A subscription record landing in `15-SYSTEM.md`'s data model for another reason, which would remove the
larger half of the webhook cost. Or a moved deadline, in which case section 11 item 2 finishes the long-job
path with push behind it.
