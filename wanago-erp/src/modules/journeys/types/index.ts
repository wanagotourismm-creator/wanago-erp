import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";
import type { CustomerSegment } from "@/modules/customers/utils/segment";

export type JourneyTrigger =
  | { type: "quote_sent" }
  | { type: "quote_unaccepted"; afterDays: number }
  | { type: "trip_completed" }
  // Time-based, same shape as quote_unaccepted — scanned in
  // scanTimeBasedTriggers (journey-engine.server.ts) against each lead's
  // last real contact (call-log createdAt, falling back to Lead.createdAt
  // if never contacted — NOT Lead.lastContactedAt, a confirmed-dead field
  // never written anywhere in this app).
  | { type: "lead_stale"; afterDays: number };

// "create task" is deliberately not its own tracked record — no generic
// task-tracking system exists anywhere in this app (OnboardingTask is
// HR-onboarding-specific), so this action reuses the existing notifyUser
// (in-app + email) instead of inventing a fourth collection beyond the
// PRD's stated three (journeys/journeyRuns/segments).
export type JourneyStep =
  | { type: "wait"; days: number }
  | { type: "send_whatsapp"; purpose: string; fallbackBodyTemplate: string }
  | { type: "send_email"; subjectTemplate: string; bodyTemplate: string }
  | { type: "notify_agent"; messageTemplate: string }
  | { type: "add_to_segment"; segmentId: string };

export type Journey = FirestoreRecord & {
  name:     string;
  isActive: boolean;
  trigger:  JourneyTrigger;
  steps:    JourneyStep[];
  // Optional loose association only — campaigns has no messaging/segment/
  // analytics capability of its own, so this is not an inheritance link.
  campaignId: string | null;

  // Denormalized counters rolled forward by the journey-engine cron, so
  // the Analytics tab never needs a full journeyRuns scan to render.
  enteredCount:   number;
  sentCount:      number;
  repliedCount:   number;
  convertedCount: number;
  revenueTotal:   number;
};

export type JourneyFormData = Omit<
  Journey,
  "id" | "createdAt" | "updatedAt" | "status" | "createdBy" |
  "enteredCount" | "sentCount" | "repliedCount" | "convertedCount" | "revenueTotal"
>;

// "stopped_resolved" — the lead moved to won/lost mid-journey (only ever
// checked for entityType: "lead" runs, see executeJourneyStep) — distinct
// from stopped_optout (customer/lead asked not to be contacted) and
// stopped_error (something broke), since this one just means the nurture
// sequence is no longer needed, not that something went wrong.
export type JourneyRunStatus = "active" | "completed" | "stopped_optout" | "stopped_error" | "stopped_resolved";

export type JourneyRun = FirestoreRecord & {
  journeyId:   string;
  entityType:  "lead" | "customer";
  entityId:    string;
  entityName:  string;
  entityPhone: string | null;
  entityEmail: string | null;
  agentId:     string | null;

  currentStepIndex: number;
  nextStepDueAt:    Timestamp | Date | string | FieldValue;
  runStatus:        JourneyRunStatus;

  sentWhatsappCount: number;
  sentEmailCount:    number;
  // Reply/conversion are proxies, not exact attribution — see
  // journey-engine.server.ts's updateAnalytics for how they're derived.
  repliedAt:          Timestamp | Date | string | FieldValue | null;
  convertedBookingId: string | null;
  convertedRevenue:   number | null;
};

export type SegmentEntityType = "lead" | "customer" | "both";

export type SegmentFilters = {
  destinationIn?: string[];
  sourceIn?: string[];
  // Customers only — computed via computeCustomerSegments, not a stored field.
  customerSegmentIn?: CustomerSegment[];
  // A rough regional proxy (substring match against Customer.city/address)
  // — NOT a real nationality/region field. No such field exists anywhere
  // in this app, so "Gulf NRI"-style targeting is only ever this
  // approximation, never a true region flag.
  cityContains?: string | null;
};

export type Segment = FirestoreRecord & {
  name:       string;
  entityType: SegmentEntityType;
  filters:    SegmentFilters;
};

export type SegmentFormData = Omit<Segment, "id" | "createdAt" | "updatedAt" | "status" | "createdBy">;
