"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, Tag, CalendarRange, CheckCircle2 } from "lucide-react";

type VendorRateEntry = {
  id: string; serviceName: string; description: string | null; unit: string;
  rateAmount: number; validFrom: string | null; validTo: string | null; notes: string | null;
};
type VendorAvailabilityEntry = {
  id: string; resourceLabel: string; startDate: string; endDate: string;
  unitsAvailable: number; notes: string | null;
};
type LinkData = {
  supplierName: string; category: string; city: string | null;
  rates: VendorRateEntry[]; availability: VendorAvailabilityEntry[];
};

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function VendorPortalPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [rateForm, setRateForm] = useState({ serviceName: "", description: "", unit: "", rateAmount: "", validFrom: "", validTo: "", notes: "" });
  const [savingRate, setSavingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateSaved, setRateSaved] = useState(false);

  const [availabilityForm, setAvailabilityForm] = useState({ resourceLabel: "", startDate: "", endDate: "", unitsAvailable: "", notes: "" });
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilitySaved, setAvailabilitySaved] = useState(false);

  function load() {
    fetch(`/api/public/vendor/${params.token}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        setData(await res.json());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [params.token]);

  async function submitRate() {
    if (!rateForm.serviceName || !rateForm.unit || !rateForm.rateAmount) {
      setRateError("Please fill in the service name, unit, and rate.");
      return;
    }
    setSavingRate(true);
    setRateError(null);
    try {
      const res = await fetch(`/api/public/vendor/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "rate", ...rateForm, rateAmount: Number(rateForm.rateAmount) }),
      });
      const json = await res.json();
      if (!res.ok) { setRateError(json.error ?? "Something went wrong. Please try again."); return; }
      setRateForm({ serviceName: "", description: "", unit: "", rateAmount: "", validFrom: "", validTo: "", notes: "" });
      setRateSaved(true);
      setTimeout(() => setRateSaved(false), 3000);
      load();
    } catch {
      setRateError("Something went wrong. Please try again.");
    } finally {
      setSavingRate(false);
    }
  }

  async function submitAvailability() {
    if (!availabilityForm.resourceLabel || !availabilityForm.startDate || !availabilityForm.endDate || !availabilityForm.unitsAvailable) {
      setAvailabilityError("Please fill in the resource, dates, and units available.");
      return;
    }
    setSavingAvailability(true);
    setAvailabilityError(null);
    try {
      const res = await fetch(`/api/public/vendor/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "availability", ...availabilityForm, unitsAvailable: Number(availabilityForm.unitsAvailable) }),
      });
      const json = await res.json();
      if (!res.ok) { setAvailabilityError(json.error ?? "Something went wrong. Please try again."); return; }
      setAvailabilityForm({ resourceLabel: "", startDate: "", endDate: "", unitsAvailable: "", notes: "" });
      setAvailabilitySaved(true);
      setTimeout(() => setAvailabilitySaved(false), 3000);
      load();
    } catch {
      setAvailabilityError("Something went wrong. Please try again.");
    } finally {
      setSavingAvailability(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-muted-foreground">This link isn&apos;t valid or has expired.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Hi {data.supplierName}!</h1>
          <p className="text-sm text-muted-foreground">
            Submit your rates and availability below — our team reviews everything you share here.
          </p>
        </div>

        {/* Rates */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Tag size={15} className="text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Submit a Rate</h2>
          </div>

          <div className="space-y-3">
            <input
              value={rateForm.serviceName} onChange={(e) => setRateForm({ ...rateForm, serviceName: e.target.value })}
              placeholder="Service name (e.g. Deluxe Double Room)"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <textarea
              value={rateForm.description} onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
              placeholder="Description (optional)" rows={2}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={rateForm.unit} onChange={(e) => setRateForm({ ...rateForm, unit: e.target.value })}
                placeholder="Unit (e.g. per night)"
                className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                type="number" value={rateForm.rateAmount} onChange={(e) => setRateForm({ ...rateForm, rateAmount: e.target.value })}
                placeholder="Rate (₹)"
                className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Valid from (optional)</label>
                <input
                  type="date" value={rateForm.validFrom} onChange={(e) => setRateForm({ ...rateForm, validFrom: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Valid to (optional)</label>
                <input
                  type="date" value={rateForm.validTo} onChange={(e) => setRateForm({ ...rateForm, validTo: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <input
              value={rateForm.notes} onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
              placeholder="Notes (optional)"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />

            {rateError && <p className="text-xs font-medium text-destructive">{rateError}</p>}
            {rateSaved && <p className="flex items-center gap-1.5 text-xs font-medium text-green-600"><CheckCircle2 size={13} /> Rate submitted — thank you!</p>}

            <button
              onClick={submitRate} disabled={savingRate}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {savingRate ? <Loader2 size={16} className="animate-spin" /> : "Submit Rate"}
            </button>
          </div>

          {data.rates.length > 0 && (
            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your submitted rates</p>
              {data.rates.map((r) => (
                <div key={r.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{r.serviceName}</span>
                    <span className="text-foreground">{formatINR(r.rateAmount)} <span className="text-xs text-muted-foreground">{r.unit}</span></span>
                  </div>
                  {(r.validFrom || r.validTo) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Valid {r.validFrom ?? "—"} to {r.validTo ?? "—"}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Availability */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarRange size={15} className="text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Submit Availability</h2>
          </div>

          <div className="space-y-3">
            <input
              value={availabilityForm.resourceLabel} onChange={(e) => setAvailabilityForm({ ...availabilityForm, resourceLabel: e.target.value })}
              placeholder="Resource (e.g. Standard Rooms, Innova Fleet)"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">From</label>
                <input
                  type="date" value={availabilityForm.startDate} onChange={(e) => setAvailabilityForm({ ...availabilityForm, startDate: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">To</label>
                <input
                  type="date" value={availabilityForm.endDate} onChange={(e) => setAvailabilityForm({ ...availabilityForm, endDate: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <input
              type="number" value={availabilityForm.unitsAvailable} onChange={(e) => setAvailabilityForm({ ...availabilityForm, unitsAvailable: e.target.value })}
              placeholder="Units available"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              value={availabilityForm.notes} onChange={(e) => setAvailabilityForm({ ...availabilityForm, notes: e.target.value })}
              placeholder="Notes (optional)"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />

            {availabilityError && <p className="text-xs font-medium text-destructive">{availabilityError}</p>}
            {availabilitySaved && <p className="flex items-center gap-1.5 text-xs font-medium text-green-600"><CheckCircle2 size={13} /> Availability submitted — thank you!</p>}

            <button
              onClick={submitAvailability} disabled={savingAvailability}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {savingAvailability ? <Loader2 size={16} className="animate-spin" /> : "Submit Availability"}
            </button>
          </div>

          {data.availability.length > 0 && (
            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your submitted availability</p>
              {data.availability.map((a) => (
                <div key={a.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{a.resourceLabel}</span>
                    <span className="text-foreground">{a.unitsAvailable} units</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.startDate} to {a.endDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
