import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS, REF_FORMATS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Mirrors nextRefNumber() (lib/firebase/ref-counter.ts), same reasoning as
// /api/public/referral/[code]/route.ts's copy — no client-SDK equivalent
// usable from a server route with no staff session.
async function nextRefNumberAdmin(prefix: keyof typeof REF_FORMATS): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK not configured");
  const pfx = REF_FORMATS[prefix];
  const counterRef = db.collection("refCounters").doc(pfx);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? (snap.data()?.next as number) : 1001;
    tx.set(counterRef, { next: current + 1 });
    return `${pfx}-${current}`;
  });
}

export async function POST(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "partner") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const partnerSnap = await db.collection(FIRESTORE_COLLECTIONS.REFERRAL_PARTNERS).doc(caller.entityId).get();
  if (!partnerSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const partnerName = partnerSnap.data()?.fullName as string;

  let body: { name?: string; phone?: string; destination?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 200);
  const phone = (body.phone ?? "").trim().slice(0, 20);
  const destination = (body.destination ?? "").trim().slice(0, 200) || "Not specified yet";
  if (name.length < 2 || phone.length < 10) {
    return NextResponse.json({ error: "Enter a valid name and phone number." }, { status: 400 });
  }

  const refNumber = await nextRefNumberAdmin("LEAD");
  const now = FieldValue.serverTimestamp();

  await db.collection(FIRESTORE_COLLECTIONS.LEADS).add({
    name, phone, email: null, alternatePhone: null,
    destination, tripType: null, travelDate: null, returnDate: null, duration: null, pax: null, budget: null,
    stage: "new", priority: "warm", source: "Referral",
    assignedTo: null, agentName: null, matchedCustomerId: null,
    referredByCustomerId: null, referredByPartnerId: caller.entityId,
    bookingLinkToken: null,
    officeId: "main", officeName: "Head Office",
    notes: null, lastContactedAt: null,
    refNumber, createdAt: now, updatedAt: now,
    createdBy: "referral-portal", status: "active",
  });

  await db.collection(FIRESTORE_COLLECTIONS.ACTIVITIES).add({
    entityType: "Lead", entityName: name, action: "created",
    detail: `New lead submitted directly by referral executive ${partnerName}`,
    actorId: "referral-portal", actorName: partnerName,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
