import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export type CompanySettings = {
  businessName: string;
  email:        string;
  phone:        string;
  address:      string;
  city:         string;
  gstNumber:    string;
  currency:     string;
};

const DOC_ID = "company";

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  businessName: "Wanago Tourism",
  email:        "",
  phone:        "",
  address:      "",
  city:         "",
  gstNumber:    "",
  currency:     "INR",
};

export async function fetchCompanySettings(): Promise<CompanySettings> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID));
  if (!snap.exists()) return DEFAULT_COMPANY_SETTINGS;
  return { ...DEFAULT_COMPANY_SETTINGS, ...snap.data() } as CompanySettings;
}

export async function updateCompanySettings(
  data: CompanySettings,
  updatedBy: string
): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}
