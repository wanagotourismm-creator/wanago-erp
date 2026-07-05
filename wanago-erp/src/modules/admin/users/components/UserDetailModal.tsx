"use client";

import { X, Phone, Mail, Edit2, Power, Trash2, User, Briefcase } from "lucide-react";
import { initials, cn } from "@/lib/utils/helpers";
import { SYSTEM_ROLE_LABELS, TEAM_ROLE_LABELS } from "@/lib/constants";
import type { UserProfile } from "@/modules/auth/types";

type Props = {
  user:      UserProfile | null;
  onClose:   () => void;
  onEdit:    (user: UserProfile) => void;
  onToggle:  (user: UserProfile) => void;
  onDelete?: (user: UserProfile) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function UserDetailModal({ user, onClose, onEdit, onToggle, onDelete }: Props) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(user.displayName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{user.displayName}</h2>
              <p className="text-xs text-muted-foreground">{user.email}</p>
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
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              user.isActive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            )}>
              {user.isActive ? "Active" : "Inactive"}
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {SYSTEM_ROLE_LABELS[user.systemRole] ?? user.systemRole}
            </span>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Contact</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Email" value={<span className="inline-flex items-center gap-1.5"><Mail size={12} />{user.email}</span>} />
              {user.phone && <Row label="Phone" value={<span className="inline-flex items-center gap-1.5"><Phone size={12} />{user.phone}</span>} />}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Briefcase size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Role & Office</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="System Role" value={SYSTEM_ROLE_LABELS[user.systemRole] ?? user.systemRole} />
              <Row label="Team Role" value={TEAM_ROLE_LABELS[user.teamRole] ?? user.teamRole} />
              <Row label="Office" value={user.officeName} />
              <Row label="Department" value={user.department} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button
            onClick={() => onEdit(user)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            onClick={() => onToggle(user)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors",
              user.isActive ? "text-destructive hover:bg-destructive/10" : "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
            )}
          >
            <Power size={13} /> {user.isActive ? "Deactivate" : "Activate"}
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(user)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
