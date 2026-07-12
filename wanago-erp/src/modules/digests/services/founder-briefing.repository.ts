import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { FounderBriefingDigest } from "@/modules/digests/types";

// Same `digests` collection as DigestRepository (WeeklySalesDigest) — the
// two are told apart by `type`, same discriminated-union precedent as
// AiUsageLog's `outcome`/`provider` fields living alongside unrelated
// records in one Firestore collection.
export class FounderBriefingRepository extends BaseRepository<FounderBriefingDigest> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.DIGESTS);
  }
}

export const founderBriefingRepository = new FounderBriefingRepository();
