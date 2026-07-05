"use client";

import { useState, useMemo } from "react";
import { Plus, RefreshCw, Target, Star, TrendingUp, AlertTriangle } from "lucide-react";
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
import type { Goal } from "@/modules/performance/goals/types";
import type { GoalSchema } from "@/modules/performance/goals/schemas";
import type { PerformanceReview } from "@/modules/performance/reviews/types";
import type { PerformanceReviewSchema } from "@/modules/performance/reviews/schemas";

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
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingGoal(null); setGoalFormOpen(true); }}>Set Goal</Button>
                )}
              </>
            )}
            {tab === "reviews" && (
              <>
                <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadReviews()}>Refresh</Button>
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

    </div>
  );
}
