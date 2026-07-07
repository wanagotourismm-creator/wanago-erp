import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { CallLog } from "@/modules/call-logs/types";

export class CallLogRepository extends BaseRepository<CallLog> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.CALL_LOGS);
  }
}

export const callLogRepository = new CallLogRepository();
