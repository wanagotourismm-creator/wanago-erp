import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { notifyUserServer } from "@/lib/server/notify-server";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Deliberately a separate, lightweight collection rather than writing
// straight into Bookings — a real Booking needs officeId/assignedTo/
// totalAmount/the Finance+Ops approval trail, none of which a customer
// should be setting themselves. This is only ever "the customer said they
// want X" — staff still creates the actual Booking manually, same
// philosophy as the /book/{token} link's customerSelectedPackageId fields.
export async function GET(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "customer") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const snap = await db.collection(FIRESTORE_COLLECTIONS.BOOKING_REQUESTS).where("customerId", "==", caller.entityId).get();
  const requests = snap.docs.map(d => {
    const r = d.data();
    return {
      id: d.id, packageName: r.packageName as string, travelDate: r.travelDate as string | null,
      pax: r.pax as number | null, notes: r.notes as string | null, requestStatus: r.requestStatus as string,
      createdAt: (r.createdAt?.toDate?.() ?? null)?.toISOString?.() ?? null,
    };
  }).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "customer") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const customerSnap = await db.collection(FIRESTORE_COLLECTIONS.CUSTOMERS).doc(caller.entityId).get();
  if (!customerSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const customer = customerSnap.data() as { fullName: string; assignedTo?: string | null };

  let body: { packageId?: string; packageName?: string; travelDate?: string; pax?: number; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.packageId || !body.packageName) {
    return NextResponse.json({ error: "Please choose a package." }, { status: 400 });
  }

  const now = FieldValue.serverTimestamp();
  await db.collection(FIRESTORE_COLLECTIONS.BOOKING_REQUESTS).add({
    customerId: caller.entityId,
    customerName: customer.fullName,
    packageId: body.packageId,
    packageName: body.packageName,
    travelDate: body.travelDate || null,
    pax: body.pax || null,
    notes: (body.notes ?? "").trim().slice(0, 1000) || null,
    requestStatus: "new",
    createdAt: now, updatedAt: now,
    createdBy: "customer-portal", status: "active",
  });

  // Best-effort — same pattern as the referral webhook's classification
  // call: a notification failure must never block the request itself.
  if (customer.assignedTo) {
    const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(customer.assignedTo).get();
    const email = userSnap.exists ? (userSnap.data() as { email?: string }).email : null;
    notifyUserServer({
      userId: customer.assignedTo, email: email ?? undefined,
      title: `${customer.fullName} requested a booking`,
      body: `They picked "${body.packageName}" through their customer portal — review and follow up.`,
      link: "/leads", category: "followup",
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
