# Agent Advantage Report

Generated 2026-09-08T14:05:52.424Z against https://muster.zkasuran.dev. Rendered live at https://muster.zkasuran.dev/report from
`docs/research/agent-advantage-report.json`, which `tools/advantage-report.ts` produced. Nothing here was hand edited.

## Method

Operator ran both arms. The agent arm is the identical code the paid endpoint runs, on the identical inputs, timed round trip from a client. The control arm is one cast call at a time in the order a person would make them, timed wall clock, on the same machine. No independent grader and no first-time visitor were available before the close, so output quality is measured as numerical agreement between the two arms rather than by a blind rating.

## Summary

| Task | Category | Hired through Muster | By hand | Agreement |
| --- | --- | --- | --- | --- |
| T1 Is this Venus borrower close to liquidation? | security (liquidation risk) | 5.01 s, 1 call, 0.02 USD1 per call, quoted in the 402 | 18.78 s, 21 RPC calls, operator time only, no payment | agent 1.7671 vs manual 1.7671, 0.00% apart |
| T2 Where does USD earn the most on Venus right now? | yield | 28.58 s, 1 call, 0.02 USD1 per call, quoted in the 402 | 7.01 s, 6 RPC calls, operator time only, no payment | agent top USDT 2.84% vs manual top vUSDT 2.84%. The manual arm assumes 0.45s blocks; the agent measures block time from the chain |
| T3 Plan an 8-level grid on WBNB/USDT around the live price | trading | 0.66 s, 1 call, 0.05 USD1 per call, quoted in the 402 | 0.84 s, 1 RPC calls, operator time only, no payment | agent mark 746.65 vs manual 746.65; agent L0 671.99 vs manual 671.9843 |

At least one task is from trading or security, as the track requires: T1 is a liquidation risk check and T3 is a grid trading plan.

## T1. Is this Venus borrower close to liquidation?

Question: health factor of 0xed87331DcAe2ed002c42EdD102fEf91bd2BdB0bE

### hired through Muster, 5015 ms

```json
{
  "account": "0xed87331DcAe2ed002c42EdD102fEf91bd2BdB0bE",
  "healthFactor": 1.7670838359216596,
  "verdict": "comfortable",
  "totalCollateralUsd": 2833.1165333644626,
  "totalBorrowUsd": 1603.2722815818138,
  "liquidityUsd": 1229.8442517826486,
  "shortfallUsd": 0,
  "priceDropToLiquidationPct": 43.409589309132635,
  "markets": [
    {
      "symbol": "vXRP",
      "suppliedUsd": 4358.640820560711,
      "liquidationThreshold": 0.65,
      "weightedCollateralUsd": 2833.1165333644626,
      "borrowedUsd": 567.1333455042083,
      "collateralFactor": 0.5
    },
    {
      "symbol": "vUSDT",
      "suppliedUsd": 0,
      "liquidationThreshold": 0.8,
      "weightedCollateralUsd": 0,
      "borrowedUsd": 510.93021790833524,
      "collateralFactor": 0.8
    },
    {
      "symbol": "vUSDC",
      "suppliedUsd": 0,
      "liquidationThreshold": 0.825,
      "weightedCollateralUsd": 0,
      "borrowedUsd": 525.2087181692702,
      "collateralFactor": 0.825
    }
  ],
  "formula": "HF = sumCollateral(liquidationThreshold) / sumBorrowPlusEffects. Venus publishes liquidity and shortfall, never a health factor, so this is derived. Per entered market, collateral = liquidationThreshold * exchangeRateStored / 1e18 * oraclePrice / 1e18 * vTokenBalance / 1e18 and debt = oraclePrice * borrowBalance / 1e18, both USD scaled 1e18, all integer truncating. VAIController.getVAIRepayAmount is added to the debt side. Venus liquidates when shortfall is non-zero, which is exactly HF < 1.",
  "atBlock": 120699254,
  "readAt": 1788876334014
}
```

### by hand with cast, 18784 ms, 21 calls

```json
{
  "account": "0xed87331DcAe2ed002c42EdD102fEf91bd2BdB0bE",
  "healthFactor": 1.7670838297908695,
  "weightedCollateralUsd": 2833.12,
  "borrowUsd": 1603.27,
  "rows": [
    {
      "market": "vXRP",
      "suppliedUsd": 4358.64,
      "borrowedUsd": 567.13,
      "liquidationThreshold": 0.65
    },
    {
      "market": "vUSDT",
      "suppliedUsd": 0,
      "borrowedUsd": 510.93,
      "liquidationThreshold": 0.8
    },
    {
      "market": "vUSDC",
      "suppliedUsd": 0,
      "borrowedUsd": 525.21,
      "liquidationThreshold": 0.825
    }
  ],
  "comptrollerLiquidity": "0\n1229844248510615991862 [1.229e21]\n0"
}
```

## T2. Where does USD earn the most on Venus right now?

Question: rank Venus supply APYs

### hired through Muster, 28577 ms

```json
{
  "rows": [
    {
      "venue": "Venus",
      "asset": "USDT",
      "assetAddress": "0x55d398326f99059fF775485246999027B3197955",
      "kind": "supply",
      "apy": 2.8404863884296416,
      "tvlUsd": 194711330.70815915,
      "source": "Venus core 0xfD5840Cd36d94D7229439859C0112a4185BC0255.supplyRatePerBlock()=399819311 at block 120698681, compounded daily over 191936.0 blocks/day measured at 0.45015 s/block. TVL from getCash()+totalBorrows()-totalReserves() priced by ResilientOracle 0x6592b5DE802159F3E74B2486b091D11a8256ab8A",
      "readAt": 1788876072682,
      "atBlock": 120698681
    },
    {
      "venue": "Venus",
      "asset": "U",
      "assetAddress": "0xcE24439F2D9C6a2289F741120FE202248B666666",
      "kind": "supply",
      "apy": 2.3326794290732478,
      "tvlUsd": 28259549.046097502,
      "source": "Venus core 0x3d5E269787d562b74aCC55F18Bd26C5D09Fa245E.supplyRatePerBlock()=329156648 at block 120698681, compounded daily over 191936.0 blocks/day measured at 0.45015 s/block. TVL from getCash()+totalBorrows()-totalReserves() priced by ResilientOracle 0x6592b5DE802159F3E74B2486b091D11a8256ab8A",
      "readAt": 1788876072682,
      "atBlock": 120698681
    },
    {
      "venue": "Venus",
      "asset": "USDC",
      "assetAddress": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      "kind": "supply",
      "apy": 2.1385182308190753,
      "tvlUsd": 49902671.56041749,
      "source": "Venus core 0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8.supplyRatePerBlock()=302046157 at block 120698681, compounded daily over 191936.0 blocks/day measured at 0.45015 s/block. TVL from getCash()+totalBorrows()-totalReserves() priced by ResilientOracle 0x6592b5DE802159F3E74B2486b091D11a8256ab8A",
      "readAt": 1788876072682,
      "atBlock": 120698681
    },
    {
      "venue": "Venus",
      "asset": "ETH",
      "assetAddress": "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
      "kind": "supply",
      "apy": 0.4448675397549007,
      "tvlUsd": 46587653.48220113,
      "source": "Venus core 0xf508fCD89b8bd15579dc79A6827cB4686A3592c8.supplyRatePerBlock()=63360672 at block 120698681, compounded daily over 191936.0 blocks/day measured at 0.45015 s/block. TVL from getCash()+totalBorrows()-totalReserves() priced by ResilientOracle 0x6592b5DE802159F3E74B2486b091D11a8256ab8A",
      "readAt": 1788876072682,
      "atBlock": 120698681
    },
    {
      "venue": "Venus",
      "asset": "BTCB",
      "assetAddress": "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      "kind": "supply",
      "apy": 0.18829914566738104,
      "tvlUsd": 463530668.0233607,
      "source": "Venus core 0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B.supplyRatePerBlock()=26852922 at block 120698681, compounded daily over 191936.0 blocks/day measured at 0.45015 s/block. TVL from getCash()+totalBorrows()-totalReserves() priced by ResilientOracle 0x6592b5DE802159F3E74B2486b091D11a8256ab8A",
      "readAt": 1788876072682,
      "atBlock": 120698681
    },
    {
      "venue": "Venus",
      "asset": "WBNB",
      "assetAddress": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "kind": "supply",
      "apy": 0.12668573749330392,
      "tvlUsd": 76107919.8850136,
      "source": "Venus core 0x6bCa74586218dB34cdB402295796b79663d816e9.supplyRatePerBlock()=18071915 at block 120698681, compounded daily over 191936.0 blocks/day measured at 0.45015 s/block. TVL from getCash()+totalBorrows()-totalReserves() priced by ResilientOracle 0x6592b5DE802159F3E74B2486b091D11a8256ab8A",
      "readAt": 1788876072682,
      "atBlock": 120698681
    },
    {
      "venue": "Venus",
      "asset": "Cake",
      "assetAddress": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      "kind": "supply",
      "apy": 0.015125782474512128,
      "tvlUsd": 28950025.109455343,
      "source": "Venus core 0x86aC3974e2BD0d60825230fa6F355fF11409df5c.supplyRatePerBlock()=2158916 at block 120698681, compounded daily over 191936.0 blocks/day measured at 0.45015 s/block. TVL from getCash()+totalBorrows()-totalReserves() priced by ResilientOracle 0x6592b5DE802159F3E74B2486b091D11a8256ab8A",
      "readAt": 1788876072682,
      "atBlock": 120698681
    }
  ],
  "note": "APY is derived from the per-block supply rate compounded at the measured BSC block time. It is the rate at the block shown and not a forecast.",
  "count": 7,
  "readAt": 1788876099876
}
```

### by hand with cast, 7014 ms, 6 calls

```json
{
  "assumedBlockTimeSeconds": 0.45,
  "ranked": [
    {
      "market": "vUSDT",
      "apy": 2.8414
    },
    {
      "market": "vUSDC",
      "apy": 2.1392
    },
    {
      "market": "vETH",
      "apy": 0.445
    },
    {
      "market": "vBTC",
      "apy": 0.1884
    },
    {
      "market": "vBNB",
      "apy": 0.076
    }
  ]
}
```

## T3. Plan an 8-level grid on WBNB/USDT around the live price

Question: grid ladder, 10% each side, 1000 USDT

### hired through Muster, 656 ms

```json
{
  "plan": {
    "pair": "WBNB/USDT",
    "markPrice": 746.6514112979634,
    "lower": 671.986270168167,
    "upper": 821.3165524277598,
    "levelCount": 8,
    "spacingPct": 2.9082102407559596,
    "levels": [
      {
        "index": 0,
        "price": 671.986270168167,
        "side": "buy",
        "sizeBase": 0.18601570530409542,
        "notionalQuote": 125
      },
      {
        "index": 1,
        "price": 691.5290436936717,
        "side": "buy",
        "sizeBase": 0.1807588576935773,
        "notionalQuote": 125
      },
      {
        "index": 2,
        "price": 711.6401621601727,
        "side": "buy",
        "sizeBase": 0.17565056983372668,
        "notionalQuote": 125
      },
      {
        "index": 3,
        "price": 732.3361542334472,
        "side": "buy",
        "sizeBase": 0.17068664339102624,
        "notionalQuote": 125
      },
      {
        "index": 4,
        "price": 753.6340292676226,
        "side": "sell",
        "sizeBase": 0.16586299867785204,
        "notionalQuote": 125
      },
      {
        "index": 5,
        "price": 775.5512912846054,
        "side": "sell",
        "sizeBase": 0.16117567129951244,
        "notionalQuote": 125
      },
      {
        "index": 6,
        "price": 798.1059533600595,
        "side": "sell",
        "sizeBase": 0.15662080889604288,
        "notionalQuote": 125
      },
      {
        "index": 7,
        "price": 821.3165524277598,
        "side": "sell",
        "sizeBase": 0.15219466797607806,
        "notionalQuote": 125
      }
    ],
    "capitalRequiredQuote": 500,
    "capitalRequiredBase": 0.6358541468494854,
    "breakoutRule": "Above 821.317 USDT every sell has filled, the plan holds only USDT and nothing fills again until price comes back inside the band. Below 671.986 USDT every buy has filled while no sell did, so the plan holds 1.34897 WBNB in all: the 0.635854 the sell side started with plus 0.713112 bought at an average of 701.152 USDT, down on paper for as long as price stays under the band. It never buys above 821.317 or sells below 671.986, so a breakout stops the earning rather than forcing a loss. Recentre the grid on the new mark or hold the inventory until price comes back.",
    "expectedFillsPerCycle": 14,
    "warnings": [],
    "readAt": 1788876107449,
    "atBlock": 120698760
  },
  "readAt": 1788876107547
}
```

### by hand with cast, 845 ms, 1 calls

```json
{
  "pool": "0x172fcD41E0913e95784454622d1c3724f546f849",
  "markPrice": 746.6493,
  "lower": 671.9843,
  "upper": 821.3142,
  "levels": [
    671.9843,
    691.527,
    711.6381,
    732.334,
    753.6319,
    775.5491,
    798.1036,
    821.3142
  ],
  "capitalPerBuyLevel": 250
}
```

## What this does and does not show

On T1 and T3 the agent arm is faster because one call replaces a chain of reads a person has to sequence and price by hand. Its outputs carry the block they were read at. On T2 the hired arm was slower than the control. That is a real result and it is kept: the agent walks every Venus market, 55 of them, then ranks, while the control read five markets the operator already knew to pick. The agent also measures the block time it compounds with, where the control assumed 0.45 seconds. A cold process paid the full walk. A second call within the freshness window answers from the cache in under a second, which the status page shows. Coverage cost time here. The report says so rather than picking the faster framing. The manual arm is what a competent operator with cast can do in the time shown. It needs the operator to already know the contract addresses and the formula. Cost on the agent side is the quoted price in the 402. Settlement through Binance B402 is pending a merchant developer account, so the hired arm in this run was the identical code path minus the on-chain settle. No independent grader and no first-time visitor rated the outputs, so quality is reported as agreement between the two arms.
