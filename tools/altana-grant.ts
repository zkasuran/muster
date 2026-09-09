/**
 * tools/altana-grant.ts — the Altana handoff, made runnable. docs/16-ALTANA.md left this "to be
 * written against the SDK at handoff time"; this is it. It grants one scoped, Keystore-registered
 * session per agent on BSC testnet (chain 97), which satisfies Altana requirements 2, 3 and 4 and
 * the prize gate's "live onchain transactions in the Altana explorer".
 *
 * It is a tool, never imported by a page or a test, so it may depend on @altananetwork/sdk (Apache-2.0,
 * install at handoff: `npm install @altananetwork/sdk@0.9.0`). Everything that can be checked without
 * the SDK — keys, scope, balance — is checked first, so a dry or misconfigured run fails loud and free
 * rather than as an opaque relay rejection.
 *
 * SINGLE SOURCE OF TRUTH: the scope comes from lib/altana.ts sessionScope(), the keys from
 * loadOrCreateAgent(), the network from ALTANA_NET. Nothing about the grant is re-specified here, so
 * the page, the tests and this grant can never disagree.
 *
 * Safety rails, all enforced before any write:
 *   - refuses unless the wallet holds gas on chain 97 (no dry, fee-less, or silently-failing grant);
 *   - register: true always (register: false voids requirement 3 — docs/16 do-not-ship);
 *   - passes OUR session signer from .hq/altana, never the SDK's in-memory one;
 *   - assertScopeSafe() rejects an empty allowlist or an empty cap;
 *   - expiry is fixed past the judging window (2026-09-23), never a rolling now()+7d that could lapse.
 *
 * Usage:
 *   npm install @altananetwork/sdk@0.9.0
 *   node --experimental-strip-types tools/altana-grant.ts health-factor         # one agent
 *   node --experimental-strip-types tools/altana-grant.ts --all                 # all four
 *   node --experimental-strip-types tools/altana-grant.ts health-factor --dry   # preflight only, no write
 */
import { readFileSync } from 'node:fs'
import { createPublicClient, http, formatEther, type Hex } from 'viem'
import { bscTestnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import {
  ALTANA_NET,
  ALTANA_AGENTS,
  sessionScope,
  assertScopeSafe,
  serializeScope,
  loadOrCreateAgent,
  type AltanaChainId,
} from '../lib/altana.ts'
import type { Shelf } from '../lib/types.ts'

// The one real transaction lands on testnet; mainnet is a later handoff (docs/16-ALTANA.md).
const CHAIN: AltanaChainId = 97
// Fixed, past the end of judging (2026-09-23). Never a rolling window that could lapse mid-judging.
const EXPIRY = Math.floor(Date.parse('2026-10-01T00:00:00Z') / 1000)
const KEY_DIR = process.env.MUSTER_ALTANA_KEY_DIR ?? '.hq/altana'

function adminKeyFor(agentId: string): Hex {
  const line = readFileSync(`${KEY_DIR}/agent-${agentId}-admin.key`, 'utf8')
    .split('\n').map((l) => l.trim()).find((l) => /^0x[0-9a-fA-F]{64}$/.test(l))
  if (!line) throw new Error(`no admin key at ${KEY_DIR}/agent-${agentId}-admin.key`)
  return line as Hex
}
function sessionKeyFor(agentId: string): Hex {
  const line = readFileSync(`${KEY_DIR}/agent-${agentId}-session.key`, 'utf8')
    .split('\n').map((l) => l.trim()).find((l) => /^0x[0-9a-fA-F]{64}$/.test(l))
  if (!line) throw new Error(`no session key at ${KEY_DIR}/agent-${agentId}-session.key`)
  return line as Hex
}

async function preflight(shelf: Shelf) {
  const agent = ALTANA_AGENTS.find((a) => a.shelf === shelf)
  if (!agent) throw new Error(`no agent for shelf ${shelf}`)

  // The scope, from the single source, checked against the G2 gate before anything else.
  const scope = sessionScope(shelf)
  assertScopeSafe(scope)

  // The keys must load and must re-derive the pinned public artifacts, so a swapped key file is
  // caught here rather than after a fee is paid.
  const derived = loadOrCreateAgent(agent.agentId, shelf, agent.name)
  if (derived.wallet.toLowerCase() !== agent.wallet.toLowerCase())
    throw new Error(`key mismatch: ${KEY_DIR} admin key derives ${derived.wallet}, expected ${agent.wallet}`)
  if (derived.keyId.toLowerCase() !== agent.keyId.toLowerCase())
    throw new Error(`key mismatch: session key derives keyId ${derived.keyId}, expected ${agent.keyId}`)

  // Gas must be present on chain 97, or the grant cannot pay its fee. Refuse a dry wallet.
  const pub = createPublicClient({ chain: bscTestnet, transport: http(ALTANA_NET[CHAIN].rpc, { timeout: 10_000 }) })
  const bal = await pub.getBalance({ address: agent.wallet })

  console.log(`\n${agent.name} (${shelf})`)
  console.log(`  wallet   ${agent.wallet}`)
  console.log(`  keyId    ${agent.keyId}`)
  console.log(`  balance  ${formatEther(bal)} tBNB on chain ${CHAIN}`)
  console.log(`  scope    ${scope.summary}`)
  console.log(`  calls    ${scope.calls.map((c) => ('signature' in c ? c.signature : c.to)).join(', ')}`)
  console.log(`  expiry   ${new Date(EXPIRY * 1000).toISOString()}`)
  if (bal === 0n)
    throw new Error(`${agent.wallet} holds no tBNB on chain ${CHAIN}. Fund it at https://testnet.bnbchain.org/faucet-smart before granting.`)
  return { agent, scope }
}

async function grant(shelf: Shelf, dry: boolean) {
  const { agent, scope } = await preflight(shelf)
  if (dry) { console.log('  --dry: preflight only, no write.'); return }

  // The SDK is Apache-2.0 and not vendored; imported dynamically so the tree needs it only at handoff.
  let sdk: Record<string, unknown>
  try {
    sdk = (await import('@altananetwork/sdk')) as unknown as Record<string, unknown>
  } catch {
    throw new Error('install the SDK first: npm install @altananetwork/sdk@0.9.0')
  }
  const createClient = sdk['createClient'] as (o: { chains: unknown[] }) => {
    createWallet: (o: { signer: unknown }) => Promise<{ address: string; signer: unknown }>
    grantSession: (o: Record<string, unknown>) => Promise<{ transactionHash?: Hex; publicKey?: Hex }>
  }
  const signerFromPrivateKey = sdk['signerFromPrivateKey'] as (k: Hex) => unknown
  // The SDK ships its own chain descriptors (BNB_TESTNET), which carry the relay URL and ids it
  // needs. R06 line 402 uses these, not viem's chains, so pass the SDK constant.
  const BNB_TESTNET = sdk['BNB_TESTNET']
  if (!BNB_TESTNET) throw new Error('SDK does not export BNB_TESTNET')

  const adminSigner = signerFromPrivateKey(adminKeyFor(agent.agentId))
  const sessionSigner = signerFromPrivateKey(sessionKeyFor(agent.agentId))
  const client = createClient({ chains: [BNB_TESTNET] })
  console.log('  creating wallet from admin signer …')
  const wallet = await client.createWallet({ signer: adminSigner })

  console.log('  granting session on chain', CHAIN, '…')
  const result = await client.grantSession({
    wallet,
    signer: adminSigner,
    sessionSigner,                       // ours, from .hq/altana — never the SDK's in-memory key
    permissions: {
      calls: scope.calls,
      spend: scope.spend.map((s) => ({ limit: s.limit, period: s.period, token: s.token })),
    },
    expiry: EXPIRY,
    register: true,                      // requirement 3. Never false on a submitted session.
    chainId: CHAIN,
  })

  const tx = result.transactionHash
  console.log(`  GRANTED. tx ${tx ?? '(no hash returned — check the relay)'}`)
  if (tx) console.log(`  explorer ${ALTANA_NET[CHAIN].explorer}/tx/${tx}`)
  console.log(`  account  ${ALTANA_NET[CHAIN].explorer}/address/${agent.wallet}`)
  console.log('  scope granted:', JSON.stringify(serializeScope(scope)))
}

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const all = args.includes('--all')
  const shelves: Shelf[] = all
    ? ALTANA_AGENTS.map((a) => a.shelf)
    : (args.filter((a) => !a.startsWith('--')) as Shelf[])
  if (shelves.length === 0) {
    console.error('usage: altana-grant.ts <shelf|--all> [--dry]  (shelf: health-factor|yield|rebalancing|grid-trading)')
    process.exit(2)
  }
  for (const shelf of shelves) {
    try { await grant(shelf, dry) }
    catch (e) { console.error(`  FAILED: ${(e as Error).message}`); process.exitCode = 1 }
  }
}

main()
