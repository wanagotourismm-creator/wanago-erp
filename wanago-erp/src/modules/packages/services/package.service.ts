import { where, type QueryConstraint } from "firebase/firestore";
import { packageRepository } from "@/modules/packages/services/package.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { syncItineraryFromPackage } from "@/lib/package-itinerary-sync";
import type { Package, PackageFormData } from "@/modules/packages/types";

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchPackages(filters?: {
  packageStatus?: string;
  officeId?:      string;
}): Promise<Package[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.packageStatus) constraints.push(where("packageStatus", "==", filters.packageStatus));
  if (filters?.officeId)      constraints.push(where("officeId",      "==", filters.officeId));
  const packages = await packageRepository.findMany({ constraints });
  return packages.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchPackageById(id: string): Promise<Package | null> {
  return packageRepository.findById(id);
}

export async function createPackage(
  data: PackageFormData,
  createdBy: string
): Promise<Package> {
  const refNumber = await nextRefNumber("PACKAGE");

  return packageRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:        "active",
    packageStatus: data.packageStatus || "active",
    inclusions:    data.inclusions || "",
    exclusions:    data.exclusions || "",
    validFrom:     data.validFrom  || null,
    validTo:       data.validTo    || null,
    notes:         data.notes      || null,
    itineraryId:   null,
  });
}

// Used by itinerary.service.createItinerary/updateItinerary's "+ Create new
// package" flow — a minimal Package seeded from the Itinerary's own trip
// details, linked back via linkPackageToItinerary() once the Itinerary's id
// is known (chicken-and-egg: the package must exist before the itinerary can
// point at it, but its id isn't known until after the itinerary is created).
export async function createPackageFromItinerary(
  itin: { title: string; destination: string; durationDays: number; officeId: string; officeName: string },
  createdBy: string
): Promise<Package> {
  const refNumber = await nextRefNumber("PACKAGE");
  return packageRepository.create({
    title:          itin.title,
    destination:    itin.destination,
    category:       "General",
    durationDays:   itin.durationDays,
    durationNights: Math.max(itin.durationDays - 1, 0),
    basePrice:      0,
    costPrice:      0,
    inclusions:     "",
    exclusions:     "",
    validFrom:      null,
    validTo:        null,
    officeId:       itin.officeId,
    officeName:     itin.officeName,
    notes:          null,
    refNumber,
    createdBy,
    status:         "active",
    packageStatus:  "active",
    itineraryId:    null,
  });
}

export async function linkPackageToItinerary(packageId: string, itineraryId: string): Promise<void> {
  await packageRepository.update(packageId, { itineraryId });
}

export async function updatePackage(
  id: string,
  data: Partial<PackageFormData>
): Promise<void> {
  await packageRepository.update(id, data as Partial<Package>);
  const pkg = await packageRepository.findById(id);
  if (pkg) await syncItineraryFromPackage(pkg);
}

export async function deletePackage(id: string): Promise<void> {
  return packageRepository.delete(id);
}
