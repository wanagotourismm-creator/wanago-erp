// Server-only — imported exclusively by /api/cron/weekly-ai-insights (and
// its on-demand /regenerate route). Same "Gemini narrates, code computes"
// rule as founder-briefing.service.ts: every number below is computed in
// plain code from Firestore via the Admin SDK; the one generateStructured
// call is only ever asked to interpret those numbers in plain English, and
// is never trusted to produce a figure itself.
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS, INVOICE_STATUS } from "@/lib/constants";
import { computeWeeklySalesLeaderboard } from "@/modules/digests/services/weekly-sales-digest.service";
import { computeGoingColdCustomers, computeBookingAnomalies } from "@/modules/dashboard/services/insights.service";
import { generateStructured, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import { z } from "zod";
import type { Booking } from "@/modules/bookings/types";

type AdminTimestamp = { seconds: number };
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") { const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; }
  if (typeof value === "object" && "seconds" in (value as AdminTimestamp)) {
    return new Date((value as AdminTimestamp).seconds * 1000);
  }
  return null;
}

function inWindow(date: Date | null, weekStart: Date, weekEnd: Date): boolean {
  return !!date && date >= weekStart && date < weekEnd;
}

function topN(counts: Map<string, number>, n: number): { destination: string; count: number }[] {
  return Array.from(counts.entries())
    .map(([destination, count]) => ({ destination, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export type AiInsightsMetrics = {
  totalRevenue: number;
  totalBookings: number;
  revenueChangePct: number | null;
  newLeadsCount: number;
  leadsWonCount: number;
  leadConversionRate: number; // leadsWonCount / newLeadsCount this window, 0 if no new leads
  quotationsCreated: number;
  quotationsAccepted: number;
  quotationsRejected: number;
  quotationWinRate: number; // accepted / (accepted+rejected) this window, 0 if neither happened
  pendingFinanceApprovals: number; // current backlog, not time-windowed
  topDestinationsByLeads: { destination: string; count: number }[];
  topDestinationsByRevenue: { destination: string; count: number }[]; // count field holds revenue here
  overdueInvoiceCount: number;
  overdueInvoiceAmount: number;
  goingColdCount: number;
  anomalies: string[];
};

export type AiInsightsReportResult = AiInsightsMetrics & {
  headline: string;
  keyTakeaways: string[];
  risks: string[];
  recommendations: string[];
};

// Shared by /api/cron/weekly-ai-insights (Monday cron) and its
// /regenerate route (admin on-demand) — computes the current Mon-Mon
// window, runs the report, and writes it to `digests` under a stable
// per-week doc id so either call path overwrites the same week's report
// rather than accumulating duplicates.
export async function runWeeklyAiInsights(): Promise<{ weekOf: string; result: AiInsightsReportResult }> {
  const dbAdmin = getAdminDb();
  if (!dbAdmin) throw new Error("Admin SDK not configured");

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const thisWeekMonday = new Date(now);
  thisWeekMonday.setHours(0, 0, 0, 0);
  thisWeekMonday.setDate(thisWeekMonday.getDate() - daysSinceMonday);

  const weekEnd = thisWeekMonday;
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 7);

  const result = await computeAiInsightsReport(weekStart, weekEnd);
  const weekOf = weekStart.toISOString().slice(0, 10);
  const docId = `ai-insights_${weekOf}`;

  await dbAdmin.collection(FIRESTORE_COLLECTIONS.DIGESTS).doc(docId).set({
    type: "ai-insights-report",
    weekOf,
    ...result,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "system",
    status: "generated",
  });

  return { weekOf, result };
}

export async function computeAiInsightsReport(weekStart: Date, weekEnd: Date): Promise<AiInsightsReportResult> {
  const dbAdmin = getAdminDb();
  if (!dbAdmin) {
    return {
      ...emptyMetrics(),
      headline: "Insights unavailable — Admin SDK not configured.",
      keyTakeaways: [], risks: [], recommendations: [],
    };
  }

  const priorWeekStart = new Date(weekStart);
  priorWeekStart.setDate(priorWeekStart.getDate() - 7);

  const [thisWeek, priorWeek, leadsSnap, quotationsSnap, bookingsSnap, invoicesSnap] = await Promise.all([
    computeWeeklySalesLeaderboard(weekStart, weekEnd),
    computeWeeklySalesLeaderboard(priorWeekStart, weekStart),
    dbAdmin.collection(FIRESTORE_COLLECTIONS.LEADS).get(),
    dbAdmin.collection(FIRESTORE_COLLECTIONS.QUOTATIONS).get(),
    dbAdmin.collection(FIRESTORE_COLLECTIONS.BOOKINGS).get(),
    dbAdmin.collection(FIRESTORE_COLLECTIONS.INVOICES).where("status", "==", INVOICE_STATUS.OVERDUE).get(),
  ]);

  const revenueChangePct = priorWeek.totalRevenue > 0
    ? Math.round(((thisWeek.totalRevenue - priorWeek.totalRevenue) / priorWeek.totalRevenue) * 100)
    : null;

  // ── Leads ──────────────────────────────────────────────
  let newLeadsCount = 0;
  let leadsWonCount = 0;
  const leadsByDestination = new Map<string, number>();
  for (const doc of leadsSnap.docs) {
    const l = doc.data();
    const createdAt = toDate(l.createdAt);
    if (inWindow(createdAt, weekStart, weekEnd)) {
      newLeadsCount += 1;
      const dest = String(l.destination ?? "Unknown");
      leadsByDestination.set(dest, (leadsByDestination.get(dest) ?? 0) + 1);
    }
    if (l.stage === "won" && inWindow(toDate(l.updatedAt), weekStart, weekEnd)) {
      leadsWonCount += 1;
    }
  }

  // ── Quotations ─────────────────────────────────────────
  let quotationsCreated = 0, quotationsAccepted = 0, quotationsRejected = 0, pendingFinanceApprovals = 0;
  for (const doc of quotationsSnap.docs) {
    const q = doc.data();
    if (inWindow(toDate(q.createdAt), weekStart, weekEnd)) quotationsCreated += 1;
    if (q.status === "accepted" && inWindow(toDate(q.updatedAt), weekStart, weekEnd)) quotationsAccepted += 1;
    if (q.status === "rejected" && inWindow(toDate(q.updatedAt), weekStart, weekEnd)) quotationsRejected += 1;
    if (q.financeApprovalStatus === "pending") pendingFinanceApprovals += 1;
  }

  // ── Bookings (revenue by destination) ───────────────────
  const revenueByDestination = new Map<string, number>();
  const allBookings = bookingsSnap.docs.map(d => d.data()) as unknown as Booking[];
  for (const b of allBookings) {
    if (b.status !== "confirmed") continue;
    const confirmedAt = toDate(b.opsApprovedAt) ?? toDate(b.updatedAt);
    if (!inWindow(confirmedAt, weekStart, weekEnd)) continue;
    const dest = String(b.destination ?? "Unknown");
    revenueByDestination.set(dest, (revenueByDestination.get(dest) ?? 0) + (b.totalAmount ?? 0));
  }

  // ── Invoices (overdue backlog) ───────────────────────────
  let overdueInvoiceCount = 0, overdueInvoiceAmount = 0;
  for (const doc of invoicesSnap.docs) {
    const inv = doc.data();
    overdueInvoiceCount += 1;
    overdueInvoiceAmount += Number(inv.balanceDue ?? 0);
  }

  const anomalies = computeBookingAnomalies(allBookings).map(a => a.message);
  const goingColdCount = computeGoingColdCustomers(allBookings, 100).length;

  const metrics: AiInsightsMetrics = {
    totalRevenue: thisWeek.totalRevenue,
    totalBookings: thisWeek.totalBookings,
    revenueChangePct,
    newLeadsCount,
    leadsWonCount,
    leadConversionRate: newLeadsCount > 0 ? Math.round((leadsWonCount / newLeadsCount) * 100) : 0,
    quotationsCreated,
    quotationsAccepted,
    quotationsRejected,
    quotationWinRate: (quotationsAccepted + quotationsRejected) > 0
      ? Math.round((quotationsAccepted / (quotationsAccepted + quotationsRejected)) * 100) : 0,
    pendingFinanceApprovals,
    topDestinationsByLeads: topN(leadsByDestination, 3),
    topDestinationsByRevenue: topN(revenueByDestination, 3),
    overdueInvoiceCount,
    overdueInvoiceAmount,
    goingColdCount,
    anomalies,
  };

  const narrative = await generateNarrative(metrics);

  return { ...metrics, ...narrative };
}

function emptyMetrics(): AiInsightsMetrics {
  return {
    totalRevenue: 0, totalBookings: 0, revenueChangePct: null,
    newLeadsCount: 0, leadsWonCount: 0, leadConversionRate: 0,
    quotationsCreated: 0, quotationsAccepted: 0, quotationsRejected: 0, quotationWinRate: 0,
    pendingFinanceApprovals: 0, topDestinationsByLeads: [], topDestinationsByRevenue: [],
    overdueInvoiceCount: 0, overdueInvoiceAmount: 0, goingColdCount: 0, anomalies: [],
  };
}

const narrativeSchema = z.object({
  headline: z.string(),
  keyTakeaways: z.array(z.string()),
  risks: z.array(z.string()),
  recommendations: z.array(z.string()),
});
const narrativeResponseSchema = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    keyTakeaways: { type: "ARRAY", items: { type: "STRING" } },
    risks: { type: "ARRAY", items: { type: "STRING" } },
    recommendations: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["headline", "keyTakeaways", "risks", "recommendations"],
};

async function generateNarrative(m: AiInsightsMetrics): Promise<{
  headline: string; keyTakeaways: string[]; risks: string[]; recommendations: string[];
}> {
  const prompt = [
    `Revenue this week: ${m.totalRevenue} (${m.revenueChangePct !== null ? `${m.revenueChangePct}% vs prior week` : "no prior-week baseline"})`,
    `Confirmed bookings this week: ${m.totalBookings}`,
    `New leads this week: ${m.newLeadsCount}, won this week: ${m.leadsWonCount} (${m.leadConversionRate}% conversion)`,
    `Quotations created: ${m.quotationsCreated}, accepted: ${m.quotationsAccepted}, rejected: ${m.quotationsRejected} (${m.quotationWinRate}% win rate)`,
    `Quotations awaiting Finance approval right now: ${m.pendingFinanceApprovals}`,
    m.topDestinationsByLeads.length ? `Top destinations by lead volume: ${m.topDestinationsByLeads.map(d => `${d.destination} (${d.count})`).join(", ")}` : "No leads this week.",
    m.topDestinationsByRevenue.length ? `Top destinations by revenue: ${m.topDestinationsByRevenue.map(d => `${d.destination} (₹${d.count})`).join(", ")}` : "No confirmed revenue this week.",
    `Overdue invoices right now: ${m.overdueInvoiceCount} (₹${m.overdueInvoiceAmount} outstanding)`,
    `Repeat customers going cold: ${m.goingColdCount}`,
    m.anomalies.length ? `Anomalies flagged: ${m.anomalies.join(" ")}` : "No anomalies flagged.",
  ].join("\n");

  try {
    return await generateStructured({
      feature: "ai-insights-report",
      system: [
        "You are writing a weekly business insights report for the management team of Wanago Tours & Travels, a travel agency, based ONLY on the numbers given below.",
        "Produce: a one-sentence headline capturing the week; 2-4 keyTakeaways (specific, numbers-grounded); 0-3 risks (only include real concerns visible in the data — overdue invoices, cooling customers, anomalies, low win rates; omit if nothing stands out); 1-3 recommendations (concrete, actionable next steps a manager could actually do this week).",
        "Do not invent any number, name, or detail not given below. Plain, direct, executive tone — no fluff, no markdown.",
      ].join("\n"),
      prompt,
      schema: narrativeSchema,
      responseSchema: narrativeResponseSchema,
      createdBy: "system",
      maxOutputTokens: 700,
    });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return {
        headline: "Weekly insights unavailable this week — see the numbers above.",
        keyTakeaways: [], risks: [], recommendations: [],
      };
    }
    throw err;
  }
}
