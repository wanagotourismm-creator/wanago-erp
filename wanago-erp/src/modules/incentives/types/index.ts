// Computed (not persisted) summary of a sales agent's profit-based
// incentive for a given month. There is no Firestore collection behind
// this — it's derived on the fly from confirmed bookings + the
// placeholder incentive rate in Company Settings.
export type AgentIncentiveSummary = {
  agentId:             string;
  agentName:           string;
  month:               number; // 0-11 (JS Date month index)
  year:                number;
  bookingsCount:       number;
  totalProfit:         number;
  incentiveRatePercent: number;
  incentiveAmount:     number;
};
