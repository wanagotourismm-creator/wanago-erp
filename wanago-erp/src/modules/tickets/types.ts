import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TicketSourceType = "manual" | "nps_detractor";

// "video" is the raw uploaded recording (kept for a human to watch, never
// analyzed itself). "video-frame" entries are sampled client-side from that
// recording (see src/lib/media/extractVideoFrames.ts) so the AI diagnosis
// pipeline has still images it can actually run vision analysis on.
export type TicketAttachmentType = "image" | "video" | "video-frame";

export type TicketAttachment = {
  url:      string;
  type:     TicketAttachmentType;
  mimeType: string;
  name:     string;
};

// Lifecycle of an AI-proposed code fix: null until a diagnosis has run,
// "pending_review" once the AI is confident and is waiting on a human, then
// "approved" (a draft PR was opened) or "rejected" (dismissed, nothing was
// ever pushed to GitHub) — see ai-bugfix.service.ts.
export type AiFixReviewStatus = "pending_review" | "approved" | "rejected";

export type Ticket = FirestoreRecord & {
  refNumber:       string;
  title:           string;
  description:     string;
  category:        string;
  priority:        TicketPriority;
  ticketStatus:    TicketStatus;
  reportedById:    string;
  reportedByName:  string;
  assignedToId:    string | null;
  assignedToName:  string | null;
  officeId:        string;
  resolutionNotes: string | null;
  resolvedAt:      Timestamp | Date | string | FieldValue | null;

  // Stamped once, the first time a ticket moves out of "open" (assignment
  // or a direct status change) — see ticket.service.ts. This is a proxy for
  // "first response," not a literal reply: no comment/reply thread exists
  // anywhere in this module, so "staff first acknowledged it" is the most
  // honest thing this field can mean. Never overwritten once set, so a
  // later reassignment doesn't reset the original response time. Used by
  // ticket-sla.service.ts's response-SLA clock.
  firstRespondedAt: Timestamp | Date | string | FieldValue | null;

  // Set by the Review & NPS engine when a detractor response auto-creates
  // this ticket — lets the UI show "why does this ticket exist" and link
  // back to the booking, without which a "system"-reported ticket would
  // look identical to a normal one. Undefined on every pre-existing ticket
  // reads back as "manual"/null (see TicketsTable/TicketDetailModal).
  sourceType?:      TicketSourceType;
  linkedBookingId?: string | null;

  // Screenshots/screen recordings a reporter attached (ReportIssueForm) so
  // both a human and the AI diagnosis pipeline have visual evidence, not
  // just the free-text description.
  attachments?: TicketAttachment[] | null;

  // Set by /api/tickets/[id]/ai-diagnose (src/modules/tickets/services/
  // ai-bugfix.service.ts) after attempting to auto-diagnose a "Software" or
  // "Feature Request" category ticket. aiDiagnosis holds the AI's
  // explanation (once confident) or its reason for declining (needs manual
  // triage) — it never touches GitHub itself. When confident, aiProposedFix
  // holds the exact multi-file change it wants to make (up to
  // MAX_FILES_PER_FIX files — see ai-bugfix.service.ts; `isNewFile` marks a
  // file the AI is creating rather than editing) and aiFixReviewStatus
  // becomes "pending_review"; a human must approve it
  // (/api/tickets/[id]/ai-review-fix) before anything is committed/pushed —
  // see ai-bugfix.service.ts's diagnoseFix vs applyApprovedFix split.
  // aiPrUrl is only ever set once that approval has actually opened a draft
  // PR. Undefined on every pre-existing ticket, same convention as sourceType.
  aiDiagnosis?:        string | null;
  aiFixReviewStatus?:  AiFixReviewStatus | null;
  aiProposedFix?: {
    summary: string;
    files: { targetFile: string; isNewFile: boolean; oldFileContent: string; newFileContent: string }[];
  } | null;
  aiPrUrl?:            string | null;
  aiDiagnosedAt?:      Timestamp | Date | string | FieldValue | null;
  aiReviewedAt?:       Timestamp | Date | string | FieldValue | null;
  aiReviewedBy?:       string | null;
};

// "Feature Request" tickets go through the same AI diagnose/propose/approve
// pipeline as "Software" bug reports (see ai-bugfix.service.ts) — the AI
// tries to build the small enhancement described rather than fix a bug.
export const TICKET_CATEGORIES = ["Software", "Feature Request", "Hardware", "Network", "Access", "Service Recovery", "Other"];

// Single source of truth for which categories trigger the AI code-change
// pipeline — shared by the ESS report-issue trigger and the ai-diagnose
// route's own re-check, so the two can never silently drift apart.
export const AI_DIAGNOSABLE_CATEGORIES = ["Software", "Feature Request"];
