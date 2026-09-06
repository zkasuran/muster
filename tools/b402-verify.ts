/**
 * Independent re-check of lib/b402.ts. Nothing here trusts tools/b402-gate.ts: every separator is
 * recomputed locally then compared with a fresh `cast` read pasted in as ON_CHAIN below, every
 * typehash is recomputed from its type string. Both signing shapes are round-tripped through a
 * throwaway key so a wrong domain shows up as a recovered address that is not the signer.
 *
 * The digest identity is the load-bearing check. `hashTypedData` over the module's own document is
 * compared with keccak(0x1901 || locally recomputed separator || hand encoded struct hash), so one
 * equality covers the domain, the field order and the value encoding at once.
 *
 * Run: node --experimental-strip-types --no-warnings tools/b402-verify.ts
 */
import {
  encodeAbiParameters,
  getAddress,
  hashTypedData,
  keccak256,
  recoverTypedDataAddress,
  toHex,
  type HashTypedDataParameters,
} from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
  build402,
  permit2TypedData,
  transferWithAuthorizationTypedData,
  verifyPayment,
  settlePayment,
} from '../lib/b402.ts'
import { CHAIN, EIP712, PERMIT2, TOKENS } from '../lib/constants.ts'

/** Read with cast against https://bsc-rpc.publicnode.com on 2026-09-06, this session. */
const ON_CHAIN = {
  usd1DomainSeparator: '0x5d939dc193fd011c5e26fb861450a696546a09db6b26db26501fe354ba3ed4ba',
  uDomainSeparator: '0x358738403e5a61fdc30a8be78a60f289cbe4d2545b735a344b6229c70c1679b6',
  permit2DomainSeparator: '0x4142cc3c823f819c467fa4437d637fe20589a31dfcd1da2ff22292c9ed9344e7',
  exactWitnessTypehash: '0xd97b3239a7f32295517bd14cb074edfdd188dfe5eb42f802bb26d4fd1eb12c37',
  exactWitnessTypeString:
    'Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)',
} as const

/** The module returns `unknown` on purpose, so a reader shape is needed to inspect the fields. */
interface Doc {
  types: Record<string, readonly { name: string; type: string }[]>
  domain: Record<string, unknown>
  primaryType: string
  message: Record<string, unknown>
}
type ViemDoc = HashTypedDataParameters<Record<string, unknown>, string>

let fails = 0
function check(label: string, got: unknown, want: unknown): void {
  const ok = String(got).toLowerCase() === String(want).toLowerCase()
  if (!ok) fails += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
  if (!ok) console.log(`     got  ${String(got)}\n     want ${String(want)}`)
}

function digestOf(sep: string, structHash: string): string {
  return keccak256(`0x1901${sep.slice(2)}${structHash.slice(2)}`)
}

/** The separator an EIP-3009 token builds, from the four encoded words. */
function separator4(name: string, version: string, chainId: number, verifying: string): string {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
      [
        keccak256(toHex('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        keccak256(toHex(name)),
        keccak256(toHex(version)),
        BigInt(chainId),
        getAddress(verifying),
      ],
    ),
  )
}

console.log('=== 1. typehashes recomputed from their type strings')
check(
  'EIP712Domain 4-field typehash',
  keccak256(toHex('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
  EIP712.domainTypehash,
)
check(
  'TransferWithAuthorization typehash',
  keccak256(
    toHex(
      'TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)',
    ),
  ),
  EIP712.transferWithAuthorizationTypehash,
)
check(
  'ReceiveWithAuthorization typehash',
  keccak256(
    toHex(
      'ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)',
    ),
  ),
  EIP712.receiveWithAuthorizationTypehash,
)

console.log('\n=== 2. domain separators, local recompute against the live read')
const usd1Sep = separator4('World Liberty Financial USD', '1', CHAIN.id, TOKENS.USD1.address)
check('USD1 separator', usd1Sep, ON_CHAIN.usd1DomainSeparator)
const permit2Sep = keccak256(
  encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
    [
      keccak256(toHex('EIP712Domain(string name,uint256 chainId,address verifyingContract)')),
      keccak256(toHex('Permit2')),
      BigInt(CHAIN.id),
      getAddress(PERMIT2.address),
    ],
  ),
)
check('Permit2 separator, 3 fields no version', permit2Sep, ON_CHAIN.permit2DomainSeparator)
check('Permit2 separator matches constants.ts', PERMIT2.domainSeparatorBsc, ON_CHAIN.permit2DomainSeparator)

console.log('\n=== 3. U domain derivation, the candidate grid')
let matched: string | null = null
for (const [name, version] of [
  ['United Stables', '1'],
  ['United Stables', '2'],
  ['U', '1'],
  ['U', '2'],
  ['United Stables USD', '1'],
] as const) {
  const sep = separator4(name, version, CHAIN.id, TOKENS.U.address)
  const hit = sep.toLowerCase() === ON_CHAIN.uDomainSeparator.toLowerCase()
  if (hit) matched = `${name}|${version}`
  console.log(`  ${hit ? 'MATCH' : '     '} name=${JSON.stringify(name)} version=${JSON.stringify(version)} -> ${sep}`)
}
check('U domain resolves to a single candidate', matched ?? 'none', 'United Stables|1')
const uSep = separator4('United Stables', '1', CHAIN.id, TOKENS.U.address)

console.log('\n=== 4. the 402 body')
const body402 = build402({
  resource: 'https://muster.example/api/hire/1234',
  description: 'One health-factor check on a named BSC account',
  priceBase: '10000000000000000',
  token: 'USD1',
  payTo: '0x50ab2018c06c6e4eaa9ba52057eb55ed284912fc',
})
console.log(JSON.stringify(body402, null, 2))
const req = body402.body.accepts[0]
if (!req) throw new Error('no requirement in the 402')
check('402 status', body402.status, 402)
check('x402Version', body402.body.x402Version, 2)
check('scheme', req.scheme, 'eip3009')
check('network', req.network, 'eip155:56')
check('asset is checksummed USD1', req.asset, getAddress(TOKENS.USD1.address))
check('payTo is checksummed', req.payTo, getAddress('0x50ab2018c06c6e4eaa9ba52057eb55ed284912fc'))
check('maxAmountRequired is one cent at 18 decimals', req.maxAmountRequired, '10000000000000000')
check('extra.name', req.extra.name, 'World Liberty Financial USD')
check('extra.version', req.extra.version, '1')
check('signerAddress absent rather than a placeholder', req.extra.signerAddress === undefined, true)

console.log('\n=== 5. TransferWithAuthorization: separator, struct hash, sign, recover')
const account = privateKeyToAccount(generatePrivateKey())
const now = Math.floor(Date.now() / 1000)
const nonce = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')}`
for (const token of ['USD1', 'U'] as const) {
  const built = transferWithAuthorizationTypedData({
    token,
    from: account.address,
    to: '0x50ab2018c06c6e4eaa9ba52057eb55ed284912fc',
    value: '10000000000000000',
    validAfter: now - 60,
    validBefore: now + 300,
    nonce,
  })
  const doc = built as Doc
  const m = doc.message
  check(`${token} primaryType`, doc.primaryType, 'TransferWithAuthorization')
  check(`${token} domain carries a version key`, 'version' in doc.domain, true)
  const structHash = keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bytes32' },
      ],
      [
        EIP712.transferWithAuthorizationTypehash as `0x${string}`,
        m['from'] as `0x${string}`,
        m['to'] as `0x${string}`,
        BigInt(m['value'] as string),
        BigInt(m['validAfter'] as string),
        BigInt(m['validBefore'] as string),
        m['nonce'] as `0x${string}`,
      ],
    ),
  )
  const sep = token === 'USD1' ? usd1Sep : uSep
  const digest = hashTypedData(built as ViemDoc)
  check(`${token} digest equals 0x1901 || on-chain separator || hand encoded struct`, digest, digestOf(sep, structHash))
  console.log(`  ${token} domainSeparator ${sep}`)
  console.log(`  ${token} structHash      ${structHash}`)
  console.log(`  ${token} digest          ${digest}`)
  const signature = await account.signTypedData(built as ViemDoc)
  const recovered = await recoverTypedDataAddress({ ...(built as ViemDoc), signature })
  check(`${token} recovered signer equals the throwaway account`, recovered, account.address)
}

console.log('\n=== 6. Permit2: separator, struct hash against the proxy type string, sign, recover')
const builtP2 = permit2TypedData({
  token: TOKENS.USDT.address,
  amount: '100000000000000000',
  spender: '0x402085c248EeA27D92E8b30b2C58ed07f9E20001',
  nonce: `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')}`,
  deadline: now + 3600,
  payTo: '0x50ab2018c06c6e4eaa9ba52057eb55ed284912fc',
  validAfter: now - 60,
})
const p2 = builtP2 as Doc
console.log(JSON.stringify(p2, null, 2))
check('permit2 domain has no version key', 'version' in p2.domain, false)
check('primaryType', p2.primaryType, 'PermitWitnessTransferFrom')
const witnessTypehash = keccak256(toHex('Witness(address to,uint256 validAfter)'))
check('Witness typehash equals the exact proxy WITNESS_TYPEHASH()', witnessTypehash, ON_CHAIN.exactWitnessTypehash)
// The proxy splices its WITNESS_TYPE_STRING onto the stub to build the primary type, so building it
// the same way proves our field order is the one the deployed contract hashes.
const primaryTypeString = `PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,${ON_CHAIN.exactWitnessTypeString}`
function permit2StructHash(doc: Doc): string {
  const permitted = doc.message['permitted'] as Record<string, string>
  const witness = doc.message['witness'] as Record<string, string>
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bytes32' },
      ],
      [
        keccak256(toHex(primaryTypeString)),
        keccak256(
          encodeAbiParameters(
            [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }],
            [
              keccak256(toHex('TokenPermissions(address token,uint256 amount)')),
              permitted['token'] as `0x${string}`,
              BigInt(permitted['amount'] as string),
            ],
          ),
        ),
        doc.message['spender'] as `0x${string}`,
        BigInt(doc.message['nonce'] as string),
        BigInt(doc.message['deadline'] as string),
        keccak256(
          encodeAbiParameters(
            [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }],
            [witnessTypehash as `0x${string}`, witness['to'] as `0x${string}`, BigInt(witness['validAfter'] as string)],
          ),
        ),
      ],
    ),
  )
}
const p2StructHash = permit2StructHash(p2)
const p2Digest = hashTypedData(builtP2 as ViemDoc)
check('permit2 typehash matches the value R03 recorded', keccak256(toHex(primaryTypeString)), '0xebc156cd23678a74c94df13d772ef5478420637f0c94bd10d509e1dc98f521c7')
check('permit2 digest equals 0x1901 || on-chain separator || hand encoded struct', p2Digest, digestOf(permit2Sep, p2StructHash))
console.log(`  permit2 typehash   ${keccak256(toHex(primaryTypeString))}`)
console.log(`  permit2 structHash ${p2StructHash}`)
console.log(`  permit2 digest     ${p2Digest}`)
const p2signature = await account.signTypedData(builtP2 as ViemDoc)
check(
  'permit2 recovered signer equals the throwaway account',
  await recoverTypedDataAddress({ ...(builtP2 as ViemDoc), signature: p2signature }),
  account.address,
)

console.log('\n=== 7. refusals plus the honest degradation with no credentials')
const refusals: Array<[string, () => unknown]> = [
  ['testnet network', () => build402({ resource: 'https://x.test/a', description: 'd', priceBase: '1', token: 'U', payTo: account.address, network: 'eip155:97' })],
  ['priceBase 0', () => build402({ resource: 'https://x.test/a', description: 'd', priceBase: '0', token: 'U', payTo: account.address })],
  ['priceBase decimal', () => build402({ resource: 'https://x.test/a', description: 'd', priceBase: '0.10', token: 'U', payTo: account.address })],
  ['relative resource', () => build402({ resource: '/api/hire', description: 'd', priceBase: '1', token: 'U', payTo: account.address })],
  ['short nonce', () => transferWithAuthorizationTypedData({ token: 'U', from: account.address, to: account.address, value: '1', validAfter: 0, validBefore: 1, nonce: '0xdead' })],
  ['window inverted', () => transferWithAuthorizationTypedData({ token: 'U', from: account.address, to: account.address, value: '1', validAfter: now + 300, validBefore: now, nonce })],
  ['testnet chainId on a mainnet token', () => transferWithAuthorizationTypedData({ token: 'U', from: account.address, to: account.address, value: '1', validAfter: now - 60, validBefore: now + 300, nonce, chainId: 97 })],
  ['negative validAfter', () => permit2TypedData({ token: TOKENS.USDT.address, amount: '1', spender: account.address, nonce: '1', deadline: now, payTo: account.address, validAfter: -1 })],
]
for (const [label, fn] of refusals) {
  try {
    fn()
    fails += 1
    console.log(`FAIL ${label} was accepted`)
  } catch (e) {
    console.log(`PASS ${label} refused: ${(e as Error).message.slice(0, 90)}`)
  }
}

// The permit2 path keeps chainId open because Permit2 is at one address on both BSC chains. Proved
// against the testnet contract's own DOMAIN_SEPARATOR(), read with cast on 2026-09-06.
const p297 = permit2TypedData({
  token: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
  amount: '1000000',
  spender: '0x402085c248EeA27D92E8b30b2C58ed07f9E20001',
  nonce: '1',
  deadline: now + 3600,
  payTo: account.address,
  validAfter: now - 60,
  chainId: 97,
})
const sep97 = keccak256(
  encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
    [
      keccak256(toHex('EIP712Domain(string name,uint256 chainId,address verifyingContract)')),
      keccak256(toHex('Permit2')),
      97n,
      getAddress(PERMIT2.address),
    ],
  ),
)
check('permit2 at chainId 97 signs under the testnet Permit2 separator', sep97, '0x4b0ae55c3d01d102f0a8e756724fe8f86b39420717f3217a9a35504cbfdf4553')
check(
  'permit2 at chainId 97 moves only the domain, the struct still hashes by hand',
  hashTypedData(p297 as ViemDoc),
  digestOf(sep97, permit2StructHash(p297 as Doc)),
)

for (const k of ['B402_BASE_URL', 'B402_CLIENT_ID', 'B402_ACCESS_TOKEN', 'B402_PRIVATE_KEY_B64']) delete process.env[k]
const envelope = { x402Version: 2, paymentPayload: { payload: {} }, paymentRequirements: req }
const v = await verifyPayment(envelope)
const s = await settlePayment(envelope)
console.log(`  verify  ${JSON.stringify(v)}`)
console.log(`  settle  ${JSON.stringify(s)}`)
check('verify refuses without credentials', v.isValid, false)
check('verify names the missing variables', /B402_BASE_URL/.test(v.reason ?? ''), true)
check('settle refuses without credentials', s.success, false)
check('settle transaction is null not empty string', s.transaction, null)
check('settle names the missing variables', /B402_CLIENT_ID/.test(s.errorReason ?? ''), true)
check('wrong x402Version is caught before any network call', (await verifyPayment({ x402Version: 1, paymentPayload: {}, paymentRequirements: {} })).reason, 'invalid_x402_version')
check('missing requirements is named', (await verifyPayment({ paymentPayload: {} })).reason, 'invalid_payment_requirements')
check('a bare string envelope is named', (await settlePayment('nope')).errorReason, 'invalid_payload')

console.log(`\n${fails === 0 ? 'ALL CHECKS PASS' : `${fails} CHECK(S) FAILED`}`)
process.exit(fails === 0 ? 0 : 1)
