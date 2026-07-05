import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth, requireSuperAdmin } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function POST(req: NextRequest) {
  const caller = await requireSuperAdmin(bearerToken(req));
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

  // Best-effort — the user may already be gone from Auth (e.g. retrying
  // after a partial failure), which shouldn't block cleaning up Firestore.
  try {
    await adminAuth.deleteUser(uid);
  } catch { /* ignore */ }

  await adminDb.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).delete();

  // Unlink any employee record pointing at this now-deleted account so it
  // doesn't silently show as "linked" to nothing.
  const linkedEmployees = await adminDb
    .collection(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES)
    .where("userId", "==", uid)
    .get();
  if (!linkedEmployees.empty) {
    const batch = adminDb.batch();
    linkedEmployees.docs.forEach((doc) => batch.update(doc.ref, { userId: null }));
    await batch.commit();
  }

  return NextResponse.json({ ok: true });
}
