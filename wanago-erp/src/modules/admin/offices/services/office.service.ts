import { orderBy } from "firebase/firestore";
import { officeRepository } from "@/modules/admin/offices/services/office.repository";
import type { Office, OfficeFormData } from "@/modules/admin/offices/types";

export async function fetchOffices(): Promise<Office[]> {
  return officeRepository.findMany({ constraints: [orderBy("name", "asc")] });
}

export async function createOffice(
  data: OfficeFormData,
  createdBy: string
): Promise<Office> {
  return officeRepository.create({
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
}

export async function updateOffice(
  id: string,
  data: Partial<OfficeFormData>
): Promise<void> {
  return officeRepository.update(id, data as Partial<Office>);
}

export async function deleteOffice(id: string): Promise<void> {
  return officeRepository.delete(id);
}
