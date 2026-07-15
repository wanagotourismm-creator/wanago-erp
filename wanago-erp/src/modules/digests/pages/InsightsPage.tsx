"use client";

import { useState } from "react";
import { RefreshCw, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, LineChart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, cn } from "@/lib/utils/helpers";
import { useLatestAiInsights } from "@/modules/digests/hooks/useLatestAiInsights";
import { useLatestPredictions } from "@/modules/predictions/hooks/useLatestPredictions";
import { useAuthStore } from "@/store/auth.store";
import { auth } from "@/lib/firebase/client";

const CONFIDENCE_COLORS: Record<string, string> = {
  insufficient: "text-muted-foreground",
  low: "text-muted-foreground",
  medium: "text-amber-500",
  high: "text-green-600",
};

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      {sub}
    </div>
  );
}

export function InsightsPage() {
  const { user } = useAuthStore();
  const { report, loading, reload } = useLatestAiInsights();
  const { predictions, loading: predictionsLoading, reload: reloadPredictions } = useLatestPredictions();
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = !!user && (user.systemRole === "super_admin" || user.systemRole === "admin");

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const [insightsRes, predictionsRes] = await Promise.all([
        fetch("/api/cron/weekly-ai-insights/regenerate", { method: "POST", headers: { authorization: `Bearer ${idToken}` } }),
        fetch("/api/cron/weekly-ml-predictions/regenerate", { method: "POST", headers: { authorization: `Bearer ${idToken}` } }),
      ]);
      if (!insightsRes.ok) {
        const data = await insightsRes.json().catch(() => ({}));
        setError(data.error ?? "Failed to regenerate insights.");
      } else if (!predictionsRes.ok) {
        const data = await predictionsRes.json().catch(() => ({}));
        setError(data.error ?? "Failed to regenerate predictions.");
      }
      await Promise.all([reload(), reloadPredictions()]);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="AI Insights"
        description="Weekly business report across leads, quotations, bookings, and invoices — generated every Monday."
        actions={isAdmin && (
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />} loading={regenerating} onClick={handleRegenerate}>
            Regenerate
          </Button>
        )}
      />

      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle size={14} /> {error}
        </p>
      )}

      {loading ? (
        <Card>
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </Card>
      ) : !report ? (
        <EmptyState
          icon={<Sparkles size={22} />}
          title="No insights report yet"
          description={isAdmin ? "Click Regenerate to generate this week's report now, or wait for Monday's scheduled run." : "Generates automatically every Monday."}
        />
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-primary" />
              <CardTitle>Week of {report.weekOf}</CardTitle>
            </div>
            <p className="mb-4 text-sm text-foreground leading-relaxed">{report.headline}</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile
                label="Revenue"
                value={formatCurrency(report.totalRevenue)}
                sub={report.revenueChangePct !== null && (
                  <p className={cn("mt-0.5 flex items-center gap-1 text-[11px] font-medium", report.revenueChangePct >= 0 ? "text-green-600" : "text-destructive")}>
                    {report.revenueChangePct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {Math.abs(report.revenueChangePct)}% vs last week
                  </p>
                )}
              />
              <Tile label="Bookings" value={report.totalBookings} />
              <Tile label="Lead Conversion" value={`${report.leadConversionRate}%`} sub={<p className="mt-0.5 text-[11px] text-muted-foreground">{report.leadsWonCount}/{report.newLeadsCount} new leads won</p>} />
              <Tile label="Quotation Win Rate" value={`${report.quotationWinRate}%`} sub={<p className="mt-0.5 text-[11px] text-muted-foreground">{report.quotationsAccepted} accepted, {report.quotationsRejected} rejected</p>} />
              <Tile label="Pending Finance Approvals" value={report.pendingFinanceApprovals} />
              <Tile label="Overdue Invoices" value={report.overdueInvoiceCount} sub={<p className="mt-0.5 text-[11px] text-muted-foreground">{formatCurrency(report.overdueInvoiceAmount)} outstanding</p>} />
              <Tile label="Going Cold" value={`${report.goingColdCount} customers`} />
              <Tile label="New Leads" value={report.newLeadsCount} />
            </div>
          </Card>

          {(report.topDestinationsByLeads.length > 0 || report.topDestinationsByRevenue.length > 0) && (
            <div className="grid gap-5 sm:grid-cols-2">
              {report.topDestinationsByLeads.length > 0 && (
                <Card>
                  <CardTitle>Top Destinations by Leads</CardTitle>
                  <div className="mt-3 space-y-2">
                    {report.topDestinationsByLeads.map(d => (
                      <div key={d.destination} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{d.destination}</span>
                        <span className="font-semibold text-foreground">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {report.topDestinationsByRevenue.length > 0 && (
                <Card>
                  <CardTitle>Top Destinations by Revenue</CardTitle>
                  <div className="mt-3 space-y-2">
                    {report.topDestinationsByRevenue.map(d => (
                      <div key={d.destination} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{d.destination}</span>
                        <span className="font-semibold text-foreground">{formatCurrency(d.count)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {report.keyTakeaways.length > 0 && (
            <Card>
              <CardTitle>Key Takeaways</CardTitle>
              <ul className="mt-3 space-y-2">
                {report.keyTakeaways.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {report.risks.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={15} className="text-amber-500" />
                <CardTitle>Risks</CardTitle>
              </div>
              <ul className="mt-3 space-y-2">
                {report.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {report.recommendations.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb size={15} className="text-primary" />
                <CardTitle>Recommendations</CardTitle>
              </div>
              <ul className="mt-3 space-y-2">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {!predictionsLoading && predictions && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <LineChart size={15} className="text-primary" />
              <CardTitle>Revenue Forecast (ML)</CardTitle>
            </div>
            {predictions.revenueForecast.trained ? (
              <>
                <p className={cn("mb-3 text-[11px] font-medium", CONFIDENCE_COLORS[predictions.revenueForecast.confidence])}>
                  {predictions.revenueForecast.confidence} confidence · based on {predictions.revenueForecast.sampleSize} weeks of history
                </p>
                <div className="space-y-2">
                  {predictions.revenueForecast.weeklyForecast.map(w => (
                    <div key={w.weekOf} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Week of {w.weekOf}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(w.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{predictions.revenueForecast.note ?? "Not enough historical data yet to forecast."}</p>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-1">
              <LineChart size={15} className="text-primary" />
              <CardTitle>Lead Conversion Model (ML)</CardTitle>
            </div>
            {predictions.leadConversion.trained ? (
              <>
                <p className="mb-3 text-[11px] font-medium text-muted-foreground">
                  {Math.round((predictions.leadConversion.accuracy ?? 0) * 100)}% training accuracy · based on {predictions.leadConversion.sampleSize} labeled leads
                </p>
                {predictions.leadConversion.topDestinations.length > 0 && (
                  <p className="text-sm text-foreground">Destinations correlating with winning: {predictions.leadConversion.topDestinations.join(", ")}</p>
                )}
                {predictions.leadConversion.note && <p className="mt-2 text-[11px] text-muted-foreground">{predictions.leadConversion.note}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{predictions.leadConversion.note ?? "Not enough labeled leads yet to train a conversion model."}</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
