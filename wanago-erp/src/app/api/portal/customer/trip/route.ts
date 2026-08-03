import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { selectRelevantBooking, type BookingForSelection } from "@/modules/companion/services/companion.service";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Friendly, customer-facing phrasing for the internal OPERATIONS_STAGE
// enum (src/lib/constants.ts) — deliberately not the raw internal label
// (e.g. "Booking Verification Completed" means nothing to a customer),
// same "internal fields deliberately excluded" principle already applied
// to profitAmount/approval trail in /api/portal/customer/me.
const FRIENDLY_STATUS: Record<string, string> = {
  booking_received:               "We're preparing your trip",
  booking_verification_completed: "We're preparing your trip",
  bookings_completed:              "We're preparing your trip",
  pre_departure_completed:         "Almost ready — final details being confirmed",
  tour_ongoing:                    "Your trip is in progress — enjoy!",
  tour_completed:                  "Welcome back — share your feedback",
  package_closed:                  "Trip completed",
};

// This bit of stage-mapping is deliberately duplicated rather than
// importing tour-operations.service.ts — that file pulls in the client
// Firebase SDK (`db` from lib/firebase/client), which must never end up in
// a server-only Admin SDK route (same reasoning as daily-reminders/route.ts's
// own DEFAULT_TICKET_SLA_HOURS comment).
export async function GET(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "customer") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const bookingsSnap = await db.collection(FIRESTORE_COLLECTIONS.BOOKINGS)
    .where("customerId", "==", caller.entityId).get();
  type BookingDoc = { id: string } & Record<string, unknown>;
  const bookings: BookingDoc[] = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const relevant = selectRelevantBooking(
    bookings.map((b) => ({ id: b.id, status: b.status as string, travelDate: b.travelDate as string | null, returnDate: b.returnDate as string | null })) as BookingForSelection[]
  );

  if (!relevant) {
    return NextResponse.json({ booking: null, tripReady: false });
  }

  const bookingDoc = bookings.find((b) => b.id === relevant.id)!;
  const bookingSummary = {
    id: bookingDoc.id,
    refNumber: bookingDoc.refNumber as string,
    destination: bookingDoc.destination as string,
    travelDate: bookingDoc.travelDate as string | null,
    returnDate: bookingDoc.returnDate as string | null,
  };

  const opsSnap = await db.collection(FIRESTORE_COLLECTIONS.OPERATIONS_BOOKINGS)
    .where("bookingId", "==", relevant.id).limit(1).get();

  if (opsSnap.empty) {
    // Booking confirmed but Operations hasn't started the handover yet —
    // nothing to show or upload against until that record exists.
    return NextResponse.json({ booking: bookingSummary, tripReady: false });
  }

  const ops = opsSnap.docs[0].data();
  const status = ops.status as string;
  const canSubmitFeedback = status === "tour_completed" || status === "package_closed";

  return NextResponse.json({
    booking: bookingSummary,
    tripReady: true,
    opsId: opsSnap.docs[0].id,
    friendlyStatus: FRIENDLY_STATUS[status] ?? "We're preparing your trip",
    idCardCount: ((ops.handover as Record<string, unknown> | undefined)?.idCardUrls as string[] | undefined)?.length ?? 0,
    feedbackStatus: ((ops.closure as Record<string, unknown> | undefined)?.feedback as Record<string, unknown> | undefined)?.status ?? "pending",
    testimonialStatus: ((ops.closure as Record<string, unknown> | undefined)?.testimonialVideo as Record<string, unknown> | undefined)?.status ?? "pending",
    canSubmitFeedback,
  });
}
