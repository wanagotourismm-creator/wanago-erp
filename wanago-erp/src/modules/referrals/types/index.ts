import type { FirestoreRecord, Timestamp } from "@/types/global";

export type ReferralSettings = {
  enabled:     boolean;
  bonusAmount: number; // flat INR credited to the referrer per confirmed booking
};

export type ReferralBonus = FirestoreRecord & {
  referrerCustomerId:   string;
  referrerName:         string;
  referredCustomerId:   string;
  referredCustomerName: string;
  bookingId:            string;
  bookingRefNumber:     string;
  bonusAmount:          number;
  bonusStatus:          "pending" | "paid";
  paidBy:               string | null;
  paidAt:               Timestamp | Date | string | null;
};
