# R06 Altana: the partner track, settled to a build checklist

Research pass date 2026-09-05. Every address, signature, fee and limit below came from a
`cast` call or a page fetched today. Where a claim could not be closed I say so and name the
blocker.

## Headline

Altana's gate is cheap to clear and the read path is fully public: session permissions do not
live in the Keystore, they live on the wallet's own EIP-7702 delegated account, where
`canExecute(keyHash, target, calldata)` and `spendInfos(keyHash)` are free `eth_call`s that
return the allowlist and the spend cap a judge can check without our help. The mainnet
Keystore holds only 123 registered keys across 56 live ones, so anything we ship on BSC
mainnet is visible against a nearly empty board. The 50,000 XP prize is 16x the current
top score of 3,000.

## Verified facts

| Claim | Value | How verified |
| --- | --- | --- |
| Altana track requirements, verbatim | 5 requirements plus 2 bonuses (listed in the checklist below) | fetched `https://www.bnbchain.org/en/hackathons/smart-money-era`, Tracks tab, "Partner Track: Best Built with Altana" |
| Altana prize | 50,000 Altana XP, winner takes all, one team, allocation mechanics "to be confirmed" | same page, Prizes section |
| Prize gate | "your submission must show live onchain transactions in the Altana explorer (testnet or mainnet)" | same page |
| Submission must carry our addresses | "make sure to include your wallet address(es) in your submission" | same page, Prizes section |
| Explorer, mainnet | `https://explorer.altana.network` returns 200 | `curl -sS -L https://explorer.altana.network/` |
| Explorer, testnet | `https://testnet.altana.network` returns 200 | `curl -sS -L https://testnet.altana.network/` |
| Explorer evidence URL shape | `/account/<wallet>` and `/key/<full 32-byte keyId>`, both 200, no auth | fetched `/account/0x27146E20c2fb2521c7DD73e97bE030C3147c9da6` and `/key/0x13f5e22da8d5e00e86c1ee6e79f1f9868483d87bf425a23ef17fabd8f30aad4b` |
| Explorer key page truncated id 404s | `/key/0x13f5e22da8d5` returns 404 | same fetch with the short id |
| Mainnet Keystore census | 123 registered keys, 56 live, 33 revoked, 34 expired, BNB 122, Ethereum 1, 157 events, 90 tx in 14 days | explorer mainnet home, read 2026-09-05 |
| Testnet Keystore census | 915 registered keys, 374 live, 196 revoked, 345 expired, BNB 891, Ethereum 24, 1122 events, 456 tx in 14 days | explorer testnet home, read 2026-09-05 |
| XP quest ladder | 3,000 XP total: create wallet 500, add funds 1,000, grant session 1,500 | `https://xp.altana.network/` |
| XP levels | Scout 0, Operator 2,000, Delegate 6,000, Principal 15,000, Sovereign 30,000 | `https://xp.altana.network/xp/<wallet>` |
| XP leaderboard depth | 27 wallets, top 10 all at 3,000 XP (quest cap) | `https://xp.altana.network/` |
| XP attribution | derived from on-chain state, per Altana wallet address, no form ("Registered onchain, so it counts here"), refreshes every 15s | XP account page |
| SDK latest published | `@altananetwork/sdk@0.9.0`, published 2026-09-02, Apache-2.0, deps `viem ^2.21.0`, `ox ^0.14.0`, `porto 0.2.37` (exact pin) | `https://registry.npmjs.org/@altananetwork/sdk` |
| Sibling packages | `@altananetwork/mcp@0.9.0`, `@altananetwork/x402-server@0.2.0`, `@altananetwork/hypersigner-keystore-mcp@0.2.0` | npm registry |
| SDK default branch | `staging`, not `main` (docs link `blob/main/...`) | `https://api.github.com/repos/altananetwork/altana-sdk` |
| 0.9.0 network addresses unchanged | address and URL set in `dist/config.js` identical to the 2026-08-27 capture | diff of extracted addresses, no output |
| Keystore bytecode identical across chains | codehash `0x1ed285a4...a807` on chain 1, 56 and 97 | `cast keccak $(cast code ...)` on each |
| Keystore VERSION | `1.0.1` on BSC mainnet and BSC testnet and Ethereum Sepolia | `cast call <keystore> 'VERSION()(string)'` |
| Controller VERSION | `1.1.1` on BSC mainnet and BSC testnet | `cast call <controller> 'VERSION()(string)'` |
| Registration fee | `registrationFeeUSD()` = `5e17` (0.50 USD), priced through a Chainlink feed, `getRegistrationFeeInWei()` = 694041152910285 wei (0.000694 BNB) on mainnet, 693717737133750 wei on testnet | `cast call 0x0834Ee2C9BdC3E3efF0a2dC34393D4B0e546A555` and `0xb530D1971f5453F3359518343F05D0AedFfF7e12` |
| Price feed | `priceFeed()` = `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE`, `description()` = "BNB / USD", 8 decimals | `cast call` on the feed |
| A grant costs the user real money | two registration fees on a wallet's first admin action (admin `initialRegisterKey` prepended into the same intent) | SDK `internal/keystore.ts` `buildFirstActionPrepend`, plus explorer rows showing 0.000694 BNB per registration |
| An Altana wallet is an EIP-7702 delegated EOA, not a deployed contract | code at a live wallet is 23 bytes: `0xef0100c0f16888f4198f53892c53af859f673e23f26fa3` | `cast code 0x27146E20c2fb2521c7DD73e97bE030C3147c9da6` |
| The delegate target is the relay's accountProxy | `0xc0f16888f4198f53892c53af859f673e23f26fa3`, 496 bytes, matches `wallet_getCapabilities` | `cast code` plus relay RPC |
| The account implementation is Porto | 23,384 bytes, selectors `spendInfos`, `canExecute`, `setSpendLimit`, `ANY_TARGET`, `authorize`, `revoke` | `cast selectors $(cast code 0x4b5d20cd8a3927b500540d9bccddc27385c9fa79)` plus `cast 4byte` on each |
| Keystore stores the key plus the expiry only, never the allowlist or the cap | `getKeys`, `getPublicKey`, `getExpiry`, `isValidKey`, `isRootKey`, `getValidator`, `getMetadata`, `getNonce` are the whole per-key surface | selector dump of `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a` plus 4byte resolution of all 24 |
| The allowlist and the cap are readable on the account | `canExecutePackedInfos(keyHash)` returned 31 entries, `spendInfos(keyHash)` returned 26 entries on a live session | `cast call 0x27146E20... 'canExecutePackedInfos(bytes32)(bytes32[])'` and `'spendInfos(bytes32)'` |
| `canExecute` enforces per-selector scope | router + `0xdeadbeef` true, unlisted target + `0xdeadbeef` false, token + `approve` true, token + `transfer` false | four `cast call 0x27146E20... 'canExecute(bytes32,address,bytes)(bool)'` calls |
| Keystore keyId is `keccak256(SEC1 pubkey)` | `keccak256(0x04a376e7...ba940)` = `0xbb3e4ae9...f848`, the id `getKeys` returned | `cast keccak` against the `getKeys` output |
| Account keyHash is a different value | `keccak256(abi.encode(uint8(2), keccak256(abi.encode(sessionAddress))))` = `0xd7dcbd0e...a485`, the hash the account returned | `cast abi-encode` plus `cast keccak`, matched to `getKeys()` on the account |
| Session key address derives from the pubkey | last 20 bytes of `keccak256(X\|\|Y)` = `0xd2027a2450a8faea95c00387ffc41ce1da61c0ed`, the value the account stores for keyType 2 | `cast keccak` on the 64-byte X\|\|Y |
| Root (admin) keys carry expiry 0 | live root key: `isValidKey` true, `isRootKey` true, `getExpiry` 0 | `cast call` on `0x561b561e...ddc4` key 1 |
| Expired session keys stay in `getKeys` | 7 of 8 sampled keys on one wallet had `isValidKey` false with a past `getExpiry`, all still listed | loop of `getKeys` then `isValidKey` plus `getExpiry` |
| A live session reads back exactly | keyId `0x13f5e22d...aad4b`, `isValidKey` true, `isRootKey` false, `getExpiry` 1789137626 = 2026-09-11 14:40:26 UTC | `cast call` on the Keystore |
| Explorer expiry matches the contract | key page shows "Sep 11, 2026, 02:40 PM" for the same key | key page fetch versus `getExpiry` |
| Explorer live read can be degraded | account page showed "0 Active keys, 0 Total keys" while `getKeys` returned 2 and one was valid; key page said "(from indexed history, live node read unavailable)" | both fetches on 2026-09-05 versus the contract |
| KeyRegistered event | `KeyRegistered(address indexed user, bytes32 indexed keyId, address indexed validator, uint40 expiry, bool isRootKey)`, topic0 `0x9cd59dd65b7552c8a0b81bf6f9beee2eba669ab1957be114308eba6bf28975cf` | receipt of tx `0xe16740c8...e7e3`, decoded, topic0 reproduced with `cast keccak` |
| KeyRevoked event | `KeyRevoked(address indexed user, bytes32 indexed keyId)`, no data, topic0 `0xa97703d8de1d538ac2ccf4453e57ec2aa4ab8b29c9a57f2a6e70a9d0e268f802` | receipt of tx `0x0dfcf2e6...a10a`, topic0 reproduced with `cast keccak` |
| Account permission events | `CanExecuteSet(bytes32,address,bytes4,bool)` and `SpendLimitSet(bytes32,address,uint8,uint256)` and `Authorized(bytes32,(uint40,uint8,bool,bytes))`, all emitted by the wallet itself | `cast 4byte-event` on the three topic0s in the same grant receipt (31 CanExecuteSet, 26 SpendLimitSet) |
| Relay serves 3 mainnets | `wallet_getCapabilities` on `https://relay.altana.network` returns `0x1`, `0x38` and `0x2105` (Ethereum, BSC, Base) | POST JSON-RPC |
| Relay version | `health` returns `"26.1.4 (VERGEN_)"`, quoteSigner `0xe4488855f9d14c4532a3c636d1b4b873649033cb` | POST `health` to the mainnet relay |
| Testnet relay serves chain 97 only | `wallet_getCapabilities` returns `0x61` alone | POST to `https://testnet-relay.altana.network` |
| Only the native token is a fee token today | every chain's `fees.tokens` has one entry, address `0x0`, `feeToken: true` | relay capabilities on both relays |
| The relay faucet method exists but does not fund native | `wallet_addFaucetFunds` with `tokenAddress: 0x0` returned tx `0x6e08a0f4...d3cf`, which is `mint(address,uint256)` calldata sent to the zero address, a no-op; the EXP token address is refused with "Token address not supported" | POST to the testnet relay, then `cast tx` and `cast receipt` on the hash |
| Testnet BNB comes from the BNB faucet | `https://testnet.bnbchain.org/faucet-smart` is the documented source | SDK `config.ts` comment plus docs Testnet page |
| $U testnet faucet | `requestTokens()` pays `tokenAmount()` = 10e18, `waitTime()` = 1800s, faucet holds 9.99e27 wei | `cast call 0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3` and `balanceOf` on $U |
| $U is EIP-3009 capable with a known domain | `DOMAIN_SEPARATOR()` on mainnet reproduces exactly from (name "United Stables", version "1", chainId 56, verifyingContract) and `authorizationState(address,bytes32)` answers | `cast call` plus `cast keccak` of the recomputed domain |
| ERC-8183 is live and busy on BSC | `jobCounter()` = 56,713 on mainnet, 993 on testnet | `cast call` on both commerce kernels |
| Dispute window differs by network | 604800s (7 days) mainnet, 86400s (1 day) testnet | `cast call <policy> 'disputeWindow()(uint64)'` |
| Permit2 is the canonical address on BSC | `0x000000000022D473030F116dDEE9F6B43aC78BA3`, 9,152 bytes of code | `cast code` plus SDK `PERMIT2_ADDRESS` |
| Skills registry has exactly 10 skills, no drift | live `index.json` byte-identical to the 2026-08-27 capture | `diff altana-skills-index-2026-08-27.json altana-skills-index-2026-09-05.json`, no output |
| Every skill address block checks out | vUSDT (8 dec, underlying USDT), USDT 18 dec, Aave Pool revision 11 with provider `0xff75B6da...Ba6D`, aBnbUSDT 18 dec underlying USDT, Lista rate 1 BNB = 0.963376178820901975 slisBNB, PCS router factory and WETH, `getPair(USDT,WBNB)` = the documented LP, pair `token0()` = USDT | 14 `cast call`s |
| Audit | CertiK, completed 2026-07-15, scope `KeyStore.sol` plus `KeyStoreCacheOPStack.sol` plus six further files, source-verified exact match on all three networks | `https://docs.altana.network/security/audits` |
| Docs drift since 2026-08-27 | new pages: browser-wallet onboarding, mobile SDK, ERC-8183 seller side, "Persisting a session", relay status codes | heading diff of the two `llms-full.txt` captures |
| `bsc-rpc.publicnode.com` refuses archive reads | 403 with "Archive requests require a personal token" on a receipt ~13k blocks back | `cast receipt` on tx `0xe16740c8...e7e3` |

## Unverified or open

- **XP allocation mechanics.** The hackathon page itself says "(Allocation mechanics to be
  confirmed.)" for the 50,000 XP. Whether it lands as a lump credit, a multiplier or new
  quests is not published anywhere I could find. Plan for the prize being reputational plus
  a Season 1 leaderboard position, not a token.
- **Whether XP needs the wallet declared anywhere.** The XP account page reads state off
  chain and refreshes every 15s, so it looks fully derived. I could not find a registration
  endpoint, an API or a claim flow, so I cannot rule out an off-chain allowlist that only
  admits wallets seen through Altana Desktop or the docs demo. Mitigation is free: the
  hackathon page independently tells us to put our wallet addresses in the submission, so do
  that and the attribution question stops mattering.
- **Base as an execution chain.** The docs say Base "hosts a KeyStore cache and no relay, so
  `BASE` cannot be passed to `createClient`", yet the mainnet relay's own
  `wallet_getCapabilities` returns a full contract set for `0x2105`. The SDK's `BASE` export
  is an `L2CacheConfig` with no `relayUrl`, so the SDK still refuses. I did not attempt a
  Base intent, so I cannot say whether the relay would accept one.
- **Keystore `getKey(address,bytes32)` return struct.** The raw ABI decode gives a 5-field
  dynamic tuple (address, bytes, bytes, uint40-ish, ...) and I matched the values against the
  single-purpose getters instead of pinning the field names. Use `getPublicKey`, `getExpiry`,
  `isRootKey`, `getValidator` and `getMetadata`, which are unambiguous and verified.
- **Porto `SpendInfo` field names.** The struct is 7 static words per entry and I confirmed
  positions 0 (token), 1 (period enum), 2 (limit) and 6 (current period start) against live
  values. Positions 3, 4 and 5 were all zero on the wallet I sampled, so I cannot name them.
  Blocker: no wallet with a partially-spent cap was to hand. Spending from someone else's
  session is not available to us.
- **Porto's any-function sentinel.** `0x32323232` appears as the selector on the
  `canExecutePackedInfos` entries that accept any call. `ANY_TARGET()` returns
  `0x3232...32`, so the byte pattern is consistent. There is no getter for the selector
  constant, so treat the value as observed rather than documented. Behaviour is verified:
  `canExecute(keyHash, router, 0xdeadbeef)` returns true.
- **Keystore log scans on public RPCs.** `cast logs` over the Keystore returned zero rows
  across 9,000 recent BSC blocks and then timed out at 120s on wider windows and on two
  fallback RPCs. Events verified from individual receipts instead. If we index events, budget
  for a paid RPC or an archive provider.
- **Whether `submit()` on the ERC-8183 kernel is reachable by us.** The seller path is a real
  0.9.0 API and the selector is `0x9e63798d`, but I did not create a job, so the end-to-end
  hire-then-submit loop is untested here.
- **Altana Desktop.** The XP page links `https://www.altana.network/download` as one way to
  create the wallet. Not fetched, not needed: the SDK path is fully documented and headless.

## Interfaces and constants

### Networks and addresses

All rows below have code on chain, checked today with `cast code`.

| Network | Chain id | KeyStore | KeyStoreController | Relay | RPC | Explorer |
| --- | --- | --- | --- | --- | --- | --- |
| BNB Smart Chain | 56 | `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a` (8756 B) | `0x0834Ee2C9BdC3E3efF0a2dC34393D4B0e546A555` (3609 B) | `https://relay.altana.network` | `https://bsc-rpc.publicnode.com` | `https://bscscan.com` |
| BNB Smart Chain Testnet | 97 | `0x6b8361C29d05D498b1a12B54A37310f94171E94A` (8756 B) | `0xb530D1971f5453F3359518343F05D0AedFfF7e12` (3609 B) | `https://testnet-relay.altana.network` | `https://bsc-testnet-rpc.publicnode.com` | `https://testnet.bscscan.com` |
| Ethereum | 1 | `0xb70fDa90C1d576Ba8399946a0c10ECD9d9Ea923b` (8756 B) | `0x30a188Eecf14F4142B0d828ce838C9E1134e7FaA` (3609 B) | `https://relay.altana.network` | `https://ethereum-rpc.publicnode.com` | `https://etherscan.io` |
| Base (L2 cache only) | 8453 | KeyStoreCache `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a` (8285 B) | none | none in SDK config | `https://base-rpc.publicnode.com` | `https://basescan.org` |

Two more the SDK does not export, read off the testnet explorer's Networks panel and then
verified with `cast code`:

| Network | Contract | Address | Code |
| --- | --- | --- | --- |
| Ethereum Sepolia | KeyStore, VERSION 1.0.1 | `0x38Aaf396F462Ad3a4F38ADa653AF6bDEA55F772d` | 8756 B |
| Base Sepolia | KeyStoreCache | `0x30b34f10F0a271dAFe6a0A900bCB2Cb94927e39d` | 8285 B |

Porto account stack, from the relay's own `wallet_getCapabilities`, all with code:

| Role | BSC mainnet (56) | BSC testnet (97) |
| --- | --- | --- |
| Orchestrator 0.5.5 | `0xaf140d0416a994aebb3fa6212b16ce6700f09751` | `0xcb5CEf3C54aa90e9A7ad602A258D3d360cC862B9` |
| Account implementation 0.5.10 | `0x4b5d20cd8a3927b500540d9bccddc27385c9fa79` | `0x33aD2F49ab9f122f5F0FDF579f575724EfF353DE` |
| Account proxy (the 7702 delegate) | `0xc0f16888f4198f53892c53af859f673e23f26fa3` | `0x4F4ddE38Da9F8AbBb96C48cA520b992D4bADc3D6` |
| Simulator | `0x3f5ccc4ded1325340b93d3711fe2aad14f6d5870` | `0x3006de101E96e85272d5B5Ad07A9738fa7678008` |
| Funder / fee recipient | `0xaf089b4eca94a4b2f51d8f5668cff244f2c6c4bc` | `0xb248602EAadd9c3e2Db4575C4e4d58003b7a2740` |
| Escrow | `0x4a69f626f38f6be29125a05048d1a47cfd0a7ff2` | `0xCd075ceb5Cd463a9233a8085fc915767139F655c` |

Testnet extras: `$U` token `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565`, `$U` faucet
`0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3`, EXP fee token
`0xa8071DA5e994cB8e3eB56CaD0FBB6ca424dD8dc0`, EXP2 `0x61727778216127D0843A99A3e91e99C27e9f3BC7`,
faucet for tBNB `https://testnet.bnbchain.org/faucet-smart`.

### KeyStore, the read path that is the actual gate

Complete function set, dumped from deployed bytecode with `cast selectors` then resolved
selector by selector. This is the whole contract, not a subset.

```
// reads (free eth_call, unlimited)
0x8fd4f06b  isValidKey(address user, bytes32 keyId) view returns (bool)
0x1364c24d  isKeyActive(address user, bytes32 keyId) view returns (bool)
0x34e80c34  getKeys(address user) view returns (bytes32[])
0x7cefdd5d  getPublicKey(address user, bytes32 keyId) view returns (bytes)
0x3b49ad47  getExpiry(address user, bytes32 keyId) view returns (uint40)
0xe1248ed6  isRootKey(address user, bytes32 keyId) view returns (bool)
0xe34df169  getValidator(address user, bytes32 keyId) view returns (address)
0x5921c26e  getMetadata(address user, bytes32 keyId) view returns (bytes)
0x9e2de5a6  getNonce(address user, bytes32 keyId) view returns (uint64)
0xe7dadda1  publicKeyRegistered(address user, bytes32 keyId) view returns (bool)
0x314f5c11  getKey(address user, bytes32 keyId) view returns (tuple)
0xd258f9f4  activeKeyIds(address, uint256) view
0x2aa8eaa0  userKeys(address, bytes32) view
0xd5b9221b  authorizedContracts(address) view returns (bool)
0xffa1ad74  VERSION() pure returns (string)     // "1.0.1"

// writes
0x96295a64  initialRegisterKey(address user, bytes32 keyId, address validator, bytes metadata, bytes publicKey, uint40 expiry)
0xa5c2bd05  registerKey(address user, bytes32 keyId, address validator, bytes metadata, bytes publicKey, uint40 expiry)
0x3cf26a01  revokeKey(address user, bytes32 keyId)      // onlyKeyOwnerOrValidator, monotonic
0xd7e54cad  updateNonce(address user, bytes32 keyId, uint64 nonce)
0xf2fa7392  setAuthorizedContract(address, bool)        // owner only
// Ownable2Step: owner(), pendingOwner(), transferOwnership(address), acceptOwnership()
```

`owner()` on BSC mainnet is `0xB8A02c99176c58D49747ed4f42b4e5DB3684da2D`.

The three-line read a judge or a counterparty runs, no auth, no SDK:

```solidity
// keyId = keccak256(SEC1 uncompressed public key), i.e. keccak256(0x04 || X || Y)
isValidKey(wallet, keyId)   // true only when registered AND unrevoked AND unexpired
getKeys(wallet)             // every registered, unrevoked key. Expiry does NOT drop a key from this list.
getExpiry(wallet, keyId)    // unix seconds. 0 means a root (admin) key that never expires.
```

Copy-paste ABI:

```json
[
 {"name":"isValidKey","type":"function","stateMutability":"view","inputs":[{"name":"user","type":"address"},{"name":"keyId","type":"bytes32"}],"outputs":[{"type":"bool"}]},
 {"name":"getKeys","type":"function","stateMutability":"view","inputs":[{"name":"user","type":"address"}],"outputs":[{"type":"bytes32[]"}]},
 {"name":"getPublicKey","type":"function","stateMutability":"view","inputs":[{"name":"user","type":"address"},{"name":"keyId","type":"bytes32"}],"outputs":[{"type":"bytes"}]},
 {"name":"getExpiry","type":"function","stateMutability":"view","inputs":[{"name":"user","type":"address"},{"name":"keyId","type":"bytes32"}],"outputs":[{"type":"uint40"}]},
 {"name":"isRootKey","type":"function","stateMutability":"view","inputs":[{"name":"user","type":"address"},{"name":"keyId","type":"bytes32"}],"outputs":[{"type":"bool"}]},
 {"name":"revokeKey","type":"function","stateMutability":"nonpayable","inputs":[{"name":"user","type":"address"},{"name":"keyId","type":"bytes32"}],"outputs":[]}
]
```

Events, both decoded from real receipts and both with the topic0 reproduced by hashing the
signature:

```
KeyRegistered(address indexed user, bytes32 indexed keyId, address indexed validator, uint40 expiry, bool isRootKey)
  topic0 0x9cd59dd65b7552c8a0b81bf6f9beee2eba669ab1957be114308eba6bf28975cf
KeyRevoked(address indexed user, bytes32 indexed keyId)
  topic0 0xa97703d8de1d538ac2ccf4453e57ec2aa4ab8b29c9a57f2a6e70a9d0e268f802
```

Worked example from the live registration in tx `0xe16740c8b81323d4f4a1a41175c5891dad06ac8b4cc9bdb15abed5c1c463e7f3`:

```
topics[1] 0x...27146e20c2fb2521c7dd73e97be030c3147c9da6   user
topics[2] 0x13f5e22da8d5e00e86c1ee6e79f1f9868483d87bf425a23ef17fabd8f30aad4b   keyId
topics[3] 0x0                                              validator (always 0 for secp256k1 v0)
data      0x...6aa412da  = 1789137626 expiry, then 0x0 = isRootKey false
```

### KeyStoreController, the write path and the fee

```
0xcedf4d38  initialRegisterKey(bytes32 keyId, address validator, bytes metadata, bytes publicKey, uint40 expiry) payable
0xc08eadaa  registerKey(bytes32 keyId, address validator, bytes metadata, bytes publicKey, uint40 expiry) payable
0x878c6d97  getRegistrationFeeInWei() view returns (uint256)
0xd670e926  registrationFeeUSD() view returns (uint256)     // 5e17 = $0.50
0x8fbc9811  keyStore() pure returns (address)
0x741bef1a  priceFeed() view returns (address)              // BNB/USD, 8 decimals
0x61d027b3  treasury() view returns (address)               // 0x779faCC9cA0e5D07F70eEfe26A33D579c04cc38e on 56
0xffa1ad74  VERSION() pure returns (string)                 // "1.1.1"
// owner-only: setRegistrationFee(uint256), setPriceFeed(address), setTreasury(address), acceptTreasury()
// event FeeCollected(address,uint256) topic0 0x06c5efeff5c320943d265dc4e5f1af95ad523555ce0c1957e367dda5514572df
```

Note the arity difference. The Controller takes 5 args (no `user`, it derives it from
`msg.sender`), the KeyStore takes 6. The SDK only ever calls the Controller for registration
and the KeyStore directly for revocation.

Convention pinned in the SDK's own comment and confirmed on chain: `keyId = keccak256(publicKey)`,
`validator = address(0)`, `metadata = 0x`, `publicKey = SEC1 uncompressed 0x04 || x || y`
(65 bytes). Root keys must carry `expiry = 0`, enforced by KeyStore v1.0.0.

### The wallet account, where the allowlist and the cap actually live

This is the half most write-ups miss. The Keystore proves a key holds authority. It says
nothing about what that authority is. The permissions sit on the wallet, which is an EIP-7702
delegated EOA pointing at Porto's account proxy. They are just as readable.

```
0xff619c6b  canExecute(bytes32 keyHash, address target, bytes data) view returns (bool)
0xe5adda71  canExecutePackedInfos(bytes32 keyHash) view returns (bytes32[])
0xdcc09ebf  spendInfos(bytes32 keyHash) view returns (SpendInfo[])
0xbc2c554a  spendAndExecuteInfos(bytes32[] keyHashes) view                 // both, batched
0x2150c518  getKeys() view returns ((uint40 expiry, uint8 keyType, bool isSuperAdmin, bytes publicKey)[], bytes32[] keyHashes)
0x12aaac70  getKey(bytes32 keyHash) view
0x4223b5c2  keyAt(uint256) view
0xfac750e0  keyCount() view returns (uint256)
0x11a86fd6  ANY_TARGET() pure returns (address)             // 0x3232323232323232323232323232323232323232
0xad077083  approvedSignatureCheckers(bytes32 keyHash) view
0x8e87cf47  callCheckerInfos(bytes32 keyHash) view
0x1626ba7e  isValidSignature(bytes32, bytes) view           // ERC-1271
0xcb4774c4  label() view
// writes (admin, inside the wallet's own intent)
0xcebfe336  authorize((uint40,uint8,bool,bytes))
0xb75c7dc6  revoke(bytes32 keyHash)
0x136a12f7  setCanExecute(bytes32 keyHash, address target, bytes4 selector, bool)
0x598daac4  setSpendLimit(bytes32 keyHash, address token, uint8 period, uint256 limit)
0x2081a278  removeSpendLimit(bytes32 keyHash, address token, uint8 period)
0x7656d304  setSignatureCheckerApproval(bytes32 keyHash, address checker, bool)
0x57022451  setCallChecker(bytes32 keyHash, address, address)
0xe9ae5c53  execute(bytes32 mode, bytes executionData) payable
```

`canExecutePackedInfos` entry layout, 32 bytes each: `target (20 B) || zero (8 B) || selector (4 B)`.
Real entries off a live session:

```
0x10ed43c718714eb63d5aa57b78b54704e256024e 0000000000000000 32323232   PCS V2 router, any function
0x02fca66c1d1afb4e2a7884261eb00f63598a7436 0000000000000000 095ea7b3   a token, approve() only
```

`spendInfos` returns a static 7-word struct per entry. Positions confirmed against live data:

```
word 0  address token          // 0x0 means native BNB
word 1  uint8   period         // 0 minute, 1 hour, 2 day, 3 week, 4 month, 5 year
word 2  uint256 limit          // raw smallest units of that token
word 6  uint256 periodStart    // observed 1788566400 = 2026-09-05 00:00:00 UTC for period=2
```

Live sample: the native entry read `token 0x0, period 2, limit 20000000000000000` (0.02 BNB
per day). Twenty-five token entries read `limit 2**160`
(`1461501637330902918203684832716283019655932542976`), which is Porto's practical no-cap value.

The four calls that prove enforcement, all run today against a live session:

| Call | Result |
| --- | --- |
| `canExecute(keyHash, PCS_router, 0xdeadbeef)` | `true` (any-function entry) |
| `canExecute(keyHash, 0x...dEaD, 0xdeadbeef)` | `false` (target not on the list) |
| `canExecute(keyHash, token, 0x095ea7b3)` | `true` (approve is allowed) |
| `canExecute(keyHash, token, 0xa9059cbb)` | `false` (transfer is not) |

### Two key identifiers and the arithmetic between them

They are different values for the same key. Getting this wrong is the most likely integration
bug in the whole track.

```
Keystore keyId  = keccak256(publicKey)                         // publicKey = 0x04 || X || Y, 65 bytes
Account keyHash = keccak256(abi.encode(uint8 keyType, keccak256(publicKeyBytes)))
                  // keyType: 0 P256, 1 WebAuthnP256, 2 Secp256k1, 3 External
                  // for Secp256k1, publicKeyBytes = abi.encode(address) = 32-byte left-padded EOA
session EOA     = address(uint160(uint256(keccak256(X || Y))))  // X||Y is the 64 bytes after 0x04
```

Reproduced end to end on one live session key:

```
publicKey  0x04813725c34dbbea9d2f3181213e460b47c6c2bbe4835d5fdcfc859c50821c71c5
             f106b25ae4c4356240769c61aed70e1439bc97431fe09795a1af0478b1ec1f82
keyId      0x13f5e22da8d5e00e86c1ee6e79f1f9868483d87bf425a23ef17fabd8f30aad4b
EOA        0xd2027a2450a8faea95c00387ffc41ce1da61c0ed
keyHash    0xd7dcbd0ea8bafe7c98310663b02a97695cda8c3b07ce0802bb0aa3833077a485
```

The Keystore takes `keyId`. Every account-level permission read takes `keyHash`. A dashboard
that shows "what may this agent do" needs both, from the same public key.

### SDK public API, the whole surface a marketplace touches

`npm install @altananetwork/sdk@0.9.0`. No API key, no hosted backend, runs in Node and in the
browser.

**Create a wallet.** Counterfactual: the address is deterministic and nothing is on chain until
the first `execute`, which prepends the admin `initialRegisterKey` into the same intent.

```ts
type ClientCreateWalletOptions = { signer?: Signer };
type CreateWalletResult = { address: Address; signer: Signer };

const client = createClient({ chains: [BNB] });                  // or [BNB_TESTNET]
const signer = signerFromPrivateKey(process.env.ADMIN_KEY as `0x${string}`);
const wallet = await client.createWallet({ signer });            // same address on every listed chain
```

Passkey variants: `createPasskey({ name })` in a browser, `createHeadlessPasskey()` in Node,
then `client.createPasskeyWallet(...)`. `recoverFromPasskey` rebuilds a wallet from Keystore
state with two `eth_call`s and no write.

**Grant a session.** This is the call that writes the Keystore entry and pays the fee.

```ts
type ClientGrantSessionOptions = {
  wallet: Wallet;
  signer: Signer;                 // the wallet's admin signer
  permissions: SessionPermissions;
  expiry: number;                 // unix epoch SECONDS
  sessionSigner?: Signer;         // bring your own. Omit and the SDK makes an in-memory one.
  register?: boolean;             // default true. false skips the Keystore entry AND the fee.
  feeToken?: Address;             // default native
  chainId?: number;
};
type GrantSessionResult = Session & { transactionHash?: Hex };
type Session = {
  walletAddress: Address;
  signer: Signer;
  publicKey: Hex;
  permissions: SessionPermissions;
  expiry: number;
};
```

**The permission shape, exactly.**

```ts
type CallPermission =
  | { signature: string; to: Address }   // AND semantics
  | { signature: string }                // that method on any contract
  | { to: Address };                     // any method on that contract

type SpendPermission = {
  limit: bigint;                                                           // raw smallest units
  period: "minute" | "hour" | "day" | "week" | "month" | "year";
  token?: Address;                                                         // omit for native
};

type SessionPermissions = {
  calls?: readonly CallPermission[];     // OMITTED MEANS UNRESTRICTED
  spend?: readonly SpendPermission[];
};
```

Two traps that will cost points if we ship them:

- Omitting `calls` grants every target inside the spend cap. The docs say so twice. Always set
  both.
- `limit` is raw units at that token's decimals **on that chain**. USDT and USDC are 18
  decimals on BNB Chain and 6 on Ethereum. `100_000_000n` on BSC is a cap of 0.0000000001
  USDT. The agent then reverts against a limit that reads generous.

A grant that would satisfy the track for a yield agent, with real limits:

```ts
const AAVE_POOL = "0x6807dc923806fE8Fd134338EABCA509979a7e0cB";
const USDT      = "0x55d398326f99059fF775485246999027B3197955";

const session = await client.grantSession({
  wallet,
  signer: admin,
  sessionSigner: signerFromPrivateKey(agentKey),      // ours, persisted in a secret store
  permissions: {
    calls: [
      { to: USDT,      signature: "approve(address,uint256)" },
      { to: AAVE_POOL, signature: "supply(address,uint256,address,uint16)" },
      { to: AAVE_POOL, signature: "withdraw(address,uint256,address)" },
    ],
    spend: [{ limit: 50n * 10n ** 18n, period: "day", token: USDT }],
  },
  expiry: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
});
console.log(session.publicKey, session.transactionHash);
```

**Execute, as the agent.**

```ts
type Call = { to: Address; data?: Hex; value?: bigint };
type ExecuteResult = { callsId: Hex; status: "CONFIRMED" | "FAILED" | "PENDING"; transactionHash?: Hex };

const r = await client.execute({ session, calls: [{ to: AAVE_POOL, data, value: 0n }] });
```

A failure **returns** `status: "FAILED"`, it does not throw. Check the status. Empty `calls` is
rejected. `noWait: true` gives `PENDING` plus a `callsId` to poll. A session `execute` never
touches the Keystore.

**Revoke.** One admin call, atomic across both layers, monotonic.

```ts
type ClientRevokeSessionOptions = {
  wallet: Wallet;
  signer: Signer;                 // admin. The session signer is NOT needed.
  session: Session | Hex;         // the object. Its public key alone also works.
  feeToken?: Address;
  chainId?: number;
};
await client.revokeSession({ wallet, signer: admin, session: sessionPublicKey });
```

Inside one intent: `revokeKey(wallet, keccak256(pubkey))` on the Keystore, plus `revoke(keyHash)`
on the account. From the next block `isValidKey` is false and the keyId is dropped from
`getKeys`. The SDK gates the Keystore half on `isValidKey` first, because revoking a
never-registered keyId reverts and would take the account-level revoke down with it (the bundle
is atomic). Revocation cannot be undone: to restore access, grant a fresh keypair.

**Persistence, the only supported pattern.** Never `JSON.stringify` a `Session`: it throws on
the bigints. When it does not it writes the secret to storage while dropping the ability to
sign.

```ts
type SerializedSession = {
  walletAddress: Address;
  publicKey: Hex;
  permissions: {
    calls?: readonly ({ signature: string; to: Address } | { signature: string } | { to: Address })[];
    spend?: readonly { limit: string; period: SpendPermission["period"]; token?: Address }[];  // decimal strings
  };
  expiry: number;
};

await db.save(id, serializeSession(session));                        // no secret in here
const live = deserializeSession(await db.load(id), signerFromPrivateKey(await secrets.load(id)));
```

`deserializeSession` refuses a signer whose public key does not match the stored one, so a
mixed-up key fails loudly at restore rather than as an opaque relay rejection later. Session
`execute` is byte-exact against what was committed at grant time, so a sloppy JSON round trip
(bigints to numbers, keys reordered) breaks the match.

If `sessionSigner` is omitted the SDK generates a key that exists only in that process's memory
and warns on the console. Lose it and the on-chain authorization it backs is permanently
unusable, with revoke-and-regrant the only exit. Always pass our own.

**When the SDK writes to the Keystore.**

| Call | Keystore write |
| --- | --- |
| `createWallet`, `createPasskeyWallet` | no (counterfactual) |
| first admin `execute` on a fresh wallet | yes, admin key via `initialRegisterKey`, batched |
| later admin `execute` | no |
| any session `execute` | no |
| `grantSession` | yes by default, `register: false` skips it and the fee |
| `registerSessionKey` | yes, the lazy path for a `register: false` session |
| `revokeSession` | yes |
| `recoverFromPasskey` | no, two `eth_call`s |

### Cross-chain, if we use Ethereum at all

`ensureKeyCached` proves the L1 Keystore slot into the Base cache via the L2's `L1Block`
predeploy, after which Base answers with one `eth_call`. BSC is standalone and needs none of
this. One trap the docs flag: after `revokeSession` on L1 the cache still returns
`isValidKey == true` until a post-revocation proof lands. `ensureKeyCached` will not do it
because it returns early when the cache says valid. Call `syncKeyToL2` explicitly.

### ERC-8183 hiring, the first bonus

Live and busy: `jobCounter()` is 56,713 on BSC mainnet. Both sides ship in 0.9.0.

| Contract | BSC 56 | BSC 97 |
| --- | --- | --- |
| AgenticCommerce (kernel) | `0xEa4DAa3100A767e86FDed867729ae7446476EBA6` | `0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE` |
| EvaluatorRouter | `0x51895229E12F9876011789B04f8698af06cCD6DA` | `0xD7d36D66d2F1B608A0F943f722D27e3744f66F25` |
| OptimisticPolicy | `0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5` | `0x4F4678D4439feC812Ac7674Bb3Efb4C8f5Fb78A6` |
| ERC-8004 registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| $U payment token | `0xcE24439F2D9C6a2289F741120FE202248B666666` | `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` |
| `disputeWindow()` | 604800 (7 days) | 86400 (1 day) |

`$U` is "United Stables", symbol `U`, 18 decimals. `commerce.paymentToken()` returns it.

Buyer flow is five calls batched into one atomic intent, so an Altana wallet does in one
signature what a Studio buyer does in five self-paid transactions:

```
createJob(provider, evaluator=router, expiredAt, description, hook=router)
registerJob(jobId, policy)              // on the router
setBudget(jobId, amount, "0x")
approve(commerce, amount)               // on $U
fund(jobId, amount, "0x")
```

`jobId` is predicted as `jobCounter() + 1`. A concurrent `createJob` in the same block reverts
the batch harmlessly (`registerJob` is client-only), so re-read the counter and retry.
`description` is capped at 4096 bytes by the kernel. `JOB_STATUS` is order-locked:
`["OPEN","FUNDED","SUBMITTED","COMPLETED","REJECTED","EXPIRED"]`.

Seller flow, one call, plus a scoped permission helper:

```ts
erc8183SubmitPermissions(chainId)  // → [{ to: commerce, signature: "submit(uint256,bytes32,bytes)" }]
                                   //   selector 0x9e63798d
await submitErc8183Deliverable(session, { jobId, manifest, deliverableUrl }, { network: BNB });
// then serve result.manifestText VERBATIM at deliverableUrl
```

The on-chain hash is over the manifest's canonical JSON: keys sorted, compact separators, every
non-ASCII character `\uXXXX` escaped, matching Python's
`json.dumps(..., sort_keys=True, separators=(",", ":"))` with default `ensure_ascii`. A plain
`JSON.stringify` produces different bytes for anything with an accent or an emoji and the hash
will not verify cross-ecosystem. Use `encodeErc8183Manifest` and `erc8183ManifestHash`.
Manifest shape:

```json
{"version":1,"job_id":123,"chain_id":56,
 "contracts":{"commerce":"0x...","router":"0x...","policy":"0x..."},
 "response":{"content":"...","content_type":"text/plain"},
 "metadata":{}}
```

The deliverable URL is recoverable by a buyer from the policy's
`JobInitialised(uint256 indexed jobId, bytes32 deliverable, uint64 submittedAt, bytes optParams)`
event, whose `optParams` decodes to UTF-8 JSON carrying `{"deliverable_url": ...}`.
`getErc8183DeliverableUrl` scans in bounded windows because public BSC RPCs cap `getLogs` ranges.

Testnet $U: `requestTokens()` on `0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3` pays
`tokenAmount()` = 10e18 per call, `waitTime()` = 1800 seconds per address. Read
`allowedToWithdraw(address)` first. The faucet holds 9.99e27 wei.

### ERC-8004 identity, the discoverability half

Same registry address as the ERC-8183 stack. `AgentIdentity` / `AGENT`, a UUPS proxy over a
plain ERC-721. Both writes are `nonpayable`, so gas only, no protocol fee.

```
register(string agentURI, (string metadataKey, bytes metadataValue)[] metadata) returns (uint256 agentId)
   selector 0x8ea42286
setAgentURI(uint256 agentId, string newURI)     selector 0x0af28bd3
tokenURI(uint256), ownerOf(uint256)
event Registered(uint256 indexed agentId, string agentURI, address indexed owner)
   topic0 0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a

erc8004RegisterPermissions(chainId) → [
  { to: registry, signature: "register(string,(string,bytes)[])" },
  { to: registry, signature: "setAgentURI(uint256,string)" },
]
```

Scope by selector, never `{ to: registry }`. The session executes as the wallet, which owns the
NFT, so a registry-wide grant would also authorize `transferFrom` (steal the identity),
`setApprovalForAll` (an operator approval that outlives session revocation) and `setAgentWallet`
(identity poisoning). `register` is overloaded three ways on the registry (`()`, `(string)`,
`(string,(string,bytes)[])`). Only the three-arg form is what the SDK encodes.

Registration is two-phase, because the record embeds the id the mint assigns: mint with
`registrations: []`, recover `agentId` from the `Registered` log, then `withErc8004Registration`
patches the id in and `setErc8004AgentUri` writes the completed record.

### x402 and B402 selling, the second bonus

`npm install @altananetwork/x402-server@0.2.0 viem`. One guard in front of any HTTP route.

```ts
import { createX402Merchant, U_TOKEN, USDT_BSC } from "@altananetwork/x402-server";
const merchant = createX402Merchant({
  chainId: 56,
  payTo: "<our Altana wallet>",
  price: 200_000_000_000_000_000n,          // 0.2 per call, 18 decimals
  minPrice: 50_000_000_000_000_000n,
  maxPrice: 2_000_000_000_000_000_000n,
  rails: [
    { rail: "eip3009", token: U_TOKEN[56] },                                  // Studio buyers pay $U
    { rail: "permit2-exact", token: USDT_BSC, spender: facilitator.address },
  ],
  facilitator, rpcUrl: "https://bsc-dataseed.binance.org", chain: bsc,
});
const { response, receipt } = await merchant.guard(req);
```

Token constants shipped in the package, all verified on chain:

```
U_TOKEN[56]  = { address 0xcE24439F2D9C6a2289F741120FE202248B666666, name "United Stables", version "1", symbol "U", decimals 18 }
U_TOKEN[97]  = { address 0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565, name "United Stables", version "1", symbol "U", decimals 18 }
USDT_BSC     = { address 0x55d398326f99059fF775485246999027B3197955, name "Tether USD", version "1", symbol "USDT", decimals 18 }
PERMIT2_ADDRESS = 0x000000000022D473030F116dDEE9F6B43aC78BA3   (exported by the SDK, 9152 B on BSC)
```

I recomputed the $U EIP-712 domain separator from those four values and it matched
`DOMAIN_SEPARATOR()` on chain byte for byte
(`0x358738403e5a61fdc30a8be78a60f289cbe4d2545b735a344b6229c70c1679b6`), so the eip3009 rail's
signing domain is settled.

Settlement:

| Rail | Buyer signs | Settled via |
| --- | --- | --- |
| `eip3009` | `TransferWithAuthorization` ($U) | `token.transferWithAuthorization(bytes)` |
| `permit2-exact` | `PermitWitnessTransferFrom` | `Permit2.permitWitnessTransferFrom` |

Funds move payer to `payTo` directly, with the recipient bound into the buyer's signature, so a
compromised facilitator key cannot redirect earnings. Nonces burn on chain so replay is out.
Compatibility rules for Studio buyers: offer `maxTimeoutSeconds <= 480` (Studio refuses windows
over 600s and backdates `validAfter` by 120s). Include the eip3009 $U rail or Studio cannot
pay at all. `bag x402 trust` needs an https URL in production. The decoder accepts both Permit2
envelope dialects and reads the header from `X-PAYMENT` falling back to `PAYMENT-SIGNATURE`.

### Buying over x402 from a session key, the ERC-1271 detail

An Altana wallet is a smart account so it cannot make a plain EOA signature. It authorizes
through ERC-1271. The digest is nested:

```
nested = keccak256(0x1901 || domainSeparator || structHash)
  domainSeparator = keccak256(abi.encode(keccak256("EIP712Domain(address verifyingContract)"), wallet))
  structHash      = keccak256(abi.encode(keccak256("ERC1271Sign(bytes32 digest)"), appDigest))
```

The account's domain is stripped to `verifyingContract` only, no name, version or chainId. The
wrapped signature is `innerSig || keyHash || prehash` (98 bytes for a secp256k1 session key), so
a verifier must call `isValidSignature` and never `ecrecover`. On top of that, a session key's
`isValidSignature` only returns the magic value when `msg.sender` is an approved checker for that
key. Approve it once per session with `approveSignatureChecker`: the canonical Permit2 for the
permit2 rails, the token contract itself for EIP-3009. Without it, verification returns
`0xffffffff` for a perfectly valid signature. `signOrder` and `signOrderTypedData` do the
wrapping.

### MCP server, 20 tools

`claude mcp add altana -- bunx @altananetwork/mcp`. Eleven have slash commands. The set that
matters to a marketplace:

- Verification: `wallet_verification` (all active keys from the Keystore), `verify_authorization`
  (is this key authorized right now).
- Session lifecycle: `grant_session`, `list_sessions`, `session_execute`, `revoke_session`.
- Wallet lifecycle: `create_wallet`, `list_wallets`, `wallet_balance`, `wallet_execute`.
- Agent commerce: `x402_request`, `erc8183_create_job`, `erc8183_job_status`, `erc8183_settle`,
  `erc8183_submit`.
- Agent identity: `erc8004_register`, `erc8004_set_agent_uri`, `erc8004_show`.
- Skills: `search_skills`, `get_skill` (integrity checked against the registry `sha256` before
  the content is returned).
- Discovery: `about_altana`.

`ALTANA_SKILLS_INDEX_URL` overrides the registry source.

### Skills registry, endpoints and JSON

Four keyless HTTP endpoints, all 200 today:

```
https://skills.altana.network/index.json                    21,204 B, the registry
https://skills.altana.network/llms.txt                       3,496 B, the human summary
https://skills.altana.network/llms-full.txt                 56,032 B, all 10 SKILL.md in one fetch
https://skills.altana.network/skills/<id>/SKILL.md          one skill's source
https://raw.githubusercontent.com/altananetwork/skills/main/index.json   canonical raw
```

`skills.json` is a 404. Per-skill entry shape, exact:

```json
{
  "id": "venus-lending",
  "name": "Venus Lending",
  "description": "...",
  "chain": "bnb",
  "tags": ["lending","yield","venus","stablecoin","defi"],
  "publisher": "Altana",
  "version": "1.0.0",
  "path": "skills/venus-lending/SKILL.md",
  "sha256": "69bcf2a17ffe4624dcb9d98321299f166e045787a6ffad1219f0f5d331f77bf7",
  "scope": { "contracts": ["Venus vUSDT market","USDT (BSC-USD)"], "spendCapSuggested": "100 USDT" },
  "inputs": [ { "id":"amountUsdt","label":"USDT amount","type":"usd","required":true,
                "askAt":"run","plays":["supply","withdraw"],"help":"..." } ],
  "verified": { "method": "fork-tested by Altana", "date": "2026-07-21" },
  "category": "Lending",
  "display": { "may": ["..."], "mayNot": ["..."], "exampleAsk": "lend $100 USDT on venus" }
}
```

Two fields are worth building the marketplace UI directly on top of. `display.may` and
`display.mayNot` are plain-English permission copy the publisher already wrote, which is exactly
what the track's "a user can see what their agent may do" asks for. `inputs[].askAt` is either
`"grant"` or `"run"`, which tells us which parameters belong on the consent screen (they get
baked into the session scope) and which belong on the run screen. Nothing else in the ecosystem
gives us that split for free.

`scope.contracts` is prose, not addresses, so it cannot be fed to `permissions.calls` directly.
The addresses live in the SKILL.md body under "Addresses (BNB Chain mainnet)".

## The ten production skills

Live registry `index.json` is byte-identical to the 2026-08-27 capture, so this list is stable.
All ten are published by Altana, all fork-tested 2026-07-21, nine are `chain: bnb` and x402 is
`chain: multi`.

| Skill (id) | Category | Does | Needs | Addresses it names |
| --- | --- | --- | --- | --- |
| PancakeSwap Trading (`pancakeswap-trading`) | Trading | buy/sell, plays `enter-position`, `exit-position`, `round-trip`, `tp-sl-watch` | token, USDT amount, slippage (1%), TP/SL % for the watch play. Cap 50 USDT | router `0x10ED43C718714eb63d5aA57B78B54704E256024E`, WBNB `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`, USDT `0x55d398326f99059fF775485246999027B3197955` |
| Four.meme Trading (`four-meme`) | Trading | snipe launchpad curves, hand off to PCS after graduation | token, BNB amount, slippage (3%). Cap 0.1 BNB | TokenManager2, TokenManagerHelper3 (reads) |
| PancakeSwap Liquidity (`pancakeswap-liquidity`) | Liquidity | add/remove V2 LP, `position-check`. V2 only, not V3 or Infinity | tokenA, tokenB, one-side amount, LP amount. Cap 50 USDT | router, factory `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73`, USDT/WBNB pair `0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE` |
| Copy Trade (`copy-trade`) v1.1.0 | Trading | mirror a named wallet on PCS under per-trade and total caps | leader wallet, per-trade max, total budget, screen-tokens flag. All four `askAt: grant` | router plus traded tokens (approve to router only) |
| Venus Lending (`venus-lending`) | Lending | supply/withdraw USDT, `position-check`. No borrow | USDT amount. Cap 100 USDT | vUSDT `0xfD5840Cd36d94D7229439859C0112a4185BC0255`, USDT |
| x402 API Payments (`x402-payments`) | Payments | pay HTTP invoices per request | max price per request, total budget (both `askAt: grant`), resource URL. Cap 25 USDT | Permit2, USDT |
| Lista Liquid Staking (`lista-staking`) | Staking | stake BNB for slisBNB, request withdraw, claim | BNB amount, slisBNB amount, request index. Cap 0.5 BNB | StakeManager `0x1adB950d8bB3dA4bE104211D5AB038628e477fE6`, slisBNB `0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B` |
| Aave V3 Lending (`aave-v3-lending`) | Lending | supply/withdraw USDT, `position-check`. `mayNot: Borrow` | USDT amount. Cap 50 USDT | Pool `0x6807dc923806fE8Fd134338EABCA509979a7e0cB`, aBnbUSDT `0xa9251ca9DE909CB71783723713B21E4233fbf1B1`, USDT |
| Token Radar (`dexscreener-token-radar`) | Research | trending scan, token screen, condition watch. Read only | token, condition, count (10), interval (30s). No cap | none, DexScreener public endpoints |
| Wallet Tracker (`wallet-tracker`) | Research | watch a wallet live, profile it, find early buyers. Read only | wallet, token, interval (30s), windowBlocks (20000 ≈ 17h), count | none, log filters on chain |

### Mapping to the four mandated categories

The hackathon's own "Ideas to Build" table names the Altana piece for autonomous DeFi as "Spend
caps plus Aave, Venus, PancakeSwap, Lista skills", so this mapping is the sanctioned path.

**Yield: covered four times over.** Aave V3 Lending, Venus Lending, Lista Liquid Staking and
PancakeSwap Liquidity. Verified reads for real APY numbers:

- Aave: `getReserveData(USDT)` field 2 `currentLiquidityRate` in ray (1e27). Live today
  `27749031195224964850275674` = 2.77% supply APR. Position is just `balanceOf` on the aToken,
  which rebases in place, so there is no exchange rate to apply. Withdraw everything with
  `type(uint256).max`.
- Venus: `supplyRatePerBlock()` live `394997669`, times about 10.5M blocks a year. vUSDT is 8
  decimals against USDT's 18. `balanceOfUnderlying` is not a view function so it needs a
  static call. Compound-style calls return error codes instead of reverting, so verify balances
  after every mint or redeem.
- Lista: `convertBnbToSnBnb(1e18)` live `963376178820901975` and `convertSnBnbToBnb(1e18)` live
  `1038016116636725181`, so 1 BNB mints 0.9634 slisBNB. Withdrawal is two-step with a 7 to 15 day
  unbonding wait, so a stake and its claim never sit in one session.
- PancakeSwap LP: fee income, sized from `getReserves()` with `token0()` checked (address-sorted,
  not argument-order; for USDT/WBNB `token0` is USDT).

**Rebalancing: assemble it from PancakeSwap Trading.** No dedicated skill. The primitives are
`getAmountsOut` for the quote (quote both the direct pair and the WBNB hop, take the better) and
`swapExactTokensForTokens` for the leg. A session scoped to `approve` on the basket tokens plus
the router, with a daily spend cap, is the whole authority a rebalancer needs. Token Radar's
`token-screen` play is the risk gate before adding a new asset.

**Grid trading: assemble it too.** The closest published play is `tp-sl-watch` on PancakeSwap
Trading, which is a two-sided price trigger, plus Token Radar's `watch` play, which polls a
condition on an interval (default 30s). A grid is that pattern with a ladder of levels instead of
two. The session shape is identical to rebalancing, so both categories share one scope.

**Health factor: no Altana skill exists. Both lending skills deliberately exclude borrowing.**
Venus Lending is supply-only. The Aave skill's `display.mayNot` literally lists "Borrow". This
is the gap, so it is also the differentiator: every rival who builds straight off the registry
will be weakest in exactly the category the rubric mandates. Verified primitives to build it from:

```
// Aave V3 on BSC, Pool 0x6807dc923806fE8Fd134338EABCA509979a7e0cB
getUserAccountData(address user) view returns (
  uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase,
  uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)   // HF is the 6th value, 1e18 scale
// an address with no position returns healthFactor = 2**256-1 (verified)
variableDebtBnbUSDT = 0xF8bb2Be50647447Fb355e3a77b81be4db64107cd   (symbol read on chain)

// Venus core pool, Comptroller 0xfD36E2c2a6789Db23113685031d7F16329158384 (a Diamond proxy)
getAccountLiquidity(address) view returns (uint256 error, uint256 liquidity, uint256 shortfall)
getAssetsIn(address) view returns (address[])
markets(address vToken) view returns (bool isListed, uint256 collateralFactorMantissa, bool isVenus)
   // vUSDT reads (true, 8e17, true), so a 0.8 collateral factor
closeFactorMantissa() view returns (uint256)   // 5e17
```

A health-factor agent's session needs `repay` and `supply` on the Pool plus `approve` on the debt
asset. Nothing else. That is a genuinely tighter and more defensible scope than a trading
session, which is a point worth making in the writeup: the riskiest category gets the narrowest
allowlist.

## Qualification checklist

Each line is one of Altana's published requirements, restated as something we can hand over, with
the artifact that proves it. The wording in the "requirement" column is theirs, read off the
Tracks tab today.

### Gate (all five of them. Miss one and the entry is not considered)

| # | Requirement | Artifact that proves it | Verifier's own command |
| --- | --- | --- | --- |
| G0 | "your submission must show live onchain transactions in the Altana explorer (testnet or mainnet)" | one URL per agent wallet: `https://explorer.altana.network/account/<wallet>` for mainnet, `https://testnet.altana.network/account/<wallet>` for testnet. Pages are public and need no account, API key or wallet connection | open the URL |
| G1 | "Agents on their own Altana wallets" | one Altana wallet per agent, four agents means four addresses, never one shared wallet. Each carries a registered root key | `getKeys(wallet)` is non-empty and `isRootKey(wallet, keyId)` is true for the admin key with `getExpiry` 0 |
| G2 | "Sessions with real limits: call allowlist, spend cap, expiry" | per-agent `permissions.calls` scoped by selector, `permissions.spend` with a real daily cap, `expiry` inside the judging window | `canExecute(keyHash, allowedTarget, allowedSelector)` true, `canExecute(keyHash, anythingElse, ...)` false, `spendInfos(keyHash)` shows a non-`2**160` limit, `getExpiry(wallet, keyId)` in the future |
| G3 | "Sessions registered in Keystore, so integration is read onchain rather than from the pitch" | grant with `register: true` (the default). Never `register: false` for anything we submit, since an unregistered session is invisible to `verify_authorization` and to the explorer | `isValidKey(wallet, keccak256(sessionPubkey))` returns true |
| G4 | "Real onchain transactions through a session key. Testnet counts, mainnet is stronger" | at least one confirmed tx per category, signed by the session and not the admin. Keep the `transactionHash` from each `ExecuteResult` | BscScan tx page shows the wallet as sender. The same key appears live in the explorer |
| G5 | "User-facing control: a user can see what their agent may do, and revoke it, inside the product" | a per-agent panel in the app that renders the allowlist plus the cap read live from `canExecutePackedInfos` plus `spendInfos`, with a Revoke button wired to `revokeSession` | click Revoke, then `isValidKey` flips false and the key drops out of `getKeys` in the next block |

### Bonus (both are shipped SDK APIs, so both are cheap)

| # | Requirement | Artifact | Verifier's own command |
| --- | --- | --- | --- |
| B1 | "Hire BNB Agent Studio agents through ERC-8183 using the Altana ERC-8183 SDK. Altana ships both the buyer side and the seller side" | a Hire button that calls `hireErc8183Agent`, plus our own agents selling with `submitErc8183Deliverable` and `erc8183SubmitPermissions`. Record the `jobId` | `getJob(jobId)` on `0xEa4DAa3100A767e86FDed867729ae7446476EBA6` shows our wallet as `client` and `status` FUNDED or later |
| B2 | "Implement sell over x402/B402 using the x402 server SDK" | one `@altananetwork/x402-server` guarded route on a public https URL, with both rails offered (`eip3009` $U for Studio buyers, `permit2-exact` USDT), `maxTimeoutSeconds <= 480` | `curl` the route unauthenticated and get a 402 challenge back, then pay it with `fetchWithX402` or the MCP `x402_request` tool |

### Submission mechanics

| # | Requirement | Note |
| --- | --- | --- |
| S1 | "make sure to include your wallet address(es) in your submission" | list every agent wallet address, not just one. This is also the safest answer to the open question about how XP is attributed |
| S2 | Marketplace must be "functional and publicly accessible during judging" (Sep 9 to 23) | keep the relay-backed demo alive for two weeks. Keep sessions' expiries past Sep 23 or the judge sees an expired agent |
| S3 | "Agents surfaced on your marketplace must be live on BSC" | chain 56 or chain 97. Mainnet is explicitly "stronger" for the Altana prize |
| S4 | One entry per team, open globally | Altana is judged independently of the main track, on the same submission |

### Do-not-ship list, each one costs a gate

- Do not grant a session without `calls`. Omitting it means every target inside the cap, which
  fails G2 on inspection even though the cap is real.
- Do not scope the ERC-8004 registry with `{ to: registry }`. That also authorizes `transferFrom`,
  `setApprovalForAll` and `setAgentWallet`.
- Do not use `register: false` on anything we submit. It saves $0.50 and voids G3.
- Do not let the SDK generate the session signer. Pass our own key from a secret store. A
  process restart otherwise strands a live on-chain authorization.
- Do not `JSON.stringify` a `Session`. Use `serializeSession` plus a separate secret.
- Do not set a stablecoin cap with 6 decimals. USDT and USDC are 18 on BNB Chain.
- Do not rely on `fundNative` for tBNB. It resolves to a no-op mint against the zero address on
  the testnet relay today. Use the BNB faucet.
- Do not use one wallet for four agents. G1 says "their own".
- Do not point the demo at an unlisted or localhost endpoint. The judge is not signed in.

## Design implications for the marketplace

**The permission panel is a chain read, so build it as one.** Everything G5 asks for is a free
`eth_call`: `canExecutePackedInfos(keyHash)` gives the allowlist as `target || selector` pairs,
`spendInfos(keyHash)` gives the caps with the live period window, `getExpiry(wallet, keyId)` gives
the countdown, `isValidKey` gives the live/revoked answer. Render the panel from those four calls
with no server state at all. The same panel doubles as the evidence a judge checks: they can
run the identical calls and get the identical answer. A cached panel is strictly worse and reads
as a pitch rather than an integration.

**Show both key identifiers and label them.** `keyId` for the Keystore, `keyHash` for the
account. Putting both on the agent page with the derivation next to them is a small thing that
signals we read the contracts rather than the marketing page. It also saves a judge from thinking
one of them is wrong.

**Ship on mainnet.** The requirement says testnet counts and mainnet is stronger. The cost of
mainnet is 0.000694 BNB per key registration (0.50 USD, priced off a Chainlink feed) plus gas. Four
agents with one session each is eight registrations on first use, under 5 USD. Against 30,000 USD
plus 50,000 XP that is not a decision. Ship mainnet as the default and keep testnet as the
fallback demo, not the other way round.

**Mainnet is nearly empty, so we will be visible.** 123 keys ever registered, 56 live, one single
key on Ethereum. Eight registrations from us is a 6% move in the whole registry. The activity feed
on `explorer.altana.network` is paginated 25 at a time across 157 events, so a judge landing on the
front page during judging week will very likely see our wallets in the first screen. Time the
grants for the days after submission rather than weeks before.

**The XP prize is a leaderboard position, not a payout.** 50,000 XP against a current top score of
3,000 and a Sovereign tier at 30,000. Winning it makes us the only Sovereign wallet in Season 1 by
a wide margin. Frame the writeup for that: the prize is standing in the ecosystem the marketplace
is meant to serve. Also grab the free 3,000 XP on the way through by doing the three quests
(create, fund, grant) on the wallet we submit, since they are steps 1 to 3 of the build anyway.

**Do not trust the explorer as the source of truth in our own product.** On 2026-09-05 an account
page reported "0 Active keys, 0 Total keys" while `getKeys` returned two keys with one valid. A
key page said "(from indexed history, live node read unavailable)". The expiry it showed was
correct. Altana's own docs say the explorer is an indexed view and not the authority. So: link the
explorer as third-party evidence, read the contract for anything the UI asserts.

**The four categories need only two session shapes.** Rebalancing and grid trading are both
`approve` on a basket plus the PancakeSwap V2 router with a daily cap. Yield is `approve` plus two
or three methods on one protocol. Health factor is `approve` plus `repay` and `supply`. That means
the consent screen can be genuinely honest and short. The "equally deep in all four" bar is met
with four narrow scopes rather than one broad one. A single wide session across all four would
score worse on the Altana rubric while looking lazier on the main rubric.

**Health factor is where we win or lose the depth claim.** It is the one mandated category the
skills registry does not cover, both lending skills exclude borrowing on purpose. The reads are
sitting there unused (`getUserAccountData` on Aave, `getAccountLiquidity` plus `markets` on Venus).
Build it from the protocol directly and say so. Anyone assembling four agents out of the ten
published skills will have a hole exactly here.

**Publish one skill.** `https://skills.altana.network/submit` takes a single SKILL.md and Altana
fork-tests it before listing. A health-factor skill fills the registry's own gap. It is real
upstream work rather than a submission artifact, so it also stands on its own if the marketplace
does not win. A listed skill is also a durable third-party endorsement of the entry.

**Use `display.may` / `display.mayNot` and `inputs[].askAt` verbatim.** The registry already
carries plain-English "may / may not" copy per skill and marks each input as `askAt: "grant"` or
`askAt: "run"`. That is the consent-screen versus run-screen split handed to us, written by the
protocol's own publisher. Deriving our own wording instead would be slower and less accurate.

**Two networks, two different waits.** ERC-8183's dispute window is 7 days on mainnet and 1 day on
testnet. A hire-to-settle demo cannot complete on mainnet inside judging week if we start it late.
Either run the full hire loop on testnet with the DeFi agents on mainnet. Or start the mainnet job
immediately on submission and show `claimRefund` plus `dispute` as the branches a user controls.

**Budget for a real RPC.** `bsc-rpc.publicnode.com` 403s on archive reads with "Archive requests
require a personal token". `cast logs` over the Keystore timed out at 120s on three public
endpoints. Anything that indexes `KeyRegistered` and `KeyRevoked` needs a paid endpoint. Live view
calls are fine on the public nodes.

**Keep the demo's own footprint honest.** The relay reports only the native token as a fee token on
every chain, so every agent wallet needs BNB in it before it can act. Fund each of the four with a
visible, small balance and show it, since "add funds" is also XP quest step 2.

## Sources

Live pages read 2026-09-05:

- `https://www.bnbchain.org/en/hackathons/smart-money-era` (Prizes tab plus Tracks tab, the Altana
  criteria verbatim). Saved as `three/research/raw/bnb-smart-money-era-2026-09-05.html`.
- `https://explorer.altana.network/` and `/account/0x27146E20c2fb2521c7DD73e97bE030C3147c9da6` and
  `/key/0x13f5e22da8d5e00e86c1ee6e79f1f9868483d87bf425a23ef17fabd8f30aad4b`.
- `https://testnet.altana.network/` (source of the Sepolia and Base Sepolia addresses).
- `https://xp.altana.network/` and `https://xp.altana.network/xp/<wallet>`. Saved as
  `three/research/raw/altana-xp-2026-09-05.html` and `altana-xp-account-2026-09-05.html`.
- `https://docs.altana.network/llms-full.txt`. Saved as
  `three/research/raw/altana-llms-full-2026-09-05.txt` (244,785 B, 4,893 lines). Compared against
  the 2026-08-27 capture `altana-llms-full.txt` (206,814 B, 4,315 lines).
- `https://docs.altana.network/security/audits` (CertiK, 2026-07-15).
- `https://skills.altana.network/index.json`, `/llms.txt`, `/llms-full.txt`. Saved as
  `three/research/raw/altana-skills-index-2026-09-05.json`,
  `altana-skills-llms-2026-09-05.txt`, `altana-skills-llms-full-2026-09-05.txt` (56,032 B, 1,240
  lines, all ten SKILL.md files).
- `https://www.bnbchain.org/en/blog/altana-in-bnb-agent-studio-agents-with-limits-you-set`. Saved as
  `three/research/raw/bnbchain-altana-blog-2026-09-05.html`.

Source read from GitHub, `altananetwork/altana-sdk` branch `staging` (the default branch, not
`main`), saved into `three/research/raw/`:

- `altana-sdk-staging-keystore.ts` (`packages/wallet/src/internal/keystore.ts`), the Controller and
  KeyStore ABIs the SDK uses and the v0 key conventions.
- `altana-sdk-staging-sessions.ts` (`internal/sessions.ts`), the permission types plus
  `serializeSession` and `deserializeSession`.
- `altana-sdk-staging-relay.ts` (`internal/relay.ts`), `KeyDescriptor`, `submitCalls`, `toPortoKey`,
  `fundNative`.
- `altana-sdk-staging-grantSession.ts`, `altana-sdk-staging-revokeSession.ts`,
  `altana-sdk-staging-config.ts`, `altana-sdk-staging-index.ts` (the full export surface),
  `altana-sdk-staging-erc1271.ts`, `altana-sdk-staging-registerSessionKey.ts`,
  `altana-sdk-staging-README.md`, `altana-sdk-staging-sessionDescriptor.test.ts`.

Packages inspected from npm:

- `@altananetwork/sdk@0.9.0` tarball, unpacked, `dist/config.js` diffed against the 2026-08-27
  capture and `dist/erc8004.js` plus `dist/erc8183.js` read for the permission helpers.
- `@altananetwork/x402-server@0.2.0` tarball, `dist/tokens.js` for `U_TOKEN` and `USDT_BSC`.
- Registry metadata for `@altananetwork/mcp` and `@altananetwork/hypersigner-keystore-mcp`.

Local captures read first, per the brief: `three/research/raw/altana-llms-full.txt`,
`altana-sdk-config-2026-08-27.ts`, `altana-sdk-erc8183-0.8.0.js`,
`altana-skills-index-2026-08-27.json`, `altana-skills-2026-08-27.txt`.

On-chain verification, `cast 1.7.1`, sequential calls with a pause between each:

- BSC mainnet `https://bsc-rpc.publicnode.com` (chain-id confirmed 56), fallback
  `https://bsc-dataseed.binance.org` for archive receipts.
- BSC testnet `https://bsc-testnet-rpc.publicnode.com`.
- Ethereum `https://ethereum-rpc.publicnode.com`, Ethereum Sepolia
  `https://ethereum-sepolia-rpc.publicnode.com`, Base `https://base-rpc.publicnode.com`, Base
  Sepolia `https://base-sepolia-rpc.publicnode.com`.
- Selector and event-topic resolution with `cast selectors`, `cast 4byte` and `cast 4byte-event`,
  every one cross-checked by re-hashing the resolved signature with `cast sig` or `cast keccak`.
- Relay JSON-RPC: `health` and `wallet_getCapabilities` on `https://relay.altana.network` and
  `https://testnet-relay.altana.network`, plus one `wallet_addFaucetFunds` probe whose returned hash
  was then read back with `cast tx` and `cast receipt`.

Transactions cited: `0xe16740c8b81323d4f4a1a41175c5891dad06ac8b4cc9bdb15abed5c1c463e7f3` (a real
grant, block 120010186, carrying `KeyRegistered` plus 31 `CanExecuteSet` plus 26 `SpendLimitSet`),
`0x0dfcf2e6f1e03ab52a68ba955ce9660d1c7e5cf0c1f57d41a13cb5bbbd6ea10a` (a real revoke, carrying
`KeyRevoked`), `0x6e08a0f47255ef0468775673842ee7f484b112db56158736f7971541c60ad3cf` (the testnet
relay faucet probe, block 129165450, status 1, calldata `mint(address,uint256)` to the zero
address).















