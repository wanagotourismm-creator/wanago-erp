"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchHolidays, createHoliday, deleteHoliday } from "@/modules/admin/holidays/services/holiday.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Holiday, HolidayFormData } from "@/modules/admin/holidays/types";

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHolidays();
      setHolidays(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addHoliday(data: HolidayFormData): Promise<{ error: string | null }> {
    try {
      const holiday = await createHoliday(data, user?.uid ?? "");
      setHolidays(prev => [...prev, holiday].sort((a, b) => a.date.localeCompare(b.date)));
      logActivity({
        entityType: "Holiday", entityName: holiday.name, action: "created",
        detail: `Added holiday ${holiday.name} on ${holiday.date}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to add holiday" };
    }
  }

  async function removeHoliday(id: string): Promise<{ error: string | null }> {
    try {
      const holiday = holidays.find(h => h.id === id);
      await deleteHoliday(id);
      setHolidays(prev => prev.filter(h => h.id !== id));
      if (holiday) {
        logActivity({
          entityType: "Holiday", entityName: holiday.name, action: "deleted",
          detail: `Deleted holiday ${holiday.name}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete holiday" };
    }
  }

  return { holidays, loading, load, addHoliday, removeHoliday };
}
