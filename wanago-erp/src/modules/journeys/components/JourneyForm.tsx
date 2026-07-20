"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { fetchSegments } from "@/modules/journeys/services/segment.service";
import type { Journey, JourneyFormData, JourneyTrigger, JourneyStep, Segment } from "@/modules/journeys/types";

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const EMPTY_FORM: JourneyFormData = {
  name: "", isActive: true,
  trigger: { type: "quote_sent" },
  steps: [],
  campaignId: null,
};

function defaultStepFor(type: JourneyStep["type"]): JourneyStep {
  switch (type) {
    case "wait": return { type: "wait", days: 1 };
    case "send_whatsapp": return { type: "send_whatsapp", purpose: "", fallbackBodyTemplate: "Hi {{name}}, ..." };
    case "send_email": return { type: "send_email", subjectTemplate: "", bodyTemplate: "Hi {{name}}, ..." };
    case "notify_agent": return { type: "notify_agent", messageTemplate: "Follow up with {{name}}" };
    case "add_to_segment": return { type: "add_to_segment", segmentId: "" };
  }
}

function StepEditor({
  step, onChange, onRemove, segments,
}: {
  step: JourneyStep;
  onChange: (step: JourneyStep) => void;
  onRemove: () => void;
  segments: Segment[];
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-background p-3">
      <GripVertical size={14} className="mt-2.5 flex-shrink-0 text-muted-foreground/50" />
      <div className="flex-1 space-y-2">
        <select
          className={inputClass}
          value={step.type}
          onChange={(e) => onChange(defaultStepFor(e.target.value as JourneyStep["type"]))}
        >
          <option value="wait">Wait</option>
          <option value="send_whatsapp">Send WhatsApp</option>
          <option value="send_email">Send Email</option>
          <option value="notify_agent">Notify Agent (task)</option>
          <option value="add_to_segment">Add to Segment</option>
        </select>

        {step.type === "wait" && (
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} className={inputClass}
              value={step.days}
              onChange={(e) => onChange({ ...step, days: Number(e.target.value) })}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">day(s)</span>
          </div>
        )}
        {step.type === "send_whatsapp" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              className={inputClass} placeholder="WhatsApp template purpose (e.g. drip_followup_1)"
              value={step.purpose} onChange={(e) => onChange({ ...step, purpose: e.target.value })}
            />
            <input
              className={inputClass} placeholder="Fallback text — use {{name}}"
              value={step.fallbackBodyTemplate} onChange={(e) => onChange({ ...step, fallbackBodyTemplate: e.target.value })}
            />
          </div>
        )}
        {step.type === "send_email" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              className={inputClass} placeholder="Subject — use {{name}}"
              value={step.subjectTemplate} onChange={(e) => onChange({ ...step, subjectTemplate: e.target.value })}
            />
            <input
              className={inputClass} placeholder="Body — use {{name}}"
              value={step.bodyTemplate} onChange={(e) => onChange({ ...step, bodyTemplate: e.target.value })}
            />
          </div>
        )}
        {step.type === "notify_agent" && (
          <input
            className={inputClass} placeholder="Task message for the agent — use {{name}}"
            value={step.messageTemplate} onChange={(e) => onChange({ ...step, messageTemplate: e.target.value })}
          />
        )}
        {step.type === "add_to_segment" && (
          <select
            className={inputClass}
            value={step.segmentId}
            onChange={(e) => onChange({ ...step, segmentId: e.target.value })}
          >
            <option value="">Select a segment</option>
            {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>
      <button onClick={onRemove} className="mt-1.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export function JourneyForm({
  journey, saving, onSave, onCancel,
}: {
  journey: Journey | null;
  saving: boolean;
  onSave: (data: JourneyFormData) => Promise<{ error: string | null }>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<JourneyFormData>(
    journey ? { name: journey.name, isActive: journey.isActive, trigger: journey.trigger, steps: journey.steps, campaignId: journey.campaignId } : EMPTY_FORM
  );
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);

  useEffect(() => { fetchSegments().then(setSegments).catch(() => {}); }, []);

  function setTrigger(trigger: JourneyTrigger) {
    setForm((prev) => ({ ...prev, trigger }));
  }

  function updateStep(index: number, step: JourneyStep) {
    setForm((prev) => ({ ...prev, steps: prev.steps.map((s, i) => i === index ? step : s) }));
  }

  function removeStep(index: number) {
    setForm((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  }

  function addStep() {
    setForm((prev) => ({ ...prev, steps: [...prev.steps, defaultStepFor("wait")] }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.steps.length === 0) { setError("Add at least one step."); return; }
    if (form.trigger.type === "quote_unaccepted" && (!form.trigger.afterDays || form.trigger.afterDays < 1)) {
      setError("Set how many days after sending before this triggers.");
      return;
    }
    setError(null);
    const result = await onSave(form);
    if (result.error) setError(result.error);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">{journey ? "Edit Journey" : "New Journey"}</p>
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Quote follow-up" />
        </Field>
        <Field label="Trigger">
          <select
            className={inputClass}
            value={form.trigger.type}
            onChange={(e) => {
              const type = e.target.value as JourneyTrigger["type"];
              setTrigger(type === "quote_unaccepted" ? { type, afterDays: 3 } : { type } as JourneyTrigger);
            }}
          >
            <option value="quote_sent">Quote sent</option>
            <option value="quote_unaccepted">Quote unaccepted after N days</option>
            <option value="trip_completed">Trip completed</option>
          </select>
        </Field>
        {form.trigger.type === "quote_unaccepted" && (
          <Field label="Days after sending">
            <input
              type="number" min={1} className={inputClass}
              value={form.trigger.afterDays}
              onChange={(e) => setTrigger({ type: "quote_unaccepted", afterDays: Number(e.target.value) })}
            />
          </Field>
        )}
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" className="h-4 w-4 rounded border-input" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Steps (run once/day, at most — actions never fire faster than the next daily engine pass)
        </p>
        {form.steps.map((step, i) => (
          <StepEditor key={i} step={step} segments={segments} onChange={(s) => updateStep(i, s)} onRemove={() => removeStep(i)} />
        ))}
        <button onClick={addStep} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
          <Plus size={13} /> Add Step
        </button>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <X size={14} /> Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {journey ? "Save Changes" : "Create"}
        </button>
      </div>
    </div>
  );
}
