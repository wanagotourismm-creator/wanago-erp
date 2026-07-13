"use client";

import { X, BarChart3 } from "lucide-react";
import { useFormResponses } from "@/modules/forms/hooks/useFormResponses";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/utils/helpers";
import type { Form } from "@/modules/forms/types";

type Props = {
  form:    Form | null;
  onClose: () => void;
};

function answerToText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function FormResponsesModal({ form, onClose }: Props) {
  const { responses, loading } = useFormResponses(form);

  if (!form) return null;

  const exportRows = responses.map((r) => {
    const row: Record<string, unknown> = {
      "Submitted By": r.submittedByName ?? "Anonymous",
      "Submitted At": formatDateTime(r.createdAt),
    };
    for (const field of form.fields) {
      row[field.label] = answerToText(r.answers[field.id]);
    }
    return row;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">Responses — {form.title}</h2>
              <p className="text-xs text-muted-foreground">{responses.length} response{responses.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BulkExportButton filenameBase={`${form.refNumber}-responses`} rows={exportRows} />
            <button onClick={onClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 scrollbar-thin">
          {loading ? (
            <SkeletonTable rows={4} />
          ) : responses.length === 0 ? (
            <EmptyState title="No responses yet" description="Responses will show up here once people start submitting" icon={<BarChart3 size={22} />} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Submitted By</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Date</th>
                    {form.fields.map(f => (
                      <th key={f.id} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {responses.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-foreground">{r.submittedByName ?? "Anonymous"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                      {form.fields.map(f => (
                        <td key={f.id} className="px-3 py-2 text-xs text-foreground">{answerToText(r.answers[f.id])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
