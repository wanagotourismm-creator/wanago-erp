import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { AiSettings } from "@/modules/ai-core/types";

const DOC_ID = "aiSettings";

// Mirrors the free-tier-eligible models getAIAnswer.ts already used —
// changing these here takes effect on the next AI call, no redeploy.
export const DEFAULT_AI_SETTINGS: AiSettings = {
  geminiModel: "gemini-3.5-flash",
  groqModel:   "llama-3.3-70b-versatile",
  temperature: 0.2,
  maxOutputTokens: 500,
};

export async function fetchAiSettings(): Promise<AiSettings> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID));
  if (!snap.exists()) return DEFAULT_AI_SETTINGS;
  return { ...DEFAULT_AI_SETTINGS, ...snap.data() } as AiSettings;
}

export async function updateAiSettings(data: AiSettings, updatedBy: string): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}
