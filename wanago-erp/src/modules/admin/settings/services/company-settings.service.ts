import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export type CompanySettings = {
  businessName:      string;
  email:             string;
  phone:             string;
  address:           string;
  city:              string;
  gstNumber:         string;
  currency:          string;
  logoUrl:           string;
  taxRate:           number;
  serviceChargeRate: number;
  maintenanceMode:   boolean;
  maintenanceMessage: string;
  // Company doesn't collect GST today — this gates whether tax fields show
  // up anywhere (invoice/quotation forms + PDFs) so it can be switched on
  // later without any code change.
  gstEnabled:        boolean;
  // Placeholder rate for the profit-based sales incentive — the real
  // formula is coming later, this just seeds a configurable % so the
  // calculation has something to read until then.
  incentiveRatePercent: number;
};

const DOC_ID = "company";

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  businessName:      "Wanago Tourism",
  email:             "",
  phone:             "",
  address:           "",
  city:              "",
  gstNumber:         "",
  currency:          "INR",
  logoUrl:           "",
  taxRate:           0,
  serviceChargeRate: 0,
  maintenanceMode:   false,
  maintenanceMessage: "We're performing scheduled maintenance. Please check back shortly.",
  gstEnabled:        false,
  incentiveRatePercent: 10,
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

export async function uploadCompanyLogo(file: File): Promise<string> {
  const storageRef = ref(storage, `company/logo-${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
