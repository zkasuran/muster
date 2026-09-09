/**
 * The Revoke control on /altana posts here. It is wired to the real revoke path rather than faked:
 * it reads the chain first, so it tells the truth about whether there is anything to revoke. When
 * there is, it names the exact admin command. The revoke itself is an admin write through the Altana
 * relay, which needs the admin key and the Altana SDK, so on this deployment it is a handoff. Nothing
 * here signs or sends a transaction. See docs/16-ALTANA.md.
 */
import { ALTANA_AGENTS, readLiveSession, DEFAULT_READ_CHAIN, keyExplorerUrl, type AltanaChainId } from '@/lib/altana'

export const dynamic = 'force-dynamic'

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
}

function reply(status: number, heading: string, lines: string[]): Response {
  const body = lines.map((l) => `<p>${esc(l)}</p>`).join('')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Revoke session</title><style>body{background:#0B0E11;color:#e7e7ea;font:15px/1.6 system-ui,sans-serif;margin:0;padding:2.5rem 1.25rem}main{max-width:44rem;margin:0 auto}h1{color:#F0B90B;font-size:1.4rem}code{background:#15181d;padding:.15rem .35rem;border-radius:.25rem;word-break:break-all}a{color:#F0B90B}p{margin:.6rem 0}</style></head><body><main><h1>${esc(heading)}</h1>${body}<p><a href="/altana">Back to the session panel</a></p></main></body></html>`
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData().catch(() => null)
  const agentId = String(form?.get('agentId') ?? '')
  const chainId: AltanaChainId = Number(form?.get('chainId')) === 56 ? 56 : DEFAULT_READ_CHAIN
  const agent = ALTANA_AGENTS.find((a) => a.agentId === agentId)
  if (!agent) return reply(400, 'Unknown agent', ['No agent matches that id. Nothing was done.'])

  const live = await readLiveSession(chainId, agent.wallet, agent.keyId, agent.keyHash)
  const net = chainId === 56 ? 'BSC mainnet' : 'BSC testnet'

  if (live.error) {
    return reply(502, 'Could not read the chain', [
      `The ${net} node did not answer, so the session state is unknown right now and nothing was changed.`,
      `Reason: ${live.error}`,
    ])
  }
  if (!live.registered) {
    return reply(200, 'Nothing to revoke yet', [
      `${agent.name} has no session key registered on ${net}. There is nothing on chain to revoke.`,
      'Once a session is granted and registered in the Keystore, this control revokes it.',
    ])
  }
  if (live.valid === false) {
    return reply(200, 'Already revoked or expired', [
      `${agent.name}'s session key is registered but isValidKey is false, so it is already revoked or expired on ${net}. Nothing to do.`,
    ])
  }
  // Registered and live. The revoke is a real admin write, held as a handoff on this deployment.
  return reply(200, 'Revoke is an admin write, run it from the operator machine', [
    `${agent.name}'s session is live on ${net}. Revoking it is one admin call through the Altana relay, which needs the wallet's admin key (held under .hq/altana, never on this web server) and the Altana SDK.`,
    'Run, from the lane root, with the admin key present:',
    'npm install @altananetwork/sdk@0.9.0',
    `node -e "import('@altananetwork/sdk').then(async ({createClient,BNB_TESTNET,signerFromPrivateKey})=>{const c=createClient({chains:[BNB_TESTNET]});await c.revokeSession({wallet,signer:admin,session:'${agent.keyId}'})})"`,
    `After it lands, isValidKey(${agent.wallet}, ${agent.keyId}) is false and the key drops out of getKeys within one block. Check it at ${keyExplorerUrl(chainId, agent.keyId)}`,
  ])
}
