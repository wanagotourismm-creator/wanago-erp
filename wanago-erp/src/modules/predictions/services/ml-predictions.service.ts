// Server-only — imported by /api/cron/weekly-ml-predictions and its
// /regenerate route. TS owns all Firestore access (Admin SDK); the Python
// function (api/ml/forecast.py) is stateless and only ever does the
// numeric computation on data it's handed here.
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

const WEEKS_OF_REVENUE_HISTORY = 12;

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

function isoWeekStart(d: Date): string {
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - dow);
  return monday.toISOString().slice(0, 10);
}

// Validates the Python function's response shape before it's ever written
// to Firestore — this is the only thing that trusts api/ml/forecast.py's
// output, so a malformed/unexpected response fails loudly here rather than
// silently corrupting the aiPredictions collection.
const revenueForecastSchema = z.object({
  trained: z.boolean(),
  sampleSize: z.number(),
  weeklyForecast: z.array(z.object({ weekOf: z.string(), amount: z.number() })),
  confidence: z.enum(["insufficient", "low", "medium", "high"]),
  note: z.string().nullable(),
});
const leadConversionSchema = z.object({
  trained: z.boolean(),
  sampleSize: z.number(),
  accuracy: z.number().nullable(),
  topDestinations: z.array(z.string()),
  note: z.string().nullable(),
});
const mlResponseSchema = z.object({
  revenueForecast: revenueForecastSchema,
  leadConversion: leadConversionSchema,
});

export type RunMlPredictionsResult =
  | { ok: true; weekOf: string; revenueForecast: z.infer<typeof revenueForecastSchema>; leadConversion: z.infer<typeof leadConversionSchema> }
  | { ok: false; error: string; status: number };

// Shared by the Monday cron and its admin on-demand /regenerate route —
// same split as runWeeklyAiInsights in ai-insights.service.ts.
export async function runWeeklyMlPredictions(): Promise<RunMlPredictionsResult> {
  const db = getAdminDb();
  if (!db) {
    return { ok: false, error: "Admin SDK not configured", status: 500 };
  }

  // ── Feature extraction ──────────────────────────────────────────────
  const [bookingsSnap, leadsSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.BOOKINGS).where("status", "==", "confirmed").get(),
    db.collection(FIRESTORE_COLLECTIONS.LEADS).get(),
  ]);

  // Weekly revenue buckets, oldest -> newest, trailing WEEKS_OF_REVENUE_HISTORY weeks.
  const now = new Date();
  const weekBuckets: { weekOf: string; amount: number }[] = [];
  for (let i = WEEKS_OF_REVENUE_HISTORY - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weekBuckets.push({ weekOf: isoWeekStart(d), amount: 0 });
  }
  const bucketIndex = new Map(weekBuckets.map((b, i) => [b.weekOf, i]));

  for (const doc of bookingsSnap.docs) {
    const b = doc.data();
    const confirmedAt = toDate(b.opsApprovedAt) ?? toDate(b.updatedAt);
    if (!confirmedAt) continue;
    const weekOf = isoWeekStart(confirmedAt);
    const idx = bucketIndex.get(weekOf);
    if (idx !== undefined) weekBuckets[idx].amount += Number(b.totalAmount ?? 0);
  }

  // Labeled leads only (won/lost) — open leads carry no outcome yet, so
  // they're not useful training signal for a conversion model.
  const leads = leadsSnap.docs
    .map(d => d.data())
    .filter(l => l.stage === "won" || l.stage === "lost")
    .map(l => ({
      destination: l.destination ?? null,
      source: l.source ?? null,
      pax: l.pax ?? null,
      budget: l.budget ?? null,
      outcome: l.stage as "won" | "lost",
    }));

  // ── Call the Python function ────────────────────────────────────────
  const vercelHost = process.env.VERCEL_URL;
  if (!vercelHost) {
    return { ok: false, error: "VERCEL_URL not set — can't reach the internal ML function.", status: 500 };
  }

  let mlResponse: z.infer<typeof mlResponseSchema>;
  try {
    const res = await fetch(`https://${vercelHost}/api/ml/forecast`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ weeklyRevenue: weekBuckets, leads }),
    });
    if (!res.ok) {
      return { ok: false, error: `ML function returned ${res.status}`, status: 502 };
    }
    const raw = await res.json();
    const parsed = mlResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: `ML function response failed validation: ${parsed.error.message}`, status: 502 };
    }
    mlResponse = parsed.data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to reach ML function", status: 502 };
  }

  // ── Write result ──────────────────────────────────────────────────
  const weekOf = isoWeekStart(now);
  const docId = `weekly-ml-predictions_${weekOf}`;
  await db.collection(FIRESTORE_COLLECTIONS.AI_PREDICTIONS).doc(docId).set({
    type: "weekly-ml-predictions",
    weekOf,
    revenueForecast: mlResponse.revenueForecast,
    leadConversion: mlResponse.leadConversion,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "system",
    status: "generated",
  });

  return { ok: true, weekOf, revenueForecast: mlResponse.revenueForecast, leadConversion: mlResponse.leadConversion };
}
