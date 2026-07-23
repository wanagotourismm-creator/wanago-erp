import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { SosEvent } from "@/modules/companion/types";

export class SosEventRepository extends BaseRepository<SosEvent> {
  constructor() { super(FIRESTORE_COLLECTIONS.SOS_EVENTS); }
}

export const sosEventRepository = new SosEventRepository();
