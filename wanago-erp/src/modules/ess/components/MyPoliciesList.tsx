"use client";

import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils/helpers";
import type { HrPolicyDocument } from "@/modules/hrms/policies/types";

type Props = {
  policyDocuments: HrPolicyDocument[];
};

// Read-only for every employee — HR manages upload/archive/delete from the
// separate admin-only HR Policy Documents screen (/hrms/policies). Opens
// fileUrl in a new tab (same pattern HrPoliciesPage's own title link uses)
// rather than an embedded <iframe> — a PDF's native in-browser viewer
// (toolbar, thumbnail sidebar) doesn't consistently fit inside a custom
// modal across browsers, so this avoids that instead of fighting it.
export function MyPoliciesList({ policyDocuments }: Props) {
  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <FileText size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Company Policies</p>
          <p className="text-xs text-muted-foreground">Leave, attendance, and other HR policy documents</p>
        </div>
      </div>

      {policyDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="No policies published yet"
          description="HR hasn't added any policy documents here yet."
        />
      ) : (
        <div className="space-y-2">
          {policyDocuments.map((d) => (
            <a
              key={d.id}
              href={d.fileUrl} target="_blank" rel="noreferrer"
              className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                <p className="text-xs text-muted-foreground">Updated {formatDate(d.updatedAt)}</p>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold text-primary">View</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
