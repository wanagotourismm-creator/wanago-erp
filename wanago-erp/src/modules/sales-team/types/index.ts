// Computed (not persisted) summary of a sales agent's performance for a
// given month — merges leads (assigned/won), confirmed booking revenue,
// and the profit-based incentive estimate from the Incentives module.
// There is no Firestore collection behind this; it's derived on the fly.
export type SalesAgentPerformance = {
  agentId:         string;
  agentName:       string;
  month:           number; // 0-11 (JS Date month index)
  year:            number;
  leadsAssigned:   number;
  leadsWon:        number;
  conversionRate:  number; // percentage, 0-100
  revenue:         number; // confirmed booking totalAmount, summed
  incentiveAmount: number;
  // This agent's single most-recently-due HR goal / most-recent review —
  // not month-scoped like the fields above (goals/reviews aren't monthly),
  // so the same latest value is attached to every one of this agent's rows.
  latestGoal:   { title: string; progress: number; status: string } | null;
  latestReview: { rating: string; period: string; reviewDate: string } | null;
};
