import { readFileSync } from 'node:fs'
const HERE = new URL('.', import.meta.url).pathname
export const SIG = JSON.parse(readFileSync(HERE + 'sigs.json', 'utf8'))
const RPCS = ['https://bsc-rpc.publicnode.com','https://bsc-dataseed.binance.org','https://binance.llamarpc.com']
let rpcIdx = 0, id = 1
export async function rpc(method, params) {
  for (let a = 0; a < 6; a++) {
    const url = RPCS[rpcIdx % RPCS.length]
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: id++, method, params }) })
      if (!r.ok) throw new Error('http ' + r.status)
      const j = await r.json()
      if (j.error) return { error: j.error.message }
      return { result: j.result }
    } catch (e) { rpcIdx++; await new Promise(s => setTimeout(s, 400 * (a + 1))) }
  }
  return { error: 'rpc exhausted' }
}
export const padA = (a) => String(a).replace(/^0x/, '').toLowerCase().padStart(64, '0')
export const padN = (n) => BigInt(n).toString(16).padStart(64, '0')
export const w = (hex, i) => '0x' + hex.slice(2 + i * 64, 2 + (i + 1) * 64)
export const num = (hex) => (hex && hex !== '0x' && hex.length >= 66) ? BigInt(w(hex, 0)) : null
export const addr = (hex) => (hex && hex.length >= 66) ? '0x' + hex.slice(26, 66) : null
export async function view(to, sigName, args = [], block = 'latest') {
  const s = SIG[sigName]
  if (!s) throw new Error('unknown sig ' + sigName)
  const data = s + args.map(x => (typeof x === 'string' && x.startsWith('0x')) ? padA(x) : padN(x)).join('')
  return rpc('eth_call', [{ to, data }, block])
}
export function decStr(hex) {
  if (!hex || hex === '0x') return null
  try {
    const off = Number(BigInt(w(hex, 0)))
    const len = Number(BigInt('0x' + hex.slice(2 + off * 2, 2 + off * 2 + 64)))
    return Buffer.from(hex.slice(2 + off * 2 + 64, 2 + off * 2 + 64 + len * 2), 'hex').toString('utf8')
  } catch { return null }
}
export const sleep = (ms) => new Promise(s => setTimeout(s, ms))
