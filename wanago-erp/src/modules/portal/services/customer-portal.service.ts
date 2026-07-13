import { portalFetch } from "@/modules/portal/services/portal-fetch";

export type CustomerPortalBooking = {
  id: string; refNumber: string; destination: string; packageName: string | null;
  travelDate: string | null; returnDate: string | null; pax: number;
  totalAmount: number; advanceAmount: number; balanceAmount: number;
  status: string; createdAt: string | null;
};
export type CustomerPortalMe = { fullName: string; referralCode: string | null; bookings: CustomerPortalBooking[] };
export type CustomerPortalPackage = {
  id: string; title: string; destination: string; category: string;
  durationDays: number; durationNights: number; basePrice: number; inclusions: string;
};
export type CustomerBookingRequest = {
  id: string; packageName: string; travelDate: string | null; pax: number | null;
  notes: string | null; requestStatus: string; createdAt: string | null;
};

export async function fetchCustomerMe(): Promise<CustomerPortalMe | null> {
  const res = await portalFetch("/api/portal/customer/me");
  if (!res.ok) return null;
  return res.json();
}

export async function fetchCustomerPackages(): Promise<CustomerPortalPackage[]> {
  const res = await portalFetch("/api/portal/customer/packages");
  if (!res.ok) return [];
  const data = await res.json();
  return data.packages ?? [];
}

export async function fetchCustomerBookingRequests(): Promise<CustomerBookingRequest[]> {
  const res = await portalFetch("/api/portal/customer/booking-requests");
  if (!res.ok) return [];
  const data = await res.json();
  return data.requests ?? [];
}

export async function submitBookingRequest(input: {
  packageId: string; packageName: string; travelDate?: string; pax?: number; notes?: string;
}): Promise<{ error: string | null }> {
  const res = await portalFetch("/api/portal/customer/booking-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.ok) return { error: null };
  const data = await res.json().catch(() => ({}));
  return { error: data.error ?? "Couldn't submit your request." };
}
