"use client";

import { useState, useEffect } from "react";
import {
  fetchAttendancePolicy, updateAttendancePolicy, DEFAULT_ATTENDANCE_POLICY, type AttendancePolicy,
} from "@/modules/attendancepolicy/services/attendance-policy.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";

export function useAttendancePolicy() {
  const [policy, setPolicy] = useState<AttendancePolicy>(DEFAULT_ATTENDANCE_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchAttendancePolicy().then(setPolicy).finally(() => setLoading(false));
  }, []);

  async function save(data: AttendancePolicy): Promise<{ error: string | null }> {
    setSaving(true);
    try {
      await updateAttendancePolicy(data, user?.uid ?? "");
      setPolicy(data);
      logActivity({
        entityType: "Attendance Policy", entityName: "Attendance Policy", action: "updated",
        detail: "Updated office working hours and attendance thresholds",
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to save attendance policy" };
    } finally {
      setSaving(false);
    }
  }

  return { policy, loading, saving, save };
}
