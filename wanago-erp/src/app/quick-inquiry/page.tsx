"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";

export default function QuickInquiryPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (phone.trim().length < 10 || address.trim().length < 3) {
      setError("Enter your phone number and area/address.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/quick-inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <img src="/images/logo-dark-clean.png" alt="Wanago" className="mx-auto h-8 w-auto dark:hidden" />
          <img src="/images/logo-white-clean.png" alt="Wanago" className="mx-auto hidden h-8 w-auto dark:block" />
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-600" />
            <p className="text-lg font-semibold text-foreground">Got it!</p>
            <p className="mt-1.5 text-sm text-muted-foreground">Our team will call you back shortly.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MapPin size={22} className="text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Just tell us where you are</h1>
              <p className="mt-1 text-sm text-muted-foreground">No forms, no fuss — leave your number and area, we&apos;ll call you.</p>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Your Name (optional)</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Phone Number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Your Area / Address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Kozhikode, Kerala"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              {error && <p className="text-xs font-medium text-destructive">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Get a Call Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
