// Haversine formula — great-circle distance between two lat/lng points, in meters.
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type GeoPosition = { lat: number; lng: number; accuracy: number | null };

// Best-effort — a failed/slow reverse-geocode should never block check-in;
// callers show the raw coordinates as a fallback when this resolves null.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.address ?? null;
  } catch {
    return null;
  }
}

// How long to give the accurate GPS fix a clear shot before hedging with a
// fast network-based one — see getCurrentPosition's own comment.
const FAST_FALLBACK_MS = 5000;

// Resolves null instead of rejecting on denial/timeout/unavailability. Whether
// a null result blocks clock-in is decided by the caller (useEss.ts's
// clockIn()) based on whether the employee's office has geofencing
// configured at all — this helper itself stays a plain best-effort lookup.
//
// Runs a high-accuracy GPS request (enableHighAccuracy, up to timeoutMs)
// for a precise fix, but doesn't just sit through the full timeout if it's
// slow — a cold GPS start indoors/urban-canyon can easily take 10s+. Once
// FAST_FALLBACK_MS has passed without a result (or the high-accuracy
// attempt fails/errors early, e.g. POSITION_UNAVAILABLE), it races a
// second, low-accuracy (WiFi/cell-tower) request alongside — that usually
// resolves in 1-3s. Whichever finishes first wins; a late high-accuracy fix
// arriving after the fallback already resolved is simply ignored. This
// keeps the accurate reading when GPS is fast, and bounds the typical
// worst case to roughly FAST_FALLBACK_MS + a few seconds instead of the
// full 15s most attempts used to sit through. A denied permission skips
// the fallback entirely and resolves immediately — retrying at a different
// accuracy can't succeed if the user just said no.
export function getCurrentPosition(timeoutMs = 15000): Promise<GeoPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (pos: GeoPosition | null) => {
      if (settled) return;
      settled = true;
      resolve(pos);
    };
    const toGeoPosition = (pos: GeolocationPosition): GeoPosition => ({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    });

    function tryFallback() {
      if (settled) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => finish(toGeoPosition(pos)),
        () => finish(null),
        { timeout: Math.max(timeoutMs - FAST_FALLBACK_MS, 4000), maximumAge: 60000, enableHighAccuracy: false }
      );
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => finish(toGeoPosition(pos)),
      (err) => (err.code === err.PERMISSION_DENIED ? finish(null) : tryFallback()),
      { timeout: timeoutMs, maximumAge: 60000, enableHighAccuracy: true }
    );

    setTimeout(tryFallback, FAST_FALLBACK_MS);
  });
}
