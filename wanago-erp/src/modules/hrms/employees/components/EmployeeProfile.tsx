"use client";

import { useEffect, useState } from "react";
import {
  X, Upload, FileText, Trash2, Loader2, User, Briefcase, Wallet, History, Camera,
} from "lucide-react";
import {
  uploadProfilePicture, uploadEmployeeDocument, removeEmployeeDocument,
} from "@/modules/hrms/employees/services/employee.service";
import { EmployeeStatusBadge, ProbationStatusBadge, EMPLOYMENT_TYPE_LABELS } from "@/modules/hrms/employees/components/EmployeeBadges";
import { fetchRecentActivity, type ActivityLogEntry } from "@/lib/activity-log";
import { formatDate, formatCurrency, initials, cn } from "@/lib/utils/helpers";
import type { Employee, EmployeeDocument } from "@/modules/hrms/shared/types";

type Props = {
  open:      boolean;
  employee:  Employee | null;
  onClose:   () => void;
  onUpdated: (employee: Employee) => void;
};

const DOCUMENT_LABELS = ["Aadhaar", "PAN Card", "Offer Letter", "Appointment Letter", "Certificate", "Other"];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}

export function EmployeeProfile({ open, employee, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<"overview" | "documents" | "activity">("overview");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [docLabel, setDocLabel] = useState(DOCUMENT_LABELS[0]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (!open || !employee) return;
    setTab("overview");
  }, [open, employee?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || tab !== "activity" || !employee) return;
    setActivityLoading(true);
    fetchRecentActivity(200)
      .then(all => setActivity(all.filter(a => a.entityType === "Employee" && a.detail.includes(employee.employeeCode))))
      .finally(() => setActivityLoading(false));
  }, [open, tab, employee]);

  if (!open || !employee) return null;

  async function handlePhotoUpload(file: File) {
    if (!employee) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePicture(employee.id, file);
      onUpdated({ ...employee, profilePictureUrl: url });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDocUpload(file: File) {
    if (!employee) return;
    setUploadingDoc(docLabel);
    try {
      const documents = await uploadEmployeeDocument(employee.id, docLabel, file, employee.documents);
      onUpdated({ ...employee, documents });
    } finally {
      setUploadingDoc(null);
    }
  }

  async function handleDocDelete(doc: EmployeeDocument) {
    if (!employee) return;
    if (!confirm(`Remove "${doc.label}"?`)) return;
    const documents = await removeEmployeeDocument(employee.id, doc.id, employee.documents);
    onUpdated({ ...employee, documents });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-border bg-card shadow-2xl">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">Employee Profile</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 border-b border-border px-6 py-5">
          <div className="relative">
            {employee.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={employee.profilePictureUrl} alt={employee.fullName} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {initials(employee.fullName)}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-sm hover:bg-primary/90 transition-colors">
              {uploadingPhoto ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto}
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
            </label>
          </div>
          <p className="text-base font-semibold text-foreground">{employee.fullName}</p>
          <p className="text-xs text-muted-foreground">{employee.designation} · {employee.employeeCode}</p>
          <div className="flex items-center gap-2">
            <EmployeeStatusBadge status={employee.employeeStatus} />
            <ProbationStatusBadge status={employee.probationStatus} />
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-border px-4">
          {[
            { key: "overview" as const,  label: "Overview",  icon: User },
            { key: "documents" as const, label: "Documents", icon: FileText },
            { key: "activity" as const,  label: "Activity",  icon: History },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors -mb-px",
                tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {tab === "overview" && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User size={13} className="text-primary" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Personal</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <Row label="Gender" value={employee.gender} />
                  <Row label="Date of Birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : null} />
                  <Row label="Mobile" value={employee.mobileNumber} />
                  <Row label="Email" value={employee.email} />
                  <Row label="Address" value={employee.address} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={13} className="text-primary" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Employment</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <Row label="Department" value={employee.department} />
                  <Row label="Designation" value={employee.designation} />
                  <Row label="Reporting Manager" value={employee.reportingManagerName} />
                  <Row label="Employment Type" value={EMPLOYMENT_TYPE_LABELS[employee.employmentType]} />
                  <Row label="Date of Joining" value={employee.dateOfJoining ? formatDate(employee.dateOfJoining) : null} />
                  <Row label="Office" value={employee.officeName} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={13} className="text-primary" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Financial</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <Row label="Basic Salary" value={formatCurrency(employee.basicSalary)} />
                  <Row label="HRA" value={formatCurrency(employee.hra)} />
                  <Row label="Allowances" value={formatCurrency(employee.allowances)} />
                  <Row label="Bank Name" value={employee.bankName} />
                  <Row label="Account Number" value={employee.bankAccountNumber} />
                  <Row label="IFSC Code" value={employee.ifscCode} />
                  <Row label="UAN" value={employee.uan} />
                  <Row label="PF Number" value={employee.pfNumber} />
                  <Row label="PAN Number" value={employee.panNumber} />
                </div>
              </div>
            </div>
          )}

          {tab === "documents" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <select value={docLabel} onChange={e => setDocLabel(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none hover:border-primary/40 focus:border-primary">
                  {DOCUMENT_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
                  {uploadingDoc ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  Upload
                  <input type="file" className="hidden" disabled={!!uploadingDoc}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); }} />
                </label>
              </div>

              {employee.documents.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No documents uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {employee.documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                      <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 flex-1 hover:text-primary transition-colors">
                        <FileText size={14} className="flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">{doc.label}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(doc.uploadedAt)}</p>
                        </div>
                      </a>
                      <button onClick={() => handleDocDelete(doc)} className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "activity" && (
            activityLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
            ) : activity.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No recorded activity for this employee yet</p>
            ) : (
              <div className="space-y-3">
                {activity.map(a => (
                  <div key={a.id} className="rounded-xl border border-border px-3 py-2.5">
                    <p className="text-xs text-foreground">{a.detail}</p>
                    <p className="text-[10px] text-muted-foreground">by {a.actorName} · {formatDate(a.createdAt)}</p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
}
