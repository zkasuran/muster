# The UI is built on Opensource UI, on BNB Chain's own three published colours

**Decision.** The front end uses the Opensource UI component set
(`github.com/bidyut10/opensourceui`, React and Next.js, Tailwind, lucide icons) and paints it in
BNB Chain's published brand colours. The stack already chosen in `15-SYSTEM.md` is Next.js on Node 22
with Tailwind, so the kit drops in without a second framework.

**Licence, read before use.** MIT, "Copyright (c) 2026 Bidyut Kundu", read from the repository's own
LICENSE file rather than from GitHub's metadata field, which reported none. MIT requires the notice to
travel with the copy, so the full text goes in our `NOTICE` alongside the component source. That is an
attribution a licence demands, so it is not framing and it is not optional.

**The palette, from BNB Chain's own brand guidelines.** Their page publishes exactly three colours and
no semantic tokens:

| Role | Hex | Note |
| --- | --- | --- |
| Brand yellow | `#F0B90B` | Pantone 116C. "The yellow logo (all variations) should always be used, wherever possible." |
| Near-black | `#0B0E11` | the canvas |
| White | `#FFFFFF` | mono use |

Third-party palettes circulate `#FCD535` and `#F3BA2F` for the same yellow. Neither matches the
published value, so both were rejected. `#F0B90B` is the one BNB Chain prints.

**Semantic colours are ours. The notes say so.** No success, warning, error or up-and-down pair is
published, yet a marketplace showing health factors and yields needs them. We define our own pair and
label them ours in the design notes rather than implying BNB Chain specified them.

**The marks are a different matter from the colours.** Their guidelines are explicit: "Projects must not
modify the BNB Chain logo in any way", no use "in a way that implies endorsement or sponsorship", plus
"Projects should seek approval from BNB Chain before using the logo." So Muster uses the colours, which
are not restricted the way a mark is, then ships **no BNB Chain logo** until approval exists. If the logo
is ever used, the approved attribution phrasing is "Powered by", "Available on" or "Building on" BNB
Chain, with their handle tagged.

**One wording trap, worth stating because the prize itself sets it.** The prize is described as official
adoption as the BNB Agent Studio marketplace. Their guidelines forbid wording like "Official",
"Partnering" or "Collaborating" with BNB Chain unless cleared by management. So nothing we publish calls
Muster official, a partner or a collaboration, however the programme phrases its own prize. Winning
would change that, but only after they clear it.

**Rejected:** shadcn/ui, which the operator did not pick and which would need the same palette work
anyway. Building components from scratch, which spends hours on buttons that a judge does not score.
