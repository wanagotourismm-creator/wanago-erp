import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { fetchReferralBonuses } from "@/modules/referrals/services/referral.service";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { toDate } from "@/lib/utils/helpers";
import type { ReferralClick, ReferralBonus, ReferrerType } from "@/modules/referrals/types";
import type { Lead } from "@/modules/leads/types";

class ReferralClickRepository extends BaseRepository<ReferralClick> {
  constructor() { super(FIRESTORE_COLLECTIONS.REFERRAL_CLICKS); }
}
const clickRepo = new ReferralClickRepository();

export async function fetchReferralClicks(): Promise<ReferralClick[]> {
  return clickRepo.findMany();
}

export type ReferrerStat = {
  referrerType:  ReferrerType;
  referrerId:    string;
  referrerName:  string;
  clicks:        number;
  leadsSent:     number;
  bookings:      number;
  revenue:       number;
  bonusEarned:   number;
  bonusPending:  number;
};

export type WeekPoint = { weekOf: string; leads: number; bookings: number };

export type ReferralAnalytics = {
  totalClicks:   number;
  totalLeads:    number;
  totalBookings: number;
  totalRevenue:  number;
  totalBonusPending: number;
  totalBonusPaid:    number;
  conversionRate: number; // bookings / leads, 0 if no leads
  clickToLeadRate: number; // leads / clicks, 0 if no clicks
  weekly:        WeekPoint[]; // last 12 weeks, oldest first
  leaderboard:   ReferrerStat[]; // sorted by revenue desc
};

function isReferralLead(l: Lead): boolean {
  return !!(l.referredByCustomerId || l.referredByPartnerId);
}

function weekOfFor(date: Date): string {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}

function last12WeekLabels(): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    labels.push(weekOfFor(d));
  }
  return [...new Set(labels)];
}

// Computed entirely client-side from the same small, already-fetched
// collections the rest of the referral pages use (bonuses, leads, clicks)
// — consistent with how useSalesTeamPerformance.ts computes its own
// numbers rather than requiring a server aggregation endpoint, appropriate
// at this business's data volume.
export async function computeReferralAnalytics(): Promise<ReferralAnalytics> {
  const [clicks, bonuses, allLeads] = await Promise.all([
    fetchReferralClicks(),
    fetchReferralBonuses(),
    fetchLeads(),
  ]);

  const referralLeads = allLeads.filter(isReferralLead);

  const stats = new Map<string, ReferrerStat>();
  function key(type: ReferrerType, id: string) { return `${type}:${id}`; }
  function ensure(type: ReferrerType, id: string, name: string): ReferrerStat {
    const k = key(type, id);
    const existing = stats.get(k);
    if (existing) return existing;
    const created: ReferrerStat = {
      referrerType: type, referrerId: id, referrerName: name,
      clicks: 0, leadsSent: 0, bookings: 0, revenue: 0, bonusEarned: 0, bonusPending: 0,
    };
    stats.set(k, created);
    return created;
  }

  for (const c of clicks) {
    ensure(c.referrerType, c.referrerId, c.referrerType === "partner" ? "Freelance Executive" : "Customer").clicks += 1;
  }

  for (const l of referralLeads) {
    if (l.referredByCustomerId) ensure("customer", l.referredByCustomerId, l.name).leadsSent += 1;
    else if (l.referredByPartnerId) ensure("partner", l.referredByPartnerId, l.name).leadsSent += 1;
  }

  for (const b of bonuses) {
    const id = b.referrerType === "partner" ? b.referrerPartnerId : b.referrerCustomerId;
    if (!id) continue;
    const s = ensure(b.referrerType, id, b.referrerName);
    s.bookings += 1;
    s.revenue += b.bookingRevenue;
    if (b.bonusStatus === "paid") s.bonusEarned += b.bonusAmount;
    else s.bonusPending += b.bonusAmount;
    s.referrerName = b.referrerName; // bonuses carry the most reliably accurate name
  }

  const leaderboard = Array.from(stats.values()).sort((a, b) => b.revenue - a.revenue);

  const weekLabels = last12WeekLabels();
  const weekly: WeekPoint[] = weekLabels.map((weekOf) => ({ weekOf, leads: 0, bookings: 0 }));
  const weekIndex = new Map(weekLabels.map((w, i) => [w, i]));

  for (const l of referralLeads) {
    const d = toDate(l.createdAt);
    if (!d) continue;
    const idx = weekIndex.get(weekOfFor(d));
    if (idx !== undefined) weekly[idx].leads += 1;
  }
  for (const b of bonuses) {
    const d = toDate(b.createdAt);
    if (!d) continue;
    const idx = weekIndex.get(weekOfFor(d));
    if (idx !== undefined) weekly[idx].bookings += 1;
  }

  const totalClicks = clicks.length;
  const totalLeads = referralLeads.length;
  const totalBookings = bonuses.length;
  const totalRevenue = bonuses.reduce((s, b) => s + b.bookingRevenue, 0);
  const totalBonusPending = bonuses.filter(b => b.bonusStatus === "pending").reduce((s, b) => s + b.bonusAmount, 0);
  const totalBonusPaid = bonuses.filter(b => b.bonusStatus === "paid").reduce((s, b) => s + b.bonusAmount, 0);

  return {
    totalClicks, totalLeads, totalBookings, totalRevenue, totalBonusPending, totalBonusPaid,
    conversionRate: totalLeads > 0 ? (totalBookings / totalLeads) * 100 : 0,
    clickToLeadRate: totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0,
    weekly, leaderboard,
  };
}

export async function fetchLeadsForReferrer(type: ReferrerType, id: string): Promise<Lead[]> {
  const all = await fetchLeads();
  return all.filter(l => (type === "customer" ? l.referredByCustomerId === id : l.referredByPartnerId === id));
}

export async function fetchBonusesForReferrer(type: ReferrerType, id: string): Promise<ReferralBonus[]> {
  const all = await fetchReferralBonuses();
  return all.filter(b => (type === "partner" ? b.referrerPartnerId === id : b.referrerCustomerId === id));
}

export async function fetchClickCountForReferrer(type: ReferrerType, id: string): Promise<number> {
  const all = await fetchReferralClicks();
  return all.filter(c => c.referrerType === type && c.referrerId === id).length;
}
