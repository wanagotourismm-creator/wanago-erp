"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchLeaves, createLeaveRequest, updateLeaveRequest,
  approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest, deleteLeaveRequest,
} from "@/modules/hrms/leaves/services/leave.service";
import { useAuthStore } from "@/store/auth.store";
import type { LeaveRequest } from "@/modules/hrms/shared/types";
import type { LeaveRequestSchema, LeaveDecisionSchema } from "@/modules/hrms/leaves/schemas";

export function useLeaves() {
  const [leaves,  setLeaves]  = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try { setLeaves(await fetchLeaves()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addLeave(data: LeaveRequestSchema) {
    try {
      const l = await createLeaveRequest(data, user?.uid ?? "");
      setLeaves(p => [l, ...p]);
      return { error: null };
    } catch { return { error: "Failed to submit leave request" }; }
  }

  async function editLeave(id: string, data: Partial<LeaveRequestSchema>) {
    try {
      await updateLeaveRequest(id, data);
      setLeaves(p => p.map(l => l.id === id ? { ...l, ...data } : l));
      return { error: null };
    } catch { return { error: "Failed to update leave request" }; }
  }

  async function approveLeave(id: string, decision?: LeaveDecisionSchema) {
    try {
      await approveLeaveRequest(id, user?.uid ?? "", decision);
      setLeaves(p => p.map(l => l.id === id ? { ...l, status: "approved", approvedBy: user?.uid ?? "", rejectedBy: null, comments: decision?.comments || null } : l));
      return { error: null };
    } catch { return { error: "Failed to approve leave" }; }
  }

  async function rejectLeave(id: string, decision?: LeaveDecisionSchema) {
    try {
      await rejectLeaveRequest(id, user?.uid ?? "", decision);
      setLeaves(p => p.map(l => l.id === id ? { ...l, status: "rejected", rejectedBy: user?.uid ?? "", approvedBy: null, comments: decision?.comments || null } : l));
      return { error: null };
    } catch { return { error: "Failed to reject leave" }; }
  }

  async function cancelLeave(id: string) {
    try {
      await cancelLeaveRequest(id);
      setLeaves(p => p.map(l => l.id === id ? { ...l, status: "cancelled" } : l));
      return { error: null };
    } catch { return { error: "Failed to cancel leave" }; }
  }

  async function removeLeave(id: string) {
    try {
      await deleteLeaveRequest(id);
      setLeaves(p => p.filter(l => l.id !== id));
      return { error: null };
    } catch { return { error: "Failed to delete leave" }; }
  }

  const stats = {
    total:    leaves.length,
    pending:  leaves.filter(l => l.status === "pending").length,
    approved: leaves.filter(l => l.status === "approved").length,
    rejected: leaves.filter(l => l.status === "rejected").length,
  };

  return { leaves, loading, stats, load, addLeave, editLeave, approveLeave, rejectLeave, cancelLeave, removeLeave };
}
