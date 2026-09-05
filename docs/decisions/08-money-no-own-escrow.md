# Decision: no HireEscrow of our own. The fee is a second authorisation

Recorded 2026-09-05 by `08-MONEY.md`. This is where the third pass disagrees with the first two.

## What passes one and two said

`../ARCHITECTURE.md` section 3.6 designs **HireEscrow** as the payee: a contract of ours holds the
buyer's payment, releases it against a validator, takes the marketplace fee in basis points out of the
escrowed amount and fails closed to a refund. Section 3.7 then puts Tier 1 of the dispute ladder on the
ERC-8004 Validation Registry.

## What this pass decides instead

1. **No escrow contract of ours.** Escrow rides on the official ERC-8183 stack: kernel
   `0xEa4DAa3100A767e86FDed867729ae7446476EBA6`, router `0x51895229E12F9876011789B04f8698af06cCD6DA`,
   policy `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5`, priced in `$U`.
2. **No contract of ours is the payee on the per-call rail either.** The buyer's EIP-3009 authorisation
   names the agent's own wallet as `to`.
3. **The fee is a second EIP-3009 authorisation** signed by the buyer and payable to the treasury,
   additive to the seller's price, settled in its own transaction after the principal.

## Why

The official escrow already exists and it is busier than any contract we could deploy: 56,713 lifetime
jobs, 28,244 completed, a permissionless `settle`, an `evaluator` field, a `hook` field and a 3-of-5
human dispute panel. Deploying our own would mean issuing the verdicts on our own listings. We
cannot even register our own policy on the shared router: `setPolicyWhitelist` is owner-only and the
owner is `0x5057b09A4b510ccaf7e3fb3038Ba60713E62B1fc`. Pass one could not know that, because nobody had
read the deployment.

The custody point is the stronger half. FinCEN FIN-2019-G001 keeps a venue outside the money-transmitter
definition only while the parties settle "through an outside venue". It puts a CVC payment processor
inside it. A contract of ours that receives the buyer's payment in order to pass it to the seller is the
second shape, whatever its release rules. Atomicity is a technical property rather than a legal one.
Taking the fee out of escrowed funds requires exactly that posture, which is why the fee moved to its
own authorisation.

Tier 1 of section 3.7 also fails on measurement rather than on design: zero validation requests exist
across the whole BSC network, so a validator-gated release has never fired anywhere.

## What we give up

One extra wallet prompt per brokered hire, a little more gas than an atomic split, plus the ability to
set our own release rule. The 7-day mainnet dispute window is the official contract's, not ours, so the
product has to make FUNDED and SUBMITTED first-class states rather than treating COMPLETED as the only
success.

## Sources

`R02-erc8183.md` for the deployment, the owner and the guards. `R15-compliance.md` for the quoted FinCEN
text. `R16-reuse.md` for the settled-money history and for the section-by-section judgement of pass one.
`MEASUREMENT.md` and `R01-erc8004.md` for the zero validations.
