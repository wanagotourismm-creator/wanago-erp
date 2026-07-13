import { portalFetch } from "@/modules/portal/services/portal-fetch";

export type PartnerPortalLead = { name: string; destination: string; stage: string; createdAt: string | null };
export type PartnerPortalMe = {
  fullName: string;
  referralCode: string;
  stats: { clicks: number; leadsSent: number; bookings: number; revenue: number; bonusPending: number; bonusPaid: number };
  leads: PartnerPortalLead[];
};
export type PartnerPortalPoster = { id: string; title: string; imageUrl: string; captionTemplate: string; destination: string | null };

export async function fetchPartnerMe(): Promise<PartnerPortalMe | null> {
  const res = await portalFetch("/api/portal/partner/me");
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPartnerPosters(): Promise<PartnerPortalPoster[]> {
  const res = await portalFetch("/api/portal/partner/posters");
  if (!res.ok) return [];
  const data = await res.json();
  return data.posters ?? [];
}

export async function submitPartnerReferral(input: { name: string; phone: string; destination?: string }): Promise<{ error: string | null }> {
  const res = await portalFetch("/api/portal/partner/refer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.ok) return { error: null };
  const data = await res.json().catch(() => ({}));
  return { error: data.error ?? "Couldn't submit that referral." };
}
