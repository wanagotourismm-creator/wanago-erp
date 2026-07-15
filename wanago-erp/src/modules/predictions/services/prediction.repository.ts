import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { AiPredictionsReport } from "@/modules/predictions/types";

export class PredictionRepository extends BaseRepository<AiPredictionsReport> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.AI_PREDICTIONS);
  }
}

export const predictionRepository = new PredictionRepository();
