// Single shared definition of "is this ticket's SLA on track" — imported
// by both the UI badges (TicketBadges.tsx/TicketsTable.tsx/
// TicketDetailModal.tsx) and the daily-reminders cron, so what the cron
// notifies and what the table shows can never quietly drift apart. Mirrors
// insights.service.ts's getQuotationRisk() for exactly that reason.
import { toDate } from "@/lib/utils/helpers";
import type { TicketPriority, TicketStatus } from "@/modules/tickets/types";
import type { TicketSlaPolicy } from "@/modules/tickets/services/ticket-sla-policy.service";
import type { Timestamp } from "@/types/global";

// Accepts either a real client Timestamp/Date/string, or the loosely-typed
// `unknown` a raw Admin SDK doc read produces (the cron's case) — toDate()
// only ever checks for a `.seconds` field structurally, so it already
// handles both without needing two separate call sites.
type LooseTimestamp = Timestamp | Date | string | null | undefined;

const HOUR_MS = 60 * 60 * 1000;
// Once inside the last quarter of the allowed window (and not yet met),
// surface it as "due soon" rather than waiting until it's actually late —
// same "warn before it's late" idea as QUOTATION_EXPIRY_WARNING_DAYS.
const DUE_SOON_FRACTION = 0.25;

export type SlaClockStatus = "met" | "on_track" | "due_soon" | "breached";
export type SlaClock = { status: SlaClockStatus; dueAt: Date; label: string };
export type TicketSlaStatus = { response: SlaClock; resolution: SlaClock };

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  return `${Math.round(hours)}h`;
}

function computeClock(createdAtMs: number, thresholdHours: number, achievedMs: number | null, nowMs: number): SlaClock {
  const dueAtMs = createdAtMs + thresholdHours * HOUR_MS;
  const dueAt = new Date(dueAtMs);

  if (achievedMs != null) {
    const tookHours = (achievedMs - createdAtMs) / HOUR_MS;
    return achievedMs <= dueAtMs
      ? { status: "met", dueAt, label: `Met — ${formatHours(tookHours)}` }
      : { status: "breached", dueAt, label: `Breached — took ${formatHours(tookHours)}` };
  }

  const remainingMs = dueAtMs - nowMs;
  if (remainingMs <= 0) return { status: "breached", dueAt, label: `Overdue by ${formatHours(-remainingMs / HOUR_MS)}` };

  const windowMs = thresholdHours * HOUR_MS;
  const status: SlaClockStatus = remainingMs <= windowMs * DUE_SOON_FRACTION ? "due_soon" : "on_track";
  return { status, dueAt, label: `Due in ${formatHours(remainingMs / HOUR_MS)}` };
}

export function getTicketSlaStatus(
  ticket: {
    priority: TicketPriority; ticketStatus: TicketStatus;
    createdAt: unknown; firstRespondedAt: unknown; resolvedAt: unknown;
  },
  policy: TicketSlaPolicy,
  now: Date = new Date()
): TicketSlaStatus {
  const createdMs = toDate(ticket.createdAt as LooseTimestamp)?.getTime() ?? now.getTime();
  const respondedMs = toDate(ticket.firstRespondedAt as LooseTimestamp)?.getTime() ?? null;
  const resolvedMs = toDate(ticket.resolvedAt as LooseTimestamp)?.getTime() ?? null;
  const nowMs = now.getTime();

  return {
    response:   computeClock(createdMs, policy.responseHours[ticket.priority],   respondedMs, nowMs),
    resolution: computeClock(createdMs, policy.resolutionHours[ticket.priority], resolvedMs,  nowMs),
  };
}
