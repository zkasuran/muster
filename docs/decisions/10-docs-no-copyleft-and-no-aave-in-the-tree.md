# Decision: no copyleft and no Aave source in the tree and health factor ships on Venus

Recorded by `10-DOCS-AND-POLICY.md` sections 6 and its decisions table.

## The decision

Three exclusions, each with the clause read first:

* **No Aave source vendored.** The health-factor category ships on Venus, which is BSD-3-Clause with no
  use restriction and is the deeper BSC lender.
* **No GPL Solidity in the tree.** Interfaces are declared by us. Pool maths is read from the deployed
  contract over an ABI.
* **No GPL-3.0-or-later npm package inside the SAND tree**, so the vendor's own x402 server package sits
  behind its own package boundary or is replaced by our guard.

## The alternative rejected

Vendor Aave v3 under BUSL-1.1 for a second lender. Copy the pool maths in. Import the vendor SDK into the
entry root because it is the vendor's own code and the vendor wants it used.

## Why

BUSL-1.1's Additional Use Grant excludes anything that "directly or indirectly" facilitates migration of
users or funds from Aave and a comparison a user acts on sits close enough to that line to be arguable.
Venus needs no argument.

Copyleft on a combined work collides with a no-derivatives entry licence. Reading a deployed pool over an
ABI creates no derivative work at all, so the copy buys nothing and costs the licence.

The npm case is the same defect in a different file type. The package manifest declares
GPL-3.0-or-later and its tarball ships no `LICENSE` file, verified 2026-09-05. A vendor's blessing is not
a licence exception, so a copyleft import into a no-derivatives entry is exactly as broken as vendored
`.sol`.

## What it binds

`10-DOCS-AND-POLICY.md`'s third-party input table where each source carries its granting clause,
`03-TAXONOMY.md`'s health-factor contract which names Venus, `06-QUALITY.md`'s health-factor metric,
`13-PARTNERS.md`'s Altana integration which is written against the deployed ABI where the SDK cannot be
imported, `15-SYSTEM.md`'s dependency pins.

## What would make us revisit it

Aave changing its Additional Use Grant. A relicensed vendor SDK. A second BSC lender deep enough to be
worth a second integration, under terms we can quote.
