"use client";

import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";
import { exportRowsToXlsx } from "@/lib/bulk/exportSpreadsheet";

type Props = {
  filenameBase: string;
  rows: Record<string, unknown>[];
};

export function BulkExportButton({ filenameBase, rows }: Props) {
  const disabled = rows.length === 0;

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={() => exportToCsv(`${filenameBase}.csv`, rows)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
      >
        <Download size={14} /> CSV
      </button>
      <button
        onClick={() => exportRowsToXlsx(`${filenameBase}.xlsx`, rows)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
      >
        <Download size={14} /> XLSX
      </button>
    </div>
  );
}
