import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TicketSourceType = "manual" | "nps_detractor";

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
};

export const TICKET_CATEGORIES = ["Software", "Hardware", "Network", "Access", "Service Recovery", "Other"];
