import { where, type QueryConstraint } from "firebase/firestore";
import { packageRepository } from "@/modules/packages/services/package.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
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
  });
}

export async function updatePackage(
  id: string,
  data: Partial<PackageFormData>
): Promise<void> {
  return packageRepository.update(id, data as Partial<Package>);
}

export async function deletePackage(id: string): Promise<void> {
  return packageRepository.delete(id);
}
