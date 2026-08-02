"use client";

import { useEffect, useState } from "react";
import { Timer, Loader2, Save } from "lucide-react";
import { useTicketSlaPolicy } from "@/modules/tickets/hooks/useTicketSlaPolicy";
import type { TicketSlaPolicy } from "@/modules/tickets/services/ticket-sla-policy.service";
import type { TicketPriority } from "@/modules/tickets/types";

const inputClass = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all hover:border-primary/40 focus:border-primary focus:ring-0";

const PRIORITY_ORDER: TicketPriority[] = ["urgent", "high", "medium", "low"];
const PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgent: "Urgent", high: "High", medium: "Medium", low: "Low",
};

export function TicketSlaPolicyForm() {
  const { policy, loading, saving, save } = useTicketSlaPolicy();
  const [draft, setDraft] = useState<TicketSlaPolicy>(policy);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setDraft(policy); }, [policy]);

  function setHours(kind: "responseHours" | "resolutionHours", priority: TicketPriority, value: number) {
    setDraft((p) => ({ ...p, [kind]: { ...p[kind], [priority]: value } }));
  }

  async function handleSave() {
    setError(null);
    const allPositive = PRIORITY_ORDER.every((p) => draft.responseHours[p] > 0 && draft.resolutionHours[p] > 0);
    if (!allPositive) { setError("All thresholds must be greater than 0 hours."); return; }
    const anyInverted = PRIORITY_ORDER.some((p) => draft.responseHours[p] > draft.resolutionHours[p]);
    if (anyInverted) { setError("Response time can't be longer than resolution time for the same priority."); return; }

    const { error: saveError } = await save(draft);
    if (saveError) setError(saveError);
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Timer size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Ticket SLA Thresholds</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          How many hours a ticket has, per priority, before its First Response and Resolution clocks count as overdue. &quot;First Response&quot; is stamped the moment a ticket is assigned or moved out of Open — there&apos;s no reply/comment thread in this module, so this is the closest honest signal for &quot;staff acknowledged it.&quot;
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Priority</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">First Response (hours)</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Resolution (hours)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PRIORITY_ORDER.map((p) => (
                <tr key={p}>
                  <td className="px-2 py-2.5 font-medium text-foreground">{PRIORITY_LABELS[p]}</td>
                  <td className="px-2 py-2.5">
                    <input
                      type="number" min={0.5} step={0.5} className={inputClass}
                      value={draft.responseHours[p]}
                      onChange={(e) => setHours("responseHours", p, Number(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      type="number" min={0.5} step={0.5} className={inputClass}
                      value={draft.resolutionHours[p]}
                      onChange={(e) => setHours("resolutionHours", p, Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs font-medium text-green-600">Saved</span>}
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save SLA Policy
        </button>
      </div>
    </div>
  );
}
