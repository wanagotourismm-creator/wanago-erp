import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { ReviewRequest } from "@/modules/reviews/types";

export class ReviewRequestRepository extends BaseRepository<ReviewRequest> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.REVIEW_REQUESTS);
  }
}

export const reviewRequestRepository = new ReviewRequestRepository();
