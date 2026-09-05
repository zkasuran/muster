# Decision: `$U` and FDUSD do branch to ERC-1271. R04's "no 1271 branch" line is superseded

Recorded 2026-09-05 by `08-MONEY.md`, on evidence run the same day.

## What R04 said

`R04-bsc-tokens.md` reads: "FDUSD, USD1 and U use plain `ecrecover` with no 1271 branch, so 3009 keeps
working for a 7702-delegated account. Permit2 does not." `08-MONEY.md` built on that line in three
places: the EIP-7702 routing rule, verify check 7 plus the "one thing we could not settle" section that
declared an Altana wallet probably cannot be the payer on the 3009 rail.

## What the chain says

Traced against BSC mainnet over `https://bsc-mainnet.public.blastapi.io`, one
`transferWithAuthorization` per token with a deliberately invalid signature so the failure path is
visible.

`$U` `0xcE24439F2D9C6a2289F741120FE202248B666666` and FDUSD
`0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409` both staticcall
`isValidSignature(bytes32,bytes)` on `from` and then revert `Invalid signature`. USD1
`0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` calls `PRECOMPILES::ecrecover`, recovers a non-zero
address, then reverts `EIP3009: invalid signature` with no ERC-1271 call at all.

Bytecode agrees. Selector `1626ba7e` is present once in the `$U` implementation
`0xbef21313c69c009fd7d9510a8d3a481a32473dfc` and once in the FDUSD implementation
`0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50` but absent from the USD1 implementation
`0x694aa534bdef8ed63244eb902e7914e527891f08`. The implementation addresses came from the EIP-1967 slot
`0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` at block 120,156,574.

So the ecrecover-only token is USD1 alone, which is the opposite of what the document assumed.

## What changes in the document

1. The per-token verification path replaces the blanket claim. `$U` and FDUSD try `ecrecover` and then
   fall through to ERC-1271 on `from`. USD1 tries `ecrecover` and stops.
2. Verify check 7 branches on `eth_getCode(from)`. Empty code recovers with `ecrecover`. Non-empty code
   calls the token's own `isValidSignature` on `$U` or FDUSD, then refuses plus re-quotes in another
   token on USD1.
3. `R06-altana.md` is now the reading the chain supports: a session key's `isValidSignature` returns the
   magic value only when `msg.sender` is an approved checker for that key, approved once per session
   with `approveSignatureChecker`, the canonical Permit2 for the Permit2 rails and the token contract
   itself for EIP-3009. A smart-account payer that skips it gets `0xffffffff` for a valid signature.
4. The escrow rail stops being the universal smart-account path. It is the fallback for USD1, the one
   token where a smart-account payer genuinely cannot pay.
5. The fee leg on the escrow rail is a `$U` authorisation and `$U` has the branch, so a smart-account
   buyer can sign the fee too. No waiver and no allowance pull is needed.

`R04-bsc-tokens.md` is right about Permit2: an EIP-7702 delegated EOA whose delegate does not implement
ERC-1271 fails there with empty revert data. That part stands. Only the token-level claim is superseded.

## Sources

The traces and the two selector greps above. `R06-altana.md` for `approveSignatureChecker`, the nested
ERC-1271 digest and the 98-byte wrapped signature. `R04-bsc-tokens.md` for the Permit2 empty-revert
trace, which is unaffected.
