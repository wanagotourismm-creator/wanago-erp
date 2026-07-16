import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { fetchCustomerTrackingDocs } from "@/lib/server/booking-portal";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";

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
  matchedCustomerId?: string | null;
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

  const [packagesSnap, company] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.PACKAGES).where("packageStatus", "==", "active").get(),
    getCompanySettingsServer(),
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

  // Only resolvable once this lead has been matched to a Customer record
  // (see leads/services/lead.service.ts) — Quotations/Bookings/Invoices are
  // all keyed by customerId, not leadId, so there's nothing to show before
  // that link exists (i.e. before the lead is converted/"won").
  const tracking: {
    quotation: { refNumber: string; status: string; totalAmount: number } | null;
    booking:   { refNumber: string; status: string; travelDate: string | null; pax: number; totalAmount: number; advanceAmount: number; balanceAmount: number } | null;
    invoice:   { refNumber: string; status: string; totalAmount: number; amountPaid: number; balanceDue: number } | null;
  } = { quotation: null, booking: null, invoice: null };

  if (lead.matchedCustomerId) {
    const docs = await fetchCustomerTrackingDocs(db, lead.matchedCustomerId);
    if (docs.quotation) {
      const q = docs.quotation as unknown as { refNumber: string; status: string; totalAmount: number };
      tracking.quotation = { refNumber: q.refNumber, status: q.status, totalAmount: q.totalAmount };
    }
    if (docs.booking) {
      const b = docs.booking as unknown as { refNumber: string; status: string; travelDate: string | null; pax: number; totalAmount: number; advanceAmount: number; balanceAmount: number };
      tracking.booking = {
        refNumber: b.refNumber, status: b.status, travelDate: b.travelDate, pax: b.pax,
        totalAmount: b.totalAmount, advanceAmount: b.advanceAmount, balanceAmount: b.balanceAmount,
      };
    }
    if (docs.invoice) {
      const inv = docs.invoice as unknown as { refNumber: string; status: string; totalAmount: number; amountPaid: number; balanceDue: number };
      tracking.invoice = { refNumber: inv.refNumber, status: inv.status, totalAmount: inv.totalAmount, amountPaid: inv.amountPaid, balanceDue: inv.balanceDue };
    }
  }

  return NextResponse.json({
    leadName:    lead.name,
    destination: lead.destination,
    packages,
    alreadySubmitted:     !!lead.customerRequestedAt,
    submittedPackageName: lead.customerSelectedPackageName ?? null,
    company: {
      businessName: company.businessName,
      phone:        company.phone || null,
      email:        company.email || null,
    },
    tracking,
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
