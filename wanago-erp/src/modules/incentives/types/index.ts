// Computed (not persisted) summary of a sales agent's profit-based
// incentive for a given month. There is no Firestore collection behind
// this — it's derived on the fly from confirmed bookings, employee
// targets, linked leads, and the admin-configurable Incentive Settings.
export type AgentIncentiveSummary = {
  agentId:              string;
  agentName:            string;
  month:                number; // 0-11 (JS Date month index)
  year:                 number;
  bookingsCount:        number;
  totalProfit:          number;
  monthlyProfitTarget:  number;
  pctAchieved:          number; // totalProfit / monthlyProfitTarget * 100
  tierLabel:            string; // e.g. "Level 2 – Strong Performer"
  tierRatePercent:      number; // the base tier rate applied (0/4/6/8/10 by default)

  // Breakdown — each defaults to 0 when its toggle is off in settings.
  baseIncentive:        number;
  fastClosureBonus:     number;
  highValueBonus:       number;
  selfGeneratedBonus:   number;
  teamBonus:            number;

  // Total of all the above — the headline figure shown everywhere.
  incentiveAmount:      number;
};

export type MonthlyReward = {
  agentId:      string;
  agentName:    string;
  month:        number;
  year:         number;
  rank:         1 | 2 | 3;
  totalProfit:  number;
  rewardAmount: number;
};

export type QuarterlyReward = {
  agentId:   string;
  agentName: string;
  // the 3 consecutive months they were the #1 monthly performer, oldest first
  months:    { month: number; year: number }[];
  cashAmount: number;
  note:       string;
};
