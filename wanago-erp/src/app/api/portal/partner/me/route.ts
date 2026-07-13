import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Scoped entirely to the caller's own entityId (from their verified portal
// token, never a client-supplied id) — a partner can only ever see their
// own numbers through this route.
export async function GET(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "partner") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const partnerSnap = await db.collection(FIRESTORE_COLLECTIONS.REFERRAL_PARTNERS).doc(caller.entityId).get();
  if (!partnerSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const partner = partnerSnap.data() as { fullName: string; referralCode: string; phone: string; email: string | null };

  const [clicksSnap, leadsSnap, bonusesSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.REFERRAL_CLICKS).where("referrerType", "==", "partner").where("referrerId", "==", caller.entityId).get(),
    db.collection(FIRESTORE_COLLECTIONS.LEADS).where("referredByPartnerId", "==", caller.entityId).get(),
    db.collection(FIRESTORE_COLLECTIONS.REFERRAL_BONUSES).where("referrerPartnerId", "==", caller.entityId).get(),
  ]);

  const bonuses = bonusesSnap.docs.map(d => d.data() as { bonusAmount: number; bonusStatus: string; bookingRevenue: number });
  const leads = leadsSnap.docs.map(d => {
    const l = d.data();
    return { name: l.name as string, destination: l.destination as string, stage: l.stage as string, createdAt: (l.createdAt?.toDate?.() ?? null)?.toISOString?.() ?? null };
  });

  return NextResponse.json({
    fullName: partner.fullName,
    referralCode: partner.referralCode,
    stats: {
      clicks: clicksSnap.size,
      leadsSent: leadsSnap.size,
      bookings: bonuses.length,
      revenue: bonuses.reduce((s, b) => s + b.bookingRevenue, 0),
      bonusPending: bonuses.filter(b => b.bonusStatus === "pending").reduce((s, b) => s + b.bonusAmount, 0),
      bonusPaid: bonuses.filter(b => b.bonusStatus === "paid").reduce((s, b) => s + b.bonusAmount, 0),
    },
    leads,
  });
}
