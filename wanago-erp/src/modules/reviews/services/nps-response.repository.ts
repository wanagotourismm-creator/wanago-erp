import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { NpsResponse } from "@/modules/reviews/types";

export class NpsResponseRepository extends BaseRepository<NpsResponse> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.NPS_RESPONSES);
  }
}

export const npsResponseRepository = new NpsResponseRepository();
