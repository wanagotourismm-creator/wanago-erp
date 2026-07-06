"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/helpers";
import type { RevenueDataPoint } from "@/modules/dashboard/types";

type Props = {
  data: RevenueDataPoint[];
};

const CONFIDENCE_LEVELS = ["High", "Med", "Low"] as const;
const CONFIDENCE_COLORS: Record<(typeof CONFIDENCE_LEVELS)[number], string> = {
  High: "text-green-600",
  Med:  "text-amber-500",
  Low:  "text-muted-foreground",
};

// Confidence is derived from the actual data's volatility (coefficient of
// variation across the trailing months feeding the EMA), degraded one
// level per additional month projected out — not a fixed High/Med/Low by
// position, so a genuinely steady revenue history reads as more confident
// than a spiky one, and thin/no history never claims "High".
function confidenceFor(actual: RevenueDataPoint[], monthsOut: number) {
  if (actual.length < 2) return { label: "Low" as const, color: CONFIDENCE_COLORS.Low };
  const amounts = actual.map(d => d.amount);
  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  if (mean === 0) return { label: "Low" as const, color: CONFIDENCE_COLORS.Low };
  const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
  const cv = Math.sqrt(variance) / mean;
  const baseIndex = cv < 0.15 ? 0 : cv < 0.4 ? 1 : 2;
  const index = Math.min(CONFIDENCE_LEVELS.length - 1, baseIndex + (monthsOut - 1));
  const label = CONFIDENCE_LEVELS[index];
  return { label, color: CONFIDENCE_COLORS[label] };
}

function getEMAForecast(data: RevenueDataPoint[]) {
  const actual = data.filter(d => d.amount > 0);
  const k      = 2 / (actual.length + 1);
  let ema      = actual[0]?.amount ?? 0;
  for (const d of actual) ema = d.amount * k + ema * (1 - k);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now    = new Date();
  const forecast = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const { label: confidence, color } = confidenceFor(actual, i);
    forecast.push({
      label: `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      amount: ema,
      confidence,
      color,
    });
    ema = ema * 0.95; // slight decay for future months
  }
  return { ema, forecast };
}

export function RevenueForecast({ data }: Props) {
  const { ema, forecast } = getEMAForecast(data);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now    = new Date();

  // Build timeline — last 6 months + 3 forecast
  const timeline = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = months[d.getMonth()];
    const found = data.find(x => x.month === m);
    timeline.push({ label: `${m} ${String(d.getFullYear()).slice(2)}`, amount: found?.amount ?? 0, forecast: false });
  }
  for (const f of forecast) {
    timeline.push({ label: f.label, amount: f.amount, forecast: true });
  }

  const max = Math.max(...timeline.map(t => t.amount), 1);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Revenue Forecast</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            EMA-based 3-month projection · Solid = actual · Dashed = forecast
          </p>
        </div>
      </CardHeader>

      {/* Timeline bar */}
      <div className="flex items-end gap-1 h-16 mb-3">
        {timeline.map((t, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "w-full rounded-t transition-all",
                t.forecast ? "bg-primary/30 border-t-2 border-dashed border-primary" : "bg-primary/70"
              )}
              style={{ height: `${Math.max((t.amount / max) * 48, 4)}px` }}
            />
          </div>
        ))}
      </div>

      {/* Labels */}
      <div className="flex gap-1 mb-4">
        {timeline.map((t, i) => (
          <div key={i} className="flex-1 text-center">
            <p className="text-[9px] text-muted-foreground truncate">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Forecast cards */}
      <div className="grid grid-cols-3 gap-3">
        {forecast.map((f) => (
          <div key={f.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground">{formatCurrency(f.amount)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{f.label}</p>
            <p className={`text-[10px] font-medium mt-1 ${f.color}`}>
              {f.confidence === "High" ? "↑" : f.confidence === "Med" ? "~" : "?"} {f.confidence}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">
        EMA baseline: {formatCurrency(ema)}/month · Based on 6-month payment history
      </p>
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
