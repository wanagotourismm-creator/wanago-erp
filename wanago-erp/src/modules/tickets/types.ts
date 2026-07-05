import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

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
};

export const TICKET_CATEGORIES = ["Software", "Hardware", "Network", "Access", "Other"];
