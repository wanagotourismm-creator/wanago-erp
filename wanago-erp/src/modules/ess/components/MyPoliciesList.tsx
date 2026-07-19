"use client";

import { useState } from "react";
import { FileText, X, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils/helpers";
import type { HrPolicyDocument } from "@/modules/hrms/policies/types";

type Props = {
  policyDocuments: HrPolicyDocument[];
};

// #toolbar=0&navpanes=0 suppresses Chrome/Edge/Firefox's built-in PDF
// viewer chrome (toolbar + the thumbnail sidebar that broke the layout in
// the first version of this modal) — without it, that native UI renders at
// its own width/height inside the iframe regardless of the container.
function embedUrl(fileUrl: string): string {
  return `${fileUrl}#toolbar=0&navpanes=0`;
}

// Read-only for every employee — HR manages upload/archive/delete from the
// separate admin-only HR Policy Documents screen (/hrms/policies). The
// modal is a SIBLING of the card below, not nested inside it — .fluid-card
// applies a translate transform on :hover, and any transformed ancestor
// becomes the containing block for a `position: fixed` descendant, which
// broke this modal's centering and caused it to jitter as the hover state
// toggled while the cursor moved over it.
export function MyPoliciesList({ policyDocuments }: Props) {
  const [viewing, setViewing] = useState<HrPolicyDocument | null>(null);

  return (
    <>
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
              <button
                key={d.id}
                onClick={() => setViewing(d)}
                className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground">Updated {formatDate(d.updatedAt)}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-semibold text-primary">View</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewing(null)} />
          <div className="modal-enter relative flex h-[85dvh] w-full max-w-3xl min-w-0 flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
              <p className="truncate text-sm font-semibold text-foreground">{viewing.title}</p>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <a
                  href={viewing.fileUrl} target="_blank" rel="noreferrer"
                  title="Open in a new tab"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => setViewing(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <iframe
                src={embedUrl(viewing.fileUrl)}
                title={viewing.title}
                className="h-full w-full border-0 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
