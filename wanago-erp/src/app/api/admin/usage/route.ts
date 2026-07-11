import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminDb } from "@/lib/firebase/admin";
import { sumMetricSince } from "@/lib/gcp/monitoring";

export const runtime = "nodejs";

// Firebase Spark (free tier) daily quotas — the numbers this whole
// widget is measured against. If/when the project moves to the Blaze
// plan, these stop being "the free limit" and become "the point past
// which usage starts costing money" (Blaze keeps the same free
// allowance, then bills per unit beyond it), so the warning stays
// meaningful either way.
const FIRESTORE_DAILY_LIMITS = { reads: 50_000, writes: 20_000, deletes: 20_000 };

// Supabase free tier: 500 MB database storage. We don't have exact byte
// sizes (that needs the separate, more powerful Management API token —
// deliberately not requested for this narrow feature), so this is a
// deliberately conservative estimate: each mirrored row is a handful of
// short text/timestamp fields, generously rounded up to 300 bytes/row
// including index overhead, to avoid ever UNDER-warning.
const SUPABASE_STORAGE_LIMIT_MB = 500;
const ESTIMATED_BYTES_PER_ROW = 300;

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function warningLevel(pct: number): "ok" | "warning" | "critical" {
  if (pct >= 100) return "critical";
  if (pct >= 80) return "warning";
  return "ok";
}

function pct(count: number, limit: number): number {
  return limit > 0 ? Math.round((count / limit) * 1000) / 10 : 0;
}

export async function GET(req: NextRequest) {
  const caller = await requireAdmin(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [reads, writes, deletes] = await Promise.all([
    sumMetricSince("firestore.googleapis.com/document/read_count",   startOfDay),
    sumMetricSince("firestore.googleapis.com/document/write_count",  startOfDay),
    sumMetricSince("firestore.googleapis.com/document/delete_count", startOfDay),
  ]);

  const firebaseAvailable = reads !== null && writes !== null && deletes !== null;
  const readsPct   = firebaseAvailable ? pct(reads!,   FIRESTORE_DAILY_LIMITS.reads)   : 0;
  const writesPct  = firebaseAvailable ? pct(writes!,  FIRESTORE_DAILY_LIMITS.writes)  : 0;
  const deletesPct = firebaseAvailable ? pct(deletes!, FIRESTORE_DAILY_LIMITS.deletes) : 0;

  const firebase = {
    available: firebaseAvailable,
    reads:   { count: reads   ?? 0, limit: FIRESTORE_DAILY_LIMITS.reads,   pct: readsPct },
    writes:  { count: writes  ?? 0, limit: FIRESTORE_DAILY_LIMITS.writes,  pct: writesPct },
    deletes: { count: deletes ?? 0, limit: FIRESTORE_DAILY_LIMITS.deletes, pct: deletesPct },
    warningLevel: warningLevel(Math.max(readsPct, writesPct, deletesPct)),
    error: firebaseAvailable ? undefined : "Couldn't reach Cloud Monitoring — check the service account has the Monitoring Viewer role.",
  };

  const db = getAdminDb();
  let supabase = {
    available: false as boolean,
    customersSynced: 0, bookingsSynced: 0, lastSyncedAt: null as string | null,
    approxRows: 0, approxMB: 0, limitMB: SUPABASE_STORAGE_LIMIT_MB, pct: 0,
    warningLevel: "ok" as "ok" | "warning" | "critical",
  };
  if (db) {
    try {
      const snap = await db.collection("systemUsage").doc("supabaseSync").get();
      const data = snap.data();
      if (data) {
        const approxRows = (data.customersSynced ?? 0) + (data.bookingsSynced ?? 0);
        const approxMB = Math.round(((approxRows * ESTIMATED_BYTES_PER_ROW) / (1024 * 1024)) * 100) / 100;
        const p = pct(approxMB, SUPABASE_STORAGE_LIMIT_MB);
        supabase = {
          available: true,
          customersSynced: data.customersSynced ?? 0,
          bookingsSynced: data.bookingsSynced ?? 0,
          lastSyncedAt: data.lastSyncedAt?.toDate?.()?.toISOString() ?? null,
          approxRows, approxMB, limitMB: SUPABASE_STORAGE_LIMIT_MB, pct: p,
          warningLevel: warningLevel(p),
        };
      }
    } catch (err) {
      console.error("[api/admin/usage] failed to read systemUsage/supabaseSync:", err);
    }
  }

  return NextResponse.json({ firebase, supabase });
}
