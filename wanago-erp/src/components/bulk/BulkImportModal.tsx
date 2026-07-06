"use client";

import { useRef, useState } from "react";
import { X, Loader2, UploadCloud, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { parseSpreadsheetFile } from "@/lib/bulk/parseSpreadsheet";
import { exportRowsToXlsx } from "@/lib/bulk/exportSpreadsheet";
import { cn } from "@/lib/utils/helpers";

export type TemplateColumn = { key: string; label: string; required?: boolean; example?: string };

export type ParseRowResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

type Props<T> = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  templateColumns: TemplateColumn[];
  onParseRow: (raw: Record<string, string>, rowIndex: number) => ParseRowResult<T>;
  onImport: (rows: T[]) => Promise<{ created: number; failed: number }>;
};

const MAX_ERRORS_SHOWN = 8;

export function BulkImportModal<T>({
  open, onClose, title, description, templateColumns, onParseRow, onImport,
}: Props<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validRows, setValidRows] = useState<T[]>([]);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);

  if (!open) return null;

  function reset() {
    setFileName(null);
    setParseError(null);
    setValidRows([]);
    setRowErrors([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleDownloadTemplate() {
    const headerRow: Record<string, string> = {};
    for (const col of templateColumns) headerRow[col.label] = col.example ?? "";
    exportRowsToXlsx(`${title.toLowerCase().replace(/\s+/g, "-")}-template.xlsx`, [headerRow]);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setValidRows([]);
    setRowErrors([]);
    setResult(null);
    setParsing(true);

    try {
      const rows = await parseSpreadsheetFile(file);
      if (rows.length === 0) {
        setParseError("That file has no rows — check it has a header row plus at least one data row.");
        return;
      }

      const valid: T[] = [];
      const errors: string[] = [];
      rows.forEach((raw, i) => {
        const outcome = onParseRow(raw, i);
        if (outcome.error) errors.push(`Row ${i + 2}: ${outcome.error}`);
        else valid.push(outcome.data as T);
      });

      setValidRows(valid);
      setRowErrors(errors);
      if (valid.length === 0) {
        setParseError("None of the rows matched the expected columns — check the template and try again.");
      }
    } catch {
      setParseError("Couldn't read that file — make sure it's a valid .csv or .xlsx file.");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    const outcome = await onImport(validRows);
    setImporting(false);
    setResult(outcome);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <UploadCloud size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Import {title}</h2>
              <p className="text-xs text-muted-foreground">{description ?? "Upload a .csv or .xlsx file to create many at once"}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin">

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
          >
            <Download size={13} /> Download template
          </button>

          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="bulk-import-file"
            />
            <label htmlFor="bulk-import-file" className="cursor-pointer text-sm font-medium text-primary hover:underline">
              {fileName ? `Selected: ${fileName}` : "Choose a .csv or .xlsx file"}
            </label>
          </div>

          {parsing && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Reading file...
            </div>
          )}

          {parseError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {!parsing && !result && validRows.length > 0 && (
            <div className="rounded-xl border border-green-500/30 bg-green-50 dark:bg-green-900/20 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
              {validRows.length} row{validRows.length !== 1 ? "s" : ""} ready to import.
              {rowErrors.length > 0 && ` ${rowErrors.length} row${rowErrors.length !== 1 ? "s" : ""} will be skipped.`}
            </div>
          )}

          {rowErrors.length > 0 && !result && (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              {rowErrors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => <p key={i}>{e}</p>)}
              {rowErrors.length > MAX_ERRORS_SHOWN && <p>...and {rowErrors.length - MAX_ERRORS_SHOWN} more.</p>}
            </div>
          )}

          {result && (
            <div className="flex items-start gap-2 rounded-xl border border-green-500/30 bg-green-50 dark:bg-green-900/20 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Created {result.created} of {validRows.length}.
                {result.failed > 0 && ` ${result.failed} failed to save.`}
              </span>
            </div>
          )}

          <div className={cn("rounded-xl border border-border p-3", "bg-muted/30")}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Expected columns</p>
            <p className="text-xs text-muted-foreground">
              {templateColumns.map((c) => `${c.label}${c.required ? "*" : ""}`).join(", ")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleImport}
            disabled={importing || validRows.length === 0 || !!result}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
          >
            {importing && <Loader2 size={14} className="animate-spin" />}
            Import {validRows.length > 0 ? validRows.length : ""} row{validRows.length !== 1 ? "s" : ""}
          </button>
        </div>

      </div>
    </div>
  );
}
