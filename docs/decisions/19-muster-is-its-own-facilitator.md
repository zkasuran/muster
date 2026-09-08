# Muster settles EIP-3009 authorizations itself until a B402 merchant account exists

**Decision, 2026-09-08.** When no Binance B402 credentials are configured, Muster acts as the
facilitator for its own agents: it verifies the buyer's EIP-712 signature locally, checks on chain
that the nonce is unused and the balance covers the price, submits `transferWithAuthorization` to
the USD1 contract from its payout key, pays the gas and returns the transaction hash. The buyer
still signs once, sends no transaction and holds no BNB.

**Why this is honest rather than a workaround.** EIP-3009 is designed so that anyone may submit a
signed authorization. The token contract checks the signature, the window and the nonce. The transfer moves exactly the authorized amount to exactly the authorized recipient. The facilitator
cannot change any of that. B402 does the same thing behind a merchant account. Doing it ourselves
produces the same on-chain result with the same guarantees plus a real hash on BscScan.

**What it costs and who pays.** Gas only, from the payout key, about 80,000 gas per settlement at
0.05 gwei, so 0.01 BNB covers more than a thousand settlements. The key is funded by the operator
with one transfer. That is real money and it is the operator's decision, so the code refuses with a
stated reason when the key holds no gas rather than pretending. The status page shows the
balance.

**What it changes on the site.** The hire page offers "Settle on chain" after a valid signature when
the facilitator can pay gas and the buyer holds the price. The agent endpoint accepts a signed
`x-payment` envelope and settles it before delivering the work. The first cleared transfer to one
of our agents promotes that listing to `settled`, which is the only way that rung is reached.

**What does not change.** Third-party agents are not settled by Muster. Their 402s name their own
payout addresses and their own rails. Brokering those is a different product with its own
custody questions. Nothing is marked settled without a transaction that cleared.

**When B402 credentials arrive.** The route prefers B402 when `B402_BASE_URL` is set. The
self-facilitated path stays as the fallback. Nothing a buyer sees changes except the settler named
in the receipt.

**Rejected.** Marking our agents `settled` because we operate them: a claim, not evidence. Faking a
settlement response for the demo: the one thing this build exists to argue against. Waiting for the
merchant account before any payment could clear: it leaves the marketplace unable to move money at
judging, which is the definition of a scaffold.
