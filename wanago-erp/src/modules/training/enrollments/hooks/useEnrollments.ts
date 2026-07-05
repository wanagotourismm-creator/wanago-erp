"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchEnrollments, createEnrollment, updateEnrollmentStatus, deleteEnrollment, uploadCertificate,
} from "@/modules/training/enrollments/services/enrollment.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/constants";
import type { TrainingEnrollment, TrainingEnrollmentFormData } from "@/modules/training/enrollments/types";

export function useEnrollments() {
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEnrollments();
      setEnrollments(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addEnrollment(data: TrainingEnrollmentFormData): Promise<{ error: string | null }> {
    try {
      const enrollment = await createEnrollment(data, user?.uid ?? "");
      setEnrollments(prev => [enrollment, ...prev]);
      logActivity({
        entityType: "Training Enrollment", entityName: enrollment.employeeName, action: "created",
        detail: `Enrolled ${enrollment.employeeName} in ${enrollment.trainingProgramTitle}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to enroll employee" };
    }
  }

  async function changeStatus(id: string, status: TrainingEnrollment["status"]): Promise<void> {
    await updateEnrollmentStatus(id, status);
    setEnrollments(prev => prev.map(e => e.id === id ? {
      ...e, status, completionDate: status === "completed" ? new Date().toISOString().slice(0, 10) : e.completionDate,
    } : e));
    const enrollment = enrollments.find(e => e.id === id);
    if (enrollment) {
      logActivity({
        entityType: "Training Enrollment", entityName: enrollment.employeeName, action: "status_changed",
        detail: `${enrollment.employeeName}'s enrollment in ${enrollment.trainingProgramTitle} moved to ${ENROLLMENT_STATUS_LABELS[status]}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
    }
  }

  async function removeEnrollment(id: string): Promise<{ error: string | null }> {
    try {
      await deleteEnrollment(id);
      setEnrollments(prev => prev.filter(e => e.id !== id));
      return { error: null };
    } catch {
      return { error: "Failed to remove enrollment" };
    }
  }

  async function uploadEnrollmentCertificate(id: string, file: File): Promise<string> {
    const url = await uploadCertificate(id, file);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, certificateUrl: url } : e));
    return url;
  }

  return { enrollments, loading, load, addEnrollment, changeStatus, removeEnrollment, uploadEnrollmentCertificate };
}
