import { orderBy } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { PerformanceReview, PerformanceReviewFormData } from "@/modules/performance/reviews/types";

class ReviewRepository extends BaseRepository<PerformanceReview> {
  constructor() { super(FIRESTORE_COLLECTIONS.PERFORMANCE_REVIEWS); }
}
const repo = new ReviewRepository();

export async function fetchReviews(): Promise<PerformanceReview[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function createReview(
  data: PerformanceReviewFormData,
  createdBy: string
): Promise<PerformanceReview> {
  const refNumber = await nextRefNumber("REVIEW");

  return repo.create({
    ...data,
    refNumber,
    createdBy,
    status:              "submitted",
    strengths:           data.strengths           || null,
    areasForImprovement: data.areasForImprovement  || null,
    comments:            data.comments             || null,
  });
}

export async function updateReview(
  id: string,
  data: Partial<PerformanceReviewFormData>
): Promise<void> {
  return repo.update(id, data as Partial<PerformanceReview>);
}

export async function acknowledgeReview(id: string): Promise<void> {
  return repo.update(id, { status: "acknowledged" } as Partial<PerformanceReview>);
}

export async function deleteReview(id: string): Promise<void> {
  return repo.delete(id);
}
