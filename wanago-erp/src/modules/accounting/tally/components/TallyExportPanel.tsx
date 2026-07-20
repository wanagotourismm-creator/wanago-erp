"use client";

import { useState } from "react";
import { Download, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import { fetchTallyMappings } from "@/modules/accounting/tally/services/tally-mapping.service";
import {
  fetchExportData, buildTallyVouchers, buildTallyXml, buildTallyCsv, logTallyExport,
} from "@/modules/accounting/tally/services/tally-export.service";
import { useAuthStore } from "@/store/auth.store";
import type { TallyExportFormat } from "@/modules/accounting/tally/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function TallyExportPanel({ onExported }: { onExported?: () => void }) {
  const { user } = useAuthStore();
  const [periodStart, setPeriodStart] = useState(firstOfMonthIso());
  const [periodEnd, setPeriodEnd] = useState(todayIso());
  const [format, setFormat] = useState<TallyExportFormat>("xml");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    invoiceCount: number; paymentCount: number; expenseCount: number; unmapped: string[];
  } | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    setSummary(null);
    try {
      const [data, mappings, company] = await Promise.all([
        fetchExportData(periodStart, periodEnd),
        fetchTallyMappings(),
        fetchCompanySettings(),
      ]);

      const { vouchers, unmappedExpenseCategories } = buildTallyVouchers(data, mappings);

      if (vouchers.length === 0) {
        setError("Nothing to export for this period — no approved invoices, payments, or paid expenses were found.");
        return;
      }

      const filenameBase = `Tally-Export-${periodStart}-to-${periodEnd}`;
      if (format === "xml") {
        downloadFile(`${filenameBase}.xml`, buildTallyXml(vouchers, company.businessName), "application/xml");
      } else {
        downloadFile(`${filenameBase}.csv`, buildTallyCsv(vouchers), "text/csv;charset=utf-8;");
      }

      await logTallyExport({
        periodStart, periodEnd, format,
        invoiceCount: data.invoices.length,
        paymentCount: data.payments.length,
        expenseCount: data.expenses.length,
        unmappedExpenseCategories,
        exportedBy: user?.uid ?? "",
        exportedByName: user?.displayName ?? "Unknown",
      });

      setSummary({
        invoiceCount: data.invoices.length, paymentCount: data.payments.length,
        expenseCount: data.expenses.length, unmapped: unmappedExpenseCategories,
      });
      onExported?.();
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Export to Tally</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Approved invoices, all payments, and paid expenses in the period, as Sales/Receipt/Payment vouchers.
          </p>
        </div>
      </CardHeader>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">From</label>
          <input
            type="date" value={periodStart} max={periodEnd}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">To</label>
          <input
            type="date" value={periodEnd} min={periodStart}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Format</label>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            <button
              onClick={() => setFormat("xml")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${format === "xml" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              XML (Tally import)
            </button>
            <button
              onClick={() => setFormat("csv")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${format === "csv" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              CSV (reconciliation)
            </button>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 size={14} />
            Exported {summary.invoiceCount} invoice{summary.invoiceCount !== 1 ? "s" : ""}, {summary.paymentCount} payment{summary.paymentCount !== 1 ? "s" : ""}, {summary.expenseCount} expense{summary.expenseCount !== 1 ? "s" : ""}.
          </div>
          {summary.unmapped.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>Unmapped expense categories used the category name as-is: <strong>{summary.unmapped.join(", ")}</strong>. Add a mapping in the Mappings tab for cleaner ledger names.</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
