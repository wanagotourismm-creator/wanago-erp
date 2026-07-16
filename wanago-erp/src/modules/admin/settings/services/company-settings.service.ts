import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { uploadFile } from "@/lib/storage/upload";

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
  // Bank + terms shown on the branded quotation/invoice PDF's "Payable To"
  // and "Terms and conditions" boxes. paymentQrUrl is optional — a payment
  // QR code can't be safely auto-generated (wrong data could misdirect a
  // real payment), so the PDF only shows one if this is uploaded.
  bankAccountName:   string;
  bankAccountNumber: string;
  bankIfscCode:      string;
  bankName:          string;
  paymentQrUrl:      string;
  quotationTerms:    string; // one bullet per line
  // Business UPI ID (e.g. "wanagotourism@okhdfcbank") used to generate a
  // dynamic UPI payment link/QR — one with the exact invoice/booking amount
  // and a reference note baked in — directly to this account, with no
  // payment gateway or commission in between. Payment confirmation is still
  // manual (staff records it via the existing Payments flow); this only
  // replaces "customer has to type in the amount and a note by hand."
  upiId: string;
  // Printed on the branded quotation/invoice PDF footer — previously
  // hardcoded literals ("www.wanago.in", "@wana.go") with no settings field
  // to source them from, blocking white-labeling for a second tenant.
  websiteUrl:   string;
  socialHandle: string;
};

const DOC_ID = "company";

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  businessName:      "Wanago Tours & Travels",
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
  bankAccountName:   "",
  bankAccountNumber: "",
  bankIfscCode:      "",
  bankName:          "",
  paymentQrUrl:      "",
  quotationTerms:    "All rates quoted are valid for 15 days.\n50% payment should be done in advance.\nThe remaining amount should be paid before 7 days of package.",
  upiId: "",
  websiteUrl:   "",
  socialHandle: "",
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
  return uploadFile(`company/logo-${Date.now()}-${file.name}`, file);
}

export async function uploadPaymentQr(file: File): Promise<string> {
  return uploadFile(`company/payment-qr-${Date.now()}-${file.name}`, file);
}
