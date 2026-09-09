/**
 * [doc 10] The before-the-flip publish gate, docs/10-DOCS-AND-POLICY.md section 7. A publication with
 * the wrong licence cannot be unpublished, so the flip is gated rather than trusted to memory. This
 * runs the four checks that document names against the current tree:
 *
 *   1. LICENSE present and SAND.
 *   2. NOTICE lists every runtime dependency in package.json.
 *   3. DATA-SOURCES.md has a row for every runtime host the code fetches from.
 *   4. No private path (.hq, submit, keys) is tracked.
 *
 * It is a check, so it reports the truth rather than forcing a pass: each result carries what failed
 * and why. The core logic is pure and takes its inputs as arguments, so lib/publish-gate.test.ts can
 * pin it with synthetic pass and fail cases, then run the whole gate against the repo. No network.
 *
 * "Runtime host" here means a host the app opens a network read to, gathered from the source under
 * lib/ and worker/ (test files excluded) and unioned with the code's own endpoint tables. Display
 * links (a bscscan tx link, the Altana explorer), schema identifier URIs (json-schema.org,
 * eips.ethereum.org) and our own origin are not data reads, so they are excluded with the reason
 * beside each in IGNORE_HOST below. A host that is none of those is required to have a grant, so an
 * unclassified new host fails closed rather than slipping through.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { READ_ENDPOINTS, BULK_ENDPOINTS } from './rpc.ts'
import { B402 } from './constants.ts'

export const SAND_SPDX = 'LicenseRef-zkasuran-SAND-1.0'

export interface Check {
  name: string
  ok: boolean
  detail: string
  /** For notice, dataSources and privatePaths: what is missing or offending. */
  missing?: string[]
}

export interface GateReport {
  ok: boolean
  checks: Check[]
  /** The names of the checks that fail, so a caller learns what blocks the flip. */
  blocking: string[]
}

function repoRoot(): string {
  return resolve(import.meta.dirname, '..')
}

// ---- Pure checks, one per rule, testable with synthetic inputs ----

/** The LICENSE carries the entry SPDX id. */
export function licenseIsSand(licenseText: string): boolean {
  return licenseText.includes(SAND_SPDX)
}

/**
 * A NOTICE row can name a package under a display name, so a dep is covered when NOTICE mentions its
 * name or a known alias. next is "Next.js", lucide-react is "lucide", react-dom rides the "React"
 * entry (same copyright holder, "and affiliates"). clsx, tailwind-merge and viem have no alias.
 */
const NOTICE_ALIASES: Record<string, string[]> = {
  next: ['next'],
  react: ['react'],
  'react-dom': ['react'],
  'lucide-react': ['lucide'],
  clsx: ['clsx'],
  'tailwind-merge': ['tailwind-merge'],
  viem: ['viem'],
}

export function noticeCoverage(noticeText: string, deps: string[]): { covered: string[]; missing: string[] } {
  const hay = noticeText.toLowerCase()
  const covered: string[] = []
  const missing: string[] = []
  for (const d of deps) {
    const terms = NOTICE_ALIASES[d] ?? [d.toLowerCase()]
    ;(terms.some((t) => hay.includes(t)) ? covered : missing).push(d)
  }
  return { covered, missing }
}

/** A fetch host is covered when DATA-SOURCES.md names it or its operator. */
export function dataSourceCoverage(dsText: string, hosts: string[]): { covered: string[]; missing: string[] } {
  const hay = dsText.toLowerCase()
  const covered: string[] = []
  const missing: string[] = []
  for (const h of hosts) {
    const lh = h.toLowerCase()
    let ok = hay.includes(lh)
    if (!ok && lh.endsWith('publicnode.com')) ok = hay.includes('publicnode')
    if (!ok && lh === 'www.binance.com') ok = hay.includes('binance') || hay.includes('bazaar')
    ;(ok ? covered : missing).push(h)
  }
  return { covered, missing }
}

/** True when a host grepped from source is not a data read the gate should require a grant for. */
export function isIgnoredHost(host: string): boolean {
  const lh = host.toLowerCase()
  // Reserved, private, loopback, link-local and multicast IP literals: SSRF probe test targets.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lh)) return true
  // Placeholders in examples and our own origin.
  if (lh.includes('.example') || lh === 'example.com' || lh === 'localhost' || lh === 'muster.zkasuran.dev') return true
  if (lh === 'user' || lh === 'x') return true
  // Schema and spec identifier hosts, used as $schema/type URIs, never fetched.
  if (lh === 'json-schema.org' || lh === 'eips.ethereum.org') return true
  // Display-only links rendered as an href for a human, never fetched by the server.
  if (lh === 'bscscan.com' || lh === 'explorer.altana.network' || lh === 'testnet.altana.network') return true
  return false
}

/** The hosts the app reads from at runtime, grepped from lib/ and worker/ and unioned with the
 *  code's endpoint tables so a host built up from parts is still counted. */
export function runtimeFetchHosts(root: string): string[] {
  const hosts = new Set<string>()
  for (const d of ['lib', 'worker']) {
    let files: string[] = []
    try {
      files = readdirSync(join(root, d), { recursive: true }) as string[]
    } catch {
      continue
    }
    for (const f of files) {
      if (typeof f !== 'string' || !f.endsWith('.ts') || f.endsWith('.test.ts')) continue
      const text = readFileSync(join(root, d, f), 'utf8')
      for (const m of text.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
        const h = m[1]
        if (h && !isIgnoredHost(h)) hosts.add(h)
      }
    }
  }
  for (const u of [...READ_ENDPOINTS, ...BULK_ENDPOINTS, B402.bazaarBase]) {
    try {
      hosts.add(new URL(u).host)
    } catch {
      // not a URL, skip
    }
  }
  return [...hosts].sort()
}

/** The tracked paths that carry private working material or a secret, from a file list. */
export function trackedPrivatePaths(files: string[]): string[] {
  return files.filter((p) => {
    if (/(^|\/)\.hq(\/|$)/.test(p)) return true
    if (/(^|\/)submit(\/|$)/.test(p)) return true
    if (/(^|\/)archive(\/|$)/.test(p)) return true
    const base = p.split('/').pop() ?? p
    if (base === '.env') return true
    if (base.startsWith('.env.') && base !== '.env.example') return true
    if (/\.(pem|key)$/.test(base)) return true
    if (/\.passphrase$/.test(base)) return true
    if (/^(payout-key|id_rsa)/.test(base)) return true
    return false
  })
}

// ---- The gate, wired against the repository ----

export function publishGate(): GateReport {
  const root = repoRoot()
  const read = (p: string) => readFileSync(join(root, p), 'utf8')
  const checks: Check[] = []

  let licenseOk = false
  let licenseDetail = 'LICENSE not found'
  try {
    const t = read('LICENSE')
    licenseOk = licenseIsSand(t)
    licenseDetail = licenseOk ? `LICENSE carries ${SAND_SPDX}` : `LICENSE does not carry ${SAND_SPDX}`
  } catch {
    // licenseOk stays false
  }
  checks.push({ name: 'license', ok: licenseOk, detail: licenseDetail })

  const pkg = JSON.parse(read('package.json')) as { dependencies?: Record<string, string> }
  const deps = Object.keys(pkg.dependencies ?? {}).sort()
  const notice = noticeCoverage(read('NOTICE'), deps)
  checks.push({
    name: 'notice',
    ok: notice.missing.length === 0,
    missing: notice.missing,
    detail:
      notice.missing.length === 0
        ? `NOTICE covers all ${deps.length} runtime dependencies`
        : `NOTICE is missing ${notice.missing.length} of ${deps.length} runtime dependencies: ${notice.missing.join(', ')}`,
  })

  const hosts = runtimeFetchHosts(root)
  const ds = dataSourceCoverage(read('DATA-SOURCES.md'), hosts)
  checks.push({
    name: 'dataSources',
    ok: ds.missing.length === 0,
    missing: ds.missing,
    detail:
      ds.missing.length === 0
        ? `DATA-SOURCES.md covers all ${hosts.length} runtime fetch hosts`
        : `DATA-SOURCES.md is missing a row for: ${ds.missing.join(', ')}`,
  })

  let tracked: string[] = []
  try {
    tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)
  } catch {
    // no git, tracked stays empty
  }
  const priv = trackedPrivatePaths(tracked)
  checks.push({
    name: 'privatePaths',
    ok: priv.length === 0,
    missing: priv,
    detail: priv.length === 0 ? 'no private path (.hq, submit, keys) is tracked' : `private paths tracked: ${priv.join(', ')}`,
  })

  const blocking = checks.filter((c) => !c.ok).map((c) => c.name)
  return { ok: blocking.length === 0, checks, blocking }
}
