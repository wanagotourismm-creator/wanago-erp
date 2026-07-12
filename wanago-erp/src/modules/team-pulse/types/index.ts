import type { FirestoreRecord } from "@/types/global";

export type Sentiment = 1 | 2 | 3 | 4 | 5;

// Doc ID is always `${roundId}_${createdBy}` (see team-pulse.service.ts) —
// that's what makes "one response per person per round" hold without any
// query-based rule logic, and a resubmission just overwrites via merge.
// `createdBy` (the uid) is written for abuse prevention only — the app's
// own UI (this module) never reads or displays it anywhere, only the
// aggregate counts computed server-side in /api/team-pulse/results. It's
// still visible to an admin going through the raw Collection Explorer,
// which is the "anonymous to viewers, traceable in the database" tier
// chosen for this feature, not full anonymity.
export type TeamPulseResponse = FirestoreRecord & {
  roundId:   string; // Monday date of the week this response is for, e.g. "2026-07-06"
  sentiment: Sentiment;
  comment:   string | null;
};

export type SentimentDistribution = Record<Sentiment, number>;

export type TeamPulseAggregate = {
  roundId: string;
  totalResponses: number;
  averageSentiment: number | null;
  distribution: SentimentDistribution;
};
