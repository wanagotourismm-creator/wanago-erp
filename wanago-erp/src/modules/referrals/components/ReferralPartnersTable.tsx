"use client";

import { Send, Edit2, Trash2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/helpers";
import type { ReferralPartner } from "@/modules/referrals/types";

type Props = {
  partners: ReferralPartner[];
  loading: boolean;
  onEdit: (p: ReferralPartner) => void;
  onDelete: (p: ReferralPartner) => void;
  onShare: (p: ReferralPartner) => void;
};

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 font-mono text-xs text-foreground hover:bg-muted/70 transition-colors"
    >
      {code} {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

export function ReferralPartnersTable({ partners, loading, onEdit, onDelete, onShare }: Props) {
  if (loading) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Loading...</p>;
  }
  if (partners.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">No Freelance Referral Executives yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Name", "Phone", "Code", "Payout", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {partners.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-foreground">{p.fullName}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                <td className="px-4 py-3"><CopyCodeButton code={p.referralCode} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground uppercase">{p.payoutMethod}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    p.partnerStatus === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                  )}>
                    {p.partnerStatus === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => onShare(p)} title="Send kit" className="flex h-7 w-7 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"><Send size={13} /></button>
                    <button onClick={() => onEdit(p)} title="Edit" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => onDelete(p)} title="Delete" className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
