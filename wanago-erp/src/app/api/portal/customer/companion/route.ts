import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";
import { selectRelevantBooking, type BookingForSelection } from "@/modules/companion/services/companion.service";
import type { CompanionData, CompanionResourceContact, CompanionItineraryDay } from "@/modules/companion/types";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// GET returns everything the Companion page needs in one call: the
// customer's currently-relevant booking (see selectRelevantBooking),
// its itinerary (via Booking.packageId -> Package.itineraryId -> Itinerary
// — a real 1:1 pair, see package-itinerary-sync.ts, not a guess), the
// guide/driver/vehicle assigned to it, real emergency contacts (India's
// generic 112 + the business's own phone — no fabricated per-destination
// hotline directory), and whether the customer has opted into live
// location sharing for this trip.
export async function GET(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller || caller.portalType !== "customer") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const company = await getCompanySettingsServer();
  const emergencyContacts = [
    { label: "Emergency (India)", phone: "112" },
    ...(company.phone ? [{ label: company.businessName, phone: company.phone }] : []),
  ];

  type BookingDoc = { id: string } & Record<string, unknown>;
  const bookingsSnap = await db.collection(FIRESTORE_COLLECTIONS.BOOKINGS)
    .where("customerId", "==", caller.entityId).get();
  const bookings: BookingDoc[] = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const relevant = selectRelevantBooking(
    bookings.map((b) => ({ id: b.id, status: b.status as string, travelDate: b.travelDate as string | null, returnDate: b.returnDate as string | null })) as BookingForSelection[]
  );

  if (!relevant) {
    const empty: CompanionData = { booking: null, itinerary: null, resources: [], emergencyContacts, liveLocationOptIn: false };
    return NextResponse.json(empty);
  }

  const bookingDoc = bookings.find((b) => b.id === relevant.id)!;

  let itinerary: CompanionData["itinerary"] = null;
  if (bookingDoc.packageId) {
    const pkgSnap = await db.collection(FIRESTORE_COLLECTIONS.PACKAGES).doc(bookingDoc.packageId as string).get();
    const itineraryId = pkgSnap.exists ? (pkgSnap.data()?.itineraryId as string | null) : null;
    if (itineraryId) {
      const itinSnap = await db.collection(FIRESTORE_COLLECTIONS.ITINERARIES).doc(itineraryId).get();
      if (itinSnap.exists) {
        const itin = itinSnap.data()!;
        itinerary = { title: itin.title as string, days: (itin.days as CompanionItineraryDay[]) ?? [] };
      }
    }
  }

  const assignmentsSnap = await db.collection(FIRESTORE_COLLECTIONS.RESOURCE_ASSIGNMENTS)
    .where("bookingId", "==", relevant.id).get();
  const resources: CompanionResourceContact[] = [];
  for (const doc of assignmentsSnap.docs) {
    const a = doc.data();
    const resourceSnap = await db.collection(FIRESTORE_COLLECTIONS.RESOURCES).doc(a.resourceId as string).get();
    if (!resourceSnap.exists) continue;
    const r = resourceSnap.data()!;
    resources.push({ type: r.type, name: r.name, phone: r.phone ?? null });
  }

  const companionId = `${relevant.id}`;
  const companionSnap = await db.collection(FIRESTORE_COLLECTIONS.TRIP_COMPANIONS).doc(companionId).get();
  let liveLocationOptIn = false;
  if (companionSnap.exists) {
    liveLocationOptIn = !!companionSnap.data()?.liveLocationOptIn;
  } else {
    const now = FieldValue.serverTimestamp();
    await db.collection(FIRESTORE_COLLECTIONS.TRIP_COMPANIONS).doc(companionId).set({
      bookingId: relevant.id, customerId: caller.entityId,
      liveLocationOptIn: false, lastLocation: null, lastLocationAt: null,
      createdAt: now, updatedAt: now, createdBy: "customer-portal", status: "active",
    });
  }

  const data: CompanionData = {
    booking: {
      id: bookingDoc.id, refNumber: bookingDoc.refNumber as string, destination: bookingDoc.destination as string,
      travelDate: bookingDoc.travelDate as string | null, returnDate: bookingDoc.returnDate as string | null,
    },
    itinerary,
    resources,
    emergencyContacts,
    liveLocationOptIn,
  };
  return NextResponse.json(data);
}
