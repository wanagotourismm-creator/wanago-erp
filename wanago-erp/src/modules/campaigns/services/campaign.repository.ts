import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Campaign } from "@/modules/campaigns/types";

export class CampaignRepository extends BaseRepository<Campaign> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.CAMPAIGNS);
  }
}

export const campaignRepository = new CampaignRepository();
