import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { WeeklySalesDigest } from "@/modules/digests/types";

// Read-only from the client's perspective — `digests` rule is
// `write: if false`, every entry is written by the weekly-sales-digest
// cron route via the Admin SDK. Dashboards read the latest doc here
// instead of recomputing the leaderboard live on every page load.
export class DigestRepository extends BaseRepository<WeeklySalesDigest> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.DIGESTS);
  }
}

export const digestRepository = new DigestRepository();
