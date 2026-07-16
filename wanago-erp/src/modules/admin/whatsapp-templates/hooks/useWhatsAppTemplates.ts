"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchWhatsAppTemplates, createWhatsAppTemplate, updateWhatsAppTemplate, deleteWhatsAppTemplate,
} from "@/modules/admin/whatsapp-templates/services/whatsapp-template.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { WhatsAppTemplate, WhatsAppTemplateFormData } from "@/modules/admin/whatsapp-templates/types";

export function useWhatsAppTemplates() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading,   setLoading]   = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWhatsAppTemplates();
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addTemplate(data: WhatsAppTemplateFormData): Promise<{ error: string | null }> {
    try {
      const template = await createWhatsAppTemplate(data, user?.uid ?? "");
      setTemplates(prev => [...prev, template]);
      logActivity({
        entityType: "WhatsApp Template", entityName: template.purpose, action: "created",
        detail: `Registered WhatsApp template "${template.metaTemplateName}" for purpose "${template.purpose}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to add template" };
    }
  }

  async function editTemplate(id: string, data: Partial<WhatsAppTemplateFormData>): Promise<{ error: string | null }> {
    try {
      await updateWhatsAppTemplate(id, data);
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
      const template = templates.find(t => t.id === id);
      if (template) {
        logActivity({
          entityType: "WhatsApp Template", entityName: template.purpose, action: "updated",
          detail: `Updated WhatsApp template "${template.metaTemplateName}"`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to update template" };
    }
  }

  async function removeTemplate(id: string): Promise<{ error: string | null }> {
    try {
      const template = templates.find(t => t.id === id);
      await deleteWhatsAppTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (template) {
        logActivity({
          entityType: "WhatsApp Template", entityName: template.purpose, action: "deleted",
          detail: `Deleted WhatsApp template "${template.metaTemplateName}"`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete template" };
    }
  }

  return { templates, loading, load, addTemplate, editTemplate, removeTemplate };
}
