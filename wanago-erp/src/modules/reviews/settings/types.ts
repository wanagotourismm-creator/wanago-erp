// Admin-configurable Review & NPS engine settings — editable in
// ReviewSettingsForm.tsx so the business can tune the delay/thresholds
// without a code change.
export type ReviewSettings = {
  // Days after a booking is marked "completed" before the review/NPS
  // request goes out (see the review-requests cron).
  delayDays: number;

  // Shown to promoters as a "leave us a review" CTA on the /review/{token}
  // page. Null until an admin sets it (no CTA shown until then).
  googleReviewUrl: string | null;

  // Standard NPS bands: score >= promoterThreshold -> promoter,
  // score <= detractorThreshold -> detractor, everything between -> passive.
  promoterThreshold:  number;
  detractorThreshold: number;
};

// Shared by both the client-SDK service and the Admin-SDK server mirror —
// kept in this firebase-free file so neither pulls in the other's SDK just
// to read a plain default object.
export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  delayDays:          2,
  googleReviewUrl:    null,
  promoterThreshold:  9,
  detractorThreshold: 6,
};
