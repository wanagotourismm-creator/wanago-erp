"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Fraunces } from "next/font/google";
import { motion } from "framer-motion";
import {
  CheckCircle2, MapPin, Calendar, Users as UsersIcon, Loader2, ShieldCheck,
  BadgeCheck, Clock, ArrowLeft, ArrowRight, Sparkles, Phone, Mail, Check,
  Plane, TreePalm, Compass, Sailboat, Receipt, Download, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], style: ["italic"], display: "swap" });

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
  company: { businessName: string; phone: string | null; email: string | null };
  tracking: {
    quotation: { refNumber: string; status: string; totalAmount: number } | null;
    booking:   { refNumber: string; status: string; travelDate: string | null; pax: number; totalAmount: number; advanceAmount: number; balanceAmount: number } | null;
    invoice:   { refNumber: string; status: string; totalAmount: number; amountPaid: number; balanceDue: number } | null;
  };
};

const QUOTATION_STATUS_LABELS: Record<string, string> = {
  draft: "Being Prepared", sent: "Sent to You", accepted: "Accepted",
  rejected: "Rejected", expired: "Expired", converted: "Converted to Booking",
};
const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending_finance: "Under Review", finance_approved: "Finance Approved",
  finance_rejected: "Needs Attention", ops_pending: "Being Finalized",
  ops_rejected: "Needs Attention", confirmed: "Confirmed", completed: "Trip Completed", cancelled: "Cancelled",
};
const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Being Prepared", sent: "Sent to You", unpaid: "Payment Due",
  partial: "Partially Paid", paid: "Fully Paid", overdue: "Overdue",
};

function TrackRow({ done, active, title, subtitle, action }: {
  done: boolean; active?: boolean; title: string; subtitle?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex-shrink-0">
        {done ? (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
            <Check size={13} strokeWidth={3} />
          </div>
        ) : (
          <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            <Circle size={10} fill="currentColor" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", done || active ? "text-foreground" : "text-muted-foreground")}>{title}</p>
        {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

const GRADIENTS = [
  "from-rose-500 via-pink-500 to-fuchsia-600",
  "from-orange-400 via-amber-500 to-red-500",
  "from-teal-400 via-emerald-500 to-green-600",
  "from-indigo-500 via-violet-500 to-purple-600",
  "from-sky-400 via-blue-500 to-indigo-600",
];

function gradientFor(category: string, index: number): string {
  const key = (category ?? "").toLowerCase();
  if (key.includes("honeymoon")) return GRADIENTS[0];
  if (key.includes("adventure")) return GRADIENTS[1];
  if (key.includes("family")) return GRADIENTS[2];
  if (key.includes("pilgrim")) return GRADIENTS[3];
  if (key.includes("beach") || key.includes("island")) return GRADIENTS[4];
  return GRADIENTS[index % GRADIENTS.length];
}

const STEPS = ["Choose Package", "Trip Details", "Confirm"];

// Same floating-icon language as the login screen, kept local since this
// page is a standalone public route with no layout/auth wrapper.
const FLOATING_ICONS = [
  { Icon: Plane,     top: "10%", left: "6%",   size: 28, duration: 9,  delay: 0   },
  { Icon: TreePalm,  top: "72%", left: "4%",   size: 32, duration: 11, delay: 1.2 },
  { Icon: Compass,   top: "16%", right: "8%",  size: 26, duration: 8,  delay: 0.6, hideOnMobile: true },
  { Icon: Sailboat,  top: "78%", right: "10%", size: 26, duration: 9.5, delay: 1.5, hideOnMobile: true },
];

function Stepper({ step }: { step: number }) {
  return (
    <div className="mx-auto mb-7 flex max-w-sm items-center justify-between">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                done ? "bg-primary text-white" : active ? "bg-primary text-white ring-4 ring-primary/20" : "bg-muted text-muted-foreground"
              }`}>
                {done ? <Check size={14} /> : n}
              </div>
              <span className={`mt-1.5 hidden text-[10px] font-medium sm:block ${active || done ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 rounded-full transition-all ${done ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BookingLinkPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
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
    if (!selectedPackage) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/booking-link/${params.token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackage.id, travelDate, pax: pax ? Number(pax) : undefined, notes }),
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
      <div className="travel-gradient-bg flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-white" />
          <p className="text-sm text-white/70">Loading your trip...</p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="travel-gradient-bg flex min-h-screen items-center justify-center px-4">
        <div className="text-center text-white">
          <p className="text-lg font-semibold">This link isn&apos;t valid</p>
          <p className="mt-1 text-sm text-white/60">Please check the link or contact us directly.</p>
        </div>
      </div>
    );
  }

  const alreadyDone = data.alreadySubmitted || submitted;
  const firstName = data.leadName.split(" ")[0];

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero — same animated brand gradient + floating icons as the Sign-In screen ── */}
      <div className="travel-gradient-bg relative overflow-hidden px-4 pb-24 pt-8 text-white sm:pb-32 sm:pt-10">

        {FLOATING_ICONS.map(({ Icon, top, left, right, size, duration, delay, hideOnMobile }, i) => (
          <motion.div
            key={i}
            className={cn("pointer-events-none absolute text-white/25", hideOnMobile && "hidden sm:block")}
            style={{ top, left, right }}
            animate={{ y: [0, -14, 0], rotate: [0, 4, -3, 0] }}
            transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
          >
            <Icon size={size} strokeWidth={1.5} />
          </motion.div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />

        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-center lg:text-left">
            <img src="/images/logo-white-clean.png" alt={data.company.businessName} className="mx-auto mb-8 h-8 w-auto lg:mx-0" />

            {!alreadyDone ? (
              <>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/60">Hi {firstName}, your trip to</p>
                <h1 className={cn(fraunces.className, "mt-2 text-5xl italic leading-tight text-white sm:text-6xl")} style={{ textShadow: "0 2px 20px rgba(0,0,0,0.35)" }}>
                  {data.destination}
                </h1>
                <p className="mx-auto mt-4 max-w-sm text-sm text-white/70 lg:mx-0">
                  Pick a package below and tell us your dates — our travel experts take it from there.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/60">Your request for</p>
                <h1 className={cn(fraunces.className, "mt-2 text-4xl italic leading-tight text-white sm:text-5xl")}>
                  {data.destination}
                </h1>
              </>
            )}

            {!alreadyDone && (
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                {[
                  { icon: ShieldCheck, label: "Secure & Encrypted" },
                  { icon: BadgeCheck,  label: "Verified Agency" },
                  { icon: Clock,       label: "24/7 Support" },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
                    <Icon size={12} /> {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Desktop-only trip snapshot panel, balances the layout the way
              the login screen's left showcase does */}
          {!alreadyDone && (
            <div className="hidden max-w-xs rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Your Trip Snapshot</p>
              <div className="mt-3 space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-white/85">
                  <MapPin size={13} /> {data.destination}
                </div>
                <div className="flex items-center gap-2 text-white/85">
                  <Sparkles size={13} /> {data.packages.length} package{data.packages.length !== 1 ? "s" : ""} available
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto -mt-14 max-w-2xl px-4 pb-16 sm:-mt-20">

        {alreadyDone ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-2xl sm:p-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                {submitted ? `Thanks, ${firstName}!` : `You're all set, ${firstName}!`}
              </p>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                {submitted
                  ? `We've received your request for "${selectedPackage?.title}".`
                  : `You already picked "${data.submittedPackageName}".`}
              </p>
            </div>

            {/* ── Track Your Trip ── */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-7">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Track Your Trip</p>
              <div className="divide-y divide-border">
                <TrackRow
                  done
                  title="Enquiry Received"
                  subtitle={`${data.destination} · ${firstName}`}
                />
                <TrackRow
                  done={data.alreadySubmitted || submitted}
                  active={!data.tracking.quotation}
                  title="Package Selected"
                  subtitle={data.submittedPackageName ?? selectedPackage?.title}
                />
                <TrackRow
                  done={!!data.tracking.quotation}
                  active={!data.tracking.quotation}
                  title="Quotation"
                  subtitle={data.tracking.quotation
                    ? <>{QUOTATION_STATUS_LABELS[data.tracking.quotation.status] ?? data.tracking.quotation.status} · ₹{data.tracking.quotation.totalAmount.toLocaleString("en-IN")} · {data.tracking.quotation.refNumber}</>
                    : "Not sent yet"}
                  action={data.tracking.quotation && (
                    <a
                      href={`/api/public/booking-link/${params.token}/pdf?type=quotation`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
                    >
                      <Download size={12} /> Download Quotation
                    </a>
                  )}
                />
                <TrackRow
                  done={!!data.tracking.booking}
                  active={!!data.tracking.quotation && !data.tracking.booking}
                  title="Booking"
                  subtitle={data.tracking.booking
                    ? <>
                        {BOOKING_STATUS_LABELS[data.tracking.booking.status] ?? data.tracking.booking.status}
                        {data.tracking.booking.travelDate && <> · {data.tracking.booking.travelDate}</>} · {data.tracking.booking.pax} traveller{data.tracking.booking.pax !== 1 ? "s" : ""}
                      </>
                    : "Not confirmed yet"}
                />
                <TrackRow
                  done={!!data.tracking.invoice && ["paid"].includes(data.tracking.invoice.status)}
                  active={!!data.tracking.invoice}
                  title="Invoice & Payment"
                  subtitle={data.tracking.invoice
                    ? <>{INVOICE_STATUS_LABELS[data.tracking.invoice.status] ?? data.tracking.invoice.status} · ₹{data.tracking.invoice.amountPaid.toLocaleString("en-IN")} paid{data.tracking.invoice.balanceDue > 0 && <>, ₹{data.tracking.invoice.balanceDue.toLocaleString("en-IN")} due</>}</>
                    : "Not issued yet"}
                  action={data.tracking.invoice && (
                    <a
                      href={`/api/public/booking-link/${params.token}/pdf?type=invoice`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
                    >
                      <Receipt size={12} /> Download Invoice
                    </a>
                  )}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
            <Stepper step={step} />

            {/* Step 1 — choose package */}
            {step === 1 && (
              <div className="space-y-3">
                {data.packages.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                    No packages are available right now — please contact us directly.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.packages.map((pkg, i) => {
                      const active = selectedPackage?.id === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`relative w-full overflow-hidden rounded-2xl text-left transition-all ${active ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                        >
                          <div className={`bg-gradient-to-br ${gradientFor(pkg.category, i)} p-4 text-white`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">{pkg.category || "Package"}</p>
                                <p className="text-lg font-bold">{pkg.title}</p>
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-white/80">
                                  <MapPin size={11} /> {pkg.destination} · {pkg.durationDays}D/{pkg.durationNights}N
                                </p>
                              </div>
                              {active && (
                                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary">
                                  <Check size={14} strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <div className="mt-3 flex items-end justify-between">
                              <p className="text-2xl font-bold">₹{pkg.basePrice.toLocaleString("en-IN")}</p>
                              <span className="text-[10px] text-white/70">per person</span>
                            </div>
                          </div>
                          {pkg.inclusions && (
                            <p className="border-x border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground line-clamp-2">
                              {pkg.inclusions}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedPackage && (
                  <button
                    onClick={() => setStep(2)}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    Continue <ArrowRight size={15} />
                  </button>
                )}
              </div>
            )}

            {/* Step 2 — trip details */}
            {step === 2 && selectedPackage && (
              <div className="mx-auto max-w-md space-y-4">
                <div className={`rounded-xl bg-gradient-to-br ${gradientFor(selectedPackage.category, 0)} p-3 text-white`}>
                  <p className="text-xs font-semibold">{selectedPackage.title}</p>
                  <p className="text-[11px] text-white/75">₹{selectedPackage.basePrice.toLocaleString("en-IN")} per person · {selectedPackage.durationDays}D/{selectedPackage.durationNights}N</p>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Calendar size={12} /> Preferred Travel Date
                  </label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Anything else we should know?</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional"
                    className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                  >
                    Review <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — confirm */}
            {step === 3 && selectedPackage && (
              <div className="mx-auto max-w-md space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles size={15} className="text-primary" /> Review your request
                </div>
                <div className="divide-y divide-border rounded-xl border border-border px-3">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-muted-foreground">Package</span>
                    <span className="text-sm font-medium text-foreground">{selectedPackage.title}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-muted-foreground">Price</span>
                    <span className="text-sm font-medium text-foreground">₹{selectedPackage.basePrice.toLocaleString("en-IN")} / person</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-muted-foreground">Preferred Date</span>
                    <span className="text-sm font-medium text-foreground">{travelDate || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-muted-foreground">Travellers</span>
                    <span className="text-sm font-medium text-foreground">{pax || "—"}</span>
                  </div>
                  {notes && (
                    <div className="py-2.5">
                      <span className="text-xs text-muted-foreground">Notes</span>
                      <p className="mt-1 text-sm text-foreground">{notes}</p>
                    </div>
                  )}
                </div>

                {error && <p className="text-xs font-medium text-destructive">{error}</p>}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(2)}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-8 space-y-1.5 text-center">
          <p className="text-xs font-semibold text-foreground">{data.company.businessName}</p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            {data.company.phone && (
              <span className="inline-flex items-center gap-1"><Phone size={10} /> {data.company.phone}</span>
            )}
            {data.company.email && (
              <span className="inline-flex items-center gap-1"><Mail size={10} /> {data.company.email}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
