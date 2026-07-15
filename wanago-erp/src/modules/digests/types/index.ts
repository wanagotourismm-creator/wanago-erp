import type { FirestoreRecord } from "@/types/global";

export type SalesLeaderboardEntry = {
  agentId:           string;
  agentName:         string;
  revenue:           number;
  bookingsConfirmed: number;
  leadsWon:          number;
  conversionRate:    number; // leadsWon / leadsAssigned * 100, 0 if no leads assigned this week
  // AI-generated, grounded only in this entry's own numbers above — set for
  // the top 3 ranked entries only (see weekly-sales-digest cron), null for
  // the rest so this stays a targeted highlight, not boilerplate praise on
  // every row.
  highlight: string | null;

  // Computed (not AI) from this agent's own past weekly digests — see
  // attachStreaksAndMilestones in weekly-sales-digest.service.ts.
  streakWeeks:    number;  // consecutive weeks (including this one) with >=1 confirmed booking
  isPersonalBest: boolean; // this week's revenue exceeds every prior recorded week for this agent
};

// Numbers computed in code; `highlight` above is the one AI-generated field,
// added once the ranking itself is final so the narration can't influence
// or be inconsistent with the numbers it's describing.
export type WeeklySalesDigest = FirestoreRecord & {
  type:          "weekly-sales-leaderboard";
  weekOf:        string; // ISO date of the Monday this week starts on, e.g. "2026-07-06"
  rankings:      SalesLeaderboardEntry[];
  totalRevenue:  number;
  totalBookings: number;
};

// Executive summary, written by a separate weekly cron
// (/api/cron/weekly-founder-briefing) that reuses the same underlying
// bookings/leads computation as the sales digest — `narrative` is the one
// AI-generated field, and it's only ever asked to explain the numbers
// below in plain English, never to produce the numbers itself (per the
// original plan: Gemini narrates, code computes).
export type FounderBriefingDigest = FirestoreRecord & {
  type:          "founder-briefing";
  weekOf:        string;
  totalRevenue:  number;
  totalBookings: number;
  revenueChangePct:      number | null; // vs the prior week; null if no prior-week baseline
  topPerformerName:      string | null;
  topPerformerHighlight: string | null;
  anomalies:     string[];
  goingColdCount: number;
  narrative:     string;
};

// Weekly cross-functional business report (leads/quotations/bookings/
// invoices), written by /api/cron/weekly-ai-insights (and its on-demand
// /regenerate route). Every field except headline/keyTakeaways/risks/
// recommendations is computed in plain code — see
// ai-insights.service.ts's "Gemini narrates, code computes" comment.
export type AiInsightsReport = FirestoreRecord & {
  type: "ai-insights-report";
  weekOf: string;
  totalRevenue: number;
  totalBookings: number;
  revenueChangePct: number | null;
  newLeadsCount: number;
  leadsWonCount: number;
  leadConversionRate: number;
  quotationsCreated: number;
  quotationsAccepted: number;
  quotationsRejected: number;
  quotationWinRate: number;
  pendingFinanceApprovals: number;
  topDestinationsByLeads: { destination: string; count: number }[];
  topDestinationsByRevenue: { destination: string; count: number }[];
  overdueInvoiceCount: number;
  overdueInvoiceAmount: number;
  goingColdCount: number;
  anomalies: string[];
  headline: string;
  keyTakeaways: string[];
  risks: string[];
  recommendations: string[];
};
