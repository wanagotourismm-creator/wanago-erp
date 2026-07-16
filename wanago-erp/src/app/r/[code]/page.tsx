"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, Gift } from "lucide-react";
import { usePublicBranding } from "@/modules/admin/settings/hooks/usePublicBranding";

export default function ReferralLinkPage() {
  const params = useParams<{ code: string }>();
  const company = usePublicBranding();
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/referral/${params.code}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json();
        setReferrerName(data.referrerName);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.code]);

  async function handleSubmit() {
    if (name.trim().length < 2 || phone.trim().length < 10) {
      setError("Please enter your name and a valid phone number.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/referral/${params.code}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, email, destination }),
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">This link isn&apos;t valid</p>
          <p className="mt-1 text-sm text-muted-foreground">Please check the link, or contact {company.businessName} directly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md">

        <div className="mb-6 text-center">
          <img src="/images/logo-dark-clean.png" alt={company.businessName} className="mx-auto h-8 w-auto dark:hidden" />
          <img src="/images/logo-white-clean.png" alt={company.businessName} className="mx-auto hidden h-8 w-auto dark:block" />
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-600" />
            <p className="text-lg font-semibold text-foreground">Thanks, {name.split(" ")[0]}!</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              We&apos;ve got your details — our team will reach out shortly to help plan your trip.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Gift size={22} className="text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                {referrerName ? `${referrerName} thinks you'd love this` : `Plan your next trip with ${company.businessName}`}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Leave your details and our travel team will reach out to help plan your trip.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Your Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Phone Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email (optional)</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Where are you thinking of going?</label>
                <input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Bali, or not sure yet"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              {error && <p className="text-xs font-medium text-destructive">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Get in Touch
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
