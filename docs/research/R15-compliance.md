# R15 Compliance, policy and risk for an agent marketplace that touches money

Research pass for the BNB Chain "Build the Era / Smart Money Era" hackathon, main track "Build the
official BNB Agent Studio Marketplace". Every on-chain read ran against BSC chain id 56 on 2026-09-05
with cast 1.7.1. Every legal text quoted below was pulled from a primary source I fetched today, saved
into `three/research/raw/` and named in Sources. Where a claim could not be closed out it sits in
"Unverified or open" rather than being rounded up.

This is a build document, not legal advice. It tells you which design choices carry which exposure and
which primary text says so, so the product can be built to the safe side of each line and the choice can
be defended in a live conversation.

## Headline

One sentence in FinCEN's 2019 CVC guidance decides the architecture of this whole product and it is
quotable: **"if a CVC trading platform only provides a forum where buyers and sellers of CVC post their
bids and offers (with or without automatic matching of counterparties), and the parties themselves settle
any matched transactions through an outside venue (either through individual wallets or other wallets not
hosted by the trading platform), the trading platform does not qualify as a money transmitter under FinCEN
regulations."** The same document says the opposite about the alternative: **"CVC payment processors fall
within the definition of a money transmitter and are not eligible for the payment processor exemption
because they do not satisfy all the required conditions for the exemption."** So a marketplace that lists,
ranks, matches and never touches value stays out of the money-transmitter definition. The moment it runs
its own x402 facilitator that collects from the buyer and remits to the seller, it walks in.

Three more findings change what gets built rather than what gets written in a policy page.

The Chainalysis sanctions oracle is live on BSC at `0x40C57923924B5c5c5455c48D93317139ADDaC8fb`, free,
keyless and one `eth_call`. It is also **not a superset of the OFAC list**. I downloaded today's SDN list,
pulled the 91 distinct EVM-format addresses out of it and screened all 91 against the oracle on BSC: it
flags **57**. Of the 91, **42 are active on BSC** right now and **20 of those 42 are not flagged**. A
marketplace that screens only through the oracle misses live SDN addresses on the chain it settles on.

The two BSC stablecoins that support the one-signature x402 flow, FDUSD and USD1, both expose
`freeze(address)`, `unfreeze(address)` and `frozen(address)`. USD1 also exposes
`reallocate(address,address,uint256)`. BSC-USD (`0x55d3...7955`) exposes none of them. That is the GENIUS
Act's "technological capability to comply ... with the terms of any lawful order" showing up as bytecode.
An escrow denominated in FDUSD or USD1 can be frozen under it while a job is mid-flight.

The ERC-8004 Identity Registry is permissionless and its metadata is mutable by the agent owner. A
simulated `register(string)` from an arbitrary address returns id 334944. The registry also exposes
`setAgentURI(uint256,string)` and `setMetadata(uint256,string,bytes)`. So a listing that passed review can
be rewritten after review and nothing can ever be removed from the chain. Takedown is delisting from our
index and only that, which is exactly what the EDPB says to plan for.

## Verified facts

| Claim | Value | How verified |
|---|---|---|
| A forum that never settles is not a money transmitter | FinCEN FIN-2019-G001 §4.6.2: a platform that only hosts bids and offers, with parties settling "through an outside venue", "does not qualify as a money transmitter" | `pdftotext -layout r15-fincen-cvc-2019-G001.pdf`, lines 1153-1163 |
| A CVC payment processor IS a money transmitter | "CVC payment processors fall within the definition of a money transmitter and are not eligible for the payment processor exemption" | same file, lines 1053-1055 |
| Why the payment-processor exemption fails for crypto | condition (b) requires "clearance and settlement systems that admit only BSA-regulated financial institutions"; crypto rails do not | same file, lines 1059-1070 |
| Software supply is exempt, use is not | "An anonymizing software provider is not a money transmitter", but "a person that utilizes the software to anonymize the person's own transactions will be either a user or a money transmitter" | same file, lines 956-968 |
| A DApp performing money transmission pulls in its operators | "when DApps perform money transmission, the definition of money transmitter will apply to the DApp, the owners/operators of the DApp, or both" | same file, lines 871-875 |
| Chainalysis sanctions oracle is live on BSC | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb`, 3557 bytes, `name()` = "Chainalysis sanctions oracle", `owner()` = `0xDF900dC8991474ab9d69F2c3b9C900c055fb36CD` | `cast code`, `cast call ... "name()(string)"`, `"owner()(address)"` on chain 56 |
| Oracle read is free and cheap in a tx path | `isSanctioned(address)` selector `0xdf592f7d`, view; `cast estimate` from an EOA = 24694 gas total, so about 3694 gas over the 21000 base | `cast estimate 0x40C5... "isSanctioned(address)(bool)" 0x098B71... --from 0x...01` |
| Oracle tracks OFAC delistings | Tornado Cash router `0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b` and the 0.1 ETH pool `0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc` both return `false` | two `cast call`s |
| Oracle has zero false positives on a mainstream control set | WBNB, PancakeSwap v2 router, Venus Unitroller, Permit2, USD1, FDUSD, both 8004 registries and a Binance hot wallet all return `false` | nine `cast call`s |
| Today's SDN list carries 494 digital currency address tags across 98 entries | XBT 262, ETH 87, TRX 67, USDT 43, LTC 8, XMR 6, DASH 5, ZEC 3, USDC 2, SOL 2, DOGE 2, BCH 2, XVG 1, ETC 1, BTG 1, BNB 1, one untagged | `grep -o 'Digital Currency Address - [A-Z0-9]*' r15-ofac-SDN-2026-09-05.csv \| sort \| uniq -c` |
| Exactly one SDN address is tagged BNB and it is not EVM-format | `bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23`, a Beacon Chain bech32 address | `grep -o 'Digital Currency Address - BNB [^;,"]*'` |
| The SDN list holds 91 distinct EVM-format addresses | tagged ETH 87, USDT 6, USDC 2, ETC 1 (three addresses carry two or three tags) | `grep -o 'Digital Currency Address - [A-Z]* 0x[0-9a-fA-F]\{40\}'` then dedupe |
| The oracle flags 57 of those 91 on BSC | 34 SDN EVM addresses are not flagged | batched `eth_call` of `isSanctioned` over all 91, saved to `r15-sdn-evm-bsc-screen-2026-09-05.json` |
| 42 of the 91 are live on BSC | 33 with nonce > 0, 30 with a non-zero BNB balance, 5 with code, 45.451 BNB held in total | batched `eth_getTransactionCount`, `eth_getBalance`, `eth_getCode` |
| 20 of the 42 BSC-active SDN addresses are not flagged by the oracle | so the gap is not theoretical on this chain | same JSON, cross-tabulated |
| All 5 "contracts" among them are EIP-7702 delegated EOAs | code is 23 bytes, `0xef0100` plus a delegate; two share delegate `0x1c3630c594effaac3e9aea562ee26a65b171763c` (564 bytes) | `cast code` on each |
| The free Chainalysis screening API is live and key-gated | `GET https://public.chainalysis.com/api/v1/address/{address}` with header `X-API-Key` returns HTTP 401 `{"message":"Invalid API Key"}` on a bogus key | `curl -H "X-API-Key: 0000...0000"` |
| FDUSD and USD1 both expose issuer freeze | `freeze(address)` `0x8d1fdf2f`, `unfreeze(address)` `0x45c8b1a6`, `frozen(address)` `0xd0516650`, plus `paused()` `0x5c975abb` | PUSH4 enumeration of both implementations, then live `cast call "frozen(address)(bool)"` and `"paused()(bool)"` on both proxies |
| USD1 additionally exposes forced transfer | `reallocate(address,address,uint256)` `0x308b8c00`, `drain(address)` `0xece53132`, `recoverERC20(address,address,uint256)` `0x1171bda9` | PUSH4 enumeration of impl `0x694aa534bdef8ed63244eb902e7914e527891f08`, selectors resolved against openchain |
| BSC-USD has no freeze, no blacklist, no pause | 22 selectors total, none of `freeze`, `unfreeze`, `frozen`, `isBlackListed`, `pause`, `paused` | PUSH4 enumeration of `0x55d398326f99059fF775485246999027B3197955` |
| Token owners today | FDUSD `owner()` = `0xfa771871d3d5c85e156D3d379E2FF7699C4d6a66`, USD1 `owner()` = `0xEE9B1A09AEDAceD9dCDA74964EA447feb93861C2`, BSC-USD `owner()` = `0xF68a4b64162906efF0fF6aE34E2bB1Cd42FEf62d`; all three `frozen`/`paused` reads currently false | six `cast call`s |
| The GENIUS Act requires that freeze capability | Public Law 119-27: an issuer "may issue payment stablecoins only if the issuer has the technological capability to comply, and will comply, with the terms of any lawful order"; "lawful order" is one that "requires a person to seize, freeze, burn, or prevent the transfer of payment stablecoins issued by the person" | `pdftotext r15-genius-act-PL119-27.pdf`, lines 757-760 and 144-149 |
| It reaches foreign issuers offered in the US | a foreign issuer's stablecoin "may not be publicly offered, sold, or otherwise made available for trading in the United States by a digital asset service provider unless the foreign payment stablecoin issuer has the technological capability to comply and complies with the terms of any lawful order" | same file, lines 2157-2162 |
| ERC-8004 registration on BSC is permissionless | `register(string)` `0xf2c298be` simulated from `0x1111...1111` returns 334944; `register()` `0x1aa3a008` and `register(string,(string,bytes)[])` `0x8ea42286` also present | `cast call ... --from 0x1111111111111111111111111111111111111111`, PUSH4 enumeration of impl `0x7274e874ca62410a93bd8bf61c69d8045e399c02` (58 selectors) |
| Agent metadata is mutable after listing | `setAgentURI(uint256,string)` `0x0af28bd3`, `setMetadata(uint256,string,bytes)` `0x466648da`, `setAgentWallet(uint256,address,uint256,bytes)` `0x2d1ef5ae`, `isAuthorizedOrOwner(address,uint256)` `0xd95e72be` | same enumeration, selectors resolved against openchain |
| OFAC liability is strict | "OFAC may impose civil penalties for sanctions violations generally based on a strict liability legal standard ... even without having knowledge or reason to know" | `r15-ofac-vc-guidance-2021.pdf` line 172 |
| A compliance programme is an explicit mitigating factor | "OFAC may consider as mitigating factors a virtual currency company's implementation of a risk-based OFAC compliance program and remedial measures" | same file, lines 175-176 |
| OFAC's own reporting clocks | blocked property reports "within 10 business days following the date that property is blocked"; annual reports on holdings as of June 30 due "no later than September 30"; rejected transaction reports "within 10 business days" | same file, lines 190-199 |
| OFAC recordkeeping | "Required records must be maintained for five years after the date of the transaction or, with respect to blocked property, five years after property is unblocked" | same file, lines 225-226 |
| OFAC expects address screening plus re-screening | screen "physical, digital wallet, and IP addresses"; use "fuzzy logic"; do "ongoing sanctions screening and risk-based re-screening ... to account for updated customer information, updates to OFAC sanctions lists" | same file, screening section p.16 |
| MiCA defines advice as personalised | Art 3(1)(24): "'providing advice on crypto-assets' means offering, giving or agreeing to give personalised recommendations to a client, either at the client's request or on the initiative of the crypto-asset service provider providing the advice, in respect of one or more transactions relating to crypto-assets, or the use of crypto-asset services" | `r15-mica-2023-1114-2026-09-05.html`, extracted to text |
| Advice is one of ten regulated crypto-asset services | Art 3(1)(16)(h) "providing advice on crypto-assets"; (i) portfolio management | same file |
| MiCA advice carries suitability, independence and inducement rules | Art 81(1) suitability on "knowledge and experience ... investment objectives, including risk tolerance, and their financial situation including their ability to bear losses"; Art 81(2) disclose whether advice is independent and how broad the analysis is; Art 81(3)(b) an independent adviser shall "not accept and retain fees, commissions or any monetary or non-monetary benefits paid or provided by any third party" | same file, Art 81 |
| MiCA applies now | "This Regulation shall apply from 30 December 2024", Titles III and IV from 30 June 2024 | same file, entry into force article |
| MiFID II draws the same line | Delegated Regulation 2017/565 Art 9: a personal recommendation is one made to a person "in his capacity as an investor or potential investor" and "presented as suitable for that person, or shall be based on a consideration of the circumstances of that person"; recital 14 "Advice about financial instruments addressed to the general public should not be considered as a personal recommendation" | EUR-Lex CELEX:32017R0565 read live |
| The FCA prescribes exact risk-warning words | COBS 4.12A.11R(1)(d): "Don't invest unless you're prepared to lose all the money you invest." and "This is a high-risk investment and you should not expect to be protected if something goes wrong." | `r15-fca-cobs-4-12A-2026-09-05.html` |
| And prescribes where the warning sits | COBS 4.12A.36R: prominent, legible, bordered and on websites or apps "statically fixed and visible at the top of the screen" | same |
| And bans dark patterns around it | COBS 4.12A.38R and 4.12A.42R: no "design feature which has the intent or effect of reducing the visibility or prominence" of the warning | same |
| And bans referral incentives | COBS 4.12A.7R bars any promotion "which offers to a retail client any monetary or non-monetary incentive"; guidance 4.12A.8G names "offering bonuses where the client refers another person" | same |
| And imposes a cooling-off period | COBS 4.12A.18R: "a period of at least 24 hours (the 'cooling off period')" before a direct offer promotion, with the leave and continue options "presented with equal prominence" | same |
| Online marketplaces owe four pre-contract disclosures | Consumer Rights Directive Art 6a: ranking parameters and their relative importance, whether the third party is a trader "on the basis of the declaration of that third party", that consumer rights "do not apply" if it is not a trader and "how the obligations related to the contract are shared" | EUR-Lex CELEX:02011L0083-20220528 read live |
| The withdrawal right can be waived for digital content, on three conditions | Art 16(m): prior express consent to begin performance, acknowledgement of losing the right and trader confirmation under Art 7(2) or 8(7) | same |
| DSA hosting immunity does not cover consumer-protection liability where the platform looks like the seller | Art 6(3): the safe harbour "shall not apply with respect to the liability under consumer protection law of online platforms ... where such an online platform presents the specific item of information or otherwise enables the specific transaction at issue in a way that would lead an average consumer to believe that the information, or the product or service ... is provided either by the online platform itself" | local capture `r13-eu-dsa-2022-2065-2026-09-05.html`, extracted |
| Voluntary moderation does not forfeit immunity | Art 7: providers "shall not be deemed ineligible for the exemptions ... solely because they, in good faith and in a diligent manner, carry out voluntary own-initiative investigations" | same |
| Notice and action has four mandatory intake fields | Art 16(2): substantiated reasons, exact electronic location, name and email of the notifier and a bona fide statement | same |
| A qualifying notice creates actual knowledge | Art 16(3): notices "give rise to actual knowledge or awareness for the purposes of Article 6 ... where they allow a diligent provider ... to identify the illegality ... without a detailed legal examination" | same |
| The notice clock is qualitative, not numeric | Art 16(4) confirm receipt "without undue delay", Art 16(5) notify the decision "without undue delay", Art 16(6) process "in a timely, diligent, non-arbitrary and objective manner" and disclose automated processing | same |
| Statements of reasons cover payment suspension too | Art 17(1)(b) "suspension, termination or other restriction of monetary payments"; (1)(d) account suspension or termination | same |
| Internal complaints stay open six months | Art 20(1): access "for a period of at least six months following the decision", electronically and free of charge, covering removal, service suspension, account suspension and demonetisation | same |
| Business-user complaints are a separate duty | P2B Regulation 2019/1150 Art 11: an internal system "easily accessible and free of charge", plus annual public statistics on "the total number of complaints lodged, the main types of complaints, the average time period needed to process the complaints and aggregated information regarding the outcome"; Art 11(5) exempts small enterprises | local capture `r13-eu-p2b-2019-1150-2026-09-05.html`, extracted |
| Marketplaces must collect seller identity | DSA Art 30(1): name, address, telephone, email, an identification document or eIDAS electronic identification, payment account details, trade register number and a self-certification of legal compliance; Art 30(2) requires best efforts to verify and suspension on failure | same |
| Fake and unverified reviews are per se unfair in the EU | UCPD Annex I point 23b (claiming reviews come from actual purchasers without reasonable and proportionate verification steps) and 23c (submitting or commissioning false reviews or distorting the picture) | EUR-Lex CELEX:02005L0029-20220528 read live |
| Undisclosed paid ranking is per se unfair | UCPD Annex I point 11a: providing search results "without clearly disclosing any paid advertisement", including payment to rank higher | same |
| A wallet address is personal data when linkable | EDPB Guidelines 02/2025 v2.0 para 137: "This identifier qualifies as personal data under Article 4 GDPR when it can be associated with an identified or identifiable natural person"; para 26 adds the "means reasonably likely to be used, for example in case of a data breach" test | `r15-edpb-blockchain-final-v2.pdf`, adopted 07 July 2026 |
| On-chain metadata beyond the address counts too | footnote 12: "transaction identifiers, wallet addresses, event logs, receipts, state transitions and smart contract storage and related traces, may constitute personal data" | same |
| The EDPB tells you to keep personal data off-chain | Recommendation 2 para 109: store "any additional personal data off-chain, beyond the identifiers already present on-chain in transaction metadata" | same |
| And to refuse the design if retention cannot be honoured | Recommendation 11 para 120: "If such solution does not exist, then no personal data should be stored on the chain" | same |
| And to default to no on-chain publication | Recommendation 10 para 118: "By default, personal data should not be made accessible on a public blockchain without the data subject's intervention" | same |
| And that consent is not available for undeletable on-chain data | Recommendation 9 para 116: consent "should not be used for a processing which requires transactions with individuals if the blockchain architecture does not provide a way to delete the personal data" | same |
| And that erasure must be designed in, not bolted on | para 102: the rights to erasure and to object "must be complied with by design"; para 103 concedes actual deletion "might be technically impracticable" on-chain | same |
| US subscriber data has a subpoena tier | 18 USC 2703(c)(2): name, address, session times and durations, length and type of service, subscriber number or identity "including any temporarily assigned network address" and "means and source of payment" | Cornell LII 18 USC 2703 read live |
| Preservation is 90 days plus one renewal | 2703(f): "all necessary steps to preserve records and other evidence in its possession", retained "for a period of 90 days", "extended for an additional 90-day period upon a renewed request" | same |
| DSA orders carry mandatory elements | Art 9(2)(a) legal basis, reasons, issuing authority, exact URL, redress info and territorial scope "limited to what is strictly necessary"; Art 10(2)(b) an information order "only requires the provider to provide information already collected for the purposes of providing the service and which lies within its control" | local DSA capture |
| publicnode is operated by Allnodes and forbids scraping | terms: "operated by Allnodes Inc."; "you will not engage in or use any data mining, robots, scraping, or similar data gathering or extraction methods"; liability shall not "EXCEED THE AMOUNT YOU HAVE PAID"; California courts, one-year limitation | https://www.publicnode.com/terms read live |
| publicnode rejects JSON-RPC batching | a 5-item and a 20-item batch both return HTTP 403; single requests return 200; `https://bsc-dataseed.binance.org` accepts batches | four curl and urllib tests |
| The ERC-8004 spec text and reference code are free to reuse | EIP-8004, EIP-8183 and EIP-3009 each carry "Copyright and related rights waived via CC0"; the ERC-8004 contracts README says "CC0 - Public Domain"; `ChaosChain/trustless-agents-erc-ri` is MIT; `ethereum/ERCs` is CC0-1.0 | local EIP captures, `gh api repos/.../license` |
| Altana's SDK is Apache-2.0 | `@altananetwork/sdk` npm `license` field = `Apache-2.0`, latest 0.9.0; the SDK README says "Apache-2.0" | `curl registry.npmjs.org/@altananetwork%2fsdk`, local README capture |
| Coinbase x402 is Apache-2.0 | `coinbase/x402` SPDX `Apache-2.0` | `gh api repos/coinbase/x402/license` |
| Venus is BSD-3-Clause | `VenusProtocol/venus-protocol` and `VenusProtocol/isolated-pools` both BSD-3-Clause | `gh api` on both |
| Aave v3 is BUSL-1.1 with an anti-migration grant | "Your use of the Licensed Work shall not, directly or indirectly, enable, facilitate, or assist in any way with the migration of users and/or funds from the Aave ecosystem"; Change Date "the earlier of 2027-03-06" or an on-chain record; Change License MIT | `gh api repos/aave-dao/aave-v3-origin/contents/LICENSE` decoded |
| Aave v3 is live on BSC, so that clause is live for us | Pool `0x6807dc923806fE8Fd134338EABCA509979a7e0cB`, `POOL_REVISION()` = 11, 1933 bytes | two `cast` calls |
| PancakeSwap licensing is per-repo and inconsistent | `infinity-core` and `infinity-periphery` GPL-2.0, `pancake-swap-core` and `pancake-swap-periphery` GPL-3.0, `pancake-swap-sdk` MIT, `permit2` MIT, `pancake-farm` WTFPL, `pancake-v3-contracts` has no LICENSE file but per-file `// SPDX-License-Identifier: GPL-2.0-or-later` | `gh api orgs/pancakeswap/repos`, plus the header of `projects/v3-core/contracts/PancakeV3Pool.sol` |
| `pancakeswap-ai` declares MIT but ships no LICENSE file | `package.json` `"license": "MIT"` and README "MIT License — see [LICENSE] for details", yet `gh api repos/pancakeswap/pancakeswap-ai` returns `"license": null` and the root listing has no LICENSE | three `gh api` calls |
| `pancakeswap/erc-8183-example` has no licence at all | no LICENSE file, no licence key in `pyproject.toml`, no licence line in the README | three `gh api` calls |
| 8004scan publishes no API terms and no data licence | its OpenAPI `info` object (v0.4.363) carries no `termsOfService`, no `license` and no `contact`; `https://8004scan.org/terms` 404s and every other legal path 307s to a redirect stub | local `8004scan-openapi-2026-09-05.json`, five curls |
| TermiX publishes no terms and no disclaimer | `/terms`, `/legal/terms`, `/privacy` all 404; the home page and the 1.5.0 skill doc contain no financial-advice disclaimer; footer reads "Copyright 2026 TermiX. All rights reserved." | four curls, grep over the local captures |
| OpenSanctions data is CC BY-NC 4.0 | the licensing page footer states "The data is licensed under the terms of Creative Commons 4.0 Attribution NonCommercial" | https://www.opensanctions.org/licensing/ read live |
| Chainalysis disclaims oracle accuracy | "While we will be taking reasonable measures to keep the sanctions oracle up-to-date", it "cannot guarantee the accuracy, timeliness, suitability, or validity of the data"; and "The smart contract is available for anyone to use and does not require a customer relationship with Chainalysis" | https://go.chainalysis.com/chainalysis-oracle-docs.html read live |
| Common front-end inputs are clean | `OpenZeppelin/openzeppelin-contracts` MIT, `wevm/viem` MIT, `wevm/wagmi` MIT, `vercel/next.js` MIT, `foundry-rs/forge-std` Apache-2.0, `lucide-react` ISC, Inter font OFL-1.1 | `gh api` and npm registry reads |

## Unverified or open

| Claim | What blocked it |
|---|---|
| The hackathon's own IP, licensing and open-source terms | the rules live on DoraHacks, which sits behind AWS WAF (HTTP 405 with a human-verification page on every API path I tried). `bnbchain.org/en/hackathon` renders client-side and yielded 4645 characters of navigation with no terms text. So I cannot say whether the programme claims a licence to submissions, requires a public repo or requires AI disclosure. Treat all four as unknown and do not pre-assign anything |
| Whether "official adoption as the BNB Agent Studio marketplace" comes with a contract, a licence grant or an assignment | nothing published that I could reach. This is the single most important open item for the licensing section below |
| The UK DMCCA 2024 fake-review and drip-pricing provisions | legislation.gov.uk returned HTTP 202 with a zero-byte body on five attempts across three URL forms, including the `/enacted` and `data.xht` variants. The EU equivalents (UCPD Annex I 23b, 23c, 11a) are verified and say substantially the same thing, so the design rule is safe, but the UK section and commencement date are not quoted here |
| The total size of the Chainalysis oracle's list and whether it covers EU and UN designations that OFAC does not | the oracle has no enumerator. `addToSanctionsList(address[])` and `removeFromSanctionsList(address[])` emit events, but a full `eth_getLogs` scan from deployment over about 65M BSC blocks is beyond a public RPC's range caps. Chainalysis's own docs claim "US, EU, or UN" coverage and call the list "explicitly non-exhaustive", which is their claim, not my measurement |
| Whether the 34 SDN addresses the oracle misses are misses or deliberate scoping | I can prove the divergence, not its cause. Two candidate explanations, neither tested: the oracle may exclude addresses whose designation was made under an authority Chainalysis scopes out or it may simply lag. Either way the practical rule is the same |
| Chainalysis screening API rate limits, pricing tier and terms of use | `public.chainalysis.com/docs` 301s to `support.chainalysis.com` and the API root 403s. The endpoint and the `X-API-Key` header name are verified from a live 401. The response shape, the limits and the terms are not |
| Whether 8004scan's free Pro tier for participants carries usage terms | the tier itself (500 rpm, 100k/day) is programme ground truth. The OpenAPI spec publishes no terms and no data licence and the site's legal paths do not resolve. So the grant to republish 8004scan-derived data is unestablished, which is a licensing flag, not a settled permission |
| Who holds the upgrade key on the FDUSD and USD1 proxies and who may call `freeze` and `reallocate` | `owner()` returns an address on each, but I did not resolve the role structure behind `freeze`, `reallocate` or the proxy admin and I did not read the implementations' access modifiers. So "the issuer can freeze" is verified as a capability in the bytecode, not as a mapping to a named legal entity |
| Whether B402 hosts a facilitator we can call and in which token | carried over as open from the payment-rail pass. It matters here because the facilitator's identity decides whether we are the payment intermediary or someone else is |
| Whether the ERC-8004 registry's `register` variants are truly ungated in a state-changing call | the `cast call` simulation from an arbitrary address returned an id rather than reverting, which is strong evidence. A real transaction was not sent, so a gate that only trips on state write is not excluded |
| MiCA Art 81(6) onward and the delegated acts under Art 81(15) | I extracted Art 81(1) to (5) in full and the article continues past my extraction window. The suitability, independence and inducement rules quoted are complete enough for the design rule |
| Whether a BSC-active SDN address has ever dusted a normal user's wallet | this is the classic false-positive generator and I could not measure it without a transaction indexer. I state the mechanism and the mitigation, not a BSC-specific frequency |
| The current status of the US FTC negative-option ("click to cancel") rule | not fetched. Do not rely on it either way in the cancellation section |

## 1. Sanctions and wallet screening

### What a payments-adjacent marketplace is actually expected to do

Start from the money-transmitter question, because it decides everything downstream. If the marketplace
is a money transmitter it is a US money services business, which pulls in registration with FinCEN, a
written AML programme, a compliance officer, customer identification, suspicious activity reporting and
the whole Bank Secrecy Act apparatus. If it is not, the expectation collapses to something a hackathon
team can genuinely build and honestly claim: sanctions screening as an internal control, plus the honesty
not to knowingly facilitate a prohibited transaction.

FinCEN's own text gives the escape and names the trap. The escape, FIN-2019-G001 section 4.6.2:

> if a CVC trading platform only provides a forum where buyers and sellers of CVC post their bids and
> offers (with or without automatic matching of counterparties), and the parties themselves settle any
> matched transactions through an outside venue (either through individual wallets or other wallets not
> hosted by the trading platform), the trading platform does not qualify as a money transmitter under
> FinCEN regulations.

The trap, from the same document:

> CVC payment processors fall within the definition of a money transmitter and are not eligible for the
> payment processor exemption because they do not satisfy all the required conditions for the exemption.

The exemption fails on condition (b), which the guidance sets out as "operate through clearance and
settlement systems that admit only BSA-regulated financial institutions". No crypto rail meets that and
the guidance explains why the condition exists: BSA-regulated institutions at both ends give visibility
into the buyer and the seller, which is the reason the exemption is safe when it applies.

Two adjacent holdings matter for an agent product. On tooling, "An anonymizing software provider is not a
money transmitter", because "suppliers of tools (communications, hardware, or software) that may be
utilized in money transmission ... are engaged in trade and not money transmission". That is the exemption
that covers shipping an agent SDK. On automation, "when DApps perform money transmission, the definition
of money transmitter will apply to the DApp, the owners/operators of the DApp, or both". Deploying a
contract does not put a layer between the operator and the obligation.

So the architectural rule, stated once and applied everywhere: **the marketplace lists, ranks, matches,
escrows through a contract whose keys it does not hold and never at any point accepts value from a buyer
in order to pass it to a seller.** Quote the client with the seller's payee address, let the buyer sign,
let the facilitator or the escrow do the transfer. Take the platform fee as a separate on-chain split
inside the same settlement rather than as a cut of funds that landed in our account first.

On top of that, OFAC's own expectations. The 2021 virtual currency guidance is not law, it is OFAC saying
what it looks for, which is exactly what a judge or a maintainer will read it as. Three things from it
bind the design:

* Liability is strict. "OFAC may impose civil penalties for sanctions violations generally based on a
  strict liability legal standard. This means that, in many cases, a U.S. person may be held civilly
  liable for sanctions violations even without having knowledge or reason to know it was engaging in such
  a violation." There is no good-faith defence to point at.
* A programme is a stated mitigating factor. "OFAC may consider as mitigating factors a virtual currency
  company's implementation of a risk-based OFAC compliance program and remedial measures taken in response
  to an apparent violation." Having the screen, the log and the escalation path is worth something even
  when the screen misses.
* Screening is expected to cover addresses and to be repeated. OFAC asks for screening of "physical,
  digital wallet, and IP addresses", for "fuzzy logic capabilities to account for common name variations
  and misspellings" and for "ongoing sanctions screening and risk-based re-screening (for example,
  related to a historical lookback) to account for updated customer information, updates to OFAC sanctions
  lists, or changes in regulatory requirements". A one-shot check at onboarding is not the posture.

The clocks, if a hit is ever real: blocked property reported to OFAC "within 10 business days following the
date that property is blocked", then annually on holdings as of 30 June, due "no later than September 30".
Rejected transactions reported "within 10 business days of the date the transaction was rejected". Records
kept "five years after the date of the transaction or, with respect to blocked property, five years after
property is unblocked". A hackathon build will not file these, but the product should be able to produce
the record that would let someone file, which is a five-year immutable decision log.

### Concrete data sources, with their licence terms

| Source | What it gives | Access | Licence or terms, as found today |
|---|---|---|---|
| OFAC SDN list, `SDN.CSV` | 19,329 rows, 494 digital-currency-address tags across 98 entries, 91 distinct EVM addresses | `curl https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV`, HTTP 200, 5,672,451 bytes, no key. The legacy `https://www.treasury.gov/ofac/downloads/sdn.csv` returns a byte-identical file | No licence, no terms and no copyright notice found on the download endpoints or the SDN list landing page (which renders client-side and returned an empty body to a plain fetch). US Government works are outside US copyright, so redistribution is conventionally treated as unrestricted, but I could not quote a granting sentence. Treat the absence of terms as absence of restriction here rather than as a grant and cite Treasury as the source |
| Chainalysis sanctions oracle | on-chain `isSanctioned(address)`, no key, no account, 3694 gas over base | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` on BSC and eight other EVM chains, `0x3A91A31cB3dC49b4db9Ce721F50a9D076c8D739B` on Base | "The smart contract is available for anyone to use and does not require a customer relationship with Chainalysis." Disclaimed: it "cannot guarantee the accuracy, timeliness, suitability, or validity of the data." No licence text, only a copyright footer. Reading a public contract needs no grant, so this is the cleanest source in the table |
| Chainalysis free screening API | HTTP screening of an address | `GET https://public.chainalysis.com/api/v1/address/{address}`, header `X-API-Key`. Verified live: bogus key returns HTTP 401 `{"message":"Invalid API Key"}` | Free per the oracle docs ("free of charge"), but the docs path 301s away and the terms page was not reachable. Registration path unverified. Do not describe this as licensed until the terms are read |
| OpenSanctions | consolidated sanctions plus PEP data, includes crypto wallet identifiers, wider than OFAC alone | bulk download, open | "The data is licensed under the terms of Creative Commons 4.0 Attribution NonCommercial." NonCommercial is the whole story for us: a marketplace that charges a platform fee is commercial use, so this needs their paid licence. Usable for a hackathon demo with attribution, not usable in the shipped fee-taking product without a commercial licence |
| Token-level issuer state | whether the settlement token itself has frozen a party | `frozen(address)` and `paused()` on FDUSD and USD1, verified live | Reading a public contract. No grant needed |
| EU consolidated list, UK OFSI list | non-US designations | published, not fetched in this pass | Not verified here. Named so the gap is visible, not claimed as integrated |

### What a wallet-level check can and cannot establish

It can establish exactly one thing: whether the 20-byte string in front of you is on a list you hold or
is flagged by an oracle you called. That is a string comparison. It is cheap, deterministic and worth
doing on every counterparty on every quote.

It cannot establish who controls the address. It cannot establish whether the funds arriving from it are
the sender's. It cannot establish that a clean address is controlled by a clean person, because generating
a fresh address costs nothing and there is no link between an address and an identity unless one was
deliberately created. It cannot establish anything about a smart contract's callers: three of the
BSC-active SDN addresses I screened are EIP-7702 delegated EOAs, two of them delegating to the same
account abstraction implementation, so the same designated party can transact through a code path that
looks like a contract interaction rather than a transfer from a listed EOA.

And it cannot establish list completeness, which is the finding that matters most. Measured today:

* Today's SDN list holds 91 distinct EVM-format addresses. The oracle flags 57 of them on BSC.
* 42 of the 91 are live on BSC: 33 with a non-zero nonce, 30 holding BNB, 5 carrying code, 45.451 BNB
  held between them.
* 20 of those 42 BSC-active SDN addresses are not flagged by the oracle.
* Exactly one SDN entry carries a `BNB` tag and it is a Beacon Chain bech32 address
  (`bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23`) that no EVM screen will ever match.

Read those together. Screening only via the oracle misses 20 live SDN addresses on the chain we settle on.
Screening only on the `BNB`-tagged subset of the SDN list matches one address that is not even EVM. The
correct approach on BSC is to ignore the chain tag entirely, take every 0x-format address in the list
regardless of whether OFAC tagged it ETH, USDT, USDC or ETC and screen against the union of that set and
the oracle. That is a nine-line ingest and it closes a gap that a single-source screen leaves wide open.

### The false-positive problem

A wallet screen produces two kinds of wrong answer and they are not symmetric.

False negatives are the common case and the design already assumes them. A designated party opens a new
address or routes through an intermediary and every list in the world returns clean. Nothing fixes this
at the address layer.

False positives are rarer but far more damaging, because the response is to freeze someone's money or
close their account and the person on the receiving end did nothing. Four generators, in rough order of
how often they bite:

1. **Inbound taint.** Anyone can send tokens to any address. A designated party sending 1 wei to a
   thousand random addresses makes a thousand wallets that "have received funds from a sanctioned address".
   If the rule is "flag any address with a sanctioned counterparty in its history" then the attacker
   chooses who gets flagged. This is why the screen must be on the **direct counterparty of the payment we
   are quoting**, never on transaction-graph proximity, unless a human reviews before any action.
2. **Shared and deposit addresses.** An exchange deposit address, a router, a pool, a paymaster or a
   bundler is used by many parties. Flagging the address flags everyone behind it. The five SDN "contracts"
   on BSC illustrate the inverse: an address can be a shared execution surface rather than a person.
3. **Delisting lag.** OFAC removed the Tornado Cash addresses in 2025. I verified the oracle now returns
   `false` for both the router and the 0.1 ETH pool, so it does track removals, but a locally cached copy
   of an older list would still be blocking a delisted address today. Any local list must be re-fetched
   and the fetch date must be stored beside the verdict.
4. **Name and format collisions.** Not an issue for 20-byte hex, which is why address screening is the
   sound part. It is an issue the moment a name field enters the pipeline and it is why OFAC asks for
   fuzzy logic on names. The right answer for us is not to have name fields at all.

The buildable answer is asymmetric handling. A positive on the direct counterparty is a hard block, logged,
with a plain reason shown. Anything softer than that (graph proximity, an issuer freeze on an unrelated
address, a partial match) is a flag for review and never an automatic action. That distinction is also what
DSA Article 17 forces you to be able to explain, since a restriction of monetary payments needs a statement
of reasons.

### The freeze layer sitting under our escrow

This is the finding a build would otherwise discover in production. The GENIUS Act, Public Law 119-27,
says a permitted payment stablecoin issuer "may issue payment stablecoins only if the issuer has the
technological capability to comply, and will comply, with the terms of any lawful order" and defines a
lawful order as one that "requires a person to seize, freeze, burn, or prevent the transfer of payment
stablecoins issued by the person". It reaches foreign issuers too: a foreign issuer's coin "may not be
publicly offered, sold, or otherwise made available for trading in the United States by a digital asset
service provider unless the foreign payment stablecoin issuer has the technological capability to comply".

That capability is in the bytecode of the two tokens that make the one-signature payment flow work:

| Token | `freeze(address)` | `unfreeze(address)` | `frozen(address)` | `paused()` | forced transfer |
|---|---|---|---|---|---|
| FDUSD `0xc5f0...6409` | yes `0x8d1fdf2f` | yes `0x45c8b1a6` | yes `0xd0516650` | yes `0x5c975abb` | none found |
| USD1 `0x8d0D...8B0d` | yes | yes | yes | yes | `reallocate(address,address,uint256)` `0x308b8c00`, `drain(address)` `0xece53132` |
| BSC-USD `0x55d3...7955` | no | no | no | no | none |

Three consequences for the design. An escrow denominated in FDUSD or USD1 can have either counterparty
frozen mid-job, so the escrow must have a path that resolves a job whose payer or payee cannot move funds. It must not be a path that silently reverts
forever. USD1's `reallocate` means the escrow's own balance
can be moved by the issuer, so the product must not tell a user their escrowed funds are beyond anyone's
reach. And `frozen(payer)`, `frozen(payee)` and `paused()` are three free `eth_call`s that turn a
mid-flight failure into a pre-quote refusal, which is strictly better product behaviour and costs nothing.

BSC-USD has none of these levers, which is a genuine trade-off rather than a win: it cannot be frozen at
the token layer and it also cannot do one-signature settlement and its freeze risk sits with the peg
operator off-chain where no `eth_call` can see it.

### The screening design, concretely

Four checks, all keyless, all on the quote path, total cost four `eth_call`s and one in-memory set lookup:

1. `isSanctioned(counterparty)` on `0x40C57923924B5c5c5455c48D93317139ADDaC8fb`.
2. Membership of the counterparty in the locally ingested SDN EVM set (91 addresses today, chain tag
   ignored), with the list's fetch timestamp recorded.
3. `frozen(payer)` and `frozen(payee)` on the settlement token, where the token exposes it.
4. `paused()` on the settlement token.

Run them on the buyer address, the seller agent's payee address and the agent's registered wallet, because
an ERC-8004 agent's payee can be set independently via `setAgentWallet`. Re-run at settlement as well as
at quote, since the interval between them is when a designation or a freeze lands. Cache the SDN set for no
more than 24 hours and refuse to serve on a stale cache rather than serving silently on old data.

## 2. Prohibited use

This is the actual list, written for a marketplace where the listed sellers are autonomous agents that
move money on BSC. Each row says what it covers and why it is on the list, because a prohibited-use policy
whose entries have no stated reason gets ignored by the people writing agent cards and cannot be defended
when a delisting is challenged. The reason column is the enforcement rationale, not a legal opinion.

### A. Regulatory perimeter

| Category | Covers | Why it is here |
|---|---|---|
| Custody of buyer funds or keys | an agent that asks a buyer to send funds to an address the agent controls or to hand over a private key, seed phrase or an unbounded token approval | Custody is a regulated crypto-asset service in its own right (MiCA Art 3(1)(16)(a): "providing custody and administration of crypto-assets on behalf of clients"). It is also the single mechanic behind almost every drainer. Nothing on the marketplace needs it: escrow plus a signed authorisation covers every legitimate flow |
| Personalised investment advice | an agent output that recommends a specific position sized to the individual user or presented as suitable for them | MiCA Art 3(1)(24) defines advice as "personalised recommendations to a client" and Art 3(1)(16)(h) makes it a licensable service. Section 3 below sets out exactly where the line is and how an agent stays on the safe side |
| Discretionary portfolio management | an agent given a standing mandate to trade a user's holdings at its own discretion | MiCA Art 3(1)(16)(i) and Art 3(1)(25): "managing portfolios in accordance with mandates given by clients on a discretionary client-by-client basis". This is the category a "rebalancing agent" falls into if it is built carelessly. It stays legitimate only while every action is bounded by a user-set allowlist, spend cap and expiry that the user can revoke |
| Order execution, exchange or transfer as a service | an agent that takes a user's funds in and sends different assets or a different address out | MiCA Art 3(1)(16)(c) to (g) and (j). It is also the exact fact pattern that turns the operator into a money transmitter under FIN-2019-G001 if the marketplace sits in the flow |
| Unlicensed lending, deposit-taking or yield promises | an agent that pools user funds or promises a rate it is not contractually able to pay | Deposit-taking and credit are separately licensed nearly everywhere and a pooled-funds yield product is the classic enforcement target. A yield agent that only reads and reports rates, then hands the user a transaction to sign, is not this |
| Fiat on-ramp or off-ramp | an agent that exchanges crypto for national currency | MiCA Art 3(1)(16)(c) "exchange of crypto-assets for funds". It also brings money-transmission and payments licensing in nearly every jurisdiction |

### B. Financial-crime and integrity

| Category | Covers | Why it is here |
|---|---|---|
| Sanctions evasion | serving a screened counterparty, structuring to defeat a screen or offering address-rotation to defeat one | OFAC liability is strict: "a U.S. person may be held civilly liable for sanctions violations even without having knowledge or reason to know". An agent whose declared purpose is to defeat a screen is a knowing facilitation, which is the aggravated case |
| Laundering and origin obfuscation | mixing, chain-hopping, layering or an agent whose selling point is that the source of funds becomes untraceable | FIN-2019-G001 is explicit that "An anonymizing services provider is a money transmitter" and that "The added feature of concealing the source of the transaction does not change that person's status". Listing such an agent puts the marketplace next to a service that is a money transmitter by design |
| Market manipulation | wash trading, spoofing, layering, coordinated pump activity, volume or TVL inflation or an agent that offers to produce any of those | Manipulation is prohibited under MiCA Title VI and under market-abuse rules generally. It also directly corrupts the data the marketplace ranks on, so it is self-harm as well as illegal |
| Extraction against our own users | sandwiching, back-running or otherwise trading against the transactions the marketplace's own agents generate | This is the failure mode a marketplace uniquely enables, because the marketplace knows the intent before the chain does. A listing whose economics depend on it destroys the reason a buyer would use the venue |
| Reputation manipulation | self-dealing jobs to build a track record, sybil feedback, paid or incentivised reviews presented as organic or an agent that sells any of those | UCPD Annex I point 23c makes "Submitting or commissioning another legal or natural person to submit false consumer reviews or endorsements" unfair in all circumstances. Point 23b bites the marketplace itself if it claims reviews come from real users without verification. The ERC-8004 Reputation Registry is permissionless, so this is a live risk and not a hypothetical |
| Rug-pull and exploit tooling | honeypot contracts, hidden mint or blacklist functions, approval-harvesting front ends, obfuscated bytecode sold as a service | Straightforward fraud facilitation. Also the highest-severity thing a "trading agent" category attracts |
| Unauthorised access | exploiting a contract or an account the user does not control, credential stuffing, extracting another agent's keys or session material | Computer-misuse offences everywhere and the thing that ends the venue's reputation in one incident |
| Tax and reporting evasion | an agent marketed as a way to avoid a reporting obligation | Facilitation exposure and trivially separable from legitimate tax-reporting tools, which are welcome |

### C. Agent-specific, because this is an agent marketplace

| Category | Covers | Why it is here |
|---|---|---|
| Exceeding the granted authority | an agent that calls outside its allowlist, spends past its cap, transacts after expiry or tries to have a session widened without the user seeing it | The whole safety model of a delegated agent is the bounded session. An agent that treats the bound as an obstacle has no place in the venue. This is also precisely what the Altana track gate asks a product to demonstrate |
| Adversarial payloads aimed at other agents | prompt injection embedded in a deliverable, a job brief or an agent card, tool-poisoning and instructions designed to make another agent exceed its mandate | Agent-to-agent hiring means one agent's output is another agent's input. Untrusted content that carries instructions is the native attack of this architecture and there is no user in the loop to catch it |
| Impersonation | claiming to be a protocol, a brand, a team or a person; a handle or agent card designed to be mistaken for an official one | Trademark and passing-off exposure for us, direct financial loss for the user. A permissionless registry with mutable metadata makes squatting cheap, so the policy has to be explicit |
| Silent capability change | rewriting an agent's card, endpoint, payee wallet or pricing after it was listed, so the listing no longer describes what runs | `setAgentURI`, `setMetadata` and `setAgentWallet` are all callable by the owner at any time. Without this rule, review means nothing. The mitigation is technical as well as policy: pin the hash of the reviewed metadata and re-review on drift |
| Undisclosed subcontracting to a screened party | passing a job through to an agent or address we have blocked | Otherwise the block is one hop away from meaningless, given ERC-8183 hiring composes |
| Unbounded or hidden pricing | a quote that does not state the total the user pays or that can rise after acceptance | UCPD Annex I point 11a covers undisclosed paid ranking and the pre-contract information duty in Consumer Rights Directive Art 6a covers what the buyer must be told before being bound. A quote is the pre-contract information in this product |

### D. Content and general illegality floor

| Category | Covers | Why it is here |
|---|---|---|
| Illegal content and illegal goods | anything the DSA would call illegal content, plus weapons, controlled substances, stolen data and child sexual abuse material | This is the floor under every hosting service. DSA Art 16(2)(c) even carves out the notifier's contact details for CSAM notices, which tells you the intake path has to exist before it is needed |
| Personal data harvesting and surveillance | doxxing, scraping personal data, deanonymising wallet holders or an agent that sells any of that | Section 5 covers our own data posture. A listed agent that harvests personal data makes us a participant in it and an agent whose product is deanonymisation is a GDPR incident generator |
| Third-party terms breach as a service | an agent whose function is to scrape or automate against a service that forbids it | Concrete example from this build: the Allnodes terms behind `bsc-rpc.publicnode.com` say "you will not engage in or use any data mining, robots, scraping, or similar data gathering or extraction methods". An agent selling bulk extraction over that endpoint breaches terms we also rely on |
| Deceptive automation disclosure | an agent that presents itself as a human or hides that its output was machine-generated where that matters | Straight deception and in a venue whose whole premise is that agents are agents, it is also a category error |

Two enforcement notes that belong with the list rather than in the policy prose. First, every category above
is enforceable only against our own index, never against the chain: the ERC-8004 registries are
append-only, so "removed" always means "delisted here". Say that in the policy rather than implying a
takedown reaches the registry. Second, each row needs a mapped consequence before go-live, because DSA
Art 17 requires a statement of reasons for a restriction and you cannot write one against a category that
has no defined outcome. The four outcomes worth having are: no action with a note, ranking suppression,
delisting with a reason shown and a payment block. Nothing else.

## 3. Financial advice

Four of the mandated categories are rebalancing, grid trading, yield and health factor. Every one of them
is an agent telling a user something about their money. So this section is not decoration, it is the part
that decides what the agents are allowed to output.

### The line, from the primary texts

Two regulators draw the same line in almost the same words and the line is **personalisation**, not
subject matter.

MiCA, Regulation (EU) 2023/1114 Art 3(1)(24):

> 'providing advice on crypto-assets' means offering, giving or agreeing to give personalised
> recommendations to a client, either at the client's request or on the initiative of the crypto-asset
> service provider providing the advice, in respect of one or more transactions relating to crypto-assets,
> or the use of crypto-asset services

Note the tail. Advice under MiCA covers recommendations about "the use of crypto-asset services", not just
about assets. A marketplace that tells a specific user which agent to hire, sized to that user's position,
is inside the definition on its face. Art 3(1)(16)(h) makes providing advice one of the ten crypto-asset
services and a person providing any of them on a professional basis is a crypto-asset service provider
needing authorisation. MiCA has applied since 30 December 2024, with Titles III and IV from 30 June 2024.

MiFID II's delegated regulation reaches the same place for financial instruments. Commission Delegated
Regulation (EU) 2017/565 Art 9 makes a recommendation personal when it is made to someone "in his capacity
as an investor or potential investor" and is either "presented as suitable for that person" or "based on a
consideration of the circumstances of that person". Recital 14 gives the safe side plainly: "Advice about
financial instruments addressed to the general public should not be considered as a personal
recommendation." It also gives the trap: a recommendation "issued, even exclusively, through distribution
channels, such as internet, could qualify as a personal recommendation", with email to a named individual
as the example. The medium does not save you. The addressing does.

So the operative test for every agent output in this product is a two-part one. Is it addressed to a
specific person as an investor and is it presented as suitable for them or built on their circumstances?
Both true means advice. Either false means it is not.

### What an agent must not say

* Not "you should move your USDT into the 8.2% pool." That is a recommendation addressed to a person.
* Not "based on your portfolio, rebalance to 60/40." Sizing to the user's holdings is exactly
  "consideration of the circumstances of that person".
* Not "this is suitable for your risk profile", ever. That single word is the MiFID II trigger and the MiCA
  Art 81(1) suitability obligation in one.
* Not "safe", "guaranteed", "capital protected", "risk-free", "stable returns" applied to any DeFi
  position. Nothing here is any of those.
* Not a forward-looking APY presented without the fact that it floats. A pool's current rate is a
  measurement. Next month's rate is a guess.
* Not a health-factor number without the liquidation consequence stated next to it. A number that means
  "you are 4% from liquidation" and does not say so is worse than no number.
* Not "our top-ranked agent" where the ranking is influenced by anything the seller paid. UCPD Annex I
  point 11a makes undisclosed paid ranking unfair in all circumstances.

### What an agent may say and how

The whole product can be built inside four output shapes, none of which is a personal recommendation:

1. **Measurement.** "Pool X currently reports a 30-day realised APY of 8.2%, measured at block N. Source:
   the pool's own contract." A fact about the world, with a timestamp and a source.
2. **Comparison on stated criteria.** "Ranked by realised 30-day APY. Here are the criteria and their
   weights." Generic, addressed to everyone who loads the page and it discharges the Art 6a ranking duty
   in the same breath.
3. **Parameterised simulation the user drives.** "You entered 10,000 USDT and a 20% band. At those inputs
   this strategy would have executed 14 rebalances and paid 0.31% in fees over the period." The user chose
   the inputs. The agent computed a consequence. It did not choose for them.
4. **Mechanical execution of a user-set rule.** "You set the band at 20%. The band was crossed. Here is
   the transaction that restores it. Sign or cancel." The judgement was the user's, taken before the
   trigger and the agent's role is arithmetic and timing.

Shape 4 is the one that makes rebalancing, grid trading and health-factor agents work without becoming
either advice or discretionary management. The user sets the rule, the rule is visible, the agent applies
it, the user can revoke. Keep the mandate bounded (allowlist, spend cap, expiry) and the position is
defensible: there is no discretion, so there is no discretionary management and there is no personalised
recommendation because the agent never chose the target.

Two mandatory presentation rules alongside those shapes. Always show the downside in the same view as the
upside, at the same visual weight: for a yield figure, the impermanent loss or the liquidation distance;
for a grid, the drawdown in a trending market; for a health factor, the price move that liquidates. And
always show the inputs and the block the numbers came from, because a number without provenance is the
thing "Data Quality" on the rubric is asking about.

### The inducement problem, which is ours specifically

MiCA Art 81(3)(b) says a provider that tells a client its advice is independent shall "not accept and
retain fees, commissions or any monetary or non-monetary benefits paid or provided by any third party or a
person acting on behalf of a third party in relation to the provision of the service to clients". Art 81(2)
requires disclosing, before advising, whether advice is independent and whether the analysis is "broad or
... more restricted".

A marketplace takes a fee from the sell side. That is a third-party benefit in relation to the service
provided to the buyer. So the safe posture is not to claim independence at all. Say what is true instead:
the venue takes a stated fee, the fee does not change the ranking, the ranking criteria are published and
none of this is advice. Claiming independence while taking a listing fee is the one combination that turns
a disclosure problem into a misrepresentation.

### How real products handle it and what to copy

The regulated end prescribes the words. The FCA's cryptoasset financial promotion rules put an exact
sentence pair in the Handbook at COBS 4.12A.11R(1)(d):

> Don't invest unless you're prepared to lose all the money you invest.

> This is a high-risk investment and you should not expect to be protected if something goes wrong.

That wording is worth copying even outside the UK, because it is the only risk warning in this space that a
regulator has actually drafted and tested. The surrounding rules are worth copying too, because they are
about placement rather than jurisdiction. COBS 4.12A.36R requires the warning to be "prominent, taking into
account the content, size and orientation of the financial promotion as a whole", legible, bordered and on
websites or apps "statically fixed and visible at the top of the screen". COBS 4.12A.38R and 4.12A.42R ban
any "design feature which has the intent or effect of reducing the visibility or prominence" of it, with
small fonts, faded text, low contrast and burial at the foot of the page named in the guidance as examples.
A footer disclaimer nobody scrolls to is the exact pattern those rules exist to stop.

Two more FCA rules are worth knowing even though they attach to promotions of investments rather than to a
marketplace listing, because they describe conduct a judge would recognise as careful. COBS 4.12A.7R bars a
promotion that "offers to a retail client any monetary or non-monetary incentive", with guidance 4.12A.8G
naming "offering bonuses where the client refers another person". So no referral bonus on agent hires.
COBS 4.12A.18R requires "a period of at least 24 hours (the 'cooling off period')" before a direct offer
promotion reaches a first-time client, with the leave and continue options "presented with equal prominence".
The transferable idea is not a 24-hour delay on hiring an agent. It is that the first time a user grants an
agent authority over their funds, the flow should present continuing and stopping with equal weight instead
of a bright primary button and a grey link.

The unregulated end is worth naming for what it does not do. TermiX, which is a sponsor track on this very
programme and runs an agent-hiring marketplace with on-chain escrow, publishes no terms of service at all:
`/terms`, `/legal/terms` and `/privacy` all return 404 and neither the home page nor the 1.5.0 skill
documentation contains a financial-advice disclaimer or a risk warning. That is the baseline. Clearing it is
cheap and it is a visible differentiator on a rubric that scores marketplace quality.

### Disclaimer posture for the product

A disclaimer does not change what a thing is. If an agent gives a personalised recommendation, saying "not
financial advice" underneath it does not make it generic and the FCA's own anti-obfuscation rules show a
regulator's view of disclaimers designed to be missed. So the disclaimer is the last layer, not the
strategy. The strategy is the four output shapes above.

With that said, here is the posture worth shipping, in four parts:

1. **One product-level risk banner**, using the FCA wording, statically fixed at the top of any view that
   shows a rate, a return, a projection or a health factor. Not a footer. Not a modal that dismisses
   forever.
2. **One line inside every agent output**, generated with the output rather than wrapped around it: what
   this is (a measurement, a comparison, a simulation of your inputs), what it is not (a recommendation),
   the block or timestamp it was computed at and the source.
3. **One authority screen before any first grant**, stating in plain words what the agent will be able to
   call, up to what amount, until when and where to revoke it. This is also the Altana track gate, so it
   earns points twice.
4. **No independence claim anywhere**, plus a published fee and a published ranking methodology.

Draft banner text, which is the FCA wording plus one product-specific sentence and nothing else:

> Don't invest unless you're prepared to lose all the money you invest. This is a high-risk investment and
> you should not expect to be protected if something goes wrong. Agents listed here are built by third
> parties, their outputs are measurements and simulations rather than recommendations. No one here is
> advising you.

## 4. Consumer expectations for a two-sided marketplace

The framing that matters: we are a **broker, not the seller**. The buyer contracts with the agent operator,
we introduce them, hold nothing and warrant nothing about the work. That framing carries specific duties and
it is only available if the product actually behaves that way. This section is jurisdiction-aware, not
jurisdiction-specific and it is not legal advice. It uses EU and UK text because those are the regimes
that have written down what a marketplace owes and because the design that satisfies them satisfies most
others by construction.

### Pre-contract information

The Consumer Rights Directive Art 6a, inserted by the Omnibus Directive, is the closest thing to a
specification for a marketplace listing page. It applies "Before a consumer is bound by a distance contract,
or any corresponding offer, on an online marketplace" and asks for four things, "in a clear and
comprehensible manner":

| Art 6a item | The exact duty | Where it goes in this product |
|---|---|---|
| (a) ranking | "the main parameters determining ranking" of offers, plus "the relative importance of those parameters as opposed to other parameters", in "a specific section of the online interface that is directly and easily accessible" from the results page | A "How ranking works" page linked from every result list, naming each signal and its weight. On this build the signals are ERC-8004 feedback, settled job count, freshness and category depth, so name those and say whether payment influences any of them. It does not and saying so is the point |
| (b) trader status | "whether the third party offering the goods, services or digital content is a trader or not", determined "on the basis of the declaration of that third party" | A declared status field on the agent card, collected at listing time, shown on the card. The directive puts the determination on the third party's declaration, so collect the declaration and show it rather than guessing |
| (c) consequence of non-trader status | where the third party is not a trader, "that the consumer rights stemming from Union consumer protection law do not apply to the contract" | One line on the card of any non-trader agent. Most solo agent operators will be non-traders, so this line will be common and it has to be visible before the hire, not in a policy page |
| (d) division of obligations | where relevant, "how the obligations related to the contract are shared" between the third party and the marketplace | A short "who is responsible for what" block: the operator delivers and answers for the work, we run identity, escrow, complaints and delisting. Say the escrow releases against a hash, not against our judgement of quality |

Two more disclosures belong in the same place even though they come from elsewhere. The total price the
buyer pays including our fee, stated before acceptance, because a quote is the pre-contract information in
this product. And, per UCPD Annex I point 11a, a clear disclosure of any paid placement, since providing
search results "without clearly disclosing any paid advertisement" is unfair in all circumstances.

### Cancellation

The default consumer position in the EU is a 14-day withdrawal right on distance contracts. Two exemptions
in Art 16 matter here and both are conditional rather than automatic.

Art 16(a) removes the right for "service contracts after the service has been fully performed", but where
the consumer pays, only if performance began with "the consumer's prior express consent and acknowledgement
that he will lose his right of withdrawal" once fully performed.

Art 16(m) removes it for digital content not on a tangible medium if performance has begun, on three
cumulative conditions: "the consumer has provided prior express consent to begin the performance during the
right of withdrawal period", "the consumer has provided acknowledgement that he thereby loses his right of
withdrawal" and "the trader has provided confirmation in accordance with Article 7(2) or Article 8(7)".

So the buildable pattern for an agent hire is a single acceptance step that captures consent and
acknowledgement together, then a durable confirmation. Concretely:

* At acceptance, two separate ticks, not one: begin now and I understand I lose the 14-day withdrawal
  right once it begins. Recorded with a timestamp and the exact wording shown.
* A confirmation delivered on a durable medium after acceptance, which for this product is the settled job
  record plus an exportable receipt.
* Anything the user does not consent to starting immediately keeps the 14-day right, so offer a scheduled
  start as the alternative rather than forcing consent.
* Where the job has not started, cancellation must be free and one click. Where it has, the escrow's
  challenge window is the mechanism, so name the window length on the card before the hire.

Two honesty notes. This exemption analysis assumes the buyer is a consumer and the seller a trader. In
agent-to-agent hiring neither is a consumer and consumer law does not apply at all, which is a reason to
capture the declared status at listing (Art 6a(b)) rather than assume. And a refund promise the escrow
cannot execute is worse than no promise: if the escrow releases against a deliverable hash then say the
remedy is the challenge and do not imply a discretionary refund the contract cannot pay.

### Complaint handling

Two separate duties, two separate systems and the second is the one teams forget.

Buyer side, DSA Art 20. An internal complaint-handling system, "electronically and free of charge", open
"for a period of at least six months following the decision", covering decisions to remove or restrict
visibility, to suspend or terminate service, to suspend or terminate an account and to "suspend, terminate
or otherwise restrict the ability to monetise". It must be "easy to access, user-friendly", handled "in a
timely, non-discriminatory, diligent and non-arbitrary manner" and a complaint with sufficient grounds
means the decision is reversed "without undue delay". Complainants must be told the reasoned outcome and
about out-of-court dispute settlement.

Seller side, P2B Regulation 2019/1150 Art 11. An internal system for business users, "easily accessible and
free of charge", covering alleged non-compliance with the Regulation, technological issues and "measures
taken by, or behaviour of, that provider". Complaints must be considered, processed "swiftly and
effectively" and the outcome communicated "in an individualised manner and drafted in plain and
intelligible language". Art 11(4) then requires public statistics, verified at least annually: "the total
number of complaints lodged, the main types of complaints, the average time period needed to process the
complaints and aggregated information regarding the outcome of the complaints". Art 12 requires naming two
or more mediators in the terms. Art 11(5) exempts small enterprises, which a hackathon entrant is, so this
is aspiration rather than obligation, but the public statistics page is cheap and it is the single most
credible marketplace-quality artefact on the list.

The buildable version of both is one intake form, one state machine and one public counter. States:
received, under review, upheld, rejected, reversed. Every transition timestamped and exportable. The public
page renders the Art 11(4) four numbers straight off that store.

### Marketplace liability where the operator is a broker

The DSA gives hosting providers a conditional immunity in Art 6(1): not liable for stored information
provided the provider "does not have actual knowledge of illegal activity or illegal content" and, on
obtaining knowledge, "acts expeditiously to remove or to disable access". Art 7 confirms that voluntary
moderation does not forfeit it: providers are not ineligible "solely because they, in good faith and in a
diligent manner, carry out voluntary own-initiative investigations". Art 8 confirms no general monitoring
obligation is imposed.

The carve-out is the part that decides how the product presents itself. Art 6(3):

> Paragraph 1 shall not apply with respect to the liability under consumer protection law of online
> platforms that allow consumers to conclude distance contracts with traders, where such an online platform
> presents the specific item of information or otherwise enables the specific transaction at issue in a way
> that would lead an average consumer to believe that the information, or the product or service that is the
> object of the transaction, is provided either by the online platform itself or by a recipient of the
> service who is acting under its authority or control.

Read that as a design constraint, because that is what it is. If the marketplace brands the agents as its
own, hides who the operator is, curates so heavily that the venue looks like the vendor or answers for the
work itself, it loses the consumer-protection immunity and becomes the seller. The practical rules that
follow:

* Name the operator on every listing and in the receipt. Never present an agent as "our" agent.
* Keep "official BNB Agent Studio marketplace" as a description of the venue, never of the agents in it.
  This is a real tension for this build, because official adoption is the prize and official framing plus
  first-party presentation is exactly the Art 6(3) fact pattern.
* Publish the ranking methodology, which is also Art 6a(a). A published objective methodology is easier to
  characterise as a neutral index than a hand-curated shortlist.
* Do not warrant outcomes. Warranting quality is behaving as the seller.
* Keep the Art 16 notice path live, since the immunity in Art 6(1)(b) is conditional on acting
  expeditiously once notified and a qualifying notice creates that knowledge by operation of Art 16(3).

There is also a positive duty that comes with being a marketplace rather than a plain host. DSA Art 30
requires a platform that allows consumers to conclude distance contracts with traders to obtain, before the
trader can offer anything: name, address, telephone and email; a copy of an identification document or
eIDAS electronic identification; payment account details; the trade register and registration number where
one exists; and "a self-certification by the trader committing to only offer products or services that
comply with the applicable rules of Union law". Art 30(2) requires best efforts to check that information
against "any freely accessible official online database" or supporting documents and suspension where a
trader fails to provide or correct it.

Full Art 30 collection is out of scope for a hackathon build and pretending otherwise would be dishonest.
What is in scope and what should be built and said plainly: the schema exists, the self-certification is
collected at listing, a verified contact and payee address are held and the fields that would carry
identity documents are defined but empty because the venue is not yet operating commercially. That is a
credible answer. Claiming trader verification that did not happen is not.

### Reviews and ranking honesty

The marketplace surfaces ERC-8004 feedback, which is permissionless and cheap to forge. Two Annex I points
of the UCPD are unfair in all circumstances, with no balancing test:

* Point 23b: "Stating that reviews of a product are submitted by consumers who have actually used or
  purchased the product" without taking reasonable and proportionate steps to check that they did.
* Point 23c: "Submitting or commissioning another legal or natural person to submit false consumer reviews
  or endorsements" and giving a distorted picture of reviews or endorsements.

So the marketplace must not say "reviews from real buyers" unless it verifies and the cheapest honest
verification on this chain is structural rather than social: only count feedback that is bound to a settled
on-chain job with a distinct payer, show the count of settled jobs beside the score and label unbound
feedback as unverified rather than hiding or averaging it in. Publish the rule. That is both the point 23b
answer and a Data Quality answer on the rubric.

### Jurisdiction awareness, honestly stated

The programme is open globally, so the product will be reachable from everywhere. The duties above are EU
and UK. The US analogue is FTC Act Section 5 on unfair and deceptive practices, which has no marketplace
specification but reaches the same conduct through the deception route: undisclosed paid ranking, fake
reviews, hidden fees and unsubstantiated performance claims are all Section 5 exposure. The right posture
for a hackathon build is not to geofence and not to claim compliance with regimes nobody checked. It is to
build to the strictest specification found (EU, because it is written down), state which texts the design
was built against and say plainly that the analysis is a design input rather than a legal opinion.

## 5. Data protection

The EDPB adopted the final version of its blockchain guidelines on 07 July 2026, two months ago, so this is
the freshest binding-ish guidance in the whole document and it was written for exactly this architecture.
Guidelines 02/2025 version 2.0.

### A wallet address is personal data, conditionally

Para 137, in the glossary:

> A wallet address/account/public key is an identifier linked to a cryptographic key pair in a blockchain
> network. This identifier qualifies as personal data under Article 4 GDPR when it can be associated with an
> identified or identifiable natural person ('data subject').

Para 26 supplies the test and it is a low bar: "If the user is a natural person and those public keys can be
used to identify the individuals by means reasonably likely to be used, for example in case of a data
breach, then those identifiers qualify as personal data." A breach of our own database is named as a means
reasonably likely to be used. So the moment we store an email beside a wallet address, that address becomes
personal data for us, because our own database is the link.

Footnote 12 extends it past the address: "On-chain metadata, including transaction identifiers, wallet
addresses, event logs, receipts, state transitions and smart contract storage and related traces, may
constitute personal data when they enable direct or indirect identification of a natural person."

The single design conclusion: **do not create the link.** A marketplace that never collects an email, a
name or an IP alongside a wallet address is holding a pseudonymous identifier with no reasonably likely
means of identification in its possession. That is the cheapest and strongest data protection posture
available and it is achievable here because wallet signature is already the authentication mechanism.

### What a buyer record must not contain

Hard exclusions, no exceptions:

* No private key, seed phrase, mnemonic, keystore file or password. Not encrypted, not hashed, not
  "temporarily". If a flow appears to need one, the flow is wrong.
* No unbounded token approval created on our behalf and no stored authorisation that outlives the job it
  was signed for.
* No payment card data, ever. That drags in PCI DSS scope for zero benefit on a chain-settled product.
* No government identity document, unless and until an obligation actually attaches. DSA Art 30 would
  require it of traders in a live EU marketplace and until the venue is operating commercially, collecting
  it creates a breach liability with no corresponding duty.
* No special category data under GDPR Art 9. There is no reason for a health, biometric, political,
  religious or sexual-orientation field to exist in an agent marketplace, so the schema should make it
  impossible rather than discouraged.
* No free-text staff notes about a user. Free text is where the special category data and the defamation
  arrive.
* No raw prompt or job brief retained beyond the challenge window by default. A brief is user content and
  can contain anything, including someone else's personal data.
* No IP address stored joined to a wallet address. Either is defensible alone. Joined, they are the
  identification link the EDPB test turns on.
* No third-party API keys belonging to a user held in plaintext and none held at all if a scoped session
  can be used instead.

What a buyer record may contain and it is a short list: the wallet address, the job ids, the deliverable
hashes, the amounts and tokens, the timestamps, the screening verdicts with their list-fetch dates and the
consent and acknowledgement records the withdrawal-right exemption needs. Every one of those is either
already public on-chain or is a compliance artefact we are required to be able to produce.

### Retention

The EDPB's Recommendation 11 is the operative one and para 120 is unusually direct:

> In cases where a data retention period is not as long as the lifetime of the blockchain, a technical
> solution should guarantee the appropriate data retention period. At the end of the retention period for
> personal data stored on the blockchain, this solution should either allow for data deletion or, if
> applicable, render the data anonymous. If such solution does not exist, then no personal data should be
> stored on the chain.

Recommendation 10 para 118 sets the default: "By default, personal data should not be made accessible on a
public blockchain without the data subject's intervention." Recommendation 2 para 109 says store additional
personal data off-chain, "beyond the identifiers already present on-chain in transaction metadata".
Recommendation 9 para 116 closes the consent escape: consent "should not be used for a processing which
requires transactions with individuals if the blockchain architecture does not provide a way to delete the
personal data regarding the parties in a transaction". And para 102, on erasure and objection: those rights
"must be complied with by design", while para 103 concedes actual on-chain deletion "might be technically
impracticable".

Put together, that is a clean rule for this build: **nothing that could identify a person goes on-chain
beyond what the transaction inherently carries.** Deliverable hashes yes, deliverable contents no. Job ids
yes, job briefs no. Payment amounts yes, buyer contact details no. Then the off-chain store, which is the
only place personal data lives, gets a real retention schedule:

| Data | Retention | Why |
|---|---|---|
| Wallet address plus job record | as long as the marketplace index exists, since it is already public on-chain | Deleting our copy achieves nothing while the chain holds it |
| Screening verdict, list version, fetch date | 5 years | OFAC recordkeeping: "five years after the date of the transaction or, with respect to blocked property, five years after property is unblocked" |
| Consent and acknowledgement records | 5 years or the limitation period for the contract, whichever is longer | It is the evidence the withdrawal-right exemption relies on |
| Complaint records and decisions | 6 months minimum for the complaint window, 2 years for the public statistics | DSA Art 20(1) sets the floor at six months; P2B Art 11(4) needs the annual aggregate |
| Notices, statements of reasons, delisting decisions | 2 years | Needed to show Art 16(6) processing was "timely, diligent, non-arbitrary and objective" over time |
| Job briefs and deliverable contents | delete at challenge-window close plus a short grace period | User content, unbounded in what it may contain and the hash is what settlement actually needs |
| Server logs with IP addresses | 30 days, never joined to a wallet address | Operational security need, minimal identification risk if unjoined |
| Anything else | it should not exist | Data minimisation is easier to build than to retrofit |

### Minimum viable posture

Eight items. All of them are a day's work at this scale and every one of them is checkable by a judge.

1. **Wallet signature as the only account.** No email, no password, no OAuth. This one decision removes most
   of the surface.
2. **A written schema with a deny-by-default field policy.** Everything in the allowed list above, nothing
   else, enforced by the type system rather than by discipline.
3. **Retention implemented, not documented.** A scheduled job that actually deletes and a test that proves
   it, because Recommendation 11 asks for a technical solution rather than a policy.
4. **Nothing personal on-chain.** Hashes and ids only. State this in the README with the EDPB
   recommendation it satisfies.
5. **A one-page privacy notice** covering what is collected, why, the lawful basis, retention, the rights and
   how to exercise them. EDPB Recommendation 3 asks for information at the point the user is about to commit
   data to the chain, so put the relevant line on the signing screen as well as in the notice.
6. **An erasure path that is honest about the chain.** Off-chain data is deleted on request. On-chain data
   cannot be and the notice says so instead of implying otherwise. That is exactly the para 103 position.
7. **A breach path.** Who is told, in what order, inside the GDPR Art 33 72-hour notification window. Plus
   EDPB Recommendation 7, which asks for procedures to disclose software vulnerabilities to participants and
   an emergency plan.
8. **No analytics that ship a wallet address to a third party.** A wallet address in a third-party analytics
   payload is an international transfer of personal data with no assessment behind it.

## 6. Abuse reporting, takedown and law enforcement requests

### The intake path

DSA Art 16(1) sets the shape: mechanisms "to allow any individual or entity to notify them of the presence
on their service of specific items of information that the individual or entity considers to be illegal
content", which "shall be easy to access and user-friendly, and shall allow for the submission of notices
exclusively by electronic means". Art 16(2) then lists the four fields the form must enable and facilitate:

* (a) "a sufficiently substantiated explanation of the reasons why the individual or entity alleges the
  information in question to be illegal content";
* (b) "a clear indication of the exact electronic location of that information, such as the exact URL or
  URLs, and, where necessary, additional information enabling the identification of the illegal content";
* (c) "the name and email address of the individual or entity submitting the notice", except for the child
  sexual abuse offences in Articles 3 to 7 of Directive 2011/93/EU;
* (d) "a statement confirming the bona fide belief of the individual or entity submitting the notice that
  the information and allegations contained therein are accurate and complete".

Field (c)'s carve-out is worth building rather than reading past: the CSAM route must accept an anonymous
report, so the form needs a category selector that drops the contact requirement on that branch.

Art 16(3) is the reason the form is not optional decoration:

> Notices referred to in this Article shall be considered to give rise to actual knowledge or awareness for
> the purposes of Article 6 in respect of the specific item of information concerned where they allow a
> diligent provider of hosting services to identify the illegality of the relevant activity or information
> without a detailed legal examination.

A qualifying notice switches off the Art 6(1)(a) immunity for that item. From that moment the only thing
holding the immunity up is Art 6(1)(b), acting expeditiously. So the notice queue is not a customer service
queue, it is a liability clock and it needs to be monitored like one.

For an agent marketplace, three intake routes, one store:

1. **Public notice form**, the Art 16 route, for illegal content and illegal conduct, with the four fields
   plus the anonymous CSAM branch.
2. **In-product report**, one click from an agent card and from a settled job, pre-filling the exact
   location (the agent id, the job id, the deliverable hash) so field (b) is satisfied automatically.
3. **A single published contact point** for authorities. DSA Art 11 requires an electronic point of contact
   and a declared language and Art 9(2)(c) says an order may be transmitted in a declared language and
   "sent to the electronic point of contact designated by that provider". Declaring English and publishing
   one address is the whole obligation at our scale.

### The clock

The DSA does not give a number and stating one it does not give would be inventing law. What it gives is
four qualitative standards and the honest approach is to set our own numeric targets against them and
publish those:

| Duty | The text | Our published target |
|---|---|---|
| Acknowledge a notice | Art 16(4), "without undue delay, send a confirmation of receipt" | automated, immediate |
| Decide and inform | Art 16(5), "without undue delay, notify that individual or entity of its decision ... providing information on the possibilities for redress" | 72 hours for ordinary notices, 24 hours where funds are actively at risk, immediate suspension for CSAM |
| Process quality | Art 16(6), "in a timely, diligent, non-arbitrary and objective manner" and disclose any automated processing used | a written rubric per prohibited-use category and a disclosure line wherever an automated classifier contributed |
| Reverse on a good complaint | Art 20(4), reverse "without undue delay" where the complaint has sufficient grounds | 72 hours |
| Complaint window | Art 20(1), "at least six months following the decision" | six months, counted from the Art 16(5) or Art 17 notification per Art 20(2) |
| Preserve on a US preservation request | 18 USC 2703(f), retain "for a period of 90 days", extendable "for an additional 90-day period upon a renewed request" | 90 days, one renewal, then release |
| Report blocked property | OFAC, "within 10 business days following the date that property is blocked" | 10 business days, with the record produced automatically from the decision log |

Art 16(6)'s automated-processing disclosure is easy to miss and cheap to honour: if a classifier flagged an
agent card, the notification says so.

### The statement of reasons, which is the part that gets skipped

Art 17(1) requires "a clear and specific statement of reasons to any affected recipients of the service" for
four kinds of restriction and the second and fourth are ours: "(b) suspension, termination or other
restriction of monetary payments" and "(d) suspension or termination of the recipient of the service's
account". So blocking a payment on a sanctions hit and delisting an agent both require a written reason to
the affected party and Art 17(2) says the duty applies "at the latest from the date that the restriction is
imposed, regardless of why or how it was imposed".

Art 17(3) sets the minimum contents, including whether the decision entails removal, disabling, demotion,
restriction of visibility or suspension of monetary payments, "where relevant, the territorial scope of the
decision and its duration" and "the facts and circumstances relied on in taking the decision".

Practically: every enforcement action in the system emits a statement of reasons record with the action
type, the scope, the duration, the facts, the policy category, whether automation was involved and the
redress route. Generate it from the action rather than writing it by hand, because a hand-written one will
not exist when the action is taken by a script at 3am.

### Law enforcement and authority requests

Two regimes and the useful thing about both is that they tell you what a valid request looks like, which is
what a small operator actually needs.

DSA Art 9, orders to act against illegal content. A valid order carries the legal basis, a statement of
reasons explaining why the content is illegal "by reference to one or more specific provisions" of law,
identification of the issuing authority, "clear information enabling the provider ... to identify and locate
the illegal content concerned, such as one or more exact URL", information about redress and where relevant
which authority receives the confirmation. Its territorial scope must be "limited to what is strictly
necessary to achieve its objective". Our duty on receipt is to "inform the authority issuing the order, or
any other authority specified in the order, of any effect given to the order without undue delay, specifying
if and when effect was given". Art 9(5) requires informing the affected user "at the latest when effect is
given to the order" or at a time the order specifies.

DSA Art 10, orders to provide information. Same element list, plus one limit worth quoting because it is a
shield: the order "only requires the provider to provide information already collected for the purposes of
providing the service and which lies within its control". We cannot be ordered to start collecting. Which is
another reason the minimal-collection posture in section 5 is a compliance asset rather than a gap.

US Stored Communications Act, 18 USC 2703. Three tiers and only the first is likely to reach a marketplace
of this shape. Under 2703(c)(2) an administrative, grand jury or trial subpoena reaches basic subscriber
information: name, address, "records of session times and durations", "length of service (including start
date) and types of service utilized", "subscriber number or identity, including any temporarily assigned
network address" and "means and source of payment for such service (including any credit card or bank
account number)". Under 2703(d) a court order needs "specific and articulable facts showing that there are
reasonable grounds to believe" the records are "relevant and material to an ongoing criminal investigation". A provider may move to quash where compliance
is "unusually voluminous in nature or ... would cause an undue burden". Content needs a warrant. Preservation under 2703(f) is 90 days, "extended for an additional
90-day period upon a renewed request".

Note what the 2703(c)(2) list means for a wallet-signature-only product: we hold no name, no address, no
payment instrument and no email. The compliant answer to most subpoenas is a short letter saying which of
the enumerated categories we hold, which is a wallet address and session timestamps and nothing else. That
is a real benefit of the data posture, not a rhetorical one.

Handling rules worth writing down before the first request:

* One published intake address, one named responsible person, one language declared.
* Validate the elements before acting. An order missing its legal basis or its exact location is not a valid
  order under Art 9(2)(a) and acting on an invalid one is a decision we made rather than one we were
  compelled to make.
* Refuse over-broad scope, citing Art 9(2)(b) or 2703(d)'s undue-burden clause, rather than complying
  quietly.
* Notify the affected user unless a valid non-disclosure requirement applies. Art 9(5) requires it; in the
  US a 2705(b) order can suspend it. Default to notice, document the exception.
* Never widen collection in response to a request. Art 10(2)(b) says orders reach what is already collected.

### The append-only problem, stated plainly

The ERC-8004 registries cannot forget. Registration is permissionless: `register(string)` simulated from an
arbitrary address returns an id. Metadata is mutable by the owner through `setAgentURI` and `setMetadata`, plus the payee through
`setAgentWallet`. Nothing is ever removed.

So three things are true at once and the policy has to say all three:

1. **Takedown means delisting from our index.** The agent NFT, its history and its feedback stay on BSC
   forever. Do not write "removed" where "delisted here" is what happened.
2. **Review is a snapshot, not a state.** Pin the keccak of the reviewed metadata document and the agent
   card at review time, re-check it on a schedule and treat a drift as a new listing needing new review.
   This is both the enforcement mechanism for the silent-capability-change prohibition and the only way a
   review claim stays true.
3. **Erasure cannot be promised for on-chain data.** Which is exactly EDPB para 103. Say it in the privacy
   notice and the takedown policy, in the same words, so the two documents agree.

## Interfaces and constants

Everything in this section was verified today. Addresses are BSC chain id 56 unless stated.

### Chainalysis sanctions oracle

```
BSC, Ethereum, Polygon, Avalanche, Optimism, Arbitrum, Fantom, Celo, Blast:
  0x40C57923924B5c5c5455c48D93317139ADDaC8fb
Base:
  0x3A91A31cB3dC49b4db9Ce721F50a9D076c8D739B

verified on BSC: code 3557 bytes, name() = "Chainalysis sanctions oracle",
owner() = 0xDF900dC8991474ab9d69F2c3b9C900c055fb36CD
```

Full selector set read off the deployed bytecode, eight functions, no others:

| Selector | Signature | Notes |
|---|---|---|
| `0xdf592f7d` | `isSanctioned(address) returns (bool)` | view, the one to call |
| `0xa2a6bbd8` | `isSanctionedVerbose(address) returns (bool)` | non-view, emits `SanctionedAddress` or `NonSanctionedAddress`, costs gas |
| `0xb972dfcc` | `addToSanctionsList(address[])` | owner only |
| `0xef782431` | `removeFromSanctionsList(address[])` | owner only |
| `0x06fdde03` | `name() returns (string)` | |
| `0x8da5cb5b` | `owner() returns (address)` | |
| `0xf2fde38b` | `transferOwnership(address)` | |
| `0x715018a6` | `renounceOwnership()` | |

Minimal Solidity interface, paste-ready:

```solidity
// SPDX-License-Identifier: LicenseRef-zkasuran-SAND-1.0
interface ISanctionsList {
    function isSanctioned(address addr) external view returns (bool);
}

address constant CHAINALYSIS_ORACLE = 0x40C57923924B5c5c5455c48D93317139ADDaC8fb;
```

One-command verification, which is worth putting in the README because a judge can run it:

```bash
export RPC=https://bsc-rpc.publicnode.com
cast call 0x40C57923924B5c5c5455c48D93317139ADDaC8fb "name()(string)" --rpc-url $RPC
# "Chainalysis sanctions oracle"
cast call 0x40C57923924B5c5c5455c48D93317139ADDaC8fb \
  "isSanctioned(address)(bool)" 0x098B716B8Aaf21512996dC57EB0615e2383E2f96 --rpc-url $RPC
# true   (an SDN-listed address)
cast call 0x40C57923924B5c5c5455c48D93317139ADDaC8fb \
  "isSanctioned(address)(bool)" 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c --rpc-url $RPC
# false  (WBNB)
cast estimate 0x40C57923924B5c5c5455c48D93317139ADDaC8fb \
  "isSanctioned(address)(bool)" 0x098B716B8Aaf21512996dC57EB0615e2383E2f96 \
  --from 0x0000000000000000000000000000000000000001 --rpc-url $RPC
# 24694
```

### OFAC SDN ingest

```bash
# 5,672,451 bytes today, 19,329 rows, no key, no rate limit encountered
curl -sSL -o SDN.CSV \
  "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV"

# the 91 distinct EVM addresses, chain tag deliberately ignored
grep -o 'Digital Currency Address - [A-Z]* 0x[0-9a-fA-F]\{40\}' SDN.CSV \
  | awk '{print tolower($6)}' | sort -u > sdn-evm.txt
wc -l sdn-evm.txt   # 91

# tag distribution, to show why the tag must be ignored
grep -o 'Digital Currency Address - [A-Z0-9]*' SDN.CSV | sort | uniq -c | sort -rn
# 262 XBT, 87 ETH, 67 TRX, 43 USDT, 8 LTC, 6 XMR, 5 DASH, 3 ZEC,
# 2 USDC, 2 SOL, 2 DOGE, 2 BCH, 1 XVG, 1 ETC, 1 BTG, 1 BNB, 1 untagged
```

The legacy path `https://www.treasury.gov/ofac/downloads/sdn.csv` returned a byte-identical file, so either
works and neither needs a key.

### Chainalysis screening API

```
GET https://public.chainalysis.com/api/v1/address/{address}
X-API-Key: <key>
Accept: application/json

verified: a bogus key returns HTTP 401 {"message":"Invalid API Key"}
unverified: the success response shape, the rate limits, the terms
```

Do not code against a response shape this pass did not see. Treat this as a secondary source behind the
oracle and the raw SDN list, both of which are keyless.

### Stablecoin freeze and pause surface

```solidity
interface IFreezable {
    function frozen(address account) external view returns (bool);  // 0xd0516650
    function paused() external view returns (bool);                 // 0x5c975abb
}

// FDUSD, 18 decimals, proxy, impl 0xa6b2c3d2910246fb0adb02e5f6b39e29026e6d50
address constant FDUSD = 0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409;
// USD1, 18 decimals, proxy, impl 0x694aa534bdef8ed63244eb902e7914e527891f08
address constant USD1  = 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d;
// BSC-USD, 18 decimals, not a proxy. NO frozen(), NO paused(). Guard the call.
address constant BSCUSD = 0x55d398326f99059fF775485246999027B3197955;
```

Issuer-side selectors present on both FDUSD and USD1: `freeze(address)` `0x8d1fdf2f`,
`unfreeze(address)` `0x45c8b1a6`. Present on USD1 only:
`reallocate(address,address,uint256)` `0x308b8c00`, `drain(address)` `0xece53132`,
`recoverERC20(address,address,uint256)` `0x1171bda9`.

Current state read today: FDUSD `frozen(0x…01)` false, `paused()` false, `owner()`
`0xfa771871d3d5c85e156D3d379E2FF7699C4d6a66`. USD1 `frozen(0x…01)` false, `paused()` false, `owner()`
`0xEE9B1A09AEDAceD9dCDA74964EA447feb93861C2`. BSC-USD `owner()`
`0xF68a4b64162906efF0fF6aE34E2bB1Cd42FEf62d`, `isBlackListed` and `getBlackListStatus` both revert.

### ERC-8004 Identity Registry surface relevant to enforcement

```
registry 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 (proxy)
impl     0x7274e874ca62410a93bd8bf61c69d8045e399c02 (58 selectors)

register()                                     0x1aa3a008
register(string)                               0xf2c298be   -> uint256 agentId
register(string,(string,bytes)[])              0x8ea42286
setAgentURI(uint256,string)                    0x0af28bd3   <- listing can change post-review
setMetadata(uint256,string,bytes)              0x466648da   <- so can metadata
setAgentWallet(uint256,address,uint256,bytes)  0x2d1ef5ae   <- so can the payee
unsetAgentWallet(uint256)                      0x3fddcf19
getMetadata(uint256,string)                    0xcb4799f2
isAuthorizedOrOwner(address,uint256)           0xd95e72be
tokenURI(uint256)                              0xc87b56dd
ownerOf(uint256)                               0x6352211e
```

Simulated `register(string)` from `0x1111111111111111111111111111111111111111` returned `334944`, so
registration is not gated on a role and the next id today is around 334,944. Screen `ownerOf(agentId)` and
the address returned by the agent's wallet setter, not just the card's declared payee.

### RPC constraints that affect the compliance path

```
https://bsc-rpc.publicnode.com   single requests OK, JSON-RPC BATCH -> HTTP 403 (tested 5 and 20 items)
https://bsc-dataseed.binance.org batch OK
```

Terms note: the Allnodes terms behind publicnode prohibit "data mining, robots, scraping, or similar data
gathering or extraction methods", disclaim all warranties and cap liability at "THE AMOUNT YOU HAVE PAID".
A screening path that cannot be missed should not sit on a single free endpoint with those terms. Two
endpoints, batch-capable second and a hard refusal to quote when both are unreachable.

### Record shapes

Three records carry the whole compliance story. Every field below exists because a text above asks for it.

Screening verdict, written on every quote and again at settlement:

```json
{
  "kind": "screening_verdict",
  "verdictId": "scr_01J8...",
  "at": "2026-09-05T07:41:12Z",
  "chainId": 56,
  "block": 68412977,
  "subject": { "role": "payee", "address": "0x89e9e1ab11dd1b138b1dce6d6a4a0926aafd5029" },
  "agentId": 1,
  "checks": [
    { "source": "chainalysis_oracle", "address": "0x40C57923924B5c5c5455c48D93317139ADDaC8fb",
      "call": "isSanctioned(address)", "result": false },
    { "source": "ofac_sdn_evm_set", "listFetchedAt": "2026-09-05T07:36:02Z",
      "listSha256": "…", "setSize": 91, "result": false },
    { "source": "token_frozen", "token": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
      "call": "frozen(address)", "result": false },
    { "source": "token_paused", "token": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
      "call": "paused()", "result": false }
  ],
  "outcome": "allow",
  "outcomeReason": null,
  "retainUntil": "2031-09-05T07:41:12Z"
}
```

`listFetchedAt` and `listSha256` are the fields that make the verdict defensible later. A verdict with no
list version behind it cannot be re-derived and OFAC's five-year recordkeeping expects a record that means
something in five years.

Abuse notice, the DSA Art 16 intake:

```json
{
  "kind": "notice",
  "noticeId": "ntc_01J8...",
  "receivedAt": "2026-09-05T09:02:44Z",
  "acknowledgedAt": "2026-09-05T09:02:44Z",
  "category": "reputation_manipulation",
  "anonymousAllowed": false,
  "notifier": { "name": "…", "email": "…" },
  "location": { "agentId": 302258, "jobId": null, "url": "https://…/agent/302258",
                "deliverableHash": null },
  "reasons": "free text, the Art 16(2)(a) substantiated explanation",
  "bonaFide": true,
  "automatedTriage": { "used": true, "classifier": "policy-v1", "score": 0.81 },
  "state": "under_review",
  "decidedAt": null,
  "statementOfReasonsId": null,
  "retainUntil": "2028-09-05T09:02:44Z"
}
```

Set `anonymousAllowed` true and drop `notifier` on the CSAM branch, per the Art 16(2)(c) carve-out.

Statement of reasons, emitted by every enforcement action, per DSA Art 17(3):

```json
{
  "kind": "statement_of_reasons",
  "sorId": "sor_01J8...",
  "issuedAt": "2026-09-05T11:20:03Z",
  "affected": { "agentId": 302258, "owner": "0x…" },
  "action": "delist_from_index",
  "alsoRestrictsPayments": false,
  "territorialScope": "global",
  "duration": "indefinite_pending_appeal",
  "policyCategory": "reputation_manipulation",
  "facts": "14 feedback entries from 3 payer addresses funded by one address within 40 blocks",
  "legalOrPolicyBasis": "marketplace terms §4.2 (reputation manipulation)",
  "automatedMeansUsed": true,
  "onChainEffect": "none: the ERC-8004 registry entry and its feedback remain on BSC",
  "redress": { "internalComplaintUntil": "2027-03-05T11:20:03Z",
               "outOfCourtDisputeSettlement": "…", "howToLodge": "https://…/appeal" }
}
```

`onChainEffect` is the field that keeps the venue honest about what a takedown does. It should read "none"
on every registry-related action, because that is the truth.

## 7. Licensing our own outputs

### The house rule and what it means here

The standing rule is that a competition entry ships source-available no-derivatives
(`LicenseRef-zkasuran-SAND-1.0`), not MIT, because MIT is the permission to take a registered artifact,
append bytes and register the result as a rival entry. The test is whether an artifact is a **contribution**
meant to be adopted or an **entry** meant to win. Contributions get permissive terms. Entries get SAND.

This build splits cleanly on that test and the split is unusual because the prize is literally adoption.

| Part | Entry or contribution | Licence | Reasoning |
|---|---|---|---|
| The marketplace web app: UI, ranking, search, category surfaces, the four category experiences | **entry** | SAND-1.0 | This is the thing being judged. A rival scanning the org during the submission window could fork the ranking surface and the four category experiences and enter them. That is the exact taking the rule exists to stop |
| The scoring and ranking implementation | **entry** | SAND-1.0 | It is the differentiator and it is the most copyable file in the repo |
| The compliance layer: screening client, SDN ingest, verdict store, notice and statement-of-reasons machinery | **contribution** | Apache-2.0 | This should be adopted, by BNB Agent Studio and by every rival. It is not where we compete, wider adoption makes the whole venue safer and Apache-2.0 rather than MIT because the patent grant and the NOTICE requirement suit a thing others will vendor |
| Agent adapters and the four reference agents (rebalancing, grid, yield, health factor) | **contribution** | Apache-2.0 | The rubric asks for agent diversity and agents that other people can extend are worth more to the ecosystem than agents nobody can touch. These are also the pieces most likely to be upstreamed |
| Any PR into `pancakeswap/*`, `ChaosChain/trustless-agents-erc-ri`, `coinbase/x402` or an Altana repo | **contribution** | whatever that repo uses | A PR takes the target repo's licence. Not a choice |
| The ERC-8004 metadata schema or profile extension, if we publish one | **contribution** | CC0-1.0 | It is a spec. It only works if everyone can implement it and CC0 matches how ERC-8004 itself is licensed |
| Research documents in `three/research/` | **internal** | not published | They carry rival tracking and defence notes. They are not part of the submission |

The adoption prize creates one real tension worth recording rather than glossing. "Official adoption as the
BNB Agent Studio marketplace" means BNB Chain would need rights to run, host and modify the marketplace
app, which SAND-1.0 withholds. Those are compatible in the way that matters: SAND is our default outbound
licence, not a refusal to grant anything, so a named adoption grant is a separate negotiated instrument on
top of it. So the position to ship is a `LICENSE` file with SAND-1.0 plus an `ADOPTION.md`
that says the terms for the named programme are available on request and are not this file. That keeps
strangers out and keeps the prize reachable. Do not pre-assign anything and do not license the entry
permissively in the hope of looking cooperative, because that hands the fork to every rival at the same
time.

The programme's own IP terms are unverified (DoraHacks is WAF-blocked), which is a reason to be
conservative rather than a reason to guess. If those terms turn out to require a permissive licence on
submissions, that is a decision for the operator with the actual clause in front of them, not a default.

### Every third-party input, with the granting clause

Clean grants first. Each clause below was read today from the source named.

| Input | Grant | Quoted clause or licence identifier | How read |
|---|---|---|---|
| EIP-8004 text | CC0 | "Copyright and related rights waived via CC0" | local `eip-8004-2026-08-27.txt` line 305 |
| EIP-8183 text | CC0 | "Copyright and related rights waived via CC0" | local `eip-8183-2026-08-27.txt` line 590 |
| EIP-3009 text | CC0 | "Copyright and related rights waived via CC0" | local `eip-3009-2026-08-27.txt` line 436 |
| `ethereum/ERCs` repo | CC0-1.0 | SPDX `CC0-1.0` on the repository licence | `gh api repos/ethereum/ERCs` |
| ERC-8004 contracts README and examples | CC0 | "## License\n\nCC0 - Public Domain" | local `erc-8004-contracts-README-2026-08-27.md` line 393 |
| `ChaosChain/trustless-agents-erc-ri` (ERC-8004 reference implementation) | MIT | SPDX `MIT` | `gh api repos/ChaosChain/trustless-agents-erc-ri` |
| `@altananetwork/sdk` 0.9.0 | Apache-2.0 | npm manifest `"license": "Apache-2.0"` and the SDK README "## License\n\nApache-2.0" | `curl registry.npmjs.org/@altananetwork%2fsdk`, local `altana-sdk-staging-README.md` line 155 |
| `coinbase/x402` | Apache-2.0 | SPDX `Apache-2.0` | `gh api repos/coinbase/x402/license` |
| `VenusProtocol/venus-protocol` | BSD-3-Clause | SPDX `BSD-3-Clause` | `gh api` |
| `VenusProtocol/isolated-pools` | BSD-3-Clause | SPDX `BSD-3-Clause` | `gh api` |
| `pancakeswap/pancake-v3-contracts` | GPL-2.0-or-later per file | `// SPDX-License-Identifier: GPL-2.0-or-later` at the head of `projects/v3-core/contracts/PancakeV3Pool.sol` | `gh api` contents read. Note: no root LICENSE file, the grant is only in the file headers |
| `pancakeswap/infinity-core`, `infinity-periphery` | GPL-2.0 | SPDX `GPL-2.0` | `gh api orgs/pancakeswap/repos` |
| `pancakeswap/pancake-swap-core`, `pancake-swap-periphery` | GPL-3.0 | SPDX `GPL-3.0` | same |
| `pancakeswap/pancake-swap-sdk`, `pancakeswap/permit2` | MIT | SPDX `MIT` | same |
| `OpenZeppelin/openzeppelin-contracts` | MIT | SPDX `MIT` | `gh api` |
| `wevm/viem` | MIT | "MIT License / Copyright (c) 2023-present weth, LLC" | `gh api repos/wevm/viem/contents/LICENSE` decoded. GitHub's licence API reports NOASSERTION, the file itself is plain MIT |
| `wevm/wagmi` | MIT | SPDX `MIT` | `gh api` |
| `vercel/next.js` | MIT | SPDX `MIT` | `gh api` |
| `foundry-rs/forge-std` | Apache-2.0 (dual with MIT) | SPDX `Apache-2.0`, path `LICENSE-APACHE` | `gh api` |
| `lucide-react` icons | ISC | npm manifest `"license": "ISC"` | `curl registry.npmjs.org/lucide-react` |
| Inter font | OFL-1.1 | SPDX `OFL-1.1` on `rsms/inter` | `gh api repos/rsms/inter/license` |
| Chainalysis sanctions oracle (reading it) | no grant needed | "The smart contract is available for anyone to use and does not require a customer relationship with Chainalysis." Their own disclaimer: it "cannot guarantee the accuracy, timeliness, suitability, or validity of the data." | oracle docs page read live |
| ERC-8004 registry data (reading it) | no grant needed | public contract state on a public chain | `cast` |

Conditional grants that need a decision, not just a note.

**Aave v3 (`aave-dao/aave-v3-origin`), BUSL-1.1.** The Additional Use Grant reads:

> You are permitted to use, copy, and modify the Licensed Work, subject to the following conditions:
> - Your use of the Licensed Work shall not, directly or indirectly, enable, facilitate, or assist in any
>   way with the migration of users and/or funds from the Aave ecosystem.

Change Date is "the earlier of 2027-03-06" or a date recorded on `v37.aavelicense.eth`, with Change License
MIT. Aave v3 is live on BSC (Pool `0x6807dc923806fE8Fd134338EABCA509979a7e0cB`, `POOL_REVISION()` = 11), so
this is not academic. A yield or health-factor agent that compares Aave against Venus and produces an output
a user acts on could be read as indirectly facilitating migration of funds from Aave and the grant also
excludes anyone who has deployed a competitive fork within four years. The clean answer and the one to
ship: **do not vendor Aave v3 source into this repo.** Read Aave positions through the deployed contracts
and their public ABI, cite Aave data as measurement, present the comparison symmetrically (Aave appears as
an option, not as the thing to leave) and if the ambiguity still bothers anyone, ship the health-factor
agent on Venus, which is BSD-3-Clause with no use restriction at all. Venus is the deeper BSC lender anyway.

**GPL-2.0 and GPL-3.0 PancakeSwap contracts.** Copyleft. Reading a deployed PancakeSwap pool over its ABI
creates no derivative work and needs no grant. Copying `.sol` from `pancake-v3-contracts`, `infinity-core` or
`pancake-swap-core` into our repo would put a copyleft obligation on the combined work, which collides with
SAND-1.0 on the entry side. So: interfaces we declare ourselves, ABI reads, no vendored Solidity. If a
PancakeSwap math library is genuinely needed, isolate it in its own package under its own GPL licence and
keep it out of the SAND-licensed tree.

**OpenSanctions, CC BY-NC 4.0.** Non-commercial only. A marketplace taking a platform fee is commercial use.
Usable for a hackathon demonstration with attribution; not usable in the fee-taking product without their
commercial licence. Do not build a dependency on it and then discover this.

### Inputs whose grant could not be found

Each of these is a hard flag and each has a decision attached rather than just a warning.

| Input | What is missing | Decision |
|---|---|---|
| `pancakeswap/pancakeswap-ai` | `package.json` says `"license": "MIT"` and the README says "MIT License — see [LICENSE] for details", but **there is no LICENSE file** and the GitHub licence API returns `"license": null`. The repo is also marked `"private": true` in its own manifest | The MIT assertion in the manifest is a grant on its face, so vendoring is probably fine, but "probably" is not the standard. Do not copy code from it. Cite its published skill documentation as a source when correcting its numbers, which is fair reporting of a public document rather than reuse of code |
| `pancakeswap/erc-8183-example` | no LICENSE file, no licence key in `pyproject.toml`, no licence line in the README. Nothing anywhere | **No permission to copy.** Absence of terms is not permission. Read it to learn the call sequence, then write our own implementation against ERC-8183 (which is CC0) and the deployed contracts. Never paste from it |
| 8004scan API responses | the OpenAPI `info` object (v0.4.363) has no `termsOfService`, no `license`, no `contact`; `/terms` 404s and other legal paths 307 to a redirect stub | Use it as an index and a cross-check, never as the source of a published number. Anything the product asserts publicly must be re-derived from the on-chain registry, which needs no grant. Do not redistribute bulk 8004scan output |
| TermiX listings, skill docs and site data | no terms page at `/terms`, `/legal/terms` or `/privacy` (all 404). Footer says "Copyright 2026 TermiX. All rights reserved.", which is a reservation rather than a grant | Read for research, cite as a public page, copy nothing. If the TermiX track needs an integration, build against whatever they publish as an interface and ask them for terms |
| OFAC SDN data | no licence, no terms and no copyright statement located on the download endpoints or the list landing page (which renders client-side and returned an empty body). US Government works are outside US copyright under longstanding practice, but I could not quote a granting sentence today | Ingest and use it, credit Treasury as the source and do not claim a licence exists. Record the absence in `DATA-SOURCES.md` as "no terms found, US Government work" rather than as a grant |
| `bsc-rpc.publicnode.com` (Allnodes) | terms exist and are restrictive rather than absent: no scraping or "data mining, robots, scraping, or similar data gathering", warranties disclaimed, liability capped at "THE AMOUNT YOU HAVE PAID", California jurisdiction, one-year limitation | Fine for interactive reads. Not a basis for bulk indexing and not a dependency to put a compliance check behind on its own. Keep `bsc-dataseed.binance.org` as the batch-capable fallback and say so in the README |
| The hackathon's own IP and licensing terms | unreachable, DoraHacks returns HTTP 405 with an AWS WAF human-verification page on every API path tried and `bnbchain.org/en/hackathon` renders client-side | Assume nothing. Ship SAND-1.0 on the entry, Apache-2.0 on the contribution and read the actual terms before the submission form is filed |

Everything above belongs in a `DATA-SOURCES.md` in the lane, one row per input, with the clause quoted. The
publish step should refuse a release where a row has no clause and no explicit "no terms found" note, which
is the same pattern as refusing an unstamped binary.

## Design implications for the marketplace

Ten decisions follow from the texts above. Each one is a build instruction, not a caveat.

1. **Never take custody, never sit in the payment flow.** The marketplace quotes, the buyer signs, the
   facilitator or the escrow moves value, the platform fee is a split inside that same settlement. This is
   the FIN-2019-G001 forum position and it is the difference between a product and a money services
   business. If a design step ever requires funds to land in an account we control before reaching the
   seller, that step is the bug.
2. **Screen on the quote path, four keyless calls and re-run at settlement.** Oracle plus the local SDN EVM
   set plus `frozen()` plus `paused()`, on the buyer, the seller's payee and the agent's registered wallet.
   Ignore the SDN chain tag. One source is provably not enough: 20 of the 42 BSC-active SDN addresses are
   invisible to the oracle.
3. **Handle screening results asymmetrically.** A direct-counterparty hit blocks and logs with a reason
   shown. Everything softer flags for review. Graph proximity never auto-blocks, because inbound taint lets
   an attacker choose who gets frozen.
4. **Refuse to quote when the escrow token is frozen or paused, before the user commits.** Two extra
   `eth_call`s convert a mid-job failure into a clean pre-quote refusal and they are the only visibility
   anyone has into the GENIUS Act freeze layer.
5. **Build every agent output as one of four shapes: measurement, comparison on stated criteria,
   user-parameterised simulation or mechanical execution of a user-set rule.** That keeps the whole product
   outside the MiCA and MiFID II definition of advice by construction, rather than by disclaimer. Downside
   always beside upside, block and source always attached.
6. **Present as a broker and behave like one.** Operator named on every listing and receipt, published
   ranking methodology, no outcome warranties, no first-party framing of third-party agents. DSA Art 6(3)
   removes the consumer-protection safe harbour precisely where a platform looks like the seller and
   "official marketplace" framing plus heavy curation is that fact pattern.
7. **Pin the reviewed bytes.** Store the keccak of the agent's metadata document and card at review, re-check
   on a schedule, treat drift as a new listing. `setAgentURI`, `setMetadata` and `setAgentWallet` are owner
   callable at any time, so without this, "reviewed" is a claim with no referent.
8. **Only count feedback bound to a settled job with a distinct payer and publish the rule.** Show the
   settled-job count beside the score, label unbound feedback as unverified rather than averaging it in.
   UCPD Annex I 23b and 23c make the alternative unfair in all circumstances and this is also the honest
   answer to Data Quality on the rubric.
9. **Collect nothing that creates the identification link.** Wallet signature as the only account. No email,
   no IP joined to an address, no identity documents until an obligation attaches. The EDPB says a wallet
   address becomes personal data when our own database can link it and DSA Art 10(2)(b) plus 18 USC
   2703(c)(2) both only reach what is already collected. Minimal collection is a compliance asset.
10. **Emit a statement of reasons from every enforcement action, with an `onChainEffect` field that reads
    "none".** Delisting is delisting from our index. Registry entries and feedback stay on BSC forever, so
    the privacy notice and the takedown policy must say that in the same words.

Two things worth noticing about how this lands on the rubric. The compliance layer is the cheapest available
answer to "Data Quality", because a verdict record carrying a block number, a list hash and a fetch time is
exactly what a judge means by data that can be checked. And it is the cheapest available answer to
marketplace quality on the TermiX rubric, because the incumbent in that very track publishes no terms at all.

## Go-live checklist

One page. Each line is either done or not and each maps to a text above.

**Payments and perimeter**

- [ ] No code path where buyer funds reach an account the operator controls. Grep for it, do not assume.
- [ ] Platform fee taken as a settlement split, never as a cut of received funds.
- [ ] Escrow keys not held by the operator and the README says who can move what.
- [ ] `frozen(payer)`, `frozen(payee)`, `paused()` checked before every quote, with a guard for tokens that
      do not implement them (BSC-USD does not).
- [ ] 18 decimals assumed nowhere by accident. Every BSC stablecoin here is 18, not 6.

**Sanctions**

- [ ] `isSanctioned` wired to `0x40C57923924B5c5c5455c48D93317139ADDaC8fb`, verified with the two-command
      check (a known SDN address returns true, WBNB returns false).
- [ ] SDN CSV ingested, EVM addresses extracted with the chain tag ignored, set size recorded (91 today).
- [ ] List refreshed at least daily, `listFetchedAt` and `listSha256` stored on every verdict and a stale
      cache refuses to serve rather than serving quietly.
- [ ] Screening runs on buyer, payee and the agent's registered wallet, at quote and again at settlement.
- [ ] Hard block on a direct hit, review flag on anything softer, both logged with a reason.
- [ ] Two RPC endpoints configured, the fallback batch-capable and a hard refusal when both are down.

**Financial advice**

- [ ] Every agent output classified as measurement, comparison, simulation or rule execution. No output
      outside the four.
- [ ] No occurrence of "suitable", "guaranteed", "safe", "capital protected" or "risk-free" in any agent
      output or marketing copy. Grep it.
- [ ] FCA-worded risk banner statically fixed at the top of every view showing a rate, return, projection or
      health factor. Not a footer, not a dismissable modal.
- [ ] Downside shown at the same visual weight as upside on every number.
- [ ] Block or timestamp and source attached to every figure.
- [ ] Authority screen before any first grant: what can be called, up to what, until when, where to revoke.
- [ ] No independence claim anywhere. Fee published. Ranking methodology published.
- [ ] No referral bonus or incentive on agent hires.

**Consumer and marketplace duties**

- [ ] Ranking page linked from every result list, naming each signal and its weight and stating that
      payment does not influence ranking.
- [ ] Trader or non-trader status declared per listing and shown on the card, with the "consumer rights do
      not apply" line on non-trader cards.
- [ ] "Who is responsible for what" block on every listing.
- [ ] Total price including fee shown before acceptance.
- [ ] Two separate ticks at acceptance: begin now, plus I lose the 14-day withdrawal right. Wording and
      timestamp stored.
- [ ] Durable confirmation issued after acceptance, exportable.
- [ ] Free one-click cancellation before start; challenge window named on the card for after.
- [ ] Buyer complaint system, electronic, free, six-month window, five states, reversal path.
- [ ] Seller complaint system plus a public statistics page with the four P2B Art 11(4) numbers.
- [ ] Operator named on every listing and receipt. No first-party framing of third-party agents.
- [ ] Reputation rule implemented: settled-job binding, distinct payer, count shown, unbound feedback
      labelled.

**Data protection**

- [ ] Wallet signature is the only account mechanism. No email, no password.
- [ ] Field policy enforced in types: no keys, no card data, no identity documents, no special category
      data, no free-text notes, no IP joined to a wallet address.
- [ ] Nothing personal on-chain beyond what the transaction inherently carries. Hashes and ids only.
- [ ] Retention schedule implemented as a scheduled deletion job, with a test that proves it deletes.
- [ ] Privacy notice published, including the honest statement that on-chain data cannot be erased.
- [ ] Breach path written, with the 72-hour notification window named.
- [ ] No wallet address in any third-party analytics payload.

**Abuse, takedown, authorities**

- [ ] Public notice form with the four Art 16(2) fields, plus an anonymous branch for CSAM.
- [ ] One-click in-product report that pre-fills the exact location.
- [ ] Published authority contact point and declared language.
- [ ] Numeric response targets published: immediate acknowledgement, 72 hours to decide, 24 hours where
      funds are at risk.
- [ ] Statement of reasons emitted automatically by every enforcement action, with `onChainEffect`.
- [ ] Automated-triage disclosure included wherever a classifier contributed.
- [ ] Preservation handling: 90 days, one 90-day renewal, then release.
- [ ] Order validation: reject an order missing its legal basis or exact location; refuse over-broad scope;
      notify the affected user unless a valid non-disclosure requirement applies.
- [ ] Metadata hash pinned at review and re-checked, so a silent capability change is detected.

**Licensing, before the repo flips public**

- [ ] `LICENSE` = SAND-1.0 at the entry root; `ADOPTION.md` stating that adoption terms are separate.
- [ ] Apache-2.0 on the compliance layer and the reference agents, in their own directories with their own
      `LICENSE` and `NOTICE`.
- [ ] `NOTICE` naming every third-party component with its own terms.
- [ ] `DATA-SOURCES.md` with one row per input and the granting clause quoted, or else an explicit
      "no terms found" note.
- [ ] No Aave v3 source vendored. Aave read through the deployed ABI only.
- [ ] No GPL Solidity vendored into the SAND-licensed tree.
- [ ] No code copied from `pancakeswap/erc-8183-example` (no licence) or `pancakeswap/pancakeswap-ai` (no
      LICENSE file).
- [ ] OpenSanctions not in the shipped fee-taking path.
- [ ] The programme's own IP terms read before the submission form is filed.
- [ ] No `submit/`, form fill, key or `.env` tracked. `git check-ignore submit/` returns the path.
- [ ] Anonymous fetch of the repo and of every URL the submission cites returns 200.

## Sources

### Primary legal and regulatory texts, all fetched 2026-09-05

| Source | URL | Saved as |
|---|---|---|
| FinCEN FIN-2019-G001, "Application of FinCEN's Regulations to Certain Business Models Involving Convertible Virtual Currencies", issued 9 May 2019 | https://www.fincen.gov/sites/default/files/2019-05/FinCEN%20Guidance%20CVC%20FINAL%20508.pdf | `raw/r15-fincen-cvc-2019-G001.pdf` |
| OFAC, "Sanctions Compliance Guidance for the Virtual Currency Industry", October 2021 | https://ofac.treasury.gov/media/913571/download?inline | `raw/r15-ofac-vc-guidance-2021.pdf` |
| OFAC SDN list, CSV export | https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV | `raw/r15-ofac-SDN-2026-09-05.csv` (and a byte-identical `raw/r15-ofac-sdn-legacy.csv` from the legacy path) |
| GENIUS Act, Public Law 119-27 | https://www.congress.gov/119/plaws/publ27/PLAW-119publ27.pdf | `raw/r15-genius-act-PL119-27.pdf` |
| Regulation (EU) 2023/1114 (MiCA), consolidated | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023R1114 | `raw/r15-mica-2023-1114-2026-09-05.html` |
| Commission Delegated Regulation (EU) 2017/565, Art 9 and recitals 14 to 15 | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32017R0565 | read live, not saved |
| Directive 2011/83/EU (Consumer Rights), consolidated to 2022-05-28, Art 6a and Art 16 | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02011L0083-20220528 | read live, not saved |
| Directive 2005/29/EC (UCPD), consolidated to 2022-05-28, Annex I points 11a, 23b, 23c | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02005L0029-20220528 | read live, not saved |
| Regulation (EU) 2022/2065 (DSA), Art 6 to 11, 16, 17, 20, 30 | EUR-Lex | local capture `raw/r13-eu-dsa-2022-2065-2026-09-05.html`, extracted to text |
| Regulation (EU) 2019/1150 (P2B), Art 11 to 12 | EUR-Lex | local capture `raw/r13-eu-p2b-2019-1150-2026-09-05.html`, extracted to text |
| EDPB Guidelines 02/2025 on processing of personal data through blockchain technologies, version 2.0, adopted 07 July 2026 | https://www.edpb.europa.eu/system/files/2026-07/edpb_guidelines_202502_blockchain_v2_en.pdf | `raw/r15-edpb-blockchain-final-v2.pdf` |
| FCA Handbook COBS 4.12A, section last updated 23/10/2025, crypto provisions dated 08/10/2025 | https://www.handbook.fca.org.uk/handbook/COBS/4/12A.html | `raw/r15-fca-cobs-4-12A-2026-09-05.html` |
| 18 U.S.C. 2703 | https://www.law.cornell.edu/uscode/text/18/2703 | read live, not saved |

### Screening sources and their terms

| Source | URL |
|---|---|
| Chainalysis sanctions oracle documentation, addresses, ABI, disclaimer | https://go.chainalysis.com/chainalysis-oracle-docs.html |
| Chainalysis free screening API endpoint, probed live | https://public.chainalysis.com/api/v1/address/{address} |
| OpenSanctions licensing, "Creative Commons 4.0 Attribution NonCommercial" | https://www.opensanctions.org/licensing/ |
| PublicNode / Allnodes terms of service | https://www.publicnode.com/terms |

### On-chain verification artefacts

| Artefact | What it holds |
|---|---|
| `raw/r15-sdn-evm-bsc-screen-2026-09-05.json` | all 91 SDN EVM addresses with their `isSanctioned` result, nonce, BNB balance and code length on BSC. This is the file behind the 57-of-91, 42-active and 20-unflagged figures |
| `raw/r15-bnb-hackathon-2026-09-05.html` | the BNB Chain hackathon landing page, kept as the record that it carries no IP or licensing terms |
| Verified live with `cast` 1.7.1 over `https://bsc-rpc.publicnode.com`, chain id 56 | the sanctions oracle (code, `name`, `owner`, `isSanctioned`, gas), FDUSD and USD1 (`frozen`, `paused`, `owner`, implementation slot, PUSH4 enumeration), BSC-USD (PUSH4 enumeration, reverting blacklist calls), the ERC-8004 Identity Registry (implementation slot, PUSH4 enumeration, simulated `register`), Aave v3 Pool on BSC, Venus Unitroller and a nine-address control set through the oracle |
| Function selectors resolved against | https://api.openchain.xyz/signature-database/v1/lookup |

### Licence reads

`gh api repos/<owner>/<repo>/license` and `gh api orgs/pancakeswap/repos` for the SPDX identifiers,
`gh api repos/<owner>/<repo>/contents/<path>` for the licence and header text of
`aave-dao/aave-v3-origin`, `wevm/viem`, `pancakeswap/pancake-v3-contracts`, `pancakeswap/pancakeswap-ai`
and `pancakeswap/erc-8183-example`. `curl https://registry.npmjs.org/...` for `@altananetwork/sdk` and
`lucide-react`. Local captures `raw/eip-8004-2026-08-27.txt`, `raw/eip-8183-2026-08-27.txt`,
`raw/eip-3009-2026-08-27.txt`, `raw/erc-8004-contracts-README-2026-08-27.md`,
`raw/altana-sdk-staging-README.md`, `raw/8004scan-openapi-2026-09-05.json`,
`raw/termix-home-2026-09-05.txt` and `raw/termix-skill-1.5.0-SKILL-2026-09-05.md` for the clauses that
live in files rather than on pages.

### What I could not reach

`dorahacks.io` (AWS WAF, HTTP 405 with a human-verification page on every API path), the DMCCA 2024
Schedule 20 text on `legislation.gov.uk` (HTTP 202 with a zero-byte body on five attempts across three URL
forms), the OFAC SDN list landing page body (renders client-side, empty to a plain fetch),
`public.chainalysis.com/docs` (301 to a support site) and any TermiX or 8004scan terms page (404 or a
redirect stub). Each of those is recorded in "Unverified or open" with the claim it would have settled.











