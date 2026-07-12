"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, RefreshCw, Briefcase, Users, UserCheck, XCircle, Upload } from "lucide-react";
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
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { createJobOpening } from "@/modules/recruitment/jobs/services/job.service";
import { jobOpeningSchema } from "@/modules/recruitment/jobs/schemas";
import { candidateSchema } from "@/modules/recruitment/candidates/schemas";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Office } from "@/modules/admin/offices/types";
import type { JobOpening, JobOpeningFormData } from "@/modules/recruitment/jobs/types";
import type { JobOpeningSchema } from "@/modules/recruitment/jobs/schemas";
import type { Candidate, CandidateFormData } from "@/modules/recruitment/candidates/types";
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
  const [jobImportOpen, setJobImportOpen] = useState(false);
  const [candImportOpen, setCandImportOpen] = useState(false);
  const [offices,       setOffices]       = useState<Office[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => { fetchOffices().then(setOffices); }, []);

  // Supports deep-linking straight into a candidate's detail view, e.g.
  // from Global Search (/recruitment?view=<id>).
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (!viewId || candidates.length === 0) return;
    const match = candidates.find((c) => c.id === viewId);
    if (match) {
      setTab("candidates");
      setViewingCand(match);
    }
    router.replace("/recruitment");
  }, [searchParams, candidates, router]);

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

  const jobExportRows = useMemo(() => jobs.map((j) => ({
    Title:          j.title,
    Department:     j.department,
    Location:       j.location,
    "Employment Type": j.employmentType,
    Description:    j.description ?? "",
    Requirements:   j.requirements ?? "",
    Openings:       j.openings,
    "Posted Date":  j.postedDate,
    "Closing Date": j.closingDate ?? "",
    Office:         j.officeName,
  })), [jobs]);

  const jobTemplateColumns: TemplateColumn[] = [
    { key: "title", label: "Title", required: true, example: "Travel Consultant" },
    { key: "department", label: "Department", required: true, example: "Operations" },
    { key: "location", label: "Location", required: true, example: "Mumbai" },
    { key: "employmentType", label: "Employment Type", example: "full_time" },
    { key: "description", label: "Description" },
    { key: "requirements", label: "Requirements" },
    { key: "openings", label: "Openings", required: true, example: "2" },
    { key: "postedDate", label: "Posted Date", required: true, example: "2026-01-01" },
    { key: "closingDate", label: "Closing Date", example: "2026-02-01" },
    { key: "office", label: "Office", example: "Head Office" },
  ];

  const EMPLOYMENT_TYPE_MAP: Record<string, JobOpeningSchema["employmentType"]> = {
    full_time: "full_time", "full-time": "full_time", "full time": "full_time",
    part_time: "part_time", "part-time": "part_time", "part time": "part_time",
    contract: "contract",
    intern: "intern", internship: "intern",
  };

  function onParseJobRow(raw: Record<string, string>) {
    const office = resolveOffice(raw["Office"], offices, {
      officeId: user?.officeId ?? "",
      officeName: user?.officeName ?? "",
    });
    const rawType = raw["Employment Type"]?.trim().toLowerCase() ?? "";
    const employmentType = EMPLOYMENT_TYPE_MAP[rawType] ?? "full_time";
    const candidate = {
      title: raw["Title"] ?? "",
      department: raw["Department"] ?? "",
      location: raw["Location"] ?? "",
      employmentType,
      description: raw["Description"] ?? "",
      requirements: raw["Requirements"] ?? "",
      openings: raw["Openings"] ?? "",
      postedDate: raw["Posted Date"] ?? "",
      closingDate: raw["Closing Date"] ?? "",
      officeId: office.officeId,
      officeName: office.officeName,
    };
    const check = jobOpeningSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };
    return { data: check.data };
  }

  async function onImportJobs(rows: JobOpeningSchema[]) {
    let created = 0, failed = 0;
    for (const row of rows) {
      const payload: JobOpeningFormData = {
        ...row,
        description: row.description || null,
        requirements: row.requirements || null,
        closingDate: row.closingDate || null,
        createdBy: user?.uid ?? "",
      };
      try {
        await createJobOpening(payload, user?.uid ?? "");
        created++;
      } catch {
        failed++;
      }
    }
    await loadJobs();
    return { created, failed };
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

  const candidateExportRows = useMemo(() => candidates.map((c) => ({
    "Full Name":      c.fullName,
    "Phone":          c.phone,
    "Email":          c.email ?? "",
    "Job Opening":    c.jobOpeningTitle ?? "",
    "Source":         c.source,
    "Interview Date": c.interviewDate ?? "",
    "Interviewer":    c.interviewerName ?? "",
    "Notes":          c.notes ?? "",
    "Office":         c.officeName,
  })), [candidates]);

  const CANDIDATE_TEMPLATE_COLUMNS: TemplateColumn[] = [
    { key: "fullName",        label: "Full Name",       required: true, example: "Arjun Menon" },
    { key: "phone",           label: "Phone",           required: true, example: "+91 98765 43210" },
    { key: "email",           label: "Email",           example: "arjun@example.com" },
    { key: "jobOpening",      label: "Job Opening",     example: "Travel Consultant" },
    { key: "source",          label: "Source",          required: true, example: "Referral" },
    { key: "interviewDate",   label: "Interview Date",  example: "2026-08-01" },
    { key: "interviewerName", label: "Interviewer",     example: "" },
    { key: "notes",           label: "Notes",           example: "" },
    { key: "office",          label: "Office",          example: "Head Office" },
  ];

  // The "Job Opening" column is optional — it's matched case-insensitively
  // against the same job openings list the manual form's dropdown uses. A
  // blank or unmatched value just leaves the candidate as a general
  // application rather than failing the row.
  function onParseCandidateRow(raw: Record<string, string>): { data: CandidateFormData } | { error: string } {
    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    const jobTitleRaw = raw["Job Opening"]?.trim();
    const matchedJob = jobTitleRaw
      ? jobs.find((j) => j.title.toLowerCase() === jobTitleRaw.toLowerCase())
      : undefined;

    const candidate = {
      fullName:        raw["Full Name"]?.trim() ?? "",
      email:           raw["Email"]?.trim() ?? "",
      phone:           raw["Phone"]?.trim() ?? "",
      jobOpeningId:    matchedJob?.id ?? "",
      jobOpeningTitle: matchedJob?.title ?? "",
      source:          raw["Source"]?.trim() ?? "",
      interviewDate:   raw["Interview Date"]?.trim() ?? "",
      interviewerName: raw["Interviewer"]?.trim() ?? "",
      notes:           raw["Notes"]?.trim() ?? "",
      officeId:        office.officeId,
      officeName:      office.officeName,
    };

    const check = candidateSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };

    const d = check.data;
    const data: CandidateFormData = {
      fullName:        d.fullName,
      email:           d.email || null,
      phone:           d.phone,
      jobOpeningId:    d.jobOpeningId || null,
      jobOpeningTitle: d.jobOpeningTitle || null,
      source:          d.source,
      interviewDate:   d.interviewDate || null,
      interviewerName: d.interviewerName || null,
      notes:           d.notes || null,
      officeId:        d.officeId,
      officeName:      d.officeName,
      createdBy:       user?.uid ?? "",
    };
    return { data };
  }

  async function onImportCandidates(rows: CandidateFormData[]): Promise<{ created: number; failed: number }> {
    let created = 0, failed = 0;
    for (const row of rows) {
      const { error } = await addCandidate(row);
      if (error) failed++; else created++;
    }
    return { created, failed };
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
                  <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setJobImportOpen(true)}>Import</Button>
                )}
                <BulkExportButton filenameBase="job-openings" rows={jobExportRows} />
                {canManage && (
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingJob(null); setJobFormOpen(true); }}>Post Job</Button>
                )}
              </>
            )}
            {tab === "candidates" && (
              <>
                <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadCandidates()}>Refresh</Button>
                {canManage && (
                  <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setCandImportOpen(true)}>Import</Button>
                )}
                <BulkExportButton filenameBase="candidates" rows={candidateExportRows} />
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

      <BulkImportModal
        open={jobImportOpen}
        onClose={() => setJobImportOpen(false)}
        title="Job Openings"
        templateColumns={jobTemplateColumns}
        onParseRow={onParseJobRow}
        onImport={onImportJobs}
      />

      <CandidateForm
        open={candFormOpen}
        candidate={editingCand}
        onClose={() => { setCandFormOpen(false); setEditingCand(null); }}
        onSubmit={handleCandidateSubmit}
        onUploadResume={async (file) => {
          if (!editingCand) return { error: null };
          const { error, url } = await uploadCandidateResume(editingCand.id, file);
          if (url) setEditingCand(prev => prev ? { ...prev, resumeUrl: url } : prev);
          return { error };
        }}
      />

      <BulkImportModal<CandidateFormData>
        open={candImportOpen}
        onClose={() => setCandImportOpen(false)}
        title="Candidates"
        description="Upload a .csv or .xlsx file to add many candidates at once. Job Opening is optional and matched by title."
        templateColumns={CANDIDATE_TEMPLATE_COLUMNS}
        onParseRow={onParseCandidateRow}
        onImport={onImportCandidates}
      />

    </div>
  );
}
