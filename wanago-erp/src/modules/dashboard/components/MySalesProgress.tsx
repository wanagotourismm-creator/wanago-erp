"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee } from "@/modules/dashboard/hooks/useCurrentEmployee";
import { useIncentives } from "@/modules/incentives/hooks/useIncentives";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import { fetchPackages } from "@/modules/packages/services/package.service";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toDate, formatCurrency } from "@/lib/utils/helpers";
import { LEAD_STAGES, PRIORITY } from "@/lib/constants";
import type { Package } from "@/modules/packages/types";
import type { Lead } from "@/modules/leads/types";
import type { Timestamp } from "@/types/global";

const STALE_DAYS = 5;

// Pipeline order used to score "closeness" of a lead — later stage = closer to won.
const STAGE_ORDER: string[] = [
  LEAD_STAGES.NEW,
  LEAD_STAGES.CONTACTED,
  LEAD_STAGES.FOLLOW_UP,
  LEAD_STAGES.QUOTED,
  LEAD_STAGES.NEGOTIATION,
];

type ScoredLead = { lead: Lead; score: number; reason: string };

export function MySalesProgress() {
  const { user } = useAuthStore();
  const { employee, loading: employeeLoading } = useCurrentEmployee();
  const { summaries, loading: incentivesLoading } = useIncentives();

  const [target,   setTarget]   = useState(0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [topLeads, setTopLeads] = useState<ScoredLead[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!employee) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const [settings, activePackages, leads] = await Promise.all([
          fetchCompanySettings(),
          fetchPackages({ packageStatus: "active" }),
          fetchLeads({ assignedTo: employee!.id }),
        ]);
        if (cancelled) return;

        setTarget(settings.monthlyIncentiveTarget);
        setPackages(activePackages);

        const staleCutoff = new Date();
        staleCutoff.setDate(staleCutoff.getDate() - STALE_DAYS);

        const scored: ScoredLead[] = leads
          .filter(l => l.stage !== LEAD_STAGES.WON && l.stage !== LEAD_STAGES.LOST)
          .map(l => {
            let score = STAGE_ORDER.indexOf(l.stage);
            if (score < 0) score = 0;
            const reasons: string[] = [];

            if (l.priority === PRIORITY.HOT) {
              score += 3;
              reasons.push("Hot");
            }

            const contacted = toDate(l.lastContactedAt as Timestamp | Date | string | null | undefined);
            const daysSinceContact = contacted
              ? Math.floor((Date.now() - contacted.getTime()) / (1000 * 60 * 60 * 24))
              : null;
            if (!contacted || (daysSinceContact ?? 0) >= STALE_DAYS) {
              score += 2;
              reasons.push(
                contacted ? `Not contacted in ${daysSinceContact} days` : "Never contacted"
              );
            }

            const stageLabel = l.stage.replace(/_/g, " ");
            reasons.push(`${stageLabel.charAt(0).toUpperCase() + stageLabel.slice(1)} stage`);

            return { lead: l, score, reason: reasons.join(" · ") };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        setTopLeads(scored);
      } catch {
        setTarget(0);
        setPackages([]);
        setTopLeads([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [employee]);

  if (!user || user.systemRole !== "sales") return null;

  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  const mySummary = summaries.find(
    s => s.agentId === employee?.id && s.month === month && s.year === year
  );
  const achieved = mySummary?.incentiveAmount ?? 0;
  const pct      = target > 0 ? (achieved / target) * 100 : 0;
  const cappedPct = Math.min(pct, 100);
  const daysLeft  = new Date(year, month + 1, 0).getDate() - now.getDate();

  let message: string;
  let messageTone: "success" | "warning" | "info" | "default";
  if (pct >= 100) {
    message = "You've hit your target this month! Great work. 🎉";
    messageTone = "success";
  } else if (daysLeft <= 5 && pct < 70) {
    message = `Only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left this month — push to close a few more deals.`;
    messageTone = "warning";
  } else if (daysLeft <= 10 && pct < 50) {
    message = `${daysLeft} days left and you're at ${cappedPct.toFixed(0)}% — a couple more confirmed bookings will get you there.`;
    messageTone = "info";
  } else {
    message = "You're on track — keep the momentum going this month.";
    messageTone = "default";
  }

  const topPackages = [...packages]
    .sort((a, b) => (b.basePrice - b.costPrice) - (a.basePrice - a.costPrice))
    .slice(0, 2);

  const isLoading = employeeLoading || incentivesLoading || loading;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>My Sales Progress</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Your monthly incentive & closing priorities</p>
        </div>
      </CardHeader>

      {isLoading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-5">

          {/* Incentive progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground">Monthly incentive</span>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(achieved)} / {formatCurrency(target)}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${cappedPct}%` }}
              />
            </div>
            <p className={`mt-2 text-xs ${
              messageTone === "success" ? "text-green-600 dark:text-green-400 font-medium" :
              messageTone === "warning" ? "text-amber-600 dark:text-amber-400 font-medium" :
              messageTone === "info"    ? "text-blue-600 dark:text-blue-400" :
              "text-muted-foreground"
            }`}>
              {message}
            </p>
          </div>

          {/* Best package */}
          {topPackages.length > 0 && (
            <div className="rounded-lg border-l-4 border-l-primary bg-muted/30 p-3">
              <p className="text-xs font-medium text-foreground mb-2">Sell this for the biggest margin</p>
              <ul className="space-y-1">
                {topPackages.map(pkg => (
                  <li key={pkg.id} className="text-xs text-muted-foreground">
                    • Selling <span className="text-foreground font-medium">{pkg.title}</span> earns the
                    most right now — {formatCurrency(pkg.basePrice - pkg.costPrice)} margin per booking.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Leads to close fast */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Leads to close fast</p>
            {topLeads.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No open leads assigned to you right now — new leads will show up here as soon as they&apos;re assigned.
              </p>
            ) : (
              <ul className="space-y-2">
                {topLeads.map(({ lead, reason }) => (
                  <li key={lead.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 p-2">
                    <span className="text-xs text-foreground font-medium truncate">{lead.name}</span>
                    <Badge variant={lead.priority === PRIORITY.HOT ? "danger" : "outline"} className="shrink-0">
                      {reason}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </Card>
  );
}
