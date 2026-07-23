import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { ResourceBlackout } from "@/modules/resources/types";

export class ResourceBlackoutRepository extends BaseRepository<ResourceBlackout> {
  constructor() { super(FIRESTORE_COLLECTIONS.RESOURCE_BLACKOUTS); }
}

export const resourceBlackoutRepository = new ResourceBlackoutRepository();
