import { portalFetch } from "@/modules/portal/services/portal-fetch";
import { uploadFile } from "@/lib/storage/upload";

export type TripBooking = {
  id: string; refNumber: string; destination: string;
  travelDate: string | null; returnDate: string | null;
};

export type MyTrip = {
  booking: TripBooking | null;
  tripReady: boolean;
  opsId?: string;
  friendlyStatus?: string;
  idCardCount?: number;
  feedbackStatus?: "collected" | "pending";
  testimonialStatus?: "collected" | "pending";
  canSubmitFeedback?: boolean;
};

export async function fetchMyTrip(): Promise<MyTrip | null> {
  const res = await portalFetch("/api/portal/customer/trip");
  if (!res.ok) return null;
  return res.json();
}

export async function uploadTripIdCard(opsId: string, file: File): Promise<{ error: string | null }> {
  try {
    const url = await uploadFile(`trip-portal/${opsId}/id-cards/${crypto.randomUUID()}-${file.name}`, file);
    const res = await portalFetch("/api/portal/customer/trip/id-card", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ opsId, url }),
    });
    if (res.ok) return { error: null };
    const data = await res.json().catch(() => ({}));
    return { error: data.error ?? "Couldn't upload your ID card." };
  } catch {
    return { error: "Couldn't upload your ID card." };
  }
}

export async function submitTripFeedback(opsId: string, notes: string): Promise<{ error: string | null }> {
  const res = await portalFetch("/api/portal/customer/trip/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ opsId, notes }),
  });
  if (res.ok) return { error: null };
  const data = await res.json().catch(() => ({}));
  return { error: data.error ?? "Couldn't submit your feedback." };
}

export async function uploadTripTestimonial(opsId: string, file: File): Promise<{ error: string | null }> {
  try {
    const url = await uploadFile(`trip-portal/${opsId}/testimonials/${crypto.randomUUID()}-${file.name}`, file);
    const res = await portalFetch("/api/portal/customer/trip/testimonial", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ opsId, url }),
    });
    if (res.ok) return { error: null };
    const data = await res.json().catch(() => ({}));
    return { error: data.error ?? "Couldn't upload your testimonial." };
  } catch {
    return { error: "Couldn't upload your testimonial." };
  }
}
