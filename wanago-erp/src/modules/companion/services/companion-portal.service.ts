import { portalFetch } from "@/modules/portal/services/portal-fetch";
import type { CompanionData } from "@/modules/companion/types";

export async function fetchCompanion(): Promise<CompanionData | null> {
  const res = await portalFetch("/api/portal/customer/companion");
  if (!res.ok) return null;
  return res.json();
}

export async function setLiveLocationOptIn(
  bookingId: string, optIn: boolean, location?: { lat: number; lng: number }
): Promise<{ error: string | null }> {
  const res = await portalFetch("/api/portal/customer/companion/opt-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bookingId, optIn, lat: location?.lat, lng: location?.lng }),
  });
  if (res.ok) return { error: null };
  const data = await res.json().catch(() => ({}));
  return { error: data.error ?? "Couldn't update your location sharing." };
}

export async function sendSos(
  bookingId: string, location: { lat: number; lng: number }, address: string | null
): Promise<{ error: string | null }> {
  const res = await portalFetch("/api/portal/customer/sos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bookingId, lat: location.lat, lng: location.lng, address }),
  });
  if (res.ok) return { error: null };
  const data = await res.json().catch(() => ({}));
  return { error: data.error ?? "Couldn't send your SOS — please call us directly." };
}
