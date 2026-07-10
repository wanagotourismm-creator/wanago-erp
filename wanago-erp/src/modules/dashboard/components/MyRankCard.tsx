"use client";

import { Trophy } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/helpers";
import { formatRankGapMessage, type MyRank } from "@/modules/dashboard/hooks/useMyRank";

export function MyRankCard({ rank, loading }: { rank: MyRank; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <CardTitle>My Rank This Month</CardTitle>
        </div>
      </CardHeader>

      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {rank.rank != null ? `#${rank.rank}` : "—"}
            </span>
            {rank.totalAgents > 0 && (
              <span className="text-sm text-muted-foreground">of {rank.totalAgents} agents</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{formatRankGapMessage(rank)}</p>
          {rank.myRevenue > 0 && (
            <p className="text-xs text-muted-foreground">
              Your revenue this month: <span className="font-medium text-foreground">{formatCurrency(rank.myRevenue)}</span>
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
