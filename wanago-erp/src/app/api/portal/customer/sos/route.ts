import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { getAppUrl } from "@/lib/app-url";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Fires an SOS event: creates the record, then best-effort notifies the
// booking's assigned sales agent (if any) plus every admin/super_admin/
// operations user — same "notify every ops-adjacent role" convention as
// daily-reminders' booking-anomaly alert. A notification failure must
// never make the SOS itself look like it failed to the customer, since
// the event is already safely recorded either way.
export async function POST(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "customer") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  let body: { bookingId?: string; lat?: number; lng?: number; address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.bookingId || typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json({ error: "Missing bookingId/location." }, { status: 400 });
  }

  const bookingSnap = await db.collection(FIRESTORE_COLLECTIONS.BOOKINGS).doc(body.bookingId).get();
  if (!bookingSnap.exists || bookingSnap.data()?.customerId !== caller.entityId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const booking = bookingSnap.data()!;

  const now = FieldValue.serverTimestamp();
  const sosRef = await db.collection(FIRESTORE_COLLECTIONS.SOS_EVENTS).add({
    bookingId: body.bookingId, bookingRefNumber: booking.refNumber,
    customerId: caller.entityId, customerName: booking.customerName, customerPhone: booking.customerPhone,
    lat: body.lat, lng: body.lng, address: (body.address ?? "").trim().slice(0, 300) || null,
    sosStatus: "active", resolvedBy: null, resolvedAt: null,
    createdAt: now, updatedAt: now, createdBy: "customer-portal", status: "active",
  });

  try {
    const mapsLink = `https://maps.google.com/?q=${body.lat},${body.lng}`;
    const title = `🆘 SOS from ${booking.customerName}`;
    const addressLine = body.address ? ` near ${body.address}` : "";
    const messageBody = `${booking.customerName} (${booking.customerPhone}) triggered SOS on booking ${booking.refNumber}${addressLine}. Location: ${mapsLink}`;

    const notifyTargets: { userId: string; email: string | null }[] = [];

    if (booking.assignedTo) {
      const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(booking.assignedTo as string).get();
      if (userSnap.exists) notifyTargets.push({ userId: userSnap.id, email: (userSnap.data()?.email as string | undefined) ?? null });
    }

    const usersSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS)
      .where("systemRole", "in", ["admin", "super_admin", "operations"]).get();
    for (const doc of usersSnap.docs) {
      if (notifyTargets.some((t) => t.userId === doc.id)) continue;
      notifyTargets.push({ userId: doc.id, email: (doc.data()?.email as string | undefined) ?? null });
    }

    await Promise.all(notifyTargets.map((t) =>
      notifyUserServer({
        userId: t.userId, email: t.email,
        title, body: messageBody,
        link: `${getAppUrl()}/bookings?view=${body.bookingId}`,
        category: "system",
      }).catch(() => {})
    ));
  } catch (err) {
    console.error("[api/portal/customer/sos] notification failed:", err);
  }

  return NextResponse.json({ ok: true, id: sosRef.id });
}
