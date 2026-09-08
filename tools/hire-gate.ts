/** End-to-end gate on the live hire path, with a throwaway key, no browser and no money. */
import { privateKeyToAccount } from 'viem/accounts'
const BASE = process.env.BASE ?? 'https://muster.zkasuran.dev'
const post = async (body: unknown) => {
  const r = await fetch(`${BASE}/api/hire`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const raw = await r.text()
  let json: Record<string, unknown>
  try { json = JSON.parse(raw) as Record<string, unknown> } catch { json = { error: `non-JSON body (${raw.length} bytes)` } }
  return { status: r.status, json }
}
let fails = 0
const check = (label: string, ok: boolean, detail = '') => { if (!ok) fails++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`) }

console.log('=== pages ===')
for (const s of ['rebalancing', 'grid-trading', 'yield', 'health-factor', 'nope']) {
  const r = await fetch(`${BASE}/hire/${s}`)
  const html = await r.text()
  const want = s === 'nope' ? 404 : 200
  check(`/hire/${s} -> ${r.status}`, r.status === want, want === 200 ? (html.includes('Sign a real authorization') && html.includes('Run a free sample') ? 'sections present' : 'SECTIONS MISSING') : '')
}

console.log('\n=== sample: real work, free, labelled ===')
const t0 = Date.now()
const sample = await post({ action: 'sample', shelf: 'health-factor' })
check(`sample -> ${sample.status}`, sample.status === 200, `${Date.now() - t0} ms`)
check('sample is labelled as a sample', sample.json['sample'] === true && String(sample.json['note']).includes('sample'))
const res = sample.json['result'] as Record<string, unknown> | undefined
check('sample returns a real health factor with a block', typeof res?.['healthFactor'] === 'number' && typeof res?.['atBlock'] === 'number', `hf=${res?.['healthFactor']} block=${res?.['atBlock']}`)

console.log('\n=== typed data ===')
const key = ('0x' + '22'.repeat(32)) as `0x${string}`
const acct = privateKeyToAccount(key)
const offer = await post({ action: 'typed-data', shelf: 'yield', from: acct.address })
check(`typed-data -> ${offer.status}`, offer.status === 200)
const td = offer.json['typedData'] as { domain: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }
check('domain is USD1 on chain 56', td?.domain?.['name'] === 'World Liberty Financial USD' && td?.domain?.['version'] === '1' && Number(td?.domain?.['chainId']) === 56)
check('primaryType is TransferWithAuthorization', td?.primaryType === 'TransferWithAuthorization')
check('message.from is the buyer, to is the payout', String(td?.message?.['from']).toLowerCase() === acct.address.toLowerCase() && String(td?.message?.['to']).toLowerCase() === String(offer.json['payTo']).toLowerCase())
check('value is the yield price 0.02 USD1', td?.message?.['value'] === '20000000000000000', String(offer.json['amountHuman']))

console.log('\n=== sign it, verify it ===')
const sig = await acct.signTypedData(td as never)
const ok = await post({ action: 'verify', shelf: 'yield', from: acct.address, signature: sig, nonce: offer.json['nonce'], validAfter: offer.json['validAfter'], validBefore: offer.json['validBefore'] })
check(`verify -> ${ok.status}`, ok.status === 200, String(ok.json['error'] ?? ''))
check('signer recovered equals the throwaway account', String(ok.json['signer']).toLowerCase() === acct.address.toLowerCase())
check('balance was read and is honest (throwaway key holds 0 USD1)', ok.json['balanceCovers'] === false, `balance=${ok.json['signerBalanceHuman']}`)
check('settlement is reported pending, never as done', ok.json['settlement'] === 'pending_merchant_account')
const env = ok.json['envelope'] as Record<string, unknown>
check('envelope is a valid x402 eip3009 shape', env?.['scheme'] === 'eip3009' && env?.['network'] === 'eip155:56' && typeof (env?.['payload'] as Record<string, unknown>)?.['signature'] === 'string')

console.log('\n=== the guard rails ===')
const other = privateKeyToAccount(('0x' + '33'.repeat(32)) as `0x${string}`)
const wrong = await post({ action: 'verify', shelf: 'yield', from: other.address, signature: sig, nonce: offer.json['nonce'], validAfter: offer.json['validAfter'], validBefore: offer.json['validBefore'] })
check(`a signature presented by the wrong address is refused -> ${wrong.status}`, wrong.status === 400, String(wrong.json['error']).slice(0, 80))
const replay = await post({ action: 'verify', shelf: 'yield', from: acct.address, signature: sig, nonce: offer.json['nonce'], validAfter: offer.json['validAfter'], validBefore: offer.json['validBefore'] })
check(`the same nonce a second time is refused cleanly -> ${replay.status}`, replay.status === 409, String(replay.json['error'] ?? '').slice(0, 80))
const expired = await post({ action: 'verify', shelf: 'yield', from: acct.address, signature: sig, nonce: '0x' + 'ab'.repeat(32), validAfter: 1, validBefore: 2 })
check(`an expired window is refused -> ${expired.status}`, expired.status === 400)
const bad = await post({ action: 'typed-data', shelf: 'yield', from: 'not-an-address' })
check(`a bad address is refused -> ${bad.status}`, bad.status === 400)
console.log(`\n=== ${fails === 0 ? 'HIRE PATH PASSES' : fails + ' FAILURE(S)'} ===`)
process.exit(fails ? 1 : 0)
