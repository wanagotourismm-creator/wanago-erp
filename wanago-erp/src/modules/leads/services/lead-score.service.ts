// Rule-based, deterministic, zero network calls — same philosophy as
// src/modules/dashboard/services/insights.service.ts ("no trained ML model,
// not enough historical volume yet to be reliable"). A closability score has
// the identical cold-start data problem, and needs to render the instant
// the Lead Detail modal opens — not gated behind an AI round trip.
import { toDate } from "@/lib/utils/helpers";
import { getQuotationRisk } from "@/modules/dashboard/services/insights.service";
import type { CallLog } from "@/modules/call-logs/types";
import type { Quotation } from "@/modules/quotations/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ClosabilityBand = "hot" | "warm" | "at_risk" | "cold";

export type LeadClosability = {
  score:   number; // 0-100
  band:    ClosabilityBand;
  reasons: string[];
};

const STAGE_POINTS: Record<string, number> = {
  new: 10, contacted: 25, follow_up: 20, quoted: 45, negotiation: 65,
};

function bandFor(score: number): ClosabilityBand {
  if (score >= 70) return "hot";
  if (score >= 45) return "warm";
  if (score >= 25) return "at_risk";
  return "cold";
}

export function computeLeadClosability(input: {
  stage:      string;
  priority:   string;
  callLogs:   CallLog[]; // newest-first
  quotation:  Quotation | null;
}): LeadClosability {
  let score = STAGE_POINTS[input.stage] ?? 10;
  const reasons: string[] = [];

  if (input.stage === "quoted" || input.stage === "negotiation") {
    reasons.push(input.stage === "negotiation" ? "In active negotiation" : "Quotation stage — actively pricing");
  }

  // Quotation status — the single strongest signal of how close a deal
  // actually is, since it's the point where the customer has seen a real
  // price. getQuotationRisk() is the same shared "stale" definition the
  // daily-reminders cron and the Quotations table badge already use, so
  // this never quietly drifts from what an agent sees there.
  if (input.quotation) {
    const q = input.quotation;
    if (q.status === "accepted" || q.status === "converted") {
      score += 35;
      reasons.push("Quotation accepted");
    } else if (q.status === "rejected" || q.status === "expired") {
      score -= 20;
      reasons.push(q.status === "rejected" ? "Quotation was rejected" : "Quotation expired");
    } else if (q.status === "sent") {
      const risk = getQuotationRisk({ status: q.status, validUntil: q.validUntil, updatedAt: q.updatedAt });
      if (risk?.type === "stale") {
        score -= 15;
        reasons.push(`Quotation sent, ${risk.label.toLowerCase()}`);
      } else if (risk?.type === "expired") {
        score -= 15;
        reasons.push("Quotation expired");
      } else if (risk?.type === "expiring") {
        score += 20;
        reasons.push("Quotation expiring soon — follow up now");
      } else {
        score += 25;
        reasons.push("Quotation sent — awaiting response");
      }
    } else {
      score += 5; // draft
    }
  }

  // Recency of last real contact — call log createdAt, not
  // lead.lastContactedAt (a field that's never actually written anywhere
  // in the app, per the daily-reminders cron's own comment on it).
  const lastLog = input.callLogs[0] ?? null;
  const lastContactDate = lastLog ? toDate(lastLog.createdAt) : null;
  if (lastContactDate) {
    const daysSince = (Date.now() - lastContactDate.getTime()) / DAY_MS;
    if (daysSince <= 2) {
      score += 20;
    } else if (daysSince <= 5) {
      score += 10;
    } else if (daysSince <= 10) {
      // neutral — no reason surfaced, not urgent enough yet
    } else {
      score -= 15;
      reasons.push(`No contact in ${Math.floor(daysSince)} days`);
    }
  } else {
    score -= 10;
    reasons.push("Never contacted yet");
  }

  // Last call outcome
  if (lastLog) {
    if (lastLog.outcome === "connected") {
      score += 15;
    } else if (lastLog.outcome === "no_answer" || lastLog.outcome === "busy") {
      score -= 5;
      reasons.push(`Last call: ${lastLog.outcome.replace("_", " ")}`);
    } else if (lastLog.outcome === "wrong_number") {
      score -= 20;
      reasons.push("Last call: wrong number");
    }
  }

  // Manual priority — a small nudge, not a dominant term. This score is
  // meant to supplement the agent's own hot/warm/cold tag, not just echo
  // it back or silently override it (lead.priority/PriorityBadge are
  // untouched by this feature).
  if (input.priority === "hot") score += 10;
  else if (input.priority === "cold") score -= 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, band: bandFor(score), reasons: reasons.slice(0, 3) };
}
