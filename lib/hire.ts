/**
 * The buyer side of a hire, server half. Builds the exact typed data a wallet signs for one of
 * our agents, verifies the signature it gets back by recovering the signer, reads the signer's
 * USD1 balance so the page can say whether the authorization could actually clear, and records
 * the attempt. Nothing here moves money. Settlement is B402's job and it is pending a merchant
 * account, which every surface says in plain words.
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { getAddress, isAddress, keccak256, parseAbi, recoverTypedDataAddress, toHex } from 'viem'
import { db } from './db.ts'
import { withRpc } from './rpc.ts'
import { TOKENS } from './constants.ts'
import { transferWithAuthorizationTypedData } from './b402.ts'
import { findAgent } from './agents.ts'
import { amountWithSymbol } from './money.ts'
import type { Shelf } from './types.ts'

const PAY_TO = process.env.MUSTER_PAYTO ?? null
/** How long a signed authorization stays valid. Long enough to sign, short enough to be safe. */
const WINDOW_SECONDS = 15 * 60

export interface TypedDataOffer {
  shelf: Shelf
  typedData: unknown
  nonce: string
  validAfter: number
  validBefore: number
  amountBase: string
  amountHuman: string
  token: 'USD1'
  payTo: string
}

export function offerTypedData(shelf: string, from: string): TypedDataOffer {
  const agent = findAgent(shelf)
  if (!agent) throw new HireError('no such agent', 404)
  if (!isAddress(from)) throw new HireError('from is not an address', 400)
  if (!PAY_TO) throw new HireError('payment_not_configured: this deployment has no payout address', 503)
  const now = Math.floor(Date.now() / 1000)
  const validAfter = now - 60
  const validBefore = now + WINDOW_SECONDS
  const nonce = toHex(randomBytes(32))
  const typedData = transferWithAuthorizationTypedData({
    token: 'USD1',
    from: getAddress(from),
    to: getAddress(PAY_TO),
    value: agent.priceBase,
    validAfter,
    validBefore,
    nonce,
  })
  return {
    shelf: agent.slug,
    typedData,
    nonce,
    validAfter,
    validBefore,
    amountBase: agent.priceBase,
    amountHuman: amountWithSymbol(agent.priceBase, TOKENS.USD1.address),
    token: 'USD1',
    payTo: getAddress(PAY_TO),
  }
}

export interface VerifiedHire {
  ok: true
  attemptId: string
  signer: string
  amountHuman: string
  signerBalanceHuman: string | null
  balanceCovers: boolean | null
  /** The x402 envelope a facilitator would settle. Shown to the buyer, never fabricated as settled. */
  envelope: unknown
  settlement: 'pending_merchant_account'
}

export async function verifyHire(input: {
  shelf: string
  from: string
  signature: string
  nonce: string
  validAfter: number
  validBefore: number
}): Promise<VerifiedHire> {
  const agent = findAgent(input.shelf)
  if (!agent) throw new HireError('no such agent', 404)
  if (!isAddress(input.from)) throw new HireError('from is not an address', 400)
  if (!/^0x[0-9a-fA-F]{130}$/.test(input.signature)) throw new HireError('signature must be 65 bytes as hex', 400)
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.nonce)) throw new HireError('nonce must be 32 bytes as hex', 400)
  if (!PAY_TO) throw new HireError('payment_not_configured', 503)
  const now = Math.floor(Date.now() / 1000)
  if (input.validBefore <= now) throw new HireError('authorization has expired, request a new one', 400)
  if (input.validBefore - input.validAfter > WINDOW_SECONDS + 120) throw new HireError('authorization window is not one we issued', 400)

  const typedData = transferWithAuthorizationTypedData({
    token: 'USD1',
    from: getAddress(input.from),
    to: getAddress(PAY_TO),
    value: agent.priceBase,
    validAfter: input.validAfter,
    validBefore: input.validBefore,
    nonce: input.nonce,
  })
  const recovered = await recoverTypedDataAddress({
    ...(typedData as object),
    signature: input.signature as `0x${string}`,
  } as never)
  if (String(recovered).toLowerCase() !== input.from.toLowerCase()) {
    throw new HireError(`signature recovers to ${String(recovered)}, not to ${input.from}`, 400)
  }

  // The signer's USD1 balance, so the page can say whether this authorization could clear. A
  // valid signature over a balance of zero is honest to show as exactly that.
  let balance: bigint | null = null
  try {
    balance = await withRpc((c) =>
      c.readContract({
        address: TOKENS.USD1.address as `0x${string}`,
        abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
        functionName: 'balanceOf',
        args: [getAddress(input.from)],
      }),
    )
  } catch {
    balance = null
  }

  // A nonce is single use, by construction of EIP-3009 and by the UNIQUE constraint here. A
  // replay is refused with a status a client can act on rather than surfacing as a 500.
  const seen = db().prepare('SELECT 1 FROM hireAttempt WHERE nonce = ?').get(input.nonce.toLowerCase())
  if (seen) throw new HireError('this authorization was already presented, request a new one', 409)

  const attemptId = randomUUID()
  db()
    .prepare(
      `INSERT INTO hireAttempt (attemptId, shelf, signer, payTo, token, amountBase, nonce, validBefore,
                                signatureHash, signerBalance, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      attemptId,
      agent.slug,
      input.from.toLowerCase(),
      PAY_TO.toLowerCase(),
      TOKENS.USD1.address.toLowerCase(),
      agent.priceBase,
      input.nonce.toLowerCase(),
      input.validBefore,
      keccak256(input.signature as `0x${string}`),
      balance === null ? null : balance.toString(),
      Date.now(),
    )

  const envelope = {
    x402Version: 2,
    scheme: 'eip3009',
    network: 'eip155:56',
    payload: {
      signature: input.signature,
      authorization: {
        from: getAddress(input.from),
        to: getAddress(PAY_TO),
        value: agent.priceBase,
        validAfter: String(input.validAfter),
        validBefore: String(input.validBefore),
        nonce: input.nonce,
      },
    },
  }

  return {
    ok: true,
    attemptId,
    signer: getAddress(input.from),
    amountHuman: amountWithSymbol(agent.priceBase, TOKENS.USD1.address),
    signerBalanceHuman: balance === null ? null : amountWithSymbol(balance.toString(), TOKENS.USD1.address),
    balanceCovers: balance === null ? null : balance >= BigInt(agent.priceBase),
    envelope,
    settlement: 'pending_merchant_account',
  }
}

export function hireStats(): { attempts: number; distinctSigners: number; lastAt: number | null } {
  const r = db()
    .prepare('SELECT COUNT(*) c, COUNT(DISTINCT signer) s, MAX(createdAt) m FROM hireAttempt')
    .get() as { c: number; s: number; m: number | null }
  return { attempts: r.c, distinctSigners: r.s, lastAt: r.m }
}

export class HireError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
