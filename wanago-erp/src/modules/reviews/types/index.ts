import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";

export type NpsCategory = "promoter" | "passive" | "detractor";

// Created the moment a booking's status becomes "completed" (see
// scheduleReviewRequest / booking.service.ts) — one per booking, sent by
// the review-requests cron once `scheduledFor` has passed. `token` is the
// public, no-login key for the /review/{token} page, same idiom as
// Lead.bookingLinkToken.
export type ReviewRequest = FirestoreRecord & {
  bookingId:        string;
  bookingRefNumber: string;

  customerId:    string;
  customerName:  string;
  customerPhone: string;
  customerEmail: string | null;

  destination: string;
  assignedTo:  string | null;
  agentName:   string | null;
  officeId:    string;
  officeName:  string;

  token: string;

  scheduledFor: Timestamp | Date | string | FieldValue;
  sentAt:       Timestamp | Date | string | FieldValue | null;
  sentChannels: { whatsapp: boolean; email: boolean } | null;
  respondedAt:  Timestamp | Date | string | FieldValue | null;
};

export type NpsResponse = FirestoreRecord & {
  reviewRequestId: string;
  bookingId:       string;

  customerId:   string;
  customerName: string;

  score:    number; // 0-10
  comment:  string | null;
  category: NpsCategory;

  destination: string;
  agentName:   string | null;
  officeId:    string;
  officeName:  string;

  // Set when a detractor response auto-created a service-recovery ticket.
  ticketId: string | null;
};
