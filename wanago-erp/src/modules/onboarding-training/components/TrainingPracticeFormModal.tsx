"use client";

import { useState } from "react";
import { X, Loader2, FlaskConical, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { TrainingPracticeForm } from "@/modules/onboarding-training/types";

type Props = {
  practiceForm: TrainingPracticeForm;
  language: "en" | "ml";
  onClose: () => void;
  onSubmit: (formData: Record<string, string>) => Promise<void>;
};

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/50 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

// A lookalike form rendered entirely by the training module itself — not
// the app's real form. Submitting logs a demo record in
// trainingPracticeSubmissions and never touches leads/customers/bookings/
// etc., so employees can practice hands-on with zero risk to real data.
export function TrainingPracticeFormModal({ practiceForm, language, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const title = language === "en" ? practiceForm.titleEn : (practiceForm.titleMl || practiceForm.titleEn);
  const submitLabel = language === "en" ? practiceForm.submitLabelEn : (practiceForm.submitLabelMl || practiceForm.submitLabelEn);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit(values);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[215] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-md rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">Practice — not saved to real data</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {language === "en" ? "Nice work!" : "നന്നായി ചെയ്തു!"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {language === "en"
                ? "That's exactly what you'd do in the real app. This practice entry wasn't saved to any real records."
                : "യഥാർത്ഥ ആപ്പിൽ നിങ്ങൾ ചെയ്യേണ്ടത് കൃത്യമായി ഇതാണ്. ഈ പരിശീലന എൻട്രി യഥാർത്ഥ റെക്കോർഡുകളിലേക്ക് സേവ് ചെയ്തിട്ടില്ല."}
            </p>
            <button onClick={onClose}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
              Continue
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-5">
              {practiceForm.fields.map((f) => {
                const label = language === "en" ? f.labelEn : (f.labelMl || f.labelEn);
                return (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
                    {f.type === "textarea" ? (
                      <textarea rows={3} className={cn(inputClass, "resize-none")} placeholder={f.placeholder}
                        value={values[f.key] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))} />
                    ) : (
                      <input className={inputClass} placeholder={f.placeholder}
                        value={values[f.key] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-5 py-3">
              <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
