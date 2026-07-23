import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Toggles live-location sharing for the trip and, if a fresh position was
// sent along, records it — the customer's own device pushes an update
// each time they open the page or explicitly refresh; there's no
// background-tracking infra to poll this on its own (no PWA background
// sync), so this is genuinely "opt-in, updates on visit," not continuous.
export async function POST(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "customer") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  let body: { bookingId?: string; optIn?: boolean; lat?: number; lng?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.bookingId || typeof body.optIn !== "boolean") {
    return NextResponse.json({ error: "Missing bookingId/optIn." }, { status: 400 });
  }

  const companionSnap = await db.collection(FIRESTORE_COLLECTIONS.TRIP_COMPANIONS).doc(body.bookingId).get();
  if (!companionSnap.exists || companionSnap.data()?.customerId !== caller.entityId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = { liveLocationOptIn: body.optIn, updatedAt: FieldValue.serverTimestamp() };
  if (typeof body.lat === "number" && typeof body.lng === "number") {
    patch.lastLocation = { lat: body.lat, lng: body.lng };
    patch.lastLocationAt = FieldValue.serverTimestamp();
  }
  await db.collection(FIRESTORE_COLLECTIONS.TRIP_COMPANIONS).doc(body.bookingId).update(patch);

  return NextResponse.json({ ok: true });
}
