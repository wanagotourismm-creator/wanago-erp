"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, MapPin, Calendar, Users as UsersIcon, Loader2 } from "lucide-react";

type PackageOption = {
  id: string;
  title: string;
  destination: string;
  category: string;
  durationDays: number;
  durationNights: number;
  basePrice: number;
  inclusions: string;
};

type LinkData = {
  leadName: string;
  destination: string;
  packages: PackageOption[];
  alreadySubmitted: boolean;
  submittedPackageName: string | null;
};

export default function BookingLinkPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [travelDate, setTravelDate] = useState("");
  const [pax, setPax] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/booking-link/${params.token}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        setData(await res.json());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleSubmit() {
    if (!selectedPackageId) { setError("Please choose a package to continue."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/booking-link/${params.token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackageId, travelDate, pax: pax ? Number(pax) : undefined, notes }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError("Something went wrong — please try again.");
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

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">This link isn&apos;t valid</p>
          <p className="mt-1 text-sm text-muted-foreground">Please check the link or contact us directly.</p>
        </div>
      </div>
    );
  }

  const alreadyDone = data.alreadySubmitted || submitted;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg">

        <div className="mb-6 text-center">
          <img src="/images/logo-dark-clean.png" alt="Wanago" className="mx-auto h-8 w-auto dark:hidden" />
          <img src="/images/logo-white-clean.png" alt="Wanago" className="mx-auto hidden h-8 w-auto dark:block" />
        </div>

        {alreadyDone ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-600" />
            <p className="text-lg font-semibold text-foreground">Thanks, {data.leadName.split(" ")[0]}!</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {submitted
                ? "We've got your request — our team will reach out shortly to confirm the details."
                : `You already picked "${data.submittedPackageName}" — our team is on it. They'll reach out shortly.`}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <p className="text-sm text-muted-foreground">Hi {data.leadName.split(" ")[0]},</p>
              <h1 className="text-xl font-bold text-foreground">Pick your {data.destination} package</h1>
              <p className="mt-1 text-sm text-muted-foreground">Choose a package below and tell us your preferred dates — our team will confirm and get you booked.</p>
            </div>

            {data.packages.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card py-8 text-center text-sm text-muted-foreground">
                No packages are available right now — please contact us directly.
              </p>
            ) : (
              <div className="space-y-3">
                {data.packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                      selectedPackageId === pkg.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{pkg.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin size={11} /> {pkg.destination} · {pkg.durationDays}D/{pkg.durationNights}N
                        </p>
                      </div>
                      <p className="whitespace-nowrap font-semibold text-primary">₹{pkg.basePrice.toLocaleString("en-IN")}</p>
                    </div>
                    {pkg.inclusions && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{pkg.inclusions}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedPackageId && (
              <div className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Calendar size={12} /> Preferred Travel Date
                  </label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <UsersIcon size={12} /> No. of Travellers
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={pax}
                    onChange={(e) => setPax(e.target.value)}
                    placeholder="2"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Anything else we should know?</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional"
                    className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                {error && <p className="text-xs font-medium text-destructive">{error}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Submit Request
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
