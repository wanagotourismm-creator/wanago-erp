import { getAdminDb } from "@/lib/firebase/admin";

const CACHE_TTL_MS = 30_000;
// Most fields in this doc are strings, but boolean feature-toggles (e.g.
// callingEnabled) live here too — kept as `unknown` per-field rather than
// blanket-typed as string, so a toggle isn't silently miscast.
let cache: { data: Record<string, unknown>; expires: number } | null = null;

async function loadSecrets(): Promise<Record<string, unknown>> {
  if (cache && cache.expires > Date.now()) return cache.data;
  const db = getAdminDb();
  if (!db) {
    cache = { data: {}, expires: Date.now() + CACHE_TTL_MS };
    return {};
  }
  try {
    const snap = await db.collection("integrationSecrets").doc("keys").get();
    const data = snap.data() ?? {};
    cache = { data, expires: Date.now() + CACHE_TTL_MS };
    return data;
  } catch {
    cache = { data: {}, expires: Date.now() + CACHE_TTL_MS };
    return {};
  }
}

// Admin-panel-stored key takes precedence; falls back to a Vercel env var
// of the same purpose so existing env-var setups keep working.
export async function getIntegrationSecret(field: string, envFallback?: string): Promise<string | undefined> {
  const secrets = await loadSecrets();
  const value = secrets[field];
  if (typeof value === "string" && value) return value;
  return envFallback ? process.env[envFallback] : undefined;
}

// For real on/off toggles (e.g. callingEnabled) — distinct from
// getIntegrationSecret, which is string-only and would silently misreport
// a boolean field.
export async function getIntegrationFlag(field: string): Promise<boolean> {
  const secrets = await loadSecrets();
  return secrets[field] === true;
}
