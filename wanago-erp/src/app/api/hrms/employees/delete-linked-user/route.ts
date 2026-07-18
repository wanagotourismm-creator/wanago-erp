import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth, requireHrOrAdmin } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Cascade for deleteEmployee(): when an employee record with a linked login
// account is deleted, the login goes with it instead of being left
// orphaned in Admin > Users. Deliberately narrower than
// /api/admin/delete-user (requireSuperAdmin) — this only ever fires as a
// side effect of deleting the one employee record it's linked to, and is
// gated to the same roles already trusted to delete that record
// (admin/super_admin/hr, matching hrmsEmployees' firestore.rules write
// grant), not a general "delete any user" capability.
export async function POST(req: NextRequest) {
  const caller = await requireHrOrAdmin(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  let body: { uid?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const uid = body.uid;
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  if (uid === caller.uid) return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  // Best-effort — the account may already be gone from Auth (e.g. retrying
  // after a partial failure), which shouldn't block cleaning up Firestore.
  try {
    await adminAuth.deleteUser(uid);
  } catch { /* ignore */ }

  await adminDb.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).delete();

  return NextResponse.json({ ok: true });
}
