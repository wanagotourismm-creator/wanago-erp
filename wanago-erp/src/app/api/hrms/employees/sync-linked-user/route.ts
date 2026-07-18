import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireHrOrAdmin } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

type SyncBody = {
  uid?: string;
  displayName?: string;
  phone?: string | null;
  department?: string;
  officeId?: string;
  officeName?: string;
  customPageAccess?: string[] | null;
};

// Cascade for updateEmployee(): keeps the linked login account's profile
// fields in step with the employee record, so editing someone's name/
// department/office in HR Admin doesn't leave a stale copy sitting in
// Admin > Users. Only touches profile fields (never systemRole/teamRole/
// isActive — those stay Admin > Users-only) via the Admin SDK, since
// firestore.rules' users/{userId} update rule only lets an owner touch
// their own doc or an isAdmin() caller touch anyone's — HR (who can
// already edit the employee record) couldn't otherwise write here.
export async function POST(req: NextRequest) {
  const caller = await requireHrOrAdmin(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  let body: SyncBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { uid, ...fields } = body;
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  const adminDb = getAdminDb();
  if (!adminDb) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  const patch: Record<string, unknown> = {};
  if (fields.displayName !== undefined) patch.displayName = fields.displayName;
  if (fields.phone !== undefined) patch.phone = fields.phone;
  if (fields.department !== undefined) patch.department = fields.department;
  if (fields.officeId !== undefined) patch.officeId = fields.officeId;
  if (fields.officeName !== undefined) patch.officeName = fields.officeName;
  if (fields.customPageAccess !== undefined) patch.customPageAccess = fields.customPageAccess;

  if (Object.keys(patch).length > 0) {
    await adminDb.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).set(patch, { merge: true });
  }

  return NextResponse.json({ ok: true });
}
