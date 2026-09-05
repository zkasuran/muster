# Decision: `$U` stays first in `accepts[]`, against the recommendation in `VERIFIED-payment-rail.md`

Recorded 2026-09-05 by `08-MONEY.md`. This is a deliberate departure from the file SPINE names
authoritative for the payment rail, so it is written down rather than left implied.

## What the authoritative file recommends

`VERIFIED-payment-rail.md` reads: "Recommended: quote in **USD1** over path 1 as the default, offer
path 2 for USDT so the liquid token still works." Its 2026-09-05 correction adds that of 989 payment
options across the 979 endpoints in B402 Bazaar, 958 price in USD1.

Three arguments back that. All three are real.

1. **Live supply is 39 to 1 in USD1's favour.** Recomputed from
   `raw/b402-bazaar-resources-full-2026-09-05.json`: 989 `accepts` entries, 958 in USD1, 24 in `$U`,
   4 USDT, 3 Binance-Peg USDC.
2. **USD1 alone can have its domain read programmatically.** `eip712Domain()` returns
   ("World Liberty Financial USD", "1", 56, self), read on chain. Selector `84b0196e` is present in the
   USD1 implementation and absent from both the `$U` and the FDUSD implementations, so their domains can
   only be brute-forced against candidate pairs at boot.
3. **USD1 has `cancelAuthorization`.** It is the only one of the three where a buyer can burn an unspent
   nonce on chain rather than waiting out the expiry.

## What 08-MONEY decides instead

`$U` stays the first `accepts[]` entry and USD1 stays the second, in the same challenge, so a buyer pays
in whichever they hold. Four reasons, in the order they matter.

1. **One token covers both rails.** `paymentToken()` on the ERC-8183 kernel
   `0xEa4DAa3100A767e86FDed867729ae7446476EBA6` returns `$U`, one token per kernel, so the kernel is not
   ours to reconfigure. Every escrow hire on BSC is priced in `$U`, so a buyer who wants the watch window
   or any days-long job needs `$U` whatever the 402 rail quotes. Leading with USD1 makes a Muster buyer
   hold two tokens to buy two products from the same shelf.
2. **`$U` is the token a smart-account buyer can pay with and USD1 is not.** Traced today: `$U` falls
   through to ERC-1271 `isValidSignature` on `from`, USD1 is ecrecover only. See
   `08-money-erc1271-branch-supersedes-r04.md`. `R06-altana.md` states it from the other side: include the
   `eip3009` `$U` rail or BNB Agent Studio cannot pay at all.
3. **The acquisition route is real.** PancakeSwap v3 0.01% pool
   `0xA0909f81785f87f3e79309F0E73A7d82208094E4` pairs USDT against `$U`, holding 11,313,040.02 `$U`
   and 9,706,504.98 USDT with `liquidity()` 2.66e27 at block 120,156,766, timestamp 1788632091
   (2026-09-05T18:14:51Z). A second 0.05% pool `0x882e23dbA77BFe0e514cF5BcDad7a58acEB01522` holds
   2,684,557.81 `$U` against WBNB.
4. **Ordering is a hint, not a restriction.** Both entries carry the same amount in the same challenge.
   A client picks the entry whose asset it holds, so the supply figure costs nothing: a USD1 holder pays
   in USD1 either way.

## What we give up

`$U`'s domain has to be brute-forced at boot against candidate name and version pairs, where the boot check
fails loudly on no match. `$U` has no `cancelAuthorization`, so on that entry the 300 s expiry is the only
revocation, which the signing sheet states in words. And `$U`'s issuer, peg and redemption stay
unverified, which is why USD1 sits beside it in the same challenge rather than behind a toggle, plus why
the export prints token units with the USD columns empty.

## Sources

`VERIFIED-payment-rail.md` for the recommendation and the correction. The Bazaar recompute above.
`R03-x402-b402.md` for the ERC-5267 argument. `R02-erc8183.md` for the kernel payment token.
`R06-altana.md` for the Studio requirement. The pool and selector reads above.
