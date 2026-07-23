import { where, orderBy, serverTimestamp } from "firebase/firestore";
import { sosEventRepository } from "@/modules/companion/services/sos-event.repository";
import type { SosEvent } from "@/modules/companion/types";

// Staff-facing read only — every real create happens server-side via the
// Admin-SDK /api/portal/customer/sos route (a customer has no client-SDK
// write path to this collection at all).
export async function fetchSosEventsForBooking(bookingId: string): Promise<SosEvent[]> {
  return sosEventRepository.findMany({
    constraints: [where("bookingId", "==", bookingId), orderBy("createdAt", "desc")],
  });
}

export async function resolveSosEvent(id: string, resolvedBy: string): Promise<void> {
  return sosEventRepository.update(id, {
    sosStatus: "resolved", resolvedBy, resolvedAt: serverTimestamp(),
  } as Partial<SosEvent>);
}
