import { where } from "firebase/firestore";
import { uploadFile } from "@/lib/storage/upload";
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

// Real uploaded artwork only — proxied through /api/storage/upload to
// Supabase Storage (see lib/storage/upload.ts) like every other upload in
// the app, since Firebase Storage itself needs the Blaze plan and isn't
// provisioned. Returns a public URL, which is required here since posters
// get shared to people with no account (WhatsApp/email kit, public
// /r/{code} page).
export async function uploadReferralPosterImage(file: File): Promise<string> {
  return uploadFile(`referral-posters/${Date.now()}-${file.name}`, file);
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
