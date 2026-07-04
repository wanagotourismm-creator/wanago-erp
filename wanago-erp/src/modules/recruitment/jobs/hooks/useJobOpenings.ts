"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchJobOpenings, createJobOpening, updateJobOpening, deleteJobOpening,
} from "@/modules/recruitment/jobs/services/job.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { JobOpening, JobOpeningFormData } from "@/modules/recruitment/jobs/types";

export function useJobOpenings() {
  const [jobs,    setJobs]    = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJobOpenings();
      setJobs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addJob(data: JobOpeningFormData): Promise<{ error: string | null }> {
    try {
      const job = await createJobOpening(data, user?.uid ?? "");
      setJobs(prev => [job, ...prev]);
      logActivity({
        entityType: "Job Opening", entityName: job.title, action: "created",
        detail: `Posted job opening ${job.refNumber} (${job.title})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create job opening" };
    }
  }

  async function editJob(
    id: string, data: Partial<JobOpeningFormData & { jobStatus: JobOpening["jobStatus"] }>
  ): Promise<{ error: string | null }> {
    try {
      await updateJobOpening(id, data);
      setJobs(prev => prev.map(j => j.id === id ? { ...j, ...data } : j));
      return { error: null };
    } catch {
      return { error: "Failed to update job opening" };
    }
  }

  async function removeJob(id: string): Promise<{ error: string | null }> {
    try {
      const job = jobs.find(j => j.id === id);
      await deleteJobOpening(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      if (job) {
        logActivity({
          entityType: "Job Opening", entityName: job.title, action: "deleted",
          detail: `Deleted job opening ${job.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete job opening" };
    }
  }

  return { jobs, loading, load, addJob, editJob, removeJob };
}
