// Tiny in-memory sliding-window rate limiter for API routes. Per-process
// (resets on redeploy/cold start) — fine for blunting abuse from a single
// caller, not meant as a distributed/durable limiter.
const requestLog = new Map<string, number[]>();

export function isRateLimited(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const hits = (requestLog.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  requestLog.set(key, hits);
  return hits.length > max;
}
