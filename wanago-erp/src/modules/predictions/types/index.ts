import type { FirestoreRecord } from "@/types/global";

export type RevenueForecastWeek = { weekOf: string; amount: number };

export type RevenueForecastResult = {
  trained: boolean;
  sampleSize: number;
  weeklyForecast: RevenueForecastWeek[];
  confidence: "insufficient" | "low" | "medium" | "high";
  note: string | null;
};

export type LeadConversionResult = {
  trained: boolean;
  sampleSize: number;
  accuracy: number | null;
  topDestinations: string[];
  note: string | null;
};

// Written by /api/cron/weekly-ml-predictions after calling the Python
// forecast function (api/ml/forecast.py) — the TS side owns all Firestore
// access; Python only ever does the numeric computation on data it's
// handed. `trained: false` on either sub-result means there wasn't enough
// historical data yet — the UI must show that honestly, never a
// confident-looking number derived from too few data points.
export type AiPredictionsReport = FirestoreRecord & {
  type: "weekly-ml-predictions";
  weekOf: string;
  revenueForecast: RevenueForecastResult;
  leadConversion: LeadConversionResult;
};
