import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { TicketPriority } from "@/modules/tickets/types";

export type TicketSlaPolicy = {
  responseHours:   Record<TicketPriority, number>;
  resolutionHours: Record<TicketPriority, number>;
};

const DOC_ID = "ticketSlaPolicy";

// A helpdesk-standard-ish starting point — not tuned to any real IT team's
// actual workload, just a reasonable default an admin can tune from here.
export const DEFAULT_TICKET_SLA_POLICY: TicketSlaPolicy = {
  responseHours:   { urgent: 1, high: 4,  medium: 24, low: 48  },
  resolutionHours: { urgent: 4, high: 24, medium: 72, low: 168 },
};

export async function fetchTicketSlaPolicy(): Promise<TicketSlaPolicy> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID));
  if (!snap.exists()) return DEFAULT_TICKET_SLA_POLICY;
  const data = snap.data() as Partial<TicketSlaPolicy>;
  return {
    responseHours:   { ...DEFAULT_TICKET_SLA_POLICY.responseHours,   ...(data.responseHours   ?? {}) },
    resolutionHours: { ...DEFAULT_TICKET_SLA_POLICY.resolutionHours, ...(data.resolutionHours ?? {}) },
  };
}

export async function updateTicketSlaPolicy(data: TicketSlaPolicy, updatedBy: string): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}
