/**
 * One decoder for a stored JSON-text column into a string array. The registry sweep writes
 * endpoints, skills and serviceKinds as JSON text. Four call sites (worker/probe.ts,
 * worker/shelve.ts, lib/queries.ts, lib/v1.ts) each parsed it the same way. Shared here so a
 * hardening (a size cap, non-string element handling) lands in one place instead of drifting.
 * Total: any non-array or unparseable input becomes an empty array, never a throw.
 */
export function jsonStringArray(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}
