"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchAttendanceRecords, createAttendanceRecord,
  updateAttendanceRecord, deleteAttendanceRecord,
} from "@/modules/hrms/attendance/services/attendance.service";
import { useAuthStore } from "@/store/auth.store";
import type { AttendanceRecord } from "@/modules/hrms/shared/types";
import type { AttendanceRecordSchema } from "@/modules/hrms/attendance/schemas";

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try { setRecords(await fetchAttendanceRecords()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addAttendance(data: AttendanceRecordSchema) {
    try {
      const r = await createAttendanceRecord(data, user?.uid ?? "");
      setRecords(p => [r, ...p]);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to mark attendance" };
    }
  }

  async function editAttendance(id: string, data: Partial<AttendanceRecordSchema>) {
    try {
      await updateAttendanceRecord(id, data);
      await load();
      return { error: null };
    } catch { return { error: "Failed to update attendance" }; }
  }

  async function removeAttendance(id: string) {
    try {
      await deleteAttendanceRecord(id);
      setRecords(p => p.filter(r => r.id !== id));
      return { error: null };
    } catch { return { error: "Failed to delete attendance record" }; }
  }

  const stats = {
    total:   records.length,
    present: records.filter(r => r.status === "present").length,
    absent:  records.filter(r => r.status === "absent").length,
    onLeave: records.filter(r => r.status === "leave" || r.status === "wfh").length,
  };

  return { records, loading, stats, load, addAttendance, editAttendance, removeAttendance };
}
