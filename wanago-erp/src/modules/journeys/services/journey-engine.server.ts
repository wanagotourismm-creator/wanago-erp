// Admin-SDK side of the journey engine — imported only by
// /api/cron/journey-engine/route.ts. sendWhatsAppSmart/sendEmail/Admin-SDK
// reads can't run in a browser bundle at all, let alone safely, so every
// actual send lives here, never in journey.service.ts (client SDK, called
// from quotation.service.ts/booking.service.ts — that side only ever
// creates the journeyRuns doc, same split as Tool 2's scheduleReviewRequest
// vs. the review-requests cron).
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Journey, JourneyRun, JourneyStep } from "@/modules/journeys/types";

const DAY_MS = 24 * 60 * 60 * 1000;

type AdminTimestamp = { toMillis: () => number };
function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "object" && "toMillis" in value) return (value as AdminTimestamp).toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") { const t = new Date(value).getTime(); return Number.isNaN(t) ? null : t; }
  return null;
}

export function fillTemplate(template: string, name: string): string {
  return template.replace(/\{\{\s*name\s*\}\}/gi, name);
}

// Re-checked at execution time (not just when the run was created) since a
// run can span multiple daily cron ticks and opt-out status can change
// in between.
async function customerOptedOut(customerId: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const snap = await db.collection(FIRESTORE_COLLECTIONS.CUSTOMERS).doc(customerId).get();
  return !!snap.data()?.marketingOptOut;
}

export async function executeJourneyStep(run: JourneyRun, journey: Journey, step: JourneyStep): Promise<void> {
  if (step.type === "wait") return; // handled purely by scheduling, nothing to send

  if ((step.type === "send_whatsapp" || step.type === "send_email") && await customerOptedOut(run.entityId)) {
    const db = getAdminDb();
    await db?.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).doc(run.id).update({
      runStatus: "stopped_optout", updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  if (step.type === "send_whatsapp") {
    if (!run.entityPhone) return;
    const db = getAdminDb();
    await notifyUserServer({
      phone: run.entityPhone,
      whatsappPurpose: step.purpose,
      whatsappVariables: [run.entityName],
      title: journey.name,
      body: fillTemplate(step.fallbackBodyTemplate, run.entityName),
      category: "marketing",
    });
    await db?.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).doc(run.id).update({
      sentWhatsappCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp(),
    });
    await db?.collection(FIRESTORE_COLLECTIONS.JOURNEYS).doc(journey.id).update({
      sentCount: FieldValue.increment(1),
    });
  } else if (step.type === "send_email") {
    if (!run.entityEmail) return;
    const db = getAdminDb();
    await notifyUserServer({
      email: run.entityEmail,
      title: fillTemplate(step.subjectTemplate, run.entityName),
      body: fillTemplate(step.bodyTemplate, run.entityName),
      category: "marketing",
    });
    await db?.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).doc(run.id).update({
      sentEmailCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp(),
    });
    await db?.collection(FIRESTORE_COLLECTIONS.JOURNEYS).doc(journey.id).update({
      sentCount: FieldValue.increment(1),
    });
  } else if (step.type === "notify_agent") {
    if (!run.agentId) return;
    const db = getAdminDb();
    if (!db) return;
    const employeeSnap = await db.collection(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES).doc(run.agentId).get();
    const userId = employeeSnap.data()?.userId as string | undefined;
    if (!userId) return;
    const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId).get();
    await notifyUserServer({
      userId,
      email: (userSnap.data()?.email as string | undefined) ?? null,
      title: `Journey follow-up: ${run.entityName}`,
      body: fillTemplate(step.messageTemplate, run.entityName),
      category: "followup",
    });
  }
  // "add_to_segment" is a no-op here — segments are always computed live
  // from their filters (see segment.service.ts), never stored membership.
}

export type StepDecision =
  | { outcome: "chain"; nextIndex: number }
  | { outcome: "wait"; nextIndex: number; nextStepDueAt: Date }
  | { outcome: "complete"; nextIndex: number };

// Pure — the actual step-sequencing rule, kept separate from the Admin-SDK
// orchestration below so it's directly unit-testable: after completing
// `completedIndex`, only a "wait" step actually defers to a future cron
// tick; any other step type chains immediately within the same pass, and
// running out of steps completes the run.
export function decideAfterStep(steps: JourneyStep[], completedIndex: number, now: Date): StepDecision {
  const nextIndex = completedIndex + 1;
  const next = steps[nextIndex];
  if (!next) return { outcome: "complete", nextIndex };
  if (next.type === "wait") {
    return { outcome: "wait", nextIndex, nextStepDueAt: new Date(now.getTime() + next.days * DAY_MS) };
  }
  return { outcome: "chain", nextIndex };
}

// Every active run with a due step: execute it, advance the index, and —
// only if the *next* step is also an action (not a wait) — chain straight
// into it too, so two actions in the same run don't wait an extra cron
// tick apart for no reason. A "wait" step is the only thing that actually
// defers to a future tick.
export async function advanceDueRuns(now: Date): Promise<{ advanced: number }> {
  const db = getAdminDb();
  if (!db) return { advanced: 0 };

  const journeysSnap = await db.collection(FIRESTORE_COLLECTIONS.JOURNEYS).get();
  const journeyById = new Map(journeysSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Journey]));

  const runsSnap = await db.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).where("runStatus", "==", "active").get();
  let advanced = 0;

  for (const doc of runsSnap.docs) {
    const run = { id: doc.id, ...doc.data() } as JourneyRun;
    const dueAt = toMillis(run.nextStepDueAt);
    if (dueAt == null || dueAt > now.getTime()) continue;

    const journey = journeyById.get(run.journeyId);
    if (!journey) continue;

    let index = run.currentStepIndex;
    let currentRun = run;
    try {
      while (index < journey.steps.length) {
        const step = journey.steps[index];
        await executeJourneyStep(currentRun, journey, step);

        const freshSnap = await db.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).doc(run.id).get();
        currentRun = { id: run.id, ...freshSnap.data() } as JourneyRun;
        if (currentRun.runStatus !== "active") break; // stopped_optout mid-chain

        const decision = decideAfterStep(journey.steps, index, now);
        index = decision.nextIndex;

        if (decision.outcome === "complete") {
          await db.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).doc(run.id).update({
            currentStepIndex: index, runStatus: "completed", updatedAt: FieldValue.serverTimestamp(),
          });
          break;
        }
        if (decision.outcome === "wait") {
          await db.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).doc(run.id).update({
            currentStepIndex: index,
            nextStepDueAt: decision.nextStepDueAt,
            updatedAt: FieldValue.serverTimestamp(),
          });
          break;
        }
        // "chain" — next step is also an action, run it within this same pass.
        await db.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).doc(run.id).update({
          currentStepIndex: index, updatedAt: FieldValue.serverTimestamp(),
        });
      }
      advanced++;
    } catch (err) {
      console.error(`[journey-engine] failed advancing run ${run.id}:`, err);
      await db.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).doc(run.id).update({
        runStatus: "stopped_error", updatedAt: FieldValue.serverTimestamp(),
      }).catch(() => {});
    }
  }

  return { advanced };
}

// quote_unaccepted is the only time-based trigger — scans quotations still
// "sent" past the configured delay and creates a run for any not already
// started (same idempotency check as the client-side instant triggers).
export async function scanTimeBasedTriggers(now: Date): Promise<{ created: number }> {
  const db = getAdminDb();
  if (!db) return { created: 0 };

  const journeysSnap = await db.collection(FIRESTORE_COLLECTIONS.JOURNEYS)
    .where("isActive", "==", true).get();
  const timeBasedJourneys = journeysSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Journey))
    .filter((j) => j.trigger.type === "quote_unaccepted");
  if (timeBasedJourneys.length === 0) return { created: 0 };

  const quotationsSnap = await db.collection(FIRESTORE_COLLECTIONS.QUOTATIONS)
    .where("status", "==", "sent").get();

  let created = 0;
  for (const journey of timeBasedJourneys) {
    const afterDays = journey.trigger.type === "quote_unaccepted" ? journey.trigger.afterDays : 0;
    for (const qDoc of quotationsSnap.docs) {
      const q = qDoc.data();
      const updatedAtMs = toMillis(q.updatedAt);
      if (updatedAtMs == null || (now.getTime() - updatedAtMs) / DAY_MS < afterDays) continue;

      const existing = await db.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS)
        .where("journeyId", "==", journey.id).where("entityId", "==", q.customerId).limit(1).get();
      if (!existing.empty) continue;

      const customerSnap = await db.collection(FIRESTORE_COLLECTIONS.CUSTOMERS).doc(q.customerId as string).get();
      if (customerSnap.data()?.marketingOptOut) continue;

      await db.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).add({
        journeyId: journey.id,
        entityType: "customer",
        entityId: q.customerId,
        entityName: q.customerName,
        entityPhone: q.customerPhone,
        entityEmail: (customerSnap.data()?.email as string | undefined) ?? null,
        agentId: (q.createdBy as string) ?? null,
        currentStepIndex: 0,
        nextStepDueAt: FieldValue.serverTimestamp(),
        runStatus: "active",
        sentWhatsappCount: 0, sentEmailCount: 0,
        repliedAt: null, convertedBookingId: null, convertedRevenue: null,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        createdBy: "journey-engine", status: "active",
      });
      await db.collection(FIRESTORE_COLLECTIONS.JOURNEYS).doc(journey.id).update({
        enteredCount: FieldValue.increment(1),
      });
      created++;
    }
  }
  return { created };
}

// Reply/conversion are proxies, not exact attribution:
// - "replied" = the customer's WhatsApp conversation has an inbound
//   message after the run's last WhatsApp send.
// - "converted"/"revenue" = a booking created for the same customer after
//   the run started.
export async function updateAnalytics(): Promise<{ updated: number }> {
  const db = getAdminDb();
  if (!db) return { updated: 0 };

  const runsSnap = await db.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS)
    .where("runStatus", "in", ["active", "completed"]).get();
  if (runsSnap.empty) return { updated: 0 };

  const conversationsSnap = await db.collection(FIRESTORE_COLLECTIONS.WHATSAPP_CONVERSATIONS).get();
  const lastInboundByPhone = new Map<string, number>();
  for (const doc of conversationsSnap.docs) {
    const data = doc.data();
    const t = toMillis(data.lastInboundMessageAt);
    if (t != null && data.phoneNumber) lastInboundByPhone.set(data.phoneNumber as string, t);
  }

  const bookingsSnap = await db.collection(FIRESTORE_COLLECTIONS.BOOKINGS).get();
  const bookingsByCustomer = new Map<string, { id: string; totalAmount: number; createdAtMs: number }[]>();
  for (const doc of bookingsSnap.docs) {
    const data = doc.data();
    const createdAtMs = toMillis(data.createdAt);
    if (createdAtMs == null) continue;
    const list = bookingsByCustomer.get(data.customerId as string) ?? [];
    list.push({ id: doc.id, totalAmount: (data.totalAmount as number) ?? 0, createdAtMs });
    bookingsByCustomer.set(data.customerId as string, list);
  }

  const journeyDeltas = new Map<string, { replied: number; converted: number; revenue: number }>();
  let updated = 0;

  for (const doc of runsSnap.docs) {
    const run = { id: doc.id, ...doc.data() } as JourneyRun;
    const patch: Record<string, unknown> = {};
    const delta = journeyDeltas.get(run.journeyId) ?? { replied: 0, converted: 0, revenue: 0 };

    if (!run.repliedAt && run.sentWhatsappCount > 0 && run.entityPhone) {
      const lastInbound = lastInboundByPhone.get(run.entityPhone);
      const runStartMs = toMillis(run.createdAt) ?? 0;
      if (lastInbound && lastInbound > runStartMs) {
        patch.repliedAt = new Date(lastInbound);
        delta.replied++;
      }
    }

    if (!run.convertedBookingId) {
      const runStartMs = toMillis(run.createdAt) ?? 0;
      const candidate = (bookingsByCustomer.get(run.entityId) ?? []).find((b) => b.createdAtMs > runStartMs);
      if (candidate) {
        patch.convertedBookingId = candidate.id;
        patch.convertedRevenue = candidate.totalAmount;
        delta.converted++;
        delta.revenue += candidate.totalAmount;
      }
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = FieldValue.serverTimestamp();
      await db.collection(FIRESTORE_COLLECTIONS.JOURNEY_RUNS).doc(run.id).update(patch);
      journeyDeltas.set(run.journeyId, delta);
      updated++;
    }
  }

  for (const [journeyId, delta] of journeyDeltas) {
    if (delta.replied === 0 && delta.converted === 0 && delta.revenue === 0) continue;
    await db.collection(FIRESTORE_COLLECTIONS.JOURNEYS).doc(journeyId).update({
      repliedCount: FieldValue.increment(delta.replied),
      convertedCount: FieldValue.increment(delta.converted),
      revenueTotal: FieldValue.increment(delta.revenue),
    });
  }

  return { updated };
}
