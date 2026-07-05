"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchAttendanceRecords } from "@/modules/hrms/attendance/services/attendance.service";
import { fetchLeaves } from "@/modules/hrms/leaves/services/leave.service";
import { fetchRegularizations } from "@/modules/hrms/regularization/services/regularization.service";
import type { Employee, AttendanceRecord, LeaveRequest, AttendanceRegularization } from "@/modules/hrms/shared/types";

const todayStr = () => new Date().toISOString().slice(0, 10);

export type EmployeeToday = {
  employee: Employee;
  status: "present" | "absent" | "half_day" | "wfh" | "on_leave" | "unmarked";
  outsideGeofence: boolean;
};

export type DepartmentSummary = {
  department: string;
  headcount: number;
  presentToday: number;
  pendingApprovals: number;
};

export function useHrOverview() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, att, lvs, regs] = await Promise.all([
        fetchEmployees(),
        fetchAttendanceRecords(),
        fetchLeaves(),
        fetchRegularizations(),
      ]);
      setEmployees(emps.filter((e) => e.employeeStatus === "active"));
      setAttendance(att);
      setLeaves(lvs);
      setRegularizations(regs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = todayStr();
  const todayAttendance = attendance.filter((a) => a.date === today);
  const todayAttendanceByEmployee = new Map(todayAttendance.map((a) => [a.employeeId, a]));

  const onLeaveTodayIds = new Set(
    leaves
      .filter((l) => l.status === "approved" && l.fromDate <= today && l.toDate >= today)
      .map((l) => l.employeeId)
  );

  const employeesToday: EmployeeToday[] = employees.map((employee) => {
    const record = todayAttendanceByEmployee.get(employee.id);
    const outsideGeofence = record?.withinGeofence === false;
    if (record) return { employee, status: record.status === "leave" ? "on_leave" : (record.status as EmployeeToday["status"]), outsideGeofence };
    if (onLeaveTodayIds.has(employee.id)) return { employee, status: "on_leave", outsideGeofence: false };
    return { employee, status: "unmarked", outsideGeofence: false };
  });

  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const pendingRegularizations = regularizations.filter((r) => r.regularizationStatus === "pending");

  const headcount = employees.length;
  const presentToday = employeesToday.filter((e) => e.status === "present" || e.status === "half_day" || e.status === "wfh").length;
  const onLeaveToday = employeesToday.filter((e) => e.status === "on_leave").length;
  const absentToday = employeesToday.filter((e) => e.status === "absent").length;
  const unmarkedToday = employeesToday.filter((e) => e.status === "unmarked").length;
  const attendancePct = headcount === 0 ? 0 : Math.round((presentToday / headcount) * 100);
  const awaitingApproval = pendingLeaves.length + pendingRegularizations.length;

  const departments = Array.from(new Set(employees.map((e) => e.department))).sort();
  const departmentSummaries: DepartmentSummary[] = departments.map((department) => {
    const deptEmployees = employeesToday.filter((e) => e.employee.department === department);
    const deptIds = new Set(deptEmployees.map((e) => e.employee.id));
    return {
      department,
      headcount: deptEmployees.length,
      presentToday: deptEmployees.filter((e) => e.status === "present" || e.status === "half_day" || e.status === "wfh").length,
      pendingApprovals:
        pendingLeaves.filter((l) => deptIds.has(l.employeeId)).length +
        pendingRegularizations.filter((r) => deptIds.has(r.employeeId)).length,
    };
  });

  return {
    loading, employeesToday, departmentSummaries,
    headcount, attendancePct, onLeaveToday, absentToday, unmarkedToday, awaitingApproval,
    reload: load,
  };
}
