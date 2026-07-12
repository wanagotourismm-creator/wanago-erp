"use client";

import { Fragment } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn, formatCurrency } from "@/lib/utils/helpers";
import { useLatestWeeklyDigest } from "@/modules/digests/hooks/useLatestWeeklyDigest";

// Reads the precomputed digest written by the weekly-sales-digest cron
// (Mondays, 4am UTC — see vercel.json) instead of recomputing a leaderboard
// live, so this loads instantly. `highlight` (top 3 only) is the AI-narrated
// sentence generated alongside the numbers in that same cron run — grounded
// only in this row's own stats, never fabricated.
export function WeeklyLeaderboardCard() {
  const { digest, loading } = useLatestWeeklyDigest();
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardTitle>Weekly Leaderboard</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          {digest ? `Week of ${digest.weekOf}` : "Last full week"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/30">
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-8">#</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Agent</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Won</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Loading...</td>
              </tr>
            ) : !digest || digest.rankings.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No leaderboard yet — generates every Monday.
                </td>
              </tr>
            ) : digest.rankings.slice(0, 5).map((r, i) => (
              <Fragment key={r.agentId}>
                <tr className={cn("hover:bg-muted/30 transition-colors", !r.highlight && "border-b border-border last:border-0")}>
                  <td className="px-4 py-3 text-base">{medals[i] ?? i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    {r.agentName}
                    {r.streakWeeks >= 2 && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-400">
                        🔥 {r.streakWeeks}w
                      </span>
                    )}
                    {r.isPersonalBest && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        🏆 Best week
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-primary font-semibold">{r.bookingsConfirmed}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">{formatCurrency(r.revenue)}</td>
                </tr>
                {r.highlight && (
                  <tr className="border-b border-border last:border-0">
                    <td colSpan={4} className="px-4 pb-3 text-xs italic text-muted-foreground">
                      ✨ {r.highlight}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
