import { LEAD_STAGE_LABELS } from "@/lib/constants";
import type { LeadPipelineItem } from "@/modules/dashboard/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

type Props = {
  pipeline: LeadPipelineItem[];
};

export function LeadPipeline({ pipeline }: Props) {
  const total = pipeline.reduce((s, p) => s + p.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Pipeline</CardTitle>
      </CardHeader>
      <div className="space-y-2.5">
        {pipeline.map((item) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={item.stage} className="flex items-center gap-3">
              <span className="w-24 text-xs text-muted-foreground truncate">
                {LEAD_STAGE_LABELS[item.stage as keyof typeof LEAD_STAGE_LABELS] ?? item.stage}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width:      `${pct}%`,
                    background: item.color,
                  }}
                />
              </div>
              <span className="w-5 text-right text-xs font-medium text-foreground">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
