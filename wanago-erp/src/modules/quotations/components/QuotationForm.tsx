"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, User, MapPin, Receipt, StickyNote, Plus, Trash2, Sparkles } from "lucide-react";
import { quotationSchema, type QuotationSchema } from "@/modules/quotations/schemas";
import { fetchCustomers } from "@/modules/customers/services/customer.service";
import { fetchPackages } from "@/modules/packages/services/package.service";
import { draftQuoteLineItems } from "@/modules/quotations/services/quotation-ai.service";
import { useAuthStore } from "@/store/auth.store";
import { cn, formatCurrency } from "@/lib/utils/helpers";
import type { Customer } from "@/modules/customers/types";
import type { Package } from "@/modules/packages/types";
import type { Quotation } from "@/modules/quotations/types";

type Props = {
  open:       boolean;
  quotation?: Quotation | null;
  // Pre-fills fields (e.g. customerId/customerName/customerPhone) when
  // opening a brand-new quotation from another module's "Create Quotation"
  // action — e.g. a Customer's detail view. Ignored when editing an
  // existing quotation.
  prefill?:   Partial<QuotationSchema>;
  onClose:    () => void;
  onSubmit:   (data: QuotationSchema) => Promise<void>;
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

const DEFAULT_VALUES: Partial<QuotationSchema> = {
  pax:        1,
  lineItems:  [{ description: "", amount: 0 }],
};

export function QuotationForm({ open, quotation, prefill, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages,  setPackages]  = useState<Package[]>([]);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const {
    register, handleSubmit, reset, watch, setValue, control,
    formState: { errors, isSubmitting },
  } = useForm<QuotationSchema>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  useEffect(() => {
    if (!open) return;
    fetchCustomers().then(setCustomers).catch(() => {});
    fetchPackages().then(setPackages).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open) {
      if (quotation) {
        reset({
          ...quotation,
          packageId:   quotation.packageId   ?? "",
          packageName: quotation.packageName ?? "",
          validUntil:  quotation.validUntil  ?? "",
          notes:       quotation.notes       ?? "",
        });
      } else {
        reset({
          ...DEFAULT_VALUES,
          officeId:   user?.officeId   ?? "main",
          officeName: user?.officeName ?? "Head Office",
          ...prefill,
        });
      }
    }
  }, [open, quotation, reset, user, prefill]);

  const selectedCustomerId = watch("customerId");
  const selectedPackageId  = watch("packageId");
  const watchedLineItems   = watch("lineItems");
  const watchedTaxRate     = watch("taxRate");
  const watchedPax         = watch("pax");

  function handleCustomerChange(id: string) {
    const c = customers.find(c => c.id === id);
    setValue("customerId", id);
    setValue("customerName", c?.fullName ?? "");
    setValue("customerPhone", c?.phone ?? "");
  }

  function handlePackageChange(id: string) {
    const p = packages.find(p => p.id === id);
    setValue("packageId", id);
    setValue("packageName", p?.title ?? "");
  }

  function handleAddItem() {
    append({ description: "", amount: 0 });
  }

  const destination = watch("destination");
  const packageName = watch("packageName");

  async function handleDraftWithAi() {
    if (!destination) {
      setAiError("Enter a destination first.");
      return;
    }
    setAiDrafting(true);
    setAiError(null);
    const result = await draftQuoteLineItems({ destination, pax: Number(watchedPax) || 1, packageName: packageName || undefined });
    if ("error" in result) {
      setAiError(result.error);
    } else {
      for (const item of result.draft.lineItems) append({ description: item.description, amount: 0 });
    }
    setAiDrafting(false);
  }

  function handleRemoveItem(index: number) {
    remove(index);
  }

  const totals = useMemo(() => {
    const paxCount   = Number(watchedPax) || 1;
    const perPaxSum  = (watchedLineItems ?? []).reduce((sum, li) => sum + (Number(li?.amount) || 0), 0);
    const subtotal   = perPaxSum * paxCount;
    const rate       = Number(watchedTaxRate) || 0;
    const taxAmount  = rate ? subtotal * (rate / 100) : 0;
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }, [watchedLineItems, watchedTaxRate, watchedPax]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="modal-enter relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Receipt size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {quotation ? "Edit Quotation" : "New Quotation"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {quotation ? `Editing ${quotation.refNumber}` : "Fill in the details to create a new quotation"}
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

          {/* ── Customer ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Customer</p>
            </div>
            <Field label="Customer" required error={errors.customerId?.message}>
              <select
                className={inputClass}
                value={selectedCustomerId ?? ""}
                onChange={(e) => handleCustomerChange(e.target.value)}
              >
                <option value="">Select customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.fullName} — {c.phone}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Trip ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Details</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <Field label="Destination" required error={errors.destination?.message}>
                  <input className={inputClass} placeholder="e.g. Maldives, Bali, Europe..." {...register("destination")} />
                </Field>
              </div>
              <Field label="Package" error={errors.packageId?.message}>
                <select
                  className={inputClass}
                  value={selectedPackageId ?? ""}
                  onChange={(e) => handlePackageChange(e.target.value)}
                >
                  <option value="">No package</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.title} — {p.destination}</option>
                  ))}
                </select>
              </Field>
              <Field label="No. of Pax" required error={errors.pax?.message}>
                <input className={inputClass} type="number" min={1} placeholder="2" {...register("pax")} />
              </Field>
              <Field label="Valid Until" error={errors.validUntil?.message}>
                <input className={inputClass} type="date" {...register("validUntil")} />
              </Field>
              <Field label="Tax Rate (%)" error={errors.taxRate?.message}>
                <input className={inputClass} type="number" min={0} step="0.01" placeholder="e.g. 5" {...register("taxRate")} />
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Line items ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Line Items</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDraftWithAi}
                  disabled={aiDrafting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60 transition-colors"
                >
                  {aiDrafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Suggest Items
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
                >
                  <Plus size={13} /> Add Item
                </button>
              </div>
            </div>

            {aiError && <p className="mb-2 text-xs text-destructive font-medium">{aiError}</p>}
            <p className="mb-2 text-[11px] text-muted-foreground">
              &quot;Suggest Items&quot; adds typical line item descriptions for this destination — prices always default to ₹0 for you to fill in from real rates.
            </p>

            {errors.lineItems?.message && (
              <p className="mb-2 text-xs text-destructive font-medium">{errors.lineItems.message}</p>
            )}

            {fields.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                No line items yet — click &quot;Add Item&quot; to start building the quote
              </p>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Field label="Description" error={errors.lineItems?.[index]?.description?.message}>
                        <input
                          className={inputClass}
                          placeholder="e.g. Flight tickets, Hotel stay..."
                          {...register(`lineItems.${index}.description`)}
                        />
                      </Field>
                    </div>
                    <div className="w-32">
                      <Field label="Price per Pax (₹)" error={errors.lineItems?.[index]?.amount?.message}>
                        <input
                          className={inputClass}
                          type="number"
                          min={0}
                          placeholder="0"
                          {...register(`lineItems.${index}.amount`)}
                        />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      title="Remove item"
                      className="mt-6 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Totals preview */}
            <div className="mt-4 space-y-1 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Subtotal ({Number(watchedPax) || 1} pax × price)</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.taxAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tax</span>
                  <span>{formatCurrency(totals.taxAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
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
                placeholder="Any terms, conditions, or notes..."
                {...register("notes")}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {quotation ? "Changes will be saved immediately" : "Quotation will start as Draft"}
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
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {quotation ? "Save Changes" : "Create Quotation"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
