"use client";

import { LEAD_STAGE_LABELS } from "@/lib/constants";
import type { LeadPipelineItem } from "@/modules/dashboard/types";

type Props = { pipeline: LeadPipelineItem[] };

export function LeadPipeline({ pipeline }: Props) {
  const total = pipeline.reduce((s, p) => s + p.count, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Lead Pipeline</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {total} total lead{total !== 1 ? "s" : ""} in pipeline
        </p>
      </div>
      <div className="space-y-3">
        {pipeline.map((item) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={item.stage}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">
                  {LEAD_STAGE_LABELS[item.stage as keyof typeof LEAD_STAGE_LABELS] ?? item.stage}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                  <span className="w-5 text-right text-xs font-semibold text-foreground">{item.count}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
