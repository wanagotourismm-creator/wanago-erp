import { doc, getDoc, setDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { BaseRepository } from "@/lib/firebase/repository";
import { fetchCustomers, fetchCustomerById } from "@/modules/customers/services/customer.service";
import { toDate } from "@/lib/utils/helpers";
import type { ReferralSettings, ReferralBonus } from "@/modules/referrals/types";
import type { Booking } from "@/modules/bookings/types";
import type { Customer } from "@/modules/customers/types";

const SETTINGS_DOC_ID = "referralProgram";
const DEFAULT_SETTINGS: ReferralSettings = { enabled: false, bonusAmount: 500 };

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

export async function markReferralBonusPaid(id: string, paidBy: string): Promise<void> {
  // serverTimestamp() returns a FieldValue sentinel at write time, not the
  // real Timestamp paidAt's read-type declares — same cast pattern used
  // elsewhere in this app for the same reason (see booking.service.ts).
  return referralBonusRepo.update(id, {
    bonusStatus: "paid",
    paidBy,
    paidAt: serverTimestamp(),
  } as unknown as Partial<ReferralBonus>);
}

export async function findCustomerByReferralCode(code: string): Promise<Customer | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const customers = await fetchCustomers();
  return customers.find(c => c.referralCode?.toUpperCase() === trimmed) ?? null;
}

// Called when a booking is confirmed by Operations — credits the referrer
// once per booking (guarded by checking for an existing bonus tied to this
// exact bookingId, so a re-approval or retry can't double-pay), and only
// when the referral program is switched on and the booked customer actually
// came in via a referral. Best-effort/non-blocking: the booking is already
// confirmed regardless of whether this succeeds.
export async function createReferralBonusIfEligible(booking: Booking, createdBy: string): Promise<void> {
  try {
    const settings = await fetchReferralSettings();
    if (!settings.enabled) return;

    const customer = await fetchCustomerById(booking.customerId);
    if (!customer?.referredByCustomerId) return;

    const existingBonuses = await referralBonusRepo.findMany({ constraints: [where("bookingId", "==", booking.id)] });
    if (existingBonuses.length > 0) return;

    const referrer = await fetchCustomerById(customer.referredByCustomerId);
    if (!referrer) return;

    await referralBonusRepo.create({
      referrerCustomerId:   referrer.id,
      referrerName:         referrer.fullName,
      referredCustomerId:   customer.id,
      referredCustomerName: customer.fullName,
      bookingId:            booking.id,
      bookingRefNumber:     booking.refNumber,
      bonusAmount:          settings.bonusAmount,
      bonusStatus:          "pending",
      paidBy:               null,
      paidAt:               null,
      createdBy,
      status:               "active",
    });
  } catch {
    // Best-effort — booking confirmation must succeed regardless.
  }
}
