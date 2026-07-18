"use client";

import { useEffect, useState } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import { SYSTEM_ROLE_LABELS, TEAM_ROLE_LABELS } from "@/lib/constants";
import { RoleAccessPreview } from "@/components/shared/RoleAccessPreview";
import { PageAccessEditor } from "@/components/shared/PageAccessEditor";
import { cn } from "@/lib/utils/helpers";
import type { Office } from "@/modules/admin/offices/types";
import type { UserProfile } from "@/modules/auth/types";
import type { SystemRole } from "@/types/rbac";
import type { NewUserInput } from "@/modules/admin/users/services/user-admin.service";

type Props = {
  open:     boolean;
  user?:    UserProfile | null;
  onClose:  () => void;
  onSubmitNew:  (data: NewUserInput) => Promise<{ error: string | null }>;
  onSubmitEdit: (uid: string, data: Partial<UserProfile>) => Promise<{ error: string | null }>;
};

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

export function UserForm({ open, user, onClose, onSubmitNew, onSubmitEdit }: Props) {
  const [offices, setOffices] = useState<Office[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email,       setEmail]       = useState("");
  const [password,     setPassword]    = useState("");
  const [displayName,  setDisplayName] = useState("");
  const [phone,        setPhone]       = useState("");
  const [systemRole,   setSystemRole]  = useState("sales");
  const [teamRole,     setTeamRole]    = useState("agent");
  const [officeId,     setOfficeId]    = useState("");
  const [department,   setDepartment]  = useState("");
  const [isActive,     setIsActive]    = useState(true);
  const [customPageAccess, setCustomPageAccess] = useState<string[] | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchOffices().then(setOffices).catch(() => {});
    setError(null);
    if (user) {
      setEmail(user.email);
      setDisplayName(user.displayName);
      setPhone(user.phone ?? "");
      setSystemRole(user.systemRole);
      setTeamRole(user.teamRole);
      setOfficeId(user.officeId);
      setDepartment(user.department);
      setIsActive(user.isActive);
      setCustomPageAccess(user.customPageAccess ?? null);
      setPassword("");
    } else {
      setEmail(""); setDisplayName(""); setPhone(""); setPassword("");
      setSystemRole("sales"); setTeamRole("agent"); setOfficeId(""); setDepartment("");
      setIsActive(true);
      setCustomPageAccess(null);
    }
  }, [open, user]);

  if (!open) return null;

  const selectedOffice = offices.find(o => o.id === officeId);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      if (user) {
        const result = await onSubmitEdit(user.uid, {
          displayName,
          phone: phone || null,
          systemRole: systemRole as UserProfile["systemRole"],
          teamRole:   teamRole as UserProfile["teamRole"],
          officeId,
          officeName: selectedOffice?.name ?? user.officeName,
          department,
          isActive,
          customPageAccess,
        });
        if (result.error) { setError(result.error); return; }
      } else {
        if (!email || !password || !displayName || !officeId) {
          setError("Please fill in all required fields.");
          return;
        }
        const result = await onSubmitNew({
          email, password, displayName,
          phone: phone || null,
          systemRole: systemRole as UserProfile["systemRole"],
          teamRole:   teamRole as UserProfile["teamRole"],
          officeId,
          officeName: selectedOffice?.name ?? "",
          department,
          customPageAccess,
        });
        if (result.error) { setError(result.error); return; }
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <UserPlus size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{user ? "Edit User" : "Add User"}</h2>
              <p className="text-xs text-muted-foreground">{user ? `Editing ${user.displayName}` : "Create a new team member account"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <Field label="Full Name" required>
                <input className={inputClass} placeholder="e.g. Anjali Mehta" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </Field>
            </div>
            <Field label="Email" required>
              <input className={inputClass} type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} disabled={!!user} />
            </Field>
            {!user && (
              <Field label="Password" required>
                <input className={inputClass} type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
              </Field>
            )}
            <Field label="Phone">
              <input className={inputClass} type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
            </Field>
            <Field label="Department">
              <input className={inputClass} placeholder="e.g. Sales" value={department} onChange={e => setDepartment(e.target.value)} />
            </Field>
            <Field label="System Role" required>
              <select className={inputClass} value={systemRole} onChange={e => { setSystemRole(e.target.value); setCustomPageAccess(null); }}>
                {Object.entries(SYSTEM_ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <div className="col-span-2">
              <RoleAccessPreview role={systemRole as SystemRole} />
            </div>
            <div className="col-span-2">
              <PageAccessEditor
                role={systemRole as SystemRole}
                value={customPageAccess}
                onChange={setCustomPageAccess}
              />
            </div>
            <Field label="Team Role" required>
              <select className={inputClass} value={teamRole} onChange={e => setTeamRole(e.target.value)}>
                {Object.entries(TEAM_ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Office" required>
                <select className={inputClass} value={officeId} onChange={e => setOfficeId(e.target.value)}>
                  <option value="">Select office</option>
                  {offices.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            {user && (
              <div className="col-span-2 flex items-center pt-1">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-input" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  Account active
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {user ? "Save Changes" : "Create User"}
          </button>
        </div>

      </div>
    </div>
  );
}
