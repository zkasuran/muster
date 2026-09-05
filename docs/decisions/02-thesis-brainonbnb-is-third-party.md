# Decision: the brainonbnb.com cluster is third-party supply, not ours

Settled 2026-09-05 for `02-THESIS.md` sections 3, 9 and 10.

## The conflict

Two research files disagree about who owns ERC-8004 agents 302257, 302258, 304493, 304494 and 310460
on BSC.

* `research/R12-agent-comms.md:99` calls them "all `brainonbnb.com`, our own domain from an earlier
  lane" inside a parenthetical.
* `research/R02-erc8183.md:66` calls the same cluster "Rival 2 (Brain on BNB)" and records its owner
  address.

`research/SPINE.md` does not settle it, so it is settled here. The first pass of `02-THESIS.md` adopted
R02 silently, which is the defect this file closes.

## What settled it

The owner is `0x73809F69916FcF7Ddc5BB1315fBdf96A569a5963` and it is not an address we control.

1. **No key material.** Neither `work/bnb-era` nor `work/bnb-build-era` holds an `.env`, a keystore, a
   passphrase or any signer file. `~/.foundry/keystores` does not exist. Nothing in this workspace can
   sign for that address, so nothing in this workspace registered those agents.
2. **The earlier lane is a read-only indexer.** `work/bnb-era/touchstone` is two commits, remote
   `zkasuran/touchstone`, with `src/` and `scripts/` that read the registry plus the ERC-8183 kernel and
   no write path, no deployment target and no domain. The address appears once in
   `data/jobs-bsc.json` as a provider row produced by indexing the kernel, which is evidence of
   indexing a third party rather than of owning one.
3. **The house records are silent.** `participations.md` records every submission and `CONTENT-LOG.md`
   records every published artifact. Neither carries brainonbnb.com, Brain Plaza or `$BOBAI`.
   `research/R16-reuse.md`, whose whole job is to inventory our prior builds, names only
   `work/bnb-era/touchstone`.
4. **The site sells a token we have never shipped.** `https://brainonbnb.com/.well-known/agent-registration.json`
   (HTTP 200, 1,264 B, fetched 2026-09-05) names the agent "Brain On BNB AI ($BOBAI)", a meme token
   with a 3% trade tax and a Four.Meme fair launch. `https://brainonbnb.com/registry` carries a
   "Buy $BOBAI" nav item. No token, no points and no airdrop is a standing position for this entry.
5. **The domain proof does not match the chain on one id.** The proof claims six ids: 49467, 302257,
   302258, 304493, 304494 and 310460. `ownerOf` on `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` returns
   `0x73809F69916FcF7Ddc5BB1315fBdf96A569a5963` for five of them and
   `0x15Ba17075ef5E0736292b030e3715d9100fe3d38` for 49467, read 2026-09-05 over
   `https://bsc-rpc.publicnode.com`. So the cluster is five ids under one owner, not six. A
   consumer of that proof has to owner-match per id rather than trust the list.

## Consequences

* R02 is right, R12:99 is wrong. `02-THESIS.md` names the conflict in section 9 rather than resolving
  it silently, without moving those ids into first-party supply.
* Section 3's "3 of those 5 belong to one operator" stands. That operator is a third party. Read
  live: 302257, 302258 and 304493 return the owner above, while 7612 returns
  `0xb273616670037C0870E9835B3FFBE68f58de68B0` and 705 returns
  `0x1be93C700dDC596D701E8F2106B8F9166C625Adb`. `R05-8004scan-api.md:988` says four of the five share
  an operator, which the chain contradicts.
* Because the cluster is third-party, `brainonbnb.com/registry` is a rival product and the absence
  claims in `02-THESIS.md` that rested on `R16-reuse.md:18` ("indexed by nobody else") had to be cut or
  scoped. R14's rival census is a GitHub repo query plus a probe of the URLs those repos publish, so a
  live product with no public repo is invisible to it. The pre-submit rival check now runs over live
  sites too.
* Corrections owed to the evidence base, so the claim cannot be inherited again: annotate R12:99 and
  R16:18 with this decision.
