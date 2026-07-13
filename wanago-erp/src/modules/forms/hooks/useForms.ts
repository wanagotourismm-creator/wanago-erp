"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchForms, createForm, updateForm, deleteForm, publishForm, closeForm,
} from "@/modules/forms/services/form.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Form, FormFormData } from "@/modules/forms/types";

export function useForms() {
  const [forms,   setForms]   = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchForms();
      setForms(data);
    } catch {
      setError("Failed to load forms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addForm(data: FormFormData): Promise<{ error: string | null }> {
    try {
      const form = await createForm(data, user?.uid ?? "");
      setForms(prev => [form, ...prev]);
      logActivity({
        entityType: "Form", entityName: form.title, action: "created",
        detail: `Created form ${form.refNumber} (${form.title})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create form" };
    }
  }

  async function editForm(id: string, data: Partial<FormFormData>): Promise<{ error: string | null }> {
    try {
      await updateForm(id, data);
      setForms(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
      return { error: null };
    } catch {
      return { error: "Failed to update form" };
    }
  }

  async function removeForm(id: string): Promise<{ error: string | null }> {
    try {
      await deleteForm(id);
      setForms(prev => prev.filter(f => f.id !== id));
      return { error: null };
    } catch {
      return { error: "Failed to delete form" };
    }
  }

  // Refetches rather than updating local state optimistically — publishing
  // may generate a new shareToken server-side (see publishForm), and
  // guessing that value client-side risks showing the wrong link.
  async function togglePublish(form: Form): Promise<{ error: string | null }> {
    try {
      if (form.formStatus === "published") {
        await closeForm(form.id);
      } else {
        await publishForm(form);
      }
      await load();
      return { error: null };
    } catch {
      return { error: "Failed to update form status" };
    }
  }

  return { forms, loading, error, load, addForm, editForm, removeForm, togglePublish };
}
