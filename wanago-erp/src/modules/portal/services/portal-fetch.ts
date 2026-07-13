import { auth } from "@/lib/firebase/client";

// Every /api/portal/* route verifies the caller via requirePortalAuth(),
// which needs a real Firebase ID token for the signed-in portal session —
// this is the one shared helper that attaches it, mirroring how the staff
// app's authenticated routes are called (e.g. lib/notify.ts).
export async function portalFetch(path: string, init?: RequestInit): Promise<Response> {
  const idToken = await auth.currentUser?.getIdToken();
  const headers = new Headers(init?.headers);
  if (idToken) headers.set("authorization", `Bearer ${idToken}`);
  return fetch(path, { ...init, headers });
}
