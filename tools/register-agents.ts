/**
 * Register our four reference agents on the ERC-8004 Identity Registry, for real, from the payout
 * key. After this they are registry agents like every other row, with a registry id, an owner and
 * an on-chain record, and the reserved ids go away. Gas only: register() measured at 180,382 gas,
 * about 0.00001 BNB each at 0.05 gwei.
 *
 * Refuses when the key holds no gas rather than pretending. Prints the one funding command.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createWalletClient, http, parseAbi, decodeEventLog, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { bsc } from 'viem/chains'
import { withRpc, ENDPOINTS } from '../lib/rpc.ts'
import { REGISTRY, TOKENS } from '../lib/constants.ts'
import { FIRST_PARTY } from '../lib/agents.ts'
import { db, tx, setMeta } from '../lib/db.ts'
import { CHAIN_ID } from '../lib/registry.ts'
import { keccak256, toHex } from 'viem'

const ORIGIN = process.env.MUSTER_ORIGIN_URL ?? 'https://muster.zkasuran.dev'
const KEY_PATH = process.env.MUSTER_PAYOUT_KEY_FILE ?? '.hq/payout-key.txt'
const ABI = parseAbi([
  'function register(string agentURI) returns (uint256 agentId)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
])

const key = (() => {
  const env = process.env.MUSTER_PAYOUT_KEY
  if (env && /^0x[0-9a-fA-F]{64}$/.test(env)) return env as Hex
  if (!existsSync(KEY_PATH)) throw new Error(`no key at ${KEY_PATH}`)
  return readFileSync(KEY_PATH, 'utf8').split('\n').map((l) => l.trim()).find((l) => /^0x[0-9a-fA-F]{64}$/.test(l)) as Hex
})()
const account = privateKeyToAccount(key)
const bal = await withRpc((c) => c.getBalance({ address: account.address }))
console.log(`  facilitator ${account.address} holds ${Number(bal) / 1e18} BNB`)
const need = 4n * 200_000n * 100_000_000n
if (bal < need) {
  console.log(`  REFUSING: needs at least ${Number(need) / 1e18} BNB for four registrations. Fund it with one transfer to ${account.address}, then rerun.`)
  process.exit(2)
}

const wallet = createWalletClient({ account, chain: bsc, transport: http(ENDPOINTS[0], { timeout: 30_000 }) })
const results: { slug: string; agentId: string; tx: string; tokenUri: string }[] = []
for (const a of FIRST_PARTY) {
  const endpoint = `${ORIGIN}/api/agent/${a.slug}`
  const record = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: a.name,
    description: a.summary,
    image: '',
    active: true,
    x402Support: true,
    supportedTrust: ['reputation'],
    services: [
      { name: 'API', endpoint, version: '1', skills: [a.slug] },
      { name: 'web', endpoint: `${ORIGIN}/hire/${a.slug}` },
    ],
  }
  const tokenUri = 'data:application/json;base64,' + Buffer.from(JSON.stringify(record)).toString('base64')
  const hash = await wallet.writeContract({ address: REGISTRY.identity as Hex, abi: ABI, functionName: 'register', args: [tokenUri] })
  const receipt = await withRpc((c) => c.waitForTransactionReceipt({ hash, timeout: 120_000 }))
  let agentId: string | null = null
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: ABI, data: log.data, topics: log.topics })
      if (ev.eventName === 'Registered') agentId = String((ev.args as { agentId: bigint }).agentId)
    } catch { /* other events */ }
  }
  if (!agentId) throw new Error(`no Registered event in ${hash}`)
  console.log(`  ${a.slug.padEnd(14)} registered as agent ${agentId}  tx ${hash}  gas ${receipt.gasUsed}`)
  results.push({ slug: a.slug, agentId, tx: hash, tokenUri })
}

// Re-seed under the real ids: the agent row from the chain record, the listing at payable, and the
// reserved rows removed so a buyer never sees two of us.
const now = Date.now()
tx(() => {
  for (const r of results) {
    const a = FIRST_PARTY.find((f) => f.slug === r.slug)!
    db().prepare(`INSERT INTO agent (chainId, agentId, owner, agentWallet, tokenUri, tokenUriHash, name, description, endpoints, skills, serviceKinds, declaresX402, declaresActive, trustModels, registrationParsed, firstSeenBlock, lastSeenBlock, updatedAt)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,1,1,?,1,0,0,?)
                  ON CONFLICT(chainId, agentId) DO UPDATE SET name = excluded.name, description = excluded.description, endpoints = excluded.endpoints, tokenUri = excluded.tokenUri, tokenUriHash = excluded.tokenUriHash, updatedAt = excluded.updatedAt`)
      .run(CHAIN_ID, r.agentId, account.address.toLowerCase(), account.address.toLowerCase(), r.tokenUri, keccak256(toHex(r.tokenUri)), a.name, a.summary,
           JSON.stringify([`${ORIGIN}/api/agent/${a.slug}`]), JSON.stringify([a.slug]), JSON.stringify(['API', 'web']), JSON.stringify(['reputation']), now)
    db().prepare(`INSERT INTO listing (listingId, chainId, agentId, category, visibility, lifecycleState, evidenceTier, priceBase, priceToken, priceDecimals, priceScheme, payTo, firstParty, updatedAt)
                  VALUES (?,?,?,?,'listed','live','payable',?,?,?,'eip3009',?,1,?)
                  ON CONFLICT(chainId, agentId, category) DO UPDATE SET priceBase = excluded.priceBase, payTo = excluded.payTo, updatedAt = excluded.updatedAt`)
      .run(`${CHAIN_ID}:${r.agentId}:${a.slug}`, CHAIN_ID, r.agentId, a.slug, a.priceBase, TOKENS.USD1.address, TOKENS.USD1.decimals, account.address.toLowerCase(), now)
    setMeta(`registered.${a.slug}`, JSON.stringify({ agentId: r.agentId, tx: r.tx }))
  }
  db().prepare("DELETE FROM listing WHERE firstParty = 1 AND CAST(agentId AS INTEGER) >= 900000000").run()
  db().prepare("DELETE FROM agent WHERE CAST(agentId AS INTEGER) >= 900000000").run()
})
console.log(`  re-seeded ${results.length} agents under their registry ids, reserved ids removed`)
