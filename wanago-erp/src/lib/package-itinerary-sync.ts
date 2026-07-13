import { itineraryRepository } from "@/modules/itineraries/services/itinerary.repository";
import { packageRepository } from "@/modules/packages/services/package.repository";

// Keeps a linked Package/Itinerary pair's shared fields — title,
// destination, duration — consistent regardless of which side was just
// edited. Whichever record was just saved is treated as the source of
// truth for that sync pass. Imports the leaf repositories directly (not
// the higher-level *.service.ts files) so package.service.ts and
// itinerary.service.ts can both depend on this module without forming an
// import cycle with each other.

type PackageSyncFields = { id: string; itineraryId: string | null; title: string; destination: string; durationDays: number };
type ItinerarySyncFields = { id: string; packageId: string | null; title: string; destination: string; durationDays: number };

export async function syncItineraryFromPackage(pkg: PackageSyncFields): Promise<void> {
  if (!pkg.itineraryId) return;
  await itineraryRepository.update(pkg.itineraryId, {
    destination:  pkg.destination,
    durationDays: pkg.durationDays,
    packageName:  pkg.title,
    packageId:    pkg.id,
  });
}

export async function syncPackageFromItinerary(itin: ItinerarySyncFields): Promise<void> {
  if (!itin.packageId) return;
  await packageRepository.update(itin.packageId, {
    destination:    itin.destination,
    durationDays:   itin.durationDays,
    durationNights: Math.max(itin.durationDays - 1, 0),
    title:          itin.title,
    itineraryId:    itin.id,
  });
}
