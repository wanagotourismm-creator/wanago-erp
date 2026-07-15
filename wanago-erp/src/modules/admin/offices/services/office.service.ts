import { orderBy } from "firebase/firestore";
import { officeRepository } from "@/modules/admin/offices/services/office.repository";
import { cached, invalidateCache } from "@/lib/firebase/data-cache";
import type { Office, OfficeFormData } from "@/modules/admin/offices/types";

// Offices are fetched in full on many pages (bulk-import row resolution,
// picker options) — cached since the office list rarely changes but is
// re-fetched on nearly every page navigation otherwise. See data-cache.ts.
export async function fetchOffices(): Promise<Office[]> {
  return cached("offices", 60_000, () =>
    officeRepository.findMany({ constraints: [orderBy("name", "asc")] })
  );
}

export async function createOffice(
  data: OfficeFormData,
  createdBy: string
): Promise<Office> {
  const office = await officeRepository.create({
    ...data,
    createdBy,
    status:  "active",
    address: data.address || null,
    city:    data.city    || null,
    phone:   data.phone   || null,
    latitude:             data.latitude             ?? null,
    longitude:            data.longitude            ?? null,
    geofenceRadiusMeters: data.geofenceRadiusMeters  ?? null,
  });
  invalidateCache("offices");
  return office;
}

export async function updateOffice(
  id: string,
  data: Partial<OfficeFormData>
): Promise<void> {
  await officeRepository.update(id, data as Partial<Office>);
  invalidateCache("offices");
}

export async function deleteOffice(id: string): Promise<void> {
  await officeRepository.delete(id);
  invalidateCache("offices");
}
