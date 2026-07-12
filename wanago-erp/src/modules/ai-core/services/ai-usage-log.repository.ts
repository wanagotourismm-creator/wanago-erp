import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { AiUsageLog } from "@/modules/ai-core/types";

// Read-only from the client's perspective — aiUsageLogs' Firestore rule is
// `write: if false`, every entry is written server-side by
// ai-usage-log.service.ts. This repository exists for an eventual
// admin usage dashboard (findMany/subscribe), not for creating entries.
export class AiUsageLogRepository extends BaseRepository<AiUsageLog> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.AI_USAGE_LOGS);
  }
}

export const aiUsageLogRepository = new AiUsageLogRepository();
