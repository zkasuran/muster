/**
 * Local verification of an x402 eip3009 envelope, for the path where Muster is its own
 * facilitator. It recovers the signer from the EIP-712 signature over the exact typed data the
 * token would check, and refuses anything that does not match what the 402 asked for. The
 * on-chain checks (nonce unused, balance) happen in settle, before gas is spent.
 */
import { getAddress, isAddress, recoverTypedDataAddress } from 'viem'
import { transferWithAuthorizationTypedData } from './b402.ts'
import type { Authorization } from './settle.ts'

export interface LocalVerify {
  ok: boolean
  reason: string | null
  from: string | null
  authorization: Authorization | null
  signature: string | null
}

export async function verifyEip3009Envelope(envelope: unknown, expect: { payTo: string; value: string }): Promise<LocalVerify> {
  const fail = (reason: string): LocalVerify => ({ ok: false, reason, from: null, authorization: null, signature: null })
  if (!envelope || typeof envelope !== 'object') return fail('envelope is not an object')
  const e = envelope as Record<string, unknown>
  const payload = (e['payload'] ?? e) as Record<string, unknown>
  const auth = payload['authorization'] as Record<string, unknown> | undefined
  const signature = payload['signature']
  if (!auth || typeof signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(signature)) return fail('missing authorization or signature')
  const from = String(auth['from'] ?? ''); const to = String(auth['to'] ?? ''); const value = String(auth['value'] ?? '')
  const validAfter = Number(auth['validAfter']); const validBefore = Number(auth['validBefore']); const nonce = String(auth['nonce'] ?? '')
  if (!isAddress(from) || !isAddress(to)) return fail('from or to is not an address')
  if (getAddress(to) !== getAddress(expect.payTo)) return fail(`authorization pays ${to}, the 402 asked for ${expect.payTo}`)
  if (!/^[0-9]+$/.test(value) || BigInt(value) < BigInt(expect.value)) return fail(`authorization value ${value} is below the price ${expect.value}`)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(validBefore) || validBefore <= now) return fail('authorization has expired')
  if (!Number.isFinite(validAfter) || validAfter > now + 60) return fail('authorization is not valid yet')
  if (!/^0x[0-9a-fA-F]{64}$/.test(nonce)) return fail('nonce must be 32 bytes')
  const typed = transferWithAuthorizationTypedData({ token: 'USD1', from: getAddress(from), to: getAddress(to), value, validAfter, validBefore, nonce })
  let recovered: string
  try {
    recovered = await recoverTypedDataAddress({ ...(typed as object), signature: signature as `0x${string}` } as never)
  } catch (err) {
    return fail(`signature does not recover: ${(err as Error).message.slice(0, 80)}`)
  }
  if (recovered.toLowerCase() !== from.toLowerCase()) return fail(`signature recovers to ${recovered}, not to ${from}`)
  return { ok: true, reason: null, from: getAddress(from), authorization: { from, to, value, validAfter, validBefore, nonce }, signature }
}
