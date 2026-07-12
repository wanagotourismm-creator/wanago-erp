"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils/helpers";
import { useTeamPulse } from "@/modules/team-pulse/hooks/useTeamPulse";
import type { Sentiment } from "@/modules/team-pulse/types";

const FACES: { value: Sentiment; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Struggling" },
  { value: 2, emoji: "😕", label: "Not great" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

export function TeamPulsePage() {
  const { submitted, aggregate, loading, submitting, error, submit } = useTeamPulse();
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [comment, setComment] = useState("");

  async function handleSubmit() {
    if (!sentiment) return;
    await submit({ sentiment, comment });
  }

  return (
    <div className="max-w-lg space-y-5">
      <PageHeader
        title="Team Pulse"
        description="A quick, anonymous check-in — your individual answer is never shown to anyone, only combined with everyone else's."
      />

      {loading ? (
        <Card><div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></Card>
      ) : submitted ? (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Heart size={16} className="text-primary" />
            <CardTitle>Thanks — here&apos;s this week so far</CardTitle>
          </div>
          {aggregate && aggregate.totalResponses > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {aggregate.totalResponses} response{aggregate.totalResponses === 1 ? "" : "s"} this week · average {aggregate.averageSentiment}/5
              </p>
              <div className="space-y-1.5">
                {FACES.map((f) => {
                  const count = aggregate.distribution[f.value];
                  const pct = aggregate.totalResponses > 0 ? (count / aggregate.totalResponses) * 100 : 0;
                  return (
                    <div key={f.value} className="flex items-center gap-2 text-xs">
                      <span className="w-6">{f.emoji}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">You&apos;re the first to respond this week.</p>
          )}
        </Card>
      ) : (
        <Card>
          <CardTitle>How&apos;s your week going?</CardTitle>
          <div className="mt-4 flex justify-between gap-2">
            {FACES.map((f) => (
              <button
                key={f.value}
                onClick={() => setSentiment(f.value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl border-2 py-3 text-2xl transition-all",
                  sentiment === f.value ? "border-primary bg-primary/10 scale-105" : "border-border hover:border-primary/40"
                )}
              >
                {f.emoji}
                <span className="text-[10px] font-medium text-muted-foreground">{f.label}</span>
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything you want to add? (optional, also anonymous)"
            className="mt-4 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary transition-colors"
          />

          {error && <p className="mt-2 text-xs text-destructive font-medium">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!sentiment || submitting}
            className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {submitting ? "Submitting..." : "Submit anonymously"}
          </button>
        </Card>
      )}
    </div>
  );
}
