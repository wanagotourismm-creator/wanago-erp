"use client";

import { useState, useMemo } from "react";
import { Plus, RefreshCw, Briefcase, Users, UserCheck, XCircle } from "lucide-react";
import { useJobOpenings } from "@/modules/recruitment/jobs/hooks/useJobOpenings";
import { useCandidates } from "@/modules/recruitment/candidates/hooks/useCandidates";
import { JobOpeningsTable } from "@/modules/recruitment/jobs/components/JobOpeningsTable";
import { JobOpeningForm } from "@/modules/recruitment/jobs/components/JobOpeningForm";
import { JobOpeningDetailModal } from "@/modules/recruitment/jobs/components/JobOpeningDetailModal";
import { CandidatesTable } from "@/modules/recruitment/candidates/components/CandidatesTable";
import { CandidateForm } from "@/modules/recruitment/candidates/components/CandidateForm";
import { CandidateDetailModal } from "@/modules/recruitment/candidates/components/CandidateDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import type { JobOpening } from "@/modules/recruitment/jobs/types";
import type { JobOpeningSchema } from "@/modules/recruitment/jobs/schemas";
import type { Candidate } from "@/modules/recruitment/candidates/types";
import type { CandidateSchema } from "@/modules/recruitment/candidates/schemas";

export function RecruitmentPage() {
  const { user } = useAuthStore();
  const canManage = !!user && hasPermission(user.systemRole, "hrms:manage");

  const [tab, setTab] = useState<"jobs" | "candidates">("jobs");

  const { jobs, loading: jobsLoading, addJob, editJob, removeJob, load: loadJobs } = useJobOpenings();
  const {
    candidates, loading: candidatesLoading, addCandidate, editCandidate,
    changeStage, removeCandidate, uploadCandidateResume, load: loadCandidates,
  } = useCandidates();

  const [jobFormOpen,   setJobFormOpen]   = useState(false);
  const [editingJob,    setEditingJob]    = useState<JobOpening | null>(null);
  const [viewingJob,    setViewingJob]    = useState<JobOpening | null>(null);
  const [candFormOpen,  setCandFormOpen]  = useState(false);
  const [editingCand,   setEditingCand]   = useState<Candidate | null>(null);
  const [viewingCand,   setViewingCand]   = useState<Candidate | null>(null);

  const stats = useMemo(() => ({
    openJobs:   jobs.filter(j => j.jobStatus === "open").length,
    totalCandidates: candidates.length,
    joined:     candidates.filter(c => c.status === "joined").length,
    rejected:   candidates.filter(c => c.status === "rejected").length,
  }), [jobs, candidates]);

  async function handleJobSubmit(data: JobOpeningSchema) {
    const payload = { ...data, description: data.description || null, requirements: data.requirements || null, closingDate: data.closingDate || null, createdBy: user?.uid ?? "" };
    if (editingJob) await editJob(editingJob.id, payload);
    else await addJob(payload);
    setJobFormOpen(false);
    setEditingJob(null);
  }

  function handleJobEdit(job: JobOpening) {
    setViewingJob(null);
    setEditingJob(job);
    setJobFormOpen(true);
  }

  async function handleJobDelete(job: JobOpening) {
    if (!confirm(`Delete job opening "${job.title}"? This cannot be undone.`)) return;
    setViewingJob(null);
    await removeJob(job.id);
  }

  async function handleCandidateSubmit(data: CandidateSchema) {
    const payload = {
      ...data,
      email: data.email || null,
      jobOpeningId: data.jobOpeningId || null,
      jobOpeningTitle: data.jobOpeningTitle || null,
      interviewDate: data.interviewDate || null,
      interviewerName: data.interviewerName || null,
      notes: data.notes || null,
      createdBy: user?.uid ?? "",
    };
    if (editingCand) await editCandidate(editingCand.id, payload);
    else await addCandidate(payload);
    setCandFormOpen(false);
    setEditingCand(null);
  }

  function handleCandidateEdit(candidate: Candidate) {
    setViewingCand(null);
    setEditingCand(candidate);
    setCandFormOpen(true);
  }

  async function handleCandidateDelete(candidate: Candidate) {
    if (!confirm(`Delete candidate "${candidate.fullName}"? This cannot be undone.`)) return;
    setViewingCand(null);
    await removeCandidate(candidate.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Recruitment"
        description="Job openings and hiring pipeline"
        actions={
          <>
            {tab === "jobs" && (
              <>
                <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadJobs()}>Refresh</Button>
                {canManage && (
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingJob(null); setJobFormOpen(true); }}>Post Job</Button>
                )}
              </>
            )}
            {tab === "candidates" && (
              <>
                <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadCandidates()}>Refresh</Button>
                {canManage && (
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingCand(null); setCandFormOpen(true); }}>Add Candidate</Button>
                )}
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Open Positions", value: stats.openJobs,        icon: Briefcase, color: "text-primary"    },
          { label: "Total Candidates", value: stats.totalCandidates, icon: Users,   color: "text-blue-600"   },
          { label: "Joined",         value: stats.joined,           icon: UserCheck, color: "text-green-600" },
          { label: "Rejected",       value: stats.rejected,         icon: XCircle,  color: "text-red-600"    },
        ].map(s => (
          <div key={s.label} className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <s.icon size={18} className="text-primary" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-border">
        <button onClick={() => setTab("jobs")} className={cn(
          "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "jobs" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Briefcase size={14} /> Job Openings
        </button>
        <button onClick={() => setTab("candidates")} className={cn(
          "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "candidates" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Users size={14} /> Candidates
        </button>
      </div>

      {tab === "jobs" && (
        <JobOpeningsTable
          jobs={jobs}
          loading={jobsLoading}
          canManage={canManage}
          onView={setViewingJob}
          onEdit={handleJobEdit}
          onDelete={handleJobDelete}
          onStatus={(job, status) => editJob(job.id, { jobStatus: status })}
        />
      )}

      {tab === "candidates" && (
        <CandidatesTable
          candidates={candidates}
          loading={candidatesLoading}
          canManage={canManage}
          onView={setViewingCand}
          onEdit={handleCandidateEdit}
          onDelete={handleCandidateDelete}
          onStage={(c, stage) => changeStage(c.id, stage)}
        />
      )}

      <JobOpeningDetailModal
        job={viewingJob ? jobs.find(j => j.id === viewingJob.id) ?? viewingJob : null}
        canManage={canManage}
        onClose={() => setViewingJob(null)}
        onEdit={handleJobEdit}
        onDelete={handleJobDelete}
        onStatus={(job, status) => editJob(job.id, { jobStatus: status })}
      />

      <CandidateDetailModal
        candidate={viewingCand ? candidates.find(c => c.id === viewingCand.id) ?? viewingCand : null}
        canManage={canManage}
        onClose={() => setViewingCand(null)}
        onEdit={handleCandidateEdit}
        onDelete={handleCandidateDelete}
        onStage={(c, stage) => changeStage(c.id, stage)}
      />

      <JobOpeningForm
        open={jobFormOpen}
        job={editingJob}
        onClose={() => { setJobFormOpen(false); setEditingJob(null); }}
        onSubmit={handleJobSubmit}
      />

      <CandidateForm
        open={candFormOpen}
        candidate={editingCand}
        onClose={() => { setCandFormOpen(false); setEditingCand(null); }}
        onSubmit={handleCandidateSubmit}
        onUploadResume={async (file) => {
          if (!editingCand) return;
          const url = await uploadCandidateResume(editingCand.id, file);
          setEditingCand(prev => prev ? { ...prev, resumeUrl: url } : prev);
        }}
      />

    </div>
  );
}
