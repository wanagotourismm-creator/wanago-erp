// Server-only — imported exclusively by the weekly-sales-digest cron route.
// Reads via the Admin SDK (bypasses Firestore rules, same as every other
// cron route in this app) and writes the precomputed result to `digests`.
import { z } from "zod";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateStructured, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import type { SalesLeaderboardEntry } from "@/modules/digests/types";

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

type BookingDoc = {
  assignedTo: string | null; agentName: string | null;
  totalAmount: number | null; status: string;
  opsApprovedAt: unknown; updatedAt: unknown;
};
type LeadDoc = {
  assignedTo: string | null; agentName: string | null;
  stage: string; assignedAt: unknown; updatedAt: unknown; createdAt: unknown;
};

// weekStart/weekEnd are the Monday 00:00 -> next Monday 00:00 window this
// digest covers — bookings count if Operations confirmed them in that
// window; leads count toward "assigned" if they were created/assigned in
// it, and toward "won" if they reached that stage in it. Mirrors the
// grouping logic in useSalesTeamPerformance.ts, just weekly instead of
// monthly and computed server-side.
export async function computeWeeklySalesLeaderboard(
  weekStart: Date,
  weekEnd: Date
): Promise<{ rankings: SalesLeaderboardEntry[]; totalRevenue: number; totalBookings: number }> {
  const dbAdmin = getAdminDb();
  if (!dbAdmin) return { rankings: [], totalRevenue: 0, totalBookings: 0 };

  const [bookingsSnap, leadsSnap] = await Promise.all([
    dbAdmin.collection(FIRESTORE_COLLECTIONS.BOOKINGS).where("status", "==", "confirmed").get(),
    dbAdmin.collection(FIRESTORE_COLLECTIONS.LEADS).get(),
  ]);

  type Agg = { agentName: string; revenue: number; bookingsConfirmed: number; leadsAssigned: number; leadsWon: number };
  const byAgent = new Map<string, Agg>();

  function ensure(agentId: string, agentName: string | null): Agg {
    const existing = byAgent.get(agentId);
    if (existing) return existing;
    const created: Agg = { agentName: agentName ?? "Unknown Agent", revenue: 0, bookingsConfirmed: 0, leadsAssigned: 0, leadsWon: 0 };
    byAgent.set(agentId, created);
    return created;
  }

  for (const doc of bookingsSnap.docs) {
    const b = doc.data() as BookingDoc;
    if (!b.assignedTo) continue;
    const confirmedAt = toDate(b.opsApprovedAt) ?? toDate(b.updatedAt);
    if (!confirmedAt || confirmedAt < weekStart || confirmedAt >= weekEnd) continue;

    const agg = ensure(b.assignedTo, b.agentName);
    agg.revenue += b.totalAmount ?? 0;
    agg.bookingsConfirmed += 1;
  }

  for (const doc of leadsSnap.docs) {
    const l = doc.data() as LeadDoc;
    if (!l.assignedTo) continue;

    const assignedAt = toDate(l.assignedAt) ?? toDate(l.createdAt);
    if (assignedAt && assignedAt >= weekStart && assignedAt < weekEnd) {
      ensure(l.assignedTo, l.agentName).leadsAssigned += 1;
    }

    if (l.stage === "won") {
      const wonAt = toDate(l.updatedAt);
      if (wonAt && wonAt >= weekStart && wonAt < weekEnd) {
        ensure(l.assignedTo, l.agentName).leadsWon += 1;
      }
    }
  }

  const rankings: SalesLeaderboardEntry[] = Array.from(byAgent.entries())
    .map(([agentId, agg]) => ({
      agentId,
      agentName: agg.agentName,
      revenue: agg.revenue,
      bookingsConfirmed: agg.bookingsConfirmed,
      leadsWon: agg.leadsWon,
      conversionRate: agg.leadsAssigned > 0 ? (agg.leadsWon / agg.leadsAssigned) * 100 : 0,
      highlight: null as string | null,
      streakWeeks: 1,
      isPersonalBest: false,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue  = rankings.reduce((sum, r) => sum + r.revenue, 0);
  const totalBookings = rankings.reduce((sum, r) => sum + r.bookingsConfirmed, 0);

  await attachStreaksAndMilestones(dbAdmin, rankings, weekStart);
  await attachTopHighlights(rankings);

  return { rankings, totalRevenue, totalBookings };
}

type PastRankingsSnapshot = { weekOf: string; rankings: SalesLeaderboardEntry[] };

// Pulls up to the last 12 weeks of already-saved digests to compute, per
// current agent: a "closing streak" (consecutive weeks including this one
// with >=1 confirmed booking) and whether this week is a personal-best
// revenue week. Pure history lookup — no AI involved, so it's exact, not a
// model's guess.
async function attachStreaksAndMilestones(
  dbAdmin: Firestore,
  rankings: SalesLeaderboardEntry[],
  weekStart: Date
): Promise<void> {
  const pastSnap = await dbAdmin.collection(FIRESTORE_COLLECTIONS.DIGESTS)
    .where("type", "==", "weekly-sales-leaderboard")
    .orderBy("weekOf", "desc")
    .limit(12)
    .get();

  const weekOfThis = weekStart.toISOString().slice(0, 10);
  const past: PastRankingsSnapshot[] = pastSnap.docs
    .map(d => d.data() as PastRankingsSnapshot)
    .filter(d => d.weekOf < weekOfThis) // guard against a re-run overwriting the same week counting itself
    .sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1)); // newest-first

  for (const entry of rankings) {
    let streak = entry.bookingsConfirmed > 0 ? 1 : 0;
    if (streak > 0) {
      for (const week of past) {
        const prior = week.rankings.find(r => r.agentId === entry.agentId);
        if (prior && prior.bookingsConfirmed > 0) streak += 1;
        else break;
      }
    }
    entry.streakWeeks = streak;

    const priorBest = past.reduce((max, week) => {
      const prior = week.rankings.find(r => r.agentId === entry.agentId);
      return prior ? Math.max(max, prior.revenue) : max;
    }, 0);
    entry.isPersonalBest = entry.revenue > 0 && entry.revenue > priorBest && past.some(week => week.rankings.some(r => r.agentId === entry.agentId));
  }
}

const highlightsSchema = z.object({
  highlights: z.array(z.object({ agentId: z.string(), highlight: z.string() })),
});
const highlightsResponseSchema = {
  type: "OBJECT",
  properties: {
    highlights: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { agentId: { type: "STRING" }, highlight: { type: "STRING" } },
        required: ["agentId", "highlight"],
      },
    },
  },
  required: ["highlights"],
};

// Mutates the top 3 entries in place with a one-sentence AI highlight,
// grounded ONLY in that entry's own numbers (never invents deals, deadlines,
// or context that isn't in the data) — the rest of the leaderboard stays
// null so this is a targeted callout, not boilerplate praise on every row.
// Best-effort: a failure here must never block the digest from saving with
// its (already-correct) numbers.
async function attachTopHighlights(rankings: SalesLeaderboardEntry[]): Promise<void> {
  const top = rankings.filter(r => r.revenue > 0 || r.bookingsConfirmed > 0).slice(0, 3);
  if (top.length === 0) return;

  const prompt = top.map(r =>
    `agentId: ${r.agentId}\nname: ${r.agentName}\nrevenue: ${r.revenue}\nbookingsConfirmed: ${r.bookingsConfirmed}\nleadsWon: ${r.leadsWon}\nconversionRate: ${r.conversionRate.toFixed(0)}%`
  ).join("\n\n");

  try {
    const result = await generateStructured({
      feature: "weekly-leaderboard-highlights",
      system: [
        "You are writing one-sentence weekly leaderboard highlights for a sales team at Wanago Tours & Travels.",
        "For each agent below, write ONE specific, warm, and factual sentence celebrating their week — reference their actual numbers (revenue, bookings, leads won) given below. Do not invent any detail not present in the data (no deal names, no customer names, no context you weren't given).",
        "Avoid generic praise like 'great job' with no specifics — ground every sentence in the numbers.",
      ].join("\n"),
      prompt,
      schema: highlightsSchema,
      responseSchema: highlightsResponseSchema,
      createdBy: "system",
      maxOutputTokens: 400,
    });
    const byId = new Map(result.highlights.map(h => [h.agentId, h.highlight]));
    for (const r of rankings) {
      const h = byId.get(r.agentId);
      if (h) r.highlight = h;
    }
  } catch (err) {
    if (!(err instanceof AiGenerationError)) throw err;
  }
}
