# research: the index

Seventeen research passes, one census, one hand-run payment rail file and the spine
they all feed. Everything here was read or called on 2026-09-05 unless a line inside
the file says otherwise. Every file separates what was verified from what was not.

Three rules govern use.

**A constant originates in `SPINE.md`.** A document cites an address, a selector or a
typehash from there and cites the proof from `01-GROUND-TRUTH.md`. Nothing is
re-derived and nothing is stated from memory.

**`VERIFIED-payment-rail.md` outranks every research file on the rail**, because
every line of it was run by hand rather than by a research pass. Where a research
file goes further, the difference is labelled.

**A research file beats the first two passes.** Where this folder and
`../ARCHITECTURE.md`, `../ARCHITECTURE-PART-2.md` or `../ONBOARDING.md` disagree, the
measurement wins and the fork is written down in `../decisions/`.

| File | What it settles |
| --- | --- |
| `SPINE.md` | The internal contract every author reads first: the product name, one term per concept, the component and field names, every constant more than one document cites, the unverified list, one scope line per document |
| `VERIFIED-payment-rail.md` | Which BSC tokens can carry a one-signature transfer, which cannot and what decimals each one uses. Run by hand, so it outranks every file below it on that subject |
| `MEASUREMENT.md` | The census: the population from the registry's own counter, the 600-id uniform sample, the four-tier stranger-pays ladder, the whole-chain feedback sweep, then the command to reproduce every number |
| `R11-measurement.md` | A pointer page carrying the census figures a document author needs without opening the full file |
| `R01-erc8004.md` | The ERC-8004 surface on BSC to the byte. Every signature proven at its live address, writes simulated for their revert strings, events matched against real logs |
| `R02-erc8183.md` | The official hire rail: a live three-contract stack with 56,713 lifetime jobs, addresses shipped inside BNB Chain's own SDK plus what one full hire costs in calls |
| `R03-x402-b402.md` | The payment envelope. x402 v2 is current and the only production facilitator on BSC is handed out with merchant credentials, so the flow is written to the v2 envelope and shown against a facilitator we run |
| `R04-bsc-tokens.md` | Signature capability token by token, executed against a mainnet fork. Superseded on the ERC-1271 branch by a decision record |
| `R05-8004scan-api.md` | The index we enrich from: every endpoint that works, every one that fails, its lag and the composite score it publishes |
| `R06-altana.md` | The Altana gate read on chain. Session permissions live on the wallet's own delegated account, where the allowlist and the spend cap are free calls a judge can make without our help |
| `R07-termix.md` | The TermiX track, the only fully weighted rubric in the programme, the Agent Advantage Report it requires for eligibility and the rival already ahead of us on shape |
| `R08-pancakeswap.md` | The PancakeSwap agent surface, including three published numbers that are wrong and verifiable in one command each |

| `R09-bsc-defi.md` | Lending, health factor and yield on BSC, read on chain: what the big lender actually answers now and where an agent reading it goes wrong |
| `R10-bab-attestation.md` | Human verification. BABT costs one `balanceOf` to check and 1.0% of BSC agent owners hold one, so a hard seller gate deletes the supply. Gate the review write path instead |
| `R12-agent-comms.md` | How a listed agent is contacted: the two `.well-known` paths that get confused, who owns each and what neither has to do with x402 |
| `R13-prior-art.md` | Mechanisms that already survive a huge low-quality catalogue in production, quoted in runnable form rather than described |
| `R14-rivals.md` | The rival scan: 206 repositories created since 2026-07-15, how many serve a real page, the pitch eight of them already share and the gap none of them has closed |
| `R15-compliance.md` | Which design choices carry which exposure, with every legal text quoted from a primary source fetched into `raw/` |
| `R16-reuse.md` | What we already have working and can carry into this build, with every constant re-called on chain before it is reused |
| `R17-binance-agent-os.md` | Binance's own stack, which shipped the plumbing and skipped the shopfront, plus the live index of paid endpoints where every entry has taken money |

Two folders carry the evidence itself.

`raw/` holds what every claim above points at: contract source, ABIs, spec texts, API
responses, probe output and the fetched pages, each named with the date it was read.
A claim whose capture is not in here is unverified by definition.

`tools/` holds the scripts that produced the measured numbers. The census, the
sampler, the off-chain fetch, the probe pass, the analysis and the whole-chain
feedback sweep all re-run from there with no API key anywhere.

The 2026-08-27 captures stay too. `sample-400-tokenuris-2026-08-27.json` and
`census-bsc-2026-08-27.tsv` are that pass's own data, kept so its numbers can be
re-derived instead of argued about. Re-deriving them is how the corrections at the
top of `../README.md` were confirmed rather than assumed.

