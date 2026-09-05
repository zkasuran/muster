# Decision: the fee is a second buyer-signed authorisation, additive to the operator's price

Recorded by `08-MONEY.md` sections 4 and 9.

## The decision

Muster's fee is its own EIP-3009 authorisation, signed by the buyer, paying us directly. It is
**additive** to the price the operator published, disclosed before signing, at
`feeBase = max(0.01 $U, 200 bps)` with a 0.10 `$U` minimum brokered price. On the escrow rail the fee leg
is signed plus submitted at funding time and it follows the job on any refund.

## The alternative rejected

A splitter contract that receives the total then forwards atomically. Also rejected: deducting the fee
from the operator's proceeds, which is what the incumbent does. Also rejected: percentage only, a floor
with no minimum price or a zero fee for the launch window. Also rejected on escrow: signing the fee at
hire for the settle or extending `validBefore` past `expiredAt`.

## Why

Accepting value in order to pass it on is the payment-processor pattern that sits inside the
money-transmitter definition. Atomicity is a technical property, not a legal one, so one fewer wallet
prompt is not worth the perimeter.

Deduction needs either custody or an `accepts[]` amount below the price the operator published. Additive
keeps our challenge byte-identical to the operator's own number, which is what lets any x402 client pay a
Muster listing without knowing about us.

The floor is arithmetic. At the market's measured modal budget of 0.0001 `$U`, a 200 bps fee is 2e-6 `$U`
while the gas we sponsor costs orders of magnitude more, so percentage-only means paying strangers to
transact. A floor with no minimum price would let the fee exceed the principal, which the minimum
removes. A zero fee for the launch window would leave the mechanism undemonstrated, which is the thing a
judge can actually check.

On escrow the timing is forced: a 300 second authorisation is dead six days plus 23 hours before a
mainnet escrow can settle, so a uniform scheme would collect nothing. Extending the window instead would
break the 300 second cap that is the buyer's main control.

## What it binds

`08-MONEY.md`'s fee schedule plus its escrow leg, `10-DOCS-AND-POLICY.md`'s fee schedule page which
transcludes the constants, `09-DISPUTES.md` where a refund carries the fee with it, `14-GAPS.md`'s unit
economics.

## What would make us revisit it

A category with a counted median price, which is what would turn the picked floor into a derived one. The
additive shape does not move while we hold no funds.
