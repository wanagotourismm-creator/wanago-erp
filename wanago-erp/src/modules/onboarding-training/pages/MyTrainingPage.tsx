"use client";

import { useState, useEffect } from "react";
import { GraduationCap, CheckCircle2, PlayCircle, Loader2, Award, Download, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMyTraining } from "@/modules/onboarding-training/hooks/useMyTraining";
import { useTrainingWalkthrough } from "@/modules/onboarding-training/hooks/useTrainingWalkthrough";
import { fetchMyCertificates } from "@/modules/onboarding-training/services/certificate.service";
import { useAuthStore } from "@/store/auth.store";
import { formatDate } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils/helpers";
import type { TrainingCertificate } from "@/modules/onboarding-training/types";

export function MyTrainingPage() {
  const { items, loading, error } = useMyTraining();
  const { startModule, starting } = useTrainingWalkthrough();
  const { user } = useAuthStore();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);
  const [certsLoading, setCertsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchMyCertificates(user.uid).then(setCertificates).catch(() => {}).finally(() => setCertsLoading(false));
  }, [user]);

  async function handleStart(moduleId: string) {
    const item = items.find((i) => i.module.id === moduleId);
    if (!item || item.locked) return;
    setStartingId(moduleId);
    await startModule(item.module);
    setStartingId(null);
  }

  return (
    <div>
      <PageHeader title="My Training" description="Interactive walkthroughs that show you how to use the ERP, step by step." />

      {error && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState title="No training modules yet" description="Check back once your team publishes onboarding walkthroughs" icon={<GraduationCap size={20} />} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ module, totalSteps, completedCount, percent, isComplete, started, locked }) => (
            <div key={module.id} className={cn("flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm", locked && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div className={cn(
                  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                  isComplete ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"
                )}>
                  {isComplete ? <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" /> : <GraduationCap size={16} className="text-primary" />}
                </div>
                {isComplete && (
                  <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">Completed</span>
                )}
              </div>

              <p className="mt-3 text-sm font-semibold text-foreground">{module.title}</p>
              {module.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{module.description}</p>}

              {totalSteps === 0 ? (
                <p className="mt-4 text-xs italic text-muted-foreground">No steps added yet</p>
              ) : (
                <>
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{completedCount} of {totalSteps} steps · {percent}%</p>
                </>
              )}

              {locked && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Lock size={11} /> Complete earlier required modules first
                </p>
              )}

              <button
                onClick={() => handleStart(module.id)}
                disabled={locked || totalSteps === 0 || (starting && startingId === module.id)}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {starting && startingId === module.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : locked ? (
                  <Lock size={13} />
                ) : (
                  <PlayCircle size={13} />
                )}
                {locked ? "Locked" : isComplete ? "Review Again" : started ? "Continue" : "Start Training"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!certsLoading && certificates.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-foreground">My Certificates</h2>
          <div className="space-y-2">
            {certificates.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <Award size={16} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{c.moduleTitle}</p>
                  <p className="text-[11px] text-muted-foreground">{c.certificateId} · Completed {formatDate(c.completedAt)}</p>
                </div>
                <a href={c.pdfUrl} target="_blank" rel="noreferrer" title="Download PDF"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Download size={15} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
