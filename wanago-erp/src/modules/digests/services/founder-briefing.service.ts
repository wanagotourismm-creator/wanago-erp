// Server-only — imported exclusively by the weekly-founder-briefing cron
// route. Reuses computeWeeklySalesLeaderboard for the hard numbers (same
// week-window bookings/leads computation as the sales digest) and the
// dashboard's insights.service for anomaly/going-cold detection — both are
// pure functions with no client-only imports, safe to call from a server
// route the same way the client dashboard calls them.
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { computeWeeklySalesLeaderboard } from "@/modules/digests/services/weekly-sales-digest.service";
import { computeGoingColdCustomers, computeBookingAnomalies } from "@/modules/dashboard/services/insights.service";
import { generateText, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import type { Booking } from "@/modules/bookings/types";

export type FounderBriefingResult = {
  totalRevenue: number;
  totalBookings: number;
  revenueChangePct: number | null;
  topPerformerName: string | null;
  topPerformerHighlight: string | null;
  anomalies: string[];
  goingColdCount: number;
  narrative: string;
};

export async function computeFounderBriefing(weekStart: Date, weekEnd: Date): Promise<FounderBriefingResult> {
  const priorWeekStart = new Date(weekStart);
  priorWeekStart.setDate(priorWeekStart.getDate() - 7);

  const [thisWeek, priorWeek] = await Promise.all([
    computeWeeklySalesLeaderboard(weekStart, weekEnd),
    computeWeeklySalesLeaderboard(priorWeekStart, weekStart),
  ]);

  const revenueChangePct = priorWeek.totalRevenue > 0
    ? Math.round(((thisWeek.totalRevenue - priorWeek.totalRevenue) / priorWeek.totalRevenue) * 100)
    : null;

  const top = thisWeek.rankings[0] ?? null;

  const dbAdmin = getAdminDb();
  let anomalies: string[] = [];
  let goingColdCount = 0;
  if (dbAdmin) {
    const bookingsSnap = await dbAdmin.collection(FIRESTORE_COLLECTIONS.BOOKINGS).get();
    const bookings = bookingsSnap.docs.map(d => d.data()) as unknown as Booking[];
    anomalies = computeBookingAnomalies(bookings).map(a => a.message);
    goingColdCount = computeGoingColdCustomers(bookings, 100).length;
  }

  const narrative = await generateNarrative({
    totalRevenue: thisWeek.totalRevenue,
    totalBookings: thisWeek.totalBookings,
    revenueChangePct,
    topPerformerName: top?.agentName ?? null,
    topPerformerRevenue: top?.revenue ?? null,
    anomalies,
    goingColdCount,
  });

  return {
    totalRevenue: thisWeek.totalRevenue,
    totalBookings: thisWeek.totalBookings,
    revenueChangePct,
    topPerformerName: top?.agentName ?? null,
    topPerformerHighlight: top?.highlight ?? null,
    anomalies,
    goingColdCount,
    narrative,
  };
}

// Gemini's only job here is to explain the numbers in plain English — every
// number it's given is already computed in code above; it never produces
// figures itself, per the plan's "Gemini narrates, code computes" rule for
// anything forecasting/analytics-shaped.
async function generateNarrative(input: {
  totalRevenue: number; totalBookings: number; revenueChangePct: number | null;
  topPerformerName: string | null; topPerformerRevenue: number | null;
  anomalies: string[]; goingColdCount: number;
}): Promise<string> {
  const prompt = [
    `Total confirmed revenue this week: ${input.totalRevenue}`,
    `Total bookings confirmed this week: ${input.totalBookings}`,
    input.revenueChangePct !== null ? `Revenue change vs prior week: ${input.revenueChangePct}%` : "No prior-week baseline yet.",
    input.topPerformerName ? `Top performer: ${input.topPerformerName} (₹${input.topPerformerRevenue} revenue)` : "No standout performer this week.",
    input.anomalies.length > 0 ? `Anomalies flagged: ${input.anomalies.join(" ")}` : "No anomalies flagged.",
    `Repeat customers going cold: ${input.goingColdCount}`,
  ].join("\n");

  try {
    const { text } = await generateText({
      feature: "founder-briefing-narrative",
      system: [
        "You are writing a short weekly briefing for the founder of Wanago Tours & Travels, based ONLY on the numbers given below.",
        "Write 3-4 sentences: company performance this week, the standout team member if any, and anything needing attention (anomalies, cooling customers).",
        "Do not invent any number, name, or detail not given below. Plain, direct, executive tone — no fluff.",
      ].join("\n"),
      prompt,
      createdBy: "system",
      maxOutputTokens: 300,
    });
    return text;
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return "Weekly summary unavailable this week — see the numbers above.";
    }
    throw err;
  }
}
