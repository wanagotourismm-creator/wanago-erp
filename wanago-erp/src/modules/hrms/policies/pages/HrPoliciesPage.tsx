"use client";

import { useEffect, useState } from "react";
import { Upload, FileText, Trash2, Archive, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatDate } from "@/lib/utils/helpers";
import {
  fetchHrPolicyDocuments, uploadHrPolicyDocument, archiveHrPolicyDocument, deleteHrPolicyDocument,
} from "@/modules/hrms/policies/services/hr-policy.service";
import type { HrPolicyDocument } from "@/modules/hrms/policies/types";

function StatusPill({ doc }: { doc: HrPolicyDocument }) {
  if (doc.extractionError) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"><AlertTriangle size={10} /> Failed</span>;
  }
  if (!doc.extractedText) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"><Loader2 size={10} className="animate-spin" /> Extracting…</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400"><CheckCircle2 size={10} /> Ready</span>;
}

export function HrPoliciesPage() {
  const [docs, setDocs] = useState<HrPolicyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetchHrPolicyDocuments().then(setDocs).finally(() => setLoading(false));
  }
  useEffect(load, []);

  // Extraction runs async server-side — poll while any document is still
  // "Extracting…" so the status pill updates without a manual refresh.
  useEffect(() => {
    const stillExtracting = docs.some(d => !d.extractedText && !d.extractionError);
    if (!stillExtracting) return;
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [docs]);

  async function handleUpload() {
    if (!file || !title.trim()) {
      setError("Add a title and choose a PDF file.");
      return;
    }
    setUploading(true);
    setError(null);
    const result = await uploadHrPolicyDocument(title.trim(), file);
    if (result.error) setError(result.error);
    else { setTitle(""); setFile(null); load(); }
    setUploading(false);
  }

  async function handleArchive(d: HrPolicyDocument) {
    await archiveHrPolicyDocument(d.id, d.docStatus === "active" ? "archived" : "active");
    load();
  }

  async function handleDelete(d: HrPolicyDocument) {
    if (!confirm(`Delete "${d.title}"? This can't be undone.`)) return;
    await deleteHrPolicyDocument(d.id);
    load();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="HR Policy Documents"
        description="Upload real policy PDFs so the Ask HR assistant answers from your actual documents, not hardcoded facts"
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-foreground">Add a Policy Document</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Leave Policy 2026"
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:border-primary/40">
            <FileText size={14} />
            {file ? file.name : "Choose PDF"}
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
      </div>

      {loading ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Loading...</p>
      ) : docs.length === 0 ? (
        <EmptyState icon={<FileText size={22} />} title="No policy documents yet" description="Upload a PDF above — the assistant only uses documents you add here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Title", "Status", "Uploaded", "Visibility", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {docs.map((d) => (
                  <tr key={d.id} className={cn(d.docStatus === "archived" && "opacity-50")}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <a href={d.fileUrl} target="_blank" rel="noreferrer" className="hover:underline hover:text-primary transition-colors">{d.title}</a>
                    </td>
                    <td className="px-4 py-3"><StatusPill doc={d} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.docStatus === "archived" ? "Archived" : "Active"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {d.extractionError && (
                          <button title={d.extractionError} className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive"><AlertTriangle size={13} /></button>
                        )}
                        <button onClick={load} title="Refresh status" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"><RefreshCw size={13} /></button>
                        <button onClick={() => handleArchive(d)} title={d.docStatus === "active" ? "Archive" : "Reactivate"} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"><Archive size={13} /></button>
                        <button onClick={() => handleDelete(d)} title="Delete" className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
