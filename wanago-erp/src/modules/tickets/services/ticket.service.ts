import { orderBy, where, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { Ticket, TicketStatus } from "@/modules/tickets/types";
import type { TicketSchema } from "@/modules/tickets/schemas";

class TicketRepository extends BaseRepository<Ticket> {
  constructor() { super(FIRESTORE_COLLECTIONS.TICKETS); }
}
const repo = new TicketRepository();

export async function fetchTickets(): Promise<Ticket[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function fetchTicketsByReporter(employeeId: string): Promise<Ticket[]> {
  return repo.findMany({ constraints: [where("reportedById", "==", employeeId), orderBy("createdAt", "desc")] });
}

export async function createTicket(data: TicketSchema, createdBy: string): Promise<Ticket> {
  const refNumber = await nextRefNumber("TICKET");

  return repo.create({
    ...data,
    refNumber,
    ticketStatus:    "open",
    assignedToId:    null,
    assignedToName:  null,
    resolutionNotes: null,
    resolvedAt:      null,
    status:          "active",
    createdBy,
  });
}

export async function updateTicketStatus(id: string, ticketStatus: TicketStatus): Promise<void> {
  const patch: Partial<Ticket> = { ticketStatus };
  if (ticketStatus === "resolved" || ticketStatus === "closed") {
    patch.resolvedAt = serverTimestamp();
  }
  return repo.update(id, patch);
}

export async function assignTicket(id: string, assignedToId: string, assignedToName: string): Promise<void> {
  return repo.update(id, { assignedToId, assignedToName, ticketStatus: "in_progress" });
}

export async function deleteTicket(id: string): Promise<void> {
  return repo.delete(id);
}
