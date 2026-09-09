/**
 * The job resource behind the poll shape, docs/04-AGENT-PROTOCOL.md sections 3 and 4.
 *
 * The synchronous paid path in app/api/agent/[shelf]/route.ts is unchanged. This adds the shape B
 * baseline the document makes required: a create returns a job id and a free poll returns the job's
 * state and, once terminal, the deliverable with the hash that recomputes under the declared rule.
 * Our reference agents finish their work inside one request, so a created job is terminal at once,
 * but the poll surface is the one a long job needs and the one the conformance suite checks for.
 *
 * The store and the resource builders are separated from the route so the pure logic (the request
 * hash, the response hash, which required inputs are missing, the terminal-poll shape) is testable
 * with no network and no route wiring.
 */
import { randomUUID } from 'node:crypto'
import { db } from './db.ts'
import { keccakCanonical, responseHash } from './protocol.ts'
import type { AgentInput } from './agents.ts'
import type { Shelf } from './types.ts'

const RETENTION_DAYS = 30
const NETWORK = 'eip155:56'

export type JobState =
  | 'quoted' | 'paid' | 'working' | 'completed' | 'refused' | 'failed' | 'cancelled' | 'expired' | 'voided' | 'lapsed'

export interface JobRecord {
  jobId: string
  shelf: Shelf
  skillId: string
  state: JobState
  terminalState: JobState | null
  requestHash: string
  result: unknown | null
  responseHash: string | null
  deliverableRule: string | null
  refusalCode: string | null
  chargedBase: string | null
  paymentTx: string | null
  paymentState: string | null
  inputsAsOfBlock: number | null
  createdAt: number
  computedAt: number | null
  expiresAt: number
}

/** Opaque, UUIDv4-grade, because on an unauthenticated endpoint the id is the bearer token. */
export function newJobId(): string {
  return 'job_' + randomUUID().replace(/-/g, '')
}

/** The required inputs a request left out, so a create can refuse before it settles (rule B9). */
export function missingRequired(inputs: readonly AgentInput[], params: URLSearchParams): string[] {
  return inputs.filter((i) => i.required && (params.get(i.name)?.trim() ?? '') === '').map((i) => i.name)
}

/** The canonical hash of the request the payment authorised. Sorted by canonicalJson, so stable. */
export function requestHashOf(params: URLSearchParams): string {
  const obj: Record<string, string> = {}
  for (const [k, v] of params.entries()) obj[k] = v
  return keccakCanonical(obj)
}

interface CompletedInput {
  shelf: Shelf
  skillId: string
  params: URLSearchParams
  result: unknown
  inputsAsOfBlock: number | null
  paymentTx: string | null
}

/** A job that finished inside the create call: terminal, carrying the result and its hash. */
export function completedJob(input: CompletedInput): JobRecord {
  const now = Date.now()
  return {
    jobId: newJobId(),
    shelf: input.shelf,
    skillId: input.skillId,
    state: 'completed',
    terminalState: 'completed',
    requestHash: requestHashOf(input.params),
    result: input.result,
    responseHash: responseHash(input.result),
    deliverableRule: 'keccakCanonical',
    refusalCode: null,
    chargedBase: null,
    paymentTx: input.paymentTx,
    paymentState: input.paymentTx ? 'settled' : 'pending',
    inputsAsOfBlock: input.inputsAsOfBlock,
    createdAt: now,
    computedAt: now,
    expiresAt: now + RETENTION_DAYS * 86_400_000,
  }
}

interface RefusedInput {
  shelf: Shelf
  skillId: string
  params: URLSearchParams
  code: string
  chargedBase: string
  paymentTx: string | null
}

/** A refusal is a success, docs/04 rule B5: 200 with a coded reason, never a 400 or a 500. */
export function refusedJob(input: RefusedInput): JobRecord {
  const now = Date.now()
  return {
    jobId: newJobId(),
    shelf: input.shelf,
    skillId: input.skillId,
    state: 'refused',
    terminalState: 'refused',
    requestHash: requestHashOf(input.params),
    result: null,
    responseHash: null,
    deliverableRule: null,
    refusalCode: input.code,
    chargedBase: input.chargedBase,
    paymentTx: input.paymentTx,
    paymentState: input.paymentTx ? 'settled' : null,
    inputsAsOfBlock: null,
    createdAt: now,
    computedAt: now,
    expiresAt: now + RETENTION_DAYS * 86_400_000,
  }
}

const INSERT_JOB = `
INSERT INTO agentJob (
  jobId, shelf, skillId, state, terminalState, requestHash, result, responseHash, deliverableRule,
  refusalCode, chargedBase, paymentTx, paymentState, inputsAsOfBlock, createdAt, computedAt, expiresAt
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`

export function storeJob(rec: JobRecord): void {
  db()
    .prepare(INSERT_JOB)
    .run(
      rec.jobId,
      rec.shelf,
      rec.skillId,
      rec.state,
      rec.terminalState,
      rec.requestHash,
      rec.result === null ? null : JSON.stringify(rec.result),
      rec.responseHash,
      rec.deliverableRule,
      rec.refusalCode,
      rec.chargedBase,
      rec.paymentTx,
      rec.paymentState,
      rec.inputsAsOfBlock,
      rec.createdAt,
      rec.computedAt,
      rec.expiresAt,
    )
}

interface JobRow {
  jobId: string
  shelf: Shelf
  skillId: string
  state: JobState
  terminalState: JobState | null
  requestHash: string
  result: string | null
  responseHash: string | null
  deliverableRule: string | null
  refusalCode: string | null
  chargedBase: string | null
  paymentTx: string | null
  paymentState: string | null
  inputsAsOfBlock: number | null
  createdAt: number
  computedAt: number | null
  expiresAt: number
}

export function readJob(jobId: string): JobRecord | null {
  const row = db().prepare('SELECT * FROM agentJob WHERE jobId = ?').get(jobId) as JobRow | undefined
  if (!row) return null
  return { ...row, result: row.result === null ? null : (JSON.parse(row.result) as unknown) }
}

/**
 * The poll body, docs/04 section 4 shape B. The terminal poll carries the deliverable, the rule and
 * the hash in one body, so nothing has to be fetched from a second place to check it.
 */
export function jobResource(rec: JobRecord, opts: { retryAfterSeconds?: number } = {}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    jobId: rec.jobId,
    state: rec.state,
    terminalState: rec.terminalState,
    requestHash: rec.requestHash,
    createdAt: new Date(rec.createdAt).toISOString(),
    expiresAt: new Date(rec.expiresAt).toISOString(),
    payment: { state: rec.paymentState, txHash: rec.paymentTx, network: NETWORK },
  }
  if (rec.state === 'completed') {
    return {
      ...base,
      result: rec.result,
      deliverableRule: rec.deliverableRule,
      responseHash: rec.responseHash,
      computedAt: rec.computedAt === null ? null : new Date(rec.computedAt).toISOString(),
      inputsAsOfBlock: rec.inputsAsOfBlock,
    }
  }
  if (rec.state === 'refused') {
    return { ...base, refusal: { code: rec.refusalCode, chargedBase: rec.chargedBase ?? '0' } }
  }
  // A non-terminal poll tells the client when to come back.
  return { ...base, retryAfterSeconds: opts.retryAfterSeconds ?? 5 }
}

/** The block a chain-derived result was read at, when the result exposes one. Null otherwise. */
export function blockOf(result: unknown): number | null {
  if (result !== null && typeof result === 'object') {
    const b = (result as Record<string, unknown>).atBlock
    if (typeof b === 'number' && Number.isFinite(b)) return b
  }
  return null
}
