import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { DEFAULT_REVIEW_SETTINGS, type ReviewSettings } from "@/modules/reviews/settings/types";

const DOC_ID = "reviews";

export async function fetchReviewSettings(): Promise<ReviewSettings> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID));
  if (!snap.exists()) return DEFAULT_REVIEW_SETTINGS;
  return { ...DEFAULT_REVIEW_SETTINGS, ...snap.data() } as ReviewSettings;
}

export async function updateReviewSettings(
  data: ReviewSettings,
  updatedBy: string
): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}
