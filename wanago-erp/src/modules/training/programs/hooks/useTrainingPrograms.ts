"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchTrainingPrograms, createTrainingProgram, updateTrainingProgram, deleteTrainingProgram,
  uploadTrainingMaterial, removeTrainingMaterial,
} from "@/modules/training/programs/services/program.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { TrainingProgram, TrainingProgramFormData } from "@/modules/training/programs/types";

export function useTrainingPrograms() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTrainingPrograms();
      setPrograms(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addProgram(data: TrainingProgramFormData): Promise<{ error: string | null }> {
    try {
      const program = await createTrainingProgram(data, user?.uid ?? "");
      setPrograms(prev => [program, ...prev]);
      logActivity({
        entityType: "Training Program", entityName: program.title, action: "created",
        detail: `Created training program ${program.refNumber} (${program.title})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create training program" };
    }
  }

  async function editProgram(
    id: string, data: Partial<TrainingProgramFormData & { status: TrainingProgram["status"] }>
  ): Promise<{ error: string | null }> {
    try {
      await updateTrainingProgram(id, data);
      setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      return { error: null };
    } catch {
      return { error: "Failed to update training program" };
    }
  }

  async function removeProgram(id: string): Promise<{ error: string | null }> {
    try {
      const program = programs.find(p => p.id === id);
      await deleteTrainingProgram(id);
      setPrograms(prev => prev.filter(p => p.id !== id));
      if (program) {
        logActivity({
          entityType: "Training Program", entityName: program.title, action: "deleted",
          detail: `Deleted training program ${program.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete training program" };
    }
  }

  async function uploadMaterial(programId: string, label: string, file: File) {
    const program = programs.find(p => p.id === programId);
    if (!program) return [];
    const materials = await uploadTrainingMaterial(programId, label, file, program.materials);
    setPrograms(prev => prev.map(p => p.id === programId ? { ...p, materials } : p));
    return materials;
  }

  async function deleteMaterial(programId: string, materialId: string) {
    const program = programs.find(p => p.id === programId);
    if (!program) return [];
    const materials = await removeTrainingMaterial(programId, materialId, program.materials);
    setPrograms(prev => prev.map(p => p.id === programId ? { ...p, materials } : p));
    return materials;
  }

  return { programs, loading, load, addProgram, editProgram, removeProgram, uploadMaterial, deleteMaterial };
}
