"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, PlayCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useMyTraining } from "@/modules/onboarding-training/hooks/useMyTraining";
import { useTrainingWalkthrough } from "@/modules/onboarding-training/hooks/useTrainingWalkthrough";

// Only shown when there's something to act on — an in-progress module, or
// a brand-new one nobody's started. Fully caught-up (everything completed,
// or no modules published yet) means nothing renders here at all.
export function ContinueTrainingCard() {
  const { items, loading } = useMyTraining();
  const { startModule } = useTrainingWalkthrough();
  const router = useRouter();

  if (loading) return null;

  const actionable = items.filter((i) => i.totalSteps > 0 && !i.isComplete).slice(0, 3);
  if (actionable.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GraduationCap size={15} className="text-primary" />
          <CardTitle>Continue Training</CardTitle>
        </div>
        <button onClick={() => router.push("/my-training")} className="text-xs text-primary hover:underline">View all</button>
      </CardHeader>

      <div className="space-y-2">
        {actionable.map(({ module, percent, started }) => (
          <button
            key={module.id}
            onClick={() => startModule(module)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{module.title}</p>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold text-primary">
              <PlayCircle size={13} /> {started ? "Continue" : "Start"}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
