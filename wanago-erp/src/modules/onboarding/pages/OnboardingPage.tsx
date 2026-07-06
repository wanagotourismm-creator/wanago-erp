"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Upload } from "lucide-react";
import { useOnboardingTasks } from "@/modules/onboarding/hooks/useOnboardingTasks";
import { OnboardingBoard } from "@/modules/onboarding/components/OnboardingBoard";
import { OnboardingTaskForm } from "@/modules/onboarding/components/OnboardingTaskForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { BulkImportModal, type TemplateColumn, type ParseRowResult } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { useAuthStore } from "@/store/auth.store";
import { onboardingTaskSchema } from "@/modules/onboarding/schemas";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Employee } from "@/modules/hrms/shared/types";
import type { Office } from "@/modules/admin/offices/types";
import type { OnboardingStage, OnboardingTask } from "@/modules/onboarding/types";
import type { OnboardingTaskSchema } from "@/modules/onboarding/schemas";

const TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "employee",  label: "Employee",  required: true, example: "EMP-0001 or Jane Doe" },
  { key: "taskLabel", label: "Task",      required: true, example: "Collect signed offer letter" },
  { key: "stage",     label: "Stage",     example: "documentation" },
  { key: "dueDate",   label: "Due Date",  example: "2026-07-15" },
  { key: "notes",     label: "Notes",     example: "" },
  { key: "office",    label: "Office",    example: "Head Office" },
];

// Matches a free-text "Employee" column value against employeeCode first,
// then fullName (case-insensitive) — the one cross-reference this module
// needs resolved from a human-readable spreadsheet cell.
function resolveEmployeeRef(value: string | undefined, employees: Employee[]): { id: string; fullName: string } | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const byCode = employees.find((e) => e.employeeCode.toLowerCase() === lower);
  if (byCode) return { id: byCode.id, fullName: byCode.fullName };
  const byName = employees.find((e) => e.fullName.toLowerCase() === lower);
  if (byName) return { id: byName.id, fullName: byName.fullName };
  return null;
}

export function OnboardingPage() {
  const { tasks, loading, load, addTask, moveStage } = useOnboardingTasks();
  const { user } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  useEffect(() => {
    fetchEmployees().then(setEmployees);
    fetchOffices().then(setOffices);
  }, []);

  async function handleSubmit(data: OnboardingTaskSchema) {
    await addTask({
      ...data,
      dueDate: data.dueDate || null,
      notes:   data.notes   || null,
    });
    setFormOpen(false);
  }

  function handleMoveStage(task: OnboardingTask, nextStage: OnboardingStage) {
    moveStage(task.id, nextStage);
  }

  function onParseRow(raw: Record<string, string>): ParseRowResult<OnboardingTaskSchema> {
    const employeeValue = raw["Employee"];
    const empRef = resolveEmployeeRef(employeeValue, employees);
    if (!empRef) {
      return { error: `Employee '${employeeValue ?? ""}' not found — check the code or name matches exactly` };
    }

    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    const rawStage = raw["Stage"]?.trim().toLowerCase().replace(/\s+/g, "_");

    const candidate = {
      employeeId:   empRef.id,
      employeeName: empRef.fullName,
      taskLabel:    raw["Task"]?.trim() ?? "",
      stage:        (rawStage || "documentation") as OnboardingStage,
      dueDate:      raw["Due Date"]?.trim() ?? "",
      notes:        raw["Notes"]?.trim() ?? "",
      officeId:     office.officeId,
      officeName:   office.officeName,
    };

    const result = onboardingTaskSchema.safeParse(candidate);
    if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid row" };
    return { data: result.data };
  }

  async function onImport(rows: OnboardingTaskSchema[]): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;
    for (const row of rows) {
      const { error } = await addTask({
        ...row,
        dueDate: row.dueDate || null,
        notes:   row.notes   || null,
      });
      if (error) failed++;
      else created++;
    }
    return { created, failed };
  }

  const exportRows = tasks.map((t) => ({
    RefNumber: t.refNumber,
    Employee:  t.employeeName,
    Task:      t.taskLabel,
    Stage:     t.stage,
    DueDate:   t.dueDate ?? "",
    Notes:     t.notes ?? "",
    Office:    t.officeName,
  }));

  return (
    <div className="space-y-5">

      <PageHeader
        title="Onboarding"
        description="New-hire checklist and pipeline"
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>Refresh</Button>
            <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>Import</Button>
            <BulkExportButton filenameBase="onboarding-tasks" rows={exportRows} />
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setFormOpen(true)}>Add Task</Button>
          </>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <OnboardingBoard tasks={tasks} loading={false} onMoveStage={handleMoveStage} />
      )}

      <OnboardingTaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <BulkImportModal<OnboardingTaskSchema>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Onboarding Tasks"
        description="Upload a .csv or .xlsx file to create many onboarding tasks at once"
        templateColumns={TEMPLATE_COLUMNS}
        onParseRow={(raw) => onParseRow(raw)}
        onImport={onImport}
      />

    </div>
  );
}
