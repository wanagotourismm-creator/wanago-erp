"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, User, Briefcase, Wallet, Link2 } from "lucide-react";
import { employeeSchema, type EmployeeSchema } from "@/modules/hrms/employees/schemas";
import { EMPLOYMENT_TYPE_LABELS, DEPARTMENTS } from "@/modules/hrms/employees/components/EmployeeBadges";
import { fetchUsers } from "@/modules/admin/users/services/user-admin.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";
import type { UserProfile } from "@/modules/auth/types";

type Props = {
  open:      boolean;
  employee?: Employee | null;
  employees: Employee[];
  onClose:   () => void;
  onSubmit:  (data: EmployeeSchema) => Promise<void>;
};

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

export function EmployeeForm({ open, employee, employees, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchUsers().then(setUsers).catch(() => {});
  }, [open]);

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeSchema>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employmentType: "full_time",
      probationStatus: "probation",
      employeeStatus: "active",
      basicSalary: 0, hra: 0, allowances: 0,
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (open) {
      if (employee) {
        reset({
          ...employee,
          gender:             employee.gender ?? undefined,
          dateOfBirth:         employee.dateOfBirth ?? "",
          email:               employee.email ?? "",
          address:             employee.address ?? "",
          reportingManagerId:  employee.reportingManagerId ?? "",
          userId:              employee.userId ?? "",
          dateOfJoining:       employee.dateOfJoining ?? "",
          bankAccountNumber:   employee.bankAccountNumber ?? "",
          bankName:            employee.bankName ?? "",
          ifscCode:            employee.ifscCode ?? "",
          uan:                 employee.uan ?? "",
          pfNumber:            employee.pfNumber ?? "",
          panNumber:           employee.panNumber ?? "",
        });
      } else {
        reset({
          employmentType: "full_time", probationStatus: "probation", employeeStatus: "active",
          basicSalary: 0, hra: 0, allowances: 0,
          officeId:   user?.officeId   ?? "main",
          officeName: user?.officeName ?? "Head Office",
        });
      }
    }
  }, [open, employee, reset, user]);

  if (!open) return null;

  const otherEmployees = employees.filter(e => e.id !== employee?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <User size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{employee ? "Edit Employee" : "Add Employee"}</h2>
              <p className="text-xs text-muted-foreground">{employee ? `Editing ${employee.employeeCode}` : "Fill in the employee's details"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">

          {/* Personal */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Personal Information</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <Field label="Full Name" required error={errors.fullName?.message}>
                  <input className={inputClass} placeholder="e.g. Priya Nair" {...register("fullName")} />
                </Field>
              </div>
              <Field label="Gender">
                <select className={inputClass} {...register("gender")}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Date of Birth">
                <input className={inputClass} type="date" {...register("dateOfBirth")} />
              </Field>
              <Field label="Mobile Number" required error={errors.mobileNumber?.message}>
                <input className={inputClass} type="tel" placeholder="+91 98765 43210" {...register("mobileNumber")} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <input className={inputClass} type="email" placeholder="priya@wanago.com" {...register("email")} />
              </Field>
              <div className="col-span-2">
                <Field label="Address">
                  <input className={inputClass} placeholder="Street, area, pincode..." {...register("address")} />
                </Field>
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Employment */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Employment Information</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Department" required error={errors.department?.message}>
                <select className={inputClass} {...register("department")}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Designation" required error={errors.designation?.message}>
                <input className={inputClass} placeholder="e.g. Sales Executive" {...register("designation")} />
              </Field>
              <Field label="Reporting Manager">
                <select className={inputClass} {...register("reportingManagerId")}>
                  <option value="">None</option>
                  {otherEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName}</option>
                  ))}
                </select>
              </Field>
              <Field label="Employment Type" required>
                <select className={inputClass} {...register("employmentType")}>
                  {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date of Joining">
                <input className={inputClass} type="date" {...register("dateOfJoining")} />
              </Field>
              <Field label="Probation Status" required>
                <select className={inputClass} {...register("probationStatus")}>
                  <option value="probation">Probation</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </Field>
              <Field label="Employee Status" required>
                <select className={inputClass} {...register("employeeStatus")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                  <option value="resigned">Resigned</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Account Linkage */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Account Linkage</p>
            </div>
            <Field label="Linked Login Account" error={errors.userId?.message}>
              <select className={inputClass} {...register("userId")}>
                <option value="">— Not linked —</option>
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>
                ))}
              </select>
            </Field>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Controls which login account this employee record belongs to — used for My HR, clock in/out, and manager approval routing.
              Left blank, it links automatically the first time this person opens My HR, if their login email matches the email above.
            </p>
          </div>

          <div className="border-t border-border" />

          {/* Financial */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Financial Information</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Basic Salary (₹)" required error={errors.basicSalary?.message}>
                <input className={inputClass} type="number" min={0} {...register("basicSalary")} />
              </Field>
              <Field label="HRA (₹)">
                <input className={inputClass} type="number" min={0} {...register("hra")} />
              </Field>
              <Field label="Allowances (₹)">
                <input className={inputClass} type="number" min={0} {...register("allowances")} />
              </Field>
              <Field label="Bank Name">
                <input className={inputClass} placeholder="e.g. HDFC Bank" {...register("bankName")} />
              </Field>
              <Field label="Bank Account Number">
                <input className={inputClass} {...register("bankAccountNumber")} />
              </Field>
              <Field label="IFSC Code">
                <input className={inputClass} {...register("ifscCode")} />
              </Field>
              <Field label="UAN">
                <input className={inputClass} {...register("uan")} />
              </Field>
              <Field label="PF Number">
                <input className={inputClass} {...register("pfNumber")} />
              </Field>
              <Field label="PAN Number">
                <input className={inputClass} {...register("panNumber")} />
              </Field>
            </div>
          </div>

        </div>

        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {employee ? "Changes will be saved immediately" : "Documents can be added after creating the employee"}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {employee ? "Save Changes" : "Add Employee"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
