import { orderBy, where } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Asset } from "@/modules/assets/types";
import type { AssetSchema } from "@/modules/assets/schemas";

class AssetRepository extends BaseRepository<Asset> {
  constructor() { super(FIRESTORE_COLLECTIONS.ASSETS); }
}
const repo = new AssetRepository();

export async function fetchAssets(): Promise<Asset[]> {
  return repo.findMany({ constraints: [orderBy("name", "asc")] });
}

export async function fetchAssetsByEmployee(employeeId: string): Promise<Asset[]> {
  return repo.findMany({ constraints: [where("assignedToId", "==", employeeId)] });
}

export async function createAsset(data: AssetSchema, createdBy: string): Promise<Asset> {
  return repo.create({
    ...data,
    serialNumber:   data.serialNumber || null,
    assignedToId:   data.assignedToId || null,
    assignedToName: data.assignedToName || null,
    assignedDate:   data.assignedToId ? new Date().toISOString().slice(0, 10) : null,
    status:         "active",
    createdBy,
  });
}

export async function updateAsset(id: string, data: Partial<AssetSchema>): Promise<void> {
  const patch: Partial<Asset> = { ...data };
  if (data.assignedToId !== undefined) {
    patch.assignedToId = data.assignedToId || null;
    patch.assignedDate = data.assignedToId ? new Date().toISOString().slice(0, 10) : null;
  }
  if (data.assignedToName !== undefined) patch.assignedToName = data.assignedToName || null;
  if (data.serialNumber !== undefined) patch.serialNumber = data.serialNumber || null;
  return repo.update(id, patch);
}

export async function deleteAsset(id: string): Promise<void> {
  return repo.delete(id);
}
