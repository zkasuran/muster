/**
 * tools/register-only.ts — register the four reference agents on the ERC-8004 Identity Registry,
 * on BSC mainnet, and print the assigned agentId and the transaction hash for each. It does NOT
 * touch any database and does NOT delete the reserved-id rows: it is the safe half of
 * register-agents.ts, for adding the on-chain registry proof to the submission without a live-DB
 * re-seed. The registration-v1 document is byte-for-byte what register-agents.ts hosts.
 *
 * Read the key from .hq/payout-key.txt (or MUSTER_PAYOUT_KEY / MUSTER_PAYOUT_KEY_FILE). Refuses if
 * the key holds no gas. One register() per agent, ~180,382 gas each.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createWalletClient, http, parseAbi, decodeEventLog, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { bsc } from 'viem/chains'
import { withRpc, ENDPOINTS } from '../lib/rpc.ts'
import { REGISTRY } from '../lib/constants.ts'
import { FIRST_PARTY } from '../lib/agents.ts'

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
  console.log(`  REFUSING: needs at least ${Number(need) / 1e18} BNB for four registrations.`)
  process.exit(2)
}

const wallet = createWalletClient({ account, chain: bsc, transport: http(ENDPOINTS[0], { timeout: 30_000 }) })
const results: { slug: string; agentId: string; tx: string }[] = []
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
  console.log(`  ${a.slug.padEnd(14)} agentId ${agentId}  tx ${hash}  gas ${receipt.gasUsed}  status ${receipt.status}`)
  results.push({ slug: a.slug, agentId, tx: hash })
}
console.log('\nJSON:', JSON.stringify(results))
