import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

// No auth of any kind — this route is the entire security boundary for the
// public, no-login vendor rate/availability page at /vendor/{token}. It
// only ever reads/writes the exact fields this feature needs, keyed
// strictly by a long random token, never by a guessable id — nothing else
// in the app's data is reachable through it. Mirrors
// /api/public/booking-link/[token]/route.ts's structure exactly.

type SupplierRecord = {
  id: string;
  name: string;
  category: string;
  city: string | null;
};

async function findSupplierByToken(token: string): Promise<SupplierRecord | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(FIRESTORE_COLLECTIONS.SUPPLIERS)
    .where("vendorPortalToken", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  return { id: doc.id, name: data.name, category: data.category, city: data.city ?? null };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const supplier = await findSupplierByToken(token);
  if (!supplier) return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });

  const [ratesSnap, availabilitySnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.VENDOR_RATES).where("supplierId", "==", supplier.id).get(),
    db.collection(FIRESTORE_COLLECTIONS.VENDOR_AVAILABILITY).where("supplierId", "==", supplier.id).get(),
  ]);

  function toMillis(value: unknown): number {
    if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis: () => number }).toMillis === "function") {
      return (value as { toMillis: () => number }).toMillis();
    }
    return 0;
  }

  const rates = ratesSnap.docs
    .sort((a, b) => toMillis(b.data().createdAt) - toMillis(a.data().createdAt))
    .map((d) => {
      const r = d.data();
      return {
        id: d.id, serviceName: r.serviceName, description: r.description ?? null,
        unit: r.unit, rateAmount: r.rateAmount, validFrom: r.validFrom ?? null, validTo: r.validTo ?? null,
        notes: r.notes ?? null,
      };
    });

  const availability = availabilitySnap.docs
    .sort((a, b) => toMillis(b.data().createdAt) - toMillis(a.data().createdAt))
    .map((d) => {
      const a = d.data();
      return {
        id: d.id, resourceLabel: a.resourceLabel, startDate: a.startDate, endDate: a.endDate,
        unitsAvailable: a.unitsAvailable, notes: a.notes ?? null,
      };
    });

  return NextResponse.json({
    supplierName: supplier.name,
    category: supplier.category,
    city: supplier.city,
    rates,
    availability,
  });
}

type RateBody = {
  kind: "rate";
  serviceName?: string; description?: string; unit?: string; rateAmount?: number;
  validFrom?: string; validTo?: string; notes?: string;
};
type AvailabilityBody = {
  kind: "availability";
  resourceLabel?: string; startDate?: string; endDate?: string; unitsAvailable?: number; notes?: string;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const supplier = await findSupplierByToken(token);
  if (!supplier) return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });

  let body: RateBody | AvailabilityBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const now = FieldValue.serverTimestamp();

  if (body.kind === "rate") {
    if (!body.serviceName || !body.unit || body.rateAmount == null) {
      return NextResponse.json({ error: "Please fill in the service name, unit, and rate." }, { status: 400 });
    }
    await db.collection(FIRESTORE_COLLECTIONS.VENDOR_RATES).add({
      supplierId: supplier.id, supplierName: supplier.name,
      serviceName: body.serviceName, description: body.description || null,
      unit: body.unit, rateAmount: body.rateAmount, currency: "INR",
      validFrom: body.validFrom || null, validTo: body.validTo || null, notes: body.notes || null,
      submittedByVendor: true,
      createdAt: now, updatedAt: now, createdBy: "vendor", status: "active",
    });
    await db.collection(FIRESTORE_COLLECTIONS.ACTIVITIES).add({
      entityType: "Supplier", entityName: supplier.name, action: "updated",
      detail: `Vendor submitted a new rate: "${body.serviceName}"`,
      actorId: "vendor", actorName: supplier.name, createdAt: now,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "availability") {
    if (!body.resourceLabel || !body.startDate || !body.endDate || body.unitsAvailable == null) {
      return NextResponse.json({ error: "Please fill in the resource, dates, and units available." }, { status: 400 });
    }
    await db.collection(FIRESTORE_COLLECTIONS.VENDOR_AVAILABILITY).add({
      supplierId: supplier.id, supplierName: supplier.name,
      resourceLabel: body.resourceLabel, startDate: body.startDate, endDate: body.endDate,
      unitsAvailable: body.unitsAvailable, notes: body.notes || null,
      submittedByVendor: true,
      createdAt: now, updatedAt: now, createdBy: "vendor", status: "active",
    });
    await db.collection(FIRESTORE_COLLECTIONS.ACTIVITIES).add({
      entityType: "Supplier", entityName: supplier.name, action: "updated",
      detail: `Vendor submitted new availability: "${body.resourceLabel}" (${body.unitsAvailable} units, ${body.startDate}–${body.endDate})`,
      actorId: "vendor", actorName: supplier.name, createdAt: now,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
