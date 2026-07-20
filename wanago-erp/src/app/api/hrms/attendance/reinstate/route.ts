import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { hasPermission } from "@/lib/rbac";
import type { SystemRole } from "@/types/rbac";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Reinstates a login that /api/hrms/attendance/clock's checkAndBlockSuspicious
// auto-suspended after a location-spoofing heuristic flag — the one action
// the Suspicious Attendance review page (/hrms-admin) offers per flagged
// employee. Deliberately its own endpoint rather than reusing the general
// "Edit User" isActive toggle: it only ever touches accounts this route
// itself suspended (suspensionSource === 'suspicious_attendance'), so it
// can never be used to reactivate an account HR deactivated for an
// unrelated reason through the normal Users page.
export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const adminDb = getAdminDb();
  if (!adminDb) return NextResponse.json({ error: "Server isn't configured for this action." }, { status: 501 });

  const callerDoc = await adminDb.collection(FIRESTORE_COLLECTIONS.USERS).doc(caller.uid).get();
  const callerRole = callerDoc.data()?.systemRole as SystemRole | undefined;
  if (!callerRole || !hasPermission(callerRole, "hrms:manage")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.userId || typeof body.userId !== "string") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const targetRef = adminDb.collection(FIRESTORE_COLLECTIONS.USERS).doc(body.userId);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const target = targetSnap.data()!;
  if (target.suspensionSource !== "suspicious_attendance") {
    return NextResponse.json({ error: "This account wasn't auto-suspended for suspicious attendance — use the Users page to change its access instead." }, { status: 409 });
  }

  await targetRef.update({
    isActive: true,
    suspendedAt: null,
    suspendedReason: null,
    suspensionSource: null,
    reinstatedBy: caller.uid,
    reinstatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
