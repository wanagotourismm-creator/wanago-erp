import { itineraryRepository } from "@/modules/itineraries/services/itinerary.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { Itinerary, ItineraryFormData } from "@/modules/itineraries/types";

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchItineraries(): Promise<Itinerary[]> {
  const itineraries = await itineraryRepository.findMany();
  return itineraries.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchItineraryById(id: string): Promise<Itinerary | null> {
  return itineraryRepository.findById(id);
}

export async function createItinerary(
  data: ItineraryFormData,
  createdBy: string
): Promise<Itinerary> {
  const refNumber = await nextRefNumber("ITINERARY");

  return itineraryRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:      "active",
    packageName: data.packageName || null,
    notes:       data.notes || null,
  });
}

export async function updateItinerary(
  id: string,
  data: Partial<ItineraryFormData>
): Promise<void> {
  return itineraryRepository.update(id, data as Partial<Itinerary>);
}

export async function deleteItinerary(id: string): Promise<void> {
  return itineraryRepository.delete(id);
}
