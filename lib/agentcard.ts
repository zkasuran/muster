/**
 * Read what an agent's endpoint actually returned, and turn it into something a buyer can read.
 * Three machine shapes are live in the population: an A2A agent card (name, description, skills,
 * url, capabilities), an x402 challenge (accepts[]) and an OASF-style record. A fourth answer is
 * a web page meant for a browser, which is reported as such with only its title. Anything else
 * is kept as a short excerpt so the page shows what came back rather than nothing.
 */
export interface AgentCard {
  kind: 'a2a' | 'x402' | 'oasf' | 'json' | 'html' | 'text'
  name: string | null
  description: string | null
  url: string | null
  version: string | null
  skills: { id: string; name: string; description: string | null }[]
  capabilities: string[]
  accepts: { scheme: string; network: string; asset: string; amount: string }[]
  excerpt: string
}

export function parseAgentCard(body: string): AgentCard | null {
  if (!body || body.trim() === '') return null
  const excerpt = body.slice(0, 600)
  const head = body.slice(0, 400).trimStart().toLowerCase()
  if (head.startsWith('<!doctype') || head.startsWith('<html') || /<html[\s>]/.test(head)) {
    // A web page is an answer for a browser, not for an agent. Keep its title and nothing else, so
    // the page never shows a screenful of markup as if it were a capability record.
    const title = /<title[^>]*>([^<]{1,200})<\/title>/i.exec(body)?.[1]?.trim() ?? null
    const desc = /<meta\s+name=["']description["']\s+content=["']([^"']{1,400})["']/i.exec(body)?.[1]?.trim() ?? null
    return { kind: 'html', name: title, description: desc, url: null, version: null, skills: [], capabilities: [], accepts: [], excerpt: '' }
  }
  let o: Record<string, unknown>
  try {
    o = JSON.parse(body) as Record<string, unknown>
  } catch {
    return { kind: 'text', name: null, description: null, url: null, version: null, skills: [], capabilities: [], accepts: [], excerpt }
  }
  if (!o || typeof o !== 'object') return null
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const accepts = Array.isArray(o['accepts'])
    ? (o['accepts'] as Record<string, unknown>[]).map((a) => ({ scheme: str(a['scheme']) ?? '', network: str(a['network']) ?? '', asset: str(a['asset']) ?? '', amount: str(a['maxAmountRequired'] ?? a['amount']) ?? '' }))
    : []
  const skillsRaw = Array.isArray(o['skills']) ? (o['skills'] as unknown[]) : []
  const skills = skillsRaw.map((s) => {
    if (typeof s === 'string') return { id: s, name: s, description: null }
    const so = (s ?? {}) as Record<string, unknown>
    return { id: str(so['id']) ?? str(so['name']) ?? '', name: str(so['name']) ?? str(so['id']) ?? '', description: str(so['description']) }
  }).filter((s) => s.name)
  const caps = o['capabilities'] && typeof o['capabilities'] === 'object'
    ? Object.entries(o['capabilities'] as Record<string, unknown>).filter(([, v]) => v === true).map(([k]) => k)
    : []
  const kind: AgentCard['kind'] =
    accepts.length > 0 ? 'x402' :
    (o['protocolVersion'] || o['capabilities'] || (skills.length && o['url'])) ? 'a2a' :
    (o['services'] || o['type'] === 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1') ? 'oasf' : 'json'
  return {
    kind,
    name: str(o['name']),
    description: str(o['description']),
    url: str(o['url']) ?? str(o['endpoint']),
    version: str(o['version']) ?? str(o['protocolVersion']),
    skills,
    capabilities: caps,
    accepts,
    excerpt,
  }
}
