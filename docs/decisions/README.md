# decisions: one file per material decision

Every fork this pass settled, one file each. Two shapes, because the records were written for two jobs.

**Extraction records** are read off the sixteen documents plus the three settled before any document
existed. Each carries the decision, the alternative that was rejected, why it went that way, which
documents it binds plus what would make us revisit it.

**Conflict records** were written while two sources here disagreed, so each carries the conflict as both
sides stated it, the evidence that settled it, the decision, the alternative rejected plus what changed
downstream. Fourteen of the rows below are these.

Three rules across both. A record is written as the fork is settled rather than at the end, so the document
that made the call cites it in place. A record names what it disagrees with, because a disagreement nobody
can locate is not settled. Where a record and a document disagree, the record wins plus the document is
wrong until it is edited.

The `00-` records were settled before any document existed, so all sixteen documents inherit them.

| File | The decision | What was rejected |
| --- | --- | --- |
| `00-close-read-as-midnight-utc.md` | The build close is read as 2026-09-09 00:00 UTC, everything green before 2026-09-08 ends | Reading the published date as the end of that day, which buys 24 hours |
| `00-no-rubric-weighting-is-assumed.md` | No document states, implies or designs against a weighting of the three main criteria | Guessing a split then optimising for it |
| `00-payment-rail-is-not-usdt.md` | One-signature payment on BSC is EIP-3009 on `$U` or USD1. USDT is not the rail | Pricing in USDT because buyers hold it. Waiting for a hosted facilitator that covers chain 56 |
| `00-third-pass-starts-from-measurement.md` | Measure the population first, then design. No population fact without the command that produced it | Writing the architecture from the programme page plus the standard, which is what passes one and two did |
| `00-three-supersedes-earlier-passes.md` | `three/` wins over the two earlier passes wherever they disagree | Patching the earlier passes in place. Treating all three as equally live |
| `01-ground-truth-re-read-the-moving-numbers.md` | Four numbers are re-read on submit day plus three more re-checked, each cited with block plus timestamp | Freezing the measured set at the research date |
| `02-thesis-brainonbnb-is-third-party.md` | A five-agent cluster on one domain is third-party supply, decided on the owner address | Counting it as ours because a research note called it ours |
| `02-thesis-first-party-supply-one-per-category.md` | Four reference agents, one per category, with the first-party label derived from the owner address | No first-party supply at all. A stored `firstParty` flag |
| `02-thesis-hireable-bar-and-annotated-failures.md` | Six assertions gate a shelf row, H6 being a settled job. Failures stay indexed with the failure named | Gating on conformance plus reachability only. Hiding the failures or mixing them into the shelf |
| `02-thesis-rival-agents-are-listed-and-hired.md` | Other teams' agents are listed, ranked by the same formula then hired at their published price | Excluding programme rivals from the shelves |
| `02-thesis-the-name-is-muster.md` | The product is Muster | A descriptive name in the `bnb-agent-marketplace` shape, which fourteen rival repositories already hold |
| `02-thesis-unit-is-a-completed-paid-job.md` | The unit is a settled paid job. Settled turnover per category is the headline with the agent count as the denominator | Reachability as the unit. Leading with the agent count |
| `03-taxonomy-a-category-is-a-contract.md` | Each category is a published contract document with named inputs, outputs, units plus a hash | A tag or a closed enum with prose descriptions |
| `03-taxonomy-collapse-duplicates-and-cap-operators.md` | Duplicates collapse on three keys, one shelved row per operator per shelf, four live listings per owner | Dedupe by owner, name or hash alone. No cap at all. Cluster-wide suspension |
| `03-taxonomy-contracts-frozen-through-judging.md` | No breaking contract change from 2026-09-09 to 2026-09-23. A slug is retired rather than reused | Shipping improvements as they land. Reusing a slug when a category evolves |
| `03-taxonomy-coverage-page-splits-from-report.md` | The coverage proof gets `/coverage`. `/report` stays the Agent Advantage Report | One route serving both, which two documents had assumed |
| `03-taxonomy-e0-shelf-visibility.md` | A conforming E0 row that reached T2 inside the window renders in the Listed band with the hire button off | Restricting the shelf to E2, as the ladder's Unlocks column reads literally |
| `03-taxonomy-evidence-outranks-declaration.md` | Evidence decides placement, the declaration decides what was promised. Text-only never reaches a shelf | Trusting the declaration. Ignoring it. A confidence chip on an unprobed row |
| `03-taxonomy-four-roots-no-fifth-tab.md` | Four roots, three sub-capabilities each, no fifth tab before the close | A fifth shelf for the long tail. An unbalanced sub-capability tree |
| `03-taxonomy-freshness-triple-and-unknown-states.md` | Every number carries block, timestamp plus source. A missing value is one of six named states | One page-level stamp. A dash or a zero for a missing value |
| `03-taxonomy-grammar-not-semantic-search.md` | A published operator grammar plus a versioned synonym table. Six broad terms refused as synonyms | Semantic search. Fuzzy name matching. Generous synonyms to fill thin shelves |
| `04-protocol-card-is-a-plain-document-pinned-by-hash.md` | The card is a plain HTTPS document in `services[]`, pinned by hash, with one canonicalisation behind three hashes | A new well-known path of ours. A signed card. A per-purpose hash rule |
| `04-protocol-direct-hire-is-supported-and-attributed.md` | A buyer may hire an agent directly, recorded at four attribution levels | Requiring every hire to pass through the broker |
| `04-protocol-paid-probes-run-on-mainnet.md` | Payment assertions settle real mainnet money as house spend. A skipped probe is neither pass nor fail | A sandbox or testnet-only conformance path. Folding `skip` into `pass` |
| `04-protocol-polling-is-the-required-shape.md` | Polling is required, webhooks plus streams are declared options, `inputRequired` is a flag rather than a state | A mandatory webhook. An MCP-only long job. A separate input-required state |
| `05-onboarding-a-human-approves-every-listing.md` | A person reviews every listing, with queue depth plus median time published. `stale` is automatic | Auto-approving anything that passes the gates. Suspending on a lapsed probe |
| `05-onboarding-a-wallet-signature-is-the-whole-account.md` | A signature is the whole account. The payout address is read from chain | An account system with email plus recovery. An operator-supplied payout field |
| `05-onboarding-babt-is-a-tier-never-a-gate.md` | BABT is one read behind E3, never a gate, with nothing stored | Requiring a BABT to list. BABT alone inside E3. Caching the verified bit |
| `05-onboarding-endpoint-domain-proof-is-not-a-gate.md` | The well-known domain proof is a badge plus the only accepted non-owner claim proof | Keeping it as a hard go-live gate, which the prior pass had |
| `05-onboarding-muster-never-calls-register.md` | We never mint an `agentId`, so registration stays the operator's own step | Minting inside the product to shorten the funnel |
| `05-onboarding-operatorbond-not-deployed.md` | No bond is deployed on any chain. `OperatorBond` is a specification, under that one name | Deploying on chain 97 so the surface is demonstrable |
| `05-onboarding-the-e1-bond-holds-no-stake-of-ours.md` | No stake sits in an escrow of ours at any date. E1 ships as published terms | A bond in Muster's own escrow. An unsubmitted authorisation held as collateral |
| `06-quality-a-per-buyer-cap-is-the-wash-defence.md` | `C = 3` per buyer, a truncating 25 percent payer share cap, flagged rows kept at zero weight | Funding-provenance detection as the primary defence. A price floor. Deleting flagged rows |
| `06-quality-only-a-brokered-settled-job-counts.md` | A job scores only with our quote id, a settled payment plus `origin = order` | Counting ERC-8004 feedback. Counting escrow jobs we did not broker |
| `06-quality-our-own-validator-at-zero-weight.md` | We request plus answer a validation on our own listings, labelled, at zero weight | No validation at all. Presenting the badge as third-party validation |
| `06-quality-publish-every-constant-and-recompute.md` | Every constant, coefficient plus weight is published from one file the code reads | Withholding the weights, which the transparency carve-out permits. Gating the export |
| `06-quality-two-numbers-never-a-composite.md` | Delivery plus one category metric, never blended, never pooled across an agent's categories | A composite score. A five-star average. Agent-level pooling |
| `07-matching-dispatch-is-a-banded-draw.md` | Dispatch is a weighted draw inside `delta = 0.05`. The shelf order is a different function | Deterministic argmax. An unbanded lottery. One function driving both surfaces |
| `07-matching-exploration-slot-and-house-runs.md` | One shelf slot, `epsilon = 0.10` of counted dispatches, house runs in all four categories | A percentage of impressions. Epsilon at 0.01. House runs in two categories only |
| `07-matching-failover-pays-at-most-once.md` | One intent, at most one charge. A settled leg that failed becomes a dispute with a free re-run | Automatic re-dispatch after settlement. A refund-intent record. Re-pointing a funded job |
| `07-matching-no-bandit-in-v1.md` | No bandit plus no auction in v1, counters shipping from job one, the switch condition published | Thompson sampling now. A sealed-bid auction as the v1 selector |
| `07-matching-ties-break-against-our-own-agents.md` | A tie goes to the third party. No payment ever moves position | Strict neutrality on ties. A disclosed paid boost. Priced exclusivity |
| `08-money-erc1271-branch-supersedes-r04.md` | Verify branches on `eth_getCode(from)`, so a smart-account buyer can pay | `ecrecover` only on all three tokens, which the research file reported |
| `08-money-no-own-escrow.md` | Escrow rides the official ERC-8183 stack, so no key of ours can move a buyer's money | Our own escrow contract, which the first two passes designed |
| `08-money-no-success-fee.md` | Per-job pricing only. No outcome fee in any category | A performance fee on the outcome |
| `08-money-the-fee-is-a-second-authorisation.md` | The fee is a second buyer-signed authorisation, additive plus disclosed before signing | A splitter contract. Deducting from the operator's proceeds. A launch-window zero |
| `08-money-the-settler-settles-anybodys-job.md` | `settle` is called for any job whose window elapsed, under a published per-run cap | Settling only our own jobs |
| `08-money-transfer-with-authorization-not-receive.md` | `transferWithAuthorization` straight to the agent wallet, with the open submission window accepted | `receiveWithAuthorization` into a contract of ours, which the authoritative file prefers |
| `08-money-u-first-over-usd1.md` | `$U` leads `accepts[]` with USD1 beside it in the same challenge | USD1 first, which the authoritative file recommends plus live supply favours |
| `08-money-usdt-over-permit2-is-a-second-rail.md` | USDT plus Binance-Peg USDC ship over Permit2, labelled, never the default | Making USDT the default. Not shipping it. Shipping it with no verify table |
| `09-disputes-a-machine-suspends-a-human-delists.md` | A machine may suspend plus block payment. Only a human confirms a delisting | Automatic delisting on a detection. An emergency refund button |
| `09-disputes-four-output-shapes-not-a-disclaimer.md` | Four declarable output shapes, each with its own assertion on the delivery path | A blanket disclaimer. A CI grep over agent output. One posture per card |
| `09-disputes-no-dispute-press-on-the-escrow-rail.md` | We never press `dispute` on chain plus we say so. The buyer gets a sealed bundle | Presenting the on-chain dispute as ours, which is a button that reverts |
| `09-disputes-only-decidable-claims-are-disputable.md` | Only claims decidable from captured bytes are disputable, with the rest named before the hire | A general satisfaction dispute in the consumer-marketplace style |
| `09-disputes-the-credit-is-a-fee-waiver.md` | A credit is a waiver against our own fee, with every remedy naming its funder | A spendable in-venue balance. A discretionary goodwill payment |
| `09-disputes-tier-0-opens-the-dispute-itself.md` | Where a deterministic check failed the dispute opens itself. Operator silence decides against them | Waiting for a complaint. Symmetric escalation on silence. Deciding ties for the buyer |
| `10-docs-ai-disclosed-with-no-requirement.md` | AI assistance is disclosed in the submission plus the README although no rule requires it | Waiting to read terms that sit behind a WAF |
| `10-docs-nine-documents-each-binding-a-party.md` | Nine documents, a signed operator acceptance, a 30-day obligation notice, a separate policy log | One terms page. A 14-day notice. Delisting on non-acceptance |
| `10-docs-no-copyleft-and-no-aave-in-the-tree.md` | No Aave source, health factor on Venus, no GPL Solidity plus no copyleft package in the entry tree | Vendoring Aave v3 under BUSL-1.1. Copying pool maths. Importing the vendor's GPL package |
| `10-docs-the-licence-split.md` | Entry parts source-available with no derivatives, the kit Apache-2.0, reference agents relicensed 2026-09-24 | MIT or Apache across everything. SAND on everything. Pre-licensing for adoption |
| `10-docs-the-real-against-staged-table.md` | A four-status real-against-staged table above the fold, where a status only moves down without a build | A capabilities page with a caveats footnote |
| `10-docs-validation-registry-status.md` | The Validation Registry row reads `unexercised` until the pair is written, with the hedge attached either way | Publishing it as `live` with the first-use claim in a neighbouring row |
| `11-bnb-stack-decimals-read-at-runtime.md` | `decimals()` is read per token per chain plus asserted, so a mismatch fails the boot | A constants table, which is what most reference implementations use |
| `11-bnb-stack-greenfield-not-store-of-record.md` | Greenfield is not the store of record plus the bounded mirror is not scheduled | Making it the primary evidence store. IPFS or Arweave instead |
| `11-bnb-stack-mainnet-is-the-only-listing-source.md` | Every listing is a mainnet agent. Chain 97 carries one labelled artifact | Filling shelves from chain 97. Treating testnet as where awkward work runs |
| `11-bnb-stack-opbnb-is-not-used.md` | Nothing runs on chain 204, with the codesize reads published | Hosting settlement, the audit stream or a metering feed there |
| `11-bnb-stack-studio-cli-is-a-tool-not-a-dependency.md` | We point at the `bag` CLI. The product does not sit on Studio runtimes | Building Muster on `bag deploy` plus the Studio runtimes |
| `11-bnb-stack-venus-oracle-is-the-usd-mark.md` | The USD mark is the Venus oracle at a pinned block, with the ticker as a labelled cross-check | Binance Oracle's registry. The spot ticker as primary. Counting one oracle twice |
| `12-binance-mini-hackathon.md` | Entering the adjacent Binance programme is a submission-level call that changes no build step | Treating it as a build decision |
| `12-binance-no-exchange-credential-in-the-product.md` | No exchange API key anywhere. A listing that asks a buyer for one fails a hard gate | An optional exchange connection for buyers who already hold an account |
| `12-binance-no-exchange-market-data.md` | No exchange klines or spot prices ship. Longer windows come from our own sampled series | Klines plus spot for a USD denominator. A swap venue's explorer REST |
| `12-binance-our-own-facilitator-b402-behind-it.md` | Our facilitator settles every demonstrated hire, B402 sits behind the same interface, applications filed day one | Building the hire path on B402. Skipping the applications. Treating the first settle failure as final |
| `12-binance-read-bazaar-never-duplicate-it.md` | The Bazaar is a cross-check plus a join, with its ceiling printed beside it | Presenting its 979 endpoints as marketplace inventory |
| `12-binance-the-b402-token-list-is-the-constraint.md` | A live `/supported` response decides what a B402 hire is priced in, cached rather than pinned | Pricing a B402 hire in FDUSD on the strength of our own on-chain read |
| `13-partners-altana-on-mainnet.md` | Four wallets, one session each, mainnet Keystore, revocable in the product. No buyer needs an Altana wallet | A testnet-only demonstration. Making the buyer-side grant the hire path |
| `13-partners-altlayer-posture.md` | The chain is primary, the sponsor index is a credited cross-check, AltLLM leaves the compare path | 8004scan as the index of record, which an earlier pass designed |
| `13-partners-endpoint-verified-count.md` | The endpoint-verified count is 5, three of them one operator's, with the split travelling with the number | Three files carrying three shapes of the same count |
| `13-partners-no-termix-listing-before-the-close.md` | We do not list our own agents on the partner venue before 2026-09-09 | Listing on both venues, which their own research recommends |
| `13-partners-one-run-per-arm-and-a-published-loss.md` | One run per arm, two blind graders, the lower value published, one loss in the headline | Best-of-N on either arm. Averaging the graders. Reporting only the wins |
| `13-partners-the-report-is-a-recomputable-directory.md` | The report is a directory with a recompute script plus the stored call set, filed as a URL and a file | A PDF, which is what most entries will attach |
| `13-partners-three-tasks-two-control-arms.md` | Three paired tasks pinned to a block, each with two control arms | Promising five pairs. The single control their specification requires |
| `14-gaps-evidence-attaches-to-a-revision.md` | Evidence attaches to a revision keyed on content hashes | One running count per `agentId`. Trusting a declared version |
| `14-gaps-four-verdicts-with-refused-first-class.md` | Thirty-five areas, four verdicts, Refused as a real outcome, a minimum version each | A backlog with priorities |
| `14-gaps-no-admin-console.md` | No admin web surface. Five CLI verbs, each taking a mandatory reason | A protected admin route in the web application |
| `14-gaps-no-agent-controlled-markup-or-images.md` | Text nodes only, no markdown, no agent-controlled image, no model in the render path | Rendering markdown. Proxying avatars through our own signed proxy |
| `14-gaps-no-sla-no-insurance-no-incentives.md` | No SLA, no insurance, no referral reward, no points, no paid placement | An availability target in the terms. A coverage pool. Paying whoever routed a hire |
| `14-gaps-notifications-and-i18n-ship-thin.md` | Split per mechanism: the pull half ships, push is next, the unit discipline ships, locales do not | Two documents asserting opposite things about the same two areas |
| `15-system-fourteen-unattended-days.md` | A static fallback reading `unknown`, a nightly signed dump, an outside canary, drift that self-clears | Serving the last known-good page. Trusting one process for fourteen days. Our own canary |
| `15-system-no-solidity-ships.md` | No contract of ours is deployed on any chain | Our own escrow. A deployed bond. A custom hook plus evaluator |
| `15-system-node-22-one-sqlite-one-machine.md` | Node 22, one SQLite file in WAL mode, one machine, server-rendered HTML asserted without a browser | Postgres or Redis beside it. Bun. Python. Serverless. A browser driver. A client-side app |
| `15-system-one-egress-client.md` | One egress client checks every resolved address, connects to the address it checked plus never redirects | A runtime's own `is_global` check. Validating a name then connecting by name |
| `15-system-one-process-holds-every-key.md` | All three keys plus the ledger append live in one process behind a unix socket | The relayer key inside the web server. Appending from `web` or `worker` |
| `15-system-stored-model-requests-delivered.md` | 15-SYSTEM lists every stored field its siblings asked for, one name each | Leaving eight requested fields plus one collection unlisted |
| `15-system-the-chain-is-the-primary-index.md` | The chain is the primary index. A foreign index is a cross-check with its lag on screen | 8004scan as primary with a log backfill as fallback, which passes one and two designed |
| `15-system-the-cut-list-is-fixed-now.md` | The cut list is fixed now plus cut from the bottom up, with the demo path protected | Deciding what to drop when the time runs out |

Ninety-five records. The `00-` five bind everything downstream. The rest are owned by the document their
number names, which is the document that has to cite the record where the decision shows up.
