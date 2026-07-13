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
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const snap = await db.collection(FIRESTORE_COLLECTIONS.PACKAGES).where("packageStatus", "==", "active").get();
  // costPrice (internal profit-sensitive field) deliberately excluded —
  // same allowlist /api/public/booking-link already uses for the same
  // collection.
  const packages = snap.docs.map(d => {
    const p = d.data();
    return {
      id: d.id, title: p.title as string, destination: p.destination as string, category: p.category as string,
      durationDays: p.durationDays as number, durationNights: p.durationNights as number,
      basePrice: p.basePrice as number, inclusions: p.inclusions as string,
    };
  });

  return NextResponse.json({ packages });
}
