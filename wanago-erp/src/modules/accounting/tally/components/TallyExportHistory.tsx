"use client";

import { History } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/utils/helpers";
import { useTallyExports } from "@/modules/accounting/tally/hooks/useTallyExports";

export function TallyExportHistory() {
  const { exports, loading } = useTallyExports();

  if (loading) return <SkeletonTable rows={4} />;
  if (exports.length === 0) {
    return <EmptyState title="No exports yet" description="Past exports will show up here" icon={<History size={28} className="text-muted-foreground" />} />;
  }

  return (
    <Card>
      <CardHeader><CardTitle>Export History</CardTitle></CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Period</th>
              <th className="py-2 pr-4">Format</th>
              <th className="py-2 pr-4">Invoices</th>
              <th className="py-2 pr-4">Payments</th>
              <th className="py-2 pr-4">Expenses</th>
              <th className="py-2 pr-4">Unmapped</th>
              <th className="py-2">By</th>
            </tr>
          </thead>
          <tbody>
            {exports.map((e) => (
              <tr key={e.id} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                <td className="py-2 pr-4 whitespace-nowrap">{e.periodStart} → {e.periodEnd}</td>
                <td className="py-2 pr-4 uppercase">{e.format}</td>
                <td className="py-2 pr-4">{e.invoiceCount}</td>
                <td className="py-2 pr-4">{e.paymentCount}</td>
                <td className="py-2 pr-4">{e.expenseCount}</td>
                <td className="py-2 pr-4">
                  {e.unmappedExpenseCategories.length === 0 ? "—" : (
                    <span className="text-amber-600">{e.unmappedExpenseCategories.join(", ")}</span>
                  )}
                </td>
                <td className="py-2">{e.exportedByName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
