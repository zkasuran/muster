# 16 Altana: the partner track, built on the testnet path

This document owns the "Best Built with Altana" partner track. It reverses the drop recorded in
`docs/decisions/17-track-priority-is-cash-and-reachable.md`, on the testnet path only. The research
it rests on is `docs/research/R06-altana.md`, re-verified 2026-09-09. Nothing here spends real money.

## What the track asks

Five requirements, all five required, quoted from the Tracks tab through `docs/00-PROGRAM.md`:

1. Agents on their own Altana wallets.
2. Sessions with real limits: a call allowlist, a spend cap and an expiry.
3. Sessions registered in Keystore, "so integration is read onchain rather than from the pitch".
4. Real onchain transactions through a session key. "Testnet counts, mainnet is stronger."
5. User-facing control: a user can see what their agent may do, and revoke it, inside the product.

Two gates on top: the submission must show live onchain transactions in the Altana explorer, plus it
must carry our wallet address or addresses. Two bonuses: hire through ERC-8183, then sell over
x402 or B402.

The point of requirement 3 is that a judge reads the grant off chain rather than off our word.
Session permissions do not live in the Keystore. They live on the wallet's own EIP-7702 delegated
Porto account, where `canExecutePackedInfos(keyHash)` returns the allowlist and `spendInfos(keyHash)`
returns the cap, both free `eth_call`s. The Keystore holds the key and its expiry. So the whole of
requirement 2 and requirement 5 is four chain reads that anyone can run.

## What we build

Our four reference agents sit on reserved ids 900000001 to 900000004 (`lib/agents.ts`). Each gets its
own self-custodial Altana wallet, so requirement 1 is four addresses, never one shared wallet.

- `lib/altana.ts`. Pure helpers plus chain reads, `viem` only. It loads or generates an agent's admin
  key and its session key, derives the wallet address, the Keystore `keyId` and the account `keyHash`,
  builds the scoped session for that agent's shelf, then reads the live grant state off chain. The key
  derivations are unit-tested against the worked example in R06.
- `/altana`. One page, one nav link. For each agent it shows the wallet address, the two key
  identifiers, the intended scope from the builder, then the grant state read live from chain. Where a
  value is not yet on chain it shows `unknown`, never a zero. It carries a Revoke control.
- `/api/altana/revoke`. The Revoke control posts here. It reads the chain first and answers honestly:
  nothing to revoke when no key is registered, then the exact admin command when there is but this
  deployment holds no admin key.
- README and `/status` carry the four wallet addresses, because the track says to include them.

### The wallet and session model

An Altana wallet is an EIP-7702 delegated EOA, not a deployed contract, so its address is the address
of its admin signer and it is the same address on every chain. Generating a fresh private key gives us
both the admin key and, from it, the wallet address. The wallet is counterfactual until the first
admin action registers the root key. So the addresses are real and checkable now. The on-chain existence
is the handoff.

Two key identifiers name the same session key. Confusing them is the most likely integration bug
on this track, so the page shows both and labels them:

```
keyId   = keccak256(publicKey)                                  // Keystore takes this
keyHash = keccak256(abi.encode(uint8 2, keccak256(abi.encode(sessionEOA))))  // the account takes this
sessionEOA = last 20 bytes of keccak256(X || Y)
```

The four mandated categories need only two session shapes, which R06 settles. Rebalancing and grid
trading are both `approve` on a basket plus the PancakeSwap V2 router under a daily cap. Yield is
`approve` plus two or three methods on one lending protocol. Health factor is the tightest, `approve`
plus `repay` and `supply`. Every scope sets `calls` explicitly. Omitting `calls` grants every target
inside the cap, which fails requirement 2 on inspection even though the cap is real, so the builder
refuses to produce a scope with an empty allowlist.

### Keystore registration and the revoke path

Registration and revocation are admin writes through the Altana relay, so they need the admin key, a
funded wallet and the SDK. In this build they are a documented handoff (see below). The revoke path in
the product is wired to the real thing rather than faked: the control reads `isValidKey` first, so it
tells the truth about whether there is anything to revoke and it names the exact command that would
do it.

### The honest testnet against mainnet line

`docs/decisions/13-partners-altana-on-mainnet.md` argues for mainnet, because the track says mainnet is
stronger and four registrations cost under 5 USD. That decision still stands as the target. This build
does not execute it, because the standing rule for the document agents is no real money and testnet
only. So:

- The code path is built and the addresses are real.
- The first real transaction is planned for BSC testnet, chain 97, funded from the free faucet at
  `https://testnet.bnbchain.org/faucet-smart`.
- The mainnet placement is a handoff a human runs after the close, with real BNB. It is not done here
  and the product never claims it is.

The panel shows each session as "built, not yet registered onchain" until a real grant lands. It
reads the chain rather than a local config, so the moment a grant is registered the same page shows it
without a code change.

## Licensing note

`@altananetwork/sdk@0.9.0` is Apache-2.0, re-read from the npm registry 2026-09-09, so it is safe to
adopt. It is added to `package.json` for the grant handoff and carries a `NOTICE` row and a
`DATA-SOURCES.md` row. No compiled file imports it, so the typecheck and the build do not need it
installed.

`@altananetwork/x402-server@0.2.0` is `GPL-3.0-or-later`. It must not enter this tree, because copyleft
would attach to the whole entry, which is licensed Source-Available No-Derivatives. The sell-over-x402
bonus, if built, is written against the published x402 envelope with our own `lib/b402.ts` and
`lib/x402-local.ts`, which already implement the eip3009 envelope and its local verification.
`@altananetwork/hypersigner-keystore-mcp` is also GPL and is out for the same reason.

The Altana skills registry content has no quotable licence, checked across every research pass. Absence
of terms is not permission. So the product never renders the registry's own permission strings.
It cites a skill by id, version and its published `sha256` only, then generates its own consent copy
from chain reads. This matches `docs/decisions/13`.

## The handoff, exact commands

Run from the lane root after the close, with the four key files present under `.hq/altana/` and the
admin wallet funded with testnet BNB.

```bash
# 1. install the SDK (Apache-2.0, not vendored)
npm install @altananetwork/sdk@0.9.0

# 2. fund each admin wallet with testnet BNB, from the faucet (interactive, needs a browser)
#    https://testnet.bnbchain.org/faucet-smart  -> paste each wallet address printed by /altana

# 3. grant one scoped session per agent on chain 97, register in Keystore (register: true)
#    and record the transaction hash. The scope per shelf comes from lib/altana.ts sessionScope().
node --experimental-strip-types tools/altana-grant.ts   # to be written against the SDK at handoff time
```

The grant uses the SDK's `grantSession` with `register: true` (never `false`, which voids requirement
3), a `sessionSigner` we pass from our own key file (never the SDK's in-memory one), the scope from
`sessionScope(shelf)` and an `expiry` past the judging window's end. The revoke uses `revokeSession`
with the admin signer. Both are one relay call. The exact API is pinned in R06.

## Do-not-ship list, carried from R06

- No session without `calls`. The builder enforces this.
- Never `{ to: registry }` scope, which would also authorize `transferFrom` and `setApprovalForAll`.
- Never `register: false` on a submitted session. It saves 0.50 USD and voids requirement 3.
- Never let the SDK generate the session signer. Pass our own key.
- Stablecoin caps are 18 decimals on BNB Chain, not 6.
- One wallet per agent, never one wallet shared across four.
- Never point the demo at localhost or an unlisted endpoint. The judge is not signed in.
