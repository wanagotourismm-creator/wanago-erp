"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap, Plus, Pencil, Trash2, ChevronLeft, ChevronUp, ChevronDown,
  MapPin, HelpCircle, Loader2, Sparkles, Award, Download,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTrainingContentAdmin } from "@/modules/onboarding-training/hooks/useTrainingContentAdmin";
import { TrainingModuleForm } from "@/modules/onboarding-training/components/TrainingModuleForm";
import { TrainingStepForm } from "@/modules/onboarding-training/components/TrainingStepForm";
import { fetchAllCertificates } from "@/modules/onboarding-training/services/certificate.service";
import { auth } from "@/lib/firebase/client";
import { formatDate } from "@/lib/utils/helpers";
import type { TrainingModuleSchema, TrainingStepSchema } from "@/modules/onboarding-training/schemas";
import type { TrainingModule, TrainingStep, TrainingCertificate } from "@/modules/onboarding-training/types";

export function OnboardingTrainingAdminPage() {
  const {
    modules, loadingModules, error,
    selectedModule, selectedModuleId, setSelectedModuleId,
    steps, loadingSteps,
    addModule, editModule, removeModule, moveModule,
    addStep, editStep, removeStep, moveStep,
    reloadModules,
  } = useTrainingContentAdmin();

  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [stepFormOpen, setStepFormOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<TrainingStep | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [showCertificates, setShowCertificates] = useState(false);
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);
  const [certsLoading, setCertsLoading] = useState(false);

  useEffect(() => {
    if (!showCertificates) return;
    setCertsLoading(true);
    fetchAllCertificates().then(setCertificates).catch(() => {}).finally(() => setCertsLoading(false));
  }, [showCertificates]);

  async function handleSeed() {
    if (!confirm("Generate/refresh the default training catalog? New modules are created; modules that already exist have their steps refreshed to match the latest content (any in-progress employee progress on a refreshed module resets). Manually-created modules aren't touched.")) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/onboarding-training/seed", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        setSeedResult(data.error ?? "Failed to generate training content");
      } else {
        setSeedResult(`Created ${data.modulesCreated} module${data.modulesCreated === 1 ? "" : "s"}, refreshed ${data.modulesRefreshed} — ${data.stepsCreated} total steps now.`);
        await reloadModules();
      }
    } catch {
      setSeedResult("Failed to generate training content");
    } finally {
      setSeeding(false);
    }
  }

  async function handleModuleSubmit(data: TrainingModuleSchema) {
    const result = editingModule ? await editModule(editingModule.id, data) : await addModule(data);
    if (!result.error) { setModuleFormOpen(false); setEditingModule(null); }
  }

  async function handleDeleteModule(m: TrainingModule) {
    if (!confirm(`Delete "${m.title}" and all its steps? This can't be undone.`)) return;
    await removeModule(m.id);
  }

  async function handleStepSubmit(data: TrainingStepSchema) {
    const result = editingStep ? await editStep(editingStep.id, data) : await addStep(data);
    if (!result.error) { setStepFormOpen(false); setEditingStep(null); }
  }

  async function handleDeleteStep(s: TrainingStep) {
    if (!confirm("Delete this step? This can't be undone.")) return;
    await removeStep(s.id);
  }

  // ── Steps view for a selected module ─────────────────────────
  if (selectedModule) {
    return (
      <div>
        <button onClick={() => setSelectedModuleId(null)} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft size={15} /> All Modules
        </button>
        <PageHeader
          title={selectedModule.title}
          description={selectedModule.description ?? undefined}
          actions={
            <button onClick={() => { setEditingStep(null); setStepFormOpen(true); }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
              <Plus size={15} /> Add Step
            </button>
          }
        />

        {loadingSteps ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        ) : steps.length === 0 ? (
          <EmptyState title="No steps yet" description="Add the first step to start building this walkthrough" icon={<MapPin size={20} />} />
        ) : (
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <button onClick={() => moveStep(s.id, "up")} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp size={14} /></button>
                  <button onClick={() => moveStep(s.id, "down")} disabled={i === steps.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown size={14} /></button>
                </div>
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin size={11} />
                    <span className="font-mono">{s.targetPath}</span>
                    <span>→</span>
                    <span>{s.targetSelector}</span>
                    {s.quiz && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        <HelpCircle size={10} /> Quiz
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-foreground">{s.explanationEn}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.explanationMl}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button onClick={() => { setEditingStep(s); setStepFormOpen(true); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={13} /></button>
                  <button onClick={() => handleDeleteStep(s)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <TrainingStepForm open={stepFormOpen} step={editingStep}
          onClose={() => { setStepFormOpen(false); setEditingStep(null); }}
          onSubmit={handleStepSubmit} />
      </div>
    );
  }

  // ── All-certificates view (compliance tracking) ───────────────
  if (showCertificates) {
    return (
      <div>
        <button onClick={() => setShowCertificates(false)} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft size={15} /> All Modules
        </button>
        <PageHeader title="Certificates" description="Every training completion certificate issued, across all employees." />

        {certsLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        ) : certificates.length === 0 ? (
          <EmptyState title="No certificates issued yet" description="Certificates appear here as employees complete training modules" icon={<Award size={20} />} />
        ) : (
          <div className="space-y-2">
            {certificates.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <Award size={16} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{c.employeeName} — {c.moduleTitle}</p>
                  <p className="text-[11px] text-muted-foreground">{c.certificateId} · Completed {formatDate(c.completedAt)}</p>
                </div>
                <a href={c.pdfUrl} target="_blank" rel="noreferrer" title="Download PDF"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Download size={15} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Modules list view ─────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Onboarding Training"
        description="Interactive walkthroughs that teach staff how to use the ERP — build each module's steps here."
        actions={
          <>
            <button onClick={() => setShowCertificates(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
              <Award size={15} /> Certificates
            </button>
            <button onClick={handleSeed} disabled={seeding}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15 disabled:opacity-60 transition-colors">
              {seeding ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              Generate / Refresh Default Content
            </button>
            <button onClick={() => { setEditingModule(null); setModuleFormOpen(true); }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
              <Plus size={15} /> New Module
            </button>
          </>
        }
      />

      {seedResult && <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">{seedResult}</div>}
      {error && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

      {loadingModules ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
      ) : modules.length === 0 ? (
        <EmptyState title="No training modules yet" description="Create your first module, then add its steps" icon={<GraduationCap size={20} />} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <div key={m.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <GraduationCap size={16} className="text-primary" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveModule(m.id, "up")} disabled={i === 0} title="Move up"
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp size={13} /></button>
                    <button onClick={() => moveModule(m.id, "down")} disabled={i === modules.length - 1} title="Move down"
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown size={13} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingModule(m); setModuleFormOpen(true); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={13} /></button>
                  <button onClick={() => handleDeleteModule(m)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{m.title}</p>
                {m.mandatory && (
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">Mandatory</span>
                )}
              </div>
              {m.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.description}</p>}
              <button onClick={() => setSelectedModuleId(m.id)}
                className="mt-4 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                Manage Steps
              </button>
            </div>
          ))}
        </div>
      )}

      <TrainingModuleForm open={moduleFormOpen} module={editingModule}
        onClose={() => { setModuleFormOpen(false); setEditingModule(null); }}
        onSubmit={handleModuleSubmit} />
    </div>
  );
}
