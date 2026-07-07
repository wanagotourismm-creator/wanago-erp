// Fully admin-configurable Sales Incentive Structure — every threshold,
// rate, and bonus amount here is editable in IncentiveSettingsForm.tsx so
// the company can revise the structure without a code change. Each bonus
// component also carries its own on/off toggle.
export type IncentiveSettings = {
  // ── Tiered base incentive (% of individual monthly profit target achieved) ──
  baseIncentiveEnabled: boolean;
  minEligibilityPct:    number; // below this → no incentive at all (PDF: 50)
  tier1MaxPct:          number; // upper bound of tier 1            (PDF: 70)
  tier1RatePercent:     number; // rate for minEligibilityPct–tier1MaxPct (PDF: 4)
  tier2MaxPct:          number; // upper bound of tier 2            (PDF: 90)
  tier2RatePercent:     number; // rate for tier1MaxPct–tier2MaxPct (PDF: 6)
  tier3MaxPct:          number; // upper bound of tier 3            (PDF: 100)
  tier3RatePercent:     number; // rate for tier2MaxPct–tier3MaxPct (PDF: 8)
  tier4RatePercent:     number; // rate for tier3MaxPct and above   (PDF: 10)

  // Fallback per-agent target when Employee.monthlyProfitTarget is unset.
  defaultMonthlyProfitTarget: number;

  // ── Fast Closure Bonus (lead assignment → booking confirmation) ──
  fastClosureBonusEnabled: boolean;
  fastClosure24hBonus:     number; // PDF: 300
  fastClosure48hBonus:     number; // PDF: 150

  // ── High-Value Booking Bonus (per booking) ──
  highValueBonusEnabled: boolean;
  highValueThreshold:    number; // PDF: 15000 (profit above this qualifies)
  highValueBonusAmount:  number; // PDF: 500

  // ── Self-Generated Lead Bonus ──
  selfGeneratedBonusEnabled: boolean;
  selfGeneratedBonusPercent: number; // PDF: 2

  // ── Team Bonus Layer ──
  teamBonusEnabled:  boolean;
  teamBonusPercent:  number; // PDF: 2
  teamMonthlyTarget: number; // separate, hand-set combined team target

  // ── Monthly Power Rewards (top 3, only if 100%+ achieved) ──
  monthlyRewardsEnabled: boolean;
  monthlyReward1Amount:  number; // PDF: 3000
  monthlyReward2Amount:  number; // PDF: 2000
  monthlyReward3Amount:  number; // PDF: 1000

  // ── Quarterly Power Rewards (#1 for 3 consecutive months) ──
  quarterlyRewardsEnabled:   boolean;
  quarterlyRewardCashAmount: number; // PDF: 10000
  quarterlyRewardNote:       string; // e.g. "Sponsored Trip / Cash equivalent"
};
