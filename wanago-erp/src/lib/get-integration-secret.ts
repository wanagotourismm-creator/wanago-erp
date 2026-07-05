import { getAdminDb } from "@/lib/firebase/admin";

const CACHE_TTL_MS = 30_000;
let cache: { data: Record<string, string>; expires: number } | null = null;

async function loadSecrets(): Promise<Record<string, string>> {
  if (cache && cache.expires > Date.now()) return cache.data;
  const db = getAdminDb();
  if (!db) {
    cache = { data: {}, expires: Date.now() + CACHE_TTL_MS };
    return {};
  }
  try {
    const snap = await db.collection("integrationSecrets").doc("keys").get();
    const data = (snap.data() ?? {}) as Record<string, string>;
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
  if (secrets[field]) return secrets[field];
  return envFallback ? process.env[envFallback] : undefined;
}
