"use client";

import { useState, useEffect } from "react";
import { Gift, CheckCircle2, Plus, Users, Image as ImageIcon, LayoutGrid, BarChart3, Send } from "lucide-react";
import { useReferrals } from "@/modules/referrals/hooks/useReferrals";
import { useReferralPartners } from "@/modules/referrals/hooks/useReferralPartners";
import { ReferralBonusStatusBadge } from "@/modules/referrals/components/ReferralBonusBadge";
import { ReferralPartnersTable } from "@/modules/referrals/components/ReferralPartnersTable";
import { ReferralPartnerForm } from "@/modules/referrals/components/ReferralPartnerForm";
import { PosterKitManager } from "@/modules/referrals/components/PosterKitManager";
import { ShareKitModal } from "@/modules/referrals/components/ShareKitModal";
import { BulkKitModal } from "@/modules/referrals/components/BulkKitModal";
import { ReferralAnalyticsDashboard } from "@/modules/referrals/components/ReferralAnalyticsDashboard";
import { ReferrerDetailModal } from "@/modules/referrals/components/ReferrerDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Switch } from "@/components/ui/Switch";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, formatCurrency, cn } from "@/lib/utils/helpers";
import type { ReferralPartner } from "@/modules/referrals/types";
import type { ReferralPartnerSchema } from "@/modules/referrals/schemas/partner.schema";
import type { ReferrerStat } from "@/modules/referrals/services/referral-analytics.service";

type Tab = "analytics" | "overview" | "partners" | "posters";

export function ReferralProgramPage() {
  const { settings, bonuses, loading, saveSettings, markPaid } = useReferrals();
  const { partners, loading: partnersLoading, addPartner, editPartner, removePartner } = useReferralPartners();

  const [tab, setTab] = useState<Tab>("overview");
  const [bonusAmountInput, setBonusAmountInput] = useState(String(settings.bonusAmount));
  const [partnerBonusInput, setPartnerBonusInput] = useState(String(settings.partnerBonusAmount));
  const [saving, setSaving] = useState(false);

  const [partnerFormOpen, setPartnerFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<ReferralPartner | null>(null);
  const [shareTarget, setShareTarget] = useState<ReferralPartner | null>(null);
  const [detailStat, setDetailStat] = useState<ReferrerStat | null>(null);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => { setBonusAmountInput(String(settings.bonusAmount)); setPartnerBonusInput(String(settings.partnerBonusAmount)); }, [settings]);

  async function handleToggle(enabled: boolean) {
    await saveSettings({ ...settings, enabled });
  }

  async function handleSaveAmounts() {
    const amount = Number(bonusAmountInput);
    const partnerAmount = Number(partnerBonusInput);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(partnerAmount) || partnerAmount < 0) return;
    setSaving(true);
    await saveSettings({ ...settings, bonusAmount: amount, partnerBonusAmount: partnerAmount });
    setSaving(false);
  }

  async function handleMarkPaid(id: string) {
    if (confirm("Mark this referral bonus as paid? This just records that you've settled it outside the system.")) {
      await markPaid(id);
    }
  }

  async function handlePartnerSubmit(data: ReferralPartnerSchema) {
    const payload = {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      payoutMethod: data.payoutMethod,
      upiId: data.upiId || null,
      bankAccountName: data.bankAccountName || null,
      bankAccountNumber: data.bankAccountNumber || null,
      bankIfscCode: data.bankIfscCode || null,
      partnerStatus: data.partnerStatus,
      notes: data.notes || null,
    };
    if (editingPartner) await editPartner(editingPartner.id, payload);
    else await addPartner(payload);
    setPartnerFormOpen(false);
    setEditingPartner(null);
  }

  async function handlePartnerDelete(p: ReferralPartner) {
    if (confirm(`Remove ${p.fullName} as a referral executive?`)) await removePartner(p.id);
  }

  function toggleSelectPartner(id: string) {
    setSelectedPartnerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPartners() {
    setSelectedPartnerIds(prev =>
      prev.size === partners.length ? new Set() : new Set(partners.map(p => p.id))
    );
  }

  // Opens the detail modal with a zeroed stat as a starting point — the
  // modal fetches the referrer's real leads/bonuses itself regardless, so
  // this is only wrong for the summary tiles at the top when opened from
  // the table (vs. the leaderboard, which already has the real numbers).
  function viewPartnerDetails(p: ReferralPartner) {
    setDetailStat({
      referrerType: "partner", referrerId: p.id, referrerName: p.fullName,
      clicks: 0, leadsSent: 0, bookings: 0, revenue: 0, bonusEarned: 0, bonusPending: 0,
    });
  }

  const pendingTotal = bonuses.filter(b => b.bonusStatus === "pending").reduce((sum, b) => sum + b.bonusAmount, 0);

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "overview", label: "Overview", icon: Gift },
    { key: "partners", label: "Freelance Executives", icon: Users },
    { key: "posters", label: "Poster Kits", icon: ImageIcon },
  ];

  return (
    <div className="space-y-5">

      <PageHeader
        title="Refer & Earn"
        description="Reward anyone — customers or freelance partners — who sends us a booking"
      />

      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "analytics" && (
        <ReferralAnalyticsDashboard
          onSelectReferrer={setDetailStat}
          onAddExecutive={() => { setTab("partners"); setEditingPartner(null); setPartnerFormOpen(true); }}
          onManagePosters={() => setTab("posters")}
          enabled={settings.enabled}
          onToggleEnabled={handleToggle}
        />
      )}

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Gift size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Refer &amp; Earn</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.enabled ? "On — referral fields and the /r/{code} link are active" : "Off — referral fields are hidden across the app"}
                  </p>
                </div>
              </div>
              <Switch checked={settings.enabled} onChange={handleToggle} />
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer bonus per booking (₹)
                </label>
                <input
                  type="number" min={0}
                  value={bonusAmountInput}
                  onChange={(e) => setBonusAmountInput(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Freelance Executive bonus per booking (₹)
                </label>
                <input
                  type="number" min={0}
                  value={partnerBonusInput}
                  onChange={(e) => setPartnerBonusInput(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Credited automatically once the referred customer&apos;s booking is Confirmed.
              </p>
              <button
                onClick={handleSaveAmounts}
                disabled={saving || (Number(bonusAmountInput) === settings.bonusAmount && Number(partnerBonusInput) === settings.partnerBonusAmount)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Bonus Ledger</p>
              {pendingTotal > 0 && (
                <span className="text-xs font-medium text-muted-foreground">{formatCurrency(pendingTotal)} pending payout</span>
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
                        {["Referrer", "Type", "Referred Customer", "Booking", "Amount", "Status", "Date", ""].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {bonuses.map((b) => (
                        <tr key={b.id}>
                          <td className="px-4 py-3 font-medium text-foreground">{b.referrerName}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                              b.referrerType === "partner" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              {b.referrerType === "partner" ? "Freelance" : "Customer"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{b.referredCustomerName}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{b.bookingRefNumber}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(b.bonusAmount)}</td>
                          <td className="px-4 py-3"><ReferralBonusStatusBadge status={b.bonusStatus} /></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(b.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            {b.bonusStatus === "pending" && (
                              <button
                                onClick={() => handleMarkPaid(b.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
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
      )}

      {tab === "partners" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {selectedPartnerIds.size > 0 ? (
              <p className="text-xs font-medium text-muted-foreground">{selectedPartnerIds.size} selected</p>
            ) : <span />}
            <div className="flex items-center gap-2">
              {selectedPartnerIds.size > 0 && (
                <button
                  onClick={() => setBulkOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  <Send size={14} /> Bulk Send Kit
                </button>
              )}
              <button
                onClick={() => { setEditingPartner(null); setPartnerFormOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                <Plus size={14} /> Add Executive
              </button>
            </div>
          </div>
          <ReferralPartnersTable
            partners={partners}
            loading={partnersLoading}
            onEdit={(p) => { setEditingPartner(p); setPartnerFormOpen(true); }}
            onDelete={handlePartnerDelete}
            onShare={setShareTarget}
            onViewDetails={viewPartnerDetails}
            selected={selectedPartnerIds}
            onToggleSelect={toggleSelectPartner}
            onToggleSelectAll={toggleSelectAllPartners}
          />
        </div>
      )}

      {tab === "posters" && (
        <div>
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <LayoutGrid size={13} /> Real branded artwork you upload — shared alongside a tracking link when staff send a kit.
          </div>
          <PosterKitManager />
        </div>
      )}

      <ReferralPartnerForm
        open={partnerFormOpen}
        partner={editingPartner}
        onClose={() => { setPartnerFormOpen(false); setEditingPartner(null); }}
        onSubmit={handlePartnerSubmit}
      />

      <ShareKitModal
        open={shareTarget !== null}
        onClose={() => setShareTarget(null)}
        recipientName={shareTarget?.fullName ?? ""}
        recipientPhone={shareTarget?.phone ?? ""}
        recipientEmail={shareTarget?.email ?? null}
        referralCode={shareTarget?.referralCode ?? ""}
      />

      <BulkKitModal
        open={bulkOpen}
        partners={partners.filter(p => selectedPartnerIds.has(p.id))}
        onClose={() => { setBulkOpen(false); setSelectedPartnerIds(new Set()); }}
      />

      <ReferrerDetailModal stat={detailStat} onClose={() => setDetailStat(null)} />

    </div>
  );
}
