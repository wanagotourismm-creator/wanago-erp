import { orderBy, where, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { notifyUser } from "@/lib/notify";
import { fetchUsersByPermission } from "@/lib/notify-recipients";
import { uploadFile } from "@/lib/storage/upload";
import { extractVideoFrames } from "@/lib/media/extractVideoFrames";
import type { Ticket, TicketStatus, TicketAttachment } from "@/modules/tickets/types";
import type { TicketSchema } from "@/modules/tickets/schemas";

// New tickets start unassigned (assignToMe is a self-claim action, and
// assignedToId is a Firebase Auth uid rather than an Employee.id — unlike
// Leads/Bookings, there's no established "ticket team" department to
// round-robin across) — so previously nobody knew a ticket existed until
// the next day's SLA-breach cron caught it. This tells Admin/Super Admin
// immediately instead, same "admin:users" audience the SLA-breach
// fallback already uses for unassigned tickets.
async function notifyNewTicket(ticket: Ticket): Promise<void> {
  try {
    const admins = await fetchUsersByPermission("admin:users");
    await Promise.all(
      admins.map((u) =>
        notifyUser({
          userId:   u.id,
          email:    u.email,
          title:    `New ticket: ${ticket.title}`,
          body:     `${ticket.category} — ${ticket.priority} priority. Needs an assignee.`,
          link:     "/admin",
          category: "system",
        })
      )
    );
  } catch {
    // ignore — notifications must not block ticket creation
  }
}

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

  const ticket = await repo.create({
    ...data,
    refNumber,
    ticketStatus:      "open",
    assignedToId:      null,
    assignedToName:    null,
    resolutionNotes:   null,
    resolvedAt:        null,
    firstRespondedAt:  null,
    status:            "active",
    createdBy,
    sourceType:        "manual",
    linkedBookingId:   null,
  });

  await notifyNewTicket(ticket);

  return ticket;
}

// firstRespondedAt is a proxy for "staff first acknowledged this" (see its
// own comment on the Ticket type) — stamped the first time a ticket moves
// out of "open" via either path (a direct status change here, or
// assignTicket below), and never overwritten afterward so a later
// reassignment/status change doesn't reset the original response time.
export async function updateTicketStatus(id: string, ticketStatus: TicketStatus, currentFirstRespondedAt?: Ticket["firstRespondedAt"]): Promise<void> {
  const patch: Partial<Ticket> = { ticketStatus };
  if (ticketStatus === "resolved" || ticketStatus === "closed") {
    patch.resolvedAt = serverTimestamp();
  }
  if (ticketStatus !== "open" && !currentFirstRespondedAt) {
    patch.firstRespondedAt = serverTimestamp();
  }
  return repo.update(id, patch);
}

// Distinct from updateTicketStatus — resolving specifically (not just
// closing) now requires capturing how it was actually fixed, so the
// resolution can feed the AI's searchable knowledge base (see
// /api/tickets/[id]/summarize-resolution, called right after this by the
// caller). resolutionNotes existed on the Ticket type since the module was
// built but nothing ever wrote a real value to it until now.
export async function resolveTicketWithNotes(id: string, resolutionNotes: string, currentFirstRespondedAt?: Ticket["firstRespondedAt"]): Promise<void> {
  const patch: Partial<Ticket> = { ticketStatus: "resolved", resolutionNotes, resolvedAt: serverTimestamp() };
  if (!currentFirstRespondedAt) patch.firstRespondedAt = serverTimestamp();
  return repo.update(id, patch);
}

export async function assignTicket(id: string, assignedToId: string, assignedToName: string, currentFirstRespondedAt?: Ticket["firstRespondedAt"]): Promise<void> {
  const patch: Partial<Ticket> = { assignedToId, assignedToName, ticketStatus: "in_progress" };
  if (!currentFirstRespondedAt) patch.firstRespondedAt = serverTimestamp();
  return repo.update(id, patch);
}

export async function deleteTicket(id: string): Promise<void> {
  return repo.delete(id);
}

// Uploads a reporter's screenshot/screen-recording picks and returns the
// attachment records to save on the ticket. Runs after the ticket already
// has an id (mirrors expense.service.ts's receipt-upload pattern) since the
// storage path is keyed off ticketId. A video also gets a handful of frames
// sampled from it (extractVideoFrames) and uploaded as separate "video-frame"
// image attachments — the AI diagnosis pipeline can only run vision analysis
// on still images, never the raw video itself.
export async function uploadTicketAttachments(ticketId: string, files: File[]): Promise<TicketAttachment[]> {
  const attachments: TicketAttachment[] = [];

  for (const file of files) {
    const isVideo = file.type.startsWith("video/");
    const url = await uploadFile(`tickets/${ticketId}/${Date.now()}-${file.name}`, file);
    attachments.push({ url, type: isVideo ? "video" : "image", mimeType: file.type, name: file.name });

    if (isVideo) {
      try {
        const frames = await extractVideoFrames(file);
        for (let i = 0; i < frames.length; i++) {
          const frameName = `frame-${i + 1}.jpg`;
          const frameUrl = await uploadFile(`tickets/${ticketId}/frames/${Date.now()}-${frameName}`, frames[i]);
          attachments.push({ url: frameUrl, type: "video-frame", mimeType: "image/jpeg", name: frameName });
        }
      } catch {
        // Best-effort — if frame extraction fails, the raw video attachment
        // above is still saved for a human to watch, just not AI-analyzed.
      }
    }
  }

  return attachments;
}

export async function attachTicketFiles(ticketId: string, attachments: TicketAttachment[]): Promise<void> {
  return repo.update(ticketId, { attachments } as Partial<Ticket>);
}
