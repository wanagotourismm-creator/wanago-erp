"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, FileText, ListPlus, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, GitBranch } from "lucide-react";
import { formSchema, type FormSchema, type FormFieldSchema } from "@/modules/forms/schemas";
import { FIELD_TYPE_OPTIONS, CHOICE_FIELD_TYPES } from "@/modules/forms/components/FormBadges";
import { StringListEditor } from "@/modules/itinerary-brochures/components/StringListEditor";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Control } from "react-hook-form";
import type { Form, FieldConditionOperator } from "@/modules/forms/types";

type Props = {
  open:    boolean;
  form?:   Form | null;
  onClose: () => void;
  onSubmit: (data: FormSchema) => Promise<void>;
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

function newFieldId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

const OPERATOR_LABELS: Record<FieldConditionOperator, string> = {
  equals: "is", not_equals: "is not", contains: "contains",
};

// Per-question "Show this only if..." rule — only offers earlier questions
// as the trigger (later ones don't exist yet when this one would be shown,
// so allowing them would create a rule that can never fire).
function ConditionEditor({ control, index, earlierFields }: {
  control: Control<FormSchema>;
  index: number;
  earlierFields: FormFieldSchema[];
}) {
  if (earlierFields.length === 0) return null;

  return (
    <Controller
      control={control}
      name={`fields.${index}.condition`}
      render={({ field: condField }) => {
        const enabled = !!condField.value;
        const triggerField = earlierFields.find(f => f.id === condField.value?.fieldId);
        const triggerHasOptions = triggerField && CHOICE_FIELD_TYPES.includes(triggerField.type);

        return (
          <div className="rounded-lg border border-dashed border-border p-2.5 space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-input"
                checked={enabled}
                onChange={(e) => condField.onChange(e.target.checked
                  ? { fieldId: earlierFields[0].id, operator: "equals", value: "" }
                  : null)}
              />
              <GitBranch size={12} className="text-primary" /> Only show this question conditionally
            </label>

            {enabled && condField.value && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  className={cn(inputClass, "text-xs")}
                  value={condField.value.fieldId}
                  onChange={(e) => condField.onChange({ ...condField.value, fieldId: e.target.value })}
                >
                  {earlierFields.map((f, i) => <option key={f.id} value={f.id}>{f.label || `Question ${i + 1}`}</option>)}
                </select>
                <select
                  className={cn(inputClass, "text-xs")}
                  value={condField.value.operator}
                  onChange={(e) => condField.onChange({ ...condField.value, operator: e.target.value as FieldConditionOperator })}
                >
                  {(Object.entries(OPERATOR_LABELS) as [FieldConditionOperator, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {triggerHasOptions ? (
                  <select
                    className={cn(inputClass, "text-xs")}
                    value={condField.value.value}
                    onChange={(e) => condField.onChange({ ...condField.value, value: e.target.value })}
                  >
                    <option value="">Select value...</option>
                    {triggerField!.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    className={cn(inputClass, "text-xs")}
                    placeholder="Value"
                    value={condField.value.value}
                    onChange={(e) => condField.onChange({ ...condField.value, value: e.target.value })}
                  />
                )}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

const DEFAULT_VALUES: FormSchema = {
  title: "", description: "", fields: [], visibility: "internal", formStatus: "draft",
  officeId: "", officeName: "",
};

export function FormBuilder({ open, form, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();

  const {
    register, handleSubmit, reset, control,
    formState: { errors, isSubmitting },
  } = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: "fields" });
  // Live labels/types/options for the ConditionEditor's "earlier questions"
  // dropdown — useFieldArray's own `fields` only reflects add/remove/reorder,
  // not per-keystroke edits to a field's label, so a renamed question would
  // otherwise still show its old label in the trigger picker.
  const watchedFields = useWatch({ control, name: "fields" }) ?? [];

  useEffect(() => {
    if (!open) return;
    if (form) {
      reset({
        title: form.title,
        description: form.description ?? "",
        fields: form.fields.map(f => ({ ...f, placeholder: f.placeholder ?? "" })),
        visibility: form.visibility,
        formStatus: form.formStatus,
        officeId: form.officeId,
        officeName: form.officeName,
      });
    } else {
      reset({
        ...DEFAULT_VALUES,
        officeId:   user?.officeId   ?? "main",
        officeName: user?.officeName ?? "Head Office",
      });
    }
  }, [open, form, reset, user]);

  function handleAddField() {
    append({ id: newFieldId(), type: "short_text", label: "", placeholder: "", required: false, options: [], condition: null });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <FileText size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{form ? "Edit Form" : "New Form"}</h2>
              <p className="text-xs text-muted-foreground">{form ? `Editing ${form.refNumber}` : "Build a form for office use or public sharing"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">

          {/* Basics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <Field label="Form Title" required error={errors.title?.message}>
                <input className={inputClass} placeholder="e.g. Employee Feedback Survey" {...register("title")} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Description" error={errors.description?.message}>
                <textarea rows={2} className={cn(inputClass, "resize-none")} placeholder="Optional — shown at the top of the form" {...register("description")} />
              </Field>
            </div>
            <Field label="Visibility" error={errors.visibility?.message}>
              <select className={inputClass} {...register("visibility")}>
                <option value="internal">Internal (staff only)</option>
                <option value="public">Public (shareable link)</option>
              </select>
            </Field>
          </div>

          <div className="border-t border-border" />

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListPlus size={14} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Questions</p>
              </div>
              <button type="button" onClick={handleAddField} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
                <Plus size={13} /> Add Question
              </button>
            </div>

            {fields.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                No questions yet — click &quot;Add Question&quot; to start building the form
              </p>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const fieldErrors = errors.fields?.[index];
                  return (
                    <div key={field.id} className="rounded-xl border border-border p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <GripVertical size={13} />
                          <span className="text-xs font-semibold">Q{index + 1}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => index > 0 && move(index, index - 1)} disabled={index === 0} title="Move up"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" onClick={() => index < fields.length - 1 && move(index, index + 1)} disabled={index === fields.length - 1} title="Move down"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors">
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" onClick={() => remove(index)} title="Remove question"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <Field label="Question Text" required error={fieldErrors?.label?.message}>
                        <input className={inputClass} placeholder="e.g. How satisfied are you with...?" {...register(`fields.${index}.label`)} />
                      </Field>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Answer Type">
                          <select className={inputClass} {...register(`fields.${index}.type`)}>
                            {FIELD_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </Field>
                        <Field label="Placeholder">
                          <input className={inputClass} placeholder="Optional hint text" {...register(`fields.${index}.placeholder`)} />
                        </Field>
                      </div>

                      <Controller
                        control={control}
                        name={`fields.${index}.type`}
                        render={({ field: typeField }) => (
                          CHOICE_FIELD_TYPES.includes(typeField.value) ? (
                            <Field label="Options">
                              <Controller
                                control={control}
                                name={`fields.${index}.options`}
                                render={({ field: optField }) => (
                                  <StringListEditor
                                    values={optField.value ?? []}
                                    onChange={optField.onChange}
                                    placeholder="e.g. Excellent"
                                    addLabel="Add option"
                                  />
                                )}
                              />
                            </Field>
                          ) : <></>
                        )}
                      />

                      <ConditionEditor control={control} index={index} earlierFields={watchedFields.slice(0, index)} />

                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded border-input" {...register(`fields.${index}.required`)} />
                        Required question
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {form ? "Changes will be saved immediately" : "Form will be added as a draft"}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {form ? "Save Changes" : "Create Form"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
