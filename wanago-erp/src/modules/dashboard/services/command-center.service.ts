// Combines several already-proven, independently-reused signals
// (insights.service.ts's rule-based functions, already used by the
// Quotations table, Bookings page, the daily-reminders cron, and two
// digest services) into one ranked, clickable "what needs attention
// today" list — replacing SmartRecommendations.tsx's crude, unscoped,
// non-clickable three-bucket version.
//
// Leads intentionally use a lightweight local rule, not the fuller
// computeLeadClosability() (lead-score.service.ts) — that needs a
// per-lead call-log fetch, which would be an N+1 query explosion run
// across every open lead company-wide. That fuller score stays exclusive
// to the Lead Detail view, where it's genuinely one lead at a time.
import type { DocumentData } from "firebase/firestore";
import { toDate } from "@/lib/utils/helpers";
import { computeGoingColdCustomers, computeBookingAnomalies, getQuotationRisk } from "@/modules/dashboard/services/insights.service";
import type { Booking } from "@/modules/bookings/types";
import type { Quotation } from "@/modules/quotations/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_DAYS = 5; // matches insights.service.ts / daily-reminders cron's own convention

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
  limit?:     number;
}): CommandCenterItem[] {
  const items: CommandCenterItem[] = [];
  const quotedLeadIds = new Set(input.quotations.map((q) => q.leadId));

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
    if (quotedLeadIds.has(lead.id)) continue;
    const createdAt = toDate(lead.createdAt);
    if (!createdAt) continue;
    const daysOpen = Math.floor((now - createdAt.getTime()) / DAY_MS);
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
