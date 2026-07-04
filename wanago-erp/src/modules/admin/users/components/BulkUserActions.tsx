"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils/helpers";
import type { Office } from "@/modules/admin/offices/types";
import type { UserProfile } from "@/modules/auth/types";

type Props = {
  count:    number;
  offices:  Office[];
  onClear:  () => void;
  onApply:  (data: {
    systemRole?: UserProfile["systemRole"];
    officeId?:   string;
    officeName?: string;
    isActive?:   boolean;
  }) => Promise<void>;
};

const selectClass = cn(
  "rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none",
  "hover:border-primary/40 focus:border-primary"
);

export function BulkUserActions({ count, offices, onClear, onApply }: Props) {
  const [applying, setApplying] = useState(false);
  const [role,     setRole]     = useState("");
  const [officeId, setOfficeId] = useState("");

  async function run(data: Parameters<Props["onApply"]>[0]) {
    setApplying(true);
    try {
      await onApply(data);
      onClear();
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
      <span className="text-xs font-semibold text-foreground">{count} selected</span>

      <button
        onClick={() => run({ isActive: true })}
        disabled={applying}
        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
      >
        Activate
      </button>
      <button
        onClick={() => run({ isActive: false })}
        disabled={applying}
        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
      >
        Deactivate
      </button>

      <div className="flex items-center gap-1.5">
        <select className={selectClass} value={role} onChange={e => setRole(e.target.value)}>
          <option value="">Change role...</option>
          {Object.entries(SYSTEM_ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => role && run({ systemRole: role as UserProfile["systemRole"] })}
          disabled={applying || !role}
          className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <select className={selectClass} value={officeId} onChange={e => setOfficeId(e.target.value)}>
          <option value="">Change office...</option>
          {offices.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <button
          onClick={() => {
            const office = offices.find(o => o.id === officeId);
            if (office) run({ officeId: office.id, officeName: office.name });
          }}
          disabled={applying || !officeId}
          className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {applying && <Loader2 size={14} className="animate-spin text-primary" />}

      <button onClick={onClear} className="ml-auto flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <X size={13} />
      </button>
    </div>
  );
}
