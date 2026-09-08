/**
 * Self-facilitated settlement over EIP-3009. The buyer's signed TransferWithAuthorization can be
 * submitted by anyone, and that anyone pays the gas. Binance's B402 facilitator does exactly this
 * behind a merchant account we do not have yet, so until that account exists Muster is its own
 * facilitator: it submits the transfer to the USD1 contract from the payout key and pays the gas
 * in BNB. The buyer still sends no transaction and holds no BNB. The result is a real transfer on
 * chain with a real hash, which is what the settled rung requires.
 *
 * Nothing here is faked. If the key holds no gas, settlement refuses with that reason and the
 * hire is recorded as signed, not settled.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createWalletClient, http, parseAbi, getAddress, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { bsc } from 'viem/chains'
import { withRpc, ENDPOINTS } from './rpc.ts'
import { TOKENS } from './constants.ts'
import { db } from './db.ts'

const KEY_PATH = process.env.MUSTER_PAYOUT_KEY_FILE ?? '/etc/muster/payout.key'

const ERC3009_ABI = parseAbi([
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  'function authorizationState(address authorizer, bytes32 nonce) view returns (bool)',
  'function balanceOf(address) view returns (uint256)',
])

export interface Authorization {
  from: string
  to: string
  value: string
  validAfter: string | number
  validBefore: string | number
  nonce: string
}

export interface SettleResult {
  ok: boolean
  transaction: string | null
  reason: string | null
  facilitator: string | null
  gasUsed: string | null
}

function loadKey(): Hex | null {
  const fromEnv = process.env.MUSTER_PAYOUT_KEY
  if (fromEnv && /^0x[0-9a-fA-F]{64}$/.test(fromEnv)) return fromEnv as Hex
  if (!existsSync(KEY_PATH)) return null
  const line = readFileSync(KEY_PATH, 'utf8').split('\n').map((l) => l.trim()).find((l) => /^0x[0-9a-fA-F]{64}$/.test(l))
  return (line as Hex | undefined) ?? null
}

/** What the status page and the hire page say about whether settlement can happen right now. */
export async function facilitatorState(): Promise<{ address: string | null; bnb: string | null; canSettle: boolean; reason: string | null }> {
  const key = loadKey()
  if (!key) return { address: null, bnb: null, canSettle: false, reason: 'no facilitator key on this deployment' }
  const acct = privateKeyToAccount(key)
  try {
    const wei = await withRpc((c) => c.getBalance({ address: acct.address }))
    const bnb = Number(wei) / 1e18
    // A settlement is around 80k gas at 0.05 gwei, so 0.001 BNB is hundreds of settlements. The
    // floor is set where one more transaction could still be paid for after this one.
    const canSettle = wei >= 200_000n * 100_000_000n
    return { address: acct.address, bnb: bnb.toFixed(6), canSettle, reason: canSettle ? null : `facilitator holds ${bnb.toFixed(6)} BNB, below the gas floor` }
  } catch (e) {
    return { address: acct.address, bnb: null, canSettle: false, reason: `balance read failed: ${(e as Error).message.slice(0, 80)}` }
  }
}

/** Split a 65-byte signature into v, r, s the way the token expects. */
function splitSig(sig: string): { v: number; r: Hex; s: Hex } {
  const h = sig.startsWith('0x') ? sig.slice(2) : sig
  if (h.length !== 130) throw new Error('signature must be 65 bytes')
  let v = parseInt(h.slice(128, 130), 16)
  if (v < 27) v += 27
  return { v, r: `0x${h.slice(0, 64)}` as Hex, s: `0x${h.slice(64, 128)}` as Hex }
}

export async function settleEip3009(auth: Authorization, signature: string, attemptId?: string): Promise<SettleResult> {
  const state = await facilitatorState()
  if (!state.canSettle || !state.address) return { ok: false, transaction: null, reason: state.reason, facilitator: state.address, gasUsed: null }
  const key = loadKey()!
  const account = privateKeyToAccount(key)
  const token = getAddress(TOKENS.USD1.address)
  const from = getAddress(auth.from)
  const to = getAddress(auth.to)
  const value = BigInt(auth.value)
  const nonce = auth.nonce as Hex

  // Refuse what the chain would refuse, before paying gas for it.
  const used = await withRpc((c) => c.readContract({ address: token, abi: ERC3009_ABI, functionName: 'authorizationState', args: [from, nonce] }))
  if (used) return { ok: false, transaction: null, reason: 'this authorization nonce was already used on chain', facilitator: account.address, gasUsed: null }
  const bal = await withRpc((c) => c.readContract({ address: token, abi: ERC3009_ABI, functionName: 'balanceOf', args: [from] }))
  if (bal < value) return { ok: false, transaction: null, reason: `buyer holds ${Number(bal) / 1e18} USD1, below the ${Number(value) / 1e18} USD1 price`, facilitator: account.address, gasUsed: null }

  const { v, r, s } = splitSig(signature)
  const wallet = createWalletClient({ account, chain: bsc, transport: http(ENDPOINTS[0], { timeout: 30_000 }) })
  let hash: Hex
  try {
    hash = await wallet.writeContract({
      address: token,
      abi: ERC3009_ABI,
      functionName: 'transferWithAuthorization',
      args: [from, to, value, BigInt(auth.validAfter), BigInt(auth.validBefore), nonce, v, r, s],
    })
  } catch (e) {
    return { ok: false, transaction: null, reason: `submit failed: ${(e as Error).message.split('\n')[0]?.slice(0, 140)}`, facilitator: account.address, gasUsed: null }
  }
  const receipt = await withRpc((c) => c.waitForTransactionReceipt({ hash, timeout: 90_000 }))
  const ok = receipt.status === 'success'
  if (attemptId) {
    db().prepare('UPDATE hireAttempt SET settled = ?, settleTx = ? WHERE attemptId = ?').run(ok ? 1 : 0, hash, attemptId)
  }
  return { ok, transaction: hash, reason: ok ? null : 'transaction reverted on chain', facilitator: account.address, gasUsed: receipt.gasUsed.toString() }
}

/** Promote our listing to settled once a real payment has cleared to it. Evidence, not a claim. */
export function markSettled(shelf: string, tx: string): void {
  db().prepare(`UPDATE listing SET evidenceTier = 'settled', updatedAt = ? WHERE firstParty = 1 AND category = ? AND evidenceTier = 'payable'`).run(Date.now(), shelf)
  db().prepare("INSERT INTO meta (k, v, updatedAt) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updatedAt = excluded.updatedAt").run(`settled.${shelf}`, tx, Date.now())
}
