# R08 PancakeSwap surfaces for agents

Research pass for the BNB Chain "Build the Era" hackathon. All on-chain reads run against BSC
chain id 56 on 2026-09-05 with cast 1.7.1. Every number below has the command or URL that produced
it. Where a claim could not be closed out, it sits in "Unverified or open" instead of being rounded up.

## Headline

PancakeSwap already ships an agent surface. The honest opportunity is not to re-expose it but to
correct it: the official `pancakeswap-ai` liquidity-planner publishes an impermanent-loss table that
understates concentrated-range IL by up to 1000x, its Infinity farm APR call returns zero on BSC
and `swap.pancakeswap.com` returns a top-level `priceImpactBps` of -20624 on a trade whose realised
price is within 4 bps of the pool mid. Every one of those is verifiable in one command. Fixing
them is what "Data Quality" on the rubric actually means.

The rest of the surface is genuinely good and keyless. `explorer.pancakeswap.com` gives pool state,
a per-tier fee and protocol-fee split, 24h/48h/7d aggregates and cursor-seekable tick liquidity with
no API key. `swap.pancakeswap.com/v1/quote` plus `/v1/calldata` gives a routed swap with the minimum
output baked into the calldata, also keyless. `https://bscrpc.pancakeswap.finance` is PancakeSwap's
own free MEV Guard RPC. That is enough to build a real agent that never holds user funds.

## Verified facts

| Claim | Value | How verified |
|---|---|---|
| Live AMM versions on BSC | v2, v3, Infinity CL, Infinity Bin, Infinity Stable, StableSwap all live and all indexed | `explorer.pancakeswap.com/api/cached/pools/list/pair/...` returns rows with `protocol` in `v2,v3,infinityCl,infinityBin,infinityStable` |
| v3 factory | `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865`, 5151 bytes | `cast code`; `owner()` = `0x518D9643160cFd6FE469BFBd3BA66fC8035a68a3`, `poolDeployer()` = `0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9` |
| v3 fee tiers enabled | 100/1, 500/10, 2500/50, 10000/200 (fee ppm / tickSpacing). 3000 is NOT enabled | `cast call factory "feeAmountTickSpacing(uint24)(int24)"` for 100,200,500,1000,2500,3000,10000,20000; only the four return non-zero |
| v3 protocol fee per tier | fee 100 -> 33%, fee 500 -> 34%, fee 2500 -> 32%, fee 10000 -> 32% of the swap fee | `slot0().feeProtocol` on one live pool per tier: 216272100, 222825800, 209718400, 209718400; decode `f0 = v % 65536`, `f1 = v >> 16`, denominator 10000 |
| v3 LP share of the fee tier | 0.01% tier pays LPs 0.0067%; 0.05% pays 0.033%; 0.25% pays 0.17%; 1% pays 0.68% | Above, cross-checked against Explorer `apr24h`: implied LP fee / fee tier = 0.6683, 0.6598, 0.6797 on three live pools |
| v2 swap fee on BSC today | exactly 0.25% (9975/10000), not the 0.2% in the old `pancake-swap-periphery` master | `getReserves()` on `0x16b9a828...` plus router `getAmountsOut(1e18,[WBNB,USDT])` = 720559453703237906125; 9975/10000 predicts that to the wei, 998/1000 is off by +3.6e17 |
| Infinity fee model | protocol fee is ADDED to the LP fee, not taken out of it: `swapFee = protoFee + lpFee - protoFee*lpFee/1e6`, all in pips | `infinity-core/src/libraries/ProtocolFeeLibrary.sol` `calculateSwapFee`; `MAX_PROTOCOL_FEE = 4000` pips, `PIPS_DENOMINATOR = 1_000_000` |
| Infinity dynamic-fee pools are real and common | `poolKey.fee = 8388608` (0x800000) with `slot0.lpFee = 0` on the Cake/USDT and BNB/Cake CL pools | `cast call CLPoolManager "poolIdToPoolKey(bytes32)(address,address,address,address,uint24,bytes32)"` and `"getSlot0(bytes32)(uint160,int24,uint24,uint24)"` |
| Infinity liquidity on BSC is material but uneven | top CL pool $2.33M TVL (BNB/COLLECT), Cake/USDT $2.18M; but WBNB/USDT Infinity pools are $1035, $699, $532, $293 while v3 WBNB/USDT holds $11.6M and v2 $83.1M | Explorer `pools/list?chains=bsc&protocols=infinityCl,...&orderBy=tvlUSD` vs the WBNB/USDT pair query |
| Unified Swap API is keyless | `GET https://swap.pancakeswap.com/v1/quote` and `POST /v1/calldata` both return 200 with no header; default limit 10 RPS per IP | live curl, both endpoints; rate limit from the docs page |
| Quote TTL | exactly 180 s (`expiresAt` minus request time) | two timed calls, `ttl=180` both times |
| minOut is enforced on-chain | calldata word 3 = `outputAmount * (1 - slippageTolerance)` to the wei; router is `0x2f68417A18dA681589F4eA64B9Cc9839209acfF7`, selector `0xedad400c` = `swapExactIn(...)` | quote outputAmount 98357409255966486634, slippage 0.005, calldata carries 97865622209686654200; `cast decode-calldata` shows `(tokenIn, tokenOut, minOut, deadline)` |
| Deadline in calldata | unix timestamp, `expiresAt + 121 s` on the sample | decoded tuple field 4 = 1788571441, quote `expiresAt` 1788571320 |
| Top-level `priceImpactBps` is unusable at small notionals | CAKE->USDT: 1 CAKE -> -20624 bps, 5 CAKE -> -2983 bps, 50 CAKE -> +5 bps, 500 CAKE -> +5 bps, with realised price 1.9682 / 1.9678 / 1.9675 / 1.9674 USDT per CAKE | four quotes, same pair, same session; the anomaly tracks route splitting (2 and 4 routes bad, 1 route fine) |
| Per-route `priceImpactBps` is sound | 2000 WBNB -> USDT aggregate 43 bps, realised 717.37 vs mid 720.64 = 45 bps | one quote, `.best.agg.routes[].priceImpactBps` |
| BSC gas price | 50000000 wei = 0.05 gwei; a 738k-gas aggregator swap costs about $0.027 | `cast gas-price`; `gasUseEstimateUsd` 26582627475611223 (1e18-scaled) |
| PancakeSwap MEV Guard RPC | `https://bscrpc.pancakeswap.finance`, chain 56, free, method-allowlisted, head within 1 block of publicnode | `cast chain-id` = 56, `cast block-number`, `cast call CAKE symbol()` = "Cake", `eth_syncing` returns "rpc method is not whitelisted" |
| Position math reproduces on-chain to the wei | at block 120022524 all four values match exactly | see "Worked position" below |
| The published IL table is wrong | official skill says full range has 0% IL at 2x and a +/-10% range has 0.03% IL at 2x; correct values are -5.72% and -30.66% | value function verified against on-chain `decreaseLiquidity`, then evaluated over the same ranges |
| v3 pool oracle cannot serve a 24h TWAP on BSC | max lookback 39234 s (10.9 h) on the 0.05% pool (cardinality 900) and 21407 s (5.9 h) on the 0.01% pool (cardinality 2400) | binary search on `observe([n])` until it stops reverting with `OLD` |
| No free BSC archive state | publicnode 60 blocks, bsc-dataseed.binance.org 82 blocks, 1rpc.io/bnb 73 blocks (about 45 to 60 s) | binary search on `cast call --block head-n pool liquidity()`; publicnode returns "Archive requests require a personal token" |
| CAKE farm rewards accrue only in range | for pid 5, MasterChef `totalLiquidity` 6.182e24 but `lmPool.lmLiquidity()` 3.026e24, so 48.95% of staked liquidity is earning | `poolInfo(5)` fields 6 and 7 vs `lmPool()` = `0x4d67dc640f5327D0e1c7C6537eD8542aaf46cf99`, `lmLiquidity()` |
| Explorer splits gross fee from protocol fee | `feeUSD24h` = volume x feeTier exactly; `protocolFeeUSD24h` = 33% of it on the 0.01% tier | pool detail: volume 135202977.14 x 0.0001 = 13520.30 = `feeUSD24h`; `protocolFeeUSD24h` 4462.06 = 13520.30 x 0.3300 |
| Explorer tick endpoint is seekable | `?after=` takes base64 of `tickIdx=<n>`; passing base64("tickIdx=-66000") returns rows starting at -65999, 1000 rows per page | `curl -G .../cached/pools/ticks/v3/bsc/<pool> --data-urlencode "after=dGlja0lkeD0tNjYwMDA="` |
| NFPM is ERC721Enumerable | `totalSupply()` 4970189, `tokenByIndex(0)` = 1, `tokenOfOwnerByIndex(MasterChefV3,0)` = 402354, MasterChefV3 holds 82030 staked positions | four `cast call`s on `0x46A15B0b...` |
| Infinity farm campaigns on BSC are dormant | `/farms/campaigns/56/false` returns `totalRecords: 0`; `/56/true` returns 865, newest (id 865) ran 2026-08-31 to 2026-09-02 at 2.7 CAKE per pool | `curl https://infinity.pancakeswap.com/farms/campaigns/56/{true,false}?limit=100&page=9` |
| The 8183 example's router allowlist is stale | it allowlists `0x40a1fe393a7f566f27df6ace18e6773be844dafc` (23411 bytes, live) but today's `/v1/calldata` targets `0x2f68417A18dA681589F4eA64B9Cc9839209acfF7` (141 bytes, proxy) | `agent/config.py` `AGGREGATOR_ROUTER_ALLOWLIST` vs the live calldata `to`; `cast code` on both |
| Its aggregator base is also stale | `https://hub-gateway.pancakeswap.com` returns `{"code":404,"msg":"Not found"}` on `/`, `/v1/quote` and `/aggregator/quote` | three curls |

## Unverified or open

| Claim | What blocked it |
|---|---|
| Whether the `priceImpactBps` anomaly is a stale USD reference price or a split-weighting bug | the aggregator is closed source. Realised price matched the pool mid in every case, so the direction of the defect is settled but not its cause |
| PancakeSwap Hub API (`hub-api.pancakeswap.com/aggregator`) request and response shapes | needs an `x-secure-token` issued by a PancakeSwap integration contact. The shapes quoted below come from the official skill doc, not from a call I made |
| The v3 exchange subgraph (`Hv1GncLY5docZoGtXjo4kwbTvxm3MAhVZqBZE4sUT9eZ`) | The Graph decentralised network needs a gateway API key. I did not have one, so nothing subgraph-derived is claimed as verified |
| Why Explorer `apr24h` on v2 pools is 0.68x lower than a 0.17%-to-LP calculation | reproducible (implied LP fee / fee tier = 0.4624 = 0.68^2 on the USDT/WBNB v2 pool) but I could not find the source. v3 reconciles cleanly, v2 does not. Do not use Explorer v2 `apr24h` without re-deriving it |
| The exact meaning of the boolean path segment in `/farms/campaigns/{chainId}/{bool}` | undocumented. `true` returns 865 records, `false` returns 0. The official `farm-apr.py` calls `/false`, so its Infinity CAKE APR is always 0 on BSC today |
| Measured CAKE accrual is 1.26x the allocPoint formula | measured 242.69 CAKE/yr from a 78 s `pendingCake` delta vs 193.17 predicted on the in-range basis. Most likely `lmLiquidity` moved during the window. Sample over hours before trusting either |
| `infinityStable` `feeTier` units | Explorer returns 25000000 for a stable pool while CL pools return pips (58, 67, 334). 25000000/1e10 = 0.25% fits, but I did not read a stable pool's fee on-chain to confirm the denominator |
| Whether MEV Guard accepts `eth_sendRawTransaction` with bundle semantics | would need a funded signed transaction. `eth_syncing` is already blocked by a method allowlist, so the method set is narrower than a normal node |

## Interfaces and constants

### Addresses on BSC (chain id 56), every one confirmed with `cast code`

PancakeSwap v2:

```
PancakeFactory            0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73   19084 bytes
PancakeRouter02           0x10ED43C718714eb63d5aA57B78B54704E256024E   21936 bytes
```

`allPairsLength()` = 2843806. `INIT_CODE_PAIR_HASH()` = `0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5`.
`router.factory()` and `router.WETH()` return the factory and `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` (WBNB).

PancakeSwap v3:

```
PancakeV3Factory          0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865    5151 bytes
PancakeV3PoolDeployer     0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9   24556 bytes
SwapRouter                0x1b81D678ffb9C0263b24A97847620C99d213eB14   12154 bytes
NonfungiblePositionManager 0x46A15B0b27311cedF172AB29E4f4766fbE7F4364  24466 bytes
QuoterV2                  0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997    8331 bytes
TickLens                  0x9a489505a00cE272eAa5e07Dba6491314CaE3796    1385 bytes
SmartRouter               0x13f4EA83D0bd40E75C8222255bc855a974568Dd4   24316 bytes
MasterChefV3              0x556B9306565093C855AEA9AE92A594704c2Cd59e   22845 bytes
UniversalRouter (v3)      0x1A0A18AC4BECDDbd6389559687d1A73d8927E416   16684 bytes
lmPoolDeployer            0xd93F5c7A894bb44BDc9231087c8E559502f737eD   (factory.lmPoolDeployer())
```

NFPM `name()` = "Pancake V3 Positions NFT-V1", `symbol()` = "PCS-V3-POS", `factory()` = the v3 factory.

PancakeSwap Infinity (same addresses on BSC and Base):

```
Vault                     0x238a358808379702088667322f80aC48bAd5e6c4    8347 bytes
CLPoolManager             0xa0FfB9c1CE1Fe56963B0321B32E7A0302114058b   20885 bytes
BinPoolManager            0xC697d2898e0D09264376196696c51D7aBbbAA4a9   23821 bytes
CLPositionManager         0x55f4c8abA71A1e923edC303eb4fEfF14608cC226   24004 bytes
BinPositionManager        0x3D311D6283Dd8aB90bb0031835C8e606349e2850   17435 bytes
CLQuoter                  0xd0737C9762912dD34c3271197E362Aa736Df0926    6998 bytes
BinQuoter                 0xC631f4B0Fc2Dd68AD45f74B2942628db117dD359    6839 bytes
MixedQuoter               0x2dCbF7B985c8C5C931818e4E107bAe8aaC8dAB7C   16643 bytes
UniversalRouter (Infinity) 0xd9C500DfF816a1Da21A48A732d3498Bf09dc9AEB  24350 bytes
```

`CLPoolManager.vault()` and `BinPoolManager.vault()` both return the Vault.
`CLPoolManager.protocolFeeController()` = `0x15F6180033aEa66377d2A1778e418591C00dEb4c`, `owner()` = `0x13f818BDC906C16764d8325809B4b67A9981f792`.
`CLPositionManager.name()` = "Pancakeswap Infinity Positions NFT", `symbol()` = "PCS-INFINITY-POSM", `nextTokenId()` = 1169798.
`BinPoolManager.maxBinStep()` = 100.

Aggregator routers seen in the wild:

```
Unified Swap API target (2026-09-05)  0x2f68417A18dA681589F4eA64B9Cc9839209acfF7    141 bytes (proxy)
Router in the 8183 example allowlist  0x40a1fe393a7f566f27df6ace18e6773be844dafc  23411 bytes
Router named in the Hub API skill doc 0x5efc784D444126ECc05f22c49FF3FBD7D9F4868a  13594 bytes
```

Three different routers. Read `to` from the live `/v1/calldata` response and allowlist that, refreshed
at startup. Do not hardcode.

Tokens used below, all 18 decimals on BSC (`symbol()` and `decimals()` read on each):
USDT `0x55d398326f99059fF775485246999027B3197955`, WBNB `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`,
CAKE `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82` (`symbol()` returns "Cake", not "CAKE"),
USDC `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`, BTCB `0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c`.

### v3 fee tiers, tick spacing and the protocol fee split

```
fee(ppm)  tickSpacing  slot0.feeProtocol   f0/f1 (of 10000)  LP keeps   LP fee on volume
     100            1        216272100         3300 / 3300      67.0%          0.0067%
     500           10        222825800         3400 / 3400      66.0%          0.0330%
    2500           50        209718400         3200 / 3200      68.0%          0.1700%
   10000          200        209718400         3200 / 3200      68.0%          0.6800%
```

`feeAmountTickSpacing(3000)` returns 0. There is no 0.3% tier on PancakeSwap v3. Any code ported from
a Uniswap example that assumes 3000 will find no pool.

Decoding, from `PancakeV3Pool.sol`:

```
PROTOCOL_FEE_SP        = 65536
PROTOCOL_FEE_DENOMINATOR = 10000
feeProtocol0 = slot0.feeProtocol % PROTOCOL_FEE_SP
feeProtocol1 = slot0.feeProtocol >> 16
// swap: delta = feeAmount * feeProtocol / 10000, taken OUT of the LP fee
lpFeeOnVolume = feeTier/1e6 * (1 - feeProtocolDirection/10000)
```

The direction matters. `feeProtocol0` applies when `zeroForOne` is true. Both are equal on every live
pool I read, but a pool owner can set them independently with `setFeeProtocol`, bounded to 0 or
1000..4000, so read them rather than assuming symmetry.

`feeAmountTickSpacingExtraInfo(uint24)` returns `(bool whitelistRequested, bool enabled)`. All four
tiers return `(false, true)`.

### Infinity fee model, which is not the v3 model

From `infinity-core/src/libraries/ProtocolFeeLibrary.sol`, verbatim constants:

```solidity
uint16  MAX_PROTOCOL_FEE   = 4000;      // 0.4%
uint256 PIPS_DENOMINATOR   = 1_000_000;
getZeroForOneFee(uint24 self) = uint16(self & 0xfff);
getOneForZeroFee(uint24 self) = uint16(self >> 12);
// "The protocol fee is taken from the input amount first and then the LP fee is taken from the remaining"
calculateSwapFee(uint16 protoFee, uint24 lpFee) = protoFee + lpFee - protoFee*lpFee/1_000_000;
```

So in Infinity the protocol fee is charged on top of the LP fee. In v3 it is carved out of it. An
agent that applies one model to the other misprices both.

Reads on a live CL pool:

```
CLPoolManager.getSlot0(bytes32 id) -> (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)
CLPoolManager.getLiquidity(bytes32 id) -> uint128
CLPoolManager.getFeeGrowthGlobals(bytes32 id) -> (uint256 fg0, uint256 fg1)
CLPoolManager.poolIdToPoolKey(bytes32 id)
  -> (address currency0, address currency1, address hooks, address poolManager, uint24 fee, bytes32 parameters)
```

Three live examples read today:

```
id 0xef470f9ae8512d2762e4f1cd91ae58caea17143afa61b8d56e9b20c8f87688c4  (BNB/COLLECT, $2.33M TVL)
  getSlot0        sqrtP=7530782549974402640822054442191  tick=91093  protocolFee=131104  lpFee=67
  protocolFee decoded  (32, 32) pips = 0.0032% each direction
  swapFee = 32 + 67 - 32*67/1e6 = 99 pips = 0.0099%,  LP keeps 67 of 99 = 67.7%
  poolKey  currency0=0x0 (native BNB)  currency1=0x4B3D30992f003c8167699735F5Ab2831B2A087D3
           hooks=0x9a9B5331ce8d74b2B721291D57DE696E878353fd  fee=67
           parameters=0x...0a0055  ->  tickSpacing=10, hooks bitmap=0x0055

id 0x47516855520496b84a169f7bb92ace7ffb6e8c535bccb52a308ccff113aeccfb  (Cake/USDT, $2.18M TVL)
  getSlot0        tick=6788  protocolFee=1229100  lpFee=0
  protocolFee decoded  (300, 300) pips = 0.03% each direction
  poolKey  currency0=CAKE  currency1=USDT  hooks=0x1A3DFBCAc585e22F993Cc8e09BcC0dB388Cc1Ca3
           fee=8388608 (0x800000, DYNAMIC_FEE flag)  parameters=0x...320040 -> tickSpacing=50

id 0x54c27041dfa246727d9351613eb35da028ddf377225d8db9e68ca3b569b5ba24  (BNB/Cake, $2.06M TVL)
  getSlot0        tick=59008  protocolFee=1229100  lpFee=0   fee=8388608 (dynamic)
```

`parameters` layout, from `CLPoolParametersHelper.sol` and `BinPoolParametersHelper.sol`:

```
CL  : bits [0,16)  hooks registration bitmap
      bits [16,40) tickSpacing, int24
Bin : bits [0,16)  hooks registration bitmap
      bits [16,32) binStep, uint16
```

`lpFee = 0` with `fee = 0x800000` means the hook decides the fee per swap. A dynamic-fee Infinity pool
has no static fee to read, so its fee APR cannot be derived from the pool key. Either read realised
fees from the Explorer aggregates or observe `getFeeGrowthGlobals` over time.

### The data path, ranked by what an agent should actually use

1. **Explorer REST, keyless, first party.** Base `https://explorer.pancakeswap.com/api`.

Pool list by pair (returns only that pair, all protocols):

```
GET /cached/pools/list/pair/{token0}/{token1}
    ?chains=bsc&protocols=v2&protocols=v3&protocols=stable
    &protocols=infinityCl&protocols=infinityBin&protocols=infinityStable&orderBy=tvlUSD
```

Pool list by one token or none, cursor paginated, 50 rows a page:

```
GET /cached/pools/list?chains=bsc&protocols=v3&orderBy=tvlUSD&tokens=56:{address}
```

`orderBy` accepts `tvlUSD`, `apr24h`, `volumeUSD24h`. Envelope:

```json
{ "hasNextPage": true, "hasPrevPage": false,
  "startCursor": "dHZsVVNEPTgzMTMxMDcyLjcxOTc1MzEmaWQ9MHgxNmI5...",
  "endCursor": "...", "rows": [ ... ] }
```

Row, exactly as returned (numbers are strings):

```json
{
  "id": "0x172fcd41e0913e95784454622d1c3724f546f849",
  "chainId": 56, "protocol": "v3", "feeTier": 100,
  "token0Price": "720.2918723045475", "token1Price": "0.0013883260917557441",
  "tvlToken0": "8556789.044078566", "tvlToken1": "4211.8603293903625",
  "tvlUSD": "11589431.154290175",
  "volumeUSD24h": "125033505.63619006200952089652691694902115",
  "apr24h": "0.263149727835013",
  "token0": {"id":"0x55d3...","name":"Tether USD","symbol":"USDT","decimals":18},
  "token1": {"id":"0xbb4c...","name":"Wrapped BNB","symbol":"WBNB","decimals":18}
}
```

`feeTier` is in pips (1e-6) for v2, v3, infinityCl and infinityBin. `apr24h` is a decimal fraction.
`token0Price` is token0 per token1 (720.29 USDT per WBNB when token0 is USDT).

Pool detail, the richest single call in the whole surface:

```
GET /cached/pools/{chain}/{poolAddress}
GET /cached/pools/v3/{chain}/{poolAddress}     (same payload)
```

```json
{
  "id": "0x172fcd41e0913e95784454622d1c3724f546f849",
  "feeTier": 100, "liquidity": "3676024151856499986795779",
  "sqrtPrice": "2952567537203403369356691640", "tick": -65797,
  "token0Price": "720.0447472314299", "token1Price": "0.0013888025762912614",
  "tvlToken0": "8541106.338022698", "tvlToken1": "4237.262378005941",
  "totalVolumeUSD": "168234827608.4494", "totalFeeUSD": "16823482.76083145",
  "feeUSD24h": "13520.297715754",  "feeUSD48h": "26390.224494004",  "feeUSD7d": "66665.893831896",
  "protocolFeeUSD24h": "4462.060558514", "protocolFeeUSD48h": "8709.498767672",
  "protocolFeeUSD7d": "22001.578758409",
  "volumeUSD24h": "135202977.14242", "volumeUSD48h": "263902244.92993",
  "volumeUSD7d": "666658938.3144",
  "tvlUSD": "11591147.959789727", "tvlUSD24h": "11578520.808014471",
  "tvlUSD48h": "11613993.654100033", "tvlUSD7d": "11652706.134565325",
  "createdAtTimestamp": "2023-04-05T14:12:23.000Z", "protocol": "v3"
}
```

`feeUSD24h` is the gross fee (volume x feeTier). `protocolFeeUSD24h` is the protocol's cut of it.
LP fee = `feeUSD24h - protocolFeeUSD24h`. Verified: 135202977.14 x 0.0001 = 13520.30 and
13520.30 x 0.33 = 4461.7 against a reported 4462.06.

Tick liquidity, keyless, seekable:

```
GET /cached/pools/ticks/v3/{chain}/{poolAddress}
GET /cached/pools/ticks/v3/{chain}/{poolAddress}?after={base64("tickIdx=<n>")}
```

```json
{ "startCursor": "dGlja0lkeD0tODg3Mjcy", "endCursor": "dGlja0lkeD0tNzMxODU",
  "hasNextPage": true,
  "rows": [ { "id": "0x172f...#-887272", "tickIdx": -887272,
              "liquidityGross": "733943596386324393003",
              "liquidityNet": "733943596386324393003",
              "price0": "0.000000000000000000000000000000000000002938956807614301",
              "price1": "340256786833063500000000000000000000000" } ] }
```

1000 rows a page, ascending from `MIN_TICK`. Without the `after` seek you burn 900 pages to reach the
current tick on a spacing-1 pool. `after=base64("tickIdx=-66000")` returns rows from -65999.

2. **Unified Swap API, keyless, 10 RPS per IP.** Base `https://swap.pancakeswap.com`.

```
GET /v1/quote?chainId=56&tokenIn={addr}&tokenOut={addr}&amount={wei}
             &recipient={addr}&slippageTolerance=0.005
POST /v1/calldata          body = the whole `best` object from /v1/quote
POST /v1/submit            body = best + signature      (PancakeSwap X branch only)
GET  /v1/status/{chainId}/{hash}
```

Optional `X-API-KEY: <key>` header raises the limit. Two branches: if `best.agg` is present, post to
`/v1/calldata` and send the transaction. If `best.pcsx` is present, sign `best.pcsx.permitData` with
`signTypedData`, post to `/v1/submit`, poll `/v1/status`. The pcsx branch never touches a public
mempool, so it is the MEV-safe path by construction.

Quote response, trimmed to the fields that matter:

```json
{ "candidates": [ { "...": "one entry per engine" } ],
  "best": {
    "chainId": 56, "quoteId": "usq_4918fb63b0e4405ea513e3d02f39709c",
    "expiresAt": 1788571183,
    "inputAmount": "5000000000000000000", "outputAmount": "9837472503895750797",
    "recipient": "0x1111111111111111111111111111111111111111",
    "slippageTolerance": 0.005,
    "gasUseEstimate": "738000", "gasUseEstimateUsd": "26582627475611223",
    "priceImpactBps": -2087, "priceImpactBpsWithoutFee": -2092,
    "swapFee": "0", "swapFeeBps": "0",
    "agg": { "srcToken": "0x0E09...", "dstToken": "0x55d3...", "routes": [ ... ] } } }
```

Route element, which is where the usable numbers live:

```json
{ "percent": 68,
  "inputAmount": "3372495370684324215", "outputAmount": "6635853093369617303",
  "priceImpactBps": 4, "priceImpactBpsWithoutFee": 3,
  "path": [ {"address":"0x0E09...","decimals":18,"symbol":"Cake"}, ... ],
  "pools": [
    { "address":"0x1E213600FA9317FEAC4Ef4087acDF5D0e25D7187", "type":"v3",
      "fee":100, "resolvedFee":100, "provider":"pancakeswap",
      "token0":"0x0E09...", "token1":"0xbb4c...", "hooks":null, "parameters":null },
    { "address":"0xd37aa0f0d66ad670279f6b89325c88bdff17d0265144762fb01f54fca9779944",
      "type":"infinityCl", "fee":67, "resolvedFee":67,
      "poolManager":"0xa0FfB9c1CE1Fe56963B0321B32E7A0302114058b",
      "token0":"0x0000000000000000000000000000000000000000", "token1":"0x55d3...",
      "hooks":null, "parameters":"0x00...00", "tickSpacing":1 } ] }
```

`gasUseEstimateUsd` is 1e18-scaled: 26582627475611223 is $0.0266.

Calldata response:

```json
{ "to": "0x2f68417A18dA681589F4eA64B9Cc9839209acfF7", "value": "0x0", "calldata": "0xedad400c..." }
```

Selector `0xedad400c` resolves to:

```
swapExactIn(uint256,(address,address,uint256,uint256),uint256[],
            (uint256[],address[],uint256[],bytes[],address)[][],uint256,address)
```

Decoded on a real response, the second argument is `(tokenIn, tokenOut, minAmountOut, deadline)`, the
third is the per-route input split (which summed to `inputAmount` exactly) and the final `address` is
the recipient I passed in. `minAmountOut` was 97865622209686654200 against a quoted 98357409255966486634
at 0.5% slippage, which is `outputAmount * 0.995` to the wei.

3. **Infinity farm campaigns REST, keyless.**

```
GET https://infinity.pancakeswap.com/farms/campaigns/{chainId}/{bool}?limit=100&page=N
GET https://infinity.pancakeswap.com/farms            -> "Welcome to Pancakesawp Infinity Farms Reward Service!"
```

```json
{ "campaigns": [ { "campaignId":"865", "campaignType":"0",
    "poolId":"0x804762cf085389ac48f9f5954569b0a1032da7c05572c4fcab7b5a76f35516d0",
    "poolManager":"0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b",
    "rewardToken":"0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
    "startTime":"1788163200", "duration":"259200",
    "totalRewardAmount":"2700000000000000000", "status":1,
    "epochEndTimestamp":1788422400 } ],
  "page":1, "limit":100, "totalRecords":865 }
```

With `/false` this returns zero records on BSC. With `/true` it returns 865, none of them live right
now (the newest ended 1788422400, three days before this pass). Yearly reward rate is
`totalRewardAmount/1e18 / duration * 31_536_000`.

4. **Hub API, gated.** `https://hub-api.pancakeswap.com/aggregator`, header `x-secure-token`, BSC only,
100 req/min on the dev tier, `POST /quote` and `POST /calldata`, pool `type` 0 = v2, 1 = v3, 2 = StableSwap,
error codes `ASM-4001` invalid input, `ASM-4002` invalid LP, `ASM-5000` server, `ASM-5001` not found,
`ASM-5002` no route, `ASM-5003` no quote, `ASM-5005` chain not found. Shapes from the official skill
doc, not verified by a call. The keyless Unified Swap API covers the same ground, so treat Hub as
optional.

5. **Subgraphs, need a Graph gateway key.** BSC ids from the official docs:
exchange v3 `Hv1GncLY5docZoGtXjo4kwbTvxm3MAhVZqBZE4sUT9eZ`,
MasterChef v3 `QProcZexB8KYHueG55aoLhBmwnLXExxopq7CUnFkjMv`,
StableSwap `C5EuiZwWkCge7edveeMcvDmdr7jjc1zG4vgn8uucLdfz`.
Exchange v2 on BSC is served through NodeReal MegaNode, not The Graph. Query via
`https://gateway.thegraph.com/api/{key}/subgraphs/id/{id}`. This is the only path to historical
positions and historical ticks, which the Explorer does not expose.

6. **Third party.** DexScreener `api.dexscreener.com/latest/dex/{search,tokens,pairs}` at 2 req/s,
filter `dexId == "pancakeswap"` or `"pancakeswap-stableswap"`. DefiLlama `yields.llama.fi/pools` at
10 req/s, projects `pancakeswap-amm-v3`, `pancakeswap-amm`, `pancakeswap-stableswap`, chain `BSC`.
Merkl `api.merkl.xyz/v4/opportunities/?chainId=56&mainProtocolId=pancake-swap&action=POOL,HOLD&status=LIVE`.
Incentra `POST https://incentra-prd.brevis.network/sdk/v1/liquidityCampaigns` with body
`{"campaign_type":[3,4,8],"status":[4]}`. Token list `tokens.pancakeswap.finance/pancakeswap-extended.json`.

### On-chain reads a rebalancing agent needs

```solidity
// v3 pool
function slot0() external view returns (
  uint160 sqrtPriceX96, int24 tick, uint16 observationIndex,
  uint16 observationCardinality, uint16 observationCardinalityNext,
  uint32 feeProtocol, bool unlocked);          // feeProtocol is uint32 on PancakeSwap, uint8 on Uniswap
function liquidity() external view returns (uint128);   // in-range liquidity only
function feeGrowthGlobal0X128() external view returns (uint256);
function feeGrowthGlobal1X128() external view returns (uint256);
function protocolFees() external view returns (uint128 token0, uint128 token1);
function ticks(int24) external view returns (
  uint128 liquidityGross, int128 liquidityNet,
  uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128,
  int56 tickCumulativeOutside, uint160 secondsPerLiquidityOutsideX128,
  uint32 secondsOutside, bool initialized);
function snapshotCumulativesInside(int24 tickLower, int24 tickUpper) external view returns (
  int56 tickCumulativeInside, uint160 secondsPerLiquidityInsideX128, uint32 secondsInside);
function observe(uint32[] secondsAgos) external view returns (int56[], uint160[]);
function lmPool() external view returns (address);

// TickLens
function getPopulatedTicksInWord(address pool, int16 tickBitmapIndex)
  external view returns ((int24 tick, int128 liquidityNet, uint128 liquidityGross)[]);
// word index = floor(tick / tickSpacing) >> 8; one word covers 256*tickSpacing raw ticks

// NonfungiblePositionManager
function positions(uint256 tokenId) external view returns (
  uint96 nonce, address operator, address token0, address token1, uint24 fee,
  int24 tickLower, int24 tickUpper, uint128 liquidity,
  uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128,
  uint128 tokensOwed0, uint128 tokensOwed1);
function totalSupply() external view returns (uint256);              // enumerable, 4970189 today
function tokenByIndex(uint256) external view returns (uint256);
function tokenOfOwnerByIndex(address, uint256) external view returns (uint256);
function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max))
  external returns (uint256 amount0, uint256 amount1);               // eth_call it to read fees exactly
function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min,
  uint256 amount1Min, uint256 deadline)) external returns (uint256 amount0, uint256 amount1);

// QuoterV2
function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn,
  uint24 fee, uint160 sqrtPriceLimitX96))
  external returns (uint256 amountOut, uint160 sqrtPriceX96After,
                    uint32 initializedTicksCrossed, uint256 gasEstimate);

// MasterChefV3
function poolInfo(uint256 pid) external view returns (
  uint256 allocPoint, address v3Pool, address token0, address token1, uint24 fee,
  uint256 totalLiquidity, uint256 totalBoostLiquidity);              // 7 words, confirmed by raw decode
function v3PoolAddressPid(address pool) external view returns (uint256);
function latestPeriodCakePerSecond() external view returns (uint256); // divide by 1e12 for wei/s
function totalAllocPoint() external view returns (uint256);
function pendingCake(uint256 tokenId) external view returns (uint256);
function userPositionInfos(uint256 tokenId) external view returns (
  uint128 liquidity, uint128 boostLiquidity, int24 tickLower, int24 tickUpper,
  uint256 rewardGrowthInside, uint256 reward, address user, uint256 pid);
function PERIOD_DURATION() external view returns (uint256);           // 86400
function CAKE() external view returns (address);
function receiver() external view returns (address);

// LMPool (from pool.lmPool())
function lmLiquidity() external view returns (uint128);               // in-range STAKED liquidity
function rewardGrowthGlobalX128() external view returns (uint256);
function getRewardGrowthInside(int24 tickLower, int24 tickUpper) external view returns (uint256);
```

Selectors, from `cast sig`, useful for hand-built JSON-RPC batches:

```
positions(uint256)                       0x99fbab88
getPopulatedTicksInWord(address,int16)   0x351fb478
getSlot0(bytes32)                        0xc815641c
latestPeriodCakePerSecond()              0xc4f6a8ce
totalAllocPoint()                        0x17caf6f1
v3PoolAddressPid(address)                0x0743384d
poolInfo(uint256)                        0x1526fe27
tokenOfOwnerByIndex(address,uint256)     0x2f745c59
```

### A real pool, read live

WBNB/USDT 0.01% pool `0x172fcD41E0913e95784454622d1c3724f546f849`. Note `token0` is USDT and `token1`
is WBNB, so the raw price is WBNB per USDT and you invert it to get the number a human wants.

```
token0        0x55d398326f99059fF775485246999027B3197955   USDT, 18dp
token1        0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c   WBNB, 18dp
fee           100          tickSpacing 1
slot0         sqrtPriceX96 = 2952226711344250861213236096
              tick = -65799, observationIndex 2005, cardinality 2400/2400
              feeProtocol = 216272100, unlocked = true
liquidity     3666113053556169970140808
feeGrowthGlobal0X128  2071460058131630573807219736791604878149
feeGrowthGlobal1X128  1870738489694472811617412944132431339
protocolFees  (5826980680269488247933, 8125721772762012053)
maxLiquidityPerTick   191757530477355301479181766273477
lmPool        0xc1B45EC6ed9B65D76a49Ff0c38794d1dAa135050
```

Price from `sqrtPriceX96` across all four tiers of the same pair, same minute:

```
fee    tick      (sqrtP/2^96)^2      USDT per WBNB    1.0001^tick
 100  -65799     0.0013884820           720.2110      0.0013884448
 500  -65795     0.0013890253           719.9293      0.0013890002
2500  -65799     0.0013885119           720.1955      0.0013884448
10000 -65738     0.0013969891           715.8252      0.0013969397
```

The four tiers agree to 0.04% except the 1% tier, which sits 0.6% off. Wider arb band, exactly as
expected and a good sanity check for an agent: if two tiers of the same pair disagree by more than a
few tens of bps at low fee, one of the reads is stale.

Pool discovery across the majors, all confirmed non-zero via `factory.getPool(a,b,fee)`:

```
WBNB/USDT   100 0x172fcD41E0913e95784454622d1c3724f546f849   500 0x36696169C63e42cd08ce11f5deeBbCeBae652050
            2500 0x1401ff943D08a7E098328C1d3a9d388923B115D2  10000 0x6805E0E5333c5c3acCF2930Be4734E2b98f4Ce06
CAKE/WBNB   100 0x1E213600FA9317FEAC4Ef4087acDF5D0e25D7187   500 0xAfB2Da14056725E3BA3a30dD846B6BBbd7886c56
            2500 0x133B3D95bAD5405d14d53473671200e9342896BF  10000 0xd710DaC10B7255fCc0eC929a0e742A18F25b6395
USDT/USDC   100 0x92b7807bF19b7DDdf89b706143896d05228f3121   500 0x4f31Fa980a675570939B737Ebdde0471a4Be40Eb
BTCB/WBNB   500 0x6bbc40579ad1BBD243895cA0ACB086BB6300d636   2500 0xFC75f4E78bf71eD5066dB9ca771D4CcB7C1264E0
ETH/WBNB    500 0xD0e226f674bBf064f54aB47F42473fF80DB98CBA
v2 USDT/WBNB    0x16b9a82891338f9bA80E2D6970FDda79D1eB0daE   ($83.1M TVL, the deepest pool on the pair)
```

TVL alone is a trap. Two live v3 pools with $21.1M and $19.7M TVL had 24h volume of $277 and $634
(`USDT/LUSD` fee 100, `COSA/BTCB` fee 500). Their `apr24h` is 3.2e-7 and 3.9e-6. Rank on
`volumeUSD7d / tvlUSD`, never on TVL.

### A real position, verified to the wei

Position `tokenId 7251129`, staked in MasterChefV3, in pool `0x36696169C63e42cd08ce11f5deeBbCeBae652050`
(USDT/WBNB, fee 500). Found by walking `NFPM.tokenOfOwnerByIndex(MasterChefV3, i)` over a random
sample of the 82030 staked NFTs.

All reads pinned to **block 120022524** with `cast call --block`:

```
positions(7251129)
  token0 USDT, token1 WBNB, fee 500
  tickLower -66470, tickUpper -65720
  liquidity 2291503061848467370468
  feeGrowthInside0LastX128 115792089237316195423570985008687907853158880741878516755850969364229090516143
  feeGrowthInside1LastX128 115792089237316195423570985008687907853269786791323256364919617610333527342204
  tokensOwed0 0, tokensOwed1 0
ownerOf  0x556B9306565093C855AEA9AE92A594704c2Cd59e   (MasterChefV3)
pool slot0     sqrtPriceX96 2950871997683209452577261896, tick -65808
pool liquidity 3048468700797074812439603
feeGrowthGlobal0X128  691081635121517388571085277284273511366
feeGrowthGlobal1X128  1092622116552938939694944837134839013
ticks(-66470)  liquidityGross 2708840431136047578208  liquidityNet  2708840431136047578208
               feeGrowthOutside0X128 459166046530509628961927592803802460702
               feeGrowthOutside1X128 736900835550735945660902938935100157
ticks(-65720)  liquidityGross 2959714576893393359348  liquidityNet -2100657263024852192846
               feeGrowthOutside0X128 342497805013635769596966854806551700538
               feeGrowthOutside1X128 552882157881609716036188606767619160
```

Computed against simulated on-chain calls at the same block:

```
                            computed                  on-chain   err
principal amount0  269831877053662063423     269831877053662063423   0 bps
principal amount1    2778988391779779884       2778988391779779884   0 bps
uncollected fee0     3513241007712413575       3513241007712413575   0 bps
uncollected fee1        4804395069351404          4804395069351404   0 bps
```

The on-chain column comes from `cast call --block 120022524 --from <MasterChefV3> NFPM decreaseLiquidity(...)`
and `... collect(...)`. Both are state-changing functions simulated with `eth_call`, which is the
cheapest way to get an exact answer without reimplementing anything.

In human terms:

```
range   714.5632 .. 770.2134 USDT per WBNB   (spot 720.8724, in range)
value   269.8319 USDT + 2.77898839 WBNB      = $2273.13
fees    3.513241 USDT + 0.0048043951 WBNB    = $6.9766 uncollected
CAKE    pendingCake(7251129) = 0.746194496737880969 CAKE = $1.47
```

**The pinned block is not optional.** Reading the same values three blocks apart (2.25 s on BSC)
moved `amount0` by 0.63 bps. Over 190 s the BNB/USDT mid moved from 720.87 to 722.82, which is 27 bps.
An agent that reads `slot0` from one call and `positions` from another is reporting a number that
never existed. Use one `eth_call` batch with an explicit block number or a multicall.

Exact `TickMath.getSqrtRatioAtTick` and a naive `int((1.0001**(t/2)) * 2**96)` agreed to the wei on this
position, so the float shortcut is not the risk here. The block skew is.

### The rebalance math, with the primary source for each piece

**Tick to price.** `p = 1.0001^tick` in raw token1/token0 units. Adjust for decimals with
`p_human = p * 10^(dec0 - dec1)`. On BSC nearly everything is 18dp so the adjustment is usually 1, which
makes it easy to forget and easy to get wrong the one time it matters. Source: Uniswap v3 whitepaper
section 6.1, `TickMath.sol`.

```python
Q96 = 1 << 96
def price_from_sqrt(sqrtPriceX96): return (sqrtPriceX96 / Q96) ** 2
def tick_from_price(p): return math.floor(math.log(p) / math.log(1.0001))
# usable range must be snapped to the tier's tickSpacing:
tickLower = math.floor(tick_from_price(pa) / ts) * ts
tickUpper = math.ceil (tick_from_price(pb) / ts) * ts
```

**Position amounts.** `LiquidityAmounts.getAmountsForLiquidity`, verified above to the wei:

```python
def amounts(L, sqrtP, sqrtA, sqrtB):
    if sqrtP <= sqrtA:                     # all token0
        return (L * Q96 * (sqrtB - sqrtA)) // (sqrtA * sqrtB), 0
    if sqrtP <  sqrtB:                     # in range
        return ((L * Q96 * (sqrtB - sqrtP)) // (sqrtP * sqrtB),
                (L * (sqrtP - sqrtA)) // Q96)
    return 0, (L * (sqrtB - sqrtA)) // Q96 # all token1
```

**Uncollected fees.** `Tick.getFeeGrowthInside` then `Position.update`. Source: `v3-core/contracts/libraries/Tick.sol`
and `Position.sol`. All arithmetic is mod 2^256 and the intermediate values legitimately look like
garbage near 2^256; that is the intended wraparound, not a bad read.

```python
M = 1 << 256; Q128 = 1 << 128
def fee_growth_inside(fg_global, out_lower, out_upper, tick, tl, tu):
    below = out_lower if tick >= tl else (fg_global - out_lower) % M
    above = out_upper if tick <  tu else (fg_global - out_upper) % M
    return (fg_global - below - above) % M
owed = (L * ((fee_growth_inside(...) - feeGrowthInsideLastX128) % M)) // Q128
```

**Impermanent loss for a range position.** Derive it from the value function rather than a table.
For a position on `[pa, pb]` with liquidity `L`, in quote (token1) terms:

```
x(p) = L * (1/sqrt(p) - 1/sqrt(pb))          # token0 held
y(p) = L * (sqrt(p) - sqrt(pa))              # token1 held
V(p) = 2*L*sqrt(p) - L*p/sqrt(pb) - L*sqrt(pa)          for pa <= p <= pb
V(p) = p * L * (1/sqrt(pa) - 1/sqrt(pb))                for p < pa   (all token0)
V(p) = L * (sqrt(pb) - sqrt(pa))                        for p > pb   (all token1)
HODL(p) = x(p0)*p + y(p0)
IL(p) = V(p)/HODL(p) - 1
```

Full range collapses to the standard `IL(k) = 2*sqrt(k)/(1+k) - 1` with `k = p/p0`. Source: Uniswap v3
whitepaper sections 6.2 and 6.3 for the amount formulas; the IL ratio is the direct consequence and is
checked below against the on-chain-verified value function.

Correct table, symmetric ranges around spot, computed with the formulas above:

```
range        IL @2x up   IL @5x up  IL @2x down  IL @5x down   capital efficiency
full (v2)      -5.72%     -25.46%      -5.72%      -25.46%           1.00x
+/-50%        -21.56%     -57.23%     -22.30%      -63.73%           4.20x
+/-25%        -26.98%     -61.92%     -30.32%      -66.44%           8.35x
+/-10%        -30.66%     -64.74%     -32.54%      -66.80%          20.44x
+/-5%         -31.97%     -65.70%     -33.00%      -66.77%          40.47x
+/-1%         -33.06%     -66.47%     -33.28%      -66.69%         200.49x
```

Bound check: as the range tightens, IL at a 2x move converges to -1/3, because HODL becomes 1.5x V0
while a fully converted position stays at V0. The table converges to -33.06% at +/-1%. The math holds.

What the official PancakeSwap `liquidity-planner` SKILL.md publishes instead:

```
Full range (+/-inf)   0%      IL @2x        0%      IL @5x
+/-50%                0.6%                  5.7%
+/-25%                0.2%                  1.8%
+/-10%                0.03%                 0.31%
+/-5%                 0.008%                0.078%
```

Every row is wrong. Every row is wrong in the direction that makes concentration look free. "Full range, 0% IL
at 5x" should be -25.46%. "+/-10%, 0.03% at 2x" should be -30.66%, a factor of 1000. The published
numbers look like full-range IL values evaluated at much smaller price moves and then relabelled:
their "+/-50% at 5x = 5.7%" is exactly the full-range 2x figure (5.719%) and their "+/-50% at
2x = 0.6%" is exactly the full-range 1.25x figure (0.619%).

**Fee APR.** Two levels. They are different numbers.

Pool level, from the Explorer detail endpoint:

```
lpFee24h    = feeUSD24h - protocolFeeUSD24h
poolFeeApr  = lpFee24h / tvlUSD * 365
poolFeeApr7d = (feeUSD7d - protocolFeeUSD7d) / 7 / tvlUSD * 365
```

Position level, which is what a rebalancer optimises:

```
share            = L_position / pool.liquidity()      # in-range liquidity, not TVL
positionFeePerDay = lpFee24h * share
positionFeeApr    = positionFeePerDay * 365 / positionValueUSD
```

For position 7251129 in the fee-500 pool at this block:

```
pool feeUSD24h 9176.582878597, protocolFeeUSD24h 3120.992523273  -> lpFee24h $6055.59
pool tvlUSD 10944632.94                                          -> pool fee APR 20.19%
share = 2291503061848467370468 / 3048468700797074812439603        = 0.075167%
position fee/day = $4.5518                                       -> position fee APR 73.1%
7d basis: (43043.653 - 14639.127)/7 = $4057.79/day                -> position fee APR 48.97%
```

24h says 73.1%, 7d says 49.0%. Use the 7d window and show both. Concentration multiplier here is
73.1/20.19 = 3.62x, low for a 7.8% wide band, because the pool's own $10.9M is already concentrated near
spot. That multiplier is measured, not assumed from the range width, which is the whole point of using
`pool.liquidity()` as the denominator.

**CAKE farm APR.** Rate comes from MasterChefV3, basis comes from the LMPool.

```
cakePerSec  = latestPeriodCakePerSecond() / 1e12 / 1e18
poolCakeYr  = cakePerSec * allocPoint / totalAllocPoint * 31_536_000
share       = L_position / lmPool.lmLiquidity()     # in-range STAKED liquidity
cakeAprPct  = poolCakeYr * share * cakePriceUSD / positionValueUSD * 100
```

Measured for pid 5 (USDT/WBNB fee 500):

```
latestPeriodCakePerSecond 59131138951832155032993827160  -> 0.059131139 CAKE/s -> 1,864,760 CAKE/yr
poolInfo(5) allocPoint 910, totalAllocPoint 6652         -> 255,101 CAKE/yr for this farm
poolInfo(5) totalLiquidity      6182475668583672358587023
lmPool.lmLiquidity()            3026240563483544812555643   -> 48.95% of staked liquidity is in range
share on the lmLiquidity basis  0.07572111%  -> 193.17 CAKE/yr predicted
share on the totalLiquidity basis 0.03706449% -> 94.55 CAKE/yr (wrong basis, halves the answer)
measured from a 78 s pendingCake delta (0.000600273 CAKE) -> 242.69 CAKE/yr -> 21.0% CAKE APR
```

The official `farm-apr.py` divides by nothing at all on the position side (it returns pool CAKE/year
and leaves the caller to apportion) and PancakeSwap's own liquidity-planner apportions on TVL. Both
routes miss that roughly half the staked liquidity in this farm is out of range and earning zero.
The measured rate is 1.26x my in-range prediction, most likely because `lmLiquidity` moved during the
78 s window, so sample over hours and calibrate.

**In-range time.** `snapshotCumulativesInside(tickLower, tickUpper)` returns a monotonic
`uint32 secondsInside`. Read it twice and divide:

```
inRangeFraction = (secondsInside_t1 - secondsInside_t0) / (wallclock_t1 - wallclock_t0)
```

Live read on the fee-500 pool for range [-66470, -65720]:

```
snapshotCumulativesInside -> tickCumulativeInside 1260658273862
                             secondsPerLiquidityInsideX128 1461501637330902918203684831914222366950874143728
                             secondsInside 4275036203 (t=1788571721)
                             secondsInside 4275036350 (t=1788571866)
```

**You cannot get this retroactively on free infrastructure.** `cast call --block` for anything older
than 60 to 82 blocks fails on every public BSC RPC I tested. publicnode says outright "Archive requests
require a personal token". So `secondsInside` history has to be sampled forward by our own service or
reconstructed from `Swap` event ticks or bought from an indexer.

**Volatility.** The pool oracle will not give you a day. `observe([86400])` reverts with `OLD`. Measured
maximum lookback by binary search: 39234 s (10.9 h) on the fee-500 pool at cardinality 900 and
21407 s (5.9 h) on the fee-100 pool at cardinality 2400. The higher-cardinality pool has the shorter
window because it has far more swaps per second. Use the Explorer's 24h/48h/7d aggregates for anything
longer or store your own series.

**Break-even, which is the actual decision.** A rebalance is worth doing when

```
expectedFeeGain(newRange) * expectedInRangeTime
  > realisedIL(rebalance) + gasCost + swapCost(rebalancing trade)
```

Every term on the left needs `pool.liquidity()`, the fee tier net of the protocol fee and a forecast
of in-range time. Every term on the right needs the IL value function and a live quote. On BSC gas is
almost free (0.05 gwei, about $0.027 for a 738k-gas swap), which shifts the whole calculus: rebalancing
is cheap here in a way it is not on Ethereum, so the binding constraint is IL and the swap cost, not gas.

### Safe automated swaps and what "never puts user funds at risk" means in PancakeSwap's own code

The sponsor wording has a concrete answer in two PancakeSwap repositories. They answer it two
different ways.

**Answer one, the plan/execute boundary.** Every skill in `pancakeswap-ai` stops at a deep link. The
liquidity-planner SKILL.md says it plainly: "This skill **does not execute transactions**". The output
is a URL the user opens, reviews and signs. Deep link formats, verbatim:

```
v3 add          https://pancakeswap.finance/add/{tokenA}/{tokenB}/{feeAmount}?chain={chainKey}
v2 add          https://pancakeswap.finance/v2/add/{tokenA}/{tokenB}?chain={chainKey}
StableSwap add  https://pancakeswap.finance/stable/add/{tokenA}/{tokenB}?chain=bsc
Infinity CL/Bin https://pancakeswap.finance/liquidity/add/{chain}/infinity/{poolId}
Infinity Stable https://pancakeswap.finance/infinityStable/add/{poolId}?chain={chain}
feeAmount       100 | 500 | 2500 | 10000
chainKey        bsc | eth | arb | base | zksync | linea | opbnb | monad | bsctest | sol
native token    use the literal "BNB" or "ETH", never the wrapped address
```

Zero custody. Zero approval. Zero risk. Zero autonomy. It is the right floor and the wrong ceiling
for a marketplace judged on Functionality.

**Answer two, the guardrail list.** `pancakeswap/erc-8183-example` is an official PancakeSwap agent that
does execute. It enumerates exactly what makes that safe. From `agent/guardrails.py` and
`agent/settlement.py`:

1. Recipient invariant. `intent.recipient` must equal the job's client. Output goes straight to the
   client and never touches the agent wallet. "no inventory".
2. Endpoint safelist on `tokenIn` and `tokenOut` only. Intermediate route legs are deliberately
   unrestricted, because the router's own accounting bounds them.
3. `minOut > 0` always. A zero floor is rejected outright.
4. Freshness gate. Re-quote immediately before settling, reject if `minOut` deviates from the fresh
   quote by more than `max_slippage_bps`. A `minOut` far under market signals a dirty or phishing intent.
5. Execution floor. `amountOutMinimum = max(job.minOut, quote.outputAmount * (1 - agent_slippage_bps/1e4))`.
   Never below the client's floor, never zero.
6. Deadline cap, hard, 300 s in the shipped defaults.
7. Per-job value cap, 1000e18 USD-equivalent in the defaults.
8. Router `to` allowlist checked after `/v1/calldata` returns and before signing. The calldata blob is
   opaque, so `to` plus a post-swap balance check are the entire trust boundary.
9. No standing approval. Approve exactly `amountIn` to the router for that one settlement, then it is spent.
10. Pull, not push. `transferFrom(client, provider, amountIn)` against a client approval, so the agent
    fronts no capital.
11. Refund on revert. If the router call throws, transfer the pulled input back to the client so nothing
    is stranded.
12. Measured outcome, not reported outcome. Success is `balanceOf(client)` after minus before, read from
    the token, not the router's return value.
13. Idempotency and concurrency. Only act on a job in `FUNDED` status, one job at a time.
14. No owner or admin calls, by construction rather than by a runtime check.

Shipped defaults:

```python
agent_slippage_bps = 50        # 0.5% execution floor
max_slippage_bps   = 300       # 3% acceptance gate
deadline_cap_sec   = 300
value_cap_usd      = 1000 * 10**18
tip_floor_gas_multiplier = 1.5
max_concurrent_jobs = 1
SAFELIST = {WBNB, USDT, USDC, CAKE}   # all 18dp on BSC
```

**The four numbers that make or break it on BSC.**

*Slippage.* The router enforces `minOut` on-chain. Verified: quote `outputAmount` 98357409255966486634 at
`slippageTolerance` 0.005 produced calldata carrying `minOut` 97865622209686654200, which is 0.995x to the
wei, sitting in a `(tokenIn, tokenOut, minOut, deadline)` tuple that the router checks. So slippage is a
real guarantee, not a UI hint. The agent's job is choosing the number, not enforcing it.

*Price impact.* Do not gate on `best.priceImpactBps`. Four quotes on the same pair in the same session:

```
amount        outputAmount                impactBps   realised USDT/CAKE   routes
1 CAKE        1968252829401324710           -20624         1.9682            2
5 CAKE        9838755426866846428            -2983         1.9678            4
50 CAKE       98376176558330416159              +5         1.9675            1
500 CAKE      983681467167519802131             +5         1.9674            1
```

The realised price is flat across a 500x size range and the pool mid for CAKE/USDT is $1.9670 to $1.9692
across four pools, so the -206% and -29.8% figures are defective, not real. Gating on them would refuse
every small trade. The anomaly tracks route splitting. Sane behaviour does exist at the route level and at
size: 2000 WBNB to USDT reported 43 bps aggregate against a measured 45 bps (717.37 realised vs 720.64 mid).

Practical rule: compute impact yourself as `1 - (outputAmount/inputAmount) / mid`, where `mid` comes from
`sqrtPriceX96` on the deepest pool for the pair and use `priceImpactBps` only as a cross-check. Reject
if the two disagree by more than a set tolerance rather than trusting either.

*Deadline.* Quote TTL is 180 s. The calldata deadline came back at `expiresAt + 121 s`. Both are longer
than they should be for BSC. During this pass the BNB/USDT mid moved 27 bps in 190 s. With a 50 bps
execution floor, a quote held for its full TTL is already inside one standard move of breaching. Cap the
deadline yourself at 30 to 60 s and re-quote rather than reusing.

*MEV.* Route the send through PancakeSwap's own MEV Guard rather than a public RPC:

```
Network name  PancakeSwap MEV Guard New
RPC URL       https://bscrpc.pancakeswap.finance
Chain ID      56
Free          yes, no key
```

Verified live: `eth_chainId` 56, head within 1 block of publicnode, `eth_call` works, `eth_syncing`
rejected with "rpc method is not whitelisted", so it is a curated method set in front of a builder
private mempool. Alternatives named in the BNB Chain validator docs: 48 Club privacy RPC, Merkle free
BSC RPC, BlockRazor private RPC with refund, plus builder proxies from BlockRazor, Merkle and NodeReal
and premium bundle services from bloXroute, JetBuilder, NodeReal, BlockRazor and Puissant. The docs put
free-tier confirmation at roughly 4 to 5 seconds, which is 5 to 7 BSC blocks of extra latency to budget
against a 180 s quote.

The stronger option is the PancakeSwap X branch of the Unified Swap API. When `best.pcsx` is present you
sign `permitData` off chain and post it to `/v1/submit`; no transaction of yours ever hits a mempool, so
sandwiching is structurally impossible rather than merely discouraged. I did not exercise that branch
(every quote I pulled came back with `agg`), so treat the mechanism as documented and unverified by me.

*Approvals.* PancakeSwap runs its own Permit2 at `0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768` on BSC
(7020 bytes, `DOMAIN_SEPARATOR()` = `0x024cdb51703e56fe56eb1dd9dcfc321c085e4e6c3a10c912b579c56b3dbca86e`,
`allowance(owner,token,spender)` returns `(uint160 amount, uint48 expiration, uint48 nonce)`). Uniswap's
canonical Permit2 at `0x000000000022D473030F116dDEE9F6B43aC78BA3` is also deployed (9152 bytes) and is a
different contract, so signatures are not interchangeable. Combined with guardrail 9, the position an
agent can defend is: no infinite approval anywhere, either one bounded ERC-20 approval per settlement or a
Permit2 signature scoped to a single amount with an explicit expiry.

### PancakeSwap's own agent tooling, for the record

`github.com/pancakeswap/pancakeswap-ai`, MIT, 47 stars, docs at `pancakeswap-ai.pancake.run`. A Claude Code
plugin marketplace with three plugins and eight skills:

```
pancakeswap-driver   swap-planner, liquidity-planner, collect-fees, swap-integration
pancakeswap-farming  farming-planner, harvest-rewards
pancakeswap-hub      hub-api-integration, hub-swap-planner
```

Helper scripts worth reading before rebuilding: `skills/common/discover-pools.mjs` (one call that merges
Explorer pools plus Merkl plus Incentra plus MasterChefV3 CAKE APR plus Infinity protocol fees),
`farm-apr.py`, `pool-apr.mjs`, `protocol-fee.mjs`. It ships promptfoo eval suites with a stated bar of
85% pass rate and a `security-checklist.txt` rubric. Every skill opens with a telemetry ping to
`https://pancakeswap.ai/api/ping?skill=...&agent=AGENT_NAME`, which is worth knowing before you paste
their skill into anything.

`github.com/pancakeswap/erc-8183-example`, Python, the guardrail source above, plus a fork-based demo
harness (`demo/fork.py`, `demo/safety_check.py`) and a 3-file unit test suite over the guardrails.
Its `agent-registration.json` is the ERC-8183 registration shape.

Also present in the org and relevant: `pancakeswap/MKT-skills`, `pancakeswap/infinity-hooks`,
`pancakeswap/infinity-hooks-template`, `pancakeswap/infinity-dynamic-fee-hook`, `pancakeswap/permit2`,
`pancakeswap/exchange-v3-subgraphs`, `pancakeswap/token-list`, `pancakeswap/smart-router-example`.
`pancakeswap/pancake-frontend` returns 404 on the API today, so frontend constants have to come from the
docs site rather than the repo.

## Design implications for the marketplace

**1. The PancakeSwap agent that earns the 1,000 CAKE: a range health and rebalance agent that is right
where the official tooling is wrong.**

Call it what it does: it watches a user's v3 and Infinity CL positions and answers one question per
position, with numbers that reconcile to the chain. It covers two of the four mandated categories on its
own (rebalancing directly, yield through the CAKE farm and Merkl and Incentra layers) and it feeds the
other two, because a health-factor agent and a grid agent both need the same pool state and the same swap
path.

Per position it returns:

```
principal      amount0, amount1, USD, all from one pinned block
fees           uncollected fee0/fee1 from feeGrowthInside, plus pendingCake from MasterChefV3
inRange        bool, plus in-range fraction over the last 24h from our own secondsInside series
feeApr          7d basis, position level, denominator = pool.liquidity()
cakeApr         basis = lmPool.lmLiquidity(), not poolInfo.totalLiquidity
extraApr        Merkl + Incentra, with campaign id and status
il              from the value function, at the user's own price scenarios, not a lookup table
verdict         hold | widen | narrow | recentre | exit, with the break-even arithmetic shown
action          a signed-nowhere plan: a deep link or calldata with minOut/deadline/recipient shown
```

The differentiators, each backed by something in this file:

- IL that is correct. The official skill is off by up to 1000x and by 25 percentage points on full range.
- CAKE APR on the in-range basis. 48.95% of staked liquidity in the pool I measured is in range and earning,
  so the other 51.05% earns nothing. Apportioning on TVL or on total staked liquidity roughly halves the
  answer. (Corrected 2026-09-05: this line read "out of range and earning nothing", which inverts the
  measurement at lines 47 and 762. `lmPool.lmLiquidity()` is the in-range staked liquidity, confirmed as a
  strict subset of `poolInfo(5).totalLiquidity` on a fresh read.)
- Fee APR net of the protocol fee, per tier, read from `slot0.feeProtocol` rather than assumed. The 0.01%
  tier pays LPs 0.0067%, not 0.01%.
- One pinned block for every read in a position report. Three blocks of skew is 0.63 bps on `amount0`
  and 27 bps on the mid over three minutes.
- Verification by simulation. Every fee and principal number is cross-checked against an `eth_call` of
  `collect` and `decreaseLiquidity` before it is shown. That is a one-line claim in a demo and it is
  literally unfalsifiable: the chain agrees or the agent says so.
- Dynamic-fee Infinity pools handled honestly. `fee = 0x800000` with `lpFee = 0` means there is no static
  fee; say so and fall back to realised fees rather than printing a fabricated tier.

**2. Ship the "does not execute" boundary and the "executes safely" boundary as two modes, not one
compromise.** PancakeSwap's own two repos are the precedent: skills stop at a deep link, the 8183 agent
executes under 14 named guardrails. Offer plan mode by default and execute mode behind the guardrail list
and show the list in the product. For the Altana track the same list maps almost one to one onto a session
with a call allowlist, a spend cap and an expiry, which is what that gate asks for.

**3. Treat every upstream number as suspect and prove the ones you show.** Concrete list to guard:
`best.priceImpactBps` (defective on split routes at small size), Explorer `apr24h` on v2 pools (0.68x low,
cause unknown), `/farms/campaigns/{chain}/false` (returns zero on BSC), the 8183 example's router
allowlist and aggregator base (both stale), the published IL table (wrong), TVL as a quality signal (two
$20M pools with $300 of daily volume). A visible "reconciles to chain" badge per number is a Data Quality
answer a judge can check in one command.

**4. Data we have to supply ourselves, because the free surface does not have it.** No free BSC archive
node (60 to 82 blocks of state). No 24h TWAP from the pool oracle (10.9 h maximum measured). No positions
endpoint on the Explorer. No historical `secondsInside`. So the marketplace needs a small sampler of our
own: poll `snapshotCumulativesInside`, `pool.liquidity()`, `lmPool.lmLiquidity()` and `slot0` on the pools
we cover on a fixed cadence, store the series and serve in-range fraction, realised volatility and
liquidity-share history from it. That store is the moat and it is cheap: a few dozen `eth_call`s a minute
against a keyless RPC.

**5. Cover v2 and v3 first, Infinity second and be explicit about it.** Infinity CL has real pools at
$2.0M to $2.3M TVL, but the deepest pair on the chain still lives on v2 ($83.1M) and v3 ($11.6M for WBNB/USDT
0.01% alone) and Infinity WBNB/USDT pools hold under $1100. An agent that only speaks Infinity has almost
nothing to manage. An agent that speaks v2, v3 and Infinity CL covers the whole book and Infinity is where
the hooks and the dynamic fees make the analysis interesting.

**6. Route sends through MEV Guard by default and say so in the UI.** `https://bscrpc.pancakeswap.finance`
is free, first party and verified live. Budget 4 to 5 seconds of extra confirmation latency, cap the
deadline at 30 to 60 s rather than accepting the 180 s TTL and re-quote instead of reusing.

**7. Rate limits are generous enough to be non-blocking, so cache anyway.** Unified Swap API 10 RPS per IP
keyless. Explorer publishes no limit. DexScreener 2 RPS. DefiLlama 10 RPS. Public BSC RPC accepts batched
`eth_call` at 10 per request. A 60-item batch with no user-agent header got a 403 from publicnode and
10-item batches with `user-agent: curl/8.5.0` went through; I did not isolate whether the size or the
header was the trigger, so keep batches small and send a header. Cache pool detail for 60 s, tick pages
for 5 minutes, token lists for an hour.

**8. What the agent needs from us, concretely.** Ranked by how much it changes the output:

1. A pinned-block multicall reader. One block number, one batch, every field in a position report. Without
   this nothing else is trustworthy.
2. The sampler from point 4: `secondsInside`, `pool.liquidity()`, `lmPool.lmLiquidity()`, `slot0.tick` on a
   cadence, retained for at least 30 days.
3. A per-tier fee and protocol-fee table read from chain at startup, not hardcoded, refreshed daily. Pool
   owners can change `feeProtocol` and the two directions can differ.
4. A CAKE price and a token USD price source with an explicit staleness stamp. Every APR and every IL number
   depends on it and the aggregator's own USD reference is what appears to be producing the -20624 bps figure.
5. A router allowlist refreshed from a live `/v1/calldata` response at startup, plus the two known historical
   routers, plus a hard reject on anything else.
6. A verification pass that simulates `collect` and `decreaseLiquidity` for every position shown and marks
   the report degraded rather than showing a number that failed to reconcile.
7. A Graph gateway API key if we want historical positions or historical ticks. Everything else works keyless.

## Sources

Primary docs read today, saved under `three/research/raw/`:

- PancakeSwap v3 addresses, https://developer.pancakeswap.finance/contracts/v3/addresses (`pcs-v3-addresses-2026-09-05.html`)
- PancakeSwap v2 addresses, https://developer.pancakeswap.finance/contracts/v2/addresses (`pcs-v2-addresses-2026-09-05.html`)
- Infinity addresses, https://developer.pancakeswap.finance/contracts/infinity/resources/addresses (`pcs-infinity-addresses-2026-09-05.html`)
- Universal router addresses, https://developer.pancakeswap.finance/contracts/universal-router/addresses (`pcs-universal-router-addresses-2026-09-05.html`)
- Permit2 addresses, https://developer.pancakeswap.finance/contracts/permit2/addresses (`pcs-permit2-addresses-2026-09-05.html`)
- Unified Swap API overview, https://developer.pancakeswap.finance/contracts/unified-swap-api/overview (`pcs-unified-swap-api-2026-09-05.html`)
- Subgraph index, https://developer.pancakeswap.finance/apis/subgraph (`pcs-apis-subgraph-2026-09-05.html`)
- PancakeSwap MEV Guard, https://docs.pancakeswap.finance/trading-tools/pancakeswap-mev-guard.md (`pcs-mev-guard-doc-2026-09-05.md`)
- BNB Chain MEV user guide, https://docs.bnbchain.org/bnb-smart-chain/validator/mev/user-guide/

Source code read:

- https://raw.githubusercontent.com/pancakeswap/pancake-v3-contracts/main/projects/v3-core/contracts/PancakeV3Pool.sol (`PancakeV3Pool-source-2026-09-05.sol`)
- https://raw.githubusercontent.com/pancakeswap/pancake-v3-contracts/main/projects/v3-core/contracts/PancakeV3Factory.sol
- https://github.com/pancakeswap/infinity-core `src/libraries/ProtocolFeeLibrary.sol` (`infinity-ProtocolFeeLibrary-2026-09-05.sol`), `src/pool-cl/libraries/CLPool.sol`, `src/pool-cl/libraries/CLPoolParametersHelper.sol`, `src/pool-bin/libraries/BinPoolParametersHelper.sol`
- https://github.com/pancakeswap/pancakeswap-ai `packages/plugins/pancakeswap-driver/skills/liquidity-planner/SKILL.md` and `references/data-providers.md`, `packages/plugins/pancakeswap-hub/skills/hub-api-integration/SKILL.md`, `skills/common/{farm-apr.py,pool-apr.mjs,protocol-fee.mjs}`
- https://github.com/pancakeswap/erc-8183-example `agent/{guardrails.py,config.py,settlement.py}`
- https://raw.githubusercontent.com/pancakeswap/pancake-swap-periphery/master/contracts/libraries/PancakeLibrary.sol (this is v1 at 0.2%, kept only to document the trap)

Live API captures saved under `three/research/raw/`:

- `pcs-explorer-pools-wbnb-usdt-2026-09-05.json`, `pcs-explorer-pool-detail-v3-500-2026-09-05.json`,
  `pcs-explorer-ticks-v3-usdt-wbnb-100-2026-09-05.json`, `pcs-explorer-v3-pools-bsc-top-2026-09-05.json`,
  `pcs-explorer-infinity-pools-bsc-top-2026-09-05.json`
- `pcs-unified-swap-api-quote-cake-usdt-2026-09-05.json`, `pcs-unified-swap-api-calldata-cake-usdt-2026-09-05.json`
- `pcs-infinity-farm-campaigns-bsc-2026-09-05.json`

Reproducible scripts saved under `three/research/raw/`:

- `v3-position-math-verified-2026-09-05.py` reproduces the four wei-exact position numbers from the pinned-block state
- `tickmath-getSqrtRatioAtTick-2026-09-05.py` is an exact integer `TickMath` port used to confirm the float shortcut

On-chain reads: `cast` 1.7.1 against `https://bsc-rpc.publicnode.com` (chain id 56, head 120019289 to 120023728
over the session), with `https://bsc-dataseed.binance.org` and `https://1rpc.io/bnb` used for the archive-depth
comparison and `https://bscrpc.pancakeswap.finance` for the MEV Guard check.
