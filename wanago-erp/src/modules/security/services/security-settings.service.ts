import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export type SecuritySettings = {
  // A company-wide PIN required before a delete goes through anywhere in
  // the app (see PinConfirmDialog). null until a Super Admin sets one —
  // callers treat that as "not configured yet" rather than "no PIN
  // required," since the whole point is that delete stays gated.
  deletePin: string | null;
};

const DOC_ID = "security";

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  deletePin: null,
};

export async function fetchSecuritySettings(): Promise<SecuritySettings> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID));
  if (!snap.exists()) return DEFAULT_SECURITY_SETTINGS;
  const data = snap.data() as Partial<SecuritySettings>;
  return { deletePin: data.deletePin ?? null };
}

export async function updateSecuritySettings(data: SecuritySettings, updatedBy: string): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}
