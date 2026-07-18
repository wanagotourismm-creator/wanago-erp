"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, PhoneCall, Paperclip, StickyNote, Sparkles } from "lucide-react";
import { callLogSchema, type CallLogSchema } from "@/modules/call-logs/schemas";
import { PhoneLink } from "@/components/shared/PhoneLink";
import { cn } from "@/lib/utils/helpers";
import { suggestNextSteps } from "@/modules/call-logs/services/call-log-ai.service";
import type { CallMethod, CallDirection } from "@/modules/call-logs/types";

type Props = {
  open:        boolean;
  onClose:     () => void;
  onSubmit:    (data: CallLogSchema, recordingFile: File | null) => Promise<void>;
  // Fixed context — this form always logs a call against a specific,
  // already-open Lead/Customer, so these aren't user-editable fields.
  contactName: string;
  phone:       string;
  leadId?:     string | null;
  customerId?: string | null;
  // Pre-fill when opened right after tapping the phone/WhatsApp link, so
  // staff never have to retype the number or re-pick the obvious method.
  prefillMethod?:    CallMethod;
  prefillDirection?: CallDirection;
};

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

export function CallLogForm({
  open, onClose, onSubmit, contactName, phone, leadId, customerId,
  prefillMethod, prefillDirection,
}: Props) {
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm<CallLogSchema>({
    resolver: zodResolver(callLogSchema),
    defaultValues: {
      contactName, phone, leadId, customerId,
      callMethod: prefillMethod ?? "phone",
      direction:  prefillDirection ?? "outbound",
      outcome:    "connected",
      followUpNeeded: false,
    },
  });

  useEffect(() => {
    if (open) {
      setRecordingFile(null);
      setAiSuggestion(null);
      setAiError(null);
      reset({
        contactName, phone, leadId, customerId,
        callMethod: prefillMethod ?? "phone",
        direction:  prefillDirection ?? "outbound",
        outcome:    "connected",
        followUpNeeded: false,
      });
    }
  }, [open, contactName, phone, leadId, customerId, prefillMethod, prefillDirection, reset]);

  if (!open) return null;

  const followUpNeeded = watch("followUpNeeded");
  const notes = watch("notes");
  const outcome = watch("outcome");

  async function handleSuggestNextSteps() {
    if (!notes?.trim()) {
      setAiError("Add some call notes first.");
      return;
    }
    setAiBusy(true);
    setAiError(null);
    setAiSuggestion(null);
    const result = await suggestNextSteps({ notes, outcome, contactName });
    if ("error" in result) setAiError(result.error);
    else setAiSuggestion(result.text);
    setAiBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <PhoneCall size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Log a Call</h2>
              <p className="text-xs text-muted-foreground">
                {contactName} · <PhoneLink phone={phone} iconSize={11} className="text-muted-foreground" />
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Call Method" required>
              <select className={inputClass} {...register("callMethod")}>
                <option value="phone">Phone Call</option>
                <option value="whatsapp">WhatsApp Call</option>
              </select>
            </Field>
            <Field label="Direction" required>
              <select className={inputClass} {...register("direction")}>
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </Field>
            <Field label="Outcome" required>
              <select className={inputClass} {...register("outcome")}>
                <option value="connected">Connected</option>
                <option value="no_answer">No Answer</option>
                <option value="busy">Busy</option>
                <option value="wrong_number">Wrong Number</option>
              </select>
            </Field>
            <Field label="Duration (minutes)" error={errors.durationMinutes?.message}>
              <input className={inputClass} type="number" min={0} placeholder="5" {...register("durationMinutes")} />
            </Field>
          </div>

          <Field label="Notes / Summary" error={errors.notes?.message}>
            <textarea
              rows={3}
              placeholder="What was discussed on this call?"
              {...register("notes")}
              className={cn(inputClass, "resize-none")}
            />
          </Field>

          <div>
            <button
              type="button"
              onClick={handleSuggestNextSteps}
              disabled={aiBusy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60 transition-colors"
            >
              {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Suggest Next Steps
            </button>
            {aiError && <p className="mt-2 text-xs text-destructive font-medium">{aiError}</p>}
            {aiSuggestion && (
              <div className="mt-2 whitespace-pre-wrap rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground">
                {aiSuggestion}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-input" {...register("followUpNeeded")} />
              Follow-up needed
            </label>
            {followUpNeeded && (
              <Field label="Follow-up Date">
                <input className={inputClass} type="date" {...register("followUpDate")} />
              </Field>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Recording */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Paperclip size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Recording</p>
            </div>
            <Field label="Attach recording (optional, if you recorded this call on your phone)">
              <input
                type="file"
                accept="audio/mpeg,audio/mp4,audio/wav,audio/*"
                onChange={(e) => setRecordingFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
              />
            </Field>
            <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
              <StickyNote size={11} className="flex-shrink-0" />
              No auto-recording yet — attach a file only if you recorded this call yourself.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">Logged under your name automatically</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit((data) => onSubmit(data, recordingFile))}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Save Call Log
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
