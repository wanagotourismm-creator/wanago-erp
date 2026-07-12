import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { where } from "firebase/firestore";
import { storage } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import type { ReferralPoster, ReferralPosterFormData } from "@/modules/referrals/types";

class ReferralPosterRepository extends BaseRepository<ReferralPoster> {
  constructor() { super(FIRESTORE_COLLECTIONS.REFERRAL_POSTERS); }
}
const repo = new ReferralPosterRepository();

export async function fetchReferralPosters(activeOnly = false): Promise<ReferralPoster[]> {
  const posters = await repo.findMany({
    constraints: activeOnly ? [where("posterStatus", "==", "active")] : [],
  });
  return posters.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

// Real uploaded artwork only — same Storage upload pattern as
// uploadCompanyLogo (company-settings.service.ts); never generated/faked.
export async function uploadReferralPosterImage(file: File): Promise<string> {
  const storageRef = ref(storage, `referral-posters/${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function createReferralPoster(
  data: ReferralPosterFormData,
  createdBy: string
): Promise<ReferralPoster> {
  return repo.create({
    ...data,
    createdBy,
    status: "active",
    destination: data.destination || null,
  });
}

export async function updateReferralPoster(
  id: string,
  data: Partial<ReferralPosterFormData>
): Promise<void> {
  return repo.update(id, data as Partial<ReferralPoster>);
}

export async function deleteReferralPoster(id: string): Promise<void> {
  return repo.delete(id);
}
