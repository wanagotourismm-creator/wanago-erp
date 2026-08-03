import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { fetchUsersByPermission } from "@/lib/notify-recipients";
import { notifyUserServer } from "@/lib/server/notify-server";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Deliberately does NOT call tour-operations.service.ts's updateHandover —
// that function replaces the entire handover section and has no ownership
// check (it was only ever meant to be called by staff who already have
// role-gated write access to the record). This does a narrow arrayUnion
// on just idCardUrls, after verifying the linked booking actually belongs
// to the caller.
export async function POST(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "customer") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  let body: { opsId?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.opsId || !body.url) return NextResponse.json({ error: "Missing opsId/url." }, { status: 400 });

  const opsRef = db.collection(FIRESTORE_COLLECTIONS.OPERATIONS_BOOKINGS).doc(body.opsId);
  const opsSnap = await opsRef.get();
  if (!opsSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ops = opsSnap.data()!;

  const bookingSnap = await db.collection(FIRESTORE_COLLECTIONS.BOOKINGS).doc(ops.bookingId as string).get();
  if (!bookingSnap.exists || bookingSnap.data()?.customerId !== caller.entityId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await opsRef.update({
    "handover.idCardUrls": FieldValue.arrayUnion(body.url),
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    const opsApprovers = await fetchUsersByPermission("bookings:ops_approve");
    await Promise.all(
      opsApprovers.map((u) =>
        notifyUserServer({
          userId: u.id, email: u.email,
          title: `ID card uploaded: ${ops.refNumber}`,
          body: `${ops.customerName} uploaded an ID card via the customer portal.`,
          link: `/operations/${body.opsId}`,
          category: "system",
        })
      )
    );
  } catch {
    // Best-effort — the upload already succeeded regardless.
  }

  return NextResponse.json({ ok: true });
}
