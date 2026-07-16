// Server-only — imported by AI prompt routes, PDF generation, and
// notification templates that previously either duplicated a raw Admin SDK
// read with their own hardcoded fallback, or skipped Firestore entirely and
// hardcoded "Wanago Tours & Travels" directly. One cached read here, reused
// everywhere, so the whole app can represent a different company just by
// changing the settings/company doc — no code change needed per tenant.
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "@/modules/admin/settings/services/company-settings.service";

const DOC_ID = "company";
const SETTINGS_TTL_MS = 60_000;

let cachedSettings: { value: CompanySettings; fetchedAt: number } | null = null;

// Same 60s-TTL, never-throws pattern as geminiService.ts's getSettings() —
// a burst of requests within one warm serverless instance shouldn't each
// pay a Firestore round trip for data that rarely changes.
export async function getCompanySettingsServer(): Promise<CompanySettings> {
  if (cachedSettings && Date.now() - cachedSettings.fetchedAt < SETTINGS_TTL_MS) {
    return cachedSettings.value;
  }
  try {
    const dbAdmin = getAdminDb();
    const snap = dbAdmin ? await dbAdmin.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc(DOC_ID).get() : null;
    const value = { ...DEFAULT_COMPANY_SETTINGS, ...(snap?.data() ?? {}) } as CompanySettings;
    cachedSettings = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return DEFAULT_COMPANY_SETTINGS;
  }
}
