"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X, Loader2, MapPin, Image as ImageIcon, CalendarDays, ListChecks, FileText, Phone, Plus, Trash2, ArrowUp, ArrowDown,
} from "lucide-react";
import { itineraryBrochureSchema, type ItineraryBrochureSchema } from "@/modules/itinerary-brochures/schemas";
import { DEFAULT_TERMS_AND_CONDITIONS, DEFAULT_INCLUSIONS, DEFAULT_EXCLUSIONS } from "@/modules/itinerary-brochures/constants";
import { fetchBrochureImageLibrary } from "@/modules/itinerary-brochures/services/itinerary-brochure.service";
import { StringListEditor } from "@/modules/itinerary-brochures/components/StringListEditor";
import { ImageUploadField } from "@/modules/itinerary-brochures/components/ImageUploadField";
import { cn, joinAddressCity } from "@/lib/utils/helpers";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { ItineraryBrochure } from "@/modules/itinerary-brochures/types";

type Props = {
  open:      boolean;
  brochure?: ItineraryBrochure | null;
  onClose:   () => void;
  onSubmit:  (data: ItineraryBrochureSchema) => Promise<void>;
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

const DEFAULT_VALUES: ItineraryBrochureSchema = {
  destination:   "",
  route:         "",
  tagline:       "",
  durationDays:   1,
  durationNights: 0,
  coverImageUrl: "",
  days:          [],
  inclusions:    DEFAULT_INCLUSIONS,
  exclusions:    DEFAULT_EXCLUSIONS,
  termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS,
  contactPhones:   [],
  officeAddresses: [],
  customerName:  "",
  packagePrice:  undefined,
  brochureStatus: "draft",
};

export function ItineraryBrochureForm({ open, brochure, onClose, onSubmit }: Props) {
  const [imageLibrary, setImageLibrary] = useState<string[]>([]);

  const {
    register, handleSubmit, reset, control, getValues, setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItineraryBrochureSchema>({
    resolver: zodResolver(itineraryBrochureSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: "days" });

  // Pulls real office phone/address data instead of the user retyping it
  // per-brochure — appends only offices not already present, so it's safe
  // to click more than once (e.g. after adding a new office).
  async function handlePrefillFromOffices() {
    const offices = await fetchOffices().catch(() => []);
    const currentPhones = getValues("contactPhones");
    const currentAddresses = getValues("officeAddresses");
    const newPhones = offices.map(o => o.phone).filter((p): p is string => !!p && !currentPhones.includes(p));
    const newAddresses = offices
      .map(o => joinAddressCity(o.address, o.city))
      .filter(a => a && !currentAddresses.includes(a));
    setValue("contactPhones", [...currentPhones, ...newPhones]);
    setValue("officeAddresses", [...currentAddresses, ...newAddresses]);
  }

  useEffect(() => {
    if (open) fetchBrochureImageLibrary().then(setImageLibrary).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (brochure) {
      reset({
        ...brochure,
        route:        brochure.route ?? "",
        tagline:      brochure.tagline ?? "",
        customerName: brochure.customerName ?? "",
        packagePrice: brochure.packagePrice ?? undefined,
        days: brochure.days.map((d) => ({ ...d, imageUrl: d.imageUrl ?? "" })),
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [open, brochure, reset]);

  function handleAddDay() {
    append({ dayNumber: fields.length + 1, title: "", bulletPoints: [], imageUrl: "" });
  }

  // dayNumber tracks position, not user input — recomputed at submit so
  // reordering/removing never leaves gaps or duplicates.
  function handleFormSubmit(data: ItineraryBrochureSchema) {
    return onSubmit({
      ...data,
      days: data.days.map((d, i) => ({ ...d, dayNumber: i + 1 })),
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-3xl max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <MapPin size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {brochure ? "Edit Itinerary Brochure" : "New Itinerary Brochure"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {brochure ? `Editing ${brochure.refNumber}` : "Build a branded day-by-day trip PDF"}
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

          {/* ── Trip Basics ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Basics</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Destination" required error={errors.destination?.message}>
                <input className={inputClass} placeholder="e.g. Thailand" {...register("destination")} />
              </Field>
              <Field label="Route / Subtitle" error={errors.route?.message}>
                <input className={inputClass} placeholder="e.g. Phuket - Krabi" {...register("route")} />
              </Field>
              <div className="col-span-2">
                <Field label="Tagline" error={errors.tagline?.message}>
                  <input className={inputClass} placeholder="e.g. where every sunset feels like a love story written in gold." {...register("tagline")} />
                </Field>
              </div>
              <Field label="Duration (days)" required error={errors.durationDays?.message}>
                <input className={inputClass} type="number" min={1} {...register("durationDays")} />
              </Field>
              <Field label="Duration (nights)" error={errors.durationNights?.message}>
                <input className={inputClass} type="number" min={0} {...register("durationNights")} />
              </Field>
              <Field label="Customer Name" error={errors.customerName?.message}>
                <input className={inputClass} placeholder="Optional — for personalization" {...register("customerName")} />
              </Field>
              <Field label="Package Price (INR)" error={errors.packagePrice?.message}>
                <input className={inputClass} type="number" min={0} placeholder="Optional" {...register("packagePrice")} />
              </Field>
              <Field label="Status" error={errors.brochureStatus?.message}>
                <select className={inputClass} {...register("brochureStatus")}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── Cover Image ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Cover Image</p>
            </div>
            <Controller
              control={control}
              name="coverImageUrl"
              render={({ field }) => (
                <ImageUploadField value={field.value} onChange={field.onChange} library={imageLibrary} />
              )}
            />
            {errors.coverImageUrl && <p className="mt-1.5 text-xs text-destructive font-medium">{errors.coverImageUrl.message}</p>}
          </div>

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
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => index > 0 && move(index, index - 1)}
                          disabled={index === 0}
                          title="Move up"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => index < fields.length - 1 && move(index, index + 1)}
                          disabled={index === fields.length - 1}
                          title="Move down"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          title="Remove day"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <Field label="Day Title" required error={errors.days?.[index]?.title?.message}>
                      <input className={inputClass} placeholder="e.g. Coral Island Tour" {...register(`days.${index}.title`)} />
                    </Field>
                    <Field label="Activities / Inclusions">
                      <Controller
                        control={control}
                        name={`days.${index}.bulletPoints`}
                        render={({ field: bulletField }) => (
                          <StringListEditor
                            values={bulletField.value ?? []}
                            onChange={bulletField.onChange}
                            placeholder="e.g. Breakfast at hotel"
                            addLabel="Add bullet point"
                          />
                        )}
                      />
                    </Field>
                    <Field label="Day Image">
                      <Controller
                        control={control}
                        name={`days.${index}.imageUrl`}
                        render={({ field: imgField }) => (
                          <ImageUploadField value={imgField.value ?? ""} onChange={imgField.onChange} library={imageLibrary} />
                        )}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* ── Inclusions & Exclusions ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ListChecks size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Inclusions &amp; Exclusions</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-foreground">Inclusions</p>
                <Controller
                  control={control}
                  name="inclusions"
                  render={({ field }) => (
                    <StringListEditor values={field.value} onChange={field.onChange} placeholder="e.g. 02 Nights accommodation" />
                  )}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-foreground">Exclusions</p>
                <Controller
                  control={control}
                  name="exclusions"
                  render={({ field }) => (
                    <StringListEditor values={field.value} onChange={field.onChange} placeholder="e.g. Travel insurance" />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── Terms & Conditions ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Terms &amp; Conditions</p>
            </div>
            <Field label="Terms & Conditions" required error={errors.termsAndConditions?.message}>
              <textarea rows={10} className={cn(inputClass, "font-mono text-xs leading-relaxed")} {...register("termsAndConditions")} />
            </Field>
          </div>

          <div className="border-t border-border" />

          {/* ── Contact & Offices ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Contact &amp; Office Info</p>
              </div>
              <button
                type="button"
                onClick={handlePrefillFromOffices}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                Prefill from Offices
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-foreground">Contact Phones</p>
                <Controller
                  control={control}
                  name="contactPhones"
                  render={({ field }) => (
                    <StringListEditor values={field.value} onChange={field.onChange} placeholder="e.g. +91 9946 900 867" addLabel="Add phone" />
                  )}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-foreground">Office Addresses</p>
                <Controller
                  control={control}
                  name="officeAddresses"
                  render={({ field }) => (
                    <StringListEditor values={field.value} onChange={field.onChange} placeholder="e.g. Head Office, Bengaluru" addLabel="Add address" />
                  )}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {brochure ? "Changes will be saved immediately" : "Brochure will be added to your list"}
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
              {brochure ? "Save Changes" : "Create Brochure"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
