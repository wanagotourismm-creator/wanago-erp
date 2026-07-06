"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, RefreshCw, GraduationCap, Users, CheckCircle2, Clock, Upload } from "lucide-react";
import { useTrainingPrograms } from "@/modules/training/programs/hooks/useTrainingPrograms";
import { useEnrollments } from "@/modules/training/enrollments/hooks/useEnrollments";
import { TrainingProgramsGrid } from "@/modules/training/programs/components/TrainingProgramsGrid";
import { TrainingProgramForm } from "@/modules/training/programs/components/TrainingProgramForm";
import { EnrollmentsTable } from "@/modules/training/enrollments/components/EnrollmentsTable";
import { EnrollmentForm } from "@/modules/training/enrollments/components/EnrollmentForm";
import { EnrollmentDetailModal } from "@/modules/training/enrollments/components/EnrollmentDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { createTrainingProgram } from "@/modules/training/programs/services/program.service";
import { trainingProgramSchema } from "@/modules/training/programs/schemas";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Office } from "@/modules/admin/offices/types";
import type { TrainingProgram, TrainingProgramFormData } from "@/modules/training/programs/types";
import type { TrainingProgramSchema } from "@/modules/training/programs/schemas";
import type { TrainingEnrollment } from "@/modules/training/enrollments/types";
import type { TrainingEnrollmentSchema } from "@/modules/training/enrollments/schemas";

export function TrainingPage() {
  const { user } = useAuthStore();
  const canManage = !!user && hasPermission(user.systemRole, "hrms:manage");

  const [tab, setTab] = useState<"programs" | "enrollments">("programs");

  const {
    programs, loading: programsLoading, addProgram, editProgram, removeProgram,
    uploadMaterial, deleteMaterial, load: loadPrograms,
  } = useTrainingPrograms();
  const {
    enrollments, loading: enrollmentsLoading, addEnrollment, changeStatus,
    removeEnrollment, uploadEnrollmentCertificate, load: loadEnrollments,
  } = useEnrollments();

  const [programFormOpen, setProgramFormOpen] = useState(false);
  const [editingProgram,  setEditingProgram]  = useState<TrainingProgram | null>(null);
  const [enrollFormOpen,  setEnrollFormOpen]  = useState(false);
  const [viewingEnrollment, setViewingEnrollment] = useState<TrainingEnrollment | null>(null);
  const [programImportOpen, setProgramImportOpen] = useState(false);
  const [offices, setOffices] = useState<Office[]>([]);

  useEffect(() => { fetchOffices().then(setOffices); }, []);

  const stats = useMemo(() => ({
    activePrograms: programs.filter(p => p.status === "ongoing" || p.status === "upcoming").length,
    totalEnrollments: enrollments.length,
    completed: enrollments.filter(e => e.status === "completed").length,
    inProgress: enrollments.filter(e => e.status === "in_progress" || e.status === "enrolled").length,
  }), [programs, enrollments]);

  async function handleProgramSubmit(data: TrainingProgramSchema) {
    const payload = { ...data, description: data.description || null, endDate: data.endDate || null, createdBy: user?.uid ?? "" };
    if (editingProgram) await editProgram(editingProgram.id, payload);
    else await addProgram(payload);
    setProgramFormOpen(false);
    setEditingProgram(null);
  }

  const programExportRows = useMemo(() => programs.map((p) => ({
    Title:       p.title,
    Description: p.description ?? "",
    Category:    p.category,
    Trainer:     p.trainerName,
    Mode:        p.mode,
    "Start Date": p.startDate,
    "End Date":  p.endDate ?? "",
    Office:      p.officeName,
  })), [programs]);

  const programTemplateColumns: TemplateColumn[] = [
    { key: "title", label: "Title", required: true, example: "Customer Service Excellence" },
    { key: "description", label: "Description" },
    { key: "category", label: "Category", required: true, example: "Soft Skills" },
    { key: "trainerName", label: "Trainer", required: true, example: "Jane Doe" },
    { key: "mode", label: "Mode", example: "online" },
    { key: "startDate", label: "Start Date", required: true, example: "2026-01-01" },
    { key: "endDate", label: "End Date", example: "2026-01-05" },
    { key: "office", label: "Office", example: "Head Office" },
  ];

  const MODE_MAP: Record<string, TrainingProgramSchema["mode"]> = {
    online: "online",
    offline: "offline",
    hybrid: "hybrid",
  };

  function onParseProgramRow(raw: Record<string, string>) {
    const office = resolveOffice(raw["Office"], offices, {
      officeId: user?.officeId ?? "",
      officeName: user?.officeName ?? "",
    });
    const rawMode = raw["Mode"]?.trim().toLowerCase() ?? "";
    const mode = MODE_MAP[rawMode] ?? "offline";
    const candidate = {
      title: raw["Title"] ?? "",
      description: raw["Description"] ?? "",
      category: raw["Category"] ?? "",
      trainerName: raw["Trainer"] ?? "",
      mode,
      startDate: raw["Start Date"] ?? "",
      endDate: raw["End Date"] ?? "",
      officeId: office.officeId,
      officeName: office.officeName,
    };
    const check = trainingProgramSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };
    return { data: check.data };
  }

  async function onImportPrograms(rows: TrainingProgramSchema[]) {
    let created = 0, failed = 0;
    for (const row of rows) {
      const payload: TrainingProgramFormData = {
        ...row,
        description: row.description || null,
        endDate:     row.endDate      || null,
        createdBy:   user?.uid ?? "",
      };
      try {
        await createTrainingProgram(payload, user?.uid ?? "");
        created++;
      } catch {
        failed++;
      }
    }
    await loadPrograms();
    return { created, failed };
  }

  async function handleProgramDelete(program: TrainingProgram) {
    if (!confirm(`Delete training program "${program.title}"? This cannot be undone.`)) return;
    await removeProgram(program.id);
  }

  async function handleEnrollSubmit(data: TrainingEnrollmentSchema) {
    await addEnrollment({ ...data, score: data.score ?? null, createdBy: user?.uid ?? "" });
    setEnrollFormOpen(false);
  }

  async function handleEnrollmentDelete(enrollment: TrainingEnrollment) {
    if (!confirm(`Remove "${enrollment.employeeName}" from this program?`)) return;
    setViewingEnrollment(null);
    await removeEnrollment(enrollment.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Training & Development"
        description="Programs, learning materials, and completion tracking"
        actions={
          <>
            {tab === "programs" && (
              <>
                <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadPrograms()}>Refresh</Button>
                {canManage && (
                  <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setProgramImportOpen(true)}>Import</Button>
                )}
                <BulkExportButton filenameBase="training-programs" rows={programExportRows} />
                {canManage && (
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingProgram(null); setProgramFormOpen(true); }}>New Program</Button>
                )}
              </>
            )}
            {tab === "enrollments" && (
              <>
                <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadEnrollments()}>Refresh</Button>
                {canManage && (
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => setEnrollFormOpen(true)}>Enroll Employee</Button>
                )}
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Active Programs",   value: stats.activePrograms,    icon: GraduationCap, color: "text-primary"    },
          { label: "Total Enrollments", value: stats.totalEnrollments,  icon: Users,         color: "text-blue-600"   },
          { label: "In Progress",       value: stats.inProgress,        icon: Clock,         color: "text-amber-600"  },
          { label: "Completed",         value: stats.completed,         icon: CheckCircle2,  color: "text-green-600"  },
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
        <button onClick={() => setTab("programs")} className={cn(
          "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "programs" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <GraduationCap size={14} /> Programs
        </button>
        <button onClick={() => setTab("enrollments")} className={cn(
          "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "enrollments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Users size={14} /> Enrollments
        </button>
      </div>

      {tab === "programs" && (
        <TrainingProgramsGrid
          programs={programs}
          loading={programsLoading}
          canManage={canManage}
          onEdit={(p) => { setEditingProgram(p); setProgramFormOpen(true); }}
          onDelete={handleProgramDelete}
          onStatus={(p, status) => editProgram(p.id, { status })}
        />
      )}

      {tab === "enrollments" && (
        <EnrollmentsTable
          enrollments={enrollments}
          loading={enrollmentsLoading}
          canManage={canManage}
          onView={setViewingEnrollment}
          onDelete={handleEnrollmentDelete}
          onStatus={(e, status) => changeStatus(e.id, status)}
          onUploadCertificate={async (e, file) => { await uploadEnrollmentCertificate(e.id, file); }}
        />
      )}

      <EnrollmentDetailModal
        enrollment={viewingEnrollment ? enrollments.find(e => e.id === viewingEnrollment.id) ?? viewingEnrollment : null}
        canManage={canManage}
        onClose={() => setViewingEnrollment(null)}
        onDelete={handleEnrollmentDelete}
        onStatus={(e, status) => changeStatus(e.id, status)}
        onUploadCertificate={async (e, file) => { await uploadEnrollmentCertificate(e.id, file); }}
      />

      <TrainingProgramForm
        open={programFormOpen}
        program={editingProgram}
        onClose={() => { setProgramFormOpen(false); setEditingProgram(null); }}
        onSubmit={handleProgramSubmit}
        onUploadMaterial={async (label, file) => {
          if (editingProgram) {
            const materials = await uploadMaterial(editingProgram.id, label, file);
            setEditingProgram(prev => prev ? { ...prev, materials } : prev);
          }
        }}
        onDeleteMaterial={async (materialId) => {
          if (editingProgram) {
            const materials = await deleteMaterial(editingProgram.id, materialId);
            setEditingProgram(prev => prev ? { ...prev, materials } : prev);
          }
        }}
      />

      <EnrollmentForm
        open={enrollFormOpen}
        programs={programs.filter(p => p.status !== "cancelled")}
        onClose={() => setEnrollFormOpen(false)}
        onSubmit={handleEnrollSubmit}
      />

      <BulkImportModal
        open={programImportOpen}
        onClose={() => setProgramImportOpen(false)}
        title="Training Programs"
        templateColumns={programTemplateColumns}
        onParseRow={onParseProgramRow}
        onImport={onImportPrograms}
      />

    </div>
  );
}
