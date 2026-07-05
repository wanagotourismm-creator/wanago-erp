"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { initials } from "@/lib/utils/helpers";
import type { Candidate } from "@/modules/recruitment/candidates/types";

type Props = {
  candidates: Candidate[];
  matched: number;
  notMatched: number;
  openOpenings: number;
};

export function HiringStatsCard({ candidates, matched, notMatched, openOpenings }: Props) {
  const total = matched + notMatched || 1;
  const matchedPct = Math.round((matched / total) * 100);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Talent Recruitment</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{openOpenings} open position{openOpenings !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/recruitment" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
          View Openings <ArrowRight size={12} />
        </Link>
      </CardHeader>

      <div className="mb-4 flex -space-x-2">
        {candidates.length === 0 && <p className="text-xs text-muted-foreground">No candidates yet</p>}
        {candidates.slice(0, 4).map((c) => (
          <div key={c.id} title={c.fullName} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[10px] font-bold text-primary">
            {initials(c.fullName)}
          </div>
        ))}
      </div>

      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{matched} Matched</span>
        <span>{notMatched} Not Match</span>
      </div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted">
        <div className="bg-primary" style={{ width: `${matchedPct}%` }} />
      </div>
    </Card>
  );
}
