"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Building2, MapPin, CreditCard } from "lucide-react";
import { supplierSchema, type SupplierSchema } from "@/modules/suppliers/schemas";
import { useAuthStore } from "@/store/auth.store";
import type { Supplier } from "@/modules/suppliers/types";

type Props = { open: boolean; supplier?: Supplier | null; onClose: () => void; onSubmit: (d: SupplierSchema) => Promise<void>; };
const inp = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

const CATEGORIES = ["hotel","airline","transport","cruise","visa","insurance","activity","restaurant","other"];

export function SupplierForm({ open, supplier, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SupplierSchema>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { category:"hotel", country:"India", rating:3, tags:[], officeId: user?.officeId ?? "main", officeName: user?.officeName ?? "Head Office" },
  });

  useEffect(() => {
    if (!open) return;
    if (supplier) reset({ ...supplier, contactName: supplier.contactName ?? "", email: supplier.email ?? "", website: supplier.website ?? "", city: supplier.city ?? "", address: supplier.address ?? "", gstNumber: supplier.gstNumber ?? "", panNumber: supplier.panNumber ?? "", bankName: supplier.bankName ?? "", accountNumber: supplier.accountNumber ?? "", ifscCode: supplier.ifscCode ?? "", notes: supplier.notes ?? "" });
    else reset({ category:"hotel", country:"India", rating:3, tags:[], officeId: user?.officeId ?? "main", officeName: user?.officeName ?? "Head Office" });
  }, [open, supplier, reset, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Building2 size={16} className="text-primary" /></div>
            <div><h2 className="text-base font-semibold text-foreground">{supplier ? "Edit Supplier" : "Add Supplier"}</h2><p className="text-xs text-muted-foreground">{supplier ? `Editing ${supplier.refNumber}` : "Fill in supplier details"}</p></div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 transition-colors"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          <div>
            <div className="flex items-center gap-2 mb-4"><Building2 size={13} className="text-primary" /><p className="text-xs font-bold uppercase tracking-widest text-primary">Supplier Information</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Field label="Supplier Name *" error={errors.name?.message}><input className={inp} placeholder="e.g. Taj Hotels" {...register("name")} /></Field></div>
              <Field label="Category *" error={errors.category?.message}><select className={inp} {...register("category")}>{CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></Field>
              <Field label="Contact Name"><input className={inp} placeholder="Contact person" {...register("contactName")} /></Field>
              <Field label="Phone *" error={errors.phone?.message}><input className={inp} type="tel" placeholder="+91 98765 43210" {...register("phone")} /></Field>
              <Field label="Email"><input className={inp} type="email" placeholder="contact@supplier.com" {...register("email")} /></Field>
              <Field label="Website"><input className={inp} placeholder="www.supplier.com" {...register("website")} /></Field>
              <Field label="Rating (1-5)"><input className={inp} type="number" min={1} max={5} {...register("rating")} /></Field>
            </div>
          </div>
          <div className="border-t border-border" />
          <div>
            <div className="flex items-center gap-2 mb-4"><MapPin size={13} className="text-primary" /><p className="text-xs font-bold uppercase tracking-widest text-primary">Address</p></div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Country *" error={errors.country?.message}><input className={inp} placeholder="India" {...register("country")} /></Field>
              <Field label="City"><input className={inp} placeholder="Mumbai" {...register("city")} /></Field>
              <div className="col-span-2"><Field label="Address"><input className={inp} placeholder="Full address" {...register("address")} /></Field></div>
            </div>
          </div>
          <div className="border-t border-border" />
          <div>
            <div className="flex items-center gap-2 mb-4"><CreditCard size={13} className="text-primary" /><p className="text-xs font-bold uppercase tracking-widest text-primary">Banking & Tax</p></div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="GST Number"><input className={inp} placeholder="GST number" {...register("gstNumber")} /></Field>
              <Field label="PAN Number"><input className={inp} placeholder="PAN number" {...register("panNumber")} /></Field>
              <Field label="Bank Name"><input className={inp} placeholder="Bank name" {...register("bankName")} /></Field>
              <Field label="Account Number"><input className={inp} placeholder="Account number" {...register("accountNumber")} /></Field>
              <Field label="IFSC Code"><input className={inp} placeholder="IFSC code" {...register("ifscCode")} /></Field>
              <Field label="Notes"><input className={inp} placeholder="Notes..." {...register("notes")} /></Field>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">{supplier ? "Changes saved immediately" : "Supplier will be added"}</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}{supplier ? "Save Changes" : "Add Supplier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
