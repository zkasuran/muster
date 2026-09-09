/**
 * The store. One SQLite file in WAL mode through Node's own `node:sqlite`, so there is no
 * third-party driver and no extra licence to quote. docs/15-SYSTEM.md section 2.1 settles
 * this against Postgres: 335k rows on one disk, in-process reads, no network hop on the
 * render path.
 *
 * `node:sqlite` is flagged experimental on Node 22 and prints a warning at load. That is a
 * stability note rather than a licence question, and it is recorded in the decision rather
 * than worked around.
 */
import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const DB_PATH = process.env.MUSTER_DB ?? '/var/lib/muster/muster.db'

let handle: DatabaseSync | null = null

/**
 * Every statement is here rather than scattered, so the constraints in
 * docs/15-SYSTEM.md section 2.3 are checked by the schema instead of by whoever remembers.
 */
const SCHEMA = `
PRAGMA journal_mode = wal;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = on;
PRAGMA synchronous = normal;

CREATE TABLE IF NOT EXISTS agent (
  chainId             INTEGER NOT NULL CHECK (chainId IN (56, 97)),
  agentId             TEXT    NOT NULL CHECK (agentId GLOB '0' OR agentId GLOB '[1-9]*'),
  owner               TEXT    NOT NULL,
  agentWallet         TEXT,
  tokenUri            TEXT    NOT NULL DEFAULT '',
  tokenUriHash        TEXT,
  name                TEXT,
  description         TEXT,
  endpoints           TEXT    NOT NULL DEFAULT '[]',
  skills              TEXT    NOT NULL DEFAULT '[]',
  serviceKinds        TEXT    NOT NULL DEFAULT '[]',
  -- The operator's own claims. Stored separately from anything we verified, because the
  -- whole point of the evidence ladder is that a declaration is not evidence.
  declaresX402        INTEGER NOT NULL DEFAULT 0 CHECK (declaresX402 IN (0, 1)),
  declaresActive      INTEGER NOT NULL DEFAULT 0 CHECK (declaresActive IN (0, 1)),
  trustModels         TEXT    NOT NULL DEFAULT '[]',
  registrationParsed  INTEGER NOT NULL DEFAULT 0 CHECK (registrationParsed IN (0, 1)),
  duplicateClusterId  TEXT,
  firstSeenBlock      INTEGER NOT NULL,
  lastSeenBlock       INTEGER NOT NULL,
  feedbackCount       INTEGER NOT NULL DEFAULT 0,
  updatedAt           INTEGER NOT NULL,
  PRIMARY KEY (chainId, agentId),
  CHECK (tokenUri = '' OR tokenUriHash IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS agent_hash    ON agent (tokenUriHash);
CREATE INDEX IF NOT EXISTS agent_owner   ON agent (owner);
CREATE INDEX IF NOT EXISTS agent_cluster ON agent (duplicateClusterId);
CREATE INDEX IF NOT EXISTS agent_seen    ON agent (lastSeenBlock);
CREATE INDEX IF NOT EXISTS agent_parsed  ON agent (registrationParsed);
CREATE INDEX IF NOT EXISTS agent_x402    ON agent (declaresX402);

CREATE TABLE IF NOT EXISTS listing (
  listingId       TEXT PRIMARY KEY,
  chainId         INTEGER NOT NULL,
  agentId         TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('rebalancing','grid-trading','yield','health-factor')),
  visibility      TEXT NOT NULL CHECK (visibility IN ('listed','indexed','hidden','suppressed')),
  lifecycleState  TEXT NOT NULL CHECK (lifecycleState IN ('candidate','probed','in_review','live','stale','delisted')),
  evidenceTier    TEXT NOT NULL CHECK (evidenceTier IN ('registered','declared','reachable','probed','payable','settled')),
  scoreValue      REAL,
  scoreConfidence REAL,
  priceBase       TEXT CHECK (priceBase IS NULL OR priceBase GLOB '[0-9]*'),
  priceToken      TEXT,
  priceDecimals   INTEGER,
  priceScheme     TEXT,
  payTo           TEXT,
  inBazaar        INTEGER NOT NULL DEFAULT 0 CHECK (inBazaar IN (0, 1)),
  bazaarResource  TEXT,
  lastProbeAt     INTEGER,
  lastProbeVerdict TEXT CHECK (lastProbeVerdict IS NULL OR lastProbeVerdict IN ('pass','fail','skip')),
  firstParty      INTEGER NOT NULL DEFAULT 0 CHECK (firstParty IN (0, 1)),
  updatedAt       INTEGER NOT NULL,
  -- One listing per agent per shelf. This is what stops one operator flooding a shelf
  -- with the same agent under four sub-capabilities.
  UNIQUE (chainId, agentId, category),
  -- A price is only meaningful with the decimals it was read against.
  CHECK (priceBase IS NULL OR (priceToken IS NOT NULL AND priceDecimals IS NOT NULL)),
  FOREIGN KEY (chainId, agentId) REFERENCES agent (chainId, agentId) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS listing_shelf   ON listing (category, visibility, evidenceTier);
CREATE INDEX IF NOT EXISTS listing_state   ON listing (lifecycleState);
CREATE INDEX IF NOT EXISTS listing_probe   ON listing (lastProbeAt);
CREATE INDEX IF NOT EXISTS listing_score   ON listing (category, scoreValue);
CREATE INDEX IF NOT EXISTS listing_agent   ON listing (chainId, agentId);

CREATE TABLE IF NOT EXISTS probeResult (
  probeId           TEXT PRIMARY KEY,
  listingId         TEXT,
  agentId           TEXT NOT NULL,
  url               TEXT NOT NULL,
  assertion         TEXT NOT NULL,
  verdict           TEXT NOT NULL CHECK (verdict IN ('pass','fail','skip')),
  failureClass      TEXT,
  httpStatus        INTEGER,
  sawPaymentRequired INTEGER NOT NULL DEFAULT 0 CHECK (sawPaymentRequired IN (0, 1)),
  tlsOk             INTEGER NOT NULL DEFAULT 0 CHECK (tlsOk IN (0, 1)),
  latencyMs         INTEGER,
  observedAt        INTEGER NOT NULL,
  prober            TEXT NOT NULL,
  note              TEXT,
  bodyExcerpt       TEXT,
  -- failureClass present on every fail and only on a fail.
  CHECK ((verdict = 'fail') = (failureClass IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS probe_listing ON probeResult (listingId, observedAt);
CREATE INDEX IF NOT EXISTS probe_verdict ON probeResult (assertion, verdict);
CREATE INDEX IF NOT EXISTS probe_agent   ON probeResult (agentId, observedAt);

CREATE TABLE IF NOT EXISTS run (
  runId       TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  startedAt   INTEGER NOT NULL,
  finishedAt  INTEGER,
  fromBlock   INTEGER,
  toBlock     INTEGER,
  itemsRead   INTEGER NOT NULL DEFAULT 0,
  itemsWritten INTEGER NOT NULL DEFAULT 0,
  errors      INTEGER NOT NULL DEFAULT 0,
  ok          INTEGER NOT NULL DEFAULT 0 CHECK (ok IN (0, 1)),
  note        TEXT
);
CREATE INDEX IF NOT EXISTS run_kind ON run (kind, startedAt);

CREATE TABLE IF NOT EXISTS sourceState (
  source        TEXT PRIMARY KEY,
  lastOkAt      INTEGER,
  lastErrorAt   INTEGER,
  lastError     TEXT,
  reportedCount INTEGER,
  observedAt    INTEGER
);

-- The B402 Bazaar payout addresses, so the intersection with the registry is a join rather
-- than a derived guess. Small: measured at 8 rows on 2026-09-06.
CREATE TABLE IF NOT EXISTS bazaarPayout (
  payTo         TEXT PRIMARY KEY,
  resourceCount INTEGER NOT NULL,
  sampleResource TEXT,
  observedAt    INTEGER NOT NULL
);

-- A hire attempt: a buyer signed a real EIP-712 authorization for one of our agents and the
-- signature recovered to the address it claims. Settlement is a separate step, so this row says
-- "signed and verified", never "paid". A count of these is a real number for the status page.
CREATE TABLE IF NOT EXISTS hireAttempt (
  attemptId     TEXT PRIMARY KEY,
  shelf         TEXT NOT NULL CHECK (shelf IN ('rebalancing','grid-trading','yield','health-factor')),
  signer        TEXT NOT NULL,
  payTo         TEXT NOT NULL,
  token         TEXT NOT NULL,
  amountBase    TEXT NOT NULL CHECK (amountBase GLOB '[0-9]*'),
  nonce         TEXT NOT NULL UNIQUE,
  validBefore   INTEGER NOT NULL,
  signatureHash TEXT NOT NULL,
  signerBalance TEXT,
  settled       INTEGER NOT NULL DEFAULT 0 CHECK (settled IN (0, 1)),
  settleTx      TEXT,
  createdAt     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS hire_shelf ON hireAttempt (shelf, createdAt);

-- Key/value for sweep resume points and boot assertions. Small on purpose.
CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- [doc 08] The money ledger. Append-only and hash-chained: every row carries the previous
-- row's entryHash, the origin tag (house or order), the event kind and the payload hash, so a
-- reader can walk the chain and recompute every link. seq is explicit rather than autoincrement
-- because the entryHash is computed over it before the insert. refKey is the natural dedup key
-- (hireAttempt:<id> or settlement:<id>) so a projection from hireAttempt appends each event once.
-- origin is CHECK-constrained here, which is what "enforced at append time" means: an unknown
-- value cannot be written rather than being caught later by the walk.
CREATE TABLE IF NOT EXISTS ledgerEntry (
  seq          INTEGER PRIMARY KEY,
  ts           INTEGER NOT NULL,
  origin       TEXT NOT NULL CHECK (origin IN ('house','order')),
  kind         TEXT NOT NULL CHECK (kind IN ('hireAttempt','settlement')),
  refKey       TEXT NOT NULL UNIQUE,
  payload      TEXT NOT NULL,
  payloadHash  TEXT NOT NULL,
  prevHash     TEXT NOT NULL,
  entryHash    TEXT NOT NULL,
  backfilled   INTEGER NOT NULL DEFAULT 0 CHECK (backfilled IN (0, 1)),
  backfilledAt INTEGER
);
CREATE INDEX IF NOT EXISTS ledger_kind ON ledgerEntry (kind, seq);

-- [doc 04] A protocol job for a first-party agent's poll shape. The synchronous paid path is
-- unchanged; this is the additive shape B baseline docs/04-AGENT-PROTOCOL.md section 4 makes
-- required (polling with a job id). state and terminalState use the lifecycle names in section 3.
-- Only a completed job carries a result and a responseHash under the declared keccakCanonical
-- rule. requestHash is the canonical hash of the request the payment authorised, so a settled
-- payment can be tied to what it bought.
CREATE TABLE IF NOT EXISTS agentJob (
  jobId           TEXT PRIMARY KEY,
  shelf           TEXT NOT NULL CHECK (shelf IN ('rebalancing','grid-trading','yield','health-factor')),
  skillId         TEXT NOT NULL,
  state           TEXT NOT NULL CHECK (state IN ('quoted','paid','working','completed','refused','failed','cancelled','expired','voided','lapsed')),
  terminalState   TEXT CHECK (terminalState IS NULL OR terminalState IN ('completed','refused','failed','cancelled','expired','voided','lapsed')),
  requestHash     TEXT NOT NULL,
  result          TEXT,
  responseHash    TEXT,
  deliverableRule TEXT,
  refusalCode     TEXT,
  chargedBase     TEXT,
  paymentTx       TEXT,
  paymentState    TEXT,
  inputsAsOfBlock INTEGER,
  createdAt       INTEGER NOT NULL,
  computedAt      INTEGER,
  expiresAt       INTEGER NOT NULL,
  -- Only completed carries a result and its hash. A refusal carries a code, never a result.
  CHECK ((state = 'completed') = (responseHash IS NOT NULL)),
  CHECK (refusalCode IS NULL OR state = 'refused')
);
CREATE INDEX IF NOT EXISTS agentjob_shelf ON agentJob (shelf, createdAt);
`

export function db(): DatabaseSync {
  if (handle) return handle
  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  handle = new DatabaseSync(DB_PATH)
  handle.exec(SCHEMA)
  // Additive migration for stores created before the column existed. Idempotent.
  const cols = (handle.prepare('PRAGMA table_info(probeResult)').all() as { name: string }[]).map((c) => c.name)
  if (!cols.includes('bodyExcerpt')) handle.exec('ALTER TABLE probeResult ADD COLUMN bodyExcerpt TEXT')
  return handle
}

/** Applying twice must be a no-op. That is the gate on this file. */
export function migrate(): { journalMode: string; tables: string[] } {
  const d = db()
  d.exec(SCHEMA)
  const journalMode = String(
    (d.prepare('PRAGMA journal_mode').get() as Record<string, unknown>)['journal_mode'],
  )
  const tables = (
    d.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {
      name: string
    }[]
  ).map((r) => r.name)
  return { journalMode, tables }
}

export function getMeta(k: string): string | null {
  const row = db().prepare('SELECT v FROM meta WHERE k = ?').get(k) as { v: string } | undefined
  return row ? row.v : null
}

export function setMeta(k: string, v: string): void {
  db()
    .prepare(
      'INSERT INTO meta (k, v, updatedAt) VALUES (?, ?, ?) ' +
        'ON CONFLICT(k) DO UPDATE SET v = excluded.v, updatedAt = excluded.updatedAt',
    )
    .run(k, v, Date.now())
}

/** One write path per table, so a batch is one transaction rather than N. */
export function tx<T>(fn: () => T): T {
  const d = db()
  d.exec('BEGIN')
  try {
    const out = fn()
    d.exec('COMMIT')
    return out
  } catch (e) {
    d.exec('ROLLBACK')
    throw e
  }
}

export function close(): void {
  if (handle) {
    handle.close()
    handle = null
  }
}
