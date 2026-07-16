"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Save, Check, Upload, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { uploadCompanyLogo, uploadPaymentQr, type CompanySettings } from "@/modules/admin/settings/services/company-settings.service";

type Props = {
  settings:     CompanySettings;
  saving:       boolean;
  isSuperAdmin: boolean;
  onSave:       (data: CompanySettings) => Promise<{ error: string | null }>;
};

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function CompanySettingsForm({ settings, saving, isSuperAdmin, onSave }: Props) {
  const [form, setForm] = useState<CompanySettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  function set<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadCompanyLogo(file);
      set("logoUrl", url);
    } catch {
      setError("Failed to upload logo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleQrUpload(file: File) {
    setUploadingQr(true);
    setError(null);
    try {
      const url = await uploadPaymentQr(file);
      set("paymentQrUrl", url);
    } catch {
      setError("Failed to upload payment QR code.");
    } finally {
      setUploadingQr(false);
    }
  }

  async function handleSave() {
    setError(null);
    const result = await onSave(form);
    if (result.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
            {form.logoUrl ? (
              <Image src={form.logoUrl} alt="Company logo" width={64} height={64} className="h-full w-full object-cover" unoptimized />
            ) : (
              <span className="text-2xl">🏝️</span>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Company Logo</label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Uploading..." : "Upload Logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="col-span-2">
            <Field label="Business Name">
              <input className={inputClass} value={form.businessName} onChange={e => set("businessName", e.target.value)} />
            </Field>
          </div>
          <Field label="Email">
            <input className={inputClass} type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <input className={inputClass} value={form.address} onChange={e => set("address", e.target.value)} />
            </Field>
          </div>
          <Field label="City">
            <input className={inputClass} value={form.city} onChange={e => set("city", e.target.value)} />
          </Field>
          <Field label="GST Number">
            <input className={inputClass} value={form.gstNumber} onChange={e => set("gstNumber", e.target.value)} />
          </Field>
          <Field label="Currency">
            <select className={inputClass} value={form.currency} onChange={e => set("currency", e.target.value)}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </Field>
          <Field label="Website">
            <input className={inputClass} value={form.websiteUrl} onChange={e => set("websiteUrl", e.target.value)} placeholder="www.yourcompany.com" />
          </Field>
          <Field label="Social Handle">
            <input className={inputClass} value={form.socialHandle} onChange={e => set("socialHandle", e.target.value)} placeholder="@yourhandle" />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Pricing Defaults</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Default Tax Rate (%)">
            <input className={inputClass} type="number" min={0} max={100} step={0.1} value={form.taxRate}
              onChange={e => set("taxRate", Number(e.target.value))} />
          </Field>
          <Field label="Default Service Charge (%)">
            <input className={inputClass} type="number" min={0} max={100} step={0.1} value={form.serviceChargeRate}
              onChange={e => set("serviceChargeRate", Number(e.target.value))} />
          </Field>
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-input" checked={form.gstEnabled}
                onChange={e => set("gstEnabled", e.target.checked)} />
              GST Enabled (shows tax fields on invoices/quotations and their PDFs)
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Quotation / Invoice PDF — Payment &amp; Terms</p>
        <p className="text-xs text-muted-foreground">Shown on the &ldquo;Payable To&rdquo; and &ldquo;Terms and conditions&rdquo; boxes of every quotation/invoice PDF.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Bank Account Name">
            <input className={inputClass} value={form.bankAccountName} onChange={e => set("bankAccountName", e.target.value)} placeholder="YOUR COMPANY PRIVATE LIMITED" />
          </Field>
          <Field label="Bank Name">
            <input className={inputClass} value={form.bankName} onChange={e => set("bankName", e.target.value)} placeholder="Your Bank Name" />
          </Field>
          <Field label="Account Number">
            <input className={inputClass} value={form.bankAccountNumber} onChange={e => set("bankAccountNumber", e.target.value)} />
          </Field>
          <Field label="IFSC Code">
            <input className={inputClass} value={form.bankIfscCode} onChange={e => set("bankIfscCode", e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="UPI ID">
              <input className={inputClass} value={form.upiId} onChange={e => set("upiId", e.target.value)} placeholder="yourbusiness@okhdfcbank" />
            </Field>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Powers the &ldquo;Pay via UPI&rdquo; QR/link shown on invoices and booking advances — the exact
              amount and a reference note go straight to this UPI ID, with no gateway or commission.
              Double-check it&apos;s correct: this is the account real customer payments will be sent to.
            </p>
          </div>
          <div className="col-span-2">
            <Field label="Terms and Conditions (one per line)">
              <textarea rows={4} className={cn(inputClass, "resize-none")} value={form.quotationTerms}
                onChange={e => set("quotationTerms", e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
            {form.paymentQrUrl ? (
              <Image src={form.paymentQrUrl} alt="Payment QR" width={64} height={64} className="h-full w-full object-cover" unoptimized />
            ) : (
              <span className="text-2xl">📱</span>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Payment QR Code (optional)</label>
            <p className="text-[11px] text-muted-foreground">Only shown on the PDF if uploaded — never auto-generated.</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
              {uploadingQr ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploadingQr ? "Uploading..." : "Upload QR Code"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingQr}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleQrUpload(f); }}
              />
            </label>
          </div>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/10 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Maintenance Mode</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" className="h-4 w-4 rounded border-input" checked={form.maintenanceMode}
              onChange={e => set("maintenanceMode", e.target.checked)} />
            Enable maintenance mode (blocks everyone except Super Admin from using the app)
          </label>
          <Field label="Maintenance Message">
            <textarea rows={2} className={cn(inputClass, "resize-none")} value={form.maintenanceMessage}
              onChange={e => set("maintenanceMessage", e.target.value)} />
          </Field>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <Check size={13} /> Saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
