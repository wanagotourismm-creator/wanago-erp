"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Laptop } from "lucide-react";
import { assetSchema, type AssetSchema } from "@/modules/assets/schemas";
import { ASSET_CATEGORIES } from "@/modules/assets/types";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Asset } from "@/modules/assets/types";
import type { Employee } from "@/modules/hrms/shared/types";

type Props = {
  open: boolean;
  asset?: Asset | null;
  onClose: () => void;
  onSubmit: (data: AssetSchema) => Promise<void>;
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

export function AssetForm({ open, asset, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<AssetSchema>({
    resolver: zodResolver(assetSchema),
    defaultValues: { condition: "good", officeId: user?.officeId ?? "main" },
  });

  useEffect(() => {
    if (!open) return;
    fetchEmployees().then(setEmployees).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (asset) {
      reset({
        name: asset.name, category: asset.category, serialNumber: asset.serialNumber ?? "",
        condition: asset.condition, assignedToId: asset.assignedToId ?? "", assignedToName: asset.assignedToName ?? "",
        officeId: asset.officeId,
      });
    } else {
      reset({ condition: "good", officeId: user?.officeId ?? "main" });
    }
  }, [open, asset, reset, user]);

  const assignedToId = watch("assignedToId");

  function handleAssigneeChange(id: string) {
    const emp = employees.find((e) => e.id === id);
    setValue("assignedToId", id);
    setValue("assignedToName", emp?.fullName ?? "");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Laptop size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{asset ? "Edit Asset" : "Add Asset"}</h2>
              <p className="text-xs text-muted-foreground">{asset ? `Editing ${asset.name}` : "Register a new company asset"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <Field label="Asset Name *" error={errors.name?.message}>
            <input className={inputClass} placeholder="e.g. MacBook Air M2" {...register("name")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category *" error={errors.category?.message}>
              <select className={inputClass} {...register("category")}>
                <option value="">Select category</option>
                {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Serial / Asset No.">
              <input className={inputClass} {...register("serialNumber")} />
            </Field>
            <Field label="Condition *">
              <select className={inputClass} {...register("condition")}>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="damaged">Damaged</option>
              </select>
            </Field>
            <Field label="Assigned To">
              <select className={inputClass} value={assignedToId ?? ""} onChange={(e) => handleAssigneeChange(e.target.value)}>
                <option value="">Unassigned</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {asset ? "Save Changes" : "Add Asset"}
          </button>
        </div>

      </div>
    </div>
  );
}
