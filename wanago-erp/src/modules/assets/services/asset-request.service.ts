import { orderBy, where, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { AssetRequest } from "@/modules/assets/types";
import type { AssetRequestSchema } from "@/modules/assets/schemas";

class AssetRequestRepository extends BaseRepository<AssetRequest> {
  constructor() { super(FIRESTORE_COLLECTIONS.ASSET_REQUESTS); }
}
const repo = new AssetRequestRepository();

export async function fetchAssetRequests(): Promise<AssetRequest[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function fetchAssetRequestsByEmployee(employeeId: string): Promise<AssetRequest[]> {
  return repo.findMany({ constraints: [where("employeeId", "==", employeeId), orderBy("createdAt", "desc")] });
}

export async function createAssetRequest(data: AssetRequestSchema, createdBy: string): Promise<AssetRequest> {
  return repo.create({
    ...data,
    requestStatus: "pending",
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    createdBy,
    status: "active",
  });
}

export async function approveAssetRequest(id: string, approvedBy: string): Promise<void> {
  return repo.update(id, { requestStatus: "approved", approvedBy, approvedAt: serverTimestamp(), rejectedBy: null });
}

export async function rejectAssetRequest(id: string, rejectedBy: string): Promise<void> {
  return repo.update(id, { requestStatus: "rejected", rejectedBy, approvedBy: null, approvedAt: null });
}

export async function deleteAssetRequest(id: string): Promise<void> {
  return repo.delete(id);
}
