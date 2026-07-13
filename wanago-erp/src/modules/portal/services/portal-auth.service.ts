import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export type PortalType = "customer" | "partner";
export type PortalLoginResult = { name: string } | { error: string };

// Signs into the SAME Firebase Auth instance the staff app uses — fine in
// practice since portal pages and the staff app are never open as the same
// session (a customer/partner has no staff account), but worth knowing:
// this would sign a staff member out of their own session if tested in the
// same browser tab.
export async function portalLogin(portalType: PortalType, phone: string, code: string): Promise<PortalLoginResult> {
  try {
    const res = await fetch("/api/portal/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ portalType, phone, code }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't sign you in." };
    await signInWithCustomToken(auth, data.token);
    return { name: data.name };
  } catch {
    return { error: "Couldn't reach the server. Check your connection." };
  }
}

export async function portalLogout(): Promise<void> {
  await signOut(auth);
}

// The synthetic uid ("cust_{id}" / "partner_{id}") IS the identity — no
// separate claims fetch needed to know who's signed in or which portal.
export function parsePortalUid(uid: string): { portalType: PortalType; entityId: string } | null {
  if (uid.startsWith("cust_")) return { portalType: "customer", entityId: uid.slice(5) };
  if (uid.startsWith("partner_")) return { portalType: "partner", entityId: uid.slice(8) };
  return null;
}
