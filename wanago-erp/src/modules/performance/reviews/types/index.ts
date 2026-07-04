import type { FirestoreRecord } from "@/types/global";
import type { Rating } from "@/lib/constants";

export type ReviewType = "quarterly" | "annual";

export type PerformanceReview = Omit<FirestoreRecord, "status"> & {
  refNumber:            string;
  employeeId:           string;
  employeeName:         string;
  reviewType:           ReviewType;
  period:               string;
  reviewerId:           string;
  reviewerName:         string;
  rating:               Rating;
  strengths:            string | null;
  areasForImprovement:  string | null;
  comments:             string | null;
  reviewDate:           string;
  status:               "draft" | "submitted" | "acknowledged";
  officeId:             string;
  officeName:           string;
};

export type PerformanceReviewFormData = Omit<
  PerformanceReview,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status"
>;
