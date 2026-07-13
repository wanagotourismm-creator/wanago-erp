import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// "Anoop Menon" -> "Anoop M." — partners are strangers to each other
// (unlike the internal Sales leaderboard, which shows full names to
// coworkers who already know one another), so only the caller ever sees
// their own full name; everyone else is shown first-name-plus-initial.
function displayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export async function GET(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "partner") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const [partnersSnap, bonusesSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.REFERRAL_PARTNERS).where("partnerStatus", "==", "active").get(),
    db.collection(FIRESTORE_COLLECTIONS.REFERRAL_BONUSES).where("referrerType", "==", "partner").get(),
  ]);

  const stats = new Map<string, { fullName: string; revenue: number; bookings: number }>();
  for (const doc of partnersSnap.docs) {
    stats.set(doc.id, { fullName: (doc.data().fullName as string) ?? "Partner", revenue: 0, bookings: 0 });
  }
  for (const doc of bonusesSnap.docs) {
    const b = doc.data();
    const id = b.referrerPartnerId as string | null;
    if (!id) continue;
    const s = stats.get(id);
    if (s) { s.revenue += (b.bookingRevenue as number) ?? 0; s.bookings += 1; }
  }

  const ranked = Array.from(stats.entries())
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.revenue - a.revenue);

  const myIndex = ranked.findIndex(r => r.id === caller.entityId);

  return NextResponse.json({
    myRank: myIndex === -1 ? null : myIndex + 1,
    totalPartners: ranked.length,
    top: ranked.slice(0, 10).map((r, i) => ({
      rank: i + 1,
      name: r.id === caller.entityId ? r.fullName : displayName(r.fullName),
      isMe: r.id === caller.entityId,
      revenue: r.revenue,
      bookings: r.bookings,
    })),
  });
}
