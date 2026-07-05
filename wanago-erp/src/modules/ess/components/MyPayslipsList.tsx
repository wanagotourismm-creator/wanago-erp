"use client";

import { useState } from "react";
import { Wallet, Download, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils/helpers";
import { downloadPayslip } from "@/modules/hrms/payroll/services/payslip.service";
import { PayrollStatusBadge, MONTH_LABELS } from "@/modules/hrms/payroll/components/PayrollBadges";
import type { PayrollRecord } from "@/modules/hrms/shared/types";

export function MyPayslipsList({ payroll }: { payroll: PayrollRecord[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(record: PayrollRecord) {
    setDownloadingId(record.id);
    try { await downloadPayslip(record); }
    finally { setDownloadingId(null); }
  }

  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Wallet size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">My Payslips</p>
          <p className="text-xs text-muted-foreground">{payroll.length} record{payroll.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      {payroll.length === 0 ? (
        <EmptyState title="No payslips yet" description="Payslips appear here once payroll is processed" icon={<span className="text-2xl">💵</span>} />
      ) : (
        <div className="space-y-2">
          {payroll.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">{MONTH_LABELS[p.month]} {p.year}</p>
                  <PayrollStatusBadge status={p.payrollStatus} />
                </div>
                <p className="text-xs text-muted-foreground">Net {formatCurrency(p.netSalary)}</p>
              </div>
              <button onClick={() => handleDownload(p)} disabled={downloadingId === p.id}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-60">
                {downloadingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
