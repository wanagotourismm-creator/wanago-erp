"use client";

import { X, FileText } from "lucide-react";
import { FormRenderer, type FormAnswers } from "@/modules/forms/components/FormRenderer";
import { useFormResponses } from "@/modules/forms/hooks/useFormResponses";
import { uploadFile } from "@/lib/storage/upload";
import type { Form } from "@/modules/forms/types";

type Props = {
  form:    Form | null;
  onClose: () => void;
};

// Internal forms only — the submitter is an already-authenticated staff
// member, so file-field uploads go through the same authenticated
// /api/storage/upload bridge every other module already uses.
export function FormFillModal({ form, onClose }: Props) {
  const { submit } = useFormResponses(form);

  if (!form) return null;

  async function handleUploadFile(file: File): Promise<string> {
    return uploadFile(`forms/${form!.id}/${Date.now()}-${file.name}`, file);
  }

  async function handleSubmit(answers: FormAnswers) {
    const { error } = await submit(answers);
    if (!error) setTimeout(onClose, 1200); // brief pause so the "Thanks" state is visible before closing
    return { error };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileText size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{form.title}</h2>
              {form.description && <p className="truncate text-xs text-muted-foreground">{form.description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <FormRenderer fields={form.fields} onSubmit={handleSubmit} onUploadFile={handleUploadFile} />
        </div>
      </div>
    </div>
  );
}
