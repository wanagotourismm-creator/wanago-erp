"use client";

import { useState } from "react";
import { Plus, Target, Flag, Edit2, Trash2, Send } from "lucide-react";
import { useCompanyGoals } from "@/modules/goals/hooks/useCompanyGoals";
import { GoalForm } from "@/modules/goals/components/GoalForm";
import { ObjectiveForm } from "@/modules/goals/components/ObjectiveForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn, formatDate, timeAgo } from "@/lib/utils/helpers";
import type { CompanyGoal, Objective } from "@/modules/goals/types";

const OBJECTIVE_STATUS_STYLES: Record<string, string> = {
  on_track:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  at_risk:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  off_track: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  done:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  on_track: "On Track", at_risk: "At Risk", off_track: "Off Track", done: "Done",
};

function daysLeft(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function GoalsPanel() {
  const {
    goals, loading, selectedGoal, selectedGoalId, setSelectedGoalId,
    objectives, checkIns, detailLoading, avgProgress,
    addGoal, editGoal, removeGoal, addObjective, editObjective, removeObjective, postCheckIn,
  } = useCompanyGoals();

  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<CompanyGoal | null>(null);
  const [objectiveFormOpen, setObjectiveFormOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [checkInProgress, setCheckInProgress] = useState(50);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkInBlockers, setCheckInBlockers] = useState("");
  const [postingCheckIn, setPostingCheckIn] = useState(false);

  async function handlePostCheckIn() {
    if (!selectedGoalId || !checkInNotes.trim()) return;
    setPostingCheckIn(true);
    try {
      await postCheckIn({ goalId: selectedGoalId, progressPercent: checkInProgress, notes: checkInNotes, blockers: checkInBlockers });
      setCheckInNotes(""); setCheckInBlockers("");
    } finally {
      setPostingCheckIn(false);
    }
  }

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Company Goals" description="Phase-level targets, department objectives, and progress check-ins"
        actions={<Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingGoal(null); setGoalFormOpen(true); }}>New Goal</Button>} />

      {goals.length === 0 ? (
        <EmptyState title="No company goals yet" description="Set your first phase-level target" icon={<Target size={22} />} />
      ) : (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {goals.map((g) => (
              <button key={g.id} onClick={() => setSelectedGoalId(g.id)}
                className={cn("flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                  selectedGoalId === g.id ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
                {g.title}
              </button>
            ))}
          </div>

          {selectedGoal && (
            <>
              <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-foreground">{selectedGoal.title}</h2>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium",
                        selectedGoal.goalStatus === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                        {selectedGoal.goalStatus}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedGoal.description}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingGoal(selectedGoal); setGoalFormOpen(true); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Edit2 size={13} /></button>
                    <button onClick={() => { if (confirm(`Delete goal "${selectedGoal.title}"?`)) removeGoal(selectedGoal.id); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={13} /></button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-primary">{avgProgress}% complete</span>
                    <span className="text-xs text-muted-foreground">{daysLeft(selectedGoal.endDate)} days left</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${avgProgress}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-border py-2"><p className="text-lg font-bold text-foreground">{objectives.length}</p><p className="text-[11px] text-muted-foreground">Objectives</p></div>
                  <div className="rounded-xl border border-border py-2"><p className="text-lg font-bold text-foreground">{objectives.filter((o) => o.objectiveStatus === "done").length}/{objectives.length}</p><p className="text-[11px] text-muted-foreground">Done</p></div>
                  <div className="rounded-xl border border-border py-2"><p className="text-lg font-bold text-foreground">{formatDate(selectedGoal.startDate, "dd MMM")} – {formatDate(selectedGoal.endDate, "dd MMM")}</p><p className="text-[11px] text-muted-foreground">Timeline</p></div>
                </div>
              </div>

              <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-sm font-semibold text-foreground mb-3">Progress Check-ins</p>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Progress: {checkInProgress}%</label>
                    <input type="range" min={0} max={100} step={5} value={checkInProgress} onChange={(e) => setCheckInProgress(Number(e.target.value))} className="flex-1 accent-primary" />
                  </div>
                  <input value={checkInNotes} onChange={(e) => setCheckInNotes(e.target.value)} placeholder="What changed / wins..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none hover:border-primary/40 focus:border-primary" />
                  <div className="flex items-center gap-2">
                    <input value={checkInBlockers} onChange={(e) => setCheckInBlockers(e.target.value)} placeholder="Blockers (optional)"
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none hover:border-primary/40 focus:border-primary" />
                    <button onClick={handlePostCheckIn} disabled={postingCheckIn || !checkInNotes.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      <Send size={13} /> Post check-in
                    </button>
                  </div>
                </div>

                {checkIns.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No check-ins yet. Post a quick progress update.</p>
                ) : (
                  <div className="space-y-2">
                    {checkIns.map((c) => (
                      <div key={c.id} className="rounded-xl border border-border px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground">{c.postedByName} · {c.progressPercent}%</span>
                          <span className="text-[11px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground">{c.notes}</p>
                        {c.blockers && <p className="text-xs text-destructive mt-1">Blocker: {c.blockers}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">Department Objectives</p>
                  <button onClick={() => { setEditingObjective(null); setObjectiveFormOpen(true); }}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors">
                    <Plus size={13} /> Add Objective
                  </button>
                </div>

                {detailLoading ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">Loading...</div>
                ) : objectives.length === 0 ? (
                  <EmptyState title="No objectives yet" description="Break this goal down by department" icon={<Flag size={20} />} />
                ) : (
                  <div className="space-y-2">
                    {objectives.map((o) => (
                      <div key={o.id} className="rounded-xl border border-border px-4 py-3">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{o.title}</p>
                            {o.description && <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <button onClick={() => { setEditingObjective(o); setObjectiveFormOpen(true); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><Edit2 size={12} /></button>
                            <button onClick={() => { if (confirm(`Delete objective "${o.title}"?`)) removeObjective(o.id); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{o.department}</span>
                          {o.ownerName && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{o.ownerName}</span>}
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", OBJECTIVE_STATUS_STYLES[o.objectiveStatus])}>{OBJECTIVE_STATUS_LABELS[o.objectiveStatus]}</span>
                          <span className="text-[11px] text-muted-foreground">Due {formatDate(o.dueDate, "dd MMM")}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${o.progressPercent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      <GoalForm
        open={goalFormOpen}
        goal={editingGoal}
        onClose={() => { setGoalFormOpen(false); setEditingGoal(null); }}
        onSubmit={async (data) => {
          if (editingGoal) await editGoal(editingGoal.id, data);
          else await addGoal(data);
          setGoalFormOpen(false);
          setEditingGoal(null);
        }}
      />

      {selectedGoalId && (
        <ObjectiveForm
          open={objectiveFormOpen}
          goalId={selectedGoalId}
          objective={editingObjective}
          onClose={() => { setObjectiveFormOpen(false); setEditingObjective(null); }}
          onSubmit={async (data) => {
            if (editingObjective) await editObjective(editingObjective.id, data);
            else await addObjective(data);
            setObjectiveFormOpen(false);
            setEditingObjective(null);
          }}
        />
      )}
    </div>
  );
}
