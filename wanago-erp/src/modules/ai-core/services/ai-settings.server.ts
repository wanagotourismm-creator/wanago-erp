// Server-only Admin-SDK read of settings/aiSettings — mirrors
// company-settings.server.ts's cached-read pattern. Kept separate from
// ai-settings.service.ts (client SDK, used by the Admin > AI Employee panel)
// since API routes have no authenticated client Firestore session.
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { DEFAULT_AI_SETTINGS } from "@/modules/ai-core/services/ai-settings.service";
import type { AiSettings } from "@/modules/ai-core/types";

const DOC_ID = "aiSettings";
const SETTINGS_TTL_MS = 60_000;

let cachedSettings: { value: AiSettings; fetchedAt: number } | null = null;

export async function getAiSettingsServer(): Promise<AiSettings> {
  if (cachedSettings && Date.now() - cachedSettings.fetchedAt < SETTINGS_TTL_MS) {
    return cachedSettings.value;
  }
  try {
    const dbAdmin = getAdminDb();
    const snap = dbAdmin ? await dbAdmin.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc(DOC_ID).get() : null;
    const value = { ...DEFAULT_AI_SETTINGS, ...(snap?.data() ?? {}) } as AiSettings;
    cachedSettings = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export async function isAiEmployeeEnabled(): Promise<boolean> {
  const settings = await getAiSettingsServer();
  return settings.aiEmployeeEnabled !== false;
}

export async function isAiAutoFixEnabled(): Promise<boolean> {
  const settings = await getAiSettingsServer();
  return settings.aiAutoFixEnabled === true;
}

export async function isAiWhatsAppReplyEnabled(): Promise<boolean> {
  const settings = await getAiSettingsServer();
  return settings.aiWhatsAppReplyEnabled === true;
}
