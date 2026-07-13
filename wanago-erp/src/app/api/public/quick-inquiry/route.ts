import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

// Deliberately the lowest-friction entry point in the whole app — just a
// phone number and a rough area/address, no name required, no login. The
// point is capturing genuine interest from someone who won't fill out a
// full form; staff calls them back to get everything else. No auth of any
// kind, same public-route security model as /api/public/referral/[code]
// and /api/public/booking-link — IP rate limiting is the only guard.
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  requestLog.set(key, hits);
  return hits.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  let body: { phone?: string; address?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const phone = (body.phone ?? "").trim().slice(0, 20);
  const address = (body.address ?? "").trim().slice(0, 300);
  if (phone.length < 10 || address.length < 3) {
    return NextResponse.json({ error: "Enter your phone number and area/address." }, { status: 400 });
  }
  const name = (body.name ?? "").trim().slice(0, 200) || null;

  const now = FieldValue.serverTimestamp();
  await db.collection(FIRESTORE_COLLECTIONS.QUICK_INQUIRIES).add({
    phone, address, name,
    inquiryStatus: "new",
    createdAt: now, updatedAt: now,
    createdBy: "quick-inquiry", status: "active",
  });

  // Best-effort, notifies every Admin/Super Admin/Marketing user in-app —
  // this has no assigned salesperson yet (unlike a booking request tied to
  // an existing customer), so it goes to whoever owns fresh-lead triage
  // rather than one specific person.
  try {
    const staffSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS)
      .where("systemRole", "in", ["super_admin", "admin", "marketing"]).get();
    await Promise.allSettled(staffSnap.docs.map((d) => {
      const u = d.data() as { email?: string };
      return notifyUserServer({
        userId: d.id, email: u.email,
        title: "New quick inquiry",
        body: `${name ?? "Someone"} (${phone}) is interested — area: ${address}`,
        link: "/leads", category: "followup",
      });
    }));
  } catch {
    // notification is best-effort only
  }

  return NextResponse.json({ ok: true });
}
