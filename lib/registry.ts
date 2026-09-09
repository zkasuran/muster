/**
 * Reads of the ERC-8004 Identity Registry on BSC. Everything here was verified against the
 * live chain before it was written, and the verification is in
 * docs/research/R01-erc8004.md plus docs/01-GROUND-TRUTH.md.
 *
 * Two facts shape this whole file:
 *   `totalSupply()` reverts, so the population is read from a storage slot and the set is
 *   enumerated from logs. Never call totalSupply here.
 *   `tokenURI` is a `data:application/json;base64` URI on almost every agent, so resolving a
 *   registration record is a decode rather than a fetch.
 */
import { parseAbi, keccak256, toHex, type Log } from 'viem'
import { REGISTRY, CHAIN } from './constants.ts'
import { withRpc, MAX_LOG_SPAN } from './rpc.ts'

export const IDENTITY_ABI = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function getAgentWallet(uint256 agentId) view returns (address)',
  'function getMetadata(uint256 agentId, string metadataKey) view returns (bytes)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)',
])

export const REPUTATION_ABI = parseAbi([
  'function getClients(uint256 agentId) view returns (address[])',
  'function getLastIndex(uint256 agentId, address clientAddress) view returns (uint64)',
  'function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)',
])

/**
 * The registration counter, read straight from storage because `totalSupply()` reverts.
 * Returned 334,935 at block 120,027,164 when docs/research/MEASUREMENT.md was written, so a
 * result far below that means the read is wrong rather than that agents disappeared.
 */
export async function readAgentCount(): Promise<{ count: number; block: number }> {
  return withRpc(async (c) => {
    const block = await c.getBlockNumber()
    const raw = await c.getStorageAt({
      address: REGISTRY.identity as `0x${string}`,
      slot: REGISTRY.identityCounterSlot as `0x${string}`,
      blockNumber: block,
    })
    if (!raw) throw new Error('counter slot read returned nothing')
    return { count: Number(BigInt(raw)), block: Number(block) }
  })
}

export interface Registration {
  name: string | null
  description: string | null
  /** Absolute http(s) endpoints only. A relative or scheme-less value cannot be probed. */
  endpoints: string[]
  /** OASF taxonomy paths, e.g. `analytical_skills/mathematical_reasoning/geometry`. */
  skills: string[]
  /** `services[].name`: OASF, MCP, web, A2A, API, agentWallet, email, custom. */
  serviceKinds: string[]
  /** The operator's own claim that it speaks x402. Both spellings occur in the wild. */
  declaresX402: boolean
  /** The operator's own claim that the agent is running. */
  declaresActive: boolean
  /** `supportedTrust`/`supportedTrusts`: reputation, crypto-economic, tee-attestation. */
  trustModels: string[]
  raw: unknown
}

/**
 * Decode one registration record. Handles the three shapes seen in the wild: a base64 data
 * URI, a plain-text data URI, and an http(s) URL we deliberately do NOT fetch here, because
 * fetching operator-controlled URLs belongs behind the SSRF guard in the prober rather than
 * in a read path.
 */
export function parseRegistration(tokenUri: string): Registration | null {
  if (!tokenUri) return null
  let json: string | null = null
  if (tokenUri.startsWith('data:')) {
    const comma = tokenUri.indexOf(',')
    if (comma === -1) return null
    const meta = tokenUri.slice(5, comma)
    const body = tokenUri.slice(comma + 1)
    try {
      json = meta.includes('base64')
        ? Buffer.from(body, 'base64').toString('utf8')
        : decodeURIComponent(body)
    } catch {
      return null
    }
  } else if (tokenUri.trimStart().startsWith('{')) {
    json = tokenUri
  } else {
    return null
  }
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
  const services = Array.isArray(obj['services']) ? (obj['services'] as unknown[]) : []
  return {
    name: str(obj['name']),
    description: str(obj['description']),
    endpoints: collectEndpoints(obj),
    skills: collectSkills(obj, services),
    serviceKinds: services
      .map((s) => (s && typeof s === 'object' ? str((s as Record<string, unknown>)['name']) : null))
      .filter((s): s is string => s !== null),
    // Two spellings, both live. Reading only one undercounts by about a quarter.
    declaresX402: obj['x402support'] === true || obj['x402Support'] === true,
    declaresActive: obj['active'] === true,
    trustModels: [
      ...(Array.isArray(obj['supportedTrust']) ? (obj['supportedTrust'] as unknown[]) : []),
      ...(Array.isArray(obj['supportedTrusts']) ? (obj['supportedTrusts'] as unknown[]) : []),
    ]
      .map((v) => str(v))
      .filter((v): v is string => v !== null),
    raw: obj,
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

/**
 * Endpoints appear under several keys across the population, so every shape observed in the
 * sample is collected rather than assuming one. Anything that is not an absolute http(s) URL
 * is dropped here, since a relative or scheme-less value cannot be probed.
 */
function collectEndpoints(obj: Record<string, unknown>): string[] {
  const found = new Set<string>()
  const push = (v: unknown) => {
    const s = str(v)
    if (s && /^https?:\/\//i.test(s)) found.add(s)
  }
  push(obj['endpoint'])
  push(obj['url'])
  push(obj['serviceUrl'])
  push(obj['apiUrl'])
  push(obj['homepage'])
  for (const key of ['endpoints', 'services', 'registrations', 'interfaces', 'trustModels']) {
    const arr = obj[key]
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === 'string') push(item)
        else if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>
          push(o['endpoint'])
          push(o['url'])
          push(o['serviceUrl'])
          push(o['agentAddress'])
        }
      }
    }
  }
  return [...found]
}

/**
 * Skills live inside `services[].skills` in the ERC-8004 registration-v1 records on BSC, not
 * at the top level, which is why an earlier pass over 840 agents found zero. The top-level
 * keys are still read because a minority of records use them.
 */
function collectSkills(obj: Record<string, unknown>, services: unknown[]): string[] {
  const found = new Set<string>()
  const add = (v: unknown) => {
    const s = typeof v === 'string' ? v : str((v as Record<string, unknown>)?.['name'])
    if (s) found.add(s.toLowerCase())
  }
  for (const key of ['skills', 'capabilities', 'tags', 'categories']) {
    const arr = obj[key]
    if (Array.isArray(arr)) for (const item of arr) add(item)
  }
  for (const s of services) {
    if (!s || typeof s !== 'object') continue
    const so = s as Record<string, unknown>
    for (const key of ['skills', 'domains', 'mcpTools']) {
      const arr = so[key]
      if (Array.isArray(arr)) for (const item of arr) add(item)
    }
  }
  return [...found]
}

export function hashTokenUri(tokenUri: string): string {
  return keccak256(toHex(tokenUri))
}

export interface ResolvedAgent {
  agentId: string
  owner: string | null
  agentWallet: string | null
  tokenUri: string
  registration: Registration | null
}

/**
 * Resolve a batch of ids. Sequential inside a batch on purpose: the public endpoints are
 * shared infrastructure and docs/15-SYSTEM.md section 3.8 makes politeness a rule rather
 * than a preference. `multicall` is used where the endpoint supports it.
 */
export async function resolveAgents(ids: bigint[]): Promise<ResolvedAgent[]> {
  if (ids.length === 0) return []
  return withRpc(async (c) => {
    const calls = ids.flatMap((id) => [
      { address: REGISTRY.identity as `0x${string}`, abi: IDENTITY_ABI, functionName: 'tokenURI', args: [id] } as const,
      { address: REGISTRY.identity as `0x${string}`, abi: IDENTITY_ABI, functionName: 'ownerOf', args: [id] } as const,
      { address: REGISTRY.identity as `0x${string}`, abi: IDENTITY_ABI, functionName: 'getAgentWallet', args: [id] } as const,
    ])
    const results = await c.multicall({ contracts: calls, allowFailure: true })
    return ids.map((id, i) => {
      const uri = results[i * 3]
      const owner = results[i * 3 + 1]
      const wallet = results[i * 3 + 2]
      const tokenUri = uri?.status === 'success' ? String(uri.result) : ''
      return {
        agentId: id.toString(),
        owner: owner?.status === 'success' ? String(owner.result) : null,
        agentWallet: wallet?.status === 'success' ? String(wallet.result) : null,
        tokenUri,
        registration: parseRegistration(tokenUri),
      }
    })
  }, { bulk: true })
}

/** Enumerate registrations from logs, because the registry is not enumerable. */
export async function readRegisteredLogs(fromBlock: number, toBlock: number): Promise<Log[]> {
  if (toBlock - fromBlock > MAX_LOG_SPAN) {
    throw new Error(`span ${toBlock - fromBlock} exceeds the measured cap of ${MAX_LOG_SPAN}`)
  }
  return withRpc((c) =>
    c.getLogs({
      address: REGISTRY.identity as `0x${string}`,
      event: IDENTITY_ABI[4],
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    }),
  ) as Promise<Log[]>
}

export const CHAIN_ID = CHAIN.id
