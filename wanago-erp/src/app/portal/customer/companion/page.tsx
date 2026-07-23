"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, ShieldAlert, Calendar, Navigation, Car, UserRound, Building2 } from "lucide-react";
import { PortalShell } from "@/modules/portal/components/PortalShell";
import { fetchCompanion, setLiveLocationOptIn, sendSos } from "@/modules/companion/services/companion-portal.service";
import { getCurrentPosition, reverseGeocode } from "@/lib/geo";
import { formatDate } from "@/lib/utils/helpers";
import type { CompanionData } from "@/modules/companion/types";

const RESOURCE_ICON = { vehicle: Car, driver: UserRound, guide: UserRound, room_block: Building2 };

function CompanionDashboard() {
  const [data, setData] = useState<CompanionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [optInBusy, setOptInBusy] = useState(false);
  const [sosBusy, setSosBusy] = useState(false);
  const [sosError, setSosError] = useState<string | null>(null);
  const [sosSent, setSosSent] = useState(false);

  useEffect(() => { fetchCompanion().then(setData).finally(() => setLoading(false)); }, []);

  async function handleOptInToggle() {
    if (!data?.booking) return;
    setOptInBusy(true);
    const position = await getCurrentPosition();
    const nextOptIn = !data.liveLocationOptIn;
    const result = await setLiveLocationOptIn(data.booking.id, nextOptIn, position ?? undefined);
    if (!result.error) setData({ ...data, liveLocationOptIn: nextOptIn });
    setOptInBusy(false);
  }

  async function handleSos() {
    if (!data?.booking) return;
    if (!confirm("This will share your location and alert our operations team immediately. Only use this in a genuine emergency. Continue?")) return;

    setSosBusy(true);
    setSosError(null);
    const position = await getCurrentPosition();
    if (!position) {
      setSosError("We couldn't get your location. Please call us directly instead.");
      setSosBusy(false);
      return;
    }
    const address = await reverseGeocode(position.lat, position.lng);
    const result = await sendSos(data.booking.id, position, address);
    setSosBusy(false);
    if (result.error) {
      setSosError(result.error);
    } else {
      setSosSent(true);
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }

  if (!data?.booking) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">No active or upcoming trip to show right now.</p>
      </div>
    );
  }

  const { booking, itinerary, resources, emergencyContacts } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Trip Companion</h1>
        <p className="text-sm text-muted-foreground">{booking.destination} · {booking.refNumber}</p>
        {booking.travelDate && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={11} /> {formatDate(booking.travelDate)}{booking.returnDate ? ` – ${formatDate(booking.returnDate)}` : ""}
          </p>
        )}
      </div>

      {/* SOS */}
      <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4">
        {sosSent ? (
          <p className="text-center text-sm font-medium text-foreground">
            🆘 Your SOS has been sent with your location. Our team has been alerted and will reach out.
          </p>
        ) : (
          <>
            <button
              onClick={handleSos}
              disabled={sosBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-4 text-base font-bold text-white transition-colors hover:bg-destructive/90 disabled:opacity-60"
            >
              {sosBusy ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={20} />}
              SOS — Emergency
            </button>
            {sosError && <p className="mt-2 text-center text-xs font-medium text-destructive">{sosError}</p>}
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Shares your location and alerts our team immediately.</p>
          </>
        )}
      </div>

      {/* Live location opt-in */}
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 cursor-pointer">
        <div className="flex items-center gap-2">
          <Navigation size={14} className="text-primary" />
          <span className="text-sm text-foreground">Share my live location with our team during this trip</span>
        </div>
        <input
          type="checkbox" checked={data.liveLocationOptIn} disabled={optInBusy}
          onChange={handleOptInToggle}
          className="h-5 w-5 flex-shrink-0 rounded border-input"
        />
      </label>

      {/* Contacts */}
      {resources.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Your Contacts</p>
          <div className="space-y-2">
            {resources.map((r, i) => {
              const Icon = RESOURCE_ICON[r.type];
              return (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={14} className="flex-shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                      <p className="text-[11px] capitalize text-muted-foreground">{r.type.replace("_", " ")}</p>
                    </div>
                  </div>
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors">
                      <Phone size={12} /> Call
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emergency contacts */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Emergency Contacts</p>
        <div className="space-y-2">
          {emergencyContacts.map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
              <span className="text-sm text-foreground">{c.label}</span>
              <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 transition-colors">
                <Phone size={12} /> {c.phone}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Itinerary */}
      {itinerary && (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">{itinerary.title}</p>
          <div className="space-y-2">
            {itinerary.days.map((day) => (
              <div key={day.dayNumber} className="rounded-xl border border-border bg-card p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Day {day.dayNumber}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{day.title}</p>
                {day.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{day.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompanionPortalPage() {
  return (
    <PortalShell requiredType="customer" title="Trip Companion">
      <CompanionDashboard />
    </PortalShell>
  );
}
