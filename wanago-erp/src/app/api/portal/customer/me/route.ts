import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function GET(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "customer") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const customerSnap = await db.collection(FIRESTORE_COLLECTIONS.CUSTOMERS).doc(caller.entityId).get();
  if (!customerSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const customer = customerSnap.data() as { fullName: string; referralCode: string | null };

  const bookingsSnap = await db.collection(FIRESTORE_COLLECTIONS.BOOKINGS).where("customerId", "==", caller.entityId).get();
  // profitAmount, the approval trail, and rejection reasons are internal —
  // deliberately excluded, same principle as the /api/public/booking-link
  // route's package field allowlist.
  const bookings = bookingsSnap.docs.map(d => {
    const b = d.data();
    return {
      id: d.id,
      refNumber: b.refNumber as string,
      destination: b.destination as string,
      packageName: b.packageName as string | null,
      travelDate: b.travelDate as string | null,
      returnDate: b.returnDate as string | null,
      pax: b.pax as number,
      totalAmount: b.totalAmount as number,
      advanceAmount: b.advanceAmount as number,
      balanceAmount: b.balanceAmount as number,
      status: b.status as string,
      createdAt: (b.createdAt?.toDate?.() ?? null)?.toISOString?.() ?? null,
    };
  }).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return NextResponse.json({
    fullName: customer.fullName,
    referralCode: customer.referralCode,
    bookings,
  });
}
