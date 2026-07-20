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

// Resolves null instead of rejecting on denial/timeout/unavailability. Whether
// a null result blocks clock-in is decided by the caller (useEss.ts's
// clockIn()) based on whether the employee's office has geofencing
// configured at all — this helper itself stays a plain best-effort lookup.
// enableHighAccuracy + a 15s timeout (up from a plain default-accuracy 8s)
// gives a cold GPS fix enough time to land, especially indoors/urban canyon
// — the old combination was timing out for a lot of real check-ins before
// low-accuracy network positioning even had a chance to resolve.
export function getCurrentPosition(timeoutMs = 15000): Promise<GeoPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
      }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 60000, enableHighAccuracy: true }
    );
  });
}
