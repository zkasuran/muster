/**
 * Independent re-verification of lib/b402.ts. Nothing here reads the module's own gate output:
 * every hash is recomputed locally and every separator is read off the chain in this process.
 */
import {
  createPublicClient,
  http,
  keccak256,
  toHex,
  hashTypedData,
  hashDomain,
  hashStruct,
  getAddress,
  recoverTypedDataAddress,
  parseAbi,
} from 'viem'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { CHAIN, EIP712, PERMIT2, TOKENS } from '../lib/constants.ts'
import { build402, transferWithAuthorizationTypedData, permit2TypedData, verifyPayment, settlePayment } from '../lib/b402.ts'

const RPC = process.env['RPC'] ?? 'https://bsc-rpc.publicnode.com'
const client = createPublicClient({ transport: http(RPC) })
const ABI = parseAbi([
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function WITNESS_TYPE_STRING() view returns (string)',
  'function WITNESS_TYPEHASH() view returns (bytes32)',
])

let fails = 0
function check(label: string, got: unknown, want: unknown): void {
  const ok = String(got).toLowerCase() === String(want).toLowerCase()
  if (!ok) fails += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}\n      got  ${got}\n      want ${want}`)
}

const k = (s: string) => keccak256(toHex(s))

console.log('== 1. typehashes recomputed locally ==')
check(
  'EIP712Domain typehash',
  k('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
  EIP712.domainTypehash,
)
check(
  'TransferWithAuthorization typehash',
  k('TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)'),
  EIP712.transferWithAuthorizationTypehash,
)
check(
  'ReceiveWithAuthorization typehash',
  k('ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)'),
  EIP712.receiveWithAuthorizationTypehash,
)

console.log('\n== 2. domain separators, local vs on chain ==')
const sep = (name: string, version: string, verifyingContract: string, chainId = CHAIN.id) =>
  hashDomain({
    domain: { name, version, chainId, verifyingContract: getAddress(verifyingContract) },
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    },
  })

const usd1OnChain = await client.readContract({ address: getAddress(TOKENS.USD1.address), abi: ABI, functionName: 'DOMAIN_SEPARATOR' })
const uOnChain = await client.readContract({ address: getAddress(TOKENS.U.address), abi: ABI, functionName: 'DOMAIN_SEPARATOR' })
const permit2OnChain = await client.readContract({ address: getAddress(PERMIT2.address), abi: ABI, functionName: 'DOMAIN_SEPARATOR' })
console.log(`on-chain USD1 DOMAIN_SEPARATOR   ${usd1OnChain}`)
console.log(`on-chain U    DOMAIN_SEPARATOR   ${uOnChain}`)
console.log(`on-chain P2   DOMAIN_SEPARATOR   ${permit2OnChain}`)

check('USD1 domain from constants reproduces chain', sep(EIP712.domains.USD1.name, EIP712.domains.USD1.version, TOKENS.USD1.address), usd1OnChain)

console.log('\n-- U derivation, the four candidates --')
const uCandidates: [string, string, string][] = [
  ['United Stables', '1', sep('United Stables', '1', TOKENS.U.address)],
  ['United Stables', '2', sep('United Stables', '2', TOKENS.U.address)],
  ['U', '1', sep('U', '1', TOKENS.U.address)],
  ['U', '2', sep('U', '2', TOKENS.U.address)],
]
for (const [name, version, hash] of uCandidates) {
  const hit = hash.toLowerCase() === uOnChain.toLowerCase()
  console.log(`  ${hit ? 'MATCH  ' : 'no     '} name=${JSON.stringify(name)} version=${JSON.stringify(version)}  ${hash}`)
}
const uMatch = uCandidates.filter(([, , h]) => h.toLowerCase() === uOnChain.toLowerCase())
check('exactly one U candidate matches', uMatch.length, 1)
check('U name() on chain', await client.readContract({ address: getAddress(TOKENS.U.address), abi: ABI, functionName: 'name' }), 'United Stables')

console.log('\n-- the two exclusion hashes quoted in the b402.ts comment --')
check('version "2" exclusion hash', uCandidates[1]![2], '0xa979004e3f8b7ce3772329e44fcdc8cc97bc7777fc99e0698b4e28a9c4ca07e2')
check('name "U" exclusion hash', uCandidates[2]![2], '0xd63e0976c5cbc2cc374be6701de5fff64e2eda4d1feeb73ed59472ed61fb5bff')

console.log('\n== 3. decimals read at runtime ==')
for (const t of ['USD1', 'U'] as const) {
  const d = await client.readContract({ address: getAddress(TOKENS[t].address), abi: ABI, functionName: 'decimals' })
  check(`${t} decimals`, d, 18)
}

console.log('\n== 4. Permit2, three-field separator ==')
const p2Local = hashDomain({
  domain: { name: 'Permit2', chainId: CHAIN.id, verifyingContract: getAddress(PERMIT2.address) },
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
  },
})
check('Permit2 3-field separator reproduces chain', p2Local, permit2OnChain)
check('Permit2 separator in constants', PERMIT2.domainSeparatorBsc, permit2OnChain)
const p2WithVersion = sep('Permit2', '1', PERMIT2.address)
console.log(`  adding a version key gives ${p2WithVersion}, which is not the chain value`)
check('a version key changes the separator', p2WithVersion === permit2OnChain, false)

console.log('\n== 5. the exact Permit2 proxy, read on chain ==')
const EXACT_PROXY = '0x402085c248EeA27D92E8b30b2C58ed07f9E20001'
try {
  const wts = await client.readContract({ address: getAddress(EXACT_PROXY), abi: ABI, functionName: 'WITNESS_TYPE_STRING' })
  const wth = await client.readContract({ address: getAddress(EXACT_PROXY), abi: ABI, functionName: 'WITNESS_TYPEHASH' })
  check(
    'WITNESS_TYPE_STRING()',
    wts,
    'Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)',
  )
  check('WITNESS_TYPEHASH() equals keccak of the witness type', wth, k('Witness(address to,uint256 validAfter)'))
  const stub = 'PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,'
  console.log(`  full type string keccak ${k(stub + wts)}`)
} catch (e) {
  console.log(`  READ FAILED ${(e as Error).message.slice(0, 200)}`)
  fails += 1
}

console.log('\n== 6. build402 ==')
const SELLER = '0x89e9e1ab11dd1b138b1dce6d6a4a0926aafd5029'
const quote = build402({
  resource: 'https://muster.example/api/agents/1/hire',
  description: 'One rebalance plan for a BSC portfolio',
  priceBase: '10000000000000000',
  token: 'USD1',
  payTo: SELLER,
})
console.log(JSON.stringify(quote, null, 2))
check('status', quote.status, 402)
check('x402Version', quote.body.x402Version, 2)
check('asset is USD1 checksummed', quote.body.accepts[0]!.asset, getAddress(TOKENS.USD1.address))
check('payTo checksummed', quote.body.accepts[0]!.payTo, getAddress(SELLER))
check('extra.name', quote.body.accepts[0]!.extra.name, 'World Liberty Financial USD')
check('one cent of USD1 in atomic units', String(10n ** 16n), '10000000000000000')
for (const bad of ['0', '-1', '1.5', '0x10', '', '01'] as const) {
  let threw = false
  try {
    build402({ resource: 'https://x.example/a', description: 'd', priceBase: bad, token: 'USD1', payTo: SELLER })
  } catch {
    threw = true
  }
  check(`priceBase ${JSON.stringify(bad)} refused`, threw, true)
}
let netThrew = false
try {
  build402({ resource: 'https://x.example/a', description: 'd', priceBase: '1', token: 'USD1', payTo: SELLER, network: 'eip155:97' })
} catch {
  netThrew = true
}
check('testnet network refused', netThrew, true)

console.log('\n== 7. the eip3009 typed data, hashed then signed then recovered ==')
const pk = generatePrivateKey()
const buyer = privateKeyToAccount(pk)
const now = Math.floor(Date.now() / 1000)
const nonce = '0x' + Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')
const td = transferWithAuthorizationTypedData({
  token: 'USD1',
  from: buyer.address,
  to: SELLER,
  value: '10000000000000000',
  validAfter: now - 60,
  validBefore: now + 300,
  nonce,
}) as Parameters<typeof hashTypedData>[0]
console.log(JSON.stringify(td, null, 2))
const dsep = hashDomain({ domain: td.domain as Record<string, unknown>, types: td.types as never })
const shash = hashStruct({ data: td.message as never, primaryType: 'TransferWithAuthorization', types: td.types as never })
console.log(`  domain separator ${dsep}`)
console.log(`  struct hash      ${shash}`)
check('typed data domain separator equals the on-chain one', dsep, usd1OnChain)
check('digest equals 0x1901 || D || S', hashTypedData(td), keccak256(`0x1901${dsep.slice(2)}${shash.slice(2)}` as `0x${string}`))
// A hand-rolled struct hash off the raw typehash, to prove viem's encoding is the ERC's encoding.
const manual = keccak256(
  ('0x' +
    EIP712.transferWithAuthorizationTypehash.slice(2) +
    buyer.address.slice(2).toLowerCase().padStart(64, '0') +
    getAddress(SELLER).slice(2).toLowerCase().padStart(64, '0') +
    (10n ** 16n).toString(16).padStart(64, '0') +
    BigInt(now - 60).toString(16).padStart(64, '0') +
    BigInt(now + 300).toString(16).padStart(64, '0') +
    nonce.slice(2)) as `0x${string}`,
)
check('struct hash matches a hand-rolled abi.encode', shash, manual)
const sig = await buyer.signTypedData(td as never)
const recovered = await recoverTypedDataAddress({ ...(td as never), signature: sig })
check('recovered signer equals the buyer', recovered, buyer.address)
console.log(`  signature ${sig}`)

// Numeric fields travel as decimal strings. Prove that hashes identically to bigints.
const asBigints = { ...td, message: { ...(td.message as Record<string, unknown>), value: 10n ** 16n, validAfter: BigInt(now - 60), validBefore: BigInt(now + 300) } }
check('decimal strings hash the same as bigints', hashTypedData(td), hashTypedData(asBigints as never))

let chainThrew = false
try {
  transferWithAuthorizationTypedData({ token: 'U', from: buyer.address, to: SELLER, value: '1', validAfter: now, validBefore: now + 10, nonce, chainId: 97 })
} catch {
  chainThrew = true
}
check('chainId 97 refused on the 3009 path', chainThrew, true)
let windowThrew = false
try {
  transferWithAuthorizationTypedData({ token: 'USD1', from: buyer.address, to: SELLER, value: '1', validAfter: now + 10, validBefore: now, nonce })
} catch {
  windowThrew = true
}
check('validBefore before validAfter refused', windowThrew, true)

console.log('\n== 8. the U typed data signs under the derived domain ==')
const tdU = transferWithAuthorizationTypedData({
  token: 'U',
  from: buyer.address,
  to: SELLER,
  value: '250000000000000000',
  validAfter: now - 60,
  validBefore: now + 300,
  nonce,
}) as Parameters<typeof hashTypedData>[0]
check('U typed data separator equals the on-chain one', hashDomain({ domain: tdU.domain as Record<string, unknown>, types: tdU.types as never }), uOnChain)
const sigU = await buyer.signTypedData(tdU as never)
check('U recovered signer', await recoverTypedDataAddress({ ...(tdU as never), signature: sigU }), buyer.address)

console.log('\n== 9. the Permit2 shape ==')
const p2 = permit2TypedData({
  token: TOKENS.USDT.address,
  amount: '5000000000000000',
  spender: EXACT_PROXY,
  nonce: '0x' + Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex'),
  deadline: now + 3600,
  payTo: SELLER,
  validAfter: now - 60,
}) as Parameters<typeof hashTypedData>[0]
console.log(JSON.stringify(p2, null, 2))
const p2sep = hashDomain({ domain: p2.domain as Record<string, unknown>, types: p2.types as never })
check('Permit2 typed data separator equals the on-chain one', p2sep, permit2OnChain)
const p2struct = hashStruct({ data: p2.message as never, primaryType: 'PermitWitnessTransferFrom', types: p2.types as never })
console.log(`  struct hash ${p2struct}`)
check('digest equals 0x1901 || D || S', hashTypedData(p2), keccak256(`0x1901${p2sep.slice(2)}${p2struct.slice(2)}` as `0x${string}`))
check(
  'PermitWitnessTransferFrom typehash matches the R03 value',
  k('PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)'),
  '0xebc156cd23678a74c94df13d772ef5478420637f0c94bd10d509e1dc98f521c7',
)
const p2sig = await buyer.signTypedData(p2 as never)
check('Permit2 recovered signer', await recoverTypedDataAddress({ ...(p2 as never), signature: p2sig }), buyer.address)
check('no version key in the Permit2 domain', 'version' in (p2.domain as Record<string, unknown>), false)
check('primaryType', p2.primaryType, 'PermitWitnessTransferFrom')
const p2dec = permit2TypedData({ token: TOKENS.USDT.address, amount: '1', spender: EXACT_PROXY, nonce: '123456789', deadline: now + 60, payTo: SELLER, validAfter: now - 60 }) as { message: { nonce: string } }
check('decimal nonce passes through', p2dec.message.nonce, '123456789')
const p2hex = permit2TypedData({ token: TOKENS.USDT.address, amount: '1', spender: EXACT_PROXY, nonce: '0xff', deadline: now + 60, payTo: SELLER, validAfter: now - 60 }) as { message: { nonce: string } }
check('hex nonce converts to decimal', p2hex.message.nonce, '255')

console.log('\n== 10. facilitator calls with no credentials ==')
const v = await verifyPayment({ x402Version: 2, paymentPayload: {}, paymentRequirements: {} })
console.log(v)
check('verify is not valid', v.isValid, false)
check('verify names the missing credentials', /B402_BASE_URL/.test(String(v.reason)), true)
const s = await settlePayment({ x402Version: 2, paymentPayload: {}, paymentRequirements: {} })
console.log(s)
check('settle is not a success', s.success, false)
check('settle transaction is null, not an empty string', s.transaction, null)
check('settle names the missing credentials', /B402_BASE_URL/.test(String(s.errorReason)), true)
const bad = await verifyPayment({ x402Version: 1, paymentPayload: {}, paymentRequirements: {} })
check('wrong x402Version is caught before any network call', bad.reason, 'invalid_x402_version')
const noReq = await verifyPayment({ paymentPayload: {} })
check('missing requirements named', noReq.reason, 'invalid_payment_requirements')

console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : `${fails} CHECK(S) FAILED`}`)
process.exit(fails === 0 ? 0 : 1)
