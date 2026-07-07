"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchCallLogs, createCallLog, uploadCallRecording } from "@/modules/call-logs/services/call-log.service";
import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee } from "@/modules/dashboard/hooks/useCurrentEmployee";
import { logActivity } from "@/lib/activity-log";
import type { CallLog, CallLogFormData } from "@/modules/call-logs/types";

export function useCallLogs(filters: { leadId?: string; customerId?: string }) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { user } = useAuthStore();
  const { employee } = useCurrentEmployee();

  const load = useCallback(async () => {
    if (!filters.leadId && !filters.customerId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchCallLogs(filters);
      setCallLogs(data);
    } catch {
      setCallLogs([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.leadId, filters.customerId]);

  useEffect(() => { load(); }, [load]);

  async function addCallLog(
    data: CallLogFormData, recordingFile?: File | null
  ): Promise<{ error: string | null }> {
    try {
      let callLog = await createCallLog(
        data,
        user?.uid ?? "",
        employee?.id ?? "",
        employee?.fullName ?? user?.displayName ?? "Unknown"
      );
      if (recordingFile) {
        const recordingFileUrl = await uploadCallRecording(callLog.id, recordingFile);
        callLog = { ...callLog, recordingFileUrl };
      }
      setCallLogs(prev => [callLog, ...prev]);
      logActivity({
        entityType: "Call Log", entityName: callLog.contactName, action: "created",
        detail: `Logged a ${callLog.callMethod} call (${callLog.outcome})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to log call" };
    }
  }

  return { callLogs, loading, addCallLog };
}
