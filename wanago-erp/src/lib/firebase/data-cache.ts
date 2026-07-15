// Tiny in-memory TTL cache for reference/lookup data (offices, packages,
// customers) that gets fetched in full on many different pages just to
// resolve names/phones/ref-numbers (bulk-import row matching, customer
// segmentation) — see office.service.ts/package.service.ts/customer.service.ts
// for the wrapped fetches. Deliberately NOT used for the primary editable
// list-page data (leads/quotations/bookings/invoices), which already has
// its own mutation-aware refresh logic and shouldn't gain a second,
// overlapping staleness mechanism.
//
// Per-browser-tab, resets on reload — no cross-user/session staleness risk.
// The TTL is a self-healing safety net: even if a mutation path forgets to
// call invalidateCache(), the cache clears itself within `ttlMs`.
type CacheEntry<T> = { data: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  const data = await fetcher();
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

// Clears every cached entry whose key starts with `prefix` — used after a
// create/update/delete so a filtered fetch (e.g. "packages:{"officeId":"x"}")
// and an unfiltered one ("packages:{}") both get invalidated together,
// since a single mutation can't know in advance which filter variants a
// stale cache entry might exist under.
export function invalidateCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
