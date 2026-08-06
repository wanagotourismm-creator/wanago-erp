import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { AiActionLog } from "@/modules/ai-core/types";

// Read-only from the client's perspective, mirroring ai-usage-log.repository.ts
// — aiActionLogs' Firestore rule is `write: if false` (admin-readable),
// every entry is written server-side by ai-action-log.service.ts. Exists
// for the AI Employee dashboard's audit-trail feed.
export class AiActionLogRepository extends BaseRepository<AiActionLog> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.AI_ACTION_LOGS);
  }
}

export const aiActionLogRepository = new AiActionLogRepository();
