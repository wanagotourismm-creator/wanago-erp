"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchCandidates, createCandidate, updateCandidate, updateCandidateStage,
  deleteCandidate, uploadResume,
} from "@/modules/recruitment/candidates/services/candidate.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import { RECRUITMENT_STAGE_LABELS } from "@/lib/constants";
import type { Candidate, CandidateFormData } from "@/modules/recruitment/candidates/types";

export function useCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading,    setLoading]    = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCandidates();
      setCandidates(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addCandidate(data: CandidateFormData): Promise<{ error: string | null; candidate?: Candidate }> {
    try {
      const candidate = await createCandidate(data, user?.uid ?? "");
      setCandidates(prev => [candidate, ...prev]);
      logActivity({
        entityType: "Candidate", entityName: candidate.fullName, action: "created",
        detail: `Added candidate ${candidate.refNumber} for ${candidate.jobOpeningTitle ?? "general application"}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null, candidate };
    } catch {
      return { error: "Failed to add candidate" };
    }
  }

  async function editCandidate(
    id: string, data: Partial<CandidateFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateCandidate(id, data);
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      return { error: null };
    } catch {
      return { error: "Failed to update candidate" };
    }
  }

  async function changeStage(id: string, stage: string): Promise<void> {
    await updateCandidateStage(id, stage);
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: stage } as Candidate : c));
    const candidate = candidates.find(c => c.id === id);
    if (candidate) {
      logActivity({
        entityType: "Candidate", entityName: candidate.fullName, action: "status_changed",
        detail: `${candidate.refNumber} moved to ${RECRUITMENT_STAGE_LABELS[stage as keyof typeof RECRUITMENT_STAGE_LABELS] ?? stage}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
    }
  }

  async function removeCandidate(id: string): Promise<{ error: string | null }> {
    try {
      const candidate = candidates.find(c => c.id === id);
      await deleteCandidate(id);
      setCandidates(prev => prev.filter(c => c.id !== id));
      if (candidate) {
        logActivity({
          entityType: "Candidate", entityName: candidate.fullName, action: "deleted",
          detail: `Deleted candidate ${candidate.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete candidate" };
    }
  }

  async function uploadCandidateResume(id: string, file: File): Promise<string> {
    const url = await uploadResume(id, file);
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, resumeUrl: url } : c));
    return url;
  }

  return {
    candidates, loading, load, addCandidate, editCandidate,
    changeStage, removeCandidate, uploadCandidateResume,
  };
}
