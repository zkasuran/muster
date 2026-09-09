# Data sources and third-party inputs

Every input the shipped code reads, with the sentence that grants the use, quoted from the source
and dated. Absence of terms is not permission, so an input with no quotable grant is listed as such
with the decision that follows. Packages bundled into the build are in `NOTICE`. The reasoning
behind each decision is in `docs/10-DOCS-AND-POLICY.md`.

## Chain reads over JSON-RPC

Contract state on BNB Smart Chain (the ERC-8004 Identity and Reputation Registries, USD1, Venus,
PancakeSwap v3 pools, Multicall3) is public chain state read over ABIs we declare ourselves. No
grant is needed for the state. The grant that matters is the endpoint's.

| Endpoint | Used for | Quoted grant or restriction | Read on |
| --- | --- | --- | --- |
| `bsc-dataseed.bnbchain.org`, `bsc-dataseed-public.bnbchain.org`, `bsc-dataseed.defibit.io`, `bsc-dataseed.ninicoin.io` | the registry sweep, the feedback sweep, every bulk multicall (`lib/rpc.ts` `BULK_ENDPOINTS`) | BNB Chain developer documentation, JSON-RPC endpoint page: "BNB Chain provides several RPC endpoints for connecting to both its Mainnet and Testnet. In this section, we list the JSON-RPC endpoints that can be used for connecting to BNB Smart Chain." and "The rate limit of BSC endpoint on Testnet and Mainnet is 10K/5min." The sweep paces itself under that limit (`BULK_MIN_GAP_MS`). | 2026-09-09, `docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/` |
| `bsc-rpc.publicnode.com`, operated by Allnodes Inc. | single interactive reads only: a page render, a balance check, a hire verification (`READ_ENDPOINTS`) | PublicNode Terms of Service: "you are hereby granted a non-exclusive, limited, non-transferable, freely revocable license to access and use the Service", where the Service "allows you to connect to blockchains through RPC". Restriction honoured: "you will not engage in or use any data mining, robots, scraping, or similar data gathering or extraction methods." So it never carries a sweep. | 2026-09-09, `publicnode.com/terms` |

The split is enforced in code rather than by habit: `withRpc(fn, { bulk: true })` can only reach the
BNB Chain endpoints. The sweep and feedback workers pass that flag.

## HTTP reads

| Source | Used for | Quoted grant or what is missing | Read on |
| --- | --- | --- | --- |
| B402 Bazaar, `GET /bazaar/resources` and `/bazaar/merchant`, operated by Binance | the join between ERC-8004 identities and payout addresses that have settled a payment (`lib/bazaar.ts`) | Answers unauthenticated and is documented as the public discovery layer for B402 sellers. No terms page is attached to the Bazaar endpoints and none could be quoted. Decision: read it, count it, never redistribute it in bulk. The site shows counts and the single joined agent, not the catalogue. | 2026-09-05 |
| Declared agent endpoints, one HTTPS request per host per probe cycle | the reachable, probed and payable rungs (`worker/probe.ts`) | Each endpoint is published by its operator in a registration record on a public registry, which is an invitation to call it. The probe sends one GET, follows no redirect, reads at most 4 KB of body, identifies itself as `muster-probe` and refuses any host resolving to a private, loopback, link-local, multicast or NAT64 address. | ongoing |

## Fonts, self-hosted by `next/font`

| Font | Licence | Quoted grant | Copyright line |
| --- | --- | --- | --- |
| Instrument Serif | SIL Open Font License 1.1 | "Permission is hereby granted, free of charge, to any person obtaining a copy of the Font Software, to use, study, copy, merge, embed, modify, redistribute, and sell modified and unmodified copies of the Font Software, subject to the following conditions" | Copyright 2022 The Instrument Serif Project Authors (https://github.com/Instrument/instrument-serif) |
| Geist, Geist Mono | SIL Open Font License 1.1 | same clause | Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git) |

OFL condition 2 asks that each copy carry the copyright notice and the licence, so the three licence
files ship at `public/licenses/`, reachable on the live site.

## Not used, on purpose

| Input | Why it is not on the shipped path |
| --- | --- |
| 8004scan API | no `termsOfService`, no `license` in its OpenAPI document and its legal paths 404 or redirect to a stub. Nothing on the site is sourced from it. The status page shows the cross-check as not done rather than borrowing a number. |
| Binance B402 verify and settle | needs a merchant developer account granted on request. Until one exists Muster verifies EIP-3009 signatures itself and settles from its own key (`lib/settle.ts`). The code path for B402 is present and unused. |
| OpenSanctions | CC BY-NC 4.0, which a marketplace cannot use. Not in the tree. |
| Any vendored Solidity from PancakeSwap or Aave | GPL and BUSL respectively. Contracts are read over declared ABIs, no source is copied. |
