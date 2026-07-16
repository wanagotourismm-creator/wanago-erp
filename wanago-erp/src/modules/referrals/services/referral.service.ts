import { doc, getDoc, setDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS, WHATSAPP_TEMPLATE_PURPOSES } from "@/lib/constants";
import { BaseRepository } from "@/lib/firebase/repository";
import { fetchCustomers, fetchCustomerById } from "@/modules/customers/services/customer.service";
import { findReferralPartnerByCode, fetchReferralPartnerById } from "@/modules/referrals/services/referral-partner.service";
import { toDate, formatCurrency } from "@/lib/utils/helpers";
import { notifyUser } from "@/lib/notify";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import type { ReferralSettings, ReferralBonus } from "@/modules/referrals/types";
import type { Booking } from "@/modules/bookings/types";
import type { Customer } from "@/modules/customers/types";

const SETTINGS_DOC_ID = "referralProgram";
const DEFAULT_SETTINGS: ReferralSettings = { enabled: false, bonusAmount: 500, partnerBonusAmount: 500 };

export async function fetchReferralSettings(): Promise<ReferralSettings> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, SETTINGS_DOC_ID));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...snap.data() } as ReferralSettings;
}

export async function updateReferralSettings(data: ReferralSettings, updatedBy: string): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, SETTINGS_DOC_ID), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}

class ReferralBonusRepository extends BaseRepository<ReferralBonus> {
  constructor() { super(FIRESTORE_COLLECTIONS.REFERRAL_BONUSES); }
}
const referralBonusRepo = new ReferralBonusRepository();

export async function fetchReferralBonuses(): Promise<ReferralBonus[]> {
  const bonuses = await referralBonusRepo.findMany();
  return bonuses.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchReferralBonusesForCustomer(referrerCustomerId: string): Promise<ReferralBonus[]> {
  const bonuses = await referralBonusRepo.findMany({ constraints: [where("referrerCustomerId", "==", referrerCustomerId)] });
  return bonuses.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchReferralBonusesForPartner(referrerPartnerId: string): Promise<ReferralBonus[]> {
  const bonuses = await referralBonusRepo.findMany({ constraints: [where("referrerPartnerId", "==", referrerPartnerId)] });
  return bonuses.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function markReferralBonusPaid(id: string, paidBy: string): Promise<void> {
  const bonus = await referralBonusRepo.findById(id);

  // serverTimestamp() returns a FieldValue sentinel at write time, not the
  // real Timestamp paidAt's read-type declares — same cast pattern used
  // elsewhere in this app for the same reason (see booking.service.ts).
  await referralBonusRepo.update(id, {
    bonusStatus: "paid",
    paidBy,
    paidAt: serverTimestamp(),
  } as unknown as Partial<ReferralBonus>);

  // Best-effort — the payout itself is already recorded above regardless
  // of whether the referrer can be reached. Outside a 24h WhatsApp window,
  // notifyUser() falls back to an approved template if one's registered
  // for this purpose (see Admin -> WhatsApp Templates); email is the more
  // reliable fallback when they have one on file either way.
  if (bonus) {
    const referrer = bonus.referrerType === "partner"
      ? await fetchReferralPartnerById(bonus.referrerPartnerId ?? "")
      : await fetchCustomerById(bonus.referrerCustomerId ?? "");
    if (referrer) {
      const company = await fetchCompanySettings();
      notifyUser({
        email: referrer.email ?? null,
        phone: referrer.phone ?? null,
        whatsappPurpose: WHATSAPP_TEMPLATE_PURPOSES.REFERRAL_BONUS_PAID,
        whatsappVariables: [referrer.fullName, formatCurrency(bonus.bonusAmount), bonus.referredCustomerName],
        title: "Your referral bonus has been paid",
        body: `${formatCurrency(bonus.bonusAmount)} for referring ${bonus.referredCustomerName} (${bonus.bookingRefNumber}) has been paid out. Thanks for referring ${company.businessName}!`,
        category: "system",
      }).catch(() => {});
    }
  }
}

export async function findCustomerByReferralCode(code: string): Promise<Customer | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const customers = await fetchCustomers();
  return customers.find(c => c.referralCode?.toUpperCase() === trimmed) ?? null;
}

export type ResolvedReferrer =
  | { type: "customer"; id: string; name: string }
  | { type: "partner";  id: string; name: string }
  | null;

// Checks both referrer pools for a code entered on a Lead/Customer form (or
// resolved server-side by the public /r/{code} link) — a code only ever
// belongs to one or the other, customers and partners draw from separate
// generateReferralCode() calls with different prefixes (REF vs RPX) so
// collision between the two pools isn't a real concern.
export async function resolveReferralCode(code: string): Promise<ResolvedReferrer> {
  const customer = await findCustomerByReferralCode(code);
  if (customer) return { type: "customer", id: customer.id, name: customer.fullName };

  const partner = await findReferralPartnerByCode(code);
  if (partner) return { type: "partner", id: partner.id, name: partner.fullName };

  return null;
}

// Called when a booking is confirmed by Operations — credits the referrer
// once per booking (guarded by checking for an existing bonus tied to this
// exact bookingId, so a re-approval or retry can't double-pay), and only
// when the referral program is switched on and the booked customer actually
// came in via a referral (either a past customer's code, or a Freelance
// Referral Executive's code). Best-effort/non-blocking: the booking is
// already confirmed regardless of whether this succeeds.
export async function createReferralBonusIfEligible(booking: Booking, createdBy: string): Promise<void> {
  try {
    const settings = await fetchReferralSettings();
    if (!settings.enabled) return;

    const customer = await fetchCustomerById(booking.customerId);
    if (!customer) return;
    if (!customer.referredByCustomerId && !customer.referredByPartnerId) return;

    const existingBonuses = await referralBonusRepo.findMany({ constraints: [where("bookingId", "==", booking.id)] });
    if (existingBonuses.length > 0) return;

    if (customer.referredByCustomerId) {
      const referrer = await fetchCustomerById(customer.referredByCustomerId);
      if (!referrer) return;
      await referralBonusRepo.create({
        referrerType:         "customer",
        referrerCustomerId:   referrer.id,
        referrerPartnerId:    null,
        referrerName:         referrer.fullName,
        referredCustomerId:   customer.id,
        referredCustomerName: customer.fullName,
        bookingId:            booking.id,
        bookingRefNumber:     booking.refNumber,
        bookingRevenue:       booking.totalAmount ?? 0,
        bonusAmount:          settings.bonusAmount,
        bonusStatus:          "pending",
        paidBy:               null,
        paidAt:               null,
        createdBy,
        status:               "active",
      });
      return;
    }

    if (customer.referredByPartnerId) {
      const referrer = await fetchReferralPartnerById(customer.referredByPartnerId);
      if (!referrer) return;
      await referralBonusRepo.create({
        referrerType:         "partner",
        referrerCustomerId:   null,
        referrerPartnerId:    referrer.id,
        referrerName:         referrer.fullName,
        referredCustomerId:   customer.id,
        referredCustomerName: customer.fullName,
        bookingId:            booking.id,
        bookingRefNumber:     booking.refNumber,
        bookingRevenue:       booking.totalAmount ?? 0,
        bonusAmount:          settings.partnerBonusAmount,
        bonusStatus:          "pending",
        paidBy:               null,
        paidAt:               null,
        createdBy,
        status:               "active",
      });
    }
  } catch {
    // Best-effort — booking confirmation must succeed regardless.
  }
}
