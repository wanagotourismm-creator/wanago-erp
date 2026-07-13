import { itineraryRepository } from "@/modules/itineraries/services/itinerary.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { syncPackageFromItinerary } from "@/lib/package-itinerary-sync";
import { createPackageFromItinerary, linkPackageToItinerary } from "@/modules/packages/services/package.service";
import { CREATE_NEW_PACKAGE, type Itinerary, type ItineraryFormData } from "@/modules/itineraries/types";

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

  let packageId   = data.packageId || null;
  let packageName = data.packageName || null;

  if (packageId === CREATE_NEW_PACKAGE) {
    const pkg = await createPackageFromItinerary({
      title: data.title, destination: data.destination, durationDays: data.durationDays,
      officeId: data.officeId, officeName: data.officeName,
    }, createdBy);
    packageId = pkg.id;
    packageName = pkg.title;
  }

  const itinerary = await itineraryRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:      "active",
    packageId,
    packageName,
    notes:       data.notes || null,
    tripType:    data.tripType || null,
    tagline:     data.tagline || null,
  });

  if (packageId) await linkPackageToItinerary(packageId, itinerary.id);
  return itinerary;
}

export async function updateItinerary(
  id: string,
  data: Partial<ItineraryFormData>
): Promise<void> {
  const patch: Partial<Itinerary> = { ...data };

  if (data.packageId === CREATE_NEW_PACKAGE) {
    const existing = await itineraryRepository.findById(id);
    const pkg = await createPackageFromItinerary({
      title:        data.title        ?? existing?.title        ?? "",
      destination:  data.destination  ?? existing?.destination  ?? "",
      durationDays: data.durationDays ?? existing?.durationDays ?? 1,
      officeId:     existing?.officeId   ?? "",
      officeName:   existing?.officeName ?? "",
    }, data.createdBy || existing?.createdBy || "");
    patch.packageId   = pkg.id;
    patch.packageName = pkg.title;
    await linkPackageToItinerary(pkg.id, id);
  }

  await itineraryRepository.update(id, patch);
  const itin = await itineraryRepository.findById(id);
  if (itin) await syncPackageFromItinerary(itin);
}

export async function deleteItinerary(id: string): Promise<void> {
  return itineraryRepository.delete(id);
}
