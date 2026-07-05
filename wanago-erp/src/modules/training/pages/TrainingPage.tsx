"use client";

import { useState, useMemo } from "react";
import { Plus, RefreshCw, GraduationCap, Users, CheckCircle2, Clock } from "lucide-react";
import { useTrainingPrograms } from "@/modules/training/programs/hooks/useTrainingPrograms";
import { useEnrollments } from "@/modules/training/enrollments/hooks/useEnrollments";
import { TrainingProgramsGrid } from "@/modules/training/programs/components/TrainingProgramsGrid";
import { TrainingProgramForm } from "@/modules/training/programs/components/TrainingProgramForm";
import { EnrollmentsTable } from "@/modules/training/enrollments/components/EnrollmentsTable";
import { EnrollmentForm } from "@/modules/training/enrollments/components/EnrollmentForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import type { TrainingProgram } from "@/modules/training/programs/types";
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
          onDelete={handleEnrollmentDelete}
          onStatus={(e, status) => changeStatus(e.id, status)}
          onUploadCertificate={async (e, file) => { await uploadEnrollmentCertificate(e.id, file); }}
        />
      )}

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

    </div>
  );
}
