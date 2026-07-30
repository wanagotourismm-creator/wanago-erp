import { auth } from "@/lib/firebase/client";

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

export type IntegrationStatus = {
  configured: Record<string, boolean>;
  // Only populated for non-secret fields (e.g. a "from" email address) —
  // true secrets (API keys/tokens) never come back from the server.
  values: Record<string, string>;
};

export async function fetchIntegrationStatus(): Promise<IntegrationStatus> {
  const headers = await authHeader();
  const res = await fetch("/api/admin/integrations", { headers });
  if (!res.ok) throw new Error("Failed to load integration status");
  const data = await res.json();
  return { configured: data.configured ?? {}, values: data.values ?? {} };
}

export async function saveIntegrationSecrets(values: Record<string, string>, clear: string[] = []): Promise<void> {
  const headers = await authHeader();
  const res = await fetch("/api/admin/integrations", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ values, clear }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save integration keys");
  }
}

// Sends a real test email to the caller's own account, via whichever
// provider (Gmail SMTP or Resend) is actually configured server-side —
// lets an admin confirm the config works right after saving it, instead of
// saving blind and finding out only when a real notification silently
// never arrives.
export async function sendTestEmail(): Promise<{ sentTo: string }> {
  const headers = await authHeader();
  const res = await fetch("/api/admin/integrations/test-email", { method: "POST", headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to send test email");
  return { sentTo: data.sentTo };
}
