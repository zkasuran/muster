/**
 * Gate for lib/b402.ts. Nothing here is asserted from a document. viem builds each typed data
 * document, `cast` reads the separator and the typehash the contracts themselves hold, a
 * throwaway key signs and the signer is recovered back out of the signature.
 *
 * Run: node --experimental-strip-types --no-warnings tools/b402-gate.ts
 */
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createPublicKey, createVerify, generateKeyPairSync, randomBytes } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import { concat, getAddress, hashDomain, hashStruct, hashTypedData, keccak256, recoverTypedDataAddress, toHex } from 'viem'
import type { PrivateKeyAccount } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
  build402,
  permit2TypedData,
  settlePayment,
  transferWithAuthorizationTypedData,
  verifyPayment,
} from '../lib/b402.ts'
import { CHAIN, EIP712, PERMIT2, TOKENS } from '../lib/constants.ts'
import { ENDPOINTS } from '../lib/rpc.ts'

interface Field {
  name: string
  type: string
}
interface Doc {
  types: Record<string, Field[]>
  domain: Record<string, string | number>
  primaryType: string
  message: Record<string, unknown>
}
type ViemTyped = Parameters<typeof hashTypedData>[0]

const RPC = ENDPOINTS[0]
let failures = 0

function check(label: string, got: unknown, want: unknown): void {
  const ok = String(got).toLowerCase() === String(want).toLowerCase()
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
  console.log(`     got  ${String(got)}`)
  if (!ok) console.log(`     want ${String(want)}`)
}

function castCall(address: string, sig: string): string {
  return execFileSync('cast', ['call', address, sig, '--rpc-url', RPC], { encoding: 'utf8' }).trim()
}

function refuses(label: string, fn: () => unknown): void {
  try {
    fn()
    failures += 1
    console.log(`FAIL ${label} was accepted`)
  } catch (e) {
    console.log(`PASS refuses ${label}`)
    console.log(`     ${(e instanceof Error ? e.message : String(e)).slice(0, 140)}`)
  }
}

/** EIP-712 encodeType, written out here so the type string is not viem checking its own work. */
function typeString(types: Record<string, Field[]>, primary: string): string {
  const deps = new Set<string>()
  const walk = (t: string): void => {
    const base = t.replace(/\[\d*\]$/, '')
    if (base === primary || deps.has(base) || !types[base]) return
    deps.add(base)
    for (const f of types[base] ?? []) walk(f.type)
  }
  for (const f of types[primary] ?? []) walk(f.type)
  const one = (n: string): string => `${n}(${(types[n] ?? []).map((f) => `${f.type} ${f.name}`).join(',')})`
  return one(primary) + [...deps].sort().map(one).join('')
}

function domainSeparator(doc: Doc): string {
  return separatorOf(doc.domain, doc.types['EIP712Domain'] ?? [])
}

/** viem infers the typed-data generic off `types`, so the domain shape needs the cast. */
function separatorOf(domain: Record<string, string | number>, fields: Field[]): string {
  return hashDomain({ domain, types: { EIP712Domain: fields } } as unknown as Parameters<typeof hashDomain>[0])
}

function structHash(doc: Doc): string {
  return hashStruct({ data: doc.message, primaryType: doc.primaryType, types: doc.types })
}

/** Sign with a key that exists for one run only, then recover the signer from the signature. */
async function signAndRecover(doc: Doc, account: PrivateKeyAccount, label: string): Promise<void> {
  const signature = await account.signTypedData(doc as unknown as ViemTyped)
  const recovered = await recoverTypedDataAddress({
    ...(doc as unknown as ViemTyped),
    signature,
  } as Parameters<typeof recoverTypedDataAddress>[0])
  console.log(`     signer    ${account.address}`)
  console.log(`     signature ${signature.slice(0, 34)}... (${(signature.length - 2) / 2} bytes)`)
  check(`${label} recovered signer equals the signer`, recovered, account.address)
}

const DOMAIN4: Field[] = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

console.log(`chain ${CHAIN.caip2} over ${RPC}`)

console.log('\n=== 1. U domain, derived because eip712Domain() reverts on this token ===')
const uOnChain = castCall(TOKENS.U.address, 'DOMAIN_SEPARATOR()(bytes32)')
console.log(`cast DOMAIN_SEPARATOR() ${uOnChain}`)
const candidates: [string, string][] = [
  ['United Stables', '1'],
  ['United Stables', '2'],
  ['U', '1'],
  ['U', '2'],
]
let uMatch = 'no candidate matched'
for (const [name, version] of candidates) {
  const sep = separatorOf({ name, version, chainId: CHAIN.id, verifyingContract: TOKENS.U.address }, DOMAIN4)
  const hit = sep.toLowerCase() === uOnChain.toLowerCase()
  if (hit) uMatch = `name ${name} version ${version}`
  console.log(`  ${hit ? 'MATCH  ' : 'no     '} name ${JSON.stringify(name)} version ${JSON.stringify(version)} -> ${sep}`)
}
check('U domain settled by match and exclusion', uMatch, 'name United Stables version 1')

console.log('\n=== 2. USD1 eip3009 typed data, the one-signature hire ===')
const payer = privateKeyToAccount(generatePrivateKey())
// The largest B402 Bazaar merchant payout address, lowercased as the index publishes it, so the
// checksumming in the module is exercised on a real seller rather than a tidy literal.
const SELLER = '0x50ab2018c06c6e4eaa9ba52057eb55ed284912fc'
const nonce = `0x${randomBytes(32).toString('hex')}`
const now = Math.floor(Date.now() / 1000)
check('USD1 decimals() read at runtime', castCall(TOKENS.USD1.address, 'decimals()(uint8)'), '18')
const usd1 = transferWithAuthorizationTypedData({
  token: 'USD1',
  from: payer.address,
  to: SELLER,
  // 0.1 USD1 at 18 decimals, the modal price across the 979 live Bazaar entries.
  value: '100000000000000000',
  validAfter: now - 60,
  validBefore: now + 300,
  nonce,
}) as Doc
console.log(`     domain      ${JSON.stringify(usd1.domain)}`)
console.log(`     primaryType ${usd1.primaryType}`)
console.log(`     message     ${JSON.stringify(usd1.message)}`)
const usd1Sep = domainSeparator(usd1)
check(
  'USD1 domain separator equals DOMAIN_SEPARATOR() read with cast',
  usd1Sep,
  castCall(TOKENS.USD1.address, 'DOMAIN_SEPARATOR()(bytes32)'),
)
const usd1Type = typeString(usd1.types, usd1.primaryType)
console.log(`     type string ${usd1Type}`)
check(
  "TransferWithAuthorization typehash equals the token's own constant",
  keccak256(toHex(usd1Type)),
  castCall(TOKENS.USD1.address, 'TRANSFER_WITH_AUTHORIZATION_TYPEHASH()(bytes32)'),
)
check(
  'and equals the typehash already recorded in lib/constants.ts',
  keccak256(toHex(usd1Type)),
  EIP712.transferWithAuthorizationTypehash,
)
const usd1Struct = structHash(usd1)
console.log(`     struct hash ${usd1Struct}`)
const usd1Digest = hashTypedData(usd1 as unknown as ViemTyped)
check(
  'digest equals keccak(0x1901 || domainSeparator || structHash)',
  usd1Digest,
  keccak256(concat(['0x1901', usd1Sep as `0x${string}`, usd1Struct as `0x${string}`])),
)
await signAndRecover(usd1, payer, 'USD1 eip3009')
check('recovered signer equals authorization.from', usd1.message['from'], payer.address)

console.log('\n=== 3. U eip3009 typed data, on the derived domain ===')
const uDoc = transferWithAuthorizationTypedData({
  token: 'U',
  from: payer.address,
  to: SELLER,
  value: '100000000000000000',
  validAfter: now - 60,
  validBefore: now + 300,
  nonce,
}) as Doc
console.log(`     domain      ${JSON.stringify(uDoc.domain)}`)
check('U domain separator built by the module equals the on-chain value', domainSeparator(uDoc), uOnChain)
console.log(`     struct hash ${structHash(uDoc)}`)
// The struct hash is the same as USD1's because the struct hash does not carry the domain. The
// digest must still differ, or a USD1 authorization would replay against U.
check(
  'the same authorization under U gives a different digest, so it cannot replay across tokens',
  hashTypedData(uDoc as unknown as ViemTyped) === usd1Digest,
  false,
)
await signAndRecover(uDoc, payer, 'U eip3009')

console.log('\n=== 4. Permit2 permit2-exact typed data, the USDT path ===')
// x402ExactPermit2Proxy, which is what extra.spenderAddress carries. Named here rather than in
// the module because Binance redeploys it and says to read it fresh from /supported.
const EXACT_PROXY = '0x402085c248EeA27D92E8b30b2C58ed07f9E20001'
const permit = permit2TypedData({
  token: TOKENS.USDT.address,
  amount: '100000000000000000',
  spender: EXACT_PROXY,
  nonce,
  deadline: now + 3600,
  payTo: SELLER,
  validAfter: now - 60,
}) as Doc
console.log(`     domain      ${JSON.stringify(permit.domain)}`)
console.log(`     primaryType ${permit.primaryType}`)
console.log(`     message     ${JSON.stringify(permit.message)}`)
check('Permit2 domain carries no version key', Object.keys(permit.domain).join(','), 'name,chainId,verifyingContract')
check(
  'Permit2 domain separator equals DOMAIN_SEPARATOR() read with cast',
  domainSeparator(permit),
  castCall(PERMIT2.address, 'DOMAIN_SEPARATOR()(bytes32)'),
)
const permitType = typeString(permit.types, permit.primaryType)
console.log(`     type string ${permitType}`)
check(
  'Witness typehash equals WITNESS_TYPEHASH() on the deployed exact proxy',
  keccak256(toHex(typeString(permit.types, 'Witness'))),
  castCall(EXACT_PROXY, 'WITNESS_TYPEHASH()(bytes32)'),
)
// Permit2 builds the digest as this stub concatenated with the witness type string the proxy
// hands it, so string equality here proves field order, struct naming and dependency order
// against the deployed contract rather than against a doc.
const STUB = 'PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,'
const witnessTypeString = JSON.parse(castCall(EXACT_PROXY, 'WITNESS_TYPE_STRING()(string)')) as string
check('type string equals the stub plus WITNESS_TYPE_STRING() read with cast', permitType, STUB + witnessTypeString)
console.log(`     typehash    ${keccak256(toHex(permitType))}`)
console.log(`     struct hash ${structHash(permit)}`)
// The two nonce spellings have to sign the same struct, since the rails disagree on which one
// they hand out.
const permitDecimalNonce = permit2TypedData({
  token: TOKENS.USDT.address,
  amount: '100000000000000000',
  spender: EXACT_PROXY,
  nonce: BigInt(nonce).toString(),
  deadline: now + 3600,
  payTo: SELLER,
  validAfter: now - 60,
}) as Doc
check('a hex nonce and the same value in decimal hash alike', structHash(permitDecimalNonce), structHash(permit))
await signAndRecover(permit, payer, 'permit2-exact')

console.log('\n=== 5. The 402 a paid listing answers with ===')
const four02 = build402({
  resource: 'https://muster.zkasuran.dev/api/hire/56/1',
  description: 'One rebalancing run from agent 1 on BNB Smart Chain',
  priceBase: '100000000000000000',
  token: 'USD1',
  payTo: SELLER,
})
console.log(`HTTP ${four02.status}`)
console.log(JSON.stringify(four02.body, null, 2))
const accept = four02.body.accepts[0]
check('402 x402Version is 2', four02.body.x402Version, 2)
check('402 quotes the eip3009 method', accept?.scheme, 'eip3009')
check('402 asset is the USD1 contract, checksummed', accept?.asset, getAddress(TOKENS.USD1.address))
check('402 payTo is checksummed off the raw input', accept?.payTo, getAddress(SELLER))
check(
  '402 carries the domain the buyer has to sign under',
  JSON.stringify(accept?.extra),
  '{"name":"World Liberty Financial USD","version":"1"}',
)
check('402 omits signerAddress rather than inventing one', 'signerAddress' in (accept?.extra ?? {}), false)
refuses('a network with no verified token table', () =>
  build402({ resource: 'https://x.example/a', description: 'd', priceBase: '1', token: 'U', payTo: SELLER, network: 'eip155:97' }),
)
refuses('a zero price', () =>
  build402({ resource: 'https://x.example/a', description: 'd', priceBase: '0', token: 'U', payTo: SELLER }),
)
refuses('a resource that is not an absolute URL', () =>
  build402({ resource: '/api/hire', description: 'd', priceBase: '1', token: 'U', payTo: SELLER }),
)
refuses('an eip3009 nonce that is not 32 bytes', () =>
  transferWithAuthorizationTypedData({
    token: 'USD1',
    from: payer.address,
    to: SELLER,
    value: '1',
    validAfter: now - 60,
    validBefore: now + 300,
    nonce: '0x01',
  }),
)

console.log('\n=== 6. verify and settle with no merchant credentials, which is the real state ===')
for (const k of ['B402_BASE_URL', 'B402_CLIENT_ID', 'B402_ACCESS_TOKEN', 'B402_PRIVATE_KEY_B64']) {
  delete process.env[k]
}
const envelope = {
  x402Version: 2,
  paymentPayload: { x402Version: 2, payload: { signature: '0x00', authorization: usd1.message } },
  paymentRequirements: accept,
}
const vNone = await verifyPayment(envelope)
const sNone = await settlePayment(envelope)
console.log(`     verify -> ${JSON.stringify(vNone)}`)
console.log(`     settle -> ${JSON.stringify(sNone)}`)
check('verify refuses rather than passing', vNone.isValid, false)
check('verify names every missing credential', vNone.reason, 'b402_credentials_missing: B402_BASE_URL B402_CLIENT_ID B402_ACCESS_TOKEN B402_PRIVATE_KEY_B64')
check('verify reports no response body', vNone.raw, 'null')
check('settle refuses rather than reporting a payment', sNone.success, false)
check('settle reports no transaction', sNone.transaction, 'null')
const vBad = await verifyPayment({ paymentPayload: {} })
check('a malformed envelope is refused locally with the code B402 uses', vBad.reason, 'invalid_payment_requirements')
const vOld = await verifyPayment({ x402Version: 1, paymentPayload: {}, paymentRequirements: {} })
check('x402Version 1 is refused locally', vOld.reason, 'invalid_x402_version')

console.log('\n=== 7. The transport, against a LOCAL LOOPBACK DOUBLE. This is not B402 ===')
console.log('     Every line below is our own test server on 127.0.0.1 answering in the B402')
console.log('     envelope shape. It proves the merchant signature and the response mapping.')
console.log('     No payment exists and the double never answers success, so nothing here is')
console.log('     evidence about a real settlement.')
const rsa = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  publicKeyEncoding: { type: 'spki', format: 'der' },
})
const PENDING_HASH = `0x${'11'.repeat(32)}`
let signatureVerified = false
let mode: 'normal' | 'ratelimit' = 'normal'
// Loopback only, ephemeral port, closed at the end of the run, so nothing is exposed off host.
const server = createServer((req, res) => {
  const chunks: Buffer[] = []
  req.on('data', (c: Buffer) => chunks.push(c))
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8')
    const stamp = String(req.headers['x-tesla-timestamp'] ?? '')
    signatureVerified = createVerify('RSA-SHA256')
      .update(body + stamp, 'utf8')
      .verify(
        createPublicKey({ key: rsa.publicKey, format: 'der', type: 'spki' }),
        String(req.headers['x-tesla-signature'] ?? ''),
        'base64',
      )
    const declined = { isValid: false, invalidReason: 'insufficient_funds', payer: payer.address }
    const inFlight = { success: false, transaction: PENDING_HASH, network: CHAIN.caip2 }
    const payload =
      mode === 'ratelimit'
        ? { code: '1160405', message: null, success: false, data: null }
        : { code: '000000', message: null, success: true, data: req.url?.endsWith('/verify') ? declined : inFlight }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(payload))
  })
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
process.env['B402_CLIENT_ID'] = 'gate-client'
process.env['B402_ACCESS_TOKEN'] = 'gate-token'
process.env['B402_PRIVATE_KEY_B64'] = rsa.privateKey.toString('base64')
const vDouble = await verifyPayment(envelope, base)
console.log(`     [double] verify -> ${JSON.stringify({ isValid: vDouble.isValid, reason: vDouble.reason })}`)
check('[double] the merchant RSA-SHA256 signature verifies against its public key', signatureVerified, true)
check('[double] a decline carries invalidReason through', vDouble.reason, 'insufficient_funds')
const sPending = await settlePayment(envelope, base)
console.log(`     [double] settle -> ${JSON.stringify({ success: sPending.success, transaction: sPending.transaction, errorReason: sPending.errorReason })}`)
check('[double] broadcast and unresolved keeps the hash', sPending.transaction, PENDING_HASH)
check('[double] broadcast and unresolved invents no error reason', sPending.errorReason, 'null')
check('[double] pending is never reported as success', sPending.success, false)
mode = 'ratelimit'
const sLimited = await settlePayment(envelope, base)
check('[double] a transport code is named, not printed as a number', sLimited.errorReason, 'b402_1160405: exceeds payer daily limit')
check('[double] a transport failure reports no transaction', sLimited.transaction, 'null')
process.env['B402_PRIVATE_KEY_B64'] = 'not-a-key'
const sBadKey = await settlePayment(envelope, base)
check('[double] a malformed merchant key is named as a key problem', sBadKey.errorReason?.startsWith('b402_signing_failed'), true)
server.close()

console.log(`\n${failures === 0 ? 'GATE PASS' : `GATE FAIL, ${failures} check(s) failed`}`)
process.exitCode = failures === 0 ? 0 : 1
