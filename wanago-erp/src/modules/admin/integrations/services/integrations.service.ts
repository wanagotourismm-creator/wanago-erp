import { auth } from "@/lib/firebase/client";

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function fetchIntegrationStatus(): Promise<Record<string, boolean>> {
  const headers = await authHeader();
  const res = await fetch("/api/admin/integrations", { headers });
  if (!res.ok) throw new Error("Failed to load integration status");
  const data = await res.json();
  return data.configured ?? {};
}

export async function saveIntegrationSecrets(patch: Record<string, string>): Promise<void> {
  const headers = await authHeader();
  const res = await fetch("/api/admin/integrations", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save integration keys");
  }
}
