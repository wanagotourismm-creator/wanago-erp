"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, User, Briefcase, DollarSign, FileText } from "lucide-react";
import { employeeSchema, type EmployeeSchema } from "@/modules/hrms/employees/schemas";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";

type Props = { open: boolean; employee?: Employee | null; onClose: () => void; onSubmit: (d: EmployeeSchema) => Promise<void>; };

const inp = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionHead({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={13} className="text-primary" />
      <p className="text-xs font-bold uppercase tracking-widest text-primary">{title}</p>
    </div>
  );
}

const DEPARTMENTS = ["Sales","Operations","Finance","Marketing","HR","Management","Support","Technology"];
const DESIGNATIONS = ["Manager","Senior Executive","Executive","Team Lead","Analyst","Associate","Intern","Director","CEO","Founder"];

export function EmployeeForm({ open, employee, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EmployeeSchema>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employmentType: "full_time", probationStatus: "probation",
      employeeStatus: "active", basicSalary: 0, hra: 0, allowances: 0,
      officeId: user?.officeId ?? "main", officeName: user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (employee) {
      reset({
        ...employee,
        gender: employee.gender ?? undefined,
        dateOfBirth: employee.dateOfBirth ?? "", address: employee.address ?? "",
        city: employee.city ?? "", state: employee.state ?? "",
        reportingManager: employee.reportingManager ?? "", userId: employee.userId ?? "",
        uan: employee.uan ?? "", pfNumber: employee.pfNumber ?? "",
        panNumber: employee.panNumber ?? "", bankName: employee.bankName ?? "",
        accountNumber: employee.accountNumber ?? "", ifscCode: employee.ifscCode ?? "",
        notes: employee.notes ?? "",
      });
    } else {
      reset({
        employmentType: "full_time", probationStatus: "probation",
        employeeStatus: "active", basicSalary: 0, hra: 0, allowances: 0,
        officeId: user?.officeId ?? "main", officeName: user?.officeName ?? "Head Office",
      });
    }
  }, [open, employee, reset, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <User size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{employee ? "Edit Employee" : "Add Employee"}</h2>
              <p className="text-xs text-muted-foreground">{employee ? `Editing ${employee.employeeId}` : "Fill in employee details"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">

          {/* Personal */}
          <div>
            <SectionHead icon={User} title="Personal Information" />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Field label="Full Name *" error={errors.fullName?.message}><input className={inp} placeholder="Rahul Sharma" {...register("fullName")} /></Field></div>
              <Field label="Email *" error={errors.email?.message}><input className={inp} type="email" placeholder="rahul@wanago.in" {...register("email")} /></Field>
              <Field label="Phone *" error={errors.phone?.message}><input className={inp} type="tel" placeholder="+91 98765 43210" {...register("phone")} /></Field>
              <Field label="Gender"><select className={inp} {...register("gender")}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
              <Field label="Date of Birth"><input className={inp} type="date" {...register("dateOfBirth")} /></Field>
              <div className="col-span-2"><Field label="Address"><input className={inp} placeholder="Full address" {...register("address")} /></Field></div>
              <Field label="City"><input className={inp} placeholder="Mumbai" {...register("city")} /></Field>
              <Field label="State"><input className={inp} placeholder="Maharashtra" {...register("state")} /></Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Employment */}
          <div>
            <SectionHead icon={Briefcase} title="Employment Information" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department *" error={errors.department?.message}>
                <select className={inp} {...register("department")}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Designation *" error={errors.designation?.message}>
                <select className={inp} {...register("designation")}>
                  <option value="">Select designation</option>
                  {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Employment Type *" error={errors.employmentType?.message}>
                <select className={inp} {...register("employmentType")}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                  <option value="probation">Probation</option>
                </select>
              </Field>
              <Field label="Date of Joining *" error={errors.dateOfJoining?.message}><input className={inp} type="date" {...register("dateOfJoining")} /></Field>
              <Field label="Probation Status">
                <select className={inp} {...register("probationStatus")}>
                  <option value="probation">On Probation</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="extended">Extended</option>
                </select>
              </Field>
              <Field label="Employee Status">
                <select className={inp} {...register("employeeStatus")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                  <option value="terminated">Terminated</option>
                  <option value="resigned">Resigned</option>
                </select>
              </Field>
              <div className="col-span-2"><Field label="Reporting Manager"><input className={inp} placeholder="Manager name" {...register("reportingManager")} /></Field></div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Financial */}
          <div>
            <SectionHead icon={DollarSign} title="Financial Information" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="Basic Salary (₹)"><input className={inp} type="number" min={0} placeholder="30000" {...register("basicSalary")} /></Field>
              <Field label="HRA (₹)"><input className={inp} type="number" min={0} placeholder="10000" {...register("hra")} /></Field>
              <Field label="Allowances (₹)"><input className={inp} type="number" min={0} placeholder="5000" {...register("allowances")} /></Field>
              <Field label="PAN Number"><input className={inp} placeholder="ABCDE1234F" {...register("panNumber")} /></Field>
              <Field label="UAN"><input className={inp} placeholder="UAN number" {...register("uan")} /></Field>
              <Field label="PF Number"><input className={inp} placeholder="PF number" {...register("pfNumber")} /></Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Bank */}
          <div>
            <SectionHead icon={FileText} title="Bank Details" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bank Name"><input className={inp} placeholder="HDFC Bank" {...register("bankName")} /></Field>
              <Field label="Account Number"><input className={inp} placeholder="Account number" {...register("accountNumber")} /></Field>
              <Field label="IFSC Code"><input className={inp} placeholder="HDFC0001234" {...register("ifscCode")} /></Field>
              <Field label="Notes"><input className={inp} placeholder="Any notes..." {...register("notes")} /></Field>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">Employee ID will be auto-generated</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
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
