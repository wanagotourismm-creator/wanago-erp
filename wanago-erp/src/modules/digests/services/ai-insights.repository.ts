import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { AiInsightsReport } from "@/modules/digests/types";

// Same `digests` collection as FounderBriefingRepository/DigestRepository —
// told apart by `type`.
export class AiInsightsRepository extends BaseRepository<AiInsightsReport> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.DIGESTS);
  }
}

export const aiInsightsRepository = new AiInsightsRepository();
