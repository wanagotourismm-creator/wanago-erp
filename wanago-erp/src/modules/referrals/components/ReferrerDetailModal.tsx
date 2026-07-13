"use client";

import { useEffect, useState } from "react";
import { X, Loader2, MousePointerClick, TrendingUp } from "lucide-react";
import { fetchLeadsForReferrer, fetchBonusesForReferrer, fetchClickCountForReferrer } from "@/modules/referrals/services/referral-analytics.service";
import { ReferralBonusStatusBadge } from "@/modules/referrals/components/ReferralBonusBadge";
import { formatCurrency, formatDate, cn } from "@/lib/utils/helpers";
import { LEAD_STAGE_LABELS } from "@/lib/constants";
import type { ReferrerStat } from "@/modules/referrals/services/referral-analytics.service";
import type { Lead } from "@/modules/leads/types";
import type { ReferralBonus } from "@/modules/referrals/types";

type Props = {
  stat: ReferrerStat | null;
  onClose: () => void;
};

export function ReferrerDetailModal({ stat, onClose }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bonuses, setBonuses] = useState<ReferralBonus[]>([]);
  const [clicks, setClicks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stat) return;
    setLoading(true);
    Promise.all([
      fetchLeadsForReferrer(stat.referrerType, stat.referrerId),
      fetchBonusesForReferrer(stat.referrerType, stat.referrerId),
      fetchClickCountForReferrer(stat.referrerType, stat.referrerId),
    ]).then(([l, b, c]) => { setLeads(l); setBonuses(b); setClicks(c); }).finally(() => setLoading(false));
  }, [stat]);

  if (!stat) return null;

  // Derived from the freshly-fetched leads/bonuses/clicks rather than the
  // passed-in `stat` — that prop is only a stub with zeros when this modal
  // is opened from the Partners table row (vs. the leaderboard, which
  // already has real numbers), so trusting it here would show 0 revenue
  // for an executive who's actually generated plenty.
  const revenue = bonuses.reduce((s, b) => s + b.bookingRevenue, 0);
  const bonusPending = bonuses.filter(b => b.bonusStatus === "pending").reduce((s, b) => s + b.bonusAmount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{stat.referrerName}</h2>
            <p className="text-xs text-muted-foreground">{stat.referrerType === "partner" ? "Freelance Referral Executive" : "Customer Referrer"}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground"><MousePointerClick size={10} /> Clicks</p>
              <p className="mt-1 text-lg font-bold text-foreground">{clicks}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Leads Sent</p>
              <p className="mt-1 text-lg font-bold text-foreground">{leads.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground"><TrendingUp size={10} /> Revenue</p>
              <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(revenue)}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Bonus Pending</p>
              <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(bonusPending)}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-24 items-center justify-center"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Leads Sent ({leads.length})</p>
                {leads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No leads yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {leads.map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs">
                        <div>
                          <span className="font-medium text-foreground">{l.name}</span>
                          <span className="ml-1.5 text-muted-foreground">— {l.destination}</span>
                        </div>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", l.stage === "won" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                          {LEAD_STAGE_LABELS[l.stage as keyof typeof LEAD_STAGE_LABELS] ?? l.stage}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Bonuses ({bonuses.length})</p>
                {bonuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No confirmed bookings yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {bonuses.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs">
                        <div>
                          <span className="font-medium text-foreground">{b.bookingRefNumber}</span>
                          <span className="ml-1.5 text-muted-foreground">{formatDate(b.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{formatCurrency(b.bonusAmount)}</span>
                          <ReferralBonusStatusBadge status={b.bonusStatus} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
