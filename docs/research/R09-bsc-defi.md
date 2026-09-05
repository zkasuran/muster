# R09 BSC lending, health factor and yield

Written 2026-09-05. Every on-chain number below came from a `cast` or raw `eth_call` run this session
against BSC chain 56, mostly through `https://bsc-rpc.publicnode.com`. Block heights are named next to
each claim because BSC blocks are 0.45 s apart and a position read across two blocks does not
reconcile.

## Headline

Venus core pool on BSC is no longer the Compound v2 fork every tutorial describes. It is a Diamond
with separate collateral factors and liquidation thresholds, 15 named E-Mode pools and a
`getAccountLiquidity` that now answers the **liquidation** question, not the borrow-capacity question.
An agent that reads `getAccountLiquidity` and calls it "borrowing power" is wrong by up to 4 percent of
collateral value on a real account today and reads a market like vLINK (collateral factor 0, liquidation
threshold 0.63) as worthless collateral when it is still fully seizable.

## Verified facts

| Claim | Value | How verified |
|---|---|---|
| BSC block time, measured | 0.45000 s over 1,000 blocks, 0.45017 s over 100,000 blocks | `cast block N --field timestamp` at 120026948, 120025948, 119926948 |
| Implied blocks per year | 70,053,535 measured, 70,080,000 as Venus configures it | arithmetic on the above, plus `helpers/chains.ts` in VenusProtocol/venus-protocol |
| Venus core Comptroller (Unitroller) | `0xfD36E2c2a6789Db23113685031d7F16329158384` | `comptrollerImplementation()` returns `0xA66B2b5D50ce68A125bBad6B2265b637868c6E66`, `admin()` returns `0x939bD8d64c0A9583A7Dcea9933f7b21697ab6396` |
| It is a Diamond, not a plain Unitroller | `facets()` returns 5 facets, 102 selectors | `cast call ... "facets()((address,bytes4[])[])"` |
| Venus core close factor | 0.5e18 | `closeFactorMantissa()` and storage slot 5 |
| Venus core liquidation incentive | 1.1e18 for every core market checked | `getLiquidationIncentive(vToken)` selector `0xd686e9ee` and storage slot 6 |
| `liquidationIncentiveMantissa()` no longer exists | reverts `Diamond: Function does not exist` | direct call, selector `0x4ada90af` not in `facets()` |
| Venus core market count | 55 | `getAllMarkets()` at block 120024776 |
| Collateral factor and liquidation threshold are separate | 12 of 55 markets have CF != LT | `getCollateralFactor(vToken)` vs `getLiquidationThreshold(vToken)`, block 120024776 |
| `getAccountLiquidity` uses the liquidation threshold | confirmed by source and by a live account where CF and LT paths differ | `PolicyFacet.sol` lines 447-455, plus account `0x61486e…d607` at block 120026311 |
| `getBorrowingPower` uses the collateral factor | same source, same account | `PolicyFacet.sol` lines 429-437 |
| Venus E-Mode pools live on BSC | `lastPoolId()` = 15, `corePoolId()` = 0, all 15 active | `cast call` selectors `0xa657e579`, `0xd463654c`, `pools(uint96)` |
| Venus liquidation incentive inside E-Mode pool 1 | 1.06e18, not 1.10e18 | `poolMarkets(1, vUSDe)` selector `0x3093c11e`, block 120026645 |
| Venus isolated pools on BSC | 8 pools plus core, PoolRegistry `0x9F7b01A536aFA00EF10310A162877fd792cD0666` | `api.venus.io/pools?chainId=56` plus `poolRegistry()` on comptroller `0xd933909A…c352` |
| Venus supply-rate identity holds exactly | `supplyRate = U * borrowRate * (1 - reserveFactor)` reproduced to the wei | pinned block 120027349, vUSDT, integer recompute |
| Venus published APY formula | `((1 + ratePerBlock/1e18 * 192000)^364 - 1) * 100` | reproduces `api.venus.io` borrowApy and supplyApy to 4e-12 |
| Venus deprecation markets carry a fixed 300 percent borrow rate | `borrowRatePerBlock() = 42808219178` = `3e18 / 70080000` exactly | vBUSD, vSXP, vDOT, vFIL, vMATIC and others, block 120024776 |
| Lista Lending singleton "Moolah" | `0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C` | `idToMarketParams`, `market`, `position`, `isHealthy`, `getPrice` all answer |
| Moolah health check reproduced exactly | 3 of 3 real positions, local math equals on-chain `isHealthy` | block 120028155 |
| Moolah liquidation incentive factor | `min(1.15e18, 1e18 / (1 - 0.3 * (1 - lltv)))` | `ConstantsLib.sol` plus `Moolah.sol` lines 542-545 |
| Lista docs claim a minimum LIF of 1.048, the code has no such floor | lltv 0.86 gives LIF 1.043841336116910229 | docs `introduction/lista-lending/liquidation.md` vs `Moolah.sol` |
| Lista CDP is a MakerDAO fork, live | Vat `0x33A34eAB3ee892D40420507B820347b1cA2201c4`, `live()` = 1, `debt()` = 2.47e52 rad | `cast call` |
| Lista CDP liquidation penalty | `chop` = 1.1e18 on every ilk read | `Dog.ilks(ilk)` for 8 ilks |
| Lista CDP stability fee reproduced exactly | `borrowApr(slisBNB)` = 4035532478367910700, matched by `rpow(duty, 31556952, RAY)` | `Interaction.borrowApr` plus local Decimal recompute |
| Lista CDP liquidation price uses the poked `spot`, not the live oracle | spot implies 750.05318497, oracle says 748.33912426, a 0.229 percent gap | `Vat.ilks(SnBNB)` vs `Interaction.collateralPrice(slisBNB)` |
| Aave v3 is live on BSC with 8 reserves | Pool `0x6807dc923806fE8Fd134338EABCA509979a7e0cB`, `POOL_REVISION()` = 11 | `getReservesList()` |
| Aave is the only one of the three that returns a literal health factor | `getUserAccountData` field 6, `2^256-1` when there is no debt | `cast call` on the Pool |
| PancakeSwap v3 protocol fee is on-chain readable | 3300 for the 0.01 percent tier, 3400 for the 0.05 percent tier, denominator 10000 | `slot0().feeProtocol` on pools `0x172fcd…f849` and `0x46cf1c…a7c4` |
| PancakeSwap fee APR is measurable from Swap logs alone | 6,583 swaps in 3,000 blocks reproduce the API within 10 percent | blocks 120026880 to 120029880 |
| PancakeSwap gross fee APR overstates LP yield by a third | 42.34 percent gross vs 28.37 percent net of protocol fee | explorer API fields plus on-chain `feeProtocol` |
| slisBNB to BNB rate | 1.038016116636725181 | `ListaStakeManager.convertSnBnbToBnb(1e18)` at `0x1adB950d8bB3dA4bE104211D5AB038628e477fE6` |
| asBNB to slisBNB rate | 1.027512203878882689 | `convertToTokens(1e18)` on minter `0x2F31ab8950c50080E77999fa456372f276952fD8` |
| wBETH to ETH rate | 1.105797129294 | `exchangeRate()` on `0xa2E3356610840701BDf5611a53974510Ae27E2e1` |
| Liquid staking rates cross-check against the Venus oracle | asBNB 1.0275 * 1.03802 = 1.06657, oracle ratio 770.740703 / 722.632034 = 1.06658 | two independent reads |
| Free public BSC RPC has no archive | `eth_call` at tip minus 1,000 returns HTTP 403 "Archive requests require a personal token" | `cast call --block N-1000` on publicnode |

## Unverified or open

| Claim | What blocked it |
|---|---|
| Which Venus release tag the deployed facets correspond to | Etherscan-family verified-source APIs need a key. I read the `develop` branch on GitHub and confirmed selector-by-selector that every function I quote exists on the deployed Diamond, but I cannot prove the deployed bytecode is byte-identical to that branch. |
| Whether Venus's `DeviationBoundedOracle` at `0xc79Cb7efEBd121DC4B39eA141C214606595D665A` currently returns anything other than spot | For the one real account I priced, the collateral-factor path and my spot-price recompute agreed to the wei, so bounded prices equalled spot at block 120026311. That is one sample, not a proof about all assets or all market conditions. |
| A live Lista CDP urn with non-zero `art` | Every free RPC I tried caps `eth_getLogs` at roughly 4,500 blocks (about 34 minutes at 0.45 s) or refuses the range outright: publicnode returns "Archive requests require a personal token" past that, drpc caps at 10,000 and then errored, 1rpc caps at 50 blocks, meowrpc does not support the method, ankr and blastapi want a key. No Vat `frob` LogNote landed inside the window. The ilk parameters and the formula are verified; the single-account demo is not. |
| A live Aave v3 BSC borrower | Same log-window limit. Zero `Borrow` events on the Pool in a 4,400-block window. Aave BSC is small: 59.2M USDT supplied, 47.5M borrowed. |
| Kinza Finance contract addresses | `docs.kinza.finance/resources/deployed-contracts/bnb-chain.md` returns HTTP 403 to a plain curl. I will not write down an address I could not read from a primary source. |
| Avalon Labs contract addresses | `docs.avalonfinance.xyz/llms.txt` has no address index and no deployed-contracts page. Same rule. |
| Venus Prime APY boost semantics | The API reports `estimatedPrimeSupplyApyBoost: "0.1476014081473458"` for vUSDT. Whether that is 0.1476 percentage points or 14.76 percent I did not establish. Prime contract is `0x059EabA8676b03e4e8f009eFb7F587C28450F50f`. |
| How often the Lista slisBNB rate steps | The rate only moves when rewards are compounded, not per block. Measuring the cadence needs archive access or a multi-hour watch, neither of which I ran. |
| `pools(uint96)` third return field name | I decoded it as `allowCorePoolFallback` from `ComptrollerStorage.sol`'s `PoolData` struct order. The deployed getter returns `(string, bool, bool)` in the order label, isActive, allowCorePoolFallback, which matches, but the ABI is not published so I inferred the third name. |
| Whether 8004scan or B402 surfaces any of these protocols already | Out of scope for this pass. |

## Interfaces and constants

### Venus core pool, BSC chain 56

```
Comptroller (Diamond proxy)   0xfD36E2c2a6789Db23113685031d7F16329158384
  implementation              0xA66B2b5D50ce68A125bBad6B2265b637868c6E66
  admin (Normal Timelock)     0x939bD8d64c0A9583A7Dcea9933f7b21697ab6396
  oracle (ResilientOracle)    0x6592b5DE802159F3E74B2486b091D11a8256ab8A
  deviationBoundedOracle      0xc79Cb7efEBd121DC4B39eA141C214606595D665A
  comptrollerLens             0xd5DEb631cB6c6a667e926a482aadc95a471b120c
  liquidatorContract          0x0870793286aaDA55D39CE7f82fb2766e8004cF43
  vaiController               0x004065D34C6b18cE4370ced1CeBDE94865DbFAFE
  XVS                         0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63
  prime                       0x059EabA8676b03e4e8f009eFb7F587C28450F50f
facets()
  MarketFacet                 0x21f8E1471b153f49BE1d645A008E4a57434eEd23   31 selectors
  PolicyFacet                 0x8930B02c69EDd37464B50991680D306Bb9B8FDBD   18 selectors
  RewardFacet                 0x9e0CCD70b5E0030472D5013bbBd37B6E868d416f   12 selectors
  SetterFacet                 0xbc4885e5A27050E321d094503597aC6734AB1871   39 selectors
  FlashLoanFacet              0xAC54A4D148690b7FDA22B1D29c4439aCBF668fb2    1 selector
```

The read surface an agent actually needs, with selectors, because half of these are not in any published
Venus ABI for the core pool:

```solidity
// on the Diamond itself, not a facet, so they answer even though facets() does not list them
function closeFactorMantissa() external view returns (uint256);           // 0xe8755446
function oracle() external view returns (address);                        // 0x7dc0d1d0
function deviationBoundedOracle() external view returns (address);        // 0xd7c46d2d
function comptrollerLens() external view returns (address);               // 0xd3270f99
function lastPoolId() external view returns (uint96);                     // 0xa657e579
function userPoolId(address) external view returns (uint96);              // 0x73769099
function pools(uint96) external view returns (string, bool, bool);        // 0x96c99064
function venusSupplySpeeds(address) external view returns (uint256);      // 0x5dd3fc9d
function venusBorrowSpeeds(address) external view returns (uint256);      // 0xbbb8864a

// MarketFacet
function getAllMarkets() external view returns (address[]);               // 0xb0772d0b
function getAssetsIn(address) external view returns (address[]);          // 0xabfceffc
function markets(address) external view returns (bool, uint256, bool);    // 0x8e8f294b  isListed, CF, isVenus
function getCollateralFactor(address) external view returns (uint256);    // 0x23617585  core pool only
function getLiquidationThreshold(address) external view returns (uint256);// 0x7b86e42c  core pool only
function getLiquidationIncentive(address) external view returns (uint256);// 0xd686e9ee  core pool only
function getEffectiveLtvFactor(address account, address vToken, uint8 strategy)
    external view returns (uint256);                                      // 0x19ef3e8b  0 = CF, 1 = LT
function getEffectiveLiquidationIncentive(address, address)
    external view returns (uint256);                                      // 0xafd3783b
function poolMarkets(uint96, address) external view returns
    (bool isListed, uint256 cf, bool isVenus, uint256 lt, uint256 li, uint96 poolId, bool isBorrowAllowed);
                                                                          // 0x3093c11e
function getPoolVTokens(uint96) external view returns (address[]);        // 0x63e0d634  reverts on poolId 0
function isMarketListed(address) external view returns (bool);            // 0x3d98a1e5
function checkMembership(address, address) external view returns (bool);  // 0x929fe9a1
function liquidateCalculateSeizeTokens(address vTokenBorrowed, address vTokenCollateral, uint256 repay)
    external view returns (uint256 err, uint256 seizeTokens);             // 0xc488847b

// PolicyFacet
function getAccountLiquidity(address) external view
    returns (uint256 err, uint256 liquidity, uint256 shortfall);          // 0x5ec88c79  LIQUIDATION THRESHOLD
function getBorrowingPower(address) external view
    returns (uint256 err, uint256 liquidity, uint256 shortfall);          // 0x528a174c  COLLATERAL FACTOR
function getHypotheticalAccountLiquidity(address account, address vTokenModify,
    uint256 redeemTokens, uint256 borrowAmount) external view
    returns (uint256 err, uint256 liquidity, uint256 shortfall);          // 0x4e79238f  COLLATERAL FACTOR
function actionPaused(address, uint8) external view returns (bool);       // 0xe85a2960
```

The `Action` enum for `actionPaused` and `setActionsPaused`, from `ComptrollerStorage.sol`:
`0 MINT, 1 REDEEM, 2 BORROW, 3 REPAY, 4 SEIZE, 5 LIQUIDATE, 6 TRANSFER, 7 ENTER_MARKET, 8 EXIT_MARKET`.

### The exact Venus core liquidation formula

Venus does not publish a "health factor". It publishes liquidity and shortfall. The liquidation trigger
is `shortfall != 0` under the liquidation-threshold weighting. Source: `PolicyFacet.liquidateBorrowAllowed`
lines 261-273 calls `getHypotheticalAccountLiquidityInternalView(borrower, 0, 0, 0, WeightFunction.USE_LIQUIDATION_THRESHOLD)`
and reverts if `shortfall == 0`.

`ComptrollerLens._calculateAccountPosition` is the whole of it. Per entered market, all integer, all
truncating:

```
for each asset in getAssetsIn(account):
    (err, vTokenBalance, borrowBalance, exchangeRateMantissa) = asset.getAccountSnapshot(account)
    weightedFactor = getEffectiveLtvFactor(account, asset, strategy)     // CF for borrow, LT for liquidation
    skip if asset != vTokenModify and vTokenBalance == 0 and borrowBalance == 0

    // liquidation path: both prices are spot from ResilientOracle.getUnderlyingPrice(asset)
    // borrow path:      both prices come from DeviationBoundedOracle.getBoundedPricesView(asset)
    tokensToDenom = weightedFactor * exchangeRateMantissa / 1e18 * collateralPrice / 1e18
    sumCollateral        += tokensToDenom * vTokenBalance / 1e18
    sumBorrowPlusEffects += debtPrice     * borrowBalance / 1e18

    if asset == vTokenModify:
        sumBorrowPlusEffects += tokensToDenom * redeemTokens / 1e18
        sumBorrowPlusEffects += debtPrice     * borrowAmount / 1e18

sumBorrowPlusEffects += vaiController.getVAIRepayAmount(account)

liquidity = max(0, sumCollateral - sumBorrowPlusEffects)
shortfall = max(0, sumBorrowPlusEffects - sumCollateral)
```

Both sums are USD scaled by 1e18. `getUnderlyingPrice(vToken)` returns the USD price of one whole unit
of underlying scaled by `1e(36 - underlyingDecimals)`, which is why the products land at 1e18: vDOGE at
8 decimals returns `848920000000000000000000000` for $0.084892, vTRX at 6 decimals returns
`331851830000000000000000000000` for $0.33185183, vvhUSDT at 24 decimals returns `1001834094367` for
$1.001834. Verified across all 55 markets at block 120024776.

The health factor a UI would show is therefore a derived quantity, not a protocol one:

```
HF          = sumCollateral(LT) / sumBorrowPlusEffects        // liquidatable when HF < 1
borrowRatio = sumCollateral(CF) / sumBorrowPlusEffects        // cannot borrow more when this hits 1
```

Maximum repay in a single liquidation is `closeFactorMantissa * borrowBalance / 1e18`, so 50 percent of
the borrow in that one market. Seized collateral, from `ComptrollerLens._calculateSeizeTokens`:

```
seizeTokens = repayAmount
            * (getEffectiveLiquidationIncentive(borrower, vTokenCollateral) * priceBorrowed)
            / (priceCollateral * exchangeRateCollateral)
```

`isForcedLiquidationEnabled(vToken)` (selector `0x8c1ac18a`) bypasses the shortfall requirement entirely
for a market. It returned `false` for vUSDT at block 120025747. A monitoring agent has to poll it,
because a governance flip makes an otherwise healthy position liquidatable.

### Worked example, a real Venus account, block 120026311

Account `0x61486edf787168addd1eb791bd7496977094d607`, found from a `Borrow` event on vUSDT over a
60,000-block scan. Eleven entered markets, one debt. Every read pinned to block 120026311, which matters:
the same script run without pinning was off by 2.9e16 wei because BSC moved 6 blocks under it.

| market | vToken balance | exchangeRateStored | underlying | price USD | CF | LT | collateral at CF | collateral at LT | debt |
|---|---|---|---|---|---|---|---|---|---|
| vSOL | 98435570 | 10113979111271087910490967570 | 0.995575 | 101.9806 | 0.650 | 0.720 | 65.9941 | 73.1012 | 0 |
| vUSDC | 0 | 266433260669075760739549193 | 0 | 0.9998 | 0.825 | 0.825 | 0 | 0 | 825.2090 |
| vXRP | 5339 | 206281067760335282613317159 | 0.000001 | 1.3979 | 0.500 | 0.650 | 0.0000 | 0.0000 | 0 |
| vCAKE | 9063951949 | 278545794719073518270115732 | 2.524726 | 1.9617 | 0.500 | 0.550 | 2.4763 | 2.7240 | 0 |
| vBNB | 2494502451 | 249454415322050737325925777 | 0.622265 | 721.9845 | 0.800 | 0.800 | 359.4123 | 359.4123 | 0 |
| vBTC | 57592955 | 203823480031733268353576727 | 0.011739 | 79600.2400 | 0.800 | 0.800 | 747.5288 | 747.5288 | 0 |
| vLINK | 8294344989 | 203900181926231880012710311 | 1.691218 | 11.6460 | **0.000** | **0.630** | 0.0000 | 12.4084 | 0 |
| vWBNB | 15445596 | 10057091327222875490786246676 | 0.155338 | 721.9845 | 0.800 | 0.800 | 89.7212 | 89.7212 | 0 |
| vETH | 413445847 | 210413611302208782196922966 | 0.086995 | 2453.0447 | 0.800 | 0.800 | 170.7214 | 170.7214 | 0 |
| vNVDAB | 43632426 | 10000000015465916399494281559 | 0.436324 | 230.3500 | 0.600 | 0.700 | 60.3044 | 70.3551 | 0 |
| vXAUM | 2841730 | 10000027194919808220677995234 | 0.028417 | 4450.1860 | 0.650 | 0.650 | 82.2007 | 82.2007 | 0 |
| **total** | | | | | | | **1578.3592** | **1608.1731** | **825.2090** |

`getVAIRepayAmount(account)` returned 0, so no VAI leg.

```
sumCollateral(CF)      = 1578359224759365354291
sumCollateral(LT)      = 1608173057197108996576
sumBorrowPlusEffects   =  825209043629765036744

getBorrowingPower(account)    -> (0,  753150181129600317547, 0)
local  sumCollateral(CF) - sumBorrow =  753150181129600317547   exact match
getAccountLiquidity(account)  -> (0,  782964013567343959832, 0)
local  sumCollateral(LT) - sumBorrow =  782964013567343959832   exact match

health factor        = 1608173057197108996576 / 825209043629765036744 = 1.948807
borrow-power ratio   = 1578359224759365354291 / 825209043629765036744 = 1.912678
```

Two things a builder should take from this. The on-chain gap between the two liquidity answers is
$29.81 on $825 of debt, which is 3.9 percent of collateral value. It comes entirely from vSOL, vLINK
and vNVDAB where LT exceeds CF. And vLINK contributes $12.41 of seizable collateral while contributing
exactly nothing to borrow capacity, because Venus set its collateral factor to 0 while leaving the
liquidation threshold at 0.63. Any agent that models a market as "CF 0 means ignore it" understates the
account's distance to liquidation.

### Venus E-Mode pools, all 15, block 120026645

`enterPool(uint96)` (selector `0xf9682732`) switches an account's whole risk parameter set. `userPoolId(account)`
reads it back. Fallback to core-pool values happens only when the vToken is **not listed** in the pool, per
`MarketFacet.getLiquidationParams` lines 740-755, so a market listed in the pool with `cf = 0, lt = 0`
really does become useless as collateral there.

| pool | label | fallback | market | CF | LT | LIF | borrowable |
|---|---|---|---|---|---|---|---|
| 1 | Stablecoins | yes | vUSDe | 0.900 | 0.925 | 1.060 | yes |
| 1 | Stablecoins | yes | vsUSDe | 0.915 | 0.925 | 1.060 | no |
| 1 | Stablecoins | yes | vUSDT, vUSDC, vU | 0 | 0 | 1.000 | yes |
| 2 | BTC | yes | vSolvBTC | 0.830 | 0.850 | 1.040 | no |
| 2 | BTC | yes | vxSolvBTC | 0.810 | 0.830 | 1.040 | no |
| 2 | BTC | yes | vBTC | 0 | 0 | 1.000 | yes |
| 3 | BNB | yes | vslisBNB | 0.900 | 0.930 | 1.040 | no |
| 3 | BNB | yes | vasBNB | 0.890 | 0.920 | 1.040 | no |
| 3 | BNB | yes | vPT-clisBNB-25JUN2026 | 0.870 | 0.900 | 1.040 | no |
| 3 | BNB | yes | vWBNB | 0 | 0 | 1.000 | yes |
| 4 | LINK | no | vLINK | 0.600 | 0.630 | 1.100 | yes |
| 5 | UNI | no | vUNI | 0.500 | 0.550 | 1.100 | yes |
| 6 | AAVE | no | vAAVE | 0.500 | 0.550 | 1.100 | yes |
| 7 | DOGE | no | vDOGE | 0.400 | 0.430 | 1.100 | yes |
| 8 | BCH | no | vBCH | 0.500 | 0.600 | 1.100 | yes |
| 9 | TWT | no | vTWT | 0.300 | 0.500 | 1.100 | yes |
| 10 | ADA | no | vADA | 0.500 | 0.630 | 1.100 | yes |
| 11 | LTC | no | vLTC | 0.500 | 0.630 | 1.100 | yes |
| 12 | FIL | no | vFIL | 0 | 0 | 1.100 | no |
| 13 | TRX | no | vTRX | 0 | 0.525 | 1.100 | yes |
| 14 | DOT | no | vDOT | 0 | 0 | 1.100 | yes |
| 15 | THE | no | vTHE | 0 | 0 | 1.100 | no |

Pools 4 through 15 all carry vUSDT at 0.800 / 0.800 and vUSDC at 0.825 / 0.825 alongside the named asset,
with LIF 1.100. Full values in `raw/venus-emode-pools-bsc-2026-09-05.json`.

The E-Mode liquidation incentive is the sharpest difference. Inside pool 1 a stablecoin liquidation costs
the borrower 6 percent, in the core pool it costs 10 percent. An agent quoting "10 percent penalty on
Venus" is wrong for any account with `userPoolId != 0`. `getEffectiveLiquidationIncentive(account, vToken)`
is the correct read because it accounts for the pool.

### Venus core markets where CF and LT diverge, block 120024776

| market | vToken | CF | LT |
|---|---|---|---|
| vXVS | `0x151B1e2635A717bcDc836ECd6FbB62B674FE3E1D` | 0.450 | 0.600 |
| vLTC | `0x57A5297F2cB2c0AaC9D554660acd6D385Ab50c6B` | 0 | 0.630 |
| vXRP | `0xB248a295732e0225acd3337607cc01068e3b9c10` | 0.500 | 0.650 |
| vBCH | `0x5F0388EBc2B94FA8E123F404b79cCF5f40b29176` | 0 | 0.600 |
| vLINK | `0x650b940a1033B8A1b1873f78730FcFC73ec11f1f` | 0 | 0.630 |
| vDAI | `0x334b3eCB4DCa3593BCCC3c7EBD1A1C1d1780FBF1` | 0 | 0.750 |
| vADA | `0x9A0AF7FDb2065Ce470D72664DE73cAE409dA28Ec` | 0 | 0.630 |
| vDOGE | `0xec3422Ef92B2fb59e84c8B02Ba73F1fE84Ed8D71` | 0 | 0.430 |
| vAAVE | `0x26DA28954763B92139ED49283625ceCAf52C6f94` | 0 | 0.550 |
| vTRX | `0xC5D3466aA484B040eE977073fcF337f2c00071c1` | 0 | 0.525 |
| vUNI | `0x27FF564707786720C71A2e5c1490A63266683612` | 0 | 0.550 |
| vFDUSD | `0xC4eF4229FEc74Ccfe17B2bdeF7715fAC740BA0ba` | 0.650 | 0.750 |
| vTWT | `0x4d41a36D04D97785bcEA57b057C412b278e6Edcc` | 0 | 0.500 |
| vSOL | `0xBf515bA4D1b52FFdCeaBF20d31D705Ce789F2cEC` | 0.650 | 0.720 |
| vlisUSD | `0x689E0daB47Ab16bcae87Ec18491692BF621Dc6Ab` | 0.500 | 0.550 |
| vUSDe | `0x74ca6930108F775CC667894EEa33843e691680d7` | 0.700 | 0.750 |
| vasBNB | `0xCC1dB43a06d97f736C7B045AedD03C6707c09BDF` | 0.600 | 0.720 |
| vslisBNB | `0x89c910Eb8c90df818b4649b508Ba22130Dc73Adc` | 0.720 | 0.800 |
| vTSLAB | `0x97421799419Eb782628e73e7220d8E0A207469a3` | 0.600 | 0.700 |
| vNVDAB | `0xEb8Ca841cBe1BC4832A10b15c7dAB1081eDaD371` | 0.600 | 0.700 |
| vSPCXB | `0xC36dFaCc7a125859C106F29b9F2d874CCF29A55A` | 0.500 | 0.650 |
| vSKHYB | `0x3E281461efb3D53EC20DB207674373Ed8Ef3BbA9` | 0.500 | 0.650 |

All 55 rows with underlying, decimals, rates, caps and prices are in
`raw/venus-core-markets-bsc-2026-09-05.json`.

### Venus isolated pools, BSC

Nine comptrollers total, eight isolated plus core. From `api.venus.io/pools?chainId=56`, comptroller
addresses cross-checked by calling `poolRegistry()` on one of them:

```
Core Pool          0xfD36E2c2a6789Db23113685031d7F16329158384   51 listed markets
BTC                0x9DF11376Cf28867E2B0741348044780FbB7cb1d6    1
DeFi               0x3344417c9360b963ca93A4e8305361AEde340Ab9    8
GameFi             0x1b43ea8622e76627B81665B1eCeBB4867566B963    4
Liquid Staked BNB  0xd933909A4a2b7A4638903028f44D1d38ce27c352    7
Liquid Staked ETH  0xBE609449Eb4D76AD8545f957bBE04b596E8fC529    3
Meme               0x33B6fa34cd23e5aeeD1B112d5988B026b8A5567d    2
Stablecoins        0x94c1495cD4c557f1560Cbd68EAB0d197e6291571    4
Tron               0x23b4404E4E5eC5FF5a6FFb70B7d14E3FabF237B0    5
PoolRegistry       0x9F7b01A536aFA00EF10310A162877fd792cD0666
```

Isolated-pool comptrollers are a different codebase with a different ABI. Verified live on
`0xd933909A4a2b7A4638903028f44D1d38ce27c352`:

```solidity
function markets(address) external view returns (bool isListed, uint256 cf, uint256 lt);  // 3 fields, not core's 3-with-isVenus
function closeFactorMantissa() external view returns (uint256);            // 0.5e18
function liquidationIncentiveMantissa() external view returns (uint256);   // 1.025e18. this one EXISTS
function minLiquidatableCollateral() external view returns (uint256);      // 100e18, i.e. $100
function getAccountLiquidity(address) external view returns (uint256, uint256, uint256);
function getBorrowingPower(address) external view returns (uint256, uint256, uint256);
function poolRegistry() external view returns (address);
function oracle() external view returns (address);                        // same ResilientOracle as core
```

`minLiquidatableCollateral` is the trap. Below $100 of collateral the isolated pools require a full
liquidation through `healAccount`, not a close-factor-limited partial. A pre-liquidation agent that plans
a 50 percent repay on a small isolated position plans the wrong transaction.

### Venus rates and the exact APY Venus itself publishes

The primitive is per block, scaled 1e18. `blocksOrSecondsPerYear()` and `isTimeBased()` revert on core
vTokens, so core markets are block-based.

```
vUSDT 0xfD5840Cd36d94D7229439859C0112a4185BC0255 at pinned block 120027349
  accrualBlockNumber      120027348
  getCash()               60909823966739486010032567
  totalBorrows()         132762597708236475307087403
  totalReserves()            234589538791683408213
  reserveFactorMantissa()    100000000000000000        0.10
  borrowRatePerBlock()              640468528
  supplyRatePerBlock()              395137991
  interestRateModel()     0x2CF0e211c99dFd28892cf80D142aA27a9042Dbf4
```

The identity, reproduced exactly in integer math at that block:

```
U            = totalBorrows * 1e18 / (cash + totalBorrows - totalReserves)  = 685501618514119207
rateToPool   = borrowRatePerBlock * (1e18 - reserveFactorMantissa) / 1e18   = 576421675
supplyRate   = U * rateToPool / 1e18                                        = 395137991   == on-chain
```

The IRM answers `getBorrowRate(cash, borrows, reserves)` (selector `0x15f24053`) and
`utilizationRate(cash, borrows, reserves)` (`0x6e71e2d8`) directly. Its parameter getters all revert
because it is a thin delegating wrapper, 965 bytes of code.

Annualisation is where every naive integration goes wrong. Venus's own repo pins `bscmainnet: 70_080_000`
blocks per year in `helpers/chains.ts`, which is 0.45 s per block. That constant is confirmed independently
on-chain: deprecated markets carry `borrowRatePerBlock() = 42808219178` and `3e18 / 70080000 = 42808219178.08`,
so Venus set those to exactly 300 percent per year using that divisor.

Venus's published APY, the number on their site and in their API, uses the Compound v2 doc snippet with
its off-by-one exponent:

```
blocksPerDay = 70080000 / 365 = 192000
apyPct       = ((1 + ratePerBlock / 1e18 * 192000) ^ 364 - 1) * 100      // note 364, not 365
```

Checked against `api.venus.io/markets/core-pool?chainId=56` for vUSDT:

| field | Venus API | formula with exponent 364 | formula with exponent 365 |
|---|---|---|---|
| borrowApy | 4.576778294855006699 | 4.576778294859141 | 4.589636092267435 |
| supplyApy | 2.79903177062582485 | 2.799031770621974 | 2.806828341561762 |

Exponent 364 matches to 4e-12. Exponent 365 is 0.013 percentage points off on borrow. If a marketplace
shows a Venus APY that has to reconcile against venus.io, use 364. If it shows a mathematically honest
annualisation, use 365 and say so.

### Lista Lending, the Moolah singleton

Lista Lending is a Morpho-Blue-shaped singleton with Lista's own broker, whitelist and flash-loan
additions. Source is public at `github.com/lista-dao/moolah`, branch `master`.

```
Moolah                     0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C   (proxy, 134 bytes)
InterestRateModel          0xFe7dAe87Ebb11a7BEB9F534BB23267992d9cDe7c
InterestRateModel (Alpha)  0x5F9f9173B405C6CEAfa7f98d09e4B8447e9797E6
Liquidator                 0x6a87C15598929B2db22cF68a9a0dDE5Bf297a59a
PublicLiquidator           0x882475d622c687b079f149B69a15683FCbeCC6D9
OracleAdaptor              0x21650E416dC6C89486B2E654c86cC2c36c597b58
MarketFactory              0xce26859127d236a61f168d2d0905f77d7E286Ab2
PositionManager            0x8eBFa9e687aF71EC2e87A0380F73b9f57FDf3ec0
MoolahVaultFactory         0x2a0Cb6401FD3c6196750dc6b46702040761D9671
LiquidationVault           0xEe3aa1AF4Ee231f2e1277A48fc4A2f29A3D7C028
```

```solidity
struct MarketParams { address loanToken; address collateralToken; address oracle; address irm; uint256 lltv; }

function idToMarketParams(bytes32 id) external view
    returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv);  // 0x2c3c9157
function market(bytes32 id) external view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares,
    uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee);           // 0x5c60e39a
function position(bytes32 id, address user) external view
    returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral);                         // 0x93c52062
function isHealthy(MarketParams calldata p, bytes32 id, address borrower) external view returns (bool);// 0x2c2c904f
function getPrice(MarketParams calldata p) external view returns (uint256);                            // 0x15a45656
function brokers(bytes32 id) external view returns (address);                                          // 0x2b9a878a
function isLltvEnabled(uint256 lltv) external view returns (bool);
function flashLoan(address token, uint256 assets, bytes calldata data) external;
// on the IRM
function borrowRateView(MarketParams calldata p, Market calldata m) external view returns (uint256);   // 0x8c00bf6b
function rateAtTarget(bytes32 id) external view returns (int256);
```

`market()` returns six `uint128` fields packed one per word, so a plain 6 x uint256 decode works.
`lastUpdate` is a unix timestamp, not a block number, because Moolah accrues per second.

Constants, from `src/moolah/libraries/ConstantsLib.sol`:

```
ORACLE_PRICE_SCALE                 = 1e36
LIQUIDATION_CURSOR                 = 0.3e18
MAX_LIQUIDATION_INCENTIVE_FACTOR   = 1.15e18
MAX_FEE                            = 0.25e18
DEFAULT_FEE                        = 0.05e18
```

The health check, from `Moolah._isHealthy` lines 771-796, exactly:

```
borrowed = position.borrowShares.toAssetsUp(market.totalBorrowAssets, market.totalBorrowShares)
         = ceil(borrowShares * totalBorrowAssets / totalBorrowShares)

collateralPrice = 10^(36 + loanTokenDecimals - collateralTokenDecimals)
                * oracle.peek(collateralToken) / oracle.peek(loanToken)          // floor

maxBorrow = floor(floor(collateral * collateralPrice / 1e36) * lltv / 1e18)

healthy   = borrowShares == 0 || maxBorrow >= borrowed
LTV       = borrowed * 1e36 / (collateral * collateralPrice)                      // liquidatable when LTV > lltv
HF        = maxBorrow / borrowed                                                  // liquidatable when HF < 1
```

Liquidation incentive factor, from `Moolah.liquidate` lines 542-545:

```
LIF = min(1.15e18,  1e18 * 1e18 / (1e18 - 0.3e18 * (1e18 - lltv) / 1e18))
```

Lista's own docs write it as `min(M, 1/(beta*LLTV + (1-beta)))` with beta 0.3 and M 1.15, which is the
same algebra since `1 - 0.3*(1-LLTV) = 0.7 + 0.3*LLTV`. The docs then add "Lista DAO sets a minimum LIF
of 1.048". That floor is not in `Moolah.liquidate` and the on-chain arithmetic contradicts it: lltv 0.86
yields LIF 1.043841336116910229. Either the floor lives in an off-path contract I did not find or the doc
is stale. Do not quote 1.048 as a guaranteed minimum.

Given a repaid amount the seizure is:

```
seizedAssets = repaidShares.toAssetsDown(totalBorrowAssets, totalBorrowShares)
             * LIF / 1e18 * 1e36 / collateralPrice
```

and the reverse direction, given a target seizure, divides by LIF and rounds shares up.

One branch to respect. If `brokers(id) != address(0)` the market is a broker market and `_isHealthy`
throws away the passed price and the Moolah-side debt, substituting `IBroker.getUserTotalDebt(borrower)`
and a broker-specific price via `IBroker.peek(token, user)`. A monitoring agent must call `brokers(id)`
first and, on a hit, stop trying to reconstruct health from `market()` and `position()` alone. All three
markets I sampled returned the zero address, so they are plain markets.

### Worked example, three real Lista Lending positions, block 120028155

Found from `Borrow` events on Moolah over 60,000 blocks. Local recompute matched on-chain `isHealthy` on
all three.

| market id | collateral | loan | lltv | collateral units | borrowed | collateral value in loan units | maxBorrow | LTV | HF | LIF |
|---|---|---|---|---|---|---|---|---|---|---|
| `0xae82d976…e94d14` | BTCB | U | 0.86 | 2.10002813 | 88225.280341761124245359 | 167030.065615074327529350 | 143645.856428963921675241 | 0.528199 | 1.628171 | 1.043841336116910229 |
| `0xe31f39b6…b7655e` | TSMB | U | 0.65 | 79.14 | 15006.874825610623993259 | 33857.303508205676217090 | 22007.247280333689541108 | 0.443238 | 1.466477 | 1.117318435754189944 |
| `0x717ccd0f…ef4ac5` | USDT | NVDAB | 0.70 | 20800 | 47.505263407565750244 | 90.343403951505092344 | 63.240382766053564640 | 0.525829 | 1.331228 | 1.098901098901098901 |

Token addresses: BTCB `0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c`, U `0xce24439f2d9c6a2289f741120fe202248b666666`,
TSMB `0xab78b89b5bb00236be0b4b20704cbfa04efc711c`, NVDAB `0x02fca66c1d1afb4e2a7884261eb00f63598a7436`,
USDT `0x55d398326f99059fF775485246999027B3197955`. All six are 18 decimals, verified with `decimals()`, so
the scale factor collapsed to 1e36 in all three of these markets. It will not always: the formula is
`10^(36 + loanDecimals - collateralDecimals)`, BSC has 6-decimal and 8-decimal BEP-20s in wide use and a
health monitor that hardcodes 1e36 breaks silently the first time Lista lists one. Read both `decimals()`.

The returned `collateralPrice` values look alarming until you divide: `79537061065498359552617111354501761222894 / 1e36`
is 79537.06 U per BTCB, `427815308418065153109555506525496890250 / 1e36` is 427.82 U per TSMB and
`4343432882283898670417789820724705 / 1e36` is 0.004343 NVDAB per USDT, which is NVDAB at $230.2.

The market ids in Lista's own delayed-liquidation table do not all match on-chain state. That table lists
BTCB/USDT market `0xea00a233…2bf810` with "Original LLTV 80%", while `idToMarketParams` on that id returns
`lltv = 860000000000000000`. Read lltv from chain, never from the docs table.

Full JSON, including the `market()` and `position()` structs, in
`raw/lista-moolah-positions-2026-09-05.json`.

### Lista Lending interest rate model

`0xFe7dAe87Ebb11a7BEB9F534BB23267992d9cDe7c` is Morpho's AdaptiveCurveIRM with Lista's constants, from
`src/interest-rate-model/libraries/ConstantsLib.sol`:

```
CURVE_STEEPNESS        = 4e18
ADJUSTMENT_SPEED       = 50e18 / 365 days          per second
TARGET_UTILIZATION     = 0.9e18
INITIAL_RATE_AT_TARGET = 0.04e18 / 365 days        4 percent per year at target
MIN_RATE_AT_TARGET     = 0.001e18 / 365 days
MAX_RATE_AT_TARGET     = 2.0e18   / 365 days
DEFAULT_RATE_CAP       = 0.3e18   / 365 days       30 percent per year
```

`borrowRateView(marketParams, market)` returns a per-second rate scaled 1e18. Measured at block 120028155:

| market | borrowRatePerSecond | simple APR | continuous APY |
|---|---|---|---|
| BTCB / U | 723399528 | 2.2813 % | 2.3075 % |
| `0xab78…711c` / U | 1156308086 | 3.6465 % | 3.7138 % |
| USDT / NVDAB | 2691953079 | 8.4891 % | 8.8600 % |

Moolah accrues with `MathLib.wTaylorCompounded(rate, elapsedSeconds)`, the first three terms of
`e^(rate*n) - 1`, so continuous compounding is the honest annualisation:
`APY = exp(ratePerSecond / 1e18 * 31536000) - 1`. There is no reserve factor in the Compound sense. The
supply side gets `borrowRate * utilization * (1 - fee)` where `fee` is the market's `fee` field, 0.1e18 on
all three markets sampled.

### Lista CDP, the lisUSD side

A MakerDAO fork, unmodified in its core accounting. Addresses from
`docs.bsc.lista.org/for-developer/collateral-debt-position/smart-contract.md`, every one below read live.

```
Vat            0x33A34eAB3ee892D40420507B820347b1cA2201c4    live() = 1, debt() = 2.47e52 rad, Line() = 0
Spotter        0x49bc2c4E5B035341b7d92Da4e6B267F7426F3038    par() = 1e27
Jug            0x787BdEaa29A253e40feB35026c3d05C18CbCA7B3    base() = 0
Dog            0xd57E7b53a1572d27A04d9c1De2c4D423f1926d0B
Interaction    0xB68443Ee3e828baD1526b3e0Bdf2Dfc6b1975ec4    the user-facing wrapper
lisUSD         0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5
HayJoin        0x4C798F81de7736620Cd8e6510158b1fE758e22F7
Abaci          0xc1359eD77E6B0CBF9a8130a4C28FBbB87B9501b7
cdpLiquidator  0x556D96dFB7BDcf14B73E663CB46669f7826c7B87
LisUSDPoolSet  0x37DB1AE9B24055D1F9fE973Aea40B7EB2995D0Bf
```

`Vat.Line()` is 0, so the global ceiling is enforced per ilk only.

Live ilk parameters, read 2026-09-05. Ilk ids are `bytes32` ASCII and note that the slisBNB ilk is named
`SnBNB` (`0x536e424e42…`), not `slisBNB`. I got that from `GemJoin.ilk()`, not by guessing.

| ilk | Art (wad) | rate (ray) | spot | mat (ray) | max LTV | duty (ray/s) | stability fee | chop | clipper |
|---|---|---|---|---|---|---|---|---|---|
| SnBNB | 1.178630481547868984671980e24 | 1.236216978980219668164511435e27 | 6.00042547976e29 | 1.25e27 | 80.0 % | 1000000001253679800000000000 | 4.035532 % | 1.1e18 | `0xbA92899eA8bEbB717cFc60507251Acbb79a3b959` |
| BTCB | 6.65321807190122390944332e23 | 1.194609605247148067220318786e27 | 6.3734150624648e31 | 1.25e27 | 80.0 % | 1000000001253679800000000000 | 4.035532 % | 1.1e18 | `0xb12fF6FD1885a9Cb2b26302c98092644604B1e92` |
| wBETH | 1.114629944674737113187e21 | 1.241794466841067786882546700e27 | 2.171212889168e30 | 1.25e27 | 80.0 % | 1000000001405717500000000000 | 4.535878 % | 1.1e18 | `0x96b64bFcDBE658f2792322Ac7a9D2Dc215eBA48F` |
| USDT | 1.5389527710122027659e19 | 1.151401751202642134388809168e27 | 9.09290909090909090909090909e26 | 1.1e27 | 90.9 % | 1000000001405717500000000000 | 4.535878 % | 1.1e18 | `0xf6dAdF1210F7C22aD5bCba84b23cFd424a30313C` |
| USD1 | 0 | 1.064574257883994164722189715e27 | 9.09290909090909090909090909e26 | 1.1e27 | 90.9 % | 1000000001253679800000000000 | 4.035532 % | 1.1e18 | `0xdeB93441fAc0737321199E84a5F0420931A6562e` |
| FDUSD | 4.2337217844738913233e19 | 1.149853335539453343481882554e27 | 9.08031081818181818181818181e26 | 1.1e27 | 90.9 % | 1000000001405717500000000000 | 4.535878 % | 1.1e18 | `0xFe288198707d65e84390b59a844705d5C989525E` |
| solvBTC | 1.088935263053237088167e21 | 1.203636403829951514946875006e27 | 5.313331611174e31 | 1.5e27 | 66.7 % | 1000000001405717500000000000 | 4.535878 % | 1.1e18 | `0xf920018fc69515102b915a543DFEfbC837c3F9e6` |
| ceABNBc | 1.6047860069881198292404559e25 | 1.222941196086769728832166472e27 | 6.0012700425e29 | 1.2e27 | 83.3 % | 1000000001253679800000000000 | 4.035532 % | 1.1e18 | `0x2dcFb02CE33955b6Cc0aF34033189DE3ac4C0292` |

`Dog.ilks(ilk).hole` is 5e51 rad on all of them except ceABNBc at 5e52 and `dirt` is 0 everywhere, so no
ilk is currently at its auction-throughput limit.

Raw output in `raw/lista-cdp-ilks-2026-09-05.txt`.

### The exact Lista CDP liquidation trigger

Two conditions, both from the Maker fork. Solvency on any user action, in `Vat.frob`:

```
tab  = urn.art * ilk.rate                 // rad, 1e45
ok   = (dart <= 0 && dink >= 0) || tab <= urn.ink * ilk.spot
```

Liquidation eligibility, in `Dog.bark`:

```
liquidatable  iff  urn.ink * ilk.spot  <  urn.art * ilk.rate
```

so the health factor is

```
HF = (ink * spot) / (art * rate)          both sides rad, liquidatable when HF < 1
```

with `spot` set by `Spotter.poke(ilk)`:

```
spot = price_wad * 1e9 / par / mat        // rdiv twice, par = 1e27
```

`Interaction` exposes the whole per-user surface, verified live on slisBNB and BTCB:

```solidity
function collateralPrice(address token) external view returns (uint256);   // live oracle, wad
function collateralRate(address token) external view returns (uint256);    // 1e45 / mat, so 8e17 = 80% max LTV
function locked(address token, address usr) external view returns (uint256);        // = vat.urns().ink
function borrowed(address token, address usr) external view returns (uint256);      // = art*rate/1e27 + 100 wei
function free(address token, address usr) external view returns (uint256);          // = vat.gem()
function availableToBorrow(address token, address usr) external view returns (int256);
function willBorrow(address token, address usr, int256 amount) external view returns (int256);
function currentLiquidationPrice(address token, address usr) external view returns (uint256);
function estimatedLiquidationPrice(address token, address usr, int256 dInk) external view returns (uint256);
function estimatedLiquidationPriceHAY(address token, address usr, int256 dArt) external view returns (uint256);
function borrowApr(address token) external view returns (uint256);         // 20-decimal percent, 10% == 10e18
function poke(address token) external;                                    // permissionless spot refresh
function startAuction(address token, address user, address keeper) external returns (uint256);
```

The liquidation price is worth spelling out because it is the single most useful number for a monitoring
agent and Lista computes it as:

```
liquidationPrice = (art * rate / 1e36) * mat / ink
```

Live reads at 2026-09-05:

```
Interaction.collateralPrice(slisBNB) = 748339124260000000000        748.33912426
Interaction.collateralRate(slisBNB)  = 800000000000000000           80.0 % max LTV
Interaction.borrowApr(slisBNB)       = 4035532478367910700          4.035532478367910700 %
Interaction.depositTVL(slisBNB)      = 136018019001935174535914538  136,018,019 USD of collateral
Interaction.collateralTVL(slisBNB)   = 1457043013233108138082553    1,457,043 lisUSD of debt
Interaction.hayPrice(slisBNB)        = 1236216978980219668          rate/1e9, the debt accrual index
```

`borrowApr` is `rpow(base + duty, YEAR, RAY) - RAY` divided by 1e7, with `YEAR = 31556952` seconds
(365.2425 days), from `Interaction.sol` line 26. Recomputing that in Python Decimal from
`duty = 1000000001253679800000000000` gives `4035532478367910700`, matching the chain to the wei.

The stale-spot gap is the thing an agent has to get right. `Vat.ilks(SnBNB).spot` implies a slisBNB price of
`6.00042547976e29 * 1.25e27 / 1e27 / 1e9 = 750.05318497`, while `Interaction.collateralPrice(slisBNB)` returns
`748.33912426` from the live pip. The stored spot is 0.229 percent above live. Liquidation eligibility is
evaluated against the stored spot, so a position can be underwater against live prices and still not be
liquidatable until somebody calls `poke`. `poke` is permissionless. A pre-liquidation agent should treat
"live price crossed my liquidation price" as the alarm and "spot poked" as the deadline.

### Aave v3 on BSC, worth surfacing as the third venue

Small but real and the only BSC money market that returns a literal health factor from one call.

```
PoolAddressesProvider  0xff75B6da14FfbbfD355Daf7a2731456b3562Ba6D
Pool                   0x6807dc923806fE8Fd134338EABCA509979a7e0cB   POOL_REVISION() = 11
PoolDataProvider       0xc90Df74A7c16245c5F5C5870327Ceb38Fe5d5328   from getPoolDataProvider()
AaveOracle             0x39bc1bfDa2130d6Bb6DBEfd366939b4c7aa7C697   from getPriceOracle()
```

`getReservesList()` returns exactly 8 reserves: CAKE `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82`,
WBNB `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`, BTCB `0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c`,
ETH `0x2170Ed0880ac9A755fd29B2688956BD959F933F8`, USDC `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`,
USDT `0x55d398326f99059fF775485246999027B3197955`, FDUSD `0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409`,
wstETH `0x26c5e01524d2E6280A48F2c50fF6De7e52E9611C`.

```solidity
// Pool
function getUserAccountData(address user) external view returns (
    uint256 totalCollateralBase,       // 8 decimals, USD
    uint256 totalDebtBase,
    uint256 availableBorrowsBase,
    uint256 currentLiquidationThreshold,  // basis points
    uint256 ltv,                          // basis points
    uint256 healthFactor);                // 1e18, becomes 2^256-1 when totalDebtBase == 0

// PoolDataProvider
function getReserveConfigurationData(address asset) external view returns (
    uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus,
    uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled,
    bool stableBorrowRateEnabled, bool isActive, bool isFrozen);
function getReserveData(address asset) external view returns (
    uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken,
    uint256 totalStableDebt, uint256 totalVariableDebt,
    uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate,
    uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex,
    uint40 lastUpdateTimestamp);
```

Verified reads:

| asset | ltv bp | liqThreshold bp | liqBonus bp | reserveFactor bp | active | frozen |
|---|---|---|---|---|---|---|
| USDT | 7500 | 7800 | 10500 | 1000 | true | false |
| WBNB | 7000 | 7500 | 11000 | 2000 | true | false |
| BTCB | 7000 | 7500 | 11000 | 2000 | true | false |

USDT reserve at 2026-09-05: `totalAToken` 59,221,403.17 USDT, `totalVariableDebt` 47,527,210.72,
`liquidityRate` 27694252071144894942202953 ray, `variableBorrowRate` 38343040142926238937422684 ray.
Aave rates are already annual and in ray, so supply APR is 2.7694 percent and borrow APR is 3.8343 percent
with no annualisation step at all. Aave's health factor is
`totalCollateralBase * currentLiquidationThreshold / totalDebtBase / 1e4`, computed inside the contract.

Three protocols, three rate units. Venus per block, Moolah per second, Aave per year in ray. Any yield agent
needs a unit tag on every rate it stores. Without one it will publish nonsense.

### Other BSC lending markets worth surfacing and why

| market | why it belongs on the marketplace | status |
|---|---|---|
| Venus core, 8 isolated pools, 15 E-Mode pools | largest BSC money market by a wide margin, 6,259 vUSDT borrowers alone and the only one with a rich enough parameter surface to make a health-factor agent look serious | verified above |
| Lista Lending (Moolah) | the newest and the most agent-friendly, `isHealthy` in one call, permissionless flash loans on the same singleton for atomic self-liquidation. It is BNB Chain native so a BNB Chain jury will recognise it | verified above |
| Lista CDP | a genuinely different risk shape, one collateral against one stablecoin with a poked price and a Dutch auction, so an agent that handles both Venus and Lista CDP demonstrates real breadth rather than one integration twice | verified above |
| Aave v3 BSC | the reference implementation of "health factor" that judges will already know. Costs one call | verified above |
| Kinza Finance | an Aave v3 fork on BNB Chain with asset isolation and protected collateral, Binance Labs backed, so its per-reserve config reads identically to Aave and integration is nearly free | addresses unverified, docs page 403s |
| Avalon Labs | BTC-collateral lending plus the USDa CDP, the biggest BTCFi surface on BSC, which gives a health-factor agent a BTC-denominated position type nothing else covers | addresses unverified, no address index in docs |
| Euler on BNB Chain | Lista's own looping guide routes through Euler vaults for USDC liquidity on BNB Chain, so it is part of real user flows | mentioned in a Lista blog post I read, deployment addresses not verified |

Only add a venue if a live read backs every number the agent shows. Two verified venues beat five guessed
ones under a Data Quality criterion.

## Where a real, checkable APY on BSC comes from

Measured means the number is recomputed from state or events the agent read itself. Advertised means a
protocol or an aggregator computed it and the agent copied it. Both are legitimate. Labelling them the
same is not.

| source | the call or endpoint that returns it | how often it moves | measured or advertised |
|---|---|---|---|
| Venus supply and borrow rate, any of 55 core markets | `vToken.supplyRatePerBlock()` and `borrowRatePerBlock()`, 1e18 per block; annualise with 70,080,000 | recomputed by the IRM on every mint, redeem, borrow, repay or liquidate in that market, so effectively every block on vUSDT and vBNB | measured |
| Venus rate for a hypothetical utilisation | `interestRateModel.getBorrowRate(cash, borrows, reserves)` selector `0x15f24053` | pure function, does not move | measured. Lets an agent price its own deposit before making it |
| Venus displayed APY, to reconcile with venus.io | `GET https://api.venus.io/markets/core-pool?chainId=56&limit=20&page=N`, fields `supplyApy`, `borrowApy`, `totalSupplyApyDecimal` | API cache, refreshed within seconds in my two back-to-back pulls | advertised, but exactly reproducible with the 364 formula above |
| Venus XVS emissions | `comptroller.venusSupplySpeeds(vToken)` `0x5dd3fc9d` and `venusBorrowSpeeds(vToken)` `0xbbb8864a`, XVS per block; price XVS with `ResilientOracle.getPrice(0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63)` | only on a governance VIP | measured |
| Venus pending rewards for an account | `comptroller.venusAccrued(account)` plus the per-market `venusSupplyState` and `venusBorrowState` indexes | per block | measured |
| Venus Prime boost | `api.venus.io` `estimatedPrimeSupplyApyBoost`, Prime at `0x059EabA8676b03e4e8f009eFb7F587C28450F50f` | governance and per-account stake | advertised, units unresolved, see the open list |
| Lista Lending borrow rate | `irm.borrowRateView(marketParams, market)` `0x8c00bf6b`, 1e18 per second; annualise `exp(r*31536000)-1` | continuously, the adaptive curve drifts every second toward the target utilisation | measured |
| Lista Lending supply rate | no getter, compute `borrowRate * totalBorrowAssets / totalSupplyAssets * (1e18 - fee) / 1e18` | same | measured |
| Lista Lending rate at target | `irm.rateAtTarget(id)` | on each `borrowRate` write | measured |
| Lista CDP stability fee, the cost of a lisUSD loan | `Interaction.borrowApr(token)` or `rpow(Jug.base() + Jug.ilks(ilk).duty, 31556952, 1e27) - 1e27` | only on a governance `Jug.file` | measured |
| lisUSD savings side | `LisUSDPoolSet` `0x37DB1AE9B24055D1F9fE973Aea40B7EB2995D0Bf` and `EarnPool` `0x66dE07893Db7492B56bA88503B4cC99bAb1796F3` | not read this pass | unverified |
| PancakeSwap v2 and v3 pool fee APR | `GET https://explorer.pancakeswap.com/api/cached/pools/v3/bsc/list/top` and the `v2` sibling, no auth needed, returns `feeUSD24h`, `feeUSD7d`, `protocolFeeUSD24h`, `tvlUSD`, `volumeUSD24h` per pool | the cache moved between two calls seconds apart | advertised |
| PancakeSwap fee APR, measured | sum `Swap` logs on the pool, topic `0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83`, seven non-indexed words: amount0, amount1, sqrtPriceX96, liquidity, tick, protocolFeesToken0, protocolFeesToken1 | every swap | measured |
| PancakeSwap protocol fee share | `pool.slot0()` field 6 `feeProtocol`, low 16 bits and high 16 bits, denominator 10000 | governance only | measured |
| PancakeSwap farm and gauge configuration | `GET https://configs.pancakeswap.com/api/data/cached/farms?chainId=56`, 316 KB, includes `infinityCl` pids | config deploys | advertised |
| slisBNB liquid staking rate | `ListaStakeManager.convertSnBnbToBnb(1e18)` at `0x1adB950d8bB3dA4bE104211D5AB038628e477fE6` | steps only when rewards are compounded, not per block | measured |
| asBNB rate | `minter.convertToTokens(1e18)` at `0x2F31ab8950c50080E77999fa456372f276952fD8`, denominated in slisBNB | same, on compound | measured |
| wBETH rate | `exchangeRate()` at `0xa2E3356610840701BDf5611a53974510Ae27E2e1` | Binance-operated, daily-ish | measured |
| LST implied yield | two rate reads separated by a known interval, `(r1/r0)^(31536000/dt) - 1` | needs archive access or a persisted first read | measured, but see the archive limitation |
| Any BSC token price for USD denomination | `ResilientOracle.getUnderlyingPrice(vToken)` at `0x6592b5DE802159F3E74B2486b091D11a8256ab8A`, scaled `1e(36-decimals)`. `getPrice(token)` also answers, returning 3110473967927833300 for XVS, but I only checked it on an 18-decimal token so treat its scaling as unconfirmed for others | per oracle push | measured, free, covers 55 assets |

### PancakeSwap fee APR, measured against advertised

Pool `0x172fcd41e0913e95784454622d1c3724f546f849`, USDT / WBNB, fee tier 100 (0.01 percent), the highest
fee-APR pool with real volume in the top list.

On-chain, blocks 120026880 to 120029880, a 1,350 second window, 6,583 Swap events:

```
sum of positive amount0 (USDT in)   =   966986.328262346813678822
sum of positive amount1 (WBNB in)   =     1279.826008691617679136
gross fee, amountIn * 100 / 1e6     =       96.698632826234681367 USDT + 0.127982600869161767 WBNB
protocolFeesToken deltas summed     =       31.910548832657443613 USDT + 0.042234258286822799 WBNB
implied protocol share              =        0.329999   both sides, matching slot0().feeProtocol = 3300
```

Pricing WBNB at the Venus oracle's 721.98 and scaling the window by 86400 / 1350 = 64:

| quantity | measured from logs | PancakeSwap explorer API |
|---|---|---|
| 24 h volume USD | 121,023,687 | 134,564,853 |
| 24 h gross fee USD | 12,102.4 | 13,456.49 |
| 24 h protocol fee USD | 3,993.8 | 4,441.00 |
| gross fee APR on tvlUSD 11,600,997 | 38.08 % | 42.34 % |
| net-of-protocol-fee APR | 25.51 % | 28.37 % |

The 10 percent gap is the 22-minute window against a 24-hour average, not an error. Two things matter more
than the gap. First, `feeUSD24h / tvlUSD * 365` is what most dashboards print. It overstates what an LP
actually earns by exactly `feeProtocol / 10000`, which is 33 percent on the 0.01 percent tier and 34.00
percent on the 0.05 percent tier (`slot0().feeProtocol` = 3400 on pool `0x46cf1cf8c69595804ba91dfdd8d6b960c9b0a7c4`).
Second, this is concentrated liquidity: `tvlUSD` counts out-of-range liquidity that earns nothing, so an
individual position's realised APR is the pool's in-range fee rate scaled by how much of the time that
position was in range. An agent that quotes pool fee APR as user yield is quoting an upper bound.

The v2 top-pool list is also unusable as-is. Its first entry at the time of capture was
`0xba92f7f626d23be1182266bced366db07cdd852a`, DNGR/WBNB, `tvlUSD` 274,817,640 with `volumeUSD24h` of exactly
0.00000000000000. Filter on volume before you rank on TVL.

### Liquid staking rates, cross-checked

| token | address | rate call | value | denominated in |
|---|---|---|---|---|
| slisBNB | `0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B` | `ListaStakeManager.convertSnBnbToBnb(1e18)` | 1.038016116636725181 | BNB |
| asBNB | `0x77734e70b6E88b4d82fE632a168EDf6e700912b6` | `minter.convertToTokens(1e18)` | 1.027512203878882689 | slisBNB |
| wBETH | `0xa2E3356610840701BDf5611a53974510Ae27E2e1` | `exchangeRate()` | 1.105797129294 | ETH |

The cross-check that gives confidence in all three. asBNB to BNB by composition is
`1.027512203878882689 * 1.038016116636725181 = 1.066576`. The Venus oracle, an entirely separate feed, prices
vasBNB underlying at 770.740703083171960126 and vWBNB underlying at 722.632033561252800000, a ratio of
1.066577. Two independent paths agree to six digits.

Supporting Lista staking state: `getTotalPooledBnb()` 938,413.51 BNB, `totalDelegated()` 937,461.49 BNB,
`amountToDelegate()` 952.03 BNB, `synFee()` 1500000000, `totalReserveAmount()` 100 BNB.

## Design implications for the marketplace

### The health factor agent

What it must read, per protocol and nothing less.

Venus core, per account, all pinned to one block:

1. `getAssetsIn(account)`. Skip nothing: a market with `vTokenBalance == 0 && borrowBalance == 0` is skipped
   by the protocol too, but you cannot know that without reading it.
2. `vToken.getAccountSnapshot(account)` per entered market. One call gives balance, borrow and exchange rate,
   which is three calls saved.
3. `getEffectiveLtvFactor(account, vToken, 1)` per market for the liquidation weight and `(…, 0)` for the
   borrow weight. Do not use `getCollateralFactor` or `getLiquidationThreshold`: those return core-pool
   values, which are wrong for any account with `userPoolId != 0`.
4. `ResilientOracle.getUnderlyingPrice(vToken)` per market.
5. `vaiController.getVAIRepayAmount(account)` once.
6. `getEffectiveLiquidationIncentive(account, vToken)` per collateral market, for the penalty estimate.
7. `actionPaused(vToken, action)` for REPAY and MINT before proposing a remedy and
   `isForcedLiquidationEnabled(vToken)` because it defeats the shortfall check.

Cross-check the result against `getAccountLiquidity` and `getBorrowingPower`. If your recompute does not
match to the wei at a pinned block, your model is wrong and the discrepancy is the alarm.

Lista Lending, per position: `brokers(id)` first, then `idToMarketParams(id)`, `market(id)`, `position(id, user)`,
`getPrice(marketParams)` and `isHealthy(marketParams, id, user)` as the cross-check. Six calls, one of which
is the authoritative answer.

Lista CDP, per user per ilk: `Vat.urns(ilk, usr)`, `Vat.ilks(ilk)`, `Spotter.ilks(ilk)` for `mat`,
`Interaction.collateralPrice(token)` for the live pip and `Interaction.currentLiquidationPrice(token, usr)`.
Compare live price against liquidation price, not stored spot against liquidation price or the agent
will miss the entire window in which it could have acted.

Aave: one `getUserAccountData(user)` call.

### Frequency

BSC blocks land every 0.45 s. Nothing about a health factor needs 0.45 s resolution. Polling that fast
burns a free RPC's rate limit in minutes. What actually changes, at what speed:

| input | changes | poll |
|---|---|---|
| oracle price | on oracle push. The only input that can move a healthy position to liquidatable in one step | every block for the small set of assets the watched accounts hold, via one `getUnderlyingPrice` batch |
| accrued debt | every block, but slowly: vUSDT borrows at 640468528 per block, so 6.40468528e-10 of the balance per block. Growing the debt by 1 percent takes 15.6 million blocks, about 81 days at 0.45 s | every few minutes is generous |
| collateral factor, liquidation threshold, liquidation incentive, close factor | governance only | once per hour or watch `NewCollateralFactor` and the SetterFacet events |
| pause flags and forced-liquidation flags | governance only, but they are step changes | once per hour or watch events |
| account composition | only when the user or the agent transacts | on the account's own `Mint`, `Redeem`, `Borrow`, `RepayBorrow`, `Transfer` events |
| Lista CDP `spot` | only on `poke` | watch `Vat` LogNote for the `file` selector or poll `Vat.ilks(ilk).spot` every minute |

The design that follows: one price watcher on a block subscription covering the union of assets across all
watched accounts, one slow parameter watcher and a per-account recompute triggered by either a price move
past a precomputed threshold or an account event. Precompute, per account, the price of each collateral
asset at which `HF` hits your alarm level, then the hot loop is a comparison, not a recompute. That is the
difference between an agent that scales to a thousand accounts on a free RPC and one that does not.

Pin every recompute to one block number. My first Venus run was unpinned and disagreed with the chain by
2.9e16 wei on both the CF and LT paths, an identical offset that made it look like a formula error when it
was six blocks of drift. Also budget for the archive limit: free public BSC RPC refused `eth_call` at tip
minus 1,000 with HTTP 403 and `eth_getLogs` above roughly 4,500 blocks, so historical work needs a paid
archive endpoint or a persisted local index.

### The pre-liquidation action set

Ordered by how little trust the user has to extend.

1. **Repay debt from a pre-funded allowance.** `vToken.repayBorrowBehalf(address borrower, uint256 amount)`
   selector `0x2608f818` on Venus, confirmed present on vUSDT by a static call that got past dispatch and
   failed inside `BEP20: transfer from the zero address`.
   `Moolah.repay(MarketParams, uint256 assets, uint256 shares, address onBehalf, bytes)` on Lista Lending.
   `Interaction.payback(address token, uint256 hayAmount)` on Lista CDP. This is the only action that both
   reduces debt and needs no collateral to move. Gate to check first: `Moolah.repay` reverts with `NOT_BROKER`
   if `brokers(id) != address(0)` and the caller is not that broker.
2. **Add collateral from a pre-funded allowance.** `vToken.mintBehalf(address receiver, uint256 amount)`
   selector `0x23323e03` on Venus, confirmed the same way.
   `Moolah.supplyCollateral(MarketParams, uint256 assets, address onBehalf, bytes)` on Lista Lending, which
   requires `isWhiteList(id, onBehalf)`.
   `Interaction.deposit(address participant, address token, uint256 dink)` on Lista CDP, which carries a
   `whitelisted(participant)` modifier and, for tokens with a registered helioProvider, requires the caller
   to be that provider unless `providerCompatibilityMode[token]` is set. Check all three gates before
   promising a user this remedy will work.
3. **Enter a friendlier E-Mode pool.** Venus only. `enterPool(uint96)` is a single call with no token
   movement. It can raise the liquidation threshold on the account's collateral, for example slisBNB
   from 0.800 in core to 0.930 in pool 3. `hasValidPoolBorrows(account, poolId)` (`0xf02fdf97`) checks
   eligibility first. This is the strongest zero-custody action available anywhere in the four
   protocols and no rival agent will be doing it.
4. **Deleverage: withdraw collateral, swap, repay.** Requires custody of collateral or an approval on the
   vToken, plus a swap route, plus slippage handling. Most powerful, most trust.
5. **Atomic self-liquidation via flash loan.** Lista Lending's `Moolah.flashLoan(address token, uint256 assets, bytes data)`
   is permissionless, fee-free and gated only by `flashLoanTokenBlacklist[token]`, per `Moolah.sol` lines
   647-658. Venus's core Comptroller Diamond also exposes `executeFlashLoan(address,address,address[],uint256[],bytes)`
   selector `0x5544ed9c` and the SetterFacet carries `setWhiteListFlashLoanAccount(address,bool)` and
   `setFlashLoanPaused(bool)`, so Venus flash loans are access-controlled in a way Lista's are not. Prefer
   Lista's for the demo. Flash-repay the debt, withdraw the freed collateral, swap, return the loan. No user
   capital is at risk in the transaction and the position simply gets smaller.

### What a safe action looks like under a scoped session rather than full custody

The Altana track gate asks for four things: a call allowlist, a spend cap, an expiry, registered on-chain,
plus a user who can see and revoke. Every action above fits inside that envelope. Ship the ones that fit
most tightly.

The rule that makes it safe: **the session should only ever be able to move value in the direction that
reduces risk.** Concretely, per protocol:

```
Venus repay session
  allowlist   vUSDT.repayBorrowBehalf(address,uint256)          selector 0x2608f818, target 0xfD5840Cd…0255
              USDT.approve(address,uint256)                     target 0x55d3983…7955, spender pinned to the vToken
  spend cap   denominated in USDT, sized to the worst-case repay the agent is authorised to make
  expiry      short, renewed on a schedule, because the cap is the real limit and the expiry is the backstop
  revoke      user removes the session, the allowance survives but nothing can call it
```

Three properties make this a genuinely safe delegation rather than security theatre.

**The allowlist is by selector, not by contract.** `vToken.repayBorrowBehalf` cannot move the user's
collateral. `vToken.redeem` and `redeemUnderlying` can. Allowing the contract and not the selector hands
over the collateral. The same distinction on Lista Lending: `supplyCollateral` and `repay` are safe,
`withdrawCollateral` and `borrow` are not.

**The `onBehalf` or `borrower` argument must be constrained to the user, not left free.** Otherwise a
session scoped to "repay" can be used to repay a stranger's loan with the user's money. If the session
mechanism cannot constrain calldata arguments, put a thin forwarder contract in between that hardcodes the
beneficiary and allowlist that forwarder instead.

**A repay session needs no collateral approval at all**, which is why it belongs first in the list. The
agent spends an asset the user deliberately parked for this purpose. The worst outcome of a fully
compromised repay session is that the user's debt gets repaid earlier than optimal.

Two actions that are safe in a stronger sense, because they cannot move any token:

- `Comptroller.enterPool(uint96)` on Venus. Changes the risk parameter set, moves nothing. Cap is irrelevant.
  The only harm a rogue session could do is move the account to a pool with worse parameters and
  `hasValidPoolBorrows` blocks the move if it would make the account unhealthy.
- `Interaction.poke(address token)` on Lista CDP and `Spotter.poke(bytes32)`. Permissionless refresh of the
  stored price. An agent that pokes before repaying makes its own health read authoritative.

What must never be inside a scoped session, whatever the cap says: `approve` with `type(uint256).max`,
any router `swapExactTokensFor*` with a free `path` and a zero `amountOutMin`, `exitMarket` or
`Vat.hope` / `Moolah.setAuthorization`, because the last two hand over the position wholesale rather than
authorising a single action on it. The one place a swap is defensible is inside a flash-loan callback that
the same transaction closes out, because the whole sequence either reverts or leaves the position provably
healthier and the session then authorises one call to the agent's own executor contract instead of a
router.

### The yield agent

Three rules, each of which came out of a discrepancy found above.

**Store a unit with every rate.** Venus per block, Lista Lending per second, Aave per year in ray, Lista CDP
as a per-second ray exponent. Store the raw integer, the unit and the source call, then derive the display
number. An agent that stores "4.58" has thrown away the only thing that made it checkable.

**Publish measured and advertised side by side, never blended.** For a Venus market, publish
`supplyRatePerBlock` with the 70,080,000 annualisation as measured and `api.venus.io` `supplyApy` as
advertised and show that they reconcile with the exponent-364 formula. For a PancakeSwap pool, publish the
Swap-log fee measurement as measured and `feeUSD24h / tvlUSD * 365` as advertised and subtract the protocol
fee from the advertised one before calling it LP yield. The gap is not embarrassing, it is the product.

**Say what a number excludes.** A Venus supply APY excludes XVS emissions and `venusSupplySpeeds` returned 0
for vUSDT so today that exclusion is worth nothing, but it will not always be. A PancakeSwap pool fee APR
excludes CAKE farm emissions and excludes the fact that concentrated liquidity out of range earns zero. An
LST rate excludes the exit queue. A total-yield number with no breakdown is a claim and a breakdown that
sums to it is evidence.

The composability worth surfacing, because it is the highest real yield on BSC and fully checkable:
slisBNB and asBNB are collateral in both Venus (LT 0.800 and 0.720 in core, 0.930 and 0.920 inside Venus
E-Mode pool 3) and Lista Lending (slisBNB/BNB markets at lltv 0.965 per the docs table, read on-chain before
quoting). A looped position earns the staking rate on the whole collateral stack while paying the borrow
rate on the BNB leg, so the net is `stakingRate * leverage - borrowRate * (leverage - 1)`. Every input
in that expression is one of the calls tabulated above. That is a yield agent and a health-factor agent
describing the same position from two sides, which is exactly the cross-category depth the rubric asks for.

### Grid trading and rebalancing: what a defensible track record is

TermiX scores 30 percent on proven agent advantage and 20 percent on high-stakes categories and track
record and requires an Agent Advantage Report to be eligible at all. "Win rate" with no window and no risk
measure is the single easiest claim to shoot down, so define it before building the schema.

A track record is defensible when a third party with only public data can reproduce it. That imposes four
requirements and each one kills a common shortcut:

1. **Every trade resolves to a BSC transaction hash.** Not a log line, not a database row. If a claimed
   trade has no `txHash`, `blockNumber` and `logIndex`, it did not happen as far as a judge is concerned.
   BSC blocks are 0.45 s, so `(blockNumber, transactionIndex, logIndex)` is the ordering key, never a
   wall-clock timestamp.
2. **The window is stated before the numbers, spanning the agent's whole life.** Win rate over "the last 30
   trades" is a selected sample. Win rate from `firstTradeBlock` to `asOfBlock` with the count of trades in
   that range is not. Publish both endpoints and the trade count.
3. **A benchmark is quoted over the identical window.** A grid bot that made 4 percent while BNB rose 30
   percent lost. The benchmark for a BNB/USDT grid is holding the same starting inventory, marked at the
   same oracle at the same two blocks. Anything else is not a comparison.
4. **The risk taken is stated in units a reader can check.** Realised volatility of the position value,
   maximum drawdown of the position value, peak notional exposure, peak leverage and the worst health
   factor the position ever reached if it borrowed. A 40 percent return at 3x leverage that touched HF 1.02
   is not the same product as 12 percent unlevered.

The minimum record per fill, all of it derivable from BSC logs:

```json
{
  "agentId": "56:705",
  "strategy": "grid",
  "market": "0x172fcd41e0913e95784454622d1c3724f546f849",
  "txHash": "0x…",
  "blockNumber": 120029880,
  "transactionIndex": 41,
  "logIndex": 7,
  "blockTimestamp": 1788575015,
  "side": "buy",
  "baseToken": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  "quoteToken": "0x55d398326f99059fF775485246999027B3197955",
  "baseDelta": "-1279826008691617679136",
  "quoteDelta": "966986328262346813678822",
  "executionPrice1e18": "721984497046957500000",
  "oraclePrice1e18": "722632033561252800000",
  "oracleSource": "0x6592b5DE802159F3E74B2486b091D11a8256ab8A",
  "gasUsed": "184213",
  "gasPriceWei": "1000000000",
  "protocolFeePaid": "0",
  "slippageBps": 9,
  "positionValueAfter1e18": "…",
  "healthFactorAfter1e18": null,
  "gridLevel": 7,
  "gridSpacingBps": 40,
  "inventoryBaseAfter": "…",
  "inventoryQuoteAfter": "…"
}
```

Four fields carry most of the credibility. `oraclePrice1e18` alongside `executionPrice1e18` is what turns
"we filled" into "we filled at a good price" and the Venus ResilientOracle gives an independent mark for
55 BSC assets for free. `gasUsed` times `gasPriceWei` is the cost that separates a grid strategy that works
on paper from one that works on BSC. `positionValueAfter` is what drawdown is computed from. And
`inventoryBaseAfter` with `inventoryQuoteAfter` is what makes the benchmark computable, because a grid bot's
P&L is inseparable from its inventory drift.

The derived metrics, defined so they cannot be gamed:

```
window                 = [firstBlock, asOfBlock], trades = n
grossPnlQuote          = sum(quoteDelta) + finalBaseInventory * markPrice(asOfBlock)
                                        - initialBaseInventory * markPrice(firstBlock)
netPnlQuote            = grossPnlQuote - sum(gasUsed * gasPriceWei * bnbPrice) - sum(protocolFeePaid)
benchmarkPnlQuote      = initialBaseInventory * (markPrice(asOfBlock) - markPrice(firstBlock))
excessReturn           = netPnlQuote - benchmarkPnlQuote

roundTrip              = a buy fill matched to the sell fill that closed that grid level, FIFO per level
winRate                = count(roundTrip.netPnl > 0) / count(roundTrip)     // per round trip, never per fill
avgWin, avgLoss        = mean netPnl of each side
profitFactor           = sum(wins) / abs(sum(losses))
maxDrawdown            = max over blocks of (peakPositionValue - positionValue) / peakPositionValue
realisedVol            = stdev of per-day log returns of positionValue, annualised by sqrt(365)
sharpeLike             = excessReturn annualised / realisedVol            // label it, it is not a real Sharpe
peakNotional           = max over fills of abs(inventoryBase) * markPrice + abs(inventoryQuote)
worstHealthFactor      = min over blocks of HF, null if the strategy never borrowed
```

Win rate must be per round trip, not per fill. A grid bot's individual fills are all "wins" by construction
because it only buys below and sells above its reference, so a per-fill win rate is meaningless and a judge
who trades will spot it in seconds.

For rebalancing, the same schema with `strategy: "rebalance"`, plus `targetWeights`, `weightsBefore`,
`weightsAfter`, `driftBps` at trigger and `rebalanceTriggerRule`. The benchmark is the identical basket
never rebalanced over the identical window, which is computable from two mark timestamps and the initial
weights. The honest headline for a rebalancer is excess return against buy-and-hold plus the reduction in
realised volatility. Report it even when it is negative, because a rebalancer that
underperforms in a trend while cutting volatility in half is still doing its job.

Two things this schema makes possible that a marketplace normally cannot do. Any visitor can re-derive every
published number from BSC alone, given the agent's address and the block range, which is the strongest
possible answer to a Data Quality criterion. And an agent that has never traded gets a record that says
`trades: 0` rather than a blank, which is a fact rather than a gap.

## Sources

### On-chain, every call run this session against chain 56

```
RPC used            https://bsc-rpc.publicnode.com   (fallbacks bsc-dataseed.binance.org, binance.llamarpc.com)
tools               cast 1.7.1 (commit 4072e487), node 22.22.2, python 3.11, jq
block range touched 120024187 to 120029880
```

| what | block or note |
|---|---|
| `cast chain-id`, `cast block-number` | 56, 120024187 at start |
| Venus Comptroller globals, `facets()`, storage slots 0-7 | 120024187 to 120025747 |
| `getAllMarkets()` and the 55-market scan (symbol, underlying, decimals, CF, LT, rates, caps, price) | 120024776 |
| Venus account `0x61486edf787168addd1eb791bd7496977094d607`, full position, pinned | 120026311 |
| Venus E-Mode pools 1-15, `pools()` and `poolMarkets()` | 120026645 |
| Venus vUSDT rate identity, pinned | 120027349 |
| Venus `Borrow` and `LiquidateBorrow` log scan across 7 markets, 60,000 blocks in 4,000-block chunks | tip 120025911 |
| Lista Moolah `Borrow` log scan, 60,000 blocks | tip ~120027000 |
| Lista Moolah three positions, pinned | 120028155 |
| Lista CDP 8 ilks: `Vat.ilks`, `Spotter.ilks`, `Jug.ilks`, `Dog.ilks` | ~120028500 |
| Lista `Interaction` view calls on slisBNB and BTCB | ~120028700 |
| Lista `ListaStakeManager`, asBNB minter, wBETH | ~120029000 |
| PancakeSwap v3 pool state and `slot0().feeProtocol` on two pools | ~120029400 |
| PancakeSwap Swap-log fee measurement, 3,000 blocks, 6,583 events | 120026880 to 120029880 |
| Aave v3 Pool, PoolDataProvider, reserve configs, `getUserAccountData` | ~120029500 |
| Venus isolated pool comptroller `0xd933909A…c352` | ~120029200 |
| BSC block-time measurement over 1,000 and 100,000 blocks | 119926948, 120025948, 120026948 |
| Archive limit test, `cast call --block N-1000` | 403 from publicnode |

### Primary source files read

```
https://raw.githubusercontent.com/VenusProtocol/venus-protocol/develop/contracts/Comptroller/Diamond/facets/PolicyFacet.sol
https://raw.githubusercontent.com/VenusProtocol/venus-protocol/develop/contracts/Comptroller/Diamond/facets/MarketFacet.sol
https://raw.githubusercontent.com/VenusProtocol/venus-protocol/develop/contracts/Comptroller/Diamond/facets/SetterFacet.sol
https://raw.githubusercontent.com/VenusProtocol/venus-protocol/develop/contracts/Comptroller/Diamond/facets/FacetBase.sol
https://raw.githubusercontent.com/VenusProtocol/venus-protocol/develop/contracts/Lens/ComptrollerLens.sol
https://raw.githubusercontent.com/VenusProtocol/venus-protocol/develop/contracts/Comptroller/ComptrollerStorage.sol
https://raw.githubusercontent.com/VenusProtocol/venus-protocol/develop/helpers/chains.ts
https://raw.githubusercontent.com/lista-dao/moolah/master/src/moolah/Moolah.sol
https://raw.githubusercontent.com/lista-dao/moolah/master/src/moolah/libraries/ConstantsLib.sol
https://raw.githubusercontent.com/lista-dao/moolah/master/src/moolah/libraries/MathLib.sol
https://raw.githubusercontent.com/lista-dao/moolah/master/src/moolah/libraries/SharesMathLib.sol
https://raw.githubusercontent.com/lista-dao/moolah/master/src/moolah/libraries/PriceLib.sol
https://raw.githubusercontent.com/lista-dao/moolah/master/src/moolah/libraries/MarketParamsLib.sol
https://raw.githubusercontent.com/lista-dao/moolah/master/src/moolah/libraries/EventsLib.sol
https://raw.githubusercontent.com/lista-dao/moolah/master/src/interest-rate-model/InterestRateModel.sol
https://raw.githubusercontent.com/lista-dao/moolah/master/src/interest-rate-model/libraries/ConstantsLib.sol
https://raw.githubusercontent.com/lista-dao/lista-dao-contracts/main/contracts/Interaction.sol
```

### Pages and endpoints read live

```
https://docs.bsc.lista.org/llms.txt
https://docs.bsc.lista.org/llms-full.txt
https://docs.bsc.lista.org/introduction/lista-lending/liquidation.md
https://docs.bsc.lista.org/introduction/lista-lending/interest-rate-model-irm.md
https://docs.bsc.lista.org/introduction/lista-lending/markets.md
https://docs.bsc.lista.org/introduction/lista-lending/oracle.md
https://docs.bsc.lista.org/for-developer/collateral-debt-position/smart-contract.md
https://docs.bsc.lista.org/for-developer/lista-lending/smart-contract/smart-contract-bsc-core.md
https://docs.bsc.lista.org/for-developer/lista-lending/smart-contract/smart-contract-bsc-oracles.md
https://docs.bsc.lista.org/for-developer/lista-lending/smart-contract/smart-contract-bsc-brokers.md
https://docs.bsc.lista.org/for-developer/liquid-staking-slisbnb/smart-contract.md
https://docs.bsc.lista.org/for-developer/clisbnb/smart-contract.md
https://api.venus.io/markets/core-pool?chainId=56&limit=20&page=0..2
https://api.venus.io/pools?chainId=56
https://explorer.pancakeswap.com/api/cached/pools/v3/bsc/list/top
https://explorer.pancakeswap.com/api/cached/pools/v2/bsc/list/top?pageSize=3
https://configs.pancakeswap.com/api/data/cached/farms?chainId=56
https://api.openchain.xyz/signature-database/v1/lookup            (102 Venus selectors resolved)
https://docs.kinza.finance/llms.txt                               (address page 403)
https://docs.avalonfinance.xyz/llms.txt                           (no address index)
gh api repos/lista-dao/moolah, orgs/lista-dao/repos, search/code
```

### Local raw captures written by this pass

```
raw/venus-core-markets-bsc-2026-09-05.json        all 55 core markets, block 120024776
raw/venus-emode-pools-bsc-2026-09-05.json         15 E-Mode pools with per-market cf, lt, li, borrowable
raw/venus-account-61486edf-2026-09-05.json        the worked example, pinned to 120026311
raw/venus-api-core-pool-56-2026-09-05.json        all 3 API pages merged, 55 markets
raw/venus-api-pools-56-2026-09-05.json            9 pools including the 8 isolated ones
raw/lista-moolah-positions-2026-09-05.json        3 real positions with local vs on-chain health
raw/lista-cdp-ilks-2026-09-05.txt                 8 ilks, vat + spot + jug + dog
raw/lista-docs-llms-full-2026-09-05.txt           343 KB of Lista docs
raw/pcs-explorer-v3-bsc-top-2026-09-05.json       31 top v3 pools with fee and tvl fields
raw/pcs-v3-usdt-wbnb-100-feemeasure-2026-09-05.json   the Swap-log fee measurement
tools/rpclib.mjs, tools/sigs.json                 selector table built with `cast sig`, RPC failover helper
tools/venus-scan.mjs                              market scanner
tools/venus-pools.mjs                             E-Mode pool enumerator
tools/venus-account.mjs                           pinned account position and local recompute
tools/venus-rate-pin.mjs                          rate identity check
tools/lista-lending.mjs                           Moolah position and health recompute
tools/pcs-fee-measure.mjs                         Swap-log fee measurement
```

### Local raw captures read by this pass

```
raw/pcs-apis-subgraph-2026-09-05.html             PancakeSwap subgraph index, read first, all The Graph
                                                  network endpoints need an API key so I used the
                                                  unauthenticated explorer API instead
```
