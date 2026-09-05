// R11 census. The authoritative agent count on BSC, plus a log-based cross-check
// that id allocation is sequential and gapless.
//
// run: node tools/r11-census.mjs
// out: raw/r11-census-2026-09-05.json
//
// Count method: read the ERC-7201 storage slot that holds IdentityRegistryStorage._lastId.
// The registry assigns `agentId = $._lastId++` inside every register() overload, so
// _lastId IS the number of agents ever minted and the top live id is _lastId - 1.
// Slot: keccak256(abi.encode(uint256(keccak256("erc8004.identity.registry")) - 1)) & ~0xff
//     = 0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00
// Confirm with: cast index-erc7201 "erc8004.identity.registry"
//
// Log cross-check: free public BSC RPCs cap eth_getLogs at 5000 blocks and refuse
// anything older than roughly the last hour ("Archive requests require a personal
// token"), so a full-history log count is not reachable from a keyless endpoint.
// What IS reachable, and what this does: scan the most recent WINDOW blocks and show
// the Registered agentIds form one contiguous run whose top touches _lastId - 1, and
// that mint Transfers match Registered one for one.

import { writeFileSync } from 'node:fs'

const IDENTITY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
const SLOT_LASTID = '0xa040f782729de4970518741823ec1276cbcd41a0c7493f62d173341566a04e00'
const TOPIC_REGISTERED = '0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a'
const TOPIC_TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const ZERO32 = '0x' + '0'.repeat(64)
const WINDOW = 5000
const CHUNK = 1000

const RPCS = ['https://bsc-rpc.publicnode.com', 'https://bsc-dataseed.binance.org']
let rpcIdx = 0, rid = 1
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function rpc(method, params) {
  let last
  for (let t = 0; t < 5; t++) {
    const url = RPCS[rpcIdx % RPCS.length]
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: rid++, method, params }) })
      if (!r.ok) throw new Error('http ' + r.status)
      const j = await r.json()
      if (j.error) return { error: j.error.message }
      return { result: j.result }
    } catch (e) { last = e; rpcIdx++; await sleep(600 * (t + 1)) }
  }
  return { error: String(last) }
}

const hx = (n) => '0x' + Number(n).toString(16)
const u256 = (n) => BigInt(n).toString(16).padStart(64, '0')

async function lastId() {
  const r = await rpc('eth_getStorageAt', [IDENTITY, SLOT_LASTID, 'latest'])
  return r.error ? { error: r.error } : { raw: r.result, value: Number(BigInt(r.result)) }
}
async function ownerOf(id) {
  const r = await rpc('eth_call', [{ to: IDENTITY, data: '0x6352211e' + u256(id) }, 'latest'])
  if (r.error) return { id, revert: r.error }
  return { id, owner: '0x' + r.result.slice(-40) }
}

const out = { measuredAt: new Date().toISOString(), chainId: null, head: null, count: {}, boundary: [], logs: {} }

out.chainId = Number(BigInt((await rpc('eth_chainId', [])).result))
const bnHex = (await rpc('eth_blockNumber', [])).result
const head = Number(BigInt(bnHex))
const blk = (await rpc('eth_getBlockByNumber', [bnHex, false])).result
out.head = { block: head, blockHex: bnHex, hash: blk.hash,
  timestamp: Number(BigInt(blk.timestamp)),
  timestampIso: new Date(Number(BigInt(blk.timestamp)) * 1000).toISOString() }

const l0 = await lastId()
out.count.lastIdBefore = l0
out.count.topLiveId = l0.value - 1
out.count.totalMinted = l0.value

for (const id of [0, 1, l0.value - 2, l0.value - 1, l0.value, l0.value + 1]) {
  out.boundary.push(await ownerOf(id))
  await sleep(250)
}

// ---- log window
const from = head - WINDOW + 1
const reg = [], mints = []
const errors = []
for (let b = from; b <= head; b += CHUNK) {
  const hi = Math.min(b + CHUNK - 1, head)
  const r1 = await rpc('eth_getLogs', [{ address: IDENTITY, topics: [TOPIC_REGISTERED], fromBlock: hx(b), toBlock: hx(hi) }])
  if (r1.error) errors.push({ kind: 'Registered', from: b, to: hi, error: r1.error })
  else for (const l of r1.result) reg.push({ id: Number(BigInt(l.topics[1])), block: Number(BigInt(l.blockNumber)), tx: l.transactionHash, owner: '0x' + l.topics[2].slice(26) })
  await sleep(400)
  const r2 = await rpc('eth_getLogs', [{ address: IDENTITY, topics: [TOPIC_TRANSFER, ZERO32], fromBlock: hx(b), toBlock: hx(hi) }])
  if (r2.error) errors.push({ kind: 'MintTransfer', from: b, to: hi, error: r2.error })
  else for (const l of r2.result) mints.push(Number(BigInt(l.topics[3])))
  await sleep(400)
  process.stderr.write(`\r  logs ${hi - from + 1}/${WINDOW}  reg=${reg.length} mint=${mints.length}   `)
}
process.stderr.write('\n')

const ids = reg.map((r) => r.id).sort((a, b) => a - b)
const gaps = []
for (let i = 1; i < ids.length; i++) if (ids[i] !== ids[i - 1] + 1) gaps.push([ids[i - 1], ids[i]])

const l1 = await lastId()
out.count.lastIdAfter = l1

out.logs = {
  window: { fromBlock: from, toBlock: head, blocks: WINDOW },
  registeredCount: reg.length,
  mintTransferCount: mints.length,
  mintTransfersEqualRegistered: mints.length === reg.length &&
    JSON.stringify([...mints].sort((a, b) => a - b)) === JSON.stringify(ids),
  idMin: ids[0] ?? null,
  idMax: ids[ids.length - 1] ?? null,
  span: ids.length ? ids[ids.length - 1] - ids[0] + 1 : 0,
  contiguousNoGaps: gaps.length === 0 && ids.length === (ids.length ? ids[ids.length - 1] - ids[0] + 1 : 0),
  gaps,
  idMaxTouchesLastId: ids.length ? ids[ids.length - 1] === l1.value - 1 || ids[ids.length - 1] === l0.value - 1 : null,
  registrationsPerBlock: reg.length / WINDOW,
  errors,
  firstFew: reg.slice(0, 5),
  lastFew: reg.slice(-5),
}

writeFileSync('raw/r11-census-2026-09-05.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify({ head: out.head, count: out.count, logs: { ...out.logs, firstFew: undefined, lastFew: undefined } }, null, 1))
