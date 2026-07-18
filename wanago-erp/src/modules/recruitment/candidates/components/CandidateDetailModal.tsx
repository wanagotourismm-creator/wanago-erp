"use client";

import { useEffect, useState } from "react";
import { X, Phone, Mail, Edit2, Trash2, FileText, User, Briefcase, Sparkles, Loader2 } from "lucide-react";
import { STAGE_STYLES } from "@/modules/recruitment/candidates/components/CandidatesTable";
import { formatDate, initials, cn } from "@/lib/utils/helpers";
import { RECRUITMENT_STAGE_LABELS } from "@/lib/constants";
import { summarizeResume } from "@/modules/recruitment/candidates/services/candidate-ai.service";
import type { Candidate } from "@/modules/recruitment/candidates/types";

type Props = {
  candidate: Candidate | null;
  canManage: boolean;
  onClose:   () => void;
  onEdit:    (candidate: Candidate) => void;
  onDelete:  (candidate: Candidate) => void;
  onStage:   (candidate: Candidate, stage: string) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function CandidateDetailModal({ candidate, canManage, onClose, onEdit, onDelete, onStage }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    setSummary(null);
    setSummaryError(null);
  }, [candidate?.id]);

  if (!candidate) return null;

  async function handleSummarize() {
    if (!candidate?.resumeUrl) return;
    setSummarizing(true);
    setSummaryError(null);
    const result = await summarizeResume(candidate.resumeUrl);
    if ("error" in result) setSummaryError(result.error);
    else setSummary(result.text);
    setSummarizing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(candidate.fullName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{candidate.fullName}</h2>
              <p className="text-xs text-muted-foreground">{candidate.refNumber} · Added {formatDate(candidate.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium", STAGE_STYLES[candidate.status])}>
              {RECRUITMENT_STAGE_LABELS[candidate.status] ?? candidate.status}
            </span>
            {candidate.source && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {candidate.source}
              </span>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Contact</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Phone" value={<span className="inline-flex items-center gap-1.5"><Phone size={12} />{candidate.phone}</span>} />
              {candidate.email && <Row label="Email" value={<span className="inline-flex items-center gap-1.5"><Mail size={12} />{candidate.email}</span>} />}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Briefcase size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Application</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Applying For" value={candidate.jobOpeningTitle ?? "General"} />
              <Row label="Office" value={candidate.officeName} />
              <Row label="Interview Date" value={candidate.interviewDate ? formatDate(candidate.interviewDate) : null} />
              <Row label="Interviewer" value={candidate.interviewerName} />
              <Row
                label="Resume"
                value={
                  candidate.resumeUrl ? (
                    <span className="inline-flex items-center gap-3">
                      <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                        <FileText size={12} /> View
                      </a>
                      <button
                        onClick={handleSummarize}
                        disabled={summarizing}
                        className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-60"
                      >
                        {summarizing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        Summarize
                      </button>
                    </span>
                  ) : null
                }
              />
            </div>
            {summaryError && <p className="mt-1.5 text-xs text-destructive font-medium">{summaryError}</p>}
            {summary && (
              <p className="mt-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground whitespace-pre-wrap">
                {summary}
              </p>
            )}
          </div>

          {candidate.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {candidate.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button
                  onClick={() => onEdit(candidate)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => onDelete(candidate)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
          {canManage && (
            <select
              value={candidate.status}
              onChange={(e) => onStage(candidate, e.target.value)}
              className={cn("rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium cursor-pointer", STAGE_STYLES[candidate.status])}
            >
              {Object.entries(RECRUITMENT_STAGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          )}
        </div>

      </div>
    </div>
  );
}
