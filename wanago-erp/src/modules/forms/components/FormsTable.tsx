"use client";

import { Edit2, Trash2, FileText, Send, Square, Link2, BarChart3 } from "lucide-react";
import { FormStatusBadge } from "@/modules/forms/components/FormBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDate } from "@/lib/utils/helpers";
import type { Form } from "@/modules/forms/types";

type Props = {
  forms:      Form[];
  loading:    boolean;
  onEdit:      (form: Form) => void;
  onDelete:    (form: Form) => void;
  onTogglePublish: (form: Form) => void;
  onViewResponses: (form: Form) => void;
  onFill:      (form: Form) => void;
  onCopyLink:  (form: Form) => void;
};

export function FormsTable({ forms, loading, onEdit, onDelete, onTogglePublish, onViewResponses, onFill, onCopyLink }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (forms.length === 0) {
    return (
      <EmptyState
        title="No forms yet"
        description="Create your first form for office use or public sharing"
        icon={<FileText size={22} />}
      />
    );
  }

  return (
    <>
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Form", "Visibility", "Status", "Responses", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {forms.map((form) => (
                <tr key={form.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-3 cursor-pointer" onClick={() => (form.visibility === "internal" && form.formStatus === "published" ? onFill(form) : onEdit(form))}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <FileText size={14} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{form.title}</p>
                        <p className="text-[11px] text-muted-foreground">{form.refNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground capitalize">{form.visibility}</span>
                  </td>
                  <td className="px-4 py-3"><FormStatusBadge status={form.formStatus} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => onViewResponses(form)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      <BarChart3 size={12} /> {form.responseCount}
                    </button>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(form.createdAt)}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {form.visibility === "public" && form.shareToken && (
                        <button onClick={(e) => { e.stopPropagation(); onCopyLink(form); }} title="Copy public link"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <Link2 size={13} />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); onTogglePublish(form); }} title={form.formStatus === "published" ? "Close form" : "Publish form"}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        {form.formStatus === "published" ? <Square size={13} /> : <Send size={13} />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onEdit(form); }} title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(form); }} title="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sm:hidden space-y-2.5">
        {forms.map((form) => {
          const actions: SwipeAction[] = [
            { key: "edit", icon: <Edit2 size={16} />, label: "Edit", onClick: () => onEdit(form), className: "bg-primary" },
            { key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(form), className: "bg-red-600" },
          ];
          return (
            <SwipeableRow key={form.id} actions={actions} onTap={() => (form.visibility === "internal" && form.formStatus === "published" ? onFill(form) : onEdit(form))} className="rounded-xl border border-border">
              <div className="rounded-xl bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{form.title}</p>
                    <p className="text-[11px] text-muted-foreground">{form.refNumber} · {form.visibility}</p>
                  </div>
                  <FormStatusBadge status={form.formStatus} />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                  <span className="text-[11px] text-muted-foreground">{form.responseCount} response{form.responseCount !== 1 ? "s" : ""}</span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(form.createdAt)}</span>
                </div>
              </div>
            </SwipeableRow>
          );
        })}
      </div>
    </>
  );
}
