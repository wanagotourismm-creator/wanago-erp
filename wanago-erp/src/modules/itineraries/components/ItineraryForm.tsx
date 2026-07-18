"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import type { Control, UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, MapPin, CalendarDays, StickyNote, Plus, Trash2, Sparkles } from "lucide-react";
import { itinerarySchema, type ItinerarySchema } from "@/modules/itineraries/schemas";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { TRIP_TYPES } from "@/lib/constants";
import { draftItinerary } from "@/modules/itineraries/services/itinerary-ai.service";
import { fetchPackages } from "@/modules/packages/services/package.service";
import { CREATE_NEW_PACKAGE, type Itinerary } from "@/modules/itineraries/types";
import type { Package } from "@/modules/packages/types";

type Props = {
  open:       boolean;
  itinerary?: Itinerary | null;
  onClose:    () => void;
  onSubmit:   (data: ItinerarySchema) => Promise<void>;
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

// Links this itinerary to a real Package record — replacing the old
// free-text "Package" field — and either adopts the chosen package's
// destination/duration/title into this itinerary, or (via "+ Create new
// package") seeds a brand-new Package from this itinerary's own details.
// itinerary.service.ts keeps the two records' shared fields in sync on
// every subsequent save from either side.
function PackageSelect({ control, setValue }: {
  control: Control<ItinerarySchema>;
  setValue: UseFormSetValue<ItinerarySchema>;
}) {
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    fetchPackages().then(setPackages).catch(() => {});
  }, []);

  return (
    <Controller
      control={control}
      name="packageId"
      render={({ field }) => (
        <select
          className={inputClass}
          value={field.value ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            field.onChange(value || null);
            if (value === CREATE_NEW_PACKAGE) {
              setValue("packageName", null);
              return;
            }
            const pkg = packages.find(p => p.id === value);
            if (pkg) {
              setValue("packageName", pkg.title);
              setValue("destination", pkg.destination);
              setValue("durationDays", pkg.durationDays || 1);
            } else {
              setValue("packageName", null);
            }
          }}
        >
          <option value="">No package linked</option>
          <option value={CREATE_NEW_PACKAGE}>+ Create new package from this itinerary</option>
          {packages.map(p => <option key={p.id} value={p.id}>{p.title} — {p.destination}</option>)}
        </select>
      )}
    />
  );
}

export function ItineraryForm({ open, itinerary, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const {
    register, handleSubmit, reset, control, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItinerarySchema>({
    resolver: zodResolver(itinerarySchema),
    defaultValues: {
      durationDays:    1,
      itineraryStatus: "draft",
      days:            [],
      inclusions:      [],
      exclusions:      [],
      packageId:       null,
      officeId:        user?.officeId   ?? "main",
      officeName:      user?.officeName ?? "Head Office",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "days" });

  useEffect(() => {
    if (open) {
      if (itinerary) {
        reset({
          ...itinerary,
          tripType:    itinerary.tripType    ?? "",
          packageId:   itinerary.packageId   ?? null,
          packageName: itinerary.packageName ?? "",
          tagline:     itinerary.tagline      ?? "",
          inclusions:  itinerary.inclusions   ?? [],
          exclusions:  itinerary.exclusions   ?? [],
          notes:       itinerary.notes       ?? "",
        });
      } else {
        reset({
          durationDays:    1,
          itineraryStatus: "draft",
          days:            [],
          inclusions:      [],
          exclusions:      [],
          packageId:       null,
          officeId:        user?.officeId   ?? "main",
          officeName:      user?.officeName ?? "Head Office",
        });
      }
      setAiError(null);
    }
  }, [open, itinerary, reset, user]);

  const destination = watch("destination");
  const durationDays = watch("durationDays");
  const tripType = watch("tripType");

  async function handleDraftWithAi() {
    if (!destination || !durationDays) {
      setAiError("Enter a destination and duration first.");
      return;
    }
    setAiDrafting(true);
    setAiError(null);

    const result = await draftItinerary({ destination, durationDays: Number(durationDays), tripType: tripType || undefined });

    if ("error" in result) {
      setAiError(result.error);
    } else {
      setValue("title", result.draft.title);
      setValue("tagline", result.draft.tagline);
      setValue("inclusions", result.draft.inclusions);
      setValue("exclusions", result.draft.exclusions);
      replace(result.draft.days);
    }
    setAiDrafting(false);
  }

  function handleAddDay() {
    append({ dayNumber: fields.length + 1, title: "", description: "" });
  }

  function handleRemoveDay(index: number) {
    remove(index);
  }

  // dayNumber always tracks the row's position, regardless of add/remove
  // order — the user never edits it directly, so it's recomputed at submit
  // time rather than kept in sync via a hidden, registered input.
  function handleFormSubmit(data: ItinerarySchema) {
    return onSubmit({
      ...data,
      days: data.days.map((d, i) => ({ ...d, dayNumber: i + 1 })),
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="modal-enter relative w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <MapPin size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {itinerary ? "Edit Itinerary" : "Add New Itinerary"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {itinerary ? `Editing ${itinerary.refNumber}` : "Plan out the trip day by day"}
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

          {/* ── Trip Details ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Details</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <Field label="Title" required error={errors.title?.message}>
                  <input className={inputClass} placeholder="e.g. Bali Honeymoon Escape" {...register("title")} />
                </Field>
              </div>
              <Field label="Destination" required error={errors.destination?.message}>
                <input className={inputClass} placeholder="e.g. Bali, Indonesia" {...register("destination")} />
              </Field>
              <Field label="Duration (days)" required error={errors.durationDays?.message}>
                <input className={inputClass} type="number" min={1} placeholder="5" {...register("durationDays")} />
              </Field>
              <Field label="Trip Type" error={errors.tripType?.message}>
                <select className={inputClass} {...register("tripType")}>
                  <option value="">Select type</option>
                  {Object.entries(TRIP_TYPES).map(([k, v]) => (
                    <option key={k} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Package" error={errors.packageId?.message}>
                <PackageSelect control={control} setValue={setValue} />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Linking a package keeps destination, duration, and title in sync both ways.
                </p>
              </Field>
              <Field label="Status" error={errors.itineraryStatus?.message}>
                <select className={inputClass} {...register("itineraryStatus")}>
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Tagline" error={errors.tagline?.message}>
                  <input className={inputClass} placeholder="e.g. Sun, sea, and serenity in Bali" {...register("tagline")} />
                </Field>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleDraftWithAi}
                disabled={aiDrafting}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60 transition-colors"
              >
                {aiDrafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Draft with AI
              </button>
              <p className="text-[11px] text-muted-foreground">
                Fills title, tagline, inclusions/exclusions, and the day plan below from the destination/duration/trip type above — review and edit before saving.
              </p>
            </div>
            {aiError && <p className="mt-2 text-xs text-destructive font-medium">{aiError}</p>}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Inclusions / Exclusions ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Inclusions" error={errors.inclusions?.message as string | undefined}>
              <Controller
                control={control}
                name="inclusions"
                render={({ field }) => (
                  <textarea
                    rows={4}
                    placeholder={"One per line, e.g.\nAirport transfers\nDaily breakfast"}
                    className={cn(inputClass, "resize-none")}
                    value={field.value.join("\n")}
                    onChange={(e) => field.onChange(e.target.value.split("\n"))}
                    onBlur={() => field.onChange(field.value.map((v) => v.trim()).filter(Boolean))}
                  />
                )}
              />
            </Field>
            <Field label="Exclusions" error={errors.exclusions?.message as string | undefined}>
              <Controller
                control={control}
                name="exclusions"
                render={({ field }) => (
                  <textarea
                    rows={4}
                    placeholder={"One per line, e.g.\nInternational flights\nTravel insurance"}
                    className={cn(inputClass, "resize-none")}
                    value={field.value.join("\n")}
                    onChange={(e) => field.onChange(e.target.value.split("\n"))}
                    onBlur={() => field.onChange(field.value.map((v) => v.trim()).filter(Boolean))}
                  />
                )}
              />
            </Field>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Day-by-day plan ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Day-by-Day Plan</p>
              </div>
              <button
                type="button"
                onClick={handleAddDay}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <Plus size={13} /> Add Day
              </button>
            </div>

            {fields.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                No days added yet — click &quot;Add Day&quot; to start building the plan
              </p>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-xl border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex-shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        Day {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDay(index)}
                        title="Remove day"
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <Field label="Title" error={errors.days?.[index]?.title?.message}>
                      <input className={inputClass} placeholder="e.g. Arrival & Beach Relaxation" {...register(`days.${index}.title`)} />
                    </Field>
                    <Field label="Description" error={errors.days?.[index]?.description?.message}>
                      <textarea
                        rows={2}
                        placeholder="Describe the day's plan..."
                        {...register(`days.${index}.description`)}
                        className={cn(inputClass, "resize-none")}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Notes ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <StickyNote size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
            </div>
            <Field label="Additional Notes" error={errors.notes?.message}>
              <textarea
                rows={3}
                placeholder="Any special requirements, preferences, or notes..."
                {...register("notes")}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {itinerary ? "Changes will be saved immediately" : "Itinerary will be added to your list"}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {itinerary ? "Save Changes" : "Add Itinerary"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
