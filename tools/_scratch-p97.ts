import { hashDomain, getAddress, hashTypedData } from 'viem'
import { PERMIT2, TOKENS } from '/home/asuran/Downloads/hackathon-hq/work/bnb-build-era/lib/constants.ts'
import { permit2TypedData } from '/home/asuran/Downloads/hackathon-hq/work/bnb-build-era/lib/b402.ts'
const types = { EIP712Domain: [ {name:'name',type:'string'}, {name:'chainId',type:'uint256'}, {name:'verifyingContract',type:'address'} ] } as const
const local97 = hashDomain({ domain: { name: 'Permit2', chainId: 97, verifyingContract: getAddress(PERMIT2.address) }, types })
console.log('local recompute at chainId 97 ', local97)
console.log('on chain 97 DOMAIN_SEPARATOR   0x4b0ae55c3d01d102f0a8e756724fe8f86b39420717f3217a9a35504cbfdf4553')
console.log('match', local97.toLowerCase() === '0x4b0ae55c3d01d102f0a8e756724fe8f86b39420717f3217a9a35504cbfdf4553')
const now = Math.floor(Date.now()/1000)
const doc = permit2TypedData({ token: TOKENS.USDT.address, amount: '1000', spender: '0x402085c248EeA27D92E8b30b2C58ed07f9E20001', nonce: '0x01', deadline: now+3600, payTo: '0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029', validAfter: now-60, chainId: 97 }) as any
console.log('permit2TypedData(chainId 97) separator', hashDomain({ domain: doc.domain, types: doc.types }))
// deadline earlier than validAfter: an authorization that can never settle
const bad = permit2TypedData({ token: TOKENS.USDT.address, amount: '1000', spender: '0x402085c248EeA27D92E8b30b2C58ed07f9E20001', nonce: '0x02', deadline: now - 7200, payTo: '0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029', validAfter: now + 3600 }) as any
console.log('deadline<validAfter accepted:', JSON.stringify({ deadline: bad.message.deadline, validAfter: bad.message.witness.validAfter }))
// nonce above uint256
try {
  const big = permit2TypedData({ token: TOKENS.USDT.address, amount: '1', spender: '0x402085c248EeA27D92E8b30b2C58ed07f9E20001', nonce: (2n**256n).toString(), deadline: now+60, payTo: '0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029', validAfter: now-60 }) as any
  console.log('nonce 2^256 accepted by builder, nonce =', big.message.nonce)
  console.log('hashTypedData ->', hashTypedData(big))
} catch (e) { console.log('nonce 2^256 threw at', (e as Error).message.split('\n')[0]) }
