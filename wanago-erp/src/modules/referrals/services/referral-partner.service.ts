import { where } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { toDate } from "@/lib/utils/helpers";
import type { ReferralPartner, ReferralPartnerFormData } from "@/modules/referrals/types";

// Same generation approach as Customer.referralCode (customer.service.ts) —
// not checked for uniqueness at this scale, negligible collision odds on a
// 36^8 keyspace for a handful of partners.
function generateReferralCode(): string {
  return `RPX${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

class ReferralPartnerRepository extends BaseRepository<ReferralPartner> {
  constructor() { super(FIRESTORE_COLLECTIONS.REFERRAL_PARTNERS); }
}
const repo = new ReferralPartnerRepository();

export async function fetchReferralPartners(): Promise<ReferralPartner[]> {
  const partners = await repo.findMany();
  return partners.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchReferralPartnerById(id: string): Promise<ReferralPartner | null> {
  return repo.findById(id);
}

export async function findReferralPartnerByCode(code: string): Promise<ReferralPartner | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const matches = await repo.findMany({ constraints: [where("referralCode", "==", trimmed)] });
  return matches[0] ?? null;
}

export async function createReferralPartner(
  data: ReferralPartnerFormData,
  createdBy: string
): Promise<ReferralPartner> {
  const refNumber = await nextRefNumber("REFERRAL_PARTNER");
  return repo.create({
    ...data,
    refNumber,
    referralCode: generateReferralCode(),
    createdBy,
    status: "active",
    email:             data.email             || null,
    upiId:             data.upiId             || null,
    bankAccountName:   data.bankAccountName    || null,
    bankAccountNumber: data.bankAccountNumber  || null,
    bankIfscCode:      data.bankIfscCode       || null,
    notes:             data.notes              || null,
  });
}

export async function updateReferralPartner(
  id: string,
  data: Partial<ReferralPartnerFormData>
): Promise<void> {
  return repo.update(id, data as Partial<ReferralPartner>);
}

export async function deleteReferralPartner(id: string): Promise<void> {
  return repo.delete(id);
}
