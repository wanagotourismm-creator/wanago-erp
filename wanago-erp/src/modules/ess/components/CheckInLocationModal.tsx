"use client";

import { useRef } from "react";
import { X, Loader2, MapPin, Camera, CheckCircle2, AlertTriangle } from "lucide-react";
import { LocationPickerMap } from "@/modules/admin/offices/components/LocationPickerMap";
import type { CheckInContext } from "@/modules/ess/hooks/useEss";

type Props = {
  action:  "in" | "out";
  ctx:     CheckInContext | null;
  loading: boolean;
  busy:    boolean;
  onConfirm: (selfieFile: File | null) => void;
  onClose:   () => void;
};

// Shown every time an employee checks in/out — always displays the
// resolved address + a map so they (and, on review, their manager) can see
// exactly where the attempt was made. Only prompts for a selfie when the
// office has geofencing configured and the employee is confirmed outside
// it (or couldn't be located at all); being in range, or an office that
// never opted into geofencing, skips straight to a plain confirm.
export function CheckInLocationModal({ action, ctx, loading, busy, onConfirm, onClose }: Props) {
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const actionLabel = action === "in" ? "Check In" : "Check Out";

  function handleSelfieCaptured(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onConfirm(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy ? undefined : onClose} />

      <div className="modal-enter relative w-full max-w-sm rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">{actionLabel} — Confirm Location</p>
          </div>
          <button onClick={onClose} disabled={busy}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {loading || !ctx ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 size={20} className="animate-spin text-primary" />
              Getting your location...
            </div>
          ) : (
            <>
              {/* Shows the employee's own resolved position — not the office's
                  geofence circle (this context doesn't carry the office's
                  raw lat/lng/radius, only the derived in/out-of-range
                  result), so no radius is drawn here. */}
              <LocationPickerMap
                lat={ctx.pos?.lat ?? null}
                lng={ctx.pos?.lng ?? null}
                radiusMeters={null}
                onPick={() => {}}
              />
              <p className="text-xs text-muted-foreground">
                {ctx.address ?? (ctx.pos ? `${ctx.pos.lat.toFixed(5)}, ${ctx.pos.lng.toFixed(5)}` : "Location unavailable")}
              </p>

              {!ctx.geofenceConfigured || ctx.withinGeofence === true ? (
                <div className="flex items-center gap-2 rounded-xl border border-green-300/50 bg-green-50 dark:bg-green-900/10 px-3 py-2.5 text-xs text-green-700 dark:text-green-400">
                  <CheckCircle2 size={14} className="flex-shrink-0" />
                  {ctx.geofenceConfigured ? `You're at ${ctx.officeName}` : "Location confirmed"}
                </div>
              ) : (
                <div className="space-y-2 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    {ctx.pos
                      ? `You're ${ctx.distanceMeters != null ? (ctx.distanceMeters / 1000).toFixed(1) : "?"} km from ${ctx.officeName}`
                      : "We couldn't get your location"}
                  </div>
                  <p>A selfie is required, and this will be sent to your manager for approval.</p>
                </div>
              )}
            </>
          )}
        </div>

        {!loading && ctx && (
          <div className="border-t border-primary/15 bg-muted/30 px-5 py-3.5">
            {!ctx.geofenceConfigured || ctx.withinGeofence === true ? (
              <button onClick={() => onConfirm(null)} disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Confirm {actionLabel}
              </button>
            ) : (
              <>
                <button onClick={() => selfieInputRef.current?.click()} disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors shadow-sm">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  Take Selfie &amp; Submit for Approval
                </button>
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleSelfieCaptured}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
