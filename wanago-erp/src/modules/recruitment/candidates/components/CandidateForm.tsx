"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, UserPlus, Upload, FileText } from "lucide-react";
import { candidateSchema, type CandidateSchema } from "@/modules/recruitment/candidates/schemas";
import { fetchJobOpenings } from "@/modules/recruitment/jobs/services/job.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { JobOpening } from "@/modules/recruitment/jobs/types";
import type { Candidate } from "@/modules/recruitment/candidates/types";

const SOURCES = ["Referral", "Job Portal", "Walk-in", "Social Media", "Campus", "Other"];

type Props = {
  open:      boolean;
  candidate?: Candidate | null;
  onClose:   () => void;
  onSubmit:  (data: CandidateSchema) => Promise<void>;
  onUploadResume: (file: File) => Promise<{ error: string | null }>;
};

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

export function CandidateForm({ open, candidate, onClose, onSubmit, onUploadResume }: Props) {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<CandidateSchema>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (!open) return;
    fetchJobOpenings().then(j => setJobs(j.filter(x => x.jobStatus === "open"))).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open) {
      if (candidate) {
        reset({
          ...candidate,
          email:           candidate.email           ?? "",
          jobOpeningId:    candidate.jobOpeningId     ?? "",
          jobOpeningTitle: candidate.jobOpeningTitle  ?? "",
          interviewDate:   candidate.interviewDate    ?? "",
          interviewerName: candidate.interviewerName  ?? "",
          notes:           candidate.notes            ?? "",
        });
      } else {
        reset({
          officeId:   user?.officeId   ?? "main",
          officeName: user?.officeName ?? "Head Office",
        });
      }
    }
  }, [open, candidate, reset, user]);

  const selectedJobId = watch("jobOpeningId");

  function handleJobChange(id: string) {
    const job = jobs.find(j => j.id === id);
    setValue("jobOpeningId", id);
    setValue("jobOpeningTitle", job?.title ?? "");
  }

  async function handleResumeUpload(file: File) {
    if (!candidate) return;
    setUploadingResume(true);
    setResumeError(null);
    try {
      const { error } = await onUploadResume(file);
      if (error) setResumeError(error);
    } finally {
      setUploadingResume(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-xl max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <UserPlus size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{candidate ? "Edit Candidate" : "Add Candidate"}</h2>
              <p className="text-xs text-muted-foreground">{candidate ? `Editing ${candidate.refNumber}` : "Add a new applicant"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <Field label="Full Name" required error={errors.fullName?.message}>
                <input className={inputClass} placeholder="e.g. Arjun Menon" {...register("fullName")} />
              </Field>
            </div>
            <Field label="Phone" required error={errors.phone?.message}>
              <input className={inputClass} type="tel" placeholder="+91 98765 43210" {...register("phone")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input className={inputClass} type="email" placeholder="arjun@example.com" {...register("email")} />
            </Field>
            <Field label="Applying For">
              <select className={inputClass} value={selectedJobId ?? ""} onChange={e => handleJobChange(e.target.value)}>
                <option value="">General application</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </Field>
            <Field label="Source" required error={errors.source?.message}>
              <select className={inputClass} {...register("source")}>
                <option value="">Select source</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Interview Date">
              <input className={inputClass} type="date" {...register("interviewDate")} />
            </Field>
            <Field label="Interviewer">
              <input className={inputClass} placeholder="Interviewer name" {...register("interviewerName")} />
            </Field>
            <div className="col-span-2">
              <Field label="Notes">
                <textarea rows={3} className={cn(inputClass, "resize-none")} placeholder="Interview notes, feedback..." {...register("notes")} />
              </Field>
            </div>

            {candidate && (
              <div className="col-span-2">
                <Field label="Resume">
                  <div className="flex items-center gap-2">
                    {candidate.resumeUrl && (
                      <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <FileText size={13} /> View current resume
                      </a>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
                      {uploadingResume ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      {candidate.resumeUrl ? "Replace" : "Upload"} Resume
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={uploadingResume}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); }} />
                    </label>
                  </div>
                  {resumeError && <p className="mt-1 text-xs text-destructive font-medium">{resumeError}</p>}
                </Field>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {candidate ? "Changes will be saved immediately" : "Resume can be uploaded after adding the candidate"}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {candidate ? "Save Changes" : "Add Candidate"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
