import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { JourneyRun } from "@/modules/journeys/types";

export class JourneyRunRepository extends BaseRepository<JourneyRun> {
  constructor() { super(FIRESTORE_COLLECTIONS.JOURNEY_RUNS); }
}

export const journeyRunRepository = new JourneyRunRepository();
