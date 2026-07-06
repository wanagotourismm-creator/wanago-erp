"use client";

import { useEffect, useState } from "react";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { cn } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

type Props = {
  value:      string | null | undefined;
  onChange:   (employeeId: string, employeeName: string) => void;
  className?: string;
  placeholder?: string;
};

// Real dropdown of active Sales-department employees, replacing free-text
// "assigned agent" inputs. Sets both the id (assignedTo) and denormalized
// name (agentName) together — the same dual-field pattern used for
// customer/package selects elsewhere in this codebase.
export function SalesAgentSelect({ value, onChange, className, placeholder = "Select sales executive..." }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    fetchEmployees()
      .then((emps) => setEmployees(
        emps.filter((e) => e.department === "Sales" && e.employeeStatus === "active")
      ))
      .catch(() => {});
  }, []);

  return (
    <select
      className={className ?? inputClass}
      value={value ?? ""}
      onChange={(e) => {
        const selected = employees.find((emp) => emp.id === e.target.value);
        onChange(e.target.value, selected?.fullName ?? "");
      }}
    >
      <option value="">{placeholder}</option>
      {employees.map((emp) => (
        <option key={emp.id} value={emp.id}>
          {emp.fullName} — {emp.designation}
        </option>
      ))}
    </select>
  );
}
