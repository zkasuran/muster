# R10: Human verification for the BNB Agent Studio marketplace

Research pass, 2026-09-05. Every address, signature and number below came from a `cast` call
or an HTTP fetch run today. Anything else is labelled unverified.

## Headline

BABT works exactly as advertised and costs one `balanceOf` call to check, but **1.0% of BSC
ERC-8004 agent owners hold one** (6 of 585 sampled), so a hard BABT gate on sellers deletes 99%
of the agent supply and with it the Agent Diversity score. The same attestation is nearly free
on the buyer side: the last 3,000 BSC feedbacks were written by **31 addresses**, the top 10 of
them produced 65.3% of the volume. **None of the top 12 holds a BABT or a Galxe Passport.**
Gate the review write path, tier the sellers.

---

## Verified facts

### The BABT contract

| Claim | Value | How verified |
| --- | --- | --- |
| BABT mainnet address | `0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8` | `cast call ... "name()(string)"` returns `"Binance Account Bound Token"`; the same address is the "Proxy" link under Mainnet on the Binance BAB APIs Spec page |
| Chain | BSC, chain id 56 | `cast chain-id --rpc-url https://bsc-rpc.publicnode.com` returns `56` |
| `name()` | `Binance Account Bound Token` | `cast call 0x2B09..D7c8 "name()(string)"` |
| `symbol()` | `BABT` | `cast call 0x2B09..D7c8 "symbol()(string)"` |
| It is a proxy | TransparentUpgradeableProxy, 3,623 bytes of runtime | `cast code` is 7,247 hex chars; PUSH4 scan finds `0x3659cfe6 upgradeTo`, `0x4f1ef286 upgradeToAndCall`, `0x5c60da1b implementation`, `0x8f283970 changeAdmin`, `0xf851a440 admin` |
| Implementation | `0x57340D99B7774C328b17b13d6b37548C84EE3C1e` | `cast storage 0x2B09..D7c8 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` |
| ProxyAdmin | `0x342627058d95a906c76017e3385ed866411f0f5f` | `cast storage 0x2B09..D7c8 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103` |
| ProxyAdmin owner | `0x3B3CDe73d5fdEa0702b842111504A78C45aDEcaB` | `cast call 0x3426..0f5f "owner()(address)"` |
| Contract name and compiler | `contracts/SBT.sol:SBT`, solc `0.8.9+commit.e5eed63a`, optimizer disabled, 200 runs | `curl "https://sourcify.dev/server/v2/contract/56/0x57340D99B7774C328b17b13d6b37548C84EE3C1e?fields=compilation"` |
| Source verification status | `exact_match` on runtime and creation bytecode, verified 2026-05-25 | same Sourcify record, `.match`, `.runtimeMatch`, `.creationMatch` |
| Interfaces it claims | ERC-165 `0x01ffc9a7` true, ERC-721 `0x80ac58cd` true, ERC721Metadata `0x5b5e139f` true, ERC721Enumerable `0x780e9d63` false, ERC-1155 `0xd9b67a26` false | `cast call 0x2B09..D7c8 "supportsInterface(bytes4)(bool)" <id>` for each |
| Live holders | 1,166,396 at block 120,026,269 | `cast call 0x2B09..D7c8 "totalSupply()(uint256)"` |
| Cumulative mints ever | 1,319,158 at block 120,026,269 | `cast storage 0x2B09..D7c8 8` returns `0x1420f6`; slot 8 is the `Counters.Counter _tokenId` in the verified source layout |
| Revoked or burned to date | 152,762, which is 11.58% of all BABTs ever minted | 1,319,158 minus 1,166,396 |
| Minting is live right now | the counter moved from 1,319,157 to 1,319,158 between two reads minutes apart | two `cast storage 0x2B09..D7c8 8` calls at blocks 120,024,929 and 120,026,269 |
| Token ids are sequential from 1, with gaps | `ownerOf(0)` and `ownerOf(2)` revert `Invalid tokenId`, `ownerOf(1)` and `ownerOf(3)` return addresses | `cast call 0x2B09..D7c8 "ownerOf(uint256)(address)" <id>` for 0,1,2,3 |
| Revoked ids in the first 40 | 2, 12, 14, 15, 16, 17, 23, 24, 31, 32, 33 (11 of 40, 27.5%) | loop of 40 `ownerOf` calls, `Invalid tokenId` means gone |
| A real live holder | token 1 is owned by `0xD57BBd836cF5bFB92A04f0Ddd5F069dCf0CF0547` | `cast call 0x2B09..D7c8 "ownerOf(uint256)(address)" 1` |
| Highest live token id | 1,319,158 exists, 1,319,159 reverts | `cast call ... "ownerOf(uint256)(address)" 1319158` then `1319159` |

### Non-transferability, measured rather than assumed

Every transfer and approval entry point is **absent from the ABI**, so the call hits no function
selector and no fallback. The revert carries no data at all, which is a different failure shape
from a `require` and matters if you plan to surface a reason to a user.

| Call, simulated from the real holder of token 1 | Result | How verified |
| --- | --- | --- |
| `transferFrom(holder, 0x..dEaD, 1)` | reverts, zero-length revert data | `cast call --from 0xD57B..0547 0x2B09..D7c8 "transferFrom(address,address,uint256)" ...`, then raw `eth_call` via curl shows `{"code":3,"message":"execution reverted"}` with no `data` key |
| `safeTransferFrom(holder, 0x..dEaD, 1)` | reverts, no data | same pattern |
| `approve(0x..dEaD, 1)` | reverts, no data | raw `eth_call` on selector `0x095ea7b3`, no `data` in the error |
| `setApprovalForAll(0x..dEaD, true)` | reverts, no data | `cast call --from` the holder |
| `getApproved(1)` | reverts, no data | raw `eth_call` on `0x081812fc`, no `data` |
| `isApprovedForAll(holder, spender)` | reverts, no data | `cast call --from` the holder |
| Why | the verified `SBT.sol` declares none of these six functions | `contracts/SBT.sol` from Sourcify, 234 lines, contains `attest`, `batchAttest`, `revoke`, `batchRevoke`, `burn`, `setBaseTokenURI`, `balanceOf`, `tokenIdOf`, `ownerOf`, `totalSupply`, `isOperator`, `isAdmin`, `tokenURI`, `supportsInterface` and nothing else |

**Trap for a builder.** `supportsInterface(0x80ac58cd)` returns **true** while `transferFrom` does
not exist. Any code path that reads the ERC-721 interface id and then assumes the transfer surface
is present will revert with no reason string. Treat BABT as ISBT721, never as an ERC-721.

### How to check that an address holds one

| Claim | Value | How verified |
| --- | --- | --- |
| The check Binance itself documents | call `balanceOf(address)`, `0` means no SBT, `1` means has a SBT | the BAB APIs Spec FAQ "How to check if an account holds BABT or not?" carries a web3.js sample against `0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8` with the comments `// 0 - does not have any SBT` and `// 1 - has a SBT` |
| `balanceOf` on a real holder | `1` | `cast call 0x2B09..D7c8 "balanceOf(address)(uint256)" 0xD57BBd836cF5bFB92A04f0Ddd5F069dCf0CF0547` |
| `balanceOf` on a non-holder | `0` | same call with `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` |
| `balanceOf(address(0))` | `0`, it does **not** revert | `cast call ... "balanceOf(address)(uint256)" 0x0000000000000000000000000000000000000000`. The ISBT721 doc comment claims it throws for the zero address. The implementation uses `_tokenMap.tryGet` and returns 0, so the comment is wrong |
| `tokenIdOf` on a holder | `1` | `cast call 0x2B09..D7c8 "tokenIdOf(address)(uint256)" 0xD57B..0547` |
| `tokenIdOf` on a non-holder | reverts with the string `The wallet has not attested any SBT` | raw `eth_call` on `0x773c02d4`, error `data` decodes to that string |
| Gas for the holder path | 34,809 total on `eth_estimateGas`, so about 13,809 above the 21,000 intrinsic | `cast estimate 0x2B09..D7c8 "balanceOf(address)(uint256)" <non-holder>` |
| Gas for the hit path | 32,414 total, about 11,414 above intrinsic | `cast estimate ... <holder>`. The miss path costs more, not less |
| Multicall3 is on BSC at the canonical address | `0xcA11bde05977b3631167028862bE2a173976CA11`, 3,809 bytes | `cast code 0xcA11..CA11 --rpc-url https://bsc-rpc.publicnode.com` |
| Batched check works in one `eth_call` | `aggregate3` over three `balanceOf` calldatas returned `[(true,0x..01),(true,0x..00),(true,0x..00)]` | `cast call 0xcA11..CA11 "aggregate3((address,bool,bytes)[])((bool,bytes)[])" "[(0x2B09..D7c8,false,0x70a08231...),(...),(...)]"` |
| Historical reads are NOT available on the free public RPC | `eth_call` at `latest - 1,000,000` returns HTTP 403 `Archive requests require a personal token` | `cast call ... --block 119026269 --rpc-url https://bsc-rpc.publicnode.com` |

### What a BABT attests, from Binance's own words

Every quotation below was read today from the page named beside it.

| Claim | Binance's exact words | Source page |
| --- | --- | --- |
| It attests a completed Binance identity check | "Binance Account Bound (BAB) tokens are the credentials of Binance users that have passed KYC." | binance.com/en/babt |
| Purpose | "It will function as a digital verification tool for Binance users who have completed identity verification." | the BAB minting FAQ, support/faq/detail/bacaf9595b52440ea2b023195ba4a09c |
| One per account | "One UID can only have one BAB token at one time and on one chain." | binance.com/en/babt |
| One per account, restated | "One verified Binance user ID allows the user to mint one BAB token only on a certain chain." | the 2022 launch announcement, support/announcement/detail/0fe1e7c8781844e29f56cb674231dfd7 |
| Non-transferable | "Non-transferable: Users cannot transfer BAB tokens to other users." | the launch announcement |
| Revocable | "It can be revoked by issuers." | binance.com/en/babt |
| The holder can also revoke | "Revocable: Users can revoke their BAB tokens" | the launch announcement |
| Re-mint cooldown | "Once revoked, you can mint again after 72 hours." | binance.com/en/babt |
| Moving it means re-minting | "If you want to transfer your BAB token to another address, you can revoke it and then mint it to your new address." | binance.com/en/babt |
| Recovery path | "If you somehow lose access to your wallet, you can revoke the token with your Binance account." | binance.com/en/babt |
| It is optional | "Getting a BAB Token is optional for Binance users" | developers.binance.com/en/docs/products/bab-token/introduction |
| No monetary value | "non-transferable and has no monetary value" | the BAB minting FAQ |
| The minter pays gas | "You'll see a pop-up with the gas fee for minting your BAB token." Paid from Spot or Funding Wallet, currency chosen by the user | the BAB minting FAQ |
| Original fee | "The initial gas fee is fixed at 1 BUSD." | the launch announcement |
| Chain | "It will first be issued on the BNB Chain by Binance." | the launch announcement |
| Launch | 2022-09-08 at 09:00 UTC | the launch announcement |

**Two disclaimers that shape what we may claim about holders.** Binance says its role "is limited
to issuing (upon request) the BAB Token for users who have completed identity verification
procedures for their Binance accounts, which may vary depending on the user's country of
residence", and, in the same disclaimer, "Binance is not making any representation to third-party
projects about the holders of the BAB Tokens." Read together: **the check behind a BABT is not one
uniform standard, it varies by country, then Binance explicitly declines to vouch for holders to us.**
So a marketplace may state "the operator holds a Binance Account Bound Token" and must not state
"Binance has verified this operator to us" or "this operator passed a specific KYC tier".

### What a BABT does not attest

| Claim | Value | How verified |
| --- | --- | --- |
| The token carries no attributes and no credentials | `tokenURI(1)` resolves to a JSON body whose `attributes` is `[]` and `credentialList` is `[]` | `curl https://www.binance.info/bapi/asset/v1/public/wallet-direct/babt/metadata/1` |
| Every token shares the same name, description and image | tokens 1, 1000 and 1,166,395 returned byte-identical bodies apart from `id` | three curls to the same endpoint |
| The only per-token value is an opaque 32-byte `id` | token 1 `0xc6d75ff9...fdbcfe0a`, token 1000 `0xfcb24f87...6fa82ed9`, token 1,166,395 `0x37089b60...f9aec14c` | same three curls |
| The `id` is not derivable from public data | it is not `keccak("1")`, not `keccak(abi.encode(1))`, not `keccak(owner)` | `cast keccak` on each candidate, none matches |
| Binance says the `id` is deliberately hard to invert | "we've utilized an encryption algorithm to prevent the `id` been inferred by the hash cracking(like the rainbow table)" | the BAB APIs Spec FAQ |
| No KYC tier, no country, no document type, no name, no birthdate appears anywhere | the four JSON keys are `id`, `description`, `externalUrl`, `image`, `name`, plus the two empty arrays | the metadata body, 276 bytes total |
| There is no public REST endpoint that answers "does this address hold one" | `/babt/holder`, `/babt/check`, `/babt/token` with an `address` query all return HTTP 404 from the same `bapi` host that serves metadata on 200 | four curls against `https://www.binance.info/bapi/asset/v1/public/wallet-direct/babt/*` |

### Revocation, re-minting and the unlinkability property

This is the part most integrations get wrong. Binance's own FAQ warns about it in as many
words: **"Don't use `tokenId` as the identity of a KYC user, because the user can revoke the old
BAB token and mint a new one to another wallet, in this case, the `tokenId` will change."**

| Claim | Value | How verified |
| --- | --- | --- |
| Binance can revoke without the holder | `revoke(address from)` and `batchRevoke(address[])` require `OPERATOR_ROLE`, not the holder's signature | `contracts/SBT.sol` lines 111 to 152, `require(hasRole(OPERATOR_ROLE, _msgSender()), "Only the account with OPERATOR_ROLE can revoke the SBT")` |
| The holder can burn their own | `burn()` takes no argument and acts on `_msgSender()`, with no role check | `contracts/SBT.sol` lines 154 to 169 |
| Batch operations are capped at 100 | `require(addrLength <= 100, "The max length of addresses is 100")` in both `batchAttest` and `batchRevoke` | `contracts/SBT.sol` lines 91 and 135 |
| Revoke and burn both emit `Transfer(holder, address(0), tokenId)` | plus `Revoke` or `Burn` respectively | `contracts/SBT.sol` lines 124 to 125 and 167 to 168 |
| `OPERATOR_ROLE` | `0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929` | `cast call 0x2B09..D7c8 "OPERATOR_ROLE()(bytes32)"` equals `cast keccak "OPERATOR_ROLE"` |
| Its admin role | `DEFAULT_ADMIN_ROLE`, which is `bytes32(0)` | `cast call 0x2B09..D7c8 "getRoleAdmin(bytes32)(bytes32)" 0x9766...b929` returns all zeroes |
| Role membership is not enumerable | `getRoleMemberCount(bytes32)` reverts, the contract inherits plain `AccessControl` with no enumerable extension | `cast call 0x2B09..D7c8 "getRoleMemberCount(bytes32)(uint256)" 0x9766...b929` |
| The ProxyAdmin owner also holds `DEFAULT_ADMIN_ROLE` on the token | `isAdmin(0x3B3CDe73d5fdEa0702b842111504A78C45aDEcaB)` returns true, `isOperator` returns false | `cast call 0x2B09..D7c8 "isAdmin(address)(bool)"` and `"isOperator(address)(bool)"` |
| **The 72 hour cooldown is not on chain** | `attest` requires only `to != address(0)` and `!_tokenMap.contains(to)`. There is no timestamp check anywhere in the contract | `contracts/SBT.sol` lines 64 to 82. The 72 hour lock is a Binance backend policy, so do not build logic that expects the chain to enforce it |
| **The contract does not enforce one-per-person, only one-per-address** | `!_tokenMap.contains(to)` is an address check. Nothing on chain links two addresses to one UID | `contracts/SBT.sol` line 70 |
| Revoked tokens stop serving metadata | tokens 2, 12, 14, 15, 16 and 17 all return HTTP 404 with a zero-length body | six curls to the metadata endpoint, cross-checked against the six `ownerOf` reverts |
| A live token returns 200 with 276 bytes | token 1 | `curl -D - ...metadata/1` shows `HTTP/2 200`, `content-type: application/json;charset=UTF-8`, `content-length: 276` |
| Binance designed the 404 deliberately, for unlinkability | "if the user remints his/her BAB token to a new wallet, we will return empty when someone accesses the old token's metadata so that the others can't relate those two different wallets by the `id`" | the BAB APIs Spec FAQ |
| The metadata endpoint answers on both hosts, identically | `www.binance.com` and `www.binance.info` both return the same `id` for token 1 | two curls |
| No rate limiting observed on a 12 request burst | statuses were `200 404 200 200 200 200 200 200 200 200 200 404`, matching the on-chain live set exactly | sequential loop over ids 1 to 12 |

**The consequence, spelled out.** A revoked token's `id` becomes unfetchable. Binance says the
`id` is stable for the same person. So the only correlation a marketplace can do is between two
**currently live** tokens. It cannot link a person's old wallet to their new one. Neither can
we. That is a privacy feature we inherit for free and must not defeat by caching `id` values
against wallets after a revocation.

### Testnet BABT, so the gate can be exercised without touching mainnet

| Claim | Value | How verified |
| --- | --- | --- |
| BSC Testnet BABT | `0x984E6a7b9cb73cB7884c9ca9b1Ee625546F9D0E3` on chain 97 | listed as "Proxy" under Testnet on the BAB APIs Spec page; `cast chain-id --rpc-url https://bsc-testnet-rpc.publicnode.com` returns `97` |
| Same name and symbol | `Binance Account Bound Token` / `BABT` | `cast call 0x984E..D0E3 "name()(string)"` and `"symbol()(string)"` |
| Testnet supply | 1,252 | `cast call 0x984E..D0E3 "totalSupply()(uint256)"` |
| Testnet holder | token 1 owned by `0xEF0BE943c92A23fa0b60aE59ee51e26C3E7dB3d8` | `cast call 0x984E..D0E3 "ownerOf(uint256)(address)" 1` |
| Testnet implementation | `0xd481659f36e46df6f7efb941e4b3b8ca2a46ba1a` | `cast storage 0x984E..D0E3 0x3608...2bbc --rpc-url https://bsc-testnet-rpc.publicnode.com` |
| Testnet ProxyAdmin | `0x2CDB8E6C27Fa7bD71F660f1162a0388BF3967968`, matching the docs table | `cast storage 0x984E..D0E3 0xb531...6103` |
| Testnet metadata is on IPFS, not `bapi` | `tokenURI(1)` is `https://bafybeiehwaobfjnl7rsjx7y3w6lbix6lkfm2ux4x2qegnkkhhy44btc3jm.ipfs.nftstorage.link/metadata/1` | `cast call 0x984E..D0E3 "tokenURI(uint256)(string)" 1`. Do not assume the testnet metadata shape matches mainnet |
| Testnet minting is by request only | "If you want to mint the BAB Token to wallet accounts, please fill in the form" | the BAB APIs Spec FAQ, which links a Google form. So testnet BABTs are not self-serve |

### The exclusion problem, measured

This is the number that decides the design.

| Claim | Value | How verified |
| --- | --- | --- |
| BSC ERC-8004 agents indexed | 303,461 | `GET https://api.8004scan.io/api/v1/agents?chain_id=56&is_testnet=false&limit=100&offset=0`, field `total` |
| Distinct agent owners sampled | 585, from 600 agents on the default `created_at desc` ordering | six pages of that endpoint, `owner_address` deduplicated |
| **Agent owners holding a BABT** | **6 of 585, 1.0%** | 585 `eth_call` pairs of `balanceOf` against `0x2B09..D7c8` and `0xe840..c012`, 0 failures, saved to `raw/babt-galxe-coverage-agent-owners-2026-09-05.json` |
| Agent owners holding a Galxe Passport | 6 of 585, 1.0% | same run |
| Holding both | 3 of 585, 0.5% | same run |
| Holding either | 9 of 585, 1.5% | same run |
| **Holding neither** | **576 of 585, 98.5%** | same run |
| Among the 300 most reviewed agents | 96 distinct owners, 3 with a BABT (3.1%), 1 with a Galxe Passport (1.0%), 4 with either (4.2%) | same endpoint with `sort_by=total_feedbacks&sort_order=desc`, three pages, then the same on-chain checks |
| 8004scan's own `is_verified` flag is unused on BSC | 0 of those 300 agents carry it | field `is_verified` in the same response |
| 8004scan's `owner_publisher_tier` is unused on BSC | all 300 returned `null` | field `owner_publisher_tier` |
| `x402_supported` is set on a minority | 24 of 300 of the most reviewed agents | field `x402_supported` |
| Registration is permissionless and free beyond gas | `register()`, `register(string)` and `register(string, MetadataEntry[])` have no access control and no fee | `erc8004-src-IdentityRegistryUpgradeable-2026-09-05.sol` lines 60 to 99, verified against the deployed `getVersion()` of `"2.0.0"` |

**Read it plainly.** 99 out of every 100 people who already publish an agent on BSC cannot pass a
BABT gate today. A marketplace that requires BABT to list has an inventory of about nine agents
from a 600 agent pool, which scores zero on Agent Diversity and cannot fill four mandated
categories.

### Buyer-side sybil resistance, measured

Reviews and disputes are the part that breaks first, because the write path is open.

| Claim | Value | How verified |
| --- | --- | --- |
| Reputation Registry on BSC | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`, implementation `0x16e0fa7f7c56b9a767e34b192b51f921be31da34`, `getVersion()` is `"2.0.0"` | `cast storage` on the EIP-1967 slot, then `cast call ... "getVersion()(string)"` |
| It is wired to the Identity Registry we already verified | `getIdentityRegistry()` returns `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `cast call 0x8004BAa1..9b63 "getIdentityRegistry()(address)"` |
| **`giveFeedback` has no authorisation gate** | the only check is `require(!isAuthorizedOrOwner(msg.sender, agentId), "Self-feedback not allowed")`. No proof of purchase, no payment, no allowlist, no cost beyond gas | `erc8004-src-ReputationRegistryUpgradeable-2026-09-05.sol` lines 95 to 133. Selector `0x3c036a7e` is present in the deployed runtime bytecode |
| The self-feedback guard is one wallet deep | it checks `isAuthorizedOrOwner(msg.sender, agentId)`, which resolves to `_isAuthorized(ownerOf(agentId), spender, agentId)`. Register from wallet A, review from unrelated wallet B, then it passes | Reputation Registry lines 108 to 110, Identity Registry lines 205 to 208 |
| One address may leave unlimited feedback on one agent | `uint64 currentIndex = ++$._lastIndex[agentId][msg.sender]` with no cap | Reputation Registry line 115 |
| **Anyone may append a response to anyone's feedback** | `appendResponse` checks only `feedbackIndex > 0`, a non-empty URI and an index bound. It never checks that `msg.sender` owns the agent | Reputation Registry lines 145 to 167 |
| Only the author can revoke their own feedback | `revokeFeedback` indexes `$._feedback[agentId][msg.sender][...]` | Reputation Registry lines 135 to 143 |
| Total BSC feedbacks indexed | 11,780 | `GET https://api.8004scan.io/api/v1/feedbacks?chain_id=56&is_testnet=false&limit=5`, field `total` |
| **The last 3,000 BSC feedbacks came from 31 addresses** | 31 distinct `user_address` values across 260 distinct agents | 30 pages of that endpoint at `limit=100`, `sort_by=created_at&sort_order=desc`, then a `collections.Counter`. Slimmed record set saved to `raw/8004scan-feedbacks-bsc-3000-slim-2026-09-05.json` |
| The top 10 of those wrote 65.3% of the sample | 1,959 of 3,000 | same analysis |
| The busiest single address wrote 209 feedbacks across 35 agents | `0xdc7061aef29c41cb8a2f3b562f7a462835c747d4` | same analysis |
| One address left up to 12 feedbacks on a single agent | five separate address and agent pairs hit 12 | `pair.most_common(5)` over the same sample |
| The highest `feedback_index` seen | 18 | same analysis |
| **None of the 12 heaviest reviewers holds a BABT** | all 12 returned `balanceOf` 0 on BABT and 0 on Galxe Passport | 24 `eth_call`s, listed in full below |
| All 12 are plain EOAs with farm-shaped nonces | `cast code` returns empty for each, nonces run 1,021 to 1,326 | `cast code` and `cast nonce` for each of the 12 |

The 12 addresses, each verified `BABT=0` and `GalxePassport=0`:

```
0xdc7061aef29c41cb8a2f3b562f7a462835c747d4  209 feedbacks / 35 agents  nonce 1255
0xffcb18da8b65dae930504c03443b81d6738ad19b  209 feedbacks / 36 agents  nonce 1300
0x27240a11ae733b42764728442f2dad5a5e68fede  202 feedbacks / 35 agents  nonce 1326
0x03882ec12db6182e30d7165a9955781ade482baa  200 feedbacks / 32 agents  nonce 1286
0xd84e51b191f4089f69083078d0fb2ca0801326c7  192 feedbacks / 33 agents  nonce 1247
0x2fd9cacf0beb98608bea3abaf7769534f0701d3b  191 feedbacks / 35 agents  nonce 1326
0x2b91ba087961ddf38c8fab11e71cce2c1ac57329  191 feedbacks / 33 agents  nonce 1264
0xb57e067ff951943d44642fdd9f9f196311366959  191 feedbacks / 33 agents  nonce 1240
0x0ec00aaa2f6bfff03e34a4d70d4ae67dcdb20cea  189 feedbacks / 34 agents  nonce 1246
0x6ec9515c9a6a1f5bc6893cea21aaa3975fa40df7  185 feedbacks / 33 agents  nonce 1255
0x693a508c62d08a319dff9baa08bea7ddc2f5a855  184 feedbacks / 31 agents  nonce 1021
0x74138523c2cd1a29f12eaf1e098c744e2ebec3af  184 feedbacks / 31 agents  nonce 1224
```

**The asymmetry that makes the design work.** An attestation gate on the seller side costs 99% of
supply. The same gate on the review write path costs almost nothing, because almost nobody writing
reviews today is a real buyer. Raw 8004 reputation is not a signal a marketplace can display
unmodified.

### Alternative attestations, verified on chain 56

| Attestation | Address on BSC | What it actually proves | How verified |
| --- | --- | --- | --- |
| **BABT** | `0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8` | one live token per Binance UID per chain, issued after a Binance identity check whose depth varies by country. Revocable by Binance. Carries no personal data | everything in the sections above |
| **Galxe Passport** | `0xe84050261cb0a35982ea0f6f3d9dff4b8ed3c012` | a Sumsub `basic-kyc` pass with `reviewAnswer: GREEN`. Non-transferable with explicit revert reasons. Galxe states "Tokens in this contract do not contain any PII" and that it deletes the UUID linking Sumsub identity data to the wallet | `cast call` returns `name()` `"Galxe Passport"`, `symbol()` `"GALXE passport"`, `totalSupply()` 1,044,437, `ownerOf(1)` `0xCcbF2424B7cfc93a1017d453B4CAbFdD89fe4211`, `balanceOf(that)` 1. `transferFrom` reverts `GalxePassport: passport is not transferrable`, `approve` reverts `GalxePassport: approve is not allowed`. Interface flags identical to BABT: 165, 721 and Metadata true, Enumerable false |
| **BNB Attestation Service core** | `0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC` | a general attestation layer forked from EAS. Anything a named attester will sign for. Meaning comes from the attester, not the contract | `cast call ... "version()(string)"` returns `"1.3.0"`, `getSchemaRegistry()` returns the registry below. 18,882 bytes of code |
| BAS SchemaRegistry | `0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa` | `version()` `"1.3.0"` | `cast call`. `getSchema(bytes32)` resolves live schemas |
| BAS Delegate | `0x01dAc45529a070Cb67Fc5B328a7eBE394644355B` | 10,305 bytes deployed | `cast code` |
| **BNB Passport reader** | `0x97F0Ed637276907dcecbE49Bf08464Bdc7E46734` on 56, `0x63e7C33db44F3a14d27fd3E42B88FD8Cf6a5c953` on 97 | reads whether an address holds any of a set of KYC attestations, with an optional freshness cutoff. The SDK names six providers: `kyc_binance`, `kyc_bithumb`, `kyc_upbit`, `kyc_coinbase`, `kyc_okx`, `kyc_bybit` | both addresses return 1,160 bytes of identical TransparentUpgradeableProxy runtime. `get_user_attested_schemas(address)` executes and returns `[]`. Implementation is `0x9f18f2B889d8C99Aa07830a6f0088c3f2eAf05A8`, 13,573 bytes. Provider list read from `README.md` of the SDK repo |
| **ERC-8004 Identity Registry** | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | that somebody paid gas. Permissionless, unlimited, no human behind it | `register()` has no access control in the verified source |
| **Multicall3** | `0xcA11bde05977b3631167028862bE2a173976CA11` | not an attestation, the tool that makes checking hundreds of them one RPC call | `aggregate3` returned correct BABT results for three addresses |

**BAS is the same organisation that runs the ERC-8004 stack on BSC.** The GitHub org
`bnb-attestation-service` publishes `bas-contract`, `erc-8004-contracts`, `erc8004-sdk-py`,
`agent_scan_mcp_server` and `passportSDK`, verified by listing the org's 17 repos through the
GitHub API. Its homepage describes itself as "BNB Chain's native verification & reputation layer,
enabling composable KYC, identity, and asset proofs for RWA, DeFi & AI agents" and claims "40M+
Attestations", "2.5M+ Unique Addresses" and "100+ Partners". Those three counts are the site's own
marketing figures and were not independently verified.

### Alternatives that turned out NOT to be available on BSC

Negative findings are worth as much as positive ones here, because each one closes a design branch.

| Candidate | Verdict on chain 56 | How verified |
| --- | --- | --- |
| Human Passport, formerly Gitcoin Passport | **not deployed on BSC.** The decoder, resolver, verifier, attester and EAS schema tables cover Arbitrum, Base, Linea, Optimism, Scroll, Shape, zkSync Era plus four testnets. Chain 56 appears nowhere | read the live contract reference at docs.passport.human.tech/building-with-passport/contract-reference |
| Trusta Labs sybil score API | **BSC not supported.** The `chainId` enum on `POST /queryRiskSummaryScore` is `"1"`, `"42161"`, `"324"` only | read the live API reference at trustscan.readme.io/reference/query-sybil |
| The BNB Passport minting flow | **the host does not resolve today.** `passport.bnbattest.io` and `www.passport.bnbattest.io` both return NXDOMAIN, so curl gets HTTP 000 | `getent hosts passport.bnbattest.io`, `getent hosts www.passport.bnbattest.io`, plus curl. `bnbattest.io` and `bascan.io` do resolve |
| The BAS documentation site | `doc.bas.io` does not resolve, `www.bas.io` returns 200 | curl on both |
| Galxe Passport metadata | `tokenURI(1)` points at `https://graphigo.prd.galaxy.eco/metadata/1.json`, which returns the plain-text error `failed to get nft info: invalid nft address 1` | curl. The on-chain check still works, the metadata does not |

---

## Unverified or open

| Claim | What blocked it |
| --- | --- |
| That any BSC mainnet address currently holds a BNB Passport KYC attestation | every address probed returned `[]` from `get_user_attested_schemas`, including two live BAS attestation recipients. The mint host has no DNS record. Enumerating historical `Attested` events for the candidate schema needs an archive log range that all three public RPCs refuse (`Archive requests require a personal token`, `limit exceeded`) |
| Which schema UIDs correspond to `kyc_binance` and the other five providers | the SDK resolves the schema server side inside an iframe at the dead `passport.bnbattest.io/verify`, so the mapping is not in the published code. Of nine 32-byte constants extracted from the reader implementation, exactly one is registered in the BAS SchemaRegistry: `0x08ff4a23a1a44b6ede6f2fbc20f50f3992565944e050f9ba6f43ca8cc28d1339`, body `address userAddress`, revocable, no resolver. Whether that is the passport schema is inferred, not proven |
| That the BABT metadata `id` is genuinely stable for one person across re-mints | Binance states it ("for the same person, `id` will never be changed"). Testing it requires minting, revoking and re-minting a real BABT, which needs a Binance account and 72 hours |
| Who holds `OPERATOR_ROLE` on BABT | plain `AccessControl` with no enumerable extension, so `getRoleMemberCount` reverts. Enumerating `RoleGranted` events needs archive logs, which the public RPCs refuse |
| The current BABT mint fee | the 2022 announcement fixes it at "1 BUSD". BUSD was discontinued. The current FAQ says only that a gas-fee popup appears and the user picks the currency. No number is published today |
| Whether the ProxyAdmin owner is a multisig or an EOA | `cast code` on `0x3B3CDe73d5fdEa0702b842111504A78C45aDEcaB` was not run. Worth one call before quoting a trust assumption |
| The 40M attestations / 2.5M addresses / 100+ partners figures for BAS | read off bnbattest.io marketing copy. Not cross-checked against chain data |
| Whether zkPass has a verifier contract on BSC | a third-party post says zkPass indexes eight EVM networks "including Optimism, BNB, Base, Arbitrum, and X Layer", but no BSC address is published in anything primary that was read. Do not cite this as available |
| BABT holder count as a share of Binance users | 1,166,396 live BABTs is verified. No primary Binance figure for total verified users was read today, so no ratio is asserted |
| Whether a marketplace can prove a BABT was held **at the time** a review was written | historical `eth_call` is 403 on the free RPC. Either pay for archive access or record the check result at write time |
| Rate limits on the BABT metadata endpoint | a 12 request burst saw no throttling. That is not evidence of a high ceiling |

---

## Interfaces and constants

### Addresses, all verified on chain today

```
BSC mainnet, chain id 56
  BABT (SBT proxy)              0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8
  BABT implementation           0x57340D99B7774C328b17b13d6b37548C84EE3C1e
  BABT ProxyAdmin               0x342627058d95a906c76017e3385ed866411f0f5f
  BABT ProxyAdmin owner         0x3B3CDe73d5fdEa0702b842111504A78C45aDEcaB
  Galxe Passport                0xe84050261cb0a35982ea0f6f3d9dff4b8ed3c012
  BAS core                      0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC   version 1.3.0
  BAS SchemaRegistry            0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa   version 1.3.0
  BAS Delegate                  0x01dAc45529a070Cb67Fc5B328a7eBE394644355B
  BNB Passport reader           0x97F0Ed637276907dcecbE49Bf08464Bdc7E46734
  BNB Passport reader impl      0x9f18f2B889d8C99Aa07830a6f0088c3f2eAf05A8
  Multicall3                    0xcA11bde05977b3631167028862bE2a173976CA11

BSC testnet, chain id 97
  BABT                          0x984E6a7b9cb73cB7884c9ca9b1Ee625546F9D0E3
  BABT implementation           0xd481659f36e46df6f7efb941e4b3b8ca2a46ba1a
  BABT ProxyAdmin               0x2CDB8E6C27Fa7bD71F660f1162a0388BF3967968
  BNB Passport reader           0x63e7C33db44F3a14d27fd3E42B88FD8Cf6a5c953
  BAS core                      0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD
  BAS SchemaRegistry            0x08C8b8417313fF130526862f90cd822B55002D72
  BAS Delegate                  0x3b32B97092f09Ad34E5766e239e4C2F76b0DEe43
```

### ISBT721, the interface BABT actually implements

Verbatim from `contracts/interfaces/ISBT721.sol` in the Sourcify record, byte-identical to the
listing on the Binance BAB APIs Spec page. This is what to paste, not IERC721.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISBT721 {
    event Attest(address indexed to, uint256 indexed tokenId);
    event Revoke(address indexed from, uint256 indexed tokenId);
    event Burn(address indexed from, uint256 indexed tokenId);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function attest(address to) external returns (uint256);
    function revoke(address from) external;
    function burn() external;
    function balanceOf(address owner) external view returns (uint256);
    function tokenIdOf(address from) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function totalSupply() external view returns (uint256);
}
```

The deployment adds four functions the interface does not declare, all present in the verified
source: `batchAttest(address[])`, `batchRevoke(address[])`, `setBaseTokenURI(string)`,
`isOperator(address)`, `isAdmin(address)`, plus `name()`, `symbol()`, `tokenURI(uint256)`,
`supportsInterface(bytes4)` and the plain `AccessControl` surface.

### Selectors and event topics, all computed with `cast`

```
balanceOf(address)                0x70a08231   <- the check
tokenIdOf(address)                0x773c02d4   <- reverts for non-holders
ownerOf(uint256)                  0x6352211e
totalSupply()                     0x18160ddd
attest(address)                   0xeb31403f   OPERATOR_ROLE
batchAttest(address[])            0x6c60144a   OPERATOR_ROLE, max 100
revoke(address)                   0x74a8f103   OPERATOR_ROLE
batchRevoke(address[])            0x011002df   OPERATOR_ROLE, max 100
burn()                            0x44df8e70   holder only, no args

Attest(address,uint256)    0xe9274a84b19e9428826de6bae8c48329354f8f0e73f771b97cae2d9dccd45a27
Revoke(address,uint256)    0xec9ab91322523c899ede7830ec9bfc992b5981cdcc27b91162fb23de5791117b
Burn(address,uint256)      0xcc16f5dbb4873280815c1ee09dbd06736cffcc184412cf7a71a0fdb75d397ca5
Transfer(addr,addr,uint256)0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef

OPERATOR_ROLE      0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929
DEFAULT_ADMIN_ROLE 0x0000000000000000000000000000000000000000000000000000000000000000
```

A mint is `Attest(to, id)` followed by `Transfer(0x0, to, id)`. A revoke is `Revoke(from, id)` then
`Transfer(from, 0x0, id)`. A self-burn is `Burn(from, id)` then the same zero-address `Transfer`.
Index all three and you have the full lifecycle without polling.

### The metadata JSON, exactly as returned today

`GET https://www.binance.info/bapi/asset/v1/public/wallet-direct/babt/metadata/{tokenId}`
also served from `https://www.binance.com/...`. Live token, HTTP 200, 276 bytes:

```json
{
  "id": "0xc6d75ff92bc9bcc69339e24b082738473db8e1c05a25ddc80791a398fdbcfe0a",
  "description": "Binance Account Bound Token",
  "externalUrl": "https://safu.im/U9eeKjE4",
  "image": "https://public.nftstatic.com/images/babt/token-dark.gif",
  "name": "BABT",
  "attributes": [],
  "credentialList": []
}
```

Revoked or burned token: **HTTP 404, `content-length: 0`, empty body.** Not a JSON error object.
Any client must treat a non-200 as "no attestation available" without parsing.

Note `credentialList` is present in the live response and absent from the documented example on the
BAB APIs Spec page. It was `[]` for all three tokens sampled. Do not assume it stays empty forever.

### One RPC call for one address

```bash
cast call 0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8 \
  "balanceOf(address)(uint256)" <ADDRESS> \
  --rpc-url https://bsc-rpc.publicnode.com
# 1 = holds a live BABT, 0 = does not. Never reverts, including for address(0).
```

Raw JSON-RPC, no tooling:

```bash
curl -s -X POST https://bsc-rpc.publicnode.com -H 'content-type: application/json' --data '{
  "jsonrpc":"2.0","id":1,"method":"eth_call","params":[{
    "to":"0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8",
    "data":"0x70a08231000000000000000000000000d57bbd836cf5bfb92a04f0ddd5f069dcf0cf0547"
  },"latest"]}'
# {"jsonrpc":"2.0","id":1,"result":"0x...0001"}
```

### N addresses in one RPC call, via Multicall3

Verified working on BSC. `allowFailure: false` is safe here because `balanceOf` cannot revert.

```bash
cast call 0xcA11bde05977b3631167028862bE2a173976CA11 \
  "aggregate3((address,bool,bytes)[])((bool,bytes)[])" \
  "[(0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8,false,0x70a08231000000000000000000000000d57bbd836cf5bfb92a04f0ddd5f069dcf0cf0547),\
    (0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8,false,0x70a08231000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045)]" \
  --rpc-url https://bsc-rpc.publicnode.com
# [(true, 0x...0001), (true, 0x...0000)]
```

Mix contracts inside one batch to resolve a whole tier in a single round trip: BABT `balanceOf`,
Galxe Passport `balanceOf` and the BNB Passport `user_finished_one_of_attestation` all in the same
`aggregate3` array.

### The on-chain gate, if a contract has to enforce it

```solidity
pragma solidity ^0.8.20;

interface ISBT721Minimal {
    function balanceOf(address owner) external view returns (uint256);
}

/// Measured on BSC: about 11.4k gas of execution on a hit, about 13.8k on a miss,
/// on top of the cold account access. Never reverts, so no try/catch needed.
library HumanTier {
    address internal constant BABT  = 0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8;
    address internal constant GALXE = 0xe84050261cb0a35982ea0f6f3d9dff4b8ed3c012;

    function hasBabt(address who) internal view returns (bool) {
        return ISBT721Minimal(BABT).balanceOf(who) != 0;
    }

    function hasGalxePassport(address who) internal view returns (bool) {
        return ISBT721Minimal(GALXE).balanceOf(who) != 0;
    }
}
```

Do not call `tokenIdOf` in a gate. It reverts for non-holders, so a plain read bubbles up and kills
the transaction. `balanceOf` returns zero instead, which is the behaviour a gate wants.

### The BNB Passport reader ABI, the OR-ladder primitive

Read from `src/abi/func_abi.json` in the `passportSDK` repo. Each function executes against the
live mainnet address. This is the shape a tier ladder wants: not "does this address hold X" but
"does this address hold **any** of these, attested **after** this timestamp".

```solidity
struct AttestationRecord {
    bytes32 attestation_id;
    bytes32 proof_hash;
    uint64  timestamp;
    uint8   _type;        // enum AttestationType
}

function get_user_attested_schemas(address user)
    external view returns (bytes32[] memory);

function get_user_attested_schemas_in_given_schema_set(address user, bytes32[] calldata schemas)
    external view returns (bytes32[] memory);

function get_user_last_attestation_record(address user, bytes32 schema_id)
    external view returns (AttestationRecord memory, bool exists);

function user_finished_all_attestation(address user, bytes32[] calldata schemas)
    external view returns (bool);

function user_finished_all_attestations_after(address user, bytes32[] calldata schemas, uint64 timestamp)
    external view returns (bool);

function user_finished_one_of_attestation(address user, bytes32[] calldata schemas)
    external view returns (bool);

function user_finished_one_of_attestation_after(address user, bytes32[] calldata schemas, uint64 timestamp)
    external view returns (bool);
```

Verified working:

```bash
cast call 0x97F0Ed637276907dcecbE49Bf08464Bdc7E46734 \
  "get_user_attested_schemas(address)(bytes32[])" <ADDRESS> \
  --rpc-url https://bsc-rpc.publicnode.com
# []  for every address probed today, see Unverified
```

The six KYC provider strings the SDK documents, quoted from its README: `kyc_binance`,
`kyc_bithumb`, `kyc_upbit`, `kyc_coinbase`, `kyc_okx`, `kyc_bybit`. Two typos in the shipped config
are worth knowing before wiring anything to it: the mainnet URL is
`'https:passport.bnbattest.io/verify'`, missing the double slash. The dev host is spelled
`dev.passsport.bnbattest.io` with three esses. Neither host resolves.

### BAS, if we want to issue our own attestations

```bash
# read a schema
cast call 0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa \
  "getSchema(bytes32)((bytes32,address,bool,string))" <UID> \
  --rpc-url https://bsc-rpc.publicnode.com

# a live example, read today
# uid    0x4a188ee275e449b29cb41b6257ca00e3e82db3f1b0c8166530169fc3c320b681
# body   "address participant,string questKey,uint32 points,uint64 completedAt,uint32 seasonNumber"
# resolver 0x0000...0000, revocable true

# the minimal identity-shaped schema, also registered
# uid    0x08ff4a23a1a44b6ede6f2fbc20f50f3992565944e050f9ba6f43ca8cc28d1339
# body   "address userAddress"
# resolver 0x0000...0000, revocable true
```

The `Attested` event topic is
`0x8bf46bf4cfd674fa735a3d63ec1c9ad4153f033c290341f3a588b75685141b35` for
`Attested(address recipient, address attester, bytes32 uid, bytes32 schemaUID)`, with `recipient`,
`attester` and `schemaUID` indexed. Two such events landed in a 400 block window today, both under
the quest schema, both from attester `0xf37b62a37ca6933a9cd84b854e81c58c9bdbbcd0`.

Note the `address userAddress` schema shape. An attestation whose entire payload is the wallet
address carries no personal data by construction: the meaning lives in **who signed it**, not in
what it says. That is the right pattern to copy if we ever issue our own tier.

### The 8004 review write path, for the gate to wrap

```solidity
function giveFeedback(
    uint256 agentId,
    int128  value,
    uint8   valueDecimals,
    string  calldata tag1,
    string  calldata tag2,
    string  calldata endpoint,
    string  calldata feedbackURI,
    bytes32 feedbackHash
) external;                                    // selector 0x3c036a7e

function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;
function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex,
                        string calldata responseURI, bytes32 responseHash) external;
function getClients(uint256 agentId) external view returns (address[] memory);   // 0x42dd519c
function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64);
```

The only guard in `giveFeedback` is one line:

```solidity
require(!IIdentityRegistry(_identityRegistry).isAuthorizedOrOwner(msg.sender, agentId),
        "Self-feedback not allowed");
```

That is the whole sybil defence in the standard. It blocks the agent's own wallet and nothing else.

### The 8004scan feedback record shape, for a marketplace to reweight

```json
{
  "feedback_id": "56:153776:0xc7f5cdc8dd028e0b9af2ca9d3891f135b23f4b92:2",
  "agent_id": "6829ee4e-24d8-4f3c-ba1e-3b4b4c273f36",
  "user_address": "0xc7f5cdc8dd028e0b9af2ca9d3891f135b23f4b92",
  "feedback_index": 2,
  "value": "674",
  "value_decimals": 0,
  "score": null,
  "tag1": "responseTime",
  "tag2": "4d",
  "chain_id": 56,
  "block_number": 119137534,
  "transaction_hash": "0x8887280196f44a2e3537bc84f37bbe35aefac542fadabd096d1059ba827b24d4",
  "feedback_uri": "ipfs://QmdDMBWQG6kekn8n8KGMfNYduiMsN6MpnXQbbqN66Xqfcx",
  "feedback_hash": "0xdcd5c4e4efba5b1bae07b6f1145f49c507621785406f0df7bd92cb3684eadbf4",
  "endpoint": "https://api.bortagent.xyz/.well-known/agent-card.json",
  "agent": { "token_id": "153776", "chain_id": 56, "name": "BORT Governance Lens #10923" }
}
```

`feedback_id` is `chainId:tokenId:clientAddress:feedbackIndex`, so the sybil signal is already in
the primary key: group by `clientAddress`, count distinct agents, then the farm falls out. Endpoint
is `GET https://api.8004scan.io/api/v1/feedbacks?chain_id=56&is_testnet=false&limit=100&offset=N`,
`limit` capped at 100 (422 above it), `sort_by` and `sort_order` supported, `user_address` filter
supported.

---

## Design implications for the marketplace

### 1. BABT is a tier, never a gate. Here is the ladder.

The measurement decides this. 1.0% seller coverage means a gate is a self-inflicted wound on the
Agent Diversity criterion. Five tiers, each a single `balanceOf` or one `aggregate3` slot, each
unlocking a specific privilege rather than access:

| Tier | Requirement | What it unlocks | Cost to the operator |
| --- | --- | --- | --- |
| **0 Listed** | an ERC-8004 agent id whose `agentWallet` metadata matches the signer | appears in search, ranked last, review score shown as provisional | gas only |
| **1 Bonded** | a refundable stake in our own escrow, released after a clean window | ranked in the main list, may hold funds, eligible for disputes | capital, no KYC, no exchange account, permissionless |
| **2 Proven** | N settled x402 or B402 payments as the seller, plus non-zero on-chain trade history in its own category | category badges, appears in the four mandated category tabs, its reviews count at full weight | real usage |
| **3 Attested** | **any one of** BABT, Galxe Passport or a BNB Passport `user_finished_one_of_attestation` hit | a visible human-verified badge, higher spend caps, first page eligibility, dispute filing rights | one exchange KYC, of six providers |
| **4 Accountable** | Tier 3 plus an Altana Keystore session with a published call allowlist, spend cap and expiry that a user can read and revoke | can be hired over ERC-8183, top of the default sort, highest caps | wiring work |

Tier 3 is an **OR**. That is the whole answer to exclusion. BABT needs a Binance account.
Galxe Passport needs Sumsub and no exchange at all. BNB Passport's documented provider set spans
Binance, Bithumb, Upbit, Coinbase, OKX and Bybit, which covers Korea and the US where a Binance
account may be unavailable. A judge can see the ladder in the UI. Every rung is checkable in
one call.

Tier 1 is the rung that matters for fairness. A bond is permissionless, needs no document and no
exchange, so it is the only tier a sanctioned-jurisdiction operator or a pseudonymous builder can
always reach. Never make Tier 3 a prerequisite for Tier 1.

### 2. Weight the tier, do not filter on it

Ranking beats gating on every rubric line. A BABT holder should sort above a bare address. A
bare address with 400 settled payments should sort above a BABT holder with zero. Make the tier one
input to the rank, show it as a badge, then let the buyer filter if they want to. That way the
marketplace has 300,000 agents of inventory and still rewards verification.

### 3. Gate the review write path, because that is where it is nearly free

Verified: 31 addresses wrote 3,000 feedbacks, the top 12 hold no attestation of any kind, and
`giveFeedback` has no gate. So:

- **Full-weight reviews require a settled payment.** Bind each review to an x402 or B402 settle
  result. The settle response gives `{"success": true, "payer": "0x...", "transaction": "0x...",
  "network": "eip155:56"}`, so the `payer` is the only address allowed to review that agent for that
  transaction, once. That is proof of purchase. It costs a sybil real money per review rather
  than gas.
- **Then weight by buyer tier.** A review from a Tier 3 buyer outweighs one from Tier 0. Not a
  filter, a weight.
- **Cap per author per agent.** One address left 12 feedbacks on one agent on chain. Display at
  most the most recent one per author per agent, then show the author's distinct-agent count beside
  it so a 35-agent reviewer is visibly a bot.
- **Do not render `appendResponse` as the agent's official reply** unless `msg.sender` equals the
  agent owner. Anyone can append to anyone's feedback, so verify the responder before labelling it.
- **Compute our own score, cite the raw one.** Show the reweighted score as ours and link the raw
  8004 number. Displaying the raw number as the truth imports the farm.

### 4. Keep the check stateless and never store what you learn

A BABT check reveals exactly one bit: this wallet has a live Binance-issued attestation. Keep it
that way.

- **Read at request time, never cache the answer as a durable flag.** 11.58% of all BABTs ever
  minted are already revoked or burned, plus the issuer can revoke without the holder. A cached
  "verified" boolean is a claim that decays.
- **Cache the read, not the identity.** A 60 second in-memory TTL keyed by address is fine and
  keeps RPC cost flat. Persisting `verified: true` to a user row is not.
- **Never store the metadata `id`.** It is the stable per-person identifier. Persisting it builds a
  cross-wallet identity graph Binance deliberately made unbuildable by 404ing revoked tokens. Fetch
  it only for a live dedupe comparison and drop it in the same request.
- **Never store the tokenId** either, nor use it as a user key. Binance says so directly: it
  changes on re-mint.
- **Nothing personal exists to store.** Verified: the metadata carries `attributes: []` and
  `credentialList: []`, the same image for every token, plus no name, country, tier or document
  reference anywhere. There is no PII leak to guard against, only an identifier-correlation risk.
- **Say what you mean in the UI.** "Holds a Binance Account Bound Token" is verifiable. "KYC
  verified by Binance" is not ours to say, because Binance states it makes no representation about
  holders and that its procedures vary by country.
- **Record the check result, not the check.** Since historical `eth_call` is 403 on free RPCs,
  store `{address, tier, blockNumber, timestamp}` alongside a review at write time. That is an
  auditable claim about what was true then. It stores no identity.

### 5. Treat BABT as ISBT721 and expect the surprises

Five failure modes that will bite a naive integration, each verified above:

1. `supportsInterface(0x80ac58cd)` is **true** while `transferFrom` does not exist. Interface
   sniffing lies here.
2. Reverts on the transfer and approval surface carry **no revert data at all**, so a UI that
   expects a reason string shows nothing.
3. `tokenIdOf` reverts for non-holders. `balanceOf` does not. Use `balanceOf` in gates.
4. `totalSupply` counts **live** holders, not mints. The mint counter is a separate storage slot
   with no getter. Do not derive one from the other.
5. `ownerOf` reverts `Invalid tokenId` for revoked ids, then the metadata endpoint 404s for the same
   ids. Those two signals agree, which is a free consistency check worth asserting in tests.

### 6. Do not let the attestation become the pitch

Three judges score Functionality, Data Quality and Agent Diversity. Human verification serves all
three only if it is visible and cheap: a badge column in the listing, a filter chip, a tooltip
naming the exact contract and call, plus a number on the page saying how many listed agents are
attested. That reads as Data Quality. A modal that blocks 99% of the catalogue reads as a broken
marketplace.

### 7. Build it so a judge can reproduce it

Every claim in this file is a one-line `cast` call against a public RPC. Put those exact lines in
the repo, in a script a judge can run, then print the block number with the result. A verification
feature nobody can check is worth less than one they can.

---

## Sources

Primary Binance pages, all read 2026-09-05:

- BAB APIs Spec, the developer source of truth including the `ISBT721` listing, the mainnet and
  testnet addresses, the `balanceOf` code sample and the `id` guidance:
  https://developers.binance.com/legacy-docs/babt/apis-spec
- BAB Token introduction, carrying the disclaimer about Binance's limited role and no representation
  about holders: https://developers.binance.com/en/docs/products/bab-token/introduction
- BAB product page, one UID per token, revocable, the 72 hour re-mint rule:
  https://www.binance.com/en/babt
- BAB launch announcement 2022-09-08, the non-transferable and revocable properties, one UID per
  chain, the 1 BUSD initial fee:
  https://www.binance.com/en/support/announcement/detail/0fe1e7c8781844e29f56cb674231dfd7
- How to issue a BAB token, the minting steps and who pays gas:
  https://www.binance.com/en/support/faq/detail/bacaf9595b52440ea2b023195ba4a09c
- The live metadata endpoint:
  https://www.binance.info/bapi/asset/v1/public/wallet-direct/babt/metadata/1

Verified source and ABI:

- Sourcify record for the BABT implementation, `exact_match`:
  https://sourcify.dev/server/v2/contract/56/0x57340D99B7774C328b17b13d6b37548C84EE3C1e?fields=abi,sources,compilation
- Fallback ABI service used to cross-check: https://anyabi.xyz/api/get-abi/56/0x57340D99B7774C328b17b13d6b37548C84EE3C1e

Alternatives and negative findings:

- Galxe Passport docs, chain, contract, Sumsub, no PII on chain:
  https://docs.galxe.com/galxe-id/galxe-passport/introduction
- Human Passport contract reference, showing chain 56 is absent:
  https://docs.passport.human.tech/building-with-passport/contract-reference
- Trusta sybil score API reference, showing the chain enum excludes 56:
  https://trustscan.readme.io/reference/query-sybil
- BNB Attestation Service homepage and explorer: https://bnbattest.io and https://bascan.io
- BAS contracts repo, the mainnet, testnet and opBNB addresses:
  https://github.com/bnb-attestation-service/bas-contract
- BNB Passport SDK, the six KYC provider strings, the reader ABI and the mainnet address:
  https://github.com/bnb-attestation-service/passportSDK
- The org listing that ties BAS, ERC-8004 and 8004scan to one team:
  https://api.github.com/orgs/bnb-attestation-service/repos

Live data:

- 8004scan agents: `https://api.8004scan.io/api/v1/agents?chain_id=56&is_testnet=false&limit=100&offset=N`
- 8004scan feedbacks: `https://api.8004scan.io/api/v1/feedbacks?chain_id=56&is_testnet=false&limit=100&offset=N`
- RPCs used: `https://bsc-rpc.publicnode.com` primary, `https://bsc-dataseed.binance.org` and
  `https://binance.llamarpc.com` as fallbacks, `https://bsc-testnet-rpc.publicnode.com` for chain 97

Raw artifacts saved in `three/research/raw/`:

```
babt-runtime-2026-09-05.hex                          BABT proxy runtime bytecode
babt-impl-sourcify-2026-09-05.json                   full Sourcify record, 260 KB
babt-SBT-2026-09-05.sol                              the verified SBT implementation, 234 lines
babt-ISBT721-2026-09-05.sol                          the verified interface
babt-metadata-token1-2026-09-05.json                 the live metadata body
babt-legacy-apis-spec-2026-09-05.txt                 text extraction of the Binance API spec page
developers.binance.com-legacy-docs-babt-apis-spec-2026-09-05.html   the raw page
babt-galxe-coverage-agent-owners-2026-09-05.json     585 agent owners, BABT and Galxe results
babt-coverage-top-agents-2026-09-05.json             the same for the 300 most reviewed agents
8004scan-agents-bsc-600-owners-2026-09-05.json       the owner sample
8004scan-feedbacks-bsc-3000-slim-2026-09-05.json     3,000 feedbacks, slimmed to the analysed fields
bnb-passportSDK-README-2026-09-05.md                 the six KYC provider strings
bnb-passportSDK-2026-09-05/                          config, networks, func ABI, hooks
bnb-passport-reader-runtime-2026-09-05.hex           the reader proxy
bnb-passport-impl-runtime-2026-09-05.hex             the reader implementation, 13,573 bytes
bnb-passport-reader-sourcify-2026-09-05.json         proxy verification record
bnbattest-home-2026-09-05.html                       BAS homepage
bascan.io--2026-09-05.html                           BAS explorer
bascan-schema-08ff4a23-2026-09-05.html               the candidate schema page
```










