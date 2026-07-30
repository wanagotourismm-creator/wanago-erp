// Combines several already-proven, independently-reused signals
// (insights.service.ts's rule-based functions, already used by the
// Quotations table, Bookings page, the daily-reminders cron, and two
// digest services) into one ranked, clickable "what needs attention
// today" list — replacing SmartRecommendations.tsx's crude, unscoped,
// non-clickable three-bucket version.
//
// Leads intentionally use lightweight local rules, not the fuller
// computeLeadClosability() (lead-score.service.ts) — that needs a
// per-lead call-log fetch (fetchCallLogs({leadId})), which would be an N+1
// query explosion run across every open lead company-wide. Here, call logs
// are instead bulk-fetched ONCE (fetchCallLogs({}), no filter — the whole
// collection in a single read, same cost shape as the leads/invoices/
// bookings full-collection reads this page already does) and only ever
// checked for "does this lead have any contact at all yet" — that fuller
// per-lead score stays exclusive to the Lead Detail view, where it's
// genuinely one lead at a time.
import type { DocumentData } from "firebase/firestore";
import { toDate } from "@/lib/utils/helpers";
import { computeGoingColdCustomers, computeBookingAnomalies, getQuotationRisk } from "@/modules/dashboard/services/insights.service";
import type { Booking } from "@/modules/bookings/types";
import type { Quotation } from "@/modules/quotations/types";
import type { CallLog } from "@/modules/call-logs/types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const STALE_DAYS = 5; // matches insights.service.ts / daily-reminders cron's own convention
// Grace window before a brand-new, uncontacted lead counts as a
// speed-to-lead miss — flagging it in the first few minutes would just be
// noise; by 1 hour, a real response is overdue.
const SPEED_TO_LEAD_GRACE_HOURS = 1;

export type CommandCenterItem = {
  id:         string;
  entityType: "lead" | "quotation" | "invoice" | "customer" | "booking";
  title:      string;
  detail:     string;
  urgency:    number; // 0-100, for cross-type sorting — not meant to be shown as a literal score
  link:       string;
};

const RISK_URGENCY: Record<string, number> = { expired: 90, expiring: 75, stale: 60 };
const ANOMALY_URGENCY: Record<string, number> = { warning: 85, info: 50 };

export function buildCommandCenter(input: {
  leads:      DocumentData[];
  quotations: Quotation[];
  invoices:   DocumentData[];
  bookings:   DocumentData[];
  callLogs:   CallLog[];
  limit?:     number;
}): CommandCenterItem[] {
  const items: CommandCenterItem[] = [];
  const quotedLeadIds = new Set(input.quotations.map((q) => q.leadId));
  const contactedLeadIds = new Set(input.callLogs.map((c) => c.leadId).filter((id): id is string => !!id));

  for (const q of input.quotations) {
    const risk = getQuotationRisk({ status: q.status, validUntil: q.validUntil, updatedAt: q.updatedAt });
    if (!risk) continue;
    items.push({
      id: q.id, entityType: "quotation",
      title: `${q.customerName} — ${q.refNumber}`,
      detail: risk.label,
      urgency: RISK_URGENCY[risk.type] ?? 60,
      link: `/quotations?view=${q.id}`,
    });
  }

  for (const inv of input.invoices) {
    if (inv.status !== "overdue") continue;
    items.push({
      id: inv.id, entityType: "invoice",
      title: `${inv.customerName ?? inv.refNumber ?? "Invoice"}`,
      detail: `Invoice ${inv.refNumber ?? ""} overdue`.trim(),
      urgency: 80,
      link: "/invoices",
    });
  }

  const goingCold = computeGoingColdCustomers(input.bookings as unknown as Booking[]);
  for (const c of goingCold) {
    items.push({
      id: c.customerId, entityType: "customer",
      title: c.customerName,
      detail: `${c.daysSinceLast}d since last booking (usually ~${c.avgGapDays}d)`,
      urgency: 70,
      link: `/customers?view=${c.customerId}`,
    });
  }

  const anomalies = computeBookingAnomalies(input.bookings as unknown as Booking[]);
  for (const a of anomalies) {
    items.push({
      id: a.message, entityType: "booking",
      title: "Booking anomaly",
      detail: a.message,
      urgency: ANOMALY_URGENCY[a.severity] ?? 60,
      link: "/bookings",
    });
  }

  const now = Date.now();
  for (const lead of input.leads) {
    if (lead.stage === "won" || lead.stage === "lost") continue;
    const createdAt = toDate(lead.createdAt);
    if (!createdAt) continue;
    const hoursOpen = (now - createdAt.getTime()) / HOUR_MS;
    const contacted = contactedLeadIds.has(lead.id);

    if (!contacted) {
      // Speed-to-lead miss — genuinely time-sensitive (hours, not days).
      // Owns the "never contacted" case entirely so it doesn't also get
      // flagged by the slower stale-pipeline rule below once it crosses
      // the multi-day threshold too.
      if (hoursOpen < SPEED_TO_LEAD_GRACE_HOURS) continue;
      const label = hoursOpen < 24 ? `${Math.floor(hoursOpen)}h since it came in` : `${Math.floor(hoursOpen / 24)}d since it came in`;
      items.push({
        id: lead.id, entityType: "lead",
        title: lead.name ?? "Lead",
        detail: `No contact yet — ${label}`,
        urgency: Math.min(95, 30 + hoursOpen * 3),
        link: `/leads?view=${lead.id}`,
      });
      continue;
    }

    // Already contacted at least once, but still no quotation after
    // STALE_DAYS — a slower-moving miss than speed-to-lead above.
    if (quotedLeadIds.has(lead.id)) continue;
    const daysOpen = Math.floor(hoursOpen / 24);
    if (daysOpen < STALE_DAYS) continue;
    items.push({
      id: lead.id, entityType: "lead",
      title: lead.name ?? "Lead",
      detail: `No quotation yet, ${daysOpen}d in pipeline`,
      urgency: Math.min(90, 40 + daysOpen * 2),
      link: `/leads?view=${lead.id}`,
    });
  }

  return items.sort((a, b) => b.urgency - a.urgency).slice(0, input.limit ?? 10);
}
