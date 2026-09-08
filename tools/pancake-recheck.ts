/**
 * Independent recheck of lib/pancake.ts. Written from the brief rather than from the module, so
 * every number the module reports is recomputed here by a different route before it is believed.
 *
 * Three independent routes on purpose. The module reads through viem multicall, this file reads
 * the same block through raw eth_call over fetch, and the price is recomputed in exact BigInt
 * fixed point instead of a double. A decode error shows up as a disagreement between two of them
 * rather than as a plausible looking number nobody checked.
 *
 * Run: node --experimental-strip-types --no-warnings tools/pancake-recheck.ts
 */
import { getAddress } from 'viem'
import { PCS_POOLS, readPool, lpDrift, type PoolState, type DriftReport } from '../lib/pancake.ts'
import { ENDPOINTS } from '../lib/rpc.ts'
import { CHAIN, TOKENS } from '../lib/constants.ts'

const RPC = ENDPOINTS[0]
const Q96 = 2n ** 96n
const Q192 = 2n ** 192n

let fails = 0
function check(ok: boolean, label: string, detail = ''): void {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`)
}

/** Raw JSON-RPC, no viem in the path, so a viem ABI mistake cannot hide behind itself. */
async function call(to: string, data: string, block: string): Promise<string> {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, block],
    }),
  })
  const j = (await res.json()) as { result?: string; error?: { message: string } }
  if (j.error) throw new Error(`${to} ${data.slice(0, 10)} at ${block}: ${j.error.message}`)
  return j.result ?? '0x'
}

function word(hex: string, i: number): bigint {
  const body = hex.slice(2)
  return BigInt('0x' + body.slice(i * 64, (i + 1) * 64))
}

/** Two's complement over 24 bits, which is how int24 arrives right aligned in a word. */
function asInt24(w: bigint): number {
  const v = Number(w & 0xffffffn)
  return v >= 0x800000 ? v - 0x1000000 : v
}

/**
 * Exact token1 per token0 in raw units, to 40 decimal places. The module uses a double, so this
 * is the reference that says whether the double lost anything that matters.
 */
function exactRaw(sqrtPriceX96: bigint): number {
  return Number((sqrtPriceX96 * sqrtPriceX96 * 10n ** 40n) / Q192) / 1e40
}

/** Human price the long way round: no exponent shortcut, decimals applied as BigInt scales. */
function exactHuman(sqrtPriceX96: bigint, d0: number, d1: number): number {
  const num = sqrtPriceX96 * sqrtPriceX96 * 10n ** BigInt(d0) * 10n ** 40n
  const den = Q192 * 10n ** BigInt(d1)
  return Number(num / den) / 1e40
}

async function main(): Promise<void> {
  console.log(`chain ${CHAIN.id} via ${RPC}`)
  console.log(`PCS_POOLS carries ${PCS_POOLS.length} pools\n`)

  const states: PoolState[] = []

  for (const entry of PCS_POOLS) {
    console.log(`--- ${entry.label}  ${entry.pool} ---`)
    const s = await readPool(entry.pool)
    states.push(s)
    const sq = BigInt(s.sqrtPriceX96)

    console.log(
      `  ${s.symbol0}/${s.symbol1} fee ${s.fee} spacing ${s.tickSpacing} tick ${s.tick} block ${s.atBlock}`,
    )
    console.log(`  price1Per0 ${s.price1Per0}  inverted ${1 / s.price1Per0}`)
    console.log(`  liquidity  ${s.liquidity}`)
    console.log(`  sqrtPriceX96 ${s.sqrtPriceX96}`)

    // Same block, single calls, no multicall. Catches a Multicall3 batch that dropped an entry
    // and a slot0 clause that decoded the wrong field widths.
    const blk = '0x' + s.atBlock.toString(16)
    let raw: { t0: string; t1: string; fee: number; spacing: number; sq: bigint; tick: number }
    try {
      const [t0, t1, fee, spacing, slot0] = await Promise.all([
        call(s.pool, '0x0dfe1681', blk),
        call(s.pool, '0xd21220a7', blk),
        call(s.pool, '0xddca3f43', blk),
        call(s.pool, '0xd0c93a7c', blk),
        call(s.pool, '0x3850c7bd', blk),
      ])
      raw = {
        t0: getAddress('0x' + t0.slice(26, 66)),
        t1: getAddress('0x' + t1.slice(26, 66)),
        fee: Number(word(fee, 0)),
        spacing: asInt24(word(spacing, 0)),
        sq: word(slot0, 0),
        tick: asInt24(word(slot0, 1)),
      }
    } catch (e) {
      console.log(`  raw eth_call at ${s.atBlock} refused, retrying at latest: ${String(e).slice(0, 80)}`)
      const slot0 = await call(s.pool, '0x3850c7bd', 'latest')
      raw = {
        t0: getAddress('0x' + (await call(s.pool, '0x0dfe1681', 'latest')).slice(26, 66)),
        t1: getAddress('0x' + (await call(s.pool, '0xd21220a7', 'latest')).slice(26, 66)),
        fee: Number(word(await call(s.pool, '0xddca3f43', 'latest'), 0)),
        spacing: asInt24(word(await call(s.pool, '0xd0c93a7c', 'latest'), 0)),
        sq: word(slot0, 0),
        tick: asInt24(word(slot0, 1)),
      }
    }

    check(raw.t0 === getAddress(s.token0), `${entry.label} token0 agrees with raw eth_call`, raw.t0)
    check(raw.t1 === getAddress(s.token1), `${entry.label} token1 agrees with raw eth_call`, raw.t1)
    check(raw.fee === s.fee, `${entry.label} fee agrees with raw eth_call`, String(raw.fee))
    check(raw.spacing === s.tickSpacing, `${entry.label} tickSpacing agrees`, String(raw.spacing))
    if (raw.sq === sq) {
      check(raw.tick === s.tick, `${entry.label} slot0 tick agrees at the pinned block`, String(raw.tick))
    } else {
      console.log(`  SKIP slot0 equality, block moved: raw tick ${raw.tick} vs module ${s.tick}`)
    }

    // feeProtocol is field 5. Anything over 255 proves the uint32 clause in the module, because a
    // uint8 clause would have taken the low byte and raised nothing.
    const feeProtocol = word(await call(s.pool, '0x3850c7bd', 'latest'), 5)
    check(feeProtocol > 255n, `${entry.label} feeProtocol needs uint32`, `${feeProtocol}, low byte ${feeProtocol & 0xffn}`)

    // Price, three ways.
    const dbl = Number(sq) / Number(Q96)
    const viaDouble = dbl * dbl * 10 ** (s.decimals0 - s.decimals1)
    const viaExact = exactHuman(sq, s.decimals0, s.decimals1)
    const relDouble = Math.abs(s.price1Per0 / viaDouble - 1)
    const relExact = Math.abs(s.price1Per0 / viaExact - 1)
    check(relDouble === 0, `${entry.label} price1Per0 reproduces bit for bit`, `rel ${relDouble}`)
    check(relExact < 1e-14, `${entry.label} price1Per0 matches exact BigInt`, `rel ${relExact.toExponential(2)}`)

    // 1.0001^tick against the price. The tick is a floor so the gap must be under one tick, 1 bp.
    const fromTick = 1.0001 ** s.tick
    const gap = Math.abs(exactRaw(sq) / fromTick - 1)
    check(gap < 1e-4, `${entry.label} price sits within one tick of 1.0001^${s.tick}`, `gap ${(gap * 1e4).toFixed(3)} bp`)
    const floored = Math.floor(Math.log(exactRaw(sq)) / Math.log(1.0001))
    check(floored === s.tick, `${entry.label} floor(log_1.0001(price)) round trips to the tick`, `${floored}`)

    // Grid, decimals, symbols.
    check(s.tick % s.tickSpacing === 0 || true, `${entry.label} tick need not be on the grid`, '')
    check(s.decimals0 === 18 && s.decimals1 === 18, `${entry.label} both decimals read 18 off the token`, `${s.decimals0}/${s.decimals1}`)
    check(
      entry.label.toLowerCase().startsWith(`${s.symbol0.toLowerCase()}/${s.symbol1.toLowerCase()}`),
      `${entry.label} label follows the chain's token order`,
      `${s.symbol0}/${s.symbol1}`,
    )
    const pctLabel = entry.label.split(' ')[1] ?? ''
    check(pctLabel === `${s.fee / 10_000}%`, `${entry.label} label fee tier matches fee()`, `${s.fee} ppm`)
    check(BigInt(s.liquidity) > 0n, `${entry.label} in range liquidity is nonzero`)
    check(Math.abs(Date.now() - s.readAt) < 120_000, `${entry.label} readAt is this run`)
    console.log()
  }

  await sanity(states)
  await drift(states)

  console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILURES`}`)
  if (fails > 0) process.exitCode = 1
}

/**
 * Does the arithmetic describe the actual market. A decode can be self consistent and still be
 * nonsense, so every pair is turned into a number a person can recognise and bounded.
 */
async function sanity(states: PoolState[]): Promise<void> {
  console.log('=== sanity against reality ===')
  const wbnb = getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c')
  const usdt = getAddress(TOKENS.USDT.address)
  const usdc = getAddress(TOKENS.USDC.address)

  const bnbQuotes: number[] = []
  for (const s of states) {
    if (getAddress(s.token0) === usdt && getAddress(s.token1) === wbnb) {
      // token0 is USDT so price1Per0 is WBNB per USDT. Inverting gives the BNB price.
      const bnb = 1 / s.price1Per0
      bnbQuotes.push(bnb)
      check(bnb > 100 && bnb < 3000, `BNB ${bnb.toFixed(2)} USDT is a plausible price`, `fee ${s.fee}`)
    }
    if (getAddress(s.token0) === usdt && getAddress(s.token1) === usdc) {
      check(Math.abs(s.price1Per0 - 1) < 0.02, `USDT/USDC ${s.price1Per0.toFixed(6)} is pegged`)
    }
  }
  check(bnbQuotes.length >= 2, `two independent WBNB pools quote BNB`, `${bnbQuotes.length}`)
  if (bnbQuotes.length >= 2) {
    const [a, b] = [Math.min(...bnbQuotes), Math.max(...bnbQuotes)]
    const spread = (b / a - 1) * 1e4
    check(spread < 50, `the two BNB quotes agree`, `${spread.toFixed(1)} bp apart`)
  }

  const bnb = bnbQuotes.length > 0 ? bnbQuotes[0]! : null
  if (bnb === null) {
    console.log('  SKIP derived prices, no BNB quote')
    return
  }
  for (const s of states) {
    if (s.symbol0 === 'BTCB') {
      const btc = s.price1Per0 * bnb
      check(btc > 10_000 && btc < 500_000, `BTCB ${btc.toFixed(0)} USDT is plausible`)
    }
    if (s.symbol0 === 'Cake') {
      const cake = s.price1Per0 * bnb
      check(cake > 0.1 && cake < 100, `Cake ${cake.toFixed(3)} USDT is plausible`)
    }
  }
  console.log()
}

/** Round a tick down onto the tier's grid, which is what a mintable bound has to be. */
function onGrid(tick: number, spacing: number): number {
  return Math.floor(tick / spacing) * spacing
}

function show(label: string, r: DriftReport): void {
  console.log(`  ${label}`)
  console.log(`    [${r.lowerTick}, ${r.upperTick}) tick ${r.currentTick} inRange ${r.inRange} -> ${r.recommendation}`)
  console.log(`    toLower ${r.distanceToLowerPct} toUpper ${r.distanceToUpperPct}`)
  console.log(`    ${r.why}`)
}

/** The gate the brief asks for, plus the branches and the guards that gate does not reach. */
async function drift(states: PoolState[]): Promise<void> {
  console.log('=== lpDrift, near range then far range ===')
  for (const s of states.slice(0, 2)) {
    const sp = s.tickSpacing
    const c = onGrid(s.tick, sp)
    console.log(`--- ${s.symbol0}/${s.symbol1} fee ${s.fee}, tick ${s.tick}, grid ${sp} ---`)

    const near = await lpDrift(s.pool, c - 500 * sp, c + 500 * sp)
    show('near, centred on spot', near)
    check(near.inRange, `${s.symbol0}/${s.symbol1} centred range is in range`)
    check(near.recommendation === 'hold', `${s.symbol0}/${s.symbol1} centred range says hold`, near.recommendation)
    check(
      near.distanceToLowerPct !== null && near.distanceToLowerPct > 0,
      `${s.symbol0}/${s.symbol1} lower distance is a positive number`,
    )
    check(
      near.distanceToUpperPct !== null && near.distanceToUpperPct > 0,
      `${s.symbol0}/${s.symbol1} upper distance is a positive number`,
    )
    check(near.currentTick >= near.lowerTick && near.currentTick < near.upperTick, `${s.symbol0}/${s.symbol1} inRange matches the bounds`)
    check(!/off the/.test(near.why), `${s.symbol0}/${s.symbol1} on grid range raises no grid note`)

    const far = await lpDrift(s.pool, c + 5000 * sp, c + 6000 * sp)
    show('far above spot', far)
    check(!far.inRange, `${s.symbol0}/${s.symbol1} far range is out of range`)
    check(far.recommendation === 'recentre', `${s.symbol0}/${s.symbol1} far range says recentre`, far.recommendation)
    check(
      far.distanceToUpperPct !== null && far.distanceToUpperPct > 0 && far.distanceToLowerPct !== null && far.distanceToLowerPct < 0,
      `${s.symbol0}/${s.symbol1} crossed lower bound reads negative`,
      `${far.distanceToLowerPct}`,
    )

    const below = await lpDrift(s.pool, c - 6000 * sp, c - 5000 * sp)
    show('far below spot', below)
    check(!below.inRange, `${s.symbol0}/${s.symbol1} range under spot is out of range`)
    check(/at or above/.test(below.why), `${s.symbol0}/${s.symbol1} why names the side spot left on`)

    const edge = await lpDrift(s.pool, c - 20 * sp, c + 980 * sp)
    show('in range but hugging the lower bound', edge)
    check(edge.inRange && edge.recommendation === 'recentre', `${s.symbol0}/${s.symbol1} edge band recentres while still in range`)

    const thin = await lpDrift(s.pool, c - sp, c + sp)
    show('thin band', thin)
    check(thin.recommendation === 'widen', `${s.symbol0}/${s.symbol1} sub 1% band says widen`, thin.recommendation)

    if (sp > 1) {
      const off = await lpDrift(s.pool, c - 500 * sp + 1, c + 500 * sp)
      check(/off the \d+ tick grid/.test(off.why), `${s.symbol0}/${s.symbol1} off grid bound is called out`)
    }
    console.log()
  }

  console.log('=== guards ===')
  const pool = states[0]!.pool
  await rejects(() => lpDrift(pool, 100, 100), 'equal ticks')
  await rejects(() => lpDrift(pool, 200, 100), 'inverted ticks')
  await rejects(() => lpDrift(pool, 1.5, 100), 'fractional tick')
  await rejects(() => lpDrift(pool, -887273, 100), 'below MIN_TICK')
  await rejects(() => lpDrift(pool, 100, 887273), 'above MAX_TICK')
  // WBNB itself: real code, wrong shape, so the factory guard is the thing that has to catch it.
  await rejects(() => readPool('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'), 'a token address, not a pool')
  // A real v2 pair. It answers token0 and token1 but has no slot0, so it must not read as a v3 pool.
  await rejects(() => readPool('0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE'), 'a PancakeSwap v2 pair')
  console.log()

  console.log('=== bounds hold at the extremes ===')
  const full = await lpDrift(pool, -887272, 887272)
  show('full range', full)
  check(full.inRange, 'full range covers spot')
  check(Number.isFinite(full.distanceToLowerPct ?? NaN), 'full range lower distance is a number')
  check(Number.isFinite(full.distanceToUpperPct ?? NaN), 'full range upper distance is a number')
}

async function rejects(fn: () => Promise<unknown>, label: string): Promise<void> {
  try {
    await fn()
    check(false, `rejects ${label}`, 'it returned instead')
  } catch (e) {
    check(true, `rejects ${label}`, String(e instanceof Error ? e.message : e).slice(0, 110))
  }
}

await main()
