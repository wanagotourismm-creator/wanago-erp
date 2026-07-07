// Pure calculation engine for the Sales Incentive Structure. No
// React/Firebase dependencies — takes already-fetched data and returns
// computed summaries, so it's easy to reason about and reuse from any
// hook or script.
import type { Booking } from "@/modules/bookings/types";
import type { Lead } from "@/modules/leads/types";
import type { Employee } from "@/modules/hrms/shared/types";
import type { IncentiveSettings } from "@/modules/incentives/settings/types";
import type { AgentIncentiveSummary, MonthlyReward, QuarterlyReward } from "@/modules/incentives/types";
import { toDate } from "@/lib/utils/helpers";
import type { Timestamp } from "@/types/global";

type DateLike = Timestamp | Date | string | null | undefined;

export function lookupTier(
  pctAchieved: number,
  s: IncentiveSettings
): { rate: number; label: string } {
  if (pctAchieved < s.minEligibilityPct) return { rate: 0, label: "Below Minimum Level" };
  if (pctAchieved <= s.tier1MaxPct)       return { rate: s.tier1RatePercent, label: "Level 1 – Achiever" };
  if (pctAchieved <= s.tier2MaxPct)       return { rate: s.tier2RatePercent, label: "Level 2 – Strong Performer" };
  if (pctAchieved <= s.tier3MaxPct)       return { rate: s.tier3RatePercent, label: "Level 3 – High Performer" };
  return { rate: s.tier4RatePercent, label: "Level 4 – Top Performer" };
}

export function calculateFastClosureBonus(
  assignedAt: DateLike,
  confirmedAt: DateLike,
  s: IncentiveSettings
): number {
  const start = toDate(assignedAt);
  const end   = toDate(confirmedAt);
  if (!start || !end) return 0;
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (hours < 0) return 0;
  if (hours <= 24) return s.fastClosure24hBonus;
  if (hours <= 48) return s.fastClosure48hBonus;
  return 0;
}

export function calculateHighValueBonus(profitAmount: number, s: IncentiveSettings): number {
  return profitAmount > s.highValueThreshold ? s.highValueBonusAmount : 0;
}

type Group = {
  agentId: string;
  agentName: string;
  month: number;
  year: number;
  bookingsCount: number;
  totalProfit: number;
  fastClosureBonus: number;
  highValueBonus: number;
  selfGeneratedProfit: number;
};

/**
 * Groups confirmed bookings by agent + month/year and computes every
 * incentive component per the current IncentiveSettings. `employeesById`
 * and `leadsById` should be pre-built lookup maps for O(1) joins.
 */
export function computeAgentIncentiveSummaries(
  bookings: Booking[],
  leadsById: Map<string, Lead>,
  employeesById: Map<string, Employee>,
  settings: IncentiveSettings
): AgentIncentiveSummary[] {
  const groups = new Map<string, Group>();

  for (const booking of bookings) {
    if (booking.profitAmount == null || !booking.assignedTo) continue;

    // FieldValue only appears transiently at write time (serverTimestamp()
    // sentinel) — by the time a booking is read back it's always a real
    // Timestamp, so this cast is safe (same pattern the old code used).
    const opsApprovedAt = booking.opsApprovedAt as Timestamp | Date | string | null;
    const confirmedAt = toDate(opsApprovedAt) ?? toDate(booking.updatedAt);
    if (!confirmedAt) continue;

    const month = confirmedAt.getMonth();
    const year  = confirmedAt.getFullYear();
    const key   = `${booking.assignedTo}__${year}-${month}`;
    const lead  = booking.leadId ? leadsById.get(booking.leadId) : undefined;

    let existing = groups.get(key);
    if (!existing) {
      existing = {
        agentId: booking.assignedTo,
        agentName: booking.agentName ?? "Unknown Agent",
        month, year,
        bookingsCount: 0,
        totalProfit: 0,
        fastClosureBonus: 0,
        highValueBonus: 0,
        selfGeneratedProfit: 0,
      };
      groups.set(key, existing);
    }

    existing.bookingsCount += 1;
    existing.totalProfit   += booking.profitAmount;

    if (settings.fastClosureBonusEnabled && lead?.assignedAt) {
      const leadAssignedAt = lead.assignedAt as Timestamp | Date | string | null;
      existing.fastClosureBonus += calculateFastClosureBonus(leadAssignedAt, confirmedAt, settings);
    }
    if (settings.highValueBonusEnabled) {
      existing.highValueBonus += calculateHighValueBonus(booking.profitAmount, settings);
    }
    if (lead?.isSelfGenerated) {
      existing.selfGeneratedProfit += booking.profitAmount;
    }
  }

  // Team totals, per month/year, across every group — used for the Team
  // Bonus Layer's "did the whole team hit its combined target" check.
  const teamProfitByMonth = new Map<string, number>();
  for (const g of groups.values()) {
    const key = `${g.year}-${g.month}`;
    teamProfitByMonth.set(key, (teamProfitByMonth.get(key) ?? 0) + g.totalProfit);
  }

  const summaries: AgentIncentiveSummary[] = [];
  for (const g of groups.values()) {
    const employee = employeesById.get(g.agentId);
    const monthlyProfitTarget = employee?.monthlyProfitTarget || settings.defaultMonthlyProfitTarget;
    const pctAchieved = monthlyProfitTarget > 0 ? (g.totalProfit / monthlyProfitTarget) * 100 : 0;
    const { rate: tierRatePercent, label: tierLabel } = lookupTier(pctAchieved, settings);

    const baseIncentive = settings.baseIncentiveEnabled ? g.totalProfit * (tierRatePercent / 100) : 0;
    const fastClosureBonus = settings.fastClosureBonusEnabled ? g.fastClosureBonus : 0;
    const highValueBonus = settings.highValueBonusEnabled ? g.highValueBonus : 0;
    const selfGeneratedBonus =
      settings.selfGeneratedBonusEnabled && pctAchieved >= settings.minEligibilityPct
        ? g.selfGeneratedProfit * (settings.selfGeneratedBonusPercent / 100)
        : 0;

    const teamTotalProfit = teamProfitByMonth.get(`${g.year}-${g.month}`) ?? 0;
    const teamBonus =
      settings.teamBonusEnabled && teamTotalProfit >= settings.teamMonthlyTarget
        ? g.totalProfit * (settings.teamBonusPercent / 100)
        : 0;

    const incentiveAmount = baseIncentive + fastClosureBonus + highValueBonus + selfGeneratedBonus + teamBonus;

    summaries.push({
      agentId: g.agentId,
      agentName: g.agentName,
      month: g.month,
      year: g.year,
      bookingsCount: g.bookingsCount,
      totalProfit: g.totalProfit,
      monthlyProfitTarget,
      pctAchieved,
      tierLabel,
      tierRatePercent,
      baseIncentive,
      fastClosureBonus,
      highValueBonus,
      selfGeneratedBonus,
      teamBonus,
      incentiveAmount,
    });
  }

  summaries.sort((a, b) => {
    if (b.year !== a.year)   return b.year - a.year;
    if (b.month !== a.month) return b.month - a.month;
    return b.incentiveAmount - a.incentiveAmount;
  });

  return summaries;
}

/** Top 3 agents for a given month, by profit, among those who hit 100%+ of target. */
export function computeMonthlyRewards(
  summaries: AgentIncentiveSummary[],
  month: number,
  year: number,
  settings: IncentiveSettings
): MonthlyReward[] {
  if (!settings.monthlyRewardsEnabled) return [];

  const qualifying = summaries
    .filter(s => s.month === month && s.year === year && s.pctAchieved >= 100)
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 3);

  const amounts = [settings.monthlyReward1Amount, settings.monthlyReward2Amount, settings.monthlyReward3Amount];

  return qualifying.map((s, i) => ({
    agentId: s.agentId,
    agentName: s.agentName,
    month, year,
    rank: (i + 1) as 1 | 2 | 3,
    totalProfit: s.totalProfit,
    rewardAmount: amounts[i],
  }));
}

/** Agents who were the #1 monthly performer for the 3 consecutive months ending at referenceDate. */
export function computeQuarterlyRewards(
  summaries: AgentIncentiveSummary[],
  settings: IncentiveSettings,
  referenceDate: Date = new Date()
): QuarterlyReward[] {
  if (!settings.quarterlyRewardsEnabled) return [];

  const last3: { month: number; year: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    last3.unshift({ month: d.getMonth(), year: d.getFullYear() });
  }

  const topPerMonth = last3.map(({ month, year }) => {
    const rewards = computeMonthlyRewardsIgnoringToggle(summaries, month, year);
    return rewards.find(r => r.rank === 1) ?? null;
  });

  if (topPerMonth.some(r => r === null)) return [];
  const agentId = topPerMonth[0]!.agentId;
  if (!topPerMonth.every(r => r!.agentId === agentId)) return [];

  return [{
    agentId,
    agentName: topPerMonth[0]!.agentName,
    months: last3,
    cashAmount: settings.quarterlyRewardCashAmount,
    note: settings.quarterlyRewardNote,
  }];
}

// Quarterly eligibility checks "who was #1" for the last 3 months
// regardless of whether Monthly Rewards are currently toggled on — the
// quarterly streak is a historical fact, not gated by today's toggle.
function computeMonthlyRewardsIgnoringToggle(
  summaries: AgentIncentiveSummary[],
  month: number,
  year: number
): MonthlyReward[] {
  const qualifying = summaries
    .filter(s => s.month === month && s.year === year && s.pctAchieved >= 100)
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 3);

  return qualifying.map((s, i) => ({
    agentId: s.agentId,
    agentName: s.agentName,
    month, year,
    rank: (i + 1) as 1 | 2 | 3,
    totalProfit: s.totalProfit,
    rewardAmount: 0,
  }));
}
