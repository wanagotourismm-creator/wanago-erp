"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, RefreshCw, Target, Star, TrendingUp, AlertTriangle, Upload } from "lucide-react";
import { useGoals } from "@/modules/performance/goals/hooks/useGoals";
import { useReviews } from "@/modules/performance/reviews/hooks/useReviews";
import { GoalsTable } from "@/modules/performance/goals/components/GoalsTable";
import { GoalForm } from "@/modules/performance/goals/components/GoalForm";
import { GoalDetailModal } from "@/modules/performance/goals/components/GoalDetailModal";
import { ReviewsTable } from "@/modules/performance/reviews/components/ReviewsTable";
import { ReviewForm } from "@/modules/performance/reviews/components/ReviewForm";
import { ReviewDetailModal } from "@/modules/performance/reviews/components/ReviewDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn, type ParseRowResult } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { goalSchema } from "@/modules/performance/goals/schemas";
import { performanceReviewSchema } from "@/modules/performance/reviews/schemas";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Employee } from "@/modules/hrms/shared/types";
import type { Office } from "@/modules/admin/offices/types";
import type { Goal } from "@/modules/performance/goals/types";
import type { GoalSchema } from "@/modules/performance/goals/schemas";
import type { PerformanceReview, PerformanceReviewFormData } from "@/modules/performance/reviews/types";
import type { PerformanceReviewSchema } from "@/modules/performance/reviews/schemas";

const GOAL_TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "employee",    label: "Employee",    required: true, example: "EMP-0001 or Jane Doe" },
  { key: "title",       label: "Title",       required: true, example: "Improve response time" },
  { key: "description", label: "Description", example: "" },
  { key: "category",    label: "Category",    required: true, example: "Sales" },
  { key: "period",      label: "Period",      required: true, example: "Q3 2026" },
  { key: "dueDate",     label: "Due Date",     example: "2026-09-30" },
  { key: "office",      label: "Office",       example: "Head Office" },
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

const REVIEW_TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "employee",            label: "Employee",              required: true, example: "Priya Nair" },
  { key: "reviewType",          label: "Review Type",            required: true, example: "quarterly" },
  { key: "period",              label: "Period",                 required: true, example: "Q1 2026" },
  { key: "reviewer",            label: "Reviewer",               required: true, example: "Arjun Menon" },
  { key: "rating",              label: "Rating",                 required: true, example: "meets_expectations" },
  { key: "strengths",           label: "Strengths",              example: "Great client communication" },
  { key: "areasForImprovement", label: "Areas for Improvement",  example: "Time management" },
  { key: "comments",            label: "Comments",               example: "" },
  { key: "reviewDate",          label: "Review Date",            required: true, example: "2026-03-31" },
  { key: "office",              label: "Office",                 example: "Head Office" },
];

export function PerformancePage() {
  const { user } = useAuthStore();
  const canManage = !!user && hasPermission(user.systemRole, "hrms:manage");

  const [tab, setTab] = useState<"goals" | "reviews">("goals");

  const { goals, loading: goalsLoading, addGoal, editGoal, setProgress, markAtRisk, removeGoal, load: loadGoals } = useGoals();
  const { reviews, loading: reviewsLoading, addReview, editReview, acknowledge, removeReview, load: loadReviews } = useReviews();

  const [goalFormOpen,   setGoalFormOpen]   = useState(false);
  const [editingGoal,    setEditingGoal]    = useState<Goal | null>(null);
  const [viewingGoal,    setViewingGoal]    = useState<Goal | null>(null);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [editingReview,  setEditingReview]  = useState<PerformanceReview | null>(null);
  const [viewingReview,  setViewingReview]  = useState<PerformanceReview | null>(null);
  const [goalImportOpen, setGoalImportOpen] = useState(false);
  const [reviewImportOpen, setReviewImportOpen] = useState(false);
  const [employees,      setEmployees]      = useState<Employee[]>([]);
  const [offices,        setOffices]        = useState<Office[]>([]);

  useEffect(() => {
    fetchEmployees().then(setEmployees);
    fetchOffices().then(setOffices);
  }, []);

  const stats = useMemo(() => ({
    activeGoals: goals.filter(g => g.status !== "completed").length,
    atRisk:      goals.filter(g => g.status === "at_risk").length,
    totalReviews: reviews.length,
    outstanding: reviews.filter(r => r.rating === "outstanding").length,
  }), [goals, reviews]);

  async function handleGoalSubmit(data: GoalSchema) {
    const payload = { ...data, description: data.description || null, dueDate: data.dueDate || null, createdBy: user?.uid ?? "" };
    if (editingGoal) await editGoal(editingGoal.id, payload);
    else await addGoal(payload);
    setGoalFormOpen(false);
    setEditingGoal(null);
  }

  function handleGoalEdit(goal: Goal) {
    setViewingGoal(null);
    setEditingGoal(goal);
    setGoalFormOpen(true);
  }

  async function handleGoalDelete(goal: Goal) {
    if (!confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) return;
    setViewingGoal(null);
    await removeGoal(goal.id);
  }

  async function handleReviewSubmit(data: PerformanceReviewSchema) {
    const payload = {
      ...data,
      strengths: data.strengths || null,
      areasForImprovement: data.areasForImprovement || null,
      comments: data.comments || null,
      createdBy: user?.uid ?? "",
    };
    if (editingReview) await editReview(editingReview.id, payload);
    else await addReview(payload);
    setReviewFormOpen(false);
    setEditingReview(null);
  }

  function handleReviewEdit(review: PerformanceReview) {
    setViewingReview(null);
    setEditingReview(review);
    setReviewFormOpen(true);
  }

  async function handleReviewDelete(review: PerformanceReview) {
    if (!confirm(`Delete review "${review.refNumber}"? This cannot be undone.`)) return;
    setViewingReview(null);
    await removeReview(review.id);
  }

  function onParseGoalRow(raw: Record<string, string>): ParseRowResult<GoalSchema> {
    const employeeValue = raw["Employee"];
    const empRef = resolveEmployeeRef(employeeValue, employees);
    if (!empRef) {
      return { error: `Employee '${employeeValue ?? ""}' not found — check the code or name matches exactly` };
    }

    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    const candidate = {
      employeeId:   empRef.id,
      employeeName: empRef.fullName,
      title:        raw["Title"]?.trim() ?? "",
      description:  raw["Description"]?.trim() ?? "",
      category:     raw["Category"]?.trim() ?? "",
      period:       raw["Period"]?.trim() ?? "",
      dueDate:      raw["Due Date"]?.trim() ?? "",
      officeId:     office.officeId,
      officeName:   office.officeName,
    };

    const result = goalSchema.safeParse(candidate);
    if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid row" };
    return { data: result.data };
  }

  async function onImportGoals(rows: GoalSchema[]): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;
    for (const row of rows) {
      const { error } = await addGoal({
        ...row,
        description: row.description || null,
        dueDate:     row.dueDate     || null,
        createdBy:   user?.uid ?? "",
      });
      if (error) failed++;
      else created++;
    }
    return { created, failed };
  }

  const goalExportRows = goals.map((g) => ({
    RefNumber:   g.refNumber,
    Employee:    g.employeeName,
    Title:       g.title,
    Description: g.description ?? "",
    Category:    g.category,
    Period:      g.period,
    Progress:    g.progress,
    Status:      g.status,
    DueDate:     g.dueDate ?? "",
    Office:      g.officeName,
  }));

  // Both "Employee" and "Reviewer" columns resolve against the same
  // employee list via resolveEmployeeRef — a row with either unresolved
  // is rejected since both are required fields on the schema.
  function onParseReviewRow(raw: Record<string, string>): ParseRowResult<PerformanceReviewFormData> {
    const empRef = resolveEmployeeRef(raw["Employee"], employees);
    if (!empRef) {
      return { error: `Employee '${raw["Employee"] ?? ""}' not found — check the code or name matches exactly` };
    }
    const reviewerRef = resolveEmployeeRef(raw["Reviewer"], employees);
    if (!reviewerRef) {
      return { error: `Reviewer '${raw["Reviewer"] ?? ""}' not found — check the code or name matches exactly` };
    }

    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    const candidate = {
      employeeId:          empRef.id,
      employeeName:        empRef.fullName,
      reviewType:          raw["Review Type"]?.trim() || "quarterly",
      period:              raw["Period"]?.trim() ?? "",
      reviewerId:          reviewerRef.id,
      reviewerName:        reviewerRef.fullName,
      rating:              raw["Rating"]?.trim() ?? "",
      strengths:           raw["Strengths"]?.trim() ?? "",
      areasForImprovement: raw["Areas for Improvement"]?.trim() ?? "",
      comments:            raw["Comments"]?.trim() ?? "",
      reviewDate:          raw["Review Date"]?.trim() ?? "",
      officeId:            office.officeId,
      officeName:          office.officeName,
    };

    const result = performanceReviewSchema.safeParse(candidate);
    if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid row" };

    const d = result.data;
    const data: PerformanceReviewFormData = {
      employeeId:          d.employeeId,
      employeeName:        d.employeeName,
      reviewType:          d.reviewType,
      period:              d.period,
      reviewerId:          d.reviewerId,
      reviewerName:        d.reviewerName,
      rating:              d.rating,
      strengths:           d.strengths || null,
      areasForImprovement: d.areasForImprovement || null,
      comments:            d.comments || null,
      reviewDate:          d.reviewDate,
      officeId:            d.officeId,
      officeName:          d.officeName,
      createdBy:           user?.uid ?? "",
    };
    return { data };
  }

  async function onImportReviews(rows: PerformanceReviewFormData[]): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;
    for (const row of rows) {
      const { error } = await addReview(row);
      if (error) failed++;
      else created++;
    }
    return { created, failed };
  }

  const reviewExportRows = reviews.map((r) => ({
    RefNumber:             r.refNumber,
    Employee:              r.employeeName,
    "Review Type":         r.reviewType,
    Period:                r.period,
    Reviewer:              r.reviewerName,
    Rating:                r.rating,
    Strengths:             r.strengths ?? "",
    "Areas for Improvement": r.areasForImprovement ?? "",
    Comments:              r.comments ?? "",
    "Review Date":         r.reviewDate,
    Status:                r.status,
    Office:                r.officeName,
  }));

  return (
    <div className="space-y-5">

      <PageHeader
        title="Performance"
        description="Goals, KPIs, and performance reviews"
        actions={
          <>
            {tab === "goals" && (
              <>
                <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadGoals()}>Refresh</Button>
                {canManage && (
                  <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setGoalImportOpen(true)}>Import</Button>
                )}
                <BulkExportButton filenameBase="performance-goals" rows={goalExportRows} />
                {canManage && (
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingGoal(null); setGoalFormOpen(true); }}>Set Goal</Button>
                )}
              </>
            )}
            {tab === "reviews" && (
              <>
                <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadReviews()}>Refresh</Button>
                {canManage && (
                  <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setReviewImportOpen(true)}>Import</Button>
                )}
                <BulkExportButton filenameBase="performance-reviews" rows={reviewExportRows} />
                {canManage && (
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingReview(null); setReviewFormOpen(true); }}>New Review</Button>
                )}
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Active Goals",     value: stats.activeGoals,  icon: Target,       color: "text-primary"   },
          { label: "At Risk",          value: stats.atRisk,       icon: AlertTriangle, color: "text-red-600"   },
          { label: "Total Reviews",    value: stats.totalReviews, icon: Star,         color: "text-blue-600"  },
          { label: "Outstanding",      value: stats.outstanding,  icon: TrendingUp,   color: "text-green-600" },
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
        <button onClick={() => setTab("goals")} className={cn(
          "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "goals" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Target size={14} /> Goals & KPIs
        </button>
        <button onClick={() => setTab("reviews")} className={cn(
          "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "reviews" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Star size={14} /> Reviews
        </button>
      </div>

      {tab === "goals" && (
        <GoalsTable
          goals={goals}
          loading={goalsLoading}
          canManage={canManage}
          onView={setViewingGoal}
          onEdit={handleGoalEdit}
          onDelete={handleGoalDelete}
          onProgress={(g, progress) => setProgress(g.id, progress)}
          onAtRisk={(g) => markAtRisk(g.id)}
        />
      )}

      {tab === "reviews" && (
        <ReviewsTable
          reviews={reviews}
          loading={reviewsLoading}
          canManage={canManage}
          onView={setViewingReview}
          onEdit={handleReviewEdit}
          onDelete={handleReviewDelete}
        />
      )}

      <GoalDetailModal
        goal={viewingGoal ? goals.find(g => g.id === viewingGoal.id) ?? viewingGoal : null}
        canManage={canManage}
        onClose={() => setViewingGoal(null)}
        onEdit={handleGoalEdit}
        onDelete={handleGoalDelete}
        onAtRisk={(g) => markAtRisk(g.id)}
      />

      <ReviewDetailModal
        review={viewingReview ? reviews.find(r => r.id === viewingReview.id) ?? viewingReview : null}
        canManage={canManage}
        onClose={() => setViewingReview(null)}
        onEdit={handleReviewEdit}
        onDelete={handleReviewDelete}
        onAcknowledge={(r) => acknowledge(r.id)}
      />

      <GoalForm
        open={goalFormOpen}
        goal={editingGoal}
        onClose={() => { setGoalFormOpen(false); setEditingGoal(null); }}
        onSubmit={handleGoalSubmit}
      />

      <ReviewForm
        open={reviewFormOpen}
        review={editingReview}
        onClose={() => { setReviewFormOpen(false); setEditingReview(null); }}
        onSubmit={handleReviewSubmit}
      />

      <BulkImportModal<GoalSchema>
        open={goalImportOpen}
        onClose={() => setGoalImportOpen(false)}
        title="Performance Goals"
        description="Upload a .csv or .xlsx file to create many goals at once"
        templateColumns={GOAL_TEMPLATE_COLUMNS}
        onParseRow={(raw) => onParseGoalRow(raw)}
        onImport={onImportGoals}
      />

      <BulkImportModal<PerformanceReviewFormData>
        open={reviewImportOpen}
        onClose={() => setReviewImportOpen(false)}
        title="Performance Reviews"
        description="Upload a .csv or .xlsx file to create many reviews at once. Employee and Reviewer accept either the employee code or full name."
        templateColumns={REVIEW_TEMPLATE_COLUMNS}
        onParseRow={(raw) => onParseReviewRow(raw)}
        onImport={onImportReviews}
      />

    </div>
  );
}
