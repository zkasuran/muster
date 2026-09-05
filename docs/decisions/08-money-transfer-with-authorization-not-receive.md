# Decision: `transferWithAuthorization` straight to the agent's wallet, never a form that needs a contract of ours

Recorded by `08-MONEY.md` section 2, with `15-SYSTEM.md` section 0 recording it as the one departure from
the file that outranks everything else on the rail.

## The decision

The buyer signs an EIP-3009 `TransferWithAuthorization` naming the agent's own wallet as `to`, read from
`getAgentWallet(agentId)` at quote time. Our relayer submits it and pays gas. No contract of ours
receives funds in order to forward them, so the open submission window is accepted.

## The alternative rejected

`receiveWithAuthorization` into a Muster contract, which is the safer mechanic and which
`research/VERIFIED-payment-rail.md` prefers where the payee holds code.

## Why

Two reasons, one legal and one mechanical.

The receive form requires a contract of ours to hold the funds, which crosses the custody perimeter the
rest of the design pays to keep. Accepting value in order to pass it on is the pattern that lands a venue
inside the money-transmitter definition.

Mechanically it also cannot work here. `receiveWithAuthorization` pins `msg.sender` to the payee and our
relayer is not the payee, so the relayer cannot call that form at all. An Altana agent wallet does hold
code (23 bytes of EIP-7702 delegation), which is the case the authoritative file was written for and the
answer is still the transfer form.

The front-running window costs nothing here because `to` plus `value` are fixed inside the signature
before the buyer signs. A front-runner can only submit the payment the buyer already authorised, to the
payee already recorded.

## What it binds

`08-MONEY.md`'s rail plus its verify order, `15-SYSTEM.md`'s custody boundary plus its facilitator
process, `04-AGENT-PROTOCOL.md`'s 402 challenge, `13-PARTNERS.md`'s Altana wallets which hold code,
`08-money-erc1271-branch-supersedes-r04.md` for how the signature is verified on each token.

## What would make us revisit it

Nothing while we hold no funds. A hosted facilitator that submits for us does not change the form, since
the signature already names the payee.
