"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Calendar, Users as UsersIcon, Luggage, Copy, Check, UserPlus, Users, Award, Crown } from "lucide-react";
import { PortalShell } from "@/modules/portal/components/PortalShell";
import { TripCountdown } from "@/modules/portal/components/TripCountdown";
import { BookingProgressTimeline } from "@/modules/portal/components/BookingProgressTimeline";
import { BadgeTrack, type BadgeMilestone } from "@/modules/portal/components/BadgeTrack";
import { ShareStatsCard } from "@/modules/portal/components/ShareStatsCard";
import { AnimatedCounter } from "@/modules/portal/components/AnimatedCounter";
import {
  fetchCustomerMe, fetchCustomerPackages, fetchCustomerBookingRequests, submitBookingRequest,
  type CustomerPortalMe, type CustomerPortalPackage, type CustomerBookingRequest,
} from "@/modules/portal/services/customer-portal.service";
import { formatCurrency, formatDate, cn } from "@/lib/utils/helpers";
import { getAppUrl } from "@/lib/app-url";

function trackingLink(code: string): string {
  return `${getAppUrl()}/r/${code}`;
}

const REFERRAL_MILESTONES: BadgeMilestone[] = [
  { value: 1,  label: "First Referral", icon: UserPlus },
  { value: 3,  label: "Connector",      icon: Users },
  { value: 5,  label: "Advocate",       icon: Award },
  { value: 10, label: "Wanago Legend",  icon: Crown },
];

function CustomerDashboard() {
  const [me, setMe] = useState<CustomerPortalMe | null>(null);
  const [packages, setPackages] = useState<CustomerPortalPackage[]>([]);
  const [requests, setRequests] = useState<CustomerBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [selectedPackage, setSelectedPackage] = useState<CustomerPortalPackage | null>(null);
  const [travelDate, setTravelDate] = useState("");
  const [pax, setPax] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([fetchCustomerMe(), fetchCustomerPackages(), fetchCustomerBookingRequests()])
      .then(([m, p, r]) => { setMe(m); setPackages(p); setRequests(r); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleRequest() {
    if (!selectedPackage) return;
    setSubmitting(true);
    setError(null);
    const result = await submitBookingRequest({
      packageId: selectedPackage.id, packageName: selectedPackage.title,
      travelDate, pax: pax ? Number(pax) : undefined, notes,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setSelectedPackage(null); setTravelDate(""); setPax(""); setNotes("");
      load();
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  function copyCode() {
    if (!me?.referralCode) return;
    navigator.clipboard.writeText(trackingLink(me.referralCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !me) {
    return <div className="flex h-64 items-center justify-center"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Hi {me.fullName.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Your bookings, and your next trip</p>
      </div>

      <TripCountdown bookings={me.bookings} />

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Your Bookings</p>
        {me.bookings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">No bookings yet.</p>
        ) : (
          <div className="space-y-2">
            {me.bookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{b.packageName ?? b.destination}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={11} /> {b.destination} · {b.refNumber}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {b.travelDate && <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(b.travelDate)}</span>}
                  <span className="flex items-center gap-1"><UsersIcon size={11} /> {b.pax} pax</span>
                  <span>Total {formatCurrency(b.totalAmount)}</span>
                  {b.balanceAmount > 0 && <span className="text-amber-600">Balance {formatCurrency(b.balanceAmount)}</span>}
                </div>
                <BookingProgressTimeline status={b.status} balanceAmount={b.balanceAmount} />
              </div>
            ))}
          </div>
        )}
      </div>

      {requests.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Your Requests</p>
          <div className="space-y-1.5">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs">
                <span className="font-medium text-foreground">{r.packageName}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", r.requestStatus === "new" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground")}>
                  {r.requestStatus === "new" ? "Awaiting Contact" : r.requestStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {me.referralCode && (
        <div className="space-y-4 rounded-2xl border border-primary/20 bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Refer a Friend, Earn a Bonus</p>
            {me.referralStats.count > 0 && (
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground text-sm"><AnimatedCounter value={me.referralStats.count} /></span> referred · {formatCurrency(me.referralStats.revenue)} generated
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs text-foreground">{trackingLink(me.referralCode)}</code>
            <button onClick={copyCode} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <BadgeTrack current={me.referralStats.count} milestones={REFERRAL_MILESTONES} currentLabel="referrals" />

          {me.referralStats.count > 0 && (
            <ShareStatsCard
              headline={`I've sent Wanago ${me.referralStats.count} referral${me.referralStats.count === 1 ? "" : "s"}! ✈️`}
              subline="Refer your friends and earn a bonus for every trip they book."
              shareText={`I've referred ${me.referralStats.count} friend${me.referralStats.count === 1 ? "" : "s"} to Wanago Tours & Travels and earned ${formatCurrency(me.referralStats.revenue)} in bonuses! Plan your next trip through my link: ${trackingLink(me.referralCode)}`}
            />
          )}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Luggage size={14} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Book Your Next Trip</p>
        </div>
        {packages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">No packages available right now — check back soon.</p>
        ) : (
          <div className="space-y-2">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={cn(
                  "w-full rounded-2xl border-2 p-4 text-left transition-all",
                  selectedPackage?.id === pkg.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{pkg.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={11} /> {pkg.destination} · {pkg.durationDays}D/{pkg.durationNights}N
                    </p>
                  </div>
                  <p className="whitespace-nowrap font-semibold text-primary">{formatCurrency(pkg.basePrice)}</p>
                </div>
                {pkg.inclusions && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{pkg.inclusions}</p>}
              </button>
            ))}
          </div>
        )}

        {selectedPackage && (
          <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Calendar size={12} /> Preferred Travel Date</label>
              <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><UsersIcon size={12} /> No. of Travellers</label>
              <input type="number" min={1} value={pax} onChange={(e) => setPax(e.target.value)} placeholder="2"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Anything else we should know?</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional"
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
            {success && <p className="text-xs font-medium text-green-600">Request sent — our team will reach out shortly.</p>}
            <button
              onClick={handleRequest}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Request This Trip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerPortalPage() {
  return (
    <PortalShell requiredType="customer" title="Customer Portal">
      <CustomerDashboard />
    </PortalShell>
  );
}
