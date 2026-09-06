/**
 * A tiny in-process cache with a per-entry ceiling. It exists because the yield read walks
 * every Venus market and measured 22.7 seconds cold, which is too slow for a render path and
 * too slow for a buyer waiting on a paid call.
 *
 * The ceiling per entry is the freshness ceiling that field already has in
 * docs/15-SYSTEM.md section 3.5, so caching does not weaken any claim the page makes: a cached
 * value is served with the timestamp it was actually read at, never with the time it was
 * served. A stale entry is refreshed rather than extended.
 */
interface Entry<T> {
  value: T
  storedAt: number
  ceilingMs: number
}

const store = new Map<string, Entry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

export async function cached<T>(key: string, ceilingSeconds: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined
  if (hit && Date.now() - hit.storedAt < hit.ceilingMs) return hit.value

  // Collapse a stampede. Several page renders arriving together must not each pay 22 seconds.
  const running = inflight.get(key) as Promise<T> | undefined
  if (running) return running

  const p = load()
    .then((value) => {
      store.set(key, { value, storedAt: Date.now(), ceilingMs: ceilingSeconds * 1000 })
      return value
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

/** For the status page: what is cached and how old each entry is. */
export function cacheState(): { key: string; ageSeconds: number; ceilingSeconds: number }[] {
  const now = Date.now()
  return [...store.entries()].map(([key, e]) => ({
    key,
    ageSeconds: Math.round((now - e.storedAt) / 1000),
    ceilingSeconds: Math.round(e.ceilingMs / 1000),
  }))
}
