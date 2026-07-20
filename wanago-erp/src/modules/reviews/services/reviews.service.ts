import { where, limit } from "firebase/firestore";
import { reviewRequestRepository } from "@/modules/reviews/services/review-request.repository";
import { npsResponseRepository } from "@/modules/reviews/services/nps-response.repository";
import { fetchReviewSettings } from "@/modules/reviews/settings/services/review-settings.service";
import { fetchCustomerById } from "@/modules/customers/services/customer.service";
import { toDate } from "@/lib/utils/helpers";
import type { Booking } from "@/modules/bookings/types";
import type { ReviewRequest, NpsResponse } from "@/modules/reviews/types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Called from booking.service.ts the moment a booking's status becomes
// "completed" — best-effort, idempotency-checked (one reviewRequests doc
// per booking, ever) so a booking accidentally re-saved as "completed"
// doesn't send a second request.
export async function scheduleReviewRequest(booking: Booking): Promise<void> {
  const existing = await reviewRequestRepository.findMany({
    constraints: [where("bookingId", "==", booking.id), limit(1)],
  });
  if (existing.length > 0) return;

  const settings = await fetchReviewSettings();
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const scheduledFor = new Date(Date.now() + settings.delayDays * DAY_MS);
  const customer = await fetchCustomerById(booking.customerId).catch(() => null);

  await reviewRequestRepository.create({
    bookingId:        booking.id,
    bookingRefNumber: booking.refNumber,

    customerId:    booking.customerId,
    customerName:  booking.customerName,
    customerPhone: booking.customerPhone,
    customerEmail: customer?.email ?? null,

    destination: booking.destination,
    assignedTo:  booking.assignedTo,
    agentName:   booking.agentName,
    officeId:    booking.officeId,
    officeName:  booking.officeName,

    token,
    scheduledFor,
    sentAt:       null,
    sentChannels: null,
    respondedAt:  null,
    createdBy:    booking.createdBy,
    status:       "active",
  });
}

export async function fetchReviewRequests(): Promise<ReviewRequest[]> {
  return reviewRequestRepository.findMany();
}

export async function fetchNpsResponses(): Promise<NpsResponse[]> {
  return npsResponseRepository.findMany();
}

// ── Reputation dashboard — pure compute functions ──────────────
// Same shape as the Tool 1 cockpit's compute functions: pure folds over
// already-fetched arrays, so they're cheap to unit-test independent of
// Firestore/dates-at-call-time.

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export type NpsTrendPoint = { month: string; avgScore: number | null; count: number };

// Rolling 12-month window ending at `now` (defaults to the real current
// time; a fixed `now` can be passed in tests), bucketed by year+month
// (not month name alone — see dashboard.service.ts's fetchRevenueData
// comment for why that bug class matters here too).
export function computeNpsTrend(responses: NpsResponse[], now: Date = new Date()): NpsTrendPoint[] {
  const buckets: { year: number; monthIndex: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
  }

  return buckets.map((b) => {
    const inBucket = responses.filter((r) => {
      const d = toDate(r.createdAt);
      return d && d.getFullYear() === b.year && d.getMonth() === b.monthIndex;
    });
    const avgScore = inBucket.length === 0
      ? null
      : inBucket.reduce((sum, r) => sum + r.score, 0) / inBucket.length;
    return { month: `${MONTH_NAMES[b.monthIndex]} ${String(b.year).slice(2)}`, avgScore, count: inBucket.length };
  });
}

export function computeResponseRate(requests: ReviewRequest[]): number {
  const sent = requests.filter((r) => r.sentAt != null);
  if (sent.length === 0) return 0;
  const responded = sent.filter((r) => r.respondedAt != null);
  return (responded.length / sent.length) * 100;
}

export type NpsSplit = { promoter: number; passive: number; detractor: number };

export function computeNpsSplit(responses: NpsResponse[]): NpsSplit {
  return {
    promoter:  responses.filter((r) => r.category === "promoter").length,
    passive:   responses.filter((r) => r.category === "passive").length,
    detractor: responses.filter((r) => r.category === "detractor").length,
  };
}

export type NpsGroupRow = { key: string; avgScore: number; count: number } & NpsSplit;

export function computeNpsByGroup(
  responses: NpsResponse[], groupBy: "destination" | "agentName"
): NpsGroupRow[] {
  const groups = new Map<string, NpsResponse[]>();
  for (const r of responses) {
    const key = (groupBy === "destination" ? r.destination : r.agentName) || "Unassigned";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return Array.from(groups.entries())
    .map(([key, group]) => ({
      key,
      count: group.length,
      avgScore: group.reduce((sum, r) => sum + r.score, 0) / group.length,
      ...computeNpsSplit(group),
    }))
    .sort((a, b) => b.count - a.count);
}
