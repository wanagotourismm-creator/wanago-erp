"use client";

import { X, Edit2, Trash2, Clock, MapPin, User, Camera } from "lucide-react";
import { AttendanceStatusBadge } from "@/modules/hrms/attendance/components/AttendanceBadges";
import { formatDate, initials } from "@/lib/utils/helpers";
import type { AttendanceRecord } from "@/modules/hrms/shared/types";

type Props = {
  record:   AttendanceRecord | null;
  onClose:  () => void;
  onEdit:   (r: AttendanceRecord) => void;
  onDelete: (r: AttendanceRecord) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function AttendanceDetailModal({ record, onClose, onEdit, onDelete }: Props) {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(record.employeeName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{record.employeeName}</h2>
              <p className="text-xs text-muted-foreground">{formatDate(record.date)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <AttendanceStatusBadge status={record.status} />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Clock size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Timing</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Check In" value={record.clockIn} />
              <Row label="Check Out" value={record.clockOut} />
              <Row label="Break Start" value={record.breakStartTime} />
              <Row label="Break Minutes" value={record.breakMinutes} />
              <Row label="Hours Worked" value={record.hoursWorked} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Location</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Check In Address" value={record.clockInAddress} />
              <Row label="Check Out Address" value={record.clockOutAddress} />
              <Row label="Within Geofence (In)" value={record.withinGeofence === null ? null : record.withinGeofence ? "Yes" : "No"} />
              <Row label="Within Geofence (Out)" value={record.withinGeofenceOut === null ? null : record.withinGeofenceOut ? "Yes" : "No"} />
              <Row label="Distance From Office" value={record.distanceFromOfficeMeters != null ? `${(record.distanceFromOfficeMeters / 1000).toFixed(1)} km` : null} />
              <Row
                label="Location Approval"
                value={
                  record.locationApprovalStatus === "pending" ? <span className="text-amber-600">Pending</span>
                  : record.locationApprovalStatus === "approved" ? <span className="text-green-600">Approved</span>
                  : record.locationApprovalStatus === "rejected" ? <span className="text-destructive">Rejected</span>
                  : null
                }
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Date" value={formatDate(record.date)} />
            </div>
          </div>

          {(record.clockInSelfieUrl || record.clockOutSelfieUrl) && (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Camera size={13} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Selfies</p>
              </div>
              <div className="flex gap-3">
                {record.clockInSelfieUrl && (
                  <a href={record.clockInSelfieUrl} target="_blank" rel="noopener noreferrer" className="space-y-1">
                    <img src={record.clockInSelfieUrl} alt="Check-in selfie" className="h-20 w-20 rounded-xl border border-border object-cover" />
                    <p className="text-center text-[10px] text-muted-foreground">Check In</p>
                  </a>
                )}
                {record.clockOutSelfieUrl && (
                  <a href={record.clockOutSelfieUrl} target="_blank" rel="noopener noreferrer" className="space-y-1">
                    <img src={record.clockOutSelfieUrl} alt="Check-out selfie" className="h-20 w-20 rounded-xl border border-border object-cover" />
                    <p className="text-center text-[10px] text-muted-foreground">Check Out</p>
                  </a>
                )}
              </div>
            </div>
          )}

          {record.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {record.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button
            onClick={() => onEdit(record)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            onClick={() => onDelete(record)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>

      </div>
    </div>
  );
}
