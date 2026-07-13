import type { FirestoreRecord, Timestamp } from "@/types/global";

export type ReferralSettings = {
  enabled:     boolean;
  bonusAmount: number; // flat INR credited to the referrer per confirmed booking
  // Freelance Referral Executives are non-customers doing this in place of
  // a salary — separately configurable so they can be paid a higher rate
  // than a past-customer referral without changing the customer default.
  partnerBonusAmount: number;
};

export type ReferrerType = "customer" | "partner";

export type ReferralBonus = FirestoreRecord & {
  // Exactly one of referrerCustomerId / referrerPartnerId is set, per
  // referrerType — kept as two nullable fields rather than one generic
  // "referrerId" so existing bonus records (all referrerType "customer",
  // written before Freelance Referral Executives existed) don't need a
  // migration; missing referrerType is treated as "customer".
  referrerType:         ReferrerType;
  referrerCustomerId:   string | null;
  referrerPartnerId:    string | null;
  referrerName:         string;
  referredCustomerId:   string;
  referredCustomerName: string;
  bookingId:            string;
  bookingRefNumber:     string;
  bookingRevenue:       number; // the confirmed booking's totalAmount at the time the bonus was created — powers the analytics revenue-per-referrer view without a re-fetch of Bookings
  bonusAmount:          number;
  bonusStatus:          "pending" | "paid";
  paidBy:               string | null;
  paidAt:               Timestamp | Date | string | null;
};

export type ReferralPartnerPayoutMethod = "upi" | "bank";

// A Freelance Referral Executive — someone referring customers to Wanago
// purely for the payout, with no employee record and no prior booking.
// Not a system user (no login): staff manage this record and hand the
// partner their share kit via WhatsApp/email (see ShareKitModal).
export type ReferralPartner = FirestoreRecord & {
  refNumber:     string;
  fullName:      string;
  phone:         string;
  email:         string | null;
  referralCode:  string; // unique, same shape/uniqueness as Customer.referralCode

  payoutMethod:      ReferralPartnerPayoutMethod;
  upiId:             string | null;
  bankAccountName:   string | null;
  bankAccountNumber: string | null;
  bankIfscCode:      string | null;

  partnerStatus: "active" | "inactive";
  notes:         string | null;
};

export type ReferralPartnerFormData = Omit<
  ReferralPartner,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "status" | "refNumber" | "referralCode"
>;

// A piece of shareable creative (poster/template) admins upload — the real
// artwork is a real uploaded file, never generated/faked; only the caption
// text can be AI-drafted (see referral-caption-ai.service.ts).
export type ReferralPoster = FirestoreRecord & {
  title:            string;
  imageUrl:         string;
  captionTemplate:  string; // may reference the destination; the tracking link is always appended separately, never baked in (it's per-referrer)
  destination:      string | null;
  posterStatus:     "active" | "archived";
};

export type ReferralPosterFormData = Omit<
  ReferralPoster, "id" | "createdAt" | "updatedAt" | "createdBy" | "status"
>;

// One doc per /r/{code} page load — see the route's comment on why this
// measures link opens rather than deduplicated unique visitors.
export type ReferralClick = FirestoreRecord & {
  code:         string;
  referrerType: ReferrerType;
  referrerId:   string;
};
