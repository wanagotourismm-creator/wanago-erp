"use client";

import { useState, useEffect } from "react";
import { Gift, CheckCircle2 } from "lucide-react";
import { useReferrals } from "@/modules/referrals/hooks/useReferrals";
import { ReferralBonusStatusBadge } from "@/modules/referrals/components/ReferralBonusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Switch } from "@/components/ui/Switch";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, formatCurrency, cn } from "@/lib/utils/helpers";

export function ReferralProgramPage() {
  const { settings, bonuses, loading, saveSettings, markPaid } = useReferrals();
  const [bonusAmountInput, setBonusAmountInput] = useState(String(settings.bonusAmount));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setBonusAmountInput(String(settings.bonusAmount)); }, [settings.bonusAmount]);

  async function handleToggle(enabled: boolean) {
    await saveSettings({ ...settings, enabled });
  }

  async function handleSaveAmount() {
    const amount = Number(bonusAmountInput);
    if (!Number.isFinite(amount) || amount < 0) return;
    setSaving(true);
    await saveSettings({ ...settings, bonusAmount: amount });
    setSaving(false);
  }

  async function handleMarkPaid(id: string) {
    if (confirm("Mark this referral bonus as paid? This just records that you've settled it outside the system.")) {
      await markPaid(id);
    }
  }

  const pendingTotal = bonuses.filter(b => b.bonusStatus === "pending").reduce((sum, b) => sum + b.bonusAmount, 0);

  return (
    <div className="space-y-5">

      <PageHeader
        title="Referral Program"
        description="Customers earn a bonus when someone they refer completes a booking"
      />

      {/* Settings card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Gift size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Referral Program</p>
              <p className="text-xs text-muted-foreground">
                {settings.enabled ? "On — new leads/customers can enter a referral code" : "Off — referral fields are hidden across the app"}
              </p>
            </div>
          </div>
          <Switch checked={settings.enabled} onChange={handleToggle} />
        </div>

        <div className="border-t border-border pt-4">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Bonus per confirmed booking (₹)
          </label>
          <div className="flex items-center gap-2 max-w-xs">
            <input
              type="number"
              min={0}
              value={bonusAmountInput}
              onChange={(e) => setBonusAmountInput(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handleSaveAmount}
              disabled={saving || Number(bonusAmountInput) === settings.bonusAmount}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Credited automatically to the referrer once the referred customer&apos;s booking is Confirmed.
          </p>
        </div>
      </div>

      {/* Bonuses ledger */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Bonus Ledger</p>
          {pendingTotal > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {formatCurrency(pendingTotal)} pending payout
            </span>
          )}
        </div>

        {loading ? (
          <SkeletonTable rows={4} />
        ) : bonuses.length === 0 ? (
          <EmptyState
            title="No referral bonuses yet"
            description="They'll show up here once a referred customer's booking is confirmed"
            icon={<Gift size={22} />}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Referrer", "Referred Customer", "Booking", "Amount", "Status", "Date", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bonuses.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 font-medium text-foreground">{b.referrerName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.referredCustomerName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{b.bookingRefNumber}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(b.bonusAmount)}</td>
                      <td className="px-4 py-3"><ReferralBonusStatusBadge status={b.bonusStatus} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(b.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {b.bonusStatus === "pending" && (
                          <button
                            onClick={() => handleMarkPaid(b.id)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium",
                              "text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
                            )}
                          >
                            <CheckCircle2 size={12} /> Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
