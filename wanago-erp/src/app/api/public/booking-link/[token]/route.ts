import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

// No auth of any kind — this route is the entire security boundary for the
// public, no-login customer booking-request page at /book/{token}. It only
// ever reads/writes the exact fields this feature needs, keyed strictly by
// a long random token, never by a guessable id — nothing else in the app's
// data is reachable through it.

type LeadRecord = {
  id: string;
  name: string;
  destination: string;
  assignedTo?: string | null;
  customerRequestedAt?: unknown;
  customerSelectedPackageName?: string | null;
};

async function findLeadByToken(token: string): Promise<LeadRecord | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(FIRESTORE_COLLECTIONS.LEADS)
    .where("bookingLinkToken", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as LeadRecord;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const lead = await findLeadByToken(token);
  if (!lead) return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });

  const [packagesSnap, companySnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.PACKAGES).where("packageStatus", "==", "active").get(),
    db.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc("company").get(),
  ]);

  // Deliberately excludes costPrice (profit-sensitive, internal-only) and
  // every other Package field beyond what a customer should see.
  const packages = packagesSnap.docs.map((d) => {
    const p = d.data();
    return {
      id: d.id,
      title: p.title, destination: p.destination, category: p.category,
      durationDays: p.durationDays, durationNights: p.durationNights,
      basePrice: p.basePrice, inclusions: p.inclusions,
    };
  });

  const company = companySnap.exists ? companySnap.data() : null;

  return NextResponse.json({
    leadName:    lead.name,
    destination: lead.destination,
    packages,
    alreadySubmitted:     !!lead.customerRequestedAt,
    submittedPackageName: lead.customerSelectedPackageName ?? null,
    company: {
      businessName: company?.businessName ?? "Wanago Tours & Travels",
      phone:        company?.phone ?? null,
      email:        company?.email ?? null,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const lead = await findLeadByToken(token);
  if (!lead) return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });

  let body: { packageId?: string; travelDate?: string; pax?: number; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.packageId) return NextResponse.json({ error: "Please choose a package" }, { status: 400 });

  const packageSnap = await db.collection(FIRESTORE_COLLECTIONS.PACKAGES).doc(body.packageId).get();
  if (!packageSnap.exists) return NextResponse.json({ error: "That package is no longer available" }, { status: 400 });
  const pkg = packageSnap.data() as { title: string };

  await db.collection(FIRESTORE_COLLECTIONS.LEADS).doc(lead.id).update({
    customerSelectedPackageId:   body.packageId,
    customerSelectedPackageName: pkg.title,
    customerRequestedTravelDate: body.travelDate || null,
    customerRequestedPax:        body.pax || null,
    customerRequestNotes:        body.notes || null,
    customerRequestedAt:         FieldValue.serverTimestamp(),
    updatedAt:                   FieldValue.serverTimestamp(),
  });

  await db.collection(FIRESTORE_COLLECTIONS.ACTIVITIES).add({
    entityType: "Lead",
    entityName: (lead as { name?: string }).name ?? "Lead",
    action:     "updated",
    detail:     `Customer submitted a booking request via their link — chose "${pkg.title}"`,
    actorId:    "customer",
    actorName:  (lead as { name?: string }).name ?? "Customer",
    createdAt:  FieldValue.serverTimestamp(),
  });

  const assignedTo = (lead as { assignedTo?: string | null }).assignedTo;
  if (assignedTo) {
    const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(assignedTo).get();
    const email = userSnap.exists ? (userSnap.data() as { email?: string }).email : null;
    await notifyUserServer({
      userId:   assignedTo,
      email:    email ?? undefined,
      title:    `${(lead as { name?: string }).name} picked a package`,
      body:     `They chose "${pkg.title}" via their booking link — review and follow up.`,
      link:     "/leads",
      category: "followup",
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
