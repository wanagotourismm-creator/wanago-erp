import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Journey } from "@/modules/journeys/types";

export class JourneyRepository extends BaseRepository<Journey> {
  constructor() { super(FIRESTORE_COLLECTIONS.JOURNEYS); }
}

export const journeyRepository = new JourneyRepository();
