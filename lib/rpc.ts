/**
 * The RPC pool. Public endpoints differ in what they will actually do, so capability is
 * asserted at boot rather than assumed, and the assertion result is what the status page
 * reports. docs/15-SYSTEM.md section 3.6 measured the trap: publicnode caps `eth_getLogs`
 * at 5,000 blocks and refuses anything it considers an archive request.
 */
import { createPublicClient, http, type PublicClient } from 'viem'
import { bsc } from 'viem/chains'

/** Ordered by preference. Every one of these was reachable when this file was written. */
export const ENDPOINTS = [
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://binance.llamarpc.com',
] as const

/**
 * The widest `eth_getLogs` span we will ask for. Set from the measured publicnode cap, not
 * from optimism. A sweep that asks for more gets refused and looks like an outage.
 */
export const MAX_LOG_SPAN = 5_000

export interface EndpointHealth {
  url: string
  ok: boolean
  chainId: number | null
  blockNumber: bigint | null
  /** Whether it served a getLogs request at MAX_LOG_SPAN. This is the one that matters. */
  logsAtMaxSpan: boolean
  latencyMs: number | null
  error: string | null
}

const clients = new Map<string, PublicClient>()

export function client(url: string): PublicClient {
  const existing = clients.get(url)
  if (existing) return existing
  const c = createPublicClient({
    chain: bsc,
    transport: http(url, { timeout: 20_000, retryCount: 0 }),
  }) as PublicClient
  clients.set(url, c)
  return c
}

/**
 * Try each endpoint in order until one answers. Errors are collected rather than swallowed,
 * so a total failure says which endpoints were tried and why each refused.
 */
export async function withRpc<T>(fn: (c: PublicClient, url: string) => Promise<T>): Promise<T> {
  const errors: string[] = []
  for (const url of ENDPOINTS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fn(client(url), url)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`${url} attempt ${attempt + 1}: ${msg.slice(0, 160)}`)
        // Back off only on what looks like rate limiting, and move on otherwise.
        if (/rate|429|limit|timeout|ECONN|socket/i.test(msg)) {
          await sleep(250 * 2 ** attempt)
          continue
        }
        break
      }
    }
  }
  throw new Error(`every RPC endpoint refused:\n${errors.join('\n')}`)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * The boot assertion. Proves each endpoint reports chain 56 and, separately, that it will
 * serve a getLogs request at the width the sweep actually uses. An endpoint that answers
 * `eth_blockNumber` but refuses the sweep is worse than one that is plainly down, because
 * it looks healthy.
 */
export async function assertCapability(): Promise<EndpointHealth[]> {
  const out: EndpointHealth[] = []
  for (const url of ENDPOINTS) {
    const health: EndpointHealth = {
      url,
      ok: false,
      chainId: null,
      blockNumber: null,
      logsAtMaxSpan: false,
      latencyMs: null,
      error: null,
    }
    const started = Date.now()
    try {
      const c = client(url)
      const [id, block] = await Promise.all([c.getChainId(), c.getBlockNumber()])
      health.chainId = id
      health.blockNumber = block
      health.ok = id === 56
      health.latencyMs = Date.now() - started
      try {
        await c.getLogs({
          address: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
          fromBlock: block - BigInt(MAX_LOG_SPAN),
          toBlock: block,
        })
        health.logsAtMaxSpan = true
      } catch (e) {
        health.logsAtMaxSpan = false
        health.error = `getLogs at ${MAX_LOG_SPAN}: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`
      }
    } catch (e) {
      health.error = (e instanceof Error ? e.message : String(e)).slice(0, 160)
    }
    out.push(health)
  }
  return out
}
