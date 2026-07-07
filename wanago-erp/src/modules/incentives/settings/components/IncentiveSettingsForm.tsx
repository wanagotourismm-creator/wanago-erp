"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { Switch } from "@/components/ui/Switch";
import type { IncentiveSettings } from "@/modules/incentives/settings/types";

type Props = {
  settings: IncentiveSettings;
  saving:   boolean;
  onSave:   (data: IncentiveSettings) => Promise<{ error: string | null }>;
};

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

// Wrapper for each incentive component's card — a Switch up top toggles the
// whole section on/off, and the rest of the inputs grey out (but stay
// visible, since the numbers are still meaningful config even when paused).
function Section({
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  title:       string;
  description?: string;
  enabled:     boolean;
  onToggle:    (v: boolean) => void;
  children:    React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{title}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Switch checked={enabled} onChange={onToggle} />
      </div>
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 transition-opacity", !enabled && "opacity-50")}>
        {children}
      </div>
    </div>
  );
}

export function IncentiveSettingsForm({ settings, saving, onSave }: Props) {
  const [form, setForm] = useState<IncentiveSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setForm(settings); }, [settings]);

  function set<K extends keyof IncentiveSettings>(key: K, value: IncentiveSettings[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    const result = await onSave(form);
    if (result.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <Section
        title="Base Tiered Incentive"
        description="Percentage of an agent's monthly profit target achieved determines the incentive rate applied to their total profit. Individual agents can have their own target set on their Employee profile — this falls back to the default below when unset."
        enabled={form.baseIncentiveEnabled}
        onToggle={v => set("baseIncentiveEnabled", v)}
      >
        <Field label="Minimum Eligibility (%)">
          <input className={inputClass} type="number" min={0} max={100} step={1}
            disabled={!form.baseIncentiveEnabled}
            value={form.minEligibilityPct}
            onChange={e => set("minEligibilityPct", Number(e.target.value))} />
        </Field>
        <Field label="Default Monthly Profit Target (₹)">
          <input className={inputClass} type="number" min={0} step={100}
            disabled={!form.baseIncentiveEnabled}
            placeholder="20000"
            value={form.defaultMonthlyProfitTarget}
            onChange={e => set("defaultMonthlyProfitTarget", Number(e.target.value))} />
        </Field>
        <Field label="Tier 1 Max (%)">
          <input className={inputClass} type="number" min={0} max={100} step={1}
            disabled={!form.baseIncentiveEnabled}
            value={form.tier1MaxPct}
            onChange={e => set("tier1MaxPct", Number(e.target.value))} />
        </Field>
        <Field label="Tier 1 Rate (%)">
          <input className={inputClass} type="number" min={0} max={100} step={0.1}
            disabled={!form.baseIncentiveEnabled}
            value={form.tier1RatePercent}
            onChange={e => set("tier1RatePercent", Number(e.target.value))} />
        </Field>
        <Field label="Tier 2 Max (%)">
          <input className={inputClass} type="number" min={0} max={100} step={1}
            disabled={!form.baseIncentiveEnabled}
            value={form.tier2MaxPct}
            onChange={e => set("tier2MaxPct", Number(e.target.value))} />
        </Field>
        <Field label="Tier 2 Rate (%)">
          <input className={inputClass} type="number" min={0} max={100} step={0.1}
            disabled={!form.baseIncentiveEnabled}
            value={form.tier2RatePercent}
            onChange={e => set("tier2RatePercent", Number(e.target.value))} />
        </Field>
        <Field label="Tier 3 Max (%)">
          <input className={inputClass} type="number" min={0} max={100} step={1}
            disabled={!form.baseIncentiveEnabled}
            value={form.tier3MaxPct}
            onChange={e => set("tier3MaxPct", Number(e.target.value))} />
        </Field>
        <Field label="Tier 3 Rate (%)">
          <input className={inputClass} type="number" min={0} max={100} step={0.1}
            disabled={!form.baseIncentiveEnabled}
            value={form.tier3RatePercent}
            onChange={e => set("tier3RatePercent", Number(e.target.value))} />
        </Field>
        <Field label="Tier 4 Rate (%) — above Tier 3 Max">
          <input className={inputClass} type="number" min={0} max={100} step={0.1}
            disabled={!form.baseIncentiveEnabled}
            value={form.tier4RatePercent}
            onChange={e => set("tier4RatePercent", Number(e.target.value))} />
        </Field>
      </Section>

      <Section
        title="Fast Closure Bonus"
        description="Flat bonus paid when a lead is converted to a confirmed booking within a set window of lead assignment."
        enabled={form.fastClosureBonusEnabled}
        onToggle={v => set("fastClosureBonusEnabled", v)}
      >
        <Field label="Within 24h Bonus (₹)">
          <input className={inputClass} type="number" min={0} step={10}
            disabled={!form.fastClosureBonusEnabled}
            placeholder="300"
            value={form.fastClosure24hBonus}
            onChange={e => set("fastClosure24hBonus", Number(e.target.value))} />
        </Field>
        <Field label="Within 48h Bonus (₹)">
          <input className={inputClass} type="number" min={0} step={10}
            disabled={!form.fastClosureBonusEnabled}
            placeholder="150"
            value={form.fastClosure48hBonus}
            onChange={e => set("fastClosure48hBonus", Number(e.target.value))} />
        </Field>
      </Section>

      <Section
        title="High-Value Booking Bonus"
        description="Extra flat bonus per booking whose profit exceeds the threshold below."
        enabled={form.highValueBonusEnabled}
        onToggle={v => set("highValueBonusEnabled", v)}
      >
        <Field label="Profit Threshold (₹)">
          <input className={inputClass} type="number" min={0} step={500}
            disabled={!form.highValueBonusEnabled}
            placeholder="15000"
            value={form.highValueThreshold}
            onChange={e => set("highValueThreshold", Number(e.target.value))} />
        </Field>
        <Field label="Bonus per Booking (₹)">
          <input className={inputClass} type="number" min={0} step={10}
            disabled={!form.highValueBonusEnabled}
            placeholder="500"
            value={form.highValueBonusAmount}
            onChange={e => set("highValueBonusAmount", Number(e.target.value))} />
        </Field>
      </Section>

      <Section
        title="Self-Generated Lead Bonus"
        description="Extra percentage on profit for leads the agent sourced themselves, applied only once the agent has crossed the minimum eligibility threshold."
        enabled={form.selfGeneratedBonusEnabled}
        onToggle={v => set("selfGeneratedBonusEnabled", v)}
      >
        <Field label="Extra Rate (%)">
          <input className={inputClass} type="number" min={0} max={100} step={0.1}
            disabled={!form.selfGeneratedBonusEnabled}
            placeholder="2"
            value={form.selfGeneratedBonusPercent}
            onChange={e => set("selfGeneratedBonusPercent", Number(e.target.value))} />
        </Field>
      </Section>

      <Section
        title="Team Bonus Layer"
        description="Extra percentage paid to everyone on the team once the team's combined monthly target is hit."
        enabled={form.teamBonusEnabled}
        onToggle={v => set("teamBonusEnabled", v)}
      >
        <Field label="Extra Rate (%)">
          <input className={inputClass} type="number" min={0} max={100} step={0.1}
            disabled={!form.teamBonusEnabled}
            placeholder="2"
            value={form.teamBonusPercent}
            onChange={e => set("teamBonusPercent", Number(e.target.value))} />
        </Field>
        <Field label="Team Monthly Target (₹)">
          <input className={inputClass} type="number" min={0} step={1000}
            disabled={!form.teamBonusEnabled}
            placeholder="500000"
            value={form.teamMonthlyTarget}
            onChange={e => set("teamMonthlyTarget", Number(e.target.value))} />
        </Field>
      </Section>

      <Section
        title="Monthly Power Rewards"
        description="Cash rewards for the top 3 ranked agents, among those who hit 100%+ of their monthly target."
        enabled={form.monthlyRewardsEnabled}
        onToggle={v => set("monthlyRewardsEnabled", v)}
      >
        <Field label="Rank 1 Reward (₹)">
          <input className={inputClass} type="number" min={0} step={100}
            disabled={!form.monthlyRewardsEnabled}
            placeholder="3000"
            value={form.monthlyReward1Amount}
            onChange={e => set("monthlyReward1Amount", Number(e.target.value))} />
        </Field>
        <Field label="Rank 2 Reward (₹)">
          <input className={inputClass} type="number" min={0} step={100}
            disabled={!form.monthlyRewardsEnabled}
            placeholder="2000"
            value={form.monthlyReward2Amount}
            onChange={e => set("monthlyReward2Amount", Number(e.target.value))} />
        </Field>
        <Field label="Rank 3 Reward (₹)">
          <input className={inputClass} type="number" min={0} step={100}
            disabled={!form.monthlyRewardsEnabled}
            placeholder="1000"
            value={form.monthlyReward3Amount}
            onChange={e => set("monthlyReward3Amount", Number(e.target.value))} />
        </Field>
      </Section>

      <Section
        title="Quarterly Power Rewards"
        description="Awarded to the agent who ranks #1 monthly performer for 3 consecutive months."
        enabled={form.quarterlyRewardsEnabled}
        onToggle={v => set("quarterlyRewardsEnabled", v)}
      >
        <Field label="Cash Equivalent (₹)">
          <input className={inputClass} type="number" min={0} step={500}
            disabled={!form.quarterlyRewardsEnabled}
            placeholder="10000"
            value={form.quarterlyRewardCashAmount}
            onChange={e => set("quarterlyRewardCashAmount", Number(e.target.value))} />
        </Field>
        <Field label="Reward Note">
          <input className={inputClass} type="text"
            disabled={!form.quarterlyRewardsEnabled}
            placeholder="Sponsored Trip / ₹10,000 Cash"
            value={form.quarterlyRewardNote}
            onChange={e => set("quarterlyRewardNote", e.target.value)} />
        </Field>
      </Section>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <Check size={13} /> Saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
