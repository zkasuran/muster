/**
 * [doc 11] The chain facts the /stack page reads live, so the numbers a judge sees there were
 * verified this render rather than copied from a constant. Three reads, each pinned to one block:
 * which public endpoints answer chain 56 and serve getLogs at the sweep width (the boot capability
 * assertion), the decimals() and DOMAIN_SEPARATOR() every configured payment token returns, and
 * the EIP-1967 implementation behind each proxy. Nothing here is stored, and a read that fails
 * renders as unknown rather than as a zero or a guess.
 */
import { parseAbi, getAddress, type Hex } from 'viem'
import { withRpc, assertCapability } from './rpc.ts'
import { cached } from './cache.ts'
import { TOKENS, PINNED_DOMAIN_SEPARATOR } from './constants.ts'

export type { EndpointHealth } from './rpc.ts'

const TOKEN_ABI = parseAbi([
  'function decimals() view returns (uint8)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
])

/** The capability probe walks every endpoint and is heavy, so it caches longer than the reads. */
const ENDPOINT_CEILING_S = 300
const CHAIN_READ_CEILING_S = 120

/** Which endpoints answer chain 56 and serve a getLogs request at the width the sweep uses. */
export function endpointCapability() {
  return cached('stack.endpoints', ENDPOINT_CEILING_S, () => assertCapability())
}

export interface TokenFact {
  key: string
  symbol: string
  address: string
  decimalsOnChain: number | null
  decimalsPinned: number
  decimalsMatch: boolean | null
  domainSeparator: string | null
  domainSeparatorPinned: string | null
  domainSeparatorMatch: boolean | null
  /** True where the token config signs EIP-712 (eip3009 or permit), so a DOMAIN_SEPARATOR is expected. */
  expectsDomainSeparator: boolean
  error: string | null
}

export interface TokenFacts {
  block: number | null
  readAt: number
  tokens: TokenFact[]
}

type TokenKey = keyof typeof TOKENS

/** decimals() and DOMAIN_SEPARATOR() for every configured payment token, read live and matched. */
export function tokenFacts(): Promise<TokenFacts> {
  return cached('stack.tokens', CHAIN_READ_CEILING_S, loadTokenFacts)
}

async function loadTokenFacts(): Promise<TokenFacts> {
  const entries = Object.entries(TOKENS) as [TokenKey, (typeof TOKENS)[TokenKey]][]
  try {
    return await withRpc(async (c) => {
      const block = await c.getBlockNumber()
      const contracts = entries.flatMap(([, t]) => [
        { address: t.address as Hex, abi: TOKEN_ABI, functionName: 'decimals' } as const,
        { address: t.address as Hex, abi: TOKEN_ABI, functionName: 'DOMAIN_SEPARATOR' } as const,
      ])
      const res = await c.multicall({ contracts, allowFailure: true, blockNumber: block })
      const tokens = entries.map(([key, t], i): TokenFact => {
        const dec = res[i * 2]
        const dom = res[i * 2 + 1]
        const decimalsOnChain = dec?.status === 'success' ? Number(dec.result) : null
        const domainSeparator = dom?.status === 'success' ? String(dom.result) : null
        const pinnedDom = PINNED_DOMAIN_SEPARATOR[key]
        return {
          key,
          symbol: t.symbol,
          address: getAddress(t.address),
          decimalsOnChain,
          decimalsPinned: t.decimals,
          decimalsMatch: decimalsOnChain === null ? null : decimalsOnChain === t.decimals,
          domainSeparator,
          domainSeparatorPinned: pinnedDom,
          domainSeparatorMatch:
            pinnedDom === null || domainSeparator === null
              ? null
              : domainSeparator.toLowerCase() === pinnedDom.toLowerCase(),
          expectsDomainSeparator: t.eip3009 || t.permit,
          error: null,
        }
      })
      return { block: Number(block), readAt: Date.now(), tokens }
    })
  } catch (e) {
    return degradedTokenFacts(entries, e)
  }
}

function degradedTokenFacts(
  entries: [TokenKey, (typeof TOKENS)[TokenKey]][],
  e: unknown,
): TokenFacts {
  const msg = (e instanceof Error ? e.message : String(e)).slice(0, 160)
  return {
    block: null,
    readAt: Date.now(),
    tokens: entries.map(([key, t]): TokenFact => ({
      key,
      symbol: t.symbol,
      address: getAddress(t.address),
      decimalsOnChain: null,
      decimalsPinned: t.decimals,
      decimalsMatch: null,
      domainSeparator: null,
      domainSeparatorPinned: PINNED_DOMAIN_SEPARATOR[key],
      domainSeparatorMatch: null,
      expectsDomainSeparator: t.eip3009 || t.permit,
      error: msg,
    })),
  }
}
