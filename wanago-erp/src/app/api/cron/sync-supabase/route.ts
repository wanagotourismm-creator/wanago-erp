import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

type AdminTimestamp = { toDate: () => Date };
function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && "toDate" in value) return (value as AdminTimestamp).toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") { const t = new Date(value); return Number.isNaN(t.getTime()) ? null : t.toISOString(); }
  return null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// One-way, one-directional sync: Firestore (source of truth) -> Supabase
// (read-only reporting mirror). Never reads from Supabase here, never
// writes back to Firestore. Only the two fields-of-interest are copied —
// see supabase/reporting-schema.sql for the narrow schema this feeds.
// Verified daily by Vercel Cron (see vercel.json), same CRON_SECRET
// bearer-token pattern as the existing daily-reminders cron.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const supabase = getSupabaseAdmin();
  if (!db)       return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const [customersSnap, bookingsSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.CUSTOMERS).get(),
    db.collection(FIRESTORE_COLLECTIONS.BOOKINGS).get(),
  ]);

  const customerRows = customersSnap.docs
    .map(d => ({ id: d.id, created_at: toIso(d.data().createdAt) }))
    .filter((c): c is { id: string; created_at: string } => c.created_at !== null);

  const bookingRows = bookingsSnap.docs
    .map(d => {
      const data = d.data();
      return {
        id: d.id,
        customer_id: (data.customerId as string) ?? null,
        created_at: toIso(data.createdAt),
        status: (data.status as string) ?? null,
      };
    })
    .filter((b): b is { id: string; customer_id: string; created_at: string; status: string } =>
      b.customer_id !== null && b.created_at !== null && b.status !== null);

  for (const batch of chunk(customerRows, 500)) {
    const { error } = await supabase.from("reporting_customers").upsert(batch);
    if (error) return NextResponse.json({ error: `Customers sync failed: ${error.message}` }, { status: 502 });
  }
  for (const batch of chunk(bookingRows, 500)) {
    const { error } = await supabase.from("reporting_bookings").upsert(batch);
    if (error) return NextResponse.json({ error: `Bookings sync failed: ${error.message}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, customersSynced: customerRows.length, bookingsSynced: bookingRows.length });
}
