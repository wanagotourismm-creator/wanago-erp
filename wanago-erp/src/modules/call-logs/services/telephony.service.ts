import { auth } from "@/lib/firebase/client";

export type BridgeCallInput = {
  leadId:      string | null;
  customerId:  string | null;
  contactName: string;
  phone:       string;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

// Is Voice Calling (Exotel) enabled? Any authenticated staff member can
// check this (not admin-only), since it just gates whether the "Call via
// App" button should render at all.
export async function fetchCallingEnabled(): Promise<boolean> {
  try {
    const headers = await authHeader();
    const res = await fetch("/api/telephony/exotel/status", { headers });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.enabled;
  } catch {
    return false;
  }
}

// Places a bridge call: Exotel rings the calling agent's own phone first,
// then connects the lead/customer once answered. Returns the CallLog id
// (created immediately as "in_progress" — see /api/telephony/exotel/call —
// then patched to its real outcome/recording once the call ends and
// Exotel's webhook lands).
export async function initiateBridgeCall(input: BridgeCallInput): Promise<{ callLogId: string } | { error: string }> {
  try {
    const headers = await authHeader();
    const res = await fetch("/api/telephony/exotel/call", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "Failed to place the call" };
    return { callLogId: data.callLogId };
  } catch {
    return { error: "Couldn't reach the calling service. Check your connection." };
  }
}
