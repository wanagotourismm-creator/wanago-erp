"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchFormResponses, submitFormResponse } from "@/modules/forms/services/form-response.service";
import { useAuthStore } from "@/store/auth.store";
import type { FormResponse } from "@/modules/forms/types";

export function useFormResponses(formId: string | null) {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading,   setLoading]   = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    if (!formId) { setResponses([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchFormResponses(formId);
      setResponses(data);
    } catch {
      setResponses([]);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { load(); }, [load]);

  async function submit(answers: Record<string, string | string[] | number | null>): Promise<{ error: string | null }> {
    if (!formId) return { error: "No form selected" };
    try {
      await submitFormResponse({
        formId, answers,
        submittedByName: user?.displayName ?? null,
        submittedByUserId: user?.uid ?? null,
        createdBy: user?.uid ?? "",
      }, user?.uid ?? "");
      await load();
      return { error: null };
    } catch {
      return { error: "Failed to submit response" };
    }
  }

  return { responses, loading, load, submit };
}
