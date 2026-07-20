// Server-only mirror of review-settings.service.ts for the cron and public
// API routes, which use the Admin SDK and can't call the client-SDK
// version. Same 60s-TTL cache pattern as company-settings.server.ts.
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { DEFAULT_REVIEW_SETTINGS, type ReviewSettings } from "@/modules/reviews/settings/types";

const DOC_ID = "reviews";
const SETTINGS_TTL_MS = 60_000;

let cachedSettings: { value: ReviewSettings; fetchedAt: number } | null = null;

export async function getReviewSettingsServer(): Promise<ReviewSettings> {
  if (cachedSettings && Date.now() - cachedSettings.fetchedAt < SETTINGS_TTL_MS) {
    return cachedSettings.value;
  }
  try {
    const dbAdmin = getAdminDb();
    const snap = dbAdmin ? await dbAdmin.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc(DOC_ID).get() : null;
    const value = { ...DEFAULT_REVIEW_SETTINGS, ...(snap?.data() ?? {}) } as ReviewSettings;
    cachedSettings = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return DEFAULT_REVIEW_SETTINGS;
  }
}

export function classifyNpsScore(score: number, settings: ReviewSettings): "promoter" | "passive" | "detractor" {
  if (score >= settings.promoterThreshold) return "promoter";
  if (score <= settings.detractorThreshold) return "detractor";
  return "passive";
}
